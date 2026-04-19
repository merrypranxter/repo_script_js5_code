try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({
      canvas,
      context: ctx,
      alpha: true,
      antialias: false,
    });

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

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;

      in vec2 vUv;
      out vec4 fragColor;

      // 4x4 Bayer Dither Matrix for Ditherpunk aesthetic
      const float bayer[16] = float[16](
         0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
        12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
         3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
        15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
      );

      // Game Boy DMG 4-shade Green Palette
      const vec3 gb0 = vec3(0.059, 0.220, 0.059);
      const vec3 gb1 = vec3(0.188, 0.384, 0.188);
      const vec3 gb2 = vec3(0.545, 0.675, 0.059);
      const vec3 gb3 = vec3(0.608, 0.737, 0.059);

      // Lisa Frank Neon Palette (Iridescent Thin-Film Approximation)
      vec3 structuralNeon(float thickness) {
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.5);
          vec3 c = vec3(2.0, 1.5, 1.0); // High frequency diffraction
          vec3 d = vec3(0.0, 0.33, 0.67);
          vec3 col = a + b * cos(6.2831853 * (c * thickness + d));
          // Hyper-saturate for Lisa Frank aesthetic
          float luma = dot(col, vec3(0.299, 0.587, 0.114));
          return clamp(mix(vec3(luma), col, 2.5), 0.0, 1.0);
      }

      // Ammann-Beenker 8-fold Quasicrystal Field
      float quasicrystal(vec2 p, float t, vec2 phason) {
          float sum = 0.0;
          for(int i = 0; i < 4; i++) {
              float angle = float(i) * 3.14159265359 / 4.0;
              vec2 dir = vec2(cos(angle), sin(angle));
              // Phason strain injected via mouse interaction
              float phase = dot(p, dir) + t + dot(phason, vec2(sin(angle), -cos(angle)));
              sum += cos(phase * 3.14159265359);
          }
          return sum;
      }

      void main() {
          vec2 uv = vUv;
          vec2 p = (uv - 0.5) * (u_resolution / u_resolution.y);
          
          vec2 phason = u_mouse * 5.0;

          // Compute raw quasicrystal field to determine spatial infection
          float rawQc = quasicrystal(p * 10.0, u_time * 0.2, phason);
          
          // The "tearing" threshold: where the rigid DMG grid yields to feral Lisa Frank neon
          float tear = smoothstep(0.0, 2.0, abs(rawQc));

          // Dynamic Pixel Grid Lock (Pixel/Voxel Pipeline)
          // Dense quasicrystal areas force chunky 8-bit pixels; sparse areas allow high-res
          float pixelSize = mix(12.0, 2.0, tear);
          vec2 gridCoords = floor(uv * u_resolution / pixelSize);
          vec2 gridUv = gridCoords * pixelSize / u_resolution;
          vec2 gridP = (gridUv - 0.5) * (u_resolution / u_resolution.y);

          // Re-evaluate QC on the locked grid
          float q = quasicrystal(gridP * 10.0, u_time * 0.2, phason);

          // Thin-film interference thickness
          float thickness = (q * 0.15) + (u_time * 0.1) + length(gridP);
          vec3 baseColor = structuralNeon(thickness);

          // Ordered Dithering Setup (Screen-Space)
          int bx = int(mod(gridCoords.x, 4.0));
          int by = int(mod(gridCoords.y, 4.0));
          float bayerVal = bayer[by * 4 + bx];

          float luma = dot(baseColor, vec3(0.299, 0.587, 0.114));
          float ditheredLuma = luma + (bayerVal - 0.5) * 0.8;

          vec3 finalColor;

          if (tear < 0.5) {
              // HOST: Game Boy DMG Monochrome (Aperiodic Ditherpunk)
              int gbIndex = int(clamp(ditheredLuma * 4.0, 0.0, 3.0));
              if(gbIndex == 0) finalColor = gb0;
              else if(gbIndex == 1) finalColor = gb1;
              else if(gbIndex == 2) finalColor = gb2;
              else finalColor = gb3;
              
              // Subtle grid outline for blocky voxel feel
              vec2 fractGrid = fract(uv * u_resolution / pixelSize);
              if(fractGrid.x < 0.1 || fractGrid.y < 0.1) {
                  finalColor *= 0.7;
              }
          } else {
              // PARASITE: Lisa Frank Iridescent Quasicrystal
              // Quantize the structural color via dither thresholding
              vec3 ditheredColor = baseColor + (bayerVal - 0.5) * 0.5;
              finalColor = floor(ditheredColor * 3.0 + 0.5) / 3.0;
              
              // Outline Sobel / Edge-Detect Fake (Neon highlights)
              float edge = fract(q * 4.0 - u_time);
              if (edge > 0.85) {
                  finalColor = mix(finalColor, vec3(1.0, 0.0, 0.8), 0.8); // Hot pink injection
              }
          }

          // Visual accident: Machine hesitation at the boundary
          if (abs(tear - 0.5) < 0.02) {
              finalColor = vec3(1.0, 1.0, 0.0); // Toxic yellow seam
          }

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

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(plane);

    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  if (material && material.uniforms) {
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
    
    // Smooth mouse interpolation for phason strain
    const targetMouseX = (mouse.x / grid.width) * 2 - 1;
    const targetMouseY = -(mouse.y / grid.height) * 2 + 1;
    
    material.uniforms.u_mouse.value.x += (targetMouseX - material.uniforms.u_mouse.value.x) * 0.05;
    material.uniforms.u_mouse.value.y += (targetMouseY - material.uniforms.u_mouse.value.y) * 0.05;
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (err) {
  console.error("Feral Quasicrystal Initialization Error:", err);
}