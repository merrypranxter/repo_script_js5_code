if (!canvas.__state) {
    canvas.__state = {
        glitter: Array.from({length: 80}, () => ({
            x: Math.random() * grid.width,
            y: Math.random() * grid.height,
            size: 2 + Math.random() * 6,
            phase: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 2,
            rotSpeed: (Math.random() - 0.5) * 5,
            blinkSpeed: 5 + Math.random() * 10
        })),
        diamonds: Array.from({length: 6}, () => ({
            x: Math.random() * grid.width,
            y: Math.random() * grid.height,
            size: 15 + Math.random() * 25,
            color: ['#00FFFF', '#FF00FF', '#FFFF00', '#FF0080'][Math.floor(Math.random()*4)],
            speedY: (Math.random() - 0.5) * 2,
            speedX: (Math.random() - 0.5) * 2
        })),
        windows: [
            { x: grid.width*0.1, y: grid.height*0.1, w: 220, h: 110, title: "WARNING", msg: "AESTHETIC_OVERLOAD" }
        ],
        texts: [
            { x: grid.width*0.2, y: grid.height*0.8, str: "typing...", speed: 1 },
            { x: grid.width*0.7, y: grid.height*0.3, str: "xX_laser_Xx", speed: 1.5 },
            { x: grid.width*0.5, y: grid.height*0.5, str: "404_NOT_FOUND", speed: 0.8 },
            { x: grid.width*0.8, y: grid.height*0.9, str: "seen 2:34am", speed: 1.2 },
            { x: grid.width*0.1, y: grid.height*0.4, str: "<blink>DEITY</blink>", speed: 2.0 }
        ],
        wasPressed: false
    };
}

const state = canvas.__state;
const targetMouse = { 
    x: mouse.x !== undefined ? mouse.x : grid.width/2, 
    y: mouse.y !== undefined ? mouse.y : grid.height/2 
};

// Temporal Echo / Ghost Frame Body
ctx.fillStyle = 'rgba(5, 5, 10, 0.18)'; 
ctx.fillRect(0, 0, grid.width, grid.height);

// Cat Setup (Deity Mode)
let cx = grid.width / 2;
let cy = grid.height / 2 + Math.sin(time * 2) * 20; 
let scale = Math.max(50, Math.min(grid.width, grid.height) * 0.22);
let glitchIntensity = mouse.isPressed ? 1.5 : 0.2 + Math.sin(time*5)*0.1;

// --- UTILITY FUNCTIONS ---

function drawCatPath(ctx, cx, cy, scale) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + scale * 0.5); 
    ctx.lineTo(cx - scale * 0.4, cy + scale * 0.3); 
    ctx.lineTo(cx - scale * 0.5, cy - scale * 0.2); 
    ctx.lineTo(cx - scale * 0.45, cy - scale * 0.5); 
    ctx.lineTo(cx - scale * 0.35, cy - scale * 0.9); 
    ctx.lineTo(cx - scale * 0.15, cy - scale * 0.5); 
    ctx.lineTo(cx + scale * 0.15, cy - scale * 0.5); 
    ctx.lineTo(cx + scale * 0.35, cy - scale * 0.9); 
    ctx.lineTo(cx + scale * 0.45, cy - scale * 0.5); 
    ctx.lineTo(cx + scale * 0.5, cy - scale * 0.2); 
    ctx.lineTo(cx + scale * 0.4, cy + scale * 0.3); 
    ctx.closePath();
}

function drawDiamond(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size*0.6, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size*0.6, y);
    ctx.closePath();
    ctx.fill();
}

// --- RENDERING ---

// 1. Glitter Signal Overprint
state.glitter.forEach(g => {
    g.y += g.speed;
    if (g.y > grid.height + 10) {
        g.y = -10;
        g.x = Math.random() * grid.width;
    }
    let alpha = (Math.sin(time * g.blinkSpeed + g.phase) + 1) / 2;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(time * g.rotSpeed);
    ctx.beginPath();
    let size = Math.max(0, g.size);
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(0, 0, size, 0);
    ctx.quadraticCurveTo(0, 0, 0, size);
    ctx.quadraticCurveTo(0, 0, -size, 0);
    ctx.quadraticCurveTo(0, 0, 0, -size);
    ctx.fill();
    ctx.restore();
});

