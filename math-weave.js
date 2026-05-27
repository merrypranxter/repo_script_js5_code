const cellSize = Math.max(12, Math.floor(grid.width / 90));
const cols = Math.ceil(grid.width / cellSize) + 2;
const rows = Math.ceil(grid.height / cellSize) + 2;

// 1. Moiré / Cosmic Void Background
ctx.fillStyle = '#0a0015';
ctx.fillRect(0, 0, grid.width, grid.height);

ctx.lineWidth = 1;
const moireSpacing = cellSize * 0.4;
const diag = Math.sqrt(grid.width * grid.width + grid.height * grid.height) + 100;

ctx.save();
ctx.translate(grid.width / 2, grid.height / 2);
ctx.rotate(time * 0.02);
ctx.beginPath();
for(let i = -diag / 2; i < diag / 2; i += moireSpacing) {
    ctx.moveTo(i, -diag / 2); 
    ctx.lineTo(i, diag / 2);
}
ctx.strokeStyle = 'rgba(11, 191, 217, 0.12)';
ctx.stroke();
ctx.restore();

ctx.save();
ctx.translate(grid.width / 2, grid.height / 2);
ctx.rotate(-time * 0.015 + 0.1);
ctx.beginPath();
for(let i = -diag / 2; i < diag / 2; i += moireSpacing) {
    ctx.moveTo(-diag / 2, i); 
    ctx.lineTo(diag / 2, i);
}
ctx.strokeStyle = 'rgba(245, 64, 32, 0.12)';
ctx.stroke();
ctx.restore();

// 2. Compute Newtonian Fractal Nodes & Topology Stress
const nodes = [];
const scale = 1.8 + Math.sin(time * 0.2) * 0.4;
const angle = time * 0.1;
const cosA = Math.cos(angle), sinA = Math.sin(angle);
const offsetX = Math.sin(time * 0.15) * 1.2;
const offsetY = Math.cos(time * 0.11) * 1.2;

for (let i = 0; i < cols; i++) {
    nodes[i] = [];
    for (let j = 0; j < rows; j++) {
        let u = (i / (cols - 1)) * 2 - 1;
        let v = (j / (rows - 1)) * 2 - 1;
        u *= grid.width / grid.height;

        let zx = (u * cosA - v * sinA) * scale + offsetX;
        let zy = (u * sinA + v * cosA) * scale + offsetY;

        let iters = 0;
        const maxIters = 18;
        for (; iters < maxIters; iters++) {
            let z2x = zx * zx - zy * zy;
            let z2y = 2 * zx * zy;
            let z3x = zx * z2x - zy * z2y;
            let z3y = zx * z2y + zy * z2x;

            let fx = z3x - 1, fy = z3y;
            let dfx = 3 * z2x, dfy = 3 * z2y;
            let denom = dfx * dfx + dfy * dfy;

            if (denom < 1e-6) break;

            let divX = (fx * dfx + fy * dfy) / denom;
            let divY = (fy * dfx - fx * dfy) / denom;

            zx -= divX;
            zy -= divY;

            if (divX * divX + divY * divY < 1e-5) break;
        }

        let basin = 0;
        let d0 = (zx - 1) * (zx - 1) + zy * zy;
        let d1 = (zx + 0.5) * (zx + 0.5) + (zy - 0.866025) * (zy - 0.866025);
        let d2 = (zx + 0.5) * (zx + 0.5) + (zy + 0.866025) * (zy + 0.866025);
        
        if (d1 < d0 && d1 < d2) basin = 1;
        else if (d2 < d0 && d2 < d1) basin = 2;

        let warpOnTop = false;
        if (basin === 0) warpOnTop = (i + j) % 2 === 0; 
        else if (basin === 1) warpOnTop = (i + j * 2) % 3 === 0; 
        else warpOnTop = (i + j * 3) % 5 === 0; 

        let phase = Math.atan2(zy, zx);
        let stress = iters / maxIters;
        let dispX = Math.cos(phase + time) * stress * cellSize * 1.8;
        let dispY = Math.sin(phase + time) * stress * cellSize * 1.8;

        let cx = (i - 1) * cellSize + dispX;
        let cy = (j - 1) * cellSize + dispY;

        nodes[i][j] = { cx, cy, iters, warpOnTop, basin, stress };
    }
}

// 3. Mini Render Pipeline (Painter's Algorithm + Batching)
const layer1_WarpUnder = new Map(); 
const layer2_WeftAll = new Map();   
const layer3_WarpOver = new Map();  

const weftColors = ["#5c3a1e", "#a0522d", "#2d1b00"];

