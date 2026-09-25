// Offline render of the piece: levels per 10 s, WAV, spectrogram PNG.
//   NODE_PATH=$(npm root -g) node tools/render-audio.mjs [from] [to]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'tools/out'); mkdirSync(out, { recursive: true });
const from = +(process.argv[2] || 0), to = +(process.argv[3] || 440);
const browser = await chromium.launch();
const page = await browser.newPage({ acceptDownloads: true });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
const t0 = Date.now();
const res = await page.evaluate(([a, b]) => window.__PT.renderWav(a, b), [from, to]);
console.log(`rendered ${res.secs.toFixed(1)} s in ${((Date.now() - t0) / 1000).toFixed(1)} s · peak ${res.peak} · RMS ${res.rms} dB · NaN ${res.nan}`);
for (const [t, db, pk] of res.win) console.log(`  ${String(t).padStart(4)} s  ${String(db).padStart(6)} dB  peak ${pk}`);
const [dl] = await Promise.all([
  page.waitForEvent('download'),
  page.evaluate((u) => { const a = document.createElement('a'); a.href = u; a.download = 'x.wav'; document.body.appendChild(a); a.click(); }, res.url),
]);
const wav = path.join(out, `present-tense-${from}-${to}.wav`);
await dl.saveAs(wav);
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-lavfi', `showspectrumpic=s=1600x600:legend=1:scale=log:fscale=log:start=20:stop=9000`, path.join(out, `spectrogram-${from}-${to}.png`)]);
console.log('wrote', wav);
