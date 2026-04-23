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
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        in vec2 vUv;
        out vec4 fragColor;
        
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;

        #define MAX_STEPS 14

        // Wavelength to RGB (Structural Color / Thin Film)
        vec3 w2rgb(float W) {
            vec3 c = vec3(0.0);
            if (W >= 380.0 && W < 440.0) c = vec3(-(W-440.0)/(440.0-380.0), 0.0, 1.0);
            else if (W >= 440.0 && W < 490.0) c = vec3(0.0, (W-440.0)/(490.0-440.0), 1.0);
            else if (W >= 490.0 && W < 510.0) c = vec3(0.0, 1.0, -(W-510.0)/(510.0-490.0));
            else if (W >= 510.0 && W < 580.0) c = vec3((W-510.0)/(580.0-510.0), 1.0, 0.0);
            else if (W >= 580.0 && W < 645.0) c = vec3(1.0, -(W-645.0)/(645.0-580.0), 0.0);
            else if (W >= 645.0 && W <= 780.0) c = vec3(1.0, 0.0, 0.0);
            
            float i = 1.0;
            if (W < 420.0) i = 0.3 + 0.7*(W-380.0)/(420.0-380.0);
            else if (W > 700.0) i = 0.3 + 0.7*(780.0-W)/(780.0-700.0);
            return c * i;
        }

        // Thin Film Interference
        vec3 thinFilm(float thickness) {
            float n = 1.45; // Refractive index
            float pathDiff = 2.0 * n * thickness;
            vec3 color = vec3(0.0);
            for(int i = 0; i < 8; i++) {
                float lambda = mix(400.0, 700.0, float(i)/7.0);
                float phase = (pathDiff / lambda) * 6.2831853;
                float intensity = 0.5 + 0.5 * cos(phase);
                color += w2rgb(lambda) * intensity;
            }
            return color / 8.0;
        }

        void main() {
            vec2 p = (vUv - 0.5) * 2.0;
            p.x *= u_resolution.x / max(u_resolution.y, 1.0);

            vec2 mouseOff = (u_mouse - 0.5) * 2.0;

            // Bureaucratic Grid (Pixel Voxel constraint)
            // The grid warps under "textile tension"
            float tension = sin(p.y * 5.0 + u_time) * cos(p.x * 5.0 - u_time);
            float gridRes = 90.0 + 30.0 * tension;
            vec2 snappedP = floor(p * gridRes) / gridRes;

            // G2 Torsion Field / Julia Fold
            vec2 z = snappedP;
            float torsion = 0.0;
            
            for(int i = 0; i < MAX_STEPS; i++) {
                z = abs(z) - vec2(0.4, 0.3) * sin(u_time * 0.15);
                float r2 = dot(z, z);
                float k = max(0.4 / r2, 0.05);
                z *= k;
                z += vec2(0.1, -0.15) * cos(u_time * 0.2) + mouseOff * 0.05;
                torsion += abs(z.x - z.y);
            }

            // Singularity Mask: Where the strain breaks the pixel grid
            float singularity = smoothstep(12.0, 22.0, torsion);

            // Re-evaluate on smooth, unquantized space if the grid is fractured
            if (singularity > 0.01) {
                vec2 smoothZ = mix(snappedP, p, singularity);
                float smoothTorsion = 0.0;
                for(int i = 0; i < MAX_STEPS; i++) {
                    smoothZ = abs(smoothZ) - vec2(0.4, 0.3) * sin(u_time * 0.15);
                    float r2 = dot(smoothZ, smoothZ);
                    float k = max(0.4 / r2, 0.05);
                    smoothZ *= k;
                    smoothZ += vec2(0.1, -0.15) * cos(u_time * 0.2) + mouseOff * 0.05;
                    smoothTorsion += abs(smoothZ.x - smoothZ.y);
                }
                torsion = mix(torsion, smoothTorsion, singularity);
            }

            // Map torsion to film thickness (nanometers)
            float thickness = 150.0 + 850.0 * fract(torsion * 0.12 - u_time * 0.4);
            vec3 spectralColor = thinFilm(thickness);

            // Ordered Dither (Bayer 4x4)
            int bayer[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
            int bx = int(gl_FragCoord.x) % 4;
            int by = int(gl_FragCoord.y) % 4;
            float bayerVal = float(bayer[by * 4 + bx]) / 16.0;

            // Apply dither spread
            vec3 dithered = spectralColor + (bayerVal - 0.5) * 0.45;

            // Palette (Bone & Rust + Neon Acid)
            vec3 pal[6] = vec3[6](
                vec3(0.04, 0.04, 0.08), // Void
                vec3(0.18, 0.10, 0.00), // Rust
                vec3(0.83, 0.64, 0.45), // Bone
                vec3(0.00, 1.00, 0.40), // Acid Green
                vec3(1.00, 0.00, 1.00), // Neon Magenta
                vec3(0.00, 1.00, 1.00)  // Cyan
            );

            // Nearest palette match (YUV perceptual distance approximation)
            vec3 snappedColor = pal[0];
            float bestDist = 100.0;
            for(int i = 0; i < 6; i++) {
                vec3 diff = dithered - pal[i];
                // Weighting for rough perceptual match
                float d = dot(diff * vec3(0.3, 0.59, 0.11), diff * vec3(0.3, 0.59, 0.11));
                if(d < bestDist) {
                    bestDist = d;
                    snappedColor = pal[i];
                }
            }

            // The "Healing Seam": Raw, unquantized spectral light bleeds through the fractures
            vec3 rawGlow = spectralColor * 1.8 + vec3(0.1, 0.3, 0.8) * singularity;
            vec3 finalColor = mix(snappedColor, rawGlow, pow(singularity, 1.5));

            // Vignette to ground the chaos
            float vignette = 1.0 - smoothstep(0.5, 1.5, length(p));
            finalColor *= vignette;

            fragColor = vec4(finalColor, 1.0);
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

if (material?.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  material.uniforms.u_mouse.value.set(mouse.x, mouse.y);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);