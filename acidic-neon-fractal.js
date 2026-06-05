try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    // Initialize Three.js WebGL Renderer attached to the provided context
    if (!canvas.__three) {
        const renderer = new THREE.WebGLRenderer({ 
            canvas, 
            context: ctx, 
            alpha: true, 
            antialias: true 
        });
        
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        // THE ALCHEMICAL SCRIPTURE: 
        // We synthesize an "Obvious Fractal" (Mandelbrot) but infect it with 
        // "Mycelial Anastomosis" traps, "Thin-Film Structural Color", and "Neon Acid" palettes.
        
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
            uniform vec2 u_mouse;

            in vec2 vUv;
            out vec4 fragColor;

            #define MAX_ITER 150
            #define BAILOUT 256.0
            #define PI 3.14159265359
            #define TAU 6.28318530718

            // ─── COLOR FIELDS: NEON ACID & TOXIC GROWTH ───────────────────────────
            // Derived from color_fields/palettes/neon_acid.json & cosine_palette.json
            vec3 neonAcid(float t) {
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.33);
                vec3 c = vec3(2.0, 1.0, 1.0);
                vec3 d = vec3(0.5, 0.2, 0.25);
                return a + b * cos(TAU * (c * t + d));
            }

            vec3 toxicGrowth(float t) {
                vec3 a = vec3(0.3, 0.6, 0.1);
                vec3 b = vec3(0.2, 0.4, 0.1);
                vec3 c = vec3(1.0, 1.0, 1.0);
                vec3 d = vec3(0.1, 0.33, 0.67);
                return a + b * cos(TAU * (c * t + d));
            }

            // ─── STRUCTURAL COLOR: THIN FILM INTERFERENCE ────────────────────────
            // Derived from structural_color/thin_film_interference
            vec3 thinFilm(float thickness, float cosTheta) {
                float n_film = 1.56; // Chitin refractive index (fungal walls)
                float pathDiff = 2.0 * n_film * thickness * cosTheta;
                // Phase desync (Fractal Optics Glitch from THE-LISTS)
                vec3 phase = vec3(0.0, 0.33, 0.67) + sin(u_time * 0.5) * 0.05;
                return 0.5 + 0.5 * cos(TAU * (pathDiff + phase));
            }

            // ─── COMPLEX DYNAMICS ────────────────────────────────────────────────
            vec2 cmul(vec2 a, vec2 b) { 
                return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); 
            }

            void main() {
                // Normalize coordinates, maintain aspect ratio
                vec2 uv = (vUv - 0.5) * 2.0;
                uv.x *= u_resolution.x / u_resolution.y;

                // ─── KINEMATICS & DEEP TIME ───────────────────────────────────────
                // Oscillating plunge into Seahorse Valley
                float zoom = 0.8 + 0.75 * sin(u_time * 0.2); 
                // Invert zoom so smaller value = closer
                zoom = 1.0 / (zoom + 0.2);
                
                vec2 center = vec2(-0.7436, 0.1318); // Classic spiral minibrot
                vec2 c = uv * zoom + center;

                // Spatially driven pathogen perturbation (Mycelial Rot)
                vec2 z = vec2(0.0);
                vec2 pathogen = (u_mouse * 2.0 - 1.0) * 0.05;
                z += pathogen * sin(u_time * 2.0);

                float smooth_n = 0.0;
                float trap_hyphae = 1e10;
                float trap_spores = 1e10;
                vec2 dz = vec2(1.0, 0.0);

                // ─── THE ALCHEMICAL ENGINE (Mandelbrot + Mycelial Traps) ─────────
                for(int i = 0; i < MAX_ITER; i++) {
                    // Distance estimator derivative: dz = 2*z*dz + 1
                    dz = 2.0 * cmul(z, dz) + vec2(1.0, 0.0);

                    // Core Iteration
                    z = cmul(z, z) + c;

                    // Mycelial Anastomosis Sector Boundaries (Folding Space)
                    vec2 folded_z = fract(z * 3.0 + u_time * 0.1) - 0.5;

                    // Trap 1: Hyphal network (L-infinity metric grid lines)
                    float d_hyphae = min(abs(folded_z.x), abs(folded_z.y));
                    trap_hyphae = min(trap_hyphae, d_hyphae);

                    // Trap 2: Spore nodes (L2 metric points)
                    float d_spores = length(folded_z);
                    trap_spores = min(trap_spores, d_spores);

                    // Escape Condition
                    if(dot(z, z) > BAILOUT) {
                        float log_zn = log(dot(z, z)) * 0.5;
                        float nu = log(log_zn / log(2.0)) / log(2.0);
                        smooth_n = float(i) + 1.0 - nu;
                        break;
                    }
                }

                vec3 col = vec3(0.0);

                // ─── ENZYMATIC DECAY & COLOR SYNTHESIS ───────────────────────────
                if(smooth_n == 0.0) {
                    // INTERIOR: Sclerotium (Dormant Survival Body)
                    // Visualizes lignin peroxidase bleaching and bioluminescent foxfire
                    float foxfire = exp(-trap_hyphae * 18.0);
                    col = vec3(0.04, 0.01, 0.06); // Dark melanin rind
                    col += vec3(0.0, 0.9, 0.6) * foxfire * (0.5 + 0.5 * sin(u_time * 4.0 - length(z)*15.0));
                } else {
                    // EXTERIOR: Enzymatic Decay Front
                    
                    // 1. Calculate fractal distance estimator (DE)
                    float r = length(z);
                    float de = 0.5 * log(r) * r / length(dz);

                    // 2. Derive structural thickness from iteration count and DE
                    float thickness = smooth_n * 0.15 + de * 15.0;
                    
                    // 3. Simulate view angle over the fungal bumps (for iridescence)
                    float cosTheta = clamp(trap_spores * 3.0, 0.1, 1.0);

                    // 4. Base Acidic Neon Palette
                    vec3 baseColor = neonAcid(smooth_n * 0.02 - u_time * 0.15);

                    // 5. Apply Thin Film Interference
                    vec3 iridescence = thinFilm(thickness, cosTheta);

                    // Combine base with structural iridescence
                    col = baseColor * iridescence * 2.0;

                    // 6. Highlight the anastomosing hyphal network (Laccase Stain)
                    float hyphae_glow = exp(-trap_hyphae * 35.0);
                    col = mix(col, toxicGrowth(smooth_n * 0.05), hyphae_glow * 0.85);

                    // 7. Add bright spore nodes (Maximum Vibration Moiré Overlay)
                    float spore_glow = exp(-trap_spores * 60.0);
                    col += vec3(1.0, 0.9, 0.1) * spore_glow * 2.5;

                    // 8. Rayleigh scattering depth approximation
                    float depth = 1.0 / (1.0 + smooth_n * 0.04);
                    col = mix(vec3(0.02, 0.0, 0.08), col, depth);
                }

                // ─── TONEMAPPING (AgX Approximation from color_fields) ───────────
                vec3 x = max(vec3(0.0), col);
                vec3 a = x * (x + 0.0245786) - 0.000090537;
                vec3 b = x * (0.983729 * x + 0.4329510) + 0.238081;
                col = a / b;

                // Gamma correction
                col = pow(col, vec3(1.0/2.2));

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
            fragmentShader,
            depthWrite: false,
            depthTest: false
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);
        
        canvas.__three = { renderer, scene, camera, material };
    }

    const { renderer, scene, camera, material } = canvas.__three;

    // Guard uniform access and update dynamic state
    if (material && material.uniforms) {
        if (material.uniforms.u_time) material.uniforms.u_time.value = time;
        if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
        
        // Normalize mouse to [0, 1] range for the shader pathogen injection
        if (material.uniforms.u_mouse) {
            const mx = mouse.x / grid.width;
            const my = 1.0 - (mouse.y / grid.height);
            material.uniforms.u_mouse.value.set(mx, my);
        }
    }

    // Force resize to handle canvas dimensional shifts
    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

} catch (e) {
    console.error("Feral WebGL Initialization / Render Failed:", e);
}