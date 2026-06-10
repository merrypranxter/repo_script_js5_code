// Autophagic MySpace Op-Tunnel
// A collision of Retinal Surrealism (Op Art), MySpace Glitter Rot, and Zeno's Infinite Descent.
// Uses a feedback loop with 'difference' blending to create an optical illusion that eats its own history.

const MAX_RINGS = 35;
const PALETTE = ['#FF0080', '#00FFFF', '#AAFF00', '#FFFFFF']; // Hot Pink, Cyan, Acid Lime, White
const DEBRIS_TEXT = ["x_x", "404_not_found", "glitter.gif", "connection_lost", "<blink>", "r.i.p."];

// Initialize persistent state attached to the canvas
if (!canvas.__glitchState || canvas.__glitchState.w !== grid.width || canvas.__glitchState.h !== grid.height) {
    const offscreen = document.createElement('canvas');
    offscreen.width = grid.width;
    offscreen.height = grid.height;
    
    // Generate initial fake UI windows
    const windows = [];
    for (let i = 0; i < 6; i++) {
        windows.push({
            x: Math.random() * grid.width,
            y: Math.random() * grid.height,
            w: 120 + Math.random() * 100,
            h: 60 + Math.random() * 40,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            msg: DEBRIS_TEXT[Math.floor(Math.random() * DEBRIS_TEXT.length)],
            color: PALETTE[Math.floor(Math.random() * PALETTE.length)]
        });
    }

    canvas.__glitchState = {
        off: offscreen,
        octx: offscreen.getContext('2d', { willReadFrequently: true }),
        w: grid.width,
        h: grid.height,
        cx: grid.width / 2,
        cy: grid.height / 2,
        windows: windows,
        sparkles: []
    };
    
    // Fill offscreen initially
    canvas.__glitchState.octx.fillStyle = '#050505';
    canvas.__glitchState.octx.fillRect(0, 0, grid.width, grid.height);
}

const state = canvas.__glitchState;

// Smooth mouse tracking for the optical center
let targetX = mouse.x || grid.width / 2;
let targetY = mouse.y || grid.height / 2;
state.cx += (targetX - state.cx) * 0.05;
state.cy += (targetY - state.cy) * 0.05;

// 1. BASE: Draw the feedback loop (Zeno Tunnel / Temporal Echo)
// This scales, rotates, and chromatic-aberrates the previous frame.
ctx.save();
ctx.fillStyle = '#050505';
ctx.fillRect(0, 0, grid.width, grid.height);

ctx.translate(state.cx, state.cy);
// Slight rotation and scale-up creates the infinite descent tunnel
ctx.rotate(Math.sin(time * 0.5) * 0.02);
ctx.scale(1.04, 1.04);
ctx.translate(-state.cx, -state.cy);

ctx.globalAlpha = 0.92;
ctx.globalCompositeOperation = 'screen';

// RGB split feedback (Chromatic Aberration Op)
ctx.drawImage(state.off, -3, 0); // Red bias (simulated by positioning)
ctx.globalAlpha = 0.8;
ctx.drawImage(state.off, 3, 0);  // Cyan bias
ctx.restore();

// 2. MACROBLOCKING / DATAMOSH (Glitch Data Rot)
// Randomly rip chunks of the screen and shift them
if (Math.random() < 0.15) {
    ctx.save();
    let bx = Math.random() * grid.width;
    let by = Math.random() * grid.height;
    let bw = Math.random() * 300 + 50;
    let bh = Math.random() * 50 + 10;
    ctx.drawImage(state.off, bx, by, bw, bh, bx + (Math.random() - 0.5) * 40, by + (Math.random() - 0.5) * 10, bw, bh);
    ctx.restore();
}

// 3. OPTICAL ILLUSION (Retinal Surrealism / Zebra Waves)
// High-contrast B&W rings drawn with 'difference' blending to invert the underlying neon feedback
ctx.save();
ctx.translate(state.cx, state.cy);
ctx.globalCompositeOperation = 'difference';
ctx.lineWidth = 6 + Math.sin(time * 2) * 2;

