if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
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
      in vec2 vUv;
      out vec4 fragColor;
      
      uniform float u_time;
      uniform vec2 u_resolution;

      // --- ALCHEMICAL MATH & NOISE ---
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
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

      // --- SDF PRIMITIVES ---
      float sdBox(vec2 p, vec2 b) {
          vec2 d = abs(p) - b;
          return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
      }

      // --- GLITCHCORE DOMAIN WARPING ---
      vec2 glitchWarp(vec2 p, float t) {
          vec2 gp = p;
          
          // Macroblocking / Codec Chew
          vec2 block = floor(p * 12.0) / 12.0;
          float g = step(0.96, hash(block + floor(t * 6.0)));
          gp.x += g * (hash(block * 2.0) - 0.5) * 0.4;
          
          // VHS Tearing (Horizontal)
          float tear = step(0.98, fract(p.y * 3.0 + t * 4.0));
          gp.x += tear * 0.15 * sin(t * 20.0);
          
          // Analog tracking jitter
          gp.y += sin(p.x * 50.0 + t * 15.0) * 0.002;
          
          return gp;
      }

      // --- THE MYSPACE SINGULARITY (SCENE COMPOSITION) ---
      vec3 renderScene(vec2 uv, vec2 rawUv, float t) {
          // 1. PURE OPTICAL SYSTEMS (B&W Zeno Tunnel Base)
          float r = length(uv);
          float a = atan(uv.y, uv.x);
          
          // Logarithmic spiral + Zeno descent
          float zeno = sin(25.0 * log(r + 0.001) - t * 6.0 + a * 5.0);
          // Moiré phase field interference
          float moire = sin(uv.x * 120.0 + t * 2.0) * sin(uv.y * 120.0 - t * 2.0);
          
          // High-contrast retinal split
          float bw = step(0.0, zeno + moire * 0.4);
          vec3 col = vec3(bw);

          // 2. GARBAGE ENLIGHTENMENT / MYSPACE UI DEBRIS
          // A trail of frozen/crashing error windows (Windows XP / early web aesthetic)
          for(int i = 4; i >= 0; i--) {
              float fi = float(i);
              // Windows dragging lag effect
              vec2 offset = vec2(sin(t * 0.8 + fi * 0.25), cos(t * 0.4 + fi * 0.3)) * 0.6;
              vec2 bp = uv - offset;
              
              // Rotate windows slightly for chaos
              float rot = sin(t * 0.2 + fi) * 0.2;
              mat2 m = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
              bp = m * bp;
              
              float dBox = sdBox(bp, vec2(0.35, 0.25));
              
              if(dBox < 0.0) {
                  // Inside the UI Window
                  if(bp.y > 0.15) {
                      // Window Header: MySpace Glitter Graphics
                      float spk = step(0.6, hash(bp * 300.0 + t * 5.0)); // High frequency noise
                      vec3 glitter1 = vec3(1.0, 0.0, 0.8); // Hot Pink
                      vec3 glitter2 = vec3(0.0, 1.0, 1.0); // Cyan
                      col = mix(glitter1, glitter2, hash(bp * 20.0)) * spk;
                      if(spk == 0.0) col = vec3(0.1); // Dark background for glitter
                  } else {
                      // Window Content: Checkerboard or Acid Green
                      float cb = step(0.0, sin(bp.x * 50.0) * sin(bp.y * 50.0));
                      vec3 bgCol = mix(vec3(0.8, 1.0, 0.0), vec3(0.1, 0.0, 0.2), cb); // Acid / Dark Violet
                      col = bgCol;
                      
                      // Body Glyphs (Sweet Corruption / Mock Esoterica)
                      if (mod(fi, 2.0) == 0.0) {
                          // The Staring Eye
                          vec2 ep = bp + vec2(0.0, 0.05);
                          float eyeOuter = length(ep * vec2(1.0, 2.2)) - 0.12;
                          float eyeInner = length(ep) - 0.05;
                          float pupil = length(ep) - 0.015;
                          
                          if(eyeOuter < 0.0) col = vec3(1.0); // Sclera
                          if(eyeInner < 0.0) col = vec3(0.0, 1.0, 1.0); // Electric Cyan Iris
                          if(pupil < 0.0) col = vec3(0.0); // Pupil
                          
                          // Bleeding mascara / glitch tear
                          if(ep.y < 0.0 && abs(ep.x) < 0.02 && fract(t*2.0+fi) > 0.5) {
                             col = vec3(0.0);
                          }
                      } else {
                          // The Jagged Mouth
                          vec2 mp = bp + vec2(0.0, 0.05);
                          float mouth = max(length(mp) - 0.15, -(length(mp - vec2(0.0, 0.08)) - 0.2));
                          if(mouth < 0.0) {
                              col = vec3(1.0, 0.0, 0.4); // Toxic Candy Red
                              // Teeth
                              float teeth = step(0.8, sin(mp.x * 80.0));
                              if(abs(mp.y) < 0.02) col = mix(col, vec3(1.0), teeth);
                          }
                      }
                  }
                  
                  // Faux Chrome UI Bevel
                  if(abs(dBox) < 0.015) {
                      col = vec3(0.9) + 0.1 * sin(bp.x * 100.0 + t * 10.0);
                  }
              }
          }
          
          return col;
      }

      void main() {
          vec2 rawUv = vUv;
          vec2 uv = (rawUv - 0.5) * 2.0;
          uv.x *= u_resolution.x / u_resolution.y;
          
          // Apply Glitchcore Domain Warping
          vec2 guv = glitchWarp(uv, u_time);
          
          // Chromatic Aberration (RGB Split)
          // Heavy split triggered by noise for datamosh/codec crash feel
          float splitTrig = step(0.95, hash(vec2(floor(u_time * 8.0))));
          float splitAmt = 0.01 + 0.05 * splitTrig;
          
          vec3 finalColor;
          finalColor.r = renderScene(guv + vec2(splitAmt, 0.0), rawUv, u_time).r;
          finalColor.g = renderScene(guv, rawUv, u_time).g;
          finalColor.b = renderScene(guv - vec2(splitAmt, 0.0), rawUv, u_time).b;
          
          // CRT Phosphor / Scanlines (Analog Video Damage)
          float scanline = sin(rawUv.y * u_resolution.y * 1.5) * 0.08;
          finalColor -= scanline;
          
          // CRT Flicker
          finalColor *= 0.95 + 0.05 * sin(u_time * 60.0);
          
          // Deep Internet Vignette
          float vig = length(rawUv - 0.5);
          finalColor *= smoothstep(0.8, 0.3, vig);
          
          // Overdrive colors slightly for Hyperpop Rupture
          finalColor = clamp(finalColor * 1.1, 0.0, 1.0);

          fragColor = vec4(finalColor, 1.0);
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
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);