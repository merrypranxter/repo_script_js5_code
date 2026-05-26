if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        renderer.autoClear = false;

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        const fboOptions = { 
            type: THREE.HalfFloatType,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat
        };
        
        const napFBO1 = new THREE.WebGLRenderTarget(grid.width, grid.height, fboOptions);
        const napFBO2 = new THREE.WebGLRenderTarget(grid.width, grid.height, fboOptions);
        
        const quadGeo = new THREE.PlaneGeometry(2, 2);

        // Nap Scene (Persistent Velvet Brushing State)
        const napScene = new THREE.Scene();
        const napMat = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_prevNap: { value: null },
                u_mouse: { value: new THREE.Vector2() },
                u_mouseDelta: { value: new THREE.Vector2() },
                u_mouseDown: { value: 0 },
                u_time: { value: 0 },
                u_aspect: { value: 1.0 }
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
                uniform sampler2D u_prevNap;
                uniform vec2 u_mouse;
                uniform vec2 u_mouseDelta;
                uniform float u_mouseDown;
                uniform float u_time;
                uniform float u_aspect;

                void main() {
                    vec4 prev = texture(u_prevNap, vUv);
                    vec2 nap = prev.xy;
                    vec2 defaultNap = vec2(0.0, -1.0); // Gravity-aligned velvet nap
                    
                    if (length(nap) < 0.1) nap = defaultNap;
                    
                    if (u_mouseDown > 0.5 && length(u_mouseDelta) > 0.0001) {
                        vec2 aspectVec = vec2(u_aspect, 1.0);
                        float dist = distance(vUv * aspectVec, u_mouse * aspectVec);
                        float brush = smoothstep(0.12, 0.0, dist);
                        vec2 brushDir = normalize(u_mouseDelta);
                        // Mouse brushing flips the nap direction
                        nap = mix(nap, brushDir, brush * 0.95);
                    }
                    
                    // The fabric very slowly returns to its natural gravity state
                    nap = mix(nap, defaultNap, 0.003);
                    nap = normalize(nap);
                    
                    fragColor = vec4(nap, 0.0, 1.0);
                }
            `
        });
        napScene.add(new THREE.Mesh(quadGeo, napMat));

        // Main Scene (Lenia Damask + Velvet Lighting)
        const mainScene = new THREE.Scene();
        const mainMat = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_nap: { value: null },
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
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

                uniform sampler2D u_nap;
                uniform float u_time;
                uniform vec2 u_resolution;

                // --- Core Math & Noise ---
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }

                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f*f*(3.0-2.0*f);
                    return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x),
                               mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y);
                }

                float fbm(vec2 p) {
                    float f = 0.0;
                    float amp = 0.5;
                    for(int i=0; i<4; i++) {
                        f += amp * noise(p);
                        p *= 2.0;
                        amp *= 0.5;
                    }
                    return f;
                }

                // --- Domain Splicing: Damask Tiling ---
                vec2 getDamaskUV(vec2 uv, vec2 res) {
                    float aspect = res.x / res.y;
                    vec2 t = uv * vec2(aspect, 1.0) * 2.5; 
                    vec2 local = fract(t);
                    vec2 id = floor(t);
                    
                    // Alternate tile mirroring for seamless ornamental weave
                    if (mod(id.x, 2.0) > 0.5) local.x = 1.0 - local.x;
                    if (mod(id.y, 2.0) > 0.5) local.y = 1.0 - local.y;
                    
                    // Central symmetry (kaleidoscope fold)
                    return abs(local - 0.5) * 2.0;
                }

                // --- Morphogenesis: Fake Lenia Engine ---
                float getLeniaField(vec2 p, float time) {
                    // Fluid domain warp mimicking mitosis pressure
                    vec2 warp = p + 0.15 * vec2(fbm(p * 4.0 + time * 0.1), fbm(p * 4.0 - time * 0.12));
                    
                    float base = fbm(warp * 5.0 - time * 0.05);
                    
                    // Geometric attraction points that unfold into damask rosettes
                    base += 0.6 * exp(-length(warp - vec2(0.0, 0.0)) * 6.0); 
                    base += 0.5 * exp(-length(warp - vec2(1.0, 1.0)) * 6.0); 
                    base += 0.4 * exp(-length(warp - vec2(0.5, 0.0)) * 10.0); 
                    base += 0.4 * exp(-length(warp - vec2(0.0, 0.5)) * 10.0); 
                    
                    return base;
                }

                // Lenia growth function (Gaussian bump)
                float growth(float u, float mu, float sigma) {
                    return exp(-(u - mu)*(u - mu) / (2.0 * sigma * sigma));
                }

                // --- Textile Topography ---
                float getFabricHeight(vec2 uv) {
                    // Thread weave based on actual screen resolution
                    float weave = sin(uv.x * u_resolution.x * 1.5) * sin(uv.y * u_resolution.y * 1.5) * 0.012;
                    
                    vec2 duv = getDamaskUV(uv, u_resolution);
                    float field = getLeniaField(duv, u_time);
                    
                    // Raised embroidery motifs
                    float motif = growth(field, 0.5, 0.06) + growth(field, 0.65, 0.04) * 0.6;
                    
                    return weave + motif * 0.15;
                }

                void main() {
                    // 1. Read Velvet Nap Direction
                    vec2 napDir2D = texture(u_nap, vUv).xy;
                    vec3 nap = normalize(vec3(napDir2D.x, napDir2D.y, 0.25));

                    // 2. Compute Fabric Normal
                    vec2 e = vec2(0.002, 0.0);
                    float h0 = getFabricHeight(vUv);
                    float hX = getFabricHeight(vUv + e.xy);
                    float hY = getFabricHeight(vUv + e.yx);
                    vec3 N = normalize(vec3(h0 - hX, h0 - hY, 0.015));

                    // 3. Lighting Vectors
                    vec3 V = normalize(vec3(0.0, 0.0, 1.0));
                    // Slow sweeping light to reveal nap
                    vec3 L = normalize(vec3(sin(u_time * 0.25) * 0.8, cos(u_time * 0.3) * 0.8, 0.7));

                    // 4. Velvet Sheen (Asperity Scattering)
                    vec3 microNap = normalize(nap + N * 0.9);
                    float sheen = pow(1.0 - max(dot(microNap, V), 0.0), 2.2) * pow(1.0 - max(dot(microNap, L), 0.0), 1.8);
                    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * max(dot(N, L), 0.0);

                    // 5. Biological Damask Channels
                    vec2 duv = getDamaskUV(vUv, u_resolution);
                    float field = getLeniaField(duv, u_time);
                    
                    float breath = sin(u_time * 0.4) * 0.025;
                    
                    // Isolate specific growth thresholds to fake Lenia multi-kernel layering
                    float ch0 = growth(field, 0.5 + breath, 0.03);  // Magenta raised motif
                    float ch1 = growth(field, 0.35, 0.08);          // Cyan halo
                    float ch2 = growth(field, 0.65 - breath, 0.02); // Acid green core
                    float ch3 = growth(field, 0.25, 0.015);         // Orange/Yellow growth flashes

                    // 6. Color Synthesis
                    vec3 baseColor = vec3(0.06, 0.0, 0.12); // Deep ultraviolet velvet
                    baseColor += sheen * vec3(0.5, 0.1, 0.8) * 1.8;
                    baseColor += rim * vec3(0.3, 0.0, 0.6);

                    vec3 motifColor = ch0 * vec3(1.0, 0.0, 0.4) 
                                    + ch1 * vec3(0.0, 0.8, 1.0) * 0.5 
                                    + ch2 * vec3(0.6, 1.0, 0.0) * 1.3
                                    + ch3 * vec3(1.0, 0.7, 0.0) * 1.5;

                    float motifMask = clamp(ch0 + ch1*0.6 + ch2 + ch3, 0.0, 1.0);
                    motifColor += sheen * motifColor * 0.6; // The motif is also velvet
                    
                    vec3 finalColor = mix(baseColor, motifColor, motifMask);

                    // 7. Sparkle Dust (from the 'sparkles' repo)
                    float sparkleMask = smoothstep(0.4, 0.8, sheen + ch0 * 0.6);
                    float sNoise = hash(vUv * 2000.0 + u_time);
                    float sparkle = step(0.995, sNoise) * sparkleMask;
                    
                    // Iridescent sparkle color
                    vec3 sparkleColor = vec3(
                        0.5 + 0.5 * sin(vUv.x * 80.0 + u_time * 4.0),
                        0.5 + 0.5 * sin(vUv.y * 80.0 + u_time * 3.0),
                        1.0
                    );
                    finalColor += sparkle * sparkleColor * 4.0;

                    // 8. Exposure / Tone Mapping
                    finalColor = 1.0 - exp(-finalColor * 1.3);
                    
                    fragColor = vec4(finalColor, 1.0);
                }
            `
        });
        mainScene.add(new THREE.Mesh(quadGeo, mainMat));

        canvas.__three = {
            renderer, camera,
            napFBO1, napFBO2,
            napScene, napMat,
            mainScene, mainMat,
            lastMouse: new THREE.Vector2(0.5, 0.5),
            wasPressed: false
        };
    } catch (e) {
        console.error("WebGL Initialization Failed:", e);
        return;
    }
}

