const D=require('./designs.js');const fs=require('fs');const {chromium}=require('playwright');
const dark={...D.COL,ink:"#f5eddf",paper:"#0e2236",glow:"#173552",sun:"#f2b23c"};
(async()=>{const b=await chromium.launch();const p=await b.newPage();
for(const k of ["A","B","C"]){for(const [v,col,bg] of [["light",D.COL,"#f3efe6"],["dark",dark,"#14283c"]]){const s=D[k](col);const m=s.match(/width="(\d+)" height="(\d+)"/);
 fs.writeFileSync(`buri/${k}-${v}.svg`,s);await p.setViewportSize({width:+m[1],height:+m[2]});
 await p.setContent(`<body style="margin:0;background:${bg}">${s}</body>`);await p.screenshot({path:`buri/${k}-${v}-view.png`});
 await p.setContent(`<body style="margin:0">${s}</body>`);await p.screenshot({path:`buri/${k}-${v}.png`,omitBackground:true});}}
await b.close();})();
