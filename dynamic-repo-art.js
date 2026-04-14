if (!canvas.__three) {
  try {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) throw new Error("WebGL 2 not supported or context occupied");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.Camera(); // Full-screen quad handled directly in vertex shader
    
    // Lisa Frank Hyper-Neon Palette
    const palette = [
      new THREE.Vector3(1.0, 0.0, 1.0),   // Magenta
      new THREE.Vector3(0.0, 1.0, 1.0),   // Cyan
      new THREE.Vector3(1.0, 1.0, 0.0),   // Yellow
      new THREE.Vector3(1.0, 0.0, 0.5),   // Hot Pink
      new THREE.Vector3(0.5, 0.0, 1.0),   // Purple
      new THREE.Vector3(0.5, 1.0, 0.0),   // Lime
      new THREE.Vector3(1.0, 0.5, 0.0),   // Orange
      new THREE.Vector3(1.0, 1.0, 1.0),   // White (Sparkles)
      new THREE.Vector3(0.08, 0.0, 0.15)  // Dark Indigo (Outlines)
    ];
    
    const uniforms = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
      u_mouse: { value: new THREE.Vector2(0, 0) },
      u_isPressed: { value: 0 },
      u_palette: { value: palette }
    };
    
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: uniforms,
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          // Ignore camera, stretch quad perfectly to screen bounds
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        uniform float u_isPressed;
        uniform vec3 u_palette[9];

        in vec2 vUv;
        out vec4 fragColor;

        // Bayer 4x4 Dither Matrix
        const float bayer4[16] = float[16](
            0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
           12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
            3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
           15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
        );

        // RGB to YUV for perceptual palette snapping
        vec3 rgb2yuv(vec3 rgb) {
            float y = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
            float u = 0.492 * (rgb.b - y);
            float v = 0.877 * (rgb.r - y);
            return vec3(y, u, v);
        }

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f*f*(3.0-2.0*f);
            return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                       mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
        }

        // Fractional Brownian Motion
        float fbm(vec2 p) {
            float v = 0.0;
            float a = 0.5;
            for(int i=0; i<4; i++) {
                v += a * noise(p);
                p *= 2.0;
                a *= 0.5;
            }
            return v;
        }

        void main() {
            // 1. Pixel Grid Lock (Maintains perfectly square pixels regardless of aspect)
            float minRes = min(u_resolution.x, u_resolution.y);
            float pixelSizeScale = 256.0 / minRes; // 256 virtual pixels across shortest dimension
            vec2 virtRes = floor(u_resolution * pixelSizeScale);
            vec2 pixelSize = 1.0 / virtRes;
            vec2 snappedUV = floor(vUv / pixelSize) * pixelSize + pixelSize * 0.5;
            
            // Isotropic coordinates
            vec2 p = (snappedUV - 0.5) * u_resolution / minRes * 30.0;
            
            // 2. Feral Domain Warping (Lisa Frank Animal Print Infection)
            float n1 = fbm(p * 0.3 + u_time * 0.2);
            float n2 = fbm(p * 0.3 - u_time * 0.3 + 100.0);
            vec2 warp = (vec2(n1, n2) - 0.5) * 2.0;
            
            // Mouse Interaction (Repeller)
            vec2 m = u_mouse / u_resolution;
            m.y = 1.0 - m.y; // Flip Y for WebGL
            vec2 mIso = (m - 0.5) * u_resolution / minRes * 30.0;
            float distToMouse = length(p - mIso);
            float force = exp(-distToMouse * 0.2) * (u_isPressed > 0.5 ? -10.0 : 5.0);
            
            p += warp * 5.0 * (1.0 + force * 0.5);
            p += normalize(p - mIso + 0.001) * force * sin(u_time * 5.0);
            
            // 3. Quasicrystal Layers (5-Fold Symmetry + Golden Ratio 1.618 Inflation)
            float qVal1 = 0.0;
            float qVal2 = 0.0;
            float ghostVal = 0.0;
            
            vec2 ghostP = p + vec2(sin(u_time), cos(u_time)) * 3.0;
            
            for(int i = 0; i < 5; i++) {
                float theta = float(i) * 3.14159265 * 2.0 / 5.0;
                vec2 dir = vec2(cos(theta), sin(theta));
                
                float phase = dot(p, dir);
                float phaseWarp = sin(p.x * 0.5 + u_time) * cos(p.y * 0.5 - u_time);
                
                qVal1 += cos(phase + u_time * 2.0 + phaseWarp);
                qVal2 += cos(phase * 1.61803398 - u_time * 1.5 + phaseWarp * 1.618);
                ghostVal += cos(dot(ghostP, dir) + (u_time - 0.5) * 2.0);
            }
            
            qVal1 = (qVal1 + 5.0) / 10.0;
            qVal2 = (qVal2 + 5.0) / 10.0;
            ghostVal = (ghostVal + 5.0) / 10.0;
            
            // Feral Mixing of Inflation Layers
            float qVal = mix(qVal1, qVal2, 0.5 + 0.5 * sin(u_time + p.y * 0.2));
            
            // 4. Paper Misregistration / Chromatic Aberration
            float bands = qVal * 8.0 - u_time * 2.0;
            float rBands = fract(bands + 0.05);
            float gBands = fract(bands);
            float bBands = fract(bands - 0.05);
            
            // 5. Lisa Frank Gradient Synthesis
            vec3 rawColor = vec3(
                0.5 + 0.5 * sin(rBands * 6.28 + u_time + p.x * 0.3),
                0.5 + 0.5 * sin(gBands * 6.28 + u_time * 1.3 + p.y * 0.3 + 2.0),
                0.5 + 0.5 * sin(bBands * 6.28 + u_time * 0.7 + 4.0)
            );
            
            // Hyper-saturation
            float gray = dot(rawColor, vec3(0.299, 0.587, 0.114));
            rawColor = mix(vec3(gray), rawColor, 3.5);
            rawColor = clamp(rawColor, 0.0, 1.0);
            
            // 6. Ordered Dither (Bayer 4x4)
            int bx = int(mod(snappedUV.x * virtRes.x, 4.0));
            int by = int(mod(snappedUV.y * virtRes.y, 4.0));
            float bayerVal = bayer4[by * 4 + bx];
            float spread = 0.3 + ghostVal * 0.4; // Ghost perturbs dither spread
            vec3 ditheredColor = rawColor + (bayerVal - 0.5) * spread;
            
            // 7. Palette Map (Nearest YUV)
            vec3 bestColor = u_palette[0];
            float bestDist = 1e9;
            vec3 targetYUV = rgb2yuv(ditheredColor);
            
            for(int i = 0; i < 9; i++) {
                vec3 palColor = u_palette[i];
                vec3 palYUV = rgb2yuv(palColor);
                float d = dot(targetYUV - palYUV, targetYUV - palYUV);
                if(d < bestDist) {
                    bestDist = d;
                    bestColor = palColor;
                }
            }
            
            // 8. Outline Detection (Simulated Sobel on geometry bands)
            float edge = abs(fract(bands) - 0.5);
            if(edge < 0.05 + force * 0.02) {
                bestColor = u_palette[8]; // Dark Indigo Outline
            }
            
            // 9. Sparkles (Dead Pixels Behaving Like Pollen)
            float twinkleTime = floor(u_time * 10.0);
            if(hash(snappedUV + twinkleTime) > 0.992) {
                bestColor = u_palette[7]; // White
            }
            
            fragColor = vec4(bestColor, 1.0);
        }
      `
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
  material.uniforms.u_mouse.value.set(mouse.x, mouse.y);
  material.uniforms.u_isPressed.value = mouse.isPressed ? 1.0 : 0.0;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);