try {
  // --- DEFENSIVE WEBGL2 INITIALIZATION ---
  if (!canvas.__three) {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false });
    if (!gl) throw new Error("WebGL 2 not supported or context occupied");

    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: false });
    const scene = new THREE.Scene();
    
    // Using a simple Orthographic camera for a full-screen shader quad
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    // --- THE WEIRD MECHANISM: CYMATIC DITHER-DRIFT ---
    // This shader fuses all 4 repos:
    // 1. vibration: Chladni plate modal analysis math (eigenfrequencies).
    // 2. shoegaze_style: Phase drift, moiré interference, halation, chromatic aberration, dissolving edges.
    // 3. pixel_voxel: Bayer 4x4 ditherpunk quantization, stable pixel grid lock.
    // 4. lisa_frank_aesthetic: Hyper-saturated neon color mapping.
    
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
      
      // --- REPO: shoegaze_style (lexicon/tokens) ---
      // "phase drift ripples", "edges dissolving into haze"
      vec2 phaseWarp(vec2 uv, float amount) {
          float wx = sin(uv.y * 12.0 + u_time * 1.5) * amount;
          float wy = cos(uv.x * 12.0 - u_time * 1.5) * amount;
          return uv + vec2(wx, wy);
      }
      
      // --- REPO: lisa_frank_aesthetic ---
      // "hyper-saturated, neon, rainbow"
      vec3 lisaFrankPalette(float v) {
          v = clamp(v, 0.0, 1.0);
          vec3 c1 = vec3(0.08, 0.0, 0.15); // Deep Trapper-Keeper Space
          vec3 c2 = vec3(0.5, 0.0, 0.8);   // Neon Violet
          vec3 c3 = vec3(1.0, 0.0, 0.6);   // Hot Pink
          vec3 c4 = vec3(0.0, 1.0, 1.0);   // Cyan
          vec3 c5 = vec3(1.0, 1.0, 0.0);   // Yellow
          
          if (v < 0.25) return mix(c1, c2, v * 4.0);
          if (v < 0.50) return mix(c2, c3, (v - 0.25) * 4.0);
          if (v < 0.75) return mix(c3, c4, (v - 0.50) * 4.0);
          return mix(c4, c5, (v - 0.75) * 4.0);
      }
      
      // --- REPO: vibration (chladni/modal_analysis.md) ---
      // Eigenmodes for square plates: sin(m*pi*x)*sin(n*pi*y)
      float chladni(vec2 uv, float m, float n) {
          vec2 p = uv * 2.0 - 1.0;
          float pi = 3.14159265;
          // Injecting shoegaze temporal echo bands
          float phase = u_time * 2.5; 
          float t1 = sin(m * pi * p.x + phase) * sin(n * pi * p.y - phase);
          float t2 = sin(n * pi * p.x - phase) * sin(m * pi * p.y + phase);
          return t1 + t2;
      }
      
      // Core signal generator combining vibration and shoegaze interference
      float getSignal(vec2 uv) {
          // Autonomous drift if mouse is idle, otherwise driven by user
          float targetM = 2.0 + (u_mouse.x / u_resolution.x) * 8.0;
          float targetN = 3.0 + (u_mouse.y / u_resolution.y) * 8.0;
          float mx = mix(3.0 + 2.0 * sin(u_time * 0.4), targetM, step(0.01, u_mouse.x));
          float ny = mix(4.0 + 2.0 * cos(u_time * 0.3), targetN, step(0.01, u_mouse.y));
          
          // "moire interference shimmer"
          float moire = sin(uv.x * 120.0 + u_time) * sin(uv.y * 125.0 - u_time) * 0.15;
          
          float c = chladni(uv, mx, ny);
          
          // Sand collects at nodes (where amplitude is near 0)
          float node = 1.0 - smoothstep(0.0, 0.35, abs(c + moire));
          
          // "film grain clumps"
          float grain = fract(sin(dot(uv, vec2(12.9898, 78.233)) + u_time) * 43758.5453);
          
          return node + grain * 0.15;
      }

      void main() {
          // --- REPO: pixel_voxel (pipelines/ai_to_pixel_shader.yaml) ---
          // 1. Stable Pixel Grid Lock
          vec2 virtualRes = vec2(180.0, 180.0 * (u_resolution.y / u_resolution.x));
          
          // 2. Phase Warp (Shoegaze) applied BEFORE grid lock so the pixel grid stays stable
          // while the underlying physical simulation melts.
          vec2 warpedUV = phaseWarp(vUv, 0.02);
          vec2 gridUV = floor(warpedUV * virtualRes) / virtualRes;
          
          // 3. Bayer 4x4 Ordered Dithering Matrix
          const float bayer4[16] = float[16](
              0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
              12.0/16.0, 4.0/16.0, 14.0/16.0, 6.0/16.0,
              3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
              15.0/16.0, 7.0/16.0, 13.0/16.0, 5.0/16.0
          );
          int bx = int(mod(abs(gridUV.x * virtualRes.x), 4.0));
          int by = int(mod(abs(gridUV.y * virtualRes.y), 4.0));
          float dither = bayer4[by * 4 + bx] - 0.5;
          
          // Vignette: "edges dissolving into haze"
          float dist = length(gridUV - 0.5) * 2.0;
          float vignette = 1.0 - smoothstep(0.3, 1.3, dist);
          
          // --- REPO: shoegaze_style (lexicon/camera.json) ---
          // "subtle chromatic aberration" -> sampling the field 3 times with offsets
          float ca = 0.012; 
          float rSig = getSignal(gridUV + vec2(ca, 0.0)) * vignette;
          float gSig = getSignal(gridUV) * vignette;
          float bSig = getSignal(gridUV - vec2(ca, 0.0)) * vignette;
          
          // 4. Quantize with dither (Ditherpunk)
          float steps = 5.0;
          float rQ = floor((rSig + dither * 0.45) * steps) / (steps - 1.0);
          float gQ = floor((gSig + dither * 0.45) * steps) / (steps - 1.0);
          float bQ = floor((bSig + dither * 0.45) * steps) / (steps - 1.0);
          
          // 5. Map to Lisa Frank Palette
          vec3 rCol = lisaFrankPalette(rQ);
          vec3 gCol = lisaFrankPalette(gQ);
          vec3 bCol = lisaFrankPalette(bQ);
          
          // Composite the chromatic bleed
          vec3 finalColor = vec3(rCol.r, gCol.g, bCol.b);
          
          // 6. Halation Bloom: Add back a soft, unquantized bleed over the strict pixel grid
          vec3 bloom = lisaFrankPalette(gSig) * smoothstep(0.4, 1.0, gSig) * 0.4;
          finalColor += bloom;
          
          fragColor = vec4(finalColor, 1.0);
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
      depthWrite: false,
      depthTest: false
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  // Safely update uniforms
  if (material?.uniforms) {
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
    
    // Smoothly track mouse or drift autonomously
    if (mouse.isPressed) {
      material.uniforms.u_mouse.value.set(mouse.x, mouse.y);
    } else {
      // Return to 0,0 slowly to let the autonomous Lissajous curve take over
      material.uniforms.u_mouse.value.lerp(new THREE.Vector2(0, 0), 0.05);
    }
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (err) {
  console.error("Feral generation aborted. The system could not contain the resonance.", err);
}