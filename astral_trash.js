try {
  if (!ctx) throw new Error("WebGL 2 context not available");

  if (!canvas.__three) {
    // 1. Create Text Heightmap Texture (The "Cute" ASTRAL TRASH)
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 1024;
    textCanvas.height = 1024;
    const tCtx = textCanvas.getContext('2d');
    
    tCtx.fillStyle = '#000000';
    tCtx.fillRect(0, 0, 1024, 1024);
    
    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'middle';
    tCtx.font = '900 160px "Arial Rounded MT Bold", "Comic Sans MS", "Fredoka One", sans-serif';
    
    // Draw multiple times with blur to create a soft SDF/Heightmap pillow effect
    tCtx.fillStyle = '#ffffff';
    tCtx.shadowColor = '#ffffff';
    
    for (let i = 40; i >= 0; i -= 10) {
      tCtx.shadowBlur = i;
      tCtx.fillText('ASTRAL', 512, 420);
      tCtx.fillText('TRASH', 512, 620);
    }
    
    const textTexture = new THREE.CanvasTexture(textCanvas);
    textTexture.minFilter = THREE.LinearMipmapLinearFilter;
    textTexture.magFilter = THREE.LinearFilter;
    textTexture.generateMipmaps = true;

    // 2. Setup WebGL/Three.js Scene
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, grid.width / grid.height, 0.1, 100);
    camera.position.z = 1;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_textTex: { value: textTexture }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform sampler2D u_textTex;
        
        in vec2 vUv;
        out vec4 fragColor;
        
        // Feral Noise & Domain Warping (The "Weird" Math)
        vec2 hash2(vec2 p) {
            p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
            return fract(sin(p) * 43758.5453) * 2.0 - 1.0;
        }
        
        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix( mix( dot(hash2(i + vec2(0.0,0.0)), f - vec2(0.0,0.0)), 
                             dot(hash2(i + vec2(1.0,0.0)), f - vec2(1.0,0.0)), u.x),
                        mix( dot(hash2(i + vec2(0.0,1.0)), f - vec2(0.0,1.0)), 
                             dot(hash2(i + vec2(1.0,1.0)), f - vec2(1.0,1.0)), u.x), u.y);
        }
        
        mat2 rot(float a) {
            float c = cos(a), s = sin(a);
            return mat2(c, -s, s, c);
        }
        
        // CMYK Neon Palette Generator
        vec3 getNeonMaterial(float v) {
            v = fract(v);
            vec3 voidBlack = vec3(0.04, 0.04, 0.05);
            vec3 cyan = vec3(0.0, 1.0, 1.0);
            vec3 mag = vec3(1.0, 0.0, 1.0);
            vec3 yel = vec3(1.0, 1.0, 0.0);
            
            if (v < 0.25) return mix(voidBlack, cyan, v * 4.0);
            if (v < 0.50) return mix(cyan, mag, (v - 0.25) * 4.0);
            if (v < 0.75) return mix(mag, yel, (v - 0.50) * 4.0);
            return mix(yel, voidBlack, (v - 0.75) * 4.0);
        }

        void main() {
            vec2 uv = vUv;
            vec2 p = uv * 2.0 - 1.0;
            p.x *= u_resolution.x / u_resolution.y;
            
            // 3 Time Scales
            float t_slow = u_time * 0.08;
            float t_med = u_time * 0.4;
            float t_fast = u_time * 8.0;
            
            // Text Gummy Heightmap (Cute, floating, bobbing)
            vec2 textUv = uv + vec2(sin(t_med + uv.y * 4.0), cos(t_med + uv.x * 4.0)) * 0.015;
            float textH = texture(u_textTex, textUv).r;
            
            // Fluid Displacement around Text (Gravity well)
            vec2 warp = vec2(dFdx(textH), dFdy(textH)) * 10.0;
            p += warp * 0.3;
            
            // Belousov-Zhabotinsky / Ferrofluid Hybrid Math (The Substrate)
            vec2 z = p * 2.0;
            float acc = 0.0;
            float scale = 1.0;
            
            // Fractal Reaction-Diffusion Folding
            for(int i = 0; i < 5; i++) {
                z = abs(z) - 0.4;
                z *= rot(t_slow + length(z) * 1.5);
                z *= 1.4;
                scale *= 1.4;
                
                // Interference waves (Thin film / Faraday)
                acc += sin(z.x * 3.0 + t_med) * cos(z.y * 3.0 - t_med) / scale;
                
                // Ferrofluid spike injection
                vec2 fv = fract(z) - 0.5;
                float spike = pow(max(0.0, 1.0 - length(fv)), 3.0);
                acc -= spike * 0.5 / scale;
            }
            
            // High-frequency granular shimmer (Mineral alchemy)
            float shimmer = fract(sin(dot(uv * 150.0, vec2(12.9898, 78.233))) * (43758.5453 + t_fast));
            acc += (shimmer * 0.05);
            
            // Compute Physical Normals via Screen-Space Derivatives
            float h = acc;
            float dx = dFdx(h) * u_resolution.x;
            float dy = dFdy(h) * u_resolution.y;
            vec3 normal = normalize(vec3(dx * 4.0, dy * 4.0, 1.0));
            
            // Fluid Material Shading
            vec3 fluidCol = getNeonMaterial(h * 2.0 - t_slow);
            
            // Deep voids
            float voidMask = smoothstep(0.1, -0.1, h);
            fluidCol = mix(fluidCol, vec3(0.02, 0.02, 0.03), voidMask);
            
            // Specular Iridescence (Light Starvation / Anti-Photonic)
            vec3 lightDir = normalize(vec3(sin(t_med), cos(t_med), 1.5));
            float spec = pow(max(0.0, dot(normal, lightDir)), 32.0);
            fluidCol += spec * vec3(0.0, 1.0, 1.0); // Cyan glints
            
            // --- ASTRAL TRASH Text Rendering (Psychedelic Pop Gummy) ---
            // Calculate normals for the bubbly text
            float tDx = dFdx(textH) * u_resolution.x;
            float tDy = dFdy(textH) * u_resolution.y;
            vec3 tNormal = normalize(vec3(tDx * 1.5, tDy * 1.5, 1.0));
            
            // Text Iridescence & Shading
            float tSpec = pow(max(0.0, dot(tNormal, normalize(vec3(0.5, 0.5, 1.0)))), 16.0);
            float rim = 1.0 - max(0.0, dot(tNormal, vec3(0.0, 0.0, 1.0)));
            
            // Candy colors for text
            vec3 tBase = mix(vec3(1.0, 0.0, 1.0), vec3(1.0, 1.0, 0.0), uv.y + sin(t_med)*0.2); // Magenta to Yellow
            vec3 textFinal = tBase + tSpec * vec3(1.0);
            
            // Neon Cyan Outline / Glow
            float outline = smoothstep(0.01, 0.15, textH) - smoothstep(0.4, 0.7, textH);
            textFinal = mix(textFinal, vec3(0.0, 1.0, 1.0), outline + pow(rim, 2.0));
            
            // Text shadow/refraction into fluid
            fluidCol *= mix(1.0, 0.2, smoothstep(0.0, 0.3, textH) * (1.0 - smoothstep(0.3, 0.6, textH)));
            
            // Composite fluid and text
            float textMask = smoothstep(0.1, 0.4, textH);
            vec3 finalCol = mix(fluidCol, textFinal, textMask);
            
            // Vignette & Contrast
            float vig = 1.0 - length(uv - 0.5) * 1.2;
            finalCol *= smoothstep(-0.2, 0.5, vig);
            
            fragColor = vec4(finalCol, 1.0);
        }
      `
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    canvas.__three = { renderer, scene, camera, material, textTexture };
  }

  const { renderer, scene, camera, material } = canvas.__three;

  if (material && material.uniforms) {
    if (material.uniforms.u_time) material.uniforms.u_time.value = time;
    if (material.uniforms.u_resolution) {
      material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }
  }

  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);

} catch (e) {
  console.error("The Feral Code Brain encountered a WebGL anomaly:", e);
}