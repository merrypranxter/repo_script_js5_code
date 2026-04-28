if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");

        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
        
        const size = 512;
        
        const rtOptions = {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping,
            depthBuffer: false,
            stencilBuffer: false
        };
        
        const rtA = new THREE.WebGLRenderTarget(size, size, rtOptions);
        const rtB = new THREE.WebGLRenderTarget(size, size, rtOptions);
        
        const seedData = new Float32Array(size * size * 4);
        for (let i = 0; i < size * size; i++) {
            seedData[i * 4] = 1.0;
            seedData[i * 4 + 1] = 0.0;
            seedData[i * 4 + 2] = 0.0;
            seedData[i * 4 + 3] = 1.0;
            
            const x = i % size;
            const y = Math.floor(i / size);
            
            const nx = (x / size) * 15.0;
            const ny = (y / size) * 15.0;
            
            if (Math.sin(nx) * Math.cos(ny) > 0.5 && Math.random() > 0.5) {
                seedData[i * 4] = 0.5 + Math.random() * 0.2;
                seedData[i * 4 + 1] = 0.25 + Math.random() * 0.2;
            }
        }
        
        const seedTex = new THREE.DataTexture(seedData, size, size, THREE.RGBAFormat, THREE.FloatType);
        seedTex.wrapS = THREE.RepeatWrapping;
        seedTex.wrapT = THREE.RepeatWrapping;
        seedTex.needsUpdate = true;
        
        const simMat = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                uState: { value: seedTex },
                uResolution: { value: new THREE.Vector2(size, size) },
                uFeedRate: { value: 0.035 },
                uKillRate: { value: 0.060 },
                uDiffusionU: { value: 1.0 },
                uDiffusionV: { value: 0.5 },
                uDeltaT: { value: 1.0 },
                uTime: { value: 0.0 },
                uMouse: { value: new THREE.Vector2(0.5, 0.5) },
                uMousePressed: { value: 0.0 }
            },
            vertexShader: `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D uState;
                uniform vec2 uResolution;
                uniform float uFeedRate;
                uniform float uKillRate;
                uniform float uDiffusionU;
                uniform float uDiffusionV;
                uniform float uDeltaT;
                uniform float uTime;
                uniform vec2 uMouse;
                uniform float uMousePressed;
                
                in vec2 vUv;
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
                    
                    float F = uFeedRate + sin(vUv.x * 12.0 + uTime * 0.3) * 0.004;
                    float K = uKillRate + cos(vUv.y * 12.0 - uTime * 0.2) * 0.004;
                    
                    float du = uDiffusionU * lap.r - reaction + F * (1.0 - u);
                    float dv = uDiffusionV * lap.g + reaction - (F + K) * v;
                    
                    float newU = u + uDeltaT * du;
                    float newV = v + uDeltaT * dv;
                    
                    if (uMousePressed > 0.5) {
                        float dist = distance(vUv, uMouse);
                        if (dist < 0.02) {
                            newV += 0.5;
                        }
                    }
                    
                    vec2 autoPos = vec2(
                        0.5 + sin(uTime * 0.6) * 0.35,
                        0.5 + cos(uTime * 0.4) * 0.35
                    );
                    if (distance(vUv, autoPos) < 0.015) {
                        newV += 0.3;
                    }
                    
                    fragColor = vec4(clamp(newU, 0.0, 1.0), clamp(newV, 0.0, 1.0), 0.0, 1.0);
                }
            `
        });
        
        const displayMat = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                uState: { value: null },
                uTime: { value: 0.0 }
            },
            vertexShader: `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D uState;
                uniform float uTime;
                in vec2 vUv;
                out vec4 fragColor;
                
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                vec3 getAcidColor(float val) {
                    vec3 c1 = vec3(1.0, 0.0, 0.5); 
                    vec3 c2 = vec3(1.0, 0.6, 0.0); 
                    vec3 c3 = vec3(0.0, 1.0, 0.6); 
                    vec3 c4 = vec3(0.0, 0.4, 1.0); 
                    vec3 c5 = vec3(0.8, 0.0, 1.0); 
                    
                    val = fract(val);
                    if(val < 0.25) return mix(c1, c2, val * 4.0);
                    if(val < 0.5) return mix(c2, c3, (val - 0.25) * 4.0);
                    if(val < 0.75) return mix(c3, c4, (val - 0.5) * 4.0);
                    return mix(c4, c5, (val - 0.75) * 4.0);
                }
                
                void main() {
                    vec2 dir = normalize(vUv - 0.5);
                    float offset = 0.006;
                    
                    float vR = texture(uState, vUv + dir * offset).g;
                    float vG = texture(uState, vUv).g;
                    float vB = texture(uState, vUv - dir * offset).g;
                    
                    float warp = sin(vUv.x * 10.0 + uTime) * cos(vUv.y * 10.0 - uTime) * 0.12;
                    
                    vec3 colR = getAcidColor(vR * 4.5 + warp + uTime * 0.15);
                    vec3 colG = getAcidColor(vG * 4.5 + warp + uTime * 0.15 + 0.05);
                    vec3 colB = getAcidColor(vB * 4.5 + warp + uTime * 0.15 + 0.10);
                    
                    vec3 finalCol = vec3(colR.r, colG.g, colB.b);
                    
                    float n = hash(vUv * (uTime + 1.0));
                    finalCol += (n - 0.5) * 0.12;
                    
                    finalCol = clamp(finalCol, 0.02, 0.98);
                    
                    fragColor = vec4(finalCol, 1.0);
                }
            `
        });
        
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        camera.position.z = 1;
        
        const scene = new THREE.Scene();
        const simScene = new THREE.Scene();
        
        const geometry = new THREE.PlaneGeometry(2, 2);
        const simMesh = new THREE.Mesh(geometry, simMat);
        const displayMesh = new THREE.Mesh(geometry, displayMat);
        
        simScene.add(simMesh);
        scene.add(displayMesh);
        
        canvas.__three = {
            renderer,
            camera,
            scene,
            simScene,
            simMat,
            displayMat,
            rtA,
            rtB,
            step: 0
        };
        
    } catch (e) {
        console.error("WebGL Initialization Failed:", e);
        return;
    }
}

