const { width, height } = grid;
const cx = width / 2;
const cy = height / 2;

// --- STATE INITIALIZATION ---
if (!canvas.__feralState) {
    canvas.__feralState = {
        agents: [],
        nodes: [],
        windows: [],
        sparkles: [],
        frame: 0,
        palettes: {
            hyperpop: ['#FF1493', '#00FFFF', '#B0FF00', '#8B00FF', '#F0F8FF'],
            op: ['#000000', '#FFFFFF']
        }
    };

    // Seed initial agents (Mycelial web crawlers)
    for (let i = 0; i < 15; i++) {
        canvas.__feralState.agents.push({
            x: cx, y: cy,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: Math.random() * 200 + 100,
            color: canvas.__feralState.palettes.hyperpop[Math.floor(Math.random() * 5)],
            size: Math.random() * 4 + 1
        });
    }
}

const state = canvas.__feralState;
state.frame++;
const t = time;

// --- 1. TEMPORAL ECHO & VHS DEGRADATION (Feedback Loop) ---
// Simulates generation loss, temporal stacking, and Op-Art funneling
ctx.save();
ctx.globalCompositeOperation = 'source-over';
ctx.translate(cx, cy);
// Slight scale and rotation for the infinite tunnel/melt effect
ctx.scale(1.005, 1.005);
ctx.rotate(Math.sin(t * 0.5) * 0.002);
ctx.translate(-cx, -cy);
ctx.drawImage(canvas, 0, 0);
ctx.restore();

// Fade to black (Phosphor Noir / Deep Internet void)
ctx.globalCompositeOperation = 'source-over';
ctx.fillStyle = `rgba(5, 5, 8, 0.08)`;
ctx.fillRect(0, 0, width, height);

// --- 2. VHS TRACKING ERROR / TAPE TEAR ---
if (Math.random() < 0.08) {
    const tearY = Math.random() * height;
    const tearH = Math.random() * 30 + 5;
    const shift = (Math.random() - 0.5) * 40;
    
    // Slice and shift the canvas horizontally
    ctx.drawImage(canvas, 0, tearY, width, tearH, shift, tearY, width, tearH);
    
    // Add white noise static line
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
    ctx.fillRect(0, tearY, width, Math.random() * 4);
}

// --- 3. MYCELIAL WEB CRAWLERS (Growth + Data Rot) ---
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

for (let i = state.agents.length - 1; i >= 0; i--) {
    let a = state.agents[i];
    
    // Gematria/Harmonic resonance math driving movement (373 = Logos, 26 = YHWH)
    a.vx += Math.sin(a.y * 0.0373 + t * 2) * 0.4;
    a.vy += Math.cos(a.x * 0.0026 + t * 1.5) * 0.4;
    
    // Friction
    a.vx *= 0.95;
    a.vy *= 0.95;
    
    let nx = a.x + a.vx;
    let ny = a.y + a.vy;
    
    // Draw trail (Chroma bleed via composite operations)
    ctx.globalCompositeOperation = 'screen';
    ctx.lineWidth = a.size;
    
    // RGB Phantom Split
    ctx.strokeStyle = 'red';
    ctx.beginPath(); ctx.moveTo(a.x - 2, a.y); ctx.lineTo(nx - 2, ny); ctx.stroke();
    
    ctx.strokeStyle = 'cyan';
    ctx.beginPath(); ctx.moveTo(a.x + 2, a.y); ctx.lineTo(nx + 2, ny); ctx.stroke();
    
    ctx.strokeStyle = a.color;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(nx, ny); ctx.stroke();
    
    a.x = nx;
    a.y = ny;
    a.life--;
    
    // Screen wrap
    if (a.x < 0) a.x = width; if (a.x > width) a.x = 0;
    if (a.y < 0) a.y = height; if (a.y > height) a.y = 0;
    
    // Anastomosis / Branching (Fungal logic)
    if (Math.random() < 0.03) {
        state.agents.push({
            x: a.x, y: a.y,
            vx: a.vx + (Math.random() - 0.5) * 5,
            vy: a.vy + (Math.random() - 0.5) * 5,
            life: Math.random() * 100 + 50,
            color: state.palettes.hyperpop[Math.floor(Math.random() * 5)],
            size: a.size * 0.8
        });
    }
    
    // Node Formation (Op Art Shrine birth)
    if (Math.random() < 0.01 && state.nodes.length < 15) {
        state.nodes.push({
            x: a.x, y: a.y,
            maxR: Math.random() * 80 + 20,
            birth: t,
            rings: Math.floor(Math.random() * 6) + 4
        });
    }
    
    // Myspace Sparkle shedding
    if (Math.random() < 0.05) {
        state.sparkles.push({
            x: a.x, y: a.y,
            size: Math.random() * 15 + 5,
            life: 1.0,
            rot: Math.random() * Math.PI
        });
    }
    
    if (a.life <= 0 || a.size < 0.5) {
        state.agents.splice(i, 1);
    }
}

