try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({
      canvas,
      context: ctx,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      in vec2 vUv;
      out vec4 fragColor;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;

      // --------------------------------------------------------
      // REPO 2: COLOR FIELDS & TONEMAPPING
      // --------------------------------------------------------
      vec3 blackBodyGradient(float t) {
          t = clamp(t, 0.0, 1.0);
          vec3 c;
          c.r = smoothstep(0.0, 0.33, t);
          c.g = smoothstep(0.15, 0.6, t) * 0.85;
          c.b = smoothstep(0.4, 0.9, t) * 0.6;
          c *= 0.5 + 2.0 * t * t;
          return c;
      }

      vec3 tonemapAgX(vec3 c) {
          vec3 x = max(vec3(0.0), c);
          vec3 a = x * (x + 0.0245786) - 0.000090537;
          vec3 b = x * (0.983729 * x + 0.4329510) + 0.238081;
          return a / b;
      }

      // --------------------------------------------------------
      // REPO 3: STRUCTURAL COLOR (Thin-Film Interference)
      // --------------------------------------------------------
      vec3 thinFilmInterference(float thickness, float viewAngle) {
          float n_film = 1.45; // biological chitin/keratin approx
          // 2nd cos(θ) = mλ
          float pathDiff = 2.0 * n_film * thickness * cos(viewAngle);
          // Oklch-based perceptual phase shift approximation
          vec3 phase = vec3(0.0, 0.33, 0.67); 
          return 0.5 + 0.5 * cos(6.2831853 * (pathDiff + phase));
      }

      // Gyroid Signed Distance Function (Biological Mimicry)
      float gyroidSDF(vec3 p) {
          return dot(sin(p), cos(p.yzx));
      }

      // --------------------------------------------------------
      // REPO 1: MOIRÉ DYNAMICS
      // --------------------------------------------------------

      // Technique 10: Anamorphic Distortion (Moiré as Secret)
      vec2 anamorphicDistort(vec2 uv, vec2 eyePos, float strength) {
          vec2 offset = (uv - eyePos) * strength;
          float dist = length(offset);
          // Introduce a swirling topological defect
          float angle = atan(offset.y, offset.x) + dist * 3.0 * sin(u_time * 0.5);
          return uv + vec2(cos(angle), sin(angle)) * dist * strength;
      }

      // Technique 04: Wave/Sinusoidal Moiré (Soft Interference)
      float waveGrating(vec2 uv, float freq, float angle, float phaseDefect) {
          float c = cos(angle), s = sin(angle);
          vec2 rotUV = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
          // Add phase dislocation (Technique 02/03 variation)
          return 0.5 + 0.5 * sin(rotUV.x * freq + phaseDefect);
      }

      void main() {
          vec2 uv = (vUv - 0.5) * 2.0;
          uv.x *= u_resolution.x / u_resolution.y;

          // Normalize mouse
          vec2 mouse = (u_mouse / u_resolution) * 2.0 - 1.0;
          mouse.x *= u_resolution.x / u_resolution.y;
          if(length(u_mouse) < 0.01) mouse = vec2(sin(u_time*0.5)*0.5, cos(u_time*0.3)*0.5);

          // 1. ANAMORPHIC OBSERVER DEPENDENCY
          vec2 distortedUV = anamorphicDistort(uv, mouse, 0.4);

          // 2. BIOLOGICAL TOPOLOGY (Gyroid Slice)
          // Evaluate a 2D slice of a 3D moving gyroid structure
          vec3 p3 = vec3(distortedUV * 4.0, u_time * 0.1);
          float topoHeight = gyroidSDF(p3) * 0.5 + 
                             gyroidSDF(p3 * 2.0 + u_time * 0.15) * 0.25 + 
                             gyroidSDF(p3 * 4.0 - u_time * 0.05) * 0.125;

          // 3. STRUCTURAL COLOR
          // Map topography to thin-film thickness (400nm to 1000nm range)
          float thickness = mix(0.4, 1.0, topoHeight * 0.5 + 0.5);
          // Simulate view angle based on local gradient (bump mapping)
          vec2 eps = vec2(0.01, 0.0);
          float dx = gyroidSDF(p3 + eps.xyy) - gyroidSDF(p3 - eps.xyy);
          float dy = gyroidSDF(p3 + eps.yxy) - gyroidSDF(p3 - eps.yxy);
          vec3 normal = normalize(vec3(dx, dy, 1.0));
          vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
          float vAngle = acos(max(0.0, dot(normal, viewDir)));
          
          vec3 iridescence = thinFilmInterference(thickness * 5.0, vAngle);

          // 4. PROJECTION MOIRÉ (Scanner) + CHROMATIC SEPARATION
          // Project a grid onto the surface, view through reference grid
          float lightAngle = 0.6 + sin(u_time * 0.3) * 0.2;
          vec2 lightUV = distortedUV + vec2(topoHeight * tan(lightAngle));

          // Base spatial frequency
          float baseFreq = 80.0 + sin(u_time * 0.1) * 20.0;
          
          // Phase Dislocation Defect (Topological anomaly)
          float defect = smoothstep(0.4, 0.1, length(uv - mouse)) * 3.14159 * 2.0;

          // Red Channel Moiré
          float rRef = waveGrating(distortedUV, baseFreq * 1.0, 0.0, u_time + defect);
          float rProj = waveGrating(lightUV, baseFreq * 1.01, 0.05, u_time + defect);
          float mR = rRef * rProj;

          // Green Channel Moiré
          float gRef = waveGrating(distortedUV, baseFreq * 1.02, 1.047, -u_time - defect);
          float gProj = waveGrating(lightUV, baseFreq * 1.03, 1.097, -u_time - defect);
          float mG = gRef * gProj;

          // Blue Channel Moiré
          float bRef = waveGrating(distortedUV, baseFreq * 0.98, 2.094, u_time * 0.5 + defect);
          float bProj = waveGrating(lightUV, baseFreq * 0.99, 2.144, u_time * 0.5 + defect);
          float mB = bRef * bProj;

          // Combine Chromatic Moiré
          vec3 moireInterference = vec3(mR, mG, mB);
          
          // Extract difference frequency (contrast push)
          moireInterference = pow(moireInterference, vec3(0.7));

          // 5. THERMAL INFECTION (Black Body)
          // The topological defect heats up the structure
          float heat = smoothstep(0.3, 0.0, length(uv - mouse)) * (0.5 + 0.5 * sin(u_time * 5.0));
          vec3 thermalGlow = blackBodyGradient(heat * topoHeight);

          // 6. SYNTHESIS
          // Iridescence modulated by spatial moiré interference, infected by thermal glow
          vec3 color = iridescence * moireInterference * 2.5 + thermalGlow;

          // 7. TONEMAPPING
          color = tonemapAgX(color);

          // Vignette
          float vignette = 1.0 - dot(vUv - 0.5, vUv - 0.5) * 1.2;
          color *= smoothstep(0.0, 0.6, vignette);

          fragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(mouse.x, mouse.y) }
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
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
    
    // Smooth mouse interpolation
    if (mouse.isPressed || time < 2.0) {
      material.uniforms.u_mouse.value.x += (mouse.x - material.uniforms.u_mouse.value.x) * 0.1;
      material.uniforms.u_mouse.value.y += ((grid.height - mouse.y) - material.uniforms.u_mouse.value.y) * 0.1;
    }
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("Feral Moiré System Initialization Failed:", e);
}