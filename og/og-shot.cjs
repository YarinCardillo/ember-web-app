// og-shot.js — renderizza un sorgente HTML 1200×630 in PNG nitido.
//
// Setup (una tantum):
//   npm i playwright sharp
//   npx playwright install chromium
//
// Uso:
//   node og-shot.js <sorgente.html> <output.png>
//   es. node og-shot.js hf1-og-braun-dark-v3-src.html og-image.png
//
// Pipeline: viewport 1200×630 @2x (2400×1260) → downscale Lanczos a 1200×630.
// Il @2x + downscale dà testo e bordi più nitidi di uno shot diretto a 1×.

const { chromium } = require('playwright');
const sharp = require('sharp');
const path = require('path');

const [, , srcArg, outArg] = process.argv;
if (!srcArg || !outArg) {
  console.error('uso: node og-shot.js <sorgente.html> <output.png>');
  process.exit(1);
}

(async () => {
  const src = 'file://' + path.resolve(srcArg);
  const tmp = outArg + '.2x.png';

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });

  await page.goto(src);
  // aspetta che i webfont siano caricati davvero (niente timeout a caso)
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300); // margine per il paint finale

  await page.screenshot({ path: tmp });
  await browser.close();

  await sharp(tmp)
    .resize(1200, 630, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(outArg);

  require('fs').unlinkSync(tmp);
  console.log('ok →', outArg, '(1200×630)');
})();
