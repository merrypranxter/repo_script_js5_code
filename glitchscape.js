try {
  if (!ctx) throw new Error("WebGL 2 context not available");

  if (!canvas.__three) {
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, context: ctx, alpha: true, antialias: false });
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

      #define PI 3.14159265359
      #define TAU 6.28318530718

      // ─── UTILITIES & HASHES ──────────────────────────────────────────
      float hash21(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      
      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash21(i);
          float b = hash21(i + vec2(1.0, 0.0));
          float c = hash21(i + vec2(0.0, 1.0));
          float d = hash21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      // ─── SDF PRIMITIVES ──────────────────────────────────────────────
      float sdBox(vec2 p, vec2 b) {
          vec2 d = abs(p) - b;
          return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
      }

      float sdStar5(vec2 p, float r, float rf) {
          const vec2 k1 = vec2(0.809016994375, -0.587785252292);
          const vec2 k2 = vec2(-k1.x, k1.y);
          p.x = abs(p.x);
          p -= 2.0 * max(dot(k1, p), 0.0) * k1;
          p -= 2.0 * max(dot(k2, p), 0.0) * k2;
          p.x = abs(p.x);
          p.y -= r;
          vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
          float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
          return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
      }

      float sdCross(vec2 p, vec2 b, float r) {
          p = abs(p); p = (p.y > p.x) ? p.yx : p.xy;
          vec2 q = p - b;
          float k = max(q.y, q.x);
          vec2 w = (k > 0.0) ? q : vec2(b.y - p.x, -k);
          return sign(k) * length(max(w, 0.0)) + r;
      }

      // ─── PALETTES (ACID / TOXIC / MYSPACE) ───────────────────────────
      vec3 getToxicColor(float t) {
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.5);
          vec3 c = vec3(2.0, 1.0, 1.0);
          vec3 d = vec3(0.5, 0.2, 0.25);
          return a + b * cos(TAU * (c * t + d));
      }

      vec3 iridescence(float t) {
          return 0.5 + 0.5 * cos(TAU * (vec3(1.0) * t + vec3(0.0, 0.33, 0.67)));
      }

      // ─── SCENE RENDERING ─────────────────────────────────────────────
      vec3 renderScene(vec2 uv, float timeOffset) {
          float t = u_time + timeOffset;
          vec3 col = vec3(0.0);

          // 1. OP ART TUNNEL (Black & White Hypnosis)
          vec2 polar = vec2(length(uv), atan(uv.y, uv.x));
          float r = polar.x;
          float a = polar.y;
          
          // Funnel distortion & radial compression
          float tunnel = sin(8.0 / (r + 0.1) + t * 4.0) * cos(10.0 * a + t * -2.0);
          float spiral = sin(20.0 * log(r + 0.01) - t * 5.0 + a * 6.0);
          float opArt = step(0.0, tunnel * spiral);
          
          col = mix(vec3(0.05), vec3(0.95), opArt);

          // 2. MYSPACE WINDOW DEBRIS
          for(float i = 0.0; i < 3.0; i++) {
              float wt = t * (0.5 + i * 0.2);
              vec2 winPos = vec2(sin(wt * 1.3 + i * 2.0) * 0.8, cos(wt * 0.9 + i * 4.0) * 0.5);
              vec2 wUv = uv - winPos;
              wUv *= rot(sin(t * 0.2 + i) * 0.5);
              
              float dWin = sdBox(wUv, vec2(0.4, 0.25));
              float dShadow = sdBox(wUv - vec2(0.03, -0.03), vec2(0.4, 0.25));
              
              if (dShadow < 0.0 && dWin > 0.0) col = vec3(0.0); // Drop shadow
              
              if (dWin < 0.0) {
                  col = vec3(0.85); // Plastic UI base
                  
                  // Tiled background chaos inside window
                  float checker = step(0.0, sin(wUv.x * 60.0) * cos(wUv.y * 60.0));
                  if (wUv.y < 0.15) col = mix(vec3(1.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0), checker);
                  
                  // Chrome Title Bar
                  if (wUv.y > 0.15) {
                      float chrome = smoothstep(0.15, 0.25, wUv.y) + sin(wUv.x * 10.0 + t * 2.0) * 0.2;
                      col = mix(vec3(0.2, 0.0, 0.8), vec3(0.6, 0.4, 1.0), chrome);
                  }
                  
                  // Red X Button
                  float dCross = sdCross(wUv - vec2(0.32, 0.2), vec2(0.02, 0.005), 0.005);
                  if (dCross < 0.0) col = vec3(1.0, 0.0, 0.0);
                  
                  // Bevel/Border
                  if (abs(dWin) < 0.01) col = vec3(1.0);
              }
          }

          // 3. TOXIC STICKERS (Stars)
          for(float i = 0.0; i < 6.0; i++) {
              float st = t * (1.0 + i * 0.1);
              vec2 sPos = vec2(cos(st * 1.7 + i * 5.0) * 1.2, sin(st * 1.1 + i * 3.0) * 0.8);
              vec2 sUv = uv - sPos;
              sUv *= rot(t + i);
              sUv *= 1.0 + sin(t * 3.0 + i) * 0.2; // Pulse
              
              float dStar = sdStar5(sUv, 0.15, 0.4);
              float dStarShadow = sdStar5(sUv - vec2(0.02, -0.02), 0.15, 0.4);
              
              if (dStarShadow < 0.0 && dStar > 0.0) col = vec3(0.0);
              
              if (dStar < 0.0) {
                  vec3 starCol = getToxicColor(i * 0.2 + t * 0.1);
                  // Faux plastic gem center
                  starCol += vec3(1.0) * smoothstep(0.0, -0.08, dStar);
                  col = starCol;
                  // Hard white sticker outline
                  if (dStar > -0.015) col = vec3(1.0);
              }
          }

          // 4. GLITTER GRAPHICS (MySpace Sparkles)
          vec2 gUv = uv * rot(t * 0.1);
          vec2 grid = fract(gUv * 30.0) - 0.5;
          vec2 id = floor(gUv * 30.0);
          float h = hash21(id);
          if (h > 0.85) {
              float twinkle = sin(t * 8.0 + h * 100.0) * 0.5 + 0.5;
              float starGlow = 0.008 / (length(grid) + 0.001);
              // 4-point starburst
              float crossGlow = 0.002 / (abs(grid.x) * abs(grid.y) + 0.001);
              vec3 glitCol = mix(vec3(1.0, 0.5, 1.0), vec3(0.0, 1.0, 1.0), fract(h * 10.0));
              col += glitCol * (starGlow + crossGlow * 0.2) * twinkle;
          }

          return col;
      }

      void main() {
          vec2 uv = vUv * 2.0 - 1.0;
          uv.x *= u_resolution.x / u_resolution.y;
          
          // ─── GLITCH & DATA ROT ENGINE ────────────────────────────────
          
          // 1. Datamosh / Interframe Smear
          vec2 moshUv = uv;
          float moshNoise = noise(floor(uv * 10.0) + floor(u_time * 4.0));
          if (moshNoise > 0.8) {
              moshUv.y -= u_time * 0.2 * fract(moshNoise * 123.45); // Drag pixels down
          }

          // 2. Macroblocking / Codec Entropy
          float blockThresh = step(0.92, hash21(vec2(floor(u_time * 6.0))));
          vec2 blockUv = floor(moshUv * 24.0) / 24.0;
          vec2 baseUv = mix(moshUv, blockUv, blockThresh * hash21(uv + u_time));
          
          // 3. VHS Tracking Tear
          float tear = step(0.95, hash21(vec2(vUv.y * 50.0, floor(u_time * 12.0))));
          baseUv.x += tear * 0.1 * sin(u_time * 20.0);

          // 4. Chromatic Aberration / RGB Split
          float split = 0.03 * sin(u_time * 3.0) * blockThresh;
          split += 0.01 * tear; // Extra split on tracking tears
          
          vec3 colR = renderScene(baseUv + vec2(split, 0.0), 0.0);
          vec3 colG = renderScene(baseUv, 0.0);
          vec3 colB = renderScene(baseUv - vec2(split, 0.0), -0.05); // Temporal lag on blue
          
          vec3 finalCol = vec3(colR.r, colG.g, colB.b);

          // 5. Iridescent Glitch Contamination
          if (blockThresh > 0.0 && hash21(blockUv) > 0.5) {
              finalCol = mix(finalCol, iridescence(blockUv.x + u_time), 0.5);
          }

          // 6. CRT Scanline Bleed
          float scanline = sin(vUv.y * u_resolution.y * 1.5) * 0.04;
          finalCol -= scanline;
          
          // 7. Vignette / Monitor Edge
          float vignette = length(vUv - 0.5) * 2.0;
          finalCol *= 1.0 - pow(vignette, 4.0) * 0.3;

          fragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
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
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("WebGL Initialization or Render Failed:", e);
}