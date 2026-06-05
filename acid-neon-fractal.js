try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
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
      precision highp float;
      
      in vec2 vUv;
      out vec4 fragColor;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      
      // [REPO: color_fields] OKLCh to sRGB conversion for perceptually uniform neon acid colors
      vec3 oklch_to_srgb(float L, float C, float h) {
          float a = C * cos(h);
          float b = C * sin(h);
          float l_ = L + 0.3963377774 * a + 0.2158037573 * b;
          float m_ = L - 0.1055613458 * a - 0.0638541728 * b;
          float s_ = L - 0.0894841775 * a - 1.2914855480 * b;
          float l = l_*l_*l_;
          float m = m_*m_*m_;
          float s = s_*s_*s_;
          vec3 rgb = vec3(
               4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
              -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
              -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
          );
          // Gamma correction
          return mix(rgb * 12.92, 1.055 * pow(max(rgb, 0.0), vec3(1.0/2.4)) - 0.055, step(0.0031308, rgb));
      }

      // [REPO: structural_color] Thin-film interference Bragg reflection (Chitin n=1.56)
      vec3 thinFilm(float thickness) {
          vec3 lambda = vec3(650.0, 510.0, 450.0);
          vec3 phase = (2.0 * 1.56 * thickness) / lambda;
          return 0.5 + 0.5 * cos(6.2831853 * phase);
      }
      
      // [REPO: retrofuturism] CRT monitor bulge
      vec2 crtWarp(vec2 uv) {
          vec2 cc = uv - 0.5;
          float r = dot(cc, cc);
          return uv + cc * (r * 0.15);
      }

      void main() {
          vec2 uv = crtWarp(vUv);
          
          // [REPO: THE-LISTS] Glitch Aesthetics: out of bounds masking
          if(uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
              fragColor = vec4(0.05, 0.0, 0.1, 1.0);
              return;
          }

          vec2 p = (uv - 0.5) * 2.0 * vec2(u_resolution.x/u_resolution.y, 1.0);
          
          // Dynamic zoom and pan
          float zoom = 1.2 + sin(u_time * 0.1) * 0.3;
          vec2 z = p * zoom;
          
          // [REPO: fractals] Julia set of the Burning Ship
          vec2 c = vec2(-0.835, -0.2321) + vec2(sin(u_time*0.25), cos(u_time*0.31)) * 0.08;
          
          float iter = 0.0;
          float trap = 1e10;
          vec2 dz = vec2(1.0, 0.0);
          
          for(int i = 0; i < 150; i++) {
              // [REPO: mycelial_networks] Anastomosis curl interference (hyphal tip wandering)
              z += vec2(sin(z.y * 8.0 + u_time), cos(z.x * 8.0 - u_time)) * 0.008;
              
              // Burning ship core math
              z = vec2(abs(z.x), abs(z.y));
              
              // Distance estimator derivative tracking
              dz = 2.0 * vec2(z.x*dz.x - z.y*dz.y, z.x*dz.y + z.y*dz.x) + vec2(1.0, 0.0);
              z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
              
              // [REPO: THE-LISTS] Divine Data Corruption: Periodic geometric fracturing
              if (mod(float(i), 19.0) == 0.0) {
                  z *= 1.0 + 0.2 * sin(u_time * 5.0 + z.x * 10.0);
              }
              
              trap = min(trap, abs(z.x * z.y)); // Cross trap
              
              if(dot(z, z) > 256.0) break;
              iter += 1.0;
          }
          
          vec3 color = vec3(0.0);
          
          if(iter < 149.0) {
              // Smooth escape calculation
              float smooth_n = iter - log2(log2(dot(z,z))) + 4.0;
              float de = sqrt(dot(z,z)/dot(dz,dz)) * log(dot(z,z)) * 0.5;
              
              // [REPO: color_fields] Neon Acid Palette mapping via OKLCh
              float L = 0.65 + 0.25 * sin(de * 60.0 - u_time * 4.0);
              float C = 0.35; // Maximum acidic chroma
              float h = smooth_n * 0.15 - u_time * 0.5 + trap * 3.0;
              
              vec3 neon = oklch_to_srgb(L, C, h);
              
              // [REPO: structural_color] Iridescent thin-film overlay based on distance estimator
              vec3 film = thinFilm(de * 1500.0 + trap * 200.0);
              
              color = mix(neon, film, 0.4);
              
              // [REPO: mycelial_networks] Enzymatic Lignin Peroxidase bleaching halo
              color += vec3(0.9, 0.1, 0.5) * exp(-de * 25.0) * 1.5;
              
          } else {
              // [REPO: mycelial_networks] Interior Foxfire Bioluminescence
              float foxfire = 0.1 + 0.9 * sin(trap * 30.0 + u_time * 2.0);
              color = vec3(0.02, 0.95, 0.48) * foxfire;
          }
          
          // [REPO: THE-LISTS] Glitch Aesthetics: Spectral Tear
          float noise = fract(sin(dot(uv, vec2(12.9898, 78.233)) + u_time) * 43758.5453);
          if (noise > 0.99) {
              color.r = fract(color.r + 0.5);
              color.b = fract(color.b + 0.5);
          }
          
          // Vignette
          color *= 1.0 - length(uv - 0.5) * 0.6;
          
          fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
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
  }

  const { renderer, scene, camera, material } = canvas.__three;
  
  if (material && material.uniforms) {
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("WebGL Initialization Failed:", e);
}