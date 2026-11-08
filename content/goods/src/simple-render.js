const S=require('./simple.js');const D=require('./designs.js');const fs=require('fs');const {chromium}=require('playwright');
const dark={...D.COL,ink:"#f5eddf",paper:"#0e2236",glow:"#173552",sun:"#f2b23c"};
const TEEB="M300 60 C340 72 460 72 500 60 L640 110 L760 260 L660 330 L620 290 L620 900 L180 900 L180 290 L140 330 L40 260 L160 110 Z";
(async()=>{const b=await chromium.launch();const p=await b.newPage();
for(const k of ["S1","S2"]) for(const [v,col] of [["light",D.COL],["dark",dark]]){const s=S[k](col);fs.writeFileSync(`buri/${k}-${v}.svg`,s);
 await p.setViewportSize({width:1000,height:1040});await p.setContent(`<body style="margin:0">${s}</body>`);await p.screenshot({path:`buri/${k}-${v}.png`,omitBackground:true});}
let h='<html><body style="margin:0;background:#e7e3db"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1960" width="1600" height="1960">';
[["S1",0],["S2",980]].forEach(([k,y])=>{[["light","#f3efe6",0],["dark","#14283c",800]].forEach(([v,c,x])=>{h+=`<g transform="translate(${x} ${y})"><path d="${TEEB}" fill="${c}" stroke="rgba(0,0,0,.12)" stroke-width="3"/><image href="${k}-${v}.png" x="235" y="150" width="330" height="343"/></g>`});
 h+=`<text x="800" y="${y+950}" text-anchor="middle" font-family="Noto Sans CJK JP" font-weight="700" font-size="30" fill="#555">${k==="S1"?"シンプル案1：景色の枠は残して、部品を減らす":"シンプル案2：枠をなくして、朝日・水平線・竿・ブリだけ"}</text>`;});
fs.writeFileSync('buri/simple.html',h+'</svg></body></html>');
await p.setViewportSize({width:1600,height:1960});await p.goto('file://'+process.cwd()+'/buri/simple.html');await p.screenshot({path:'buri/simple.png'});await b.close();})();
