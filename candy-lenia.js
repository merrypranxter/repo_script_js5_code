if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({
      canvas,
      context: ctx,
      alpha: true,
      antialias: false
    });
    renderer.setPixelRatio(1);

    const size = 512;
    const rtOpts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false
    };

    const fboA = new THREE.WebGLRenderTarget(size, size, rtOpts);
    const fboB = new THREE.WebGLRenderTarget(size, size, rtOpts);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const simMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_state: { value: null },
        u_res: { value: new THREE.Vector2(size, size) },
        u_time: { value: 0 },
        u_dt: { value: 0.12 },
        u_mouse: { value: new THREE.Vector3(0, 0, 0) }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D u_state;
        uniform vec2 u_res;
        uniform float u_time;
        uniform float u_dt;
        uniform vec3 u_mouse;
        
        in vec2 vUv;
        out vec4 fragColor;
        
        void main() {
          vec2 uv = vUv;
          
          vec3 sum = vec3(0.0);
          float wsum = 0.0;
          const int NR = 5;
          const int NA = 12;
          
          // Slime-mold / cymatic domain warp
          float cymatic = sin(length(uv - 0.5) * 50.0 - u_time * 2.0) * 0.1;
          float warp = sin(uv.x * 15.0 + u_time * 0.5) * cos(uv.y * 15.0 - u_time * 0.5) * 0.5 + cymatic;
          mat2 rot = mat2(cos(warp), -sin(warp), sin(warp), cos(warp));
          
          for(int ri = 1; ri <= NR; ri++) {
            float r = float(ri) / float(NR);
            float kw = exp(-pow(r - 0.5, 2.0) / 0.04) * r;
            
            for(int ai = 0; ai < NA; ai++) {
              float a = float(ai) / float(NA) * 6.2831853;
              vec2 dir = vec2(cos(a), sin(a));
              dir *= rot;
              
              vec2 offset = dir * r * 16.0 / u_res;
              vec3 s = texture(u_state, fract(uv + offset)).rgb;
              sum += s * kw;
              wsum += kw;
            }
          }
          vec3 U = sum / wsum;
          
          // Op-art pressure field modifying preferred growth zones
          float qc = sin(uv.x * 30.0 + u_time) + sin(uv.y * 30.0 - u_time) + sin((uv.x + uv.y) * 20.0);
          float pressure = sin(uv.x * 40.0) * sin(uv.y * 40.0) * 0.01 + qc * 0.005;
          
          vec3 mu = vec3(0.15, 0.22, 0.28) + pressure;
          vec3 sig = vec3(0.015, 0.03, 0.05);
          
          // Lenia core growth function
          vec3 G = 2.0 * exp(-pow(U - mu, vec3(2.0)) / (2.0 * sig * sig)) - 1.0;
          
          vec4 state = texture(u_state, uv);
          
          // Cross-channel predator-prey ecology
          float dr = G.r * 1.0 - 0.1 * state.b;
          float dg = G.g * 0.5 + 0.5 * state.r - 0.2 * state.b;
          float db = G.b * 0.5 + 0.3 * state.g;
          
          state.r = clamp(state.r + u_dt * dr, 0.0, 1.0);
          state.g = clamp(state.g + u_dt * dg, 0.0, 1.0);
          state.b = clamp(state.b + u_dt * db, 0.0, 1.0);
          
          // Trace / memory channel decay
          state.a = mix(state.a, max(state.r, state.g), 0.05);
          
          // Interaction
          if (u_mouse.z > 0.0) {
            float d = length(uv - u_mouse.xy);
            if (d < 0.03) {
              state.rgb = vec3(1.0, 0.8, 0.2);
            }
          }
          
          // Spontaneous generation & init
          float seed = fract(sin(dot(uv + u_time, vec2(12.9898, 78.233))) * 43758.5453);
          if (u_time < 0.2) {
            state = vec4(seed > 0.8 ? 1.0 : 0.0, seed > 0.9 ? 1.0 : 0.0, 0.0, 0.0);
          } else if (seed > 0.9995) {
            state.rgb += vec3(0.5);
            state.rgb = clamp(state.rgb, 0.0, 1.0);
          }
          
          fragColor = state;
        }
      `
    });

    const displayMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_state: { value: null },
        u_res: { value: new THREE.Vector2(size, size) },
        u_time: { value: 0 }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D u_state;
        uniform vec2 u_res;
        uniform float u_time;
        
        in vec2 vUv;
        out vec4 fragColor;
        
        void main() {
          vec2 uv = vUv;
          vec4 state = texture(u_state, uv);
          
          // Normal mapping from density for refractive shimmer
          vec2 eps = vec2(1.0 / u_res.x, 1.0 / u_res.y);
          float dx = texture(u_state, fract(uv + vec2(eps.x, 0.0))).r - texture(u_state, fract(uv - vec2(eps.x, 0.0))).r;
          float dy = texture(u_state, fract(uv + vec2(0.0, eps.y))).r - texture(u_state, fract(uv - vec2(0.0, eps.y))).r;
          vec3 normal = normalize(vec3(dx, dy, 0.08));
          
          // Chromatic shift vectors
          vec2 shift = normal.xy * 0.008;
          float r_edge = texture(u_state, fract(uv + shift)).r;
          float b_edge = texture(u_state, fract(uv - shift)).r;
          
          // Candy cream base
          vec3 bg = vec3(0.96, 0.98, 1.0);
          float n = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
          bg -= n * 0.04;
          
          vec3 col = bg;
          
          // Map Lenia channels to maximalist palette
          col = mix(col, vec3(0.2, 0.0, 0.5), state.b * 0.8); // Violet inhibition shadow
          col = mix(col, vec3(1.0, 0.4, 0.0), state.a * 0.7); // Orange memory trace
          col = mix(col, vec3(0.0, 0.9, 0.8), state.g);       // Cyan excitation wave
          col = mix(col, vec3(1.0, 0.1, 0.6), state.r);       // Hot pink organism body
          
          // Refractive shimmer
          float shimmer = pow(max(dot(normal, normalize(vec3(1.0, 1.0, 1.5))), 0.0), 5.0);
          col += shimmer * vec3(0.9, 1.0, 0.9) * (state.r + state.g);
          
          // Glittery kernel boundaries
          float edge = length(vec2(dx, dy));
          float glitter = step(0.96, fract(sin(dot(uv + u_time, vec2(12.9, 78.2))) * 43758.5)) * edge;
          col += glitter * vec3(1.0, 0.9, 0.3) * 2.5;
          
          // Chromatic aberration smear
          col.r += (r_edge - state.r) * 1.5;
          col.b += (b_edge - state.r) * 1.5;
          
          // Vignette
          vec2 d = uv - 0.5;
          col *= 1.0 - dot(d, d) * 0.6;
          
          fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
      `
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, mesh, simMaterial, displayMaterial, fboA, fboB, ping: 0 };
  } catch (e) {
    console.error("WebGL Initialization Failed:", e);
    return;
  }
}

const t = canvas.__three;
if (!t) return;

const { renderer, scene, camera, mesh, simMaterial, displayMaterial, fboA, fboB } = t;

if (simMaterial?.uniforms) {
  simMaterial.uniforms.u_time.value = time;
  const mx = mouse.x / grid.width;
  const my = 1.0 - (mouse.y / grid.height);
  simMaterial.uniforms.u_mouse.value.set(mx, my, mouse.isPressed ? 1.0 : 0.0);
}

const sourceFBO = t.ping === 0 ? fboA : fboB;
const destFBO = t.ping === 0 ? fboB : fboA;

// 1. Simulation Pass
mesh.material = simMaterial;
if (simMaterial?.uniforms) {
  simMaterial.uniforms.u_state.value = sourceFBO.texture;
}
renderer.setRenderTarget(destFBO);
renderer.render(scene, camera);

// 2. Display Pass
mesh.material = displayMaterial;
if (displayMaterial?.uniforms) {
  displayMaterial.uniforms.u_state.value = destFBO.texture;
  displayMaterial.uniforms.u_time.value = time;
}
renderer.setRenderTarget(null);
renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);

t.ping = 1 - t.ping;