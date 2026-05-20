try {
    if (!canvas.__three) {
        if (!ctx) throw new Error("WebGL 2 context not available");

        // 1. GENERATE THE TEXTURE (KINETIC TYPE / MOCK ESOTERICA)
        // We create a dense, highly symbolic 2D canvas to feed into the shader as a material map.
        const texSize = 1024;
        const textCanvas = document.createElement('canvas');
        textCanvas.width = texSize;
        textCanvas.height = texSize;
        const tctx = textCanvas.getContext('2d');

        // Void black base
        tctx.fillStyle = '#000000';
        tctx.fillRect(0, 0, texSize, texSize);

        tctx.textAlign = 'center';
        tctx.textBaseline = 'middle';

        // Mock Esoterica: Large background pyramid (dim so it becomes a subtle phantom)
        tctx.fillStyle = '#444444';
        tctx.font = '400px serif';
        tctx.fillText("⟁", texSize / 2, texSize / 2 + 50);

        // Core Text: ASTRAL TRASH
        tctx.fillStyle = '#FFFFFF';
        tctx.font = '900 160px "Courier New", monospace';
        
        // Brutalist compression (squeeze vertically)
        tctx.save();
        tctx.scale(1, 0.85);
        tctx.fillText("ASTRAL", texSize / 2, 450);
        tctx.fillText("TRASH", texSize / 2, 650);
        tctx.restore();

        // Sweet Corruption / Body Glyphs
        tctx.font = '80px sans-serif';
        tctx.fillText("💀", texSize / 2, 220); // Cute necrosis
        tctx.fillText("👁", texSize / 2, 820); // The watcher
        tctx.fillText("✧", 180, texSize / 2); // Sweet motif
        tctx.fillText("✧", 844, texSize / 2);

        // Interface Debris / Terminal Residue
        tctx.font = 'bold 20px monospace';
        tctx.textAlign = 'left';
        for (let i = 0; i < 25; i++) {
            const x = Math.random() * (texSize - 200);
            const y = Math.random() * texSize;
            tctx.fillText(Math.random() > 0.5 ? "> SYS_FAIL_0x" : "connection lost...", x, y);
        }

        const textTexture = new THREE.CanvasTexture(textCanvas);
        textTexture.wrapS = THREE.RepeatWrapping;
        textTexture.wrapT = THREE.RepeatWrapping;
        textTexture.minFilter = THREE.LinearFilter;
        textTexture.magFilter = THREE.LinearFilter;

        // 2. SETUP THREE.JS ENVIRONMENT
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        const geometry = new THREE.PlaneGeometry(2, 2);

        // 3. THE ALCHEMICAL SHADER
        // Combines Zeno Tunnel recursion, Structural Color (Thin Film), and Glitchcore RGB Phantoms.
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_tex: { value: textTexture }
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
                uniform sampler2D u_tex;

                // Hash & Noise Functions
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
                
                float fbm(vec2 p) {
                    float v = 0.0, a = 0.5;
                    for (int i = 0; i < 5; i++) { 
                        v += a * noise(p); 
                        p *= 2.0; 
                        a *= 0.5; 
                    }
                    return v;
                }

                // Structural Color: Inverted Cosine Palette for pure CMY Neon
                // Maps continuous thickness to harsh cyan/magenta/yellow bands
                vec3 cmyNeon(float t) {
                    vec3 phase = vec3(0.0, 0.333, 0.667);
                    vec3 col = 0.5 + 0.5 * cos(6.28318 * (t + phase));
                    col = 1.0 - col; // Invert RGB to get CMY
                    return smoothstep(0.2, 0.8, col); // Harsh contrast for physical plastic feel
                }

                void main() {
                    vec2 uv = vUv;
                    vec2 centeredUV = uv * 2.0 - 1.0;
                    centeredUV.x *= u_resolution.x / u_resolution.y;
                    
                    // THREE SIMULTANEOUS TIME SCALES
                    float t_slow = u_time * 0.05; // Global drift & Zeno spiral
                    float t_med = u_time * 0.5;   // Structural fluid motion
                    float t_fast = u_time * 15.0; // Detail shimmer & macroblock chew
                    
                    // --- LAYER 1: ZENO TUNNEL & THIN FILM STRUCTURE ---
                    
                    // Glitchcore Macroblock Breakup
                    float blockNoise = noise(floor(centeredUV * 12.0) + floor(t_fast * 0.5));
                    vec2 glitchUV = centeredUV;
                    if (blockNoise > 0.85) {
                        glitchUV.x += 0.03 * sin(t_fast);
                        glitchUV.y += 0.015 * cos(t_fast * 0.8);
                    }
                    
                    float r = length(glitchUV) + 0.001;
                    float a = atan(glitchUV.y, glitchUV.x);
                    
                    // Recursive Space: Zeno Logarithmic Depth (Golden Ratio 0.618)
                    float zenoLog = log(r) / log(0.618);
                    float zenoFract = fract(zenoLog + t_med);
                    float twist = a + zenoLog * 0.3 + t_slow; 
                    
                    vec2 tunnelUV = vec2(twist * 2.5, zenoFract * 3.0);
                    
                    // Thin-Film Fluid Topography
                    float filmThickness = fbm(tunnelUV * 1.5 + vec2(t_med, -t_med * 0.5));
                    float iso = abs(fract(filmThickness * 5.0) - 0.5) * 2.0;
                    float contour = smoothstep(0.2, 0.0, iso); // Sharp topographic bands
                    
                    vec3 cmy = cmyNeon(filmThickness * 2.0 + t_slow);
                    
                    // Fast Grain / Shimmer (Physical Substance)
                    float grain = fract(sin(dot(glitchUV + t_fast, vec2(12.9898, 78.233))) * 43758.5453);
                    
                    vec3 bgCol = cmy * contour * (0.5 + 0.5 * grain);
                    
                    // Void Cavity Logic: Darken tunnel center & add structural shadows
                    bgCol *= smoothstep(0.1, 0.5, r); 
                    bgCol *= smoothstep(0.3, 0.7, fbm(tunnelUV * 3.0 + t_med));
                    
                    // --- LAYER 2: KINETIC TYPE STORM & RGB PHANTOM ---
                    
                    vec2 textUV = uv;
                    
                    // Fluid Text Deformation ("Love is a fluid" concrete poetry logic)
                    vec2 textWarp = vec2(fbm(textUV * 5.0 - t_med), fbm(textUV * 5.0 + t_med)) * 0.025;
                    textUV += textWarp;
                    
                    // RGB Phantom Split (Phase-lag duplication)
                    float split = 0.008 + 0.012 * sin(t_med * 3.0) + (blockNoise > 0.9 ? 0.03 : 0.0);
                    float texR = texture(u_tex, textUV + vec2(split, 0.0)).r;
                    float texG = texture(u_tex, textUV + vec2(-split*0.5, split*0.866)).r;
                    float texB = texture(u_tex, textUV + vec2(-split*0.5, -split*0.866)).r;
                    
                    // Transduce RGB masks directly into Neon CMY
                    vec3 textCol = texR * vec3(0.0, 1.0, 1.0) + // R -> Cyan
                                   texG * vec3(1.0, 0.0, 1.0) + // G -> Magenta
                                   texB * vec3(1.0, 1.0, 0.0);  // B -> Yellow
                                   
                    // --- LAYER 3: ALCHEMICAL COMPOSITE ---
                    
                    float textCore = texR * texG * texB; // Where all channels overlap = pure white in source
                    float anyText = clamp(texR + texG + texB, 0.0, 1.0);
                    
                    // The text acts as a destructive mask on the background, 
                    // but its core burns a void black hole into the fluid.
                    vec3 finalCol = bgCol * (1.0 - anyText);
                    
                    // Add the chromatic text fringes
                    finalCol += textCol * (1.0 - textCore);
                    
                    // Edge Buzz: Compression damage static strictly on the typography edges
                    float edgeBuzz = anyText * (1.0 - textCore);
                    finalCol += edgeBuzz * grain * vec3(1.0) * 0.2;
                    
                    // Final Void Black clamping to ensure harshness
                    finalCol = max(finalCol, vec3(0.0));
                    
                    fragColor = vec4(finalCol, 1.0);
                }
            `
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        canvas.__three = { renderer, scene, camera, material };
    }

    const { renderer, scene, camera, material } = canvas.__three;

    // Update Uniforms safely
    if (material && material.uniforms) {
        if (material.uniforms.u_time) material.uniforms.u_time.value = time;
        if (material.uniforms.u_resolution) {
            material.uniforms.u_resolution.value.set(grid.width, grid.height);
        }
    }

    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

} catch (error) {
    console.error("The Alchemical Engine Failed:", error);
}