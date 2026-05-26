try {
  // Ensure WebGL2 context is available
  if (!ctx) throw new Error("WebGL2 context not available");

  // Initialize Three.js if not already done
  if (!canvas.__three) {
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
    renderer.setPixelRatio(1);
    
    // Create Ping-Pong Framebuffers for Lenia Simulation and Velvet Nap
    const fboOptions = {
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false
    };

    const rtLenia1 = new THREE.WebGLRenderTarget(grid.width, grid.height, fboOptions);
    const rtLenia2 = new THREE.WebGLRenderTarget(grid.width, grid.height, fboOptions);
    const rtNap1 = new THREE.WebGLRenderTarget(grid.width, grid.height, fboOptions);
    const rtNap2 = new THREE.WebGLRenderTarget(grid.width, grid.height, fboOptions);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const quadGeometry = new THREE.PlaneGeometry(2, 2);

    // --- SHADER: Biological Damask Growth (Gray-Scott Reaction-Diffusion mapped to Lenia aesthetics) ---
    const leniaMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_texture: { value: null },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
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
        uniform sampler2D u_texture;
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform int u_frame;

        void main() {
          // Seed the biological field on first frames
          if (u_frame < 5) {
            float n = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
            float centerDist = length(vUv - 0.5);
            float seed = step(0.98, n) * smoothstep(0.5, 0.0, centerDist);
            seed += smoothstep(0.05, 0.0, centerDist); // Core seed
            fragColor = vec4(1.0, clamp(seed, 0.0, 1.0), 0.0, 1.0);
            return;
          }

          vec2 uv = vUv;
          vec2 state = texture(u_texture, uv).rg;
          float A = state.r;
          float B = state.g;

          vec2 dx = vec2(1.0 / u_resolution.x, 0.0);
          vec2 dy = vec2(0.0, 1.0 / u_resolution.y);

          // 9-tap Laplacian
          vec2 lap = -4.0 * state +
                     texture(u_texture, fract(uv + dx)).rg +
                     texture(u_texture, fract(uv - dx)).rg +
                     texture(u_texture, fract(uv + dy)).rg +
                     texture(u_texture, fract(uv - dy)).rg;

          // Spatial variation forces the organism to grow into damask-like motifs
          float pattern = sin(uv.x * 25.0) * cos(uv.y * 25.0);
          float pattern2 = sin(uv.x * 12.0 + u_time * 0.2) * cos(uv.y * 12.0 - u_time * 0.15);

          // Feed and kill rates determine the "species" of the pattern
          float f = 0.025 + 0.015 * pattern + 0.005 * pattern2;
          float k = 0.056 + 0.008 * pattern2;

          // Reaction-Diffusion update
          float dA = 1.0 * lap.r - A * B * B + f * (1.0 - A);
          float dB = 0.5 * lap.g + A * B * B - (k + f) * B;

          fragColor = vec4(clamp(A + dA, 0.0, 1.0), clamp(B + dB, 0.0, 1.0), 0.0, 1.0);
        }
      `
    });

    // --- SHADER: Velvet Nap Physics (Interactive Vector Field) ---
    const napMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_texture: { value: null },
        u_mousePos: { value: new THREE.Vector2(0.5, 0.5) },
        u_mouseDir: { value: new THREE.Vector2(0.0, 0.0) },
        u_mousePressed: { value: 0 },
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
        uniform sampler2D u_texture;
        uniform vec2 u_mousePos;
        uniform vec2 u_mouseDir;
        uniform float u_mousePressed;
        uniform float u_time;
        uniform int u_frame;

        void main() {
          if (u_frame < 5) {
            fragColor = vec4(0.0, -1.0, 0.0, 1.0); // Default nap points down
            return;
          }

          vec2 nap = texture(u_texture, vUv).xy;

          // Gravity / natural fabric wave memory
          vec2 targetNap = vec2(sin(vUv.x * 15.0 + u_time * 0.5) * 0.15, -1.0);
          nap = mix(nap, targetNap, 0.01);

          // Mouse brushing the velvet
          if (u_mousePressed > 0.5) {
            float dist = length(vUv - u_mousePos);
            if (dist < 0.08) {
              float intensity = smoothstep(0.08, 0.0, dist);
              vec2 brushDir = length(u_mouseDir) > 0.0 ? normalize(u_mouseDir) : vec2(0.0, 1.0);
              nap = mix(nap, brushDir, intensity * 0.6);
            }
          }
          
          fragColor = vec4(normalize(nap), 0.0, 1.0);
        }
      `
    });

    // --- SHADER: Velvet Damask Renderer (Lighting, Anisotropy, Sparkles) ---
    const renderMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_leniaTex: { value: null },
        u_napTex: { value: null },
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
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
        uniform sampler2D u_leniaTex;
        uniform sampler2D u_napTex;
        uniform float u_time;
        uniform vec2 u_resolution;

        // Sparkle Math (from sparkles repo)
        float hash12(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }

        float stochastic_sparkle(vec2 uv, vec3 N, vec3 V, float density, float sharpness, float time) {
          float NdotV = max(dot(N, V), 0.0);
          float view_factor = pow(NdotV, sharpness);
          float golden_angle = 2.39996323;
          float temporal_offset = fract(time * 0.1) * golden_angle;
          vec2 hash_uv = uv * 1000.0 + vec2(cos(temporal_offset), sin(temporal_offset)) * 10.0;
          float h = hash12(hash_uv);
          float threshold = 1.0 - density * view_factor;
          return smoothstep(threshold - 0.01, threshold, h) * view_factor;
        }

        void main() {
          // Create damask wallpaper symmetry (2x2 tiling + mirroring)
          vec2 tileUV = vUv * 2.0;
          vec2 symUV = abs(fract(tileUV) * 2.0 - 1.0);

          // Sample organism height map
          float eps = 1.0 / u_resolution.x;
          float h0 = texture(u_leniaTex, symUV).g; // B channel is the organism
          float hX = texture(u_leniaTex, fract(symUV + vec2(eps, 0.0))).g;
          float hY = texture(u_leniaTex, fract(symUV + vec2(0.0, eps))).g;

          // Normalize height for coloring
          float normH = clamp(h0 * 3.5, 0.0, 1.0);

          // Compute surface normal from organism density
          vec3 orgNormal = normalize(vec3(h0 - hX, h0 - hY, eps * 2.5));

          // Sample Velvet Nap direction
          vec2 nap = texture(u_napTex, vUv).xy;
          vec3 napNormal = normalize(vec3(nap.x, nap.y, 0.6));

          // Combine normals (fabric base + raised organism motif)
          vec3 N = normalize(orgNormal + napNormal * 0.4);

          // Lighting Setup
          vec3 V = vec3(0.0, 0.0, 1.0); // View direction
          vec3 L = normalize(vec3(sin(u_time * 0.4) * 0.8, cos(u_time * 0.3) * 0.8, 1.0)); // Orbiting light
          vec3 H = normalize(V + L);

          float NdotL = max(dot(N, L), 0.0);
          float NdotV = max(dot(N, V), 0.0);

          // Velvet Sheen (Asperity scattering at grazing angles)
          float sheen = pow(1.0 - NdotV, 2.5) * max(dot(N, L) + 0.2, 0.0);

          // Anisotropic highlight aligned with nap
          vec3 T = normalize(vec3(nap.x, nap.y, 0.0));
          float TdotH = dot(T, H);
          float aniso = exp(-pow(TdotH, 2.0) / 0.03) * max(dot(N, L), 0.0);

          // Sparkle dust on raised velvet pile
          float sparkle = stochastic_sparkle(vUv, N, V, 0.3, 3.0, u_time);
          sparkle *= smoothstep(0.4, 0.8, normH); // Only on motifs

          // Color Palette (Deep UV, Cyan, Magenta, Acid Green)
          vec3 baseVelvet = vec3(0.05, 0.0, 0.15); // Deep Ultraviolet
          vec3 haloColor = vec3(0.0, 0.8, 1.0);    // Cyan
          vec3 motifColor = vec3(1.0, 0.0, 0.4);   // Hot Magenta
          vec3 accentColor = vec3(0.6, 1.0, 0.0);  // Acid Green

          // Layer the biological colors
          vec3 color = baseVelvet;
          color = mix(color, haloColor, smoothstep(0.05, 0.3, normH));
          color = mix(color, motifColor, smoothstep(0.3, 0.7, normH));
          color = mix(color, accentColor, smoothstep(0.8, 1.0, normH));

          // Apply lighting
          vec3 ambient = color * 0.15;
          vec3 diffuse = color * NdotL * 0.7;
          vec3 sheenColor = vec3(0.8, 0.6, 1.0) * sheen * 1.5;
          vec3 anisoColor = mix(motifColor, vec3(1.0), 0.5) * aniso * 1.2;
          
          vec3 finalColor = ambient + diffuse + sheenColor + anisoColor + vec3(sparkle * 1.5);

          // Vignette
          float vignette = 1.0 - smoothstep(0.5, 1.5, length(vUv - 0.5));
          finalColor *= vignette;

          fragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const mesh = new THREE.Mesh(quadGeometry, renderMaterial);
    scene.add(mesh);

    // Setup ping-pong rendering scene
    const simScene = new THREE.Scene();
    const simMesh = new THREE.Mesh(quadGeometry, leniaMaterial);
    simScene.add(simMesh);

    const napScene = new THREE.Scene();
    const napMesh = new THREE.Mesh(quadGeometry, napMaterial);
    napScene.add(napMesh);

    canvas.__three = { 
      renderer, scene, camera, renderMaterial, 
      simScene, simMesh, leniaMaterial, rtLenia1, rtLenia2,
      napScene, napMesh, napMaterial, rtNap1, rtNap2,
      frame: 0, lastMouse: new THREE.Vector2(0, 0)
    };
  }

  const state = canvas.__three;
  const { renderer, scene, camera, renderMaterial, simScene, leniaMaterial, simMesh, rtLenia1, rtLenia2, napScene, napMaterial, napMesh, rtNap1, rtNap2 } = state;

  renderer.setSize(grid.width, grid.height, false);
  
  // Update Uniforms
  state.frame++;
  const uvMouse = new THREE.Vector2(mouse.x / grid.width, 1.0 - (mouse.y / grid.height));
  const mouseDir = new THREE.Vector2().subVectors(uvMouse, state.lastMouse);
  
  // 1. Update Velvet Nap FBO
  napMaterial.uniforms.u_time.value = time;
  napMaterial.uniforms.u_frame.value = state.frame;
  napMaterial.uniforms.u_mousePos.value.copy(uvMouse);
  napMaterial.uniforms.u_mouseDir.value.copy(mouseDir);
  napMaterial.uniforms.u_mousePressed.value = mouse.isPressed ? 1.0 : 0.0;
  
  napMaterial.uniforms.u_texture.value = rtNap1.texture;
  renderer.setRenderTarget(rtNap2);
  renderer.render(napScene, camera);
  
  // Swap Nap buffers
  const tempNap = state.rtNap1;
  state.rtNap1 = state.rtNap2;
  state.rtNap2 = tempNap;

  // 2. Update Lenia Biological Simulation FBO (multiple steps for speed)
  leniaMaterial.uniforms.u_time.value = time;
  leniaMaterial.uniforms.u_frame.value = state.frame;
  
  const simSteps = 6; // Iterations per frame for morphing speed
  for (let i = 0; i < simSteps; i++) {
    leniaMaterial.uniforms.u_texture.value = state.rtLenia1.texture;
    renderer.setRenderTarget(state.rtLenia2);
    renderer.render(simScene, camera);
    
    // Swap Lenia buffers
    const tempLenia = state.rtLenia1;
    state.rtLenia1 = state.rtLenia2;
    state.rtLenia2 = tempLenia;
    
    // After first frame, stop seeding
    if (state.frame < 5) break; 
  }

  // 3. Final Render to Screen
  renderMaterial.uniforms.u_time.value = time;
  renderMaterial.uniforms.u_leniaTex.value = state.rtLenia1.texture;
  renderMaterial.uniforms.u_napTex.value = state.rtNap1.texture;
  renderMaterial.uniforms.u_resolution.value.set(grid.width, grid.height);
  
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);

  // Store state for next frame
  if (mouse.isPressed) {
    state.lastMouse.copy(uvMouse);
  } else {
    // Slowly decay mouse dir if not pressed
    state.lastMouse.lerp(uvMouse, 0.1);
  }

} catch (e) {
  console.error("WebGL Initialization or Render Failed:", e);
}