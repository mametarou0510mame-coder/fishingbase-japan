const D=require('./designs.js');const SP=require('./splash.js');const {buriG2}=require('./buri2.js');
const JP="Noto Sans CJK JP";const f=n=>n.toFixed(1);
function rodC(p0,c1,c2,p1,w0,w1,fill){const B=t=>{const u=1-t;return[u*u*u*p0[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*p1[0],u*u*u*p0[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*p1[1]]};
 const Dd=t=>{const u=1-t;return[3*u*u*(c1[0]-p0[0])+6*u*t*(c2[0]-c1[0])+3*t*t*(p1[0]-c2[0]),3*u*u*(c1[1]-p0[1])+6*u*t*(c2[1]-c1[1])+3*t*t*(p1[1]-c2[1])]};
 const L=[],R=[];for(let i=0;i<=60;i++){const t=i/60,p=B(t),d=Dd(t),m=Math.hypot(...d),n=[-d[1]/m,d[0]/m],w=(w0+(w1-w0)*Math.pow(t,.8))/2;L.push([p[0]+n[0]*w,p[1]+n[1]*w]);R.push([p[0]-n[0]*w,p[1]-n[1]*w])}
 return{svg:`<path d="M${L.concat(R.reverse()).map(p=>f(p[0])+" "+f(p[1])).join(" L")}Z" fill="${fill}"/>`,tip:B(1)}}
const FC={ink:"#0e2236",back:"#1f4e73",belly:"#eef1f2",stripe:"#f4c21b",tail:"#d8b13a",fin:"#c9cfd4"};
const monoC=c=>({ink:c.paper,back:c.ink,belly:c.ink,fin:c.ink,tail:c.ink,stripe:"#f4c21b"});
const line=(a,b,ink)=>`<path d="M${f(a[0])} ${f(a[1])} L${b[0]} ${b[1]}" stroke="${ink}" stroke-width="3"/>`;
// S1: same scene, fewer parts: flat sky/sea, no lighthouse, no tagline, fewer drops
function S1(c){const rod=rodC([250,640],[190,330],[480,230],[548,450],14,3,c.ink);const m=[600,500];
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1040" width="1000" height="1040">
 <defs><clipPath id="s1"><rect x="60" y="300" width="880" height="560"/></clipPath></defs>
 <g transform="translate(500 300) skewX(-10) scale(1 1.32)"><text text-anchor="middle" font-family="${JP}" font-weight="900" font-size="158" fill="${c.ink}" letter-spacing="-2">TSUREDOKI</text></g>
 <g clip-path="url(#s1)"><rect x="60" y="300" width="880" height="340" fill="${c.paper}"/><circle cx="320" cy="640" r="150" fill="${c.sun}"/>
  <rect x="60" y="640" width="880" height="240" fill="${c.sea}"/><path d="M60 628 H560 V646 H60Z" fill="${c.ink}"/></g>
 <rect x="60" y="300" width="880" height="560" fill="none" stroke="${c.ink}" stroke-width="8"/>
 ${rod.svg}${line(rod.tip,m,c.ink)}
 ${SP.splash2(740,872,380,170,c,4)}${buriG2({x:m[0],y:m[1],rot:50,scale:.47,bend:-128,c:monoC(c),outline:0,simple:true})}${SP.splash2(740,872,380,170,c,4,"front")}
 <g transform="translate(500 985) skewX(-10)"><text text-anchor="middle" font-family="${JP}" font-weight="900" font-size="46" fill="${c.ink}" letter-spacing="14">FISHING TIME · KANSAI</text></g></svg>`;}
// S2: no frame — title, one sun, horizon line, rod, buri + splash
function S2(c,o={}){const fam=o.fam||JP, fw=o.fw||900, fs=o.fs||158, sk=o.sk??-10, sy=o.sy||1.32, ls=o.ls??-2, ffam=o.ffam||JP, ffs=o.ffs||46;const rod=rodC([40,990],[150,560],[330,320],[470,405],20,3,c.ink);const m=[560,520];
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1040" width="1000" height="1040">
 <g transform="translate(500 250) skewX(${sk}) scale(1 ${sy})"><text text-anchor="middle" font-family="${fam}" font-weight="${fw}" font-size="${fs}" fill="${c.ink}" letter-spacing="${ls}">TSUREDOKI</text></g>
 <defs><clipPath id="s2"><rect x="0" y="0" width="1000" height="760"/></clipPath></defs>
 <circle cx="350" cy="760" r="190" fill="${c.sun}" clip-path="url(#s2)"/>
 <path d="M80 760 H920" stroke="${c.ink}" stroke-width="10" stroke-linecap="round"/>
 ${rod.svg}${line(rod.tip,m,c.ink)}
 ${SP.splash2(700,880,380,170,c,4)}${buriG2({x:m[0],y:m[1],rot:52,scale:.47,bend:-128,c:{...monoC(c),stripe:o.stripe||"#f4c21b"},outline:0,simple:true})}${SP.splash2(700,880,380,170,c,4,"front")}
 <g transform="translate(500 1000) skewX(${o.fsk??-10})"><text text-anchor="middle" font-family="${ffam}" font-weight="${o.ffw||900}" font-size="${ffs}" fill="${c.ink}" letter-spacing="${o.fls??14}">FISHING TIME · KANSAI</text></g></svg>`;}
module.exports={S1,S2};
