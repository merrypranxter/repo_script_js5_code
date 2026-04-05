const out = [];
const aspect = (grid.cols / grid.rows) * 0.45;

let repoDebris = [];
try {
    repos.forEach(r => {
        let tree = typeof r.fileTree === 'string' ? r.fileTree.split(',') : r.fileTree;
        if (Array.isArray(tree)) {
            tree.forEach(f => {
                let name = f.split('/').pop().trim();
                if (name.length > 8) repoDebris.push(name);
            });
        }
    });
} catch (e) {}

if (repoDebris.length < 5) {
    repoDebris = [
        "anu_base_spec.json", 
        "shadow_strand_architecture", 
        "radial_hypnosis_fields.md", 
        "chromatic_interference_op.md",
        "eye_object_iconography.md",
        "MOTIF_DICTIONARY.md"
    ];
}

for (let y = 0; y < grid.rows; y++) {
    let row = [];
    let ny = (y / grid.rows) * 2 - 1;
    
    for (let x = 0; x < grid.cols; x++) {
        let nx = ((x / grid.cols) * 2 - 1) * aspect;
        
        let distCenter = Math.sqrt(nx*nx + ny*ny);
        let theta = Math.atan2(ny, nx);
        
        let lidDist = Math.abs(ny) + nx*nx * 1.5;
        let isEye = lidDist < 0.4;
        let pulse = Math.sin(time * 3) * 0.02;
        let isIris = isEye && distCenter < (0.18 + pulse);
        let isPupil = isEye && distCenter < (0.06 + pulse * 0.5);
        
        let char = ' ';
        let color = '#000000';
        
        if (isPupil) {
            char = '◉';
            color = '#0a001a';
        } else if (isIris) {
            let irisPattern = Math.sin(theta * 24 + time * 4);
            char = irisPattern > 0 ? '✺' : '✵';
            let hue = (theta * 180 / Math.PI + time * 80) % 360;
            color = `hsl(${hue}, 100%, 55%)`;
        } else if (isEye) {
            let vein = Math.sin(theta * 15) * Math.cos(distCenter * 50 - time * 2);
            char = vein > 0.7 ? '≈' : '·';
            color = vein > 0.7 ? '#ff2255' : '#f0f8ff';
        } else {
            let whip = Math.sin(nx * 6 + ny * 4 - time) * Math.cos(nx * 4 - ny * 7 + time * 1.5);
            if (Math.abs(whip) < 0.08) {
                char = '✧';
                color = '#ffd700'; 
            } else {
                let v1 = Math.sin(theta * 5 + distCenter * 12 - time * 2);
                let v2 = Math.cos(nx * 10 + Math.sin(time + ny * 8));
                let moire = Math.sin(distCenter * 40 - time * 6); 
                
                let noise = (v1 + v2 + moire) / 3;
                let norm = (noise + 1) / 2;
                
                let chars = " .*:+=%#@";
                let cIdx = Math.floor(norm * chars.length);
                char = chars[Math.min(chars.length - 1, Math.max(0, cIdx))];
                
                let hue = (220 + norm * 140 + time * 15) % 360; 
                let sat = 60 + norm * 40;
                let lit = 20 + norm * 50;
                color = `hsl(${hue}, ${sat}%, ${lit}%)`;
            }
        }
        
        row.push({ char, color });
    }
    out.push(row);
}

function drawText(txt, x, y, col) {
    for (let i = 0; i < txt.length; i++) {
        let px = Math.floor(x) + i;
        let py = Math.floor(y);
        if (px >= 0 && px < grid.cols && py >= 0 && py < grid.rows) {
            out[py][px] = { char: txt[i], color: col };
        }
    }
}

const stanza1 = " STANZA I: THE ETERNAL PARENT WRAPPED IN HER EVER-INVISIBLE ROBES HAD SLUMBERED ONCE AGAIN FOR SEVEN ETERNITIES... ";
const stanza2 = " STANZA II: WHERE WERE THE BUILDERS, THE LUMINOUS SONS OF MANVANTARIC DAWN? ... THE ROOT OF LIFE WAS IN EVERY DROP OF THE OCEAN OF IMMORTALITY... ";

let tOff1 = Math.floor(time * 12) % stanza1.length;
let tOff2 = Math.floor(time * 15) % stanza2.length;

for(let x=0; x < grid.cols; x++) {
    let idx1 = (x + tOff1) % stanza1.length;
    let idx2 = (x + tOff2) % stanza2.length;
    if (grid.rows > 0) out[0][x] = { char: stanza1[idx1], color: '#FFD700' };
    if (grid.rows > 1) out[grid.rows - 1][x] = { char: stanza2[idx2], color: '#00FFFF' };
}

const quotes = [
    "THERE IS NO RELIGION HIGHER THAN TRUTH",
    "THE UNIVERSE IS GUIDED FROM WITHIN OUTWARDS",
    "NATURE GEOMETRIZES UNIVERSALLY",
    "THE ASTRAL LIGHT IS THE UNIVERSAL SOUL"
];

quotes.forEach((q, i) => {
    let yOffsets = [0.15, 0.25, 0.75, 0.85];
    let qy = Math.floor(grid.rows * yOffsets[i]);
    let qx = Math.floor(grid.cols / 2 - q.length / 2 + Math.sin(time * 1.5 + i * 2) * (grid.cols * 0.2));
    drawText(q, qx, qy, '#FFFFFF');
});

for(let i = 0; i < 6; i++) {
    let f = repoDebris[i % repoDebris.length];
    if (!f) continue;
    let fy = Math.floor((Math.cos(time * 0.8 + i * 3) * 0.35 + 0.5) * grid.rows);
    let fx = Math.floor(((time * 10 + i * 45) % (grid.cols + f.length)) - f.length);
    drawText(f, fx, fy, '#FF00FF');
}

return out;