/**
 * RAINBLOWN RAINBOW MATHEMATICAL MASTERPIECE
 * 
 * A synthesis of the provided repository genomes:
 * - Repo 2 (Apollonian): Hyperbolic Poincaré disk tessellation & Kleinian limit sets.
 * - Repo 1 & 4 (Fungi/Mycelial): Anastomosis loops and hyphal deliquescence (ink-cap melting).
 * - Repo 5 & 6 (Color Systems): OKLab perceptual color spaces and Golden Angle math.
 * - Repo 7 (Structural Color): Thin-film interference (Bragg reflection) simulation.
 * - Repo 3 (Psychedelic Collage): CMYK misregistration, halftone grain, and acid vibration.
 * 
 * Mechanism: The rigid mathematical perfection of a hyperbolic tessellation is subjected
 * to a "rainblown" fractional brownian motion (fluid advection). As the math breaks down, 
 * it is colonized by dark mycelial veins. The resulting structure acts as a thin-film 
 * optical grating, diffracting light into a perceptual OKLab spectral rainbow.
 */

function createArt(ctx, grid, time, repos, input, mouse, canvas, THREE) {
    // Ensure WebGL renderer exists and is attached to the canvas
    if (!canvas.__three) {
        try {
            // We need a WebGL2 context for GLSL3 features
            const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: false });
            if (!gl) throw new Error("WebGL2 not supported");

            const renderer = new THREE.WebGLRenderer({ canvas: canvas, context: gl, alpha: true, antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            const scene = new THREE.Scene();
            const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            
            const vertexShader = `
                in vec3 position;
                in vec2 uv;
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
                uniform vec2 u_mouse;
                
                in vec2 vUv;
                out vec4 fragColor;

                #define PI 3.14159265359
                #define TAU 6.28318530718
                #define GOLDEN_ANGLE 2.39996322973

                // --- 1. PSYCHEDELIC COLLAGE & NOISE (Repo 3 & 1) ---
                
                float hash12(vec2 p) {
                    vec3 p3  = fract(vec3(p.xyx) * .1031);
                    p3 += dot(p3, p3.yzx + 33.33);
                    return fract((p3.x + p3.y) * p3.z);
                }

                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    float a = hash12(i);
                    float b = hash12(i + vec2(1.0, 0.0));
                    float c = hash12(i + vec2(0.0, 1.0));
                    float d = hash12(i + vec2(1.0, 1.0));
                    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
                }

                float fbm(vec2 p) {
                    float v = 0.0;
                    float a = 0.5;
                    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
                    for (int i = 0; i < 5; i++) {
                        v += a * noise(p);
                        p = rot * p * 2.0 + vec2(100.0);
                        a *= 0.5;
                    }
                    return v;
                }

                // --- 2. COLOR SYSTEMS: OKLAB & PERCEPTUAL MATH (Repo 5 & 6) ---
                
                vec3 oklab_to_linear_srgb(vec3 c) {
                    float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
                    float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
                    float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
                    float l = l_ * l_ * l_;
                    float m = m_ * m_ * m_;
                    float s = s_ * s_ * s_;
                    return vec3(
                         4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
                    );
                }

                vec3 linear_to_srgb(vec3 c) {
                    vec3 sq1 = sqrt(c);
                    vec3 sq2 = sqrt(sq1);
                    vec3 sq3 = sqrt(sq2);
                    vec3 srgb = 0.662002687 * sq1 + 0.684122060 * sq2 - 0.323583601 * sq3 - 0.022541147 * c;
                    return clamp(srgb, 0.0, 1.0);
                }

                vec3 oklch_to_srgb(float L, float C, float h) {
                    vec3 oklab = vec3(L, C * cos(h), C * sin(h));
                    return linear_to_srgb(oklab_to_linear_srgb(oklab));
                }

                // --- 3. STRUCTURAL COLOR: THIN FILM & BRAGG (Repo 7) ---
                
                vec3 structuralColor(float thickness, float angle) {
                    // Simulating Bragg reflection / Thin-film interference
                    // 2 * n * d * cos(theta) = m * lambda
                    float opticalPath = 2.0 * 1.33 * thickness * cos(angle);
                    
                    // Map optical path to a perceptual OKLCh hue
                    float hue = opticalPath * TAU + u_time * 0.5;
                    float chroma = 0.15 + 0.1 * sin(opticalPath * PI);
                    float lightness = 0.65 + 0.15 * cos(opticalPath * PI * 0.5);
                    
                    return oklch_to_srgb(lightness, chroma, hue);
                }

                // --- 4. APOLLONIAN / KLEINIAN INVERSION (Repo 2) ---
                
                vec2 invert(vec2 z, vec2 c, float r, inout float scale) {
                    vec2 w = z - c;
                    float d2 = dot(w, w);
                    float f = (r * r) / d2;
                    scale *= f;
                    return c + w * f;
                }

                void main() {
                    // Center and aspect-correct UVs
                    vec2 uv = (vUv - 0.5) * 2.0;
                    uv.x *= u_resolution.x / u_resolution.y;
                    
                    // Mouse interaction
                    vec2 mouse = (u_mouse - 0.5) * 2.0;
                    mouse.x *= u_resolution.x / u_resolution.y;

                    // --- THE RAINBLOWN MECHANISM ---
                    // Fluid advection distorting the mathematical space
                    float windTime = u_time * 0.15;
                    vec2 wind = vec2(
                        fbm(uv * 1.5 + vec2(windTime, -windTime)),
                        fbm(uv * 1.5 + vec2(-windTime, windTime))
                    ) * 2.0 - 1.0;
                    
                    // Introduce the "Rainblown" distortion
                    vec2 z = uv + wind * 0.25;
                    
                    // --- HYPERBOLIC SCAFFOLD ---
                    // (2,3,inf) Triangle Group / Poincaré Disk generators
                    const float INV_SQRT3 = 0.57735026919;
                    vec3 circles[3];
                    circles[0] = vec3( 2.0 * INV_SQRT3, 0.0, INV_SQRT3);
                    circles[1] = vec3(-INV_SQRT3,  1.0, INV_SQRT3);
                    circles[2] = vec3(-INV_SQRT3, -1.0, INV_SQRT3);

                    float scale = 1.0;
                    float orbitCount = 0.0;
                    float trap = 1000.0;
                    
                    // Iterative Inversion (Apollonian Foam slice)
                    for (int i = 0; i < 15; i++) {
                        bool inverted = false;
                        for (int j = 0; j < 3; j++) {
                            vec2 c = circles[j].xy;
                            float r = circles[j].z;
                            
                            // Fungal mutation: the inversion circles breathe
                            r += 0.05 * sin(u_time * 2.0 + z.x * 5.0 + z.y * 3.0);
                            
                            if (length(z - c) < r) {
                                z = invert(z, c, r, scale);
                                orbitCount += 1.0;
                                inverted = true;
                            }
                        }
                        
                        // Domain fold
                        z.x = abs(z.x);
                        trap = min(trap, length(z));
                        
                        if (!inverted) break;
                    }

                    // --- MYCELIAL DELIQUESCENCE (Repo 1 & 4) ---
                    // Extracting the "veins" of the network from the Jacobian scale
                    float hyphalDensity = smoothstep(0.0, 0.05, abs(fract(log(scale) * 2.0 + u_time) - 0.5));
                    float anastomosis = fbm(z * 10.0 - u_time);
                    
                    // --- STRUCTURAL COLOR (Repo 7 & 5) ---
                    // Calculate "film thickness" based on fractal trap and noise
                    float thickness = trap * 2.0 + anastomosis * 0.5 + orbitCount * 0.1;
                    float viewAngle = mod(length(uv) + u_time * 0.1, 1.0); // Simulated grazing angle
                    
                    vec3 color = structuralColor(thickness, viewAngle);

                    // Inject the dark fungal veins into the iridescent structure
                    color = mix(color, vec3(0.02, 0.01, 0.05), hyphalDensity * 0.85);
                    
                    // Acid Vibration Highlights (Repo 3)
                    float acidGlow = exp(-trap * 5.0) * (0.5 + 0.5 * sin(u_time * 5.0 + orbitCount));
                    vec3 acidColor = oklch_to_srgb(0.8, 0.25, GOLDEN_ANGLE * orbitCount - u_time);
                    color += acidColor * acidGlow * 0.5;

                    // --- PRINT ARTIFACTS & POST-PROCESSING (Repo 3) ---
                    
                    // 1. CMYK Misregistration (Chromatic Aberration)
                    float shift = 0.005 * length(wind);
                    vec3 shiftedColor;
                    shiftedColor.r = structuralColor(thickness + shift, viewAngle).r;
                    shiftedColor.g = color.g;
                    shiftedColor.b = structuralColor(thickness - shift, viewAngle).b;
                    color = mix(color, shiftedColor, 0.7);
                    
                    // 2. Halftone / Newsprint Grain
                    vec2 screenPos = gl_FragCoord.xy;
                    float halftone = sin(screenPos.x * 2.0) * sin(screenPos.y * 2.0);
                    color *= 0.95 + 0.05 * halftone;
                    
                    // 3. Vignette
                    float vignette = 1.0 - smoothstep(0.5, 1.5, length(uv));
                    color *= mix(0.1, 1.0, vignette);

                    // Final output
                    fragColor = vec4(color, 1.0);
                }
            `;

            const geometry = new THREE.BufferGeometry();
            const vertices = new Float32Array([
                -1.0, -1.0,  0.0,
                 1.0, -1.0,  0.0,
                -1.0,  1.0,  0.0,
                 1.0, -1.0,  0.0,
                 1.0,  1.0,  0.0,
                -1.0,  1.0,  0.0
            ]);
            const uvs = new Float32Array([
                0.0, 0.0,
                1.0, 0.0,
                0.0, 1.0,
                1.0, 0.0,
                1.0, 1.0,
                0.0, 1.0
            ]);
            
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

            const material = new THREE.RawShaderMaterial({
                glslVersion: THREE.GLSL3,
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                uniforms: {
                    u_time: { value: time },
                    u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                    u_mouse: { value: new THREE.Vector2(mouse.x / grid.width, 1.0 - mouse.y / grid.height) }
                },
                depthWrite: false,
                depthTest: false
            });

            const mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);

            canvas.__three = { renderer, scene, camera, material };
        } catch (e) {
            console.error("WebGL 2 initialization failed. The rainblown rainbow requires advanced shaders.", e);
            // Fallback to 2D context if WebGL fails
            if (ctx && ctx.fillText) {
                ctx.fillStyle = '#050505';
                ctx.fillRect(0, 0, grid.width, grid.height);
                ctx.fillStyle = '#FF00CC';
                ctx.font = '14px monospace';
                ctx.fillText("WebGL2 required for Structural Color Mathematics.", 20, grid.height / 2);
            }
            return;
        }
    }

    // Render loop update
    const { renderer, scene, camera, material } = canvas.__three;
    
    // Update uniforms safely
    if (material && material.uniforms) {
        if (material.uniforms.u_time) material.uniforms.u_time.value = time;
        if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
        
        // Smooth mouse following
        if (material.uniforms.u_mouse) {
            const targetX = mouse.x / grid.width;
            const targetY = 1.0 - (mouse.y / grid.height);
            material.uniforms.u_mouse.value.x += (targetX - material.uniforms.u_mouse.value.x) * 0.05;
            material.uniforms.u_mouse.value.y += (targetY - material.uniforms.u_mouse.value.y) * 0.05;
        }
    }

    // Handle resize
    const pixelRatio = renderer.getPixelRatio();
    if (renderer.domElement.width !== grid.width * pixelRatio || 
        renderer.domElement.height !== grid.height * pixelRatio) {
        renderer.setSize(grid.width, grid.height, false);
    }

    renderer.render(scene, camera);
}

return createArt;