try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
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

      #define PI 3.14159265359

      // --- UTILS & NOISE ---
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

      // --- PALETTES (MySpace Acid / Glitchcore) ---
      vec3 getNeonColor(float t) {
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.5);
          vec3 c = vec3(1.0, 1.0, 1.0);
          vec3 d = vec3(0.8, 0.0, 0.4); // Hot pink bias
          vec3 col = a + b * cos(2.0 * PI * (c * t + d));
          
          // Force into toxic extremes (Cyan, Magenta, Acid Green)
          if(t < 0.33) return vec3(1.0, 0.0, 1.0); // Magenta
          if(t < 0.66) return vec3(0.0, 1.0, 1.0); // Cyan
          return vec3(0.8, 1.0, 0.0); // Acid Green
      }

      // --- OP-ART HYPERBOLIC TUNNEL ---
      float opArtTunnel(vec2 p, float time_offset) {
          // Hyperbolic-ish warp: compress space near center
          float r = length(p);
          float a = atan(p.y, p.x);
          
          // Zeno infinite descent log-depth
          float z = log(r + 0.001) * 8.0 - time_offset * 3.0;
          
          // Concentric target + radial spokes
          float rings = sin(z);
          float spokes = sin(a * 12.0 + z * 0.5);
          
          // Checkerboard logic
          float pattern = rings * spokes;
          
          // Hard threshold for B&W retinal burn
          return step(0.0, pattern);
      }

      // --- MYSPACE GLITTER / BLINGEE ---
      float glitterSparkle(vec2 p, float t) {
          // Grid layout for stamps
          vec2 gv = fract(p * 8.0) - 0.5;
          vec2 id = floor(p * 8.0);
          
          // Randomize existence and blink
          float h = hash(id);
          if (h > 0.3) return 0.0;
          
          float blink = sin(t * 10.0 * h + h * 100.0) * 0.5 + 0.5;
          blink = smoothstep(0.8, 1.0, blink); // sharp pop
          
          // 4-point star SDF approx
          float d = length(gv) - 0.02 / (abs(gv.x * gv.y) + 0.001);
          return smoothstep(0.05, 0.0, d) * blink;
      }

      void main() {
          vec2 uv = (vUv - 0.5) * 2.0;
          uv.x *= u_resolution.x / u_resolution.y;
          float t = u_time;

          vec2 warped_uv = uv;

          // --- GLITCH MECHANICS: "HTML Table Collapse" & VHS Tracking ---
          // Horizontal banding that tears the space
          float tear_band = step(0.95, sin(uv.y * 15.0 + t * 4.0)) * sin(t * 10.0);
          warped_uv.x += tear_band * 0.2;

          // Macroblock compression (Candy Crash)
          float block_glitch = hash(vec2(floor(t * 5.0), 0.0));
          bool is_glitching = block_glitch > 0.8;
          
          if (is_glitching) {
              float block_size = 0.15;
              vec2 grid = floor(warped_uv / block_size);
              if (hash(grid + floor(t*2.0)) > 0.4) {
                  warped_uv = grid * block_size + block_size * 0.5;
              }
          }

          // --- CHROMATIC ABERRATION (RGB SPLIT) ---
          float split_dist = 0.04 * (sin(t * 3.0) * 0.5 + 0.5) + (is_glitching ? 0.1 : 0.0);
          
          // Sample the B&W Op-Art structural engine
          float r_val = opArtTunnel(warped_uv * (1.0 + split_dist), t);
          float g_val = opArtTunnel(warped_uv, t);
          float b_val = opArtTunnel(warped_uv * (1.0 - split_dist), t);

          vec3 structure_col = vec3(r_val, g_val, b_val);

          // --- COLOR INJECTION (The Feral Brain) ---
          // Determine where the RGB split occurred (edges)
          float edge_mismatch = abs(r_val - g_val) + abs(b_val - g_val);
          
          vec3 final_col;
          if (edge_mismatch > 0.1) {
              // Edges bleed into toxic neon (Acid Vibration)
              float hue_seed = hash(floor(warped_uv * 10.0) + t);
              final_col = getNeonColor(hue_seed) * edge_mismatch;
          } else {
              // Core structure is harsh Black and White (Classic Retinal Op)
              // We map the 0/1 signal to a slight off-black / off-white to simulate paper/screen
              final_col = mix(vec3(0.02, 0.0, 0.05), vec3(0.95, 0.98, 1.0), g_val);
          }

          // Sometimes entire blocks invert to negative space (Cursed Shitpost)
          if (is_glitching && hash(warped_uv * 2.0) > 0.7) {
              final_col = 1.0 - final_col;
              final_col *= getNeonColor(t * 0.1);
          }

          // --- OVERLAYS: MySpace Glitter & UI Debris ---
          // Rotate glitter grid slowly
          float ca = cos(t * 0.2);
          float sa = sin(t * 0.2);
          vec2 glitter_uv = vec2(ca * uv.x - sa * uv.y, sa * uv.x + ca * uv.y);
          
          float spark = glitterSparkle(glitter_uv + vec2(sin(t), cos(t))*0.1, t);
          vec3 spark_col = getNeonColor(hash(floor(glitter_uv * 8.0))) * 1.5 + vec3(1.0); // Bright white core
          
          final_col += spark * spark_col;

          // CRT Scanline Burn
          float scanline = sin(vUv.y * u_resolution.y * 1.5) * 0.04;
          final_col -= scanline;

          // Vignette (Browser Window claustrophobia)
          float vignette = length(uv);
          final_col *= smoothstep(1.8, 0.4, vignette);

          // Hard clamp to prevent NaN/Inf blowouts
          fragColor = vec4(clamp(final_col, 0.0, 1.0), 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
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
    material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) {
      material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("Feral Glitchcore Engine Failed:", e);
}