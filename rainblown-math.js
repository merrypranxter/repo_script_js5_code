try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({
      canvas,
      context: ctx,
      alpha: true,
      antialias: true
    });
    
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

      // --------------------------------------------------------
      // THE WEIRD CODE GUY: ALCHEMICAL MATH & NOISE
      // --------------------------------------------------------
      
      float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
      }
      
      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      
      float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          mat2 rot = mat2(0.866025, -0.5, 0.5, 0.866025);
          for(int i = 0; i < 6; i++) {
              v += a * noise(p);
              p = rot * p * 2.0;
              a *= 0.5;
          }
          return v;
      }

      // --------------------------------------------------------
      // COLOR SYSTEMS: OKLCh -> sRGB (Perceptual Uniformity)
      // --------------------------------------------------------
      
      vec3 oklch_to_srgb(float L, float C, float h) {
          float a = C * cos(h);
          float b = C * sin(h);
          
          float l_ = L + 0.3963377774 * a + 0.2158037573 * b;
          float m_ = L - 0.1055613458 * a - 0.0638541728 * b;
          float s_ = L - 0.0894841775 * a - 1.2914855480 * b;
          
          float l = l_ * l_ * l_;
          float m = m_ * m_ * m_;
          float s = s_ * s_ * s_;
          
          vec3 rgb = vec3(
               4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
              -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
              -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
          );
          
          // Gamma correction
          return mix(
              rgb * 12.92, 
              1.055 * pow(max(rgb, 0.0), vec3(1.0/2.4)) - 0.055, 
              step(0.0031308, rgb)
          );
      }

      // --------------------------------------------------------
      // STRUCTURAL COLOR: Thin-Film Interference
      // --------------------------------------------------------
      
      vec3 thin_film(float thickness, float view_angle, float offset) {
          float n = 1.45; // Refractive index of biological film (e.g., chitin)
          float opd = 2.0 * n * thickness * cos(view_angle);
          
          // Interference across RGB spectrum
          vec3 phase = opd / vec3(650.0, 530.0, 430.0) * 6.2831853;
          vec3 interference = 0.5 + 0.5 * cos(phase);
          
          // Map interference to OKLCh to ensure perceptual vividness
          float L = 0.55 + 0.2 * interference.g;
          float C = 0.25 + 0.1 * interference.r;
          float h = opd * 0.003 + u_time * 0.15 + offset;
          
          vec3 base_color = oklch_to_srgb(L, C, h);
          return base_color * (0.4 + 0.6 * interference); // Boost structural pop
      }

      // --------------------------------------------------------
      // FRACTAL ENGINE: Mycelial-Infected Apollonian Gasket
      // --------------------------------------------------------
      
      vec4 apollonian_map(vec2 p) {
          vec2 z = p;
          float scale = 1.0;
          float dist = 1e6;
          
          // Mycelial / Organic warping of the domain
          z += vec2(fbm(z * 2.5 + u_time * 0.2), fbm(z * 2.5 - u_time * 0.2)) * 0.15;

          for (int i = 0; i < 7; i++) {
              // Kleinian Fold
              z = -1.0 + 2.0 * fract(0.5 * z + 0.5);
              float r2 = dot(z, z);
              
              // Apollonian Inversion with Mycelial breathing (dynamic radius)
              float r_inv = 1.05 + 0.15 * sin(u_time * 0.3 + float(i) * 1.61803);
              if (r2 < r_inv) {
                  float k = r_inv / r2;
                  z *= k;
                  scale *= k;
              }
              
              // Descartes circle theorem influence (invert through a specific tangent circle)
              vec2 c1 = vec2(0.5, 0.5);
              float d1 = length(z - c1);
              if (d1 < 0.5) {
                  float k = 0.25 / (d1 * d1);
                  z = c1 + (z - c1) * k;
                  scale *= k;
              }
              
              dist = min(dist, length(z) / scale);
          }
          return vec4(z, dist, scale);
      }

      // --------------------------------------------------------
      // MAIN COMPOSITION
      // --------------------------------------------------------
      
      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
          uv *= 1.2; // Zoom out
          
          // RAINBLOWN WIND (Psychedelic Collage + Fluid Dynamics)
          vec2 wind_dir = normalize(vec2(1.2, 2.0));
          vec2 wind_uv = uv * mat2(wind_dir.x, -wind_dir.y, wind_dir.y, wind_dir.x);
          wind_uv.y *= 4.0; // Stretch noise along the wind vector
          wind_uv -= u_time * vec2(0.1, 0.6); // Blow across the screen
          
          float wind_streaks = fbm(wind_uv * 3.0);
          float rain_warp = fbm(uv * 2.5 - wind_dir * u_time) * 0.2;
          
          vec2 warped_uv = uv + wind_dir * rain_warp;
          
          // CMYK MISREGISTRATION / CHROMATIC ABERRATION (Glitch)
          float glitch = wind_streaks * 0.06; 
          
          vec4 mR = apollonian_map(warped_uv + wind_dir * glitch);
          vec4 mG = apollonian_map(warped_uv);
          vec4 mB = apollonian_map(warped_uv - wind_dir * glitch);
          
          // STRUCTURAL COLOR MAPPING
          // Map exponential fractal scale to thin-film thickness (nanometers)
          float tR = 200.0 + 800.0 * fract(log(mR.w) * 0.3 + wind_streaks * 0.4 - u_time * 0.1);
          float tG = 200.0 + 800.0 * fract(log(mG.w) * 0.3 + wind_streaks * 0.4 - u_time * 0.1);
          float tB = 200.0 + 800.0 * fract(log(mB.w) * 0.3 + wind_streaks * 0.4 - u_time * 0.1);
          
          // View angle approximation from fractal distance gradients
          float viewR = clamp(mR.y * 50.0, 0.0, 1.0); 
          float viewG = clamp(mG.y * 50.0, 0.0, 1.0);
          float viewB = clamp(mB.y * 50.0, 0.0, 1.0);
          
          vec3 colR = thin_film(tR, viewR, 0.0);
          vec3 colG = thin_film(tG, viewG, 2.094); // Phase shift for RGB
          vec3 colB = thin_film(tB, viewB, 4.188);
          
          // Recombine separated channels
          vec3 final_color = vec3(colR.r, colG.g, colB.b);
          
          // PSYCHEDELIC COLLAGE TEXTURE (Xerox Noise / Paper Grain)
          float grain = fract(sin(dot(gl_FragCoord.xy * 0.1 + u_time, vec2(127.1, 311.7))) * 43758.5453);
          final_color = mix(final_color, vec3(grain), 0.07);
          
          // TONEMAPPING (ACES Filmic)
          final_color = final_color * (2.51 * final_color + 0.03) / (final_color * (2.43 * final_color + 0.59) + 0.14);
          
          // Vignette
          float v = length(vUv - 0.5);
          final_color *= smoothstep(0.8, 0.2, v);
          
          fragColor = vec4(final_color, 1.0);
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
      transparent: true
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  if (material && material.uniforms) {
    material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) {
      material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("The Feral Math Engine Failed:", e);
}