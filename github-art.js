try {
  // Safe initialization pattern for WebGL2 / Three.js
  if (!canvas.__three) {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, depth: false });
    if (!gl) throw new Error("WebGL 2 not supported or context occupied");

    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Feral Shader: Birefringent Lisa-Frank Quasicrystal Raymarcher
    // Merges 5-fold quasicrystal math, structural color thin-film interference, 
    // Raymarched SDFs, and hyper-saturated 90s Lisa Frank neon palettes.
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0, 0) }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        in vec2 vUv;
        out vec4 fragColor;

        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;

        #define MAX_STEPS 120
        #define MAX_DIST 40.0
        #define SURF_DIST 0.001
        #define PHI 1.61803398875

        // Rotation Matrix
        mat2 rot(float a) {
            float s = sin(a), c = cos(a);
            return mat2(c, -s, s, c);
        }

        // Noise & FBM (from raymarching repo)
        float hash(float n) { return fract(sin(n) * 43758.5453123); }
        float noise(vec3 x) {
            vec3 p = floor(x);
            vec3 f = fract(x);
            f = f*f*(3.0-2.0*f);
            float n = p.x + p.y*57.0 + p.z*113.0;
            return mix(mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
                           mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y),
                       mix(mix( hash(n+113.0), hash(n+114.0),f.x),
                           mix( hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
        }

        float fbm(vec3 p) {
            float f = 0.0;
            float amp = 0.5;
            for(int i = 0; i < 5; i++) {
                f += amp * noise(p);
                p *= 2.0;
                amp *= 0.5;
            }
            return f;
        }

        // 3D Quasicrystal Density Field (Icosahedral symmetry planes)
        float qc3D(vec3 p) {
            vec3 n1 = normalize(vec3(PHI, 1.0, 0.0));
            vec3 n2 = normalize(vec3(-PHI, 1.0, 0.0));
            vec3 n3 = normalize(vec3(0.0, PHI, 1.0));
            vec3 n4 = normalize(vec3(0.0, -PHI, 1.0));
            vec3 n5 = normalize(vec3(1.0, 0.0, PHI));
            vec3 n6 = normalize(vec3(1.0, 0.0, -PHI));
            
            float d = 0.0;
            d += cos(dot(p, n1));
            d += cos(dot(p, n2));
            d += cos(dot(p, n3));
            d += cos(dot(p, n4));
            d += cos(dot(p, n5));
            d += cos(dot(p, n6));
            return d;
        }

        // Smooth Union (from operations.glsl)
        float smin(float a, float b, float k) {
            float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
            return mix(b, a, h) - k * h * (1.0 - h);
        }

        // SDF Scene Map
        float map(vec3 p) {
            // Space warping (Manifolds)
            vec3 q = p;
            q.xz *= rot(u_time * 0.15 + q.y * 0.2); // Twist
            q.xy *= rot(u_time * 0.1);
            
            // Base primitives
            float sphere = length(q) - 1.5;
            vec2 t = vec2(1.8, 0.4);
            float torus = length(vec2(length(q.xz) - t.x, q.y)) - t.y;
            
            // Organic blend
            float base = smin(sphere, torus, 0.8);
            
            // Quasicrystal displacement (Aperiodic high-freq detail)
            float qc = qc3D(q * 4.0 - u_time * 0.5) * 0.15;
            
            // Biological noise displacement
            float n = fbm(q * 3.0 + u_time) * 0.2;
            
            return base + qc - n;
        }

        // Normal Calculation
        vec3 getNormal(vec3 p) {
            vec2 e = vec2(0.002, 0.0);
            return normalize(vec3(
                map(p + e.xyy) - map(p - e.xyy),
                map(p + e.yxy) - map(p - e.yxy),
                map(p + e.yyx) - map(p - e.yyx)
            ));
        }

        // Lisa Frank Structural Color Palette (Hyper-saturated acid optics)
        vec3 lisaFrankColor(float opd) {
            // Base structural cosine palette
            vec3 a = vec3(0.5);
            vec3 b = vec3(0.5);
            vec3 c = vec3(1.0, 1.4, 1.8);
            vec3 d = vec3(0.0, 0.33, 0.67);
            vec3 col = a + b * cos(6.28318 * (c * opd + d));
            
            // Feral saturation & contrast push
            col = smoothstep(0.05, 0.95, col);
            
            // Inject Lisa Frank signature neons (Hot Magenta & Lime Green)
            float magentaSpike = pow(sin(opd * 12.0) * 0.5 + 0.5, 6.0);
            float limeSpike = pow(cos(opd * 17.0) * 0.5 + 0.5, 6.0);
            
            col = mix(col, vec3(1.0, 0.0, 0.8), magentaSpike);
            col = mix(col, vec3(0.3, 1.0, 0.0), limeSpike);
            
            return col;
        }

        void main() {
            vec2 uv = (vUv - 0.5) * 2.0;
            uv.x *= u_resolution.x / u_resolution.y;
            
            // Camera setup
            vec3 ro = vec3(0.0, 0.0, -5.0);
            
            // Interactive Orbit
            vec2 m = u_mouse * 3.14159;
            ro.yz *= rot(-m.y * 0.5);
            ro.xz *= rot(-m.x + u_time * 0.2); // Constant drift
            
            vec3 fwd = normalize(-ro);
            vec3 right = normalize(cross(vec3(0, 1, 0), fwd));
            vec3 up = cross(fwd, right);
            vec3 rd = normalize(fwd + uv.x * right + uv.y * up);
            
            // Raymarching Loop
            float dO = 0.0;
            vec3 p;
            for(int i = 0; i < MAX_STEPS; i++) {
                p = ro + rd * dO;
                float dS = map(p);
                dO += dS;
                if(dO > MAX_DIST || abs(dS) < SURF_DIST) break;
            }
            
            // Neon Void Background
            vec3 col = vec3(0.05, 0.0, 0.1) * (1.0 - length(uv) * 0.3);
            
            if(dO < MAX_DIST) {
                vec3 n = getNormal(p);
                vec3 v = normalize(ro - p);
                
                // --- Structural Color & Birefringence Math ---
                // View angle interference
                float viewAngle = max(0.0, dot(n, v));
                
                // Simulating thin-film thickness warped by FBM
                float thickness = 0.4 + 0.6 * fbm(p * 5.0 - u_time * 0.5);
                
                // Optical Path Difference (OPD)
                float opd = 2.0 * 1.5 * thickness * sqrt(1.0 - pow(sin(acos(viewAngle))/1.5, 2.0));
                
                // Map OPD to Lisa Frank Palette
                col = lisaFrankColor(opd * 3.0 - u_time * 0.3);
                
                // Isochromatic Stress Lines (Birefringence)
                float contour = fract(opd * 8.0);
                float line = smoothstep(0.0, 0.05, contour) * smoothstep(0.1, 0.05, contour);
                col = mix(col, vec3(0.0, 1.0, 1.0), line * 0.8); // Cyan stress fractures
                
                // Specular Highlights (Plastic/Metallic feel)
                vec3 lightDir = normalize(vec3(1.0, 2.0, -1.0));
                vec3 h = normalize(lightDir + v);
                float spec = pow(max(dot(n, h), 0.0), 128.0);
                col += vec3(spec) * 1.5;
                
                // Ambient Occlusion
                float ao = clamp(map(p + n * 0.15) * 6.0, 0.0, 1.0);
                col *= mix(0.2, 1.0, ao);
            }
            
            // Volumetric Fog (Neon Abyss)
            vec3 fogColor = vec3(0.05, 0.0, 0.1);
            float fogAmount = 1.0 - exp(-dO * dO * 0.005);
            col = mix(col, fogColor, fogAmount);
            
            // Dithering (Anti-banding)
            float dither = fract(sin(dot(uv * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
            col += (dither - 0.5) * (1.0 / 255.0);
            
            // ACES Tone Mapping
            float a = 2.51;
            float b = 0.03;
            float c = 2.43;
            float d = 0.59;
            float e = 0.14;
            col = clamp((col * (a * col + b)) / (col * (c * col + d) + e), 0.0, 1.0);
            
            // Gamma Correction
            col = pow(col, vec3(1.0 / 2.2));
            
            fragColor = vec4(col, 1.0);
        }
      `
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  // Ensure safe uniform updates
  if (material?.uniforms) {
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
    
    // Normalize mouse to -1 to 1 range
    const mx = mouse.isPressed ? (mouse.x / grid.width) * 2 - 1 : 0;
    const my = mouse.isPressed ? -(mouse.y / grid.height) * 2 + 1 : 0;
    
    // Smoothly interpolate mouse to avoid jerky camera movements
    material.uniforms.u_mouse.value.x += (mx - material.uniforms.u_mouse.value.x) * 0.05;
    material.uniforms.u_mouse.value.y += (my - material.uniforms.u_mouse.value.y) * 0.05;
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (err) {
  console.error("Feral Raymarcher Failed:", err);
  // Fallback to 2D context if WebGL fails
  if (ctx) {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, grid.width, grid.height);
    ctx.fillStyle = '#FF00FF';
    ctx.font = '14px monospace';
    ctx.fillText('WEBGL2 REQUIRED FOR FERAL QUASICRYSTAL OPTICS', 20, 30);
  }
}