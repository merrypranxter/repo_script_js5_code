if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");

        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Create the "ASTRAL TRASH" text texture via Canvas 2D
        const textCanvas = document.createElement('canvas');
        textCanvas.width = 2048;
        textCanvas.height = 2048;
        const tCtx = textCanvas.getContext('2d');
        
        // Background black
        tCtx.fillStyle = '#000000';
        tCtx.fillRect(0, 0, 2048, 2048);
        
        // Typography Physics & Concrete Poetry
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        
        // Main Text
        tCtx.fillStyle = '#FFFFFF';
        tCtx.font = '900 320px "Arial Black", Impact, sans-serif';
        // Simulating typographic drag and compression chew
        tCtx.fillText('ASTRAL', 1024, 800);
        tCtx.fillText('TRASH', 1024, 1200);

        // Terminal Residue / Text Debris (glitchcore)
        tCtx.font = 'bold 40px Courier New, monospace';
        tCtx.fillStyle = '#888888';
        tCtx.fillText('// KINETIC_TYPE_STORM :: PARTICLE_SYSTEM_ACTIVE', 1024, 1450);
        tCtx.fillText('// STRUCTURAL_COLOR :: THIN_FILM_INTERFERENCE', 1024, 1520);
        tCtx.fillText('// ZENO_TUNNEL :: INFINITE_DESCENT_RATIO_0.618', 1024, 1590);
        
        // Decorative tracking marks
        tCtx.font = '20px monospace';
        for(let i=0; i<20; i++) {
            tCtx.fillText(`[0x${(Math.random()*0xFFFF)|0}] SIGNAL_DENSITY: OVERLOADED`, 300, 100 + i*90);
            tCtx.fillText(`ERR_CODE_${i}: PALETTE_RUPTURE`, 1748, 100 + i*90);
        }

        const textTexture = new THREE.CanvasTexture(textCanvas);
        textTexture.minFilter = THREE.LinearMipMapLinearFilter;
        textTexture.magFilter = THREE.LinearFilter;
        textTexture.generateMipmaps = true;

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

                // Fast hash function
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
                }

                // 2D Noise
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

                // Fractional Brownian Motion (Organic fungal/mycelial growth)
                float fbm(vec2 p) {
                    float v = 0.0;
                    float a = 0.5;
                    mat2 rot = mat2(0.866, -0.5, 0.5, 0.866);
                    for (int i = 0; i < 5; i++) {
                        v += a * noise(p);
                        p = rot * p * 2.0;
                        a *= 0.5;
                    }
                    return v;
                }

                // Kleinian Group / Hyperbolic spatial folding
                vec2 fold(vec2 p) {
                    float r2 = dot(p, p);
                    return p / (r2 + 0.1); 
                }

                // The Material Heightmap
                float map(vec2 p, float t_slow, float t_med) {
                    // Base domain warping
                    vec2 warp = vec2(fbm(p * 2.0 + t_slow), fbm(p * 2.0 - t_slow + 10.0));
                    vec2 pw = mix(p, fold(p), 0.15) + warp * 0.3;

                    // Zeno Tunnel - Infinite subdivision ridges
                    float logBase = log(1.0 / 0.618); // Golden ratio descent
                    float logDepth = log(length(pw) + 0.001) / logBase;
                    float zeno = fract(logDepth - t_med);
                    zeno = smoothstep(0.0, 0.1, zeno) * smoothstep(1.0, 0.8, zeno);

                    // Text sampling with glitch offset (Pastel Identity Smear)
                    vec2 texUv = vUv;
                    // Apply compression chew / macroblock breakup to the text UVs
                    vec2 blockUv = floor(texUv * 50.0) / 50.0;
                    float glitch = step(0.95, hash(blockUv + floor(u_time * 8.0))) * 0.05;
                    
                    float textMask = texture(u_textTex, texUv + warp * 0.02 + vec2(glitch, 0.0)).r;

                    // Combine structural elements into a physical substance thickness
                    float h = fbm(pw * 5.0 + t_med * 0.5);
                    h += zeno * 0.4;
                    h += textMask * 1.5; // Text acts as thick raised material
                    
                    return h;
                }

                // Compute normal from heightmap (Structural Color Physics)
                vec3 calcNormal(vec2 p, float t_slow, float t_med) {
                    vec2 e = vec2(0.002, 0.0);
                    float h = map(p, t_slow, t_med);
                    vec3 n = normalize(vec3(
                        map(p + e.xy, t_slow, t_med) - map(p - e.xy, t_slow, t_med),
                        map(p + e.yx, t_slow, t_med) - map(p - e.yx, t_slow, t_med),
                        0.05 // depth scale
                    ));
                    return n;
                }

                void main() {
                    // Coordinates
                    vec2 uv = vUv * 2.0 - 1.0;
                    uv.x *= u_resolution.x / u_resolution.y;

                    // Three simultaneous time scales
                    float t_slow = u_time * 0.15;
                    float t_med  = u_time * 0.8;
                    float t_fast = u_time * 4.0;

                    // Compute material structure
                    float h = map(uv, t_slow, t_med);
                    vec3 n = calcNormal(uv, t_slow, t_med);
                    vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));

                    // Thin-film interference (Structural Color)
                    float cosTheta = max(0.0, dot(n, viewDir));
                    float thickness = h * 800.0; // Assume 800nm max thickness
                    float n_film = 1.56; // Chitin / Polymer refractive index
                    
                    // Optical path difference
                    float pathDiff = 2.0 * n_film * thickness * sqrt(1.0 - pow(sin(acos(cosTheta))/n_film, 2.0));
                    
                    // Map interference to Neon CMY palette (Hyperpop Rupture)
                    float phase = pathDiff * 0.005 + t_fast * 0.2;
                    
                    vec3 cmy = vec3(0.0);
                    // Electric Cyan
                    cmy = mix(cmy, vec3(0.0, 1.0, 1.0), smoothstep(0.3, 1.0, sin(phase)));
                    // Hot Magenta
                    cmy = mix(cmy, vec3(1.0, 0.0, 1.0), smoothstep(0.3, 1.0, sin(phase + 2.094)));
                    // Acid Yellow
                    cmy = mix(cmy, vec3(1.0, 1.0, 0.0), smoothstep(0.3, 1.0, sin(phase + 4.188)));

                    // Void Black Contrast
                    // Force deep shadows where material is thin or normal faces away
                    float shadow = smoothstep(0.2, 0.8, cosTheta * (h * 0.5 + 0.5));
                    vec3 color = cmy * shadow;

                    // Glitchcore Edge Buzz & Chromatic Aberration on Text
                    vec2 texUv = vUv;
                    float textR = texture(u_textTex, texUv + vec2(0.005, 0.0)).r;
                    float textB = texture(u_textTex, texUv - vec2(0.005, 0.0)).r;
                    float textEdge = abs(textR - textB);
                    
                    if (textEdge > 0.0) {
                        float buzz = step(0.5, sin(uv.y * 100.0 + t_fast * 5.0));
                        color = mix(color, vec3(1.0, 1.0, 1.0), textEdge * buzz);
                    }

                    // Fast detail shimmer / Signal Density Grain
                    float grain = hash(uv + t_fast) * 0.15;
                    color += grain * cmy;

                    // Final void black crush
                    float lum = dot(color, vec3(0.299, 0.587, 0.114));
                    color = mix(vec3(0.01, 0.0, 0.02), color, smoothstep(0.15, 0.3, lum));

                    fragColor = vec4(color, 1.0);
                }
            `
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);

        canvas.__three = { renderer, scene, camera, material, textTexture };
    } catch (e) {
        console.error("WebGL Initialization Failed:", e);
        return;
    }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material && material.uniforms && material.uniforms.u_time) {
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);