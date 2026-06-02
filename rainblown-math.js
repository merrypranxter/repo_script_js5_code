try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    if (!canvas.__three) {
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        const type = THREE.HalfFloatType;
        const targetA = new THREE.WebGLRenderTarget(grid.width, grid.height, { type, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
        const targetB = new THREE.WebGLRenderTarget(grid.width, grid.height, { type, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });

        const vertexShader = `
            out vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `;

        // The Rainblown Math Engine: computes a Julia set, applies dielectric Kirlian glow, and advects it with a chromatic wind.
        const bufferFragmentShader = `
            in vec2 vUv;
            out vec4 fragColor;
            
            uniform sampler2D u_buffer;
            uniform float u_time;
            uniform vec2 u_resolution;

            // Pseudo-random hash
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }

            // Value noise for wind turbulence
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

            // IQ Cosine Palette: Neon Acid (from color_fields)
            vec3 palette(float t) {
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.33);
                vec3 c = vec3(2.0, 1.0, 1.0);
                vec3 d = vec3(0.5, 0.2, 0.25);
                return a + b * cos(6.28318 * (c * t + d));
            }

            void main() {
                vec2 p = (vUv - 0.5) * (u_resolution.x / u_resolution.y);
                
                // Turbulent Rainblown Wind
                float n = noise(vUv * 6.0 - u_time * 1.5);
                vec2 windBase = vec2(0.004, 0.008); // Rain falls down-left, so we sample up-right
                vec2 wind = windBase + vec2(n * 0.003, n * 0.004);

                // Chromatic Parallax Advection (from parallax_depth_fields)
                float r = texture(u_buffer, vUv + wind * 1.3).r;
                float g = texture(u_buffer, vUv + wind * 1.0).g;
                float b = texture(u_buffer, vUv + wind * 0.7).b;
                vec3 advected = vec3(r, g, b) * 0.97; // Decay over time

                // Mathematical Masterpiece: Morphing Julia Set with Cross Orbit Trap
                vec2 z = p * 1.8;
                // Complex parameter mutating over time
                vec2 c_val = vec2(0.35 * cos(u_time * 0.2), 0.55 * sin(u_time * 0.31));
                float trap = 100.0;
                float iter = 0.0;
                
                for(int i = 0; i < 24; i++) {
                    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c_val;
                    // Sacred Geometry / Kirlian structural lines
                    trap = min(trap, min(abs(z.x), abs(z.y)));
                    if(dot(z, z) > 16.0) break;
                    iter++;
                }

                // Kirlian Plasma Glow (from kirlian_discharge)
                float glow = 0.006 / (trap + 0.002);
                glow *= smoothstep(24.0, 0.0, iter); // Fade outer corona
                vec3 mathColor = palette(iter * 0.06 - u_time * 0.4) * glow;

                // Raindrop strikes (dielectric breakdown flashes)
                float drop = step(0.9995, hash(vUv * u_time));
                mathColor += drop * vec3(2.0, 2.5, 3.0); // HDR flash

                fragColor = vec4(advected + mathColor, 1.0);
            }
        `;

        // The Display Pass: Tonemapping, Halftone, CMYK Misregistration, and Xerox Grain
        const displayFragmentShader = `
            in vec2 vUv;
            out vec4 fragColor;
            
            uniform sampler2D u_scene;
            uniform float u_time;
            uniform vec2 u_resolution;

            // ACES Filmic Tonemapping (from color_fields)
            vec3 tonemapACES(vec3 x) {
                float a = 2.51;
                float b = 0.03;
                float c = 2.43;
                float d = 0.59;
                float e = 0.14;
                return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
            }

            void main() {
                vec2 uv = vUv;
                
                // CMYK Misregistration (from psychedelic_collage print_artifacts)
                float r = texture(u_scene, uv + vec2(0.004, 0.0)).r;
                float g = texture(u_scene, uv + vec2(-0.002, 0.003)).g;
                float b = texture(u_scene, uv + vec2(0.0, -0.004)).b;
                vec3 col = vec3(r, g, b);

                // HDR to LDR
                col = tonemapACES(col);

                // Offset Print Halftone Screen
                float luma = dot(col, vec3(0.299, 0.587, 0.114));
                float freq = 120.0;
                float angle = 0.785398; // 45 degrees
                mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
                vec2 aspectUv = uv * vec2(u_resolution.x / u_resolution.y, 1.0);
                vec2 cell = fract(rot * aspectUv * freq) - 0.5;
                float dist = length(cell);
                float dotRadius = sqrt(1.0 - luma) * 0.5;
                float halftone = smoothstep(dotRadius + 0.1, dotRadius - 0.1, dist);

                // Composite halftone (ink bleed style)
                col = mix(col * halftone, col, luma * 0.7 + 0.3);

                // Xerox / Aged Newsprint Grain
                float grain = fract(sin(dot(uv * 1000.0 + u_time, vec2(127.1, 311.7))) * 43758.5453);
                col += (grain - 0.5) * 0.12;

                // Vintage Vignette
                float vig = length(uv - 0.5) * 2.0;
                col *= 1.0 - smoothstep(0.4, 1.8, vig);

                fragColor = vec4(col, 1.0);
            }
        `;

        const bufferMaterial = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_buffer: { value: null },
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
            },
            vertexShader,
            fragmentShader: bufferFragmentShader,
            depthWrite: false,
            depthTest: false
        });

        const displayMaterial = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_scene: { value: null },
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
            },
            vertexShader,
            fragmentShader: displayFragmentShader,
            depthWrite: false,
            depthTest: false
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bufferMaterial);
        scene.add(mesh);

        canvas.__three = {
            renderer,
            scene,
            camera,
            mesh,
            bufferMaterial,
            displayMaterial,
            targetA,
            targetB,
            width: grid.width,
            height: grid.height,
            pingPong: true
        };
    }

    const sys = canvas.__three;

    // Handle Resize
    if (sys.width !== grid.width || sys.height !== grid.height) {
        sys.targetA.setSize(grid.width, grid.height);
        sys.targetB.setSize(grid.width, grid.height);
        sys.renderer.setSize(grid.width, grid.height, false);
        sys.bufferMaterial.uniforms.u_resolution.value.set(grid.width, grid.height);
        sys.displayMaterial.uniforms.u_resolution.value.set(grid.width, grid.height);
        sys.width = grid.width;
        sys.height = grid.height;
    }

    // Ping-Pong FBOs
    const readBuffer = sys.pingPong ? sys.targetA : sys.targetB;
    const writeBuffer = sys.pingPong ? sys.targetB : sys.targetA;

    // Pass 1: Rainblown Math Engine (Accumulate & Advect)
    sys.mesh.material = sys.bufferMaterial;
    sys.bufferMaterial.uniforms.u_time.value = time;
    sys.bufferMaterial.uniforms.u_buffer.value = readBuffer.texture;
    sys.renderer.setRenderTarget(writeBuffer);
    sys.renderer.render(sys.scene, sys.camera);

    // Pass 2: Display & Damage (Tonemap, Halftone, CMYK Misreg)
    sys.mesh.material = sys.displayMaterial;
    sys.displayMaterial.uniforms.u_time.value = time;
    sys.displayMaterial.uniforms.u_scene.value = writeBuffer.texture;
    sys.renderer.setRenderTarget(null);
    sys.renderer.render(sys.scene, sys.camera);

    // Swap buffers
    sys.pingPong = !sys.pingPong;

} catch (e) {
    console.error("WebGL Initialization or Render Failed:", e);
}