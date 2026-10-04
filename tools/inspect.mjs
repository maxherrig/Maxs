import { open, go } from './lib.mjs';
const { browser, page } = await open();
await go(page, 'https://oace.de/');
const info = await page.evaluate(() => {
  const cs = (el)=> el ? getComputedStyle(el) : null;
  const pick = (sel)=>{ const e=document.querySelector(sel); if(!e) return null; const s=getComputedStyle(e); return {sel, font:s.fontFamily, weight:s.fontWeight, size:s.fontSize, color:s.color, bg:s.backgroundColor, ls:s.letterSpacing, tt:s.textTransform}; };
  const rootVars = {}; const rs = getComputedStyle(document.documentElement);
  for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) { if (r.selectorText===':root') { for (const p of r.style) if (p.startsWith('--')) rootVars[p]=rs.getPropertyValue(p).trim(); } } } catch{} }
  const fonts = new Set(); for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) if (r.constructor.name==='CSSFontFaceRule') fonts.add(r.cssText.slice(0,300)); } catch{} }
  const logo = document.querySelector('header a[href="/"] svg, header .header__logo svg, header img[alt*="OACE" i], .header__logo img, header a.header__logo');
  return {
    body: pick('body'), h1: pick('h1'), h2: pick('h2'), button: pick('.button, button[type=submit]'), nav: pick('header nav a'),
    rootVars: Object.fromEntries(Object.entries(rootVars).filter(([k])=>/color|font|heading|text|background|accent|button/i.test(k)).slice(0,120)),
    fonts:[...fonts],
    logoHTML: logo ? logo.outerHTML.slice(0,3000) : null,
    headerHTML: document.querySelector('header')?.innerHTML.slice(0,1500),
    texts: [...document.querySelectorAll('h1,h2,h3,.heading,p')].map(e=>e.innerText.trim()).filter(Boolean).slice(0,80),
    links: [...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>/collections|products|pages/.test(h)).slice(0,80),
    imgs: [...document.querySelectorAll('img')].map(i=>i.currentSrc||i.src).slice(0,40),
  };
});
console.log(JSON.stringify(info,null,1));
await page.screenshot({path:'/home/user/Maxs/assets/_home_clean.png'});
await browser.close();
