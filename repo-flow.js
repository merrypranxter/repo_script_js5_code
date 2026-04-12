if (!canvas.__three) {
  // --- INITIALIZATION ---
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  const scene = new THREE.Scene();
  // Deep space background to make the structural color pop
  scene.background = new THREE.Color(0x020205); 
  
  // Setup Camera
  const camera = new THREE.PerspectiveCamera(60, grid.width / grid.height, 0.1, 100);
  camera.position.set(0, 0, 3.5);
  camera.lookAt(0, 0, 0);

  // --- THE FERAL GENOME: OVERCLOCKED STRUCTURAL COLOR ---
  // We extract the math from thin_film_acid.frag and birefringence.frag, 
  // but we infect it with domain-warped topological stress. 
  // The nanostructures are "boiling" and shifting chaotically.

  const vertexShader = `
    uniform float u_time;
    uniform vec2 u_mouse;
    
    varying vec2 v_uv;
    varying vec3 v_normal;
    varying vec3 v_viewPosition;
    varying float v_stress;
    varying vec3 v_worldPos;

    // Simplex-ish hash
    vec3 hash33(vec3 p) {
        p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
                  dot(p,vec3(269.5,183.3,246.1)),
                  dot(p,vec3(113.5,271.9,124.6)));
        return -1.0 + 2.0 * fract(sin(p)*43758.5453123);
    }

    // 3D Noise for physical displacement
    float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        vec3 u = f*f*(3.0-2.0*f);
        return mix( mix( mix( dot( hash33(i + vec3(0.0,0.0,0.0)), f - vec3(0.0,0.0,0.0) ), 
                              dot( hash33(i + vec3(1.0,0.0,0.0)), f - vec3(1.0,0.0,0.0) ), u.x),
                         mix( dot( hash33(i + vec3(0.0,1.0,0.0)), f - vec3(0.0,1.0,0.0) ), 
                              dot( hash33(i + vec3(1.0,1.0,0.0)), f - vec3(1.0,1.0,0.0) ), u.x), u.y),
                    mix( mix( dot( hash33(i + vec3(0.0,0.0,1.0)), f - vec3(0.0,0.0,1.0) ), 
                              dot( hash33(i + vec3(1.0,0.0,1.0)), f - vec3(1.0,0.0,1.0) ), u.x),
                         mix( dot( hash33(i + vec3(0.0,1.0,1.0)), f - vec3(0.0,1.0,1.0) ), 
                              dot( hash33(i + vec3(1.0,1.0,1.0)), f - vec3(1.0,1.0,1.0) ), u.x), u.y), u.z );
    }

    // FBM for topological mutation
    float fbm(vec3 x) {
        float v = 0.0;
        float a = 0.5;
        vec3 shift = vec3(100.0);
        for (int i = 0; i < 5; ++i) {
            v += a * noise(x);
            x = x * 2.0 + shift;
            a *= 0.5;
        }
        return v;
    }

    void main() {
        v_uv = uv;
        vec3 pos = position;

        // Domain warping: the surface geometry is eating itself
        vec3 q = vec3(fbm(pos + u_time * 0.1), fbm(pos + vec3(1.2, 3.4, 5.6) - u_time * 0.15), 0.0);
        float displacement = fbm(pos * 1.5 + q * 2.0 + u_time * 0.2);
        
        // Mouse interaction creates a "thermal bloom" of stress
        float distToMouse = length(uv - u_mouse);
        float thermalStress = exp(-distToMouse * 8.0) * 0.8;
        
        pos.z += displacement * 0.6 + thermalStress * 0.5;
        
        // Calculate structural stress for the fragment shader (birefringence mapping)
        v_stress = displacement + thermalStress;
        v_worldPos = (modelMatrix * vec4(pos, 1.0)).xyz;

        // Perturb normal based on displacement gradient approximation
        vec3 displacedPos = pos;
        v_normal = normalize(normalMatrix * normal);
        
        vec4 worldPosition = modelMatrix * vec4(displacedPos, 1.0);
        v_viewPosition = normalize(cameraPosition - worldPosition.xyz);
        
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `;

  const fragmentShader = `
    uniform float u_time;
    uniform vec2 u_mouse;
    
    varying vec2 v_uv;
    varying vec3 v_normal;
    varying vec3 v_viewPosition;
    varying float v_stress;
    varying vec3 v_worldPos;

    const float PI = 3.14159265359;

    // Acid/Oil Slick Cosine Palette from the repo's palettes.glsl
    vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
        return a + b * cos(2.0 * PI * (c * t + d));
    }

    vec3 getAcidPalette(float t) {
        return palette(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.263, 0.416, 0.557));
    }

    // High-frequency noise for nanostructure simulation (Morpho ridge mimicking)
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
        vec3 N = normalize(v_normal);
        vec3 V = normalize(v_viewPosition);
        
        // Micro-roughness: the nanostructures are vibrating
        float microNoise = hash(v_uv * 200.0 + u_time);
        N.x += (microNoise - 0.5) * 0.15;
        N.y += (microNoise - 0.5) * 0.15;
        N = normalize(N);

        // View Angle (0 to 1)
        float viewAngle = max(0.0, dot(N, V));
        
        // --- OVERCLOCKED THIN-FILM INTERFERENCE ---
        // Formula: 2nd cos(θ) = mλ
        // We distort the refractive index (n) and thickness (d) based on internal stress
        
        float baseIOR = 1.4;
        // Stress modulates the refractive index (Birefringence)
        float currentIOR = baseIOR + v_stress * 0.8; 
        
        // Film thickness fluctuates based on time and spatial coordinates
        float filmThickness = 0.5 + sin(v_worldPos.x * 5.0 + u_time) * 0.2 + v_stress * 0.5;
        
        // Optical Path Difference
        float opd = 2.0 * currentIOR * filmThickness * viewAngle;
        
        // Map path difference to an intense, acidic color palette
        vec3 color = getAcidPalette(opd * 2.0 - u_time * 0.5);
        
        // --- PARASITIC BRAGG REFLECTION ---
        // Sharp, metallic metallic spikes where the geometry folds sharply
        float bragg = smoothstep(0.8, 1.0, sin(opd * 15.0));
        color += vec3(bragg * 0.6, bragg * 0.8, bragg); // Add gold/cyan metallic sheen
        
        // --- NECROTIC GLITCH ---
        // When stress is extremely high, the structural color "breaks" into chromatic aberration
        float fracture = step(0.85, fract(v_stress * 8.0 - u_time * 2.0));
        vec3 glitchColor = vec3(
            getAcidPalette(opd * 2.1).r,
            getAcidPalette(opd * 2.0).g,
            getAcidPalette(opd * 1.9).b
        );
        color = mix(color, glitchColor * 1.5, fracture * 0.8);
        
        // Edge darkening (Fresnel inversion) to make it look like a physical, dense object
        float rim = 1.0 - viewAngle;
        color *= smoothstep(0.0, 0.8, viewAngle);
        color += vec3(0.1, 0.0, 0.2) * pow(rim, 3.0); // Deep purple rim light

        // Final contrast punch
        color = pow(color, vec3(0.8));

        gl_FragColor = vec4(color, 1.0);
    }
  `;

  // Use a dense plane to allow for rich vertex displacement
  const geometry = new THREE.PlaneGeometry(8, 8, 256, 256);
  
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      u_time: { value: 0.0 },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
    },
    side: THREE.DoubleSide,
    wireframe: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  // Tilt it slightly so we aren't looking dead-on, maximizing iridescence
  mesh.rotation.x = -Math.PI * 0.15;
  scene.add(mesh);

  canvas.__three = { renderer, scene, camera, material, mesh };
}

// --- RENDER LOOP ---
const { renderer, scene, camera, material, mesh } = canvas.__three;

// Update Uniforms
if (material && material.uniforms) {
  material.uniforms.u_time.value = time;
  
  // Normalize mouse coordinates for the shader (0.0 to 1.0)
  // Inverse Y because WebGL UVs go bottom-to-top
  const mx = mouse.x / grid.width;
  const my = 1.0 - (mouse.y / grid.height);
  
  // Smoothly interpolate mouse position to avoid jerky stress reactions
  const currentMouse = material.uniforms.u_mouse.value;
  currentMouse.x += (mx - currentMouse.x) * 0.1;
  currentMouse.y += (my - currentMouse.y) * 0.1;
}

// Slowly rotate the entire structure to show off the view-dependent structural color
mesh.rotation.z = Math.sin(time * 0.2) * 0.2;
mesh.rotation.y = Math.cos(time * 0.15) * 0.1;

// Render
renderer.setSize(grid.width, grid.height, false);
camera.aspect = grid.width / grid.height;
camera.updateProjectionMatrix();
renderer.render(scene, camera);