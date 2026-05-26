if (!canvas.__three) {
    try {
        if (!ctx) throw new Error("WebGL 2 context not available");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
        renderer.autoClear = false;

        const rtOpts = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.HalfFloatType,
            depthBuffer: false
        };
        
        const rtA = new THREE.WebGLRenderTarget(grid.width, grid.height, rtOpts);
        const rtB = new THREE.WebGLRenderTarget(grid.width, grid.height, rtOpts);

        const simScene = new THREE.Scene();
        const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        const simMaterial = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_prev: { value: null },
                u_mouse: { value: new THREE.Vector2(-10, -10) },
                u_mousePrev: { value: new THREE.Vector2(-10, -10) },
                u_res: { value: new THREE.Vector2(grid.width, grid.height) },
                u_time: { value: 0 }
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

                uniform sampler2D u_prev;
                uniform vec2 u_mouse;
                uniform vec2 u_mousePrev;
                uniform float u_time;
                uniform vec2 u_res;

                vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
                float snoise(vec2 v){
                  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
                  vec2 i  = floor(v + dot(v, C.yy) );
                  vec2 x0 = v -   i + dot(i, C.xx);
                  vec2 i1;
                  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                  vec4 x12 = x0.xyxy + C.xxzz;
                  x12.xy -= i1;
                  i = mod(i, 289.0);
                  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                  + i.x + vec3(0.0, i1.x, 1.0 ));
                  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                    dot(x12.zw,x12.zw)), 0.0);
                  m = m*m ;
                  m = m*m ;
                  vec3 x = 2.0 * fract(p * C.www) - 1.0;
                  vec3 h = abs(x) - 0.5;
                  vec3 ox = floor(x + 0.5);
                  vec3 a0 = x - ox;
                  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                  vec3 g;
                  g.x  = a0.x  * x0.x  + h.x  * x0.y;
                  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                  return 130.0 * dot(m, g);
                }

                void main() {
                    vec4 prev = texture(u_prev, vUv);
                    
                    vec2 mDelta = u_mouse - u_mousePrev;
                    
                    float aspect = u_res.x / u_res.y;
                    vec2 uvAspect = vUv; uvAspect.x *= aspect;
                    vec2 mAspect = u_mouse; mAspect.x *= aspect;
                    
                    float brushDist = length(uvAspect - mAspect);
                    float brush = exp(-brushDist * brushDist * 300.0);
                    
                    vec2 currentNap = prev.xy;
                    vec2 targetNap = normalize(mDelta + 0.0001) * min(length(mDelta) * 100.0, 1.0);
                    
                    float driftX = snoise(vUv * 5.0 + u_time * 0.1);
                    float driftY = snoise(vUv * 5.0 - u_time * 0.1 + 10.0);
                    vec2 drift = vec2(driftX, driftY) * 0.01;
                    
                    vec2 newNap = mix(currentNap, targetNap, brush);
                    newNap += drift;
                    newNap *= 0.97; // Settling nap
                    
                    float exc = prev.z;
                    exc = max(exc, brush * min(length(mDelta) * 200.0, 1.0));
                    exc *= 0.94; // Fading biological flash
                    
                    fragColor = vec4(newNap, exc, 1.0);
                }
            `
        });
        
        simScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial));

        const mainScene = new THREE.Scene();
        const mainCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        const mainMaterial = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_sim: { value: null },
                u_time: { value: 0 },
                u_res: { value: new THREE.Vector2(grid.width, grid.height) }
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

                uniform sampler2D u_sim;
                uniform float u_time;
                uniform vec2 u_res;

                vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
                vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
                float snoise(vec3 v){ 
                  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
                  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
                  vec3 i  = floor(v + dot(v, C.yyy) );
                  vec3 x0 = v - i + dot(i, C.xxx) ;
                  vec3 g = step(x0.yzx, x0.xyz);
                  vec3 l = 1.0 - g;
                  vec3 i1 = min( g.xyz, l.zxy );
                  vec3 i2 = max( g.xyz, l.zxy );
                  vec3 x1 = x0 - i1 + C.xxx;
                  vec3 x2 = x0 - i2 + C.yyy;
                  vec3 x3 = x0 - D.yyy;
                  i = mod(i, 289.0 ); 
                  vec4 p = permute( permute( permute( 
                             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
                  float n_ = 0.142857142857;
                  vec3  ns = n_ * D.wyz - D.xzx;
                  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                  vec4 x_ = floor(j * ns.z);
                  vec4 y_ = floor(j - 7.0 * x_ );
                  vec4 x = x_ *ns.x + ns.yyyy;
                  vec4 y = y_ *ns.x + ns.yyyy;
                  vec4 h = 1.0 - abs(x) - abs(y);
                  vec4 b0 = vec4( x.xy, y.xy );
                  vec4 b1 = vec4( x.zw, y.zw );
                  vec4 s0 = floor(b0)*2.0 + 1.0;
                  vec4 s1 = floor(b1)*2.0 + 1.0;
                  vec4 sh = -step(h, vec4(0.0));
                  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
                  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
                  vec3 p0 = vec3(a0.xy,h.x);
                  vec3 p1 = vec3(a0.zw,h.y);
                  vec3 p2 = vec3(a1.xy,h.z);
                  vec3 p3 = vec3(a1.zw,h.w);
                  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
                  p0 *= norm.x;
                  p1 *= norm.y;
                  p2 *= norm.z;
                  p3 *= norm.w;
                  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                  m = m * m;
                  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
                }

                float leniaRing(float rn, float mu, float sig) {
                    float d = rn - mu;
                    return exp(-(d * d) / (2.0 * sig * sig));
                }

                float organismDensity(vec2 p, vec2 c, float time, float scale) {
                    vec2 d = p - c;
                    float r = length(d) / scale;
                    
                    float noiseVal = snoise(vec3(p * 4.0, time * 0.3));
                    float reff = r * (1.0 + 0.35 * noiseVal);

                    float core  = leniaRing(reff, 0.05, 0.025);
                    float shell = leniaRing(reff, 0.35, 0.07) * 0.8;
                    float halo  = leniaRing(reff, 0.65, 0.12) * 0.4;

                    return clamp(core + shell + halo, 0.0, 1.2);
                }

                float damaskPattern(vec2 uv, float time) {
                    vec2 scaledUv = uv * 2.5; 
                    vec2 f = fract(scaledUv);
                    vec2 p = abs(f * 2.0 - 1.0);
                    
                    if (p.x < p.y) p = p.yx; // Damask diagonal symmetry
                    
                    float d = 0.0;
                    d += organismDensity(p, vec2(0.0, 0.0), time * 0.4, 0.6);
                    d += organismDensity(p, vec2(1.0, 1.0), time * 0.5 + 10.0, 0.5);
                    d += organismDensity(p, vec2(1.0, 0.0), -time * 0.6 + 5.0, 0.4);
                    d += organismDensity(p, vec2(0.5, 0.5), time * 0.7 + 2.0, 0.3);
                    
                    return d;
                }

                vec3 getDamaskColor(float h) {
                    vec3 base = vec3(0.08, 0.0, 0.22); // Deep UV velvet
                    vec3 halo = vec3(0.0, 0.7, 0.8);   // Cyan halos
                    vec3 shell = vec3(0.9, 0.05, 0.4); // Hot magenta motifs
                    vec3 core = vec3(0.6, 1.0, 0.0);   // Acid green accents
                    
                    vec3 col = base;
                    col = mix(col, halo, smoothstep(0.05, 0.3, h));
                    col = mix(col, shell, smoothstep(0.3, 0.65, h));
                    col = mix(col, core, smoothstep(0.65, 1.0, h));
                    
                    return col;
                }

                float velvetFactor(vec3 N, vec3 V, vec3 L, vec2 napDir) {
                    vec3 napN = normalize(N + vec3(napDir * 1.5, 0.0));
                    float NdotV = max(dot(napN, V), 0.0);
                    float NdotL = max(dot(napN, L), 0.0);
                    
                    // Asperity scattering (high grazing reflectance)
                    float rim = pow(1.0 - NdotV, 2.5) * smoothstep(-0.2, 0.5, NdotL);
                    vec3 H = normalize(V + L);
                    float NdotH = max(dot(napN, H), 0.0);
                    float sheen = exp(-(1.0 - NdotH) * 6.0);
                    float diffuse = NdotL * 0.4;
                    
                    return (rim * 1.5 + sheen * 0.8 + diffuse);
                }

                void main() {
                    vec2 aspect = vec2(u_res.x / u_res.y, 1.0);
                    vec2 uv = vUv * aspect;
                    
                    vec4 simData = texture(u_sim, vUv);
                    vec2 napDir = simData.xy;
                    float excitation = simData.z;
                    
                    float h = damaskPattern(uv, u_time);
                    
                    vec2 e = vec2(0.005, 0.0);
                    float hx = damaskPattern(uv + e.xy, u_time);
                    float hy = damaskPattern(uv + e.yx, u_time);
                    
                    float pile = snoise(vec3(uv * 200.0, 0.0)) * 0.02;
                    float pileX = snoise(vec3((uv + e.xy) * 200.0, 0.0)) * 0.02;
                    float pileY = snoise(vec3((uv + e.yx) * 200.0, 0.0)) * 0.02;
                    
                    vec3 N = normalize(vec3(
                        (hx + pileX) - (h + pile),
                        (hy + pileY) - (h + pile),
                        0.02 // Depth scale
                    ));
                    
                    vec3 color = getDamaskColor(h);
                    color += vec3(1.0, 0.5, 0.0) * excitation * smoothstep(0.1, 0.9, h) * 1.5;
                    
                    vec3 L = normalize(vec3(sin(u_time * 0.3) * 0.6, cos(u_time * 0.2) * 0.6, 1.0));
                    vec3 V = normalize(vec3(0.0, 0.0, 1.0));
                    
                    float vLight = velvetFactor(N, V, L, napDir);
                    color *= (0.15 + vLight);
                    
                    // Sparkle Dust
                    float glitterHash = fract(sin(dot(floor(uv * 800.0), vec2(12.9898, 78.233))) * 43758.5453);
                    float NdotV = max(dot(N, V), 0.0);
                    float temporal = fract(u_time * 0.5 + glitterHash);
                    float shimmer = smoothstep(0.96 - excitation * 0.1, 1.0, glitterHash * NdotV * (0.5 + 0.5 * sin(temporal * 6.283)));
                    
                    float sparkleMask = smoothstep(0.4, 1.0, vLight) * smoothstep(0.2, 1.0, h);
                    color += vec3(1.0, 0.9, 0.95) * shimmer * sparkleMask * 3.0;
                    
                    // Vignette
                    float dist = length(vUv - 0.5);
                    color *= smoothstep(0.8, 0.2, dist);
                    
                    // Tone map
                    color = color / (color + vec3(1.0));
                    color = pow(color, vec3(1.0/2.2));
                    
                    fragColor = vec4(color, 1.0);
                }
            `
        });
        
        mainScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mainMaterial));

        canvas.__three = { 
            renderer, 
            simScene, simCamera, simMaterial, 
            mainScene, mainCamera, mainMaterial, 
            rtA, rtB, 
            lastMouse: new THREE.Vector2(-10, -10)
        };
    } catch (e) {
        console.error("WebGL Init Failed:", e);
        return;
    }
}

