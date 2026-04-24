if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        const fragmentShader = `
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        
        in vec2 vUv;
        out vec4 fragColor;
        
        mat2 rot(float a) {
            float s = sin(a), c = cos(a);
            return mat2(c, -s, s, c);
        }
        
        // Continuous wave grating (Technique 04: Wave / Sinusoidal Moiré)
        float wave(vec2 p, float freq, float angle, float phase) {
            vec2 dir = vec2(cos(angle), sin(angle));
            return 0.5 + 0.5 * sin(dot(p, dir) * freq + phase);
        }
        
        // Spiral phantom grating (Technique 03: Spiral Phantoms)
        float spiral(vec2 p, float tightness, float arms, float phase) {
            float r = length(p);
            float a = atan(p.y, p.x);
            float sp = a + log(r + 0.001) * tightness + phase;
            return 0.5 + 0.5 * sin(sp * arms);
        }
        
        void main() {
            vec2 uv = (vUv - 0.5) * 2.0;
            uv.x *= u_resolution.x / u_resolution.y;
            
            vec2 mousePos = (u_mouse - 0.5) * 2.0;
            mousePos.x *= u_resolution.x / u_resolution.y;
            
            // Anamorphic distortion: pattern aligns at mouse, distorts elsewhere (Technique 10)
            float distToMouse = length(uv - mousePos);
            float align = smoothstep(0.0, 2.0, distToMouse);
            
            // Topographic distortion (Technique 09: Moiré as Scanner)
            vec2 topo = vec2(
                sin(uv.y * 4.0 + u_time) * 0.1,
                cos(uv.x * 3.5 - u_time * 0.8) * 0.1
            );
            
            vec2 pUV = uv + (uv - mousePos) * align * 0.8 + topo * align;
            
            // CMYK Separation Angles drifting over time (Technique 08)
            float aC = radians(15.0 + sin(u_time * 0.2) * 5.0);
            float aM = radians(75.0 + cos(u_time * 0.15) * 5.0);
            float aY = radians(0.0 + sin(u_time * 0.1) * 5.0);
            float aK = radians(45.0 + cos(u_time * 0.25) * 5.0);
            
            float baseF = 120.0;
            
            // Multiplicative 2D gratings (Creating Halftone Dots via wave interference)
            float c = wave(pUV, baseF + 2.0, aC, u_time * 3.0) * wave(pUV, baseF, aC + 1.57, -u_time);
            float m = wave(pUV, baseF + 5.0, aM, u_time * 2.8) * wave(pUV, baseF, aM + 1.57, -u_time * 1.2);
            float y = wave(pUV, baseF - 3.0, aY, u_time * 3.2) * wave(pUV, baseF, aY + 1.57, -u_time * 0.8);
            float k = wave(pUV, baseF + 1.0, aK, u_time * 2.5) * wave(pUV, baseF, aK + 1.57, -u_time * 1.5);
            
            // Inject Spiral Phantoms into the spatial frequency
            float sp1 = spiral(pUV, 4.0, 8.0, u_time * 2.0);
            float sp2 = spiral(pUV, 4.2, 8.0, -u_time * 2.1);
            float phantom = sp1 * sp2;
            
            c *= mix(0.5, 1.5, phantom);
            m *= mix(0.5, 1.5, phantom);
            
            // Additive CMYK for neon chromatic interference (Technique 07: RGB Chromatic)
            vec3 color = vec3(0.0);
            color += vec3(0.0, 1.0, 1.0) * c;
            color += vec3(1.0, 0.0, 1.0) * m;
            color += vec3(1.0, 1.0, 0.0) * y;
            color -= vec3(1.0) * k * 0.5; // K burns/absorbs the image
            
            color *= 0.5;
            
            // Contrast push to extract the difference frequency
            color = pow(max(color, vec3(0.0)), vec3(0.8));
            color = smoothstep(vec3(0.0), vec3(1.2), color);
            
            // Graffiti Aesthetic (Repo 2 integration)
            float sprayNoise = fract(sin(dot(uv + u_time, vec2(12.9898, 78.233))) * 43758.5453);
            vec3 edge = smoothstep(vec3(0.4), vec3(0.5), color) - smoothstep(vec3(0.5), vec3(0.6), color);
            
            // Thresholding like a dirty, oversprayed stencil
            vec3 stencil = step(vec3(0.5), color + vec3(sprayNoise * 0.2));
            color = mix(color, stencil, 0.3) - edge * sprayNoise;
            
            // Vignette focus
            color *= 1.0 - distToMouse * 0.3;
            
            fragColor = vec4(color, 1.0);
        }
        `;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
            },
            vertexShader: `
            out vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
            `,
            fragmentShader: fragmentShader,
            depthWrite: false,
            depthTest: false
        });
        
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);
        
        canvas.__three = { renderer, scene, camera, material };
    } catch (e) {
        console.error("WebGL Init Failed:", e);
        return;
    }
}

const { renderer, scene, camera, material } = canvas.__three;

if (material?.uniforms) {
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
    
    // Smoothly track mouse for the Anamorphic Secret sweet spot
    const targetX = mouse.x / grid.width;
    const targetY = 1.0 - (mouse.y / grid.height);
    
    const currentMouse = material.uniforms.u_mouse.value;
    currentMouse.x += (targetX - currentMouse.x) * 0.05;
    currentMouse.y += (targetY - currentMouse.y) * 0.05;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);