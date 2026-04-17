try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
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
      uniform vec2 u_mouse;

      // --- Noise Utilities (from noise_fields) ---
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
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
        vec3 x3 = x0 - D.yyy;
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
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      vec3 curlNoise(vec3 p) {
          float e = 0.1;
          vec3 dx = vec3(e, 0.0, 0.0);
          vec3 dy = vec3(0.0, e, 0.0);
          vec3 dz = vec3(0.0, 0.0, e);
          
          float x = snoise(p + dy) - snoise(p - dy) - (snoise(p + dz) - snoise(p - dz));
          float y = snoise(p + dz) - snoise(p - dz) - (snoise(p + dx) - snoise(p - dx));
          float z = snoise(p + dx) - snoise(p - dx) - (snoise(p + dy) - snoise(p - dy));
          
          return normalize(vec3(x, y, z) + 0.001);
      }

      // --- G2 Grammar (from g2) ---
      vec3 g2PhiField(vec3 p) {
          float a = snoise(p * 2.1 + u_time * 0.25);
          float b = snoise(p * 2.7 - u_time * 0.11);
          float c = snoise(p * 3.2 + u_time * 0.32);
          return normalize(vec3(a + 0.3 * c, b - 0.25 * c, snoise(p * 2.0)));
      }

      vec3 g2DualField(vec3 p, vec3 phi) {
          return normalize(vec3(-phi.y, phi.x, cos((p.x - p.y) * 2.4 - u_time * 0.47)));
      }

      // --- Color Fields (from color_fields) ---
      vec3 cyberdelicNeon(float t) {
          vec3 a = vec3(0.04, 0.03, 0.08); 
          vec3 b = vec3(0.8, 0.5, 0.6);
          vec3 c = vec3(2.0, 1.0, 1.0);
          vec3 d = vec3(0.5, 0.2, 0.25);
          return a + b * cos(6.28318 * (c * t + d));
      }

      // --- Scene Evaluation ---
      vec3 evaluateHologram(vec2 uv) {
          // 1. AdS Geometry / Scale (from holography)
          // radial depth = scale. UV edge = high freq.
          float z = max(0.02, 1.0 - uv.y); // Boundary at top (y=1)
          vec2 p = (uv - 0.5) * 2.0;
          p.x *= u_resolution.x / u_resolution.y;
          
          // Interaction warp
          p += (u_mouse - 0.5) * 0.8;

          // Project into bulk
          vec3 bulkP = vec3(p / z, u_time * 0.15);

          // 2. Curl Advection (from noise_fields)
          vec3 flow = curlNoise(bulkP * 0.4);
          bulkP += flow * 1.8 * z; // Stronger flow deep in bulk

          // 3. G2 Fields & Torsion
          vec3 phi = g2PhiField(bulkP);
          vec3 dual = g2DualField(bulkP, phi);
          float torsion = abs(dot(phi, dual));

          // 4. Singularity & Resolution Healing
          float fracture = snoise(bulkP * 6.0 + phi * 3.0);
          float singularityMask = smoothstep(0.75, 1.0, fracture + torsion);
          
          // 5. Light-Sheet Projection (from holography)
          float lightSheet = step(0.96, fract(bulkP.y * 8.0 - u_time * 1.5));
          
          // 6. Color Mapping
          vec3 baseColor = cyberdelicNeon(torsion + flow.x * 0.3);
          vec3 scarGlow = vec3(1.0, 0.0, 0.8) * singularityMask * 2.5; 
          vec3 cyanPulse = vec3(0.0, 1.0, 0.9) * lightSheet * (1.0 - singularityMask);
          
          vec3 finalColor = baseColor + scarGlow + cyanPulse;
          
          // Fade to void at deep bulk and boundary edge
          finalColor *= smoothstep(0.0, 0.2, z) * (1.0 - smoothstep(0.7, 1.0, z));
          
          return finalColor;
      }

      void main() {
          vec2 uv = vUv;
          
          // CMYK Misregistration (from psychedelic_collage)
          float glitch = snoise(vec3(uv * 15.0, u_time)) * 0.015;
          vec2 rOffset = vec2(0.008 + glitch, 0.0);
          vec2 gOffset = vec2(-0.004, 0.006 - glitch);
          vec2 bOffset = vec2(0.0, -0.007 + glitch);
          
          float r = evaluateHologram(uv + rOffset).r;
          float g = evaluateHologram(uv + gOffset).g;
          float b = evaluateHologram(uv + bOffset).b;
          
          vec3 color = vec3(r, g, b);

          // Xerox Noise & Halftone Screen (from psychedelic_collage)
          float luma = dot(color, vec3(0.299, 0.587, 0.114));
          
          // Electrostatic grain & streaks
          float seed = dot(uv * u_resolution, vec2(12.9898, 78.233)) + u_time;
          float grain = fract(sin(seed) * 43758.5453);
          float streak = step(0.995, fract(sin(uv.x * 200.0 + u_time * 0.1) * 43758.5453));
          
          color += (grain - 0.5) * mix(0.1, 0.3, 1.0 - luma); // More grain in dark areas
          color += vec3(0.8, 0.2, 0.5) * streak * 0.5; // Acid xerox streak
          
          // Halftone dots (45 degree screen)
          float angle = 0.785398; 
          mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
          vec2 gridUV = rot * uv * u_resolution.x / 4.0;
          vec2 cell = fract(gridUV) - 0.5;
          float dotDist = length(cell);
          float dotRadius = sqrt(luma) * 0.65;
          float halftone = smoothstep(dotRadius + 0.15, dotRadius - 0.15, dotDist);
          
          // Ink Bleed / Multiply blend
          color = mix(color * 0.2, color * 1.8, halftone);
          
          // Vignette (from color_fields)
          float vignette = 1.0 - smoothstep(0.4, 1.5, length(uv - 0.5) * 2.0);
          color *= vignette;

          fragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0, 0) }
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;
  
  if (material && material.uniforms) {
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
    if (material.uniforms.u_mouse) material.uniforms.u_mouse.value.set(mouse.x / grid.width, 1.0 - mouse.y / grid.height);
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (err) {
  console.error("Feral WebGL Error:", err);
}