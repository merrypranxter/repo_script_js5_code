const PHI = 1.618033988749895; // Golden Ratio (5-fold)
const DELTA_S = 2.414213562373095; // Silver Ratio (8-fold)
const PI2 = Math.PI * 2;

// Feral Initialization
if (!window.__FERAL_QC) {
    window.__FERAL_QC = {
        offCanvas: document.createElement('canvas'),
        boids: [],
        res: 4, // Downscale factor for the fluid simulation
        initialized: false
    };
    window.__FERAL_QC.offCtx = window.__FERAL_QC.offCanvas.getContext('2d', { alpha: false });

    // 5-fold (Penrose) direction vectors
    window.__FERAL_QC.dirs5 = Array.from({length: 5}, (_, i) => ({
        x: Math.cos(i * PI2 / 5),
        y: Math.sin(i * PI2 / 5)
    }));

    // 8-fold (Ammann-Beenker) direction vectors
    window.__FERAL_QC.dirs8 = Array.from({length: 4}, (_, i) => ({
        x: Math.cos(i * Math.PI / 4),
        y: Math.sin(i * Math.PI / 4)
    }));

    // Initialize flock of Penrose Kites
    for (let i = 0; i < 40; i++) {
        window.__FERAL_QC.boids.push({
            x: Math.random() * 2000,
            y: Math.random() * 2000,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            hue: Math.random() * 360,
            type: Math.random() > 0.5 ? 'kite' : 'dart'
        });
    }
}

const state = window.__FERAL_QC;
const w = Math.ceil(grid.width / state.res);
const h = Math.ceil(grid.height / state.res);

if (state.offCanvas.width !== w || state.offCanvas.height !== h) {
    state.offCanvas.width = w;
    state.offCanvas.height = h;
    state.imgData = state.offCtx.createImageData(w, h);
}

const data = state.imgData.data;
const t = time * 0.5;

// Mouse interaction (Phason Strain Injector)
let mx = mouse.x / state.res;
let my = mouse.y / state.res;
let isPressed = mouse.isPressed;

// --- 1. THE STRANGE MECHANISM: Icosahedral Leopard Sludge ---
// We generate a continuous 2D scalar field using quasicrystal cut-and-project math.
// Left side = 5-fold (Penrose), Right side = 8-fold (Ammann-Beenker).
// We threshold this field to create Lisa Frank leopard spots.

let i = 0;
let scale = 0.15; // Grid frequency

for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
        
        // Domain Warping (The sludge factor)
        let warpX = Math.sin(y * 0.05 + t) * 2.0;
        let warpY = Math.cos(x * 0.05 - t) * 2.0;
        
        // Phason Strain from mouse (breaks the mathematical perfection)
        let dx = x - mx;
        let dy = y - my;
        let dist = Math.sqrt(dx*dx + dy*dy);
        let phasonStrain = 0;
        if (dist < 100) {
            phasonStrain = Math.exp(-dist * 0.05) * (isPressed ? 10.0 : 2.0) * Math.sin(t * 10);
        }

        let xx = (x + warpX) * scale;
        let yy = (y + warpY) * scale;

        // Calculate 5-fold interference (Penrose)
        let v5 = 0;
        for (let k = 0; k < 5; k++) {
            let phase = t * (k % 2 === 0 ? PHI : 1/PHI) + phasonStrain;
            v5 += Math.cos(xx * state.dirs5[k].x + yy * state.dirs5[k].y + phase);
        }

        // Calculate 8-fold interference (Ammann-Beenker)
        let v8 = 0;
        for (let k = 0; k < 4; k++) {
            let phase = -t * (k % 2 === 0 ? DELTA_S : 1) - phasonStrain;
            v8 += Math.cos(xx * state.dirs8[k].x + yy * state.dirs8[k].y + phase);
        }

        // Spatial blending between 5-fold and 8-fold across the screen
        let blend = x / w; 
        let v = v5 * (1 - blend) + v8 * blend;

        // Normalize v roughly to 0..1
        let vn = (v + 5) / 10; 

        // --- LISA FRANK LEOPARD PRINT LOGIC ---
        // We use a high-frequency sine on the structural field to create rings (spots)
        let spotSignal = Math.sin(vn * 30.0 + t * 2.0);
        
        let r, g, b;

        // Dead pixels behaving like Lisa Frank glitter
        if (Math.random() < 0.001) {
            r = 255; g = 255; b = 255; // Diamond glitter
        } else if (spotSignal > 0.6 && spotSignal < 0.85) {
            // The black outline of the leopard spot
            r = 10; g = 0; b = 20; 
        } else if (spotSignal >= 0.85) {
            // The hyper-color inside the spot
            let spotHue = (vn * 500 + t * 100) % 360;
            // Fast inline HSL (neon saturated) to RGB approximation for core colors
            if (spotHue < 120) { r=255; g=0; b=255; } // Magenta
            else if (spotHue < 240) { r=0; g=255; b=255; } // Cyan
            else { r=255; g=255; b=0; } // Yellow
        } else {
            // The iridescent rainbow sludge background
            r = Math.sin(vn * 10.0 + t) * 127 + 128;
            g = Math.sin(vn * 10.0 + t + 2.09) * 127 + 128; // +120 deg
            b = Math.sin(vn * 10.0 + t + 4.18) * 127 + 128; // +240 deg
            
            // Overclock the contrast to make it 'neon'
            r = r > 180 ? 255 : r * 0.6;
            g = g > 180 ? 255 : g * 0.6;
            b = b > 180 ? 255 : b * 0.6;
        }

        data[i++] = r;
        data[i++] = g;
        data[i++] = b;
        data[i++] = 255;
    }
}

