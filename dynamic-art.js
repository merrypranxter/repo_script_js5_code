try {
    if (!canvas.__three) {
        const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
        if (!gl) throw new Error("WebGL 2 not supported or context occupied");

        const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: false });
        renderer.setPixelRatio(1); // Force 1:1 for pixel art crispness
        
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        // THE GENOME MIX:
        // 1. Vibration (Chladni eigenmodes)
        // 2. Pixel/Voxel (Grid lock, Bayer 4x4 dither, Hard palette)
        // 3. Shoegaze (Chromatic aberration, Moiré interference, Vignette)
        // 4. Lisa Frank (Neon Cyan, Magenta, Yellow, Deep Purple palette)

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
            uniform vec2 u_mouse;
            uniform vec2 u_resolution;

            #define PI 3.14159265359

            // VIBRATION: Chladni plate math
            float chladni(vec2 p, float m, float n) {
                float a = sin(m * PI * p.x) * sin(n * PI * p.y);
                float b = sin(n * PI * p.x) * sin(m * PI * p.y);
                return a + b;
            }

            // PIXEL/VOXEL & LISA FRANK: Evaluate color at a specific pixel
            vec3 getPixelColor(vec2 snappedUV, vec2 screenUV) {
                // SHOEGAZE: Moiré interference (phase drift)
                float moireX = sin(snappedUV.x * 150.0 + u_time * 0.5);
                float moireY = sin(snappedUV.y * 130.0 - u_time * 0.3);
                float moire = moireX * moireY;

                // VIBRATION: Dynamic frequencies based on time and mouse
                float modeM = 2.0 + sin(u_time * 0.2) * 4.0 + (u_mouse.x * 6.0);
                float modeN = 3.0 + cos(u_time * 0.15) * 4.0 + (u_mouse.y * 6.0);

                // Map UV to -1..1 for Chladni
                vec2 p = snappedUV * 2.0 - 1.0;
                
                // Calculate base vibration wave
                float wave = chladni(p, modeM, modeN);
                
                // Add Shoegaze interference
                wave += moire * 0.4;
                
                // Normalize to 0..1
                wave = (wave * 0.5) + 0.5;

                // PIXEL_VOXEL: 4x4 Bayer Dither Matrix
                const float bayer[16] = float[16](
                    0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
                   12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
                    3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
                   15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
                );

                // Grid size for dithering (e.g., 320x240 virtual resolution)
                vec2 grid = vec2(320.0, 240.0);
                vec2 ditherCoord = mod(floor(screenUV * grid), 4.0);
                int bayerIndex = int(ditherCoord.y) * 4 + int(ditherCoord.x);
                float threshold = bayer[bayerIndex];

                // Apply dither spread
                float spread = 0.35;
                float ditheredVal = wave + (threshold - 0.5) * spread;

                // LISA FRANK AESTHETIC: Hard palette snap (Nearest Color)
                if (ditheredVal < 0.2) return vec3(0.18, 0.0, 0.35);      // Deep Violet (Shadow)
                else if (ditheredVal < 0.4) return vec3(0.0, 0.8, 1.0);   // Neon Cyan
                else if (ditheredVal < 0.6) return vec3(1.0, 0.0, 0.8);   // Hot Magenta
                else if (ditheredVal < 0.8) return vec3(1.0, 0.9, 0.0);   // Toxic Yellow
                else return vec3(1.0, 1.0, 1.0);                          // Halation White (Bloom)
            }

            void main() {
                // PIXEL_VOXEL: Pixelate Grid Lock
                vec2 grid = vec2(320.0, 240.0);
                vec2 pixelSize = 1.0 / grid;
                vec2 snappedUV = floor(vUv / pixelSize) * pixelSize + (pixelSize * 0.5);

                // SHOEGAZE: Chromatic Aberration (Color Bleed)
                // Offset R and B channels slightly based on time to simulate cheap lens
                float caOffset = 0.008 * sin(u_time * 0.8);
                
                float r = getPixelColor(snappedUV + vec2(caOffset, 0.0), vUv).r;
                float g = getPixelColor(snappedUV, vUv).g;
                float b = getPixelColor(snappedUV - vec2(caOffset, 0.0), vUv).b;

                vec3 finalColor = vec3(r, g, b);

                // SHOEGAZE: Gentle Vignette (Atmospheric rolloff)
                float dist = distance(vUv, vec2(0.5));
                float vignette = smoothstep(0.9, 0.3, dist);
                finalColor *= vignette;

                fragColor = vec4(finalColor, 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader,
            fragmentShader,
            uniforms: {
                u_time: { value: 0 },
                u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
            },
            depthWrite: false,
            depthTest: false
        });

        const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(plane);

        canvas.__three = { renderer, scene, camera, material };
    }

    const { renderer, scene, camera, material } = canvas.__three;

    if (material && material.uniforms) {
        material.uniforms.u_time.value = time;
        
        // Smooth mouse tracking with easing
        const targetMouseX = mouse.x / grid.width;
        const targetMouseY = 1.0 - (mouse.y / grid.height); // Flip Y for WebGL
        
        // Initial setup or lerp
        if (material.uniforms.u_mouse.value.x === 0.5 && material.uniforms.u_mouse.value.y === 0.5 && !mouse.isPressed) {
            // Idle wander if untouched
            material.uniforms.u_mouse.value.x = 0.5 + Math.sin(time * 0.3) * 0.2;
            material.uniforms.u_mouse.value.y = 0.5 + Math.cos(time * 0.25) * 0.2;
        } else {
            material.uniforms.u_mouse.value.x += (targetMouseX - material.uniforms.u_mouse.value.x) * 0.05;
            material.uniforms.u_mouse.value.y += (targetMouseY - material.uniforms.u_mouse.value.y) * 0.05;
        }
        
        material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }

    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

} catch (e) {
    console.error("Feral Generative System Failed:", e);
    // Fallback to basic visual error if WebGL dies
    if (ctx) {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, grid.width, grid.height);
        ctx.fillStyle = '#FF00FF';
        ctx.font = '12px monospace';
        ctx.fillText('SYSTEM_FAILURE: WebGL Context Lost', 20, 30);
    }
}