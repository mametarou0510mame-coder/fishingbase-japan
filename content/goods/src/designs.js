const K=require('./kit.js');const SP=require('./splash.js');const {buriG2}=require('./buri2.js');
const buriG=({x,y,rot=0,scale=1,flip=false,opt,c,outline=12})=>buriG2({x,y,rot,scale:scale*opt.L/1000,flip,bend:opt.b*1000/opt.L,c,outline});
const f=n=>n.toFixed(1);
const C={ink:"#0e2236",paper:"#f5eddf",acc:"#f2602a",sea:"#1f7fc4",sun:"#f7c65a",glow:"#fbe3a6",back:"#24607f",stripe:"#f2c230",tail:"#e0b93c"};
const JP="Noto Sans CJK JP";
function rodC(p0,c1,c2,p1,w0,w1,fill){const B=t=>{const u=1-t;return[u*u*u*p0[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*p1[0],u*u*u*p0[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*p1[1]]};
 const D=t=>{const u=1-t;return[3*u*u*(c1[0]-p0[0])+6*u*t*(c2[0]-c1[0])+3*t*t*(p1[0]-c2[0]),3*u*u*(c1[1]-p0[1])+6*u*t*(c2[1]-c1[1])+3*t*t*(p1[1]-c2[1])]};
 const L=[],R=[];for(let i=0;i<=60;i++){const t=i/60,p=B(t),d=D(t),m=Math.hypot(...d),n=[-d[1]/m,d[0]/m],w=(w0+(w1-w0)*Math.pow(t,.8))/2;L.push([p[0]+n[0]*w,p[1]+n[1]*w]);R.push([p[0]-n[0]*w,p[1]-n[1]*w])}
 return{svg:`<path d="M${L.concat(R.reverse()).map(p=>f(p[0])+" "+f(p[1])).join(" L")}Z" fill="${fill}"/>`,tip:B(1)}}
const line=(a,b,ink)=>`<path d="M${f(a[0])} ${f(a[1])} L${b[0]} ${b[1]} L${b[0]+2} ${b[1]+3}Z" stroke="${ink}" stroke-width="2" fill="${ink}"/>`;
// morning sky: flat bands, soft sun, no rays
const morning=(x,y,w,h,c,sunX,sunY,sunR)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c.paper}"/>
 <rect x="${x}" y="${y+h*.55}" width="${w}" height="${h*.45}" fill="${c.glow}"/>
 <circle cx="${sunX}" cy="${sunY}" r="${sunR}" fill="${c.sun}"/>
 <path d="M${x} ${sunY-sunR*.35} h${w*.55} M${x+w*.35} ${sunY-sunR*.05} h${w*.65}" stroke="${c.paper}" stroke-width="${sunR*.1}" stroke-linecap="round"/>`;
const fishC=c=>({ink:"#0e2236",back:"#1f4e73",belly:"#eef1f2",stripe:"#f4c21b",tail:"#d8b13a",fin:"#c9cfd4"});

// A: framed scene, rod far on breakwater, buri breaks out toward viewer
function A(c=C){const rod=rodC([250,640],[190,330],[480,230],[548,450],14,3,c.ink);const m=[600,500];
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1080" width="1000" height="1080">
 <defs><clipPath id="a1"><rect x="60" y="300" width="880" height="560"/></clipPath></defs>
 <g transform="translate(500 300) skewX(-10) scale(1 1.32)"><text text-anchor="middle" font-family="${JP}" font-weight="900" font-size="158" fill="${c.ink}" letter-spacing="-2">TSUREDOKI</text></g>
 <g clip-path="url(#a1)">${morning(60,300,880,340,c,320,640,150)}
  <rect x="60" y="640" width="880" height="240" fill="${c.sea}"/>
  ${[0,1,2,3,4,5].map(i=>`<path d="M60 ${672+i*34} q50 -${6+i*2} 100 0 t100 0 t100 0 t100 0 t100 0 t100 0 t100 0 t100 0 t100 0" stroke="${c.paper}" stroke-width="${2+i*1.2}" fill="none" opacity=".55"/>`).join("")}
  <path d="M60 628 H560 V646 H60Z" fill="${c.ink}"/>
  <path d="M96 628 l6 -70 h22 l6 70z" fill="${c.paper}" stroke="${c.ink}" stroke-width="5"/><rect x="100" y="586" width="26" height="14" fill="${c.acc}"/><path d="M98 558 h30 l-15 -14z" fill="${c.ink}"/>
 </g>
 <rect x="60" y="300" width="880" height="560" fill="none" stroke="${c.ink}" stroke-width="8"/>
 ${rod.svg}${line(rod.tip,m,c.ink)}
 ${SP.splash2(740,872,380,170,c,4)}
 ${buriG({x:m[0],y:m[1],rot:50,scale:1,opt:{L:470,H:76,b:-60},c:fishC(c),outline:14})}${SP.splash2(740,872,380,170,c,4,"front")}
 
 <g transform="translate(500 990) skewX(-10)"><text text-anchor="middle" font-family="${JP}" font-weight="900" font-size="46" fill="${c.ink}" letter-spacing="14">FISHING TIME · KANSAI</text>
 <text y="56" text-anchor="middle" font-family="${JP}" font-weight="900" font-size="30" fill="${c.acc}" letter-spacing="24">釣れる時を、知っている。</text></g></svg>`;}

