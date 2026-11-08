const {buriG2}=require('./buri2.js');
const JP="Noto Sans CJK JP";
// one-colour buri: body in ink, stripe & eye knocked out in paper
const mono=(x,y,rot,s,ink,paper,bend=0)=>buriG2({x,y,rot,scale:s,bend,outline:0,c:{ink:paper,back:ink,belly:ink,stripe:paper,tail:ink,fin:ink}});
// 1: buri + TSUREDOKI
const m1=(ink,acc,paper)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 340" width="600" height="340">
 ${mono(40,150,-8,.5,ink,paper,-60)}
 <g transform="translate(300 290) skewX(-10)"><text text-anchor="middle" font-family="${JP}" font-weight="900" font-size="84" fill="${ink}" letter-spacing="2">TSUREDOKI</text></g>
 <rect x="80" y="306" width="440" height="8" fill="${acc}"/></svg>`;
// 2: circle line badge, 1 colour
const m2=(ink,acc,paper)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
 <defs><path id="t" d="M60 200 A140 140 0 0 1 340 200"/><path id="b" d="M75 200 A125 125 0 0 0 325 200"/></defs>
 <circle cx="200" cy="200" r="190" fill="none" stroke="${ink}" stroke-width="14"/>
 <circle cx="200" cy="200" r="104" fill="none" stroke="${ink}" stroke-width="6"/>
 <text font-family="${JP}" font-weight="900" font-size="46" fill="${ink}" letter-spacing="6"><textPath href="#t" startOffset="50%" text-anchor="middle">TSUREDOKI</textPath></text>
 <text font-family="${JP}" font-weight="900" font-size="24" fill="${ink}" letter-spacing="8" dy="24"><textPath href="#b" startOffset="50%" text-anchor="middle">KANSAI · JAPAN</textPath></text>
 ${mono(108,214,-14,.2,ink,paper,-40)}
 <circle cx="40" cy="200" r="7" fill="${acc}"/><circle cx="360" cy="200" r="7" fill="${acc}"/></svg>`;
// 3: just the leaping buri + small type stacked
const m3=(ink,acc,paper)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 470" width="400" height="470">
 ${mono(140,30,62,.36,ink,paper,-140)}
 <path d="M90 360 q55 -18 110 0 t110 0" stroke="${acc}" stroke-width="10" fill="none" stroke-linecap="round"/>
 <g transform="translate(200 445) skewX(-10)"><text text-anchor="middle" font-family="${JP}" font-weight="900" font-size="60" fill="${ink}">TSUREDOKI</text></g></svg>`;
module.exports={m1,m2,m3};
