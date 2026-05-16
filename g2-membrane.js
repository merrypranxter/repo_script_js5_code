if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
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
      #version 300 es
      precision highp float;

      in vec2 vUv;
      out vec4 fragColor;

      uniform float u_time;
      uniform vec2 u_resolution;

      // G2 Holonomy Symbolic Grammar & Aesthetic Protocols
      
      vec3 getCandyAcid(float t) {
          t = fract(t);
          vec3 c1 = vec3(1.0, 0.0, 0.4);   // Hot Pink
          vec3 c2 = vec3(0.0, 1.0, 0.8);   // Turquoise
          vec3 c3 = vec3(0.8, 1.0, 0.0);   // Acid Green
          vec3 c4 = vec3(1.0, 0.2, 0.0);   // Electric Coral
          vec3 c5 = vec3(0.5, 0.0, 1.0);   // Ultraviolet

          float p = t * 5.0;
          float f = smoothstep(0.0, 1.0, fract(p));
          if (p < 1.0) return mix(c1, c2, f);
          if (p < 2.0) return mix(c2, c3, f);
          if (p < 3.0) return mix(c3, c4, f);
          if (p < 4.0) return mix(c4, c5, f);
          return mix(c5, c1, f);
      }

      vec3 g2PhiField(vec2 p, float t) {
          float a = sin(p.x * 2.1 + t * 0.55);
          float b = cos(p.y * 2.7 - t * 0.31);
          float c = sin((p.x + p.y) * 3.2 + t * 0.22);
          return normalize(vec3(a + 0.3 * c, b - 0.25 * c, sin((p.x * p.y) * 2.0 + t * 0.18)));
      }

      vec3 g2DualField(vec2 p, float t, vec3 phi) {
          return normalize(vec3(-phi.y, phi.x, cos((p.x - p.y) * 2.4 - t * 0.27)));
      }

      float g2Torsion(vec3 phi, vec3 dual) {
          return abs(dot(phi, dual));
      }

      float g2SingularityMask(vec2 p, vec3 phi, vec3 dual, float torsion) {
          float radial = length(p);
          float fracture = sin(radial * 18.0 - torsion * 6.0 + phi.z * 4.0);
          fracture = 0.5 + 0.5 * fracture;
          float axisStress = abs(phi.x - dual.y);
          float mask = smoothstep(0.72, 0.96, fracture + axisStress * 0.35 + torsion * 0.4);
          return clamp(mask, 0.0, 1.0);
      }

      vec4 map(vec2 p, float t, vec2 uvOffset) {
          p += uvOffset;
          
          // Hostile Coordinates: Warp UVs before use (Deep iterative warp)
          vec2 w = p;
          for(int i = 0; i < 3; i++) {
              vec3 phi_w = g2PhiField(w, t * 0.2);
              w += 0.2 * vec2(phi_w.x, phi_w.y) * mat2(cos(t), -sin(t), sin(t), cos(t));
          }

          vec3 phi = g2PhiField(w, t);
          vec3 dual = g2DualField(w, t, phi);
          float torsion = g2Torsion(phi, dual);
          float singMask = g2SingularityMask(w, phi, dual, torsion);

          // Healing Seam (Resolution)
          float halo = exp(-3.5 * length(w));
          float seam = smoothstep(0.2, 1.0, singMask) * (0.3 + 0.7 * torsion);
          
          // Photonic Crystal Edge / Structural Shine
          float bragg = fract(length(w) * 30.0 - t * 3.0 + phi.z * 5.0);
          float photonicEdge = smoothstep(0.8, 1.0, bragg) * smoothstep(0.3, 0.7, torsion);
          
          // Base Chamber Projection
          float chamber = 0.5 + 0.5 * sin(length(p) * 10.0 - t * 0.8 + phi.z * 3.0);
          vec3 baseCol = getCandyAcid(chamber + torsion * 0.7);

          // Compositing
          vec3 col = baseCol;
          
          // Structural Shine (Photonic / Thin-film)
          vec3 shineCol = getCandyAcid(t * 0.5 + phi.x) * 2.5;
          col = mix(col, shineCol, photonicEdge);
          
          // Singularity Wounds (White-hot bloom)
          vec3 woundCol = vec3(1.0, 0.9, 0.8) + getCandyAcid(t * 1.3) * 0.8;
          col = mix(col, woundCol, singMask);
          
          // Resolution Seam Glow
          col += getCandyAcid(torsion * 3.0 - t) * seam * 2.0;
          
          // Cool halo from dual field
          col += vec3(0.0, 0.8, 1.0) * halo * (1.0 - singMask) * 0.4;

          return vec4(col, torsion);
      }

      void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          p.x *= u_resolution.x / max(u_resolution.y, 1.0);

          // Map projective geometry (Poincare fold)
          float rSq = dot(p, p);
          p = p / (1.0 + rSq * 0.1 * sin(u_time * 0.2));

          // Get base torsion for dynamic CA
          vec4 baseSample = map(p, u_time, vec2(0.0));
          float strain = smoothstep(0.2, 0.9, baseSample.a);
          
          // Hostile offset mapping based on strain (Chromatic Aberration)
          float offset = 0.02 * strain;
          vec2 dirR = vec2(cos(u_time), sin(u_time));
          vec2 dirG = vec2(cos(u_time + 2.094), sin(u_time + 2.094));
          vec2 dirB = vec2(cos(u_time + 4.188), sin(u_time + 4.188));

          float r = map(p, u_time, dirR * offset).r;
          float g = map(p, u_time, dirG * offset).g;
          float b = map(p, u_time, dirB * offset).b;

          vec3 finalCol = vec3(r, g, b);

          // Moiré interference / Machine hesitation
          float moire = sin(vUv.y * u_resolution.y * 0.8) * 0.04;
          finalCol += moire;

          // Entropy / Glitch Prophet
          float glitch = step(0.995, fract(sin(dot(vUv, vec2(127.1, 311.7)) + u_time * 10.0) * 43758.5453));
          finalCol = mix(finalCol, vec3(1.0) - finalCol, glitch * strain);

          fragColor = vec4(finalCol, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
      },
      vertexShader,
      fragmentShader
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
  } catch (e) {
    console.error("WebGL Initialization Failed:", e);
    if (ctx) {
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, grid.width, grid.height);
      ctx.fillStyle = '#ff0055';
      ctx.font = '16px monospace';
      ctx.fillText('G2 Membrane Failure: WebGL Required', 20, 40);
      ctx.fillText(e.message, 20, 65);
    }
    return;
  }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material && material.uniforms) {
  if (material.uniforms.u_time) material.uniforms.u_time.value = time;
  if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);