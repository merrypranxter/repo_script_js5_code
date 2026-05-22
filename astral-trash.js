if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");

        // --- ASTRAL TRASH Decorative Texture Generation ---
        // We generate the text on a high-res offscreen canvas to feed into the shader
        // as a persistent semantic density map.
        const tCanvas = document.createElement('canvas');
        tCanvas.width = 2048;
        tCanvas.height = 1024;
        const tCtx = tCanvas.getContext('2d');
        
        tCtx.fillStyle = '#000000';
        tCtx.fillRect(0, 0, 2048, 1024);
        
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        tCtx.font = 'italic 900 240px "Georgia", "Times New Roman", serif';
        
        // Heavy, offset, decorative styling
        tCtx.lineWidth = 8;
        tCtx.strokeStyle = '#FFFFFF';
        tCtx.strokeText('ASTRAL TRASH', 1024, 512);
        
        tCtx.fillStyle = '#FFFFFF';
        tCtx.fillText('ASTRAL TRASH', 1024 + 12, 512 + 12);

        // Astral debris / noise injection into the text plane
        for(let i = 0; i < 3000; i++) {
            tCtx.fillStyle = Math.random() > 0.8 ? '#FFFFFF' : '#444444';
            tCtx.beginPath();
            tCtx.arc(Math.random() * 2048, Math.random() * 1024, Math.random() * 4, 0, Math.PI * 2);
            tCtx.fill();
        }

        const textTex = new THREE.CanvasTexture(tCanvas);
        textTex.minFilter = THREE.LinearFilter;
        textTex.magFilter = THREE.LinearFilter;

        // --- WebGL Setup ---
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
            uniform sampler2D u_text_tex;

            // --- Math / Aesthetics Core ---
            
            // Hash function for pseudo-randomness
            vec2 hash2(vec2 p) {
                p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
                return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
            }

            // Simplex-ish value noise
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                
                float n00 = dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
                float n10 = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
                float n01 = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
                float n11 = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
                
                return mix(mix(n00, n10, u.x), mix(n01, n11, u.x), u.y);
            }

            // Fractal Brownian Motion for tissue depth
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

            // Divergence-free curl noise (Advection-Diffusion Engine)
            vec2 curl(vec2 p) {
                float e = 0.01;
                float dx = fbm(p + vec2(e, 0.0)) - fbm(p - vec2(e, 0.0));
                float dy = fbm(p + vec2(0.0, e)) - fbm(p - vec2(0.0, e));
                return vec2(dy, -dx) / (2.0 * e);
            }

            // Hexagonal lattice coordinates (Rosensweig Instability / Ferrofluid Spikes)
            vec2 hexCoords(vec2 uv) {
                vec2 r = vec2(1.0, 1.7320508);
                vec2 h = r * 0.5;
                vec2 a = mod(uv, r) - h;
                vec2 b = mod(uv - h, r) - h;
                return dot(a, a) < dot(b, b) ? a : b;
            }

            void main() {
                // Time scales: Slow drift, Medium structure, Fast shimmer
                float t_slow = u_time * 0.04;
                float t_med  = u_time * 0.25;
                float t_fast = u_time * 3.5;

                vec2 st = vUv;
                vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
                vec2 p = (st - 0.5) * aspect;

                // 1. Slow Global Drift: Curl Advection warping the UVs
                vec2 flow = curl(p * 2.5 + t_slow);
                vec2 warped_st = st + flow * 0.06;

                // Read the semantic infestation mask (the text)
                float text_mask = texture(u_text_tex, warped_st).r;

                // 2. Medium Structural Motion: Ferrofluid Hex Lattice + Reaction-Diffusion Tissue
                vec2 hex_p = (p + flow * 0.1) * 35.0;
                float hex_dist = length(hexCoords(hex_p));

                // Base biological tissue depth
                float tissue = fbm(p * 6.0 - t_med);
                float depth = tissue * 0.5 + 0.5; // map to 0..1

                // Rosensweig Instability: Hex voids pull down into the black
                float spike = smoothstep(0.0, 0.4, hex_dist);
                depth *= spike; 

                // Semantic Magnetic Pull: The text forces the fluid into high-frequency ridges
                float text_grain = fbm(p * 60.0 + t_med * 2.0);
                depth += text_mask * (0.3 + 0.7 * text_grain);

                // 3. Fast Detail Shimmer: Thin-film interference via Optical Path Difference (OPD)
                float pixel_grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
                
                // OPD is heavily modulated by the physical depth and the fast time scale
                float OPD = depth * 14.0 + t_fast * 0.15 + pixel_grain * 0.1;

                // CMY Color Splitting via phase offset (Thin-Film Iridescence)
                vec3 neon_c = vec3(0.0, 1.0, 1.0);
                vec3 neon_m = vec3(1.0, 0.0, 1.0);
                vec3 neon_y = vec3(1.0, 1.0, 0.0);

                // Stark interference bands using power function
                float w_c = pow(max(0.0, sin(OPD * 6.28318)), 5.0);
                float w_m = pow(max(0.0, sin(OPD * 6.28318 + 2.09439)), 5.0); // +120 deg
                float w_y = pow(max(0.0, sin(OPD * 6.28318 + 4.18879)), 5.0); // +240 deg

                float sum = w_c + w_m + w_y + 0.0001;
                vec3 color = (neon_c * w_c + neon_m * w_m + neon_y * w_y) / sum;

                // Void Black Masking: Color only survives on the slopes, dying in the deep valleys
                float visibility = smoothstep(0.1, 0.35, depth) * smoothstep(1.3, 0.85, depth);
                color *= visibility;

                // The text burns pure white-hot at the absolute peaks of the interference
                float text_burn = smoothstep(0.85, 1.0, text_mask * depth);
                color = mix(color, vec3(1.0, 0.9, 1.0), text_burn);

                // Inject physical noise into the void
                color += vec3(0.03) * pixel_grain * (1.0 - visibility);

                fragColor = vec4(color, 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_text_tex: { value: textTex }
            },
            vertexShader,
            fragmentShader,
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