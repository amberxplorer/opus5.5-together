// Draw chosen moments without audio and tile them, to inspect transitions.
//   NODE_PATH=$(npm root -g) node tools/filmstrip.mjs name t1,t2,... [cols]
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'tools/out'), tmp = path.join(out, 'strip'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
const [name, list, cols = '6'] = process.argv.slice(2);
const times = list.split(',').map(Number);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 960, height: 600 } });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(pathToFileURL(path.join(root, 'index.html')).href);
for (const [i, t] of times.entries()) {
  await p.evaluate((x) => window.__PT.frameAt(x), t);
  await p.waitForTimeout(120);
  await p.screenshot({ path: path.join(tmp, `${String(i).padStart(3, '0')}.png`) });
}
await b.close();
const c = +cols, rows = Math.ceil(times.length / c);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-pattern_type', 'glob', '-i', path.join(tmp, '*.png'), '-vf', `scale=480:300,drawtext=text='%{n}':x=6:y=280:fontcolor=white:fontsize=14,tile=${c}x${rows}`, '-frames:v', '1', path.join(out, `strip-${name}.png`)]);
console.log(times.map((t, i) => `${i}=${t}`).join(' '));
