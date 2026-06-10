const w = 320;
const h = 240;

// High-performance integer hash for procedural noise
function hashInt(x, y, z) {
    let h_val = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0;
    h_val = Math.imul(h_val ^ (h_val >> 13), 1274126177);
    return (h_val ^ (h_val >> 16)) >>> 0;
}

function hashFloat(x, y, z) {
    return hashInt(x, y, z) / 4294967296.0;
}

class Sticker {
    constructor(cw, ch) {
        this.reset(cw, ch);
        this.x = Math.random() * cw;
        this.y = Math.random() * ch;
    }
    reset(cw, ch) {
        this.x = Math.random() * cw;
        this.y = -20;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = Math.random() * 2 + 1;
        
        const rand = Math.random();
        if (rand > 0.6) this.type = 'window';
        else if (rand > 0.3) this.type = 'heart';
        else this.type = 'text';
        
        this.text = ["xoxo", "rawr xD", "404", "lol", "brb", "h4x0r", "broken"][Math.floor(Math.random()*7)];
        this.color = ["#ff4fcf", "#00ffff", "#9fe818", "#ffffff", "#ffff00"][Math.floor(Math.random()*5)];
        this.scale = Math.random() * 0.5 + 0.8;
    }
    update(cw, ch) {
        this.x += this.vx; 
        this.y += this.vy;
        if (this.x < -40 || this.x > cw + 40) this.vx *= -1;
        if (this.y < -40 || this.y > ch + 40) this.vy *= -1;
    }
    draw(ctx, t) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        
        if (this.type === 'heart') {
            ctx.fillStyle = this.color;
            ctx.font = "bold 24px Arial";
            ctx.fillText("♥", 0, 0);
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1;
            ctx.strokeText("♥", 0, 0);
        } else if (this.type === 'window') {
            // Win95 Error Box
            ctx.fillStyle = "#c0c0c0";
            ctx.fillRect(0, 0, 80, 40);
            ctx.fillStyle = "white"; ctx.fillRect(0,0,80,1); ctx.fillRect(0,0,1,40);
            ctx.fillStyle = "black"; ctx.fillRect(79,0,1,40); ctx.fillRect(0,39,80,1);
            
            ctx.fillStyle = "#000080"; 
            ctx.fillRect(2, 2, 76, 10);
            
            ctx.fillStyle = "white";
            ctx.font = "8px sans-serif";
            ctx.fillText("Alert", 4, 10);
            
            ctx.fillStyle = "black";
            ctx.fillText(this.text, 6, 24);
            
            ctx.fillStyle = "#c0c0c0";
            ctx.fillRect(30, 28, 20, 9);
            ctx.strokeStyle = "black";
            ctx.strokeRect(30, 28, 20, 9);
            ctx.fillStyle = "black";
            ctx.fillText("OK", 34, 35);
        } else if (this.type === 'text') {
            ctx.font = "italic bold 18px 'Comic Sans MS', cursive";
            ctx.fillStyle = this.color;
            ctx.shadowColor = "black";
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillText(this.text, 0, 0);
        }
        ctx.restore();
    }
}

class Sparkle {
    constructor(cw, ch) {
        this.x = Math.random() * cw;
        this.y = Math.random() * ch;
        this.size = Math.random() * 15 + 8;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 4 + 2;
    }
    update(cw, ch) {
        this.x += Math.sin(this.phase) * 0.5;
        this.y += Math.cos(this.phase) * 0.5;
        if (this.x < 0) this.x = cw;
        if (this.x > cw) this.x = 0;
        if (this.y < 0) this.y = ch;
        if (this.y > ch) this.y = 0;
    }
    draw(ctx, t) {
        let s = this.size * Math.pow(Math.sin(t * this.speed + this.phase), 4); 
        if (s < 0.5) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(t * this.speed * 0.1);
        
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(0, 0, s, 0);
        ctx.quadraticCurveTo(0, 0, 0, s);
        ctx.quadraticCurveTo(0, 0, -s, 0);
        ctx.quadraticCurveTo(0, 0, 0, -s);
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.shadowColor = "#ff4fcf";
        ctx.shadowBlur = s;
        ctx.fill();
        
        ctx.scale(0.3, 0.3);
        ctx.fillStyle = "white";
        ctx.shadowBlur = 0;
        ctx.fill();
        
        ctx.restore();
    }
}

// Initialize state
if (!canvas.__mySpaceState) {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = w; bgCanvas.height = h;
    const bgCtx = bgCanvas.getContext('2d', { willReadFrequently: true });
    
    const lrCanvas = document.createElement('canvas');
    lrCanvas.width = w; lrCanvas.height = h;
    const lrCtx = lrCanvas.getContext('2d', { willReadFrequently: true });
    
    canvas.__mySpaceState = {
        bgCanvas, bgCtx,
        lrCanvas, lrCtx,
        stickers: Array.from({length: 18}, () => new Sticker(w, h)),
        sparkles: Array.from({length: 50}, () => new Sparkle(grid.width, grid.height))
    };
}

const state = canvas.__mySpaceState;
const { bgCanvas, bgCtx, lrCanvas, lrCtx, stickers, sparkles } = state;

// 1. Pixel Op Art Generation (The Host)
const imgData = bgCtx.createImageData(w, h);
const data = imgData.data;

