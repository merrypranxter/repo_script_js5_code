try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
    
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

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

      in vec2 vUv;
      out vec4 fragColor;

      // =====================================================================
      // THE ALCHEMICAL ENGINE: 
      // Merging Kirlian Dielectric Breakdown, Dream Physics (Mnemonic Gravity),
      // OKLCh Spectral Rainbows, and Dispersed Dithering.
      // =====================================================================

      // --- Math & Noise Primitives ---
      float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      // Fractional Brownian Motion (fBM)
      float fbm(vec2 p) {
          float f = 0.0;
          float amp = 0.5;
          mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
          for(int i = 0; i < 6; i++) {
              f += amp * noise(p);
              p = rot * p * 2.0;
              amp *= 0.5;
          }
          return f;
      }

      // --- Color Systems: OKLCh -> OKLab -> Linear sRGB -> sRGB ---
      vec3 oklch2oklab(vec3 lch) {
          return vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
      }

      vec3 oklab2linear(vec3 c) {
          float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
          float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
          float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
          float l = l_ * l_ * l_;
          float m = m_ * m_ * m_;
          float s = s_ * s_ * s_;
          return vec3(
               4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
              -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
              -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
          );
      }

      vec3 linear2srgb(vec3 c) {
          c = max(c, vec3(0.0));
          bvec3 cutoff = lessThan(c, vec3(0.0031308));
          vec3 lower = c * 12.92;
          vec3 higher = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
          return mix(higher, lower, cutoff);
      }

      // --- Dither: Bayer Matrix (Limitation As Aesthetic) ---
      float getBayer(ivec2 p) {
          int x = p.x % 4;
          int y = p.y % 4;
          int idx = y * 4 + x;
          float b = 0.0;
          if(idx==0) b=0.; else if(idx==1) b=8.; else if(idx==2) b=2.; else if(idx==3) b=10.;
          else if(idx==4) b=12.; else if(idx==5) b=4.; else if(idx==6) b=14.; else if(idx==7) b=6.;
          else if(idx==8) b=3.; else if(idx==9) b=11.; else if(idx==10) b=1.; else if(idx==11) b=9.;
          else if(idx==12) b=15.; else if(idx==13) b=7.; else if(idx==14) b=13.; else if(idx==15) b=5.;
          return b / 16.0;
      }

      void main() {
          // Normalize coordinates
          vec2 uv = vUv;
          vec2 st = uv * 6.0;
          st.x *= u_resolution.x / u_resolution.y;

          // 1. Dream Physics: Mnemonic Gravity Well (Central Attractor)
          vec2 center = vec2(3.0 * (u_resolution.x / u_resolution.y), 3.0);
          vec2 delta = st - center;
          float dist = length(delta);
          float angle = atan(delta.y, delta.x);
          
          // The gravity well warps space based on affective energy (time)
          float pull = exp(-dist * 1.2) * sin(u_time * 0.8) * 2.0;
          st += vec2(cos(angle), sin(angle)) * pull;

          // 2. Rainblown Shear: Kairotempic Wind
          // Strong diagonal shear to create the "rainblown" aesthetic
          vec2 wind = vec2(u_time * 1.5, u_time * -2.5);
          
          // Domain Warping (The Probability Engine)
          vec2 q = vec2(fbm(st + wind * 0.3), fbm(st + vec2(5.2, 1.3) - wind * 0.2));
          vec2 r = vec2(fbm(st + 4.0 * q + vec2(1.7, 9.2) + wind * 1.2),
                        fbm(st + 4.0 * q + vec2(8.3, 2.8) - wind * 0.8));
          
          // 3. Kirlian Discharge: Dielectric Breakdown Model (DBM)
          // Creating sharp ridges by accumulating absolute noise differences
          float discharge = 0.0;
          vec2 dp = st + r * 2.5;
          float d_amp = 1.0;
          mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
          for(int i = 0; i < 6; i++) {
              // The 'abs' creates the sharp ridges characteristic of lightning/plasma
              discharge += d_amp * abs(noise(dp) - 0.5) * 2.0;
              dp = rot * dp * 2.0;
              dp += wind * d_amp * 0.5; // Wind blows the streamers
              d_amp *= 0.5;
          }
          // Invert to make peaks bright
          discharge = 1.0 - discharge;
          
          // Apply non-linear power to isolate the fractal branches (Meek's criterion)
          float streamers = pow(max(discharge, 0.0), 3.5);
          float ambient_glow = pow(max(discharge, 0.0), 1.2) * 0.3;

          // 4. Color Systems: Spectral Rainbow via OKLCh
          // Hue is driven by the domain warp and time (Fibonacci/Golden Angle sweeping)
          float hue = r.x * 6.28318 + u_time * 0.4;
          
          // Chroma is driven by the Kirlian discharge intensity (Neon Acid vibes)
          float chroma = 0.05 + 0.35 * streamers + 0.1 * q.x;
          
          // Lightness is a mix of ambient field depth and the lightning strike
          float lightness = 0.15 + 0.7 * streamers + ambient_glow;

          vec3 lch = vec3(lightness, chroma, hue);
          vec3 oklab = oklch2oklab(lch);
          vec3 rgb = linear2srgb(oklab2linear(oklab));

          // 5. Dither: Limitation as Aesthetic
          ivec2 fragCoord = ivec2(gl_FragCoord.xy);
          float ditherThreshold = getBayer(fragCoord);
          
          // Add error diffusion noise based on the Bayer matrix
          rgb += (ditherThreshold - 0.5) * 0.15;
          
          // Quantize the output to create a "fossilized math" / retro-digital texture
          float steps = 6.0;
          rgb = floor(rgb * steps + 0.5) / steps;

          // Add a pure white core to the most intense streamers to simulate plasma
          float core = smoothstep(0.8, 1.0, streamers);
          rgb = mix(rgb, vec3(1.0), core);

          // Vignette (Dream Physics: Edge of the Symbol Field)
          float vig = 1.0 - smoothstep(0.4, 1.5, dist / 6.0);
          rgb *= vig;

          fragColor = vec4(rgb, 1.0);
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

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  // Update uniforms safely
  if (material && material.uniforms) {
    if (material.uniforms.u_time) {
      material.uniforms.u_time.value = time;
    }
    if (material.uniforms.u_resolution) {
      material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
  }

  // Ensure canvas fits container
  if (renderer.domElement.width !== grid.width || renderer.domElement.height !== grid.height) {
    renderer.setSize(grid.width, grid.height, false);
  }

  renderer.render(scene, camera);

} catch (err) {
  console.error("The Alchemical Engine failed to compile:", err);
}