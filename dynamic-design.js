const w = canvas.width;
const h = canvas.height;
const cx = w / 2;
const cy = h / 2;
const mx = mouse.x || cx;
const my = mouse.y || cy;

// [SHOEGAZE / DREAM PHYSICS] - Memory Leak Feedback Loop
// Instead of clearing the canvas, we smear it out, scale it, and rotate it slightly
// to create an overdriven, hazy memory effect.
ctx.globalCompositeOperation = 'source-over';
ctx.fillStyle = `rgba(8, 4, 12, ${0.04 + Math.abs(Math.sin(time * 0.5)) * 0.04})`;
ctx.fillRect(0, 0, w, h);

ctx.save();
ctx.translate(cx, cy);
// Anisotropic scaling (breathing differently on X and Y)
const scaleX = 1.01 + Math.sin(time * 0.8) * 0.005;
const scaleY = 1.01 + Math.cos(time * 0.5) * 0.005;
ctx.scale(scaleX, scaleY);
ctx.rotate(Math.sin(time * 0.2) * 0.01);
ctx.translate(-cx, -cy);
ctx.globalAlpha = 0.85;
ctx.drawImage(canvas, 0, 0);
ctx.restore();

ctx.globalAlpha = 1.0;

// [OP-ART / MATH TAXONOMY] - Phase Fields & Radial Hypnosis
// We draw two sets of concentric, undulating rings. 
// Using 'difference' blending creates intense optical Moire interference.
ctx.globalCompositeOperation = 'difference';

const drawMoireParasite = (offsetX, offsetY, ringCount, speedMod, colorFreq) => {
    for (let i = 1; i <= ringCount; i++) {
        // The rings expand outward and wrap around
        const radius = (time * 60 * speedMod + i * 35) % (w * 0.7);
        const thickness = 2 + Math.pow(Math.sin(i * 0.3 - time * 2), 2) * 15;
        
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2.01; a += 0.05) {
            // Dream Physics: Anisotropic distortion applied to the circle math
            const noise = Math.sin(a * 5 + time * speedMod) * Math.cos(a * 11 - time) * (10 + i);
            
            // Mouse acts as a paradox engine, warping the field gravity
            const distToMouse = Math.hypot(mx - offsetX, my - offsetY);
            const gravity = mouse.isPressed ? Math.max(0, 300 - distToMouse) * 0.2 : 0;
            
            let dx = offsetX + Math.cos(a) * (radius + noise);
            let dy = offsetY + Math.sin(a) * (radius + noise);
            
            // Warp towards mouse if pressed
            if (gravity > 0) {
                dx += (mx - dx) * (gravity / 300);
                dy += (my - dy) * (gravity / 300);
            }

            if (a === 0) ctx.moveTo(dx, dy);
            else ctx.lineTo(dx, dy);
        }
        ctx.closePath();
        
        // Glitchcore palette injection: mostly high-contrast, occasional neon bursts
        if (i % colorFreq === 0) {
            ctx.strokeStyle = `hsl(${(time * 150 + i * 25) % 360}, 90%, 60%)`;
        } else {
            ctx.strokeStyle = '#FFFFFF';
        }
        
        ctx.lineWidth = Math.max(0.5, thickness);
        ctx.stroke();
    }
};

// Draw primary anatomical mapping center
drawMoireParasite(cx, cy, 18, 1.0, 4);

// Draw secondary phase field (creates the Moire illusion)
const phaseX = cx + Math.sin(time * 1.3) * w * 0.15;
const phaseY = cy + Math.cos(time * 0.9) * h * 0.15;
drawMoireParasite(phaseX, phaseY, 12, 0.85, 5);


// [GLITCHCORE] - Codec Corruption & Signal Density
ctx.globalCompositeOperation = 'source-over';

// Horizontal tearing
if (Math.random() > 0.75) {
    const sliceY = Math.random() * h;
    const sliceH = Math.random() * 80 + 5;
    const shiftX = (Math.random() - 0.5) * 150;
    
    // Physical pixel displacement
    ctx.drawImage(canvas, 0, sliceY, w, sliceH, shiftX, sliceY, w, sliceH);
    
    // Color space inversion in the glitch zone
    if (Math.random() > 0.6) {
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(shiftX, sliceY, w, sliceH);
        ctx.globalCompositeOperation = 'source-over';
    }
}

// Systemic False Memory (Screen flash)
if (Math.random() > 0.98) {
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
}

// [THE-LISTS] - Broken Taxonomy Data Spillage
const artifacts = [
    "phenomena/sensory-distortions.md",
    "math-taxonomy-files/anisotropic_fields",
    "02_PURE_OPTICAL_SYSTEMS/moire_and_phase_fields.md",
    "core/codec-corruption.md",
    "lexicon/palette.json",
    "chaos_p10_01_paradox_engines.json",
    "ERR: MYTHIC_ATTRACTOR_OVERFLOW"
];

ctx.font = "11px monospace";
if (Math.random() > 0.6) {
    const txt = artifacts[Math.floor(Math.random() * artifacts.length)];
    const tx = Math.random() * w;
    const ty = Math.random() * h;
    
    // Chromatic aberration text rendering
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.fillText(txt, tx - 2, ty);
    
    ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
    ctx.fillText(txt, tx + 2, ty);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(txt, tx, ty);
}