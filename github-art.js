if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      in vec2 vUv;
      out vec4 fragColor;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      
      // Bayer 4x4 Ordered Dithering Matrix (pixel_voxel)
      const float bayer[16] = float[16](
          0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
          12.0/16.0, 4.0/16.0, 14.0/16.0, 6.0/16.0,
          3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
          15.0/16.0, 7.0/16.0, 13.0/16.0, 5.0/16.0
      );

      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      // Fractional Brownian Motion for Shoegaze Phase Drift
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

      // Chladni Modal Equation (vibration)
      float chladni(vec2 p, float m, float n) {
          float pi = 3.14159265359;
          return sin(n * pi * p.x) * sin(m * pi * p.y) + sin(m * pi * p.x) * sin(n * pi * p.y);
      }

      // Thin-Film Interference Cosine Palette (structural_color + lisa_frank_aesthetic)
      vec3 palette(float t, float state) {
          vec3 a = vec3(0.5);
          vec3 b = vec3(0.5);
          vec3 c = vec3(1.0, 1.0, 1.0);
          vec3 d = vec3(0.0, 0.33, 0.67) + state * 2.0; 
          vec3 col = a + b * cos(6.28318 * (c * t + d));
          
          // Lisa Frank hyper-saturation boost
          float lum = dot(col, vec3(0.299, 0.587, 0.114));
          return mix(vec3(lum), col, 2.2);
      }

      // Calculate Structural Color Thickness from Cymatic Waves
      float mapThickness(vec2 p, float t, float m, float n) {
          // Shoegaze Phase Drift Ripples
          vec2 drift = vec2(fbm(p * 2.0 + t * 0.2), fbm(p * 2.0 - t * 0.2)) * 0.3;
          
          // Shoegaze Moire Interference Shimmer
          float moire = sin(p.x * 40.0 + p.y * 30.0) * sin(p.x * 42.0 + p.y * 28.0) * 0.1;
          
          float wave = chladni(p + drift, m, n) + moire;
          return wave * 0.5 + 0.5; 
      }

      void main() {
          // Pixel Grid Lock (pixel_voxel)
          float pixel_size = 4.0;
          vec2 fragCoordGrid = floor(gl_FragCoord.xy / pixel_size) * pixel_size;
          vec2 uv = fragCoordGrid / u_resolution.xy;
          vec2 p = uv * 2.0 - 1.0;
          p.x *= u_resolution.x / u_resolution.y;

          float t = u_time * 0.2;
          
          // Map mouse to Chladni Modes & Frequencies
          float stateX = u_mouse.x > 0.0 ? u_mouse.x : 0.5;
          float stateY = u_mouse.y > 0.0 ? u_mouse.y : 0.5;
          
          float m = 1.0 + floor(stateX * 6.0);
          float n = 1.0 + floor(stateY * 6.0);
          
          // Interpolate between Schumann (7.83Hz) and Solfeggio (528Hz)
          float freq = mix(7.83, 528.0, stateX); 

          // Shoegaze Chromatic Aberration
          float ca = 0.02 + fbm(p * 3.0 + t) * 0.03; 
          float pulse = sin(u_time * freq * 0.01) * 0.05;
          
          float thickR = mapThickness(p + vec2(ca, 0.0), t, m, n) + pulse;
          float thickG = mapThickness(p, t, m, n) + pulse;
          float thickB = mapThickness(p - vec2(ca, 0.0), t, m, n) + pulse;

          vec3 color;
          color.r = palette(thickR * 1.5 - t, stateX).r;
          color.g = palette(thickG * 1.5 - t, stateX).g;
          color.b = palette(thickB * 1.5 - t, stateX).b;

          // Ordered Dithering (pixel_voxel)
          int bx = int(mod(fragCoordGrid.x / pixel_size, 4.0));
          int by = int(mod(fragCoordGrid.y / pixel_size, 4.0));
          float bayerVal = bayer[by * 4 + bx];
          
          float lum = dot(color, vec3(0.299, 0.587, 0.114));
          color += (bayerVal - 0.5) * 0.35;

          // Nearest-Color Palette Snap Quantization
          float steps = 8.0;
          color = floor(color * steps + 0.5) / steps;

          // Shoegaze Texture Memory: Film Grain Clumps + Halation Bloom
          float grain = (hash(fragCoordGrid + u_time) - 0.5) * 0.35;
          float halation = fbm(p * 2.0 - t * 2.0) * 0.6; 
          
          color += grain;
          vec3 halationTint = mix(vec3(1.0, 0.2, 0.8), vec3(0.2, 0.9, 1.0), stateY); // Neon bleed
          color += halationTint * halation * lum; 

          // Gentle Vignette
          float vig = 1.0 - length(p) * 0.45;
          color *= smoothstep(0.0, 0.8, vig);

          fragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
      },
      vertexShader,
      fragmentShader,
      depthWrite: false,
      depthTest: false
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

if (material && material.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  if (mouse.isPressed) {
    material.uniforms.u_mouse.value.set(mouse.x / grid.width, 1.0 - mouse.y / grid.height);
  }
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);