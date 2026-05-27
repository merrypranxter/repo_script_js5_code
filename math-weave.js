if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;
    
    const fragmentShader = `
      out vec4 fragColor;
      in vec2 vUv;
      uniform float u_time;
      uniform vec2 u_resolution;

      // --- Simplex Noise & FBM ---
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m; m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
      }

      float fbm(vec2 p) {
          float f = 0.0;
          float amp = 0.5;
          for(int i=0; i<5; i++){
              f += amp * snoise(p);
              p *= 2.0;
              amp *= 0.5;
          }
          return f * 0.5 + 0.5;
      }

      // --- Weaving Patterns: 2/2 Herringbone Twill ---
      float herringbone(vec2 p, float scale) {
          p *= scale;
          
          float warp = smoothstep(0.0, 0.8, abs(sin(p.x * 3.14159)));
          float weft = smoothstep(0.0, 0.8, abs(sin(p.y * 3.14159)));
          
          float zig_width = 24.0;
          float zig = abs(fract(p.x / zig_width) - 0.5) * 2.0;
          float twill_x = zig * zig_width;
          
          float diag = fract((twill_x + p.y) * 0.25);
          float over = step(0.5, diag);
          
          float thread = mix(weft, warp, over);
          
          // Ambient occlusion at float intersections
          float shadow = abs(diag - 0.5) * 2.0; 
          thread *= mix(0.4, 1.0, shadow);
          
          // Organic fiber noise
          thread -= snoise(p * 2.0) * 0.1;
          
          return clamp(thread, 0.0, 1.0);
      }

      // --- Color Systems & Resist Dye: Golden Angle Shibori ---
      float golden_dye(vec2 uv, float time) {
          float total_dye = 0.0;
          for(int i = 1; i <= 10; i++) {
              float fi = float(i);
              float r = sqrt(fi) * 0.15;
              // Golden Angle (137.508 degrees = 2.39996 rad)
              float theta = fi * 2.39996 + time * 0.05;
              vec2 node_pos = vec2(cos(theta), sin(theta)) * r;
              
              vec2 p = uv - (node_pos + 0.5); 
              float dist = length(p);
              float angle = atan(p.y, p.x);
              
              // Shibori folds (Kumo/Arashi)
              float folds = abs(sin(angle * 4.0 + fbm(p * 6.0) * 2.0));
              float rings = abs(sin(dist * 50.0 - time * 1.5));
              
              // Capillary bleed
              float bleed = fbm(p * 10.0 - time * 0.1);
              
              // Resist islands
              float resist = smoothstep(0.2, 0.7, rings * folds + bleed * 0.5);
              
              // Dye concentration gradient
              float node_dye = (1.0 - resist) * smoothstep(0.35, 0.0, dist); 
              
              // Micro-bleeds
              node_dye += fbm(p * 40.0) * 0.1 * smoothstep(0.4, 0.1, dist);
              
              total_dye = max(total_dye, node_dye);
          }
          return total_dye;
      }

      // --- Color Fields: Cosmic/Acid Ice Dye Palette ---
      vec3 get_dye_color(float t) {
          t = clamp(t, 0.0, 1.0);
          vec3 c1 = vec3(0.0, 0.8, 0.9);    // Cyan edge
          vec3 c2 = vec3(0.8, 0.1, 0.9);    // Purple mid
          vec3 c3 = vec3(0.05, 0.0, 0.15);  // Cosmic dark core
          
          if (t < 0.5) return mix(c1, c2, t * 2.0);
          return mix(c2, c3, (t - 0.5) * 2.0);
      }

      float vignette(vec2 uv, float strength, float radius) {
          float d = length(uv - 0.5) * 2.0;
          return 1.0 - smoothstep(radius, radius + strength, d);
      }

      void main() {
          // Aspect correction
          vec2 aspect_uv = vUv;
          aspect_uv.x = (aspect_uv.x - 0.5) * (u_resolution.x / u_resolution.y) + 0.5;
          
          // Generate Herringbone weave structure
          float weave = herringbone(aspect_uv, 120.0);
          
          // Generate Shibori dye mapping
          float dye_intensity = golden_dye(aspect_uv, u_time);
          
          // Global background diffusion
          float bg_diffusion = fbm((aspect_uv - 0.5) * 2.0 + u_time * 0.05);
          dye_intensity += bg_diffusion * 0.4;
          
          // Capillary action along threads
          float capillary = snoise(aspect_uv * 120.0) * 0.1;
          dye_intensity = clamp(dye_intensity + capillary * dye_intensity, 0.0, 1.0);
          
          vec3 base_fabric = vec3(0.96, 0.94, 0.90); // Unbleached cotton
          
          // Chromatic perturbation for organic dye separation
          float chroma_shift = fbm(aspect_uv * 5.0) * 0.2;
          vec3 dye_col = get_dye_color(dye_intensity + chroma_shift);
          
          // Subtractive dye blending
          vec3 color = base_fabric * mix(vec3(1.0), dye_col, dye_intensity);
          
          // Weave lighting and ambient occlusion
          color *= mix(0.3, 1.0, weave);
          
          // Vignette
          color *= mix(0.5, 1.0, vignette(vUv, 0.8, 0.2));
          
          // --- Structural Color: Subtle Thin-Film Interference Iridescence ---
          float thread_normal = abs(fract(aspect_uv.x * 120.0) - 0.5) * 2.0;
          vec3 iridescence = vec3(
              0.5 + 0.5 * cos(6.28318 * (thread_normal + 0.0)),
              0.5 + 0.5 * cos(6.28318 * (thread_normal + 0.33)),
              0.5 + 0.5 * cos(6.28318 * (thread_normal + 0.67))
          );
          
          // Apply iridescence lightly to the high points of the weave
          color += iridescence * weave * 0.05 * dye_intensity;
          
          fragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: { 
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader
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
  if (material.uniforms.u_resolution) {
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);