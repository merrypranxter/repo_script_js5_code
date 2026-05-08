try {
    // FERAL DESIGN-BRAIN: LITHOGENESIS MODULE ENGAGED
    // AESTHETIC DIRECTIVE: Structural Color Birefringence Slag
    // PALETTE: Void Black / Neon Cyan / Neon Magenta / Neon Yellow
    // MECHANISM: 2nd cos(theta) = m*lambda (Bragg Reflection) mapped over a warped Gyroid manifold.

    if (!canvas.__three) {
        if (!ctx) throw new Error("WebGL 2 context not available. The void requires hardware acceleration.");

        const renderer = new THREE.WebGLRenderer({ 
            canvas, 
            context: ctx, 
            alpha: true, 
            antialias: true 
        });
        
        const scene = new THREE.Scene();
        // Orthographic camera for pure screen-space procedural texturing
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

            in vec2 vUv;
            out vec4 fragColor;

            uniform float u_time;
            uniform vec2 u_resolution;

            // QUANTUM DUST HASH (Fast shimmer)
            float hash(vec3 p) {
                p = fract(p * vec3(443.897, 441.423, 437.195));
                p += dot(p, p.yxz + 19.19);
                return fract((p.x + p.y) * p.z);
            }

            // 3D NOISE KERNEL
            float noise(vec3 p) {
                vec3 i = floor(p);
                vec3 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                float n = i.x + i.y * 157.0 + 113.0 * i.z;
                return mix(
                    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
            }

            // FRACTIONAL BROWNIAN MOTION (Domain Warping)
            float fbm(vec3 p) {
                float v = 0.0;
                float a = 0.5;
                // Asymmetric rotation matrix to break grid alignment
                mat3 rot = mat3(
                    0.36, 0.48, -0.8,
                    -0.8, 0.60, 0.0,
                    0.48, 0.64, 0.60
                );
                for (int i = 0; i < 5; i++) {
                    v += a * noise(p);
                    p = rot * p * 2.0 + vec3(0.1, 0.2, 0.3);
                    a *= 0.5;
                }
                return v;
            }

            // TRIPLY PERIODIC MINIMAL SURFACE (Gyroid)
            float gyroid(vec3 p) {
                return dot(sin(p), cos(p.yzx));
            }

            void main() {
                // Normalize coordinates to aspect ratio
                vec2 uv = (vUv - 0.5) * (u_resolution.x / u_resolution.y);
                uv *= 3.0; // Zoom out to reveal macro-structure

                // --- THREE SIMULTANEOUS TIME SCALES ---
                
                // 1. SLOW GLOBAL DRIFT (Tectonic plate shifting)
                float t_slow = u_time * 0.05;
                
                // 2. MEDIUM STRUCTURAL MOTION (Liquid crystal flow with machine hesitation)
                float glitch = step(0.95, hash(vec3(floor(u_time * 10.0), 0.0, 0.0))) * 0.2;
                float t_med = u_time * 0.2 + glitch;
                
                // 3. FAST DETAIL SHIMMER (Quantum dust and photon excitement)
                float t_fast = u_time * 1.5;

                // --- HOSTILE COORDINATES & DOMAIN WARP ---
                vec3 p = vec3(uv * 1.5, t_slow);
                float n1 = fbm(p);
                
                // Hyperbolic Möbius twist based on slow noise
                float r = length(uv);
                float theta = atan(uv.y, uv.x);
                vec2 warpedUv = uv + vec2(cos(theta + n1 * 6.28), sin(theta + n1 * 6.28)) * (n1 * 0.6);

                // --- MESOSCOPIC LATTICE (The physical substance) ---
                vec3 p2 = vec3(warpedUv * 3.0, t_med);
                // Curl-like spatial distortion
                p2.xy += vec2(fbm(p2 + vec3(1.0)), fbm(p2 - vec3(1.0))) * 1.5;
                float lattice = gyroid(p2);
                
                // Crystalline Cleavage Planes (Anisotropic intersecting lines)
                float cleavage = sin(warpedUv.x * 40.0 + lattice * 10.0) * cos(warpedUv.y * 40.0 + lattice * 10.0);
                
                // --- THIN-FILM INTERFERENCE PHYSICS ---
                // Bragg Reflection mapping: 2*n*d*cos(theta) = m*lambda
                
                // Procedural thickness map (d)
                float thickness = abs(lattice) * 600.0 + abs(cleavage) * 150.0 + fbm(p2 * 2.0) * 300.0;
                
                // Pseudo-normal for view angle (cosTheta)
                vec3 N = normalize(vec3(
                    gyroid(p2 + vec3(0.01, 0.0, 0.0)) - lattice,
                    gyroid(p2 + vec3(0.0, 0.01, 0.0)) - lattice,
                    0.5 // Z-depth assumption
                ));
                vec3 V = vec3(0.0, 0.0, 1.0); // View vector (straight on)
                float cosTheta = max(0.0, dot(N, V));
                
                // Optical path difference (n = 1.5)
                float pathDiff = 2.0 * 1.5 * thickness * cosTheta;

                // Map path difference to specific CMY wavelengths (in nanometers)
                // Interference = 0.5 + 0.5 * cos( 2 * PI * pathDiff / lambda )
                float c_int = pow(0.5 + 0.5 * cos(6.28318 * pathDiff / 490.0), 3.0); // Cyan peak
                float m_int = pow(0.5 + 0.5 * cos(6.28318 * pathDiff / 550.0), 3.0); // Magenta proxy
                float y_int = pow(0.5 + 0.5 * cos(6.28318 * pathDiff / 600.0), 3.0); // Yellow peak

                // --- VOID LOGIC ---
                // Deep black pits where the structure undergoes entropic decay
                float voidMask = smoothstep(0.2, 0.6, fbm(vec3(uv * 2.0, t_slow * 0.5)));
                // Carve harsh geometric edges into the voids
                voidMask *= smoothstep(0.0, 0.2, abs(lattice + 0.5));

                // --- FAST SHIMMER (Quantum Dust) ---
                float dust = hash(vec3(uv * 150.0, t_fast));
                // Dust only settles on the high ridges of the lattice
                float dustIntensity = smoothstep(0.95, 1.0, dust) * smoothstep(0.5, 1.0, lattice) * voidMask;

                // --- ALCHEMICAL ASSEMBLY ---
                vec3 color = vec3(0.0); // Start in the void
                
                // Inject Neon CMY based on interference math
                color += c_int * vec3(0.0, 1.0, 1.0) * 1.2;
                color += m_int * vec3(1.0, 0.0, 1.0) * 1.2;
                color += y_int * vec3(1.0, 1.0, 0.0) * 1.2;
                
                // Apply the void (Starving the light)
                color *= voidMask;

                // Add structural glints (Birefringence flashes on cleavage planes)
                float glint = smoothstep(0.85, 1.0, abs(cleavage)) * voidMask;
                color += glint * vec3(0.8, 1.0, 1.0); // White-hot cyan core

                // Overlay the active dust layer (Yellow/Magenta noise)
                color += dustIntensity * mix(vec3(1.0, 0.0, 1.0), vec3(1.0, 1.0, 0.0), hash(vec3(uv, 1.0)));

                // Vignette (Focusing the microscope)
                float vignette = 1.0 - smoothstep(0.5, 2.5, r);
                color *= vignette;

                // Final contrast crush for that harsh, physical look
                color = smoothstep(0.0, 1.0, color);

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
        
        // Cache the hardware context to prevent re-initialization trauma
        canvas.__three = { renderer, scene, camera, material };
    }

    const { renderer, scene, camera, material } = canvas.__three;

    // Safely update the vital fluids (uniforms)
    if (material && material.uniforms) {
        if (material.uniforms.u_time) {
            material.uniforms.u_time.value = time;
        }
        if (material.uniforms.u_resolution) {
            material.uniforms.u_resolution.value.set(grid.width, grid.height);
        }
    }

    // Execute the warp-level render
    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

} catch (e) {
    console.error("LITHOGENESIS ENGINE FAILURE:", e);
}