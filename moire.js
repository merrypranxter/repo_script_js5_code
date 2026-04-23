if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
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
            uniform vec2 u_mouse;
            uniform float u_mousePressed;

            in vec2 vUv;
            out vec4 fragColor;

            // REPO 2: Curvature Logic & Stripe-Fluid Distortion
            vec2 domainWarp(vec2 p, float t) {
                float n = sin(p.x * 6.0 + t) * cos(p.y * 6.0 - t) * 0.04;
                float m = cos(p.x * 9.0 - t * 0.8) * sin(p.y * 9.0 + t * 0.9) * 0.03;
                return p + vec2(n, m);
            }

            // REPO 1: Wave / Sinusoidal Moiré
            float sineGrating(vec2 p, float freq, float angle, float phase) {
                vec2 dir = vec2(cos(angle), sin(angle));
                float x = dot(p, dir);
                return 0.5 + 0.5 * sin(x * freq + phase);
            }

            // REPO 1: Radial Rings Moiré
            float concentric(vec2 p, float freq, float phase) {
                return 0.5 + 0.5 * sin(length(p) * freq + phase);
            }

            // REPO 1: Spiral Phantoms
            float spiralGrating(vec2 p, float tightness, float arms, float phase) {
                float r = length(p);
                float a = atan(p.y, p.x);
                return 0.5 + 0.5 * sin(a * arms + log(r + 0.001) * tightness + phase);
            }

            void main() {
                vec2 uv = (vUv - 0.5) * (u_resolution.xy / u_resolution.y);
                vec2 m = (u_mouse - 0.5) * (u_resolution.xy / u_resolution.y);
                
                // REPO 2: Eye-Object Iconography & False Depth
                vec2 eyePos = m * 0.4; 
                vec2 deltaEye = uv - eyePos;
                float distEye = length(deltaEye);
                
                float eyePush = exp(-distEye * 6.0) * 0.2;
                vec2 p = uv + normalize(deltaEye) * eyePush;
                
                vec2 wuvR = domainWarp(p, u_time * 0.3);
                vec2 wuvG = domainWarp(p, u_time * 0.35);
                vec2 wuvB = domainWarp(p, u_time * 0.4);
                
                // REPO 1: Anamorphic Secret
                // Mouse press forces all channels into perfect phase alignment
                float align = u_mousePressed;
                
                float scaleR = 60.0;
                float scaleG = mix(61.5, 60.0, align);
                float scaleB = mix(63.0, 60.0, align);
                
                vec2 cR = mix(vec2(sin(u_time*0.2), cos(u_time*0.25)) * 0.04, vec2(0.0), align);
                vec2 cG = mix(vec2(cos(u_time*0.23), sin(u_time*0.21)) * 0.04, vec2(0.0), align);
                vec2 cB = mix(vec2(sin(u_time*0.27), cos(u_time*0.19)) * 0.04, vec2(0.0), align);
                
                // REPO 2: Line Density Shifts (Chirp)
                float rMod = 1.0 + 0.15 * sin(length(wuvR) * 12.0 - u_time * 2.0);
                float gMod = 1.0 + 0.15 * sin(length(wuvG) * 12.0 - u_time * 2.0);
                float bMod = 1.0 + 0.15 * sin(length(wuvB) * 12.0 - u_time * 2.0);

                float r1 = concentric(wuvR - cR, scaleR * rMod, u_time * 2.0);
                float g1 = concentric(wuvG - cG, scaleG * gMod, u_time * 2.0);
                float b1 = concentric(wuvB - cB, scaleB * bMod, u_time * 2.0);
                
                float spiralR = 15.0;
                float spiralG = mix(15.5, 15.0, align);
                float spiralB = mix(16.0, 15.0, align);
                
                float tR = -u_time * 1.5;
                float tG = mix(-u_time * 1.6, tR, align);
                float tB = mix(-u_time * 1.7, tR, align);
                
                float r2 = spiralGrating(wuvR + cR, spiralR, 5.0, tR);
                float g2 = spiralGrating(wuvG + cG, spiralG, 5.0, tG);
                float b2 = spiralGrating(wuvB + cB, spiralB, 5.0, tB);
                
                // REPO 2: Plush Candy Fuzziness via FM Screening Grain
                float grain = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
                vec2 fUvR = wuvR + grain * 0.005;
                vec2 fUvG = wuvG + grain * 0.005;
                vec2 fUvB = wuvB + grain * 0.005;
                
                float linR = 0.5;
                float linG = mix(0.55, 0.5, align);
                float linB = mix(0.6, 0.5, align);
                
                float r3 = sineGrating(fUvR, scaleR * 0.8, linR, u_time);
                float g3 = sineGrating(fUvG, scaleG * 0.8, linG, u_time);
                float b3 = sineGrating(fUvB, scaleB * 0.8, linB, u_time);
                
                // Multiplicative blending for natural interference
                float R = r1 * r2 * r3;
                float G = g1 * g2 * g3;
                float B = b1 * b2 * b3;
                
                vec3 moire = vec3(R, G, B);
                
                // REPO 2: Contrast is Structural (Non-negotiables)
                moire = pow(moire, vec3(0.4)); 
                moire = smoothstep(0.08, 0.7, moire); 
                
                // REPO 2: Chromatic Acceleration / Acid Palettes
                float luma = dot(moire, vec3(0.299, 0.587, 0.114));
                vec3 acidMoire = mix(vec3(luma), moire, mix(3.5, 1.0, align));
                
                // REPO 2: The Main Eye / Portal
                float sclera = smoothstep(0.18, 0.17, distEye);
                float iris = smoothstep(0.10, 0.09, distEye);
                float pupil = mix(smoothstep(0.04, 0.03, distEye), smoothstep(0.08, 0.07, distEye), align);
                
                float angle = atan(deltaEye.y, deltaEye.x);
                float spokes = 0.5 + 0.5 * sin(angle * 40.0 + u_time * 3.0);
                spokes *= 0.5 + 0.5 * sin(distEye * 100.0 - u_time * 5.0);
                
                vec3 scleraCol = vec3(0.95);
                vec3 irisCol = mix(vec3(0.0, 1.0, 0.8), vec3(1.0, 0.0, 0.8), spokes);
                if (align > 0.5) irisCol = mix(irisCol, vec3(1.0, 0.0, 0.0), align); // Angry red when aligned
                
                vec3 eyeColor = mix(scleraCol, irisCol, iris);
                eyeColor = mix(eyeColor, vec3(0.05), pupil);
                
                // REPO 2: Prismatic Eyelid Edge Behavior
                float lidDist = abs(distEye - 0.18);
                float lidGlow = exp(-lidDist * 30.0);
                vec3 prismaticLid = vec3(lidGlow, lidGlow*0.4, lidGlow*1.5) * vec3(1.0, 0.2, 0.8);
                prismaticLid = mix(prismaticLid, vec3(lidGlow), align);
                
                vec3 finalColor = mix(acidMoire, eyeColor, sclera);
                finalColor += prismaticLid * (1.0 - sclera) * 0.9;
                
                // REPO 2: Repeating Witness Species (Orbiting small eyes)
                vec3 smallEyeCol = vec3(0.0);
                float smallEyesMask = 0.0;
                for(int i = 0; i < 3; i++) {
                    float fi = float(i);
                    float angleOffset = u_time * (0.4 + fi * 0.15) + fi * 2.094;
                    float orbitRadius = 0.35 + 0.05 * sin(u_time * 2.0 + fi * 3.0);
                    vec2 pos = eyePos + vec2(cos(angleOffset), sin(angleOffset)) * orbitRadius;
                    
                    float d = length(uv - pos);
                    float scl = smoothstep(0.05, 0.045, d);
                    float ir = smoothstep(0.025, 0.02, d);
                    float pu = smoothstep(0.012, 0.008, d);
                    
                    vec3 col = mix(vec3(0.95), vec3(0.8, 1.0, 0.0), ir); // Toxic lime
                    col = mix(col, vec3(0.05), pu);
                    
                    smallEyeCol += col * scl;
                    smallEyesMask += scl;
                }
                smallEyesMask = clamp(smallEyesMask, 0.0, 1.0) * (1.0 - align);
                finalColor = mix(finalColor, smallEyeCol, smallEyesMask);
                
                // Vignette
                finalColor *= 1.0 - length(uv) * 0.5;
                
                fragColor = vec4(finalColor, 1.0);
            }
        `;
        
        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2() },
                u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
                u_mousePressed: { value: 0.0 }
            },
            vertexShader,
            fragmentShader
        });
        
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);
        
        canvas.__three = { renderer, scene, camera, material };
        canvas.__mouse = { x: 0.5, y: 0.5 };
    } catch (e) {
        return;
    }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material && material.uniforms) {
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
    
    const targetX = mouse.x / grid.width;
    const targetY = 1.0 - (mouse.y / grid.height);
    
    canvas.__mouse.x += (targetX - canvas.__mouse.x) * 0.1;
    canvas.__mouse.y += (targetY - canvas.__mouse.y) * 0.1;
    
    material.uniforms.u_mouse.value.set(canvas.__mouse.x, canvas.__mouse.y);
    
    const targetPress = mouse.isPressed ? 1.0 : 0.0;
    material.uniforms.u_mousePressed.value += (targetPress - material.uniforms.u_mousePressed.value) * 0.15;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);