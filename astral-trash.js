function render(ctx, grid, time, repos, input, mouse, canvas, THREE) {
    if (!canvas.__three) {
        try {
            if (!ctx) throw new Error("WebGL 2 context not available");

            // --- 1. PREPARE THE "DECORATIVE" TEXT MASK (KINETIC TYPE STORM / PSYCHEDELIC COLLAGE) ---
            // We draw the text to an offscreen canvas to use as a texture mask in the shader.
            // This allows us to apply "xerox degradation" and "sacred geometry" organically.
            const tSize = 1024;
            const textCanvas = document.createElement('canvas');
            textCanvas.width = tSize;
            textCanvas.height = tSize;
            const tCtx = textCanvas.getContext('2d');

            tCtx.fillStyle = '#000000';
            tCtx.fillRect(0, 0, tSize, tSize);

            // Sacred Geometry Underlay (Origami Creases / Occult Mandala)
            tCtx.strokeStyle = '#333333';
            tCtx.lineWidth = 4;
            for (let i = 1; i <= 8; i++) {
                tCtx.beginPath();
                tCtx.arc(tSize / 2, tSize / 2, i * 60, 0, Math.PI * 2);
                tCtx.stroke();
                tCtx.beginPath();
                tCtx.moveTo(tSize / 2 + Math.cos(i * Math.PI / 4) * 500, tSize / 2 + Math.sin(i * Math.PI / 4) * 500);
                tCtx.lineTo(tSize / 2 - Math.cos(i * Math.PI / 4) * 500, tSize / 2 - Math.sin(i * Math.PI / 4) * 500);
                tCtx.stroke();
            }

            // Typography: ASTRAL TRASH
            tCtx.font = 'bold 150px "Courier New", Courier, monospace';
            tCtx.textAlign = 'center';
            tCtx.textBaseline = 'middle';

            // Xerox degradation / Print Misregistration effect
            for (let i = 0; i < 8; i++) {
                tCtx.globalAlpha = 0.15 + (i * 0.05);
                const ox = (Math.random() - 0.5) * 15;
                const oy = (Math.random() - 0.5) * 15;
                tCtx.fillStyle = '#FFFFFF';
                tCtx.fillText("ASTRAL", tSize / 2 + ox, tSize / 2 - 80 + oy);
                tCtx.fillText("TRASH", tSize / 2 + ox, tSize / 2 + 80 + oy);
            }
            // Core crisp text
            tCtx.globalAlpha = 1.0;
            tCtx.fillText("ASTRAL", tSize / 2, tSize / 2 - 80);
            tCtx.fillText("TRASH", tSize / 2, tSize / 2 + 80);

            const textTexture = new THREE.CanvasTexture(textCanvas);
            textTexture.minFilter = THREE.LinearFilter;
            textTexture.magFilter = THREE.LinearFilter;

            // --- 2. INITIALIZE THREE.JS ---
            const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            const scene = new THREE.Scene();
            const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

            // --- 3. THE ALCHEMICAL SHADER (FERROFLUID + SHINY + PSYCHEDELIC COLLAGE) ---
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
                uniform vec2 u_resolution;
                uniform sampler2D u_textMap;

                // --- HASH & NOISE (The Nature of Code) ---
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
                }

                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    vec2 u = f * f * (3.0 - 2.0 * f);
                    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
                }

                // Fractal Brownian Motion
                float fbm(vec2 p) {
                    float v = 0.0;
                    float a = 0.5;
                    for (int i = 0; i < 5; i++) {
                        v += a * noise(p);
                        p *= 2.0;
                        a *= 0.5;
                    }
                    return v;
                }

                // Rosensweig / Crumple Ridge (Ferrofluid Dance / Origami Creases)
                float ridge(vec2 p) {
                    float n = fbm(p);
                    return 1.0 - abs(n * 2.0 - 1.0);
                }

                void main() {
                    // --- TIME SCALES (The Temporal Mechanism) ---
                    float t_slow = u_time * 0.15;   // Global drift & tectonic shift
                    float t_med  = u_time * 0.8;    // Structural fluid motion
                    float t_fast = u_time * 12.0;   // Quantum dust & electronic shimmer

                    vec2 uv = vUv;
                    
                    // Aspect ratio correction for text mapping
                    vec2 textUv = uv;
                    float aspect = u_resolution.x / u_resolution.y;
                    if (aspect > 1.0) {
                        textUv.x = (textUv.x - 0.5) * aspect + 0.5;
                    } else {
                        textUv.y = (textUv.y - 0.5) / aspect + 0.5;
                    }

                    // --- SLOW: DOMAIN WARPING (Ink Bleed / Labyrinthine Ferrofluid) ---
                    vec2 warpField;
                    warpField.x = fbm(uv * 3.0 + t_slow);
                    warpField.y = fbm(uv * 3.0 - t_slow + 42.0);
                    vec2 warpedUv = textUv + (warpField - 0.5) * 0.15;

                    // --- MEDIUM: STRUCTURAL MOTION (Shiny Veins / Origami Moiré) ---
                    // Creates physical depth and "kintsugi" fault lines
                    float structuralRidge = pow(ridge(warpedUv * 8.0 - t_med * 0.2), 3.0);
                    float fluidFlow = sin(warpedUv.x * 20.0 + t_med) * cos(warpedUv.y * 20.0 - t_med);
                    float caustic = smoothstep(0.0, 0.8, fluidFlow * ridge(warpedUv * 15.0 + t_med));

                    // --- FAST: SHIMMER & ABERRATION (Psychedelic Glitch / Halftone) ---
                    // The text acts as a magnetic attractor, pulling the CMY colors apart
                    float aberrationSpread = 0.01 + 0.04 * structuralRidge;
                    
                    // Chromatic separation sampling (Acid Vibration Palette)
                    float txtC = texture(u_textMap, warpedUv + vec2(aberrationSpread, 0.0)).r;
                    float txtM = texture(u_textMap, warpedUv + vec2(-aberrationSpread, aberrationSpread)).r;
                    float txtY = texture(u_textMap, warpedUv + vec2(0.0, -aberrationSpread)).r;
                    float txtBase = texture(u_textMap, warpedUv).r;

                    // --- MATERIAL LITHOGENESIS (Color Computation) ---
                    // 1. The Void (Base substance: oily, deep, dark)
                    vec3 col = vec3(0.01, 0.02, 0.03);
                    
                    // 2. Subsurface Buried Shine (Ferrofluid pools)
                    col = mix(col, vec3(0.0, 0.2, 0.3), caustic * 0.4);
                    col += vec3(0.3, 0.0, 0.2) * structuralRidge * 0.3;

                    // 3. Neon Acid Injection (The Text)
                    vec3 neonCyan    = vec3(0.00, 1.00, 0.94);
                    vec3 neonMagenta = vec3(1.00, 0.00, 0.80);
                    vec3 neonYellow  = vec3(1.00, 0.90, 0.00);

                    // The text literally bleeds its CMY channels into the fluid structures
                    col += neonCyan * txtC * (0.4 + 0.6 * fluidFlow);
                    col += neonMagenta * txtM * (0.4 + 0.6 * structuralRidge);
                    col += neonYellow * txtY * (0.4 + 0.6 * fbm(warpedUv * 25.0 + t_fast * 0.05));

                    // 4. Quantum Dust / Print Artifacts (Fast Shimmer)
                    float dust = fract(sin(dot(uv + t_fast, vec2(12.9898, 78.233))) * 43758.5453);
                    
                    // Edge detection on the text to concentrate the dust (Glitter Ecology)
                    float textEdge = abs((txtC + txtM + txtY) / 3.0 - txtBase);
                    float edgeGlow = smoothstep(0.05, 0.3, textEdge);
                    col += neonYellow * dust * edgeGlow * 1.5;

                    // 5. Halftone Screen Overlay (Psychedelic Collage)
                    vec2 grid = fract(uv * u_resolution.xy * 0.4) - 0.5;
                    float luma = dot(col, vec3(0.299, 0.587, 0.114));
                    float dotRadius = 0.5 * sqrt(1.0 - luma);
                    float halftone = smoothstep(dotRadius + 0.05, dotRadius - 0.05, length(grid));
                    
                    // Multiply blend the halftone pattern to give it physical "print" grit
                    col *= mix(1.0, halftone, 0.25);
                    
                    // Add raw film grain
                    col += dust * 0.05;

                    // 6. Entropic Vignette
                    float vig = length(uv - 0.5);
                    col *= smoothstep(0.85, 0.25, vig);

                    // Output perceptual color
                    fragColor = vec4(col, 1.0);
                }
            `;

            const material = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                vertexShader,
                fragmentShader,
                uniforms: {
                    u_time: { value: 0 },
                    u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                    u_textMap: { value: textTexture }
                },
                depthWrite: false,
                depthTest: false
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

    // Safety guards for uniform updates
    if (material && material.uniforms) {
        if (material.uniforms.u_time) material.uniforms.u_time.value = time;
        if (material.uniforms.u_resolution) {
            material.uniforms.u_resolution.value.set(grid.width, grid.height);
        }
    }

    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);
}