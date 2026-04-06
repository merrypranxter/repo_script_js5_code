const output = [];
const alienChars = ['X', 'E', 'N', 'O', 'M', 'O', 'R', 'P', 'H', 'A', 'S', 'H', 'L', 'V', '4', '2', '6'];
const opChars = ['@', 'O', '0', 'o', '.', ' '];
const nouveauChars = ['S', '~', '(', ')', '{', '}', 'c', 'C'];

const cx_center = grid.cols * 6;
const cy_center = grid.rows * 10;

for (let y = 0; y < grid.rows; y++) {
    const row = [];
    for (let x = 0; x < grid.cols; x++) {
        const px = x * 12;
        const py = y * 20;
        
        const dx = px - mouse.x;
        const dy = py - mouse.y;
        const mdist = Math.sqrt(dx*dx + dy*dy);
        const mangle = Math.atan2(dy, dx);
        
        const dcx = px - cx_center;
        const dcy = py - cy_center;
        const cdist = Math.sqrt(dcx*dcx + dcy*dcy);
        const cangle = Math.atan2(dcy, dcx);

        const nouveau = Math.abs(
            Math.sin(px * 0.015 + Math.sin(py * 0.01 - time * 0.3) * 2) + 
            Math.cos(py * 0.015 + Math.sin(px * 0.01 + time * 0.2) * 2)
        );

        const twist = Math.sin(cdist * 0.02) * 4;
        const op1 = Math.sin(cdist * 0.05 - time * 3);
        const op2 = Math.cos(cangle * 8 + twist - time);
        const op = op1 * op2; 

        const pulse = Math.sin(time * 6) * 15;
        const radius = mouse.isPressed ? 180 + pulse : 100 + pulse;
        const bioEdge = radius + 
                        Math.sin(mangle * 10 + time * 5) * 20 + 
                        Math.cos(mangle * 4 - time * 3) * 30 + 
                        Math.sin(mdist * 0.15 - time * 8) * 15;

        let char = ' ';
        let color = '#ffffff';
        let size = 12;

        if (mdist < bioEdge) {
            const depth = Math.max(0, 1 - (mdist / bioEdge)); 
            const charIdx = Math.floor(Math.abs(mangle * 10 + time * 5)) % alienChars.length;
            char = alienChars[charIdx];
            
            const g = Math.floor(255 * depth);
            const b = Math.floor(40 + 80 * (1 - depth));
            color = `rgb(15, ${g}, ${b})`;
            
            size = 10 + depth * 18 + Math.sin(mdist * 0.3 - time * 12) * 4;
            
        } else if (nouveau < 0.4) {
            const charIdx = Math.floor((px + py) * 0.1) % nouveauChars.length;
            char = nouveauChars[charIdx];
            
            const isGold = nouveau < 0.2;
            color = isGold ? '#d4af37' : '#2e8b57'; 
            size = 12 + (0.4 - nouveau) * 15;
            
        } else {
            const normalizedOp = Math.max(0, Math.min(1, (op + 1) / 2));
            const opIdx = Math.floor(normalizedOp * (opChars.length - 1));
            char = opChars[opIdx];
            
            if (op > 0.7) {
                color = '#ff0055'; 
                size = 14 + op * 4;
            } else if (op < -0.7) {
                color = '#00eeff'; 
                size = 14 - op * 4;
            } else {
                const bw = op > 0 ? 255 : 30;
                color = `rgb(${bw}, ${bw}, ${bw})`;
                size = 12;
            }
        }
        
        row.push({ char, color, size });
    }
    output.push(row);
}
return output;