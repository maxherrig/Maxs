import { chromium } from 'playwright';
const browser = await chromium.launch({ args:['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2,
  userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', locale:'de-DE' });
await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>undefined})});
const page = await ctx.newPage();
await page.goto('https://oace.de/', { waitUntil:'domcontentloaded', timeout:60000 });
for (let i=0;i<20;i++){ await page.waitForTimeout(2000); const t=await page.title(); console.log(i,t); if(!/Verifying|moment/i.test(t)) break; }
await page.waitForTimeout(3000);
console.log(await page.title(), page.url());
await page.screenshot({path:'/home/user/Maxs/assets/_probe.png'});
await browser.close();
