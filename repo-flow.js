if (!canvas.__three) {
  try {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) throw new Error("WebGL 2 not supported or context occupied");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
    camera.position.z = 1;
    
    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    const fragmentShader = `
      in vec2 vUv;
      out vec4 fragColor;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_entanglement;
      
      #define MAX_STEPS 120
      
      // HASH & NOISE
      float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
      }
      
      float noise3(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float n000 = hash21(i.xy + i.z);
          float n100 = hash21((i.xy + vec2(1.0, 0.0)) + i.z);
          float n010 = hash21((i.xy + vec2(0.0, 1.0)) + i.z);
          float n110 = hash21((i.xy + vec2(1.0, 1.0)) + i.z);
          float n001 = hash21(i.xy + (i.z + 1.0));
          float n101 = hash21((i.xy + vec2(1.0, 0.0)) + (i.z + 1.0));
          float n011 = hash21((i.xy + vec2(0.0, 1.0)) + (i.z + 1.0));
          float n111 = hash21((i.xy + vec2(1.0, 1.0)) + (i.z + 1.0));
          float nx00 = mix(n000, n100, f.x);
          float nx10 = mix(n010, n110, f.x);
          float nx01 = mix(n001, n101, f.x);
          float nx11 = mix(n011, n111, f.x);
          float nxy0 = mix(nx00, nx10, f.y);
          float nxy1 = mix(nx01, nx11, f.y);
          return mix(nxy0, nxy1, f.z);
      }
      
      float fbm(vec3 p) {
          float a = 0.5;
          float s = 0.0;
          for (int i = 0; i < 4; i++) {
              s += a * noise3(p);
              p *= 2.02;
              a *= 0.5;
          }
          return s;
      }
      
      // HOLOGRAPHIC AdS GEOMETRY
      // Radial depth = scale. The boundary is at z ~ 0.
      float adsDepth(vec3 p) {
          return max(0.03, p.y + 1.5);
      }
      
      vec3 adsWarp(vec3 p) {
          float z = adsDepth(p);
          float s = mix(1.0, 1.0 / z, 0.8);
          return vec3(p.x * s, p.y, p.z * s);
      }
      
      // ENTANGLEMENT GEOMETRY (RT MINIMAL SURFACE)
      float smin(float a, float b, float k) {
          float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
          return mix(b, a, h) - k * h * (1.0 - h);
      }
      
      float map(vec3 p) {
          vec3 wp = adsWarp(p);
          
          vec3 p1 = wp - vec3(-1.4, 0.0, 0.0);
          vec3 p2 = wp - vec3(1.4, 0.0, 0.0);
          
          float r = 0.7;
          float d1 = length(p1) - r;
          float d2 = length(p2) - r;
          
          // The bridge tension is controlled by mutual information / entanglement weight
          float k = mix(0.01, 2.0, u_entanglement);
          float d = smin(d1, d2, k);
          
          // Compensate for the AdS warp scale to prevent ray overshooting
          float s = mix(1.0, 1.0 / adsDepth(p), 0.8);
          float true_d = d / s;
          
          // Phase transition: Disconnection / Tear Field
          float tear = smoothstep(0.3, 0.0, u_entanglement);
          if(tear > 0.0 && true_d < 0.5) {
              true_d += fbm(wp * 10.0) * tear * 0.1;
          }
          
          return true_d * 0.4;
      }
      
      vec3 getNormal(vec3 p) {
          vec2 e = vec2(0.001, 0.0);
          return normalize(vec3(
              map(p + e.xyy) - map(p - e.xyy),
              map(p + e.yxy) - map(p - e.yxy),
              map(p + e.yyx) - map(p - e.yyx)
          ));
      }
      
      // LISA FRANK HYPER-PALETTE
      vec3 neon_palette(float t) {
          t = fract(t);
          vec3 c1 = vec3(1.0, 0.0, 0.8); // Hot Pink
          vec3 c2 = vec3(0.2, 0.0, 1.0); // Purple
          vec3 c3 = vec3(0.0, 0.8, 1.0); // Cyan
          vec3 c4 = vec3(0.5, 1.0, 0.0); // Lime
          vec3 c5 = vec3(1.0, 0.9, 0.0); // Yellow
          
          if(t < 0.2) return mix(c1, c2, t * 5.0);
          if(t < 0.4) return mix(c2, c3, (t - 0.2) * 5.0);
          if(t < 0.6) return mix(c3, c4, (t - 0.4) * 5.0);
          if(t < 0.8) return mix(c4, c5, (t - 0.6) * 5.0);
          return mix(c5, c1, (t - 0.8) * 5.0);
      }
      
      void main() {
          vec2 uv = (vUv - 0.5) * 2.0;
          uv.x *= u_resolution.x / u_resolution.y;
          
          vec3 ro = vec3(0.0, 0.5, -4.5);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          // Orbit Camera
          float a = u_time * 0.2;
          mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
          ro.xz *= rot;
          rd.xz *= rot;
          
          float t = 0.0;
          float max_t = 12.0;
          float d = 0.0;
          vec3 p;
          
          float glow = 0.0;
          float lightSheetAcc = 0.0;
          
          // RAYMARCH LOOP
          for(int i = 0; i < MAX_STEPS; i++) {
              p = ro + rd * t;
              d = map(p);
              if(d < 0.001) break;
              t += d;
              
              // Accumulate Shared Interior Weight (Entanglement Wedge Glow)
              glow += 0.015 / (0.05 + abs(d));
              
              // Light-Sheet / Null Projection Density
              float ls = exp(-abs(p.y) * 15.0) * exp(-length(p.xz) * 0.8);
              lightSheetAcc += ls * 0.02;
              
              if(t > max_t) break;
          }
          
          vec3 col = vec3(0.02, 0.01, 0.03);
          
          // Background Light Sheet
          float ls_bg = exp(-abs(uv.y * 3.0)) * exp(-length(uv.x) * 1.0);
          col += ls_bg * neon_palette(u_time * 0.5 + length(uv)) * 0.2;
          
          // Precursor Ghosts / Evanescent Background Modes
          mat2 rotBG = mat2(cos(a), -sin(a), sin(a), cos(a));
          vec2 st = uv * rotBG;
          vec2 st_i = floor(st * 100.0);
          float stars = step(0.98, hash21(st_i)) * (0.5 + 0.5 * sin(u_time * 5.0 + hash21(st_i) * 10.0));
          col += stars * neon_palette(st_i.x * 0.1 + st_i.y * 0.1);
          
          col += lightSheetAcc * neon_palette(u_time * 0.5 + length(uv));
          
          // SURFACE ENCODING (Boundary Source generates Bulk Response)
          if(t < max_t) {
              vec3 n = getNormal(p);
              vec3 wp = adsWarp(p);
              float z = adsDepth(p);
              
              // UV-IR Scale Warp: finer resolution near boundary
              float freq = mix(2.0, 20.0, clamp(1.0 - z * 0.5, 0.0, 1.0));
              
              // Leopard Print / Stretched Horizon Glyphfire
              float n_val = fbm(wp * freq + u_time * 0.1);
              float pattern = sin(n_val * 25.0);
              
              float spot = smoothstep(0.5, 0.7, pattern);
              float outline = smoothstep(0.2, 0.5, pattern) - spot;
              
              float rainbowPos = wp.x * 0.2 + wp.y * 0.2 + u_time * 0.4;
              vec3 baseColor = neon_palette(rainbowPos);
              vec3 edgeColor = vec3(1.0, 1.0, 1.0); // Neon White
              vec3 spotColor = vec3(0.0, 0.0, 0.0); // Deep Black
              
              col = mix(baseColor, edgeColor, outline);
              col = mix(col, spotColor, spot);
              
              // Lighting & Fresnel
              vec3 l = normalize(vec3(1.0, 1.0, -1.0));
              float diff = max(dot(n, l), 0.0);
              float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
              
              col *= diff * 0.8 + 0.2;
              col += fresnel * neon_palette(rainbowPos - u_time);
              
              // Sparkles / Local Anomalies
              float anomaly = step(0.98, fract(n_val * 43.21 + u_time * 2.0)) * spot;
              col += anomaly * vec3(1.0, 0.8, 1.0) * 2.0;
              
              // Tear Logic Exposing the Hollow Interior
              float tear = smoothstep(0.3, 0.0, u_entanglement);
              if(tear > 0.0) {
                  float shatter = fbm(wp * 10.0);
                  if(shatter > (1.0 - tear)) {
                      col = neon_palette(u_time + wp.x) * 2.0;
                  }
              }
          }
          
          // Membrane Entanglement Thread Glow
          vec3 bridgeColor = neon_palette(u_time * 0.3 + 0.5);
          col += glow * 0.03 * bridgeColor * u_entanglement;
          
          // Gamma correction
          col = pow(col, vec3(1.0 / 2.2));
          fragColor = vec4(col, 1.0);
      }
    `;
    
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: { 
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_entanglement: { value: 0.8 }
      },
      vertexShader,
      fragmentShader
    });
    
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);
    canvas.__three = { renderer, scene, camera, material };
  } catch (e) {
    console.error("WebGL Initialization Failed:", e);
    return;
  }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material?.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  
  // Mouse X controls the entanglement phase transition. 
  // Move mouse left to severe the minimal surface bridge and expose the hollow interior tear.
  let targetEnt = mouse.isPressed ? 1.0 : (mouse.x / grid.width);
  if (isNaN(targetEnt)) targetEnt = 0.8;
  
  material.uniforms.u_entanglement.value += (targetEnt - material.uniforms.u_entanglement.value) * 0.05;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);