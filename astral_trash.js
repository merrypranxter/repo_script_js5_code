if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
    camera.position.z = 1;

    // Generate the internal text/sacred geometry density map
    const tCanvas = document.createElement('canvas');
    tCanvas.width = 1024;
    tCanvas.height = 1024;
    const tCtx = tCanvas.getContext('2d');
    
    // Void base
    tCtx.fillStyle = 'black';
    tCtx.fillRect(0, 0, 1024, 1024);
    
    // Sacred Geometry framing (Merkaba/Torus implied structure)
    tCtx.strokeStyle = 'white';
    tCtx.lineWidth = 8;
    tCtx.translate(512, 512);
    
    // Outer boundary
    tCtx.beginPath();
    tCtx.arc(0, 0, 450, 0, Math.PI * 2);
    tCtx.stroke();
    
    // Interlocking triangles (Sri Yantra / Merkaba vibe)
    for(let i=0; i<2; i++) {
        tCtx.rotate(Math.PI);
        tCtx.beginPath();
        tCtx.moveTo(0, -450);
        tCtx.lineTo(389.7, 225);
        tCtx.lineTo(-389.7, 225);
        tCtx.closePath();
        tCtx.stroke();
    }
    
    // Concentric rings (Cymatic ripples)
    tCtx.lineWidth = 2;
    for(let r=50; r<400; r+=50) {
        tCtx.beginPath();
        tCtx.arc(0, 0, r, 0, Math.PI * 2);
        tCtx.stroke();
    }
    
    // Text: ASTRAL TRASH
    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'middle';
    tCtx.font = 'italic 900 160px "Georgia", "Times New Roman", serif';
    
    // Halation / bloom layer
    tCtx.filter = 'blur(20px)';
    tCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    tCtx.fillText("ASTRAL", 0, -80);
    tCtx.fillText("TRASH", 0, 80);
    
    // Core crisp layer
    tCtx.filter = 'none';
    tCtx.fillStyle = 'white';
    tCtx.fillText("ASTRAL", 0, -80);
    tCtx.fillText("TRASH", 0, 80);

    const textTex = new THREE.CanvasTexture(tCanvas);
    textTex.minFilter = THREE.LinearMipMapLinearFilter;
    textTex.wrapS = THREE.ClampToEdgeWrapping;
    textTex.wrapT = THREE.ClampToEdgeWrapping;

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
      uniform sampler2D u_textTex;

      #define PI 3.14159265359
      #define TAU 6.28318530718

      // Hash and Noise (Shoegaze grain & phase drift)
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
          for(int i=0; i<4; i++) {
              f += amp * noise(p);
              p *= 2.0;
              amp *= 0.5;
          }
          return f;
      }

      // Hexagonal Ferrofluid/Cymatic Interference 
      float cymaticHex(vec2 p, float t) {
          float q = p.x;
          float r = p.x * 0.5 + p.y * 0.866025;
          float s = p.x * 0.5 - p.y * 0.866025;
          
          // Standing waves
          float w = sin(q + t) * sin(r - t*0.8) * sin(s + t*1.1);
          return pow(abs(w), 1.5); // Sharpen into spikes
      }

      void main() {
          // Normalize coordinates
          vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
          vec2 uv = vUv;

          // Three Time Scales
          float t_slow = u_time * 0.1;   // Global phase drift
          float t_med  = u_time * 1.5;   // Structural fluid motion
          float t_fast = u_time * 12.0;  // Detail shimmer / grain

          // 1. Shoegaze Phase Drift (Slow/Med)
          // Warps the underlying space like a thick, oily fluid
          vec2 drift = vec2(
              fbm(p * 4.0 + t_slow) - 0.5,
              fbm(p * 4.0 - t_slow + 10.0) - 0.5
          ) * 2.0;

          // 2. Chromatic Aberration & Text Sampling
          // Treat the text as a magnetic density field. We sample it 3 times 
          // with different offsets to rip the colors apart (Shoegaze color bleed).
          vec2 uvC = uv + drift * 0.04 + vec2(sin(t_med*0.9), cos(t_med*0.8)) * 0.01;
          vec2 uvM = uv + drift * 0.04 + vec2(cos(t_med*1.1), sin(t_med*1.2)) * 0.01;
          vec2 uvY = uv + drift * 0.04 + vec2(sin(t_med*1.3), cos(t_med*0.7)) * 0.01;

          float magC = texture(u_textTex, clamp(uvC, 0.0, 1.0)).r;
          float magM = texture(u_textTex, clamp(uvM, 0.0, 1.0)).r;
          float magY = texture(u_textTex, clamp(uvY, 0.0, 1.0)).r;
          float magBase = (magC + magM + magY) / 3.0;

          // 3. Ferrofluid Spikes & Cymatic Resonance (Med)
          // The magnetic field (text) pulls the fluid into high-frequency spikes.
          // Where text is bright, spikes are dense and sharp.
          float scale = 30.0 + magBase * 50.0; 
          vec2 fp = p * scale + drift * 10.0;
          
          float spikesC = cymaticHex(fp + vec2(0.0, 0.0), t_med);
          float spikesM = cymaticHex(fp + vec2(0.5, 0.5), t_med * 1.05);
          float spikesY = cymaticHex(fp + vec2(-0.5, 0.5), t_med * 0.95);

          // 4. Color Computation (Neon CMY on Void Black)
          vec3 voidBlack = vec3(0.01, 0.005, 0.02); // Deep oily black
          
          // Modulate the magnetic field by the physical spikes
          float valC = smoothstep(0.1, 0.9, magC * spikesC);
          float valM = smoothstep(0.1, 0.9, magM * spikesM);
          float valY = smoothstep(0.1, 0.9, magY * spikesY);

          vec3 color = voidBlack;
          // Additive CMY blending
          color += valC * vec3(0.0, 1.0, 1.0); // Cyan
          color += valM * vec3(1.0, 0.0, 1.0); // Magenta
          color += valY * vec3(1.0, 1.0, 0.0); // Yellow

          // 5. Fast Moiré / Alias Shimmer (Fast)
          // High-frequency interference pattern embedded IN the haze
          float moire = sin(p.x * 200.0 + t_fast) * cos(p.y * 195.0 - t_fast);
          color -= (moire * 0.15 * magBase); // Carve into the neon

          // 6. Shoegaze Film Grain (Fast)
          float grain = hash(uv * 250.0 + t_fast);
          color += (grain - 0.5) * 0.15;

          // 7. Halation Bloom
          // Soft, low-frequency glow pulling from the center
          float bloom = exp(-length(p) * 2.5) * magBase * 0.3;
          color += vec3(0.1, 0.5, 1.0) * bloom; // Electric blue inner glow

          // Vignette
          color *= 1.0 - smoothstep(0.5, 1.5, length(p));

          fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_textTex: { value: textTex }
      },
      vertexShader,
      fragmentShader,
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
  if (material.uniforms.u_time) material.uniforms.u_time.value = time;
  if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);