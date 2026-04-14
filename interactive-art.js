if (!canvas.__three) {
    try {
        const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false });
        if (!gl) throw new Error("WebGL2 required but not supported.");

        const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: false });
        renderer.setPixelRatio(1);
        renderer.autoClear = false;

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const scene = new THREE.Scene();
        const geometry = new THREE.PlaneGeometry(2, 2);

        // Ping-Pong FBOs for feedback loop
        const rtOpts = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping
        };
        
        // Use a slightly lower resolution for the simulation to create "xerox/newsprint" chunky artifacts
        const simRes = { width: Math.floor(grid.width * 0.5), height: Math.floor(grid.height * 0.5) };
        const fbo = [
            new THREE.WebGLRenderTarget(simRes.width, simRes.height, rtOpts),
            new THREE.WebGLRenderTarget(simRes.width, simRes.height, rtOpts)
        ];

        // Seed the initial buffer with noise
        const seedData = new Float32Array(simRes.width * simRes.height * 4);
        for (let i = 0; i < seedData.length; i += 4) {
            seedData[i] = Math.random();
            seedData[i+1] = Math.random();
            seedData[i+2] = Math.random();
            seedData[i+3] = 1.0;
        }
        const seedTex = new THREE.DataTexture(seedData, simRes.width, simRes.height, THREE.RGBAFormat, THREE.FloatType);
        seedTex.needsUpdate = true;

        // THE FERAL MECHANISM: Feedback Kaleidoscope + Gray-Scott Reaction Proxy
        const updateMat = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_tex: { value: seedTex },
                u_res: { value: new THREE.Vector2(simRes.width, simRes.height) },
                u_time: { value: 0.0 },
                u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
                u_mouse_pressed: { value: 0.0 }
            },
            vertexShader: `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;
                uniform sampler2D u_tex;
                uniform vec2 u_res;
                uniform float u_time;
                uniform vec2 u_mouse;
                uniform float u_mouse_pressed;

                in vec2 vUv;
                out vec4 fragColor;

                // Psychedelic Collage: Kaleidoscope fold
                vec2 kal(vec2 uv, float folds, float spin) {
                    vec2 p = uv * 2.0 - 1.0;
                    float r = length(p);
                    float a = atan(p.y, p.x);
                    float sector = 6.2831853 / folds;
                    a = mod(a, sector);
                    a = abs(a - sector / 2.0);
                    a += spin;
                    return vec2(cos(a), sin(a)) * r * 0.5 + 0.5;
                }

                void main() {
                    vec2 uv = vUv;
                    
                    // Gradient calculation for displacement warp
                    vec2 texel = 1.0 / u_res;
                    float n = texture(u_tex, fract(uv + vec2(0.0, texel.y))).r;
                    float s = texture(u_tex, fract(uv - vec2(0.0, texel.y))).r;
                    float e = texture(u_tex, fract(uv + vec2(texel.x, 0.0))).r;
                    float w = texture(u_tex, fract(uv - vec2(texel.x, 0.0))).r;
                    
                    vec2 grad = vec2(e - w, n - s);
                    
                    // Feral mechanism: UV displacement driven by own gradient
                    vec2 offsetUV = uv - grad * 0.005;
                    
                    // Apply slow zoom and rotation to pull patterns inward (infinite dive)
                    vec2 center = vec2(0.5);
                    vec2 centered = offsetUV - center;
                    float angle = u_time * 0.05;
                    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
                    offsetUV = center + rot * centered * 0.99;

                    // Kaleidoscope injection (Lisa Frank / Psychedelic geometry)
                    vec2 k_uv = kal(offsetUV, 5.0, u_time * 0.1);
                    
                    // Sample previous states
                    vec4 prev = texture(u_tex, fract(offsetUV));
                    vec4 prevK = texture(u_tex, fract(mix(offsetUV, k_uv, 0.05))); // Blend folds

                    // "Infection" growth logic (Proxy for CA/Reaction Diffusion)
                    float thickness = prevK.r;
                    float energy = prev.g;
                    
                    // Structural color film grows over time, driven by local gradients
                    thickness += 0.005 + length(grad) * 0.1;
                    energy = mix(energy, length(grad) * 5.0, 0.1);

                    // User interaction: Acid burn injection
                    float dist = length(uv - u_mouse);
                    if (u_mouse_pressed > 0.5 && dist < 0.05) {
                        thickness = fract(u_time * 2.0);
                        energy = 1.0;
                    }

                    // Wrap thickness to simulate cyclic film layers
                    fragColor = vec4(fract(thickness), clamp(energy, 0.0, 1.0), 0.0, 1.0);
                }
            `
        });

        // DISPLAY SHADER: Structural Color + Xerox Halftone + Chromatic Aberration
        const displayMat = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_tex: { value: null },
                u_res: { value: new THREE.Vector2(grid.width, grid.height) },
                u_time: { value: 0.0 }
            },
            vertexShader: `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;
                uniform sampler2D u_tex;
                uniform vec2 u_res;
                uniform float u_time;

                in vec2 vUv;
                out vec4 fragColor;

                // Structural Color: Thin-film interference
                vec3 thinFilm(float thickness, float viewAngle) {
                    float n_film = 1.56; // Chitin / jewel beetle index
                    // Scale thickness from normalized state to nanometers (100nm - 1000nm)
                    float d = mix(100.0, 1000.0, thickness); 
                    
                    // Optical path difference: 2nd cos(theta)
                    float pathDiff = 2.0 * n_film * d * cos(viewAngle);
                    
                    // Wavelengths for RGB peaks (nm)
                    vec3 lambda = vec3(650.0, 530.0, 440.0); 
                    vec3 phase = (pathDiff / lambda) * 6.2831853;
                    
                    // Constructive/Destructive interference
                    return 0.5 + 0.5 * cos(phase);
                }

                // Psychedelic Collage: Halftone dot screen
                float halftone(vec2 fragCoord, float luma) {
                    float freq = 120.0; // Lines per inch proxy
                    float angle = 0.785398; // 45 degrees
                    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
                    vec2 uv = rot * fragCoord * freq / u_res.x;
                    vec2 cell = fract(uv) - 0.5;
                    float dist = length(cell);
                    float dotRadius = luma * 0.7; // Luma modulates dot size
                    return smoothstep(dotRadius + 0.1, dotRadius - 0.1, dist);
                }

                // Hash for xerox grain
                float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

                void main() {
                    // Chromatic Aberration sampling (Psychedelic scan-bend)
                    vec2 dir = normalize(vUv - 0.5);
                    float aberration = 0.015; // Shift amount
                    
                    // Sample thickness (R channel) with RGB split
                    float thickR = texture(u_tex, fract(vUv + dir * aberration)).r;
                    float thickG = texture(u_tex, fract(vUv)).r;
                    float thickB = texture(u_tex, fract(vUv - dir * aberration)).r;
                    
                    // Energy (G channel) dictates iridescence viewing angle shift
                    float energy = texture(u_tex, vUv).g;
                    float viewAngle = mix(0.0, 1.0, energy);

                    // Map thickness to Structural Color (Lisa Frank Acid Palette emergence)
                    vec3 colR = thinFilm(thickR, viewAngle);
                    vec3 colG = thinFilm(thickG, viewAngle);
                    vec3 colB = thinFilm(thickB, viewAngle);
                    
                    vec3 finalCol = vec3(colR.r, colG.g, colB.b);

                    // Boost saturation (Acid Vibration)
                    float luma = dot(finalCol, vec3(0.299, 0.587, 0.114));
                    finalCol = mix(vec3(luma), finalCol, 1.8);

                    // Apply Print Artifacts (Xerox Noise + Halftone)
                    float grain = hash(vUv * 100.0 + u_time);
                    finalCol += (grain - 0.5) * 0.15; // Electrostatic grain
                    
                    float ht = halftone(gl_FragCoord.xy, luma);
                    finalCol *= mix(0.3, 1.1, ht); // Screenprint ink dot crush

                    // Vignette burn
                    float vignette = length(vUv - 0.5);
                    finalCol *= smoothstep(0.8, 0.3, vignette);

                    fragColor = vec4(finalCol, 1.0);
                }
            `
        });

        const mesh = new THREE.Mesh(geometry, updateMat);
        scene.add(mesh);

        canvas.__three = { 
            renderer, scene, camera, mesh, updateMat, displayMat, 
            fbo, ping: 0, simRes 
        };

    } catch (e) {
        console.error("WebGL Initialization Failed:", e);
        return;
    }
}

