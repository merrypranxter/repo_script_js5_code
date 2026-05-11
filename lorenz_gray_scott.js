try {
  if (!ctx) throw new Error("WebGL context not available");

  if (!canvas.__three) {
    // --- 1. WEBGL & THREE.JS INITIALIZATION ---
    const renderer = new THREE.WebGLRenderer({
      canvas,
      context: ctx,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(1); // Force 1:1 for 1-to-1 pixel simulation

    const SIM_RES = 512; // Locked resolution for stable reaction-diffusion

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const sceneSim = new THREE.Scene();
    const sceneDisplay = new THREE.Scene();

    const planeGeo = new THREE.PlaneGeometry(2, 2);

    // --- 2. PING-PONG FRAMEBUFFERS ---
    const rtOpts = {
      width: SIM_RES,
      height: SIM_RES,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType, // Critical for Gray-Scott precision
      depthBuffer: false,
      stencilBuffer: false
    };
    const fboA = new THREE.WebGLRenderTarget(SIM_RES, SIM_RES, rtOpts);
    const fboB = new THREE.WebGLRenderTarget(SIM_RES, SIM_RES, rtOpts);

    // --- 3. SIMULATION SHADER (Gray-Scott + Lorenz Injector) ---
    const simMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        uState: { value: null },
        uResolution: { value: new THREE.Vector2(SIM_RES, SIM_RES) },
        uPoints: { value: Array(15).fill(new THREE.Vector2(0, 0)) },
        uNumPoints: { value: 15 },
        uDecay: { value: 1.0 },
        uInit: { value: 1 }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        
        uniform sampler2D uState;
        uniform vec2 uResolution;
        uniform vec2 uPoints[15];
        uniform int uNumPoints;
        uniform float uDecay;
        uniform int uInit;
        
        in vec2 vUv;
        out vec4 fragColor;
        
        void main() {
          // Initialization Pass: Fill field with U=1.0, V=0.0, Ghost=0.0
          if (uInit == 1) {
            fragColor = vec4(1.0, 0.0, 0.0, 1.0);
            return;
          }
          
          vec2 texel = 1.0 / uResolution;
          
          // --- KINETIC ADVECTION VIA GHOST GRADIENT ---
          // The coral is "repelled" by the heat of the neon ghost trail.
          float bx1 = texture(uState, vUv + vec2(texel.x, 0.0)).b;
          float bx2 = texture(uState, vUv - vec2(texel.x, 0.0)).b;
          float by1 = texture(uState, vUv + vec2(0.0, texel.y)).b;
          float by2 = texture(uState, vUv - vec2(0.0, texel.y)).b;
          vec2 gradB = vec2(bx1 - bx2, by1 - by2);
          
          // Displace sampling coordinates away from the ghost trail
          vec2 uv = vUv - gradB * 2.5 * texel;
          
          // --- KARL SIMS 9-POINT LAPLACIAN ---
          vec2 state = texture(uState, uv).rg;
          vec2 sum = vec2(0.0);
          sum += texture(uState, uv + vec2(-1.0,  0.0) * texel).rg * 0.2;
          sum += texture(uState, uv + vec2( 1.0,  0.0) * texel).rg * 0.2;
          sum += texture(uState, uv + vec2( 0.0, -1.0) * texel).rg * 0.2;
          sum += texture(uState, uv + vec2( 0.0,  1.0) * texel).rg * 0.2;
          sum += texture(uState, uv + vec2(-1.0, -1.0) * texel).rg * 0.05;
          sum += texture(uState, uv + vec2( 1.0, -1.0) * texel).rg * 0.05;
          sum += texture(uState, uv + vec2(-1.0,  1.0) * texel).rg * 0.05;
          sum += texture(uState, uv + vec2( 1.0,  1.0) * texel).rg * 0.05;
          sum -= state.rg; // Center weight -1.0
          
          // --- GRAY-SCOTT REACTION DYNAMICS ---
          float u = state.r;
          float v = state.g;
          float bCenter = texture(uState, vUv).b;
          
          // Overclock the reaction near the ghost trail
          float localF = 0.0545 + bCenter * 0.015; // Coral preset F base
          float localK = 0.0620 - bCenter * 0.003; // Coral preset k base
          
          float reaction = u * v * v;
          float du = 1.0 * sum.r - reaction + localF * (1.0 - u);
          float dv = 0.5 * sum.g + reaction - (localF + localK) * v;
          
          float newU = clamp(u + du, 0.0, 1.0);
          float newV = clamp(v + dv, 0.0, 1.0);
          
          // --- LORENZ INJECTOR (CHEMICAL SEEDING) ---
          float injectSplats = 0.0;
          for(int i = 0; i < 15; i++) {
            float d = distance(vUv, uPoints[i]);
            // Exponential falloff for soft, organic injection
            injectSplats = max(injectSplats, exp(-d * d * 80000.0));
          }
          
          // Deplete U and flood V where the attractor passes
          newU = mix(newU, 0.0, injectSplats * 0.9);
          newV = mix(newV, 1.0, injectSplats);
          
          // Ghost trail decays based on uDecay (only applied on final sub-step)
          float newB = max(bCenter * uDecay, injectSplats);
          
          fragColor = vec4(newU, newV, newB, 1.0);
        }
      `
    });

    // --- 4. DISPLAY SHADER (Emboss & Composite) ---
    const displayMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        uState: { value: null },
        uResolution: { value: new THREE.Vector2(SIM_RES, SIM_RES) }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        
        uniform sampler2D uState;
        uniform vec2 uResolution;
        
        in vec2 vUv;
        out vec4 fragColor;
        
        void main() {
          vec2 texel = 1.0 / uResolution;
          
          // Read current pixel
          vec4 state = texture(uState, vUv);
          float u = state.r;
          float v = state.g;
          float ghost = state.b;
          
          // Read neighbors for normal estimation (emboss effect)
          float vx = texture(uState, vUv + vec2(texel.x, 0.0)).g;
          float vy = texture(uState, vUv + vec2(0.0, texel.y)).g;
          
          // Construct 3D normal from V concentration gradient
          vec3 N = normalize(vec3(v - vx, v - vy, 0.015));
          vec3 L = normalize(vec3(1.0, 1.0, 1.5));
          
          // Diffuse and Specular lighting
          float diff = max(0.0, dot(N, L));
          vec3 viewDir = vec3(0.0, 0.0, 1.0);
          vec3 halfDir = normalize(L + viewDir);
          float spec = pow(max(0.0, dot(N, halfDir)), 32.0);
          
          // Materials
          vec3 coralColor = vec3(0.98, 0.55, 0.45) * diff + vec3(1.0) * spec * 0.6;
          vec3 ghostNeon = vec3(0.22, 1.0, 0.08); // #39FF14
          
          // Subsurface background with glowing ghost underpainting
          vec3 bgColor = vec3(0.02, 0.03, 0.04) + ghostNeon * ghost * 0.4;
          
          // Mix based on V threshold (coral physical presence)
          float coralMask = smoothstep(0.18, 0.35, v);
          vec3 finalColor = mix(bgColor, coralColor, coralMask);
          
          // Add raw intense core of the ghost trail on top to look radioactive
          finalColor += ghostNeon * smoothstep(0.6, 1.0, ghost) * 0.8;
          
          // Vignette
          float dist = distance(vUv, vec2(0.5));
          finalColor *= smoothstep(0.75, 0.3, dist);
          
          fragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
        }
      `
    });

    const meshSim = new THREE.Mesh(planeGeo, simMaterial);
    sceneSim.add(meshSim);

    const meshDisplay = new THREE.Mesh(planeGeo, displayMaterial);
    sceneDisplay.add(meshDisplay);

    // Initial state setup
    canvas.__three = {
      renderer,
      sceneSim,
      sceneDisplay,
      camera,
      fboA,
      fboB,
      simMaterial,
      displayMaterial,
      lorenz: { x: 0.1, y: 0.1, z: 0.1 }
    };

    // Run initialization pass
    renderer.setRenderTarget(fboA);
    renderer.render(sceneSim, camera);
    simMaterial.uniforms.uInit.value = 0;
  }

  const {
    renderer,
    sceneSim,
    sceneDisplay,
    camera,
    simMaterial,
    displayMaterial,
    lorenz
  } = canvas.__three;
  let { fboA, fboB } = canvas.__three;

  // --- 5. CPU LORENZ INTEGRATION ---
  const dt = 0.004; // Slowed integration for a continuous thick trail
  const points = [];
  
  for (let i = 0; i < 15; i++) {
    // Lorenz Equations
    const dx = 10.0 * (lorenz.y - lorenz.x);
    const dy = lorenz.x * (28.0 - lorenz.z) - lorenz.y;
    const dz = lorenz.x * lorenz.y - (8.0 / 3.0) * lorenz.z;
    
    lorenz.x += dx * dt;
    lorenz.y += dy * dt;
    lorenz.z += dz * dt;
    
    // Project 3D coordinate to 2D UV space
    let px = (lorenz.x / 45.0);
    let py = (lorenz.y / 45.0);
    
    // Slowly rotate the entire attractor projection over time to explore the canvas
    const angle = time * 0.2;
    const rx = px * Math.cos(angle) - py * Math.sin(angle);
    const ry = px * Math.sin(angle) + py * Math.cos(angle);
    
    points.push(new THREE.Vector2(rx + 0.5, ry + 0.5));
  }
  
  // Update uniforms safely
  if (simMaterial && simMaterial.uniforms) {
    simMaterial.uniforms.uPoints.value = points;
  }

  // --- 6. PING-PONG SIMULATION LOOP ---
  // Run 12 iterations per rendered frame to speed up the reaction-diffusion
  const ITERATIONS = 12;
  for (let i = 0; i < ITERATIONS; i++) {
    simMaterial.uniforms.uState.value = fboA.texture;
    
    // Only apply the 0.97 decay on the final step so the trail doesn't vanish instantly
    simMaterial.uniforms.uDecay.value = (i === ITERATIONS - 1) ? 0.97 : 1.0;
    
    renderer.setRenderTarget(fboB);
    renderer.render(sceneSim, camera);
    
    // Swap FBOs
    let temp = fboA;
    fboA = fboB;
    fboB = temp;
  }
  
  // Persist swapped FBOs for next frame
  canvas.__three.fboA = fboA;
  canvas.__three.fboB = fboB;

  // --- 7. FINAL DISPLAY RENDER ---
  renderer.setSize(grid.width, grid.height, false);
  if (displayMaterial && displayMaterial.uniforms) {
    displayMaterial.uniforms.uState.value = fboA.texture;
  }
  
  renderer.setRenderTarget(null);
  renderer.render(sceneDisplay, camera);

} catch (e) {
  console.error("Feral System Collapse:", e);
}