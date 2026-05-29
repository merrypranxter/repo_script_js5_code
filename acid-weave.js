if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      in vec2 vUv;
      out vec4 fragColor;

      uniform float u_time;
      uniform vec2 u_resolution;

      // --- Math & Noise Utilities ---
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 5; i++) {
              value += amplitude * noise(p);
              p *= 2.0;
              amplitude *= 0.5;
          }
          return value;
      }

      // --- Acidic Psychedelic Palettes ---
      vec3 paletteNeon(float t) {
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.5);
          vec3 c = vec3(2.0, 1.5, 1.0);
          vec3 d = vec3(0.8, 0.2, 0.5); // Hot pinks, electric limes, magentas
          return a + b * cos(6.28318 * (c * t + d));
      }

      vec3 paletteToxic(float t) {
          vec3 a = vec3(0.5, 0.6, 0.4);
          vec3 b = vec3(0.5, 0.4, 0.6);
          vec3 c = vec3(1.0, 2.0, 3.0);
          vec3 d = vec3(0.1, 0.5, 0.9); // Cyan, toxic yellow, deep violet
          return a + b * cos(6.28318 * (c * t + d));
      }

      // --- Velvet / Anisotropic BRDF ---
      float anisotropic_highlight(vec3 light_dir, vec3 view_dir, vec3 normal, vec2 thread_dir, float roughness) {
          vec3 H = normalize(light_dir + view_dir);
          float NdotH = max(dot(normal, H), 0.001);
          float HdotT = dot(H.xy, thread_dir);
          // Ward anisotropic approximation
          float aniso = exp(-2.0 * pow(HdotT, 2.0) / (NdotH * roughness));
          return aniso;
      }

      void main() {
          // Adjust UVs to keep threads square
          vec2 uv = vUv;
          float aspect = u_resolution.x / u_resolution.y;
          uv.x *= aspect;

          // Global zoom and movement
          float zoom = 140.0 + sin(u_time * 0.2) * 40.0;
          vec2 p = uv * zoom + vec2(u_time * 2.0, u_time * 1.5);

          // Thread Grid
          vec2 cell = floor(p);
          vec2 local = fract(p);

          // Ikat Blur / Dye Bleed Simulation
          // Warp threads bleed vertically, weft threads bleed horizontally
          vec2 ikat_cell = cell;
          ikat_cell.y += (noise(vec2(cell.x * 0.1, u_time * 0.1)) - 0.5) * 6.0;
          ikat_cell.x += (noise(vec2(u_time * 0.15, cell.y * 0.1)) - 0.5) * 6.0;

          // --- Mathematical Macro Pattern (The Jacquard Program) ---
          vec2 math_uv = ikat_cell * 0.02;
          
          // Domain warping (reaction-diffusion vibe)
          vec2 q = vec2(fbm(math_uv + u_time * 0.2), fbm(math_uv + vec2(5.2, 1.3)));
          vec2 r = vec2(fbm(math_uv + 4.0 * q + vec2(1.7, 9.2)), fbm(math_uv + 4.0 * q + vec2(8.3, 2.8)));
          float n = fbm(math_uv + 4.0 * r);

          // Bitwise XOR Fractal (Cellular Automata Lace)
          int cx = int(ikat_cell.x);
          int cy = int(ikat_cell.y);
          float xor_fractal = float((cx ^ cy) % 7 == 0 ? 1.0 : 0.0);

          // Combine continuous domain warp and discrete bitwise math
          float pattern_field = smoothstep(0.3, 0.7, n + xor_fractal * 0.15);

          // --- Weave Structure Logic ---
          // 1.0 = Warp (Vertical) on top, 0.0 = Weft (Horizontal) on top
          
          // Plain weave (1/1)
          float plain = mod(float(cx + cy), 2.0);
          
          // Twill (3/1 diagonal)
          float twill = step(1.0, mod(float(cx) + float(cy) * 2.0, 4.0));
          
          // Satin float (1/4)
          float satin = step(3.0, mod(float(cx) * 3.0 + float(cy), 5.0));

          // The pattern field dictates which weave structure is used
          float is_warp = 0.0;
          if (pattern_field < 0.33) {
              is_warp = plain;
          } else if (pattern_field < 0.66) {
              is_warp = twill;
          } else {
              is_warp = satin;
          }

          // --- Microgeometry & Thread Rendering ---
          // Fuzz and slub (thickness variation)
          float fuzz_warp = noise(vec2(cell.x * 12.0, local.y * 40.0)) * 0.15;
          float fuzz_weft = noise(vec2(local.x * 40.0, cell.y * 12.0)) * 0.15;
          
          float base_width = 0.38; // Thread thickness
          float warp_dist = abs(local.x - 0.5);
          float weft_dist = abs(local.y - 0.5);
          
          float warp_mask = smoothstep(base_width + fuzz_warp, base_width + fuzz_warp - 0.05, warp_dist);
          float weft_mask = smoothstep(base_width + fuzz_weft, base_width + fuzz_weft - 0.05, weft_dist);

          // Resolve overlap based on weave rule
          float final_warp = is_warp * warp_mask + (1.0 - is_warp) * warp_mask * (1.0 - weft_mask);
          float final_weft = (1.0 - is_warp) * weft_mask + is_warp * weft_mask * (1.0 - warp_mask);
          
          bool warp_visible = final_warp > final_weft;

          // 3D Thread Normals (Cylindrical)
          float nz_warp = sqrt(max(0.0, 1.0 - pow(warp_dist / base_width, 2.0)));
          float nz_weft = sqrt(max(0.0, 1.0 - pow(weft_dist / base_width, 2.0)));
          
          vec3 normal_warp = normalize(vec3((local.x - 0.5) * 2.0, 0.0, nz_warp));
          vec3 normal_weft = normalize(vec3(0.0, (local.y - 0.5) * 2.0, nz_weft));
          
          vec3 normal = warp_visible ? normal_warp : normal_weft;
          vec2 thread_dir = warp_visible ? vec2(0.0, 1.0) : vec2(1.0, 0.0);

          // --- Lighting ---
          vec3 light_dir = normalize(vec3(0.5, 0.7, 1.0));
          vec3 view_dir = vec3(0.0, 0.0, 1.0);
          
          float diffuse = max(dot(normal, light_dir), 0.0);
          
          // Anisotropic silk/velvet highlight
          float aniso = anisotropic_highlight(light_dir, view_dir, normal, thread_dir, 0.15);
          
          // Ambient occlusion in the weave gaps
          float ao = warp_visible ? nz_warp : nz_weft;
          ao = mix(0.2, 1.0, ao);

          // --- Dye Color Application ---
          // Warp and weft get different acidic palettes, driven by the math field
          vec3 color_warp = paletteNeon(n + u_time * 0.1 + float(cx) * 0.005);
          vec3 color_weft = paletteToxic(q.x + r.y + float(cy) * 0.005);
          
          vec3 base_color = warp_visible ? color_warp : color_weft;
          
          // Composite lighting
          vec3 final_color = base_color * (diffuse * 0.8 + 0.2) * ao;
          final_color += aniso * 0.6 * vec3(1.0, 0.9, 0.9); // Specular shine

          // Holes between threads
          float hole = (1.0 - warp_mask) * (1.0 - weft_mask);
          final_color = mix(final_color, vec3(0.01, 0.0, 0.02), hole); // Deep dark purple gaps

          // Vignette
          float vignette = length(vUv - 0.5) * 2.0;
          final_color *= 1.0 - smoothstep(0.8, 1.5, vignette);

          fragColor = vec4(final_color, 1.0);
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