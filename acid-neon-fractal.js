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
                gl_Position = vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            precision highp float;

            in vec2 vUv;
            out vec4 fragColor;

            uniform float u_time;
            uniform vec2 u_resolution;
            uniform vec2 u_mouse;

            const int MAX_ITER = 64;
            const float BAILOUT = 256.0;
            const float PI = 3.14159265359;

            // --- REPO 9 & 7: Noise & Digital Glitch ---
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
                float v = 0.0, a = 0.5;
                for(int i = 0; i < 4; i++) { 
                    v += a * noise(p); 
                    p *= 2.0; 
                    a *= 0.5; 
                }
                return v;
            }

            // --- REPO 2 & 9: Cyberdelic Neon / Acid Vibration Palette ---
            vec3 acidPalette(float t) {
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.33);
                vec3 c = vec3(2.0, 1.0, 1.0);
                vec3 d = vec3(0.5, 0.2, 0.25);
                vec3 col = a + b * cos(TAU * (c * t + d));
                
                // Force maximum saturation (Cyberdelic Neon)
                float maxC = max(col.r, max(col.g, col.b));
                return col / (maxC + 0.001);
            }

            // --- REPO 4: Structural Color / Thin Film Interference ---
            vec3 thinFilm(float d, float n_film) {
                vec3 lambda = vec3(650.0, 530.0, 440.0); // RGB wavelengths in nm
                float pathDiff = 2.0 * n_film * d * 1000.0;
                vec3 phase = (pathDiff / lambda) * TAU;
                return 0.5 + 0.5 * cos(phase);
            }

            // --- REPO 1 & 5: Celtic Burning Ship + Mycelial Infestation ---
            vec4 map(vec2 p, float ca_shift) {
                vec2 z = p;
                // Base coordinate drift
                vec2 c = p + vec2(sin(u_time * 0.15), cos(u_time * 0.11)) * 0.4;
                
                // Mouse-driven psychic attractor
                c += (u_mouse - 0.5) * 1.5;

                float trap_hyphae = 1e10; 
                float trap_spores = 1e10; 
                float iter = 0.0;
                float final_d2 = 0.0;

                for(int i = 0; i < MAX_ITER; i++) {
                    // Celtic Burning Ship iteration (Repo 1)
                    float rx = z.x * z.x - z.y * z.y;
                    z = vec2(abs(rx) + c.x, 2.0 * z.x * z.y + c.y);

                    // Semantic Infestation: Domain warping inside the fractal loop (Repo 5)
                    // Simulates anastomosing hyphae seeking nutrients
                    z += 0.06 * vec2(fbm(z * 4.0 + u_time * 0.5), fbm(z * 4.0 - u_time * 0.5));

                    // Orbit Traps
                    trap_hyphae = min(trap_hyphae, abs(z.x * z.y)); // Cross trap -> mycelial grid
                    trap_spores = min(trap_spores, length(z - vec2(0.6, -0.6))); // Point trap -> fruiting bodies

                    final_d2 = dot(z, z);
                    if(final_d2 > BAILOUT) break;
                    iter++;
                }

                float smooth_n = iter;
                if(iter < float(MAX_ITER)) {
                    smooth_n += 1.0 - log2(log2(final_d2) * 0.5);
                }

                return vec4(smooth_n, trap_hyphae, trap_spores, length(z));
            }

            #define TAU 6.28318530718

            void main() {
                vec2 uv = (vUv - 0.5) * 2.0;
                uv.x *= u_resolution.x / u_resolution.y;

                // Projective Poincare mapping (folding the screen into an infinite cathedral)
                float r2 = dot(uv, uv);
                vec2 p = uv / (1.0 + r2 * 0.15 * sin(u_time * 0.2));

                // Zoom & Pan
                float zoom = 1.8 - sin(u_time * 0.1) * 0.6;
                p *= zoom;

                // Chromatic aberration (Glitch Neon Composite pipeline - Repo 9)
                float shift = 0.02 * fbm(uv * 12.0 + u_time);

                // Multi-channel fractal sampling for RGB split
                vec4 resR = map(p + vec2(shift, 0.0), shift);
                vec4 resG = map(p, 0.0);
                vec4 resB = map(p - vec2(shift, 0.0), -shift);

                // Base Coloring: Escape Time -> Acid Vibration
                vec3 col;
                col.r = acidPalette(resR.x * 0.04 - u_time * 0.3).r;
                col.g = acidPalette(resG.x * 0.04 - u_time * 0.3).g;
                col.b = acidPalette(resB.x * 0.04 - u_time * 0.3).b;

                // Inject Structural Color via Mycelial Trap
                // Iridescent Bragg reflection on the "hyphae" edges
                vec3 film = thinFilm(resG.y * 0.3, 1.56); // Chitin refractive index approx 1.56
                col = mix(col, film, exp(-resG.y * 6.0));

                // Spore Trap Glow (Occult Jewel palette accent)
                float sporeGlow = exp(-resG.z * 4.0);
                col += vec3(1.0, 0.0, 0.8) * sporeGlow * 2.0; // Electric Magenta

                // --- REPO 9: Print Artifacts (Halftone Screen & Xerox Noise) ---
                float luma = dot(col, vec3(0.299, 0.587, 0.114));
                float freq = 140.0;
                mat2 rot = mat2(0.707, -0.707, 0.707, 0.707); // 45 degree screen angle
                vec2 grid = fract(rot * vUv * freq) - 0.5;
                float dotSize = sqrt(1.0 - luma) * 0.45;
                float halftone = smoothstep(dotSize + 0.15, dotSize - 0.15, length(grid));

                // Blend halftone aggressively to simulate 60s acid poster
                col *= mix(vec3(0.05, 0.0, 0.15), vec3(1.0), halftone);

                // CMYK Misregistration & Xerox Streak
                col.r += 0.15 * noise(uv * 80.0 + u_time * 2.0);
                col.b += 0.15 * noise(uv * 80.0 - u_time * 2.0);
                float xerox_streak = smoothstep(0.8, 1.0, noise(vec2(uv.y * 10.0, u_time)));
                col += xerox_streak * 0.1;

                // Vignette frame burn
                col *= 1.0 - smoothstep(0.3, 1.8, length(vUv - 0.5));

                fragColor = vec4(col, 1.0);
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
            fragmentShader
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);
        canvas.__three = { renderer, scene, camera, material };
    }

    const { renderer, scene, camera, material } = canvas.__three;

    if (material && material.uniforms) {
        if (material.uniforms.u_time) material.uniforms.u_time.value = time;
        if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
        if (material.uniforms.u_mouse) {
            // Normalize mouse to 0-1 range, default to center if unpressed to keep it alive
            let mx = mouse.isPressed ? mouse.x / grid.width : 0.5 + Math.sin(time * 0.3) * 0.2;
            let my = mouse.isPressed ? 1.0 - (mouse.y / grid.height) : 0.5 + Math.cos(time * 0.25) * 0.2;
            material.uniforms.u_mouse.value.set(mx, my);
        }
    }

    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

} catch (e) {
    console.error("WebGL Initialization Failed. The Weird Code Guy requires a WebGL2 context.", e);
}