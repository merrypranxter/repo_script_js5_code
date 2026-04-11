const { width, height } = grid;
const cx = width / 2;
const cy = height / 2;

// --- PALETTES & VOCABULARY (Glitchcore / MySpace / Laser Cat) ---
const PALETTE = {
    magenta: '#FF0080',
    cyan: '#00FFFF',
    acid: '#39FF14',
    violet: '#8A2BE2',
    white: '#FFFFFF',
    void: '#05020B'
};
const COLORS = [PALETTE.magenta, PALETTE.cyan, PALETTE.acid, PALETTE.violet, PALETTE.white];
const DEBRIS_TEXTS = [
    "ERROR_0xDEAD", "xX_laser_Xx", "<blink>pain</blink>", 
    "404_SHRINE", "datamosh.exe", "typing...", 
    "A/S/L?", "connection_lost", "burn_the_feed"
];

// --- STATE INITIALIZATION ---
// We attach state to the canvas to persist across frames
if (!canvas.__feralState) {
    canvas.__feralState = {
        glitter: Array.from({ length: 150 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 3 + 1,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.1 + 0.05
        })),
        debris: Array.from({ length: 8 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            w: Math.random() * 150 + 50,
            h: Math.random() * 40 + 20,
            txt: DEBRIS_TEXTS[Math.floor(Math.random() * DEBRIS_TEXTS.length)],
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            vy: -Math.random() * 2 - 0.5,
            life: Math.random() * 100
        })),
        lastMouse: { x: cx, y: cy },
        glitchClock: 0
    };
    
    // Initial black fill
    ctx.fillStyle = PALETTE.void;
    ctx.fillRect(0, 0, width, height);
}

const state = canvas.__feralState;
state.glitchClock++;

// Smooth mouse tracking for temporal anchor
state.lastMouse.x += ((mouse.x || cx) - state.lastMouse.x) * 0.1;
state.lastMouse.y += ((mouse.y || cy) - state.lastMouse.y) * 0.1;
const mx = state.lastMouse.x;
const my = state.lastMouse.y;

// --- 1. TEMPORAL ECHO & DATAMOSH SMEAR (Glitchcore / Damage) ---
// Instead of clearing the screen, we draw the canvas onto itself, 
// slightly scaled and shifted towards the temporal anchor (mouse),
// creating a feedback loop that simulates motion-vector prediction errors.
ctx.globalCompositeOperation = 'source-over';

// The "Smear" displacement
const smearScale = mouse.isPressed ? 1.05 : 1.01;
const dx = (cx - mx) * 0.02;
const dy = (cy - my) * 0.02;

ctx.translate(mx, my);
ctx.scale(smearScale, smearScale);
ctx.translate(-mx + dx, -my + dy);
ctx.drawImage(canvas, 0, 0);
ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

// Fade out slightly to prevent complete whiteout, leaving "Phosphor Trails"
ctx.fillStyle = `rgba(5, 2, 11, ${mouse.isPressed ? 0.02 : 0.08})`;
ctx.fillRect(0, 0, width, height);

// --- 2. VHS TRACKING TEAR & COMPRESSION BREAKAGE (Damage Aesthetics) ---
if (Math.random() < 0.15) {
    const tearY = Math.random() * height;
    const tearH = Math.random() * 40 + 5;
    const tearShift = (Math.random() - 0.5) * (mouse.isPressed ? 200 : 50);
    
    // Horizontal slice displacement
    ctx.drawImage(canvas, 0, tearY, width, tearH, tearShift, tearY, width, tearH);
    
    // Chroma bleed on the tear
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,0,128,0.3)' : 'rgba(0,255,255,0.3)';
    ctx.fillRect(tearShift, tearY, width, tearH);
    ctx.globalCompositeOperation = 'source-over';
}

// Macroblocking (Candy-Crash Compression)
if (state.glitchClock % 30 === 0) {
    for(let i=0; i<5; i++) {
        ctx.fillStyle = COLORS[Math.floor(Math.random() * COLORS.length)];
        ctx.globalAlpha = 0.15;
        const bw = Math.random() * 100 + 20;
        const bh = Math.random() * 100 + 20;
        ctx.fillRect(Math.random() * width, Math.random() * height, bw, bh);
    }
    ctx.globalAlpha = 1.0;
}

// --- 3. SHRINE UI DEBRIS (MySpace / Early Web) ---
ctx.globalCompositeOperation = 'source-over';
ctx.font = '12px "Courier New", monospace';
ctx.textBaseline = 'top';

