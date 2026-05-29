try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL context not available");

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
      precision highp float;
      
      in vec2 vUv;
      out vec4 fragColor;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;

      // Mathematical noise functions
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                   mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
      }

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

      // Highly acidic, vibrating color palette
      vec3 acidPalette(float t) {
        // High frequency neon oscillation
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.5);
        vec3 c = vec3(2.0, 1.5, 1.0);
        vec3 d = vec3(0.0, 0.33, 0.67);
        vec3 base = a + b * cos(6.28318 * (c * t + d));
        
        // Push towards neon/acidic (magenta, lime, cyan)
        base = mix(base, vec3(1.0, 0.0, 1.0), step(0.8, sin(t * 15.0)));
        base = mix(base, vec3(0.8, 1.0, 0.0), step(0.8, cos(t * 23.0)));
        
        // Over-saturate
        float luma = dot(base, vec3(0.299, 0.587, 0.114));
        return clamp(base + (base - luma) * 1.5, 0.0, 1.0);
      }

      void main() {
        // Centered coordinates accounting for aspect ratio
        vec2 p = (vUv - 0.5) * 2.0;
        p.x *= u_resolution.x / u_resolution.y;

        // 1. TOPOLOGICAL FOLDING (The Strange Mechanism)
        // We fold the fabric into a spherical inversion (accretion disk)
        float r = length(p);
        float theta = atan(p.y, p.x);
        
        // Hyperbolic warp: pulling the threads into a singularity
        vec2 warped_p = p / (dot(p, p) + 0.05); 
        
        // Add rotational twist over time
        float twist = sin(r * 4.0 - u_time * 2.0) * 0.5;
        float c_t = cos(twist), s_t = sin(twist);
        warped_p = vec2(warped_p.x * c_t - warped_p.y * s_t, 
                        warped_p.x * s_t + warped_p.y * c_t);

        // 2. CHEMICAL DYE BLEED (Domain Warping)
        // Simulate acidic dye reacting and diffusing along the warp/weft
        vec2 fluid_shift = vec2(
          fbm(warped_p * 3.0 + u_time * 0.5),
          fbm(warped_p * 3.0 - u_time * 0.4)
        );
        warped_p += (fluid_shift - 0.5) * 0.4;

        // 3. WEAVE MATRIX (Jacquard / Twill / CA Hybrid)
        // Dynamic thread density to simulate machine hesitation/glitch
        float base_density = 60.0;
        float glitch = step(0.95, noise(vec2(u_time * 5.0, vUv.y * 10.0)));
        float density = mix(base_density, base_density * 0.25, glitch);

        vec2 thread_uv = warped_p * density;
        vec2 cell = floor(thread_uv);
        vec2 fract_uv = fract(thread_uv);

        // XOR Fractal Logic for the Jacquard pattern
        int ix = int(cell.x);
        int iy = int(cell.y);
        float xor_pattern = float((ix ^ iy) % 5 == 0 ? 1.0 : 0.0);
        
        // Twill weave logic
        float twill = step(2.0, mod(cell.x + cell.y + u_time * 10.0, 4.0));
        
        // Fungal succession: The XOR logic overtakes the Twill logic via noise
        float parasite_mask = smoothstep(0.3, 0.7, fbm(cell * 0.05 - u_time * 0.2));
        float warp_over = mix(twill, xor_pattern, parasite_mask);

        // Add physical fuzz/fraying to the thread edges
        float fuzz = noise(thread_uv * 20.0);
        warp_over = mix(warp_over, step(0.5, fuzz), 0.1); // 10% structural breakdown

        // 4. COLOR AND SHADING
        // Acidic dye colors mapped to thread IDs
        vec3 warp_color = acidPalette(cell.x * 0.015 + u_time * 0.2 + fluid_shift.x);
        vec3 weft_color = acidPalette(cell.y * 0.015 - u_time * 0.1 + fluid_shift.y + 0.5);

        // Cylindrical volume of the threads
        float warp_cyl = sin(fract_uv.x * 3.14159);
        float weft_cyl = sin(fract_uv.y * 3.14159);
        
        // High-gloss specular highlights (Synthetic retrofuture fibers)
        float warp_spec = pow(warp_cyl, 12.0) * 1.5;
        float weft_spec = pow(weft_cyl, 12.0) * 1.5;

        vec3 color;
        if (warp_over > 0.5) {
            // Warp thread is on top
            float shadow = mix(0.2, 1.0, weft_cyl); // Occlusion from thread below
            color = warp_color * warp_cyl * shadow + warp_spec * vec3(0.8, 1.0, 0.9);
        } else {
            // Weft thread is on top
            float shadow = mix(0.2, 1.0, warp_cyl);
            color = weft_color * weft_cyl * shadow + weft_spec * vec3(0.9, 0.8, 1.0);
        }

        // Chromatic aberration / Dye bleed at the macro scale
        float bleed_edge = smoothstep(0.4, 0.6, noise(warped_p * 10.0));
        color = mix(color, color.brg, bleed_edge * 0.3 * parasite_mask);

        // Vignette deep space fade
        float vignette = 1.0 - smoothstep(0.5, 2.0, r);
        color *= vignette;

        fragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0, 0) }
      },
      depthWrite: false,
      depthTest: false
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(plane);

    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  // Safe uniform updates
  if (material && material.uniforms) {
    if (material.uniforms.u_time) {
      material.uniforms.u_time.value = time;
    }
    if (material.uniforms.u_resolution) {
      material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
    if (material.uniforms.u_mouse) {
      // Normalize mouse coordinates for the shader
      const mx = mouse.x / grid.width;
      const my = 1.0 - (mouse.y / grid.height);
      material.uniforms.u_mouse.value.set(mx, my);
    }
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("Feral Weave Initialization Failed:", e);
  
  // Fallback visual in case WebGL context is lost or unsupported
  if (ctx && ctx.fillRect) {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, grid.width, grid.height);
    ctx.fillStyle = '#ff00ff';
    ctx.font = '14px monospace';
    ctx.fillText("WEAVE TENSION FAILURE: WebGL Context Lost", 20, 40);
  }
}