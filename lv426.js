const result = [];
const aspect = grid.cols / grid.rows;
const chars = ' .:-=+*#%@'.split('');

for (let y = 0; y < grid.rows; y++) {
    const row = [];
    for (let x = 0; x < grid.cols; x++) {
        const nx = (x / grid.cols - 0.5) * 2 * aspect;
        const ny = (y / grid.rows - 0.5) * 2;
        
        const r = Math.sqrt(nx * nx + ny * ny);
        const a = Math.atan2(ny, nx);
        
        let char = ' ';
        let color = '#000000';

        // 1. REPO 1 & 2: Art Nouveau (flowing) + Op Art (Moire) + LV426 (Biomechanical)
        // Creating the walls of the derelict ship
        const phase = time * 0.5;
        const structureY = ny + Math.sin(nx * 5 + phase) * 0.2;
        const structureX = nx + Math.cos(ny * 5 - phase) * 0.2;
        
        // Retinal surrealism interference pattern
        const moire = Math.sin(structureX * 40) * Math.cos(structureY * 40);
        
        // Giger-esque ribbed tubes
        const tubes = Math.sin(structureY * 20 + moire * 1.5);
        const bioField = (tubes + Math.cos(r * 15 - time)) / 2;

        const charIdx = Math.max(0, Math.min(chars.length - 1, Math.floor(((bioField + 1) / 2) * chars.length)));
        char = chars[charIdx];

        // Biomechanical color palette
        if (bioField > 0.6) color = '#cfd8dc'; 
        else if (bioField > 0.2) color = '#546e7a'; 
        else if (bioField > -0.2) color = '#263238'; 
        else color = '#0a0e10';

        // 2. REPO 3: LV426 Motion Tracker Radar Sweep
        const sweepAngle = (time * 1.5) % (Math.PI * 2) - Math.PI;
        let angleDiff = a - sweepAngle;
        
        while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        
        const distToBeam = Math.abs(angleDiff);
        const radarGlow = Math.max(0, 1 - distToBeam * 3);

        if (radarGlow > 0) {
            if (radarGlow > 0.9) {
                color = '#00ff41'; // Beam core
                char = '+';
            } else {
                color = radarGlow > 0.5 ? '#008f11' : color; // Radar trail illumination
            }
        }

        // 3. REPO 3: The Xenomorph Egg (Central Motif)
        const eggX = nx;
        const eggY = ny + 0.1;
        const dEgg = Math.sqrt(eggX * eggX + eggY * eggY * 0.6); // Oval shape
        const eggContour = 0.25 + Math.sin(a * 12 + time * 2) * 0.01; // Breathing organic edge

        if (dEgg < eggContour) {
            const isTop = eggY < -0.05;
            const slit = isTop && (Math.abs(eggX) < 0.03 || Math.abs(eggY + 0.12) < 0.03);
            
            if (slit) {
                char = '@';
                color = '#ccff00'; // Acid green glow from inside
            } else {
                const shell = Math.sin(eggX * 40) * Math.cos(eggY * 40 + time);
                char = shell > 0 ? '%' : '#';
                color = '#2d3b2c'; // Dark bio-leathery green
            }
        } else if (dEgg < eggContour + 0.02) {
            char = '~';
            color = '#ccff00'; // Acid slime outline
        }

        row.push({ char, color });
    }
    result.push(row);
}

// 4. REPO 3: MU-TH-UR 6000 Terminal Overlay (Mainframe Systems)
const lines = [
    "WEYLAND-YUTANI CORP // MU-TH-UR 6000",
    "SYSTEM OVERRIDE... ACCEPTED",
    "SPECIAL ORDER 937: PRIORITY ONE",
    "INSURE RETURN OF ORGANISM FOR ANALYSIS.",
    "ALL OTHER CONSIDERATIONS SECONDARY.",
    "CREW EXPENDABLE."
];

const typeSpeed = 0.6;
const visibleLines = Math.floor(time * typeSpeed);

for (let l = 0; l < lines.length; l++) {
    const text = lines[l];
    const startX = 2;
    const startY = 1 + l * 2;
    
    if (l < visibleLines) {
        for (let i = 0; i < text.length; i++) {
            if (startY < grid.rows && startX + i < grid.cols) {
                result[startY][startX + i] = { char: text[i], color: '#00ff41' };
            }
        }
    } else if (l === visibleLines) {
        const charsToShow = Math.floor((time * typeSpeed - l) * text.length * 2);
        for (let i = 0; i < charsToShow && i < text.length; i++) {
            if (startY < grid.rows && startX + i < grid.cols) {
                result[startY][startX + i] = { char: text[i], color: '#00ff41' };
            }
        }
        if (charsToShow < text.length && startY < grid.rows && startX + charsToShow < grid.cols) {
            if (Math.floor(time * 10) % 2 === 0) {
                result[startY][startX + charsToShow] = { char: '█', color: '#00ff41' };
            }
        }
    }
}

return result;