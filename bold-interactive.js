window._weird_state = window._weird_state || {
    splatters: [],
    agents: [],
    lastX: 0, lastY: 0,
    initialized: false
};

const s = window._weird_state;

if (!s.initialized) {
    for (let i = 0; i < 15; i++) {
        s.agents.push({
            x: Math.random() * grid.width,
            y: Math.random() * grid.height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            txt: ["A", "G", "E", "N", "T", "_", "R", "U", "L", "E", "S"][Math.floor(Math.random() * 11)],
            hue: Math.random() * 360
        });
    }
    s.initialized = true;
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, grid.width, grid.height);
}

// Lisa Frank meets Abstract Expressionism palette
const acidColors = ['#FF0099', '#00FFFF', '#CCFF00', '#FF00FF', '#7D26CD', '#FF6600'];
const motifs = ['⌘', '§', '¶', 'Δ', 'Ж', '₪', '░', '▒', '▓', '※', '⍟', '⎈', '╬', '╣', '║'];
const decay = ['.', ',', '-', '~', ':', ';', '!', '?', '*', 'x', '\\', '/', '|'];

// Visceral screen tear / fading
ctx.globalCompositeOperation = 'source-over';
ctx.fillStyle = `rgba(10, 5, 12, ${0.05 + Math.random() * 0.05})`;
ctx.fillRect(0, 0, grid.width, grid.height);

let dx = mouse.x - s.lastX;
let dy = mouse.y - s.lastY;
let speed = Math.sqrt(dx * dx + dy * dy);

// Inject gestural splatters
if (speed > 2 || mouse.isPressed) {
    let count = mouse.isPressed ? 5 : 2;
    for (let i = 0; i < count; i++) {
        s.splatters.push({
            x: mouse.x + (Math.random() - 0.5) * 30,
            y: mouse.y + (Math.random() - 0.5) * 30,
            px: mouse.x,
            py: mouse.y,
            vx: dx * 0.15 + (Math.random() - 0.5) * 10,
            vy: dy * 0.15 + (Math.random() - 0.5) * 10,
            life: 1.0,
            decay: 0.01 + Math.random() * 0.03,
            color: acidColors[Math.floor(Math.random() * acidColors.length)],
            size: Math.random() * 20 + 2,
            isDrip: Math.random() > 0.7
        });
    }
}
s.lastX = mouse.x;
s.lastY = mouse.y;

// Simulate and draw splatters (Abstract Expressionism layer)
ctx.globalCompositeOperation = 'screen';
for (let i = s.splatters.length - 1; i >= 0; i--) {
    let p = s.splatters[i];
    
    p.px = p.x;
    p.py = p.y;
    
    if (p.isDrip) {
        p.vy += 0.8; // Heavy gravity for drips
        p.vx *= 0.8;
    } else {
        p.vy += 0.1; // Float/drift
        p.vx *= 0.92;
        p.vy *= 0.92;
    }
    
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;

    ctx.beginPath();
    ctx.moveTo(p.px, p.py);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.size * p.life;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Occasional micro-splatters
    if (Math.random() > 0.9 && p.life > 0.5 && !p.isDrip) {
        ctx.beginPath();
        ctx.arc(p.x + (Math.random()-0.5)*20, p.y + (Math.random()-0.5)*20, Math.random()*4, 0, Math.PI*2);
        ctx.fillStyle = p.color;
        ctx.fill();
    }

    if (p.life <= 0) s.splatters.splice(i, 1);
}

// Update wandering bureaucratic agents
for (let a of s.agents) {
    a.x += a.vx;
    a.y += a.vy;
    if (a.x < 0 || a.x > grid.width) a.vx *= -1;
    if (a.y < 0 || a.y > grid.height) a.vy *= -1;
    a.vx += (Math.random() - 0.5) * 0.5;
    a.vy += (Math.random() - 0.5) * 0.5;
    // Speed limit
    let v = Math.sqrt(a.vx*a.vx + a.vy*a.vy);
    if (v > 3) { a.vx /= v; a.vy /= v; }
}

// Construct ASCII Grid: Cultural motifs corrupted by acid leaks
let output = [];
let t = time * 2;

for (let y = 0; y < grid.rows; y++) {
    let row = [];
    for (let x = 0; x < grid.cols; x++) {
        let cx = (x / grid.cols) * grid.width;
        let cy = (y / grid.rows) * grid.height;

        // Deformation field based on sine waves and time
        let deformX = cx + Math.sin(y * 0.1 + t) * 20;
        let deformY = cy + Math.cos(x * 0.1 - t) * 20;

        // Check proximity to acid splatters
        let closestDist = 999999;
        let closestColor = null;
        for (let p of s.splatters) {
            let d = (p.x - deformX) ** 2 + (p.y - deformY) ** 2;
            if (d < closestDist) {
                closestDist = d;
                closestColor = p.color;
            }
        }

        // Check proximity to agents
        let agentDist = 999999;
        let agentTxt = '';
        for (let a of s.agents) {
            let d = (a.x - cx) ** 2 + (a.y - cy) ** 2;
            if (d < agentDist) {
                agentDist = d;
                agentTxt = a.txt;
            }
        }

        let char = ' ';
        let color = '#333344';

        if (closestDist < 4000) {
            // Highly infected (Abstract Expressionism + Lisa Frank)
            let intensity = 1 - (closestDist / 4000);
            char = decay[Math.floor(Math.random() * decay.length)];
            if (intensity > 0.7) char = '█';
            else if (intensity > 0.4) char = '▓';
            color = closestColor;
            
            // Glitch shift
            if (Math.random() > 0.95) char = motifs[Math.floor(Math.random() * motifs.length)];
        } 
        else if (agentDist < 2000) {
            // Bureaucratic Agent presence (Cultural Motifs structure)
            char = agentTxt;
            color = '#FFFFFF';
        }
        else {
            // Background cultural weave
            let noiseVal = Math.sin(x * 0.3 + t) * Math.cos(y * 0.3 - t * 0.5);
            if (noiseVal > 0.8) {
                char = motifs[(x + y + Math.floor(t)) % motifs.length];
                color = '#555566';
            } else if (noiseVal > 0.5) {
                char = '+';
                color = '#2a2a35';
            }
        }

        row.push({ char, color });
    }
    output.push(row);
}

return output;