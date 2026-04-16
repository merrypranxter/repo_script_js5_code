if (!canvas.__three) {
  try {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) throw new Error("WebGL 2 not supported or context occupied");
    
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
    camera.position.z = 5;
    
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(grid.width, grid.height) },
        u_mouse: { value: new THREE.Vector2(grid.width / 2, grid.height / 2) }
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
        
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        
        in vec2 vUv;
        out vec4 fragColor;

        float hash21(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        // Ammann-Beenker Quasicrystal + Holographic AdS Warp + Op-Art Stripes
        float getPattern(vec2 p, float t, vec2 mouse) {
            // Holographic AdS Warp (Radial Depth = Scale)
            float r = length(p);
            float z = max(0.01, r);
            float warp = mix(1.0, 1.0 / z, 0.6 + 0.2 * sin(t * 0.2));
            vec2 wp = p * warp;
            
            // Entanglement Bridge / Minimal Surface
            vec2 m = mouse;
            float d1 = length(p - m);
            float d2 = length(p + m);
            float bridge = exp(-(d1 + d2 - length(m * 2.0)) * 4.0);
            wp += normalize(p) * bridge * 1.5;
            
            // 8-Fold Quasicrystal Interference
            float qc = 0.0;
            for(int i = 0; i < 4; i++) {
                float angle = 3.14159265 * float(i) / 4.0 + t * 0.05;
                vec2 dir = vec2(cos(angle), sin(angle));
                qc += cos(dot(wp, dir) * (12.0 + bridge * 8.0));
            }
            
            // Op-Art Stripe Fluid Distortion & False Depth
            float stripes = cos(r * 50.0 - t * 3.0 + qc * 1.5 + sin(wp.x * 8.0) * 1.5);
            return smoothstep(-0.2, 0.2, stripes);
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
            vec2 mouse = (u_mouse - 0.5 * u_resolution.xy) / u_resolution.y;
            
            // Psychedelic Collage: Glitch Scan Bend & CMYK Misregistration
            float glitch = step(0.95, sin(uv.y * 50.0 + u_time * 10.0)) * 0.02 * sin(u_time * 20.0);
            float offset = 0.008 + 0.004 * sin(u_time * 2.0) + glitch;
            
            float patR = getPattern(uv + vec2(offset, 0.0), u_time, mouse);
            float patG = getPattern(uv + vec2(0.0, offset), u_time, mouse);
            float patB = getPattern(uv - vec2(offset, 0.0), u_time, mouse);
            
            vec3 color = vec3(patR, patG, patB);
            
            // Op-Art: Structural Contrast (Black & White Scaffold)
            float luma = dot(color, vec3(0.299, 0.587, 0.114));
            vec3 bw = vec3(step(0.5, luma));
            
            // Chromatic Interference Fringing
            vec3 fringe = color - bw;
            
            // Lisa Frank / Acid Vibration Palette
            vec3 neonCyan = vec3(0.0, 1.0, 0.94);
            vec3 neonMagenta = vec3(1.0, 0.0, 0.8);
            vec3 acidYellow = vec3(1.0, 0.9, 0.0);
            vec3 deepViolet = vec3(0.36, 0.0, 1.0);
            
            // Psychedelic Material Contamination
            vec3 acid = neonMagenta * smoothstep(0.1, 0.8, fringe.r) 
                      + neonCyan * smoothstep(0.1, 0.8, fringe.g) 
                      + acidYellow * smoothstep(0.1, 0.8, fringe.b)
                      + deepViolet * smoothstep(0.1, 0.8, -fringe.r);
                      
            // Holography: Light Sheet Projection
            float theta = atan(uv.y, uv.x);
            float lightSheet = exp(-abs(mod(theta - u_time * 0.5, 6.28) - 3.14) * 3.0);
            
            // Combine Structural Op-Art with Acid Glow
            vec3 finalColor = mix(bw, acid * 2.5, length(fringe) * 1.5 + lightSheet * 0.8);
            
            // Print Artifact: Halftone Screen
            float freq = 120.0;
            vec2 cell = fract(uv * freq * mat2(0.707, -0.707, 0.707, 0.707)) - 0.5;
            float dotRadius = 0.5 * sqrt(1.0 - luma);
            float halftone = smoothstep(dotRadius + 0.15, dotRadius - 0.15, length(cell));
            
            finalColor = mix(finalColor, finalColor * halftone, 0.4);
            
            // Print Artifact: Xerox Tonal Crush & Electrostatic Noise
            finalColor = smoothstep(0.05, 0.95, finalColor);
            float noise = hash21(uv * u_time);
            finalColor += (noise - 0.5) * 0.18;
            
            // Vignette Burn
            float vig = 1.0 - smoothstep(0.4, 1.5, length(uv));
            finalColor *= vig;
            
            fragColor = vec4(finalColor, 1.0);
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

if (material?.uniforms) {
  if (material.uniforms.u_time) {
    material.uniforms.u_time.value = time;
  }
  if (material.uniforms.u_resolution) {
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }
  if (material.uniforms.u_mouse) {
    let targetX = mouse.x || grid.width / 2;
    let targetY = mouse.y || grid.height / 2;
    targetY = grid.height - targetY;
    
    material.uniforms.u_mouse.value.x += (targetX - material.uniforms.u_mouse.value.x) * 0.08;
    material.uniforms.u_mouse.value.y += (targetY - material.uniforms.u_mouse.value.y) * 0.08;
  }
}

renderer.setSize(grid.width, grid.height, false);
renderer.render(scene, camera);