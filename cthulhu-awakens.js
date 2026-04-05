const out = [];
const words = ["AZATHOTH", "CTHULHU", "GLSL", "KERNEL", "RAFT", "ART_NOUVEAU", "MYTHOS", "VOID", "BOOTING", "DAEMON"];
const chars = " .:-=+*#%@8";

const cx = grid.cols / 2;
const cy = grid.rows / 2;

const osText = "> KERNEL PANIC: CTHULHU_AWAKEN_EVENT INITIATED ... BOOTING AZATHOTH CPU ...";
const textStartX = Math.floor((grid.cols - osText.length) / 2);

for (let y = 0; y < grid.rows; y++) {
    const row = [];
    for (let x = 0; x < grid.cols; x++) {
        let dx = x - cx;
        let dy = (y - cy) * 2.2; // Adjust for typical terminal character aspect ratio
        let r = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx);
        
        let char = ' ';
        let color = '#000000';
        
        // Art Nouveau Frame
        let isBorder = x < 2 || x > grid.cols - 3 || y < 1 || y > grid.rows - 2;
        
        // Cthulhu's Eye
        let isPupil = r < 3.5 && Math.abs(dx) < 1.5;
        let isIris = r < 8 && !isPupil;
        let isEyeOutline = r >= 8 && r < 10;
        
        // Cthulhu's Head
        let headShape = r * (1.0 + 0.15 * Math.sin(angle * 7));
        let isHead = headShape >= 10 && headShape < 16 && dy < 8;
        
        // Art Nouveau Whiplash Tentacles
        let tx = dx;
        let ty = dy + 2;
        let tr = Math.sqrt(tx * tx + ty * ty);
        let tangle = Math.atan2(ty, tx);
        
        let arms = 9;
        let phase = Math.sin(tr * 0.05 - time * 2.0) * 2.2;
        let tVal = Math.sin(tangle * arms + phase);
        let tWidth = 0.3 + 0.5 * Math.sin(tr * 0.1 - time * 0.5);
        
        let tentacleMask = ty > -2 || Math.abs(tx) > 14;
        let isTentacle = tVal > tWidth && tr > 9 && tr < Math.min(grid.cols, grid.rows) * 1.2 && tentacleMask;
        
        // Lovecraft OS Matrix Rain
        let drop = Math.floor(time * 15 + x * 23) % grid.rows;
        let rainDist = (y - drop + grid.rows) % grid.rows;
        let isRain = x % 9 === 0 && rainDist < 5 && r > 18;

        if (y === grid.rows - 3 && x >= textStartX && x < textStartX + osText.length) {
            // OS Boot Sequence Text
            char = osText[x - textStartX];
            color = '#ff3333';
            if (Math.random() > 0.95) {
                char = String.fromCharCode(33 + Math.floor(Math.random() * 90));
                color = '#ffffff';
            }
        } else if (isBorder) {
            // Gilded Art Nouveau Border
            let borderWave = Math.sin((x + y) * 0.2 + time);
            char = borderWave > 0 ? '§' : '‡';
            let intensity = Math.floor((borderWave + 1) * 100);
            color = `rgb(${150 + intensity}, ${120 + intensity}, 40)`;
        } else if (isPupil) {
            // Void Pupil
            char = '|';
            color = '#ff0000';
            if (Math.random() > 0.9) { char = 'X'; color = '#ffffff'; }
        } else if (isIris) {
            // Glowing Cosmic Iris
            let irisWave = Math.sin(r * 4 - time * 6);
            char = chars[Math.floor((irisWave + 1) / 2 * 3) + 5];
            color = '#00ffcc';
        } else if (isEyeOutline) {
            char = '@';
            color = '#002211';
        } else if (isHead) {
            // Scaly Head Texture
            let hIntensity = Math.sin(dx * 0.8) * Math.cos(dy * 0.8);
            char = hIntensity > 0 ? '%' : '#';
            color = '#004422';
        } else if (isTentacle) {
            // Flowing Gradient Tentacles
            let intensity = (tVal - tWidth) / (1.0 - tWidth); 
            let charIdx = Math.floor(intensity * (chars.length - 1));
            char = chars[Math.max(0, Math.min(chars.length - 1, charIdx))];
            
            let rCol = Math.floor(20 * intensity);
            let gCol = Math.floor(80 + 175 * intensity);
            let bCol = Math.floor(40 + 60 * (1 - intensity));
            color = `rgb(${rCol}, ${gCol}, ${bCol})`;
            
            if (intensity > 0.85) {
                char = 'O'; // Suction cups
                color = '#00ffaa';
            }
        } else if (isRain) {
            // Glitch Rain
            char = String.fromCharCode(33 + Math.floor(Math.random() * 90));
            let fade = 1 - rainDist / 5;
            color = `rgb(0, ${Math.floor(255 * fade)}, 100)`;
        } else {
            // Background Void Ripples
            let ripple = Math.sin(dx * 0.05 + time) * Math.cos(dy * 0.05 - time * 0.5);
            if (Math.random() > 0.998) {
                let word = words[Math.floor(Math.random() * words.length)];
                char = word[Math.floor(Math.random() * word.length)];
                color = '#ff00ff';
            } else if (ripple > 0.7) {
                char = '~';
                color = '#112233';
            } else if (ripple < -0.7) {
                char = '.';
                color = '#221133';
            }
        }
        
        row.push({ char, color });
    }
    out.push(row);
}
return out;