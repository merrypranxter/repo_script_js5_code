function render(ctx, grid, time, repos, input, mouse, canvas, THREE) {
    // 1. ASTRAL TRASH TEXTURE GENERATION (Run Once)
    // We create an offscreen canvas to act as a complex heightmap/SDF for the shader.
    // This embodies the "Kinetic Type Storm" ethos: text as a physical gravity well.
    if (!canvas.__textTex) {
        const tCanvas = document.createElement('canvas');
        tCanvas.width = 1024;
        tCanvas.height = 1024;
        const tCtx = tCanvas.getContext('2d');
        
        // Void black base
        tCtx.fillStyle = '#000000';
        tCtx.fillRect(0, 0, 1024, 1024);
        
        // Decorative "Astral Trash" Typography
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        tCtx.font = '900 160px "Arial Black", Impact, sans-serif';
        
        // Draw multiple layers with blur to create a continuous distance field (SDF-like)
        tCtx.shadowColor = '#ffffff';
        tCtx.fillStyle = '#ffffff';
        
        // Layer 1: Wide, soft structural base (Global gravity well)
        tCtx.shadowBlur = 100;
        tCtx.fillText('ASTRAL', 512, 400);
        tCtx.fillText('TRASH', 512, 560);
        
        // Layer 2: Medium structure
        tCtx.shadowBlur = 30;
        tCtx.fillText('ASTRAL', 512, 400);
        tCtx.fillText('TRASH', 512, 560);
        
        // Layer 3: Hard core (The physical type)
        tCtx.shadowBlur = 0;
        tCtx.fillText('ASTRAL', 512, 400);
        tCtx.fillText('TRASH', 512, 560);
        
        // Add geometric "trash" / celestial mechanics debris to the heightmap
        for (let i = 0; i < 200; i++) {
            tCtx.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`;
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const w = Math.random() * 100 + 10;
            const h = Math.random() * 5 + 1;
            tCtx.save();
            tCtx.translate(x, y);
            tCtx.rotate(Math.random() * Math.PI * 2);
            tCtx.fillRect(-w/2, -h/2, w, h);
            tCtx.restore();
        }

        const texture = new THREE.CanvasTexture(tCanvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        canvas.__textTex = texture;
    }

    // 2. WEBGL2 INITIALIZATION
    if (!canvas.__three) {
        try {
            if (!ctx) throw new Error("WebGL2 context required");
            
            const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap for performance due to heavy math
            
            const scene = new THREE.Scene();
            const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
            camera.position.z = 1;

            const vertexShader = `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `;

            const fragmentShader = `
                precision highp float;

                in vec2 vUv;
                out vec4 fragColor;

                uniform float u_time;
                uniform vec2 u_resolution;
                uniform sampler2D u_textTex;

                #define PI 3.14159265359
                #define PHI 1.61803398875

                // FAST SHIMMER: High-frequency spatial hash
                vec2 hash22(vec2 p) {
                    p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
                    return -1.0 + 2.0 * fract(sin(p)*43758.5453123);
                }

                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    vec2 u = f*f*(3.0-2.0*f);
                    return mix(mix(dot(hash22(i+vec2(0.0,0.0)), f-vec2(0.0,0.0)),
                                   dot(hash22(i+vec2(1.0,0.0)), f-vec2(1.0,0.0)), u.x),
                               mix(dot(hash22(i+vec2(0.0,1.0)), f-vec2(0.0,1.0)),
                                   dot(hash22(i+vec2(1.0,1.0)), f-vec2(1.0,1.0)), u.x), u.y);
                }

                // SLOW DRIFT: Fractional Brownian Motion for physical substance
                float fbm(vec2 p) {
                    float f = 0.0;
                    float a = 0.5;
                    for(int i=0; i<5; i++) {
                        f += a * noise(p);
                        p *= 2.0;
                        a *= 0.5;
                    }
                    return f;
                }

                // MEDIUM STRUCTURE: Islamic Tiling (Girih Pentagrid)
                float pgDist(vec2 p, int k, float sp) {
                    float a = float(k) * PI / 5.0;
                    float g = float(k + 1) / 10.0;
                    vec2 n = vec2(cos(a), sin(a));
                    return abs(fract(dot(p, n) / sp + g + 0.5) - 0.5) * sp;
                }

                void main() {
                    // Aspect ratio correction for the procedural math
                    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
                    vec2 uv = (vUv - 0.5) * aspect;
                    
                    // 1. SLOW GLOBAL DRIFT (Domain Warping)
                    vec2 warp = vec2(
                        fbm(uv * 2.0 + u_time * 0.05),
                        fbm(uv * 2.0 - u_time * 0.04 + 100.0)
                    );
                    vec2 wUv = uv + warp * 0.2;

                    // 2. TEXT HEIGHTMAP (Gravity Well)
                    // The text acts as a physical displacement map in the simulation
                    vec2 textUV = vUv + warp * 0.05; 
                    float textH = texture(u_textTex, textUV).r;
                    
                    // 3. DIGITAL GLITCH / BUREAUCRATIC FAILURE
                    // Reality pixelates around high-stress areas (text edges)
                    float glitchStress = fbm(vec2(vUv.y * 15.0, u_time * 0.2));
                    if (glitchStress > 0.65 && textH > 0.1 && textH < 0.9) {
                        wUv = floor(wUv * 60.0) / 60.0; // Quantize space
                    }

                    // 4. MEDIUM STRUCTURE (Quasicrystal Lattice)
                    // Two-level hierarchical girih (Darb-i Imam logic)
                    float coarse = 1e9;
                    float fine = 1e9;
                    
                    // Rotate the lattice slowly
                    float c = cos(u_time * 0.02);
                    float s = sin(u_time * 0.02);
                    mat2 rMat = mat2(c, -s, s, c);
                    vec2 gUv = rMat * wUv * 5.0;

                    for(int i=0; i<5; i++) {
                        coarse = min(coarse, pgDist(gUv, i, 1.0));
                        fine = min(fine, pgDist(gUv, i, 1.0 / (PHI * PHI)));
                    }

                    float coarseLine = smoothstep(0.04, 0.0, coarse);
                    float fineLine = smoothstep(0.02, 0.0, fine);

                    // 5. THIN FILM IRIDESCENCE (Interference based on thickness)
                    // Thickness is the sum of domain warp, text height, and lattice tension
                    float thickness = fbm(wUv * 4.0) * 0.5 + 0.5;
                    thickness += textH * 1.5; 
                    thickness -= coarseLine * 0.1;
                    thickness += fineLine * 0.05;

                    // Quantize thickness in glitch zones to create topographical bands
                    if (glitchStress > 0.7) {
                        thickness = floor(thickness * 12.0) / 12.0;
                    }

                    // 6. COLOR SYSTEMS (Neon CMY constrained to Void Black)
                    // Phase-shifted sine waves create structural color bands
                    float phase = thickness * 20.0 - u_time * 0.5;
                    
                    // Sharp, high-contrast bands
                    float cBand = pow(sin(phase) * 0.5 + 0.5, 4.0);
                    float mBand = pow(sin(phase + 2.094) * 0.5 + 0.5, 4.0); // +120 deg
                    float yBand = pow(sin(phase + 4.188) * 0.5 + 0.5, 4.0); // +240 deg

                    vec3 color = vec3(0.02, 0.01, 0.03); // Void black base

                    // Additive CMY Interference
                    float intensity = 0.5 + textH * 2.0; // Text glows intensely
                    color += vec3(0.0, 1.0, 1.0) * cBand * intensity;
                    color += vec3(1.0, 0.0, 1.0) * mBand * intensity;
                    color += vec3(1.0, 1.0, 0.0) * yBand * intensity;

                    // Inject the Quasicrystal Lattice directly as physical wireframes
                    color += vec3(0.0, 1.0, 1.0) * coarseLine * (1.0 + textH);
                    color += vec3(1.0, 0.0, 1.0) * fineLine * (0.5 + textH);

                    // 7. FAST SHIMMER (Quantum noise / Dead Pixels)
                    float grain = fract(sin(dot(gl_FragCoord.xy + u_time * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
                    
                    // Texture material grain
                    color *= 0.85 + 0.3 * grain;

                    // Astral Trash / Dead Pixels behaving like pollen
                    if (grain > 0.996) color = vec3(1.0, 1.0, 0.0); // Sparks of Yellow
                    if (grain < 0.004) color = vec3(0.0, 1.0, 1.0); // Sparks of Cyan
                    if (abs(grain - 0.5) < 0.002) color = vec3(1.0, 0.0, 1.0); // Sparks of Magenta

                    // Vignette to emphasize the void
                    float vig = length(uv);
                    color *= smoothstep(1.5, 0.2, vig);

                    fragColor = vec4(color, 1.0);
                }
            `;

            const material = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                uniforms: {
                    u_time: { value: 0 },
                    u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                    u_textTex: { value: canvas.__textTex }
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

    // 3. RENDER LOOP EXECUTION
    const { renderer, scene, camera, material } = canvas.__three;
    
    if (material && material.uniforms) {
        material.uniforms.u_time.value = time;
        material.uniforms.u_resolution.value.set(grid.width, grid.height);
        
        // Ensure texture is bound in case of context loss/restore
        if (!material.uniforms.u_textTex.value && canvas.__textTex) {
            material.uniforms.u_textTex.value = canvas.__textTex;
        }
    }

    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);
}