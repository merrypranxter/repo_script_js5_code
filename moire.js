if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        const vertexShader = `
            out vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `;
        
        const fragmentShader = `
            // GLSL 3.0
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
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f*f*(3.0-2.0*f);
                return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                           mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
            }

            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                mat2 r = rot(0.5);
                for (int i=0; i<5; i++) {
                    v += a * noise(p);
                    p = r * p * 2.0;
                    a *= 0.5;
                }
                return v;
            }

            // 09_projection_3d: Moiré as Scanner
            float surfaceHeight(vec2 p) {
                // Creates a topographic surface that the moire grids will project onto
                float h = sin(p.x * 4.0 + u_time * 0.4) * cos(p.y * 3.0 - u_time * 0.5) * 0.25;
                h += fbm(p * 2.5 - u_time * 0.15) * 0.4;
                return h;
            }

            // 08_cmyk_separation & 04_wave_sinusoidal hybrid
            float halftoneDot(vec2 p, float scale, float angle, vec2 offset) {
                mat2 r = rot(angle);
                vec2 st = (r * p) * scale + offset;
                vec2 grid = abs(fract(st) - 0.5);
                
                // Feral distortion: stretch grid along one axis based on low-freq noise
                // Simulates ink bleed and structural failure
                grid.x *= 1.0 + fbm(st * 0.2) * 1.5;
                
                float dist = length(grid);
                return smoothstep(0.45, 0.05, dist); // Softer dots for liquid interference
            }

            // 03_spiral_phantoms: The Rotating Phantom
            float spiralGrating(vec2 p, float tightness, float rotation, float arms) {
                float r = length(p);
                float angle = atan(p.y, p.x);
                float spiralPhase = angle + log(r + 0.001) * tightness + rotation;
                return smoothstep(0.2, 0.8, 0.5 + 0.5 * sin(spiralPhase * arms));
            }

            void main() {
                vec2 uv = vUv - 0.5;
                uv.x *= u_resolution.x / u_resolution.y;
                
                // 10_anamorphic_secret: Observer-Dependent Singularity
                vec2 mouse = u_mouse - 0.5;
                mouse.x *= u_resolution.x / u_resolution.y;
                
                // Pull space towards mouse to create a localized singularity
                vec2 delta = uv - mouse;
                float dist = length(delta);
                vec2 wuv = uv + delta * exp(-dist * 4.0) * 0.6 * sin(u_time * 0.8);
                
                // Base height for shadow moire projection
                float height = surfaceHeight(wuv);
                
                // Projected UV shifted by height to create topographic contour fringes
                vec2 projUV = wuv + vec2(height * 0.8, height * 0.5);

                vec3 col = vec3(0.0);
                
                // 07_rgb_chromatic: Moiré as Color Theory
                // We evaluate three independent moire systems. Their scale differences
                // create spatial chromatic beats (yellow/magenta/cyan fringes).
                for(int i=0; i<3; i++) {
                    float scale = 35.0 + float(i) * 0.6; 
                    float angle = u_time * 0.03 + float(i) * 0.261; // ~15 degrees offset per channel
                    
                    // --- System 1: Projection Halftone Moiré ---
                    float gRef = halftoneDot(wuv, scale, angle, vec2(0.0));
                    float gProj = halftoneDot(projUV, scale * 1.005, angle + 0.01, vec2(u_time * 0.05));
                    float moireTopo = gRef * gProj * 2.5; // Multiplicative interference
                    
                    // --- System 2: Spiral Phantom Moiré ---
                    float s1 = spiralGrating(wuv, 2.5 + float(i)*0.05, u_time * 0.5, 5.0);
                    float s2 = spiralGrating(projUV, 2.55 + float(i)*0.05, -u_time * 0.4, 5.0);
                    float moireSpiral = s1 * s2 * 2.0;
                    
                    // Mix topologies based on the height field to create distinct interference zones
                    float channelVal = mix(moireTopo, moireSpiral, smoothstep(-0.1, 0.3, height));
                    
                    // Non-linear contrast curve to make fringes pop
                    channelVal = pow(channelVal, 1.2);
                    
                    if (i==0) col.r = channelVal;
                    if (i==1) col.g = channelVal;
                    if (i==2) col.b = channelVal;
                }

                // Chromatic boost: Exaggerate the color interference
                float luma = dot(col, vec3(0.299, 0.587, 0.114));
                col = mix(vec3(luma), col, 2.2); 
                
                // CMYK Print Degradation / Ink Starvation
                float grain = hash(vUv * 200.0 + vec2(u_time, u_time * 0.5)) * 0.15;
                col = max(vec3(0.0), col - grain);
                
                // Vignette
                col *= smoothstep(1.3, 0.2, length(uv));

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
    if (material.uniforms.u_time) {
        material.uniforms.u_time.value = time;
    }
    if (material.uniforms.u_resolution) {
        material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
    if (material.uniforms.u_mouse) {
        // Map mouse to 0-1 range, invert Y for WebGL coordinates
        const mx = mouse.x / grid.width;
        const my = 1.0 - (mouse.y / grid.height);
        
        // Smooth dampening towards mouse to make the anamorphic singularity feel heavy
        const currentMouse = material.uniforms.u_mouse.value;
        const targetX = mouse.isPressed ? mx : 0.5 + Math.sin(time * 0.5) * 0.3;
        const targetY = mouse.isPressed ? my : 0.5 + Math.cos(time * 0.4) * 0.3;
        
        currentMouse.x += (targetX - currentMouse.x) * 0.05;
        currentMouse.y += (targetY - currentMouse.y) * 0.05;
    }
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);