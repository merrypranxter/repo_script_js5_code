try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL context not available");

    const textCanvas = document.createElement('canvas');
    textCanvas.width = 2048;
    textCanvas.height = 1024;
    const tCtx = textCanvas.getContext('2d');

    tCtx.fillStyle = '#000';
    tCtx.fillRect(0, 0, 2048, 1024);

    const cx = 1024;
    const cy = 512;

    tCtx.strokeStyle = '#444';
    tCtx.lineWidth = 8;
    for (let i = 0; i < 6; i++) {
      let angle = (i * Math.PI) / 3;
      tCtx.beginPath();
      tCtx.arc(cx + Math.cos(angle) * 300, cy + Math.sin(angle) * 300, 300, 0, Math.PI * 2);
      tCtx.stroke();
    }

    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'middle';
    tCtx.font = '900 260px "Impact", "Arial Black", sans-serif';

    tCtx.filter = 'blur(80px)';
    tCtx.fillStyle = '#333';
    tCtx.fillText("ASTRAL TRASH", cx, cy);

    tCtx.filter = 'blur(25px)';
    tCtx.fillStyle = '#888';
    tCtx.fillText("ASTRAL TRASH", cx, cy);

    tCtx.filter = 'blur(4px)';
    tCtx.fillStyle = '#FFF';
    tCtx.fillText("ASTRAL TRASH", cx, cy);

    tCtx.filter = 'none';
    tCtx.fillStyle = '#000';
    tCtx.fillRect(0, cy - 25, 2048, 50);

    tCtx.fillStyle = '#FFF';
    tCtx.font = 'bold 36px "Courier New", monospace';
    tCtx.letterSpacing = '24px';
    tCtx.fillText("METRIC COMPETITION // FERROFLUID SHOEGAZE", cx, cy);

    const textTexture = new THREE.CanvasTexture(textCanvas);
    textTexture.minFilter = THREE.LinearFilter;
    textTexture.magFilter = THREE.LinearFilter;

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
      in vec2 vUv;
      out vec4 fragColor;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_text;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      float fbm(vec2 p) {
        float f = 0.0;
        float a = 0.5;
        for (int i = 0; i < 6; i++) {
          f += a * noise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return f;
      }

      vec3 oklab_to_srgb(vec3 c) {
        float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
        float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
        float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;

        float l = l_ * l_ * l_;
        float m = m_ * m_ * m_;
        float s = s_ * s_ * s_;

        vec3 rgb = vec3(
           4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
          -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
          -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
        );

        vec3 srgb = mix(
          rgb * 12.92,
          1.055 * pow(max(rgb, 0.0), vec3(1.0 / 2.4)) - 0.055,
          step(0.0031308, rgb)
        );
        return clamp(srgb, 0.0, 1.0);
      }

      vec3 oklch_to_oklab(float L, float C, float h) {
        return vec3(L, C * cos(h), C * sin(h));
      }

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        p.x *= u_resolution.x / u_resolution.y;

        float t_slow = u_time * 0.1;
        float t_med = u_time * 0.8;
        float t_fast = u_time * 4.0;

        vec2 drift = vec2(fbm(p * 1.2 + t_slow), fbm(p * 1.2 - t_slow + 10.0));
        vec2 p_warp = p + (drift - 0.5) * 0.3;

        float txt_r = texture(u_text, vUv + (drift - 0.5) * 0.015 + vec2(0.008, 0.0)).r;
        float txt_g = texture(u_text, vUv + (drift - 0.5) * 0.015).r;
        float txt_b = texture(u_text, vUv + (drift - 0.5) * 0.015 - vec2(0.008, 0.0)).r;
        float txt = txt_g; 

        float d_l2 = length(p_warp);
        float d_linf = max(abs(p_warp.x), abs(p_warp.y));
        float metric = mix(d_l2, d_linf, txt * 1.5); 

        float freq = 24.0 + txt * 12.0;
        float phase = metric * freq - t_med * (1.0 + txt * 3.0);
        float cymatic = sin(phase) * cos(p_warp.x * 12.0 + t_med) * sin(p_warp.y * 12.0 - t_med);
        
        float spikes = exp(-abs(sin(cymatic * 3.1415)) * (5.0 - txt * 3.0));

        float moire = sin(p.x * 200.0 + t_fast) * cos(p.y * 200.0 - t_fast);
        float grain = hash(vUv * 250.0 + u_time);

        float density = spikes * 0.7 + fbm(p_warp * 8.0 + t_slow) * 0.4 + moire * 0.05 * txt;

        float L = 0.05 + density * 0.65 + txt * 0.25; 
        
        float hue_angle = d_l2 * 4.0 + t_slow * 2.0 + txt * 3.0 + density * 4.0;
        float C = 0.28 + txt * 0.12; 
        
        vec3 lab = oklch_to_oklab(L, C, hue_angle);
        vec3 col = oklab_to_srgb(lab);

        col.r += txt_r * 0.3 * spikes;
        col.b += txt_b * 0.3 * spikes;
        
        vec3 halation = oklab_to_srgb(oklch_to_oklab(0.7, 0.3, hue_angle + 1.0));
        col += halation * txt * smoothstep(0.4, 1.0, density) * 0.6;

        col += (grain - 0.5) * 0.12;

        col *= smoothstep(0.0, 0.5, density + 0.15 + txt * 0.2);

        fragColor = vec4(col, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_text: { value: textTexture }
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
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("WebGL Initialization or Render Failed:", e);
}