try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
    camera.position.z = 1;

    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      
      in vec2 vUv;
      out vec4 fragColor;

      // --- Noise & Hash (noise_fields genome) ---
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      
      float fbm(vec2 p) {
        float f = 0.0;
        f += 0.5000 * noise(p); p = p * 2.02;
        f += 0.2500 * noise(p); p = p * 2.03;
        f += 0.1250 * noise(p);
        return f;
      }

      // --- Acid Neon Palette (color_fields genome) ---
      vec3 acidPalette(float t) {
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.33);
        vec3 c = vec3(2.0, 1.0, 1.0);
        vec3 d = vec3(0.5, 0.2, 0.25);
        vec3 col = a + b * cos(6.2831853 * (c * t + d));
        // Push saturation to feral limits
        col = smoothstep(0.0, 0.9, col);
        return col;
      }

      // --- Kaleidoscope Fold (psychedelic_collage genome) ---
      vec2 kaleidoscope(vec2 uv, float folds) {
        float angle = atan(uv.y, uv.x);
        float radius = length(uv);
        float sector = 6.2831853 / folds;
        angle = mod(angle, sector);
        if (angle > sector / 2.0) angle = sector - angle;
        return vec2(cos(angle), sin(angle)) * radius;
      }

      // --- Halftone Screen (psychedelic_collage genome) ---
      float halftone(vec2 fragCoord, float freq, float angle, float luma) {
        float rad = radians(angle);
        mat2 rot = mat2(cos(rad), -sin(rad), sin(rad), cos(rad));
        vec2 uv = rot * fragCoord * freq / 1024.0;
        vec2 cell = fract(uv) - 0.5;
        float dist = length(cell);
        float dotRadius = sqrt(1.0 - luma) * 0.6;
        return smoothstep(dotRadius + 0.1, dotRadius - 0.1, dist);
      }

      // --- Feral Domain-Warped Julia Set ---
      vec4 getFractal(vec2 uv, float time) {
        // Base coordinate mapping
        vec2 z = uv * 2.0;
        
        // 1. Kaleidoscope Symmetry (Happy Mandala)
        float folds = 6.0 + 2.0 * sin(time * 0.5);
        z = kaleidoscope(z, folds);
        
        // 2. Domain Warp (Injected Noise)
        vec2 warp = vec2(fbm(z * 3.0 + time), fbm(z * 3.0 - time));
        z += (warp - 0.5) * 0.4;
        
        // 3. Julia Iteration
        // Base parameter: Spiral Julia mixed with gentle oscillation
        vec2 c = vec2(0.285, 0.01) + vec2(sin(time * 0.7) * 0.1, cos(time * 0.4) * 0.1);
        
        float smooth_n = 0.0;
        float trap = 100.0;
        
        for(int i = 0; i < 64; i++) {
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
            
            // Orbit trap (distance to origin)
            trap = min(trap, length(z));
            
            if(dot(z, z) > 256.0) {
                smooth_n = float(i) - log2(log2(dot(z, z))) + 4.0;
                break;
            }
        }
        
        return vec4(smooth_n, trap, z);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        
        // Heartbeat zoom
        float zoom = 1.2 + sin(u_time * 2.0) * 0.05;
        uv *= zoom;

        // Chromatic Aberration (CMYK Misregistration)
        float offset = 0.015 * length(uv);
        vec4 fR = getFractal(uv + vec2(offset, 0.0), u_time);
        vec4 fG = getFractal(uv, u_time);
        vec4 fB = getFractal(uv - vec2(offset, 0.0), u_time);

        // Map fractal data to Acid Palette
        float speed = u_time * 0.5;
        vec3 colR = acidPalette(fR.x * 0.03 - speed) + exp(-fR.y * 4.0) * vec3(1.0, 0.0, 0.5);
        vec3 colG = acidPalette(fG.x * 0.03 - speed) + exp(-fG.y * 4.0) * vec3(0.0, 1.0, 0.5);
        vec3 colB = acidPalette(fB.x * 0.03 - speed) + exp(-fB.y * 4.0) * vec3(0.0, 0.5, 1.0);

        vec3 color = vec3(colR.r, colG.g, colB.b);

        // Halftone / Risograph overlay
        float luma = dot(color, vec3(0.299, 0.587, 0.114));
        float ht = halftone(gl_FragCoord.xy, 180.0, 45.0, luma);
        
        // Screen blend halftone
        color = mix(color, color + ht * vec3(1.0, 1.0, 0.0), 0.3); // Yellow halftone pop

        // Paper Grain / Xerox noise
        float g = hash(gl_FragCoord.xy + u_time);
        color += (g - 0.5) * 0.15;

        fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
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

  if (material?.uniforms?.u_time) {
    material.uniforms.u_time.value = time;
  }
  if (material?.uniforms?.u_resolution) {
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("WebGL Initialization Failed:", e);
}