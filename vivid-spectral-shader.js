try {
    if (!canvas.__three) {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        const vertexShader = `
            out vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position.xy, 0.0, 1.0);
            }
        `;
        
        const fragmentShader = `
            in vec2 vUv;
            out vec4 fragColor;
            
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform vec2 u_mouse;
            
            mat2 rot(float a) {
                float s = sin(a), c = cos(a);
                return mat2(c, -s, s, c);
            }

            float hash(vec2 p) {
                p = fract(p * vec2(123.34, 456.21));
                p += dot(p, p + 45.32);
                return fract(p.x * p.y);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                           mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
            }

            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                mat2 r = rot(0.5);
                for (int i = 0; i < 5; i++) {
                    v += a * noise(p);
                    p = r * p * 2.0;
                    a *= 0.5;
                }
                return v;
            }

            vec3 thinFilm(float cosTheta, float thickness) {
                float n = 1.4;
                float sinThetaI2 = 1.0 - cosTheta * cosTheta;
                float sinThetaT2 = sinThetaI2 / (n * n);
                float cosThetaT = sqrt(max(1.0 - sinThetaT2, 0.0));
                float pathDiff = 2.0 * n * thickness * cosThetaT;
                vec3 phase = vec3(0.0, 0.33, 0.67);
                return 0.5 + 0.5 * cos(6.28318 * (pathDiff + phase));
            }

            vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
                return a + b * cos(6.28318 * (c * t + d));
            }

            vec3 paletteTetragrammaton(float t) {
                return palette(t, vec3(0.5, 0.4, 0.1), vec3(0.5, 0.4, 0.1), vec3(1.0, 0.7, 0.4), vec3(0.0, 0.15, 0.20));
            }

            vec3 paletteTheWhirring(float t) {
                return palette(t, vec3(0.2, 0.5, 0.6), vec3(0.2, 0.4, 0.4), vec3(2.0, 1.0, 1.0), vec3(0.0, 0.25, 0.5));
            }

            vec3 paletteTheOceanMath(float t) {
                return palette(t, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(1.0, 0.7, 0.4), vec3(0.0, 0.15, 0.25));
            }

            vec3 opRadial(vec3 p, float folds) {
                float a = atan(p.z, p.x);
                float r = length(p.xz);
                float w = 6.2831853 / folds;
                a = mod(a + w/2.0, w) - w/2.0;
                p.xz = vec2(cos(a), sin(a)) * r;
                return p;
            }

            float sdGyroid(vec3 p, float scale) {
                p *= scale;
                return abs(dot(sin(p), cos(p.zxy))) / scale - 0.03;
            }

            float sdTorus(vec3 p, vec2 t) {
                vec2 q = vec2(length(p.xz)-t.x, p.y);
                return length(q)-t.y;
            }

            float theWhirring(vec3 p) {
                vec3 p1 = p;
                p1.xz *= rot(u_time * 1.2);
                float ring1 = sdTorus(p1, vec2(3.0, 0.05));
                
                vec3 p2 = p;
                p2.yz *= rot(u_time * 0.5);
                p2.xz *= rot(u_time * -0.7);
                float ring2 = sdTorus(p2, vec2(3.5, 0.04));
                
                vec3 p3 = p;
                p3.xy *= rot(u_time * 0.4);
                float ring3 = sdTorus(p3, vec2(4.0, 0.03));
                
                return min(ring1, min(ring2, ring3));
            }

            vec2 opU(vec2 d1, vec2 d2) {
                return (d1.x < d2.x) ? d1 : d2;
            }

            vec2 map(vec3 p) {
                // 1: Tetragrammaton (Sacred Geometry + Gyroid)
                vec3 pTetra = p;
                pTetra.xz *= rot(u_time * 0.2);
                pTetra = opRadial(pTetra, 4.0);
                pTetra.x -= 1.5;
                pTetra.xy *= rot(u_time * 0.5);
                vec3 boxD = abs(pTetra) - vec3(0.5);
                float box = min(max(boxD.x, max(boxD.y, boxD.z)), 0.0) + length(max(boxD, 0.0));
                float gyr = sdGyroid(pTetra, 6.0);
                float d1 = max(box, gyr);
                
                // 2: Ocean/Math (Mycelial Substrate)
                float height = fbm(p.xz * 0.5 + u_time * 0.2) * 1.5;
                float ocean = p.y + 3.0 - height;
                
                // 3: The Whirring (Orbiting Rings)
                float d3 = theWhirring(p);
                
                vec2 res = vec2(d1, 1.0);
                res = opU(res, vec2(ocean, 2.0));
                res = opU(res, vec2(d3, 3.0));
                
                return res;
            }

            vec3 calcNormal(vec3 p) {
                vec2 e = vec2(0.002, 0.0);
                return normalize(vec3(
                    map(p + e.xyy).x - map(p - e.xyy).x,
                    map(p + e.yxy).x - map(p - e.yxy).x,
                    map(p + e.yyx).x - map(p - e.yyx).x
                ));
            }

            float mycelium(vec2 p) {
                float f = fbm(p * 5.0);
                f = abs(f - 0.5) * 2.0;
                return 1.0 - f;
            }

            void main() {
                vec2 uv = vUv;
                
                // DAMAGE: Tearing / Sync Instability (Analog Video Failure)
                float tracking = noise(vec2(u_time * 2.0, uv.y * 15.0));
                float tear = smoothstep(0.8, 1.0, tracking) * 0.1 * sin(u_time * 20.0);
                uv.x += tear;
                
                // DAMAGE: Macroblocking Datamosh (Codec Breakage)
                float blockNoise = noise(floor(uv * 40.0) + u_time * 0.5);
                if(blockNoise > 0.85) {
                    uv = floor(uv * 40.0) / 40.0;
                }

                vec2 p = (uv - 0.5) * 2.0;
                p.x *= u_resolution.x / u_resolution.y;
                
                // Camera & Interaction
                vec2 m = (u_mouse - 0.5) * 2.0;
                vec3 ro = vec3(0.0, 1.5, -6.0);
                ro.xz *= rot(m.x * 2.0);
                ro.yz *= rot(m.y * 1.0);
                
                vec3 ta = vec3(0.0, 0.0, 0.0);
                vec3 cw = normalize(ta - ro);
                vec3 cu = normalize(cross(cw, vec3(0.0, 1.0, 0.0)));
                vec3 cv = normalize(cross(cu, cw));
                vec3 rd = normalize(p.x * cu + p.y * cv + 1.2 * cw);
                
                float t = 0.0;
                float m_id = -1.0;
                for(int i = 0; i < 120; i++) {
                    vec3 pos = ro + rd * t;
                    vec2 res = map(pos);
                    if(res.x < 0.002) {
                        m_id = res.y;
                        break;
                    }
                    if(t > 35.0) break;
                    t += res.x * 0.5; // Step reduction for complex gyroid geometry
                }
                
                vec3 col = vec3(0.05, 0.02, 0.08); // The Void
                
                if(t < 35.0) {
                    vec3 pos = ro + rd * t;
                    vec3 n = calcNormal(pos);
                    vec3 v = -rd;
                    float cosTheta = max(dot(n, v), 0.0);
                    
                    if (m_id == 1.0) {
                        // Tetragrammaton with Structural Color & Mycelial thickness
                        float myc = mycelium(pos.xy * 2.0 + pos.z);
                        vec3 irid = thinFilm(cosTheta, 0.4 + myc * 1.5);
                        vec3 base = paletteTetragrammaton(pos.y + u_time * 0.5);
                        col = mix(base, irid, 0.7) * max(dot(n, normalize(vec3(1,2,-1))), 0.2);
                        float fr = pow(1.0 - cosTheta, 3.0);
                        col += vec3(1.0, 0.8, 0.2) * fr * 0.6; // Halation / Bloom
                    } else if (m_id == 2.0) {
                        // Ocean / Math
                        float t_pal = pos.y * 0.5 + u_time * 0.04;
                        vec3 base = paletteTheOceanMath(t_pal);
                        float sss = smoothstep(-1.0, -3.0, pos.y);
                        col = base * (0.2 + 0.8 * sss); // Lit from below
                        // Bioluminescent foxfire (Panellus stipticus)
                        float foxfire = smoothstep(0.7, 1.0, mycelium(pos.xz * 3.0 - u_time * 0.2));
                        col += vec3(0.02, 0.95, 0.48) * foxfire * 1.5;
                    } else if (m_id == 3.0) {
                        // The Whirring
                        col = paletteTheWhirring(pos.x + u_time) * 1.2;
                        col *= 0.8 + 0.2 * sin(u_time * 15.0);
                    }
                } else {
                    // Broadcast Signal Snow in the Void
                    float snow = hash(uv * u_time) * 0.05;
                    col += vec3(snow);
                }
                
                // DAMAGE: Chroma bleed & Retrofuturism Vaporwave hues
                float ca = 0.015 * smoothstep(0.0, 1.0, length(uv - 0.5));
                col.r += noise(uv * 80.0 + u_time) * 0.08;
                col.b -= noise(uv * 80.0 - u_time) * 0.08;
                
                // DAMAGE: CRT Scanlines & Phosphor Bloom
                float scanline = sin(uv.y * u_resolution.y * 3.14159) * 0.04;
                col -= scanline;
                
                float vignette = length(vUv - 0.5);
                col *= 1.0 - vignette * 0.6;
                col += vec3(0.4, 0.0, 0.6) * (1.0 - vignette) * 0.4; // Phosphor bloom
                
                // Tonemapping & Saturation boost
                col = pow(col, vec3(1.0/2.2));
                col = smoothstep(0.0, 1.0, col); 
                col *= 1.2; 
                
                fragColor = vec4(col, 1.0);
            }
        `;
        
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader,
            fragmentShader,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
            },
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
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
    
    const targetX = (mouse && mouse.x) ? mouse.x / grid.width : 0.5;
    const targetY = (mouse && mouse.y) ? 1.0 - (mouse.y / grid.height) : 0.5;
    const currX = material.uniforms.u_mouse.value.x;
    const currY = material.uniforms.u_mouse.value.y;
    
    material.uniforms.u_mouse.value.set(
        currX + (targetX - currX) * 0.1,
        currY + (targetY - currY) * 0.1
    );
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);
} catch (err) {
    console.error("Error executing shader:", err);
}