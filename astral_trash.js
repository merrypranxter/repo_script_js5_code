if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    // Initialize Three.js renderer using the provided WebGL2 context
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    renderer.autoClearColor = false;
    
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Create an offscreen canvas to generate the "ASTRAL TRASH" typographic magnetic field
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 1024;
    textCanvas.height = 1024;
    const tctx = textCanvas.getContext('2d');

    // Draw typographic force field
    tctx.fillStyle = '#000000';
    tctx.fillRect(0, 0, 1024, 1024);
    
    tctx.textAlign = 'center';
    tctx.textBaseline = 'middle';
    
    // 1. Broad magnetic aura (blur)
    tctx.filter = 'blur(40px)';
    tctx.fillStyle = '#ffffff';
    tctx.font = '900 180px Impact, "Arial Black", sans-serif';
    tctx.fillText("ASTRAL", 512, 400);
    tctx.fillText("TRASH", 512, 624);
    
    // 2. Sharp outer containment boundary
    tctx.filter = 'none';
    tctx.lineWidth = 12;
    tctx.strokeStyle = '#ffffff';
    tctx.strokeText("ASTRAL", 512, 400);
    tctx.strokeText("TRASH", 512, 624);

    // 3. Inner void (erodes the center of the letters)
    tctx.fillStyle = '#333333';
    tctx.fillText("ASTRAL", 512, 400);
    tctx.fillText("TRASH", 512, 624);
    
    // 4. Core energetic filament
    tctx.lineWidth = 2;
    tctx.strokeStyle = '#ffffff';
    tctx.setLineDash([10, 15]);
    tctx.strokeText("ASTRAL", 512, 400);
    tctx.strokeText("TRASH", 512, 624);

    const textTexture = new THREE.CanvasTexture(textCanvas);
    textTexture.minFilter = THREE.LinearFilter;
    textTexture.magFilter = THREE.LinearFilter;
    textTexture.wrapS = THREE.ClampToEdgeWrapping;
    textTexture.wrapT = THREE.ClampToEdgeWrapping;

    // The Shader Material
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
        u_textMap: { value: textTexture }
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

        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        uniform sampler2D u_textMap;

        // Hash & Noise for structural material generation
        vec2 hash2(vec2 p) {
            p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
            return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix( mix( dot( hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0) ),
                             dot( hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0) ), u.x),
                        mix( dot( hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0) ),
                             dot( hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0) ), u.x), u.y);
        }

        // Fractal Brownian Motion
        float fbm(vec2 p) {
            float f = 0.0;
            float amp = 0.5;
            for(int i = 0; i < 5; i++) {
                f += amp * noise(p);
                p *= 2.0;
                amp *= 0.5;
            }
            return f;
        }

        // Origami / Ferrofluid Ridge Function
        float ridge(float n) {
            return pow(1.0 - abs(n), 3.0);
        }

        void main() {
            vec2 uv = vUv;
            vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
            vec2 p = (uv - 0.5) * aspect + 0.5;

            // Sample Typographic Magnetic Field
            float textField = texture(u_textMap, uv).r;

            // --- THREE TIME SCALES ---
            // 1. Slow: Global tectonic drift
            float tSlow = u_time * 0.05;
            // 2. Medium: Chemical oscillation (BZ reaction / Ferrofluid spikes)
            float tMed = u_time * 0.4;
            // 3. Fast: Quantum dust / Chromatic flicker
            float tFast = u_time * 12.0;

            // --- DOMAIN WARPING (The Host Material) ---
            vec2 q = vec2(fbm(p * 3.0 + tSlow), fbm(p * 3.0 + vec2(5.2, 1.3) - tSlow));
            
            // The text field exerts a magnetic pull, warping the domain heavily where text exists
            vec2 r = vec2(
                fbm(p * 5.0 + 4.0 * q + tMed) + textField * 0.5,
                fbm(p * 5.0 + 4.0 * q + vec2(8.3, 2.8) - tMed) + textField * 0.5
            );

            // --- FAST CHROMATIC ABERRATION (Psychedelic Collage Print Artifact) ---
            // Introduce high-frequency jitter for misregistration
            float jitter = (fract(sin(dot(uv, vec2(12.9898, 78.233)) + tFast)) - 0.5) * 0.015;
            
            // Calculate 3 separate UVs for Cyan, Magenta, Yellow
            vec2 uvC = p + vec2(0.012 + jitter, 0.0);
            vec2 uvM = p + vec2(-0.006 + jitter, 0.01);
            vec2 uvY = p + vec2(-0.006 + jitter, -0.01);

            // --- MATERIAL STRUCTURE FUNCTION ---
            // Evaluates the physical ridges (origami creases / ferrofluid spikes)
            // The text mask acts as a frequency multiplier, causing dense crystallization inside the letters
            float baseFreq = 8.0 + textField * 15.0;

            float valC = ridge(noise(uvC * baseFreq + 5.0 * r + tMed));
            float valM = ridge(noise(uvM * baseFreq + 5.0 * r + tMed));
            float valY = ridge(noise(uvY * baseFreq + 5.0 * r + tMed));

            // --- COLOR PALETTE (Cyberdelic Neon over Void Black) ---
            vec3 voidBlack = vec3(0.015, 0.023, 0.031);
            vec3 neonCyan = vec3(0.0, 1.0, 0.94);
            vec3 elecMagenta = vec3(1.0, 0.0, 0.8);
            vec3 acidYellow = vec3(1.0, 0.9, 0.0);

            // Map structural values to colors
            vec3 colorC = mix(voidBlack, neonCyan, valC);
            vec3 colorM = mix(voidBlack, elecMagenta, valM);
            vec3 colorY = mix(voidBlack, acidYellow, valY);

            // Screen Blend Compositing
            vec3 finalColor = 1.0 - (1.0 - colorC) * (1.0 - colorM) * (1.0 - colorY);

            // --- BELOUSOV-ZHABOTINSKY TARGET WAVES ---
            // Chemical rings expanding outward from the typography
            float bzRings = abs(sin(textField * 30.0 - tMed * 4.0));
            bzRings = pow(bzRings, 8.0); // Sharpen wavefronts
            finalColor += elecMagenta * bzRings * textField * 0.6;

            // --- SHINY ECOLOGY (Quantum Dust / Mirror Flakes) ---
            // Blue-noise-like glitter embedded in the material
            float glitter = step(0.96, fract(sin(dot(p * 150.0, vec2(17.3, 41.2))) * 43758.5));
            float sparkle = glitter * (0.5 + 0.5 * sin(tFast + p.x * 200.0));
            // Glitter concentrates on the physical ridges
            finalColor += sparkle * (valC + valM + valY) * vec3(1.0, 1.0, 0.9);

            // --- PRINT ARTIFACTS (Halftone Screen) ---
            // Convert luminance to dot radius
            float luma = dot(finalColor, vec3(0.299, 0.587, 0.114));
            float sAngle = 0.785398; // 45 degrees
            mat2 rot = mat2(cos(sAngle), -sin(sAngle), sin(sAngle), cos(sAngle));
            vec2 hUv = rot * uv * 250.0; // Halftone frequency
            float dots = sin(hUv.x) * sin(hUv.y);
            // Multiply blend the halftone softly into the midtones
            float htMask = smoothstep(-0.5, 0.5, dots + (luma * 1.5 - 0.2));
            finalColor *= mix(0.7, 1.0, htMask);

            // --- AGED XEROX GRAIN ---
            float grain = fract(sin(dot(uv + tFast, vec2(127.1, 311.7))) * 43758.5453);
            finalColor += (grain - 0.5) * 0.1;

            // Vignette
            float vig = length(uv - 0.5);
            finalColor *= smoothstep(0.8, 0.2, vig);

            fragColor = vec4(finalColor, 1.0);
        }
      `
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
  if (material.uniforms.u_time) {
    material.uniforms.u_time.value = time;
  }
  if (material.uniforms.u_mouse) {
    material.uniforms.u_mouse.value.set(
      mouse.x / grid.width,
      1.0 - (mouse.y / grid.height) // Flip Y for WebGL
    );
  }
  if (material.uniforms.u_resolution) {
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);