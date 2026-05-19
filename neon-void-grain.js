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
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
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

        uniform float u_time;
        uniform vec2 u_resolution;

        in vec2 vUv;
        out vec4 fragColor;

        // 3D Hash for organic noise
        float hash(vec3 p) {
            p = fract(p * vec3(127.1, 311.7, 74.7));
            p += dot(p, p.yzx + 33.33);
            return fract(p.x * p.y * p.z);
        }

        // 3D Value Noise
        float noise(vec3 p) {
            vec3 i = floor(p);
            vec3 f = fract(p);
            vec3 u = f * f * (3.0 - 2.0 * f);

            return mix(
                mix(mix(hash(i + vec3(0.0,0.0,0.0)), hash(i + vec3(1.0,0.0,0.0)), u.x),
                    mix(hash(i + vec3(0.0,1.0,0.0)), hash(i + vec3(1.0,1.0,0.0)), u.x), u.y),
                mix(mix(hash(i + vec3(0.0,0.0,1.0)), hash(i + vec3(1.0,0.0,1.0)), u.x),
                    mix(hash(i + vec3(0.0,1.0,1.0)), hash(i + vec3(1.0,1.0,1.0)), u.x), u.y), u.z);
        }

        // Fractal Brownian Motion
        float fbm(vec3 p) {
            float v = 0.0;
            float a = 0.5;
            vec3 shift = vec3(100.0);
            for (int i = 0; i < 5; ++i) {
                v += a * noise(p);
                p = p * 2.0 + shift;
                a *= 0.5;
            }
            return v;
        }

        void main() {
            vec2 p = vUv * 2.0 - 1.0;
            p.x *= u_resolution.x / u_resolution.y;
            vec2 uv = vUv;

            // --- THREE TIME SCALES ---
            float t_slow = u_time * 0.08;
            float t_med  = u_time * 0.3;
            float t_fast = u_time * 1.5;

            // Raw Xerox/Film Grain computed early to use as an "ink bleed" jitter
            float grain = fract(sin(dot(uv + t_fast, vec2(12.9898, 78.233))) * 43758.5453);

            // --- 1. MEDIUM STRUCTURAL MOTION (Domain Warping) ---
            // Simulating a fluid or fungal growth substrate
            vec3 q = vec3(
                fbm(vec3(p * 1.5, t_slow)),
                fbm(vec3(p * 1.5 + vec2(5.2, 1.3), t_slow)),
                0.0
            );

            vec3 r = vec3(
                fbm(vec3(p * 2.0 + 4.0 * q.xy + vec2(1.7, 9.2), t_med)),
                fbm(vec3(p * 2.0 + 4.0 * q.xy + vec2(8.3, 2.8), t_med)),
                0.0
            );

            // --- 2. SLOW GLOBAL DRIFT & CMYK MISREGISTRATION ---
            // Sample the scalar field 3 times with slight spatial offsets (Chromatic Aberration)
            vec2 offM = vec2( 0.025,  0.015);
            vec2 offC = vec2(-0.015,  0.025);
            vec2 offY = vec2(-0.025, -0.015);

            float fM = fbm(vec3(p + 3.0 * r.xy + offM, t_slow));
            float fC = fbm(vec3(p + 3.0 * r.xy + offC, t_slow));
            float fY = fbm(vec3(p + 3.0 * r.xy + offY, t_slow));

            // --- 3. FAST DETAIL SHIMMER (Interference / Contour Fringes) ---
            // Absolute sine creates sharp topographical contour lines. 
            // We inject the noise grain into the phase to simulate rough, bleeding ink edges.
            float contourM = smoothstep(0.15, 0.0, abs(sin(fM * 35.0 - t_fast + grain * 1.5)));
            float contourC = smoothstep(0.15, 0.0, abs(sin(fC * 38.0 - t_fast * 1.1 + grain * 1.5)));
            float contourY = smoothstep(0.15, 0.0, abs(sin(fY * 41.0 - t_fast * 1.2 + grain * 1.5)));

            // Cyberdelic Neon Palette
            vec3 colM = vec3(1.0, 0.0, 0.8);  // Electric Magenta
            vec3 colC = vec3(0.0, 1.0, 0.94); // Neon Cyan
            vec3 colY = vec3(0.7, 1.0, 0.0);  // Acid Lime/Yellow
            vec3 voidBlack = vec3(0.015, 0.02, 0.025);

            vec3 color = voidBlack;

            // Base fluid volumes (soft, deep)
            color += colM * smoothstep(0.3, 0.7, fM) * 0.35;
            color += colC * smoothstep(0.35, 0.75, fC) * 0.35;
            color += colY * smoothstep(0.4, 0.8, fY) * 0.35;

            // Additive contour fringes (vibrating acid interference)
            color += colM * contourM;
            color += colC * contourC;
            color += colY * contourY;

            // --- 4. PRINT ARTIFACTS (Glitchy Halftone Screen) ---
            mat2 rot = mat2(0.707, -0.707, 0.707, 0.707); // 45 degree screen
            // Add a slight sine wave to grid UVs to simulate mechanical scanner drag
            vec2 gridUV = rot * uv * (u_resolution.y * 0.5) + vec2(sin(uv.y * 50.0) * 0.5, 0.0); 
            vec2 cell = fract(gridUV) - 0.5;
            float dist = length(cell);

            // Dot size driven by overall field density
            float density = (fM + fC + fY) / 3.0;
            float dotRadius = density * 0.95;
            float halftone = smoothstep(dotRadius + 0.15, dotRadius - 0.15, dist);

            // Multiply blend the halftone (simulating black ink dots compressing the neon)
            color *= mix(0.15, 1.0, halftone);

            // Re-apply the grain as a final physical overlay
            color += grain * 0.12;

            // Heavy vignette to anchor the chaos
            float vig = length(vUv - 0.5);
            color *= smoothstep(0.8, 0.2, vig);

            fragColor = vec4(color, 1.0);
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
  if (material.uniforms.u_time) material.uniforms.u_time.value = time;
  if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);