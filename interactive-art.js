if (!canvas.__three) {
  try {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false });
    if (!gl) throw new Error("WebGL 2 not supported or context occupied");

    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: false });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      in vec2 vUv;
      out vec4 fragColor;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_pixelScale;

      // Lisa Frank x Ditherpunk Palette
      const int PALETTE_SIZE = 8;
      vec3 palette[PALETTE_SIZE] = vec3[](
          vec3(0.05, 0.00, 0.15), // Deep Void Purple (Outlines)
          vec3(1.00, 0.00, 0.50), // Hot Pink
          vec3(0.00, 1.00, 1.00), // Lisa Cyan
          vec3(0.60, 0.00, 1.00), // Electric Purple
          vec3(0.60, 1.00, 0.00), // Toxic Lime
          vec3(1.00, 0.90, 0.00), // Sun Yellow
          vec3(1.00, 0.40, 0.00), // Neon Orange
          vec3(1.00, 1.00, 1.00)  // White
      );

      // 4x4 Bayer Matrix for Ordered Dithering
      const float bayer4[16] = float[16](
          0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
         12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
          3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
         15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
      );

      // YUV conversion for better perceptual palette snapping
      vec3 rgb2yuv(vec3 c) {
          return vec3(
              dot(c, vec3(0.299, 0.587, 0.114)),
              dot(c, vec3(-0.147, -0.289, 0.436)),
              dot(c, vec3(0.615, -0.515, -0.100))
          );
      }

      // Nearest palette match using YUV distance
      vec3 nearestPalette(vec3 col) {
          vec3 best = palette[0];
          float bestDist = 1e9;
          vec3 targetYUV = rgb2yuv(col);
          
          for (int i = 0; i < PALETTE_SIZE; i++) {
              vec3 p = palette[i];
              vec3 diff = targetYUV - rgb2yuv(p);
              // Weight luma slightly higher for better dither structure
              float dist = diff.x*diff.x*1.5 + diff.y*diff.y + diff.z*diff.z;
              if (dist < bestDist) { 
                  bestDist = dist; 
                  best = p; 
              }
          }
          return best;
      }

      // Quasicrystal Math: 5-fold Pentagrid (Penrose/de Bruijn)
      float getQuasicrystalField(vec2 p) {
          float field = 0.0;
          float phi = 1.6180339887; // The Golden Ratio
          
          // Phason shift (translates the aperiodic structure without periodic repetition)
          vec2 phason = vec2(u_time * 0.4, u_time * 0.25) + (u_mouse * 4.0);
          
          for(int i = 0; i < 5; i++) {
              // 5-fold symmetry angles
              float angle = float(i) * 3.14159265 / 2.5;
              vec2 dir = vec2(cos(angle), sin(angle));
              
              // Feral mutation: non-linear domain warping via phi
              float warp = sin(dot(p, dir.yx) * phi + u_time * 1.5) * 0.4;
              
              field += cos(dot(p, dir) * 8.0 + dot(phason, dir) + warp);
          }
          return field;
      }

      void main() {
          // Pixelate Grid Lock - Essential for the voxel/pixel ditherpunk aesthetic
          vec2 pixelCoord = floor(gl_FragCoord.xy / u_pixelScale);
          vec2 snappedUv = (pixelCoord * u_pixelScale) / u_resolution;
          
          // Center and scale UV for the mathematical field
          vec2 p = (snappedUv - 0.5) * (u_resolution / u_resolution.y);
          p *= 2.5; // Zoom out to see the 5-fold rosettes

          // Sample the field and its neighbors for Sobel edge detection
          float f = getQuasicrystalField(p);
          float fU = getQuasicrystalField(p + vec2(0.0, 1.0/u_resolution.y) * u_pixelScale * 1.5);
          float fR = getQuasicrystalField(p + vec2(1.0/u_resolution.x, 0.0) * u_pixelScale * 1.5);
          
          // Compute topographic contour lines
          float edge = abs(f - fU) + abs(f - fR);
          bool isEdge = edge > 0.85;

          // Map the aperiodic field to a hyper-saturated Lisa Frank color gradient
          float normField = (f + 5.0) / 10.0; 
          vec3 baseColor = 0.5 + 0.5 * cos(6.28318 * (normField * 1.5 - u_time * 0.2 + vec3(0.0, 0.33, 0.67)));
          
          // Overclock the saturation for that 90s feral neon look
          baseColor = smoothstep(0.1, 0.9, baseColor);
          baseColor = mix(baseColor, vec3(1.0, 0.0, 1.0), sin(normField * 12.0) * 0.5 + 0.5);

          // Apply Ordered Dithering (Bayer 4x4)
          int bx = int(pixelCoord.x) % 4;
          int by = int(pixelCoord.y) % 4;
          float bayerVal = bayer4[by * 4 + bx];
          
          // Spread controls the harshness of the ditherpunk transition
          float spread = 0.35;
          vec3 dithered = baseColor + (bayerVal - 0.5) * spread;

          // Snap to the curated palette
          vec3 finalColor = nearestPalette(dithered);

          // Hard pixel-art outline overlay
          if (isEdge) {
              finalColor = palette[0]; // Snap outline to void purple
          }

          fragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0, 0) },
        u_pixelScale: { value: 3.0 } // Virtual pixel size
      },
      vertexShader,
      fragmentShader,
      depthWrite: false,
      depthTest: false
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material, targetMouse: new THREE.Vector2() };
  } catch (e) {
    console.error("WebGL Initialization Failed:", e);
    return;
  }
}

const { renderer, scene, camera, material, targetMouse } = canvas.__three;

if (material && material.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  
  // Dynamic pixel scale based on canvas size to maintain the chunky ditherpunk feel
  material.uniforms.u_pixelScale.value = Math.max(2.0, Math.floor(grid.width / 320));

  // Smooth mouse interpolation for fluid phason shifts
  if (mouse.isPressed) {
    targetMouse.x = (mouse.x / grid.width) * 2 - 1;
    targetMouse.y = -(mouse.y / grid.height) * 2 + 1;
  } else {
    // Feral drift when not interacting
    targetMouse.x = Math.sin(time * 0.3) * 0.5;
    targetMouse.y = Math.cos(time * 0.4) * 0.5;
  }
  
  material.uniforms.u_mouse.value.lerp(targetMouse, 0.05);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);