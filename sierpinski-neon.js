// ✦ SIERPINSKI SIGNAL-PYRAMID ✦
// A recursive stained-glass hallucination of infinite triangular holes.
// Built with GLSL3, Iterated Function Systems (IFS), and perceptual acid-math.
//
// Keyboard Controls:
// [SPACE] : Pause / Resume animation
// [R]     : Reseed palette & phase
// [S]     : Save screenshot
//
// Mouse Controls:
// X-Axis  : Warps the recursive fold angle (breaks symmetry into quasicrystals)
// Y-Axis  : Controls glitchcore chromatic aberration intensity

try {
    if (!ctx) throw new Error("WebGL context not available");

    // Initialize state and event listeners only once
    if (!canvas.__handlersAttached) {
        canvas.__seed = Math.random();
        canvas.__isPaused = false;
        canvas.__internalTime = 0;
        canvas.__lastTime = performance.now();

        window.addEventListener('keydown', (e) => {
            if (e.key === 's' || e.key === 'S') {
                const link = document.createElement('a');
                link.download = `sierpinski_hallucination_${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
            if (e.key === 'r' || e.key === 'R') {
                canvas.__seed = Math.random();
            }
            if (e.key === ' ') {
                canvas.__isPaused = !canvas.__isPaused;
                e.preventDefault();
            }
        });
        canvas.__handlersAttached = true;
    }

    // Handle internal time for pausing
    const now = performance.now();
    const dt = (now - canvas.__lastTime) / 1000.0;
    canvas.__lastTime = now;
    if (!canvas.__isPaused) {
        canvas.__internalTime += dt;
    }

    // Initialize Three.js scene if it doesn't exist
    if (!canvas.__three) {
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true, preserveDrawingBuffer: true });
        renderer.autoClearColor = false;
        
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
            #version 300 es
            precision highp float;

            uniform float u_time;
            uniform vec2 u_resolution;
            uniform vec2 u_mouse;
            uniform float u_seed;

            in vec2 vUv;
            out vec4 fragColor;

            #define MAX_ITER 13
            #define PI 3.14159265359

            // 2D Rotation Matrix
            mat2 rot(float a) {
                float s = sin(a), c = cos(a);
                return mat2(c, -s, s, c);
            }

            // High-vibration Acid Palette (Hot pinks, teals, electric blues, neon greens)
            vec3 acidPalette(float t) {
                t = fract(t);
                if (t < 0.14) return mix(vec3(1.0, 0.0, 0.5), vec3(0.8, 0.0, 1.0), t/0.14); // Hot pink -> Purple
                if (t < 0.28) return mix(vec3(0.8, 0.0, 1.0), vec3(0.0, 0.2, 1.0), (t-0.14)/0.14); // Purple -> Electric Blue
                if (t < 0.42) return mix(vec3(0.0, 0.2, 1.0), vec3(0.0, 1.0, 0.8), (t-0.28)/0.14); // Blue -> Teal
                if (t < 0.57) return mix(vec3(0.0, 1.0, 0.8), vec3(0.5, 1.0, 0.0), (t-0.42)/0.15); // Teal -> Neon Green
                if (t < 0.71) return mix(vec3(0.5, 1.0, 0.0), vec3(1.0, 1.0, 0.0), (t-0.57)/0.14); // Green -> Yellow
                if (t < 0.85) return mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.4, 0.0), (t-0.71)/0.14); // Yellow -> Orange
                return mix(vec3(1.0, 0.4, 0.0), vec3(1.0, 0.0, 0.5), (t-0.85)/0.15); // Orange -> Hot pink
            }

            // Sierpinski Iterated Function System (IFS) Distance Field
            float map(vec2 p, out float trap, out float id, out vec2 trapPos) {
                float scale = 1.0;
                trap = 1e20;
                id = 0.0;
                
                // Tapestry kaleidoscope fold
                p *= 1.1; 
                p = abs(p);
                if(p.y > p.x) p = p.yx;
                p = rot(u_time * 0.05) * p;

                // Mouse X drives angular symmetry breaking (quasicrystal distortion)
                float mouseDistort = (u_mouse.x - 0.5) * 0.15;
                float anim = sin(u_time * 0.4) * 0.03 + mouseDistort;
                
                // Fold normal and shift vector for the triangle
                vec2 n = normalize(vec2(-0.5, 0.866025 + anim));
                vec2 shift = vec2(0.0, 1.1547);
                
                for (int i = 0; i < MAX_ITER; i++) {
                    // Mirror X
                    p.x = abs(p.x);
                    // Center the fold
                    p.y += 0.288675; 
                    
                    // Fold across the angle
                    float d = dot(p, n);
                    if (d < 0.0) p -= 2.0 * d * n;
                    
                    // Scale and translate
                    p = p * 2.0 - shift;
                    scale *= 2.0;
                    
                    // Orbit trapping for stained-glass interior rendering
                    float pLen = length(p);
                    if (pLen < trap) {
                        trap = pLen;
                        trapPos = p; // Store localized recursive coordinates for moiré
                    }
                    
                    // Accumulate ID for palette cycling
                    id += step(0.0, p.y) * exp(-float(i) * 0.15); 
                }
                
                return length(p) / scale;
            }

            // Core rendering pass
            vec3 render(vec2 uv, float timeOffset) {
                float t = u_time + timeOffset;
                
                // Fluid ripple warp
                vec2 p = uv;
                p += vec2(sin(p.y * 6.0 + t), cos(p.x * 6.0 + t)) * 0.01;
                
                // Hypnotic zoom drift
                float zoom = 1.6 + sin(t * 0.25) * 0.6;
                p *= zoom;
                
                float trap, id;
                vec2 trapPos;
                float d = map(p, trap, id, trapPos);
                
                // Base color derived from recursion ID and orbit trap
                float colorPhase = id * 0.35 + t * 0.15 + u_seed * 10.0;
                vec3 baseCol = acidPalette(colorPhase);
                
                // Stained-glass void interiors
                vec3 col = baseCol * smoothstep(0.6, 0.0, trap) * 0.7;
                
                // Moiré interference mapped through the triangular grid
                // This creates the "structural-color iridescence" inside the holes
                float moire = sin(trapPos.x * 45.0) * sin(trapPos.y * 45.0);
                moire = smoothstep(0.1, 0.9, moire);
                col += acidPalette(colorPhase + 0.4) * moire * 0.4 * exp(-d * 15.0);
                
                // Edge Glow / Neon Outline Structure
                float edge = exp(-d * 400.0);       // Hard white-hot core
                float softEdge = exp(-d * 50.0);    // Colored neon falloff
                
                col += baseCol * softEdge * 1.8;
                col += vec3(1.0) * edge * 2.5;
                
                // Fake 3D / Crystalline glints via normal estimation
                vec2 e = vec2(0.002, 0.0);
                float dx = map(p + e.xy, trap, id, trapPos);
                float dy = map(p + e.yx, trap, id, trapPos);
                vec3 n = normalize(vec3(dx - d, dy - d, 0.008)); 
                vec3 light = normalize(vec3(sin(t), cos(t), 0.8));
                float spec = pow(max(dot(reflect(-light, n), vec3(0.0, 0.0, 1.0)), 0.0), 32.0);
                
                // Apply crystalline specular glints
                col += mix(vec3(1.0), baseCol, 0.3) * spec * softEdge * 4.0;

                // Center depth fog
                col *= 1.0 - smoothstep(0.2, 2.5, length(uv));
                
                return col;
            }

            void main() {
                // Normalize pixel coordinates
                vec2 uv = (vUv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
                
                // Mouse Y drives glitchcore chromatic aberration intensity
                float glitchStrength = 0.003 + (u_mouse.y) * 0.02;
                float glitch = sin(uv.y * 120.0 + u_time * 25.0) * glitchStrength;
                
                // Chromatic Aberration & RGB Splitting (3 passes)
                vec3 finalCol;
                finalCol.r = render(uv + vec2(glitch, 0.0), 0.0).r;
                finalCol.g = render(uv, 0.015).g; // Temporal offset for iridescent shift
                finalCol.b = render(uv - vec2(glitch, 0.0), 0.03).b;
                
                // CRT / VHS Shimmer & Scanlines
                float scanlines = sin(gl_FragCoord.y * 2.5) * 0.06;
                finalCol -= scanlines;
                
                // Phosphor bloom
                finalCol += finalCol * finalCol * 0.25;
                
                // Vignette
                float vig = length(vUv - 0.5);
                finalCol *= smoothstep(0.8, 0.2, vig);
                
                fragColor = vec4(finalCol, 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
                u_seed: { value: canvas.__seed }
            },
            vertexShader,
            fragmentShader,
            depthWrite: false,
            depthTest: false
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);

        canvas.__three = { renderer, scene, camera, material };
    }

    const { renderer, scene, camera, material } = canvas.__three;

    // Update Uniforms
    if (material && material.uniforms) {
        material.uniforms.u_time.value = canvas.__internalTime;
        material.uniforms.u_resolution.value.set(grid.width, grid.height);
        material.uniforms.u_seed.value = canvas.__seed;
        
        // Smooth mouse interpolation
        const targetMouseX = mouse.x / grid.width;
        const targetMouseY = mouse.y / grid.height;
        material.uniforms.u_mouse.value.x += (targetMouseX - material.uniforms.u_mouse.value.x) * 0.1;
        material.uniforms.u_mouse.value.y += (targetMouseY - material.uniforms.u_mouse.value.y) * 0.1;
    }

    // Render Frame
    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

} catch (e) {
    console.error("Feral Sierpinski Initialization Failed:", e);
}