if (!canvas.__three) {
  try {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false });
    if (!gl) throw new Error("WebGL2 not supported or context occupied");

    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true });
    renderer.autoClear = false;

    // Ping-pong FBOs for Reaction-Diffusion Cellular Automaton
    const fboParams = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false
    };
    
    const fboA = new THREE.WebGLRenderTarget(grid.width, grid.height, fboParams);
    const fboB = new THREE.WebGLRenderTarget(grid.width, grid.height, fboParams);

    const geometry = new THREE.PlaneGeometry(2, 2);

    // SIMULATION SHADER: Gray-Scott Reaction-Diffusion modulated by a Kaleidoscope
    const simMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_tex: { value: null },
        u_res: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0, 0) },
        u_isPressed: { value: false },
        u_time: { value: 0 },
        u_frame: { value: 0 }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D u_tex;
        uniform vec2 u_res;
        uniform vec2 u_mouse;
        uniform bool u_isPressed;
        uniform float u_time;
        uniform int u_frame;
        
        in vec2 vUv;
        out vec4 fragColor;
        
        // Psychedelic Collage: Kaleidoscope fold
        vec2 kaleidoscope(vec2 p, float folds) {
          vec2 uv = p * 2.0 - 1.0;
          float a = atan(uv.y, uv.x);
          float r = length(uv);
          float s = 6.2831853 / folds;
          a = mod(a, s);
          if (a > s / 2.0) a = s - a;
          a += u_time * 0.05; // Slow continuous rotation
          return vec2(cos(a), sin(a)) * r * 0.5 + 0.5;
        }

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec2 texel = 1.0 / u_res;
          vec4 state = texture(u_tex, vUv);
          float a = state.r;
          float b = state.g;
          
          // 3x3 Laplacian Kernel
          float lapA = -a;
          float lapB = -b;
          
          vec2 offsets[8] = vec2[](
            vec2(-1.0, -1.0), vec2(0.0, -1.0), vec2(1.0, -1.0),
            vec2(-1.0,  0.0),                  vec2(1.0,  0.0),
            vec2(-1.0,  1.0), vec2(0.0,  1.0), vec2(1.0,  1.0)
          );
          
          float weights[8] = float[](
            0.05, 0.2, 0.05,
            0.2,       0.2,
            0.05, 0.2, 0.05
          );
          
          for(int i = 0; i < 8; i++) {
            vec2 nUv = fract(vUv + offsets[i] * texel); // Toroidal wrap
            vec4 nState = texture(u_tex, nUv);
            lapA += nState.r * weights[i];
            lapB += nState.g * weights[i];
          }
          
          // Map kaleidoscope UV to Reaction-Diffusion feed/kill rates
          // Creates a "Sacred Geometry Grid" of mutating leopard spots
          vec2 kUv = kaleidoscope(vUv, 8.0);
          
          float f = mix(0.02, 0.06, kUv.x);
          float k = mix(0.055, 0.065, kUv.y);
          
          float da = 1.0;
          float db = 0.4;
          float abb = a * b * b;
          
          float nextA = a + (da * lapA - abb + f * (1.0 - a));
          float nextB = b + (db * lapB + abb - (k + f) * b);
          
          // Interaction: Inject B chemical
          if (u_isPressed) {
            float dist = length(gl_FragCoord.xy - u_mouse);
            if (dist < 45.0) {
              nextB = 0.9;
            }
          }
          
          // Seed initial noise & central burst
          if (u_frame < 5) {
            nextA = 1.0;
            nextB = (hash(vUv * 50.0) > 0.98) ? 1.0 : 0.0;
            if (length(vUv - 0.5) < 0.1) nextB = 1.0;
          }
          
          fragColor = vec4(clamp(nextA, 0.0, 1.0), clamp(nextB, 0.0, 1.0), 0.0, 1.0);
        }
      `
    });

    // RENDER SHADER: Structural Color, Chromatic Aberration, Lisa Frank Neon, Halftone
    const renderMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_tex: { value: null },
        u_res: { value: new THREE.Vector2(grid.width, grid.height) }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D u_tex;
        uniform vec2 u_res;
        
        in vec2 vUv;
        out vec4 fragColor;
        
        // Structural Color: Thin Film Interference
        vec3 thinFilm(float thickness) {
          float n = 1.56; // Chitin index
          float d = thickness * 900.0; // Map CA state to 0-900nm thickness
          float pathDiff = 2.0 * n * d;
          vec3 phase = vec3(0.0, 0.33, 0.67);
          // Cosine palette interference
          vec3 col = 0.5 + 0.5 * cos(6.2831853 * (pathDiff / vec3(650.0, 510.0, 440.0) + phase));
          return col;
        }

        // Psychedelic Collage: Halftone Print Artifact
        float halftone(vec2 uv, float luma) {
          float freq = 130.0;
          float angle = 0.785398; // 45 degrees
          mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
          vec2 grid = fract(rot * uv * freq) - 0.5;
          float radius = sqrt(1.0 - luma) * 0.5;
          return smoothstep(radius + 0.1, radius - 0.1, length(grid));
        }

        void main() {
          // Psychedelic Collage: Directional Chromatic Aberration on the CA read
          vec2 dir = (vUv - 0.5);
          float dist = length(dir);
          float shift = 0.012 * dist;
          
          float b_r = texture(u_tex, fract(vUv + dir * shift)).g;
          float b_g = texture(u_tex, vUv).g;
          float b_b = texture(u_tex, fract(vUv - dir * shift)).g;
          
          // Map the CA 'B' state to structural color thickness
          vec3 colorR = thinFilm(b_r);
          vec3 colorG = thinFilm(b_g);
          vec3 colorB = thinFilm(b_b);
          
          vec3 baseColor = vec3(colorR.r, colorG.g, colorB.b);
          
          // Lisa Frank Acid Palette
          vec3 neonPink = vec3(1.0, 0.0, 0.8);
          vec3 neonCyan = vec3(0.0, 1.0, 0.94);
          vec3 acidLime = vec3(0.7, 1.0, 0.0);
          
          // Void black background derived from 'A' state
          float a_state = texture(u_tex, vUv).r;
          vec3 bg = mix(vec3(0.02, 0.0, 0.08), vec3(0.08, 0.0, 0.15), a_state);
          
          // Composite the structural color over the void
          vec3 finalColor = mix(bg, baseColor, smoothstep(0.05, 0.3, b_g));
          
          // Cyberdelic Neon Overdrive (Screen Blend)
          finalColor += neonPink * smoothstep(0.4, 0.8, b_g) * 0.9;
          finalColor += neonCyan * smoothstep(0.2, 0.5, b_r) * 0.6;
          finalColor += acidLime * smoothstep(0.6, 0.9, b_b) * 0.4;
          
          // Halftone overlay
          float luma = dot(finalColor, vec3(0.299, 0.587, 0.114));
          float ht = halftone(vUv, luma);
          finalColor *= mix(1.0, ht, 0.35); // Multiply blend halftone
          
          // Vignette burn
          finalColor *= smoothstep(0.85, 0.2, dist);
          
          fragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const simScene = new THREE.Scene();
    simScene.add(new THREE.Mesh(geometry, simMat));

    const renderScene = new THREE.Scene();
    renderScene.add(new THREE.Mesh(geometry, renderMat));

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    canvas.__three = {
      renderer, simScene, renderScene, simMat, renderMat, camera,
      fboA, fboB, ping: true, frameCount: 0
    };
  } catch (e) {
    console.error("WebGL2 Initialization Failed:", e);
    return;
  }
}

const sys = canvas.__three;
if (!sys) return;

const { renderer, simScene, renderScene, simMat, renderMat, camera, fboA, fboB } = sys;

// Handle Resizing
if (fboA.width !== grid.width || fboA.height !== grid.height) {
  renderer.setSize(grid.width, grid.height, false);
  fboA.setSize(grid.width, grid.height);
  fboB.setSize(grid.width, grid.height);
  simMat.uniforms.u_res.value.set(grid.width, grid.height);
  renderMat.uniforms.u_res.value.set(grid.width, grid.height);
}

// Update Uniforms
simMat.uniforms.u_time.value = time;
simMat.uniforms.u_frame.value = sys.frameCount;
simMat.uniforms.u_mouse.value.set(mouse.x, grid.height - mouse.y); // Flip Y for GLSL
simMat.uniforms.u_isPressed.value = mouse.isPressed;

// Multi-step CA processing for fluid growth speed
const steps = 8;
for (let i = 0; i < steps; i++) {
  simMat.uniforms.u_tex.value = sys.ping ? fboA.texture : fboB.texture;
  renderer.setRenderTarget(sys.ping ? fboB : fboA);
  renderer.render(simScene, camera);
  sys.ping = !sys.ping;
}

// Final Render Pass to Screen
renderer.setRenderTarget(null);
renderMat.uniforms.u_tex.value = sys.ping ? fboA.texture : fboB.texture;
renderer.render(renderScene, camera);

sys.frameCount++;