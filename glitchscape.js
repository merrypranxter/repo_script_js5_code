export function render(ctx, grid, time, repos, input, mouse, canvas, THREE) {
    if (!canvas.__three) {
        try {
            if (!ctx) throw new Error("WebGL 2 context not available");
            
            const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
            camera.position.z = 1;
            
            const vertexShader = `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `;
            
            const fragmentShader = `
                in vec2 vUv;
                out vec4 fragColor;
                
                uniform float u_time;
                uniform vec2 u_resolution;
                
                #define PI 3.14159265359
                
                float hash(float n) { return fract(sin(n) * 43758.5453123); }
                float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
                
                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
                               mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y);
                }
                
                float aaChecker(vec2 uv) {
                    vec2 w = fwidth(uv);
                    vec2 p = fract(uv * 0.5);
                    vec2 s = smoothstep(0.5 - w, 0.5 + w, p);
                    return abs(s.x - s.y);
                }
                
                float opFunnel(vec2 uv, float t) {
                    vec2 p = uv * 2.0 - 1.0;
                    p.x *= u_resolution.x / u_resolution.y;
                    
                    float r = length(p);
                    float a = atan(p.y, p.x);
                    
                    float z = 1.0 / (r + 0.05);
                    float u = a * 6.0 / PI; 
                    float v = z - t * 4.0;
                    
                    u += sin(v * 0.5 + t) * 1.5;
                    v += cos(u * 1.0 - t) * 0.5;
                    
                    float c = aaChecker(vec2(u, v));
                    
                    float rings = r * 20.0 - t * 5.0;
                    float r_w = fwidth(rings);
                    float target = smoothstep(0.5 - r_w, 0.5 + r_w, fract(rings));
                    
                    float mask = smoothstep(-0.5, 0.5, sin(a * 4.0 + t * 2.0));
                    return mix(c, target, mask);
                }
                
                vec2 glitchWarp(vec2 uv, float t) {
                    vec2 p = uv;
                    vec2 grid = floor(p * vec2(20.0, 15.0));
                    float glitchNoise = hash2(grid + floor(t * 12.0));
                    if (glitchNoise > 0.9) {
                        p.x += (hash2(grid) - 0.5) * 0.15;
                        p.y += (hash2(grid + 10.0) - 0.5) * 0.1;
                    }
                    float tear = step(0.97, hash(floor(p.y * 60.0 + t * 5.0)));
                    p.x += tear * sin(t * 20.0 + p.y * 100.0) * 0.08;
                    return p;
                }
                
                float sparkles(vec2 uv, float t) {
                    vec2 p = uv * 2.0 - 1.0;
                    p.x *= u_resolution.x / u_resolution.y;
                    
                    float c = cos(t * 0.2); float s = sin(t * 0.2);
                    p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
                    
                    vec2 grid = floor(p * 15.0);
                    vec2 local = fract(p * 15.0) - 0.5;
                    
                    float h = hash2(grid);
                    if (h > 0.6) {
                        float blink = sin(t * 12.0 + h * 100.0) * 0.5 + 0.5;
                        float star = 0.003 / (abs(local.x * local.y) + 0.001);
                        star *= smoothstep(0.5, 0.0, length(local));
                        return clamp(star * blink, 0.0, 1.0);
                    }
                    return 0.0;
                }
                
                float sdStar5(vec2 p, float r, float rf) {
                    const vec2 k1 = vec2(0.809016994375, -0.587785252292);
                    const vec2 k2 = vec2(-k1.x, k1.y);
                    p.x = abs(p.x);
                    p -= 2.0 * max(dot(k1, p), 0.0) * k1;
                    p -= 2.0 * max(dot(k2, p), 0.0) * k2;
                    p.x = abs(p.x);
                    p.y -= r;
                    vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
                    float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
                    return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
                }
                
                vec3 drawUI(vec2 p, vec2 center, vec2 size, vec3 bgCol, float t) {
                    vec2 d = abs(p - center) - size;
                    if (d.x < 0.0 && d.y < 0.0) {
                        vec3 col = bgCol;
                        if (p.y > center.y + size.y - 0.08) {
                            col = vec3(0.0, 0.0, 0.7); 
                        } else {
                            float lines = step(0.5, sin((p.y - center.y) * 100.0));
                            float mask = step(abs(p.x - center.x), size.x - 0.05);
                            col = mix(col, vec3(0.0), lines * mask * 0.15);
                            
                            if (hash2(floor(p * 30.0 + t * 10.0)) > 0.93) {
                                col = vec3(0.0, 1.0, 0.9); 
                            }
                        }
                        float bevel = max(d.x, d.y);
                        if (bevel > -0.015) col = vec3(0.9);
                        if (p.x > center.x + size.x - 0.015 || p.y < center.y - size.y + 0.015) col = vec3(0.2);
                        return col;
                    }
                    return vec3(-1.0);
                }

                void main() {
                    vec2 uv = vUv;
                    float t = u_time;
                    
                    vec2 p = uv * 2.0 - 1.0;
                    p.x *= u_resolution.x / u_resolution.y;
                    
                    vec2 guv = glitchWarp(uv, t);
                    
                    float split = 0.015 * (1.0 + sin(t * 10.0) * step(0.85, hash(t)));
                    vec2 rUV = guv + vec2(split, 0.0);
                    vec2 gUV = guv;
                    vec2 bUV = guv - vec2(split, 0.0);
                    
                    float rVal = opFunnel(rUV, t);
                    float gVal = opFunnel(gUV, t);
                    float bVal = opFunnel(bUV, t);
                    
                    vec3 colR = mix(vec3(0.02, 0.0, 0.1), vec3(1.0, 0.0, 0.8), rVal);
                    vec3 colG = mix(vec3(0.0), vec3(0.0, 1.0, 0.9), gVal);
                    vec3 colB = mix(vec3(0.1, 0.0, 0.2), vec3(0.9, 0.9, 1.0), bVal);
                    
                    vec3 col = max(colR * vec3(1.0, 0.0, 0.0), max(colG * vec3(0.0, 1.0, 0.0), colB * vec3(0.0, 0.0, 1.0)));
                    
                    float bwZone = step(0.65, noise(guv * 4.0 - t));
                    vec3 bwCol = vec3(opFunnel(guv, t));
                    col = mix(col, bwCol, bwZone * 0.6);
                    
                    float spark = sparkles(uv, t);
                    col += spark * vec3(1.0, 0.9, 0.95);
                    
                    vec2 repP = p * 6.0 + vec2(sin(t) * 0.5, t * 1.5);
                    vec2 id = floor(repP);
                    vec2 localP = fract(repP) - 0.5;
                    localP *= 1.0 + 0.3 * sin(t * 4.0 + id.x);
                    float dStar = sdStar5(localP, 0.25, 0.1);
                    if (dStar < 0.0 && hash2(id) > 0.75) {
                        col = vec3(1.0, 0.1, 0.7); 
                        if (dStar > -0.04) col = vec3(1.0); 
                    }
                    
                    vec3 ui1 = drawUI(p, vec2(0.6, 0.4), vec2(0.4, 0.25), vec3(0.8), t);
                    if (ui1.r >= 0.0) {
                        col = ui1;
                        if (hash(floor(p.y * 20.0 + t * 15.0)) > 0.85) col = vec3(1.0) - col; 
                    }
                    
                    vec3 ui2 = drawUI(p, vec2(-0.5, -0.5), vec2(0.35, 0.2), vec3(0.8), t);
                    if (ui2.r >= 0.0) col = ui2;
                    
                    float scanlines = sin(uv.y * u_resolution.y * 1.2) * 0.05;
                    col -= scanlines;
                    
                    col += smoothstep(0.7, 1.0, col) * 0.4;
                    
                    float dist = length(p);
                    col *= 1.0 - smoothstep(0.6, 1.5, dist);
                    
                    fragColor = vec4(col, 1.0);
                }
            `;
            
            const material = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                uniforms: {
                    u_time: { value: 0 },
                    u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
                },
                vertexShader,
                fragmentShader,
                depthWrite: false,
                depthTest: false
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
        material.uniforms.u_time.value = time;
        if (material.uniforms.u_resolution.value.x !== grid.width || material.uniforms.u_resolution.value.y !== grid.height) {
            material.uniforms.u_resolution.value.set(grid.width, grid.height);
        }
    }
    
    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);
}