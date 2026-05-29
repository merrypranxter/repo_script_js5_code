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
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      in vec2 vUv;
      out vec4 fragColor;
      
      uniform float u_time;
      uniform vec2 u_resolution;

      #define PI 3.14159265359

      // Feral PRNG
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
          // Normalize and center
          vec2 p = vUv * 2.0 - 1.0;
          p.x *= u_resolution.x / u_resolution.y;
          
          float r = length(p);
          float a = atan(p.y, p.x);
          
          // ALCHEMICAL SCRIPTURE L07: Möbius / Log-Polar transform
          // Creates a radiating, spiraling web that folds into the center
          float spiral = a * 4.0 + sin(r * 12.0 - u_time * 2.5);
          float radial = log(r + 0.02) * 15.0 - u_time * 4.0;
          
          // Warp UVs before weave application (Psychedelic mechanism)
          vec2 thread_uv = vec2(radial, spiral * 5.0);
          
          // Domain warp the threads themselves (Fungal succession / Machine hesitation)
          thread_uv.x += sin(thread_uv.y * 0.1 + u_time) * 0.5;
          thread_uv.y += cos(thread_uv.x * 0.1 - u_time) * 0.5;
          
          vec2 cell = floor(thread_uv);
          vec2 local = fract(thread_uv);
          
          // METRIC COMPETITION: Jacquard logic driven by chaotic interference
          float rule = sin(cell.x * 0.8) * cos(cell.y * 0.8) + sin(cell.x * 0.15 + u_time * 1.2);
          float warp_over = step(0.0, sin(cell.x * PI + cell.y * PI + rule * 6.0));
          
          // DEVORE BURNOUT: Parasite-host logic eating the weft threads
          float burnout = smoothstep(0.1, 0.6, sin(cell.x * 0.15 + u_time) * cos(cell.y * 0.25 - u_time));
          
          // TEXTILE WEAVE TENSION: Cylindrical depth profile for threads
          float dx = abs(local.x - 0.5) * 2.0;
          float dy = abs(local.y - 0.5) * 2.0;
          
          float z_warp = cos(dx * PI * 0.5) + (warp_over > 0.5 ? 0.6 : -0.6);
          float z_weft = cos(dy * PI * 0.5) + (warp_over < 0.5 ? 0.6 : -0.6);
          
          bool is_warp = z_warp > z_weft;
          
          // Apply burnout: if weft is on top but burned away, expose the warp beneath
          if (!is_warp && burnout < 0.45) {
              is_warp = true; 
              z_warp -= 0.8; // Push it deep into the shadow
          }
          
          // NORMAL MAPPING: Microgeometry of the thread
          vec3 N = is_warp ? normalize(vec3(local.x - 0.5, 0.0, 1.0)) : normalize(vec3(0.0, local.y - 0.5, 1.0));
          
          // LIGHTING: Anisotropic sheen (Silk / Lamé behavior)
          vec3 L = normalize(vec3(0.5, 0.5, 1.0));
          vec3 V = vec3(0.0, 0.0, 1.0);
          vec3 H = normalize(L + V);
          
          // Tangent vectors for the threads
          vec3 T = is_warp ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
          float TdotH = dot(T, H);
          float aniso = exp(-pow(TdotH, 2.0) / 0.015); // Razor sharp highlight
          
          float diff = max(dot(N, L), 0.0);
          
          // COLOR SYSTEM: Highly acidic, toxic, reactive dyes
          // Warp: Nuclear magenta shifting to electric violet
          vec3 c_warp = vec3(1.0, 0.0, 0.5) + 0.5 * sin(cell.y * 0.1 + u_time * 1.5 + vec3(0.0, 1.5, 3.0));
          // Weft: Toxic lime green shifting to cyber cyan
          vec3 c_weft = vec3(0.1, 1.0, 0.0) + 0.5 * cos(cell.x * 0.1 - u_time * 1.2 + vec3(1.0, 2.0, 4.0));
          
          // Over-saturate
          c_warp = clamp(c_warp * 1.8, 0.0, 1.0);
          c_weft = clamp(c_weft * 1.8, 0.0, 1.0);
          
          // FLOCKED HALO / FUZZ: Loose mohair fibers catching light
          float fuzz = hash(thread_uv);
          float edge = is_warp ? dx : dy;
          float halo = smoothstep(0.75, 1.0, edge) * fuzz;
          
          vec3 base_col = is_warp ? c_warp : c_weft;
          
          // Ambient Occlusion based on weave depth
          float ao = is_warp ? z_warp : z_weft;
          ao = clamp(ao * 0.5 + 0.5, 0.1, 1.0);
          
          // COMPOSITION
          vec3 final_col = base_col * diff * ao;
          final_col += aniso * vec3(1.0, 0.9, 0.7) * 0.9; // Metallic sheen
          final_col += halo * vec3(0.0, 1.0, 0.8) * 1.5;  // Cyan fiber glow
          
          // GLITCH FOSSILIZATION: Random dead pixels behaving like pollen
          if (hash(thread_uv + u_time) > 0.995) {
              final_col = vec3(1.0, 1.0, 0.0); // Spores
          }

          // Abyssal Vignette
          final_col *= smoothstep(1.8, 0.2, r);
          
          fragColor = vec4(final_col, 1.0);
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
    console.error("Feral WebGL Initialization Failed:", e);
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