// 2. Cosmic Space Collage (Diamonds)
state.diamonds.forEach(d => {
    d.x += d.speedX;
    d.y += d.speedY;
    if (d.x < -50) d.x = grid.width + 50;
    if (d.x > grid.width + 50) d.x = -50;
    if (d.y < -50) d.y = grid.height + 50;
    if (d.y > grid.height + 50) d.y = -50;
    
    ctx.globalCompositeOperation = 'screen';
    drawDiamond(ctx, d.x - 3, d.y, d.size, '#FF0000');
    drawDiamond(ctx, d.x, d.y, d.size, '#00FF00');
    drawDiamond(ctx, d.x + 3, d.y, d.size, '#0000FF');
    ctx.globalCompositeOperation = 'source-over';
});

// 3. UFO Sci-Fi Intrusion
let ufoX = cx + Math.cos(time * 0.8) * scale * 1.8;
let ufoY = cy + Math.sin(time * 1.2) * scale * 0.6;

ctx.fillStyle = '#C0C0C0';
ctx.beginPath();
ctx.ellipse(ufoX, ufoY, 45, 12, 0, 0, Math.PI*2);
ctx.fill();
ctx.fillStyle = '#00FFFF';
ctx.beginPath();
ctx.ellipse(ufoX, ufoY - 6, 22, 16, 0, Math.PI, 0);
ctx.fill();

ctx.globalCompositeOperation = 'screen';
let gradBeam = ctx.createLinearGradient(0, ufoY, 0, ufoY + 150);
gradBeam.addColorStop(0, 'rgba(0, 255, 255, 0.7)');
gradBeam.addColorStop(1, 'rgba(0, 255, 255, 0.0)');
ctx.fillStyle = gradBeam;
ctx.beginPath();
ctx.moveTo(ufoX - 12, ufoY + 6);
ctx.lineTo(ufoX + 12, ufoY + 6);
ctx.lineTo(ufoX + 50, ufoY + 150);
ctx.lineTo(ufoX - 50, ufoY + 150);
ctx.fill();
ctx.globalCompositeOperation = 'source-over';

