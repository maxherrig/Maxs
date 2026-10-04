import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:2600,height:1000}});
await p.goto('http://127.0.0.1:8123/out/contact/sheet.html'); await p.waitForTimeout(800);
await p.screenshot({path:'/home/user/Maxs/out/contact_sheet_9x16.png', fullPage:true}); await b.close();
