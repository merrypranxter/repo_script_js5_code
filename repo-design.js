const output = [];
const colors = ['#FF1493', '#00FFFF', '#FF4500', '#39FF14', '#9400D3', '#FFD700'];
const chars = [' ', '.', '·', '°', '○', '●', '✿', '❀', '❃', '★', '✧', '⬡', '∞', '△', '⚗'];
const aspect = grid.cols / grid.rows;

for (let y = 0; y < grid.rows; y++) {
    const row = [];
    const ny = y / grid.rows;
    for (let x = 0; x < grid.cols; x++) {
        const nx = x / grid.cols;
        
        // Mouse interaction distance
        const dx = (x * 12) - mouse.x;
        const dy = (y * 12) - mouse.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const ripple = Math.max(0, 150 - dist) / 150;

        // GLSL-style coordinate setup (Astral OS)
        const cx = (nx - 0.5) * aspect;
        const cy = ny - 0.5;
        const r = Math.sqrt(cx*cx + cy*cy);
        const a = Math.atan2(cy, cx);

        // 1. Base Psychedelic Groovy Waves & Astral Spiral
        let wave1 = Math.sin(nx * 15 + time * 3);
        let wave2 = Math.cos(ny * 15 - time * 2);
        let astral = Math.sin(a * 8 + r * 25 - time * 5);
        
        let v = (wave1 + wave2 + astral) / 3; 
        v += ripple * Math.sin(dist * 0.1 - time * 12) * 0.8;

        let val = Math.abs(v * chars.length * 1.5);
        let charIdx = Math.floor(val) % chars.length;
        let char = chars[charIdx];

        let colorIdx = Math.floor(Math.abs(v * colors.length * 2 - time * 4)) % colors.length;
        let color = colors[colorIdx];

        let size = 10 + (Math.abs(v) * 8) + (ripple * 12);

        // 2. DNA Strand Motif (Shadow Strand Architecture)
        let dnaX = Math.sin(ny * 10 - time * 2) * 0.2;
        let dnaDist = Math.abs(cx - dnaX);
        if (dnaDist < 0.05) {
            if (dnaDist < 0.015) {
                char = '⚗';
                color = '#FFFFFF';
                size = 14 + ripple * 10;
            } else {
                char = (y % 2 === 0) ? '⬡' : '∞';
                color = '#9400D3'; 
                size = 12 + ripple * 8;
            }
        }

        // 3. Floating Clouds (Psychedelic Pop)
        let cloudX1 = (time * 0.2) % 2.5 - 1.0;
        let cloudY1 = 0.2 + Math.sin(time) * 0.05;
        let distCloud1 = Math.sqrt(Math.pow(cx - cloudX1, 2) + Math.pow(ny - cloudY1, 2));

        let cloudX2 = 1.0 - (time * 0.15) % 2.5;
        let cloudY2 = 0.8 + Math.cos(time * 0.8) * 0.05;
        let distCloud2 = Math.sqrt(Math.pow(cx - cloudX2, 2) + Math.pow(ny - cloudY2, 2));

        let cloudNoise = Math.sin(nx * 40) * Math.cos(ny * 40) * 0.03;
        if (distCloud1 + cloudNoise < 0.12 || distCloud2 + cloudNoise < 0.1) {
            char = '☁';
            let ccidx = Math.floor(time * 3 + nx * 10) % colors.length;
            if (ccidx < 0) ccidx += colors.length;
            color = colors[ccidx];
            size = 14 + Math.sin(time * 4 + x) * 3;
        }

        // 4. Central Anu Core (Elemental Geometries)
        let isAnuCore = r < 0.15 + Math.sin(a * 4 + time * 6) * 0.03;
        if (isAnuCore) {
            char = r < 0.05 ? '●' : '△';
            let coreCidx = Math.floor(time * 15 - r * 50) % colors.length;
            if (coreCidx < 0) coreCidx += colors.length;
            color = colors[coreCidx];
            size = 16 + Math.sin(time * 8) * 4;
            
            if (r < 0.02) {
                char = '✧';
                color = '#FFFFFF';
                size = 24;
            }
        }

        // 5. Interactive Mouse Effects
        if (mouse.isPressed && dist < 100) {
            char = '☼';
            color = (Math.random() > 0.4) ? '#FFFFFF' : '#FF1493';
            size += 10 + Math.random() * 12;
        } else if (dist < 40) {
            char = '✦';
            color = '#FFD700';
            size += 5;
        }

        row.push({ char, color, size });
    }
    output.push(row);
}
return output;