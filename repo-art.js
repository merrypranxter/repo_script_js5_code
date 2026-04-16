const targetX = typeof mouse.x === 'number' ? mouse.x : grid.width / 2;
const targetY = typeof mouse.y === 'number' ? grid.height - mouse.y : grid.height / 2;

if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
    camera.position.z = 5;
    
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: { 
          u_time: { value: 0 },
          u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
          u_mouse: { value: new THREE.Vector2(targetX, targetY) }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        in vec2 vUv;
        out vec4 fragColor;
        
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;

        const float bayer4x4[16] = float[16](
            0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
           12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
            3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
           15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
        );

        vec3 palette(float t) {
            vec3 a = vec3(0.5);
            vec3 b = vec3(0.5);
            vec3 c = vec3(1.0);
            vec3 d = vec3(0.263, 0.416, 0.557);
            return a + b * cos(6.2831853 * (c * t + d));
        }

        float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        float smoothNoise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = noise(i);
            float b = noise(i + vec2(1.0, 0.0));
            float c = noise(i + vec2(0.0, 1.0));
            float d = noise(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
            float pixelScale = 3.0;
            vec2 fragCoord = floor(gl_FragCoord.xy / pixelScale);
            vec2 res = floor(u_resolution.xy / pixelScale);
            vec2 uv = fragCoord / res;
            
            vec2 p = (uv - 0.5) * 2.0;
            p.x *= res.x / res.y;

            vec2 mouseUV = u_mouse / u_resolution.xy;
            vec2 m = (mouseUV - 0.5) * 2.0;
            m.x *= res.x / res.y;
            
            p += smoothNoise(p * 5.0 + u_time) * 0.05;
            p -= m * 0.5;

            float r = length(p);
            float theta = atan(p.y, p.x);
            
            float r_dist = 1.0 / (r + 0.05) + u_time * 0.8;
            theta += r * 1.5 - u_time * 0.3;

            vec2 p_warp = r_dist * vec2(cos(theta), sin(theta));

            float qc = 0.0;
            float scale = 6.0;
            for(int i = 0; i < 5; i++) {
                float angle = float(i) * 6.2831853 / 5.0;
                vec2 dir = vec2(cos(angle), sin(angle));
                qc += cos(dot(p_warp, dir) * scale);
            }
            qc = (qc / 5.0) + 0.5;

            float phase = qc * 3.0 + r_dist * 0.5 - u_time;
            vec3 base_color = palette(phase);

            float stripe = sin(qc * 40.0 + u_time * 4.0);
            float edge = smoothstep(-0.1, 0.1, stripe);
            
            vec3 fringe = palette(qc * 50.0 + u_time);
            vec3 op_color = mix(vec3(0.02), base_color + fringe * 0.5, edge);

            float eye_mask = 1.0 - smoothstep(0.38, 0.4, r);
            float pupil = 1.0 - smoothstep(0.13, 0.15, r);
            float iris_pattern = sin(theta * 20.0 + u_time * 2.0) * 0.03;
            float iris_mask = 1.0 - smoothstep(0.28 + iris_pattern, 0.3 + iris_pattern, r);
            
            vec3 eye_color = mix(vec3(0.9), palette(r * 15.0 - u_time * 3.0), iris_mask);
            eye_color = mix(eye_color, vec3(0.05), pupil);
            
            op_color = mix(op_color, eye_color, eye_mask);

            int bx = int(mod(fragCoord.x, 4.0));
            int by = int(mod(fragCoord.y, 4.0));
            float bayer = bayer4x4[by * 4 + bx];
            
            float spread = 0.6;
            vec3 dithered = op_color + (bayer - 0.5) * spread;
            vec3 final_color = step(0.5, dithered);

            fragColor = vec4(final_color, 1.0);
        }
      `
    });
    
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);
    canvas.__three = { renderer, scene, camera, material };
  } catch (e) {
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
  if (material.uniforms.u_mouse) {
    material.uniforms.u_mouse.value.x += (targetX - material.uniforms.u_mouse.value.x) * 0.1;
    material.uniforms.u_mouse.value.y += (targetY - material.uniforms.u_mouse.value.y) * 0.1;
  }
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);