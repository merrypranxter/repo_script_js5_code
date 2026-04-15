if (!canvas.__three) {
  try {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) throw new Error("WebGL 2 not supported or context occupied");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
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

      // Hash for Worley & Blocks
      vec2 hash22(vec2 p) {
          p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
          return fract(sin(p) * 43758.5453);
      }
      
      float hash12(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      // Chebyshev Worley (Crystalline Facets)
      vec2 worleyChebyshev(vec2 p) {
          vec2 n = floor(p);
          vec2 f = fract(p);
          float d1 = 8.0, d2 = 8.0;
          for (int j = -1; j <= 1; j++) {
              for (int i = -1; i <= 1; i++) {
                  vec2 g = vec2(float(i), float(j));
                  vec2 o = hash22(n + g);
                  o = 0.5 + 0.5 * sin(u_time * 0.8 + 6.2831 * o);
                  vec2 r = g + o - f;
                  float d = max(abs(r.x), abs(r.y)); // Chebyshev distance
                  if (d < d1) { d2 = d1; d1 = d; } 
                  else if (d < d2) { d2 = d; }
              }
          }
          return vec2(d1, d2);
      }

      // Clifford Attractor Warp (Strange Attractors)
      vec2 cliffordWarp(vec2 p, float a, float b, float c, float d) {
          float x_new = sin(a * p.y) + c * cos(a * p.x);
          float y_new = sin(b * p.x) + d * cos(b * p.y);
          return vec2(x_new, y_new);
      }

      // Hyperpop Palette (Lisa Frank / Glitchcore)
      vec3 getHyperpopColor(float t) {
          t = fract(t);
          vec3 c1 = vec3(1.0, 0.0, 0.5); // Hot Magenta
          vec3 c2 = vec3(0.0, 1.0, 1.0); // Electric Cyan
          vec3 c3 = vec3(0.7, 1.0, 0.0); // Acid Lime
          vec3 c4 = vec3(0.3, 0.0, 1.0); // Deep Violet
          
          if (t < 0.25) return mix(c1, c2, smoothstep(0.0, 0.25, t));
          if (t < 0.50) return mix(c2, c3, smoothstep(0.25, 0.50, t));
          if (t < 0.75) return mix(c3, c4, smoothstep(0.50, 0.75, t));
          return mix(c4, c1, smoothstep(0.75, 1.0, t));
      }

      // Scene evaluation
      float scene(vec2 p) {
          float a = 1.5 + sin(u_time * 0.15) * 0.4 + u_mouse.x * 0.5;
          float b = -1.5 + cos(u_time * 0.22) * 0.4 + u_mouse.y * 0.5;
          float c = 1.2 + sin(u_time * 0.27) * 0.3;
          float d = -1.2 + cos(u_time * 0.31) * 0.3;

          vec2 pos = p * 2.0;
          
          // Iterative domain warp
          for(int i = 0; i < 3; i++) {
              pos = cliffordWarp(pos, a, b, c, d) * 1.4 + p * 0.2;
          }
          
          // Crystal Lattice (Worley Chebyshev)
          vec2 w = worleyChebyshev(pos * 1.2);
          float crystal = w.y - w.x; // F2 - F1
          
          // Faceting (quantization)
          float facet = step(0.3, fract(crystal * 5.0));
          
          return crystal + facet * 0.15;
      }

      void main() {
          vec2 uv = vUv;
          vec2 p = uv * 2.0 - 1.0;
          p.x *= u_resolution.x / u_resolution.y;
          
          // Stutter / Motion Echo (Temporal Glitch)
          float stutter = step(0.92, fract(u_time * 0.8)); 
          
          // Macroblock Breakup (Compression Chew)
          vec2 blockP = p;
          if (stutter > 0.0) {
              float blockSize = 0.15;
              vec2 block = floor(p / blockSize) * blockSize;
              if (hash12(block + floor(u_time * 10.0)) > 0.6) {
                  blockP = block + 0.05; // Misalignment
              }
          }
          
          // Glitchcore / Artifact Drivers
          float edgeBias = length(blockP);
          
          // RGB Channel Split (Chromatic Aberration)
          float splitStrength = (0.04 + stutter * 0.05) * edgeBias;
          vec2 offset = normalize(blockP + 0.001) * splitStrength; 
          
          // Sample channels
          float r = scene(blockP + offset);
          float g = scene(blockP);
          float b = scene(blockP - offset);
          
          // Map to Hyperpop palette
          vec3 colR = getHyperpopColor(r + u_time * 0.2);
          vec3 colG = getHyperpopColor(g + u_time * 0.2 + 0.1);
          vec3 colB = getHyperpopColor(b + u_time * 0.2 + 0.2);
          
          // Composite RGB
          vec3 finalCol = vec3(colR.r, colG.g, colB.b);
          
          // Overprint Stacking (Psychedelic Collage)
          float ghostVal = scene(blockP * 0.95);
          vec3 ghostCol = getHyperpopColor(ghostVal + (u_time - 0.2) * 0.2);
          
          // Screen Blend
          finalCol = 1.0 - (1.0 - finalCol) * (1.0 - ghostCol * 0.6);
          
          // Bloom Contamination
          finalCol += pow(max(0.0, g), 3.0) * vec3(1.0, 0.4, 0.8) * 0.8;
          
          // Scanline & CRT Contour
          float scanline = sin(vUv.y * u_resolution.y * 0.6) * 0.06;
          finalCol -= scanline;
          
          // Vignette
          finalCol *= smoothstep(1.8, 0.5, edgeBias);
          
          fragColor = vec4(finalCol, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_mouse: { value: new THREE.Vector2(0, 0) },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
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
    console.error("WebGL 2 Init Failed", e);
    return;
  }
}

const { renderer, scene, camera, material } = canvas.__three;
if (material && material.uniforms) {
  material.uniforms.u_time.value = time;
  const mx = (mouse.x / grid.width) * 2.0 - 1.0;
  const my = -(mouse.y / grid.height) * 2.0 + 1.0;
  material.uniforms.u_mouse.value.set(mx, my);
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);