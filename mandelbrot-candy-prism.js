try {
  // Defensive check for Three.js environment
  if (!ctx) throw new Error("WebGL context not available");

  // Initialize Three.js scene if it doesn't exist
  if (!canvas.__three) {
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      context: ctx,
      alpha: true,
      antialias: false, // Disable AA for sharper glitch/pixel aesthetics
      powerPreference: "high-performance"
    });
    
    // Disable automatic clearing to allow potential feedback loops (though we overwrite here)
    renderer.autoClear = false;

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

    // The Feral Design-Brain Shader
    // Incorporates: Mandelbrot escape, Distance Estimation, RGB Chromatic Aberration,
    // FBM Domain Warping, Moire Interference, and a Maximalist Candy Palette.
    const fragmentShader = `
      in vec2 vUv;
      out vec4 fragColor;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_mouse_pressed;

      #define MAX_ITER 150
      #define BAILOUT 256.0
      #define PI 3.14159265359

      // --- COLOR SYSTEMS: Maximalist Candy / DMT Spectrum ---
      vec3 palette(float t) {
          // Intense, saturated neon shifts: Hot Pink -> Cyan -> Electric Yellow -> Deep Purple
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.5);
          vec3 c = vec3(2.0, 1.0, 0.5); // Differential frequency for wilder shifts
          vec3 d = vec3(0.8, 0.2, 0.5); // Phase offset
          return a + b * cos(2.0 * PI * (c * t + d));
      }

      // --- MATH ESSENTIALS ---
      vec2 cmul(vec2 a, vec2 b) {
          return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
      }

      // --- DOMAIN WARPING (The Ocean / Math influence) ---
      // Distorts the complex plane before iteration to create a "melting" or "glitch" lens
      vec2 warp(vec2 p, float strength) {
          float t = u_time * 0.5;
          // High-frequency, low-amplitude sine warp
          vec2 w = vec2(
              sin(p.y * 15.0 + t) + cos(p.x * 7.0 - t * 0.8),
              cos(p.x * 12.0 - t) + sin(p.y * 9.0 + t * 1.1)
          );
          return p + w * strength;
      }

      // --- FRACTAL ENGINE ---
      // Returns vec4(smooth_iter, distance_estimate, moire_trap, is_interior)
      vec4 mandelbrot(vec2 c) {
          vec2 z = vec2(0.0);
          vec2 dz = vec2(1.0, 0.0);
          float m2 = 0.0;
          float n = 0.0;
          float trap = 1e10;

          for(int i = 0; i < MAX_ITER; i++) {
              // Distance estimator derivative: dz = 2*z*dz + 1
              dz = 2.0 * cmul(z, dz) + vec2(1.0, 0.0);
              
              // Core iteration: z = z^2 + c
              z = cmul(z, z) + c;
              m2 = dot(z, z);

              // Orbit Trap: Concentric Moire Rings that compress near the boundary
              float ring = abs(fract(length(z) * 4.0 - u_time * 2.0) - 0.5);
              trap = min(trap, ring);

              if(m2 > BAILOUT) break;
              n += 1.0;
          }

          // Interior check (The Void Rule)
          if(n >= float(MAX_ITER)) {
              return vec4(0.0, 0.0, trap, 1.0);
          }

          // Smooth iteration (continuous escape time)
          float log_zn = log(m2) * 0.5;
          float nu = log(log_zn / log(2.0)) / log(2.0);
          float smooth_n = n - nu;

          // Distance Estimation (for crystalline edge halos)
          float de = sqrt(m2 / dot(dz, dz)) * log_zn * 0.5;

          return vec4(smooth_n, de, trap, 0.0);
      }

      // --- VHS / CRT GLITCH EFFECTS ---
      float scanline(vec2 uv) {
          return sin(uv.y * u_resolution.y * 0.5 - u_time * 10.0) * 0.04;
      }

      void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          vec2 centered = uv - 0.5;
          centered.x *= u_resolution.x / u_resolution.y;

          // --- KINEMATICS (Zoom & Pan) ---
          // Deep dive into Seahorse Valley, pulsating in and out
          vec2 target = vec2(-0.74364388, 0.1318259);
          
          // Mouse interaction overrides target slightly
          vec2 mouseOffset = (u_mouse - 0.5) * 0.1;
          target += mouseOffset * u_mouse_pressed;

          // Non-linear zoom breathing
          float z_cycle = sin(u_time * 0.15) * 0.5 + 0.5; 
          float zoom = mix(2.5, 0.00005, pow(z_cycle, 4.0)); // Plunge deep, pull out slow
          
          vec2 c = centered * zoom + target;

          // Glitch / Warp strength modulated by depth and mouse
          float warpStrength = 0.002 * zoom * (1.0 + u_mouse.y * 5.0);

          // --- CHROMATIC ABERRATION (Chromatic Cannibalism) ---
          // We calculate the fractal 3 times with slight spatial offsets.
          // This creates "expensive" physical color splitting at the fractal boundaries.
          float splitDist = 0.004 * zoom;
          vec2 dir = normalize(centered + 0.001); // Radial split
          
          vec4 resR = mandelbrot(warp(c - dir * splitDist, warpStrength));
          vec4 resG = mandelbrot(warp(c, warpStrength));
          vec4 resB = mandelbrot(warp(c + dir * splitDist, warpStrength));

          // --- COLOR SYNTHESIS ---
          vec3 finalColor = vec3(0.0);

          // 1. Base Palette mapping using smooth iteration
          float colorSpeed = u_time * 0.2;
          float iterScale = 0.05;
          vec3 colR = palette(resR.x * iterScale - colorSpeed);
          vec3 colG = palette(resG.x * iterScale - colorSpeed + 0.1); // Phase shift
          vec3 colB = palette(resB.x * iterScale - colorSpeed + 0.2);

          // 2. Op-Art Contour Bands (High frequency sine waves on the escape gradient)
          float bandR = 0.5 + 0.5 * sin(resR.x * 1.5 - u_time * 4.0);
          float bandG = 0.5 + 0.5 * sin(resG.x * 1.5 - u_time * 4.0);
          float bandB = 0.5 + 0.5 * sin(resB.x * 1.5 - u_time * 4.0);

          // 3. Distance Estimation Glow (Crisp, electric edges)
          // Scale DE relative to zoom to maintain consistent stroke width
          float stroke = 0.0015 * zoom;
          float glowR = stroke / (resR.y + stroke * 0.1);
          float glowG = stroke / (resG.y + stroke * 0.1);
          float glowB = stroke / (resB.y + stroke * 0.1);

          // 4. Moire Interference (Multiplying the trap against the bands)
          float moireR = mix(1.0, resR.z * 2.0, 0.5);
          float moireG = mix(1.0, resG.z * 2.0, 0.5);
          float moireB = mix(1.0, resB.z * 2.0, 0.5);

          // Combine Exterior
          finalColor.r = (colR.r * bandR * moireR + glowR) * (1.0 - resR.w);
          finalColor.g = (colG.g * bandG * moireG + glowG) * (1.0 - resG.w);
          finalColor.b = (colB.b * bandB * moireB + glowB) * (1.0 - resB.w);

          // 5. Interior (The Void Rule)
          // Instead of pure black, add a deep, dark, pulsing structural noise
          float interiorPulse = sin(u_time * 2.0 - length(centered) * 10.0) * 0.5 + 0.5;
          vec3 voidColor = vec3(0.05, 0.0, 0.1) * interiorPulse * resG.z;
          
          finalColor += voidColor * resG.w; // Add to interior areas

          // 6. Post-Processing: Glitch, Scanlines, and Contrast
          finalColor += scanline(uv);
          
          // Slight vignette to focus center
          float vignette = length(centered);
          finalColor *= smoothstep(0.8, 0.2, vignette);

          // Overdrive colors (Neon Rule)
          finalColor = pow(finalColor, vec3(0.85)); // Gamma crush for saturation

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
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
        u_mouse_pressed: { value: 0.0 }
      },
      depthWrite: false,
      depthTest: false
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  // Safe uniform updates
  if (material && material.uniforms) {
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    
    if (material.uniforms.u_resolution) {
      material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
    
    if (material.uniforms.u_mouse && mouse) {
      // Normalize mouse coordinates (0 to 1)
      const mx = mouse.x / grid.width;
      const my = 1.0 - (mouse.y / grid.height); // Flip Y for GLSL
      
      // Smooth lerp for mouse movement to prevent jarring glitches
      material.uniforms.u_mouse.value.x += (mx - material.uniforms.u_mouse.value.x) * 0.1;
      material.uniforms.u_mouse.value.y += (my - material.uniforms.u_mouse.value.y) * 0.1;
    }

    if (material.uniforms.u_mouse_pressed) {
      material.uniforms.u_mouse_pressed.value = mouse.isPressed ? 1.0 : 0.0;
    }
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (error) {
  console.error("Feral Mandelbrot System Failure:", error);
  // Fallback to 2D context if WebGL completely fails, to satisfy the "must draw" directive
  if (ctx && typeof ctx.fillRect === 'function') {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, grid.width, grid.height);
    ctx.fillStyle = '#ff0055';
    ctx.font = '20px monospace';
    ctx.fillText('GPU OVERLOAD. FRACTAL CONTAINMENT BREACH.', 20, 40);
  }
}