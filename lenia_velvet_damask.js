const updateVert = `
out vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

const updateFrag = `
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D u_tex;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec2 u_mouseDelta;
uniform float u_time;
uniform int u_frame;

void main() {
    vec2 texel = 1.0 / u_res;
    
    // 9-point neighborhood sampling for smoother, Lenia-like organic blobs
    vec4 c  = texture(u_tex, vUv);
    vec4 tl = texture(u_tex, fract(vUv + vec2(-texel.x, -texel.y)));
    vec4 tc = texture(u_tex, fract(vUv + vec2(0.0, -texel.y)));
    vec4 tr = texture(u_tex, fract(vUv + vec2(texel.x, -texel.y)));
    vec4 ml = texture(u_tex, fract(vUv + vec2(-texel.x, 0.0)));
    vec4 mr = texture(u_tex, fract(vUv + vec2(texel.x, 0.0)));
    vec4 bl = texture(u_tex, fract(vUv + vec2(-texel.x, texel.y)));
    vec4 bc = texture(u_tex, fract(vUv + vec2(0.0, texel.y)));
    vec4 br = texture(u_tex, fract(vUv + vec2(texel.x, texel.y)));
    
    // Isotropic Laplacian
    float lapU = 0.2 * (ml.r + mr.r + tc.r + bc.r) + 0.05 * (tl.r + tr.r + bl.r + br.r) - c.r;
    float lapV = 0.2 * (ml.g + mr.g + tc.g + bc.g) + 0.05 * (tl.g + tr.g + bl.g + br.g) - c.g;
    
    // Damask layout generation (ornamental framework)
    vec2 aspect = vec2(u_res.x / u_res.y, 1.0);
    vec2 st = vUv * aspect * 6.28318 * 2.0; 
    float damask = sin(st.x) * cos(st.y) + sin(st.x * 0.5 + st.y * 1.5) * cos(st.y * 0.5 - st.x * 1.5);
    
    // Normalize and animate breathing
    damask = damask * 0.25 + 0.5;
    damask += sin(u_time * 0.2) * 0.1;
    damask = clamp(damask, 0.0, 1.0);
    
    // Map damask pattern to Reaction-Diffusion parameters
    // This forces the living cells to form ornamental textile structures
    float F = mix(0.022, 0.038, damask);
    float K = mix(0.051, 0.061, damask);
    
    // Scaled diffusion rates for 9-point laplacian
    float Du = 0.8;
    float Dv = 0.4;
    float uvv = c.r * c.g * c.g;
    
    // RD Update
    float uNext = c.r + (Du * lapU - uvv + F * (1.0 - c.r));
    float vNext = c.g + (Dv * lapV + uvv - (F + K) * c.g);
    
    float nap = c.b;
    float memory = c.a;
    
    // Velvet Nap Brushing Interaction
    float dist = length(vUv * aspect - u_mouse * aspect);
    float speed = length(u_mouseDelta);
    
    if (speed > 0.0 && dist < 0.08) {
        float brush = dot(normalize(vUv - u_mouse + 0.0001), normalize(u_mouseDelta + 0.0001));
        nap = mix(nap, brush * 0.5 + 0.5, smoothstep(0.08, 0.0, dist) * clamp(speed * 20.0, 0.0, 1.0));
        
        // Brushing excites the organisms
        vNext = min(vNext + 0.15 * smoothstep(0.08, 0.0, dist), 1.0);
    }
    
    // Slowly relax nap back to neutral and track cellular memory
    nap = mix(nap, 0.5, 0.005); 
    memory = mix(memory, vNext, 0.02); 
    
    // Seeding
    if (u_frame < 5) {
        float seed = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
        uNext = 1.0;
        vNext = (seed > 0.95 && damask > 0.4) ? 1.0 : 0.0;
        nap = 0.5;
        memory = 0.0;
    }
    
    fragColor = vec4(clamp(uNext, 0.0, 1.0), clamp(vNext, 0.0, 1.0), nap, memory);
}
`;

const renderFrag = `
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D u_tex;
uniform vec2 u_res;
uniform float u_time;

