if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      in vec2 vUv;
      out vec4 fragColor;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_isPressed;

      #define PI 3.14159265359

      // --- MOIRÉ PRIMITIVES ---
      float sineGrating(vec2 uv, float freq, float angle, float phase) {
          float c = cos(angle);
          float s = sin(angle);
          float x = uv.x * c + uv.y * s;
          return 0.5 + 0.5 * sin(x * freq + phase);
      }

      float spiralGrating(vec2 uv, float tightness, float arms, float phase) {
          float r = length(uv);
          float a = atan(uv.y, uv.x + 1e-5);
          float spiralPhase = a * arms + log(r + 0.001) * tightness + phase;
          return 0.5 + 0.5 * sin(spiralPhase);
      }

      // --- STRIPE-FLUID DISTORTION & FALSE DEPTH ---
      vec2 applyForce(vec2 uv, vec2 center, float radius, float strength, float t) {
          vec2 d = uv - center;
          float r = length(d);
          float falloff = smoothstep(radius, 0.0, r);
          
          // Twist force (Spiral drift)
          float angle = strength * falloff * sin(t);
          float s = sin(angle);
          float c = cos(angle);
          vec2 twisted = vec2(d.x * c - d.y * s, d.x * s + d.y * c);
          
          // Lens Bulge force (False depth)
          twisted *= 1.0 - (falloff * 0.3 * cos(t * 1.5));
          
          return center + twisted;
      }

      // --- EYE-OBJECT ICONOGRAPHY ---
      vec4 drawEye(vec2 uv, vec2 center, float scale, float t, float isPressed) {
          vec2 d = uv - center;
          float r = length(d) / scale;
          float a = atan(d.y, d.x + 1e-5);
          
          // Dilation based on interaction
          float dilation = mix(0.25, 0.4, isPressed);
          float pupilMask = smoothstep(dilation, dilation - 0.05, r);
          float irisMask = smoothstep(0.6, 0.55, r) - pupilMask;
          float whiteMask = smoothstep(0.9, 0.85, r) - (irisMask + pupilMask);
          
          float alpha = smoothstep(1.0, 0.95, r);
          
          // Radial Hypnosis Target
          float irisRings = 0.5 + 0.5 * sin(r * 30.0 - t * 5.0);
          float irisSpokes = 0.5 + 0.5 * sin(a * 16.0 + t * 2.0);
          float irisPattern = smoothstep(0.3, 0.7, irisRings * irisSpokes);
          
          vec3 col = vec3(0.0);
          // Blacklight Palette Iris
          col += mix(vec3(0.0, 0.8, 1.0), vec3(1.0, 0.0, 0.8), irisPattern) * irisMask; 
          
          // Sclera with Zebra Wave veins
          float veinPattern = 0.5 + 0.5 * sin(r * 20.0 + a * 10.0);
          vec3 whiteCol = mix(vec3(0.9, 0.9, 1.0), vec3(1.0, 0.2, 0.4), smoothstep(0.8, 1.0, veinPattern) * 0.3);
          col += whiteCol * whiteMask;
          
          // Prismatic Eyelid Threshold
          float lid = smoothstep(1.0, 0.95, r) - smoothstep(0.95, 0.9, r);
          float prismatic = 0.5 + 0.5 * sin(a * 10.0 - t * 3.0);
          vec3 lidColor = mix(vec3(1.0, 1.0, 0.0), vec3(0.0, 1.0, 1.0), prismatic);
          col += lidColor * lid;
          
          return vec4(col, alpha);
      }

      vec3 getHalo(vec2 uv, vec2 center, float scale, float t) {
          vec2 d = uv - center;
          float r = length(d) / scale;
          float halo = smoothstep(1.2, 1.0, r) - smoothstep(1.0, 0.95, r);
          // Chromatic interference halo
          return vec3(1.0, 0.0, 1.0) * halo * (0.5 + 0.5 * sin(r * 50.0 - t * 10.0));
      }

      void main() {
          vec2 uv = (vUv - 0.5) * u_resolution / u_resolution.y;
          
          // Anamorphic Mouse Tracking
          vec2 mouseNorm = (u_mouse / u_resolution) - 0.5;
          mouseNorm.x *= u_resolution.x / u_resolution.y;
          mouseNorm.y = -mouseNorm.y; 
          
          vec2 wuv = uv;
          vec2 sat1Pos = vec2(sin(u_time * 0.5) * 0.6, cos(u_time * 0.6) * 0.5);
          vec2 sat2Pos = vec2(cos(u_time * 0.4) * -0.7, sin(u_time * 0.7) * 0.4);
          
          // Structural Forces bending the Moiré space
          wuv = applyForce(wuv, vec2(0.0), 0.8, 2.0, u_time);
          wuv = applyForce(wuv, sat1Pos, 0.4, -1.5, u_time * 1.2);
          wuv = applyForce(wuv, sat2Pos, 0.3, 1.8, u_time * 0.8);
          wuv = applyForce(wuv, mouseNorm, 0.6, 3.0, u_time * 2.0);
          
          // Domain Warping / Slither Field
          wuv.x += sin(wuv.y * 10.0 + u_time) * 0.02;
          wuv.y += cos(wuv.x * 10.0 - u_time) * 0.02;
          
          // --- CHROMATIC RGB MOIRÉ SKELETON ---
          
          // Channel 1: Acid Cyan
          float c1_spiral = spiralGrating(wuv, 15.0, 5.0, u_time * 2.0);
          float c1_wave = sineGrating(wuv, 60.0, 0.5, -u_time * 1.5);
          float cyanC = c1_spiral * c1_wave;
          
          // Channel 2: Hot Pink
          float c2_spiral = spiralGrating(wuv, 15.5, 5.0, -u_time * 1.8);
          float c2_wave = sineGrating(wuv, 62.0, 1.0, u_time * 1.2);
          float magC = c2_spiral * c2_wave;
          
          // Channel 3: Toxic Lime
          float rDist = length(wuv);
          float c3_radial = 0.5 + 0.5 * sin(rDist * 50.0 - u_time * 3.0);
          float c3_wave = sineGrating(wuv, 58.0, 1.57, u_time * 2.5);
          float limeC = c3_radial * c3_wave;
          
          vec3 color = vec3(0.0);
          color += vec3(0.0, 1.0, 0.8) * smoothstep(0.3, 0.7, cyanC);
          color += vec3(1.0, 0.0, 0.5) * smoothstep(0.3, 0.7, magC);
          color += vec3(0.8, 1.0, 0.0) * smoothstep(0.3, 0.7, limeC);
          
          // Multiplicative Interference Overlay (The Print Ghost)
          float ghost = c1_spiral * c2_spiral * c3_radial;
          color *= 0.5 + 1.5 * smoothstep(0.2, 0.8, ghost);
          
          vec3 finalColor = color;
          
          // --- OPTICAL SURREALISM: EYE SPECIES ---
          vec4 mainEye = drawEye(uv, vec2(0.0), 0.35, u_time, u_isPressed);
          finalColor = mix(finalColor, mainEye.rgb, mainEye.a);
          finalColor += getHalo(uv, vec2(0.0), 0.35, u_time);
          
          vec4 sat1 = drawEye(uv, sat1Pos, 0.1, u_time * 1.5, u_isPressed);
          finalColor = mix(finalColor, sat1.rgb, sat1.a);
          finalColor += getHalo(uv, sat1Pos, 0.1, u_time * 1.5);
          
          vec4 sat2 = drawEye(uv, sat2Pos, 0.08, -u_time * 1.2, u_isPressed);
          finalColor = mix(finalColor, sat2.rgb, sat2.a);
          finalColor += getHalo(uv, sat2Pos, 0.08, -u_time * 1.2);
          
          // Contrast Push (Retinal Mechanics)
          finalColor = smoothstep(0.0, 1.2, finalColor);
          
          // False Depth Vignette (Tunneling)
          float vignette = smoothstep(1.5, 0.4, length(uv));
          finalColor *= vignette;
          
          // Plush Candy Noise
          float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
          finalColor += noise * 0.05 * vignette;
          
          fragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(grid.width / 2, grid.height / 2) },
        u_isPressed: { value: 0.0 }
      },
      vertexShader,
      fragmentShader,
      depthWrite: false,
      depthTest: false
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
  
  const targetMouseX = mouse.x || grid.width / 2;
  const targetMouseY = mouse.y || grid.height / 2;
  
  const currentMouse = material.uniforms.u_mouse.value;
  currentMouse.x += (targetMouseX - currentMouse.x) * 0.1;
  currentMouse.y += (targetMouseY - currentMouse.y) * 0.1;
  
  const targetPress = mouse.isPressed ? 1.0 : 0.0;
  material.uniforms.u_isPressed.value += (targetPress - material.uniforms.u_isPressed.value) * 0.15;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);