if (typeof THREE === 'undefined') return;

if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const textCanvas = document.createElement('canvas');
    textCanvas.width = 1024;
    textCanvas.height = 1024;
    const tctx = textCanvas.getContext('2d');
    
    tctx.fillStyle = '#000';
    tctx.fillRect(0, 0, 1024, 1024);

    tctx.strokeStyle = '#fff';
    for (let i = 0; i < 15; i++) {
        tctx.lineWidth = i % 3 === 0 ? 5 : 2;
        tctx.beginPath();
        tctx.arc(512, 512, 50 + i * 35, 0, Math.PI * 2);
        tctx.setLineDash(i % 2 === 0 ? [10, 15] : []);
        tctx.stroke();
    }
    tctx.setLineDash([]);

    for (let i = 0; i < 36; i++) {
        let angle = (i / 36) * Math.PI * 2;
        tctx.beginPath();
        tctx.moveTo(512 + Math.cos(angle) * 150, 512 + Math.sin(angle) * 150);
        tctx.lineTo(512 + Math.cos(angle) * 450, 512 + Math.sin(angle) * 450);
        tctx.lineWidth = i % 4 === 0 ? 4 : 1;
        tctx.stroke();
    }

    tctx.fillStyle = '#fff';
    tctx.textAlign = 'center';
    tctx.textBaseline = 'middle';
    tctx.font = 'italic 900 130px "Arial Black", Impact, sans-serif';
    tctx.fillText("ASTRAL", 512, 400);
    tctx.fillText("TRASH", 512, 624);

    tctx.globalCompositeOperation = 'difference';
    tctx.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) {
        tctx.fillRect(Math.random() * 1024, Math.random() * 1024, Math.random() * 150, Math.random() * 15);
    }
    tctx.globalCompositeOperation = 'source-over';

    const textTexture = new THREE.CanvasTexture(textCanvas);
    textTexture.minFilter = THREE.LinearFilter;
    textTexture.magFilter = THREE.LinearFilter;
    textTexture.wrapS = THREE.ClampToEdgeWrapping;
    textTexture.wrapT = THREE.ClampToEdgeWrapping;

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    
    const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    orthoCamera.position.z = 1;

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
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        in vec2 vUv;
        out vec4 fragColor;
        
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform sampler2D u_text;
        
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        
        float snoise(vec3 v) {
          const vec2  C = vec2(1.0/6.0, 1.0/3.0);
          const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min( g.xyz, l.zxy );
          vec3 i2 = max( g.xyz, l.zxy );
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute( permute( permute(
                     i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                   + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                   + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
          float n_ = 0.142857142857;
          vec3  ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_ );
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4( x.xy, y.xy );
          vec4 b1 = vec4( x.zw, y.zw );
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
        }
        
        float fbm(vec3 p) {
            float v = 0.0;
            float a = 0.5;
            for(int i=0; i<5; i++) {
                v += a * snoise(p);
                p *= 2.0;
                a *= 0.5;
            }
            return v;
        }
        
        float getMask(sampler2D tex, vec2 uv) {
            if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
            return texture(tex, uv).r;
        }
        
        void main() {
            vec2 uv = vUv;
            
            float tSlow = u_time * 0.1;
            float tMed  = u_time * 0.5;
            float tFast = u_time * 2.0;
            
            vec3 cCyan = vec3(0.0, 1.0, 1.0);
            vec3 cMag  = vec3(1.0, 0.0, 1.0);
            vec3 cYel  = vec3(1.0, 1.0, 0.0);
            vec3 cBlk  = vec3(0.02, 0.01, 0.03);
            
            vec2 textUv = (uv - 0.5);
            if (u_resolution.x > u_resolution.y) {
                textUv.x *= u_resolution.x / u_resolution.y;
            } else {
                textUv.y *= u_resolution.y / u_resolution.x;
            }
            textUv *= 1.2;
            textUv += 0.5;
            
            float tear = step(0.98, fract(sin(floor(uv.y * 60.0) * 43.133 + tMed) * 12.345));
            textUv.x += tear * 0.05 * sin(tFast * 20.0);
            
            vec3 warpSpace = vec3(uv * 4.0, tSlow);
            float warpX = fbm(warpSpace);
            float warpY = fbm(warpSpace + vec3(10.0));
            vec2 warpedUv = uv + vec2(warpX, warpY) * 0.1;
            
            float structNoise = snoise(vec3(warpedUv * 12.0, tMed));
            float ridges = 1.0 - abs(structNoise);
            ridges = pow(ridges, 3.0);
            
            float shimmer = snoise(vec3(uv * 80.0, tFast));
            
            float caOffset = warpX * 0.015;
            float tMaskR = getMask(u_text, textUv + vec2(caOffset, 0.0));
            float tMaskG = getMask(u_text, textUv);
            float tMaskB = getMask(u_text, textUv - vec2(caOffset, 0.0));
            float textPresence = (tMaskR + tMaskG + tMaskB) / 3.0;
            
            float density = ridges * 0.6 + (warpX + warpY)*0.2 + textPresence * 0.4;
            
            vec3 col = cBlk;
            
            float cyanStrata = smoothstep(0.2, 0.5, density);
            col = mix(col, cCyan * 0.6, cyanStrata);
            
            float magStrata = smoothstep(0.5, 0.75, density + structNoise * 0.2);
            col = mix(col, cMag * 0.8, magStrata);
            
            float yelStrata = smoothstep(0.75, 1.0, density + shimmer * 0.1);
            col = mix(col, cYel, yelStrata);
            
            float moire1 = sin(uv.x * 200.0 + warpX * 10.0);
            float moire2 = sin(uv.y * 210.0 + warpY * 10.0 + tFast);
            float moire = (moire1 * moire2) * 0.5 + 0.5;
            col += cMag * moire * 0.15 * (1.0 - cyanStrata);
            
            col += cCyan * tMaskR * 0.7;
            col += cMag  * tMaskG * 0.7;
            col += cYel  * tMaskB * 0.7;
            
            float textDistort = getMask(u_text, textUv + vec2(sin(uv.y * 20.0 + tFast)*0.01));
            col += vec3(1.0) * textDistort * 0.3 * smoothstep(0.5, 1.0, ridges);
            
            float grain = fract(sin(dot(uv + tFast, vec2(12.9898, 78.233))) * 43758.5453);
            float dustMask = smoothstep(0.7, 1.0, shimmer) * (1.0 - textPresence * 0.5);
            col += cYel * grain * dustMask * 1.0;
            col -= grain * 0.15;
            
            float scanline = sin(uv.y * u_resolution.y * 3.14159);
            col *= 0.95 + 0.05 * scanline;
            
            float vig = length(uv - 0.5);
            col *= smoothstep(0.8, 0.2, vig);
            
            fragColor = vec4(col, 1.0);
        }
      `
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera: orthoCamera, material };
  } catch (e) {
    console.error("WebGL Initialization Failed:", e);
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