// ============================================================================
// THE FERAL JACQUARD LOOM
// A generative textile system combining computational fabric structures 
// (warp/weft interlacing, twill/plain weave, machine hesitation) with 
// deep mathematical motifs (domain-warped Julia sets) and structural color 
// (thin-film interference).
// ============================================================================

const ctx2d = ctx; // Ensure we are using the provided context
const w = grid.width;
const h = grid.height;

// Loom constraints
const threadSize = Math.max(4, Math.floor(w / 120)); // Scale threads to canvas
const cols = Math.ceil(w / threadSize);
const rows = Math.ceil(h / threadSize);

// Fabric movement
const scrollY = Math.floor(time * 8.0);
const repeatSize = 64; // Motif tiling size in threads

// Julia Set Parameters (Drifting 'Spiral' Julia)
// Base c = 0.285 + 0.01i from fractals/05_fractal_families/julia_sets.md
const cRe = 0.285 + Math.cos(time * 0.15) * 0.03;
const cIm = 0.01 + Math.sin(time * 0.15) * 0.03;

// Structural Color: Thin-Film Interference Cosine Palette
// Simulates iridescent varying film thickness based on mathematical depth
function getThinFilmColor(t, angleOffset) {
    // Shift optical path by viewing angle (simulated by drape folds)
    const phase = t + angleOffset * 0.25;
    
    // IQ Cosine Palette optimized for structural iridescence
    const r = 0.5 + 0.5 * Math.cos(6.28318 * (1.0 * phase + 0.00));
    const g = 0.5 + 0.5 * Math.cos(6.28318 * (1.0 * phase + 0.33));
    const b = 0.5 + 0.5 * Math.cos(6.28318 * (1.0 * phase + 0.67));
    
    return [r * 255, g * 255, b * 255];
}

// Clear the void
ctx2d.fillStyle = '#050505';
ctx2d.fillRect(0, 0, w, h);

// State for machine hesitation (snapped threads)
// Stored on the canvas object to persist across frames
if (!grid.canvas.__snappedThreads) {
    grid.canvas.__snappedThreads = [];
}
const snappedThreads = grid.canvas.__snappedThreads;

