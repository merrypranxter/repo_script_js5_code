/**
 * SIERPINSKI HALLUCINATION
 * A recursive, volumetric, raymarched Sierpinski tetrahedron field.
 * Combines 3D Iterated Function Systems (IFS) with moiré interference,
 * holographic iridescence, op-art contours, and glitchcore chromatic shifts.
 * 
 * Mouse X: Controls quasicrystal angular twist inside the recursion
 * Mouse Y: Controls chromatic aberration / glitch intensity
 * Keys: 
 *   [S] Save Screenshot
 *   [R] Reseed Palette
 *   [Space] Pause/Play Animation
 */

if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available. This shader requires WebGL 2.");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio || 1);
        
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
            in vec2 vUv;
            out vec4 fragColor;
            
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform vec2 u_mouse;
            uniform float u_seed;
            
            #define MAX_STEPS 90
            #define MAX_DIST 8.0
            #define SURF_DIST 0.001
            
            // 2D Rotation Matrix
            mat2 rot(float a) {
                float s = sin(a), c = cos(a);
                return mat2(c, -s, s, c);
            }
            
            // Candy-Acid Palette (Repo 5: Color Systems)
            // Hot pinks, teals, electric blues, neon greens
            vec3 palette(float t) {
                vec3 a = vec3(0.7, 0.5, 0.6);
                vec3 b = vec3(0.4, 0.4, 0.5);
                vec3 c = vec3(1.0, 1.0, 1.0);
                vec3 d = vec3(0.0, 0.33, 0.67) + u_seed;
                return a + b * cos(6.28318 * (c * t + d));
            }
            
            // 3D Sierpinski Tetrahedron Distance Estimator
            vec2 map(vec3 p) {
                float trap = 1e10;
                
                // Fluid/ripple distortion (Repo 1/2)
                p.xy += sin(p.z * 4.0 + u_time * 0.8) * 0.015;
                
                // Infinite spatial repetition for endless tunnels
                p = mod(p + 1.0, 2.0) - 1.0;
                
                float s = 1.0;
                float scale = 2.0;
                
                // Breathing recursion: slight offset oscillation
                vec3 offset = vec3(1.0 + sin(u_time * 1.5) * 0.03);
                
                // Quasicrystal angular twist controlled by mouse X
                float angle = (u_mouse.x - 0.5) * 0.3;
                mat2 rMap = rot(angle);
                
                for(int i = 0; i < 8; i++) {
                    // Fold space to create tetrahedrons
                    if(p.x + p.y < 0.0) p.xy = -p.yx;
                    if(p.x + p.z < 0.0) p.xz = -p.zx;
                    if(p.y + p.z < 0.0) p.yz = -p.zy;
                    
                    // Twist space for alien geometry
                    p.xy *= rMap;
                    p.xz *= rMap;
                    
                    // Scale and translate
                    p = p * scale - offset;
                    s *= scale;
                    
                    // Orbit trap: tracking distance to vertices/edges for coloring
                    trap = min(trap, length(p.xy) / s);
                }
                
                // True distance to the resulting fractal
                float d = (length(p) - 1.5) / s;
                return vec2(d, trap);
            }
            
            // Calculate Surface Normal
            vec3 calcNormal(vec3 p) {
                vec2 e = vec2(0.001, 0);
                return normalize(vec3(
                    map(p + e.xyy).x - map(p - e.xyy).x,
                    map(p + e.yxy).x - map(p - e.yxy).x,
                    map(p + e.yyx).x - map(p - e.yyx).x
                ));
            }
            
            void main() {
                // Normalize screen coordinates
                vec2 uv = (vUv - 0.5) * 2.0;
                uv.x *= u_resolution.x / u_resolution.y;
                
                // Camera setup: moving diagonally through the infinite grid
                float t = u_time * 0.25;
                vec3 ro = vec3(t, t, t);
                
                // Swaying look target
                vec3 lookAt = ro + vec3(1.0, 1.0 + sin(u_time * 0.7)*0.15, 1.0 + cos(u_time * 0.5)*0.15);
                
                vec3 f = normalize(lookAt - ro);
                vec3 r = normalize(cross(vec3(0,1,0), f));
                vec3 u = cross(f, r);
                vec3 rd = normalize(f + uv.x * r + uv.y * u);
                
                // Raymarching
                float d0 = 0.0;
                vec2 res;
                vec3 p;
                vec3 glow = vec3(0.0);
                
                for(int i = 0; i < MAX_STEPS; i++) {
                    p = ro + rd * d0;
                    res = map(p);
                    
                    // Accumulate volumetric glow based on orbit trap
                    vec3 gCol = palette(res.y * 12.0 - u_time);
                    glow += gCol * 0.0012 / (0.005 + abs(res.x));
                    
                    if(res.x < SURF_DIST || d0 > MAX_DIST) break;
                    d0 += res.x * 0.65; // Safe step to prevent clipping through folds
                }
                
                vec3 col = vec3(0.0);
                
                if(d0 < MAX_DIST) {
                    // Surface Hit
                    vec3 N = calcNormal(p);
                    vec3 V = -rd;
                    
                    // Base color driven by fractal trap
                    vec3 baseCol = palette(res.y * 8.0 + u_time * 0.5);
                    
                    // Holographic Iridescence (Repo 2 / Shiny Doctrine)
                    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.5);
                    vec3 holo = 0.5 + 0.5 * cos(u_time * 3.0 + fresnel * 12.0 + vec3(0, 2, 4));
                    
                    // Moiré Interference Grid (Repo 6)
                    float m1 = sin(p.x * 180.0);
                    float m2 = sin(p.y * 180.0);
                    float m3 = sin(p.z * 180.0);
                    float moire = max(0.0, m1 * m2 * m3);
                    
                    // Op-Art Contour Bands
                    float contour = smoothstep(0.9, 1.0, sin(res.y * 250.0 - u_time * 8.0));
                    
                    // Combine Surface Shading
                    col = mix(baseCol, holo, fresnel * 0.85);
                    col += moire * 0.4 * palette(res.y * 20.0 + 0.5);
                    col += contour * vec3(1.0); // White-hot edge accents
                }
                
                // Blend surface with volumetric glow
                col += glow * 0.8;
                
                // Distance fog to hide clipping
                col *= exp(-d0 * 0.4);
                
                // POST-PROCESSING 
                
                // Glitchcore Chromatic Aberration (Repo 7)
                float glitchIntensity = 0.02 * u_mouse.y;
                vec3 finalCol;
                finalCol.r = col.r;
                finalCol.g = col.g * (1.0 - glitchIntensity) + glow.g * glitchIntensity * 2.0;
                finalCol.b = col.b * (1.0 - glitchIntensity * 2.0) + glow.b * glitchIntensity * 4.0;
                
                // CRT Phosphor Bloom & Scanlines
                float scanline = sin(vUv.y * u_resolution.y * 3.0) * 0.03;
                finalCol -= scanline;
                finalCol += pow(max(finalCol, 0.0), vec3(2.2)) * 0.35; // Bloom
                
                // Vignette
                float vig = length(vUv - 0.5);
                finalCol *= smoothstep(0.85, 0.2, vig);
                
                fragColor = vec4(finalCol, 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
                u_seed: { value: Math.random() * 10.0 }
            },
            vertexShader,
            fragmentShader,
            depthWrite: false,
            depthTest: false
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);

        // State & Controls Management
        canvas.__state = {
            paused: false,
            timeAcc: time,
            lastTime: time
        };

        const handleKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if (key === 's') {
                const link = document.createElement('a');
                link.download = `sierpinski_hallucination_${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } else if (key === 'r') {
                material.uniforms.u_seed.value = Math.random() * 100.0;
            } else if (key === ' ') {
                canvas.__state.paused = !canvas.__state.paused;
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        
        // Save references for cleanup/updates
        canvas.__three = { 
            renderer, scene, camera, material, 
            cleanup: () => window.removeEventListener('keydown', handleKeyDown)
        };
    } catch (e) {
        console.error("WebGL Initialization Failed:", e);
        return;
    }
}

const { renderer, scene, camera, material } = canvas.__three;
const state = canvas.__state;

// Time Management (supports pausing)
let dt = time - state.lastTime;
state.lastTime = time;
if (!state.paused) {
    state.timeAcc += dt;
}

// Update Uniforms
if (material && material.uniforms) {
    material.uniforms.u_time.value = state.timeAcc;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
    
    // Smooth mouse coordinates [0.0, 1.0]
    const mx = mouse.x / grid.width;
    const my = mouse.y / grid.height;
    // Interpolate mouse for smoother movement
    material.uniforms.u_mouse.value.lerp(new THREE.Vector2(mx, my), 0.1);
}

// Render
renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);