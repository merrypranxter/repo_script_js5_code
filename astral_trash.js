try {
    if (!canvas.__three) {
        if (!ctx) throw new Error("WebGL2 context not available");

        // Generate the Text / Decorative Mask
        const texCanvas = document.createElement('canvas');
        texCanvas.width = 1024;
        texCanvas.height = 1024;
        const tctx = texCanvas.getContext('2d');

        // Void background
        tctx.fillStyle = '#000000';
        tctx.fillRect(0, 0, 1024, 1024);

        tctx.translate(512, 512);
        
        // Decorative geometric structures (Cymatic/Sacred geometry hints)
        tctx.strokeStyle = '#FFFFFF';
        tctx.lineWidth = 8;
        
        // Outer ring
        tctx.beginPath();
        tctx.arc(0, 0, 420, 0, Math.PI * 2);
        tctx.stroke();

        // Inner dashed ring
        tctx.lineWidth = 4;
        tctx.setLineDash([15, 25]);
        tctx.beginPath();
        tctx.arc(0, 0, 390, 0, Math.PI * 2);
        tctx.stroke();
        tctx.setLineDash([]);

        // Diamond/Octahedron projection
        tctx.lineWidth = 2;
        tctx.beginPath();
        tctx.moveTo(0, -420);
        tctx.lineTo(420, 0);
        tctx.lineTo(0, 420);
        tctx.lineTo(-420, 0);
        tctx.closePath();
        tctx.stroke();

        // The Text
        tctx.textAlign = 'center';
        tctx.textBaseline = 'middle';
        tctx.font = 'bold 160px "Impact", "Arial Black", sans-serif';
        
        // Deep blur for heightmap/SDF-like gradient
        tctx.fillStyle = '#FFFFFF';
        tctx.shadowColor = '#FFFFFF';
        tctx.shadowBlur = 60;
        tctx.fillText('ASTRAL', 0, -100);
        tctx.fillText('TRASH', 0, 100);
        
        // Medium blur
        tctx.shadowBlur = 20;
        tctx.fillText('ASTRAL', 0, -100);
        tctx.fillText('TRASH', 0, 100);

        // Core sharp text
        tctx.shadowBlur = 0;
        tctx.fillText('ASTRAL', 0, -100);
        tctx.fillText('TRASH', 0, 100);

        const textTexture = new THREE.CanvasTexture(texCanvas);
        textTexture.minFilter = THREE.LinearFilter;
        textTexture.magFilter = THREE.LinearFilter;
        textTexture.needsUpdate = true;

        // Three.js Setup
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, context: ctx, alpha: true, antialias: true });
        renderer.setSize(grid.width, grid.height, false);

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
            in vec2 vUv;
            out vec4 fragColor;

            uniform float u_time;
            uniform vec2 u_resolution;
            uniform sampler2D u_text;

            #define PI 3.14159265359

            // Hash function for grain and noise
            float hash(vec2 p) {
                p = fract(p * vec2(127.1, 311.7));
                p += dot(p, p + 19.19);
                return fract(p.x * p.y);
            }

            // Value noise
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
                    u.y
                );
            }

            // Fractional Brownian Motion
            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                mat2 rot = mat2(0.866, -0.5, 0.5, 0.866); // Rotate to reduce grid artifacts
                for (int i = 0; i < 6; i++) {
                    v += a * noise(p);
                    p = rot * p * 2.0 + vec2(100.0);
                    a *= 0.5;
                }
                return v;
            }

            // Curl noise for fluid advection simulation
            vec2 curl(vec2 p, float t) {
                float e = 0.01;
                float x = fbm(p + vec2(0.0, e) + t) - fbm(p - vec2(0.0, e) + t);
                float y = fbm(p + vec2(e, 0.0) + t) - fbm(p - vec2(e, 0.0) + t);
                return vec2(x, -y) / (2.0 * e);
            }

            void main() {
                // Normalize and center UVs
                vec2 uv = vUv;
                vec2 p = uv * 2.0 - 1.0;
                p.x *= u_resolution.x / u_resolution.y;

                // Three distinct time scales
                float t_slow = u_time * 0.05;
                float t_med  = u_time * 0.3;
                float t_fast = u_time * 1.5;

                // Sample the text mask
                float textMask = texture(u_text, uv).r;

                // 1. Slow Global Drift (Domain Warping)
                // The text acts as a magnetic/gravitational attractor in the fluid
                vec2 warp = p;
                warp += curl(p * 1.5, t_slow) * 0.3;
                
                // Text pulls the domain inward, creating a meniscus/lensing effect
                vec2 toCenter = normalize(p);
                warp -= toCenter * textMask * 0.2;

                // 2. Medium Structural Motion (Reaction-Diffusion / Ferrofluid vibe)
                vec2 q = vec2(fbm(warp * 3.0 + t_med), fbm(warp * 3.0 + vec2(5.2, 1.3) - t_med));
                vec2 r = vec2(fbm(warp * 5.0 + 4.0 * q + t_med * 1.2), fbm(warp * 5.0 + 4.0 * q + vec2(8.3, 2.8) - t_med * 1.2));
                
                // Structural density field
                float structure = fbm(warp * 4.0 + 5.0 * r);
                
                // Force text into the structure (lithogenesis / crystallization)
                structure = mix(structure, structure * 0.5 + textMask * 0.6, 0.5);

                // 3. Fast Detail Shimmer (Thin-film interference & Bragg diffraction)
                // Creates the physical substance / oil slick / bismuth crystal effect
                float interference = structure * 25.0 - t_fast;
                
                // CMY Neon separation
                vec3 CYAN = vec3(0.0, 1.0, 1.0);
                vec3 MAGENTA = vec3(1.0, 0.0, 1.0);
                vec3 YELLOW = vec3(1.0, 1.0, 0.0);

                // Phase-shifted powers of sine create sharp, glowing contour lines
                float c1 = pow(sin(interference), 8.0);
                float c2 = pow(sin(interference + 2.094), 8.0); // +120 degrees
                float c3 = pow(sin(interference + 4.188), 8.0); // +240 degrees

                vec3 color = vec3(0.0);
                
                // Additive CMY contours
                color += CYAN * c1;
                color += MAGENTA * c2;
                color += YELLOW * c3;

                // Modulate by structural depth (creates deep voids)
                float voidMask = smoothstep(0.3, 0.7, structure);
                
                // "Glitch Prophet" Caustics: intense blown-out ridges where structure collapses
                float caustics = 0.01 / (abs(fbm(r * 10.0 - t_fast * 0.5) - 0.5) + 0.02);
                color += (CYAN * 0.5 + MAGENTA * 0.5) * caustics * voidMask * 0.2;

                // Deepen the voids (Absolute Black)
                color *= smoothstep(0.15, 0.6, structure + textMask * 0.2);

                // Text Edge Highlight (Kinetic Type / Damage Type vibe)
                // Make the text feel carved or burned into the fluid
                float textEdge = smoothstep(0.05, 0.2, textMask) - smoothstep(0.4, 0.9, textMask);
                float textCaustic = pow(sin(structure * 50.0 + t_fast * 2.0), 16.0);
                color += YELLOW * textEdge * textCaustic * 2.0;
                color += MAGENTA * textEdge * 0.5;

                // Subsurface scattering / glow inside the text
                color += CYAN * textMask * pow(structure, 3.0) * 1.5;

                // Physical Grain / Noise Ritual
                float grain = hash(uv * u_time);
                color += grain * 0.06 * (1.0 - textMask * 0.5); // Less grain on bright text

                // Vignette for depth
                float vignette = 1.0 - smoothstep(0.5, 1.5, length(p));
                color *= vignette;

                fragColor = vec4(color, 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader,
            fragmentShader,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_text: { value: textTexture }
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
        if (material.uniforms.u_time) material.uniforms.u_time.value = time;
        if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }

    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

} catch (err) {
    console.error("Procedural Texture Engine Failure:", err);
}