try {
  if (!canvas.__three) {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) throw new Error("WebGL 2 not supported or context occupied");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
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
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        
        in vec2 vUv;
        out vec4 fragColor;
        
        #define TAU 6.28318530718
        #define PI 3.14159265359
        
        float hash(float n) { return fract(sin(n) * 43758.5453); }
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        
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
                p = p * 2.1 + vec2(1.7, 9.2);
                a *= 0.5;
            }
            return v;
        }
        
        vec2 curl(vec2 p) {
            const float eps = 0.001;
            float n0 = noise(p + vec2(eps, 0.0));
            float n1 = noise(p - vec2(eps, 0.0));
            float n2 = noise(p + vec2(0.0, eps));
            float n3 = noise(p - vec2(0.0, eps));
            return vec2(n2 - n3, n1 - n0) / (2.0 * eps);
        }
        
        vec2 turbulence(vec2 p, int octaves) {
            vec2 v = vec2(0.0);
            float amp = 0.5;
            float freq = 1.0;
            for(int i=0; i<8; i++) {
                if(i >= octaves) break;
                v += amp * curl(p * freq);
                freq *= 2.0;
                amp *= 0.5;
            }
            return v;
        }
        
        vec3 palette(float t) {
            vec3 a = vec3(0.5, 0.5, 0.5);
            vec3 b = vec3(0.5, 0.5, 0.5);
            vec3 c = vec3(2.0, 1.0, 0.0);
            vec3 d = vec3(0.50, 0.20, 0.25);
            return a + b * cos(TAU * (c * t + d));
        }
        
        vec2 voronoi(vec2 x) {
            vec2 n = floor(x);
            vec2 f = fract(x);
            float m = 8.0;
            vec2 mr = vec2(0.0);
            for(int j=-1; j<=1; j++) {
                for(int i=-1; i<=1; i++) {
                    vec2 g = vec2(float(i), float(j));
                    vec2 o = vec2(hash(n + g), hash(n + g + 13.0));
                    o = 0.5 + 0.5 * sin(u_time * 2.0 + TAU * o);
                    vec2 r = g - f + o;
                    float d = dot(r, r);
                    if(d < m) {
                        m = d;
                        mr = r;
                    }
                }
            }
            return vec2(m, mr.x);
        }
        
        float leopard(vec2 p) {
            vec2 v = voronoi(p * 5.0);
            float ring = smoothstep(0.1, 0.25, v.x) - smoothstep(0.3, 0.45, v.x);
            ring *= smoothstep(-0.2, 0.2, noise(p * 10.0));
            float spot = smoothstep(0.1, 0.0, v.x);
            return max(ring, spot * 0.7);
        }
        
        float star(vec2 uv) {
            float d = length(uv);
            float a = atan(uv.y, uv.x);
            float crossShape = abs(cos(a*2.0)) * abs(sin(a*2.0)) * 2.0;
            return (0.005 / (d + 0.001)) * smoothstep(0.5, 0.0, crossShape);
        }
        
        vec2 vhs_distort(vec2 uv, float t) {
            float scanline = floor(uv.y * 240.0);
            float jitter = (hash(vec2(scanline, floor(t * 30.0))) - 0.5) * 0.02;
            float jitterMask = step(0.95, hash(vec2(scanline * 0.1, floor(t * 10.0))));
            uv.x += jitter * jitterMask;
            
            float shockX = fract(t * 0.5);
            float d = abs(uv.x - shockX);
            float shock = exp(-d * d * 500.0) * 0.05 * sin(uv.y * 50.0 + t * 10.0);
            uv.x += shock;
            
            return uv;
        }
        
        void main() {
            vec2 uv = vUv;
            vec2 warpedUV = vhs_distort(uv, u_time);
            
            vec2 p = warpedUV * 2.0 - 1.0;
            p.x *= u_resolution.x / u_resolution.y;
            
            vec2 m = u_mouse * 2.0 - 1.0;
            m.x *= u_resolution.x / u_resolution.y;
        
            vec2 vel = turbulence(p * 1.2 + u_time * 0.15, 4);
            
            float dMouse = length(p - m);
            vec2 marangoni = normalize(p - m + 0.001) * exp(-dMouse * 8.0) * 0.5;
            vel += marangoni;
        
            vec2 q = p + vel * 0.5;
            vec2 r = p + turbulence(q * 2.0 - u_time * 0.2, 3) * 0.4;
        
            float speed = length(vel);
            vec3 col = palette(speed * 0.8 + u_time * 0.2 + r.y * 0.3);
        
            float finger = fbm(r * 3.0 - u_time * 0.5);
            float tendril = smoothstep(0.45, 0.5, finger) - smoothstep(0.5, 0.55, finger);
            col = mix(col, vec3(0.0, 1.0, 0.9), tendril * 0.8);
        
            float spots = leopard(r + vel * 0.2);
            vec3 spotCol = vec3(0.1, 0.0, 0.25);
            col = mix(col, spotCol, spots);
        
            float sparkles = 0.0;
            for(int i=0; i<6; i++) {
                vec2 sp = fract(r * (float(i)*0.5 + 2.0) + u_time * 0.05 * vec2(float(i), -float(i))) - 0.5;
                sparkles += star(sp) * smoothstep(0.3, 0.7, noise(r * 8.0 + float(i)));
            }
            col += vec3(1.0, 0.5, 0.8) * sparkles * 2.5;
        
            float spread = 0.005 + 0.005 * sin(u_time);
            float rChannel = fbm(q + vec2(spread, 0.0));
            float bChannel = fbm(q - vec2(spread, 0.0));
            col.r += rChannel * 0.2;
            col.b += bChannel * 0.2;
        
            col *= 0.9 + 0.1 * sin(uv.y * u_resolution.y * 0.5);
        
            fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
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
    if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
    if (material.uniforms.u_mouse) {
      const targetX = mouse.x ? mouse.x / grid.width : 0.5;
      const targetY = mouse.y ? 1.0 - (mouse.y / grid.height) : 0.5;
      material.uniforms.u_mouse.value.x += (targetX - material.uniforms.u_mouse.value.x) * 0.1;
      material.uniforms.u_mouse.value.y += (targetY - material.uniforms.u_mouse.value.y) * 0.1;
    }
  }
  
  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);
} catch (e) {
  console.error("WebGL Initialization Failed:", e);
}