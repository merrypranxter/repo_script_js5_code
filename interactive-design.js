if (!canvas.__three) {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(1);
    
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const simScene = new THREE.Scene();
    const displayScene = new THREE.Scene();
    
    // 512x512 is the sweet spot for Gray-Scott RT performance
    const res = 512;
    
    const options = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType, // Safe fallback for Float32 that works universally
        depthBuffer: false,
        stencilBuffer: false
    };
    
    let rtA = new THREE.WebGLRenderTarget(res, res, options);
    let rtB = new THREE.WebGLRenderTarget(res, res, options);
    
    // Seed Shader: Injects the initial chemical states
    const seedMat = new THREE.ShaderMaterial({
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
        fragmentShader: `
            varying vec2 vUv;
            float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
            void main() {
                vec2 uv = vUv;
                float u = 1.0;
                float v = 0.0;
                
                // Central biological mass
                if (distance(uv, vec2(0.5)) < 0.1) { u = 0.5; v = 0.25; }
                
                // Feral random seeding
                if (hash(uv * 100.0) > 0.99) { u = 0.5; v = 0.25; }
                
                // Corner colonies
                if (distance(uv, vec2(0.2, 0.2)) < 0.05) { u = 0.5; v = 0.25; }
                if (distance(uv, vec2(0.8, 0.8)) < 0.05) { u = 0.5; v = 0.25; }
                if (distance(uv, vec2(0.2, 0.8)) < 0.05) { u = 0.5; v = 0.25; }
                if (distance(uv, vec2(0.8, 0.2)) < 0.05) { u = 0.5; v = 0.25; }
                
                gl_FragColor = vec4(u, v, 0.0, 1.0);
            }
        `
    });
    
    // Simulation Shader: Karl Sims Gray-Scott Reaction-Diffusion
    const simMat = new THREE.ShaderMaterial({
        uniforms: {
            uState: { value: null },
            uResolution: { value: new THREE.Vector2(res, res) },
            uMouse: { value: new THREE.Vector2(0.5, 0.5) },
            uMousePressed: { value: 0.0 },
            uTime: { value: 0 }
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
        fragmentShader: `
            uniform sampler2D uState;
            uniform vec2 uResolution;
            uniform vec2 uMouse;
            uniform float uMousePressed;
            uniform float uTime;
            
            varying vec2 vUv;
            
            // Karl Sims 9-Point Laplacian
            vec2 laplacian(sampler2D tex, vec2 uv, vec2 texel) {
                vec2 sum = vec2(0.0);
                sum += texture2D(tex, uv + vec2(-1.0, 0.0) * texel).rg * 0.2;
                sum += texture2D(tex, uv + vec2( 1.0, 0.0) * texel).rg * 0.2;
                sum += texture2D(tex, uv + vec2( 0.0, -1.0) * texel).rg * 0.2;
                sum += texture2D(tex, uv + vec2( 0.0,  1.0) * texel).rg * 0.2;
                sum += texture2D(tex, uv + vec2(-1.0, -1.0) * texel).rg * 0.05;
                sum += texture2D(tex, uv + vec2( 1.0, -1.0) * texel).rg * 0.05;
                sum += texture2D(tex, uv + vec2(-1.0,  1.0) * texel).rg * 0.05;
                sum += texture2D(tex, uv + vec2( 1.0,  1.0) * texel).rg * 0.05;
                sum -= texture2D(tex, uv).rg;
                return sum;
            }
            
            void main() {
                vec2 texel = 1.0 / uResolution;
                vec2 state = texture2D(uState, vUv).rg;
                float u = state.r;
                float v = state.g;
                
                vec2 lap = laplacian(uState, vUv, texel);
                float reaction = u * v * v;
                
                // Mouse injection
                float dist = distance(vUv, uMouse);
                float inject = smoothstep(0.04, 0.0, dist) * uMousePressed;
                
                // Feral Spatial Parameter Sweep (Pearson Map exploration)
                // Warps the UVs so the parameters drift organically like a fluid
                vec2 wUv = vUv + vec2(sin(vUv.y * 4.0 + uTime * 0.3), cos(vUv.x * 4.0 - uTime * 0.3)) * 0.05;
                
                // Sweeps across Wavelet Chaos, Turing Spots, and Hedgerow Mazes
                float F = mix(0.015, 0.065, wUv.y);
                float K = mix(0.045, 0.065, wUv.x);
                
                float du = 1.0 * lap.r - reaction + F * (1.0 - u);
                float dv = 0.5 * lap.g + reaction - (F + K) * v + inject;
                
                gl_FragColor = vec4(clamp(u + du, 0.0, 1.0), clamp(v + dv, 0.0, 1.0), 0.0, 1.0);
            }
        `
    });
    
    // Display Shader: Lisa Frank 90s Neon Sticker Aesthetic
    const displayMat = new THREE.ShaderMaterial({
        uniforms: {
            uState: { value: null },
            uResolution: { value: new THREE.Vector2(res, res) },
            uTime: { value: 0 }
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
        fragmentShader: `
            uniform sampler2D uState;
            uniform vec2 uResolution;
            uniform float uTime;
            varying vec2 vUv;
            
            float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
            
            void main() {
                vec2 state = texture2D(uState, vUv).rg;
                float u = state.r;
                float v = state.g;
                float t = uTime * 2.0;
                
                // Lisa Frank Neon Palette
                vec3 hotPink = vec3(1.0, 0.0, 0.6);
                vec3 cyan = vec3(0.0, 1.0, 1.0);
                vec3 yellow = vec3(1.0, 1.0, 0.0);
                vec3 lime = vec3(0.2, 1.0, 0.0);
                vec3 purple = vec3(0.6, 0.0, 1.0);
                vec3 orange = vec3(1.0, 0.5, 0.0);
                
                // Psychedelic Rainbow Background
                float wave1 = sin(vUv.x * 10.0 + t) * 0.5 + 0.5;
                float wave2 = sin(vUv.y * 12.0 - t * 0.7) * 0.5 + 0.5;
                float wave3 = sin((vUv.x + vUv.y) * 8.0 + t * 1.1) * 0.5 + 0.5;
                
                vec3 bg = mix(hotPink, cyan, wave1);
                bg = mix(bg, yellow, wave2);
                bg = mix(bg, purple, wave3);
                
                // Extract normals from V concentration for an embossed sticker effect
                vec2 texel = 1.0 / uResolution;
                float dx = texture2D(uState, vUv + vec2(texel.x, 0.0)).g - texture2D(uState, vUv - vec2(texel.x, 0.0)).g;
                float dy = texture2D(uState, vUv + vec2(0.0, texel.y)).g - texture2D(uState, vUv - vec2(0.0, texel.y)).g;
                vec3 normal = normalize(vec3(dx * 20.0, dy * 20.0, 1.0));
                
                vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
                float diff = max(dot(normal, lightDir), 0.0);
                float spec = pow(max(dot(reflect(-lightDir, normal), vec3(0.0, 0.0, 1.0)), 0.0), 32.0);
                
                // Leopard Print Pattern Isolation
                float spotMask = smoothstep(0.18, 0.28, v);
                float outlineMask = smoothstep(0.1, 0.18, v) - smoothstep(0.28, 0.36, v);
                
                vec3 centerCol = mix(lime, orange, wave2);
                
                // Layer the aesthetic
                vec3 finalCol = bg * (diff * 0.7 + 0.3); // Textured rainbow
                finalCol = mix(finalCol, vec3(0.02, 0.0, 0.1), outlineMask); // Deep purple/black outlines
                finalCol = mix(finalCol, centerCol + spec, spotMask * (1.0 - outlineMask)); // Neon glossy centers
                
                // Nostalgic Sparkles
                float n = hash(vUv * 100.0 + t * 0.1);
                float sparkle = pow(n, 150.0) * spec * 15.0;
                finalCol += vec3(sparkle);
                
                // Munafo-style glow for regions with unconsumed U
                finalCol += cyan * smoothstep(0.9, 1.0, u) * 0.1;
                
                gl_FragColor = vec4(finalCol, 1.0);
            }
        `
    });
    
    const geo = new THREE.PlaneGeometry(2, 2);
    const simMesh = new THREE.Mesh(geo, simMat);
    simScene.add(simMesh);
    
    const displayMesh = new THREE.Mesh(geo, displayMat);
    displayScene.add(displayMesh);
    
    // Render the initial seed pass once into RT A
    simMesh.material = seedMat;
    renderer.setRenderTarget(rtA);
    renderer.render(simScene, camera);
    simMesh.material = simMat; // Restore simulation material
    
    canvas.__three = { renderer, camera, simScene, displayScene, rtA, rtB, simMat, displayMat, res };
}

const { renderer, camera, simScene, displayScene, rtA, rtB, simMat, displayMat } = canvas.__three;

renderer.setSize(grid.width, grid.height, false);

// Update Interaction Uniforms
simMat.uniforms.uTime.value = time;
const isHover = mouse.x > 0 && mouse.x < grid.width && mouse.y > 0 && mouse.y < grid.height;
const mx = isHover ? mouse.x / grid.width : 0.5;
const my = isHover ? 1.0 - (mouse.y / grid.height) : 0.5;
simMat.uniforms.uMouse.value.set(mx, my);

// Heavy injection on click, gentle tickle on hover
simMat.uniforms.uMousePressed.value = mouse.isPressed ? 0.5 : (isHover ? 0.02 : 0.0);

// Ping-Pong Reaction-Diffusion (16 steps per frame for stability and speed)
const steps = 16;
for (let i = 0; i < steps; i++) {
    simMat.uniforms.uState.value = rtA.texture;
    renderer.setRenderTarget(rtB);
    renderer.render(simScene, camera);
    
    simMat.uniforms.uState.value = rtB.texture;
    renderer.setRenderTarget(rtA);
    renderer.render(simScene, camera);
}

// Final Display Render to Screen
renderer.setRenderTarget(null);
displayMat.uniforms.uState.value = rtA.texture;
displayMat.uniforms.uTime.value = time;
renderer.render(displayScene, camera);