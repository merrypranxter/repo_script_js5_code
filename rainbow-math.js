if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

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

      // ======================================================================
      // COLOR FIELDS & COLOR SYSTEMS MODULE
      // Oklch to Linear sRGB for perceptual, uniform spectral rainbows
      // ======================================================================
      vec3 oklch2rgb(vec3 lch) {
          float L = lch.x;
          float C = lch.y;
          float h = lch.z;
          float a = C * cos(h);
          float b = C * sin(h);
          
          float l_ = L + 0.3963377774 * a + 0.2158037573 * b;
          float m_ = L - 0.1055613458 * a - 0.0638541728 * b;
          float s_ = L - 0.0894841775 * a - 1.2914855480 * b;
          
          float l = l_*l_*l_;
          float m = m_*m_*m_;
          float s = s_*s_*s_;
          
          vec3 rgb;
          rgb.r =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
          rgb.g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
          rgb.b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
          return rgb;
      }

      // AgX Tonemapping approximation for handling Kirlian-level plasma brightness
      vec3 tonemapAgX(vec3 c) {
          vec3 x = max(vec3(0.0), c);
          vec3 a = x * (x + 0.0245786) - 0.000090537;
          vec3 b = x * (0.983729 * x + 0.4329510) + 0.238081;
          return a / b;
      }

      // Film grain noise
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      // ======================================================================
      // THE RAINBLOWN MATHEMATICAL MASTERPIECE
      // Advection-diffusion fluid wind + Kaleidoscopic inversion fractal + 
      // Kirlian dielectric breakdown filaments
      // ======================================================================
      float mathField(vec2 p, float offset) {
          vec2 z = p;
          float acc = 0.0;
          float t = u_time * 0.15 + offset;
          
          // Prevailing wind direction (rainblown)
          vec2 windDir = normalize(vec2(1.0, 1.4));
          
          // Global slow rotation
          float ang = t * 0.2;
          mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
          z *= rot;
          
          for(int i = 0; i < 16; i++) {
              // 1. Curl-like fluid advection (Bioluminescent Systems)
              vec2 warp = vec2(
                  sin(z.y * 2.3 + t) + cos(z.x * 1.7 - t),
                  cos(z.x * 2.1 + t) - sin(z.y * 1.9 - t)
              );
              z += warp * 0.07;
              
              // 2. Rainblown sweep (pushes the fractal coordinates away)
              z -= windDir * 0.08 * (float(i) * 0.1); 
              
              // 3. Kaleidoscopic fold (Psychedelic Collage)
              z = abs(z);
              if (z.x < z.y) z.xy = z.yx;
              
              // 4. Spherical inversion cavity (Lithogenesis geometry)
              float r2 = dot(z, z);
              float k = clamp(1.2 / r2, 0.1, 6.0);
              z *= k;
              z -= vec2(0.65, 0.45);
              
              // 5. Kirlian discharge filaments (sharp glowing ridges)
              float filament = 0.025 / (abs(z.y) + 0.015);
              acc += filament * sqrt(k);
          }
          return acc;
      }

      void main() {
          // Normalize coordinates
          vec2 uv = (vUv - 0.5) * 2.0;
          uv.x *= u_resolution.x / u_resolution.y;
          
          // Base depth pass for chromatic parallax
          float depth = mathField(uv, 0.0);
          
          // ==================================================================
          // CHROMATIC PARALLAX (Terminator HUD / Parallax depth fields)
          // Depth becomes color separation. Far objects bleed rainbow edges.
          // ==================================================================
          float px = 0.006 * depth; // Separation scales with intensity
          
          float valR = mathField(uv + vec2(px, px),  0.00);
          float valG = mathField(uv,                 0.02);
          float valB = mathField(uv - vec2(px, px),  0.04);
          
          // Map to Oklch Spectral Rainbow
          // L = 0.75 (bright), C = 0.22 (neon acid chroma)
          float speed = 0.3;
          float hueScale = 0.06;
          
          vec3 cR = oklch2rgb(vec3(0.75, 0.22, valR * hueScale - u_time * speed))       * valR * 0.08;
          vec3 cG = oklch2rgb(vec3(0.75, 0.22, valG * hueScale - u_time * speed + 0.1)) * valG * 0.08;
          vec3 cB = oklch2rgb(vec3(0.75, 0.22, valB * hueScale - u_time * speed + 0.2)) * valB * 0.08;
          
          // Recombine channels
          vec3 finalColor = vec3(cR.r, cG.g, cB.b);
          
          // HDR Tonemapping (AgX) to handle plasma brightness
          finalColor = tonemapAgX(finalColor);
          
          // Post-Processing: Film Grain & Vignette
          finalColor += (hash(vUv * u_resolution + u_time) - 0.5) * 0.06;
          float vig = 1.0 - smoothstep(0.4, 1.5, length(vUv - 0.5));
          finalColor *= vig;
          
          fragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
      },
      vertexShader,
      fragmentShader,
      depthWrite: false,
      depthTest: false
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
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);