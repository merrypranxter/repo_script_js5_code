// The Weird Code Guy - Lisa Frank Quasicrystal Ditherpunk
// Synthesizing: 'pixel_voxel' (ordered dithering, pixel grid lock, outline shaders, palettes),
// 'quasicrystals' (5-fold Penrose / 8-fold Ammann-Beenker wave interference, golden/silver ratios),
// 'lisa_frank_aesthetic' (hyper-vibrant neon gradients, leopard print spots, glossy sparkles).

const pixelSize = 3; 
const vw = Math.ceil(grid.width / pixelSize);
const vh = Math.ceil(grid.height / pixelSize);

// Initialize offscreen buffer for pixel-perfect upscaling
if (!canvas.__offCanvas || canvas.__vw !== vw || canvas.__vh !== vh) {
    canvas.__offCanvas = document.createElement('canvas');
    canvas.__offCanvas.width = vw;
    canvas.__offCanvas.height = vh;
    canvas.__offCtx = canvas.__offCanvas.getContext('2d');
    canvas.__imgData = canvas.__offCtx.createImageData(vw, vh);
    canvas.__buffer = new Uint8Array(vw * vh);
    canvas.__bufferDithered = new Uint8Array(vw * vh);
    canvas.__vw = vw;
    canvas.__vh = vh;
}

const offCanvas = canvas.__offCanvas;
const offCtx = canvas.__offCtx;
const imgData = canvas.__imgData;
const data = imgData.data;
const buffer = canvas.__buffer;
const bufferDithered = canvas.__bufferDithered;

// Interaction & Symmetries
let mx = mouse.x || grid.width / 2;
let my = mouse.y || grid.height / 2;

// 8-fold Ammann-Beenker (Silver Ratio) if pressed, 5-fold Penrose (Golden Ratio) if not
const N = mouse.isPressed ? 8 : 5;
const ratio = mouse.isPressed ? 2.4142135623 : 1.6180339887; 

// Lisa Frank Hyper-Vibrant Palette
const PALETTE = [
    [255, 0, 255],   // 0: Hot Magenta
    [138, 43, 226],  // 1: Blue Violet
    [0, 255, 255],   // 2: Cyan
    [57, 255, 20],   // 3: Neon Lime
    [255, 255, 0],   // 4: Yellow
    [255, 140, 0],   // 5: Orange
    [255, 20, 147],  // 6: Deep Pink
    [255, 0, 255]    // 7: Loop back to Magenta for smooth modulo wrap
];
const PAL_LEN = PALETTE.length - 1;

// Standard 4x4 Bayer Matrix for Ditherpunk shading
const bayer4x4 = [
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5
];

// Time & Kinematics
const t = time * 0.5;
const rot = t * 0.1;
const baseK = 0.02 + (mx / grid.width) * 0.08; // Base frequency
const k1 = baseK;
const k2 = baseK * ratio; // Self-similar hierarchical frequency
const bands = 1.0 + (my / grid.height) * 4.0; // Number of gradient repetitions

const phase1 = t * 1.5;
const phase2 = t * -0.618;

// Precompute projection angles for N-fold symmetry
const angles = [];
for (let j = 0; j < N; j++) {
    let a = (j * Math.PI / N) - rot;
    angles.push({
        c: Math.cos(a),
        s: Math.sin(a)
    });
}

const spread = 1.2 / PAL_LEN; // Dither noise spread

// PASS 1: Quasicrystal Field Generation & Dithering
for (let y = 0; y < vh; y++) {
    // Feral design: Paper misregistration / scanline glitches
    let glitchShift = 0;
    if (Math.sin(t * 6.0 + y * 0.1) > 0.98) glitchShift = 8;
    if (Math.cos(t * 5.0 + y * 0.02) > 0.99) glitchShift = -12;

    for (let x = 0; x < vw; x++) {
        let cx = x - vw / 2 + glitchShift;
        let cy = y - vh / 2;
        
        let v = 0;
        // Sum of plane waves to generate aperiodic quasi-crystalline order
        for (let j = 0; j < N; j++) {
            let dot = cx * angles[j].c + cy * angles[j].s;
            v += Math.cos(k1 * dot + phase1);
            v += 0.5 * Math.cos(k2 * dot + phase2); // Inflation/Deflation echo
        }
        
        // Normalize v from [-1.5N, 1.5N] to [0, 1]
        let nv = (v / (N * 1.5)) * 0.5 + 0.5;
        
        // Wrap phase for repeating concentric color bands
        let wrapped_nv = (nv * bands - t * 0.5) % 1.0;
        if (wrapped_nv < 0) wrapped_nv += 1.0;
        
        // Base macro index for outline detection
        let macroIdx = Math.floor(wrapped_nv * PAL_LEN);
        macroIdx = Math.max(0, Math.min(PAL_LEN, macroIdx));
        
        // Apply Bayer ordered dither
        let bayer = bayer4x4[(y % 4) * 4 + (x % 4)] / 15.0;
        let dithered = wrapped_nv + (bayer - 0.5) * spread;
        
        let pIdx = Math.floor(dithered * PAL_LEN);
        pIdx = Math.max(0, Math.min(PAL_LEN, pIdx));
        
        let idx = y * vw + x;
        buffer[idx] = macroIdx;
        bufferDithered[idx] = pIdx;
    }
}

// PASS 2: Sobel-style Edge Detection & Palette Mapping
for (let y = 0; y < vh; y++) {
    for (let x = 0; x < vw; x++) {
        let idx = y * vw + x;
        let macroIdx = buffer[idx];
        let pIdx = bufferDithered[idx];
        
        // Detect edges based on the macro (undithered) bands
        let isEdge = false;
        if (x < vw - 1 && buffer[idx + 1] !== macroIdx) isEdge = true;
        if (y < vh - 1 && buffer[idx + vw] !== macroIdx) isEdge = true;
        
        // Lisa Frank glossy sparkles on edges
        let sparkleNoise = (Math.sin(x * 12.9898 + y * 78.233 + time) * 43758.5453) % 1;
        let isSparkle = isEdge && (sparkleNoise > 0.98);
        
        let col;
        if (isEdge) {
            col = isSparkle ? [255, 255, 255] : [20, 0, 40]; // Deep space purple outlines
        } else {
            // Invert palette if mouse is pressed (Ammann-Beenker mode)
            col = mouse.isPressed ? PALETTE[PAL_LEN - pIdx] : PALETTE[pIdx];
        }
        
        let imgIdx = idx * 4;
        data[imgIdx] = col[0];
        data[imgIdx + 1] = col[1];
        data[imgIdx + 2] = col[2];
        data[imgIdx + 3] = 255;
    }
}

// Render to offscreen canvas, then upscale to main canvas with nearest-neighbor for crisp pixels
offCtx.putImageData(imgData, 0, 0);

ctx.imageSmoothingEnabled = false;
ctx.drawImage(offCanvas, 0, 0, vw * pixelSize, vh * pixelSize);