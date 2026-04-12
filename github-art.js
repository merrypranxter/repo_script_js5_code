// THE WEIRD CODE GUY
// DIRECTIVE: SPECTRAL CELL DIVISION IN NON-EUCLIDEAN SPACE
// REPOS INGESTED: noneuclidean (Möbius math, Poincaré disk), structural_color (thin-film, iridescence, fBM), tesselations (symmetry folding)
// MECHANISM: A quasi-periodic hyperbolic tessellation undergoing structural stress. 
// As the domain is warped by Möbius translations (mouse), the "cells" secrete 
// iridescent structural color determined by simulated thin-film interference.

if (!canvas.__three) {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        uniform float u_isPressed;

        varying vec2 vUv;

        #define PI 3.14159265359
        #define TWO_PI 6.28318530718

        // --- COMPLEX MATH & MÖBIUS TRANSFORMS (Repo: noneuclidean) ---
        vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
        vec2 cdiv(vec2 a, vec2 b) {
            float d = dot(b, b);
            return vec2(dot(a,b), a.y*b.x - a.x*b.y) / d;
        }
        vec2 conj(vec2 z) { return vec2(z.x, -z.y); }
        
        // Translate point p to origin in Poincaré disk
        vec2 mobius_translate(vec2 z, vec2 p) {
            return cdiv(z - p, vec2(1.0, 0.0) - cmul(conj(p), z));
        }

        // --- STRUCTURAL COLOR & NOISE (Repo: structural_color) ---
        // Hash and fBM for organic "stress" fields
        vec2 hash22(vec2 p) {
            p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
            return -1.0 + 2.0 * fract(sin(p)*43758.5453123);
        }

        float noise(vec2 p) {
            const float K1 = 0.366025404; // (sqrt(3)-1)/2;
            const float K2 = 0.211324865; // (3-sqrt(3))/6;
            vec2 i = floor(p + (p.x+p.y)*K1);
            vec2 a = p - i + (i.x+i.y)*K2;
            float m = step(a.y, a.x); 
            vec2 o = vec2(m, 1.0 - m);
            vec2 b = a - o + K2;
            vec2 c = a - 1.0 + 2.0*K2;
            vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
            vec3 n = h*h*h*h*vec3(dot(a,hash22(i+0.0)), dot(b,hash22(i+o)), dot(c,hash22(i+1.0)));
            return dot(n, vec3(70.0));
        }

        float fbm(vec2 p) {
            float f = 0.0;
            float amp = 0.5;
            vec2 shift = vec2(100.0);
            mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
            for (int i = 0; i < 5; i++) {
                f += amp * noise(p);
                p = rot * p * 2.0 + shift;
                amp *= 0.5;
            }
            return f;
        }

        // Oil Slick / Birefringence Palette (Repo: structural_color)
        vec3 palette(float t) {
            vec3 a = vec3(0.5);
            vec3 b = vec3(0.5);
            vec3 c = vec3(2.0, 1.0, 0.0); // Frequencies
            vec3 d = vec3(0.5, 0.20, 0.25); // Phases
            return a + b * cos(TWO_PI * (c * t + d));
        }

        // --- TESSELLATION SYMMETRY (Repo: tesselations) ---
        // Fold space to mimic rosette/wallpaper symmetry locally
        vec2 fold_symmetry(vec2 z, float order) {
            float theta = atan(z.y, z.x);
            float r = length(z);
            float segment = TWO_PI / order;
            theta = mod(theta, segment);
            // Mirror fold
            if (theta > segment/2.0) theta = segment - theta;
            return r * vec2(cos(theta), sin(theta));
        }

        void main() {
            // Map UV to [-1, 1] aspect corrected
            vec2 uv = vUv * 2.0 - 1.0;
            uv.x *= u_resolution.x / u_resolution.y;

            // Poincaré Disk Boundary Check
            float r_euclid = length(uv);
            if (r_euclid >= 0.99) {
                gl_FragColor = vec4(0.02, 0.02, 0.02, 1.0);
                return;
            }

            // Calculate Möbius center from mouse (constrained to disk)
            vec2 m = u_mouse * 2.0 - 1.0;
            m.x *= u_resolution.x / u_resolution.y;
            if(length(m) > 0.9) m = normalize(m) * 0.9;
            
            // Wander automatically if mouse is at center
            if(length(u_mouse - 0.5) < 0.01) {
                m = vec2(cos(u_time*0.5), sin(u_time*0.3)) * 0.5;
            }

            // 1. MÖBIUS TRANSFORM: Translate 'm' to origin
            vec2 z = mobius_translate(uv, m);

            // Hyperbolic distance (metric expands near boundary)
            float d_hyp = 2.0 * atanh(length(z));

            // 2. DOMAIN WARPING & SYMMETRY FOLDING
            // Create a quasi-tiling structure
            float symmetry_order = mix(7.0, 5.0, u_isPressed); // Shift symmetry on click
            vec2 z_fold = fold_symmetry(z, symmetry_order);
            
            // Inject structural stress via fBM in the folded hyperbolic space
            vec2 warp = vec2(fbm(z_fold * 3.0 + u_time * 0.2), fbm(z_fold * 3.0 - u_time * 0.2));
            vec2 z_stressed = z_fold + warp * 0.2;

            // 3. STRUCTURAL COLOR (Thin-Film Interference)
            // The "thickness" of the film is determined by the hyperbolic distance and organic stress
            float thickness = fbm(z_stressed * 5.0) * 2.0;
            
            // Add high-frequency diffraction grating effect (Bragg reflection approximation)
            float diffraction = sin(d_hyp * 40.0 - u_time * 5.0) * 0.5 + 0.5;
            
            // Michel-Lévy style interference calculation
            float optical_path = d_hyp * 0.5 + thickness * 0.8 + diffraction * 0.1;
            
            // Map to iridescent palette
            vec3 color = palette(optical_path);

            // 4. SHADING & TEXTURE
            // Create "cell walls" (tessellation boundaries)
            float cell_edge = abs(fract(d_hyp * 2.0 + warp.x) - 0.5);
            float edge_mask = smoothstep(0.1, 0.0, cell_edge);
            
            // Darken edges, boost interior iridescence
            color = mix(color, vec3(0.05, 0.0, 0.1), edge_mask * 0.8);
            
            // Exponential shadow near the absolute boundary of the disk
            float vignette = smoothstep(0.99, 0.8, r_euclid);
            color *= vignette;

            // Add feral noise grit
            float grit = fract(sin(dot(uv.xy, vec2(12.9898,78.233)) + u_time) * 43758.5453) * 0.1;
            color += grit;

            gl_FragColor = vec4(color, 1.0);
        }
    `;

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            u_time: { value: 0 },
            u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
            u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
            u_isPressed: { value: 0.0 }
        },
        transparent: true
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
}

const { renderer, scene, camera, material } = canvas.__three;

if (material && material.uniforms) {
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
    
    // Smooth mouse interpolation for the Möbius center
    const targetMouseX = mouse.x / grid.width;
    const targetMouseY = 1.0 - (mouse.y / grid.height);
    
    material.uniforms.u_mouse.value.x += (targetMouseX - material.uniforms.u_mouse.value.x) * 0.1;
    material.uniforms.u_mouse.value.y += (targetMouseY - material.uniforms.u_mouse.value.y) * 0.1;
    
    // Smooth state transition for symmetry shifting
    const targetPress = mouse.isPressed ? 1.0 : 0.0;
    material.uniforms.u_isPressed.value += (targetPress - material.uniforms.u_isPressed.value) * 0.1;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);