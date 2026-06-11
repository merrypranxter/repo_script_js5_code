try {
    if (!canvas.__three) {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
        camera.position.z = 5;
        
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

            // Hash & Noise for Glitch/Artifacts
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                           mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
            }

            // Hyperpop / Acid Palette (Cosine)
            vec3 palette(float t) {
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.33);
                vec3 c = vec3(2.0, 1.0, 1.0);
                vec3 d = vec3(0.5, 0.2, 0.25);
                return a + b * cos(6.28318 * (c * t + d));
            }

            // MySpace Sparkle/Blingee Generator
            float sparkle(vec2 uv, vec2 center, float size) {
                vec2 d = abs(uv - center);
                float cross = max(0.0, 1.0 - (d.x * d.y * 1500.0 / size));
                float core = max(0.0, 1.0 - length(d) * 60.0 / size);
                return cross + core;
            }

            void main() {
                vec2 uv = vUv;
                vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

                // 1. MACROBLOCK GLITCH (Datamosh / Candy Crash)
                float t_snap = floor(u_time * 14.0);
                vec2 gridUV = floor(uv * vec2(24.0, 18.0));
                float glitchTrigger = hash(gridUV + t_snap);
                
                if (glitchTrigger > 0.88) {
                    p += (vec2(hash(gridUV), hash(gridUV + 1.0)) - 0.5) * 0.15;
                    uv += (vec2(hash(gridUV + 2.0), hash(gridUV + 3.0)) - 0.5) * 0.1;
                }

                // 2. VHS TRACKING TEAR (Analog Signal Death)
                float tracking = step(0.92, sin(uv.y * 25.0 + u_time * 15.0)) * hash(vec2(u_time, uv.y));
                p.x += tracking * 0.15;

                // 3. ZENO TUNNEL & OP-ART (Retinal Surrealism)
                float a = atan(p.y, p.x);
                float r = length(p);
                
                // Zeno singularity / Infinite Descent
                float z = 1.0 / (r + 0.001);
                float depth = z + u_time * 3.0;
                
                // Hyperbolic funnel warp
                a += sin(depth * 0.4) * 0.5;

                // B&W Op-Art Pattern (Stripes & Checkers)
                float rings = sin(depth * 3.1415);
                float spokes = sin(a * 16.0 + depth * 0.5);
                float pattern = step(0.0, rings * spokes);

                // Zeno Levels (Golden Ratio Subdivision)
                float zenoLevel = floor(log(depth) / log(1.618));
                float zenoFract = fract(log(depth) / log(1.618));

                // 4. COLOR INJECTION (Psychedelic Acid + Blacklight)
                vec3 col = vec3(pattern); // Base B&W structure
                
                // Inject acid/neon at Zeno boundaries or glitch zones
                if (zenoFract < 0.15 || glitchTrigger > 0.94 || tracking > 0.0) {
                    vec3 acid = palette(zenoLevel * 0.618 + u_time * 0.2);
                    col = mix(col, acid, 0.9);
                    // Invert pattern for retinal vibration
                    col = mix(col, 1.0 - col, step(0.0, sin(a * 32.0)));
                }

                // 5. CHROMATIC ABERRATION (RGB Split)
                float split = 0.03 + tracking * 0.08;
                float rZ = 1.0 / (length(p - vec2(split, 0.0)) + 0.001) + u_time * 3.0;
                float bZ = 1.0 / (length(p + vec2(split, 0.0)) + 0.001) + u_time * 3.0;
                
                float rPat = step(0.0, sin(rZ * 3.1415) * sin((a + split) * 16.0 + rZ * 0.5));
                float bPat = step(0.0, sin(bZ * 3.1415) * sin((a - split) * 16.0 + bZ * 0.5));

                if (r > 0.25 || glitchTrigger > 0.8) {
                    col.r = mix(col.r, rPat, 0.65);
                    col.b = mix(col.b, bPat, 0.65);
                }

                // 6. MYSPACE GLITTER / SPARKLES (Cheap Luxury)
                float spark = 0.0;
                for(float i = 0.0; i < 15.0; i++) {
                    vec2 sPos = vec2(hash(vec2(i, floor(u_time * 4.0))), hash(vec2(floor(u_time * 4.0), i))) * 2.0 - 1.0;
                    sPos.x *= u_resolution.x / u_resolution.y;
                    float blink = sin(u_time * 20.0 + i * 1.3) * 0.5 + 0.5;
                    spark += sparkle(p, sPos, 1.5 + hash(vec2(i))*2.5) * blink;
                }
                // Toxic Contrast Pairs (Hot pink / Electric Cyan)
                vec3 sparkCol = mix(vec3(1.0, 0.1, 0.8), vec3(0.0, 1.0, 0.9), hash(vec2(t_snap)));
                col += vec3(spark) * sparkCol;

                // 7. EARLY INTERNET UI DEBRIS (Popup Ghosts & BSOD)
                float uiFlash = step(0.96, hash(vec2(t_snap, 1.0)));
                if (uiFlash > 0.0) {
                    vec2 uiPos = vec2(hash(vec2(t_snap, 2.0)), hash(vec2(t_snap, 3.0))) * 0.6 + 0.2;
                    vec2 winUV = abs(uv - uiPos) * 2.0;
                    if (winUV.x < 0.45 && winUV.y < 0.3) {
                        float boxBorder = step(0.42, winUV.x) + step(0.27, winUV.y);
                        if (boxBorder > 0.0) {
                            col = vec3(0.75); // Windows 9x gray
                        } else {
                            col = vec3(0.0, 0.0, 0.6); // BSOD Blue
                            // Fake text lines
                            col += step(0.8, sin(uv.y * 250.0 + u_time)) * 0.6;
                        }
                        // Title bar
                        if (uv.y > uiPos.y + 0.1 && uv.y < uiPos.y + 0.15 && abs(uv.x - uiPos.x) < 0.21) {
                            col = vec3(0.0, 0.0, 0.4);
                        }
                    }
                }

                // 8. CRT SCANLINES & VIGNETTE
                col *= 0.9 + 0.1 * sin(uv.y * u_resolution.y * 2.5);
                col *= 1.0 - pow(r, 2.5) * 0.6;

                fragColor = vec4(col, 1.0);
            }
        `;
        
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
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
        if (material.uniforms.u_resolution) {
            material.uniforms.u_resolution.value.set(grid.width, grid.height);
        }
    }
    
    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

} catch (e) {
    console.error("WebGL Initialization Failed:", e);
}