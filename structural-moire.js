if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
        
        const rtA = new THREE.WebGLRenderTarget(grid.width, grid.height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.HalfFloatType
        });
        const rtB = new THREE.WebGLRenderTarget(grid.width, grid.height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.HalfFloatType
        });
        
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const scene = new THREE.Scene();
        const finalScene = new THREE.Scene();
        const geometry = new THREE.PlaneGeometry(2, 2);
        
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_target: { value: new THREE.Vector2(0.5, 0.5) },
                u_feedback: { value: null },
                u_decay: { value: 0.94 }
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
                
                uniform float u_time;
                uniform vec2 u_resolution;
                uniform vec2 u_target;
                uniform sampler2D u_feedback;
                uniform float u_decay;
                
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                vec2 getAspectUV(vec2 uv) {
                    vec2 p = uv * 2.0 - 1.0;
                    p.x *= u_resolution.x / u_resolution.y;
                    return p;
                }
                
                float spiral(vec2 p, float tightness, float speed, float arms) {
                    float r = length(p);
                    float angle = atan(p.y, p.x);
                    float defect = (r < 0.2) ? 3.14159 : 0.0;
                    float phase = angle + log(r + 0.001) * tightness + speed + defect;
                    return smoothstep(0.2, 0.8, sin(phase * arms) * 0.5 + 0.5);
                }
                
                float wave(vec2 p, float freq, float angle, float speed) {
                    vec2 dir = vec2(cos(angle), sin(angle));
                    return smoothstep(0.3, 0.7, sin(dot(p, dir) * freq + speed) * 0.5 + 0.5);
                }
                
                void main() {
                    vec2 p = getAspectUV(vUv);
                    vec2 targetP = getAspectUV(u_target);
                    
                    float jerk = step(0.95, fract(sin(u_time * 15.0) * 43758.5453));
                    vec2 pOffset = vec2(
                        (hash(vec2(floor(u_time * 15.0), 1.0)) - 0.5) * 0.05,
                        (hash(vec2(floor(u_time * 15.0), 2.0)) - 0.5) * 0.05
                    ) * jerk;
                    p += pOffset;
                    
                    vec2 misalign = p - targetP;
                    float dist = length(misalign);
                    float warp = smoothstep(0.0, 2.5, dist); 
                    
                    vec2 pR = p + misalign * warp * 0.15;
                    vec2 pG = p - misalign * warp * 0.2;
                    vec2 pB = p + vec2(-misalign.y, misalign.x) * warp * 0.1;
                    
                    float t = u_time * 0.3;
                    
                    float r = spiral(pR, 25.0, t * 1.0, 10.0) * wave(pR, 60.0, 0.0, t * 2.0);
                    float g = spiral(pG, 25.5, -t * 1.2, 10.0) * wave(pG, 62.0, 1.047, -t * 2.5);
                    float b = spiral(pB, 24.5, t * 0.8, 10.0) * wave(pB, 58.0, 2.094, t * 1.5);
                    
                    vec3 current = vec3(r, g, b);
                    current = smoothstep(0.05, 0.95, current);
                    current += (hash(p + u_time) - 0.5) * 0.15;
                    
                    vec2 fbUV = vUv;
                    vec2 toCenter = vUv - 0.5;
                    fbUV += toCenter * 0.003; 
                    
                    float angle = 0.001;
                    float s = sin(angle);
                    float c = cos(angle);
                    fbUV -= 0.5;
                    fbUV = vec2(fbUV.x * c - fbUV.y * s, fbUV.x * s + fbUV.y * c);
                    fbUV += 0.5;
                    
                    vec3 prev = texture(u_feedback, fbUV).rgb;
                    prev = mix(prev, prev.brg, 0.04); 
                    
                    float localDecay = clamp(u_decay + sin(u_time * 0.5) * 0.02, 0.8, 0.99);
                    vec3 moire = mix(current, prev, localDecay);
                    
                    fragColor = vec4(moire, 1.0);
                }
            `
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        
        const finalMaterial = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_texture: { value: null }
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
                uniform sampler2D u_texture;
                void main() {
                    vec3 col = texture(u_texture, vUv).rgb;
                    
                    float r = texture(u_texture, vUv + vec2(0.002, 0.0)).r;
                    float b = texture(u_texture, vUv - vec2(0.002, 0.0)).b;
                    col = vec3(r, col.g, b);
                    
                    vec2 toCenter = vUv - 0.5;
                    float vignette = 1.0 - dot(toCenter, toCenter) * 1.5;
                    col *= smoothstep(0.0, 0.5, vignette);
                    
                    col = pow(col, vec3(1.3));
                    fragColor = vec4(col, 1.0);
                }
            `
        });
        
        const finalMesh = new THREE.Mesh(geometry, finalMaterial);
        finalScene.add(finalMesh);
        
        canvas.__three = { 
            renderer, scene, finalScene, camera, 
            material, finalMaterial, rtA, rtB,
            targetX: 0.5, targetY: 0.5, pingPong: true
        };
    } catch (e) {
        console.error("WebGL Init Failed:", e);
        return;
    }
}

const env = canvas.__three;
if (!env) return;

if (env.rtA.width !== grid.width || env.rtA.height !== grid.height) {
    env.renderer.setSize(grid.width, grid.height, false);
    env.rtA.setSize(grid.width, grid.height);
    env.rtB.setSize(grid.width, grid.height);
    if (env.material?.uniforms?.u_resolution) {
        env.material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
}

if (mouse.isPressed) {
    env.targetX += (mouse.x / grid.width - env.targetX) * 0.1;
    env.targetY += (1.0 - mouse.y / grid.height - env.targetY) * 0.1;
} else {
    const wx = 0.5 + Math.sin(time * 0.4) * 0.3;
    const wy = 0.5 + Math.cos(time * 0.3) * 0.3;
    env.targetX += (wx - env.targetX) * 0.02;
    env.targetY += (wy - env.targetY) * 0.02;
}

if (env.material?.uniforms) {
    env.material.uniforms.u_time.value = time;
    if (env.material.uniforms.u_target) {
        env.material.uniforms.u_target.value.set(env.targetX, env.targetY);
    }
}

const readBuffer = env.pingPong ? env.rtA : env.rtB;
const writeBuffer = env.pingPong ? env.rtB : env.rtA;

if (env.material?.uniforms?.u_feedback) {
    env.material.uniforms.u_feedback.value = readBuffer.texture;
}

env.renderer.setRenderTarget(writeBuffer);
env.renderer.render(env.scene, env.camera);

if (env.finalMaterial?.uniforms?.u_texture) {
    env.finalMaterial.uniforms.u_texture.value = writeBuffer.texture;
}
env.renderer.setRenderTarget(null);
env.renderer.render(env.finalScene, env.camera);

env.pingPong = !env.pingPong;