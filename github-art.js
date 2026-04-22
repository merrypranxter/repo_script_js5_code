if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    renderer.autoClear = false;
    
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `;
    
    const fragmentShader = `
      precision highp float;
      out vec4 fragColor;
      in vec2 vUv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_mouse_pressed;

      // ---- Noise & Hash Functions ----
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }

      float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0);
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
                   i.z + vec4(0.0, i1.z, i2.z, 1.0))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 105.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      float fbm(vec3 p) {
          float f = 0.0;
          float amp = 0.5;
          for(int i = 0; i < 4; i++) {
              f += amp * snoise(p);
              p *= 2.0;
              amp *= 0.5;
          }
          return f;
      }

      vec2 curlNoise(vec2 p, float t) {
          float eps = 0.05;
          float n1 = snoise(vec3(p.x, p.y + eps, t));
          float n2 = snoise(vec3(p.x, p.y - eps, t));
          float n3 = snoise(vec3(p.x + eps, p.y, t));
          float n4 = snoise(vec3(p.x - eps, p.y, t));
          float a = (n1 - n2) / (2.0 * eps);
          float b = (n3 - n4) / (2.0 * eps);
          return vec2(a, -b);
      }

      // ---- Physics & Geometry ----
      float chladni(vec2 p, float m, float n) {
          float pi = 3.14159265;
          return sin(n * pi * p.x) * sin(m * pi * p.y) + sin(m * pi * p.x) * sin(n * pi * p.y);
      }

      vec3 palette(float t) {
          // Neon Acid / Ultraviolet Dream
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.33);
          vec3 c = vec3(2.0, 1.0, 1.0);
          vec3 d = vec3(0.5, 0.2, 0.25);
          return a + b * cos(6.28318 * (c * t + d));
      }

      // ---- Core Render Pass ----
      vec3 renderPass(vec2 uv, vec2 offset) {
          vec2 mouse = u_mouse * 2.0 - 1.0;
          mouse.x *= u_resolution.x / u_resolution.y;
          
          vec2 p = uv + offset;
          vec2 pCenter = p - mouse * 0.3 * u_mouse_pressed;
          float r = length(pCenter);
          
          // AdS Holographic Depth (boundary at r=1.0)
          float z = max(0.01, 1.0 - r * r); 
          float scale = 1.0 / z; 
          
          // Black Hole / Stretched Horizon at r=0.15
          float horizonDist = r - 0.15;
          float shell = exp(-abs(horizonDist) * 25.0);
          
          // Machine hesitation time
          float stTime = u_time * 0.15 + fbm(vec3(p, u_time * 0.1)) * 0.2;
          
          // Infall melt (information scrambled as it crosses horizon)
          float melt = smoothstep(0.2, -0.05, horizonDist);
          vec2 pWarped = pCenter * scale;
          pWarped += melt * curlNoise(pWarped * 4.0, stTime) * 0.6;
          
          // Domain Warp
          vec2 warp = curlNoise(pWarped * 0.6, stTime) * 0.4;
          pWarped += warp;
          
          // Host: Chladni Resonant Plate
          float m = floor(2.0 + 3.0 * sin(stTime * 0.5));
          float n = floor(4.0 + 3.0 * cos(stTime * 0.3));
          float ch = chladni(pWarped, m, n);
          float nodeDist = abs(ch);
          
          // Parasite: Entanglement Filaments / Fungal Growth
          float parasite = fbm(vec3(pWarped * 2.5, stTime * 1.5));
          float curlMag = length(curlNoise(pWarped * 3.0, stTime));
          
          // Infection thrives on nodes, but is fully scrambled near horizon
          float infection = smoothstep(0.5, 0.0, nodeDist) * smoothstep(0.2, 0.8, parasite);
          infection = mix(infection, parasite, melt * 0.8); 
          
          // Colors (Blacklight velvet void)
          vec3 voidColor = vec3(0.01, 0.0, 0.03);
          vec3 hostColor = vec3(0.05, 0.15, 0.3) * smoothstep(0.3, 0.0, nodeDist);
          
          // Structural Color on Parasite
          float thickness = infection + curlMag * 0.4 - stTime * 0.3;
          vec3 parasiteColor = palette(thickness);
          
          // Blacklight Bloom / Aura
          float bloom = exp(-nodeDist * (3.0 + 6.0 * parasite)) * 0.7;
          vec3 glow = palette(bloom - stTime * 0.1) * bloom * 2.0;
          
          // Horizon Shell Glow (Hawking radiation / Glyphfire)
          vec3 shellGlow = palette(shell * 1.5 + stTime) * shell * 1.8;
          
          // Compositing
          vec3 col = mix(voidColor, hostColor, 0.5);
          col = mix(col, parasiteColor, infection);
          col += glow * infection;
          col += shellGlow;
          
          // Horizon Void
          col *= smoothstep(-0.02, 0.05, horizonDist);
          
          // AdS Edge Saturation (Fade to black velvet at boundary)
          col *= smoothstep(0.0, 0.15, z);
          
          return col;
      }

      void main() {
          vec2 uv = vUv * 2.0 - 1.0;
          uv.x *= u_resolution.x / u_resolution.y;
          
          // CMYK Misregistration + Glitch
          float glitch = fbm(vec3(uv * 4.0, u_time * 0.5)) * (1.0 + u_mouse_pressed * 3.0);
          vec2 dir = normalize(uv + vec2(0.001)); 
          float shiftMag = 0.015 * glitch;
          
          vec2 rOffset = dir * shiftMag;
          vec2 gOffset = dir * -shiftMag * 0.5 + vec2(shiftMag * 0.5);
          vec2 bOffset = dir * -shiftMag;
          
          float r = renderPass(uv, rOffset).r;
          float g = renderPass(uv, gOffset).g;
          float b = renderPass(uv, bOffset).b;
          
          vec3 color = vec3(r, g, b);
          
          // Photocopy Noise / Paper Grain
          float grain = fract(sin(dot(vUv * 1000.0 + u_time, vec2(12.9898, 78.233))) * 43758.5453);
          color += (grain - 0.5) * 0.1;
          
          // Xerox Streak Artifacts
          float streak = snoise(vec3(vUv.x * 80.0, 0.0, u_time * 0.2)) * 0.5 + 0.5;
          streak = smoothstep(0.85, 1.0, streak) * 0.15;
          color += streak * vec3(0.6, 0.1, 0.8);
          
          // Halftone Dot Screen
          float freq = 180.0;
          float angle = 0.785398; // 45 degrees
          mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
          vec2 cellUv = rot * vUv * freq;
          vec2 cell = fract(cellUv) - 0.5;
          float dist = length(cell);
          float luma = dot(color, vec3(0.299, 0.587, 0.114));
          float dotRadius = sqrt(luma) * 0.55;
          float halftone = smoothstep(dotRadius + 0.15, dotRadius - 0.15, dist);
          
          color = mix(color * halftone, color, 0.6);
          
          // ACES Tonemapping
          color = (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14);
          
          fragColor = vec4(color, 1.0);
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
        u_mouse_pressed: { value: 0.0 }
      },
      depthWrite: false,
      depthTest: false
    });
    
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
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
  
  const mx = mouse.x / grid.width;
  const my = 1.0 - (mouse.y / grid.height);
  material.uniforms.u_mouse.value.set(mx, my);
  material.uniforms.u_mouse_pressed.value = mouse.isPressed ? 1.0 : 0.0;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);