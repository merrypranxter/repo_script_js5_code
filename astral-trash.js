if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");

        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
        camera.position.z = 1;

        const textCanvas = document.createElement('canvas');
        textCanvas.width = 2048;
        textCanvas.height = 2048;
        const tCtx = textCanvas.getContext('2d');

        tCtx.fillStyle = '#000000';
        tCtx.fillRect(0, 0, 2048, 2048);

        for(let i = 0; i < 6000; i++) {
            tCtx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.15})`;
            let x = Math.random() * 2048;
            let y = Math.random() * 2048;
            let w = Math.random() * 120;
            let h = Math.random() * 15;
            tCtx.fillRect(x, y, w, h);
        }

        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        tCtx.font = 'italic 900 290px "Arial Black", Impact, sans-serif';

        tCtx.filter = 'blur(80px)';
        tCtx.fillStyle = '#FFFFFF';
        tCtx.fillText("ASTRAL", 1024, 760);
        tCtx.fillText("TRASH", 1024, 1240);

        tCtx.filter = 'blur(25px)';
        tCtx.fillText("ASTRAL", 1024, 760);
        tCtx.fillText("TRASH", 1024, 1240);

        tCtx.filter = 'none';
        tCtx.fillText("ASTRAL", 1024, 760);
        tCtx.fillText("TRASH", 1024, 1240);

        for(let i = 0; i < 400; i++) {
            let x = 300 + Math.random() * 1448;
            let y = 800 + Math.random() * 700;
            let w = 4 + Math.random() * 12;
            let h = 50 + Math.random() * 400;
            tCtx.fillRect(x, y, w, h);
        }

        for(let i = 0; i < 1500; i++) {
            let cx = 1024 + (Math.random() - 0.5) * 1800;
            let cy = 1000 + (Math.random() - 0.5) * 1200;
            let r = Math.random() * 18;
            tCtx.beginPath();
            tCtx.arc(cx, cy, r, 0, Math.PI * 2);
            tCtx.fill();
        }

        const textTex = new THREE.CanvasTexture(textCanvas);
        textTex.needsUpdate = true;
        textTex.minFilter = THREE.LinearFilter;
        textTex.magFilter = THREE.LinearFilter;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_textTex: { value: textTex }
            },
            vertexShader: `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;
                in vec2 vUv;
                out vec4 fragColor;

                uniform float u_time;
                uniform vec2 u_resolution;
                uniform sampler2D u_textTex;

                float hash(vec2 p) {
                    p = fract(p * vec2(123.34, 456.21));
                    p += dot(p, p + 45.32);
                    return fract(p.x * p.y);
                }

                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    float a = hash(i);
                    float b = hash(i + vec2(1.0, 0.0));
                    float c = hash(i + vec2(0.0, 1.0));
                    float d = hash(i + vec2(1.0, 1.0));
                    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
                }

                float fbm(vec2 p) {
                    float v = 0.0;
                    float a = 0.5;
                    mat2 rot = mat2(0.866, -0.5, 0.5, 0.866);
                    for (int i = 0; i < 5; i++) {
                        v += a * noise(p);
                        p = rot * p * 2.0;
                        a *= 0.5;
                    }
                    return v;
                }

                vec2 curl(vec2 p, float t) {
                    float eps = 0.05;
                    float dy = (noise(p + vec2(0.0, eps) + t) - noise(p - vec2(0.0, eps) + t)) / (2.0 * eps);
                    float dx = (noise(p + vec2(eps, 0.0) + t) - noise(p - vec2(eps, 0.0) + t)) / (2.0 * eps);
                    return vec2(dy, -dx);
                }

                vec3 neonInterference(float thickness) {
                    float n = 1.5;
                    float d = mix(50.0, 900.0, clamp(thickness, 0.0, 1.0));
                    float pathDiff = 2.0 * n * d; 
                    vec3 lambda = vec3(650.0, 530.0, 440.0); 
                    vec3 phase = 6.28318 * (pathDiff / lambda);
                    vec3 I = 0.5 + 0.5 * cos(phase);
                    
                    float maxC = max(I.r, max(I.g, I.b));
                    float minC = min(I.r, min(I.g, I.b));
                    vec3 sat = (I - minC) / (maxC - minC + 0.001);
                    
                    float pulse = 0.5 + 0.5 * sin(thickness * 18.0);
                    return sat * (0.3 + 0.7 * pulse);
                }

                void main() {
                    vec2 p = (vUv - 0.5) * 2.0;
                    p.x *= u_resolution.x / u_resolution.y;
                    
                    float t_slow = u_time * 0.12;
                    float t_med = u_time * 0.5;
                    float t_fast = u_time * 6.0;
                    
                    vec2 warp = p;
                    for(int i = 0; i < 3; i++) {
                        warp += curl(warp * 2.2, t_med + float(i) * 1.5) * 0.15;
                    }
                    
                    vec2 textUV = vUv + (warp - p) * 0.06;
                    textUV.y = 1.0 - textUV.y; 
                    
                    float textMask = 0.0;
                    if(textUV.x > 0.0 && textUV.x < 1.0 && textUV.y > 0.0 && textUV.y < 1.0) {
                        textMask = texture(u_textTex, textUV).r;
                    }
                    
                    float baseThick = fbm(warp * 3.5 - t_slow);
                    float shimmer = (hash(p * 350.0 + t_fast) - 0.5) * 0.12;
                    float thickness = baseThick + textMask * 0.7 + shimmer;
                    
                    vec3 col = neonInterference(thickness);
                    
                    float density = fbm(p * 1.8 + t_slow * 0.5) * 0.4 + textMask * 1.6;
                    float voidMask = smoothstep(0.25, 0.75, density);
                    col *= voidMask;
                    
                    float eps = 0.01;
                    float tx = fbm((warp + vec2(eps, 0.0)) * 3.5 - t_slow);
                    float ty = fbm((warp + vec2(0.0, eps)) * 3.5 - t_slow);
                    
                    vec3 normal = normalize(vec3((tx - baseThick) * 15.0, (ty - baseThick) * 15.0, 0.15));
                    vec3 lightDir = normalize(vec3(1.0, 1.2, 1.8));
                    float diff = max(0.0, dot(normal, lightDir));
                    
                    vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
                    vec3 halfDir = normalize(lightDir + viewDir);
                    float spec = pow(max(0.0, dot(normal, halfDir)), 24.0);
                    
                    vec3 specCol = mix(vec3(0.0, 1.0, 1.0), vec3(1.0, 0.0, 1.0), fbm(p * 8.0 + t_med));
                    col = col * (0.3 + 0.7 * diff) + spec * specCol * voidMask;
                    
                    float edge = smoothstep(0.02, 0.12, textMask) - smoothstep(0.12, 0.25, textMask);
                    col += edge * vec3(1.0, 1.0, 0.0) * (0.4 + 0.6 * sin(t_fast + p.x * 25.0 + p.y * 15.0));
                    
                    float vig = length(p);
                    col *= smoothstep(1.9, 0.4, vig);
                    
                    fragColor = vec4(col, 1.0);
                }
            `
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