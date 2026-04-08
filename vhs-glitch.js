const terms = [
    "BROADCAST_SIGNAL_FAILURE", "CHROMA_LUMA_FAILURES", 
    "ARTIFACT_STACK_LOGIC", "AUTHENTICITY_VS_SIMULATION",
    "DEAD_WEB_NOSTALGIA", "CURSED_SHITPOST", "ANTI_DRIFT",
    "PALETTE_ENERGY_SYSTEM", "CODEC_CORRUPTION", "GLITCHCORE",
    "SHOEGAZE_NOISE", "MAGNETIC_DECAY", "OXIDE_SHEDDING",
    "SIGNAL_DENSITY", "V_HOLD_LOSS"
];
const signalString = terms.join(" /// ") + " /// ";

const fontSize = 16;
ctx.font = `bold ${fontSize}px monospace`;
ctx.textBaseline = 'top';

ctx.fillStyle = `rgba(4, 5, 4, 0.25)`; 
ctx.fillRect(0, 0, canvas.width, canvas.height);

const tapeSpeed = 12; 
const yRoll = Math.floor(time * tapeSpeed); 

const trackY = (time * 150) % (canvas.height * 1.5) - (canvas.height * 0.25);
const trackH = 90 + Math.sin(time * 5) * 50;

const tension = Math.pow((time % 3) / 3, 4); 
const globalJitter = Math.random() > 0.85 ? (Math.random() - 0.5) * 6 : 0;

const charWidth = ctx.measureText("M").width;
const charsPerRow = Math.ceil(canvas.width / charWidth) + 15;

for (let y = 0; y < canvas.height; y += fontSize) {
    let logicalY = y + yRoll * fontSize;
    let rowIdxOffset = Math.floor(logicalY / fontSize) * 17; 
    
    let rowStr = "";
    for(let i = 0; i < charsPerRow; i++) {
        let idx = Math.abs(rowIdxOffset + i) % signalString.length;
        rowStr += signalString[idx];
    }
    
    let dx = globalJitter;
    let dy = y;
    let isTrack = Math.abs(y - trackY) < trackH;
    
    if (isTrack) {
        let tearIntensity = 1 - (Math.abs(y - trackY) / trackH);
        dx += (Math.random() - 0.5) * 40 * tearIntensity;
        if (Math.random() > 0.6) dx += 60 * tearIntensity * (Math.random() > 0.5 ? 1 : -1);
    } else {
        dx += Math.sin(y * 0.03 + time * 4) * 5 * tension;
    }
    
    let dist = Math.hypot(mouse.x - canvas.width/2, mouse.y - y);
    if (dist < 300) {
        let pull = (300 - dist) * 0.12;
        dx += pull * (mouse.isPressed ? 4 : 1) * Math.sin(y * 0.08 - time * 25);
        dy += (Math.random() - 0.5) * pull * 0.15; 
    }
    
    ctx.globalCompositeOperation = 'screen';
    
    let rShift = isTrack ? Math.random() * 18 + 6 : 3 + Math.sin(time * 12) * 2;
    ctx.fillStyle = '#ff1133';
    ctx.fillText(rowStr, dx - rShift, dy);
    
    ctx.fillStyle = '#22ff55';
    ctx.fillText(rowStr, dx, dy);
    
    let bShift = isTrack ? Math.random() * -22 - 6 : -3 - Math.cos(time * 14) * 2;
    ctx.fillStyle = '#1144ff';
    ctx.fillText(rowStr, dx - bShift, dy);
    
    ctx.globalCompositeOperation = 'source-over';
    
    if (Math.random() > 0.93) {
        ctx.fillStyle = '#020202';
        let flakeX = Math.random() * canvas.width;
        let flakeW = Math.random() * 200 + 30;
        ctx.fillRect(flakeX, dy, flakeW, fontSize);
    }
}

if (Math.random() > 0.97) {
    ctx.fillStyle = 'rgba(220, 230, 255, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, Math.random() * canvas.height, canvas.width, Math.random() * 5 + 1);
}