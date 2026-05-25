if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        renderer.autoClear = false;
        
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        const FBO_SIZE = 512;
        const rtOpts = {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            depthBuffer: false,
            stencilBuffer: false
        };
        const fbo = [
            new THREE.WebGLRenderTarget(FBO_SIZE, FBO_SIZE, rtOpts),
            new THREE.WebGLRenderTarget(FBO_SIZE, FBO_SIZE, rtOpts)
        ];
        
        const updateMat = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_state: { value: null },
                u_res: { value: new THREE.Vector2(FBO_SIZE, FBO_SIZE) },
                u_time: { value: 0 },
                u_mouse: { value: new THREE.Vector3(0,0,0) }
            },
            vertexShader: `
                in vec2 position;
                void main() {
                    gl_Position = vec4(position, 0.0, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;
                uniform sampler2D u_state;
                uniform vec2 u_res;
                uniform float u_time;
                uniform vec3 u_mouse;
                out vec4 fragColor;
                
                float rand(vec2 co){
                    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                void main() {
                    vec2 uv = gl_FragCoord.xy / u_res;
                    float pixelSize = 1.0 / u_res.y;
                    
                    // Initial random seed to create the starting fabric
                    if (u_time < 0.1) {
                        fragColor = vec4(rand(uv), rand(uv + 1.0), 0.0, 1.0);
                        return;
                    }
                    
                    if (uv.y < pixelSize) {
                        vec2 uv_read = vec2(uv.x, 0.0);
                        float dx = 1.0 / u_res.x;
                        
                        // Read neighborhood from the previous generation
                        vec4 left = texture(u_state, fract(uv_read - vec2(dx, 0.0)));
                        vec4 center = texture(u_state, uv_read);
                        vec4 right = texture(u_state, fract(uv_read + vec2(dx, 0.0)));
                        
                        int lR = int(left.r > 0.5);
                        int cR = int(center.r > 0.5);
                        int rR = int(right.r > 0.5);
                        int idxR = lR * 4 + cR * 2 + rR;
                        
                        int lG = int(left.g > 0.5);
                        int cG = int(center.g > 0.5);
                        int rG = int(right.g > 0.5);
                        int idxG = lG * 4 + cG * 2 + rG;
                        
                        // Wolfram Elementary Rules
                        int rules1[4];
                        rules1[0] = 30; rules1[1] = 110; rules1[2] = 184; rules1[3] = 90;
                        
                        int rules2[4];
                        rules2[0] = 90; rules2[1] = 22; rules2[2] = 126; rules2[3] = 150;
                        
                        float t = u_time * 0.2;
                        int i1 = int(mod(t, 4.0));
                        int i2 = int(mod(t + 1.0, 4.0));
                        float blend = smoothstep(0.4, 0.6, fract(t));
                        
                        // Extract bits for the current neighborhood
                        float r1_a = float((rules1[i1] >> idxR) & 1);
                        float r1_b = float((rules1[i2] >> idxR) & 1);
                        float probR = mix(r1_a, r1_b, blend);
                        
                        float r2_a = float((rules2[i1] >> idxG) & 1);
                        float r2_b = float((rules2[i2] >> idxG) & 1);
                        float probG = mix(r2_a, r2_b, blend);
                        
                        // Probabilistic evaluation for continuous mutation
                        float rnd = rand(uv + u_time);
                        float nextR = probR > rnd ? 1.0 : 0.0;
                        float nextG = probG > fract(rnd + 0.5) ? 1.0 : 0.0;
                        
                        // Localized mouse mutation (infects both X and Y threads)
                        if (u_mouse.z > 0.0) {
                            if (abs(uv.x - u_mouse.x) < 0.02 || abs(uv.x - u_mouse.y) < 0.02) {
                                nextR = 1.0;
                                nextG = 1.0;
                            }
                        }
                        
                        // Spontaneous structural glitches
                        if (rand(uv + u_time * 2.0) > 0.999) nextR = 1.0;
                        if (rand(uv + u_time * 3.0) > 0.999) nextG = 1.0;
                        
                        fragColor = vec4(nextR, nextG, 0.0, 1.0);
                    } else {
                        // Shift the CA history upward to create the spacetime fabric
                        vec4 prev = texture(u_state, uv - vec2(0.0, pixelSize));
                        fragColor = prev;
                    }
                }
            `
        });
        
        const renderMat = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_caTex: { value: null },
                u_res: { value: new THREE.Vector2(grid.width, grid.height) },
                u_time: { value: 0 }
            },
            vertexShader: `
                in vec2 position;
                out vec2 vUv;
                void main() {
                    vUv = position * 0.5 + 0.5;
                    gl_Position = vec4(position, 0.0, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;
                in vec2 vUv;
                uniform sampler2D u_caTex;
                uniform vec2 u_res;
                uniform float u_time;
                out vec4 fragColor;
                
                float rand(vec2 co){
                    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                vec3 electricBlue = vec3(0.0, 0.3, 1.0);
                vec3 hotPink = vec3(1.0, 0.0, 0.5);
                vec3 acidGreen = vec3(0.6, 1.0, 0.0);
                vec3 violet = vec3(0.5, 0.0, 1.0);
                vec3 neonYellow = vec3(1.0, 1.0, 0.0);
                
                vec3 getColor(vec2 state) {
                    if (state.r > 0.5 && state.g > 0.5) return hotPink;
                    if (state.r > 0.5) return acidGreen;
                    if (state.g > 0.5) return violet;
                    return electricBlue;
                }
                
                void main() {
                    vec2 uv = vUv;
                    
                    // Fabric structural warp
                    uv.x += sin(uv.y * 12.0 + u_time * 0.5) * 0.003;
                    uv.y += cos(uv.x * 12.0 + u_time * 0.5) * 0.003;
                    
                    vec2 aspectUv = uv;
                    aspectUv.x *= u_res.x / u_res.y;
                    
                    float numThreads = 120.0;
                    float threadsX = numThreads * u_res.x / u_res.y;
                    float threadsY = numThreads;
                    
                    float warpId = floor(aspectUv.x * numThreads);
                    float weftId = floor(aspectUv.y * numThreads);
                    
                    vec2 threadUv = fract(aspectUv * numThreads);
                    
                    // Sample CA Spacetime (Time flows horizontally for weft, vertically for warp)
                    vec2 warpCaUv = vec2(warpId / threadsX, fract(uv.y + u_time * 0.15));
                    vec2 weftCaUv = vec2(weftId / threadsY, fract(uv.x + u_time * 0.15));
                    
                    vec2 warpState = texture(u_caTex, warpCaUv).rg;
                    vec2 weftState = texture(u_caTex, weftCaUv).rg;
                    
                    vec3 warpColor = getColor(warpState);
                    vec3 weftColor = getColor(weftState);
                    
                    // Signal pulse running through the threads
                    warpColor += sin(uv.y * 25.0 - u_time * 8.0) * 0.15;
                    weftColor += cos(uv.x * 25.0 - u_time * 8.0) * 0.15;
                    
                    // Twill 2/2 weave logic
                    float weave = mod(warpId - weftId, 4.0);
                    bool warpTop = weave < 2.0;
                    
                    // Cylindrical thread shading
                    float warpShade = sin(threadUv.x * 3.14159);
                    float weftShade = sin(threadUv.y * 3.14159);
                    
                    // Thread micro-fibers
                    float warpFibers = fract(sin(threadUv.x * 20.0 + aspectUv.y * 400.0) * 43758.5);
                    float weftFibers = fract(sin(threadUv.y * 20.0 + aspectUv.x * 400.0) * 43758.5);
                    
                    warpShade *= mix(0.6, 1.0, warpFibers);
                    weftShade *= mix(0.6, 1.0, weftFibers);
                    
                    // Gaps between threads
                    float warpGap = smoothstep(0.0, 0.15, threadUv.x) * smoothstep(1.0, 0.85, threadUv.x);
                    float weftGap = smoothstep(0.0, 0.15, threadUv.y) * smoothstep(1.0, 0.85, threadUv.y);
                    
                    // Depth sorting for intersections
                    float depthWarp = warpTop ? 1.0 : 0.0;
                    float depthWeft = !warpTop ? 1.0 : 0.0;
                    
                    depthWarp += warpShade * 0.5;
                    depthWeft += weftShade * 0.5;
                    
                    if (warpGap < 0.1) depthWarp -= 2.0;
                    if (weftGap < 0.1) depthWeft -= 2.0;
                    
                    bool showWarp = depthWarp > depthWeft;
                    vec3 finalColor = showWarp ? warpColor : weftColor;
                    float shade = showWarp ? warpShade : weftShade;
                    
                    // Ambient occlusion at crossings
                    float ao = 1.0;
                    if (showWarp && !warpTop) {
                        ao = smoothstep(0.0, 0.4, threadUv.y) * smoothstep(1.0, 0.6, threadUv.y);
                        ao = mix(0.2, 1.0, ao);
                    } else if (!showWarp && warpTop) {
                        ao = smoothstep(0.0, 0.4, threadUv.x) * smoothstep(1.0, 0.6, threadUv.x);
                        ao = mix(0.2, 1.0, ao);
                    }
                    shade *= ao;
                    
                    // Luminous computational knots at dense intersections
                    float knotEnergy = (warpState.r + warpState.g) * (weftState.r + weftState.g);
                    if (knotEnergy > 1.5 && warpGap > 0.1 && weftGap > 0.1) {
                        finalColor = mix(finalColor, neonYellow, 0.8);
                        shade += 0.5; // Emissive glow
                    }
                    
                    // Density moire interference
                    float moire = sin(uv.x * 500.0 + u_time) * sin(uv.y * 500.0 - u_time);
                    finalColor += moire * 0.2 * hotPink * smoothstep(0.5, 4.0, knotEnergy);
                    
                    finalColor *= shade;
                    
                    // Synthetic glints
                    if (shade > 0.95 && rand(uv + u_time) > 0.99) {
                        finalColor += vec3(0.6);
                    }
                    
                    // Vignette
                    float dist = length(vUv - 0.5);
                    finalColor *= smoothstep(0.85, 0.3, dist);
                    
                    fragColor = vec4(finalColor, 1.0);
                }
            `
        });
        
        const quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), renderMat);
        scene.add(quadMesh);
        
        const updateScene = new THREE.Scene();
        const updateMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), updateMat);
        updateScene.add(updateMesh);
        
        canvas.__three = { renderer, scene, camera, updateScene, fbo, updateMat, renderMat, ping: 0 };
    } catch (e) {
        console.error("WebGL Initialization Failed:", e);
        return;
    }
}

const { renderer, scene, camera, updateScene, fbo, updateMat, renderMat } = canvas.__three;

// Map mouse to UV space for interaction
const mx = mouse.isPressed ? mouse.x / grid.width : -1.0;
const my = mouse.isPressed ? 1.0 - (mouse.y / grid.height) : -1.0;

// 1. Update CA Spacetime FBO
updateMat.uniforms.u_time.value = time;
updateMat.uniforms.u_mouse.value.set(mx, my, mouse.isPressed ? 1.0 : 0.0);
updateMat.uniforms.u_state.value = fbo[canvas.__three.ping].texture;

const nextPing = 1 - canvas.__three.ping;
renderer.setRenderTarget(fbo[nextPing]);
renderer.render(updateScene, camera);
canvas.__three.ping = nextPing;

// 2. Render Tartan Weave to Screen
renderMat.uniforms.u_time.value = time;
renderMat.uniforms.u_caTex.value = fbo[nextPing].texture;
renderMat.uniforms.u_res.value.set(grid.width, grid.height);

renderer.setRenderTarget(null);
renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);