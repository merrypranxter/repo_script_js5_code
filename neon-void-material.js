if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL2 context required but not available.");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
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

      // 2D Rotation Matrix
      mat2 rot(float a) {
          float c = cos(a), s = sin(a);
          return mat2(c, -s, s, c);
      }

      // Hash without Sine for performance & chaos
      float hash(vec2 p) {
          vec3 p3  = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
      }

      // Value Noise
      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
              mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
              f.y
          );
      }

      // Fractal Brownian Motion
      float fbm(vec2 p) {
          float f = 0.0;
          float amp = 0.5;
          for(int i = 0; i < 6; i++) {
              f += amp * noise(p);
              p = rot(1.234) * p * 2.0;
              amp *= 0.5;
          }
          return f;
      }

      void main() {
          // Normalize coordinates
          vec2 uv = vUv * 2.0 - 1.0;
          uv.x *= u_resolution.x / u_resolution.y;

          // Three simultaneous time scales (The Weird Mechanism)
          float t_slow = u_time * 0.04; 
          float t_med  = u_time * 0.15;
          
          // Machine hesitation / stutter injected into the fast time scale
          float t_fast = u_time * 2.5 + sin(u_time * 12.0) * 0.05;

          // 1. SLOW DRIFT: Tectonic domain warping (The Ocean Math)
          vec2 q = vec2(
              fbm(uv * 2.0 + t_slow),
              fbm(uv * 2.0 + vec2(5.2, 1.3) - t_slow)
          );

          // 2. MEDIUM MOTION: Viscous fluid advection mapping
          vec2 r = vec2(
              fbm(uv * 3.0 + 4.0 * q + t_med),
              fbm(uv * 3.0 + 4.0 * q + vec2(8.3, 2.8) - t_med)
          );

          // 3. ART NOUVEAU WHIPLASH: Tension ridges via absolute sine
          float flow = fbm(uv * 2.5 + r * 2.5 + t_med * 0.8);
          float ridge_raw = abs(sin(flow * 18.0));
          
          // Subsurface scattering bleed (Lit from below)
          float sss = exp(-ridge_raw * 8.0);
          // Razor sharp neon core
          float ridge = 0.015 / (ridge_raw + 0.005); 

          // 4. FAST SHIMMER: Bragg diffraction grating (Crystalline Facets)
          // Quantize the space slightly to create a "mineral flake" interference
          vec2 uv_quant = floor((uv + r * 0.1) * 90.0) / 90.0;
          float shimmer1 = sin(length(uv_quant) * 250.0 - t_fast);
          float shimmer2 = sin(dot(uv_quant, vec2(180.0, -120.0)) + t_fast * 1.3);
          float bragg = max(0.0, shimmer1 * shimmer2);

          // BASE: Void Black with deep purple/cyan "The Ship" under-structure
          float depth = fbm(uv * 8.0 - q * 3.0);
          vec3 col = vec3(0.02, 0.0, 0.06) * depth;

          // THE NEON RULE: CMY spectral separation
          // CYAN Phase
          float cyan_mask = smoothstep(0.3, 0.7, fbm(uv * 1.5 + r + t_med));
          col += vec3(0.0, 1.0, 0.9) * (ridge * 0.8 + sss * 0.2) * cyan_mask * (1.0 + bragg * 1.5);

          // MAGENTA Phase
          float mag_mask = smoothstep(0.4, 0.8, fbm(uv * 1.5 - r * 1.2 - t_med * 1.1));
          col += vec3(1.0, 0.0, 0.8) * (ridge * 0.8 + sss * 0.2) * mag_mask * (1.0 + bragg * 1.5);

          // YELLOW Phase (Narrower, creates high-tension intersections)
          float yel_mask = smoothstep(0.5, 0.65, fbm(uv * 4.0 + r * 0.5 + t_slow * 2.0));
          col += vec3(1.0, 0.9, 0.0) * (ridge * 1.2) * yel_mask * (1.0 + bragg * 2.0);

          // "THE WHIRRING" - Concentric interference rings in the substrate
          float ring = abs(sin(length(uv - q * 0.5) * 25.0 - t_med * 4.0));
          col += vec3(0.0, 0.4, 0.5) * (0.02 / (ring + 0.01)) * depth * (1.0 - yel_mask);

          // Vignette to ground it as a physical material sample
          float vignette = 1.0 - smoothstep(0.5, 1.5, length(vUv * 2.0 - 1.0));
          col *= vignette;

          // Tonemapping & Output
          col = pow(col, vec3(0.85)); // slight gamma lift for the neons
          fragColor = vec4(col, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
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
    console.error("Feral WebGL Lithogenesis Failed:", e);
    return;
  }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material?.uniforms) {
  if (material.uniforms.u_time) {
    material.uniforms.u_time.value = time;
  }
  if (material.uniforms.u_resolution) {
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);