const terms = [];
try {
    repos.forEach(r => {
        if (r.fileTree) {
            r.fileTree.forEach(f => {
                const name = f.split('/').pop().replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
                if (name.length > 3) terms.push(name.toUpperCase());
            });
        }
    });
} catch(e) {}
if (terms.length === 0) {
    terms.push("BROADCAST FAILURE", "CHROMA LUMA", "ARTIFACT DRIVER", "SIGNAL NOISE", "TAPE CRINKLE", "V-SYNC LOSS");
}

const chars = "█▓▒░<>+=-_~*&^%$#@!\\/|";

ctx.globalCompositeOperation = "source-over";
ctx.fillStyle = `rgba(3, 8, 4, ${Math.random() > 0.92 ? 0.6 : 0.15})`;
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.globalCompositeOperation = "screen";

let t = time;
const stutter = Math.floor(time * 15) % 7 === 0 ? Math.sin(time * 100) * 0.2 : 0;
t += stutter;

let vSyncRoll = 0;
if (Math.sin(t * 0.5) > 0.9) {
    vSyncRoll = (t * 1200) % canvas.height;
}

const fontSize = 18;
ctx.font = `bold ${fontSize}px monospace`;
ctx.textBaseline = "top";

const bandHeight = fontSize;
const mouseMag = mouse.isPressed ? 300 : 100;

for (let y = 0; y < canvas.height; y += bandHeight) {
    let actualY = (y + vSyncRoll) % canvas.height;
    
    let skew = Math.sin(y * 0.02 + t * 3) * 15;
    
    const isGlitchBand = Math.sin(y * 0.1 - t * 8) > 0.7;
    let damageLevel = 0;
    
    if (isGlitchBand) {
        skew += (Math.random() - 0.5) * 80;
        damageLevel = Math.random();
    }

    const dy = mouse.y - actualY;
    if (Math.abs(dy) < mouseMag) {
        const pull = 1 - Math.abs(dy) / mouseMag;
        skew += Math.sin(t * 20 + y) * 150 * pull;
        damageLevel = Math.max(damageLevel, pull);
    }

    const termIdx = Math.floor(y / bandHeight + Math.floor(t)) % terms.length;
    let baseText = terms[termIdx] + " // ";
    
    if (damageLevel > 0.3) {
        let arr = baseText.split('');
        for (let i = 0; i < arr.length; i++) {
            if (Math.random() < damageLevel * 0.5) {
                arr[i] = chars[Math.floor(Math.random() * chars.length)];
            }
        }
        baseText = arr.join('');
    }

    const repeatCount = Math.ceil(canvas.width / (baseText.length * fontSize * 0.6)) + 2;
    const text = baseText.repeat(repeatCount);

    const scroll = (t * 40 * ((termIdx % 3) + 1)) % (baseText.length * fontSize * 0.6);
    
    const scaleX = damageLevel > 0.8 ? 2.5 : 1;
    
    ctx.save();
    ctx.translate(skew, actualY);
    ctx.scale(scaleX, 1);
    
    const rOffset = damageLevel > 0.2 ? -5 * damageLevel : -1;
    const bOffset = damageLevel > 0.2 ? 5 * damageLevel : 1;

    ctx.fillStyle = "rgba(255, 30, 50, 0.8)";
    ctx.fillText(text, -scroll + rOffset, 0);

    ctx.fillStyle = "rgba(30, 255, 80, 0.8)";
    ctx.fillText(text, -scroll, 0);

    ctx.fillStyle = "rgba(30, 50, 255, 0.8)";
    ctx.fillText(text, -scroll + bOffset, 0);

    ctx.restore();
    
    if (damageLevel > 0.9 && Math.random() > 0.5) {
        ctx.fillStyle = "rgba(200, 255, 200, 0.9)";
        ctx.fillRect(skew, actualY, canvas.width, bandHeight);
    }
}

const numTears = Math.floor(Math.random() * 8);
for (let i = 0; i < numTears; i++) {
    if (Math.random() > 0.4) continue;
    const ty = Math.random() * canvas.height;
    const th = Math.random() * 40 + 5;
    const tx = (Math.random() - 0.5) * 120;
    ctx.drawImage(canvas, 0, ty, canvas.width, th, tx, ty, canvas.width, th);
}

ctx.globalCompositeOperation = "source-over";
ctx.font = "bold 24px monospace";
ctx.fillStyle = Math.floor(time * 2) % 2 === 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)";
ctx.fillText("PLAY ▻", 40, 40);

ctx.font = "16px monospace";
ctx.fillStyle = "rgba(255,255,255,0.7)";
ctx.fillText("SP", 40, 70);

if (mouse.isPressed || Math.random() > 0.95) {
    ctx.fillStyle = "rgba(255, 50, 50, 0.9)";
    ctx.fillText("TRACKING ERROR", 40, canvas.height - 60);
}

const noiseData = ctx.createImageData(canvas.width, canvas.height);
const buf = new Uint32Array(noiseData.data.buffer);
for (let i = 0; i < buf.length; i++) {
    if (Math.random() < 0.05) {
        buf[i] = 0xff000000 | (Math.random() * 255 << 16) | (Math.random() * 255 << 8) | (Math.random() * 255);
    }
}
ctx.globalCompositeOperation = "screen";
ctx.globalAlpha = 0.15;
ctx.putImageData(noiseData, 0, 0);
ctx.globalAlpha = 1.0;