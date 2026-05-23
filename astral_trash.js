if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL context not available");

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const txtCanvas = document.createElement('canvas');
    txtCanvas.width = 1024;
    txtCanvas.height = 1024;
    const tctx = txtCanvas.getContext('2d');
    
    tctx.fillStyle = '#000000';
    tctx.fillRect(0, 0, 1024, 1024);

    tctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    tctx.lineWidth = 2;
    for(let i = 20; i < 700; i += 15) {
        tctx.beginPath();
        tctx.arc(512, 512, i, 0, Math.PI * 2);
        tctx.stroke();
    }

    tctx.textAlign = 'center';
    tctx.textBaseline = 'middle';
    tctx.font = '900 190px "Impact", "Arial Black", sans-serif';

    for(let i = 0; i < 8; i++) {
        tctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
        let ox = (Math.random() - 0.5) * 40;
        let oy = (Math.random() - 0.5) * 40;
        tctx.fillText("ASTRAL", 512 + ox, 380 + oy);
        tctx.fillText("TRASH", 512 + ox, 620 + oy);
    }

    tctx.fillStyle = '#FFFFFF';
    tctx.fillText("ASTRAL", 512, 380);
    tctx.fillText("TRASH", 512, 620);

    for(let i = 0; i < 40; i++) {
        let srcY = Math.random() * 1024;
        let h = Math.random() * 30 + 5;
        let offset = (Math.random() - 0.5) * 80;
        tctx.drawImage(txtCanvas, 0, srcY, 1024, h, offset, srcY, 1024, h);
    }

    const txtTex = new THREE.CanvasTexture(txtCanvas);
    txtTex.minFilter = THREE.LinearFilter;
    txtTex.magFilter = THREE.LinearFilter;
    txtTex.wrapS = THREE.RepeatWrapping;
    txtTex.wrapT = THREE.RepeatWrapping;

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
      uniform sampler2D u_text;

      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      float fbm(vec2 p) {
          float f = 0.0, a = 0.5;
          for(int i = 0; i < 4; i++) {
              f += a * noise(p);
              p = p * 2.0 + vec2(100.0);
              a *= 0.5;
          }
          return f;
      }

      float map(vec2 p, vec2 uv) {
          float tSlow = u_time * 0.05;
          float tMed = u_time * 0.6;
          float tFast = u_time * 12.0;

          vec2 warpUV = uv + vec2(fbm(p * 2.0 + tSlow), fbm(p * 2.0 - tSlow)) * 0.04;
          float txt = texture(u_text, warpUV).r;

          float f = fbm(p * 1.5 - tSlow * 1.5);

          vec2 p1 = p;
          vec2 p2 = vec2(p.x * 0.5 - p.y * 0.866025, p.x * 0.866025 + p.y * 0.5);
          vec2 p3 = vec2(p.x * 0.5 + p.y * 0.866025, -p.x * 0.866025 + p.y * 0.5);
          
          float hex = sin(p1.x * 18.0 + tMed) * sin(p2.x * 18.0 + tMed) * sin(p3.x * 18.0 + tMed);
          float spikes = pow(abs(hex), 1.5);

          float moire = sin(p.x * 180.0 + tFast) * cos(p.y * 178.0 - tFast);

          float h = f * 0.4 + spikes * 0.3 * (1.0 + txt * 2.5);
          h += txt * moire * 0.03;

          return h;
      }

      void main() {
          vec2 p = vUv * 2.0 - 1.0;
          p.x *= u_resolution.x / u_resolution.y;

          float tSlow = u_time * 0.05;
          float tMed = u_time * 0.6;
          float tFast = u_time * 12.0;

          vec2 e = vec2(0.003, 0.0);
          float h = map(p, vUv);
          float hx = map(p + e.xy, vUv + e.xy * 0.5) - h;
          float hy = map(p + e.yx, vUv + e.yx * 0.5) - h;
          vec3 N = normalize(vec3(-hx, -hy, 0.025));

          vec3 L1 = normalize(vec3(sin(tMed * 0.8), cos(tMed * 0.8), 0.7)); 
          vec3 L2 = normalize(vec3(-sin(tMed * 1.2), -cos(tMed * 0.9), 0.5));
          vec3 L3 = normalize(vec3(0.0, 0.0, 1.0));

          float diff1 = max(0.0, dot(N, L1));
          float diff2 = max(0.0, dot(N, L2));

          vec3 V = vec3(0.0, 0.0, 1.0);
          vec3 H1 = normalize(L1 + V);
          vec3 H2 = normalize(L2 + V);
          vec3 H3 = normalize(L3 + V);

          float spec1 = pow(max(0.0, dot(N, H1)), 24.0);
          float spec2 = pow(max(0.0, dot(N, H2)), 24.0);
          float spec3 = pow(max(0.0, dot(N, H3)), 64.0);

          vec2 warpUV = vUv + vec2(fbm(p * 3.0), fbm(p * 3.0 + 10.0)) * 0.02;
          float aberration = 0.006 + sin(tFast) * 0.002;
          float txtR = texture(u_text, warpUV + vec2(aberration, 0.0)).r;
          float txtG = texture(u_text, warpUV).r;
          float txtB = texture(u_text, warpUV - vec2(aberration, 0.0)).r;

          vec3 baseColor = vec3(0.03, 0.01, 0.04);
          vec3 cCyan = vec3(0.0, 1.0, 0.9);
          vec3 cMag  = vec3(1.0, 0.0, 0.8);
          vec3 cYel  = vec3(1.0, 0.9, 0.0);

          vec3 col = baseColor;

          col += cCyan * diff1 * 0.25;
          col += cMag * diff2 * 0.25;

          col += cCyan * spec1 * (0.5 + txtR * 2.5);
          col += cMag * spec2 * (0.5 + txtB * 2.5);
          col += cYel * spec3 * (0.2 + txtG * 4.0);

          float glow = smoothstep(0.1, 0.9, txtG) * 0.6;
          col += cMag * glow * 0.4;
          col += cCyan * glow * 0.2;

          float grain = fract(sin(dot(vUv + tFast, vec2(12.9898, 78.233))) * 43758.5453);
          col += grain * 0.12;

          col.r += txtR * 0.15 * sin(p.y * 200.0 + tFast);
          col.b += txtB * 0.15 * cos(p.x * 200.0 - tFast);

          col = smoothstep(0.0, 1.1, col);
          float vignette = clamp(1.0 - length(vUv - 0.5) * 1.1, 0.0, 1.0);
          col *= mix(0.3, 1.0, vignette);

          fragColor = vec4(col, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_text: { value: txtTex }
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
    console.error("WebGL setup failed:", e);
    return;
  }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material?.uniforms?.u_time) {
  material.uniforms.u_time.value = time;
}
if (material?.uniforms?.u_resolution) {
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);