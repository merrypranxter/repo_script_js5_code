if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");
    
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

      // [REPO 1: pixel_voxel] - 4x4 Bayer Matrix for Ditherpunk aesthetic
      const float bayer4[16] = float[](
          0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
         12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
          3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
         15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
      );

      // [REPO 3: lisa_frank_aesthetic] - Hyper-saturated neon cosine palette
      vec3 lisaFrankPalette(float t) {
          vec3 a = vec3(0.8, 0.5, 0.8);
          vec3 b = vec3(0.5, 0.4, 0.5);
          vec3 c = vec3(1.0, 1.0, 1.0);
          vec3 d = vec3(0.0, 0.33, 0.67);
          return a + b * cos(6.28318 * (c * t + d));
      }

      // [REPO 4: g2] - Primary hidden orientation field
      vec3 g2Phi(vec2 p, float t) {
          return normalize(vec3(
              sin(p.x * 2.1 + t * 0.55),
              cos(p.y * 2.7 - t * 0.31),
              sin((p.x + p.y) * 3.2 + t * 0.22)
          ));
      }

      // [REPO 4: g2] - Shadow response / complementary flow
      vec3 g2Dual(vec2 p, float t, vec3 phi) {
          return normalize(vec3(
              -phi.y,
              phi.x,
              cos((p.x - p.y) * 2.4 - t * 0.27)
          ));
      }

      void main() {
          // [REPO 1: pixel_voxel] - Stable Pixel Grid Lock
          float pxSize = max(1.0, floor(u_resolution.y / 144.0)); // Target ~144p vertical
          vec2 virtualRes = u_resolution / pxSize;
          vec2 snappedUv = floor(vUv * virtualRes) / virtualRes;
          
          vec2 p = (snappedUv - 0.5) * 2.0;
          p.x *= u_resolution.x / u_resolution.y;
          
          vec2 m = (u_mouse - 0.5) * 2.0;
          m.x *= u_resolution.x / u_resolution.y;

          // Interactive Torsion Injection
          float mouseDist = length(p - m);
          float warp = exp(-mouseDist * 5.0) * (u_isPressed > 0.5 ? 3.0 : 0.8);
          p += normalize(p - m + 0.0001) * warp * sin(u_time * 4.0);

          // [REPO 4: g2] - Field Math
          vec3 phi = g2Phi(p * (1.0 + warp * 0.5), u_time);
          vec3 dual = g2Dual(p, u_time, phi);
          float torsion = abs(dot(phi, dual)); // Misalignment strain

          // [REPO 4: g2] - Singularity / Fracture zone
          float radial = length(p);
          float fracture = 0.5 + 0.5 * sin(radial * 18.0 - torsion * 6.0 + phi.z * 4.0);
          float singularity = smoothstep(0.7, 0.95, fracture + torsion * 0.6 + warp * 0.5);

          // [REPO 2: structural_color] - Thin-film interference derived from G2 torsion
          // 2nd cos(θ) = mλ approximation
          float n_chitin = 1.56; 
          float thickness = 200.0 + torsion * 800.0 + singularity * 400.0;
          float cosTheta = sqrt(abs(1.0 - pow(sin(phi.z), 2.0)));
          float pathDiff = 2.0 * n_chitin * thickness * cosTheta;
          float phase = fract(pathDiff / 600.0); // Map to visible spectrum loop
          
          // Base iridescent color + Healing Scar Glow
          vec3 baseColor = lisaFrankPalette(phase - u_time * 0.15);
          vec3 scarColor = vec3(0.0, 1.0, 0.8) * singularity * 2.5; // Neon cyan resolution seam
          
          vec3 color = baseColor + scarColor;

          // [REPO 1: pixel_voxel] - Screen-Space Ordered Dither & Palette Quantization
          int bx = int(gl_FragCoord.x / pxSize) % 4;
          int by = int(gl_FragCoord.y / pxSize) % 4;
          float bayerVal = bayer4[by * 4 + bx];
          
          // Dither spread
          color += (bayerVal - 0.5) * 0.45; 
          
          // Quantize to 4 levels per channel (Ersatz 16-bit look)
          color = floor(color * 3.0 + 0.5) / 3.0;

          // Vignette
          float vignette = length(snappedUv - 0.5);
          color *= smoothstep(0.9, 0.2, vignette);

          fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2() },
        u_mouse: { value: new THREE.Vector2() },
        u_isPressed: { value: 0.0 }
      },
      vertexShader,
      fragmentShader,
      depthWrite: false,
      depthTest: false
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);
    
    canvas.__three = { renderer, scene, camera, material };
  } catch (e) {
    console.error("WebGL Initialization Failed:", e);
    return;
  }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material?.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  
  // Smooth mouse trailing
  const targetX = mouse.x / grid.width;
  const targetY = 1.0 - (mouse.y / grid.height);
  const currentX = material.uniforms.u_mouse.value.x;
  const currentY = material.uniforms.u_mouse.value.y;
  
  // Initialize mouse at center if 0,0
  if (currentX === 0 && currentY === 0) {
    material.uniforms.u_mouse.value.set(0.5, 0.5);
  } else {
    material.uniforms.u_mouse.value.set(
      currentX + (targetX - currentX) * 0.1,
      currentY + (targetY - currentY) * 0.1
    );
  }
  
  material.uniforms.u_isPressed.value = mouse.isPressed ? 1.0 : 0.0;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);