// B: round emblem with arched type, buri bursts out of the circle
function B(c=C){const rod=rodC([300,640],[250,420],[420,330],[470,420],12,3,c.ink);const m=[540,380];
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
 <defs><clipPath id="b1"><circle cx="500" cy="500" r="330"/></clipPath>
 <path id="arcT" d="M150 500 A350 350 0 0 1 850 500"/><path id="arcB" d="M170 500 A330 330 0 0 0 830 500"/></defs>
 <circle cx="500" cy="500" r="440" fill="${c.ink}"/><circle cx="500" cy="500" r="425" fill="none" stroke="${c.paper}" stroke-width="5"/>
 <circle cx="500" cy="500" r="340" fill="${c.paper}"/>
 <text font-family="${JP}" font-weight="900" font-size="104" fill="${c.paper}" letter-spacing="10"><textPath href="#arcT" startOffset="50%" text-anchor="middle">TSUREDOKI</textPath></text>
 <text font-family="${JP}" font-weight="900" font-size="40" fill="${c.stripe}" letter-spacing="14" dy="62"><textPath href="#arcB" startOffset="50%" text-anchor="middle">FISHING TIME · KANSAI</textPath></text>
 <circle cx="152" cy="500" r="10" fill="${c.acc}"/><circle cx="848" cy="500" r="10" fill="${c.acc}"/>
 <g clip-path="url(#b1)">${morning(160,160,680,480,c,360,640,120)}
  <rect x="160" y="640" width="680" height="200" fill="${c.sea}"/>
  ${[0,1,2,3,4].map(i=>`<path d="M160 ${670+i*32} q40 -${6+i*2} 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0" stroke="${c.paper}" stroke-width="${2+i}" fill="none" opacity=".55"/>`).join("")}
  <path d="M160 626 H520 V644 H160Z" fill="${c.ink}"/>
  ${rod.svg}${line(rod.tip,m,c.ink)}
 </g>
 <circle cx="500" cy="500" r="340" fill="none" stroke="${c.ink}" stroke-width="10"/>
 ${SP.splash2(600,670,240,120,c,6)}
 ${buriG({x:m[0],y:m[1],rot:-120,scale:.68,flip:true,opt:{L:470,H:72,b:55},c:fishC(c),outline:14})}${SP.splash2(600,670,240,120,c,6,"front")}
 
 </svg>`;}

// C: 出世魚 — buri leaps straight up at the viewer; name ladder at the bottom
function Cc(c=C){const rod=rodC([90,760],[120,380],[380,300],[430,430],13,3,c.ink);const m=[500,250];
 const ladder=[["TSUBASU","ツバス",.32],["HAMACHI","ハマチ",.44],["MEJIRO","メジロ",.58],["BURI","ブリ",.74]];
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -70 1000 1250" width="1000" height="1250">
 <g transform="translate(500 140) skewX(-10) scale(1 1.3)"><text text-anchor="middle" font-family="${JP}" font-weight="900" font-size="150" fill="${c.ink}" letter-spacing="-2">TSUREDOKI</text></g>
 <defs><clipPath id="c1"><path d="M80 170 H920 V820 H80Z"/></clipPath></defs>
 <g clip-path="url(#c1)">${morning(80,170,840,560,c,700,730,170)}
  <rect x="80" y="730" width="840" height="100" fill="${c.sea}"/>
  <path d="M80 718 H620 V734 H80Z" fill="${c.ink}"/>
 </g>
 ${rod.svg}${line(rod.tip,m,c.ink)}
 ${SP.splash2(560,830,520,230,c,2)}
 ${buriG({x:m[0],y:m[1],rot:75,scale:1.08,opt:{L:560,H:84,b:-70},c:fishC(c),outline:15})}${SP.splash2(560,830,520,230,c,2,"front")}
 
 <path d="M80 830 H920" stroke="${c.ink}" stroke-width="8"/>
 ${ladder.map(([en,jp,s],i)=>{const x=150+i*235;return `${buriG({x:x-170*s*1.3/2,y:930,rot:0,scale:s*.62,opt:{L:300,H:46,b:0},c:fishC(c),outline:8})}
  <text x="${x}" y="1010" text-anchor="middle" font-family="${JP}" font-weight="900" font-size="${30+i*4}" fill="${c.ink}" transform="skewX(0)">${en}</text>
  <text x="${x}" y="1046" text-anchor="middle" font-family="${JP}" font-weight="900" font-size="22" fill="${c.acc}">${jp}</text>
  ${i<3?`<path d="M${x+92} 935 l18 0 m-8 -9 l9 9 l-9 9" stroke="${c.acc}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`:""}`}).join("")}
 <text x="500" y="1120" text-anchor="middle" font-family="${JP}" font-weight="900" font-size="28" fill="${c.ink}" letter-spacing="10">出世魚 ― 関西での呼び名</text>
 </svg>`;}
module.exports={A,B,C:Cc,COL:C};
