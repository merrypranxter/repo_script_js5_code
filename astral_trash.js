try {
  if (!ctx) throw new Error("WebGL 2 context not available");

  if (!canvas.__three) {
    // --- TEXT TEXTURE GENERATION (ASTRAL TRASH) ---
    // We create a hidden canvas to draw the text, using RGB channels to store different structural data.
    // R = Solid Core (High magnetic field)
    // G = Blurred Halo (Magnetic gradient / Advection pull)
    // B = Sacred Geometry & Stroke (Faraday wave interference lattice)
    const tCanvas = document.createElement('canvas');
    tCanvas.width = 1024;
    tCanvas.height = 1024;
    const tCtx = tCanvas.getContext('2d');
    
    tCtx.fillStyle = '#000000';
    tCtx.fillRect(0, 0, 1024, 1024);
    tCtx.globalCompositeOperation = 'lighter'; // Additive blending for pure channel separation
    
    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'middle';
    tCtx.font = '900 160px Impact, sans-serif';
    
    const cx = 512;
    const cy = 512;
    const y1 = cy - 80;
    const y2 = cy + 80;

    // GREEN CHANNEL: Magnetic Halo
    tCtx.shadowColor = '#00FF00';
    tCtx.shadowBlur = 60;
    tCtx.fillStyle = '#00FF00';
    tCtx.fillText('ASTRAL', cx, y1);
    tCtx.fillText('TRASH', cx, y2);
    
    // RED CHANNEL: Solid Core
    tCtx.shadowBlur = 0;
    tCtx.fillStyle = '#FF0000';
    tCtx.fillText('ASTRAL', cx, y1);
    tCtx.fillText('TRASH', cx, y2);
    
    // BLUE CHANNEL: Structural Geometry & Strokes
    tCtx.strokeStyle = '#0000FF';
    tCtx.lineWidth = 6;
    tCtx.strokeText('ASTRAL', cx, y1);
    tCtx.strokeText('TRASH', cx, y2);
    
    // Geometric framing
    tCtx.beginPath();
    tCtx.arc(cx, cy, 380, 0, Math.PI * 2);
    tCtx.stroke();
    tCtx.beginPath();
    tCtx.arc(cx, cy, 400, 0, Math.PI * 2);
    tCtx.setLineDash([10, 15]);
    tCtx.stroke();
    tCtx.setLineDash([]);
    
    // Crosshairs and nodes
    tCtx.lineWidth = 2;
    tCtx.moveTo(cx, 50); tCtx.lineTo(cx, 974);
    tCtx.moveTo(50, cy); tCtx.lineTo(974, cy);
    tCtx.stroke();
    
    const textTexture = new THREE.CanvasTexture(tCanvas);
    textTexture.minFilter = THREE.LinearFilter;
    textTexture.magFilter = THREE.LinearFilter;
    textTexture.wrapS = THREE.ClampToEdgeWrapping;
    textTexture.wrapT = THREE.ClampToEdgeWrapping;

    // --- WEBGL SETUP ---
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

    // The Feral Mechanism:
    // A procedural material combining Rosensweig ferrofluid spikes, Gray-Scott advection, 
    // and Kuramoto phase-coupled oscillators. The text acts as a complex magnetic Halbach array.
    const fragmentShader = `
      in vec2 vUv;
      out vec4 fragColor;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_text;

      #define PI 3.14159265359

      // Hash and Noise for organic mechanics
      float hash21(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 19.19);
          return fract(p.x * p.y);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
              mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
              mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
              u.y
          );
      }

      float fbm(vec2 p) {
          return noise(p) + 0.5 * noise(p * 2.0) + 0.25 * noise(p * 4.0);
      }

      // Divergence-free curl noise (Advection-Diffusion fluid flow)
      vec2 curl(vec2 p, float t) {
          float e = 0.01;
          float dx = fbm(p + vec2(e, 0.0) + t) - fbm(p - vec2(e, 0.0) + t);
          float dy = fbm(p + vec2(0.0, e) + t) - fbm(p - vec2(0.0, e) + t);
          return vec2(dy, -dx) / (2.0 * e);
      }

      // Hexagonal Lattice (Rosensweig instability geometry)
      vec4 hex_coords(vec2 uv) {
          vec2 r = vec2(1.0, 1.73205081);
          vec2 h = r * 0.5;
          vec2 a = mod(uv, r) - h;
          vec2 b = mod(uv - h, r) - h;
          vec2 gv = dot(a, a) < dot(b, b) ? a : b;
          vec2 id = uv - gv;
          return vec4(gv.x, gv.y, id.x, id.y); // xy = local center dist, zw = cell ID
      }

      void main() {
          // Time scales
          float t_slow = u_time * 0.15;
          float t_med  = u_time * 0.8;
          float t_fast = u_time * 3.5;

          // Aspect ratio correction
          vec2 uv = vUv;
          vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
          vec2 st = (uv - 0.5) * aspect + 0.5;

          // Sample Text Manifold (The Magnetic Field Map)
          // Scale UVs slightly so the text fits nicely
          vec2 textUv = (st - 0.5) * 1.1 + 0.5;
          vec4 tData = texture(u_text, textUv);
          
          float coreField = tData.r;   // Solid text
          float haloPull  = tData.g;   // Blurred aura
          float geomGrid  = tData.b;   // Wireframe / Geometry

          // 1. Slow Global Drift: Advection flow perturbed by the text's halo
          vec2 flow = curl(st * 4.0, t_slow);
          vec2 warped_st = st + flow * 0.04 * (1.0 + haloPull * 2.0);

          // 2. Medium Structural Motion: Ferrofluid Hex Lattice
          // The grid density increases where the magnetic field (core) is stronger
          float gridScale = 60.0 + coreField * 20.0;
          vec4 hex = hex_coords(warped_st * gridScale);
          float cellDist = length(hex.xy);
          vec2 cellId = hex.zw;

          // Calculate Magnetic Pressure (B)
          // Base field + Text Halbach array + Flow turbulence
          float B = 0.3 + coreField * 2.5 + geomGrid * 1.2 + fbm(warped_st * 8.0 - t_slow) * 0.5;

          // Rosensweig Spike Height Profile
          // High surface tension outside text (fat/flat), sharp inside (needles)
          float sharpness = 4.0 + coreField * 6.0;
          float spike = B * exp(-cellDist * sharpness);

          // 3. Fast Detail Shimmer: Kuramoto Phase Oscillators
          // Each hex cell has a natural frequency, phase-locked by the text core
          float naturalFreq = hash21(cellId) * 6.283;
          float phase = naturalFreq + t_fast * (1.0 + coreField * 1.5 - geomGrid * 0.5);
          float shimmer = pow(sin(phase) * 0.5 + 0.5, 8.0); // Sharp, firefly-like flashes

          // --- COLOR SYNTHESIS (Void Black + Neon CMY) ---
          vec3 voidBlack = vec3(0.02, 0.01, 0.04);
          vec3 neonCyan  = vec3(0.0, 0.95, 1.0);
          vec3 neonMag   = vec3(1.0, 0.0, 0.5);
          vec3 neonYel   = vec3(1.0, 0.9, 0.0);

          vec3 col = voidBlack;

          // Map spike height to Cyan (base fluid) and Magenta (peaks)
          col = mix(col, neonCyan, smoothstep(0.1, 0.7, spike));
          col = mix(col, neonMag, smoothstep(0.6, 1.5, spike));

          // Sacred Geometry Outline acts as a Faraday wave interference boundary
          float faraday = sin(cellId.x * 12.0 + t_med) * sin(cellId.y * 12.0 - t_med);
          col += neonMag * geomGrid * max(0.0, faraday) * 1.5;

          // Kuramoto Shimmer applied to the spike tips
          col += neonYel * shimmer * smoothstep(0.3, 1.0, spike) * (0.5 + coreField);

          // Deep Gray-Scott Advection Veins (bioluminescent under-glow)
          float vein = smoothstep(0.75, 1.0, fbm(warped_st * 12.0 + t_slow * 2.0));
          col += neonCyan * vein * 0.4 * (1.0 - coreField);

          // Vignette and Depth
          float vig = length(vUv - 0.5);
          col *= 1.0 - smoothstep(0.4, 0.8, vig);

          fragColor = vec4(col, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_text: { value: textTexture }
      },
      vertexShader,
      fragmentShader,
      depthWrite: false,
      depthTest: false
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material, textTexture };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  // Safe uniform update
  if (material && material.uniforms) {
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("WebGL Initialization or Render Failed:", e);
}