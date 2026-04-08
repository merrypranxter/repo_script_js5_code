const vocab = repos.flatMap(r => {
    const str = r.fileTree || '';
    return str.match(/[a-zA-Z0-9]+[_\-][a-zA-Z0-9]+/g) || [];
}).filter(w => w.length > 5 && !w.includes('github') && !w.includes('json') && !w.includes('README'));

const words = vocab.length > 5 ? vocab : [
    "CHROMA_LUMA", "ANTI_DRIFT", "DEAD_WEB", "CURSED_SHITPOST", 
    "ARTIFACT_STACK", "BROADCAST_FAILURE", "CODEC_CORRUPTION", "SIGNAL_DENSITY"
];

canvas.frame = (canvas.frame || 0) + 1;
const f = canvas.frame;

let trackingWave = Math.sin(time * 3.1) * Math.cos(time * 1.7) * 4;
if (mouse.isPressed) trackingWave += (Math.random() - 0.5) * 20;

let vSyncDrop = 0.5; // Slow downward tape drift
if (Math.random() < 0.03) vSyncDrop = Math.random() * 15 + 5; // Stutter
if (Math.random() < 0.005) vSyncDrop = canvas.height * 0.3; // Major V-Sync roll

ctx.globalCompositeOperation = 'lighten';
ctx.globalAlpha = 0.88; 
ctx.drawImage(
    canvas, 
    0, 0, canvas.width, canvas.height, 
    trackingWave, vSyncDrop, canvas.width + (Math.sin(time)*1.5), canvas.height
);
ctx.globalAlpha = 1.0;

ctx.globalCompositeOperation = 'source-over';
ctx.fillStyle = `rgba(4, 6, 10, ${mouse.isPressed ? 0.05 : 0.25})`; 
ctx.fillRect(0, 0, canvas.width, canvas.height);

if (Math.random() > 0.8) {
    ctx.fillStyle = `rgba(255, 0, 80, 0.03)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
} else if (Math.random() > 0.8) {
    ctx.fillStyle = `rgba(0, 255, 100, 0.03)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

ctx.font = 'bold 22px monospace';
ctx.textBaseline = 'middle';
let numInjections = mouse.isPressed ? 12 : 3;

for(let i=0; i<numInjections; i++) {
    let word = words[Math.floor(Math.random() * words.length)].toUpperCase();
    
    let x, y;
    if (mouse.isPressed) {
        x = mouse.x + (Math.random() - 0.5) * 200;
        y = mouse.y + (Math.random() - 0.5) * 200;
    } else {
        x = (Math.floor(Math.random() * grid.cols) * (canvas.width/grid.cols));
        y = (Math.floor(Math.random() * grid.rows) * (canvas.height/grid.rows));
    }

    if (Math.random() > 0.7) word = word.replace(/[AEIOU]/g, '█');
    if (Math.random() > 0.9) word = word.split('').sort(() => Math.random() - 0.5).join('');

    let rShift = Math.sin(time * 12 + i) * 6;
    let bShift = Math.cos(time * 18 + i) * -6;

    if (mouse.isPressed) {
        rShift *= 4;
        bShift *= 4;
    }

    ctx.globalCompositeOperation = 'screen';
    
    ctx.fillStyle = '#FF003C';
    ctx.fillText(word, x + rShift, y);
    
    ctx.fillStyle = '#00FF44';
    ctx.fillText(word, x, y);
    
    ctx.fillStyle = '#0044FF';
    ctx.fillText(word, x + bShift, y);
}

ctx.globalCompositeOperation = 'source-over';
let tears = Math.floor(Math.random() * 6) + (mouse.isPressed ? 10 : 0);
for (let i=0; i<tears; i++) {
    let ty = Math.random() * canvas.height;
    let th = Math.random() * 30 + 2;
    let tx = (Math.random() - 0.5) * 40;
    
    if (Math.random() > 0.85) tx *= 6; 
    
    ctx.drawImage(
        canvas,
        0, ty, canvas.width, th,
        tx, ty, canvas.width, th
    );
    
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.15})`;
    ctx.fillRect(0, ty, canvas.width, th);
}

ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
for (let y = 0; y < canvas.height; y += 3) {
    ctx.fillRect(0, y, canvas.width, 1);
}

ctx.fillStyle = '#FFFFFF';
ctx.font = '14px monospace';
ctx.globalCompositeOperation = 'difference';
const timecode = `PLAY EP ${Math.floor(time/60).toString().padStart(2,'0')}:${(Math.floor(time)%60).toString().padStart(2,'0')}:${Math.floor((time%1)*30).toString().padStart(2,'0')} // ${input.toUpperCase()}`;
ctx.fillText(timecode, 20, canvas.height - 20);