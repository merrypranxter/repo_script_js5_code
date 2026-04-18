if (!ctx) return;

if (!canvas.__g2_init) {
    const endesga_hex = [
        "1a1c2c", "5d275d", "b13e53", "ef7d57", "ffcd75", "a7f070", "38b764", "257179", 
        "29366f", "3b5dc9", "41a6f6", "73eff7", "f4f4f4", "94b0c2", "566c86", "333c57", 
        "5d2f0f", "a35324", "e07850", "f4b379", "fde89f", "1a3d2b", "2e6e32", "5aab43", 
        "8dc23e", "3e2a0e", "7a4a1e", "c48139", "e8c172", "2d2d2d", "7d7d7d"
    ];
    const gb_hex = ["9bbc0f", "8bac0f", "306230", "0f380f"];

    const hexToRGB = (h) => [
        parseInt(h.substring(0, 2), 16) / 255,
        parseInt(h.substring(2, 4), 16) / 255,
        parseInt(h.substring(4, 6), 16) / 255
    ];

    const rgbToYUV = (rgb) => [
        rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114,
        rgb[0] * -0.147 + rgb[1] * -0.289 + rgb[2] * 0.436,
        rgb[0] * 0.615 + rgb[1] * -0.515 + rgb[2] * -0.100
    ];

    canvas.__pal_main = endesga_hex.map(hexToRGB).map(rgb => ({ rgb, yuv: rgbToYUV(rgb) }));
    canvas.__pal_gb = gb_hex.map(hexToRGB).map(rgb => ({ rgb, yuv: rgbToYUV(rgb) }));

    canvas.__bayer = [
        0, 8, 2, 10,
        12, 4, 14, 6,
        3, 11, 1, 9,
        15, 7, 13, 5
    ];

    const oc = document.createElement('canvas');
    oc.width = 160; 
    oc.height = Math.floor(160 * (grid.height / grid.width));
    canvas.__offscreen = oc;
    canvas.__octx = oc.getContext('2d', { willReadFrequently: true });
    canvas.__imgData = canvas.__octx.createImageData(oc.width, oc.height);
    canvas.__g2_init = true;
}

const oc = canvas.__offscreen;
const octx = canvas.__octx;
const imgData = canvas.__imgData;
const data = imgData.data;
const vw = oc.width;
const vh = oc.height;
const aspect = vw / vh;
const t = time * 0.5;

const mX = (mouse.x / grid.width - 0.5) * 2.0 * aspect;
const mY = (mouse.y / grid.height - 0.5) * 2.0;
const isPressed = mouse.isPressed;

let idx = 0;
for (let y = 0; y < vh; y++) {
    for (let x = 0; x < vw; x++) {
        let pX = (x / vw - 0.5) * 2.0 * aspect;
        let pY = (y / vh - 0.5) * 2.0;

        let distToMouse = Math.hypot(pX - mX, pY - mY);
        let sing = Math.exp(-distToMouse * 6.0) * (isPressed ? 3.0 : 1.0);

        pX += Math.sin(pY * 4.0 + t) * sing * 0.2;
        pY += Math.cos(pX * 4.0 - t) * sing * 0.2;

        let sx = Math.sin(pX * 1.3 + t * 0.7);
        let cy = Math.cos(pY * 1.7 - t * 0.4);
        let swirl = Math.sin((pX + pY) * 2.4 + t * 0.3);

        let px = sx + 0.35 * swirl;
        let py = cy - 0.2 * swirl;
        let pz = Math.sin(pX * pY * 0.7 + t * 0.25);
        let plen = Math.hypot(px, py, pz) || 1;
        px /= plen; py /= plen; pz /= plen;

        let dx = -py;
        let dy = px;
        let dz = Math.cos((pX - pY) * 1.1 - t * 0.2);
        let dlen = Math.hypot(dx, dy, dz) || 1;
        dx /= dlen; dy /= dlen; dz /= dlen;

        let torsion = Math.abs(px * dx + py * dy + pz * dz);

        let pRadial = Math.hypot(pX, pY);
        let fracture = Math.sin(pRadial * 18.0 - torsion * 6.0 + pz * 4.0) * 0.5 + 0.5;
        let axisStress = Math.abs(px - dy);
        let singularityMask = fracture + axisStress * 0.35 + torsion * 0.4 + sing * 1.5;
        let isWound = singularityMask > 1.2;

        let thickness = 150 + 700 * (torsion + pz * 0.5 + 0.5);
        let n_film = 1.33 + sing * 0.2; 
        let pathDiff = 2.0 * n_film * thickness;

        let r = 0.5 + 0.5 * Math.cos((pathDiff / 650.0) * Math.PI * 2.0);
        let g = 0.5 + 0.5 * Math.cos((pathDiff / 550.0) * Math.PI * 2.0);
        let b = 0.5 + 0.5 * Math.cos((pathDiff / 450.0) * Math.PI * 2.0);

        if (singularityMask > 0.9 && !isWound) {
            let seam = (singularityMask - 0.9) * 3.0;
            r += seam * 1.0;
            g += seam * 0.5;
            b += seam * 0.1;
        }

        let bidx = (x % 4) + (y % 4) * 4;
        let bval = canvas.__bayer[bidx] / 16.0;
        let spread = isWound ? 0.6 : 0.25;

        r += (bval - 0.5) * spread;
        g += (bval - 0.5) * spread;
        b += (bval - 0.5) * spread;

        let y_px = r * 0.299 + g * 0.587 + b * 0.114;
        let u_px = r * -0.147 + g * -0.289 + b * 0.436;
        let v_px = r * 0.615 + g * -0.515 + b * -0.100;

        let activePal = isWound ? canvas.__pal_gb : canvas.__pal_main;
        let bestDist = Infinity;
        let bestRGB = activePal[0].rgb;

        for (let i = 0; i < activePal.length; i++) {
            let pYUV = activePal[i].yuv;
            let dY = y_px - pYUV[0];
            let dU = u_px - pYUV[1];
            let dV = v_px - pYUV[2];
            let dist = dY * dY + dU * dU + dV * dV;
            
            if (dist < bestDist) {
                bestDist = dist;
                bestRGB = activePal[i].rgb;
            }
        }

        data[idx++] = bestRGB[0] * 255;
        data[idx++] = bestRGB[1] * 255;
        data[idx++] = bestRGB[2] * 255;
        data[idx++] = 255;
    }
}

octx.putImageData(imgData, 0, 0);

ctx.fillStyle = '#050505';
ctx.fillRect(0, 0, grid.width, grid.height);

ctx.imageSmoothingEnabled = false;
ctx.drawImage(oc, 0, 0, grid.width, grid.height);