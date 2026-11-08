const fs=require('fs');const {chromium}=require('playwright');
// long-sleeve silhouette (front); sleeves hang down & out
const LS="M300 60 C340 90 460 90 500 60 L640 110 L700 200 L790 760 L720 780 L640 330 L620 300 L620 900 L180 900 L180 300 L160 330 L80 780 L10 760 L100 200 L160 110 Z";
const LSB="M300 60 C340 72 460 72 500 60 L640 110 L700 200 L790 760 L720 780 L640 330 L620 300 L620 900 L180 900 L180 300 L160 330 L80 780 L10 760 L100 200 L160 110 Z";
const cuff=(st)=>`<path d="M80 780 L10 760 L16 730 L86 750Z M720 780 L790 760 L784 730 L714 750Z" fill="${st}"/>`;
const css=["BebasNeue","AlfaSlabOne"].map(f=>`@font-face{font-family:'${f}';src:url('../fonts/${f}.ttf')}`).join("");
// sleeve text runs down the wearer's LEFT sleeve (viewer's right on the front, viewer's left on the back)
const sleeveF=(ink)=>`<g transform="translate(694 330) rotate(80)"><text font-family="AlfaSlabOne" font-size="34" fill="${ink}" letter-spacing="4">TSUREDOKI</text><text y="30" font-family="BebasNeue" font-size="20" fill="${ink}" letter-spacing="5">FISHING TIME · KANSAI</text></g>`;
const sleeveB=(ink)=>`<g transform="translate(106 330) rotate(100) scale(1 -1) "><g transform="scale(1 -1)"><text font-family="AlfaSlabOne" font-size="34" fill="${ink}" letter-spacing="4" transform="rotate(0)">TSUREDOKI</text></g></g>`;
const lab=(x,t)=>`<text x="${x+400}" y="955" text-anchor="middle" font-family="Noto Sans CJK JP" font-weight="700" font-size="26" fill="#555">${t}</text>`;
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1600,height:990}});
for(const [k,c,st,ink] of [["light","#f3efe6","#d9d2c4","#0e2236"],["dark","#14283c","#0b1826","#f3efe6"]]){
 const front=`<g><path d="${LS}" fill="${c}" stroke="rgba(0,0,0,.12)" stroke-width="3"/>${cuff(st)}<path d="M300 60 C340 110 460 110 500 60" stroke="${st}" stroke-width="10" fill="none"/>
  <image href="chest-${k}-sm.png" x="240" y="185" width="120" height="68"/>${sleeveF(ink)}</g>`;
 const back=`<g transform="translate(800 0)"><path d="${LSB}" fill="${c}" stroke="rgba(0,0,0,.12)" stroke-width="3"/>${cuff(st)}<path d="M300 60 C340 74 460 74 500 60" stroke="${st}" stroke-width="10" fill="none"/>
  <image href="back-${k}-sm.png" x="235" y="150" width="330" height="343"/></g>`;
 fs.writeFileSync(`final/longt-${k}.html`,`<html><head><style>${css}</style></head><body style="margin:0;background:#e7e3db"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 990" width="1600" height="990">${front}${back}${lab(0,"おもて（右胸＋左袖プリント）")}${lab(800,"うしろ（バックプリント）")}</svg></body></html>`);
 await p.goto('file://'+process.cwd()+`/final/longt-${k}.html`);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);await p.screenshot({path:`final/longt-${k}.png`});}
await b.close();})();
