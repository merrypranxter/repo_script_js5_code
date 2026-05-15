try {
  if (!canvas.__three) {
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

      // [THE-LISTS] Domain 13: Noise / Entropy
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      float fbm(vec2 p) {
        float v = 0.0; float a = 0.5;
        for(int i = 0; i < 3; i++) {
          v += a * noise(p); p *= 2.0; a *= 0.5;
        }
        return v;
      }

      // [color_systems] OKLab to Linear sRGB to sRGB
      vec3 oklch_to_srgb(vec3 lch) {
        float L = lch.x; float C = lch.y; float h = lch.z;
        float a = C * cos(h); float b = C * sin(h);

        float l_ = L + 0.3963377774 * a + 0.2158037573 * b;
        float m_ = L - 0.1055613458 * a - 0.0638541728 * b;
        float s_ = L - 0.0894841775 * a - 1.2914855480 * b;

        float l = l_ * l_ * l_;
        float m = m_ * m_ * m_;
        float s = s_ * s_ * s_;

        vec3 lin = vec3(
           4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
          -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
          -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
        );

        bvec3 cutoff = lessThanEqual(lin, vec3(0.0031308));
        vec3 higher = 1.055 * pow(max(lin, vec3(0.0)), vec3(1.0/2.4)) - vec3(0.055);
        vec3 lower = lin * 12.92;
        return mix(higher, lower, vec3(cutoff));
      }

      // [shoegaze_style] + [color_systems] Void Black to Neon CMY mapping
      vec3 getPalette(float t) {
        t = fract(t);
        vec3 c1 = vec3(0.04, 0.0, 0.0);    // Void Black
        vec3 c2 = vec3(0.78, 0.22, 3.40);  // Neon Cyan
        vec3 c3 = vec3(0.68, 0.28, 5.72);  // Neon Magenta
        vec3 c4 = vec3(0.92, 0.25, 1.90);  // Neon Yellow

        float w1 = smoothstep(0.0, 0.25, t) - smoothstep(0.25, 0.5, t);
        float w2 = smoothstep(0.25, 0.5, t) - smoothstep(0.5, 0.75, t);
        float w3 = smoothstep(0.5, 0.75, t) - smoothstep(0.75, 1.0, t);
        float w4 = smoothstep(0.75, 1.0, t) + (1.0 - smoothstep(0.0, 0.25, t));

        return c1 * w4 + c2 * w1 + c3 * w2 + c4 * w3;
      }

      // [vibration] + [THE-LISTS] Core mathematical substance generator
      float computeSubstance(vec2 p, float t) {
        // Slow Time: Anisotropic drift & Domain Warping
        float slowT = t * 0.15;
        vec2 q = vec2(fbm(p * 2.5 + slowT), fbm(p.yx * 2.5 - slowT));
        vec2 warped = p + q * 1.2;

        // Medium Time: Chladni eigenmodes / Minimal Surface (Schwarz P-ish)
        float medT = t * 0.7;
        float chladni = abs(sin(warped.x * 12.0 + medT)) * abs(cos(warped.y * 12.0 - medT))
                      - abs(sin(warped.x * 18.0 - medT * 1.3)) * abs(cos(warped.y * 18.0 + medT * 1.1));

        // Fast Time: Moiré / Cymatic standing wave shimmer
        float fastT = t * 4.0;
        float moire = sin(length(warped) * 90.0 - fastT) * cos(warped.x * 100.0 + fastT * 0.8);

        // [vibration] Brainwave Epsilon throb integration
        float throb = sin(t * 0.3) * 0.5 + 0.5;

        float sig = chladni * 0.65 + moire * (0.15 + throb * 0.1) + q.x * 0.35;

        // [THE-LISTS] Harmonic clip / phase desync glitch
        if (fract(t * 0.4 + p.y) > 0.97) sig += 0.4 * sin(p.x * 250.0);

        return sig;
      }

      vec3 computeMaterial(vec2 uv, float t) {
        float s = computeSubstance(uv, t);

        // Emboss / Normal mapping to create physical depth (trabecular foam)
        float eps = 0.004;
        float s_dx = computeSubstance(uv + vec2(eps, 0.0), t);
        float s_dy = computeSubstance(uv + vec2(0.0, eps), t);

        vec3 normal = normalize(vec3(s_dx - s, s_dy - s, 0.06));
        vec3 lightDir = normalize(vec3(sin(t * 0.5), 1.0, cos(t * 0.5)));

        float diffuse = max(dot(normal, lightDir), 0.0);
        float specular = pow(max(dot(reflect(-lightDir, normal), vec3(0.0, 0.0, 1.0)), 0.0), 16.0);

        vec3 lch = getPalette(s * 1.5 + t * 0.15);

        // Modulate OKLCh Lightness via physical lighting
        lch.x *= (0.3 + diffuse * 0.8);
        lch.x += specular * 0.45; // Halation bloom on specular ridges

        return oklch_to_srgb(lch);
      }

      void main() {
        vec2 uv = vUv * 2.0 - 1.0;
        uv.x *= u_resolution.x / u_resolution.y;

        // [shoegaze_style] Chromatic Aberration (Lens defect)
        float ca = 0.009 * length(uv);
        vec2 dir = normalize(uv);

        vec3 colR = computeMaterial(uv + dir * ca, u_time);
        vec3 colG = computeMaterial(uv, u_time);
        vec3 colB = computeMaterial(uv - dir * ca, u_time);

        vec3 col = vec3(colR.r, colG.g, colB.b);

        // [shoegaze_style] Texture Memory: Film Grain Clumps + Dust
        float clumpNoise = fbm(uv * 150.0 + u_time);
        float rawNoise = hash(uv * u_time * 100.0);
        float grain = ((rawNoise * 0.6 + clumpNoise * 0.4) - 0.5) * 0.18;
        col += grain;

        // [shoegaze_style] Dreamy diffusion bloom / Ambient fog volume
        float ambientFog = fbm(uv * 4.0 - u_time * 0.2);
        col = mix(col, vec3(0.02, 0.05, 0.1), ambientFog * 0.25);

        // Gentle Vignette
        float vig = 1.0 - smoothstep(0.3, 1.8, length(uv));
        col *= vig;

        // Tone curve contrast boost
        col = smoothstep(0.03, 0.98, col);

        fragColor = vec4(col, 1.0);
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
  
  if (material?.uniforms?.u_time) {
    material.uniforms.u_time.value = time;
  }
  if (material?.uniforms?.u_resolution) {
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (error) {
  console.error("Feral Lithogenesis WebGL Initialization Failed:", error);
}