// ブリ v2: hand-drawn side profile in a 1000-long frame (head at x=0, facing -x), warped along a bent spine.
const f=n=>n.toFixed(1);
const TOP=[[0,-4],[12,-22],[40,-50],[90,-84],[160,-110],[240,-124],[330,-130],[420,-127],[510,-117],[600,-100],[690,-78],[770,-54],[825,-36],[860,-27]];
const BOT=[[0,-4],[8,8],[30,28],[80,58],[160,86],[260,103],[360,109],[460,106],[560,94],[650,76],[730,56],[800,38],[860,25]];
// smooth polyline through points (Catmull-Rom -> cubic)
function smooth(pts){let d=`M${f(pts[0][0])} ${f(pts[0][1])}`;for(let i=0;i<pts.length-1;i++){const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2;
 const c1=[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6],c2=[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6];d+=` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;}return d;}
function warpPath(d,W){return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g,(_,x,y)=>{const p=W(+x,+y);return f(p[0])+" "+f(p[1]);});}
function shapes(){
 const body=smooth(TOP)+" "+smooth(BOT.slice().reverse()).replace(/^M[^C]*/," L860 25 ")+" Z";
 // simpler: build closed body from top then reversed bottom
 const bodyD=smooth(TOP)+smooth([[860,-27],[862,0],[860,25]]).replace(/^M[^C]*/,"")+smooth(BOT.slice().reverse()).replace(/^M[^C]*/,"")+" Z";
 const tail="M858 -26 Q905 -60 960 -128 Q985 -158 1012 -178 Q985 -120 968 -70 Q955 -25 930 0 Q955 25 968 70 Q985 120 1012 172 Q985 152 960 122 Q905 56 858 24 Z";
 const dorsal2="M420 -126 Q432 -170 462 -196 Q474 -168 500 -150 Q560 -134 620 -118 Q700 -96 790 -64 L822 -40 Z";
 const dorsal1="M300 -128 L312 -146 L326 -131 L340 -149 L354 -131 L368 -146 L382 -128 Z";
 const anal="M560 92 Q574 132 598 152 Q610 124 640 112 Q710 86 795 54 L822 38 Z";
 const pelvic="M218 98 Q236 132 268 150 Q262 120 252 101 Z";
 const pect="M182 6 Q232 18 300 40 Q250 30 190 26 Z";
 const backC=[[0,-4],[12,-22],[40,-50],[90,-84],[160,-110],[240,-124],[330,-130],[420,-127],[510,-117],[600,-100],[690,-78],[770,-54],[825,-36],[860,-27]];
 const sline=[[4,-8],[40,-18],[110,-14],[220,-10],[360,-8],[500,-4],[640,0],[780,2],[870,0]];
 const back=smooth(backC)+" L870 -14 "+smooth(sline.slice().reverse().map(([x,y])=>[x,y-13])).replace(/^M[^C]*/,"")+" Z";
 const stripeTop=sline.map(([x,y])=>[x,y-13]), stripeBot=sline.map(([x,y],i)=>[x,y+(i===0?3:11)]);
 const stripe=smooth(stripeTop)+" L870 9 "+smooth(stripeBot.slice().reverse()).replace(/^M[^C]*/,"")+" Z";
 const gill="M150 -82 Q178 -10 146 84"; const pre="M118 -50 Q132 0 112 46";
 const mouth="M2 0 Q24 6 50 12 Q56 14 52 20";
 return {bodyD,tail,dorsal1,dorsal2,anal,pelvic,pect,back,stripe,gill,pre,mouth,eye:[64,-20]};
}
function buriG2({x,y,rot=0,scale=1,flip=false,bend=0,c,outline=10}){
 const S=shapes();
 const W=(px,py)=>{const t=px/1000;const sy=bend*4*t*(1-t);const dy=bend*4*(1-2*t)/1000;const m=Math.hypot(1,dy);const n=[dy/m,-1/m];return [px+n[0]*(-py)*1, sy+n[1]*(-py)];};
 const w=d=>warpPath(d,W); const e=W(...S.eye);
 const all=[S.bodyD,S.tail,S.dorsal1,S.dorsal2,S.anal,S.pelvic].map(w).join(" ");
 const k=scale;
 return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${flip?-k:k} ${k})">
 ${outline?`<path d="${all}" fill="${c.ink}" stroke="${c.ink}" stroke-width="${outline/k}" stroke-linejoin="round"/>`:""}
 <path d="${w(S.dorsal2)} ${w(S.dorsal1)}" fill="${c.back}"/>
 <path d="${w(S.anal)} ${w(S.pelvic)}" fill="${c.fin}"/>
 <path d="${w(S.tail)}" fill="${c.tail}"/>
 <path d="${w(S.bodyD)}" fill="${c.belly}"/>
 <path d="${w(S.back)}" fill="${c.back}"/>
 <path d="${w(S.stripe)}" fill="${c.stripe}"/>
 <path d="${w(S.pect)}" fill="${c.fin}" stroke="${c.ink}" stroke-width="${3/k}"/>
 <path d="${w(S.gill)}" stroke="${c.ink}" stroke-width="${5/k}" fill="none" stroke-linecap="round"/>
 <path d="${w(S.pre)}" stroke="${c.ink}" stroke-width="${3/k}" fill="none" stroke-linecap="round" opacity=".6"/>
 <path d="${w(S.mouth)}" stroke="${c.ink}" stroke-width="${4/k}" fill="none" stroke-linecap="round"/>
 <circle cx="${f(e[0])}" cy="${f(e[1])}" r="13" fill="${c.stripe}"/><circle cx="${f(e[0])}" cy="${f(e[1])}" r="9" fill="${c.ink}"/><circle cx="${f(e[0]-3)}" cy="${f(e[1]-3)}" r="2.6" fill="#fff"/>
 </g>`;
}
module.exports={buriG2};
