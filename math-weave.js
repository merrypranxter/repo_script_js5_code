ctx.fillStyle = '#050508';
ctx.fillRect(0, 0, grid.width, grid.height);

const count = 65; // Number of threads in warp/weft
const size = Math.min(grid.width, grid.height) * 0.85;
const step = size / count;
const offsetX = (grid.width - size) / 2;
const offsetY = (grid.height - size) / 2;

// --- MATHEMATICAL LOOM & TEXTILE ALCHEMY ---

// Structural Color: Cosine Palette (from color_fields)
// Maps a normalized value [0,1] to an iridescent RGB color
function cosPalette(t, a, b, c, d) {
    const r = Math.floor(255 * clamp(a[0] + b[0] * Math.cos(6.28318 * (c[0] * t + d[0]))));
    const g = Math.floor(255 * clamp(a[1] + b[1] * Math.cos(6.28318 * (c[1] * t + d[1]))));
    const b_val = Math.floor(255 * clamp(a[2] + b[2] * Math.cos(6.28318 * (c[2] * t + d[2]))));
    return `rgb(${r},${g},${b_val})`;
}

function clamp(v) {
    return Math.max(0, Math.min(1, v));
}

// Projection Matrix: Maps grid (i,j) to screen (x,y) with Shibori folds & Leno twists
function project(i, j) {
    // Leno twist: Adjacent warp threads organically twist around each other
    const leno = Math.sin(j * 0.3 + time) * Math.cos(i * 0.3);
    const twistX = Math.sin(i * Math.PI) * leno * 0.6; 
    
    const u = (i + twistX) / count;
    const v = j / count;

    // Shibori fold tension (Hyperbolic/Fractal distortion)
    const foldX = Math.sin(u * 10 + time * 0.8) * Math.cos(v * 8 - time * 0.5);
    const foldY = Math.cos(u * 8 - time * 0.6) * Math.sin(v * 10 + time * 0.7);

    // Attenuate distortion near the edges to keep the fabric bound to the loom
    const edge = Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
    const distortion = 0.05 * edge;

    const x = offsetX + (u + foldX * distortion) * size;
    const y = offsetY + (v + foldY * distortion) * size;
    
    // Calculate tension for dye bleed and structural color shift
    const tension = foldX * foldY * edge;
    
    return { x, y, tension };
}

// Jacquard Weave Logic: Determines if Warp (vertical) or Weft (horizontal) is on top
function getWeave(i, j) {
    // Damask / Quasicrystal interference pattern
    const scale = 0.25;
    const w1 = Math.sin(i * scale + time * 1.2);
    const w2 = Math.sin((i * 0.5 + j * 0.866) * scale - time);
    const w3 = Math.sin((i * -0.5 + j * 0.866) * scale + time * 0.8);
    const jacquard = w1 + w2 + w3;

    // Twill base structure (Herringbone break)
    const twill = (Math.floor(i) + Math.floor(j) * 2) % 4 < 2 ? 0.8 : -0.8;

    // Binary intersection logic
    return (jacquard + twill) > 0;
}

// Draw a single thread segment with shadow for depth
function drawThread(p1, p2, color, thickness) {
    // Shadow / Float Depth
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = 'rgba(2, 2, 5, 0.85)';
    ctx.lineWidth = thickness * 1.6;
    ctx.stroke();

    // Luminous Thread
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.stroke();
}

ctx.lineCap = 'round';

// --- PASS 1: RESIST DYE BLEED (Reaction-Diffusion Bloom) ---
ctx.globalCompositeOperation = 'screen';
for (let i = 0; i <= count; i += 2) {
    for (let j = 0; j <= count; j += 2) {
        const p = project(i, j);
        if (p.tension > 0.1) {
            const radius = Math.max(0.1, step * 5 * p.tension);
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
            grad.addColorStop(0, `rgba(0, 180, 255, ${p.tension * 1.5})`);
            grad.addColorStop(1, `rgba(0, 180, 255, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
ctx.globalCompositeOperation = 'source-over';

// --- PASS 2: PHYSICAL WEAVING ---
for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
        // Evaluate geometry at the exact intersection and segment boundaries
        const pCenter = project(i, j);
        const pTop = project(i, j - 0.5);
        const pBot = project(i, j + 0.5);
        const pLeft = project(i - 0.5, j);
        const pRight = project(i + 0.5, j);

        const isWarpTop = getWeave(i, j);

        // Structural Color palettes based on position and fabric tension
        // Warp: Deep Ocean to Neon Acid shift
        const warpColor = cosPalette(
            (i / count) + pCenter.tension * 2.0,
            [0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1.0, 0.7, 0.4], [0.0, 0.15, 0.2]
        );
        
        // Weft: Sunset Gold to Volcanic shift
        const weftColor = cosPalette(
            (j / count) - pCenter.tension * 2.0,
            [0.8, 0.5, 0.4], [0.2, 0.4, 0.3], [1.0, 1.0, 1.0], [0.0, 0.33, 0.67]
        );

        const threadWidth = step * 0.7;

        // Render back-to-front based on Jacquard logic
        if (isWarpTop) {
            drawThread(pLeft, pRight, weftColor, threadWidth); // Weft goes under
            drawThread(pTop, pBot, warpColor, threadWidth);    // Warp goes over
        } else {
            drawThread(pTop, pBot, warpColor, threadWidth);    // Warp goes under
            drawThread(pLeft, pRight, weftColor, threadWidth); // Weft goes over
        }
    }
}