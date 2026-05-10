if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({
      canvas,
      context: ctx,
      alpha: true,
      antialias: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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

      // [FERAL MECHANISM]: Chromatic Frequency Shear & Thermal Bloom
      // The blue subpixels operate at a slightly detuned spatial frequency.
      // This causes the blue moire to decouple from the red/green, creating 
      // floating chromatic phantoms instead of purely structural bands.
      // Where interference peaks, the virtual phosphor overloads and smears.

      vec3 ledSubstrate(vec2 uv, float scale, float angle, float blueShear) {
          // Rotate coordinates
          float s = sin(angle);
          float c = cos(angle);
          vec2 st = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y) * scale;
          
          // Spatial frequencies for RGB triads
          float pxR = st.x * 6.2831853;
          float pxG = st.x * 6.2831853;
          float pxB = st.x * 6.2831853 * blueShear; // The deliberate detuning
          
          // Continuous sinusoidal subpixels for smooth liquid interference
          float r = 0.5 + 0.5 * sin(pxR);
          float g = 0.5 + 0.5 * sin(pxG - 2.09439); // 120 deg offset
          float b = 0.5 + 0.5 * sin(pxB - 4.18879); // 240 deg offset
          
          // Horizontal scanlines
          float scan = 0.5 + 0.5 * cos(st.y * 6.2831853);
          
          // Blue-dominant weighting
          return vec3(r * 0.4, g * 0.6, b * 1.5) * scan;
      }

      void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          vec2 aspectUV = uv;
          aspectUV.x *= u_resolution.x / u_resolution.y;

          // Hyperbolic CRT warp for spatial tension
          vec2 centered = aspectUV - vec2(0.5 * (u_resolution.x / u_resolution.y), 0.5);
          float distSq = dot(centered, centered);
          centered *= 1.0 + distSq * 0.15;
          vec2 warpedUV = centered + vec2(0.5 * (u_resolution.x / u_resolution.y), 0.5);

          float t = u_time * 0.15;

          // GRID 1: The Anchor
          float a1 = t * 0.1;
          float scale1 = 140.0; // Dense enough to be a substrate, large enough to see triads
          vec3 g1 = ledSubstrate(warpedUV, scale1, a1, 1.0);

          // GRID 2: The Parasite
          // ~2 degrees offset (0.035 rad) + slow breathing oscillation
          float a2 = a1 + 0.035 + sin(t * 1.5) * 0.008;
          
          // Scale breathing creates the massive expanding/contracting moire waves
          float scale2 = scale1 + sin(t * 0.8) * 1.2;
          
          // Blue shear pulses, causing chromatic separation to drift in and out
          float blueShear = 0.985 + sin(t * 0.5) * 0.015;
          vec3 g2 = ledSubstrate(warpedUV, scale2, a2, blueShear);

          // The Moire Engine: Multiplicative wave interference
          vec3 moire = g1 * g2;

          // Aggressive contrast curve to make fringes dominate the substrate
          moire = pow(moire, vec3(0.7)) * 3.5;

          // Thermal Bloom / Phosphor Overload
          // Calculate perceptual heat of the interference
          float heat = smoothstep(0.6, 1.8, dot(moire, vec3(0.299, 0.587, 0.114)));
          
          // Analog video tracking tear triggered by extreme heat
          float tear = step(0.97, fract(warpedUV.y * 4.0 + u_time * 0.3)) * heat;
          
          // Horizontal smear deformation
          vec2 smearUV = warpedUV + vec2((heat * 0.04 + tear * 0.15) * sin(warpedUV.y * 120.0 + u_time * 15.0), 0.0);
          
          // Sample smeared substrate
          vec3 g1Smear = ledSubstrate(smearUV, scale1, a1, 1.0);
          vec3 g2Smear = ledSubstrate(smearUV, scale2, a2, blueShear);
          vec3 smearedMoire = (g1Smear * g2Smear) * 3.5;

          // Blend pristine moire with damaged thermal smear
          vec3 finalColor = mix(moire, smearedMoire, heat * 0.85);
          
          // Add blinding core bloom
          finalColor += pow(heat, 2.0) * vec3(0.3, 0.7, 1.8);

          // Substrate noise (film grain / sensor noise)
          float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233) + u_time)) * 43758.5453);
          finalColor += (noise - 0.5) * 0.12;

          // Deep optical vignette
          float vig = 1.0 - smoothstep(0.2, 1.4, length(centered));
          finalColor *= vig;

          fragColor = vec4(finalColor, 1.0);
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
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);