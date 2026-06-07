try {
  if (!ctx) throw new Error("WebGL 2 context not available");

  if (!canvas.__three) {
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      context: ctx,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const vertexShader = `
      in vec3 position;
      in vec2 uv;
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      in vec2 vUv;
      out vec4 fragColor;

      // --- Feral Noise Engine ---
      vec2 hash22(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }

      float snoise(vec2 p) {
        const float K1 = 0.366025404; 
        const float K2 = 0.211324865; 
        vec2 i = floor(p + (p.x + p.y) * K1);
        vec2 a = p - i + (i.x + i.y) * K2;
        float m = step(a.y, a.x);
        vec2 o = vec2(m, 1.0 - m);
        vec2 b = a - o + K2;
        vec2 c = a - 1.0 + 2.0 * K2;
        vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
        vec3 n = h * h * h * h * vec3(dot(a, hash22(i + 0.0)), dot(b, hash22(i + o)), dot(c, hash22(i + 1.0)));
        return dot(n, vec3(70.0));
      }

      float fbm(vec2 p) {
        float f = 0.0;
        float amp = 0.5;
        for(int i = 0; i < 5; i++) {
          f += amp * snoise(p);
          p = p * 2.0 + vec2(1.23, 4.56);
          amp *= 0.5;
        }
        return f;
      }

      // --- Structural Topology ---
      // Combines Mycelial anastomosis, Resist Dye crackle, and fluid domain warping
      float structural_density(vec2 p, float t_slow, float t_med) {
        // Domain Warp (Slow drift)
        vec2 warp1 = vec2(fbm(p + t_slow), fbm(p + vec2(5.2, 1.3) - t_slow));
        vec2 warp2 = vec2(fbm(p + 2.0 * warp1 + t_med), fbm(p + 2.0 * warp1 - t_med));
        p += warp2 * 0.3;

        // Base structural mass
        float mass = fbm(p * 3.0);

        // Resist Dye Crackle / Mycelial Veins
        float n1 = fbm(p * 8.0);
        float n2 = fbm(p * 8.0 + 10.0);
        float veins = 1.0 - smoothstep(0.0, 0.08, abs(n1 - n2));

        // Turing-like activation/inhibition spots
        float act = fbm(p * 15.0 - t_med * 0.5);
        float inh = fbm(p * 5.0 + t_med * 0.5);
        float spots = smoothstep(0.1, 0.4, act - inh * 0.5);

        return mass * 0.5 + veins * 0.35 + spots * 0.15;
      }

      void main() {
        // --- Three Time Scales ---
        float t_slow = u_time * 0.05;
        float t_med  = u_time * 0.25;
        float t_fast = u_time * 2.0;

        // Aspect ratio correction
        vec2 uv = vUv;
        uv.x *= u_resolution.x / u_resolution.y;
        uv *= 1.5; // Scale

        // --- CMYK Misregistration & Chromatic Aberration ---
        // Calculate dynamic offsets for color channels
        vec2 offset_dir = normalize(vec2(fbm(uv * 4.0), fbm(uv * 4.0 + 3.14)));
        float aberration = 0.015 + 0.01 * snoise(uv * 2.0 + t_fast * 0.5);

        vec2 uv_C = uv + offset_dir * aberration;
        vec2 uv_M = uv;
        vec2 uv_Y = uv - offset_dir * aberration;

        // Evaluate physical thickness for each channel
        float d_C = structural_density(uv_C, t_slow, t_med);
        float d_M = structural_density(uv_M, t_slow, t_med);
        float d_Y = structural_density(uv_Y, t_slow, t_med);

        // --- Thin-Film Interference / Fabry-Perot Peaks ---
        // Map thickness to sharp interference bands
        float band_C = pow(sin(d_C * 35.0 - t_slow * 10.0) * 0.5 + 0.5, 16.0);
        float band_M = pow(sin(d_M * 38.0 - t_slow * 10.0 + 1.0) * 0.5 + 0.5, 16.0);
        float band_Y = pow(sin(d_Y * 42.0 - t_slow * 10.0 + 2.0) * 0.5 + 0.5, 16.0);

        // Add base structural fill to prevent complete darkness
        float fill_C = smoothstep(0.3, 0.8, d_C) * 0.4;
        float fill_M = smoothstep(0.3, 0.8, d_M) * 0.4;
        float fill_Y = smoothstep(0.3, 0.8, d_Y) * 0.4;

        float val_C = max(band_C, fill_C);
        float val_M = max(band_M, fill_M);
        float val_Y = max(band_Y, fill_Y);

        // --- Physical Depth & Lighting ---
        // Compute pseudo-normals from the master density map
        float eps = 0.002;
        float h0 = d_M;
        float hx = structural_density(uv_M + vec2(eps, 0.0), t_slow, t_med);
        float hy = structural_density(uv_M + vec2(0.0, eps), t_slow, t_med);
        vec3 normal = normalize(vec3(h0 - hx, h0 - hy, 0.025));

        // Dynamic light source (Fast Shimmer)
        vec3 light_pos = vec3(sin(t_fast * 0.7), cos(t_fast * 0.9), 0.8);
        vec3 light_dir = normalize(light_pos - vec3(vUv * 2.0 - 1.0, 0.0));

        float diff = max(dot(normal, light_dir), 0.0);
        float spec = pow(max(dot(reflect(-light_dir, normal), vec3(0.0, 0.0, 1.0)), 0.0), 24.0);

        // Modulate values by lighting
        val_C = val_C * (0.4 + 0.6 * diff) + spec * 0.6;
        val_M = val_M * (0.4 + 0.6 * diff) + spec * 0.6;
        val_Y = val_Y * (0.4 + 0.6 * diff) + spec * 0.6;

        // --- Color Synthesis (Void Black + Neon CMY) ---
        vec3 void_black = vec3(0.015, 0.02, 0.025);
        vec3 neon_C = vec3(0.0, 1.0, 0.94);
        vec3 neon_M = vec3(1.0, 0.0, 0.8);
        vec3 neon_Y = vec3(1.0, 0.9, 0.0);

        vec3 color = void_black;
        // Screen Blend layering
        color = 1.0 - (1.0 - color) * (1.0 - neon_C * clamp(val_C, 0.0, 1.0));
        color = 1.0 - (1.0 - color) * (1.0 - neon_M * clamp(val_M, 0.0, 1.0));
        color = 1.0 - (1.0 - color) * (1.0 - neon_Y * clamp(val_Y, 0.0, 1.0));

        // Ambient Occlusion (darken deep crevices)
        color *= smoothstep(-0.1, 0.6, h0);

        // --- Xerox Grain / Film Texture (Fast) ---
        float grain = fract(sin(dot(gl_FragCoord.xy + t_fast, vec2(12.9898, 78.233))) * 43758.5453);
        // Soft light blend for grain
        vec3 grain_vec = vec3(grain);
        color = mix(color, color * (1.0 + (grain_vec - 0.5) * 0.5), 0.65);

        // Vignette
        vec2 centered = vUv * 2.0 - 1.0;
        float vig = dot(centered, centered);
        color *= 1.0 - vig * 0.35;

        // Posterize slightly to enhance the 'printed' acid aesthetic
        color = smoothstep(0.02, 0.98, color);

        fragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
      },
      depthWrite: false,
      depthTest: false
    });

    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -1.0, -1.0, 0.0,
       1.0, -1.0, 0.0,
      -1.0,  1.0, 0.0,
       1.0, -1.0, 0.0,
       1.0,  1.0, 0.0,
      -1.0,  1.0, 0.0
    ]);
    const uvs = new Float32Array([
      0.0, 0.0,
      1.0, 0.0,
      0.0, 1.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0
    ]);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  if (material && material.uniforms) {
    if (material.uniforms.u_time) {
      material.uniforms.u_time.value = time;
    }
    if (material.uniforms.u_resolution) {
      material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("WebGL Initialization or Render Failed:", e);
}