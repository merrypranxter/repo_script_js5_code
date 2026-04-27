if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
        renderer.autoClear = false;
        
        const simSize = 512;
        const size = simSize * simSize;
        const data = new Float32Array(size * 4);
        
        // Feral Lisa Frank Seeding: We don't want a single spot. We want an immediate, canvas-wide infection.
        for (let i = 0; i < size; i++) {
            let x = (i % simSize) / simSize;
            let y = Math.floor(i / simSize) / simSize;
            
            data[i * 4] = 1.0;     // U (activator background)
            data[i * 4 + 1] = 0.0; // V (inhibitor/infection)
            data[i * 4 + 2] = 0.0;
            data[i * 4 + 3] = 1.0;
            
            // Micro-noise for continuous organic instability
            if (Math.random() < 0.03) {
                data[i * 4] = 0.5;
                data[i * 4 + 1] = 0.25;
            }
            
            // Macro-wave structures (tiger stripes base)
            let macro = Math.sin(x * 40.0) * Math.cos(y * 40.0) + Math.sin(x * 15.0 - y * 15.0);
            if (macro > 1.3) {
                data[i * 4] = 0.2;
                data[i * 4 + 1] = 0.8;
            }
        }
        
        // Macro-splatters (leopard spots base)
        for (let j = 0; j < 120; j++) {
            let cx = Math.random();
            let cy = Math.random();
            let r = 0.01 + Math.random() * 0.05;
            let rSq = r * r;
            
            let minX = Math.max(0, Math.floor((cx - r) * simSize));
            let maxX = Math.min(simSize - 1, Math.ceil((cx + r) * simSize));
            let minY = Math.max(0, Math.floor((cy - r) * simSize));
            let maxY = Math.min(simSize - 1, Math.ceil((cy + r) * simSize));
            
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    let dx = (x / simSize) - cx;
                    let dy = (y / simSize) - cy;
                    if (dx * dx + dy * dy < rSq) {
                        let idx = (y * simSize + x) * 4;
                        data[idx] = 0.1;
                        data[idx + 1] = 0.9;
                    }
                }
            }
        }
        
        const initTexture = new THREE.DataTexture(data, simSize, simSize, THREE.RGBAFormat, THREE.FloatType);
        initTexture.needsUpdate = true;
        
        const rtOpts = {
            width: simSize,
            height: simSize,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            depthBuffer: false,
            stencilBuffer: false,
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping
        };
        
        const rtA = new THREE.WebGLRenderTarget(simSize, simSize, rtOpts);
        const rtB = new THREE.WebGLRenderTarget(simSize, simSize, rtOpts);
        
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const scene = new THREE.Scene();
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
        scene.add(plane);
        
        const simMaterial = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                uState: { value: initTexture },
                uResolution: { value: new THREE.Vector2(simSize, simSize) },
                uTime: { value: 0 },
                uMouse: { value: new THREE.Vector2(0, 0) },
                uMousePressed: { value: 0 }
            },
            vertexShader: `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D uState;
                uniform vec2 uResolution;
                uniform float uTime;
                uniform vec2 uMouse;
                uniform float uMousePressed;
                in vec2 vUv;
                out vec4 fragColor;
                
                // Karl Sims 9-Point Laplacian
                vec2 laplacian(sampler2D tex, vec2 uv, vec2 texel) {
                    vec2 sum = vec2(0.0);
                    sum += texture(tex, uv + vec2(-1.0, 0.0) * texel).rg * 0.2;
                    sum += texture(tex, uv + vec2( 1.0, 0.0) * texel).rg * 0.2;
                    sum += texture(tex, uv + vec2( 0.0, -1.0) * texel).rg * 0.2;
                    sum += texture(tex, uv + vec2( 0.0,  1.0) * texel).rg * 0.2;
                    sum += texture(tex, uv + vec2(-1.0, -1.0) * texel).rg * 0.05;
                    sum += texture(tex, uv + vec2( 1.0, -1.0) * texel).rg * 0.05;
                    sum += texture(tex, uv + vec2(-1.0,  1.0) * texel).rg * 0.05;
                    sum += texture(tex, uv + vec2( 1.0,  1.0) * texel).rg * 0.05;
                    sum -= texture(tex, uv).rg;
                    return sum;
                }
                
                void main() {
                    vec2 texel = 1.0 / uResolution;
                    vec2 state = texture(uState, vUv).rg;
                    
                    float u = state.r;
                    float v = state.g;
                    
                    vec2 lap = laplacian(uState, vUv, texel);
                    
                    // Domain Warping for Spatial F/k Parameters
                    // This forces the RD system to simultaneously render Spots (leopard) and Stripes (tiger)
                    float fluidNoise = sin(vUv.x * 20.0 + uTime * 0.5) * cos(vUv.y * 20.0 - uTime * 0.3) +
                                       sin(vUv.x * 50.0 - vUv.y * 30.0);
                                       
                    // Map noise [-2, 2] to [0, 1]
                    float n = clamp(fluidNoise * 0.25 + 0.5, 0.0, 1.0);
                    
                    // Mix between Unstable Stripes (0.022, 0.051) and Growing Worms/Spots (0.046, 0.065)
                    float F = mix(0.022, 0.046, n);
                    float k = mix(0.051, 0.065, n);
                    
                    float reaction = u * v * v;
                    float du = 1.0 * lap.r - reaction + F * (1.0 - u);
                    float dv = 0.5 * lap.g + reaction - (F + k) * v;
                    
                    float newU = clamp(u + 1.0 * du, 0.0, 1.0);
                    float newV = clamp(v + 1.0 * dv, 0.0, 1.0);
                    
                    // Mouse Interaction: Paint new infections
                    float dist = distance(vUv, uMouse);
                    if (uMousePressed > 0.5 && dist < 0.04) {
                        newV = mix(newV, 1.0, 0.15);
                        newU = mix(newU, 0.0, 0.15);
                    }
                    
                    fragColor = vec4(newU, newV, 0.0, 1.0);
                }
            `
        });
        
        const displayMaterial = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                uState: { value: null },
                uTime: { value: 0 },
                uTexResolution: { value: new THREE.Vector2(simSize, simSize) }
            },
            vertexShader: `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D uState;
                uniform float uTime;
                uniform vec2 uTexResolution;
                in vec2 vUv;
                out vec4 fragColor;
                
                // Pure Lisa Frank Neon Palette - No Black, No White
                vec3 lisaFrank(float t) {
                    t = fract(t);
                    vec3 c1 = vec3(1.0, 0.0, 0.8); // Hot Pink
                    vec3 c2 = vec3(0.0, 1.0, 1.0); // Neon Cyan
                    vec3 c3 = vec3(0.6, 0.0, 1.0); // Electric Purple
                    vec3 c4 = vec3(1.0, 0.9, 0.0); // Bright Yellow
                    vec3 c5 = vec3(0.0, 1.0, 0.3); // Neon Green
                    
                    if (t < 0.2) return mix(c1, c2, t * 5.0);
                    if (t < 0.4) return mix(c2, c3, (t - 0.2) * 5.0);
                    if (t < 0.6) return mix(c3, c4, (t - 0.4) * 5.0);
                    if (t < 0.8) return mix(c4, c5, (t - 0.6) * 5.0);
                    return mix(c5, c1, (t - 0.8) * 5.0);
                }
                
                void main() {
                    vec2 state = texture(uState, vUv).rg;
                    float u = state.r;
                    float v = state.g;
                    
                    // Cycle hues organically through the RD concentrations and space
                    float t = v * 3.0 + u * 1.5 + uTime * 0.3 + vUv.x * 0.5 - vUv.y * 0.5;
                    vec3 color = lisaFrank(t);
                    
                    // Extract gradient for fluid bump mapping
                    vec2 texel = 1.0 / uTexResolution;
                    float vRight = texture(uState, vUv + vec2(texel.x, 0.0)).g;
                    float vUp = texture(uState, vUv + vec2(0.0, texel.y)).g;
                    vec2 grad = vec2(vRight - v, vUp - v);
                    
                    // Fake lighting for wet, glossy texture
                    vec3 normal = normalize(vec3(grad * 15.0, 1.0));
                    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                    float diffuse = max(dot(normal, lightDir), 0.0);
                    
                    // Instead of adding white light, we shift the hue for a pure color highlight
                    vec3 highlight = lisaFrank(t + 0.15);
                    color = mix(color, highlight, diffuse * 0.8);
                    
                    // Fluorescent Rim Injection: Detect edges of the RD structures
                    float edge = smoothstep(0.25, 0.35, v) - smoothstep(0.35, 0.45, v);
                    vec3 rimColor = lisaFrank(t - 0.3);
                    color = mix(color, rimColor, edge * 0.9);
                    
                    // Hard clamp to prevent any accidental blacks or whites
                    fragColor = vec4(clamp(color, 0.05, 0.95), 1.0);
                }
            `
        });
        
        plane.material = simMaterial;
        
        canvas.__three = {
            renderer,
            scene,
            camera,
            plane,
            simMaterial,
            displayMaterial,
            rtA,
            rtB,
            pingPong: 0
        };
        
        // Initial seed render
        renderer.setRenderTarget(rtA);
        renderer.render(scene, camera);
        
    } catch(e) {
        console.error("WebGL RD Init Failed", e);
        return;
    }
}