const addOp = (map, color, op) => {
    if (!map.has(color)) map.set(color, []);
    map.get(color).push(op);
};

for (let i = 1; i < cols - 1; i++) {
    for (let j = 1; j < rows - 1; j++) {
        const node = nodes[i][j];

        const prevWarp = nodes[i][j - 1];
        const nextWarp = nodes[i][j + 1];
        const prevWeft = nodes[i - 1][j];
        const nextWeft = nodes[i + 1][j];

        const warpTopX = (prevWarp.cx + node.cx) / 2;
        const warpTopY = (prevWarp.cy + node.cy) / 2;
        const warpBotX = (nextWarp.cx + node.cx) / 2;
        const warpBotY = (nextWarp.cy + node.cy) / 2;

        const weftLeftX = (prevWeft.cx + node.cx) / 2;
        const weftLeftY = (prevWeft.cy + node.cy) / 2;
        const weftRightX = (nextWeft.cx + node.cx) / 2;
        const weftRightY = (nextWeft.cy + node.cy) / 2;

        // Thin-film Iridescence for Warp
        const thickness = 350 + node.iters * 28 + Math.sin(i * 0.15 + time) * 120;
        const t_q = Math.floor(thickness / 15) * 15; 
        const r = Math.floor((0.5 + 0.5 * Math.cos(t_q / 650 * Math.PI * 2)) * 255);
        const g = Math.floor((0.5 + 0.5 * Math.cos(t_q / 510 * Math.PI * 2)) * 255);
        const b = Math.floor((0.5 + 0.5 * Math.cos(t_q / 440 * Math.PI * 2)) * 255);
        const warpColor = `rgb(${r},${g},${b})`;
        const weftColor = weftColors[node.basin];

        const frayed = node.stress > 0.85;

        const weftOp = { x1: weftLeftX, y1: weftLeftY, cx: node.cx, cy: node.cy, x2: weftRightX, y2: weftRightY, frayed: false };
        const warpOp = { x1: warpTopX, y1: warpTopY, cx: node.cx, cy: node.cy, x2: warpBotX, y2: warpBotY, frayed, stress: node.stress };

        addOp(layer2_WeftAll, weftColor, weftOp);

        if (node.warpOnTop) {
            addOp(layer3_WarpOver, warpColor, warpOp);
        } else {
            addOp(layer1_WarpUnder, warpColor, warpOp);
        }
    }
}

// 4. Render Layers
ctx.lineCap = 'round';

const renderWeft = (layerMap) => {
    for (let [color, ops] of layerMap.entries()) {
        ctx.strokeStyle = color;
        ctx.lineWidth = cellSize * 0.45;
        ctx.beginPath();
        for (let op of ops) {
            ctx.moveTo(op.x1, op.y1);
            ctx.quadraticCurveTo(op.cx, op.cy, op.x2, op.y2);
        }
        ctx.stroke();
    }
};

const renderWarp = (layerMap) => {
    for (let [color, ops] of layerMap.entries()) {
        // Base Silk Thread
        ctx.strokeStyle = color;
        ctx.lineWidth = cellSize * 0.45;
        ctx.beginPath();
        for (let op of ops) {
            if (!op.frayed) {
                ctx.moveTo(op.x1, op.y1);
                ctx.quadraticCurveTo(op.cx, op.cy, op.x2, op.y2);
            }
        }
        ctx.stroke();

        // Anisotropic Highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = cellSize * 0.12;
        ctx.beginPath();
        for (let op of ops) {
            if (!op.frayed) {
                ctx.moveTo(op.x1, op.y1);
                ctx.quadraticCurveTo(op.cx, op.cy, op.x2, op.y2);
            }
        }
        ctx.stroke();

        // Frayed / Glitched Threads (Entropy Mutator)
        ctx.lineWidth = cellSize * 0.08;
        ctx.strokeStyle = color;
        ctx.beginPath();
        for (let op of ops) {
            if (op.frayed) {
                for(let f = 0; f < 4; f++) {
                    let jx = (Math.sin(op.cx * 17.3 + f * 2.1) * 0.5) * cellSize * 0.4;
                    let jy = (Math.cos(op.cy * 31.7 + f * 1.9) * 0.5) * cellSize * 0.4;
                    ctx.moveTo(op.x1 + jx, op.y1 + jy);
                    ctx.quadraticCurveTo(op.cx + jx, op.cy + jy, op.x2 + jx, op.y2 + jy);
                }
            }
        }
        ctx.stroke();
    }
};

renderWarp(layer1_WarpUnder);
renderWeft(layer2_WeftAll);
renderWarp(layer3_WarpOver);