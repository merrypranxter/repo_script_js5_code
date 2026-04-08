const output = [];
const t = time;
const mx = mouse.x / 10;
const my = mouse.y / 15;
const isGlitching = mouse.isPressed || Math.sin(t * 2.5) > 0.85;

const y2kString = "<BLINK> 404_NOT_FOUND href= y2k.exe www. </MARQUEE> ";
const y2kChars = y2kString.split("");

for (let y = 0; y < grid.rows; y++) {
    const row = [];
    
    let tearOffset = 0;
    if (Math.sin(y * 0.4 + t * 12) > (isGlitching ? 0.1 : 0.98)) {
        tearOffset = Math.floor(Math.sin(t * 25 + y) * 15);
    }

    for (let x = 0; x < grid.cols; x++) {
        let xx = x + tearOffset;
        
        let cx1 = grid.cols / 2 + Math.sin(t * 1.3) * (grid.cols / 3);
        let cy1 = grid.rows / 2 + Math.cos(t * 0.9) * (grid.rows / 3);
        let cx2 = mx || grid.cols / 2;
        let cy2 = my || grid.rows / 2;
        
        let dx1 = xx - cx1;
        let dy1 = (y - cy1) * 2; 
        let d1 = Math.sqrt(dx1*dx1 + dy1*dy1);
        
        let dx2 = xx - cx2;
        let dy2 = (y - cy2) * 2;
        let d2 = Math.sqrt(dx2*dx2 + dy2*dy2);
        
        let v = Math.sin(d1 * 0.6 - t * 5) + Math.sin(d2 * 0.5 + t * 3.5);
        let angle = Math.atan2(dy1, dx1);
        v += Math.cos(angle * 10 + t * 2); 
        
        const chars = " .:-=+*#%@";
        let charIdx = Math.floor((v + 3) / 6 * 10);
        let char = chars[Math.max(0, Math.min(9, charIdx))];
        let color = "#e0e0e0";
        let size = 12;

        if ((xx + Math.floor(t * 5)) % 31 === 0 && Math.sin(y * 0.2 - t * 15) > 0.2) {
            char = '|';
            color = "#555555";
            size = 14 + Math.random() * 6;
        }
        if (Math.random() < 0.001) {
            char = '*';
            color = "#ffffff";
            size = 20;
        }

        if (Math.abs(v) > 2.2 || (isGlitching && Math.random() < 0.15)) {
            const glitchChars = "█▓▒░<>/?#@";
            char = glitchChars[Math.floor(Math.random() * glitchChars.length)];
            color = ["#ff00ff", "#00ffff", "#00ff00", "#ffff00", "#ff0000"][Math.floor(Math.random() * 5)];
            size = isGlitching ? 12 + Math.random() * 12 : 14;
            if (isGlitching) {
                xx += Math.floor(Math.random() * 5 - 2); 
            }
        }

        if (y % 9 === 0) {
            let speed = 10 + (y % 4) * 5;
            let offset = Math.floor(t * speed);
            if (x > offset % grid.cols && x < (offset % grid.cols) + y2kChars.length) {
                let wordIdx = x - (offset % grid.cols);
                char = y2kChars[wordIdx] || char;
                color = isGlitching ? "#ff00ff" : "#0044ff"; 
                size = 14;
            }
        }

        let mDist = Math.sqrt((x * 10 - mouse.x)**2 + (y * 15 - mouse.y)**2);
        if (mDist < 60) {
            let intensity = (60 - mDist) * 0.3;
            size += intensity;
            if (mouse.isPressed) {
                char = "OP"[Math.floor(Math.random() * 2)];
                color = "#00ffff";
            }
        }

        row.push({ char, color, size });
    }
    output.push(row);
}
return output;