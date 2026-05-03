try {
    let useWebGL = false;
    if (typeof THREE !== 'undefined') {
        try {
            if (ctx && (ctx instanceof WebGLRenderingContext || ctx instanceof WebGL2RenderingContext || typeof ctx.getParameter === 'function')) {
                useWebGL = true;
            }
        } catch(e){}
    }

    if (useWebGL) {
        if (!canvas.__three) {
            const renderer = new THREE.WebGLRenderer({ canvas: canvas, context: ctx, alpha: true, antialias: true });
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, grid.width/grid.height, 0.1, 1000);
            camera.position.z = 1;

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
                uniform vec2 u_resolution;
                uniform vec2 u_mouse;
                uniform float u_pressed;
                
                vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec3 permute(vec3 x) { return mod289(((x*34.0)+10.0)*x); }
                float snoise(vec2 v) {
                    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                    vec2 i  = floor(v + dot(v, C.yy) );
                    vec2 x0 = v -   i + dot(i, C.xx);
                    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                    vec4 x12 = x0.xyxy + C.xxzz;
                    x12.xy -= i1;
                    i = mod289(i);
                    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ) );
                    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                    m = m*m; m = m*m;
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
                    for(int i = 0; i < 4; i++) {
                        f += amp * snoise(p);
                        p *= 2.0;
                        p += vec2(1.23, 4.56);
                        amp *= 0.5;
                    }
                    return f;
                }
                
                vec2 kaleidoscope(vec2 uv, float folds, float t) {
                    vec2 centered = uv - 0.5;
                    float angle = atan(centered.y, centered.x);
                    float radius = length(centered);
                    angle += radius * 1.5 * sin(t * 0.3);
                    float sector = 6.2831853 / folds;
                    angle = mod(angle, sector);
                    if (angle > sector / 2.0) angle = sector - angle;
                    angle -= t * 0.15;
                    return vec2(cos(angle), sin(angle)) * radius + 0.5;
                }
                
                vec3 palette(float t) {
                    vec3 a = vec3(0.5, 0.5, 0.5);
                    vec3 b = vec3(0.5, 0.5, 0.33);
                    vec3 c = vec3(2.0, 1.0, 1.0);
                    vec3 d = vec3(0.5, 0.2, 0.25);
                    return a + b * cos(6.2831853 * (c * t + d));
                }
                
                float warp(vec2 p, float t) {
                    vec2 q = vec2(fbm(p + t * 0.2), fbm(p + vec2(5.2, 1.3) - t * 0.15));
                    vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2)), fbm(p + 4.0 * q + vec2(8.3, 2.8)));
                    return fbm(p + 4.0 * r + t * 0.3);
                }
                
                float grain(vec2 uv, float t) {
                    return fract(sin(dot(uv * t, vec2(127.1, 311.7))) * 43758.5453);
                }
                
                void main() {
                    vec2 uv = vUv;
                    float glitch = u_pressed * 0.05 + 0.01;
                    float folds = 6.0 + 4.0 * sin(u_time * 0.1);
                    
                    vec2 k_uv = kaleidoscope(uv, folds, u_time);
                    
                    vec2 offsetR = vec2(0.01, 0.0) * sin(u_time) * glitch;
                    vec2 offsetG = vec2(-0.005, 0.008) * cos(u_time * 1.2) * glitch;
                    vec2 offsetB = vec2(0.008, -0.01) * sin(u_time * 0.8) * glitch;
                    
                    vec2 baseUv = k_uv * 2.5;
                    
                    float wR = warp(baseUv + offsetR * 30.0, u_time);
                    float wG = warp(baseUv + offsetG * 30.0, u_time);
                    float wB = warp(baseUv + offsetB * 30.0, u_time);
                    
                    vec3 colR = palette(wR);
                    vec3 colG = palette(wG + 0.1);
                    vec3 colB = palette(wB + 0.2);
                    
                    vec3 finalCol = vec3(colR.r, colG.g, colB.b);
                    
                    float iridescence = 0.5 + 0.5 * cos(wR * 25.0 - u_time * 8.0);
                    finalCol += vec3(0.2, 0.4, 0.6) * iridescence * 0.5;
                    
                    vec2 screenGrid = fract(vUv * u_resolution * 0.3) - 0.5;
                    float dotDist = length(screenGrid);
                    float luma = dot(finalCol, vec3(0.299, 0.587, 0.114));
                    float radius = sqrt(1.0 - luma) * 0.65;
                    float halftone = smoothstep(radius + 0.1, radius - 0.1, dotDist);
                    
                    finalCol = mix(finalCol, finalCol * halftone * 2.0, 0.4);
                    
                    float g = grain(vUv, u_time + 1.0);
                    if (g > 0.96) {
                        finalCol = mix(finalCol, vec3(1.0, 0.0, 1.0), (g - 0.96) * 25.0);
                    }
                    
                    float vig = length(uv - 0.5) * 2.0;
                    finalCol *= 1.0 - smoothstep(0.5, 1.5, vig);
                    
                    finalCol = smoothstep(0.0, 1.0, finalCol);
                    
                    fragColor = vec4(finalCol, 1.0);
                }
            `;

            const material = new THREE.ShaderMaterial({
                glslVersion: THREE.GLSL3,
                vertexShader,
                fragmentShader,
                uniforms: {
                    u_time: { value: 0 },
                    u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
                    u_mouse: { value: new THREE.Vector2(0, 0) },
                    u_pressed: { value: 0 }
                }
            });

            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
            scene.add(mesh);

            canvas.__three = { renderer, scene, camera, material };
        }

        const { renderer, scene, camera, material } = canvas.__three;
        
        if (material?.uniforms) {
            if (material.uniforms.u_time) material.uniforms.u_time.value = time;
            if (material.uniforms.u_resolution) material.uniforms.u_resolution.value.set(grid.width, grid.height);
            if (material.uniforms.u_mouse) material.uniforms.u_mouse.value.set(mouse.x / grid.width, mouse.y / grid.height);
            if (material.uniforms.u_pressed) material.uniforms.u_pressed.value = mouse.isPressed ? 1.0 : 0.0;
        }
        
        renderer.setSize(grid.width, grid.height, false);
        renderer.render(scene, camera);

    } else {
        if (!canvas.__feral2D) {
            const colors = ['#FF00FF', '#00FFFF', '#FFFF00', '#FF3300', '#00FF66'];
            canvas.__feral2D = {
                particles: Array.from({length: 400}, () => ({
                    x: (Math.random() - 0.5) * grid.width,
                    y: (Math.random() - 0.5) * grid.height,
                    vx: 0, vy: 0,
                    color: colors[Math.floor(Math.random() * colors.length)]
                }))
            };
        }

        const state = canvas.__feral2D;
        const cx = grid.width / 2;
        const cy = grid.height / 2;

        ctx.fillStyle = 'rgba(4, 6, 8, 0.15)';
        ctx.fillRect(0, 0, grid.width, grid.height);

        ctx.globalCompositeOperation = 'screen';
        
        const folds = 8;
        const glitch = mouse.isPressed ? 2.5 : 1.0;

        state.particles.forEach(p => {
            let n1 = Math.sin(p.x * 0.01 + time) + Math.cos(p.y * 0.01 - time);
            let n2 = Math.sin(p.y * 0.015 - time * 0.5) + Math.cos(p.x * 0.015 + time * 0.5);
            
            let angle = n1 * Math.PI + n2;
            
            p.vx += Math.cos(angle) * 0.4 * glitch;
            p.vy += Math.sin(angle) * 0.4 * glitch;
            
            p.vx *= 0.92;
            p.vy *= 0.92;
            
            p.x += p.vx;
            p.y += p.vy;
            
            if (p.x < -cx) p.x += grid.width;
            if (p.x > cx) p.x -= grid.width;
            if (p.y < -cy) p.y += grid.height;
            if (p.y > cy) p.y -= grid.height;
            
            for(let i = 0; i < folds; i++) {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate((Math.PI * 2 / folds) * i + time * 0.2);
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.5, 3.0 - Math.abs(p.vx)), 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
                ctx.restore();
            }
        });
        
        ctx.globalCompositeOperation = 'source-over';
    }
} catch (e) {
    console.error("Feral Render Failed:", e);
}