// 4. Rainbow Puke / Laser Eyes
if (mouse.isPressed) {
    // Destroyer Cat (Lasers)
    let ex1 = cx - scale * 0.25;
    let ey1 = cy - scale * 0.1;
    let ex2 = cx + scale * 0.25;
    let ey2 = cy - scale * 0.1;
    
    ctx.globalCompositeOperation = 'screen';
    let lw = 8 + Math.sin(time*30)*6;
    
    ctx.lineWidth = lw;
    ctx.strokeStyle = '#FF0080';
    ctx.beginPath(); ctx.moveTo(ex1, ey1); ctx.lineTo(targetMouse.x, targetMouse.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex2, ey2); ctx.lineTo(targetMouse.x, targetMouse.y); ctx.stroke();
    
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath(); ctx.moveTo(ex1, ey1); ctx.lineTo(targetMouse.x, targetMouse.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex2, ey2); ctx.lineTo(targetMouse.x, targetMouse.y); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    
    ctx.fillStyle = '#FF0080';
    ctx.beginPath(); ctx.arc(targetMouse.x, targetMouse.y, 25 + Math.random()*20, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(targetMouse.x, targetMouse.y, 10 + Math.random()*10, 0, Math.PI*2); ctx.fill();
} else {
    // Idiot Cat (Rainbow Puke)
    const colors = ['#FF0080', '#FF8C00', '#FFD700', '#00FF00', '#00CED1', '#9400D3'];
    let mouthX = cx;
    let mouthY = cy + scale * 0.25;
    let dx = targetMouse.x - mouthX;
    let targetX = mouthX + dx * 0.4;
    let targetY = grid.height + 100;
    
    ctx.globalCompositeOperation = 'screen';
    for(let c=0; c<colors.length; c++) {
        ctx.beginPath();
        ctx.strokeStyle = colors[c];
        ctx.lineWidth = Math.max(1, scale * 0.08);
        
        let steps = 25;
        for(let i=0; i<=steps; i++) {
            let t = i / steps;
            let bx = mouthX + (targetX - mouthX) * t;
            let by = mouthY + (targetY - mouthY) * t;
            
            let wave = Math.sin(t * 12 - time * 8) * (15 + t * 40);
            bx += wave + (c - colors.length/2) * (scale * 0.07);
            
            if (i === 0) ctx.moveTo(bx, by);
            else ctx.lineTo(bx, by);
        }
        ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
}

// 5. RGB Phantom Cat
const rx = (Math.random() - 0.5) * glitchIntensity * 25;
const ry = (Math.random() - 0.5) * glitchIntensity * 25;

ctx.globalCompositeOperation = 'screen';
ctx.fillStyle = '#FF0080'; drawCatPath(ctx, cx + rx, cy + ry, scale); ctx.fill();
ctx.fillStyle = '#00FF00'; drawCatPath(ctx, cx, cy, scale); ctx.fill();
ctx.fillStyle = '#0000FF'; drawCatPath(ctx, cx - rx, cy - ry, scale); ctx.fill();
ctx.globalCompositeOperation = 'source-over';

// Eyes & Mouth Anchor Preservation
ctx.fillStyle = '#FFFFFF';
let p_dx = targetMouse.x - cx;
let p_dy = targetMouse.y - cy;
let p_dist = Math.sqrt(p_dx*p_dx + p_dy*p_dy) || 1;
let maxOff = Math.max(0, scale * 0.06);
let px = (p_dx / p_dist) * maxOff;
let py = (p_dy / p_dist) * maxOff;

ctx.beginPath();
ctx.arc(cx - scale * 0.25, cy - scale * 0.1, Math.max(0, scale * 0.12), 0, Math.PI*2);
ctx.arc(cx + scale * 0.25, cy - scale * 0.1, Math.max(0, scale * 0.12), 0, Math.PI*2);
ctx.fill();

ctx.fillStyle = '#000000';
ctx.beginPath();
ctx.arc(cx - scale * 0.25 + px, cy - scale * 0.1 + py, Math.max(0, scale * 0.05), 0, Math.PI*2);
ctx.arc(cx + scale * 0.25 + px, cy - scale * 0.1 + py, Math.max(0, scale * 0.05), 0, Math.PI*2);
ctx.fill();

// Third Eye (Psychedelic Branch)
if (Math.sin(time * 8) > 0) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(cx, cy - scale * 0.35, Math.max(0, scale * 0.09), Math.max(0, scale * 0.05), 0, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#00FFFF';
    ctx.beginPath();
    ctx.arc(cx, cy - scale * 0.35, Math.max(0, scale * 0.03), 0, Math.PI*2);
    ctx.fill();
}

// Mouth
ctx.fillStyle = '#000000';
ctx.beginPath();
ctx.ellipse(cx, cy + scale * 0.25, Math.max(0, scale * 0.1), Math.max(0, scale * 0.15), 0, 0, Math.PI*2);
ctx.fill();

// 6. Blingee Text
ctx.font = 'bold 36px "Comic Sans MS", cursive, sans-serif';
ctx.textAlign = 'center';
let titleTxt = "xX_G0D_C4T_Xx";
let tx = grid.width / 2;
let ty = 50;

for(let i=6; i>=0; i--) {
    if (i===0) {
        ctx.fillStyle = '#FFFFFF';
    } else {
        ctx.fillStyle = `hsl(${(time * 150 + i * 25) % 360}, 100%, 50%)`;
    }
    ctx.fillText(titleTxt, tx + i*2, ty + i*2);
}
ctx.textAlign = 'left';

// 7. Text/Interface Debris
ctx.font = '14px monospace';
state.texts.forEach((txt, i) => {
    let x = txt.x + Math.sin(time * txt.speed + i) * 15;
    let y = txt.y - time * 15 % grid.height;
    if (y < -20) txt.y += grid.height + 40;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * txt.speed) * 0.1);
    
    if (Math.random() < 0.08) {
        ctx.fillStyle = '#FF0080'; ctx.fillText(txt.str, 2, 0);
        ctx.fillStyle = '#00FFFF'; ctx.fillText(txt.str, -2, 0);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(txt.str, 0, 0);
    ctx.restore();
});

// 8. MySpace / Windows 95 Error Boxes
state.windows.forEach(w => {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(w.x + 5, w.y + 5, w.w, w.h);
    
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w.x, w.y, w.w, 2);
    ctx.fillRect(w.x, w.y, 2, w.h);
    ctx.fillStyle = '#808080';
    ctx.fillRect(w.x, w.y + w.h - 2, w.w, 2);
    ctx.fillRect(w.x + w.w - 2, w.y, 2, w.h);
    
    ctx.fillStyle = '#000080';
    ctx.fillRect(w.x + 3, w.y + 3, w.w - 6, 18);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(w.title, w.x + 6, w.y + 16);
    
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(w.x + w.w - 19, w.y + 4, 14, 14);
    ctx.fillStyle = '#000000';
    ctx.fillText("x", w.x + w.w - 15, w.y + 15);
    
    ctx.fillStyle = '#000000';
    ctx.font = '12px monospace';
    ctx.fillText(w.msg, w.x + 10, w.y + 45);
    
    let bx = w.x + w.w/2 - 25;
    let by = w.y + w.h - 30;
    ctx.fillStyle = '#c0c0c0'; ctx.fillRect(bx, by, 50, 20);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(bx, by, 50, 2); ctx.fillRect(bx, by, 2, 20);
    ctx.fillStyle = '#808080'; ctx.fillRect(bx, by + 18, 50, 2); ctx.fillRect(bx + 48, by, 2, 20);
    ctx.fillStyle = '#000000'; ctx.fillText("OK", bx + 17, by + 14);
});

