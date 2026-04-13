const cx = grid.width / 2;
const cy = grid.height / 2;
const R = Math.hypot(cx, cy);

const mouseNormX = (mouse.x || cx) / grid.width;
const mouseNormY = (mouse.y || cy) / grid.height;

// Calculate glitch density / intensity
let glitchIntensity = 0.2 + 0.3 * Math.sin(time * 2.0) * Math.sin(time * 3.14);
if (mouse.isPressed) {
    glitchIntensity = 1.0;
} else {
    const distToCenter = Math.hypot((mouse.x || cx) - cx, (mouse.y || cy) - cy);
    const centerFactor = Math.max(0, 1.0 - distToCenter / (grid.width / 2));
    glitchIntensity += 0.5 * centerFactor * mouseNormX;
}

// 1. Temporal Echo / Ghost Frame Stack (Feedback Loop)
ctx.save();
ctx.translate(cx, cy);
const scale = 1.0 + 0.015 * glitchIntensity;
ctx.scale(scale, scale);
ctx.rotate(0.005 * glitchIntensity * Math.sin(time * 0.5));
ctx.translate(-cx, -cy);
ctx.globalAlpha = 0.9;
ctx.globalCompositeOperation = 'source-over';
try {
    ctx.drawImage(grid.canvas, 0, 0);
} catch (e) {}
ctx.restore();

// 2. Fade to dark purple (Temporal Persistence Fade)
ctx.globalAlpha = 1.0;
ctx.globalCompositeOperation = 'source-over';
ctx.fillStyle = `rgba(10, 0, 15, 0.15)`;
ctx.fillRect(0, 0, grid.width, grid.height);

// 3. Pentagrid Calculation (Quasicrystal Math)
const phi = 1.6180339887;
const silverRatio = 2.41421356;
const spacing = 35 * phi;
const angles = [0, 1, 2, 3, 4].map(k => k * Math.PI / 5);
const phaseSpeeds = [1, -1, phi, -phi, 0]; // Sum ensures continuous phason flips
const baseSpeed = 40;

const lines = [];
// Lisa Frank Neon Palette + Glitchcore Hyperpop Rupture
const neonColors = ['#FF0080', '#00FFFF', '#FFFF00', '#39FF14', '#8A2BE2'];

for (let k = 0; k < 5; k++) {
    const theta = angles[k];
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const phase = (time * baseSpeed * phaseSpeeds[k]) % spacing;
    
    const nMin = -Math.ceil(R / spacing) - 1;
    const nMax = Math.ceil(R / spacing) + 1;
    
    for (let n = nMin; n <= nMax; n++) {
        const d = n * spacing + phase;
        lines.push({ k, theta, cosT, sinT, d, color: neonColors[k] });
    }
}

// 4. Draw Pentagrid with Channel Split (RGB Phantom)
ctx.globalCompositeOperation = 'screen';
const splitDist = 8 * glitchIntensity + 30 * Math.abs(mouseNormX - 0.5);

ctx.lineWidth = 3 + 2 * Math.sin(time * phi);
lines.forEach(l => {
    // Base Neon Line
    ctx.strokeStyle = l.color;
    ctx.beginPath();
    ctx.moveTo(cx + l.d * l.cosT - R * l.sinT, cy + l.d * l.sinT + R * l.cosT);
    ctx.lineTo(cx + l.d * l.cosT + R * l.sinT, cy + l.d * l.sinT - R * l.cosT);
    ctx.stroke();
});

if (glitchIntensity > 0.05) {
    ctx.lineWidth = 1.5;
    lines.forEach(l => {
        // Cyan Split (Left)
        ctx.strokeStyle = '#00FFFF';
        ctx.beginPath();
        ctx.moveTo(cx + l.d * l.cosT - R * l.sinT - splitDist, cy + l.d * l.sinT + R * l.cosT);
        ctx.lineTo(cx + l.d * l.cosT + R * l.sinT - splitDist, cy + l.d * l.sinT - R * l.cosT);
        ctx.stroke();
        
        // Magenta Split (Right)
        ctx.strokeStyle = '#FF00FF';
        ctx.beginPath();
        ctx.moveTo(cx + l.d * l.cosT - R * l.sinT + splitDist, cy + l.d * l.sinT + R * l.cosT);
        ctx.lineTo(cx + l.d * l.cosT + R * l.sinT + splitDist, cy + l.d * l.sinT - R * l.cosT);
        ctx.stroke();
    });
}

// 5. Calculate Intersections for Sparkles and Hearts
const intersections = [];
for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
        const l1 = lines[i];
        const l2 = lines[j];
        if (l1.k === l2.k) continue; // Parallel lines don't intersect
        
        const D = l1.cosT * l2.sinT - l1.sinT * l2.cosT;
        if (Math.abs(D) < 0.001) continue;
        
        const x = (l1.d * l2.sinT - l2.d * l1.sinT) / D;
        const y = (l1.cosT * l2.d - l2.cosT * l1.d) / D;
        
        const px = cx + x;
        const py = cy + y;
        
        // Only keep visible intersections (+ buffer)
        if (px >= -50 && px <= grid.width + 50 && py >= -50 && py <= grid.height + 50) {
            intersections.push({ x: px, y: py, k1: l1.k, k2: l2.k });
        }
    }
}

// Helper: Lisa Frank Sparkle
function drawSparkle(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.quadraticCurveTo(x, y, x + size, y);
    ctx.quadraticCurveTo(x, y, x, y + size);
    ctx.quadraticCurveTo(x, y, x - size, y);
    ctx.quadraticCurveTo(x, y, x, y - size);
    ctx.fill();
}

