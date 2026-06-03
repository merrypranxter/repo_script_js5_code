if (!ctx) return;

// --- CORE SYSTEM STATE ---
if (!canvas.__state) {
    canvas.__state = {
        streamers: [],
        colorLUT: [],
        initialized: false,
        lastTime: 0
    };

    // --- COLOR SCIENCE: OKLCh to sRGB LUT ---
    // Pre-computing the perceptual spectral rainbow to avoid per-frame math
    // Parameters: L=0.75 (bright), C=0.25 (neon acid saturation)
    for (let i = 0; i < 360; i++) {
        let h = i * Math.PI / 180.0;
        let L = 0.75;
        let C = 0.25;
        let a = C * Math.cos(h);
        let b = C * Math.sin(h);

        // Oklab to Linear sRGB
        let l_ = L + 0.3963377774 * a + 0.2158037573 * b;
        let m_ = L - 0.1055613458 * a - 0.0638541728 * b;
        let s_ = L - 0.0894841775 * a - 1.2914855480 * b;
        
        let l = l_ * l_ * l_;
        let m = m_ * m_ * m_;
        let s = s_ * s_ * s_;

        let r =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
        let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
        let bl= -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

        // Linear to sRGB Gamma
        let sR = r <= 0.0031308 ? 12.92 * r : 1.055 * Math.pow(Math.max(0, r), 1/2.4) - 0.055;
        let sG = g <= 0.0031308 ? 12.92 * g : 1.055 * Math.pow(Math.max(0, g), 1/2.4) - 0.055;
        let sB = bl<= 0.0031308 ? 12.92 * bl: 1.055 * Math.pow(Math.max(0, bl), 1/2.4) - 0.055;

        sR = Math.max(0, Math.min(255, Math.floor(sR * 255)));
        sG = Math.max(0, Math.min(255, Math.floor(sG * 255)));
        sB = Math.max(0, Math.min(255, Math.floor(sB * 255)));

        canvas.__state.colorLUT[i] = `rgba(${sR}, ${sG}, ${sB}, 0.8)`;
    }

    // Initial clear
    ctx.fillStyle = '#05000a';
    ctx.fillRect(0, 0, grid.width, grid.height);
    canvas.__state.initialized = true;
}

const state = canvas.__state;
const dt = Math.min(time - state.lastTime, 0.1);
state.lastTime = time;

// --- DREAM PHYSICS: MNEMONIC GRAVITY WELLS (Newton Fractal Roots) ---
// Complex math primitives
const c_mul = (a, b) => ({ x: a.x * b.x - a.y * b.y, y: a.x * b.y + a.y * b.x });
const c_div = (a, b) => {
    let d = b.x * b.x + b.y * b.y;
    if (d < 1e-8) d = 1e-8; // Glitch prophet: prevent NaN propagation
    return { x: (a.x * b.x + a.y * b.y) / d, y: (a.y * b.x - a.x * b.y) / d };
};

// f(z) = z^3 - c(t)  where c(t) is an orbiting singularity
let orbit = { x: Math.cos(time * 0.3), y: Math.sin(time * 0.4) };

const newton_step = (z) => {
    let z2 = c_mul(z, z);
    let z3 = c_mul(z2, z);
    let fz = { x: z3.x - orbit.x, y: z3.y - orbit.y };
    let dfz = { x: 3 * z2.x, y: 3 * z2.y };
    let step = c_div(fz, dfz);
    return { x: -step.x, y: -step.y };
};

// --- KINETIC FEEDBACK LOOP (The "Rainblown" Advection) ---
ctx.save();
ctx.globalCompositeOperation = 'source-over';
ctx.globalAlpha = 0.85; // Memory decay
ctx.setTransform(1, 0, 0, 1, 0, 0);

// Transform the past to simulate wind shear and expansion
ctx.translate(grid.width / 2, grid.height / 2);
ctx.scale(1.003, 1.003); // Slight dilation
ctx.rotate(0.001 * Math.sin(time * 0.5)); // Chrono-turbulence
ctx.translate(-grid.width / 2 + 2.5, -grid.height / 2 + 3.5); // Diagonal wind

