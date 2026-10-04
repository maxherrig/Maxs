import { open, go } from './lib.mjs';
import fs from 'fs';
const A = '/home/user/Maxs/assets/';
const meta = JSON.parse(fs.readFileSync(A+'capture_meta.json'));
const freeze = async (page)=>{ await page.addStyleTag({content:'.announcement-bar *, announcement-bar *{transition:none!important;animation:none!important}'}); await page.waitForTimeout(600); };
const boxOf = async (page, loc) => { const b = await loc.boundingBox(); const s = await page.evaluate(()=>scrollY); return b && {x:b.x,y:b.y+s,w:b.width,h:b.height}; };
const { browser, page } = await open({ viewport:{width:390,height:844}, dsf:3, mobile:true });
const P = 'https://oace.de/products/scrunch-pro-leggings';
await go(page, P); await freeze(page);
const clip = {x:0,y:0,width:390,height:1720};
const shot = async (name)=>{ await page.evaluate(()=>window.scrollTo(0,0)); await page.waitForTimeout(400); await page.screenshot({path:A+name, fullPage:true, clip}); };
await shot('m_pdp_s0_aura.png');
meta.actions = [];
for (const [i,color] of [[1,'raspberry'],[2,'jelly mint'],[3,'true black']]) {
  const loc = page.locator('label.color-swatch, label[class*="swatch"]').filter({hasText: color}).first();
  const b = await boxOf(page, loc);
  const urlBefore = page.url();
  await loc.click(); await page.waitForTimeout(2500);
  if (page.url()!==urlBefore) { await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(2000); await freeze(page); }
  await shot(`m_pdp_s${i}_${color.replace(' ','')}.png`);
  meta.actions.push({type:'color', color, box:b, url:page.url()});
  console.log('color', color, b, page.url());
}
// size S
const sizeLoc = page.locator('fieldset').filter({hasText:'Größe'}).locator('label').filter({hasText:/^S$/}).first();
const sb = await boxOf(page, sizeLoc); await sizeLoc.click(); await page.waitForTimeout(1200);
await shot('m_pdp_s4_sizeS.png'); meta.actions.push({type:'size', box:sb}); console.log('size', sb);
meta.pdpBoxes = {
  gallery: await boxOf(page, page.locator('.product-gallery, product-gallery').first()),
  info: await boxOf(page, page.locator('h1').first()),
  sizeFieldset: await boxOf(page, page.locator('fieldset').filter({hasText:'Größe'}).first()),
  colorFieldset: await boxOf(page, page.locator('fieldset').filter({hasText:'Farbe'}).first()),
  qty: await boxOf(page, page.locator('quantity-selector, .quantity-selector').first()),
};
// ATC: scroll so button visible, screenshot viewport before & after
const atc = page.locator('button:has-text("In den Warenkorb")').first();
await atc.scrollIntoViewIfNeeded(); await page.evaluate(()=>window.scrollBy(0,250)); await page.waitForTimeout(800);
const vb = await atc.boundingBox(); const sy = await page.evaluate(()=>scrollY);
await page.screenshot({path:A+'m_pdp_atc_before.png'});
meta.actions.push({type:'atc', viewportBox:vb, scrollY:sy});
await atc.click(); await page.waitForTimeout(3500);
await page.screenshot({path:A+'m_cart_drawer.png'});
meta.cartText = await page.evaluate(()=>document.querySelector('cart-drawer, .cart-drawer, [id*="cart-drawer"]')?.innerText.slice(0,800));
console.log('atc', vb, sy, meta.cartText);
// leggings guide
await go(page, 'https://oace.de/pages/leggings-guide'); await freeze(page);
await page.screenshot({path:A+'m_leggings_guide.png'});
meta.guideText = await page.evaluate(()=>document.querySelector('main')?.innerText.slice(0,600));
fs.writeFileSync(A+'capture_meta.json', JSON.stringify(meta,null,1));
await browser.close();

// DESKTOP
const d = await open({ viewport:{width:1440,height:900}, dsf:2 });
for (const [n,u] of [['d_home','https://oace.de/'],['d_collection','https://oace.de/collections/bestseller-women'],['d_product',P]]) {
  await go(d.page, u); await freeze(d.page); await d.page.screenshot({path:A+n+'.png'});
}
await d.browser.close();
