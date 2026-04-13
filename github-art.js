if (!canvas.__three) {
  try {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) throw new Error("WebGL 2 not supported or context occupied");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
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
      uniform float u_mouse_pressed;

      #define TAU 6.28318530718

      // ---- VHS & Noise Utilities (from fluid_dynamics) ----
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      vec2 hash2(vec2 p) {
          p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
          return fract(sin(p) * 43758.5453);
      }

      float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          vec2 u = f*f*(3.0-2.0*f);
          return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x),
                     mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y);
      }

      float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          for(int i=0; i<5; i++) {
              v += a * noise(p);
              p *= 2.1;
              a *= 0.5;
          }
          return v;
      }

      // ---- Navier-Stokes Approx (Curl Noise) ----
      vec2 curl(vec2 p) {
          float e = 0.01;
          float n1 = fbm(p + vec2(0.0, e));
          float n2 = fbm(p - vec2(0.0, e));
          float n3 = fbm(p + vec2(e, 0.0));
          float n4 = fbm(p - vec2(e, 0.0));
          return vec2(n1 - n2, n4 - n3) / (2.0 * e);
      }

      // ---- Hexagonal Tessellation (from tesselations repo) ----
      float hexDistance(vec2 uv, float scale) {
          vec2 hex = vec2(uv.x * 1.1547005, uv.y + uv.x * 0.5773502) * scale;
          vec2 hexLocal = fract(hex) - 0.5;
          return max(abs(hexLocal.x), abs(hexLocal.y * 1.7320508 + hexLocal.x) / 2.0);
      }

      // ---- Birefringence Interference Colors ----
      vec3 birefringence_color(float retardation) {
          float delta = retardation * 6.0;
          float fR = sin(delta * 3.14159 / 1.20);
          float fG = sin(delta * 3.14159 / 1.00);
          float fB = sin(delta * 3.14159 / 0.80);
          vec3 col = vec3(fR*fR, fG*fG, fB*fB);
          float luma = dot(col, vec3(0.299, 0.587, 0.114));
          return mix(vec3(luma), col, 2.5); // Boost for neon look
      }

      // ---- Lisa Frank Maximalist Palette ----
      vec3 lisa_frank_palette(float t) {
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.5);
          vec3 c = vec3(2.0, 1.0, 0.0);
          vec3 d = vec3(0.50, 0.20, 0.25);
          return a + b * cos(TAU * (c * t + d));
      }

      // ---- Lisa Frank Leopard Spots (Cellular/Voronoi) ----
      float leopard_spots(vec2 uv) {
          vec2 i = floor(uv);
          vec2 f = fract(uv);
          float minDist = 1.0;
          for(int y=-1; y<=1; y++) {
              for(int x=-1; x<=1; x++) {
                  vec2 b = vec2(float(x), float(y));
                  vec2 pt = hash2(i + b);
                  pt = 0.5 + 0.4 * sin(u_time * 2.0 + TAU * pt);
                  vec2 r = b + pt - f;
                  float d = dot(r, r);
                  minDist = min(minDist, d);
              }
          }
          float ring = smoothstep(0.01, 0.08, minDist) - smoothstep(0.15, 0.35, minDist);
          ring *= smoothstep(0.2, 0.6, fbm(uv * 4.0 + u_time));
          return clamp(ring, 0.0, 1.0);
      }

      void main() {
          vec2 uv = vUv * 2.0 - 1.0;
          uv.x *= u_resolution.x / u_resolution.y;

          // VHS Tracking Error Glitch
          float frameT = floor(u_time * 29.97);
          float scanline = floor(vUv.y * 240.0);
          float jitterAmt = (hash(vec2(scanline, frameT)) - 0.5) * 0.025;
          float jitterMask = step(0.96, hash(vec2(scanline * 0.1, frameT)));
          uv.x += jitterAmt * jitterMask;

          // Mouse Injection (Marangoni Effect Proxy)
          vec2 m = u_mouse * 2.0 - 1.0;
          m.x *= u_resolution.x / u_resolution.y;
          float mouseDist = length(uv - m);
          float mouseForce = 0.0;
          if (u_mouse_pressed > 0.5) {
              mouseForce = exp(-mouseDist * 12.0);
          }

          vec3 finalColor = vec3(0.0);
          float spread = 0.01 + 0.005 * sin(u_time);

          // Chromatic Aberration Loop
          for(int c=0; c<3; c++) {
              vec2 offset = vec2(float(c - 1) * spread, 0.0);
              vec2 cuv = uv + offset;

              // Viscous Fingering Advection
              vec2 adv = cuv;
              for(int i=0; i<4; i++) {
                  vec2 vel = curl(adv * 1.8 + u_time * 0.25);
                  adv -= vel * 0.09;
                  if (u_mouse_pressed > 0.5) {
                      adv += normalize(adv - m) * mouseForce * 0.06;
                  }
              }

              // Underlying Tessellation
              float hexScale = 6.0 + 2.0 * sin(u_time * 0.2);
              float hd = hexDistance(adv, hexScale);
              float edge = smoothstep(0.42, 0.5, hd);

              // Fluid Stress (Birefringence)
              float stress = length(curl(adv * 4.0)) * 0.6;
              vec3 fluidColor = birefringence_color(stress + u_time * 0.15);

              // Blend with Lisa Frank Palette
              vec3 lfColor = lisa_frank_palette(fbm(adv * 1.2 - u_time * 0.5));
              fluidColor = mix(fluidColor, lfColor, 0.65);

              // Crystallization Fractures (Hot Magenta / Cyan edges)
              vec3 hexEdgeColor = vec3(1.0, 0.0, 0.8);
              if (c == 2) hexEdgeColor = vec3(0.0, 1.0, 0.9);
              fluidColor = mix(fluidColor, hexEdgeColor, edge * 0.85);

              // Floating Leopard Spots
              float spots = leopard_spots(adv * 7.0);
              vec3 spotColor = vec3(0.02, 0.0, 0.08); // Jet black
              fluidColor = mix(fluidColor, spotColor, spots * 0.95);
              fluidColor += vec3(0.0, 1.0, 0.8) * smoothstep(0.05, 0.25, spots) * 0.6; // Neon fringe

              if(c == 0) finalColor.r = fluidColor.r;
              if(c == 1) finalColor.g = fluidColor.g;
              if(c == 2) finalColor.b = fluidColor.b;
          }

          // Analog Snow (Luma Noise)
          float snow = hash(vUv * vec2(320.0, 240.0) + frameT);
          finalColor += snow * 0.18 * step(0.93, snow);

          fragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
      }
    `;
    
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0, 0) },
        u_mouse_pressed: { value: 0.0 }
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
    if (ctx) {
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, grid.width, grid.height);
      ctx.fillStyle = '#FF00CC';
      ctx.font = '14px monospace';
      ctx.fillText('WebGL2 Required for Lisa Frank Fluid Mechanics', 20, 40);
    }
    return;
  }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material && material.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  
  // Normalize mouse coordinates (0 to 1, with Y flipped to match WebGL UVs)
  const mx = mouse.x / grid.width;
  const my = 1.0 - (mouse.y / grid.height);
  
  // Smoothly interpolate mouse position if not pressed, snap if pressed
  material.uniforms.u_mouse.value.set(mx, my);
  material.uniforms.u_mouse_pressed.value = mouse.isPressed ? 1.0 : 0.0;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);