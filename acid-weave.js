if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      context: ctx, 
      alpha: true, 
      antialias: true 
    });
    
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

      // ---- HASH & NOISE (Bioluminescent / Mathematical Textiles) ----
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
              mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), 
              u.y
          );
      }

      // Fractal Brownian Motion
      float fbm(vec2 p) {
          float val = 0.0;
          float amp = 0.5;
          for (int i = 0; i < 5; i++) {
              val += amp * noise(p);
              p *= 2.0;
              amp *= 0.5;
          }
          return val;
      }

      // ---- NEON ACID PALETTE (Color Fields) ----
      // a + b * cos(2PI * (c * t + d))
      vec3 neonPalette(float t) {
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.33);
          vec3 c = vec3(2.0, 1.0, 1.0);
          vec3 d = vec3(0.5, 0.2, 0.25);
          return a + b * cos(6.2831853 * (c * t + d));
      }

      void main() {
          // Normalize coordinates and correct aspect ratio
          vec2 uv = vUv * 2.0 - 1.0;
          uv.x *= u_resolution.x / u_resolution.y;

          // ---- METRIC COMPETITION: Hyperbolic Loom Hemorrhage ----
          // Transform standard Euclidean UVs into a Poincaré disk model.
          // The fabric will infinitely compress into Moiré interference at the boundary.
          float r2 = dot(uv, uv);
          float safe_r2 = min(r2, 0.99); // Prevent absolute division by zero
          vec2 hyper_uv = uv / (1.0 - safe_r2);

          // Apply slow rotation to the hyperbolic manifold
          float th = u_time * 0.15;
          mat2 rot = mat2(cos(th), -sin(th), sin(th), cos(th));
          hyper_uv = rot * hyper_uv;

          // ---- JACQUARD MOTIF (Reaction-Diffusion Labyrinth) ----
          // Evaluated in Euclidean space with fluid domain warping to create 
          // a tension between the flat pattern and the hyperbolic threads.
          vec2 warp = vec2(fbm(uv * 2.5 + u_time * 0.2), fbm(uv * 2.5 - u_time * 0.15));
          float m = fbm(uv * 4.0 + warp * 2.5);
          // Threshold into a clean, binary-like Turing structure
          float jacquard = smoothstep(0.45, 0.55, m);

          // ---- WEAVE TOPOLOGY (Warp and Weft) ----
          float thread_density = 45.0 + sin(u_time * 0.1) * 10.0;
          vec2 p = hyper_uv * thread_density;

          // Thread height maps (cylindrical approximation)
          float cx = cos(p.x);
          float cy = cos(p.y);

          // Structural checkerboard for plain weave interlacing
          float weave = cos(p.x * 0.5) * cos(p.y * 0.5);

          // The Jacquard motif forces either the warp or the weft to the surface
          float force_top = (jacquard - 0.5) * 3.0; 
          float z_warp = cx + force_top * weave;
          float z_weft = cy - force_top * weave;

          // Z-buffer evaluation: which thread is on top?
          float is_warp = step(z_weft, z_warp);

          // Micro-shading of the individual threads
          float shade = mix(cy, cx, is_warp);
          shade = shade * 0.4 + 0.6; // Map from [-1, 1] to [0.2, 1.0]

          // ---- ACIDIC COLOR INJECTION ----
          float color_idx_warp = hyper_uv.x * 0.05 + u_time * 0.3 + m;
          float color_idx_weft = hyper_uv.y * 0.05 - u_time * 0.25 + m;

          // Chromatic Aberration near the hyperbolic horizon
          float ca = smoothstep(0.5, 1.0, safe_r2) * 0.1;
          
          vec3 c_warp = vec3(
              neonPalette(color_idx_warp - ca).r,
              neonPalette(color_idx_warp).g,
              neonPalette(color_idx_warp + ca).b
          );

          vec3 c_weft = vec3(
              neonPalette(color_idx_weft - ca).r,
              neonPalette(color_idx_weft).g,
              neonPalette(color_idx_weft + ca).b
          );

          // Darken the weft slightly to enhance the structural textile read
          c_weft *= vec3(0.85, 0.9, 1.0);

          vec3 color = mix(c_weft, c_warp, is_warp);

          // Apply physical thread shading
          color *= shade;

          // ---- MOIRÉ REPO PROTOCOLS ----
          // Inject a secondary interference frequency that beats against the weave
          float moire = cos(p.x * 1.03) * cos(p.y * 1.03);
          color += vec3(0.15, 0.0, 0.3) * moire * jacquard;

          // ---- ABYSSAL RENDERING ----
          // Fade into a dark void at the edge of the Poincaré disk
          float edge_fade = smoothstep(1.0, 0.85, r2);
          color *= edge_fade;

          // ---- ACES FILMIC TONEMAPPING ----
          color = clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), 0.0, 1.0);

          fragColor = vec4(color, 1.0);
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
    console.error("WebGL Initialization Failed:", e);
    return;
  }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material && material.uniforms) {
  if (material.uniforms.u_time) {
    material.uniforms.u_time.value = time;
  }
  if (material.uniforms.u_resolution) {
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);