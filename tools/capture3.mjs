import { open, go } from './lib.mjs';
import fs from 'fs';
const A = '/home/user/Maxs/assets/'; fs.mkdirSync(A+'colorways',{recursive:true});
const meta = JSON.parse(fs.readFileSync(A+'capture_meta.json'));
const { browser, page } = await open({ viewport:{width:390,height:844}, dsf:3, mobile:true });
await go(page, 'https://oace.de/products/scrunch-pro-leggings');
const names = await page.evaluate(()=>[...document.querySelectorAll('fieldset')].find(f=>f.innerText.startsWith('Farbe')).querySelectorAll('label').length);
const labels = await page.evaluate(()=>[...[...document.querySelectorAll('fieldset')].find(f=>f.innerText.startsWith('Farbe')).querySelectorAll('label')].map(l=>l.innerText.trim()||l.title));
console.log(names, labels);
meta.colorways = [];
for (let i=0;i<labels.length;i++) {
  const loc = page.locator('fieldset').filter({hasText:'Farbe'}).first().locator('label').nth(i);
  await loc.click(); await page.waitForTimeout(1800);
  await page.evaluate(()=>window.scrollTo(0,0)); await page.waitForTimeout(500);
  const f = `colorways/c${String(i).padStart(2,'0')}.png`;
  await page.screenshot({path:A+f, fullPage:true, clip:{x:0,y:62,width:390,height:1240}});
  meta.colorways.push({i, name:labels[i], file:f, clipY:62});
}
// review widget
const rv = page.locator('text=Basierend auf').first();
await rv.scrollIntoViewIfNeeded(); await page.waitForTimeout(1500);
const cont = page.locator('.jdgm-rev-widg__summary, [class*="summary"]').filter({hasText:'Basierend auf'}).first();
let el = (await cont.count()) ? cont : rv.locator('xpath=ancestor::div[3]');
await el.screenshot({path:A+'m_review_summary.png'});
const vb = await el.boundingBox(); console.log('review box', vb);
await page.evaluate(()=>window.scrollBy(0,-120)); await page.waitForTimeout(500);
await page.screenshot({path:A+'m_reviews_view.png'});
await page.evaluate(()=>window.scrollBy(0,600)); await page.waitForTimeout(800);
await page.screenshot({path:A+'m_reviews_view2.png'});
fs.writeFileSync(A+'capture_meta.json', JSON.stringify(meta,null,1));
await browser.close();
