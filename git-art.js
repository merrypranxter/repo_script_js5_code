if (!canvas.__three) {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `;
    
    const fragmentShader = `
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        
        #define MAX_STEPS 100
        #define MAX_DIST 25.0
        #define SURF_DIST 0.002
        #define PI 3.14159265359
        
        varying vec2 vUv;
        
        // Hash & Noise from raymarching/structural_color repos
        float hash(vec3 p) {
            p = fract(p * 0.3183099 + 0.1);
            p *= 17.0;
            return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        
        float noise(vec3 p) {
            vec3 i = floor(p);
            vec3 f = fract(p);
            vec3 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(mix(hash(i + vec3(0.0,0.0,0.0)), hash(i + vec3(1.0,0.0,0.0)), u.x),
                           mix(hash(i + vec3(0.0,1.0,0.0)), hash(i + vec3(1.0,1.0,0.0)), u.x), u.y),
                       mix(mix(hash(i + vec3(0.0,0.0,1.0)), hash(i + vec3(1.0,0.0,1.0)), u.x),
                           mix(hash(i + vec3(0.0,1.0,1.0)), hash(i + vec3(1.0,1.0,1.0)), u.x), u.y), u.z);
        }
        
        // Chladni pattern from vibration repo
        float chladni(vec2 p, float m, float n) {
            return sin(m * PI * p.x) * sin(n * PI * p.y) + sin(n * PI * p.x) * sin(m * PI * p.y);
        }
        
        // Gyroid from structural_color repo
        float sdGyroid(vec3 p, float scale) {
            p *= scale;
            return (sin(p.x)*cos(p.y) + sin(p.y)*cos(p.z) + sin(p.z)*cos(p.x)) / scale;
        }
        
        // Manifolds from raymarching repo
        vec3 twistY(vec3 p, float k) {
            float s = sin(k * p.y);
            float c = cos(k * p.y);
            mat2 m = mat2(c, -s, s, c);
            return vec3(m * p.xz, p.y).xzy;
        }
        
        mat2 rot(float a) {
            float s = sin(a), c = cos(a);
            return mat2(c, -s, s, c);
        }
        
        // Scene Map: Hyperbolic Cymatic Gyroid
        vec2 sceneMap(vec3 p) {
            vec3 q = p;
            
            // Hyperbolic/Mobius twist
            q.xy *= rot(u_time * 0.05);
            q = twistY(q, sin(u_time * 0.1) * 0.5 + u_mouse.x * 0.5);
            
            // Cymatic vibration based on mouse and time (Gamma frequency simulation 40Hz -> scaled to 20.0 for visual)
            float m = 1.0 + floor(u_mouse.x * 5.0);
            float n = 2.0 + floor(u_mouse.y * 5.0);
            float vib = chladni(q.xz * 1.2, m, n) * 0.15 * sin(u_time * 20.0);
            
            // Structural color geometry: Gyroid sponge
            float box = length(q) - 2.2; // Sphere bound
            float gyroid = sdGyroid(q, 3.5 + sin(u_time * 0.2)) * 0.5;
            
            float d = max(box, abs(gyroid) - 0.08) + vib;
            
            // Biological noise displacement
            d += noise(q * 6.0 + u_time) * 0.04;
            
            return vec2(d, 1.0);
        }
        
        // Normal calculation
        vec3 calcNormal(vec3 p) {
            vec2 e = vec2(0.002, 0.0);
            return normalize(vec3(
                sceneMap(p + e.xyy).x - sceneMap(p - e.xyy).x,
                sceneMap(p + e.yxy).x - sceneMap(p - e.yxy).x,
                sceneMap(p + e.yyx).x - sceneMap(p - e.yyx).x
            ));
        }
        
        // Thin-film interference color from structural_color repo
        vec3 thinFilm(float cosTheta, float thickness, float n_ior) {
            float pathDiff = 2.0 * n_ior * thickness * cosTheta;
            vec3 phase = vec3(0.0, 0.33, 0.67);
            return 0.5 + 0.5 * cos(6.28318 * (pathDiff * 3.0 + phase));
        }
        
        // Rayleigh scattering / Fog from raymarching repo
        vec3 applyFog(vec3 color, float dist) {
            float fogAmount = 1.0 - exp(-dist * 0.12);
            vec3 fogColor = vec3(0.02, 0.01, 0.05); // Deep space / biolume
            // Add cymatic energy to the fog itself
            fogColor += vec3(0.1, 0.0, 0.2) * max(0.0, sin(u_time * 40.0)) * u_mouse.y; 
            return mix(color, fogColor, fogAmount);
        }
        
        // ACES Tone Mapping
        vec3 toneMapACES(vec3 x) {
            float a = 2.51;
            float b = 0.03;
            float c = 2.43;
            float d = 0.59;
            float e = 0.14;
            return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
        }
        
        void main() {
            vec2 uv = vUv * 2.0 - 1.0;
            uv.x *= u_resolution.x / u_resolution.y;
            
            // Poincare disk domain warp from noneuclidean repo
            vec2 warpedUv = uv;
            float n_warp = noise(vec3(uv * 2.0, u_time * 0.2)) * 0.2;
            warpedUv += n_warp * u_mouse.x;
            
            // Camera setup
            vec3 ro = vec3(0.0, 0.0, 4.5);
            vec3 rd = normalize(vec3(warpedUv, -1.0));
            
            // Camera orbit
            float camAngle = u_time * 0.1 + u_mouse.x * 1.5;
            ro.xz *= rot(camAngle);
            rd.xz *= rot(camAngle);
            ro.yz *= rot(u_mouse.y - 0.5);
            rd.yz *= rot(u_mouse.y - 0.5);
            
            // Raymarching
            float dO = 0.0;
            vec2 res = vec2(0.0);
            for(int i = 0; i < MAX_STEPS; i++) {
                vec3 p = ro + rd * dO;
                res = sceneMap(p);
                if(res.x < SURF_DIST || dO > MAX_DIST) break;
                dO += res.x * 0.65; // Step size reduction for safety with heavy distortion
            }
            
            vec3 col = vec3(0.0);
            
            if(dO < MAX_DIST) {
                vec3 p = ro + rd * dO;
                vec3 n = calcNormal(p);
                vec3 v = -rd;
                
                float cosTheta = max(0.0, dot(n, v));
                
                // Structural color thickness varies with position and cymatic noise
                float thickness = 0.4 + 0.6 * noise(p * 3.0 - u_time);
                float ior = 1.56; // Chitin/Beetle shell
                
                vec3 iridescent = thinFilm(cosTheta, thickness, ior);
                
                // Lighting
                vec3 lightPos = vec3(3.0 * sin(u_time), 4.0, 3.0 * cos(u_time));
                vec3 l = normalize(lightPos - p);
                float diff = max(0.0, dot(n, l));
                float spec = pow(max(0.0, dot(normalize(l + v), n)), 32.0);
                
                // Subsurface scatter approx
                float sss = pow(clamp(1.0 - dot(n, v), 0.0, 1.0), 3.0) * 0.4;
                
                col = iridescent * (diff + sss) + spec * vec3(0.8, 0.9, 1.0);
                
                // Ambient occlusion approximation
                float ao = clamp(sceneMap(p + n * 0.15).x / 0.15, 0.0, 1.0);
                col *= ao * 0.8 + 0.2;
                
                // Emission from vibration (cymatic energy)
                float m_chladni = 1.0 + floor(u_mouse.x * 5.0);
                float n_chladni = 2.0 + floor(u_mouse.y * 5.0);
                float vib_energy = abs(chladni(p.xz * 1.2, m_chladni, n_chladni));
                vec3 emission = vec3(0.9, 0.3, 0.1) * vib_energy * smoothstep(0.7, 1.0, sin(u_time * 20.0));
                col += emission * 0.6;
            }
            
            // Fog
            col = applyFog(col, dO);
            
            // Dithering
            float dither = fract(sin(dot(gl_FragCoord.xy * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
            col += (dither - 0.5) * (1.0 / 255.0);
            
            // ACES Tone Mapping
            col = toneMapACES(col);
            
            // Gamma correction
            col = pow(col, vec3(1.0 / 2.2));
            
            // Chromatic aberration at edges
            float distToCenter = length(vUv * 2.0 - 1.0);
            col.r += distToCenter * 0.03 * sin(u_time * 5.0);
            col.b -= distToCenter * 0.03 * cos(u_time * 5.0);
            
            gl_FragColor = vec4(col, 1.0);
        }
    `;

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            u_time: { value: 0 },
            u_resolution: { value: new THREE.Vector2() },
            u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
        }
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(plane);

    canvas.__three = { renderer, scene, camera, material };
}

const { renderer, scene, camera, material } = canvas.__three;

if (material?.uniforms) {
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
    
    // Smooth mouse coordinates for organic interaction
    const targetX = mouse.x / grid.width;
    const targetY = 1.0 - (mouse.y / grid.height);
    
    material.uniforms.u_mouse.value.x += (targetX - material.uniforms.u_mouse.value.x) * 0.1;
    material.uniforms.u_mouse.value.y += (targetY - material.uniforms.u_mouse.value.y) * 0.1;
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);