if (!canvas.__weirdState) {
    // FERAL DESIGN BRAIN INITIALIZATION
    // Blending Psychedelic Collage (Cyberdelic Neon, CMYK Misregistration, Xerox Noise)
    // with Tessellations (p6m / 7-fold hyperbolic symmetries)
    // and Vibration Physics (Chladni modal eigenfrequencies, acoustic radiation pressure)
    
    const numParticles = 4000;
    const particles = new Float32Array(numParticles * 6); // x, y, vx, vy, colorType, life
    
    for (let i = 0; i < numParticles; i++) {
        const idx = i * 6;
        particles[idx] = Math.random() * grid.width;
        particles[idx + 1] = Math.random() * grid.height;
        particles[idx + 2] = 0; // vx
        particles[idx + 3] = 0; // vy
        particles[idx + 4] = Math.floor(Math.random() * 3); // 0: Cyan, 1: Magenta, 2: Lime/Yellow
        particles[idx + 5] = Math.random(); // life / phase
    }

    canvas.__weirdState = {
        particles,
        m: 3,
        n: 5,
        targetM: 3,
        targetN: 5,
        folds: 7, // {7,3} hyperbolic inspiration
        lastTime: time,
        glitchY: 0,
        glitchHeight: 0
    };
    
    // Initial void background
    ctx.fillStyle = '#040608'; // Void Black
    ctx.fillRect(0, 0, grid.width, grid.height);
}

const state = canvas.__weirdState;
const dt = Math.min(time - state.lastTime, 0.1);
state.lastTime = time;

const cx = grid.width / 2;
const cy = grid.height / 2;
const maxRadius = Math.min(cx, cy);

// FERAL MECHANISM 1: Unstable Eigenfrequencies (Machine Hesitation)
// The modal indices drift organically, never quite settling, causing the "sand" to constantly seek new nodal lines.
if (Math.random() < 0.02) {
    state.targetM = 1 + Math.random() * 6;
    state.targetN = 1 + Math.random() * 6;
}
state.m += (state.targetM - state.m) * 0.05;
state.n += (state.targetN - state.n) * 0.05;

// FERAL MECHANISM 2: Feedback Loop Kaleidoscope (from psychedelic_collage)
// We don't clear the screen; we draw a highly transparent dark rectangle to create trails.
// We also apply a slight scale/zoom to the existing canvas to create an infinite descent.
ctx.globalCompositeOperation = 'source-over';
ctx.fillStyle = 'rgba(4, 6, 8, 0.08)'; // Void Black with transparency
ctx.fillRect(0, 0, grid.width, grid.height);

// Slight zoom feedback
ctx.save();
ctx.translate(cx, cy);
ctx.scale(1.002, 1.002);
ctx.rotate(Math.sin(time * 0.1) * 0.001);
ctx.translate(-cx, -cy);
ctx.globalAlpha = 0.95;
ctx.drawImage(canvas, 0, 0);
ctx.restore();

// Math utilities for the forces
const TWO_PI = Math.PI * 2;
const sector = TWO_PI / state.folds;
const scale = 0.02; // Spatial frequency scale

// Approximate gradient of folded Chladni function
function getForce(x, y, m, n) {
    // 1. Center coordinates
    let dx = x - cx;
    let dy = y - cy;
    
    // 2. Kaleidoscope fold (polar mirroring)
    let angle = Math.atan2(dy, dx);
    let radius = Math.sqrt(dx * dx + dy * dy);
    
    // Fold angle
    angle = ((angle % sector) + sector) % sector;
    if (angle > sector / 2) angle = sector - angle;
    
    // Add a time-based twist (displacement warp)
    angle += Math.sin(radius * 0.01 - time) * 0.1;
    
    // Unfold to warped cartesian
    let wx = Math.cos(angle) * radius * scale;
    let wy = Math.sin(angle) * radius * scale;
    
    // 3. Chladni Equation: Z = sin(n*x)*sin(m*y) ± sin(m*x)*sin(n*y)
    // We sample a small epsilon to find the gradient (pushing towards Z=0 nodes)
    const eps = 0.01;
    
    const calcZ = (px, py) => {
        return Math.sin(n * px) * Math.sin(m * py) - Math.sin(m * px) * Math.sin(n * py);
    };
    
    let z = calcZ(wx, wy);
    let zx = calcZ(wx + eps, wy);
    let zy = calcZ(wx, wy + eps);
    
    // Gradient of the absolute value (particles bounce off antinodes, settle on nodes)
    // Force is negative gradient of |Z|
    let sign = Math.sign(z) || 1;
    let fx = -(zx - z) / eps * sign;
    let fy = -(zy - z) / eps * sign;
    
    // Rotate force back to original space
    let forceAngle = Math.atan2(fy, fx) + (Math.atan2(dy, dx) - angle);
    let forceMag = Math.sqrt(fx*fx + fy*fy);
    
    return {
        x: Math.cos(forceAngle) * forceMag,
        y: Math.sin(forceAngle) * forceMag,
        zMag: Math.abs(z)
    };
}

