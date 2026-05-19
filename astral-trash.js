try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Offscreen canvas for the "ASTRAL TRASH" text overlay
    const textCanvas = document.createElement('canvas');
    textCanvas.width = grid.width;
    textCanvas.height = grid.height;
    const textCtx = textCanvas.getContext('2d', { willReadFrequently: true });
    const textTex = new THREE.CanvasTexture(textCanvas);
    textTex.minFilter = THREE.LinearFilter;
    textTex.magFilter = THREE.LinearFilter;
    textTex.format = THREE.RGBAFormat;

    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      
      in vec2 vUv;
      out vec4 fragColor;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_text;

      #define NUM_OCTAVES 6

      // Pseudo-random hash
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      // Value noise
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      // Fractional Brownian Motion for domain warping
      float fbm(vec2 x, float t) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < NUM_OCTAVES; ++i) {
          v += a * noise(x);
          x = rot * x * 2.0 + shift + t;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        // Coordinate setup
        vec2 uv = vUv;
        vec2 p = uv * 3.0; // Scale the math space
        
        // Time scales
        float t_slow = u_time * 0.15;
        float t_med  = u_time * 0.6;
        float t_fast = u_time * 4.0;

        // ----------------------------------------------------
        // 1. PROCEDURAL MATERIAL (Fluid, Depth, Grain, Op-Art)
        // ----------------------------------------------------
        
        // Domain Warping Layers
        vec2 q = vec2(fbm(p + vec2(0.0, 0.0) + t_slow, t_slow),
                      fbm(p + vec2(5.2, 1.3) + t_slow, t_slow));
                      
        vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2) + t_med, t_med),
                      fbm(p + 4.0 * q + vec2(8.3, 2.8) + t_med, t_med));

        float f = fbm(p + 4.0 * r, t_slow);

        // Aesthetic Components
        // Void Black Base
        vec3 col = vec3(0.02, 0.00, 0.04);

        // Neon Cyan: Viscous fluid ribbons
        float ribbons = smoothstep(0.3, 0.7, r.x) * smoothstep(0.7, 0.3, r.x);
        vec3 cyan = vec3(0.0, 1.0, 1.0);
        col = mix(col, cyan, ribbons * f * 2.5);

        // Neon Magenta: Cellular interference / Op-Art tension
        float interference = sin(q.y * 40.0 + t_med) * cos(q.x * 40.0 - t_med);
        interference = smoothstep(0.0, 0.15, interference) * smoothstep(0.3, 0.15, interference);
        vec3 magenta = vec3(1.0, 0.0, 1.0);
        col = mix(col, magenta, interference * r.y * 2.0);

        // Neon Yellow: High-frequency reaction-diffusion veins
        float veins = abs(sin(r.y * 60.0 + t_fast * 0.5));
        veins = smoothstep(0.97, 1.0, veins);
        vec3 yellow = vec3(1.0, 1.0, 0.0);
        col = mix(col, yellow, veins * 1.5);

        // Depth & ambient occlusion from FBM
        col *= (f * f * 2.5 + 0.1);
        
        // Specular fast shimmer (wet fluid look)
        float spec = pow(max(0.0, sin(r.x * 120.0 + t_fast)), 5.0);
        col += spec * vec3(0.5, 1.0, 1.0) * 0.6;

        // Physical Grain
        float grain = hash(uv * u_resolution + t_fast);
        col -= grain * 0.15;

        // ----------------------------------------------------
        // 2. TEXT OVERLAY (Glitchcore, RGB Split, Wobble)
        // ----------------------------------------------------
        
        vec2 tUv = uv;
        // Cute bouncy float
        tUv.y += sin(tUv.x * 6.0 + t_med) * 0.015;
        tUv.x += cos(tUv.y * 5.0 + t_med * 0.8) * 0.01;

        // Glitch trigger (sporadic jumps)
        float glitchTrigger = step(0.92, hash(vec2(floor(t_fast * 2.0), 1.0))); 
        float splitAmt = 0.003 + 0.04 * glitchTrigger * noise(vec2(uv.y * 25.0, t_fast));

        // Chromatic split sample
        vec4 tR = texture(u_text, tUv + vec2(splitAmt, 0.0));
        vec4 tG = texture(u_text, tUv);
        vec4 tB = texture(u_text, tUv - vec2(splitAmt, 0.0));

        float maxAlpha = max(max(tR.a, tG.a), tB.a);
        vec3 textCol = vec3(tR.r, tG.g, tB.b);
        
        // CRT scanline over text
        float scanline = sin(uv.y * u_resolution.y * 0.4 - t_fast * 8.0) * 0.5 + 0.5;
        textCol -= scanline * 0.15;

        // Blend text onto background
        col = mix(col, textCol, maxAlpha);

        fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_text: { value: textTex }
      },
      vertexShader,
      fragmentShader,
      depthWrite: false,
      depthTest: false
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material, textCanvas, textCtx, textTex };
  }

  const { renderer, scene, camera, material, textCanvas, textCtx, textTex } = canvas.__three;

  // Update uniforms
  if (material && material.uniforms) {
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  // Handle resize and draw "ASTRAL TRASH"
  if (textCanvas.width !== grid.width || textCanvas.height !== grid.height) {
    textCanvas.width = grid.width;
    textCanvas.height = grid.height;

    textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height);
    
    const fontSize = Math.min(grid.width, grid.height) * 0.12;
    textCtx.font = `italic 900 ${fontSize}px "Arial Rounded MT Bold", "Comic Sans MS", "Fredoka One", sans-serif`;
    textCtx.textAlign = 'center';
    textCtx.textBaseline = 'middle';
    textCtx.lineJoin = 'round';

    const cx = grid.width / 2;
    const cy = grid.height / 2;

    // Thick black stroke (sticker/pop-art style)
    textCtx.lineWidth = fontSize * 0.25;
    textCtx.strokeStyle = '#000000';
    textCtx.strokeText("ASTRAL TRASH", cx, cy);

    // Bright white fill (shader will RGB split this)
    textCtx.fillStyle = '#FFFFFF';
    textCtx.fillText("ASTRAL TRASH", cx, cy);

    // Cute decorative stars
    textCtx.font = `900 ${fontSize * 0.5}px "Arial Rounded MT Bold", sans-serif`;
    textCtx.lineWidth = fontSize * 0.12;
    
    const starOffset = fontSize * 3.8;
    const starYOffset = fontSize * 0.6;
    
    // Left star
    textCtx.strokeText("✦", cx - starOffset, cy - starYOffset);
    textCtx.fillText("✦", cx - starOffset, cy - starYOffset);
    
    // Right star
    textCtx.strokeText("✦", cx + starOffset, cy + starYOffset);
    textCtx.fillText("✦", cx + starOffset, cy + starYOffset);

    textTex.needsUpdate = true;
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("WebGL Initialization or Render Failed:", e);
}