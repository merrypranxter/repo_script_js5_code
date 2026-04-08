if (!canvas.vhsState) {
    canvas.vhsState = {
        terms: [
            "BROADCAST_SIGNAL_FAILURE", "CHROMA_LUMA_FAILURES", 
            "ARTIFACT_STACK_LOGIC", "CODEC_CORRUPTION", 
            "DEAD_WEB_NOSTALGIA", "SHOEGAZE_PALETTE", 
            "SIGNAL_DENSITY_SYSTEM", "ANTI_DRIFT",
            "AUTHENTICITY_VS_SIMULATION", "CURSED_SHITPOST"
        ],
        glitches: [],
        vHoldPhase: 0,
        noiseData: ctx.createImageData(canvas.width, 50),
        lastTime: time
    };

    for (let i = 0; i < 25; i++) {
        canvas.vhsState.glitches.push({
            text: canvas.vhsState.terms[Math.floor(Math.random() * canvas.vhsState.terms.length)],
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speed: (Math.random() - 0.5) * 4,
            size: 10 + Math.random() * 40,
            font: Math.random() > 0.5 ? 'monospace' : 'sans-serif',
            corruptTimer: 0
        });
    }
}

const state = canvas.vhsState;
const dt = time - state.lastTime;
state.lastTime = time;

ctx.globalCompositeOperation = 'source-over';
ctx.fillStyle = `rgba(12, 8, 15, 0.15)`;
ctx.fillRect(0, 0, canvas.width, canvas.height);

const isTrackingLoss = mouse.isPressed || Math.random() < 0.02;
const trackingIntensity = isTrackingLoss ? (mouse.y / canvas.height) * 10 + 2 : 1;
const chromaSpread = (mouse.x / canvas.width) * 20 + 2;

state.vHoldPhase += (isTrackingLoss ? 15 : 0.5) * trackingIntensity;
const vShift = state.vHoldPhase % canvas.height;

ctx.save();
ctx.translate(0, isTrackingLoss ? vShift : 0);

ctx.globalCompositeOperation = 'screen';

state.glitches.forEach((g, i) => {
    g.x += g.speed;
    if (g.x > canvas.width + 100) g.x = -100;
    if (g.x < -100) g.x = canvas.width + 100;

    g.corruptTimer -= dt;
    let displayText = g.text;
    
    if (g.corruptTimer <= 0 && Math.random() < 0.1) {
        g.corruptTimer = Math.random() * 2;
        const chars = displayText.split('');
        const corruptCount = Math.floor(Math.random() * 4);
        for(let c=0; c<corruptCount; c++) {
            chars[Math.floor(Math.random()*chars.length)] = String.fromCharCode(33 + Math.floor(Math.random()*90));
        }
        displayText = chars.join('');
    }

    ctx.font = `bold ${g.size}px ${g.font}`;
    const jitterX = (Math.random() - 0.5) * trackingIntensity * 5;
    const jitterY = (Math.random() - 0.5) * trackingIntensity * 2;

    ctx.fillStyle = 'rgba(255, 0, 100, 0.9)';
    ctx.fillText(displayText, g.x + jitterX - chromaSpread, g.y + jitterY);

    ctx.fillStyle = 'rgba(0, 255, 200, 0.9)';
    ctx.fillText(displayText, g.x + jitterX + chromaSpread, g.y + jitterY);

    ctx.fillStyle = 'rgba(50, 50, 255, 0.9)';
    ctx.fillText(displayText, g.x + jitterX, g.y + jitterY + chromaSpread * 0.5);
});

ctx.restore();

const creaseY = (time * 200) % canvas.height;
const creaseHeight = 20 + Math.random() * 40;
const safeCreaseY = Math.max(0, Math.min(creaseY, canvas.height - creaseHeight));

if (safeCreaseY > 0 && creaseHeight > 0) {
    try {
        ctx.globalCompositeOperation = 'source-over';
        const shiftX = (Math.random() - 0.5) * 80 * trackingIntensity;
        ctx.drawImage(
            canvas, 
            0, safeCreaseY, canvas.width, creaseHeight,
            shiftX, safeCreaseY, canvas.width, creaseHeight
        );
        
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
        ctx.fillRect(0, safeCreaseY + Math.random()*creaseHeight, canvas.width, 2);
    } catch (e) {}
}

const headNoiseHeight = 30 + Math.random() * 20;
if (state.noiseData.width !== canvas.width) {
    state.noiseData = ctx.createImageData(canvas.width, headNoiseHeight);
}
const buf = new Uint32Array(state.noiseData.data.buffer);
for (let i = 0; i < buf.length; i++) {
    const luma = Math.random() > 0.8 ? 255 : 0;
    const color = Math.random() > 0.95 ? (Math.random() * 0xFFFFFF) : (luma * 0x010101);
    buf[i] = 0xFF000000 | color;
}
ctx.putImageData(state.noiseData, 0, canvas.height - headNoiseHeight);

ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
for (let y = 0; y < canvas.height; y += 3) {
    ctx.fillRect(0, y, canvas.width, 1);
}

ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
ctx.font = '24px monospace';
ctx.fillText('PLAY', 40, 50);
ctx.fillText('SP', 40, 80);

const timeCode = new Date(time * 1000).toISOString().substr(11, 8);
ctx.fillText(timeCode, canvas.width - 160, canvas.height - 60);