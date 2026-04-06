const output = [];
const cols = grid.cols;
const rows = grid.rows;
const cw = 12, ch = 12;

const popColors = ['#FF007F', '#00F0FF', '#FFD700', '#FF5722', '#B026FF', '#39FF14'];

const cx = cols / 2;
const cy = rows / 2;

for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
        const mx = mouse.x / cw;
        const my = mouse.y / ch;
        const dxMouse = x - mx;
        const dyMouse = y - my;
        const distMouse = Math.sqrt(dxMouse*dxMouse + dyMouse*dyMouse);
        
        const dx = x - cx;
        const dy = (y - cy) * 2.2; 
        const r = Math.sqrt(dx*dx + dy*dy);
        const a = Math.atan2(dy, dx);
        
        const tunnel = Math.sin(40 / (r/cols + 0.1) - time * 4);
        
        const fluidX = Math.sin(x * 0.1 + time) * 2;
        const fluidY = Math.cos(y * 0.15 - time) * 2;
        
        const rays = Math.sin(a * 10 + time * 2 + fluidX + fluidY);
        const combined = tunnel + rays;
        
        const petals = 7;
        const flowerRadius = 15 + Math.sin(a * petals + time * 3) * 6 + Math.cos(a * 2 - time * 2) * 4;
        const isFlower = r < flowerRadius;
        
        let char = '';
        let color = '';
        let size = 12;
        
        if (isFlower) {
            const flowerLayer = Math.sin(r * 1.5 - time * 6 + a * 3);
            if (flowerLayer > 0.5) {
                char = '✧';
                color = popColors[2];
                size = 18;
            } else if (flowerLayer > -0.2) {
                char = '〰';
                color = popColors[0];
                size = 14;
            } else {
                char = '◉';
                color = popColors[4];
                size = 12;
            }
        } else {
            if (Math.abs(combined) < 0.25) {
                char = '✦';
                color = popColors[Math.floor(Math.abs(r - time*10)) % popColors.length];
                size = 10;
            } else if (combined > 1.4) {
                char = '∆';
                color = popColors[1];
                size = 14;
            } else if (combined < -1.4) {
                char = '✺';
                color = popColors[5];
                size = 16;
            } else {
                const chars = ['░', '▒', '▓', '█', '▀', '▄'];
                char = chars[Math.floor(Math.abs(combined * 4)) % chars.length];
                color = popColors[Math.floor(Math.abs(a * 4 + r * 0.5 - time * 3)) % popColors.length];
            }
        }
        
        if (mouse.isPressed) {
            const bw = Math.sin(r * 2 - time * 15 + a * 10) > 0;
            color = bw ? '#FFFFFF' : '#000000';
            char = bw ? '█' : '▓';
            size = 12 + (bw ? 4 : 0);
        }
        
        const pop = Math.max(0, 10 - distMouse);
        if (pop > 0 && !mouse.isPressed) {
            size += pop * 2;
            char = '◎';
            color = popColors[Math.floor(time * 20 + distMouse) % popColors.length];
        }
        
        row.push({ char, color, size });
    }
    output.push(row);
}
return output;