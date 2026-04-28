if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
    renderer.autoClear = false;

    const simSize = 512;
    const rtOpts = {
      width: simSize,
      height: simSize,
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      depthBuffer: false,
      stencilBuffer: false
    };

    const rtA = new THREE.WebGLRenderTarget(simSize, simSize, rtOpts);
    const rtB = new THREE.WebGLRenderTarget(simSize, simSize, rtOpts);

    const data = new Float32Array(simSize * simSize * 4);
    for (let i = 0; i < simSize * simSize; i++) {
      data[i * 4] = 1.0; // U
      
      const x = i % simSize;
      const y = Math.floor(i / simSize);
      const cx = x - simSize / 2;
      const cy = y - simSize / 2;
      const dist = Math.sqrt(cx * cx + cy * cy);
      
      let v = 0.0;
      // Central seed
      if (dist < 30) v = 1.0;
      // Ring of seeds
      if (Math.abs(dist - 100) < 5) v = 0.5;
      // Scattered noise seeds
      if (Math.random() < 0.01) v = Math.random();
      
      data[i * 4 + 1] = v; // V
      data[i * 4 + 2] = 0.0;
      data[i * 4 + 3] = 1.0;
    }
    const initTex = new THREE.DataTexture(data, simSize, simSize, THREE.RGBAFormat, THREE.FloatType);
    initTex.needsUpdate = true;

    const simMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_state: { value: null },
        u_res: { value: new THREE.Vector2(simSize, simSize) },
        u_time: { value: 0 },
        u_mouse: { value: new THREE.Vector2() },
        u_isPressed: { value: false },
        u_aspect: { value: 1.0 }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D u_state;
        uniform vec2 u_res;
        uniform float u_time;
        uniform vec2 u_mouse;
        uniform bool u_isPressed;
        uniform float u_aspect;

        in vec2 vUv;
        out vec4 fragColor;

        vec2 laplacian(sampler2D tex, vec2 uv, vec2 texel) {
          vec2 sum = vec2(0.0);
          // 9-point stencil
          sum += texture(tex, uv + vec2(-1.0, 0.0) * texel).rg * 0.2;
          sum += texture(tex, uv + vec2( 1.0, 0.0) * texel).rg * 0.2;
          sum += texture(tex, uv + vec2( 0.0, -1.0) * texel).rg * 0.2;
          sum += texture(tex, uv + vec2( 0.0,  1.0) * texel).rg * 0.2;
          sum += texture(tex, uv + vec2(-1.0, -1.0) * texel).rg * 0.05;
          sum += texture(tex, uv + vec2( 1.0, -1.0) * texel).rg * 0.05;
          sum += texture(tex, uv + vec2(-1.0,  1.0) * texel).rg * 0.05;
          sum += texture(tex, uv + vec2( 1.0,  1.0) * texel).rg * 0.05;
          sum -= texture(tex, uv).rg;
          return sum;
        }

        void main() {
          vec2 texel = 1.0 / u_res;
          vec2 state = texture(u_state, vUv).rg;
          
          float u = state.r;
          float v = state.g;
          
          vec2 lap = laplacian(u_state, vUv, texel);
          float reaction = u * v * v;
          
          vec2 p = vUv * 2.0 - 1.0;
          float radius = length(p);
          float angle = atan(p.y, p.x);
          
          // Kaleidoscope domain warping for parameters
          float folds = 8.0;
          float sector = 6.28318 / folds;
          float modAngle = mod(angle, sector);
          if (modAngle > sector * 0.5) modAngle = sector - modAngle;
          vec2 kalUv = vec2(cos(modAngle), sin(modAngle)) * radius;
          
          // Spatial parameter mapping crossing Turing Spots and U-Skate World
          float F = 0.025 + 0.04 * (sin(kalUv.x * 5.0 + u_time * 0.2) * 0.5 + 0.5);
          float k = 0.05 + 0.015 * (cos(kalUv.y * 5.0 - u_time * 0.15) * 0.5 + 0.5);
          
          float du = 1.0 * lap.r - reaction + F * (1.0 - u);
          float dv = 0.5 * lap.g + reaction - (F + k) * v;
          
          float newU = u + du;
          float newV = v + dv;
          
          // Mouse injection
          if (u_isPressed) {
            vec2 uvAspect = vUv;
            uvAspect.x *= u_aspect;
            vec2 mouseAspect = u_mouse;
            mouseAspect.x *= u_aspect;
            float d = distance(uvAspect, mouseAspect);
            if (d < 0.05) {
              newV += 0.5;
              newU -= 0.5;
            }
          }
          
          fragColor = vec4(clamp(newU, 0.0, 1.0), clamp(newV, 0.0, 1.0), 0.0, 1.0);
        }
      `
    });

    const displayMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_state: { value: null },
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
        uniform sampler2D u_state;
        uniform float u_time;
        in vec2 vUv;
        out vec4 fragColor;

        void main() {
          vec2 state = texture(u_state, vUv).rg;
          float u = state.r;
          float v = state.g;

          vec2 dir = normalize(vUv - 0.5);
          float dist = length(vUv - 0.5);
          
          // Chromatic aberration sample
          vec2 stateR = texture(u_state, vUv + dir * 0.008 * v).rg;
          vec2 stateB = texture(u_state, vUv - dir * 0.008 * v).rg;
          float vR = stateR.g;
          float vB = stateB.g;

          // Acid Vibration Palette
          vec3 acidLime = vec3(0.66, 1.0, 0.0);
          vec3 hotMagenta = vec3(1.0, 0.0, 0.78);
          vec3 cyanShock = vec3(0.0, 1.0, 0.93);
          vec3 electricOrange = vec3(1.0, 0.42, 0.0);
          vec3 deepViolet = vec3(0.36, 0.0, 1.0);

          vec3 finalCol = mix(deepViolet, hotMagenta, smoothstep(0.0, 0.2, v));
          finalCol = mix(finalCol, electricOrange, smoothstep(0.2, 0.4, v));
          finalCol = mix(finalCol, acidLime, smoothstep(0.4, 0.6, v));
          finalCol = mix(finalCol, cyanShock, smoothstep(0.6, 0.8, v));

          finalCol = mix(finalCol, hotMagenta, smoothstep(0.7, 1.0, u) * 0.5);

          // Apply chromatic aberration glow
          finalCol.r += vR * 0.8;
          finalCol.b += vB * 0.8;

          // Ensure no pure black or white
          finalCol = clamp(finalCol, 0.1, 0.9);
          finalCol = max(finalCol, deepViolet * 0.7); // Darkest tone is deep violet

          // Structural color interference wave
          float thickness = u * 500.0 + v * 200.0;
          vec3 iridescence = 0.5 + 0.5 * cos(6.28318 * (thickness / vec3(400.0, 500.0, 600.0) + u_time * 0.5));
          finalCol = mix(finalCol, iridescence, 0.15);

          // Vignette
          finalCol = mix(finalCol, deepViolet, smoothstep(0.5, 1.0, dist) * 0.6);

          fragColor = vec4(finalCol, 1.0);
        }
      `
    });

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const sceneSim = new THREE.Scene();
    const sceneDisplay = new THREE.Scene();

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));

    const meshSim = new THREE.Mesh(plane.geometry, simMaterial);
    sceneSim.add(meshSim);

    const meshDisplay = new THREE.Mesh(plane.geometry, displayMaterial);
    sceneDisplay.add(meshDisplay);

    canvas.__three = {
      renderer,
      camera,
      sceneSim,
      sceneDisplay,
      simMaterial,
      displayMaterial,
      rtA,
      rtB,
      initTex,
      stepsPerFrame: 24,
      pingpong: 0,
      initialized: false
    };
  } catch (e) {
    console.error("WebGL Init failed:", e);
    return;
  }
}