state.debris.forEach(d => {
    d.y += d.vy;
    d.life--;
    
    // Jitter
    const jx = (Math.random() - 0.5) * 2;
    
    // Draw Window Chrome
    ctx.strokeStyle = d.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(d.x + jx, d.y, d.w, d.h);
    
    // Title bar
    ctx.fillStyle = d.color;
    ctx.fillRect(d.x + jx, d.y, d.w, 14);
    
    // Text Debris
    ctx.fillStyle = PALETTE.void;
    ctx.fillText(d.txt, d.x + jx + 2, d.y + 1);
    
    // Reset if dead
    if (d.life <= 0 || d.y < -d.h) {
        d.y = height + d.h;
        d.x = Math.random() * width;
        d.life = Math.random() * 100 + 50;
        d.txt = DEBRIS_TEXTS[Math.floor(Math.random() * DEBRIS_TEXTS.length)];
        d.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
});

// --- 4. THE DEITY: LASER CAT / RGB PHANTOM ---
// Abstract geometric representation of the "God Cat" emitting lasers
const eyeDist = 80;
const leftEye = { x: mx - eyeDist, y: my - 50 };
const rightEye = { x: mx + eyeDist, y: my - 50 };

// Draw Lasers (Rainbow Puke / Beam Judgment)
ctx.globalCompositeOperation = 'lighter';
ctx.lineWidth = mouse.isPressed ? 8 : 3;

const drawLaser = (originX, originY, phaseOffset) => {
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    
    // Laser targets the bottom of the screen, oscillating wildly
    for (let y = originY; y <= height + 50; y += 20) {
        const progress = (y - originY) / (height - originY);
        // Amplitude increases as it goes down (cone blast mode)
        const amp = progress * (mouse.isPressed ? 300 : 100);
        const freq = 0.05;
        const x = originX + Math.sin(y * freq + time * 10 + phaseOffset) * amp;
        
        // Glitchy sharp turns
        if (Math.random() < 0.1) ctx.lineTo(x + (Math.random()-0.5)*50, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
};

// RGB Channel Split for Lasers
ctx.strokeStyle = PALETTE.magenta;
drawLaser(leftEye.x - 5, leftEye.y, 0);
drawLaser(rightEye.x - 5, rightEye.y, 1);

ctx.strokeStyle = PALETTE.acid;
drawLaser(leftEye.x, leftEye.y, 2);
drawLaser(rightEye.x, rightEye.y, 3);

ctx.strokeStyle = PALETTE.cyan;
drawLaser(leftEye.x + 5, leftEye.y, 4);
drawLaser(rightEye.x + 5, rightEye.y, 5);

// Draw the "Eyes" (Blank Idiot Stare + Bloom Contamination)
const drawEye = (x, y) => {
    // Outer bloom
    const radius = Math.max(0.1, mouse.isPressed ? 40 : 20 + Math.sin(time*5)*5);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, PALETTE.white);
    grad.addColorStop(0.2, PALETTE.magenta);
    grad.addColorStop(1, 'rgba(255,0,128,0)');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner slit (cat eye)
    ctx.fillStyle = PALETTE.void;
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 0.1, radius * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
};

// Phase-lag duplication (RGB Phantom logic on the eyes)
ctx.globalCompositeOperation = 'screen';
drawEye(leftEye.x - 10, leftEye.y); // Red shift
drawEye(rightEye.x - 10, rightEye.y);

ctx.globalCompositeOperation = 'source-over';
drawEye(leftEye.x, leftEye.y);
drawEye(rightEye.x, rightEye.y);

// --- 5. MYSPACE GLITTER & SPARKLE STATIC ---
ctx.globalCompositeOperation = 'lighter';
state.glitter.forEach(g => {
    g.phase += g.speed;
    const brightness = (Math.sin(g.phase) + 1) / 2;
    
    if (brightness > 0.8) {
        ctx.fillStyle = Math.random() > 0.5 ? PALETTE.white : PALETTE.cyan;
        
        // Draw starburst
        ctx.beginPath();
        ctx.moveTo(g.x, g.y - g.size * 2);
        ctx.lineTo(g.x + g.size * 0.5, g.y - g.size * 0.5);
        ctx.lineTo(g.x + g.size * 2, g.y);
        ctx.lineTo(g.x + g.size * 0.5, g.y + g.size * 0.5);
        ctx.lineTo(g.x, g.y + g.size * 2);
        ctx.lineTo(g.x - g.size * 0.5, g.y + g.size * 0.5);
        ctx.lineTo(g.x - g.size * 2, g.y);
        ctx.lineTo(g.x - g.size * 0.5, g.y - g.size * 0.5);
        ctx.fill();
    }
    
    // Drift
    g.y -= 0.5;
    if (g.y < 0) g.y = height;
});

// Final CRT Scanline Overlay (Subtle)
ctx.globalCompositeOperation = 'multiply';
ctx.fillStyle = 'rgba(0, 20, 20, 0.1)';
for(let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1);
}