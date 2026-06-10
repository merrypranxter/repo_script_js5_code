try {
  // Feral WebGL2 / Three.js Initialization
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL2 context unavailable");

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      context: ctx,
      alpha: true,
      antialias: false, // Turn off antialias for harsher pixel/glitch edges
      preserveDrawingBuffer: true // Autophagic memory trace
    });
    renderer.autoClearColor = false;

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

      // --- FERAL NOISE & HASHING ---
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
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

      // --- OP-ART METRIC COMPETITION ---
      // Morphing between L2 (circle) and L1/L-inf (diamond/square)
      float minkowski(vec2 p, float q) {
        return pow(pow(abs(p.x), q) + pow(abs(p.y), q), 1.0/q);
      }

      // --- MYSPACE BLINGEE STARBURST ---
      float sdStar(vec2 p) {
        float a = atan(p.y, p.x);
        float r = length(p);
        // 4-point sparkle
        float s = 0.02 / (abs(p.x * p.y) + 0.001);
        return s * exp(-r * 10.0);
      }

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        p.x *= u_resolution.x / u_resolution.y;

        float t = u_time * 0.4;

        // --- GLITCH DATA ROT (CANDY-CRASH COMPRESSION) ---
        // Macroblock horizontal tearing
        float tear_y = floor(p.y * 15.0) / 15.0;
        float glitch_trigger = step(0.92, hash(vec2(tear_y, floor(t * 10.0))));
        float tear = glitch_trigger * (hash(vec2(tear_y, 1.0)) - 0.5) * 1.5;
        p.x += tear;

        // --- THE OPTICAL ILLUSION ENGINE (RETINAL SURREALISM) ---
        float q = mix(0.8, 2.5, sin(t * 1.2) * 0.5 + 0.5); // Morphing manifold
        float r = minkowski(p, q);
        float a = atan(p.y, p.x);

        // Hyperbolic Tunnel Projection
        float z = 1.0 / (r + 0.01);
        
        // --- EARLY INTERNET / MYSPACE DEBRIS (TOPOLOGICAL FOLD) ---
        // Projecting a Win95 Error Box / Popup into the infinite hyperbolic tunnel
        vec2 hyper_p = vec2(a, z);
        vec2 win_p = hyper_p - vec2(sin(t * 0.5), t * 2.0);
        win_p.x = mod(win_p.x + PI, 2.0 * PI) - PI; // Wrap around tunnel
        win_p.y = fract(win_p.y * 0.5) - 0.5; // Repeat endlessly in depth
        
        float win_d = max(abs(win_p.x) - 0.6, abs(win_p.y) - 0.25);
        float win_bar = max(abs(win_p.x) - 0.6, abs(win_p.y - 0.15) - 0.1);
        
        // --- CHROMATIC INTERFERENCE OP ---
        vec3 col = vec3(0.0);
        float freq = 12.0;
        float spokes = 10.0;

        // Multi-sample for RGB channel split (Chromatic Aberration)
        for(int i = 0; i < 3; i++) {
            // Split widens where the glitch tear is active
            float offset = float(i) * 0.03 * (1.0 + glitch_trigger * 5.0);
            
            vec2 p_shift = p * (1.0 + offset);
            float r_shift = minkowski(p_shift, q);
            float z_shift = 1.0 / (r_shift + 0.01);
            float a_shift = atan(p_shift.y, p_shift.x);
            
            float spiral = a_shift + z_shift * 0.3 + t;
            float rings = z_shift * freq - t * 5.0;
            
            // Core Moiré / Phase Field
            float pattern = sin(rings) * cos(spiral * spokes);
            
            // Harsh B&W Retinal Burn
            float bw = step(0.0, pattern);
            
            if(i == 0) col.r = bw;
            if(i == 1) col.g = bw;
            if(i == 2) col.b = bw;
        }

        // --- PALETTE MAPPING (HYPERPOP RUPTURE / ACID) ---
        vec3 final_col = vec3(0.0);
        if (col == vec3(1.0)) {
            final_col = vec3(0.95); // White scaffold
        } else if (col == vec3(0.0)) {
            final_col = vec3(0.05); // Black scaffold
        } else {
            // Where channels misalign, inject Toxic Acid & Hot Pink
            final_col += col.r * vec3(1.0, 0.0, 0.6); // Hot Pink
            final_col += col.g * vec3(0.0, 1.0, 0.8); // Cyan
            final_col += col.b * vec3(0.9, 1.0, 0.0); // Acid Yellow
        }

        // --- INTEGRATE THE DEBRIS ---
        if (win_d < 0.0) {
            if (win_bar < 0.0) {
                // Classic deep blue title bar
                final_col = mix(final_col, vec3(0.0, 0.0, 0.7), 0.9); 
            } else {
                // Gray window body with fake text lines
                float txt = step(0.6, sin(win_p.x * 50.0) * sin(win_p.y * 80.0));
                final_col = mix(vec3(0.75), vec3(0.2), txt);
            }
            // Hot pink neon border
            if (abs(win_d) < 0.02) final_col = vec3(1.0, 0.0, 0.5);
        }

        // --- MYSPACE GLITTER / SPARKLE OVERLAY ---
        // High frequency noise field
        float glitter_noise = hash(p * 200.0 + t);
        // Concentrate glitter on high-contrast edges (dFdx/dFdy equivalent via simple offset)
        float edge = abs(col.r - col.g) + abs(col.g - col.b); 
        float glitter = step(0.95, glitter_noise) * edge;
        
        // Large Blingee Starbursts
        vec2 grid_p = fract(p * 4.0 + t * 0.2) - 0.5;
        float star_val = sdStar(grid_p);
        float star_mask = step(0.98, hash(floor(p * 4.0 + t * 0.2)));
        
        // Apply glitter & stars
        final_col = mix(final_col, vec3(1.0), glitter); // White noise sparkles
        final_col += star_val * star_mask * vec3(1.0, 0.5, 0.9); // Pink glowing stars

        // --- CRT SCANLINE BLEED ---
        float scanline = sin(vUv.y * u_resolution.y * 3.1415) * 0.04;
        final_col -= scanline;

        // Vignette
        float vig = length(vUv - 0.5) * 2.0;
        final_col *= 1.0 - pow(vig, 3.0) * 0.3;

        fragColor = vec4(final_col, 1.0);
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
  }

  const { renderer, scene, camera, material } = canvas.__three;

  // Update Uniforms safely
  if (material?.uniforms) {
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  renderer.setSize(grid.width, grid.height, false);
  
  // Create a slight feedback motion by not clearing fully, relying on preserveDrawingBuffer
  // and drawing over it, though the shader is fully opaque. 
  // The feral decay is primarily driven by the fragment shader math.
  renderer.render(scene, camera);

} catch (err) {
  console.error("Feral MySpace WebGL Initialization Failed:", err);
  // Fallback to canvas 2D if WebGL is totally wrecked
  if (ctx && !canvas.__three) {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, grid.width, grid.height);
    ctx.fillStyle = '#ff00ff';
    ctx.font = '20px monospace';
    ctx.fillText("CRITICAL ERROR: WEBGL_CONTEXT_LOST", 20, 40);
    ctx.fillText("MYSPACE_DECAY_PROTOCOL_FAILED", 20, 70);
  }
}