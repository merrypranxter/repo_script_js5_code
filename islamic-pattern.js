try {
    if (!canvas.__three) {
        if (!ctx) throw new Error("WebGL2 context not available");

        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, grid.width / grid.height, 0.1, 1000);
        camera.position.z = 1.0;

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

            // --- ASHIMA 3D SIMPLEX NOISE ---
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
            vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

            float snoise(vec3 v) {
                const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
                const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
                vec3 i  = floor(v + dot(v, C.yyy) );
                vec3 x0 = v - i + dot(i, C.xxx) ;
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min( g.xyz, l.zxy );
                vec3 i2 = max( g.xyz, l.zxy );
                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;
                i = mod289(i); 
                vec4 p = permute( permute( permute( 
                            i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                          + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                          + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
                float n_ = 0.142857142857;
                vec3  ns = n_ * D.wyz - D.xzx;
                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_ );
                vec4 x = x_ *ns.x + ns.yyyy;
                vec4 y = y_ *ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);
                vec4 b0 = vec4( x.xy, y.xy );
                vec4 b1 = vec4( x.zw, y.zw );
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
                vec3 p0 = vec3(a0.xy,h.x);
                vec3 p1 = vec3(a0.zw,h.y);
                vec3 p2 = vec3(a1.xy,h.z);
                vec3 p3 = vec3(a1.zw,h.w);
                vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
                p0 *= norm.x;
                p1 *= norm.y;
                p2 *= norm.z;
                p3 *= norm.w;
                vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m;
                return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
            }

            // --- CURL NOISE APHASIA ---
            // Divergence-free vector field to advect the sacred geometry
            vec2 curlNoise(vec2 p, float t) {
                float eps = 0.05;
                float n1 = snoise(vec3(p.x, p.y + eps, t));
                float n2 = snoise(vec3(p.x, p.y - eps, t));
                float n3 = snoise(vec3(p.x + eps, p.y, t));
                float n4 = snoise(vec3(p.x - eps, p.y, t));
                return vec2(n1 - n2, n4 - n3) / (2.0 * eps);
            }

            // --- PENTAGRID EVALUATION (ISLAMIC TILING) ---
            // Reconstructs the Darb-i Imam quasicrystalline scaffold
            vec2 evalPentagrid(vec2 p, float sp, float gammaOff) {
                float dLine = 1e9;
                float iSum = 0.0;
                for(int k = 0; k < 5; k++){
                    float a = float(k) * 3.14159265359 / 5.0;
                    vec2 n = vec2(cos(a), sin(a));
                    float proj = dot(p, n)/sp + float(k+1)/10.0 + gammaOff;
                    float d = abs(fract(proj + 0.5) - 0.5) * sp;
                    dLine = min(dLine, d);
                    iSum += floor(proj + 0.5);
                }
                return vec2(dLine, iSum);
            }

            // --- BISMUTH / NEON ACID PALETTE ---
            vec3 palette(float t) {
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.5);
                vec3 c = vec3(2.0, 1.0, 1.0);
                vec3 d = vec3(0.5, 0.2, 0.25);
                return a + b * cos(6.2831853 * (c * t + d));
            }

            void main() {
                // Normalize and scale coordinates
                vec2 uv = (vUv - 0.5) * u_resolution.xy / u_resolution.y;
                vec2 p = uv * 6.0;
                
                // Slow rotation
                float rot = u_time * 0.05;
                mat2 mRot = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
                p = mRot * p;

                float r = length(p);

                // Mouse interaction: Repel entropy
                float mouseDist = length(uv - u_mouse);
                float divineAura = smoothstep(0.8, 0.0, mouseDist) * 2.0;

                // The Breathing Boundary of Entropy
                // Sacred geometry in the center, feral curl noise at the edges
                float entropyEdge = 1.8 + sin(u_time * 0.4) * 0.5 + divineAura;
                
                // Two levels of decay (Stratigraphic Autophagy)
                float warpStrCoarse = smoothstep(entropyEdge, entropyEdge + 3.0, r) * 1.5;
                float warpStrFine = smoothstep(entropyEdge - 1.0, entropyEdge + 2.0, r) * 2.5;

                // Advect coordinates
                vec2 curl = curlNoise(p * 0.3, u_time * 0.15);
                vec2 pCoarse = p + curl * warpStrCoarse;
                vec2 pFine = p + curl * warpStrFine;

                // Evaluate the two-scale Darb-i Imam grid
                float PHI2 = 2.6180339887;
                vec2 pgCoarse = evalPentagrid(pCoarse, 1.0, 0.0);
                vec2 pgFine = evalPentagrid(pFine, 1.0 / PHI2, 0.1);

                // --- LITHOGENESIS & COLOR FIELDS ---
                
                // Base tile color: Azurite to Malachite reaction front
                float mixedIndex = mod(pgCoarse.y + pgFine.y, 5.0);
                vec3 azurite = vec3(0.02, 0.05, 0.25);
                vec3 malachite = vec3(0.05, 0.4, 0.2);
                vec3 tileColor = mix(azurite, malachite, mixedIndex / 4.0);
                
                // Dissolve to Cosmic Void at the edges
                float voidMix = smoothstep(entropyEdge + 0.5, entropyEdge + 4.0, r);
                vec3 cosmicVoid = vec3(0.04, 0.0, 0.08);
                tileColor = mix(tileColor, cosmicVoid, voidMix);

                // Strapwork lines glow
                float glowCoarse = 0.02 / (pgCoarse.x * pgCoarse.x + 0.002);
                float glowFine = 0.008 / (pgFine.x * pgFine.x + 0.001);

                // Bismuth iridescence on the coarse grid
                vec3 colorCoarse = palette(r * 0.15 - u_time * 0.1 + mixedIndex * 0.1); 
                // Gilded ivory/gold on the fine grid
                vec3 colorFine = vec3(0.9, 0.75, 0.2); 

                vec3 finalColor = tileColor;
                
                // Apply emissive lines (dimming them as they enter the void)
                float structuralIntegrity = 1.0 - (voidMix * 0.8);
                finalColor += colorCoarse * glowCoarse * structuralIntegrity;
                finalColor += colorFine * glowFine * structuralIntegrity;

                // Fungal / Eldritch bioluminescence in the void
                float voidNoise = snoise(vec3(p * 1.5 - curl * 2.0, u_time * 0.2)) * 0.5 + 0.5;
                vec3 toxicGrowth = vec3(0.2, 0.9, 0.4);
                finalColor += toxicGrowth * voidNoise * voidMix * smoothstep(0.8, 1.0, voidNoise) * 1.5;

                // Vignette
                finalColor *= 1.0 - dot(uv, uv) * 0.25;

                // ACES Tonemapping approximation
                finalColor = (finalColor * (2.51 * finalColor + 0.03)) / (finalColor * (2.43 * finalColor + 0.59) + 0.14);

                fragColor = vec4(finalColor, 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader,
            fragmentShader,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_mouse: { value: new THREE.Vector2(0, 0) }
            },
            depthWrite: false,
            depthTest: false
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);

        canvas.__three = { renderer, scene, camera, material };
    }

    const { renderer, scene, camera, material } = canvas.__three;

    if (material && material.uniforms) {
        material.uniforms.u_time.value = time;
        material.uniforms.u_resolution.value.set(grid.width, grid.height);
        
        // Map mouse to UV space (-0.5 to 0.5, aspect corrected)
        let mx = 0;
        let my = 0;
        if (mouse) {
            mx = (mouse.x / grid.width) - 0.5;
            my = -(mouse.y / grid.height) + 0.5;
            mx *= grid.width / grid.height;
        }
        material.uniforms.u_mouse.value.set(mx, my);
    }

    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

} catch (e) {
    console.error("WebGL Feral Initialization Failed:", e);
    // Silent fallback to avoid crashing the whole pipeline
}