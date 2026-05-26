// Lenia Velvet Damask
// A living textile woven from artificial cellular automata.
// Uses procedural Lenia ring constraints mirrored through a kaleidoscope manifold,
// warped by curl noise, and shaded with an anisotropic velvet BRDF and sparkle dust.

(function () {
  'use strict';

  // Defensive WebGL2 initialization
  if (!canvas.__three) {
    try {
      if (!ctx) throw new Error("WebGL 2 context not available");

      const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        context: ctx,
        alpha: true,
        antialias: true
      });
      renderer.autoClear = false;

      // ─── NAP SIMULATION SETUP (BUFFER A/B) ──────────────────────────────────
      const simScene = new THREE.Scene();
      const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const fboOptions = {
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType, // Sufficient for nap direction/intensity
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: false,
        stencilBuffer: false
      };
      let targetA = new THREE.WebGLRenderTarget(grid.width, grid.height, fboOptions);
      let targetB = new THREE.WebGLRenderTarget(grid.width, grid.height, fboOptions);

      const simShader = {
        glslVersion: THREE.GLSL3,
        uniforms: {
          u_prevNap: { value: null },
          u_mouse: { value: new THREE.Vector3(0, 0, 0) }, // x, y, isPressed
          u_prevMouse: { value: new THREE.Vector2(0, 0) },
          u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
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
          in vec2 vUv;
          out vec4 fragColor;

          uniform sampler2D u_prevNap;
          uniform vec3 u_mouse;
          uniform vec2 u_prevMouse;
          uniform vec2 u_resolution;
          uniform float u_time;

          // Distance to line segment
          float sdLine(vec2 p, vec2 a, vec2 b) {
            vec2 pa = p - a, ba = b - a;
            float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
            return length(pa - ba * h);
          }

          void main() {
            vec4 prev = texture(u_prevNap, vUv);
            
            // Fade intensity slowly (fabric memory)
            prev.z *= 0.99;
            
            // Mouse brush interaction
            if (u_mouse.z > 0.5) {
              vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
              vec2 p = vUv * aspect;
              vec2 a = u_prevMouse * aspect;
              vec2 b = u_mouse.xy * aspect;
              
              float d = sdLine(p, a, b);
              float brushRadius = 0.08;
              
              if (d < brushRadius) {
                // Calculate stroke direction
                vec2 dir = normalize(b - a + vec2(1e-4));
                float intensity = smoothstep(brushRadius, 0.0, d);
                
                // Blend nap direction
                prev.xy = normalize(mix(prev.xy, dir, intensity * 0.5));
                // Add to nap intensity
                prev.z = max(prev.z, intensity);
              }
            }
            
            // Add subtle organic drift to the nap to make it feel alive
            float drift = sin(vUv.y * 20.0 + u_time) * cos(vUv.x * 15.0 - u_time) * 0.01;
            prev.x += drift * prev.z;
            prev.xy = normalize(prev.xy + vec2(1e-6));

            fragColor = prev;
          }
        `
      };

      const simMaterial = new THREE.ShaderMaterial(simShader);
      const simQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial);
      simScene.add(simQuad);

      // ─── MAIN VELVET RENDER SETUP ───────────────────────────────────────────
      const mainScene = new THREE.Scene();
      const mainCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const mainShader = {
        glslVersion: THREE.GLSL3,
        uniforms: {
          u_time: { value: 0 },
          u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
          u_napMap: { value: null }
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
          in vec2 vUv;
          out vec4 fragColor;

          uniform float u_time;
          uniform vec2 u_resolution;
          uniform sampler2D u_napMap;

          #define PI 3.14159265359

          // --- Feral Math: Curl Noise for Semantic Infestation ---
          vec2 hash22(vec2 p) {
            vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.xx + p3.yz) * p3.zy);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(dot(hash22(i + vec2(0.0,0.0)), f - vec2(0.0,0.0)), 
                           dot(hash22(i + vec2(1.0,0.0)), f - vec2(1.0,0.0)), u.x),
                       mix(dot(hash22(i + vec2(0.0,1.0)), f - vec2(0.0,1.0)), 
                           dot(hash22(i + vec2(1.0,1.0)), f - vec2(1.0,1.0)), u.x), u.y);
          }

          vec2 curlNoise(vec2 p) {
            float eps = 0.01;
            float n1 = noise(p + vec2(0.0, eps));
            float n2 = noise(p - vec2(0.0, eps));
            float n3 = noise(p + vec2(eps, 0.0));
            float n4 = noise(p - vec2(eps, 0.0));
            return vec2(n1 - n2, n4 - n3) / (2.0 * eps);
          }

          // --- Lenia Morphogenesis ---
          float leniaRing(float r, float mu, float sig) {
            float d = r - mu;
            return exp(-(d * d) / (2.0 * sig * sig));
          }

          vec4 organism(vec2 p, vec2 c, float phase, float scale) {
            vec2 d = p - c;
            float r = length(d) / scale;
            float angle = atan(d.y, d.x);
            
            // Biological deformation (ornamental folds)
            float deform = 1.0 
                + 0.25 * sin(4.0 * angle + phase) 
                + 0.15 * cos(8.0 * angle - phase * 1.2)
                + 0.08 * sin(12.0 * angle + phase * 0.7);
                
            float reff = r * deform;
            
            // Channels: Body, Halo, Accent, Flash
            float body = leniaRing(reff, 0.4, 0.08);
            float halo = leniaRing(reff, 0.65, 0.15);
            float accent = leniaRing(reff, 0.2, 0.04);
            float flash = leniaRing(reff, 0.45, 0.02) * (0.5 + 0.5 * sin(phase * 3.0));
            
            return vec4(body, halo, accent, flash);
          }

          vec4 getLeniaDamask(vec2 p, float t) {
            vec4 total = vec4(0.0);
            
            // O1: Center mitosis
            vec2 p1 = vec2(sin(t * 0.4) * 0.12, cos(t * 0.5) * 0.12);
            total += organism(p, p1, t, 0.28);
            
            // O2: Edge connectors
            vec2 p2 = vec2(0.5 + sin(t * 0.3) * 0.08, 0.5 + cos(t * 0.6) * 0.08);
            total += organism(p, p2, t * 1.1, 0.35);
            
            // O3: Wandering parasites
            vec2 p3 = vec2(0.25 + sin(t * 0.5) * 0.18, 0.25 + cos(t * 0.3) * 0.18);
            total += organism(p, p3, t * 0.8, 0.18);
            
            return total;
          }

          // Evaluate the folded manifold
          vec4 evaluateField(vec2 rawUV, float t) {
            // Apply curl noise warp to break perfect Euclidean symmetry
            vec2 warped = rawUV + curlNoise(rawUV * 2.0 + t * 0.1) * 0.03;
            
            // Fold into a mirrored kaleidoscope (Damask repeat)
            vec2 tile = fract(warped);
            vec2 folded = abs(tile - 0.5);
            
            return getLeniaDamask(folded, t);
          }

          // Sparkle Dust (Blue Noise approximation)
          float hash12(vec2 p) {
            vec3 p3 = fract(vec3(p.xyx) * 0.1031);
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.x + p3.y) * p3.z);
          }

          void main() {
            vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
            vec2 damaskUV = vUv * aspect * 2.5; // Scale of the pattern
            
            // --- Normal & Height Computation ---
            float eps = 0.005;
            vec4 centerLenia = evaluateField(damaskUV, u_time);
            float h0 = centerLenia.r * 0.7 + centerLenia.g * 0.3; // Body + Halo height
            
            float hX = evaluateField(damaskUV + vec2(eps, 0.0), u_time).r * 0.7 
                     + evaluateField(damaskUV + vec2(eps, 0.0), u_time).g * 0.3;
            float hY = evaluateField(damaskUV + vec2(0.0, eps), u_time).r * 0.7 
                     + evaluateField(damaskUV + vec2(0.0, eps), u_time).g * 0.3;
            
            vec3 N = normalize(vec3(h0 - hX, h0 - hY, 0.015)); // Z controls bump strength
            
            // --- Velvet Nap Modification ---
            vec4 nap = texture(u_napMap, vUv);
            vec2 brushDir = nap.xy * nap.z;
            vec2 baseNap = vec2(0.0, -1.0) * 0.1; // Gravity/Weave default
            vec2 totalNap = baseNap + brushDir * 0.4;
            
            // Shift normal based on nap (Anisotropic distortion)
            vec3 shiftedN = normalize(N + vec3(totalNap, 0.0));
            
            // --- Lighting ---
            vec3 V = normalize(vec3(0.0, 0.0, 1.0));
            vec3 L1 = normalize(vec3(0.6, 0.8, 0.5));
            vec3 L2 = normalize(vec3(-0.7, -0.3, 0.6));
            
            float NdotV = max(0.0, dot(shiftedN, V));
            float NdotL1 = max(0.0, dot(shiftedN, L1));
            float NdotL2 = max(0.0, dot(shiftedN, L2));
            
            // Velvet Asperity Scattering (Rim light on fuzz)
            float rim = smoothstep(0.0, 1.0, 1.0 - NdotV);
            float velvetRim = pow(rim, 2.5) * (NdotL1 * 0.8 + NdotL2 * 0.4);
            
            // Iridescence on the rim (Structural Color interference)
            vec3 iridescence = 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + velvetRim * 1.5 - u_time * 0.1));
            
            // --- Palette & Materials ---
            vec3 baseVelvet = vec3(0.05, 0.01, 0.12); // Deep ultraviolet
            
            // Biological pigments
            vec3 magenta = vec3(0.9, 0.0, 0.3);
            vec3 cyan = vec3(0.0, 0.8, 0.9);
            vec3 acid = vec3(0.6, 1.0, 0.0);
            vec3 orange = vec3(1.0, 0.5, 0.0);
            
            vec3 albedo = baseVelvet;
            albedo = mix(albedo, cyan, centerLenia.g * 0.6);   // Halo
            albedo = mix(albedo, magenta, centerLenia.r);      // Body
            albedo = mix(albedo, acid, centerLenia.b);         // Accent
            albedo += orange * centerLenia.a * 1.5;            // Flash emission
            
            // Combine lighting
            vec3 color = albedo * (0.3 + NdotL1 * 0.5 + NdotL2 * 0.2);
            color += iridescence * velvetRim * 0.8;
            
            // --- Sparkle Dust (Glitter in the pile) ---
            float sparkleHash = hash12(vUv * 2500.0 + floor(u_time * 30.0) * 0.1);
            // Only sparkle on the raised pile, facing the light
            float sparkleMask = centerLenia.r * pow(NdotV, 1.5) * NdotL1;
            float sparkle = smoothstep(0.97, 1.0, sparkleHash) * sparkleMask;
            
            color += vec3(1.0, 0.9, 1.0) * sparkle * 8.0;

            // Tone mapping and vignette
            color = color / (1.0 + color);
            float vig = 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
            color *= vig;

            fragColor = vec4(color, 1.0);
          }
        `
      };

      const mainMaterial = new THREE.ShaderMaterial(mainShader);
      const mainQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mainMaterial);
      mainScene.add(mainQuad);

      canvas.__three = { 
        renderer, 
        simScene, simCamera, targetA, targetB, simMaterial,
        mainScene, mainCamera, mainMaterial 
      };

      // Mouse tracking state
      canvas.__mouseState = {
        current: new THREE.Vector2(0, 0),
        prev: new THREE.Vector2(0, 0),
        isPressed: 0
      };

    } catch (e) {
      console.error("WebGL Initialization Failed:", e);
      return;
    }
  }

  const t3 = canvas.__three;
  const mState = canvas.__mouseState;

  // Update mouse state
  const normX = mouse.x / grid.width;
  const normY = 1.0 - (mouse.y / grid.height); // Flip Y for WebGL
  
  if (mouse.isPressed) {
    if (mState.isPressed === 0) {
      // Just clicked, set prev to current to avoid jumping lines
      mState.prev.set(normX, normY);
    } else {
      mState.prev.copy(mState.current);
    }
    mState.current.set(normX, normY);
    mState.isPressed = 1.0;
  } else {
    mState.isPressed = 0.0;
  }

  // Handle Resize
  if (t3.renderer.getSize(new THREE.Vector2()).x !== grid.width || 
      t3.renderer.getSize(new THREE.Vector2()).y !== grid.height) {
    t3.renderer.setSize(grid.width, grid.height, false);
    t3.targetA.setSize(grid.width, grid.height);
    t3.targetB.setSize(grid.width, grid.height);
    t3.simMaterial.uniforms.u_resolution.value.set(grid.width, grid.height);
    t3.mainMaterial.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  // 1. Simulation Pass (Nap/Brush Interaction)
  t3.simMaterial.uniforms.u_time.value = time;
  t3.simMaterial.uniforms.u_prevNap.value = t3.targetA.texture;
  t3.simMaterial.uniforms.u_mouse.value.set(mState.current.x, mState.current.y, mState.isPressed);
  t3.simMaterial.uniforms.u_prevMouse.value.copy(mState.prev);
  
  t3.renderer.setRenderTarget(t3.targetB);
  t3.renderer.render(t3.simScene, t3.simCamera);

  // Ping-pong swap
  let temp = t3.targetA;
  t3.targetA = t3.targetB;
  t3.targetB = temp;

  // 2. Main Render Pass (Velvet Damask)
  t3.mainMaterial.uniforms.u_time.value = time;
  t3.mainMaterial.uniforms.u_napMap.value = t3.targetA.texture;
  
  t3.renderer.setRenderTarget(null);
  t3.renderer.render(t3.mainScene, t3.mainCamera);

})();