const out = [];
const w = grid.cols;
const h = grid.rows;
const asp = 2.0;

const nodes = [
    { c: '#CCFF00', r: 0.35, s: 0.8, p: 0.0, name: 'Physarum' }, 
    { c: '#39FF14', r: 0.40, s: -0.6, p: 2.0, name: 'Fuligo' },   
    { c: '#FF007F', r: 0.25, s: 0.9, p: 4.0, name: 'Arcyria' }    
];

const bgColors = ['#0a001a', '#1a0033', '#2a004d', '#3a0066', '#4a0080'];
const slimeChars = ['@', '8', '&', '%', 'S', '~', '+', '-', '.'];

for (let y = 0; y < h; y++) {
    const row = [];
    const cy = (y - h / 2) * asp;
    
    for (let x = 0; x < w; x++) {
        const cx = x - w / 2;
        
        // --- PSYCHEDELIC POP / BLACKLIGHT BACKGROUND ---
        const rGlobal = Math.sqrt(cx * cx + cy * cy);
        const aGlobal = Math.atan2(cy, cx);
        
        // Celestial / Groovy Spiral
        const spiral = Math.sin(rGlobal * 0.15 - aGlobal * 5 - time * 3) + 
                       Math.cos(rGlobal * 0.1 + aGlobal * 3 + time * 2);
        
        let bgChar = ' ';
        let bgColor = bgColors[0];
        
        if (spiral > 1.5) { bgChar = '*'; bgColor = '#00FFFF'; }
        else if (spiral > 1.0) { bgChar = '+'; bgColor = '#7F00FF'; }
        else if (spiral > 0.5) { bgChar = ':'; bgColor = bgColors[4]; }
        else if (spiral > 0.0) { bgChar = '.'; bgColor = bgColors[2]; }
        
        // --- SLIME MOLD PARTY TIME (METABALLS + NETWORK) ---
        // Create an organic cellular network pattern for the veins
        const network = Math.abs(
            Math.sin(x * 0.12 + time * 0.8) * Math.cos(cy * 0.12 - time * 0.7) +
            Math.sin(x * 0.07 - cy * 0.07 + time * 1.2)
        ); 
        
        let mSum = 0;
        let maxInf = 0;
        let domColor = bgColor;
        
        for (let i = 0; i < nodes.length; i++) {
            const nd = nodes[i];
            // Pulsing, dancing movement
            const pulse = 1.0 + 0.1 * Math.sin(time * 4 + i);
            const nx = w / 2 + Math.cos(time * nd.s + nd.p) * w * nd.r * pulse;
            const ny = h / 2 + Math.sin(time * nd.s * 1.3 + nd.p) * h * nd.r * 0.5 * pulse;
            
            const dx = x - nx;
            const dy = (y - ny) * asp;
            const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
            
            const influence = 10 / dist;
            mSum += influence;
            
            if (influence > maxInf) {
                maxInf = influence;
                domColor = nd.c;
            }
        }
        
        // Slime spreads along the network lines (where network is LOW)
        const slimeValue = mSum * (2.5 - network);
        
        let char = bgChar;
        let color = bgColor;
        
        // Render the Slime Mold Organism
        if (slimeValue > 2.5) {
            char = slimeChars[0]; color = '#FFFFFF'; // Nucleus glowing hot
        } else if (slimeValue > 1.8) {
            char = slimeChars[1]; color = domColor;
        } else if (slimeValue > 1.2) {
            char = slimeChars[2]; color = domColor;
        } else if (slimeValue > 0.8) {
            char = slimeChars[3]; color = domColor;
        } else if (slimeValue > 0.5) {
            char = slimeChars[4]; color = '#FF5500'; // Orange fringe
        } else if (slimeValue > 0.3) {
            char = slimeChars[5]; color = '#AA00AA'; // Purple tendrils blending into bg
        } else {
            // Floating Party Spores
            const spore = Math.sin(x * 0.3 + time * 2.5) * Math.cos(cy * 0.3 - time * 1.8);
            if (spore > 0.95) {
                char = 'O'; color = '#FFFF66'; // Laser Lemon
            } else if (spore > 0.90) {
                char = 'o'; color = '#FF1493'; // Deep Pink
            }
        }
        
        row.push({ char, color });
    }
    out.push(row);
}

return out;