const t = canvas.__three;
const { renderer, camera, napScene, napMat, mainScene, mainMat } = t;

// Handle resizing
if (t.napFBO1.width !== grid.width || t.napFBO1.height !== grid.height) {
    t.napFBO1.setSize(grid.width, grid.height);
    t.napFBO2.setSize(grid.width, grid.height);
}

const aspect = grid.width / grid.height;
const mx = (mouse.x || grid.width / 2) / grid.width;
const my = 1.0 - ((mouse.y || grid.height / 2) / grid.height);
const currentMouse = new THREE.Vector2(mx, my);

let mouseDelta = new THREE.Vector2(0, 0);
if (mouse.isPressed && t.wasPressed) {
    mouseDelta.subVectors(currentMouse, t.lastMouse);
}
t.lastMouse.copy(currentMouse);
t.wasPressed = mouse.isPressed;

// Phase 1: Update Nap Physics
if (napMat && napMat.uniforms) {
    napMat.uniforms.u_prevNap.value = t.napFBO1.texture;
    napMat.uniforms.u_mouse.value = currentMouse;
    napMat.uniforms.u_mouseDelta.value = mouseDelta;
    napMat.uniforms.u_mouseDown.value = mouse.isPressed ? 1.0 : 0.0;
    napMat.uniforms.u_time.value = time;
    napMat.uniforms.u_aspect.value = aspect;
}

renderer.setRenderTarget(t.napFBO2);
renderer.render(napScene, camera);

// Swap Nap Buffers
const temp = t.napFBO1;
t.napFBO1 = t.napFBO2;
t.napFBO2 = temp;

// Phase 2: Render Velvet Damask
if (mainMat && mainMat.uniforms) {
    mainMat.uniforms.u_nap.value = t.napFBO1.texture;
    mainMat.uniforms.u_time.value = time;
    mainMat.uniforms.u_resolution.value.set(grid.width, grid.height);
}

renderer.setRenderTarget(null);
renderer.setSize(grid.width, grid.height, false);
renderer.render(mainScene, camera);