const t = canvas.__three;
if (!t) return;

const F = 0.032 + 0.022 * (Math.sin(time * 0.2) * 0.5 + 0.5);
const k = 0.058 + 0.006 * (Math.cos(time * 0.15) * 0.5 + 0.5);

if (t.simMat && t.simMat.uniforms) {
    t.simMat.uniforms.uFeedRate.value = F;
    t.simMat.uniforms.uKillRate.value = k;
    t.simMat.uniforms.uTime.value = time;
    t.simMat.uniforms.uMouse.value.set(mouse.x / grid.width, 1.0 - mouse.y / grid.height);
    t.simMat.uniforms.uMousePressed.value = mouse.isPressed ? 1.0 : 0.0;
}

const STEPS_PER_FRAME = 16;
for (let i = 0; i < STEPS_PER_FRAME; i++) {
    if (t.simMat && t.simMat.uniforms) {
        t.simMat.uniforms.uState.value = (t.step % 2 === 0) ? t.rtA.texture : t.rtB.texture;
    }
    const target = (t.step % 2 === 0) ? t.rtB : t.rtA;
    
    t.renderer.setRenderTarget(target);
    t.renderer.render(t.simScene, t.camera);
    t.step++;
}

t.renderer.setRenderTarget(null);
if (t.displayMat && t.displayMat.uniforms) {
    t.displayMat.uniforms.uState.value = (t.step % 2 === 0) ? t.rtA.texture : t.rtB.texture;
    t.displayMat.uniforms.uTime.value = time;
}

t.renderer.setSize(grid.width, grid.height, false);
t.renderer.render(t.scene, t.camera);