const w = canvas.width;
const h = canvas.height;
const cx = w / 2;
const cy = h / 2;

// REPO 2 & 3: SHOEGAZE STYLE + DREAM PHYSICS (Memory Blur & Narrative Glitches)
// Base layer degradation (Feedback loop)
ctx.globalCompositeOperation = 'source-over';
ctx.fillStyle = `rgba(5, 2, 10, 0.08)`;
ctx.fillRect(0, 0, w, h);

ctx.save();
ctx.translate(cx, cy);
// Dream physics: Identity shift scaling & sensory distortion rotation
const breathe = 1.005 + Math.sin(time * 0.73) * 0.015;
const vertigo = Math.cos(time * 0.41) * 0.008;
ctx.scale(breathe, breathe);
ctx.rotate(vertigo);
ctx.translate(-cx, -cy);

// The mouse acts as a "mythic attractor" pulling the feedback
const pullX = (mouse.x - cx) * 0.015;
const pullY = (mouse.y - cy) * 0.015;

ctx.globalAlpha = 0.88;
ctx.globalCompositeOperation = 'lighten';
ctx.drawImage(canvas, pullX, pullY);
ctx.restore();

// REPO 1: OP_ART_STYLE (Chromatic Interference & Moire Phase Fields)
ctx.globalAlpha = 1.0;
ctx.globalCompositeOperation = 'difference';

const drawAnisotropicMoire = (angle, spacing, color, warpPhase) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = spacing * 0.4;
    
    ctx.beginPath();
    const span = Math.max(w, h) * 1.5;
    for(let i = -span; i < span; i += spacing) {
        // REPO 5: THE-LISTS (Anti-baby math / paradox engines)
        // Injecting non-linear tangents into retinal space
        const chaosWarp = Math.tan(i * 0.005 + warpPhase) * 15;
        const smoothWarp = Math.sin(i * 0.02 - time * 2) * 30;
        
        ctx.moveTo(-span, i + chaosWarp);
        // Funnel tunnel lens bending
        for(let j = -span; j < span; j += 100) {
            const localWarp = Math.sin((j + i) * 0.01 + time) * 20;
            ctx.lineTo(j, i + smoothWarp + localWarp);
        }
        ctx.lineTo(span, i + chaosWarp);
    }
    ctx.stroke();
    ctx.restore();
};

// Rendering the 3 pillars of chromatic interference
const moireTension = mouse.isPressed ? 3 : 1;
drawAnisotropicMoire(time * 0.1, 18 + Math.sin(time) * 4, '#FF0055', time * 0.5);
drawAnisotropicMoire(-time * 0.15 + (mouse.x / w), 20 + Math.cos(time * 1.2) * 5, '#00FFFF', -time * 0.3);
drawAnisotropicMoire(time * 0.05 + Math.PI/4, 22, '#FFFF00', time * moireTension);

// REPO 4: GLITCHCORE_STYLE (Codec Corruption & Artifact Drivers)
ctx.globalCompositeOperation = 'source-over';
if (Math.random() > 0.65) {
    const sliceY = Math.random() * h;
    // Signal density system dictates slice height
    const sliceH = Math.random() * (h / 5) + 5; 
    // Hybridization rules: mouse proximity forces wider tears
    const tension = mouse.isPressed ? 300 : 80;
    const shiftX = (Math.random() - 0.5) * tension;
    
    ctx.drawImage(
        canvas, 
        0, sliceY, w, sliceH, 
        shiftX, sliceY, w, sliceH
    );
    
    // Palette energy system: dead pixel burn lines
    if (Math.random() > 0.5) {
        ctx.fillStyle = Math.random() > 0.5 ? '#FF0055' : '#00FFFF';
        ctx.fillRect(0, sliceY + sliceH / 2, w, Math.random() * 4);
    }
}

// REPO 5: THE-LISTS (Custom Myth Math / Symbolic Coincidence Fields)
// Emitting raw ASCII signal based on mathematical thresholds
const asciiGrid = [];
const glitchTokens = ['░', '▒', '▓', '█', '┼', '╪', '╫', '╬', '═', '║', '!', '?', 'Ø', '×', '§', '¶'];

for (let r = 0; r < grid.rows; r++) {
    const row = [];
    for (let c = 0; c < grid.cols; c++) {
        const px = (c / grid.cols) * w;
        const py = (r / grid.rows) * h;
        const distToMouse = Math.hypot(px - mouse.x, py - mouse.y);
        
        // Symbolic coincidence equation
        const coincidence = Math.sin(px * 0.03 + time) * Math.cos(py * 0.04 - time * 1.5) * 100;
        
        if (mouse.isPressed && distToMouse < 120) {
            // Identity shift singularity at cursor
            const char = glitchTokens[Math.floor(Math.random() * glitchTokens.length)];
            row.push({ char, color: Math.random() > 0.5 ? '#FFFFFF' : '#FF0055' });
        } else if (Math.abs(coincidence) > 98) {
            // Mythic attractors breaching the grid
            const char = glitchTokens[Math.floor(Math.random() * glitchTokens.length)];
            row.push({ char, color: '#00FFFF' });
        } else if (Math.random() > 0.998) {
            // Rare anomalous dream types (stray static)
            row.push({ char: Math.random() > 0.5 ? '1' : '0', color: '#FFFF00' });
        } else {
            row.push('');
        }
    }
    asciiGrid.push(row);
}

return asciiGrid;