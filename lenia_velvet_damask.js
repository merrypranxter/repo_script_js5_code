try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL context not available");

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
      in vec2 vUv;
      out vec4 fragColor;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;

      const float PI = 3.14159265359;

      float hash12(vec2 p) {
        vec3 p3  = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      float stochastic_sparkle(vec2 uv, vec3 N, vec3 V, float density, float sharpness, float time) {
        float NdotV = max(dot(N, V), 0.0);
        float view_factor = pow(NdotV, sharpness);
        float temporal_offset = fract(time * 0.1) * 2.39996;
        vec2 hash_uv = uv * 1000.0 + vec2(cos(temporal_offset), sin(temporal_offset)) * 10.0;
        float h = hash12(hash_uv);
        float threshold = 1.0 - density * view_factor;
        return smoothstep(threshold - 0.01, threshold, h) * view_factor;
      }

      float getDamaskHeight(vec2 uv, float time, out float v_out) {
        vec2 p = uv * 2.5; 
        vec2 tp = abs(fract(p * 0.5) * 2.0 - 1.0); 
        
        vec2 wp = tp + 0.12 * vec2(sin(time * 0.2 + tp.y * 6.28), cos(time * 0.25 - tp.x * 6.28));
        
        float v = 0.0;
        v += 0.50 * sin(wp.x * 6.28) * sin(wp.y * 6.28);
        v += 0.25 * sin(wp.x * 12.56 + time * 0.3) * cos(wp.y * 12.56 + time * 0.35);
        v += 0.15 * sin(wp.x * 25.12 - time * 0.4) * cos(wp.y * 25.12 + time * 0.2);
        
        v = v * 0.5 + 0.5; 
        v_out = v;
        
        float ch0 = exp(-pow(v - 0.65, 2.0) / 0.01); 
        float ch1 = exp(-pow(v - 0.45, 2.0) / 0.02); 
        
        return ch0 * 0.8 + ch1 * 0.4;
      }

      void main() {
        vec2 uv = vUv;
        vec2 aspectUV = uv;
        aspectUV.x *= u_resolution.x / u_resolution.y;

        float v_val;
        float h = getDamaskHeight(aspectUV, u_time, v_val);
        
        vec2 e = vec2(0.005, 0.0);
        float v_temp;
        float hx = getDamaskHeight(aspectUV + e.xy, u_time, v_temp);
        float hy = getDamaskHeight(aspectUV + e.yx, u_time, v_temp);
        
        vec3 N = normalize(vec3(h - hx, h - hy, 0.03));
        vec3 V = vec3(0.0, 0.0, 1.0);
        vec3 L = normalize(vec3(sin(u_time * 0.4), cos(u_time * 0.3), 0.8));

        vec2 mouseDir = uv - u_mouse;
        mouseDir.x *= u_resolution.x / u_resolution.y;
        float brush = exp(-dot(mouseDir, mouseDir) * 30.0);
        
        vec3 nap = normalize(vec3(0.0, -1.0, 0.1));
        nap = normalize(mix(nap, vec3(normalize(mouseDir + vec2(0.0001)), 0.2), brush));

        float ch0 = exp(-pow(v_val - 0.65, 2.0) / 0.01);
        float ch1 = exp(-pow(v_val - 0.45, 2.0) / 0.02);
        float ch_acid = ch0 * ch1 * 3.0;
        float ch_flash = exp(-pow(v_val - 0.55, 2.0) / 0.002);
        float ch_hidden = exp(-pow(v_val - 0.25, 2.0) / 0.005);

        vec3 baseColor = vec3(0.06, 0.01, 0.12); 
        vec3 col = baseColor;
        
        col = mix(col, vec3(0.0, 0.8, 0.9), ch1 * 0.9); 
        col = mix(col, vec3(1.0, 0.0, 0.5), ch0); 
        col += vec3(0.6, 1.0, 0.0) * ch_acid; 
        col += vec3(1.0, 0.6, 0.0) * ch_flash; 
        
        col += vec3(0.0, 1.0, 0.6) * ch_hidden * brush * 2.0;

        float diffuse = max(dot(N, L), 0.0);
        float NdotV = max(dot(N, V), 0.0);
        float sheen = pow(1.0 - NdotV, 2.5);

        vec3 H = normalize(L + V);
        vec3 T = normalize(cross(N, nap));
        float TdotH = dot(T, H);
        float aniso = exp(-pow(TdotH, 2.0) / 0.03);

        vec3 finalColor = col * (0.15 + 0.85 * diffuse);
        finalColor += vec3(0.5, 0.2, 0.8) * sheen * 0.9; 
        finalColor += vec3(1.0, 0.1, 0.6) * aniso * ch0 * 1.5; 

        float sparkle = stochastic_sparkle(aspectUV, N, V, 0.9, 3.0, u_time);
        sparkle *= smoothstep(0.0, 0.5, ch0 + ch1) * (0.5 + sheen);
        finalColor += vec3(1.0, 0.9, 1.0) * sparkle * 2.0;

        fragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
      },
      vertexShader,
      fragmentShader
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);
    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  if (material && material.uniforms) {
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
    if (material.uniforms.u_mouse) {
      const mx = mouse.x / grid.width;
      const my = 1.0 - (mouse.y / grid.height);
      material.uniforms.u_mouse.value.lerp(new THREE.Vector2(mx, my), 0.1);
    }
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("WebGL Lenia Damask Initialization Failed:", e);
  
  // 2D Fallback - Biological Velvet Swirl
  ctx.fillStyle = '#0f021f';
  ctx.fillRect(0, 0, grid.width, grid.height);
  
  for (let i = 0; i < 200; i++) {
    const x = grid.width * (0.5 + 0.4 * Math.sin(time * 0.2 + i * 0.1));
    const y = grid.height * (0.5 + 0.4 * Math.cos(time * 0.3 + i * 0.08));
    const r = 20 + 15 * Math.sin(time + i);
    
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 0, 128, ${0.05 + 0.05 * Math.sin(i)})`;
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r * 0.5), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 200, 255, ${0.1 + 0.1 * Math.cos(i)})`;
    ctx.fill();
  }
}