const output = [];
const cx = grid.cols / 2;
const cy = grid.rows / 2 + grid.rows * 0.1;
const mckennaText = " CONCRESCENCE ✦ ESCHATON ✦ NOVELTY ✦ TIME WAVE ZERO ✦ TRANSCENDENTAL OBJECT ✦ HYPERSPACE ✦ MACHINE ELVES ✦ ";

const cGold = '#d4af37';
const cPurple = '#800080';
const cMagenta = '#ff00ff';

for (let y = 0; y < grid.rows; y++) {
    const row = [];
    for (let x = 0; x < grid.cols; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx);
        
        const mx = (x * 12) - mouse.x;
        const my = (y * 12) - mouse.y;
        const mouseDist = Math.sqrt(mx*mx + my*my);
        const interact = mouse.isPressed ? 60 / (1 + mouseDist * 0.05) : 0;
        
        let char = ' ';
        let color = '#000000';
        let size = 12 + interact * 0.15;
        
        const capWidth = grid.cols * 0.22;
        const capHeight = grid.rows * 0.35;
        const stemWidth = grid.cols * 0.04;
        const stemHeight = grid.rows * 0.35;
        
        const breath = 1 + 0.05 * Math.sin(time * 2);
        const normDy = Math.max(0, dy / -capHeight);
        const bellWidth = capWidth * breath * (1 - Math.pow(normDy, 1.5));
        const isCapBody = dy <= 0 && dy >= -capHeight && Math.abs(dx) <= bellWidth;
        const capEdgeDist = Math.abs(Math.abs(dx) - bellWidth);
        const isCapEdge = isCapBody && capEdgeDist < 1.5;
        const isGills = isCapBody && dy > -2 && !isCapEdge;
        
        const isStem = dy > 0 && dy < stemHeight && Math.abs(dx) < stemWidth * (1 + 0.2 * Math.sin(dy * 0.3 - time * 2));
        const isMycelium = dy >= stemHeight && dy < stemHeight + 3 && Math.abs(dx) < stemWidth * (1 + (dy - stemHeight) * 1.5);
        
        const haloRadius = capWidth * 1.5;
        const isHalo = dist < haloRadius && dy < stemHeight * 0.2;
        const haloRing = Math.abs(dist - haloRadius) < 1;
        
        const edgeX = Math.min(x, grid.cols - 1 - x);
        const edgeY = Math.min(y, grid.rows - 1 - y);
        const isBorder = edgeX < 2 || edgeY < 2;
        const cornerDist = Math.min(
            Math.hypot(x, y), Math.hypot(grid.cols-x, y),
            Math.hypot(x, grid.rows-y), Math.hypot(grid.cols-x, grid.rows-y)
        );
        const isOrnament = cornerDist < grid.cols * 0.15 && Math.sin(cornerDist * 0.8 - time * 1.5) > 0.2;

        const capPattern = Math.sin(dx * 1.2 + time * 4) * Math.cos(dy * 1.2 - time * 3);
        const spiral = Math.sin(dist * 0.4 - angle * 5 - time * 3 + interact * 0.05);
        
        if (isBorder || isOrnament) {
            const bChars = "§≈~()*+°";
            char = bChars[Math.floor(Math.abs(x + y - time * 3)) % bChars.length];
            color = cGold;
            size *= isOrnament ? 1.2 : 1;
        } else if (isCapEdge) {
            char = '≈';
            color = cGold;
        } else if (isGills) {
            char = dx % 2 === 0 ? '|' : '¦';
            color = '#ffccaa';
        } else if (isCapBody) {
            char = capPattern > 0 ? '@' : 'O';
            color = capPattern > 0 ? cMagenta : cPurple;
            size *= 1.1;
        } else if (isStem) {
            char = dx === 0 ? '|' : (dx < 0 ? '(' : ')');
            color = '#fdf5e6';
        } else if (isMycelium) {
            char = Math.random() > 0.5 ? '/' : '\\';
            color = '#d3d3d3';
        } else if (haloRing) {
            char = '°';
            color = cGold;
        } else if (isHalo) {
            const ray = Math.sin(angle * 20 + time * 0.5) > 0;
            char = ray ? '✧' : '+';
            color = ray ? '#44aa88' : '#114433';
        } else {
            const textIdx = Math.floor(Math.abs(dist * 0.5 + angle * 3 + time * 5)) % mckennaText.length;
            char = mckennaText[textIdx];
            
            if (spiral > 0.5) {
                const hue = Math.floor((dist * 2 - time * 40) % 360);
                color = `hsl(${hue}, 80%, 50%)`;
                size *= 1.1;
                if (char === '✦') {
                    color = cGold;
                    size *= 1.3;
                }
            } else {
                color = '#120a1f';
                size *= 0.8;
            }
        }
        
        row.push({ char, color, size });
    }
    output.push(row);
}
return output;