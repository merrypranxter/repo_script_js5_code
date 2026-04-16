if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
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
                in vec2 vUv;
                out vec4 fragColor;
                
                uniform float u_time;
                uniform vec2 u_resolution;
                uniform vec2 u_mouse;
                
                // pixel_voxel: Bayer 4x4 ordered dithering matrix
                const float bayer4x4[16] = float[16](
                    0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
                   12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
                    3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
                   15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
                );

                // tesselations: P6M Wallpaper Group Folding
                vec2 foldP6m(vec2 p) {
                    const float sqrt3 = 1.7320508;
                    p = abs(p);
                    if (p.y > p.x * sqrt3) p = vec2(p.x * sqrt3 + p.y, p.x - p.y * sqrt3) * 0.5;
                    p = abs(p);
                    if (p.y > p.x * sqrt3) p = vec2(p.x * sqrt3 + p.y, p.x - p.y * sqrt3) * 0.5;
                    return abs(p);
                }

                // lisa_frank_aesthetic & glitchcore_style: Hyperpop Rupture Palette
                vec3 spectralPalette(float t) {
                    vec3 a = vec3(0.5);
                    vec3 b = vec3(0.5);
                    vec3 c = vec3(1.0);
                    vec3 d = vec3(0.0, 0.33, 0.67);
                    vec3 col = a + b * cos(6.28318 * (c * t + d));
                    // Push towards hot pink and electric cyan (Candy Broadcast)
                    float candy = smoothstep(0.5, 1.0, sin(t * 12.0));
                    return mix(col, vec3(1.0, 0.0, 0.8), candy * 0.5);
                }

                mat2 rot(float a) {
                    float s = sin(a), c = cos(a);
                    return mat2(c, -s, s, c);
                }

                // reaction_diffusion + structural_color: Gyroid with Gray-Scott Turing Spots
                float map(vec3 p) {
                    vec3 q = p;
                    
                    // Apply tessellation folding to space
                    q.xy = foldP6m(q.xy);
                    
                    // Morphing over time
                    q.z += u_time * 0.4;
                    q.xy *= rot(u_time * 0.1);
                    
                    // Base Gyroid SDF
                    float d = dot(sin(q), cos(q.zxy));
                    
                    // Reaction-Diffusion perturbation (Turing spots / U-Skate proxy)
                    float spots = sin(q.x * 6.0) * sin(q.y * 6.0) * sin(q.z * 6.0);
                    d -= spots * 0.25; // Create cellular/coral-like extrusions
                    
                    return d * 0.4; // Safe step multiplier for distorted SDF
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
                    // pixel_voxel: Stable Pixel Grid Lock
                    // Creates the low-res retro aesthetic before any processing
                    vec2 virtualRes = vec2(320.0, 320.0 * (u_resolution.y / u_resolution.x));
                    vec2 uv = floor(vUv * virtualRes) / virtualRes;
                    vec2 virtualCoord = uv * virtualRes;
                    
                    // glitchcore_style: Compression Chew / Macroblock Breakup
                    // Occasional horizontal tearing based on grid blocks
                    float blockY = floor(uv.y * 20.0);
                    float chew = step(0.95, fract(sin(blockY * 12.345 + u_time * 2.0) * 43758.54));
                    uv.x += chew * 0.05 * sin(u_time * 20.0);
                    
                    vec2 p = (uv - 0.5) * 2.0;
                    p.x *= u_resolution.x / u_resolution.y;

                    // Camera setup with seductively unstable mouse interaction
                    float mouseX = (u_mouse.x - 0.5) * 2.0;
                    float mouseY = (u_mouse.y - 0.5) * 2.0;
                    
                    vec3 ro = vec3(mouseX * 1.5, mouseY * 1.5, -4.0);
                    vec3 rd = normalize(vec3(p, 1.0));
                    rd.xy *= rot(mouseX * 0.5);
                    rd.yz *= rot(-mouseY * 0.5);

                    // Raymarching
                    float t = 0.0;
                    float max_t = 15.0;
                    int steps = 0;
                    for(int i = 0; i < 70; i++) {
                        vec3 pos = ro + rd * t;
                        float d = map(pos);
                        if(abs(d) < 0.001 || t > max_t) break;
                        t += d;
                        steps = i;
                    }

                    vec3 col = vec3(0.0);

                    if(t < max_t) {
                        // Surface Hit
                        vec3 pos = ro + rd * t;
                        vec3 n = calcNormal(pos);
                        vec3 v = -rd;

                        // structural_color: Thin-film Interference (Bragg Reflection)
                        float cosTheta = max(0.0, dot(n, v));
                        float thickness = 400.0 + sin(pos.z * 3.0 + u_time * 2.0) * 150.0;
                        // 2 * n_film * d * cos(theta)
                        float pathDiff = 2.0 * 1.4 * thickness * sqrt(1.0 - pow(sin(acos(cosTheta))/1.4, 2.0));
                        float phase = pathDiff / 500.0; // Normalize phase
                        
                        // glitchcore_style: Channel Split (Chromatic Aberration)
                        float glitchOffset = 0.06 * sin(u_time * 8.0 + pos.y * 15.0);
                        
                        // Apply spectral palette with RGB split
                        col.r = spectralPalette(phase + glitchOffset).r;
                        col.g = spectralPalette(phase).g;
                        col.b = spectralPalette(phase - glitchOffset).b;
                        
                        // Fake Ambient Occlusion based on ray steps
                        float ao = 1.0 - float(steps) / 70.0;
                        col *= ao * (0.5 + 0.5 * cosTheta);
                        
                    } else {
                        // op_art_style: Radial Hypnosis Field & Moire Phase Fields
                        float r = length(p);
                        float a = atan(p.y, p.x);
                        
                        // Concentric targets pulling inwards
                        float rings = sin(r * 30.0 - u_time * 15.0);
                        float spokes = sin(a * 10.0 + u_time * 3.0);
                        
                        // Figure-Ground Instability
                        float op = smoothstep(0.0, 0.1, rings * spokes);
                        
                        // Lisa Frank / Hyperpop background
                        vec3 bg1 = vec3(0.0, 1.0, 0.8); // Electric Cyan
                        vec3 bg2 = vec3(1.0, 0.0, 0.5); // Hot Pink
                        col = mix(bg1, bg2, op);
                        
                        // Vignette
                        col *= 1.0 - r * 0.3;
                    }

                    // pixel_voxel: Ordered Dither (Bayer 4x4) & Palette Mapping
                    int bx = int(virtualCoord.x) % 4;
                    int by = int(virtualCoord.y) % 4;
                    float bayerVal = bayer4x4[by * 4 + bx];
                    
                    // Dither spread and Quantization (Posterize)
                    float spread = 0.3;
                    col = col + (bayerVal - 0.5) * spread;
                    
                    // Snap to 4 color levels per channel (64 colors total)
                    float levels = 4.0;
                    col = floor(col * levels) / (levels - 1.0);

                    // glitchcore_style: CRT Contour Scanline overlay
                    float scanline = sin(uv.y * virtualRes.y * 3.14159);
                    col -= (scanline * 0.1);

                    fragColor = vec4(col, 1.0);
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
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
    
    // Handle mouse input (normalized to 0.0 - 1.0)
    let mx = 0.5;
    let my = 0.5;
    if (mouse && mouse.x !== undefined && mouse.y !== undefined) {
        mx = mouse.x / grid.width;
        my = 1.0 - (mouse.y / grid.height); // Flip Y for GLSL
    }
    
    // Smooth mouse movement for seductively unstable tracking
    if (!canvas.__three.smouse) canvas.__three.smouse = { x: 0.5, y: 0.5 };
    canvas.__three.smouse.x += (mx - canvas.__three.smouse.x) * 0.05;
    canvas.__three.smouse.y += (my - canvas.__three.smouse.y) * 0.05;
    
    material.uniforms.u_mouse.value.set(canvas.__three.smouse.x, canvas.__three.smouse.y);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);