try {
  if (!canvas.__three) {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL 2 not supported or context occupied");

    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
    renderer.setClearColor(0x040608, 1.0); // Cyberdelic Void Black

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
      precision highp float;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec3 u_mouse;
      
      in vec2 vUv;
      out vec4 fragColor;

      #define PI 3.14159265359
      
      // Hash function for Xerox electrostatic grain
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      // 2D Noise for Ink Bleed and Displacement
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      // FBM for complex organic corruption (Fungal growth on acoustic nodes)
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < 5; ++i) {
          v += a * noise(p);
          p = rot * p * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      // Chladni Plate Equation (from vibration repo)
      // sin(n*pi*x)*sin(m*pi*y) - sin(m*pi*x)*sin(n*pi*y) = 0
      float chladni(vec2 uv, float m, float n) {
        float val = sin(n * PI * uv.x) * sin(m * PI * uv.y) - sin(m * PI * uv.x) * sin(n * PI * uv.y);
        // We want the nodal lines (val approx 0), applying acoustic radiation pressure push
        return smoothstep(0.15, 0.0, abs(val));
      }

      // Poincare Disk Hyperbolic Mapping
      vec2 poincareWarp(vec2 uv) {
        float r = length(uv);
        float disk = 1.0 - r * r;
        return uv / max(disk, 0.001); // Exponential compression at the boundary
      }

      void main() {
        // Setup UVs
        vec2 uv = (vUv - 0.5) * 2.0;
        float aspect = u_resolution.x / u_resolution.y;
        uv.x *= aspect;

        vec2 mouse = (u_mouse.xy - 0.5) * 2.0;
        mouse.x *= aspect;
        
        bool isGlitch = u_mouse.z > 0.5;

        // 1. Hyperbolic Geometry Fold
        float r = length(uv);
        vec2 warpedUV = poincareWarp(uv);
        
        // 2. Mouse acts as a "damping finger", forcing a node and twisting the space
        float fingerDist = length(uv - mouse);
        float damping = smoothstep(0.8, 0.0, fingerDist);
        
        // 3. Time-evolving resonant modes (m, n)
        float t = u_time * 0.2;
        float m = 3.0 + 2.0 * sin(t) + (damping * 5.0);
        float n = 5.0 + 3.0 * cos(t * 1.3) - (damping * 3.0);

        // 4. Organic Corruption / Ink Bleed (Displacement Warp)
        // Simulate wet spread and paper grain affecting the acoustic wave
        float bleed = fbm(warpedUV * 2.0 - u_time * 0.5);
        vec2 displacement = vec2(cos(bleed * PI * 2.0), sin(bleed * PI * 2.0)) * 0.15;
        
        // Glitch Databend: Horizontal scanline dropouts if mouse pressed
        if (isGlitch) {
            float scanline = step(0.8, fract(uv.y * 50.0 + u_time * 10.0));
            displacement.x += scanline * 0.5 * noise(vec2(u_time * 20.0, uv.y * 10.0));
            m += floor(noise(uv * 10.0) * 5.0); // Shatter the resonance
        }

        vec2 baseUV = warpedUV + displacement * (1.0 + damping);

        // 5. CMYK Misregistration / Chromatic Aberration
        // The printing press is broken; the colors separate.
        float aberration = 0.03 + 0.1 * damping;
        if (isGlitch) aberration *= 3.0;
        
        vec2 offsetR = vec2(aberration, aberration * 0.5);
        vec2 offsetG = vec2(-aberration * 0.5, -aberration);
        vec2 offsetB = vec2(-aberration, aberration);

        float chR = chladni(baseUV + offsetR, m, n);
        float chG = chladni(baseUV + offsetG, n, m); // Swap m,n for phase variance
        float chB = chladni(baseUV + offsetB, m, n);

        // 6. Cyberdelic Neon Palette Compositing
        // Base: Void Black #040608
        vec3 color = vec3(0.015, 0.023, 0.031);
        
        // Highlights: Neon Cyan, Electric Magenta, Acid Lime
        vec3 neonCyan = vec3(0.0, 1.0, 0.941);
        vec3 electricMagenta = vec3(1.0, 0.0, 0.8);
        vec3 acidLime = vec3(0.69, 1.0, 0.0);

        color = mix(color, electricMagenta, chR);
        color = mix(color, acidLime, chG * 0.7); // Lime is aggressive, mix slightly less
        color = mix(color, neonCyan, chB);

        // Screen blend hotspots where nodes overlap
        float overlap = chR * chG * chB;
        color += overlap * vec3(1.0); // Hot White

        // 7. Halftone Screen Artifact
        float screenFreq = 200.0;
        // Rotate screen 45 degrees
        vec2 screenUV = mat2(0.707, -0.707, 0.707, 0.707) * vUv;
        vec2 cell = fract(screenUV * screenFreq) - 0.5;
        float dotDist = length(cell);
        
        // Luma to dot radius
        float luma = dot(color, vec3(0.299, 0.587, 0.114));
        float dotRadius = sqrt(luma) * 0.6;
        float halftone = smoothstep(dotRadius + 0.1, dotRadius - 0.1, dotDist);
        
        // Multiply blend the halftone dots
        color *= mix(vec3(1.0), vec3(0.1, 0.05, 0.1), 1.0 - halftone);

        // 8. Photocopy Noise / Electrostatic Grain
        float grain = hash(vUv * 1234.5 + u_time);
        color += (grain - 0.5) * 0.15;

        // 9. Poincare Boundary Fade (Vignette)
        // The hyperbolic disk edge
        float edge = smoothstep(0.98, 0.95, r);
        color *= edge;
        
        // Add a glowing rim
        float rim = smoothstep(0.95, 0.98, r) * smoothstep(1.0, 0.98, r);
        color += rim * electricMagenta * (0.5 + 0.5 * sin(u_time * 5.0));

        fragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector3(0.5, 0.5, 0.0) }
      },
      depthWrite: false,
      depthTest: false
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(plane);

    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  if (material && material.uniforms) {
    if (material.uniforms.u_time) {
      material.uniforms.u_time.value = time;
    }
    if (material.uniforms.u_resolution) {
      material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
    if (material.uniforms.u_mouse) {
      // Normalize mouse to 0.0 - 1.0, flip Y for WebGL
      const mx = mouse.x / grid.width;
      const my = 1.0 - (mouse.y / grid.height);
      const mz = mouse.isPressed ? 1.0 : 0.0;
      
      // Smooth damp the mouse position to simulate physical drag on the Chladni plate
      const current = material.uniforms.u_mouse.value;
      current.x += (mx - current.x) * 0.1;
      current.y += (my - current.y) * 0.1;
      current.z = mz;
    }
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (err) {
  console.error("The feral cymatic engine failed to initialize:", err);
  
  // Fallback to 2D Context if WebGL is completely fried
  if (ctx) {
    ctx.fillStyle = '#040608';
    ctx.fillRect(0, 0, grid.width, grid.height);
    ctx.fillStyle = '#FF00CC';
    ctx.font = '20px monospace';
    ctx.fillText("CYMATIC OVERLOAD. WEBGL CONTEXT LOST.", 20, grid.height / 2);
  }
}