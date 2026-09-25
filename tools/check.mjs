// Headless checks: console errors + screenshots at chosen moments.
//   NODE_PATH=$(npm root -g) node tools/check.mjs [desktop|phone|calm] [t1,t2,...]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'tools/out'); mkdirSync(out, { recursive: true });
const mode = process.argv[2] || 'desktop';
const times = (process.argv[3] || '10,31,45,112,150,166,188,216,232,250,292,323,350,392,418').split(',').map(Number);
const vp = mode === 'phone' ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1440, height: 900 };

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
for (const t of times) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor || 1, reducedMotion: mode === 'calm' ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`t=${t}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`t=${t}: ${e.message}`));
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href + `?at=${Math.max(0, t - 2.5)}`);
  if (t === times[0]) await page.screenshot({ path: path.join(out, `${mode}-start.png`) });
  await page.click('#go');
  await page.waitForTimeout(2800);
  if (t >= 404) { // tap a few beads in the coda
    for (const x of [0.2, 0.5, 0.8]) await page.mouse.click(vp.width * x, vp.height * 0.5);
    await page.waitForTimeout(700);
  }
  const at = await page.evaluate(() => window.__PT.T().toFixed(1));
  await page.screenshot({ path: path.join(out, `${mode}-${String(t).padStart(3, '0')}.png`) });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow) errors.push(`t=${t}: horizontal overflow`);
  console.log(`shot t=${at}`);
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no console errors');
process.exit(errors.length ? 1 : 0);
