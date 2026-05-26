if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
        camera.position.z = 1;

        // Hidden 2D canvas to track mouse brushing (velvet nap reversal)
        const brushCanvas = document.createElement('canvas');
        brushCanvas.width = grid.width;
        brushCanvas.height = grid.height;
        const brushCtx = brushCanvas.getContext('2d');
        brushCtx.fillStyle = 'black';
        brushCtx.fillRect(0, 0, brushCanvas.width, brushCanvas.height);
        
        const brushTex = new THREE.CanvasTexture(brushCanvas);
        brushTex.minFilter = THREE.LinearFilter;
        brushTex.magFilter = THREE.LinearFilter;

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
            uniform sampler2D u_brush;

            // Kaleidoscope fold for damask symmetry (p4m)
            vec2 fold4(vec2 p) {
                p = fract(p) - 0.5;
                p = abs(p);
                if (p.x < p.y) p = p.yx;
                return p;
            }

            // Simulates Lenia multi-kernel continuous cellular automata
            vec4 leniaChemicals(vec2 p, float t) {
                // Cellular breathing
                p *= 1.0 + 0.05 * sin(t * 0.5);
                
                // Domain warp (fluid drift)
                p += vec2(sin(p.y * 6.0 + t), cos(p.x * 6.0 - t)) * 0.05;
                
                // Damask tiling
                p = fold4(p);
                
                // Internal biological writhing
                p += vec2(sin(p.y * 12.0 - t * 1.2), cos(p.x * 12.0 + t * 1.2)) * 0.02;
                
                // Organism nodes
                float d1 = length(p - vec2(0.0, 0.0));   // Core Medallion
                float d2 = length(p - vec2(0.3, 0.3));   // Flanking Leaves
                float d3 = length(p - vec2(0.4, 0.0));   // Connecting Tendrils
                
                // Ch0: Body mass (dense cores)
                float body = exp(-d1 * d1 / 0.01) + 0.8 * exp(-d2 * d2 / 0.005) + 0.6 * exp(-d3 * d3 / 0.003);
                
                // Ch1: Excitation signal (expanding halos)
                float excit = exp(-pow(d1 - 0.18, 2.0) / 0.003) + 0.7 * exp(-pow(d2 - 0.12, 2.0) / 0.002);
                
                // Ch2: Inhibition field (dark suppression zones)
                float inhib = exp(-length(p - vec2(0.35, 0.15)) * 15.0);
                
                // Ch4: Structural scaffold (geometric ribs guiding growth)
                float scaffold = smoothstep(0.015, 0.0, abs(p.x - p.y)) * 0.5;
                scaffold += smoothstep(0.015, 0.0, abs(p.x)) * 0.3;
                scaffold *= exp(-d1 * d1 / 0.15); 
                
                return clamp(vec4(body, excit, inhib, scaffold), 0.0, 1.0);
            }

            // Multi-scale composite
            vec4 getMap(vec2 uv, float t) {
                vec4 c1 = leniaChemicals(uv * 1.5, t);
                vec4 c2 = leniaChemicals(uv * 3.0 + vec2(0.5), t * 1.3) * 0.5;
                return c1 + c2;
            }

            // Reduce chemical fields to a physical height map for velvet displacement
            float getHeight(vec2 uv, float t) {
                vec4 chem = getMap(uv, t);
                return chem.r * 1.0 + chem.g * 0.5 + chem.a * 0.2 - chem.b * 0.1;
            }

            // Optical sparkle dust (from sparkles repo)
            float stochastic_sparkle(vec2 uv, vec3 N, vec3 V, float density, float sharpness, float time) {
                float NdotV = max(dot(N, V), 0.0);
                float view_factor = pow(NdotV, sharpness);
                
                float temporal_offset = fract(time * 0.1) * 2.39996;
                vec2 hash_uv = uv * 1000.0 + vec2(cos(temporal_offset), sin(temporal_offset)) * 10.0;
                
                vec3 p3 = fract(vec3(hash_uv.xyx) * 0.1031);
                p3 += dot(p3, p3.yzx + 33.33);
                float h = fract((p3.x + p3.y) * p3.z);
                
                float threshold = 1.0 - density * view_factor;
                return smoothstep(threshold - 0.01, threshold, h) * view_factor;
            }

            void main() {
                vec2 aspectUv = vUv;
                aspectUv.x *= u_resolution.x / u_resolution.y;
                
                // Mouse brush interaction accelerates local biology
                float brush = texture(u_brush, vUv).r;
                float t = u_time * 0.5 + brush * 2.0; 
                
                vec4 chem = getMap(aspectUv, t);
                float h0 = chem.r * 1.0 + chem.g * 0.5 + chem.a * 0.2 - chem.b * 0.1;
                
                // Calculate physical normals
                vec2 e = vec2(0.002, 0.0);
                float hx = getHeight(aspectUv + e.xy, t);
                float hy = getHeight(aspectUv + e.yx, t);
                vec3 N = normalize(vec3(hx - h0, hy - h0, 0.03));
                
                // High-frequency textile weave normal mapping
                vec2 weaveUv = aspectUv * 300.0;
                vec3 N_weave = normalize(vec3(cos(weaveUv.x)*sin(weaveUv.y), sin(weaveUv.x)*cos(weaveUv.y), 4.0));
                N = normalize(N + N_weave * 0.1);
                
                // Biological color palette
                vec3 colBody = vec3(1.0, 0.0, 0.4);      // Hot magenta raised motifs
                vec3 colExcit = vec3(0.0, 0.8, 0.9);     // Cyan halos
                vec3 colInhib = vec3(0.3, 0.0, 0.6);     // Violet voids
                vec3 colScaffold = vec3(0.6, 1.0, 0.0);  // Acid green biological accents
                vec3 baseVelvet = vec3(0.06, 0.01, 0.12);// Deep UV velvet
                
                // Additive chemical mixing
                vec3 color = baseVelvet;
                color = mix(color, colInhib, chem.b * 0.8);
                color = mix(color, colExcit, chem.g);
                color = mix(color, colScaffold, chem.a);
                color = mix(color, colBody, chem.r); 
                
                vec3 V = normalize(vec3(0.0, 0.0, 1.0));
                vec3 L = normalize(vec3(sin(u_time * 0.7), cos(u_time * 0.5), 0.8));
                
                // Velvet nap reversal via mouse brush
                vec3 napBase = normalize(vec3(1.0, -1.0, 0.0));
                vec3 napBrushed = normalize(vec3(-1.0, 1.0, 0.0));
                vec3 napDir = mix(napBase, napBrushed, brush);
                
                // Asperity scattering (velvet grazing sheen)
                vec3 H = normalize(L + V);
                vec3 N_nap = normalize(N + napDir * 0.4);
                float NdotH = max(0.0, dot(N_nap, H));
                
                float NdotV = max(0.0, dot(N, V));
                float NdotL = max(0.0, dot(N, L));
                
                // Velvet diffuse is softer/darker facing the viewer
                float velvetDiffuse = mix(1.0, 0.3, NdotV);
                vec3 diffuse = color * (NdotL * 0.5 + 0.5) * velvetDiffuse;
                
                // Specular sheen matches the organism color
                vec3 sheenColor = mix(vec3(0.5, 0.4, 0.8), vec3(1.0, 0.3, 0.7), chem.r);
                vec3 specular = sheenColor * pow(NdotH, 12.0) * 1.5;
                
                // Rim lighting creates the deep velvet glow, brushed areas flash orange/yellow
                float rim = pow(1.0 - NdotV, 2.5) * 2.0;
                vec3 rimColor = mix(vec3(0.2, 0.3, 0.8), vec3(1.0, 0.6, 0.0), brush);
                
                // Tiny sparkle dust embedded in the brightest pile
                float sparkle = stochastic_sparkle(aspectUv, N, V, 0.15, 2.0, u_time);
                sparkle *= smoothstep(0.3, 1.0, chem.r) * rim;
                
                vec3 finalColor = diffuse + specular + rim * rimColor * color + sparkle * vec3(1.0);
                
                // Subtle vignetting / depth falloff
                finalColor *= 1.0 - 0.2 * length(vUv - 0.5);
                
                fragColor = vec4(finalColor, 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_brush: { value: brushTex }
            },
            vertexShader,
            fragmentShader
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);

        canvas.__three = { renderer, scene, camera, material, brushCanvas, brushCtx, brushTex };
    } catch (e) {
        console.error("WebGL Initialization Failed:", e);
        return;
    }
}

const { renderer, scene, camera, material, brushCanvas, brushCtx, brushTex } = canvas.__three;

if (material && material.uniforms) {
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
}

// Fade out the brush trails slowly over time
brushCtx.fillStyle = 'rgba(0, 0, 0, 0.03)';
brushCtx.fillRect(0, 0, grid.width, grid.height);

// Mouse interactions reverse the velvet nap and stimulate the organisms
if (mouse.isPressed) {
    brushCtx.beginPath();
    brushCtx.arc(mouse.x, mouse.y, 80, 0, Math.PI * 2);
    const grad = brushCtx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 80);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    brushCtx.fillStyle = grad;
    brushCtx.fill();
}
brushTex.needsUpdate = true;

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);