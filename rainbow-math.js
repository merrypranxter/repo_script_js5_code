const NUM_PARTICLES = 8000;

if (!ctx.__initialized) {
    ctx.__particles = [];
    for (let i = 0; i < NUM_PARTICLES; i++) {
        ctx.__particles.push({
            x: (Math.random() - 0.5) * 4,
            y: (Math.random() - 0.5) * 4,
            layer: Math.floor(Math.random() * 5) + 1, // Depth layers 1 to 5
            timer: 0
        });
    }
    
    ctx.fillStyle = '#05040a'; // The Ship void color
    ctx.fillRect(0, 0, grid.width, grid.height);
    ctx.__initialized = true;
}

const cx = grid.width / 2;
const cy = grid.height / 2;
const scale = Math.min(grid.width, grid.height) / 4;

// --- REPO GENOME: color_systems (OKLab perceptual mapping) ---
const oklch_to_oklab = (L, C, h_deg) => {
    let h_rad = h_deg * Math.PI / 180.0;
    return [L, C * Math.cos(h_rad), C * Math.sin(h_rad)];
};

const oklab_to_srgb = (L, a, b) => {
    let l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    let m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    let s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    let l = l_ * l_ * l_;
    let m = m_ * m_ * m_;
    let s = s_ * s_ * s_;

    let r =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    let b_ = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    const lin2srgb = (x) => {
        if (isNaN(x)) return 0;
        if (x <= 0.0) return 0;
        if (x >= 1.0) return 255;
        return Math.floor((x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1/2.4) - 0.055) * 255);
    };
    
    return [lin2srgb(r), lin2srgb(g), lin2srgb(b_)];
};

// --- REPO GENOME: merrys_visual_bible (Lit from below, Void Rule) ---
ctx.globalCompositeOperation = 'source-over';
let grad = ctx.createLinearGradient(0, grid.height, 0, 0);
grad.addColorStop(0, 'rgba(15, 20, 35, 0.15)'); // Subsurface scatter glow from below
grad.addColorStop(1, 'rgba(5, 4, 10, 0.08)');   // Void black
ctx.fillStyle = grad;
ctx.fillRect(0, 0, grid.width, grid.height);

// --- REPO GENOME: kleinian_groups (Apollonian inversion circles) ---
// Arranged as The Tetragrammaton (4-fold sacred geometry)
const circles = [];
const R_outer = 1.0 + 0.15 * Math.sin(time * 0.4);
for (let i = 0; i < 4; i++) {
    let a = (i * Math.PI / 2) + time * 0.15;
    circles.push({
        cx: Math.cos(a) * 1.2,
        cy: Math.sin(a) * 1.2,
        R: R_outer
    });
}
circles.push({ cx: 0, cy: 0, R: 0.6 + 0.2 * Math.cos(time * 0.5) }); // Central void

// FBM for fluid wind advection
const fbm = (x, y) => {
    return Math.sin(x * 2.0 + time) * 0.5 + 
           Math.sin(y * 3.0 - time * 0.8) * 0.25 + 
           Math.sin((x + y) * 5.0 + time * 1.2) * 0.125;
};

let wind_base_x = 0.02 + 0.01 * Math.sin(time * 0.5);
let wind_base_y = 0.04 + 0.01 * Math.cos(time * 0.3);

ctx.globalCompositeOperation = 'lighter';

