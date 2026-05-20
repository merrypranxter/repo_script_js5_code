try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
    camera.position.z = 1;

    const tCanvas = document.createElement('canvas');
    tCanvas.width = 2048;
    tCanvas.height = 2048;
    const tctx = tCanvas.getContext('2d');

    tctx.fillStyle = '#000000';
    tctx.fillRect(0, 0, 2048, 2048);

    function drawAlchemicalText(blurAmt, alpha) {
      tctx.filter = `blur(${blurAmt}px)`;
      tctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      tctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      tctx.textAlign = 'center';
      tctx.textBaseline = 'middle';
      tctx.font = 'bold 280px "Arial Black", sans-serif';
      
      tctx.fillText("ASTRAL", 1024, 850);
      tctx.fillText("TRASH", 1024, 1180);

      tctx.lineWidth = 12;
      tctx.beginPath();
      tctx.arc(1024, 1024, 850, 0, Math.PI * 2);
      tctx.stroke();
      
      tctx.lineWidth = 4;
      tctx.beginPath();
      tctx.arc(1024, 1024, 820, 0, Math.PI * 2);
      tctx.stroke();

      tctx.fillRect(1024 - 8, 80, 16, 180);
      tctx.fillRect(1024 - 8, 1788, 16, 180);
      tctx.fillRect(80, 1024 - 8, 180, 16);
      tctx.fillRect(1788, 1024 - 8, 180, 16);

      tctx.font = '120px serif';
      tctx.fillText("✧", 1024, 550);
      tctx.fillText("✧", 1024, 1480);
    }

    drawAlchemicalText(80, 0.15);
    drawAlchemicalText(40, 0.3);
    drawAlchemicalText(15, 0.6);
    drawAlchemicalText(2, 1.0);

    const textTexture = new THREE.CanvasTexture(tCanvas);
    textTexture.minFilter = THREE.LinearFilter;
    textTexture.magFilter = THREE.LinearFilter;
    textTexture.generateMipmaps = false;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_text: { value: textTexture }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        
        in vec2 vUv;
        out vec4 fragColor;

        uniform float u_time;
        uniform vec2 u_resolution;
        uniform sampler2D u_text;

        #define PI 3.14159265359

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
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
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0) * 2.0 + 1.0;
          vec4 s1 = floor(b1) * 2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 105.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        float fbm(vec3 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++) {
            v += a * snoise(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          float t_slow = u_time * 0.08;
          float t_med  = u_time * 0.4;
          float t_fast = u_time * 2.5;

          vec2 uv = vUv;
          vec2 p = uv * 2.0 - 1.0;
          p.x *= u_resolution.x / u_resolution.y;

          vec2 e = vec2(1.0 / 2048.0, 0.0);
          float txt = texture(u_text, uv).r;
          float txtE = texture(u_text, uv + e.xy).r;
          float txtW = texture(u_text, uv - e.xy).r;
          float txtN = texture(u_text, uv + e.yx).r;
          float txtS = texture(u_text, uv - e.yx).r;
          vec2 force = vec2(txtE - txtW, txtN - txtS);

          vec2 matP = p * 3.5;
          matP -= force * 18.0 * (0.8 + 0.2 * sin(t_slow));

          float f1 = fbm(vec3(matP + force * 3.0, t_slow));
          vec2 dw = vec2(
            fbm(vec3(matP + f1, t_med)),
            fbm(vec3(matP - f1, t_med + 10.0))
          );

          float f2 = fbm(vec3(matP + dw * 5.0, t_slow * 1.5));

          float ridge = 1.0 - abs(f2);
          ridge = pow(ridge, 14.0);

          float angle = atan(dw.y, dw.x);
          float bucket = mod(floor((angle / (2.0 * PI) + 0.5 + t_slow * 0.3) * 3.0), 3.0);
          
          vec3 neon;
          if (bucket < 0.5) neon = vec3(0.0, 1.0, 1.0);
          else if (bucket < 1.5) neon = vec3(1.0, 0.0, 1.0);
          else neon = vec3(1.0, 1.0, 0.0);

          float shimmer = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + t_fast) * 43758.5453);
          neon *= 0.5 + 1.0 * shimmer;

          vec3 col = vec3(0.01, 0.005, 0.01) * max(0.0, fbm(vec3(matP * 2.0, t_slow)));

          float aura = smoothstep(0.0, 0.7, txt);
          col += neon * ridge * (aura * 3.0 + 0.15);

          float core = smoothstep(0.65, 0.95, txt);
          float coreMask = core * smoothstep(0.3, 0.7, f2 + 0.4);
          col = mix(col, neon * (0.9 + 0.5 * shimmer), coreMask);

          vec2 pollenP = p * 120.0 + dw * 8.0;
          float pSeed = fract(sin(dot(floor(pollenP), vec2(12.9898, 78.233))) * 43758.5453);
          float pActive = step(0.994, pSeed);
          float pBlink = step(0.5, fract(pSeed * 123.45 + t_fast));
          col += neon * pActive * pBlink * aura * 4.0;

          float vig = 1.0 - dot(p, p) * 0.15;
          col *= smoothstep(0.0, 1.0, vig);

          fragColor = vec4(col, 1.0);
        }
      `
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;
  
  if (material && material.uniforms) {
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) {
      material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);
} catch (e) {
  console.error("WebGL Initialization Failed:", e);
}