state.offCtx.putImageData(state.imgData, 0, 0);

// Draw the feral sludge to the main canvas
ctx.save();
// Disable smoothing to let the mathematical grit show through the neon
ctx.imageSmoothingEnabled = false; 
ctx.drawImage(state.offCanvas, 0, 0, grid.width, grid.height);
ctx.restore();

// --- 2. BOIDS: The Penrose Escapees ---
// Kites and Darts trying to escape the boiling mathematical sludge.

ctx.lineJoin = 'round';

state.boids.forEach(boid => {
    // Flocking logic (simplified for speed, driven by the background gradient)
    // Boids seek the mouse, but are repelled by the boundaries
    let dx = mouse.x - boid.x;
    let dy = mouse.y - boid.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist > 0) {
        boid.vx += (dx / dist) * 0.1;
        boid.vy += (dy / dist) * 0.1;
    }

    // Add some irrational wandering based on Phi
    boid.vx += Math.cos(t * PHI + boid.hue) * 0.5;
    boid.vy += Math.sin(t * DELTA_S + boid.hue) * 0.5;

    // Friction and speed limit
    let speed = Math.sqrt(boid.vx*boid.vx + boid.vy*boid.vy);
    if (speed > 8) {
        boid.vx = (boid.vx / speed) * 8;
        boid.vy = (boid.vy / speed) * 8;
    }
    
    boid.x += boid.vx;
    boid.y += boid.vy;

    // Wrap around
    if (boid.x < 0) boid.x = grid.width;
    if (boid.x > grid.width) boid.x = 0;
    if (boid.y < 0) boid.y = grid.height;
    if (boid.y > grid.height) boid.y = 0;

    // Draw the Penrose Kite or Dart
    ctx.save();
    ctx.translate(boid.x, boid.y);
    let angle = Math.atan2(boid.vy, boid.vx);
    ctx.rotate(angle + Math.PI / 2); // Point forward
    
    let sz = 15;
    ctx.beginPath();
    
    if (boid.type === 'kite') {
        // Penrose Kite geometry (approximate for visual flair)
        ctx.moveTo(0, -sz * PHI); // Apex (72 deg)
        ctx.lineTo(sz, 0);        // Right wing (72 deg)
        ctx.lineTo(0, sz * 0.618); // Base (144 deg)
        ctx.lineTo(-sz, 0);       // Left wing (72 deg)
    } else {
        // Penrose Dart geometry
        ctx.moveTo(0, -sz);       // Apex (36 deg)
        ctx.lineTo(sz * PHI, sz); // Right wing (72 deg)
        ctx.lineTo(0, sz * 0.382); // Inner reflex (216 deg)
        ctx.lineTo(-sz * PHI, sz); // Left wing (72 deg)
    }
    ctx.closePath();

    // Lisa Frank Neon Styling
    ctx.globalCompositeOperation = 'screen';
    ctx.shadowBlur = 20;
    ctx.shadowColor = `hsl(${boid.hue + t * 50}, 100%, 50%)`;
    ctx.fillStyle = `hsl(${boid.hue + t * 50 + 180}, 100%, 60%)`;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    
    ctx.restore();
});