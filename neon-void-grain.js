try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
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
      uniform vec2 u_resolution;

      // ─── HASH & NOISE UTILS ──────────────────────────────────────────────
      vec2 hash22(vec2 p) {
        p = fract(p * vec2(443.897, 441.423));
        p += dot(p, p.yx + 19.19);
        return fract(vec2(p.x * p.y, p.x + p.y));
      }

      float hash12(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash12(i);
        float b = hash12(i + vec2(1.0, 0.0));
        float c = hash12(i + vec2(0.0, 1.0));
        float d = hash12(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float f = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
          f += amp * noise(p);
          p *= 2.0;
          amp *= 0.5;
        }
        return f;
      }

      // ─── TESSELLATION: P6M SYMMETRY FOLD ────────────────────────────────
      vec2 foldP6m(vec2 p) {
        const float sqrt3 = 1.73205080757;
        p = abs(p);
        if (p.y > p.x * sqrt3) p = vec2(p.x * sqrt3 + p.y, p.x - p.y * sqrt3) * 0.5;
        p = abs(p);
        if (p.y > p.x * sqrt3) p = vec2(p.x * sqrt3 + p.y, p.x - p.y * sqrt3) * 0.5;
        return abs(p);
      }

      // ─── MORPHOGENESIS: CHEBYSHEV VORONOI CHAMBERS ──────────────────────
      float voronoi(vec2 x, float t) {
        vec2 n = floor(x);
        vec2 f = fract(x);
        float m = 8.0;
        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash22(n + g);
            o = 0.5 + 0.5 * sin(t + 6.2831 * o); // Mitosis oscillation
            vec2 r = g - f + o;
            float d = max(abs(r.x), abs(r.y)); // Chebyshev distance for crystalline tech look
            if (d < m) m = d;
          }
        }
        return m;
      }

      // ─── CORE MATERIAL FIELD ────────────────────────────────────────────
      float heightMap(vec2 uv, float t_slow, float t_med, float t_fast) {
        // 1. Tectonic Domain Warp (Slow drift)
        vec2 warp = vec2(fbm(uv * 2.0 + t_slow), fbm(uv * 2.0 - t_slow + 4.2));
        vec2 p = uv * 3.0 + warp * 1.5;

        // 2. Bismuth Hopper Crystallization (Medium motion)
        float h = 0.0;
        float amp = 1.0;
        vec2 p_fold = p;
        for (int i = 0; i < 4; i++) {
          p_fold = foldP6m(p_fold * 1.6 + t_med * 0.1);
          p_fold -= vec2(0.4, 0.2);
          float d = max(abs(p_fold.x), abs(p_fold.y));
          h += (sin(d * 30.0) * 0.5 + 0.5) * amp; // Terracing effect
          amp *= 0.5;
        }

        // 3. Biotech Chambers (Medium motion)
        float v = voronoi(p * 2.0 - warp, t_med);
        h = mix(h, v, 0.35);

        // 4. Ulexite Fiber-optic Chatoyancy (Fast shimmer)
        float fibers = sin(p_fold.x * 300.0 + t_fast) * sin(p_fold.y * 300.0 - t_fast);
        h += fibers * 0.025;

        // 5. Photocopy Scanline Glitch (Fast)
        float glitch = step(0.99, hash12(vec2(uv.y * 5.0, t_fast))) * 0.08;
        h -= glitch;

        return h;
      }

      // ─── CYBERDELIC NEON COLOR MAPPING ──────────────────────────────────
      vec3 mapColor(float band) {
        vec3 voidBlack = vec3(0.015, 0.023, 0.031);
        vec3 neonCyan  = vec3(0.000, 1.000, 0.941);
        vec3 elecMag   = vec3(1.000, 0.000, 0.800);
        vec3 acidYel   = vec3(1.000, 0.910, 0.000);

        band = fract(band);

        // Screenprint-style harsh posterized thresholds
        vec3 col = voidBlack;
        col = mix(col, neonCyan, smoothstep(0.05, 0.07, band) * (1.0 - smoothstep(0.25, 0.27, band)));
        col = mix(col, elecMag,  smoothstep(0.35, 0.37, band) * (1.0 - smoothstep(0.55, 0.57, band)));
        col = mix(col, acidYel,  smoothstep(0.65, 0.67, band) * (1.0 - smoothstep(0.85, 0.87, band)));

        return col;
      }

      void main() {
        vec2 uv = vUv;
        // Aspect correction to preserve sacred geometry angles
        uv.x *= u_resolution.x / u_resolution.y;

        // Time Scales
        float t_slow = u_time * 0.04;
        float t_med  = u_time * 0.15;
        float t_fast = u_time * 1.2;

        // Glitch Databend: Horizontal tear
        float tear = step(0.995, sin(uv.y * 150.0 + t_fast * 5.0));
        uv.x += tear * 0.05;

        // Compute base height and finite-difference normals
        vec2 eps = vec2(0.003, 0.0);
        float h  = heightMap(uv, t_slow, t_med, t_fast);
        float hx = heightMap(uv + eps.xy, t_slow, t_med, t_fast);
        float hy = heightMap(uv + eps.yx, t_slow, t_med, t_fast);

        vec3 normal = normalize(vec3(hx - h, hy - h, 0.015));
        vec3 view = normalize(vec3(0.0, 0.0, 1.0));
        float fresnel = pow(1.0 - max(dot(normal, view), 0.0), 2.5);

        // Thin-film Interference Banding
        float baseBand = h * 4.0 + fresnel * 3.0 - t_med * 1.5;

        // CMYK Misregistration / Chromatic Aberration
        float r = mapColor(baseBand + 0.04).r;
        float g = mapColor(baseBand).g;
        float b = mapColor(baseBand - 0.04).b;
        vec3 finalCol = vec3(r, g, b);

        // Specular Highlight (Kajiya-Kay Anisotropy on fibers)
        vec3 lightDir = normalize(vec3(sin(t_slow), cos(t_slow), 1.0));
        float spec = pow(max(dot(reflect(-lightDir, normal), view), 0.0), 24.0);
        finalCol += spec * vec3(0.7, 0.9, 1.0) * fresnel;

        // Emissive Cavity Glow (Acid pooling in cracks)
        float cavity = smoothstep(0.4, 0.0, h);
        
        // Halftone Screen Artifact over the glow
        vec2 screenUv = vUv * u_resolution * 0.25;
        float dotPattern = sin(screenUv.x) * sin(screenUv.y);
        float halftone = smoothstep(0.0, 0.2, cavity - dotPattern * 0.5);
        finalCol += vec3(1.0, 0.0, 0.8) * halftone * 0.8;

        // Paper/Film Grain Overlay
        float grain = hash12(vUv * 1000.0 + t_fast);
        finalCol += (grain - 0.5) * 0.18;

        // Deep Vignette
        float vig = length(vUv - 0.5);
        finalCol *= smoothstep(0.85, 0.25, vig);

        fragColor = vec4(finalCol, 1.0);
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
  }

  const { renderer, scene, camera, material } = canvas.__three;

  if (material && material.uniforms) {
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("WebGL Initialization or Render Failed:", e);
}