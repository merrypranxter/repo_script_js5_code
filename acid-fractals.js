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
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      
      in vec2 vUv;
      out vec4 fragColor;

      #define PI 3.14159265359

      // --- SIMPLEX NOISE (from noise_fields) ---
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+10.0)*x); }
      float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1;
          i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m ;
          m = m*m ;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 a0 = x - floor(x + 0.5);
          m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
      }

      // --- COMPLEX MATH (from fractals) ---
      vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
      vec2 cdiv(vec2 a, vec2 b) { float d = dot(b, b); return vec2(dot(a, b), a.y*b.x - a.x*b.y) / d; }
      vec2 cpow4(vec2 z) { vec2 z2 = cmul(z, z); return cmul(z2, z2); }
      vec2 cpow5(vec2 z) { return cmul(cpow4(z), z); }

      // --- NEON ACID PALETTE (from color_fields) ---
      vec3 neonAcid(float t) {
          t = fract(t);
          vec3 c0 = vec3(1.0, 0.0, 1.0); // #ff00ff (Magenta)
          vec3 c1 = vec3(0.0, 1.0, 1.0); // #00ffff (Cyan)
          vec3 c2 = vec3(1.0, 1.0, 0.0); // #ffff00 (Yellow)
          vec3 c3 = vec3(1.0, 0.2, 0.0); // #ff3300 (Red-Orange)
          vec3 c4 = vec3(0.0, 1.0, 0.4); // #00ff66 (Neon Green)
          
          float p = t * 5.0;
          if(p < 1.0) return mix(c0, c1, p);
          if(p < 2.0) return mix(c1, c2, p - 1.0);
          if(p < 3.0) return mix(c2, c3, p - 2.0);
          if(p < 4.0) return mix(c3, c4, p - 3.0);
          return mix(c4, c0, p - 4.0);
      }

      // --- KALEIDOSCOPE & HALFTONE (from psychedelic_collage) ---
      vec2 kaleidoscope(vec2 uv, float folds) {
          float angle = atan(uv.y, uv.x);
          float radius = length(uv);
          float sector = (2.0 * PI) / folds;
          angle = mod(angle, sector);
          if (angle > sector * 0.5) angle = sector - angle;
          return vec2(cos(angle), sin(angle)) * radius;
      }

      float halftone(vec2 fragCoord, float freq, float angle, float luma) {
          float rad = radians(angle);
          mat2 rot = mat2(cos(rad), -sin(rad), sin(rad), cos(rad));
          vec2 uv = rot * fragCoord * freq / 1024.0;
          vec2 cell = fract(uv) - 0.5;
          float dist = length(cell);
          float dotRadius = sqrt(1.0 - luma) * 0.5;
          return smoothstep(dotRadius + 0.1, dotRadius - 0.1, dist);
      }

      // --- FRACTAL GENERATOR ---
      vec3 renderFractal(vec2 uv, float channelOffset) {
          // 1. Domain Warp
          vec2 warpedUv = uv + snoise(uv * 2.0 - u_time * 0.3) * 0.15;
          
          // 2. Kaleidoscope (10-fold symmetry)
          warpedUv = kaleidoscope(warpedUv, 10.0);
          
          // 3. Newton Fractal (z^5 - 1)
          vec2 z = warpedUv * 2.5;
          
          // Breathing rotation
          float rot = u_time * 0.2 + snoise(vec2(u_time * 0.1, 0.0)) * 0.5;
          z = vec2(z.x * cos(rot) - z.y * sin(rot), z.x * sin(rot) + z.y * cos(rot));

          int iter = 0;
          float trap = 100.0;
          for(int i = 0; i < 35; i++) {
              vec2 z5 = cpow5(z);
              vec2 fz = z5 - vec2(1.0, 0.0);
              vec2 fpz = 5.0 * cpow4(z);
              
              // Organic relaxation wobble
              float relax = 0.85 + 0.25 * sin(u_time * 2.0 + length(z) * 3.0);
              z = z - relax * cdiv(fz, fpz);
              
              trap = min(trap, length(z - vec2(1.0, 0.0)));
              
              if(length(fz) < 0.01) {
                  iter = i;
                  break;
              }
          }
          
          // Color Mapping
          float angle = atan(z.y, z.x);
          float root = (angle + PI) / (2.0 * PI);
          float smoothI = float(iter) * 0.04;
          
          float t = root + smoothI - u_time * 0.15 + channelOffset;
          vec3 col = neonAcid(t);
          
          // Shading / Depth
          col *= smoothstep(0.0, 0.8, trap * 2.5 + 0.2);
          col += vec3(0.2) * exp(-float(iter) * 0.15); // Glow core
          
          return col;
      }

      void main() {
          vec2 uv = vUv * 2.0 - 1.0;
          uv.x *= u_resolution.x / u_resolution.y;
          
          // Mouse interaction (shifts the center of the fractal universe)
          uv -= (u_mouse * 2.0 - 1.0) * 0.2;
          
          // --- CMYK Misregistration (Glitch Scan-Bend style) ---
          float glitch = snoise(vec2(u_time * 3.0, uv.y * 15.0)) * 0.015;
          vec2 offR = vec2(0.012 + glitch, 0.0);
          vec2 offG = vec2(-0.008, 0.01 + glitch);
          vec2 offB = vec2(0.0, -0.012);
          
          float r = renderFractal(uv + offR, 0.0).r;
          float g = renderFractal(uv + offG, 0.33).g;
          float b = renderFractal(uv + offB, 0.66).b;
          
          vec3 col = vec3(r, g, b);
          
          // --- Print Artifacts: Halftone & Grain ---
          float luma = dot(col, vec3(0.299, 0.587, 0.114));
          float ht = halftone(gl_FragCoord.xy, 130.0, 15.0, luma);
          
          // Multiply blend halftone to simulate ink
          col = mix(col * ht, col, 0.55); 
          
          // Electrostatic Xerox Grain
          float grain = fract(sin(dot(vUv * (100.0 + u_time), vec2(127.1, 311.7))) * 43758.5453);
          col += (grain - 0.5) * 0.15;
          
          // Soft Vignette
          float d = length(vUv - 0.5) * 2.0;
          col *= 1.0 - smoothstep(0.6, 1.5, d);
          
          fragColor = vec4(col, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
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

if (material && material.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  
  // Normalize mouse to 0.0 - 1.0, with y inverted for GLSL
  const mx = mouse.x / grid.width;
  const my = 1.0 - (mouse.y / grid.height);
  
  // Smoothly interpolate mouse to avoid jerky glitches if mouse leaves canvas
  material.uniforms.u_mouse.value.lerp(new THREE.Vector2(mx, my), 0.1);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);