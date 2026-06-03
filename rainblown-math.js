if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(0, 0) }
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
        
        in vec2 vUv;
        out vec4 fragColor;

        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;

        // OKLab to sRGB conversion (from color_systems)
        vec3 oklch2rgb(float L, float C, float h) {
            float a = C * cos(h);
            float b = C * sin(h);
            float l_ = L + 0.3963377774 * a + 0.2158037573 * b;
            float m_ = L - 0.1055613458 * a - 0.0638541728 * b;
            float s_ = L - 0.0894841775 * a - 1.2914855480 * b;
            
            float l = l_*l_*l_;
            float m = m_*m_*m_;
            float s = s_*s_*s_;
            
            vec3 rgb = vec3(
                 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
            );
            
            // Gamma encode
            return mix(
                rgb * 12.92, 
                1.055 * pow(max(rgb, vec3(0.0)), vec3(1.0/2.4)) - 0.055, 
                step(0.0031308, rgb)
            );
        }

        // Complex Math Operations (Tetragrammaton / Ocean Math)
        vec2 cMul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }

        // The core mathematical engine
        float coreMath(vec2 p, float t) {
            vec2 z = p;
            vec2 c = vec2(sin(t * 0.23), cos(t * 0.31)) * 0.45;
            float v = 0.0;
            
            for(int i = 0; i < 8; i++) {
                // Iterative Conformal Map
                z = cMul(z, z) + c;
                // Add undulating equation surface (The Ocean)
                z += vec2(sin(z.y * 3.0 + t), cos(z.x * 3.0 - t)) * 0.15;
                
                // Dielectric Breakdown / Kirlian Glow accumulation
                v += exp(-length(z) * 1.8);
                
                if(length(z) > 5.0) break;
            }
            return v;
        }

        // Spectral Rainbow with Golden Angle Drift
        vec3 getRainbow(float v, float t, float depth) {
            float L = clamp(0.1 + v * 0.12, 0.0, 1.0);
            float C = clamp(0.15 + 0.12 * sin(v * 2.0 + t), 0.0, 0.4);
            // 2.3999 rad is ~137.5 deg (Golden Angle)
            float h = v * 0.8 - t * 2.0 + depth * 2.3999; 
            return oklch2rgb(L, C, h);
        }

        void main() {
            vec2 uv = (vUv - 0.5) * 2.0;
            uv.x *= u_resolution.x / u_resolution.y;

            // Physics misalign / TAA Ghosting stutter
            float stutterTime = u_time - mod(u_time, step(0.95, fract(u_time * 1.5)) * 0.15);
            
            // Mouse interaction (Observer Effect)
            vec2 mouseOffset = (u_mouse.xy / u_resolution.xy - 0.5) * 2.0;
            
            vec3 finalCol = vec3(0.0);
            
            // Multi-Plane Depth Slicing (Terminator HUD / Parallax Fields)
            const float NUM_PLANES = 4.0;
            for(float i = 0.0; i < NUM_PLANES; i++) {
                float depth = i / (NUM_PLANES - 1.0);
                
                // Rainblown distortion per plane
                vec2 p = uv * (1.0 + depth * 0.9);
                p += mouseOffset * (1.0 - depth) * 0.5;
                
                // Wind shear and rain fall
                p.x += p.y * 0.8; 
                p.y -= stutterTime * (1.2 + depth * 0.6); 
                
                // Fluid turbulence
                p.x += sin(p.y * 12.0 + stutterTime * 3.0) * 0.03 * (1.0 - depth);
                
                // Chromatic Parallax Separation
                float disp = 0.04 * (1.0 + depth);
                
                float vR = coreMath(p + vec2(disp * 1.2, 0.0), stutterTime);
                float vG = coreMath(p + vec2(disp * 0.4, 0.0), stutterTime);
                float vB = coreMath(p + vec2(-disp * 0.9, disp * 0.2), stutterTime);
                
                vec3 cR = getRainbow(vR, stutterTime, depth);
                vec3 cG = getRainbow(vG, stutterTime, depth);
                vec3 cB = getRainbow(vB, stutterTime, depth);
                
                // Splice chromatic channels
                vec3 planeCol = vec3(cR.r, cG.g, cB.b);
                
                // Additive blend with depth fade
                float mask = smoothstep(0.4, 3.5, (vR + vG + vB) / 3.0);
                finalCol += planeCol * mask * (1.0 - depth * 0.65);
            }

            // High-speed rain streaks
            float rain = fract(uv.x * 90.0 - uv.y * 50.0 + stutterTime * 20.0);
            rain = smoothstep(0.97, 1.0, rain);
            finalCol += rain * vec3(0.3, 0.8, 1.0) * 0.6;
            
            // Z-fighting / Spatial Grid
            vec2 grid = abs(fract(uv * 8.0 + stutterTime * 0.2) - 0.5) * 2.0;
            float gridLine = 1.0 - smoothstep(0.0, 0.04, min(grid.x, grid.y));
            finalCol += gridLine * vec3(0.05, 0.1, 0.2) * 0.4;

            // Bayer Matrix Dither (Fossilization / 8-bit retro artifact)
            const int bayer[16] = int[16](
                0, 8, 2, 10,
                12, 4, 14, 6,
                3, 11, 1, 9,
                15, 7, 13, 5
            );
            int bidx = int(mod(gl_FragCoord.x, 4.0)) + int(mod(gl_FragCoord.y, 4.0)) * 4;
            float dither = (float(bayer[bidx]) / 16.0) - 0.5;
            finalCol += dither * 0.18;

            // ACES-ish Tonemapping (from color_fields)
            finalCol = clamp((finalCol * (2.51 * finalCol + 0.03)) / (finalCol * (2.43 * finalCol + 0.59) + 0.14), 0.0, 1.0);

            fragColor = vec4(finalCol, 1.0);
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
  if (material.uniforms.u_time) material.uniforms.u_time.value = time;
  if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
  if (material.uniforms.u_mouse) material.uniforms.u_mouse.value.set(mouse.x, mouse.y);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);