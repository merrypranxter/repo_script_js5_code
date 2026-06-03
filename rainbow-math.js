if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(mouse.x, mouse.y) }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        
        in vec2 vUv;
        out vec4 fragColor;
        
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;

        #define PI 3.14159265359

        // 2D Rotation Matrix
        mat2 rot(float a) {
            float s = sin(a), c = cos(a);
            return mat2(c, -s, s, c);
        }

        // Hash & Noise for Simulation Artifacts & FBM
        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float fbm(vec2 p) {
            float f = 0.0;
            float amp = 0.5;
            for(int i = 0; i < 5; i++) {
                vec2 i_p = floor(p);
                vec2 f_p = fract(p);
                vec2 u = f_p * f_p * (3.0 - 2.0 * f_p);
                float n = mix(mix(hash(i_p + vec2(0.0,0.0)), hash(i_p + vec2(1.0,0.0)), u.x),
                              mix(hash(i_p + vec2(0.0,1.0)), hash(i_p + vec2(1.0,1.0)), u.x), u.y);
                f += amp * n;
                p = p * 2.1 + vec2(1.1, 2.3);
                p *= rot(0.5);
                amp *= 0.5;
            }
            return f;
        }

        // Spectral Rainbow Palette (OKLab / Cosine approach from color_fields)
        vec3 spectralRainbow(float t) {
            vec3 a = vec3(0.5, 0.5, 0.5);
            vec3 b = vec3(0.5, 0.5, 0.5);
            vec3 c = vec3(1.0, 1.0, 1.0);
            vec3 d = vec3(0.0, 0.33, 0.67);
            return a + b * cos(2.0 * PI * (c * t + d));
        }

        // Tetragrammaton Symmetry (merrys_visual_bible)
        vec2 opRadialSymmetry(vec2 p, float count) {
            float a = atan(p.y, p.x);
            float r = length(p);
            float segment = 2.0 * PI / count;
            a = mod(a + segment / 2.0, segment) - segment / 2.0;
            return vec2(cos(a), sin(a)) * r;
        }

        // The Mathematical Architecture - Rainblown Kirlian Fractal
        vec3 map(vec2 p, float t) {
            // Rainblown wind shear (Ocean Math warp)
            float shear = sin(p.y * 1.5 + t) * 0.3;
            vec2 q = p;
            q.x += shear + t * 0.2;
            q.y -= t * 0.8; // Falling rain wind

            // Fluid Domain Warping
            vec2 warp = vec2(fbm(q * 2.0), fbm(q * 2.0 + 100.0));
            p += warp * 0.2;

            // 4-Fold Symmetry
            p = opRadialSymmetry(p, 4.0);

            // Iterated Function System (The Mathematical Masterpiece)
            float d = 100.0;
            float glow = 0.0;
            vec2 z = p;
            
            for (int i = 0; i < 7; i++) {
                z = abs(z) - vec2(0.15, 0.05);
                z *= rot(t * 0.15 + float(i) * 0.2);
                z = z * 1.4 - vec2(0.08);

                float branch = max(abs(z.x), abs(z.y));
                d = min(d, branch);

                // Kirlian Townsend Ionization (Dielectric Breakdown Glow)
                glow += 0.004 / (abs(branch) + 0.001);
            }

            // Rain Streamers / Particle Pop-in
            vec2 rainUV = p * vec2(15.0, 2.0);
            rainUV.x += p.y * 2.0; // Sheared angle of rain
            rainUV.y += t * 12.0;
            float rain = smoothstep(0.97, 1.0, hash(floor(rainUV)));
            float rainGlow = rain * (1.0 - fract(rainUV.y));

            return vec3(d, glow, rainGlow);
        }

        void main() {
            // Normalized pixel coordinates (from -1 to 1)
            vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
            uv *= 2.2; // Scale out to see the math

            float t = u_time * 0.6;

            // Observer Effect (mouse steering)
            vec2 mouse = (u_mouse / u_resolution - 0.5) * 2.0;
            uv += mouse * 0.3;

            // Parallax Depth Fields (Chromatic separation based on depth)
            float depth = fbm(uv * 2.0 - t * 0.5);
            vec2 parallax = vec2(0.04, -0.02) * depth;

            // Chromatic Split Sampling
            vec3 sampleR = map(uv + parallax * 1.3, t);
            vec3 sampleG = map(uv, t);
            vec3 sampleB = map(uv - parallax * 1.6, t);

            // Base Void State (The Ship / The Void)
            vec3 col = vec3(0.02, 0.01, 0.04);

            // Kirlian Glow mapped to Fibonacci Spectral Rainbow
            vec3 rainbowR = spectralRainbow(depth + t * 0.1);
            vec3 rainbowG = spectralRainbow(depth + t * 0.1 + 0.15);
            vec3 rainbowB = spectralRainbow(depth + t * 0.1 + 0.3);

            col.r += sampleR.y * rainbowR.r;
            col.g += sampleG.y * rainbowG.g;
            col.b += sampleB.y * rainbowB.b;

            // Add Rain Streamers (Neon Acid pop-in)
            vec3 rainColor = spectralRainbow(depth - t * 0.2 + 0.5);
            col += rainColor * sampleG.z * 1.5;

            // Simulation Hypothesis: Dither limitation artifact
            vec2 bayer = mod(gl_FragCoord.xy, 2.0);
            float dither = (bayer.x * 2.0 + bayer.y) / 4.0 - 0.5;
            col += dither * 0.08;

            // Tonemapping (ACES Filmic approximation)
            col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), 0.0, 1.0);

            // Edge Vignette
            float vig = length(uv - mouse * 0.3);
            col *= 1.0 - smoothstep(1.2, 2.8, vig);

            fragColor = vec4(col, 1.0);
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

if (material && material.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  material.uniforms.u_mouse.value.set(mouse.x, mouse.y);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);