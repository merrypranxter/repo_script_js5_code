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
      uniform float u_is_pressed;

      // Noise & FBM
      float hash21(vec2 p) {
          p = fract(p * vec2(12.9898, 78.233));
          p += dot(p, p + 34.56);
          return fract(p.x * p.y);
      }

      float hash3(vec3 p3) {
          p3  = fract(p3 * .1031);
          p3 += dot(p3, p3.zyx + 31.32);
          return fract((p3.x + p3.y) * p3.z);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f*f*(3.0-2.0*f);
          return mix(mix(hash21(i + vec2(0.0,0.0)), hash21(i + vec2(1.0,0.0)), u.x),
                     mix(hash21(i + vec2(0.0,1.0)), hash21(i + vec2(1.0,1.0)), u.x), u.y);
      }

      float fbm(vec2 p) {
          float v = 0.0; float a = 0.5;
          for (int i=0; i<4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
          return v;
      }

      // Chladni Plate Vibration Modes
      float chladni(vec2 p, float m, float n) {
          return sin(n * p.x) * sin(m * p.y) + sin(m * p.x) * sin(n * p.y);
      }

      // Structural Topography
      float map(vec2 p) {
          float mx = mix(0.5, u_mouse.x, 0.5);
          float my = mix(0.5, u_mouse.y, 0.5);
          
          float m1 = floor(mix(1.0, 8.0, mx));
          float n1 = floor(mix(1.0, 8.0, my));
          
          float m2 = floor(mix(1.0, 8.0, my));
          float n2 = floor(mix(1.0, 8.0, mx));
          
          // Shoegaze Phase Drift (Domain Warping)
          vec2 drift = vec2(fbm(p * 3.0 + u_time * 0.2), fbm(p * 3.0 - u_time * 0.2)) * 0.2;
          if (u_is_pressed > 0.5) drift *= 4.0; // Overclocked tear
          p += drift;
          
          float c1 = chladni(p * 3.0, m1, n1);
          float c2 = chladni(p * 3.0, m2, n2);
          
          // Temporal crossfade between nodal states
          float blend = smoothstep(-0.5, 0.5, sin(u_time * 0.3));
          
          // Envelope
          float env = smoothstep(1.5, 0.0, length(p) * 0.4);
          return mix(c1, c2, blend) * env;
      }

      // Lisa Frank / CD Iridescent Palette
      vec3 neonPalette(float t) {
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.5);
          vec3 c = vec3(1.0, 1.0, 1.0);
          vec3 d = vec3(0.8, 0.0, 0.4); 
          vec3 col = a + b * cos(6.28318 * (c * t + d));
          // Brutal saturation boost
          col = mix(vec3(dot(col, vec3(0.333))), col, 1.8);
          return clamp(col, 0.0, 1.0);
      }

      // Thin-Film Interference Optics
      vec3 getIridescence(vec2 uv, float offset) {
          vec2 eps = vec2(0.015, 0.0);
          float h0 = map(uv);
          float hx = map(uv + eps.xy) - map(uv - eps.xy);
          float hy = map(uv + eps.yx) - map(uv - eps.yx);
          
          vec3 N = normalize(vec3(-hx, -hy, 1.2)); // Z controls harshness of normals
          vec3 V = normalize(vec3(0.0, 0.0, 1.0));
          
          float cosTheta = max(0.0, dot(N, V));
          
          // Bragg reflection / Thin film thickness mapping
          float film_thickness = max(100.0, 400.0 + abs(h0) * 300.0 + offset * 250.0);
          float n_film = 1.45;
          
          // Optical Path Difference
          float pathDiff = 2.0 * n_film * film_thickness * sqrt(max(0.0, 1.0 - pow(sin(acos(cosTheta))/n_film, 2.0)));
          
          float t = pathDiff / 700.0;
          vec3 color = neonPalette(t);
          
          // Fake wet specular hit
          float spec = pow(max(0.0, dot(N, normalize(vec3(0.5, 0.5, 1.0)))), 24.0);
          color += spec * 0.7;
          
          return color;
      }

      // 4x4 Bayer Matrix for Ordered Dithering
      float getBayer(vec2 fc) {
          int x = int(mod(fc.x, 4.0));
          int y = int(mod(fc.y, 4.0));
          if(x==0 && y==0) return 0.0;
          if(x==1 && y==0) return 0.5;
          if(x==2 && y==0) return 0.125;
          if(x==3 && y==0) return 0.625;
          if(x==0 && y==1) return 0.75;
          if(x==1 && y==1) return 0.25;
          if(x==2 && y==1) return 0.875;
          if(x==3 && y==1) return 0.375;
          if(x==0 && y==2) return 0.1875;
          if(x==1 && y==2) return 0.6875;
          if(x==2 && y==2) return 0.0625;
          if(x==3 && y==2) return 0.5625;
          if(x==0 && y==3) return 0.9375;
          if(x==1 && y==3) return 0.4375;
          if(x==2 && y==3) return 0.8125;
          return 0.3125;
      }

      void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          vec2 p = (uv - 0.5) * 2.0;
          p.x *= u_resolution.x / u_resolution.y;
          
          // Misregistration Drift (Shoegaze Print Memory)
          float tear = smoothstep(0.8, 1.0, fbm(vec2(p.y * 10.0, u_time)));
          float aberration = 0.06 * fbm(p * 5.0 - u_time) + tear * 0.15;
          if (u_is_pressed > 0.5) aberration += 0.2; // Glitch fracture
          
          // Chromatic Aberration sampling
          vec3 col;
          col.r = getIridescence(p + vec2(aberration, 0.0), aberration).r;
          col.g = getIridescence(p, 0.0).g;
          col.b = getIridescence(p - vec2(aberration, 0.0), -aberration).b;
          
          // Thermal Bloom / Shoegaze Halation
          vec3 bloom = max(vec3(0.0), col - 0.55);
          col += bloom * vec3(1.2, 0.4, 0.9) * 2.2;
          
          // Xerox Generation Loss / Ditherpunk Quantization
          float ditherVal = getBayer(gl_FragCoord.xy) - 0.5;
          float steps = 4.0; // Brutal limitation
          col = col + ditherVal * 0.5; 
          col = floor(col * steps + 0.5) / steps;
          
          // Dead Pixel Pollen
          float pollen = step(0.997, hash3(vec3(gl_FragCoord.xy + vec2(u_time * 80.0, u_time * -50.0), floor(u_time * 12.0))));
          col = mix(col, vec3(0.0, 1.0, 0.8), pollen); // Neon cyan infection
          
          // Film Grain Clumps
          float grain = (hash3(vec3(gl_FragCoord.xy, u_time)) - 0.5) * 0.22;
          col += grain;
          
          // Scanline Haze
          float scanline = sin(uv.y * u_resolution.y * 0.5) * 0.04;
          col -= scanline;
          
          // Soft Contrast Curve & Vignette
          col = smoothstep(0.0, 1.0, col);
          float vig = length(uv - 0.5);
          col *= smoothstep(1.3, 0.2, vig);
          
          fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
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
        u_is_pressed: { value: 0 }
      }
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
  } catch (e) {
    console.error("WebGL Init Failed:", e);
    return;
  }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material && material.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  
  const targetMx = mouse.x / grid.width;
  const targetMy = 1.0 - (mouse.y / grid.height);
  
  if (isNaN(material.uniforms.u_mouse.value.x)) {
    material.uniforms.u_mouse.value.set(0.5, 0.5);
  }
  
  material.uniforms.u_mouse.value.x += (targetMx - material.uniforms.u_mouse.value.x) * 0.08;
  material.uniforms.u_mouse.value.y += (targetMy - material.uniforms.u_mouse.value.y) * 0.08;
  material.uniforms.u_is_pressed.value = mouse.isPressed ? 1.0 : 0.0;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);