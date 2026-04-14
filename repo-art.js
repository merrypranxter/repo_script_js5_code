// THE FERAL DESIGN-BRAIN: INITIATED
// [MECHANISM]: Hyperbolic Chladni Resonance in a Folded p6m Space
// [GENOME]: 
//   - vibration: Chladni modal equations, acoustic radiation pressure (Gor'kov potential proxy)
//   - tesselations: p6m (hexagonal) kaleidoscopic domain folding
//   - psychedelic_collage: Cyberdelic neon palette, displacement warp, chromatic aberration, xerox glitch

if (!ctx) return; // Only execute if Canvas 2D context is available

// --- GENOME EXTRACTION: PALETTES & CONSTANTS ---
const PALETTE = {
    void_black: '#040608',
    neon_cyan: [0, 255, 240],       // #00FFF0
    electric_magenta: [255, 0, 204], // #FF00CC
    acid_lime: [176, 255, 0],       // #B0FF00
    electric_orange: [255, 107, 0], // #FF6B00
    cobalt_blue: [0, 71, 255]       // #0047FF
};

const COLORS = [
    PALETTE.neon_cyan,
    PALETTE.electric_magenta,
    PALETTE.acid_lime,
    PALETTE.electric_orange,
    PALETTE.cobalt_blue
];

const NUM_PARTICLES = 4000;
const BASE_SCALE = 6.0;
const EPSILON = 0.01;

// --- STATE MANAGEMENT ---
if (!canvas.__feralState) {
    canvas.__feralState = {
        particles: [],
        m: 2.0,
        n: 3.0,
        target_m: 2.0,
        target_n: 3.0,
        initialized: false
    };
}
const state = canvas.__feralState;

// Initialize particles if needed
if (!state.initialized || state.particles.length === 0) {
    for (let i = 0; i < NUM_PARTICLES; i++) {
        state.particles.push({
            x: Math.random() * grid.width,
            y: Math.random() * grid.height,
            vx: 0,
            vy: 0,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            life: Math.random()
        });
    }
    state.initialized = true;
    
    // Fill initial background
    ctx.fillStyle = PALETTE.void_black;
    ctx.fillRect(0, 0, grid.width, grid.height);
}

// --- MATHEMATICAL FRAMEWORK ---

// 1. Psychedelic Displacement Warp
function noiseWarp(x, y, t) {
    // Fast pseudo-harmonic interference field
    const nx = Math.sin(x * 2.1 + t) * Math.cos(y * 1.9 - t * 0.5);
    const ny = Math.sin(y * 3.3 + t * 1.5) * Math.cos(x * 2.7 - t * 1.2);
    return { x: nx, y: ny };
}

// 2. p6m Tessellation Fold (Hexagonal Kaleidoscope)
function foldP6m(px, py) {
    const sqrt3 = 1.73205080757;
    let x = Math.abs(px);
    let y = Math.abs(py);
    
    // Fold across first diagonal
    if (y > x * sqrt3) {
        let nx = x * 0.5 + y * (sqrt3 / 2);
        let ny = x * (sqrt3 / 2) - y * 0.5;
        x = nx; y = ny;
    }
    x = Math.abs(x);
    
    // Fold across second diagonal
    if (y > x * sqrt3) {
        let nx = x * 0.5 + y * (sqrt3 / 2);
        let ny = x * (sqrt3 / 2) - y * 0.5;
        x = nx; y = ny;
    }
    return { x: Math.abs(x), y: Math.abs(y) };
}

// 3. Chladni Modal Resonance Equation
function chladni(x, y, m, n) {
    // Classic square plate eigenmode superposition
    return Math.sin(n * x) * Math.sin(m * y) + Math.sin(m * x) * Math.sin(n * y);
}

// 4. Unified Field Evaluation (The "Acoustic Radiation Pressure")
function evaluateField(px, py, t, warpIntensity, m, n) {
    // Normalize coordinates
    let aspect = grid.width / grid.height;
    let nx = (px / grid.width - 0.5) * BASE_SCALE * aspect;
    let ny = (py / grid.height - 0.5) * BASE_SCALE;
    
    // Apply Warp
    let warp = noiseWarp(nx, ny, t);
    nx += warp.x * warpIntensity;
    ny += warp.y * warpIntensity;
    
    // Apply p6m Fold
    let folded = foldP6m(nx, ny);
    
    // Evaluate Chladni Resonance
    return chladni(folded.x, folded.y, m, n);
}

// --- DYNAMIC INTERACTION ---
// The mouse acts as a high-frequency bow on the Chladni plate, overclocking the modes
let isOverclocked = mouse.isPressed;
let warpIntensity = isOverclocked ? 0.8 : 0.15;

if (isOverclocked) {
    state.target_m = 5.0 + Math.sin(time * 2.0) * 3.0;
    state.target_n = 7.0 + Math.cos(time * 1.5) * 4.0;
} else {
    // Slowly drift through fundamental harmonies
    state.target_m = 2.0 + Math.sin(time * 0.2) * 1.0;
    state.target_n = 3.0 + Math.cos(time * 0.3) * 1.0;
}

