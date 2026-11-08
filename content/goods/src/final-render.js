const fs=require('fs');const {chromium}=require('playwright');
const css=["BebasNeue","AlfaSlabOne"].map(f=>`@font-face{font-family:'${f}';src:url('${f}.ttf')}`).join("");
const items=[["back-light",4],["back-dark",4],["chest-light",6],["chest-dark",6]];
(async()=>{const b=await chromium.launch();
for(const [k,sc] of items){const s=fs.readFileSync(`fonts/alfa-${k}.svg`,'utf8');const m=s.match(/width="(\d+)" height="(\d+)"/);
 fs.writeFileSync(`fonts/r.html`,`<html><head><style>${css}</style></head><body style="margin:0;background:transparent">${s}</body></html>`);
 const p=await b.newPage({viewport:{width:+m[1],height:+m[2]},deviceScaleFactor:sc});await p.goto('file://'+process.cwd()+'/fonts/r.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
 await p.screenshot({path:`final/print/${k}.png`,omitBackground:true});
 await p.close();
 const q=await b.newPage({viewport:{width:+m[1],height:+m[2]}});await q.goto('file://'+process.cwd()+'/fonts/r.html');await q.evaluate(()=>document.fonts.ready);await q.waitForTimeout(300);await q.screenshot({path:`final/${k}-sm.png`,omitBackground:true});await q.close();}
await b.close();})();
