try {
    if (!canvas.__three) {
        if (!ctx) throw new Error("WebGL 2 context not available");

        // --- DECORATIVE TEXTURE GENERATION ---
        // Generates the "ASTRAL TRASH" text as a structural mask
        const tCanvas = document.createElement('canvas');
        tCanvas.width = 2048;
        tCanvas.height = 1024;
        const tCtx = tCanvas.getContext('2d');
        
        // Void Black Base
        tCtx.fillStyle = '#000000';
        tCtx.fillRect(0, 0, 2048, 1024);

        // Core Typography
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        tCtx.font = 'italic 900 200px "Arial Black", Impact, sans-serif';

        // Layer 1: Blurred Aura / Phosphor Bloom
        tCtx.filter = 'blur(15px)';
        tCtx.fillStyle = '#FFFFFF';
        tCtx.fillText("ASTRAL TRASH", 1024, 512);

        // Layer 2: Sharp Core
        tCtx.filter = 'none';
        tCtx.fillText("ASTRAL TRASH", 1024, 512);

        // Layer 3: Misregistered Strokes (Print Damage / Moiré prep)
        tCtx.lineWidth = 6;
        tCtx.strokeStyle = '#FFFFFF';
        tCtx.strokeText("ASTRAL TRASH", 1040, 520);
        
        tCtx.lineWidth = 2;
        tCtx.strokeText("ASTRAL TRASH", 1000, 500);

        // Layer 4: Structural Scars / Crystalline Fractures
        tCtx.lineWidth = 3;
        for (let i = 0; i < 300; i++) {
            tCtx.beginPath();
            const x = Math.random() * 2048;
            const y = Math.random() * 1024;
            tCtx.moveTo(x, y);
            // Draw sharp, angular lines resembling origami creases
            if (Math.random() > 0.5) {
                tCtx.lineTo(x + (Math.random() - 0.5) * 200, y);
            } else {
                tCtx.lineTo(x, y + (Math.random() - 0.5) * 200);
            }
            tCtx.strokeStyle = Math.random() > 0.8 ? '#000000' : '#FFFFFF';
            tCtx.stroke();
        }

        const textTex = new THREE.CanvasTexture(tCanvas);
        // NearestFilter to preserve sharp, glitched pixel edges (Datamosh vibe)
        textTex.minFilter = THREE.NearestFilter;
        textTex.magFilter = THREE.NearestFilter;

        // --- WEBGL SETUP ---
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
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
            uniform sampler2D u_text;

            // Pseudo-random hash for structural noise
            vec3 hash33(vec3 p) {
                p = vec3( dot(p, vec3(127.1, 311.7, 74.7)),
                          dot(p, vec3(269.5, 183.3, 246.1)),
                          dot(p, vec3(113.5, 271.9, 124.6)));
                return fract(sin(p) * 43758.5453123);
            }

            // Chebyshev Voronoi for crystalline/bismuth geometry
            float crystalNoise(vec3 x) {
                vec3 p = floor(x);
                vec3 f = fract(x);
                float res = 100.0;
                for(int k = -1; k <= 1; k++) {
                    for(int j = -1; j <= 1; j++) {
                        for(int i = -1; i <= 1; i++) {
                            vec3 b = vec3(float(i), float(j), float(k));
                            vec3 r = vec3(b) - f + hash33(p + b);
                            // L-infinity metric forces rectilinear, sharp facets
                            float d = max(max(abs(r.x), abs(r.y)), abs(r.z));
                            res = min(res, d);
                        }
                    }
                }
                return res;
            }

            // Origami fold logic: sharp ridges from continuous signals
            float fold(float x) {
                return abs(fract(x) - 0.5) * 2.0;
            }

            // Fractal Brownian Motion using folded crystal noise
            float origamiFBM(vec3 p) {
                float f = 0.0;
                float amp = 0.5;
                for(int i = 0; i < 4; i++) {
                    f += amp * fold(crystalNoise(p));
                    p *= 2.0;
                    amp *= 0.5;
                }
                return f;
            }

            void main() {
                // 1. THREE SIMULTANEOUS TIME SCALES
                float t_slow = u_time * 0.1;  // Continental drift / deep structure
                float t_med  = u_time * 0.5;  // Fluid reaction-diffusion / folding
                float t_fast = u_time * 12.0; // High-frequency shimmer / glitch

                vec2 uv = vUv;

                // --- FAST: DAMAGE & MACROBLOCKING ---
                // Horizontal tearing
                float tear = step(0.98, fract(sin(uv.y * 200.0 + t_fast) * 43758.5453));
                uv.x += tear * 0.05 * sin(t_fast);

                // Macroblock quantization (Datamosh prediction failure)
                vec2 blockUV = floor(uv * vec2(40.0, 20.0)) / vec2(40.0, 20.0);
                float blockGlitch = step(0.96, hash33(vec3(blockUV, floor(t_fast))).x);
                vec2 baseUv = mix(uv, blockUV, blockGlitch * 0.8);

                // --- SLOW & MEDIUM: CRYSTALLINE SUBSTANCE ---
                vec3 p = vec3(baseUv * 5.0, t_slow);
                
                // Domain warping
                vec3 warp = vec3(
                    origamiFBM(p + vec3(1.0, 2.0, 3.0) * t_med),
                    origamiFBM(p + vec3(4.0, 5.0, 6.0) * t_med),
                    origamiFBM(p + vec3(7.0, 8.0, 9.0) * t_med)
                );

                // Deep material depth
                float depth = origamiFBM(p + warp * 2.5);

                // Compute normal via finite difference for physical volume
                float eps = 0.005;
                float dx = origamiFBM(p + warp * 2.5 + vec3(eps, 0.0, 0.0)) - depth;
                float dy = origamiFBM(p + warp * 2.5 + vec3(0.0, eps, 0.0)) - depth;
                vec3 normal = normalize(vec3(dx, dy, 0.08));

                // --- TEXTURE READ & BIREFRINGENCE ---
                // Distort text UVs using material normal to simulate refraction
                vec2 textUv = baseUv + normal.xy * 0.04;
                float textMask = texture(u_text, textUv).r;

                // Value combining physical depth and textual intrusion
                float val = depth + textMask * 0.4;

                // --- NEON CMYK COLOR MAPPING ---
                vec3 cCyan = vec3(0.0, 1.0, 1.0);
                vec3 cMag  = vec3(1.0, 0.0, 1.0);
                vec3 cYel  = vec3(1.0, 1.0, 0.0);
                vec3 cBlk  = vec3(0.0, 0.0, 0.0);

                // Print Moiré / Halftone interference
                float halftone = step(0.5, sin(uv.x * u_resolution.x * 0.6) * sin(uv.y * u_resolution.y * 0.6));

                vec3 col = cBlk;
                if (val > 0.85) {
                    col = cCyan;
                } else if (val > 0.70) {
                    col = mix(cMag, cCyan, halftone);
                } else if (val > 0.55) {
                    col = mix(cYel, cBlk, halftone);
                }

                // --- SHIMMER & SPECULARITY ---
                // Fast granular noise (film grain / sensor noise)
                float shimmer = hash33(vec3(uv * 1000.0, t_fast)).x;
                col += cCyan * shimmer * 0.15 * (1.0 - textMask);

                // Specular lighting highlighting the origami folds
                vec3 lightDir = normalize(vec3(sin(t_med), cos(t_med), 1.0));
                float spec = pow(max(dot(reflect(-lightDir, normal), vec3(0.0, 0.0, 1.0)), 0.0), 24.0);
                col += vec3(1.0) * spec * 0.8;

                // --- CHROMATIC ABERRATION / PHOSPHOR BLOOM ON TEXT ---
                // Pull separated channels from the text mask for a glowing glitch effect
                float textR = texture(u_text, textUv + vec2(0.015 * sin(t_fast), 0.0)).r;
                float textB = texture(u_text, textUv - vec2(0.015 * cos(t_fast), 0.0)).r;
                
                // Emissive neon bleed over the void
                col += vec3(textR, 0.0, textB) * 0.6 * (1.0 + blockGlitch);

                // Edge Vignette
                float dist = length(vUv - 0.5);
                col *= smoothstep(0.9, 0.3, dist);

                fragColor = vec4(col, 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_text: { value: textTex }
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
        material.uniforms.u_time.value = time;
        material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }

    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

} catch (e) {
    console.error("WebGL Initialization Failed:", e);
}