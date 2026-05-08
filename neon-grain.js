if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    
    // Orthographic camera for pure material rendering
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2() }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        
        uniform float u_time;
        uniform vec2 u_resolution;
        
        in vec2 vUv;
        out vec4 fragColor;

        // ✦ System: Quantum Dust Hash
        float hash21(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        // ✦ System: Mandelbox Spatial Folding (Minimal Surfaces / TPMS proxy)
        void boxFold(inout vec2 z) {
            z = clamp(z, -1.0, 1.0) * 2.0 - z;
        }

        void sphereFold(inout vec2 z) {
            float r2 = dot(z,z);
            if (r2 < 0.25) {
                z *= 4.0;
            } else if (r2 < 1.0) {
                z /= r2;
            }
        }

        void main() {
            // Coordinate mapping & scaling
            vec2 p = (vUv - 0.5) * 2.0;
            p.x *= u_resolution.x / u_resolution.y;

            // ✦ TIME SCALES ✦
            // 1. Slow global drift: AdS depth breathing / manifold warping
            float t_slow = u_time * 0.05;
            // 2. Medium structural motion: Attractor parameter drift
            float t_med = u_time * 0.15;
            // 3. Fast detail shimmer: Interference holography & quantum dust
            float t_fast = u_time * 2.0;

            // ✦ TOPOLOGY: AdS / Poincaré Hyperbolic Projection
            float r2 = dot(p, p);
            p = p / (1.0 + r2 * (0.3 + 0.2 * sin(t_slow)));

            // Base attractor constants
            vec2 c = vec2(cos(t_med), sin(t_med * 1.3)) * 0.55;

            // ✦ BIREFRINGENCE / CHROMATIC ABERRATION AS STRUCTURE
            // Offset the initial sampling coordinates to separate the RGB (CMY) channels
            vec2 zC = p + vec2(0.015, 0.0);
            vec2 zM = p + vec2(-0.007, 0.013);
            vec2 zY = p + vec2(-0.007, -0.013);

            // Orbit traps for structure extraction
            float trapC = 1e5;
            float trapM = 1e5;
            float trapY = 1e5;

            // ✦ FRACTAL LITHOGENESIS LOOP ✦
            // Combining Mandelbox spatial folding with Celtic (absolute) squaring
            // Creates a dense, quasi-periodic, kintsugi-fractured lattice
            for(int i = 0; i < 15; i++) {
                // Fold space
                boxFold(zC); sphereFold(zC);
                boxFold(zM); sphereFold(zM);
                boxFold(zY); sphereFold(zY);

                // Celtic fold (anisotropic stress / broken symmetry)
                zC = vec2(abs(zC.x*zC.x - zC.y*zC.y), 2.0*zC.x*zC.y) + c;
                zM = vec2(abs(zM.x*zM.x - zM.y*zM.y), 2.0*zM.x*zM.y) + c;
                zY = vec2(abs(zY.x*zY.x - zY.y*zY.y), 2.0*zY.x*zY.y) + c;

                // Swarm/Curl local rotation
                float angle = length(zC) * 0.2 + t_med;
                mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
                zC *= rot; zM *= rot; zY *= rot;

                // Capture structural veins (X-axis, Y-axis, and Radial nodes)
                trapC = min(trapC, abs(zC.x));
                trapM = min(trapM, abs(zM.y));
                trapY = min(trapY, length(zY - vec2(0.5)));
            }

            // ✦ STRUCTURAL COLOR FROM DISORDER ✦
            // High-frequency interference banding mapped to the traps
            float intC = pow(abs(sin(trapC * 35.0 - t_fast)), 6.0);
            float intM = pow(abs(sin(trapM * 45.0 + t_fast * 1.1)), 6.0);
            float intY = pow(abs(sin(trapY * 55.0 - t_fast * 0.9)), 6.0);

            // ✦ KINTSUGI CAUSTICS ✦
            // White-hot concentration at the absolute center of the fractures
            float causticC = exp(-trapC * 14.0);
            float causticM = exp(-trapM * 14.0);
            float causticY = exp(-trapY * 14.0);

            // ✦ COMPOSITING THE MATERIAL ✦
            vec3 col = vec3(0.0);
            
            // Neon CMY injection
            col += vec3(0.0, 1.0, 1.0) * (intC * 0.35 + causticC * 0.9); // Cyan veins
            col += vec3(1.0, 0.0, 1.0) * (intM * 0.35 + causticM * 0.9); // Magenta strata
            col += vec3(1.0, 1.0, 0.0) * (intY * 0.35 + causticY * 0.9); // Yellow nodes

            // ✦ ENTROPIC SHINE / QUANTUM DUST ✦
            // High-frequency granular noise multiplying the active light regions
            float dust = hash21(vUv * 900.0 + t_fast);
            col += col * dust * 0.4;

            // Subsurface ambient haze (leaking buried shine)
            col += vec3(0.0, 0.15, 0.15) * exp(-trapC * 2.5);
            col += vec3(0.15, 0.0, 0.15) * exp(-trapM * 2.5);
            col += vec3(0.15, 0.15, 0.0) * exp(-trapY * 2.5);

            // ✦ VOID BLACK ENVELOPE ✦
            // Falloff mimicking light attenuation in an abyssal medium
            col *= exp(-r2 * 1.2);

            // Perceptual compression / contrast
            col = smoothstep(0.0, 1.2, col);
            col = pow(col, vec3(1.15));

            fragColor = vec4(col, 1.0);
        }
      `
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);
    
    canvas.__three = { renderer, scene, camera, material };
  } catch (e) {
    console.error("WebGL Initialization Failed:", e);
    return;
  }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material && material.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);