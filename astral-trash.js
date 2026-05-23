try {
  if (!ctx) throw new Error("WebGL 2 context not available");

  // Initialize Three.js if not already present
  if (!canvas.__three) {
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    // Create a hidden 2D canvas to generate the typographic heightmap
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 1024;
    textCanvas.height = 1024;
    const tCtx = textCanvas.getContext('2d');
    
    // Fill void black
    tCtx.fillStyle = '#000000';
    tCtx.fillRect(0, 0, 1024, 1024);

    // Draw underlying sacred geometry (cymatic rings)
    tCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    tCtx.lineWidth = 2;
    for (let i = 0; i < 15; i++) {
      tCtx.beginPath();
      tCtx.arc(512, 512, i * 35 + 20, 0, Math.PI * 2);
      tCtx.stroke();
    }

    // Typography physics: Render text as a topological SDF via concentric strokes
    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'middle';
    tCtx.font = '900 160px "Arial Black", Impact, sans-serif';
    tCtx.lineJoin = 'round';

    const words = ["ASTRAL", "TRASH"];
    const yOffsets = [420, 600];

    // Build the "mountain" of the text
    for (let i = 20; i > 0; i--) {
      tCtx.lineWidth = i * 6;
      tCtx.strokeStyle = `rgba(255, 255, 255, ${0.05 + (20 - i) * 0.002})`;
      words.forEach((word, idx) => tCtx.strokeText(word, 512, yOffsets[idx]));
    }
    
    // Core bright text
    tCtx.fillStyle = '#FFFFFF';
    words.forEach((word, idx) => tCtx.fillText(word, 512, yOffsets[idx]));

    const textTexture = new THREE.CanvasTexture(textCanvas);
    textTexture.minFilter = THREE.LinearFilter;
    textTexture.magFilter = THREE.LinearFilter;

    // Fragment Shader: Feral Math & Structural Color
    const fragmentShader = `
      in vec2 vUv;
      out vec4 fragColor;

      uniform float u_time;
      uniform sampler2D u_text;
      uniform vec2 u_resolution;

      // Hash & Noise
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      // Fractional Brownian Motion (Nebula / Fluid dynamics)
      float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 6; i++) {
              v += a * noise(p);
              p *= 2.0;
              a *= 0.5;
          }
          return v;
      }

      void main() {
          // Normalize UV and aspect ratio
          vec2 uv = vUv;
          vec2 aspect_uv = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) + 0.5;

          // 3 Simultaneous Time Scales
          float t_slow = u_time * 0.05;
          float t_med  = u_time * 0.5;
          float t_fast = u_time * 8.0;

          // 1. MACROBLOCK GLITCH (Damage Aesthetics)
          float grid_size = 30.0;
          vec2 block_uv = floor(uv * grid_size) / grid_size;
          float glitch_trig = step(0.96, hash(block_uv + floor(t_med * 3.0)));
          vec2 uv_distort = uv + vec2(glitch_trig * 0.04 * sin(t_fast), 0.0);

          // 2. DOMAIN WARPING (Fluid Deformation)
          vec2 q = vec2(fbm(uv_distort * 4.0 + t_slow), fbm(uv_distort * 4.0 + vec2(1.7, 4.6) - t_slow));
          vec2 r = vec2(fbm(uv_distort * 4.0 + 4.0 * q + t_med), fbm(uv_distort * 4.0 + 4.0 * q + vec2(8.3, 2.8) - t_med));
          vec2 uv_flow = uv_distort + r * 0.06;

          // 3. KINETIC TYPE TOPOGRAPHY (Sampling text with Chroma Bleed)
          float txt_r = texture(u_text, uv_flow + vec2(0.006, 0.0)).r;
          float txt_g = texture(u_text, uv_flow).r;
          float txt_b = texture(u_text, uv_flow - vec2(0.006, 0.0)).r;
          float txt_mask = (txt_r + txt_g + txt_b) / 3.0;

          // 4. CYMATICS (Sacred Geometry Resonance)
          float dist = length(aspect_uv - vec2(0.5));
          float cymatic = sin(dist * 150.0 - t_med * 12.0) * exp(-dist * 3.5);

          // 5. THIN FILM / BRAGG REFLECTION (Structural Color)
          // Compute perceived optical thickness based on layered math
          float thickness = r.x * 1.8 + txt_mask * 2.5 + cymatic * 0.4;

          // Interference phase shift for Neon CMY palette
          vec3 cmy;
          cmy.x = 0.5 + 0.5 * cos(thickness * 3.14159 + 0.0);    // R
          cmy.y = 0.5 + 0.5 * cos(thickness * 3.14159 + 2.094);  // G
          cmy.z = 0.5 + 0.5 * cos(thickness * 3.14159 + 4.188);  // B
          cmy = 1.0 - cmy; // Invert to subtractive CMY

          // Stark quantization for brutal neon contrast
          cmy = smoothstep(0.35, 0.65, cmy);

          // 6. VOID BLACK MASKING
          float void_noise = fbm(uv_flow * 12.0 - t_slow * 3.0);
          float visibility = smoothstep(0.4, 0.6, void_noise);
          
          // The text burns through the void organically
          visibility = max(visibility, smoothstep(0.1, 0.6, txt_mask));

          vec3 final_color = cmy * visibility;

          // 7. CHROMATIC ABERRATION ON TEXT EDGES
          final_color += vec3(0.0, 1.0, 1.0) * txt_r * 0.6 * (1.0 - visibility); // Cyan fringe
          final_color += vec3(1.0, 0.0, 1.0) * txt_b * 0.6 * (1.0 - visibility); // Magenta fringe

          // 8. SENSOR DAMAGE (Micro Shimmer / Hot & Dead Pixels)
          float grain = hash(gl_FragCoord.xy + t_fast);
          float dead_pixel = step(0.985, grain);
          float hot_pixel = step(0.996, fract(grain * 12.34));

          final_color -= dead_pixel; // Punch deep black holes
          final_color += hot_pixel * vec3(1.0, 1.0, 0.0); // Inject neon yellow sparks

          fragColor = vec4(clamp(final_color, 0.0, 1.0), 1.0);
      }
    `;

    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
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

  // Update uniforms
  if (material && material.uniforms) {
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  // Render procedure
  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (err) {
  console.error("The feral math collapsed:", err);
}