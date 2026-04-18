if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
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
      precision highp float;
      in vec2 vUv;
      out vec4 fragColor;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_pressed;

      const float PI = 3.14159265359;

      // Kiyo x Pixel_Voxel Palette
      vec3 getPalette(int id) {
          if(id == 0) return vec3(1.0, 0.843, 0.0);    // Apollo Gold
          if(id == 1) return vec3(0.914, 0.118, 0.388);  // Deep Red/Pink
          if(id == 2) return vec3(0.145, 0.227, 0.369);  // ENDESGA Navy
          if(id == 3) return vec3(0.451, 0.824, 0.086);  // Lime Green
          if(id == 4) return vec3(0.0, 1.0, 1.0);        // Glitch Cyan
          if(id == 5) return vec3(1.0, 0.498, 0.153);    // Vibrant Orange
          if(id == 6) return vec3(0.85, 0.85, 0.95);     // Silver White
          return vec3(0.1, 0.1, 0.12);                   // Dark Void
      }

      float hash(float n) { 
          return fract(sin(n) * 43758.5453123); 
      }

      // Unique hash for the 5-dimensional quasiperiodic cell
      float cellHash(float k0, float k1, float k2, float k3, float k4) {
          float n = k0 * 1.0 + k1 * 7.0 + k2 * 43.0 + k3 * 281.0 + k4 * 1987.0;
          return hash(n);
      }

      // De Bruijn Pentagrid Method for Penrose-like Quasicrystal Tessellation
      vec4 evaluateGrid(vec2 p, float phaseOffset) {
          float k[5];
          float edgeDist = 1.0;
          
          // Phason shift (translating the 2D slice within the 5D hypercubic lattice)
          float mx = (u_mouse.x - 0.5) * 15.0;
          float my = (u_mouse.y - 0.5) * 15.0;

          for(int i = 0; i < 5; i++) {
              float theta = float(i) * PI / 5.0;
              vec2 v = vec2(cos(theta), sin(theta));
              
              // Apply time and interactive phason shifts
              float phase = u_time * 0.4 + phaseOffset + mx * cos(float(i)) + my * sin(float(i));
              float proj = dot(p, v) + phase;
              
              k[i] = floor(proj);
              float d = fract(proj);
              // Distance to the nearest grid line
              edgeDist = min(edgeDist, min(d, 1.0 - d));
          }

          float cid = cellHash(k[0], k[1], k[2], k[3], k[4]);
          return vec4(cid, k[0], k[1], edgeDist);
      }

      void main() {
          // Normalize pixel coordinates (from -1 to 1)
          vec2 p = (vUv - 0.5) * u_resolution / min(u_resolution.x, u_resolution.y);
          
          // Scale: inflation/deflation pulsing
          float scale = 10.0 + 2.0 * sin(u_time * 0.5);
          p *= scale;

          // Chromatic Aberration & Glitch Mechanics
          float glitchShift = 0.04 * sin(u_time * 3.0) + u_pressed * 0.1;
          
          vec4 gridR = evaluateGrid(p, 0.0);
          vec4 gridG = evaluateGrid(p, glitchShift);
          vec4 gridB = evaluateGrid(p, -glitchShift);

          // Use the Green channel as the primary structural anchor
          float cid = gridG.x;
          float edgeDist = gridG.w;

          // Collage Palette Selection
          int colorId1 = int(fract(cid * 17.3) * 8.0);
          int colorId2 = int(fract(cid * 23.1) * 8.0);
          vec3 baseCol = getPalette(colorId1);
          vec3 altCol = getPalette(colorId2);

          // Determine Pattern/Texture Style per Cell
          float patternType = fract(cid * 31.7);
          vec2 cellUv = p * 2.0;
          vec3 finalCol = baseCol;

          // Bayer 4x4 Dither Matrix (from pixel_voxel repo)
          const float bayer[16] = float[16](
              0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
             12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
              3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
             15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
          );
          int bx = int(gl_FragCoord.x) % 4;
          int by = int(gl_FragCoord.y) % 4;
          float bVal = bayer[by * 4 + bx];

          // Apply Psychedelic Collage Textures
          if (patternType < 0.2) {
              // Ditherpunk gradient blend
              float mixFactor = sin(cellUv.x * 3.0 + cellUv.y * 2.0 + u_time) * 0.5 + 0.5;
              finalCol = (mixFactor > bVal) ? baseCol : altCol;
          } else if (patternType < 0.4) {
              // Fractal Optics: Concentric Node Bursts
              float r = length(fract(p * 0.5) - 0.5);
              float ripple = step(0.5, fract(r * 15.0 - u_time * 3.0));
              finalCol = mix(baseCol, altCol, ripple);
          } else if (patternType < 0.6) {
              // Halftone dots
              vec2 grid = fract(cellUv * 3.0) - 0.5;
              float dist = length(grid);
              float radius = 0.25 + 0.2 * sin(u_time * 2.0 + cid * 10.0);
              float dotPatt = step(radius, dist);
              finalCol = mix(baseCol, altCol, dotPatt);
          } else if (patternType < 0.8) {
              // Kiyo Minimalist Stripes
              float stripe = step(0.5, fract(cellUv.x * 4.0 - cellUv.y * 4.0));
              finalCol = mix(baseCol, vec3(0.05), stripe);
          } else {
              // Solid bold color (Kiyo pop art style)
              finalCol = baseCol;
          }

          // Kiyo Style Outlines (Sobel-like edge detect on distance field)
          float outline = smoothstep(0.03, 0.05, edgeDist);
          finalCol *= outline;

          // Apply Chromatic Rupture (Fractal Optics Glitch)
          if (gridR.x != gridG.x) finalCol.r = 1.0; // Red bleed at phason boundaries
          if (gridB.x != gridG.x) finalCol.b = 1.0; // Blue bleed at phason boundaries

          // Interaction: Invert collage on press
          if (u_pressed > 0.5) {
              finalCol = 1.0 - finalCol;
          }

          // Analog decay / Signal snow
          float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          finalCol -= noise * 0.08;

          fragColor = vec4(finalCol, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
        u_pressed: { value: 0.0 }
      },
      vertexShader,
      fragmentShader
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

if (material && material.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  
  // Smooth mouse tracking with origin at bottom-left for GLSL
  const targetX = mouse.x / grid.width;
  const targetY = 1.0 - (mouse.y / grid.height);
  
  // Simple easing for organic interaction
  material.uniforms.u_mouse.value.x += (targetX - material.uniforms.u_mouse.value.x) * 0.1;
  material.uniforms.u_mouse.value.y += (targetY - material.uniforms.u_mouse.value.y) * 0.1;
  
  material.uniforms.u_pressed.value = mouse.isPressed ? 1.0 : 0.0;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);