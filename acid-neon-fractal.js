try {
  if (!ctx) throw new Error("WebGL 2 context not available");

  if (!canvas.__three) {
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
    camera.position.z = 1;

    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      
      in vec2 vUv;
      out vec4 fragColor;

      // ============================================================
      // FUNGAL NOISE / MYCELIAL ROT (Repo 5)
      // ============================================================
      vec2 hash2(vec2 p) {
          p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
          return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                         dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
                     mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                         dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
      }

      float fbm(vec2 p) {
          float f = 0.0; 
          float a = 0.5;
          for(int i = 0; i < 5; i++) { 
              f += a * noise(p); 
              p *= 2.0; 
              a *= 0.5; 
          }
          return f;
      }

      // ============================================================
      // ACID NEON PALETTE (Repo 2: Color Fields)
      // ============================================================
      vec3 acidNeon(float t) {
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.33);
          vec3 c = vec3(2.0, 1.0, 1.0);
          vec3 d = vec3(0.5, 0.2, 0.25);
          return a + b * cos(6.28318 * (c * t + d));
      }

      // ============================================================
      // STRUCTURAL COLOR / IRIDESCENCE (Repo 4)
      // ============================================================
      vec3 iridescence(float t) {
          return 0.5 + 0.5 * cos(6.28318 * (vec3(1.0, 1.3, 1.6) * t + vec3(0.0, 0.33, 0.67)));
      }

      // ============================================================
      // HALFTONE PRINT ARTIFACT (Repo 9: Psychedelic Collage)
      // ============================================================
      float halftone(vec2 fragCoord, float luma) {
          float angle = 0.785398; // 45 degrees
          float freq = 140.0;
          mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
          vec2 uv = rot * fragCoord * freq / u_resolution.x;
          vec2 cell = fract(uv) - 0.5;
          float dist = length(cell);
          float dotRadius = sqrt(1.0 - luma) * 0.55;
          return smoothstep(dotRadius + 0.1, dotRadius - 0.1, dist);
      }

      // ============================================================
      // FRACTAL ENGINE WITH MYCELIAL MUTATION (Repos 1 & 5)
      // ============================================================
      vec3 fungalFractal(vec2 z0) {
          vec2 z = z0;
          // Drifting Julia Set Parameter
          vec2 c = vec2(-0.745, 0.113) + vec2(sin(u_time * 0.25) * 0.04, cos(u_time * 0.15) * 0.04);
          
          float n = 0.0;
          float trap = 1e10;
          float fungal_density = 0.0;
          
          const int MAX_ITER = 75;
          
          for(int i = 0; i < MAX_ITER; i++) {
              // Mycelial Enzyme Secretion: mutates the complex plane dynamically
              // Fungal infection bridges Julia Set with Burning Ship logic
              float enzyme = smoothstep(0.0, 0.4, fbm(z * 2.5 + u_time * 0.6));
              fungal_density += enzyme;
              
              // The mutation: absolute value folding triggered by fungal noise
              vec2 mutated_z = mix(z, vec2(abs(z.x), abs(z.y)), enzyme * 0.35);
              
              // Standard z = z^2 + c iteration
              z = vec2(mutated_z.x * mutated_z.x - mutated_z.y * mutated_z.y, 2.0 * mutated_z.x * mutated_z.y) + c;
              
              // Orbit trap (cross shape)
              trap = min(trap, min(abs(z.x), abs(z.y)));
              
              if(dot(z, z) > 256.0) {
                  float log_zn = log(dot(z, z)) * 0.5;
                  float nu = log(log_zn / 0.693147) / 0.693147;
                  n = float(i) + 1.0 - nu;
                  break;
              }
          }
          return vec3(n, trap, fungal_density / float(MAX_ITER));
      }

      void main() {
          vec2 uv = vUv;
          vec2 p = (uv - 0.5) * 2.8 * vec2(u_resolution.x / u_resolution.y, 1.0);
          
          // Slow geometric rotation and breathing zoom
          float theta = u_time * 0.08;
          mat2 rot = mat2(cos(theta), -sin(theta), sin(theta), cos(theta));
          p = rot * p;
          p *= 1.0 - 0.2 * sin(u_time * 0.3); 
          
          // ============================================================
          // CMYK MISREGISTRATION / GLITCH (Repo 9)
          // ============================================================
          vec2 glitchOffset = normalize(p + 0.001) * 0.025 * fbm(p * 15.0 - u_time * 1.2);
          
          // Multi-sample for RGB channel separation
          vec3 resR = fungalFractal(p + glitchOffset);
          vec3 resG = fungalFractal(p);
          vec3 resB = fungalFractal(p - glitchOffset);
          
          // Map smooth iteration count to Acid Neon palette
          vec3 colR = acidNeon(resR.x * 0.04 - u_time * 0.4);
          vec3 colG = acidNeon(resG.x * 0.04 - u_time * 0.4);
          vec3 colB = acidNeon(resB.x * 0.04 - u_time * 0.4);
          
          // Combine separated channels
          vec3 color = vec3(colR.r, colG.g, colB.b);
          
          // Interior of the fractal (did not escape)
          if(resG.x == 0.0) {
              color = vec3(0.02, 0.0, 0.05); // Void black
          }
          
          // ============================================================
          // STRUCTURAL COLOR IN ORBIT TRAPS (Repo 4)
          // ============================================================
          float avgTrap = (resR.y + resG.y + resB.y) / 3.0;
          vec3 iri = iridescence(avgTrap * 3.0 - u_time * 0.2);
          color = mix(color, iri, exp(-avgTrap * 12.0));
          
          // ============================================================
          // WHITE ROT BLEACHING (Repo 5)
          // ============================================================
          float avgFungus = (resR.z + resG.z + resB.z) / 3.0;
          color = mix(color, vec3(0.8, 1.0, 0.7), smoothstep(0.2, 0.7, avgFungus));
          
          // ============================================================
          // HALFTONE PRINT ARTIFACT OVERLAY (Repo 9)
          // ============================================================
          float luma = dot(color, vec3(0.299, 0.587, 0.114));
          float ht = halftone(gl_FragCoord.xy, luma);
          
          // Multiply blend with a toxic deep-purple ink base
          vec3 inkColor = mix(vec3(0.1, 0.0, 0.2), vec3(1.0), ht);
          color *= inkColor;
          
          // Additive screen blend for intense neon pop
          color += (1.0 - ht) * vec3(0.1, 0.3, 0.1) * smoothstep(0.5, 1.0, luma);
          
          // Vignette
          float vignette = 1.0 - smoothstep(0.3, 1.4, length(vUv - 0.5));
          color *= vignette;
          
          fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
      },
      vertexShader,
      fragmentShader,
      depthWrite: false,
      depthTest: false
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  if (material && material.uniforms) {
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("WebGL Initialization or Render Failed:", e);
}