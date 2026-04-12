if (!canvas.__three) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false });
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

  // THE STRANGE MECHANISM: 
  // We combine the "Structural Color" repo's thin-film/birefringence physics 
  // with the "Raymarching" repo's space-folding manifolds, creating a 
  // "Photoelastic Fractal Slag". The mouse injects localized stress into the field.
  const fragmentShader = `
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_isPressed;

    #define PI 3.14159265359

    // Cosine Palette (from structural_color/palettes.glsl)
    vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
        return a + b * cos(2.0 * PI * (c * t + d));
    }

    // 2D Rotation (from raymarching/manifolds.glsl)
    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // Hash for blue-noise dithering
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
        // Normalize coordinates
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        
        // Correct mouse Y coordinate (DOM is top-down, WebGL is bottom-up)
        vec2 mCoords = vec2(u_mouse.x, u_resolution.y - u_mouse.y);
        vec2 mouse = (mCoords - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        
        vec2 p = uv;
        
        // Measurement metrics (from fractals/core_math_traits.md)
        float trap = 1e10;  // Orbit trap distance
        float stress = 0.0; // Accumulated geometric stress
        
        // Interaction: Mouse acts as a localized photoelastic stress singularity
        float mouseDist = length(p - mouse);
        float injection = exp(-mouseDist * 6.0) * (u_isPressed > 0.5 ? -3.0 : 1.5);
        
        // Iterative Space Folding (from fractals & raymarching repos)
        // We fold space repeatedly, simulating a non-Euclidean manifold
        for (float i = 0.0; i < 9.0; i++) {
            // Abs fold with oscillating scale
            p = abs(p) - vec2(0.35, 0.25) * (sin(u_time * 0.15) * 0.15 + 0.85);
            
            // Twist based on time, iteration, and mouse injection
            p *= rot(u_time * 0.08 + injection * 0.4 + i * 0.12);
            
            // Fractal scaling
            p *= 1.18; 
            
            // Orbit trap calculation: distance to origin and axes
            trap = min(trap, length(p) * 0.4);
            trap = min(trap, abs(p.x) * 0.7);
            
            // Accumulate tension/stress in the geometric field
            stress += length(p) * exp(-i * 0.35);
        }

        // --- STRUCTURAL COLOR OPTICS ---
        
        // Optical Path Difference (OPD) driven by geometric stress and traps
        float opd = trap * 6.0 + stress * 0.4 - u_time * 0.4;
        
        // Birefringence/Acid Palette mapping
        vec3 color = palette(
            opd,
            vec3(0.5),                      // Base
            vec3(0.5),                      // Amplitude
            vec3(1.0, 0.9, 0.8),            // Frequency (shifted for iridescence)
            vec3(0.0, 0.33, 0.67)           // Phase
        );
        
        // Fabry-Pérot Interference Fringes
        float fringes = cos(opd * 25.0);
        color *= 0.65 + 0.35 * smoothstep(-0.5, 0.5, fringes);
        
        // Rayleigh Scattering approximation in deep fractal voids
        // Voids appear deep blue, mimicking atmospheric scattering
        float voidness = smoothstep(0.0, 1.8, trap);
        vec3 rayleigh = vec3(0.01, 0.04, 0.25) / (trap * trap + 0.005);
        color = mix(color, rayleigh, voidness * 0.85);
        
        // Chromatic Dispersion (Aberration) at high stress boundaries
        vec3 aberration = vec3(
            palette(opd + 0.03, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67)).r,
            palette(opd,        vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67)).g,
            palette(opd - 0.03, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67)).b
        );
        float stressEdge = smoothstep(1.0, 3.0, stress);
        color = mix(color, aberration, stressEdge);

        // Dithering (from raymarching/dithering.glsl) to prevent banding
        float dither = hash(uv * u_time);
        color += (dither - 0.5) * 0.04;

        // ACES Film Tone Mapping (from raymarching/volumetrics.glsl)
        color = clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), 0.0, 1.0);

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
      u_mouse: { value: new THREE.Vector2(grid.width / 2, grid.height / 2) },
      u_isPressed: { value: 0.0 }
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
material.uniforms.u_mouse.value.set(mouse.x, mouse.y);
material.uniforms.u_isPressed.value = mouse.isPressed ? 1.0 : 0.0;

// Render
renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);