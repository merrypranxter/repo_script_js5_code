try {
    if (!canvas.__three) {
        if (!ctx) throw new Error("WebGL 2 context not available");

        // 1. GENERATE THE "ASTRAL TRASH" TEXTURE (The Bureaucratic Print Failure)
        // We render this offscreen with deliberate CMYK misregistration and heavy decorative mass
        const tCanvas = document.createElement('canvas');
        tCanvas.width = grid.width * 2; // Supersample for crispness before we destroy it
        tCanvas.height = grid.height * 2;
        const tCtx = tCanvas.getContext('2d');
        
        tCtx.fillStyle = '#000000';
        tCtx.fillRect(0, 0, tCanvas.width, tCanvas.height);
        
        const fontSize = Math.floor(tCanvas.height * 0.18);
        tCtx.font = `900 italic ${fontSize}px "Arial Black", Impact, sans-serif`;
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        
        const cx = tCanvas.width / 2;
        const cy = tCanvas.height / 2;
        const offset = tCanvas.width * 0.008; // Registration error

        tCtx.globalCompositeOperation = 'screen';

        // Cyan Plate
        tCtx.fillStyle = '#00ffff';
        tCtx.fillText("ASTRAL", cx - offset, cy - fontSize * 0.6);
        tCtx.fillText("TRASH", cx - offset, cy + fontSize * 0.6);

        // Magenta Plate
        tCtx.fillStyle = '#ff00ff';
        tCtx.fillText("ASTRAL", cx + offset, cy - fontSize * 0.6);
        tCtx.fillText("TRASH", cx + offset, cy + fontSize * 0.6);

        // Yellow Plate
        tCtx.fillStyle = '#ffff00';
        tCtx.fillText("ASTRAL", cx, cy - fontSize * 0.6 + offset);
        tCtx.fillText("TRASH", cx, cy + fontSize * 0.6 + offset);

        // Key (White/Luma) Plate - slightly eroded
        tCtx.globalCompositeOperation = 'source-over';
        tCtx.fillStyle = '#ffffff';
        tCtx.fillText("ASTRAL", cx, cy - fontSize * 0.6);
        tCtx.fillText("TRASH", cx, cy + fontSize * 0.6);

        const textTexture = new THREE.CanvasTexture(tCanvas);
        textTexture.minFilter = THREE.LinearMipmapLinearFilter;
        textTexture.magFilter = THREE.LinearFilter;

        // 2. BUILD THE WET ENGINE (The Material Shader)
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
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
            uniform vec2 u_res;
            uniform sampler2D u_text;

            // --- THE MATH OF THE VOID ---
            
            float hash12(vec2 p) {
                vec3 p3  = fract(vec3(p.xyx) * 0.1031);
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.x + p3.y) * p3.z);
            }

            vec2 hash22(vec2 p) {
                vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.xx + p3.yz) * p3.zy);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash12(i + vec2(0.0, 0.0)), hash12(i + vec2(1.0, 0.0)), u.x),
                           mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
            }

            float fbm(vec2 x) {
                float v = 0.0;
                float a = 0.5;
                vec2 shift = vec2(100.0);
                for (int i = 0; i < 5; ++i) {
                    v += a * noise(x);
                    x = x * 2.0 + shift;
                    a *= 0.5;
                }
                return v;
            }

            // Magnetic Ferrofluid Spikes (Cellular Noise)
            vec3 voronoi(vec2 x, float t) {
                vec2 n = floor(x);
                vec2 f = fract(x);
                float m = 8.0;
                vec2 mr;
                for(int j = -1; j <= 1; j++) {
                    for(int i = -1; i <= 1; i++) {
                        vec2 g = vec2(float(i), float(j));
                        vec2 o = hash22(n + g);
                        o = 0.5 + 0.5 * sin(t + 6.2831853 * o);
                        vec2 r = g + o - f;
                        float d = dot(r, r);
                        if(d < m) {
                            m = d;
                            mr = r;
                        }
                    }
                }
                return vec3(sqrt(m), mr);
            }

            mat2 rot(float a) {
                float s = sin(a), c = cos(a);
                return mat2(c, -s, s, c);
            }

            void main() {
                // THREE TIME SCALES: Drift, Motion, Shimmer
                float t_slow = u_time * 0.1;
                float t_med  = u_time * 0.6;
                float t_fast = u_time * 4.0;

                vec2 uv = vUv;
                
                // 1. FAST SHIMMER: Machine hesitation & Glitch
                // Quantize Y for horizontal scanline glitch
                float scanline = floor(uv.y * u_res.y * 0.1);
                float glitch = step(0.97, hash12(vec2(scanline, floor(t_fast * 2.0))));
                vec2 textUV = uv + vec2(glitch * 0.05 * sin(t_fast), 0.0);

                // 2. SLOW DRIFT: The Deep Fluid Carrier
                vec2 q = vec2(fbm(uv * 3.0 + t_slow), fbm(uv * 3.0 + vec2(5.2, 1.3) - t_slow));
                
                // Text pulls the fluid (Gravity well logic)
                vec4 rawText = texture(u_text, textUV + (q - 0.5) * 0.05); // Slight fluid warp on read
                float textMass = max(rawText.r, max(rawText.g, rawText.b));
                
                // 3. MEDIUM MOTION: Ferrofluid Spikes & Interference
                vec2 r = vec2(fbm(uv * 5.0 + 4.0 * q + t_med + textMass * 0.5), 
                              fbm(uv * 5.0 + 4.0 * q + vec2(8.3, 2.8) - t_med));
                              
                float f = fbm(uv * 10.0 + 5.0 * r);
                
                // Voronoi magnetic spikes
                vec3 v = voronoi(uv * 12.0 + r * 3.0, t_med);
                float veins = smoothstep(0.1, 0.0, v.x); // Sharp ridges
                float cells = v.x; // Cell interiors
                
                // --- PALETTE: Cyberdelic Neon & Void Black ---
                vec3 voidBlack = vec3(0.02, 0.03, 0.04);
                vec3 cyan = vec3(0.0, 1.0, 0.94);
                vec3 mag = vec3(1.0, 0.0, 0.8);
                vec3 yel = vec3(1.0, 0.9, 0.0);

                // Build the base fluid substance
                vec3 col = voidBlack;
                col = mix(col, cyan * 0.4, smoothstep(0.3, 0.7, r.x));
                col = mix(col, mag * 0.4, smoothstep(0.4, 0.8, r.y));
                
                // Spikes glow intensely
                vec3 veinColor = mix(cyan, yel, f);
                veinColor = mix(veinColor, mag, r.x);
                col += veinColor * veins * (1.0 + textMass * 2.0); // Text excites the spikes
                
                // Integrate the "ASTRAL TRASH" text as a physical emulsion
                vec3 textInk = rawText.rgb;
                // The ink floats on the fluid, pooling in the Voronoi cells
                vec3 pooledInk = textInk * (0.5 + 1.5 * cells) + textInk * f;
                col = mix(col, pooledInk, smoothstep(0.1, 0.6, textMass));
                
                // --- PRINT ARTIFACTS: Halftone Screen & Grain ---
                // Rotate grid slowly over time for moire-like liquid feel
                vec2 gridUV = rot(0.5 + t_slow * 0.2) * uv * (u_res * 0.15); 
                vec2 cellUV = fract(gridUV) - 0.5;
                float dotDist = length(cellUV);
                
                // Luma calculation for halftone dot size
                float luma = dot(col, vec3(0.299, 0.587, 0.114));
                float radius = sqrt(luma) * 0.65;
                float halftone = smoothstep(radius + 0.05, radius - 0.05, dotDist);
                
                // The ink eats into the void black where halftone drops off
                col = mix(voidBlack * 0.5, col * 1.5, halftone);
                
                // Quantum Dust (Blue Noise approximation via high-freq hash)
                float dust = hash12(uv * u_res + t_fast);
                col += dust * 0.08 * vec3(1.0, 0.8, 0.9); // Slight warmth to the dust
                
                // Vignette / Lens degradation
                float vig = length(vUv - 0.5);
                col *= smoothstep(0.8, 0.3, vig);

                fragColor = vec4(col, 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader,
            fragmentShader,
            uniforms: {
                u_time: { value: 0 },
                u_res: { value: new THREE.Vector2(grid.width, grid.height) },
                u_text: { value: textTexture }
            },
            depthWrite: false,
            depthTest: false
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);

        canvas.__three = { renderer, scene, camera, material };
    }

    const { renderer, scene, camera, material } = canvas.__three;

    // Update Vitality (Time & Resolution)
    if (material && material.uniforms) {
        if (material.uniforms.u_time) material.uniforms.u_time.value = time;
        if (material.uniforms.u_res) material.uniforms.u_res.value.set(grid.width, grid.height);
    }

    // Render the physical substance
    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

} catch (e) {
    console.error("The Wet Engine Failed to Ignite:", e);
}