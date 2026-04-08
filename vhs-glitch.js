const files = repos.flatMap(r => r.files || []).map(f => f.split('/').pop().replace('.md', '').toUpperCase());
const dictionary = files.length > 0 ? files : ['SIGNAL_LOSS', 'TRACKING_ERR', 'CHROMA_BLEED', 'DATA_CORRUPTION', 'V_SYNC_DROP'];

const w = canvas.width;
const h = canvas.height;

// Offscreen buffer for the "clean" signal before tape damage
const buffer = document.createElement('canvas');
buffer.width = w;
buffer.height = h;
const bctx = buffer.getContext('2d', { alpha: false });

// Deterministic pseudo-random for noise
const hash = (x, y, t) => {
    let n = Math.sin(x * 12.9898 + y * 78.233 + t * 43.11) * 43758.5453;
    return n - Math.floor(n);
};

// --- BUILD THE GHOST SIGNAL (The underlying data trying to survive) ---
bctx.fillStyle = '#0a0b10';
bctx.fillRect(0, 0, w, h);

// Base grid / dead web structure
bctx.strokeStyle = '#1a1f2c';
bctx.lineWidth = 1;
for (let i = 0; i < w; i += 40) {
    bctx.beginPath(); bctx.moveTo(i, 0); bctx.lineTo(i, h); bctx.stroke();
}
for (let i = 0; i < h; i += 40) {
    bctx.beginPath(); bctx.moveTo(0, i); bctx.lineTo(w, i); bctx.stroke();
}

// Drifting data blocks
const blockCount = 15;
for (let i = 0; i < blockCount; i++) {
    const py = (hash(i, 0, 0) * h + time * 50 * hash(i, 1, 0)) % h;
    const px = hash(i, 2, 0) * w;
    const bw = hash(i, 3, 0) * 300 + 100;
    const bh = hash(i, 4, 0) * 60 + 20;
    
    bctx.fillStyle = hash(i, 5, 0) > 0.8 ? '#2a3b4c' : '#11151c';
    bctx.fillRect(px, py, bw, bh);
    
    bctx.fillStyle = '#4a5b6c';
    bctx.font = '10px monospace';
    const word = dictionary[i % dictionary.length];
    for (let ty = py + 12; ty < py + bh; ty += 12) {
        bctx.fillText(word + " " + hash(i, ty, time).toString(16).substring(2, 8), px + 5, ty);
    }
}

// SMPTE Color bars (decaying)
const colors = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
const barWidth = w / colors.length;
bctx.globalAlpha = 0.15 + Math.sin(time * 2) * 0.05;
colors.forEach((c, i) => {
    bctx.fillStyle = c;
    bctx.fillRect(i * barWidth, 0, barWidth, h);
});
bctx.globalAlpha = 1.0;

// OSD (On Screen Display)
bctx.fillStyle = '#00ff00';
bctx.font = '24px monospace';
bctx.fillText('PLAY', 40, 50);
bctx.fillText('SP', w - 80, 50);
const tc = new Date(time * 1000).toISOString().substr(11, 8);
bctx.fillText(`TCR 00:${tc}`, 40, h - 40);

// --- APPLY VHS TAPE DAMAGE AND RENDER TO MAIN CANVAS ---

ctx.fillStyle = '#000';
ctx.fillRect(0, 0, w, h);

// V-Sync Roll logic
let vSyncOffset = 0;
if (mouse.isPressed) {
    // Complete sync failure
    vSyncOffset = (time * 800) % h;
} else {
    // Occasional micro-slips
    if (hash(0, 0, time) > 0.98) vSyncOffset = hash(1, 1, time) * 50;
}

// Tracking noise band
const trackingCenter = mouse.isPressed ? h/2 : mouse.y || h * 0.8;
const trackingWidth = 150 + Math.sin(time * 10) * 50;

// Chroma bleed intensity based on mouse X (or time if no mouse)
const chromaOffset = mouse.x ? (mouse.x / w) * 10 : 3 + Math.sin(time) * 2;

// Slice up the buffer and draw it with distortions
const sliceHeight = 4; // Resolution of the tearing
for (let y = 0; y < h; y += sliceHeight) {
    
    // Calculate source Y with V-sync roll
    let srcY = (y - vSyncOffset + h) % h;
    
    // Calculate horizontal shift (jitter + tracking tear)
    let shiftX = 0;
    
    // Base high-frequency jitter
    if (hash(y, 0, time) > 0.9) shiftX += (hash(y, 1, time) - 0.5) * 10;
    
    // Tracking tear (proximity to tracking center)
    const distToTracking = Math.abs(y - trackingCenter);
    if (distToTracking < trackingWidth) {
        const tearIntensity = 1 - (distToTracking / trackingWidth);
        shiftX += Math.sin(y * 0.1 + time * 20) * (50 * tearIntensity * tearIntensity);
        
        // Sometimes drop the signal entirely in the tracking band (static)
        if (hash(y, 2, time) < 0.3 * tearIntensity) {
            ctx.fillStyle = hash(y, 3, time) > 0.5 ? '#fff' : '#000';
            ctx.fillRect(0, y, w, sliceHeight);
            continue; // Skip drawing the image slice here
        }
    }
    
    // Tape crease / wrinkle (slow moving vertical wave)
    const crease = Math.sin(y * 0.005 + time) * Math.cos(y * 0.02 - time * 0.5) * 20;
    shiftX += crease;

    // Draw Chroma Separated Slices
    ctx.globalCompositeOperation = 'screen';
    
    // Red channel
    ctx.drawImage(buffer, 
        0, srcY, w, sliceHeight, 
        shiftX + chromaOffset, y, w, sliceHeight);
        
    // Blue/Green channel (cyan-ish)
    ctx.drawImage(buffer, 
        0, srcY, w, sliceHeight, 
        shiftX - chromaOffset, y, w, sliceHeight);
        
    // Reset composite for next loop if needed, though screen builds up nicely
    ctx.globalCompositeOperation = 'source-over';
}

// --- OVERLAYS: SCANLINES, NOISE, HEAD SWITCHING ---

// CRT Scanlines
ctx.fillStyle = 'rgba(0,0,0,0.3)';
for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
}

// Analog Snow / Luma noise
const imgData = ctx.getImageData(0, 0, w, h);
const data = imgData.data;
for (let i = 0; i < data.length; i += 4) {
    // Add noise
    const noise = (Math.random() - 0.5) * 40;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
    data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
    
    // Desaturate slightly to mimic dying magnetic tape
    const gray = data[i] * 0.3 + data[i+1] * 0.59 + data[i+2] * 0.11;
    data[i] = data[i] * 0.8 + gray * 0.2;
    data[i+1] = data[i+1] * 0.8 + gray * 0.2;
    data[i+2] = data[i+2] * 0.8 + gray * 0.2;
}
ctx.putImageData(imgData, 0, 0);

// Head switching noise at the bottom
const headSwitchHeight = 20 + Math.random() * 10;
const headSwitchY = h - headSwitchHeight;
ctx.fillStyle = 'rgba(255,255,255,0.1)';
ctx.fillRect(0, headSwitchY, w, headSwitchHeight);
for(let i=0; i<w; i+= Math.random() * 10 + 5) {
    ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
    ctx.fillRect(i + Math.sin(time*50)*10, headSwitchY + Math.random()*headSwitchHeight, Math.random()*20, 2);
}

// Vignette / Tube edge darkening
const gradient = ctx.createRadialGradient(w/2, h/2, h/3, w/2, h/2, h);
gradient.addColorStop(0, 'rgba(0,0,0,0)');
gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, w, h);