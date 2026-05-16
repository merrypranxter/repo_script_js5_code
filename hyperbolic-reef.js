try {
  if (!ctx) throw new Error("WebGL2 context not available");

  // Initialize THREE.js environment if it doesn't exist
  if (!canvas.__three) {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      context: ctx,
      alpha: true,
      antialias: false
    });
    renderer.autoClear = false;

    // Ping-pong FBOs for Cellular Automata (Float precision for Reaction-Diffusion)
    const rtOpts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping
    };
    
    // Fallback to HalfFloatType if FloatType is unsupported
    if (!ctx.getExtension('EXT_color_buffer_float')) {
      rtOpts.type = THREE.HalfFloatType;
    }

    const fboA = new THREE.WebGLRenderTarget(grid.width, grid.height, rtOpts);
    const fboB = new THREE.WebGLRenderTarget(grid.width, grid.height, rtOpts);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);

    // --- CELLULAR AUTOMATA SHADER (Smooth Reef / Gray-Scott) ---
    const caMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_tex: { value: null },
        u_res: { value: new THREE.Vector2(grid.width, grid.height) },
        u_time: { value: 0 },
        u_frame: { value: 0 }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        in vec2 vUv;
        out vec4 fragColor;
        uniform sampler2D u_tex;
        uniform vec2 u_res;
        uniform float u_time;
        uniform float u_frame;

        void main() {
          // Initial Seed
          if (u_frame < 5.0) {
            float n = fract(sin(dot(vUv, vec2(12.9898, 78.233)) + u_time) * 43758.5453);
            float v_seed = (n > 0.99) ? 1.0 : 0.0;
            if (length(vUv - 0.5) < 0.05 && n > 0.5) v_seed = 1.0;
            fragColor = vec4(1.0, v_seed, 0.0, 1.0);
            return;
          }

          vec2 uv = vUv;
          vec2 me = texture(u_tex, uv).rg;
          float u = me.x;
          float v = me.y;

          // 9-tap Isotropic Laplacian
          vec2 lap = me * -1.0;
          vec2 e = 1.0 / u_res;
          lap += texture(u_tex, uv + vec2(e.x, 0.0)).rg * 0.2;
          lap += texture(u_tex, uv + vec2(-e.x, 0.0)).rg * 0.2;
          lap += texture(u_tex, uv + vec2(0.0, e.y)).rg * 0.2;
          lap += texture(u_tex, uv + vec2(0.0, -e.y)).rg * 0.2;
          lap += texture(u_tex, uv + vec2(e.x, e.y)).rg * 0.05;
          lap += texture(u_tex, uv + vec2(-e.x, -e.y)).rg * 0.05;
          lap += texture(u_tex, uv + vec2(e.x, -e.y)).rg * 0.05;
          lap += texture(u_tex, uv + vec2(-e.x, e.y)).rg * 0.05;

          // Spatial Mutation (Alive Reef)
          float F = 0.045 + sin(uv.x * 15.0 + u_time * 0.5) * 0.01;
          float k = 0.060 + cos(uv.y * 15.0 - u_time * 0.3) * 0.005;

          // Reaction-Diffusion logic
          float uvv = u * v * v;
          float du = 0.2097 * lap.x - uvv + F * (1.0 - u);
          float dv = 0.1050 * lap.y + uvv - (F + k) * v;

          u = clamp(u + du, 0.0, 1.0);
          v = clamp(v + dv, 0.0, 1.0);

          // Random spontaneous mutation to prevent death
          if (fract(sin(dot(uv, vec2(41.0, 28.0)) + u_time) * 1000.0) < 0.0001) v = 1.0;

          fragColor = vec4(u, v, 0.0, 1.0);
        }
      `
    });

    // --- DISPLAY SHADER (Poincaré Disk + {7,3} Möbius Fold + Acid Moiré) ---
    const displayMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_tex: { value: null },
        u_res: { value: new THREE.Vector2(grid.width, grid.height) },
        u_time: { value: 0 }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        in vec2 vUv;
        out vec4 fragColor;
        uniform sampler2D u_tex;
        uniform vec2 u_res;
        uniform float u_time;

        const float PI = 3.14159265359;

        // Complex Math & Möbius Transforms
        vec2 cdiv(vec2 a, vec2 b) {
            float d = dot(b, b);
            return vec2(dot(a,b), a.y*b.x - a.x*b.y) / d;
        }
        vec2 cmul(vec2 a, vec2 b) {
            return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
        }
        vec2 conj(vec2 z) { return vec2(z.x, -z.y); }
        vec2 mobius_translate(vec2 z, vec2 p) {
            return cdiv(z - p, vec2(1.0, 0.0) - cmul(conj(p), z));
        }

        // {7,3} Hyperbolic Fold Approximation
        vec2 fold7(vec2 z) {
            float a = atan(z.y, z.x);
            float r = length(z);
            float sector = 6.2831853 / 7.0;
            a = mod(a, sector);
            a = abs(a - sector/2.0);
            return r * vec2(cos(a), sin(a));
        }

        void main() {
          // Center UV and correct aspect ratio
          vec2 z = (vUv - 0.5) * 2.0;
          z.x *= u_res.x / u_res.y;
          
          float r = length(z);
          if (r > 0.99) {
              fragColor = vec4(0.02, 0.0, 0.05, 1.0); // Abyssal edge
              return;
          }

          // Mitosis Pulse: Oscillating Möbius center
          float pulse = sin(u_time * 0.4) * 0.2 + 0.6;
          vec2 center = vec2(sin(u_time * 0.25), cos(u_time * 0.35)) * pulse;

          // Apply Hyperbolic Transformations
          vec2 z_m = mobius_translate(z, center);
          z_m = fold7(z_m);
          z_m = mobius_translate(z_m, vec2(0.3 * sin(u_time), 0.0));
          z_m = fold7(z_m);

          // Map back to Euclidean space for CA sampling & tile it
          vec2 sampleUV = fract((z_m * 0.5 + 0.5) * 4.0);
          
          // Moiré Interference Offset
          vec2 z_moire = mobius_translate(z, center * 1.08); // Slight phase shift
          z_moire = fold7(z_moire);
          vec2 sampleUV_moire = fract((z_moire * 0.5 + 0.5) * 4.0);

          // Sample CA state (v = coral growth)
          float v = texture(u_tex, sampleUV).g;
          float v_moire = texture(u_tex, sampleUV_moire).g;

          // Moiré Interference Beat
          float interference = abs(v - v_moire);

          // Acid Palette Mapping
          float val = v * 3.0; // Normalize Gray-Scott range
          
          vec3 col = vec3(0.05, 0.0, 0.1); // Deep void
          col = mix(col, vec3(0.26, 0.10, 0.60), smoothstep(0.0, 0.2, val)); // Violet decay
          col = mix(col, vec3(0.04, 0.75, 0.85), smoothstep(0.2, 0.4, val)); // Teal survival
          col = mix(col, vec3(0.62, 0.91, 0.09), smoothstep(0.4, 0.6, val)); // Acid Green mutation
          col = mix(col, vec3(0.85, 0.95, 0.14), smoothstep(0.6, 0.8, val)); // Neon Yellow excitation
          col = mix(col, vec3(0.95, 0.14, 0.82), smoothstep(0.8, 0.95, val)); // Hot Magenta birth
          col = mix(col, vec3(1.0, 1.0, 1.0), smoothstep(0.95, 1.0, val)); // White bloom

          // Add Chromatic Moiré Interference (Retinal Surrealism)
          col += vec3(0.95, 0.14, 0.82) * interference * 2.0; // Magenta fringe
          col -= vec3(0.04, 0.75, 0.85) * interference * 0.8; // Cyan subtraction

          // Infinite-density edge fade
          float edge = smoothstep(0.99, 0.85, r);
          col *= edge;

          fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
      `
    });

    const caScene = new THREE.Scene();
    caScene.add(new THREE.Mesh(geometry, caMaterial));

    const displayScene = new THREE.Scene();
    displayScene.add(new THREE.Mesh(geometry, displayMaterial));

    canvas.__three = {
      renderer,
      camera,
      fboA,
      fboB,
      caMaterial,
      displayMaterial,
      caScene,
      displayScene,
      ping: true,
      frame: 0
    };
  }

  const t = canvas.__three;
  
  // Resize handler
  if (t.renderer.getSize(new THREE.Vector2()).x !== grid.width) {
    t.renderer.setSize(grid.width, grid.height, false);
    t.fboA.setSize(grid.width, grid.height);
    t.fboB.setSize(grid.width, grid.height);
    t.caMaterial.uniforms.u_res.value.set(grid.width, grid.height);
    t.displayMaterial.uniforms.u_res.value.set(grid.width, grid.height);
  }

  // 1. Run CA simulation (multiple steps per frame for faster organic growth)
  t.caMaterial.uniforms.u_time.value = time;
  t.caMaterial.uniforms.u_frame.value = t.frame;
  
  const STEPS = 8; // Overclocked CA
  for (let i = 0; i < STEPS; i++) {
    t.caMaterial.uniforms.u_tex.value = t.ping ? t.fboA.texture : t.fboB.texture;
    t.renderer.setRenderTarget(t.ping ? t.fboB : t.fboA);
    t.renderer.render(t.caScene, t.camera);
    t.ping = !t.ping;
  }

  // 2. Render to screen with Poincaré projection and Moiré
  t.displayMaterial.uniforms.u_time.value = time;
  t.displayMaterial.uniforms.u_tex.value = t.ping ? t.fboA.texture : t.fboB.texture;
  t.renderer.setRenderTarget(null);
  t.renderer.render(t.displayScene, t.camera);

  t.frame++;

} catch (e) {
  console.error("WebGL Initialization or Render Failed:", e);
}