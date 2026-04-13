if (!canvas.__three) {
    try {
        const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
        if (!gl) throw new Error("WebGL 2 not supported or context occupied");
        
        const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
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
            fragmentShader: `
                precision highp float;
                in vec2 vUv;
                out vec4 fragColor;

                uniform float u_time;
                uniform vec2 u_resolution;
                uniform vec2 u_mouse;

                vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
                    return a + b*cos( 6.28318*(c*t+d) );
                }

                vec2 hash2( vec2 p ) {
                    return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
                }

                vec3 voronoi( in vec2 x ) {
                    vec2 n = floor(x);
                    vec2 f = fract(x);
                    vec2 m = vec2(8.0);
                    for( int j=-1; j<=1; j++ )
                    for( int i=-1; i<=1; i++ ) {
                        vec2 g = vec2(float(i),float(j));
                        vec2 o = hash2( n + g );
                        vec2 r = g - f + o;
                        float d = dot(r,r);
                        if( d<m.x ) {
                            m.y = m.x;
                            m.x = d;
                        } else if( d<m.y ) {
                            m.y = d;
                        }
                    }
                    return vec3( sqrt(m.x), sqrt(m.y), 0.0 );
                }

                float smin(float a, float b, float k) {
                    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
                    return mix(b, a, h) - k * h * (1.0 - h);
                }

                vec3 boundaryData(vec3 p, float time) {
                    float theta = atan(p.y, p.x);
                    float z = p.z;
                    vec2 uv = vec2(theta * 2.5, z);
                    
                    float depth = 3.0 - length(p.xy);
                    float freq = mix(12.0, 2.0, clamp(depth, 0.0, 1.0));
                    
                    vec3 v = voronoi(uv * freq + time * 0.5);
                    float spot = smoothstep(0.02, 0.15, v.y - v.x) - smoothstep(0.2, 0.3, v.y - v.x);
                    
                    vec3 col = palette(theta/3.14 + z*0.2 - time*0.8, 
                                       vec3(0.8, 0.5, 0.6), 
                                       vec3(0.4, 0.5, 0.4), 
                                       vec3(1.0, 1.0, 1.0), 
                                       vec3(0.0, 0.33, 0.67));
                                       
                    col = mix(col, vec3(1.0, 0.0, 0.8), spot);
                    
                    float scan = smoothstep(0.8, 1.0, sin(z * 10.0 - time * 5.0));
                    col += vec3(0.0, 1.0, 1.0) * scan * 0.5;
                    
                    return col;
                }

                void main() {
                    vec2 uv = vUv * 2.0 - 1.0;
                    uv.x *= u_resolution.x / u_resolution.y;
                    
                    vec3 ro = vec3(0.0, 0.0, -3.0);
                    vec3 rd = normalize(vec3(uv, 1.0));
                    
                    float t = 0.0;
                    float max_t = 20.0;
                    
                    float glowBound = 0.0;
                    float glowMem = 0.0;
                    float glowPhoton = 0.0;
                    
                    vec3 p;
                    for(int i=0; i<70; i++) {
                        p = ro + rd * t;
                        
                        float dBound = 3.0 - length(p.xy);
                        
                        vec3 bhPos = vec3(sin(u_time)*0.8, cos(u_time*0.6)*0.8, 5.0);
                        float scramble = sin(p.x * 10.0 + u_time) * sin(p.y * 10.0 + u_time) * sin(p.z * 10.0) * 0.05;
                        float dHoriz = length(p - bhPos) - 1.2 + scramble;
                        
                        vec3 mPos = vec3((u_mouse.x - 0.5)*8.0, -(u_mouse.y - 0.5)*8.0, 2.0);
                        float dAnchor = length(p - mPos) - 0.4;
                        
                        float dMembrane = smin(dHoriz, dAnchor, 2.5);
                        
                        float d = min(dBound, abs(dMembrane));
                        
                        glowBound += exp(-dBound * 3.0) * 0.02;
                        glowMem += exp(-abs(dMembrane) * 6.0) * 0.025;
                        
                        float dPhoton = abs(dHoriz - 0.3);
                        glowPhoton += exp(-dPhoton * 10.0) * 0.015;
                        
                        if(d < 0.01 || t > max_t) break;
                        t += d * 0.8;
                    }
                    
                    vec3 bData = boundaryData(p, u_time);
                    
                    vec3 memColor = palette(length(p) * 0.5 - u_time, vec3(0.8, 0.5, 0.7), vec3(0.5, 0.4, 0.2), vec3(2.0, 1.0, 1.0), vec3(0.0, 0.25, 0.25));
                    
                    vec3 memNoise = voronoi(p.xy * 5.0 + u_time);
                    memColor += vec3(1.0, 0.5, 0.0) * memNoise.x * 0.5;
                    
                    vec3 col = bData * glowBound * 1.5 
                             + memColor * glowMem * 2.0 
                             + vec3(0.0, 1.0, 1.0) * glowPhoton * 3.0;
                             
                    col += vec3(0.5, 0.0, 1.0) * exp(-t * 0.15) * 0.1;
                    
                    float vignette = 1.0 - length(vUv * 2.0 - 1.0) * 0.5;
                    col *= vignette;
                    
                    col = col / (1.0 + col);
                    col = pow(col, vec3(1.0/2.2));
                    
                    fragColor = vec4(col, 1.0);
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
    if (material.uniforms.u_mouse) {
        const targetX = (mouse && mouse.x !== undefined ? mouse.x : grid.width / 2) / grid.width;
        const targetY = (mouse && mouse.y !== undefined ? mouse.y : grid.height / 2) / grid.height;
        material.uniforms.u_mouse.value.x += (targetX - material.uniforms.u_mouse.value.x) * 0.1;
        material.uniforms.u_mouse.value.y += (targetY - material.uniforms.u_mouse.value.y) * 0.1;
    }
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);