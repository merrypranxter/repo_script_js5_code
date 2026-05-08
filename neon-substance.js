if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
        camera.position.z = 1;
        
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: { 
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
            },
            vertexShader: `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                in vec2 vUv;
                out vec4 fragColor;
                uniform float u_time;
                uniform vec2 u_resolution;

                #define PI 3.14159265359

                // Hash function for quantum dust / fast shimmer
                float hash(vec2 p) {
                    vec3 p3  = fract(vec3(p.xyx) * 0.1031);
                    p3 += dot(p3, p3.yzx + 33.33);
                    return fract((p3.x + p3.y) * p3.z);
                }

                // 2D Value Noise
                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    vec2 u = f*f*(3.0-2.0*f);
                    return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
                }

                // Fractional Brownian Motion for fluid domain warping
                float fbm(vec2 p) {
                    float v = 0.0;
                    float a = 0.5;
                    mat2 rot = mat2(0.866, -0.5, 0.5, 0.866);
                    for (int i = 0; i < 5; ++i) {
                        v += a * noise(p);
                        p = rot * p * 2.0 + vec2(100.0);
                        a *= 0.5;
                    }
                    return v;
                }

                // Bismuth/Deco Metric (L-Infinity combined with polar sunburst)
                float decoMetric(vec2 p) {
                    // 45 degree rotation to create diamond/chevron orientation
                    mat2 rot = mat2(0.707, -0.707, 0.707, 0.707);
                    vec2 pr = rot * p;
                    
                    // Chebyshev distance (L-Infinity) for square/stepped geometry
                    float d_inf = max(abs(pr.x), abs(pr.y));
                    
                    // Sunburst modulation (Art Deco 12-fold radial symmetry)
                    float angle = atan(p.y, p.x);
                    float burst = 1.0 + 0.15 * sin(angle * 12.0); 
                    
                    return d_inf * burst;
                }

                void main() {
                    // Normalize and scale UVs
                    vec2 uv = (vUv - 0.5);
                    uv.x *= u_resolution.x / u_resolution.y;
                    uv *= 4.0; 

                    // 3 Simultaneous Time Scales
                    float t_slow = u_time * 0.05;
                    float t_med  = u_time * 0.2;
                    float t_fast = u_time * 2.0;

                    // 1. Slow Global Drift: Fluid Domain Warping
                    vec2 q = vec2(fbm(uv * 1.5 + t_slow), fbm(uv * 1.5 - t_slow + 4.3));
                    vec2 r = vec2(fbm(uv * 3.0 + q * 2.0 + t_slow * 1.5), fbm(uv * 3.0 + q * 2.0 - t_slow * 1.2));
                    vec2 warpedUV = uv + r * 0.5;

                    // 2. Medium Structural Motion: Stepped Ziggurat / Bismuth Growth
                    float d = decoMetric(warpedUV);
                    
                    // Create stepped strata (Bismuth crystals / Deco setbacks)
                    float strata = fract(d * 6.0 - t_med);
                    float strataGradients = smoothstep(0.0, 0.1, strata) - smoothstep(0.8, 1.0, strata);
                    
                    // Create metallic inlay ridges (Shine as a structure)
                    float ridge = smoothstep(0.0, 0.02, strata) - smoothstep(0.02, 0.05, strata);
                    
                    // Kintsugi Crack Seam (fracture logic)
                    float seamNoise = fbm(warpedUV * 4.0);
                    float seam = smoothstep(0.015, 0.0, abs(seamNoise - 0.5));

                    // Caustic Projection (interference holography)
                    float caustic = 0.0;
                    vec2 cUV = warpedUV * 2.5;
                    for(int i=0; i<3; i++) {
                        cUV += vec2(sin(cUV.y * 2.0 + t_med), cos(cUV.x * 2.0 - t_med)) * 0.4;
                        caustic += abs(sin(cUV.x + cUV.y));
                    }
                    caustic = pow(max(0.0, 1.0 - caustic / 3.0), 4.0);

                    // 3. Fast Detail Shimmer: Quantum Dust / Mica Flakes
                    float shimmer = hash(warpedUV * 200.0 + t_fast);
                    float glitter = step(0.98, shimmer) * strataGradients;

                    // Color Palette: Void Black, Neon Cyan, Magenta, Yellow
                    vec3 voidBlack = vec3(0.02, 0.01, 0.03);
                    vec3 cyan = vec3(0.0, 1.0, 0.9);
                    vec3 magenta = vec3(1.0, 0.0, 0.8);
                    vec3 yellow = vec3(1.0, 0.9, 0.0);

                    // Base material is void black with structural depth shadowing
                    vec3 color = voidBlack * (0.2 + 0.8 * strataGradients);

                    // Structural color from disorder / Birefringence phase shift
                    float colorPhase = fbm(warpedUV * 4.0 + d * 3.0 - t_med);
                    
                    vec3 structuralColor = mix(cyan, magenta, smoothstep(0.2, 0.5, colorPhase));
                    structuralColor = mix(structuralColor, yellow, smoothstep(0.6, 0.9, colorPhase));

                    // Apply structural color to the Deco ridges (metallic inlay)
                    color = mix(color, structuralColor, ridge * 2.0);
                    
                    // Apply Kintsugi seams (filled with bright neon gradient)
                    color = mix(color, mix(yellow, magenta, colorPhase), seam * 2.0);

                    // Add Caustic light pools (cyan/magenta split projection)
                    color += cyan * caustic * 0.5 * (1.0 - colorPhase);
                    color += magenta * caustic * 0.5 * colorPhase;

                    // Add glow to the deep valleys (Entropic buried shine)
                    float valleyGlow = smoothstep(0.85, 1.0, strata);
                    color += structuralColor * valleyGlow * 0.6;

                    // Add fast shimmer (Glitter ecology)
                    color += vec3(1.0) * glitter * 1.5;

                    // Vignette to emphasize the void
                    float vig = length(uv);
                    color *= smoothstep(2.5, 0.5, vig);

                    fragColor = vec4(min(color, 1.0), 1.0);
                }
            `
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
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) {
        material.uniforms.u_resolution.value.x = grid.width;
        material.uniforms.u_resolution.value.y = grid.height;
    }
}
renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);