// Interaction: Mouse acts as a massive antinode repeller
let mouseForce = { x: 0, y: 0 };

ctx.globalCompositeOperation = 'screen';

// Colors from Acid Vibration & Cyberdelic Neon palettes
const colors = [
    { c: '#00FFF0', offX: 2.0, offY: 0 },   // Neon Cyan
    { c: '#FF00CC', offX: -1.5, offY: 1.0 }, // Electric Magenta
    { c: '#B0FF00', offX: 0.5, offY: -0.5 }  // Acid Lime
];

// FERAL MECHANISM 3: CMYK Misregistration + Acoustic Radiation
// Particles are drawn with structural offsets based on their color assignment.
const p = state.particles;
for (let i = 0; i < p.length; i += 6) {
    let px = p[i];
    let py = p[i + 1];
    let vx = p[i + 2];
    let vy = p[i + 3];
    let colorIdx = p[i + 4];
    let life = p[i + 5];
    
    // Get structural force
    let force = getForce(px, py, state.m, state.n);
    
    // Mouse repeller
    if (mouse.isPressed) {
        let mdx = px - mouse.x;
        let mdy = py - mouse.y;
        let distSq = mdx * mdx + mdy * mdy;
        if (distSq < 20000) {
            let dist = Math.sqrt(distSq);
            force.x += (mdx / dist) * 5;
            force.y += (mdy / dist) * 5;
        }
    }
    
    // Apply forces
    vx += force.x * 0.5;
    vy += force.y * 0.5;
    
    // Add "electrostatic grain" jitter
    vx += (Math.random() - 0.5) * 0.5;
    vy += (Math.random() - 0.5) * 0.5;
    
    // Friction (damping)
    vx *= 0.85;
    vy *= 0.85;
    
    px += vx;
    py += vy;
    
    // Wrap around boundaries
    if (px < 0) px += grid.width;
    if (px > grid.width) px -= grid.width;
    if (py < 0) py += grid.height;
    if (py > grid.height) py -= grid.height;
    
    // Update state
    p[i] = px;
    p[i + 1] = py;
    p[i + 2] = vx;
    p[i + 3] = vy;
    
    // Life cycle
    p[i + 5] += 0.01;
    if (p[i + 5] > 1) p[i + 5] = 0;
    
    // Render
    let colConf = colors[colorIdx];
    
    // CMYK offset glitch based on velocity and distance from center
    let intensity = Math.min(1, Math.sqrt(vx*vx + vy*vy) * 0.2);
    let drawX = px + colConf.offX * intensity * 5;
    let drawY = py + colConf.offY * intensity * 5;
    
    // Draw particle
    ctx.fillStyle = colConf.c;
    // Size pulses based on the acoustic energy (zMag) at that point
    let size = Math.max(0.5, 2.5 - force.zMag * 2); 
    
    // Occasionally draw a "xerox streak" instead of a dot
    if (Math.random() < 0.001) {
        ctx.fillRect(drawX, drawY, Math.random() * 20 + 5, 1);
    } else {
        ctx.fillRect(drawX, drawY, size, size);
    }
}

// FERAL MECHANISM 4: Xerox / Scan Bend Glitch
// Periodically slice and shift a horizontal band of the canvas to simulate
// analog video sync loss or databending.
ctx.globalCompositeOperation = 'source-over';
if (Math.random() < 0.05) {
    state.glitchY = Math.random() * grid.height;
    state.glitchHeight = 2 + Math.random() * 20;
}

if (state.glitchHeight > 0) {
    // Extract slice
    let sliceY = state.glitchY;
    let sliceH = state.glitchHeight;
    let shiftX = (Math.random() - 0.5) * 40;
    
    // Draw shifted
    ctx.drawImage(
        canvas, 
        0, sliceY, grid.width, sliceH,
        shiftX, sliceY, grid.width, sliceH
    );
    
    // Add raw noise line
    ctx.fillStyle = Math.random() > 0.5 ? '#00FFF0' : '#FF00CC';
    ctx.globalAlpha = Math.random() * 0.3;
    ctx.fillRect(0, sliceY + Math.random() * sliceH, grid.width, 1);
    ctx.globalAlpha = 1.0;
    
    state.glitchHeight -= 2;
}

// Vignette (Paper grain / dark edges)
let grad = ctx.createRadialGradient(cx, cy, maxRadius * 0.5, cx, cy, maxRadius * 1.2);
grad.addColorStop(0, 'rgba(4, 6, 8, 0)');
grad.addColorStop(1, 'rgba(4, 6, 8, 0.8)');
ctx.fillStyle = grad;
ctx.fillRect(0, 0, grid.width, grid.height);