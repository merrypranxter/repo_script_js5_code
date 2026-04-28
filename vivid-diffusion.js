if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
        renderer.autoClear = false;

        const size = 512;
        
        const rtOptions = {
            type: THREE.HalfFloatType,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping,
            depthBuffer: false,
            stencilBuffer: false
        };
        
        const rtA = new THREE.WebGLRenderTarget(size, size, rtOptions);
        const rtB = new THREE.WebGLRenderTarget(size, size, rtOptions);
        
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        const initMat = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
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
                
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                void main() {
                    float u = 1.0;
                    float v = 0.0;
                    
                    if (distance(vUv, vec2(0.5)) < 0.1) {
                        u = 0.5;
                        v = 0.25;
                    }
                    
                    if (hash(vUv * 200.0) < 0.02) {
                        u = 0.5;
                        v = 0.25;
                    }
                    
                    u += (hash(vUv * 100.0) - 0.5) * 0.1;
                    v += (hash(vUv * 100.0 + 1.0) - 0.5) * 0.1;
                    
                    fragColor = vec4(clamp(u, 0.0, 1.0), clamp(v, 0.0, 1.0), 0.0, 1.0);
                }
            `
        });
        
        const quadGeo = new THREE.PlaneGeometry(2, 2);
        const initMesh = new THREE.Mesh(quadGeo, initMat);
        const simScene = new THREE.Scene();
        simScene.add(initMesh);
        
        renderer.setRenderTarget(rtA);
        renderer.render(simScene, camera);
        
        const simMat = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                uState: { value: rtA.texture },
                uResolution: { value: new THREE.Vector2(size, size) },
                uScreenResolution: { value: new THREE.Vector2(grid.width, grid.height) },
                uTime: { value: 0 },
                uMouse: { value: new THREE.Vector2(0, 0) },
                uIsPressed: { value: 0 }
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
                uniform sampler2D uState;
                uniform vec2 uResolution;
                uniform vec2 uScreenResolution;
                uniform float uTime;
                uniform vec2 uMouse;
                uniform float uIsPressed;
                out vec4 fragColor;

                vec2 laplacian(sampler2D tex, vec2 uv, vec2 texel) {
                    vec2 sum = vec2(0.0);
                    sum += texture(tex, uv + vec2(-1.0, 0.0) * texel).rg * 0.2;
                    sum += texture(tex, uv + vec2( 1.0, 0.0) * texel).rg * 0.2;
                    sum += texture(tex, uv + vec2( 0.0, -1.0) * texel).rg * 0.2;
                    sum += texture(tex, uv + vec2( 0.0,  1.0) * texel).rg * 0.2;
                    sum += texture(tex, uv + vec2(-1.0, -1.0) * texel).rg * 0.05;
                    sum += texture(tex, uv + vec2( 1.0, -1.0) * texel).rg * 0.05;
                    sum += texture(tex, uv + vec2(-1.0,  1.0) * texel).rg * 0.05;
                    sum += texture(tex, uv + vec2( 1.0,  1.0) * texel).rg * 0.05;
                    sum -= texture(tex, uv).rg;
                    return sum;
                }

                void main() {
                    vec2 texel = 1.0 / uResolution;
                    vec2 state = texture(uState, vUv).rg;
                    
                    float u = state.r;
                    float v = state.g;
                    
                    vec2 lap = laplacian(uState, vUv, texel);
                    float reaction = u * v * v;
                    
                    vec2 c = vUv - 0.5;
                    float dist = length(c);
                    float angle = atan(c.y, c.x);
                    
                    float r = dist * 2.0; 
                    float F = mix(0.0367, 0.062, smoothstep(0.0, 1.0, r));
                    float k = mix(0.0649, 0.061, smoothstep(0.0, 1.0, r));
                    
                    F += sin(uTime * 0.5 + angle * 4.0) * 0.005;
                    k += cos(uTime * 0.3 - r * 10.0) * 0.002;
                    
                    float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
                    F += (noise - 0.5) * 0.002;
                    k += (noise - 0.5) * 0.002;
                    
                    if (uIsPressed > 0.5) {
                        float aspect = uScreenResolution.x / uScreenResolution.y;
                        vec2 aspectUv = vUv * vec2(aspect, 1.0);
                        vec2 aspectMouse = uMouse * vec2(aspect, 1.0);
                        if (distance(aspectUv, aspectMouse) < 0.02) {
                            v = clamp(v + 0.5, 0.0, 1.0);
                            u = clamp(u - 0.5, 0.0, 1.0);
                        }
                    }
                    
                    float du = 1.0 * lap.r - reaction + F * (1.0 - u);
                    float dv = 0.5 * lap.g + reaction - (F + k) * v;
                    
                    fragColor = vec4(clamp(u + du, 0.0, 1.0), clamp(v + dv, 0.0, 1.0), 0.0, 1.0);
                }
            `
        });
        
        const simMesh = new THREE.Mesh(quadGeo, simMat);
        const simSceneLoop = new THREE.Scene();
        simSceneLoop.add(simMesh);
        
        const displayMat = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                uState: { value: null },
                uTime: { value: 0 },
                uTexResolution: { value: new THREE.Vector2(size, size) },
                uScreenResolution: { value: new THREE.Vector2(grid.width, grid.height) }
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
                uniform sampler2D uState;
                uniform float uTime;
                uniform vec2 uTexResolution;
                uniform vec2 uScreenResolution;
                out vec4 fragColor;

                void main() {
                    vec2 state = texture(uState, vUv).rg;
                    float u = state.r;
                    float v = state.g;
                    
                    float aspect = uScreenResolution.x / uScreenResolution.y;
                    vec2 dir = vUv - 0.5;
                    vec2 aspectDir = dir * vec2(aspect, 1.0);
                    float dist = length(aspectDir);
                    float intensity = 0.005 + dist * 0.015;
                    
                    float vR = texture(uState, vUv + dir * intensity).g;
                    float vG = v;
                    float vB = texture(uState, vUv - dir * intensity).g;
                    
                    vec3 c1 = vec3(1.0, 0.42, 0.0);
                    vec3 c2 = vec3(0.0, 0.28, 1.0);
                    vec3 c3 = vec3(1.0, 0.0, 0.78);
                    vec3 c4 = vec3(0.67, 1.0, 0.0);
                    
                    vec3 base = mix(c2, c1, smoothstep(0.2, 0.9, u));
                    
                    vec3 pat = vec3(
                        mix(c3.r, c4.r, smoothstep(0.05, 0.3, vR)),
                        mix(c3.g, c4.g, smoothstep(0.05, 0.3, vG)),
                        mix(c3.b, c4.b, smoothstep(0.05, 0.3, vB))
                    );
                    
                    vec3 color = vec3(
                        mix(base.r, pat.r, smoothstep(0.05, 0.25, vR)),
                        mix(base.g, pat.g, smoothstep(0.05, 0.25, vG)),
                        mix(base.b, pat.b, smoothstep(0.05, 0.25, vB))
                    );
                    
                    vec2 texel = 1.0 / uTexResolution;
                    float vRight = texture(uState, vUv + vec2(texel.x, 0.0)).g;
                    float vUp = texture(uState, vUv + vec2(0.0, texel.y)).g;
                    float bump = (vRight - v + vUp - v) * 4.0;
                    color += c4 * bump;
                    
                    float vig = smoothstep(0.85, 0.15, dist);
                    color = mix(vec3(0.2, 0.0, 0.4), color, vig);
                    
                    color = clamp(color, 0.15, 0.95);
                    
                    fragColor = vec4(color, 1.0);
                }
            `
        });
        
        const displayMesh = new THREE.Mesh(quadGeo, displayMat);
        const displayScene = new THREE.Scene();
        displayScene.add(displayMesh);
        
        canvas.__three = {
            renderer,
            camera,
            simSceneLoop,
            simMat,
            displayScene,
            displayMat,
            rtA,
            rtB,
            stepsPerFrame: 16,
            flip: false
        };
        
    } catch (e) {
        console.error("WebGL Initialization Failed:", e);
        return;
    }
}

const state = canvas.__three;
if (!state || !state.renderer) return;

if (state.simMat?.uniforms) {
    if (state.simMat.uniforms.uTime) state.simMat.uniforms.uTime.value = time;
    if (state.simMat.uniforms.uMouse) state.simMat.uniforms.uMouse.value.set(mouse.x / grid.width, 1.0 - mouse.y / grid.height);
    if (state.simMat.uniforms.uIsPressed) state.simMat.uniforms.uIsPressed.value = mouse.isPressed ? 1.0 : 0.0;
    if (state.simMat.uniforms.uScreenResolution) state.simMat.uniforms.uScreenResolution.value.set(grid.width, grid.height);
}

if (state.displayMat?.uniforms) {
    if (state.displayMat.uniforms.uTime) state.displayMat.uniforms.uTime.value = time;
    if (state.displayMat.uniforms.uScreenResolution) state.displayMat.uniforms.uScreenResolution.value.set(grid.width, grid.height);
}

for (let i = 0; i < state.stepsPerFrame; i++) {
    const readTarget = state.flip ? state.rtB : state.rtA;
    const writeTarget = state.flip ? state.rtA : state.rtB;
    
    if (state.simMat?.uniforms?.uState) {
        state.simMat.uniforms.uState.value = readTarget.texture;
    }
    
    state.renderer.setRenderTarget(writeTarget);
    state.renderer.render(state.simSceneLoop, state.camera);
    
    state.flip = !state.flip;
}

const finalReadTarget = state.flip ? state.rtB : state.rtA;
if (state.displayMat?.uniforms?.uState) {
    state.displayMat.uniforms.uState.value = finalReadTarget.texture;
}

state.renderer.setRenderTarget(null);
state.renderer.setSize(grid.width, grid.height, false);
state.renderer.render(state.displayScene, state.camera);