if (mouse.isPressed && !state.wasPressed) {
    state.windows.push({
        x: Math.max(0, Math.min(targetMouse.x, grid.width - 200)),
        y: Math.max(0, Math.min(targetMouse.y, grid.height - 100)),
        w: 160 + Math.random() * 80,
        h: 90 + Math.random() * 40,
        title: "FATAL_ERROR",
        msg: "0x" + Math.random().toString(16).slice(2,8).toUpperCase().padEnd(6, '0')
    });
    if (state.windows.length > 6) state.windows.shift();
}
state.wasPressed = mouse.isPressed;

// 9. Compression Chew / Macroblocking
if (Math.random() < 0.25) {
    let bx = Math.floor(Math.random() * grid.width);
    let by = Math.floor(Math.random() * grid.height);
    let bw = Math.floor(32 + Math.random() * 96);
    let bh = Math.floor(16 + Math.random() * 48);
    
    try {
        let sx = Math.max(0, Math.min(bx, canvas.width - bw));
        let sy = Math.max(0, Math.min(by, canvas.height - bh));
        let dx = sx + (Math.random()-0.5)*50;
        let dy = sy + (Math.random()-0.5)*15;
        ctx.drawImage(canvas, sx, sy, bw, bh, dx, dy, bw, bh);
    } catch(e){}
    
    if (Math.random() < 0.35) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 0, 128, 0.35)' : 'rgba(0, 255, 255, 0.35)';
        ctx.fillRect(bx, by, bw, bh);
    }
}

// 10. CRT Raster & Scanline Bleed
ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
for(let y = 0; y < grid.height; y += 3) {
    ctx.fillRect(0, y, grid.width, 1);
}

let barY = (time * 180) % grid.height;
ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
ctx.fillRect(0, barY, grid.width, grid.height * 0.12);

let grad = ctx.createRadialGradient(grid.width/2, grid.height/2, grid.height*0.4, grid.width/2, grid.height/2, grid.height*0.9);
grad.addColorStop(0, 'rgba(0,0,0,0)');
grad.addColorStop(1, 'rgba(0,0,0,0.7)');
ctx.fillStyle = grad;
ctx.fillRect(0, 0, grid.width, grid.height);