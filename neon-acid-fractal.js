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

            #define MAX_ITER 120
            #define BAILOUT 128.0
            #define PI 3.14159265359

            // --- Fungal / Mycelial Noise ---
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
                float v = 0.0;
                float a = 0.5;
                for(int i = 0; i < 5; i++) {
                    v += a * noise(p);
                    p *= 2.0;
                    a *= 0.5;
                }
                return v;
            }

            // --- Structural Color (Thin Film) ---
            vec3 wavelengthToRGB(float W) {
                vec3 c = vec3(0.0);
                if (W >= 380.0 && W < 440.0) c = vec3(-(W - 440.0) / 60.0, 0.0, 1.0);
                else if (W >= 440.0 && W < 490.0) c = vec3(0.0, (W - 440.0) / 50.0, 1.0);
                else if (W >= 490.0 && W < 510.0) c = vec3(0.0, 1.0, -(W - 510.0) / 20.0);
                else if (W >= 510.0 && W < 580.0) c = vec3((W - 510.0) / 70.0, 1.0, 0.0);
                else if (W >= 580.0 && W < 645.0) c = vec3(1.0, -(W - 645.0) / 65.0, 0.0);
                else if (W >= 645.0 && W <= 780.0) c = vec3(1.0, 0.0, 0.0);
                
                float factor = 0.0;
                if (W >= 380.0 && W < 420.0) factor = 0.3 + 0.7 * (W - 380.0) / 40.0;
                else if (W >= 420.0 && W < 700.0) factor = 1.0;
                else if (W >= 700.0 && W <= 780.0) factor = 0.3 + 0.7 * (780.0 - W) / 80.0;
                
                return c * factor;
            }

            vec3 structuralIridescence(float thickness, float angle) {
                vec3 color = vec3(0.0);
                float n_film = 1.56; // Chitin refractive index
                for(int i = 0; i < 5; i++) {
                    float lambda = mix(400.0, 700.0, float(i) / 4.0);
                    float pathDiff = 2.0 * n_film * thickness * cos(angle);
                    float phase = (pathDiff / lambda) * 6.28318;
                    float intensity = 0.5 + 0.5 * cos(phase);
                    color += wavelengthToRGB(lambda) * intensity;
                }
                return color / 5.0;
            }

            // --- Neon Acid Palette ---
            vec3 cosinePaletteNeon(float t) {
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.33);
                vec3 c = vec3(2.0, 1.0, 1.0);
                vec3 d = vec3(0.5, 0.2, 0.25);
                return a + b * cos(6.28318 * (c * t + d));
            }

            // --- Tonemapping ---
            vec3 tonemapACES(vec3 x) {
                float a = 2.51; float b = 0.03; float c = 2.43; float d = 0.59; float e = 0.14;
                return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
            }

            void main() {
                vec2 uv = (vUv - 0.5) * 2.0;
                float aspect = u_resolution.x / u_resolution.y;
                uv.x *= aspect;

                // Chrono-Stratigraphic Fluid & Divine Data Corruption
                float localTime = u_time * 0.4 + fbm(uv * 3.0) * 1.5;
                
                // XOR Ghost Manifold Glitch
                float xor_glitch = float(int(uv.x * 50.0) ^ int(uv.y * 50.0)) / 128.0;
                
                // Hyperbolic projection (mapToPoincare fold)
                float r2 = dot(uv, uv);
                vec2 z = uv / (1.0 + r2 * 0.2);
                z *= 1.8; // Zoom level

                // Base Julia Parameter driven by fungal nutrient seeking
                vec2 c = vec2(-0.8, 0.156);
                c += vec2(sin(localTime * 0.5), cos(localTime * 0.3)) * 0.05;
                c += vec2(noise(z * 4.0 + localTime), noise(z * 4.0 - localTime)) * 0.02; // Mycelial drift
                c += xor_glitch * 0.015; // Inject holy error

                float iter = 0.0;
                float trap_axis = 1e10;
                float trap_origin = 1e10;
                vec2 dz = vec2(1.0, 0.0);

                // Burning Ship Julia iteration (Cathedral of Chaos)
                for(int i = 0; i < MAX_ITER; i++) {
                    // Burning ship absolute fold breaks holomorphic symmetry
                    z = vec2(abs(z.x), abs(z.y));
                    
                    // Derivative tracking for distance estimation
                    dz = 2.0 * vec2(z.x * dz.x - z.y * dz.y, z.x * dz.y + z.y * dz.x) + vec2(1.0, 0.0);
                    
                    // Iterate
                    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
                    
                    // Orbit traps
                    trap_axis = min(trap_axis, min(abs(z.x), abs(z.y)));
                    trap_origin = min(trap_origin, dot(z, z));
                    
                    if(dot(z, z) > BAILOUT) {
                        // Smooth iteration count
                        float log_zn = log(dot(z, z)) * 0.5;
                        float nu = log(log_zn / 0.6931471806) / 0.6931471806;
                        iter = float(i) + 1.0 - nu;
                        break;
                    }
                }

                vec3 color = vec3(0.0);

                if(iter > 0.0) {
                    // Escape region: Neon Acid + Structural Color
                    vec3 neon = cosinePaletteNeon(iter * 0.03 - localTime * 0.5);
                    
                    // Thin-film interference on the fractal filaments
                    float de = sqrt(dot(z, z) / dot(dz, dz)) * log(dot(z, z)) * 0.5;
                    float thickness = iter * 12.0 + de * 5000.0;
                    float angle = clamp(trap_origin * 0.5, 0.0, PI / 2.0);
                    vec3 iridescence = structuralIridescence(thickness, angle);
                    
                    // Combine base acid with structural iridescence
                    color = mix(neon, iridescence, 0.65) * 1.5;
                    color += neon * exp(-de * 20.0) * 2.0; // Filament glow
                    
                } else {
                    // Interior region: Mycelial Sclerotium (Dormant/Dark)
                    float interiorDepth = sqrt(trap_origin);
                    vec3 voidColor = vec3(0.05, 0.0, 0.1); // Cosmic void
                    
                    // Anastomosis loop flashes
                    float loopGlow = exp(-trap_axis * 40.0) * (0.5 + 0.5 * sin(localTime * 5.0 + interiorDepth * 20.0));
                    color = voidColor + vec3(0.9, 0.8, 0.2) * loopGlow * 2.0;
                    
                    // Laccase enzyme staining
                    float stain = smoothstep(0.2, 0.0, trap_axis) * fbm(z * 15.0);
                    color = mix(color, vec3(0.1, 0.3, 0.6), stain);
                }

                // Fungal sector boundaries / Lignin degradation (White Rot)
                float sector = smoothstep(0.02, 0.0, trap_axis);
                color += vec3(0.8, 1.0, 0.9) * sector * exp(-iter * 0.1) * 1.5;

                // Overdrive and Tonemap
                color *= 1.5; // Push into HDR
                color = tonemapACES(color);
                
                // Subtle chromatic aberration glitch
                if (fbm(uv * 50.0 + u_time) > 0.85) {
                    color.r = fract(color.r + 0.1);
                    color.b *= 0.8;
                }

                // Vignette
                float vignette = 1.0 - smoothstep(0.5, 1.5, length(vUv - 0.5));
                color *= vignette;

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

        const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(plane);

        canvas.__three = { renderer, scene, camera, material };
    }

    const { renderer, scene, camera, material } = canvas.__three;

    if (material && material.uniforms) {
        material.uniforms.u_time.value = time;
        if (material.uniforms.u_resolution.value.x !== grid.width || material.uniforms.u_resolution.value.y !== grid.height) {
            material.uniforms.u_resolution.value.set(grid.width, grid.height);
        }
    }

    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

} catch (e) {
    console.error("Feral WebGL Error:", e);
}