const sys = canvas.__three;
if (!sys || !sys.simMaterial) return;

if (sys.simMaterial.uniforms && sys.simMaterial.uniforms.uTime) {
    sys.simMaterial.uniforms.uTime.value = time;
}
if (sys.displayMaterial.uniforms && sys.displayMaterial.uniforms.uTime) {
    sys.displayMaterial.uniforms.uTime.value = time;
}

if (sys.simMaterial.uniforms.uMouse) {
    sys.simMaterial.uniforms.uMouse.value.set(mouse.x / grid.width, 1.0 - (mouse.y / grid.height));
    sys.simMaterial.uniforms.uMousePressed.value = mouse.isPressed ? 1.0 : 0.0;
}

sys.renderer.setSize(grid.width, grid.height, false);

// Overclocked ping-pong loop for rapid feral growth
const steps = 30; 
for (let i = 0; i < steps; i++) {
    const readRT = sys.pingPong % 2 === 0 ? sys.rtA : sys.rtB;
    const writeRT = sys.pingPong % 2 === 0 ? sys.rtB : sys.rtA;
    
    sys.simMaterial.uniforms.uState.value = readRT.texture;
    sys.plane.material = sys.simMaterial;
    
    sys.renderer.setRenderTarget(writeRT);
    sys.renderer.render(sys.scene, sys.camera);
    
    sys.pingPong++;
}

// Display pass
sys.renderer.setRenderTarget(null);
sys.displayMaterial.uniforms.uState.value = (sys.pingPong % 2 === 0 ? sys.rtA : sys.rtB).texture;
sys.plane.material = sys.displayMaterial;
sys.renderer.render(sys.scene, sys.camera);