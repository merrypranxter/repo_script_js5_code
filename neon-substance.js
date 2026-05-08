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
      in vec2 vUv;
      out vec4 fragColor;
      
      uniform float u_time;
      uniform vec2 u_resolution;

      // [FAST SHIMMER] High-frequency PRNG for physical grain
      float hash(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 151.7182))) * 43758.5453);
      }

      // [MEDIUM MOTION] 3D Value Noise for tectonic shifts
      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                       mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                       mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }

      // [STRUCTURAL LOGIC] L-Infinity norm for Bismuth/Deco stepped crystalline geometry
      float crystal(vec3 p) {
        vec3 q = abs(fract(p) - 0.5);
        return max(q.x, max(q.y, q.z));
      }

      void main() {
        // Normalize coordinates
        vec2 uv = (vUv - 0.5) * 2.0;
        uv.x *= u_resolution.x / u_resolution.y;

        // --- THE THREE TIME SCALES ---
        float t_slow = u_time * 0.05; // Global drift
        float t_med  = u_time * 0.25; // Tectonic structural motion
        float t_fast = u_time * 3.0;  // Micro-fluctuation shimmer

        // Base coordinate space with slow drift
        vec3 p = vec3(uv * 2.5, t_slow);

        // Domain warping via noise
        vec3 warp = vec3(
            noise(p * 1.5 + t_med),
            noise(p * 1.5 + t_med + 13.3),
            noise(p * 1.5 + t_med + 27.8)
        ) * 2.0 - 1.0;
        
        // [THE WEIRD MECHANISM] Deco Quantization: 
        // We step the warp itself to force rectilinear failure into fluid noise
        warp = floor(warp * 6.0) / 6.0; 
        p += warp * 1.2;

        // Layered crystalline lattices competing for space
        float l1 = crystal(p * 2.0);
        float l2 = crystal(p * 4.0 + warp);
        float l3 = crystal(p * 8.0 - warp);

        // Accumulate physical depth (Z-buffer proxy)
        float depth = (l1 * 0.5 + l2 * 0.25 + l3 * 0.125) * 2.0;

        // Inject fast physical grain into the depth field
        float grain = hash(vec3(uv * 200.0, t_fast));
        depth += grain * 0.03;

        // [GPU AUTOPSY] Procedural Normal Map via Screen-Space Derivatives
        // Generates harsh, faceted crystalline lighting inherently
        float dX = dFdx(depth);
        float dY = dFdy(depth);
        vec3 normal = normalize(vec3(dX * 150.0, dY * 150.0, 1.0));

        // [OPTICS] Thin-Film / Bragg Reflection Logic
        float viewAngle = max(0.1, dot(normal, vec3(0.0, 0.0, 1.0)));
        float opticalPath = 2.0 * 1.56 * depth * viewAngle; // n=1.56 (chitin/mineral index)

        // Map optical path to tight Interference Fringes
        float phase = opticalPath * 12.0 - t_slow * 5.0;
        
        // Exponentiate to create sharp, laser-like bands separated by absolute void
        float c_band = pow(0.5 + 0.5 * sin(phase), 16.0);
        float m_band = pow(0.5 + 0.5 * sin(phase + 2.094), 16.0);
        float y_band = pow(0.5 + 0.5 * sin(phase + 4.188), 16.0);

        vec3 cyan = vec3(0.0, 1.0, 1.0);
        vec3 mag  = vec3(1.0, 0.0, 1.0);
        vec3 yel  = vec3(1.0, 1.0, 0.0);

        // The Neon Synthesis
        vec3 color = c_band * cyan + m_band * mag + y_band * yel;

        // [VOID BLACK] Structural Shadows & Cavities
        float cavity = smoothstep(0.1, 0.9, depth);
        
        // Deco contour ridges (black striations at specific depth intervals)
        float contour = smoothstep(0.0, 0.05, abs(fract(depth * 8.0) - 0.5));
        
        color *= cavity;
        color *= contour;

        // Iridescent high-frequency specular glint (The Shimmer)
        float glint = pow(max(0.0, dot(normal, normalize(vec3(0.5, 0.5, 1.0)))), 30.0);
        color += glint * grain * vec3(0.8, 1.0, 1.0) * 2.0;

        // Force deeper blacks and higher neon contrast
        color = pow(color, vec3(1.2));

        // Optical vignette
        float vignette = 1.0 - dot(vUv - 0.5, vUv - 0.5) * 1.5;
        color *= smoothstep(0.0, 0.8, vignette);

        fragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
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
  if (material.uniforms.u_time) material.uniforms.u_time.value = time;
  if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);