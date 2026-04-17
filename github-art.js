try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL 2 context not available");

    // Initialize THREE WebGLRenderer using the provided context
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      context: ctx,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(1); // Force 1:1 for simulation stability
    renderer.setSize(grid.width, grid.height, false);

    // Setup Ping-Pong Render Targets for Gray-Scott Reaction-Diffusion
    // Using FloatType for precision, falling back to HalfFloat if needed
    const type = renderer.capabilities.isWebGL2 ? THREE.FloatType : THREE.HalfFloatType;
    const rtOptions = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: type,
      depthBuffer: false,
      stencilBuffer: false
    };

    const simRes = 512; // Simulation resolution
    const targetA = new THREE.WebGLRenderTarget(simRes, simRes, rtOptions);
    const targetB = new THREE.WebGLRenderTarget(simRes, simRes, rtOptions);

    // Camera for rendering full-screen quads
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);

    // --- SIMULATION SHADER (Gray-Scott + Quasicrystal Modulator) ---
    // Injecting 5-fold aperiodic order into the reaction kinetics
    const simMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_state: { value: null },
        u_res: { value: new THREE.Vector2(simRes, simRes) },
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
        u_mouse_pressed: { value: false },
        u_time: { value: 0 },
        u_init: { value: 1.0 } // 1.0 on first frame to seed
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D u_state;
        uniform vec2 u_res;
        uniform vec2 u_mouse;
        uniform bool u_mouse_pressed;
        uniform float u_time;
        uniform float u_init;

        in vec2 vUv;
        out vec4 fragColor;

        // Karl Sims 9-point Laplacian
        vec2 laplacian(vec2 uv, vec2 texel) {
          vec2 sum = vec2(0.0);
          sum += texture(u_state, uv + vec2(-1.0, 0.0) * texel).rg * 0.2;
          sum += texture(u_state, uv + vec2( 1.0, 0.0) * texel).rg * 0.2;
          sum += texture(u_state, uv + vec2( 0.0,-1.0) * texel).rg * 0.2;
          sum += texture(u_state, uv + vec2( 0.0, 1.0) * texel).rg * 0.2;
          sum += texture(u_state, uv + vec2(-1.0,-1.0) * texel).rg * 0.05;
          sum += texture(u_state, uv + vec2( 1.0,-1.0) * texel).rg * 0.05;
          sum += texture(u_state, uv + vec2(-1.0, 1.0) * texel).rg * 0.05;
          sum += texture(u_state, uv + vec2( 1.0, 1.0) * texel).rg * 0.05;
          sum -= texture(u_state, uv).rg * 1.0;
          return sum;
        }

        // 5-fold Quasicrystal field to warp the reaction
        float quasicrystal(vec2 p) {
          float sum = 0.0;
          for(float i = 0.0; i < 5.0; i++) {
            float theta = i * 3.14159265359 * 0.2 + (u_time * 0.05);
            vec2 dir = vec2(cos(theta), sin(theta));
            sum += cos(dot(p, dir));
          }
          return sum;
        }

        void main() {
          vec2 texel = 1.0 / u_res;
          vec2 state = texture(u_state, vUv).rg;
          float u = state.r;
          float v = state.g;

          // Initial Seed: Aperiodic Lisa Frank Infection
          if (u_init > 0.5) {
             u = 1.0;
             v = 0.0;
             float dist = length(vUv - vec2(0.5));
             float qSeed = quasicrystal(vUv * 100.0);
             if (dist < 0.1 || qSeed > 3.5) {
               v = 1.0;
             }
             fragColor = vec4(u, v, 0.0, 1.0);
             return;
          }

          vec2 lap = laplacian(vUv, texel);
          float reaction = u * v * v;

          // Modulate feed (F) based on quasicrystal geometry
          // Creates Penrose-like zones of life and death
          float q = quasicrystal(vUv * 40.0);
          float F = 0.030 + (q * 0.008); // Base: Turing Spots -> Chaotic
          float k = 0.061;               // Mitosis / U-Skate boundary

          float du = 1.0 * lap.r - reaction + F * (1.0 - u);
          float dv = 0.5 * lap.g + reaction - (F + k) * v;

          // Mouse Injection (Drawing with neon acid)
          if (u_mouse_pressed) {
            float mDist = length(vUv - u_mouse);
            if (mDist < 0.015) {
              v += 0.5;
              u -= 0.5;
            }
          }

          fragColor = vec4(clamp(u + du, 0.0, 1.0), clamp(v + dv, 0.0, 1.0), 0.0, 1.0);
        }
      `
    });

    // --- DISPLAY SHADER (Lisa Frank Acid Palette + CMYK Print Glitch) ---
    const displayMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_texture: { value: null },
        u_time: { value: 0 },
        u_res: { value: new THREE.Vector2(grid.width, grid.height) }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D u_texture;
        uniform float u_time;
        uniform vec2 u_res;

        in vec2 vUv;
        out vec4 fragColor;

        // Hash for photocopy grain
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          // CMYK Misregistration (Acid Poster Artifact)
          // Pulsing offset based on time
          float offsetAmt = 0.002 + sin(u_time * 2.0) * 0.001;
          vec2 dirR = vec2(offsetAmt, 0.0);
          vec2 dirG = vec2(-offsetAmt * 0.5, offsetAmt * 0.866);
          vec2 dirB = vec2(-offsetAmt * 0.5, -offsetAmt * 0.866);

          float v_r = texture(u_texture, vUv + dirR).g;
          float v_g = texture(u_texture, vUv + dirG).g;
          float v_b = texture(u_texture, vUv + dirB).g;
          float v_base = texture(u_texture, vUv).g;

          // Lisa Frank Cyberdelic Palette
          vec3 voidBlack = vec3(0.01, 0.02, 0.05);
          vec3 neonCyan = vec3(0.0, 1.0, 0.94);
          vec3 hotMagenta = vec3(1.0, 0.0, 0.8);
          vec3 acidLime = vec3(0.67, 1.0, 0.0);
          vec3 lemonZap = vec3(1.0, 0.9, 0.0);

          // Build color via layered thresholding / mixing
          vec3 color = voidBlack;
          
          // Outer halo (Cyan)
          color = mix(color, neonCyan, smoothstep(0.1, 0.3, v_b));
          // Mid body (Magenta)
          color = mix(color, hotMagenta, smoothstep(0.2, 0.6, v_g));
          // Core (Lime/Yellow)
          color = mix(color, acidLime, smoothstep(0.5, 0.8, v_r));
          color = mix(color, lemonZap, smoothstep(0.7, 1.0, v_base));

          // Photocopy Noise / Zine Grain
          float grain = hash(vUv * u_time) * 0.15;
          color += grain;

          // Vignette
          float dist = distance(vUv, vec2(0.5));
          color *= smoothstep(0.8, 0.2, dist);

          fragColor = vec4(color, 1.0);
        }
      `
    });

    const simScene = new THREE.Scene();
    simScene.add(new THREE.Mesh(geometry, simMaterial));

    const displayScene = new THREE.Scene();
    displayScene.add(new THREE.Mesh(geometry, displayMaterial));

    canvas.__three = {
      renderer,
      simScene,
      displayScene,
      simMaterial,
      displayMaterial,
      targetA,
      targetB,
      camera,
      simRes,
      frameCount: 0
    };
  }

  const t = canvas.__three;
  
  // Handle resize gracefully
  if (t.renderer.getSize(new THREE.Vector2()).x !== grid.width) {
    t.renderer.setSize(grid.width, grid.height, false);
    t.displayMaterial.uniforms.u_res.value.set(grid.width, grid.height);
  }

  // Update Simulation Uniforms
  t.simMaterial.uniforms.u_time.value = time;
  // Map mouse coordinates to UV space (0 to 1)
  t.simMaterial.uniforms.u_mouse.value.set(
    mouse.x / grid.width,
    1.0 - (mouse.y / grid.height) // Invert Y for WebGL
  );
  t.simMaterial.uniforms.u_mouse_pressed.value = mouse.isPressed;
  
  // Seed on first frame, then turn off
  t.simMaterial.uniforms.u_init.value = t.frameCount === 0 ? 1.0 : 0.0;

  // Run multiple simulation steps per frame for faster growth
  const stepsPerFrame = 12;
  for (let i = 0; i < stepsPerFrame; i++) {
    // Ping
    t.simMaterial.uniforms.u_state.value = t.targetA.texture;
    t.renderer.setRenderTarget(t.targetB);
    t.renderer.render(t.simScene, t.camera);
    // Pong
    t.simMaterial.uniforms.u_state.value = t.targetB.texture;
    t.renderer.setRenderTarget(t.targetA);
    t.renderer.render(t.simScene, t.camera);
  }

  // Render to Screen
  t.renderer.setRenderTarget(null); // Back to canvas
  t.displayMaterial.uniforms.u_texture.value = t.targetA.texture;
  t.displayMaterial.uniforms.u_time.value = time;
  t.renderer.render(t.displayScene, t.camera);

  t.frameCount++;

} catch (e) {
  console.error("Feral WebGL Engine Failure:", e);
}