try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    if (!canvas.__three) {
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

            // Hash for electrostatic xerox grain
            float hash(vec2 p) {
                vec3 p3  = fract(vec3(p.xyx) * .1031);
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.x + p3.y) * p3.z);
            }

            // Domain warping for fluid structural motion
            vec2 fbm_warp(vec2 p, float t) {
                float a = t * 0.5;
                mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
                vec2 q = vec2(sin(p.y * 2.0 + t), cos(p.x * 2.0 - t * 0.8));
                return p + (q * rot) * 0.15;
            }

            void main() {
                // Time scales: 
                // t_slow = manifold deformation (Kleinian group evolution)
                // t_med = fluid domain flow (mold growth)
                // t_fast = thin-film optical phase shift (iridescence)
                float t_slow = u_time * 0.08;
                float t_med = u_time * 0.3;
                float t_fast = u_time * 2.5;

                // Normalize and aspect correct
                vec2 uv = (vUv - 0.5) * 2.0;
                uv.x *= u_resolution.x / u_resolution.y;

                // Apply medium-scale domain warp
                vec2 z = fbm_warp(uv, t_med);

                float orbit = 0.0;
                float scale = 1.0;
                float min_dist = 1e5;

                // Hyperbolic Manifold / Kleinian-inspired folding
                // Simulating the boundary of a 3-manifold where the "mold" grows
                for(int i = 0; i < 7; i++) {
                    // Fold space (creates geometric boundaries)
                    z = abs(z) - vec2(0.4 + sin(t_slow * 0.5)*0.1, 0.3 + cos(t_slow * 0.3)*0.1);

                    // Rotate
                    float a = t_slow + float(i) * 0.15;
                    mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
                    z *= rot;

                    // Möbius circle inversion (pushes space outward, creates fractal dust/gaskets)
                    float r2 = dot(z, z);
                    // Clamp to prevent singularities but allow chaotic expansion
                    float k = clamp(1.2 / r2, 0.1, 4.0); 
                    z *= k;
                    scale *= k;

                    orbit += r2;
                    min_dist = min(min_dist, r2);
                }

                // --- Structural Color / Thin Film Physics ---
                // Calculate physical thickness of the "mold" layer based on fractal scaling
                float film_thickness = 250.0 + (orbit / max(scale, 0.001)) * 600.0;

                // Optical Path Difference (OPD) = 2 * n * d * cos(theta)
                // Simulate viewing angle via distance from center
                float view_angle = length(uv) * 0.8; 
                float cos_theta = cos(view_angle);
                
                // Fast time scale drives the phase of the light, making it shimmer
                float opd = 2.0 * 1.56 * film_thickness * cos_theta + t_fast * 150.0;

                // Compute constructive interference for specific wavelengths
                vec3 wavelengths = vec3(650.0, 530.0, 440.0); // Red, Green, Blue
                vec3 phase = (opd / wavelengths) * 6.2831853;
                // Fabry-Perot style interference approximation
                vec3 interference = 0.5 + 0.5 * cos(phase);

                // --- Cyberdelic Neon Palette Mapping ---
                vec3 voidBlack = vec3(0.015, 0.023, 0.031); // #040608
                vec3 neonCyan = vec3(0.0, 1.0, 0.94);       // #00FFF0
                vec3 neonMagenta = vec3(1.0, 0.0, 0.8);     // #FF00CC
                vec3 acidLime = vec3(0.69, 1.0, 0.0);       // #B0FF00

                // Use the fractal orbit and interference to select the neon hue
                vec3 neonColor = mix(neonCyan, neonMagenta, smoothstep(0.2, 0.8, interference.r));
                neonColor = mix(neonColor, acidLime, smoothstep(0.4, 0.9, interference.b * sin(orbit)));

                // Material composition: Multiply the chosen neon hue by the interference intensity
                // This creates physical-looking iridescent bands within the restricted palette
                vec3 materialColor = neonColor * (pow(interference, vec3(1.5)) * 1.5);

                // Structure mask: The mold only exists near the limit set of the Kleinian group
                // High scale = deep in the fractal = edge of the manifold
                float edge_glow = exp(-min_dist * scale * 0.02);
                float structure = smoothstep(0.0, 0.5, edge_glow);

                // Combine Void Black background with the glowing structural material
                vec3 finalColor = mix(voidBlack, materialColor, structure);

                // --- Print Artifacts & Physicality ---
                // 1. Chromatic Aberration (Glitch/Scan-bend) at the edges
                float aberration = smoothstep(0.3, 0.8, structure) * 0.05 * sin(t_med * 5.0);
                finalColor.r += mix(0.0, neonMagenta.r, smoothstep(0.0, 1.0, exp(-min_dist * scale * (0.02 + aberration))));
                finalColor.b += mix(0.0, neonCyan.b, smoothstep(0.0, 1.0, exp(-min_dist * scale * (0.02 - aberration))));

                // 2. Electrostatic Photocopy Grain
                float grain = hash(vUv * 500.0 + u_time);
                // Apply grain via Soft Light blend mode logic to maintain contrast
                vec3 grainColor = vec3(grain);
                finalColor = finalColor + (grainColor * 2.0 - 1.0) * (finalColor - finalColor * finalColor) * 0.4;

                // 3. Tonal Compression (Xerox artifact)
                // Crushes the blacks and peaks the neon highlights
                finalColor = smoothstep(vec3(0.02), vec3(0.95), finalColor);

                fragColor = vec4(finalColor, 1.0);
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
    console.error("Feral Lithogenesis Failed:", e);
}