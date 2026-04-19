try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL context required");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
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
      uniform float u_isPressed;

      // ==========================================
      // REPO GENOME: pixel_voxel
      // Bayer 4x4 Dither Matrix
      // ==========================================
      const float bayer[16] = float[16](
        0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
       12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
        3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
       15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
      );

      // ==========================================
      // REPO GENOME: lisa_frank_aesthetic
      // Hyper-saturated limited palette
      // ==========================================
      vec3 getLisaFrankColor(int index) {
          vec3 colors[6] = vec3[6](
              vec3(0.1, 0.0, 0.3),   // Deep Space Velvet
              vec3(0.6, 0.0, 0.8),   // Trapper Keeper Purple
              vec3(1.0, 0.0, 0.6),   // Neon Flamingo Pink
              vec3(1.0, 0.9, 0.0),   // Electric Banana
              vec3(0.0, 1.0, 0.8),   // Dolphin Cyan
              vec3(0.9, 0.9, 1.0)    // Sticker Sparkle White
          );
          return colors[clamp(index, 0, 5)];
      }

      // ==========================================
      // REPO GENOME: quasicrystals
      // 5-fold Pentagrid Equation (Aperiodic Order)
      // ==========================================
      float quasicrystal(vec2 p, float time_offset) {
          float v = 0.0;
          for(int i = 0; i < 5; i++) {
              float theta = float(i) * 3.14159265359 / 5.0;
              vec2 dir = vec2(cos(theta), sin(theta));
              // Shift phase to create structural growth
              float phase = dot(p, dir) * 3.0 + time_offset;
              v += cos(phase);
          }
          return v;
      }

      // ==========================================
      // REPO GENOME: structural_color
      // Thin-film interference approximation mapped to palette
      // ==========================================
      void main() {
          // 1. PIXELATE GRID LOCK (pixel_voxel)
          float virtualH = 180.0; // Low-res retro feel
          float virtualW = floor(virtualH * (u_resolution.x / u_resolution.y));
          vec2 pixelSize = 1.0 / vec2(virtualW, virtualH);
          vec2 snappedUV = floor(vUv / pixelSize) * pixelSize + pixelSize * 0.5;

          // Aspect correct space
          vec2 p = (snappedUV - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
          
          // Spatial distortion (Feral mechanism: melting the grid)
          vec2 m = (u_mouse - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
          float distToMouse = length(p - m);
          float warp = exp(-distToMouse * 5.0) * (u_isPressed > 0.5 ? 2.0 : 0.5);
          p += normalize(p - m) * sin(distToMouse * 20.0 - u_time * 5.0) * warp * 0.1;

          // 2. GENERATE QUASICRYSTAL FIELD
          // Treat the scalar field as "thin film thickness"
          float timeShift = u_time * 0.4;
          float rawField = quasicrystal(p * 5.0, timeShift);
          
          // Normalize roughly to 0.0 -> 1.0
          float thickness = (rawField + 5.0) / 10.0; 

          // 3. ORDERED DITHER (pixel_voxel)
          ivec2 fragCoordInt = ivec2(snappedUV * vec2(virtualW, virtualH));
          float ditherVal = bayer[(fragCoordInt.y % 4) * 4 + (fragCoordInt.x % 4)];
          
          // Apply dither spread to structural thickness
          float spread = 0.2;
          float ditheredThickness = thickness + (ditherVal - 0.5) * spread;

          // 4. PALETTE SNAP (pixel_voxel + lisa_frank)
          float steps = 5.0;
          float quantized = clamp(floor(ditheredThickness * (steps + 1.0)), 0.0, steps);
          vec3 baseColor = getLisaFrankColor(int(quantized));

          // 5. EDGE DETECT / HARD OUTLINES (pixel_voxel)
          // Compute gradient of the un-dithered field to find structural boundaries
          vec2 eps = vec2(0.01, 0.0);
          float dx = quasicrystal((p + eps.xy) * 5.0, timeShift) - quasicrystal((p - eps.xy) * 5.0, timeShift);
          float dy = quasicrystal((p + eps.yx) * 5.0, timeShift) - quasicrystal((p - eps.yx) * 5.0, timeShift);
          float gradMag = length(vec2(dx, dy));

          // 6. FERAL INJECTION: Lisa Frank Leopard Spots on the Quasicrystal
          // Use a higher-frequency harmonic of the quasicrystal for spots
          float spotField = quasicrystal(p * 15.0, -u_time * 0.5);
          bool isSpot = spotField > 4.2;
          bool isSpotHalo = spotField > 3.8 && spotField <= 4.2;

          vec3 finalColor = baseColor;

          // Composite Outlines
          if (gradMag > 3.5) {
              finalColor = vec3(0.05); // Hard black outline along interference fringes
          }

          // Composite Leopard Spots
          if (isSpot) {
              finalColor = vec3(0.0); // Black center
          } else if (isSpotHalo) {
              finalColor = vec3(0.0, 1.0, 1.0); // Cyan halo
          }

          fragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
        u_isPressed: { value: 0.0 }
      },
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
    const targetMouseX = mouse.x / grid.width;
    const targetMouseY = 1.0 - (mouse.y / grid.height);
    
    // Initialize if NaN
    if (isNaN(material.uniforms.u_mouse.value.x)) {
        material.uniforms.u_mouse.value.set(0.5, 0.5);
    }
    
    material.uniforms.u_mouse.value.x += (targetMouseX - material.uniforms.u_mouse.value.x) * 0.1;
    material.uniforms.u_mouse.value.y += (targetMouseY - material.uniforms.u_mouse.value.y) * 0.1;
    
    material.uniforms.u_isPressed.value = mouse.isPressed ? 1.0 : 0.0;
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("WebGL 2.0 Initialization or Render Failed:", e);
  // Fallback to 2D context if WebGL fails entirely, though ctx is guaranteed to be WebGL2 here based on prompt
}