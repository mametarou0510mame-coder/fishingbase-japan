const S=require('../buri/simple.js');const D=require('../buri/designs.js');const M=require('../chest/marks.js');const fs=require('fs');const {chromium}=require('playwright');
const dark={...D.COL,ink:"#f5eddf",paper:"#0e2236",glow:"#173552",sun:"#f2b23c"};
const css=["BebasNeue","AlfaSlabOne","KaushanScript","Anton"].map(f=>`@font-face{font-family:'${f}';src:url('${f}.ttf')}`).join("");
const SETS={
 alfa:{name:"Alfa Slab One（ヴィンテージ釣具店）",back:{fam:"AlfaSlabOne",fw:400,fs:150,sk:0,sy:1.1,ls:2,ffam:"BebasNeue",ffw:400,ffs:58,fsk:0,fls:12},chest:{fam:"AlfaSlabOne",fw:400,fs:66,sk:0,ls:2}},
 kaushan:{name:"Kaushan Script（釣り・サーフの筆記体）",back:{fam:"KaushanScript",fw:400,fs:205,sk:0,sy:1,ls:0,ffam:"BebasNeue",ffw:400,ffs:58,fsk:0,fls:12},chest:{fam:"KaushanScript",fw:400,fs:96,sk:0,ls:0}},
 anton:{name:"Anton（太く縦長のゴシック）",back:{fam:"Anton",fw:400,fs:210,sk:0,sy:1.15,ls:4,ffam:"BebasNeue",ffw:400,ffs:58,fsk:0,fls:12},chest:{fam:"Anton",fw:400,fs:96,sk:0,ls:3}}};
const TEE="M300 60 C340 90 460 90 500 60 L640 110 L760 260 L660 330 L620 290 L620 900 L180 900 L180 290 L140 330 L40 260 L160 110 Z";
const TEEB="M300 60 C340 72 460 72 500 60 L640 110 L760 260 L660 330 L620 290 L620 900 L180 900 L180 290 L140 330 L40 260 L160 110 Z";
const inner=s=>s.replace(/<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1600,height:2900}});
let h=`<html><head><style>${css}</style></head><body style="margin:0;background:#e7e3db"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 2900" width="1600" height="2900">`;
Object.entries(SETS).forEach(([k,o],r)=>{const y=r*960;
 const L={...o.back,stripe:"#f3efe6"};
 const backL=S.S2(D.COL,L), backD=S.S2(dark,o.back), chestL=M.m1("#0e2236","#f2602a","#f3efe6",o.chest), chestD=M.m1("#f3efe6","#f2602a","#14283c",o.chest);
 fs.writeFileSync(`fonts/${k}-back-light.svg`,backL);fs.writeFileSync(`fonts/${k}-back-dark.svg`,backD);fs.writeFileSync(`fonts/${k}-chest-light.svg`,chestL);fs.writeFileSync(`fonts/${k}-chest-dark.svg`,chestD);
 const front=(c,st,ch)=>`<path d="${TEE}" fill="${c}" stroke="rgba(0,0,0,.12)" stroke-width="3"/><path d="M300 60 C340 110 460 110 500 60" stroke="${st}" stroke-width="10" fill="none"/><g transform="translate(240 185) scale(${120/600})">${inner(ch)}</g>`;
 const back=(c,bk)=>`<path d="${TEEB}" fill="${c}" stroke="rgba(0,0,0,.12)" stroke-width="3"/><g transform="translate(235 150) scale(.33)">${inner(bk)}</g>`;
 h+=`<g transform="translate(0 ${y}) scale(.5)">${front("#f3efe6","#d9d2c4",chestL)}</g><g transform="translate(400 ${y}) scale(.5)">${back("#f3efe6",backL)}</g><g transform="translate(800 ${y}) scale(.5)">${front("#14283c","#0b1826",chestD)}</g><g transform="translate(1200 ${y}) scale(.5)">${back("#14283c",backD)}</g>`;
 h+=`<g transform="translate(0 ${y+470})"><rect x="40" y="0" width="1520" height="440" rx="20" fill="#fff"/><g transform="translate(120 20) scale(.4)">${inner(backL)}</g><g transform="translate(600 120) scale(.6)">${inner(chestL)}</g><text x="1540" y="400" text-anchor="end" font-family="Noto Sans CJK JP" font-weight="700" font-size="34" fill="#333">${r+1}. ${o.name}</text></g>`;});
fs.writeFileSync('fonts/apply.html',h+'</svg></body></html>');
await p.goto('file://'+process.cwd()+'/fonts/apply.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(600);await p.screenshot({path:'fonts/apply.png'});await b.close();})();
