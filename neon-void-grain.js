if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
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
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;

// ─── Mathematical Noise & Hashing ──────────────────────────────────────────────
float hash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
}

float snoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    
    float n000 = hash(i + vec3(0.0, 0.0, 0.0));
    float n100 = hash(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash(i + vec3(1.0, 1.0, 1.0));
    
    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    
    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);
    
    return mix(nxy0, nxy1, f.z) * 2.0 - 1.0;
}

float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += a * snoise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

float getHeight(vec2 p, float t) {
    return fbm(vec3(p * 3.0, t)) * 0.5 + 0.5;
}

// ─── Perceptual Color Math (OKLab) ─────────────────────────────────────────────
vec3 OKLab_to_linearSRGB(vec3 c) {
    float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
    float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
    float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;

    float l = l_ * l_ * l_;
    float m = m_ * m_ * m_;
    float s = s_ * s_ * s_;

    return vec3(
         4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
}

float linear_to_sRGB(float x) {
    x = clamp(x, 0.0, 1.0);
    return x <= 0.0031308 ? x * 12.92 : 1.055 * pow(x, 1.0/2.4) - 0.055;
}

vec3 OKLab_to_sRGB(vec3 c) {
    vec3 lin = OKLab_to_linearSRGB(c);
    return vec3(linear_to_sRGB(lin.r), linear_to_sRGB(lin.g), linear_to_sRGB(lin.b));
}

// ─── Main Material Engine ──────────────────────────────────────────────────────
void main() {
    vec2 uv2 = vUv * 2.0 - 1.0;
    uv2.x *= u_resolution.x / u_resolution.y;
    
    // Three simultaneous time scales
    float t_slow = u_time * 0.05;
    float t_med  = u_time * 0.2;
    float t_fast = u_time * 1.5;
    
    // 1. Domain Warping (Slow Drift)
    vec3 warpPos = vec3(uv2 * 1.5, t_slow);
    vec2 warp = vec2(fbm(warpPos), fbm(warpPos + vec3(12.3, 4.5, -6.7)));
    
    // 2. Poincaré Hyperbolic Projection
    vec2 hyperUv = uv2 / (1.0 + dot(uv2, uv2));
    hyperUv += warp * 0.5;
    
    float theta = t_slow * 0.2;
    mat2 rot = mat2(cos(theta), -sin(theta), sin(theta), cos(theta));
    hyperUv = rot * hyperUv;
    
    // 3. Multi-scale Turing / Lenia Approximation (Medium Structure)
    float s1 = getHeight(hyperUv, t_med);
    float s2 = fbm(vec3(hyperUv * 6.0 - warp * 0.5, t_med * 1.1)) * 0.5 + 0.5;
    float s3 = fbm(vec3(hyperUv * 12.0 + warp, t_med * 0.9)) * 0.5 + 0.5;
    
    // Lenia Gaussian Growth Functions
    float g1 = 2.0 * exp(-pow(s1 - s2 - 0.15, 2.0) / 0.02) - 1.0;
    float g2 = 2.0 * exp(-pow(s2 - s3 - 0.25, 2.0) / 0.05) - 1.0;
    
    float cyan_mask = smoothstep(0.0, 0.8, g1);
    float mag_mask = smoothstep(0.0, 0.8, g2);
    
    // 4. Physical Substance Normal Mapping
    float eps = 0.02;
    float h0 = s1;
    float hx = getHeight(hyperUv + vec2(eps, 0.0), t_med);
    float hy = getHeight(hyperUv + vec2(0.0, eps), t_med);
    vec3 normal = normalize(vec3(hx - h0, hy - h0, 0.05));
    
    vec3 lightDir = normalize(vec3(sin(t_slow), cos(t_slow), 0.5));
    float diffuse = max(0.0, dot(normal, lightDir));
    float specular = pow(max(0.0, dot(reflect(-lightDir, normal), vec3(0.0, 0.0, 1.0))), 16.0);
    
    // 5. Moiré Vibration (Fast Detail Shimmer)
    float g_freq1 = 150.0;
    float grid1 = sin(hyperUv.x * g_freq1 + t_fast) * cos(hyperUv.y * g_freq1 - t_fast);
    float g_freq2 = 145.0;
    vec2 rotUv = vec2(hyperUv.x * 0.8 - hyperUv.y * 0.6, hyperUv.x * 0.6 + hyperUv.y * 0.8);
    float grid2 = sin(rotUv.x * g_freq2) * cos(rotUv.y * g_freq2);
    float moire_beat = smoothstep(0.0, 0.1, grid1 * grid2);
    
    // 6. Silicon Necrosis (Math Failure Glitch)
    float necrosis = fract(1.0 / (abs(s1 - s3) + 0.001));
    necrosis = step(0.98, necrosis) * moire_beat;
    
    float grain = fract(sin(dot(vUv + t_fast, vec2(12.9898, 78.233))) * 43758.5453);
    
    // ─── OKLab Color Assembly ──────────────────────────────────────────────────
    // Neon Gamut Boundaries in OKLab
    vec3 l_cyan = vec3(0.91, -0.15, -0.04);
    vec3 l_mag  = vec3(0.60,  0.23, -0.10);
    vec3 l_yel  = vec3(0.97, -0.07,  0.20);
    
    // Base Void Black
    vec3 lab = vec3(0.05 + grain * 0.05, 0.0, 0.0);
    
    // Layer 1: Cyan Membrane
    float cyan_w = cyan_mask * (0.4 + 0.6 * diffuse);
    lab = mix(lab, l_cyan, cyan_w);
    lab.x += specular * cyan_mask * 0.4;
    
    // Layer 2: Magenta Core
    float mag_w = mag_mask * (1.0 - cyan_mask * 0.3);
    lab = mix(lab, l_mag, mag_w);
    
    // Layer 3: Yellow Moiré Parasites (Feeds on breakdown zones)
    float yel_w = moire_beat * smoothstep(0.4, 0.8, s3) * (1.0 - mag_w * 0.8);
    lab = mix(lab, l_yel, yel_w);
    
    // Layer 4: Necrosis Highlight
    lab.x += necrosis * 0.6;
    
    // Edge Vignette
    float falloff = 1.0 - dot(vUv - 0.5, vUv - 0.5) * 2.0;
    lab.x *= smoothstep(0.0, 1.0, falloff);
    
    fragColor = vec4(OKLab_to_sRGB(lab), 1.0);
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
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);