const state = canvas.__three;
if (!state) return;

if (state.rtA.width !== grid.width || state.rtA.height !== grid.height) {
    state.rtA.setSize(grid.width, grid.height);
    state.rtB.setSize(grid.width, grid.height);
    state.simMaterial.uniforms.u_res.value.set(grid.width, grid.height);
    state.mainMaterial.uniforms.u_res.value.set(grid.width, grid.height);
}
state.renderer.setSize(grid.width, grid.height, false);

let mX = -10, mY = -10;
if (mouse.x >= 0 && mouse.x <= grid.width && mouse.y >= 0 && mouse.y <= grid.height) {
    mX = mouse.x / grid.width;
    mY = 1.0 - (mouse.y / grid.height);
}

const temp = state.rtA;
state.rtA = state.rtB;
state.rtB = temp;

state.simMaterial.uniforms.u_prev.value = state.rtB.texture;
state.simMaterial.uniforms.u_mouse.value.set(mX, mY);
state.simMaterial.uniforms.u_mousePrev.value.copy(state.lastMouse);
state.simMaterial.uniforms.u_time.value = time;

state.lastMouse.set(mX, mY);

state.renderer.setRenderTarget(state.rtA);
state.renderer.render(state.simScene, state.simCamera);

state.renderer.setRenderTarget(null);
state.mainMaterial.uniforms.u_sim.value = state.rtA.texture;
state.mainMaterial.uniforms.u_time.value = time;
state.renderer.render(state.mainScene, state.mainCamera);