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
      uniform vec2 u_mouse;
      uniform float u_isPressed;

      // --- REPO GENOME: PSYCHEDELIC COLLAGE PALETTE ---
      const vec3 COL_VOID = vec3(0.015, 0.023, 0.031);     // Void Black
      const vec3 COL_CYAN = vec3(0.0, 1.0, 0.94);          // Neon Cyan
      const vec3 COL_MAGENTA = vec3(1.0, 0.0, 0.8);        // Electric Magenta
      const vec3 COL_YELLOW = vec3(1.0, 0.91, 0.0);        // Riso Yellow

      // --- NOISE CORE ---
      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }

      float simplex(vec2 p) {
        const float K1 = 0.366025404; // (sqrt(3)-1)/2;
        const float K2 = 0.211324865; // (3-sqrt(3))/6;
        vec2 i = floor(p + (p.x + p.y) * K1);
        vec2 a = p - i + (i.x + i.y) * K2;
        float m = step(a.y, a.x); 
        vec2 o = vec2(m, 1.0 - m);
        vec2 b = a - o + K2;
        vec2 c = a - 1.0 + 2.0 * K2;
        vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
        vec3 n = h * h * h * h * vec3(dot(a,hash2(i+0.0)), dot(b,hash2(i+o)), dot(c,hash2(i+1.0)));
        return dot(n, vec3(70.0));
      }

      // --- REPO GENOME: MOIRE PRIMITIVES ---
      // 04_wave_sinusoidal/shader.glsl
      float sineGrating(vec2 uv, float freq, float angle, float phase) {
        vec2 dir = vec2(cos(angle), sin(angle));
        return 0.5 + 0.5 * sin(dot(uv, dir) * freq + phase);
      }

      // 03_spiral_phantoms/shader.glsl
      float spiral(vec2 uv, float tightness, float arms, float rot) {
        float r = length(uv);
        float a = atan(uv.y, uv.x);
        float phase = a * arms + log(r + 0.001) * tightness + rot;
        return 0.5 + 0.5 * sin(phase);
      }

      // --- REPO GENOME: PRINT ARTIFACTS ---
      // 08_cmyk_separation/shader.glsl & halftone_screen.yaml
      float halftone(vec2 fragCoord, float freq, float angle, float luma) {
        float rad = radians(angle);
        mat2 rot = mat2(cos(rad), -sin(rad), sin(rad), cos(rad));
        vec2 st = rot * fragCoord * freq / 1000.0;
        vec2 cell = fract(st) - 0.5;
        float dist = length(cell);
        float dotRadius = sqrt(1.0 - clamp(luma, 0.0, 1.0)) * 0.6; // 0.6 allows dots to merge
        return smoothstep(dotRadius + 0.1, dotRadius - 0.1, dist);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
        vec2 screenUV = gl_FragCoord.xy / u_resolution.xy;

        // --- INTERACTION: ANAMORPHIC LENS DISTORTION ---
        // 10_anamorphic_secret/shader.glsl
        vec2 mouseUV = (u_mouse - 0.5 * u_resolution.xy) / u_resolution.y;
        float mouseDist = length(uv - mouseUV);
        float lens = exp(-mouseDist * (4.0 - u_isPressed * 2.0));
        vec2 interactUV = uv + normalize(uv - mouseUV + 0.001) * lens * 0.15 * sin(u_time * 5.0);

        // --- PIPELINE: DISPLACEMENT WARP ---
        // displacement_warp.yaml
        float n1 = simplex(interactUV * 2.0 + u_time * 0.2);
        float n2 = simplex(interactUV * 2.0 - u_time * 0.15 + 100.0);
        vec2 warpedUV = interactUV + vec2(n1, n2) * (0.05 + u_isPressed * 0.1);

        // --- PIPELINE: CMYK MISREGISTRATION + MOIRE CORE ---
        // We create a base structural interference, then misregister it for colors
        // cmyk_misregistration.yaml & 07_rgb_chromatic/shader.glsl
        
        float glitchPulse = step(0.95, fract(u_time * 0.5)) * 0.05; // Occasional scan bend
        
        vec2 offC = vec2(sin(u_time * 0.3) * 0.01 + glitchPulse, cos(u_time * 0.2) * 0.01);
        vec2 offM = vec2(cos(u_time * 0.4) * 0.015, -sin(u_time * 0.35) * 0.01 - glitchPulse);
        vec2 offY = vec2(-sin(u_time * 0.25) * 0.01, -cos(u_time * 0.45) * 0.015);

        // Hybrid Moire: Spirals intersecting with Sinusoidal Waves
        float freqBase = 45.0 + n1 * 10.0; // Frequency chirping via noise
        
        // Cyan Channel
        float sC = spiral(warpedUV + offC, 8.0, 5.0, u_time);
        float gC = sineGrating(warpedUV + offC, freqBase, 0.0, u_time * 2.0);
        float valC = sC * gC;

        // Magenta Channel
        float sM = spiral(warpedUV + offM, 8.2, 5.0, -u_time * 1.1);
        float gM = sineGrating(warpedUV + offM, freqBase * 1.02, 1.047, -u_time * 1.5); // 60 deg
        float valM = sM * gM;

        // Yellow Channel
        float sY = spiral(warpedUV + offY, 7.8, 5.0, u_time * 0.9);
        float gY = sineGrating(warpedUV + offY, freqBase * 0.98, 2.094, u_time * 1.2); // 120 deg
        float valY = sY * gY;

        // Contrast push to extract interference fringes
        valC = smoothstep(0.1, 0.6, pow(valC, 0.7));
        valM = smoothstep(0.1, 0.6, pow(valM, 0.7));
        valY = smoothstep(0.1, 0.6, pow(valY, 0.7));

        // --- SUBTRACTIVE BLENDING SIMULATION ---
        // Start with white paper, subtract inks
        vec3 comp = vec3(1.0);
        comp -= vec3(1.0, 0.0, 0.0) * valC; // Cyan absorbs red
        comp -= vec3(0.0, 1.0, 0.0) * valM; // Magenta absorbs green
        comp -= vec3(0.0, 0.0, 1.0) * valY; // Yellow absorbs blue
        
        // Map back to our specific Acid/Neon palette via additive glow
        // cyberdelic_neon.yaml
        vec3 color = mix(COL_VOID, COL_CYAN, valC);
        color = mix(color, COL_MAGENTA, valM * 0.8);
        color = mix(color, COL_YELLOW, valY * 0.6);
        
        // Overprint / Interference hotspots
        float overlap = valC * valM * valY;
        color += vec3(1.0) * overlap * 2.0;

        // --- PIPELINE: XEROX & HALFTONE ---
        // photocopy_noise.yaml & halftone_screen.yaml
        float luma = dot(color, vec3(0.299, 0.587, 0.114));
        
        // Apply halftone screen (tilted at 15 degrees)
        float ht = halftone(gl_FragCoord.xy, 120.0, 15.0 + sin(u_time*0.1)*5.0, luma);
        
        // Xerox streaks (vertical noise)
        float streak = step(0.98, fract(sin(screenUV.x * 1234.5 + u_time) * 4321.0)) * 0.5;
        
        // Paper Grain
        float grain = fract(sin(dot(screenUV * 1000.0 + u_time, vec2(12.9898, 78.233))) * 43758.5453);

        // Composite: Multiply blend halftone, add streaks and grain
        vec3 finalColor = mix(color, color * ht, 0.8); // 80% halftone mix
        finalColor += vec3(streak) * COL_CYAN * 0.5; // Cyan glitch streaks
        
        // Soft light grain blend
        vec3 grainBlend = vec3(grain) * 2.0 - 1.0;
        finalColor = finalColor + grainBlend * (finalColor - finalColor * finalColor) * 0.3;

        // Vignette (burn edges)
        float vignette = 1.0 - length(uv) * 0.7;
        finalColor *= smoothstep(0.0, 0.8, vignette);

        // Scanline dropout glitch
        float scanline = step(0.1, fract(screenUV.y * u_resolution.y * 0.25 + u_time * 10.0));
        finalColor *= mix(0.8, 1.0, scanline);

        fragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(mouse.x, grid.height - mouse.y) },
        u_isPressed: { value: 0.0 }
      },
      depthWrite: false,
      depthTest: false
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
  } catch (e) {
    console.error("Feral Moiré Initialization Failed:", e);
    return;
  }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material && material.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  
  // Smooth mouse interpolation for liquid feel
  const targetX = mouse.x;
  const targetY = grid.height - mouse.y; // Invert Y for GLSL
  const curX = material.uniforms.u_mouse.value.x;
  const curY = material.uniforms.u_mouse.value.y;
  
  material.uniforms.u_mouse.value.set(
    curX + (targetX - curX) * 0.1,
    curY + (targetY - curY) * 0.1
  );
  
  const targetPress = mouse.isPressed ? 1.0 : 0.0;
  material.uniforms.u_isPressed.value += (targetPress - material.uniforms.u_isPressed.value) * 0.1;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);