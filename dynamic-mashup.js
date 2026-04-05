const output = [];
const cx = grid.cols / 2;
const cy = grid.rows / 2;

const rococo = ['§', '&', '~', '(', ')', '{', '}', 'c', 'e', 's', 'z'];
const psychPop = ['*', 'O', '@', 'o', '0', 'Q', 'C', 'G'];
const shoegaze = ['.', ',', ':', ';', '`', '\''];
const dreamGlitch = ['?', '!', '#', '%', '^', '>', '<', '=', '+', '-'];

for (let y = 0; y < grid.rows; y++) {
    const row = [];
    for (let x = 0; x < grid.cols; x++) {
        let dx = x - cx;
        let dy = (y - cy) * 2.2; 
        
        let nx = dx / grid.cols;
        let ny = dy / grid.rows;
        
        let mx = mouse.x - cx;
        let my = (mouse.y - cy) * 2.2;
        let mdx = dx - mx;
        let mdy = dy - my;
        let mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        let mDistNorm = mDist / grid.cols;
        
        if (mouse.isPressed) {
            nx += Math.sin(mDistNorm * 20 - time * 5) * 0.05;
            ny += Math.cos(mDistNorm * 20 - time * 5) * 0.05;
        }

        let r = Math.sqrt(nx * nx + ny * ny);
        let theta = Math.atan2(ny, nx);
        
        let r2 = Math.sqrt(Math.pow(nx - 0.2, 2) + Math.pow(ny - 0.2, 2));
        let moire = Math.sin(r * 50 - time * 4) + Math.sin(r2 * 50 + time * 2);
        let opWave = Math.sin(moire * Math.PI) * Math.cos(theta * 6 + time);
        
        let noiseVal = Math.random();
        
        let hue = (theta * 180 / Math.PI + r * 300 - time * 50) % 360;
        if (hue < 0) hue += 360;
        let sat = 80 + Math.sin(time * 3 + r * 10) * 20;
        let light = 50 + opWave * 20;
        
        let char = ' ';
        let size = 12;
        
        if (noiseVal > 0.85) {
            char = shoegaze[Math.floor(noiseVal * 100) % shoegaze.length];
            sat *= 0.3; 
            light *= 0.5; 
            size = 8;
        } else if (Math.abs(opWave) > 0.8 && noiseVal > 0.8) {
            char = dreamGlitch[Math.floor(noiseVal * 100) % dreamGlitch.length];
            hue = (hue + 180) % 360; 
            light = 80 + Math.random() * 20;
            size = 14 + Math.random() * 6;
        } else if (r < 0.3 + Math.sin(time + theta * 4) * 0.1) {
            let idx = Math.floor(Math.abs(moire * 10)) % rococo.length;
            char = rococo[idx];
            size = 14 + opWave * 4;
        } else {
            let idx = Math.floor(Math.abs(theta * 5 + time * 2)) % psychPop.length;
            char = psychPop[idx];
            size = 10 + Math.sin(r * 20 - time * 4) * 4;
        }
        
        let interactRadius = grid.cols * 0.25;
        if (mDist < interactRadius) {
            let mag = (interactRadius - mDist) / interactRadius;
            size += mag * 15;
            light += mag * 20;
            if (mouse.isPressed) {
                hue = (hue + time * 200) % 360; 
                char = dreamGlitch[Math.floor(Math.random() * dreamGlitch.length)];
            }
        }

        row.push({
            char: char,
            color: `hsl(${hue}, ${sat}%, ${light}%)`,
            size: Math.max(4, size)
        });
    }
    output.push(row);
}
return output;