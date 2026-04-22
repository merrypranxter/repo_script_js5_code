// [GENOME: alien_language | little_green_men | crop_circles | g2 | color_fields | noise | pixel_voxel]
// THE STRANGE MECHANISM: Torsional Dither-Glyph Infection
// A biological, corrupted interface where "Oraphine" alien glyphs are grown and mutated 
// by a "G2 Torsion Field". The field creates strain/fractures (singularities) which leak 
// "Neon Acid" and "Little Green Men" radioactive green. The entire system is rendered 
// through a "Ditherpunk" lens, mapping continuous organic forces into a strict 4-color 
// pixelated palette using a Bayer 4x4 threshold matrix and temporal smearing.

const TARGET_PIXELS = 60000; // Optimize for 60fps JavaScript execution
const pixelSize = Math.max(2, Math.ceil(Math.sqrt((grid.width * grid.height) / TARGET_PIXELS)));
const vw = Math.floor(grid.width / pixelSize);
const vh = Math.floor(grid.height / pixelSize);

// Initialize virtual buffer and temporal energy field
if (!ctx.vCanvas || ctx.vCanvas.width !== vw || ctx.vCanvas.height !== vh) {
    ctx.vCanvas = document.createElement('canvas');
    ctx.vCanvas.width = vw;
    ctx.vCanvas.height = vh;
    ctx.vCtx = ctx.vCanvas.getContext('2d', { willReadFrequently: true, alpha: false });
    ctx.imgData = ctx.vCtx.createImageData(vw, vh);
    ctx.buf = new Uint32Array(ctx.imgData.data.buffer);
    ctx.energyBuf = new Float32Array(vw * vh);
}

// Bayer 4x4 Dither Matrix (Normalized 0-15)
const bayer = [
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5]
];

// Palette: ABGR Little Endian Format
const PALETTE = [
    0xFF0A050A, // Void Black (Very dark cosmic purple/green)
    0xFF691B2D, // Cosmic Void Purple (#2d1b69)
    0xFFFF00FF, // Neon Acid Magenta (#ff00ff)
    0xFF14FF39  // Alien Green (#39FF14)
];

// Fast pseudo-random hash
function hash(n) {
    return (Math.sin(n) * 43758.5453123) % 1.0;
}

// Fast 2D Value Noise
function vnoise(x, y) {
    let ix = Math.floor(x), iy = Math.floor(y);
    let fx = x - ix, fy = y - iy;
    let u = fx * fx * (3.0 - 2.0 * fx);
    let v = fy * fy * (3.0 - 2.0 * fy);
    
    let n00 = hash(ix + iy * 57.0);
    let n10 = hash(ix + 1.0 + iy * 57.0);
    let n01 = hash(ix + (iy + 1.0) * 57.0);
    let n11 = hash(ix + 1.0 + (iy + 1.0) * 57.0);
    
    let nx0 = n00 + (n10 - n00) * u;
    let nx1 = n01 + (n11 - n01) * u;
    return nx0 + (nx1 - nx0) * v;
}

// Fractal Brownian Motion
function fbm(x, y, t) {
    let v = 0.0;
    let a = 0.5;
    let shift = vec2(100.0, 100.0);
    for (let i = 0; i < 3; i++) {
        v += a * vnoise(x + t, y - t);
        x = x * 2.0 + shift.x;
        y = y * 2.0 + shift.y;
        a *= 0.5;
    }
    return v;
}

function vec2(x, y) { return {x, y}; }

let t = time * 0.4;
let idx = 0;

let mx = (mouse.x / grid.width) * 2.0 - 1.0;
let my = (mouse.y / grid.height) * 2.0 - 1.0;
mx *= vw / vh;

