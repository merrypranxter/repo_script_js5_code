if (!window.blingeeSlimeState) {
    window.blingeeSlimeState = {
        lastMouse: { x: 0, y: 0 },
        splatters: [],
        glitterSparks: [],
        marqueePhase: 0,
        // Lisa Frank x Graffiti neon palette
        colors: ["#FF00FF", "#00FFFF", "#FFFF00", "#39FF14", "#FF1493", "#9400D3"],
        // MySpace emotional/identity DNA
        tags: ["xX_RAWR_Xx", "T0X1C", "✧*BFFL*✧", "<3_<3", "P4N1C", "GL1TT3R", "[IMG_BROKEN]", "ANGST.exe", "sPaRkLe"],
        chars: ["*", "+", "x", "·", "✧", "♡", "☠", "★", "!", "~", "$", "¤"]
    };
}

const s = window.blingeeSlimeState;
const cx = canvas.width;
const cy = canvas.height;

// --- CANVAS LAYER: THE TOXIC NEON GRAFFITI SLUDGE ---

// 1. Feedback Loop: The "melting CRT / spraypaint drip" mechanism
ctx.save();
ctx.translate(cx / 2, cy / 2);
// Erratic scale and rotation mimicking wet paint and bad video compression
ctx.scale(1.001 + Math.sin(time * 3) * 0.002, 1.008); 
ctx.rotate(Math.cos(time * 1.5) * 0.003);
ctx.translate(-cx / 2, -cy / 2 + 1.5); // Drip gravity

ctx.globalAlpha = 0.96; // Slight decay
ctx.globalCompositeOperation = 'source-over';
// Draw canvas onto itself to create smears
ctx.drawImage(canvas, 0, 0);
ctx.restore();

// 2. Ambient decay to prevent blown-out white screens
ctx.fillStyle = 'rgba(10, 0, 15, 0.04)';
ctx.globalCompositeOperation = 'source-over';
ctx.fillRect(0, 0, cx, cy);

// 3. Mouse Interaction: The "Graffiti Spray / MySpace Cursor Trail"
const dx = mouse.x - s.lastMouse.x;
const dy = mouse.y - s.lastMouse.y;
const speed = Math.hypot(dx, dy);

if (speed > 0.1 || mouse.isPressed) {
    const activeColor = s.colors[Math.floor((time * 5) % s.colors.length)];
    const radius = mouse.isPressed ? Math.random() * 40 + 20 : Math.random() * 15 + 5 + speed * 0.2;

    // Core spray blob
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = activeColor;
    ctx.shadowColor = activeColor;
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Satellite splatters (graffiti drip DNA)
    for (let i = 0; i < 4; i++) {
        const sx = mouse.x + (Math.random() - 0.5) * radius * 4;
        const sy = mouse.y + (Math.random() - 0.5) * radius * 4;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.random() * 6, 0, Math.PI * 2);
        ctx.fillStyle = activeColor;
        ctx.fill();
        
        // Spawn ASCII glitter trackers
        s.glitterSparks.push({
            x: sx,
            y: sy,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 8 + 2, // Heavy gravity for glitter
            life: 1.0,
            char: s.chars[Math.floor(Math.random() * s.chars.length)],
            color: activeColor
        });
    }
}

s.lastMouse.x = mouse.x;
s.lastMouse.y = mouse.y;

// Update glitter physics
for (let i = s.glitterSparks.length - 1; i >= 0; i--) {
    let p = s.glitterSparks[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.03;
    if (p.life <= 0) s.glitterSparks.splice(i, 1);
}

// --- ASCII LAYER: THE MYSPACE BLINGEE PARASITE ---
// We build a 2D array of objects to map text and sparkles over the canvas sludge

let gridOut = [];
for (let y = 0; y < grid.rows; y++) {
    let row = [];
    for (let x = 0; x < grid.cols; x++) {
        row.push({ char: ' ', color: 'transparent' });
    }
    gridOut.push(row);
}

// 1. Map physical glitter to the ASCII grid
s.glitterSparks.forEach(p => {
    let gx = Math.floor((p.x / cx) * grid.cols);
    let gy = Math.floor((p.y / cy) * grid.rows);

    if (gx >= 0 && gx < grid.cols && gy >= 0 && gy < grid.rows) {
        // High-contrast strobing for that cheap gif feel
        const strobe = Math.random() > 0.5;
        gridOut[gy][gx] = {
            char: p.char,
            color: strobe ? '#FFFFFF' : p.color,
            size: strobe ? 1.5 : 1.0
        };
    }
});

// 2. Wandering MySpace Marquees / Broken HTML fragments
s.marqueePhase += 0.05;
s.tags.forEach((tag, index) => {
    // Erratic orbital math for placement
    const t = s.marqueePhase + index * 13.37; // Leet offset
    let wy = Math.floor(((Math.sin(t * 0.4) * Math.cos(t * 0.7) + 1) / 2) * grid.rows);
    let wx = Math.floor(((Math.cos(t * 0.5) + 1) / 2) * grid.cols);

    // Glitch offset
    if (Math.random() < 0.05) wx += Math.floor((Math.random() - 0.5) * 10);

    const tagColor = s.colors[index % s.colors.length];
    
    for (let i = 0; i < tag.length; i++) {
        let cx = wx + i;
        if (cx >= 0 && cx < grid.cols && wy >= 0 && wy < grid.rows) {
            // Spongebob case / MySpace case mutation
            let char = tag[i];
            if (Math.random() < 0.1) char = char.toUpperCase();
            else if (Math.random() < 0.1) char = char.toLowerCase();

            gridOut[wy][cx] = {
                char: char,
                color: Math.random() < 0.05 ? '#000000' : tagColor, // Occasional dead pixel
                size: 1.1
            };
            
            // Background block artifacting (simulating messy HTML table backgrounds)
            if (Math.random() < 0.2) {
                gridOut[wy][cx].char = '█';
                gridOut[wy][cx].color = 'rgba(255, 255, 255, 0.2)';
            }
        }
    }
});

// 3. Static / Noise overlay based on time (Angelfire server strain)
for (let i = 0; i < 20; i++) {
    let rx = Math.floor(Math.random() * grid.cols);
    let ry = Math.floor(Math.random() * grid.rows);
    gridOut[ry][rx] = {
        char: Math.random() > 0.5 ? '▒' : '░',
        color: s.colors[Math.floor(Math.random() * s.colors.length)],
        size: 0.8
    };
}

return gridOut;