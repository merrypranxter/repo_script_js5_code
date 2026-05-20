try {
    if (!ctx) throw new Error("WebGL context not available");

    if (!canvas.__three) {
        const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        const tCanvas = document.createElement('canvas');
        tCanvas.width = 2048;
        tCanvas.height = 1024;
        const tctx = tCanvas.getContext('2d');
        
        tctx.fillStyle = '#000000';
        tctx.fillRect(0, 0, 2048, 1024);
        
        tctx.font = 'bold 280px "Arial Black", Impact, sans-serif';
        tctx.textAlign = 'center';
        tctx.textBaseline = 'middle';
        tctx.lineJoin = 'round';

        for(let i = 18; i >= 0; i--) {
            tctx.lineWidth = i * 8 + 4;
            tctx.strokeStyle = i % 2 === 0 ? '#FFFFFF' : '#000000';
            tctx.strokeText("ASTRAL", 1024, 350);
            tctx.strokeText("TRASH", 1024, 680);
        }
        
        tctx.fillStyle = '#FFFFFF';
        tctx.fillText("ASTRAL", 1024, 350);
        tctx.fillText("TRASH", 1024, 680);

        const tex = new THREE.CanvasTexture(tCanvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;

        const material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_time: { value: 0 },
                u_tex: { value: tex },
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
                in vec2 vUv;
                out vec4 fragColor;
                
                uniform float u_time;
                uniform sampler2D u_tex;
                uniform vec2 u_resolution;

                float random(in vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                }

                float noise(in vec2 st) {
                    vec2 i = floor(st);
                    vec2 f = fract(st);
                    float a = random(i);
                    float b = random(i + vec2(1.0, 0.0));
                    float c = random(i + vec2(0.0, 1.0));
                    float d = random(i + vec2(1.0, 1.0));
                    vec2 u = f * f * (3.0 - 2.0 * f);
                    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
                }

                float fbm(in vec2 st) {
                    float value = 0.0;
                    float amplitude = 0.5;
                    for (int i = 0; i < 6; i++) {
                        value += amplitude * noise(st);
                        st *= 2.0;
                        amplitude *= 0.5;
                    }
                    return value;
                }

                void main() {
                    float t_slow = u_time * 0.12;
                    float t_med  = u_time * 0.45;
                    float t_fast = u_time * 3.8;

                    vec2 uv = vUv;
                    vec2 st = uv;
                    st.x *= u_resolution.x / u_resolution.y;

                    vec2 p = st * 3.5;

                    vec2 q = vec2(fbm(p + vec2(t_slow, 0.0)), fbm(p + vec2(5.2, 1.3) - t_slow));
                    vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2) + t_med), fbm(p + 4.0 * q + vec2(8.3, 2.8) - t_med));

                    float n = fbm(p + 6.0 * r);

                    float moireX = sin((st.x + q.x) * 180.0 + t_fast);
                    float moireY = sin((st.y + q.y) * 180.0 - t_fast);
                    float shimmer = (moireX * moireY) * 0.5 + 0.5;

                    float grain = random(uv + t_fast) * 0.18;

                    vec3 voidBlk = vec3(0.03, 0.005, 0.05);
                    vec3 neonCyan = vec3(0.0, 1.0, 0.85);
                    vec3 neonMag  = vec3(1.0, 0.0, 0.9);
                    vec3 neonYel  = vec3(0.95, 1.0, 0.0);

                    vec3 mat = voidBlk;

                    mat = mix(mat, neonCyan, smoothstep(0.25, 0.75, n));

                    float magMask = smoothstep(0.3, 0.7, length(q));
                    mat = mix(mat, neonMag, magMask * n);

                    float yelMask = smoothstep(0.65, 0.95, r.y + shimmer * 0.25);
                    mat = mix(mat, neonYel, yelMask);

                    mat -= grain;

                    vec2 warp = (r - 0.5) * 0.06;
                    float tR = texture(u_tex, uv + warp * 0.7).r;
                    float tG = texture(u_tex, uv + warp * 1.0).r;
                    float tB = texture(u_tex, uv + warp * 1.3).r;

                    float textLum = (tR + tG + tB) / 3.0;

                    if (textLum > 0.02) {
                        vec3 textMat = mix(neonYel, neonCyan, shimmer);
                        textMat = mix(textMat, neonMag, fbm(p * 12.0 + t_med));

                        vec3 textEdge = tR * neonCyan + tG * neonMag + tB * neonYel;

                        mat = mix(mat, textMat, textLum * 0.85);
                        
                        float pulse = sin(u_time * 2.5) * 0.5 + 0.5;
                        mat += textEdge * (0.8 + pulse * 0.6);
                    }

                    float dist = distance(uv, vec2(0.5));
                    mat *= smoothstep(0.85, 0.25, dist);

                    fragColor = vec4(clamp(mat, 0.0, 1.0), 1.0);
                }
            `
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);
        canvas.__three = { renderer, scene, camera, material };
    }

    const { renderer, scene, camera, material } = canvas.__three;

    if (material && material.uniforms) {
        if (material.uniforms.u_time) material.uniforms.u_time.value = time;
        if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
    }

    renderer.setSize(grid.width, grid.height, false);
    renderer.render(scene, camera);

} catch (e) {
    console.error("Astral Trash rendering failed:", e);
}