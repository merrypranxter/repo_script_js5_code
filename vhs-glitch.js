if (!canvas._ws) {
    canvas._ws = {
        terms: [
            "CHROMA_LUMA_FAILURES", "AUTHENTICITY_VS_SIMULATION", 
            "CAUSALITY_VS_DECORATION", "BROADCAST_SIGNAL_FAILURE", 
            "ARTIFACT_STACK_LOGIC", "MEDIUM_SPECIFICITY", 
            "CODEC_CORRUPTION", "SIGNAL_DENSITY", "DEAD_WEB_NOSTALGIA", 
            "CURSED_SHITPOST", "ANONYMOUS_DIGITAL_FOLK", "SHOEGAZE", 
            "ANTI_DRIFT", "TRACKING_ERROR", "HELICAL_SCAN", "MACROBLOCK_DECAY"
        ],
        lines: Array.from({length: 55}, () => ({
            x: Math.random() * grid.width,
            y: Math.random() * grid.height,
            term: "",
            speed: (Math.random() - 0.5) * 7,
            size: 14 + Math.pow(Math.random(), 3) * 140,
            font: Math.random() > 0.6 ? 'Georgia, serif' : '"Courier New", monospace',
            chromaCol: `hsl(${Math.random()*360}, 100%, 55%)`,
            chromaOffset: (Math.random() - 0.5) * 40,
            vertical: Math.random() > 0.85
        }))
    };
    canvas._ws.lines.forEach(l => l.term = canvas._ws.terms[Math.floor(Math.random() * canvas._ws.terms.length)]);
    canvas._offscreen = document.createElement('canvas');
}

const ws = canvas._ws;
const w = grid.width;
const h = grid.height;

if (canvas._offscreen.width !== w || canvas._offscreen.height !== h) {
    canvas._offscreen.width = w;
    canvas._offscreen.height = h;
}
const octx = canvas._offscreen.getContext('2d');

octx.fillStyle = '#040506';
octx.fillRect(0, 0, w, h);

octx.filter = 'blur(60px)';
octx.globalCompositeOperation = 'screen';
for (let i = 0; i < 4; i++) {
    const bx = w/2 + Math.sin(time * 0.15 + i * 2.1) * w * 0.4;
    const by = h/2 + Math.cos(time * 0.22 + i * 1.7) * h * 0.4;
    octx.fillStyle = `hsla(${260 + i * 80}, 70%, 25%, 0.6)`;
    octx.beginPath();
    octx.arc(bx, by, 400, 0, Math.PI * 2);
    octx.fill();
}
octx.globalCompositeOperation = 'source-over';

octx.textBaseline = 'middle';
octx.textAlign = 'center';
const lumaGlobal = 0.6 + Math.random() * 0.4;

ws.lines.forEach(l => {
    if (l.vertical) {
        l.x += l.speed;
        if (l.x > w + 300) l.x = -300;
        if (l.x < -300) l.x = w + 300;
    } else {
        l.y += l.speed;
        if (l.y > h + 300) l.y = -300;
        if (l.y < -300) l.y = h + 300;
    }
    if (Math.random() < 0.005) {
        l.term = ws.terms[Math.floor(Math.random() * ws.terms.length)];
        l.chromaOffset = (Math.random() - 0.5) * 50;
    }
});

octx.filter = 'blur(8px)';
ws.lines.forEach((l, i) => {
    octx.save();
    octx.translate(l.x, l.y);
    if (l.vertical) octx.rotate(-Math.PI / 2);
    octx.font = `bold ${l.size}px ${l.font}`;
    octx.fillStyle = l.chromaCol;
    octx.fillText(l.term, l.chromaOffset + Math.sin(time*12 + i)*6, 0);
    octx.restore();
});

octx.filter = 'none';
const lumaVal = Math.min(255, Math.floor(255 * lumaGlobal * (0.3 + Math.random()*0.7)));
octx.fillStyle = `rgb(${lumaVal}, ${lumaVal}, ${lumaVal})`;
ws.lines.forEach((l) => {
    octx.save();
    octx.translate(l.x, l.y);
    if (l.vertical) octx.rotate(-Math.PI / 2);
    octx.font = `bold ${l.size}px ${l.font}`;
    octx.fillText(l.term, 0, 0);
    octx.restore();
});

