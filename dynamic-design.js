if (!canvas.__three) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_press;

    varying vec2 vUv;

    #define PI 3.14159265359
    #define PHI 1.61803398875
    #define SILVER 2.41421356237

    // --- REPO GENOME: fbmNoise.glsl ---
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123); }
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
      }
      return v;
    }

    // --- REPO GENOME: lisa_frank_aesthetic & palettes.glsl ---
    vec3 lisaFrankAcid(float t) {
      // Hyper-saturated, feral neon palette
      vec3 a = vec3(0.5, 0.5, 0.5);
      vec3 b = vec3(0.5, 0.5, 0.5);
      vec3 c = vec3(2.0, 1.5, 1.0);
      vec3 d = vec3(0.0, 0.33, 0.67);
      
      vec3 col = a + b * cos(2.0 * PI * (c * t + d));
      
      // Overclock the contrast and inject neon magenta/cyan
      col = smoothstep(0.0, 0.9, col);
      col = pow(col, vec3(0.7)); 
      
      // Artificial fluorescence
      col.r += smoothstep(0.8, 1.0, sin(t * PI * 4.0)) * 0.5; // Hot pink pops
      col.g += smoothstep(0.8, 1.0, cos(t * PI * 3.0)) * 0.4; // Lime flashes
      col.b += smoothstep(0.8, 1.0, sin(t * PI * 5.0 + 1.0)) * 0.6; // Cyan burns
      
      return clamp(col, 0.0, 1.0);
    }

    // --- REPO GENOME: quasicrystals (Ammann-Beenker 8-fold + Penrose 5-fold) ---
    float quasicrystal(vec2 p, float t) {
      float v = 0.0;
      // 8-fold Silver Ratio interference
      for (int i = 0; i < 4; i++) {
        float angle = float(i) * PI / 4.0;
        vec2 dir = vec2(cos(angle), sin(angle));
        // Phason flip logic: time drives phase shifts independently
        float phase = dot(p, dir) * SILVER + t * (float(i) * 0.2 + 0.5);
        v += cos(phase);
      }
      
      // 5-fold Golden Ratio interference (parasitic infection)
      float v5 = 0.0;
      for (int i = 0; i < 5; i++) {
        float angle = float(i) * PI * 2.0 / 5.0;
        vec2 dir = vec2(cos(angle), sin(angle));
        v5 += cos(dot(p, dir) * PHI - t);
      }
      
      // Clash the two symmetries
      return mix(v / 4.0, v5 / 5.0, 0.5 + 0.5 * sin(t * 0.2));
    }

    void main() {
      // Normalize UV to [-1, 1] with aspect ratio correction
      vec2 uv = (vUv - 0.5) * 2.0;
      uv.x *= u_resolution.x / u_resolution.y;
      
      vec2 mouse = (u_mouse - 0.5) * 2.0;
      mouse.x *= u_resolution.x / u_resolution.y;

      // Feral Interaction: The mouse is a thermal point that melts the quasicrystal
      float distToMouse = length(uv - mouse);
      float thermalBloom = exp(-distToMouse * 4.0) * (1.0 + u_press * 2.0);

      // Domain Warping: The crystal is infected by a viscous fluid
      vec2 warpedUV = uv * 8.0;
      warpedUV.x += fbm(uv * 3.0 + u_time * 0.1) * (2.0 + thermalBloom);
      warpedUV.y += fbm(uv * 3.0 - u_time * 0.1 + 10.0) * (2.0 + thermalBloom);

      // Generate the base structural field
      float field = quasicrystal(warpedUV, u_time * 0.5);

      // --- REPO GENOME: structural_color (Thin-film interference) ---
      // Calculate normal vector from the field gradient
      float eps = 0.02;
      float dx = quasicrystal(warpedUV + vec2(eps, 0.0), u_time * 0.5) - field;
      float dy = quasicrystal(warpedUV + vec2(0.0, eps), u_time * 0.5) - field;
      vec3 normal = normalize(vec3(-dx, -dy, 0.15));
      vec3 viewDir = vec3(0.0, 0.0, 1.0);

      // Optical Path Difference (OPD)
      float viewAngle = max(0.0, dot(normal, viewDir));
      
      // Quantize the field to create "tiles" breaking apart
      float tiles = smoothstep(0.05, 0.1, abs(fract(field * 3.0) - 0.5));
      float organic = fbm(warpedUV * 2.0 + u_time);
      
      // Film thickness varies by the quasi-crystalline structure and organic rot
      float filmThickness = abs(field) * 3.0 + organic * 2.0 + thermalBloom;
      float opd = 2.0 * 1.56 * filmThickness * viewAngle; // 1.56 is Chitin refractive index

      // Structural Color mapped through Lisa Frank Aesthetic
      vec3 color = lisaFrankAcid(opd * 0.5 + u_time * 0.2);

      // Add Birefringent Stress Lines (Isochromatics)
      float stress = fract(opd * 4.0);
      float stressLines = smoothstep(0.0, 0.05, stress) * smoothstep(0.1, 0.05, stress);
      color = mix(color, vec3(1.0), stressLines * 0.8);

      // Add Tile Boundaries (Quasicrystal geometry asserting itself)
      color = mix(color, vec3(0.0), (1.0 - tiles) * 0.4);

      // Post-Processing: VHS / CRT scanline interference
      float scanline = sin(vUv.y * u_resolution.y * 0.5) * 0.04;
      color -= scanline;

      // Vignette
      float vignette = 1.0 - length(vUv - 0.5) * 1.2;
      color *= smoothstep(0.0, 0.5, vignette);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_press: { value: 0.0 }
    },
    depthWrite: false,
    depthTest: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  canvas.__three = { renderer, scene, camera, material };
}

const { renderer, scene, camera, material } = canvas.__three;

// Update Uniforms
material.uniforms.u_time.value = time;
material.uniforms.u_resolution.value.set(grid.width, grid.height);

// Smooth mouse interpolation for feral fluid dragging
const targetMouseX = mouse.x / grid.width;
const targetMouseY = 1.0 - (mouse.y / grid.height); // Flip Y for WebGL

// Initialize or lerp mouse
if (!canvas.__lastMouse) {
  canvas.__lastMouse = { x: targetMouseX, y: targetMouseY, press: 0 };
}
canvas.__lastMouse.x += (targetMouseX - canvas.__lastMouse.x) * 0.1;
canvas.__lastMouse.y += (targetMouseY - canvas.__lastMouse.y) * 0.1;

const targetPress = mouse.isPressed ? 1.0 : 0.0;
canvas.__lastMouse.press += (targetPress - canvas.__lastMouse.press) * 0.1;

material.uniforms.u_mouse.value.set(canvas.__lastMouse.x, canvas.__lastMouse.y);
material.uniforms.u_press.value = canvas.__lastMouse.press;

// Render
renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);