try {
    if (!canvas.__three) {
        if (!ctx) throw new Error("WebGL 2 context not available");

        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
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
            uniform float u_time;
            uniform vec2 u_resolution;
            
            in vec2 vUv;
            out vec4 fragColor;

            #define PI 3.14159265359

            // Complex math for Mobius Transform (Poincaré Disk mapping)
            vec2 cmul(vec2 a, vec2 b) {
                return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
            }
            
            vec2 cdiv(vec2 a, vec2 b) {
                float d = dot(b, b);
                return vec2(dot(a, b), a.y * b.x - a.x * b.y) / d;
            }

            // Quasicrystal Density Field (Incommensurate Plane Waves)
            float field(vec2 p, float t) {
                float w = 0.0;
                
                // 5-fold symmetry (Penrose / Golden Ratio)
                for(int i = 0; i < 5; i++) {
                    float angle = float(i) * PI / 5.0;
                    // Phason drift: nonlinear phase shifting mutates the local topology
                    float phase = t * 0.8 * sin(float(i) * 1.6180339887);
                    vec2 dir = vec2(cos(angle), sin(angle));
                    w += cos(dot(p, dir) + phase);
                }
                
                // 8-fold symmetry (Ammann-Beenker / Silver Ratio)
                for(int i = 0; i < 4; i++) {
                    float angle = float(i) * PI / 4.0;
                    float phase = -t * 0.6 * cos(float(i) * 1.4142135623);
                    vec2 dir = vec2(cos(angle), sin(angle));
                    // Spatial frequency scaled by sqrt(2) to force mathematical irreconcilability
                    w += cos(dot(p * 1.4142135623, dir) + phase) * 1.25; 
                }
                
                return w;
            }

            void main() {
                vec2 uv = (vUv - 0.5) * 2.0;
                uv.x *= u_resolution.x / u_resolution.y;
                
                float r = length(uv);
                
                // Absolute void outside the manifold
                if(r > 1.0) {
                    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
                    return;
                }

                // Hyperbolic breathing via Mobius translation
                vec2 a = vec2(sin(u_time * 0.25) * 0.4, cos(u_time * 0.31) * 0.4);
                vec2 num = uv - a;
                vec2 den = vec2(1.0, 0.0) - cmul(vec2(a.x, -a.y), uv);
                vec2 z = cdiv(num, den);
                
                // Exponential spatial crowding towards the boundary
                vec2 p = z * 22.0;

                // Evaluate the quasicrystal scalar field
                float F0 = field(p, u_time);
                
                // Calculate analytical normals for crystalline lithogenesis
                vec2 eps = vec2(0.05, 0.0);
                float Fx = field(p + eps.xy, u_time);
                float Fy = field(p + eps.yx, u_time);
                vec3 normal = normalize(vec3(Fx - F0, Fy - F0, 0.15));

                // Volumetric lighting setup
                vec3 lightPos = vec3(sin(u_time) * 1.5, cos(u_time * 1.3) * 1.5, 1.0);
                vec3 lightDir = normalize(lightPos - vec3(uv, 0.0));
                vec3 viewDir = vec3(0.0, 0.0, 1.0);
                vec3 halfVector = normalize(lightDir + viewDir);
                
                float diffuse = max(dot(normal, lightDir), 0.0);
                float specular = pow(max(dot(normal, halfVector), 0.0), 64.0); // Sharp crystalline hits

                // Neon Palette
                vec3 voidColor = vec3(0.02, 0.0, 0.04);
                vec3 cyan = vec3(0.0, 0.9, 1.0);
                vec3 magenta = vec3(1.0, 0.0, 0.6);
                vec3 yellow = vec3(1.0, 0.9, 0.0);
                
                // Normalize field amplitude roughly from [-10, 10] to [0, 1]
                float normF = (F0 + 10.0) / 20.0;
                
                vec3 col = voidColor;
                
                // Topographical color mapping
                col = mix(col, magenta, smoothstep(0.35, 0.6, normF));
                col = mix(col, cyan, smoothstep(0.55, 0.85, normF));
                
                // Domain walls: Sharp level-set contours mapping the mathematical interference
                float contour = smoothstep(0.06, 0.0, abs(fract(F0 * 1.3) - 0.5));
                col += cyan * contour * 0.7;
                
                // Constructive interference peaks (Bragg peaks)
                float peak = smoothstep(0.82, 0.95, normF);
                col += yellow * peak * 2.5;

                // Apply shading
                col = col * (diffuse * 0.7 + 0.3) + yellow * specular * 1.5;
                
                // Moiré / Chromatic Aberration near the boundary
                float diskEdge = smoothstep(1.0, 0.95, r);
                col *= diskEdge;

                // Temporal noise injection (Entropy/Film Grain)
                float noise = fract(sin(dot(vUv + u_time, vec2(12.9898, 78.233))) * 43758.5453);
                col += magenta * noise * 0.06 * diskEdge;

                // Tone mapping (Exposure)
                col = 1.0 - exp(-col * 1.3);

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

} catch (e) {
    console.error("WebGL Initialization Failed:", e);
}