for (let i = 0; i < MAX_RINGS; i++) {
    // Rings expand outward to create a funnel/tunnel effect
    let radius = (i * 30 + (time * 120)) % (MAX_RINGS * 30);
    if (radius < 1) continue;

    ctx.strokeStyle = i % 2 === 0 ? '#FFFFFF' : '#000000';
    ctx.beginPath();
    
    // Draw wavy/deformed rings (Zebra Waves)
    let segments = 60;
    for (let j = 0; j <= segments; j++) {
        let angle = (j / segments) * Math.PI * 2;
        // Deformation based on angle, time, and radius depth
        let deform = Math.sin(angle * 8 + time * 3) * (radius * 0.05) + Math.cos(angle * 3 - time) * 10;
        let rDef = Math.max(0.1, radius + deform);
        
        let x = Math.cos(angle) * rDef;
        let y = Math.sin(angle) * rDef;
        
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
}
ctx.restore();

// 4. MYSPACE UI DEBRIS (Early Internet / Candy Crash)
// Floating, broken window frames that leave trails
ctx.save();
ctx.globalCompositeOperation = 'source-over';
state.windows.forEach((w, i) => {
    // Erratic movement
    w.x += w.vx;
    w.y += w.vy;
    
    // Wrap around screen
    if (w.x > grid.width + 50) w.x = -w.w;
    if (w.x < -w.w - 50) w.x = grid.width;
    if (w.y > grid.height + 50) w.y = -w.h;
    if (w.y < -w.h - 50) w.y = grid.height;

    // Jitter
    let jx = (Math.random() - 0.5) * 4;
    let jy = (Math.random() - 0.5) * 4;

    ctx.translate(w.x + jx, w.y + jy);
    
    // Window Body (Win95 Grey)
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(0, 0, w.w, w.h);
    
    // Window Title Bar (Deep Blue or Glitch Color)
    ctx.fillStyle = Math.random() < 0.1 ? w.color : '#000080';
    ctx.fillRect(2, 2, w.w - 4, 18);
    
    // Title Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px monospace';
    ctx.fillText("error.exe", 5, 14);
    
    // Content Text (Acid / Neon)
    ctx.fillStyle = w.color;
    ctx.font = '14px monospace';
    ctx.fillText(w.msg, 10, 40);
    
    // Glitch block over window
    if (Math.random() < 0.2) {
        ctx.fillStyle = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        ctx.fillRect(Math.random() * w.w, Math.random() * w.h, 40, 10);
    }
    
    ctx.translate(-(w.x + jx), -(w.y + jy));
});
ctx.restore();

// 5. VHS TRACKING & CHROMATIC TEARS (Analog Artifacts)
ctx.save();
ctx.globalCompositeOperation = 'screen';
for (let i = 0; i < 3; i++) {
    if (Math.random() < 0.4) {
        let ty = Math.random() * grid.height;
        let th = Math.random() * 8 + 2;
        ctx.fillStyle = PALETTE[Math.floor(Math.random() * 3)]; // Pink, Cyan, or Lime
        ctx.globalAlpha = Math.random() * 0.8;
        ctx.fillRect(0, ty, grid.width, th);
    }
}
ctx.restore();

// 6. MYSPACE GLITTER / STARBURSTS (Plush Candy Worlds)
// Spawn new sparkles
if (Math.random() < 0.5) {
    state.sparkles.push({
        x: Math.random() * grid.width,
        y: Math.random() * grid.height,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.05,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        size: 10 + Math.random() * 30
    });
}

ctx.save();
ctx.globalCompositeOperation = 'lighter';
for (let i = state.sparkles.length - 1; i >= 0; i--) {
    let s = state.sparkles[i];
    s.life -= s.decay;
    if (s.life <= 0) {
        state.sparkles.splice(i, 1);
        continue;
    }

    ctx.translate(s.x, s.y);
    ctx.rotate(time * 2);
    ctx.globalAlpha = s.life;
    ctx.fillStyle = s.color;
    
    // Draw 4-point starburst
    ctx.beginPath();
    ctx.moveTo(0, -s.size);
    ctx.quadraticCurveTo(s.size*0.1, -s.size*0.1, s.size, 0);
    ctx.quadraticCurveTo(s.size*0.1, s.size*0.1, 0, s.size);
    ctx.quadraticCurveTo(-s.size*0.1, s.size*0.1, -s.size, 0);
    ctx.quadraticCurveTo(-s.size*0.1, -s.size*0.1, 0, -s.size);
    ctx.fill();
    
    // Inner white core
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, s.size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(-time * 2);
    ctx.translate(-s.x, -s.y);
}
ctx.restore();

// 7. FOSSILIZE STATE (Save to offscreen for next frame's feedback)
state.octx.globalCompositeOperation = 'copy';
state.octx.drawImage(canvas, 0, 0);