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
        gl_Position = vec4(position, 1.0);
      }
    `;

    // FERAL MECHANISM: Aperiodic Thin-Film Dither-Infection
    // Merges Repo 4 (8-fold Quasicrystal math), Repo 2 (Thin-film interference/Birefringence),
    // Repo 1 (Pixel grid lock, Bayer dithering, YUV Palette mapping), and Repo 3 (Lisa Frank neon palette).
    const fragmentShader = `
      precision highp float;
      in vec2 vUv;
      out vec4 fragColor;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_isPressed;

      // Repo 1: bayer_4x4.yaml - Ordered Dithering Matrix
      const float bayer[16] = float[](
          0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
         12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
          3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
         15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
      );

      // Repo 3: Lisa Frank Aesthetic - Hardcoded Feral Neon Palette
      const vec3 pal[7] = vec3[](
          vec3(1.0, 0.0, 0.6),   // Hyper Pink
          vec3(0.0, 1.0, 1.0),   // Electric Cyan
          vec3(0.5, 0.0, 1.0),   // Deep Violet
          vec3(1.0, 1.0, 0.0),   // Acid Yellow
          vec3(0.0, 1.0, 0.0),   // Toxic Lime
          vec3(1.0, 0.4, 0.0),   // Sunset Orange
          vec3(0.05, 0.02, 0.1)  // Void Black (Outline)
      );

      // Repo 1: palette_map_nearest.yaml - Perceptual YUV Distance
      vec3 rgb2yuv(vec3 rgb) {
          float y = 0.299*rgb.r + 0.587*rgb.g + 0.114*rgb.b;
          float u = 0.492*(rgb.b - y);
          float v = 0.877*(rgb.r - y);
          return vec3(y, u, v);
      }

      vec3 mapToPalette(vec3 col) {
          vec3 yuvCol = rgb2yuv(col);
          float minDist = 9999.0;
          vec3 bestCol = pal[0];
          
          for(int i=0; i<7; i++) {
              vec3 pYuv = rgb2yuv(pal[i]);
              vec3 diff = yuvCol - pYuv;
              // Weight Luma (x) higher to preserve structural contrast
              float dist = diff.x*diff.x*2.5 + diff.y*diff.y + diff.z*diff.z; 
              if(dist < minDist) {
                  minDist = dist;
                  bestCol = pal[i];
              }
          }
          return bestCol;
      }

      void main() {
          // Repo 1: pixelate_grid_lock.yaml - Stable Pixel Grid
          float pixelSize = 5.0; // Chunky voxel/pixel feel
          vec2 pxRes = u_resolution / pixelSize;
          vec2 snappedUv = floor(vUv * pxRes) / pxRes;
          vec2 fc = snappedUv * u_resolution; // Virtual frag coord

          // Normalized aspect-corrected coordinates
          vec2 p = (snappedUv - 0.5) * 2.0;
          p.x *= u_resolution.x / u_resolution.y;

          vec2 m = u_mouse;
          m.x *= u_resolution.x / u_resolution.y;
          
          // Interaction force field
          float dMouse = length(p - m);
          float force = exp(-dMouse * 4.0) * (u_isPressed > 0.5 ? 2.5 : 0.8);

          // Repo 4: quasicrystals - Ammann-Beenker 8-fold base field
          // Mutated: axes drift and glitch over time creating "false memory" geometry
          float field = 0.0;
          float scale = 15.0 + sin(u_time * 0.3) * 4.0;
          
          for(int i=0; i<8; i++) {
              float angle = float(i) * 3.1415926 / 4.0;
              // Feral drift: axes warp based on time and mouse proximity
              angle += sin(u_time * 0.15 + float(i)) * 0.25 * (1.0 + force); 
              
              vec2 dir = vec2(cos(angle), sin(angle));
              
              // Repo 2: Diffraction theory - Phase modulation
              float phase = dot(p, dir) * scale;
              phase += u_time * (0.8 + float(i) * 0.15);
              phase += force * 8.0 * sin(dMouse * 15.0 - u_time * 8.0); // Thermal bloom ripple
              
              field += cos(phase);
          }
          
          field = field / 8.0; // Normalize approx -1 to 1

          // Repo 2: Thin-film interference mapping
          // Map field density to a virtual optical thickness
          float thickness = field * 0.5 + 0.5; 
          
          // Cosine palette for structural color (Rainbow iridescence)
          vec3 structColor = 0.5 + 0.5 * cos(6.28318 * (vec3(1.0, 1.0, 1.0) * (thickness * 3.0 - u_time*0.4) + vec3(0.0, 0.33, 0.67)));
          
          // Repo 2: Birefringence stress fractures
          // High-frequency modulo creates sharp fault lines in the quasicrystal
          float stress = abs(fract(field * 6.0 + u_time * 0.5) - 0.5) * 2.0;
          structColor += vec3(stress * 0.6) * vec3(1.0, 0.2, 0.8); // Inject hyper-pink into stress lines

          // Repo 1: ordered_dither.yaml - Bayer Matrix Application
          int bx = int(mod(fc.x, 4.0));
          int by = int(mod(fc.y, 4.0));
          float bayerVal = bayer[by * 4 + bx];
          
          // Dither spread increases at stress boundaries
          float spread = 0.35 + stress * 0.4; 
          vec3 ditheredCol = structColor + (bayerVal - 0.5) * spread;

          // Repo 1: palette_map_nearest.yaml - Snap to Lisa Frank constraint
          vec3 finalCol = mapToPalette(ditheredCol);

          // Repo 1: outline_sobel.yaml logic - Edge detection via field gradient
          float edge = abs(fract(field * 5.0) - 0.5);
          if (edge < 0.08 + force * 0.05) {
              finalCol = pal[6]; // Void Black grid-lock lines
          }

          fragColor = vec4(finalCol, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0, 0) },
        u_isPressed: { value: 0 }
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
    
    // Convert mouse pixel coordinates to NDC (-1 to 1)
    const ndcX = (mouse.x / grid.width) * 2.0 - 1.0;
    const ndcY = -(mouse.y / grid.height) * 2.0 + 1.0;
    
    // Smooth mouse follow
    const currentMouse = material.uniforms.u_mouse.value;
    currentMouse.x += (ndcX - currentMouse.x) * 0.1;
    currentMouse.y += (ndcY - currentMouse.y) * 0.1;
    
    material.uniforms.u_isPressed.value = mouse.isPressed ? 1.0 : 0.0;
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("Feral WebGL system crashed. The structural color engine failed to compile.", e);
}