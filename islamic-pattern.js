try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL2 context required");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
    camera.position.z = 1;

    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      in vec2 vUv;
      out vec4 fragColor;
      
      uniform float u_time;
      uniform vec2 u_resolution;

      #define PI 3.14159265359

      // --- COLOR SYSTEMS: OKLCh to sRGB ---
      // Perceptually uniform color space conversion for mineral gradients
      vec3 oklch2srgb(vec3 c) {
          float L = c.x;
          float C = c.y;
          float h = c.z * PI / 180.0;
          
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
          
          // Gamma encode
          vec3 srgb = mix(
              rgb * 12.92,
              1.055 * pow(max(rgb, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
              step(0.0031308, rgb)
          );
          return clamp(srgb, 0.0, 1.0);
      }

      // --- NOISE FIELDS: Value FBM & Domain Warp ---
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
              mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
              u.y
          );
      }

      float fbm(vec2 p) {
          float f = 0.0;
          float w = 0.5;
          for (int i = 0; i < 5; i++) {
              f += w * noise(p);
              p *= 2.0;
              w *= 0.5;
          }
          return f;
      }

      void main() {
          vec2 uv = (vUv - 0.5) * 2.0;
          uv.x *= u_resolution.x / u_resolution.y;

          float r = length(uv);
          
          // THE WEIRD MECHANISM: Autophagic Memory Splicing
          // Sacred geometry is pure at the center, but as it radiates outward,
          // the coordinate manifold is infected by fungal/mineral domain warp.
          float corruption = smoothstep(0.3, 2.5, r);
          
          vec2 p = uv * 4.0; // Base scale
          
          // Hostile Coordinates: FBM domain warp that increases with distance
          float t_warp = u_time * 0.15;
          vec2 warp = vec2(
              fbm(p + t_warp),
              fbm(p + vec2(5.2, 1.3) - t_warp)
          ) * 2.0 - 1.0;
          
          p += warp * corruption * 3.0; // The structure rots into biology at the edges

          // --- ISLAMIC TILING: 10-Fold Quasiperiodic Pentagrid ---
          float sp = 1.0; 
          sp += 0.15 * sin(u_time * 0.5 + r * 3.0) * corruption; // The grid breathes where corrupted
          
          float allD = 1e9;
          float sumI = 0.0;
          
          for (int k = 0; k < 5; k++) {
              float a = float(k) * PI / 5.0;
              float g = float(k + 1) / 10.0;
              vec2 n = vec2(cos(a), sin(a));
              
              float proj = dot(p, n) / sp + g;
              float d = abs(fract(proj + 0.5) - 0.5) * sp;
              
              allD = min(allD, d);
              sumI += floor(proj + 0.5);
          }

          // --- MINERAL LITHOGENESIS: Azurite, Malachite, & Bone ---
          // Use the pentagrid index sum to determine the "tile" mineral type
          float tileType = mod(sumI, 10.0);
          float mineralMix = fbm(p * 1.5 + u_time * 0.05);
          
          vec3 baseLCH;
          if (tileType < 3.0) {
              // Azurite (Deep Lapis Blue)
              baseLCH = vec3(0.35, 0.16, 260.0 + mineralMix * 20.0);
          } else if (tileType < 7.0) {
              // Malachite (Emerald/Forest Green)
              baseLCH = vec3(0.45, 0.12, 145.0 + mineralMix * 25.0);
              // Botryoidal banding specific to malachite zones
              float banding = sin(fbm(p * 5.0) * 40.0 - u_time * 2.0);
              baseLCH.x += banding * 0.06 * corruption;
          } else {
              // Bone & Rust (Weathered Stucco/Oxide)
              baseLCH = vec3(0.65, 0.08, 50.0 + mineralMix * 30.0);
          }
          
          vec3 bgColor = oklch2srgb(baseLCH);

          // --- SHINY SYSTEMS: Bismuth / Gold Strapwork Veins ---
          // Shine occupies structure. The lines are iridescent metallic veins.
          float lineW = 0.035 + 0.015 * sin(u_time * 1.2 + r * 4.0);
          float lineMask = 1.0 - smoothstep(lineW - 0.015, lineW + 0.015, allD);
          
          // Bismuth Iridescence: Hue shifts rapidly based on distance to core and grid index
          float veinHue = u_time * 45.0 + allD * 600.0 + sumI * 18.0;
          vec3 veinLCH = vec3(0.85, 0.15, mod(veinHue, 360.0));
          vec3 veinColor = oklch2srgb(veinLCH);
          
          // Deep Volumetric Glow (Thermal Bloom) bleeding from the cracks
          float glow = 0.008 / (allD * allD + 0.001);
          vec3 glowColor = oklch2srgb(vec3(0.6, 0.25, mod(veinHue, 360.0))) * glow * (1.0 + corruption * 0.5);

          // Compositing
          vec3 finalColor = mix(bgColor, veinColor, lineMask);
          finalColor += glowColor * 0.8;
          
          // Vignette & Abyssal Rendering at the absolute edges
          finalColor *= 1.0 - smoothstep(1.2, 2.8, r);
          
          // Glitch Prophet: Introduce rare NaNs/burnout flashes near the edge
          float glitch = step(0.98, hash(uv + u_time)) * corruption;
          finalColor = mix(finalColor, vec3(1.0), glitch * 0.5);

          fragColor = vec4(finalColor, 1.0);
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

} catch (err) {
  console.error("The Feral Brain encountered a compilation hemorrhage:", err);
}