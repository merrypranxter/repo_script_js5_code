if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    renderer.autoClear = false;

    // Simulation resolution (512x512 for optimal 60fps performance + chunky retro aesthetic)
    const SIM_W = 512;
    const SIM_H = 512;

    const rtOpts = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    };

    const fbo = [
      new THREE.WebGLRenderTarget(SIM_W, SIM_H, rtOpts),
      new THREE.WebGLRenderTarget(SIM_W, SIM_H, rtOpts)
    ];

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Seed initial state
    const seed = new Float32Array(SIM_W * SIM_H * 4);
    for (let i = 0; i < SIM_W * SIM_H; i++) {
      let alive = Math.random() < 0.15 ? 1.0 : 0.0;
      seed[i * 4 + 0] = alive;
      seed[i * 4 + 1] = alive;
      seed[i * 4 + 2] = alive;
      seed[i * 4 + 3] = 1.0;
    }
    const seedTex = new THREE.DataTexture(seed, SIM_W, SIM_H, THREE.RGBAFormat, THREE.FloatType);
    seedTex.wrapS = THREE.RepeatWrapping;
    seedTex.wrapT = THREE.RepeatWrapping;
    seedTex.needsUpdate = true;

    // Blit material to initialize FBOs
    const blitMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: { u_tex: { value: seedTex } },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        in vec2 vUv;
        uniform sampler2D u_tex;
        out vec4 fragColor;
        void main() {
          fragColor = texture(u_tex, vUv);
        }
      `
    });

    const initQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMat);
    scene.add(initQuad);
    
    renderer.setRenderTarget(fbo[0]);
    renderer.render(scene, camera);
    renderer.setRenderTarget(fbo[1]);
    renderer.render(scene, camera);

    scene.remove(initQuad);

    // CA Update Material (Conway's Game of Life + Bleeding Ink Trail)
    const updateMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_state: { value: null },
        u_res: { value: new THREE.Vector2(SIM_W, SIM_H) },
        u_screen_res: { value: new THREE.Vector2(grid.width, grid.height) },
        u_time: { value: 0 },
        u_mouse: { value: new THREE.Vector2(0, 0) },
        u_isPressed: { value: 0 }
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
        uniform sampler2D u_state;
        uniform vec2 u_res;
        uniform vec2 u_screen_res;
        uniform float u_time;
        uniform vec2 u_mouse;
        uniform float u_isPressed;
        out vec4 fragColor;

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
            vec2 uv = vUv;
            vec4 state = texture(u_state, uv);
            float alive = state.r;
            float age = state.g;
            float trail = state.b;

            // Moore Neighborhood for Game of Life
            float count = 0.0;
            for(int y = -1; y <= 1; y++){
                for(int x = -1; x <= 1; x++){
                    if(x != 0 || y != 0){
                        vec2 offset = vec2(float(x), float(y)) / u_res;
                        count += texture(u_state, fract(uv + offset)).r;
                    }
                }
            }

            // Blur and outward drift for the neon ink bleed trail
            vec2 driftOffset = normalize(uv - vec2(0.5)) * 0.002;
            float blur_trail = 0.0;
            for(int y = -1; y <= 1; y++){
                for(int x = -1; x <= 1; x++){
                    vec2 offset = vec2(float(x), float(y)) / u_res + driftOffset;
                    blur_trail += texture(u_state, fract(uv + offset)).b;
                }
            }
            blur_trail /= 9.0;

            // Standard Conway's Game of Life rules (B3/S23)
            float next = 0.0;
            if(alive > 0.5) {
                if(count > 1.5 && count < 3.5) next = 1.0;
            } else {
                if(count > 2.5 && count < 3.5) next = 1.0;
            }

            // Chaotic Particle Emitters (to keep the system constantly active)
            vec2 aspect = vec2(u_screen_res.x / u_screen_res.y, 1.0);
            vec2 center1 = vec2(0.5) + vec2(sin(u_time * 0.8), cos(u_time * 0.5)) * 0.3;
            vec2 center2 = vec2(0.5) + vec2(cos(u_time * 0.6), sin(u_time * 0.9)) * 0.3;
            
            float r = hash(uv + u_time);
            if (distance(uv * aspect, center1 * aspect) < 0.04 && r < 0.05) next = 1.0;
            if (distance(uv * aspect, center2 * aspect) < 0.04 && r < 0.05) next = 1.0;
            
            // Mouse Injection
            if (u_isPressed > 0.5) {
                if (distance(uv * aspect, u_mouse * aspect) < 0.08 && r < 0.2) next = 1.0;
            }

            // State packing: R = alive, G = age, B = fading trail
            float next_age = next > 0.5 ? min(age + 0.01, 1.0) : 0.0;
            float next_trail = next > 0.5 ? 1.0 : max(blur_trail - 0.008, 0.0);

            fragColor = vec4(next, next_age, next_trail, 1.0);
        }
      `
    });

    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), updateMat));

    // Display Material (Kaleidoscope + Chromatic Aberration + Lisa Frank Palette)
    const displayMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_state: { value: null },
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
        uniform sampler2D u_state;
        uniform vec2 u_res;
        uniform float u_time;
        out vec4 fragColor;

        vec2 kaleidoscope(vec2 uv, float folds, float rot) {
            vec2 center = vec2(0.5);
            vec2 d = uv - center;
            float angle = atan(d.y, d.x) + rot;
            float radius = length(d);
            float sector = 6.28318530718 / folds;
            angle = mod(angle, sector);
            if (angle > sector * 0.5) angle = sector - angle;
            return center + vec2(cos(angle), sin(angle)) * radius;
        }

        vec2 displace(vec2 uv, float time, float intensity, float scale) {
            vec2 offset;
            offset.x = sin(uv.y * scale + time) * intensity;
            offset.y = cos(uv.x * scale + time * 0.7) * intensity;
            return uv + offset;
        }

        // Lisa Frank / Cyberdelic Acid Palette
        vec3 palette(float t) {
            t = fract(t);
            vec3 c1 = vec3(1.0, 0.0, 0.8);   // Hot Pink
            vec3 c2 = vec3(0.0, 1.0, 0.9);   // Cyan
            vec3 c3 = vec3(0.8, 1.0, 0.0);   // Neon Green
            vec3 c4 = vec3(0.5, 0.0, 1.0);   // Deep Purple
            vec3 c5 = vec3(1.0, 0.5, 0.0);   // Electric Orange
            
            if(t < 0.2) return mix(c1, c2, t/0.2);
            if(t < 0.4) return mix(c2, c3, (t-0.2)/0.2);
            if(t < 0.6) return mix(c3, c4, (t-0.4)/0.2);
            if(t < 0.8) return mix(c4, c5, (t-0.6)/0.2);
            return mix(c5, c1, (t-0.8)/0.2);
        }

        void main() {
            vec2 uv = vUv;
            vec2 aspect = vec2(u_res.x / u_res.y, 1.0);
            
            // Center and correct aspect ratio for kaleidoscope
            uv = (uv - 0.5) * aspect;

            // Breathing pulse
            float pulse = sin(u_time * 2.0) * 0.03 + 1.0;
            uv *= pulse;
            uv += 0.5;

            // 8-fold Rotating Kaleidoscope Mandala
            uv = kaleidoscope(uv, 8.0, u_time * 0.08);

            // Revert aspect ratio to sample the square CA texture correctly
            uv = (uv - 0.5) / aspect + 0.5;

            // Warp UV slightly for psychedelic liquid feel
            vec2 warpUv = displace(uv, u_time, 0.01, 8.0);

            // Chromatic aberration offsets simulating digital misregistration
            vec2 uvR = displace(warpUv, u_time, 0.015, 5.0);
            vec2 uvG = warpUv;
            vec2 uvB = displace(warpUv, -u_time, 0.015, 5.0);

            float rTrail = texture(u_state, uvR).b;
            float gTrail = texture(u_state, uvG).b;
            float bTrail = texture(u_state, uvB).b;
            
            float rAlive = texture(u_state, uvR).r;
            float gAlive = texture(u_state, uvG).r;
            float bAlive = texture(u_state, uvB).r;

            // Map the bleeding trails to the Lisa Frank neon palette
            vec3 colR = palette(rTrail * 1.5 - u_time * 0.3);
            vec3 colG = palette(gTrail * 1.5 - u_time * 0.3 + 0.33);
            vec3 colB = palette(bTrail * 1.5 - u_time * 0.3 + 0.66);
            
            vec3 color = vec3(colR.r, colG.g, colB.b);

            // Emphasize the live CA cells with a glowing core
            float aliveMax = max(max(rAlive, gAlive), bAlive);
            if (aliveMax > 0.1) {
                color = mix(color, vec3(0.9, 1.0, 1.0), aliveMax * 0.9);
            }

            // Lisa Frank Sparkles on bright spots
            float sparkle = 0.0;
            vec2 spUv = vUv * u_res.x * 0.02; 
            vec2 gv = fract(spUv) - 0.5;
            vec2 id = floor(spUv);
            float n = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
            if (n > 0.85 && aliveMax > 0.1) {
                float star = 0.015 / (abs(gv.x) + 0.01) + 0.015 / (abs(gv.y) + 0.01);
                star *= smoothstep(0.5, 0.0, length(gv));
                sparkle = star * max(0.0, sin(u_time * 10.0 + n * 20.0));
            }
            color += vec3(sparkle) * aliveMax;

            // Deep void background
            vec3 bg = vec3(0.04, 0.0, 0.1); 
            float trailMax = max(max(rTrail, gTrail), bTrail);
            
            // Blend the neon ink into the void
            color = mix(bg, color, smoothstep(0.0, 0.15, trailMax));

            // Psychedelic Collage Artifacts: Paper grain
            float grain = fract(sin(dot(vUv * 1000.0, vec2(12.9898, 78.233))) * 43758.5453);
            color += (grain - 0.5) * 0.12;
            
            // Subtle horizontal scanline artifact
            float scanline = sin(vUv.y * u_res.y * 0.5) * 0.04;
            color -= scanline;

            // Vignette focus
            float vig = length(vUv - 0.5) * 2.0;
            color *= 1.0 - pow(vig, 3.0) * 0.4;

            fragColor = vec4(color, 1.0);
        }
      `
    });

    const displayScene = new THREE.Scene();
    displayScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), displayMat));

    canvas.__three = { renderer, scene, camera, fbo, updateMat, displayMat, displayScene, ping: 0 };
  } catch (e) {
    console.error("WebGL Initialization Failed:", e);
    return;
  }
}

const { renderer, scene, camera, fbo, updateMat, displayMat, displayScene } = canvas.__three;

// Guard uniform updates safely
if (updateMat?.uniforms?.u_time) {
  updateMat.uniforms.u_time.value = time;
  updateMat.uniforms.u_mouse.value.set(mouse.x / grid.width, 1.0 - mouse.y / grid.height);
  updateMat.uniforms.u_isPressed.value = mouse.isPressed ? 1.0 : 0.0;
  updateMat.uniforms.u_screen_res.value.set(grid.width, grid.height);
}

// Step the CA multiple times per frame for rapid chaotic evolution
const steps = 2;
for (let i = 0; i < steps; i++) {
  const nextPing = 1 - canvas.__three.ping;
  
  if (updateMat?.uniforms?.u_state) {
    updateMat.uniforms.u_state.value = fbo[canvas.__three.ping].texture;
  }
  
  renderer.setRenderTarget(fbo[nextPing]);
  renderer.render(scene, camera);
  
  canvas.__three.ping = nextPing;
}

// Display Pass
if (displayMat?.uniforms?.u_time) {
  displayMat.uniforms.u_state.value = fbo[canvas.__three.ping].texture;
  displayMat.uniforms.u_res.value.set(grid.width, grid.height);
  displayMat.uniforms.u_time.value = time;
}

renderer.setRenderTarget(null);
renderer.setSize(grid.width, grid.height, false);
renderer.render(displayScene, camera);