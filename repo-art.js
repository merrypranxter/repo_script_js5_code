if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
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

      // --- THE FERAL ENGINE: NOISE & VIBRATION ---
      
      // Hash for cellular noise
      vec2 hash22(vec2 p) {
          p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
          return fract(sin(p) * 43758.5453);
      }

      // Worley Cellular Noise (F2-F1)
      float worley(vec2 p) {
          vec2 n = floor(p);
          vec2 f = fract(p);
          float d1 = 8.0, d2 = 8.0;
          for (int j = -1; j <= 1; j++) {
              for (int i = -1; i <= 1; i++) {
                  vec2 g = vec2(float(i), float(j));
                  vec2 o = hash22(n + g);
                  o = 0.5 + 0.5 * sin(u_time * 0.8 + 6.28318 * o); // Cellular mutation
                  vec2 r = g + o - f;
                  float d = dot(r, r);
                  if (d < d1) { d2 = d1; d1 = d; }
                  else if (d < d2) { d2 = d; }
              }
          }
          return sqrt(d2) - sqrt(d1);
      }

      // Simplex Noise 2D
      vec3 permute(vec3 x) { return mod(((x*34.0)+10.0)*x, 289.0); }
      float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ) );
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      // FBM for Domain Warping
      float fbm(vec2 p) {
          float sum = 0.0;
          float amp = 0.5;
          for(int i=0; i<4; i++) {
              sum += amp * snoise(p);
              p *= 2.0;
              amp *= 0.5;
          }
          return sum;
      }

      // Psychedelic Collage: Kaleidoscope Fold
      vec2 kaleidoscope(vec2 uv, float folds) {
          float angle = atan(uv.y, uv.x);
          float radius = length(uv);
          float sector = 6.2831853 / folds;
          angle = mod(angle, sector);
          if (angle > sector * 0.5) angle = sector - angle;
          return vec2(cos(angle), sin(angle)) * radius;
      }

      // --- COLOR, OPTICS & PRINT ARTIFACTS ---
      
      // Cyberdelic Neon / Toxic Aurora Palette
      vec3 palette(float t) {
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.5);
          vec3 c = vec3(2.0, 1.0, 1.0);
          vec3 d = vec3(0.5, 0.2, 0.25);
          return a + b * cos(6.2831853 * (c * t + d));
      }

      // Structural Color: Thin-film Interference
      vec3 thinFilm(float thickness) {
          float pathDiff = 2.0 * 1.56 * thickness; // n=1.56 (chitin/crystal)
          vec3 phase = vec3(0.0, 0.33, 0.67);
          return 0.5 + 0.5 * cos(6.2831853 * (pathDiff + phase));
      }

      void main() {
          // Normalize and center UVs
          vec2 uv = vUv * 2.0 - 1.0;
          uv.x *= u_resolution.x / u_resolution.y;
          vec2 uv0 = uv;

          // Rotation
          float t = u_time * 0.15;
          float s = sin(t), c = cos(t);
          uv = mat2(c, -s, s, c) * uv;

          // Blacklight Poster: Velvet Void Base
          vec3 col = vec3(0.01, 0.005, 0.02);

          // 1. Kaleidoscope Mirror Fold
          vec2 k_uv = kaleidoscope(uv, 8.0);
          
          // 2. Domain Warp (Infected/Overclocked space)
          vec2 warp = vec2(fbm(k_uv * 3.0 + t), fbm(k_uv * 3.0 - t + 42.0));
          vec2 w_uv = k_uv + warp * 0.5;

          // 3. Cymatic Crystal Growth: Chladni Nodes masking Worley Cells
          float w = worley(w_uv * 5.0 - t * 2.0);
          // Chladni plate equation
          float chladni = cos(3.0 * w_uv.x) * cos(5.0 * w_uv.y) - cos(5.0 * w_uv.x) * cos(3.0 * w_uv.y);
          
          // The strange mechanism: cellular growth is forced into resonant nodal lines
          float mask = smoothstep(0.0, 0.4, abs(chladni));
          float membrane = mix(w, fbm(w_uv * 12.0), mask);

          // 4. Structural Color & Fluorescence
          // Calculate pseudo-curvature for thin-film iridescence
          float eps = 0.01;
          float dx = worley(w_uv * 5.0 - t * 2.0 + vec2(eps, 0.0)) - w;
          float dy = worley(w_uv * 5.0 - t * 2.0 + vec2(0.0, eps)) - w;
          float curvature = length(vec2(dx, dy)) / eps;
          
          vec3 iridescence = thinFilm(curvature * 0.08 + u_time * 0.1);
          
          // Blacklight Glow Hierarchy (Core -> Rim -> Bloom)
          float core = exp(-membrane * 12.0);
          float rim = exp(-membrane * 4.0);
          float bloom = exp(-membrane * 1.5);
          
          vec3 fluor_color = palette(membrane * 1.5 - t);
          
          col += fluor_color * core * 2.0;    // Hot core
          col += fluor_color * rim * 1.2;     // Neon rim
          col += fluor_color * bloom * 0.5;   // Soft aura
          col += iridescence * rim * 0.8;     // Crystal facets catching light

          // 5. Psychedelic Collage Print Artifacts
          // Halftone Newsprint Overlay in the shadows/mids
          float luma = dot(clamp(col, 0.0, 1.0), vec3(0.299, 0.587, 0.114));
          vec2 ht_uv = mat2(0.707, -0.707, 0.707, 0.707) * gl_FragCoord.xy * (150.0 / u_resolution.y);
          float ht_dot = length(fract(ht_uv) - 0.5);
          float halftone = smoothstep(0.35, 0.5, ht_dot + luma * 0.7);
          
          // Multiply blend halftone, preserving extreme emissive highlights
          col *= mix(0.15, 1.0, halftone + core); 

          // CMYK Misregistration / Chromatic Aberration Glitch
          float r_shift = fbm(w_uv * 10.0 + vec2(0.1, 0.0));
          float b_shift = fbm(w_uv * 10.0 - vec2(0.1, 0.0));
          col.r += r_shift * 0.25 * bloom;
          col.b += b_shift * 0.25 * bloom;

          // Xerox Dust / Scratches
          float dust = snoise(uv0 * 100.0 + t);
          col += max(0.0, dust - 0.8) * 0.5 * fluor_color;

          // Blacklight Vignette (Velvet void framing)
          float vig = 1.0 - smoothstep(0.4, 1.8, length(uv0));
          col *= vig;

          // ACES Filmic Tonemapping
          col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);

          fragColor = vec4(col, 1.0);
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
  if (material.uniforms.u_time) material.uniforms.u_time.value = time;
  if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);