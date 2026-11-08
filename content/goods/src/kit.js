// drawing kit: curved fish, tapered rod, splash, speed lines
const f=n=>n.toFixed(1);
function rng(seed){let s=seed>>>0;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}
// fish: head at origin pointing -x (local), body along +x, bent by b
function fish({L=300,H=60,b=40}={}){
  const P=t=>[L*t, b*4*t*(1-t)], T=t=>{const d=[L, b*4*(1-2*t)];const m=Math.hypot(...d);return [d[0]/m,d[1]/m]};
  const N=t=>{const [x,y]=T(t);return [y,-x]}; // "up" normal (negative y side when unbent)
  const w=t=>{const u=t/0.82; if(u>=1) return H*0.17; const s=Math.pow(Math.sin(Math.PI*Math.min(u,1)),0.72); const blunt=Math.min(1,0.35+u*6); return Math.max(H*s*blunt, u>0.55?H*0.17:0)*1;};
  const pt=(t,k)=>{const p=P(t),n=N(t);return [p[0]+n[0]*k,p[1]+n[1]*k]};
  const top=[],bot=[];const steps=40;
  for(let i=0;i<=steps;i++){const t=0.82*i/steps;top.push(pt(t,w(t)));bot.push(pt(t,-w(t)*0.9));}
  const tg=T(1), up=pt(1,H*1.05), lo=pt(1,-H*0.95);
  const upT=[up[0]+tg[0]*L*0.07, up[1]+tg[1]*L*0.07], loT=[lo[0]+tg[0]*L*0.09, lo[1]+tg[1]*L*0.09];
  const notch=P(0.93);
  let d="M"+top.map(p=>f(p[0])+" "+f(p[1])).join(" L");
  d+=` Q${f(pt(.9,H*.25)[0])} ${f(pt(.9,H*.25)[1])} ${f(upT[0])} ${f(upT[1])} L${f(notch[0])} ${f(notch[1])} L${f(loT[0])} ${f(loT[1])} Q${f(pt(.9,-H*.25)[0])} ${f(pt(.9,-H*.25)[1])} `;
  d+=bot.reverse().map(p=>f(p[0])+" "+f(p[1])).join(" L")+" Z";
  // fins
  const fin=(t0,t1,tt,h,side)=>{const a=pt(t0,side*w(t0)*0.85),c=pt(t1,side*w(t1)*0.85),tip=pt(tt,side*(w(tt)+h)),q=pt(t0+(tt-t0)*.35,side*(w(t0)+h*.95)),q2=pt(t1+(tt-t1)*.2,side*(w(t1)+h*.25));return ` M${f(a[0])} ${f(a[1])} Q${f(q[0])} ${f(q[1])} ${f(tip[0])} ${f(tip[1])} Q${f(q2[0])} ${f(q2[1])} ${f(c[0])} ${f(c[1])} Z`;};
  d+=fin(.24,.46,.54,H*.55,1)+fin(.56,.66,.72,H*.32,1)+fin(.57,.68,.74,H*.3,-1)+fin(.3,.38,.46,H*.28,-1);
  const eye=pt(.07,H*.22), g0=pt(.19,w(.19)*.85), g1=pt(.2,-w(.2)*.8), gm=pt(.15,0);
  const mouth0=pt(0.0,0), mouth1=pt(.06,-H*.12);
  const pec0=pt(.24,-H*.05), pec1=pt(.36,-H*.35), pec2=pt(.3,-H*.05);
  return {d, eye, er:H*.12, gill:`M${f(g0[0])} ${f(g0[1])} Q${f(gm[0])} ${f(gm[1])} ${f(g1[0])} ${f(g1[1])}`,
    jaw:`M${f(mouth0[0])} ${f(mouth0[1])} L${f(mouth1[0])} ${f(mouth1[1])}`,
    pec:`M${f(pec0[0])} ${f(pec0[1])} L${f(pec1[0])} ${f(pec1[1])} L${f(pec2[0])} ${f(pec2[1])} Z`,
    stripe: (()=>{let s=[];for(let i=0;i<=20;i++){const t=.2+.6*i/20;s.push(pt(t,w(t)*.05))}return "M"+s.map(p=>f(p[0])+" "+f(p[1])).join(" L")})()};
}
function fishG({x,y,rot=0,scale=1,flip=false,opt,fill,ink,outline=0,detail}){
  const F=fish(opt);
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${flip?-scale:scale} ${scale})">
  ${outline?`<path d="${F.d}" fill="${ink}" stroke="${ink}" stroke-width="${outline}" stroke-linejoin="round"/>`:""}
  <path d="${F.d}" fill="${fill}"/>
  <path d="${F.gill}" stroke="${detail}" stroke-width="${opt.H*.07}" fill="none" stroke-linecap="round"/>
  <path d="${F.jaw}" stroke="${detail}" stroke-width="${opt.H*.06}" stroke-linecap="round"/>
  <path d="${F.pec}" fill="${detail}" opacity=".9"/>
  <path d="${F.stripe}" stroke="${detail}" stroke-width="${opt.H*.04}" fill="none" stroke-linecap="round" opacity=".55"/>
  <circle cx="${f(F.eye[0])}" cy="${f(F.eye[1])}" r="${f(F.er)}" fill="${detail}"/>
  <circle cx="${f(F.eye[0])}" cy="${f(F.eye[1])}" r="${f(F.er*.45)}" fill="${fill}"/>
  </g>`;
}
// tapered bezier rod
function rod(p0,c,p1,w0,w1,fill,grip,gripLen=.2){
  const B=t=>[(1-t)**2*p0[0]+2*(1-t)*t*c[0]+t*t*p1[0],(1-t)**2*p0[1]+2*(1-t)*t*c[1]+t*t*p1[1]];
  const D=t=>[2*(1-t)*(c[0]-p0[0])+2*t*(p1[0]-c[0]),2*(1-t)*(c[1]-p0[1])+2*t*(p1[1]-c[1])];
  const side=(a,b,s)=>{const L=[],R=[];for(let i=0;i<=40;i++){const t=a+(b-a)*i/40;const p=B(t),d=D(t),m=Math.hypot(...d),n=[-d[1]/m,d[0]/m];const w=(w0+(w1-w0)*t)*s/2;L.push([p[0]+n[0]*w,p[1]+n[1]*w]);R.push([p[0]-n[0]*w,p[1]-n[1]*w]);}return "M"+L.concat(R.reverse()).map(p=>f(p[0])+" "+f(p[1])).join(" L")+"Z";};
  return {path:`<path d="${side(0,1,1)}" fill="${fill}"/><path d="${side(0,gripLen,1.35)}" fill="${grip}"/>`, tip:B(1), at:B};
}
// splash: drops flying out of (cx,cy) in angle range (deg, 0 = up)
function splash(cx,cy,{n=14,a0=-80,a1=80,r0=30,r1=150,s0=5,s1=16,seed=1,fill}){
  const R=rng(seed);let o="";
  for(let i=0;i<n;i++){const a=(a0+(a1-a0)*R())*Math.PI/180, r=r0+(r1-r0)*R(), s=s0+(s1-s0)*(1-r/(r1))*R()+s0*.5;
    const x=cx+Math.sin(a)*r, y=cy-Math.cos(a)*r, deg=a*180/Math.PI;
    o+=`<path transform="translate(${f(x)} ${f(y)}) rotate(${f(deg)})" d="M0 ${f(s*2.6)} C${f(s)} ${f(s)} ${f(s)} ${f(-s)} 0 ${f(-s)} C${f(-s)} ${f(-s)} ${f(-s)} ${f(s)} 0 ${f(s*2.6)}Z" fill="${fill}"/>`;}
  return o;
}
// crown of water spikes around (cx,cy), width W
function crown(cx,cy,W,H,fill,seed=3,k=7){const R=rng(seed);let d=`M${cx-W/2} ${cy}`;
  for(let i=0;i<k;i++){const x0=cx-W/2+W*i/k, x1=cx-W/2+W*(i+1)/k, xm=(x0+x1)/2+(R()-.5)*W/k*.6, h=H*(0.45+0.55*Math.sin(Math.PI*(i+.5)/k))*(0.7+R()*.5);
    const lean=(xm-cx)/W*H*.9; d+=` Q${f(x0+(xm-x0)*.6)} ${f(cy-h*.4)} ${f(xm+lean)} ${f(cy-h)} Q${f(xm+(x1-xm)*.4)} ${f(cy-h*.4)} ${f(x1)} ${f(cy)}`;}
  return `<path d="${d} Z" fill="${fill}"/>`;}
function speed(lines,stroke,w){return lines.map(([x1,y1,x2,y2,ww])=>`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${stroke}" stroke-width="${ww||w}" stroke-linecap="round"/>`).join("");}
module.exports={fish,fishG,rod,splash,crown,speed,rng};
