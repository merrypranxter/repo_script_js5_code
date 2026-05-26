// Lenia Velvet Damask
// A living, breathing damask fabric woven from cellular automata.
// Uses a multi-scale Turing pattern (Gray-Scott) mapped to anisotropic velvet lighting.

if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Use HalfFloat for stable simulation without requiring float extensions
    const fboOpts = {
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false
    };

    const simSize = 512;
    let simFboA = new THREE.WebGLRenderTarget(simSize, simSize, fboOpts);
    let simFboB = new THREE.WebGLRenderTarget(simSize, simSize, fboOpts);
    
    let napFboA = new THREE.WebGLRenderTarget(simSize, simSize, fboOpts);
    let napFboB = new THREE.WebGLRenderTarget(simSize, simSize, fboOpts);

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    scene.add(quad);

    // ─── SIMULATION SHADER (Living Cellular Damask) ───
    const simMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_sim: { value: null },
        u_res: { value: new THREE.Vector2(simSize, simSize) },
        u_time: { value: 0 },
        u_mouse: { value: new THREE.Vector4(0, 0, 0, 0) }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        in vec2 vUv;
        out vec4 fragColor;
        uniform sampler2D u_sim;
        uniform vec2 u_res;
        uniform float u_time;
        uniform vec4 u_mouse;

        void main() {
          // Initialization seed
          if (u_time < 0.1) {
            float seed = step(0.98, fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453));
            fragColor = vec4(1.0, seed, 0.0, 1.0);
            return;
          }

          vec2 step = 1.0 / u_res;
          vec4 center = texture(u_sim, vUv);
          float u = center.r;
          float v = center.g;

          // 5-point Laplacian
          float lapU = texture(u_sim, fract(vUv + vec2(step.x, 0.0))).r +
                       texture(u_sim, fract(vUv - vec2(step.x, 0.0))).r +
                       texture(u_sim, fract(vUv + vec2(0.0, step.y))).r +
                       texture(u_sim, fract(vUv - vec2(0.0, step.y))).r - 4.0 * u;

          float lapV = texture(u_sim, fract(vUv + vec2(step.x, 0.0))).g +
                       texture(u_sim, fract(vUv - vec2(step.x, 0.0))).g +
                       texture(u_sim, fract(vUv + vec2(0.0, step.y))).g +
                       texture(u_sim, fract(vUv - vec2(0.0, step.y))).g - 4.0 * v;

          // Damask Spatial Pattern (Medallions and Vines)
          float fx = sin(vUv.x * 3.14159 * 4.0);
          float fy = cos(vUv.y * 3.14159 * 4.0);
          float pattern = (fx * fy) * 0.5 + 0.5;

          // Breathing fabric
          float breath = sin(u_time * 0.2) * 0.5 + 0.5;
          
          // Map pattern to Gray-Scott parameters to force ornamental growth
          float F = mix(0.022, 0.032, pattern + breath * 0.05);
          float k = mix(0.051, 0.059, pattern);

          float uvv = u * v * v;
          float du = 0.16 * lapU - uvv + F * (1.0 - u);
          float dv = 0.08 * lapV + uvv - (F + k) * v;

          u = clamp(u + du * 1.2, 0.0, 1.0);
          v = clamp(v + dv * 1.2, 0.0, 1.0);

          // Mouse interaction (draws cells)
          if (u_mouse.z > 0.5) {
            float dist = distance(vUv, u_mouse.xy);
            if (dist < 0.02) {
              v = 1.0;
            }
          }

          fragColor = vec4(u, v, 0.0, 1.0);
        }
      `
    });

    // ─── NAP SHADER (Velvet Brushing) ───
    const napMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_nap: { value: null },
        u_mouse: { value: new THREE.Vector4(0, 0, 0, 0) }, // x, y, vx, vy
        u_time: { value: 0 }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        in vec2 vUv;
        out vec4 fragColor;
        uniform sampler2D u_nap;
        uniform vec4 u_mouse;
        uniform float u_time;

        void main() {
          vec2 nap = vec2(0.0);
          if (u_time > 0.1) {
            nap = texture(u_nap, vUv).xy;
          }

          // Default velvet nap direction
          vec2 defaultNap = normalize(vec2(1.0, -1.0));
          nap = mix(nap, defaultNap, 0.002); // very slow recovery

          // Brush velvet with mouse
          float dist = distance(vUv, u_mouse.xy);
          float speed = length(u_mouse.zw);
          if (dist < 0.08 && speed > 0.0) {
            vec2 brushDir = normalize(u_mouse.zw);
            float influence = (1.0 - dist / 0.08) * clamp(speed * 50.0, 0.0, 1.0);
            nap = mix(nap, brushDir, influence * 0.2);
          }

          fragColor = vec4(normalize(nap), 0.0, 1.0);
        }
      `
    });

    // ─── RENDER SHADER (Opulent Velvet + Sparkles) ───
    const renderMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_sim: { value: null },
        u_nap: { value: null },
        u_res: { value: new THREE.Vector2(grid.width, grid.height) },
        u_time: { value: 0 }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        in vec2 vUv;
        out vec4 fragColor;
        uniform sampler2D u_sim;
        uniform sampler2D u_nap;
        uniform vec2 u_res;
        uniform float u_time;

        // Tile and mirror for Damask symmetry
        vec2 tile(vec2 uv, float zoom) {
          uv *= zoom;
          return abs(fract(uv * 0.5) * 2.0 - 1.0);
        }

        vec3 getNormal(vec2 uv) {
          vec2 eps = vec2(1.0 / 512.0, 0.0);
          float hC = texture(u_sim, uv).g;
          float hR = texture(u_sim, fract(uv + eps.xy)).g;
          float hU = texture(u_sim, fract(uv + eps.yx)).g;
          return normalize(vec3(hC - hR, hC - hU, 0.04));
        }

        void main() {
          // Kaleidoscope fold for the damask ornament
          vec2 damaskUv = tile(vUv, 2.5);

          vec4 sim = texture(u_sim, damaskUv);
          float u = sim.r;
          float v = sim.g; // The organism body

          // Nap direction from brushing
          vec2 nap2D = texture(u_nap, vUv).xy;
          vec3 nap = normalize(vec3(nap2D, 0.3));

          vec3 N = getNormal(damaskUv);
          vec3 V = vec3(0.0, 0.0, 1.0);

          // Moving point light
          vec3 L = normalize(vec3(cos(u_time * 0.3), sin(u_time * 0.3), 0.6));
          vec3 H = normalize(L + V);

          // Anisotropic Velvet Shading
          vec3 shiftedN = normalize(N + nap * 0.7);
          float NdotL = max(dot(shiftedN, L), 0.0);
          float VdotN = max(dot(N, V), 0.0);

          // Velvet specular peak is perpendicular to nap
          float specBase = max(0.0, sin(dot(shiftedN, H) * 3.1415));
          float velvetSpec = pow(specBase, 5.0) * 1.8;

          // Grazing rim light
          float rim = pow(1.0 - VdotN, 2.5);

          // Sparkle Dust (High frequency noise masked by light and nap)
          float hashVal = fract(sin(dot(vUv, vec2(127.1, 311.7))) * 43758.5453);
          float sparkle = step(0.96, hashVal) * pow(NdotL, 2.0) * rim * 4.0;

          // Palettes
          vec3 colorVelvetDark = vec3(0.05, 0.0, 0.15);  // Deep UV
          vec3 colorVelvetLit  = vec3(0.35, 0.0, 0.55);  // Rich Purple
          vec3 colorMotif      = vec3(1.0, 0.0, 0.5);    // Hot Magenta
          vec3 colorAccent     = vec3(1.0, 0.6, 0.0);    // Orange/Yellow growth
          vec3 colorHalo       = vec3(0.0, 1.0, 1.0);    // Cyan biological membrane

          // Compose Velvet Base
          vec3 baseColor = mix(colorVelvetDark, colorVelvetLit, NdotL);
          baseColor += colorVelvetLit * velvetSpec;
          baseColor += colorHalo * rim * 0.2;

          // Masks from simulation
          float motifMask = smoothstep(0.15, 0.35, v);
          float haloMask = smoothstep(0.4, 0.7, 1.0 - u) * (1.0 - motifMask);
          float coreMask = smoothstep(0.65, 0.9, v);

          // Raised Motif Surface
          vec3 motifSurface = mix(colorMotif * 0.3, colorMotif, NdotL);
          float motifSpec = pow(max(dot(reflect(-L, N), V), 0.0), 24.0);
          motifSurface += motifSpec * vec3(1.0, 0.8, 0.9); // Wet/Glossy highlight

          // Blend layers
          vec3 finalColor = baseColor;
          finalColor = mix(finalColor, motifSurface, motifMask);
          finalColor += colorHalo * haloMask * 0.9; // Cyan glow
          finalColor = mix(finalColor, colorAccent, coreMask); // Orange cores

          // Add sparkle dust only in the deep velvet pile (not on the raised motifs)
          finalColor += vec3(0.8, 1.0, 1.0) * sparkle * (1.0 - motifMask);

          fragColor = vec4(finalColor, 1.0);
        }
      `
    });

    canvas.__three = {
      renderer, scene, camera, quad,
      simMat, napMat, renderMat,
      simFboA, simFboB, napFboA, napFboB,
      lastMouse: { x: 0, y: 0 }
    };
  } catch (e) {
    console.error("WebGL Initialization Failed:", e);
    return;
  }
}

const state = canvas.__three;
if (!state) return;

const { renderer, scene, camera, quad, simMat, napMat, renderMat } = state;
let { simFboA, simFboB, napFboA, napFboB } = state;

// Update mouse state and velocity
let mx = mouse.x / grid.width;
let my = 1.0 - (mouse.y / grid.height);
let vx = mx - state.lastMouse.x;
let vy = my - state.lastMouse.y;
state.lastMouse = { x: mx, y: my };

// 1. Update Nap (Velvet Brushing)
renderer.setRenderTarget(napFboB);
quad.material = napMat;
napMat.uniforms.u_nap.value = napFboA.texture;
napMat.uniforms.u_mouse.value.set(mx, my, vx, vy);
napMat.uniforms.u_time.value = time;
renderer.render(scene, camera);
[napFboA, napFboB] = [napFboB, napFboA];
state.napFboA = napFboA;
state.napFboB = napFboB;

// 2. Update Simulation (Living Damask)
// Run multiple steps per frame to make the cellular automaton breathe visibly
const simSteps = 4;
quad.material = simMat;
for (let i = 0; i < simSteps; i++) {
  renderer.setRenderTarget(simFboB);
  simMat.uniforms.u_sim.value = simFboA.texture;
  simMat.uniforms.u_time.value = time + (i * 0.01);
  simMat.uniforms.u_mouse.value.set(mx, my, mouse.isPressed ? 1.0 : 0.0, 0.0);
  renderer.render(scene, camera);
  [simFboA, simFboB] = [simFboB, simFboA];
}
state.simFboA = simFboA;
state.simFboB = simFboB;

// 3. Render Final Damask Velvet
renderer.setRenderTarget(null);
renderer.setSize(grid.width, grid.height, false);
quad.material = renderMat;
renderMat.uniforms.u_sim.value = simFboA.texture;
renderMat.uniforms.u_nap.value = napFboA.texture;
renderMat.uniforms.u_time.value = time;
renderMat.uniforms.u_res.value.set(grid.width, grid.height);
renderer.render(scene, camera);