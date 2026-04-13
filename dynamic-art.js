// Initialization & State Persistence
if (!canvas.__lf_state) {
    canvas.__lf_state = {
        glitchIntensity: 0.1,
        sparkles: Array.from({length: 60}, () => ({
            x: Math.random() * grid.width,
            y: Math.random() * grid.height,
            size: Math.random() * 8 + 2,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 3 + 1,
            color: ['#FF0080', '#00FFFF', '#FFFF00', '#8A2BE2', '#FF1493'][Math.floor(Math.random() * 5)]
        })),
        leopardSpots: Array.from({length: 35}, () => ({
            x: Math.random() * grid.width,
            y: Math.random() * grid.height,
            r: Math.random() * 30 + 15,
            phase: Math.random() * Math.PI * 2
        }))
    };
}
const state = canvas.__lf_state;

// 1. Audio/Transient Emulation (Glitch Intensity Smoothing)
const isRupture = mouse.isPressed || (Math.sin(time * 2.7) > 0.95);
const targetGlitch = isRupture ? 1.5 : (Math.sin(time * 1.3) > 0.8 ? 0.5 : 0.1);
state.glitchIntensity += (targetGlitch - state.glitchIntensity) * 0.15;
const glitch = state.glitchIntensity;

// 2. Feedback Loop & Temporal Echo (Ghost-Frame Body)
if (glitch > 0.3) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(grid.width / 2, grid.height / 2);
    ctx.scale(1.0 + glitch * 0.015, 1.0 + glitch * 0.015);
    ctx.rotate(glitch * 0.002);
    ctx.translate(-grid.width / 2, -grid.height / 2);
    try {
        ctx.drawImage(canvas, 0, 0);
    } catch(e) {}
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// 3. Macroblock Breakup (Candy Crash Compression)
if (glitch > 0.2 && Math.random() < glitch) {
    for (let i = 0; i < Math.floor(glitch * 6); i++) {
        const bw = Math.random() * 200 + 50;
        const bh = Math.random() * 60 + 10;
        const bx = Math.random() * grid.width;
        const by = Math.random() * grid.height;
        
        const sx = bx + (Math.random() - 0.5) * 150 * glitch;
        const sy = by + (Math.random() - 0.5) * 50 * glitch;
        
        try {
            if (bw > 0 && bh > 0) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(canvas, bx, by, bw, bh, sx, sy, bw, bh);
            }
        } catch(e) {}
    }
}

// 4. Temporal Echo Fade (Dark Void Overlay)
ctx.globalCompositeOperation = 'source-over';
ctx.fillStyle = `rgba(10, 0, 20, ${Math.max(0.05, 0.2 - glitch * 0.1)})`; 
ctx.fillRect(0, 0, grid.width, grid.height);

// 5. Lisa Frank Leopard Spots
ctx.globalCompositeOperation = 'screen';
state.leopardSpots.forEach((spot, i) => {
    spot.y += Math.sin(time * 0.5 + spot.phase) * 0.5;
    spot.x += Math.cos(time * 0.3 + spot.phase) * 0.5;
    if (spot.y > grid.height + spot.r) spot.y = -spot.r;
    if (spot.x > grid.width + spot.r) spot.x = -spot.r;
    
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 1.5);
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 0, 128, 0.4)' : 'rgba(138, 43, 226, 0.4)'; // Hot Pink / Violet
    ctx.lineWidth = 8;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(spot.x + spot.r * 0.2, spot.y + spot.r * 0.2, spot.r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 255, 0, 0.3)'; // Cyan / Yellow
    ctx.fill();
});

// 6. Quasicrystal Pentagrid (Candy Broadcast Hallucination + RGB Phantom)
ctx.globalCompositeOperation = 'lighter';
const N = 5; // 5-fold Penrose symmetry
const center = { x: grid.width / 2, y: grid.height / 2 };
const baseAngle = time * 0.05;
const maxD = Math.max(grid.width, grid.height) * 1.2;
const spacing = 50 + Math.sin(time * 0.5) * 15;

