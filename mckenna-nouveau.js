const output = [];
const text = " NOVELTY CONCRESCENCE ESCHATON TIMEWAVEZERO ARCHAICREVIVAL PSILOCYBE ";
const cx = grid.cols / 2;
const cy = grid.rows / 2;

const gold = "#d4af37";
const darkGreen = "#2a3b2c";
const paleYellow = "#f3e5ab";
const purp = "#5e2b97";
const neonCyan = "#00ffff";
const neonPink = "#ff00ff";

for (let y = 0; y < grid.rows; y++) {
    const row = [];
    for (let x = 0; x < grid.cols; x++) {
        const nx = (x - cx) / cx;
        const ny = (y - cy) / cy;
        
        const px = x * 12;
        const py = y * 12;
        const mdx = px - mouse.x;
        const mdy = py - mouse.y;
        const mDist = Math.sqrt(mdx*mdx + mdy*mdy);
        const mInfluence = Math.max(0, 1 - mDist / (mouse.isPressed ? 250 : 120));
        
        let char = " ";
        let color = "#000000";
        let size = 14;
        
        const rad = Math.sqrt(nx*nx + ny*ny);
        const angle = Math.atan2(ny, nx);
        
        const opScale = mouse.isPressed ? 30 : 20;
        const wavePhase = rad * 25 - time * 3 + mInfluence * 8;
        const wave1 = Math.sin(wavePhase);
        const wave2 = Math.sin(nx * opScale + time) * Math.cos(ny * opScale - time);
        const isWave = (wave1 * wave2) > 0.1;
        
        if (isWave) {
            const tIdx = Math.floor(Math.abs(x * 2 + y * 3 + time * 8)) % text.length;
            char = text[tIdx];
            color = mouse.isPressed ? neonCyan : darkGreen;
            size = 10 + mInfluence * 8;
        } else {
            char = ".";
            color = mouse.isPressed ? neonPink : "#1a1a1a";
            size = 8 + mInfluence * 4;
        }
        
        const bDistX = 1.0 - Math.abs(nx);
        const bDistY = 1.0 - Math.abs(ny);
        
        const isOuterFrame = bDistX < 0.04 || bDistY < 0.06;
        const vine1 = Math.abs(bDistX - 0.15 - Math.sin(ny * 8 + time)*0.04) < 0.025;
        const vine2 = Math.abs(bDistY - 0.15 - Math.cos(nx * 8 - time)*0.04) < 0.04;
        const cornerSwirl = rad > 1.1 && Math.sin(rad * 40 - angle * 5 + time * 2) > 0.5;
        
        if (isOuterFrame || vine1 || vine2 || cornerSwirl) {
            char = "❁";
            if ((vine1 && vine2) || isOuterFrame) char = "█";
            if (cornerSwirl && !isOuterFrame) char = "๑";
            
            color = gold;
            size = 14 + (Math.sin(time * 2 + nx * 10 + ny * 10) * 2) + mInfluence * 6;
        }
        
        const mStemXOffset = Math.sin(ny * 4 + time) * 0.03; 
        const adjNx = nx - mStemXOffset;
        
        const stemWidth = 0.03 + (0.5 - ny) * 0.015;
        const isStem = ny > -0.1 && ny < 0.6 && Math.abs(adjNx) < stemWidth;
        
        const isMycelium = ny >= 0.6 && ny < 0.8 && Math.abs(adjNx) < 0.03 + Math.pow(ny - 0.6, 2) * 2.0 && Math.sin(nx * 40 - ny * 20 + time*2) > 0;
        
        const capTop = -0.55 + Math.pow(Math.abs(nx), 1.5) * 1.8;
        const capBottom = -0.15 + Math.pow(Math.abs(nx), 2) * 0.8;
        const isCap = ny > capTop && ny < capBottom && Math.abs(nx) < 0.35;
        
        const isGills = ny >= capBottom && ny < capBottom + 0.04 && Math.abs(nx) < 0.32;
        
        if (isCap) {
            const capText = "CONCRESCENCE";
            char = capText[Math.floor(Math.abs(x - cx)) % capText.length];
            const r = Math.floor(200 + 55 * Math.sin(nx * 10 + time * 2));
            const g = Math.floor(100 + 50 * Math.cos(ny * 10 - time));
            const b = mouse.isPressed ? 255 : 50;
            color = `rgb(${r}, ${g}, ${b})`;
            size = 16 + mInfluence * 8;
        } else if (isGills) {
            char = "|";
            color = "#8b5a2b";
            size = 12;
        } else if (isStem) {
            char = "║";
            color = paleYellow;
            size = 14 + mInfluence * 4;
        } else if (isMycelium) {
            char = "≈";
            color = "#ddccaa";
            size = 10 + Math.sin(time*5 + x)*2;
        }
        
        if (mInfluence > 0.8 && !isCap && !isStem && !isOuterFrame && !vine1 && !vine2 && !isMycelium) {
            char = "✦";
            color = neonPink;
        }
        
        row.push({ char, color, size });
    }
    output.push(row);
}
return output;