// Keep agent population alive
if (state.agents.length < 10) {
    state.agents.push({
        x: Math.random() * width, y: Math.random() * height,
        vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
        life: 200, color: '#FF1493', size: 4
    });
}

// --- 4. OP ART SHRINE NODES (Retinal Surrealism) ---
// Draws high-contrast concentric targets that vibrate and flip figure/ground
ctx.globalCompositeOperation = 'difference';

for (let i = state.nodes.length - 1; i >= 0; i--) {
    let n = state.nodes[i];
    let age = t - n.birth;
    
    ctx.save();
    ctx.translate(n.x, n.y);
    // Radial Hypnosis rotation
    ctx.rotate(age * 0.5);
    
    // Moiré expansion
    let currentMaxR = Math.min(n.maxR, age * 50);
    
    for (let r = n.rings; r > 0; r--) {
        ctx.beginPath();
        // Curvature logic: pulsating thickness
        let radius = (currentMaxR / n.rings) * r + Math.sin(age * 8 + r) * (currentMaxR * 0.1);
        if (radius < 0) radius = 0;
        
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        // Strict B&W for optical interference
        ctx.fillStyle = r % 2 === 0 ? '#FFFFFF' : '#000000';
        ctx.fill();
    }
    ctx.restore();
    
    if (age > 5) state.nodes.splice(i, 1); // Nodes collapse after 5 seconds
}

// --- 5. EARLY INTERNET / UI DEBRIS ---
if (Math.random() < 0.02 && state.windows.length < 5) {
    state.windows.push({
        x: Math.random() * width,
        y: Math.random() * height,
        w: Math.random() * 200 + 100,
        h: Math.random() * 150 + 50,
        birth: t
    });
}

ctx.globalCompositeOperation = 'source-over';
for (let i = state.windows.length - 1; i >= 0; i--) {
    let win = state.windows[i];
    let age = t - win.birth;
    
    ctx.save();
    // Distortion Warp (Datamosh melt)
    let warpX = Math.sin(age * 5 + win.y * 0.05) * 10;
    let warpY = Math.cos(age * 3 + win.x * 0.05) * 10;
    ctx.translate(win.x + warpX, win.y + warpY);
    
    // Fake Windows 95 frame
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(0, 0, win.w, win.h);
    
    // 3D Bevel
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, win.w, 2); ctx.fillRect(0, 0, 2, win.h);
    ctx.fillStyle = '#808080'; ctx.fillRect(win.w-2, 0, 2, win.h); ctx.fillRect(0, win.h-2, win.w, 2);
    
    // Title bar
    ctx.fillStyle = '#0000AA';
    ctx.fillRect(3, 3, win.w - 6, 18);
    
    // Text Debris (Terminal confession / Gematria)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText("FATAL_ERR_373", 6, 16);
    
    // Content area glitch
    ctx.fillStyle = state.palettes.hyperpop[Math.floor(t * 10) % 5];
    ctx.fillRect(5, 25, win.w - 10, win.h - 30);
    
    // Draw some barcode/gematria blocks inside
    ctx.fillStyle = '#000000';
    for(let j=0; j<10; j++) {
        ctx.fillRect(10 + j*10, 30, Math.random()*5, Math.random()*(win.h-40));
    }
    
    ctx.restore();
    
    if (age > 2) state.windows.splice(i, 1);
}

// --- 6. MYSPACE SPARKLES (Glamour / Trashy Cute) ---
ctx.globalCompositeOperation = 'screen';
for (let i = state.sparkles.length - 1; i >= 0; i--) {
    let s = state.sparkles[i];
    
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot + t);
    
    let alpha = s.life;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    
    // Draw 4-point star
    ctx.beginPath();
    ctx.moveTo(0, -s.size);
    ctx.quadraticCurveTo(0, 0, s.size, 0);
    ctx.quadraticCurveTo(0, 0, 0, s.size);
    ctx.quadraticCurveTo(0, 0, -s.size, 0);
    ctx.quadraticCurveTo(0, 0, 0, -s.size);
    ctx.fill();
    
    // Inner hot pink glow
    ctx.fillStyle = `rgba(255, 20, 147, ${alpha * 0.5})`;
    ctx.scale(0.5, 0.5);
    ctx.beginPath();
    ctx.moveTo(0, -s.size);
    ctx.quadraticCurveTo(0, 0, s.size, 0);
    ctx.quadraticCurveTo(0, 0, 0, s.size);
    ctx.quadraticCurveTo(0, 0, -s.size, 0);
    ctx.quadraticCurveTo(0, 0, 0, -s.size);
    ctx.fill();
    
    ctx.restore();
    
    s.life -= 0.05;
    if (s.life <= 0) state.sparkles.splice(i, 1);
}

// --- 7. FINAL GLITCHCORE OVERLAY (Compression Banding) ---
ctx.globalCompositeOperation = 'overlay';
ctx.fillStyle = `rgba(0, 255, 255, 0.05)`;
for(let y = 0; y < height; y += 4) {
    if(Math.random() > 0.5) ctx.fillRect(0, y, width, 2);
}
// Reset for next frame
ctx.globalCompositeOperation = 'source-over';