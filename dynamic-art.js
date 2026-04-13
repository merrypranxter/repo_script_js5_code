if (!canvas.__three) {
  try {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) throw new Error("WebGL 2 not supported or context occupied");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;
    
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_mouse: { value: new THREE.Vector2() },
        u_resolution: { value: new THREE.Vector2() },
        u_isPressed: { value: 0 }
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
        uniform vec2 u_mouse;
        uniform vec2 u_resolution;
        uniform float u_isPressed;

        // Glitchcore / Pixel Voxel Noise Hash
        float hash(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
        }

        // Quasicrystal Math: 5-fold symmetry
        float quasicrystal(vec2 p) {
            float v = 0.0;
            float theta = 3.14159265359 / 5.0; 
            for(int i = 0; i < 5; i++) {
                float angle = float(i) * theta;
                vec2 dir = vec2(cos(angle), sin(angle));
                // Domain warping for fluid hallucination
                float warp = sin(dot(p, vec2(sin(angle), cos(angle))) * 1.5 + u_time) * 0.8;
                v += cos(dot(p, dir) * 5.0 + warp);
            }
            return v;
        }

        // Lisa Frank / Hyperpop Rupture Palette
        vec3 getPalette(float v) {
            vec3 c1 = vec3(1.0, 0.0, 0.5); // Hot Pink
            vec3 c2 = vec3(0.0, 1.0, 1.0); // Electric Cyan
            vec3 c3 = vec3(1.0, 0.9, 0.0); // Bright Yellow
            vec3 c4 = vec3(0.6, 0.0, 1.0); // Deep Violet
            
            v = fract(v);
            if(v < 0.25) return mix(c1, c2, smoothstep(0.0, 0.25, v));
            if(v < 0.5) return mix(c2, c3, smoothstep(0.25, 0.5, v));
            if(v < 0.75) return mix(c3, c4, smoothstep(0.5, 0.75, v));
            return mix(c4, c1, smoothstep(0.75, 1.0, v));
        }

        void main() {
            // 1. Pixel Grid Lock (pixel_voxel)
            float pixelSize = 4.0;
            vec2 pUv = floor(vUv * u_resolution / pixelSize) * pixelSize / u_resolution;
            
            vec2 p = (pUv - 0.5) * (u_resolution / min(u_resolution.x, u_resolution.y));
            p *= 15.0; 
            
            // 2. Glitchcore Compression Chew & Macroblock Breakup
            vec2 blockUv = floor(pUv * 20.0) / 20.0;
            float blockNoise = hash(blockUv + floor(u_time * 12.0));
            
            vec2 glitchOffset = vec2(0.0);
            if(blockNoise > 0.85) {
                glitchOffset = vec2(hash(blockUv + 1.0) - 0.5, hash(blockUv + 2.0) - 0.5) * 3.0;
            }
            
            // 3. Mouse Interaction (Temporal Echo / Spatial Tear)
            vec2 mouseNorm = u_mouse / u_resolution;
            float distToMouse = distance(pUv, mouseNorm);
            float mouseGlitch = smoothstep(0.2, 0.0, distToMouse);
            if(u_isPressed > 0.5) mouseGlitch *= 2.0;
            
            if(mouseGlitch > 0.0 && hash(pUv + u_time) > 0.3) {
                glitchOffset += (mouseNorm - pUv) * 10.0 * mouseGlitch;
            }

            p += glitchOffset;
            
            // 4. Channel Split (RGB Displacement)
            float splitStrength = 0.15 + mouseGlitch * 0.8;
            if(blockNoise > 0.95) splitStrength += 0.6; // Rupture pop
            
            vec2 rOffset = vec2(splitStrength, 0.0);
            vec2 gOffset = vec2(0.0, 0.0);
            vec2 bOffset = vec2(-splitStrength, splitStrength * 0.5);
            
            float t = u_time * 0.8;
            
            float qR = quasicrystal(p + rOffset - t);
            float qG = quasicrystal(p + gOffset - t);
            float qB = quasicrystal(p + bOffset - t);
            
            // 5. Map to Palette and Combine Channels
            vec3 colR = getPalette(qR * 0.15 + u_time * 0.3);
            vec3 colG = getPalette(qG * 0.15 + u_time * 0.3);
            vec3 colB = getPalette(qB * 0.15 + u_time * 0.3);
            
            vec3 finalColor = vec3(colR.r, colG.g, colB.b);
            
            // 6. Bloom / Glow Contamination
            float qBloom = quasicrystal(p * 0.5 + t * 0.5);
            if(qBloom > 1.5) {
                vec3 bloomColor = getPalette(qBloom * 0.1 - t);
                finalColor += bloomColor * 0.6;
            }
            
            // 7. Ordered Dithering (Bayer 4x4)
            int bx = int(gl_FragCoord.x / pixelSize) % 4;
            int by = int(gl_FragCoord.y / pixelSize) % 4;
            float bayer[16] = float[16](
                0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
               12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
                3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
               15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
            );
            float dither = bayer[by * 4 + bx] - 0.5;
            finalColor += dither * 0.3; 
            
            // Quantize colors for pixel art aesthetic
            finalColor = floor(finalColor * 4.0 + 0.5) / 4.0;
            
            // 8. Outline Sobel (fake edge detect for "white accent puncture")
            float qCenter = quasicrystal(p);
            float qRight = quasicrystal(p + vec2(0.2, 0.0));
            float qUp = quasicrystal(p + vec2(0.0, 0.2));
            float edge = abs(qRight - qCenter) + abs(qUp - qCenter);
            if(edge > 2.5) {
                finalColor = vec3(1.0); // Sharp white
            }
            
            // 9. Scanline Contour Banding
            if(mod(gl_FragCoord.y, pixelSize * 2.0) < pixelSize) {
                finalColor *= 0.85; 
            }

            // 10. Lisa Frank Leopard Spots Overlay
            float spots = smoothstep(3.5, 4.0, qCenter) - smoothstep(4.2, 4.5, qCenter);
            if (spots > 0.5) {
                finalColor = mix(finalColor, vec3(0.0), 0.8); // Deep black spots
            }

            fragColor = vec4(finalColor, 1.0);
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
if (material?.uniforms) {
  material.uniforms.u_time.value = time;
  // Invert Y for standard WebGL coordinate space
  material.uniforms.u_mouse.value.set(mouse.x, grid.height - mouse.y);
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
  material.uniforms.u_isPressed.value = mouse.isPressed ? 1.0 : 0.0;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);