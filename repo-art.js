if (!canvas.__three) {
    try {
        const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
        if (!gl) throw new Error("WebGL 2 not supported or context occupied");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
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
            in vec2 vUv;
            out vec4 fragColor;
            
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform vec2 u_mouse;

            // [ THE FERAL ENGINE: NOISE & HASH ]
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
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
                for (int i = 0; i < 4; i++) {
                    v += a * noise(p);
                    p *= 2.0;
                    a *= 0.5;
                }
                return v;
            }

            // [ HOLOGRAPHY: AdS METRIC WARP ]
            // The boundary drives the bulk. Radial depth = scale.
            vec2 adsWarp(vec2 uv, vec2 center) {
                vec2 d = uv - center;
                float r = length(d);
                float z = max(0.03, 1.0 - r * 1.6); 
                return center + (d / z) * 0.4;
            }

            // [ GLITCHCORE / DAMAGE: MACROBLOCK DATAMOSH ]
            // Compression chew, packet loss, and temporal smear
            vec2 datamosh(vec2 uv, float t) {
                vec2 grid = floor(uv * 18.0) / 18.0;
                float glitch = step(0.82, noise(grid * 4.0 + floor(t * 12.0)));
                vec2 motion = vec2(noise(grid + t), noise(grid - t)) * 0.1 - 0.05;
                return mix(uv, grid + motion, glitch * 0.85);
            }

            // [ RETINAL SURREALISM: OP-ART ENGINE ]
            // Radial hypnosis fields, zebra waves, figure-ground instability
            float opArt(vec2 uv, float t) {
                float r = length(uv - 0.5);
                float a = atan(uv.y - 0.5, uv.x - 0.5);
                // Zebra waves reacting to hidden pressure
                float wave = sin(r * 75.0 - t * 6.0 + sin(a * 7.0 + t * 2.5) * 1.8);
                return smoothstep(-0.15, 0.15, wave);
            }

            // [ CRYSTALLINE: BIREFRINGENCE OFFSET ]
            // Double refraction through a simulated triclinic lattice
            vec2 refractCrystal(vec2 uv, float ior, float t) {
                float nX = fbm(uv * 12.0 + vec2(0.0, t * 0.15));
                float nY = fbm(uv * 12.0 + vec2(t * 0.15, 0.0));
                return uv + vec2(nX - 0.5, nY - 0.5) * ior * 0.045;
            }

            void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution;
                vec2 origUV = uv;
                
                // Holographic boundary injection (Mouse as precursor signal)
                vec2 mouse = u_mouse == vec2(0.0) ? vec2(0.5) : u_mouse / u_resolution;
                mouse.y = 1.0 - mouse.y; // Correct Y-axis for GLSL
                
                uv = adsWarp(uv, mouse);
                
                // Damage: Tape tracking & head-switching noise
                if (origUV.y < 0.08) {
                    uv.x += (hash(uv * vec2(1.0, 60.0) + u_time) - 0.5) * 0.15;
                }
                
                // Glitchcore: Compression chew
                uv = datamosh(uv, u_time);
                
                // Crystalline RGB Phantom / Chromatic Interference
                // Calcite ordinary ray (nR), intermediate (nG), extraordinary ray (nB)
                vec2 uvR = refractCrystal(uv, 1.486, u_time);
                vec2 uvG = refractCrystal(uv, 1.550, u_time * 1.08);
                vec2 uvB = refractCrystal(uv, 1.658, u_time * 0.92);
                
                // Op-Art Evaluation
                float opR = opArt(uvR, u_time);
                float opG = opArt(uvG, u_time * 1.03);
                float opB = opArt(uvB, u_time * 0.97);
                
                // [ LISA FRANK / ACID PALETTE: HYPERPOP RUPTURE ]
                vec3 hotPink = vec3(1.0, 0.0, 0.55);
                vec3 electricCyan = vec3(0.0, 1.0, 0.95);
                vec3 toxicLime = vec3(0.65, 1.0, 0.0);
                vec3 deepViolet = vec3(0.35, 0.0, 0.85);
                vec3 pearlWhite = vec3(0.98, 0.95, 1.0);
                
                // Color Field Collision
                vec3 color = mix(deepViolet, hotPink, opR);
                color = mix(color, electricCyan, opG * 0.65);
                color = mix(color, toxicLime, opB * 0.45 * (1.0 - opR));
                
                // Sparkles: Stochastic Glitter Overprint
                float sparkle = step(0.985, hash(uv * 250.0 + u_time));
                color = mix(color, pearlWhite, sparkle * opG * 1.5);
                
                // Temporal Echo / Phosphor Bloom
                float ghost = opArt(origUV + vec2(sin(u_time), cos(u_time)) * 0.025, u_time * 0.4);
                color += hotPink * ghost * 0.25;
                
                // CRT Raster Lines
                float scanline = sin(origUV.y * u_resolution.y * 3.14159 * 0.6);
                color *= 0.88 + 0.12 * scanline;
                
                fragColor = vec4(color, 1.0);
            }
        `;
        
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_mouse: { value: new THREE.Vector2(mouse.x, mouse.y) }
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
    if (material.uniforms.u_time) {
        material.uniforms.u_time.value = time;
    }
    if (material.uniforms.u_resolution) {
        material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
    if (material.uniforms.u_mouse) {
        // Sticky, feral mouse lag (simulating slow frame persistence)
        const targetX = mouse.x;
        const targetY = mouse.y;
        const currentX = material.uniforms.u_mouse.value.x;
        const currentY = material.uniforms.u_mouse.value.y;
        
        // Only interpolate if we have a valid initial mouse position
        if (currentX === 0 && currentY === 0 && (targetX !== 0 || targetY !== 0)) {
            material.uniforms.u_mouse.value.set(targetX, targetY);
        } else {
            material.uniforms.u_mouse.value.x += (targetX - currentX) * 0.08;
            material.uniforms.u_mouse.value.y += (targetY - currentY) * 0.08;
        }
    }
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);