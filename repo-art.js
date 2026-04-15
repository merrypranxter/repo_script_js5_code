if (!canvas.__three) {
  try {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false });
    if (!gl) throw new Error("WebGL 2 not supported or context occupied");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: false });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_isPressed;

      in vec2 vUv;
      out vec4 fragColor;

      // --- Glitchcore: Artifact Driver / Compression Chew ---
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      mat2 rot(float a) {
          float c = cos(a), s = sin(a);
          return mat2(c, -s, s, c);
      }

      // --- SDF Fields: Primitives ---
      float sdOctahedron(vec3 p, float s) {
          p = abs(p);
          float m = p.x + p.y + p.z - s;
          vec3 q;
          if (3.0 * p.x < m) q = p.xyz;
          else if (3.0 * p.y < m) q = p.yzx;
          else if (3.0 * p.z < m) q = p.zxy;
          else return m * 0.57735027;
          float k = clamp(0.5 * (q.z - q.y + s), 0.0, s);
          return length(vec3(q.x, q.y - s + k, q.z - k));
      }

      float sdGyroid(vec3 p, float scale, float thickness, float bias) {
          p *= scale;
          float g = sin(p.x)*cos(p.y) + sin(p.y)*cos(p.z) + sin(p.z)*cos(p.x) + bias;
          return (abs(g) - thickness) / scale;
      }

      float sdSphere(vec3 p, float r) {
          return length(p) - r;
      }

      // --- SDF Fields: Smooth Boolean ---
      float smin(float a, float b, float k) {
          float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
          return mix(b, a, h) - k*h*(1.0-h);
      }

      // --- Scene Composition ---
      float map(vec3 p) {
          // Glitchcore: Ghost-Frame Spatial Echo (Trailing memory)
          float echoId = clamp(round(p.z / 2.0), -4.0, 0.0);
          p.z -= 2.0 * echoId;
          
          // Temporal chaos applied to echoes
          p.xy *= rot(u_time * 0.4 + echoId * 0.2);
          p.xz *= rot(u_time * 0.2 - echoId * 0.15);
          
          // SDF Fields: Deformation (Twist)
          float twist = sin(u_time * 0.3) * 0.8;
          p.xz *= rot(p.y * twist);

          // Crystalline core
          float sizeDecay = 1.2 - abs(echoId) * 0.2;
          float d1 = sdOctahedron(p, sizeDecay); 
          
          // Alien / Fungal Gyroid Lattice
          float g = sdGyroid(p, 4.5, 0.04, sin(u_time * 1.5 + echoId) * 0.15);
          float d2 = max(sdSphere(p, sizeDecay + 0.3), g);
          
          // Smooth melting organism
          float d = smin(d1, d2, 0.5);
          
          // Noise Fields: Displacement
          d += sin(p.x*12.0 + u_time)*sin(p.y*12.0)*sin(p.z*12.0)*0.02;
          
          return d;
      }

      vec3 calcNormal(vec3 p) {
          vec2 e = vec2(0.002, 0.0);
          return normalize(vec3(
              map(p + e.xyy) - map(p - e.xyy),
              map(p + e.yxy) - map(p - e.yxy),
              map(p + e.yyx) - map(p - e.yyx)
          ));
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
          
          // --- Glitchcore: Candy Crash Compression (Macroblock Breakup) ---
          vec2 blockUv = floor(uv * 24.0) / 24.0;
          float glitchThresh = u_isPressed > 0.5 ? 0.6 : 0.96;
          float glitch = step(glitchThresh, hash(blockUv + floor(u_time * 14.0)));
          
          // Chroma smear & spatial tear
          uv.x += glitch * 0.15 * sin(u_time * 40.0);
          uv.y -= glitch * 0.08 * cos(u_time * 35.0);

          // --- Ray Setup ---
          vec3 ro = vec3(0.0, 0.0, 5.0); 
          vec3 rd = normalize(vec3(uv, -1.0));
          
          // Mouse interaction (Surveillance pan)
          vec2 m = (u_mouse * 2.0 - 1.0) * 1.5;
          ro.xz *= rot(m.x);
          rd.xz *= rot(m.x);
          ro.yz *= rot(m.y);
          rd.yz *= rot(m.y);

          // --- Raymarching ---
          float t = 0.0;
          float d = 0.0;
          int steps = 0;
          for(int i=0; i<100; i++) {
              vec3 p = ro + rd * t;
              d = map(p);
              if(d < 0.001 || t > 18.0) break;
              t += d * 0.6; // Gyroid safety multiplier
              steps++;
          }

          // --- Palette: Acid Vibration (Psychedelic Collage) ---
          vec3 col = vec3(0.02, 0.03, 0.04); // Void Black
          
          if(t < 18.0) {
              vec3 p = ro + rd * t;
              vec3 n = calcNormal(p);
              vec3 light = normalize(vec3(sin(u_time), 1.2, 2.0));
              
              // Hyperpop Rupture hues
              vec3 hotMagenta = vec3(1.0, 0.0, 0.78);
              vec3 cobaltBlue = vec3(0.0, 0.28, 1.0);
              vec3 acidLime   = vec3(0.66, 1.0, 0.0);
              vec3 elecOrange = vec3(1.0, 0.42, 0.0);
              
              // Temporal Echo fading logic
              float echoId = clamp(round(p.z / 2.0), -4.0, 0.0);
              float ghostFade = 1.0 - abs(echoId) * 0.22; 
              
              // Base material
              vec3 albedo = mix(hotMagenta, cobaltBlue, sin(p.x * 2.5 + p.y * 3.5 + u_time) * 0.5 + 0.5);
              if(hash(vec2(echoId, 1.0)) > 0.5) albedo = mix(albedo, elecOrange, 0.5);
              
              float diff = max(dot(n, light), 0.0);
              float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 2.5);
              float ao = 1.0 - float(steps) / 100.0; 
              
              col = albedo * diff * ao * ghostFade;
              
              // Glitchcore: RGB Phantom / Iridescence
              vec3 fringe = mix(acidLime, hotMagenta, fresnel);
              col += fringe * fresnel * ghostFade * 1.2;
              
              // Glitch block highlights
              col += glitch * acidLime * 1.5; 
          }

          // --- Post-Processing ---
          // Fog decay
          col = mix(col, vec3(0.02, 0.03, 0.04), 1.0 - exp(-0.12 * t));
          
          // Psychedelic Collage: Risograph Halftone Overlay
          float luma = dot(col, vec3(0.299, 0.587, 0.114));
          vec2 cell = fract(gl_FragCoord.xy / 5.0) - 0.5;
          float dist = length(cell);
          float radius = sqrt(1.0 - luma) * 0.75;
          float halftone = smoothstep(radius + 0.1, radius - 0.1, dist);
          
          // Ink bleed blend
          col = mix(col * 0.5, col + vec3(halftone * 0.35), 0.7);
          
          // CRT Contour banding
          float scanline = sin(gl_FragCoord.y * 2.0) * 0.05;
          col -= scanline;

          // Vignette
          col *= 1.0 - 0.45 * dot(uv, uv);
          
          fragColor = vec4(pow(col, vec3(1.0/2.2)), 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2() },
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
        u_isPressed: { value: 0.0 }
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
    return;
  }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material && material.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  
  const targetX = mouse.x / grid.width;
  const targetY = 1.0 - (mouse.y / grid.height);
  const curX = material.uniforms.u_mouse.value.x;
  const curY = material.uniforms.u_mouse.value.y;
  
  material.uniforms.u_mouse.value.set(
    curX + (targetX - curX) * 0.1,
    curY + (targetY - curY) * 0.1
  );
  material.uniforms.u_isPressed.value = mouse.isPressed ? 1.0 : 0.0;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);