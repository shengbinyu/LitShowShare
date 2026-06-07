// Multi-color vector trace: extract exact dominant colors from public/books.jpeg
// via k-means clustering on raw pixels, then run Potrace once per color mask so
// each output layer uses a color that actually appears in the source image.
//
// Run with:  node scripts/trace-favicon.mjs
//
// Pipeline:
//   1) Decode JPEG with `sharp` and downsample to a manageable size.
//   2) K-means cluster RGB pixels into N palette colors (background + book colors).
//   3) For each non-background color, build a binary mask PNG and trace it with potrace.
//   4) Combine all traced <path> layers into one final SVG, ordered from background to foreground.

import sharp from 'sharp';
import { trace } from 'potrace';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT = resolve(__dirname, '../public/books.jpeg');
const OUTPUT = resolve(__dirname, '../public/favicon.svg');

// Tunables -------------------------------------------------------------------
const PALETTE_SIZE = 4;     // total colors to extract (incl. white background)
const MAX_DIM = 512;        // downscale long edge for speed (vector quality unaffected)
const KMEANS_ITERS = 20;    // k-means iterations
// ----------------------------------------------------------------------------

function rgbDist2(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function rgbToHex([r, g, b]) {
  const h = (n) => Math.round(n).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function isNearWhite([r, g, b]) {
  return r > 240 && g > 240 && b > 240;
}

async function loadPixels() {
  const img = sharp(INPUT).removeAlpha().resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside' });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

function kmeans(pixels, k, iters) {
  // pixels: flat Uint8 RGB array
  const n = pixels.length / 3;
  // Init centroids by evenly spaced samples
  const centroids = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor((i + 0.5) * n / k) * 3;
    centroids.push([pixels[idx], pixels[idx + 1], pixels[idx + 2]]);
  }
  const labels = new Int32Array(n);

  for (let iter = 0; iter < iters; iter++) {
    // Assign step
    for (let i = 0; i < n; i++) {
      const p = [pixels[i * 3], pixels[i * 3 + 1], pixels[i * 3 + 2]];
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = rgbDist2(p, centroids[c]);
        if (d < bestD) { bestD = d; best = c; }
      }
      labels[i] = best;
    }
    // Update step
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const lab = labels[i];
      sums[lab][0] += pixels[i * 3];
      sums[lab][1] += pixels[i * 3 + 1];
      sums[lab][2] += pixels[i * 3 + 2];
      sums[lab][3] += 1;
    }
    for (let c = 0; c < k; c++) {
      if (sums[c][3] > 0) {
        centroids[c] = [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]];
      }
    }
  }

  const counts = new Array(k).fill(0);
  for (let i = 0; i < n; i++) counts[labels[i]]++;
  return { centroids, labels, counts };
}

async function buildMaskPng(labels, targetIdx, width, height) {
  // Make a 1-bit mask: target color -> black (0), others -> white (255).
  const buf = Buffer.alloc(width * height);
  for (let i = 0; i < labels.length; i++) buf[i] = labels[i] === targetIdx ? 0 : 255;
  return sharp(buf, { raw: { width, height, channels: 1 } }).png().toBuffer();
}

function tracePromise(pngBuffer, color) {
  return new Promise((resolveP, rejectP) => {
    trace(
      pngBuffer,
      {
        color,
        background: 'transparent',
        threshold: 128,
        turdSize: 4,
        optTolerance: 0.4,
      },
      (err, svg) => (err ? rejectP(err) : resolveP(svg)),
    );
  });
}

function extractPathBody(svg) {
  // Pull out everything between the outer <svg ...> ... </svg> tags so we can
  // merge multiple traced layers into a single SVG document.
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  // Drop any opaque background rect injected by potrace.
  return inner.replace(/<rect[^/]*\/>\s*/g, '');
}

async function main() {
  const { data, width, height } = await loadPixels();
  console.log(`[trace] Loaded ${width}x${height}, running k-means (k=${PALETTE_SIZE})`);

  // Flatten to RGB-only array (already 3 channels because removeAlpha()).
  const { centroids, labels, counts } = kmeans(data, PALETTE_SIZE, KMEANS_ITERS);

  // Report palette
  centroids.forEach((c, i) => {
    console.log(`  color #${i}: ${rgbToHex(c)}  pixels=${counts[i]}`);
  });

  // Sort layers so darker / less common colors render on top of bigger / lighter ones.
  // Brightness = R+G+B; we draw from brightest to darkest.
  const order = centroids
    .map((c, i) => ({ i, brightness: c[0] + c[1] + c[2] }))
    .sort((a, b) => b.brightness - a.brightness);

  const layers = [];
  for (const { i } of order) {
    const color = centroids[i];
    if (isNearWhite(color)) {
      // Skip white background – the SVG already has a white <rect> below.
      continue;
    }
    const hex = rgbToHex(color);
    console.log(`[trace] Tracing layer ${hex} ...`);
    const mask = await buildMaskPng(labels, i, width, height);
    const layerSvg = await tracePromise(mask, hex);
    layers.push(extractPathBody(layerSvg));
  }

  const finalSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">\n` +
    `  <rect width="100%" height="100%" fill="#ffffff"/>\n` +
    layers.map((l) => '  ' + l.trim()).join('\n') +
    `\n</svg>\n`;

  writeFileSync(OUTPUT, finalSvg, 'utf8');
  console.log(`[trace] Wrote ${OUTPUT} (${finalSvg.length} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
