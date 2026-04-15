if (!canvas.__three) {
  try {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) throw new Error("WebGL2 required for Feral CA Feedback");

    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
    renderer.autoClear = false;

    const sceneUpdate = new THREE.Scene();
    const sceneDisplay = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const rtOpts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping
    };

    const fboW = Math.floor(grid.width / 2);
    const fboH = Math.floor(grid.height / 2);

    const fboA = new THREE.WebGLRenderTarget(fboW, fboH, rtOpts);
    const fboB = new THREE.WebGLRenderTarget(fboW, fboH, rtOpts);

    const updateMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_state: { value: null },
        u_res: { value: new THREE.Vector2(fboW, fboH) },
        u_time: { value: 0 },
        u_mouse: { value: new THREE.Vector2() },
        u_mouse_pressed: { value: 0 }
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
        uniform sampler2D u_state;
        uniform vec2 u_res;
        uniform float u_time;
        uniform vec2 u_mouse;
        uniform float u_mouse_pressed;
        out vec4 fragColor;

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m ; m = m*m ;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        vec2 kaleidoscope(vec2 uv, float folds) {
          vec2 p = uv - 0.5;
          float r = length(p);
          float a = atan(p.y, p.x);
          float sector = 6.2831853 / folds;
          a = mod(a, sector);
          if(a > sector/2.0) a = sector - a;
          a += snoise(uv * 1.5 + u_time * 0.1) * 0.15;
          return vec2(cos(a), sin(a)) * r + 0.5;
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / u_res;

          vec2 k_uv = kaleidoscope(uv, 8.0);

          float n1 = snoise(k_uv * 3.0 + u_time * 0.2);
          float n2 = snoise(k_uv * 3.0 - u_time * 0.2 + 100.0);
          vec2 d_uv = k_uv + vec2(n1, n2) * 0.008;

          d_uv = (d_uv - 0.5) * 0.98 + 0.5;

          float r = texture(u_state, fract(d_uv + vec2(0.003, 0.0))).r;
          float g = texture(u_state, fract(d_uv)).g;
          float b = texture(u_state, fract(d_uv - vec2(0.003, 0.0))).b;
          vec3 state = vec3(r, g, b);

          float sumR = 0.0;
          vec2 texel = 1.0 / u_res;
          for(int y=-1; y<=1; y++){
            for(int x=-1; x<=1; x++){
              if(x==0 && y==0) continue;
              float val = texture(u_state, fract(d_uv + vec2(float(x),float(y))*texel)).r;
              sumR += val > 0.5 ? 1.0 : 0.0;
            }
          }
          
          float aliveR = state.r > 0.5 ? 1.0 : 0.0;
          if (aliveR == 1.0) {
            if (sumR < 2.0 || sumR > 3.0) aliveR = 0.0;
          } else {
            if (sumR == 3.0) aliveR = 1.0;
          }
          
          state.r = mix(state.r, aliveR, 0.15);
          state.g = mix(state.g, fract(state.g + state.r * 0.1), 0.5);
          state.b = mix(state.b, fract(state.b + state.g * 0.1), 0.5);

          state *= 0.97;

          vec2 target_pos = u_mouse_pressed > 0.5 ? u_mouse : vec2(0.5 + 0.4*sin(u_time*0.8), 0.5 + 0.4*cos(u_time*1.2)) * u_res;
          float dist = length(gl_FragCoord.xy - target_pos);
          if (dist < 25.0) {
            float intensity = 1.0 - (dist / 25.0);
            vec3 brush = vec3(
              0.5 + 0.5 * sin(u_time * 8.0),
              0.5 + 0.5 * sin(u_time * 9.0 + 2.0),
              0.5 + 0.5 * sin(u_time * 10.0 + 4.0)
            );
            state = mix(state, brush, intensity * 0.8);
          } else if (u_time < 0.5) {
            if (length(uv - 0.5) < 0.2 && fract(sin(dot(uv, vec2(12.9898,78.233))) * 43758.5453) > 0.8) {
              state = vec3(1.0, 0.5, 0.0);
            }
          }

          fragColor = vec4(state, 1.0);
        }
      `
    });

    const displayMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_tex: { value: null },
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
        precision highp float;
        uniform sampler2D u_tex;
        uniform vec2 u_res;
        uniform float u_time;
        out vec4 fragColor;

        float halftone(vec2 fragCoord, float freq, float angle, float luma) {
          float rad = radians(angle);
          mat2 rot = mat2(cos(rad), -sin(rad), sin(rad), cos(rad));
          vec2 uv = rot * fragCoord * freq / 1024.0;
          vec2 cell = fract(uv) - 0.5;
          float dist = length(cell);
          float dotRadius = sqrt(1.0 - luma) * 0.5;
          return smoothstep(dotRadius + 0.05, dotRadius - 0.05, dist);
        }

        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

        void main() {
          vec2 uv = gl_FragCoord.xy / u_res;
          
          float r = texture(u_tex, uv + vec2(0.006, 0.003)).r;
          float g = texture(u_tex, uv).g;
          float b = texture(u_tex, uv - vec2(0.005, -0.004)).b;
          vec3 col = vec3(r, g, b);

          vec3 magenta = vec3(1.0, 0.0, 0.78);
          vec3 yellow  = vec3(1.0, 0.9, 0.0);
          vec3 cyan    = vec3(0.0, 1.0, 0.93);
          vec3 black   = vec3(0.04, 0.02, 0.06);
          
          vec3 mapped = black;
          mapped = mix(mapped, magenta, col.r);
          mapped = mix(mapped, yellow, col.g);
          mapped = mix(mapped, cyan, col.b);
          mapped += col.r * col.g * vec3(1.0, 0.4, 0.0);

          float luma = dot(mapped, vec3(0.299, 0.587, 0.114));
          float ht = halftone(gl_FragCoord.xy, 120.0, 45.0, luma);
          
          vec3 print_col = mix(mapped * 0.15, mapped, ht * 0.8 + 0.2);

          float grain = hash(uv + u_time);
          print_col += (grain - 0.5) * 0.15;

          float dist = length(uv - 0.5);
          print_col *= smoothstep(0.9, 0.2, dist);

          fragColor = vec4(print_col, 1.0);
        }
      `
    });

    const geo = new THREE.PlaneGeometry(2, 2);
    sceneUpdate.add(new THREE.Mesh(geo, updateMat));
    sceneDisplay.add(new THREE.Mesh(geo, displayMat));

    canvas.__three = { renderer, sceneUpdate, sceneDisplay, camera, updateMat, displayMat, fboA, fboB, ping: 0, fboW, fboH };
  } catch (e) {
    console.error("WebGL Initialization Failed:", e);
    return;
  }
}

