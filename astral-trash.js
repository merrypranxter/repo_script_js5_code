try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL 2 context not available");

    // 1. Generate Feral SDF Text via Offscreen Canvas
    // We use Canvas 2D to create a rich, multi-pass mask that acts as our base substance topology.
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 1024;
    offCanvas.height = 1024;
    const octx = offCanvas.getContext('2d', { willReadFrequently: true });

    octx.fillStyle = '#000000';
    octx.fillRect(0, 0, 1024, 1024);

    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    // Using an aggressive, brutalist font stack
    octx.font = '900 180px "Impact", "Arial Black", sans-serif';

    // Pass 1: Massive blur to create the outer SDF gradient (the "halo" of the substance)
    octx.shadowColor = '#FFFFFF';
    octx.shadowBlur = 60;
    octx.fillStyle = '#FFFFFF';
    octx.fillText("ASTRAL", 512, 380);
    octx.fillText("TRASH", 512, 620);

    // Pass 2: Mid-level topological shelf
    octx.shadowBlur = 20;
    octx.fillStyle = '#888888';
    octx.fillText("ASTRAL", 512, 380);
    octx.fillText("TRASH", 512, 620);

    // Pass 3: Hard core + physical damage cuts
    octx.shadowBlur = 0;
    octx.fillStyle = '#FFFFFF';
    octx.fillText("ASTRAL", 512, 380);
    octx.fillText("TRASH", 512, 620);
    
    // Add structural "glitch" slices to the mask
    octx.fillStyle = '#000000';
    for(let i = 0; i < 15; i++) {
        let y = Math.random() * 1024;
        let h = Math.random() * 8 + 2;
        octx.fillRect(0, y, 1024, h);
    }

    const textTexture = new THREE.CanvasTexture(offCanvas);
    textTexture.minFilter = THREE.LinearFilter;
    textTexture.magFilter = THREE.LinearFilter;
    textTexture.wrapS = THREE.ClampToEdgeWrapping;
    textTexture.wrapT = THREE.ClampToEdgeWrapping;

    // 2. Initialize Three.js
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    // 3. The Lithogenic / Cymatic Shader
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_textMask: { value: textTexture }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        in vec2 vUv;
        out vec4 fragColor;

        uniform sampler2D u_textMask;
        uniform float u_time;
        uniform vec2 u_resolution;

        // Hardware-level glitch/entropy hash
        float hash(vec2 p) { 
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); 
        }

        // Value noise for structural foundation
        float noise(vec2 p) {
            vec2 i = floor(p); 
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
                mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), 
                f.y
            );
        }

        // Fractal Brownian Motion (Domain Warping)
        float fbm(vec2 p, float t) {
            float v = 0.0; 
            float a = 0.5;
            p += t * 0.2;
            for(int i = 0; i < 5; i++) {
                v += a * noise(p);
                // Rotate and scale to break grid alignment
                p = p * 2.0 * mat2(0.8, -0.6, 0.6, 0.8);
                a *= 0.5;
            }
            return v;
        }

        // Divergence-free curl noise (Fluid Advection)
        vec2 curl(vec2 p, float t) {
            float e = 0.01;
            float dx = fbm(p + vec2(e, 0.0), t) - fbm(p - vec2(e, 0.0), t);
            float dy = fbm(p + vec2(0.0, e), t) - fbm(p - vec2(0.0, e), t);
            return vec2(dy, -dx);
        }

        void main() {
            // Three simultaneous time scales
            float t_slow = u_time * 0.15;   // Tectonic drift / domain warp
            float t_med  = u_time * 0.8;    // Structural motion / fluid flow
            float t_fast = u_time * 4.0;    // Detail shimmer / interference

            // Aspect-corrected UVs for noise, normalized [0,1] for texture
            vec2 uv = vUv;
            vec2 aspectUv = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) + 0.5;

            // DAMAGE AESTHETICS: Macroblocking & Sync Instability
            // Quantize UVs in specific regions based on medium-time hash
            vec2 block_uv = floor(uv * 40.0) / 40.0;
            float block_noise = hash(block_uv + floor(t_med * 2.0));
            if(block_noise > 0.94) {
                uv = mix(uv, block_uv, 0.8);
                aspectUv = mix(aspectUv, block_uv, 0.8);
            }

            // MORPHOGENESIS: Curl advection pushing the substrate
            vec2 flow = curl(aspectUv * 3.0, t_slow);
            vec2 warped_uv = uv + flow * 0.08;

            // CHROMATIC ABERRATION & TEXT SAMPLING
            // The text acts as a physical boundary condition (SDF thickness map)
            float maskR = texture(u_textMask, warped_uv + flow * 0.012).r;
            float maskG = texture(u_textMask, warped_uv).r;
            float maskB = texture(u_textMask, warped_uv - flow * 0.012).r;
            float mask = (maskR + maskG + maskB) / 3.0;

            // LITHOGENESIS & STRUCTURAL COLOR
            // Calculate a local "thickness" based on the text SDF and cymatic noise
            float structure = fbm(aspectUv * 12.0 - flow, t_med);
            float thickness = mask * 15.0 + structure * 6.0;

            // Thin-film interference simulation (Bragg reflection approximation)
            // Using incommensurate frequencies for CMY neon channels
            float c_phase = thickness * 1.1 + t_fast * 0.2;
            float m_phase = thickness * 1.4 + 2.0 + t_fast * 0.25;
            float y_phase = thickness * 1.8 + 4.0 + t_fast * 0.3;

            float c_val = 0.5 + 0.5 * sin(c_phase);
            float m_val = 0.5 + 0.5 * sin(m_phase);
            float y_val = 0.5 + 0.5 * sin(y_phase);

            // Base Palette: Void Black with CMY Neons
            vec3 col = vec3(0.0);
            
            // Inject color modulated by the channel-split mask to emphasize aberration
            col += vec3(0.0, 1.0, 1.0) * pow(c_val, 2.5) * maskR; // Cyan
            col += vec3(1.0, 0.0, 1.0) * pow(m_val, 2.5) * maskG; // Magenta
            col += vec3(1.0, 1.0, 0.0) * pow(y_val, 2.5) * maskB; // Yellow

            // MINERAL ALCHEMY: Sharp interference ridges (Agate/Malachite domain warp)
            float ridge = abs(fbm(warped_uv * 10.0, -t_slow));
            float sharp = 0.003 / (ridge + 0.001);
            // Apply ridges mostly where the mask exists
            col += vec3(0.0, 1.0, 1.0) * sharp * mask * 0.6;

            // DAMAGE: Film Grain / High-frequency shimmer
            float grain = hash(uv * u_resolution + t_fast);
            col *= 0.85 + 0.3 * grain;

            // VOID BLACK FALLOFF: The substance only exists where mask or heavy structure is
            float void_mask = smoothstep(0.02, 0.25, mask + structure * 0.15);
            col *= void_mask;

            // PHOSPHOR BLOOM: Add an over-exposed hot core to the thickest parts of the text
            float core_bloom = smoothstep(0.6, 0.9, mask);
            col += vec3(1.0, 0.2, 1.0) * core_bloom * 0.4;

            // Final clamp to prevent crazy overdrive, though some clipping adds to the neon look
            fragColor = vec4(clamp(col, 0.0, 1.2), 1.0);
        }
      `
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material, textTexture };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  if (material && material.uniforms) {
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) {
      material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("Feral Lithogenesis Initialization Failed:", e);
}