// Weave the fabric
for (let y = 0; y < rows; y++) {
    const fabricY = y - scrollY;
    
    // Physical Drape & Tension (Topology Patterns)
    // Simulates the fabric folding and catching light differently
    const drape = Math.sin(y * 0.08 + time * 0.5) * Math.cos(y * 0.03) * 0.5 + 0.5;
    const tension = Math.sin((y) * 0.02) * 0.5 + 0.5;

    for (let x = 0; x < cols; x++) {
        const px = x * threadSize;
        const py = y * threadSize;
        
        // 1. Structural Selvedge (Finished edges of woven cloth)
        const isSelvedge = x < 4 || x > cols - 5;
        
        let warpTop = false;
        let color = [0, 0, 0];
        let isMotif = false;
        let motifVal = 0;

        if (isSelvedge) {
            // Selvedge is a dense, strong twill structure
            warpTop = (x - fabricY) % 3 === 0;
            color = [200, 40, 60]; // Deep red border
        } else {
            // 2. Motif Generation (Domain-Warped Julia Set)
            let u = (x % repeatSize) / repeatSize;
            let v = (Math.abs(fabricY) % repeatSize) / repeatSize;
            
            // Warp the domain to simulate fabric stretch and organic imperfection
            const warpX = Math.sin(v * 12.0 + time) * 0.015 * tension;
            const warpY = Math.cos(u * 12.0 - time) * 0.015 * tension;
            
            // Map to complex plane [-1.5, 1.5]
            let zx = (u + warpX - 0.5) * 3.0;
            let zy = (v + warpY - 0.5) * 3.0;
            
            // Escape-time iteration
            let iter = 0;
            const maxIter = 24;
            let z2x = zx * zx;
            let z2y = zy * zy;
            
            while (z2x + z2y < 4.0 && iter < maxIter) {
                zy = 2.0 * zx * zy + cIm;
                zx = z2x - z2y + cRe;
                z2x = zx * zx;
                z2y = zy * zy;
                iter++;
            }
            
            // Smooth escape metric
            if (iter < maxIter) {
                const log_zn = Math.log(z2x + z2y) / 2.0;
                const nu = Math.log(log_zn / Math.LN2) / Math.LN2;
                motifVal = (iter + 1 - nu) / maxIter;
            } else {
                motifVal = 1.0;
            }
            
            // 3. Weave Logic (Binary Cellular Automaton Rules)
            // The mathematical fractal is translated into a punch-card binary
            isMotif = motifVal > 0.45 && motifVal < 0.95;
            
            if (isMotif) {
                // Pattern Area: 3/1 Twill Weave (Diagonal Ribs)
                // Warp floats over 3 wefts, under 1
                warpTop = (x - fabricY) % 4 !== 0;
            } else {
                // Ground Area: 1/1 Plain Weave (Checkerboard)
                warpTop = (x + fabricY) % 2 === 0;
            }
            
            // 4. Machine Hesitation / Glitch Textiles
            // Randomly drop stitches to simulate a feral, broken loom
            if (Math.random() < 0.0002) {
                warpTop = !warpTop; // Invert the rule
                // Occasionally spawn a snapped thread
                if (Math.random() < 0.1) {
                    snappedThreads.push({
                        x: px, y: py,
                        vx: (Math.random() - 0.5) * 2,
                        vy: Math.random() * 2 + 1,
                        len: 0, maxLen: Math.random() * 50 + 20,
                        color: getThinFilmColor(motifVal * 3.0, drape)
                    });
                }
            }

            // 5. Material Behavior & Color
            if (warpTop) {
                // Warp Threads: Iridescent Structural Color
                // Film thickness mapped to fractal depth
                color = getThinFilmColor(motifVal * 3.0, drape);
            } else {
                // Weft Threads: Deep Cosmic Void (Absorptive ground)
                color = [15, 10, 25];
            }
        }

        // Apply lighting and drape shadows
        const shade = warpTop ? (0.5 + 0.5 * drape) : (0.2 + 0.4 * drape);
        ctx2d.fillStyle = `rgb(${color[0]*shade}, ${color[1]*shade}, ${color[2]*shade})`;
        ctx2d.fillRect(px, py, threadSize, threadSize);

        // Anisotropic Highlights (Thread Shimmer)
        // Shines perpendicular to the thread direction
        if (warpTop) {
            // Vertical thread -> Vertical highlight
            ctx2d.fillStyle = `rgba(255, 255, 255, ${0.4 * drape})`;
            ctx2d.fillRect(px + threadSize/2 - 0.5, py, 1, threadSize);
        } else {
            // Horizontal thread -> Horizontal highlight
            ctx2d.fillStyle = `rgba(255, 255, 255, ${0.15 * drape})`;
            ctx2d.fillRect(px, py + threadSize/2 - 0.5, threadSize, 1);
        }
        
        // Subtle ambient occlusion in the gaps
        ctx2d.fillStyle = `rgba(0, 0, 0, 0.3)`;
        ctx2d.fillRect(px + threadSize - 1, py, 1, threadSize);
        ctx2d.fillRect(px, py + threadSize - 1, threadSize, 1);
    }
}

// 6. Embellishment / Damage Layer: Snapped Threads
// Simulates physical decay growing out of the mathematical structure
ctx2d.lineCap = 'round';
ctx2d.lineJoin = 'round';

for (let i = snappedThreads.length - 1; i >= 0; i--) {
    const t = snappedThreads[i];
    
    ctx2d.beginPath();
    ctx2d.moveTo(t.x, t.y);
    
    // Physics for the loose thread
    const endX = t.x + t.vx * t.len + Math.sin(time * 2 + t.y) * 5;
    const endY = t.y + t.vy * t.len;
    
    // Draw a curving loose thread
    ctx2d.quadraticCurveTo(
        t.x + t.vx * t.len * 0.5, 
        t.y + t.vy * t.len * 1.5, 
        endX, endY
    );
    
    ctx2d.strokeStyle = `rgba(0,0,0,0.5)`;
    ctx2d.lineWidth = threadSize * 0.6;
    ctx2d.stroke(); // Shadow
    
    ctx2d.strokeStyle = `rgb(${t.color[0]}, ${t.color[1]}, ${t.color[2]})`;
    ctx2d.lineWidth = threadSize * 0.4;
    ctx2d.stroke(); // Thread body
    
    ctx2d.strokeStyle = `rgba(255,255,255,0.6)`;
    ctx2d.lineWidth = threadSize * 0.1;
    ctx2d.stroke(); // Thread highlight
    
    // Grow thread
    if (t.len < t.maxLen) {
        t.len += 0.5;
    }
    
    // Scroll thread with fabric
    t.y += 8.0 * (1/60); // approximate scroll speed per frame
    
    // Remove if off screen
    if (t.y > h + 50) {
        snappedThreads.splice(i, 1);
    }
}