const t = time;
const cx = w/2 + Math.sin(t)*30;
const cy = h/2 + Math.cos(t*1.3)*20;
const tFloor4 = Math.floor(t*4);
const tFloor2 = Math.floor(t*2 + 10);

for(let y=0; y<h; y++) {
    let by = Math.floor(y/16);
    for(let x=0; x<w; x++) {
        let bx = Math.floor(x/16);
        
        let hf1 = hashFloat(bx, by, tFloor4);
        let hf2 = hashFloat(bx, by, tFloor2);
        
        let idx = (y*w + x) << 2;
        
        if (hf2 > 0.92) {
            // Datamosh hole (transparent to reveal feedback layer)
            data[idx+3] = 0;
        } else {
            let dx = x - cx;
            let dy = y - cy;
            let dist = Math.sqrt(dx*dx + dy*dy) || 1;
            let angle = Math.atan2(dy, dx);
            
            // Stripe fluid distortion
            let warp = Math.sin(angle * 6 + t * 4) * 15;
            let r = dist + warp;
            
            // Checker funnel logic
            let u = 800.0 / r + t * 6;
            let v = (angle * 8 / Math.PI) + Math.sin(r * 0.03 - t*2);
            
            let pattern = (Math.floor(u) + Math.floor(v)) % 2 === 0;
            
            let rCol = pattern ? 255 : 0;
            let gCol = rCol, bCol = rCol;
            
            // Macroblock Acid Color Glitch
            if (hf1 > 0.88) {
                if (pattern) { rCol=255; gCol=79; bCol=207; } // Hot Pink
                else { rCol=0; gCol=255; bCol=255; }          // Electric Cyan
            }
            
            data[idx]   = rCol;
            data[idx+1] = gCol;
            data[idx+2] = bCol;
            data[idx+3] = 255;
        }
    }
}
bgCtx.putImageData(imgData, 0, 0);

// 2. Temporal Echo / Datamosh Feedback
lrCtx.save();
let moshFloat = hashFloat(0, 0, Math.floor(t*3));

if (moshFloat > 0.8) {
    // Freeze/Stutter
    lrCtx.globalAlpha = 0.95;
    lrCtx.drawImage(lrCanvas, 0, 0);
} else if (moshFloat > 0.6) {
    // Drag down (melt)
    lrCtx.globalAlpha = 0.9;
    lrCtx.drawImage(lrCanvas, 0, 2, w, h);
} else {
    // Hypnotic spin/zoom
    lrCtx.globalAlpha = 0.85;
    lrCtx.translate(w/2, h/2);
    lrCtx.scale(1.02, 1.02);
    lrCtx.rotate(0.02 * Math.sin(t));
    lrCtx.translate(-w/2, -h/2);
    lrCtx.drawImage(lrCanvas, 0, 0);
}
lrCtx.restore();

// 3. Apply Op Art over feedback
lrCtx.drawImage(bgCanvas, 0, 0);

// 4. Draw Myspace Debris (The Parasite)
stickers.forEach(s => {
    s.update(w, h);
    s.draw(lrCtx, t);
});

// 5. RGB Split / VHS Tracking Glitch
const finalImg = lrCtx.getImageData(0, 0, w, h);
const fd = finalImg.data;
const splitImg = bgCtx.createImageData(w, h);
const sd = splitImg.data;

let baseOffset = Math.floor(Math.sin(t*8)*3);

for(let y=0; y<h; y++) {
    let lf = hashFloat(y, Math.floor(t*15), 0);
    let offset = lf > 0.95 ? Math.floor((lf-0.975)*100) : baseOffset;
    
    for(let x=0; x<w; x++) {
        let idx = (y*w + x) << 2;
        let rx = Math.max(0, Math.min(w-1, x - offset));
        let bx = Math.max(0, Math.min(w-1, x + offset));
        
        sd[idx]   = fd[(y*w + rx) << 2];
        sd[idx+1] = fd[idx+1];
        sd[idx+2] = fd[((y*w + bx) << 2) + 2];
        sd[idx+3] = fd[idx+3];
    }
}
// We put the glitched image onto bgCanvas so lrCanvas remains a pure feedback buffer
bgCtx.putImageData(splitImg, 0, 0);

// 6. Final Render to Main Canvas (Low-Res Charm / Nearest Neighbor)
ctx.fillStyle = "black";
ctx.fillRect(0, 0, grid.width, grid.height);
ctx.imageSmoothingEnabled = false;
ctx.drawImage(bgCanvas, 0, 0, grid.width, grid.height);

// 7. High-Res Glitter Graphics & UI Overlay
sparkles.forEach(sp => {
    sp.update(grid.width, grid.height);
    sp.draw(ctx, t);
});

ctx.font = "bold 20px 'Courier New', monospace";
ctx.fillStyle = "#00ffff";
ctx.shadowColor = "black";
ctx.shadowOffsetX = 2;
ctx.shadowOffsetY = 2;
ctx.fillText("xXx_dArK_aNgEl_xXx // 2005", 20, grid.height - 20);

ctx.fillStyle = "#ff4fcf";
ctx.fillText("WARN: F33LINGS.EXE", grid.width - 240, 30);