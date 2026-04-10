const PHI = 1.618033988749895;
const DELTA_S = 2.414213562373095;

// Initialize the persistent feral engine
if (!window.__weirdLisaEngine) {
    window.__weirdLisaEngine = {
        initialized: false,
        particles: [],
        offscreenCanvas: document.createElement('canvas'),
        timeOffset: Math.random() * 1000
    };
    
    // Hash-based noise for feral steering
    window.__weirdLisaEngine.hash = (x, y) => {
        let n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
        return n - Math.floor(n);
    };

    // Initialize Three.js for the Non-Euclidean Quasicrystal Raymarcher
    if (typeof THREE !== 'undefined') {
        const engine = window.__weirdLisaEngine;
        engine.renderer = new THREE.WebGLRenderer({ 
            canvas: engine.offscreenCanvas, 
            alpha: true, 
            antialias: false,
            powerPreference: "high-performance"
        });
        engine.scene = new THREE.Scene();
        engine.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        engine.camera.position.z = 1;

        const geometry = new THREE.PlaneGeometry(2, 2);
        
        // The Strange Mechanism: A Lisa Frank Hyperbolic Icosahedral Mandelbox
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2() }
            },
            vertexShader: `
                void main() {
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec2 uResolution;
                
                #define PHI 1.618033988749895
                #define MAX_STEPS 50
                #define SURF_DIST 0.005
                
                // Lisa Frank Phase-Shift Palette
                vec3 lfPalette(float t) {
                    vec3 a = vec3(0.5, 0.5, 0.5);
                    vec3 b = vec3(0.5, 0.5, 0.5);
                    vec3 c = vec3(1.5, 1.0, 1.0); // Overclocked frequency
                    vec3 d = vec3(0.8, 0.0, 0.4); // Hot Pink, Cyan, Yellow bias
                    return a + b * cos(6.28318 * (c * t + d));
                }
                
                mat2 rot(float a) {
                    float s = sin(a), c = cos(a);
                    return mat2(c, -s, s, c);
                }
                
                // Hyper-dimensional Quasicrystal Fold
                float map(vec3 p) {
                    vec3 z = p;
                    float dr = 1.0;
                    
                    // 5-fold icosahedral symmetry planes
                    vec3 n1 = normalize(vec3(PHI, 1.0, 0.0));
                    vec3 n2 = normalize(vec3(1.0, PHI, 0.0));
                    vec3 n3 = normalize(vec3(0.0, 1.0, PHI));
                    
                    for(int i = 0; i < 5; i++) {
                        // Rotation drift
                        z.xy *= rot(uTime * 0.05);
                        z.yz *= rot(uTime * 0.08);
                        
                        // Icosahedral mirror folding
                        z = abs(z);
                        z -= 2.0 * min(0.0, dot(z, n1)) * n1;
                        z -= 2.0 * min(0.0, dot(z, n2)) * n2;
                        z -= 2.0 * min(0.0, dot(z, n3)) * n3;
                        
                        // Non-Euclidean Spherical Inversion (Mandelbox core)
                        float r2 = dot(z, z);
                        if(r2 < 0.25) {
                            z *= 4.0;
                            dr *= 4.0;
                        } else if(r2 < 1.0) {
                            z /= r2;
                            dr /= r2;
                        }
                        
                        // Scale and translate
                        float scale = 2.41421356; // Silver Ratio (Ammann-Beenker)
                        z = z * scale - vec3(1.2, 1.5, 0.8) * (sin(uTime*0.2)*0.2 + 1.0);
                        dr *= scale;
                    }
                    return (length(z) - 0.5) / abs(dr);
                }
                
                void main() {
                    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
                    vec3 ro = vec3(0.0, 0.0, -2.5);
                    vec3 rd = normalize(vec3(uv, 1.0));
                    
                    float d0 = 0.0;
                    vec3 p;
                    float iter = 0.0;
                    
                    // Raymarching
                    for(int i = 0; i < MAX_STEPS; i++) {
                        p = ro + rd * d0;
                        float dS = map(p);
                        d0 += dS;
                        iter++;
                        if(dS < SURF_DIST || d0 > 8.0) break;
                    }
                    
                    vec3 col = vec3(0.0);
                    if(d0 < 8.0) {
                        // Orbit trap shimmer + emotional recursion hues
                        float trap = length(p.xy) * length(p.yz);
                        col = lfPalette(trap * 0.4 - uTime * 0.2 + iter * 0.03);
                        
                        // Depth fog & thermal bloom
                        col *= 2.0 / (1.0 + d0 * d0 * 0.2);
                        
                        // Leopard print / Animal aesthetic void carving
                        float spots = sin(p.x * 25.0) * sin(p.y * 25.0) * sin(p.z * 25.0);
                        if(spots > 0.85) {
                            col = vec3(0.05); // Velvet black leopard spots
                            // Neon rim light on spots
                            if(spots < 0.9) col = vec3(0.0, 1.0, 1.0); 
                        }
                    } else {
                        // Iridescent phase-shift background
                        col = lfPalette(length(uv) - uTime * 0.1) * 0.15;
                    }
                    
                    gl_FragColor = vec4(col, 1.0);
                }
            `
        });

        engine.mesh = new THREE.Mesh(geometry, material);
        engine.scene.add(engine.mesh);
        engine.initialized = true;
    }

    // Seed the feral L-system / Quasicrystal particle swarm
    for (let i = 0; i < 150; i++) {
        engine.particles.push({
            x: Math.random(),
            y: Math.random(),
            vx: 0,
            vy: 0,
            history: [],
            hue: Math.random() * 360,
            life: Math.random() * 100,
            generation: 0
        });
    }
}

