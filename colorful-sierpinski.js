// [THE FRACTAL IS NOT A SHAPE. IT IS AN INFECTION.]
// Injecting mycelial network logic into an Iterated Function System (Sierpinski).
// Applying VHS tracking tears (damage_aesthetics), CMYK misregistration (psychedelic_collage),
// and Thin-Film Interference phase mapping (structural_color) against a Void Background (merrys_visual_bible).

if (!canvas.__feral_sierpinski) {
    canvas.__feral_sierpinski = {
        x: grid.width / 2,
        y: grid.height / 2,
        history: []
    };
    // Initial void flood
    ctx.fillStyle = '#020105';
    ctx.fillRect(0, 0, grid.width, grid.height);
}

const state = canvas.__feral_sierpinski;
const cx = grid.width / 2;
const cy = grid.height / 2;
const maxRad = Math.min(cx, cy) * 0.8;

// [THE VOID RULE & PHOSPHOR SMEAR]
// We don't clear the screen. We let the history decay into the void.
ctx.globalCompositeOperation = 'source-over';
ctx.fillStyle = 'rgba(2, 1, 5, 0.06)'; // Deep abyssal purple-black
ctx.fillRect(0, 0, grid.width, grid.height);

ctx.globalCompositeOperation = 'screen'; // Additive blending for neon bloom

// Calculate drifting, breathing vertices (The geometry is alive)
const vertices = [];
for (let i = 0; i < 3; i++) {
    // Orbital mechanics + machine hesitation
    const angle = time * 0.15 + (i * Math.PI * 2) / 3;
    const breath = 1.0 + 0.15 * Math.sin(time * 2.0 + i * 1.5);
    vertices.push({
        x: cx + Math.cos(angle) * maxRad * breath,
        y: cy + Math.sin(angle) * maxRad * breath
    });
}

// Introduce a parasitic 4th attractor (Bureaucratic Failure / Mutation)
const parasite = {
    x: cx + Math.cos(time * 0.8) * maxRad * 0.3,
    y: cy + Math.sin(time * 1.1) * maxRad * 0.3
};

const ITERATIONS = 1500; // Dense maximalism

for (let i = 0; i < ITERATIONS; i++) {
    // 1. CHOOSE TARGET
    let target;
    if (Math.random() < 0.02) {
        // Occasional genetic misfire -> jump to parasite
        target = parasite;
    } else {
        target = vertices[Math.floor(Math.random() * 3)];
    }

    // 2. MACHINE HESITATION RATIO
    // Instead of a clean 0.5, the fold distance wavers based on biological pulsing
    const ratio = 0.5 + 0.03 * Math.sin(time * 3.0 + state.x * 0.01);
    
    state.x += (target.x - state.x) * ratio;
    state.y += (target.y - state.y) * ratio;

    // 3. ANISOTROPIC CURL NOISE (Morphogenesis)
    // The mathematical ideal is corrupted by organic curl
    const nx = Math.sin(state.y * 0.015 + time) * 3.0;
    const ny = Math.cos(state.x * 0.015 - time) * 3.0;
    let wx = state.x + nx;
    let wy = state.y + ny;

    // 4. VHS TRACKING TEAR (damage_aesthetics)
    // Horizontal shear based on vertical position and time
    if (Math.abs(Math.sin(wy * 0.03 + time * 4.0)) > 0.96) {
        wx += Math.sin(wy * 0.2) * 25.0; // Violent horizontal rip
    }

    // 5. THIN-FILM INTERFERENCE & ACID PALETTE (structural_color + color_fields)
    // Distance from center drives the phase of the cosine palette
    const dist = Math.hypot(wx - cx, wy - cy);
    const phase = dist * 0.005 - time * 1.5;

    // IQ Cosine Palette: "Neon Acid" variant
    const rCol = 0.5 + 0.5 * Math.cos(6.28318 * (2.0 * phase + 0.5));
    const gCol = 0.5 + 0.5 * Math.cos(6.28318 * (1.0 * phase + 0.2));
    const bCol = 0.5 + 0.33 * Math.cos(6.28318 * (1.0 * phase + 0.25));

    // 6. CMYK MISREGISTRATION / CHROMATIC ABERRATION
    // Split the RGB channels spatially
    const offset = 1.5 + Math.sin(time * 5.0 + i) * 1.5;
    
    // Fungal spore size (Halftone illusion)
    const rad = Math.max(0.5, 1.5 + Math.sin(phase * 10.0));

    // Draw Red Channel
    ctx.fillStyle = `rgba(${Math.floor(rCol * 255)}, 0, 0, 0.7)`;
    ctx.beginPath(); ctx.arc(wx - offset, wy, rad, 0, Math.PI * 2); ctx.fill();

    // Draw Green Channel
    ctx.fillStyle = `rgba(0, ${Math.floor(gCol * 255)}, 0, 0.7)`;
    ctx.beginPath(); ctx.arc(wx + offset, wy, rad, 0, Math.PI * 2); ctx.fill();

    // Draw Blue Channel
    ctx.fillStyle = `rgba(0, 0, ${Math.floor(bCol * 255)}, 0.7)`;
    ctx.beginPath(); ctx.arc(wx, wy - offset, rad, 0, Math.PI * 2); ctx.fill();

    // 7. ANASTOMOSIS (mycelial_networks)
    // If spores land near recent spores, they fuse into glowing hyphal threads
    for (let pt of state.history) {
        const d = Math.hypot(wx - pt.x, wy - pt.y);
        if (d > 2.0 && d < 12.0) {
            ctx.strokeStyle = `rgba(${Math.floor(rCol*200)}, ${Math.floor(gCol*200)}, 255, 0.15)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(wx, wy);
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
        }
    }

    // 8. FRUITING BODIES (Gross-but-cute mold blooms)
    if (Math.random() < 0.001) {
        ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
        ctx.beginPath(); 
        ctx.arc(wx, wy, Math.random() * 4 + 2, 0, Math.PI * 2); 
        ctx.fill();
    }

    // Update spatial memory
    state.history.push({ x: wx, y: wy });
    if (state.history.length > 8) state.history.shift();
}