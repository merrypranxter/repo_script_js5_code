if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
    const scene = new THREE.Scene();
    const camera = new THREE.Camera(); // Dummy camera, vertex shader handles projection
    
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
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        in vec2 vUv;
        out vec4 fragColor;
        
        uniform float u_time;
        uniform vec2 u_resolution;

        // --- UTILITIES ---
        float hash(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
        }

        mat2 rot(float a) {
            float s = sin(a), c = cos(a);
            return mat2(c, -s, s, c);
        }

        // --- SDFs ---
        float sdHeart(vec2 p) {
            p.y += 0.5;
            p.x = abs(p.x);
            if( p.y+p.x > 1.0 ) return sqrt(dot(p-vec2(0.25,0.75),p-vec2(0.25,0.75))) - sqrt(2.0)/4.0;
            return sqrt(min(dot(p-vec2(0.00,1.00),p-vec2(0.00,1.00)),
                            dot(p-0.5*max(p.x+p.y,0.0),p-0.5*max(p.x+p.y,0.0))));
        }

        float sdBlobStar(vec2 p, float r) {
            float a = atan(p.y, p.x);
            float d = length(p) - r * (1.0 + 0.4 * sin(a * 5.0));
            return d;
        }

        float sdBox(vec2 p, vec2 b) {
            vec2 d = abs(p) - b;
            return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
        }

        // --- OPTICAL ENGINE ---
        float getOp(vec2 coord, float tOffset) {
            float time = u_time * 0.4 + tOffset;
            
            // Domain Warping / Stripe Fluid Distortion
            vec2 warp = vec2(
                sin(coord.y * 6.0 + time),
                cos(coord.x * 6.0 - time)
            ) * 0.15;
            coord += warp;
            
            float r = length(coord);
            float theta = atan(coord.y, coord.x);
            
            // Funnel / Tunnel Depth
            float tunnel = 1.0 / (r + 0.1);
            
            // Radial spokes & Zebra waves
            float spokes = sin(theta * 16.0 + tunnel * 3.0 + time * 4.0);
            float rings = sin(r * 40.0 - time * 12.0 + spokes * 1.0);
            
            // Moiré / Phase fields
            float opt = rings * spokes;
            
            // Micro-frequency grid interference
            float grid = sin(coord.x * 50.0) * sin(coord.y * 50.0);
            opt += grid * 0.4;
            
            return step(0.0, opt);
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / u_resolution.xy;
            vec2 p = uv * 2.0 - 1.0;
            p.x *= u_resolution.x / u_resolution.y;

            float time = u_time;

            // --- GLITCH / MACROBLOCKING (Data Rot) ---
            vec2 blockUV = floor(uv * vec2(40.0, 30.0));
            float blockNoise = hash(blockUV + floor(time * 12.0));
            
            vec2 gUV = uv;
            // Block displacement
            if (blockNoise > 0.92) {
                gUV.x += (hash(blockUV) - 0.5) * 0.15;
                gUV.y += (hash(blockUV + 1.0) - 0.5) * 0.15;
            }
            
            // Horizontal tearing
            if (hash(vec2(floor(uv.y * 60.0), floor(time * 8.0))) > 0.96) {
                gUV.x += 0.08 * sin(time * 25.0);
            }
            
            vec2 gp = gUV * 2.0 - 1.0;
            gp.x *= u_resolution.x / u_resolution.y;

            // --- OPTICAL ILLUSION BASE (Chromatic Interference) ---
            float splitAmt = 0.01 + 0.06 * step(0.9, hash(vec2(floor(time * 5.0))));
            
            float rOp = getOp(gp + vec2(splitAmt, 0.0), 0.0);
            float gOp = getOp(gp, 0.05);
            float bOp = getOp(gp - vec2(splitAmt, 0.0), 0.1);
            
            // --- PALETTE (Myspace Blacklight / Toxic Acid) ---
            vec3 cBlack = vec3(0.02, 0.01, 0.05);
            vec3 cPink  = vec3(1.0, 0.17, 0.72);
            vec3 cCyan  = vec3(0.0, 0.86, 1.0);
            vec3 cGreen = vec3(0.6, 0.9, 0.1);
            vec3 cWhite = vec3(1.0);
            
            // False-color chromatic aberration map
            vec3 col = cBlack;
            col += cPink * rOp;
            col += cGreen * gOp;
            col += cCyan * bOp;
            col = min(col, vec3(1.0)); // Overlap creates white/bright zones

            // --- WINDOW TRAIL (XP Freeze Ghosts) ---
            for(int j = 0; j < 3; j++) {
                float fj = float(j + 1);
                float pastTime = time - fj * 0.1;
                vec2 twp = gp;
                twp.x -= sin(pastTime * 0.8) * 0.9;
                twp.y -= cos(pastTime * 0.6) * 0.6;
                
                if (sdBox(twp, vec2(0.5, 0.3)) < 0.0) {
                    if (sdBox(twp, vec2(0.48, 0.28)) > 0.0) {
                        col = mix(col, vec3(0.6), 0.6); // Faded border
                    }
                }
            }

            // --- FLOATING HEARTS & STARS (Sticker Logic) ---
            for(int i = 0; i < 9; i++) {
                float fi = float(i);
                vec2 sp = gp;
                
                float speed = 0.4 + hash(vec2(fi)) * 0.8;
                sp.y -= fract(time * speed + fi * 0.618) * 4.0 - 2.0;
                sp.x -= (hash(vec2(fi, 1.0)) - 0.5) * 2.5 + sin(time * 0.5 + fi) * 0.4;
                
                sp *= rot(time * (hash(vec2(fi, 2.0)) - 0.5) * 1.5 + fi);
                sp *= 2.5 + hash(vec2(fi, 3.0)) * 2.0;
                
                float dObj = mod(fi, 2.0) < 1.0 ? sdHeart(sp) : sdBlobStar(sp, 0.35);
                
                if (dObj < 0.0) {
                    vec3 objCol = mix(cPink, cCyan, fract(fi * 0.37));
                    if (hash(vec2(fi, 4.0)) > 0.6) objCol = cGreen;
                    
                    col = objCol;
                    // Thick white sticker outline
                    if (dObj > -0.06) col = cWhite;
                    // Faux plastic gel reflection
                    if (sp.y > 0.1 && sp.x < -0.1 && dObj < -0.15) col += vec3(0.5);
                    // Inner shadow
                    col -= dObj * 0.5;
                }
            }

            // --- UI ERROR WINDOW ---
            vec2 wp = gp;
            wp.x -= sin(time * 0.8) * 0.9;
            wp.y -= cos(time * 0.6) * 0.6;
            
            // Random positional glitch
            if (hash(vec2(time)) > 0.95) {
                wp += (vec2(hash(vec2(time, 1.0)), hash(vec2(time, 2.0))) - 0.5) * 0.3;
            }
            
            float dBox = sdBox(wp, vec2(0.5, 0.3));
            if (dBox < 0.0) {
                col = vec3(0.75, 0.75, 0.8); // Win95 Gray
                
                float dBoxInner = sdBox(wp, vec2(0.48, 0.28));
                if (dBoxInner > 0.0) col = vec3(0.95); 
                if (wp.x > 0.48 || wp.y < -0.28) col = vec3(0.4); 
                
                // Title Bar
                if (wp.y > 0.15 && wp.y < 0.28 && abs(wp.x) < 0.48) {
                    col = vec3(0.0, 0.0, 0.6); // Deep blue
                    // Fake text
                    if (fract(wp.x * 12.0) < 0.5 && wp.y > 0.2 && wp.y < 0.23 && wp.x < 0.0) col = cWhite;
                    // Red Close Button
                    if (wp.x > 0.35 && wp.x < 0.45 && wp.y > 0.18 && wp.y < 0.25) col = vec3(0.8, 0.1, 0.1);
                }
                
                // Error Icon
                vec2 cp = wp - vec2(-0.25, -0.05);
                if (length(cp) < 0.1) col = vec3(0.9, 0.8, 0.1); 
                if (length(cp) < 0.08) {
                    if (abs(cp.x) < 0.02 && (cp.y > 0.0 || cp.y < -0.04)) col = vec3(0.0);
                }
                
                // Dialog Text
                vec2 tp = wp - vec2(0.1, -0.05);
                if (abs(tp.y) < 0.1 && abs(tp.x) < 0.2) {
                    if (fract(tp.y * 15.0) > 0.4 && hash(floor(tp * 15.0)) > 0.2) col = vec3(0.0);
                }
                
                // Destructive channel glitch
                if (hash(vec2(floor(time * 10.0), 1.0)) > 0.85) {
                    col.g = 1.0 - col.g;
                }
            }

            // --- GLITTER / SPARKLES ---
            float glitterNoise = hash(gl_FragCoord.xy * 1.5 + floor(time * 15.0));
            float cluster = smoothstep(1.0, 0.0, length(uv - 0.5));
            float glitterMask = step(0.995 - 0.01 * cluster, glitterNoise);
            vec3 sparkCol = mix(cWhite, cPink, hash(gl_FragCoord.xy));
            col += glitterMask * sparkCol * 1.5;
            
            // Starbursts
            vec2 gridUV = fract(uv * 12.0) - 0.5;
            float star = 0.0005 / (abs(gridUV.x) * abs(gridUV.y) + 0.001);
            if (hash(floor(uv * 12.0) + floor(time*3.0)) > 0.95) {
                col += star * cCyan;
            }

            // --- POST-PROCESSING ---
            float scanline = sin(uv.y * u_resolution.y * 2.0) * 0.04;
            col -= scanline;
            col *= 1.05; // Phosphor bloom
            
            float vig = length(uv - 0.5);
            col *= smoothstep(0.9, 0.3, vig);

            fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
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
if (material && material.uniforms && material.uniforms.u_time) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);