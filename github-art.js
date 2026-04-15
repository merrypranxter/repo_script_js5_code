if (!canvas.__three) {
  try {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) throw new Error("WebGL 2 not supported or context occupied");

    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
    camera.position.z = 1.0;

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
      uniform vec2 u_mouse;
      uniform float u_isPressed;

      #define PI 3.14159265359

      // Feral Design Brain: Simplex 3D Noise for Domain Warping & Glitchcore Artifacts
      vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

      float snoise(vec3 v){ 
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + 1.0 * C.xxx;
        vec3 x2 = x0 - i2 + 2.0 * C.xxx;
        vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
        i = mod(i, 289.0 ); 
        vec4 p = permute( permute( permute( 
                   i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 1.0/7.0;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
      }

      float fbm(vec3 p) {
        float sum = 0.0;
        float amp = 1.0;
        float freq = 1.0;
        for(int i = 0; i < 4; i++) {
            sum += snoise(p * freq) * amp;
            freq *= 2.0;
            amp *= 0.5;
        }
        return sum;
      }

      // Domain Warp Combinator
      vec2 domainWarp(vec2 p, float time) {
        float warp = fbm(vec3(p * 2.0, time * 0.2));
        float warp2 = fbm(vec3(p * 2.0 + warp, time * 0.3 + 1.2));
        return p + vec2(warp, warp2) * 0.2;
      }

      // Cymatic Vibration Physics: Chladni Resonance Patterns
      float chladni(vec2 p, float m, float n) {
        float a = sin(m * PI * p.x) * sin(n * PI * p.y);
        float b = sin(n * PI * p.x) * sin(m * PI * p.y);
        // Nodal lines accumulate sand where vibration is zero
        float resonance = abs(a + b);
        // We want the nodal lines to glow (invert the distance to 0)
        return smoothstep(0.4, 0.0, resonance);
      }

      // Psychedelic Collage / Lisa Frank Aesthetic: Acid Vibration Palette
      vec3 hyperpopPalette(float t) {
        vec3 voidBlack = vec3(0.04, 0.06, 0.08);
        vec3 neonCyan = vec3(0.0, 1.0, 0.94); // #00FFEE
        vec3 hotMagenta = vec3(1.0, 0.0, 0.78); // #FF00C8
        vec3 acidLime = vec3(0.67, 1.0, 0.0); // #AAFF00
        vec3 electricOrange = vec3(1.0, 0.42, 0.0); // #FF6B00
        
        t = fract(t);
        if (t < 0.2) return mix(voidBlack, neonCyan, t * 5.0);
        if (t < 0.4) return mix(neonCyan, hotMagenta, (t - 0.2) * 5.0);
        if (t < 0.6) return mix(hotMagenta, acidLime, (t - 0.4) * 5.0);
        if (t < 0.8) return mix(acidLime, electricOrange, (t - 0.6) * 5.0);
        return mix(electricOrange, voidBlack, (t - 0.8) * 5.0);
      }

      void main() {
        // Normalize coordinates
        vec2 uv = vUv * 2.0 - 1.0;
        uv.x *= u_resolution.x / u_resolution.y;
        
        // Surveillance Apparition: Mouse as a strange attractor
        vec2 mouse = u_mouse * 2.0 - 1.0;
        mouse.x *= u_resolution.x / u_resolution.y;
        float dMouse = length(uv - mouse);
        
        // Tension: Mouse pull (distorts space heavily if close)
        float pull = (u_isPressed > 0.5 ? 0.3 : 0.05) / (dMouse + 0.1);
        uv += normalize(uv - mouse) * pull * sin(u_time * 4.0);

        // Candy-Crash Compression (Glitchcore Macroblocking)
        float glitchThreshold = u_isPressed > 0.5 ? 0.2 : 0.75;
        vec2 block = floor(uv * 16.0) / 16.0;
        float glitchNoise = fbm(vec3(block * 3.0, u_time * 1.5));
        
        if (glitchNoise > glitchThreshold) {
            // Horizontal tearing / Scanline sync loss
            uv.x += snoise(vec3(block.y * 10.0, u_time, 0.0)) * (u_isPressed > 0.5 ? 0.4 : 0.1);
            // Vertical jitter
            uv.y -= snoise(vec3(block.x * 10.0, u_time, 1.0)) * 0.02;
        }

        // Apply Domain Warp to UVs
        vec2 warpedUv = domainWarp(uv, u_time);
        
        // Oscillating Modal Frequencies (Chladni Plate Simulation)
        float m = 2.0 + 3.0 * abs(sin(u_time * 0.2));
        float n = 3.0 + 4.0 * abs(cos(u_time * 0.15));
        
        // CMYK Misregistration / RGB Phantom (Channel Split)
        float splitStrength = u_isPressed > 0.5 ? 0.15 : 0.02;
        float rOffset = splitStrength * snoise(vec3(uv.y * 5.0, u_time, 0.0));
        float bOffset = -splitStrength * snoise(vec3(uv.y * 6.0, u_time, 1.0));
        
        // Calculate Cymatic Resonance for each color channel
        float chR = chladni(warpedUv + vec2(rOffset, 0.0), m, n);
        float chG = chladni(warpedUv, m, n);
        float chB = chladni(warpedUv + vec2(bOffset, 0.0), m, n);
        
        // Map to Acid Vibration Palette & Phosphor Bloom
        vec3 colorR = hyperpopPalette(chR - u_time * 0.3 + 0.0);
        vec3 colorG = hyperpopPalette(chG - u_time * 0.3 + 0.33);
        vec3 colorB = hyperpopPalette(chB - u_time * 0.3 + 0.66);
        
        vec3 finalColor = vec3(colorR.r, colorG.g, colorB.b);
        
        // Damage Aesthetics: CRT Raster & Scanlines
        float scanline = sin(vUv.y * u_resolution.y * 2.0) * 0.05;
        finalColor -= scanline;
        
        // Damage Aesthetics: Photocopy Noise / Film Grain
        float grain = fract(sin(dot(vUv * (u_time + 1.0), vec2(12.9898, 78.233))) * 43758.5453);
        finalColor += (grain - 0.5) * 0.15;
        
        // Damage Aesthetics: Vignette / Cathode Tube Edge Burn
        float vignette = length(vUv - 0.5);
        finalColor *= smoothstep(0.8, 0.3, vignette);
        
        // Overdrive pop on click (Temporal Echo Stutter simulation)
        if (u_isPressed > 0.5 && sin(u_time * 50.0) > 0.0) {
            finalColor = 1.0 - finalColor; // Invert flash
        }
        
        fragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
        u_isPressed: { value: 0.0 }
      },
      depthWrite: false,
      depthTest: false
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
  } catch (e) {
    console.error("WebGL Initialization Failed:", e);
    return;
  }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material && material.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  
  // Normalize mouse coordinates [0.0, 1.0] mapping from top-left, inverted Y for GLSL
  const mx = mouse.x / grid.width;
  const my = 1.0 - (mouse.y / grid.height);
  
  // Smoothly interpolate mouse position for a fluid "strange attractor" feel
  material.uniforms.u_mouse.value.x += (mx - material.uniforms.u_mouse.value.x) * 0.1;
  material.uniforms.u_mouse.value.y += (my - material.uniforms.u_mouse.value.y) * 0.1;
  
  material.uniforms.u_isPressed.value = mouse.isPressed ? 1.0 : 0.0;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);