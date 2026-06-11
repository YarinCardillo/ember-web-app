/**
 * Generates the HF-1 app icons / favicons from the dot-wave mark.
 * Icon = rounded ink square with the wave in panel color (works on any bg).
 * Run: node scripts/generate-icons.mjs
 */

import sharp from "sharp";
import { writeFileSync } from "node:fs";

const ROWS = [0, 2, 3, 3, 2, 0, -2, -3, -3, -2, 0];
const INK = "#191917";
const PANEL = "#f3f3f0";
const N = ROWS.length;

function waveCircles(pitch, color, offX, offY) {
  const r = pitch * 0.34;
  const y0 = (6 * pitch + 2 * r) / 2;
  let out = "";
  for (let i = 0; i < N; i++) {
    const cx = offX + r + i * pitch;
    const cy = offY + y0 - ROWS[i] * pitch;
    out += `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="${color}"/>`;
  }
  return out;
}

function iconSvg(size) {
  const radius = size * 0.22;
  const pitch = (size * 0.78) / (N - 1 + 0.68);
  const r = pitch * 0.34;
  const waveW = (N - 1) * pitch + 2 * r;
  const waveH = 6 * pitch + 2 * r;
  const offX = (size - waveW) / 2;
  const offY = (size - waveH) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${INK}"/>${waveCircles(pitch, PANEL, offX, offY)}</svg>`;
}

const PNGS = {
  "icon-192.png": 192,
  "icon-512.png": 512,
  "apple-touch-icon.png": 180,
  "favicon-16.png": 16,
  "favicon-32.png": 32,
  "favicon-48.png": 48,
};

for (const [file, size] of Object.entries(PNGS)) {
  await sharp(Buffer.from(iconSvg(size))).png().toFile(`public/${file}`);
  console.log("wrote public/" + file);
}

writeFileSync("public/favicon.svg", iconSvg(64));
console.log("wrote public/favicon.svg");
