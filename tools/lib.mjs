import { chromium } from 'playwright';
export async function open(opts={}) {
  const browser = await chromium.launch({ args:['--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ viewport: opts.viewport||{width:1440,height:900}, deviceScaleFactor: opts.dsf||2,
    isMobile: !!opts.mobile, hasTouch: !!opts.mobile,
    userAgent: opts.mobile ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', locale:'de-DE' });
  await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>undefined})});
  const page = await ctx.newPage();
  return { browser, ctx, page };
}
export async function go(page, url) {
  await page.goto(url, { waitUntil:'domcontentloaded', timeout:60000 });
  for (let i=0;i<20;i++){ const t=await page.title(); if(!/Verifying|moment/i.test(t)) break; await page.waitForTimeout(1500); }
  await page.waitForTimeout(2500);
  // kill consent banner
  for (const sel of ['button:has-text("Ablehnen")','button:has-text("Deny")']) {
    try { const b = page.locator(sel).first(); if (await b.isVisible({timeout:1500})) { await b.click(); break; } } catch {}
  }
  await page.evaluate(()=>{ document.querySelectorAll('#usercentrics-root, #usercentrics-cmp-ui, aside#usercentrics-cmp-ui').forEach(e=>e.remove()); });
  await page.waitForTimeout(800);
}
