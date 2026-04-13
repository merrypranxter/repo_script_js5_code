if (!canvas.__three) {
  try {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) throw new Error("WebGL 2 not supported or context occupied");

    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
    camera.position.z = 1;

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
      uniform float u_pixel_scale;

      // Bayer 4x4 Dither Matrix (from pixel_voxel repo)
      const float bayer4[16] = float[16](
          0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
         12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
          3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
         15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
      );

      // Lisa Frank x Ditherpunk Neon Palette
      const vec3 palette[8] = vec3[8](
          vec3(0.06, 0.07, 0.17), // 0: Dark Void (Deep Navy)
          vec3(0.40, 0.10, 0.60), // 1: Deep Violet
          vec3(1.00, 0.00, 0.50), // 2: Hot Pink
          vec3(1.00, 0.50, 0.00), // 3: Neon Orange
          vec3(1.00, 0.90, 0.00), // 4: Acid Yellow
          vec3(0.00, 0.90, 0.40), // 5: Toxic Green
          vec3(0.00, 0.80, 1.00), // 6: Electric Cyan
          vec3(1.00, 1.00, 1.00)  // 7: Bright White
      );

      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      // Crystalline primitives
      float sdOctahedron(vec3 p, float s) {
          p = abs(p);
          return (p.x + p.y + p.z - s) * 0.57735027;
      }

      float sdBox(vec3 p, vec3 b) {
          vec3 q = abs(p) - b;
          return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
      }

      vec2 map(vec3 p) {
          vec3 q = p;
          
          // Spatial Twist
          q.xy *= rot(q.z * 0.05 + u_time * 0.1);
          
          // Hyperbolic / P6m Kaleidoscopic Tiling Fold (from tessellations repo)
          float a = atan(q.y, q.x);
          float r = length(q.xy);
          float an = 3.14159265 / 3.0; // 6-fold symmetry
          a = mod(a + an * 0.5, an) - an * 0.5;
          a = abs(a);
          q.xy = vec2(cos(a), sin(a)) * r;
          
          // Fly through the infinite lattice
          q.z -= u_time * 3.0;
          
          // Domain Repetition (Crystalline Lattice)
          vec3 id = floor(q / 1.5);
          q = mod(q, 1.5) - 0.75;
          
          // Crystal Rotation & Distortion
          q.xy *= rot(u_time * 0.5 + id.z);
          q.xz *= rot(u_time * 0.7 + id.x);
          
          // Morphing Crystal Shapes (Octahedron + Box)
          float oct = sdOctahedron(q, 0.4);
          float box = sdBox(q, vec3(0.25));
          float crystal = mix(oct, box, 0.5 + 0.5 * sin(u_time * 1.5 + id.z * 10.0));
          
          // Hollow Core for the tunnel
          float core = length(p.xy) - 1.2;
          float d = max(crystal, -core);
          
          // High-speed floating center debris
          vec3 dq = p;
          dq.z -= u_time * 6.0;
          vec3 did = floor(dq / 3.0);
          dq = mod(dq, 3.0) - 1.5;
          dq.xy *= rot(u_time * 2.0 + did.z);
          dq.xz *= rot(u_time * 1.5 + did.y);
          float debris = sdOctahedron(dq, 0.2);
          
          if(length(p.xy) < 1.0) {
              d = min(d, debris);
          }
          
          return vec2(d, 1.0);
      }

      vec3 calcNormal(vec3 p) {
          vec2 e = vec2(0.005, 0.0);
          return normalize(vec3(
              map(p + e.xyy).x - map(p - e.xyy).x,
              map(p + e.yxy).x - map(p - e.yxy).x,
              map(p + e.yyx).x - map(p - e.yyx).x
          ));
      }

      // Perceptual Nearest-Color Palette Mapping
      vec3 nearestPalette(vec3 col) {
          vec3 best = palette[0];
          float bestDist = 9999.0;
          vec3 weights = vec3(0.299, 0.587, 0.114);
          
          for(int i = 0; i < 8; i++) {
              vec3 diff = col - palette[i];
              float d = dot(diff * diff, weights);
              if(d < bestDist) {
                  bestDist = d;
                  best = palette[i];
              }
          }
          return best;
      }

      void main() {
          // 1. Pixel Grid Lock (Ditherpunk foundation)
          float pixelScale = max(1.0, u_pixel_scale);
          vec2 fragCoordLocked = floor(gl_FragCoord.xy / pixelScale) * pixelScale;
          vec2 uv = (fragCoordLocked - 0.5 * u_resolution.xy) / u_resolution.y;
          
          // Camera
          vec3 ro = vec3(0.0, 0.0, 0.0);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          // Parallax Mouse Interaction
          vec2 m = (u_mouse / u_resolution - 0.5) * 2.0;
          rd.yz *= rot(-m.y * 0.5);
          rd.xz *= rot(-m.x * 0.5);
          
          // Raymarch
          float t = 0.0;
          for(int i = 0; i < 80; i++) {
              vec3 p = ro + rd * t;
              vec2 res = map(p);
              if(res.x < 0.002) break;
              t += res.x * 0.8; 
              if(t > 25.0) break;
          }
          
          vec3 col = palette[0];
          
          if(t < 25.0) {
              vec3 p = ro + rd * t;
              vec3 n = calcNormal(p);
              
              // Base Color based on depth and angle
              float colorMix = fract(p.z * 0.05 + u_time * 0.2);
              vec3 baseCol;
              if(colorMix < 0.25) baseCol = palette[2];      // Pink
              else if(colorMix < 0.50) baseCol = palette[6]; // Cyan
              else if(colorMix < 0.75) baseCol = palette[4]; // Yellow
              else baseCol = palette[5];                     // Green
              
              // Birefringence / Iridescence simulation
              float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 1.5);
              baseCol = mix(baseCol, palette[3], fresnel);   // Orange edges
              
              // Lighting
              vec3 lig = normalize(vec3(0.5, 0.8, -0.5));
              float dif = max(0.0, dot(n, lig));
              float amb = 0.4;
              float spec = pow(max(0.0, dot(reflect(-lig, n), -rd)), 32.0);
              
              col = baseCol * (dif + amb) + spec * palette[7];
              
              // Sobel Outline Approximation
              float edge = max(0.0, dot(n, -rd));
              if(edge < 0.25) {
                  col = palette[0];
              }
              
              // Fog
              col = mix(col, palette[0], smoothstep(12.0, 25.0, t));
          }
          
          // 2. Ordered Dithering Application
          int bx = int(mod(fragCoordLocked.x / pixelScale, 4.0));
          int by = int(mod(fragCoordLocked.y / pixelScale, 4.0));
          float bayerVal = bayer4[by * 4 + bx];
          
          float spread = 0.35;
          col += (bayerVal - 0.5) * spread;
          
          // 3. Palette Mapping (Snap to Lisa Frank 8-color space)
          col = nearestPalette(col);
          
          fragColor = vec4(col, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0, 0) },
        u_pixel_scale: { value: 4.0 }
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

if (material?.uniforms) {
  if (material.uniforms.u_time) {
    material.uniforms.u_time.value = time;
  }
  if (material.uniforms.u_resolution) {
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }
  if (material.uniforms.u_mouse) {
    material.uniforms.u_mouse.value.set(mouse.x, mouse.y);
  }
  if (material.uniforms.u_pixel_scale) {
    // Crunch the resolution hard when the mouse is pressed (Ditherpunk overdrive)
    const targetScale = mouse.isPressed ? 12.0 : 4.0;
    material.uniforms.u_pixel_scale.value += (targetScale - material.uniforms.u_pixel_scale.value) * 0.1;
  }
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);