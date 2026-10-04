// Render the composition to video: node render.mjs W H out.mp4 [fps=30] [sub=4] [workers=3] [t0=0] [t1=20]
// Each output frame averages `sub` sub-frames across a 180° shutter (real motion blur).
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
const [W, H, out, fpsA, subA, wkA, t0A, t1A] = process.argv.slice(2);
const fps = +(fpsA || 30), sub = +(subA || 4), workers = +(wkA || 3);
const T0 = +(t0A || 0), T1 = +(t1A || 20);
const N = Math.round((T1 - T0) * fps);
const tmp = out + '.parts'; fs.mkdirSync(tmp, { recursive: true });
const browser = await chromium.launch();
const chunk = Math.ceil(N / workers);
const t0 = Date.now();
async function work(k) {
  const a = k * chunk, b = Math.min(N, a + chunk);
  if (a >= b) return null;
  const page = await browser.newPage({ viewport: { width: +W, height: +H } });
  page.on('pageerror', e => console.error('pageerror', e.message));
  await page.goto(`http://127.0.0.1:8123/video/index.html?w=${W}&h=${H}`);
  await page.evaluate(() => window.ready);
  const file = `${tmp}/p${k}.mp4`;
  const vf = sub > 1
    ? `tmix=frames=${sub},select='eq(mod(n\\,${sub})\\,${sub - 1})',setpts=N/(${fps}*TB),format=yuv420p`
    : 'format=yuv420p';
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps * sub), '-c:v', 'mjpeg', '-i', '-',
    '-vf', vf, '-r', String(fps), '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = a; f < b; f++) {
    for (let s = 0; s < sub; s++) {
      const t = T0 + (f + (sub > 1 ? (s / sub - 0.5) * 0.5 : 0)) / fps;
      await page.evaluate(t => window.renderFrame(t), Math.max(0, t));
      const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    if (k === 0 && f % 30 === 0) console.log(`w0 frame ${f}/${b} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await page.close();
  return file;
}
const files = (await Promise.all([...Array(workers).keys()].map(work))).filter(Boolean);
await browser.close();
fs.writeFileSync(`${tmp}/list.txt`, files.map(f => `file '${f}'`).join('\n'));
await new Promise(r => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${tmp}/list.txt`, '-c', 'copy', out], { stdio: 'inherit' }).on('close', r));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`done ${out} ${N} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
