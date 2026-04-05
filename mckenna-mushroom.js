const output = [];
const text = " CONCRESCENCE · ESCHATON · NOVELTY · TIME WAVE ZERO · ARCHAIC REVIVAL · MACHINE ELVES · TRANSCENDENTAL OBJECT · ";
const borderChars = "✧✦❁❀✿✾✽✺✹✸✶✷".split("");

for (let y = 0; y < grid.rows; y++) {
    const row = [];
    for (let x = 0; x < grid.cols; x++) {
        // Normalized coordinates (-1 to 1)
        let nx = (x - grid.cols / 2) / (grid.cols / 2);
        let ny = (y - grid.rows / 2) / (grid.rows / 2);
        
        // Aspect-ratio corrected coordinates for shapes
        let aspect = grid.cols / grid.rows;
        let cx = nx * aspect * 0.55; 
        let cy = ny;

        // Mouse distance & Lens Distortion (Op Art Funnel/Tunnel)
        const cellW = 10; 
        const cellH = 12;
        const dx = (x * cellW) - mouse.x;
        const dy = (y * cellH) - mouse.y;
        const distMouse = Math.sqrt(dx * dx + dy * dy);
        
        let lensEffect = 0;
        if (mouse.isPressed) {
            lensEffect = 30 / (1 + distMouse * 0.02);
            // Gravitational pull towards mouse
            cx -= (dx * 0.001) * (50 / (distMouse + 1));
            cy -= (dy * 0.001) * (50 / (distMouse + 1));
        } else {
            lensEffect = 12 / (1 + distMouse * 0.05);
        }

        let char = ' ';
        let color = '#000';
        let size = 12 + lensEffect;

        // --- ART NOUVEAU BORDER LOGIC ---
        // Organic, flowing pillars and arches
        const pillar1 = nx + 0.88 + 0.04 * Math.sin(ny * Math.PI * 2.5 + time * 0.8);
        const pillar2 = nx - 0.88 - 0.04 * Math.sin(ny * Math.PI * 2.5 + time * 0.8);
        const isPillar = Math.abs(pillar1) < 0.05 || Math.abs(pillar2) < 0.05;
        
        const arch1 = ny + 0.88 + 0.12 * Math.cos(nx * Math.PI * 1.5);
        const arch2 = ny - 0.88 - 0.12 * Math.cos(nx * Math.PI * 1.5);
        const isArch = Math.abs(arch1) < 0.06 || Math.abs(arch2) < 0.06;
        
        const flourish = Math.sin(nx * 12 + ny * 12) * Math.cos(nx * 12 - ny * 12 - time);
        const isCorner = (Math.abs(nx) > 0.75 && Math.abs(ny) > 0.75 && flourish > 0.4);

        // --- MUSHROOM LOGIC (Psilocybe) ---
        // Cap with umbo (nipple)
        const umbo = 0.15 * Math.exp(-Math.pow(cx * 15, 2));
        const capTop = -0.35 + 1.4 * cx * cx - umbo;
        const capBottom = -0.05 - 0.2 * cx * cx;
        
        const stalkWidth = 0.04 + 0.015 * Math.sin(cy * 15 + time * 1.5);
        
        const isCap = cy > capTop && cy < capBottom;
        const isRing = cy >= capBottom && cy < capBottom + 0.03 && Math.abs(cx) < stalkWidth * 2.2;
        const isStalk = cy >= capBottom && cy < 0.6 && Math.abs(cx) < stalkWidth;
        const isBase = cy >= 0.6 && cy < 0.75 && Math.abs(cx) < stalkWidth + (cy - 0.6) * 0.6;

        // --- RENDER ASSIGNMENT ---
        if (isCap) {
            const capPattern = Math.sin(cx * 40) * Math.cos(cy * 40 - time * 2);
            char = capPattern > 0.4 ? '●' : '✿';
            
            // Volumetric shading for the cap
            const edgeDarken = Math.max(0, Math.min(1, (cy - capTop) / (capBottom - capTop)));
            const hue = 35 - edgeDarken * 25; // Golden to deep rust
            const light = 65 - edgeDarken * 40;
            color = `hsl(${hue}, 85%, ${light}%)`;
            size += 2;
        } else if (isRing) {
            char = '≈';
            color = '#e3d5ca';
        } else if (isStalk || isBase) {
            // Mycelial bruising (Psilocybin oxidation)
            const bruise = Math.sin(cy * 30 - time * 2) * Math.cos(cx * 20);
            char = bruise > 0.4 ? '║' : '│';
            color = bruise > 0.4 ? '#457b9d' : '#f1faee';
        } else if (isPillar || isArch || isCorner) {
            char = borderChars[(x * y) % borderChars.length];
            const goldPulse = 50 + 25 * Math.sin(nx * 8 + ny * 8 + time * 3);
            color = `hsl(45, 90%, ${goldPulse}%)`;
            size += 3;
        } else {
            // --- OP ART / TIME WAVE ZERO BACKGROUND ---
            const r = Math.sqrt(cx * cx + cy * cy);
            const theta = Math.atan2(cy, cx);
            
            // Dual interfering spirals (Moiré fields)
            const spiralText = r * 45 - theta * 5 - time * 4;
            const spiralBg = Math.sin(r * 40 + theta * 4 + time * 2.5);
            
            let textIdx = Math.floor(spiralText) % text.length;
            if (textIdx < 0) textIdx += text.length;
            
            const mainWave = Math.sin(spiralText);
            
            if (mainWave > 0) {
                char = text[textIdx];
                const bgHue = (r * 120 - time * 40) % 360;
                color = `hsl(${bgHue}, 90%, 65%)`;
            } else {
                char = spiralBg > 0.2 ? '〰' : ' ';
                const bgHue = (r * 120 - time * 40 + 180) % 360;
                color = `hsl(${bgHue}, 50%, 15%)`;
            }
        }

        row.push({ char, color, size });
    }
    output.push(row);
}
return output;