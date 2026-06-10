try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: false });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);

    const fragmentShader = `
#ifdef GL_ES
precision highp float;
precision highp int;
#endif

in vec2 vUv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;

// --- UTILS ---
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdStarburst(vec2 p) {
    float a = atan(p.y, p.x);
    float r = length(p);
    float rays = sin(a * 5.0) * 0.5 + 0.5;
    return r - 0.05 * (1.0 + rays * 2.5);
}

float sdHeart(vec2 p) {
    p.x = abs(p.x);
    if(p.y + p.x > 1.0) return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0)/4.0;
    return sqrt(min(dot(p, p), dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)))) * sign(p.x - p.y);
}

// --- OPTICAL ENGINE ---
float opticalEngine(vec2 uv, float t) {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= u_resolution.x / u_resolution.y;
    
    // Stripe fluid distortion (domain warping)
    p += vec2(sin(p.y * 10.0 + t * 2.0), cos(p.x * 10.0 - t * 2.0)) * 0.05;
    p *= 1.0 + sin(t * 0.5) * 0.2; // Pulse zoom
    
    float r = length(p);
    float a = atan(p.y, p.x);
    
    // Radial hypnosis & Moiré
    float rings = sin(r * 50.0 - t * 10.0);
    float spokes = sin(a * 24.0 + r * 20.0 + t * 5.0);
    
    // Checker funnel
    float checker = sign(sin(r * 30.0 - t * 5.0) * sin(a * 16.0));
    
    // Figure-ground instability mix
    float pattern = step(0.0, mix(rings * spokes, checker, sin(t * 0.3) * 0.5 + 0.5));
    return pattern;
}

void main() {
    vec2 uv = vUv;
    float t = u_time;
    
    // --- GLOBAL GLITCH (Frame Slicing) ---
    float sliceNoise = hash(vec2(floor(uv.y * 25.0), floor(t * 15.0)));
    if(sliceNoise > 0.95) {
        uv.x += (hash(vec2(floor(t * 15.0))) - 0.5) * 0.3;
    }
    
    vec2 p = uv * 2.0 - 1.0;
    p.x *= u_resolution.x / u_resolution.y;

    // --- MACROBLOCK DATAMOSH ---
    vec2 blockUv = floor(uv * 30.0) / 30.0;
    float glitchTrigger = step(0.85, hash(blockUv + floor(t * 10.0)));
    vec2 gUv = uv;
    if(glitchTrigger > 0.5) {
        gUv.x += (hash(blockUv.yy + t) - 0.5) * 0.15;
        gUv.y += (hash(blockUv.xx - t) - 0.5) * 0.15;
    }
    
    // Horizontal tear (VHS tracking error)
    float tear = step(0.98, sin(uv.y * 60.0 + t * 15.0));
    gUv.x += tear * (hash(vec2(t)) - 0.5) * 0.25;

    // --- CHROMATIC INTERFERENCE OP (RGB Split) ---
    float split = 0.02 + glitchTrigger * 0.05 + tear * 0.1;
    float rPat = opticalEngine(gUv + vec2(split, 0.0), t);
    float gPat = opticalEngine(gUv, t);
    float bPat = opticalEngine(gUv - vec2(split, 0.0), t);
    vec3 col = vec3(rPat, gPat, bPat);
    
    // --- NEON ACID PALETTE TINTING ---
    vec3 hotPink = vec3(1.0, 0.15, 0.6);
    vec3 cyan = vec3(0.0, 1.0, 1.0);
    vec3 lime = vec3(0.6, 1.0, 0.0);
    vec3 purple = vec3(0.5, 0.0, 1.0);
    
    float colorZone = noise(gUv * 4.0 - t);
    vec3 tint = mix(hotPink, cyan, step(0.33, colorZone));
    tint = mix(tint, lime, step(0.66, colorZone));
    
    float isWhite = step(2.9, col.r + col.g + col.b);
    vec3 tintedWhite = tint * 1.2;
    col = mix(col, tintedWhite, isWhite * step(0.5, noise(gUv * 10.0 + t)));

    // JPEG Crust / Mosquito Noise
    col += noise(uv * 200.0 + t) * 0.15 * glitchTrigger;

    // --- XOR-GHOST MANIFOLD GLITCH ---
    int ix = int(uv.x * u_resolution.x * 0.15);
    int iy = int(uv.y * u_resolution.y * 0.15);
    if((ix ^ iy) % 23 == 0 && glitchTrigger > 0.5) {
        col = vec3(1.0) - col; // Bitwise color inversion
    }

    // --- MYSPACE GLITTER & BLINGEE ---
    vec2 gridUv = fract(uv * 12.0) - 0.5;
    vec2 gridId = floor(uv * 12.0);
    float starPhase = t * 4.0 + hash(gridId) * 20.0;
    float starSize = (sin(starPhase) * 0.5 + 0.5) * step(0.8, hash(gridId + 12.34));
    float dStar = sdStarburst(gridUv / max(starSize, 0.001));
    
    if(dStar < 0.0 && starSize > 0.0) {
        col = vec3(1.0);
        if(dStar > -0.02) col = mix(hotPink, cyan, hash(gridId));
    }

    // --- EYE-OBJECT ICONOGRAPHY ---
    for(float i=0.0; i<3.0; i++) {
        vec2 eyePos = vec2(0.2 + i*0.3, 0.2 + sin(t + i)*0.1);
        vec2 eUv = uv - eyePos;
        float a = sin(t * 0.5 + i) * 0.3;
        mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
        eUv = rot * eUv;
        
        float d1 = length(eUv - vec2(0.0, 0.12)) - 0.15;
        float d2 = length(eUv - vec2(0.0, -0.12)) - 0.15;
        float dEye = max(d1, d2);
        
        if(dEye < 0.0) {
            col = vec3(1.0); // sclera
            float dIris = length(eUv) - 0.06;
            if(dIris < 0.0) col = lime; // toxic green iris
            float dPupil = length(eUv) - 0.025;
            if(dPupil < 0.0) col = vec3(0.0); // pupil
            if(dEye > -0.01) col = hotPink; // bleeding edge
        }
    }

    // --- PLUSH CANDY HEARTS ---
    for(float i=0.0; i<4.0; i++) {
        vec2 hPos = vec2(0.8 - i*0.15, 0.8 + sin(t*1.1+i)*0.1);
        vec2 hUv = uv - hPos;
        hUv *= 4.0;
        hUv.y += 0.6;
        float a = sin(t + i) * 0.5;
        mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
        hUv = rot * hUv;
        
        float dHeart = sdHeart(hUv);
        if(dHeart < 0.0) {
            col = mix(hotPink, purple, hash(vec2(i)));
            if(hash(hUv * 20.0 + t) > 0.8) col = vec3(1.0); // glitter fill
            if(dHeart > -0.08) col = vec3(0.0); // outline
        }
    }

    // --- CASCADING ERROR WINDOWS ---
    float cascadeTime = mod(t, 12.0);
    for(float i = 0.0; i < 15.0; i++) {
        if(cascadeTime > i * 0.15) {
            vec2 center = vec2(0.1 + i * 0.04, 0.8 - i * 0.04);
            if(hash(vec2(i, t)) > 0.92) center += (hash(vec2(t, i))-0.5)*0.05; // Jitter
            
            vec2 bUv = uv - center;
            float dBox = sdBox(bUv, vec2(0.25, 0.15));
            if(dBox < 0.0) {
                col = vec3(0.75); // Win9x gray
                float dInner = sdBox(bUv, vec2(0.24, 0.14));
                if(dInner > 0.0) col = vec3(0.9); // Bevel
                
                // Title bar
                if(bUv.y > 0.10) col = mix(vec3(0.0, 0.0, 0.5), vec3(0.2, 0.5, 1.0), (bUv.x + 0.25)/0.5); 
                
                // Close button
                if(bUv.y > 0.105 && bUv.x > 0.20) col = vec3(0.8, 0.2, 0.2);
                
                // Error icon
                if(length(bUv - vec2(-0.15, 0.0)) < 0.04) {
                    col = vec3(0.9, 0.1, 0.1);
                    if(abs(abs(bUv.x + 0.15) - abs(bUv.y)) < 0.008) col = vec3(1.0);
                }
                
                // Text lines
                if(bUv.y < 0.04 && bUv.y > -0.08 && bUv.x > -0.08 && bUv.x < 0.2) {
                    if(mod(bUv.y * 100.0, 4.0) < 1.5) col = vec3(0.0);
                }
                
                // Datamosh the box
                if(hash(bUv * 15.0 + t) > 0.97) col = mix(col, vec3(1.0, 0.0, 1.0), 0.8);
            }
            else if(dBox < 0.02 && bUv.x > 0.0 && bUv.y < 0.0) {
                col *= 0.3; // shadow
            }
        }
    }

    // --- CURSOR TRAIL ---
    vec2 curPos = vec2(0.5) + vec2(sin(t * 1.1), cos(t * 1.4)) * 0.4;
    vec2 cUv = uv - curPos;
    float curDist = length(cUv);
    if(curDist < 0.01) {
        col = vec3(1.0);
    } else if(curDist < 0.04) {
        col += cyan * (0.04 - curDist) * 30.0;
    }
    for(float i = 1.0; i < 8.0; i++) {
        vec2 pastPos = vec2(0.5) + vec2(sin((t - i*0.05) * 1.1), cos((t - i*0.05) * 1.4)) * 0.4;
        vec2 pUv = uv - pastPos;
        if(length(pUv) < 0.008) col = mix(col, vec3(1.0, 0.0, 1.0), 0.8 / i);
    }

    // --- BSOD FLASH ---
    if(mod(t, 20.0) > 19.7) {
        col = vec3(0.0, 0.0, 0.6); // Classic BSOD blue
        if(hash(uv + t) > 0.85) col = vec3(1.0); // Static noise
        if(uv.x > 0.1 && uv.x < 0.9 && uv.y > 0.2 && uv.y < 0.8) {
            if(mod(uv.y * 40.0, 2.0) < 0.3) col = vec3(1.0); // Fake text
        }
    }

    // --- CRT BLEED & VIGNETTE ---
    col.r *= 1.0 + sin(uv.y * u_resolution.y * 0.5) * 0.05;
    col.g *= 1.0 + cos(uv.y * u_resolution.y * 0.5) * 0.05;
    col.b *= 1.0 + sin(uv.y * u_resolution.y * 0.5 + 3.14) * 0.05;
    
    col *= smoothstep(1.8, 0.4, length(p));
    
    fragColor = vec4(col, 1.0);
}
    `;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: fragmentShader,
    });

    const mesh = new THREE.Mesh(geometry, material);
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
  console.error("WebGL Initialization or Render Failed:", e);
}