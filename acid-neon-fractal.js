try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      
      in vec2 vUv;
      out vec4 fragColor;

      // --- PRNG & NOISE (Mycelial / Data Corruption) ---
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      
      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      
      float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
          for(int i = 0; i < 5; i++) {
              v += a * noise(p);
              p = rot * p * 2.0;
              a *= 0.5;
          }
          return v;
      }

      // --- COLOR SYSTEMS (Neon Acid & Thin Film) ---
      // From color_fields / psychedelic_pop_style
      vec3 neonAcid(float t) {
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.33);
          vec3 c = vec3(2.0, 1.0, 1.0);
          vec3 d = vec3(0.5, 0.2, 0.25);
          return a + b * cos(6.28318 * (c * t + d));
      }

      // From structural_color (Bragg/Thin Film Interference)
      vec3 thinFilm(float thickness, float cosTheta) {
          float n = 1.4; // refractive index of fungal exudate
          float pathDiff = 2.0 * n * thickness * cosTheta;
          vec3 phase = vec3(0.0, 0.33, 0.67);
          return 0.5 + 0.5 * cos(6.28318 * (pathDiff + phase));
      }

      void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          float aspect = u_resolution.x / u_resolution.y;
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          // Deep zoom into an obvious fractal (Mandelbrot Minibrot)
          // The "Trap" is the obviousness.
          vec2 target = vec2(-0.74364388, 0.1318259);
          
          // Breathing, cyclical zoom to prevent precision collapse
          float t = u_time * 0.15;
          float zoom = pow(0.5, mod(t, 12.0)); 
          
          // Slow rotation
          float angle = t * 0.4;
          mat2 rmat = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
          
          vec2 c = p * rmat * zoom * 3.5 + target;

          // --- THE STRANGE MECHANISM: Mycelial Data Corruption ---
          // A fungal pathogen (white rot) digests the mathematical perfection of the fractal.
          // Where the mycelium spreads, the complex plane is bit-crushed (divine data corruption).
          float parasite = fbm(c * (8.0 / zoom) - u_time * 0.5);
          float infection_zone = smoothstep(0.45, 0.65, parasite);

          vec2 z = c;
          float iter = 0.0;
          const float max_iter = 250.0;
          
          float cord_trap = 1e10;
          float eye_trap = 1e10;
          vec2 dz = vec2(1.0, 0.0);

          for(int i = 0; i < 250; i++) {
              if(dot(z, z) > 256.0) break;

              // The Fungal Glitch: Bit-crushing the coordinates based on infection density
              if (infection_zone > 0.1) {
                  float quant = (15.0 + 10.0 * sin(u_time)) / zoom; 
                  // Interpolate between perfect math and quantized/corrupted math
                  vec2 corrupted_z = floor(z * quant) / quant;
                  // Add a chiral twist (Klein Bottle Chiral Hemorrhage)
                  corrupted_z *= mat2(cos(0.02), -sin(0.02), sin(0.02), cos(0.02));
                  z = mix(z, corrupted_z, infection_zone);
              }

              // Distance estimator tracking
              dz = 2.0 * vec2(z.x * dz.x - z.y * dz.y, z.x * dz.y + z.y * dz.x) + vec2(1.0, 0.0);
              
              // Standard Mandelbrot iteration
              z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
              
              // --- Psychedelic Pop Motifs via Orbit Traps ---
              // 1. "Eyes" / Celestial orbs
              eye_trap = min(eye_trap, length(z - vec2(0.5, 0.0)));
              // 2. Rhizomorph cords (mycelial transport highways)
              cord_trap = min(cord_trap, abs(z.x + z.y));
              
              iter++;
          }

          // Distance estimation for the host structure
          float r_z = length(z);
          float de = 0.0;
          if (iter < max_iter) {
              de = 0.5 * log(r_z) * r_z / length(dz);
          }

          // --- COLOR & AESTHETICS (Candy Groovy Pop + Structural Color) ---
          
          // Smooth escape time
          float smooth_n = iter - log2(max(1.0, log2(r_z)));
          
          // Graphic Flatness (Psychedelic Pop Rule: Flat filled regions, banded fills)
          float bands = floor(smooth_n * 3.0) / 3.0;
          
          vec3 col = vec3(0.0);

          if (iter < max_iter) {
              // The Escaped Cosmos
              col = neonAcid(bands * 0.03 - u_time * 0.4);
              
              // Thin-Film Iridescence on the topological boundaries (contour lines)
              float band_edge = fract(smooth_n * 3.0);
              if (band_edge < 0.15 || band_edge > 0.85) {
                  float thickness = 200.0 + 500.0 * sin(smooth_n * 0.05 + u_time);
                  vec3 iridescence = thinFilm(thickness, 1.0);
                  col = mix(col, iridescence, 0.85);
              }
              
              // Psychedelic Eye Motifs
              if (eye_trap < 0.15) {
                  float eye_ring = fract(eye_trap * 25.0 - u_time * 3.0);
                  if (eye_ring > 0.6) col = vec3(0.95, 0.9, 0.8); // White sclera
                  else if (eye_ring > 0.3) col = neonAcid(u_time); // Vivid iris
                  else col = vec3(0.05, 0.0, 0.1); // Dark pupil
              }
              
              // Glowing Mycelial Cords (Foxfire bioluminescence)
              float hypha_glow = exp(-cord_trap * (5.0 + 10.0 * infection_zone));
              vec3 foxfire = vec3(0.02, 0.95, 0.48); // 520nm emission
              col += foxfire * hypha_glow * infection_zone * 2.5;
              
          } else {
              // The Void (Interior)
              // Cosmic Mystic Blacklight Pop: Dark ground with neon accents
              col = vec3(0.04, 0.01, 0.08); 
              
              // Spore/Star field
              float spore = noise(uv * 150.0 + u_time * 0.2);
              if (spore > 0.97) col = vec3(1.0, 0.0, 0.8); // Neon pink spores
              if (spore > 0.99) col = vec3(0.0, 1.0, 1.0); // Cyan stars
          }

          // Laccase Staining (Enzymatic Decay overlay)
          // Blue-gray phenolic staining where the fungus digests the math
          vec3 laccase_stain = vec3(0.22, 0.38, 0.62);
          float stain_factor = infection_zone * 0.6 * clamp(1.0 - exp(-de * 50.0 / zoom), 0.0, 1.0);
          col = mix(col, laccase_stain, stain_factor);

          // Vignette & CRT Curve
          float vig = length(uv - 0.5) * 2.0;
          col *= 1.0 - pow(vig, 3.5) * 0.6;

          // Glitch / Data Rot (XOR-Ghost Manifold)
          // Occasional scanline tear
          if (hash(vec2(floor(u_time * 10.0), floor(uv.y * 50.0))) > 0.98) {
              col = vec3(1.0) - col.brg; // Chroma foldshift
          }

          // Output
          fragColor = vec4(col, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
      },
      depthWrite: false,
      depthTest: false
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  if (material && material.uniforms) {
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("Feral WebGL Error:", e);
}