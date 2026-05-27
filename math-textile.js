const spacing = 16;
const overlap = 0.55; // Slightly over 0.5 to connect adjacent float segments seamlessly

function palette(t) {
    // Feral Neon Acid + Cosmic Void hybrid (Cosine Palette)
    const a = [0.4, 0.3, 0.5];
    const b = [0.6, 0.6, 0.4];
    const c = [2.0, 1.0, 1.0];
    const d = [0.8, 0.2, 0.25];
    
    return [
        Math.floor((a[0] + b[0] * Math.cos(6.28318 * (c[0] * t + d[0]))) * 255),
        Math.floor((a[1] + b[1] * Math.cos(6.28318 * (c[1] * t + d[1]))) * 255),
        Math.floor((a[2] + b[2] * Math.cos(6.28318 * (c[2] * t + d[2]))) * 255)
    ];
}

function lerpNode(n1, n2, t) {
    return {
        x: n1.x + (n2.x - n1.x) * t,
        y: n1.y + (n2.y - n1.y) * t
    };
}

// The Loom: Warps straight grid coordinates into a tension-warped topological manifold
function computeNode(x, y, time) {
    let bx = x * spacing;
    let by = y * spacing;
    
    // Moiré tension drift (domain warping)
    let tx = Math.sin(y * 0.1 + time * 0.5) * 6 + Math.cos(x * 0.07 - time * 0.3) * 4;
    let ty = Math.cos(x * 0.1 + time * 0.4) * 6 + Math.sin(y * 0.08 + time * 0.2) * 4;
    
    // P-adic time leak / XOR ghost manifold
    let glitch = ((Math.abs(x) ^ Math.abs(y)) & 15) === 0 ? Math.sin(time) * 4 : 0;
    
    return { x: bx + tx + glitch, y: by + ty + glitch };
}

// Resist Dye & Jacquard Logic
function computeCell(x, y, time, cols, rows) {
    // 1. Herringbone / Diamond Twill Base (2/2 broken twill)
    let dir = (Math.floor(x / 5) + Math.floor(y / 5)) % 2 === 0 ? 1 : -1;
    let twill = (x + y * dir) % 4;
    let isWarp = twill < 2;
    
    // 2. Shibori Tie-Dye Infection (Radial symmetry)
    let cx = cols / 2 + Math.sin(time * 0.7) * (cols / 4);
    let cy = rows / 2 + Math.cos(time * 0.5) * (rows / 4);
    let dx = x - cx;
    let dy = y - cy;
    let radius = Math.sqrt(dx * dx + dy * dy);
    let angle = Math.atan2(dy, dx);
    
    // Fold symmetry (Kumo / spiderweb resist)
    let fold = Math.abs(Math.sin(angle * 4 + time * 0.2));
    let dye_penetration = Math.exp(-radius * 0.05) * 2.0 + fold * 0.5;
    
    // 3. Wax Crackle Network
    let crackle = Math.abs(Math.sin(x * 0.8 + Math.cos(y * 0.8 + time * 0.1)) * Math.cos(x * 0.9 - y * 0.7));
    if (crackle < 0.15) {
        isWarp = !isWarp; // The crackle physically inverts the weave structure
        dye_penetration += 0.5; // Dye bleeds heavily into the crack
    }
    
    // 4. Moiré Optical Interference (Structural Color mapping)
    let moire = Math.sin(x * 0.15 + y * 0.05) * Math.sin(x * 0.13 - y * 0.07 - time);
    
    // Final color phase (thin-film interference approximation)
    let color_t = dye_penetration * 1.5 + moire * 0.3 + time * 0.1 + (isWarp ? 0.1 : 0.0);
    
    return { isWarp, color_t };
}

// Main Render Execution
const cols = Math.ceil(grid.width / spacing) + 4;
const rows = Math.ceil(grid.height / spacing) + 4;
const offsetX = -2;
const offsetY = -2;

ctx.fillStyle = '#050505';
ctx.fillRect(0, 0, grid.width, grid.height);

