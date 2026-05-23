try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    // Initialize Three.js environment if it doesn't exist
    if (!canvas.__three) {
        // --- 1. Generate the Magnetic Potential Texture (Sacred Typography) ---
        const tCanvas = document.createElement('canvas');
        tCanvas.width = 2048;
        tCanvas.height = 1024;
        const tCtx = tCanvas.getContext('2d');

        // Void black base
        tCtx.fillStyle = '#000';
        tCtx.fillRect(0, 0, 2048, 1024);

        // Background magnetic noise (subtle field variance)
        for (let i = 0; i < 800; i++) {
            tCtx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.08})`;
            tCtx.beginPath();
            tCtx.arc(Math.random() * 2048, Math.random() * 1024, Math.random() * 60, 0, Math.PI * 2);
            tCtx.fill();
        }

        // Sacred Geometry / Metatron's Cube connections
        tCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        tCtx.lineWidth = 3;
        const cx = 1024, cy = 512, R = 350;
        const pts = [];
        for (let i = 0; i < 6; i++) {
            pts.push([cx + R * Math.cos(i * Math.PI / 3), cy + R * Math.sin(i * Math.PI / 3)]);
        }
        for (let i = 0; i < 6; i++) {
            for (let j = i + 1; j < 6; j++) {
                tCtx.beginPath();
                tCtx.moveTo(pts[i][0], pts[i][1]);
                tCtx.lineTo(pts[j][0], pts[j][1]);
                tCtx.stroke();
            }
        }

        // Concentric Cymatic Rings
        tCtx.lineWidth = 6;
        for (let i = 1; i <= 5; i++) {
            tCtx.beginPath();
            tCtx.arc(cx, cy, i * 70, 0, Math.PI * 2);
            tCtx.stroke();
        }

        // Decorative Typography: ASTRAL TRASH
        tCtx.fillStyle = '#FFF';
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        tCtx.font = '900 220px "Arial Black", Impact, sans-serif';
        tCtx.shadowColor = '#FFF';
        tCtx.shadowBlur = 40;
        
        // Ghosted under-layers (Kinetic Type Memory)
        tCtx.globalAlpha = 0.4;
        tCtx.fillText('ASTRAL', 1024, 350);
        tCtx.fillText('TRASH', 1024, 690);
        
        tCtx.globalAlpha = 1.0;
        tCtx.fillText('ASTRAL', 1024, 380);
        tCtx.fillText('TRASH', 1024, 660);

        const textTexture = new THREE.CanvasTexture(tCanvas);
        textTexture.minFilter = THREE.LinearFilter;
        textTexture.magFilter = THREE.LinearFilter;

        // --- 2. Setup WebGL ---
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        // --- 3. The Alchemical Shader Material ---
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

                #define PI 3.14159265359

                // Hash & Noise Functions
                vec2 hash22(vec2 p) {
                    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
                }

                float noise(vec2 st) {
                    vec2 i = floor(st);
                    vec2 f = fract(st);
                    vec2 u = f * f * (3.0 - 2.0 * f);
                    return mix( mix( dot( hash22(i + vec2(0.0,0.0)) * 2.0 - 1.0, f - vec2(0.0,0.0) ),
                                     dot( hash22(i + vec2(1.0,0.0)) * 2.0 - 1.0, f - vec2(1.0,0.0) ), u.x),
                                mix( dot( hash22(i + vec2(0.0,1.0)) * 2.0 - 1.0, f - vec2(0.0,1.0) ),
                                     dot( hash22(i + vec2(1.0,1.0)) * 2.0 - 1.0, f - vec2(1.0,1.0) ), u.x), u.y);
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

                // Voronoi for Ferrofluid Spikes (Rosensweig Instability)
                float voronoi(vec2 x, float t) {
                    vec2 n = floor(x);
                    vec2 f = fract(x);
                    float m = 8.0;
                    for(int j = -1; j <= 1; j++) {
                        for(int i = -1; i <= 1; i++) {
                            vec2 g = vec2(float(i), float(j));
                            vec2 o = hash22(n + g);
                            // Fast shimmer oscillation
                            o = 0.5 + 0.5 * sin(t + 6.2831 * o); 
                            vec2 r = g - f + o;
                            float d = dot(r, r);
                            m = min(m, d);
                        }
                    }
                    return m;
                }

                // Magnetic Field Sample with Shoegaze Chromatic Aberration
                float getMagneticField(vec2 uv, float t_med) {
                    vec2 offset = vec2(0.008 * sin(t_med), 0.008 * cos(t_med));
                    float r = texture(u_textTex, uv + offset).r;
                    float g = texture(u_textTex, uv).r;
                    float b = texture(u_textTex, uv - offset).r;
                    return (r + g + b) / 3.0;
                }

                // Global Height Map (The Physical Material)
                float map(vec2 uv, float t_slow, float t_med, float t_fast) {
                    vec2 p = uv * 2.0 - 1.0;
                    p.x *= u_resolution.x / u_resolution.y;
                    
                    // Fluid Domain Warp
                    vec2 warp = p + vec2(fbm(p * 2.0 + t_slow), fbm(p * 2.0 - t_slow)) * 0.3;
                    
                    // Magnetic Potential from Text
                    float M = getMagneticField(uv, t_med);
                    
                    // Ferrofluid Spikes: Density increases with magnetic strength
                    float v = 1.0 - voronoi(warp * (12.0 + M * 10.0), t_fast); 
                    float spikes = pow(v, 2.5) * M;
                    
                    // Cymatic Standing Waves (Bessel-like approximation)
                    float rad = length(warp);
                    float cymatics = sin(rad * 40.0 - t_med * 5.0) * 0.5 + 0.5;
                    cymatics *= exp(-rad * 2.5); // Decay from center
                    
                    // Base fluid viscosity
                    float fluid = fbm(warp * 4.0) * 0.2;
                    
                    return fluid + spikes * 1.5 + cymatics * 0.25 * M;
                }

                // Compute Normals via Finite Difference
                vec3 calcNormal(vec2 uv, float t_slow, float t_med, float t_fast) {
                    vec2 e = vec2(0.002, 0.0);
                    float h  = map(uv, t_slow, t_med, t_fast);
                    float hx = map(uv + e.xy, t_slow, t_med, t_fast);
                    float hy = map(uv + e.yx, t_slow, t_med, t_fast);
                    return normalize(vec3(hx - h, hy - h, 0.025)); 
                }

                void main() {
                    vec2 uv = vUv;
                    vec2 p = uv * 2.0 - 1.0;
                    p.x *= u_resolution.x / u_resolution.y;

                    // Three Time Scales
                    float t_slow = u_time * 0.15;  // Geological drift
                    float t_med  = u_time * 0.6;   // Structural breathing
                    float t_fast = u_time * 3.5;   // Micro-event shimmer

                    // Compute Surface Geometry
                    vec3 n = calcNormal(uv, t_slow, t_med, t_fast);
                    float h = map(uv, t_slow, t_med, t_fast);
                    float M = getMagneticField(uv, t_med);

                    // Light Sources (Neon CMY)
                    vec3 l1 = normalize(vec3(sin(t_med), cos(t_med), 0.8));        // Cyan roaming
                    vec3 l2 = normalize(vec3(-sin(t_slow), -cos(t_slow), 0.6));    // Magenta roaming
                    vec3 l3 = normalize(vec3(0.0, 0.0, 1.0));                      // Yellow overhead

                    // View Vector
                    vec3 vDir = vec3(0.0, 0.0, 1.0);

                    // Diffuse Lighting
                    float d1 = max(0.0, dot(n, l1));
                    float d2 = max(0.0, dot(n, l2));
                    float d3 = max(0.0, dot(n, l3));

                    // Specular Lighting (Wet Black Liquid)
                    vec3 h1 = normalize(l1 + vDir);
                    float s1 = pow(max(0.0, dot(n, h1)), 64.0);
                    vec3 h2 = normalize(l2 + vDir);
                    float s2 = pow(max(0.0, dot(n, h2)), 64.0);

                    // Color Palette
                    vec3 c_cyan = vec3(0.0, 1.0, 0.9);
                    vec3 c_mag  = vec3(1.0, 0.0, 0.8);
                    vec3 c_yel  = vec3(1.0, 0.9, 0.0);
                    vec3 c_void = vec3(0.03, 0.01, 0.04);

                    // Base Void Composition
                    vec3 col = c_void;
                    
                    // Additive Lighting
                    col += c_cyan * d1 * 0.7 + c_cyan * s1 * 1.5;
                    col += c_mag  * d2 * 0.7 + c_mag  * s2 * 1.5;
                    col += c_yel  * d3 * 0.4 * h; // Yellow pools in the heights

                    // Oil-Slick Iridescence (Shoegaze Interference)
                    float fresnel = pow(1.0 - max(0.0, dot(n, vDir)), 4.0);
                    vec3 iridescence = 0.5 + 0.5 * cos(t_med + fresnel * 15.0 + vec3(0.0, 2.0, 4.0));
                    col += iridescence * fresnel * 0.9 * M;

                    // Moiré Shimmer / Phase Drift
                    float moire1 = sin(p.x * 200.0 + p.y * 100.0 + t_fast);
                    float moire2 = sin(p.x * 195.0 + p.y * 105.0 - t_fast);
                    float moire = smoothstep(0.0, 1.0, moire1 * moire2);
                    col += c_yel * moire * 0.2 * M;

                    // Shoegaze Halation / Bloom
                    float lum = dot(col, vec3(0.299, 0.587, 0.114));
                    col += c_mag * smoothstep(0.5, 1.0, lum) * 0.6;

                    // Text Ghost Emission
                    col += c_cyan * M * 0.15;

                    // Film Grain Clumps (Tactile Noise)
                    float grain = hash22(uv * u_resolution + t_fast).x;
                    col += (grain - 0.5) * 0.15;

                    // Gentle Vignette
                    float vig = length(uv - 0.5) * 2.0;
                    col *= 1.0 - pow(vig, 3.0) * 0.5;

                    fragColor = vec4(col, 1.0);
                }
            `
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);

        canvas.__three = { renderer, scene, camera, material, textTexture };
    }

    // Render loop update
    const { renderer, scene, camera, material } = canvas.__three;

    if (material && material.uniforms) {
        material.uniforms.u_time.value = time;
        material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }

    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

} catch (err) {
    console.error("Alchemical rendering failed:", err);
}