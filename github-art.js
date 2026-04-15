try {
    // 1. INITIALIZE THREE.JS & WEBGL2 CONTEXT
    if (!canvas.__three) {
        const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance' });
        if (!gl) throw new Error("WebGL 2 not supported or context occupied");

        const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: false, antialias: false });
        renderer.autoClear = false;

        // Simulation resolution (fixed for consistent RD dynamics, independent of screen size)
        const SIM_RES = 512;

        // Use HalfFloatType for balance of precision and compatibility. 
        // FloatType is ideal but fails on some mobile devices. HalfFloat is usually enough for Gray-Scott.
        const targetOptions = {
            width: SIM_RES,
            height: SIM_RES,
            format: THREE.RGBAFormat,
            type: THREE.HalfFloatType,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping,
            depthBuffer: false,
            stencilBuffer: false
        };

        const rtA = new THREE.WebGLRenderTarget(SIM_RES, SIM_RES, targetOptions);
        const rtB = new THREE.WebGLRenderTarget(SIM_RES, SIM_RES, targetOptions);

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const scene = new THREE.Scene();
        const geometry = new THREE.PlaneGeometry(2, 2);

        // --- COMPACT SIMPLEX NOISE FOR GLSL ---
        const snoiseGLSL = `
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+10.0)*x); }
            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy) );
                vec2 x0 = v -   i + dot(i, C.xx);
                vec2 i1;
                i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod289(i);
                vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m ; m = m*m ;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                vec3 g;
                g.x  = a0.x  * x0.x  + h.x  * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }
        `;

        // --- SIMULATION SHADER (The Feral Mechanism) ---
        // Blends Reaction-Diffusion with Domain Warping and spatially varying parameters.
        const simMaterial = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_state: { value: null },
                u_res: { value: new THREE.Vector2(SIM_RES, SIM_RES) },
                u_time: { value: 0 },
                u_mouse: { value: new THREE.Vector2(-1, -1) },
                u_mouse_pressed: { value: 0 }
            },
            vertexShader: `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;
                uniform sampler2D u_state;
                uniform vec2 u_res;
                uniform float u_time;
                uniform vec2 u_mouse;
                uniform float u_mouse_pressed;
                in vec2 vUv;
                out vec4 fragColor;

                ${snoiseGLSL}

                void main() {
                    vec2 px = 1.0 / u_res;
                    
                    // DOMAIN WARP: The chemical lattice is fluid and shifting
                    float warpX = snoise(vUv * 3.0 + u_time * 0.1);
                    float warpY = snoise(vUv * 3.0 - u_time * 0.15 + 100.0);
                    vec2 flowWarp = vec2(warpX, warpY) * 0.003;
                    
                    vec2 uv = vUv + flowWarp;

                    vec2 state = texture(u_state, uv).rg;
                    float u = state.r;
                    float v = state.g;

                    // 9-Point Laplacian (Karl Sims weighted)
                    vec2 lap = vec2(0.0);
                    lap += texture(u_state, uv + vec2(-1.0,  0.0) * px).rg * 0.2;
                    lap += texture(u_state, uv + vec2( 1.0,  0.0) * px).rg * 0.2;
                    lap += texture(u_state, uv + vec2( 0.0, -1.0) * px).rg * 0.2;
                    lap += texture(u_state, uv + vec2( 0.0,  1.0) * px).rg * 0.2;
                    lap += texture(u_state, uv + vec2(-1.0, -1.0) * px).rg * 0.05;
                    lap += texture(u_state, uv + vec2( 1.0, -1.0) * px).rg * 0.05;
                    lap += texture(u_state, uv + vec2(-1.0,  1.0) * px).rg * 0.05;
                    lap += texture(u_state, uv + vec2( 1.0,  1.0) * px).rg * 0.05;
                    lap -= state;

                    // FERAL PARAMETERS: Map noise to Pearson Classification map
                    // Slowly drift across the parameter space (U-Skate -> Mitosis -> Chaos)
                    float paramNoiseF = snoise(vUv * 1.5 - u_time * 0.02);
                    float paramNoiseK = snoise(vUv * 1.5 + u_time * 0.03 + 50.0);
                    
                    // F range: 0.010 (Chaos) to 0.062 (U-Skate)
                    float F = mix(0.015, 0.065, paramNoiseF * 0.5 + 0.5);
                    // k range: 0.041 (Spirals) to 0.065 (Worms)
                    float k = mix(0.045, 0.065, paramNoiseK * 0.5 + 0.5);

                    // Reaction
                    float reaction = u * v * v;
                    
                    // Gray-Scott Equations
                    float du = 1.0 * lap.r - reaction + F * (1.0 - u);
                    float dv = 0.5 * lap.g + reaction - (F + k) * v;

                    float nextU = clamp(u + du, 0.0, 1.0);
                    float nextV = clamp(v + dv, 0.0, 1.0);

                    // INTERACTION: Inject V (activator) with mouse
                    if (u_mouse_pressed > 0.5) {
                        float dist = distance(vUv, u_mouse);
                        if (dist < 0.02) {
                            nextV = mix(nextV, 1.0, smoothstep(0.02, 0.0, dist));
                            nextU = mix(nextU, 0.0, smoothstep(0.02, 0.0, dist));
                        }
                    }

                    fragColor = vec4(nextU, nextV, 0.0, 1.0);
                }
            `
        });

        // --- DISPLAY SHADER (The Lisa Frank Aesthetic) ---
        // Maps the chemical state to aggressive, saturated, embossed neon colors.
        const displayMaterial = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_state: { value: null },
                u_time: { value: 0 },
                u_res: { value: new THREE.Vector2(grid.width, grid.height) }
            },
            vertexShader: `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;
                uniform sampler2D u_state;
                uniform float u_time;
                uniform vec2 u_res;
                in vec2 vUv;
                out vec4 fragColor;

                ${snoiseGLSL}

                // Psychedelic HSB to RGB
                vec3 hsb2rgb(vec3 c) {
                    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
                    rgb = rgb * rgb * (3.0 - 2.0 * rgb);
                    return c.z * mix(vec3(1.0), rgb, c.y);
                }

                void main() {
                    // Slight zoom and pan for the display
                    vec2 uv = (vUv - 0.5) * 0.95 + 0.5;
                    uv += vec2(sin(u_time*0.1), cos(u_time*0.15)) * 0.02;

                    vec2 state = texture(u_state, uv).rg;
                    float u = state.r;
                    float v = state.g;

                    // Compute pseudo-normals for embossing (Karl Sims style)
                    vec2 px = 1.0 / vec2(512.0); // Match sim res
                    float vn = texture(u_state, uv + vec2(0.0, 1.0)*px).g;
                    float ve = texture(u_state, uv + vec2(1.0, 0.0)*px).g;
                    vec2 grad = vec2(ve - v, vn - v);
                    float emboss = dot(grad, normalize(vec2(1.0, 1.0))) * 12.0;

                    // Lisa Frank Neon Mutation
                    // Base hue driven by V concentration and spatial noise
                    float baseNoise = snoise(uv * 4.0 + u_time * 0.2);
                    
                    // Hot magenta, cyan, electric yellow, lime green
                    float hue = fract(v * 1.5 - u_time * 0.1 + baseNoise * 0.3);
                    
                    // Quantize hue slightly for a retro posterized feel
                    hue = mix(hue, floor(hue * 8.0) / 8.0, 0.6);

                    // Saturation drops where U is high (background)
                    float sat = smoothstep(0.1, 0.6, 1.0 - u) * 0.8 + 0.2;
                    
                    // Brightness spiked by reaction edges (emboss)
                    float bri = smoothstep(0.0, 0.4, v) + emboss;
                    
                    // Deep space background with subtle void tendrils
                    float bgNoise = snoise(uv * 10.0 - u_time * 0.5);
                    vec3 bg = vec3(0.05, 0.0, 0.15) * (1.0 + bgNoise * 0.5);

                    vec3 col = hsb2rgb(vec3(hue, sat, clamp(bri, 0.0, 1.0)));
                    
                    // Blend reaction over background
                    col = mix(bg, col, smoothstep(0.05, 0.2, v));

                    // Add "Glitter" (high freq noise on high gradients)
                    float glitterNoise = fract(sin(dot(vUv + u_time, vec2(12.9898, 78.233))) * 43758.5453);
                    float glitter = step(0.85, glitterNoise) * smoothstep(0.05, 0.15, length(grad));
                    col += glitter * vec3(1.0, 0.6, 0.9); // Pinkish glitter

                    // Vignette
                    float vig = length(vUv - 0.5);
                    col *= smoothstep(0.8, 0.3, vig);

                    fragColor = vec4(col, 1.0);
                }
            `
        });

        const mesh = new THREE.Mesh(geometry, simMaterial);
        scene.add(mesh);

        // --- INITIAL SEEDING ---
        // Create a noisy canvas to seed the initial textures
        const seedCanvas = document.createElement('canvas');
        seedCanvas.width = SIM_RES;
        seedCanvas.height = SIM_RES;
        const sctx = seedCanvas.getContext('2d');
        
        // Fill with U=1 (Red channel in texture, mapped to red color here)
        sctx.fillStyle = 'rgba(255, 0, 0, 255)'; 
        sctx.fillRect(0, 0, SIM_RES, SIM_RES);
        
        // Draw chaotic V seeds (Green channel)
        sctx.fillStyle = 'rgba(255, 255, 0, 255)'; // R=255 (U=1), G=255 (V=1)
        for(let i=0; i<50; i++) {
            sctx.beginPath();
            sctx.arc(
                Math.random() * SIM_RES, 
                Math.random() * SIM_RES, 
                Math.random() * 15 + 2, 
                0, Math.PI*2
            );
            sctx.fill();
        }
        
        const seedTexture = new THREE.CanvasTexture(seedCanvas);
        seedTexture.minFilter = THREE.LinearFilter;
        seedTexture.magFilter = THREE.LinearFilter;

        // Render seed to rtA
        simMaterial.uniforms.u_state.value = seedTexture;
        renderer.setRenderTarget(rtA);
        renderer.render(scene, camera);
        
        // Clean up seed texture mapping, replace with rtA for ping-pong
        mesh.material = simMaterial;

        canvas.__three = { 
            renderer, scene, camera, mesh, 
            simMaterial, displayMaterial, 
            rtA, rtB, 
            frame: 0 
        };
    }

    const t = canvas.__three;
    if (!t) return;

    // --- UPDATE UNIFORMS ---
    const mx = mouse.x / grid.width;
    const my = 1.0 - (mouse.y / grid.height); // Flip Y for WebGL

    if (t.simMaterial && t.simMaterial.uniforms) {
        t.simMaterial.uniforms.u_time.value = time;
        t.simMaterial.uniforms.u_mouse.value.set(mx, my);
        t.simMaterial.uniforms.u_mouse_pressed.value = mouse.isPressed ? 1.0 : 0.0;
    }
    
    if (t.displayMaterial && t.displayMaterial.uniforms) {
        t.displayMaterial.uniforms.u_time.value = time;
        t.displayMaterial.uniforms.u_res.value.set(grid.width, grid.height);
    }

    // --- PING-PONG SIMULATION LOOP ---
    // Multiple steps per frame for faster evolution
    const steps = 12; 
    t.mesh.material = t.simMaterial;

    for (let i = 0; i < steps; i++) {
        const readTarget = (t.frame % 2 === 0) ? t.rtA : t.rtB;
        const writeTarget = (t.frame % 2 === 0) ? t.rtB : t.rtA;

        t.simMaterial.uniforms.u_state.value = readTarget.texture;
        t.renderer.setRenderTarget(writeTarget);
        t.renderer.render(t.scene, t.camera);

        t.frame++;
    }

    // --- DISPLAY TO SCREEN ---
    t.mesh.material = t.displayMaterial;
    // Read from the last written target
    t.displayMaterial.uniforms.u_state.value = (t.frame % 2 === 0) ? t.rtA.texture : t.rtB.texture;
    
    t.renderer.setRenderTarget(null);
    t.renderer.setSize(grid.width, grid.height, false);
    t.renderer.render(t.scene, t.camera);

} catch (e) {
    console.error("Feral Mold System Failure:", e);
    // Fallback if WebGL fails (e.g. context loss)
    if (ctx) {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, grid.width, grid.height);
        ctx.fillStyle = '#ff00ff';
        ctx.font = '20px monospace';
        ctx.fillText('CRITICAL: WEBGL CONTEXT LOST', 20, 40);
        ctx.fillText('FERAL MOLD CONTAINED.', 20, 70);
    }
}