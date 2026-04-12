if (!canvas.__three) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  const fragmentShader = `
    #define PI 3.14159265359

    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_isPressed;

    varying vec2 vUv;

    // --- NON-EUCLIDEAN MATH (merrypranxter/noneuclidean) ---
    vec2 cmul(vec2 a, vec2 b) {
        return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
    }
    
    vec2 cdiv(vec2 a, vec2 b) {
        float d = dot(b, b);
        return vec2(dot(a,b), a.y*b.x - a.x*b.y) / d;
    }
    
    vec2 conj(vec2 z) {
        return vec2(z.x, -z.y);
    }

    // Mobius isometry: translates point p to origin
    vec2 mobius_translate(vec2 z, vec2 p) {
        return cdiv(z - p, vec2(1.0, 0.0) - cmul(conj(p), z));
    }

    // --- NOISE & FBM (merrypranxter/structural_color) ---
    vec2 hash22(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(dot(hash22(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                       dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
                   mix(dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                       dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
    }

    float fbm(vec2 p) {
        float f = 0.0;
        float amp = 0.5;
        for(int i = 0; i < 5; i++) {
            f += amp * noise(p);
            p *= 2.0;
            amp *= 0.5;
        }
        return f;
    }

    // --- QUASICRYSTAL SYMMETRY (merrypranxter/tesselations) ---
    float quasicrystal(vec2 uv, float time) {
        float val = 0.0;
        for(int i = 0; i < 5; i++) {
            float a = float(i) * PI / 5.0;
            vec2 dir = vec2(cos(a), sin(a));
            float phase = dot(uv, dir) + time * 0.2;
            val += cos(phase * 12.0);
        }
        return val / 5.0;
    }

    // --- LISA FRANK ACID PALETTES (merrypranxter/structural_color + lisa_frank_aesthetic) ---
    vec3 acidPalette(float t) {
        vec3 a = vec3(0.5);
        vec3 b = vec3(0.5);
        vec3 c = vec3(1.0);
        vec3 d = vec3(0.8, 0.2, 0.6); // Neon pink, cyan, electric yellow bias
        return a + b * cos(2.0 * PI * (c * t + d));
    }

    vec3 neonPalette(float t) {
        vec3 a = vec3(0.5);
        vec3 b = vec3(0.5);
        vec3 c = vec3(1.0, 1.0, 0.5);
        vec3 d = vec3(0.5, 0.0, 0.8); // Hyper-saturated purples and greens
        return a + b * cos(2.0 * PI * (c * t + d));
    }

    void main() {
        // Map to Poincare Disk [-1, 1]
        vec2 uv = vUv * 2.0 - 1.0;
        uv.x *= u_resolution.x / u_resolution.y;

        float r = length(uv);
        if (r >= 0.995) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }

        // Orbital Attractor (Mouse + Time)
        vec2 target = u_mouse * 0.85;
        if (length(target) > 0.9) target = normalize(target) * 0.9;
        
        float pulse = sin(u_time * 2.0) * 0.05 + 0.05;
        vec2 center = target + vec2(cos(u_time), sin(u_time)) * (0.1 + pulse * u_isPressed);
        if (length(center) > 0.9) center = normalize(center) * 0.9;

        // Apply Hyperbolic Isometry (Mobius Translation)
        vec2 z = mobius_translate(uv, center);

        // Hyperbolic Distance & Domain Warp
        float hyp_dist = 0.5 * log((1.0 + length(z)) / max(0.001, (1.0 - length(z))));
        float theta = hyp_dist * 1.5 - u_time * 0.5;
        float c = cos(theta), s = sin(theta);
        z = vec2(z.x * c - z.y * s, z.x * s + z.y * c);

        // --- STRUCTURAL COLOR & BIREFRINGENCE ---
        float qc = quasicrystal(z, u_time);
        float n_val = fbm(z * 15.0 + u_time * 0.2) * 0.5 + 0.5;
        
        // Simulate Thin-Film Interference (thickness modulated by space and noise)
        float IOR = 1.56; // Chitin / Birefringent plastic
        float thickness = (qc * 0.5 + 0.5) + n_val * 0.5;
        
        // Effective viewing angle in 2D simulated by radial falloff
        float cosTheta = 1.0 - length(uv); 
        float opd = 2.0 * IOR * thickness * cosTheta; // Optical Path Difference

        // Base structural color
        vec3 color = acidPalette(opd * 2.5 - u_time * 0.3);
        
        // Michel-Levy Birefringence punch
        float stress = length(z) * 4.0 + qc * 3.0 + n_val;
        vec3 stressColor = neonPalette(abs(stress) * 1.2 + u_time);
        color = mix(color, stressColor, smoothstep(0.4, 0.8, qc));

        // --- LISA FRANK LEOPARD SPOTS ---
        // Spots shrink exponentially towards the Poincare boundary due to 'z' mapping
        float spot_noise = fbm(z * 25.0 - vec2(u_time * 0.1)) * 0.5 + 0.5;
        
        float spot_ring = smoothstep(0.55, 0.65, spot_noise) - smoothstep(0.75, 0.85, spot_noise);
        float spot_center = smoothstep(0.8, 0.9, spot_noise);

        // Stark black rims
        color = mix(color, vec3(0.05), spot_ring * 0.9);
        
        // Saturated neon centers
        vec3 centerPop = acidPalette(length(z) * 5.0 + u_time);
        color = mix(color, centerPop * 1.5, spot_center);

        // --- LISA FRANK SPARKLES ---
        float sparkle = pow(fract(sin(dot(z * 100.0, vec2(12.9898, 78.233))) * 43758.5453), 200.0);
        // Sparkles concentrate in the bright/stressed areas
        color += vec3(sparkle) * 3.0 * smoothstep(0.3, 0.7, qc);

        // Aggressive contrast (Birefringence neon punch)
        color = smoothstep(0.0, 1.0, color);
        color = pow(color, vec3(0.85)); // Gamma boost

        // Boundary fade to black
        float fade = smoothstep(0.99, 0.95, r);
        
        gl_FragColor = vec4(color * fade, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
      u_mouse: { value: new THREE.Vector2(0, 0) },
      u_isPressed: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: fragmentShader,
    transparent: true
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(mesh);

  canvas.__three = {
    renderer,
    scene,
    camera,
    material,
    targetMouse: new THREE.Vector2(0, 0),
    currentMouse: new THREE.Vector2(0, 0)
  };
}

const { renderer, scene, camera, material, targetMouse, currentMouse } = canvas.__three;

if (material && material.uniforms) {
  // Normalize mouse to [-1, 1] relative to the canvas center
  const mx = (mouse.x / grid.width) * 2.0 - 1.0;
  const my = -(mouse.y / grid.height) * 2.0 + 1.0;
  
  targetMouse.set(mx, my);
  
  // Fluid lerp for feral, organic movement
  currentMouse.lerp(targetMouse, 0.08);

  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  material.uniforms.u_mouse.value.copy(currentMouse);
  material.uniforms.u_isPressed.value = mouse.isPressed ? 1.0 : 0.0;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);