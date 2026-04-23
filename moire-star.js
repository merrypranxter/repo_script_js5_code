if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    
    // Orthographic camera is perfect for flat shader planes
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      
      out vec4 fragColor;

      // --------------------------------------------------------
      // STRIPE FLUID DISTORTION (Op Art Repo)
      // Simplex 2D noise for organic domain warping
      // --------------------------------------------------------
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
      
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      // --------------------------------------------------------
      // SPIRAL PHANTOMS + RADIAL COMPRESSION (Moire & Op Art Repos)
      // --------------------------------------------------------
      float spiralMoire(vec2 uv, float scale, float angleOffset, vec2 drift, float arms) {
        // Apply individual channel rotation
        float c = cos(angleOffset);
        float s = sin(angleOffset);
        vec2 rotUV = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);

        float r = length(rotUV);
        float theta = atan(rotUV.y, rotUV.x);
        
        // Retinal Op Funnel: log(r) creates infinite compression toward center
        // Archimedean spiral phase equation
        float phase1 = theta * arms + log(r + 0.005) * scale;
        
        // The "Phantom": a second spiral offset by drift, creating interference
        vec2 driftUV = rotUV + drift;
        float phase2 = atan(driftUV.y, driftUV.x) * arms + log(length(driftUV) + 0.005) * (scale + 0.5);
        
        // Multiplicative blending for natural wave interference
        float g1 = 0.5 + 0.5 * sin(phase1);
        float g2 = 0.5 + 0.5 * sin(phase2);
        
        // Contrast push to extract the moire beat frequency
        return smoothstep(0.2, 0.8, g1 * g2);
      }

      void main() {
        // Centered aspect-corrected UV
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        
        // Observer-Dependent Secret (Anamorphic shift via mouse)
        vec2 mouse = u_mouse / u_resolution.xy;
        mouse = (mouse * 2.0 - 1.0) * 0.15;

        // Apply global fluid distortion (Psychedelic Contamination)
        float n = snoise(uv * 2.5 + u_time * 0.15) * 0.06;
        vec2 warpedUV = uv + vec2(n, -n);

        // --------------------------------------------------------
        // CMYK SEPARATION MOIRE (Weaponizing the Registration Error)
        // --------------------------------------------------------
        float t = u_time * 0.3;
        
        // Perturbed halftone angles
        float aC = radians(15.0 + sin(t * 0.5) * 5.0);
        float aM = radians(75.0 + cos(t * 0.7) * 5.0);
        float aY = radians(0.0 + sin(t * 0.3) * 5.0);
        float aK = radians(45.0 + cos(t * 0.4) * 5.0);

        // Tightness scale (determines fringe density)
        float baseScale = 45.0;
        float arms = 5.0; // 5-arm spiral
        
        // Micro-drifts causing the interference pattern to mutate
        vec2 dC = vec2(sin(t), cos(t)) * 0.015 + mouse;
        vec2 dM = vec2(cos(t*1.2), sin(t*0.9)) * 0.015 - mouse;
        vec2 dY = vec2(sin(t*0.8), cos(t*1.1)) * 0.015 + vec2(mouse.y, -mouse.x);
        vec2 dK = vec2(cos(t*1.3), sin(t*0.7)) * 0.015;

        // Generate the 4 interference layers
        float c_val = spiralMoire(warpedUV, baseScale, aC, dC, arms);
        float m_val = spiralMoire(warpedUV, baseScale + 0.5, aM, dM, arms);
        float y_val = spiralMoire(warpedUV, baseScale + 1.0, aY, dY, arms);
        float k_val = spiralMoire(warpedUV, baseScale - 0.5, aK, dK, arms);

        // --------------------------------------------------------
        // ACID PALETTE & CHROMATIC COMPOSITING
        // --------------------------------------------------------
        // Additive mixing of CMY to reveal vivid interference fringes
        vec3 color = vec3(0.0);
        color += vec3(0.0, 1.0, 1.0) * c_val; // Cyan
        color += vec3(1.0, 0.0, 1.0) * m_val; // Magenta
        color += vec3(1.0, 1.0, 0.0) * y_val; // Yellow
        
        // Black channel absorbs light, carving out the structure
        color *= (1.0 - k_val * 0.85);

        // Acid Palette Overdrive (gamma shift)
        color = pow(color, vec3(0.7, 0.85, 0.6));
        
        // Retinal Op Edge Behavior: Hard contrast push
        color = smoothstep(0.1, 1.4, color);

        // False Depth: Darken the center "throat" and the outer edges
        float dist = length(uv);
        float funnel = smoothstep(0.08, 0.3, dist); // Center throat
        float vignette = smoothstep(1.2, 0.3, dist); // Outer edge
        
        color *= funnel * vignette;

        // Chromatic bloom in the deep center (Plush Candy logic)
        float coreGlow = exp(-dist * 12.0);
        color += vec3(0.9, 0.1, 0.5) * coreGlow * (1.0 - k_val);

        fragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0, 0) }
      },
      vertexShader,
      fragmentShader,
      depthWrite: false,
      depthTest: false
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material, mouseTarget: new THREE.Vector2() };
  } catch (e) {
    console.error("WebGL Initialization Failed:", e);
    return;
  }
}

const { renderer, scene, camera, material, mouseTarget } = canvas.__three;

if (material && material.uniforms) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  
  // Smooth mouse interpolation for observer-dependent anamorphic shift
  const targetX = mouse.x;
  const targetY = grid.height - mouse.y; // Invert Y for GLSL coordinate space
  
  if (mouse.isPressed) {
      mouseTarget.set(targetX, targetY);
  } else {
      // Gentle drift when not interacting
      mouseTarget.x += (Math.sin(time * 0.5) * grid.width * 0.1 - mouseTarget.x) * 0.02;
      mouseTarget.y += (Math.cos(time * 0.4) * grid.height * 0.1 - mouseTarget.y) * 0.02;
  }
  
  material.uniforms.u_mouse.value.lerp(mouseTarget, 0.05);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);