ctx.globalAlpha = 0.7;
for (let i = 0; i < N; i++) {
    const angle = baseAngle + i * Math.PI / N;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const phase = time * 30 + i * 20;
    
    for (let d = -maxD; d <= maxD; d += spacing) {
        const actualD = d + (phase % spacing);
        
        // RGB Displacement Logic
        const channels = [
            { color: '#FF0080', offset: glitch * 25 * Math.sin(time * 6 + i) },   // Magenta
            { color: '#00FFFF', offset: glitch * -25 * Math.cos(time * 5 - i) },  // Cyan
            { color: '#FFFF00', offset: glitch * 12 * Math.sin(time * 7 + d) }    // Yellow
        ];
        
        channels.forEach(ch => {
            const shiftD = actualD + ch.offset;
            const bx = center.x + shiftD * dx;
            const by = center.y + shiftD * dy;
            
            const lx1 = bx - maxD * dy;
            const ly1 = by + maxD * dx;
            const lx2 = bx + maxD * dy;
            const ly2 = by - maxD * dx;
            
            ctx.beginPath();
            ctx.moveTo(lx1, ly1);
            ctx.lineTo(lx2, ly2);
            ctx.strokeStyle = ch.color;
            ctx.lineWidth = 1.5 + glitch * 1.5;
            ctx.stroke();
        });
    }
}
ctx.globalAlpha = 1.0;

// 7. Sparkle Static (Lisa Frank Stars)
ctx.globalCompositeOperation = 'source-over';
state.sparkles.forEach(s => {
    s.y -= s.speed + glitch * 8;
    s.x += Math.sin(s.phase + time) * 3;
    if (s.y < -s.size) s.y = grid.height + s.size;
    if (s.x < -s.size) s.x = grid.width + s.size;
    if (s.x > grid.width + s.size) s.x = -s.size;
    
    s.phase += 0.1 + glitch * 0.3;
    
    ctx.fillStyle = s.color;
    ctx.globalAlpha = (Math.sin(s.phase) + 1) / 2;
    
    // Draw 4-pointed star
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - s.size);
    ctx.quadraticCurveTo(s.x, s.y, s.x + s.size, s.y);
    ctx.quadraticCurveTo(s.x, s.y, s.x, s.y + s.size);
    ctx.quadraticCurveTo(s.x, s.y, s.x - s.size, s.y);
    ctx.quadraticCurveTo(s.x, s.y, s.x, s.y - s.size);
    ctx.fill();
});
ctx.globalAlpha = 1.0;

// 8. Text-Screen Heartbreak (Terminal Residue)
ctx.font = 'bold 18px monospace';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
const phrases = [
    "seductive signal damage",
    "synthetic euphoria",
    "candy broadcast hallucination",
    "typing...",
    "user not found",
    "rainbow channel crash",
    "fatal error: cute",
    "pastel identity smear",
    "bratty file damage"
];

for (let i = 0; i < 4; i++) {
    const pIdx = Math.floor(time * 0.5 + i * 2.3) % phrases.length;
    const textStr = phrases[pIdx];
    
    // Jittery floating position
    const tx = (Math.sin(time * 0.4 + i) * 0.4 + 0.5) * grid.width + (Math.random() - 0.5) * glitch * 30;
    const ty = (Math.cos(time * 0.3 - i) * 0.4 + 0.5) * grid.height + (Math.random() - 0.5) * glitch * 30;
    
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#FF0080';
    ctx.fillText(textStr, tx - glitch * 10, ty);
    ctx.fillStyle = '#00FFFF';
    ctx.fillText(textStr, tx + glitch * 10, ty);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(textStr, tx, ty);
}

// 9. Surveillance Apparition (Mouse Tracker)
ctx.globalCompositeOperation = 'source-over';
ctx.strokeStyle = '#00FFFF';
ctx.lineWidth = 1.5;
ctx.setLineDash([4, 4]);
ctx.strokeRect(mouse.x - 25, mouse.y - 25, 50, 50);
ctx.setLineDash([]);
ctx.fillStyle = '#FF0080';
ctx.font = '12px monospace';
ctx.textAlign = 'left';
ctx.fillText(`TRK_X:${Math.floor(mouse.x)}_Y:${Math.floor(mouse.y)}`, mouse.x + 30, mouse.y - 20);
if (isRupture) {
    ctx.fillStyle = '#FFFF00';
    ctx.fillText(`*RUPTURE_POP*`, mouse.x + 30, mouse.y - 5);
}

// 10. CRT Contour Banding (Scanlines)
ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
for (let y = 0; y < grid.height; y += 4) {
    ctx.fillRect(0, y, grid.width, 2);
}

// 11. Color Field Collision (Extreme Glitch Flash)
if (glitch > 1.2 && Math.random() < 0.15) {
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = ['#FF0080', '#00FFFF', '#FFFF00'][Math.floor(Math.random() * 3)];
    ctx.globalAlpha = 0.25;
    ctx.fillRect(0, 0, grid.width, grid.height);
    ctx.globalAlpha = 1.0;
}