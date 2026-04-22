if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        const vertexShader = `
            out vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            precision highp float;
            in vec2 vUv;
            out vec4 fragColor;
            
            uniform float u_time;
            uniform vec2 u_resolution;
            
            vec2 hash2(vec2 p) {
                p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
                return fract(sin(p) * 43758.5453);
            }
            
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
            }
            
            float noise(vec2 p) {
                vec2 i = floor(p); 
                vec2 f = fract(p);
                vec2 u = f*f*(3.0-2.0*f);
                return mix( mix( hash( i + vec2(0.0,0.0) ), hash( i + vec2(1.0,0.0) ), u.x),
                            mix( hash( i + vec2(0.0,1.0) ), hash( i + vec2(1.0,1.0) ), u.x), u.y);
            }
            
            float fbm(vec2 p) {
                float f = 0.0; float w = 0.5;
                for(int i=0; i<4; i++) { 
                    f += w * noise(p); 
                    p *= 2.0; 
                    w *= 0.5; 
                }
                return f;
            }
            
            float worley(vec2 uv) {
                vec2 n = floor(uv);
                vec2 f = fract(uv);
                float res = 8.0;
                for(int j=-1; j<=1; j++) {
                    for(int i=-1; i<=1; i++) {
                        vec2 g = vec2(float(i), float(j));
                        vec2 o = hash2(n + g);
                        o = 0.5 + 0.5 * sin(u_time * 0.5 + 6.2831853 * o);
                        vec2 r = g + o - f;
                        float d = max(abs(r.x), abs(r.y));
                        res = min(res, d);
                    }
                }
                return res;
            }
            
            float worleyF2F1(vec2 uv) {
                vec2 n = floor(uv);
                vec2 f = fract(uv);
                float d1 = 8.0, d2 = 8.0;
                for(int j=-1; j<=1; j++) {
                    for(int i=-1; i<=1; i++) {
                        vec2 g = vec2(float(i), float(j));
                        vec2 o = hash2(n + g);
                        o = 0.5 + 0.5 * sin(u_time * 1.5 + 6.2831853 * o);
                        vec2 r = g + o - f;
                        float d = dot(r, r);
                        if(d < d1) { d2 = d1; d1 = d; }
                        else if(d < d2) { d2 = d; }
                    }
                }
                return sqrt(d2) - sqrt(d1);
            }
            
            mat2 rot(float a) {
                float s = sin(a), c = cos(a);
                return mat2(c, -s, s, c);
            }
            
            vec2 kal(vec2 uv, float folds) {
                float angle = atan(uv.y, uv.x);
                float radius = length(uv);
                float sector = 6.2831853 / folds;
                angle = mod(angle, sector);
                angle = abs(angle - sector / 2.0);
                return vec2(cos(angle), sin(angle)) * radius;
            }
            
            vec3 neonPalette(float t) {
                vec3 a = vec3(0.5);
                vec3 b = vec3(0.5, 0.5, 0.33);
                vec3 c = vec3(2.0, 1.0, 1.0);
                vec3 d = vec3(0.5, 0.2, 0.25);
                return a + b * cos(6.2831853 * (c * t + d));
            }
            
            float halftone(vec2 fragCoord, float freq, float angle, float luma) {
                float rad = radians(angle);
                mat2 r = mat2(cos(rad), -sin(rad), sin(rad), cos(rad));
                vec2 uv_ht = r * (fragCoord / u_resolution.y) * freq;
                vec2 cell = fract(uv_ht) - 0.5;
                float dist = length(cell);
                float dotRadius = sqrt(clamp(1.0 - luma, 0.0, 1.0)) * 0.5;
                return smoothstep(dotRadius + 0.1, dotRadius - 0.1, dist);
            }
            
            vec3 scene(vec2 uv) {
                vec2 origUv = uv;
                uv *= rot(u_time * 0.05);
                uv = kal(uv, 8.0);
                uv *= rot(-u_time * 0.1);
                
                vec2 warp = vec2(fbm(uv * 3.0 + u_time), fbm(uv * 3.0 - u_time));
                vec2 warpedUv = uv + warp * 0.15;
                
                float val = fbm(warpedUv * 2.0 - u_time * 0.5) + length(origUv) * 0.5;
                vec3 col = neonPalette(val);
                
                float f2f1 = worleyF2F1(warpedUv * 6.0);
                float leopard = smoothstep(0.15, 0.25, f2f1) - smoothstep(0.4, 0.5, f2f1);
                col = mix(col, vec3(0.9, 0.0, 0.8), leopard * 0.9);
                
                float facet = worley(warpedUv * 3.0);
                float qFacet = step(0.5, fract(facet * 5.0));
                col *= 0.7 + 0.5 * qFacet; 
                
                float m = 3.0;
                float n = 5.0;
                float ch = sin(m * 3.1415 * warpedUv.x) * sin(n * 3.1415 * warpedUv.y) 
                         + sin(n * 3.1415 * warpedUv.x) * sin(m * 3.1415 * warpedUv.y);
                float lines = smoothstep(0.05, 0.0, abs(ch));
                col = mix(col, vec3(0.0, 1.0, 0.9), lines);
                
                return col;
            }
            
            void main() {
                vec2 screenUv = vUv * 2.0 - 1.0;
                screenUv.x *= u_resolution.x / u_resolution.y;
                
                vec2 uv = rot(u_time * 0.02) * screenUv;
                
                float glitchTrigger = step(0.98, hash(vec2(floor(u_time * 15.0), floor(screenUv.y * 20.0))));
                float offset = hash(vec2(floor(u_time), 1.0)) * 0.1 * glitchTrigger;
                
                vec2 dir = normalize(uv + 0.001) * 0.015;
                
                float r = scene(uv + dir + vec2(offset, 0.0)).r;
                float g = scene(uv).g;
                float b = scene(uv - dir - vec2(offset, 0.0)).b;
                vec3 col = vec3(r, g, b);
                
                if (glitchTrigger > 0.0) {
                    col += vec3(0.2);
                }
                
                float luma = dot(col, vec3(0.299, 0.587, 0.114));
                float ht = halftone(gl_FragCoord.xy, 150.0, 45.0, luma);
                col *= mix(1.0, ht, 0.25);
                
                vec2 starUv = screenUv * 15.0; 
                vec2 cell = fract(starUv) - 0.5;
                vec2 id = floor(starUv);
                float starHash = hash(id);
                if(starHash > 0.95) {
                    float star = smoothstep(0.05, 0.0, abs(cell.x)) * smoothstep(0.4, 0.0, abs(cell.y)) +
                                 smoothstep(0.05, 0.0, abs(cell.y)) * smoothstep(0.4, 0.0, abs(cell.x));
                    star *= smoothstep(0.0, 0.5, sin(u_time * 5.0 + starHash * 100.0) * 0.5 + 0.5);
                    col += star * vec3(1.0, 0.9, 1.0) * 2.0;
                }
                
                float grain = hash(uv * u_resolution.y + u_time);
                col = mix(col, col * grain, 0.15);
                
                col *= smoothstep(1.8, 0.4, length(screenUv));
                
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

if (material?.uniforms?.u_time) {
    material.uniforms.u_time.value = time;
}
if (material?.uniforms?.u_resolution) {
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);