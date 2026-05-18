if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, grid.width/grid.height, 0.1, 1000);
        camera.position.z = 1;

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
                    // Bypass projection completely to perfectly fill the screen
                    gl_Position = vec4(position.xy, 0.0, 1.0);
                }
            `,
            fragmentShader: `
                in vec2 vUv;
                out vec4 fragColor;

                uniform float u_time;
                uniform vec2 u_resolution;

                // --------------------------------------------------------
                // NOISE & MATH CORE
                // --------------------------------------------------------
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }

                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    float a = hash(i);
                    float b = hash(i + vec2(1.0, 0.0));
                    float c = hash(i + vec2(0.0, 1.0));
                    float d = hash(i + vec2(1.0, 1.0));
                    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
                }

                float fbm(vec2 p) {
                    float f = 0.0;
                    float amp = 0.5;
                    for(int i = 0; i < 5; i++) {
                        f += amp * noise(p);
                        p *= 2.0;
                        amp *= 0.5;
                    }
                    return f;
                }

                // --------------------------------------------------------
                // ISLAMIC TILING: PENTAGRID (QUASICRYSTAL BASIS)
                // --------------------------------------------------------
                float pgD(vec2 p, int k, float sp, float gamma) {
                    float a = float(k) * 3.14159265359 / 5.0;
                    vec2 n = vec2(cos(a), sin(a));
                    // Distance to nearest line in the family
                    return abs(fract(dot(p, n) / sp + gamma + 0.5) - 0.5) * sp;
                }

                float pentagrid(vec2 p, float sp, float phase) {
                    float d = 1e9;
                    for(int i = 0; i < 5; i++) {
                        float gamma = float(i + 1) / 10.0 + phase;
                        d = min(d, pgD(p, i, sp, gamma));
                    }
                    return d;
                }

                // --------------------------------------------------------
                // MAIN MATERIAL COMPILATION
                // --------------------------------------------------------
                void main() {
                    vec2 uv = vUv * 2.0 - 1.0;
                    uv.x *= u_resolution.x / u_resolution.y;

                    // THREE SIMULTANEOUS TIME SCALES
                    // Machine hesitation introduced via sine step
                    float timeStutter = u_time + 0.1 * sin(u_time * 10.0) * step(0.9, sin(u_time * 2.0));
                    
                    float t_slow = timeStutter * 0.05; // Global topological drift
                    float t_med  = timeStutter * 0.2;  // Structural phase shifting
                    float t_fast = u_time * 2.0;       // Micro-shimmer and interference

                    // 1. FLUID ADVECTION (Topological warping)
                    vec2 q = uv * 3.0;
                    vec2 q_orig = q;
                    for(int i = 0; i < 4; i++) {
                        float n = fbm(q * 1.2 + t_slow);
                        float angle = n * 6.2831853 * 2.0;
                        q += vec2(cos(angle), sin(angle)) * 0.25;
                    }

                    // 2. STRUCTURAL LAYER (Medium Motion)
                    float sp = 1.0 + 0.2 * fbm(q * 3.0 - t_slow); // Dynamic spacing pressure
                    
                    // Chromatic Parallax misregistration (Separating the CMY channels)
                    vec2 offC = vec2( 0.02 * fbm(q * 5.0 + t_med), 0.0);
                    vec2 offM = vec2(-0.02 * fbm(q * 5.0 - t_med),  0.02 * fbm(q * 5.0));
                    vec2 offY = vec2( 0.0,                        -0.02 * fbm(q * 5.0 + t_med * 0.5));

                    // Core quasi-geometry
                    float dC = pentagrid(q + offC, sp, t_med);
                    float dM = pentagrid(q + offM, sp, t_med + 0.1);
                    float dY = pentagrid(q + offY, sp, t_med + 0.2);

                    // 3. THIN-FILM INTERFERENCE (Fast detail shimmer)
                    float filmThickness = 200.0 + 600.0 * fbm(q * 15.0 + vec2(t_fast * 0.1, 0.0));
                    float interference = cos(filmThickness * 0.02) * 0.5 + 0.5;

                    // Line drawing modulated by thin-film tension
                    float width = 0.005 + 0.02 * interference;
                    float lC = smoothstep(width, 0.0, dC);
                    float lM = smoothstep(width, 0.0, dM);
                    float lY = smoothstep(width, 0.0, dY);

                    // Caustic Glow (Thermal bloom around structures)
                    float gC = 0.002 / (dC * dC + 0.0001) * (0.5 + 0.5 * noise(q * 25.0 - t_fast));
                    float gM = 0.002 / (dM * dM + 0.0001) * (0.5 + 0.5 * noise(q * 25.0 + t_fast));
                    float gY = 0.002 / (dY * dY + 0.0001) * (0.5 + 0.5 * noise(q * 25.0));

                    // Compose Neon CMY
                    vec3 color = vec3(0.0);
                    vec3 cyan    = vec3(0.0, 1.0, 1.0);
                    vec3 magenta = vec3(1.0, 0.0, 1.0);
                    vec3 yellow  = vec3(1.0, 1.0, 0.0);
                    
                    color += cyan    * (lC + gC * 0.8);
                    color += magenta * (lM + gM * 0.8);
                    color += yellow  * (lY + gY * 0.8);

                    // Broad thermal bloom (low frequency structural glow)
                    float broadC = pentagrid(q * 0.5 + offC, sp, t_med);
                    float broadM = pentagrid(q * 0.5 + offM, sp, t_med + 0.1);
                    float broadY = pentagrid(q * 0.5 + offY, sp, t_med + 0.2);
                    color += cyan    * (0.01 / (broadC * broadC + 0.01));
                    color += magenta * (0.01 / (broadM * broadM + 0.01));
                    color += yellow  * (0.01 / (broadY * broadY + 0.01));

                    // 4. PHYSICAL SUBSTANCE (Abyssal Substrate)
                    float sub = fbm(q_orig * 8.0) * fbm(q * 16.0);
                    vec3 subColor = vec3(0.01, 0.02, 0.03) * sub;
                    // Iridescent oil sheen in the darkness
                    subColor += vec3(0.05, 0.02, 0.1) * interference * sub * 2.0;
                    color += subColor;

                    // 5. DEAD PIXELS (Pollen / Hardware Necrosis)
                    vec2 pixelCoord = vUv * u_resolution;
                    float h = hash(floor(pixelCoord + t_fast * 15.0));
                    float pollen = step(0.998, h);
                    vec3 pollenColor = mix(cyan, magenta, hash(floor(pixelCoord) * 0.1));
                    pollenColor = mix(pollenColor, yellow, hash(floor(pixelCoord) * 0.2));
                    color += pollenColor * pollen * 5.0;

                    // 6. ACES TONEMAPPING (HDR to LDR Compaction)
                    float a = 2.51;
                    float b = 0.03;
                    float c = 2.43;
                    float d = 0.59;
                    float e = 0.14;
                    color = clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);

                    // 7. FILM GRAIN & VIGNETTE (Tactility)
                    float grain = hash(pixelCoord + t_fast);
                    color *= 0.92 + 0.08 * grain;

                    float vig = length(vUv - 0.5) * 2.0;
                    color *= 1.0 - smoothstep(0.7, 1.4, vig);

                    fragColor = vec4(color, 1.0);
                }
            `
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
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);