// Helper: Lisa Frank Heart
function drawHeart(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(x, y - topCurveHeight);
    ctx.bezierCurveTo(x, y - size, x - size, y - size, x - size, y - topCurveHeight);
    ctx.bezierCurveTo(x - size, y + size * 0.4, x, y + size * 0.8, x, y + size);
    ctx.bezierCurveTo(x, y + size * 0.8, x + size, y + size * 0.4, x + size, y - topCurveHeight);
    ctx.bezierCurveTo(x + size, y - size, x, y - size, x, y - topCurveHeight);
    ctx.fill();
}

// 6. Draw Sparkles and Hearts at Intersections
ctx.globalCompositeOperation = 'screen';
intersections.forEach((p, index) => {
    const hash = (p.k1 * 7 + p.k2 * 13 + index) % 100;
    // Phason ripple creates oscillating sparkles
    const s = Math.sin(p.x * 0.015 - p.y * 0.015 + time * 2 + hash * 0.1);
    
    if (s > 0.8) {
        const size = (s - 0.8) * 80; 
        const hue = (hash * 13 + time * 50) % 360;
        const color = `hsl(${hue}, 100%, 60%)`;
        
        if (hash % 3 === 0) {
            drawHeart(ctx, p.x, p.y, size, color);
        } else {
            drawSparkle(ctx, p.x, p.y, size * 1.5, color);
        }
    }
});

// 7. Diffraction Pattern (Bragg Peaks in Center)
const diffRadius = 120 + 30 * Math.sin(time * phi);
for (let k = 0; k < 10; k++) {
    const angle = k * Math.PI / 5 + time * 0.2;
    const dx = Math.cos(angle) * diffRadius;
    const dy = Math.sin(angle) * diffRadius;
    
    const spotSize = 4 + 2 * Math.sin(time * 5 + k);
    drawSparkle(ctx, cx + dx, cy + dy, spotSize * 3, '#FFFFFF');
    drawSparkle(ctx, cx + dx, cy + dy, spotSize * 1.5, '#FF00FF');
    
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dx, cy + dy);
    ctx.strokeStyle = `hsla(${k * 36}, 100%, 60%, 0.4)`;
    ctx.lineWidth = 1;
    ctx.stroke();
}

// 8. Compression Chew / Macroblock Breakup
ctx.globalCompositeOperation = 'source-over';
if (glitchIntensity > 0.3) {
    const blockCount = Math.floor(15 * glitchIntensity);
    for (let i = 0; i < blockCount; i++) {
        const sizeOptions = [16, 32, 64, 128 * glitchIntensity];
        const bw = sizeOptions[Math.floor(Math.random() * sizeOptions.length)];
        const bh = sizeOptions[Math.floor(Math.random() * sizeOptions.length)];
        
        const bx = Math.max(0, Math.floor(Math.random() * (grid.width - bw)));
        const by = Math.max(0, Math.floor(Math.random() * (grid.height - bh)));
        
        const shiftX = Math.floor((Math.random() - 0.5) * 80 * glitchIntensity);
        const shiftY = Math.floor((Math.random() - 0.5) * 80 * glitchIntensity);
        
        try {
            ctx.drawImage(grid.canvas, bx, by, bw, bh, bx + shiftX, by + shiftY, bw, bh);
            
            // Chroma Smear Tinting
            if (Math.random() < 0.4) {
                ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0, 255, 255, 0.25)' : 'rgba(255, 0, 255, 0.25)';
                ctx.globalCompositeOperation = 'screen';
                ctx.fillRect(bx + shiftX, by + shiftY, bw, bh);
                ctx.globalCompositeOperation = 'source-over';
            }
        } catch(e) {}
    }
}

// 9. Text-Screen Heartbreak / Terminal Residue
ctx.font = 'bold 16px monospace';
const phrases = [
    "seductive signal damage",
    "CANDY_BROADCAST_HALLUCINATION",
    "golden ratio \u03C6 = 1.618033...",
    "> connection lost",
    "pure point diffraction spectrum",
    "typing...",
    "LISA_FRANK_AESTHETIC.exe",
    "phason flip detected",
    "macroblock_breakup()",
    "RGB_PHANTOM",
    "silver ratio \u03B4 = 2.414213..."
];

const textCount = Math.floor(glitchIntensity * 5);
for (let i = 0; i < textCount; i++) {
    const txt = phrases[Math.floor(Math.random() * phrases.length)];
    const tx = Math.random() * grid.width;
    const ty = Math.random() * grid.height;
    
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = '#00FFFF';
    ctx.fillText(txt, tx - 2, ty);
    ctx.fillStyle = '#FF00FF';
    ctx.fillText(txt, tx + 2, ty);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(txt, tx, ty);
}

// Surveillance Apparition UI
ctx.globalCompositeOperation = 'source-over';
ctx.fillStyle = '#FF0080';
if (Math.sin(time * 6) > 0) {
    ctx.fillText("● REC", 20, 30);
}
ctx.fillStyle = '#00FFFF';
const timeStr = new Date(time * 1000).toISOString().substr(11, 8) + ":" + Math.floor((time % 1) * 100).toString().padStart(2, '0');
ctx.fillText(`QC-FRQ: ${(phi * 1000).toFixed(2)}Hz | ${timeStr}`, 20, 50);

// 10. CRT Contour Banding / Scanlines
ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
const scanlineOffset = (time * 15) % 4;
for (let y = -4; y < grid.height; y += 4) {
    ctx.fillRect(0, y + scanlineOffset, grid.width, 1.5);
}