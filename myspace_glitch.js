try {
  if (!ctx) throw new Error("WebGL 2 context not available");

  if (!canvas.__three) {
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const fragmentShader = `
      in vec2 vUv;
      out vec4 fragColor;

      uniform float u_time;
      uniform vec2 u_resolution;

      #define PI 3.14159265359

      // --- COLOR SYSTEMS (Repo 5) ---
      // OKLCh to sRGB conversion for vivid, perceptual acid colors
      vec3 oklch2rgb(vec3 c) {
          float L = c.x; float C = c.y; float h = c.z;
          float a = C * cos(h); float b = C * sin(h);
          
          float l_ = L + 0.3963377774 * a + 0.2158037573 * b;
          float m_ = L - 0.1055613458 * a - 0.0638541728 * b;
          float s_ = L - 0.0894841775 * a - 1.2914855480 * b;
          
          float l = l_*l_*l_; float m = m_*m_*m_; float s = s_*s_*s_;
          
          vec3 rgb;
          rgb.r =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
          rgb.g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
          rgb.b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
          
          rgb = mix(rgb * 12.92, 1.055 * pow(max(rgb, 0.0), vec3(1.0/2.4)) - 0.055, step(0.0031308, rgb));
          return clamp(rgb, 0.0, 1.0);
      }

      // --- NOISE & MATH ---
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);
          return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                     mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
      }

      float fbm(vec2 p) {
          float f = 0.0; float amp = 0.5;
          for(int i=0; i<4; i++) { f += amp * noise(p); p *= 2.0; amp *= 0.5; }
          return f;
      }

      float box(vec2 p, vec2 b) {
          vec2 d = abs(p) - b;
          return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
      }

      vec2 rot(vec2 p, float a) {
          float s = sin(a), c = cos(a);
          return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
      }

      void main() {
          vec2 uv = (vUv - 0.5) * 2.0;
          uv.x *= u_resolution.x / u_resolution.y;
          float t = u_time * 0.8;

          // 1. MACROBLOCK GLITCH (Data Rot & Early Internet)
          float blockY = floor(uv.y * 14.0);
          float glitchHash = hash(vec2(blockY, floor(t * 12.0)));
          float tear = step(0.92, glitchHash);
          
          vec2 gUv = uv;
          // Horizontal tearing
          gUv.x += tear * (hash(vec2(t, blockY)) - 0.5) * 1.5;
          // Vertical stutter & pixelation
          if (step(0.96, hash(vec2(floor(uv.x * 10.0), floor(t * 8.0)))) > 0.0) {
              gUv.y += 0.3 * sin(t * 20.0);
              gUv.x = floor(gUv.x * 25.0) / 25.0; 
          }

          // 2. DOMAIN WARP (Op Art Stripe-Fluid Distortion)
          vec2 wUv = gUv;
          wUv.x += 0.2 * fbm(gUv * 2.5 + t);
          wUv.y += 0.2 * fbm(gUv * 2.5 - t);

          // 3. OP ART ENGINE (Radial Hypnosis & Moiré)
          float r = length(wUv);
          float a = atan(wUv.y, wUv.x);
          
          // Spiral twist pull
          a += sin(r * 6.0 - t * 4.0) * 0.6; 
          
          float rings = sin(r * 90.0 - t * 15.0);
          float spokes = sin(a * 28.0 + sin(r * 25.0));
          
          // Phase field moiré interference
          float grid1 = sin(wUv.x * 180.0) * sin(wUv.y * 180.0);
          vec2 rotUv = rot(wUv, t * 0.15);
          float grid2 = sin(rotUv.x * 190.0) * sin(rotUv.y * 190.0);
          float moire = grid1 + grid2;

          float pattern = rings * spokes + moire * 0.45;
          float bwPat = step(0.0, pattern);
          
          // Chromatic Interference (RGB Split)
          float splitAmt = tear * 0.1 + 0.01;
          vec2 wUvR = wUv + vec2(splitAmt, 0.0);
          vec2 wUvB = wUv - vec2(splitAmt, 0.0);
          float patR = sin(length(wUvR)*90.0 - t*15.0) * sin(atan(wUvR.y, wUvR.x)*28.0) + moire*0.45;
          float patB = sin(length(wUvB)*90.0 - t*15.0) * sin(atan(wUvB.y, wUvB.x)*28.0) + moire*0.45;
          
          // Base B&W scaffold with severe RGB tearing
          vec3 col = vec3(step(0.0, patR), bwPat, step(0.0, patB));

          // 4. ACID CONTAMINATION (Psychedelic Bloom)
          float contamination = fbm(uv * 4.0 - t);
          if (contamination > 0.45 || tear > 0.0) {
              float hue = t * 2.5 + r * 4.0 + a;
              vec3 acid = oklch2rgb(vec3(0.7, 0.28, hue)); // Bright, high chroma
              col = mix(col, acid * bwPat, (contamination - 0.45) * 2.5 + tear);
          }

          // 5. INTERFACE DEBRIS (MySpace / Early Web UI Popups)
          // Window 1: Hot Pink Glitch Box
          vec2 winCenter1 = vec2(0.5 * sin(t*0.8), 0.3 * cos(t*1.3));
          float dWin1 = box(gUv - winCenter1, vec2(0.4, 0.25));
          if (dWin1 < 0.0) {
              col = 1.0 - col; // Invert inside
              col *= oklch2rgb(vec3(0.68, 0.32, 0.0)); // Hot Pink
              if (gUv.y > winCenter1.y + 0.15) col = vec3(1.0); // Title bar
              // Fake scrambled text
              if (gUv.y < winCenter1.y + 0.1) {
                  float txt = step(0.6, sin(gUv.y * 250.0)) * step(0.3, noise(gUv * 40.0));
                  col = mix(col, vec3(1.0), txt * 0.7);
              }
          }

          // Window 2: Acid Green / Cyan Box
          vec2 winCenter2 = vec2(-0.4 * cos(t), -0.2 * sin(t*1.6));
          float dWin2 = box(gUv - winCenter2, vec2(0.35, 0.2));
          if (dWin2 < 0.0) {
              col = vec3(bwPat); // Force B&W
              col *= oklch2rgb(vec3(0.8, 0.25, 2.8)); // Acid Lime/Cyan
              if (gUv.y > winCenter2.y + 0.1) col = vec3(0.0);
          }

          // Error Crosses (Cursor Swarms)
          vec2 xGrid = fract(uv * 6.0 + vec2(t*2.0, -t*1.2)) - 0.5;
          vec2 xGridRot = rot(xGrid, PI/4.0);
          float dCross = min(box(xGridRot, vec2(0.12, 0.025)), box(xGridRot, vec2(0.025, 0.12)));
          float xMask = step(dCross, 0.0) * step(0.85, noise(floor(uv * 6.0) + t * 4.0));
          if (xMask > 0.0) {
              col = mix(col, oklch2rgb(vec3(0.9, 0.2, 3.8)), 0.95); // Bright Cyan
          }

          // 6. GLITTER GRAPHICS (Blingee / Scene Emo)
          vec2 glitUv = uv * 300.0;
          float glitNoise = hash(glitUv + floor(t * 24.0));
          float glit = step(0.98, glitNoise);
          glit *= 0.5 + 0.5 * sin(t * 60.0 + uv.x * 40.0 + uv.y * 50.0); // Twinkle
          
          vec3 glitColor = mix(
              oklch2rgb(vec3(0.95, 0.15, 1.5)), // Yellow/Gold
              oklch2rgb(vec3(0.75, 0.3, 5.5)),  // Magenta/Purple
              step(0.5, hash(glitUv))
          );
          
          // Mask glitter to dark areas and window borders
          float glitMask = (1.0 - bwPat) + step(abs(dWin1), 0.04) + step(abs(dWin2), 0.04);
          col = mix(col, glitColor, glit * clamp(glitMask, 0.0, 1.0) * 2.5);

          // 7. STROBE / FLASH
          float flash = step(0.97, sin(t * 18.0)) * step(0.5, sin(uv.y * 10.0 - t * 30.0));
          if (flash > 0.0) {
              col = 1.0 - col;
              col.b += 0.5;
          }

          // 8. CRT / SCANLINE / VIGNETTE (Hardware rot)
          float scan = 0.5 + 0.5 * sin(vUv.y * u_resolution.y * 2.8);
          col *= 0.85 + 0.15 * scan;
          
          float vig = length(vUv - 0.5) * 2.0;
          col *= 1.0 - pow(vig, 3.0) * 0.75;
          
          // TV Tube Curve
          vec2 curveUv = (vUv - 0.5) * 2.0;
          curveUv *= 1.0 + pow(abs(curveUv.yx), vec2(2.0)) * 0.15;
          if (abs(curveUv.x) > 1.0 || abs(curveUv.y) > 1.0) {
              col = vec3(0.02); // Dark bezel
          }

          fragColor = vec4(col, 1.0);
      }
    `;

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
      fragmentShader: fragmentShader,
      depthWrite: false,
      depthTest: false
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  if (material?.uniforms?.u_time) {
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("WebGL Initialization Failed:", e);
}