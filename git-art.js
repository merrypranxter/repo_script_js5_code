if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;
    
    const fragmentShader = `
      precision highp float;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_pixelScale;
      
      in vec2 vUv;
      out vec4 fragColor;
      
      // Bayer 4x4 Threshold Matrix (Ditherpunk)
      const float bayer4x4[16] = float[](
        0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
       12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
        3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
       15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
      );
      
      // Lisa Frank / Blacklight Acid Palette
      vec3 palette[16] = vec3[](
        vec3(0.10, 0.10, 0.18), // Dark Slate
        vec3(0.05, 0.05, 0.10), // Midnight Blue
        vec3(1.00, 0.00, 0.50), // Hot Pink
        vec3(0.00, 1.00, 1.00), // Cyan
        vec3(0.54, 0.17, 0.89), // Blue Violet
        vec3(0.00, 0.00, 1.00), // Electric Blue
        vec3(0.22, 1.00, 0.08), // Neon Green
        vec3(1.00, 0.00, 1.00), // Magenta
        vec3(1.00, 1.00, 0.00), // Acid Yellow
        vec3(1.00, 0.27, 0.00), // Orange Red
        vec3(1.00, 1.00, 1.00), // White
        vec3(0.00, 0.00, 0.00), // Black
        vec3(0.69, 0.89, 1.00), // Ice Blue
        vec3(1.00, 0.08, 0.58), // Deep Pink
        vec3(0.49, 0.99, 0.00), // Lawn Green
        vec3(0.58, 0.00, 0.83)  // Dark Violet
      );
      
      // Palette Snapping (YUV-like perceptual distance)
      vec3 nearestPalette(vec3 col) {
          vec3 best = palette[0];
          float bestDist = 1000000.0;
          for (int i = 0; i < 16; i++) {
              vec3 p = palette[i];
              vec3 diff = col - p;
              float d = diff.x*diff.x*0.299 + diff.y*diff.y*0.587 + diff.z*diff.z*0.114;
              if (d < bestDist) {
                  bestDist = d;
                  best = p;
              }
          }
          return best;
      }
      
      // Structural Color - Thin Film Interference Physics
      vec3 thinFilm(float cosTheta, float thickness, float n) {
          float sinThetaI2 = 1.0 - cosTheta * cosTheta;
          float sinThetaT2 = sinThetaI2 / (n * n);
          float cosThetaT = sqrt(max(0.0, 1.0 - sinThetaT2));
          float pathDiff = 2.0 * n * thickness * cosThetaT;
          vec3 phase = vec3(0.0, 0.33, 0.67);
          return 0.5 + 0.5 * cos(6.28318 * (pathDiff / 500.0 + phase));
      }
      
      // 5-Fold Quasicrystal Generation
      float quasicrystal(vec2 p, float time) {
          float val = 0.0;
          for(int i = 0; i < 5; i++) {
              float angle = float(i) * 3.14159 / 5.0;
              vec2 dir = vec2(cos(angle), sin(angle));
              val += cos(dot(p, dir) * 15.0 + time);
          }
          return val / 5.0;
      }
      
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      
      float fbm(vec2 p) {
          float f = 0.0;
          float amp = 0.5;
          for(int i = 0; i < 4; i++) {
              f += amp * noise(p);
              p *= 2.0;
              amp *= 0.5;
          }
          return f;
      }
      
      void main() {
          // Pixel Grid Lock
          vec2 virtualRes = floor(u_resolution / u_pixelScale);
          vec2 snappedUV = floor(vUv * virtualRes) / virtualRes;
          
          vec2 p = (snappedUV - 0.5) * 2.0;
          p.x *= u_resolution.x / u_resolution.y;
          
          vec2 m = (u_mouse - 0.5) * 2.0;
          m.x *= u_resolution.x / u_resolution.y;
          float mouseDist = length(p - m);
          
          // Psychedelic Material Contamination Mask
          float contamNoise = fbm(p * 2.0 + vec2(u_time * 0.1, -u_time * 0.2));
          float mouseInfluence = smoothstep(1.5, 0.0, mouseDist);
          float contamination = smoothstep(0.3, 0.7, contamNoise * 0.6 + mouseInfluence * 0.8);
          
          // Quasicrystal Space Warping
          vec2 qcWarp = vec2(
              quasicrystal(p, u_time * 0.5),
              quasicrystal(p + vec2(12.34, 56.78), u_time * 0.6)
          );
          vec2 warpedP = p + qcWarp * 0.2 * contamination;
          
          // Op Art Scaffold: Funnel Tunnel & Zebra Waves
          float r = length(warpedP) + 0.001;
          float a = atan(warpedP.y, warpedP.x);
          
          float tunnelDepth = 1.0 / (r + 0.1);
          float spiral = a * 3.0;
          float freq = 12.0;
          float speed = 2.0;
          
          // Chromatic Interference Op (Prismatic Edge Fringing)
          float zebraR = sin(tunnelDepth * freq + spiral - u_time * speed);
          float zebraG = sin(tunnelDepth * (freq + 0.3) + spiral - u_time * speed);
          float zebraB = sin(tunnelDepth * (freq + 0.6) + spiral - u_time * speed);
          
          vec3 prismaticScaffold = vec3(step(0.0, zebraR), step(0.0, zebraG), step(0.0, zebraB));
          
          // Structural Color (Chitin/Beetle Iridescence)
          float thickness = 100.0 + 800.0 * fbm(warpedP * 3.0 + u_time * 0.5);
          float cosTheta = abs(dot(normalize(p), normalize(p - m + 0.001))); 
          vec3 iridescence = thinFilm(cosTheta, thickness, 1.56);
          
          // Merge rigid Op Art scaffold with fluid iridescent contamination
          vec3 baseColor = mix(prismaticScaffold, iridescence, contamination);
          
          // Ordered Dithering implementation
          int bx = int(mod(snappedUV.x * virtualRes.x, 4.0));
          int by = int(mod(snappedUV.y * virtualRes.y, 4.0));
          float bayerVal = bayer4x4[by * 4 + bx];
          
          vec3 dithered = baseColor + (bayerVal - 0.5) * 0.6;
          
          // Final Palette Snap
          vec3 finalColor = nearestPalette(dithered);
          
          fragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2() },
        u_mouse: { value: new THREE.Vector2() },
        u_pixelScale: { value: 3.0 }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
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
if (material?.uniforms?.u_time) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  
  let mx = mouse.x / grid.width;
  let my = 1.0 - (mouse.y / grid.height);
  
  // Auto-animate mouse target if user is inactive
  if (!mouse.isPressed && mouse.x === 0 && mouse.y === 0) {
    mx = 0.5 + Math.sin(time * 0.7) * 0.3;
    my = 0.5 + Math.cos(time * 0.5) * 0.3;
  }
  
  material.uniforms.u_mouse.value.set(mx, my);
  // Ensure the pixel art aesthetic remains blocky regardless of screen size
  material.uniforms.u_pixelScale.value = Math.max(2.0, Math.floor(grid.width / 300));
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);