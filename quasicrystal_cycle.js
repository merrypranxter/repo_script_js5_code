(function(ctx, grid, time, repos, input, mouse, canvas, THREE) {
    // FERAL DESIGN BRAIN: KIYOSHI-ABSORBER-V1 x ALCHEMICAL SCRIPTURE
    // HYPERBOLIC 7-FOLD QUASICRYSTAL <--> XOR-GHOST MANIFOLD COLLAPSE
    
    const scale = 3; 
    const w = Math.ceil(grid.width / scale);
    const h = Math.ceil(grid.height / scale);

    if (!canvas.__qcBuffer || canvas.__qcBuffer.width !== w || canvas.__qcBuffer.height !== h) {
        canvas.__qcBuffer = ctx.createImageData(w, h);
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        canvas.__offscreen = off;
        canvas.__offCtx = off.getContext('2d');
    }

    const imgData = canvas.__qcBuffer;
    const data = imgData.data;
    const offCtx = canvas.__offCtx;

    // 15-second cycle logic
    const cycleLen = 15.0;
    const cycle = (time % cycleLen) / cycleLen;
    
    let modeBlend = 0.0;
    if (cycle < 0.4) {
        modeBlend = 0.0; // Crystalline Order
    } else if (cycle < 0.5) {
        let t = (cycle - 0.4) / 0.1;
        modeBlend = t * t * (3 - 2 * t); // Transition to Glitch
    } else if (cycle < 0.9) {
        modeBlend = 1.0; // Structural Dissolution
    } else {
        let t = (cycle - 0.9) / 0.1;
        modeBlend = 1.0 - (t * t * (3 - 2 * t)); // Transition to Order
    }

    // 7-fold incommensurate symmetry (Hyperbolic Escher-like)
    const N = 7;
    const kx = new Float32Array(N);
    const ky = new Float32Array(N);
    const phases = new Float32Array(N);
    
    for (let i = 0; i < N; i++) {
        kx[i] = Math.cos(i * Math.PI / N);
        ky[i] = Math.sin(i * Math.PI / N);
        // Phase shifts drift over time, stutter during glitch
        let p = time * (0.2 + i * 0.05);
        let p_stutter = Math.floor(p * 4.0) / 4.0; 
        phases[i] = p * (1.0 - modeBlend) + p_stutter * modeBlend;
    }

    const cosA = Math.cos(time * 0.05);
    const sinA = Math.sin(time * 0.05);
    const hyperStrength = 0.8 + 0.15 * Math.sin(time * 0.2);
    
    // Deterministic pseudo-random for glitch artifacts
    const stepTime = Math.floor(time * 12.0);
    const globalTear = (modeBlend > 0.8 && (Math.sin(stepTime * 13.37) > 0.8)) ? 1 : 0;

    let idx = 0;
    for (let py = 0; py < h; py++) {
        // Horizontal tearing / broadcast failure
        let tearOffset = 0;
        if (globalTear) {
            tearOffset = Math.sin(py * 0.1 + time) * 20.0 * modeBlend;
        }

        for (let px = 0; px < w; px++) {
            let ePx = px + tearOffset;
            
            // Normalize to [-1, 1]
            let nx = (ePx - w / 2) / (w / 2);
            let ny = (py - h / 2) / (h / 2);
            
            // Orbital rotation
            let rx = nx * cosA - ny * sinA;
            let ry = nx * sinA + ny * cosA;
            
            // Poincaré Hyperbolic Projection
            let r2 = rx * rx + ry * ry;
            let denom = 1.0 - r2 * hyperStrength;
            if (denom < 0.01) denom = 0.01; // L-Infinity Escape
            
            let hx = (rx / denom) * 15.0;
            let hy = (ry / denom) * 15.0;

            // XOR-Ghost Manifold (Coordinate Fracture)
            let qx = hx;
            let qy = hy;
            
            if (modeBlend > 0.0) {
                // Bitwise coordinate logic / Addressable trauma
                let quant = 2.0 + 8.0 * modeBlend;
                let bx = (hx * quant) | 0;
                let by = (hy * quant) | 0;
                
                let bitX = bx ^ (by >> 1);
                let bitY = by ^ (bx >> 1);
                
                qx = hx * (1.0 - modeBlend) + (bitX / quant) * modeBlend;
                qy = hy * (1.0 - modeBlend) + (bitY / quant) * modeBlend;
                
                // Machine hesitation (NaN propagation simulation)
                if (modeBlend > 0.9 && ((bx * by) % 113 === 0)) {
                    qx *= -1.0;
                }
            }

            // Evaluate Quasicrystal Field (Sum of plane waves)
            let val = 0.0;
            for (let i = 0; i < N; i++) {
                // Interpolate between Euclidean dot product and L-Infinity metric
                let dot_std = qx * kx[i] + qy * ky[i];
                let dot_linf = Math.max(Math.abs(qx * kx[i]), Math.abs(qy * ky[i])) * Math.sign(dot_std);
                
                let dot_final = dot_std * (1.0 - modeBlend) + dot_linf * modeBlend;
                val += Math.cos(dot_final + phases[i]);
            }

            // COLOR SYNTHESIS
            let R, G, B;

            // State 1: Crystalline Order (Ethereal Glow, Full Spectrum, Strata Ribbons)
            let normVal = val / N; // Approx -1 to 1
            let ribbon = Math.pow(Math.abs(Math.sin(val * Math.PI)), 0.3); // Moiré contouring
            
            let ro = (Math.sin(normVal * 10.0 + time * 1.0) * 0.5 + 0.5) * 255 * ribbon;
            let go = (Math.sin(normVal * 10.0 + time * 1.0 + 2.094) * 0.5 + 0.5) * 255 * ribbon;
            let bo = (Math.sin(normVal * 10.0 + time * 1.0 + 4.188) * 0.5 + 0.5) * 255 * ribbon;

            // State 2: Structural Dissolution (Neon Cyan, Hot Pink, Void Black)
            // Quantize scalar field to create macroblock islands
            let v_q = Math.floor(val * 1.2) / 1.2; 
            let hashP = (v_q * 12.9898 + stepTime * 0.1);
            let hash = Math.abs(Math.sin(hashP) * 43758.5453) % 1.0;
            
            let rg = 5, gg = 5, bg = 5; // Void Black
            if (hash > 0.65) {
                rg = 255; gg = 20; bg = 147; // Hot Pink
            } else if (hash > 0.3) {
                rg = 0; gg = 255; bg = 255; // Neon Cyan
            }
            
            // Dead pixels behaving like pollen
            if (modeBlend > 0.5 && (Math.abs(Math.sin(ePx * 83.1 + py * 17.3 + stepTime)) % 1.0) > 0.995) {
                rg = 255; gg = 255; bg = 255;
            }

            // Chimera Blend
            R = ro * (1.0 - modeBlend) + rg * modeBlend;
            G = go * (1.0 - modeBlend) + gg * modeBlend;
            B = bo * (1.0 - modeBlend) + bg * modeBlend;

            // Write to buffer
            data[idx++] = R;
            data[idx++] = G;
            data[idx++] = B;
            data[idx++] = 255; // Alpha
        }
    }

    // Render low-res buffer to offscreen canvas
    offCtx.putImageData(imgData, 0, 0);

    // Draw scaled up to main canvas (Nearest-neighbor for glitch, smooth for order)
    ctx.imageSmoothingEnabled = modeBlend < 0.1;
    
    // Slight chromatic aberration on final composite
    if (modeBlend > 0.0) {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, grid.width, grid.height);
        
        let shift = modeBlend * 4.0;
        ctx.drawImage(canvas.__offscreen, 0, 0, w, h, shift, 0, grid.width, grid.height);
        ctx.drawImage(canvas.__offscreen, 0, 0, w, h, -shift, 0, grid.width, grid.height);
        ctx.globalCompositeOperation = 'source-over';
    } else {
        ctx.drawImage(canvas.__offscreen, 0, 0, w, h, 0, 0, grid.width, grid.height);
    }
})(ctx, grid, time, repos, input, mouse, canvas, THREE);