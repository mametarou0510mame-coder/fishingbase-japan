// ftSim（仕掛けの動きの計算）を、ブラウザなしで node で確かめる道具。
//   node scripts/cg/tools/sim_check.mjs mb_fall mb_sasoi        … 底からの高さ・糸の張り・印（marks）を出す
// main.js から計算の部分だけを取り出して動かす（three.js は読まない）。根のある海底（rf*）の高さも使える。
import fs from "node:fs";
const src = fs.readFileSync(new URL("../main.js", import.meta.url), "utf8");
const grab = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error("not found: " + a); return src.slice(i, j); };
const seqBlocks = [...src.matchAll(/\nObject\.assign\(FT_SEQ, \{[\s\S]*?\n\}\);/g)].map((m) => m[0]).join("\n");
const bodies = [...src.matchAll(/\n(?:const TR_BODY = .*;\n)?FT_BODY\.\w+ = .*;/g)].map((m) => m[0]).join("\n");
const code = `const clamp01 = (x) => Math.max(0, Math.min(1, x)); const lerp = (a, b, k) => a + (b - a) * k; const FT_LZ = 2.6;
${grab("const FT_TURN", "// ---------- 場面（海の断面）")}
${grab("const RF_BOT", "const rfGrp")}
const sfSm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
${grab("function sfBed", "const sfDy")}
const SF_TIP = [-2.6, 2.7]; ${grab("const SF_TURN", "Object.assign(FT_SEQ")}
${bodies}
${grab("const AG_REP", "const AG_BAND")}
${seqBlocks}
return { FT_SEQ, ftRun, rfY };`;
const { FT_SEQ, ftRun, rfY } = new Function(code)();
const names = process.argv.slice(2);
if (!names.length) { console.log(Object.keys(FT_SEQ).join(" ")); process.exit(0); }
for (const n of names) {
  const r = ftRun(n), d = FT_SEQ[n], bot = d.opt?.botf ? (x, t) => d.opt.botf(x, t) : () => d.opt?.bot ?? -70;
  console.log(`\n${n}  dur ${r.dur.toFixed(1)}s  landed ${r.landed.toFixed(2)}s  marks ${JSON.stringify(r.marks)}`);
  const step = r.dur > 30 ? 1 : 0.5;
  let line = "";
  for (let t = 0; t <= r.dur; t += step) { const a = r.at(t); line += `${t.toFixed(1)}s h=${(a[1] - bot(a[0], t)).toFixed(2)} T=${a[3].toFixed(1)} | `; }
  console.log(line);
}
