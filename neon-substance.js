try {
  if (!ctx) throw new Error("WebGL context not available");

  if (!canvas.__three) {
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      context: ctx,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(grid.width, grid.height, false);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

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

      // Noise / Grain
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      // p6m Symmetry Folding (Tessellations Repo - Crystalline base)
      vec2 foldP6m(vec2 p) {
          p = abs(p);
          const float sqrt3 = 1.73205080757;
          if (p.y > p.x * sqrt3) {
              p = vec2(p.x * sqrt3 + p.y, p.x - p.y * sqrt3) * 0.5;
          }
          p = abs(p);
          if (p.y > p.x * sqrt3) {
              p = vec2(p.x * sqrt3 + p.y, p.x - p.y * sqrt3) * 0.5;
          }
          return p;
      }

      // 3D Gyroid (Structural Color Repo - Triply Periodic Minimal Surface)
      float gyroid(vec3 p) {
          return dot(sin(p), cos(p.zxy));
      }

      // Volumetric FBM with absolute value for sharp "stress fracture" ridges
      float fbm(vec3 p, float boundaryWarp) {
          float d = 0.0;
          float amp = 0.5;
          float freq = 1.0;
          
          // Holographic Renormalization: frequency increases near boundary
          float freqMult = 1.7 + boundaryWarp * 0.5; 
          
          for(int i = 0; i < 6; i++) {
              d += amp * abs(gyroid(p * freq));
              p.xyz = p.yzx + vec3(1.1, 2.3, 3.4); // Chiral rotation
              freq *= freqMult;
              amp *= 0.55;
          }
          return d;
      }

      void main() {
          // Centered, aspect-corrected UV
          vec2 uv = (vUv - 0.5) * 2.0;
          uv.x *= u_resolution.x / u_resolution.y;
          
          // Time Scales (The Feral Clockwork)
          float t_slow = u_time * 0.05; // Global drift
          float t_med  = u_time * 0.3;  // Structural crystallization/erosion
          float t_fast = u_time * 2.5;  // Birefringence shimmer / photon jitter
          
          // Holographic AdS Geometry (Radial depth = scale)
          // Space warps infinitely toward the edge
          float r = length(uv);
          float ads_z = max(0.05, 1.0 - r*r*0.8); 
          vec2 warpedUv = uv / ads_z;
          
          // Apply p6m crystalline folding
          vec2 foldUv = foldP6m(warpedUv * 1.5);
          
          // Domain Warping (Medium scale distortion)
          vec3 warpPos = vec3(foldUv * 2.0, t_slow);
          vec2 offset = vec2(
              gyroid(warpPos),
              gyroid(warpPos + vec3(4.2, 1.3, 8.9))
          ) * 0.5;
          
          // Structural Sample (The physical substance)
          vec3 p = vec3(foldUv * 4.0 + offset, t_med);
          float d = fbm(p, r);
          
          // Calculate Normals via Gradient (gives the 2D plane 3D physical volume)
          vec2 eps = vec2(0.015, 0.0);
          float dx = fbm(p + vec3(eps.x, eps.y, eps.y), r) - d;
          float dy = fbm(p + vec3(eps.y, eps.x, eps.y), r) - d;
          vec3 normal = normalize(vec3(dx, dy, 0.08));
          
          // Caustic Lighting
          vec3 lightDir = normalize(vec3(sin(t_fast*0.5), cos(t_fast*0.7), 1.2));
          float diffuse = max(0.0, dot(normal, lightDir));
          float specular = pow(max(0.0, dot(normal, lightDir)), 12.0);
          
          // Interference Holography / Birefringence (Neon CMY Palette)
          // Phase is driven by structural depth, fast time, and acute angles
          float phase = d * 12.0 - t_fast + specular * 4.0;
          
          vec3 cyan = vec3(0.0, 1.0, 1.0);
          vec3 mag  = vec3(1.0, 0.0, 1.0);
          vec3 yel  = vec3(1.0, 1.0, 0.0);
          
          // Phase-shifted weights for structural color
          float w1 = smoothstep(0.1, 0.9, sin(phase));
          float w2 = smoothstep(0.1, 0.9, sin(phase + 2.094)); // 120 deg
          float w3 = smoothstep(0.1, 0.9, sin(phase + 4.188)); // 240 deg
          
          vec3 interferenceColor = (cyan * w1 + mag * w2 + yel * w3) / (w1 + w2 + w3 + 0.001);
          
          // Void Black Carving (Matte Host vs Brilliant Veins)
          // The structure is dead black, but the sharp ridges / stress fractures emit light
          float veinMask = smoothstep(0.8, 0.1, d);
          float crackMask = smoothstep(0.2, 0.0, d) * 2.0; // Kintsugi extreme highlights
          
          vec3 finalColor = interferenceColor * veinMask * (diffuse + 0.2);
          finalColor += interferenceColor * specular * crackMask * 2.5;
          
          // Quantum Dust (Particulate dry shine over wet viscous veins)
          float dust = smoothstep(0.97, 1.0, hash(uv * 150.0 + t_fast));
          finalColor += dust * cyan * veinMask * 1.5;
          
          // Physical Grain
          float grain = hash(vUv * u_resolution + u_time) * 0.15;
          finalColor += grain * veinMask;
          
          // Vignette (Fade into the deep void)
          finalColor *= smoothstep(1.3, 0.2, r);
          
          // Output with a hard black floor to guarantee the void
          fragColor = vec4(max(vec3(0.0), finalColor), 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
      },
      depthWrite: false,
      depthTest: false
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(plane);

    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  if (material?.uniforms?.u_time) {
    material.uniforms.u_time.value = time;
  }
  if (material?.uniforms?.u_resolution) {
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("Feral texture compilation failed:", e);
}