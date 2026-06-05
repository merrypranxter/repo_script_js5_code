try {
  if (!canvas.__three) {
    if (!ctx) throw new Error("WebGL 2 context not available");

    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, grid.width / grid.height, 0.1, 1000);
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

      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      float fbm(vec2 p) {
          float f = 0.0;
          float amp = 0.5;
          for(int i = 0; i < 6; i++) {
              f += amp * noise(p);
              p *= 2.0;
              amp *= 0.5;
          }
          return f;
      }

      vec3 oklch_to_srgb(vec3 lch) {
          vec3 lab = vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
          float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
          float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
          float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
          float l = l_ * l_ * l_;
          float m = m_ * m_ * m_;
          float s = s_ * s_ * s_;
          vec3 rgb = vec3(
               4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
              -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
              -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
          );
          vec3 c1 = rgb * 12.92;
          vec3 c2 = 1.055 * pow(max(rgb, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
          return clamp(mix(c1, c2, step(0.0031308, rgb)), 0.0, 1.0);
      }

      const float R1 = 0.5;
      const float R2 = 0.5;
      const float R3 = 0.33333333;
      const vec2 C1 = vec2( 0.5, 0.0);
      const vec2 C2 = vec2(-0.5, 0.0);
      const vec2 C3 = vec2( 0.0,  0.47140452);
      const vec2 C4 = vec2( 0.0, -0.47140452);

      vec2 apollonianDE(vec2 p) {
          float minDist = 1e6;
          float depth = 0.0;
          
          float dOuter = abs(length(p) - 1.0);
          minDist = dOuter;
          
          vec2 q = p;
          float scale = 1.0;
          
          for (int i = 0; i < 40; i++) {
              float d1 = length(q - C1);
              float d2 = length(q - C2);
              float d3 = length(q - C3);
              float d4 = length(q - C4);
              
              float n1 = d1 / R1;
              float n2 = d2 / R2;
              float n3 = d3 / R3;
              float n4 = d4 / R3;

              float near = min(min(n1, n2), min(n3, n4));
              if (near > 1.0) break;

              if (n1 <= n2 && n1 <= n3 && n1 <= n4) {
                  q = C1 + R1 * R1 * (q - C1) / (d1 * d1);
                  scale *= R1 * R1 / (d1 * d1);
              } else if (n2 <= n3 && n2 <= n4) {
                  q = C2 + R2 * R2 * (q - C2) / (d2 * d2);
                  scale *= R2 * R2 / (d2 * d2);
              } else if (n3 <= n4) {
                  q = C3 + R3 * R3 * (q - C3) / (d3 * d3);
                  scale *= R3 * R3 / (d3 * d3);
              } else {
                  q = C4 + R3 * R3 * (q - C4) / (d4 * d4);
                  scale *= R3 * R3 / (d4 * d4);
              }
              
              float da = abs(length(q - C1) - R1);
              float db = abs(length(q - C2) - R2);
              float dc = abs(length(q - C3) - R3);
              float dd = abs(length(q - C4) - R3);
              float di = min(min(da, db), min(dc, dd));
              float candidateDist = di / scale;

              if (candidateDist < minDist) {
                  minDist = candidateDist;
                  depth = float(i + 1);
              }
          }
          return vec2(minDist, depth);
      }

      void main() {
          vec2 uv = (vUv - 0.5) * 2.0;
          uv.x *= u_resolution.x / u_resolution.y;
          
          // Zoom into the fractal structure
          uv *= 0.65;
          uv.y += 0.1;
          
          // Breathing wind direction for the rainblown effect
          float windAngle = -1.1 + sin(u_time * 0.2) * 0.25; 
          vec2 windDir = vec2(cos(windAngle), sin(windAngle));
          vec2 orthoDir = vec2(-windDir.y, windDir.x);
          
          // Rain and flow distortion
          float rainNoise = fbm(vec2(dot(uv, orthoDir) * 10.0, dot(uv, windDir) * 1.5 - u_time * 3.0));
          float flowNoise = fbm(uv * 2.5 + u_time * 0.4);
          
          // Distort the domain
          vec2 warpedUv = uv + windDir * rainNoise * 0.25 + vec2(flowNoise) * 0.08;
          
          // Slow organic rotation
          float angle = sin(u_time * 0.15) * 0.2;
          mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
          warpedUv = rot * warpedUv;
          
          // Evaluate Apollonian Gasket distance estimator
          vec2 res = apollonianDE(warpedUv);
          float d = res.x;
          float depth = res.y;
          
          // Perceptual Rainbow Palette mapping
          float hue = depth * 0.12 - d * 6.0 + u_time * 0.25 + rainNoise * 0.3 + length(uv) * 0.4;
          float luma = 0.65 + 0.15 * sin(depth * 1.5 - u_time * 2.0);
          float chroma = 0.28 + 0.08 * flowNoise;
          
          vec3 colorCore = oklch_to_srgb(vec3(luma, chroma, hue * 6.28318));
          vec3 colorEdge = oklch_to_srgb(vec3(0.85, 0.15, (hue + 0.15) * 6.28318));
          
          // Deep void background
          vec3 bg = vec3(0.02, 0.01, 0.05);
          
          // Lines and Glows
          float line = smoothstep(0.006, 0.0, d);
          float glow = exp(-d * 100.0) * 0.65;
          
          vec3 finalColor = mix(bg, colorCore, glow);
          finalColor = mix(finalColor, colorEdge, line);
          
          // Chromatic aberration glitch on edges
          float glitch = smoothstep(0.65, 1.0, fbm(uv * 25.0 - u_time * 6.0));
          if (line > 0.05 && glitch > 0.4) {
              finalColor.r = oklch_to_srgb(vec3(luma, chroma, (hue - 0.04) * 6.28318)).r;
              finalColor.b = oklch_to_srgb(vec3(luma, chroma, (hue + 0.04) * 6.28318)).b;
          }
          
          // Rain streaks overlay
          float streak = smoothstep(0.55, 0.85, noise(vec2(dot(vUv, orthoDir) * 60.0, dot(vUv, windDir) * 5.0 - u_time * 12.0)));
          finalColor += streak * 0.2 * colorEdge;
          
          // Vignette
          float vig = 1.0 - length(vUv - 0.5) * 1.25;
          vig = smoothstep(0.0, 0.8, vig);
          finalColor *= vig;
          
          fragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
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