try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
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

      // Complex multiplication
      vec2 cmul(vec2 a, vec2 b) {
        return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
      }

      // Neon Acid Cosine Palette (from color_fields repo)
      vec3 neonAcid(float t) {
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.33);
        vec3 c = vec3(2.0, 1.0, 1.0);
        vec3 d = vec3(0.5, 0.2, 0.25);
        return a + b * cos(6.2831853 * (c * t + d));
      }

      // Toxic Growth Palette (from color_fields repo)
      vec3 toxicGrowth(float t) {
        vec3 a = vec3(0.4, 0.8, 0.2);
        vec3 b = vec3(0.3, 0.7, 0.1);
        vec3 c = vec3(1.0, 1.0, 1.0);
        vec3 d = vec3(0.3, 0.6, 0.9);
        return a + b * cos(6.2831853 * (c * t + d));
      }

      // 2D Rotation matrix
      mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
      }

      void main() {
        // Center UVs and correct aspect ratio
        vec2 uv = (vUv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) * 2.0;

        // Poincare Hyperbolic Parasite Mapping (L09)
        // Folds the infinite plane into a finite disc, compressing infinity
        float r = length(uv);
        float theta = atan(uv.y, uv.x);
        
        // Hyperbolic metric distortion with a slight singularity offset
        float hyper_r = r / (1.0 - r * r + 0.05);
        vec2 z = vec2(hyper_r * cos(theta), hyper_r * sin(theta));

        // Spin the cathedral
        z *= rot(u_time * 0.15);

        // Base zoom
        z *= 2.0;

        // The Julia Seed - wanders through a "mythic attractor" (Domain 10.4)
        vec2 c = vec2(
            0.7885 * cos(u_time * 0.25),
            0.7885 * sin(u_time * 0.15)
        );

        // Fractal state variables
        vec2 z_n = z;
        float trap_cross = 1e10;
        float trap_mycelial = 1e10;
        float trap_spores = 1e10;
        float smooth_i = 0.0;

        const int MAX_ITER = 90;

        for(int i = 0; i < MAX_ITER; i++) {
            // Fungal Succession Mechanism:
            // Alternates between Mandelbrot (z^2+c) and Burning Ship ((|x| + i|y|)^2 + c)
            // based on the spatial frequency of the current iteration.
            // This creates a "Chiral Hemorrhage" where the math fails to commit.
            vec2 z_abs = vec2(abs(z_n.x), abs(z_n.y));
            float mutation_bias = sin(z_n.x * 5.0 + u_time) * 0.5 + 0.5;
            vec2 z_step = mix(z_n, z_abs, mutation_bias);

            // Iteration step
            z_n = cmul(z_step, z_step) + c;

            // Orbit Traps
            // 1. Cross trap (bureaucratic infrastructure)
            trap_cross = min(trap_cross, min(abs(z_n.x), abs(z_n.y)));

            // 2. Mycelial anastomosis loop (organic routing & fusion)
            vec2 loop_center = vec2(sin(float(i)*0.1 + u_time), cos(float(i)*0.15 - u_time)) * 1.5;
            trap_mycelial = min(trap_mycelial, length(z_n - loop_center));

            // 3. Spore clusters (dot patterns)
            trap_spores = min(trap_spores, length(fract(z_n * 2.0) - 0.5));

            if(dot(z_n, z_n) > 256.0) {
                // Smooth escape calculation
                float log_zn = log(dot(z_n, z_n)) * 0.5;
                float nu = log(log_zn / 0.69314718) / 0.69314718;
                smooth_i = float(i) + 1.0 - nu;
                break;
            }
        }

        vec3 color = vec3(0.0);

        if(smooth_i > 0.0) {
            // ESCAPE REGION: The Acidic Neon Void
            // Use Thin-Film Interference logic mapping iteration depth to structural color
            float film_thickness = smooth_i * 0.08 - u_time * 0.4;
            color = neonAcid(film_thickness);

            // Add structural color Bragg reflection (iridescence) based on mycelial distance
            float bragg = fract(smooth_i * 0.5 + trap_mycelial);
            color += toxicGrowth(bragg) * 0.4;

            // Mycelial hyphae network overlays (glowing toxic veins)
            float hyphal_glow = exp(-trap_mycelial * 8.0);
            color = mix(color, vec3(0.8, 1.0, 0.0), hyphal_glow * 0.9); // Toxic yellow

        } else {
            // INTERIOR: The Biological Core / Sclerotium
            // Deep, dark, pulsing with dormant energy
            float depth = trap_cross * 2.5;
            color = mix(vec3(0.05, 0.0, 0.1), vec3(1.0, 0.0, 0.6), exp(-depth));

            // Add bioluminescent spore dots inside the core (foxfire effect)
            float spore_glow = exp(-trap_spores * 60.0);
            color += vec3(0.0, 1.0, 0.8) * spore_glow * (0.5 + 0.5 * sin(u_time * 6.0));
        }

        // Bureaucratic Failure Glitch (Quantized Laplacian error simulation)
        // Introduces controlled math corruption to drive algorithmic decay
        float glitch = step(0.99, fract(sin(dot(vUv, vec2(12.9898, 78.233)) + u_time * 10.0) * 43758.5453));
        if (glitch > 0.5) {
            color = color.brg; // Swizzle channels for sudden chromatic rupture
        }

        // Hyperbolic edge darkening (lens collapse)
        float edge_darken = smoothstep(1.0, 0.85, r);
        color *= edge_darken;

        fragColor = vec4(color, 1.0);
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
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("Feral WebGL Initialization Failed:", e);
}