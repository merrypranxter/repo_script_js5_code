if (!canvas.__three) {
  try {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) throw new Error("WebGL 2 not supported or context occupied");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        // Bypass matrices for a perfect full-screen quad
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `;

    const fragmentShader = `
      in vec2 vUv;
      out vec4 fragColor;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;

      // REPO GENOME: psychedelic_collage (Palettes: Cyberdelic Neon & Occult Jewel)
      vec3 VOID_BLACK = vec3(0.015, 0.023, 0.031);
      vec3 NEON_CYAN = vec3(0.0, 1.0, 0.941);
      vec3 ELEC_MAGENTA = vec3(1.0, 0.0, 0.8);
      vec3 ACID_LIME = vec3(0.69, 1.0, 0.0);
      vec3 ALCHEMICAL_GOLD = vec3(0.788, 0.658, 0.298);

      // Procedural noise for Lycopodium powder simulation
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      // REPO GENOME: tessellations (p6m symmetry fold / kaleidoscope)
      vec2 kaleidoscope(vec2 uv, float folds) {
          float angle = atan(uv.y, uv.x);
          float radius = length(uv);
          float sector = 6.2831853 / folds;
          angle = mod(angle, sector);
          if (angle > sector * 0.5) angle = sector - angle;
          return vec2(cos(angle), sin(angle)) * radius;
      }

      // REPO GENOME: vibration (Chladni Plate Wave Equation)
      float chladni(vec2 p, float m, float n) {
          float w1 = sin(m * 3.14159 * p.x) * sin(n * 3.14159 * p.y);
          float w2 = sin(n * 3.14159 * p.x) * sin(m * 3.14159 * p.y);
          return w1 + w2;
      }

      float evaluatePattern(vec2 uv, float offset) {
          // Slow rotation over time
          float rot = u_time * 0.05 + offset * 2.0;
          mat2 mRot = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
          vec2 p = mRot * uv;
          
          // REPO GENOME: tessellations (Hyperbolic Poincaré disk compression)
          float rad = length(p);
          float disk_radius = 1.2;
          if (rad < disk_radius) {
              p = p / (1.0 - pow(rad/disk_radius, 2.0) * 0.9);
          }
          
          // 6-fold radial symmetry (Hexagonal tessellation base)
          p = kaleidoscope(p, 6.0);
          
          // REPO GENOME: vibration (Cymatic fluid displacement / Faraday waves)
          float warp = sin(length(p) * 12.0 - u_time * 2.0);
          p += warp * 0.02;
          
          // Scale coordinates for the "plate"
          vec2 plate = p * 4.0;
          
          // Dynamic Modal Indices driven by interaction (m, n)
          float m_idx = 1.0 + u_mouse.x * 6.0;
          float n_idx = 1.0 + u_mouse.y * 6.0;
          
          float w = chladni(plate, m_idx, n_idx);
          
          // Particle aggregation at nodal lines (sand collects where amplitude is 0)
          float sand = smoothstep(0.15 + offset, 0.0, abs(w));
          
          // Add fine Lycopodium powder detail
          float dust = hash(p * 50.0 + u_time);
          sand *= 0.6 + 0.4 * dust;
          
          return clamp(sand, 0.0, 1.0);
      }

      void main() {
          vec2 uv = vUv * 2.0 - 1.0;
          uv.x *= u_resolution.x / u_resolution.y;
          
          // REPO GENOME: psychedelic_collage (CMYK Misregistration / Chromatic Aberration)
          float shift = 0.008 + length(uv) * 0.01;
          
          float r = evaluatePattern(uv, shift);
          float g = evaluatePattern(uv, 0.0);
          float b = evaluatePattern(uv, -shift);
          
          // Cyberdelic Neon Composite (Additive Screen Blend)
          vec3 color = VOID_BLACK;
          color = vec3(1.0) - (vec3(1.0) - color) * (vec3(1.0) - r * ELEC_MAGENTA);
          color = vec3(1.0) - (vec3(1.0) - color) * (vec3(1.0) - g * ACID_LIME);
          color = vec3(1.0) - (vec3(1.0) - color) * (vec3(1.0) - b * NEON_CYAN);
          
          // Glowing Occult Core pulsing at Schumann Resonance (7.83 Hz)
          float core = exp(-length(uv) * 4.0);
          color += ALCHEMICAL_GOLD * core * (0.3 + 0.2 * sin(u_time * 7.83));
          
          // REPO GENOME: psychedelic_collage (Halftone Screen Print Artifact)
          float luma = dot(color, vec3(0.299, 0.587, 0.114));
          vec2 ht_uv = gl_FragCoord.xy * 0.25;
          mat2 rot45 = mat2(0.707, -0.707, 0.707, 0.707);
          vec2 cell = fract(rot45 * ht_uv) - 0.5;
          float dot_radius = luma * 0.8; 
          float halftone = smoothstep(dot_radius + 0.1, dot_radius - 0.05, length(cell));
          color = color * halftone * 1.5; // Emissive ink effect
          
          // Xerox Noise / Film Grain
          float grain = hash(uv * 100.0 + fract(u_time));
          color += vec3(grain * 0.1);
          
          // CRT Scanlines
          float scanline = sin(vUv.y * u_resolution.y * 0.5) * 0.04;
          color -= scanline;
          
          // Vignette
          float vig = length(vUv - 0.5) * 2.0;
          color *= smoothstep(1.5, 0.5, vig);
          
          fragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
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

if (material?.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  
  let targetX = mouse.x / grid.width;
  let targetY = 1.0 - (mouse.y / grid.height);
  
  // Auto-wander simulating a frequency sweep if untouched
  if (mouse.x === 0 && mouse.y === 0) {
    targetX = 0.5 + Math.sin(time * 0.3) * 0.4;
    targetY = 0.5 + Math.cos(time * 0.2) * 0.4;
  }
  
  // Smoothly interpolate the modal indices (m, n) for fluid cymatic transitions
  material.uniforms.u_mouse.value.x += (targetX - material.uniforms.u_mouse.value.x) * 0.05;
  material.uniforms.u_mouse.value.y += (targetY - material.uniforms.u_mouse.value.y) * 0.05;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);