if (Math.random() < 0.35) {
    const blocks = Math.floor(Math.random() * 15);
    for (let i=0; i<blocks; i++) {
        const bx = Math.floor(Math.random() * w);
        const by = Math.floor(Math.random() * h);
        const bw = 32 + Math.floor(Math.random() * 6) * 32;
        const bh = 32 + Math.floor(Math.random() * 6) * 32;
        const shiftX = Math.floor((Math.random() - 0.5) * 8) * 32;
        
        if (Math.random() < 0.15) {
            octx.globalCompositeOperation = 'difference';
            octx.fillStyle = '#ffffff';
            octx.fillRect(bx + shiftX, by, bw, bh);
            octx.globalCompositeOperation = 'source-over';
        } else {
            octx.drawImage(canvas._offscreen, bx, by, bw, bh, bx + shiftX, by, bw, bh);
        }
    }
}

ctx.fillStyle = '#000';
ctx.fillRect(0, 0, w, h);

const trackingY = (time * 220) % h;
const trackingIntensity = Math.sin(time * 4) * 70 + 50;

let currentY = 0;
while (currentY < h) {
    let sliceH = Math.floor(2 + Math.random() * 7);
    if (currentY + sliceH > h) sliceH = h - currentY;
    
    let shiftX = 0;
    const distToRoll = Math.abs(currentY - trackingY);
    const distToBottom = Math.abs(currentY - h);
    
    let intensity = 0;
    if (distToRoll < 250) intensity = Math.max(intensity, 1 - (distToRoll / 250));
    if (distToBottom < 150) intensity = Math.max(intensity, 1 - (distToBottom / 150));
    
    if (intensity > 0) {
        shiftX = (Math.random() - 0.5) * trackingIntensity * intensity * 2.5;
        if (Math.random() < intensity * 0.12) {
            ctx.fillStyle = Math.random() > 0.5 ? '#d0d0d0' : (Math.random() > 0.5 ? '#ff00aa' : '#00ffaa');
            ctx.fillRect(0, currentY, w, sliceH);
            currentY += sliceH;
            continue;
        }
    }
    
    if (mouse.isPressed) {
        const mDist = Math.abs(currentY - mouse.y);
        if (mDist < 180) {
            shiftX += (Math.random() - 0.5) * (180 - mDist) * 1.5;
            if (Math.random() < 0.08) {
                ctx.globalCompositeOperation = 'difference';
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, currentY, w, sliceH);
                ctx.globalCompositeOperation = 'source-over';
            }
        }
    }

    if (Math.random() < 0.1) shiftX += (Math.random() - 0.5) * 12;

    ctx.drawImage(canvas._offscreen, 0, currentY, w, sliceH, shiftX, currentY, w, sliceH);
    currentY += sliceH;
}

ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
}
for (let y = 0; y < h; y += 15) {
    ctx.fillRect(0, y, w, 2);
}

ctx.globalCompositeOperation = 'screen';
const noiseDensity = mouse.isPressed ? 1200 : 350;
for(let i=0; i<noiseDensity; i++) {
    const nx = Math.random() * w;
    const ny = Math.random() * h;
    const nw = Math.random() * 10 + 2;
    const nh = Math.random() * 2 + 1;
    ctx.fillStyle = Math.random() > 0.6 ? 'rgba(255,255,255,0.18)' : `rgba(${Math.random()*255}, ${Math.random()*255}, 255, 0.12)`;
    ctx.fillRect(nx, ny, nw, nh);
}
ctx.globalCompositeOperation = 'source-over';

const grad = ctx.createRadialGradient(w/2, h/2, h*0.45, w/2, h/2, h*0.85);
grad.addColorStop(0, 'rgba(0,0,0,0)');
grad.addColorStop(1, 'rgba(0,0,0,0.85)');
ctx.fillStyle = grad;
ctx.fillRect(0, 0, w, h);

ctx.fillStyle = '#00ff00';
ctx.font = 'bold 36px "Courier New", Courier, monospace';
ctx.textAlign = 'left';
ctx.textBaseline = 'top';

if (Math.random() > 0.08) {
    ctx.fillText("PLAY ►", 45, 45);
    const timeStr = new Date(time * 1000).toISOString().substring(11, 19);
    ctx.fillText(`SP  ${timeStr}`, w - 300, h - 70);
    
    if (Math.random() < 0.1) {
        ctx.fillStyle = '#ff0055';
        ctx.fillText("ERR: " + ws.terms[Math.floor(Math.random() * ws.terms.length)], 45, h - 70);
    } else {
        ctx.fillText("TRACKING: AUTO", 45, h - 70);
    }
}