// Smoothly interpolate modes (momentum)
state.m += (state.target_m - state.m) * 0.05;
state.n += (state.target_n - state.n) * 0.05;

// --- RENDER LOOP ---

// 1. Feedback / Motion Blur (Analog Xerox Ghosting)
ctx.globalCompositeOperation = 'source-over';
ctx.fillStyle = `rgba(4, 6, 8, ${isOverclocked ? 0.2 : 0.1})`; 
ctx.fillRect(0, 0, grid.width, grid.height);

ctx.globalCompositeOperation = 'screen';

// 2. Particle Physics (Gor'kov Potential Migration)
for (let i = 0; i < state.particles.length; i++) {
    let p = state.particles[i];
    
    // Numerical Gradient of the field (seeking nodal lines where C = 0)
    let v0 = evaluateField(p.x, p.y, time, warpIntensity, state.m, state.n);
    let vx_eps = evaluateField(p.x + EPSILON * grid.width, p.y, time, warpIntensity, state.m, state.n);
    let vy_eps = evaluateField(p.x, p.y + EPSILON * grid.height, time, warpIntensity, state.m, state.n);
    
    let dx = (vx_eps - v0) / EPSILON;
    let dy = (vy_eps - v0) / EPSILON;
    
    // Force directs particles *away* from antinodes and *towards* nodes (where field approaches 0)
    // We multiply by v0 so the force is proportional to current amplitude, directing downhill towards 0.
    let forceX = -v0 * dx;
    let forceY = -v0 * dy;
    
    // Add some thermal noise (Brownian motion)
    forceX += (Math.random() - 0.5) * 0.5;
    forceY += (Math.random() - 0.5) * 0.5;
    
    // If overclocked, particles panic
    if (isOverclocked) {
        let dxMouse = p.x - mouse.x;
        let dyMouse = p.y - mouse.y;
        let dist = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (dist < 200) {
            forceX += (dxMouse / dist) * 10;
            forceY += (dyMouse / dist) * 10;
        }
    }
    
    // Update velocity with friction
    p.vx = p.vx * 0.85 + forceX * 0.2;
    p.vy = p.vy * 0.85 + forceY * 0.2;
    
    // Limit velocity
    let speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > 10) {
        p.vx = (p.vx / speed) * 10;
        p.vy = (p.vy / speed) * 10;
    }
    
    let oldX = p.x;
    let oldY = p.y;
    
    p.x += p.vx;
    p.y += p.vy;
    
    // Wrap around (Infinite Torus Topology)
    if (p.x < 0) { p.x = grid.width; oldX = p.x; }
    if (p.x > grid.width) { p.x = 0; oldX = p.x; }
    if (p.y < 0) { p.y = grid.height; oldY = p.y; }
    if (p.y > grid.height) { p.y = 0; oldY = p.y; }
    
    // Pulse alpha based on life and speed
    p.life += 0.02;
    let alpha = (Math.sin(p.life) * 0.5 + 0.5) * (isOverclocked ? 0.8 : 0.4);
    
    // --- CHROMATIC ABERRATION RENDER ---
    // Split the path into RGB components offset by velocity
    let aberration = isOverclocked ? 3.0 : 1.0;
    
    ctx.lineWidth = 1.5;
    
    // Red Channel
    ctx.strokeStyle = `rgba(255, 0, 100, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(oldX - p.vx * aberration, oldY - p.vy * aberration);
    ctx.lineTo(p.x - p.vx * aberration, p.y - p.vy * aberration);
    ctx.stroke();
    
    // Green Channel (Base Color)
    ctx.strokeStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(oldX, oldY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    
    // Blue Channel
    ctx.strokeStyle = `rgba(0, 100, 255, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(oldX + p.vx * aberration, oldY + p.vy * aberration);
    ctx.lineTo(p.x + p.vx * aberration, p.y + p.vy * aberration);
    ctx.stroke();
}

// 3. Glitch / Scan-Bend Composite (Analog Artifacts)
// Occasional horizontal tearing to break the clean math
if (Math.random() < (isOverclocked ? 0.3 : 0.05)) {
    ctx.globalCompositeOperation = 'source-over';
    let sliceY = Math.random() * grid.height;
    let sliceHeight = Math.random() * 40 + 5;
    let shiftX = (Math.random() - 0.5) * (isOverclocked ? 40 : 10);
    
    // Draw slice shifted
    ctx.drawImage(
        canvas, 
        0, sliceY, grid.width, sliceHeight, 
        shiftX, sliceY, grid.width, sliceHeight
    );
    
    // Add RGB split overlay on the slice
    ctx.fillStyle = `rgba(255, 0, 204, 0.2)`; // electric magenta
    ctx.fillRect(shiftX, sliceY, grid.width, sliceHeight);
}

// 4. Subtle Halftone/Noise Grain Overlay
ctx.globalCompositeOperation = 'overlay';
ctx.fillStyle = `rgba(255, 255, 255, 0.03)`;
for (let i = 0; i < 50; i++) {
    let gx = Math.random() * grid.width;
    let gy = Math.random() * grid.height;
    let r = Math.max(0, Math.random() * 2);
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, Math.PI * 2);
    ctx.fill();
}