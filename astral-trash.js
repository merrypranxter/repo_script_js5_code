try {
    if (!ctx) throw new Error("WebGL 2 context not available");

    if (!canvas.__three) {
        const textCanvas = document.createElement('canvas');
        textCanvas.width = 2048;
        textCanvas.height = 2048;
        const tctx = textCanvas.getContext('2d');
        
        tctx.fillStyle = '#000000';
        tctx.fillRect(0, 0, 2048, 2048);
        
        tctx.fillStyle = '#FFFFFF';
        tctx.textAlign = 'center';
        tctx.textBaseline = 'middle';
        
        tctx.font = 'bold 220px "Courier New", monospace';
        tctx.fillText('ASTRAL TRASH', 1024, 1024);
        
        tctx.font = 'bold 60px "Courier New", monospace';
        tctx.letterSpacing = '15px';
        tctx.fillText('>> STRUCTURAL_DECAY_DETECTED <<', 1024, 750);
        tctx.fillText('// ZENO.TUNNEL.BREACH //', 1024, 1300);
        
        tctx.font = '40px "Courier New", monospace';
        for(let i = 0; i < 20; i++) {
            const y = 300 + Math.random() * 1400;
            const x1 = 100 + Math.random() * 300;
            const x2 = 1600 + Math.random() * 300;
            tctx.fillText(`0x${Math.floor(Math.random()*16777215).toString(16).toUpperCase()}`, x1, y);
            tctx.fillText(`ERR_${Math.floor(Math.random()*999)}`, x2, y);
        }
        
        tctx.fillStyle = '#FFFFFF';
        for(let i = 0; i < 80; i++) {
            const w = Math.random() * 15 + 2;
            const h = 150 + Math.random() * 100;
            tctx.fillRect(400 + i * 16, 1600, w, h);
            tctx.fillRect(400 + i * 16, 250, w, h);
        }

        const textTexture = new THREE.CanvasTexture(textCanvas);
        textTexture.wrapS = THREE.RepeatWrapping;
        textTexture.wrapT = THREE.RepeatWrapping;
        textTexture.minFilter = THREE.LinearMipmapLinearFilter;
        textTexture.magFilter = THREE.LinearFilter;

        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        const vertexShader = `
            out vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            precision highp float;
            in vec2 vUv;
            out vec4 fragColor;

            uniform float u_time;
            uniform sampler2D u_text;
            uniform vec2 u_resolution;

            float hash12(vec2 p) {
                vec3 p3  = fract(vec3(p.xyx) * .1031);
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.x + p3.y) * p3.z);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                float a = hash12(i);
                float b = hash12(i + vec2(1.0, 0.0));
                float c = hash12(i + vec2(0.0, 1.0));
                float d = hash12(i + vec2(1.0, 1.0));
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }

            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                for (int i = 0; i < 4; i++) {
                    v += a * noise(p);
                    p *= 2.0;
                    a *= 0.5;
                }
                return v;
            }

            float gyroid(vec3 p) {
                return dot(sin(p), cos(p.zxy));
            }

            vec3 cmyPalette(float t) {
                float p = fract(t) * 3.0;
                vec3 C = vec3(0.0, 1.0, 1.0);
                vec3 M = vec3(1.0, 0.0, 1.0);
                vec3 Y = vec3(1.0, 1.0, 0.0);
                float w = smoothstep(0.4, 0.6, fract(p));
                if (p < 1.0) return mix(C, M, w);
                if (p < 2.0) return mix(M, Y, w);
                return mix(Y, C, w);
            }

            void main() {
                float t_slow = u_time * 0.15;
                float t_med = u_time * 0.6;
                float t_fast = u_time * 12.0;

                vec2 uv = vUv;
                vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
                
                vec3 col = vec3(0.0);
                float accum = 0.0;

                for(int i = 0; i < 16; i++) {
                    float level = float(i) - fract(t_slow);
                    float z = exp2(-level * 0.6); 
                    
                    float scale = 1.0 / z;
                    vec2 p = (uv - 0.5) * aspect;
                    
                    float twist = z * 2.0;
                    float s = sin(twist), c = cos(twist);
                    p *= mat2(c, -s, s, c);
                    
                    p = p * scale;
                    
                    vec2 warp = vec2(
                        fbm(p * 1.5 + t_med * 0.3),
                        fbm(p * 1.5 - t_med * 0.3 + 42.0)
                    );
                    
                    vec2 tUv = (p + warp * 0.15) * 0.3 + 0.5;
                    float txt = texture(u_text, tUv).r;
                    
                    float g = gyroid(vec3(p * 4.0, level * 0.3 + t_med * 0.2));
                    float shimmer = hash12(p * 50.0 + t_fast);
                    
                    float thickness = level * 0.4 + g * 0.8 + txt * 1.5;
                    vec3 cmy = cmyPalette(thickness + shimmer * 0.15);
                    
                    float density = smoothstep(0.8, 1.0, abs(g) + txt * 0.7);
                    
                    float depthFade = exp(-level * 0.25);
                    
                    col += cmy * density * depthFade * 0.12 * (txt * 2.0 + 0.5);
                    accum += density * depthFade * 0.12;
                }

                vec2 baseWarp = vec2(fbm(uv * 4.0 + t_med), fbm(uv * 4.0 - t_med)) * 0.03;
                float tr = texture(u_text, uv + baseWarp + vec2(0.008, 0.0)).r;
                float tb = texture(u_text, uv + baseWarp - vec2(0.008, 0.0)).r;
                
                col += vec3(tr, 0.0, 0.0) * vec3(1.0, 0.0, 1.0) * 0.4;
                col += vec3(0.0, 0.0, tb) * vec3(0.0, 1.0, 1.0) * 0.4;

                col = pow(col, vec3(1.3));
                col *= smoothstep(0.0, 0.2, accum + tr + tb); 

                fragColor = vec4(col, 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                u_text: { value: textTexture }
            },
            vertexShader,
            fragmentShader,
            depthWrite: false,
            depthTest: false
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);

        canvas.__three = { renderer, scene, camera, material, textTexture };
    }

    const { renderer, scene, camera, material } = canvas.__three;

    if (material && material.uniforms) {
        material.uniforms.u_time.value = time;
        material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }

    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

} catch (e) {
    console.error("WebGL Initialization Failed:", e);
}