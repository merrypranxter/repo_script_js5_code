if (!canvas.__three) {
    try {
        const gl = canvas.getContext('webgl2', { alpha: true, antialias: false });
        if (!gl) throw new Error("WebGL 2 not supported or context occupied");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: false });
        renderer.setPixelRatio(1);
        
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;
        
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
                u_isPressed: { value: 0.0 }
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
                uniform vec2 u_mouse;
                uniform float u_isPressed;
                
                // Bayer 4x4 Dither Matrix for Ditherpunk aesthetic
                const float bayer4[16] = float[16](
                    0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
                   12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
                    3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
                   15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
                );

                // Lisa Frank Hyper-Saturated Palette
                const vec3 palette[8] = vec3[8](
                    vec3(1.0, 0.0, 0.5),    // 0: Neon Pink
                    vec3(0.0, 1.0, 1.0),    // 1: Cyan
                    vec3(1.0, 1.0, 0.0),    // 2: Yellow
                    vec3(0.6, 0.0, 1.0),    // 3: Purple
                    vec3(0.2, 1.0, 0.1),    // 4: Lime
                    vec3(1.0, 0.4, 0.0),    // 5: Orange
                    vec3(1.0, 1.0, 1.0),    // 6: White (Spores)
                    vec3(0.05, 0.05, 0.15)  // 7: Dark Navy (Outline/Void)
                );

                // Nearest-color palette snapping with luma weighting
                vec3 nearestPalette(vec3 col) {
                    vec3 best = palette[0];
                    float bestDist = 1000.0;
                    vec3 weight = vec3(0.299, 0.587, 0.114);
                    for(int i=0; i<8; i++) {
                        vec3 p = palette[i];
                        vec3 diff = col - p;
                        float d = dot(diff * diff, weight);
                        if(d < bestDist) {
                            bestDist = d;
                            best = p;
                        }
                    }
                    return best;
                }

                // Procedural Noise Functions
                vec2 hash2(vec2 p) {
                    p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
                    return fract(sin(p)*43758.5453123);
                }
                
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }

                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    vec2 u = f * f * (3.0 - 2.0 * f);
                    return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
                }

                float fbm(vec2 p) {
                    float v = 0.0;
                    float a = 0.5;
                    for(int i=0; i<4; i++) {
                        v += a * noise(p);
                        p *= 2.0;
                        a *= 0.5;
                    }
                    return v;
                }

                // Cellular noise for fungal spores
                float worley(vec2 p) {
                    vec2 n = floor(p);
                    vec2 f = fract(p);
                    float md = 10.0;
                    float md2 = 10.0;
                    for(int y=-1; y<=1; y++) {
                        for(int x=-1; x<=1; x++) {
                            vec2 g = vec2(float(x), float(y));
                            vec2 o = hash2(n + g);
                            o = 0.5 + 0.5*sin(u_time*1.5 + 6.2831*o); 
                            vec2 r = g + o - f;
                            float d = length(r);
                            if(d < md) {
                                md2 = md;
                                md = d;
                            } else if(d < md2) {
                                md2 = d;
                            }
                        }
                    }
                    return md2 - md;
                }

                // Base UV mapping with Golden Ratio rotation
                vec2 getBaseUV(vec2 p_in) {
                    vec2 u = (p_in - 0.5) * 2.0;
                    u.x *= u_resolution.x / u_resolution.y;
                    u *= 10.0; 
                    
                    float theta = u_time * 0.1;
                    mat2 rot = mat2(cos(theta), -sin(theta), sin(theta), cos(theta));
                    u = rot * u;
                    u += u_time * vec2(0.5, 0.3);
                    return u;
                }

                // 5-fold Penrose Quasicrystal generation
                vec3 qc_color(vec2 u) {
                    vec3 col = vec3(0.0);
                    float phi = 1.6180339887;
                    for(int i=0; i<5; i++) {
                        float angle = float(i) * 3.14159265359 / 5.0;
                        vec2 dir = vec2(cos(angle), sin(angle));
                        float phase = u_time * phi; 
                        float wave = cos(dot(u, dir) + phase) * 0.5 + 0.5;
                        wave = smoothstep(0.2, 0.8, wave);
                        
                        vec3 dirCol;
                        if(i==0) dirCol = palette[0];
                        else if(i==1) dirCol = palette[1];
                        else if(i==2) dirCol = palette[2];
                        else if(i==3) dirCol = palette[3];
                        else dirCol = palette[4];
                        
                        col += dirCol * wave;
                    }
                    return col / 2.5; 
                }

                // The Strange Mechanism: Fungal Quasicrystal Infection
                vec3 getRawColor(vec2 p_in) {
                    vec2 u = getBaseUV(p_in);
                    
                    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
                    float distToMouse = distance(p_in * aspect, u_mouse * aspect);
                    float bloom = smoothstep(0.3, 0.0, distToMouse) * u_isPressed * 5.0;
                    
                    // Machine hesitation / glitch pulsing
                    float hesitation = step(0.95, fract(sin(u_time * 12.0) * 43758.5453));
                    float warpPulse = (sin(u_time * 0.5) * 0.5 + 0.5) * 2.0 + hesitation * 2.0 + bloom;
                    
                    vec2 warp = vec2(fbm(u + u_time), fbm(u - u_time*0.8));
                    u += warp * warpPulse; 
                    
                    vec3 c = qc_color(u);
                    
                    // Fungal Spores (Lisa Frank Leopard Spots)
                    float sporePulse = (cos(u_time * 0.7) * 0.5 + 0.5);
                    float w = worley(u * 0.5);
                    if (w < 0.15 * sporePulse) {
                        c = mix(c, palette[6], 1.0 - w/(0.15 * sporePulse)); 
                    }
                    
                    return c;
                }

                void main() {
                    // Pixel Grid Lock
                    float pixelSize = max(1.0, floor(u_resolution.x / 256.0));
                    vec2 virtualRes = floor(u_resolution / pixelSize);
                    vec2 fc = floor(vUv * virtualRes);
                    vec2 p = (fc + 0.5) / virtualRes;
                    
                    vec2 px = 1.0 / virtualRes;
                    
                    // Sample raw continuous field for edge detection
                    vec3 raw_center = getRawColor(p);
                    vec3 raw_up = getRawColor(p + vec2(0.0, px.y));
                    vec3 raw_down = getRawColor(p - vec2(0.0, px.y));
                    vec3 raw_left = getRawColor(p - vec2(px.x, 0.0));
                    vec3 raw_right = getRawColor(p + vec2(px.x, 0.0));
                    
                    // Snap to macro palette
                    vec3 m_center = nearestPalette(raw_center);
                    vec3 m_up = nearestPalette(raw_up);
                    vec3 m_down = nearestPalette(raw_down);
                    vec3 m_left = nearestPalette(raw_left);
                    vec3 m_right = nearestPalette(raw_right);
                    
                    // 1px Hard Outline detection (Sobel-ish morphological filter)
                    float edge = 0.0;
                    if(distance(m_center, m_up) > 0.1) edge += 1.0;
                    if(distance(m_center, m_down) > 0.1) edge += 1.0;
                    if(distance(m_center, m_left) > 0.1) edge += 1.0;
                    if(distance(m_center, m_right) > 0.1) edge += 1.0;
                    
                    // Apply Ordered Dithering to the center pixel
                    int bx = int(fc.x) % 4;
                    int by = int(fc.y) % 4;
                    float bayerVal = bayer4[by * 4 + bx];
                    vec3 dithered = raw_center + (bayerVal - 0.5) * 0.3;
                    vec3 c_center = nearestPalette(dithered);
                    
                    // Composite outline over dithered result
                    vec3 finalColor = edge > 0.5 ? palette[7] : c_center;
                    
                    fragColor = vec4(finalColor, 1.0);
                }
            `
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        
        canvas.__three = { renderer, scene, camera, material };
    } catch (e) {
        console.error("WebGL Initialization Failed:", e);
        return;
    }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material && material.uniforms) {
    if (material.uniforms.u_time) {
        material.uniforms.u_time.value = time;
    }
    if (material.uniforms.u_resolution) {
        material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
    if (material.uniforms.u_mouse) {
        material.uniforms.u_mouse.value.set(mouse.x / grid.width, 1.0 - mouse.y / grid.height);
    }
    if (material.uniforms.u_isPressed) {
        material.uniforms.u_isPressed.value = mouse.isPressed ? 1.0 : 0.0;
    }
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);