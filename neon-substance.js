if (!canvas.__three) {
  try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
    camera.position.z = 1;

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
      fragmentShader: `
        in vec2 vUv;
        out vec4 fragColor;

        uniform float u_time;
        uniform vec2 u_resolution;

        // [GLITCH PROPHET MODULE] Forbidden Math & Hash Noise
        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        // [LITHOGENESIS] Birefringence / Thin-film Iridescence Palette
        vec3 spectralColor(float t) {
            vec3 a = vec3(0.5, 0.5, 0.5);
            vec3 b = vec3(0.5, 0.5, 0.5);
            vec3 c = vec3(1.0, 1.0, 1.0);
            vec3 d = vec3(0.00, 0.33, 0.67);
            return a + b * cos(6.28318 * (c * t + d));
        }

        void main() {
            // Normalized pixel coordinates (from -1 to 1)
            vec2 uv = (vUv - 0.5) * (u_resolution.x / u_resolution.y);
            uv *= 2.5;

            // [TIME SCALES]
            // Slow: Global structural folding / geological pressure
            // Medium: Moiré grid sliding / biological pumping
            // Fast: Dead pixels / pollen / quantum shimmer
            float t_slow = u_time * 0.08;
            float t_med = u_time * 0.4;
            float t_fast = u_time * 15.0;

            // [METRIC COMPETITION] 
            // Map flat space to a pseudo-Poincaré hyperbolic manifold
            float r2 = dot(uv, uv);
            vec2 hyperUV = uv / (1.0 - r2 * 0.15 * sin(t_slow)); 

            // [XOR-GHOST MANIFOLD] 
            // Introduce machine hesitation via bitwise-like coordinate shredding
            vec2 gridFloor = floor(hyperUV * 30.0);
            float xorTear = mod(gridFloor.x + gridFloor.y, 2.0);
            // Tearing only happens on specific horizontal scanlines
            float scanline = step(0.98, sin(uv.y * 12.0 + t_med));
            hyperUV.x += xorTear * 0.015 * sin(t_fast) * scanline;

            // [MYCOLOGICAL VORONOI MORPHING]
            // Iterative domain warp simulating physical stress / fluid damage
            vec2 warp = vec2(0.0);
            vec2 p = hyperUV;
            for(int i = 0; i < 3; i++) {
                warp += vec2(
                    sin(p.y * 3.0 + t_slow) + cos(p.x * 2.0 - t_slow),
                    cos(p.x * 3.0 + t_slow) - sin(p.y * 2.0 - t_slow)
                );
                p = warp * 0.6;
            }
            
            vec2 finalUV = hyperUV + warp * 0.12;
            float pressure = length(warp);

            // [CHROMATIC CANNIBALISM] CMYK Separation Moiré
            // Angles deliberately misregistered to force visible interference beats
            float aC = 0.261; // ~15 degrees
            float aM = 1.309; // ~75 degrees
            float aY = 0.0;   // 0 degrees
            
            // Frequencies warp based on physical pressure to create topological contour lines
            float baseFreq = 45.0;
            float fC = baseFreq + pressure * 4.0;
            float fM = baseFreq + 1.0 + pressure * 3.5;
            float fY = baseFreq - 1.0 + pressure * 4.5;

            // Rotate UVs for each color channel
            vec2 rC = vec2(finalUV.x * cos(aC) - finalUV.y * sin(aC), finalUV.x * sin(aC) + finalUV.y * cos(aC));
            vec2 rM = vec2(finalUV.x * cos(aM) - finalUV.y * sin(aM), finalUV.x * sin(aM) + finalUV.y * cos(aM));
            vec2 rY = vec2(finalUV.x * cos(aY) - finalUV.y * sin(aY), finalUV.x * sin(aY) + finalUV.y * cos(aY));

            // Generate sharp, painful sine interference (Structural Shine)
            float wC = abs(fract(rC.x * fC + t_med * 1.0) - 0.5) * 2.0;
            float wM = abs(fract(rM.x * fM - t_med * 1.1) - 0.5) * 2.0;
            float wY = abs(fract(rY.x * fY + t_med * 0.9) - 0.5) * 2.0;

            // Hostile thresholding (Print Failure)
            float vC = smoothstep(0.45, 0.35, wC);
            float vM = smoothstep(0.45, 0.35, wM);
            float vY = smoothstep(0.45, 0.35, wY);

            // [QUANTUM DUST]
            // Dead pixels behaving like pollen, accumulating in the moiré rosettes
            float hashVal = hash(vUv * u_resolution + vec2(t_fast));
            float rosette = vC * vM * vY; 
            float pollen = step(0.96, hashVal) * rosette;

            // [ASSEMBLY]
            vec3 color = vec3(0.0);
            
            // Neon Void CMY
            color += vec3(0.0, 1.0, 1.0) * vC;
            color += vec3(1.0, 0.0, 1.0) * vM;
            color += vec3(1.0, 1.0, 0.0) * vY;

            // [KINTSUGI CRACK SEAM SHINE]
            // Where the structural pressure is highest, inject burning white-gold
            float crack = smoothstep(0.95, 1.0, sin(pressure * 8.0));
            color += vec3(1.0, 0.9, 0.6) * crack * (0.5 + 0.5 * hashVal) * 2.0;

            // [BURIED LUMINOUS STRUCTURE]
            // Subsurface iridescence in the inverse spaces (the "valleys" of the grids)
            float subsurface = (1.0 - wC) * (1.0 - wM) * (1.0 - wY);
            vec3 irid = spectralColor(pressure * 1.2 - t_med * 0.5);
            color += irid * subsurface * 0.6;

            // Inject the pollen
            color += vec3(1.0) * pollen * 4.0;

            // [ABYSSAL RENDERING]
            // Deep crush to ensure the "void black" feels heavy and infinite
            float vignette = 1.0 - length(uv) * 0.4;
            color *= smoothstep(0.0, 0.8, vignette);
            
            // Contrast curve to make the neon feral
            color = pow(color, vec3(1.3));

            fragColor = vec4(color, 1.0);
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
  if (material.uniforms.u_time) {
    material.uniforms.u_time.value = time;
  }
  if (material.uniforms.u_resolution) {
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);