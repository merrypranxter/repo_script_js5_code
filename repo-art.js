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
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      in vec2 vUv;
      out vec4 fragColor;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;

      // COLOR FIELDS: Neon Acid / Cyberpunk Cosine Palette
      vec3 paletteNeon(float t) {
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.33);
          vec3 c = vec3(2.0, 1.0, 1.0);
          vec3 d = vec3(0.5, 0.2, 0.25);
          return a + b * cos(6.2831853 * (c * t + d));
      }

      // NOISE FIELDS: Hash & Cellular (Worley)
      vec2 hash22(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p.yx + 19.19);
          return fract(vec2(p.x * p.y, p.x + p.y));
      }

      vec2 worleyF1F2(vec2 p) {
          vec2 n = floor(p);
          vec2 f = fract(p);
          float d1 = 8.0, d2 = 8.0;
          for (int j = -1; j <= 1; j++) {
              for (int i = -1; i <= 1; i++) {
                  vec2 g = vec2(float(i), float(j));
                  vec2 o = hash22(n + g);
                  // Animate the feature points (boiling/melting effect)
                  o = 0.5 + 0.5 * sin(u_time * 0.8 + 6.2831853 * o);
                  vec2 r = g + o - f;
                  float d = dot(r, r);
                  if (d < d1) { d2 = d1; d1 = d; }
                  else if (d < d2) { d2 = d; }
              }
          }
          return vec2(sqrt(d1), sqrt(d2));
      }

      // TESSELLATIONS: p6m Symmetry Folding (Hexagonal/Triangular)
      vec2 foldP6m(vec2 p) {
          p = abs(p);
          const float sqrt3 = 1.7320508;
          if (p.y > p.x * sqrt3) p = vec2(p.x * sqrt3 + p.y, p.x - p.y * sqrt3) / 2.0;
          p = abs(p);
          if (p.y > p.x * sqrt3) p = vec2(p.x * sqrt3 + p.y, p.x - p.y * sqrt3) / 2.0;
          return p;
      }

      // FERAL MECHANISM: Fungal Lisa Frank Leopard Spots
      // Combines F2-F1 Worley with a stark threshold
      float getLeopardMask(vec2 p) {
          vec2 wf = worleyF1F2(p);
          float edge = wf.y - wf.x; // F2 minus F1
          // Hard threshold creates stark black lines (Lisa Frank style)
          return smoothstep(0.02, 0.08, edge);
      }

      float getSparkles(vec2 p) {
          vec2 wf = worleyF1F2(p);
          // F1 near 0 means we are exactly at a cell center
          return smoothstep(0.12, 0.0, wf.x);
      }

      void main() {
          vec2 uv = (vUv - 0.5) * 2.0;
          uv.x *= u_resolution.x / u_resolution.y;
          
          vec2 mouse = u_mouse * 2.0 - 1.0;
          if(length(mouse) < 0.01) mouse = vec2(0.5, 0.5);

          // FRACTALS: Hyperbolic-style spatial inversion
          float r = length(uv);
          float theta = atan(uv.y, uv.x);
          
          // Spatial rotation
          float rot = u_time * 0.1;
          uv *= mat2(cos(rot), -sin(rot), sin(rot), cos(rot));

          // Invert space based on distance to create a black hole / infinite zoom effect
          vec2 inv_uv = uv / dot(uv, uv) * 0.5;
          
          // FUNGAL INFECTION: Mix normal space and inverted space based on mouse
          float infection = smoothstep(0.0, 1.5, length(mouse));
          uv = mix(uv * 2.0, inv_uv, infection);

          // TESSELLATIONS: Apply p6m hexagonal symmetry fold
          // The symmetry gradually breaks down as time progresses (bureaucratic failure)
          vec2 folded_uv = foldP6m(uv * 1.5);
          float symmetry_break = smoothstep(0.2, 0.8, sin(u_time * 0.3 + r * 5.0));
          uv = mix(folded_uv, uv, symmetry_break * 0.5);

          // NOISE FIELDS: Deep Iterative Domain Warp
          vec2 w1 = worleyF1F2(uv * 2.0 + u_time * 0.15);
          vec2 w2 = worleyF1F2(uv * 3.0 - w1.x * 2.5 + u_time * 0.25);
          uv += (w2 - w1) * (0.3 + mouse.x * 0.5);

          // COLOR FIELDS: Map the warped space to the Neon Acid palette
          float hue = length(uv) * 1.5 - u_time * 0.4 + w1.y;
          vec3 baseColor = paletteNeon(hue);

          // PAPER MISREGISTRATION: Chromatic aberration on the leopard spots
          // Simulating cheap 90s sticker printing errors
          vec2 scale = uv * 6.0;
          float maskR = getLeopardMask(scale + vec2(0.04, 0.0));
          float maskG = getLeopardMask(scale);
          float maskB = getLeopardMask(scale - vec2(0.04, 0.0));
          vec3 leopardMask = vec3(maskR, maskG, maskB);

          // Apply the mask to the base rainbow color
          vec3 finalColor = baseColor * leopardMask;

          // Add blinding white starbursts in the cell centers
          float sparkles = getSparkles(scale);
          finalColor += vec3(sparkles * 2.5);

          // Vignette / Depth shading
          finalColor *= 1.0 - smoothstep(1.0, 3.0, r);

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
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
      }
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material, mouseLerp: new THREE.Vector2(0.5, 0.5) };
  } catch (e) {
    console.error("WebGL Initialization Failed:", e);
    return;
  }
}

const { renderer, scene, camera, material, mouseLerp } = canvas.__three;

if (material && material.uniforms) {
  if (material.uniforms.u_time) {
    material.uniforms.u_time.value = time;
  }
  if (material.uniforms.u_resolution) {
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }
  if (material.uniforms.u_mouse) {
    let targetX = mouse.x / grid.width;
    let targetY = 1.0 - (mouse.y / grid.height);
    
    // Smooth the mouse input to feel more organic
    mouseLerp.lerp(new THREE.Vector2(targetX, targetY), 0.05);
    material.uniforms.u_mouse.value.copy(mouseLerp);
  }
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);