const sys = canvas.__three;
if (!sys) return;

// Update Canvas size if grid changed
sys.renderer.setSize(grid.width, grid.height, false);
sys.displayMat.uniforms.u_res.value.set(grid.width, grid.height);

// Update simulation uniforms
const mx = mouse.x / grid.width;
const my = 1.0 - (mouse.y / grid.height); // Flip Y for WebGL

sys.updateMat.uniforms.u_time.value = time;
sys.updateMat.uniforms.u_mouse.value.set(mx, my);
sys.updateMat.uniforms.u_mouse_pressed.value = mouse.isPressed ? 1.0 : 0.0;

sys.displayMat.uniforms.u_time.value = time;

// MULTI-STEP SIMULATION LOOP (Overclocked CA logic)
const SIM_STEPS = 4; 
for (let i = 0; i < SIM_STEPS; i++) {
    const pong = 1 - sys.ping;
    
    // Set material to update logic
    sys.mesh.material = sys.updateMat;
    sys.updateMat.uniforms.u_tex.value = sys.fbo[sys.ping].texture;
    
    // Render to next buffer
    sys.renderer.setRenderTarget(sys.fbo[pong]);
    sys.renderer.render(sys.scene, sys.camera);
    
    // Swap
    sys.ping = pong;
}

// FINAL DISPLAY RENDER (Structural Color + Xerox)
sys.mesh.material = sys.displayMat;
sys.displayMat.uniforms.u_tex.value = sys.fbo[sys.ping].texture;

sys.renderer.setRenderTarget(null); // Render to screen
sys.renderer.render(sys.scene, sys.camera);