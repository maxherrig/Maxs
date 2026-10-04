import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1200,height:500}});
await p.goto('file:///tmp/claude-0/cmp.html');
await p.waitForTimeout(500); await p.screenshot({path:'/tmp/claude-0/logocmp.png'}); await b.close();
