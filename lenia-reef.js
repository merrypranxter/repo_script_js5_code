try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    // Initialize Three.js environment if it doesn't exist
    if (!canvas.__three) {
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
        renderer.autoClear = false;
        
        // FBO setup for ping-pong cellular automata state
        const rtOpts = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType, // High precision for continuous CA
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping
        };
        
        const fboA = new THREE.WebGLRenderTarget(grid.width, grid.height, rtOpts);
        const fboB = new THREE.WebGLRenderTarget(grid.width, grid.height, rtOpts);
        
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const scene = new THREE.Scene();
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
        scene.add(quad);

        // 1. SEED SHADER: Injects initial chemical noise
        const seedMat = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: { u_time: { value: 0 }, u_res: { value: new THREE.Vector2(grid.width, grid.height) } },
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
                uniform vec2 u_res;
                
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                void main() {
                    vec2 uv = vUv;
                    float r = 0.0;
                    float g = 0.0;
                    
                    // Scatter organic blobs
                    for(int i=0; i<8; i++) {
                        vec2 pos = vec2(hash(vec2(i, 0.0)), hash(vec2(i, 1.0)));
                        float d = length(uv - pos);
                        r += exp(-d*d / 0.002) * hash(vec2(i, 2.0));
                        g += exp(-d*d / 0.005) * hash(vec2(i, 3.0));
                    }
                    
                    // Background noise
                    float n = hash(uv * 100.0);
                    
                    fragColor = vec4(clamp(r + n*0.1, 0.0, 1.0), clamp(g, 0.0, 1.0), 0.0, 1.0);
                }
            `
        });

        // 2. SIMULATION SHADER: Feral Multi-Kernel Lenia + Fluid Advection
        const simMat = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_state: { value: null },
                u_res: { value: new THREE.Vector2(grid.width, grid.height) },
                u_time: { value: 0 }
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
                uniform sampler2D u_state;
                uniform vec2 u_res;
                uniform float u_time;

                const int SAMPLES = 48; // Golden spiral sampling

                void main() {
                    vec4 me = texture(u_state, vUv);
                    
                    // FLUID ADVECTION: Organisms create currents based on chemical gradients
                    vec2 eps = vec2(1.0/u_res.x, 1.0/u_res.y);
                    float dx = texture(u_state, vUv + vec2(eps.x, 0.0)).a - texture(u_state, vUv - vec2(eps.x, 0.0)).a;
                    float dy = texture(u_state, vUv + vec2(0.0, eps.y)).a - texture(u_state, vUv - vec2(0.0, eps.y)).a;
                    
                    // Divergence-free curl noise advection
                    vec2 vel = vec2(dy, -dx) * 0.003; 
                    vec2 uv = vUv - vel;

                    // DYNAMIC RADIUS: Organisms swell when immersed in fluid (Ch3)
                    float R = 15.0 * (1.0 + 0.4 * me.a); 

                    vec4 sum = vec4(0.0);
                    float wSum = 0.0;

                    // CONVOLUTION: Multi-ring golden spiral
                    for(int i=0; i<SAMPLES; i++) {
                        float f = float(i) + 0.5;
                        float r = sqrt(f/float(SAMPLES)) * R;
                        float theta = f * 2.3999632; // Golden angle
                        vec2 offset = vec2(cos(theta), sin(theta)) * r / u_res;
                        
                        float rn = r / R;
                        // Dual-ring kernel for complex organelle formation
                        float w = 1.0 * exp(-pow(rn - 0.35, 2.0) / 0.015) + 
                                  0.5 * exp(-pow(rn - 0.75, 2.0) / 0.02);
                        
                        sum += texture(u_state, fract(uv + offset)) * w;
                        wSum += w;
                    }
                    sum /= wSum;

                    // CONNECTION MATRIX: Cross-channel chemical interaction
                    vec4 u = vec4(0.0);
                    u.r =  1.0 * sum.r + 0.25 * sum.g - 0.4 * sum.b + 0.1 * sum.a; // Body
                    u.g =  0.6 * sum.r + 1.00 * sum.g - 0.1 * sum.b - 0.1 * sum.a; // Excitation
                    u.b = -0.1 * sum.r + 0.70 * sum.g + 1.0 * sum.b + 0.1 * sum.a; // Inhibition
                    u.a =  0.3 * sum.r + 0.20 * sum.g - 0.1 * sum.b + 0.9 * sum.a; // Fluid Scaffold

                    // GROWTH FUNCTION (Sweet spots)
                    vec4 mu  = vec4(0.14, 0.15, 0.13, 0.16);
                    vec4 sig = vec4(0.025, 0.028, 0.022, 0.035);

                    // FERAL MUTATION: Wobble the sweet spots based on space-time
                    mu += 0.015 * sin(u_time * 0.3 + uv.xyxy * 12.0);

                    // Apply Gaussian growth
                    vec4 g = 2.0 * exp(-pow(u - mu, vec4(2.0)) / (2.0 * sig * sig)) - 1.0;

                    // EULER INTEGRATION
                    float dt = 0.18;
                    vec4 nextState = clamp(texture(u_state, uv) + dt * g, 0.0, 1.0);

                    // ENTROPY & PERSISTENCE
                    nextState.a *= 0.992; // Fluid evaporates slowly

                    // LIFE SUPPORT: Wandering seeders prevent total extinction
                    vec2 w1 = 0.5 + 0.35 * vec2(cos(u_time*0.51), sin(u_time*0.37));
                    vec2 w2 = 0.5 + 0.35 * vec2(sin(u_time*0.43), cos(u_time*0.61));
                    float seeder = exp(-length(vUv - w1)/0.003) + exp(-length(vUv - w2)/0.003);
                    nextState.r = max(nextState.r, seeder * 0.8);
                    nextState.g = max(nextState.g, seeder * 0.5);

                    // SPONTANEOUS MITOSIS: Noise injection
                    float noise = fract(sin(dot(uv + u_time, vec2(12.9898, 78.233))) * 43758.5453);
                    if (noise > 0.9995) nextState.r = 1.0;

                    fragColor = nextState;
                }
            `
        });

        // 3. RENDER SHADER: Candy Reef Aesthetics & Glitch Post-Processing
        const renderMat = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_state: { value: null },
                u_res: { value: new THREE.Vector2(grid.width, grid.height) },
                u_time: { value: 0 }
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
                uniform sampler2D u_state;
                uniform vec2 u_res;
                uniform float u_time;

                void main() {
                    vec2 uv = vUv;
                    vec4 s = texture(u_state, uv);

                    // GRADIENT CALCULATION (for edge detection and structural color)
                    vec2 eps = vec2(1.0/u_res.x, 1.0/u_res.y);
                    float dx = texture(u_state, uv + vec2(eps.x,0)).r - texture(u_state, uv - vec2(eps.x,0)).r;
                    float dy = texture(u_state, uv + vec2(0,eps.y)).r - texture(u_state, uv - vec2(0,eps.y)).r;
                    float edge = clamp(length(vec2(dx, dy)) * 6.0, 0.0, 1.0);

                    // VHS WOBBLE
                    float wobble = sin(uv.y * 40.0 + u_time * 15.0) * 0.001 * s.b;
                    uv.x += wobble;

                    // CHROMATIC ABERRATION & PIXEL SORTING (Datamosh streaks)
                    vec2 rUV = uv;
                    vec2 gUV = uv;
                    vec2 bUV = uv;

                    // Trigger pixel sorting only on high inhibition + sharp edges
                    if (s.b > 0.25 && edge > 0.05) {
                        float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
                        float stretch = s.b * edge * 0.08 * noise;
                        rUV.y -= stretch * 0.5;
                        gUV.y -= stretch * 1.2; // Chromatic split during smear
                        bUV.y -= stretch * 0.8;
                    }

                    vec4 sr = texture(u_state, rUV);
                    vec4 sg = texture(u_state, gUV);
                    vec4 sb = texture(u_state, bUV);

                    // CANDY REEF PALETTE (No black voids)
                    vec3 baseColor = vec3(0.88, 0.97, 0.99); // Luminous pale cyan wash
                    vec3 col = baseColor;

                    // Chemical Layers
                    vec3 cBody   = vec3(1.0, 0.05, 0.5);  // Hot Pink
                    vec3 cExcite = vec3(0.0, 1.0, 0.7);   // Neon Aqua
                    vec3 cInhib  = vec3(0.4, 0.0, 0.8);   // Deep Violet
                    vec3 cFluid  = vec3(1.0, 0.95, 0.2);  // Lemon Yellow Glow

                    // Subtractive & Additive Blending
                    col = mix(col, cInhib, sb.b * 0.7);      // Inhibition darkens/stains
                    col = mix(col, cBody, sr.r);             // Body is opaque
                    col += cExcite * sg.g * 0.8;             // Excitation is luminous
                    col += cFluid * sr.a * 0.6;              // Fluid trace glows

                    // HOLOGRAPHIC SHIMMER & IRIDESCENT EDGES
                    vec3 iridescence = 0.5 + 0.5 * cos(u_time * 2.0 + edge * 8.0 + vec3(0.0, 2.0, 4.0));
                    col += iridescence * edge * sr.r * 1.5;

                    // GLITTERING KERNEL PARTICLES
                    float glitter = step(0.99, fract(sin(dot(uv * u_time, vec2(17.1, 31.7))) * 43758.5)) * sg.g;
                    col += vec3(1.0) * glitter * 2.0;

                    // VIGNETTE (Colored, not black)
                    float v = length(vUv - 0.5);
                    col = mix(col, vec3(0.6, 0.8, 0.9), smoothstep(0.4, 0.8, v));

                    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
                }
            `
        });

        // Initialization Run
        quad.material = seedMat;
        renderer.setRenderTarget(fboA);
        renderer.render(scene, camera);
        
        canvas.__three = { renderer, scene, camera, quad, fboA, fboB, simMat, renderMat };
        canvas.__ping = true;
    }

    const { renderer, scene, camera, quad, fboA, fboB, simMat, renderMat } = canvas.__three;

    // Handle Resize
    if (renderer.getSize(new THREE.Vector2()).x !== grid.width || renderer.getSize(new THREE.Vector2()).y !== grid.height) {
        renderer.setSize(grid.width, grid.height, false);
        fboA.setSize(grid.width, grid.height);
        fboB.setSize(grid.width, grid.height);
        simMat.uniforms.u_res.value.set(grid.width, grid.height);
        renderMat.uniforms.u_res.value.set(grid.width, grid.height);
    }

    // Ping-Pong Simulation Step
    const readFBO = canvas.__ping ? fboA : fboB;
    const writeFBO = canvas.__ping ? fboB : fboA;

    // 1. Run Simulation
    quad.material = simMat;
    simMat.uniforms.u_state.value = readFBO.texture;
    simMat.uniforms.u_time.value = time;
    renderer.setRenderTarget(writeFBO);
    renderer.render(scene, camera);

    // 2. Render to Screen
    quad.material = renderMat;
    renderMat.uniforms.u_state.value = writeFBO.texture;
    renderMat.uniforms.u_time.value = time;
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);

    // Swap buffers
    canvas.__ping = !canvas.__ping;

} catch (e) {
    console.error("WebGL Initialization or Render Failed:", e);
}