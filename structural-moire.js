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
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform vec2 u_resolution;
        
        in vec2 vUv;
        out vec4 fragColor;

        #define PI 3.14159265359

        // Repo 3: The Ocean / Math (Equation-driven domain warping)
        vec2 mathWarp(vec2 p, float t) {
            float x = sin(p.y * 4.0 + t * 0.8) * 0.08 + sin(p.x * 2.5 - t * 0.4) * 0.04;
            float y = cos(p.x * 4.0 - t * 0.8) * 0.08 + cos(p.y * 2.5 + t * 0.4) * 0.04;
            return p + vec2(x, y);
        }

        // Repo 3: Cosine Palette (The Whirring)
        vec3 paletteTheWhirring(float t) {
            vec3 a = vec3(0.2, 0.5, 0.6);
            vec3 b = vec3(0.2, 0.4, 0.4);
            vec3 c = vec3(2.0, 1.0, 1.0);
            vec3 d = vec3(0.0, 0.25, 0.5);
            return a + b * cos(2.0 * PI * (c * t + d));
        }

        // Repo 1 & 3: Structural Moiré Generation (Radial Rings + Tetragrammaton)
        float getMoireLayer(vec2 uv, float scale, vec2 center1, vec2 center2, float time) {
            // Apply Shoegaze phase drift / Ocean warp
            vec2 p = mathWarp(uv, time);

            // Repo 1 (Variation 5): Phase Dislocation / Topological Defect
            vec2 defectCenter = vec2(sin(time * 0.3) * 0.4, cos(time * 0.4) * 0.4);
            float defect = smoothstep(0.3, 0.0, length(p - defectCenter)) * PI;

            // Ring system 1 (The Whirring)
            float r1 = length(p - center1);
            float ring1 = 0.5 + 0.5 * sin(r1 * scale - time * 3.0 + defect);

            // Ring system 2 (Slightly different scale/center to force spatial beating)
            float r2 = length(p - center2);
            float ring2 = 0.5 + 0.5 * sin(r2 * (scale * 1.03) + time * 2.5);

            // Repo 3: The Tetragrammaton (4-fold structural mask)
            float angle = atan(p.y, p.x);
            float tetra = 0.5 + 0.5 * sin(angle * 4.0 + log(length(p) + 0.01) * 8.0 - time * 1.5);

            // Repo 1: Multiplicative Sinusoidal Interference
            float moire = ring1 * ring2 * (0.3 + 0.7 * tetra);

            // Repo 2: Soften for Shoegaze (diffusion/low contrast rolloff)
            return pow(moire, 0.7);
        }

        void main() {
            vec2 uv = vUv * 2.0 - 1.0;
            uv.x *= u_resolution.x / u_resolution.y;

            // Animated centers for the interference rings
            vec2 c1 = vec2(sin(u_time * 0.2) * 0.15, cos(u_time * 0.25) * 0.15);
            vec2 c2 = vec2(cos(u_time * 0.15) * 0.1, sin(u_time * 0.22) * 0.1);

            // Base spatial frequency
            float baseScale = 90.0;

            // Repo 1 & 2: Chromatic RGB Moiré + Shoegaze Chromatic Aberration
            float ca = 0.015 * length(uv); // stronger at edges
            
            // Calculate interference per channel with temporal and spatial offsets
            float mR = getMoireLayer(uv + vec2(ca, 0.0), baseScale, c1, c2, u_time);
            float mG = getMoireLayer(uv, baseScale * 1.015, c1, c2, u_time * 1.05);
            float mB = getMoireLayer(uv - vec2(ca, 0.0), baseScale * 1.03, c1, c2, u_time * 1.1);

            vec3 color = vec3(mR, mG, mB);

            // Repo 3: Map interference intensity to 'The Whirring' palette
            float t = (mR + mG + mB) / 3.0 + u_time * 0.1;
            vec3 pal = paletteTheWhirring(t);

            // Blend raw chromatic moiré with phenomenological palette
            color = mix(color, pal * color * 2.2, 0.65);

            // Repo 2: Shoegaze Halation Bloom
            float lum = dot(color, vec3(0.299, 0.587, 0.114));
            vec3 bloom = max(vec3(0.0), color - 0.45) * 1.8;
            bloom *= vec3(1.0, 0.85, 0.65); // Warm film emulsion overspill
            color += bloom;

            // Repo 2: Texture Memory (Film Grain Clumps)
            float noise = fract(sin(dot(uv + u_time, vec2(12.9898, 78.233))) * 43758.5453);
            color += (noise - 0.5) * 0.14;

            // Repo 2: Gentle Vignette (Edges dissolve into atmosphere)
            float vignette = smoothstep(1.6, 0.2, length(uv));
            color *= vignette;

            // Repo 3: The Void Rule / The Ship (Deep purple to void-black background)
            vec3 voidColor = vec3(0.06, 0.02, 0.1);
            color = max(color, voidColor);

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

if (material?.uniforms?.u_time) {
  material.uniforms.u_time.value = time;
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);