ctx.drawImage(canvas, 0, 0);
ctx.restore();

// Darken to prevent whiteout
ctx.fillStyle = 'rgba(3, 1, 6, 0.06)'; // Cosmic void palette base
ctx.globalCompositeOperation = 'source-over';
ctx.fillRect(0, 0, grid.width, grid.height);

// --- KIRLIAN STREAMER AGENTS ---
const MAX_STREAMERS = 1200;
const GOLDEN_ANGLE = 137.50776405; // From color_systems harmony

// Spawn new streamers
if (state.streamers.length < MAX_STREAMERS) {
    let spawnCount = Math.min(20, MAX_STREAMERS - state.streamers.length);
    for (let i = 0; i < spawnCount; i++) {
        // Spawn along top and left edges
        let isTop = Math.random() > 0.5;
        let sx = isTop ? Math.random() * grid.width : 0;
        let sy = isTop ? 0 : Math.random() * grid.height;
        
        // Hue mapped to spatial origin + time
        let baseHue = Math.floor((sx / grid.width * 180 + sy / grid.height * 180 + time * 50) % 360);

        state.streamers.push({
            x: sx,
            y: sy,
            hue: baseHue,
            age: 0,
            maxAge: 50 + Math.random() * 100,
            generation: 0
        });
    }
}

// Coordinate mapping parameters
const scale = 2.5;
const cx = grid.width / 2;
const cy = grid.height / 2;

ctx.globalCompositeOperation = 'screen';

for (let i = state.streamers.length - 1; i >= 0; i--) {
    let s = state.streamers[i];
    s.age++;

    // Map screen to complex plane
    let z = {
        x: (s.x - cx) / (grid.width / scale),
        y: (s.y - cy) / (grid.height / scale)
    };

    // Calculate Mnemonic Gravity (Newton field)
    let v = newton_step(z);
    
    // Clamp field strength
    let mag = Math.sqrt(v.x * v.x + v.y * v.y);
    if (mag > 0.05) {
        v.x *= 0.05 / mag;
        v.y *= 0.05 / mag;
    }

    // Add "Rainblown" global wind and Dielectric Breakdown jitter
    let windX = 0.01;
    let windY = 0.015;
    let jitterX = (Math.random() - 0.5) * 0.008;
    let jitterY = (Math.random() - 0.5) * 0.008;

    z.x += v.x + windX + jitterX;
    z.y += v.y + windY + jitterY;

    // Map back to screen
    let nx = z.x * (grid.width / scale) + cx;
    let ny = z.y * (grid.height / scale) + cy;

    // Draw
    let hueIdx = Math.floor(s.hue) % 360;
    if (hueIdx < 0) hueIdx += 360;

    ctx.strokeStyle = state.colorLUT[hueIdx];
    
    // Machine hesitation: line width pulses with time and age
    ctx.lineWidth = 1.0 + Math.sin(s.age * 0.2 + time * 5.0) * 0.5;
    
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    s.x = nx;
    s.y = ny;

    // Identity Superposition (Branching)
    // If caught in a high-tension area (high derivative), split via Golden Angle
    if (mag > 0.04 && s.generation < 3 && Math.random() < 0.05 && state.streamers.length < MAX_STREAMERS) {
        state.streamers.push({
            x: s.x,
            y: s.y,
            hue: (s.hue + GOLDEN_ANGLE) % 360,
            age: s.age,
            maxAge: s.maxAge,
            generation: s.generation + 1
        });
        // Complementary shift for the parent
        s.hue = (s.hue + 180) % 360;
    }

    // Cull dead or out-of-bounds streamers
    if (s.age > s.maxAge || s.x < -50 || s.y < -50 || s.x > grid.width + 50 || s.y > grid.height + 50) {
        state.streamers.splice(i, 1);
    }
}

// Reset composite operation to avoid affecting external systems
ctx.globalCompositeOperation = 'source-over';