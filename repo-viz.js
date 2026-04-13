if (!canvas.__three) {
  try {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false });
    if (!gl) throw new Error("WebGL 2 not supported or context occupied");

    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: false });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
    camera.position.z = 1;

    const vertexShader = `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      in vec2 vUv;
      out vec4 fragColor;

      // Bayer 4x4 Dither Matrix from pixel_voxel repo
      const float bayer[16] = float[16](
        0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
       12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
        3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
       15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
      );

      // Lisa Frank Aesthetic Palette
      vec3 getLisaFrankPalette(float t) {
        t = fract(t);
        if(t < 0.2) return vec3(1.0, 0.0, 0.8);   // Hot Pink
        if(t < 0.4) return vec3(0.0, 1.0, 1.0);   // Cyan
        if(t < 0.6) return vec3(1.0, 1.0, 0.0);   // Neon Yellow
        if(t < 0.8) return vec3(0.0, 1.0, 0.0);   // Toxic Green
        return vec3(0.4, 0.0, 0.8);               // Deep Velvet Purple
      }

      // Quasicrystal Diffraction Field (5-fold Penrose basis)
      // Simulates the interference of 5 plane waves
      float qcField(vec2 p, float t, float phasonDrift) {
        float field = 0.0;
        for(int i = 0; i < 5; i++) {
            // 5-fold symmetry angles
            float angle = float(i) * 3.14159265359 / 5.0;
            
            // Phason strain: distorting the perfect geometry over time and space
            float strain = sin(p.x * 0.1 + t) * 0.05 + cos(p.y * 0.1 - t) * 0.05;
            vec2 dir = vec2(cos(angle + strain), sin(angle + strain));
            
            // Phase shift (translates the pattern aperiodically)
            float phase = t * phasonDrift * (1.0 + 0.1 * float(i));
            
            field += cos(dot(p, dir) + phase);
        }
        // Normalize roughly to 0.0 -> 1.0
        return (field + 5.0) / 10.0; 
      }

      // Hash for noise
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        // 1. Voxel/Pixel Grid Lock (from pixel_voxel repo)
        // Dynamically changing pixel size to simulate a failing retro display
        float pixelScale = 3.0 + floor(sin(u_time * 2.0) * 1.5 + 1.5); 
        vec2 virtualRes = u_resolution / pixelScale;
        vec2 gridUV = floor(vUv * virtualRes) / virtualRes;
        
        // Aspect ratio correction for the math field
        vec2 p = (gridUV - 0.5) * vec2(u_resolution.x/u_resolution.y, 1.0);
        
        // Zooming in and out of the aperiodic structure
        float zoom = 30.0 + sin(u_time * 0.3) * 15.0;
        p *= zoom;

        // 2. Sample the Quasicrystal field with Chromatic Aberration
        // We sample it 3 times with slight phase offsets to simulate color-channel separation
        float phasonSpeed = 2.0;
        float r = qcField(p, u_time, phasonSpeed);
        float g = qcField(p, u_time + 0.1, phasonSpeed);
        float b = qcField(p, u_time + 0.2, phasonSpeed);

        // Combine for a luminance map to drive the dithering
        float lum = (r + g + b) / 3.0;

        // 3. Ordered Dithering (from pixel_voxel repo)
        int bx = int(mod(floor(vUv.x * u_resolution.x / pixelScale), 4.0));
        int by = int(mod(floor(vUv.y * u_resolution.y / pixelScale), 4.0));
        float ditherThreshold = bayer[by * 4 + bx];

        // Apply dither spread
        float spread = 0.5;
        float ditheredIndex = lum + (ditherThreshold - 0.5) * spread;

        // 4. Void Extraction (creates the "peeling sticker" look)
        // If the field is too low, we render the "trapper keeper void"
        float voidThreshold = 0.35 + sin(u_time * 0.8) * 0.1;
        if (lum < voidThreshold) {
            // Animal print / starry noise background
            float noise = hash(gridUV * 10.0 + u_time * 0.1);
            vec3 voidColor = vec3(0.05);
            if (noise > 0.95) voidColor = vec3(0.0, 1.0, 1.0); // Cyan stars
            if (noise < 0.05) voidColor = vec3(1.0, 0.0, 1.0); // Pink stars
            fragColor = vec4(voidColor, 1.0);
            return;
        }

        // 5. Palette Mapping (Lisa Frank Aesthetic)
        // Map the dithered index to the neon palette, animated over time
        vec3 color = getLisaFrankPalette(ditheredIndex * 2.5 - u_time * 0.5);

        // 6. Hard Pixel Outline (Sobel-ish edge detection on the field)
        vec2 px = 1.0 / virtualRes;
        float rR = qcField(p + vec2(px.x, 0.0) * zoom, u_time, phasonSpeed);
        float rU = qcField(p + vec2(0.0, px.y) * zoom, u_time, phasonSpeed);
        float edge = abs(r - rR) + abs(r - rU);
        
        // If we hit a sharp phase transition, draw a thick black outline
        if (edge > 0.08) {
            color = vec3(0.02, 0.0, 0.05); // near black with a purple tint
        }

        fragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
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

if (material?.uniforms?.u_time) {
  material.uniforms.u_time.value = time;
}
if (material?.uniforms?.u_resolution) {
  material.uniforms.u_resolution.value.set(grid.width, grid.height);
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);