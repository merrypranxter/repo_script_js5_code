try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    if (!canvas.__three) {
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
            in vec2 vUv;
            out vec4 fragColor;

            uniform float u_time;
            uniform vec2 u_resolution;
            uniform vec2 u_mouse;

            // Hash & Noise for organic warps and sparkles
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
                    u.y
                );
            }

            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                for (int i = 0; i < 4; i++) {
                    v += a * noise(p);
                    p *= 2.0;
                    a *= 0.5;
                }
                return v;
            }

            // Fake Lenia continuous scalar field using metaballs & FBM
            float getU(vec2 p) {
                float t = u_time * 0.15;
                float U = 0.0;
                
                // Base structural anchors for the damask lattice
                U += 1.2 * exp(-length(p - vec2(0.5)) * 3.0);
                U += 1.0 * exp(-length(p - vec2(0.0)) * 4.5);
                U += 1.0 * exp(-length(p - vec2(1.0)) * 4.5);

                // Orbiting / dividing biological blobs (fission/fusion)
                vec2 p1 = vec2(0.5 + 0.25 * sin(t * 1.3), 0.5 + 0.25 * cos(t * 1.7));
                vec2 p2 = vec2(0.5 + 0.30 * cos(t * 1.1), 0.5 + 0.15 * sin(t * 1.9));
                vec2 p3 = vec2(0.5 + 0.15 * sin(t * 2.3), 0.5 + 0.30 * cos(t * 0.7));

                U += 1.1 * exp(-pow(length(p - p1), 2.0) * 18.0);
                U += 1.0 * exp(-pow(length(p - p2), 2.0) * 22.0);
                U += 0.9 * exp(-pow(length(p - p3), 2.0) * 26.0);

                // Warp coordinates for organic membrane feel
                vec2 noise_uv = p * 4.0 - t * 0.5;
                U += fbm(noise_uv) * 0.3;

                return U;
            }

            // Maps the scalar field to biological morphology and physical height
            vec2 mapLayer(vec2 uv) {
                vec2 scaled_uv = uv * 2.5; // Damask scale
                
                // Continuous symmetry folding for textile repeats
                vec2 p = abs(fract(scaled_uv) * 2.0 - 1.0);
                
                // Diagonal mirror for classic jacquard/damask structure
                if (p.x > p.y) p = p.yx;

                float U = getU(p);

                // Lenia-style growth functions G(U) to extract rings/membranes
                float halo     = exp(-pow(U - 0.40, 2.0) / 0.03);
                float membrane = exp(-pow(U - 0.65, 2.0) / 0.015);
                float core     = exp(-pow(U - 0.90, 2.0) / 0.02);
                float accent   = exp(-pow(U - 1.15, 2.0) / 0.008);

                // Height map construction
                float height = halo * 0.15 + membrane * 0.4 + core * 0.8 + accent * 1.0;

                // Micro-weave texture for velvet pile
                float weave = (sin(uv.x * 500.0) * sin(uv.y * 500.0)) * 0.015;
                height += weave;

                return vec2(height, U);
            }

            // Compute surface normals via finite differences
            vec3 getNormal(vec2 uv) {
                float eps = 0.002;
                float h0 = mapLayer(uv).x;
                float hx = mapLayer(uv + vec2(eps, 0.0)).x;
                float hy = mapLayer(uv + vec2(0.0, eps)).x;
                return normalize(vec3(h0 - hx, h0 - hy, eps * 3.0));
            }

            void main() {
                vec2 uv = vUv;
                vec2 aspect_uv = uv;
                aspect_uv.x *= u_resolution.x / u_resolution.y;

                // Mouse interaction - Velvet brushing
                vec2 mouse_uv = u_mouse;
                mouse_uv.x *= u_resolution.x / u_resolution.y;
                vec2 m_diff = aspect_uv - mouse_uv;
                float m_dist = length(m_diff);
                float m_brush = exp(-m_dist * 6.0); // Brush influence radius

                // Evaluate geometry and biology
                vec2 mat = mapLayer(aspect_uv);
                float h = mat.x;
                float U = mat.y;

                vec3 N = getNormal(aspect_uv);
                vec3 V = normalize(vec3(0.0, 0.0, 1.0)); // Camera
                vec3 L = normalize(vec3(sin(u_time * 0.4) * 0.6, cos(u_time * 0.3) * 0.6, 0.7)); // Moving light

                // Velvet nap vector (anisotropic tangent)
                vec3 nap = normalize(vec3(0.0, 1.0, 0.1));
                // Mouse reverses nap and reveals hidden layers
                nap = normalize(mix(nap, vec3(m_diff * 5.0, 0.2), m_brush));

                // Lighting Math
                float NdotL = max(0.0, dot(N, L));
                float NdotV = max(0.0, dot(N, V));

                // Velvet asperity scattering (grazing rim light)
                float rim = smoothstep(0.0, 1.0, 1.0 - NdotV);
                rim = pow(rim, 2.5) * 1.5;

                // Anisotropic specular highlight
                vec3 H_vec = normalize(L + V);
                float TdotH = dot(nap, H_vec);
                float aniso = exp(-pow(TdotH, 2.0) / 0.03) * 1.5;

                // Colors
                vec3 velvetBase = vec3(0.05, 0.0, 0.12); // Deep UV
                vec3 velvetLit  = vec3(0.4, 0.0, 0.6);   // Hot purple sheen

                // Lenia Organism Colors (extracted via Gaussian growth maps)
                float halo     = exp(-pow(U - 0.40, 2.0) / 0.03);
                float membrane = exp(-pow(U - 0.65, 2.0) / 0.015);
                float core     = exp(-pow(U - 0.90, 2.0) / 0.02);
                float accent   = exp(-pow(U - 1.15, 2.0) / 0.008);

                vec3 bioColor = vec3(0.0);
                bioColor += halo * vec3(0.0, 0.8, 1.0);       // Cyan
                bioColor += membrane * vec3(0.6, 1.0, 0.0);   // Acid Green
                bioColor += core * vec3(1.0, 0.0, 0.6);       // Hot Magenta
                bioColor += accent * vec3(1.0, 0.6, 0.0) * (0.8 + 0.2 * sin(u_time * 8.0)); // Pulsing Orange

                // Blend velvet base with biological motif
                float motifMask = clamp(halo + membrane + core + accent, 0.0, 1.0);

                // Hidden patterns revealed by the mouse brush
                float hiddenPattern = exp(-pow(U - 0.52, 2.0) / 0.004) * m_brush;
                bioColor += hiddenPattern * vec3(0.8, 1.0, 1.0);
                motifMask = max(motifMask, hiddenPattern);

                vec3 baseColor = mix(velvetBase, bioColor, motifMask * 0.85);

                // Apply lighting
                vec3 finalColor = baseColor * (NdotL * 0.5 + 0.5); // Diffuse
                finalColor += velvetLit * rim * (1.0 - motifMask * 0.6); // Velvet edge, suppressed on motifs
                finalColor += aniso * mix(vec3(0.7, 0.3, 1.0), vec3(1.0, 0.8, 0.9), motifMask); // Sheen

                // Sparkle Dust (View-dependent microfacets)
                float sparkle_seed = dot(floor(aspect_uv * 700.0), vec2(12.9898, 78.233));
                float sparkle_noise = fract(sin(sparkle_seed) * 43758.5453);
                float view_sparkle = step(0.98, fract(sparkle_noise + u_time * 0.2 + NdotV * 5.0));
                float sparkle = view_sparkle * rim * max(motifMask, 0.2); // Concentrated on motifs and edges
                finalColor += sparkle * vec3(1.0, 1.0, 1.0) * 1.5;

                // Vignette
                float vig = length(vUv - 0.5);
                finalColor *= smoothstep(0.8, 0.2, vig);

                // Output with slight contrast boost
                fragColor = vec4(pow(finalColor, vec3(0.9)), 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader,
            fragmentShader,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
            }
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);

        canvas.__three = { renderer, scene, camera, material };
    }

    const { renderer, scene, camera, material } = canvas.__three;

    if (material && material.uniforms) {
        material.uniforms.u_time.value = time;
        material.uniforms.u_resolution.value.set(grid.width, grid.height);
        
        // Update mouse position, defaulting to center if uninitialized
        let mx = 0.5;
        let my = 0.5;
        if (mouse && mouse.x !== undefined && mouse.y !== undefined) {
            mx = mouse.x / grid.width;
            my = 1.0 - (mouse.y / grid.height); // Flip Y for WebGL
        }
        material.uniforms.u_mouse.value.set(mx, my);
    }

    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

} catch (e) {
    console.error("WebGL Initialization Failed:", e);
}