for (let y = 0; y < vh; y++) {
    for (let x = 0; x < vw; x++) {
        let nx = (x / vw) * 2.0 - 1.0;
        let ny = (y / vh) * 2.0 - 1.0;
        nx *= vw / vh;

        // --- G2 DOMAIN WARP & PHI FIELD ---
        // Iterative domain warp creating psychedelic turbulent flow
        let qx = fbm(nx * 2.0, ny * 2.0, t * 0.2);
        let qy = fbm(nx * 2.0 + 5.2, ny * 2.0 + 1.3, -t * 0.2);
        
        let rx = fbm(nx * 4.0 + 4.0 * qx, ny * 4.0 + 4.0 * qy, t);
        
        let wx = nx + qx * 0.4;
        let wy = ny + qy * 0.4;

        // --- POLAR MAPPING (CROP CIRCLES) ---
        let r = Math.sqrt(wx * wx + wy * wy);
        let a = Math.atan2(wy, wx);

        // --- G2 TORSION & FRACTURE ---
        // Strain where the field misaligns
        let torsion = Math.abs(Math.sin(r * 12.0 - a * 5.0 + t * 2.0));
        let fracture = Math.pow(Math.max(0, Math.sin(r * 25.0 + qy * 10.0 - t * 5.0)), 16.0);

        // --- ORAPHINE GLYPHIC STRUCTURE ---
        // Radial bands and angular sectors
        let ring = Math.floor(r * 7.0 - t * 0.5);
        let sector = Math.floor((a + rx * 0.5) * 10.0 / Math.PI);
        
        let cell_hash = hash(ring * 113.0 + sector * 57.0);
        
        let r_fract = (r * 7.0 - t * 0.5) - ring;
        let a_fract = ((a + rx * 0.5) * 10.0 / Math.PI) - sector;

        let struct_energy = 0.0;

        if (r < 0.3) {
            // Central Eye Seal
            let eye = Math.pow(Math.sin(r * Math.PI * 3.0 - t * 2.0), 2.0) * Math.pow(Math.sin(a * 4.0), 2.0);
            struct_energy += eye > 0.6 ? 2.0 : 0.0;
        } else {
            if (cell_hash < 0.3) {
                // Stem (Vertical/Radial support)
                struct_energy += Math.pow(1.0 - Math.abs(a_fract - 0.5) * 2.0, 6.0) * Math.sin(r_fract * Math.PI);
            } else if (cell_hash < 0.6) {
                // Eye Chamber (Containment)
                let eye = Math.pow(Math.sin(r_fract * Math.PI), 2.0) * Math.pow(Math.sin(a_fract * Math.PI), 2.0);
                struct_energy += eye > 0.4 ? 1.2 : 0.0;
                // Central Node Accent
                if (eye > 0.85) struct_energy += 1.5;
            } else if (cell_hash < 0.8) {
                // Crescent / Fork
                let crescent = Math.abs(r_fract - a_fract) < 0.15 ? 1.0 : 0.0;
                struct_energy += crescent;
            }
            
            // Thin Slash (Corruption modifier)
            if (hash(cell_hash * 3.14) > 0.8 && Math.abs(r_fract + a_fract - 1.0) < 0.1) {
                struct_energy += 1.5;
            }
        }

        // --- COMBINE ENERGIES ---
        let raw_energy = (struct_energy * 0.8) + (fracture * 2.5) + (torsion * 0.3) + (rx * 0.4);

        // Singularity Injection (Mouse interaction)
        if (mouse.isPressed) {
            let dx = nx - mx;
            let dy = ny - my;
            let d = Math.sqrt(dx * dx + dy * dy);
            raw_energy += Math.pow(Math.max(0, 0.4 - d) * 2.5, 2.0) * 3.0;
        }

        // --- TEMPORAL SMEARING (REACTION/DECAY) ---
        // Creates a biological trailing effect
        let smoothed = raw_energy * 0.25 + ctx.energyBuf[idx] * 0.75;
        ctx.energyBuf[idx] = smoothed;

        // --- DITHERPUNK THRESHOLDING ---
        // Map continuous energy to discrete 4-color palette using Bayer matrix
        let bayer_val = bayer[y % 4][x % 4] / 16.0;
        
        // Scale energy to fit 0..3 palette range with dither spread
        let dither_step = smoothed * 1.8 + bayer_val * 1.2 - 0.2;
        let quantized = Math.floor(dither_step);
        
        // Clamp to palette bounds
        quantized = Math.max(0, Math.min(3, quantized));

        // Write to pixel buffer
        ctx.buf[idx++] = PALETTE[quantized];
    }
}

// Render virtual buffer to offscreen canvas
ctx.vCtx.putImageData(ctx.imgData, 0, 0);

// Draw scaled-up to main canvas (Nearest Neighbor for crisp pixels)
ctx.imageSmoothingEnabled = false;
ctx.drawImage(ctx.vCanvas, 0, 0, grid.width, grid.height);

// Overlay scanlines for retro CRT / Biotech interface feel
ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
for (let y = 0; y < grid.height; y += pixelSize * 2) {
    ctx.fillRect(0, y, grid.width, pixelSize);
}