const engine = window.__weirdLisaEngine;

// 1. Update and Render the Non-Euclidean Background (Three.js)
if (engine.initialized) {
    if (engine.offscreenCanvas.width !== grid.width || engine.offscreenCanvas.height !== grid.height) {
        engine.offscreenCanvas.width = grid.width;
        engine.offscreenCanvas.height = grid.height;
        engine.renderer.setSize(grid.width, grid.height, false);
    }
    
    engine.mesh.material.uniforms.uTime.value = time + engine.timeOffset;
    engine.mesh.material.uniforms.uResolution.value.set(grid.width, grid.height);
    
    engine.renderer.render(engine.scene, engine.camera);
    
    // Composite the WebGL render onto the primary 2D context
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(engine.offscreenCanvas, 0, 0);
} else {
    // Fallback if Three.js is missing
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, grid.width, grid.height);
}

// 2. Feral Particle System: Quasicrystalline L-System Swarm
// This layer acts as the "Lisa Frank sticker overlay" but driven by recursive math
ctx.globalCompositeOperation = 'lighter';
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

const penroseAngle = Math.PI / 5; // 36 degrees (5-fold symmetry)
const ammannAngle = Math.PI / 4;  // 45 degrees (8-fold symmetry)

engine.particles.forEach((p, index) => {
    // Record history for bokeh glyph trails
    p.history.push({ x: p.x, y: p.y });
    if (p.history.length > 15) p.history.shift();

    // The Quasicrystal Flow Field
    // We sample noise and snap it to forbidden symmetry angles
    let n = engine.hash(p.x * 3.0, p.y * 3.0 + time * 0.1);
    let rawAngle = n * Math.PI * 2;
    
    // Alternate between 5-fold and 8-fold angle snapping based on generation
    let fold = (p.generation % 2 === 0) ? penroseAngle : ammannAngle;
    let snappedAngle = Math.round(rawAngle / fold) * fold;

    // Vector forces
    let force = 0.005;
    p.vx += Math.cos(snappedAngle) * force;
    p.vy += Math.sin(snappedAngle) * force;
    
    // Friction
    p.vx *= 0.95;
    p.vy *= 0.95;

    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.5;

    // L-System Branching Mutation
    // Dead pixels behaving like pollen - occasionally spawning an orthogonal branch
    if (Math.random() < 0.02 && engine.particles.length < 400 && p.generation < 4) {
        let splitAngle = snappedAngle + (Math.random() > 0.5 ? fold : -fold);
        engine.particles.push({
            x: p.x,
            y: p.y,
            vx: Math.cos(splitAngle) * 0.01,
            vy: Math.sin(splitAngle) * 0.01,
            history: [],
            hue: (p.hue + PHI * 137.5) % 360, // Golden angle color shift
            life: 100,
            generation: p.generation + 1
        });
    }

    // Wrap around screen with a glitch displacement
    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
        p.x = Math.random();
        p.y = Math.random();
        p.history = [];
        p.generation = 0;
        p.life = 100;
    }

    // Draw the bokeh glyph trail
    if (p.history.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.history[0].x * grid.width, p.history[0].y * grid.height);
        for (let i = 1; i < p.history.length; i++) {
            ctx.lineTo(p.history[i].x * grid.width, p.history[i].y * grid.height);
        }
        
        // Lisa Frank hyper-vibrant glow logic
        let cycle = (time * 100 + p.hue) % 360;
        ctx.strokeStyle = `hsla(${cycle}, 100%, 60%, ${p.life / 100})`;
        ctx.lineWidth = (5 - p.generation) * (Math.sin(time * 5 + p.x * 10) * 0.5 + 1);
        ctx.shadowBlur = 15;
        ctx.shadowColor = `hsla(${(cycle + 180) % 360}, 100%, 50%, 0.8)`; // Complementary shadow
        ctx.stroke();
        
        // Leopard print nodes at trail joints
        if (index % 3 === 0 && Math.random() > 0.8) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000'; // Black leopard core
            ctx.beginPath();
            ctx.arc(p.x * grid.width, p.y * grid.height, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = `hsla(${cycle}, 100%, 60%, 1)`; // Neon rim
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }

    // Cull dead particles
    if (p.life <= 0) {
        p.x = Math.random();
        p.y = Math.random();
        p.history = [];
        p.life = 100 + Math.random() * 50;
        p.generation = 0;
    }
});

// Reset shadow for next frame safety
ctx.shadowBlur = 0;