void main() {
    vec4 data = texture(u_tex, vUv);
    float u = data.r;
    float v = data.g;
    float nap = data.b;
    float mem = data.a;
    
    // Normal estimation from cellular density (v channel)
    float eps = 1.0 / u_res.x;
    float vL = texture(u_tex, fract(vUv + vec2(-eps, 0.0))).g;
    float vR = texture(u_tex, fract(vUv + vec2(eps, 0.0))).g;
    float vU = texture(u_tex, fract(vUv + vec2(0.0, -eps))).g;
    float vD = texture(u_tex, fract(vUv + vec2(0.0, eps))).g;
    
    float hScale = 6.0;
    vec3 normal = normalize(vec3((vL - vR) * hScale, (vD - vU) * hScale, 1.0));
    
    // Apply Velvet Nap directional bias
    vec2 napVec = vec2(nap - 0.5, abs(nap - 0.5));
    normal = normalize(normal + vec3(napVec * 1.5, 0.0));
    
    // Lighting setup
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 lightDir1 = normalize(vec3(sin(u_time * 0.3), cos(u_time * 0.2), 0.8));
    vec3 lightDir2 = normalize(vec3(-sin(u_time * 0.4), -cos(u_time * 0.25), 0.5));
    
    float NdotV = max(dot(normal, viewDir), 0.0);
    float NdotL1 = max(dot(normal, lightDir1), 0.0);
    float NdotL2 = max(dot(normal, lightDir2), 0.0);
    
    // Velvet sheen (bright grazing highlights)
    float sheen1 = pow(1.0 - NdotV, 3.5) * NdotL1;
    float sheen2 = pow(1.0 - NdotV, 2.5) * NdotL2;
    
    // Base fabric colors
    vec3 baseVelvet = vec3(0.02, 0.0, 0.08); // Deep UV
    vec3 sheenColor = vec3(0.6, 0.1, 0.9);   // Luminous purple
    
    vec3 velvet = baseVelvet * (NdotL1 + NdotL2) * 0.6 + sheenColor * (sheen1 + sheen2);
    
    // Biological Motif colors
    vec3 motifColor = vec3(1.0, 0.0, 0.4);   // Hot magenta
    vec3 haloColor = vec3(0.0, 0.8, 1.0);    // Cyan
    vec3 accentColor = vec3(0.6, 1.0, 0.0);  // Acid green
    vec3 growthColor = vec3(1.0, 0.8, 0.0);  // Orange/yellow
    
    // Cellular mapping masks
    float isMotif = smoothstep(0.2, 0.6, v);
    float isHalo = smoothstep(0.0, 0.15, v) * smoothstep(0.3, 0.15, v);
    float isGrowth = smoothstep(0.1, 0.4, u * v * 4.0);
    
    // Specular highlight for raised alien structures
    vec3 halfVector = normalize(lightDir1 + viewDir);
    float NdotH = max(dot(normal, halfVector), 0.0);
    float specular = pow(NdotH, 48.0) * isMotif;
    
    // Composition
    vec3 col = velvet;
    col = mix(col, haloColor, isHalo * 0.8);
    col = mix(col, motifColor, isMotif * 0.95);
    col = mix(col, growthColor, isGrowth * 0.7);
    col = mix(col, accentColor, smoothstep(0.5, 0.9, mem) * isMotif * 0.6);
    
    col += motifColor * specular * 1.5;
    
    // Sparkle dust embedded in the brightest velvet pile
    float sparkleHash = fract(sin(dot(vUv * u_res + u_time * 0.5, vec2(12.9898, 78.233))) * 43758.5453);
    float sparkle = step(0.995, sparkleHash) * (sheen1 + sheen2) * 3.0;
    col += vec3(1.0) * sparkle;
    
    // Deep structural occlusion
    float ao = smoothstep(0.0, 0.6, u);
    col *= mix(0.3, 1.0, ao);
    
    // Vignette
    float vig = length(vUv - 0.5);
    col *= smoothstep(0.8, 0.3, vig);
    
    // ACES-like Tone mapping
    col = col / (1.0 + col);
    col = pow(col, vec3(1.0 / 2.2));
    
    fragColor = vec4(col, 1.0);
}
`;

if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
        renderer.autoClear = false;
        
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        const rtOptions = {
            type: THREE.FloatType,
            format: THREE.RGBAFormat,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            depthBuffer: false
        };
        
        let rtA = new THREE.WebGLRenderTarget(grid.width, grid.height, rtOptions);
        let rtB = new THREE.WebGLRenderTarget(grid.width, grid.height, rtOptions);
        
        const updateMaterial = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_tex: { value: null },
                u_res: { value: new THREE.Vector2(grid.width, grid.height) },
                u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
                u_mouseDelta: { value: new THREE.Vector2(0, 0) },
                u_time: { value: 0 },
                u_frame: { value: 0 }
            },
            vertexShader: updateVert,
            fragmentShader: updateFrag
        });
        
        const renderMaterial = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_tex: { value: null },
                u_res: { value: new THREE.Vector2(grid.width, grid.height) },
                u_time: { value: 0 }
            },
            vertexShader: updateVert,
            fragmentShader: renderFrag
        });
        
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
        scene.add(mesh);
        
        canvas.__three = { 
            renderer, scene, camera, rtA, rtB, 
            updateMaterial, renderMaterial, mesh,
            frameCount: 0,
            prevMouse: { x: mouse.x, y: mouse.y }
        };
    } catch (e) {
        console.error("WebGL Initialization Failed:", e);
        return;
    }
}

const sys = canvas.__three;
const { renderer, scene, camera } = sys;

if (sys.rtA.width !== grid.width || sys.rtA.height !== grid.height) {
    sys.rtA.setSize(grid.width, grid.height);
    sys.rtB.setSize(grid.width, grid.height);
    sys.updateMaterial.uniforms.u_res.value.set(grid.width, grid.height);
    sys.renderMaterial.uniforms.u_res.value.set(grid.width, grid.height);
}

// Convert mouse to UV coordinates
let mx = mouse.x / grid.width;
let my = 1.0 - (mouse.y / grid.height);
let px = sys.prevMouse.x / grid.width;
let py = 1.0 - (sys.prevMouse.y / grid.height);

let dx = mouse.isPressed ? (mx - px) : 0.0;
let dy = mouse.isPressed ? (my - py) : 0.0;

sys.updateMaterial.uniforms.u_mouse.value.set(mx, my);
sys.updateMaterial.uniforms.u_mouseDelta.value.set(dx, dy);
sys.updateMaterial.uniforms.u_time.value = time;
sys.updateMaterial.uniforms.u_frame.value = sys.frameCount;

sys.prevMouse.x = mouse.x;
sys.prevMouse.y = mouse.y;

sys.mesh.material = sys.updateMaterial;

// Run the reaction-diffusion simulation multiple times per frame for faster growth
const simSteps = 6;
for (let i = 0; i < simSteps; i++) {
    sys.updateMaterial.uniforms.u_tex.value = sys.rtA.texture;
    renderer.setRenderTarget(sys.rtB);
    renderer.render(scene, camera);
    
    let temp = sys.rtA;
    sys.rtA = sys.rtB;
    sys.rtB = temp;
}

// Render final velvet pass to screen
sys.mesh.material = sys.renderMaterial;
sys.renderMaterial.uniforms.u_tex.value = sys.rtA.texture;
sys.renderMaterial.uniforms.u_time.value = time;

renderer.setRenderTarget(null);
renderer.render(scene, camera);

sys.frameCount++;