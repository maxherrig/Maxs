import { open, go } from './lib.mjs';
const { browser, page } = await open({ viewport:{width:390,height:844}, dsf:3, mobile:true });
for (const p of ['scrunch-pro-leggings','core-contour-leggings','softline-nylon-leggings','aura-nylon-flared-leggings']) {
  await go(page, 'https://oace.de/products/'+p);
  const t = await page.evaluate(()=>{ const m=document.querySelector('main').innerText; return [document.querySelector('h1')?.innerText, (m.match(/\(\d[\d.]* Bewertungen\)/)||[])[0], (m.match(/[\d.]+\nBasierend auf [\d.]+ Bewertungen/)||[])[0], (m.match(/\d+ ?% .{0,80}/g)||[]).slice(0,5)]; });
  console.log(p, JSON.stringify(t));
  if (p==='scrunch-pro-leggings') { await page.screenshot({path:'/home/user/Maxs/assets/_prod_scrunch_m.png'}); console.log((await page.evaluate(()=>document.querySelector('main').innerText)).slice(0,1500)); }
}
for (const u of ['https://oace.de/pages/reviews','https://oace.de/pages/bewertungen','https://oace.de/pages/about-us','https://oace.de/pages/about']) {
  try { await go(page,u); const m = await page.evaluate(()=>document.querySelector('main')?.innerText.slice(0,800)); console.log('==',u,'\n',m); } catch(e){ console.log(u,'ERR'); }
}
await browser.close();