const cache = canvas.__three;
if (!cache) return;

const { renderer, sceneUpdate, sceneDisplay, camera, updateMat, displayMat, fboA, fboB, fboW, fboH } = cache;
let ping = cache.ping;

if (updateMat?.uniforms) {
  updateMat.uniforms.u_time.value = time;
  updateMat.uniforms.u_mouse.value.set(
    (mouse.x / grid.width) * fboW,
    ((grid.height - mouse.y) / grid.height) * fboH
  );
  updateMat.uniforms.u_mouse_pressed.value = mouse.isPressed ? 1.0 : 0.0;
  updateMat.uniforms.u_state.value = ping === 0 ? fboA.texture : fboB.texture;
}

const nextFbo = ping === 0 ? fboB : fboA;

renderer.setSize(fboW, fboH, false);
renderer.setRenderTarget(nextFbo);
renderer.render(sceneUpdate, camera);

if (displayMat?.uniforms) {
  displayMat.uniforms.u_time.value = time;
  displayMat.uniforms.u_res.value.set(grid.width, grid.height);
  displayMat.uniforms.u_tex.value = nextFbo.texture;
}

renderer.setSize(grid.width, grid.height, false);
renderer.setRenderTarget(null);
renderer.render(sceneDisplay, camera);

cache.ping = 1 - ping;