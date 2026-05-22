try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const textCanvas = document.createElement('canvas');
    textCanvas.width = 1024;
    textCanvas.height = 1024;
    const tCtx = textCanvas.getContext('2d');
    
    tCtx.fillStyle = '#000';
    tCtx.fillRect(0, 0, 1024, 1024);
    tCtx.translate(512, 512);
    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'middle';
    
    tCtx.strokeStyle = '#555';
    tCtx.lineWidth = 3;
    for(let i = 0; i < 12; i++) {
        tCtx.beginPath();
        tCtx.arc(Math.cos(i * Math.PI / 6) * 200, Math.sin(i * Math.PI / 6) * 200, 200, 0, Math.PI * 2);
        tCtx.stroke();
    }
    
    for(let i = 0; i < 6; i++) {
        tCtx.beginPath();
        tCtx.moveTo(Math.cos(i * Math.PI / 3) * 400, Math.sin(i * Math.PI / 3) * 400);
        tCtx.lineTo(Math.cos((i+2) * Math.PI / 3) * 400, Math.sin((i+2) * Math.PI / 3) * 400);
        tCtx.stroke();
    }

    tCtx.font = '900 150px "Arial Black", Impact, sans-serif';
    tCtx.lineWidth = 2;
    tCtx.strokeStyle = '#fff';
    
    for(let i = 12; i > 0; i--) {
        tCtx.strokeText('ASTRAL', 0, -90 - i * 4);
        tCtx.strokeText('TRASH',  0,  90 + i * 4);
    }
    
    tCtx.fillStyle = '#fff';
    tCtx.fillText('ASTRAL', 0, -90);
    tCtx.fillText('TRASH',  0,  90);

    const textTex = new THREE.CanvasTexture(textCanvas);
    textTex.minFilter = THREE.LinearFilter;
    textTex.magFilter = THREE.LinearFilter;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_textTex: { value: textTex }
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
        uniform sampler2D u_textTex;

        #define PI 3.14159265359

        float hash(vec2 p) {
            p = fract(p * vec2(127.1, 311.7));
            p += dot(p, p + 19.19);
            return fract(p.x * p.y);
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
            mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
            for(int i = 0; i < 5; i++) {
                f += a * noise(p);
                p = rot * p * 2.0;
                a *= 0.5;
            }
            return f;
        }

        void main() {
            vec2 uv = vUv;
            vec2 st = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
            
            float t_slow = u_time * 0.03;
            float t_med  = u_time * 0.15;
            float t_fast = u_time * 1.2;

            float textBase = texture(u_textTex, uv).r;

            vec2 q = vec2(fbm(st * 2.5 + t_slow), fbm(st * 2.5 + vec2(1.7, 4.2) - t_slow));
            vec2 r = vec2(fbm(st * 5.0 + q * 2.0 + t_med), fbm(st * 5.0 + q * 2.0 - t_med));
            
            vec2 warped_st = st + r * 0.15 + (q - 0.5) * textBase * 0.25;
            vec2 warped_uv = uv + r * 0.06 + (q - 0.5) * textBase * 0.08;
            
            float textWarped = texture(u_textTex, warped_uv).r;

            float radius = length(warped_st);
            float angle = atan(warped_st.y, warped_st.x);
            float chladni = sin(radius * 35.0 - t_fast) * cos(angle * 8.0 + t_med);
            chladni = smoothstep(0.0, 0.5, abs(chladni));

            float thickness = fbm(warped_st * 4.0) * 2.5 + chladni * 0.8 + textWarped * 2.2;
            
            float gridA = sin(warped_st.x * 120.0 + t_fast * 2.0);
            float gridB = sin(warped_st.y * 120.0 - t_fast * 2.0);
            float moire = smoothstep(0.7, 1.0, abs(gridA * gridB));

            float material = fract(thickness * 1.2 + moire * 0.3 + t_slow);

            vec3 cyan = vec3(0.0, 1.0, 0.9);
            vec3 mag  = vec3(1.0, 0.0, 0.8);
            vec3 yel  = vec3(1.0, 0.9, 0.0);
            vec3 voidBlack = vec3(0.01, 0.0, 0.02);
            
            vec3 color = mix(cyan, mag, smoothstep(0.0, 0.5, material));
            color = mix(color, yel, smoothstep(0.5, 1.0, material));

            float spikes = pow(abs(sin(fbm(st * 8.0 + r) * 18.0)), 5.0);
            float voidMask = smoothstep(0.35, 0.75, thickness - moire * 0.6);
            
            vec3 finalColor = mix(voidBlack, color * (1.0 + moire * 0.6), voidMask * spikes);

            float textEdge = smoothstep(0.1, 0.5, textWarped) - smoothstep(0.5, 0.9, textWarped);
            finalColor += mag * textEdge * 2.5 * (1.0 + sin(t_fast * 3.0) * 0.4);
            
            vec3 textCore = mix(cyan, yel, fract(t_med + radius * 4.0));
            finalColor = mix(finalColor, textCore * (1.5 + moire), textWarped * smoothstep(0.6, 1.0, material));

            float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + u_time) * 43758.5453);
            finalColor += grain * 0.08 * voidMask;

            float vig = 1.0 - smoothstep(0.4, 1.5, length(st));
            finalColor *= vig;

            fragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);
    
    canvas.__three = { renderer, scene, camera, material };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  if (material?.uniforms) {
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("WebGL Initialization Failed:", e);
}