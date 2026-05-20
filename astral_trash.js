if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");

        // --- KINETIC TYPE STORM: OFFSCREEN TEXT GENERATION ---
        // We grow the text "ASTRAL TRASH" as a physical mask in an offscreen buffer.
        // It is heavily distressed to act as a topological anomaly in the shader.
        const tcvs = document.createElement('canvas');
        tcvs.width = 2048;
        tcvs.height = 512;
        const tctx = tcvs.getContext('2d');
        
        tctx.fillStyle = '#000';
        tctx.fillRect(0, 0, tcvs.width, tcvs.height);
        
        tctx.textAlign = 'center';
        tctx.textBaseline = 'middle';
        tctx.font = 'italic 900 220px "Arial Black", Impact, sans-serif';
        
        // Base text
        tctx.fillStyle = '#fff';
        tctx.fillText('ASTRAL TRASH', 1024, 256);
        
        // Bureaucratic Failure / Print Misregistration
        tctx.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 15; i++) {
            tctx.fillRect(0, 30 + i * 35, 2048, 8);
        }
        
        // Fungal succession / Machine hesitation noise
        tctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 8000; i++) {
            tctx.fillStyle = Math.random() > 0.6 ? '#fff' : '#000';
            tctx.fillRect(
                Math.random() * 2048, 
                Math.random() * 512, 
                Math.random() * 15, 
                Math.random() * 3
            );
        }

        const textTex = new THREE.CanvasTexture(tcvs);
        textTex.minFilter = THREE.LinearFilter;
        textTex.magFilter = THREE.LinearFilter;

        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_text: { value: textTex }
            },
            vertexShader: `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                in vec2 vUv;
                out vec4 fragColor;
                
                uniform float u_time;
                uniform vec2 u_resolution;
                uniform sampler2D u_text;
                
                // [KIYOSHI-ABSORBER-V1] Deterministic Frame Random
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
                }
                
                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    return mix(
                        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), 
                        f.y
                    );
                }
                
                // Warped Fourier Synthesis / Domain Warping
                float fbm(vec2 p) {
                    float v = 0.0; 
                    float a = 0.5;
                    mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
                    for(int i = 0; i < 6; i++) {
                        v += a * noise(p);
                        p = r * p * 2.0;
                        a *= 0.5;
                    }
                    return v;
                }
                
                void main() {
                    vec2 uv = vUv;
                    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
                    vec2 p = (uv - 0.5) * aspect * 6.0;
                    
                    // THREE SIMULTANEOUS TIME SCALES
                    float t_slow = u_time * 0.08;  // Global drift
                    float t_med  = u_time * 0.4;   // Structural motion / flow
                    float t_fast = u_time * 3.0;   // Detail shimmer / necrosis
                    
                    // Text UV Mapping (Aspect ratio mapping for 2048x512 texture)
                    vec2 texAspect = vec2(4.0, 1.0);
                    vec2 textUv = (uv - 0.5) * (aspect / texAspect) * 2.8 + 0.5;
                    float rawText = 0.0;
                    if(textUv.x > 0.0 && textUv.x < 1.0 && textUv.y > 0.0 && textUv.y < 1.0) {
                        rawText = texture(u_text, textUv).r;
                    }
                    
                    // [WET ENGINE PROTOCOL] Spatial Warp
                    // The text acts as a gravitational anomaly dragging the space
                    vec2 warp = vec2(fbm(p + t_slow), fbm(p - t_slow + 10.0));
                    p += normalize(p + 0.001) * rawText * sin(length(p) * 6.0 - t_med) * 0.6;
                    p += warp * 1.5;
                    
                    // [ISLAMIC TILING] Quasi-crystalline Pentagrid Fault Lines
                    float grid = 1.0;
                    float gridSum = 0.0;
                    for(int i = 0; i < 5; i++) {
                        float a = float(i) * 3.14159265 / 5.0;
                        vec2 n = vec2(cos(a), sin(a));
                        float proj = dot(p, n) + t_slow * float(i);
                        float line = abs(fract(proj) - 0.5);
                        grid = min(grid, line);
                        gridSum += line;
                    }
                    
                    // [THIN FILM IRIDESCENCE] Interference Thickness Map
                    float thickness = fbm(p * 2.5 - t_med);
                    thickness += (0.5 - grid) * 2.0; // The fluid pools in the girih grid crevices
                    
                    // [ALCHEMICAL SCRIPTURE W-100] Glitch Prophet: Abyssal cuts (log(-1) analog)
                    float abyss = log(abs(sin(gridSum * 4.0 + t_med)));
                    thickness += smoothstep(-0.5, -3.0, abyss) * 1.5;
                    
                    // [SILICON NECROSIS] High frequency shimmer and quantization
                    float grain = hash(p * 40.0 + t_fast);
                    if (hash(floor(p * 3.0) + t_med) > 0.85) {
                        thickness = floor(thickness * 10.0) / 10.0; // Bit-crushed V-buffer
                    }
                    
                    // [COLOR SYSTEMS] Iridescent Neon CMY Mapping
                    // By phase shifting an RGB cosine palette and inverting it, we get pure CMY peaks.
                    float phase = thickness * 12.0 + grain * 0.4;
                    vec3 irid = 0.5 + 0.5 * cos(phase + vec3(0.0, 2.094, 4.188));
                    vec3 cmy = vec3(1.0) - irid; // Void Black + Neon Cyan/Magenta/Yellow
                    
                    // [SHINY SYSTEMS] Material only exists where thickness pools or grid is tight
                    float matMask = smoothstep(0.3, 0.7, thickness) + smoothstep(0.15, 0.0, grid);
                    matMask = clamp(matMask, 0.0, 1.0);
                    
                    // Caustic glint
                    float shine = smoothstep(0.92, 1.0, sin(thickness * 25.0 + t_fast));
                    
                    vec3 color = cmy * matMask;
                    color += vec3(1.0) * shine * matMask;
                    
                    // [KINETIC TYPE STORM] Text Processing
                    // The text is an absence (void) that hallucinates raw CMY at its edges
                    vec2 glitchUv = textUv + warp * 0.04 * sin(t_fast);
                    float textVal = 0.0;
                    if(glitchUv.x > 0.0 && glitchUv.x < 1.0 && glitchUv.y > 0.0 && glitchUv.y < 1.0) {
                        textVal = texture(u_text, glitchUv).r;
                    }
                    
                    float textEdge = smoothstep(0.01, 0.3, textVal) - smoothstep(0.5, 0.9, textVal);
                    
                    if (textVal > 0.1) {
                        // Inside the text: Void black with raw glitching horizontal scanlines
                        float scan = step(0.85, hash(vec2(floor(uv.y * 150.0), t_fast)));
                        color = mix(color, cmy * scan * 2.5, textVal * 0.9);
                    }
                    
                    // Edge of text burns with extreme neon interference
                    color += cmy * textEdge * 4.0;
                    
                    // Deep vignette to emphasize the void
                    float vig = length(uv - 0.5) * 2.0;
                    color *= exp(-vig * 1.5) * 1.5;
                    
                    fragColor = vec4(color, 1.0);
                }
            `
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);
        
        canvas.__three = { renderer, scene, camera, material, textTex };
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