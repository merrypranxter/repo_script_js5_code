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
                gl_Position = vec4(position, 1.0);
            }
        `;
        
        const fragmentShader = `
            precision highp float;
            uniform float u_time;
            uniform vec2 u_resolution;
            out vec4 fragColor;
            
            #define MAX_ITER 150
            #define PI 3.14159265359

            // Hash & Noise for Mycelial/Glitch mutations
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

            // Neon Acid Palette (Psychedelic Pop Style)
            vec3 cosinePaletteNeon(float t) {
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.33);
                vec3 c = vec3(2.0, 1.0, 1.0);
                vec3 d = vec3(0.5, 0.2, 0.25);
                return a + b * cos(6.2831853 * (c * t + d));
            }

            // Spectral Wavelength to RGB (Structural Color Physics)
            vec3 wavelengthToRGB(float W) {
                vec3 c = vec3(0.0);
                if (W >= 380.0 && W < 440.0) c = vec3(-(W-440.0)/(440.0-380.0), 0.0, 1.0);
                else if (W >= 440.0 && W < 490.0) c = vec3(0.0, (W-440.0)/(490.0-440.0), 1.0);
                else if (W >= 490.0 && W < 510.0) c = vec3(0.0, 1.0, -(W-510.0)/(510.0-490.0));
                else if (W >= 510.0 && W < 580.0) c = vec3((W-510.0)/(580.0-510.0), 1.0, 0.0);
                else if (W >= 580.0 && W < 645.0) c = vec3(1.0, -(W-645.0)/(645.0-580.0), 0.0);
                else if (W >= 645.0 && W <= 780.0) c = vec3(1.0, 0.0, 0.0);
                
                float factor = 1.0;
                if (W >= 380.0 && W < 420.0) factor = 0.3 + 0.7*(W-380.0)/(420.0-380.0);
                else if (W >= 700.0 && W <= 780.0) factor = 0.3 + 0.7*(780.0-W)/(780.0-700.0);
                
                return c * factor;
            }

            // Thin-Film Interference for Iridescence
            vec3 thinFilmInterference(float thickness, float cosTheta) {
                float n_film = 1.56; // Chitin / fungal cell wall refractive index
                float sinThetaI2 = 1.0 - cosTheta * cosTheta;
                float sinThetaT2 = sinThetaI2 / (n_film * n_film);
                float cosThetaT = sqrt(max(0.0, 1.0 - sinThetaT2));
                float pathDiff = 2.0 * n_film * thickness * cosThetaT;
                
                vec3 color = vec3(0.0);
                for (int i = 0; i < 8; i++) {
                    float fi = float(i);
                    float lambda = mix(400.0, 700.0, fi / 7.0);
                    float phase = (pathDiff / lambda) * 6.2831853;
                    float intensity = 0.5 + 0.5 * cos(phase);
                    color += wavelengthToRGB(lambda) * intensity;
                }
                return color / 8.0;
            }

            // Psychedelic Eye-Flower Pattern for the Interior
            vec3 getFlowerPattern(vec2 uv) {
                vec2 gv = fract(uv * 4.0) - 0.5;
                vec2 id = floor(uv * 4.0);
                
                // Curvilinear Motion (Psychedelic Pop)
                float rotAngle = u_time * 0.5 + id.x;
                float cRot = cos(rotAngle), sRot = sin(rotAngle);
                gv = vec2(gv.x * cRot - gv.y * sRot, gv.x * sRot + gv.y * cRot);
                
                float r = length(gv);
                float a = atan(gv.y, gv.x);
                
                float petals = 0.35 + 0.1 * sin(8.0 * a + u_time * 2.0);
                float flowerMask = 1.0 - smoothstep(petals - 0.02, petals, r);
                
                vec2 look = vec2(sin(u_time * 3.0 + id.x), cos(u_time * 2.5 + id.y)) * 0.06;
                float sclera = 1.0 - smoothstep(0.14, 0.16, r);
                float iris = 1.0 - smoothstep(0.06, 0.08, length(gv - look));
                float pupil = 1.0 - smoothstep(0.02, 0.03, length(gv - look));
                
                vec3 col = vec3(0.0);
                if (flowerMask > 0.0) {
                    col = cosinePaletteNeon(id.x * 0.2 + id.y * 0.5 - u_time * 0.5);
                    if (sclera > 0.0) {
                        col = vec3(0.95);
                        if (iris > 0.0) {
                            col = vec3(0.0, 0.8, 0.9); // Electric Aqua
                            if (pupil > 0.0) col = vec3(0.1);
                        }
                    }
                }
                return col;
            }

            vec2 cmul(vec2 a, vec2 b) {
                return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
            }

            struct IterResult {
                float smooth_n;
                float de;
                float trap;
            };

            // Mandelbrot Set (Obvious Fractal Engine)
            IterResult mandelbrot(vec2 c) {
                vec2 z = vec2(0.0);
                vec2 dz = vec2(1.0, 0.0);
                float m2 = 0.0;
                int n = 0;
                float trap = 1e10;
                
                for (int i = 0; i < MAX_ITER; i++) {
                    // Distance estimator tracking
                    dz = 2.0 * cmul(z, dz) + vec2(1.0, 0.0);
                    z = cmul(z, z) + c;
                    
                    // Orbit Trap: Celestial Star Motif
                    float r = length(z);
                    float a = atan(z.y, z.x);
                    float star = abs(r - (0.5 + 0.2 * sin(5.0 * a + u_time)));
                    trap = min(trap, star);
                    
                    m2 = dot(z, z);
                    if (m2 > 256.0) {
                        n = i;
                        break;
                    }
                }
                
                IterResult res;
                if (m2 > 256.0) {
                    // Smooth continuous escape time
                    float log_zn = log(m2) * 0.5;
                    float nu = log(log_zn / log(2.0)) / log(2.0);
                    res.smooth_n = float(n) + 1.0 - nu;
                    // Distance estimator magnitude
                    res.de = sqrt(m2 / dot(dz, dz)) * log(m2) * 0.5;
                } else {
                    res.smooth_n = 0.0;
                    res.de = 0.0;
                }
                res.trap = trap;
                return res;
            }

            void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution.xy;
                float aspect = u_resolution.x / u_resolution.y;
                vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
                
                // Deep Time Zoom Animation towards Seahorse Valley / Minibrot
                vec2 target = vec2(-0.74364388, 0.13182590); 
                float t = u_time * 0.15;
                float z_anim = -cos(t);
                float progress = (z_anim + 1.0) * 0.5;
                float zoom = 1.2 * pow(0.0001, progress);
                
                vec2 c = p * zoom + mix(vec2(-0.5, 0.0), target, progress);
                
                // Domain Warping (Mycelial Flow Bias)
                vec2 warp = vec2(sin(c.y * 10.0 + u_time), cos(c.x * 10.0 - u_time)) * 0.02 * zoom;
                c += warp;
                
                IterResult res = mandelbrot(c);
                
                vec3 color = vec3(0.0);
                
                if (res.smooth_n == 0.0) {
                    // Interior: Psychedelic Eye-Flower Pattern
                    color = getFlowerPattern(c / zoom * 2.0 + vec2(u_time * 0.1));
                    if (length(color) < 0.1) {
                        color = vec3(0.05, 0.02, 0.1); // Deep cosmic void
                    }
                } else {
                    // Exterior: Highly Acidic Neon + Structural Color + Bioluminescence
                    
                    // 1. Thin-Film Interference mapped to escape time
                    float thickness = 300.0 + 500.0 * (0.5 + 0.5 * sin(res.smooth_n * 0.3 - u_time * 2.0));
                    float angle = clamp(res.de * 150.0 / zoom, 0.0, 1.0);
                    float cosTheta = mix(0.1, 1.0, angle);
                    vec3 film = thinFilmInterference(thickness, cosTheta);
                    
                    // 2. Base Neon Acid Color
                    vec3 neon = cosinePaletteNeon(res.smooth_n * 0.02 - u_time * 0.5);
                    
                    // 3. Foxfire Bioluminescent Cords (Mycelial Network Edge Glow)
                    float cord = exp(-res.de * 400.0 / zoom) * (0.5 + 0.5 * sin(res.smooth_n * 2.0 - u_time * 5.0));
                    vec3 foxfire = vec3(0.02, 0.95, 0.48); 
                    
                    // 4. Orbit Trap Glow
                    float trapIntensity = exp(-res.trap * 8.0);
                    vec3 trapColor = vec3(1.0, 0.1, 0.8) * trapIntensity; // Hot Pink
                    
                    // Alchemical Combination
                    color = mix(neon, film, 0.65);
                    color += foxfire * cord * 1.5;
                    color += trapColor;
                    
                    // 5. Divine Data Corruption (Glitch Methodology)
                    float glitch = step(0.96, fract(res.smooth_n * 4.0 + u_time * 8.0));
                    vec3 glitchColor = vec3(1.0, 0.9, 0.0); // Lemon Yellow
                    color = mix(color, glitchColor, glitch * 0.4);
                }
                
                // Transfinite Chromatic Aberration (Screen Space Glitch)
                float screenGlitch = step(0.95, sin(u_time * 12.0)) * noise(uv * 100.0 + u_time);
                color.r *= 1.0 + screenGlitch * 0.5;
                color.b *= 1.0 - screenGlitch * 0.3;
                
                // Vignette
                float vignette = 1.0 - smoothstep(0.5, 1.5, length(uv - 0.5));
                color *= vignette;
                
                // ACES Tonemapping for HDR look
                color = clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), 0.0, 1.0);
                
                fragColor = vec4(color, 1.0);
            }
        `;
        
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
            },
            vertexShader,
            fragmentShader
        });
        
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);
        
        canvas.__three = { renderer, scene, camera, material };
    } catch(e) {
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