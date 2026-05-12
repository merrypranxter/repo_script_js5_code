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
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      in vec2 vUv;
      out vec4 fragColor;

      uniform float u_time;
      uniform vec2 u_resolution;

      // ---- UTILITIES ----
      float hash11(float p) {
          p = fract(p * .1031);
          p *= p + 33.33;
          p *= p + p;
          return fract(p);
      }

      float hash21(vec2 p) {
          vec3 p3  = fract(vec3(p.xyx) * .1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f*f*(3.0-2.0*f);
          float a = hash21(i);
          float b = hash21(i + vec2(1.0, 0.0));
          float c = hash21(i + vec2(0.0, 1.0));
          float d = hash21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      // ---- STRICT PALETTE & DITHERING ----
      // No black, gray, brown, or muddy colors allowed. White is the only neutral.
      vec3 getPaletteDithered(float t, vec2 pixelCoords) {
          vec3 colors[7];
          colors[0] = vec3(1.0, 0.0, 0.5); // Hot pink
          colors[1] = vec3(1.0, 0.7, 0.8); // Pastel pink
          colors[2] = vec3(0.0, 1.0, 0.8); // Bright teal
          colors[3] = vec3(1.0, 1.0, 0.0); // Electric yellow
          colors[4] = vec3(0.6, 0.0, 1.0); // Saturated purple
          colors[5] = vec3(0.2, 1.0, 0.0); // Neon green
          colors[6] = vec3(1.0, 1.0, 1.0); // White
          
          t = fract(t) * 7.0;
          int i = int(t);
          int next = (i + 1) % 7;
          float f = fract(t);
          
          // Dithering prevents muddy in-between colors during interpolation
          float dither = hash21(pixelCoords); 
          
          if (f > dither) {
              return colors[next];
          } else {
              return colors[i];
          }
      }

      // ---- GLITCH SUBSYSTEMS ----

      // 1. VHS Tracking & Tape Damage
      vec2 vhsTrackingWarp(vec2 uv, float t, float weight) {
          float y = uv.y;
          float crawl = sin(y * 15.0 + t * 3.0) * 0.02;
          float tear = step(0.95, sin(y * 60.0 - t * 20.0)) * (sin(t * 50.0) * 0.15);
          float jitter = hash11(t * 60.0) * 0.01;
          float shift = (crawl + tear + jitter) * weight;
          
          // Tape crease/foldover
          float crease = exp(-pow((uv.x - 0.2 - sin(t)*0.1) * 20.0, 2.0)) * 0.05 * sin(y * 20.0 + t * 10.0);
          return uv + vec2(shift, crease * weight);
      }

      // 2. Digital Block Corruption & Datamosh Smear
      vec2 digitalBlockDamage(vec2 uv, float t, float weight) {
          vec2 gridUv = floor(uv * vec2(16.0, 16.0)) / 16.0;
          float n = hash21(gridUv + floor(t * 12.0));
          vec2 shift = vec2(hash11(n) - 0.5, hash11(n + 1.0) - 0.5) * 0.5;
          float mask = step(0.7, n);
          
          float microBlock = step(0.9, hash21(floor(uv * 64.0) + t));
          float smear = step(0.95, hash21(floor(uv * 4.0) + floor(t * 4.0))); // Datamosh persistence
          vec2 smearShift = vec2(0.0, -0.1) * smear;
          
          return mix(uv, uv + shift + microBlock * 0.05 + smearShift, mask * weight);
      }

      // 3. Moiré / Op-Art Interference Fields
      vec2 moireInterference(vec2 uv, float t, float weight) {
          float r1 = length(uv - vec2(0.2, 0.5 + sin(t)*0.2));
          float r2 = length(uv - vec2(0.8, 0.5 + cos(t)*0.2));
          float rings = sin(r1 * 100.0 - t * 8.0) + sin(r2 * 100.0 + t * 6.0);
          float warp = smoothstep(-1.0, 1.0, rings) * 0.1;
          
          // Radial pinch/bulge
          vec2 center = vec2(0.5);
          vec2 dir = uv - center;
          float dist = length(dir);
          vec2 pinch = dir * sin(dist * 20.0 - t * 5.0) * 0.1;
          
          return uv + (vec2(warp, -warp) + pinch) * weight;
      }

      // 4. State Controller: Rotates prominence of glitch families
      void glitchStateController(float t, out float wVHS, out float wDigi, out float wFilm, out float wMoire) {
          float cycle = mod(t * 0.4, 4.0);
          wVHS = smoothstep(0.0, 0.2, cycle) * (1.0 - smoothstep(0.8, 1.0, cycle));
          wDigi = smoothstep(1.0, 1.2, cycle) * (1.0 - smoothstep(1.8, 2.0, cycle));
          wFilm = smoothstep(2.0, 2.2, cycle) * (1.0 - smoothstep(2.8, 3.0, cycle));
          wMoire = smoothstep(3.0, 3.2, cycle) * (1.0 - smoothstep(3.8, 4.0, cycle));
          
          // Baseline presence
          wVHS += 0.1; wDigi += 0.1; wFilm += 0.1; wMoire += 0.1;
          
          // Sudden catastrophic bursts
          float b = hash11(floor(t * 10.0));
          if (b > 0.95) wVHS += 1.5;
          else if (b > 0.90) wDigi += 1.5;
          else if (b > 0.85) wMoire += 1.5;
          else if (b > 0.80) wFilm += 1.5;
      }

      // BASE SCENE GENERATOR
      vec3 getSceneColor(vec2 uv, float t, vec2 pixelCoords) {
          // Op-art structural layer
          float n1 = noise(uv * 3.0 + t * 0.4);
          float n2 = noise(uv * 8.0 - t * 0.7);
          float opArt = sin((n1 + n2) * 30.0);
          
          float block = hash21(floor(uv * 12.0) + floor(t * 3.0));
          float sweep = sin(uv.x * 10.0 + t * 2.0) * cos(uv.y * 10.0 - t * 2.0);
          
          float val = smoothstep(-0.5, 0.5, opArt) * 0.4 + block * 0.4 + sweep * 0.2;
          return getPaletteDithered(val * 5.0 + t * 0.3, pixelCoords);
      }

      // 5. Film Damage
      vec3 filmDamage(vec2 uv, float t, vec3 col, float weight, vec2 pixelCoords) {
          // Scratches
          float sx = uv.x * 200.0 + sin(t * 0.5) * 5.0;
          float scratch = step(0.98, fract(sx)) * step(0.9, hash11(floor(sx) + floor(t * 20.0)));
          vec3 scratchCol = getPaletteDithered(uv.y * 2.0 + t * 3.0, pixelCoords);
          
          // Chemical burn / light leak
          float burn = step(0.8, noise(uv * 3.0 + t * 5.0));
          vec3 burnCol = getPaletteDithered(t * 4.0, pixelCoords); 
          
          vec3 res = mix(col, scratchCol, scratch * weight);
          res = mix(res, burnCol, burn * weight);
          return res;
      }

      // 6. CRT Scanlines & Phosphor Grid
      vec3 crtScanlines(vec2 uv, vec3 col, float t, vec2 pixelCoords) {
          float sl = sin(uv.y * 800.0 - t * 15.0);
          float ph = sin(uv.x * 1200.0);
          float mask = (sl * 0.5 + 0.5) * (ph * 0.5 + 0.5);
          
          // Instead of darkening to black, CRT lines mix with a vibrant neon palette color
          vec3 alt = getPaletteDithered(uv.x * 8.0 + t * 2.0, pixelCoords);
          return mix(col, alt, (1.0 - mask) * 0.5);
      }

      void main() {
          float t = u_time * 1.2;
          
          float wVHS, wDigi, wFilm, wMoire;
          glitchStateController(t, wVHS, wDigi, wFilm, wMoire);
          
          vec2 uv = vUv;
          
          // Warp coordinate space based on dominant glitch modes
          uv = vhsTrackingWarp(uv, t, wVHS);
          uv = digitalBlockDamage(uv, t, wDigi);
          uv = moireInterference(uv, t, wMoire);
          
          // Extreme RGB Channel Drift (remaps to palette colors, not literal RGB)
          float drift = 0.02 + 0.05 * wVHS + 0.1 * wDigi;
          vec2 uvR = uv + vec2(drift, 0.0);
          vec2 uvG = uv + vec2(-drift*0.3, drift*0.3);
          vec2 uvB = uv - vec2(0.0, drift);
          
          vec2 pixelCoords = vUv * u_resolution;
          
          vec3 colR = getSceneColor(uvR, t, pixelCoords);
          vec3 colG = getSceneColor(uvG, t + 0.33, pixelCoords + vec2(1.0));
          vec3 colB = getSceneColor(uvB, t + 0.66, pixelCoords + vec2(2.0));
          
          // High-frequency analog static interleaving
          float selector = hash21(pixelCoords + t);
          vec3 col;
          if (selector < 0.33) col = colR;
          else if (selector < 0.66) col = colG;
          else col = colB;
          
          // Screen-Space Overlays (Using original vUv to keep artifacts screen-aligned)
          col = filmDamage(vUv, t, col, wFilm, pixelCoords);
          col = crtScanlines(vUv, col, t, pixelCoords);
          
          // Global Glitch Flash Burst (White out, 0 opacity to keep palette strict)
          float flash = step(0.98, hash11(t * 15.0));
          col = mix(col, vec3(1.0), flash * 0.8);
          
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
      fragmentShader
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

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
  console.error("WebGL Initialization Failed:", e);
}

/*
  HOW THE SYSTEMS WORK:
  1. glitchStateController: Acts as the "director", rotating smoothly between 4 major glitch families (VHS, Digital, Film, Moiré) every few seconds, with random catastrophic bursts.
  2. getPaletteDithered: Enforces the strict non-muddy color palette. Dithering prevents linear interpolation from creating grays or browns, ensuring pixel-perfect neon energy.
  3. UV Warping: VHS tearing, Digital datamosh blocks, and Moiré radial pinches stack sequentially onto the coordinate space.
  4. RGB Drift: Instead of literal red/green/blue channels, the shader evaluates the base scene three times with offset UVs and interleaves them using high-frequency noise for an intense analog static feel.
  5. Screen-Space Effects: Film scratches, burns, and CRT scanlines/phosphors are applied on top of the warped image using screen-aligned coordinates.

  TWEAK NOTES:
  - More VHS: Increase base value of `wVHS` in `glitchStateController` or multiply `shift` in `vhsTrackingWarp`.
  - More CRT: Increase the mix factor `(1.0 - mask) * 0.5` in `crtScanlines` or scale `sl` / `ph` frequencies.
  - More Digital Glitch: Increase the scale of `gridUv` in `digitalBlockDamage` or amplify `smearShift` for intense datamoshing.
  - More Film Damage: Lower the threshold `0.98` in `scratch` and `0.8` in `burn` inside `filmDamage`.
  - More Moiré/Op-Art: Scale up `wMoire` or increase the frequency `30.0` of `opArt` in `getSceneColor`.
  - Stronger Mode-Switching: Change `smoothstep` bounds in `glitchStateController` to have sharper transitions.
*/