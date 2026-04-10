const phi = 1.618033988749895;
const inv_phi = 0.618033988749895;

if (!canvas.__feral_quasicrystal) {
    const num_particles = 250;
    const particles = [];
    for (let i = 0; i < num_particles; i++) {
        particles.push({
            x: Math.random() * grid.width,
            y: Math.random() * grid.height,
            vx: 0,
            vy: 0,
            mass: 1 + Math.random() * phi,
            phase: Math.random() * Math.PI * 2,
            id: i,
            glitchText: Math.random() > 0.95 ? ['diffraction_patterns.json', 'inflation_rules.yaml', 'core_math_traits.md', '01_penrose_p2.md', 'my-agent.agent.md'][Math.floor(Math.random() * 5)] : null
        });
    }

    // 5-fold symmetry vectors for Penrose field
    const p_waves = [];
    for (let i = 0; i < 5; i++) {
        let angle = i * (Math.PI * 2) / 5;
        p_waves.push({ x: Math.cos(angle), y: Math.sin(angle) });
    }

    canvas.__feral_quasicrystal = {
        particles,
        p_waves,
        tick: 0,
        flash: 0
    };
}

const state = canvas.__feral_quasicrystal;
state.tick += 0.016;
const t = time * 0.5;

// The bureaucratic void
ctx.fillStyle = `rgba(5, 6, 8, ${mouse.isPressed ? 0.3 : 0.15})`;
ctx.fillRect(0, 0, grid.width, grid.height);

// Quasicrystal Diffraction Field function
// Simulates the potential field of an intersecting 5-grid
function getField(x, y, scale, time_offset) {
    let val = 0;
    for (let i = 0; i < 5; i++) {
        val += Math.cos((x * state.p_waves[i].x + y * state.p_waves[i].y) * scale + time_offset);
    }
    return val;
}

const base_scale = 0.015;
const active_scale = mouse.isPressed ? base_scale * phi : base_scale;
const eps = 0.1;

ctx.lineWidth = 1;
ctx.lineCap = 'round';

// Recursive fractal line drawing (Inflation Rule simulation)
function drawFractalStrut(x1, y1, x2, y2, depth, tension, field_val) {
    if (depth === 0) {
        ctx.lineTo(x2, y2);
        return;
    }
    
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    
    // Perpendicular offset based on field value and tension
    const nx = -dy / len;
    const ny = dx / len;
    
    // Golden ratio offset logic
    const offset = len * tension * Math.sin(field_val * Math.PI) * (depth % 2 === 0 ? inv_phi : -inv_phi);
    
    const px = mx + nx * offset;
    const py = my + ny * offset;
    
    drawFractalStrut(x1, y1, px, py, depth - 1, tension * inv_phi, field_val);
    drawFractalStrut(px, py, x2, y2, depth - 1, tension * inv_phi, field_val);
}

// Particle update and rendering
for (let i = 0; i < state.particles.length; i++) {
    let p = state.particles[i];
    
    // Sample the quasicrystal field
    let f0 = getField(p.x, p.y, active_scale, t);
    let fx = getField(p.x + eps, p.y, active_scale, t);
    let fy = getField(p.x, p.y + eps, active_scale, t);
    
    // Gradient descent/ascent (Forces)
    let gx = (fx - f0) / eps;
    let gy = (fy - f0) / eps;
    
    // Mouse interference (Diffraction Lens)
    let mx_dist = mouse.x - p.x;
    let my_dist = mouse.y - p.y;
    let m_dist = Math.sqrt(mx_dist * mx_dist + my_dist * my_dist);
    
    if (m_dist < 200) {
        let force = (200 - m_dist) / 200;
        if (mouse.isPressed) {
            // Overclock / Repel
            gx -= (mx_dist / m_dist) * force * 10;
            gy -= (my_dist / m_dist) * force * 10;
        } else {
            // Vortex / Attract
            gx += (my_dist / m_dist) * force * 2;
            gy -= (mx_dist / m_dist) * force * 2;
        }
    }
    
    // Apply forces
    p.vx += gx * 0.1 * p.mass;
    p.vy += gy * 0.1 * p.mass;
    
    // Friction (crystallization drag)
    // The closer to a field maximum, the higher the friction
    let drag = 0.85 - Math.abs(f0 / 5) * 0.1;
    p.vx *= drag;
    p.vy *= drag;
    
    p.x += p.vx;
    p.y += p.vy;
    
    // Wrap around void
    if (p.x < 0) p.x = grid.width;
    if (p.x > grid.width) p.x = 0;
    if (p.y < 0) p.y = grid.height;
    if (p.y > grid.height) p.y = 0;
    
    // Draw connections (Ammann-Beenker / Penrose structural bonding)
    // Only search forward to avoid double drawing
    for (let j = i + 1; j < state.particles.length; j++) {
        let p2 = state.particles[j];
        let dx = p.x - p2.x;
        let dy = p.y - p2.y;
        let distSq = dx * dx + dy * dy;
        
        let max_dist = 60 * phi;
        if (mouse.isPressed) max_dist *= phi;
        
        if (distSq < max_dist * max_dist) {
            let dist = Math.sqrt(distSq);
            let alpha = (1 - dist / max_dist) * (mouse.isPressed ? 0.8 : 0.4);
            
            // Color shifts based on field alignment and fracture depth
            let hue = (f0 * 30 + 220 + (mouse.isPressed ? 120 : 0)) % 360;
            ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
            
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            
            // Apply fractal inflation rules to the connecting lines
            let depth = mouse.isPressed ? 3 : 1;
            let tension = 0.2 + Math.sin(t + p.phase) * 0.1;
            
            drawFractalStrut(p.x, p.y, p2.x, p2.y, depth, tension, f0);
            ctx.stroke();
        }
    }
    
    // Draw the node itself
    let node_radius = Math.abs(f0) * 0.8 + 0.5;
    ctx.fillStyle = `hsla(${(f0 * 40 + 100)}, 100%, 70%, 0.8)`;
    ctx.fillRect(p.x - node_radius, p.y - node_radius, node_radius * 2, node_radius * 2);
    
    // Bureaucratic failure labels
    if (p.glitchText && Math.random() < 0.02 && Math.abs(p.vx) > 1.5) {
        ctx.fillStyle = `rgba(255, 100, 100, ${Math.random()})`;
        ctx.font = '10px monospace';
        ctx.fillText(p.glitchText, p.x + 5, p.y - 5);
        ctx.fillStyle = `rgba(100, 255, 200, ${Math.random()})`;
        ctx.fillText(`ERR_INFLATION: ${f0.toFixed(3)}`, p.x + 5, p.y + 5);
    }
}

// Occasional structural flash (Golden ratio pulse)
if (Math.random() < 0.01) {
    state.flash = 1.0;
}
if (state.flash > 0) {
    ctx.fillStyle = `rgba(200, 240, 255, ${state.flash * 0.05})`;
    ctx.fillRect(0, 0, grid.width, grid.height);
    state.flash -= 0.05;
}