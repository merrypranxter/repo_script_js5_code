try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    // Check if Three.js is already initialized on this canvas
    if (!canvas.__three) {
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
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
            in vec2 vUv;
            out vec4 fragColor;
            
            uniform float u_time;
            uniform vec2 u_resolution;

            // --- HASH & NOISE ---
            float hash11(float p) {
                p = fract(p * .1031);
                p *= p + 33.33;
                p *= p + p;
                return fract(p);
            }
            
            float hash21(vec2 p) {
                vec3 p3  = fract(vec3(p.xyx) * .1031);
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.x + p3.y) * p3.z);
            }

            // --- VHS & DATAMOSH GLITCH ---
            vec2 glitchUV(vec2 uv, float time) {
                vec2 guv = uv;
                float t = floor(time * 12.0) / 12.0; // 12fps quantization for authentic jank
                
                // Horizontal Tearing
                float tearFreq = 10.0 + hash11(t) * 30.0;
                float tear = step(0.85, hash11(floor(uv.y * tearFreq) + t));
                if (tear > 0.0) {
                    guv.x += (hash11(floor(uv.y * tearFreq) * 12.3 + t) - 0.5) * 0.8;
                }

                // Macroblocking (Datamosh residue)
                vec2 block = floor(uv * vec2(16.0, 12.0));
                if (hash21(block + t) > 0.85) {
                    guv += (vec2(hash21(block), hash21(block + 1.0)) - 0.5) * 0.25;
                }
                
                // Vertical V-Sync jump
                if (hash11(t * 2.1) > 0.92) {
                    guv.y = fract(guv.y + hash11(t * 3.4));
                }

                return guv;
            }

            // --- RETINAL SURREALISM (OP ART) ---
            float opArt(vec2 p, float time) {
                float r = max(length(p), 0.001);
                float a = atan(p.y, p.x);
                
                // 1. Checker Funnel Tunnel
                float z = 0.5 / r;
                float spiral1 = a * 5.0 + z * 8.0 - time * 4.0;
                float spiral2 = a * 5.0 - z * 8.0 + time * 3.0;
                float checker = step(0.0, sin(spiral1) * sin(spiral2));
                
                // 2. Stripe Fluid Distortion (Zebra Waves)
                vec2 wp = p + vec2(sin(r * 10.0 - time), cos(a * 5.0 + time)) * 0.2;
                float wr = length(wp);
                float wa = atan(wp.y, wp.x);
                float zebra = step(0.0, sin(wr * 30.0 - time * 6.0 + sin(wa * 7.0) * 2.5));
                
                // 3. Radial Hypnosis Fields
                float rays = step(0.0, sin(a * 20.0 + sin(r * 20.0 - time * 5.0) * 3.0));
                
                // Domain Warping Mask
                float mask = sin(p.x * 4.0 + time) * cos(p.y * 4.0 - time * 0.8);
                
                if (mask > 0.3) return checker;
                if (mask < -0.3) return zebra;
                return rays;
            }

            // --- EARLY INTERNET SDFs & MOTIFS ---
            float sdHeart(vec2 p) {
                p.x = abs(p.x);
                p.y += 0.4;
                if( p.y+p.x>1.0 ) return sqrt(dot(p-vec2(0.25,0.75),p-vec2(0.25,0.75))) - sqrt(2.0)/4.0;
                return sqrt(min(dot(p-vec2(0.00,1.00),p-vec2(0.00,1.00)),
                                dot(p-0.5*max(p.x+p.y,0.0),p-0.5*max(p.x+p.y,0.0)))) * sign(p.x-p.y);
            }

            float fakeText(vec2 uv) {
                vec2 grid = floor(uv * vec2(25.0, 5.0));
                vec2 local = fract(uv * vec2(25.0, 5.0));
                float charNoise = hash21(grid);
                float pixel = step(0.5, hash21(grid + floor(local * 4.0)));
                return pixel * step(0.1, local.x) * step(0.1, local.y) * step(charNoise, 0.6);
            }

            // --- FULL SCENE COMPOSITION ---
            vec3 scene(vec2 uv, float time, vec2 res) {
                vec2 p = uv * 2.0 - 1.0;
                p.x *= res.x / res.y;
                
                // Base Op Art Scaffold (Black & White)
                vec3 col = vec3(opArt(p, time));

                // Floating Hearts (MySpace Stickers)
                vec2 hP = fract(p * 2.0 + vec2(sin(time), time * 0.5)) * 2.0 - 1.0;
                float dHeart = sdHeart(hP * 1.5);
                if (dHeart < 0.0) {
                    col = vec3(1.0, 0.1, 0.6); // Hot Pink
                    if (dHeart > -0.1) col = vec3(1.0); // White Outline
                }

                // Windows 95 Error Box
                vec2 boxP = p - vec2(0.0, 0.2); 
                boxP.x += sin(time * 3.0 + p.y * 10.0) * 0.02; // Glitch Wobble
                vec2 boxSize = vec2(0.7, 0.5);
                vec2 dBox = abs(boxP) - boxSize;
                float distBox = length(max(dBox, 0.0)) + min(max(dBox.x, dBox.y), 0.0);
                
                // Drop Shadow
                vec2 dShadow = abs(boxP - vec2(0.05, -0.05)) - boxSize;
                float distShadow = length(max(dShadow, 0.0)) + min(max(dShadow.x, dShadow.y), 0.0);
                if (distShadow < 0.0 && distBox >= 0.0) col *= 0.2; 
                
                if (distBox < 0.0) {
                    col = vec3(0.75); // UI Gray
                    
                    if (boxP.y > boxSize.y - 0.12) {
                        col = vec3(0.0, 0.0, 0.6); // Navy Title Bar
                        // Red X Button
                        vec2 xP = boxP - vec2(boxSize.x - 0.08, boxSize.y - 0.06);
                        if (abs(xP.x) < 0.05 && abs(xP.y) < 0.05) {
                            col = vec3(0.8, 0.2, 0.2);
                            if (abs(xP.x - xP.y) < 0.015 || abs(xP.x + xP.y) < 0.015) col = vec3(1.0);
                        }
                    } else {
                        // Corrupted Text
                        float txt = fakeText(boxP * vec2(4.0, 8.0) + vec2(time * 0.5, 0.0));
                        if (txt > 0.0 && abs(boxP.x) < boxSize.x - 0.1) col = vec3(0.0);
                        
                        // Scrolling Marquee Error
                        vec2 marqueeP = boxP * vec2(4.0, 8.0);
                        marqueeP.x += time * 2.0;
                        if (marqueeP.y > -2.0 && marqueeP.y < 0.0) {
                            if (fakeText(marqueeP) > 0.0) col = vec3(1.0, 0.0, 0.0);
                        }
                    }
                    
                    // 3D Bevel
                    if (dBox.x > -0.02 || dBox.y > -0.02) {
                        if (boxP.x < -boxSize.x + 0.02 || boxP.y > boxSize.y - 0.02) col = vec3(0.95);
                        else col = vec3(0.3);
                    }
                }

                // Forum Signature Blinkies
                if (uv.y < 0.08) {
                    float bx = p.x * 10.0;
                    float blink = step(0.5, hash11(floor(bx) + floor(time * 8.0)));
                    vec3 blinkCol = mix(vec3(1.0, 0.0, 0.8), vec3(0.0, 1.0, 1.0), hash11(floor(bx)));
                    col = mix(vec3(0.0), blinkCol, blink);
                    if (fract(bx) < 0.05 || fract(uv.y * 12.5) < 0.1) col = vec3(1.0);
                }

                // Profile Glitter Graphics
                float glitterSeed = hash21(uv * 500.0);
                if (glitterSeed > 0.95) {
                    float twinkle = sin(time * 50.0 + glitterSeed * 100.0) * 0.5 + 0.5;
                    vec3 glitCol = mix(vec3(1.0, 0.2, 0.8), vec3(0.2, 1.0, 1.0), hash11(glitterSeed * 100.0));
                    col = mix(col, glitCol * 2.0, twinkle);
                }

                return col;
            }

            void main() {
                vec2 uv = vUv;
                
                // 1. Apply Global Glitch to Coordinates
                vec2 guv = glitchUV(uv, u_time);

                // 2. Compute RGB Split Offsets (Spikes randomly for intense chromatic aberration)
                float t_glitch = floor(u_time * 12.0) / 12.0;
                float splitAmt = 0.005 + step(0.7, hash11(t_glitch * 5.0)) * 0.05;
                vec2 rOffset = vec2(splitAmt * sin(u_time * 5.0), splitAmt * cos(u_time * 3.0));
                vec2 bOffset = vec2(-splitAmt * cos(u_time * 7.0), -splitAmt * sin(u_time * 4.0));
                
                // 3. Evaluate Scene 3 times for Color Channels
                vec3 cR = scene(guv + rOffset, u_time, u_resolution);
                vec3 cG = scene(guv, u_time, u_resolution);
                vec3 cB = scene(guv + bOffset, u_time, u_resolution);
                
                // 4. Map Chromatic Aberration to Acid/Toxic Palettes
                vec3 baseCol = cG;
                vec3 diffR = abs(cR - cG);
                vec3 diffB = abs(cB - cG);
                
                // Force bleeding edges into Hot Pink and Electric Cyan
                vec3 fringeR = diffR * vec3(1.0, 0.0, 0.8); 
                vec3 fringeB = diffB * vec3(0.0, 1.0, 1.0); 
                
                vec3 finalCol = baseCol + fringeR + fringeB;
                
                // 5. Hardware Decay: CRT Scanlines & Vignette
                float scanline = sin(uv.y * u_resolution.y * 3.1415) * 0.08;
                finalCol -= scanline;
                
                float vignette = length(uv - 0.5);
                finalCol *= smoothstep(0.8, 0.3, vignette);

                fragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
            },
            vertexShader,
            fragmentShader
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);

        canvas.__three = { renderer, scene, camera, material };
    }

    const { renderer, scene, camera, material } = canvas.__three;
    
    if (material && material.uniforms) {
        material.uniforms.u_time.value = time;
        material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
    
    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

} catch (e) {
    console.error("WebGL Initialization Failed:", e);
}