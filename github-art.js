try {
  if (!canvas.__three) {
    // Attempt to initialize WebGL2 context (Required for GLSL3)
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) throw new Error("WebGL 2 not supported or context occupied");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
    camera.position.z = 1;
    
    const fragmentShader = `
      in vec2 vUv;
      out vec4 fragColor;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      
      const float PI = 3.14159265359;
      
      // Hash & Simplex Noise for FBM
      vec2 hash22(vec2 p) {
          p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
          return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }
      
      float noise(vec2 p) {
          const float K1 = 0.366025404; // (sqrt(3)-1)/2
          const float K2 = 0.211324865; // (3-sqrt(3))/6
          vec2 i = floor(p + (p.x + p.y) * K1);
          vec2 a = p - i + (i.x + i.y) * K2;
          vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec2 b = a - o + K2;
          vec2 c = a - vec2(1.0, 1.0) + 2.0 * K2;
          vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
          vec3 n = h * h * h * h * vec3(dot(a, hash22(i)), dot(b, hash22(i + o)), dot(c, hash22(i + vec2(1.0, 1.0))));
          return dot(n, vec3(70.0));
      }
      
      float fbm(vec2 p) {
          float f = 0.0;
          float amp = 0.5;
          for (int i = 0; i < 5; i++) {
              f += amp * noise(p);
              p *= 2.0;
              amp *= 0.5;
          }
          return f;
      }
      
      // Ammann-Beenker 8-fold Quasicrystal Field
      float quasicrystal(vec2 uv, float t) {
          float value = 0.0;
          for (int i = 0; i < 8; i++) {
              float fi = float(i);
              float angle = 2.0 * PI * fi / 8.0;
              float phase = cos(angle) * uv.x + sin(angle) * uv.y;
              
              // Fluid warping (birefringence stress injection)
              phase += fbm(uv * 1.5 + t * 0.2) * 1.5;
              
              value += cos(phase * 10.0 - t * 2.0);
          }
          return value / 8.0;
      }
      
      // Lisa Frank Acid Neon Palette
      vec3 lisaFrankPalette(float t) {
          vec3 a = vec3(0.5);
          vec3 b = vec3(0.5);
          vec3 c = vec3(1.0);
          vec3 d = vec3(0.0, 0.33, 0.67);
          vec3 col = a + b * cos(6.28318 * (c * t + d));
          // Overclock saturation for 90s Lisa Frank neon (Cyan, Magenta, Yellow)
          col = smoothstep(0.0, 1.0, col);
          col = pow(col, vec3(0.6));
          return col;
      }
      
      void main() {
          // Center UVs and correct aspect ratio
          vec2 uv = (vUv - 0.5) * u_resolution.xy / min(u_resolution.x, u_resolution.y);
          uv *= 2.5; 
          
          // Mouse interaction (repulsion warp)
          vec2 mouse_uv = (u_mouse - 0.5) * u_resolution.xy / min(u_resolution.x, u_resolution.y);
          mouse_uv *= 2.5;
          vec2 dir = uv - mouse_uv;
          float dir_len = length(dir);
          if (dir_len > 0.0001) {
              uv += (dir / dir_len) * exp(-dir_len * 4.0) * 0.3 * sin(u_time * 3.0);
          }
          
          float t = u_time * 0.3;
          
          // Base quasicrystal heightmap
          float qc = quasicrystal(uv, t);
          
          // Calculate normal map via gradient
          float eps = 0.02;
          float dx = quasicrystal(uv + vec2(eps, 0.0), t) - qc;
          float dy = quasicrystal(uv + vec2(0.0, eps), t) - qc;
          vec3 N = normalize(vec3(dx * 6.0, dy * 6.0, 1.0));
          vec3 V = vec3(0.0, 0.0, 1.0);
          
          // View angle
          float viewAngle = max(0.0, dot(N, V));
          
          // Thin film interference (Michel-Lévy style)
          float thickness = fbm(uv * 3.0 - t) * 0.5 + 0.5;
          float opd = 2.0 * 1.5 * thickness * viewAngle;
          
          float interference = opd * 4.0 + qc * 1.5;
          
          // Base color
          vec3 color = lisaFrankPalette(interference - t * 2.0);
          
          // Birefringence contour lines
          float contour = fract(interference * 2.5);
          float line = smoothstep(0.0, 0.05, contour) * smoothstep(0.1, 0.05, contour);
          color = mix(color, vec3(1.0, 0.9, 0.5), line * 0.7); // Glowing gold lines
          
          // Lisa Frank Leopard Print Pattern Overlay
          vec2 spotUV = uv * 3.0;
          spotUV += vec2(fbm(spotUV + t), fbm(spotUV + vec2(10.0) - t)) * 1.5;
          float spotNoise = abs(noise(spotUV * 2.0));
          // Extract rings for leopard spots
          float leopard = smoothstep(0.1, 0.2, spotNoise) - smoothstep(0.3, 0.4, spotNoise);
          
          // Velvet purple/black spots with iridescent cyan halos
          vec3 spotColor = vec3(0.1, 0.0, 0.2) + 0.1 * sin(uv.xyx * 5.0 + t);
          float spotEdge = smoothstep(0.0, 0.1, spotNoise) - smoothstep(0.4, 0.5, spotNoise);
          color = mix(color, vec3(0.0, 1.0, 1.0), spotEdge * 0.4); 
          color = mix(color, spotColor, leopard * 0.85);
          
          // Specular highlights
          vec3 L = normalize(vec3(sin(t * 2.0), cos(t * 2.0), 1.5));
          vec3 H = normalize(L + V);
          float spec = pow(max(0.0, dot(N, H)), 30.0);
          color += spec * vec3(1.0, 0.5, 0.9); // Hot pink specular
          
          // Chromatic aberration (VHS tracking style)
          float wave = sin(vUv.y * 25.0 + u_time * 4.0) * 0.003;
          float split = 0.015 + abs(wave);
          
          float qc_r = quasicrystal(uv + vec2(split, 0.0), t);
          float qc_b = quasicrystal(uv - vec2(split, 0.0), t);
          vec3 color_r = lisaFrankPalette(opd * 4.0 + qc_r * 1.5 - t * 2.0);
          vec3 color_b = lisaFrankPalette(opd * 4.0 + qc_b * 1.5 - t * 2.0);
          
          color.r = mix(color.r, color_r.r, 0.5);
          color.b = mix(color.b, color_b.b, 0.5);
          
          // Twinkling Sparkles
          vec2 sparkleUV = fract(uv * 5.0 + t) - 0.5;
          float d_sparkle = length(sparkleUV);
          float star = (0.005 / d_sparkle) * smoothstep(0.2, 0.05, d_sparkle);
          float rnd = fract(sin(dot(floor(uv * 5.0 + t), vec2(12.9898, 78.233))) * 43758.5453);
          star *= step(0.95, rnd);
          star *= sin(u_time * 5.0 + uv.x * 50.0) * 0.5 + 0.5;
          color += star * vec3(1.0, 0.8, 1.0);
          
          // Scanlines
          float scanline = sin(vUv.y * 600.0) * 0.05;
          color -= scanline;
          
          // Vignette
          float vignette = 1.0 - length(vUv - 0.5) * 1.3;
          color *= smoothstep(0.0, 0.4, vignette);
          
          fragColor = vec4(color, 1.0);
      }
    `;
    
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: fragmentShader
    });
    
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);
    
    canvas.__three = { renderer, scene, camera, material };
  }
  
  const { renderer, scene, camera, material } = canvas.__three;
  
  if (material?.uniforms) {
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
    if (material.uniforms.u_mouse) {
      let mx = mouse.x / grid.width;
      let my = 1.0 - (mouse.y / grid.height);
      if (mouse.x === 0 && mouse.y === 0) { mx = 0.5; my = 0.5; }
      material.uniforms.u_mouse.value.set(mx, my);
    }
  }
  
  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  // Fallback if WebGL2 is not supported or context is lost
  if (ctx) {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, grid.width, grid.height);
    ctx.fillStyle = '#FF00FF';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WebGL2 Required for Lisa Frank Quasicrystal', grid.width / 2, grid.height / 2);
    ctx.fillStyle = '#00FFFF';
    ctx.fillText('Check console for errors.', grid.width / 2, grid.height / 2 + 30);
  }
}