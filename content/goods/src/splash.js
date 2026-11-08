const K=require('./kit.js');const f=n=>n.toFixed(1);
// union-outline trick: draw shapes with thick ink stroke first, then the fills on top
function splash2(cx,cy,W,H,c,seed=1,part="back",{ink="#0e2236",water="#ffffff",tint="#a9d8f5",ow=7}={}){
  const R=K.rng(seed); const shapes=[], inner=[], drops=[], foamB=[], foamF=[];
  // foam ring at the water line (perspective ellipse)
  for(let i=0;i<16;i++){const a=Math.PI*2*i/16, x=cx+Math.cos(a)*W*.42, y=cy+Math.sin(a)*W*.07, r=W*(.05+R()*.04);
    (Math.sin(a)>0.15?foamF:foamB).push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r*1.3)}" ry="${f(r*.75)}"/>`);}
  foamB.push(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(W*.42)}" ry="${f(W*.075)}"/>`);
  // water tongues: rise from the ring, lean outward, tip ends in a droplet
  const n=9;
  for(let i=0;i<n;i++){const u=(i+.5)/n-.5, x0=cx+u*W*.82, wb=W*(.07+R()*.04), h=H*(.55+.45*Math.cos(u*Math.PI))*(.75+R()*.35);
    const lean=u*W*.55+(R()-.5)*W*.06, tx=x0+lean, ty=cy-h;
    const d=`M${f(x0-wb/2)} ${f(cy)} C${f(x0-wb/2)} ${f(cy-h*.45)} ${f(tx-wb*.18+lean*.15)} ${f(ty+h*.22)} ${f(tx)} ${f(ty)} C${f(tx+wb*.18+lean*.15)} ${f(ty+h*.22)} ${f(x0+wb/2)} ${f(cy-h*.45)} ${f(x0+wb/2)} ${f(cy)} Z`;
    shapes.push(`<path d="${d}"/>`);
    const d2=`M${f(x0-wb*.12)} ${f(cy)} C${f(x0-wb*.12)} ${f(cy-h*.4)} ${f(tx-wb*.05+lean*.1)} ${f(ty+h*.35)} ${f(tx+lean*.05)} ${f(ty+h*.3)} C${f(x0+wb*.15)} ${f(cy-h*.4)} ${f(x0+wb*.12)} ${f(cy-h*.2)} ${f(x0+wb*.12)} ${f(cy)} Z`;
    inner.push(`<path d="${d2}"/>`);
    const dr=wb*(.22+R()*.12), dx=tx+lean*.12, dy=ty-h*.1-dr*2;
    drops.push([dx,dy,dr,Math.atan2(lean,h)*180/Math.PI]);}
  // free spray
  for(let i=0;i<14;i++){const a=(-80+160*R())*Math.PI/180, r=H*(.7+R()*.9), s=W*(.008+R()*.022);
    drops.push([cx+Math.sin(a)*r*1.1, cy-Math.cos(a)*r*.9, s, a*180/Math.PI]);}
  const drop=([x,y,s,deg])=>`<path transform="translate(${f(x)} ${f(y)}) rotate(${f(deg)})" d="M0 ${f(-s*2.4)} C${f(s)} ${f(-s)} ${f(s)} ${f(s)} 0 ${f(s)} C${f(-s)} ${f(s)} ${f(-s)} ${f(-s)} 0 ${f(-s*2.4)}Z"/>`;
  const all=shapes.join(""), fb=foamB.join(""), ff=foamF.join(""), dd=drops.map(drop).join("");
  const O=x=>`<g stroke="${ink}" stroke-width="${ow*2}" stroke-linejoin="round" fill="${ink}">${x}</g>`;
  if(part==="front") return O(ff)+`<g fill="${water}">${ff}</g>`;
  return O(fb+all+dd)+`<g fill="${water}">${all}${dd}</g><g fill="${tint}">${inner.join("")}</g><g fill="${water}">${fb}</g>`;
}
module.exports={splash2};
