const N = mouse.isPressed ? 7 : 5;
const cx = grid.cols / 2;
const cy = grid.rows / 2;

const mx = typeof mouse.x !== 'undefined' ? mouse.x : cx;
const my = typeof mouse.y !== 'undefined' ? mouse.y : cy;

const mdx = (mx - cx) / cx;
const mdy = (my - cy) / cy;

const zoom = 0.15 + (mdy + 1) * 0.15;
const globalPhase = time * 1.5;
const rotation = mdx * Math.PI;

const angles = [];
for (let i = 0; i < N; i++) {
    let a = i * Math.PI / N;
    angles.push({ c: Math.cos(a), s: Math.sin(a) });
}

const chars = " .'-~:+=xXoO8Q&@";
const repoText = "QUASICRYSTALS";

const output = [];
for (let y = 0; y < grid.rows; y++) {
    const row = [];
    for (let x = 0; x < grid.cols; x++) {
        let px = (x - cx) * zoom;
        let py = (y - cy) * zoom * 2.0; 
        
        let rx = px * Math.cos(rotation) - py * Math.sin(rotation);
        let ry = px * Math.sin(rotation) + py * Math.cos(rotation);
        
        let val = 0;
        for (let i = 0; i < N; i++) {
            val += Math.cos(rx * angles[i].c + ry * angles[i].s + globalPhase);
        }
        
        let norm = (val + N) / (2 * N);
        
        norm = Math.sin((norm - 0.5) * Math.PI) * 0.5 + 0.5;
        norm = Math.max(0, Math.min(1, norm));
        
        let charIdx = Math.floor(norm * (chars.length - 1));
        let char = chars[charIdx];
        
        if (norm > 0.8) {
            let textIdx = Math.floor(((val + time) * 4) % repoText.length);
            if (textIdx < 0) textIdx += repoText.length;
            char = repoText[textIdx];
        }
        
        let hue = (norm * 300 + time * 40 - distToCenter(x, y, cx, cy)) % 360;
        let lum = 10 + norm * 70;
        let color = `hsl(${hue}, 100%, ${lum}%)`;
        
        let distToMouse = Math.sqrt((x - mx)**2 + (y - my)**2);
        let mouseRipple = Math.max(0, 1 - distToMouse / 12);
        let size = 10 + norm * 8 + mouseRipple * (mouse.isPressed ? 18 : 6);
        
        if (mouseRipple > 0.8 && mouse.isPressed) {
            color = '#ffffff';
            char = '*';
        }
        
        row.push({ char, color, size: Math.round(size) });
    }
    output.push(row);
}

function distToCenter(x, y, cx, cy) {
    return Math.sqrt((x - cx)**2 + (y - cy)**2);
}

return output;