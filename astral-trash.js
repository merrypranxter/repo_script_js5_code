if (!canvas.__textTex) {
    const tCanv = document.createElement('canvas');
    tCanv.width = 1024;
    tCanv.height = 1024;
    const tCtx = tCanv.getContext('2d');
    
    tCtx.fillStyle = '#000';
    tCtx.fillRect(0, 0, 1024, 1024);
    
    tCtx.strokeStyle = '#fff';
    tCtx.lineWidth = 3;
    for(let i = 1; i <= 15; i++) {
        tCtx.beginPath();
        tCtx.arc(512, 512, i * i * 3, 0, Math.PI * 2);
        tCtx.stroke();
        
        tCtx.beginPath();
        tCtx.arc(256, 512, i * 20, 0, Math.PI * 2);
        tCtx.stroke();
        
        tCtx.beginPath();
        tCtx.arc(768, 512, i * 20, 0, Math.PI * 2);
        tCtx.stroke();
    }
    
    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'middle';
    tCtx.font = '900 140px "Arial Black", sans-serif';
    tCtx.shadowColor = '#fff';
    tCtx.shadowBlur = 40;
    tCtx.fillStyle = '#fff';
    
    tCtx.fillText('ASTRAL', 512, 400);
    tCtx.fillText('TRASH', 512, 620);
    
    tCtx.shadowBlur = 0;
    tCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    tCtx.fillText('ASTRAL', 518, 400);
    tCtx.fillText('TRASH', 506, 620);
    
    const tex = new THREE.CanvasTexture(tCanv);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    canvas.__textTex = tex;
}

if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
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
            in vec2 vUv;
            out vec4 fragColor;
            
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform sampler2D u_text;
            
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
                    u.y
                );
            }
            
            float fbm(vec2 p) {
                float s = 0.0, a = 0.5;
                for(int i = 0; i < 5; i++) {
                    s += a * noise(p);
                    p *= 2.0;
                    a *= 0.5;
                }
                return s;
            }
            
            vec2 curl(vec2 p, float t) {
                float e = 0.01;
                float n1 = fbm(p + vec2(0.0, e) + t);
                float n2 = fbm(p - vec2(0.0, e) + t);
                float n3 = fbm(p + vec2(e, 0.0) + t);
                float n4 = fbm(p - vec2(e, 0.0) + t);
                return vec2(n1 - n2, n4 - n3) / (2.0 * e);
            }
            
            float getField(vec2 uv, float t_slow, float t_med, float t_fast, out float textMask) {
                vec2 p = uv * 2.0 - 1.0;
                p.x *= u_resolution.x / u_resolution.y;
                
                vec2 flow = curl(p * 1.5, t_slow);
                vec2 p2 = p + flow * 0.15;
                flow += curl(p2 * 3.0, t_slow * 1.2) * 0.1;
                
                vec2 textUv = uv + flow * 0.04;
                textMask = texture(u_text, textUv).r;
                
                float phase = fbm(p2 * 4.0 - t_med);
                float sync = sin(phase * 20.0 + t_fast);
                
                float height = exp(-abs(sync) * 4.0) * 0.4; 
                height += textMask * 0.7; 
                height += fbm(p * 12.0 + t_med) * 0.15; 
                
                return height;
            }
            
            void main() {
                float t_slow = u_time * 0.05;
                float t_med  = u_time * 0.2;
                float t_fast = u_time * 1.5;
                
                float textMask;
                float height = getField(vUv, t_slow, t_med, t_fast, textMask);
                
                float eps = 0.005;
                float dum;
                float hx = getField(vUv + vec2(eps, 0.0), t_slow, t_med, t_fast, dum);
                float hy = getField(vUv + vec2(0.0, eps), t_slow, t_med, t_fast, dum);
                vec3 normal = normalize(vec3(height - hx, height - hy, eps * 3.0));
                
                vec3 lightDir = normalize(vec3(sin(t_slow * 2.0), 1.0, cos(t_slow * 2.0)));
                float diff = max(dot(normal, lightDir), 0.0);
                vec3 viewDir = vec3(0.0, 0.0, 1.0);
                float spec = pow(max(dot(reflect(-lightDir, normal), viewDir), 0.0), 32.0);
                
                float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
                float opd = height * 6.0 + fresnel * 4.0 - t_med * 2.0;
                
                vec3 cmy = vec3(0.0);
                cmy += vec3(0.0, 1.0, 1.0) * pow(sin(opd * 3.14) * 0.5 + 0.5, 2.0);
                cmy += vec3(1.0, 0.0, 1.0) * pow(sin(opd * 3.14 + 2.094) * 0.5 + 0.5, 2.0);
                cmy += vec3(1.0, 1.0, 0.0) * pow(sin(opd * 3.14 + 4.188) * 0.5 + 0.5, 2.0);
                cmy *= 1.2; 
                
                vec3 color = cmy * (diff * 0.7 + 0.3) + spec * vec3(1.0);
                
                vec3 bg = vec3(0.02, 0.00, 0.03);
                float emission = smoothstep(0.15, 0.7, height + diff * 0.2);
                color = mix(bg, color, emission);
                
                vec2 p = vUv * 2.0 - 1.0;
                color += cmy * textMask * 0.6 * (sin(t_fast * 3.0 + p.x * 15.0) * 0.5 + 0.5);
                
                float noiseGlint = hash(vUv * 800.0 + t_fast);
                color += noiseGlint * 0.2 * textMask;
                
                color = color / (1.0 + color);
                color = pow(color, vec3(1.0 / 2.2));
                
                fragColor = vec4(color, 1.0);
            }
        `;
        
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader,
            fragmentShader,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_text: { value: canvas.__textTex }
            }
        });
        
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);
        
        canvas.__three = { renderer, scene, camera, material };
    } catch (e) {
        console.error("WebGL Initialization Failed:", e);
        return;
    }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material && material.uniforms) {
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);