const sys = canvas.__three;
if (!sys) return;

if (sys.simMaterial?.uniforms?.u_time) {
  sys.simMaterial.uniforms.u_time.value = time;
}
if (sys.displayMaterial?.uniforms?.u_time) {
  sys.displayMaterial.uniforms.u_time.value = time;
}

if (sys.simMaterial?.uniforms?.u_aspect) {
  sys.simMaterial.uniforms.u_aspect.value = grid.width / grid.height;
}

if (sys.simMaterial?.uniforms?.u_mouse) {
  sys.simMaterial.uniforms.u_mouse.value.set(mouse.x / grid.width, 1.0 - mouse.y / grid.height);
  sys.simMaterial.uniforms.u_isPressed.value = mouse.isPressed;
}

for (let i = 0; i < sys.stepsPerFrame; i++) {
  const read = sys.pingpong % 2 === 0 ? sys.rtA : sys.rtB;
  const write = sys.pingpong % 2 === 0 ? sys.rtB : sys.rtA;

  if (!sys.initialized) {
    sys.simMaterial.uniforms.u_state.value = sys.initTex;
    sys.initialized = true;
  } else {
    sys.simMaterial.uniforms.u_state.value = read.texture;
  }

  sys.renderer.setRenderTarget(write);
  sys.renderer.render(sys.sceneSim, sys.camera);

  sys.pingpong++;
}

sys.renderer.setRenderTarget(null);
sys.renderer.setSize(grid.width, grid.height, false);
if (sys.displayMaterial?.uniforms?.u_state) {
  sys.displayMaterial.uniforms.u_state.value = (sys.pingpong % 2 === 0 ? sys.rtA : sys.rtB).texture;
}
sys.renderer.render(sys.sceneDisplay, sys.camera);