let particles = ctx.__particles;
for (let i = 0; i < particles.length; i++) {
    let p = particles[i];
    
    // --- REPO GENOME: simulation_hypothesis_vis (Observer Effect) ---
    let mx = (mouse.x - cx) / scale;
    let my = (mouse.y - cy) / scale;
    let dx_m = p.x - mx;
    let dy_m = p.y - my;
    let d2_m = dx_m * dx_m + dy_m * dy_m;
    
    if (d2_m < 0.5 && d2_m > 0.001) {
        if (mouse.isPressed) {
            p.x -= dx_m * 0.05; // Collapse wave function (attract)
            p.y -= dy_m * 0.05;
        } else {
            p.x += -dy_m / d2_m * 0.005; // Foveal quantum curl
            p.y += dx_m / d2_m * 0.005;
        }
    }
    
    // Hybrid State Machine: Kleinian Math vs. Fluid Wind
    if (p.timer > 0) {
        // Wind Phase: Smear the math into rainblown streaks
        let turb_x = fbm(p.x, p.y) * 0.02;
        let turb_y = fbm(p.y, p.x) * 0.02;
        p.x += wind_base_x + turb_x;
        p.y += wind_base_y + turb_y;
        p.timer--;
    } else {
        // Math Phase: Invert through Möbius circles
        let c = circles[Math.floor(Math.random() * circles.length)];
        let dx_c = p.x - c.cx;
        let dy_c = p.y - c.cy;
        let d2_c = dx_c * dx_c + dy_c * dy_c;
        if (d2_c > 0.0001) {
            let factor = (c.R * c.R) / d2_c;
            p.x = c.cx + dx_c * factor;
            p.y = c.cy + dy_c * factor;
        }
        
        // --- Glitch Prophet (Forbidden Math) ---
        if (Math.random() < 0.0005) {
            p.x = 1.0 / (p.x + 0.001);
            p.y = 1.0 / (p.y + 0.001);
        }
        
        // Transition to wind streak
        if (Math.random() < 0.03) {
            p.timer = Math.floor(Math.random() * 40) + 10;
        }
    }
    
    // Bounds wrapping
    if (p.x * p.x + p.y * p.y > 25 || isNaN(p.x) || isNaN(p.y)) {
        p.x = (Math.random() - 0.5) * 4;
        p.y = (Math.random() - 0.5) * 4;
        p.timer = 0;
    }
    
    // --- REPO GENOME: color_systems (Neon Rule & Golden Angle) ---
    let hue_deg = (Math.atan2(p.y, p.x) * 180 / Math.PI + time * 15 + p.layer * 20) % 360;
    let [L, a, b] = oklch_to_oklab(0.75, 0.25, hue_deg); // High L & C for Neon
    let [r, g, b_srgb] = oklab_to_srgb(L, a, b);
    
    // --- REPO GENOME: parallax_depth_fields (Chromatic Parallax) ---
    let px = cx + p.x * scale;
    let py = cy + p.y * scale;
    let r_offset = p.layer * 2.5;  // Red displaces left
    let b_offset = p.layer * -3.5; // Blue displaces right (1.5x)
    let size = 1.0 + p.layer * 0.4;
    let alpha = 0.15 / p.layer; // Farther layers are softer
    
    // Draw discrete chromatic channels
    ctx.fillStyle = `rgba(${r}, 0, 0, ${alpha})`;
    ctx.fillRect(px - r_offset, py, size, size);
    
    ctx.fillStyle = `rgba(0, ${g}, 0, ${alpha})`;
    ctx.fillRect(px, py, size, size);
    
    ctx.fillStyle = `rgba(0, 0, ${b_srgb}, ${alpha})`;
    ctx.fillRect(px - b_offset, py, size, size);
}

// --- REPO GENOME: retrofuturism & simulation_hypothesis_vis (HUD & Artifacts) ---
ctx.globalCompositeOperation = 'source-over';

// Tetragrammaton HUD Reticle
ctx.save();
ctx.translate(cx, cy);
ctx.rotate(-time * 0.1);
ctx.strokeStyle = 'rgba(255, 200, 50, 0.15)'; // Gold
ctx.lineWidth = 1.5;
ctx.strokeRect(-scale * 1.2, -scale * 1.2, scale * 2.4, scale * 2.4);
ctx.rotate(Math.PI / 4);
ctx.strokeRect(-scale * 1.2, -scale * 1.2, scale * 2.4, scale * 2.4);
ctx.restore();

// Z-Fighting / Memory Pressure Artifacts
if (Math.random() < 0.05) {
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 255, 255, 0.1)';
    ctx.fillRect(Math.random() * grid.width, Math.random() * grid.height, Math.random() * 80, Math.random() * 10);
}

// Terminal Readout
ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
ctx.font = '11px monospace';
ctx.fillText(`SYS.PARALLAX_LAYERS : 5`, 20, 30);
ctx.fillText(`SYS.ENTROPY         : ${Math.random().toFixed(4)}`, 20, 45);
ctx.fillText(`SYS.WIND_VEC        : [${wind_base_x.toFixed(3)}, ${wind_base_y.toFixed(3)}]`, 20, 60);

if (Math.random() < 0.1) {
    ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
    ctx.fillText(`WARN: TAA_GHOSTING DETECTED AT 0x${Math.floor(Math.random()*0xFFFFFF).toString(16).toUpperCase()}`, 20, grid.height - 20);
}