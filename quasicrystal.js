if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, context: ctx, alpha: true, antialias: true });
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
      in vec2 vUv;
      out vec4 fragColor;
      
      uniform float u_time;
      uniform vec2 u_res;
      uniform vec2 u_mouse;

      // Feral Quasicrystal Math: N-fold rotational symmetry via plane wave interference
      float quasi(vec2 p, int N, float t) {
        float v = 0.0;
        for(int i = 0; i < 20; i++) {
          if(i >= N) break;
          float a = float(i) * 3.14159265359 / float(N);
          vec2 dir = vec2(cos(a), sin(a));
          // Phase drift to make the crystal breathe
          float phase = t * (mod(float(i), 2.0) == 0.0 ? 1.0 : -1.0);
          v += cos(dot(p, dir) + phase);
        }
        return v;
      }

      void main() {
        vec2 uv = (vUv - 0.5) * 2.0;
        uv.x *= u_res.x / u_res.y;

        // Anxious photon warp: The manifold bends towards the observer
        vec2 m = (u_mouse * 2.0 - 1.0);
        uv += m * 0.15 * sin(uv.yx * 4.0 + u_time * 0.5);

        // Base coordinate scale
        vec2 p = uv * 30.0;
        float t = u_time * 0.3;

        // Incommensurate Frequencies: 5, 8, 13 (Fibonacci sequence)
        // Automorphic Domain Warping: Field N warps the coordinates of field N+1
        float q5 = quasi(p, 5, t);
        
        vec2 p8 = p + vec2(cos(q5), sin(q5)) * 1.618;
        float q8 = quasi(p8, 8, t * 1.618);
        
        vec2 p13 = p8 + vec2(sin(q8), cos(q8)) * 2.618;
        float q13 = quasi(p13, 13, t * 2.618);

        // Topological Interference
        float total = q5 * 1.0 + q8 * 0.618 + q13 * 0.382;

        // Lithogenesis: Crystallize the smooth waves into razor-sharp ridges
        // Using abs(fract) to create a non-repeating faceted surface geometry
        float ridge = abs(fract(total * 1.1) - 0.5) * 2.0;
        float sharp = pow(1.0 - ridge, 7.0);  // Sharp crystal edges
        float core = pow(1.0 - ridge, 32.0); // Incandescent core intersections

        // Chromatic Phase-shifting (Neon Palette over Void Black)
        // Irreconcilable waves map directly to RGB phase
        vec3 colorPhase = vec3(
          sin(q5 * 1.3 + t),
          cos(q8 * 1.3 - t),
          sin(q13 * 1.3 + t * 0.5)
        ) * 0.5 + 0.5;

        // Toxic Neon Alchemy
        vec3 neon = mix(vec3(0.0, 1.0, 0.8), vec3(1.0, 0.0, 0.4), colorPhase.r); // Cyan to Magenta
        neon = mix(neon, vec3(0.4, 0.0, 1.0), colorPhase.g); // Inject Electric Violet
        neon = mix(neon, vec3(0.8, 1.0, 0.0), pow(colorPhase.b, 2.0)); // Acid Green peaks

        // Assemble the material
        vec3 col = neon * sharp * 1.8 + vec3(1.0) * core * 2.5;

        // Silicon Necrosis: Machine hesitation grit
        float grit = fract(sin(dot(uv + t, vec2(12.9898, 78.233))) * 43758.5453);
        col += neon * grit * 0.15 * sharp;

        // Abyssal Void Background
        vec3 voidColor = vec3(0.01, 0.0, 0.03) * length(uv);
        col = max(col, voidColor);

        // Vignette to crush the edges into the void
        col *= 1.0 - pow(length(vUv - 0.5), 2.5) * 1.8;

        fragColor = vec4(col, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_res: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
      },
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
  if (material.uniforms.u_res) {
    material.uniforms.u_res.value.set(grid.width, grid.height);
  }
  if (material.uniforms.u_mouse) {
    const mx = mouse.x / grid.width;
    const my = 1.0 - (mouse.y / grid.height);
    material.uniforms.u_mouse.value.lerp(new THREE.Vector2(mx, my), 0.05);
  }
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);