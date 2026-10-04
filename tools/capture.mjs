import { open, go } from './lib.mjs';
import fs from 'fs';
const A = '/home/user/Maxs/assets/';
const meta = {};
const box = async (page, sel, nth=0) => { const l = page.locator(sel).nth(nth); const b = await l.boundingBox(); const s = await page.evaluate(()=>window.scrollY); return b && {x:b.x, y:b.y+s, w:b.width, h:b.height}; };
const { browser, page } = await open({ viewport:{width:390,height:844}, dsf:3, mobile:true });

// HOME
await go(page, 'https://oace.de/');
await page.screenshot({path:A+'m_home.png'});
await page.screenshot({path:A+'m_home_full.png', fullPage:true});
meta.home = { header: await box(page,'store-header'), announce: await box(page,'.announcement-bar, .shopify-section--announcement-bar') };
// menu drawer
try { await page.locator('button[aria-controls="header-sidebar-menu"]').first().click(); await page.waitForTimeout(1200); await page.screenshot({path:A+'m_menu.png'}); } catch(e){ console.log('menu fail', e.message); }

// COLLECTION
await go(page, 'https://oace.de/collections/bestseller-women');
await page.screenshot({path:A+'m_collection.png'});
await page.screenshot({path:A+'m_collection_full.png', fullPage:true, clip:{x:0,y:0,width:390,height:2600}});
meta.collectionCards = await page.evaluate(()=>[...document.querySelectorAll('product-card, .product-card')].slice(0,10).map(e=>{const r=e.getBoundingClientRect(); return {x:r.x,y:r.y+scrollY,w:r.width,h:r.height, t:e.innerText.slice(0,60)}}));

// PRODUCT
const P = 'https://oace.de/products/scrunch-pro-leggings';
await go(page, P);
await page.evaluate(()=>window.scrollTo(0,0));
await page.screenshot({path:A+'m_product.png'});
const clip = {x:0,y:0,width:390,height:1700};
await page.screenshot({path:A+'m_product_tall.png', fullPage:true, clip});
const sel = {
  header:'store-header', title:'h1', price:'.product-info__price, price-list', rating:'.product-info__rating, .jdgm-preview-badge, [class*="rating"]',
  gallery:'.product-gallery, product-gallery', swatches:'.product-info__variant-picker fieldset, variant-picker fieldset',
  atc:'button:has-text("In den Warenkorb")', guide:'a:has-text("Zum Leggings Guide")',
};
meta.product = {};
for (const [k,s] of Object.entries(sel)) { try { meta.product[k] = await box(page, s); } catch(e){ meta.product[k]=null; } }
meta.product.fieldsets = await page.evaluate(()=>[...document.querySelectorAll('fieldset')].map(f=>{const r=f.getBoundingClientRect(); return {x:r.x,y:r.y+scrollY,w:r.width,h:r.height,t:f.innerText.slice(0,40)}}));
meta.product.colorSwatches = await page.evaluate(()=>[...document.querySelectorAll('label.color-swatch, label[class*="swatch"]')].filter(l=>l.getBoundingClientRect().width>0).slice(0,40).map(l=>{const r=l.getBoundingClientRect(); return {x:r.x,y:r.y+scrollY,w:r.width,h:r.height,t:l.innerText.trim()||l.getAttribute('title')||l.getAttribute('for')}}));
console.log(JSON.stringify(meta.product,null,0).slice(0,3000));
fs.writeFileSync(A+'capture_meta.json', JSON.stringify(meta,null,1));
await page.screenshot({path:A+'m_product_full.png', fullPage:true});
await browser.close();
