const quotes = [
  " THERE IS NO RELIGION HIGHER THAN TRUTH ",
  " NATURE GIVES UP HER INNERMOST SECRETS ",
  " THE UNIVERSE IS WORKED AND GUIDED FROM WITHIN OUTWARDS ",
  " SPACE IS THE ONE ETERNAL THING ",
  " MATTER IS SPIRIT AT ITS LOWEST POINT ",
  " TIME IS ONLY AN ILLUSION PRODUCED BY OUR STATES OF CONSCIOUSNESS ",
  " THE ASTRAL LIGHT IS THE UNIVERSAL SOUL, THE MATRIX OF THE UNIVERSE ",
  " EVERYTHING IS THE PRODUCT OF ONE UNIVERSAL CREATIVE EFFORT "
];
const chars = " .·:+=*#%@";
const out = [];
const aspect = (grid.cols / grid.rows) * 0.45;

for (let y = 0; y < grid.rows; y++) {
  const row = [];
  const v = (y / grid.rows) - 0.5;
  
  for (let x = 0; x < grid.cols; x++) {
    const u = ((x / grid.cols) - 0.5) * aspect;
    
    const flowU = u + Math.sin(v * 6.0 + time * 0.8) * 0.05;
    const flowV = v + Math.cos(u * 6.0 - time * 0.6) * 0.05;
    
    const r = Math.sqrt(flowU * flowU + flowV * flowV);
    const a = Math.atan2(flowV, flowU);
    
    const spiral = Math.sin(r * 40 - time * 5 + a * 8);
    const moire = Math.sin(u * 50 + time) * Math.cos(v * 50 - time);
    
    let val = (spiral + moire + 2) / 4;
    
    let charIdx = Math.floor(val * chars.length);
    charIdx = Math.max(0, Math.min(chars.length - 1, charIdx));
    let char = chars[charIdx];
    
    const hue = 220 + Math.sin(r * 10 - time + a) * 60; 
    const sat = 70 + val * 30;
    const lig = 30 + val * 50;
    let color = `hsl(${hue}, ${sat}%, ${lig}%)`;
    
    if (r < 0.08 + Math.sin(time*10)*0.01) {
        const anuStr = "ANU_KERNEL";
        char = anuStr[Math.floor(Math.abs(x + y - time*10)) % anuStr.length];
        color = `hsl(180, 100%, ${70 + Math.sin(time*20)*30}%)`;
    } else {
        const textWave = Math.sin(x * 0.05 + time * 1.2) * 2.5;
        const targetY = y + textWave;
        const lineIdx = Math.floor(targetY / 8);
        
        if (Math.abs((targetY % 8) - 4) < 0.6) {
            const q = quotes[Math.abs(lineIdx) % quotes.length];
            const strIdx = x - Math.floor(time * 12) + lineIdx * 15;
            const c = q[((strIdx % q.length) + q.length) % q.length];
            
            if (c !== ' ') {
                char = c;
                color = `hsl(45, 100%, ${60 + Math.sin(x*0.1 - time*3)*20}%)`;
            }
        }
    }
    
    row.push({ char, color });
  }
  out.push(row);
}
return out;