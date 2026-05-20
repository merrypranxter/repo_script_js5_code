if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");

        // FERAL DESIGN BRAIN: Build the structural seed.
        // We render "ASTRAL TRASH" as a dense, topographical heightmap.
        // The shader will ingest this, shatter it through a Kleinian fold,
        // and crystallize it into a physical substance.
        const tcv = document.createElement('canvas');
        tcv.width = 1024;
        tcv.height = 1024;
        const tctx = tcv.getContext('2d');
        
        // Base gravity well
        const grad = tctx.createRadialGradient(512, 512, 0, 512, 512, 600);
        grad.addColorStop(0, '#444');
        grad.addColorStop(1, '#000');
        tctx.fillStyle = grad;
        tctx.fillRect(0, 0, 1024, 1024);

        // Zeno subdivision rings (mock esoterica)
        tctx.strokeStyle = '#222';
        for(let i=0; i<15; i++) {
            tctx.lineWidth = 2 + i;
            tctx.beginPath();
            tctx.arc(512, 512, 50 + i * 35, 0, Math.PI * 2);
            tctx.stroke();
        }

        tctx.textAlign = 'center';
        tctx.textBaseline = 'middle';
        tctx.font = '900 160px "Arial Black", Impact, sans-serif';

        // Topographic / Fungal text accumulation
        for(let i = 25; i > 0; i--) {
            tctx.lineWidth = i * 3;
            const v = Math.floor((1.0 - i/25) * 255);
            tctx.strokeStyle = `rgb(${v}, ${v}, ${v})`;
            tctx.strokeText("ASTRAL", 512, 400);
            tctx.strokeText("TRASH", 512, 620);
        }
        
        tctx.fillStyle = '#fff';
        tctx.fillText("ASTRAL", 512, 400);
        tctx.fillText("TRASH", 512, 620);

        // Interface debris / Ritual bureaucracy
        tctx.font = 'bold 30px monospace';
        tctx.fillStyle = '#666';
        tctx.fillText("ERR_ZENO_LIMIT // HYPERBOLIC_DECAY", 512, 200);
        tctx.fillText("STRUCTURAL_COLOR_BLEED // CMY_VOID", 512, 820);

        const textTexture = new THREE.CanvasTexture(tcv);
        textTexture.minFilter = THREE.LinearFilter;
        textTexture.magFilter = THREE.LinearFilter;
        textTexture.wrapS = THREE.RepeatWrapping;
        textTexture.wrapT = THREE.RepeatWrapping;

        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_textTex: { value: textTexture }
            },
            vertexShader: `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                in vec2 vUv;
                out vec4 fragColor;

                uniform float u_time;
                uniform vec2 u_resolution;
                uniform sampler2D u_textTex;

                // Hash & Noise for fluid mechanics
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
                    for (int i = 0; i < 4; i++) {
                        v += a * noise(p);
                        p *= 2.0;
                        a *= 0.5;
                    }
                    return v;
                }

                // The Zeno-Kleinian Engine
                float computeDensity(vec2 uv, float t_slow, float t_med) {
                    vec2 z = uv * 2.0 - 1.0;
                    z.x *= u_resolution.x / u_resolution.y;
                    
                    // Advection field
                    vec2 warp = vec2(fbm(z * 2.0 + t_med), fbm(z * 2.0 - t_med + 10.0));
                    z += warp * 0.15;
                    
                    // Sample the structural seed (text)
                    float tx = texture(u_textTex, uv + warp * 0.02).r;
                    
                    float d = 0.0;
                    float scale = 1.0;
                    
                    // Recursive spatial subdivision / folding
                    for (int i = 0; i < 6; i++) {
                        // The text density literally pulls the space apart
                        z = abs(z) - vec2(0.05 + tx * 0.15, 0.15); 
                        
                        float r2 = dot(z, z);
                        float k = clamp(1.0 / r2, 0.2, 2.5); // Spherical inversion
                        z *= k;
                        scale *= k;
                        
                        // Hyperbolic drift
                        float theta = t_slow * 0.5;
                        float c = cos(theta), s = sin(theta);
                        z = vec2(z.x * c - z.y * s, z.x * s + z.y * c);
                        
                        z -= vec2(0.3, 0.2);
                        
                        d += abs(z.x) / scale;
                    }
                    
                    return d * 0.6 + tx * 0.5;
                }

                // Convert pure math into physical substance
                float getSurface(vec2 uv, float t_slow, float t_med) {
                    float d = computeDensity(uv, t_slow, t_med);
                    // Strata ribbons (Thin-film layers)
                    return d + 0.05 * sin(d * 40.0 - t_med * 10.0);
                }

                void main() {
                    // THREE SIMULTANEOUS TIME SCALES
                    float t_slow = u_time * 0.05;  // Global drift
                    float t_med  = u_time * 0.25;  // Structural fluid motion
                    float t_fast = u_time * 3.0;   // Chromatic shimmer / Glitch

                    vec2 p = vUv;
                    
                    // Glitchcore Macroblock Breakup
                    vec2 grid = floor(p * 25.0);
                    if (hash(grid + floor(t_fast)) > 0.96) {
                        p.x += (hash(grid) - 0.5) * 0.04;
                    }

                    // Compute physical surface map
                    float d = getSurface(p, t_slow, t_med);
                    
                    // Finite differences for Normal mapping (Tactile depth)
                    float eps = 0.002;
                    float dx = getSurface(p + vec2(eps, 0.0), t_slow, t_med) - d;
                    float dy = getSurface(p + vec2(0.0, eps), t_slow, t_med) - d;
                    vec3 normal = normalize(vec3(dx, dy, 0.03)); 
                    
                    // Lighting rig: Neon CMY
                    vec3 l_cyan = normalize(vec3(-1.0, 1.0, 0.6));
                    vec3 l_mag  = normalize(vec3(1.0, 1.0, 0.4));
                    vec3 l_yel  = normalize(vec3(0.0, -1.0, 0.5));
                    
                    float diff_c = max(0.0, dot(normal, l_cyan));
                    float diff_m = max(0.0, dot(normal, l_mag));
                    float diff_y = max(0.0, dot(normal, l_yel));
                    
                    // CMY Accumulation
                    vec3 col = vec3(0.0);
                    col += vec3(0.0, 1.0, 1.0) * diff_c * pow(diff_c, 2.0);
                    col += vec3(1.0, 0.0, 1.0) * diff_m * pow(diff_m, 2.0);
                    col += vec3(1.0, 1.0, 0.0) * diff_y * pow(diff_y, 2.0);
                    
                    // Bragg Reflection / Structural Color Iridescence
                    vec3 viewDir = vec3(0.0, 0.0, 1.0);
                    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);
                    float filmPhase = d * 15.0 + fresnel * 10.0 + t_fast;
                    vec3 iridescence = 0.5 + 0.5 * cos(filmPhase + vec3(0.0, 2.0, 4.0));
                    
                    col = mix(col, iridescence * vec3(0.0, 1.0, 1.0), fresnel * 0.6);
                    
                    // Void Black Dominance & Ambient Occlusion
                    float ao = clamp(d * 1.5, 0.0, 1.0);
                    col *= ao;
                    col *= smoothstep(0.1, 0.6, d); // Eat into the void
                    
                    // Fast Shimmer / Dead Pixel Pollen
                    float grain = hash(vUv * 1000.0 + t_fast);
                    col += grain * 0.08 * vec3(0.0, 1.0, 1.0); 
                    
                    // RGB Phantom Text Bleed
                    float txR = texture(u_textTex, p + vec2(0.005 * sin(t_fast), 0.0)).r;
                    float txB = texture(u_textTex, p - vec2(0.005 * sin(t_fast), 0.0)).b;
                    vec3 textGlow = vec3(txR, 0.0, txB) * 1.5;
                    
                    // Inject text glow where structural peaks exist
                    col += textGlow * smoothstep(0.4, 1.0, d) * (0.8 + 0.2 * sin(t_fast * 2.0));

                    fragColor = vec4(col, 1.0);
                }
            `
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);
        
        canvas.__three = { renderer, scene, camera, material };
    } catch (e) {
        console.error("Feral Math Initialization Failed:", e);
        return;
    }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material && material.uniforms && material.uniforms.u_time) {
    material.uniforms.u_time.value = time;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);