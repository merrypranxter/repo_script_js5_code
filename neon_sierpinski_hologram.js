// ✦ SACRED SIGNAL-PYRAMID ✦
// A recursive Sierpinski hallucination integrating OKLab color math, 
// moiré interference, crystalline edge glints, and digital folklore artifacts.

if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");

        // Initialize Three.js with the provided WebGL2 context
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        // ─── SHADER MATERIAL ────────────────────────────────────────────────────
        const vertexShader = `
            out vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            precision highp float;
            in vec2 vUv;
            out vec4 fragColor;

            uniform float u_time;
            uniform vec2 u_resolution;
            uniform vec2 u_mouse;
            uniform float u_seed;

            const float PI = 3.14159265359;

            // ─── OKLAB COLOR MATH (from color_systems repo) ─────────────────────
            vec3 oklab_to_srgb(vec3 c) {
                float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
                float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
                float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;

                float l = l_ * l_ * l_;
                float m = m_ * m_ * m_;
                float s = s_ * s_ * s_;

                vec3 rgb = vec3(
                     4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
                );
                
                // sRGB gamma encoding
                vec3 srgb;
                srgb.r = rgb.r <= 0.0031308 ? rgb.r * 12.92 : 1.055 * pow(max(rgb.r, 0.0), 1.0 / 2.4) - 0.055;
                srgb.g = rgb.g <= 0.0031308 ? rgb.g * 12.92 : 1.055 * pow(max(rgb.g, 0.0), 1.0 / 2.4) - 0.055;
                srgb.b = rgb.b <= 0.0031308 ? rgb.b * 12.92 : 1.055 * pow(max(rgb.b, 0.0), 1.0 / 2.4) - 0.055;
                return clamp(srgb, 0.0, 1.0);
            }

            // Generates a vibrant, mathematically spaced palette (Acid Vibration / Cyberdelic)
            vec3 getPalette(float t, float seed) {
                float L = 0.75 + 0.1 * sin(t * PI + seed);
                float C = 0.22 + 0.06 * cos(t * 2.0 * PI + seed * 1.618);
                float H = t * TAU + seed * 10.0;
                
                float a = C * cos(H);
                float b = C * sin(H);
                
                return oklab_to_srgb(vec3(L, a, b));
            }

            // ─── FRACTAL ENGINE (from fractals repo) ────────────────────────────
            // Kaleidoscopic Iterated Function System (KIFS) for Sierpinski
            vec3 kifs(vec2 p, float time) {
                float scale = 1.0;
                float trap1 = 1e10;
                float trap2 = 1e10;
                
                // Continuous infinite zoom
                float zoomSpeed = 0.3;
                float z = exp(fract(time * zoomSpeed) * log(2.0));
                p /= z;
                scale /= z;
                
                // Breathing pan
                p.y += 0.15 + sin(time * 0.5) * 0.05;
                
                vec2 n1 = vec2(0.8660254, 0.5); // 60 degree fold plane
                
                // Mouse-driven mutation (pure Sierpinski at left, Apollonian lace at right)
                float invR = u_mouse.x > 0.01 ? u_mouse.x * 1.5 : 0.0;
                float twist = u_mouse.y > 0.01 ? (u_mouse.y - 0.5) * 0.5 : 0.0;
                
                for(int i = 0; i < 12; i++) {
                    // Sierpinski fold sequence
                    p.x = abs(p.x);
                    p.y += 0.288675;
                    p -= 2.0 * min(0.0, dot(p, n1)) * n1;
                    p.y -= 0.288675;
                    
                    // Mythic Attractor / Circle Inversion (Impossible depth pockets)
                    float r2 = dot(p, p);
                    if(r2 < invR) {
                        p /= r2;
                        scale /= r2;
                    }
                    
                    // Spatial twist / Anisotropic shear
                    if(abs(twist) > 0.001) {
                        float c = cos(twist), s = sin(twist);
                        p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
                    }
                    
                    // Scale and translate
                    p *= 2.0;
                    p.y -= 0.57735;
                    scale *= 2.0;
                    
                    // Orbit traps for color mapping
                    trap1 = min(trap1, abs(p.x));
                    trap2 = min(trap2, length(p));
                }
                
                float d = (length(p) - 0.4) / abs(scale);
                return vec3(d, trap1, trap2);
            }

            // 2.5D Normal calculation from 2D SDF
            vec3 getNormal(vec2 p, float time) {
                vec2 e = vec2(0.002, 0.0);
                return normalize(vec3(
                    kifs(p + e.xy, time).x - kifs(p - e.xy, time).x,
                    kifs(p + e.yx, time).x - kifs(p - e.yx, time).x,
                    0.015 // Bevel depth for structural shine
                ));
            }

            // ─── RENDER PASS (from shiny & moire repos) ──────────────────────────
            vec3 render(vec2 uv, float time, float seed) {
                vec3 k = kifs(uv, time);
                float d = k.x;
                float t1 = k.y;
                float t2 = k.z;
                
                vec3 n = getNormal(uv, time);
                vec3 ld = normalize(vec3(sin(time * 0.4), cos(time * 0.3), 1.0));
                vec3 vd = vec3(0.0, 0.0, 1.0);
                
                float diff = max(0.0, dot(n, ld));
                float spec = pow(max(0.0, dot(reflect(-ld, n), vd)), 64.0);
                
                // Orbit trap palette synthesis
                vec3 c1 = getPalette(t1 * 1.5 - time * 0.2, seed);
                vec3 c2 = getPalette(t2 * 3.0 + time * 0.1, seed + 1.0);
                
                // Mix colors based on surface slope
                vec3 col = mix(c1, c2, smoothstep(0.0, 1.0, 1.0 - n.z));
                col *= diff * 0.8 + 0.2; // Ambient + Diffuse
                
                // Moiré as Optical Architecture: high-frequency grid mapping
                float moireFreq = 250.0;
                float moire = sin(uv.x * moireFreq) * sin(uv.y * moireFreq);
                col += moire * 0.15 * (1.0 - n.z); // Interference visible on slopes
                
                // Shine is a Structure: Crystalline edge glints
                float edge = smoothstep(0.003, 0.0, abs(d));
                col += edge * spec * 2.5 * vec3(1.0, 0.95, 0.95); // White-hot accents
                
                // Reaction-diffusion blooming (subsurface glow)
                float glow = exp(-abs(d) * 12.0);
                col += glow * c2 * 0.6;
                
                // Recursive Void masking (deep space behind the fractal)
                vec3 voidColor = vec3(0.03, 0.0, 0.08); // Dark purple occult void
                col = mix(col, voidColor, smoothstep(0.0, 0.005, d));
                
                return col;
            }

            void main() {
                vec2 uv = (vUv - 0.5) * 2.0;
                uv.x *= u_resolution.x / u_resolution.y;
                
                // ─── CHROMATIC ABERRATION (Psychedelic Collage) ─────────────────
                // Directional RGB splitting based on distance from center
                vec2 dir = normalize(uv) * 0.006 * (1.0 + sin(u_time * 1.5) * 0.5);
                
                vec3 finalCol;
                finalCol.r = render(uv + dir, u_time, u_seed).r;
                finalCol.g = render(uv, u_time, u_seed).g;
                finalCol.b = render(uv - dir, u_time, u_seed).b;
                
                // ─── PRINT ARTIFACTS & DIGITAL FOLKLORE ─────────────────────────
                // Halftone / Xerox dot screen
                float luma = dot(finalCol, vec3(0.299, 0.587, 0.114));
                float ht = sin(uv.x * u_resolution.x * 0.4) * sin(uv.y * u_resolution.y * 0.4);
                float dotPattern = smoothstep(0.0, 0.1, ht - (1.0 - luma));
                finalCol = mix(finalCol, finalCol * dotPattern, 0.12);
                
                // Film grain / Noise
                float noise = fract(sin(dot(uv + u_time, vec2(12.9898, 78.233))) * 43758.5453);
                finalCol += noise * 0.06;
                
                // CRT Scanlines
                float scanline = sin(uv.y * u_resolution.y * 0.6 - u_time * 12.0) * 0.03;
                finalCol -= scanline;
                
                fragColor = vec4(finalCol, 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader,
            fragmentShader,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_mouse: { value: new THREE.Vector2(0, 0) },
                u_seed: { value: Math.random() * 100.0 }
            },
            depthWrite: false,
            depthTest: false
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);

        // State & Event Listeners
        const state = { time: 0, paused: false, lastFrame: performance.now() };

        const onKeyDown = (e) => {
            if (e.key.toLowerCase() === 's') {
                renderer.render(scene, camera);
                const link = document.createElement('a');
                link.download = `sierpinski_hallucination_${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
            if (e.key.toLowerCase() === 'r') {
                material.uniforms.u_seed.value += 1.618;
            }
            if (e.code === 'Space') {
                state.paused = !state.paused;
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        canvas.__three = { renderer, scene, camera, material, state, onKeyDown };
    } catch (e) {
        console.error("WebGL Initialization Failed:", e);
        return;
    }
}

// ─── RENDER LOOP ────────────────────────────────────────────────────────────
const { renderer, scene, camera, material, state } = canvas.__three;

if (material && material.uniforms) {
    const now = performance.now();
    const dt = (now - state.lastFrame) / 1000.0;
    state.lastFrame = now;

    if (!state.paused) {
        state.time += dt;
    }

    material.uniforms.u_time.value = state.time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
    
    // Normalize mouse to 0.0 - 1.0
    const mx = mouse.x / grid.width;
    const my = 1.0 - (mouse.y / grid.height);
    
    // Smooth damp mouse for organic feel
    material.uniforms.u_mouse.value.x += (mx - material.uniforms.u_mouse.value.x) * 0.1;
    material.uniforms.u_mouse.value.y += (my - material.uniforms.u_mouse.value.y) * 0.1;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);