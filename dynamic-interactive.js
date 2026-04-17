if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL context not available");

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
      uniform vec2 u_mouse;
      uniform float u_pressed;

      #define PI 3.14159265359
      #define PHI 1.61803398875

      // --- SIMPLEX NOISE 3D (from merrypranxter/noise) ---
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - 0.5;
        i = mod289(i);
        vec4 p = permute(permute(permute(
                   i.z + vec4(0.0, i1.z, i2.z, 1.0))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      // --- COLOR PALETTES (from merrypranxter/color_fields) ---
      vec3 neonAcidPalette(float t) {
        vec3 a = vec3(0.5);
        vec3 b = vec3(0.5, 0.5, 0.33);
        vec3 c = vec3(2.0, 1.0, 1.0);
        vec3 d = vec3(0.5, 0.2, 0.25);
        return a + b * cos(6.2831853 * (c * t + d));
      }

      vec3 blackBody(float t) {
        t = clamp(t, 0.0, 1.0);
        vec3 c;
        c.r = smoothstep(0.0, 0.33, t);
        c.g = smoothstep(0.15, 0.6, t) * 0.85;
        c.b = smoothstep(0.4, 0.9, t) * 0.6;
        c *= 0.5 + 2.0 * t * t;
        return c;
      }

      // --- QUASICRYSTAL MATH (from merrypranxter/quasicrystals) ---
      // 5-fold symmetry wave interference
      float quasicrystal(vec2 p, float scale) {
        float val = 0.0;
        for(float i = 0.0; i < 5.0; i++) {
          float angle = i * PI / 5.0;
          vec2 dir = vec2(cos(angle), sin(angle));
          // Add phase shift based on golden ratio for aperiodic complexity
          float phase = snoise(vec3(dir * 2.0, u_time * 0.1)) * PHI;
          val += cos(dot(p, dir) * scale + phase);
        }
        return val / 5.0;
      }

      // --- STRUCTURAL COLOR (from merrypranxter/structural_color) ---
      vec3 thinFilmInterference(float thickness, float cosTheta) {
        // Simplified physical model: 2nd cos(theta) = m * lambda
        float n_film = 1.56; // Chitin/membrane index
        float pathDiff = 2.0 * n_film * thickness * cosTheta;
        
        // Map optical path to a phase in our Lisa Frank neon palette
        // This simulates the iridescence shifting across the spectrum
        float phase = fract(pathDiff * 0.002 - u_time * 0.2);
        return neonAcidPalette(phase);
      }

      // --- MEMBRANE HEIGHT FIELD ---
      float mapHeight(vec2 p) {
        // Domain warp (fungal infection creeping into rigid math)
        vec2 warpedP = p;
        float warpStrength = 0.5 + 0.5 * snoise(vec3(p * 0.5, u_time * 0.05));
        warpedP.x += snoise(vec3(p * 2.0, u_time * 0.1)) * warpStrength;
        warpedP.y += snoise(vec3(p * 2.0 + 10.0, u_time * 0.1)) * warpStrength;

        // Base quasiperiodic structure
        float qc = quasicrystal(warpedP, 15.0);
        
        // Modulate with macro noise
        float macro = snoise(vec3(p * 1.5, u_time * 0.02));
        
        // Mouse interaction: creates a bulging stress fracture
        float dMouse = length(p - u_mouse);
        float mouseBulge = exp(-dMouse * 8.0) * (0.5 + u_pressed * 1.5);
        mouseBulge *= sin(dMouse * 40.0 - u_time * 10.0) * 0.5 + 0.5; // Newton's rings at touch point

        return (qc * 0.5 + 0.5) * (macro * 0.5 + 0.5) + mouseBulge;
      }

      void main() {
        // Normalize coordinates and handle aspect ratio
        vec2 uv = (vUv - 0.5) * 2.0;
        uv.x *= u_resolution.x / u_resolution.y;
        
        vec2 mouse = (u_mouse - 0.5) * 2.0;
        mouse.x *= u_resolution.x / u_resolution.y;

        // Central differences to calculate pseudo-normal
        vec2 e = vec2(0.005, 0.0);
        float h = mapHeight(uv);
        float hx = mapHeight(uv + e.xy);
        float hy = mapHeight(uv + e.yx);
        
        vec3 normal = normalize(vec3(h - hx, h - hy, e.x * 2.0));
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        float cosTheta = max(0.0, dot(normal, viewDir));

        // Thickness varies based on height and spatial noise
        float baseThickness = 400.0; // nm
        float thickness = baseThickness + h * 800.0 + snoise(vec3(uv * 5.0, u_time)) * 200.0;

        // Calculate structural iridescence
        vec3 color = thinFilmInterference(thickness, cosTheta);

        // Lighting/Shading
        vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
        float diff = max(0.0, dot(normal, lightDir));
        float spec = pow(max(0.0, dot(reflect(-lightDir, normal), viewDir)), 32.0);
        
        // Apply lighting to structural color
        color = color * (diff * 0.8 + 0.2) + vec3(spec * 0.8);

        // Heat injection from mouse
        float dMouse = length(uv - mouse);
        float heat = exp(-dMouse * 10.0) * u_pressed;
        vec3 lavaGlow = blackBody(heat * 1.2 + h * 0.2);
        
        // Blend iridescence with thermal bloom
        color = mix(color, lavaGlow, heat * 0.8);
        
        // Vignette
        float vignette = 1.0 - smoothstep(0.5, 1.5, length(uv));
        color *= vignette;

        fragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
        u_pressed: { value: 0.0 }
      },
      depthWrite: false,
      depthTest: false
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(plane);

    canvas.__three = { renderer, scene, camera, material };
  } catch (e) {
    console.error("Feral WebGL Initialization Failed:", e);
    return;
  }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material && material.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  
  // Smooth mouse interpolation
  const targetMouseX = mouse.x / grid.width;
  const targetMouseY = 1.0 - (mouse.y / grid.height);
  
  // Initialize mouse uniform if it's 0,0
  if (material.uniforms.u_mouse.value.x === 0 && material.uniforms.u_mouse.value.y === 0) {
    material.uniforms.u_mouse.value.set(0.5, 0.5);
  }

  // LERP mouse for organic feel
  material.uniforms.u_mouse.value.x += (targetMouseX - material.uniforms.u_mouse.value.x) * 0.1;
  material.uniforms.u_mouse.value.y += (targetMouseY - material.uniforms.u_mouse.value.y) * 0.1;
  
  // Smooth press state for thermal blooming
  const targetPress = mouse.isPressed ? 1.0 : 0.0;
  material.uniforms.u_pressed.value += (targetPress - material.uniforms.u_pressed.value) * 0.1;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);