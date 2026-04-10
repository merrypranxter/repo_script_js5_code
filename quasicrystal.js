const W = grid.width;
const H = grid.height;
const CX = W / 2;
const CY = H / 2;
const R_MAX = Math.hypot(W, H) / 2 + 150;

const mx = mouse.x || CX;
const my = mouse.y || CY;

ctx.fillStyle = '#0a0512';
ctx.fillRect(0, 0, W, H);

ctx.lineCap = 'round';
ctx.lineJoin = 'round';

const colors = [
    '#FF1493', '#FF4500', '#00FFCC', '#CCFF00', '#9400D3',
    '#FFD700', '#FF0055', '#00CCFF', '#FF3366', '#33FF99'
];

ctx.lineWidth = 3;
ctx.strokeStyle = 'rgba(148, 0, 211, 0.2)';
for (let r = (time * 30) % 120; r < R_MAX * 1.5; r += 120) {
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
        let a = (i * Math.PI * 2) / 10 + time * 0.05;
        let px = CX + Math.cos(a) * (r + Math.sin(i * 1.618 + time) * 20);
        let py = CY + Math.sin(a) * (r + Math.cos(i * 1.618 + time) * 20);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
}

const angles = [];
for (let i = 0; i < 5; i++) {
    angles.push((i * Math.PI) / 5);
}

const phases = angles.map((a, i) => {
    return Math.sin(time * 0.3 + i * 1.618) * 0.75;
});

const S = 140; 
const M = Math.ceil(R_MAX / S);

function warp(x, y) {
    let dx = x + CX - mx;
    let dy = y + CY - my;
    let dist = Math.hypot(dx, dy);
    
    let force = Math.max(0, 400 - dist) / 400;
    let repel = Math.pow(force, 2) * 120;
    let ang = Math.atan2(dy, dx);
    
    let wx = x + Math.cos(ang) * repel;
    let wy = y + Math.sin(ang) * repel;
    
    let driftX = Math.sin(wy * 0.015 + time * 0.8) * 40;
    let driftY = Math.cos(wx * 0.015 + time * 1.1) * 40;
    
    return [wx + driftX + CX, wy + driftY + CY];
}

let lineData = [];

for (let i = 0; i < 5; i++) {
    let theta = angles[i];
    let c = Math.cos(theta);
    let s = Math.sin(theta);
    let dirX = -s;
    let dirY = c;
    
    for (let k = -M; k <= M; k++) {
        let d = (k + phases[i]) * S;
        let px = d * c;
        let py = d * s;
        
        let pts = [];
        for (let t = -R_MAX; t <= R_MAX; t += 15) {
            let lx = px + t * dirX;
            let ly = py + t * dirY;
            pts.push(warp(lx, ly));
        }
        lineData.push({ pts: pts, color: colors[i % colors.length] });
    }
}

ctx.lineWidth = 18;
ctx.strokeStyle = '#05020a';
lineData.forEach(line => {
    ctx.beginPath();
    line.pts.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
    });
    ctx.stroke();
});

ctx.lineWidth = 8;
lineData.forEach(line => {
    ctx.strokeStyle = line.color;
    ctx.beginPath();
    line.pts.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
    });
    ctx.stroke();
});

let nodes = [];
for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 5; j++) {
        let ci = Math.cos(angles[i]), si = Math.sin(angles[i]);
        let cj = Math.cos(angles[j]), sj = Math.sin(angles[j]);
        let D = ci * sj - cj * si;
        
        if (Math.abs(D) < 0.001) continue;
        
        for (let ki = -M; ki <= M; ki++) {
            for (let kj = -M; kj <= M; kj++) {
                let d1 = (ki + phases[i]) * S;
                let d2 = (kj + phases[j]) * S;
                
                let x = (d1 * sj - d2 * si) / D;
                let y = (ci * d2 - cj * d1) / D;
                
                if (x * x + y * y < R_MAX * R_MAX) {
                    let w = warp(x, y);
                    if (w[0] > -100 && w[0] < W + 100 && w[1] > -100 && w[1] < H + 100) {
                        nodes.push({
                            wx: w[0], wy: w[1],
                            id: ki * 73856 + kj * 19349 + i * 83 + j,
                            col: colors[(i + j + Math.abs(ki)) % colors.length]
                        });
                    }
                }
            }
        }
    }
}

nodes.forEach(node => {
    let dx = node.wx - mx;
    let dy = node.wy - my;
    let dist = Math.hypot(dx, dy);
    
    let thermal = Math.max(0, 1 - dist / 350);
    
    let baseRad = 6 + Math.sin(node.id + time * 2) * 4;
    let bloomRad = thermal * 45 * (Math.sin(time * 4 + node.id * 1.618) * 0.5 + 0.5);
    let r = baseRad + bloomRad;
    
    if (r < 2) return;

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#05020a';
    ctx.fillStyle = node.col;
    
    ctx.beginPath();
    ctx.arc(node.wx, node.wy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    if (thermal > 0.1) {
        ctx.fillStyle = colors[(node.id) % colors.length];
        ctx.beginPath();
        ctx.arc(node.wx, node.wy, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        let satCount = Math.floor(thermal * 5);
        for(let s = 0; s < satCount; s++) {
            let sa = time * 3 + s * (Math.PI * 2 / satCount) + node.id;
            let sr = r + 15 + Math.sin(time * 5 + s) * 5;
            let sx = node.wx + Math.cos(sa) * sr;
            let sy = node.wy + Math.sin(sa) * sr;
            
            ctx.fillStyle = '#05020a';
            ctx.beginPath();
            ctx.arc(sx, sy, 8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(sx, sy, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
});