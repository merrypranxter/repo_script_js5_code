if (!canvas.__three) {
  try {
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
        precision highp float;

        in vec2 vUv;
        out vec4 fragColor;

        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;

        const int MAX_ITER = 64;
        const float BAILOUT = 256.0;
        const float PI = 3.14159265359;

        // Simplex 2D noise for organic slime mold growth
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                   -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1;
          i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i); 
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
            + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m ;
          m = m*m ;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        vec2 cmul(vec2 a, vec2 b) {
            return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
        }

        // Physarum Polycephalum vein network simulation via absolute ridge noise
        float slimeVeins(vec2 p) {
            float f = 0.0;
            float amp = 0.5;
            vec2 shift = vec2(100.0);
            mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
            for (int i = 0; i < 4; i++) {
                f += amp * abs(snoise(p));
                p = rot * p * 2.0 + shift;
                amp *= 0.5;
            }
            return f;
        }

        // Psychedelic Collage: Occult Mandala Symmetry
        vec2 kaleidoscope(vec2 uv, float folds) {
            float angle = atan(uv.y, uv.x);
            float radius = length(uv);
            float sector = 2.0 * PI / folds;
            angle = mod(angle, sector);
            if (angle > sector * 0.5) angle = sector - angle;
            angle += u_time * 0.05; // Slow rotation
            return vec2(cos(angle), sin(angle)) * radius;
        }

        // The infected mathematical space
        vec3 generateSlimeFractal(vec2 p) {
            // Domain Warping: The slime mold digests the fractal coordinate space
            vec2 warp = vec2(
                slimeVeins(p * 1.5 + u_time * 0.1),
                slimeVeins(p * 1.5 - u_time * 0.15 + 100.0)
            );
            
            p += warp * 0.4; 
            
            vec2 c = vec2(-0.75, 0.0) + vec2(sin(u_time*0.1)*0.05, cos(u_time*0.15)*0.05);
            
            if (u_mouse.x > 0.01) {
               c = mix(c, (u_mouse - 0.5) * 2.5, 0.5);
            }
            
            vec2 z = p;
            float smooth_n = 0.0;
            float trap = 1e10;
            
            for (int i = 0; i < MAX_ITER; i++) {
                z = cmul(z, z) + c;
                trap = min(trap, abs(z.x) + abs(z.y)); // Geometric orbit trap
                
                if (dot(z, z) > BAILOUT) {
                    float log_zn = log(dot(z,z)) * 0.5;
                    float nu = log(log_zn / 0.693147) / 0.693147;
                    smooth_n = float(i + 1) - nu;
                    break;
                }
            }
            
            float t = smooth_n * 0.05 + u_time * 0.2 - trap * 1.5;
            
            // Palette: Acid Vibration / Cyberdelic Neon
            vec3 a = vec3(0.5);
            vec3 b = vec3(0.5);
            vec3 col_c = vec3(1.0, 0.8, 0.5);
            vec3 d = vec3(0.0, 0.2, 0.5);
            
            vec3 baseColor = a + b * cos(6.28318 * (col_c * t + d));
            
            // Slime vein overlay (Sulfur Yellow / Acid Lime)
            float veins = slimeVeins(p * 4.0 - u_time * 0.3);
            float vein_thresh = smoothstep(0.4, 0.7, veins);
            
            vec3 slimeColor = mix(vec3(1.0, 0.8, 0.0), vec3(0.0, 1.0, 0.8), snoise(p * 5.0 + u_time));
            baseColor = mix(baseColor, slimeColor, vein_thresh * 0.9);
            
            if (smooth_n == 0.0) {
                // Interior Fatou set
                baseColor = vec3(0.05, 0.0, 0.1); 
                baseColor += vec3(1.0, 0.0, 0.5) * (1.0 - smoothstep(0.0, 1.0, trap)) * 0.6; 
            }
            
            return baseColor;
        }

        // Print Artifact: Screen-space Halftone Dot pattern
        float halftone(vec2 fragCoord, float freq, float angle, float luma) {
            float rad = radians(angle);
            mat2 rot = mat2(cos(rad), -sin(rad), sin(rad), cos(rad));
            vec2 uv = rot * fragCoord * freq / 1024.0;
            vec2 cell = fract(uv) - 0.5;
            float dist = length(cell);
            float dotRadius = sqrt(1.0 - luma) * 0.5;
            return smoothstep(dotRadius + 0.05, dotRadius - 0.05, dist);
        }

        void main() {
            vec2 uv = (vUv - 0.5) * 2.0;
            uv.x *= u_resolution.x / u_resolution.y;
            
            uv *= 1.2;
            uv = kaleidoscope(uv, 8.0); // 8-fold mandala symmetry
            
            // Print Artifact: CMYK Misregistration (approximated via RGB channel shifting)
            float offset_mag = 0.01 + 0.005 * sin(u_time * 2.0);
            
            vec2 uvC = uv + vec2(offset_mag, 0.0);
            vec2 uvM = uv + vec2(-offset_mag, offset_mag * 0.5);
            vec2 uvY = uv + vec2(0.0, -offset_mag);
            
            vec3 colC = generateSlimeFractal(uvC);
            vec3 colM = generateSlimeFractal(uvM);
            vec3 colY = generateSlimeFractal(uvY);
            
            vec3 color = vec3(colC.r, colM.g, colY.b);
            
            // Print Artifact: Posterization / Quantization for screenprint feel
            color = floor(color * 6.0) / 6.0;
            
            // Print Artifact: Halftone overlay
            float luma = dot(color, vec3(0.299, 0.587, 0.114));
            float ht = halftone(gl_FragCoord.xy, 120.0, 45.0, luma);
            
            // Ink bleed / multiply blend simulation
            color *= mix(1.0, 0.15, ht);
            
            // Print Artifact: Xerox noise and platen streaks
            float grain = fract(sin(dot(vUv * 1000.0 + u_time, vec2(12.9898, 78.233))) * 43758.5453);
            float streak = snoise(vec2(vUv.x * 20.0, u_time * 0.1));
            
            color -= (grain * 0.12);
            color += smoothstep(0.8, 1.0, streak) * 0.15;
            
            // Glitch: Scanline dropout
            float scanline = step(0.98, fract(vUv.y * 150.0 + u_time * 5.0));
            color = mix(color, vec3(0.0), scanline * 0.3);
            
            // Vignette burn
            float vig = length(vUv - 0.5);
            color *= smoothstep(0.8, 0.3, vig);
            
            fragColor = vec4(color, 1.0);
        }
      `
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

if (material?.uniforms?.u_time) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  if (mouse.isPressed) {
    material.uniforms.u_mouse.value.set(mouse.x / grid.width, 1.0 - mouse.y / grid.height);
  }
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);