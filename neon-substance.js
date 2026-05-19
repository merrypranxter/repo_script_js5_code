(function(ctx, grid, time, repos, input, mouse, canvas, THREE) {
    if (!canvas.__three) {
        try {
            if (!ctx) throw new Error("WebGL 2 context not available");

            const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

                // ─── HASH & NOISE ──────────────────────────────────────────────
                float hash1(float n) { return fract(sin(n) * 43758.5453123); }
                vec2 hash2(vec2 p) {
                    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
                    p3 += dot(p3, p3.yzx + 33.33);
                    return fract((p3.xx+p3.yz)*p3.zy);
                }

                float noise(vec2 x) {
                    vec2 i = floor(x);
                    vec2 f = fract(x);
                    f = f * f * (3.0 - 2.0 * f);
                    float a = hash1(i.x + i.y * 57.0);
                    float b = hash1(i.x + 1.0 + i.y * 57.0);
                    float c = hash1(i.x + (i.y + 1.0) * 57.0);
                    float d = hash1(i.x + 1.0 + (i.y + 1.0) * 57.0);
                    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
                }

                float fbm(vec2 p) {
                    float v = 0.0;
                    float a = 0.5;
                    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
                    for (int i = 0; i < 5; i++) {
                        v += a * noise(p);
                        p = rot * p * 2.0;
                        a *= 0.5;
                    }
                    return v;
                }

                // ─── STRUCTURAL HEIGHTFIELD (THE MATERIAL MATH) ────────────────
                float map(vec2 p) {
                    // TIME SCALES
                    float t_slow = u_time * 0.05;  // Global drift
                    float t_med  = u_time * 0.4;   // Structural folding
                    float t_fast = u_time * 15.0;  // Quantum shimmer

                    // 1. FERROFLUID LABYRINTH (Domain Warping)
                    vec2 w = vec2(fbm(p * 2.5 + t_slow), fbm(p * 2.5 - t_slow + 43.2));
                    vec2 p_w = p + w * 0.4;
                    float lab = sin(p_w.x * 12.0) * cos(p_w.y * 12.0);
                    lab = smoothstep(0.0, 0.5, abs(lab)); // Viscous rounded ridges

                    // 2. MIURA-ORI CREASE PATTERN (Rigid Origami)
                    vec2 p_o = p * 8.0;
                    // Zig-zag shear to create Miura cells, animated by t_med
                    p_o.x += abs(fract(p_o.y * 0.5) - 0.5) * 2.0 * sin(t_med);
                    p_o = abs(fract(p_o) - 0.5);
                    float crease = min(p_o.x, p_o.y);
                    crease = exp(-crease * 25.0); // Sharp structural peaks

                    // 3. PHASE TRANSITION (Crystallization Boundary)
                    float phase = smoothstep(-0.4, 0.4, sin(t_slow * 10.0 + w.x * 5.0));
                    float h = mix(lab, crease, phase);

                    // 4. QUANTUM DUST / MICRO-STRUCTURE
                    float micro = noise(p * 200.0 - t_fast) * 0.03;

                    return h + micro;
                }

                void main() {
                    vec2 uv = vUv * 2.0 - 1.0;
                    uv.x *= u_resolution.x / u_resolution.y;

                    // ─── NORMAL CALCULATION (PHYSICAL DEPTH) ───────────────────
                    vec2 eps = vec2(0.002, 0.0);
                    float h = map(uv);
                    float hx = map(uv + eps.xy);
                    float hy = map(uv + eps.yx);
                    // Generate a 3D normal vector from the 2D heightfield gradient
                    vec3 N = normalize(vec3(hx - h, hy - h, 0.04)); 

                    // ─── CYBERDELIC NEON PALETTE ───────────────────────────────
                    vec3 voidCol = vec3(0.015, 0.023, 0.031); // Deep ink black
                    vec3 cyan    = vec3(0.000, 1.000, 0.940); // #00FFF0
                    vec3 mag     = vec3(1.000, 0.000, 0.800); // #FF00CC
                    vec3 yel     = vec3(1.000, 0.900, 0.000); // #FFE800

                    vec3 col = voidCol;

                    // ─── CHROMATIC ABERRATION & DIRECTIONAL LIGHTING ───────────
                    // Light hits the structural slopes differently, splitting RGB
                    float nx = smoothstep(0.0, 1.0, N.x * 0.5 + 0.5);
                    float ny = smoothstep(0.0, 1.0, N.y * 0.5 + 0.5);

                    // Map slopes to CMY inks
                    col = mix(col, cyan, pow(nx, 3.0) * h);
                    col = mix(col, mag, pow(1.0 - nx, 3.0) * h);
                    col = mix(col, yel, pow(ny, 4.0) * h);

                    // ─── BIREFRINGENCE (POLARIZED STRESS) ──────────────────────
                    // High gradients (sharp creases) cause interference rainbows
                    float stress = length(N.xy);
                    vec3 stressCol = 0.5 + 0.5 * cos(stress * 25.0 + vec3(0.0, 2.1, 4.2) - u_time);
                    col += stressCol * pow(stress, 5.0) * 0.8;

                    // ─── WET SHINE / CAUSTIC SPECULARITY ───────────────────────
                    vec3 L1 = normalize(vec3(sin(u_time * 0.5), cos(u_time * 0.5), 0.6));
                    vec3 V = vec3(0.0, 0.0, 1.0);
                    vec3 H1 = normalize(L1 + V);
                    float spec = pow(max(dot(N, H1), 0.0), 50.0);
                    col += cyan * spec * 2.0;

                    // ─── PRINT ARTIFACTS: XEROX GRAIN ──────────────────────────
                    vec2 seed = vUv * 1000.0 + u_time;
                    float grain = fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
                    
                    // Sparkle dust strictly on the ridges
                    col += yel * step(0.99, grain) * h * 1.5; 
                    // Overall ink degradation
                    col *= (0.85 + 0.15 * grain);

                    // ─── PRINT ARTIFACTS: HALFTONE SCREEN ──────────────────────
                    // Rotate UVs 45 degrees for classic offset screen angle
                    mat2 rot45 = mat2(0.707, -0.707, 0.707, 0.707);
                    vec2 ht_uv = rot45 * (vUv * u_resolution.y * 0.7);
                    
                    float dot_dist = length(fract(ht_uv) - 0.5);
                    // Dot size inversely proportional to height (peaks are solid, valleys are dots)
                    float dot_radius = sqrt(1.0 - h) * 0.45;
                    float halftone = smoothstep(dot_radius + 0.05, dot_radius - 0.05, dot_dist);

                    // Apply halftone primarily to the midtones/shadows
                    float ht_mask = mix(0.1, 1.0, halftone + smoothstep(0.6, 1.0, h));
                    col *= ht_mask;

                    // ─── VIGNETTE ──────────────────────────────────────────────
                    float vig = length(vUv - 0.5) * 2.0;
                    col *= smoothstep(1.2, 0.4, vig);

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
        } catch (e) {
            console.error("WebGL Initialization Failed:", e);
            return;
        }
    }

    const { renderer, scene, camera, material } = canvas.__three;

    if (material && material.uniforms) {
        material.uniforms.u_time.value = time;
        material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }

    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

})(ctx, grid, time, repos, input, mouse, canvas, THREE);