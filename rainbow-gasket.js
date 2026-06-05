export default function(ctx, grid, time, repos, input, mouse, canvas, THREE) {
  if (!canvas.__three) {
    try {
      if (!ctx) throw new Error("WebGL 2 context not available");
      
      const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
      camera.position.z = 1;
      
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
        uniform vec2 u_resolution;

        // Simplex noise (2D) for fluid, rainblown domain warping
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
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
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

        // OKLab to linear sRGB
        vec3 OKLCh_to_OKLab(vec3 lch) {
            return vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
        }
        vec3 OKLab_to_linearSRGB(vec3 c) {
            float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
            float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
            float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
            float l = l_ * l_ * l_;
            float m = m_ * m_ * m_;
            float s = s_ * s_ * s_;
            return vec3(
                 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
            );
        }
        vec3 linear_to_sRGB(vec3 c) {
            c = max(c, vec3(0.0));
            vec3 outColor;
            outColor.r = c.r <= 0.0031308 ? c.r * 12.92 : 1.055 * pow(c.r, 1.0/2.4) - 0.055;
            outColor.g = c.g <= 0.0031308 ? c.g * 12.92 : 1.055 * pow(c.g, 1.0/2.4) - 0.055;
            outColor.b = c.b <= 0.0031308 ? c.b * 12.92 : 1.055 * pow(c.b, 1.0/2.4) - 0.055;
            return outColor;
        }
        
        // Perceptually uniform rainbow color generation
        vec3 oklch2srgb(float L, float C, float h) {
            vec3 lab = OKLCh_to_OKLab(vec3(L, C, h));
            vec3 lin = OKLab_to_linearSRGB(lab);
            return clamp(linear_to_sRGB(lin), 0.0, 1.0);
        }

        // Apollonian Gasket Constants (-1, 2, 2, 3) packing
        const float R1 = 0.5, R2 = 0.5, R3 = 0.33333333;
        const vec2 C1 = vec2( 0.5, 0.0);
        const vec2 C2 = vec2(-0.5, 0.0);
        const vec2 C3 = vec2( 0.0, 0.47140452);
        const vec2 C4 = vec2( 0.0,-0.47140452);

        // Apollonian recursive inversion fold
        vec4 foldDomainDE(vec2 p) {
            vec2 q = p;
            float count = 0.0;
            float scale = 1.0;
            
            for (int i = 0; i < 50; i++) {
                float d1 = length(q - C1);
                float d2 = length(q - C2);
                float d3 = length(q - C3);
                float d4 = length(q - C4);
                
                float n1 = d1/R1, n2 = d2/R2, n3 = d3/R3, n4 = d4/R3;
                float near = min(min(n1, n2), min(n3, n4));
                if (near > 1.0) break;
                
                if (n1 <= n2 && n1 <= n3 && n1 <= n4) {
                    float f = R1*R1/(d1*d1);
                    q = C1 + (q - C1)*f;
                    scale *= f;
                    count += 1.0;
                } else if (n2 <= n3 && n2 <= n4) {
                    float f = R2*R2/(d2*d2);
                    q = C2 + (q - C2)*f;
                    scale *= f;
                    count += 1.0;
                } else if (n3 <= n4) {
                    float f = R3*R3/(d3*d3);
                    q = C3 + (q - C3)*f;
                    scale *= f;
                    count += 1.0;
                } else {
                    float f = R3*R3/(d4*d4);
                    q = C4 + (q - C4)*f;
                    scale *= f;
                    count += 1.0;
                }
            }
            return vec4(q, count, scale);
        }

        // Distance to the primary generator circles
        float distToGenerators(vec2 q) {
            float da = abs(length(q - C1) - R1);
            float db = abs(length(q - C2) - R2);
            float dc = abs(length(q - C3) - R3);
            float dd = abs(length(q - C4) - R3);
            float de = abs(length(q) - 1.0);
            return min(min(min(da, db), min(dc, dd)), de);
        }

        void main() {
            vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
            p *= 2.6; // Zoom out to reveal the full structure

            // "Rainblown" domain warping properties
            vec2 rainDir = normalize(vec2(0.8, -1.2));
            float rainSpeed = u_time * 0.4;

            vec2 warpP = p;
            
            // Base continuous pan
            warpP += rainDir * rainSpeed * 0.3;

            // Multi-scale fluid noise for the smeared/blown look
            float n1 = snoise(warpP * 1.5 - rainDir * rainSpeed);
            float n2 = snoise(warpP * 3.0 - rainDir * rainSpeed * 1.5 + vec2(10.0));
            float n3 = snoise(warpP * 6.0 - rainDir * rainSpeed * 2.0);

            // Apply directional gust and lateral wind shear
            vec2 gustOffset = rainDir * (n1 * 0.2 + n2 * 0.1 + n3 * 0.05);
            vec2 lateralWind = vec2(-rainDir.y, rainDir.x) * (snoise(warpP * 1.2 + u_time * 0.15) * 0.15);
            warpP += gustOffset + lateralWind;

            // Slow global rotation
            float angle = sin(u_time * 0.05) * 0.3;
            mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
            warpP = rot * warpP;

            // Evaluate Apollonian Gasket in warped space
            vec4 folded = foldDomainDE(warpP);
            vec2 q = folded.xy;
            float count = folded.y;
            float scale = folded.z;

            // True Euclidean distance estimate to the gasket boundary
            float d = distToGenerators(q) / scale;

            // Color computation (OKLCh mapping)
            // Hue sweeps based on iterations, spatial position, and time
            float hue = count * 0.6 + length(warpP) * 1.2 - u_time * 1.5 + n1 * 1.5;
            
            // Procedural chromatic fringing (glitch/noise edge)
            float noiseGrad = snoise(warpP * 8.0) - snoise(warpP * 8.0 + vec2(0.02));
            hue += noiseGrad * 2.0;
            
            // Dynamic chroma (saturation)
            float chroma = 0.22 + 0.1 * sin(count * 0.5 + u_time);
            
            // Lightness glows near the edges of the fractal geometry
            float glow = exp(-d * 60.0);
            float core = exp(-d * 300.0);
            float lightness = 0.25 + 0.45 * glow + 0.3 * core;
            
            // Add subtle paper grain/noise into the lightness channel
            lightness += 0.06 * snoise(p * 50.0 - u_time * 10.0);

            // Moiré / thin-film interference rings (Structural color effect)
            float iridescence = 0.5 + 0.5 * cos(d * 400.0 - u_time * 5.0);
            hue += iridescence * 0.4;
            chroma += iridescence * 0.08;

            // Convert back to displayable sRGB
            vec3 color = oklch2srgb(lightness, chroma, hue);

            // Rain streaks / smearing overlay
            float streak = snoise(vec2(p.x * 6.0 - p.y * 3.0, p.y * 25.0 + p.x * 12.0 - u_time * 10.0));
            streak = smoothstep(0.65, 0.95, streak) * 0.35;
            color += streak * vec3(0.7, 0.9, 1.0); // Bright cyan-white streaks

            // Deep vignette
            float vig = 1.0 - smoothstep(0.5, 1.8, length(p));
            color *= mix(0.1, 1.0, vig);

            // Acid contrast boost and slight gamma lift for "neon pop"
            color = smoothstep(0.0, 1.0, color);
            color = pow(color, vec3(0.9)); 

            fragColor = vec4(color, 1.0);
        }
      `;
      
      const material = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        uniforms: {
          u_time: { value: 0 },
          u_resolution: { value: new THREE.Vector2(grid.width, grid.height) }
        },
        vertexShader,
        fragmentShader
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
  
  if (material?.uniforms?.u_time) {
    material.uniforms.u_time.value = time;
    material.uniforms.u_resolution.value.set(grid.width, grid.height);
  }
  
  renderer.setSize(grid.width, grid.height, false);
  renderer.render(scene, camera);
}