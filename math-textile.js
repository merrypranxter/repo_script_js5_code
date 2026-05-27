try {
  if (!ctx) throw new Error("WebGL 2 context not available");
  
  if (!canvas.__three) {
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
        uniform float u_time;
        uniform vec2 u_resolution;
        in vec2 vUv;
        out vec4 fragColor;

        const float PI = 3.14159265359;

        // --- Alchemical Noise & Entropy ---
        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                       mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
        }

        float fbm(vec2 p) {
            float f = 0.0;
            float a = 0.5;
            mat2 m = mat2(0.8, -0.6, 0.6, 0.8);
            for(int i = 0; i < 5; i++) {
                f += a * noise(p);
                p = m * p * 2.0;
                a *= 0.5;
            }
            return f;
        }

        // --- OKLab & Mathematical Palettes ---
        vec3 OKLCh_to_OKLab(vec3 lch) {
            return vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
        }

        vec3 OKLab_to_linearSRGB(vec3 c) {
            float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
            float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
            float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;

            float l = l_ * l_ * l_;
            float m = m_ * m_ * m_;
            float s = s_ * s_ * s_;

            return vec3(
                 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
            );
        }

        vec3 linear_to_sRGB(vec3 c) {
            vec3 s1 = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0/2.4)) - 0.055;
            vec3 s2 = c * 12.92;
            return mix(s2, s1, step(0.0031308, c));
        }

        vec3 OKLCh_to_sRGB(vec3 lch) {
            return linear_to_sRGB(OKLab_to_linearSRGB(OKLCh_to_OKLab(lch)));
        }

        const float GOLDEN_ANGLE = 2.39996323;

        vec3 goldenPalette(float index, float L, float C) {
            float h = index * GOLDEN_ANGLE;
            return OKLCh_to_sRGB(vec3(L, C, h));
        }

        float getCollatz(int i) {
            if(i==0) return 27.0; if(i==1) return 82.0; if(i==2) return 41.0;
            if(i==3) return 124.0; if(i==4) return 62.0; if(i==5) return 31.0;
            if(i==6) return 94.0; if(i==7) return 47.0; if(i==8) return 142.0;
            return 71.0;
        }

        // --- Structural Color Physics ---
        vec3 thinFilm(float cosTheta, float thickness, float n_film) {
            float pathDiff = 2.0 * n_film * thickness * cosTheta;
            vec3 phase = vec3(0.0, 0.33, 0.67);
            return 0.5 + 0.5 * cos(6.28318 * (pathDiff / 600.0 + phase));
        }

        // --- Feral Knitting Topology ---
        float knit(vec2 uv) {
            vec2 p = uv * vec2(20.0, 20.0);
            p.x += mod(floor(p.y), 2.0) * 0.5;
            vec2 f = fract(p);
            
            // V-shape of stockinette stitch
            float leftLeg = smoothstep(0.3, 0.05, abs(f.x - 0.35 - f.y * 0.25));
            float rightLeg = smoothstep(0.3, 0.05, abs(f.x - 0.65 + f.y * 0.25));
            float v = max(leftLeg, rightLeg);
            
            // Yarn twist & micro-fuzz
            float twist = noise(p * vec2(4.0, 15.0)) * 0.2;
            float fuzz = noise(p * 30.0) * 0.1;
            
            float depth = v + twist + fuzz;
            
            // Loop interlock gaps
            float gap = smoothstep(0.0, 0.15, f.y) * smoothstep(1.0, 0.85, f.y);
            return depth * gap;
        }

        void main() {
            vec2 p = vUv * 2.0 - 1.0;
            p.x *= u_resolution.x / u_resolution.y;

            // 1. Shibori Tie-Dye Fold Symmetry (6-fold mandala)
            float angle = atan(p.y, p.x);
            float radius = length(p);
            float folds = 6.0;
            angle = mod(angle, 2.0 * PI / folds);
            angle = abs(angle - PI / folds);
            p = radius * vec2(cos(angle), sin(angle));

            // 2. Chrono-Stratigraphic Plunge (Hyperbolic distortion)
            float local_time = u_time * 0.2;
            p = p / (1.0 + radius * radius);
            
            // 3. Fungal Dye Bleed (Reaction-Diffusion Warp)
            vec2 warpedUV = p;
            float n = fbm(warpedUV * 5.0 - local_time);
            warpedUV += vec2(fbm(warpedUV * 8.0 + n), fbm(warpedUV * 8.0 - n)) * 0.15;

            // Machine Hesitation / Thread Snag Effect
            if (hash(vec2(floor(u_time * 4.0), vUv.y)) > 0.95) {
                warpedUV.x += 0.02 * sin(vUv.y * 50.0);
            }

            // 4. Micro-geometry (Normal calculation from stitch depth)
            float eps = 0.003;
            float d0 = knit(warpedUV);
            float dx = knit(warpedUV + vec2(eps, 0.0));
            float dy = knit(warpedUV + vec2(0.0, eps));
            vec3 normal = normalize(vec3(d0 - dx, d0 - dy, eps * 5.0));

            // 5. Resist Dye Batik Crackle Network
            float dye_mask = fbm(vUv * 2.0 + fbm(vUv * 5.0 - local_time * 0.5));
            float crackle = abs(fbm(vUv * 15.0 + fbm(vUv * 3.0)) - 0.5) * 2.0;
            crackle = smoothstep(0.12, 0.0, crackle);

            // 6. Color Mapping (Collatz Sequence + OKLab Golden Angle)
            int c_idx = int(clamp(dye_mask * 10.0, 0.0, 9.0));
            float collatz_val = getCollatz(c_idx);
            vec3 baseColor = goldenPalette(collatz_val, 0.4 + d0 * 0.2, 0.2 + crackle * 0.1);

            // 7. Structural Color (Iridescence on the yarn)
            vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
            float cosTheta = max(0.0, dot(normal, viewDir));
            
            // Film thickness varies by dye absorption and wax crackle
            float thickness = 300.0 + dye_mask * 500.0 + crackle * 200.0 + sin(u_time) * 50.0;
            float n_film = 1.56; // Chitin / Silk refractive index
            vec3 iridescence = thinFilm(cosTheta, thickness, n_film);

            // 8. Velvet Anisotropic BRDF
            vec3 napDir = normalize(vec3(0.0, 1.0, 0.3));
            float aniso = pow(max(dot(napDir, viewDir), 0.0), 3.0);
            float retro = pow(max(dot(napDir, normal), 0.0), 2.0);
            float velvet = aniso * retro;

            // Combine Layers
            vec3 finalColor = mix(baseColor, iridescence, 0.7 * d0);
            finalColor += velvet * vec3(0.9, 0.5, 0.8) * 0.6; // Velvet Sheen highlight
            
            // Crevice ambient occlusion
            finalColor *= smoothstep(0.0, 0.4, d0) + 0.1;

            // Batik crackle stain mapping
            finalColor = mix(finalColor, vec3(0.05, 0.02, 0.1), crackle * 0.8);

            // Tonemapping (ACES-like curve)
            finalColor = (finalColor * (2.51 * finalColor + 0.03)) / (finalColor * (2.43 * finalColor + 0.59) + 0.14);

            fragColor = vec4(finalColor, 1.0);
        }
      `
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

} catch (e) {
  console.error("WebGL Initialization Failed:", e);
}