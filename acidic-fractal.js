try {
    if (!canvas.__three) {
        if (!ctx) throw new Error("WebGL 2 context not available for feral fractal execution.");
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
        camera.position.z = 1;
        
        const vertexShader = `
            out vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        const fragmentShader = `
            in vec2 vUv;
            out vec4 fragColor;
            
            uniform float u_time;
            uniform vec2 u_resolution;

            // [KIYOSHI-ABSORBER] Deterministic Frame Random & Noise
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            float noise(vec2 p) {
                vec2 i = floor(p), f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                           mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
            }
            float fbm(vec2 p) {
                float v = 0.0, a = 0.5;
                for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
                return v;
            }
            vec3 voronoi(vec2 p) {
                vec2 n = floor(p), f = fract(p);
                float md = 8.0;
                vec2 mo = vec2(0.0);
                for(int y = -1; y <= 1; y++) {
                    for(int x = -1; x <= 1; x++) {
                        vec2 g = vec2(float(x), float(y));
                        vec2 o = vec2(hash(n + g), hash(n + g + 13.0));
                        vec2 r = g + o - f;
                        float d = dot(r, r);
                        if(d < md) { md = d; mo = n + g; }
                    }
                }
                return vec3(md, mo, 0.0);
            }

            // [REPO 2: COLOR FIELDS] - Neon Acid (IQ Cosine Palette)
            vec3 neonAcid(float t) {
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.33);
                vec3 c = vec3(2.0, 1.0, 1.0);
                vec3 d = vec3(0.5, 0.2, 0.25);
                return a + b * cos(6.28318 * (c * t + d));
            }

            // [REPO 4: STRUCTURAL COLOR] - Thin Film Interference
            vec3 thinFilm(float thickness) {
                float phase = thickness * 15.0;
                // 2nd cos(θ) = mλ approximation mapped to RGB phase shifts
                return 0.5 + 0.5 * cos(6.28318 * (vec3(1.0, 1.3, 1.6) * phase + vec3(0.0, 0.33, 0.67)));
            }

            void main() {
                vec2 uv = (vUv - 0.5) * 2.0;
                uv.x *= u_resolution.x / u_resolution.y;
                
                // [REPO 5 & 6: MYCELIAL NETWORKS] 
                // Lignin peroxidase front (White rot) vs Cellulase front (Brown rot)
                float enzyme = fbm(uv * 2.2 - u_time * 0.12);
                float mycelium = smoothstep(0.35, 0.65, enzyme); // The infection gradient
                
                // Voronoi cells simulating "Cubical Cracking" from Brown Rot
                vec3 vor = voronoi(uv * 7.0 + u_time * 0.08);
                float cubicalCrack = smoothstep(0.1, 0.0, vor.x);
                
                // [REPO 7: THE-LISTS] - Divine Data Corruption (Glitch Mechanics)
                vec2 glitch = vec2(0.0);
                if (hash(vec2(floor(vUv.y * 40.0), floor(u_time * 12.0))) > 0.95) {
                    glitch.x = (hash(uv + u_time) - 0.5) * 0.15;
                    glitch.y = (hash(uv - u_time) - 0.5) * 0.15;
                }

                // [REPO 1: FRACTALS] - Autophagic Mandelbrot / Burning Ship Hybrid
                vec2 z = vec2(0.0);
                float zoom = 1.0 - 0.7 * sin(u_time * 0.15);
                
                // Target Seahorse Valley, but warped by the glitch
                vec2 center = vec2(-0.745, 0.113); 
                vec2 c = (uv + glitch) * zoom + center + vec2(sin(u_time * 0.04), cos(u_time * 0.06)) * 0.1;
                
                float iter = 0.0;
                const int MAX_ITER = 120;
                float trap = 1e10;
                
                for(int i = 0; i < MAX_ITER; i++) {
                    // The Fungal Network digests the math: 
                    // High enzyme concentration triggers the Burning Ship fold (absolute value squaring)
                    // Normal areas remain standard complex squaring (Mandelbrot)
                    if (mycelium > 0.55) {
                        z = vec2(abs(z.x), abs(z.y)); 
                    }
                    
                    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
                    
                    // Orbit trap for structural color texturing
                    trap = min(trap, abs(z.x) + abs(z.y));
                    
                    if(dot(z, z) > 256.0) break;
                    iter++;
                }

                // Smooth escape time coloring
                float smoothIter = iter - log2(max(log2(max(dot(z,z), 1.0)), 0.0001)) + 4.0;
                float t = smoothIter / float(MAX_ITER);
                
                // Highly Acidic Neon Color mapping
                vec3 col = neonAcid(t * 9.0 - u_time * 0.8);
                
                // Interior of the fractal: Thin film iridescence + Foxfire bioluminescence
                if (iter >= float(MAX_ITER) - 1.0) {
                    // Structural color based on orbit trap distance
                    col = thinFilm(trap * 3.0 + u_time * 0.2);
                    
                    // Foxfire bioluminescence (Panellus stipticus) inside the set
                    float foxfire = fbm(uv * 18.0 + u_time * 0.4);
                    col += vec3(0.02, 0.95, 0.48) * smoothstep(0.55, 1.0, foxfire) * 2.8;
                }
                
                // Apply Brown Rot Cubical Cracking to the fractal exterior
                float crackMask = cubicalCrack * smoothstep(0.4, 0.8, mycelium);
                col = mix(col, vec3(0.18, 0.06, 0.02), crackMask); // Rotted wood tone
                
                // Apply Laccase Stain (Blue-gray oxidation) at the decay boundary
                float laccase = smoothstep(0.42, 0.48, enzyme) - smoothstep(0.48, 0.54, enzyme);
                col = mix(col, vec3(0.22, 0.38, 0.62), laccase);

                // [REPO 8: RETROFUTURISM] - Cassette Futurism CRT Optics & Glitch Overlay
                // Scanline Throb
                float scanline = sin(vUv.y * u_resolution.y * 3.14159) * 0.06;
                col -= scanline;
                
                // RGB split / Chromatic aberration at the CRT edges
                float dist = length(vUv - 0.5);
                col.r *= 1.0 + dist * 0.12 * sin(u_time * 6.0);
                col.b *= 1.0 - dist * 0.12 * cos(u_time * 5.0);
                
                // Deep vignette
                col *= smoothstep(0.85, 0.25, dist);

                fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
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
    console.error("Feral Fractal Engine Collapse:", e);
}