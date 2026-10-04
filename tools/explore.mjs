import { open, go } from './lib.mjs';
const { browser, page } = await open({ viewport:{width:390,height:844}, dsf:3, mobile:true });
await go(page, 'https://oace.de/collections/bestseller-women');
await page.screenshot({path:'/home/user/Maxs/assets/_coll_m.png'});
const prods = await page.evaluate(()=>[...document.querySelectorAll('a[href*="/products/"]')].map(a=>a.getAttribute('href')).filter((v,i,a)=>a.indexOf(v)===i).slice(0,12));
console.log(prods);
await go(page, 'https://oace.de'+prods[0].split('?')[0]);
await page.screenshot({path:'/home/user/Maxs/assets/_prod_m.png'});
const info = await page.evaluate(()=>({
  title: document.querySelector('h1')?.innerText,
  text: document.querySelector('main')?.innerText.slice(0,3000),
  buttons: [...document.querySelectorAll('button, input[type=radio] + label, label')].map(b=>(b.tagName+':'+(b.className||'')+':'+b.innerText.trim()).slice(0,120)).filter(s=>s.split(':')[2]).slice(0,60),
}));
console.log(JSON.stringify(info,null,1));
await browser.close();
