if (!canvas.__feralState) {
    canvas.__feralState = {
        bling: Array.from({ length: 25 }, () => ({
            x: Math.random() * grid.width,
            y: Math.random() * grid.height,
            s: 10 + Math.random() * 40,
            a: Math.random() * Math.PI * 2,
            type: Math.floor(Math.random() * 3),
            c: ['#FF00FF', '#00FFFF', '#39FF14', '#FFFFFF'][Math.floor(Math.random() * 4)],
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 5 - 1
        })),
        glitchY: 0
    };
}

const st = canvas.__feralState;
const w = grid.width;
const h = grid.height;

// Center logic with mouse pull
const targetCx = mouse.isPressed ? mouse.x : w / 2;
const targetCy = mouse.isPressed ? mouse.y : h / 2;
const cx = w / 2 + Math.sin(time * 0.5) * (targetCx - w / 2) * 0.5;
const cy = h / 2 + Math.cos(time * 0.7) * (targetCy - h / 2) * 0.5;

// 1. FEEDBACK LOOP (Datamosh / Phosphor Bleed)
ctx.globalCompositeOperation = 'source-over';
ctx.fillStyle = 'rgba(5, 5, 5, 0.15)';
ctx.fillRect(0, 0, w, h);

// 2. OP-ART ENGINE: Radial Checkerboard Tunnel
ctx.globalCompositeOperation = 'source-over';
const rings = Math.floor(Math.max(w, h) / 20);
const segments = 24;

// Base B&W structure
for (let r = rings; r > 0; r--) {
    const radius = r * 25 + (time * 60) % 25;
    if (radius < 0) continue;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    
    const circumference = 2 * Math.PI * radius;
    const dash = circumference / segments;
    
    ctx.lineWidth = 26;
    ctx.setLineDash([dash, dash]);
    
    // Counter-rotating rings
    const speed = (r % 2 === 0 ? 1 : -1) * time * 100;
    ctx.lineDashOffset = speed;

    // Prismatic injection: every 4th ring is toxic neon instead of white
    if (r % 4 === 0) {
        ctx.strokeStyle = ['#FF00FF', '#00FFFF', '#39FF14'][r % 3];
    } else {
        ctx.strokeStyle = '#FFFFFF';
    }
    
    ctx.stroke();
    
    // Draw black gaps explicitly to enforce harsh retinal contrast
    ctx.lineDashOffset = speed - dash;
    ctx.strokeStyle = '#050505';
    ctx.stroke();
}
ctx.setLineDash([]);

// 3. CHROMATIC INTERFERENCE (RGB Split)
// Draw the canvas slightly offset over itself with additive blending
if (Math.sin(time * 4) > 0) {
    ctx.globalCompositeOperation = 'screen';
    const splitOff = 10 * Math.sin(time * 12);
    
    // Red shift
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(canvas, splitOff, 0);
    
    // Cyan shift
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(canvas, -splitOff, 0);
}

// 4. MYSPACE BLING ECOLOGY
ctx.globalCompositeOperation = 'source-over';
st.bling.forEach((b, i) => {
    b.x += b.vx;
    b.y += b.vy;
    b.a += b.vx * 0.1;

    // Screen wrap
    if (b.x < -b.s) b.x = w + b.s;
    if (b.x > w + b.s) b.x = -b.s;
    if (b.y < -b.s) b.y = h + b.s;
    if (b.y > h + b.s) b.y = -b.s;

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.a);

    // Glitch scale
    const s = b.s * (1 + 0.2 * Math.sin(time * 10 + i));
    
    ctx.fillStyle = '#050505'; // Void core
    ctx.strokeStyle = b.c;     // Neon edge
    ctx.lineWidth = 4;

    ctx.beginPath();
    if (b.type === 0) { // Star
        for (let j = 0; j < 10; j++) {
            const r = j % 2 === 0 ? s : s / 2;
            const a = (j * Math.PI * 2) / 10;
            ctx[j === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
        }
    } else if (b.type === 1) { // Cross/Plus
        ctx.rect(-s/4, -s, s/2, s*2);
        ctx.rect(-s, -s/4, s*2, s/2);
    } else { // Jagged burst
        for (let j = 0; j < 12; j++) {
            const r = s * (0.5 + Math.random() * 0.5);
            const a = (j * Math.PI * 2) / 12;
            ctx[j === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
        }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glitter dots inside
    ctx.fillStyle = '#FFFFFF';
    for(let k=0; k<3; k++) {
        if(Math.random() > 0.5) {
            ctx.fillRect((Math.random()-0.5)*s, (Math.random()-0.5)*s, 3, 3);
        }
    }
    ctx.restore();
});

// 5. EARLY INTERNET TEXT DEBRIS
ctx.font = "bold 40px 'Courier New', Courier, monospace";
const msg = "  xX_R3T1N4L_D3C4Y_Xx  //  L04D1NG...  ";
ctx.lineWidth = 2;
const tw = ctx.measureText(msg).width;
const scroll = (time * 150) % tw;

for(let i = -1; i < Math.ceil(w / tw) + 1; i++) {
    const tx = i * tw - scroll;
    const ty = h - 30 + Math.sin(time * 10 + i) * 5; // Jitter Y
    
    // Drop shadow / Misregistration
    ctx.fillStyle = '#FF00FF';
    ctx.fillText(msg, tx + 4, ty + 4);
    
    ctx.fillStyle = '#00FFFF';
    ctx.fillText(msg, tx - 4, ty - 4);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#050505';
    ctx.fillText(msg, tx, ty);
    ctx.strokeText(msg, tx, ty);
}

// 6. VHS TRACKING TEARS & MACROBLOCK ROT
const tearCount = Math.floor(Math.random() * 5) + 2;
for (let i = 0; i < tearCount; i++) {
    if (Math.random() > 0.3) {
        const ty = Math.random() * h;
        const th = 10 + Math.random() * 40;
        const shift = (Math.random() - 0.5) * 150;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, ty, w, th);
        ctx.clip();
        // Shift this horizontal slice
        ctx.drawImage(canvas, shift, 0);
        
        // Sometimes invert the colors in the tear
        if (Math.random() > 0.6) {
            ctx.globalCompositeOperation = 'difference';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, ty, w, th);
        }
        ctx.restore();
    }
}

// 7. SCANLINES (CRT Bleed)
ctx.globalCompositeOperation = 'multiply';
ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
for(let y = 0; y < h; y += 4) {
    ctx.fillRect(0, y, w, 2);
}