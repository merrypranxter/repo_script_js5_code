if (!canvas.__three) {
    try {
        const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
        if (!gl) throw new Error("WebGL2 required");

        const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: false });
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
            uniform vec2 u_mouse;
            uniform float u_pressed;

            in vec2 vUv;
            out vec4 fragColor;

            // --- NOISE & HASH (noise_fields) ---
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

            // --- BAYER 4x4 DITHER (pixel_voxel) ---
            const float bayer[16] = float[16](
                0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
               12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
                3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
               15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
            );

            // --- COSINE PALETTE: NEON ACID / LISA FRANK (color_fields) ---
            vec3 palette(float t) {
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.33);
                vec3 c = vec3(2.0, 1.0, 1.0);
                vec3 d = vec3(0.5, 0.2, 0.25);
                return a + b * cos(6.2831853 * (c * t + d));
            }

            // --- 4D QUASICRYSTAL SDF (quasicrystals) ---
            // Summing waves at 5-fold symmetry angles to create aperiodic structures
            float quasicrystal(vec3 p) {
                float d = 0.0;
                for(int i = 0; i < 5; i++) {
                    float theta = float(i) * 3.14159265 * 0.4; // 72 degrees
                    vec2 dir = vec2(cos(theta), sin(theta));
                    // Domain Warp / Fungal Growth distortion
                    float warp = noise(p.xy * 3.0 - u_time * 0.5) * 0.2;
                    d += sin(dot(p.xy, dir) * 5.0 + p.z * 3.0 + u_time * 1.5 + warp);
                }
                return d * 0.2;
            }

            float map(vec3 p) {
                // Base structure: a sphere being eaten by quasicrystal math
                float sphere = length(p) - 1.2;
                float qc = quasicrystal(p);
                
                // Melt / Datamosh mechanism on click
                if (u_pressed > 0.5) {
                    p.y -= noise(p.xz * 10.0 + u_time) * 0.5; // Gravity drag / smear
                    qc *= 2.0; // Overclock the crystal
                }
                
                // Displacement
                return sphere + qc * (0.5 + 0.5 * sin(u_time));
            }

            vec3 calcNormal(vec3 p) {
                vec2 e = vec2(0.01, 0.0);
                return normalize(vec3(
                    map(p + e.xyy) - map(p - e.xyy),
                    map(p + e.yxy) - map(p - e.yxy),
                    map(p + e.yyx) - map(p - e.yyx)
                ));
            }

            void main() {
                // --- PIXEL GRID LOCK & DAMAGE AESTHETICS ---
                // Dynamic resolution: macroblocking codec failure on click
                vec2 virtRes = mix(vec2(320.0, 240.0), vec2(64.0, 48.0), u_pressed);
                vec2 qUv = floor(vUv * virtRes) / virtRes;
                
                // VHS Tracking Tear
                float tearThreshold = mix(0.98, 0.85, u_pressed);
                float tear = step(tearThreshold, noise(vec2(u_time * 4.0, qUv.y * 15.0)));
                float jitter = noise(vec2(u_time * 12.0, qUv.y * 40.0)) * 0.05 * tear;
                qUv.x += jitter;

                // Setup Raymarching
                vec2 p = qUv * 2.0 - 1.0;
                p.x *= u_resolution.x / u_resolution.y;

                vec3 ro = vec3(0.0, 0.0, -3.0);
                vec3 rd = normalize(vec3(p, 1.5));
                
                // Orbital camera + Mouse input
                float mx = u_mouse.x * 3.14 + u_time * 0.2;
                float my = (u_mouse.y - 0.5) * 2.0;
                mat2 rx = mat2(cos(my), -sin(my), sin(my), cos(my));
                mat2 ry = mat2(cos(mx), -sin(mx), sin(mx), cos(mx));
                ro.yz *= rx; rd.yz *= rx;
                ro.xz *= ry; rd.xz *= ry;

                // Sphere Tracing
                float t = 0.0;
                float d = 0.0;
                for(int i = 0; i < 60; i++) {
                    vec3 pos = ro + rd * t;
                    d = map(pos);
                    if(d < 0.005 || t > 10.0) break;
                    t += d;
                }

                // --- SHADING & COLOR ---
                vec3 col = vec3(0.02, 0.0, 0.05); // Cosmic Void background
                
                if(t < 10.0) {
                    vec3 pos = ro + rd * t;
                    vec3 nor = calcNormal(pos);
                    vec3 lig = normalize(vec3(1.0, 1.0, -1.0));
                    
                    float dif = max(dot(nor, lig), 0.0);
                    float ao = clamp(map(pos + nor * 0.1) * 10.0, 0.0, 1.0);
                    
                    // Map geometry to Neon Acid palette
                    float palIdx = pos.z * 0.3 + u_time * 0.2 + dif * 0.5;
                    col = palette(palIdx) * dif * ao;
                    
                    // Emissive Toxic Growth in crevices
                    col += palette(palIdx + 0.4) * (1.0 - ao) * 1.5;
                } else {
                    // Screenshot of screenshot decay background noise
                    col += noise(qUv * 50.0 + u_time) * 0.05 * vec3(1.0, 0.0, 1.0);
                }

                // --- DITHERPUNK & QUANTIZATION (pixel_voxel) ---
                int bx = int(gl_FragCoord.x) % 4;
                int by = int(gl_FragCoord.y) % 4;
                float bayerVal = bayer[by * 4 + bx];
                
                // Add dither spread
                float spread = 0.25;
                col += (bayerVal - 0.5) * spread;
                
                // Quantize to extended palette bands (e.g., 6 steps)
                float steps = 6.0;
                col = floor(col * steps + 0.5) / steps;

                // --- ANALOG SIGNAL FAILURE (damage_aesthetics) ---
                // Chroma bleed (fake RGB split based on luminance edge)
                float luma = dot(col, vec3(0.299, 0.587, 0.114));
                float bleed = noise(vec2(qUv.y * 25.0, u_time)) * 0.1;
                col.r += luma * bleed * 2.0;
                col.b -= luma * bleed;

                // CRT Scanlines
                float scanline = sin(qUv.y * virtRes.y * 3.14159) * 0.15;
                col -= scanline;

                fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader,
            fragmentShader,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
                u_pressed: { value: 0.0 }
            },
            depthWrite: false,
            depthTest: false
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);

        canvas.__three = { renderer, scene, camera, material };
    } catch (err) {
        console.error("Feral WebGL Initialization Failed:", err);
        return;
    }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material?.uniforms) {
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
    
    // Normalize mouse
    const mx = mouse.x / grid.width;
    const my = 1.0 - (mouse.y / grid.height); // Flip Y for GLSL
    
    // Smooth mouse interpolation for the strange attractor feel
    material.uniforms.u_mouse.value.x += (mx - material.uniforms.u_mouse.value.x) * 0.1;
    material.uniforms.u_mouse.value.y += (my - material.uniforms.u_mouse.value.y) * 0.1;
    
    // Handle interaction state (Datamosh trigger)
    material.uniforms.u_pressed.value += ((mouse.isPressed ? 1.0 : 0.0) - material.uniforms.u_pressed.value) * 0.2;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);