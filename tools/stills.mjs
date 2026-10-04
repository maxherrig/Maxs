import { chromium } from 'playwright';
const [w,h,out,...times] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:+w,height:+h} });
const errs=[]; p.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); }); p.on('pageerror', e=>errs.push(e.message));
await p.goto(`http://127.0.0.1:8123/video/index.html?w=${w}&h=${h}`);
await p.evaluate(()=>window.ready);
for (const t of times) { await p.evaluate(t=>window.renderFrame(t), +t); await p.screenshot({path:`${out}_${t}.png`}); }
if (errs.length) console.log(errs.slice(0,10).join('\n'));
await b.close();
