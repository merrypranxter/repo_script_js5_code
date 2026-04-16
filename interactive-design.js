if (!canvas.__three) {
    try {
        const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
        if (!gl) throw new Error("WebGL 2 not supported or context occupied");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;
        
        const vertexShader = `
            out vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position.xy, 0.0, 1.0);
            }
        `;

        const fragmentShader = `
            in vec2 vUv;
            out vec4 fragColor;
            
            uniform float u_time;
            uniform vec2 u_resolution;
            
            #define PI 3.14159265359
            #define TWO_PI 6.28318530718
            
            // --- Noise & Math ---
            float hash12(vec2 p) {
                vec3 p3  = fract(vec3(p.xyx) * 0.1031);
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.x + p3.y) * p3.z);
            }
            
            vec2 hash22(vec2 p) {
                vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.xx + p3.yz) * p3.zy);
            }
            
            vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
            
            float snoise(vec2 v){
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy) );
                vec2 x0 = v -   i + dot(i, C.xx);
                vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod(i, 289.0);
                vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m * m ;
                m = m * m ;
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
            
            float fbm(vec2 p) {
                float f = 0.0;
                float amp = 0.5;
                for(int i=0; i<5; i++) {
                    f += amp * snoise(p);
                    p *= 2.0;
                    amp *= 0.5;
                }
                return f;
            }
            
            vec2 warp(vec2 p, float t) {
                vec2 q = vec2(fbm(p + t * 0.1), fbm(p + vec2(5.2, 1.3) - t * 0.15));
                vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2)), fbm(p + 4.0 * q + vec2(8.3, 2.8)));
                return p + 2.0 * r;
            }
            
            float worley(vec2 p) {
                vec2 n = floor(p);
                vec2 f = fract(p);
                float dist = 1.0;
                for(int y = -1; y <= 1; y++) {
                    for(int x = -1; x <= 1; x++) {
                        vec2 g = vec2(float(x), float(y));
                        vec2 o = hash22(n + g);
                        o = 0.5 + 0.5 * sin(u_time + TWO_PI * o);
                        vec2 r = g + o - f;
                        dist = min(dist, dot(r, r));
                    }
                }
                return sqrt(dist);
            }
            
            mat2 rot(float a) {
                float s = sin(a), c = cos(a);
                return mat2(c, -s, s, c);
            }
            
            // --- Optics & Structural Color ---
            vec3 wavelengthToRGB(float W) {
                vec3 c = vec3(0.0);
                if (W >= 380.0 && W < 440.0) c = vec3(-(W-440.0)/(440.0-380.0), 0.0, 1.0);
                else if (W >= 440.0 && W < 490.0) c = vec3(0.0, (W-440.0)/(490.0-440.0), 1.0);
                else if (W >= 490.0 && W < 510.0) c = vec3(0.0, 1.0, -(W-510.0)/(510.0-490.0));
                else if (W >= 510.0 && W < 580.0) c = vec3((W-510.0)/(580.0-510.0), 1.0, 0.0);
                else if (W >= 580.0 && W < 645.0) c = vec3(1.0, -(W-645.0)/(645.0-580.0), 0.0);
                else if (W >= 645.0 && W <= 780.0) c = vec3(1.0, 0.0, 0.0);
                return max(c, 0.0);
            }
            
            vec3 thinFilm(float cosTheta, float thickness, float n) {
                float pathDiff = 2.0 * n * thickness * sqrt(max(0.0, 1.0 - pow(sin(acos(cosTheta))/n, 2.0)));
                vec3 color = vec3(0.0);
                for(int i = 0; i < 7; i++) {
                    float wl = mix(400.0, 700.0, float(i)/6.0);
                    float phase = (pathDiff / wl) * TWO_PI;
                    float intensity = 0.5 + 0.5 * cos(phase);
                    color += wavelengthToRGB(wl) * intensity;
                }
                return color / 4.0;
            }
            
            float stochastic_sparkle(vec2 uv, float density, float time, vec2 cell) {
                float h = hash12(uv * 100.0 + cell);
                float flicker = sin(time * 10.0 + h * TWO_PI) * 0.5 + 0.5;
                return smoothstep(1.0 - density, 1.0, h) * flicker;
            }
            
            // --- Diatom SDFs & Patterns ---
            float boatShape(vec2 p, float halfLength, float maxHalfWidth) {
                float xn = p.x / halfLength;
                float hw = maxHalfWidth * cos(clamp(xn, -1.0, 1.0) * 1.5707963);
                float mask = smoothstep(hw, hw - 0.015, abs(p.y));
                mask *= step(abs(xn), 1.0);
                return mask;
            }
            
            float hexPoreField(vec2 p, float scale, float size) {
                vec2 s = vec2(1.0, 1.7320508);
                vec2 gp = p * scale;
                vec2 p1 = mod(gp, s) - s * 0.5;
                vec2 p2 = mod(gp - s * 0.5, s) - s * 0.5;
                vec2 pq = dot(p1,p1) < dot(p2,p2) ? p1 : p2;
                return 1.0 - smoothstep(size, size + 0.05, length(pq));
            }
            
            float centralRosette(vec2 p, float petals, float sharpness, float radius) {
                float r = length(p);
                if (r > radius) return 0.0;
                float a = atan(p.y, p.x);
                float petal = pow(abs(sin(a * petals * 0.5)), sharpness);
                return petal * smoothstep(radius, radius * 0.8, r);
            }
            
            // --- Collage Artifacts ---
            vec2 kaleidoscope(vec2 uv, float folds) {
                float angle = atan(uv.y, uv.x);
                float radius = length(uv);
                float sector = TWO_PI / folds;
                angle = mod(angle, sector);
                if (angle > sector * 0.5) angle = sector - angle;
                angle += u_time * 0.05;
                return vec2(cos(angle), sin(angle)) * radius;
            }
            
            float sacredGeometry(vec2 uv) {
                float d = 1.0;
                for(int i=0; i<6; i++) {
                    float a = float(i) * 1.0471975; 
                    vec2 center = vec2(cos(a), sin(a)) * 0.5;
                    float circle = abs(length(uv - center) - 0.5);
                    d = min(d, circle);
                }
                d = min(d, abs(length(uv) - 0.5));
                return smoothstep(0.015, 0.005, d);
            }
            
            float halftone(vec2 fragCoord, float freq, float angle, float luma) {
                float rad = radians(angle);
                mat2 rotM = mat2(cos(rad), -sin(rad), sin(rad), cos(rad));
                vec2 uv = rotM * fragCoord * freq / 1000.0;
                vec2 cell = fract(uv) - 0.5;
                float dist = length(cell);
                float dotRadius = sqrt(1.0 - luma) * 0.5;
                return smoothstep(dotRadius + 0.05, dotRadius - 0.05, dist);
            }
            
            // --- Scene Rendering ---
            vec3 renderScene(vec2 uv) {
                vec2 bgUV = kaleidoscope(uv, 12.0);
                vec2 warpedUV = warp(bgUV * 2.0, u_time);
                float noiseVal = fbm(warpedUV * 2.5 - u_time * 0.1);
                
                vec3 bgAcid1 = vec3(0.02, 0.03, 0.04); 
                vec3 bgAcid2 = vec3(0.0, 1.0, 0.94); 
                vec3 bgAcid3 = vec3(1.0, 0.0, 0.8); 
                
                float mixVal = smoothstep(0.3, 0.7, noiseVal + snoise(uv * 5.0) * 0.2);
                vec3 bgCol = mix(bgAcid1, mix(bgAcid2, bgAcid3, fbm(uv * 4.0 + u_time)), mixVal);
                
                float sg = sacredGeometry(uv * 1.5 * rot(u_time * 0.05));
                bgCol = mix(bgCol, vec3(0.8, 0.6, 0.2), sg * 0.4); 
                
                vec3 col = bgCol;
                
                // Diatom 1: Centric
                vec2 p1 = uv - vec2(0.3 * sin(u_time * 0.5), 0.2 * cos(u_time * 0.4));
                float r1 = length(p1);
                float a1 = atan(p1.y, p1.x);
                float mask1 = smoothstep(0.45, 0.44, r1);
                
                float shadow1 = smoothstep(0.48, 0.44, length(p1 - vec2(0.04, -0.04)));
                col = mix(col, bgAcid1, shadow1 * 0.7 * (1.0 - mask1));
            
                if(mask1 > 0.0) {
                    float thickness = 300.0 + 200.0 * sin(r1 * 40.0) + 150.0 * fbm(p1 * 8.0);
                    vec3 irid = thinFilm(0.9 - r1 * 1.5, thickness, 1.5);
                    float striae = pow(abs(sin(a1 * 60.0)), 2.0) * smoothstep(0.05, 0.4, r1);
                    float pores = hexPoreField(p1, 60.0, 0.15); 
                    float rosette = centralRosette(p1, 12.0, 3.0, 0.15); 
                    
                    vec3 diatom = irid * (0.5 + 0.5 * striae) * (1.0 - 0.5 * pores) + rosette * vec3(1.0, 0.9, 0.4);
                    diatom += stochastic_sparkle(p1, 0.02, u_time, vec2(1.0)) * 1.5;
                    
                    col = mix(col, diatom, mask1);
                }
                
                // Diatom 2: Pennate Boat
                vec2 p2 = uv - vec2(-0.4 * cos(u_time * 0.3), -0.2 * sin(u_time * 0.5));
                p2 *= rot(u_time * 0.2 + 1.0);
                float boatM = boatShape(p2, 0.6, 0.18);
                
                float shadow2 = boatShape(p2 - vec2(0.04, -0.04), 0.6, 0.18);
                col = mix(col, bgAcid1, shadow2 * 0.7 * (1.0 - boatM));
            
                if(boatM > 0.0) {
                    float thickness = 400.0 + 250.0 * fbm(p2 * 10.0);
                    vec3 irid = thinFilm(0.8 - abs(p2.y) * 3.0, thickness, 1.4);
                    float striae = pow(abs(sin(p2.x * 150.0)), 1.5) * smoothstep(0.01, 0.15, abs(p2.y));
                    float raphe = 1.0 - smoothstep(0.0, 0.015, abs(p2.y));
                    
                    vec3 diatom = irid * (0.6 + 0.4 * striae) + raphe * vec3(0.0, 1.0, 0.8);
                    diatom += stochastic_sparkle(p2, 0.03, u_time, vec2(2.0)) * 1.5;
                    
                    col = mix(col, diatom, boatM);
                }
            
                // Diatom 3: Cymbelloid
                vec2 p3 = uv - vec2(0.4 * sin(u_time * 0.7), -0.4 * cos(u_time * 0.6));
                p3 *= rot(-u_time * 0.4);
                float d3_1 = length(p3 - vec2(0.0, 0.8)) - 0.9;
                float d3_2 = length(p3 - vec2(0.0, 0.5)) - 0.7;
                float bananaM = smoothstep(0.01, 0.0, d3_1) * smoothstep(0.0, 0.01, d3_2);
                bananaM *= smoothstep(0.5, 0.48, abs(p3.x));
                
                float shadow3_1 = length(p3 - vec2(0.04, 0.76)) - 0.9;
                float shadow3_2 = length(p3 - vec2(0.04, 0.46)) - 0.7;
                float shadow3M = smoothstep(0.02, 0.0, shadow3_1) * smoothstep(0.0, 0.02, shadow3_2);
                shadow3M *= smoothstep(0.5, 0.48, abs(p3.x - 0.04));
                col = mix(col, bgAcid1, shadow3M * 0.7 * (1.0 - bananaM));
            
                if(bananaM > 0.0) {
                    float thickness = 250.0 + 300.0 * fbm(p3 * 15.0);
                    vec3 irid = thinFilm(0.7, thickness, 1.6);
                    float striae = pow(abs(sin(p3.x * 100.0)), 2.0);
                    vec3 diatom = irid * (0.6 + 0.4 * striae);
                    diatom += stochastic_sparkle(p3, 0.02, u_time, vec2(3.0));
                    col = mix(col, diatom, bananaM);
                }
                
                // Spores
                float spores = worley(uv * 8.0 + u_time * 0.15);
                float sporeMask = smoothstep(0.12, 0.08, spores);
                vec3 sporeIrid = thinFilm(0.5, 500.0 + 200.0 * sin(u_time), 1.33);
                col = mix(col, sporeIrid * 1.5, sporeMask * 0.6);
            
                return col;
            }
            
            void main() {
                vec2 uv = vUv * 2.0 - 1.0;
                uv.x *= u_resolution.x / u_resolution.y;
                
                // Chromatic Aberration (Radial)
                float caOffset = 0.012;
                vec2 dir = normalize(uv);
                
                float r = renderScene(uv + dir * caOffset).r;
                float g = renderScene(uv).g;
                float b = renderScene(uv - dir * caOffset).b;
                
                vec3 col = vec3(r, g, b);
                
                // Halftone Artifact
                float luma = dot(col, vec3(0.299, 0.587, 0.114));
                float ht = halftone(gl_FragCoord.xy, 100.0, 45.0, luma);
                
                vec3 htColor = col * ht;
                col = mix(col, htColor, 0.35); 
                
                // Xerox noise / Paper grain
                float grain = hash12(uv * 1000.0 + fract(u_time));
                vec3 grainCol = vec3(grain * 0.15);
                col = 1.0 - (1.0 - col) * (1.0 - grainCol);
                
                // Vignette
                float vignette = smoothstep(1.5, 0.4, length(uv));
                col *= vignette;
                
                fragColor = vec4(col, 1.0);
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
            transparent: true
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