try {
  if (!ctx) throw new Error("WebGL 2 context not available");

  if (!canvas.__three) {
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
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

      // 2D Simplex Noise
      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
      float snoise(vec2 v){
          const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                   -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1;
          i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod(i, 289.0);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
          + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
            dot(x12.zw,x12.zw)), 0.0);
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

      // I-Ching 6-bit Continuous Heightfield
      // Evaluates 6 frequencies of noise to create a 64-level terraced landscape
      float get_height(vec2 pos) {
          float h = 0.0;
          for(int i = 0; i < 6; i++) {
              float fi = float(i);
              float freq = 2.0 * pow(1.5, fi);
              float speed = 0.15 * (fi + 1.0);
              float n = snoise(pos * freq + u_time * speed * (mod(fi, 2.0) == 0.0 ? 1.0 : -1.0));
              
              // Smooth quantization to create "candy ridges"
              float bit_weight = smoothstep(-0.08, 0.08, n);
              h += bit_weight * pow(0.5, fi + 1.0);
          }
          return h;
      }

      // I-Ching 6-bit Discrete Evaluator
      int get_hex(vec2 pos) {
          int h = 0;
          for(int i = 0; i < 6; i++) {
              float fi = float(i);
              float freq = 2.0 * pow(1.5, fi);
              float speed = 0.15 * (fi + 1.0);
              float n = snoise(pos * freq + u_time * speed * (mod(fi, 2.0) == 0.0 ? 1.0 : -1.0));
              if(n > 0.0) h |= (1 << i);
          }
          return h;
      }

      // Acidic Candy Pop Trigram Palette
      vec3 trigramColor(int tri) {
          if(tri == 0) return vec3(0.8, 0.0, 0.5); // Earth - Hot Pink/Magenta
          if(tri == 1) return vec3(0.6, 1.0, 0.0); // Thunder - Toxic Lime
          if(tri == 2) return vec3(0.0, 1.0, 0.8); // Water - Electric Cyan
          if(tri == 3) return vec3(1.0, 0.0, 0.8); // Lake - Bubblegum
          if(tri == 4) return vec3(0.4, 0.0, 1.0); // Mountain - Deep Violet
          if(tri == 5) return vec3(1.0, 0.2, 0.0); // Fire - Neon Orange
          if(tri == 6) return vec3(0.0, 1.0, 0.3); // Wind - Sour Green
          return vec3(1.0, 0.9, 0.0);              // Heaven - Radioactive Lemon
      }

      void main() {
          // Aspect ratio correction and domain warping
          vec2 p = vUv * 4.0;
          p.x *= u_resolution.x / u_resolution.y;
          
          // Mycological/Fluid Domain Warp
          p += vec2(snoise(p * 0.8 + u_time * 0.1), snoise(p.yx * 0.8 - u_time * 0.1)) * 0.5;

          // Compute Normals from the terraced heightfield (Candy Surface)
          vec2 e = vec2(0.005, 0.0);
          float H = get_height(p);
          vec3 N = normalize(vec3(
              get_height(p + e.xy) - H,
              get_height(p + e.yx) - H,
              0.03 // Depth / Sharpness of the candy ridges
          ));

          // Base 6-bit state
          int hex = get_hex(p);
          
          // Changing Lines Cellular Automata (XOR mutation over time)
          int time_seed = int(u_time * 6.0) % 64;
          int mutated = hex ^ time_seed; 

          // Extract Trigrams & Nuclear Hexagram
          int lower = mutated & 7;
          int upper = (mutated >> 3) & 7;
          int nuclear = ((mutated >> 1) & 7) | (((mutated >> 2) & 7) << 3);

          // Color Synthesis (Acid Pop)
          vec3 c_lower = trigramColor(lower);
          vec3 c_upper = trigramColor(upper);
          
          // Blend based on the nuclear ghost state
          float blend_factor = 0.5 + 0.5 * sin(float(nuclear) * 0.1 + u_time);
          vec3 base_color = mix(c_lower, c_upper, blend_factor);

          // Lighting Setup (Glossy Wet Candy)
          vec3 V = vec3(0.0, 0.0, 1.0);
          vec3 L = normalize(vec3(sin(u_time * 0.5), cos(u_time * 0.3), 1.0));
          vec3 L2 = normalize(vec3(-sin(u_time * 0.7), -cos(u_time * 0.4), 0.5)); // Secondary rim light
          vec3 H_vec = normalize(L + V);
          vec3 H_vec2 = normalize(L2 + V);

          float diff = max(dot(N, L), 0.0);
          float diff2 = max(dot(N, L2), 0.0);
          float spec = pow(max(dot(N, H_vec), 0.0), 128.0); // Extremely sharp specularity
          float spec2 = pow(max(dot(N, H_vec2), 0.0), 64.0);
          
          // Fresnel for gummy edges
          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.0);

          // Subsurface scattering approximation (internal glow based on depth)
          float sss = smoothstep(0.0, 1.0, H);

          // Iridescence / Thin-film interference on the candy coating
          vec3 iridescence = vec3(
              0.5 + 0.5 * cos(u_time * 2.0 + fresnel * 15.0),
              0.5 + 0.5 * cos(u_time * 2.0 + fresnel * 15.0 + 2.0),
              0.5 + 0.5 * cos(u_time * 2.0 + fresnel * 15.0 + 4.0)
          );

          // Composite the material
          vec3 final_color = base_color * (diff * 0.7 + 0.3); // Diffuse
          final_color += base_color * diff2 * 0.4; // Secondary diffuse
          final_color += vec3(1.0) * spec * 1.5; // Primary highlight
          final_color += iridescence * spec2 * 0.8; // Iridescent secondary highlight
          final_color += base_color * sss * 0.6; // Subsurface glow
          final_color += iridescence * fresnel * 0.8; // Rim iridescence

          // Vignette
          vec2 centered_uv = vUv - 0.5;
          final_color *= 1.0 - dot(centered_uv, centered_uv) * 0.8;

          // Output
          fragColor = vec4(final_color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0.0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
      },
      depthWrite: false,
      depthTest: false
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(plane);

    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  if (material && material.uniforms) {
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("WebGL 2 / Three.js Initialization Failed:", e);
}