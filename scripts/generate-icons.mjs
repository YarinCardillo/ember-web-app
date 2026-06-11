/**
 * Generates the HF-1 app icons / favicons from the dot-wave mark.
 * Icon = rounded ink square with the wave in panel color (works on any bg).
 * Run: node scripts/generate-icons.mjs
 */

import sharp from "sharp";
import { writeFileSync } from "node:fs";

// Full mark for large sizes; a simplified 5-dot wave stays crisp at <=32px.
const ROWS_FULL = [0, 2, 3, 3, 2, 0, -2, -3, -3, -2, 0];
const ROWS_SIMPLE = [2, 3, 0, -3, -2];
const INK = "#191917";
const PANEL = "#f3f3f0";

function waveCircles(rows, pitch, color, offX, offY) {
  const r = pitch * 0.34;
  const y0 = (6 * pitch + 2 * r) / 2;
  let out = "";
  for (let i = 0; i < rows.length; i++) {
    const cx = offX + r + i * pitch;
    const cy = offY + y0 - rows[i] * pitch;
    out += `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="${color}"/>`;
  }
  return out;
}

function iconSvg(size, rows) {
  const n = rows.length;
  const radius = size * 0.22;
  const pitch = (size * 0.78) / (n - 1 + 0.68);
  const r = pitch * 0.34;
  const waveW = (n - 1) * pitch + 2 * r;
  const waveH = 6 * pitch + 2 * r;
  const offX = (size - waveW) / 2;
  const offY = (size - waveH) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${INK}"/>${waveCircles(rows, pitch, PANEL, offX, offY)}</svg>`;
}

const rowsFor = (size) => (size <= 32 ? ROWS_SIMPLE : ROWS_FULL);

const PNGS = {
  "icon-192.png": 192,
  "icon-512.png": 512,
  "apple-touch-icon.png": 180,
  "favicon-16.png": 16,
  "favicon-32.png": 32,
  "favicon-48.png": 48,
};

for (const [file, size] of Object.entries(PNGS)) {
  await sharp(Buffer.from(iconSvg(size, rowsFor(size)))).png().toFile(`public/${file}`);
  console.log("wrote public/" + file);
}

writeFileSync("public/favicon.svg", iconSvg(64, ROWS_FULL));
console.log("wrote public/favicon.svg");