ctx.lineCap = 'butt'; // Crucial for seamless float connections
ctx.lineJoin = 'miter';

// Precompute Manifold Nodes
const nodes = [];
for (let x = offsetX - 1; x <= cols + 1; x++) {
    nodes[x] = [];
    for (let y = offsetY - 1; y <= rows + 1; y++) {
        nodes[x][y] = computeNode(x, y, time);
    }
}

// Precompute Cell States
const cells = [];
for (let x = offsetX; x <= cols; x++) {
    cells[x] = [];
    for (let y = offsetY; y <= rows; y++) {
        cells[x][y] = computeCell(x, y, time, cols, rows);
    }
}

// Render Passes (Weft = Bottom, Warp = Top)
// This creates perfect over/under z-sorting without actual z-buffers.
const passes = [
    { name: 'weft', check: (c) => !c.isWarp },
    { name: 'warp', check: (c) => c.isWarp }
];

passes.forEach(pass => {
    let isWarpPass = pass.name === 'warp';
    
    // 1. Batch Shadows
    ctx.beginPath();
    for (let x = offsetX; x < cols; x++) {
        for (let y = offsetY; y < rows; y++) {
            if (pass.check(cells[x][y])) {
                let nCenter = nodes[x][y];
                if (isWarpPass) {
                    let p1 = lerpNode(nCenter, nodes[x][y - 1], overlap);
                    let p2 = lerpNode(nCenter, nodes[x][y + 1], overlap);
                    ctx.moveTo(p1.x + 3, p1.y + 3);
                    ctx.lineTo(p2.x + 3, p2.y + 3);
                } else {
                    let p1 = lerpNode(nCenter, nodes[x - 1][y], overlap);
                    let p2 = lerpNode(nCenter, nodes[x + 1][y], overlap);
                    ctx.moveTo(p1.x + 3, p1.y + 3);
                    ctx.lineTo(p2.x + 3, p2.y + 3);
                }
            }
        }
    }
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = spacing * 1.1;
    ctx.stroke();

    // 2. Structural Colors (Individual strokes required per color shift)
    ctx.lineWidth = spacing * 0.75;
    for (let x = offsetX; x < cols; x++) {
        for (let y = offsetY; y < rows; y++) {
            if (pass.check(cells[x][y])) {
                let nCenter = nodes[x][y];
                let p1, p2;
                if (isWarpPass) {
                    p1 = lerpNode(nCenter, nodes[x][y - 1], overlap);
                    p2 = lerpNode(nCenter, nodes[x][y + 1], overlap);
                } else {
                    p1 = lerpNode(nCenter, nodes[x - 1][y], overlap);
                    p2 = lerpNode(nCenter, nodes[x + 1][y], overlap);
                }
                
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                
                let c = palette(cells[x][y].color_t);
                ctx.strokeStyle = `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
                ctx.stroke();
            }
        }
    }

    // 3. Batch Anisotropic Highlights (Birefringence edges)
    ctx.beginPath();
    for (let x = offsetX; x < cols; x++) {
        for (let y = offsetY; y < rows; y++) {
            if (pass.check(cells[x][y])) {
                let nCenter = nodes[x][y];
                if (isWarpPass) {
                    let p1 = lerpNode(nCenter, nodes[x][y - 1], overlap);
                    let p2 = lerpNode(nCenter, nodes[x][y + 1], overlap);
                    // Offset highlight slightly to the top-left of the thread
                    ctx.moveTo(p1.x - 2, p1.y);
                    ctx.lineTo(p2.x - 2, p2.y);
                } else {
                    let p1 = lerpNode(nCenter, nodes[x - 1][y], overlap);
                    let p2 = lerpNode(nCenter, nodes[x + 1][y], overlap);
                    ctx.moveTo(p1.x, p1.y - 2);
                    ctx.lineTo(p2.x, p2.y - 2);
                }
            }
        }
    }
    // High-tension threads reflect more light
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = spacing * 0.15;
    ctx.stroke();
});