try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL2 context required for feral material rendering");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        
        in vec2 vUv;
        out vec4 fragColor;
        
        uniform float u_time;
        uniform vec2 u_resolution;

        // Alchemical Scripture: L-Infinity Escape Metrics
        float lInf(vec2 p) {
            return max(abs(p.x), abs(p.y));
        }

        void main() {
            vec2 uv = (vUv - 0.5) * 2.0;
            uv.x *= u_resolution.x / u_resolution.y;

            // THREE SIMULTANEOUS TIME SCALES
            float t_slow = u_time * 0.05;  // Global drift & structural mutation
            float t_med  = u_time * 0.35;  // Fluid advection & medium structural motion
            float t_fast = u_time * 2.5;   // Fast detail shimmer & moiré interference

            vec2 p = uv * 1.8;
            float w = 0.0;
            float field = 0.0;
            float pickover_metric = 0.0;

            // Fungal Voronoi Minkowski Morphing / Domain Warp
            for (float i = 1.0; i <= 14.0; i++) {
                // Fluid Advection (Organism pulse)
                p += vec2(sin(p.y * 2.5 + t_med), cos(p.x * 2.5 - t_med)) * (0.2 / i);

                // Hyperbolic Folding
                p = abs(p) - (0.35 / i);

                // Spatio-temporal Rotation driven by L-Infinity norm (Topological collapse)
                float theta = t_slow * i + (lInf(p) * 2.0); 
                float c = cos(theta);
                float s = sin(theta);
                p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);

                // Scaling / Iteration progression
                p *= 1.18;

                float l2 = length(p);
                float linf = lInf(p);

                w += l2;
                pickover_metric += linf;

                // High-frequency interference shimmer
                field += sin(linf * 18.0 - t_fast * (i * 0.3)) / i;
            }

            // Screen-space derivatives for physical gel depth & structural normal mapping
            vec2 grad = vec2(dFdx(field), dFdy(field));
            vec3 normal = normalize(vec3(grad * 12.0, 1.0));

            // Köhler illumination simulation (Lighting)
            vec3 lightDir = normalize(vec3(sin(t_med), cos(t_med), 1.2));
            float diff = max(dot(normal, lightDir), 0.0);
            float spec = pow(max(dot(reflect(-lightDir, normal), vec3(0.0, 0.0, 1.0)), 0.0), 40.0);
            float fresnel = pow(1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0), 5.0);

            // CMY Moiré Resonance (from Color Systems repo)
            float phase = field * 3.14159;
            float c_val = pow(sin(phase) * 0.5 + 0.5, 8.0);
            float m_val = pow(sin(phase + 2.094) * 0.5 + 0.5, 8.0);
            float y_val = pow(sin(phase + 4.188) * 0.5 + 0.5, 8.0);

            vec3 neonC = vec3(0.0, 1.0, 1.0);
            vec3 neonM = vec3(1.0, 0.0, 1.0);
            vec3 neonY = vec3(1.0, 1.0, 0.0);

            vec3 albedo = neonC * c_val + neonM * m_val + neonY * y_val;

            // Organic density based on the wander metric
            float density = exp(-pickover_metric * 0.08);
            
            // Darken high-gradient areas to simulate deep void crevices
            float crevice = smoothstep(0.0, 2.0, length(grad)); 

            // Surface composition
            vec3 finalColor = albedo * diff * density * (1.0 - crevice * 0.8);
            finalColor += vec3(1.0) * spec * density;
            finalColor += albedo * fresnel * density * 1.5;

            // Sub-surface scattering approximation (Bioluminescence from within)
            float thickness = smoothstep(0.0, 3.0, w);
            vec3 sss = albedo * 0.4 * exp(-thickness * 3.0);
            finalColor += sss;

            // Emulsion Grain (Microscopy noise)
            float grain = fract(sin(dot(vUv * 246.81 + u_time, vec2(12.9898, 78.233))) * 43758.5453);
            finalColor += grain * 0.1 * albedo;

            // Chromatic Aberration at edges (Oil Immersion effect)
            float dist = length(uv);
            finalColor.r += dist * 0.08 * c_val;
            finalColor.b -= dist * 0.08 * y_val;

            // Deep void background anchoring
            finalColor = max(finalColor, vec3(0.01, 0.005, 0.015)); 
            finalColor *= smoothstep(2.2, 0.3, dist); // Vignette

            fragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const mesh = new THREE.Mesh(geometry, material);
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
  console.error("Procedural Material Render Failed:", e);
}