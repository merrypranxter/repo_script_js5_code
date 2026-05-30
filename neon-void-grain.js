try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      context: ctx,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    
    const scene = new THREE.Scene();
    
    // Orthographic camera is better for pure 2D fragment shader work
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
      uniform float u_time;
      uniform vec2 u_resolution;
      
      in vec2 vUv;
      out vec4 fragColor;

      #define PI 3.14159265359

      // --- ACES Tonemapping (From color_fields repo) ---
      vec3 tonemapACES(vec3 x) {
          float a = 2.51;
          float b = 0.03;
          float c = 2.43;
          float d = 0.59;
          float e = 0.14;
          return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
      }

      // --- 2D Rotation Tensor ---
      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      // --- Hash / Glitch Prophet ---
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
          // Normalize coordinates to [-1, 1] with aspect ratio correction
          vec2 uv = (vUv - 0.5) * 2.0;
          uv.x *= u_resolution.x / u_resolution.y;

          // --- The Three Time Scales ---
          // 1. Slow Global Drift (Tectonic plate shift of the complex plane)
          float t_slow = u_time * 0.03;
          // 2. Medium Structural Motion (Fluid flow of the strata)
          float t_med = u_time * 0.2;
          // 3. Fast Detail Shimmer (Machine hesitation, micro-crystallization)
          float t_fast = u_time * 5.0;

          vec2 z = uv * 2.5;
          
          // --- Hyperbolic Parasites / Kleinian Folding (From kleinian_groups repo) ---
          float accum = 0.0;
          float scale = 1.0;
          
          for(int i = 0; i < 7; i++) {
              // Machine Hesitation: Quantize space slightly based on fast time
              vec2 stutter = floor(z * 20.0 + t_fast) * 0.005;
              z += stutter * sin(t_med);

              // Circle Inversion (Möbius transform fundamental)
              float r2 = dot(z, z);
              // L-Infinity Escape metric hybridization: force division but cap to avoid NaN death
              z = z / clamp(r2, 0.001, 10.0);

              // Autophagic Memory Splicing: Translate and rotate based on iteration and slow time
              float fi = float(i);
              z -= vec2(sin(t_slow + fi * 1.3), cos(t_slow * 0.8 - fi * 1.1)) * 0.6;
              z *= rot(t_slow * 2.0 + fi * 0.7);

              // Internal Domain Warp (Grey-Scott fluid tension)
              z += vec2(sin(z.y * 3.0 + t_med), cos(z.x * 3.0 - t_med)) * 0.15;

              // Accumulate structural density
              accum += exp(-r2 * 1.5);
              scale *= 1.15;
          }

          // --- Lithogenesis: Mineral Stratification ---
          // Use incommensurate frequencies to generate non-repeating strata
          float f1 = sin(z.x * 17.0 + z.y * 11.0 - t_med * 4.0);
          float f2 = cos(z.x * 13.0 - z.y * 19.0 + t_med * 5.0);
          float f3 = sin(z.x * 23.0 + z.y * 7.0 + t_med * 6.0);

          // Sharpen into razor-thin veins (Shiny Systems Module: Shine occupies cracks)
          float cyanBand = smoothstep(0.92, 0.98, abs(f1));
          float magBand  = smoothstep(0.92, 0.98, abs(f2));
          float yelBand  = smoothstep(0.92, 0.98, abs(f3));

          // --- The Void & Neon Palette ---
          // Base is abyssal black/void
          vec3 col = vec3(0.005, 0.0, 0.01); 

          // High-energy Neon CMY (Values > 1.0 for HDR Tonemapping)
          vec3 neonCyan = vec3(0.0, 2.5, 2.5);
          vec3 neonMag  = vec3(2.5, 0.0, 2.5);
          vec3 neonYel  = vec3(2.5, 2.5, 0.0);

          col += neonCyan * cyanBand;
          col += neonMag  * magBand;
          col += neonYel  * yelBand;

          // --- Chromatic Cannibalism (Predator-Prey RGB Interaction) ---
          // Where veins intersect, they burn white-hot, then subtract energy
          float intersect = cyanBand * magBand * yelBand;
          col += vec3(10.0) * intersect; // Core burn
          
          // Moiré Repulsion: Close parallel lines starve each other of light
          float proximity = smoothstep(0.8, 0.9, abs(f1)) * smoothstep(0.8, 0.9, abs(f2));
          col -= vec3(1.0) * proximity; 

          // --- Fast Detail Shimmer (Dead pixels behaving like pollen) ---
          // Generate high-frequency grain that only adheres to the neon structures
          float grain = hash(vUv * 500.0 + t_fast);
          float structureMask = clamp(cyanBand + magBand + yelBand, 0.0, 1.0);
          col += vec3(grain * 1.5) * structureMask * clamp(sin(t_fast * 10.0), 0.0, 1.0);

          // Structural Attenuation: Deeper layers (high accum) glow less, creating volumetric depth
          col *= clamp(accum * 0.15, 0.0, 1.0) + 0.1;

          // --- Final Post-Processing ---
          // Apply ACES filmic tonemapping to gracefully handle the HDR neon blowouts
          col = tonemapACES(col);

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

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
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

} catch (error) {
  console.error("The Weird Code Guy encountered a fatal anomaly in the WebGL manifold:", error);
}