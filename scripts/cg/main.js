// ツレドキCG：堤防の海の中を3Dで見せる。フレームごとに window.frame(...) を呼ぶと、その瞬間の絵を描く（時間で決まる＝何度描いても同じ絵）。
import * as THREE from "three";
import { LAND, geo } from "./japan.js";

// ?portrait で縦（ショート・リール用 1080x1920）
const PORTRAIT = /portrait/.test(location.search);
const W = PORTRAIT ? 1080 : 1920, H = PORTRAIT ? 1920 : 1080;
if (PORTRAIT) {
  document.body.classList.add("portrait");
  document.getElementById("lines").setAttribute("width", W);
  document.getElementById("lines").setAttribute("height", H);
}
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 600);
camera.aspect = W / H;
const U = { wave: { value: new THREE.Vector3(200, 0, 6) }, chop: { value: 0 }, time: { value: 0 }, night: { value: 0 }, under: { value: 1 }, fogDensity: { value: 0.035 }, fogColor: { value: new THREE.Color(0x0d4a6e) } };

// ---------- 乱数（毎回同じ） ----------
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, k) => a + (b - a) * k;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- 共通の水中シェーダー部品（深さで青くなる・霧） ----------
const FOG_GLSL = `
uniform float fogDensity; uniform vec3 fogColor; uniform float night; uniform float under;
vec3 underwater(vec3 col, vec3 wp, float dist) {
  if (under > 0.5 && wp.y < 0.3) {
    float depth = clamp(-wp.y, 0.0, 30.0);
    col *= mix(vec3(1.0), vec3(0.55, 0.85, 1.0), clamp(depth / 14.0, 0.0, 1.0));
    float f = 1.0 - exp(-pow(fogDensity * dist, 1.35));
    vec3 fc = fogColor * mix(1.0, 0.18, night) * (1.0 - clamp(depth / 40.0, 0.0, 0.6));
    col = mix(col, fc, f);
  }
  float lampK = exp(-pow(distance(wp.xz, vec2(-20.0, 4.0))/9.0, 2.0)) * smoothstep(-14.0, 0.0, wp.y);
  col *= mix(1.0, 0.28 + 1.9*lampK, night);
  col += night * lampK * vec3(0.10,0.08,0.03);
  return col;
}`;

// ---------- 海底（砂＋コースティクス） ----------
function makeSeabed() {
  const g = new THREE.PlaneGeometry(260, 160, 220, 140);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  const r = rng(7);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const slope = -9.5 - Math.max(0, z) * 0.05; // 堤防の足元（z=0）から沖へゆっくり深く
    const n = Math.sin(x * 0.21 + z * 0.13) * 0.35 + Math.sin(x * 0.07 - z * 0.19) * 0.6 + Math.sin(x * 0.9 + z * 1.3) * 0.06;
    p.setY(i, z < -2 ? 2.4 : slope + n);
  }
  g.computeVertexNormals();
  const m = new THREE.ShaderMaterial({
    uniforms: { ...U, light: { value: 1 } },
    vertexShader: `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float time; ${FOG_GLSL} varying vec3 vW; varying vec3 vN;
      float caust(vec2 p, float t){ float c=0.; for(int i=0;i<3;i++){ float fi=float(i); vec2 q=p*(0.55+0.35*fi)+vec2(t*(0.35+0.1*fi), -t*0.27); c+=pow(abs(sin(q.x+sin(q.y*1.3+t)) * sin(q.y*1.1+sin(q.x*0.8-t*0.7))), 6.0);} return c; }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec3 sand = vec3(0.86, 0.78, 0.6) * (0.85 + 0.15*hash(floor(vW.xz*6.)));
        float diff = clamp(dot(vN, normalize(vec3(0.3,1.,0.2))), 0.0, 1.0);
        if (vW.y > 1.0) {
          // 陸：なめらかなノイズで、舗装（灰）と緑をまだらに
          vec2 q = vW.xz * 0.06; vec2 iq = floor(q); vec2 fq = fract(q); fq = fq*fq*(3.0-2.0*fq);
          float n1 = mix(mix(hash(iq), hash(iq+vec2(1,0)), fq.x), mix(hash(iq+vec2(0,1)), hash(iq+vec2(1,1)), fq.x), fq.y);
          vec2 q2 = vW.xz * 0.23; vec2 i2 = floor(q2); vec2 f2 = fract(q2); f2 = f2*f2*(3.0-2.0*f2);
          float n2 = mix(mix(hash(i2), hash(i2+vec2(1,0)), f2.x), mix(hash(i2+vec2(0,1)), hash(i2+vec2(1,1)), f2.x), f2.y);
          sand = mix(vec3(0.50,0.52,0.53), vec3(0.30,0.40,0.27), smoothstep(0.45, 0.75, n1*0.7 + n2*0.3)) * (0.92 + 0.08*n2);
        }
        vec3 col = sand * (0.35 + 0.65*diff);
        col += vec3(0.9,1.0,1.0) * caust(vW.xz*0.9, time) * 0.22 * (1.0 - night) * step(vW.y, 1.0);
        gl_FragColor = vec4(underwater(col, vW, distance(cameraPosition, vW)), 1.0);
      }`,
  });
  return new THREE.Mesh(g, m);
}

// ---------- 岩・コンクリート（汎用の陰影シェーダー） ----------
function shadedMat(color, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, base: { value: new THREE.Color(color) }, rough: { value: opts.rough ?? 0.25 } },
    vertexShader: `varying vec3 vW; varying vec3 vN; varying vec3 vC;
      #ifdef USE_INSTANCING
      #endif
      void main(){ mat4 mm = modelMatrix;
        #ifdef USE_INSTANCING
        mm = modelMatrix * instanceMatrix;
        #endif
        vec4 w = mm*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(mm)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float time; uniform vec3 base; uniform float rough; ${FOG_GLSL} varying vec3 vW; varying vec3 vN;
      float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
      float caust(vec2 p, float t){ return pow(abs(sin(p.x*1.1+sin(p.y*1.4+t))*sin(p.y*0.9+sin(p.x*0.7-t*0.8))), 6.0); }
      void main(){
        vec3 q = vW*3.0; vec3 fq = floor(q); vec3 u = fract(q); u = u*u*(3.0-2.0*u);
        float n = mix(mix(mix(hash(fq),hash(fq+vec3(1,0,0)),u.x),mix(hash(fq+vec3(0,1,0)),hash(fq+vec3(1,1,0)),u.x),u.y),mix(mix(hash(fq+vec3(0,0,1)),hash(fq+vec3(1,0,1)),u.x),mix(hash(fq+vec3(0,1,1)),hash(fq+vec3(1,1,1)),u.x),u.y),u.z);
        vec3 col = base * (1.0 - rough + rough*2.0*n);
        float diff = clamp(dot(vN, normalize(vec3(0.35,1.,0.45))), 0.0, 1.0);
        col *= 0.32 + 0.75*diff;
        if (vW.y < 0.0) col += vec3(0.8,1.,1.) * caust(vW.xz*0.8 + vW.y*0.2, time) * 0.12 * max(vN.y,0.0) * (1.0-night);
        gl_FragColor = vec4(underwater(col, vW, distance(cameraPosition, vW)), 1.0);
      }`,
  });
}

function makeRock(r, seed) {
  const g = new THREE.IcosahedronGeometry(r, 2);
  const p = g.attributes.position;
  const rr = rng(seed);
  const k = [rr() * 3, rr() * 3, rr() * 3];
  for (let i = 0; i < p.count; i++) {
    const v = V(p.getX(i), p.getY(i), p.getZ(i));
    const f = 1 + 0.18 * Math.sin(v.x * 2.1 + k[0]) * Math.sin(v.y * 1.7 + k[1]) + 0.12 * Math.sin(v.z * 2.9 + k[2]);
    v.multiplyScalar(f);
    v.y *= 0.7;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// テトラポッド：中心から正四面体の4方向に脚
function tetrapodGeometry(s = 1.4) {
  const dirs = [V(1, 1, 1), V(-1, -1, 1), V(-1, 1, -1), V(1, -1, -1)].map((d) => d.normalize());
  const parts = [];
  for (const d of dirs) {
    const leg = new THREE.CylinderGeometry(0.32 * s, 0.55 * s, 1.5 * s, 14);
    leg.translate(0, 0.75 * s, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d);
    leg.applyQuaternion(q);
    parts.push(leg);
  }
  const core = new THREE.SphereGeometry(0.6 * s, 16, 12);
  parts.push(core);
  return mergeGeoms(parts);
}

function mergeGeoms(list) {
  // BufferGeometryUtils を使わずに、位置と法線だけを結合
  const geoms = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0;
  for (const g of geoms) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of geoms) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  return out;
}

// ---------- 水面（下から見た揺れる光／上から見た海） ----------
function makeSurface() {
  const g = new THREE.PlaneGeometry(400, 300, 160, 120);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.ShaderMaterial({
    uniforms: { ...U },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    vertexShader: `uniform float time; uniform vec3 wave; uniform float chop; varying vec3 vW; varying float vH;
      void main(){ vec3 p = position; float h = sin(p.x*0.18+time*1.1)*0.18 + sin(p.z*0.23-time*0.9)*0.16 + sin((p.x+p.z)*0.5+time*1.7)*0.05;
        h *= 1.0 + chop*2.5; h += chop*0.35*sin(p.x*0.9+p.z*0.7+time*2.3);
        // 大きな波（高波）：wave.x=波の位置(z)、wave.y=高さ、wave.z=幅
        h += wave.y * exp(-pow((p.z - wave.x)/wave.z, 2.0)) * (0.85 + 0.15*sin(p.x*0.08));
        p.y += h; vH=h; vec4 w = modelMatrix*vec4(p,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float time; uniform float night; uniform float under; varying vec3 vW; varying float vH;
      void main(){
        float d = distance(cameraPosition, vW);
        if (cameraPosition.y < vW.y) {
          // 下から：明るい揺らめき
          float r = pow(abs(sin(vW.x*0.6+time*1.3+sin(vW.z*0.4))*sin(vW.z*0.55-time*1.1)), 3.0);
          vec3 c = mix(vec3(0.35,0.75,0.95), vec3(0.9,1.0,1.0), r) * mix(1.0, 0.12, night);
          float a = mix(0.85, 0.0, clamp(d/120.0, 0.0, 1.0));
          gl_FragColor = vec4(c, a);
        } else {
          // 上から：朝の海
          vec2 P = vW.xz;
          float e = 0.05;
          #define HH(q) (sin(q.x*0.18+time*1.1)*0.18 + sin(q.y*0.23-time*0.9)*0.16 + sin((q.x+q.y)*0.5+time*1.7)*0.05 + sin(q.x*1.37+q.y*0.61+time*2.1)*0.03 + sin(q.x*-0.83+q.y*1.29+time*1.9)*0.03 + sin(q.x*2.71-q.y*1.13+time*3.3)*0.012)
          vec3 N = normalize(vec3(-(HH((P+vec2(e,0.)))-HH((P-vec2(e,0.))))/(2.*e), 1.0, -(HH((P+vec2(0.,e)))-HH((P-vec2(0.,e))))/(2.*e)));
          vec3 V = normalize(cameraPosition - vW);
          vec3 R = reflect(-V, N);
          float fres = 0.04 + 0.96*pow(1.0 - max(dot(N, V), 0.0), 5.0);
          vec3 skyc = mix(vec3(1.0,0.74,0.52), vec3(0.36,0.58,0.86), smoothstep(0.0,0.5,R.y));
          vec3 deep = vec3(0.02,0.16,0.26);
          vec3 c = mix(deep, skyc, clamp(fres*1.4, 0.0, 1.0));
          c += vec3(1.0,0.85,0.6) * pow(max(dot(R, normalize(vec3(-0.6,0.12,0.8))), 0.0), 120.0) * 2.5;
          // 細かいきらめき（ブルームで光る）
          vec2 gp = vW.xz * 4.0 + vec2(time * 0.7, time * 0.4);
          vec2 gq = floor(gp);
          float gr = fract(sin(dot(gq, vec2(12.9898,78.233)))*43758.5453);
          vec2 gc = vec2(fract(gr * 13.7), fract(gr * 71.3)) * 0.6 + 0.2;
          float gl = step(0.975, gr) * smoothstep(0.12, 0.0, length(fract(gp) - gc)) * (0.5 + 0.5 * sin(time * 6.0 + gr * 40.0));
          c += vec3(1.0,0.95,0.85) * gl * 0.9 * (1.0 - night);
          // 空の色をもう少し映して、深い青に
          c = mix(c, c * vec3(0.85,0.98,1.1), 0.35);
          c = mix(c, vec3(0.92,0.95,0.97), smoothstep(1.1, 2.4, vH) * 0.85); // 高波の白い波頭
          c *= mix(1.0, 0.2, night);
          gl_FragColor = vec4(c, 0.96);
        }
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.renderOrder = 5;
  return mesh;
}

// ---------- 光の筋（ゴッドレイ） ----------
function makeRays() {
  const grp = new THREE.Group();
  const r = rng(11);
  for (let i = 0; i < 16; i++) {
    const g = new THREE.PlaneGeometry(1, 1);
    const m = new THREE.ShaderMaterial({
      uniforms: { ...U, seed: { value: r() * 10 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float time; uniform float seed; uniform float night; varying vec2 vUv;
        void main(){ float a = smoothstep(0.0,0.5,vUv.x)*smoothstep(1.0,0.5,vUv.x) * pow(vUv.y, 1.6);
          a *= 0.07 + 0.05*sin(time*0.6+seed*3.0); gl_FragColor = vec4(vec3(0.75,0.95,1.0)*a*(1.0-night), 1.0); }`,
    });
    const mesh = new THREE.Mesh(g, m);
    const w = 3 + r() * 5;
    mesh.scale.set(w, 28, 1);
    mesh.position.set(-70 + r() * 140, -12, 4 + r() * 60);
    mesh.rotation.set(0, r() * Math.PI, 0.25 - r() * 0.15);
    mesh.userData = { x0: mesh.position.x, sp: 0.3 + r() * 0.5 };
    grp.add(mesh);
  }
  return grp;
}

// ---------- 漂う粒子（マリンスノー・プランクトン） ----------
function makeParticles(n, spread, size, color, seed) {
  const r = rng(seed);
  const pos = new Float32Array(n * 3), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (r() - 0.5) * spread.x + spread.cx;
    pos[i * 3 + 1] = -r() * spread.y + spread.cy;
    pos[i * 3 + 2] = r() * spread.z + spread.cz;
    ph[i] = r() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("ph", new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { ...U, size: { value: size }, col: { value: new THREE.Color(color) }, glow: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time; uniform float size; attribute float ph; varying float vA;
      void main(){ vec3 p = position; p.x += sin(time*0.3+ph)*0.6; p.y += sin(time*0.2+ph*1.7)*0.4 + mod(time*0.05+ph, 1.0)*0.3; p.z += cos(time*0.25+ph)*0.6;
        vec4 mv = modelViewMatrix*vec4(p,1.); gl_PointSize = size * 300.0 / -mv.z; vA = clamp(1.0 - (-mv.z)/70.0, 0.0, 1.0); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 col; uniform float night; uniform float glow; varying float vA;
      void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d) * vA; gl_FragColor = vec4(col*a*mix(0.6, 1.0+glow*2.0, night), 1.0); }`,
  });
  return new THREE.Points(g, m);
}

// ---------- 魚（イラストを板に貼り、尾を振らせる） ----------
const loader = new THREE.TextureLoader();
const FISH_FILES = { アジ: "f00", サバ: "f01", イワシ: "f02", タチウオ: "f03", チヌ: "f04", ハマチ: "f05", サゴシ: "f06", メバル: "f08", ガシラ: "f09", カレイ: "f24", ヒラメ: "f25", キス: "f23", ハゼ: "f27", アイナメ: "f26", グレ: "f11", スズキ: "f20" };
const tex = {};
const pending = [];
for (const [k, f] of Object.entries(FISH_FILES)) {
  pending.push(new Promise((ok) => { tex[k] = loader.load(`../../assets/fish/${f}.png`, ok, undefined, ok); }));
}
for (const t of Object.values(tex)) t.colorSpace = THREE.SRGBColorSpace;

function fishMaterial(name, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, map: { value: tex[name] }, amp: { value: opts.amp ?? 0.08 }, freq: { value: opts.freq ?? 7 }, bright: { value: opts.bright ?? 1 } },
    transparent: false, alphaTest: 0.5, side: THREE.DoubleSide,
    vertexShader: `uniform float time; uniform float amp; uniform float freq; attribute float phase; varying vec2 vUv; varying vec3 vW;
      void main(){ vUv = uv; vec3 p = position; float ph = 0.0;
        #ifdef USE_INSTANCING
        ph = phase;
        #endif
        float tail = pow(1.0 - uv.x, 1.6);
        p.z += sin(time*freq + ph - uv.x*5.0) * amp * tail * 2.0;
        mat4 mm = modelMatrix;
        #ifdef USE_INSTANCING
        mm = modelMatrix * instanceMatrix;
        #endif
        vec4 w = mm * vec4(p,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform sampler2D map; uniform float bright; ${FOG_GLSL} varying vec2 vUv; varying vec3 vW;
      void main(){ vec4 c = texture2D(map, vUv); if (c.a < 0.5) discard; vec3 col = pow(c.rgb, vec3(2.2)) * 1.25 * bright;
        gl_FragColor = vec4(underwater(col, vW, distance(cameraPosition, vW)), 1.0); }`,
  });
}

function fishMesh(name, len, opts) {
  const g = new THREE.PlaneGeometry(len, len * 0.6, 24, 4);
  const m = new THREE.Mesh(g, fishMaterial(name, opts));
  return m;
}

// 群れ（InstancedMesh）。位置は毎フレーム計算する
function school(name, n, len, seed, opts = {}) {
  const g = new THREE.PlaneGeometry(len, len * 0.6, 16, 2);
  const ph = new Float32Array(n);
  const r = rng(seed);
  const off = [];
  for (let i = 0; i < n; i++) {
    ph[i] = r() * 6.28;
    off.push({ x: (r() - 0.5) * 2, y: (r() - 0.5) * 2, z: (r() - 0.5) * 2, s: 0.75 + r() * 0.5, w: 0.6 + r() * 0.8, p: r() * 6.28 });
  }
  g.setAttribute("phase", new THREE.InstancedBufferAttribute(ph, 1));
  const mesh = new THREE.InstancedMesh(g, fishMaterial(name, { amp: opts.amp ?? 0.1, freq: opts.freq ?? 11 }), n);
  mesh.userData = { off, ...opts };
  mesh.frustumCulled = false;
  return mesh;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
// center: 群れの中心、dir: 進む向き(x方向 +1/-1)、size: 広がり
function updateSchool(mesh, t, center, size, dir = 1, swirl = 0) {
  const { off } = mesh.userData;
  for (let i = 0; i < off.length; i++) {
    const o = off[i];
    const a = t * o.w + o.p;
    let x = o.x * size.x + Math.sin(a) * 0.4, y = o.y * size.y + Math.sin(a * 1.3) * 0.25, z = o.z * size.z + Math.cos(a) * 0.4;
    let yaw = dir > 0 ? 0 : Math.PI;
    if (swirl) {
      // 球のように回る群れ（ベイトボール）
      const ang = t * swirl * o.w + o.p * 3;
      const rad = size.x * (0.4 + 0.6 * Math.abs(o.x));
      x = Math.cos(ang) * rad;
      z = Math.sin(ang) * rad;
      y = o.y * size.y;
      yaw = -ang - Math.PI / 2 * Math.sign(swirl);
    }
    _p.set(center.x + x, center.y + y, center.z + z);
    _q.setFromEuler(new THREE.Euler(0, yaw, Math.sin(a * 0.7) * 0.08));
    _s.set(o.s, o.s, o.s);
    _m.compose(_p, _q, _s);
    mesh.setMatrixAt(i, _m);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

// ---------- 空（水上のつかみ用） ----------
function makeSky() {
  const g = new THREE.SphereGeometry(400, 32, 16);
  const m = new THREE.ShaderMaterial({
    uniforms: { ...U },
    side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float night; varying vec3 vP; void main(){ float h = normalize(vP).y;
      vec3 c = mix(vec3(1.0,0.72,0.5), vec3(0.32,0.55,0.85), smoothstep(0.0,0.5,h));
      vec3 sun = vec3(1.0,0.85,0.6)*pow(max(dot(normalize(vP), normalize(vec3(-0.6,0.12,0.8))),0.0), 200.0)*3.0;
      c += sun; c = mix(c, vec3(0.02,0.04,0.1), night); gl_FragColor = vec4(c,1.); }`,
  });
  return new THREE.Mesh(g, m);
}

// ---------- 世界を組み立てる ----------
const world = new THREE.Group();
scene.add(world);
const seabed = makeSeabed();
world.add(seabed);
const surface = makeSurface();
world.add(surface);
const rays = makeRays();
world.add(rays);
const sky = makeSky();
world.add(sky);

// 堤防（コンクリートの壁：z<0 側が陸）
const concrete = shadedMat(0x9aa3a8, { rough: 0.18 });
const wall = new THREE.Mesh(new THREE.BoxGeometry(160, 16, 10), concrete);
wall.position.set(0, -5.5, -5);
world.add(wall);
const top = new THREE.Mesh(new THREE.BoxGeometry(160, 0.6, 12), shadedMat(0xb8bec2, { rough: 0.1 }));
top.position.set(0, 2.8, -5);
world.add(top);
// 壁のカキ殻・フジツボ
let WALL_BAR = null;
{
  const r = rng(3);
  const bar = WALL_BAR = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.08, 7).rotateX(Math.PI / 2), shadedMat(0xd8d2c4, { rough: 0.3 }), 9000);
  for (let i = 0; i < 9000; i++) {
    const y = 0.6 - Math.pow(r(), 0.8) * 4.5; // 潮の満ち引きの範囲に多い
    const s = 0.6 + r() * 0.9;
    _m.compose(V(-80 + r() * 160, y, 0.03), new THREE.Quaternion(), V(s, s, s));
    bar.setMatrixAt(i, _m);
  }
  const mus = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 5), shadedMat(0x2a3040, { rough: 0.25 }), 1400);
  for (let i = 0; i < 1400; i++) {
    const y = -1.5 - Math.pow(r(), 0.7) * 5;
    _m.compose(V(-80 + r() * 160, y, 0.04), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, r() * 3)), V(1.7, 0.75, 0.5));
    mus.setMatrixAt(i, _m);
  }
  world.add(bar, mus);
}
// 海藻（壁の足元）
const weeds = new THREE.Group();
{
  const r = rng(5);
  for (let i = 0; i < 70; i++) {
    const h = 1.5 + r() * 3;
    const g = new THREE.PlaneGeometry(0.35, h, 1, 8);
    g.translate(0, h / 2, 0);
    const m = new THREE.ShaderMaterial({
      uniforms: { ...U, ph: { value: r() * 6 } }, side: THREE.DoubleSide,
      vertexShader: `uniform float time; uniform float ph; varying vec3 vW; varying float vY; void main(){ vec3 p = position; vY = uv.y; p.x += sin(time*1.2+ph+p.y*0.8)*0.25*uv.y; vec4 w = modelMatrix*vec4(p,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `${FOG_GLSL} varying vec3 vW; varying float vY; void main(){ vec3 c = mix(vec3(0.12,0.3,0.12), vec3(0.45,0.6,0.2), vY); gl_FragColor = vec4(underwater(c, vW, distance(cameraPosition,vW)),1.); }`,
    });
    const w = new THREE.Mesh(g, m);
    w.position.set(-75 + r() * 150, -9.6, 0.5 + r() * 2.5);
    w.rotation.y = r() * Math.PI;
    weeds.add(w);
  }
}
world.add(weeds);
// 岩（足元の捨て石）
const rocks = new THREE.Group();
{
  const r = rng(9);
  const mat = shadedMat(0x6d675e, { rough: 0.3 });
  for (let i = 0; i < 46; i++) {
    const m = new THREE.Mesh(makeRock(0.8 + r() * 1.6, i + 1), mat);
    m.position.set(-75 + r() * 150, -9.6 + r() * 0.6, 0.8 + r() * 4);
    m.rotation.set(r() * 3, r() * 3, r() * 3);
    rocks.add(m);
  }
}
world.add(rocks);
// テトラポッドの山（x = 28〜58）
const tetras = new THREE.Group();
{
  const g = tetrapodGeometry(1.5);
  const mat = shadedMat(0xa9adaf, { rough: 0.12 });
  const r = rng(13);
  let k = 0;
  for (let layer = 0; layer < 5; layer++) {
    for (let i = 0; i < 9 - layer; i++) {
      const m = new THREE.Mesh(g, mat);
      m.position.set(30 + i * 3.2 + layer * 1.6 + (r() - 0.5), -9 + layer * 2.6, 1.5 + (r() * 6 - layer * 0.8));
      m.rotation.set(r() * 6, r() * 6, r() * 6);
      tetras.add(m);
      k++;
    }
  }
}
world.add(tetras);
// 常夜灯（夜だけ光る）
const lamp = new THREE.Group();
{
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 10), shadedMat(0x50585e));
  pole.position.set(-20, 6.4, -1.5);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 2.2), shadedMat(0x50585e));
  arm.position.set(-20, 9.8, -0.5);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 10), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }));
  bulb.position.set(-20, 9.6, 0.6);
  // 光の円すい（水の中に入る光）
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(9, 20, 48, 1, true),
    new THREE.ShaderMaterial({
      uniforms: { ...U }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float night; uniform float time; varying vec2 vUv; varying vec3 vW; void main(){ float a = pow(vUv.y, 1.5) * 0.16 * night * (0.9+0.1*sin(time*2.0)); if (vW.y > 0.2) a *= 0.4; gl_FragColor = vec4(vec3(1.0,0.92,0.6)*a, 1.0); }`,
    }),
  );
  cone.position.set(-20, -0.5, 4.5);
  lamp.add(pole, arm, bulb, cone);
  lamp.userData.cone = cone;
}
world.add(lamp);
const snow = makeParticles(1800, { x: 180, y: 13, z: 90, cx: 0, cy: 0, cz: 0 }, 0.08, 0xcfefff, 21);
world.add(snow);
const plankton = makeParticles(1300, { x: 16, y: 9, z: 14, cx: -20, cy: 0, cz: -1 }, 0.1, 0xfff0a0, 23);
world.add(plankton);
// 潮目の流れ（線の粒子）
const flow = (() => {
  const n = 900, pos = new Float32Array(n * 3), ph = new Float32Array(n);
  const r = rng(31);
  for (let i = 0; i < n; i++) { pos[i * 3] = r(); pos[i * 3 + 1] = -r() * 4; pos[i * 3 + 2] = r(); ph[i] = r(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("ph", new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { ...U, show: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time; attribute float ph; varying float vSide; varying float vA;
      void main(){ // 左は東向きの流れ（青）、右は西向きの流れ（緑）。真ん中（x=0）でぶつかる
        float side = position.x < 0.5 ? -1.0 : 1.0; vSide = side;
        float u = fract(ph + time*0.08);
        float x = side < 0.0 ? mix(-40.0, -1.0, u) : mix(40.0, 1.0, u);
        float z = 20.0 + position.z*40.0;
        vec3 p = vec3(x + sin(z*0.2+time)*0.5, position.y, z);
        vec4 mv = modelViewMatrix*vec4(p,1.); gl_PointSize = 9.0 * 30.0 / -mv.z; vA = smoothstep(0.0,0.15,u)*smoothstep(1.0,0.8,u); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float show; varying float vSide; varying float vA; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.1,d)*vA*show;
      vec3 c = vSide < 0.0 ? vec3(0.3,0.75,1.0) : vec3(0.45,1.0,0.6); gl_FragColor = vec4(c*a*0.9, 1.0); }`,
  });
  return new THREE.Points(g, m);
})();
world.add(flow);
// 潮目の泡の帯（水面）
const foam = new THREE.Mesh(
  new THREE.PlaneGeometry(2.5, 70, 1, 40).rotateX(-Math.PI / 2),
  new THREE.ShaderMaterial({
    uniforms: { ...U, show: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float time; uniform float show; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p,vec2(12.9,78.2)))*43758.5); }
      void main(){ float a = smoothstep(0.5,0.1,abs(vUv.x-0.5)) * (0.5+0.5*h(floor(vUv*vec2(8.,120.)+time*2.))) * show; gl_FragColor = vec4(vec3(1.), a*0.8); }`,
  }),
);
foam.position.set(0, 0.05, 55);
world.add(foam);

// 層の帯（表層・中層・底）
const bands = new THREE.Group();
[[-1.5, 0x5fc3c9], [-5.5, 0xf2b630], [-9, 0xe3412b]].forEach(([y, c]) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(160, 3.2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(0, y, 12);
  bands.add(m);
});
world.add(bands);

// 魚たち
const sardines = school("イワシ", 160, 0.55, 41, { freq: 16, amp: 0.06 });
const sagoshi = school("サゴシ", 6, 2.4, 42, { freq: 9 });
const hamachi = school("ハマチ", 4, 2.8, 43, { freq: 8 });
const aji = school("アジ", 70, 0.8, 44, { freq: 12 });
const saba = school("サバ", 18, 1.1, 45, { freq: 10 });
const tachi = new THREE.Group();
for (let i = 0; i < 6; i++) {
  const f = fishMesh("タチウオ", 3.2, { amp: 0.04, freq: 4, bright: 0.75 });
  f.rotation.z = Math.PI / 2 - 0.15; // 頭を上にして立ち泳ぎ
  f.userData.i = i;
  tachi.add(f);
}
const karei = fishMesh("カレイ", 1.5, { amp: 0.01, freq: 2 });
karei.rotation.x = -Math.PI / 2; // 砂の上に平たく
const hirame = fishMesh("ヒラメ", 1.8, { amp: 0.01, freq: 2 });
hirame.rotation.x = -Math.PI / 2;
const kisu = school("キス", 8, 0.9, 46, { freq: 10 });
const haze = school("ハゼ", 5, 0.6, 47, { freq: 6, amp: 0.04 });
const chinu = school("チヌ", 3, 1.6, 48, { freq: 6 });
const mebaru = school("メバル", 9, 0.8, 49, { freq: 7 });
const gashira = school("ガシラ", 5, 0.8, 50, { freq: 4, amp: 0.04 });
const ainame = school("アイナメ", 2, 1.1, 51, { freq: 4 });
const fishAll = [sardines, sagoshi, hamachi, aji, saba, tachi, karei, hirame, kisu, haze, chinu, mebaru, gashira, ainame];
fishAll.forEach((f) => world.add(f));

// ---------- 画面の文字（HTML） ----------
const layer = document.getElementById("layer");
const svg = document.getElementById("lines");
function project(v) {
  const p = v.clone().project(camera);
  return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H, behind: p.z > 1 };
}
let html = "", lines = "";
function label(world3, text, sub, a, cls = "", dx = 0, dy = -110) {
  if (a <= 0.01) return;
  const p = project(world3);
  if (p.behind) return;
  const lx = Math.max(PORTRAIT ? 170 : 0, Math.min(W - (PORTRAIT ? 170 : 0), p.x + dx * (PORTRAIT ? 0.6 : 1))), ly = p.y + dy;
  lines += `<line x1="${p.x}" y1="${p.y}" x2="${lx}" y2="${ly}" stroke="rgba(255,255,255,${0.85 * a})" stroke-width="3"/><circle cx="${p.x}" cy="${p.y}" r="${8 * a}" fill="rgba(255,255,255,${a})"/>`;
  html += `<div class="lab ${cls}" style="left:${lx}px;top:${ly}px;opacity:${a};transform:translate(-50%,-100%) scale(${0.85 + 0.15 * a})">${text}${sub ? `<small>${sub}</small>` : ""}</div>`;
}

// ---------- カメラ ----------
function look(pos, target, fov = 50) {
  camera.position.copy(pos);
  // 縦画面では、横の見える範囲が横画面の時と同じくらいになるように広げる
  camera.fov = PORTRAIT ? Math.min(88, (2 * Math.atan(Math.tan((fov * Math.PI) / 360) / (W / H) * 0.85) * 180) / Math.PI) : fov;
  camera.updateProjectionMatrix();
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
}
const path = (a, b, k) => V(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.z, b.z, k));

const extras = [];
// ---------- ショット ----------
// それぞれ (t: そのシーンの経過秒, d: 長さ, s: シーンの設定, k: いま何行目のナレーションか) を受け取る
function base(night = 0) {
  U.night.value = night;
  U.under.value = 1;
  sky.visible = false;
  fishAll.forEach((f) => (f.visible = false));
  flow.material.uniforms.show.value = 0;
  foam.material.uniforms.show.value = 0;
  bands.children.forEach((b) => (b.material.opacity = 0));
  lamp.visible = night > 0.01;
  extras.forEach((x) => (x.visible = false));
  U.wave.value.set(200, 0, 6);
  U.chop.value = 0;
  U.fogDensity.value = 0.035;
  wall.visible = top.visible = true;
  if (WALL_BAR) WALL_BAR.visible = true;
}
function hide(...xs) { xs.forEach((x) => (x.visible = false)); }
function show(...xs) { xs.forEach((x) => (x.visible = true)); }

function surfaceLife(T) {
  show(sardines, sagoshi, hamachi);
  const c = V(-6 + Math.sin(T * 0.2) * 3, -2.2, 26);
  updateSchool(sardines, T, c, V(2.6, 1.2, 2.6), 1, 0.9);
  updateSchool(sagoshi, T, V(c.x + Math.cos(T * 0.7) * 6, -1.6, c.z + Math.sin(T * 0.7) * 5), V(2, 0.6, 1.5), Math.cos(T * 0.7) > 0 ? -1 : 1);
  updateSchool(hamachi, T, V(c.x - Math.cos(T * 0.5) * 8, -3.4, c.z - Math.sin(T * 0.5) * 6), V(2, 0.8, 2), Math.cos(T * 0.5) > 0 ? 1 : -1);
  return c;
}
function midLife(T, nightK = 0) {
  show(aji, saba, tachi);
  const ac = V(8 + Math.sin(T * 0.25) * 6, -5.2, 14);
  updateSchool(aji, T, ac, V(5, 1.2, 3), Math.cos(T * 0.25) > 0 ? 1 : -1);
  updateSchool(saba, T, V(ac.x + 4, -4.2, 20), V(3, 0.8, 2), 1);
  tachi.children.forEach((f, i) => {
    f.position.set(-22 + i * 1.6 + Math.sin(T * 0.4 + i) * 0.3, -5 - (i % 3) * 0.9 + Math.sin(T * 0.6 + i) * 0.4, 6 + (i % 2) * 2.5);
  });
  return ac;
}
function bottomLife(T) {
  show(karei, hirame, kisu, haze);
  karei.position.set(-6, -9.45, 9);
  karei.rotation.z = 0.4;
  hirame.position.set(1.5, -9.5, 13);
  hirame.rotation.z = -0.6;
  updateSchool(kisu, T, V(-2 + Math.sin(T * 0.3) * 4, -8.9, 15), V(3, 0.2, 2), Math.cos(T * 0.3) > 0 ? 1 : -1);
  updateSchool(haze, T * 0.4, V(-12, -9.3, 6), V(2, 0.05, 1.5), 1);
}
function wallLife(T) {
  show(chinu, mebaru);
  updateSchool(chinu, T, V(-30 + ((T * 1.2) % 40), -6.5, 1.3), V(2.5, 0.6, 0.4), 1);
  updateSchool(mebaru, T * 0.5, V(-11, -4.5, 1.6), V(2.2, 1.2, 0.8), 1);
}
function tetraLife(T) {
  show(gashira, ainame);
  updateSchool(gashira, T * 0.25, V(40, -8.4, 4), V(6, 0.4, 2), 1);
  updateSchool(ainame, T * 0.4, V(46, -8.0, 6), V(3, 0.3, 1), -1);
}

const SHOTS = {
  // 水の上から潜る
  hook(t, d, s) {
    base(0);
    sky.visible = true;
    const k = ease(t / d);
    const dive = ease((t - d * 0.3) / (d * 0.2));
    const bob = Math.sin(t * 1.3) * 0.25 * (1 - dive);
    const pos = V(lerp(-16, -5, k), lerp(6.5, -3.2, dive) + bob, lerp(56, 39, k));
    look(pos, V(lerp(2, -5, k), lerp(1.2, -2.6, dive), lerp(0, 22, dive)), 55);
    U.under.value = pos.y < 0 ? 1 : 0;
    surfaceLife(t);
    const flash = Math.max(0, 1 - Math.abs(t - d * 0.42) / 0.3);
    if (flash > 0) html += `<div class="flash" style="opacity:${flash * 0.85}"></div>`;
    const a = clamp01(t / 0.6) * clamp01((d * 0.32 - t) / 0.4);
    html += `<div class="big" style="top:330px;font-size:96px;opacity:${a};transform:scale(${1 + t * 0.015})">この海の下、<br>魚はどこにいる？</div>`;
    const b = clamp01((t - d * 0.6) / 0.6);
    html += `<div class="big" style="top:760px;font-size:56px;opacity:${b}">堤防の海の中を、3Dで解剖します</div>`;
  },
  title(t, d, s) {
    base(0);
    const ang = t * 0.08;
    look(V(Math.sin(ang) * 30, -3, 34 + Math.cos(ang) * 6), V(0, -5.5, 0), 55);
    surfaceLife(t + 20);
    midLife(t + 20);
    const a = clamp01(t / 0.7);
    html += `<div class="big" style="top:300px;opacity:${a}"><span class="tag">ツレドキ3D</span><div style="font-size:120px;margin-top:26px;transform:translateY(${(1 - a) * 30}px)">堤防の海の中</div><div style="font-size:64px;color:#ffd166">魚はどこに潜んでいる？</div></div>`;
  },
  layers(t, d, s, k) {
    base(0);
    look(path(V(-10, -4, 46), V(6, -5, 40), ease(t / d)), V(0, -5.2, 6), 52);
    surfaceLife(t);
    midLife(t);
    bottomLife(t);
    const names = [["表層", "海面〜2mくらい", 0], ["中層", "まん中あたり", 1], ["底", "海の底の近く", 2]];
    names.forEach(([n, sub, i]) => {
      const on = clamp01((k - i) * 3 + (k >= i ? 1 : 0));
      bands.children[i].material.opacity = (k >= i ? 0.16 : 0) * (0.8 + 0.2 * Math.sin(t * 3));
      label(V(-3, [-1.5, -5.5, -9][i], 12), n, sub, k >= i ? 1 : 0, ["", "gold", "red"][i], -330, 30);
    });
  },
  surface(t, d, s, k) {
    base(0);
    const c = surfaceLife(t);
    look(path(V(c.x - 12, -1.2, c.z + 14), V(c.x - 4, -2.6, c.z + 11), ease(t / d)), V(c.x, -2.2, c.z), 50);
    label(V(c.x, c.y + 1.4, c.z), "イワシの群れ", "エサになる小魚", k >= 0 ? 1 : 0, "");
    label(V(c.x + 5, -1.6, c.z), "サゴシ・サワラ", "速く泳ぐハンター", k >= 1 ? 1 : 0, "gold", 160, -60);
    label(V(c.x - 6, -3.4, c.z - 2), "ハマチ（青物）", "群れで小魚を追う", k >= 2 ? 1 : 0, "gold", -180, 120);
  },
  mid(t, d, s, k) {
    const nk = s.night ? clamp01(t / 2) : 0;
    base(nk * 0.85);
    const c = midLife(t, nk);
    look(path(V(c.x + 10, -4.4, c.z + 16), V(c.x - 6, -5.6, c.z + 13), ease(t / d)), V(c.x - 4, -5.2, c.z - 2), 52);
    label(V(c.x, -4.2, c.z), "アジの群れ", "サビキで狙う", k >= 0 ? 1 : 0, "");
    label(V(c.x + 4, -4.2, 20), "サバ", "群れで回ってくる", k >= 1 ? 1 : 0, "", -120, -90);
  },
  tachiuo(t, d, s, k) {
    base(clamp01(t / 1.5) * 0.9);
    lamp.visible = true;
    midLife(t);
    hide(aji, saba);
    look(path(V(-10, -5, 21), V(-16, -5.6, 18.5), ease(t / d)), V(-18, -5.6, 6), 50);
    label(V(-16.4, -4.6, 7), "タチウオ", "頭を上にして立ち泳ぎ", k >= 0 ? 1 : 0, "gold", 230, -40);
  },
  bottom(t, d, s, k) {
    base(0);
    bottomLife(t);
    look(path(V(-14, -7.6, 22), V(2, -8.2, 22), ease(t / d)), V(-3, -9.3, 10), 50);
    label(V(-6, -9.3, 9), "カレイ", "砂にかくれて待つ", k >= 1 ? 1 : 0, "red", -120, -80);
    label(V(1.5, -9.3, 13), "ヒラメ", "小魚を下から狙う", k >= 1 ? 1 : 0, "red", 140, -90);
    label(V(-2, -8.6, 15), "キス", "砂地を群れで泳ぐ", k >= 0 ? 1 : 0, "", 0, -120);
    label(V(-12, -9.2, 6), "ハゼ", "底にじっと止まる", k >= 2 ? 1 : 0, "", -60, -100);
  },
  wall(t, d, s, k) {
    base(0);
    wallLife(t);
    look(path(V(-26, -4, 9), V(-6, -5, 8), ease(t / d)), V(-14, -5.5, 0), 50);
    label(V(-16, -2.6, 0.1), "カキ殻・フジツボ", "カニや小さなエビのすみか", k >= 0 ? 1 : 0, "", -60, 120);
    label(V(-30 + ((t * 1.2) % 40), -6.5, 1.3), "チヌ", "壁ぎわをパトロール", k >= 1 ? 1 : 0, "gold", 0, -110);
    label(V(-11, -4.5, 1.6), "メバル", "壁ぎわでじっと待つ", k >= 2 ? 1 : 0, "", -40, -90);
  },
  tetra(t, d, s, k) {
    base(0);
    tetraLife(t);
    look(path(V(30, -5, 24), V(48, -6.5, 20), ease(t / d)), V(42, -7.5, 4), 50);
    label(V(40, -8.2, 4), "ガシラ", "テトラのすき間にひそむ", k >= 0 ? 1 : 0, "gold", -120, -120);
    label(V(46, -7.8, 6), "アイナメ", "岩や穴の近く", k >= 1 ? 1 : 0, "", 150, -80);
    if (k >= 2) html += `<div class="card" style="left:120px;top:150px;border:6px solid #e3412b"><b style="font-size:44px;color:#c62828">⚠ テトラの上は危険</b><div style="font-size:32px;margin-top:8px">滑りやすく、すき間に落ちると上がれません。<br>立入禁止の場所には入らない。</div></div>`;
  },
  shiome(t, d, s, k) {
    base(0);
    flow.material.uniforms.show.value = clamp01(t / 1.5);
    foam.material.uniforms.show.value = 1;
    surfaceLife(t);
    const c = V(0, -2.5, 40);
    updateSchool(sardines, t, V(0, -2, 42), V(2.4, 1, 2.4), 1, 1.1);
    updateSchool(sagoshi, t, V(Math.cos(t * 0.8) * 5, -1.5, 42 + Math.sin(t * 0.8) * 4), V(2, 0.5, 1.5), Math.cos(t * 0.8) > 0 ? -1 : 1);
    const above = k >= 2;
    if (above) {
      U.under.value = 0;
      sky.visible = true;
      look(V(-18, 14, 70), V(0, 0, 48), 52);
    } else {
      look(path(V(-16, -2.5, 62), V(14, -3, 60), ease(t / d)), c, 55);
    }
    label(V(-14, -2.5, 40), "東向きの流れ", "", k >= 0 && !above ? 1 : 0, "", 0, -60);
    label(V(14, -2.5, 40), "西向きの流れ", "", k >= 0 && !above ? 1 : 0, "", 0, -60);
    label(V(0, -2, 42), "流れがぶつかる＝潮目", "小魚が集まりやすい", k >= 1 ? 1 : 0, "gold", 0, -160);
    if (above) label(V(0, 0.2, 50), "海面に泡や筋が見える", "これが潮目の目印", 1, "gold", 180, -60);
  },
  night(t, d, s, k) {
    base(clamp01(t / 1.2));
    plankton.material.uniforms.glow.value = 1;
    show(aji, mebaru, tachi);
    updateSchool(aji, t, V(-18, -3.2, 7), V(4, 1.2, 3), Math.cos(t * 0.3) > 0 ? 1 : -1);
    updateSchool(mebaru, t * 0.4, V(-21, -1.6, 3), V(3, 0.6, 1.5), 1);
    tachi.children.forEach((f, i) => f.position.set(-28 + i * 3, -6.5 + Math.sin(t * 0.5 + i) * 0.5, 9 + (i % 2) * 2));
    look(path(V(-6, 1.5, 26), V(-14, -2.5, 22), ease(t / d)), V(-20, -3, 4), 55);
    label(V(-20, -0.5, 5), "常夜灯の光", "プランクトンが集まる", k >= 0 ? 1 : 0, "gold", 160, -40);
    label(V(-18, -3.2, 7), "アジ", "小魚を食べに集まる", k >= 1 ? 1 : 0, "", -160, 40);
    label(V(-21, -1.6, 3), "メバル", "光と影の境目", k >= 1 ? 1 : 0, "", 160, 60);
    label(V(-25, -6.5, 10), "タチウオ", "暗い所から狙う", k >= 2 ? 1 : 0, "red", -160, 0);
  },
  summary(t, d, s, k) {
    base(0);
    surfaceLife(t);
    midLife(t);
    bottomLife(t);
    wallLife(t);
    tetraLife(t);
    look(path(V(-4, -4.5, 40), V(8, -5, 38), ease(t / d)), V(4, -5.5, 4), 60);
    const rows = [["表層", "青物・サゴシ", "イワシの群れの近く", "#5fc3c9"], ["中層", "アジ・サバ", "朝夕に回ってくる", "#f2b630"], ["底", "カレイ・キス・ハゼ", "砂地の上", "#ff5a4a"], ["際", "チヌ・メバル", "壁ぎわ・足元", "#5fc3c9"], ["テトラ", "ガシラ・アイナメ", "すき間（上に乗らない）", "#f2b630"], ["夜", "アジ・メバル・タチウオ", "常夜灯のまわり", "#ff5a4a"]];
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,${0.45 * clamp01(t / 0.6)})"></div>`;
    html += `<div class="big" style="top:110px;font-size:64px;opacity:${clamp01(t / 0.5)}">堤防の魚マップ まとめ</div>`;
    rows.forEach(([a1, b1, c1, col], i) => {
      const a = clamp01((t - 0.4 - i * 0.45) / 0.35);
      const x = i % 2 ? 990 : 150, y = 250 + Math.floor(i / 2) * 210;
      html += `<div class="card" style="left:${x}px;top:${y}px;width:720px;padding:22px 30px;opacity:${a};transform:translateY(${(1 - a) * 30}px);display:flex;align-items:center;gap:26px"><b style="background:${col};color:#06213a;font-size:40px;padding:10px 0;width:150px;text-align:center;border-radius:18px">${a1}</b><div><div style="font-size:44px;font-weight:900">${b1}</div><div style="font-size:30px;color:#3a5a78">${c1}</div></div></div>`;
    });
  },
  ask(t, d, s) {
    base(0);
    const ang = t * 0.05;
    look(V(Math.sin(ang) * 20, -4, 30), V(0, -5, 10), 55);
    midLife(t);
    const a = clamp01(t / 0.6);
    html += `<div class="card" style="left:360px;right:360px;top:150px;opacity:${a};text-align:center"><b style="background:#e3412b;color:#fff;padding:6px 26px;border-radius:999px;font-size:36px">コメントで教えて！</b><div style="font-size:60px;font-weight:900;margin:26px 0 6px">${s.question}</div>${s.options.map((o, i) => `<div class="opt" style="opacity:${clamp01((t - 0.6 - i * 0.35) / 0.4)}"><i>${i + 1}</i>${o}</div>`).join("")}</div>`;
  },
  thumb(t, d, s) {
    base(0);
    const c = surfaceLife(12);
    midLife(12);
    bottomLife(12);
    look(V(c.x - 9, -3.6, c.z + 13), V(c.x + 2, -3.4, c.z - 4), 60);
    html += `<div style="position:absolute;left:70px;top:250px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px">3D解剖</span><div style="font-size:150px;line-height:1.1;margin-top:30px;-webkit-text-stroke:3px #06213a">堤防の海の中<br><span style="color:#ffd166">魚はどこ？</span></div></div>`;
  },
  end(t, d) {
    base(0);
    // 2026-11-12 オーナー：エンディングの魚も Fish Kit（写真から作った3Dモデル）に。今後の動画共通
    if (typeof FK !== "undefined" && FK.ok) {
      ftBase();
      ftBoat.visible = false;
      const c = FTp(0, -18, FT_LZ), ang = t * 0.03;
      look(c.clone().add(V(Math.sin(ang) * 0.6, 0.3, 3.5)), c.clone().add(V(0, 0.1, 0)), 50);
      endFish(t, c);
      ftFlush();
    } else {
      const ang = t * 0.05;
      look(V(Math.sin(ang) * 26, -2.5, 36), V(0, -4.5, 6), 55);
      surfaceLife(t);
      midLife(t);
    }
    const a = clamp01(t / 0.6);
    html += `<div class="big" style="top:300px;opacity:${a}"><div style="font-size:110px">ツレドキ<span style="font-size:50px;border:4px solid #fff;border-radius:12px;padding:0 12px;margin-left:12px;vertical-align:20px">関西</span></div><div style="font-size:52px;margin-top:20px">釣れる時間・釣り場・釣果をまとめてチェック</div><div style="margin-top:40px"><span style="background:#f2b630;color:#10345a;font-size:56px;padding:14px 46px;border-radius:999px">「ツレドキ関西」で検索</span></div></div>`;
  },
};


// =====================================================================
// 食物連鎖（cg-shokumotsu）：プランクトン→イワシ→青物→ナブラ・鳥山
// =====================================================================
// プランクトン（拡大して見せる）：0=植物プランクトン（緑の輪）、1=動物プランクトン（オレンジの小さなエビ形）
const macro = (() => {
  const n = 900, pos = new Float32Array(n * 3), kind = new Float32Array(n), ph = new Float32Array(n);
  const r = rng(77);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (r() - 0.5) * 26; pos[i * 3 + 1] = (r() - 0.5) * 8; pos[i * 3 + 2] = (r() - 0.5) * 22;
    kind[i] = r() < 0.62 ? 0 : 1; ph[i] = r() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("kind", new THREE.BufferAttribute(kind, 1));
  g.setAttribute("ph", new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { ...U, showA: { value: 1 }, showB: { value: 1 }, size: { value: 0.55 } },
    transparent: true, depthWrite: false,
    vertexShader: `uniform float time; uniform float size; attribute float kind; attribute float ph; varying float vK; varying float vA; varying float vR;
      void main(){ vec3 p = position; p.x += sin(time*0.25+ph)*0.8; p.y += sin(time*0.4+ph*1.3)*0.5; p.z += cos(time*0.2+ph)*0.8;
        if (kind > 0.5) { p += vec3(sin(time*1.7+ph), sin(time*2.3+ph*2.0), cos(time*1.9+ph))*0.25; }
        vK = kind; vR = ph;
        vec4 mv = modelViewMatrix*vec4(p,1.); gl_PointSize = size * (kind > 0.5 ? 1.3 : 1.0) * 600.0 / -mv.z;
        vA = clamp(1.0 - (-mv.z)/45.0, 0.0, 1.0); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float showA; uniform float showB; uniform float time; varying float vK; varying float vA; varying float vR;
      void main(){ vec2 q = gl_PointCoord - 0.5; float a = 0.0; vec3 c;
        if (vK < 0.5) { // けい藻のような輪
          float r = length(q); float ring = smoothstep(0.42,0.38,r)*smoothstep(0.28,0.32,r);
          float ang = atan(q.y,q.x); float spokes = smoothstep(0.85,1.0,abs(sin(ang*6.0+vR)))*smoothstep(0.3,0.1,r)*smoothstep(0.02,0.08,r);
          a = max(ring, max(spokes*0.7, smoothstep(0.32,0.2,r)*0.25)); c = vec3(0.45,1.0,0.55); a *= showA;
        } else { // 動物プランクトン（からだ＋触角）
          float ca = cos(vR), sa = sin(vR); q = vec2(ca*q.x - sa*q.y, sa*q.x + ca*q.y);
          float body = smoothstep(1.0,0.8,length(vec2(q.x/0.13,(q.y+0.05)/0.26)));
          float tail = smoothstep(1.0,0.7,length(vec2(q.x/0.04,(q.y+0.33)/0.12)));
          float ant = smoothstep(0.03,0.0,abs(q.y - 0.22 + 0.6*q.x*q.x)) * step(abs(q.x),0.45);
          float eye = smoothstep(0.05,0.03,length(q-vec2(0.0,0.14)));
          a = max(max(body,tail),ant*0.9); c = mix(vec3(1.0,0.62,0.25), vec3(0.15,0.05,0.0), eye); a *= showB;
        }
        if (a < 0.02) discard; gl_FragColor = vec4(c, a*vA*0.95); }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  return pts;
})();
world.add(macro);
extras.push(macro);

// 水しぶき（ナブラ）
const splash = (() => {
  const n = 2600, pos = new Float32Array(n * 3), ph = new Float32Array(n), vel = new Float32Array(n * 3);
  const r = rng(88);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, rad = Math.sqrt(r()) * 5;
    pos[i * 3] = Math.cos(a) * rad; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = Math.sin(a) * rad;
    const sp = 0.6 + r() * 1.6;
    vel[i * 3] = (r() - 0.5) * 1.6; vel[i * 3 + 1] = 3 + r() * 5 * sp; vel[i * 3 + 2] = (r() - 0.5) * 1.6;
    ph[i] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("vel", new THREE.BufferAttribute(vel, 3));
  g.setAttribute("ph", new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { ...U, power: { value: 1 } }, transparent: true, depthWrite: false,
    vertexShader: `uniform float time; uniform float power; attribute vec3 vel; attribute float ph; varying float vA;
      void main(){ float per = 0.9 + ph*0.6; float u = fract(time/per + ph*7.0); float tt = u*per;
        // 塊ごとに「はねる」時間がずれる
        float burst = step(0.35, fract(sin(floor(time/per + ph*7.0)*12.9898 + ph*78.0)*43758.5));
        vec3 p = position + vec3(vel.x*tt, vel.y*tt*power - 4.9*tt*tt, vel.z*tt);
        vA = burst * step(0.0, p.y) * (1.0 - u);
        vec4 mv = modelViewMatrix*vec4(p,1.); gl_PointSize = (0.22 + ph*0.3) * 600.0 / -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.15,d)*vA; if (a < 0.02) discard; gl_FragColor = vec4(vec3(1.0), a*0.9); }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  return pts;
})();
world.add(splash);
extras.push(splash);
// 海面の白い泡（ナブラの下）
const boil = new THREE.Mesh(
  new THREE.CircleGeometry(6, 48).rotateX(-Math.PI / 2),
  new THREE.ShaderMaterial({
    uniforms: { ...U }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float time; varying vec2 vP; float h(vec2 p){ return fract(sin(dot(p,vec2(12.9,78.2)))*43758.5); }
      void main(){ float r = length(vP)/6.0; float n = h(floor(vP*3.0 + vec2(time*2.0, -time*1.3)));
        float a = smoothstep(1.0,0.2,r) * (0.35 + 0.65*smoothstep(0.4,0.8,n)) * 0.85; gl_FragColor = vec4(vec3(1.0), a); }`,
  }),
);
world.add(boil);
extras.push(boil);

// 海鳥（鳥山）
const birds = new THREE.Group();
{
  const r = rng(99);
  const wingG = new THREE.BufferGeometry();
  wingG.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, -0.18, 0, 0, 0.22, 0.95, 0, 0.02]), 3));
  wingG.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({ color: 0x2a2f36, side: THREE.DoubleSide });
  const bodyG = new THREE.CylinderGeometry(0.06, 0.1, 0.6, 6).rotateX(Math.PI / 2);
  for (let i = 0; i < 26; i++) {
    const b = new THREE.Group();
    const L = new THREE.Mesh(wingG, mat), R = new THREE.Mesh(wingG, mat);
    R.scale.x = -1;
    b.add(L, R, new THREE.Mesh(bodyG, mat));
    b.userData = { L, R, rad: 3 + r() * 9, h: 5 + r() * 8, sp: (0.35 + r() * 0.5) * (r() < 0.5 ? 1 : -1), ph: r() * 6.28, f: 5 + r() * 3, dive: r() };
    b.scale.setScalar(0.75 + r() * 0.35);
    birds.add(b);
  }
}
world.add(birds);
extras.push(birds);
function updateBirds(T, c) {
  birds.visible = true;
  birds.children.forEach((b) => {
    const u = b.userData;
    const a = T * u.sp + u.ph;
    // ときどき海面に向かって急降下する鳥
    const dv = Math.max(0, Math.sin(T * 0.6 + u.dive * 20)) ** 8;
    b.position.set(c.x + Math.cos(a) * u.rad, u.h * (1 - 0.8 * dv) + Math.sin(T + u.ph) * 0.4, c.z + Math.sin(a) * u.rad);
    b.rotation.set(dv * 0.9, -a - (u.sp > 0 ? 0 : Math.PI), Math.sin(T * 0.8 + u.ph) * 0.25);
    const fl = Math.sin(T * u.f + u.ph) * 0.7 * (1 - dv);
    u.L.rotation.z = fl;
    u.R.rotation.z = -fl;
  });
}

// ベイトボール：小魚が球になって回る。捕食者の近くは穴があく
const ballFish = school("イワシ", 220, 0.55, 61, { freq: 18, amp: 0.06 });
world.add(ballFish);
extras.push(ballFish);
const _e = new THREE.Euler();
function updateBall(T, c, R, tight, preds = [], speed = 1) {
  ballFish.visible = true;
  const { off } = ballFish.userData;
  const tmp = new THREE.Vector3();
  for (let i = 0; i < off.length; i++) {
    const o = off[i];
    const lat = (o.y * 0.5) * Math.PI * 0.9; // 緯度
    const ang = T * speed * (0.7 + o.w * 0.3) + o.p * 3;
    const rr = R * (0.45 + 0.55 * Math.abs(o.x)) * lerp(2.2, 1, tight);
    tmp.set(Math.cos(ang) * Math.cos(lat) * rr, Math.sin(lat) * rr * lerp(0.5, 0.85, tight), Math.sin(ang) * Math.cos(lat) * rr);
    if (tight < 1) tmp.x += (o.z * 6) * (1 - tight); // ばらけた群れ
    tmp.add(c);
    for (const p of preds) {
      const dx = tmp.x - p.x, dy = tmp.y - p.y, dz = tmp.z - p.z;
      const dd = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dd < 3.2 && dd > 0.01) {
        const k = (3.2 - dd) / dd * 0.9;
        tmp.x += dx * k; tmp.y += dy * k; tmp.z += dz * k;
      }
    }
    _q.setFromEuler(_e.set(0, -ang - Math.PI / 2, Math.sin(T * 3 + o.p) * 0.1));
    _s.setScalar(o.s);
    _m.compose(tmp, _q, _s);
    ballFish.setMatrixAt(i, _m);
  }
  ballFish.instanceMatrix.needsUpdate = true;
}
// 突っ込む青物（サゴシ・ハマチ）：ボールの中を直線で通り抜ける
const raiders = school("サゴシ", 7, 2.4, 62, { freq: 12 });
const raiders2 = school("ハマチ", 5, 2.8, 63, { freq: 10 });
world.add(raiders, raiders2);
extras.push(raiders, raiders2);
function updateRaiders(mesh, T, c, period, spread, seed) {
  mesh.visible = true;
  const { off } = mesh.userData;
  const out = [];
  for (let i = 0; i < off.length; i++) {
    const o = off[i];
    const u = ((T / period + i / off.length + seed) % 1 + 1) % 1;
    const a = o.p * 2 + Math.floor(T / period + i / off.length + seed) * 2.1; // 毎回ちがう向きから
    const dir = V(Math.cos(a), (o.y) * 0.25, Math.sin(a)).normalize();
    const along = lerp(-16, 16, u);
    const p = V(c.x + dir.x * along + o.z * spread, Math.min(-0.7, c.y + dir.y * along + o.x * 0.4), c.z + dir.z * along + o.x * spread);
    out.push(p);
    _q.setFromEuler(_e.set(0, -Math.atan2(dir.z, dir.x), 0));
    _s.setScalar(o.s);
    _m.compose(p, _q, _s);
    mesh.setMatrixAt(i, _m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return out;
}

const NC = V(8, -1.6, 40); // ナブラの場所（沖）
function arrowCard(items, t, opts = {}) {
  // 横に並ぶ食物連鎖の図
  const n = items.length, w = 270, gap = 30;
  const x0 = (W - (n * w + (n - 1) * gap)) / 2, y = opts.y ?? 300;
  items.forEach(([name, sub, col], i) => {
    const a = clamp01((t - (opts.t0 ?? 0.3) - i * (opts.step ?? 0.45)) / 0.35);
    const x = x0 + i * (w + gap);
    html += `<div class="card" style="left:${x}px;top:${y}px;width:${w - 30}px;padding:22px 15px;text-align:center;opacity:${a};transform:translateY(${(1 - a) * 30}px)">
      <div style="height:12px;border-radius:6px;background:${col};margin-bottom:14px"></div><div style="font-size:${name.length > 6 ? 28 : 44}px;font-weight:900;line-height:1.2">${name}</div><div style="font-size:26px;color:#3a5a78;margin-top:8px">${sub}</div></div>`;
    if (i < n - 1) html += `<div style="position:absolute;left:${x + w - 6}px;top:${y + 70}px;color:#ffd166;font-size:52px;font-weight:900;opacity:${clamp01((t - (opts.t0 ?? 0.3) - (i + 1) * (opts.step ?? 0.45)) / 0.35)};text-shadow:0 2px 8px rgba(0,0,0,.6)">▶</div>`;
  });
}

Object.assign(SHOTS, {
  short_end(t, d, s) {
    base(0);
    if (typeof FK !== "undefined" && FK.ok) {
      ftBase();
      ftBoat.visible = false;
      const c = FTp(0, -18, FT_LZ);
      look(c.clone().add(V(0, 0.4, 6)), c.clone().add(V(0, 0.1, 0)), 55);
      endFish(t, c);
      ftFlush();
    } else {
      const c = V(NC.x, -3.6, NC.z);
      updateBall(t, c, 2.4, 1, [], 1);
      updateRaiders(raiders, t * 0.35, c, 6, 2, 0);
      const ang = t * 0.1;
      look(V(c.x + Math.sin(ang) * 15, -3.8, c.z + Math.cos(ang) * 15), c, 55);
    }
    const a = clamp01(t / 0.5);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,${0.45 * a})"></div>`;
    html += `<div class="big" style="top:520px;opacity:${a}"><div style="font-size:70px">くわしくは</div><div style="font-size:104px;color:#ffd166">フル版で公開中</div><div style="font-size:46px;margin-top:24px">${s.full || ""}</div><div style="margin-top:60px;font-size:92px">ツレドキ<span style="font-size:44px;border:4px solid #fff;border-radius:12px;padding:0 10px;margin-left:10px;vertical-align:16px">関西</span></div></div>`;
    isoBar(s);
  },
  fc_thumb(t, d, s) {
    base(0);
    const c = V(NC.x, -3.4, NC.z);
    const preds = [...updateRaiders(raiders, 1.1, c, 2.4, 0.6, 0.1), ...updateRaiders(raiders2, 1.9, c, 3, 0.8, 0.55)];
    updateBall(1.1, c, 2.3, 1, preds, 1.3);
    look(V(c.x - 1, -4.6, c.z + 9), V(c.x - 5.5, -3.2, c.z), 55);
    html += `<div style="position:absolute;left:70px;top:230px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px">${s.tag || "3D再現"}</span><div style="font-size:140px;line-height:1.12;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
  },
  fc_hook(t, d, s) {
    base(0);
    sky.visible = true;
    const T = t;
    show(boil); boil.position.set(NC.x, 0.06, NC.z);
    show(splash); splash.position.set(NC.x, 0.05, NC.z); splash.material.uniforms.power.value = 1;
    updateBirds(T, NC);
    const dive = ease((t - d * 0.5) / (d * 0.16));
    const k = ease(t / d);
    const pos = V(lerp(NC.x - 22, NC.x - 14, k), lerp(2.2, -2.2, dive) + Math.sin(t * 1.4) * 0.15 * (1 - dive), lerp(NC.z + 26, NC.z + 13, k));
    look(pos, V(NC.x, lerp(1.2, -1.6, dive), NC.z), lerp(42, 58, dive));
    U.under.value = pos.y < 0 ? 1 : 0;
    const preds = [...updateRaiders(raiders, T * 0.8, NC, 2.6, 0.8, 0), ...updateRaiders(raiders2, T * 0.8, NC, 3.4, 1, 0.4)];
    updateBall(T, NC, 2.3, 1, preds, 1.4);
    const flash = Math.max(0, 1 - Math.abs(t - d * 0.58) / 0.3);
    if (flash > 0) html += `<div class="flash" style="opacity:${flash * 0.85}"></div>`;
    const a = clamp01(t / 0.6) * clamp01((d * 0.5 - t) / 0.4);
    html += `<div class="big" style="top:150px;font-size:92px;opacity:${a}">海面がわき立つ…<br><span style="color:#ffd166">この下で何が起きている？</span></div>`;
    const b = clamp01((t - d * 0.68) / 0.5);
    html += `<div class="big" style="top:110px;font-size:58px;opacity:${b}">プランクトンから青物まで<br>海の中の「食べる・食べられる」を3Dで</div>`;
  },
  fc_title(t, d) {
    base(0);
    const c = V(NC.x, -3.5, NC.z);
    const ang = t * 0.12;
    look(V(c.x + Math.sin(ang) * 16, -3.8, c.z + Math.cos(ang) * 16), c, 55);
    updateBall(t, c, 2.4, 1, [], 1);
    updateRaiders(raiders, t * 0.35, c, 6, 2, 0);
    const a = clamp01(t / 0.7);
    html += `<div class="big" style="top:290px;opacity:${a}"><span class="tag">ツレドキ3D</span><div style="font-size:124px;margin-top:26px;transform:translateY(${(1 - a) * 30}px)">海の中の食物連鎖</div><div style="font-size:60px;color:#ffd166">プランクトン → イワシ → 青物 → ナブラ</div></div>`;
  },
  fc_plankton(t, d, s, k) {
    base(0);
    show(macro);
    macro.position.set(NC.x - 6, -3, NC.z - 4);
    macro.material.uniforms.showA.value = k >= 1 ? 1 : 0.15;
    macro.material.uniforms.showB.value = k >= 2 ? clamp01(1) : 0;
    const up = k === 0 ? 1 - ease((t - 0) / 3) * 0 : 0;
    const lookT = k === 0 ? V(NC.x - 6, 6, NC.z - 10) : V(NC.x - 6, -3, NC.z - 4);
    const drift = ease(t / d);
    const camP = k === 0 ? V(NC.x - 6, -6, NC.z + 6) : V(NC.x - 6 + drift * 3, -3, NC.z + 2.5 - drift * 2);
    look(camP, lookT, k === 0 ? 70 : 50);
    if (k === 0) label(V(NC.x - 6, 0, NC.z - 10), "太陽の光", "海の中に差しこむ", 1, "gold", 0, 160);
    if (k >= 1) html += `<div class="lab" style="left:${k >= 2 ? 560 : 960}px;top:220px;border-color:#6dff8a">植物プランクトン<small>光で育つ（光合成）</small></div>`;
    if (k >= 2) html += `<div class="lab gold" style="left:1360px;top:220px">動物プランクトン<small>植物プランクトンを食べる</small></div>`;
    void up;
  },
  fc_iwashi(t, d, s, k) {
    base(0);
    show(macro, sardines);
    macro.position.set(NC.x - 6, -3, NC.z - 4);
    macro.material.uniforms.showA.value = 0.8;
    macro.material.uniforms.showB.value = 1;
    const c = V(NC.x - 16 + t * 1.6, -3, NC.z - 4);
    updateSchool(sardines, t, c, V(4, 1, 2.5), 1);
    look(V(c.x + 4, -2.6, c.z + 9), V(c.x + 1, -3, c.z), 52);
    label(V(c.x, -1.8, c.z), "イワシの群れ", "プランクトンを食べる", 1, "", 0, -90);
    if (k >= 1) label(V(c.x + 4, -3, c.z), "口を開けて泳ぐ", "水といっしょにこし取る", 1, "gold", 220, -40);
    if (k >= 2) html += `<div class="card" style="left:120px;top:170px;width:560px"><b style="font-size:40px">群れで泳ぐ理由</b><div style="font-size:30px;margin-top:8px">1匹だけより狙われにくい、と言われます</div></div>`;
  },
  fc_ball(t, d, s, k) {
    base(0);
    const c = V(NC.x, -4, NC.z);
    const tight = k >= 1 ? ease((t - (s._k1 ?? 0)) / 3 + 0.4) : 0.15;
    const appear = k >= 0 ? 1 : 0;
    const preds = updateRaiders(raiders, t * 0.3, c, 7, 3, 0.2);
    updateBall(t, c, 2.4, tight, [], 1.1);
    const ang = 0.6 + t * 0.06;
    look(V(c.x + Math.sin(ang) * 9.5, -3.4, c.z + Math.cos(ang) * 9.5), c, 55);
    label(preds[0], "サゴシ", "まわりをぐるぐる", appear, "gold", -80, -80);
    if (k >= 1) label(V(c.x, c.y + 2.6, c.z), "ベイトボール", "小魚がボールのように固まる", 1, "", 0, -100);
  },
  fc_attack(t, d, s, k) {
    base(0);
    const c = V(NC.x, -3.6, NC.z);
    const TT = t * 0.55; // スロー
    const preds = [...updateRaiders(raiders, TT, c, 2.4, 0.6, 0.1), ...updateRaiders(raiders2, TT, c, 3, 0.8, 0.55)];
    updateBall(TT, c, 2.3, 1, preds, 1.3);
    const shake = Math.sin(t * 23) * 0.05;
    const ang = -0.4 + t * 0.05;
    look(V(c.x + Math.sin(ang) * 9 + shake, -3.2 + shake, c.z + Math.cos(ang) * 9), c, 56);
    html += `<div class="slowtag" style="position:absolute;right:60px;top:120px;font-size:34px;font-weight:900;color:#fff;background:#e3412b;padding:6px 20px;border-radius:12px;opacity:${0.6 + 0.4 * Math.sin(t * 4)}">スロー再生</div>`;
    if (k >= 1) label(preds[0], "サゴシ・サワラ", "鋭い歯で一気に", 1, "gold", 120, -60);
    if (k >= 2) label(preds[7] || preds[1], "ハマチ（青物）", "群れで追いこむ", 1, "red", -140, 90);
  },
  fc_nabura(t, d, s, k) {
    base(0);
    const c = V(NC.x, -1.2, NC.z);
    const above = k >= 1;
    show(boil, splash);
    boil.position.set(NC.x, 0.06, NC.z);
    splash.position.set(NC.x, 0.05, NC.z);
    const preds = [...updateRaiders(raiders, t * 0.7, c, 2.4, 0.5, 0.1), ...updateRaiders(raiders2, t * 0.7, V(c.x, -2, c.z), 3, 0.8, 0.55)];
    updateBall(t, c, 2.0, 1, preds, 1.5);
    if (above) {
      sky.visible = true;
      U.under.value = 0;
      updateBirds(t, NC);
      const kk = ease((t - (s._k1 ?? 0)) / (d - (s._k1 ?? 0)));
      look(V(NC.x - 20 + kk * 4, 3 + kk * 2, NC.z + 22 - kk * 4), V(NC.x, 3 + kk * 2.5, NC.z), 46);
      label(V(NC.x, 0.4, NC.z), "ナブラ", "小魚が追われて海面がざわつく", 1, "gold", -260, 40);
      if (k >= 2) label(V(NC.x + 2, 10, NC.z), "鳥山", "海鳥が小魚を狙って集まる", 1, "", 240, -20);
    } else {
      look(V(c.x - 9, -4.8, c.z + 7), V(c.x, 0, c.z), 62);
      label(V(c.x, 0, c.z), "海面へ追いつめられる", "逃げ場がなくなる", 1, "red", 0, -40);
    }
  },
  fc_tips(t, d, s, k) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    show(boil, splash);
    boil.position.set(NC.x, 0.06, NC.z);
    splash.position.set(NC.x, 0.05, NC.z);
    updateBirds(t, NC);
    updateBall(t, V(NC.x, -1.2, NC.z), 2, 1, [], 1.5);
    look(V(-6, 4.6, 1.5), V(NC.x, 1.2, NC.z), 44);
    const tips = [["ナブラの「進む先」に投げる", "真ん中に直接投げると群れが散ることがある、と言われます"], ["鳥山は遠くても目印になる", "鳥が海面に突っこむ所の下に小魚がいます"], ["追いかけて危ない場所に入らない", "立入禁止の場所・テトラの上には行かない"]];
    tips.forEach(([h, sub], i) => {
      if (k < i) return;
      const a = clamp01((t - (s["_k" + i] ?? 0)) / 0.4);
      html += `<div class="card" style="left:110px;top:${150 + i * 175}px;width:900px;padding:20px 30px;opacity:${a};border-left:16px solid ${i === 2 ? "#e3412b" : "#f2b630"}"><b style="font-size:44px">${i + 1}. ${h}</b><div style="font-size:28px;color:#3a5a78;margin-top:6px">${sub}</div></div>`;
    });
  },
  fc_chain(t, d, s, k) {
    base(0);
    const c = V(NC.x, -3.6, NC.z);
    const ang = t * 0.05;
    updateBall(t, c, 2.4, 1, [], 1);
    look(V(c.x + Math.sin(ang) * 18, -3.6, c.z + Math.cos(ang) * 18), c, 55);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,${0.5 * clamp01(t / 0.6)})"></div>`;
    html += `<div class="big" style="top:150px;font-size:64px;opacity:${clamp01(t / 0.5)}">海の中の食物連鎖</div>`;
    arrowCard([["太陽", "光", "#ffd166"], ["植物プランクトン", "光で育つ", "#6dff8a"], ["動物プランクトン", "植物プランクトンを食べる", "#ffb066"], ["イワシ", "プランクトンを食べる", "#5fc3c9"], ["青物", "サゴシ・ハマチ", "#e3412b"], ["釣り人", "ナブラ・鳥山がサイン", "#9ab0ff"]], t, { y: 330, step: 0.5 });
  },
});


// =====================================================================
// 流れの見える化（cg-nagare）：潮目・ヨレ・反転流
// =====================================================================
// 突堤（岸から沖へ突き出た堤防）：x=-2〜2, z=-10〜30
const PIER = { x0: -2, x1: 2, z0: -10, z1: 30 };
const pier = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(PIER.x1 - PIER.x0, 16, PIER.z1 - PIER.z0), concrete);
  body.position.set(0, -5.5 + 0.3, (PIER.z0 + PIER.z1) / 2);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(PIER.x1 - PIER.x0 + 0.4, 0.6, PIER.z1 - PIER.z0 + 0.4), shadedMat(0xb8bec2, { rough: 0.1 }));
  deck.position.set(0, 2.8, (PIER.z0 + PIER.z1) / 2);
  pier.add(body, deck);
  // 先端の赤い灯台
  const lh = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 5, 16), shadedMat(0xd23a2a, { rough: 0.05 }));
  lh.position.set(0, 5.6, PIER.z1 - 1.5);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 16), shadedMat(0xf2f2f2, { rough: 0.05 }));
  cap.position.set(0, 8.3, PIER.z1 - 1.5);
  pier.add(lh, cap);
}
world.add(pier);
extras.push(pier);

// 流れの場（x,z → 速さ）。シーンごとに切り替える
let FIELD = () => [1, 0];
const EDDY = { x: 8.5, z: 17, r: 8 };
const FIELDS = {
  base: (dir) => (x, z) => [dir * 1.0, 0.08 * Math.sin(x * 0.05 + z * 0.1)],
  shiome: () => (x, z) => {
    const X = x - 0; // x=0 でぶつかる
    const s = 1 - Math.tanh(X / 3) ** 2;
    return [-Math.tanh(X / 3) * 1.2, 0.15 + 0.9 * s];
  },
  pier: (eddyK = 1) => (x, z) => {
    let vx = 1.1, vz = 0;
    const ax = Math.abs(x);
    if (z < PIER.z1 + 4) {
      const near = 1 - smooth01((ax - 2) / 9); // 突堤の近く
      const below = smooth01((PIER.z1 + 4 - z) / 10);
      if (x < 0) {
        // 上流側：突堤にぶつかって先端へ向かって曲がる（ヨレ）
        vx *= 1 - near * below * 0.85;
        vz += near * below * 1.0;
      } else {
        vx *= 1 - near * below * 0.9;
        vz -= near * below * 0.35;
      }
    }
    // 先端の外側は流れが速くなる
    const tip = Math.exp(-((x) ** 2 + (z - PIER.z1 - 2) ** 2) / 40);
    vx += tip * 0.6;
    // 下流側のうず（反転流）
    const dx = x - EDDY.x, dz = z - EDDY.z;
    const w = Math.exp(-(dx * dx + dz * dz) / (EDDY.r * EDDY.r)) * eddyK;
    const tx = dz / EDDY.r, tz = -dx / EDDY.r;
    vx = vx * (1 - w) + tx * 0.45 * w;
    vz = vz * (1 - w) + tz * 0.45 * w;
    return [vx, vz];
  },
};
function smooth01(x) { return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); }

const FLOW_N = 1700, TRAIL = 7;
const FLOW_SUB = 3; // 1区間を何個の粒で埋めるか
const flowLines = (() => {
  const n = FLOW_N * (TRAIL - 1) * FLOW_SUB;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("col", new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 col; varying vec4 vC; void main(){ vC = col; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = (0.25 + 0.45*col.a) * 900.0 / -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec4 vC; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.1,d)*vC.a; gl_FragColor = vec4(vC.rgb*a*0.6, 1.0); }`,
  });
  const l = new THREE.Points(g, m);
  l.frustumCulled = false;
  l.renderOrder = 20;
  return l;
})();
world.add(flowLines);
extras.push(flowLines);
const _fh = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// opts: { x0,x1,z0,z1: 粒の出る範囲, y, speed, color: "speed"|"side", alpha }
function updateFlow(T, opts) {
  flowLines.visible = true;
  const pos = flowLines.geometry.attributes.position.array, col = flowLines.geometry.attributes.col.array;
  const dt = 1 / 12, sp = opts.speed ?? 3.2, y = opts.y ?? 0.35;
  let o = 0, oc = 0;
  const px = new Float32Array(TRAIL), pz = new Float32Array(TRAIL);
  for (let i = 0; i < FLOW_N; i++) {
    const L = 4 + _fh(i) * 4, ph = _fh(i + 0.5) * L;
    const cyc = Math.floor((T + ph) / L), age = T + ph - cyc * L;
    let x = lerp(opts.x0, opts.x1, _fh(i * 7.1 + cyc * 3.3)), z = lerp(opts.z0, opts.z1, _fh(i * 3.7 + cyc * 5.9));
    // 川の水：一部の粒を川の中から出す
    const fromRiver = opts.river && _fh(i * 1.3 + 0.7) < (opts.river.share ?? 0.3);
    if (fromRiver) { x = opts.river.x + (_fh(i * 2.9 + cyc) - 0.5) * opts.river.w; z = lerp(-14, 0, _fh(i * 5.3 + cyc * 1.7)); }
    const side = opts.river ? (fromRiver ? 1 : 0) : x < 0 ? 0 : 1;
    const steps = Math.floor(age / dt);
    let dead = false;
    for (let k = 0; k < TRAIL; k++) { px[k] = x; pz[k] = z; }
    for (let s = 0; s < steps; s++) {
      const v = FIELD(x, z);
      x += v[0] * sp * dt; z += v[1] * sp * dt;
      if (x > PIER.x0 - 0.2 && x < PIER.x1 + 0.2 && z < PIER.z1 + 0.2 && z > PIER.z0 && opts.pier) { dead = true; break; }
      if (opts.solid && opts.solid(x, z)) { dead = true; break; }
      if (z < 0.5 && !(opts.river && Math.abs(x - opts.river.x) < opts.river.w / 2 + 0.5)) { dead = true; break; }
      for (let k = TRAIL - 1; k > 0; k--) { px[k] = px[k - 1]; pz[k] = pz[k - 1]; }
      px[0] = x; pz[0] = z;
    }
    const v = FIELD(x, z), spd = Math.hypot(v[0], v[1]);
    let fade = smooth01(age / 0.8) * smooth01((L - age) / 0.8) * (dead ? 0 : 1) * (opts.alpha ?? 1);
    // 説明中の場所だけはっきり、ほかは薄く
    if (opts.focus) fade *= lerp(opts.focus.dim ?? 0.25, 1, smooth01(1 - (Math.hypot(x - opts.focus.x, z - opts.focus.z) - opts.focus.r) / 6));
    let r, g, b;
    if (opts.color === "river") { [r, g, b] = side ? [0.95, 0.72, 0.35] : [0.3, 0.75, 1.0]; }
    else if (opts.color === "side") { [r, g, b] = side ? [0.45, 1.0, 0.6] : [0.3, 0.75, 1.0]; }
    else { const k = smooth01((spd - 0.3) / 0.6); r = lerp(1.0, 0.35, k); g = lerp(0.62, 0.9, k); b = lerp(0.2, 1.0, k); } // 遅い=オレンジ、速い=水色
    for (let k = 0; k < TRAIL - 1; k++) {
      for (let j = 0; j < FLOW_SUB; j++) {
        const f = j / FLOW_SUB;
        pos[o++] = lerp(px[k], px[k + 1], f); pos[o++] = y; pos[o++] = lerp(pz[k], pz[k + 1], f);
        col[oc++] = r; col[oc++] = g; col[oc++] = b; col[oc++] = fade * (1 - (k + f) / TRAIL);
      }
    }
  }
  flowLines.geometry.attributes.position.needsUpdate = true;
  flowLines.geometry.attributes.col.needsUpdate = true;
}
// 地図の上のピン（A/B/C）
function mapPin(p, txt, a, color = "#e3412b") {
  if (a <= 0) return;
  const q = project(p);
  html += `<div class="pin" style="left:${q.x}px;top:${q.y}px;opacity:${a};background:${color};transform:translate(-50%,-50%) scale(${0.6 + 0.4 * a})">${txt}</div>`;
}
const suzuki = school("スズキ", 4, 2.6, 71, { freq: 6 });
world.add(suzuki);
extras.push(suzuki);
const AERIAL = (t, d) => { const k = ease(t / d); return [V(lerp(-26, -18, k), lerp(46, 40, k), lerp(78, 70, k)), V(6, 0, 22)]; };

Object.assign(SHOTS, {
  nf_thumb(t, d, s) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    show(pier);
    FIELD = FIELDS.pier(1);
    updateFlow(30, { x0: -40, x1: 30, z0: 2, z1: 70, pier: true });
    look(V(22, 32, 56), V(2, 0, 20), 50);
    html += `<div style="position:absolute;left:0;top:0;bottom:0;width:1100px;background:linear-gradient(90deg,rgba(2,14,28,.75),rgba(2,14,28,0))"></div>`;
    html += `<div style="position:absolute;left:70px;top:230px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px">${s.tag}</span><div style="font-size:140px;line-height:1.12;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
  },
  nf_hook(t, d, s) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    show(pier);
    FIELD = FIELDS.pier(1);
    const [p, l] = AERIAL(t, d);
    look(V(p.x + 10, lerp(26, 40, ease(t / d)), p.z - 10), l, 50);
    const reveal = smooth01((t - d * 0.45) / 1.2);
    if (reveal > 0) updateFlow(t + 20, { x0: -40, x1: 30, z0: 2, z1: 70, pier: true, alpha: reveal });
    const a = clamp01(t / 0.6) * clamp01((d * 0.45 - t) / 0.4);
    html += `<div class="big" style="top:250px;font-size:84px;opacity:${a}">同じ海なのに<br><span style="color:#ffd166">釣れる場所と、釣れない場所</span></div>`;
    const b = clamp01((t - d * 0.55) / 0.5);
    html += `<div class="big" style="top:160px;font-size:70px;opacity:${b}">見えない「流れ」を<br>色で見える化</div>`;
  },
  nf_title(t, d) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    show(pier);
    FIELD = FIELDS.pier(1);
    updateFlow(t + 40, { x0: -40, x1: 30, z0: 2, z1: 70, pier: true });
    const ang = t * 0.05;
    look(V(Math.sin(ang) * 40 + 4, 34, 62 + Math.cos(ang) * 6), V(4, 0, 22), 50);
    const a = clamp01(t / 0.7);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,${0.35 * a})"></div>`;
    html += `<div class="big" style="top:290px;opacity:${a}"><span class="tag">ツレドキ3D</span><div style="font-size:116px;margin-top:26px">潮目・ヨレ・反転流</div><div style="font-size:60px;color:#ffd166">流れがわかると、釣れる場所がわかる</div></div>`;
  },
  nf_base(t, d, s, k) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    // 1行目までは東向き、2行目から向きが変わる
    const flip = k >= 1 ? smooth01((t - (s._k1 ?? 0)) / 2.5) : 0;
    FIELD = FIELDS.base(1 - 2 * flip);
    updateFlow(t, { x0: -45, x1: 45, z0: 20, z1: 80, color: "speed" });
    look(V(0, 38, 98), V(0, 0, 45), 48);
    const lab = flip < 0.5 ? "→ 満ち潮の流れ（例）" : "← 引き潮の流れ（例）";
    html += `<div class="lab gold" style="left:960px;top:330px;font-size:44px">${lab}</div>`;
    if (k >= 2) html += `<div class="card" style="left:560px;right:560px;top:150px;text-align:center;font-size:34px;font-weight:800">潮の満ち引きで、流れの向きと速さが変わる</div>`;
  },
  nf_shiome(t, d, s, k) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    FIELD = FIELDS.shiome();
    updateFlow(t, { x0: -40, x1: 40, z0: 30, z1: 90, color: "side" });
    foam.material.uniforms.show.value = k >= 1 ? 1 : 0;
    foam.position.set(0, 0.05, 70);
    look(V(-30, 30, 105), V(0, 0, 62), 48);
    label(V(-22, 0.4, 60), "流れA", "", k >= 0 ? 1 : 0, "", 0, -60);
    label(V(22, 0.4, 60), "流れB", "", k >= 0 ? 1 : 0, "", 0, -60);
    label(V(0, 0.4, 70), "潮目", "流れがぶつかる線", k >= 1 ? 1 : 0, "gold", 0, -160);
    if (k >= 2) html += `<div class="card" style="left:120px;top:160px;width:620px"><b style="font-size:40px">潮目に集まるもの</b><div style="font-size:30px;margin-top:8px">プランクトン・小魚・流れてきたエサ<br>→ それを追う大きな魚</div></div>`;
  },
  nf_yore(t, d, s, k) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    show(pier);
    FIELD = FIELDS.pier(0.0);
    updateFlow(t, { x0: -40, x1: 0, z0: 2, z1: 60, pier: true });
    look(V(-30, 30, 58), V(-4, 0, 22), 50);
    label(V(-14, 0.4, 14), "流れが突堤にぶつかる", "", k >= 0 ? 1 : 0, "", -60, -60);
    label(V(-3, 0.4, 28), "ヨレ", "流れが曲がる・弱まる", k >= 1 ? 1 : 0, "gold", -120, -120);
    label(V(1, 0.4, 34), "先端の外側", "流れが速い", k >= 2 ? 1 : 0, "", 180, -60);
  },
  nf_eddy(t, d, s, k) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    show(pier);
    FIELD = FIELDS.pier(1);
    updateFlow(t, { x0: -30, x1: 30, z0: 2, z1: 55, pier: true });
    look(V(24, 34, 56), V(8, 0, 18), 50);
    label(V(EDDY.x, 0.4, EDDY.z), "反転流", "うずを巻いて逆向きに流れる", k >= 0 ? 1 : 0, "gold", 120, -110);
    if (k >= 1) label(V(EDDY.x - 4, 0.4, EDDY.z + 6), "流れがゆるい（オレンジ）", "エサがたまりやすい", 1, "", -220, -40);
    if (k >= 2) html += `<div class="card" style="left:120px;top:160px;width:640px"><b style="font-size:40px">色の見方</b><div style="font-size:30px;margin-top:8px"><span style="color:#2a9fd0">■</span> 水色＝流れが速い<br><span style="color:#e08a2a">■</span> オレンジ＝流れがゆるい</div></div>`;
  },
  nf_under(t, d, s, k) {
    base(0);
    show(pier, suzuki, sardines);
    // うずの中に小魚が集まり、そのさかい目でスズキやチヌが待つ（流れに頭を向ける）
    const c = V(EDDY.x, -3, EDDY.z);
    updateSchool(sardines, t, c, V(3, 1.2, 3), 1, 0.5);
    updateSchool(suzuki, t * 0.3, V(EDDY.x - 6, -4.5, EDDY.z + 6), V(1.5, 0.6, 1.5), -1);
    look(path(V(EDDY.x + 10, -3.5, EDDY.z + 14), V(EDDY.x + 4, -4, EDDY.z + 12), ease(t / d)), V(EDDY.x - 3, -3.6, EDDY.z), 56);
    label(c, "小魚がたまる", "流れがゆるいうずの中", k >= 0 ? 1 : 0, "", 0, -110);
    label(V(EDDY.x - 6, -4.5, EDDY.z + 6), "スズキ（シーバス）", "流れのさかい目で待つ", k >= 1 ? 1 : 0, "gold", -160, -60);
    if (k >= 2) html += `<div class="card" style="left:120px;top:160px;width:640px"><b style="font-size:38px">魚は流れに頭を向ける</b><div style="font-size:30px;margin-top:8px">流れてくるエサを待つことが多い</div></div>`;
  },
  nf_quiz(t, d, s, k) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    show(pier);
    FIELD = FIELDS.pier(1);
    updateFlow(t + 10, { x0: -40, x1: 30, z0: 2, z1: 70, pier: true, alpha: 0.9 });
    look(V(-6, 44, 66), V(4, 0, 22), 50);
    const ans = k >= 2;
    const pins = [[V(-22, 0.4, 34), "A", "沖の流れの真ん中"], [V(5.5, 0.4, 24), "B", "先端のうらの反転流のさかい目"], [V(-14, 0.4, 6), "C", "岸ぎわ（流れのない場所）"]];
    pins.forEach(([p, n, txt], i) => {
      const a = clamp01((t - 0.3 - i * 0.4) / 0.3);
      mapPin(p, n, a, ans && n === "B" ? "#2aa84a" : ans ? "#777" : "#e3412b");
      if (k >= 1 || ans) label(p, txt, "", a * (ans && n !== "B" ? 0.45 : 1), ans && n === "B" ? "gold" : "", 0, -70);
    });
    html += `<div class="card" style="left:110px;top:150px;width:520px;opacity:${clamp01(t / 0.5)}"><b style="font-size:44px">${ans ? "答え：B" : "クイズ"}</b><div style="font-size:30px;margin-top:8px">${ans ? "流れのヨレ・反転流のさかい目は<br>魚がつきやすいと言われます" : "魚がつきやすいのは<br>A・B・C どこ？"}</div></div>`;
  },
  nf_find(t, d, s, k) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    show(pier);
    FIELD = FIELDS.shiome();
    foam.material.uniforms.show.value = 1;
    foam.position.set(8, 0.05, 70);
    look(V(0.8, 4.8, 29.7), V(22, 0, 78), 46); // 突堤の上から見た景色
    const tips = [["海面の泡やゴミが筋になる", "潮目の目印"], ["波の立ち方・色が変わる", "流れがぶつかる・曲がる所"], ["ルアーを巻く重さが変わる", "流れの強さが変わったサイン"]];
    tips.forEach(([h, sub], i) => {
      if (k < i) return;
      const a = clamp01((t - (s["_k" + i] ?? 0)) / 0.4);
      html += `<div class="card" style="left:110px;top:${150 + i * 175}px;width:860px;padding:20px 30px;opacity:${a};border-left:16px solid #f2b630"><b style="font-size:44px">${i + 1}. ${h}</b><div style="font-size:28px;color:#3a5a78;margin-top:6px">${sub}</div></div>`;
    });
  },
  nf_sum(t, d, s, k) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    show(pier);
    FIELD = FIELDS.pier(1);
    updateFlow(t + 30, { x0: -40, x1: 30, z0: 2, z1: 70, pier: true, alpha: 0.7 });
    const ang = t * 0.04;
    look(V(Math.sin(ang) * 36, 36, 64 + Math.cos(ang) * 6), V(4, 0, 22), 50);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,${0.45 * clamp01(t / 0.6)})"></div>`;
    html += `<div class="big" style="top:130px;font-size:64px;opacity:${clamp01(t / 0.5)}">流れのまとめ</div>`;
    const rows = [["潮目", "流れがぶつかる線。エサが集まる", "#5fc3c9"], ["ヨレ", "流れが曲がる・弱まる所", "#f2b630"], ["反転流", "うず。流れのさかい目に魚がつく", "#ff5a4a"]];
    rows.forEach(([a1, b1, col], i) => {
      const a = clamp01((t - 0.4 - i * 0.5) / 0.35);
      html += `<div class="card" style="left:360px;right:360px;top:${270 + i * 180}px;padding:22px 30px;opacity:${a};display:flex;align-items:center;gap:26px"><b style="background:${col};color:#06213a;font-size:42px;padding:10px 0;width:190px;text-align:center;border-radius:18px">${a1}</b><div style="font-size:40px;font-weight:900">${b1}</div></div>`;
    });
  },
});


// =====================================================================
// 堤防の危険（cg-kiken）：高波・転落・テトラ・夜・釣り針
// =====================================================================
// 人の形（顔のないマネキン）。vest=ライフジャケット
function mannequin(color = 0x8f9aa6, vest = true) {
  const g = new THREE.Group();
  const m = shadedMat(color, { rough: 0.05 });
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.85, 10), m); legL.position.set(-0.13, 0.43, 0);
  const legR = legL.clone(); legR.position.x = 0.13;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.75, 14), m); body.position.y = 1.22;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), m); head.position.y = 1.8;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), shadedMat(0x2c3e50)); cap.position.y = 1.83;
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.7, 8), m); armL.position.set(-0.32, 1.2, 0); armL.rotation.z = 0.15;
  const armR = armL.clone(); armR.position.x = 0.32; armR.rotation.z = -0.15;
  g.add(legL, legR, body, head, cap, armL, armR);
  if (vest) {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.27, 0.5, 14), shadedMat(0xff7a1a, { rough: 0.05 })); v.position.y = 1.3;
    g.add(v);
    g.userData.vest = v;
  }
  g.userData.armR = armR;
  return g;
}
const man = mannequin();
const man2 = mannequin(0x7d8a96, true);
world.add(man, man2);
extras.push(man, man2);
// 竿と糸
const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.035, 3, 6).translate(0, 1.5, 0), shadedMat(0x222222));
world.add(rod);
extras.push(rod);
const lineGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 24 }, () => V(0, 0, 0)));
const fishLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
fishLine.frustumCulled = false;
world.add(fishLine);
extras.push(fishLine);
// 海藻・コケのついたスロープ
const slope = new THREE.Mesh(
  new THREE.BoxGeometry(12, 0.5, 14),
  new THREE.ShaderMaterial({
    uniforms: { ...U },
    vertexShader: `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float time; ${FOG_GLSL} varying vec3 vW; varying vec3 vN; float h(vec2 p){ return fract(sin(dot(p,vec2(12.9,78.2)))*43758.5); }
      void main(){ float wet = smoothstep(1.6, -0.2, vW.y); vec3 c = mix(vec3(0.62,0.64,0.62), mix(vec3(0.12,0.32,0.1), vec3(0.3,0.5,0.15), h(floor(vW.xz*4.))), wet);
        float diff = clamp(dot(vN, normalize(vec3(0.3,1.,0.4))),0.,1.); c *= 0.4 + 0.7*diff;
        vec3 V = normalize(cameraPosition - vW); vec3 R = reflect(-normalize(vec3(-0.6,0.5,0.8)), vN); c += vec3(1.)*pow(max(dot(R,V),0.),40.)*0.6*wet;
        gl_FragColor = vec4(underwater(c, vW, distance(cameraPosition,vW)), 1.); }`,
  }),
);
slope.position.set(-45, -1.6, 4);
slope.rotation.x = 0.42;
world.add(slope);
extras.push(slope);
// ヘッドライトの光
const headCone = new THREE.Mesh(
  new THREE.ConeGeometry(1.4, 5, 32, 1, true).translate(0, -2.5, 0),
  new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
);
world.add(headCone);
extras.push(headCone);
// 投げた仕掛けの軌跡
function placeMan(m, x, z, yaw = 0) { m.visible = true; m.position.set(x, 3.1, z); m.rotation.set(0, yaw, 0); }
function warnRing(p, a, txt) {
  if (a <= 0) return;
  const q = project(p);
  html += `<div style="position:absolute;left:${q.x}px;top:${q.y}px;width:180px;height:180px;transform:translate(-50%,-50%) scale(${0.8 + 0.2 * Math.sin(U.time.value * 6)});border:10px solid #e3412b;border-radius:50%;opacity:${a}"></div>`;
  if (txt) html += `<div class="lab red" style="left:${q.x}px;top:${q.y - 110}px;opacity:${a}">${txt}</div>`;
}
function dangerCard(title, body, a, top = 150) {
  html += `<div class="card" style="left:110px;top:${top}px;width:760px;opacity:${a};border-left:18px solid #e3412b"><b style="font-size:46px;color:#c62828">⚠ ${title}</b><div style="font-size:31px;margin-top:8px;line-height:1.45">${body}</div></div>`;
}
function okCard(title, body, a, top = 150) {
  html += `<div class="card" style="left:110px;top:${top}px;width:760px;opacity:${a};border-left:18px solid #2aa84a"><b style="font-size:46px;color:#1e7a36">◯ ${title}</b><div style="font-size:31px;margin-top:8px;line-height:1.45">${body}</div></div>`;
}

Object.assign(SHOTS, {
  kk_thumb(t, d, s) {
    base(0.15);
    sky.visible = true;
    U.under.value = 0;
    U.chop.value = 0.8;
    U.wave.value.set(4, 3.2, 5);
    placeMan(man, -3, -3, Math.PI);
    show(splash); splash.position.set(-2, 2.6, 1); splash.material.uniforms.power.value = 1.6;
    look(V(14, 5, 22), V(-3, 2.5, 0), 55);
    html += `<div style="position:absolute;left:0;top:0;bottom:0;width:1100px;background:linear-gradient(90deg,rgba(40,4,4,.7),rgba(0,0,0,0))"></div>`;
    html += `<div style="position:absolute;left:70px;top:230px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px">${s.tag}</span><div style="font-size:140px;line-height:1.12;margin-top:30px;-webkit-text-stroke:3px #3a0606">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
  },
  kk_hook(t, d, s) {
    base(0.25);
    sky.visible = true;
    U.under.value = 0;
    U.chop.value = 0.6;
    // 大きな波が堤防に近づき、上をこえる
    const wz = lerp(60, -2, smooth01((t - 1) / (d * 0.55)));
    const amp = lerp(1.2, 3.4, smooth01((t - 1) / (d * 0.55)));
    U.wave.value.set(wz, amp, 4.5);
    placeMan(man, -3, -6, Math.PI);
    const hit = smooth01((t - d * 0.55) / 0.4) * (1 - smooth01((t - d * 0.9) / 0.5));
    if (hit > 0) { show(splash); splash.position.set(-3, 2.4, 1); splash.material.uniforms.power.value = 1.8 * hit + 0.3; }
    look(path(V(18, 4, 30), V(10, 5, 16), ease(t / d)), V(-3, 2, 2), 55);
    const a = clamp01(t / 0.6) * clamp01((d * 0.5 - t) / 0.4);
    html += `<div class="big" style="top:250px;font-size:88px;opacity:${a}">晴れていても、<br><span style="color:#ff8a7a">突然やってくる危険</span></div>`;
    const b = clamp01((t - d * 0.62) / 0.4);
    html += `<div class="big" style="top:200px;font-size:72px;opacity:${b}">冬の堤防の危険5つを<br>3DCGで再現</div>`;
  },
  kk_title(t, d) {
    base(0.2);
    sky.visible = true;
    U.under.value = 0;
    U.chop.value = 0.5;
    placeMan(man, -3, -6, Math.PI);
    const ang = t * 0.06;
    look(V(Math.sin(ang) * 30, 8, 30 + Math.cos(ang) * 4), V(0, 1.5, 0), 55);
    const a = clamp01(t / 0.7);
    html += `<div style="position:absolute;inset:0;background:rgba(30,4,4,${0.35 * a})"></div>`;
    html += `<div class="big" style="top:290px;opacity:${a}"><span class="tag">ツレドキ3D</span><div style="font-size:120px;margin-top:26px">冬の堤防 危険5つ</div><div style="font-size:60px;color:#ffd166">知っていれば、防げる事故がある</div></div>`;
  },
  kk_wave(t, d, s, k) {
    base(0.2);
    sky.visible = true;
    U.under.value = 0;
    U.chop.value = 0.7;
    const cyc = (t % 7) / 7;
    U.wave.value.set(lerp(55, -2, smooth01(cyc / 0.8)), lerp(1.4, 3.3, smooth01(cyc / 0.8)), 4.5);
    const hit = cyc > 0.78 ? Math.sin((cyc - 0.78) / 0.22 * Math.PI) : 0;
    if (hit > 0) { show(splash); splash.position.set(-1, 2.4, 1); splash.material.uniforms.power.value = 1.7 * hit + 0.2; }
    placeMan(man, k >= 2 ? -3 : 0, k >= 2 ? -8 : -0.8, Math.PI);
    look(V(-16, 6, 22), V(0, 2, 0), 55);
    if (k < 2) warnRing(V(0, 4, -0.8), k >= 1 ? 1 : 0, "海側のふちは波をかぶる");
    if (k >= 0 && k < 2) dangerCard("高波・うねり", "晴れていても、遠くの低気圧などの影響で<br>大きな波が来ることがある", 1);
    if (k >= 2) okCard("こうする", "波をかぶった跡（ぬれた所）には近づかない<br>天気・波の予報を見て、荒れる日は行かない", 1);
  },
  kk_fall(t, d, s, k) {
    base(0);
    sky.visible = k < 1;
    U.under.value = k >= 1 ? 1 : 0;
    U.chop.value = 0.3;
    show(slope);
    placeMan(man, -38, -2, Math.PI * 0.5);
    if (k === 0) {
      look(V(-30, 5, 16), V(-44, -0.5, 4), 52);
      warnRing(V(-45, -0.6, 3.2), 1, "海藻・コケでとても滑る");
      dangerCard("転落", "ぬれたコンクリートやスロープは<br>とても滑りやすい", 1);
    } else {
      // 水の中から見た堤防の高さ
      look(V(-20, -4.5, 22), V(-20, -3.5, 0), 62);
      html += `<div style="position:absolute;left:1500px;top:170px;width:14px;height:720px;background:linear-gradient(#5fc3c9,#0a3a5a);border-radius:7px"></div>`;
      html += `<div class="lab" style="left:1507px;top:170px;transform:translate(-50%,-110%)">海面</div><div class="lab red" style="left:1507px;top:890px;transform:translate(-50%,0)">底（数m〜10m以上）</div>`;
      if (k >= 1) dangerCard("足は着かない", "堤防の足元でも水深は深いことが多い<br>冬の海は冷たく、体が動きにくくなる", 1);
      if (k >= 2) okCard("こうする", "ライフジャケットを必ず着る<br>滑りにくい靴をはく・スロープに降りない", 1, 470);
    }
  },
  kk_tetra(t, d, s, k) {
    base(0);
    sky.visible = k < 1;
    U.under.value = k >= 1 ? 1 : 0;
    if (k === 0) {
      look(V(36, 7, 22), V(42, 0, 4), 55);
      warnRing(V(41, 1.5, 5), 1, "テトラの上");
      dangerCard("テトラポッド", "丸くて滑りやすく、<br>足を置ける場所が少ない", 1);
    } else {
      look(path(V(38, -2, 12), V(40, -6, 6), ease((t - (s._k1 ?? 0)) / 5)), V(42, -8, 2), 64);
      if (k >= 1) dangerCard("すき間は深くて暗い", "落ちると自力で上がるのが難しい<br>外から見つけてもらいにくい", 1);
      if (k >= 2) okCard("こうする", "テトラには乗らない<br>立入禁止の場所には絶対に入らない", 1, 470);
    }
  },
  kk_night(t, d, s, k) {
    base(0.92);
    sky.visible = true;
    U.under.value = 0;
    placeMan(man, -6, -1.2, Math.PI);
    const lit = k >= 2;
    if (lit) { show(headCone); headCone.position.set(-6, 4.9, -0.9); headCone.rotation.set(0.7, 0, 0); }
    look(V(-12, 6.5, 12), V(-6, 2.6, -1), 55);
    if (k < 2) warnRing(V(-6, 3.1, 0.2), k >= 1 ? 1 : 0, "ふちが見えない");
    if (k >= 0 && k < 2) dangerCard("夜の堤防", "足元のふち・段差・ロープが見えにくい<br>冬は日が暮れるのが早い", 1);
    if (lit) okCard("こうする", "ヘッドライトで足元を照らす<br>明るいうちに場所を下見しておく", 1);
  },
  kk_cast(t, d, s, k) {
    base(0.05);
    sky.visible = true;
    U.under.value = 0;
    placeMan(man, 0, -4, Math.PI);
    if (k >= 1) placeMan(man2, 1.2, -8.2, Math.PI);
    // 竿を後ろへふりかぶって、前へ投げる（4秒でくり返す）
    const c = (t % 4) / 4;
    const back = c < 0.45 ? smooth01(c / 0.45) : 1 - smooth01((c - 0.45) / 0.12);
    const ang = lerp(-0.4, 1.35, back); // 0=前、+ が後ろ
    const base3 = V(0.3, 4.3, -4);
    rod.visible = true;
    rod.position.copy(base3);
    rod.rotation.set(-ang, 0, 0);
    const tip = V(0.3, 4.3 + Math.cos(ang) * 3, -4 - Math.sin(ang) * 3);
    // 仕掛け：後ろでは竿先からぶら下がり、前へ投げると飛んでいく
    let lure;
    if (c < 0.57) lure = V(tip.x, tip.y - 1.2 + back * 0.4, tip.z - back * 1.6);
    else { const f = (c - 0.57) / 0.43; lure = V(tip.x, tip.y + Math.sin(f * Math.PI) * 4 - f * 3, tip.z + f * 26); }
    const pts = []; for (let i = 0; i < 24; i++) { const f = i / 23; pts.push(V(lerp(tip.x, lure.x, f), lerp(tip.y, lure.y, f) - Math.sin(f * Math.PI) * 0.6, lerp(tip.z, lure.z, f))); }
    fishLine.visible = true;
    fishLine.geometry.setFromPoints(pts);
    look(V(5.5, 5.4, -0.5), V(0.3, 4.6, -5.5), 55);
    if (k >= 1) warnRing(V(1.2, 4.5, -8.2), 1, "後ろに人がいたら…");
    if (k >= 0 && k < 2) dangerCard("釣り針", "投げる時、針が後ろの人や<br>自分に刺さることがある", 1);
    if (k >= 2) okCard("こうする", "投げる前に後ろと横を確認<br>帽子・サングラスで頭と目を守る", 1);
  },
  kk_vest(t, d, s, k) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    placeMan(man, 0, -4, Math.PI * 0.85);
    const ang = t * 0.25;
    look(V(Math.sin(ang) * 4, 4.8, -4 + Math.cos(ang) * 4), V(0, 4.2, -4), 45);
    label(V(0, 4.5, -4), "ライフジャケット", "", 1, "gold", 260, -60);
    okCard("ライフジャケット", "落ちても浮いていられる<br>渡船で沖堤防に渡る時は、桜マーク付き（国の安全基準に合ったもの）の着用を求められることが多い", 1);
  },
  kk_118(t, d, s, k) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    U.chop.value = 0.3;
    placeMan(man, -3, -3, Math.PI);
    const ang = t * 0.05;
    look(V(Math.sin(ang) * 26, 9, 26 + Math.cos(ang) * 4), V(0, 1.5, 0), 55);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,${0.45 * clamp01(t / 0.5)})"></div>`;
    html += `<div class="card" style="left:430px;right:430px;top:170px;text-align:center"><b style="font-size:50px">人が海に落ちたら</b>
      <div style="display:flex;gap:26px;justify-content:center;margin-top:24px">${[["1", "自分は飛びこまない"], ["2", "浮く物を投げる"], ["3", "118番に通報"]].map(([n, x], i) => `<div style="opacity:${k >= i ? 1 : 0.15};background:#f4f7fa;border-radius:20px;padding:20px 22px;width:280px"><div style="font-size:60px;font-weight:900;color:#e3412b">${n}</div><div style="font-size:36px;font-weight:900">${x}</div></div>`).join("")}</div>
      <div style="font-size:30px;margin-top:20px;color:#3a5a78">118番＝海の事件・事故の通報（海上保安庁）</div></div>`;
  },
  kk_sum(t, d, s, k) {
    base(0.1);
    sky.visible = true;
    U.under.value = 0;
    placeMan(man, -3, -6, Math.PI);
    const ang = t * 0.04;
    look(V(Math.sin(ang) * 30, 9, 30), V(0, 1.5, 0), 55);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,${0.5 * clamp01(t / 0.6)})"></div>`;
    html += `<div class="big" style="top:110px;font-size:64px;opacity:${clamp01(t / 0.5)}">冬の堤防 危険5つ</div>`;
    const rows = [["高波", "波をかぶった跡に近づかない"], ["転落", "ライフジャケット・滑りにくい靴"], ["テトラ", "乗らない・立入禁止に入らない"], ["夜", "ヘッドライト・明るいうちに下見"], ["釣り針", "投げる前に後ろを確認"]];
    rows.forEach(([a1, b1], i) => {
      const a = clamp01((t - 0.4 - i * 0.4) / 0.35);
      html += `<div class="card" style="left:380px;right:380px;top:${230 + i * 136}px;padding:16px 28px;opacity:${a};display:flex;align-items:center;gap:26px"><b style="background:#e3412b;color:#fff;font-size:38px;padding:8px 0;width:170px;text-align:center;border-radius:16px">${a1}</b><div style="font-size:38px;font-weight:900">${b1}</div></div>`;
    });
  },
});


// =====================================================================
// ルアーの動き（cg-lure）：メタルジグ・ワーム・ブレード
// =====================================================================
// 金属っぽい光り方（空の明るさを映す）＋背中の色
function metalMat(back, belly, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, back: { value: new THREE.Color(back) }, belly: { value: new THREE.Color(belly) }, holo: { value: opts.holo ?? 1 } },
    side: THREE.DoubleSide,
    vertexShader: `varying vec3 vW; varying vec3 vN; varying vec3 vL; void main(){ vL = position; vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 back; uniform vec3 belly; uniform float holo; uniform float time; ${FOG_GLSL} varying vec3 vW; varying vec3 vN; varying vec3 vL;
      void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); vec3 R = reflect(-V, N);
        vec3 env = mix(vec3(0.05,0.18,0.28), vec3(0.85,0.97,1.0), smoothstep(-0.3, 0.8, R.y));
        float stripe = 0.5 + 0.5*sin(vL.y*40.0 + vL.x*25.0);
        vec3 holoC = 0.5 + 0.5*cos(6.28*(vec3(0.0,0.33,0.67) + dot(R, vec3(1.0,0.6,0.3))*1.5));
        vec3 base = mix(belly, back, smoothstep(-0.02, 0.06, vL.x));
        vec3 c = base*0.35 + env*0.75 + holoC*0.25*holo*stripe*smoothstep(0.06,-0.02,vL.x);
        c += vec3(1.0)*pow(max(dot(R, normalize(vec3(0.0,1.0,0.2))),0.0), 30.0)*1.2;
        gl_FragColor = vec4(underwater(c, vW, distance(cameraPosition, vW)), 1.0); }`,
  });
}
// メタルジグ：長さ1.6、y方向が頭→尾。頭は+y
const jig = new THREE.Group();
{
  const prof = [];
  for (let i = 0; i <= 24; i++) {
    const f = i / 24; // 0=尾 1=頭
    const r = 0.04 + 0.2 * Math.sin(Math.PI * Math.pow(f, 0.8)) * (0.75 + 0.25 * f);
    prof.push(new THREE.Vector2(Math.max(0.005, r), (f - 0.5) * 1.6));
  }
  const g = new THREE.LatheGeometry(prof, 24);
  g.scale(1, 1, 0.42); // 平たく
  const body = new THREE.Mesh(g, metalMat(0x1a4fd0, 0xd8dde4));
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0x111111 }));
  eye.position.set(0.0, 0.6, 0.068);
  const eye2 = eye.clone(); eye2.position.z = -0.068;
  // アシストフック（頭側）
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 16, Math.PI * 1.3), shadedMat(0x777777, { rough: 0.05 }));
  hook.position.set(0.04, 0.9, 0); hook.rotation.z = -1.0;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 14), shadedMat(0x999999, { rough: 0.05 }));
  ring.position.set(0, 0.84, 0); ring.rotation.y = Math.PI / 2;
  jig.add(body, eye, eye2, hook, ring);
  jig.rotation.z = -Math.PI / 2; // 頭を +x に向ける
}
const jigPivot = new THREE.Group(); // 向きをまとめて回すための親
jigPivot.add(jig);
world.add(jigPivot);
extras.push(jigPivot);

// ジグヘッド＋ワーム（しっぽが揺れる）
const wormGrp = new THREE.Group();
const wormHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), shadedMat(0xd02a2a, { rough: 0.05 }));
const wormEye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffee55 }));
wormEye.position.set(0.08, 0.04, 0.1);
const wormMat = new THREE.ShaderMaterial({
  uniforms: { ...U },
  side: THREE.DoubleSide,
  vertexShader: `varying vec3 vW; varying vec3 vN; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `${FOG_GLSL} varying vec3 vW; varying vec3 vN; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p,vec2(12.9,78.2)))*43758.5); }
    void main(){ vec3 c = mix(vec3(0.75,0.95,0.25), vec3(0.95,0.9,0.75), 0.25); float diff = clamp(dot(normalize(vN), normalize(vec3(0.2,1.,0.3))),0.,1.);
      c *= 0.45 + 0.65*diff; c += vec3(1.0,0.9,0.5) * step(0.985, h(floor(vUv*vec2(120.,10.)))) * 0.8; // ラメ
      gl_FragColor = vec4(underwater(c, vW, distance(cameraPosition, vW)), 1.0); }`,
});
let wormMesh = new THREE.Mesh(new THREE.BufferGeometry(), wormMat);
wormGrp.add(wormHead, wormEye, wormMesh);
world.add(wormGrp);
extras.push(wormGrp);
function updateWorm(T, amp) {
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const f = i / 20;
    const x = -0.12 - f * 1.2;
    const wig = Math.sin(T * 9 - f * 6) * amp * Math.pow(f, 2.2);
    pts.push(V(x, wig * 0.6 + (f > 0.8 ? (f - 0.8) * 0.3 : 0), wig));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curve, 40, 0.05, 8, false);
  // 尾に向かって細く
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const seg = Math.floor(i / 9) / 40;
    const c = curve.getPointAt(Math.min(1, seg));
    const r = seg < 0.75 ? 1 - seg * 0.4 : 0.7 + (seg - 0.75) * 1.2; // 先はカーリーテールで少し太く
    p.setXYZ(i, c.x + (p.getX(i) - c.x) * r, c.y + (p.getY(i) - c.y) * r, c.z + (p.getZ(i) - c.z) * r * (seg > 0.75 ? 0.35 : 1));
  }
  g.computeVertexNormals();
  wormMesh.geometry.dispose();
  wormMesh.geometry = g;
}

// ブレード（スピンテール）：本体＋回るブレード
const bladeGrp = new THREE.Group();
const bladeBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.8, 6, 12).rotateZ(Math.PI / 2).scale(1, 1, 0.5), metalMat(0x2a2a2a, 0xc8ccd0, { holo: 0.6 }));
const bladeWire = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 4).rotateZ(Math.PI / 2), shadedMat(0xaaaaaa));
bladeWire.position.x = -0.75;
const bladeSpin = new THREE.Group();
bladeSpin.position.x = -1.15;
const bladeLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 10, 0, Math.PI * 2, 0, 0.6).scale(1, 0.35, 0.62), metalMat(0xffd166, 0xffd166, { holo: 0.2 }));
bladeLeaf.rotation.x = 0.5;
bladeLeaf.position.set(0, 0.12, 0);
bladeSpin.add(bladeLeaf);
bladeGrp.add(bladeBody, bladeWire, bladeSpin);
world.add(bladeGrp);
extras.push(bladeGrp);

// ルアーの動き（位置と姿勢）。x 方向に進む
const MOTIONS = {
  // しゃくって跳ねる→止めてヒラヒラ落ちる（1.8秒でくり返す）
  jerk(T) {
    const P = 1.8, n = Math.floor(T / P), c = (T % P) / P;
    const up = c < 0.16 ? smooth01(c / 0.16) : 1;
    const fall = c < 0.16 ? 0 : (c - 0.16) / 0.84;
    const y = n * 0.35 + up * 1.2 - fall * 1.05;
    const x = n * 1.1 + up * 0.9 + fall * 0.2;
    const pitch = c < 0.16 ? 0.9 : -0.25 + Math.sin(fall * 12) * 0.25; // 跳ねる時は頭が上
    const roll = c < 0.16 ? 0 : Math.sin(fall * 14) * 0.9; // ヒラヒラ
    return { p: V(x, y, Math.sin(n * 2.1) * 0.3), pitch, roll, phase: c < 0.16 ? "up" : "fall" };
  },
  tada(T) { return { p: V(T * 2.2, Math.sin(T * 1.3) * 0.05, 0), pitch: 0, roll: Math.sin(T * 14) * 0.3, phase: "swim" }; },
  fall(T) { return { p: V(T * 0.12, -T * 0.9, Math.sin(T * 2.2) * 0.25), pitch: -0.3 + Math.sin(T * 5) * 0.3, roll: Math.sin(T * 6) * 1.0, phase: "fall" }; },
  hop(T) {
    const P = 2.2, n = Math.floor(T / P), c = (T % P) / P;
    const y = c < 0.25 ? Math.sin(c / 0.25 * Math.PI / 2) * 0.7 : 0.7 * (1 - smooth01((c - 0.25) / 0.6));
    return { p: V(n * 0.9 + smooth01(c / 0.5) * 0.9, y, 0), pitch: c < 0.25 ? 0.5 : -0.15, roll: 0, phase: c < 0.25 ? "up" : "fall" };
  },
};
function seabedY(x, z) {
  return -9.5 - Math.max(0, z) * 0.05 + Math.sin(x * 0.21 + z * 0.13) * 0.35 + Math.sin(x * 0.07 - z * 0.19) * 0.6 + Math.sin(x * 0.9 + z * 1.3) * 0.06;
}
function placeLure(obj, m, origin, yawRight = true) {
  obj.visible = true;
  obj.position.copy(origin).add(m.p);
  obj.rotation.set(m.roll, yawRight ? 0 : Math.PI, m.pitch, "XYZ");
}
// 軌跡（過去2秒の通り道）
const lureTrail = (() => {
  const n = 80;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("a", new THREE.BufferAttribute(new Float32Array(n), 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float a; varying float vA; void main(){ vA = a; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = 0.12*900.0/-mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-0.5); gl_FragColor = vec4(vec3(1.0,0.85,0.4)*smoothstep(0.5,0.1,d)*vA, 1.0); }` });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
})();
world.add(lureTrail);
extras.push(lureTrail);
function updateTrail(fn, T, origin, span = 2.2) {
  lureTrail.visible = true;
  const pos = lureTrail.geometry.attributes.position.array, a = lureTrail.geometry.attributes.a.array;
  const n = a.length;
  for (let i = 0; i < n; i++) {
    const tt = Math.max(0, T - (i / n) * span);
    const m = fn(tt);
    pos[i * 3] = origin.x + m.p.x; pos[i * 3 + 1] = origin.y + m.p.y; pos[i * 3 + 2] = origin.z + m.p.z;
    a[i] = (1 - i / n) * 0.9;
  }
  lureTrail.geometry.attributes.position.needsUpdate = true;
  lureTrail.geometry.attributes.a.needsUpdate = true;
}
const chaser = school("サゴシ", 3, 2.4, 81, { freq: 10 });
world.add(chaser);
extras.push(chaser);
function chase(T, target, behind = 3, spread = 0.8) {
  chaser.visible = true;
  const { off } = chaser.userData;
  for (let i = 0; i < off.length; i++) {
    const o = off[i];
    const p = V(target.x - behind - i * 1.6 + Math.sin(T * 2 + i) * 0.3, target.y + o.y * spread * 0.5, target.z + o.z * spread);
    _q.setFromEuler(_e.set(0, 0, Math.sin(T * 3 + i) * 0.05));
    _s.setScalar(o.s);
    _m.compose(p, _q, _s);
    chaser.setMatrixAt(i, _m);
  }
  chaser.instanceMatrix.needsUpdate = true;
}
const LO = V(-20, -6, 20); // ルアーの見せ場（沖の中層）
function slowTag(t) { html += `<div class="slowtag" style="position:absolute;right:60px;top:120px;font-size:34px;font-weight:900;color:#fff;background:#e3412b;padding:6px 20px;border-radius:12px;opacity:${0.6 + 0.4 * Math.sin(t * 4)}">スロー再生</div>`; }

Object.assign(SHOTS, {
  lr_thumb(t, d, s) {
    base(0);
    const m = { p: V(0, 0, 0), pitch: 0.5, roll: 0.6 };
    placeLure(jigPivot, m, V(LO.x + 4, LO.y + 0.4, LO.z));
    jigPivot.scale.setScalar(1.6);
    chase(1, V(LO.x + 4, LO.y, LO.z), 2.4, 0.4);
    look(V(LO.x + 2.5, LO.y - 1.2, LO.z + 4.2), V(LO.x + 3.6, LO.y + 0.2, LO.z), 50);
    html += `<div style="position:absolute;left:70px;top:230px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px">${s.tag}</span><div style="font-size:140px;line-height:1.12;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
  },
  lr_hook(t, d, s) {
    base(0);
    jigPivot.scale.setScalar(1);
    // 下から見上げる：ヒラヒラ落ちてくるジグ
    const T = t * 0.6;
    const m = MOTIONS.fall(T);
    const o = V(LO.x, LO.y + 4.5, LO.z);
    placeLure(jigPivot, m, o);
    const lp = jigPivot.position.clone();
    look(V(lp.x + 1.2, lp.y - 3.4, lp.z + 2.2), lp, 58);
    if (t > d * 0.55) chase(t, V(lp.x + lerp(-6, 1, smooth01((t - d * 0.55) / (d * 0.4))) + 2, lp.y - 0.3, lp.z), 0, 0.3);
    slowTag(t);
    const a = clamp01(t / 0.6) * clamp01((d * 0.5 - t) / 0.4);
    html += `<div class="big" style="top:250px;font-size:92px;opacity:${a}">魚には、ルアーが<br><span style="color:#ffd166">こう見えている</span></div>`;
    const b = clamp01((t - d * 0.6) / 0.5);
    html += `<div class="big" style="top:180px;font-size:66px;opacity:${b}">ジグ・ワーム・ブレードの動きを<br>3Dスローで比べます</div>`;
  },
  lr_title(t, d) {
    base(0);
    jigPivot.scale.setScalar(1.3);
    placeLure(jigPivot, { p: V(0, 0, 0), pitch: 0.2, roll: t * 0.8 }, V(LO.x, LO.y, LO.z));
    look(V(LO.x + Math.sin(t * 0.3) * 4, LO.y + 0.5, LO.z + Math.cos(t * 0.3) * 4), LO, 50);
    const a = clamp01(t / 0.7);
    html += `<div class="big" style="top:250px;opacity:${a}"><span class="tag">ツレドキ3D</span><div style="font-size:112px;margin-top:26px">魚から見たルアーの動き</div><div style="font-size:60px;color:#ffd166">ジグ・ワーム・ブレード</div></div>`;
  },
  lr_parts(t, d, s, k) {
    base(0);
    jigPivot.scale.setScalar(1.5);
    placeLure(jigPivot, { p: V(0, 0, 0), pitch: 0.15, roll: Math.sin(t * 0.5) * 0.6 }, LO);
    const ang = t * 0.25;
    look(V(LO.x + Math.sin(ang) * 3.2, LO.y + 0.6, LO.z + Math.cos(ang) * 3.2), LO, 48);
    label(V(LO.x - 0.4, LO.y, LO.z), "メタルジグ", "金属のおもり（重くて遠くへ飛ぶ）", k >= 0 ? 1 : 0, "gold", 260, -150);
    label(V(LO.x + 1.35, LO.y + 0.1, LO.z), "アシストフック", "頭側についた針", k >= 1 ? 1 : 0, "", -120, -110);
    if (k >= 2) label(V(LO.x, LO.y - 0.25, LO.z), "光を反射して光る", "小魚のうろこのよう", 1, "", 120, 120);
  },
  lr_jerk(t, d, s, k) {
    base(0);
    jigPivot.scale.setScalar(1);
    const T = t * 0.55; // スロー
    const m = MOTIONS.jerk(T);
    const o = V(LO.x - 6, LO.y - 1, LO.z);
    placeLure(jigPivot, m, o);
    updateTrail(MOTIONS.jerk, T, o);
    const lp = jigPivot.position.clone();
    look(V(lp.x - 0.5, lp.y + 0.3, lp.z + 4.3), V(lp.x + 0.3, lp.y, lp.z), 52);
    slowTag(t);
    label(V(lp.x, lp.y + 0.4, lp.z), m.phase === "up" ? "しゃくると、上へ跳ねる" : "止めると、ヒラヒラ落ちる", m.phase === "up" ? "ジャーク" : "フォール", 1, m.phase === "up" ? "" : "gold", 0, -120);
    if (k >= 2) html += `<div class="card" style="left:110px;top:150px;width:640px"><b style="font-size:40px">弱った小魚のように見える</b><div style="font-size:30px;margin-top:8px">と言われます</div></div>`;
  },
  lr_tada(t, d, s, k) {
    base(0);
    jigPivot.scale.setScalar(1);
    const T = t * 0.8;
    const m = MOTIONS.tada(T);
    const o = V(LO.x - 14, LO.y, LO.z);
    placeLure(jigPivot, m, o);
    updateTrail(MOTIONS.tada, T, o, 1.2);
    const lp = jigPivot.position.clone();
    if (k >= 1) chase(t, lp, lerp(6, 2.6, smooth01((t - (s._k1 ?? 0)) / 3)), 0.4);
    look(V(lp.x - 2, lp.y + 0.6, lp.z + 6), V(lp.x - 1, lp.y, lp.z), 52);
    label(V(lp.x, lp.y + 0.3, lp.z), "タダ巻き", "一定の速さで巻くだけ", k >= 0 ? 1 : 0, "", 0, -120);
    if (k >= 1) label(V(lp.x - 3, lp.y, lp.z), "サゴシ・青物", "速い動きを追う", 1, "gold", -160, 100);
  },
  lr_below(t, d, s, k) {
    base(0);
    jigPivot.scale.setScalar(1);
    const T = t * 0.5;
    const m = MOTIONS.jerk(T + 0.4);
    const o = V(LO.x - 2, LO.y + 2, LO.z);
    placeLure(jigPivot, m, o);
    const lp = jigPivot.position.clone();
    look(V(lp.x - 0.6, lp.y - 4.5, lp.z + 0.8), V(lp.x, lp.y + 2, lp.z), 62);
    slowTag(t);
    label(lp, "下から見ると", "空の明るさを背に、影（シルエット）で見える", k >= 0 ? 1 : 0, "gold", 220, 120);
    if (k >= 1) html += `<div class="card" style="left:110px;top:150px;width:640px"><b style="font-size:40px">フォールでキラッと光る</b><div style="font-size:30px;margin-top:8px">向きが変わるたびに光が反射する</div></div>`;
  },
  lr_worm(t, d, s, k) {
    base(0);
    show(gashira, mebaru);
    const T = t * 0.6;
    const m = MOTIONS.hop(T);
    const o = V(-8, seabedY(-8, 9.5) + 0.2, 9.5);
    placeLure(wormGrp, m, o);
    updateWorm(t, k >= 1 ? 0.22 : 0.16);
    updateTrail(MOTIONS.hop, T, o, 2.5);
    const lp = wormGrp.position.clone();
    updateSchool(gashira, t * 0.2, V(lp.x + 2.5, -9.1, 5), V(2, 0.1, 1), -1);
    updateSchool(mebaru, t * 0.3, V(lp.x + 1.5, -7.2, 4.5), V(2, 0.6, 1), -1);
    look(V(lp.x - 0.8, lp.y + 0.5, lp.z + 4.2), V(lp.x + 0.2, lp.y, lp.z), 50);
    slowTag(t);
    label(V(lp.x, lp.y + 0.25, lp.z), "ジグヘッド＋ワーム", "底をちょんちょん、ふわっと", k >= 0 ? 1 : 0, "", 0, -130);
    if (k >= 1) label(V(lp.x - 1.1, lp.y, lp.z), "しっぽがゆれる", "ゆっくりでもよく動く", 1, "gold", -160, 90);
    if (k >= 2) label(V(lp.x + 2.5, -9.1, 5), "ガシラ・メバル", "底や物かげの魚", 1, "", 180, -60);
  },
  lr_blade(t, d, s, k) {
    base(0);
    const T = t * 0.6;
    const m = MOTIONS.tada(T);
    const o = V(LO.x - 10, LO.y + 0.5, LO.z);
    placeLure(bladeGrp, m, o);
    bladeGrp.rotation.x = 0;
    bladeSpin.rotation.x = t * 22; // 回転
    updateTrail(MOTIONS.tada, T, o, 1.2);
    const lp = bladeGrp.position.clone();
    if (k >= 2) chase(t, lp, lerp(6, 2.8, smooth01((t - (s._k2 ?? 0)) / 2.5)), 0.4);
    look(V(lp.x - 1.4, lp.y + 0.4, lp.z + 3.6), V(lp.x - 0.6, lp.y, lp.z), 50);
    slowTag(t);
    label(V(lp.x - 1.05, lp.y + 0.3, lp.z), "回るブレード", "キラキラ光る", k >= 0 ? 1 : 0, "gold", -120, -120);
    if (k >= 1) label(V(lp.x, lp.y, lp.z), "ブルブルふるえる", "水の振動で気づかせる", 1, "", 160, 110);
    if (k >= 2) label(V(lp.x - 3, lp.y, lp.z), "サゴシ・タチウオ", "よく使われる", 1, "", -150, 110);
  },
  lr_quiz(t, d, s, k) {
    base(0);
    jigPivot.scale.setScalar(1);
    const T = t * 0.5;
    const o = V(LO.x - 6, LO.y - 1, LO.z);
    const m = MOTIONS.jerk(T);
    placeLure(jigPivot, m, o);
    updateTrail(MOTIONS.jerk, T, o, 3);
    const lp = jigPivot.position.clone();
    look(V(lp.x - 0.5, lp.y + 0.3, lp.z + 7.5), V(lp.x, lp.y, lp.z), 55);
    const ans = k >= 2;
    const opts = [["1", "上に跳ねた瞬間"], ["2", "ヒラヒラ落ちるフォール中"], ["3", "まっすぐ巻いている時"]];
    html += `<div class="card" style="left:110px;top:150px;width:700px"><b style="font-size:44px">${ans ? "答え：2 フォール中" : "クイズ"}</b><div style="font-size:30px;margin-top:8px">${ans ? "ジグは、フォール中に食いつくことが<br>多いと言われます" : "ジグに魚が食いつきやすいのは？"}</div>${k >= 1 ? opts.map(([n, x]) => `<div class="opt" style="font-size:34px;padding:12px 22px;${ans && n !== "2" ? "opacity:.35" : ""}${ans && n === "2" ? ";background:#e6f7ea" : ""}"><i style="width:50px;height:50px;font-size:28px">${n}</i>${x}</div>`).join("") : ""}</div>`;
  },
  lr_sum(t, d, s, k) {
    base(0);
    jigPivot.scale.setScalar(1.2);
    placeLure(jigPivot, { p: V(0, 0, 0), pitch: 0.2, roll: t * 0.6 }, LO);
    look(V(LO.x + Math.sin(t * 0.2) * 5, LO.y + 0.5, LO.z + Math.cos(t * 0.2) * 5), LO, 50);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,${0.5 * clamp01(t / 0.6)})"></div>`;
    html += `<div class="big" style="top:130px;font-size:64px;opacity:${clamp01(t / 0.5)}">ルアーの動き まとめ</div>`;
    const rows = [["ジグ", "跳ねる→ヒラヒラ落ちる。青物・サゴシ", "#5fc3c9"], ["ワーム", "底でふわっと、しっぽがゆれる。根魚・メバル", "#9be15d"], ["ブレード", "回って光る・ふるえる。サゴシ・タチウオ", "#f2b630"]];
    rows.forEach(([a1, b1, col], i) => {
      const a = clamp01((t - 0.4 - i * 0.5) / 0.35);
      html += `<div class="card" style="left:300px;right:300px;top:${270 + i * 180}px;padding:22px 30px;opacity:${a};display:flex;align-items:center;gap:26px"><b style="background:${col};color:#06213a;font-size:42px;padding:10px 0;width:190px;text-align:center;border-radius:18px">${a1}</b><div style="font-size:38px;font-weight:900">${b1}</div></div>`;
    });
  },
});

// =====================================================================
// 冬の水温と魚の居場所（cg-suion）：海の断面模型（水温を色で）・水温の3Dグラフ
// =====================================================================
// 世界から離れた「スタジオ」（z=-500）に、海を輪切りにした模型を置く。左＝岸の浅場、右＝沖の深場
const DIO = V(0, 0, -500);
const D = (x, y, z) => V(DIO.x + x, DIO.y + y, DIO.z + z);
const DX0 = -22, DX1 = 22, DBOT = -15, DZ = 12;
// 大阪湾の海面水温（気象庁 沿岸域の海面水温情報、2021〜2025年の日平均を月ごとに平均。1月〜12月）
const SUION = [11.8, 10.3, 11.0, 14.2, 17.6, 21.9, 26.5, 28.0, 27.3, 23.9, 20.1, 15.8];
function dioY(x) {
  const wig = (0.22 * Math.sin(x * 1.3) + 0.12 * Math.sin(x * 3.1)) * smooth01((x + 16) / 4);
  return 1.2 - 2.4 * smooth01((x + 22) / 6) - 2.6 * smooth01((x + 14) / 10) - 9 * smooth01((x + 3) / 9) + wig;
}
const studio = new THREE.Group();
studio.position.copy(DIO);
world.add(studio);
extras.push(studio);
{
  const bd = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(vec3(0.01,0.035,0.08), vec3(0.05,0.17,0.28), smoothstep(-0.25,0.7,h)); gl_FragColor = vec4(c,1.); }`,
  }));
  const fl = new THREE.Mesh(new THREE.CircleGeometry(90, 64).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vL; void main(){ vec2 q = vL.xz/4.0; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); float line = 1.0 - min(min(g.x,g.y),1.0);
      float r = length(vL.xz)/90.0; float a = (0.55 + 0.45*line) * (1.0 - smoothstep(0.25,1.0,r)); gl_FragColor = vec4(mix(vec3(0.03,0.09,0.15), vec3(0.25,0.6,0.75), line*0.7), a); }`,
  }));
  fl.position.y = DBOT - 0.3;
  studio.add(bd, fl);
}
// 水温 → 色（冷たい＝青、温かい＝赤）
const TEMP_GLSL = `
uniform float season; uniform float sun; uniform float time; uniform float tadd; uniform float iso; uniform float nat;
float Tsum(vec2 p){ return 20.0 + 8.0*smoothstep(-8.5,-3.0,p.y); }
float Twin(vec2 p){ return 8.0 + 4.5*smoothstep(-16.0,4.0,p.x) + 0.5*smoothstep(-4.0,-12.0,p.y); }
float temp(vec2 p){ p.x += sin(p.y*1.1+time*0.45)*0.5; p.y += sin(p.x*0.6-time*0.35)*0.25;
  float T = season < 1.0 ? mix(Tsum(p), 23.0, season) : mix(23.0, Twin(p), season-1.0);
  T += sun*6.5*(1.0-smoothstep(-15.0,-1.0,p.x))*smoothstep(-5.0,-0.5,p.y);
  return T + tadd; }
vec3 pal(float k){ k = clamp(k,0.,1.);
  vec3 c0=vec3(0.07,0.18,0.78), c1=vec3(0.08,0.62,0.95), c2=vec3(0.3,0.86,0.55), c3=vec3(1.0,0.78,0.2), c4=vec3(0.95,0.26,0.14);
  if(k<0.25) return mix(c0,c1,k/0.25); if(k<0.5) return mix(c1,c2,(k-0.25)/0.25); if(k<0.75) return mix(c2,c3,(k-0.5)/0.25); return mix(c3,c4,(k-0.75)/0.25); }
vec3 tcol(float T){ vec3 c = pal((T-8.0)/20.0); float f = T/2.0; float w = fwidth(f); float line = 1.0 - smoothstep(0.0, w*1.6, abs(fract(f+0.5)-0.5)); c = mix(c, vec3(1.0), line*0.45); float l15 = 1.0 - smoothstep(0.18, 0.18 + fwidth(T)*1.5, abs(T-15.0)); return mix(c, vec3(1.0), l15*iso*0.92); }`;
function tempJS(x, y, season, sun = 0) {
  const ss = (a, b, v) => smooth01((v - a) / (b - a));
  const ts = 20 + 8 * ss(-8.5, -3, y), tw = 8.0 + 4.5 * ss(-16, 4, x) + 0.5 * ss(-4, -12, y);
  let T = season < 1 ? lerp(ts, 23, season) : lerp(23, tw, season - 1);
  return T + sun * 6.5 * (1 - ss(-15, -1, x)) * ss(-5, -0.5, y);
}
function tempColor(T) {
  const k = clamp01((T - 8) / 20), cs = [[18, 46, 199], [20, 158, 242], [77, 219, 140], [255, 199, 51], [242, 66, 36]];
  const i = Math.min(3, Math.floor(k * 4)), f = k * 4 - i;
  return `rgb(${cs[i].map((c, j) => Math.round(lerp(c, cs[i + 1][j], f))).join(",")})`;
}
const WU = { season: { value: 0 }, sun: { value: 0 }, time: U.time, tadd: { value: 0 }, iso: { value: 0 }, nat: { value: 0 } }; // tadd・iso・nat はアオリイカ（ao_*）用。ふだんは 0
const dio = new THREE.Group();
studio.add(dio);
{
  // 海底（砂と地層の断面）
  const sh = new THREE.Shape();
  sh.moveTo(DX0, DBOT);
  sh.lineTo(DX1, DBOT);
  for (let i = 120; i >= 0; i--) { const x = DX0 + (DX1 - DX0) * i / 120; sh.lineTo(x, dioY(x)); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: DZ, bevelEnabled: false, steps: 1, curveSegments: 1 });
  g.translate(0, 0, -DZ / 2);
  const ground = new THREE.Mesh(g, new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vL; varying vec3 vN; void main(){ vL = position; vN = normal; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vL; varying vec3 vN; float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
      void main(){ float n = hash(floor(vL*5.0));
        vec3 sand = vec3(0.86,0.77,0.58)*(0.86+0.14*n);
        vec3 soil = mix(vec3(0.33,0.24,0.16), vec3(0.52,0.41,0.28), 0.5+0.5*sin(vL.y*2.3 + sin(vL.x*0.45)*1.6)) * (0.86+0.14*n);
        vec3 c = vN.y > 0.3 ? sand : soil;
        float diff = clamp(dot(normalize(vN), normalize(vec3(0.3,1.0,0.55))),0.,1.);
        c *= 0.5 + 0.65*diff; gl_FragColor = vec4(c,1.); }`,
  }));
  dio.add(ground);
  // 浅場の岩
  const r = rng(301), mat = shadedMat(0x6d675e, { rough: 0.3 });
  for (let i = 0; i < 14; i++) {
    const x = -15 + r() * 9, z = -4.5 + r() * 9;
    const m = new THREE.Mesh(makeRock(0.5 + r() * 0.7, 300 + i), mat);
    m.position.set(x, dioY(x) + 0.15, z);
    m.rotation.set(r() * 3, r() * 3, r() * 3);
    dio.add(m);
  }
  // 海藻
  for (let i = 0; i < 16; i++) {
    const h = 0.8 + r() * 1.2, x = -17 + r() * 12;
    const wg = new THREE.PlaneGeometry(0.22, h, 1, 6); wg.translate(0, h / 2, 0);
    const w = new THREE.Mesh(wg, new THREE.ShaderMaterial({
      uniforms: { ...U, ph: { value: r() * 6 } }, side: THREE.DoubleSide,
      vertexShader: `uniform float time; uniform float ph; varying float vY; void main(){ vec3 p = position; vY = uv.y; p.x += sin(time*1.2+ph+p.y*1.5)*0.15*uv.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
      fragmentShader: `varying float vY; void main(){ gl_FragColor = vec4(mix(vec3(0.12,0.3,0.12), vec3(0.45,0.62,0.2), vY),1.); }`,
    }));
    w.position.set(x, dioY(x), -4.5 + r() * 9);
    w.rotation.y = r() * 3;
    dio.add(w);
  }
  // 水（断面を色で）：奥の壁は不透明、前と上はうっすら
  let xs = DX0;
  for (let x = DX0; x < DX1; x += 0.01) if (dioY(x) < 0) { xs = x; break; }
  const ws = new THREE.Shape();
  ws.moveTo(xs, 0);
  ws.lineTo(DX1, 0);
  for (let i = 0; i <= 120; i++) { const x = DX1 - (DX1 - xs) * i / 120; ws.lineTo(x, Math.min(-0.001, dioY(x))); }
  const wmat = (alpha, top) => new THREE.ShaderMaterial({
    uniforms: { ...WU, alpha: { value: alpha } }, transparent: alpha < 1, depthWrite: alpha >= 1, side: THREE.FrontSide,
    vertexShader: `varying vec3 vL; varying vec3 vN; void main(){ vL = position; vN = normal; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float alpha; ${TEMP_GLSL} varying vec3 vL; varying vec3 vN;
      void main(){ vec3 c = tcol(temp(vL.xy)); c = mix(c, mix(vec3(0.03,0.25,0.4), vec3(0.1,0.48,0.62), smoothstep(-6.0,0.0,vL.y)), nat); float a = alpha;
        if (vN.y > 0.5) { a = ${top}; c = mix(c, vec3(0.9,1.0,1.0), 0.18*pow(abs(sin(vL.x*1.3+time)*sin(vL.z*1.7-time*0.8)),4.0)); }
        gl_FragColor = vec4(c, a); }`,
  });
  const back = new THREE.Mesh(new THREE.ShapeGeometry(ws), wmat(1, "1.0"));
  back.position.z = -DZ / 2 + 0.02;
  const vg = new THREE.ExtrudeGeometry(ws, { depth: DZ - 0.04, bevelEnabled: false, steps: 1, curveSegments: 1 });
  vg.translate(0, 0, -DZ / 2 + 0.02);
  const vol = new THREE.Mesh(vg, wmat(0.3, "0.55"));
  vol.renderOrder = 8;
  dio.add(back, vol);
  // ふちの線（ガラスの水槽のように）
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(DX1 - DX0, -DBOT + 1.6, DZ)), new THREE.LineBasicMaterial({ color: 0xbfe6ea, transparent: true, opacity: 0.35 }));
  edges.position.set(0, (DBOT + 1.6) / 2, 0);
  dio.add(edges);
}
// 秋に上下の水が混ざる様子（白い粒の輪）
const conv = (() => {
  const cells = [[-11, -1.6, 4.2, 0.9, 1], [1.5, -5, 3.4, 3.6, -1], [9, -7.2, 3.4, 4.8, 1], [16.5, -7.2, 3.4, 4.8, -1]];
  const heads = 90, tail = 7, n = cells.length * heads * tail;
  const a1 = new Float32Array(n * 4), a2 = new Float32Array(n * 4);
  const r = rng(311);
  let o = 0;
  cells.forEach(([cx, cy, rx, ry, dir]) => {
    for (let h = 0; h < heads; h++) {
      const ph = r(), z = -5 + r() * 10, sc = 0.55 + r() * 0.45;
      for (let k = 0; k < tail; k++) {
        a1.set([cx, cy, rx * sc, ry * sc], o * 4);
        a2.set([dir, ph - k * 0.012, z, 1 - k / tail], o * 4);
        o++;
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("a1", new THREE.BufferAttribute(a1, 4));
  g.setAttribute("a2", new THREE.BufferAttribute(a2, 4));
  const m = new THREE.ShaderMaterial({
    uniforms: { ...U, show: { value: 0 } }, transparent: true, depthWrite: false, depthTest: false,
    vertexShader: `uniform float time; attribute vec4 a1; attribute vec4 a2; varying float vA;
      void main(){ float a = (a2.y + time*0.07*a2.x)*6.2832; vec3 p = vec3(a1.x + a1.z*cos(a), a1.y + a1.w*sin(a), a2.z);
        vA = a2.w; vec4 mv = modelViewMatrix*vec4(p,1.); gl_PointSize = (0.12 + 0.12*a2.w) * 900.0 / -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float show; varying float vA; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.1,d)*vA*show; gl_FragColor = vec4(vec3(1.0), a*0.85); }`,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  p.renderOrder = 12;
  return p;
})();
dio.add(conv);
// 太陽（晴れた日）
const sunGrp = new THREE.Group();
{
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const cx = cv.getContext("2d"), gr = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,250,220,1)"); gr.addColorStop(0.25, "rgba(255,220,120,.85)"); gr.addColorStop(1, "rgba(255,200,80,0)");
  cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  sp.scale.set(7, 7, 1);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 7, 13, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(2.5, -6, 0);
  beam.rotation.z = 0.35;
  void beam;
  sunGrp.add(sp);
  sunGrp.position.set(-13, 8.5, -2);
}
dio.add(sunGrp);
// 模型の中の魚
const dAji = school("アジ", 40, 1.6, 321, { freq: 11 });
const dGas = school("ガシラ", 4, 1.2, 322, { freq: 4, amp: 0.04 });
world.add(dAji, dGas);
extras.push(dAji, dGas);
function ajiAt(season, back = 0) {
  // 夏(0)：中ほど → 秋(1)：浅場 → 冬(2)：深場。back は冬の深場から浅場へ戻る割合（晴れた日）
  let x, y;
  if (season < 1) { const e = smooth01(season); x = lerp(1, -5, e); y = lerp(-2.6, -1.9, e); }
  else { const e = smooth01(season - 1); x = lerp(-5, 13, e); y = lerp(-1.9, -10.9, e * e); }
  if (back > 0) { const e = smooth01(back); x = lerp(x, -6, e); y = lerp(y, -2, Math.sqrt(e)); }
  return V(x, y, 0);
}
function dioLife(T, season, back = 0, slow = 0) {
  show(studio, dAji, dGas);
  dio.visible = true;
  graph.visible = false;
  const a = ajiAt(season, back);
  const deep = smooth01(season - 1) * (1 - back);
  updateSchool(dAji, T * (1 - 0.5 * slow), D(a.x, a.y, a.z), V(3.2, lerp(0.45, 0.8, deep), 3), Math.sin(T * 0.3) > 0 ? 1 : -1);
  updateSchool(dGas, T * 0.2, D(-11, dioY(-11) + 0.5, 0.5), V(2.2, 0.1, 2.5), 1);
  return D(a.x, a.y, a.z);
}
function setSeason(season, sun = 0) { WU.season.value = season; WU.sun.value = sun; }
function studioBase() {
  base(0);
  U.under.value = 0;
  show(studio);
  conv.material.uniforms.show.value = 0;
  sunGrp.visible = false;
  setSeason(0, 0);
  WU.tadd.value = 0;
  WU.iso.value = 0;
  WU.nat.value = 0;
}
// 3Dの棒グラフ（月ごとの水温）
const graph = new THREE.Group();
graph.position.set(0, -9, 0);
studio.add(graph);
const bars = [];
{
  const plate = new THREE.Mesh(new THREE.BoxGeometry(40, 0.4, 5), shadedMat(0x24435e, { rough: 0.05 }));
  plate.position.y = -0.2;
  graph.add(plate);
  SUION.forEach((v, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1, 2.3).translate(0, 0.5, 0), shadedMat(0xffffff, { rough: 0.04 }));
    m.position.set((i - 5.5) * 3.2, 0, 0);
    m.userData = { v, col: new THREE.Color(tempColor(v)) };
    bars.push(m);
    graph.add(m);
  });
}
const BAR_H = 0.45;
function drawBars(t, opts = {}) {
  // opts.hide: 色を消して「？」にする月のリスト、opts.hi: 強調する月、opts.grow: 伸び始める時刻
  bars.forEach((b, i) => {
    const g = ease((t - (opts.grow ?? -10) - i * 0.12) / 0.7);
    b.scale.y = Math.max(0.001, b.userData.v * BAR_H * g);
    const hid = opts.hide && opts.hide.includes(i);
    const dim = opts.hi && opts.hi.length && !opts.hi.includes(i) ? 0.45 : 1;
    b.material.uniforms.base.value.copy(hid ? new THREE.Color(0x8a96a3) : b.userData.col).multiplyScalar(dim);
    const p = project(V(DIO.x + b.position.x, DIO.y + graph.position.y - 0.6, DIO.z + 1.2));
    html += `<div style="position:absolute;left:${p.x}px;top:${p.y}px;transform:translate(-50%,0);color:#fff;font-weight:900;font-size:${PORTRAIT ? 24 : 30}px;text-shadow:0 2px 6px #000;opacity:${g}">${i + 1}月</div>`;
    if (hid && g > 0.5) {
      const q = project(V(DIO.x + b.position.x, DIO.y + graph.position.y + b.scale.y + 0.4, DIO.z));
      html += `<div style="position:absolute;left:${q.x}px;top:${q.y}px;transform:translate(-50%,-100%);color:#ffd166;font-weight:900;font-size:56px;text-shadow:0 2px 8px #000">？</div>`;
    }
  });
}
function barLabel(i, a, cls = "gold", dx = 0, dy = -90) {
  const b = bars[i];
  label(V(DIO.x + b.position.x, DIO.y + graph.position.y + b.scale.y, DIO.z), `${i + 1}月 約${Math.round(b.userData.v)}℃`, "", a, cls, dx, dy);
}
// 季節・水温の表示（右下）
function seasonHud(season, a = 1) {
  const mo = season < 1 ? 8 + 3 * season : 11 + 3 * (season - 1);
  const m0 = Math.floor(mo), f = mo - m0;
  const T = lerp(SUION[(m0 - 1) % 12], SUION[m0 % 12], f);
  const name = ((m0 - 1) % 12) + 1;
  const pos = PORTRAIT ? "right:40px;bottom:420px" : "right:70px;bottom:80px";
  html += `<div class="card" style="${pos};left:auto;top:auto;margin:0;zoom:1;padding:18px 30px;opacity:${a};display:flex;align-items:center;gap:22px">
    <div style="width:26px;height:130px;border-radius:13px;background:#dfe7ee;position:relative;overflow:hidden"><div style="position:absolute;left:0;right:0;bottom:0;height:${clamp01((T - 6) / 24) * 100}%;background:${tempColor(T)}"></div></div>
    <div><div style="font-size:30px;color:#3a5a78;font-weight:800">大阪湾の海面水温（平均）</div><div style="font-size:76px;font-weight:900;line-height:1.1">${name}月 <span style="color:${tempColor(T)}">${T.toFixed(0)}℃</span></div></div></div>`;
}
const legendHtml = () => `<div style="position:absolute;${PORTRAIT ? "left:40px;top:230px" : "left:70px;top:125px"};display:flex;align-items:center;gap:12px;color:#fff;font-weight:900;font-size:28px;text-shadow:0 2px 6px #000">冷たい<div style="width:260px;height:22px;border-radius:11px;background:linear-gradient(90deg,${[8, 13, 18, 23, 28].map(tempColor).join(",")})"></div>温かい</div>`;
// 縦画面では模型が横にはみ出さないよう、正面から引いて見る
const dioPortrait = (t) => look(D(Math.sin(t * 0.03) * 4, 3, 60), D(0, -5, 0), 50);
const dioCam = (ang, dist = 46, y = -3.5, tx = 0, ty = -5.5, fov = 50) => PORTRAIT ? dioPortrait(ang * 10) : look(D(Math.sin(ang) * dist + tx, y, Math.cos(ang) * dist), D(tx, ty, 0), fov);

Object.assign(SHOTS, {
  wt_thumb(t, d, s) {
    studioBase();
    setSeason(2);
    const c = dioLife(12, 2);
    look(D(-9, 4, 34), D(-11, -7, 0), 52);
    label(c, "深場", "冬の魚の居場所", 1, "gold", -60, -170);
    html += `<div style="position:absolute;left:0;top:0;bottom:0;width:1000px;background:linear-gradient(90deg,rgba(2,14,28,.82),rgba(2,14,28,0))"></div>`;
    html += `<div style="position:absolute;left:70px;top:230px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px">${s.tag}</span><div style="font-size:140px;line-height:1.12;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
  },
  wt_hook(t, d, s) {
    studioBase();
    const season = 2 * smooth01((t - 1.2) / (d * 0.72));
    setSeason(season);
    dioLife(t, season);
    const k = ease(t / d);
    if (PORTRAIT) look(path(D(-8, 6, 62), D(4, 2, 60), k), D(0, -5, 0), 50);
    else look(path(D(-22, 8, 40), D(6, 0, 48), k), D(lerp(-3, 2, k), lerp(-1.5, -3.5, k), 0), lerp(50, 54, k));
    html += `<div style="position:absolute;left:0;right:0;top:0;height:${PORTRAIT ? 900 : 420}px;background:linear-gradient(rgba(2,10,22,.75),rgba(2,10,22,0))"></div>`;
    seasonHud(season, clamp01((t - 0.6) / 0.5));
    const a = clamp01(t / 0.6) * clamp01((d * 0.5 - t) / 0.4);
    html += `<div class="big" style="top:120px;font-size:90px;opacity:${a}">冬になると、魚は<br><span style="color:#7fd3ff">どこへ消える？</span></div>`;
    const b = clamp01((t - d * 0.56) / 0.5);
    html += `<div class="big" style="top:130px;font-size:68px;opacity:${b}">海の中の温度を<br>色で見える化</div>`;
  },
  wt_title(t, d) {
    studioBase();
    setSeason(2);
    dioLife(t + 30, 2);
    dioCam(-0.35 + t * 0.05, 50, 2);
    const a = clamp01(t / 0.7);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,${0.4 * a})"></div>`;
    html += `<div class="big" style="top:290px;opacity:${a}"><span class="tag">ツレドキ3D</span><div style="font-size:116px;margin-top:26px">冬、魚はどこへ？</div><div style="font-size:60px;color:#7fd3ff">水温を色で見ると、答えがわかる</div></div>`;
  },
  wt_body(t, d, s, k) {
    base(0);
    show(aji);
    // 水温が下がると、泳ぎがゆっくりになる（時間をゆっくり進める）
    const t1 = s._k1 ?? d * 0.4;
    const cold = (x) => (k >= 1 ? smooth01((x - t1) / 3.5) : 0);
    let tau = 0;
    const N = 80;
    for (let i = 0; i < N; i++) { const x = (i + 0.5) * t / N; tau += (1 - 0.7 * cold(x)) * t / N; }
    const c = V(8 + Math.sin(tau * 0.25) * 4, -5.2, 14);
    updateSchool(aji, tau * 1.4, c, V(4, 1.1, 2.6), Math.cos(tau * 0.25) > 0 ? 1 : -1);
    look(path(V(c.x - 9, -4.4, c.z + 13), V(c.x - 4, -5, c.z + 10), ease(t / d)), V(c.x, -5.1, c.z), 52);
    const T = lerp(22, 11, cold(t));
    label(V(c.x - 1, -5.6, c.z), "アジ", "体温＝まわりの水温（変温動物）", k >= 0 ? 1 : 0, "", -220, 170);
    if (k >= 1) label(V(c.x + 3, -5.4, c.z), "水が冷たいと", "動きがゆっくりに", 1, "red", 220, 120);
    const top = PORTRAIT ? 300 : 150;
    html += `<div class="card" style="right:70px;left:auto;top:${top}px;padding:20px 28px;text-align:center"><div style="font-size:28px;font-weight:800;color:#3a5a78">水温</div>
      <div style="width:34px;height:220px;margin:12px auto;border-radius:17px;background:#dfe7ee;position:relative;overflow:hidden"><div style="position:absolute;left:0;right:0;bottom:0;height:${clamp01((T - 6) / 24) * 100}%;background:${tempColor(T)}"></div></div>
      <div style="font-size:60px;font-weight:900;color:${tempColor(T)}">${T.toFixed(0)}℃</div></div>`;
    if (k >= 2) html += `<div class="card" style="left:110px;top:${top}px;width:640px"><b style="font-size:40px">冬の釣りは「水温」がヒント</b><div style="font-size:30px;margin-top:8px">魚の居場所も、食い方も変わる</div></div>`;
  },
  wt_graph(t, d, s, k) {
    studioBase();
    dio.visible = false;
    graph.visible = true;
    const ang = -0.28 + ease(t / d) * 0.22;
    if (PORTRAIT) look(D(Math.sin(ang) * 30, 4, 54), D(0, -1.5, 0), 48);
    else look(D(Math.sin(ang) * 44, 4, Math.cos(ang) * 44), D(0, -1.5, 0), 48);
    drawBars(t, { grow: 0.2, hi: k >= 2 ? [1, 7, 10] : k >= 1 ? [7, 10] : [] });
    if (k >= 1) { barLabel(7, 1, "red", 0, -80); barLabel(10, 1, "gold", 120, -70); }
    if (k >= 2) barLabel(1, 1, "", 0, -90);
    if (k >= 2) html += `<div class="big" style="top:${PORTRAIT ? 380 : 170}px;font-size:60px">夏と冬で <span style="color:#ffd166">約18℃</span> の差</div>`;
    html += `<div style="position:absolute;${PORTRAIT ? "left:40px;right:40px;top:230px" : "left:70px;top:125px"};color:#bfe6ea;font-weight:700;font-size:24px;text-shadow:0 2px 6px #000">出典：気象庁「沿岸域の海面水温情報（大阪湾）」2021〜2025年の日平均を月ごとに平均</div>`;
  },
  wt_quiz(t, d, s, k) {
    studioBase();
    dio.visible = false;
    graph.visible = true;
    const ans = k >= 2;
    if (PORTRAIT) look(D(0, 2, 50), D(0, -6, 0), 48);
    else look(D(-9, 4, 48), D(-15, -2.5, 0), 48);
    drawBars(t + 10, { hide: ans ? [] : [0, 1, 11], hi: ans ? [1] : [] });
    if (ans) barLabel(1, 1, "gold", 170, -70);
    const opts = [["1", "12月"], ["2", "1月"], ["3", "2月"]];
    html += `<div class="card" style="left:110px;top:150px;width:640px"><b style="font-size:44px">${ans ? "答え：3 2月" : "クイズ"}</b><div style="font-size:30px;margin-top:8px">${ans ? "空気がいちばん寒いのは1月ごろ。<br>海は冷めにくく、少し遅れて冷える" : "大阪湾の海の水温が<br>いちばん低くなるのは何月？"}</div>${k >= 1 ? opts.map(([n, x]) => `<div class="opt" style="font-size:38px;padding:12px 22px;${ans && n !== "3" ? "opacity:.35" : ""}${ans && n === "3" ? ";background:#e6f7ea" : ""}"><i style="width:54px;height:54px;font-size:30px">${n}</i>${x}</div>`).join("") : ""}</div>`;
  },
  wt_section(t, d, s, k) {
    studioBase();
    const e1 = ease((t - (s._k1 ?? 0)) / 3.5), e2 = ease((t - (s._k2 ?? 0)) / 3.5);
    const season = k <= 0 ? 0 : k === 1 ? e1 : 1 + e2;
    setSeason(season);
    conv.material.uniforms.show.value = k === 1 ? clamp01((t - (s._k1 ?? 0)) / 1) : k >= 2 ? 1 - clamp01((t - (s._k2 ?? 0)) / 2) : 0;
    dioLife(t, season);
    dioCam(-0.12 + t * 0.012, 47, -2, 0, -6.5, 50);
    html += legendHtml();
    const L = (x, y, txt, sub, a, cls, dx, dy) => label(D(x, y, 6), txt, sub, a, cls, dx, dy);
    L(-17, 0.6, "岸（浅い）", "", 1, "", 0, -70);
    L(18, 0.2, "沖（深い）", "", 1, "", 0, -70);
    if (k === 0) { L(5, -1.5, "温かい水", "上のほう", 1, "red", -60, -150); L(10, -11, "冷たい水", "下のほう", 1, "", 120, 60); }
    if (k === 1) L(6, -4, "上下が混ざる", "冷えて重くなった水が沈む", clamp01((t - (s._k1 ?? 0)) / 0.6), "gold", -160, -150);
    if (k >= 2) { L(-12, -1.2, "浅い所", "さらに冷えやすい", e2, "", 200, 90); L(12, -8, "深い所", "ほぼ同じ冷たさ", e2, "gold", 120, -80); }
    const nm = season < 0.5 ? "夏" : season < 1.5 ? "秋" : "冬";
    html += `<div class="tag" style="position:absolute;${PORTRAIT ? "right:40px;top:230px" : "right:70px;top:130px"};font-size:46px;background:${season < 0.5 ? "#e3412b" : season < 1.5 ? "#e08a2a" : "#2a7fd0"}">${nm}の海</div>`;
  },
  wt_where(t, d, s, k) {
    studioBase();
    const mv = k >= 0 ? smooth01((t - 0.5) / 6) : 0;
    setSeason(2);
    // 秋の浅場から冬の深場へ移る
    const c = dioLife(t, 1 + 0.001 + mv * 0.999, 0, 0.3);
    dioCam(0.28 - t * 0.02, 44, -3, 3, -7, 50);
    html += legendHtml();
    label(D(-12, -1.5, 6), "浅場", "冷えやすい・水温が変わりやすい", 1, "", -40, -110);
    label(c, "アジの群れ", mv < 0.95 ? "深場へ移動中" : "深場に落ちた", 1, "gold", 120, -110);
    if (k >= 1) label(D(14, -12, 6), "深場", "水の量が多く、水温が安定", 1, "", 60, 110);
  },
  wt_sunny(t, d, s, k) {
    studioBase();
    sunGrp.visible = k >= 1;
    const sk = k >= 1 ? ease((t - (s._k1 ?? 0)) / 3) : 0;
    setSeason(2, sk);
    const back = k >= 2 ? ease((t - (s._k2 ?? 0)) / 4) * 0.85 : 0;
    const c = dioLife(t, 2, back);
    dioCam(-0.3 + t * 0.015, 42, 0, -5, -5, 50);
    html += legendHtml();
    if (k === 0) html += `<div class="tag" style="position:absolute;${PORTRAIT ? "right:40px;top:230px" : "right:70px;top:130px"};font-size:46px;background:#2a7fd0">冬の海</div>`;
    if (k >= 1) label(D(-12, -0.8, 6), "浅場の水が少し温まる", "晴れて風の弱い日", sk, "gold", -40, -130);
    if (k >= 2) label(c, "魚が浅場に出てくることも", "昼すぎ〜夕方", 1, "", 200, 120);
  },
  wt_fish(t, d, s, k) {
    base(0);
    wallLife(t);
    tetraLife(t);
    bottomLife(t);
    hide(chinu, kisu, haze, hirame, ainame);
    updateSchool(gashira, t * 0.25, V(35.5, -8.7, 8.5), V(1.6, 0.15, 1), 1);
    const W = [[V(-7.5, -4.2, 6.8), V(-11, -4.7, 1.5)], [V(32, -7.4, 14.5), V(36, -8.6, 7.5)], [V(-4.2, -7.4, 12.5), V(-6, -9.45, 9)]];
    const kk = Math.max(0, Math.min(2, k));
    const tr = kk > 0 ? ease((t - (s["_k" + kk] ?? 0)) / 1.8) : 1;
    const from = W[Math.max(0, kk - 1)], to = W[kk];
    const drift = V(Math.sin(t * 0.3) * 0.6, 0, 0);
    look(path(from[0], to[0], tr).add(drift), path(from[1], to[1], tr), 52);
    label(V(-11, -4.5, 1.6), "メバル", "壁ぎわ・物かげ", kk === 0 ? 1 : 0, "", -40, -100);
    label(V(35.5, -8.5, 8.5), "ガシラ", "テトラ・岩のすき間", kk === 1 && tr > 0.8 ? 1 : 0, "gold", -120, -120);
    label(V(-6, -9.3, 9), "カレイ", "砂地の底", kk === 2 && tr > 0.8 ? 1 : 0, "red", -120, -90);
    html += `<div class="card" style="right:70px;left:auto;top:${PORTRAIT ? 300 : 150}px;width:520px;padding:18px 26px"><b style="font-size:36px">冷たい水に強い魚</b><div style="font-size:30px;margin-top:6px">${["メバル", "ガシラ", "カレイ"].map((n, i) => `<span style="opacity:${kk >= i ? 1 : 0.3};margin-right:16px">${n}</span>`).join("")}</div></div>`;
  },
  wt_tips(t, d, s, k) {
    studioBase();
    setSeason(2, 0.35);
    dioLife(t, 2, 0);
    if (PORTRAIT) look(D(Math.sin(t * 0.05) * 3, 4, 60), D(0, -12, 0), 50);
    else look(D(-27 + Math.sin(t * 0.05) * 1.5, 3, 70), D(-27, -6.5, 0), 50);
    const tips = [["深場が近い場所を選ぶ", "足元から深い所など（立入禁止の場所には入らない）"], ["底の近くを、ゆっくり誘う", "冷たい水の中では動きがゆっくり"], ["晴れて風の弱い日を選ぶ", "急に冷えこんだ直後は食いが落ちやすい、と言われます"]];
    tips.forEach(([h, sub], i) => {
      if (k < i) return;
      const a = clamp01((t - (s["_k" + i] ?? 0)) / 0.4);
      html += `<div class="card" style="left:110px;top:${150 + i * 175}px;width:860px;padding:20px 30px;opacity:${a};border-left:16px solid #2a7fd0"><b style="font-size:44px">${i + 1}. ${h}</b><div style="font-size:28px;color:#3a5a78;margin-top:6px">${sub}</div></div>`;
    });
  },
  wt_sum(t, d, s, k) {
    studioBase();
    setSeason(2);
    dioLife(t, 2);
    dioCam(t * 0.04 - 0.2, 50, 1);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,${0.5 * clamp01(t / 0.6)})"></div>`;
    html += `<div class="big" style="top:110px;font-size:64px;opacity:${clamp01(t / 0.5)}">冬の水温と魚 まとめ</div>`;
    const rows = [["水温", "夏 約28℃ → 冬 約10℃（大阪湾）", "#e3412b"], ["深場", "水温が安定。冬の魚の居場所", "#2a7fd0"], ["晴れた日", "浅場が温まり、魚が出てくることも", "#f2b630"], ["冬の魚", "メバル・ガシラ・カレイ", "#5fc3c9"]];
    rows.forEach(([a1, b1, col], i) => {
      const a = clamp01((t - 0.4 - i * 0.45) / 0.35);
      html += `<div class="card" style="left:300px;right:300px;top:${240 + i * 160}px;padding:18px 28px;opacity:${a};display:flex;align-items:center;gap:26px"><b style="background:${col};color:#fff;font-size:38px;padding:8px 0;width:200px;text-align:center;border-radius:16px">${a1}</b><div style="font-size:38px;font-weight:900">${b1}</div></div>`;
    });
  },
});


// =====================================================================
// 見える化・実戦編（js_*）：わかりやすさ優先の作り（主役だけ明るく・太い矢印・投げる場所の円・全体図・凡例）
// =====================================================================
// 太い矢印（水面に寝かせて置く）
function makeArrow(color) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -0.35); sh.lineTo(1.0, -0.35); sh.lineTo(1.0, -0.8); sh.lineTo(1.7, 0); sh.lineTo(1.0, 0.8); sh.lineTo(1.0, 0.35); sh.lineTo(0, 0.35); sh.closePath();
  const g = new THREE.ShapeGeometry(sh);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthTest: false, side: THREE.DoubleSide }));
  m.renderOrder = 30;
  return m;
}
const ARROWS = [];
for (let i = 0; i < 6; i++) { const a = makeArrow(0xffffff); world.add(a); extras.push(a); ARROWS.push(a); }
// from(x,z) から to(x,z) へ。太さ w。color は "#rrggbb"
function arrow(i, x0, z0, x1, z1, color, a = 1, w = 1.6) {
  const m = ARROWS[i];
  m.visible = a > 0.01;
  const L = Math.hypot(x1 - x0, z1 - z0);
  m.position.set(x0, 0.6, z0);
  m.rotation.set(0, -Math.atan2(z1 - z0, x1 - x0), 0);
  m.scale.set(L / 1.7, 1, w);
  m.material.color.set(color);
  m.material.opacity = 0.92 * a;
}
// 投げる場所の円（脈打つ）
const TARGET = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, depthTest: false, side: THREE.DoubleSide }));
TARGET.renderOrder = 31;
const TARGET_FILL = new THREE.Mesh(new THREE.CircleGeometry(0.82, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.2, depthTest: false, side: THREE.DoubleSide }));
TARGET_FILL.renderOrder = 31;
world.add(TARGET, TARGET_FILL);
extras.push(TARGET, TARGET_FILL);
function target(x, z, r, a, t) {
  for (const m of [TARGET, TARGET_FILL]) { m.visible = a > 0.01; m.position.set(x, 0.7, z); m.scale.setScalar(r * (1 + 0.06 * Math.sin(t * 5))); }
  TARGET.material.opacity = a;
  TARGET_FILL.material.opacity = 0.22 * a;
}
// 川（陸を横切る水の帯）
const RIVER = { x: -30, w: 6 };
const river = new THREE.Mesh(new THREE.PlaneGeometry(RIVER.w, 60).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3f6f86 }));
river.position.set(RIVER.x, 3.2, -30);
river.renderOrder = 2;
world.add(river);
extras.push(river);
FIELDS.river = () => (x, z) => {
  // 川の水は沖へ、沖の流れ（左→右）に押されて右へ曲がる
  if (z < 0) return Math.abs(x - RIVER.x) < RIVER.w / 2 + 0.5 ? [0, 1.5] : [0, 0];
  const bend = z * 0.55, w = 3 + z * 0.35;
  const J = Math.exp(-(((x - RIVER.x - bend) / w) ** 2)) * Math.exp(-z / 22);
  return [0.85 * (1 - J * 0.5) + J * 0.6, J * 1.5];
};
FIELDS.tetraEnd = () => (x, z) => {
  // テトラの前は流れが弱く、切れ目（x≈60）でよれて沖へ出る
  let vx = 1.0, vz = 0;
  const near = smooth01((12 - z) / 10);
  const along = smooth01((x - 26) / 4) * smooth01((60 - x) / 4);
  vx *= 1 - near * along * 0.6;
  const dx = x - 63, dz = z - 7;
  const w = Math.exp(-(dx * dx + dz * dz) / 30);
  vx = vx * (1 - w) + (dz / 6) * 0.9 * w;
  vz = vz * (1 - w) + (-dx / 6) * 0.9 * w + w * 0.3;
  return [vx, vz];
};
// 全体図（画面の隅）。kind: pier | river | tetra。hi: 光らせる場所 [x,z]（全体図の座標 0〜100）
function miniMap(kind, hi, a = 1, dir = "r") {
  const P = PORTRAIT;
  const L = P ? 40 : 70, T = P ? 230 : 140, S = P ? 250 : 270;
  const shapes = {
    pier: `<rect x="0" y="0" width="100" height="22" fill="#9aa59a"/><rect x="46" y="22" width="8" height="40" fill="#c9ced2"/><circle cx="50" cy="60" r="3" fill="#d23a2a"/>`,
    river: `<rect x="0" y="0" width="100" height="22" fill="#9aa59a"/><rect x="18" y="0" width="10" height="22" fill="#3f6f86"/>`,
    lpier: `<rect x="0" y="0" width="100" height="22" fill="#9aa59a"/><rect x="30" y="22" width="7" height="30" fill="#c9ced2"/><rect x="30" y="46" width="40" height="6" fill="#c9ced2"/><circle cx="68" cy="49" r="2.5" fill="#d23a2a"/>`,
    port: `<rect x="0" y="0" width="100" height="22" fill="#9aa59a"/><rect x="45" y="22" width="10" height="58" fill="#0d3556"/><rect x="0" y="40" width="44" height="6" fill="#c9ced2"/><rect x="56" y="40" width="44" height="6" fill="#c9ced2"/>`,
    tetra: `<rect x="0" y="0" width="100" height="22" fill="#9aa59a"/>${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${40 + i * 8}" cy="${27 + (i % 2) * 3}" r="4" fill="#b8bcbe"/>`).join("")}`,
  };
  html += `<div style="position:absolute;left:${L}px;top:${T}px;width:${S}px;height:${S}px;opacity:${a};background:rgba(255,255,255,.92);border-radius:22px;padding:10px;box-shadow:0 6px 18px rgba(0,0,0,.3)">
    <div style="font-size:${P ? 24 : 22}px;font-weight:900;color:#10345a;margin:0 0 4px 6px">全体図</div>
    <svg viewBox="0 0 100 80" width="100%" height="${S - 60}px"><rect x="0" y="0" width="100" height="80" fill="#2b6f9e"/>${shapes[kind]}
    <path d="${dir === "l" ? "M26 70 L6 70" : dir === "in" ? "M92 77 L92 58" : "M6 70 L26 70"}" stroke="#fff" stroke-width="2.5" marker-end="url(#ah)"/><defs><marker id="ah" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#fff"/></marker></defs>
    <text x="${dir === "in" ? 64 : 30}" y="${dir === "in" ? 70 : 73}" font-size="7" fill="#fff" font-weight="700">${dir === "in" ? "満ち潮" : "潮の流れ"}</text>
    ${hi ? `<circle cx="${hi[0]}" cy="${hi[1]}" r="9" fill="none" stroke="#2ecc71" stroke-width="3"/>` : ""}</svg></div>`;
}
function legend(items, a = 1) {
  const P = PORTRAIT;
  html += `<div style="position:absolute;${P ? "right:40px;top:230px" : "right:60px;top:120px"};opacity:${a};background:rgba(6,22,42,.82);border-radius:16px;padding:12px 18px;color:#fff;font-weight:800;font-size:${P ? 28 : 26}px;line-height:1.6">${items.map(([c, t]) => `<div><span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:${c};margin-right:10px;vertical-align:-3px"></span>${t}</div>`).join("")}</div>`;
}
function bigText(top, main, sub, a = 1) {
  html += `<div class="big" style="top:${top}px;opacity:${a}"><div style="font-size:${PORTRAIT ? 108 : 92}px;line-height:1.15">${main}</div>${sub ? `<div style="font-size:${PORTRAIT ? 62 : 52}px;color:#ffd166;margin-top:14px">${sub}</div>` : ""}</div>`;
}
const LEG = [["#4cc3ff", "速い流れ"], ["#ff9f40", "ゆるい流れ"], ["#2ecc71", "投げる場所"]];
// 真上に近い角度で見る（わかりやすさ優先）
function topView(cx, cz, dist, t = 0, d = 1) {
  const k = ease(t / Math.max(d, 0.01));
  look(V(cx - 6 + k * 3, dist, cz + dist * 0.55), V(cx, 0, cz), 48);
}

Object.assign(SHOTS, {
  // つかみ：光る流れ＋問い（最初の1秒から流れが見える）
  js_hook(t, d) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    show(pier);
    FIELD = FIELDS.pier(1);
    updateFlow(t + 30, { x0: -40, x1: 30, z0: 2, z1: 70, pier: true });
    topView(2, 22, 46, t, d);
    const a = clamp01(t / 0.3);
    bigText(PORTRAIT ? 1100 : 140, "この堤防、<br>どこに投げる？", "流れが見えれば、答えがわかる", a);
    ["A", "B", "C"].forEach((n, i) => mapPin([V(-14, 0.4, 40), V(6, 0.4, 24), V(-12, 0.4, 6)][i], n, clamp01((t - 0.8 - i * 0.3) / 0.3)));
  },
  js_pier(t, d, s, k) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    show(pier);
    FIELD = FIELDS.pier(1);
    const focus = k >= 1 ? { x: EDDY.x - 2, z: EDDY.z + 4, r: 6, dim: 0.3 } : null;
    updateFlow(t + 30, { x0: -40, x1: 30, z0: 2, z1: 70, pier: true, focus });
    topView(4, 22, 42, t, d);
    arrow(0, PORTRAIT ? -14 : -26, 22, -4, 22, "#4cc3ff", clamp01(t / 0.5), 2.0);
    if (k >= 1) arrow(1, 12, 12, 6, 22, "#ff9f40", clamp01((t - (s._k1 ?? 0)) / 0.4), 1.3);
    const ans = k >= 1;
    if (ans) target(5.5, 24, 3.2, clamp01((t - (s._k1 ?? 0) - 0.4) / 0.4), t);
    if (ans) label(V(5.5, 0.6, 24), "ここ！", "先端の裏・流れのさかい目", clamp01((t - (s._k1 ?? 0) - 0.4) / 0.4), "gold ans", 0, -90);
    miniMap("pier", ans ? [56, 56] : null);
    legend(LEG);
  },
  js_river(t, d, s, k) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    show(river);
    wall.visible = true;
    FIELD = FIELDS.river();
    const focus = k >= 1 ? { x: RIVER.x + 10, z: 16, r: 7, dim: 0.35 } : null;
    updateFlow(t + 10, { x0: -70, x1: 10, z0: 2, z1: 60, color: "river", river: { ...RIVER, share: 0.35 }, focus });
    topView(-24, 20, 44, t, d);
    arrow(0, PORTRAIT ? -42 : -58, 26, PORTRAIT ? -32 : -40, 26, "#4cc3ff", clamp01(t / 0.5), 2.0);
    arrow(1, RIVER.x, -6, RIVER.x + 2, 8, "#e6b35a", clamp01(t / 0.5), 1.3);
    const ans = k >= 1;
    if (ans) target(RIVER.x + 11, 15, 3.4, clamp01((t - (s._k1 ?? 0) - 0.4) / 0.4), t);
    if (ans) label(V(RIVER.x + 11, 0.6, 15), "ここ！", "川の水と海の水のさかい目", clamp01((t - (s._k1 ?? 0) - 0.4) / 0.4), "gold ans", 0, -90);
    miniMap("river", ans ? [33, 40] : null);
    legend([["#4cc3ff", "海の水"], ["#f2b35a", "川の水"], ["#2ecc71", "投げる場所"]]);
  },
  js_tetra(t, d, s, k) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    FIELD = FIELDS.tetraEnd();
    const focus = k >= 1 ? { x: 62, z: 8, r: 6, dim: 0.3 } : null;
    updateFlow(t + 10, { x0: 10, x1: 80, z0: 2, z1: 50, focus });
    topView(57, 14, 40, t, d);
    arrow(0, PORTRAIT ? 42 : 34, 22, 52, 22, "#4cc3ff", clamp01(t / 0.5), 2.0);
    const ans = k >= 1;
    if (ans) target(62, 9, 3.2, clamp01((t - (s._k1 ?? 0) - 0.4) / 0.4), t);
    if (ans) label(V(62, 0.6, 9), "ここ！", "テトラの切れ目・端", clamp01((t - (s._k1 ?? 0) - 0.4) / 0.4), "gold ans", 0, -90);
    if (k >= 2) html += `<div class="card" style="left:${PORTRAIT ? 40 : 110}px;top:${PORTRAIT ? 1080 : 520}px;width:${PORTRAIT ? 900 : 640}px;border-left:16px solid #e3412b"><b style="font-size:40px;color:#c62828">⚠ テトラの上には乗らない</b><div style="font-size:30px;margin-top:6px">足場のよい堤防や護岸から、切れ目の先へ投げる</div></div>`;
    miniMap("tetra", ans ? [88, 32] : null);
    legend(LEG);
  },
  js_sum(t, d, s, k) {
    base(0);
    sky.visible = true;
    U.under.value = 0;
    show(pier);
    FIELD = FIELDS.pier(1);
    updateFlow(t + 50, { x0: -40, x1: 30, z0: 2, z1: 70, pier: true, alpha: 0.6 });
    topView(2, 22, 46, 0, 1);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,${0.55 * clamp01(t / 0.4)})"></div>`;
    const rows = [["突堤の先端", "裏の流れのさかい目"], ["河口", "川の水と海の水のさかい目"], ["テトラ帯", "切れ目・端（上には乗らない）"]];
    html += `<div class="big" style="top:${PORTRAIT ? 330 : 120}px;font-size:${PORTRAIT ? 80 : 64}px">共通の答えは<br><span style="color:#2ecc71">「流れのさかい目」</span></div>`;
    rows.forEach(([a1, b1], i) => {
      const a = clamp01((t - 0.4 - i * 0.4) / 0.3);
      html += `<div class="card" style="left:${PORTRAIT ? 60 : 380}px;right:${PORTRAIT ? 60 : 380}px;top:${(PORTRAIT ? 760 : 420) + i * (PORTRAIT ? 170 : 150)}px;opacity:${a};display:flex;align-items:center;gap:22px;padding:18px 26px"><b style="background:#2ecc71;color:#06213a;font-size:36px;padding:8px 16px;border-radius:14px;white-space:nowrap">${a1}</b><div style="font-size:38px;font-weight:900">${b1}</div></div>`;
    });
  },
});

// =====================================================================
// 瀬戸内海のサワラはなぜ戻ってきた？（cg-sawara、sw_*）：水産庁・鳥取県の資料にもとづく
// =====================================================================
// 網（縦に張った流し網）：格子模様の板
const NET = new THREE.Mesh(
  new THREE.PlaneGeometry(26, 9),
  new THREE.ShaderMaterial({
    uniforms: { ...U, cell: { value: 1.0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vP; varying vec3 vW; void main(){ vP = position.xy; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float cell; ${FOG_GLSL} varying vec2 vP; varying vec3 vW;
      void main(){ vec2 g = abs(fract(vP / cell + 0.5) - 0.5) * cell; float l = 1.0 - smoothstep(0.03, 0.07, min(g.x, g.y));
        if (l < 0.05) discard; gl_FragColor = vec4(underwater(vec3(0.95,0.92,0.8), vW, distance(cameraPosition, vW)), l * 0.95); }`,
  }),
);
NET.position.set(-30, -4.5, 22);
NET.rotation.y = Math.PI / 2; // 網は z 方向に広がる（魚は x 方向に泳いで通る）
world.add(NET);
extras.push(NET);
const youngSw = school("サゴシ", 10, 1.1, 91, { freq: 14 });
const bigSw = school("サゴシ", 3, 3.2, 92, { freq: 9 });
const releaseSw = school("サゴシ", 40, 0.5, 93, { freq: 16 });
world.add(youngSw, bigSw, releaseSw);
extras.push(youngSw, bigSw, releaseSw);
// 魚を1匹ずつ置く（x：進む位置、向き dir）
function placeEach(mesh, T, fn) {
  mesh.visible = true;
  const { off } = mesh.userData;
  for (let i = 0; i < off.length; i++) {
    const r = fn(i, off[i]);
    _q.setFromEuler(_e.set(0, r.yaw ?? 0, Math.sin(T * 3 + i) * 0.05));
    _s.setScalar(off[i].s);
    _m.compose(r.p, _q, _s);
    mesh.setMatrixAt(i, _m);
  }
  mesh.instanceMatrix.needsUpdate = true;
}
const SW_SIZES = [3.4, 5.5, 7.2]; // 鳥取県の成長式で計算した 0・1・2歳の尾叉長（×10cm）
const swRuler = [0, 1, 2].map((i) => {
  const m = fishMesh("サゴシ", SW_SIZES[i], { amp: 0.03, freq: 5 });
  world.add(m);
  extras.push(m);
  return m;
});
const card = (x, y, w, inner, a = 1, extra = "") =>
  `<div class="card" style="left:${x}px;top:${y}px;width:${w}px;opacity:${a};transform:translateY(${(1 - a) * 24}px);${extra}">${inner}</div>`;
// ツレドキアカデミー（研究・調査にもとづく学術シリーズ）のバッジ
function academyBadge() {
  const P = PORTRAIT;
  html += `<div style="position:absolute;right:${P ? 250 : 270}px;top:${P ? 150 : 50}px;background:#10345a;color:#ffd166;font-weight:900;font-size:${P ? 26 : 24}px;padding:6px 16px;border-radius:999px;border:2px solid #ffd166">ツレドキアカデミー</div>`;
}
const swBg = (t) => {
  // 背景：サゴシが泳ぐ海の中（説明の画面では少し暗くする）
  show(sagoshi);
  updateSchool(sagoshi, t, V(-6 + Math.sin(t * 0.2) * 4, -3, 24), V(4, 1, 3), Math.cos(t * 0.2) > 0 ? 1 : -1);
  look(V(-4 + Math.sin(t * 0.05) * 3, -3.2, 38), V(-6, -3.4, 22), 55);
};

Object.assign(SHOTS, {
  sw_thumb(t, d, s) {
    base(0);
    swBg(3);
    const P = PORTRAIT;
    html += `<div style="position:absolute;left:70px;top:200px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px">${s.tag}</span><div style="font-size:130px;line-height:1.12;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
    if (!P) html += `<div style="position:absolute;right:90px;top:250px;width:520px;height:560px;background:rgba(255,255,255,.92);border-radius:26px;padding:26px">${swChart(1, true)}</div>`;
  },
  sw_hook(t, d) {
    base(0);
    academyBadge();
    show(raiders);
    const c = V(-6, -3, 24);
    updateRaiders(raiders, t * 0.6, c, 2.4, 1.2, 0);
    look(V(c.x + 3, -3, c.z + 17 - t * 0.3), c, 55);
    const a = clamp01(t / 0.4);
    bigText(PORTRAIT ? 330 : 130, "瀬戸内海のサワラ<br>なぜ戻ってきた？", "いま釣れているサゴシの話", a);
  },
  sw_title(t, d) {
    base(0);
    swBg(t + 5);
    const a = clamp01(t / 0.6);
    html += `<div class="big" style="top:${PORTRAIT ? 560 : 280}px;opacity:${a}"><span class="tag" style="background:#10345a;color:#ffd166;border:3px solid #ffd166">ツレドキアカデミー</span><div style="font-size:${PORTRAIT ? 96 : 110}px;margin-top:26px">瀬戸内海のサワラは<br>なぜ戻ってきた？</div><div style="font-size:${PORTRAIT ? 46 : 52}px;color:#ffd166;margin-top:10px">水産庁・鳥取県の資料から</div></div>`;
  },
  sw_graph(t, d, s, k) {
    base(0);
    academyBadge();
    swBg(t + 10);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,0.55)"></div>`;
    const P = PORTRAIT;
    const W0 = P ? 940 : 1100, L0 = P ? 70 : 410, T0 = P ? 330 : 120;
    html += `<div style="position:absolute;left:${L0}px;top:${T0}px;width:${W0}px;background:rgba(255,255,255,.95);border-radius:28px;padding:26px 30px">${swChart(k + clamp01((t - (s["_k" + k] ?? 0)) / 1.2), false)}</div>`;
  },
  sw_plan(t, d, s, k) {
    base(0);
    academyBadge();
    swBg(t + 20);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,0.55)"></div>`;
    const P = PORTRAIT;
    html += `<div class="big" style="top:${P ? 260 : 110}px;font-size:${P ? 76 : 64}px">10年の取り組み<div style="font-size:${P ? 40 : 36}px;color:#ffd166;margin-top:6px">2002〜2011年度・水産庁の資源回復計画</div></div>`;
    const items = [["1", "休漁", "流し網の漁を春か秋に休む"], ["2", "網の目を大きく", "10.6cm以上にそろえる"], ["3", "放流", "育てた稚魚を海に放す"]];
    items.forEach(([n, h, sub], i) => {
      const on = k >= (i === 0 ? 1 : 2);
      const a = on ? clamp01((t - (s["_k" + (i === 0 ? 1 : 2)] ?? 0) - (i === 2 ? 0.8 : 0)) / 0.4) : 0;
      const y = (P ? 560 : 330) + i * (P ? 210 : 180);
      html += card(P ? 80 : 460, y, P ? 840 : 920, `<div style="display:flex;align-items:center;gap:26px"><b style="background:#2ecc71;color:#06213a;font-size:54px;width:84px;height:84px;border-radius:50%;display:flex;align-items:center;justify-content:center">${n}</b><div><b style="font-size:50px">${h}</b><div style="font-size:32px;color:#3a5a78">${sub}</div></div></div>`, a, "padding:18px 26px");
    });
  },
  sw_net(t, d, s, k) {
    base(0);
    academyBadge();
    NET.visible = true;
    // 若い魚（小さい）は網の目をすり抜け、大きい魚は網に当たって向きを変える
    const L = 12;
    placeEach(youngSw, t, (i, o) => {
      const u = ((t * 0.18 + i / 10) % 1);
      return { p: V(-30 - L + u * 2 * L, -4.5 + o.y * 3, 22 + o.z * 8), yaw: 0 };
    });
    placeEach(bigSw, t, (i, o) => {
      const u = ((t * 0.12 + i / 3) % 1);
      const x = -30 - L + u * L * 1.9;
      const hit = Math.max(0, x - (-31.5));
      return { p: V(Math.min(x, -31.5) - hit * 0.6, -4.5 + o.y * 2, 18 + i * 4), yaw: x > -31.5 ? Math.PI : 0 };
    });
    look(V(-44, -3.2, PORTRAIT ? 42 : 36), V(-30, -4.5, 22), 52);
    label(V(-30, -0.4, 22), "網の目 10.6cm以上", "流し網", 1, "", 0, -40);
    if (k >= 1) label(V(-27, -4.6, 24), "若い魚はすり抜ける", "0〜1歳の魚の約16%", 1, "gold ans", 140, -120);
    legend([["#ffd166", "若い（小さい）魚"], ["#e3412b", "大きい魚"]]);
  },
  sw_release(t, d, s, k) {
    base(0);
    academyBadge();
    // 水面から小さな稚魚が広がっていく
    placeEach(releaseSw, t, (i, o) => {
      const u = clamp01((t - i * 0.08) / 6);
      const ang = o.p * 6.28;
      return { p: V(-6 + Math.cos(ang) * u * 8 * o.w, -0.6 - u * 4 * (0.5 + o.s * 0.4), 24 + Math.sin(ang) * u * 6), yaw: -ang };
    });
    look(V(-6, -3.5, 36), V(-6, -2.2, 24), 55);
    label(V(-6, -0.4, 24), "放流", "育てた稚魚を海に放す", 1, "", 0, -60);
    if (k >= 1) html += card(PORTRAIT ? 80 : 110, PORTRAIT ? 980 : 520, PORTRAIT ? 840 : 760, `<b style="font-size:46px">とれるまで生き残ったのは<br><span style="color:#1e7a36;font-size:72px">約24%</span></b><div style="font-size:28px;color:#3a5a78">平成14〜22年の平均（水産庁の資料）</div>`, clamp01((t - (s._k1 ?? 0)) / 0.4));
    if (k >= 2) html += card(PORTRAIT ? 80 : 110, PORTRAIT ? 330 : 150, PORTRAIT ? 840 : 760, `<b style="font-size:40px">もう1つの理由</b><div style="font-size:32px;margin-top:6px">生まれた数がたまたま多い年（卓越年級群）があったことも、回復の要因とされています</div>`, clamp01((t - (s._k2 ?? 0)) / 0.4));
  },
  sw_travel(t, d, s, k) {
    base(0);
    academyBadge();
    show(raiders);
    // 東（右）から西（左）へ泳ぐサワラ
    placeEach(raiders, t, (i, o) => ({ p: V(6 - ((t * 2.2 + i * 3) % 30), -3 + o.y, 22 + o.z * 3), yaw: Math.PI }));
    look(V(-6, -3, 38), V(-6, -3, 22), 55);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,0.35)"></div>`;
    const P = PORTRAIT;
    const a = clamp01(t / 0.5), b = k >= 1 ? clamp01((t - (s._k1 ?? 0)) / 2) : 0;
    const days = Math.round(229 * b), cm = (23.6 * (k >= 2 ? clamp01((t - (s._k2 ?? 0)) / 1.5) : 0)).toFixed(1);
    const W1 = P ? 940 : 1300, L1 = P ? 70 : 310;
    html += `<div style="position:absolute;left:${L1}px;top:${P ? 520 : 220}px;width:${W1}px;opacity:${a};background:rgba(255,255,255,.95);border-radius:28px;padding:30px">
      <div style="font-size:36px;font-weight:900;color:#10345a">鳥取県の標識放流の記録</div>
      <div style="position:relative;height:${P ? 300 : 260}px;margin-top:20px">
        <div style="position:absolute;left:0;top:40px;text-align:center;width:300px"><div style="width:44px;height:44px;border-radius:50%;background:#2ecc71;margin:0 auto;border:6px solid #fff;box-shadow:0 0 0 4px #2ecc71"></div><b style="font-size:40px;color:#10345a">鳥取県 沿岸</b><div style="font-size:28px;color:#3a5a78">ここでとれた</div></div>
        <div style="position:absolute;right:0;top:40px;text-align:center;width:300px"><div style="width:44px;height:44px;border-radius:50%;background:#e3412b;margin:0 auto;border:6px solid #fff;box-shadow:0 0 0 4px #e3412b"></div><b style="font-size:40px;color:#10345a">福井県 敦賀湾</b><div style="font-size:28px;color:#3a5a78">ここで放流</div></div>
        <div style="position:absolute;right:150px;top:66px;height:10px;width:calc((100% - 300px) * ${b});background:#1f6fb2;border-radius:5px"></div>
        <div style="position:absolute;left:0;right:0;top:${P ? 170 : 150}px;text-align:center;font-weight:900;color:#10345a"><span style="font-size:${P ? 80 : 72}px">${days}</span><span style="font-size:40px">日後</span>${k >= 2 ? `　<span style="font-size:${P ? 80 : 72}px;color:#1e7a36">+${cm}</span><span style="font-size:40px;color:#1e7a36">cm</span>` : ""}</div>
      </div>
      <div style="font-size:26px;color:#3a5a78">※位置関係を示した図で、地図ではありません。福井県→鳥取県は西向き。</div></div>`;
  },
  sw_size(t, d, s, k) {
    base(0);
    academyBadge();
    swRuler.forEach((m, i) => {
      m.visible = true;
      m.position.set(-6 - (SW_SIZES[2] - SW_SIZES[i]) / 2, -1.2 - i * 2.4, 24);
    });
    look(V(-6, -3.9, PORTRAIT ? 44 : 39), V(-6, -3.9, 24), 40);
    const ages = ["0歳 約34cm", "1歳 約55cm", "2歳 約72cm"];
    ages.forEach((a1, i) => label(V(-6 - (SW_SIZES[2] - SW_SIZES[i]) / 2 - SW_SIZES[i] / 2, -1.2 - i * 2.4, 24), a1, "", clamp01((t - 0.3 - i * 0.4) / 0.3), i < 2 ? "gold" : "", -10, -40));
    html += `<div style="position:absolute;left:0;right:0;top:${PORTRAIT ? 250 : 110}px;text-align:center;color:#fff;font-weight:900;font-size:${PORTRAIT ? 44 : 40}px;text-shadow:0 3px 12px rgba(0,0,0,.6)">鳥取県の調査の成長の式で計算した大きさ（尾叉長）</div>`;
    // 「約8割」は字幕で伝える（カードと字幕が重なるため出さない）
  },
  sw_angler(t, d, s, k) {
    base(0);
    academyBadge();
    swBg(t + 30);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,0.5)"></div>`;
    const P = PORTRAIT;
    html += `<div class="big" style="top:${P ? 280 : 120}px;font-size:${P ? 76 : 64}px">釣り人にできること</div>`;
    [["食べる分だけ持ち帰る"], ["地域や釣り場のルールを確かめる"], ["釣った魚はおいしくいただく"]].forEach(([h], i) => {
      const kk = i === 0 ? 1 : i === 1 ? 1 : 2;
      const a = k >= kk ? clamp01((t - (s["_k" + kk] ?? 0) - (i === 1 ? 0.6 : 0)) / 0.4) : 0;
      html += card(P ? 80 : 460, (P ? 520 : 290) + i * (P ? 170 : 150), P ? 840 : 920, `<b style="font-size:46px"><span style="color:#2ecc71">✔</span> ${h}</b>`, a, "padding:22px 30px");
    });
  },
  sw_sum(t, d, s, k) {
    base(0);
    academyBadge();
    swBg(t + 40);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,0.55)"></div>`;
    const P = PORTRAIT;
    html += `<div class="big" style="top:${P ? 280 : 110}px;font-size:${P ? 72 : 60}px">まとめ</div>`;
    [["資源量", "1998年 約690トン → 2024年 約6,500トン（約9倍）"], ["取り組み", "休漁・網の目・放流（2002〜2011年度）、その後も管理を継続"], ["いま", "親魚の量はここ5年減る傾向。見守りが必要"], ["サゴシ", "とれたサワラの約8割は0〜1歳（鳥取県）"]].forEach(([a1, b1], i) => {
      const a = clamp01((t - 0.4 - i * 0.4) / 0.3);
      html += card(P ? 60 : 300, (P ? 450 : 220) + i * (P ? 200 : 150), P ? 880 : 1320, `<div style="display:flex;align-items:center;gap:22px"><b style="background:#1f6fb2;color:#fff;font-size:34px;padding:8px 16px;border-radius:14px;white-space:nowrap">${a1}</b><div style="font-size:${P ? 34 : 38}px;font-weight:900">${b1}</div></div>`, a, "padding:18px 24px");
    });
  },
});
// 資源量のグラフ（水産研究・教育機構の資源評価。山口県 令和7年版の資料から）
// step：0=1987年と1998年、1=2024年まで、2=親魚量の注意も
function swChart(step, small) {
  const data = [[1987, 15718], [1998, 688], [2024, 6500]];
  const show = (y) => (y === 2024 ? step >= 1 : step >= 0);
  const grow = (y) => (y === 2024 ? clamp01(step) : clamp01(step + 1));
  const H = small ? 300 : PORTRAIT ? 520 : 380;
  const bars = data.map(([y, v]) => {
    const g = grow(y), on = show(y);
    const h = Math.max(4, (v / 16000) * H * g);
    const col = y === 1998 ? "#e3412b" : y === 2024 ? "#2ecc71" : "#7fa3c2";
    return `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;opacity:${on ? 1 : 0.12}">
      <b style="font-size:${small ? 28 : 40}px;color:#10345a">${on ? Math.round(v * g).toLocaleString() : ""}</b>
      <div style="width:62%;height:${h}px;background:${col};border-radius:12px 12px 0 0"></div>
      <div style="font-size:${small ? 26 : 34}px;font-weight:900;color:#10345a;margin-top:6px">${y}年</div></div>`;
  }).join("");
  return `<div style="font-size:${small ? 30 : 38}px;font-weight:900;color:#10345a">瀬戸内海のサワラの資源量（トン）</div>
    <div style="display:flex;gap:12px;height:${H + 90}px;align-items:flex-end;margin-top:14px;border-bottom:4px solid #10345a">${bars}</div>
    ${step >= 1 && !small ? `<div style="font-size:${PORTRAIT ? 44 : 40}px;font-weight:900;color:#1e7a36;margin-top:12px;text-align:center">一番少なかった年の約9倍に</div>` : ""}
    ${step >= 2 && !small ? `<div style="font-size:${PORTRAIT ? 34 : 30}px;font-weight:900;color:#c62828;margin-top:6px;text-align:center">ただし親魚の量はここ5年減る傾向・目安を下回る</div>` : ""}
    <div style="font-size:22px;color:#3a5a78;margin-top:8px">出典：山口県「令和7年版 瀬戸内海側重要魚種の資源評価 サワラ」（水産研究・教育機構の資源評価）</div>`;
}


// =====================================================================
// ブリの一生（cg-buri、by_*）：水産研究・教育機構の資源評価（令和7年度）・環境省・北海道立総合研究機構の資料にもとづく
// =====================================================================
// 日本地図（陸地は Natural Earth）。本編の海から離れた場所（x=500）に置く
const MAPO = V(500, 0, 0);
const jmap = new THREE.Group();
jmap.position.copy(MAPO);
world.add(jmap);
extras.push(jmap);
const MG = (lon, lat, y = 0.7) => { const [x, z] = geo(lon, lat); return V(MAPO.x + x, y, MAPO.z + z); };
const MAP_BG = "vec3(0.02,0.07,0.13)";
const MAP_EDGE = `float edge(vec2 p){ return smoothstep(30.5, 25.0, abs(p.x)) * smoothstep(30.0, 24.0, -p.y) * smoothstep(32.4, 27.0, p.y); }`;
{
  const bd = new THREE.Mesh(new THREE.SphereGeometry(170, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vP; void main(){ float h = normalize(vP).y; gl_FragColor = vec4(mix(${MAP_BG}, vec3(0.04,0.13,0.22), smoothstep(-0.2,0.8,h)),1.); }`,
  }));
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(120, 120, 1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { time: U.time },
    vertexShader: `varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float time; varying vec3 vL; ${MAP_EDGE}
      void main(){ vec2 p = vL.xz; vec2 ll = vec2(p.x/(0.81915*2.4)+135.0, -p.y/2.4+35.0);
        vec2 g = abs(fract(ll/5.0 - 0.5) - 0.5) * 5.0; vec2 fw = fwidth(ll);
        float line = 1.0 - smoothstep(0.0, 1.2, min(g.x/fw.x, g.y/fw.y));
        vec3 c = mix(vec3(0.06,0.25,0.42), vec3(0.09,0.33,0.52), 0.5+0.5*sin(p.x*0.21+time*0.15)*sin(p.y*0.17-time*0.1));
        c += line * 0.07;
        gl_FragColor = vec4(mix(${MAP_BG}, c, edge(p)), 1.); }`,
  }));
  const shapes = LAND.map((r) => new THREE.Shape(r.map(([x, z]) => new THREE.Vector2(x, -z))));
  const lg = new THREE.ExtrudeGeometry(shapes, { depth: 0.5, bevelEnabled: false, curveSegments: 1 });
  lg.rotateX(-Math.PI / 2);
  const land = new THREE.Mesh(lg, new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vL; varying vec3 vN; void main(){ vL = position; vN = normal; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vL; varying vec3 vN; ${MAP_EDGE}
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){ float n = hash(floor(vL.xz*4.0));
        vec3 top = mix(vec3(0.84,0.80,0.64), vec3(0.62,0.72,0.52), 0.5+0.5*sin(vL.x*0.6)*sin(vL.z*0.5)) * (0.95+0.05*n);
        vec3 c = vN.y > 0.5 ? top : vec3(0.42,0.40,0.33);
        float diff = clamp(dot(normalize(vN), normalize(vec3(0.3,1.0,0.5))),0.,1.); c *= 0.6+0.45*diff;
        gl_FragColor = vec4(mix(${MAP_BG}, c, edge(vL.xz)), 1.); }`,
  }));
  const coast = new THREE.Group();
  const cm = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
  LAND.forEach((r) => {
    const pts = r.filter(([x, z]) => Math.abs(x) < 29 && z > -29 && z < 31).map(([x, z]) => V(x, 0.52, z));
    if (pts.length > 2) coast.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), cm));
  });
  jmap.add(bd, sea, land, coast);
}
// 回遊ルート（チューブ。prog で描き進める、dir で模様を流す）
function makeRoute(pts, color, w = 0.3) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([lo, la]) => { const [x, z] = geo(lo, la); return V(x, 0.8, z); }), false, "centripetal");
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 260, w, 8, false), new THREE.ShaderMaterial({
    uniforms: { time: U.time, prog: { value: 1 }, dir: { value: 0 }, col: { value: new THREE.Color(color) }, op: { value: 1 } },
    transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float time; uniform float prog; uniform float dir; uniform vec3 col; uniform float op; varying vec2 vUv;
      void main(){ if (vUv.x > prog) discard; float dash = smoothstep(0.3, 0.5, fract(vUv.x*26.0 - dir*time*0.8));
        gl_FragColor = vec4(mix(col, vec3(1.0), dash*0.5), op); }`,
  }));
  m.renderOrder = 10;
  m.userData.curve = curve;
  jmap.add(m);
  return m;
}
function routeSet(m, prog, op = 1, dir = 0) {
  m.visible = op > 0.01 && prog > 0.001;
  m.material.uniforms.prog.value = prog;
  m.material.uniforms.op.value = op;
  m.material.uniforms.dir.value = dir;
}
// 北部型：東シナ海 ⇔ 北海道沿岸（日本海を通る）
const R_NORTH = makeRoute([[127.2, 30.0], [128.6, 32.4], [129.6, 34.1], [131.4, 35.6], [133.4, 36.6], [135.8, 37.4], [137.6, 38.6], [139.2, 40.0], [139.5, 41.8], [140.6, 43.6], [141.4, 45.0], [142.4, 45.7]], "#ff6b5a", 0.34);
// 中・西部型：東シナ海 ⇔ 能登半島以西の日本海
const R_MID = makeRoute([[126.6, 30.4], [127.9, 32.6], [129.0, 34.3], [130.6, 35.4], [132.4, 36.0], [134.3, 36.2], [136.1, 37.0]], "#ffd166", 0.34);
// 太平洋側の小さな回遊群（遠州灘〜四国南西岸、紀伊水道〜薩南、豊後水道〜薩南）
const R_PAC = [
  makeRoute([[137.7, 34.45], [136.4, 33.55], [135.4, 33.15], [134.2, 32.95], [133.0, 32.55], [132.4, 32.6]], "#5ee08a", 0.22),
  makeRoute([[135.0, 33.95], [134.4, 32.9], [133.0, 31.9], [131.6, 31.0], [130.6, 30.6]], "#5ee08a", 0.22),
  makeRoute([[132.2, 33.15], [131.9, 32.2], [131.4, 31.2], [130.8, 30.65]], "#5ee08a", 0.22),
];
// 産卵が見られる範囲（九州沿岸〜能登半島以西／伊豆諸島以西）
const R_SPAWN_J = makeRoute([[129.6, 33.9], [131.0, 34.9], [132.6, 35.7], [134.4, 35.85], [135.9, 35.95], [136.6, 36.9]], "#ff9f40", 0.18);
const R_SPAWN_P = makeRoute([[130.4, 31.0], [131.6, 31.7], [132.6, 32.6], [134.2, 33.0], [135.6, 33.25], [137.2, 34.3], [139.3, 34.3]], "#ff9f40", 0.18);
// 主な産卵場（東シナ海の陸棚のふち）：脈打つ光
const SPAWN = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
  uniforms: { time: U.time, op: { value: 1 } }, transparent: true, depthWrite: false,
  vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform float time; uniform float op; varying vec2 vP; void main(){ float r = length(vP); float ring = smoothstep(0.08,0.0,abs(r - fract(time*0.35)));
    float a = pow(1.0 - r, 1.2) * (0.55 + 0.15*sin(time*3.0)) + ring*0.5*(1.0-r); gl_FragColor = vec4(vec3(1.0,0.45,0.35), a*op); }`,
}));
{ const [x, z] = geo(126.9, 29.8); SPAWN.position.set(x, 0.6, z); SPAWN.scale.set(6.5, 1, 2.6); SPAWN.rotation.y = 0.75; SPAWN.renderOrder = 9; jmap.add(SPAWN); }
// 6月に14℃以上になる日本海（模式図）。latN：北のふち
const WARM = new THREE.Mesh(new THREE.PlaneGeometry(64, 64).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
  uniforms: { latN: { value: 40 }, op: { value: 1 }, time: U.time }, transparent: true, depthWrite: false,
  vertexShader: `varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform float latN; uniform float op; uniform float time; varying vec3 vL;
    void main(){ vec2 ll = vec2(vL.x/(0.81915*2.4)+135.0, -vL.z/2.4+35.0);
      float east = ll.y < 37.5 ? 138.8 : (ll.y < 42.7 ? 140.2 : 142.6);
      float south = ll.x > 132.0 ? 35.2 : 33.9;
      float m = smoothstep(127.6, 128.4, ll.x) * smoothstep(east + 0.3, east - 0.3, ll.x) * smoothstep(south - 0.3, south + 0.3, ll.y);
      float d = latN - ll.y; float fill = smoothstep(-0.15, 0.25, d); float rim = exp(-pow(d/0.35, 2.0));
      float stripe = 0.85 + 0.15*step(0.5, fract((vL.x + vL.z)*0.9 - time*0.3));
      vec3 c = mix(vec3(1.0,0.56,0.22)*stripe, vec3(1.0,0.95,0.8), rim);
      gl_FragColor = vec4(c, m * op * min(1.0, fill*0.78 + rim*0.9)); }`,
}));
WARM.position.y = 0.04;
WARM.renderOrder = 8;
jmap.add(WARM);
// 地図の上の小さな群れ（寝かせて置く）
const mapFish = [0, 1].map((i) => { const m = school("ハマチ", 7, 1.5, 520 + i, { amp: 0.02, freq: 8 }); world.add(m); extras.push(m); return m; });
const _e2 = new THREE.Euler(0, 0, 0, "YXZ");
function fishOnRoute(mesh, route, u0, T, back = false, spread = 0.7) {
  mesh.visible = true;
  const { off } = mesh.userData, c = route.userData.curve;
  for (let i = 0; i < off.length; i++) {
    const o = off[i];
    const u = Math.min(0.999, Math.max(0.001, u0 + o.x * 0.03));
    const p = c.getPointAt(u), tg = c.getTangentAt(u);
    const sg = back ? -1 : 1;
    const yaw = Math.atan2(-tg.z * sg, tg.x * sg);
    p.x += -tg.z * o.y * spread + Math.sin(T * o.w + o.p) * 0.12;
    p.z += tg.x * o.y * spread;
    p.y = 1.1;
    _e2.set(-Math.PI / 2, yaw, 0);
    _q.setFromEuler(_e2);
    _s.setScalar(o.s);
    _m.compose(p.add(MAPO), _q, _s);
    mesh.setMatrixAt(i, _m);
  }
  mesh.instanceMatrix.needsUpdate = true;
}
let mapBase = function () {
  base(0);
  U.under.value = 0;
  jmap.visible = true;
  [R_NORTH, R_MID, ...R_PAC, R_SPAWN_J, R_SPAWN_P].forEach((r) => (r.visible = false));
  SPAWN.visible = false;
  WARM.visible = false;
}
// 地図のカメラ：[経度, 緯度, 高さ] を k でつなぐ
function mapCam(a, b = a, k = 0, fov = 45) {
  const lo = lerp(a[0], b[0], k), la = lerp(a[1], b[1], k), h = lerp(a[2], b[2], k);
  const c = MG(lo, la, 0);
  look(V(c.x, h, c.z + h * 0.62), c, fov);
}
// 地名などの札
function mtag(lon, lat, text, a = 1, cls = "", dy = 0) {
  if (a <= 0.01) return;
  const p = project(MG(lon, lat, 0.6));
  html += `<div class="lab ${cls}" style="left:${p.x}px;top:${p.y + dy}px;opacity:${a};transform:translate(-50%,-50%) scale(${0.85 + 0.15 * a});font-size:${PORTRAIT ? 30 : 28}px;padding:4px 16px">${text}</div>`;
}
const srcLine = (txt) => `<div style="position:absolute;left:${PORTRAIT ? 40 : 70}px;bottom:${PORTRAIT ? 300 : 200}px;color:#cfe6f5;font-size:${PORTRAIT ? 22 : 22}px;font-weight:700;text-shadow:0 2px 6px #000">出典：${txt}</div>`;
// 流れ藻（モジャコの家）：水面に浮かぶ海藻のかたまり
const moba = new THREE.Group();
moba.position.set(-6, -0.1, 24);
world.add(moba);
extras.push(moba);
{
  const r = rng(511);
  const mat = (ph) => new THREE.ShaderMaterial({
    uniforms: { ...U, ph: { value: ph } }, side: THREE.DoubleSide,
    vertexShader: `uniform float time; uniform float ph; varying float vY; varying vec3 vW; varying float vX;
      void main(){ vec3 p = position; vY = -p.y; vX = uv.x; p.x *= 1.0 - 0.7*uv.y*0.0 - 0.65*clamp(vY/3.2,0.,1.);
        p.x += sin(time*1.1+ph+p.y*1.6)*0.12*vY; p.z += cos(time*0.8+ph+p.y)*0.08*vY;
        vec4 w = modelMatrix*vec4(p,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${FOG_GLSL} uniform float ph; varying float vY; varying vec3 vW; varying float vX;
      void main(){ float leaf = abs(sin(vY*9.0 + ph*3.0)); if (abs(vX-0.5) > 0.22 + 0.28*leaf) discard;
        vec3 c = mix(vec3(0.66,0.56,0.2), vec3(0.34,0.31,0.1), clamp(vY/3.0,0.,1.)) * (0.8 + 0.25*sin(ph*7.0));
        gl_FragColor = vec4(underwater(c, vW, distance(cameraPosition, vW)), 1.); }`,
  });
  for (let i = 0; i < 130; i++) {
    const h = 0.8 + r() * 2.6;
    const g = new THREE.PlaneGeometry(0.34, h, 1, 10);
    g.translate(0, -h / 2, 0);
    const m = new THREE.Mesh(g, mat(r() * 6));
    const a = r() * 6.28, rad = Math.sqrt(r()) * 2.8;
    m.position.set(Math.cos(a) * rad, r() * 0.1, Math.sin(a) * rad * 0.75);
    m.rotation.set((r() - 0.5) * 0.7, r() * 3, (r() - 0.5) * 0.7);
    moba.add(m);
  }
  // 浮き袋（小さな粒）
  const bl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), shadedMat(0x8a7a2a, { rough: 0.2 }), 260);
  for (let i = 0; i < 260; i++) {
    const a = r() * 6.28, rad = Math.sqrt(r()) * 2.8;
    _m.makeTranslation(Math.cos(a) * rad + (r() - 0.5) * 0.4, -r() * 1.6, Math.sin(a) * rad * 0.75);
    bl.setMatrixAt(i, _m);
  }
  moba.add(bl);
}
const mojako = school("ハマチ", 30, 0.34, 512, { freq: 16 });
world.add(mojako);
extras.push(mojako);
// 大きさの比較（ハマチの絵を使う）
const BY_NAME = [2.0, 4.0, 6.0, 8.0]; // 関西の呼び名の目安（ツバス・ハマチ・メジロ・ブリ）×10cm（環境省）
const BY_AGE = [4.1, 6.0, 7.2, 8.0]; // 1〜4歳の尾叉長（水産研究・教育機構、太平洋・千葉以西、1月時点）×10cm
const byRuler = [0, 1, 2, 3].map(() => { const m = fishMesh("ハマチ", 1, { amp: 0.03, freq: 5 }); world.add(m); extras.push(m); return m; });
const byBg = (t) => {
  show(hamachi);
  updateSchool(hamachi, t, V(-6 + Math.sin(t * 0.2) * 5, -3.2, 24), V(3, 1, 2.4), Math.cos(t * 0.2) > 0 ? 1 : -1);
  look(V(-4 + Math.sin(t * 0.05) * 3, -3.2, 38), V(-6, -3.4, 22), 55);
};
const dim = (v = 0.55) => `<div style="position:absolute;inset:0;background:rgba(2,14,28,${v})"></div>`;
const rowCard = (P, i, a, h, sub, top0, step, col = "#1f6fb2") =>
  card(P ? 60 : 300, top0 + i * step, P ? 880 : 1320, `<div style="display:flex;align-items:center;gap:22px"><b style="background:${col};color:#fff;font-size:34px;padding:8px 16px;border-radius:14px;white-space:nowrap">${h}</b><div style="font-size:${P ? 34 : 38}px;font-weight:900">${sub}</div></div>`, a, "padding:18px 24px");

Object.assign(SHOTS, {
  by_thumb(t, d, s) {
    mapBase();
    routeSet(R_NORTH, 1, 1);
    routeSet(R_MID, 1, 1);
    R_PAC.forEach((r) => routeSet(r, 1, 1));
    SPAWN.visible = true;
    fishOnRoute(mapFish[0], R_NORTH, 0.62, 3);
    fishOnRoute(mapFish[1], R_MID, 0.45, 3, true);
    const c = MG(130.5, 37.2, 0);
    look(V(c.x, 64, c.z + 34), c, 45);
    html += `<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(2,14,28,.85) 0%,rgba(2,14,28,.55) 38%,rgba(2,14,28,0) 60%)"></div>`;
    html += `<div style="position:absolute;left:70px;top:200px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px;background:#10345a;color:#ffd166;border:3px solid #ffd166">${s.tag}</span><div style="font-size:150px;line-height:1.1;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
  },
  by_hook(t, d) {
    base(0);
    academyBadge();
    byBg(t);
    const a = clamp01(t / 0.4);
    bigText(PORTRAIT ? 330 : 130, "ブリの一生<br>日本を回る大回遊", "名前が変わる出世魚の話", a);
  },
  by_title(t, d) {
    mapBase();
    routeSet(R_NORTH, clamp01(t / 3), 0.9);
    routeSet(R_MID, clamp01((t - 0.5) / 3), 0.9);
    const k = ease(clamp01(t / d));
    mapCam([132, 35.5, 52], [133, 37, 72], k);
    html += dim(0.35);
    const a = clamp01(t / 0.6);
    html += `<div class="big" style="top:${PORTRAIT ? 560 : 260}px;opacity:${a}"><span class="tag" style="background:#10345a;color:#ffd166;border:3px solid #ffd166">ツレドキアカデミー</span><div style="font-size:${PORTRAIT ? 96 : 110}px;margin-top:26px">ブリの一生</div><div style="font-size:${PORTRAIT ? 50 : 56}px;margin-top:6px">流れ藻のモジャコから80cmへ</div><div style="font-size:${PORTRAIT ? 36 : 40}px;color:#ffd166;margin-top:18px">水産研究・教育機構・環境省・北海道の資料から</div></div>`;
  },
  by_spawn(t, d, s, k) {
    mapBase();
    academyBadge();
    const k1 = k >= 1 ? ease(clamp01((t - (s._k1 ?? 0)) / 2.5)) : 0;
    mapCam([128.5, 31.0, 40], [132.6, 33.9, 50], k1);
    SPAWN.visible = true;
    mtag(124.8, 27.9, "東シナ海", 1 - k1);
    label(MG(126.9, 29.8), "主な産卵場", "東シナ海の大陸棚のふち", clamp01(t / 0.6), "gold ans", 0, -90);
    if (k >= 1) {
      routeSet(R_SPAWN_J, clamp01((t - (s._k1 ?? 0) - 0.6) / 2.4), 0.9);
      routeSet(R_SPAWN_P, clamp01((t - (s._k1 ?? 0) - 1.2) / 2.4), 0.9);
      mtag(136.9, 37.6, "能登半島より西", clamp01((t - (s._k1 ?? 0) - 2.2) / 0.4), "gold", -40);
      mtag(139.4, 33.7, "伊豆諸島より西", clamp01((t - (s._k1 ?? 0) - 2.8) / 0.4), "gold", 30);
      legend([["#ff9f40", "産卵が見られる範囲"]], clamp01((t - (s._k1 ?? 0) - 1) / 0.4));
    }
    if (k >= 2) {
      const a = clamp01((t - (s._k2 ?? 0)) / 0.4), P = PORTRAIT;
      const bar = (lab, m0, m1, col) => `<div style="display:flex;align-items:center;gap:14px;margin-top:10px"><b style="width:${P ? 150 : 140}px;font-size:28px">${lab}</b><div style="position:relative;flex:1;height:34px;background:#e6edf3;border-radius:8px"><div style="position:absolute;left:${(m0 - 1) / 12 * 100}%;width:${(m1 - m0 + 1) / 12 * 100}%;top:0;bottom:0;background:${col};border-radius:8px"></div></div></div>`;
      html += card(P ? 60 : 110, P ? 1180 : 150, P ? 880 : 740, `<b style="font-size:36px">産卵期（月）</b>${bar("太平洋側", 1, 5, "#5ee08a")}${bar("日本海側", 1, 7, "#ffd166")}<div style="display:flex;justify-content:space-between;margin:6px 0 0 ${P ? 164 : 154}px;font-size:22px;color:#3a5a78">${[1, 3, 5, 7, 9, 11].map((m) => `<span>${m}月</span>`).join("")}</div><div style="font-size:24px;color:#3a5a78;margin-top:8px">九州西岸の盛期は4〜5月と推定</div>`, a, "padding:22px 28px");
    }
    html += srcLine("水産研究・教育機構「令和7（2025）年度ブリの資源評価」");
  },
  by_mojako(t, d, s, k) {
    base(0);
    academyBadge();
    show(moba);
    show(mojako);
    updateSchool(mojako, t, V(-6 + Math.sin(t * 0.3) * 0.6, -1.5, 24), V(1.8, 0.45, 1.2), Math.cos(t * 0.3) > 0 ? 1 : -1);
    look(V(-6 + Math.sin(t * 0.06) * 2, -4.6, 33), V(-6, -1.0, 24), 55);
    label(V(-6, -0.4, 24), "流れ藻", "海に浮かぶ海藻のかたまり", clamp01(t / 0.6), "", -260, -40);
    label(V(-5, -1.5, 24.5), "モジャコ", "ブリの子ども", clamp01((t - 1.2) / 0.5), "gold ans", 260, 120);
    if (k >= 1) {
      const a = clamp01((t - (s._k1 ?? 0)) / 0.4), P = PORTRAIT;
      html += card(P ? 80 : 110, P ? 1060 : 560, P ? 840 : 700, `<div style="font-size:40px;font-weight:900">全長 <span style="color:#1e7a36;font-size:58px">約3cm</span> で魚を食べ始める</div><div style="font-size:40px;font-weight:900;margin-top:8px"><span style="color:#1e7a36;font-size:58px">13cm</span> をこえると魚だけを食べる</div><div style="font-size:24px;color:#3a5a78;margin-top:8px">水産研究・教育機構「令和7（2025）年度ブリの資源評価」</div>`, a, "padding:22px 28px");
    }
    if (k >= 2) {
      const a = clamp01((t - (s._k2 ?? 0)) / 0.4), P = PORTRAIT;
      html += card(P ? 80 : 110, P ? 330 : 150, P ? 840 : 760, `<b style="font-size:38px">流れ藻の量で、やって来る数が大きく変わる</b><div style="font-size:24px;color:#3a5a78;margin-top:6px">環境省「せとうちネット」ハマチ</div>`, a, "padding:20px 28px");
    }
  },
  by_mojamap(t, d, s, k) {
    mapBase();
    academyBadge();
    mapCam([131.5, 33.2, 46], [132.5, 34.6, 52], ease(clamp01(t / d)));
    const t0 = t - (s._k0 ?? 0);
    const pins = [[130.4, 30.4, "3〜4月", "薩南", 0.3, -40, 120], [128.6, 32.5, "4〜5月", "九州西岸・五島", 2.4, -120, -60], [132.6, 31.6, "4〜5月", "日向灘", 3.6, 90, 40], [136.6, 33.4, "4〜5月", "熊野灘", 4.4, 40, 110]];
    pins.forEach(([lo, la, m, n, at, dx, dy]) => label(MG(lo, la), m, n, clamp01((t0 - at) / 0.5), "gold", dx, dy));
    if (k >= 1) label(MG(133.2, 36.55), "6月", "隠岐の周り", clamp01((t - (s._k1 ?? 0)) / 0.5), "gold ans", 0, -70);
    if (k < 2) legend([["#ffd166", "モジャコが見られる時期"]]);
    if (k >= 2) {
      const a = clamp01((t - (s._k2 ?? 0)) / 0.4), P = PORTRAIT;
      html += card(P ? 80 : 1160, P ? 1150 : 150, P ? 840 : 680, `<div style="font-size:40px;font-weight:900">尾叉長 <span style="color:#1e7a36;font-size:58px">約7cm</span> で<br>流れ藻を離れて沿岸へ</div><div style="font-size:24px;color:#3a5a78;margin-top:8px">環境省「せとうちネット」ハマチ</div>`, a, "padding:22px 28px");
    }
    html += srcLine("水産研究・教育機構「令和7（2025）年度ブリの資源評価」");
  },
  by_grow(t, d, s, k) {
    base(0);
    academyBadge();
    const m1 = k >= 1 ? ease(clamp01((t - (s._k1 ?? 0)) / 1.2)) : 0;
    const names = ["ツバス 約20cm", "ハマチ 約40cm", "メジロ 約60cm", "ブリ 約80cm"];
    const ages = ["1歳 約41cm", "2歳 約60cm", "3歳 約72cm", "4歳 約80cm"];
    const kg = ["約1.0kg", "約3.5kg", "約6.0kg", "約8.1kg"];
    const mature = ["0%", "50%", "100%", "100%"];
    byRuler.forEach((m, i) => {
      const L = lerp(BY_NAME[i], BY_AGE[i], m1);
      m.visible = true;
      m.scale.set(L, L, 1);
      m.position.set(-4 - (8 - L) / 2, -1.0 - i * 2.3, 24);
    });
    look(V(-4.5, -4.4, PORTRAIT ? 45 : 41), V(-4.5, -4.4, 24), 42);
    byRuler.forEach((m, i) => {
      const L = lerp(BY_NAME[i], BY_AGE[i], m1), p = V(-4 - (8 - L) / 2 - L / 2, -1.0 - i * 2.3, 24);
      const a = k >= 1 ? 1 : clamp01((t - 0.3 - i * 0.5) / 0.3);
      const txt = k >= 1 ? ages[i] : names[i];
      const sub = k >= 3 ? `大人の割合 ${mature[i]}` : k >= 2 ? kg[i] : "";
      label(p, txt, sub, a, k >= 3 && i >= 2 ? "gold ans" : i === 3 ? "gold" : "", -60, -10);
    });
    const P = PORTRAIT;
    const head = k >= 1 ? "成長の目安（尾叉長・1月の時点）" : "関西での呼び名（大きさの目安）";
    html += `<div style="position:absolute;left:0;right:0;top:${P ? 250 : 110}px;text-align:center;color:#fff;font-weight:900;font-size:${P ? 44 : 40}px;text-shadow:0 3px 12px rgba(0,0,0,.6)">${head}</div>`;
    html += srcLine(k >= 1 ? "水産研究・教育機構「令和7（2025）年度ブリの資源評価」（太平洋・千葉以西）" : "環境省「せとうちネット」ハマチ");
  },
  by_route(t, d, s, k) {
    mapBase();
    academyBadge();
    mapCam([134.2, 37.8, 54], [134.2, 37.4, 57], ease(clamp01(t / d)));
    SPAWN.visible = true;
    const t1 = t - (s._k1 ?? 0), t2 = t - (s._k2 ?? 0);
    routeSet(R_NORTH, k >= 1 ? 1 : clamp01(t / 2.5), 1, -1);
    if (k === 0) {
      fishOnRoute(mapFish[0], R_NORTH, 1 - ((t * 0.07) % 1), t, true);
      label(MG(138.6, 39.6), "冬〜春に南へ", "卵を産むため", clamp01((t - 1) / 0.5), "red", 140, -40);
    }
    if (k >= 1) {
      routeSet(R_MID, clamp01(t1 / 2), 1, 0);
      const u = 0.5 + 0.48 * Math.sin(t * 0.35);
      fishOnRoute(mapFish[0], R_NORTH, u, t, Math.cos(t * 0.35) < 0);
      fishOnRoute(mapFish[1], R_MID, 0.5 + 0.48 * Math.sin(t * 0.5 + 1), t, Math.cos(t * 0.5 + 1) < 0);
      label(MG(140.0, 42.6), "北部型", "北海道沿岸 ⇔ 東シナ海", clamp01((t1 - 0.4) / 0.5), "red", 180, -40);
      label(MG(134.3, 36.3), "中・西部型", "能登半島以西の日本海 ⇔ 東シナ海", clamp01((t1 - 1.6) / 0.5), "gold", -160, -110);
    }
    if (k >= 2) {
      R_PAC.forEach((r, i) => routeSet(r, clamp01((t2 - i * 0.5) / 1.6), 1, 0));
      label(MG(135.5, 32.6), "太平洋側の小さな回遊群", "遠州灘〜四国南西岸・紀伊水道〜薩南 など", clamp01((t2 - 1) / 0.5), "ans", 160, 130);
    }
    legend([["#ff6b5a", "北部型"], ["#ffd166", "中・西部型"], ["#5ee08a", "太平洋側"]].slice(0, k >= 2 ? 3 : k >= 1 ? 2 : 1));
    html += srcLine("水産研究・教育機構「令和7（2025）年度ブリの資源評価」");
  },
  by_north(t, d, s, k) {
    mapBase();
    academyBadge();
    const k2 = k >= 2 ? ease(clamp01((t - (s._k2 ?? 0)) / 1.5)) : 0;
    mapCam([142.0, 43.6, 44], [136.8, 40.6, 52], k2);
    const P = PORTRAIT;
    if (k <= 1) {
      label(MG(145.3, 43.9), "根室海峡のあたりでも増加", "2013年以降", clamp01((t - 2.5) / 0.5), "gold", 0, -80);
      html += card(P ? 80 : 110, P ? 1100 : 560, P ? 840 : 640, `<b style="font-size:34px">北海道のブリの漁獲（2024年）</b><div style="font-size:72px;font-weight:900;color:#1e7a36">約1.6万トン</div><div style="font-size:30px;font-weight:800">2011年以降に急に増えた</div><div style="font-size:22px;color:#3a5a78;margin-top:6px">水産研究・教育機構「令和7（2025）年度ブリの資源評価」</div>`, clamp01(t / 0.5), "padding:22px 28px");
    }
    if (k === 1) {
      routeSet(R_NORTH, 1, 1, 1);
      fishOnRoute(mapFish[0], R_NORTH, 0.7 + ((t * 0.05) % 0.29), t, false, 0.9);
      html += card(P ? 80 : 1150, P ? 300 : 150, P ? 840 : 680, `<b style="font-size:34px">北海道の研究機関の報告</b><div style="font-size:32px;font-weight:800;margin-top:8px">・ブリの資源が増えた<br>・大きく泳ぐ力の強いブリが増え、より北まで回遊</div>`, clamp01((t - (s._k1 ?? 0)) / 0.4), "padding:22px 28px");
    }
    if (k >= 2) {
      WARM.visible = true;
      WARM.material.uniforms.latN.value = lerp(39.0, 45.7, ease(clamp01((t - (s._k2 ?? 0) - 2.5) / 5)));
      mtag(141.9, 45.75, "宗谷", 1, "", -36);
      label(MG(131.5, 39.6), "6月に14℃以上の日本海", "模式図", clamp01((t - (s._k2 ?? 0) - 1.5) / 0.5), "gold", -120, -60);
      label(MG(140.6, 45.2), "2010年代", "宗谷まで届く年が多く", clamp01((t - (s._k2 ?? 0) - 7.2) / 0.5), "gold ans", 260, 90);
      html += card(P ? 80 : 110, P ? 1150 : 600, P ? 840 : 560, `<b style="font-size:32px">ブリが暮らせる水温の下限の目安</b><div style="font-size:72px;font-weight:900;color:#c62828">14℃</div>`, clamp01((t - (s._k2 ?? 0) - 0.5) / 0.4), "padding:20px 28px");
    }
    html += srcLine(k >= 1 ? "星野昇「北海道におけるブリの来遊状況」北水試だより94号（2017）" : "水産研究・教育機構「令和7（2025）年度ブリの資源評価」");
  },
  by_stock(t, d, s, k) {
    base(0);
    academyBadge();
    byBg(t + 10);
    html += dim();
    const P = PORTRAIT;
    const W0 = P ? 940 : 1200, L0 = P ? 70 : 360, T0 = P ? 300 : 110;
    html += `<div style="position:absolute;left:${L0}px;top:${T0}px;width:${W0}px;background:rgba(255,255,255,.95);border-radius:28px;padding:26px 30px">${byChart(k, t - (k >= 1 ? s._k1 ?? 0 : s._k0 ?? 0))}</div>`;
  },
  by_kansai(t, d, s, k) {
    mapBase();
    academyBadge();
    mapCam([134.0, 35.6, 50], [134.4, 34.6, 30], ease(clamp01(t / 4)));
    WARM.visible = false;
    const c = V(0, 0, 0);
    // 瀬戸内海の若い魚
    const { off } = mapFish[0].userData;
    mapFish[0].visible = true;
    off.forEach((o, i) => {
      const lo = 133.6 + Math.sin(t * 0.2 * o.w + o.p) * 1.4 + o.x * 0.6, la = 34.25 + o.y * 0.12;
      const p = MG(lo, la, 1.1);
      _e2.set(-Math.PI / 2, Math.cos(t * 0.2 * o.w + o.p) > 0 ? 0 : Math.PI, 0);
      _q.setFromEuler(_e2);
      _s.setScalar(o.s * 0.5);
      _m.compose(p, _q, _s);
      mapFish[0].setMatrixAt(i, _m);
    });
    mapFish[0].instanceMatrix.needsUpdate = true;
    mtag(133.4, 34.3, "瀬戸内海", 1, "gold", -60);
    mtag(135.25, 34.45, "大阪湾", clamp01((t - 1) / 0.5), "", 0);
    const P = PORTRAIT;
    html += card(P ? 80 : 110, P ? 1130 : 600, P ? 840 : 720, `<b style="font-size:36px">若い魚は瀬戸内海に入り<br><span style="color:#1e7a36;font-size:56px">2歳くらいまで</span> とどまる</b><div style="font-size:22px;color:#3a5a78;margin-top:6px">環境省「せとうちネット」ハマチ</div>`, k === 0 ? clamp01((t - 1.5) / 0.4) : 0, "padding:22px 28px");
    if (k >= 1) html += card(P ? 80 : 110, P ? 1130 : 600, P ? 840 : 720, `<b style="font-size:36px">とられるブリの数の<br><span style="color:#c62828;font-size:64px">7〜9割</span> は0歳と1歳</b><div style="font-size:22px;color:#3a5a78;margin-top:6px">水産研究・教育機構「令和7（2025）年度ブリの資源評価」</div>`, k === 1 ? clamp01((t - (s._k1 ?? 0)) / 0.4) : 0, "padding:22px 28px");
    if (k >= 2) {
      html += dim(0.5 * clamp01((t - (s._k2 ?? 0)) / 0.5));
      html += `<div class="big" style="top:${P ? 300 : 120}px;font-size:${P ? 72 : 60}px;opacity:${clamp01((t - (s._k2 ?? 0)) / 0.5)}">釣り人にできること</div>`;
      [["食べる分だけ持ち帰る"], ["小さなツバス・ハマチは大切に"], ["地域や釣り場のルールを確かめる"]].forEach(([h], i) => {
        const a = clamp01((t - (s._k2 ?? 0) - 1.2 - i * 0.8) / 0.4);
        html += card(P ? 80 : 460, (P ? 520 : 270) + i * (P ? 170 : 150), P ? 840 : 920, `<b style="font-size:44px"><span style="color:#2ecc71">✔</span> ${h}</b>`, a, "padding:22px 30px");
      });
    }
  },
  by_sum(t, d, s, k) {
    base(0);
    academyBadge();
    byBg(t + 40);
    html += dim();
    const P = PORTRAIT;
    html += `<div class="big" style="top:${P ? 280 : 100}px;font-size:${P ? 72 : 60}px">まとめ</div>`;
    [["生まれ", "東シナ海の大陸棚のふちなど。産卵期は1〜7月"], ["モジャコ", "流れ藻の下で育ち、約7cmで沿岸へ"], ["回遊", "北部型・中・西部型、太平洋側の小さな群れ"], ["成長", "4歳で約80cm。2歳前後から大人に"], ["いま", "資源量は多いが、若い魚（加入量）は2024年に最少"]].forEach(([a1, b1], i) => {
      html += rowCard(P, i, clamp01((t - 0.4 - i * 0.4) / 0.3), a1, b1, P ? 440 : 200, P ? 180 : 140, i === 4 ? "#c62828" : "#1f6fb2");
    });
  },
});
// 資源のグラフ（水産研究・教育機構「令和7（2025）年度ブリの資源評価」）
// step 0：資源量、1：加入量（若い魚の数）、2：親魚量の注記
function byChart(step, tt) {
  const P = PORTRAIT, g = clamp01(tt / 1.2);
  const bars = (rows, max, unit, H) => `<div style="display:flex;gap:14px;height:${H + 100}px;align-items:flex-end;margin-top:14px;border-bottom:4px solid #10345a">${rows.map(([lab, v0, v1, col, txt], i) => {
    const gi = clamp01(g * 1.6 - i * 0.3);
    const h1 = (v1 / max) * H * gi, h0 = (v0 / max) * H * gi;
    return `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center">
      <b style="font-size:${P ? 34 : 36}px;color:#10345a;opacity:${gi}">${txt}</b>
      <div style="width:60%;height:${h1 - h0}px;background:${col};border-radius:12px 12px ${v0 ? 12 : 0}px ${v0 ? 12 : 0}px;margin-bottom:${h0}px;${v0 ? "opacity:.75;background:repeating-linear-gradient(45deg," + col + " 0 12px,#9fb8cc 12px 20px)" : ""}"></div>
      <div style="font-size:${P ? 28 : 30}px;font-weight:900;color:#10345a;margin-top:6px;white-space:nowrap">${lab}</div></div>`;
  }).join("")}</div>`;
  const H = P ? 480 : 330;
  let h = "";
  if (step === 0) {
    h = `<div style="font-size:${P ? 38 : 36}px;font-weight:900;color:#10345a">ブリの資源量（万トン）</div>` +
      bars([["1994〜2008年", 14.1, 22.4, "#7fa3c2", "14〜22"], ["2022年（最高）", 0, 39.2, "#2ecc71", "39.2"], ["2024年", 0, 34.3, "#1f6fb2", "34.3"]], 40, "万トン", H);
  } else {
    h = `<div style="font-size:${P ? 38 : 36}px;font-weight:900;color:#10345a">加入量（その年に加わる若い魚の数・億尾）</div>` +
      bars([["1994〜2008年", 0.69, 1.34, "#7fa3c2", "0.7〜1.3"], ["2020年", 0, 1.89, "#7fa3c2", "1.89"], ["2024年", 0, 0.69, "#e3412b", "0.69"]], 2, "億尾", H) +
      `<div style="font-size:${P ? 40 : 36}px;font-weight:900;color:#c62828;margin-top:12px;text-align:center;opacity:${clamp01(tt - 1.5)}">2024年は1994年以降で最も少ない</div>`;
    if (step >= 2) h += `<div style="font-size:${P ? 32 : 30}px;font-weight:900;color:#1e7a36;margin-top:8px;text-align:center">親魚の量は21.6万トン：管理の目安（17.9万トン）を上回る</div>`;
  }
  return h + `<div style="font-size:22px;color:#3a5a78;margin-top:10px">出典：水産研究・教育機構「令和7（2025）年度ブリの資源評価」、水産庁（2025年12月）</div>`;
}


// =====================================================================
// タチウオはなぜ夜に釣れる？（cg-tachiuo、tc_*）：徳島県・三重県・水産研究・教育機構・気象庁の資料にもとづく
// =====================================================================
const tcSchool = school("タチウオ", 18, 2.7, 701, { amp: 0.03, freq: 4 });
world.add(tcSchool);
extras.push(tcSchool);
const TC = V(10, 0, 14); // 群れを見せる沖の場所（海底は約 -10.2）
const TC_BOT = seabedY(TC.x, TC.z);
// 時刻（0〜24、24 以上は翌日）→ 群れの深さ（y）。徳島県の資料（若狭湾の報告の引用）の模式
function tcDepth(h) {
  const x = ((h % 24) + 24) % 24;
  const bot = TC_BOT + 1.4, mid = -4.2, up = -3.0;
  if (x >= 8 && x < 16) return bot;
  if (x >= 16 && x < 19.5) return lerp(bot, mid, smooth01((x - 16) / 3.5));
  if (x >= 19.5 || x < 3) return mid;
  if (x < 4.8) return lerp(mid, bot + 1.2, smooth01((x - 3) / 1.8)); // 夜明け前は深く
  if (x < 6) return lerp(bot + 1.2, up, smooth01((x - 4.8) / 1.2)); // 朝まずめに一時浅く
  return lerp(up, bot, smooth01((x - 6) / 2)); // 日の出のあとは底へ
}
function tcNight(h) {
  const x = ((h % 24) + 24) % 24;
  if (x >= 7 && x < 17) return 0;
  if (x >= 17 && x < 19) return smooth01((x - 17) / 2);
  if (x >= 5 && x < 7) return 1 - smooth01((x - 5) / 2);
  return 1;
}
function tcPlace(T, y, spread = 1) {
  tcSchool.visible = true;
  const { off } = tcSchool.userData;
  for (let i = 0; i < off.length; i++) {
    const o = off[i];
    const p = V(TC.x + o.x * 5.5 + Math.sin(T * 0.3 * o.w + o.p) * 0.4, Math.min(-0.8, y + o.y * 1.1 * spread + Math.sin(T * 0.5 + o.p) * 0.15), TC.z + o.z * 3);
    _e2.set(0, o.p, Math.PI / 2 - 0.15 + Math.sin(T * 0.4 + o.p) * 0.05);
    _q.setFromEuler(_e2);
    _s.setScalar(o.s);
    _m.compose(p, _q, _s);
    tcSchool.setMatrixAt(i, _m);
  }
  tcSchool.instanceMatrix.needsUpdate = true;
}
const tcCam = (t) => look(V(TC.x - 2 + Math.sin(t * 0.05) * 1.5, -4.6, TC.z + (PORTRAIT ? 22 : 17)), V(TC.x, -5.0, TC.z), 52);
// 24時間の時計（昼は黄色、夜は紺）
function tcClock(h, a = 1) {
  const x = ((h % 24) + 24) % 24, P = PORTRAIT;
  const ang = (x / 24) * 360 - 90, R = 70;
  const hx = 90 + Math.cos((ang * Math.PI) / 180) * R * 0.78, hy = 90 + Math.sin((ang * Math.PI) / 180) * R * 0.78;
  const arc = (h0, h1, col) => { const a0 = ((h0 / 24) * 360 - 90) * Math.PI / 180, a1 = ((h1 / 24) * 360 - 90) * Math.PI / 180; return `<path d="M${90 + Math.cos(a0) * R},${90 + Math.sin(a0) * R} A${R},${R} 0 ${h1 - h0 > 12 ? 1 : 0} 1 ${90 + Math.cos(a1) * R},${90 + Math.sin(a1) * R}" stroke="${col}" stroke-width="18" fill="none"/>`; };
  const name = x >= 8 && x < 16 ? "昼" : x >= 16 && x < 19 ? "夕方" : x >= 19 || x < 3 ? "夜" : x < 4.8 ? "夜明け前" : x < 6.3 ? "朝まずめ" : "日の出のあと";
  const hh = Math.floor(x), mm = Math.floor((x - hh) * 60 / 10) * 10;
  html += `<div style="position:absolute;${P ? "left:40px;top:230px" : "left:70px;top:120px"};opacity:${a};display:flex;align-items:center;gap:18px;background:rgba(6,22,42,.82);border-radius:22px;padding:12px 22px 12px 12px">
    <svg width="180" height="180" viewBox="0 0 180 180">${arc(6, 18, "#ffd166")}${arc(18, 30, "#2a4f8a")}
    <line x1="90" y1="90" x2="${hx}" y2="${hy}" stroke="#fff" stroke-width="8" stroke-linecap="round"/><circle cx="90" cy="90" r="9" fill="#fff"/>
    <text x="90" y="14" fill="#fff" font-size="16" text-anchor="middle" font-weight="700">0時</text><text x="90" y="178" fill="#fff" font-size="16" text-anchor="middle" font-weight="700">12時</text></svg>
    <div style="color:#fff;font-weight:900"><div style="font-size:${P ? 64 : 58}px;line-height:1">${hh}:${String(mm).padStart(2, "0")}</div><div style="font-size:${P ? 40 : 36}px;color:#ffd166">${name}</div></div></div>`;
}
// 深さの目盛り（左側）
function tcRuler(a = 1) {
  const pts = [[0, "表層"], [-4.6, "中層"], [TC_BOT + 0.4, "底（海底付近）"]];
  pts.forEach(([y, txt]) => {
    const q = project(V(TC.x + 9, y, TC.z));
    html += `<div style="position:absolute;right:${PORTRAIT ? 40 : 70}px;top:${q.y}px;transform:translateY(-50%);opacity:${a};display:flex;align-items:center;gap:10px;flex-direction:row-reverse;color:#fff;font-weight:900;font-size:${PORTRAIT ? 30 : 30}px;text-shadow:0 2px 6px #000"><span style="width:44px;height:5px;background:#bfe6ea;display:inline-block"></span>${txt}</div>`;
  });
}
// 地図の上の棒グラフ（漁獲量）
const tcBars = {};
[["wakayama", 135.35, 34.05, 0x7fa3c2], ["tokushima", 134.45, 33.95, 0x7fa3c2], ["chiba", 140.15, 35.45, 0x2ecc71]].forEach(([k, lo, la, col]) => {
  const [x, z] = geo(lo, la);
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1, 0.9).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false }));
  const solid = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1, 0.9).translate(0, 0.5, 0), shadedMat(col, { rough: 0.05 }));
  ghost.position.set(x, 0.5, z);
  solid.position.set(x, 0.5, z);
  ghost.renderOrder = 11;
  jmap.add(ghost, solid);
  tcBars[k] = { ghost, solid, lo, la };
});
const tcRulerFish = [0, 1, 2].map(() => { const f = fishMesh("タチウオ", 1, { amp: 0.03, freq: 4 }); f.rotation.z = Math.PI / 2 - 0.1; world.add(f); extras.push(f); return f; });
const TC_H = 1 / 1800; // 1800トンで1
function tcBar(k, ghostT, solidT, gk, sk) {
  const b = tcBars[k];
  b.ghost.visible = ghostT > 0 && gk > 0.01;
  b.solid.visible = solidT > 0 && sk > 0.01;
  b.ghost.scale.y = Math.max(0.01, ghostT * TC_H * gk);
  b.solid.scale.y = Math.max(0.01, solidT * TC_H * sk);
}
function tcBarsOff() { Object.values(tcBars).forEach((b) => { b.ghost.visible = b.solid.visible = false; }); }
const _mapBase0 = mapBase;
mapBase = function () { _mapBase0(); tcBarsOff(); };
const tcSrc = (txt) => srcLine(txt);

Object.assign(SHOTS, {
  tc_thumb(t, d, s) {
    base(0.55);
    tcPlace(12, -3.6, 1.2);
    show(sardines);
    updateSchool(sardines, 12, V(TC.x + 3, -2.2, TC.z), V(5, 0.6, 2), 1);
    look(V(TC.x - 1, -4.2, TC.z + 12), V(TC.x + 3, -3.4, TC.z), 55);
    html += `<div style="position:absolute;left:0;top:0;bottom:0;width:1050px;background:linear-gradient(90deg,rgba(2,14,28,.85),rgba(2,14,28,0))"></div>`;
    html += `<div style="position:absolute;left:70px;top:200px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px;background:#10345a;color:#ffd166;border:3px solid #ffd166">${s.tag}</span><div style="font-size:150px;line-height:1.1;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
  },
  tc_hook(t, d) {
    const h = lerp(14, 20, ease(clamp01(t / d)));
    base(tcNight(h) * 0.6);
    academyBadge();
    tcPlace(t, tcDepth(h));
    tcCam(t);
    tcClock(h, clamp01((t - 0.5) / 0.5));
    const a = clamp01(t / 0.4);
    bigText(PORTRAIT ? 600 : 130, "タチウオはなぜ<br>夜に釣れる？", "答えは「深さ」にある", a);
  },
  tc_day(t, d, s, k) {
    const k1 = s._k1 ?? d * 0.5, k2 = s._k2 ?? d;
    const h = s._k1 === undefined ? lerp(12, 22, ease(clamp01(t / d))) : t < k1 ? lerp(12, 26, ease(clamp01(t / k1))) : lerp(26, 32.5, ease(clamp01((t - k1) / Math.max(1, k2 - k1 - 0.5))));
    base(tcNight(h) * 0.6);
    academyBadge();
    tcPlace(t, tcDepth(h), (h % 24) >= 19.5 || (h % 24) < 3 ? 1.6 : 0.8);
    tcCam(t);
    tcClock(h);
    tcRuler();
    label(V(TC.x + 2, tcDepth(h) + 1.2, TC.z), "タチウオの群れ", "", 1, "gold", 260, -40);
    if (k >= 2) {
      const P = PORTRAIT;
      html += card(P ? 80 : 1150, P ? 1150 : 150, P ? 840 : 660, `<b style="font-size:34px">紀伊水道の延縄の調査</b><div style="font-size:38px;font-weight:900;margin-top:8px">昼：<span style="color:#1f6fb2">底の層</span>　夜：<span style="color:#1e7a36">水深30m付近の中層</span></div>`, clamp01((t - k2) / 0.4), "padding:22px 28px");
    }
    html += tcSrc(k >= 2 ? "上田・池脇「タチウオ曳縄の海中での動き」徳島水研だより105号（2018）" : "若狭湾西部の調査（宗清 1990）／徳島水研だより105号（2018）での引用による");
  },
  tc_why(t, d, s, k) {
    const night = k !== 1;
    const h = k === 1 ? 13 : 20;
    base(tcNight(h) * 0.6);
    academyBadge();
    tcPlace(t, tcDepth(h), night ? 1.6 : 0.8);
    tcCam(t + 20);
    tcClock(h);
    tcRuler();
    if (k === 0) label(V(TC.x - 3, -2.6, TC.z), "堤防からの仕掛けが届きやすい", "夜は浅いタナへ上がる", clamp01((t - 1) / 0.5), "gold ans", -160, -90);
    if (k === 1) label(V(TC.x, TC_BOT + 1.6, TC.z), "昼は底近く", "狙うなら底のタナ", clamp01((t - (s._k1 ?? 0)) / 0.5), "gold ans", 0, -150);
    if (k >= 2) {
      show(sardines);
      updateSchool(sardines, t, V(TC.x + 2, -2.4, TC.z), V(5, 0.6, 2), 1);
      label(V(TC.x + 4, -2.2, TC.z), "カタクチイワシなどの小魚", "エビの仲間も食べる", clamp01((t - (s._k2 ?? 0)) / 0.5), "", 160, -80);
    }
    html += tcSrc(k >= 2 ? "水産研究・教育機構「令和6（2024）年度 資源評価調査報告書 タチウオ（太平洋中・南部）」" : "若狭湾の調査をもとにした考え方（目安）");
  },
  tc_season(t, d, s, k) {
    mapBase();
    academyBadge();
    mapCam([135.0, 33.75, 13], [134.95, 33.55, 15], ease(clamp01(t / d)));
    const t1 = t - (s._k1 ?? 0);
    // 春：南から紀伊水道へ入る／11月：南の深場へ
    const { off } = mapFish[0].userData;
    mapFish[0].visible = true;
    const u = k === 0 ? clamp01((t - 1) / 6) : k === 1 ? 1 - clamp01(t1 / 5) : 0;
    off.forEach((o, i) => {
      const la = lerp(33.2, 34.1, u) + o.y * 0.12, lo = 134.95 + o.x * 0.18;
      const p = MG(lo, la, 1.1);
      _e2.set(-Math.PI / 2, k === 1 ? -Math.PI / 2 : Math.PI / 2, 0);
      _q.setFromEuler(_e2);
      _s.setScalar(o.s * 0.3);
      _m.compose(p, _q, _s);
      mapFish[0].setMatrixAt(i, _m);
    });
    mapFish[0].instanceMatrix.needsUpdate = true;
    if (k >= 2) mapFish[0].visible = false;
    mtag(134.9, 34.0, "紀伊水道", 1, "", 0);
    mtag(135.3, 34.55, "大阪湾", 1, "", 0);
    if (k === 0) label(MG(134.95, 33.8), "4月ごろ 北へ", "水温が上がると紀伊水道へ", clamp01((t - 1.5) / 0.5), "gold", 280, 60);
    if (k >= 0) label(MG(134.95, 33.95), "水温18℃くらいの水に集まる", "", clamp01((t - 0.3) / 0.5) * (k === 0 ? 1 : 0), "", -260, -120);
    if (k >= 1) label(MG(134.95, 33.25), "11月ごろ 南の深場へ", "海底谷（水深100〜300m）で冬越し（推定）", clamp01(t1 / 0.5), "gold ans", 0, 120);
    if (k >= 2) {
      const P = PORTRAIT;
      html += card(P ? 80 : 110, P ? 1150 : 150, P ? 840 : 700, `<b style="font-size:34px">徳島県の調査</b><div style="font-size:38px;font-weight:900;margin-top:8px">水温が下がる<span style="color:#c62828">11月以降</span>、<br>沿岸の漁場で少なくなる</div>`, clamp01((t - (s._k2 ?? 0)) / 0.4), "padding:22px 28px");
    }
    html += tcSrc(k >= 2 ? "吉見・和田「資源動向調査（タチウオ）」徳島県" : "水産研究・教育機構「令和6（2024）年度 資源評価調査報告書 タチウオ（太平洋中・南部）」　※位置はおおよそ");
  },
  tc_grow(t, d, s, k) {
    base(0);
    academyBadge();
    const PLs = [20, 28, 35];
    tcRulerFish.forEach((f, i) => {
      const L = (PLs[i] / 35) * 4.4;
      f.visible = true;
      f.scale.set(L, L, 1);
      f.position.set(-10 + i * 3.8, -5.6 + Math.sin(t * 0.6 + i) * 0.08, 24);
    });
    look(V(-4.2, -4.9, PORTRAIT ? 40 : 35), V(-4.2, -4.9, 24), 45);
    ["1歳 約20cm", "2歳 約28cm", "3歳 約35cm"].forEach((txt, i) => label(V(-10 + i * 3.8, -5.6 + (PLs[i] / 35) * 2.2, 24), txt, "肛門前長", clamp01((t - 0.4 - i * 0.5) / 0.4), i === 2 ? "gold" : "", 0, -40));
    const P = PORTRAIT;
    html += `<div style="position:absolute;left:0;right:0;top:${P ? 250 : 110}px;text-align:center;color:#fff;font-weight:900;font-size:${P ? 40 : 38}px;text-shadow:0 3px 12px rgba(0,0,0,.6)">紀伊水道のタチウオの成長の目安（肛門前長＝頭の先から肛門まで）</div>`;
    if (k >= 1) html += card(P ? 80 : 1150, P ? 1150 : 560, P ? 840 : 680, `<b style="font-size:36px">1歳から卵を産み始める</b><div style="font-size:30px;font-weight:800;margin-top:8px">メス：肛門前長 約21cmで成熟<br>産卵は主に4〜11月（春〜夏と秋の2つの群れ）</div>`, clamp01((t - (s._k1 ?? 0)) / 0.4), "padding:22px 28px");
    html += tcSrc("水産研究・教育機構「令和6（2024）年度 資源評価調査報告書 タチウオ（太平洋中・南部）」");
  },
  tc_now(t, d, s, k) {
    mapBase();
    academyBadge();
    const t1 = t - (s._k1 ?? 0);
    const kc = k >= 1 ? ease(clamp01(t1 / 3)) : 0;
    { const lo = lerp(135.4, 137.4, kc), la = lerp(33.6, 34.0, kc), h = lerp(20, 28, kc), c = MG(lo, la, 0); look(V(c.x - h * 0.25, h * 0.55, c.z + h * 1.05), V(c.x, 2.5, c.z - 2), 45); }
    const g = ease(clamp01((t - 0.5) / 2)), sd = ease(clamp01((t - 3) / 2));
    tcBar("wakayama", 11759, 311, g, sd);
    tcBar("tokushima", 2830, 75, g, sd);
    if (k >= 1) tcBar("chiba", 0, 1695, 0, ease(clamp01((t1 - 0.5) / 2)));
    const top = (k1, val) => { const b = tcBars[k1]; return MG(b.lo, b.la, val * TC_H + 0.6); };
    label(top("wakayama", 11759 * g), "和歌山県", `最大 約1万1700トン → 2023年 311トン`, g, "", -230, -40);
    label(top("tokushima", 2830 * g), "徳島県", `1976年 2830トン → 2023年 75トン`, g, "", -200, 120);
    if (k >= 1) label(top("chiba", 1695), "千葉県", "2023年 1695トン（過去最高・全国一）", clamp01((t1 - 1.5) / 0.5), "gold ans", 120, -60);
    legend([["rgba(255,255,255,.5)", "多かった時代"], ["#7fa3c2", "2023年"]]);
    if (k >= 2) {
      const P = PORTRAIT;
      html += card(P ? 80 : 110, P ? 1130 : 560, P ? 840 : 720, `<b style="font-size:32px">資料が挙げる要因</b><div style="font-size:34px;font-weight:900;margin-top:6px">漁獲の影響に加え、<span style="color:#c62828">黒潮の大蛇行</span>や温暖化などの環境の変化</div><div style="font-size:26px;color:#3a5a78;margin-top:6px">黒潮大蛇行：2017年8月〜2025年4月（気象庁）</div>`, clamp01((t - (s._k2 ?? 0)) / 0.4), "padding:22px 28px");
    }
    html += tcSrc(k >= 2 ? "水産研究・教育機構「令和6（2024）年度 資源評価調査報告書 タチウオ」、気象庁（2025年8月29日）" : "水産研究・教育機構「令和6（2024）年度 資源評価調査報告書 タチウオ（太平洋中・南部）」");
  },
  tc_kansai(t, d, s, k) {
    mapBase();
    academyBadge();
    mapCam([133.6, 33.6, 34], [133.6, 33.6, 36], ease(clamp01(t / d)));
    label(MG(135.15, 33.95), "和歌山県", "2004年から網の目を大きく（小さな魚を守る）", clamp01((t - 0.5) / 0.5), "gold", 200, -60);
    label(MG(134.6, 33.75), "徳島県", "秋は小さな魚が多い場所を避ける", clamp01((t - 2.5) / 0.5), "gold", 60, 130);
    if (k >= 1) label(MG(132.1, 33.1), "大分県", "2013年から春の産卵期に休漁", clamp01((t - (s._k1 ?? 0)) / 0.5), "gold", -200, -60);
    if (k >= 2) {
      const a0 = clamp01((t - (s._k2 ?? 0)) / 0.5), P = PORTRAIT;
      html += dim(0.5 * a0);
      html += `<div class="big" style="top:${P ? 300 : 120}px;font-size:${P ? 72 : 60}px;opacity:${a0}">釣り人にできること</div>`;
      [["小さなタチウオは持ち帰りすぎない"], ["食べる分だけ持ち帰る"], ["地域や釣り場のルールを確かめる"]].forEach(([h], i) => {
        const a = clamp01((t - (s._k2 ?? 0) - 1.2 - i * 0.8) / 0.4);
        html += card(P ? 80 : 460, (P ? 520 : 270) + i * (P ? 170 : 150), P ? 840 : 920, `<b style="font-size:44px"><span style="color:#2ecc71">✔</span> ${h}</b>`, a, "padding:22px 30px");
      });
    }
    html += tcSrc("水産研究・教育機構「令和6（2024）年度 資源評価調査報告書 タチウオ（太平洋中・南部）」");
  },
  tc_sum(t, d, s, k) {
    base(0.5);
    academyBadge();
    tcPlace(t, -3.6, 1.4);
    tcCam(t);
    html += dim();
    const P = PORTRAIT;
    html += `<div class="big" style="top:${P ? 280 : 100}px;font-size:${P ? 72 : 60}px">まとめ</div>`;
    [["1日", "昼は底、夜は中層〜表層。朝まずめに一時浅く"], ["季節", "4月ごろ紀伊水道へ、11月ごろ南の深場へ"], ["成長", "1歳で約20cm（肛門前長）、1歳から産卵"], ["いま", "和歌山・徳島は大きく減少、千葉は過去最高"], ["できること", "小さなタチウオは大切に、食べる分だけ"]].forEach(([a1, b1], i) => {
      html += rowCard(P, i, clamp01((t - 0.4 - i * 0.4) / 0.3), a1, b1, P ? 440 : 200, P ? 180 : 140, i === 3 ? "#c62828" : "#1f6fb2");
    });
  },
});


// =====================================================================
// 見える化・実戦編 第3弾：磯場、どこに投げる？（cg-iso、is_*）。沈み根・サラシ・溝
// =====================================================================
const IX = -80; // 磯の場所（本編の堤防から離れた x）
const ISO = new THREE.Group();
world.add(ISO);
extras.push(ISO);
const ROCK_MAT = shadedMat(0x5e5850, { rough: 0.4 });
const ROCK_MAT2 = shadedMat(0x6b6458, { rough: 0.35 });
function isoRock(x, z, r, top, seed, mat = ROCK_MAT, sx = 1, sz = 1) {
  const bot = seabedY(x, z) - 0.5;
  const m = new THREE.Mesh(makeRock(1, seed), mat);
  const sy = (top - bot) / 0.78;
  m.scale.set(r * sx, sy, r * sz);
  m.position.set(x, bot, z);
  m.rotation.y = seed * 1.3;
  ISO.add(m);
  return m;
}
// 岸の岩（陸）
{
  const r = rng(801);
  for (let i = 0; i < 18; i++) isoRock(IX - 34 + i * 4 + r() * 2, -3 + r() * 3, 3 + r() * 2.2, 2.2 + r() * 2.2, 810 + i, r() < 0.5 ? ROCK_MAT : ROCK_MAT2);
  for (let i = 0; i < 16; i++) isoRock(IX - 32 + i * 4.5 + r() * 2, -8 + r() * 2.5, 3.6 + r() * 2, 3.6 + r() * 2.4, 870 + i, r() < 0.5 ? ROCK_MAT2 : ROCK_MAT);
}
// 岸の上の岩場（堤防の地面をかくす）
{
  const g = new THREE.Mesh(new THREE.PlaneGeometry(110, 70, 40, 24).rotateX(-Math.PI / 2), ROCK_MAT2);
  const p = g.geometry.attributes.position, r = rng(805);
  for (let i = 0; i < p.count; i++) p.setY(i, r() * 0.6);
  g.geometry.computeVertexNormals();
  g.position.set(IX, 3.25, -40);
  ISO.add(g);
}
// 沖の岩（水面から出ている）
const ISO_REEF = { x: IX - 13, z: 15, r: 2.6 };
isoRock(ISO_REEF.x, ISO_REEF.z, ISO_REEF.r, 1.8, 830);
isoRock(ISO_REEF.x + 2.2, ISO_REEF.z + 1.6, 1.6, 0.9, 831, ROCK_MAT2);
// 沈み根（水の下にかくれた岩）
const NE = [{ x: IX + 3, z: 17, r: 4.2, top: -2.2 }, { x: IX + 7, z: 29, r: 3.2, top: -3.0 }, { x: IX - 13, z: 27, r: 3.4, top: -2.8 }];
NE.forEach((n, i) => { isoRock(n.x, n.z, n.r, n.top, 840 + i); isoRock(n.x + n.r * 0.5, n.z - n.r * 0.6, n.r * 0.55, n.top - 0.9, 850 + i, ROCK_MAT2); });
// 溝（沈み根の列のあいだの砂地）：x = IX-5 付近、z 6〜36
const MIZO = { x: IX - 5, z0: 6, z1: 36, w: 4 };
// 海の色が濃く見える所（沈み根の上）
const isoShade = NE.map((n) => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { op: { value: 0 } }, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float op; varying vec2 vP; void main(){ float r = length(vP); gl_FragColor = vec4(0.0,0.06,0.1, op * smoothstep(1.0,0.35,r)); }`,
  }));
  m.position.set(n.x, 0.12, n.z);
  m.scale.set(n.r * 1.3, 1, n.r * 1.1);
  m.renderOrder = 6;
  ISO.add(m);
  return m;
});
// サラシ（白い泡）
const SARASHI = [[IX - 13, 0.3, 13.2, 4.2, 2.6], [IX - 20, 0.3, 3.2, 5, 2.2], [IX + 8, 0.3, 3, 6, 2.2], [IX - 4, 0.3, 2.8, 4, 1.8]];
const isoFoam = SARASHI.map(([x, y, z, rx, rz], i) => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { time: U.time, op: { value: 1 }, ph: { value: i * 1.7 } }, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float time; uniform float op; uniform float ph; varying vec2 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){ float r = length(vP); float pulse = 0.75 + 0.25*sin(time*1.6 + ph);
        float fo = n(vP*5.0 + vec2(time*0.6, -time*0.4) + ph) * 0.6 + n(vP*11.0 - time*0.8) * 0.4;
        float a = smoothstep(1.0, 0.25, r / pulse) * smoothstep(0.35, 0.65, fo + 0.25*(1.0 - r));
        gl_FragColor = vec4(vec3(0.97,0.99,1.0), a * op * 0.92); }`,
  }));
  m.position.set(x, y, z);
  m.scale.set(rx, 1, rz);
  m.renderOrder = 7;
  ISO.add(m);
  return m;
});
const isoMan = mannequin(0x7d8a96, true);
world.add(isoMan);
extras.push(isoMan);
// 流れ（左→右）：沈み根・岩で曲がり、裏側でゆるくなる
FIELDS.iso = () => (x, z) => {
  let vx = 1.0, vz = 0.06 * Math.sin(x * 0.05 + z * 0.1);
  for (const n of [...NE, ISO_REEF]) {
    const R = n.r * 1.05, dx = x - n.x, dz = z - n.z, d2 = dx * dx + dz * dz;
    if (d2 < R * R) return [0.05, 0];
    const k = (R * R) / (d2 * d2);
    vx += -k * (dx * dx - dz * dz) * 0.9;
    vz += -k * 2 * dx * dz * 0.9;
    if (dx > 0) {
      const w = Math.exp(-dx / (3.2 * R)) * Math.exp(-((dz / (R * 1.1)) ** 2));
      vx *= 1 - 0.75 * w;
      vz += Math.sin(dz * 0.8 + dx * 0.4) * 0.25 * w;
    }
  }
  return [vx, vz];
};
let hideSurface = false;
function isoBase() {
  base(0);
  sky.visible = true;
  U.under.value = 0;
  U.chop.value = 0.25;
  ISO.visible = true;
  wall.visible = top.visible = false; // 磯にはコンクリートの壁はない
  if (WALL_BAR) WALL_BAR.visible = false;
  isoShade.forEach((m) => (m.material.uniforms.op.value = 0));
  isoFoam.forEach((m) => (m.material.uniforms.op.value = 1));
  FIELD = FIELDS.iso();
}
const isoTop = (cx, cz, dist, t = 0, d = 1) => topView(IX + cx, cz, dist, t, d);
// 水面を消して海の中を透かして見る（水中の色はつけ、霧は薄く）
function isoXray() { hideSurface = true; U.under.value = 1; U.fogDensity.value = 0.012; }
// 画面に線を描く（3Dの点の列 → SVG の線）。prog：描く割合
function pathLine(pts, color, prog = 1, w = 8, dash = "") {
  const n = Math.max(2, Math.floor(pts.length * clamp01(prog)));
  const q = pts.slice(0, n).map((p) => project(p)).filter((p) => !p.behind);
  if (q.length < 2) return null;
  lines += `<polyline points="${q.map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${dash ? `stroke-dasharray="${dash}"` : ""} opacity="0.95"/>`;
  return q[q.length - 1];
}
const bez = (a, b, c, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return V(u * u * a.x + 2 * u * t * b.x + t * t * c.x, u * u * a.y + 2 * u * t * b.y + t * t * c.y, u * u * a.z + 2 * u * t * b.z + t * t * c.z); });
// ルアーの通り道（上から）：沈み根 NE[0] の向こうに投げ、根のきわを通して手前へ
const N0 = NE[0];
const CAST_LAND = V(N0.x + 1.5, 0.5, N0.z + N0.r + 3.5);
const CAST_PATH = bez(CAST_LAND, V(N0.x + N0.r + 2.6, 0.5, N0.z + 1), V(IX + 1.5, 0.5, 1.5));
const CAST_AIR = bez(V(IX + 1.5, 3.6, 0.5), V(IX + 2, 12, (CAST_LAND.z) / 2), CAST_LAND, 30);
const ISO_LEG = [["#4cc3ff", "速い流れ"], ["#ff9f40", "ゆるい流れ（よれ）"], ["#2ecc71", "投げる場所"]];
const isoBar = () => {}; // 題名の帯は window.frame でまとめて描く（下の drawBar）
const drawBar = (s) => {
  // ショートの「ずっと出ている題名」（YouTube ショートはサムネを選べないため、どのコマでも何の動画かわかるように）
  if (!PORTRAIT || !s || !s.bar) return;
  html += `<div style="position:absolute;left:36px;right:230px;top:40px;text-align:center;background:rgba(6,22,42,.88);border:4px solid #ffd166;border-radius:22px;padding:8px 12px;color:#fff;font-weight:900;font-size:50px;line-height:1.15;z-index:5">${s.bar}</div>`;
};

Object.assign(SHOTS, {
  is_thumb(t, d, s) {
    isoBase();
    isoShade.forEach((m) => (m.material.uniforms.op.value = 0.55));
    updateFlow(40, { x0: IX - 40, x1: IX + 30, z0: 2, z1: 46 });
    isoTop(0, 18, 40, 0, 1);
    target(CAST_LAND.x, CAST_LAND.z, 3, 1, 1);
    html += `<div style="position:absolute;left:0;top:0;bottom:0;width:980px;background:linear-gradient(90deg,rgba(2,14,28,.82),rgba(2,14,28,0))"></div>`;
    html += `<div style="position:absolute;left:70px;top:210px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px">${s.tag}</span><div style="font-size:150px;line-height:1.1;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
  },
  is_hook(t, d, s) {
    isoBase();
    updateFlow(t + 30, { x0: IX - 40, x1: IX + 30, z0: 2, z1: 46, alpha: 0.6 });
    isoTop(0, 18, 42, t, d);
    // ショートはサムネを選べないので、最初のコマから文字を出す
    const a = PORTRAIT ? 1 : clamp01(t / 0.3) * clamp01((d * 0.5 - t) / 0.4);
    bigText(PORTRAIT ? 1050 : 140, "この磯、<br>どこに投げる？", "見えない「沈み根」が答え", a);
    ["A", "B", "C"].forEach((n, i) => mapPin([V(IX - 2, 0.6, 7), V(CAST_LAND.x, 0.6, CAST_LAND.z), V(IX + 22, 0.6, 40)][i], n, PORTRAIT ? 1 : clamp01((t - d * 0.5) / 0.3 - i * 0.6)));
    isoBar(s);
  },
  is_xray(t, d, s, k) {
    isoBase();
    const t2 = t - (s._k2 ?? 0);
    if (!(k >= 2 && t2 > 2.5)) isoXray();
    if (k >= 2) { isoShade.forEach((m) => (m.material.uniforms.op.value = clamp01((t2 - 2.5) / 0.6) * 0.6)); }
    isoFoam.forEach((m) => (m.material.uniforms.op.value = 0.35));
    const focus = k === 1 ? { x: N0.x + 6, z: N0.z, r: 6, dim: 0.3 } : null;
    updateFlow(t + 10, { x0: IX - 40, x1: IX + 30, z0: 2, z1: 46, alpha: k >= 1 ? 1 : 0.4, focus });
    const kk = ease(clamp01(t / 4));
    if (PORTRAIT) look(V(IX + 2 - 10 * kk, 30 - 6 * kk, 46), V(IX, -3, 20), 50);
    else look(V(IX - 10 + 4 * kk, 22 - 4 * kk, 52 - 6 * kk), V(IX - 2, -3.5, 20), 48);
    label(V(N0.x, N0.top + 0.4, N0.z), "沈み根", "水の下にかくれた岩", clamp01((t - 0.6) / 0.5), "gold", -40, -80);
    label(V(NE[2].x, NE[2].top + 0.4, NE[2].z), "沈み根", "", clamp01((t - 1.2) / 0.5), "gold", -60, -70);
    label(V(MIZO.x, seabedY(MIZO.x, 22) + 0.5, 22), "溝（みぞ）", "根と根のあいだの砂地", clamp01((t - 2) / 0.5), "", 80, 100);
    if (k === 1) label(V(N0.x + 6.5, 0.4, N0.z), "根の裏はゆるい流れ（よれ）", "小魚が集まると言われる", clamp01((t - (s._k1 ?? 0) - 0.8) / 0.5), "gold ans", PORTRAIT ? -120 : 200, PORTRAIT ? -160 : -60);
    if (k >= 2 && t2 > 2.5) label(V(N0.x, 0.4, N0.z), "海の色が濃い所", "根や海藻があることが多い", clamp01((t2 - 3) / 0.5), "gold ans", 0, -90);
    if (k >= 1) legend(ISO_LEG.slice(0, 2));
    isoBar(s);
  },
  is_cast(t, d, s, k) {
    isoBase();
    const t0 = t - (s._k0 ?? 0), t1 = t - (s._k1 ?? 0), t2 = t - (s._k2 ?? 0);
    if (k <= 1) {
      isoXray();
      isoFoam.forEach((m) => (m.material.uniforms.op.value = 0.3));
      updateFlow(t + 50, { x0: IX - 40, x1: IX + 30, z0: 2, z1: 46, alpha: 0.35 });
      isoTop(2, 15, 40, 0, 1);
      placeMan(isoMan, IX + 1.5, -0.2, Math.PI);
      isoMan.position.y = 3.4;
      const pAir = pathLine(CAST_AIR, "#ffffff", clamp01((t0 - 0.4) / 1.4), 5, "10 12");
      target(CAST_LAND.x, CAST_LAND.z, 2.6, clamp01((t0 - 1.6) / 0.4), t);
      label(CAST_LAND, "ここに落とす", "沈み根の少し向こう", clamp01((t0 - 1.8) / 0.4) * (k >= 1 ? 1 - clamp01((t1 - 1.0) / 0.4) : 1), "gold ans", 160, -60);
      label(V(N0.x, 0.4, N0.z), "沈み根", "", 1, "", -160, -40);
      if (k >= 1) {
        const pr = clamp01((t1 - 0.3) / 4);
        const tip = pathLine(CAST_PATH, "#2ecc71", pr, 9);
        if (tip) lines += `<circle cx="${tip.x}" cy="${tip.y}" r="13" fill="#ffd166" stroke="#06213a" stroke-width="4"/>`;
        label(CAST_PATH[16], "根のきわを通す", "ここで食わせるイメージ", clamp01((t1 - 1.5) / 0.5), "gold ans", 220, 40);
      }
      void pAir;
      legend(ISO_LEG);
    } else {
      // 横から：根の上は浅い → 竿を立てて、巻く速さを上げてかわす
      base(0);
      ISO.visible = true;
      wall.visible = top.visible = false;
      if (WALL_BAR) WALL_BAR.visible = false;
      U.under.value = 1;
      look(V(N0.x + 18, -4.2, N0.z - 1), V(N0.x, -4.6, N0.z - 1), 52);
      const prof = Array.from({ length: 41 }, (_, i) => { const z = N0.z + 9 - i * 0.55; const over = Math.exp(-(((z - N0.z) / (N0.r * 0.9)) ** 2)); return V(N0.x - 1, lerp(-7.2, N0.top + 0.9, over), z); });
      const tip = pathLine(prof, "#ffd166", clamp01((t2 - 0.3) / 3.5), 8);
      if (tip) lines += `<circle cx="${tip.x}" cy="${tip.y}" r="13" fill="#ffd166" stroke="#06213a" stroke-width="4"/>`;
      label(V(N0.x - 1, N0.top + 0.9, N0.z), "根の上は浅い", "竿を立てる・巻く速さを上げてかわす", clamp01((t2 - 1.6) / 0.5), "red", 0, -80);
      label(V(N0.x - 1, -7.2, N0.z + 8), "根の向こう", "沈めてから巻く", clamp01((t2 - 0.4) / 0.5), "", 0, -60);
      html += `<div style="position:absolute;${PORTRAIT ? "left:40px;top:240px" : "left:70px;top:125px"};color:#fff;font-weight:900;font-size:34px;text-shadow:0 2px 8px #000">横から見たルアーの通り道（沖 ← → 岸）</div>`;
    }
    isoBar(s);
  },
  is_sarashi(t, d, s, k) {
    isoBase();
    isoFoam.forEach((m, i) => (m.material.uniforms.op.value = i === 0 ? 1 : 0.5));
    updateFlow(t + 70, { x0: IX - 40, x1: IX + 30, z0: 2, z1: 46, alpha: 0.4, focus: { x: ISO_REEF.x, z: ISO_REEF.z, r: 6, dim: 0.2 } });
    const kk = ease(clamp01(t / 5));
    look(V(ISO_REEF.x + 4 - 3 * kk, 13 - 2 * kk, ISO_REEF.z + (PORTRAIT ? 24 : 18)), V(ISO_REEF.x, 0, ISO_REEF.z), 50);
    label(V(ISO_REEF.x - 1, 0.6, ISO_REEF.z - 1.5), "サラシ", "波が岩に当たってできる白い泡", clamp01((t - 0.6) / 0.5), "", -200, -80);
    if (k >= 1) {
      const a = clamp01((t - (s._k1 ?? 0)) / 0.5);
      target(ISO_REEF.x + 4.6, ISO_REEF.z + 2.4, 2.2, a, t);
      label(V(ISO_REEF.x + 4.6, 0.6, ISO_REEF.z + 2.4), "ここ！", "サラシの切れ目（泡と青い水のさかい目）", a, "gold ans", PORTRAIT ? -150 : 160, PORTRAIT ? -150 : -60);
    }
    legend(ISO_LEG);
    isoBar(s);
  },
  is_mizo(t, d, s, k) {
    isoBase();
    isoXray();
    isoFoam.forEach((m) => (m.material.uniforms.op.value = 0.3));
    updateFlow(t + 90, { x0: IX - 40, x1: IX + 30, z0: 2, z1: 46, alpha: 0.3 });
    const kk = ease(clamp01(t / 5));
    look(V(MIZO.x + 3, 15 - 2 * kk, 5 + 2 * kk), V(MIZO.x, -8, 23), 52);
    label(V(MIZO.x, seabedY(MIZO.x, 24) + 0.6, 24), "溝（みぞ）", "根と根のあいだ＝魚の通り道と言われる", clamp01((t - 0.5) / 0.5), "gold", 0, -90);
    if (k >= 1) {
      const pts = Array.from({ length: 30 }, (_, i) => V(MIZO.x + Math.sin(i * 0.2) * 0.3, -1, MIZO.z1 - 2 - i * ((MIZO.z1 - 2 - 3) / 29)));
      const tip = pathLine(pts, "#2ecc71", clamp01((t - (s._k1 ?? 0) - 0.3) / 3), 9);
      if (tip) lines += `<circle cx="${tip.x}" cy="${tip.y}" r="13" fill="#ffd166" stroke="#06213a" stroke-width="4"/>`;
      label(V(MIZO.x, -1, MIZO.z1 - 3), "溝にそって投げる", "溝の筋を通して巻く", clamp01((t - (s._k1 ?? 0)) / 0.5), "gold ans", 180, -40);
    }
    isoBar(s);
  },
  is_quiz(t, d, s, k) {
    isoBase();
    const ans = k >= 1;
    if (ans && t - (s._k1 ?? 0) > 0.6) isoXray();
    isoShade.forEach((m) => (m.material.uniforms.op.value = ans ? 0 : 0.55));
    updateFlow(t + 110, { x0: IX - 40, x1: IX + 30, z0: 2, z1: 46, alpha: ans ? 1 : 0.5, focus: ans ? { x: N0.x + 5, z: N0.z + 3, r: 7, dim: 0.3 } : null });
    isoTop(0, 18, 42, 0, 1);
    const P = [V(IX - 2, 0.6, 7), V(CAST_LAND.x, 0.6, CAST_LAND.z), V(IX + 22, 0.6, 40)];
    ["A", "B", "C"].forEach((n, i) => mapPin(P[i], n, 1, ans && i !== 1 ? "#7f8b96" : "#e3412b"));
    if (ans) {
      const a = clamp01((t - (s._k1 ?? 0) - 0.6) / 0.4);
      target(CAST_LAND.x, CAST_LAND.z, 3, a, t);
      label(P[1], "答え：B", "沈み根の向こう → 根のきわを通す", a, "gold ans", 0, -100);
    }
    html += `<div class="card" style="${PORTRAIT ? "left:40px;right:40px;top:300px" : "left:110px;top:150px;width:560px"};opacity:${ans ? 0 : 1}"><b style="font-size:42px">クイズ</b><div style="font-size:32px;margin-top:6px">海の色が濃いのはどこ？<br>A・B・C のどこに投げる？</div></div>`;
    isoBar(s);
  },
  is_safety(t, d, s, k) {
    isoBase();
    U.chop.value = 0.6;
    isoTop(-6, 8, 34, t, d);
    placeMan(isoMan, IX - 6, -1, Math.PI);
    isoMan.position.y = 3.6;
    const P = PORTRAIT;
    dangerCard("磯は足場が悪く、波にさらわれる事故も", "立入禁止の場所には入らない。波が高い日・風が強い日はやめる", clamp01(t / 0.4), P ? 330 : 150);
    if (k >= 1) okCard("ライフジャケットと、すべりにくい磯靴", "ひとりで行かず、だれかに行き先を伝える", clamp01((t - (s._k1 ?? 0)) / 0.4), P ? 760 : 520);
    isoBar(s);
  },
  is_sum(t, d, s, k) {
    isoBase();
    updateFlow(t + 130, { x0: IX - 40, x1: IX + 30, z0: 2, z1: 46, alpha: 0.6 });
    isoTop(0, 18, 46, t, d);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,${0.55 * clamp01(t / 0.4)})"></div>`;
    const rows = [["沈み根", "少し向こうに落とし、根のきわを通す"], ["サラシ", "泡と青い水のさかい目"], ["溝", "溝にそって投げ、筋を通す"]];
    html += `<div class="big" style="top:${PORTRAIT ? 330 : 120}px;font-size:${PORTRAIT ? 80 : 64}px">磯の答えも<br><span style="color:#2ecc71">「流れのさかい目」と「根のきわ」</span></div>`;
    rows.forEach(([a1, b1], i) => {
      const a = clamp01((t - 0.4 - i * 0.4) / 0.3);
      html += `<div class="card" style="left:${PORTRAIT ? 60 : 380}px;right:${PORTRAIT ? 60 : 380}px;top:${(PORTRAIT ? 760 : 420) + i * (PORTRAIT ? 170 : 150)}px;opacity:${a};display:flex;align-items:center;gap:22px;padding:18px 26px"><b style="background:#2ecc71;color:#06213a;font-size:36px;padding:8px 16px;border-radius:14px;white-space:nowrap">${a1}</b><div style="font-size:38px;font-weight:900">${b1}</div></div>`;
    });
    isoBar(s);
  },
});


// =====================================================================
// ツレドキアカデミー 共通：岩場の海の中・月の輪・棒グラフ（ov_*・gr_*・cn_* で使う）
// =====================================================================
const acMeb = school("メバル", 14, 1.4, 901, { freq: 7 });
const acGas = school("ガシラ", 6, 1.6, 902, { freq: 4, amp: 0.04 });
const acChinu = school("チヌ", 5, 1.9, 903, { freq: 6 });
world.add(acMeb, acGas, acChinu);
extras.push(acMeb, acGas, acChinu);
// 岩場（磯のセット）を海の中から見る
function reefUnder(t, opts = {}) {
  base(0);
  ISO.visible = true;
  wall.visible = top.visible = false;
  if (WALL_BAR) WALL_BAR.visible = false;
  U.under.value = 1;
  const c = V(N0.x - 6, -5, N0.z + 1);
  if (opts.meb !== false) { show(acMeb); updateSchool(acMeb, t * 0.5, V(c.x + 1, -3.8, c.z + 4), V(3.2, 0.9, 1.6), Math.cos(t * 0.2) > 0 ? 1 : -1); }
  if (opts.gas !== false) { show(acGas); updateSchool(acGas, t * 0.15, V(c.x + 0.5, seabedY(c.x, c.z + 4) + 0.8, c.z + 4), V(3.5, 0.15, 1.5), 1); }
  if (opts.chinu) { show(acChinu); updateSchool(acChinu, t * 0.6, V(c.x + Math.sin(t * 0.2) * 3, -4.5, c.z + 4), V(2.5, 0.6, 1), Math.cos(t * 0.2) > 0 ? 1 : -1); }
  const ang = (opts.ang ?? 0) + t * 0.02;
  look(V(c.x + Math.sin(ang) * 5 + 2, -4.0, c.z + (PORTRAIT ? 15 : 12)), V(c.x, -5.6, c.z - 1), 55);
  return c;
}
// 12か月の輪。arcs: [[開始月, 終了月, 色, 太さ]]、mark: 強調する月
function monthRing(arcs, a = 1, size = 300, title = "") {
  const R = size * 0.38, C = size / 2;
  const pt = (m, r) => { const ang = ((m - 1) / 12) * Math.PI * 2 - Math.PI / 2; return [C + Math.cos(ang) * r, C + Math.sin(ang) * r]; };
  const arc = (m0, m1, col, w) => { const e = m1 < m0 ? m1 + 12 : m1; const [x0, y0] = pt(m0 - 0.5, R), [x1, y1] = pt(e + 0.5, R); return `<path d="M${x0},${y0} A${R},${R} 0 ${e - m0 + 1 > 6 ? 1 : 0} 1 ${x1},${y1}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`; };
  const labels = Array.from({ length: 12 }, (_, i) => { const [x, y] = pt(i + 1, R + size * 0.1); return `<text x="${x}" y="${y + 7}" fill="#fff" font-size="${size * 0.065}" font-weight="800" text-anchor="middle">${i + 1}</text>`; }).join("");
  return `<div style="opacity:${a};text-align:center"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${C}" cy="${C}" r="${R}" stroke="rgba(255,255,255,.18)" stroke-width="${size * 0.07}" fill="none"/>${arcs.map(([m0, m1, col, w]) => arc(m0, m1, col, w ?? size * 0.07)).join("")}${labels}<text x="${C}" y="${C + 10}" fill="#fff" font-size="${size * 0.09}" font-weight="900" text-anchor="middle">${title}</text></svg></div>`;
}
const ringBox = (inner, a = 1) => `<div style="position:absolute;${PORTRAIT ? "left:50%;top:300px;transform:translateX(-50%)" : "left:70px;top:120px"};opacity:${a};background:rgba(6,22,42,.82);border-radius:26px;padding:16px 22px">${inner}</div>`;
// 棒グラフ（rows: [ラベル, 値, 色, 表示]）
function acBars(title, rows, max, tt, opts = {}) {
  const P = PORTRAIT, H = opts.H ?? (P ? 440 : 300), g = clamp01(tt / 1.2);
  return `<div style="font-size:${P ? 36 : 34}px;font-weight:900;color:#10345a">${title}</div>
    <div style="display:flex;gap:12px;height:${H + 90}px;align-items:flex-end;margin-top:12px;border-bottom:4px solid #10345a;position:relative">
    ${opts.line ? `<div style="position:absolute;left:0;right:0;bottom:${(opts.line[0] / max) * H + 46}px;border-top:4px dashed #e3412b"><span style="position:absolute;right:0;top:-34px;color:#c62828;font-weight:900;font-size:26px">${opts.line[1]}</span></div>` : ""}
    ${rows.map(([lab, v, col, txt], i) => { const gi = clamp01(g * 1.6 - i * 0.15); return `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center"><b style="font-size:${P ? 30 : 30}px;color:#10345a;opacity:${gi}">${txt}</b><div style="width:62%;height:${Math.max(3, (v / max) * H * gi)}px;background:${col};border-radius:10px 10px 0 0"></div><div style="font-size:${P ? 24 : 26}px;font-weight:900;color:#10345a;margin-top:6px;white-space:nowrap">${lab}</div></div>`; }).join("")}</div>
    ${opts.note ? `<div style="font-size:${P ? 32 : 30}px;font-weight:900;color:${opts.noteColor ?? "#c62828"};margin-top:10px;text-align:center;opacity:${clamp01(tt - 1.2)}">${opts.note}</div>` : ""}
    <div style="font-size:21px;color:#3a5a78;margin-top:8px">出典：${opts.src ?? ""}</div>`;
}
const acCard = (inner, a, pos) => card(pos?.[0] ?? (PORTRAIT ? 70 : 360), pos?.[1] ?? (PORTRAIT ? 300 : 110), pos?.[2] ?? (PORTRAIT ? 940 : 1200), inner, a, "padding:24px 30px");
const acDim = (v = 0.5) => `<div style="position:absolute;inset:0;background:rgba(2,14,28,${v})"></div>`;
function acHook(t, d, s, main, sub) {
  const a = PORTRAIT ? 1 : clamp01(t / 0.3);
  bigText(PORTRAIT ? 1000 : 130, main, sub, a);
  isoBar(s);
}

// ---------- R4 メバル・ガシラは卵を産まない？（ov_*）----------
Object.assign(SHOTS, {
  ov_thumb(t, d, s) {
    reefUnder(8);
    html += `<div style="position:absolute;left:0;top:0;bottom:0;width:1050px;background:linear-gradient(90deg,rgba(2,14,28,.85),rgba(2,14,28,0))"></div>`;
    html += `<div style="position:absolute;left:70px;top:200px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px;background:#10345a;color:#ffd166;border:3px solid #ffd166">${s.tag}</span><div style="font-size:150px;line-height:1.1;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
  },
  ov_hook(t, d, s) {
    reefUnder(t);
    academyBadge();
    acHook(t, d, s, "メバル・ガシラは<br>卵を産まない？", "お腹の中で子を育てる「卵胎生」");
  },
  ov_what(t, d, s, k) {
    reefUnder(t + 10);
    academyBadge();
    html += acDim(0.5);
    const P = PORTRAIT, a1 = clamp01(t / 0.4), a2 = k >= 1 ? clamp01((t - (s._k1 ?? 0)) / 0.4) : 0;
    const step = (txt, on, col) => `<div style="flex:1;background:${on ? col : "#e6edf3"};color:${on ? "#fff" : "#7a8a99"};border-radius:16px;padding:14px 8px;text-align:center;font-weight:900;font-size:${P ? 28 : 30}px">${txt}</div>`;
    const arr = `<div style="font-size:34px;color:#10345a;font-weight:900;align-self:center">→</div>`;
    html += acCard(`<b style="font-size:${P ? 36 : 38}px">多くの魚</b><div style="display:flex;gap:10px;margin:10px 0 22px">${step("水の中に卵を産む", true, "#7fa3c2")}${arr}${step("海をただよう卵", true, "#7fa3c2")}${arr}${step("ふ化", true, "#7fa3c2")}</div>
      <div style="opacity:${a2}"><b style="font-size:${P ? 36 : 38}px;color:#c2185b">メバル・カサゴ（卵胎生）</b><div style="display:flex;gap:10px;margin-top:10px">${step("交尾", a2 > 0.5, "#e3417a")}${arr}${step("お腹の中で受精・ふ化", a2 > 0.5, "#e3417a")}${arr}${step("仔魚を産む", a2 > 0.5, "#e3417a")}</div></div>
      <div style="font-size:22px;color:#3a5a78;margin-top:14px">出典：長崎県総合水産試験場（2006）、三重県「2024年度 カサゴの資源評価」</div>`, a1);
  },
  ov_mebaru(t, d, s, k) {
    reefUnder(t + 20, { gas: false });
    academyBadge();
    const P = PORTRAIT;
    const arcs = [[11, 12, "#4cc3ff"], ...(k >= 0 ? [[1, 2, "#ff6fa5"]] : [])];
    html += ringBox(monthRing(arcs, 1, P ? 340 : 300, "メバル") + `<div style="color:#fff;font-weight:900;font-size:26px;margin-top:6px"><span style="color:#4cc3ff">●</span> 交尾　<span style="color:#ff6fa5">●</span> 仔魚を産む</div>`, clamp01(t / 0.4));
    if (k >= 1) html += acCard(`<b style="font-size:34px">愛媛県の研究</b><div style="font-size:${P ? 34 : 36}px;font-weight:900;margin-top:6px">交尾は11〜12月ごろ（推測）<br>メスは<span style="color:#c2185b">1月</span>から産み、<span style="color:#c2185b">2月</span>にはほぼ産み終える</div>`, clamp01((t - (s._k1 ?? 0)) / 0.4), P ? [70, 1060, 940] : [1000, 150, 820]);
    if (k >= 2) html += acCard(`<b style="font-size:34px">生まれたばかりの仔魚</b><div style="font-size:${P ? 60 : 64}px;font-weight:900;color:#c2185b">全長 6mm ほど</div><svg width="300" height="60" viewBox="0 0 300 60"><line x1="10" y1="50" x2="290" y2="50" stroke="#10345a" stroke-width="3"/>${Array.from({ length: 11 }, (_, i) => `<line x1="${10 + i * 28}" y1="${i % 5 ? 42 : 34}" x2="${10 + i * 28}" y2="50" stroke="#10345a" stroke-width="3"/>`).join("")}<ellipse cx="94" cy="26" rx="84" ry="12" fill="#ffb3c8" stroke="#c2185b" stroke-width="3"/><circle cx="160" cy="24" r="6" fill="#10345a"/></svg><div style="font-size:22px;color:#3a5a78">目盛り：1mm（イメージ）</div>`, clamp01((t - (s._k2 ?? 0)) / 0.4), P ? [70, 1060, 940] : [1000, 520, 820]);
    html += srcLine("長崎県総合水産試験場「メバルの種苗生産技術について」（2006）／愛媛県「メバルの種苗生産技術開発について」");
  },
  ov_kasago(t, d, s, k) {
    reefUnder(t + 30, { meb: false, ang: 0.5 });
    academyBadge();
    const P = PORTRAIT;
    html += ringBox(monthRing([[11, 5, "rgba(255,159,64,.55)"], [12, 3, "#ff9f40"]], 1, P ? 340 : 300, "カサゴ") + `<div style="color:#fff;font-weight:900;font-size:24px;margin-top:6px"><span style="color:#ff9f40">●</span> お腹に子をもつメスが多い時期</div>`, clamp01(t / 0.4));
    label(V(N0.x - 5.5, seabedY(N0.x - 5.5, N0.z + 2.5) + 0.6, N0.z + 2.5), "カサゴ（ガシラ）", "岩のすきまにすむ", clamp01((t - 0.5) / 0.5), "gold", 160, -60);
    if (k >= 1) html += acCard(`<b style="font-size:34px">産仔の季節に</b><div style="font-size:${P ? 72 : 76}px;font-weight:900;color:#e08a2a">3〜4回</div><div style="font-size:30px;font-weight:800">に分けて仔魚を産むと考えられる</div>`, clamp01((t - (s._k1 ?? 0)) / 0.4), P ? [70, 1060, 940] : [1000, 150, 820]);
    if (k >= 2) html += acCard(`<b style="font-size:34px">九州・瀬戸内海では</b><div style="font-size:${P ? 56 : 60}px;font-weight:900;color:#1e7a36">満1歳で成熟</div>`, clamp01((t - (s._k2 ?? 0)) / 0.4), P ? [70, 1360, 940] : [1000, 480, 820]);
    html += srcLine("三重県「2024年度 三重県におけるカサゴの資源評価」");
  },
  ov_winter(t, d, s, k) {
    reefUnder(t + 40, { ang: -0.4 });
    academyBadge();
    const P = PORTRAIT;
    if (k === 0) label(V(N0.x - 5, -4.2, N0.z + 2), "冬のお腹の大きい魚", "もうすぐ子を産む親かもしれない", clamp01((t - 0.5) / 0.5), "gold ans", 0, -120);
    if (k >= 1) {
      html += acDim(0.5 * clamp01((t - (s._k1 ?? 0)) / 0.5));
      html += `<div class="big" style="top:${P ? 300 : 120}px;font-size:${P ? 72 : 60}px;opacity:${clamp01((t - (s._k1 ?? 0)) / 0.5)}">冬の釣り人にできること</div>`;
      [["食べる分だけ持ち帰る"], ["逃がすなら、水から出す時間を短く"], ["同じ岩場の親を残す（カサゴは回遊しない）"]].forEach(([h], i) => {
        const kk = i < 2 ? 1 : 2;
        const a = k >= kk ? clamp01((t - (s["_k" + kk] ?? 0) - 0.6 - (i === 1 ? 0.8 : 0)) / 0.4) : 0;
        html += card(P ? 70 : 420, (P ? 520 : 270) + i * (P ? 170 : 150), P ? 940 : 1080, `<b style="font-size:${P ? 40 : 44}px"><span style="color:#2ecc71">✔</span> ${h}</b>`, a, "padding:22px 30px");
      });
    }
    isoBar(s);
  },
  ov_sum(t, d, s, k) {
    reefUnder(t + 50);
    academyBadge();
    html += acDim(0.55);
    const P = PORTRAIT;
    html += `<div class="big" style="top:${P ? 280 : 100}px;font-size:${P ? 72 : 60}px">まとめ</div>`;
    [["卵胎生", "お腹の中で受精・ふ化し、仔魚を産む"], ["メバル", "11〜12月に交尾、1〜2月に産む"], ["カサゴ", "12〜3月に多く、3〜4回に分けて産む"], ["冬の釣り", "お腹の大きい親は大切に。食べる分だけ"]].forEach(([a1, b1], i) => {
      html += rowCard(P, i, clamp01((t - 0.4 - i * 0.4) / 0.3), a1, b1, P ? 440 : 210, P ? 190 : 150, i === 3 ? "#1e7a36" : "#1f6fb2");
    });
  },
});

// ---------- R3 20cmのガシラは何歳？（gr_*）----------
const GR_M = [14.0, 18.3, 21.4, 23.7, 25.3], GR_F = [12.6, 15.5, 17.3, 18.5, 19.2]; // 静岡県清水港（矢冨ほか 2005、三重県の資料から）全長
Object.assign(SHOTS, {
  gr_thumb(t, d, s) { SHOTS.ov_thumb(t, d, s); },
  gr_hook(t, d, s) {
    reefUnder(t, { meb: false, ang: 0.6 });
    academyBadge();
    acHook(t, d, s, "20cmのガシラは<br>何歳？", "回遊しない魚の、ゆっくりな成長");
  },
  gr_grow(t, d, s, k) {
    reefUnder(t + 10, { meb: false, ang: 0.6 });
    academyBadge();
    html += acDim(0.5);
    const P = PORTRAIT, tt = t - (s._k0 ?? 0);
    const H = P ? 420 : 300, max = 27, g = clamp01(tt / 1.2);
    const col = (v, c, on) => `<div style="width:42%;height:${Math.max(3, (v / max) * H * g)}px;background:${c};opacity:${on ? 1 : 0.15};border-radius:8px 8px 0 0;position:relative"><b style="position:absolute;top:-34px;left:50%;transform:translateX(-50%);font-size:${P ? 22 : 24}px;color:#10345a;white-space:nowrap;opacity:${on ? 1 : 0}">${v}</b></div>`;
    const showM = k >= 1, showF = k >= 2;
    const bars = GR_M.map((m, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end"><div style="display:flex;gap:4px;align-items:flex-end;width:100%;justify-content:center">${col(m, "#1f6fb2", showM)}${col(GR_F[i], "#e3417a", showF)}</div><div style="font-size:${P ? 26 : 28}px;font-weight:900;color:#10345a;margin-top:6px">${i + 1}歳</div></div>`).join("");
    html += acCard(`<div style="font-size:${P ? 34 : 34}px;font-weight:900">カサゴの年齢と大きさ（全長cm）</div>
      <div style="display:flex;gap:6px;height:${H + 70}px;align-items:flex-end;margin-top:12px;border-bottom:4px solid #10345a;position:relative">
      <div style="position:absolute;left:0;right:0;bottom:${(20 / max) * H + 38}px;border-top:4px dashed #e3412b;opacity:${g}"><span style="position:absolute;left:0;top:-34px;color:#c62828;font-weight:900;font-size:26px">20cm</span></div>${bars}</div>
      <div style="font-size:26px;font-weight:900;margin-top:8px"><span style="color:#1f6fb2">■</span> オス　<span style="color:#e3417a">■</span> メス</div>
      <div style="font-size:21px;color:#3a5a78;margin-top:4px">出典：静岡県清水港の報告（矢冨ほか 2005）／三重県「2024年度 カサゴの資源評価」</div>`, clamp01(t / 0.4));
  },
  gr_stay(t, d, s, k) {
    reefUnder(t + 20, { meb: false, ang: 0.2 });
    academyBadge();
    const P = PORTRAIT;
    label(V(N0.x - 5.5, seabedY(N0.x - 5.5, N0.z + 2.5) + 0.6, N0.z + 2.5), "同じ岩場に住み続ける", "季節的な回遊はしない", clamp01((t - 0.5) / 0.5), "gold ans", 0, -260);
    if (k >= 1) html += acCard(`<b style="font-size:34px">すむ場所</b><div style="font-size:${P ? 40 : 42}px;font-weight:900;margin-top:6px">主に<span style="color:#1f6fb2">水深50mより浅い岩礁</span></div>`, clamp01((t - (s._k1 ?? 0)) / 0.4), P ? [70, 1060, 940] : [110, 150, 780]);
    html += srcLine("三重県「2024年度 三重県におけるカサゴの資源評価」");
  },
  gr_now(t, d, s, k) {
    reefUnder(t + 30, { meb: false, ang: -0.3 });
    academyBadge();
    html += acDim(0.55);
    const P = PORTRAIT;
    if (k === 0) html += acCard(acBars("鳥羽磯部漁協のカサゴの漁獲量（トン）", [["2006〜2010年", 40, "#7fa3c2", "40以上"], ["2021年", 5.4, "#e3412b", "5.4（最低）"], ["2023年", 6.7, "#1f6fb2", "6.7"]], 45, t - (s._k0 ?? 0), { note: "資源の水準は「低位」、動向は「増加」", src: "三重県「2024年度 三重県におけるカサゴの資源評価」" }), clamp01(t / 0.4));
    if (k >= 1) html += acCard(`<b style="font-size:36px">放流の効果は？</b><div style="font-size:${P ? 34 : 36}px;font-weight:900;margin-top:10px">三重県：1997年から放流（2022年は12.7万尾）。<br>市場で放流魚はほとんど見られず、<span style="color:#c62828">効果はきわめて小さい</span>と考えられる</div>
      <div style="font-size:21px;color:#3a5a78;margin-top:10px">出典：三重県「2024年度 三重県におけるカサゴの資源評価」</div>`, clamp01((t - (s._k1 ?? 0)) / 0.4));
  },
  gr_angler(t, d, s, k) {
    reefUnder(t + 40, { meb: false, ang: 0.4 });
    academyBadge();
    html += acDim(0.5 * clamp01(t / 0.5));
    const P = PORTRAIT;
    html += `<div class="big" style="top:${P ? 300 : 120}px;font-size:${P ? 72 : 60}px">釣り人にできること</div>`;
    [["小さなガシラは逃がす"], ["同じ穴で釣りすぎない"], ["食べる分だけ持ち帰る・地域のルールを確かめる"]].forEach(([h], i) => {
      const kk = i < 2 ? 0 : 1;
      const a = k >= kk ? clamp01((t - (s["_k" + kk] ?? 0) - 0.6 - (i === 1 ? 1.2 : 0)) / 0.4) : 0;
      html += card(P ? 70 : 380, (P ? 520 : 270) + i * (P ? 170 : 150), P ? 940 : 1160, `<b style="font-size:${P ? 38 : 42}px"><span style="color:#2ecc71">✔</span> ${h}</b>`, a, "padding:22px 30px");
    });
    isoBar(s);
  },
  gr_sum(t, d, s, k) {
    reefUnder(t + 50, { meb: false });
    academyBadge();
    html += acDim(0.55);
    const P = PORTRAIT;
    html += `<div class="big" style="top:${P ? 280 : 100}px;font-size:${P ? 72 : 60}px">まとめ</div>`;
    [["成長", "オスは3歳で約21cm、メスは5歳でも約19cm"], ["すみか", "浅い岩礁にすみ、季節の回遊はしない"], ["いま", "三重県では資源は低位、放流の効果は小さい"], ["できること", "小さな魚は逃がし、同じ穴で釣りすぎない"]].forEach(([a1, b1], i) => {
      html += rowCard(P, i, clamp01((t - 0.4 - i * 0.4) / 0.3), a1, b1, P ? 440 : 210, P ? 190 : 150, i === 3 ? "#1e7a36" : i === 2 ? "#c62828" : "#1f6fb2");
    });
  },
});

// ---------- R2 チヌはみんなオスで生まれる？（cn_*）----------
// 年齢ごとの色（オス＝青、メス＝赤）で群れを見せる
Object.assign(SHOTS, {
  cn_thumb(t, d, s) {
    reefUnder(8, { meb: false, gas: false, chinu: true });
    html += `<div style="position:absolute;left:0;top:0;bottom:0;width:1050px;background:linear-gradient(90deg,rgba(2,14,28,.85),rgba(2,14,28,0))"></div>`;
    html += `<div style="position:absolute;left:70px;top:200px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px;background:#10345a;color:#ffd166;border:3px solid #ffd166">${s.tag}</span><div style="font-size:150px;line-height:1.1;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
  },
  cn_hook(t, d, s) {
    reefUnder(t, { meb: false, gas: false, chinu: true });
    academyBadge();
    acHook(t, d, s, "チヌは<br>みんなオスで生まれる？", "性転換と「30歳」の長寿");
  },
  cn_sex(t, d, s, k) {
    reefUnder(t + 10, { meb: false, gas: false, chinu: true });
    academyBadge();
    html += acDim(0.45);
    const P = PORTRAIT;
    const stage = (age, txt, m, f, on) => `<div style="flex:1;text-align:center;opacity:${on ? 1 : 0.2}"><div style="font-size:${P ? 30 : 32}px;font-weight:900;color:#10345a">${age}</div><div style="display:flex;justify-content:center;gap:4px;margin:10px 0">${"●".repeat(m).split("").map(() => `<span style="color:#1f6fb2;font-size:${P ? 34 : 38}px">●</span>`).join("")}${"●".repeat(f).split("").map(() => `<span style="color:#e3417a;font-size:${P ? 34 : 38}px">●</span>`).join("")}</div><div style="font-size:${P ? 24 : 26}px;font-weight:800;color:#3a5a78">${txt}</div></div>`;
    html += acCard(`<b style="font-size:${P ? 36 : 38}px">チヌ（クロダイ）の一生と性別</b><div style="display:flex;gap:10px;margin-top:16px">${stage("生まれたとき", "すべてオス", 5, 0, true)}${stage("成長すると", "メスも現れる", 3, 2, k >= 1)}${stage("4〜5歳", "多くがメスに", 1, 4, k >= 1)}</div>
      <div style="font-size:${P ? 30 : 32}px;font-weight:900;margin-top:14px;opacity:${k >= 2 ? 1 : 0}">一部はオスのまま。<span style="color:#1f6fb2">●</span>オス　<span style="color:#e3417a">●</span>メス</div>
      <div style="font-size:21px;color:#3a5a78;margin-top:10px">出典：愛知県水産試験場「おさかな情報」</div>`, clamp01(t / 0.4));
  },
  cn_teeth(t, d, s, k) {
    reefUnder(t + 20, { meb: false, gas: false, chinu: true, ang: 0.5 });
    academyBadge();
    const c = V(N0.x - 6, -5, N0.z + 1);
    label(V(c.x, -4.5, c.z + 1), "チヌ", "歯がじょうぶ", clamp01((t - 0.4) / 0.5), "gold", 180, -60);
    html += acCard(`<b style="font-size:36px">食べているもの</b><div style="font-size:${PORTRAIT ? 40 : 42}px;font-weight:900;margin-top:8px">貝やカニを、<span style="color:#c62828">殻ごとかみくだく</span></div><div style="font-size:21px;color:#3a5a78;margin-top:8px">出典：愛知県水産試験場「おさかな情報」</div>`, clamp01((t - 0.8) / 0.4), PORTRAIT ? [70, 1060, 940] : [110, 150, 760]);
  },
  cn_age(t, d, s, k) {
    reefUnder(t + 30, { meb: false, gas: false, chinu: true, ang: -0.4 });
    academyBadge();
    html += acDim(0.5);
    const P = PORTRAIT;
    if (k <= 1) {
      // 耳石の輪（年輪）
      const n = Math.min(30, Math.floor(clamp01((t - 0.5) / 4) * 30));
      const rings = Array.from({ length: n }, (_, i) => `<ellipse cx="160" cy="110" rx="${14 + i * 4.6}" ry="${9 + i * 3.1}" fill="none" stroke="${i % 5 === 4 ? "#ffd166" : "rgba(255,255,255,.55)"}" stroke-width="${i % 5 === 4 ? 3 : 1.6}"/>`).join("");
      html += `<div style="position:absolute;${P ? "left:50%;top:300px;transform:translateX(-50%)" : "left:110px;top:140px"};background:rgba(6,22,42,.85);border-radius:26px;padding:18px 24px;text-align:center;color:#fff;font-weight:900">
        <div style="font-size:32px">耳石の輪（1年に1本の年輪）</div><svg width="320" height="220" viewBox="0 0 320 220"><ellipse cx="160" cy="110" rx="150" ry="100" fill="#d8c9a8" opacity=".25"/>${rings}</svg><div style="font-size:${P ? 64 : 60}px;color:#ffd166">${n}本 → ${n}歳</div></div>`;
      if (k >= 1) html += acCard(`<b style="font-size:34px">富山湾の調査（2013〜2017年、320尾）</b><div style="font-size:${P ? 56 : 58}px;font-weight:900;color:#c62828;margin-top:6px">最高 約30歳</div><div style="font-size:30px;font-weight:800">これまで考えられていたより長生き</div>`, clamp01((t - (s._k1 ?? 0)) / 0.4), P ? [70, 1060, 940] : [1000, 150, 820]);
    } else {
      html += acCard(acBars("大きさと重さの目安（尾叉長）", [["30cm", 0.5, "#7fa3c2", "約0.5kg"], ["37cm", 1, "#7fa3c2", "約1kg"], ["47cm", 2, "#1f6fb2", "約2kg"]], 2.2, t - (s._k2 ?? 0), { note: "メスのほうが成長が早い", noteColor: "#c2185b", src: "富山県水産研究所「富山湾におけるクロダイの年齢と成長」" }), clamp01((t - (s._k2 ?? 0)) / 0.4));
    }
    if (k <= 1) html += srcLine("富山県水産研究所「富山湾におけるクロダイの年齢と成長〜クロダイは長寿だった！〜」");
  },
  cn_now(t, d, s, k) {
    reefUnder(t + 40, { meb: false, gas: false, chinu: true, ang: 0.3 });
    academyBadge();
    html += acDim(0.5);
    const P = PORTRAIT;
    if (k === 0) html += acCard(`<b style="font-size:34px">岡山県水産研究所（2024年）</b><div style="font-size:${P ? 36 : 38}px;font-weight:900;margin-top:8px">ノリ養殖で、<span style="color:#c62828">クロダイの食害が起きる漁場が増えている</span></div><div style="font-size:${P ? 30 : 32}px;font-weight:800;margin-top:10px">考えられる原因：秋〜冬に水温が下がりにくくなったこと、魚の値段が安く、あまり獲られなくなったこと</div>`, clamp01(t / 0.4));
    if (k >= 1) html += acCard(`<b style="font-size:34px">徳島県の調査（2024年1月）</b><div style="font-size:${P ? 36 : 38}px;font-weight:900;margin-top:8px">水温 約11〜12℃でもノリ漁場に多く現れ、<br>1時間に <span style="color:#c62828;font-size:${P ? 60 : 64}px">249尾</span> 写った時間も</div><div style="font-size:${P ? 28 : 30}px;font-weight:800;margin-top:8px;opacity:${k >= 2 ? 1 : 0}">昼前と夕方に多く、正午には減る傾向</div>`, clamp01((t - (s._k1 ?? 0)) / 0.4));
    html += srcLine(k >= 1 ? "岡本裕太「ノリ漁場における食害の長期化」徳島水研だより118号（2024）" : "岡山県農林水産総合センター水産研究所「ノリ養殖におけるクロダイの食害への対応について」（2024）");
  },
  cn_angler(t, d, s, k) {
    reefUnder(t + 50, { meb: false, gas: false, chinu: true });
    academyBadge();
    html += acDim(0.5 * clamp01(t / 0.5));
    const P = PORTRAIT;
    html += `<div class="big" style="top:${P ? 300 : 120}px;font-size:${P ? 72 : 60}px">釣り人が知っておきたいこと</div>`;
    [["大きなチヌは何十年も生きた魚かもしれない"], ["大きな個体の多くはメス（4〜5歳で多くがメスに）"], ["食べる分だけ持ち帰り、ルールを確かめる"]].forEach(([h], i) => {
      const kk = i === 2 ? 1 : 0;
      const a = k >= kk ? clamp01((t - (s["_k" + kk] ?? 0) - 0.6 - (i === 1 ? 1.4 : 0)) / 0.4) : 0;
      html += card(P ? 70 : 360, (P ? 520 : 270) + i * (P ? 190 : 150), P ? 940 : 1200, `<b style="font-size:${P ? 36 : 40}px"><span style="color:#2ecc71">✔</span> ${h}</b>`, a, "padding:22px 30px");
    });
    isoBar(s);
  },
  cn_sum(t, d, s, k) {
    reefUnder(t + 60, { meb: false, gas: false, chinu: true });
    academyBadge();
    html += acDim(0.55);
    const P = PORTRAIT;
    html += `<div class="big" style="top:${P ? 280 : 100}px;font-size:${P ? 72 : 60}px">まとめ</div>`;
    [["性転換", "生まれたときはすべてオス、4〜5歳で多くがメスに"], ["長寿", "富山湾で最高約30歳"], ["食べ物", "貝やカニを殻ごとかみくだく"], ["いま", "冬のノリ漁場の食害が各地で問題に"]].forEach(([a1, b1], i) => {
      html += rowCard(P, i, clamp01((t - 0.4 - i * 0.4) / 0.3), a1, b1, P ? 440 : 210, P ? 190 : 150, i === 3 ? "#c62828" : "#1f6fb2");
    });
  },
});

// =====================================================================
// 見える化・実戦編 長尺（cg-jissen-katachi、jx_*）：L字の堤防・港の入り口（船道）・潮の向きが逆のとき
// わかりやすさは js_* と同じ作り（主役だけ明るく・太い矢印・緑の円・全体図・凡例）
// =====================================================================
// L字の堤防：岸から沖へ（腕1）→ 下流側（右）へ曲がる（腕2）
const LP = { a1: { x0: -2, x1: 2, z0: 0, z1: 24 }, a2: { x0: -2, x1: 26, z0: 20, z1: 24 } };
const LEDDY = { x: 31, z: 15, r: 7 };
const inBox = (b, x, z, m = 0.2) => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m;
const lpier = new THREE.Group();
{
  for (const b of [LP.a1, LP.a2]) {
    const w = b.x1 - b.x0, l = b.z1 - b.z0, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, 16, l), concrete);
    body.position.set(cx, -5.2, cz);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.6, l + 0.4), shadedMat(0xb8bec2, { rough: 0.1 }));
    deck.position.set(cx, 2.8, cz);
    lpier.add(body, deck);
  }
  const lh = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 5, 16), shadedMat(0xd23a2a, { rough: 0.05 }));
  lh.position.set(LP.a2.x1 - 1.5, 5.6, 22);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 16), shadedMat(0xf2f2f2, { rough: 0.05 }));
  cap.position.set(LP.a2.x1 - 1.5, 8.3, 22);
  lpier.add(lh, cap);
}
world.add(lpier);
extras.push(lpier);
const lpSolid = (x, z) => inBox(LP.a1, x, z) || inBox(LP.a2, x, z);
FIELDS.lpier = () => (x, z) => {
  let vx = 1.1, vz = 0;
  // 腕1の上流側（左）：堤防にぶつかって外（沖）へ曲がる＝ヨレ
  if (x < -2) {
    const near = 1 - smooth01((-2 - x) / 9), below = smooth01((25 - z) / 8);
    vx *= 1 - near * below * 0.85;
    vz += near * below * 1.0;
  }
  // 角を回りこんで、外側の面ぞいは少し速い
  vx += 0.5 * Math.exp(-((x + 2) ** 2 + (z - 26) ** 2) / 30);
  if (z > 24 && x > -2 && x < 30) vx += 0.35 * Math.exp(-(z - 24) / 4);
  // 先端の裏のうず（反転流）
  const dx = x - LEDDY.x, dz = z - LEDDY.z;
  const w = Math.exp(-(dx * dx + dz * dz) / (LEDDY.r * LEDDY.r));
  vx = vx * (1 - w) + (dz / LEDDY.r) * 0.45 * w;
  vz = vz * (1 - w) + (-dx / LEDDY.r) * 0.45 * w;
  // 内側（港の中）は流れがほとんどない（ゆっくり回る）
  const inside = smooth01((19 - z) / 3) * smooth01((x - 2) / 3) * smooth01((27 - x) / 4);
  vx = vx * (1 - inside) + inside * 0.12 * ((z - 10) / 10);
  vz = vz * (1 - inside) + inside * -0.12 * ((x - 14) / 12);
  return [vx, vz];
};
// 港の入り口（船道）：左右の堤防のあいだ（x=-4〜4）が入り口。満ち潮で外の水が入り口に集まる
const PT = { l: { x0: -46, x1: -4, z0: 22, z1: 26 }, r: { x0: 4, x1: 46, z0: 22, z1: 26 }, ch: 3 };
const port = new THREE.Group();
{
  for (const b of [PT.l, PT.r]) {
    const w = b.x1 - b.x0, l = b.z1 - b.z0, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, 16, l), concrete);
    body.position.set(cx, -5.2, cz);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.6, l + 0.4), shadedMat(0xb8bec2, { rough: 0.1 }));
    deck.position.set(cx, 2.8, cz);
    port.add(body, deck);
  }
  // 入り口の灯台（左が白・右が赤）
  [[-5.5, 0xf2f2f2], [5.5, 0xd23a2a]].forEach(([x, c]) => {
    const lh = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 5, 16), shadedMat(c, { rough: 0.05 }));
    lh.position.set(x, 5.6, 24);
    port.add(lh);
  });
  // 船道（深い所）：水面に濃い青の帯と、へりの白い線
  const ch = new THREE.Mesh(new THREE.PlaneGeometry(PT.ch * 2, 76).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x02101f, transparent: true, opacity: 0.75, depthTest: false }));
  ch.position.set(0, 0.25, 36);
  ch.renderOrder = 3;
  port.add(ch);
  [-PT.ch, PT.ch].forEach((x) => {
    const e = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 76).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthTest: false }));
    e.position.set(x, 0.28, 36);
    e.renderOrder = 4;
    port.add(e);
  });
}
world.add(port);
extras.push(port);
// 小さな船（船道を通る）
const boat = new THREE.Group();
{
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 6), shadedMat(0xf4f4f4, { rough: 0.1 }));
  hull.position.y = 0.6;
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4), shadedMat(0xf4f4f4, { rough: 0.1 }));
  bow.scale.set(1, 0.45, 1);
  bow.position.set(0, 0.6, -4.2);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 2), shadedMat(0x2f6fb0, { rough: 0.1 }));
  cabin.position.set(0, 1.7, 0.8);
  boat.add(hull, bow, cabin);
  // 船道の帯（深さを無視して描く）より後に描く
  boat.children.forEach((m) => { m.material.transparent = true; m.renderOrder = 6; });
}
world.add(boat);
extras.push(boat);
const ptSolid = (x, z) => inBox(PT.l, x, z) || inBox(PT.r, x, z);
FIELDS.port = () => (x, z) => {
  if (z > 26) {
    // 外：入り口へ集まる。入り口に近いほど速い
    const dx = x, dz = z - 24, r = Math.hypot(dx, dz) + 0.5;
    const sp = 0.25 + 1.5 * Math.exp(-r / 9);
    return [(-dx / r) * sp, (-dz / r) * sp];
  }
  if (z >= 21.5) return [-x * 0.08, -1.8]; // 入り口の中：いちばん速い
  // 港の中：広がって弱まる
  const dx = x, dz = z - 22, r = Math.hypot(dx, dz) + 0.5;
  const sp = 0.2 + 1.5 * Math.exp(-r / 7);
  return [(dx / r) * sp, (dz / r) * sp];
};
// 突堤で潮の向きが逆（右→左）。うずは左側にできる
const pierFwd = FIELDS.pier(1);
FIELDS.pierRev = () => (x, z) => { const v = pierFwd(-x, z); return [-v[0], v[1]]; };
// 2つめの緑の円（答えが2つあるとき）
const TARGET2 = TARGET.clone(), TARGET2_FILL = TARGET_FILL.clone();
TARGET2.material = TARGET.material.clone();
TARGET2_FILL.material = TARGET_FILL.material.clone();
world.add(TARGET2, TARGET2_FILL);
extras.push(TARGET2, TARGET2_FILL);
function target2(x, z, r, a, t) {
  for (const m of [TARGET2, TARGET2_FILL]) { m.visible = a > 0.01; m.position.set(x, 0.7, z); m.scale.setScalar(r * (1 + 0.06 * Math.sin(t * 5 + 1.5))); }
  TARGET2.material.opacity = a;
  TARGET2_FILL.material.opacity = 0.22 * a;
}
// ×じるし（ここではない）
function noMark(p, txt, a) {
  if (a <= 0.01) return;
  const q = project(p);
  html += `<div style="position:absolute;left:${q.x}px;top:${q.y}px;transform:translate(-50%,calc(-100% + 35px));opacity:${a};text-align:center;color:#fff;font-weight:900;text-shadow:0 2px 8px #000"><div style="font-size:${PORTRAIT ? 30 : 28}px;margin-bottom:6px;background:rgba(6,22,42,.85);padding:4px 14px;border-radius:12px;white-space:nowrap">${txt}</div><div style="width:70px;height:70px;margin:0 auto;border-radius:50%;background:#8a96a3;border:5px solid #fff;font-size:44px;line-height:62px">×</div></div>`;
}
const LP_PINS = [V(-5, 0.4, 28), V(14, 0.4, 9), V(16, 0.4, 33)]; // A=角の外、B=内側の奥、C=沖の真ん中
const LP_ANS = [-5, 28], LP_ANS2 = [30, 23];
const PT_ANS = [5.6, 33];
const lpFlow = (T, opts = {}) => { FIELD = FIELDS.lpier(); updateFlow(T, { x0: -40, x1: 50, z0: 2, z1: 70, solid: lpSolid, ...opts }); };
const jxBase = () => { base(0); sky.visible = true; U.under.value = 0; };
// 真上に近い角度（topView より少し真上寄り）。縦画面は少し引く
function jxView(cx, cz, dist, t = 0, d = 1) {
  const k = ease(t / Math.max(d, 0.01));
  const D = PORTRAIT ? dist * 1.08 : dist;
  look(V(cx - 4 + k * 2, D, cz + D * 0.42), V(cx, 0, cz), 48);
}
const fadeIn = (t, t0 = 0, dur = 0.4) => clamp01((t - t0) / dur);

Object.assign(SHOTS, {
  jx_thumb(t, d, s) {
    jxBase();
    show(lpier);
    lpFlow(40);
    look(V(0, 46, 50), V(2, 0, 15), 50);
    html += `<div style="position:absolute;left:0;top:0;bottom:0;width:1000px;background:linear-gradient(90deg,rgba(2,14,28,.8),rgba(2,14,28,0))"></div>`;
    html += `<div style="position:absolute;left:70px;top:210px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px">${s.tag}</span><div style="font-size:150px;line-height:1.1;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
    mapPin(V(LP_ANS2[0], 0.4, LP_ANS2[1]), "？", 1, "#2ecc71");
    mapPin(V(LP_ANS[0], 0.4, LP_ANS[1]), "？", 1, "#2ecc71");
  },
  // つかみ：最初のコマから L字の堤防と光る流れと問い
  jx_hook(t, d, s) {
    jxBase();
    show(lpier);
    lpFlow(t + 30);
    jxView(12, 20, 50, t, d);
    const a = PORTRAIT ? 1 : clamp01(t / 0.3);
    if (PORTRAIT) bigText(0, "このL字の堤防、<br>どこに投げる？", "流れが見えれば、答えがわかる", a);
    else bigText(20, "このL字の堤防、どこに投げる？", "流れが見えれば、答えがわかる", a);
    ["A", "B", "C"].forEach((n, i) => mapPin(LP_PINS[i], n, PORTRAIT ? 1 : clamp01((t - 0.8 - i * 0.3) / 0.3)));
    isoBar(s);
  },
  // 見方：粒の色の意味
  jx_rule(t, d, s, k) {
    jxBase();
    show(lpier);
    lpFlow(t + 40);
    jxView(12, 20, 50, t, d);
    const t0 = t - (s._k0 ?? 0);
    label(V(8, 0.6, 30), "水色＝速い流れ", "", fadeIn(t0, 0.8), "", PORTRAIT ? 60 : 0, -90);
    label(V(14, 0.6, 9), "オレンジ＝ゆるい流れ", "", fadeIn(t0, 2.6), "gold", PORTRAIT ? 60 : 120, -70);
    if (k >= 1) arrow(0, PORTRAIT ? -8 : -22, 34, PORTRAIT ? 6 : -4, 34, "#4cc3ff", fadeIn(t - (s._k1 ?? 0), 0.8), 2.0);
    legend(LEG, k >= 1 ? 1 : fadeIn(t0, 1.5));
    if (k >= 1) html += `<div style="position:absolute;${PORTRAIT ? "right:40px;top:440px" : "right:60px;top:290px"};background:rgba(6,22,42,.9);border:4px solid #2ecc71;border-radius:14px;padding:6px 16px;color:#fff;font-size:${PORTRAIT ? 34 : 30}px;font-weight:900;opacity:1;box-shadow:0 0 ${10 + 8 * Math.sin(t * 5)}px #2ecc71">▲ <span style="color:#2ecc71">緑</span>＝投げる場所</div>`;
    miniMap("lpier", null, fadeIn(t0, 0.5));
    isoBar(s);
  },
  // L字の堤防：k0 曲がる流れ → k1 答え① 角のヨレ → k2 答え② 先端の裏 → k3 B・C はちがう
  jx_lpier(t, d, s, k) {
    jxBase();
    show(lpier);
    const focus = k === 0 || k === 1 ? { x: -5, z: 26, r: 7, dim: 0.3 } : k === 2 ? { x: LP_ANS2[0], z: LP_ANS2[1] - 3, r: 7, dim: 0.3 } : null;
    lpFlow(t + 50, { focus });
    if (PORTRAIT) {
      // 縦は横が狭いので、説明中の場所へカメラを寄せる
      const cxs = [3, 3, 23, 12], ds = [46, 46, 46, 60], kk = Math.min(k, 3), pk = Math.max(0, kk - 1);
      const e = ease(clamp01((t - (s["_k" + kk] ?? 0)) / 1.2));
      jxView(lerp(cxs[pk], cxs[kk], e), 20, lerp(ds[pk], ds[kk], e), 0, 1);
    } else jxView(12, 20, 50, t, d);
    const t1 = t - (s._k1 ?? 0), t2 = t - (s._k2 ?? 0), t3 = t - (s._k3 ?? 0);
    if (k <= 1) {
      const ak = k === 1 ? 0.45 : 1;
      arrow(0, PORTRAIT ? -16 : -20, 14, -7, 14, "#4cc3ff", fadeIn(t, 0.2) * ak, 1.8);
      arrow(1, -6, 17, -6, 30, "#4cc3ff", fadeIn(t, 1.2) * ak, 1.4);
    }
    if (k === 1) {
      target(LP_ANS[0], LP_ANS[1], 3.4, fadeIn(t1, 0.3), t);
      label(V(LP_ANS[0], 0.6, LP_ANS[1]), "ここ！①", "角のヨレ（流れが曲がる）", fadeIn(t1, 0.3), "gold ans", PORTRAIT ? 160 : 300, -10);
    }
    if (k === 2) {
      arrow(1, 36, 8, 34, 20, "#ff9f40", fadeIn(t2, 0.2), 1.2);
      target(LP_ANS2[0], LP_ANS2[1], 3.2, fadeIn(t2, 0.5), t);
      label(V(LP_ANS2[0], 0.6, LP_ANS2[1]), "ここ！②", "先端の裏・うずとのさかい目", fadeIn(t2, 0.5), "gold ans", PORTRAIT ? -120 : 0, -90);
    }
    if (k >= 3) {
      target(LP_ANS[0], LP_ANS[1], 3, 1, t);
      target2(LP_ANS2[0], LP_ANS2[1], 3, 1, t);
      noMark(LP_PINS[1], "B：流れがほとんどない", fadeIn(t3, 0.2));
      noMark(LP_PINS[2], "C：流れに変化がない", fadeIn(t3, 1.6));
    }
    miniMap("lpier", k === 1 ? [27, 57] : k === 2 ? [75, 51] : null);
    legend(LEG);
    isoBar(s);
  },
  // 通し方：さかい目の少し上流に投げ、流れにのせて通す（k0 投げる → k1 流れにのせる → k2 エサのように）
  jx_drift(t, d, s, k) {
    jxBase();
    show(lpier);
    lpFlow(t + 60, { focus: { x: -7, z: 26, r: 8, dim: 0.35 } });
    if (PORTRAIT) jxView(-6, 24, 36, 0, 1);
    else jxView(-5, 25, 34, t, d);
    const t0 = t - (s._k0 ?? 0), t1 = t - (s._k1 ?? 0);
    placeMan(man, -0.6, 22.6, Math.PI / 2 + 0.3);
    target(LP_ANS[0], LP_ANS[1], 3.4, 0.5, t);
    const P0 = V(-0.6, 4.5, 22.6), L0 = V(-15, 0.5, 25), C = V(-7, 0.5, 32), E = V(-1.5, 0.5, 24.2);
    const bez2 = (u) => V((1 - u) ** 2 * L0.x + 2 * u * (1 - u) * C.x + u * u * E.x, 0.5, (1 - u) ** 2 * L0.z + 2 * u * (1 - u) * C.z + u * u * E.z);
    const pts = (arr) => arr.map((v) => { const q = project(v); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(" ");
    // 投げる（放物線）
    const ck = clamp01((t0 - 0.6) / 1.4);
    const air = Array.from({ length: 25 }, (_, i) => { const u = (i / 24) * ck; return V(lerp(P0.x, L0.x, u), lerp(P0.y, 0.5, u) + Math.sin(u * Math.PI) * 6, lerp(P0.z, L0.z, u)); });
    if (k === 0 && ck > 0) lines += `<polyline points="${pts(air)}" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="4" stroke-dasharray="10 8"/>`;
    // 流れにのせて通す道すじ
    const ka = k >= 1 ? 1 : clamp01((t0 - 2.2) / 0.5);
    if (ka > 0) lines += `<polyline points="${pts(Array.from({ length: 31 }, (_, i) => bez2(i / 30)))}" fill="none" stroke="rgba(255,209,102,${0.95 * ka})" stroke-width="7" stroke-dasharray="16 10"/>`;
    // ルアー（黄色い点）
    let lp = null;
    if (k === 0) lp = ck < 1 ? air[24] : L0;
    else lp = bez2(((t1 * 0.16) % 1.15) > 1 ? 1 : (t1 * 0.16) % 1.15);
    if (lp && ck > 0) { const q = project(lp); html += `<div style="position:absolute;left:${q.x}px;top:${q.y}px;width:30px;height:30px;transform:translate(-50%,-50%);border-radius:50%;background:#ffd166;border:5px solid #fff;box-shadow:0 0 18px #ffd166"></div>`; }
    label(L0, "ここに投げる", "さかい目の少し上流", k === 0 ? fadeIn(t0, 2.0) : 0, "gold", PORTRAIT ? 60 : -40, -90);
    if (k >= 1) label(V(-8, 0.5, 29), "流れにのせて通す", "", fadeIn(t1, 0.4), "gold ans", PORTRAIT ? -40 : -300, -150);
    label(V(-0.6, 4.6, 22.6), "立つ場所", "", 0.9, "", PORTRAIT ? 120 : 160, -40);
    miniMap("lpier", [27, 57]);
    legend(LEG);
    isoBar(s);
  },
  // 港の入り口（船道）：k0 船道 → k1 流れが集まる → k2 答え 船道のへり → k3 船が来たら上げる
  jx_port(t, d, s, k) {
    jxBase();
    show(port);
    FIELD = FIELDS.port();
    const focus = k === 1 ? { x: 0, z: 26, r: 7, dim: 0.3 } : k === 2 ? { x: PT_ANS[0], z: PT_ANS[1], r: 5, dim: 0.3 } : null;
    updateFlow(t + 20, { x0: -50, x1: 50, z0: 2, z1: 74, solid: ptSolid, alpha: k === 0 ? 0.35 : 1, focus });
    jxView(0, 26, 50, t, d);
    const t0 = t - (s._k0 ?? 0), t1 = t - (s._k1 ?? 0), t2 = t - (s._k2 ?? 0), t3 = t - (s._k3 ?? 0);
    if (k === 0) label(V(0, 0.6, 44), "船道（深い道）", "船が通るために深くしてある", fadeIn(t0, 0.5), "gold", PORTRAIT ? 0 : 230, -60);
    if (k === 1) {
      arrow(0, -16, 46, -4, 31, "#4cc3ff", fadeIn(t1, 0.2), 1.5);
      arrow(1, 16, 46, 4, 31, "#4cc3ff", fadeIn(t1, 0.2), 1.5);
      arrow(2, 0, 30, 0, 14, "#4cc3ff", fadeIn(t1, 1.0), 2.0);
      label(V(0, 0.6, 18), "入り口で速くなる", "", fadeIn(t1, 1.4), "", PORTRAIT ? 160 : 260, 40);
    }
    if (k >= 2) {
      target(PT_ANS[0], PT_ANS[1], 2.6, k === 2 ? fadeIn(t2, 0.3) : 1, t);
      label(V(PT_ANS[0], 0.6, PT_ANS[1]), "ここ！", "船道のへり（深さのさかい目）", k === 2 ? fadeIn(t2, 0.3) : 1, "gold ans", PORTRAIT ? 80 : 160, -80);
    }
    if (k >= 3) {
      const u = clamp01(t3 / 7);
      boat.visible = true;
      boat.position.set(0, 0, lerp(50, 31, ease(u)));
      boat.rotation.y = 0;
      html += `<div class="card" style="left:${PORTRAIT ? 40 : 110}px;top:${PORTRAIT ? 1080 : 560}px;width:${PORTRAIT ? 900 : 620}px;border-left:16px solid #e3412b;opacity:${fadeIn(t3, 0.3)}"><b style="font-size:40px;color:#c62828">⚠ 船が来たら仕掛けを上げる</b><div style="font-size:30px;margin-top:6px">船の通り道。立入禁止の場所には入らない</div></div>`;
    }
    miniMap("port", k >= 2 ? [57, 48] : null, 1, "in");
    legend(LEG);
    isoBar(s);
  },
  // 答え合わせ：突堤で潮の向きが逆（右→左）。k0 問い → k1 A・B・C → k2 答え B → k3 まとめの一言
  jx_quiz(t, d, s, k) {
    jxBase();
    show(pier);
    FIELD = FIELDS.pierRev();
    const focus = k >= 2 ? { x: -EDDY.x + 2, z: EDDY.z + 4, r: 6, dim: 0.3 } : null;
    updateFlow(t + 30, { x0: -30, x1: 40, z0: 2, z1: 70, pier: true, focus });
    jxView(0, 20, 42, t, d);
    const t2 = t - (s._k2 ?? 0), t3 = t - (s._k3 ?? 0);
    arrow(0, PORTRAIT ? 14 : 26, 22, 4, 22, "#4cc3ff", fadeIn(t, 0.2), 2.0);
    if (k <= 1) {
      bigText(PORTRAIT ? 0 : 90, "潮の向きが逆！", "どこに投げる？", fadeIn(t, 0.2));
      const pins = [V(5.5, 0.4, 24), V(-5.5, 0.4, 24), V(12, 0.4, 31)];
      ["A", "B", "C"].forEach((n, i) => mapPin(pins[i], n, fadeIn(t, 0.8 + i * 0.3, 0.3)));
    }
    if (k >= 2) {
      target(-5.5, 24, 3.2, fadeIn(t2, 0.3), t);
      label(V(-5.5, 0.6, 24), "答え B！", "うずは流れの下流側にできる", fadeIn(t2, 0.3), "gold ans", PORTRAIT ? 120 : 0, -90);
      noMark(V(5.5, 0.4, 26), "A：上流側は流れが当たるだけ", fadeIn(t2, 1.5));
    }
    if (k >= 3) bigText(PORTRAIT ? 0 : 120, "潮の向きが変われば", "投げる場所も変わる", fadeIn(t3, 0.2));
    if (!(PORTRAIT && (k <= 1 || k >= 3))) { miniMap("pier", k >= 2 ? [44, 56] : null, 1, "l"); legend(LEG); }
    isoBar(s);
  },
  jx_sum(t, d, s, k) {
    jxBase();
    show(lpier);
    lpFlow(t + 80, { alpha: 0.6 });
    jxView(12, 20, 50, 0, 1);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,${0.4 * clamp01(t / 0.4)})"></div>`;
    const P = PORTRAIT;
    const rows = [["L字の堤防", "角のヨレ・先端の裏"], ["港の入り口", "船道のへり"], ["河口", "川の水と海の水のさかい目"], ["テトラ帯", "切れ目・端（上には乗らない）"], ["突堤", "先端の裏（潮で左右が入れかわる）"]];
    html += `<div class="big" style="top:${P ? 330 : 80}px;font-size:${P ? 76 : 60}px">形はちがっても答えは<br><span style="color:#2ecc71">「流れのさかい目」</span></div>`;
    rows.forEach(([a1, b1], i) => {
      const a = clamp01((t - 0.4 - i * 0.35) / 0.3);
      html += `<div class="card" style="left:${P ? 60 : 360}px;right:${P ? 60 : 360}px;top:${(P ? 700 : 320) + i * (P ? 150 : 128)}px;opacity:${a};display:flex;align-items:center;gap:22px;padding:14px 26px"><b style="background:#2ecc71;color:#06213a;font-size:34px;padding:6px 16px;border-radius:14px;white-space:nowrap;min-width:190px;text-align:center">${a1}</b><div style="font-size:36px;font-weight:900">${b1}</div></div>`;
    });
    isoBar(s);
  },
});

// =====================================================================
// 仕上げ（v2）：ブルーム（光のにじみ）・色の調整・周辺減光・フィルムの粒子・色ずれ
// ?look=v1 で従来の見た目
// =====================================================================
const LOOK_V2 = /look=v2/.test(location.search); // 2026-10-30 オーナー判断：わかりやすさ優先。仕上げ v2 は使わない（?look=v2 で試せる）
const POST = (() => {
  if (!LOOK_V2) return null;
  const mk = (w, h, samples = 0) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples, depthBuffer: samples > 0 });
  const rtScene = mk(W, H, 4);
  const rtA = mk(W >> 2, H >> 2), rtB = mk(W >> 2, H >> 2), rtC = mk(W >> 3, H >> 3), rtD = mk(W >> 3, H >> 3);
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const qs = new THREE.Scene();
  qs.add(quad);
  const vs = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  const bright = new THREE.ShaderMaterial({
    uniforms: { src: { value: null }, th: { value: 0.68 } }, vertexShader: vs,
    fragmentShader: `uniform sampler2D src; uniform float th; varying vec2 vUv;
      void main(){ vec3 c = texture2D(src, vUv).rgb; float l = dot(c, vec3(0.299,0.587,0.114)); gl_FragColor = vec4(c * smoothstep(th, th + 0.35, l), 1.0); }`,
  });
  const blur = new THREE.ShaderMaterial({
    uniforms: { src: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: vs,
    fragmentShader: `uniform sampler2D src; uniform vec2 dir; varying vec2 vUv;
      void main(){ vec3 c = texture2D(src, vUv).rgb * 0.227;
        c += (texture2D(src, vUv + dir*1.385).rgb + texture2D(src, vUv - dir*1.385).rgb) * 0.316;
        c += (texture2D(src, vUv + dir*3.231).rgb + texture2D(src, vUv - dir*3.231).rgb) * 0.070;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const comp = new THREE.ShaderMaterial({
    uniforms: { src: { value: null }, b1: { value: null }, b2: { value: null }, time: { value: 0 }, night: { value: 0 }, res: { value: new THREE.Vector2(W, H) } },
    vertexShader: vs,
    fragmentShader: `uniform sampler2D src; uniform sampler2D b1; uniform sampler2D b2; uniform float time; uniform float night; uniform vec2 res; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec2 d = vUv - 0.5;
        float r2 = dot(d, d);
        // 画面の端ほど少しだけ色がずれる
        vec2 ca = d * r2 * 0.012;
        vec3 c = vec3(texture2D(src, vUv + ca).r, texture2D(src, vUv).g, texture2D(src, vUv - ca).b);
        // 光のにじみ
        vec3 bl = texture2D(b1, vUv).rgb * 0.9 + texture2D(b2, vUv).rgb * 1.1;
        c += bl * mix(0.7, 1.05, night);
        // 色の調整：コントラスト、彩度、暗部は青緑・明部は暖色
        float l = dot(c, vec3(0.299,0.587,0.114));
        c = mix(vec3(l), c, 1.12);
        c = mix(c, c * vec3(0.92, 1.02, 1.08), smoothstep(0.45, 0.0, l) * 0.6);
        c = mix(c, c * vec3(1.06, 1.0, 0.92), smoothstep(0.55, 1.0, l) * 0.5);
        c = (c - 0.5) * 1.06 + 0.5 + 0.01;
        // 周辺減光
        c *= mix(1.0, 0.72, smoothstep(0.12, 0.62, r2 * 2.2));
        // フィルムの粒子
        c += (h(vUv * res + fract(time * 7.13) * 100.0) - 0.5) * 0.035;
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`,
  });
  function pass(mat, target) {
    quad.material = mat;
    renderer.setRenderTarget(target);
    renderer.render(qs, quadCam);
  }
  return {
    render() {
      renderer.setRenderTarget(rtScene);
      renderer.clear();
      renderer.render(scene, camera);
      bright.uniforms.src.value = rtScene.texture; pass(bright, rtA);
      blur.uniforms.src.value = rtA.texture; blur.uniforms.dir.value.set(1 / (W >> 2), 0); pass(blur, rtB);
      blur.uniforms.src.value = rtB.texture; blur.uniforms.dir.value.set(0, 1 / (H >> 2)); pass(blur, rtA);
      blur.uniforms.src.value = rtA.texture; blur.uniforms.dir.value.set(1 / (W >> 3), 0); pass(blur, rtC);
      blur.uniforms.src.value = rtC.texture; blur.uniforms.dir.value.set(0, 1 / (H >> 3)); pass(blur, rtD);
      blur.uniforms.src.value = rtD.texture; blur.uniforms.dir.value.set(2 / (W >> 3), 0); pass(blur, rtC);
      blur.uniforms.src.value = rtC.texture; blur.uniforms.dir.value.set(0, 2 / (H >> 3)); pass(blur, rtD);
      comp.uniforms.src.value = rtScene.texture;
      comp.uniforms.b1.value = rtA.texture;
      comp.uniforms.b2.value = rtD.texture;
      comp.uniforms.time.value = U.time.value;
      comp.uniforms.night.value = U.night.value;
      pass(comp, null);
    },
  };
})();

// =====================================================================
// 道具紹介（gt_ タックル／gl_ ジグ・ライン／gg_ 便利グッズ）2026-11-04
// 動きはイメージ（CG）。数字はメーカー公表値・物性値（タングステンと鉛の密度）だけ
// =====================================================================
function makeJigModel(back, belly, rear = false, holo = 0) {
  const g = new THREE.Group();
  const prof = [];
  for (let i = 0; i <= 24; i++) {
    const f = i / 24; // 0=尾 1=頭
    const bulge = rear ? Math.sin(Math.PI * Math.pow(f, 0.55)) * (1.05 - 0.3 * f) : Math.sin(Math.PI * f) * 0.95;
    prof.push(new THREE.Vector2(Math.max(0.005, 0.04 + 0.2 * bulge), (f - 0.5) * 1.6));
  }
  const geo = new THREE.LatheGeometry(prof, 24);
  geo.scale(1, 1, 0.42);
  const body = new THREE.Mesh(geo, metalMat(back, belly, { holo }));
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0x111111 }));
  eye.position.set(0, 0.6, 0.068);
  const eye2 = eye.clone(); eye2.position.z = -0.068;
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 16, Math.PI * 1.3), shadedMat(0x777777, { rough: 0.05 }));
  hook.position.set(0.04, 0.9, 0); hook.rotation.z = -1.0;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 14), shadedMat(0x999999, { rough: 0.05 }));
  ring.position.set(0, 0.84, 0); ring.rotation.y = Math.PI / 2;
  g.add(body, eye, eye2, hook, ring);
  g.rotation.z = -Math.PI / 2;
  const p = new THREE.Group();
  p.add(g);
  world.add(p);
  extras.push(p);
  return p;
}
const jigC = makeJigModel(0x1a4fd0, 0xd8dde4, false, 0.4); // センターバランス（青）
const jigR = makeJigModel(0xd0306a, 0xf0e0e6, true, 0.4); // リアバランス（ピンク）
const jigPb = makeJigModel(0x8f9aa6, 0xe6eaee, false, 0); // 鉛（銀）
const jigW = makeJigModel(0xd9a21a, 0xc78a10, false, 0); // タングステン（金）
const W_SCALE = Math.cbrt(11.34 / 19.3); // 同じ重さなら長さは約0.84倍（体積は約0.59倍）
function makeTrail(rgb) {
  const n = 70, g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("a", new THREE.BufferAttribute(new Float32Array(n), 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float a; varying float vA; void main(){ vA = a; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = 0.12*900.0/-mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-0.5); gl_FragColor = vec4(vec3(${rgb})*smoothstep(0.5,0.1,d)*vA, 1.0); }` });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  world.add(p);
  extras.push(p);
  p.update = (fn, T, origin, span = 2) => {
    p.visible = true;
    const pos = g.attributes.position.array, a = g.attributes.a.array;
    for (let i = 0; i < n; i++) {
      const m2 = fn(Math.max(0, T - (i / n) * span));
      pos[i * 3] = origin.x + m2.p.x; pos[i * 3 + 1] = origin.y + m2.p.y; pos[i * 3 + 2] = origin.z + m2.p.z;
      a[i] = (1 - i / n) * 0.85;
    }
    g.attributes.position.needsUpdate = true;
    g.attributes.a.needsUpdate = true;
  };
  return p;
}
const trailC = makeTrail("0.45,0.75,1.0"), trailR = makeTrail("1.0,0.45,0.7");
// 落ち方（イメージ）。P 秒でくり返す
const FALLS = {
  center(T) { T %= 7; return { p: V(Math.sin(T * 2.2) * 0.45, -T * 0.75, Math.sin(T * 1.6) * 0.25), pitch: -0.15 + Math.sin(T * 4.4) * 0.5, roll: Math.sin(T * 5.5) * 1.15 }; },
  rear(T) { T %= 3.5; return { p: V(Math.sin(T * 1.5) * 0.08, -T * 1.5, 0), pitch: 1.25 + Math.sin(T * 7) * 0.08, roll: Math.sin(T * 9) * 0.3 }; },
};
const GO = V(-20, -3.2, 20); // ジグの見せ場（沖）
function imgNote(txt = "動きはイメージ（CG）") {
  html += `<div style="position:absolute;right:${PORTRAIT ? 40 : 60}px;bottom:${PORTRAIT ? 380 : 150}px;color:#cfe6f5;font-size:24px;font-weight:700;opacity:.85">${txt}</div>`;
}
function twoFalls(t, which = 2) {
  const dx = PORTRAIT ? 1.1 : 1.7;
  const oC = V(GO.x - dx, GO.y + 2.2, GO.z), oR = V(GO.x + dx, GO.y + 2.2, GO.z);
  if (which !== 1) { placeLure(jigC, FALLS.center(t), oC); trailC.update(FALLS.center, t, oC, 1.6); }
  if (which !== 0) { placeLure(jigR, FALLS.rear(t), oR); trailR.update(FALLS.rear, t, oR, 1.0); }
  return { oC, oR };
}
// 1匹だけの魚（大きさを本物に近くする場面用）
const oneFish = fishMesh("ハマチ", 0.7, { amp: 0.12, freq: 9 });
world.add(oneFish);
extras.push(oneFish);
// 糸（PE とリーダー）を太めのチューブで描く
const peTube = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xffe14d }));
const ldTube = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.85 }));
world.add(peTube, ldTube);
extras.push(peTube, ldTube);
function setTube(mesh, pts, r) {
  mesh.visible = true;
  mesh.geometry.dispose();
  mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, r, 6, false);
}
// タモ網：枠（直径60cm）・網・柄
const tamo = new THREE.Group();
{
  const ringT = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.014, 6, 32), shadedMat(0x333a40));
  ringT.rotation.x = Math.PI / 2;
  const net = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.55, 18, 5, true), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.55 }));
  net.rotation.x = Math.PI;
  net.position.y = -0.27;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 5, 8).translate(0, 2.5 + 0.3, 0), shadedMat(0x2b2f33));
  pole.rotation.z = 0; // 柄は +y 方向
  tamo.userData.pole = pole;
  tamo.add(ringT, net);
  const poleG = new THREE.Group();
  poleG.add(pole);
  tamo.add(poleG);
  tamo.userData.poleG = poleG;
}
world.add(tamo);
extras.push(tamo);
function placeTamo(ring, handle) {
  tamo.visible = true;
  tamo.position.copy(ring);
  const dir = handle.clone().sub(ring).normalize();
  tamo.userData.poleG.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
  tamo.userData.poleG.position.set(0, 0, 0);
}
function placeOne(p, yaw = 0, pitch = 0) {
  oneFish.visible = true;
  oneFish.position.copy(p);
  oneFish.rotation.set(0, yaw, pitch, "YXZ");
}
const cardHtml = ([title, rows]) => `<div style="font-size:36px;font-weight:900;color:#10345a">${title}</div>${rows.map(([a1, b1]) => `<div style="font-size:30px;margin-top:10px">${a1 ? `<b style="color:#e3412b">${a1}</b>　` : ""}${b1}</div>`).join("")}`;
function prCard(inner, a, pos) { html += acCard(inner, a, pos); }
// タックルセットのカード
function setBox(st, a, col) {
  const P = PORTRAIT;
  return `<div style="opacity:${a};transform:translateY(${(1 - a) * 20}px);background:#f4f7fa;border-radius:20px;padding:${P ? "18px 22px" : "18px 24px"};border-left:14px solid ${col};margin-top:16px">
    <div style="font-size:${P ? 30 : 28}px;font-weight:900;color:${col}">${st.label}</div>
    <div style="font-size:${P ? 38 : 36}px;font-weight:900;color:#10345a;margin-top:6px">ロッド：${st.rod}</div><div style="font-size:${P ? 28 : 26}px;color:#3a5a78">${st.rodSpec}</div>
    <div style="font-size:${P ? 38 : 36}px;font-weight:900;color:#10345a;margin-top:8px">リール：${st.reel}</div><div style="font-size:${P ? 28 : 26}px;color:#3a5a78">${st.reelSpec}</div></div>`;
}
const TIER_COL = ["#2a9d5c", "#1f6fd1", "#c2410c"];
function castMan(t, jigOut = true) {
  placeMan(man, 0, -4, Math.PI);
  const c = (t % 4) / 4;
  const back = c < 0.45 ? smooth01(c / 0.45) : 1 - smooth01((c - 0.45) / 0.12);
  const ang = lerp(-0.4, 1.35, back);
  const base3 = V(0.3, 4.3, -4);
  rod.visible = true;
  rod.position.copy(base3);
  rod.rotation.set(-ang, 0, 0);
  const tip = V(0.3, 4.3 + Math.cos(ang) * 3, -4 - Math.sin(ang) * 3);
  let lure;
  if (c < 0.57) lure = V(tip.x, tip.y - 1.2 + back * 0.4, tip.z - back * 1.6);
  else { const f = (c - 0.57) / 0.43; lure = V(tip.x, tip.y + Math.sin(f * Math.PI) * 5 - f * 3.5, tip.z + f * 30); }
  const pts = []; for (let i = 0; i < 24; i++) { const f = i / 23; pts.push(V(lerp(tip.x, lure.x, f), lerp(tip.y, lure.y, f) - Math.sin(f * Math.PI) * 0.6, lerp(tip.z, lure.z, f))); }
  fishLine.visible = true;
  fishLine.geometry.setFromPoints(pts);
  if (jigOut) { jigPivot.visible = true; jigPivot.scale.setScalar(0.4); jigPivot.position.copy(lure); jigPivot.rotation.set(0, Math.PI / 2, -1.2); }
}
function aboveWall(t) {
  base(0.05);
  sky.visible = true;
  U.under.value = 0;
}
const prBadge = () => { html += `<div style="position:absolute;${PORTRAIT ? "right:40px;top:205px" : "right:250px;top:46px"};background:#e3412b;color:#fff;font-weight:900;font-size:${PORTRAIT ? 30 : 30}px;padding:4px 18px;border-radius:12px;z-index:6">PR</div>`; };

Object.assign(SHOTS, {
  // ---------- タックル ----------
  gt_thumb(t, d, s) {
    aboveWall(t);
    castMan(1.9);
    look(V(9, 5.2, 9), V(0, 5, -3), 52);
    if (s.clean) return;
    html += `<div style="position:absolute;left:0;top:0;bottom:0;width:1100px;background:linear-gradient(90deg,rgba(2,14,28,.85),rgba(2,14,28,0))"></div>`;
    html += `<div style="position:absolute;left:70px;top:190px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px">${s.tag}</span><div style="font-size:140px;line-height:1.1;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div>
      <div style="display:flex;gap:18px;margin-top:34px">${["初級", "中級", "上級"].map((x, i) => `<span style="background:${TIER_COL[i]};font-size:54px;padding:8px 30px;border-radius:18px">${x}</span>`).join("")}</div></div>`;
  },
  gt_hook(t, d, s) {
    aboveWall(t);
    castMan(t + 1.2);
    const k = ease(t / d);
    look(V(lerp(10, 7, k), 5.4, lerp(12, 8, k)), V(0, 5, -3), 52);
    const a = PORTRAIT ? 1 : clamp01(t / 0.3);
    bigText(PORTRAIT ? 1000 : 120, "ショアジギング、<br>何を買えばいい？", "初級・中級・上級のおすすめタックルセット", a);
    if (!PORTRAIT) html += `<div style="position:absolute;left:0;right:0;top:560px;display:flex;gap:26px;justify-content:center">${["初級", "中級", "上級"].map((x, i) => `<span style="background:${TIER_COL[i]};color:#fff;font-weight:900;font-size:60px;padding:10px 38px;border-radius:20px;opacity:${clamp01((t - 0.8 - i * 0.35) / 0.3)}">${x}</span>`).join("")}</div>`;
  },
  gt_rod(t, d, s, k) {
    aboveWall(t);
    castMan(t);
    const ang = 0.6 + t * 0.03;
    look(V(Math.sin(ang) * 11, 6, -4 + Math.cos(ang) * 11), V(0, 5.6, -4), 50);
    label(V(0.3, 6.5, -5.2), "9.6フィート＝約2.9m", "堤防・沖堤防で扱いやすい長さ", k >= 0 ? 1 : 0, "gold", PORTRAIT ? 0 : -320, -40);
    prCard(`<div style="font-size:38px;font-weight:900;color:#10345a">ロッドの選び方</div>${[["長さ", "9.6フィート前後（遠投なら10フィート）"], ["硬さ", "ML〜M"], ["投げられるジグ", "上限50〜60g（40gが中心）"], ["重さ", "250g前後まで（1日投げても疲れにくい）"]].map(([a1, b1], i) => `<div style="font-size:30px;margin-top:12px;opacity:${k >= [0, 1, 1, 2][i] ? 1 : 0.2}"><b style="color:#e3412b">${a1}</b>　${b1}</div>`).join("")}`, 1, PORTRAIT ? [60, 120, 960] : [1060, 150, 780]);
  },
  gt_jigmax(t, d, s) {
    base(0);
    surfaceLife(t + 5);
    look(V(-14, -3, 44), V(-6, -3, 26), 55);
    html += acDim(0.45);
    html += acCard(acBars("投げられるジグの重さ（上限）", s.rows.map(([lab, v], i) => [lab, v, i === s.hi ? "#e3412b" : "#1f6fd1", `${v}g`]), 75, t, { line: [40, "よく使う40g"], src: "各メーカーの公表値（2026年10月調べ）", note: s.note }), clamp01(t / 0.4));
  },
  gt_gear(t, d, s, k) {
    base(0);
    show(sardines);
    const T = (t % 6);
    const o = V(GO.x - 8, GO.y, GO.z);
    const mN = { p: V(T * 1.9, Math.sin(T * 1.3) * 0.05 - 0.9, -1.4), pitch: 0, roll: Math.sin(T * 14) * 0.3 };
    const mH = { p: V(T * 2.6, Math.sin(T * 1.2) * 0.05 + 0.5, 1.4), pitch: 0, roll: Math.sin(T * 14) * 0.3 };
    placeLure(jigPb, mN, o);
    placeLure(jigC, mH, o);
    const cH = jigC.position.clone(), cN = jigPb.position.clone();
    if (k >= 1) chase(t, cH, 2.2, 0.35);
    const mid = cH.clone().add(cN).multiplyScalar(0.5);
    look(V(mid.x - 3, mid.y + 1.6, mid.z + 8.5), V(mid.x + 0.5, mid.y, mid.z), 52);
    label(cN, "ノーマルギア", "", 1, "", 0, 130);
    label(cH, "ハイギア（XG・XH）", "ハンドル1回転で多く巻ける", 1, "gold", 0, -90);
    if (k >= 1) label(V(cH.x - 2.4, cH.y, cH.z), "サゴシ・サワラ", "速い動きを追う", 1, "", -150, 110);
    html += `<div class="big" style="top:${PORTRAIT ? 330 : 120}px;font-size:${PORTRAIT ? 56 : 50}px">同じ回数だけハンドルを回すと…</div>`;
    if (k >= 2) prCard(`<div style="font-size:36px;font-weight:900;color:#10345a">リールの選び方</div><div style="font-size:30px;margin-top:10px"><b style="color:#e3412b">大きさ</b>　4000番〜C5000番</div><div style="font-size:30px;margin-top:8px"><b style="color:#e3412b">ギア</b>　ハイギア（XG・XH）</div><div style="font-size:30px;margin-top:8px"><b style="color:#e3412b">ほか</b>　軽さ・海水への強さ・ドラグ</div>`, 1, PORTRAIT ? [60, 120, 960] : [1080, 560, 760]);
    imgNote();
  },
  gt_set(t, d, s, k) {
    base(0);
    const c = surfaceLife(t + 10 * s.tier);
    look(V(c.x - 10, -2.6, c.z + 12), V(c.x + 1, -2.6, c.z - 2), 58);
    html += acDim(0.5);
    const col = TIER_COL[s.tier];
    const inner = `<div style="display:flex;align-items:center;gap:20px"><span style="background:${col};color:#fff;font-weight:900;font-size:48px;padding:6px 30px;border-radius:16px">${["初級", "中級", "上級"][s.tier]}</span><span style="font-size:34px;font-weight:900;color:#10345a">${s.who}</span></div>
      ${s.sets.map((st, i) => setBox(st, clamp01((t - 0.4) / 0.4) * (k >= i ? 1 : 0.15), col)).join("")}`;
    html += acCard(inner, clamp01(t / 0.4), PORTRAIT ? [50, 330, 980] : [330, 105, 1260]);
  },
  gt_sum(t, d, s) {
    base(0);
    const c = surfaceLife(t);
    look(V(c.x - 10, -2.6, c.z + 12), V(c.x + 1, -2.6, c.z - 2), 58);
    html += acDim(0.55);
    const P = PORTRAIT;
    html += `<div style="position:absolute;left:${P ? 50 : 140}px;right:${P ? 50 : 140}px;top:${P ? 330 : 140}px;display:flex;${P ? "flex-direction:column" : ""};gap:22px">${s.cols.map(([tier, a1, b1], i) => `<div style="flex:1;background:rgba(255,255,255,.95);border-radius:24px;padding:22px 26px;opacity:${clamp01((t - i * 0.3) / 0.4)};border-top:14px solid ${TIER_COL[i]}"><div style="font-size:48px;font-weight:900;color:${TIER_COL[i]}">${tier}</div><div style="font-size:34px;font-weight:900;color:#10345a;margin-top:10px">${a1}</div><div style="font-size:30px;color:#3a5a78;margin-top:8px">${b1}</div></div>`).join("")}</div>`;
  },
  // ---------- ジグ・ライン ----------
  gl_thumb(t, d, s) {
    base(0);
    twoFalls(1.3);
    look(V(GO.x, GO.y + 1.4, GO.z + 6.5), V(GO.x, GO.y + 1.4, GO.z), 50);
    if (s.clean) return;
    html += `<div style="position:absolute;left:0;top:0;bottom:0;width:1000px;background:linear-gradient(90deg,rgba(2,14,28,.85),rgba(2,14,28,0))"></div>`;
    html += `<div style="position:absolute;left:70px;top:210px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px">${s.tag}</span><div style="font-size:140px;line-height:1.1;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
  },
  gl_hook(t, d, s) {
    base(0);
    const { oC, oR } = twoFalls(t);
    look(V(GO.x, GO.y + 1.2, GO.z + (PORTRAIT ? 9 : 7.5)), V(GO.x, GO.y + 1.0, GO.z), 52);
    if (!PORTRAIT) {
      label(jigC.position, "センターバランス", "", 1, "", -200, -60);
      label(jigR.position, "リアバランス", "", 1, "red", 200, -60);
    }
    const a = PORTRAIT ? 1 : clamp01(t / 0.3);
    bigText(PORTRAIT ? 1060 : 800, PORTRAIT ? "同じ40gでも、<br>落ち方がちがう" : "同じ40gでも、落ち方がちがう", "ジグとラインの選び方", a);
    imgNote();
  },
  gl_balance(t, d, s, k) {
    base(0);
    twoFalls(t, k >= 2 ? 2 : k);
    const tgt = k === 0 ? jigC.position : k === 1 ? jigR.position : GO;
    look(V(tgt.x, GO.y + 0.4, GO.z + (k >= 2 ? 7.5 : 5)), V(tgt.x, GO.y + 0.3, GO.z), 52);
    if (k !== 1) label(jigC.position, "センターバランス", "ひらひら・ゆっくり落ちる（万能）", 1, "", 0, -90);
    if (k >= 1) label(jigR.position, "リアバランス", "まっすぐ速く沈む・よく飛ぶ", 1, "red", 0, -90);
    imgNote();
  },
  gl_tg(t, d, s, k) {
    base(0);
    const o = V(GO.x, GO.y, GO.z);
    const rot = { p: V(0, 0, 0), pitch: 0.1, roll: Math.sin(t * 0.6) * 0.5 };
    const dx = PORTRAIT ? 0.9 : 1.2;
    placeLure(jigPb, { ...rot, p: V(-dx, 0, 0) }, o);
    placeLure(jigW, { ...rot, p: V(dx, 0, 0) }, o);
    jigPb.scale.setScalar(1);
    jigW.scale.setScalar(W_SCALE);
    look(V(o.x + Math.sin(t * 0.15) * 1.5, o.y + 0.8, o.z + 4.6), o, 48);
    label(jigPb.position, "鉛 40g", "", 1, "", 0, -90);
    label(jigW.position, "タングステン 40g", "", 1, "gold", 0, -90);
    if (k >= 1) prCard(`<div style="font-size:36px;font-weight:900;color:#10345a">タングステンは、鉛より約1.7倍重い金属</div><div style="font-size:30px;margin-top:10px">同じ重さなら、体積は<b style="color:#e3412b">約6割</b>（長さは約0.84倍）</div><div style="font-size:28px;margin-top:8px;color:#3a5a78">小さく見せたいとき・風や潮が強い日に</div><div style="font-size:21px;margin-top:8px;color:#3a5a78">密度：鉛 約11.3g/cm³、タングステン 約19.3g/cm³</div>`, 1, PORTRAIT ? [60, 120, 960] : [420, 690, 1080]);
  },
  gl_line(t, d, s, k) {
    base(0);
    // 堤防の壁ぎわで魚が走る：糸が壁のカキ殻にこすれる
    const sw = Math.sin(t * 0.9);
    const rub = V(-2 + sw * 0.25, -0.9, 0.08);
    const fishP = V(rub.x + 2.4 + sw * 0.4, -2.2 + Math.sin(t * 1.7) * 0.15, 0.9);
    placeOne(fishP, Math.PI, 0.2);
    const up = V(rub.x - 0.4, 1.6, 0.6);
    const lead = k >= 1;
    const ptsPE = [V(up.x - 0.2, 4, 2.2), up, V(rub.x, rub.y + 0.6, 0.12), rub];
    const mid = V(lerp(rub.x, fishP.x, 0.5), lerp(rub.y, fishP.y, 0.5) - 0.15, 0.5);
    if (lead) {
      setTube(peTube, ptsPE.slice(0, 3).concat([V(rub.x, rub.y + 0.8, 0.12)]), 0.012);
      setTube(ldTube, [V(rub.x, rub.y + 0.8, 0.12), rub, mid, V(fishP.x - 0.3, fishP.y, fishP.z)], 0.028);
    } else {
      setTube(peTube, ptsPE.concat([mid, V(fishP.x - 0.3, fishP.y, fishP.z)]), 0.012);
    }
    look(V(rub.x + 1.5, -1.1, 5.2), V(rub.x + 0.9, -1.1, 0.4), 50);
    if (!lead) { warnRing(rub, 1, ""); label(rub, "PEラインはこすれに弱い", "堤防のかど・カキ殻・魚のヒレや歯", 1, "red", PORTRAIT ? 0 : -260, -120); }
    else label(rub, "リーダー（フロロカーボン）", "こすれに強い糸で守る", 1, "gold", PORTRAIT ? 0 : -260, -120);
    if (s.card && k >= (s.cardK ?? 2)) prCard(cardHtml(s.card), 1, PORTRAIT ? [60, 120, 960] : [1000, 130, 820]);
  },
  gl_blade(t, d, s, k) {
    base(0);
    const T = t * 0.6;
    const m = MOTIONS.tada(T % 8);
    const o = V(GO.x - 9, GO.y + 0.5, GO.z);
    placeLure(bladeGrp, m, o);
    bladeGrp.rotation.x = 0;
    bladeSpin.rotation.x = t * 22;
    const lp = bladeGrp.position.clone();
    chase(t, lp, lerp(4, 1.8, smooth01(t / 3)), 0.35);
    look(V(lp.x - 1.6, lp.y + 0.5, lp.z + 4.6), V(lp.x - 0.6, lp.y, lp.z), 50);
    label(V(lp.x - 1.15, lp.y + 0.1, lp.z), "回るブレード", "巻くだけでキラキラ光る", 1, "gold", 150, -110);
    if (k >= 1) label(V(lp.x - 0.75, lp.y, lp.z), "ワイヤー入り", "サゴシの歯で切られにくい", 1, "", -170, 110);
    imgNote();
  },
  gl_list(t, d, s, k) {
    base(0);
    const c = surfaceLife(t + 3);
    look(V(c.x - 10, -2.6, c.z + 12), V(c.x + 1, -2.6, c.z - 2), 58);
    html += acDim(0.55);
    const P = PORTRAIT;
    const rows = s.rows.map(([when, name], i) => `<div style="display:flex;gap:18px;align-items:center;margin-top:12px;opacity:${clamp01((t - 0.3 - i * 0.25) / 0.3)}"><b style="flex:0 0 ${P ? 300 : 330}px;background:#10345a;color:#ffd166;font-size:${P ? 28 : 28}px;padding:8px 14px;border-radius:12px;text-align:center">${when}</b><span style="font-size:${P ? 32 : 32}px;font-weight:900;color:#10345a">${name}</span></div>`).join("");
    html += acCard(`<div style="font-size:40px;font-weight:900;color:#10345a">${s.title}</div>${rows}`, clamp01(t / 0.4), P ? [40, 330, 1000] : [300, 110, 1320]);
  },
  // ---------- 便利グッズ ----------
  gg_thumb(t, d, s) { SHOTS.gg_tamo(2.6, 6, s, 0, true); html = ""; if (s.clean) return; html += `<div style="position:absolute;left:0;top:0;bottom:0;width:1000px;background:linear-gradient(90deg,rgba(2,14,28,.85),rgba(2,14,28,0))"></div><div style="position:absolute;left:70px;top:210px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px">${s.tag}</span><div style="font-size:140px;line-height:1.1;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`; },
  gg_hook(t, d, s) {
    base(0);
    // 壁ぎわで暴れる魚と、上へのびる糸
    const p = V(-2 + Math.sin(t * 2.2) * 0.4, -0.9 + Math.sin(t * 3.1) * 0.12, 1.2);
    placeOne(p, Math.PI + Math.sin(t * 2.2) * 0.5, 0.35);
    setTube(peTube, [V(p.x - 0.32, p.y + 0.05, p.z), V(p.x - 0.4, 0.5, 1.0), V(p.x - 0.4, 3, 1.5), V(p.x - 0.4, 6, 2)], 0.01);
    look(V(p.x + 1.3, -1.3, 2.9), V(p.x - 0.1, -0.5, 1.0), 55);
    const a = PORTRAIT ? 1 : clamp01(t / 0.3);
    bigText(PORTRAIT ? 1060 : 110, "釣れた！<br>でも、どうやって上げる？", "あると便利な道具5つ", a);
  },
  gg_tamo(t, d, s, k, still) {
    base(0);
    // 0〜2秒：網が上から下りてくる → 2〜4秒：魚を頭から入れる → 4〜：網ごと引き上げる
    const T = still ? t : t % 9;
    const ringY = T < 2 ? lerp(1.4, -0.55, smooth01(T / 2)) : T < 5 ? -0.55 : lerp(-0.55, 0.9, smooth01((T - 5) / 2.5));
    const ring = V(-1.2, ringY, 1.6);
    placeTamo(ring, V(-1.2 - 1.2, 6, -0.6));
    const inF = smooth01((T - 2) / 2.6);
    const fp = T < 5 ? V(lerp(1.4, -0.95, inF), -0.6 + Math.sin(T * 3) * 0.05, 1.6) : V(-1.15, ringY - 0.2, 1.6);
    placeOne(fp, Math.PI, T < 5 ? -0.05 : 1.1);
    setTube(peTube, [V(fp.x - 0.32, fp.y, fp.z), V(fp.x - 0.2, 0.4, 1.4), V(-0.6, 3, 0.8), V(-0.4, 6, 0.4)], 0.01);
    look(V(0.6, -0.9, 4.2), V(-0.5, -0.4, 1.4), 52);
    if (still) return;
    const lab = T < 2 ? ["網を先に沈めて待つ", ""] : T < 5 ? ["魚は頭から入れる", "追いかけてすくわない"] : ["網ごと、ゆっくり引き上げる", "柄を縮めながら"];
    label(V(ring.x, ring.y + 0.3, ring.z), lab[0], lab[1], 1, "gold", PORTRAIT ? 0 : -330, -60);
    if (k >= 1) prCard(`<div style="font-size:36px;font-weight:900;color:#10345a">タモ網の目安</div><div style="font-size:30px;margin-top:10px"><b style="color:#e3412b">長さ</b>　5m前後（高い堤防でも届く）</div><div style="font-size:30px;margin-top:8px"><b style="color:#e3412b">枠</b>　55〜60cm（大きな青物も入る）</div>`, 1, PORTRAIT ? [60, 120, 960] : [1060, 130, 760]);
    imgNote();
  },
  gg_vest(t, d, s, k) {
    aboveWall(t);
    placeMan(man2, 0, -4, Math.PI * 0.85);
    const ang = t * 0.25;
    look(V(Math.sin(ang) * 4, 4.8, -4 + Math.cos(ang) * 4), V(0, 4.2, -4), 45);
    label(V(0, 4.5, -4), "ライフジャケット", "", 1, "gold", PORTRAIT ? 0 : 260, -60);
    prCard(`<div style="font-size:38px;font-weight:900;color:#10345a">桜マーク付き・タイプA</div>${[["桜マーク", "国の型式承認を受けたしるし"], ["タイプA", "すべての小型船舶で使えるタイプ"], ["", "浮力7.5kg以上・目立つ色・反射材と笛つき"], ["渡船", "決まりは乗る前に渡船店で確認"]].map(([a1, b1], i) => `<div style="font-size:30px;margin-top:10px;opacity:${k >= (i < 3 ? 0 : 1) ? 1 : 0.2}">${a1 ? `<b style="color:#e3412b">${a1}</b>　` : ""}${b1}</div>`).join("")}<div style="font-size:21px;margin-top:10px;color:#3a5a78">出典：国土交通省「ライフジャケットの種類と特徴」</div>`, 1, PORTRAIT ? [60, 120, 960] : [1040, 140, 800]);
  },
  gg_grip(t, d, s, k) {
    base(0);
    const p = V(-2 + Math.sin(t * 0.7) * 0.6, -1.4, 1.4);
    placeOne(p, Math.PI + Math.sin(t * 0.7) * 0.3, 0);
    look(V(p.x + 1.2, -1.3, 3.6), p, 50);
    html += acDim(0.35);
    const P = PORTRAIT;
    const items = s.items.map(([n, a1, b1], i) => `<div style="flex:1;background:rgba(255,255,255,.95);border-radius:24px;padding:22px 26px;opacity:${k >= i ? 1 : 0.2}"><div style="font-size:30px;font-weight:900;color:#e3412b">${n}</div><div style="font-size:${P ? 40 : 38}px;font-weight:900;color:#10345a;margin-top:6px">${a1}</div><div style="font-size:${P ? 30 : 28}px;color:#3a5a78;margin-top:8px">${b1}</div></div>`).join("");
    html += `<div style="position:absolute;left:${P ? 50 : 160}px;right:${P ? 50 : 160}px;top:${P ? 340 : 150}px;display:flex;${P ? "flex-direction:column" : ""};gap:24px">${items}</div>`;
  },
  gg_spare(t, d, s, k) {
    base(0);
    const o = V(GO.x, GO.y, GO.z);
    jigPivot.scale.setScalar(1.5);
    placeLure(jigPivot, { p: V(0, 0, 0), pitch: 0.15, roll: Math.sin(t * 0.5) * 0.5 }, o);
    const ang = t * 0.2;
    look(V(o.x + Math.sin(ang) * 3.2, o.y + 0.6, o.z + Math.cos(ang) * 3.2), o, 48);
    label(V(o.x + 1.35, o.y + 0.1, o.z), "アシストフック", "針先がにぶったら交換", 1, "gold", PORTRAIT ? -120 : -280, -90);
    if (k >= 1) label(V(o.x + 1.25, o.y, o.z), "スナップ", "ジグの交換が早くなる", 1, "", PORTRAIT ? 120 : 280, 140);
  },
  gg_steps(t, d, s, k) {
    base(0);
    const c = surfaceLife(t + 8);
    look(V(c.x - 10, -2.6, c.z + 12), V(c.x + 1, -2.6, c.z - 2), 58);
    html += acDim(0.55);
    const P = PORTRAIT;
    html += acCard(`<div style="font-size:40px;font-weight:900;color:#10345a">${s.title}</div>${s.steps.map((x, i) => `<div style="display:flex;align-items:center;gap:20px;margin-top:14px;opacity:${clamp01((t - 0.3 - i * 0.35) / 0.3)}"><b style="flex:0 0 64px;height:64px;border-radius:50%;background:#e3412b;color:#fff;font-size:36px;display:flex;align-items:center;justify-content:center">${i + 1}</b><span style="font-size:${P ? 36 : 36}px;font-weight:900;color:#10345a">${x}</span></div>`).join("")}`, clamp01(t / 0.4), P ? [50, 330, 980] : [360, 120, 1200]);
  },
});

// =====================================================================
// 魚種別「このL字の堤防、どこに投げる？」（gs_*）2026-11-05
// 前提（潮の流れ×魚のつきやすさで考えた一例）を、どのコマにも出す
// =====================================================================
function premiseTag(s) {
  const P = PORTRAIT;
  html += `<div style="position:absolute;left:${P ? 36 : 70}px;${P ? "top:150px" : "top:118px"};background:rgba(6,22,42,.88);border:3px solid #4cc3ff;border-radius:14px;padding:4px 14px;color:#fff;font-weight:800;font-size:${P ? 28 : 26}px;z-index:5">潮の流れ×魚のつきやすさで考えた一例</div>`;
}
const fishName = (s) => s.fish || "青物";
// 緑の線（壁ぎわにそって）
function wallLine(pts3, a, t) {
  if (a <= 0.01) return;
  const pts = pts3.map((v) => { const q = project(v); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(" ");
  lines += `<polyline points="${pts}" fill="none" stroke="rgba(46,204,113,${a})" stroke-width="${12 + 3 * Math.sin(t * 5)}" stroke-linecap="round"/>`;
}
// 投げる線（放物線の点線）と、巻いてくる道
function castPath(P0, L0, ck, a = 1) {
  const pts = Array.from({ length: 25 }, (_, i) => { const u = (i / 24) * ck; return V(lerp(P0.x, L0.x, u), lerp(P0.y, 0.5, u) + Math.sin(u * Math.PI) * 7, lerp(P0.z, L0.z, u)); });
  const q = pts.map((v) => { const p = project(v); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ");
  if (ck > 0) lines += `<polyline points="${q}" fill="none" stroke="rgba(255,255,255,${0.9 * a})" stroke-width="4" stroke-dasharray="10 8"/>`;
  return pts[24];
}
function lureDot(p) { const q = project(p); html += `<div style="position:absolute;left:${q.x}px;top:${q.y}px;width:30px;height:30px;transform:translate(-50%,-50%);border-radius:50%;background:#ffd166;border:5px solid #fff;box-shadow:0 0 18px #ffd166"></div>`; }
// 研究・資料のカード（下に出典）
function evidenceCard(s, a) {
  const P = PORTRAIT;
  html += acCard(`<div style="font-size:${P ? 30 : 28}px;font-weight:900;color:#e3412b">${s.kicker || "研究・資料では"}</div>
    ${s.rows.map((r, i) => `<div style="font-size:${P ? 38 : 34}px;font-weight:900;color:#10345a;margin-top:12px;opacity:${clamp01(a * 2 - i * 0.4)}">${r}</div>`).join("")}
    <div style="font-size:${P ? 22 : 21}px;color:#3a5a78;margin-top:14px;line-height:1.4">出典：${s.src}</div>`, a, P ? [50, 300, 980] : [360, 160, 1200]);
}

Object.assign(SHOTS, {
  gs_hook(t, d, s) {
    jxBase();
    show(lpier);
    lpFlow(t + 30);
    jxView(12, 20, 50, t, d);
    const a = PORTRAIT ? 1 : clamp01(t / 0.3);
    bigText(PORTRAIT ? 0 : 20, PORTRAIT ? `このL字の堤防、<br><span style="color:#ffd166">${fishName(s)}</span>ならどこ？` : `このL字の堤防、<span style="color:#ffd166">${fishName(s)}</span>ならどこに投げる？`, "", a);
    ["A", "B", "C"].forEach((n, i) => mapPin(LP_PINS[i], n, PORTRAIT ? 1 : clamp01((t - 0.8 - i * 0.3) / 0.3)));
    if (!PORTRAIT) legend(LEG);
    premiseTag(s);
  },
  // 研究・資料のカード。背景は魚の泳ぐ海の中
  gs_card(t, d, s, k) {
    base(0);
    if (s.bg === "wall") { wallLife(t); look(V(-14, -5.2, 7), V(-22, -6.2, 0.5), 52); }
    else if (s.bg === "night") { base(0.8); lamp.visible = true; midLife(t); look(path(V(-10, -5, 21), V(-14, -5.4, 19), ease(t / d)), V(-18, -5.6, 6), 50); }
    else { const c = surfaceLife(t); look(V(c.x - 10, -2.6, c.z + 12), V(c.x + 1, -2.6, c.z - 2), 58); }
    html += acDim(0.45);
    evidenceCard(s, clamp01(t / 0.4));
    premiseTag(s);
  },
  // 青物：先端の裏の潮目へ遠投して、速めに巻く
  gs_ao(t, d, s, k) {
    jxBase();
    show(lpier);
    lpFlow(t + 50, { focus: { x: LP_ANS2[0] + 2, z: LP_ANS2[1] + 4, r: 9, dim: 0.3 } });
    jxView(PORTRAIT ? 24 : 18, 24, PORTRAIT ? 48 : 52, 0, 1);
    const t0 = t - (s._k0 ?? 0), t1 = t - (s._k1 ?? 0);
    placeMan(man, 23.5, 22, Math.PI * 0.85);
    const P0 = V(23.5, 4.5, 22), L0 = V(36, 0.5, 30);
    target(L0.x - 2, L0.z - 3, 4.2, fadeIn(t0, 0.3), t);
    label(V(L0.x - 2, 0.6, L0.z - 3), "ここ！ 先端の裏の潮目", "うずと本流がぶつかる", fadeIn(t0, 0.3), "gold ans", PORTRAIT ? -150 : 0, -110);
    const ck = clamp01((t1 - 0.4) / 1.4);
    if (k >= 1) {
      const end = castPath(P0, L0, ck);
      const u = clamp01((t1 - 2) / 3);
      const lp = ck < 1 ? end : V(lerp(L0.x, P0.x, u), 0.5, lerp(L0.z, P0.z + 1, u));
      lureDot(lp);
      label(V(31, 0.5, 31), "遠くへ投げて、速めに巻く", "", fadeIn(t1, 1.8), "", PORTRAIT ? 100 : 260, -60);
      if (u > 0.2) chase(t, V(lp.x + 2.6, -0.9, lp.z), 0, 0.4);
    }
    miniMap("lpier", [75, 51]);
    legend(LEG);
    premiseTag(s);
  },
  // シーバス：上流に投げて流れにのせ、角のヨレへ送りこむ（ドリフト）
  gs_sb(t, d, s, k) {
    jxBase();
    show(lpier);
    lpFlow(t + 60, { focus: { x: -7, z: 26, r: 8, dim: 0.35 } });
    if (PORTRAIT) jxView(-6, 24, 36, 0, 1);
    else jxView(-5, 25, 34, t, d);
    const t0 = t - (s._k0 ?? 0), t1 = t - (s._k1 ?? 0);
    placeMan(man, -0.6, 22.6, Math.PI / 2 + 0.3);
    target(LP_ANS[0], LP_ANS[1], 3.4, fadeIn(t0, 0.2), t);
    label(V(LP_ANS[0], 0.6, LP_ANS[1]), "ここ！ 角のヨレ", "流れが曲がって、ゆるむところ", k === 0 ? fadeIn(t0, 0.2) : 0, "gold ans", PORTRAIT ? 150 : 300, -10);
    const P0 = V(-0.6, 4.5, 22.6), L0 = V(-15, 0.5, 25), C = V(-7, 0.5, 32), E = V(-1.5, 0.5, 24.2);
    const bez2 = (u) => V((1 - u) ** 2 * L0.x + 2 * u * (1 - u) * C.x + u * u * E.x, 0.5, (1 - u) ** 2 * L0.z + 2 * u * (1 - u) * C.z + u * u * E.z);
    const pts = (arr) => arr.map((v) => { const q = project(v); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(" ");
    if (k >= 1) {
      const ck = clamp01((t1 - 0.3) / 1.2);
      const end = castPath(P0, L0, ck, ck < 1 ? 1 : 0.4);
      const ka = clamp01((t1 - 1.6) / 0.5);
      if (ka > 0) lines += `<polyline points="${pts(Array.from({ length: 31 }, (_, i) => bez2(i / 30)))}" fill="none" stroke="rgba(255,209,102,${0.95 * ka})" stroke-width="7" stroke-dasharray="16 10"/>`;
      const u = clamp01((t1 - 1.8) * 0.2);
      lureDot(ck < 1 ? end : bez2(u));
      label(L0, "上流に投げる", "", fadeIn(t1, 0.8), "gold", PORTRAIT ? 60 : -40, -90);
      label(V(-8, 0.5, 30), "流れにのせて送りこむ（ドリフト）", "", fadeIn(t1, 2.2), "gold ans", PORTRAIT ? -40 : -300, -150);
    }
    miniMap("lpier", [27, 57]);
    legend(LEG);
    premiseTag(s);
  },
  // チヌ：k0 海の中の壁（貝がびっしり）→ k1 上から見て、内側の壁ぎわ
  gs_ch(t, d, s, k) {
    const t1 = t - (s._k1 ?? 0);
    if (k === 0) {
      base(0);
      wallLife(t);
      look(path(V(-14, -4.6, 6.5), V(-18, -5.2, 5.5), ease(t / Math.max(d, 1))), V(-24, -5.6, 0.4), 52);
      label(V(-22, -2.6, 0.2), "壁にイガイ・フジツボ", "クロダイのえさになる", 1, "gold", PORTRAIT ? 0 : 260, -60);
      label(V(-26, -6.5, 1.3), "チヌ（クロダイ）", "", fadeIn(t, 1.2), "", PORTRAIT ? 0 : -220, 110);
    } else {
      jxBase();
      show(lpier);
      lpFlow(t + 70, { alpha: 0.5 });
      jxView(14, 16, PORTRAIT ? 50 : 46, 0, 1);
      wallLine([V(2.2, 0.6, 4), V(2.2, 0.6, 19.6), V(25.8, 0.6, 19.6)], fadeIn(t1, 0.3), t);
      label(V(14, 0.6, 19.4), "ここ！ 内側の足元の壁ぎわ", "遠くではなく、壁にそって落とす", fadeIn(t1, 0.3), "gold ans", PORTRAIT ? 0 : 0, 160);
      placeMan(man, 12, 21.6, Math.PI);
      noMark(LP_PINS[2], "C：遠投はしない", fadeIn(t1, 1.5));
      miniMap("lpier", null);
    }
    premiseTag(s);
  },
  // 条件で変わること（カード）
  gs_cond(t, d, s, k) {
    base(s.night ? 0.8 : 0);
    if (s.night) { lamp.visible = true; midLife(t); look(V(-10, -5, 21), V(-18, -5.6, 6), 50); }
    else { const c = surfaceLife(t); look(V(c.x - 10, -2.6, c.z + 12), V(c.x + 1, -2.6, c.z - 2), 58); }
    html += acDim(0.5);
    const P = PORTRAIT;
    html += acCard(`<div style="font-size:${P ? 34 : 32}px;font-weight:900;color:#10345a">${s.title}</div>${s.rows.map(([a1, b1], i) => `<div style="margin-top:14px;opacity:${k >= (s.rk ? s.rk[i] : 0) ? 1 : 0.2}"><b style="font-size:${P ? 32 : 30}px;color:#e3412b">${a1}</b><div style="font-size:${P ? 32 : 30}px;font-weight:800;color:#10345a">${b1}</div></div>`).join("")}${s.src ? `<div style="font-size:21px;color:#3a5a78;margin-top:14px">出典：${s.src}</div>` : ""}`, clamp01(t / 0.4), P ? [50, 300, 980] : [360, 160, 1200]);
    premiseTag(s);
  },
});

// =====================================================================
// 沖の一文字（ic_*）2026-11-05：岸と平行な2本の堤防と、そのあいだの切れ目（港の出入り口）
// 横に流れる潮・満ち潮・引き潮で、答えが変わる。足元は捨て石マウンドを透かして見る
// =====================================================================
const IC = { l: { x0: -44, x1: -4, z0: 30, z1: 34 }, r: { x0: 4, x1: 44, z0: 30, z1: 34 } };
const IC_EDDY = { x: 49, z: 26, r: 6.5 };
const ichi = new THREE.Group();
const icMound = new THREE.Group();
{
  const rockMat = shadedMat(0x5f6468, { rough: 0.25 });
  for (const b of [IC.l, IC.r]) {
    const w = b.x1 - b.x0, l = b.z1 - b.z0, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, 8.8, l), concrete);
    body.position.set(cx, -1.6, cz);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.6, l + 0.4), shadedMat(0xb8bec2, { rough: 0.1 }));
    deck.position.set(cx, 2.8, cz);
    ichi.add(body, deck);
    // 捨て石マウンド（台形の断面を x 方向にのばす）
    const sh = new THREE.Shape();
    sh.moveTo(-11, -12.5); sh.lineTo(11, -12.5); sh.lineTo(4.2, -6); sh.lineTo(-4.2, -6); sh.lineTo(-11, -12.5);
    const g = new THREE.ExtrudeGeometry(sh, { depth: w + 6, bevelEnabled: false });
    const m = new THREE.Mesh(g, rockMat);
    m.rotation.y = Math.PI / 2;
    m.position.set(b.x0 - 3, 0, cz);
    icMound.add(m);
  }
  // 石のでこぼこ
  const r = rng(91);
  const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.9, 0), shadedMat(0x767b80, { rough: 0.3 }), 1400);
  for (let i = 0; i < 1400; i++) {
    const b = i % 2 ? IC.l : IC.r;
    const x = lerp(b.x0 - 2, b.x1 + 2, r()), side = r() < 0.5 ? -1 : 1, u = r();
    const zz = 32 + side * lerp(4.2, 11, u), yy = lerp(-6, -12.5, u) + 0.4;
    const s = 0.5 + r() * 0.9;
    _m.compose(V(x, yy, zz), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), V(s, s * 0.7, s));
    stones.setMatrixAt(i, _m);
  }
  icMound.add(stones);
  // 灯台（左が白・右が赤）
  [[-5.5, 0xf2f2f2], [5.5, 0xd23a2a]].forEach(([x, c]) => {
    const lh = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 5, 16), shadedMat(c, { rough: 0.05 }));
    lh.position.set(x, 5.6, 32);
    ichi.add(lh);
  });
}
world.add(ichi, icMound);
extras.push(ichi, icMound);
const icSolid = (x, z) => inBox(IC.l, x, z) || inBox(IC.r, x, z);
// 横に流れる潮（左→右）。堤防の内側（港の中）はゆるい。右端（下流）の裏にうず
FIELDS.icSide = () => (x, z) => {
  const inBay = (1 - smooth01((z - 30.5) / 4)) * (1 - smooth01((Math.abs(x) - 44) / 9));
  let vx = lerp(1.1, 0.28, inBay), vz = 0;
  // 堤防の外の面にそって少し速い
  if (z > 34) vx += 0.25 * Math.exp(-(z - 34) / 4);
  // 切れ目：外の速い流れと内のゆるい流れがこすれる（小さなうず）
  const gw = Math.exp(-(x * x) / 10 - ((z - 29) ** 2) / 6);
  vz += -0.15 * gw * Math.sign(x || 1) * 0;
  const dx = x - IC_EDDY.x, dz = z - IC_EDDY.z;
  const w = Math.exp(-(dx * dx + dz * dz) / (IC_EDDY.r * IC_EDDY.r));
  vx = vx * (1 - w) + (dz / IC_EDDY.r) * 0.5 * w;
  vz = vz * (1 - w) + (-dx / IC_EDDY.r) * 0.5 * w;
  return [vx, vz];
};
// 満ち潮：外の水が切れ目に集まり、港の中へ噴き出す。噴き出す流れの両わきに、うず
FIELDS.icIn = () => (x, z) => {
  if (z > 34) {
    const dx = x, dz = z - 32, r = Math.hypot(dx, dz) + 0.5;
    const sp = 0.22 + 1.45 * Math.exp(-r / 10);
    return [(-dx / r) * sp, (-dz / r) * sp];
  }
  if (z >= 30) return [-x * 0.1, -1.8];
  const dd = 30 - z, sig = 2.2 + dd * 0.22;
  const jet = 1.7 * Math.exp(-(x * x) / (2 * sig * sig)) * Math.exp(-dd / 20);
  let vx = x * 0.02 * Math.exp(-dd / 20), vz = -jet - 0.05;
  for (const sgn of [-1, 1]) {
    const cx = sgn * 9, cz = 23, ex = x - cx, ez = z - cz;
    const w = Math.exp(-(ex * ex + ez * ez) / 30);
    vx = vx * (1 - w) + sgn * -(ez / 5.5) * 0.5 * w;
    vz = vz * (1 - w) + sgn * (ex / 5.5) * 0.5 * w;
  }
  return [vx, vz];
};
// 引き潮：満ち潮の向きを反対に（堤防の中心 z=32 で上下を入れかえる）
FIELDS.icOut = () => { const f = FIELDS.icIn(); return (x, z) => { const v = f(x, 64 - z); return [v[0], -v[1]]; }; };
const icFlow = (kind, T, opts = {}) => { FIELD = FIELDS[kind](); updateFlow(T, { x0: -60, x1: 60, z0: 2, z1: 72, solid: icSolid, ...opts }); };
const IC_PINS = [V(52, 0.4, 27), V(0, 0.4, 25), V(-24, 0.4, 40)]; // A=右端の裏、B=切れ目の内側、C=外の真ん中
const icBase = () => { jxBase(); show(ichi); };
function icPremise() {
  const P = PORTRAIT;
  html += `<div style="position:absolute;left:${P ? 36 : 70}px;${P ? "top:150px" : "top:118px"};background:rgba(6,22,42,.88);border:3px solid #4cc3ff;border-radius:14px;padding:4px 14px;color:#fff;font-weight:800;font-size:${P ? 28 : 26}px;z-index:5">流れの形の一例（場所・潮・風で変わる）</div>`;
}
function icMini(hi, dir = "r") {
  const P = PORTRAIT;
  const L = P ? 40 : 70, T = P ? 230 : 190, S = P ? 250 : 260;
  const arrowD = dir === "in" ? "M50 76 L50 50" : dir === "out" ? "M50 40 L50 66" : "M6 72 L26 72";
  html += `<div style="position:absolute;left:${L}px;top:${T}px;width:${S}px;height:${S}px;background:rgba(255,255,255,.92);border-radius:22px;padding:10px;box-shadow:0 6px 18px rgba(0,0,0,.3)">
    <div style="font-size:${P ? 24 : 22}px;font-weight:900;color:#10345a;margin:0 0 4px 6px">全体図</div>
    <svg viewBox="0 0 100 80" width="100%" height="${S - 60}px"><rect x="0" y="0" width="100" height="80" fill="#2b6f9e"/><rect x="0" y="0" width="100" height="14" fill="#9aa59a"/>
    <rect x="6" y="40" width="40" height="5" fill="#c9ced2"/><rect x="54" y="40" width="40" height="5" fill="#c9ced2"/>
    <path d="${arrowD}" stroke="#fff" stroke-width="2.5" marker-end="url(#ah2)"/><defs><marker id="ah2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#fff"/></marker></defs>
    <text x="${dir === "r" ? 30 : 56}" y="${dir === "r" ? 75 : dir === "in" ? 70 : 60}" font-size="7" fill="#fff" font-weight="700">${dir === "in" ? "満ち潮" : dir === "out" ? "引き潮" : "潮の流れ"}</text>
    ${hi ? `<circle cx="${hi[0]}" cy="${hi[1]}" r="8" fill="none" stroke="#2ecc71" stroke-width="3"/>` : ""}</svg></div>`;
}
const icView = (cx, cz, dist, t = 0, d = 1) => jxView(cx, cz, dist, t, d);
// 全体を見る：縦画面は堤防が斜めに入るように、左手前の沖から見る
const icWide = (t = 0, d = 1) => (PORTRAIT ? look(V(-40 + ease(t / Math.max(d, 1)) * 3, 62, 88), V(18, 0, 30), 52) : icView(4, 30, 66, t, d));

Object.assign(SHOTS, {
  ic_thumb(t, d, s) {
    icBase();
    icFlow("icIn", 40);
    look(V(0, 62, 74), V(0, 0, 28), 50);
    html += `<div style="position:absolute;left:0;top:0;bottom:0;width:1000px;background:linear-gradient(90deg,rgba(2,14,28,.8),rgba(2,14,28,0))"></div>`;
    html += `<div style="position:absolute;left:70px;top:210px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px">${s.tag}</span><div style="font-size:150px;line-height:1.1;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
    mapPin(V(4.5, 0.4, 25), "？", 1, "#2ecc71");
    mapPin(V(52, 0.4, 27), "？", 1, "#2ecc71");
  },
  ic_hook(t, d, s) {
    icBase();
    icFlow("icSide", t + 30);
    icWide(t, d);
    const a = PORTRAIT ? 1 : clamp01(t / 0.3);
    if (PORTRAIT) bigText(0, "沖の一文字、<br>どこに投げる？", "流れが見えれば、答えがわかる", a);
    else bigText(20, "沖の一文字、どこに投げる？", "流れが見えれば、答えがわかる", a);
    ["A", "B", "C"].forEach((n, i) => mapPin(IC_PINS[i], n, PORTRAIT ? 1 : clamp01((t - 0.8 - i * 0.3) / 0.3)));
    icPremise();
  },
  ic_rule(t, d, s, k) {
    icBase();
    icFlow("icSide", t + 40);
    icWide(t, d);
    label(V(-20, 0.6, 50), "水色＝速い流れ", "", fadeIn(t, 0.6), "", 0, -90);
    label(V(-20, 0.6, 18), "オレンジ＝ゆるい流れ", "港の中", fadeIn(t, 2.0), "gold", 0, -70);
    label(V(0, 3.2, 32), "切れ目（港の出入り口）", "", fadeIn(t, 3.4), "", PORTRAIT ? 0 : 200, -110);
    legend(LEG);
    icMini(null);
    icPremise();
  },
  // 横に流れる潮：k0 外は速く内はゆるい → k1 答え 右端の裏 → k2 研究（剥離渦と湧昇） → k3 C はちがう
  ic_side(t, d, s, k) {
    icBase();
    const focus = k === 1 || k === 2 ? { x: IC_EDDY.x, z: IC_EDDY.z + 2, r: 8, dim: 0.3 } : null;
    icFlow("icSide", t + 50, { focus });
    if (k === 1 || k === 2) icView(PORTRAIT ? 46 : 40, 30, PORTRAIT ? 44 : 46, 0, 1);
    else icWide(0, 1);
    const t1 = t - (s._k1 ?? 0), t2 = t - (s._k2 ?? 0), t3 = t - (s._k3 ?? 0);
    if (k === 0) { arrow(0, -50, 46, -20, 46, "#4cc3ff", fadeIn(t, 0.2), 2.0); label(V(-20, 0.6, 20), "港の中はゆるい", "", fadeIn(t, 1.4), "gold", 0, -70); }
    if (k >= 1) {
      target(IC_PINS[0].x, IC_PINS[0].z, 4, k === 1 ? fadeIn(t1, 0.3) : 1, t);
      label(V(IC_PINS[0].x, 0.6, IC_PINS[0].z), "ここ！ 下流側の端の裏", "うずと本流のさかい目", k <= 2 ? 1 : 0, "gold ans", PORTRAIT ? -120 : -320, -40);
    }
    if (k === 2) html += acCard(`<div style="font-size:${PORTRAIT ? 30 : 28}px;font-weight:900;color:#e3412b">研究では</div><div style="font-size:${PORTRAIT ? 36 : 32}px;font-weight:900;color:#10345a;margin-top:10px">流れの中の板の端にできるうず（剥離渦）が、底の水を持ち上げることが、水理実験で示されている</div><div style="font-size:21px;color:#3a5a78;margin-top:12px">出典：糸冽長敬ほか「岬による剥離渦の形成とそのSpin Downによる湧昇流」水産工学30(2) 1993</div>`, fadeIn(t2, 0.2), PORTRAIT ? [50, 1120, 980] : [110, 560, 900]);
    if (k >= 3) { noMark(IC_PINS[2], "C：流れに変化がない", fadeIn(t3, 0.2)); }
    icMini(k >= 1 ? [94, 46] : null);
    legend(LEG);
    icPremise();
  },
  // 満ち潮：k0 切れ目に集まって噴き出す → k1 答え 切れ目の内側の両わき → k2 真ん中は流されやすい
  ic_in(t, d, s, k) {
    icBase();
    const focus = k >= 1 ? { x: 0, z: 25, r: 9, dim: 0.3 } : null;
    icFlow("icIn", t + 20, { focus });
    if (k >= 1) icView(0, 27, PORTRAIT ? 42 : 40, 0, 1);
    else icView(0, 30, PORTRAIT ? 60 : 56, 0, 1);
    const t0 = t - (s._k0 ?? 0), t1 = t - (s._k1 ?? 0), t2 = t - (s._k2 ?? 0);
    if (k === 0) {
      arrow(0, -18, 50, -4, 36, "#4cc3ff", fadeIn(t0, 0.2), 1.5);
      arrow(1, 18, 50, 4, 36, "#4cc3ff", fadeIn(t0, 0.2), 1.5);
      arrow(2, 0, 30, 0, 16, "#4cc3ff", fadeIn(t0, 1.0), 2.0);
      label(V(0, 0.6, 18), "切れ目から港の中へ噴き出す", "", fadeIn(t0, 1.4), "", PORTRAIT ? 0 : 260, 40);
    }
    if (k >= 1) {
      target(-4.8, 25, 2.6, k === 1 ? fadeIn(t1, 0.3) : 1, t);
      target2(4.8, 25, 2.6, k === 1 ? fadeIn(t1, 0.6) : 1, t);
      label(V(4.8, 0.6, 25), "ここ！ 切れ目の内側の両わき", "噴き出す流れのさかい目", k === 1 ? fadeIn(t1, 0.3) : 1, "gold ans", PORTRAIT ? 0 : 300, -60);
    }
    if (k >= 2) label(V(0, 0.6, 20), "真ん中は速くて流されやすい", "", fadeIn(t2, 0.3), "", PORTRAIT ? 0 : -300, 80);
    icMini(k >= 1 ? [50, 50] : null, "in");
    legend(LEG);
    icPremise();
  },
  // 引き潮のクイズ：k0 問い → k1 A・B・C → k2 答え（切れ目の外側の両わき）
  ic_quiz(t, d, s, k) {
    icBase();
    icFlow("icOut", t + 20, { alpha: k >= 2 ? 1 : 0.85 });
    icView(0, 32, PORTRAIT ? 56 : 52, 0, 1);
    const t2 = t - (s._k2 ?? 0);
    const Q = [V(-4.8, 0.4, 25), V(-4.8, 0.4, 39), V(52, 0.4, 27)];
    if (k <= 1) {
      ["A", "B", "C"].forEach((n, i) => mapPin(Q[i], n, k === 1 ? fadeIn(t - (s._k1 ?? 0), 0.2 + i * 0.3) : 0));
      html += `<div class="big" style="top:${PORTRAIT ? 1060 : 120}px;font-size:${PORTRAIT ? 64 : 56}px">引き潮になったら、どこ？</div>`;
    } else {
      target(-4.8, 39, 2.6, fadeIn(t2, 0.3), t);
      target2(4.8, 39, 2.6, fadeIn(t2, 0.6), t);
      label(V(-4.8, 0.6, 39), "答え B：切れ目の外側", "流れが外へ噴き出す", fadeIn(t2, 0.3), "gold ans", PORTRAIT ? 0 : -300, -60);
    }
    icMini(k >= 2 ? [50, 32] : null, "out");
    legend(LEG);
    icPremise();
  },
  // 足元を透かして見る：捨て石のマウンドと、すそのかけあがり
  ic_xray(t, d, s, k) {
    base(0);
    show(ichi, icMound);
    wall.visible = top.visible = false;
    if (WALL_BAR) WALL_BAR.visible = false;
    isoXray();
    show(acGas, acMeb);
    updateSchool(acMeb, t * 0.4, V(-18, -7, 41), V(4, 0.8, 1.5), 1);
    updateSchool(acGas, t * 0.15, V(-22, -10.6, 43.5), V(4, 0.1, 0.6), 1);
    const ang = 0.15 + t * 0.012;
    look(V(-18 + Math.sin(ang) * 6, -4.5, 62), V(-20, -8.2, 34), PORTRAIT ? 58 : 52);
    const t1 = t - (s._k1 ?? 0);
    label(V(-22, 0.5, 32), "一文字（ケーソン）", "", 1, "", PORTRAIT ? 0 : -200, -70);
    label(V(-24, -8, 38.5), "捨て石（石の山）", "ケーソンの土台", fadeIn(t, 0.8), "gold", PORTRAIT ? 0 : -260, -40);
    if (k >= 1) {
      wallLine([V(-44, -11.6, 43), V(-30, -11.6, 43), V(-14, -11.6, 43), V(-4, -11.6, 43)], fadeIn(t1, 0.3), t);
      label(V(-16, -11.6, 43), "すそ＝かけあがり", "深さが変わるさかい目", fadeIn(t1, 0.3), "gold ans", PORTRAIT ? 0 : 240, 60);
    }
    icPremise();
  },
  // 潮の向きは時間で変わる（潮見表へ）
  ic_tide(t, d, s, k) {
    icBase();
    icFlow(Math.floor(t / 4) % 2 ? "icOut" : "icIn", t + 10);
    icView(0, 32, PORTRAIT ? 56 : 52, 0, 1);
    html += acDim(0.35);
    const P = PORTRAIT;
    html += acCard(`<div style="font-size:${P ? 36 : 34}px;font-weight:900;color:#10345a">潮の向きで、答えが入れかわる</div>
      <div style="display:flex;gap:16px;margin-top:16px;${P ? "flex-direction:column" : ""}">${[["満ち潮（上げ潮）", "切れ目の内側"], ["引き潮（下げ潮）", "切れ目の外側"], ["横に流れる潮", "下流側の端の裏"]].map(([a1, b1], i) => `<div style="flex:1;background:#f4f7fa;border-radius:18px;padding:14px 18px;opacity:${k >= Math.min(i, 1) ? 1 : 0.25}"><b style="font-size:${P ? 30 : 28}px;color:#e3412b">${a1}</b><div style="font-size:${P ? 34 : 32}px;font-weight:900;color:#10345a;margin-top:6px">${b1}</div></div>`).join("")}</div>
      <div style="font-size:${P ? 30 : 28}px;font-weight:800;color:#10345a;margin-top:16px;opacity:${k >= 1 ? 1 : 0.25}">上げか下げかは、潮見表でチェック（ツレドキ関西・全国239地点）</div>`, fadeIn(t, 0.2), P ? [50, 300, 980] : [260, 150, 1400]);
    icPremise();
  },
});

// =====================================================================
// 潮の満ち引き（cg-michihiki）：堤防の断面で、水位・流れ・魚の動きを見る（模式図）
// 1 単位 ≒ 1m。水位は ±0.95（差 1.9m：大阪 2026-11-26 の満潮と干潮の差、気象庁の潮位表）
// =====================================================================
const MH = V(0, 0, -900);
const MHp = (x, y, z = 0) => V(MH.x + x, MH.y + y, MH.z + z);
const MH_WALL = -14, MH_X1 = 24, MH_BOT = -12, MH_DZ = 12, MH_A = 0.95;
function mhGround(x) {
  // 足元の浅い所（捨て石）→ かけあがり → 沖の底
  const wig = 0.16 * Math.sin(x * 1.7) + 0.08 * Math.sin(x * 3.3);
  const shelf = -0.45 + wig;
  return lerp(shelf, -9 + wig * 0.5, smooth01((x + 6) / 10));
}
// 潮の位相 p（0=干潮 → 0.5=満潮 → 1=干潮）から水位と上がる速さ（上げ=+1）
const mhLevel = (p, A = MH_A) => -A * Math.cos(p * Math.PI * 2);
const mhRate = (p) => Math.sin(p * Math.PI * 2);
const mhGrp = new THREE.Group();
world.add(mhGrp);
extras.push(mhGrp);
const MH_WU = { lv: { value: 0 }, time: U.time };
{
  // 背景（上は空、下は深い青）
  const bd = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(vec3(0.04,0.13,0.22), vec3(0.55,0.75,0.9), smoothstep(-0.05,0.45,h)); gl_FragColor = vec4(c,1.); }`,
  }));
  bd.position.copy(MH);
  mhGrp.add(bd);
  // 海底の断面
  const sh = new THREE.Shape();
  sh.moveTo(MH_WALL - 0.5, MH_BOT);
  sh.lineTo(MH_X1, MH_BOT);
  for (let i = 160; i >= 0; i--) { const x = MH_WALL - 0.5 + (MH_X1 - MH_WALL + 0.5) * i / 160; sh.lineTo(x, mhGround(x)); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: MH_DZ, bevelEnabled: false, steps: 1, curveSegments: 1 });
  g.translate(0, 0, -MH_DZ / 2);
  const ground = new THREE.Mesh(g, new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vL; varying vec3 vN; void main(){ vL = position; vN = normal; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vL; varying vec3 vN; float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
      void main(){ float n = hash(floor(vL*5.0));
        vec3 sand = vec3(0.84,0.76,0.58)*(0.86+0.14*n);
        vec3 soil = mix(vec3(0.36,0.27,0.18), vec3(0.54,0.43,0.3), 0.5+0.5*sin(vL.y*2.3 + sin(vL.x*0.45)*1.6)) * (0.86+0.14*n);
        vec3 c = vN.y > 0.3 ? sand : soil;
        float diff = clamp(dot(normalize(vN), normalize(vec3(0.3,1.0,0.55))),0.,1.);
        c *= 0.55 + 0.6*diff; gl_FragColor = vec4(c,1.); }`,
  }));
  ground.position.copy(MH);
  mhGrp.add(ground);
  // 堤防（コンクリートの壁）と上の通路
  const wl = new THREE.Mesh(new THREE.BoxGeometry(12, 15.2, MH_DZ), concrete);
  wl.position.copy(MHp(MH_WALL - 6, MH_BOT + 7.6));
  const dk = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.5, MH_DZ + 0.4), shadedMat(0xb8bec2, { rough: 0.1 }));
  dk.position.copy(MHp(MH_WALL - 6.2, 3.45));
  mhGrp.add(wl, dk);
  // 足元の捨て石
  const r = rng(951), mat = shadedMat(0x6d675e, { rough: 0.3 });
  for (let i = 0; i < 34; i++) {
    const x = lerp(MH_WALL + 0.6, -5, r()), z = lerp(-5.4, 5.4, r()), s = 0.45 + r() * 0.55;
    const m = new THREE.Mesh(makeRock(s, 950 + i), mat);
    m.position.copy(MHp(x, mhGround(x) - 0.12, z));
    m.rotation.set(r() * 3, r() * 3, r() * 3);
    mhGrp.add(m);
  }
  // 壁のカキ殻・フジツボ（満潮と干潮のあいだに多い）
  const bar = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.1, 7).rotateZ(-Math.PI / 2), shadedMat(0xe0d8c8, { rough: 0.3 }), 2600);
  for (let i = 0; i < 2600; i++) {
    const y = lerp(-MH_A, MH_A * 0.9, Math.pow(r(), 0.8)), s = 0.7 + r() * 1.0;
    _m.compose(MHp(MH_WALL + 0.03, y, lerp(-5.9, 5.9, r())), new THREE.Quaternion(), V(s, s, s));
    bar.setMatrixAt(i, _m);
  }
  mhGrp.add(bar);
  // 水（断面）：水位 lv まで。浅いところは明るく
  const wg = new THREE.BoxGeometry(1, 1, 1).translate(0.5, 0.5, 0);
  const water = new THREE.Mesh(wg, new THREE.ShaderMaterial({
    uniforms: MH_WU, transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vW; varying vec3 vN; void main(){ vN = normal; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float lv; uniform float time; varying vec3 vW; varying vec3 vN;
      void main(){ float dep = clamp((lv - vW.y)/11.0, 0.0, 1.0);
        vec3 c = mix(vec3(0.36,0.78,0.98), vec3(0.04,0.28,0.55), dep); float a = 0.42;
        if (vN.y > 0.5) { c = mix(vec3(0.55,0.86,1.0), vec3(0.95,1.0,1.0), 0.35*pow(abs(sin(vW.x*1.1+time)*sin(vW.z*1.5-time*0.8)),4.0)); a = 0.6; }
        gl_FragColor = vec4(c, a); }`,
  }));
  water.renderOrder = 8;
  water.userData.isWater = true;
  mhGrp.add(water);
  mhGrp.userData.water = water;
}
// エサ（カニ・エビなど）：浅い所の石の上
const mhCrabs = (() => {
  const g = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 10, 6).scale(1.4, 0.55, 1), shadedMat(0xe0662a, { rough: 0.1 }), 10);
  g.userData.xs = [-13.2, -12.1, -11.0, -10.2, -9.3, -8.4, -7.6, -12.6, -9.9, -7.1];
  g.userData.zs = [3.5, 1.2, 4.6, 2.4, 5.0, 1.8, 3.9, 5.3, 0.9, 2.8];
  return g;
})();
mhGrp.add(mhCrabs);
const mhChinu = school("チヌ", 5, 2.1, 961, { freq: 6 });
mhChinu.material.uniforms.bright.value = 1.5;
world.add(mhChinu);
extras.push(mhChinu);
const mhMan = mannequin(0x7d8a96, true);
mhGrp.add(mhMan);
// 光る粒（海の水の動き）。上げ潮は岸（左）へ、下げ潮は沖（右）へ。速い=水色、ゆるい=オレンジ
const MH_HEADS = 420, MH_TR = 6;
const mhDots = (() => {
  const n = MH_HEADS * MH_TR, g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("col", new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 col; varying vec4 vC; void main(){ vC = col; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = (0.2 + 0.32*col.a) * 900.0 / -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec4 vC; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.1,d)*vC.a; gl_FragColor = vec4(vC.rgb*a, 1.0); }`,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  p.renderOrder = 12;
  return p;
})();
world.add(mhDots);
extras.push(mhDots);
function mhDotsUpdate(T, h, rate, opts = {}) {
  mhDots.visible = true;
  const pos = mhDots.geometry.attributes.position.array, col = mhDots.geometry.attributes.col.array;
  const sp = Math.abs(rate), kf = smooth01((sp - 0.15) / 0.6), dir = Math.sign(rate) || 1;
  const r = lerp(1.0, 0.35, kf), g = lerp(0.62, 0.9, kf), b = lerp(0.2, 1.0, kf);
  const x0 = MH_WALL + 0.4, span = MH_X1 - x0, C = opts.C ?? 9;
  let o = 0, oc = 0;
  for (let i = 0; i < MH_HEADS; i++) {
    const u = _fh(i * 1.7 + 0.1), vy = _fh(i * 3.1 + 0.2), z = lerp(-5.4, 5.4, _fh(i * 5.3 + 0.4));
    let xr = u * span - C * (h + MH_A) + 0.25 * Math.sin(T * 0.7 + i);
    xr = ((xr % span) + span) % span;
    const x = x0 + xr, gy = mhGround(x), top = h - 0.12;
    const y = lerp(gy + 0.25, top, vy);
    let a = top > gy + 0.3 ? 1 : 0;
    a *= smooth01((x - x0) / 2.5) * smooth01((MH_X1 - x) / 2.5) * (opts.alpha ?? 1) * (0.45 + 0.55 * kf);
    if (opts.focus) a *= lerp(opts.focus.dim ?? 0.25, 1, smooth01(1 - (Math.hypot(x - opts.focus.x, y - opts.focus.y) - opts.focus.r) / 4));
    for (let j = 0; j < MH_TR; j++) {
      const xx = x + j * 0.2 * dir * (0.25 + 1.2 * kf);
      const p = MHp(xx, y, z);
      pos[o++] = p.x; pos[o++] = p.y; pos[o++] = p.z;
      col[oc++] = r; col[oc++] = g; col[oc++] = b; col[oc++] = a * (1 - j / MH_TR);
    }
  }
  mhDots.geometry.attributes.position.needsUpdate = true;
  mhDots.geometry.attributes.col.needsUpdate = true;
}
// 断面に立てる矢印・円（画面に向いた向き）
function mhMakeArrow() {
  const sh = new THREE.Shape();
  sh.moveTo(0, -0.35); sh.lineTo(1.0, -0.35); sh.lineTo(1.0, -0.8); sh.lineTo(1.7, 0); sh.lineTo(1.0, 0.8); sh.lineTo(1.0, 0.35); sh.lineTo(0, 0.35); sh.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthTest: false, side: THREE.DoubleSide }));
  m.renderOrder = 30;
  return m;
}
const MH_ARROWS = [0, 1, 2].map(() => { const a = mhMakeArrow(); world.add(a); extras.push(a); return a; });
function mhArrow(i, x0, y0, x1, y1, color, a = 1, w = 1) {
  const m = MH_ARROWS[i];
  m.visible = a > 0.01;
  m.position.copy(MHp(x0, y0, MH_DZ / 2 + 0.2));
  m.rotation.set(0, 0, Math.atan2(y1 - y0, x1 - x0));
  m.scale.set(Math.hypot(x1 - x0, y1 - y0) / 1.7, w, 1);
  m.material.color.set(color);
  m.material.opacity = 0.95 * a;
}
const MH_RINGS = [0, 1].map(() => {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, depthTest: false, side: THREE.DoubleSide }));
  const fill = new THREE.Mesh(new THREE.CircleGeometry(0.86, 48), new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, depthTest: false, side: THREE.DoubleSide }));
  ring.renderOrder = fill.renderOrder = 31;
  world.add(ring, fill);
  extras.push(ring, fill);
  return [ring, fill];
});
function mhRing(i, x, y, r, a, t, color = 0x2ecc71) {
  MH_RINGS[i].forEach((m, j) => {
    m.visible = a > 0.01;
    m.position.copy(MHp(x, y, MH_DZ / 2 + 0.3));
    m.scale.set(r * 1.25 * (1 + 0.06 * Math.sin(t * 5 + i)), r * (1 + 0.06 * Math.sin(t * 5 + i)), 1);
    m.material.color.set(color);
    m.material.opacity = j ? 0.22 * a : a;
  });
}
// 1つの場面の状態をまとめて決める
function mhScene(T, p, opts = {}) {
  base(0);
  U.under.value = 0;
  show(mhGrp);
  const A = opts.A ?? MH_A;
  const h = opts.h ?? mhLevel(p, A), rate = opts.rate ?? mhRate(p) * (A / MH_A);
  const water = mhGrp.userData.water;
  water.position.copy(MHp(MH_WALL, MH_BOT, 0));
  water.scale.set(MH_X1 - MH_WALL, h - MH_BOT, MH_DZ - 0.1);
  MH_WU.lv.value = h;
  if (opts.dots !== false) mhDotsUpdate(T, h, rate, opts);
  // カニ：水につかると少し動く
  const cr = mhCrabs.userData;
  for (let i = 0; i < cr.xs.length; i++) {
    const x = cr.xs[i], gy = mhGround(x), wet = h > gy + 0.1 ? 1 : 0;
    _m.compose(MHp(x + wet * 0.15 * Math.sin(T * 1.3 + i * 2), gy + 0.12, cr.zs[i]), _q.setFromEuler(new THREE.Euler(0, i + wet * 0.3 * Math.sin(T + i), 0)), V(1, 1, 1));
    mhCrabs.setMatrixAt(i, _m);
  }
  mhCrabs.instanceMatrix.needsUpdate = true;
  // チヌ：水位が高いほど浅い所へ（模式）
  if (opts.fish !== false) {
    const kf = opts.fishK ?? smooth01((h + 0.25) / 1.0);
    show(mhChinu);
    const c = MHp(lerp(-0.5, -9.5, kf), lerp(-5.6, Math.min(0.2, h - 0.55), kf), 2.2);
    updateSchool(mhChinu, T * 0.6, c, V(lerp(2.2, 2.6, kf), lerp(0.7, 0.18, kf), 1.4), rate >= 0 ? -1 : 1);
  }
  mhMan.position.copy(MHp(-17.5, 3.7, 1.5));
  mhMan.rotation.set(0, Math.PI / 2, 0);
  return { h, rate };
}
// カメラ：断面を少し右上から。縦画面は足元〜かけあがりに寄せる
function mhCam(cx = 2, cy = -3.5, dist = 40, t = 0) {
  if (cx === 2 && cy === -3.5 && dist === 40) { cx = -1; cy = -4.6; dist = 43; }
  const P = PORTRAIT;
  const X = P ? (cx < -5 ? cx : -4) : cx, Dd = P ? dist * 0.95 : dist, Y = P ? cy + (dist >= 36 ? 2.5 : 0.8) : cy;
  look(MHp(X + 5 + Math.sin(t * 0.08) * 1.2, Y + Dd * 0.18, Dd), MHp(X, Y, 0), 45);
}
// 水位の線（満潮・干潮）
function mhLine(y, txt, color, a = 1, x0 = MH_WALL - 1, x1 = MH_X1, ty = -50) {
  if (a <= 0.01) return;
  const p0 = project(MHp(x0, y, MH_DZ / 2)), p1 = project(MHp(x1, y, MH_DZ / 2));
  lines += `<line x1="${p0.x}" y1="${p0.y}" x2="${p1.x}" y2="${p1.y}" stroke="${color}" stroke-opacity="${a}" stroke-width="5" stroke-dasharray="18 12"/>`;
  if (txt) html += `<div style="position:absolute;left:${Math.min(p1.x - 12, W - 40)}px;top:${p1.y}px;transform:translate(-100%,${ty}%);opacity:${a};background:${color};color:#06213a;font-weight:900;font-size:${PORTRAIT ? 30 : 30}px;padding:4px 16px;border-radius:12px;white-space:nowrap">${txt}</div>`;
}
// 高さの差（たての矢印と数字）
function mhSpan(x, y0, y1, txt, a = 1) {
  if (a <= 0.01) return;
  const p0 = project(MHp(x, y0, MH_DZ / 2)), p1 = project(MHp(x, y1, MH_DZ / 2));
  lines += `<line x1="${p0.x}" y1="${p0.y}" x2="${p1.x}" y2="${p1.y}" stroke="#ffd166" stroke-opacity="${a}" stroke-width="8"/><polygon points="${p1.x - 16},${p1.y + 20} ${p1.x + 16},${p1.y + 20} ${p1.x},${p1.y - 4}" fill="#ffd166" fill-opacity="${a}"/><polygon points="${p0.x - 16},${p0.y - 20} ${p0.x + 16},${p0.y - 20} ${p0.x},${p0.y + 4}" fill="#ffd166" fill-opacity="${a}"/>`;
  html += `<div style="position:absolute;left:${p0.x + 26}px;top:${(p0.y + p1.y) / 2}px;transform:translateY(-50%);opacity:${a};background:#ffd166;color:#06213a;font-weight:900;font-size:${PORTRAIT ? 44 : 48}px;padding:4px 20px;border-radius:14px;white-space:nowrap">${txt}</div>`;
}
// 左上：いまの潮（干潮→満潮→干潮の曲線と点）
function mhClock(p, a = 1, A = 1) {
  const P = PORTRAIT;
  const L = P ? 40 : 70, T = P ? 230 : 130, Wd = P ? 330 : 360;
  const pts = Array.from({ length: 41 }, (_, i) => { const q = i / 40; return `${(8 + q * 84).toFixed(1)},${(40 + 26 * A * Math.cos(q * Math.PI * 2)).toFixed(1)}`; }).join(" ");
  const pp = ((p % 1) + 1) % 1, cx = 8 + pp * 84, cy = 40 + 26 * A * Math.cos(pp * Math.PI * 2);
  const up = mhRate(pp) >= 0;
  html += `<div style="position:absolute;left:${L}px;top:${T}px;width:${Wd}px;opacity:${a};background:rgba(255,255,255,.93);border-radius:22px;padding:10px 12px;box-shadow:0 6px 18px rgba(0,0,0,.3)">
    <div style="font-size:${P ? 26 : 24}px;font-weight:900;color:#10345a;margin:0 0 2px 6px">いまの潮：<span style="color:${up ? "#1f6fd1" : "#c2410c"}">${Math.abs(mhRate(pp)) < 0.2 ? (Math.cos(pp * Math.PI * 2) > 0 ? "干潮のころ" : "満潮のころ") : up ? "上げ潮" : "下げ潮"}</span></div>
    <svg viewBox="0 0 100 80" width="100%" height="${P ? 230 : 250}px"><line x1="4" y1="40" x2="96" y2="40" stroke="#c9d6e2" stroke-width="1"/>
    <polyline points="${pts}" fill="none" stroke="#1f6fb2" stroke-width="3"/>
    <text x="8" y="78" font-size="8" fill="#10345a" font-weight="700">干潮</text><text x="42" y="10" font-size="8" fill="#10345a" font-weight="700">満潮</text><text x="80" y="78" font-size="8" fill="#10345a" font-weight="700">干潮</text>
    <circle cx="${cx}" cy="${cy}" r="6" fill="#e3412b" stroke="#fff" stroke-width="2"/></svg></div>`;
}
function mhPremise() {
  const P = PORTRAIT;
  html += `<div style="position:absolute;${P ? "left:36px;top:150px" : "right:60px;top:300px"};background:rgba(6,22,42,.88);border:3px solid #4cc3ff;border-radius:14px;padding:4px 14px;color:#fff;font-weight:800;font-size:${P ? 26 : 24}px;z-index:4">模式図（形・深さは場所で変わる）</div>`;
}
const MH_LEG = [["#4cc3ff", "速い流れ"], ["#ff9f40", "ゆるい流れ"], ["#2ecc71", "ねらう場所"]];
const MH_PINS = [[-10, 0.5], [-1, -4.2], [16, -8]]; // A=足元の浅い所、B=かけあがり、C=沖の底
const mhPin = (i, txt, a) => mapPin(MHp(MH_PINS[i][0], MH_PINS[i][1], MH_DZ / 2), txt, a);
// 大阪 2026-11-26（気象庁の潮位表）：1時間ごとに上がった高さ（2〜8時）
const MH_RISE = [["2〜3時", 15], ["3〜4時", 25], ["4〜5時", 37], ["5〜6時", 46], ["6〜7時", 42], ["7〜8時", 19]];

Object.assign(SHOTS, {
  mh_thumb(t, d, s) {
    mhScene(20, 0.42, { fishK: 1 });
    look(MHp(-10, 2.8, 26), MHp(-15.5, -1.8, 0), 45);
    mhRing(0, -9.5, 0.1, 3.2, 1, 0);
    html += `<div style="position:absolute;left:0;top:0;bottom:0;width:1100px;background:linear-gradient(90deg,rgba(2,14,28,.85),rgba(2,14,28,0))"></div>`;
    html += `<div style="position:absolute;left:70px;top:200px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px">${s.tag}</span><div style="font-size:150px;line-height:1.1;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
  },
  // つかみ：最初から水位が動く。問いと A・B・C
  mh_hook(t, d, s) {
    const p = 0.02 + 0.46 * ease(t / Math.max(1, d - 1));
    mhScene(t + 10, p, { C: 12 });
    mhCam(2, -3.5, 40, t);
    const a = PORTRAIT ? 1 : clamp01(t / 0.3);
    if (PORTRAIT) bigText(0, "潮が満ちると、<br>魚はどこへ？", "堤防の下を見える化", a);
    else bigText(10, "潮が満ちると、魚はどこへ？", "堤防の下を断面で見える化", a);
    ["A", "B", "C"].forEach((n, i) => mhPin(i, n, PORTRAIT ? 1 : clamp01((t - 0.8 - i * 0.3) / 0.3)));
    if (!PORTRAIT) mhClock(p);
    mhPremise();
  },
  // 見方
  mh_rule(t, d, s, k) {
    const p = 0.22 + t * 0.006;
    mhScene(t + 30, p, { fish: false });
    mhCam(2, -3.5, 40, t);
    label(MHp(-15, 3.7, MH_DZ / 2), "堤防", "", fadeIn(t, 0.3), "", PORTRAIT ? 60 : 140, -60);
    label(MHp(-10, -0.4, MH_DZ / 2), "足元の浅い所", "捨て石", fadeIn(t, 0.9), "gold", PORTRAIT ? 40 : 0, 150);
    label(MHp(-1, -4.5, MH_DZ / 2), "かけあがり", "深さが変わるさかい目", fadeIn(t, 1.6), "gold", PORTRAIT ? 60 : 120, 150);
    label(MHp(15, -8.8, MH_DZ / 2), "沖の底", "", fadeIn(t, 2.3), "", 0, 120);
    if (k >= 1) label(MHp(6, -2.2, MH_DZ / 2), "光る粒＝海の水の動き", "水色は速い・オレンジはゆるい", fadeIn(t - (s._k1 ?? 0), 0.2), "", 0, -150);
    legend(MH_LEG);
    mhClock(p);
    mhPremise();
  },
  // どれだけ変わる？ k0 1日2回 → k1 大阪の差 1.9m → k2 小さい日 60cm → k3 カキ殻の帯
  mh_level(t, d, s, k) {
    const t1 = t - (s._k1 ?? 0), t2 = t - (s._k2 ?? 0), t3 = t - (s._k3 ?? 0);
    let p, A = MH_A;
    if (k === 0) p = t / 6;
    else if (k === 1) p = 0.02 + 0.46 * ease(t1 / 4);
    else if (k === 2) { A = 0.3; p = 0.5 + t2 / 5; }
    else p = 0.25 + t3 * 0.01;
    mhScene(t + 40, p, { A, fish: false, C: 7 });
    if (k === 3) mhCam(-9, -0.5, 20, t);
    else mhCam(2, -2.5, 36, t);
    if (k === 0) {
      html += acCard(`<div style="font-size:${PORTRAIT ? 40 : 38}px;font-weight:900;color:#10345a">多くの場所で、1日におよそ2回<br><span style="color:#1f6fd1">満潮</span>と<span style="color:#c2410c">干潮</span></div><div style="font-size:21px;color:#3a5a78;margin-top:10px">出典：気象庁「潮汐・海面水位の知識」</div>`, fadeIn(t, 0.3), PORTRAIT ? [70, 1100, 940] : [600, 120, 760]);
    }
    if (k === 1) {
      mhLine(MH_A, "満潮", "#4cc3ff", fadeIn(t1, 0.2));
      mhLine(-MH_A, "干潮", "#ff9f40", fadeIn(t1, 0.2));
      mhSpan(PORTRAIT ? -8 : 2, -MH_A, MH_A, "約1.9m", fadeIn(t1, 1.4));
      html += acCard(`<div style="font-size:${PORTRAIT ? 30 : 28}px;font-weight:900;color:#10345a">大阪・11月で差がいちばん大きい日（26日）</div><div style="font-size:21px;color:#3a5a78;margin-top:6px">出典：気象庁「潮位表」</div>`, fadeIn(t1, 0.6), PORTRAIT ? [70, 1080, 940] : [600, 120, 760]);
    }
    if (k === 2) {
      mhLine(0.3, "満潮", "#4cc3ff", 1, MH_WALL - 1, MH_X1, -115);
      mhLine(-0.3, "干潮", "#ff9f40", 1, MH_WALL - 1, MH_X1, 15);
      mhSpan(PORTRAIT ? -8 : 2, -0.3, 0.3, "約60cm", fadeIn(t2, 0.4));
      html += acCard(`<div style="font-size:${PORTRAIT ? 30 : 28}px;font-weight:900;color:#10345a">同じ11月でも、差が小さい日（8日）</div><div style="font-size:21px;color:#3a5a78;margin-top:6px">出典：気象庁「潮位表」</div>`, fadeIn(t2, 0.3), PORTRAIT ? [70, 1080, 940] : [600, 120, 760]);
    }
    if (k === 3) {
      label(MHp(MH_WALL, 0.6, 3), "カキ・フジツボの帯", "満ち引きする高さの目印", fadeIn(t3, 0.3), "gold", PORTRAIT ? 120 : 330, -40);
      mhLine(MH_A, "", "#4cc3ff", fadeIn(t3, 0.3), MH_WALL - 1, -4);
      mhLine(-MH_A, "", "#ff9f40", fadeIn(t3, 0.3), MH_WALL - 1, -4);
    }
    if (k !== 3) mhClock(p, 1, A / MH_A);
    mhPremise();
  },
  // クイズ：水位がいちばん速く上がるのは？ k0 問い k1 選択肢 k2 答え k3 データ
  mh_quiz(t, d, s, k) {
    const t2 = t - (s._k2 ?? 0), t3 = t - (s._k3 ?? 0);
    const p = k >= 2 ? 0.25 + Math.sin(t2 * 0.4) * 0.01 : 0.03 + (t % 9) / 9 * 0.44;
    mhScene(t + 50, p, { fish: false });
    mhCam(2, -3.5, 40, t);
    const P = PORTRAIT;
    if (k <= 1) {
      html += acDim(0.25);
      html += `<div class="big" style="top:${P ? 900 : 150}px;font-size:${P ? 64 : 60}px">水位がいちばん速く上がるのは？</div>`;
      if (k === 1) {
        const o = [["A", "干潮のすぐあと"], ["B", "干潮と満潮のまん中"], ["C", "満潮のすぐ前"]];
        html += `<div style="position:absolute;left:${P ? 90 : 560}px;top:${P ? 1060 : 280}px;width:${P ? 900 : 800}px">${o.map(([n, x], i) => `<div class="opt" style="opacity:${fadeIn(t - (s._k1 ?? 0), 0.2 + i * 0.35)}"><i>${n}</i>${x}</div>`).join("")}</div>`;
      }
    } else if (k === 2) {
      label(MHp(8, -3, MH_DZ / 2), "答え B：まん中", "水の動きもいちばん速い", fadeIn(t2, 0.2), "gold ans", P ? 0 : 120, -160);
      mhArrow(0, 18, -3, 6, -3, "#4cc3ff", fadeIn(t2, 0.5), 1.4);
    } else {
      html += acDim(0.45);
      const max = 46;
      html += acCard(`<div style="font-size:${P ? 32 : 32}px;font-weight:900;color:#10345a">大阪・11月26日　1時間に上がった高さ</div>
        <div style="display:flex;align-items:flex-end;gap:${P ? 14 : 22}px;height:${P ? 360 : 330}px;margin-top:18px">${MH_RISE.map(([lb, v], i) => {
          const a = fadeIn(t3, 0.2 + i * 0.25), hi = v >= 37;
          return `<div style="flex:1;text-align:center;opacity:${a}"><div style="font-size:${P ? 30 : 32}px;font-weight:900;color:${hi ? "#1f6fd1" : "#10345a"}">${v}cm</div><div style="height:${(v / max) * (P ? 250 : 220)}px;background:${hi ? "#4cc3ff" : "#ffb070"};border-radius:10px 10px 0 0"></div><div style="font-size:${P ? 22 : 24}px;font-weight:800;color:#3a5a78;margin-top:6px">${lb}</div></div>`;
        }).join("")}</div>
        <div style="font-size:${P ? 26 : 26}px;font-weight:800;color:#10345a;margin-top:12px">干潮 1:37 → 満潮 8:17。まん中の時間がいちばん速い</div>
        <div style="font-size:21px;color:#3a5a78;margin-top:6px">出典：気象庁「潮位表」（大阪）</div>`, fadeIn(t3, 0.1), P ? [50, 820, 980] : [360, 110, 1200]);
    }
    if (k <= 2) { mhClock(p); legend(MH_LEG); }
  },
  // 満ち潮：k0 水が岸へ・水位が上がる → k1 浅い所に水がかぶる・エサ → k2 答え A
  mh_in(t, d, s, k) {
    const p = 0.08 + 0.4 * clamp01(t / d);
    const t1 = t - (s._k1 ?? 0), t2 = t - (s._k2 ?? 0);
    const focus = k >= 1 ? { x: -9.5, y: 0, r: 4.5, dim: 0.3 } : null;
    const { h } = mhScene(t + 60, p, { focus, fishK: k >= 2 ? lerp(0.35, 1, ease(t2 / 2.5)) : 0.1 });
    if (k >= 1) mhCam(-8, -1.5, 22, t);
    else mhCam(2, -3.5, 40, t);
    if (k === 0) {
      mhArrow(0, 18, -3.5, 6, -3.5, "#4cc3ff", fadeIn(t, 0.2), 1.4);
      mhArrow(1, -11.5, h - 2.6, -11.5, h + 0.2, "#ffd166", fadeIn(t, 0.8), 1.0);
      label(MHp(10, -3.5, MH_DZ / 2), "海の水が岸のほうへ", "", fadeIn(t, 0.5), "", 0, 150);
      label(MHp(-11.5, h + 0.4, MH_DZ / 2), "水位が上がる", "", fadeIn(t, 1.2), "gold", PORTRAIT ? 80 : 160, -80);
    }
    if (k >= 1) label(MHp(-7.6, mhGround(-7.6) + 0.2, 2.8), "エサ（カニ・エビなど）", "", k === 1 ? fadeIn(t1, 0.3) : 0.6, "", PORTRAIT ? 60 : 200, 170);
    if (k === 1) label(MHp(-7.5, h, MH_DZ / 2), "浅い所に水がかぶる", "", fadeIn(t1, 0.6), "gold", PORTRAIT ? 0 : 160, -100);
    if (k >= 2) {
      mhRing(0, -9.5, Math.min(0.25, h - 0.5), 2.6, fadeIn(t2, 0.3), t);
      label(MHp(-9.5, h, MH_DZ / 2), "ここ！ 足元の浅い所", "エサを探しに寄ると言われる", fadeIn(t2, 0.3), "gold ans", PORTRAIT ? 60 : 140, -110);
    }
    mhClock(p);
    legend(MH_LEG);
    mhPremise();
  },
  // 引き潮：k0 水が沖へ・水位が下がる → k1 浅い所は水が少なくなる → k2 答え B
  mh_out(t, d, s, k) {
    const p = 0.55 + 0.42 * clamp01(t / d);
    const t1 = t - (s._k1 ?? 0), t2 = t - (s._k2 ?? 0);
    const focus = k >= 2 ? { x: -1, y: -4.5, r: 4.5, dim: 0.3 } : k === 1 ? { x: -9.5, y: -0.3, r: 4.5, dim: 0.3 } : null;
    const { h } = mhScene(t + 70, p, { focus });
    if (k >= 2) mhCam(-3, PORTRAIT ? -5.5 : -3.5, 26, t);
    else if (k === 1) mhCam(-8, -1.5, 22, t);
    else mhCam(2, -3.5, 40, t);
    if (k === 0) {
      mhArrow(0, 6, -3.5, 18, -3.5, "#4cc3ff", fadeIn(t, 0.2), 1.4);
      mhArrow(1, -11.5, h + 0.6, -11.5, h - 2.2, "#ffd166", fadeIn(t, 0.8), 1.0);
      label(MHp(12, -3.5, MH_DZ / 2), "海の水が沖のほうへ", "", fadeIn(t, 0.5), "", 0, 150);
      label(MHp(-11.5, h - 2.2, MH_DZ / 2), "水位が下がる", "", fadeIn(t, 1.2), "gold", PORTRAIT ? 80 : 160, 120);
    }
    if (k === 1) label(MHp(-10, h, MH_DZ / 2), "浅い所は水が少なくなる", "", fadeIn(t1, 0.3), "gold", PORTRAIT ? 0 : 60, -100);
    if (k >= 2) {
      mhRing(0, -1, -4.6, 2.8, fadeIn(t2, 0.3), t);
      label(MHp(-1, -3, MH_DZ / 2), "ここ！ かけあがり", "深い所へ移ると言われる", fadeIn(t2, 0.3), "gold ans", PORTRAIT ? 60 : 110, -150);
    }
    mhClock(p);
    legend(MH_LEG);
    mhPremise();
  },
  // 干潮は下見のチャンス／出た石の上に降りない
  mh_safe(t, d, s, k) {
    const t1 = t - (s._k1 ?? 0), t2 = t - (s._k2 ?? 0);
    const p = k === 0 ? 0.0 : k === 1 ? 0.02 + 0.3 * ease(t1 / 5) : 0.98 + t2 * 0.002;
    mhScene(t + 80, p, { fish: false });
    mhCam(-7, -1.5, 24, t);
    if (k === 0 || k === 2) {
      label(MHp(-9.5, 0, MH_DZ / 2), "干潮：足元の石が見える", "根がかりしやすい所を覚えておく", k === 0 ? fadeIn(t, 0.3) : fadeIn(t2, 0.3), "gold", PORTRAIT ? 40 : 120, -120);
    }
    if (k === 1) {
      mhRing(0, -10, 0.2, 2.6, fadeIn(t1, 0.2), t, 0xff5a4a);
      label(MHp(-10, 0.6, MH_DZ / 2), "出た石の上に降りない", "満ちてくると戻れなくなることも", fadeIn(t1, 0.3), "red", PORTRAIT ? 40 : 150, -120);
    }
    if (k === 2) {
      html += acCard(`<div style="font-size:${PORTRAIT ? 34 : 32}px;font-weight:900;color:#10345a">満潮・干潮の時刻は、潮見表でチェック</div><div style="font-size:${PORTRAIT ? 26 : 26}px;font-weight:800;color:#3a5a78;margin-top:8px">ツレドキ関西・全国239地点（気象庁の潮位表から）</div>`, fadeIn(t2, 0.8), PORTRAIT ? [60, 1080, 960] : [560, 120, 1000]);
    }
    mhClock(p);
    legend([["#2ecc71", "ねらう場所"], ["#ff5a4a", "危険"]]);
    mhPremise();
  },
  mh_sum(t, d, s, k) {
    const p = 0.1 + (t / 12) % 1;
    mhScene(t + 90, p, {});
    mhCam(2, -3.5, 40, t);
    html += acDim(0.45);
    const P = PORTRAIT;
    const rows = [["満ち潮", "足元の浅い所", "エサを探しに寄ると言われる", "#1f6fd1"], ["引き潮", "かけあがり・深い所", "水が少なくなる浅い所から移る", "#c2410c"], ["いちばん動く", "干潮と満潮のまん中", "時刻は潮見表で", "#2a9d5c"]];
    html += `<div class="big" style="top:${P ? 560 : 110}px;font-size:${P ? 66 : 64}px;opacity:${fadeIn(t, 0.1)}">潮の満ち引き まとめ</div>`;
    rows.forEach(([a1, b1, c1, col], i) => {
      const a = fadeIn(t, 0.4 + i * 0.45);
      html += `<div class="card" style="left:${P ? 70 : 330}px;top:${(P ? 780 : 240) + i * (P ? 240 : 200)}px;width:${P ? 880 : 1200}px;padding:20px 30px;opacity:${a};transform:translateY(${(1 - a) * 30}px);display:flex;align-items:center;gap:26px"><b style="background:${col};color:#fff;font-size:${P ? 34 : 38}px;padding:10px 0;width:${P ? 230 : 250}px;text-align:center;border-radius:18px;flex:none">${a1}</b><div><div style="font-size:${P ? 42 : 46}px;font-weight:900">${b1}</div><div style="font-size:${P ? 28 : 30}px;color:#3a5a78">${c1}</div></div></div>`;
    });
  },
});

// =====================================================================
// 河口を見える化（km_*）2026-11-07：川の水（オレンジ）と海の水（青）のさかい目＝潮目。断面では塩水くさび
// 出典：国交省 江戸川河川事務所（塩水くさび）／Morgan et al. 2005 MEPS 299（河川プルームの前線でプランクトン量 4〜47倍）
//       Axler et al. 2020 MEPS 650（風が弱い日は前線に仔魚とプランクトンが集まる）／渡部ほか 2020 水環境学会誌 43(3)（淀川河口の汽水域）
//       茨城県「いばらき魚顔帳」スズキ（春〜秋は内湾や川、冬は海で産卵）
// =====================================================================
const KM = { w: 14, jx: 8.6, jz: 12 }; // 川幅、導流堤の位置（x=±8.6、z=0〜12）
const kmGrp = new THREE.Group();
{
  const land = shadedMat(0x8f9a7e, { rough: 0.3 });
  for (const sg of [-1, 1]) {
    const bank = new THREE.Mesh(new THREE.BoxGeometry(80, 9, 60), land);
    bank.position.set(sg * (KM.w / 2 + 40), -1.7, -30);
    const jetty = new THREE.Mesh(new THREE.BoxGeometry(1.6, 9, KM.jz), concrete);
    jetty.position.set(sg * (KM.jx), -1.7, KM.jz / 2);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, KM.jz + 0.4), shadedMat(0xb8bec2, { rough: 0.1 }));
    deck.position.set(sg * KM.jx, 2.95, KM.jz / 2);
    kmGrp.add(bank, jetty, deck);
  }
  // 川の水面（少し茶色）
  const rv = new THREE.Mesh(new THREE.PlaneGeometry(KM.w, 60).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x6f6a4a, transparent: true, opacity: 0.55 }));
  rv.position.set(0, 0.08, -30);
  kmGrp.add(rv);
}
world.add(kmGrp);
extras.push(kmGrp);
const kmSolid = (x, z) => (z < 0 && Math.abs(x) > KM.w / 2) || (z < KM.jz && Math.abs(Math.abs(x) - KM.jx) < 0.9);
// 下げ潮（ふだんの流れ）：川の水が河口から扇のように広がる。沖の流れ（左→右）に押されて右へ
// 満ち潮：川の水の広がりが小さくなり、さかい目が河口に近づく
function kmField(flood) {
  const ch = flood ? 0.5 : 1.7, amp = flood ? 0.6 : 1.6, R = flood ? 8 : 20, sea = 0.5;
  return (x, z) => {
    if (z < KM.jz && Math.abs(x) < KM.w / 2) return [0, ch];
    const dx = x, dz = z - (KM.jz - 7), r = Math.hypot(dx, dz) + 0.6;
    const rr = Math.max(0, r - 7);
    const w = Math.exp(-((rr / R) ** 2));
    const u = amp * Math.exp(-rr / (R * 0.9));
    let vx = (dx / r) * u * 0.9 + sea * (0.25 + 0.75 * (1 - w)), vz = (dz / r) * u * 1.15;
    if (flood) { const c = 0.35 * Math.exp(-rr / 16) * (1 - w); vx -= (dx / r) * c; vz -= (dz / r) * c; }
    return [vx, vz];
  };
}
FIELDS.kmOut = () => kmField(false);
FIELDS.kmIn = () => kmField(true);
const kmFlow = (kind, T, opts = {}) => { FIELD = FIELDS[kind](); updateFlow(T, { x0: -60, x1: 60, z0: 2, z1: 70, color: "river", river: { x: 0, w: KM.w - 1, share: 0.55 }, solid: kmSolid, ...opts }); };
const KM_FRONT = { out: [12, 27], in: [6, 19] }; // さかい目（潮目）の目印
const KM_PINS = [V(12, 0.4, 27), V(0, 0.4, 6), V(-34, 0.4, 44)]; // A=さかい目、B=河口の真ん中、C=沖
const kmBase = () => { jxBase(); show(kmGrp); wall.visible = top.visible = false; if (WALL_BAR) WALL_BAR.visible = false; };
const kmWide = (t = 0, d = 1) => (PORTRAIT ? look(V(-18 + ease(t / Math.max(d, 1)) * 3, 84, 66), V(4, 0, 18), 52) : jxView(2, 22, 64, t, d));
const KM_LEG = [["#4cc3ff", "海の水"], ["#f2b35a", "川の水"], ["#2ecc71", "投げる場所"]];
function kmPremise() {
  const P = PORTRAIT;
  html += `<div style="position:absolute;left:${P ? 36 : 70}px;${P ? "top:150px" : "top:118px"};background:rgba(6,22,42,.88);border:3px solid #4cc3ff;border-radius:14px;padding:4px 14px;color:#fff;font-weight:800;font-size:${P ? 28 : 26}px;z-index:5">流れの形の一例（川の水の量・潮・風で変わる）</div>`;
}
function kmMini(hi, flood = false) {
  const P = PORTRAIT;
  const L = P ? 40 : 70, T = P ? 230 : 190, S = P ? 250 : 260;
  html += `<div style="position:absolute;left:${L}px;top:${T}px;width:${S}px;height:${S}px;background:rgba(255,255,255,.92);border-radius:22px;padding:10px;box-shadow:0 6px 18px rgba(0,0,0,.3)">
    <div style="font-size:${P ? 24 : 22}px;font-weight:900;color:#10345a;margin:0 0 4px 6px">全体図</div>
    <svg viewBox="0 0 100 80" width="100%" height="${S - 60}px"><rect width="100" height="80" fill="#2b6f9e"/><rect width="100" height="20" fill="#9aa59a"/><rect x="43" y="0" width="14" height="20" fill="#6f6a4a"/>
    <rect x="41" y="20" width="2" height="12" fill="#c9ced2"/><rect x="57" y="20" width="2" height="12" fill="#c9ced2"/>
    <path d="${flood ? "M38 32 Q50 46 66 36" : "M30 32 Q50 66 80 40"}" fill="rgba(242,179,90,.55)" stroke="#f2b35a" stroke-width="1.5"/>
    <text x="4" y="76" font-size="7" fill="#fff" font-weight="700">${flood ? "満ち潮" : "下げ潮"}</text>
    ${hi ? `<circle cx="${hi[0]}" cy="${hi[1]}" r="8" fill="none" stroke="#2ecc71" stroke-width="3"/>` : ""}</svg></div>`;
}

// ---- 断面（塩水くさび）：川の真ん中を縦に切って横から見る。右が海、左が上流 ----
const KW = V(0, 0, -1300);
const KWp = (x, y, z = 0) => V(KW.x + x, KW.y + y, KW.z + z);
const KW_X0 = -30, KW_X1 = 30, KW_DZ = 10;
const kwBed = (x) => -7.5 - 0.06 * (x - KW_X0) + 0.25 * Math.sin(x * 0.7);
const KW_U = { tip: { value: -10 }, time: U.time };
const kwGrp = new THREE.Group();
world.add(kwGrp);
extras.push(kwGrp);
{
  const bd = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(vec3(0.04,0.13,0.22), vec3(0.55,0.75,0.9), smoothstep(-0.05,0.45,h)); gl_FragColor = vec4(c,1.); }`,
  }));
  bd.position.copy(KW);
  kwGrp.add(bd);
  const sh = new THREE.Shape();
  sh.moveTo(KW_X0, -14);
  sh.lineTo(KW_X1, -14);
  for (let i = 120; i >= 0; i--) { const x = KW_X0 + (KW_X1 - KW_X0) * i / 120; sh.lineTo(x, kwBed(x)); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: KW_DZ, bevelEnabled: false, steps: 1, curveSegments: 1 });
  g.translate(0, 0, -KW_DZ / 2);
  const ground = new THREE.Mesh(g, shadedMat(0x6b5a44, { rough: 0.4 }));
  ground.position.copy(KW);
  kwGrp.add(ground);
  // 水（断面）：くさびの先 tip より海側の底に塩水（青）、上は川の水（茶色っぽい）
  const water = new THREE.Mesh(new THREE.PlaneGeometry(KW_X1 - KW_X0, 16, 1, 1), new THREE.ShaderMaterial({
    uniforms: KW_U, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float tip; uniform float time; varying vec2 vP;
      void main(){ float x = vP.x, y = vP.y + 8.0 - 8.0; if (y > 0.0) discard;
        float bed = -7.5 - 0.06*(x + 30.0) + 0.25*sin(x*0.7); if (y < bed) discard;
        float k = clamp((x - tip) / (30.0 - tip), 0.0, 1.0);
        float iface = bed + (-bed - 1.2) * pow(k, 0.55) * 0.9 + 0.12*sin(x*0.9 - time*1.5);
        float s = smoothstep(iface + 0.35, iface - 0.35, y);
        vec3 fresh = vec3(0.62,0.52,0.30), salt = vec3(0.10,0.42,0.78);
        vec3 c = mix(fresh, salt, s);
        gl_FragColor = vec4(c, 0.78); }`,
  }));
  water.position.copy(KWp(0, 0, KW_DZ / 2 + 0.05));
  water.renderOrder = 8;
  kwGrp.add(water);
}
// 粒：上の川の水は海へ（右へ）、下の塩水は満ち潮で上流へ（左へ）
const KW_N = 360, KW_TR = 6;
const kwDots = (() => {
  const n = KW_N * KW_TR, g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("col", new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 col; varying vec4 vC; void main(){ vC = col; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = (0.2 + 0.32*col.a) * 900.0 / -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec4 vC; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.1,d)*vC.a; gl_FragColor = vec4(vC.rgb*a, 1.0); }`,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  p.renderOrder = 12;
  return p;
})();
world.add(kwDots);
extras.push(kwDots);
const kwIface = (x, tip) => { const bed = kwBed(x), k = clamp01((x - tip) / (KW_X1 - tip)); return bed + (-bed - 1.2) * Math.pow(k, 0.55) * 0.9; };
function kwUpdate(T, tip, flood, opts = {}) {
  KW_U.tip.value = tip;
  kwDots.visible = true;
  const pos = kwDots.geometry.attributes.position.array, col = kwDots.geometry.attributes.col.array;
  const span = KW_X1 - KW_X0;
  let o = 0, oc = 0;
  for (let i = 0; i < KW_N; i++) {
    const salt = i % 3 === 0, u = _fh(i * 1.7 + 0.1), vy = _fh(i * 3.1 + 0.2), z = lerp(-4, 4, _fh(i * 5.3 + 0.4));
    const v = salt ? (flood ? -0.9 : 0.25) : 1.3, dir = Math.sign(v);
    let x = KW_X0 + ((((u * span + v * T * 1.6) % span) + span) % span);
    const bed = kwBed(x), ifc = kwIface(x, tip);
    let y, a = 1;
    if (salt) { if (ifc - bed < 0.4) a = 0; y = lerp(bed + 0.2, ifc - 0.2, vy); }
    else { const lo = Math.max(ifc, bed) + 0.25; y = lerp(lo, -0.3, vy); }
    a *= smooth01((x - KW_X0) / 2) * smooth01((KW_X1 - x) / 2) * (opts.alpha ?? 1);
    const [r, g, b] = salt ? [0.35, 0.8, 1.0] : [1.0, 0.75, 0.38];
    for (let j = 0; j < KW_TR; j++) {
      const p = KWp(x - j * 0.25 * dir, y, z);
      pos[o++] = p.x; pos[o++] = p.y; pos[o++] = p.z;
      col[oc++] = r; col[oc++] = g; col[oc++] = b; col[oc++] = a * (1 - j / KW_TR);
    }
  }
  kwDots.geometry.attributes.position.needsUpdate = true;
  kwDots.geometry.attributes.col.needsUpdate = true;
}
const kwView = () => (PORTRAIT ? look(KWp(6, -6, 34), KWp(6, -5.5, 0), 50) : look(KWp(0, -3, 44), KWp(0, -4, 0), 46));
const kmSrc = (t) => `<div style="font-size:21px;color:#3a5a78;margin-top:12px">出典：${t}</div>`;

Object.assign(SHOTS, {
  km_thumb(t, d, s) {
    kmBase();
    kmFlow("kmOut", 40);
    look(V(-4, 64, 78), V(4, 0, 22), 50);
    html += `<div style="position:absolute;left:0;top:0;bottom:0;width:1000px;background:linear-gradient(90deg,rgba(2,14,28,.8),rgba(2,14,28,0))"></div>`;
    html += `<div style="position:absolute;left:70px;top:210px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px">${s.tag}</span><div style="font-size:150px;line-height:1.1;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
    mapPin(KM_PINS[0], "？", 1, "#2ecc71");
  },
  km_hook(t, d, s) {
    kmBase();
    kmFlow("kmOut", t + 30);
    kmWide(t, d);
    const a = PORTRAIT ? 1 : clamp01(t / 0.3);
    if (PORTRAIT) bigText(0, "河口、<br>どこに投げる？", "川の水と海の水を色で見る", a);
    else bigText(20, "河口、どこに投げる？", "川の水と海の水を色で見る", a);
    ["A", "B", "C"].forEach((n, i) => mapPin(KM_PINS[i], n, PORTRAIT ? 1 : clamp01((t - 0.8 - i * 0.3) / 0.3)));
    kmPremise();
  },
  km_rule(t, d, s, k) {
    kmBase();
    kmFlow("kmOut", t + 40);
    kmWide(t, d);
    label(V(-30, 0.6, 48), "青い粒＝海の水", "", fadeIn(t, 0.6), "", 0, -90);
    label(V(0, 0.6, 2), "オレンジの粒＝川の水", "海へ出ていく", fadeIn(t, 2.0), "gold", PORTRAIT ? 0 : 260, -40);
    legend(KM_LEG);
    kmMini(null);
    kmPremise();
  },
  // k0 川の水が扇のように広がる → k1 答え：さかい目 → k2 研究（前線のプランクトン 4〜47倍）→ k3 B・C はちがう
  km_front(t, d, s, k) {
    kmBase();
    const [fx, fz] = KM_FRONT.out;
    const focus = k === 1 || k === 2 ? { x: fx, z: fz, r: 9, dim: 0.35 } : null;
    kmFlow("kmOut", t + 50, { focus });
    if (k === 1 || k === 2) jxView(fx - 2, fz - 4, PORTRAIT ? 46 : 44, 0, 1);
    else kmWide(0, 1);
    const t1 = t - (s._k1 ?? 0), t2 = t - (s._k2 ?? 0), t3 = t - (s._k3 ?? 0);
    if (k === 0) { arrow(0, 0, 4, 0, 18, "#f2b35a", fadeIn(t, 0.2), 1.6); label(V(0, 0.6, 22), "川の水が扇のように広がる", "", fadeIn(t, 1.0), "gold", PORTRAIT ? 0 : 280, -60); }
    if (k >= 1) {
      target(fx, fz, 4, k === 1 ? fadeIn(t1, 0.3) : 1, t);
      if (!(PORTRAIT && k === 2)) label(V(fx, 0.6, fz), "ここ！ 川の水と海の水のさかい目", "泡や色の筋が出る「潮目」", k <= 2 ? 1 : 0, "gold ans", PORTRAIT ? 0 : 320, -60);
    }
    if (k === 2) html += acCard(`<div style="font-size:${PORTRAIT ? 30 : 28}px;font-weight:900;color:#e3412b">研究では</div><div style="font-size:${PORTRAIT ? 36 : 32}px;font-weight:900;color:#10345a;margin-top:10px">川の水が海へ広がる先のさかい目（前線）では、プランクトンの量がまわりの4〜47倍だった</div>${kmSrc("Morgan et al. 2005, Marine Ecology Progress Series 299（米コロンビア川）")}`, fadeIn(t2, 0.2), PORTRAIT ? [50, 520, 980] : [110, 560, 900]);
    if (k >= 3) { noMark(KM_PINS[1], "B：河口の真ん中は流れが速い", fadeIn(t3, 0.2)); noMark(KM_PINS[2], "C：沖は変化がない", fadeIn(t3, 0.5)); }
    kmMini(k >= 1 ? [66, 52] : null);
    legend(KM_LEG);
    kmPremise();
  },
  // 断面：k0 上は川の水、下は海の水 → k1 満ち潮で塩水がくさびのように上流へ → k2 引き潮で戻る
  km_wedge(t, d, s, k) {
    base(0);
    show(kwGrp);
    wall.visible = top.visible = false;
    if (WALL_BAR) WALL_BAR.visible = false;
    hideSurface = true;
    U.under.value = 0;
    const t1 = t - (s._k1 ?? 0), t2 = t - (s._k2 ?? 0);
    let tip = -2, flood = false;
    if (k === 1) { tip = lerp(-2, -24, ease(t1 / 5)); flood = true; }
    if (k >= 2) { tip = lerp(-24, -2, ease(t2 / 5)); }
    kwUpdate(t, tip, flood);
    kwView();
    label(KWp(-26, 1.2, 5), "上流（川）", "", 1, "", 0, -40);
    label(KWp(26, 1.2, 5), "海", "", 1, "", 0, -40);
    label(KWp(-12, -1.5, 5), "川の水（軽い）", "上を海へ流れる", fadeIn(t, 0.6), "gold", PORTRAIT ? 0 : -160, -60);
    label(KWp(20, -6.5, 5), "海の水（塩水・重い）", "下にもぐりこむ", fadeIn(t, 1.4), "", PORTRAIT ? 0 : 160, 120);
    if (k === 1 && !PORTRAIT) label(KWp(tip + 2, kwBed(tip + 2) + 0.6, 5), "満ち潮：塩水がくさびのように上流へ", "", fadeIn(t1, 0.3), "gold ans", PORTRAIT ? 330 : -120, 150);
    if (k >= 2 && !PORTRAIT) label(KWp(tip + 2, kwBed(tip + 2) + 0.6, 5), "引き潮：塩水のくさびは海へもどる", "", fadeIn(t2, 0.3), "gold ans", PORTRAIT ? 330 : 120, 150);
    html += `<div style="position:absolute;left:${PORTRAIT ? 36 : 70}px;${PORTRAIT ? "top:150px" : "top:118px"};background:rgba(6,22,42,.88);border:3px solid #4cc3ff;border-radius:14px;padding:4px 14px;color:#fff;font-weight:800;font-size:${PORTRAIT ? 28 : 26}px;z-index:5">川の真ん中を縦に切った断面（模式図）</div>`;
    if (k >= 0) html += `<div style="position:absolute;right:${PORTRAIT ? 40 : 60}px;bottom:${PORTRAIT ? 330 : 150}px;font-size:21px;color:#dfe8f0;background:rgba(6,22,42,.7);padding:6px 12px;border-radius:10px">出典：国土交通省 関東地方整備局 江戸川河川事務所（塩水くさび）</div>`;
  },
  // 満ち潮の上から見た図：さかい目が河口に近づく
  km_tide(t, d, s, k) {
    kmBase();
    const flood = k === 0;
    const [fx, fz] = flood ? KM_FRONT.in : KM_FRONT.out;
    kmFlow(flood ? "kmIn" : "kmOut", t + 20, { focus: { x: fx, z: fz, r: 8, dim: 0.4 } });
    jxView(4, 18, PORTRAIT ? 54 : 50, 0, 1);
    const t1 = t - (s._k1 ?? 0);
    target(fx, fz, 3.6, k === 0 ? fadeIn(t, 0.4) : fadeIn(t1, 0.3), t);
    label(V(fx, 0.6, fz), flood ? "満ち潮：さかい目は河口の近くへ" : "下げ潮：さかい目は沖へ広がる", "", k === 0 ? fadeIn(t, 0.4) : fadeIn(t1, 0.3), "gold ans", PORTRAIT ? 0 : 300, -60);
    kmMini(flood ? [56, 40] : [66, 52], flood);
    legend(KM_LEG);
    kmPremise();
  },
  // 魚とえさ：k0 汽水域はえさが多い（淀川）→ k1 スズキは春〜秋に川や内湾、冬は海で産卵
  km_fish(t, d, s, k) {
    kmBase();
    kmFlow("kmOut", t + 60, { alpha: 0.7 });
    kmWide(0, 1);
    html += acDim(0.35);
    const P = PORTRAIT;
    const rows = [
      ["川と海の水がまじる所（汽水域）", "淀川の河口では、水の中の有機物（えさのもと）が、川の上流や海よりずっと多かった", "渡部ほか 2020 水環境学会誌 43(3)"],
      ["スズキ（シーバス）", "春〜秋は内湾や川で過ごし、冬は海で卵を産む。若い魚は秋に海へ向かう", "茨城県「いばらき魚顔帳」スズキ"],
    ];
    html += acCard(rows.map(([a1, b1, c1], i) => `<div style="margin-top:${i ? 20 : 0}px;opacity:${k >= i ? 1 : 0.2}"><b style="font-size:${P ? 30 : 28}px;color:#e3412b">${a1}</b><div style="font-size:${P ? 32 : 30}px;font-weight:800;color:#10345a;margin-top:6px">${b1}</div><div style="font-size:21px;color:#3a5a78;margin-top:6px">出典：${c1}</div></div>`).join(""), fadeIn(t, 0.2), P ? [50, 300, 980] : [360, 150, 1200]);
  },
  // 安全
  km_safe(t, d, s, k) {
    kmBase();
    kmFlow("kmOut", t + 70, { alpha: 0.6 });
    kmWide(0, 1);
    html += acDim(0.4);
    const P = PORTRAIT;
    html += acCard(`<div style="font-size:${P ? 36 : 34}px;font-weight:900;color:#c62828">⚠ 河口で気をつけること</div>${["雨のあと、川の水が増えているときは近づかない", "立入禁止の場所・導流堤の先には入らない", "ライフジャケットを必ず着ける"].map((x, i) => `<div style="font-size:${P ? 32 : 30}px;font-weight:800;color:#10345a;margin-top:14px;opacity:${k >= Math.min(i, 1) ? 1 : 0.25}">・${x}</div>`).join("")}`, fadeIn(t, 0.2), P ? [50, 300, 980] : [360, 150, 1200]);
  },
});

// ---------- 1フレーム描く ----------
// =====================================================================
// アオリイカの一生（cg-aori、ao_*）2026-11-10 ツレドキアカデミー R7
// 出典：上田幸男（徳島県）「解明されつつあるアオリイカの生活史の全容と人工産卵礁の開発」
//   寿命は約1年・多くは産卵後に死ぬ・産卵期4〜9月（盛期5〜7月）・卵嚢は20〜35日でふ化・8〜9月生まれは小型のまま越冬
//   15℃以下で死ぬ・摂餌量は25〜30℃で大きい・高水温期は沿岸に広く分布、低水温期は紀伊水道南部・海部沿岸に限られ中心は沖合へ
//   雄の方が成長が良い・稚仔は外套背長の約1.5倍までの魚類やエビ類を捕食・大型例 外套背長50.1cm 3.9kg・近年は大型化の傾向
// 大阪湾の水温は SUION（気象庁）。断面の水温の分かれ方は模式図（studio の dio を tadd・iso で使う）
// =====================================================================
const AO_SRC = "徳島県（上田幸男）「解明されつつあるアオリイカの生活史の全容と人工産卵礁の開発」";
const AO_NORM = `vec3 aoLight(vec3 c, vec3 n){ float diff = clamp(dot(normalize(n), normalize(vec3(0.3,1.0,0.55))),0.,1.); return c*(0.42+0.72*diff); }`;
const aoBodyMat = new THREE.ShaderMaterial({
  uniforms: { col: { value: new THREE.Color(0xd8b48a) } },
  vertexShader: `varying vec3 vL; varying vec3 vN; void main(){ vL = position; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform vec3 col; varying vec3 vL; varying vec3 vN; ${AO_NORM}
    void main(){ float sp = smoothstep(0.55, 0.95, sin(vL.x*70.0+sin(vL.z*30.0)*2.0)*sin(vL.z*62.0+vL.y*45.0));
      vec3 c = mix(col, vec3(0.55,0.3,0.18), sp*0.55); c = mix(c, vec3(1.0,0.95,0.85), smoothstep(-0.02,-0.11,vL.y)*0.45);
      gl_FragColor = vec4(aoLight(c, vN), 1.); }`,
});
const aoFinMat = new THREE.ShaderMaterial({
  uniforms: { time: U.time, col: { value: new THREE.Color(0xe8d2ae) } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  vertexShader: `uniform float time; varying vec3 vL; varying vec3 vN;
    void main(){ vec3 p = position; float e = clamp(abs(p.z)/0.27, 0., 1.); float ph = modelMatrix[3][0]*1.7 + modelMatrix[3][2]*2.3 + modelMatrix[3][1]*1.1;
      p.y += sin(p.x*26.0 - time*7.0 + ph)*0.035*e*e; vL = position; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
  fragmentShader: `uniform vec3 col; varying vec3 vL; varying vec3 vN; ${AO_NORM}
    void main(){ float e = clamp(abs(vL.z)/0.27, 0., 1.); vec3 c = mix(col*0.85, vec3(1.0,0.97,0.9), e*0.5);
      gl_FragColor = vec4(aoLight(c, abs(vN.y) > 0.0 ? vec3(0.0,1.0,0.0) : vN), 0.62 + 0.25*(1.0-e)); }`,
});
const aoEyeMat = new THREE.MeshBasicMaterial({ color: 0x14262a });
const aoShineMat = new THREE.MeshBasicMaterial({ color: 0xbfe9ff });
const aoArmMat = new THREE.ShaderMaterial({
  uniforms: { col: { value: new THREE.Color(0xcaa07a) } },
  vertexShader: `varying vec3 vN; void main(){ vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform vec3 col; varying vec3 vN; ${AO_NORM} void main(){ gl_FragColor = vec4(aoLight(col, vN), 1.); }`,
});
// 1体のアオリイカ（長さ約1。腕は -x、胴の先は +x）
function makeSquid() {
  const g = new THREE.Group();
  const mg = new THREE.SphereGeometry(1, 30, 18);
  mg.scale(0.34, 0.12, 0.135);
  const pa = mg.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i), f = x > 0 ? 1 - 0.55 * (x / 0.34) ** 2 : 1;
    pa.setY(i, pa.getY(i) * f); pa.setZ(i, pa.getZ(i) * f);
  }
  mg.translate(0.17, 0, 0);
  mg.computeVertexNormals();
  const mant = new THREE.Mesh(mg, aoBodyMat);
  const fg = new THREE.SphereGeometry(1, 40, 6);
  fg.scale(0.31, 0.012, 0.27);
  fg.translate(0.19, 0.01, 0);
  const fin = new THREE.Mesh(fg, aoFinMat);
  fin.renderOrder = 9;
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14).scale(0.08, 0.085, 0.1).translate(-0.2, 0, 0), aoBodyMat);
  g.add(mant, fin, head);
  [-1, 1].forEach((sd) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 10), aoEyeMat);
    e.position.set(-0.2, 0.015, sd * 0.085);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), aoShineMat);
    sh.position.set(-0.215, 0.035, sd * 0.118);
    g.add(e, sh);
  });
  const arms = new THREE.Group();
  arms.position.set(-0.27, 0, 0);
  for (let i = 0; i < 10; i++) {
    const tent = i >= 8, len = tent ? 0.36 : 0.18 + (i % 4) * 0.025;
    const ag = new THREE.CylinderGeometry(0.004, tent ? 0.009 : 0.02, len, 6);
    ag.translate(0, len / 2, 0);
    ag.rotateZ(Math.PI / 2);
    const m = new THREE.Mesh(ag, aoArmMat);
    const a = tent ? (i === 8 ? -0.4 : 0.4) : (i / 8) * Math.PI * 2;
    m.position.set(0, Math.sin(a) * (tent ? 0.01 : 0.035), Math.cos(a) * (tent ? 0.02 : 0.045));
    m.rotation.set(0, Math.cos(a) * (tent ? 0.05 : 0.22), -Math.sin(a) * (tent ? 0.03 : 0.2));
    m.userData.a = a;
    arms.add(m);
  }
  g.add(arms);
  g.userData.arms = arms;
  return g;
}
const AO_SQ = Array.from({ length: 10 }, () => { const m = makeSquid(); world.add(m); extras.push(m); return m; });
const AO_BABY = Array.from({ length: 22 }, () => { const m = makeSquid(); world.add(m); extras.push(m); return m; });
// 1体を置く。p はワールド座標、dir=1 なら腕を +x（右）へ向けて進む
function aoPlace(m, p, dir, T, sc = 1, seed = 0, pitch = 0) {
  m.visible = true;
  m.position.set(p.x, p.y + Math.sin(T * 1.4 + seed * 2.1) * 0.05 * sc, p.z);
  m.scale.setScalar(sc);
  m.rotation.set(0, dir > 0 ? Math.PI : 0, pitch * (dir > 0 ? -1 : 1));
  m.userData.arms.children.forEach((a, i) => { a.rotation.y = Math.cos(a.userData.a) * 0.22 + Math.sin(T * 2 + i + seed) * 0.06; });
}
// 群れ（ふつうは中心 c のまわりに n 体）
const AO_OFF = (() => { const r = rng(1101); return Array.from({ length: 32 }, () => [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1, r() * 6]); })();
function aoFlock(c, spread, dir, T, n = 8, sc = 1.3) {
  AO_SQ.forEach((m, i) => {
    if (i >= n) { m.visible = false; return; }
    const [ox, oy, oz, ph] = AO_OFF[i];
    aoPlace(m, V(c.x + ox * spread.x + Math.sin(T * 0.3 + ph) * 0.3, c.y + oy * spread.y, c.z + oz * spread.z), dir, T, sc * (0.85 + 0.3 * ((i * 37) % 10) / 10), ph);
  });
}
// 卵のう（白いさや）のかたまりと、それを付ける海藻
const AO_EGG_AT = [-7.6, 2.4]; // 岩のない砂地（岩は x=-15〜-9 に多い）
const aoEggs = new THREE.Group();
world.add(aoEggs);
extras.push(aoEggs);
const aoEggCaps = [];
{
  const by = dioY(AO_EGG_AT[0]);
  aoEggs.position.copy(D(AO_EGG_AT[0], by, AO_EGG_AT[1]));
  const stemM = shadedMat(0x5b6a24, { rough: 0.2 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 1.5, 6).translate(0, 0.75, 0), stemM);
  aoEggs.add(stem);
  const r = rng(1201);
  for (let i = 0; i < 9; i++) {
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.7, 5).translate(0, 0.35, 0), stemM);
    br.position.set(0, 0.35 + i * 0.12, 0);
    br.rotation.set((r() - 0.5) * 1.6, r() * 6, (r() - 0.5) * 1.8);
    aoEggs.add(br);
  }
  const capM = new THREE.ShaderMaterial({
    transparent: true,
    vertexShader: `varying vec3 vN; varying vec3 vL; void main(){ vN = normalize(mat3(modelMatrix)*normal); vL = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vN; varying vec3 vL; ${AO_NORM} void main(){ float egg = smoothstep(0.03,0.02,length(vec2(vL.x, mod(vL.y+0.3,0.12)-0.06)));
      vec3 c = mix(vec3(0.97,0.96,0.92), vec3(0.85,0.8,0.62), egg*0.6); gl_FragColor = vec4(aoLight(c, vN)*1.12, 0.93); }`,
  });
  for (let i = 0; i < 44; i++) {
    const cg = new THREE.CapsuleGeometry(0.07, 0.42, 4, 10).translate(0, 0.28, 0);
    const m = new THREE.Mesh(cg, capM);
    const h = 0.45 + r() * 0.8, a = r() * 6.28;
    m.position.set(Math.cos(a) * 0.05, h, Math.sin(a) * 0.05);
    m.rotation.set(Math.cos(a) * (0.6 + r() * 1.4), 0, Math.sin(a) * (0.6 + r() * 1.4) + Math.PI);
    m.rotation.order = "YXZ";
    m.rotation.y = r() * 6.28;
    aoEggs.add(m);
    aoEggCaps.push(m);
  }
}
function aoEggShow(n) { aoEggs.visible = true; aoEggCaps.forEach((m, i) => (m.visible = i < n)); }
// 小魚（エサ）とものさし用の1匹
const aoPrey = school("イワシ", 16, 0.5, 1301, { freq: 16, amp: 0.06 });
world.add(aoPrey);
extras.push(aoPrey);
const aoPreyOne = fishMesh("イワシ", 1, { amp: 0.06, freq: 12 });
world.add(aoPreyOne);
extras.push(aoPreyOne);
// 大阪湾の水温グラフに引く 15℃・25℃の線
const aoLine15 = new THREE.Mesh(new THREE.BoxGeometry(40, 0.14, 2.8), new THREE.MeshBasicMaterial({ color: 0x7fd3ff, transparent: true, opacity: 0.95, depthTest: false }));
const aoLine25 = new THREE.Mesh(new THREE.BoxGeometry(40, 0.14, 2.8), new THREE.MeshBasicMaterial({ color: 0xff9f40, transparent: true, opacity: 0.95, depthTest: false }));
aoLine15.position.copy(D(0, -9 + 15 * BAR_H, 0));
aoLine25.position.copy(D(0, -9 + 25 * BAR_H, 0));
aoLine15.renderOrder = aoLine25.renderOrder = 40;
world.add(aoLine15, aoLine25);
extras.push(aoLine15, aoLine25);

// 1年の輪（月は時計回り、1月が上）。o.mini=全体図の小さい輪、o.now=いまの月（小数）、o.seg=描く段階の数（小数で描き進める）
const AO_SEG = [[7, 9, "#ff9f6a", "夏", "生まれて育つ"], [10, 11, "#ffd166", "秋", "岸の近くで大きく"], [12, 3, "#4c9dff", "冬", "分布の中心は沖へ"], [4, 6, "#ff6fae", "春〜夏", "岸で卵を産む"]];
const aoAng = (m) => ((m - 1) / 12) * Math.PI * 2 - Math.PI / 2;
const aoXY = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
function aoArc(m0, m1, r, prog = 1) {
  const span = ((m1 - m0 + 12) % 12) + 1;
  const a0 = aoAng(m0), a1 = a0 + (span / 12) * Math.PI * 2 * clamp01(prog);
  const [x0, y0] = aoXY(a0, r), [x1, y1] = aoXY(a1, r);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}
function aoRing(cx, cy, R, o = {}) {
  const a = o.a ?? 1;
  if (a <= 0.01) return;
  const mini = !!o.mini, sw = mini ? 16 : 34, pad = mini ? 20 : 150;
  let s = `<svg style="position:absolute;left:${cx - R - pad}px;top:${cy - R - pad}px;opacity:${a};overflow:visible" width="${2 * (R + pad)}" height="${2 * (R + pad)}" viewBox="${-R - pad} ${-R - pad} ${2 * (R + pad)} ${2 * (R + pad)}">`;
  s += `<circle r="${R + (mini ? 16 : 44)}" fill="rgba(6,22,42,.86)" stroke="rgba(255,255,255,.25)" stroke-width="2"/>`;
  s += `<circle r="${R}" fill="none" stroke="#2c4a66" stroke-width="${sw}"/>`;
  if (o.loop != null) s += `<path d="${aoArc(1, 12, R, o.loop)}" fill="none" stroke="#9fb7c9" stroke-width="${sw}" stroke-linecap="butt"/>`;
  const seg = o.seg ?? 0;
  AO_SEG.forEach(([m0, m1, col, nm, sub], i) => {
    const pr = clamp01(seg - i);
    if (pr <= 0) return;
    const hi = o.hi == null || o.hi === i;
    s += `<path d="${aoArc(m0, m1, R, pr)}" fill="none" stroke="${col}" stroke-width="${sw}" opacity="${hi ? 1 : 0.35}"/>`;
    if (!mini && pr > 0.6) {
      const span = ((m1 - m0 + 12) % 12) + 1, am = aoAng(m0) + (span / 24) * Math.PI * 2;
      const [x, y] = aoXY(am, R + 105);
      s += `<g opacity="${clamp01((pr - 0.6) / 0.4) * (hi ? 1 : 0.4)}"><text x="${x}" y="${y - 6}" text-anchor="middle" font-size="40" font-weight="900" fill="${col}" stroke="#06213a" stroke-width="6" paint-order="stroke">${nm}</text><text x="${x}" y="${y + 32}" text-anchor="middle" font-size="27" font-weight="800" fill="#fff" stroke="#06213a" stroke-width="5" paint-order="stroke">${sub}</text></g>`;
    }
  });
  if (o.spawn) {
    const r2 = R - (mini ? 18 : 44);
    s += `<path d="${aoArc(4, 9, r2, o.spawn)}" fill="none" stroke="#ff6fae" stroke-width="${mini ? 6 : 12}" opacity=".85"/>`;
    s += `<path d="${aoArc(5, 7, r2, clamp01(o.spawn * 2 - 1))}" fill="none" stroke="#ff6fae" stroke-width="${mini ? 10 : 22}"/>`;
  }
  for (let m = 1; m <= 12; m++) {
    const [x, y] = aoXY(aoAng(m + 0.5), mini ? R : R);
    if (!mini) s += `<text x="${x}" y="${y + 10}" text-anchor="middle" font-size="27" font-weight="900" fill="#06213a">${m}</text>`;
    else if (m % 3 === 1) s += `<text x="${x}" y="${y + 6}" text-anchor="middle" font-size="16" font-weight="900" fill="#fff">${m}</text>`;
  }
  if (o.now != null) {
    const am = aoAng(o.now + 0.5), [x, y] = aoXY(am, R + (mini ? 20 : 40)), [x2, y2] = aoXY(am, R - (mini ? 12 : 26));
    s += `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="${mini ? 5 : 8}" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="${mini ? 7 : 12}" fill="#fff"/>`;
  }
  if (o.center) s += `<text y="${mini ? 8 : -10}" text-anchor="middle" font-size="${mini ? 26 : 74}" font-weight="900" fill="#ffd166">${o.center}</text>`;
  if (o.center2) s += `<text y="${mini ? 30 : 46}" text-anchor="middle" font-size="${mini ? 16 : 34}" font-weight="800" fill="#fff">${o.center2}</text>`;
  html += s + `</svg>`;
}
// 全体図（左上）：いまの季節が、1年のどこか
function aoMini(now, hi, a = 1) {
  const P = PORTRAIT;
  aoRing(P ? 150 : 175, P ? 340 : 240, P ? 82 : 88, { mini: true, seg: 4, hi, now, center: "1年", center2: "いまここ", a });
}
// 太い矢印（画面の上に描く）
function aoArrow(p0, p1, color, a = 1, w = 22) {
  if (a <= 0.01) return;
  const q0 = project(p0), q1 = project(p1);
  const dx = q1.x - q0.x, dy = q1.y - q0.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, h = w * 2.1;
  const bx = q1.x - ux * h, by = q1.y - uy * h;
  lines += `<g opacity="${a}"><line x1="${q0.x}" y1="${q0.y}" x2="${bx}" y2="${by}" stroke="#06213a" stroke-width="${w + 8}" stroke-linecap="round"/><line x1="${q0.x}" y1="${q0.y}" x2="${bx}" y2="${by}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>
    <polygon points="${q1.x},${q1.y} ${bx - uy * h * 0.8},${by + ux * h * 0.8} ${bx + uy * h * 0.8},${by - ux * h * 0.8}" fill="${color}" stroke="#06213a" stroke-width="4"/></g>`;
}
const aoTag = (txt = "模式図") => `<div style="position:absolute;${PORTRAIT ? "left:40px;top:1120px" : "right:70px;bottom:250px"};background:rgba(6,22,42,.85);color:#fff;font-weight:900;font-size:28px;padding:6px 18px;border-radius:12px;border:2px solid #fff">${txt}</div>`;
const aoSrc = () => `<div style="position:absolute;left:${PORTRAIT ? 40 : 70}px;${PORTRAIT ? "top:1260px" : "bottom:210px"};color:#cfe6f5;font-size:22px;font-weight:700;text-shadow:0 2px 6px #000">出典：${AO_SRC}</div>`;
// 凡例（上のまん中）：水温の色と、白い線＝15℃
function aoLegend(a = 1) {
  if (a <= 0.01) return;
  const P = PORTRAIT;
  html += `<div style="position:absolute;left:0;right:0;top:${P ? 1190 : 118}px;display:flex;justify-content:center;opacity:${a}"><div style="display:flex;align-items:center;gap:14px;background:rgba(6,22,42,.82);border-radius:16px;padding:8px 20px;color:#fff;font-weight:900;font-size:${P ? 28 : 26}px">冷たい<div style="width:${P ? 200 : 240}px;height:20px;border-radius:10px;background:linear-gradient(90deg,${[8, 13, 18, 23, 28].map(tempColor).join(",")})"></div>温かい<span style="display:inline-block;width:34px;height:8px;background:#fff;border-radius:4px;margin-left:14px"></span>15℃のライン</div></div>`;
}
// 断面の季節：w=0 夏 → 1 秋 → 2 冬（冬は沖が温かいように tadd）→ spring で全体が温まる
function aoSeason(w, spring = 0, iso = 0) {
  setSeason(w);
  WU.tadd.value = 4 * clamp01(w - 1) + 6 * spring;
  WU.iso.value = iso;
}
const aoClose = (t = 0) => (PORTRAIT ? look(D(-7.6 + Math.sin(t * 0.08) * 0.3, -1.1, 7.9), D(-7.6, -1.5, 1.5), 50) : look(D(-7.9 + Math.sin(t * 0.08) * 0.4, -1.0, 7.2), D(-7.6, -1.5, 1.6), 50));
const aoWide = (t = 0) => (PORTRAIT ? look(D(Math.sin(t * 0.03) * 3, 2, 58), D(0, -5.5, 0), 50) : look(D(Math.sin(-0.08 + t * 0.008) * 39, -3, Math.cos(-0.08 + t * 0.008) * 39), D(0, -6.3, 0), 50));
const fadeOut = (t, t1, dur = 0.4) => 1 - clamp01((t - t1) / dur);
function aoBase(nat = 0) {
  studioBase();
  dio.visible = true;
  graph.visible = false;
  WU.nat.value = nat;
}

Object.assign(SHOTS, {
  ao_thumb(t, d, s) {
    aoBase(1);
    aoSeason(0.6);
    aoEggShow(44);
    aoPlace(AO_SQ[0], D(-7.05, -1.05, 4.6), -1, 3, 1.35, 0, 0.05);
    aoPlace(AO_SQ[1], D(-4.2, -0.75, 1.2), -1, 3, 1.0, 1);
    look(D(-8.4, -1.1, 7.4), D(-8.0, -1.3, 1.5), 50);
    html += `<div style="position:absolute;left:0;top:0;bottom:0;width:1050px;background:linear-gradient(90deg,rgba(2,14,28,.85),rgba(2,14,28,0))"></div>`;
    html += `<div style="position:absolute;left:70px;top:190px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px;background:#10345a;color:#ffd166;border:3px solid #ffd166">${s.tag}</span><div style="font-size:150px;line-height:1.1;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
  },
  // つかみ：最初のコマからアオリイカと問い
  ao_hook(t, d, s) {
    aoBase(1);
    academyBadge();
    aoSeason(0.3);
    const P = PORTRAIT;
    const x = -10.2 - t * 0.1;
    aoPlace(AO_SQ[0], D(x, -1.0, 2.6), -1, t, 1.3, 0);
    aoPlace(AO_SQ[1], D(x - 2.2, -0.75, 1.0), -1, t, 1.1, 1);
    aoPlace(AO_SQ[2], D(x + 1.9, -1.35, 0.4), -1, t, 1.0, 2);
    if (P) look(D(-10.8 - t * 0.05, -0.8, 7.2), D(-11.2 - t * 0.05, -0.95, 0), 50);
    else look(D(-10.4 - t * 0.06, -0.8, 6.3), D(-11.2 - t * 0.06, -0.95, 0), 50);
    html += `<div style="position:absolute;left:0;right:0;top:0;height:${P ? 900 : 430}px;background:linear-gradient(rgba(2,10,22,.75),rgba(2,10,22,0))"></div>`;
    const a = P ? 1 : clamp01(t / 0.25);
    bigText(P ? 0 : 110, "アオリイカの寿命は<br>どのくらい？", "カギは水温「15℃」", a);
    drawBar(s);
  },
  // 1年の輪：k0 約1年 → k1 季節ごとの暮らし → k2 産卵のあと一生を終える
  ao_ring(t, d, s, k) {
    aoBase(0);
    academyBadge();
    aoSeason(0.5);
    aoFlock(D(-10, -1.0, 0), V(4, 0.3, 2.5), Math.sin(t * 0.2) > 0 ? 1 : -1, t, 6, 1.8);
    aoWide(t);
    html += acDim(0.55);
    const P = PORTRAIT, cx = P ? 540 : 960, cy = P ? 720 : 470, R = P ? 290 : 255;
    const t1 = t - (s._k1 ?? 99), t2 = t - (s._k2 ?? 99);
    const seg = k >= 1 ? clamp01(t1 / 7) * 4 : 0;
    aoRing(cx, cy, R, { loop: k === 0 ? clamp01(t / 2.2) : null, seg, center: "約1年", center2: k >= 2 ? "多くは産卵のあと死ぬ" : "1周＝1年", now: k >= 1 ? lerp(6.5, 18.5, clamp01(t1 / 7)) % 12 : null });
    if (k >= 2) {
      html += `<div class="lab red" style="left:${P ? cx : cx + R + 250}px;top:${P ? cy + R + 250 : cy + 30}px;opacity:${fadeIn(t2, 0.3)}">産卵して一生を終える</div>`;
    }
    html += aoSrc();
  },
  // 卵を産む：k0 産卵期 → k1 卵のう → k2 人工の産卵礁
  ao_spawn(t, d, s, k) {
    aoBase(1);
    academyBadge();
    aoSeason(0.15);
    const t1 = t - (s._k1 ?? 99), t2 = t - (s._k2 ?? 99);
    aoEggShow(k >= 1 ? Math.floor(8 + 36 * clamp01(t1 / 4)) : 8);
    aoPlace(AO_SQ[0], D(-6.0 + Math.sin(t * 0.4) * 0.2, -1.3, 2.6), -1, t, 1.1, 0, 0.15);
    aoPlace(AO_SQ[1], D(-9.4 + Math.sin(t * 0.3) * 0.2, -1.0, 1.6), 1, t, 1.3, 1, 0.05);
    aoClose(t);
    const P = PORTRAIT;
    const EG = D(AO_EGG_AT[0], dioY(AO_EGG_AT[0]), AO_EGG_AT[1]);
    if (k >= 1) label(V(EG.x, EG.y + 1.0, EG.z), "卵のう", "白いさやの中に卵", fadeIn(t1, 0.4), "gold ans", P ? -140 : -420, -40);
    if (k >= 1) label(V(EG.x, EG.y + 0.2, EG.z), "海藻など", "", fadeIn(t1, 1.2), "", P ? -140 : -400, 0);
    if (k <= 1) {
      const bar = (lab, m0, m1, col, h) => `<div style="display:flex;align-items:center;gap:14px;margin-top:10px"><b style="width:120px;font-size:28px">${lab}</b><div style="position:relative;flex:1;height:${h}px;background:#e6edf3;border-radius:8px"><div style="position:absolute;left:${(m0 - 1) / 12 * 100}%;width:${(m1 - m0 + 1) / 12 * 100}%;top:0;bottom:0;background:${col};border-radius:8px"></div></div></div>`;
      html += card(P ? 60 : 1110, P ? 270 : 140, P ? 880 : 700, `<b style="font-size:36px">卵を産む季節（月）</b>${bar("産卵期", 4, 9, "#ffb3d1", 30)}${bar("盛期", 5, 7, "#ff4f98", 30)}<div style="display:flex;justify-content:space-between;margin:6px 0 0 134px;font-size:22px;color:#3a5a78">${[1, 3, 5, 7, 9, 11].map((m) => `<span>${m}月</span>`).join("")}</div>`, fadeIn(t, 0.3) * (k >= 1 ? fadeOut(t1, 2.5) : 1), "padding:22px 28px");
    }
    if (k >= 2) html += card(P ? 60 : 1110, P ? 270 : 140, P ? 880 : 700, `<b style="font-size:38px">卵を産みつける場所は少ない</b><div style="font-size:30px;margin-top:8px">徳島県では<span style="color:#e3412b;font-weight:900">人工の産卵礁</span>も開発</div>`, fadeIn(t2, 0.2), "padding:22px 28px");
    aoMini(5.5, 3);
    html += aoSrc();
  },
  // ふ化：k0 20〜35日 → k1 8〜9月生まれは小さいまま冬へ
  ao_hatch(t, d, s, k) {
    aoBase(1);
    academyBadge();
    aoSeason(0.05);
    aoEggShow(44);
    const day = Math.min(35, t * 7.5);
    const out = clamp01((day - 20) / 15);
    const r = rng(1401);
    const E = D(AO_EGG_AT[0], dioY(AO_EGG_AT[0]) + 0.9, AO_EGG_AT[1]);
    AO_BABY.forEach((m, i) => {
      const u = clamp01(out * 1.6 - (i / AO_BABY.length) * 0.6);
      const dx = (r() - 0.5) * 4.5, dy = r() * 0.9 - 0.2, dz = (r() - 0.5) * 2.4;
      if (u <= 0.001) { m.visible = false; return; }
      const e = ease(u);
      aoPlace(m, V(E.x + dx * e, Math.min(D(0, -0.25, 0).y, E.y + dy * e), E.z + dz * e), dx > 0 ? 1 : -1, t, 0.26, i);
    });
    aoClose(t);
    const P = PORTRAIT;
    html += card(P ? 300 : 1300, P ? 270 : 150, P ? 480 : 520, `<div style="font-size:30px;font-weight:800;color:#3a5a78">卵を産んでから</div><div style="font-size:${P ? 96 : 96}px;font-weight:900;line-height:1.1">${Math.floor(day)}<span style="font-size:44px">日</span></div><div style="height:22px;background:#e6edf3;border-radius:11px;position:relative;margin-top:6px"><div style="position:absolute;left:${20 / 35 * 100}%;right:0;top:0;bottom:0;background:#ffd166;border-radius:11px"></div><div style="position:absolute;left:0;width:${day / 35 * 100}%;top:6px;height:10px;background:#1f6fd1;border-radius:5px"></div></div><div style="font-size:28px;font-weight:900;margin-top:8px;color:#1e7a36">20〜35日でふ化</div>`, 1, "padding:20px 28px;text-align:center");
    if (out > 0.3) label(V(E.x + 1.2, E.y + 0.2, E.z + 0.6), "生まれたばかり", "", fadeIn(out, 0.3, 0.3), "gold", P ? 60 : 300, 170);
    if (k >= 1) html += card(P ? 60 : 110, P ? 1020 : 590, P ? 880 : 760, `<b style="font-size:38px">8〜9月に生まれたものは</b><div style="font-size:34px;margin-top:6px;font-weight:900"><span style="color:#1f6fd1">小さいまま冬を越す</span>とされる</div>`, fadeIn(t - (s._k1 ?? 99), 0.2), "padding:20px 28px");
    aoMini(7, 0);
  },
  // 夏に育つ：k0 25〜30℃でよく食べる → k1 胴の1.5倍までの魚やエビ → k2 オスの方が成長が良い
  ao_eat(t, d, s, k) {
    aoBase(1);
    academyBadge();
    aoSeason(0);
    const P = PORTRAIT;
    const t1 = t - (s._k1 ?? 99);
    const sc = 1.6, sq = D(-3.4, -1.55, 2.2);
    aoPlace(AO_SQ[0], sq, -1, t, sc, 0);
    if (k >= 1) {
      // 胴の長さ（外套背長 ≒ 0.68×sc）と、その1.5倍の魚を左端そろえで比べる
      const ml = 0.68 * sc, xb = sq.x - 0.17 * sc, y = sq.y + 0.12 * sc + 0.2;
      pathLine([V(xb, y, sq.z), V(xb + ml, y, sq.z)], "#ffd166", fadeIn(t1, 0, 0.6), 9);
      aoPreyOne.visible = true;
      const fl = 1.5 * ml;
      aoPreyOne.scale.set(fl, fl, 1);
      aoPreyOne.position.set(xb + fl / 2, sq.y - 0.95, sq.z);
      aoPreyOne.rotation.set(0, 0, 0);
      const fy = sq.y - 1.4;
      pathLine([V(xb, fy, sq.z), V(xb + fl, fy, sq.z)], "#2ecc71", fadeIn(t1, 0.8, 1), 9);
      label(V(xb + ml / 2, y, sq.z), "胴の長さ", "外套背長", fadeIn(t1, 0.2), "gold", P ? 0 : -60, -60);
      label(V(xb + fl, fy, sq.z), "約1.5倍までの魚やエビ", "子どもでも食べられる", fadeIn(t1, 1.3), "gold ans", P ? -40 : 300, -20);
    } else {
      show(aoPrey);
      updateSchool(aoPrey, t, D(-0.6 + Math.sin(t * 0.3) * 0.4, -1.8, 1.6), V(1.2, 0.3, 1.0), -1);
    }
    if (P) look(D(-2.5, -1.9, 7.4), D(-2.5, -2.0, 0.8), 50);
    else look(D(-2.4 + Math.sin(t * 0.06) * 0.3, -1.9, 6.6), D(-2.4, -2.0, 1.2), 50);
    const T = 27;
    html += card(P ? 60 : 1290, P ? 270 : 140, P ? 520 : 520, `<div style="font-size:28px;font-weight:800;color:#3a5a78">よく食べる水温</div><div style="font-size:84px;font-weight:900;line-height:1.1;color:${tempColor(T)}">25〜30℃</div><div style="font-size:26px;font-weight:800">夏から秋がよく育つ季節</div>`, fadeIn(t, 0.3), "padding:18px 26px;text-align:center");
    if (k >= 2) html += card(P ? 60 : 110, P ? 1030 : 600, P ? 880 : 640, `<b style="font-size:40px">成長は<span style="color:#1f6fd1">オス</span>の方がよい</b><div style="font-size:24px;color:#3a5a78;margin-top:6px">とされる（徳島県）</div>`, fadeIn(t - (s._k2 ?? 99), 0.2), "padding:20px 28px");
    aoMini(8, 0);
  },
  // クイズ：k0 問い → k1 選択肢 → k2 答え 15℃
  ao_quiz(t, d, s, k) {
    aoBase(0);
    academyBadge();
    const t2 = t - (s._k2 ?? 99);
    aoSeason(2, 0, k >= 2 ? fadeIn(t2, 0.3, 0.6) : 0);
    aoFlock(D(11, -8.5, 0), V(4, 1.4, 2.5), 1, t, 8, 3.0);
    aoWide(t);
    const P = PORTRAIT;
    if (k <= 1) {
      html += acDim(0.35);
      html += `<div class="big" style="top:${P ? 560 : 140}px;font-size:${P ? 66 : 62}px">クイズ　アオリイカが<br><span style="color:#ffd166">死んでしまう水温</span>は？</div>`;
      if (k === 1) {
        const o = [["1", "5℃以下"], ["2", "15℃以下"], ["3", "25℃以下"]];
        html += `<div style="position:absolute;left:${P ? 140 : 610}px;top:${P ? 980 : 380}px;width:${P ? 800 : 700}px">${o.map(([n, x], i) => `<div class="opt" style="opacity:${fadeIn(t - (s._k1 ?? 0), 0.2 + i * 0.35)}"><i>${n}</i>${x}</div>`).join("")}</div>`;
      }
    } else {
      label(D(-3.2, -2.2, 6), "答え 2：15℃以下", "これより冷たいと生きられない", fadeIn(t2, 0.5), "gold ans", P ? 0 : -360, -60);
      html += `<div style="position:absolute;${P ? "right:40px;top:230px" : "right:60px;top:120px"};opacity:${fadeIn(t2, 0.6)}">${""}</div>`;
      aoLegend(fadeIn(t2, 0.6));
      html += aoTag("模式図（水温の分かれ方はイメージ）");
      html += aoSrc();
    }
  },
  // 冬は沖へ：k0 夏〜秋は沿岸に広く → k1 冬は分布の中心が沖へ → k2 浅い所ほど冷えやすい・紀伊水道南部・海部沿岸
  ao_winter(t, d, s, k) {
    aoBase(0);
    academyBadge();
    const t1 = t - (s._k1 ?? 99);
    const w = k >= 1 ? 1 + ease(t1 / 4) : 0.9;
    aoSeason(w, 0, k >= 1 ? clamp01((w - 1.4) / 0.4) : 0);
    const mv = k >= 1 ? ease((t1 - 0.8) / 5) : 0;
    const c = D(lerp(-10, 10.5, mv), lerp(-1.0, -8.3, mv * mv), 0);
    aoFlock(c, V(lerp(4.5, 4, mv), lerp(0.4, 1.4, mv), 3), mv > 0.02 && mv < 0.98 ? 1 : Math.sin(t * 0.2) > 0 ? 1 : -1, t, 8, 3.0);
    aoWide(t);
    const P = PORTRAIT;
    const L = (x, y, txt, sub, a, cls, dx, dy) => label(D(x, y, 6), txt, sub, a, cls, dx, dy);
    L(-17, 0.6, "岸（浅い）", "", 1, "", P ? 80 : 230, -40);
    L(18, 0.2, "沖（深い）", "", 1, "", P ? -80 : -200, -40);
    if (k === 0) L(-10, -1.2, "沿岸に広く分布", "水温が高い季節", fadeIn(t, 0.5), "gold", P ? 80 : 160, 200);
    if (k >= 1) aoArrow(D(-8, -1.2, 6), D(8, -7.4, 6), "#4c9dff", fadeIn(t1, 0.6) * fadeOut(t1, 7), P ? 26 : 22);
    if (k >= 1 && mv > 0.9) L(10.5, -8, "分布の中心は沖へ", "水温が低い季節", fadeIn(mv, 0.9, 0.1), "gold ans", P ? -60 : 0, -160);
    if (k >= 2) {
      L(-12, -1.4, "浅い所は冷えやすい", "と言われる", fadeIn(t - (s._k2 ?? 99), 0.2), "red", P ? 60 : 160, 160);
    }
    aoLegend(1);
    aoMini(w < 1.5 ? 10 : 1, w < 1.5 ? 1 : 2);
    html += aoTag("模式図（水温の分かれ方・群れの動きはイメージ）");
    if (k >= 2) {
      const a = fadeIn(t - (s._k2 ?? 99), 2.5);
      html += card(P ? 60 : 110, P ? 1030 : 610, P ? 880 : 660, `<b style="font-size:34px">徳島県の調査では</b><div style="font-size:32px;font-weight:900;margin-top:6px">冬は<span style="color:#1f6fd1">紀伊水道の南部</span>や<span style="color:#1f6fd1">海部の沿岸</span>に限られる</div>`, a, "padding:20px 28px");
    }
  },
  // 大阪湾の水温：k0 1〜4月は15℃を下回る → k1 7〜9月は25℃をこえる → k2 いま11月は約20℃
  ao_osaka(t, d, s, k) {
    aoBase(0);
    academyBadge();
    dio.visible = false;
    graph.visible = true;
    const P = PORTRAIT;
    const ang = -0.2 + ease(t / d) * 0.16;
    if (P) look(D(Math.sin(ang) * 30, 4, 56), D(0, -1.5, 0), 50);
    else look(D(Math.sin(ang) * 44, 5, Math.cos(ang) * 44), D(0, -0.5, 0), 48);
    const hi = k >= 2 ? [10] : k >= 1 ? [6, 7, 8] : [0, 1, 2, 3];
    drawBars(t, { grow: 0.1, hi });
    aoLine15.visible = true;
    aoLine15.material.opacity = 0.95;
    if (k >= 1) aoLine25.visible = true;
    label(D(-21, -9 + 15 * BAR_H, 0), "15℃", "", 1, "", P ? 60 : -40, -20);
    if (k >= 1) label(D(-21, -9 + 25 * BAR_H, 0), "25℃", "", 1, "gold", P ? 60 : -40, -20);
    if (k === 0) { barLabel(1, fadeIn(t, 1.2), "", 0, -150); html += `<div class="big" style="top:${P ? 380 : 150}px;font-size:${P ? 64 : 58}px;opacity:${fadeIn(t, 1.4)}">1〜4月は <span style="color:#7fd3ff">15℃より下</span></div>`; }
    if (k === 1) { barLabel(7, 1, "gold", 0, -100); html += `<div class="big" style="top:${P ? 380 : 150}px;font-size:${P ? 64 : 58}px">7〜9月は <span style="color:#ff9f40">25℃をこえる</span></div>`; }
    if (k >= 2) { barLabel(10, 1, "gold ans", 0, -120); html += `<div class="big" style="top:${P ? 380 : 150}px;font-size:${P ? 64 : 58}px">いま11月は <span style="color:#ffd166">約20℃</span></div>`; }
    html += `<div style="position:absolute;${P ? "left:40px;right:40px;top:1240px" : "left:0;right:0;text-align:center;top:235px"};color:#bfe6ea;font-weight:700;font-size:22px;text-shadow:0 2px 6px #000">出典：気象庁「沿岸域の海面水温情報（大阪湾）」2021〜2025年の日平均を月ごとに平均</div>`;
  },
  // 春、ふたたび岸へ：k0 水温が上がると沿岸へ・産卵 → k1 大きなもの 50.1cm・3.9kg → k2 近年は大型化の傾向
  ao_spring(t, d, s, k) {
    aoBase(0);
    academyBadge();
    const sp = ease(t / 5);
    aoSeason(2, sp, clamp01(1 - sp * 1.6));
    const mv = ease((t - 1) / 5);
    const c = D(lerp(10.5, -10, mv), lerp(-8.3, -1.0, Math.sqrt(mv)), 0);
    aoFlock(c, V(lerp(4, 4.5, mv), lerp(1.4, 0.4, mv), 3), mv > 0.02 && mv < 0.98 ? -1 : Math.sin(t * 0.2) > 0 ? 1 : -1, t, 8, 3.0);
    if (mv > 0.9) aoEggShow(Math.floor(44 * clamp01((t - 6) / 3)));
    aoWide(t);
    const P = PORTRAIT;
    if (k === 0) aoArrow(D(8, -7.4, 6), D(-8, -1.4, 6), "#ff6fae", fadeIn(t, 0.8) * fadeOut(t, 6.5), P ? 26 : 22);
    if (k === 0 && mv > 0.9) label(D(-10, -1.2, 6), "岸の近くで卵を産む", "水温が上がる季節", fadeIn(mv, 0.9, 0.1), "gold ans", P ? 60 : 120, 340);
    aoLegend(k >= 1 ? fadeOut(t - (s._k1 ?? 99), 0) : 1);
    aoMini(mv < 0.5 ? 3 : 5, 3);
    html += aoTag("模式図（群れの動きはイメージ）");
    if (k >= 1) {
      const a = fadeIn(t - (s._k1 ?? 99), 0.2);
      html += acDim(0.35 * a);
      html += card(P ? 60 : 1050, P ? 270 : 150, P ? 880 : 800, `<div style="font-size:30px;font-weight:800;color:#3a5a78">徳島県の定置網でとれた大きなもの</div><div style="font-size:58px;font-weight:900;margin-top:6px">外套背長 <span style="color:#e3412b">50.1cm</span></div><div style="font-size:58px;font-weight:900">体重 <span style="color:#e3412b">3.9kg</span></div>`, a, "padding:22px 30px");
    }
    if (k >= 2) html += card(P ? 60 : 1050, P ? 750 : 560, P ? 880 : 800, `<b style="font-size:36px">近年は水温が高い傾向で</b><div style="font-size:40px;font-weight:900;margin-top:6px"><span style="color:#e3412b">大型化の傾向</span>とされる</div>`, fadeIn(t - (s._k2 ?? 99), 0.2), "padding:20px 30px");
    html += aoSrc();
  },
  ao_sum(t, d, s, k) {
    aoBase(0);
    aoSeason(0.6);
    aoFlock(D(-10, -1.0, 0), V(4, 0.3, 2.5), Math.sin(t * 0.2) > 0 ? 1 : -1, t, 6, 1.8);
    aoWide(t);
    html += acDim(0.5);
    const P = PORTRAIT;
    const rows = [["寿命", "約1年", "多くは産卵のあとに死ぬ", "#c2410c"], ["15℃以下", "生きられない", "冬は分布の中心が沖へ", "#1f6fd1"], ["4〜9月", "岸の近くで産卵", "20〜35日でふ化", "#2a9d5c"]];
    html += `<div class="big" style="top:${P ? 560 : 110}px;font-size:${P ? 66 : 64}px;opacity:${fadeIn(t, 0.1)}">アオリイカの一生 まとめ</div>`;
    rows.forEach(([a1, b1, c1, col], i) => {
      const a = fadeIn(t, 0.4 + i * 0.45);
      html += `<div class="card" style="left:${P ? 70 : 330}px;top:${(P ? 780 : 240) + i * (P ? 240 : 200)}px;width:${P ? 880 : 1200}px;padding:20px 30px;opacity:${a};transform:translateY(${(1 - a) * 30}px);display:flex;align-items:center;gap:26px"><b style="background:${col};color:#fff;font-size:${P ? 34 : 38}px;padding:10px 0;width:${P ? 230 : 250}px;text-align:center;border-radius:18px;flex:none">${a1}</b><div><div style="font-size:${P ? 42 : 46}px;font-weight:900">${b1}</div><div style="font-size:${P ? 28 : 30}px;color:#3a5a78">${c1}</div></div></div>`;
    });
  },
});

// =====================================================================
// 船のタチウオ（cg-fune-tachiuo、ft_*）2026-11-11 船釣り 見える化シリーズ 第1回
// 参考：Honda釣り倶楽部「船テンヤタチウオ」（時期7〜12月ごろ・近年は3月ごろまで／40号150gが標準のことが多い／PE2号／
//   ストップ＆ゴー＝ハンドル2回転→3〜8秒待つ／ジャーク＆ステイ／止めるとき竿先を下げない／食い上げは重さを感じるまで巻いてから合わせる／歯が鋭い）
//   シマノ「大阪湾のテンヤタチウオ」（神戸沖 水深70m・テンヤ40号か50号・微速巻き＋シャクリは上へ追わせる誘い）、同「泉佐野出船のタチウオ」（洲本沖 水深100m前後）
//   TSURI HACK（タチウオジギング：東京湾・大阪湾は150g前後が多い、ワンピッチジャーク、フォール中のアタリ）
//   昼は海底直上で立ち泳ぎ（徳島県「太刀魚」2019。docs/research/fish-knowledge.md）
// 仕掛けの動きは、下の ftSim（重さ・浮力・水の抵抗・糸の張りの簡単な物理モデル）で計算したもの。係数は形と重さから決めた目安で、実物の計測値ではない。
// 魚の動きはイメージ（「下から襲う」とは描かない。横に並んで、止まった仕掛けに口を寄せる）。
// 1 = 1m。海面 y=0、海底 y=-70。魚は必ず海底より上に置く（ftHeroAt・ftSchoolPlace で下端を確かめる）
// =====================================================================
// ---- 仕掛けの動きの計算（2次元の剛体：重さ・浮力・水の抵抗・糸の張り） ----
// 単位は m・kg・秒。y は上が正、海面が 0。体の向き th は「頭（糸を結ぶ側ではなく進む向きの基準）」の角度
const FT_TURN = 0.65; // ハンドル1回転で巻ける糸の長さ（計算の条件。リールで変わる）
const FT_EA = 3750;   // 道糸（PE2号を想定）の伸びにくさ EA [N]
const FT_KLD = 0.0031; // 糸が水を切る抵抗（糸1mあたり、速さの2乗にかかる係数）
// 操作の列 → 時刻 t の {tip: 竿先の上下[m], reel: 巻いた長さの合計[m], free: クラッチを切っているか, fish: 魚が引く力[N]}
function ftControl(seq) {
  const segs = [], marks = {};
  let t = 0, reel = 0;
  const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  for (const s of seq) {
    if (s.mark) { marks[s.mark] = t; continue; }
    const n = s.rep ?? 1;
    for (let i = 0; i < n; i++) {
      if (s.wait != null) { segs.push({ t0: t, t1: t + s.wait, reel0: reel, reel1: reel, kind: "wait", fish: s.fish }); t += s.wait; }
      else if (s.free != null) { segs.push({ t0: t, t1: t + s.free, reel0: reel, reel1: reel, kind: "free", thumb: s.thumb ?? 0.15, fish: s.fish }); t += s.free; }
      else if (s.reel != null) { const r1 = reel + s.reel * FT_TURN; segs.push({ t0: t, t1: t + s.dur, reel0: reel, reel1: r1, kind: "reel", lin: s.lin, fish: s.fish }); reel = r1; t += s.dur; }
      else if (s.jerk != null) {
        // 竿を up 秒で jerk[m] だけ上げ、down 秒で戻す。戻す間に turn 回転ぶん巻く
        const r1 = reel + (s.turn ?? 0) * FT_TURN;
        segs.push({ t0: t, t1: t + s.up, reel0: reel, reel1: reel, kind: "up", amp: s.jerk, fish: s.fish });
        segs.push({ t0: t + s.up, t1: t + s.up + s.down, reel0: reel, reel1: r1, kind: "down", amp: s.jerk, fish: s.fish });
        reel = r1; t += s.up + s.down;
      }
    }
  }
  const dur = t;
  let j = 0;
  const f = (tt) => {
    if (tt >= dur || tt < 0) return { tip: 0, reel: tt < 0 ? 0 : reel, free: false, fish: null, kind: "wait", turning: false, t0: tt < 0 ? -9 : dur, t1: 1e9 };
    if (tt < segs[j].t0) j = 0;
    while (tt >= segs[j].t1) j++;
    const s = segs[j], u = (tt - s.t0) / (s.t1 - s.t0);
    const e = s.lin ? u : sm(u);
    return {
      tip: s.kind === "up" ? s.amp * sm(u) : s.kind === "down" ? s.amp * (1 - sm(u)) : 0,
      reel: s.reel0 + (s.reel1 - s.reel0) * e, free: s.kind === "free", thumb: s.thumb, fish: s.fish || null, kind: s.kind,
      turning: s.reel1 > s.reel0, t0: s.t0, t1: s.t1,
    };
  };
  f.dur = dur;
  f.marks = marks;
  return f;
}
function ftSim(b, ctl, opt = {}) {
  const dt = 1 / 2000, dur = opt.dur ?? ctl.dur, N = Math.round(dur / dt), BOT = opt.bot ?? -70, tip0 = 2, REC = 20;
  let x = 0, y = opt.y0 ?? -60, vx = 0, vy = 0, th = opt.th0 ?? 0, om = opt.om0 ?? 0;
  const eye0 = b.eye[0] * Math.sin(th) + b.eye[1] * Math.cos(th);
  let L = tip0 - (y + eye0); L -= b.W * L / FT_EA;
  let Lbase = L, reelBase = 0, wasFree = false, prevReel = 0, prevTip = 0, landed = -1;
  const mt = b.m + (b.ma ?? 0), out = [];
  for (let i = 0; i <= N; i++) {
    const t = i * dt, c0 = ctl(t);
    const c = Math.cos(th), s = Math.sin(th);
    const ex = b.eye[0] * c - b.eye[1] * s, ey = b.eye[0] * s + b.eye[1] * c;
    const px = b.cp * c, py = b.cp * s;
    const wx = (opt.cur ?? 0) + 0.03 * Math.sin(1.7 * t + 0.4) + 0.02 * Math.sin(4.1 * t + 1.3); // 潮の流れ（opt.cur、+x 向き）＋水の小さなゆらぎ
    const ux = vx - wx - om * py, uy = vy + om * px;
    const ua = ux * c + uy * s, un = -ux * s + uy * c;
    const Fa = -b.ka * Math.abs(ua) * ua, Fn = -b.kn * Math.abs(un) * un - b.kl * Math.abs(ua) * un;
    let Fx = Fa * c - Fn * s, Fy = Fa * s + Fn * c - b.W;
    let tau = b.cp * Fn - b.km * ua * un - b.kw * Math.abs(om) * om - b.kw1 * om;
    // 糸
    const tipV = (c0.tip - prevTip) / dt, reelV = (c0.reel - prevReel) / dt;
    prevTip = c0.tip; prevReel = c0.reel;
    const dx = -(x + ex), dy = tip0 + c0.tip - (y + ey), dist = Math.hypot(dx, dy);
    const evx = vx - om * ey, evy = vy + om * ex;
    const rate = (-(dx * evx + dy * evy) + dy * tipV) / dist;
    let T = 0;
    if (c0.free) {
      if (dist > L) { const sp = Math.max(0, rate); T = c0.thumb + FT_KLD * L * sp * sp; L = dist; }
      wasFree = true;
    } else {
      if (wasFree) { Lbase = L; reelBase = c0.reel; wasFree = false; }
      L = Lbase - (c0.reel - reelBase);
      const ext = dist - L;
      if (ext > 0) T = Math.max(0, FT_EA / L * ext + 3 * (rate + reelV));
    }
    const lx = T * dx / dist, ly = T * dy / dist;
    Fx += lx; Fy += ly; tau += ex * ly - ey * lx;
    if (c0.fish) { Fx += c0.fish[0]; Fy += c0.fish[1]; }
    // 潮が糸を押す力（糸の長さ×流れの速さ²。opt.cline は目安の係数。2026-11-11 船の青物ジギング用。ふだんは 0）
    if (opt.cline) Fx += opt.cline * L * (opt.cur ?? 0) * Math.abs(opt.cur ?? 0);
    if (i % REC === 0) out.push([x, y, th, T, c0.tip, c0.reel, c0.free ? 1 : 0, c0.turning ? 1 : 0]);
    vx += Fx / mt * dt; vy += Fy / mt * dt; om += tau / b.I * dt;
    x += vx * dt; y += vy * dt; th += om * dt;
    const low = y - Math.abs(Math.sin(th)) * b.len / 2 - b.r;
    if (low < BOT) { y += BOT - low; if (vy < 0) vy = 0; vx *= 0.97; om *= 0.9; if (landed < 0) landed = t; }
  }
  return { rec: out, hz: 2000 / REC, dur, landed, at(t) { const u = Math.max(0, Math.min(out.length - 1.001, t * this.hz)), i = Math.floor(u), f = u - i, a = out[i], q = out[i + 1]; return a.map((v, k) => v + (q[k] - v) * f); } };
}
// 仕掛けの条件（重さ・形から決めた係数。実物の計測値ではない）
const G_W = (m, dens) => m * 9.8 * (1 - 1.025 / dens);
const FT_BODY = {
  // テンヤ 40号（約150g・鉛）＋エサのイワシ。重心は頭の近く、糸を結ぶ輪は重心の真上
  tenya: { m: 0.17, ma: 0.03, W: G_W(0.15, 11.34), I: 6e-4, len: 0.2, r: 0.02, eye: [0, 0.03], cp: -0.04, ka: 0.26, kn: 3.4, kl: 0.3, km: 0.02, kw: 2e-3, kw1: 6e-4 },
  // メタルジグ 150g（鉛）長さ15cm。センターバランス：重心がまん中
  jigC: { m: 0.15, ma: 0.03, W: G_W(0.15, 11.34), I: 4e-4, len: 0.15, r: 0.012, eye: [0.075, 0], cp: 0, ka: 0.05, kn: 2.5, kl: 0.5, km: 0.03, kw: 1.2e-3, kw1: 3e-4 },
  // リアバランス：重心が後ろ（尾の側）に 3cm
  jigR: { m: 0.15, ma: 0.03, W: G_W(0.15, 11.34), I: 4.5e-4, len: 0.15, r: 0.012, eye: [0.105, 0], cp: 0.03, ka: 0.05, kn: 2.5, kl: 0.5, km: 0.03, kw: 1.2e-3, kw1: 3e-4 },
};
const FT_REP = (n, a) => Array.from({ length: n }, () => a).flat();
const FT_SEQ = {
  // テンヤを落とす → 着底 → 糸ふけを取って底を切る
  fall: { body: "tenya", opt: { y0: -57.5 }, seq: [{ free: 11 }, { wait: 0.6 }, { reel: 1.5, dur: 1.0 }, { wait: 10 }] },
  // ストップ＆ゴー：ハンドル2回転 → 止めて待つ（3〜8秒のうち4秒で計算）
  sg: { body: "tenya", opt: { y0: -68.6 }, seq: [{ wait: 1.5 }, ...FT_REP(7, [{ reel: 2, dur: 1.2 }, { wait: 4 }])] },
  // ジャーク＆ステイ：巻きながら3回しゃくって止める
  js: { body: "tenya", opt: { y0: -68 }, seq: [{ wait: 1.2 }, ...FT_REP(5, [{ jerk: 0.4, up: 0.25, down: 0.45, turn: 0.5, rep: 3 }, { wait: 3.2 }])] },
  // ごくゆっくり巻く＋小さくしゃくる
  bs: { body: "tenya", opt: { y0: -68 }, seq: [{ wait: 1 }, ...FT_REP(16, [{ jerk: 0.15, up: 0.2, down: 0.4, turn: 0.1 }, { reel: 0.15, dur: 1.0, lin: 1 }])] },
  // コツン、コツン → はっきり出たら合わせる（魚が引く力は仮の値）
  nib: { body: "tenya", opt: { y0: -67 }, seq: [{ wait: 2 }, { reel: 2, dur: 1.2 }, { wait: 1.6 }, { mark: "n1" }, { wait: 0.12, fish: [0.4, -2.5] }, { wait: 0.9 }, { mark: "n2" }, { wait: 0.12, fish: [0.4, -2.5] }, { wait: 1.0 }, { mark: "hook" }, { wait: 0.25, fish: [0, -4] }, { jerk: 0.6, up: 0.2, down: 0.6, fish: [0, -3] }, { wait: 8, fish: [0, -2.5] }] },
  // 食い上げ：魚がくわえて上へ → 糸がゆるむ → 重さを感じるまで巻いて合わせる
  kui: { body: "tenya", opt: { y0: -66 }, seq: [{ wait: 2.0 }, { mark: "bite" }, { wait: 2.0, fish: [0, 1.85] }, { wait: 4.0, fish: [0, 1.337] }, { mark: "reel" }, { reel: 4, dur: 1.8, fish: [0, 1.3] }, { mark: "hook" }, { jerk: 0.5, up: 0.2, down: 0.6, fish: [0, -3] }, { wait: 8, fish: [0, -2.5] }] },
  // ジグ：ワンピッチジャーク（1回しゃくって1回巻く）×5 → フォール
  jig: { body: "jigC", opt: { y0: -62, th0: 1.5 }, seq: [{ wait: 1.2 }, ...FT_REP(4, [{ jerk: 0.5, up: 0.3, down: 0.5, turn: 1, rep: 5 }, { free: 2 }, { wait: 0.8 }])] },
  jigfall: { body: "jigC", opt: { y0: -62, th0: 1.5 }, seq: [{ wait: 0.6 }, { jerk: 0.5, up: 0.3, down: 0.5, turn: 1, rep: 3 }, { mark: "fall" }, { free: 2.6 }, { wait: 7 }] },
  // 同じ150g：センターバランスとリアバランスを同時に落とす
  fallC: { body: "jigC", opt: { y0: -30, th0: 1.4 }, seq: [{ free: 14 }] },
  fallR: { body: "jigR", opt: { y0: -30, th0: 1.4 }, seq: [{ free: 14 }] },
};
const FT_SIMS = {};
function ftRun(name) {
  if (FT_SIMS[name]) return FT_SIMS[name];
  const d = FT_SEQ[name], ctl = ftControl(d.seq), r = ftSim(FT_BODY[d.body], ctl, d.opt);
  r.ctl = ctl; r.body = FT_BODY[d.body]; r.marks = ctl.marks;
  return (FT_SIMS[name] = r);
}

// ---------- 場面（海の断面）----------
const FT = V(0, 0, -2200);
const FTp = (x, y, z = 0) => V(FT.x + x, FT.y + y, FT.z + z);
const FT_BOT = -70, FT_LZ = 2.6, FT_TIP = 2;
const ftSurf = (x, T) => 0.2 * Math.sin(x * 0.35 + T * 0.9) + 0.1 * Math.sin(x * 0.8 - T * 1.3);
const ftGrp = new THREE.Group();
ftGrp.position.copy(FT);
world.add(ftGrp);
extras.push(ftGrp);
const ftLit = (hex, o = {}) => new THREE.ShaderMaterial({
  uniforms: { col: { value: new THREE.Color(hex) }, shine: { value: o.shine ?? 0.25 } }, side: THREE.DoubleSide,
  vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform vec3 col; uniform float shine; varying vec3 vN; varying vec3 vW;
    void main(){ vec3 N = normalize(vN); vec3 Vd = normalize(cameraPosition - vW); if (dot(N, Vd) < 0.0) N = -N;
      vec3 Ld = normalize(vec3(0.3,1.0,0.6)); float diff = clamp(dot(N, Ld),0.,1.);
      float sp = pow(max(dot(reflect(-Ld, N), Vd),0.), 24.0);
      gl_FragColor = vec4(col*(0.52+0.62*diff) + vec3(1.0)*sp*shine, 1.0); }`,
});
{
  // 奥の壁：海面より上は空、下は深さで色が変わる水
  const wallM = new THREE.Mesh(new THREE.PlaneGeometry(1800, 800).translate(0, -150, 0), new THREE.ShaderMaterial({
    uniforms: { time: U.time },
    vertexShader: `varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float time; varying vec3 vL;
      void main(){ vec2 p = vL.xy; float surf = 0.2*sin(p.x*0.35+time*0.9) + 0.1*sin(p.x*0.8-time*1.3); vec3 c;
        if (p.y > surf) { c = mix(vec3(0.78,0.90,0.97), vec3(0.52,0.76,0.94), smoothstep(0.0, 50.0, p.y)); }
        else { float d = clamp(-p.y/70.0, 0.0, 1.0);
          c = mix(vec3(0.38,0.76,0.89), vec3(0.10,0.36,0.60), pow(d, 0.75));
          float ray = smoothstep(0.5, 1.0, sin(p.x*0.22 + p.y*0.07 + time*0.15)*sin(p.x*0.07 - time*0.05 + 1.0));
          c += vec3(0.10,0.12,0.10) * ray * (1.0 - d);
          c = mix(c, vec3(0.93,0.98,1.0), 0.6*smoothstep(0.7, 0.0, surf - p.y)); }
        gl_FragColor = vec4(c, 1.0); }`,
  }));
  wallM.position.z = -14;
  // 海底（砂）。上の面は y=-70 で平ら
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1800, 60, 26).translate(0, FT_BOT - 30, -1), new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vL; varying vec3 vN; void main(){ vL = position; vN = normal; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vL; varying vec3 vN; float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){ vec3 c;
        if (vN.y > 0.5) { float n = hash(floor(vL.xz*7.0)); float rip = 0.5+0.5*sin(vL.x*2.6 + sin(vL.z*1.1)*1.6);
          c = vec3(0.80,0.74,0.58)*(0.80+0.10*n+0.12*rip); c *= 0.78 + 0.22*smoothstep(-14.0, 12.0, vL.z); }
        else { c = mix(vec3(0.40,0.33,0.25), vec3(0.56,0.48,0.35), 0.5+0.5*sin(vL.y*1.5+sin(vL.x*0.3)*1.2)); }
        gl_FragColor = vec4(c,1.); }`,
  }));
  // 海面：上から見ると海の色、下から見ると明るい膜
  const top = new THREE.Mesh(new THREE.PlaneGeometry(1800, 26, 1, 1).rotateX(-Math.PI / 2).translate(0, 0, -1), new THREE.ShaderMaterial({
    uniforms: { time: U.time }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float time; varying vec3 vL;
      void main(){ float w = pow(abs(sin(vL.x*1.3+time)*sin(vL.z*1.7-time*0.8)), 4.0);
        if (gl_FrontFacing) gl_FragColor = vec4(mix(vec3(0.16,0.50,0.72), vec3(0.85,0.96,1.0), w*0.5), 0.96);
        else gl_FragColor = vec4(vec3(0.85,0.97,1.0), 0.28 + 0.3*w); }`,
  }));
  top.renderOrder = 9;
  ftGrp.add(wallM, bed, top);
}
// 水中のただよう粒（深さの感じを出す）
const ftSnow = (() => {
  const n = 1500, pos = new Float32Array(n * 3), ph = new Float32Array(n), r = rng(2311);
  for (let i = 0; i < n; i++) { pos[i * 3] = (r() - 0.5) * 70; pos[i * 3 + 1] = -r() * 70; pos[i * 3 + 2] = -9 + r() * 14; ph[i] = r() * 100; }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("ph", new THREE.BufferAttribute(ph, 1));
  const p = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { time: U.time, hpx: { value: H } }, transparent: true, depthWrite: false,
    vertexShader: `uniform float time; uniform float hpx; attribute float ph; varying float vA;
      void main(){ vec3 p = position; p.x += sin(time*0.25+ph)*0.25; p.y += sin(time*0.2+ph*1.7)*0.15; p.z += cos(time*0.22+ph)*0.2;
        vec4 mv = modelViewMatrix*vec4(p,1.); float s = 0.03 * projectionMatrix[1][1] * hpx * 0.5 / -mv.z;
        vA = clamp(s/1.5, 0.15, 1.0); gl_PointSize = clamp(s, 1.5, 9.0); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.1,d)*vA*0.5; gl_FragColor = vec4(vec3(0.92,0.98,1.0), a); }`,
  }));
  p.frustumCulled = false;
  p.renderOrder = 8;
  ftGrp.add(p);
  return p;
})();
// タナ（ねらう深さ）の緑の帯
const ftBand = new THREE.Mesh(new THREE.BoxGeometry(120, 1, 10), new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.22, depthWrite: false }));
ftBand.renderOrder = 7;
ftGrp.add(ftBand);
// 遊漁船（長さ約14m）。船体は断面をつないで作る
const ftBoat = new THREE.Group();
ftGrp.add(ftBoat);
const FT_MEN = [[0, 1.15], [3.3, 1.33], [-4.6, 1.15]];
{
  const N = 30, L = 14, pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, x = -L / 2 + L * u;
    const taper = u < 0.55 ? 1 : Math.pow(Math.cos(((u - 0.55) / 0.45) * Math.PI / 2), 0.7);
    const b = 1.8 * Math.max(taper, 0.03);
    const sheer = 1.15 + 0.8 * Math.pow(Math.max(0, (u - 0.5) / 0.5), 2);
    const keel = -0.7 + 1.5 * Math.pow(Math.max(0, (u - 0.7) / 0.3), 2);
    const mid = (sheer + keel) / 2 - 0.15;
    [[-b, sheer], [-b * 0.95, mid], [-b * 0.5, keel + 0.15], [0, keel], [b * 0.5, keel + 0.15], [b * 0.95, mid], [b, sheer]].forEach(([z, y]) => pos.push(x, y, z));
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < 6; j++) { const a = i * 7 + j, b2 = a + 7; idx.push(a, b2, a + 1, a + 1, b2, b2 + 1); }
  for (let i = 0; i < N; i++) { const a = i * 7, b2 = a + 7; idx.push(a, a + 6, b2, b2, a + 6, b2 + 6); }
  for (let j = 1; j < 6; j++) idx.push(0, j, j + 1);
  let g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g = g.toNonIndexed();
  g.computeVertexNormals();
  const hull = new THREE.Mesh(g, new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    vertexShader: `varying vec3 vL; varying vec3 vN; varying vec3 vW; void main(){ vL = position; vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `varying vec3 vL; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 N = normalize(vN); vec3 Vd = normalize(cameraPosition - vW); if (dot(N, Vd) < 0.0) N = -N;
        float u = (vL.x + 7.0)/14.0; float sheer = 1.15 + 0.8*pow(max(0.0,(u-0.5)/0.5), 2.0);
        vec3 c = vec3(0.96,0.97,0.98);
        if (vL.y < 0.08) c = vec3(0.62,0.20,0.17);
        else if (vL.y > sheer - 0.3 && vL.y < sheer - 0.06) c = vec3(0.13,0.38,0.66);
        if (abs(N.y) > 0.85 && vL.y > sheer - 0.03) c = vec3(0.80,0.83,0.85);
        float diff = clamp(dot(N, normalize(vec3(0.3,1.0,0.6))),0.,1.); gl_FragColor = vec4(c*(0.55+0.55*diff), 1.0); }`,
  }));
  const white = ftLit(0xf4f6f7), blue = ftLit(0x1f5fa8), dark = ftLit(0x1c2b3a, { shine: 0.6 }), gray = ftLit(0x8a949c);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.9, 2.2), white); cabin.position.set(-2.0, 1.15 + 0.95, 0);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.14, 2.6), blue); roof.position.set(-2.0, 1.15 + 1.97, 0);
  // 窓：船室の面から少し浮かせて、手前に描く（面が重なるとチラチラ点滅する。2026-11-12 オーナー指摘）
  dark.polygonOffset = true; dark.polygonOffsetFactor = -4; dark.polygonOffsetUnits = -4;
  const win = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.62, 2.34), dark); win.position.set(-1.9, 1.15 + 1.3, 0);
  const winF = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 1.8), dark); winF.position.set(-0.26, 1.15 + 1.3, 0);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8), gray); mast.position.set(-2.2, 1.15 + 2.75, 0);
  const radar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.2), white); radar.position.set(-2.2, 1.15 + 3.3, 0);
  // スパンカー（船尾の帆。船を風に立てる）
  const sMast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 8), gray); sMast.position.set(-6.4, 1.15 + 2.1, 0);
  const sh = new THREE.Shape(); sh.moveTo(0, 0.5); sh.lineTo(0, 4.0); sh.lineTo(1.9, 0.5); sh.closePath();
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(sh), ftLit(0xf2a45a)); sail.position.set(-6.35, 1.15, 0);
  // 手すり
  const rail = new THREE.Group();
  for (let i = 0; i < 9; i++) { const x = -6.2 + i * 1.35; if (x > -3.8 && x < -0.2) continue; const p0 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6), gray); p0.position.set(x, 1.15 + 0.35 + (x > 0 ? 0.8 * Math.pow(Math.max(0, ((x + 7) / 14 - 0.5) / 0.5), 2) : 0), 1.72); rail.add(p0); }
  ftBoat.add(hull, cabin, roof, win, winF, mast, radar, sMast, sail, rail);
  FT_MEN.forEach(([x, y], i) => { const m = mannequin(i === 0 ? 0x8f9aa6 : 0x7d8a96, true); m.scale.setScalar(0.9);
    const skin = ftLit(i === 1 ? 0xa9c0de : 0xc8d2dc), capM = ftLit(0x3a5a80), vestM = ftLit(0xff8a2a);
    m.children.forEach((ch) => { ch.material = ch === m.userData.vest ? vestM : ch.geometry.type === "SphereGeometry" && ch.geometry.parameters.thetaLength < 3 ? capM : skin; }); m.position.set(x + 1, y, 1.15); ftBoat.add(m); });
}
// 竿（3本。0 が主役）
const ftRods = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 1, 6).translate(0, 0.5, 0), ftLit(0x20262c, { shine: 0.5 })); world.add(m); extras.push(m); return m; });
const _ftUp = V(0, 1, 0);
function ftRodSet(m, a, b) { m.visible = true; m.position.copy(a); const dv = b.clone().sub(a); m.scale.set(1, dv.length(), 1); m.quaternion.setFromUnitVectors(_ftUp, dv.normalize()); }
// テンヤ（実物大：全長約20cm。原点＝重心、+x が頭）
const ftTenya = new THREE.Group();
world.add(ftTenya);
extras.push(ftTenya);
{
  const lead = ftLit(0xe4f4c4, { shine: 0.5 }), steel = ftLit(0xc3cad0, { shine: 0.9 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16).scale(0.036, 0.021, 0.017), lead); head.position.set(0.012, 0, 0);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.0125, 0.03, 16).rotateZ(-Math.PI / 2), lead); nose.position.set(0.052, -0.001, 0);
  ftTenya.add(head, nose);
  [-1, 1].forEach((sd) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 10, 8), new THREE.MeshBasicMaterial({ color: 0xd62828 })); e.position.set(0.032, 0.007, sd * 0.0135); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.0026, 8, 6), new THREE.MeshBasicMaterial({ color: 0x111111 })); pu.position.set(0.0335, 0.0072, sd * 0.0178); ftTenya.add(e, pu); });
  const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.165, 6).rotateZ(Math.PI / 2), steel); shank.position.set(-0.068, -0.004, 0);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0025, 6, 20, Math.PI * 1.17), steel); hook.position.set(-0.15, 0.02, 0); hook.rotation.z = Math.PI / 3;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0065, 0.0016, 6, 14), steel); ring.position.set(0, 0.027, 0);
  const baitM = new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vL; varying vec3 vN; void main(){ vL = position; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vL; varying vec3 vN; void main(){ vec3 c = mix(vec3(0.90,0.93,0.95), vec3(0.20,0.38,0.52), smoothstep(-0.002, 0.008, vL.y));
      c = mix(c, vec3(0.1), smoothstep(0.004, 0.003, length(vec2(vL.x - 0.05, vL.y - 0.003))) * step(0.0, abs(vL.z)));
      float diff = clamp(dot(normalize(vN), normalize(vec3(0.3,1.0,0.6))),0.,1.); gl_FragColor = vec4(c*(0.6+0.55*diff), 1.0); }`,
  });
  const bait = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 12).scale(0.068, 0.0135, 0.0085), baitM); bait.position.set(-0.075, 0.0125, 0);
  const ts = new THREE.Shape(); ts.moveTo(0, 0); ts.lineTo(-0.024, 0.015); ts.lineTo(-0.018, 0); ts.lineTo(-0.024, -0.015); ts.closePath();
  const tail = new THREE.Mesh(new THREE.ShapeGeometry(ts), ftLit(0x6f8796)); tail.position.set(-0.139, 0.0125, 0);
  ftTenya.add(shank, hook, ring, bait, tail);
  for (let i = 0; i < 6; i++) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.0125, 0.0011, 5, 14).rotateY(Math.PI / 2), ftLit(0xd9a441, { shine: 0.7 })); w.position.set(-0.03 - i * 0.019, 0.0075, 0); w.scale.set(1, 1.25, 0.9); w.rotation.z = 0.25; ftTenya.add(w); }
}
// ジグ（センターバランス＝青、リアバランス＝ピンク）。モデルの長さ 1.6 → 15cm
// 2026-11-12 オーナー「鉛の塊に見える」→ 実物の比率（長さ17cm・幅約2.6cm・厚み約1.3cm）の細身で平たい体、
// 銀の腹（鏡のような反射）とホログラムの鱗、色の背、金の目、リング・アシストフック（短い糸の先のハリ2本）
function jigRealMat(back) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, back: { value: new THREE.Color(back) } },
    side: THREE.DoubleSide,
    vertexShader: `varying vec3 vW; varying vec3 vN; varying vec3 vL; void main(){ vL = position; vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 back; uniform float time; ${FOG_GLSL} varying vec3 vW; varying vec3 vN; varying vec3 vL;
      void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); if (dot(N, V) < 0.0) N = -N; vec3 R = reflect(-V, N);
        float side = smoothstep(0.015, 0.06, vL.x);
        vec3 env = mix(vec3(0.30,0.52,0.62), vec3(1.0,1.0,1.0), smoothstep(-0.35, 0.75, R.y));
        vec2 uv = vec2(vL.y*26.0, vL.z*70.0 + vL.x*18.0); vec2 id = floor(uv);
        float h = fract(sin(dot(id, vec2(12.9898,78.233)))*43758.5453);
        vec3 holoC = 0.5 + 0.5*cos(6.28*(vec3(0.0,0.33,0.67) + h + dot(R, vec3(1.0,0.6,0.3))*1.3));
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 silver = env*1.05 + holoC*0.38*(0.4 + 0.6*h);
        vec3 col = back*(0.75 + 0.6*env.b) + holoC*0.18 + env*0.15;
        vec3 c = mix(silver, col, side);
        c += vec3(1.0)*pow(max(dot(R, normalize(vec3(0.2,1.0,0.3))), 0.0), 70.0)*2.2 + env*fres*0.35;
        gl_FragColor = vec4(underwater(c, vW, distance(cameraPosition, vW)), 1.0); }`,
  });
}
function makeJigReal(back) {
  const g = new THREE.Group();
  const prof = [];
  for (let i = 0; i <= 40; i++) {
    const f = i / 40; // 0=尾 1=頭
    const r = 0.02 + 0.13 * Math.pow(Math.sin(Math.PI * Math.pow(f, 0.9)), 0.8) - 0.012 * Math.max(0, f - 0.93) / 0.07;
    prof.push(new THREE.Vector2(Math.max(0.006, r), (f - 0.5) * 1.6));
  }
  const geo = new THREE.LatheGeometry(prof, 28);
  geo.scale(1, 1, 0.48); // 平たい（厚みは幅の半分）
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, jigRealMat(back));
  const gold = shadedMat(0xe8b923, { rough: 0.2 }), black = new THREE.MeshBasicMaterial({ color: 0x0a0a0a }), steel = shadedMat(0x9aa3ab, { rough: 0.08 });
  [-1, 1].forEach((sd) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 10), gold); e.scale.set(1, 1, 0.35); e.position.set(0.012, 0.58, sd * 0.052);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), black); pu.scale.set(1, 1, 0.4); pu.position.set(0.012, 0.58, sd * 0.064);
    g.add(e, pu);
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 8, 18), steel); ring.position.set(0, 0.86, 0); ring.rotation.y = Math.PI / 2;
  const split = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 8, 18), steel); split.position.set(0, 0.93, 0);
  g.add(body, ring, split);
  // アシストフック：リングから短い糸（約3cm）で2本、ジグの横に垂れる
  [-1, 1].forEach((sd) => {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 6), shadedMat(0xe9e3c9, { rough: 0.7 }));
    cord.position.set(sd * 0.03, 0.78, 0); cord.rotation.z = sd * 0.25;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.009, 6, 18, Math.PI * 1.35), steel);
    hook.position.set(sd * 0.075, 0.6, 0); hook.rotation.set(0, 0, sd > 0 ? -2.2 : 0.9);
    g.add(cord, hook);
  });
  g.rotation.z = -Math.PI / 2;
  const p = new THREE.Group();
  p.add(g);
  world.add(p);
  extras.push(p);
  return p;
}
// 比べるときも同じ形・同じ重さ（色だけ変える）
const ftJigC = makeJigReal(0x1a5fe0), ftJigR = makeJigReal(0xe0307a);
const FT_JIG_U = 0.15 / 1.6;
// タチウオ（板の長さ 1.05m のうち魚は約1m）
const ftTachi = school("タチウオ", 30, 1.0, 2301, { amp: 0.035, freq: 3.5 });
world.add(ftTachi);
extras.push(ftTachi);
const ftHero = [0, 1, 2].map(() => { const m = fishMesh("タチウオ", 1.05, { amp: 0.035, freq: 4 }); world.add(m); extras.push(m); return m; });
// 砂の上の影（魚が海底から浮いているのがわかるように）
const ftShadow = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2a2416, transparent: true, opacity: 0.26, depthWrite: false }), 40);
ftShadow.frustumCulled = false;
ftShadow.renderOrder = 6;
world.add(ftShadow);
extras.push(ftShadow);
let ftShadowN = 0;
function ftShade(x, z, h, len) {
  if (ftShadowN >= 40) return;
  const k = clamp01(1.25 - h / 7);
  _p.copy(FTp(x, FT_BOT + 0.02, z)); _q.identity(); _s.set(0.34 * len * k, 1, 0.13 * len * k);
  _m.compose(_p, _q, _s);
  ftShadow.setMatrixAt(ftShadowN++, _m);
}
const ftClear = (low) => { if (typeof window !== "undefined") window.__ftClear = Math.min(window.__ftClear ?? 99, low - FT_BOT); };
// 群れ：立ち泳ぎ（頭が上）。下端が海底より 0.3m 以上、上になるように置く
function ftSchoolPlace(T, o = {}) {
  const { cx = 0, y0 = FT_BOT + 1.9, y1 = FT_BOT + 6.8, sx = 8, sz = 1.6, sc = 1, n = 30, zc = FT_LZ - 3.2 } = o;
  ftTachi.visible = true;
  const off = ftTachi.userData.off;
  for (let i = 0; i < off.length; i++) {
    const q = off[i];
    if (i >= n) { _m.makeScale(0, 0, 0); ftTachi.setMatrixAt(i, _m); continue; }
    const s = sc * q.s, half = 0.5 * s + 0.05;
    let y = lerp(y0, y1, 0.5 + 0.5 * q.y) + Math.sin(T * 0.5 * q.w + q.p) * 0.2 * sc;
    y = Math.max(y, FT_BOT + half + 0.9 * Math.min(sc, 2));
    ftClear(y - half);
    const fx = cx + q.x * sx + Math.sin(T * 0.2 * q.w + q.p) * 0.4 * sc, fz = zc + q.z * sz;
    ftShade(fx, fz, y - half - FT_BOT, s);
    _p.copy(FTp(fx, y, fz));
    _e2.set(0, q.p > 3.14 ? Math.PI : 0, Math.PI / 2 - 0.12 + Math.sin(T * 0.4 + q.p) * 0.06);
    _q.setFromEuler(_e2);
    _s.setScalar(s);
    _m.compose(_p, _q, _s);
    ftTachi.setMatrixAt(i, _m);
  }
  ftTachi.instanceMatrix.needsUpdate = true;
}
// 主役の魚：頭の位置 (hx,hy) と体の向き ang（頭の向き）で置く
function ftHeroAt(i, hx, hy, ang, dz = -0.06) {
  const m = ftHero[i], len = 1.0;
  const cx = hx - Math.cos(ang) * len * 0.5;
  let cy = hy - Math.sin(ang) * len * 0.5;
  let low = cy - Math.abs(Math.sin(ang)) * len * 0.5 - 0.1 * Math.abs(Math.cos(ang)) - 0.05;
  if (low < FT_BOT + 0.5) { cy += FT_BOT + 0.5 - low; low = FT_BOT + 0.5; }
  ftClear(low);
  ftShade(cx, FT_LZ + dz, low - FT_BOT, len);
  m.visible = true;
  m.position.copy(FTp(cx, cy, FT_LZ + dz));
  m.rotation.set(0, 0, ang);
  return [hx, cy + Math.sin(ang) * len * 0.5];
}
function ftPut(obj, x, y, th, sc = 1, off = 0) { obj.visible = true; obj.position.copy(FTp(x + Math.cos(th) * off, y + Math.sin(th) * off, FT_LZ)); obj.rotation.set(0, 0, th); obj.scale.setScalar(sc); }
let ftPend = [];
function ftBase() { base(0); U.under.value = 0; ftGrp.visible = true; ftBand.visible = false; ftBoat.visible = true; ftPend = []; ftShadowN = 0; }
// カメラを決めたあとに呼ぶ：糸・軌跡（画面の上に描く線）と影
function ftFlush() { ftPend.forEach((f) => f()); ftPend = []; ftShadow.count = ftShadowN; ftShadow.visible = ftShadowN > 0; ftShadow.instanceMatrix.needsUpdate = true; }
const _ftF = V(0, 0, 0);
// 糸：カメラの後ろに回る部分は切って描く
function ftSeg(p0, p1, col, w, dash = "") {
  camera.getWorldDirection(_ftF);
  const d0 = p0.clone().sub(camera.position).dot(_ftF), d1 = p1.clone().sub(camera.position).dot(_ftF);
  if (d0 < 0.3 && d1 < 0.3) return;
  let a = p0, b = p1;
  if (d0 < 0.3) a = p1.clone().lerp(p0, ((d1 - 0.3) / (d1 - d0)) * 0.98);
  if (d1 < 0.3) b = p0.clone().lerp(p1, ((d0 - 0.3) / (d0 - d1)) * 0.98);
  pathLine([a, b], col, 1, w, dash);
}
function ftTrail(sim, ts, span, ox = 0, col = "#ffd39a", dots = false) {
  const n = 48, q = [];
  for (let i = 0; i <= n; i++) { const tt = ts - span * (1 - i / n); if (tt < 0) continue; const a = sim.at(tt), p = project(FTp(a[0] + ox, a[1], FT_LZ)); if (!p.behind) q.push(p); }
  if (q.length > 2 && dots) {
    // 点線：糸（オレンジの実線）と見分けられるように、水色の点で描く（2026-11-12 オーナー）
    lines += `<polyline points="${q.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}" fill="none" stroke="${col}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0.1 20" opacity="0.95"/>`;
  } else if (q.length > 2) lines += `<polyline points="${q.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity="0.62"/>`;
}
// 船・竿・糸・仕掛けを置く。o.obj：仕掛けのモデル、o.unit：モデルの縮尺、o.vis：見やすくする倍率、o.ox：横にずらす、o.th：向きを上書き
function ftRig(T, sim, ts, o = {}) {
  if (typeof ftHeroT !== "undefined") ftHeroT = T;
  const a = sim.at(ts), c0 = sim.ctl(ts), ox = o.ox ?? 0, vis = o.vis ?? 1, th = o.th ?? a[2];
  const bob = ftSurf(0, T) * 0.5;
  ftBoat.position.set(-1, bob, 0);
  ftBoat.rotation.z = Math.sin(T * 0.7) * 0.012;
  const tip = FTp(ox, FT_TIP + a[4] + bob, FT_LZ);
  if (o.rod !== false) ftRodSet(ftRods[o.rodI ?? 0], FTp(ox + 0.05, 2.25 + bob, 1.45), tip);
  ftPut(o.obj, a[0] + ox, a[1], th, vis * (o.unit ?? 1), (o.off ?? 0) * vis);
  const c = Math.cos(th), s = Math.sin(th), e = sim.body.eye;
  const eye = FTp(a[0] + ox + (e[0] * c - e[1] * s) * vis, a[1] + (e[0] * s + e[1] * c) * vis, FT_LZ);
  ftPend.push(() => { if (o.trail) ftTrail(sim, ts, o.trail, ox, o.trailDots ? "#8ff0ff" : undefined, !!o.trailDots); ftSeg(tip, eye, "#ffb45e", o.lw ?? 4, a[3] < 0.05 && !c0.free ? "10 12" : ""); });
  return { a, c0, tip, eye, x: a[0] + ox, y: a[1], th, T: a[3] };
}
// ほかの釣り人の竿と糸（見た目だけ）
function ftOthers(T, depth = -66) {
  const bob = ftSurf(0, T) * 0.5;
  [[3.3, 1.33], [-4.6, 1.15]].forEach(([x, y], i) => {
    const tip = FTp(x + 0.2, FT_TIP + 0.1 + bob, FT_LZ);
    ftRodSet(ftRods[i + 1], FTp(x + 0.05, y + 1.1 + bob, 1.45), tip);
    ftPend.push(() => ftSeg(tip, FTp(x + 0.2, depth + i * 1.5, FT_LZ), "#ffd9a8", 2));
  });
}
function ftSmooth(sim, ts, w = 0.45) { let x = 0, y = 0; for (let i = 0; i < 7; i++) { const a = sim.at(Math.max(0, ts + (i / 6 - 0.5) * 2 * w)); x += a[0]; y += a[1]; } return [x / 7, y / 7]; }
// 主役の魚が仕掛けの横に並び、止まると口を寄せる（イメージ）
function ftFollow(i, st, sim, ts, T, o = {}) {
  const side = o.side ?? -1, b = sim.at(Math.max(0, ts - (o.lag ?? 0.45))), c0 = st.c0;
  const near = o.near ?? (c0.kind === "wait" && !c0.free ? ease((ts - c0.t0) / 1.8) : 0);
  const bx = st.x - 0.085 * Math.cos(st.th), by = st.y - 0.085 * Math.sin(st.th) + 0.012;
  const gap = lerp(o.far ?? 0.7, 0.03, near) - (near > 0.97 && o.nibble ? Math.max(0, Math.sin(T * 9)) * 0.03 : 0);
  const hx = lerp(b[0] - 0.085, bx, 0.4 + 0.6 * near) + side * gap, hy = lerp(b[1], by, near) - (1 - near) * (o.below ?? 0.2);
  return ftHeroAt(i, hx, hy, Math.PI / 2 + side * lerp(0.1, 0.5, near) + Math.sin(T * 1.3 + i) * 0.04, o.dz ?? -0.06);
}

// ---------- 画面の部品 ----------
// 全体図（左上）：船と海の断面。オレンジの点＝いまの仕掛けの深さ、緑＝タナ
function ftMini(depth, a = 1, tana = true) {
  if (a <= 0.01) return;
  const P = PORTRAIT, y = 40 + (clamp01(depth / 70)) * 224;
  html += `<div style="position:absolute;left:${P ? 40 : 70}px;top:${P ? 230 : 140}px;width:${P ? 190 : 200}px;opacity:${a};background:rgba(255,255,255,.93);border-radius:22px;padding:10px 10px 8px;box-shadow:0 6px 18px rgba(0,0,0,.3)">
    <div style="font-size:22px;font-weight:900;color:#10345a;margin:0 0 2px 6px">全体図</div>
    <svg viewBox="0 0 180 290" width="100%"><defs><linearGradient id="ftg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6cc4e4"/><stop offset="1" stop-color="#1c5a8e"/></linearGradient></defs>
    <rect x="0" y="0" width="180" height="40" fill="#cfe8f6"/><rect x="0" y="40" width="180" height="226" fill="url(#ftg)"/><rect x="0" y="264" width="180" height="26" fill="#b9a67c"/>
    <path d="M40 40 L122 40 L132 27 L46 27 Z" fill="#fff" stroke="#10345a" stroke-width="2"/><rect x="62" y="14" width="30" height="13" fill="#2f6fb0"/>
    ${tana ? `<rect x="0" y="230" width="180" height="32" fill="#2ecc71" opacity=".5"/><text x="8" y="252" font-size="17" font-weight="900" fill="#fff">タナ</text>` : ""}
    <line x1="112" y1="30" x2="112" y2="${y}" stroke="#ffb45e" stroke-width="3"/><circle cx="112" cy="${y}" r="8" fill="#ffb45e" stroke="#fff" stroke-width="3"/>
    ${[0, 35, 70].map((m) => `<text x="174" y="${54 + (m / 70) * 204}" text-anchor="end" font-size="15" font-weight="800" fill="#fff">${m}m</text>`).join("")}</svg>
    <div style="text-align:center;font-size:24px;font-weight:900;color:#10345a">水深 <span style="color:#c2410c">${depth.toFixed(0)}m</span></div></div>`;
}
// 竿とリール（右上）：いまの操作と、糸の張り（計算した値）
function ftCtl(st, a = 1, mode0) {
  if (a <= 0.01) return;
  const P = PORTRAIT, c0 = st.c0;
  const mode = mode0 || (c0.free ? ["落とす", "#1f6fd1"] : c0.kind === "up" || c0.kind === "down" ? ["しゃくる", "#e3412b"] : c0.turning ? ["巻く", "#e08a2a"] : ["止める", "#2a9d5c"]);
  const lift = st.a[4], bend = clamp01(st.T / 9), ang = (st.a[5] / FT_TURN) * 360;
  const ty = 60 - lift * 70 + bend * 36;
  html += `<div style="position:absolute;${P ? "right:40px;top:230px;width:400px" : "right:60px;top:240px;width:360px"};opacity:${a};background:rgba(255,255,255,.94);border-radius:22px;padding:12px 16px;box-shadow:0 6px 18px rgba(0,0,0,.3);color:#10345a">
    <div style="display:flex;align-items:center"><b style="font-size:22px">竿とリール</b><span style="margin-left:auto;background:${mode[1]};color:#fff;font-weight:900;font-size:30px;padding:2px 18px;border-radius:12px">${mode[0]}</span></div>
    <svg viewBox="0 0 330 124" width="100%"><path d="M18 100 Q 110 ${96 - lift * 46} 262 ${ty}" fill="none" stroke="#20262c" stroke-width="6" stroke-linecap="round"/>
      <line x1="262" y1="${ty}" x2="262" y2="124" stroke="#ffb45e" stroke-width="3.5" ${st.T < 0.05 ? 'stroke-dasharray="5 6"' : ""}/>
      <circle cx="62" cy="103" r="15" fill="#5a646c"/><g transform="rotate(${ang.toFixed(1)} 62 103)"><line x1="62" y1="103" x2="62" y2="79" stroke="#111" stroke-width="5"/><circle cx="62" cy="77" r="6.5" fill="#e3412b"/></g></svg>
    <div style="display:flex;align-items:center;gap:8px;font-size:20px;font-weight:800"><span>糸の張り</span><div style="flex:1;height:14px;background:#e6edf3;border-radius:7px;overflow:hidden"><div style="width:${(clamp01(st.T / 8) * 100).toFixed(1)}%;height:100%;background:#ffb45e"></div></div></div></div>`;
}
// 仕掛けの高さのグラフ（右。横画面だけ）。緑の帯＝止めている間
function ftGraph(sim, ts, win, a = 1, title = "仕掛けの高さ（計算）") {
  if (PORTRAIT || a <= 0.01) return;
  const W0 = 330, H0 = 150, n = 110, ys = [];
  let y0 = 1e9, y1 = -1e9;
  for (let i = 0; i <= n; i++) { const v = sim.at((win * i) / n)[1]; ys.push(v); y0 = Math.min(y0, v); y1 = Math.max(y1, v); }
  if (y1 - y0 < 0.5) y1 = y0 + 0.5;
  const X = (i) => 8 + ((W0 - 16) * i) / n, Y = (v) => H0 - 10 - ((H0 - 24) * (v - y0)) / (y1 - y0);
  const m = Math.floor(clamp01(ts / win) * n);
  let stops = "";
  for (let i = 0; i < n; i++) { const c = sim.ctl((win * (i + 0.5)) / n); if (c.kind === "wait" && !c.fish) stops += `<rect x="${X(i).toFixed(1)}" y="6" width="${((W0 - 16) / n + 0.5).toFixed(1)}" height="${H0 - 12}" fill="#2ecc71" opacity=".2"/>`; }
  html += `<div style="position:absolute;right:60px;top:500px;width:360px;opacity:${a};background:rgba(255,255,255,.94);border-radius:22px;padding:12px 16px;box-shadow:0 6px 18px rgba(0,0,0,.3);color:#10345a"><b style="font-size:22px">${title}</b>
    <svg viewBox="0 0 ${W0} ${H0}" width="100%">${stops}<polyline points="${ys.slice(0, m + 1).map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}" fill="none" stroke="#e08a2a" stroke-width="4" stroke-linejoin="round"/><circle cx="${X(m)}" cy="${Y(ys[m])}" r="6" fill="#e08a2a" stroke="#fff" stroke-width="2"/></svg>
    <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:800;color:#3a5a78"><span>時間 →</span><span><i style="display:inline-block;width:14px;height:14px;background:#2ecc71;opacity:.5;margin-right:4px"></i>止めている間</span></div></div>`;
}
function ftChip(txt, col, a = 1, top) {
  if (a <= 0.01) return;
  html += `<div style="position:absolute;left:0;right:0;top:${top ?? (PORTRAIT ? 620 : 128)}px;text-align:center;opacity:${a}"><span style="display:inline-block;background:${col};color:#fff;font-weight:900;font-size:${PORTRAIT ? 50 : 46}px;padding:6px 30px;border-radius:18px;box-shadow:0 6px 18px rgba(0,0,0,.35)">${txt}</span></div>`;
}
const ftNote = (txt = "仕掛けの動きは簡単な物理モデルの計算（重さ・水の抵抗・糸の張り）。魚の動きはイメージ") => { html += `<div style="position:absolute;${PORTRAIT ? "left:40px;right:40px;top:1300px" : "left:70px;bottom:196px"};color:#eaf6ff;font-size:${PORTRAIT ? 23 : 22}px;font-weight:800;text-shadow:0 2px 6px #000,0 0 3px #000">※${txt}</div>`; };
const FT_LEG = [["#ffb45e", "糸と仕掛けの動き"], ["#2ecc71", "ねらう深さ（タナ）"]];
// 魚探の画面（イメージ）
function ftFinder(T, a = 1) {
  if (a <= 0.01) return;
  const P = PORTRAIT, r = rng(77);
  let blobs = "";
  for (let i = 0; i < 46; i++) { const x = r() * 200, y = 172 + r() * 42, sz = 3 + r() * 6; blobs += `<ellipse cx="${((x + T * 5) % 200).toFixed(1)}" cy="${y.toFixed(1)}" rx="${sz.toFixed(1)}" ry="${(sz * 0.6).toFixed(1)}" fill="${r() < 0.35 ? "#ff5a36" : "#ffd23c"}" opacity="${(0.55 + r() * 0.4).toFixed(2)}"/>`; }
  html += `<div style="position:absolute;left:${P ? 40 : 70}px;top:${P ? 230 : 140}px;width:${P ? 330 : 340}px;opacity:${a};background:#10202e;border:5px solid #c8d2da;border-radius:18px;padding:8px 10px;box-shadow:0 6px 18px rgba(0,0,0,.4)">
    <div style="color:#bfe6ea;font-size:21px;font-weight:900">魚探の画面（イメージ）</div>
    <svg viewBox="0 0 200 250" width="100%"><rect width="200" height="250" fill="#0b3a66"/>${blobs}<rect y="222" width="200" height="28" fill="#b3402a"/><rect y="218" width="200" height="6" fill="#ffd23c"/>
    ${[0, 35, 70].map((m) => `<text x="196" y="${16 + (m / 70) * 196}" text-anchor="end" font-size="13" fill="#fff" font-weight="800">${m}m</text>`).join("")}
    <rect x="3" y="166" width="150" height="52" fill="none" stroke="#2ecc71" stroke-width="3.5" stroke-dasharray="7 4"/><text x="6" y="158" font-size="15" font-weight="900" fill="#2ecc71">魚の反応 ＝ タナ</text></svg></div>`;
}
const ftWide = (t = 0) => (PORTRAIT ? look(FTp(2 + Math.sin(t * 0.03), -30, 64), FTp(2, -33, 0), 50) : look(FTp(6 + Math.sin(t * 0.03) * 2, -37, 104), FTp(6, -40, 0), 50));
// 仕掛けを追うカメラ（near：手前までの距離）
function ftCam(sim, ts, near, o = {}) {
  const [sx, sy0] = ftSmooth(sim, ts), sy = Math.max(sy0 + (o.dy ?? 0), FT_BOT + (o.minY ?? 0.17 * near));
  look(FTp(sx + (o.ox ?? 0), sy + 0.08, FT_LZ + near * (PORTRAIT ? 1.32 : 1)), FTp(sx + (o.ox ?? 0), sy, FT_LZ), 50);
  ftFlush();
  return [sx, sy];
}
const ftThumbText = (s, w = 1050) => `<div style="position:absolute;left:0;top:0;bottom:0;width:${w}px;background:linear-gradient(90deg,rgba(2,14,28,.85),rgba(2,14,28,0))"></div><div style="position:absolute;left:70px;top:200px;color:#fff;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.7),0 0 3px #000"><span class="tag" style="font-size:54px">${s.tag}</span><div style="font-size:150px;line-height:1.1;margin-top:30px;-webkit-text-stroke:3px #06213a">${s.l1}<br><span style="color:#ffd166">${s.l2}</span></div></div>`;
const ftCard = (P, inner, a, posL, posP) => card(P ? posP[0] : posL[0], P ? posP[1] : posL[1], P ? posP[2] : posL[2], inner, a, "padding:20px 28px");

Object.assign(SHOTS, {
  ft_thumb(t, d, s) {
    ftBase();
    const sim = ftRun("sg"), T = 3, st = ftRig(T, sim, 5.4, { obj: ftTenya, lw: 6 });
    ftSchoolPlace(T, { cx: st.x + 1.5, n: 12, sx: 3.5, zc: FT_LZ - 2.4 });
    ftHeroAt(0, st.x - 0.13, st.y + 0.035, Math.PI / 2 - 0.5);
    ftHeroAt(1, st.x + 0.62, st.y + 0.3, Math.PI / 2 + 0.12, -0.45);
    look(FTp(st.x - 0.42, st.y - 0.02, FT_LZ + 0.86), FTp(st.x - 0.3, st.y - 0.06, FT_LZ), 50);
    ftFlush();
    if (s.clean) return;
    html += ftThumbText(s, 1000);
  },
  // つかみ：船から糸をたどって、水深70mの仕掛けまで潜る
  ft_hook(t, d, s) {
    ftBase();
    const P = PORTRAIT, T = t, sim = ftRun("sg"), ts = t;
    const st = ftRig(T, sim, ts, { obj: ftTenya, trail: 2.2 });
    ftOthers(T);
    ftSchoolPlace(T, { cx: st.x + 2, n: 14, sx: 5, zc: FT_LZ - 3.2 });
    ftFollow(0, st, sim, ts, T, { side: -1, nibble: true });
    ftFollow(1, st, sim, ts, T, { side: 1, far: 1.2, lag: 0.8, near: 0.15, dz: -0.5, below: 0.4 });
    const k = ease((t - 0.9) / 4.4), [sx, sy] = ftSmooth(sim, ts);
    const cx = lerp(-1, sx, k), cy = lerp(1.3, Math.max(sy - 0.15, FT_BOT + 0.4), k);
    look(FTp(cx, cy + lerp(1.6, 0.08, k), FT_LZ + lerp(P ? 31 : 24, P ? 2.5 : 1.9, k)), FTp(cx, cy, FT_LZ), 50);
    ftFlush();
    const a = P ? 1 : clamp01(t / 0.25), depth = Math.max(0, -cy);
    html += `<div style="position:absolute;left:0;right:0;top:0;height:${P ? 760 : 400}px;background:linear-gradient(rgba(2,14,28,.72),rgba(2,14,28,0))"></div>`;
    bigText(P ? 0 : 100, "船の下70m、<br>何が起きている？", "テンヤとジグの動きを計算で見える化", a);
    html += `<div style="position:absolute;${P ? "right:40px;top:860px" : "right:70px;top:430px"};background:rgba(6,22,42,.85);border:4px solid #ffb45e;border-radius:20px;padding:8px 24px;color:#fff;font-weight:900;font-size:${P ? 40 : 38}px;opacity:${clamp01((t - 0.6) / 0.4)}">水深 <span style="font-size:${P ? 84 : 80}px;color:#ffd166">${depth.toFixed(0)}</span> m</div>`;
    drawBar(s);
  },
  // どこで・いつ：k0 時期 → k1 水深と昼のタチウオ → k2 魚探とタナ
  ft_where(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 20, sim = ftRun("sg"), st = ftRig(T, sim, 3 + (t % 30), { obj: ftTenya, lw: 4 });
    ftOthers(T);
    ftSchoolPlace(T, { cx: 4, sc: 6, n: 20, sx: 24, y0: FT_BOT + 4, y1: FT_BOT + 10, zc: FT_LZ - 4, sz: 2 });
    ftWide(t);
    ftFlush();
    const q = project(FTp(st.x, st.y, FT_LZ));
    html += `<div style="position:absolute;left:${q.x}px;top:${q.y}px;width:26px;height:26px;transform:translate(-50%,-50%);border-radius:50%;background:#ffb45e;border:5px solid #fff;box-shadow:0 0 16px #ffb45e"></div>`;
    const t1 = t - (s._k1 ?? 99), t2 = t - (s._k2 ?? 99);
    if (k === 0) {
      const cell = (m) => `<div style="flex:1;text-align:center;padding:8px 0;font-size:24px;font-weight:900;border-radius:8px;margin:0 2px;background:${m >= 7 ? "#e08a2a" : m <= 3 ? "#f6d7a8" : "#e6edf3"};color:${m >= 7 ? "#fff" : "#10345a"}">${m}</div>`;
      html += ftCard(P, `<b style="font-size:36px">船で狙える時期</b><div style="display:flex;margin-top:12px">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(cell).join("")}</div><div style="font-size:28px;font-weight:900;margin-top:10px"><span style="color:#c2410c">7〜12月ごろ</span>　近年は3月ごろまで釣れることも</div>`, fadeIn(t, 0.4), [560, 150, 800], [60, 270, 880]);
    }
    if (k >= 1) {
      pathLine([FTp(-24, 0, FT_LZ), FTp(-24, FT_BOT, FT_LZ)], "#ffffff", 1, 3);
      [0, 10, 20, 30, 40, 50, 60, 70].forEach((m) => { const p = project(FTp(-24, -m, FT_LZ)); html += `<div style="position:absolute;left:${p.x - 12}px;top:${p.y}px;transform:translate(-100%,-50%);color:#fff;font-weight:900;font-size:${P ? 26 : 26}px;text-shadow:0 2px 6px #000;opacity:${fadeIn(t1, m / 70)}">${m}m</div>`; });
      label(FTp(10, FT_BOT + 6.5, FT_LZ), "昼のタチウオ", "基本的に底の近くにいる", fadeIn(t1, 2.2), "gold", P ? 60 : 300, P ? -260 : -170);
    }
    if (k === 1) html += ftCard(P, `<b style="font-size:34px">ポイントの例（大阪湾）</b><div style="font-size:34px;font-weight:900;margin-top:8px">神戸沖　<span style="color:#1f6fd1">水深70m前後</span></div><div style="font-size:34px;font-weight:900">洲本沖　<span style="color:#1f6fd1">水深100m前後</span></div>`, fadeIn(t1, 0.3), [820, 150, 650], [60, 270, 880]);
    if (k >= 2) {
      ftBand.visible = true;
      ftBand.position.set(4, FT_BOT + 6, FT_LZ - 3);
      ftBand.scale.set(1, 10, 1);
      ftBand.material.opacity = 0.26 * fadeIn(t2, 0.3);
      ftFinder(T, fadeIn(t2, 0.2));
      label(FTp(-6, FT_BOT + 6, FT_LZ), "タナ（ねらう深さ）", "船長が教えてくれる", fadeIn(t2, 0.5), "gold ans", P ? 40 : -60, P ? -330 : -260);
    }
    if (!P) legend(FT_LEG);
    ftNote("魚は大きく表示");
  },
  // テンヤとは：k0 つくり → k1 重さと糸
  ft_tenya(t, d, s, k) {
    ftBase();
    ftBoat.visible = false;
    const P = PORTRAIT;
    ftPut(ftTenya, 0, -30, 0, 1);
    ftTenya.rotation.y = Math.sin(t * 0.45) * 0.42;
    ftTenya.updateMatrixWorld(true);
    const Wp = (x, y, z = 0) => ftTenya.localToWorld(V(x, y, z));
    look(FTp(-0.045, -29.975, FT_LZ + (P ? 0.68 : 0.5)), FTp(-0.045, -30.0, FT_LZ), 50);
    ftFlush();
    ftSeg(FTp(0, -27, FT_LZ), Wp(0, 0.033), "#ffb45e", 5);
    label(Wp(0.03, 0.012), "オモリ（ヘッド）", "大きなハリと一体", fadeIn(t, 0.5), "gold", P ? 120 : 300, P ? -200 : -170);
    label(Wp(-0.17, 0.03), "大きなハリ", "", fadeIn(t, 1.4), "", P ? -80 : -300, P ? -200 : 130);
    label(Wp(-0.08, 0.002), "エサのイワシ", "細い針金で巻きつける", fadeIn(t, 2.3), "gold ans", P ? 0 : -80, P ? 300 : 250);
    if (k >= 1) html += ftCard(P, `<div style="font-size:40px;font-weight:900">重さは <span style="color:#c2410c;font-size:56px">40号（約150g）</span> が標準のことが多い</div><div style="font-size:30px;font-weight:800;margin-top:6px">船が決めた重さを使う　／　道糸はPE2号が目安</div>`, fadeIn(t - (s._k1 ?? 99), 0.2), [70, 140, 1000], [60, 270, 880]);
  },
  // 落とす：k0 沈み方 → k1 着底・糸ふけ・底を切る
  ft_fall(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 40, sim = ftRun("fall"), ts = t, L = sim.landed, land0 = sim.at(L)[0];
    const st = ftRig(T, sim, ts, { obj: ftTenya, trail: 1.5 });
    ftSchoolPlace(T, { cx: land0 + 5, n: 10, sx: 4, zc: FT_LZ - 4.2 });
    ftCam(sim, ts, 1.8);
    const here = FTp(st.x, st.y, FT_LZ), land = sim.at(L);
    if (ts < L - 0.3) label(here, "テンヤ", "頭を下にして沈む（計算）", fadeIn(t, 0.5), "gold", P ? 60 : 300, -170);
    const pf = ts - L;
    if (pf > 0 && pf < 1.5) {
      const p = project(FTp(land[0], FT_BOT + 0.03, FT_LZ)), R = (70 + pf * 190) * (P ? 0.8 : 1);
      html += `<div style="position:absolute;left:${p.x - R}px;top:${p.y - R * 0.5}px;width:${2 * R}px;height:${R}px;border-radius:50%;background:radial-gradient(ellipse at center, rgba(222,208,170,${(0.8 * (1 - pf / 1.5)).toFixed(2)}), rgba(222,208,170,0) 70%)"></div>`;
    }
    label(FTp(land[0], FT_BOT + 0.05, FT_LZ), "着底", "すぐに糸ふけを取る", fadeIn(ts, L + 0.1) * (1 - clamp01((ts - L - 2.6) / 0.4)), "gold ans", P ? 0 : 330, P ? -330 : -200);
    if (ts > L + 3.2) label(here, "底を切る", "底から少し上げて、誘い始める", fadeIn(ts, L + 3.3), "gold ans", P ? 0 : 180, P ? -330 : -200);
    if (k >= 1 && ts < L + 3) html += ftCard(P, `<b style="font-size:34px">糸ふけを出さないコツ</b><div style="font-size:30px;font-weight:900;margin-top:6px">スプールに<span style="color:#c2410c">軽く指を当てて</span>落とす</div>`, fadeIn(t - (s._k1 ?? 99), 0.2), [70, 600, 560], [60, 1010, 880]);
    ftMini(-st.y);
    ftCtl(st);
    if (!P) legend(FT_LEG);
    ftNote();
  },
  // 誘い①：ストップ＆ゴー。k0 動かして止める → k1 2回巻いて3〜8秒待つ → k2 竿先を下げない
  ft_sg(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 60, sim = ftRun("sg"), ts = t;
    const st = ftRig(T, sim, ts, { obj: ftTenya, trail: 2.6 });
    ftSchoolPlace(T, { cx: st.x + 2.5, n: 12, sx: 5, zc: FT_LZ - 3.4 });
    const h = ftFollow(0, st, sim, ts, T, { side: -1, nibble: true });
    ftFollow(1, st, sim, ts, T, { side: 1, far: 1.25, lag: 0.8, near: 0.15, dz: -0.55, below: 0.4 });
    ftCam(sim, ts, 1.75, { dy: -0.16 });
    if (ts < 1.5) ftChip("ストップ＆ゴー", "#10345a");
    else if (st.c0.turning) ftChip("巻く：ハンドル2回転", "#e08a2a");
    else ftChip("止める：3〜8秒 待つ", "#2a9d5c");
    if (k === 0) label(FTp(h[0], h[1] - 0.45, FT_LZ), "タチウオ", "立ち泳ぎでついてくる（イメージ）", fadeIn(t, 2.0), "", P ? -60 : -380, -40);
    if (k >= 2) html += ftCard(P, `<b style="font-size:36px">止めるとき、<span style="color:#c2410c">竿先を下げない</span></b><div style="font-size:26px;font-weight:800;margin-top:4px">計算でも、止めた直後に少しゆれてから止まる</div>`, fadeIn(t - (s._k2 ?? 99), 0.2), [70, 600, 640], [60, 1010, 880]);
    ftMini(-st.y);
    ftCtl(st);
    ftGraph(sim, ts, 24);
    if (!P) legend(FT_LEG);
    ftNote();
    drawBar(s);
  },
  // 誘い②：ジャーク＆ステイ
  ft_js(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 80, sim = ftRun("js"), ts = t;
    const st = ftRig(T, sim, ts, { obj: ftTenya, trail: 2.6 });
    ftSchoolPlace(T, { cx: st.x + 2.5, n: 12, sx: 5, zc: FT_LZ - 3.4 });
    ftFollow(0, st, sim, ts, T, { side: -1, nibble: true });
    ftCam(sim, ts, 1.75, { dy: -0.16 });
    if (ts < 1.2) ftChip("ジャーク＆ステイ", "#10345a");
    else if (st.c0.kind === "wait") ftChip("止める", "#2a9d5c");
    else ftChip("巻きながら、2〜3回しゃくる", "#e3412b");
    ftMini(-st.y);
    ftCtl(st);
    ftGraph(sim, ts, 22);
    if (!P) legend(FT_LEG);
    ftNote();
  },
  // 誘い③：ごくゆっくり巻く＋小さくしゃくる（上へ追わせる）
  ft_bs(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 100, sim = ftRun("bs"), ts = t;
    const st = ftRig(T, sim, ts, { obj: ftTenya, trail: 3.5 });
    ftSchoolPlace(T, { cx: st.x + 2.5, n: 12, sx: 5, zc: FT_LZ - 3.4 });
    ftFollow(0, st, sim, ts, T, { side: -1, near: 0.55, lag: 0.7, below: 0.3 });
    ftFollow(1, st, sim, ts, T, { side: 1, far: 1.1, lag: 1.1, near: 0.3, dz: -0.5, below: 0.45 });
    ftCam(sim, ts, 1.75, { dy: -0.16 });
    ftChip("ごくゆっくり巻く ＋ 小さくしゃくる", "#e08a2a");
    if (k >= 1) label(FTp(st.x, st.y + 0.05, FT_LZ), "少しずつ上へ動き続ける", "タチウオに上へ追わせる誘い（メーカーの解説）", fadeIn(t - (s._k1 ?? 99), 0.3), "gold ans", P ? 0 : -380, P ? -330 : 160);
    ftMini(-st.y);
    ftCtl(st);
    ftGraph(sim, ts, 22);
    if (!P) legend(FT_LEG);
    ftNote();
  },
  // アタリ①：コツン、コツン → はっきり出たら合わせる
  ft_nib(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 120, sim = ftRun("nib"), ts = t, mk = sim.marks, hooked = ts >= mk.hook + 0.25;
    const st = ftRig(T, sim, ts, { obj: ftTenya, trail: 2 });
    ftSchoolPlace(T, { cx: st.x + 2.5, n: 12, sx: 5, zc: FT_LZ - 3.4 });
    const bx = st.x - 0.085 * Math.cos(st.th), by = st.y - 0.085 * Math.sin(st.th) + 0.012;
    if (hooked) ftHeroAt(0, bx - 0.02, by, Math.PI / 2 - 0.5 + Math.sin(T * 13) * 0.22);
    else ftFollow(0, st, sim, ts, T, { side: -1, near: ts < 2.2 ? 0 : ease((ts - 2.2) / 1.4), nibble: true });
    ftCam(sim, ts, 1.75, { dy: -0.16 });
    const bl = (m) => ts >= m && ts < m + 0.7;
    if (bl(mk.n1) || bl(mk.n2)) ftChip("コツン…（少しずつかじる）", "#3a6ea5");
    else if (ts >= mk.hook && ts < mk.hook + 0.25) ftChip("はっきり出た！", "#e3412b");
    else if (hooked && ts < mk.hook + 3.5) ftChip("竿をあおって合わせる！", "#e3412b");
    else if (hooked) ftChip("掛かった", "#2a9d5c");
    ftMini(-st.y);
    ftCtl(st, 1, hooked ? (ts < mk.hook + 1.1 ? ["合わせる", "#e3412b"] : ["掛かった", "#2a9d5c"]) : null);
    if (!P) legend(FT_LEG);
    ftNote("魚が引く力は仮の値。魚の動きはイメージ");
  },
  // アタリ②：食い上げ。重さが消えたら、巻いてから合わせる
  ft_kui(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 140, sim = ftRun("kui"), ts = t, mk = sim.marks;
    const held = ts >= mk.bite, hooked = ts >= mk.hook;
    const st = ftRig(T, sim, ts, { obj: ftTenya, trail: 2.5, th: held && !hooked ? Math.PI / 2 - 0.25 : held ? 0.5 + Math.sin(T * 13) * 0.2 : undefined });
    ftSchoolPlace(T, { cx: st.x + 2.5, n: 12, sx: 5, zc: FT_LZ - 3.4 });
    if (!held) ftFollow(0, st, sim, ts, T, { side: -1, near: ease(ts / 0.9) });
    else ftHeroAt(0, st.x + 0.02, st.y + 0.02, hooked ? Math.PI / 2 - 0.45 + Math.sin(T * 13) * 0.22 : Math.PI / 2 - 0.12 + Math.sin(T * 5) * 0.06);
    ftCam(sim, ts, 1.9, { dy: -0.2 });
    if (ts >= mk.bite + 0.3 && ts < mk.reel) ftChip("急に重さが消えた ＝ 食い上げ", "#1f6fd1");
    else if (ts >= mk.reel && ts < mk.hook) ftChip("重さを感じるまで、素早く巻く", "#e08a2a");
    else if (hooked && ts < mk.hook + 3.5) ftChip("重さを感じたら、合わせる！", "#e3412b");
    else if (hooked) ftChip("掛かった", "#2a9d5c");
    if (held && ts < mk.reel + 0.4) label(FTp(st.x, st.y, FT_LZ), "くわえて上へ泳ぐ", "糸がゆるむ（イメージ）", fadeIn(ts, mk.bite + 0.4), "gold", P ? 0 : 340, P ? 330 : 150);
    ftMini(-st.y);
    ftCtl(st, 1, hooked ? (ts < mk.hook + 1.0 ? ["合わせる", "#e3412b"] : ["掛かった", "#2a9d5c"]) : null);
    if (!P) legend(FT_LEG);
    ftNote("魚が引く力は仮の値。魚の動きはイメージ");
  },
  // ジグ：k0 150g前後 → k1 ワンピッチジャーク（跳ね上がる → 横を向いてスライド）
  ft_jig(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 160, sim = ftRun("jig"), ts = t;
    const st = ftRig(T, sim, ts, { obj: ftJigC, unit: FT_JIG_U, trail: 2.4 });
    ftSchoolPlace(T, { cx: st.x + 2, n: 12, sx: 5, y0: FT_BOT + 1.2, y1: FT_BOT + 7.5, zc: FT_LZ - 3.4 });
    ftCam(sim, ts, 1.5);
    const c0 = st.c0, jerk = c0.kind === "up" || c0.kind === "down";
    if (c0.free) ftChip("フォール（落とす）", "#1f6fd1");
    else if (jerk) ftChip("ワンピッチ：1回しゃくって、1回巻く", "#e3412b");
    else ftChip("ジギング", "#10345a");
    if (k === 0) html += ftCard(P, `<div style="font-size:38px;font-weight:900">ジグは <span style="color:#c2410c;font-size:54px">150g前後</span> が多い</div><div style="font-size:26px;font-weight:800;margin-top:4px">東京湾・大阪湾の例</div>`, fadeIn(t, 0.6), [70, 600, 600], [60, 1010, 880]);
    if (k >= 1) {
      const a = fadeIn(t - (s._k1 ?? 99), 0.2), up = jerk && st.T > 0.5, sl = !c0.free && st.T < 0.05;
      const row = (on, n, h) => `<div style="display:flex;align-items:center;gap:14px;margin-top:10px;opacity:${on ? 1 : 0.5}"><b style="background:${on ? "#e08a2a" : "#8a96a3"};color:#fff;font-size:26px;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none">${n}</b><div style="font-size:${P ? 32 : 30}px;font-weight:900">${h}</div></div>`;
      html += ftCard(P, `<b style="font-size:24px;color:#3a5a78">計算したジグの動き</b>${row(up, 1, "しゃくる → 頭から跳ね上がる")}${row(sl, 2, "糸がゆるむ → 横を向いてスライド")}${row(c0.free, 3, "フォール → ゆれながら落ちる")}`, a, [70, 575, 600], [60, 960, 880]);
    }
    ftMini(-st.y, 1, false);
    ftCtl(st);
    if (!P) legend([FT_LEG[0]]);
    ftNote("ジグの動きは簡単な物理モデルの計算（重さ・水の抵抗・糸の張り）");
  },
  // ジグのフォール：落ちる間に食うことも多い
  ft_jigfall(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 180, sim = ftRun("jigfall"), ts = t, mk = sim.marks;
    const st = ftRig(T, sim, ts, { obj: ftJigC, unit: FT_JIG_U, trail: 2.4 });
    const yF = sim.at(mk.fall + 2.2)[1], near = clamp01(1 - Math.abs(st.y - yF) / 1.3) * (ts > mk.fall ? 1 : 0);
    ftSchoolPlace(T, { cx: st.x + 2, n: 12, sx: 5, y0: FT_BOT + 1.2, y1: FT_BOT + 7.5, zc: FT_LZ - 3.4 });
    const fol = st.y < yF ? (st.y - yF) * 0.75 : 0;
    const h = ftHeroAt(0, st.x - lerp(0.65, 0.1, near), yF + fol + 0.02, Math.PI / 2 - lerp(0.1, 0.55, near) + Math.sin(T * 1.3) * 0.04);
    ftHeroAt(1, st.x + 0.9, yF - 0.5, Math.PI / 2 + 0.12 + Math.sin(T * 1.1) * 0.04, -0.5);
    ftCam(sim, ts, 1.8, { dy: -0.12 });
    const c0 = st.c0;
    if (c0.free) ftChip("フォール（落とす）", "#1f6fd1");
    else if (c0.kind === "up" || c0.kind === "down") ftChip("ワンピッチジャーク", "#e3412b");
    if (ts > mk.fall + 1.6) label(FTp(h[0], h[1] - 0.3, FT_LZ), "フォール中に食うことも多い", "と言われます（魚の動きはイメージ）", fadeIn(ts, mk.fall + 1.7), "gold ans", P ? 0 : -150, P ? 330 : 280);
    ftMini(-st.y, 1, false);
    ftCtl(st);
    if (!P) legend([FT_LEG[0]]);
    ftNote("ジグの動きは簡単な物理モデルの計算。魚の動きはイメージ");
  },
  // クイズ：同じ150g。センターバランスとリアバランス、速く沈むのは？ k0 問い → k1 A・B → k2 答え（同時に落とす）→ k3 使い分け
  ft_quiz(t, d, s, k) {
    ftBase();
    ftBoat.visible = false;
    const P = PORTRAIT, T = t + 200, t2 = t - (s._k2 ?? 99), ts = clamp01(t2 * 0.3 / 2.6) * 2.6, VIS = 5, ox = P ? 1.0 : 1.5; // 落ちるところはスロー（約 1/3）
    const sC = ftRun("fallC"), sR = ftRun("fallR");
    const a = ftRig(T, sC, ts, { obj: ftJigC, unit: FT_JIG_U, vis: VIS, ox: -ox, rod: false, trail: 2.6, lw: 3 });
    const b = ftRig(T, sR, ts, { obj: ftJigR, unit: FT_JIG_U, vis: VIS, ox, rod: false, trail: 2.6, lw: 3, off: 0.03 });
    const cy = (ftSmooth(sC, ts)[1] + ftSmooth(sR, ts)[1]) / 2;
    look(FTp(0, cy + 0.3, FT_LZ + (P ? 10 : 7)), FTp(0, cy - 0.2, FT_LZ), 50);
    ftFlush();
    if (k >= 2) html += `<div class="slowtag" style="position:absolute;right:60px;top:120px;font-size:34px;font-weight:900;color:#fff;background:#e3412b;padding:6px 20px;border-radius:12px">スロー再生</div>`;
    // 落ちた深さの目盛り（1mごと）
    for (let m = Math.ceil(-30 - cy - 5); m <= Math.floor(-30 - cy + 6); m++) {
      if (m < 0) continue;
      const y = -30 - m, p0 = FTp(-(P ? 3.0 : 4.2), y, FT_LZ), p1 = FTp(P ? 3.0 : 4.2, y, FT_LZ);
      pathLine([p0, p1], "rgba(255,255,255,0.45)", 1, 2, "6 10");
      const p = project(p0);
      html += `<div style="position:absolute;left:${p.x - 10}px;top:${p.y}px;transform:translate(-100%,-50%);color:#fff;font-weight:900;font-size:26px;text-shadow:0 2px 6px #000">${m}m</div>`;
    }
    const pa = FTp(a.x, a.y, FT_LZ), pb = FTp(b.x, b.y, FT_LZ);
    if (k <= 1) {
      html += `<div style="position:absolute;left:0;right:0;top:0;height:${P ? 900 : 420}px;background:linear-gradient(rgba(2,14,28,.72),rgba(2,14,28,0))"></div>`;
      html += `<div class="big" style="top:${P ? 260 : 130}px;font-size:${P ? 70 : 64}px">クイズ　同じ150gのジグ<br><span style="color:#ffd166">速く沈むのはどっち？</span></div>`;
    }
    if (k >= 1) {
      const a1 = k === 1 ? fadeIn(t - (s._k1 ?? 0), 0.2) : 1, done = k >= 2 && ts > 1.3;
      label(pa, done ? "A：ひらひら、ゆっくり" : "A　センター", done ? "横を向いて、ゆれながら落ちる" : "重心がまん中", a1, done ? "gold" : "", P ? -90 : -300, P ? -170 : -110);
      label(pb, done ? "答え B：おしりから速く" : "B　リア", done ? "まっすぐ、すとんと落ちる" : "重心が後ろ", a1, done ? "gold ans" : "", P ? 90 : 340, P ? 230 : -70);
    }
    if (k >= 3) html += ftCard(P, `<b style="font-size:32px">使い分け（と言われます）</b><div style="font-size:32px;font-weight:900;margin-top:8px">速く沈めたい → <span style="color:#d0306a">後ろ重心</span></div><div style="font-size:32px;font-weight:900">ゆっくり見せたい → <span style="color:#1a4fd0">まん中</span></div>`, fadeIn(t - (s._k3 ?? 99), 0.2), [70, 600, 600], [60, 1010, 880]);
    ftNote("ジグは大きく表示。動きは簡単な物理モデルの計算（重心の位置だけを変えた）");
    drawBar(s);
  },
  // 安全：k0 歯 → k1 重さは船の指定・ライフジャケット
  ft_safe(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 220, sim = ftRun("sg");
    ftRig(T, sim, 3, { obj: ftTenya });
    ftOthers(T);
    if (P) look(FTp(-0.5, 5, 25), FTp(-0.5, 1.6, 0), 45);
    else look(FTp(1.0 + t * 0.06, 4.2, 15.5), FTp(-0.8, 1.7, 0), 45);
    ftFlush();
    const bob = ftSurf(0, T) * 0.5;
    if (k === 0) html += ftCard(P, `<b style="font-size:40px;color:#c2410c">タチウオの歯は、とても鋭い</b><div style="font-size:32px;font-weight:900;margin-top:8px">触れただけで切れることがある</div><div style="font-size:32px;font-weight:900">つかむときは<span style="color:#1f6fd1">フィッシュグリップ</span>で、頭のすぐ下を</div>`, fadeIn(t, 0.4), [70, 150, 880], [60, 270, 880]);
    if (k >= 1) {
      const a = fadeIn(t - (s._k1 ?? 99), 0.2);
      label(FTp(0, 1.15 + 1.2 + bob, 1.45), "ライフジャケット", "必ず着ける", a, "gold ans", P ? 0 : 420, P ? -330 : -230);
      html += ftCard(P, `<b style="font-size:38px">テンヤの重さは、<span style="color:#c2410c">船の指定</span>に合わせる</b><div style="font-size:28px;font-weight:800;margin-top:6px">釣り方は、船長の指示を聞く</div>`, a, [70, 150, 760], [60, 270, 880]);
    }
  },
  ft_sum(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 240, sim = ftRun("sg"), st = ftRig(T, sim, 3 + (t % 30), { obj: ftTenya });
    ftOthers(T);
    ftSchoolPlace(T, { cx: 4, sc: 6, n: 20, sx: 24, y0: FT_BOT + 4, y1: FT_BOT + 10, zc: FT_LZ - 4, sz: 2 });
    ftWide(t);
    ftFlush();
    html += acDim(0.5);
    const rows = [["タナ", "昼は底の近く", "船長が教えてくれる深さをねらう", "#2a9d5c"], ["誘い", "動かして、止める", "ストップ＆ゴー：2回巻いて、3〜8秒待つ", "#c2410c"], ["ジグ", "しゃくると跳ねて、横へスライド", "後ろ重心は速く沈む（計算）", "#1f6fd1"]];
    html += `<div class="big" style="top:${P ? 560 : 110}px;font-size:${P ? 66 : 64}px;opacity:${fadeIn(t, 0.1)}">船のタチウオ まとめ</div>`;
    rows.forEach(([a1, b1, c1, col], i) => {
      const a = fadeIn(t, 0.4 + i * 0.45);
      html += `<div class="card" style="left:${P ? 70 : 330}px;top:${(P ? 780 : 240) + i * (P ? 240 : 200)}px;width:${P ? 880 : 1200}px;padding:20px 30px;opacity:${a};transform:translateY(${(1 - a) * 30}px);display:flex;align-items:center;gap:26px"><b style="background:${col};color:#fff;font-size:${P ? 34 : 38}px;padding:10px 0;width:${P ? 200 : 220}px;text-align:center;border-radius:18px;flex:none">${a1}</b><div><div style="font-size:${P ? 40 : 46}px;font-weight:900">${b1}</div><div style="font-size:${P ? 27 : 30}px;color:#3a5a78">${c1}</div></div></div>`;
    });
  },
});

// =====================================================================
// 船の青物ジギング（cg-fune-aomono、ag_*）2026-11-12 船釣り 見える化シリーズ 第2回。ft_*（船のタチウオ）の部品を使う
// 参考：TSURI HACK「明石の船釣り・ジギング」（https://tsurihack.com/2683）：ハイシーズン7〜12月、ハマチ・メジロは6月中旬から、ブリは晩秋、
//   明石の主なポイントは最深で約70m、潮は通常3〜5ノット・大潮の最強時は約11ノット、底から5〜10mが勝負、スロージギングが主流
//   （ゆったりしゃくって潮に乗せ、フォールで食わせる。強くしゃくるとジグが浮いてタナを外れる）、底取りを最優先、ジグは60〜250gを潮や水深で使い分け
// 仕掛けの動きは ftSim の計算。潮の場面（ag_tide）だけは、沈む速さと流れの足し算の模式図（「模式図」と表示）
// =====================================================================
const AG_REP = FT_REP;
const AG_SOFT = [{ jerk: 0.35, up: 0.6, down: 0.8, turn: 0.7 }, { free: 0.5 }, { wait: 0.3 }];
Object.assign(FT_SEQ, {
  // 落とす → 着底 → 底から約6m巻き上げる → ゆったりしゃくる
  ag_main: { body: "jigC", opt: { y0: -55, th0: 1.5 }, seq: [{ free: 7 }, { wait: 0.6 }, { reel: 9, dur: 3.2 }, { wait: 0.6 }, ...AG_REP(8, AG_SOFT)] },
  ag_soft: { body: "jigC", opt: { y0: -63, th0: 1.5 }, seq: [{ wait: 1 }, ...AG_REP(8, AG_SOFT)] },
  ag_hard: { body: "jigC", opt: { y0: -63, th0: 1.5 }, seq: [{ wait: 1 }, ...AG_REP(12, [{ jerk: 0.7, up: 0.22, down: 0.35, turn: 1 }]), { wait: 9 }] },
  ag_bite: { body: "jigC", opt: { y0: -63, th0: 1.5 }, seq: [{ wait: 0.8 }, ...AG_REP(2, AG_SOFT), { jerk: 0.35, up: 0.6, down: 0.8, turn: 0.7 }, { mark: "fall" }, { free: 0.9 }, { mark: "bite" }, { free: 0.3, fish: [0.5, -5] }, { mark: "hook" }, { jerk: 0.6, up: 0.2, down: 0.6, fish: [0.5, -5] }, { wait: 8, fish: [0.3, -4] }] },
});
const AG_BAND = [FT_BOT + 5, FT_BOT + 10]; // 底から5〜10m
// ハマチ（板の長さ0.9）：横向きに泳ぐ。下端が海底より上になるように置く
const agSchool = school("ハマチ", 16, 0.9, 2401, { amp: 0.06, freq: 7 });
world.add(agSchool);
extras.push(agSchool);
const agHero = [0, 1].map(() => { const m = fishMesh("ハマチ", 0.9, { amp: 0.07, freq: 8 }); world.add(m); extras.push(m); return m; });
function agSchoolPlace(T, o = {}) {
  const { cx = 0, y0 = AG_BAND[0] + 0.5, y1 = AG_BAND[1] - 0.5, sx = 6, sz = 1.4, sc = 1, n = 16, zc = FT_LZ - 3.2 } = o;
  if (FK.ok) {
    // 写真から作った3Dモデル（ブリの仲間。ハマチ〜メジロの大きさ 50〜70cm）
    const off = agSchool.userData.off;
    for (let i = 0; i < Math.min(n, 14); i++) {
      const q = off[i], f = fkGet("buri", i, 50 + ((i * 37) % 20));
      const L = f.length * sc, dir = Math.sin(T * 0.12 + q.p) > 0 ? 1 : -1;
      let y = lerp(y0, y1, 0.5 + 0.5 * q.y) + Math.sin(T * 0.5 * q.w + q.p) * 0.2;
      y = Math.max(y, FT_BOT + 0.2 * L + 0.6);
      ftClear(y - 0.2 * L);
      const fx = cx + q.x * sx + Math.sin(T * 0.25 * q.w + q.p) * 1.2 * sc, fz = zc + q.z * sz;
      ftShade(fx, fz, y - 0.2 * L - FT_BOT, L);
      f.object.scale.setScalar(sc);
      fkPlace(f, FTp(fx, y, fz), dir > 0 ? 0 : Math.PI, Math.sin(T * 0.6 + q.p) * 0.05, T, { seed: q.p * 3, freq: 1.7, amp: 0.1 });
    }
    return;
  }
  agSchool.visible = true;
  const off = agSchool.userData.off;
  for (let i = 0; i < off.length; i++) {
    const q = off[i];
    if (i >= n) { _m.makeScale(0, 0, 0); agSchool.setMatrixAt(i, _m); continue; }
    const s = sc * q.s, dir = Math.sin(T * 0.12 + q.p) > 0 ? 1 : -1;
    let y = lerp(y0, y1, 0.5 + 0.5 * q.y) + Math.sin(T * 0.5 * q.w + q.p) * 0.2;
    y = Math.max(y, FT_BOT + 0.3 * s + 0.6);
    ftClear(y - 0.3 * s);
    const fx = cx + q.x * sx + Math.sin(T * 0.25 * q.w + q.p) * 1.2 * sc, fz = zc + q.z * sz;
    ftShade(fx, fz, y - 0.3 * s - FT_BOT, s);
    _p.copy(FTp(fx, y, fz));
    _q.setFromEuler(_e2.set(0, dir > 0 ? 0 : Math.PI, Math.sin(T * 0.6 + q.p) * 0.06));
    _s.setScalar(s);
    _m.compose(_p, _q, _s);
    agSchool.setMatrixAt(i, _m);
  }
  agSchool.instanceMatrix.needsUpdate = true;
}
// 主役のハマチ：頭の位置と向き（ang：0 で右向き）
function agHeroAt(i, hx, hy, ang, dz = -0.08, len = 0.9) {
  if (FK.ok) {
    const f = fkGet("buri", 20 + i, 70);
    const L = f.length, cx = hx - Math.cos(ang) * L * 0.5;
    let cy = hy - Math.sin(ang) * L * 0.5;
    let low = cy - Math.abs(Math.sin(ang)) * L * 0.5 - 0.13 * L * Math.abs(Math.cos(ang));
    if (low < FT_BOT + 0.5) { cy += FT_BOT + 0.5 - low; low = FT_BOT + 0.5; }
    ftClear(low);
    ftShade(cx, FT_LZ + dz, low - FT_BOT, L);
    const right = Math.cos(ang) >= 0;
    fkPlace(f, FTp(cx, cy, FT_LZ + dz), right ? 0 : Math.PI, right ? ang : Math.PI - ang, (ftHeroT ?? 0) + i, { freq: 2.2, amp: 0.12 });
    return [hx, hy];
  }
  const m = agHero[i];
  const cx = hx - Math.cos(ang) * len * 0.5;
  let cy = hy - Math.sin(ang) * len * 0.5;
  let low = cy - Math.abs(Math.sin(ang)) * len * 0.5 - 0.17 * len * Math.abs(Math.cos(ang));
  if (low < FT_BOT + 0.5) { cy += FT_BOT + 0.5 - low; low = FT_BOT + 0.5; }
  ftClear(low);
  ftShade(cx, FT_LZ + dz, low - FT_BOT, len);
  m.visible = true;
  m.position.copy(FTp(cx, cy, FT_LZ + dz));
  m.rotation.set(0, Math.abs(ang) > Math.PI / 2 ? Math.PI : 0, Math.abs(ang) > Math.PI / 2 ? Math.PI - ang : ang);
  return [hx, hy];
}
let ftHeroT = 0; // 主役の魚の尾の動きの時刻（ショットの初めに T を入れる）
// タナの帯（底から5〜10m）
function agBand(a = 1) {
  ftBand.visible = a > 0.01;
  ftBand.position.set(4, (AG_BAND[0] + AG_BAND[1]) / 2, FT_LZ - 2.5);
  ftBand.scale.set(1, AG_BAND[1] - AG_BAND[0], 1);
  ftBand.material.opacity = 0.22 * a;
}
// 底からの高さのグラフ（右）。緑＝底から5〜10m。lines：[[sim, 色, 名前]]
function agGraph(list, ts, win, a = 1, top = 500) {
  if (PORTRAIT || a <= 0.01) return;
  const W0 = 330, H0 = 170, n = 110, Y = (h) => H0 - 8 - ((H0 - 16) * h) / 16;
  const X = (i) => 8 + ((W0 - 16) * i) / n, m = Math.floor(clamp01(ts / win) * n);
  let svg = `<rect x="8" y="${Y(10)}" width="${W0 - 16}" height="${Y(5) - Y(10)}" fill="#2ecc71" opacity=".25"/><line x1="8" y1="${Y(0)}" x2="${W0 - 8}" y2="${Y(0)}" stroke="#b9a67c" stroke-width="4"/>`;
  list.forEach(([sim, col]) => {
    const pts = [];
    for (let i = 0; i <= m; i++) pts.push(`${X(i).toFixed(1)},${Y(Math.min(16, sim.at((win * i) / n)[1] - FT_BOT)).toFixed(1)}`);
    svg += `<polyline points="${pts.join(" ")}" fill="none" stroke="${col}" stroke-width="4" stroke-linejoin="round"/>`;
  });
  html += `<div style="position:absolute;right:60px;top:${top}px;width:360px;opacity:${a};background:rgba(255,255,255,.94);border-radius:22px;padding:12px 16px;box-shadow:0 6px 18px rgba(0,0,0,.3);color:#10345a"><b style="font-size:22px">底からの高さ（計算）</b>
    <svg viewBox="0 0 ${W0} ${H0}" width="100%">${svg}<text x="12" y="${Y(10) + 18}" font-size="15" font-weight="900" fill="#1e7a36">底から5〜10m</text><text x="${W0 - 10}" y="${Y(0) - 6}" text-anchor="end" font-size="14" font-weight="800" fill="#7a6a44">海底</text></svg>
    <div style="display:flex;gap:14px;font-size:18px;font-weight:800">${list.map(([, col, nm]) => `<span><i style="display:inline-block;width:16px;height:5px;background:${col};vertical-align:middle;margin-right:4px"></i>${nm}</span>`).join("")}</div></div>`;
}
// ジグを追うハマチ（フォールで近づく。イメージ）
function agFollow(i, st, sim, ts, T, o = {}) {
  const c0 = st.c0, fall = c0.free ? ease((ts - c0.t0) / 0.5) : 0;
  const near = o.near ?? fall * 0.85;
  const side = o.side ?? -1, b = sim.at(Math.max(0, ts - 0.6));
  const hx = lerp(b[0] + side * 1.6, st.x + side * 0.12, near), hy = lerp(b[1] - 0.5, st.y, near);
  return agHeroAt(i, hx, hy, side < 0 ? 0.15 * (1 - near) : Math.PI - 0.15 * (1 - near), o.dz ?? -0.08);
}
const AG_LEG = [["#ffb45e", "糸とジグの動き"], ["#2ecc71", "底から5〜10m"]];
const AG_LEG_T = [["#ffb45e", "糸"], ["#8ff0ff", "ジグが通った道（点）"]];

Object.assign(SHOTS, {
  ag_thumb(t, d, s) {
    ftBase();
    const sim = ftRun("ag_bite"), T = 3, ts = sim.marks.fall + 0.75, st = ftRig(T, sim, ts, { obj: ftJigC, unit: FT_JIG_U, lw: 6 });
    agSchoolPlace(T, { cx: st.x + 2, n: 10, sx: 3 });
    agHeroAt(0, st.x + 0.1, st.y - 0.03, Math.PI - 0.1);
    look(FTp(st.x - 0.75, st.y + 0.05, FT_LZ + 1.7), FTp(st.x - 0.7, st.y - 0.05, FT_LZ), 50);
    ftFlush();
    if (s.clean) return;
    html += ftThumbText(s, 1000);
  },
  // つかみ：船から潜って、水深70mのジグとハマチの群れへ
  ag_hook(t, d, s) {
    ftBase();
    const P = PORTRAIT, T = t, sim = ftRun("ag_soft"), ts = t + 1;
    const st = ftRig(T, sim, ts, { obj: ftJigC, unit: FT_JIG_U });
    ftOthers(T, -62);
    agSchoolPlace(T, { cx: st.x + 2.5, n: 14, sx: 5 });
    agFollow(0, st, sim, ts, T, { near: 0.35 });
    const k = ease((t - 0.9) / 4.4), [sx, sy] = ftSmooth(sim, ts);
    const cx = lerp(-1, sx, k), cy = lerp(1.3, sy, k);
    look(FTp(cx, cy + lerp(1.6, 0.1, k), FT_LZ + lerp(P ? 31 : 24, P ? 3.4 : 2.6, k)), FTp(cx, cy, FT_LZ), 50);
    ftFlush();
    const a = P ? 1 : clamp01(t / 0.25), depth = Math.max(0, -cy);
    html += `<div style="position:absolute;left:0;right:0;top:0;height:${P ? 760 : 400}px;background:linear-gradient(rgba(2,14,28,.72),rgba(2,14,28,0))"></div>`;
    bigText(P ? 0 : 100, "船の青物ジギング、<br>ジグはどう動く？", "しゃくり方で、ジグの高さが変わる（計算）", a);
    html += `<div style="position:absolute;${P ? "right:40px;top:860px" : "right:70px;top:430px"};background:rgba(6,22,42,.85);border:4px solid #ffb45e;border-radius:20px;padding:8px 24px;color:#fff;font-weight:900;font-size:${P ? 40 : 38}px;opacity:${clamp01((t - 0.6) / 0.4)}">水深 <span style="font-size:${P ? 84 : 80}px;color:#ffd166">${depth.toFixed(0)}</span> m</div>`;
    drawBar(s);
  },
  // 時期と時間帯（2026-11-12 オーナー：ハイシーズンと釣れやすい時間帯を紹介）：k0 時期 → k1 潮が動く時間 → k2 まずめと重なる
  ag_when(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 10, sim = ftRun("ag_soft");
    ftRig(T, sim, 2 + (t % 15), { obj: ftJigC, unit: FT_JIG_U, lw: 4 });
    ftOthers(T, -62);
    agSchoolPlace(T, { cx: 4, sc: 5, n: 14, sx: 22, zc: FT_LZ - 4, sz: 2 });
    ftWide(t);
    ftFlush();
    html += acDim(0.25);
    const t0 = t - (s._k0 ?? 0), t1 = t - (s._k1 ?? 99), t2 = t - (s._k2 ?? 99);
    if (k === 0) {
      const W = P ? 860 : 1160, cw = W / 12;
      const cell = (m) => `<div style="flex:1;text-align:center;padding:10px 0;font-size:${P ? 26 : 28}px;font-weight:900;border-radius:8px;margin:0 2px;background:${m >= 7 ? "#e08a2a" : m === 6 ? "#f6d7a8" : "#e6edf3"};color:${m >= 7 ? "#fff" : "#334"}">${m}</div>`;
      const bar = (from, to, col, txt, a, out) => `<div style="position:relative;height:46px;margin-top:10px;opacity:${a}">${out ? `<div style="position:absolute;right:${W - (from - 1) * cw + 12}px;top:4px;line-height:38px;font-weight:900;font-size:${P ? 24 : 26}px;color:${col};white-space:nowrap">${txt}</div>` : ""}<div style="position:absolute;left:${(from - 1) * cw}px;width:${(to - from + 1) * cw - 4}px;top:4px;height:38px;border-radius:19px;background:${col};color:#fff;font-weight:900;font-size:${P ? 24 : 26}px;line-height:38px;padding-left:16px;white-space:nowrap">${out ? "" : txt}</div></div>`;
      html += ftCard(P, `<b style="font-size:36px">明石・淡路の青物ジギング：時期</b>
        <div style="display:flex;margin-top:14px;width:${W}px">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(cell).join("")}</div>
        <div style="width:${W}px">${bar(6.5, 12, "#2f80d1", "ハマチ・メジロ（6月中旬から）", fadeIn(t0, 1.6))}${bar(7, 12, "#e08a2a", "ハイシーズン（7〜12月）", fadeIn(t0, 2.6))}${bar(10.5, 12, "#c2410c", "晩秋はブリのチャンス →", fadeIn(t0, 4.2), true)}</div>
        <div style="font-size:24px;color:#556;margin-top:8px">水温が下がり、タチウオがエサになる晩秋は、ブリが釣れやすくなると言われる</div>`, fadeIn(t0, 0.2), [P ? 0 : 340, P ? 0 : 380, W + 56], [50, 860, W + 56]);
    }
    if (k >= 1) {
      // 潮の動き（イメージ）：1日に2回ずつの満ち引き。止まる前後は流れが弱く、あいだは流れが速い
      const W = P ? 860 : 1160, H = 230, n = 96, pts = [];
      const lev = (h) => H / 2 - Math.cos(((h - 2) / 12.4) * Math.PI * 2) * H * 0.36;
      for (let i = 0; i <= n; i++) { const h = (i / n) * 24; pts.push([(i / n) * W, lev(h)]); }
      const pl = (q) => q.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
      const seg = [];
      for (let c = 0; c < 4; c++) { const h0 = 2 + c * 6.2 + 1.3, h1 = h0 + 3.6; seg.push(pts.filter(([x]) => (x / W) * 24 >= h0 && (x / W) * 24 <= h1)); }
      const slack = [2, 8.2, 14.4, 20.6].map((h) => [(h / 24) * W, lev(h)]);
      const a2 = k >= 2 ? fadeIn(t2, 0.3) : 0;
      const sun = (h, txt) => `<g opacity="${a2}"><circle cx="${(h / 24) * W}" cy="${H - 40}" r="14" fill="#ffb347"/><text x="${(h / 24) * W}" y="${H + 28}" text-anchor="middle" font-size="24" font-weight="900" fill="#c2410c">${txt}</text></g>`;
      const svg = `<svg width="${W}" height="${H + 40}" style="display:block;margin-top:10px;overflow:visible">
        <rect x="0" y="0" width="${W}" height="${H}" rx="12" fill="#eef4f8"/>
        <polyline points="${pl(pts)}" fill="none" stroke="#9fb3c4" stroke-width="5"/>
        ${seg.map((q) => `<polyline points="${pl(q)}" fill="none" stroke="#e08a2a" stroke-width="13" stroke-linecap="round" opacity="${fadeIn(t1, 0.8)}"/>`).join("")}
        ${slack.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="#7a8a99" opacity="${fadeIn(t1, 1.6)}"/>`).join("")}
        ${[0, 6, 12, 18, 24].map((h) => `<text x="${(h / 24) * W}" y="${H - 8}" text-anchor="${h === 0 ? "start" : h === 24 ? "end" : "middle"}" font-size="20" fill="#667">${h}時</text>`).join("")}
        ${sun(5.5, "朝まずめ")}${sun(17, "夕まずめ")}
        ${k >= 2 ? `<text x="${(5.5 / 24) * W}" y="${lev(5.5) - 18}" text-anchor="middle" font-size="44" fill="#e3412b" opacity="${fadeIn(t2, 1.0)}">★</text>` : ""}
      </svg>`;
      html += ftCard(P, `<b style="font-size:36px">釣れやすい時間：<span style="color:#e08a2a">潮が動いている時間</span></b>
        <div style="font-size:26px;font-weight:800;margin-top:6px;color:#334"><span style="color:#e08a2a">━</span> 潮が動く（よく食う）　<span style="color:#7a8a99">●</span> 潮止まり（明石では、緩い潮は食いにくい）</div>
        ${svg}
        <div style="font-size:24px;color:#556;margin-top:4px">${k >= 2 ? "★ まずめと潮の動きが重なると、さらにチャンス。" : ""}潮の時刻は日によって変わる（グラフはイメージ）</div>`, fadeIn(t1, 0.2), [P ? 0 : 340, P ? 0 : 300, W + 56], [50, 780, W + 56]);
    }
    if (!P) legend(AG_LEG);
    drawBar(s);
  },
  // 時期と場所：k0 時期 → k1 水深・魚 → k2 潮の速さ
  ag_where(t, d, s, k) {
    ftBase();
    const sh = s.shift ?? 0; // 時期を ag_when に分けたので、台本の1行目が水深（k1）にあたる
    k += sh;
    const P = PORTRAIT, T = t + 20, sim = ftRun("ag_soft"), st = ftRig(T, sim, 2 + (t % 15), { obj: ftJigC, unit: FT_JIG_U, lw: 4 });
    ftOthers(T, -62);
    agSchoolPlace(T, { cx: 4, sc: 5, n: 14, sx: 22, zc: FT_LZ - 4, sz: 2 });
    ftWide(t);
    ftFlush();
    const q = project(FTp(st.x, st.y, FT_LZ));
    html += `<div style="position:absolute;left:${q.x}px;top:${q.y}px;width:26px;height:26px;transform:translate(-50%,-50%);border-radius:50%;background:#ffb45e;border:5px solid #fff;box-shadow:0 0 16px #ffb45e"></div>`;
    const t1 = t - (sh ? (s._k0 ?? 0) : (s._k1 ?? 99)), t2 = t - (sh ? (s._k1 ?? 99) : (s._k2 ?? 99));
    if (k === 0) {
      const cell = (m) => `<div style="flex:1;text-align:center;padding:8px 0;font-size:24px;font-weight:900;border-radius:8px;margin:0 2px;background:${m >= 7 ? "#e08a2a" : m === 6 ? "#f6d7a8" : "#e6edf3"};color:${m >= 7 ? "#fff" : "#10345a"}">${m}</div>`;
      html += ftCard(P, `<b style="font-size:34px">明石・淡路の青物ジギング</b><div style="display:flex;margin-top:12px">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(cell).join("")}</div><div style="font-size:28px;font-weight:900;margin-top:10px">ハイシーズンは<span style="color:#c2410c">7〜12月</span>　ブリは晩秋がチャンス</div>`, fadeIn(t, 0.4), [560, 150, 820], [60, 270, 880]);
    }
    if (k >= 1) {
      pathLine([FTp(-24, 0, FT_LZ), FTp(-24, FT_BOT, FT_LZ)], "#ffffff", 1, 3);
      [0, 10, 20, 30, 40, 50, 60, 70].forEach((m) => { const p = project(FTp(-24, -m, FT_LZ)); html += `<div style="position:absolute;left:${p.x - 12}px;top:${p.y}px;transform:translate(-100%,-50%);color:#fff;font-weight:900;font-size:26px;text-shadow:0 2px 6px #000;opacity:${fadeIn(t1, m / 70)}">${m}m</div>`; });
      label(FTp(10, FT_BOT + 8, FT_LZ), "ハマチ・メジロ・ブリ", "底から5〜10mが勝負", fadeIn(t1, 1.6), "gold", P ? 60 : 300, P ? -260 : -170);
      agBand(fadeIn(t1, 1.2));
    }
    if (k === 1) html += ftCard(P, `<b style="font-size:34px">明石のポイント</b><div style="font-size:34px;font-weight:900;margin-top:8px">深い所で <span style="color:#1f6fd1">水深約70m</span></div>`, fadeIn(t1, 0.3), [820, 150, 600], [60, 270, 880]);
    if (k >= 2) html += ftCard(P, `<b style="font-size:34px">明石海峡は、潮がとても速い</b><div style="font-size:32px;font-weight:900;margin-top:8px">ふだん <span style="color:#c2410c">3〜5ノット</span></div><div style="font-size:32px;font-weight:900">大潮のいちばん速い時 <span style="color:#c2410c">約11ノット</span>（時速約20km）</div>`, fadeIn(t2, 0.3), [560, 150, 820], [60, 270, 880]);
    if (!P) legend(AG_LEG);
    ftNote("魚は大きく表示");
  },
  // 潮とジグの重さ（模式図）：k0 問い → k1 A・B → k2 答え → k3 使い分け
  ag_tide(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 40, t2 = t - (s._k2 ?? 99);
    const tt = k >= 2 ? Math.max(0, t2) * 4.5 : 0;
    const bob = ftSurf(0, T) * 0.5;
    ftBoat.position.set(-1, bob, 0);
    ftBoat.rotation.z = Math.sin(T * 0.7) * 0.012;
    ftWide(t);
    ftFlush();
    // 模式図：沈む速さ（重いほど速い）と、潮に流される速さを足しただけ
    [["軽いジグ", 1.5, -1.6, "#7fd3ff"], ["重いジグ", 3.1, 1.6, "#ffb45e"]].forEach(([nm, v, ox, col], i) => {
      const yy = Math.max(FT_BOT + 0.3, -2 - v * tt), tl = Math.min(tt, 68 / v), xx = ox + 0.42 * tl;
      const tip = FTp(ox, FT_TIP + bob, FT_LZ), end = FTp(xx, yy, FT_LZ), mid = FTp(ox + (xx - ox) * 0.85, (FT_TIP + yy) * 0.45, FT_LZ);
      pathLine(bez(tip, mid, end), col, 1, 5);
      const p = project(end);
      html += `<div style="position:absolute;left:${p.x}px;top:${p.y}px;width:30px;height:30px;transform:translate(-50%,-50%);border-radius:50%;background:${col};border:5px solid #fff"></div>`;
      if (k >= 1) label(end, i ? "B　重いジグ" : "A　軽いジグ", yy <= FT_BOT + 0.31 ? "底に着いた" : "", 1, k >= 2 && i === 1 && yy <= FT_BOT + 0.31 ? "gold ans" : "", i ? 280 : -280, i ? -40 : -140);
    });
    // 潮の向きの矢印
    aoArrow(FTp(-30, -40, FT_LZ), FTp(-14, -40, FT_LZ), "#4cc3ff", 1, P ? 22 : 18);
    label(FTp(-22, -40, FT_LZ), "潮の流れ", "", 1, "", 0, -50);
    if (k <= 1) html += `<div class="big" style="top:${P ? 300 : 120}px;font-size:${P ? 66 : 58}px">潮が速いとき、<br><span style="color:#ffd166">底を取りやすいのはどっち？</span></div>`;
    if (k >= 3) html += ftCard(P, `<b style="font-size:34px">ジグは <span style="color:#c2410c">60〜250g</span> を使い分ける</b><div style="font-size:30px;font-weight:900;margin-top:6px">潮が速い・深い → 重いジグ</div><div style="font-size:24px;color:#3a5a78;font-weight:800">重さは船の指定や、まわりの人に合わせる</div>`, fadeIn(t - (s._k3 ?? 99), 0.2), [1100, 140, 760], [60, 270, 880]);
    html += aoTag("模式図（沈む速さと潮の流れを足しただけのイメージ）");
    drawBar(s);
  },
  // 底取り：落とす → 着底 → すぐ巻き上げる
  ag_fall(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 60, sim = ftRun("ag_main"), ts = t, L = sim.landed;
    const st = ftRig(T, sim, ts, { obj: ftJigC, unit: FT_JIG_U });
    agSchoolPlace(T, { cx: 6, n: 12, sx: 4 });
    agBand(1);
    ftCam(sim, ts, 2.2);
    const here = FTp(st.x, st.y, FT_LZ), c0 = st.c0;
    if (c0.free) ftChip("フォール：底まで落とす", "#1f6fd1");
    else if (L > 0 && ts > L && ts < L + 0.6) ftChip("着底！", "#c2410c");
    else if (c0.turning && ts < 12) ftChip("すぐに巻き上げる", "#e08a2a");
    else ftChip("ゆったりしゃくる", "#e3412b");
    if (L > 0 && ts > L && ts < L + 3.2) label(here, "着底", "底取りを最優先", fadeIn(ts, L), "gold ans", P ? 0 : 300, P ? -330 : -200);
    ftMini(-st.y);
    ftCtl(st);
    agGraph([[sim, "#e08a2a", "ジグ"]], ts, 26);
    if (!P) legend(AG_LEG);
    ftNote();
  },
  // ゆったりしゃくる：k0 ジャーク → k1 潮に乗せてフォール
  ag_slow(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 80, sim = ftRun("ag_soft"), ts = t;
    const st = ftRig(T, sim, ts, { obj: ftJigC, unit: FT_JIG_U, trail: 2.6, trailDots: true });
    agSchoolPlace(T, { cx: st.x + 2.5, n: 12, sx: 4 });
    agFollow(0, st, sim, ts, T);
    agBand(1);
    ftCam(sim, ts, 1.8, { dy: -0.1 });
    const c0 = st.c0;
    if (ts < 1) ftChip("スロージギング", "#10345a");
    else if (c0.free) ftChip("フォール：ここで食わせる", "#1f6fd1");
    else ftChip("ゆったり、しゃくる", "#e3412b");
    ftMini(-st.y);
    ftCtl(st);
    agGraph([[sim, "#e08a2a", "ゆったり"]], ts, 18);
    if (!P) legend(AG_LEG_T);
    ftNote("ジグの動きは簡単な物理モデルの計算。魚の動きはイメージ");
    drawBar(s);
  },
  // 強くしゃくると：左右に並べて比べる
  ag_hard(t, d, s, k) {
    ftBase();
    ftBoat.visible = false;
    const P = PORTRAIT, T = t + 100, sS = ftRun("ag_soft"), sH = ftRun("ag_hard"), ts = Math.min(t, 11.8), ox = P ? 1.4 : 2.4;
    const a = ftRig(T, sS, ts, { obj: ftJigC, unit: FT_JIG_U, vis: 2, ox: -ox, rod: false, trail: 2.5, trailDots: true, lw: 3 });
    const b = ftRig(T, sH, ts, { obj: ftJigR, unit: FT_JIG_U, vis: 2, ox, rod: false, trail: 2.5, trailDots: true, lw: 3 });
    agBand(1);
    agSchoolPlace(T, { cx: 0, n: 10, sx: 5, zc: FT_LZ - 3.6 });
    look(FTp(0, FT_BOT + 11, FT_LZ + (P ? 27 : 21)), FTp(0, FT_BOT + 10.5, FT_LZ), 50);
    ftFlush();
    label(FTp(a.x, a.y, FT_LZ), "ゆったり", "タナに残る", 1, "gold", P ? -80 : -260, -120);
    label(FTp(b.x, b.y, FT_LZ), "強く速く", b.y > AG_BAND[1] ? "浮きすぎてタナを外れる" : "", 1, b.y > AG_BAND[1] ? "red" : "", P ? 80 : 280, -120);
    const pb = project(FTp(P ? 0.3 : 5, AG_BAND[1], FT_LZ));
    html += `<div style="position:absolute;left:${pb.x}px;top:${pb.y + 8}px;color:#2ecc71;font-weight:900;font-size:30px;text-shadow:0 2px 6px #000">底から5〜10m</div>`;
    agGraph([[sS, "#1a4fd0", "ゆったり"], [sH, "#d0306a", "強く速く"]], ts, 12, 1, 240);
    if (!P) legend([["#8ff0ff", "ジグが通った道（点）"], ["#2ecc71", "底から5〜10m"]]);
    ftNote("ジグの動きは簡単な物理モデルの計算（同じジグで、しゃくり方だけを変えた）");
  },
  // アタリ：フォールで食う → 合わせる
  ag_bite(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 120, sim = ftRun("ag_bite"), ts = t, mk = sim.marks, hooked = ts >= mk.bite;
    const st = ftRig(T, sim, ts, { obj: ftJigC, unit: FT_JIG_U, th: hooked ? 0.2 + Math.sin(T * 12) * 0.2 : undefined });
    agSchoolPlace(T, { cx: st.x + 2.5, n: 10, sx: 4 });
    if (hooked) agHeroAt(0, st.x + 0.05, st.y, Math.sin(T * 10) * 0.25);
    else agFollow(0, st, sim, ts, T, { near: ts > mk.fall ? ease((ts - mk.fall) / 0.8) : 0.15 });
    agBand(1);
    ftCam(sim, ts, 1.9, { dy: -0.1 });
    if (ts < mk.fall) ftChip("ゆったり、しゃくる", "#e3412b");
    else if (!hooked) ftChip("フォール…", "#1f6fd1");
    else if (ts < mk.hook + 2.5) ftChip("食った！ 合わせる", "#e3412b");
    else ftChip("掛かった", "#2a9d5c");
    ftMini(-st.y);
    ftCtl(st, 1, hooked ? (ts < mk.hook + 1 ? ["合わせる", "#e3412b"] : ["掛かった", "#2a9d5c"]) : null);
    if (!P) legend(AG_LEG);
    ftNote("魚が引く力は仮の値。魚の動きはイメージ");
  },
  ag_safe(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 220, sim = ftRun("ag_soft");
    ftRig(T, sim, 3, { obj: ftJigC, unit: FT_JIG_U });
    ftOthers(T, -62);
    if (P) look(FTp(-0.5, 5, 25), FTp(-0.5, 1.6, 0), 45);
    else look(FTp(1.0 + t * 0.06, 4.2, 15.5), FTp(-0.8, 1.7, 0), 45);
    ftFlush();
    const bob = ftSurf(0, T) * 0.5;
    if (k === 0) html += ftCard(P, `<b style="font-size:38px">潮が速い海では、<span style="color:#c2410c">船長の指示</span>を聞く</b><div style="font-size:30px;font-weight:900;margin-top:8px">ジグの重さも、船の指定に合わせる</div>`, fadeIn(t, 0.4), [70, 150, 880], [60, 270, 880]);
    if (k >= 1) {
      const a = fadeIn(t - (s._k1 ?? 99), 0.2);
      label(FTp(0, 1.15 + 1.2 + bob, 1.45), "ライフジャケット", "必ず着ける", a, "gold ans", P ? 0 : 420, P ? -330 : -230);
      html += ftCard(P, `<b style="font-size:38px">船の上では、ライフジャケットを必ず</b>`, a, [70, 150, 760], [60, 270, 880]);
    }
  },
  ag_sum(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 240, sim = ftRun("ag_soft");
    ftRig(T, sim, 2 + (t % 15), { obj: ftJigC, unit: FT_JIG_U });
    ftOthers(T, -62);
    agSchoolPlace(T, { cx: 4, sc: 5, n: 14, sx: 22, zc: FT_LZ - 4, sz: 2 });
    agBand(1);
    ftWide(t);
    ftFlush();
    html += acDim(0.5);
    const rows = [["底取り", "まず底まで落とす", "潮が速いときは重いジグ", "#c2410c"], ["タナ", "底から5〜10m", "ここを長く通す", "#2a9d5c"], ["誘い", "ゆったりしゃくって、フォール", "強く速くだと浮きすぎる（計算）", "#1f6fd1"]];
    html += `<div class="big" style="top:${P ? 560 : 110}px;font-size:${P ? 66 : 64}px;opacity:${fadeIn(t, 0.1)}">船の青物ジギング まとめ</div>`;
    rows.forEach(([a1, b1, c1, col], i) => {
      const a = fadeIn(t, 0.4 + i * 0.45);
      html += `<div class="card" style="left:${P ? 70 : 330}px;top:${(P ? 780 : 240) + i * (P ? 240 : 200)}px;width:${P ? 880 : 1200}px;padding:20px 30px;opacity:${a};transform:translateY(${(1 - a) * 30}px);display:flex;align-items:center;gap:26px"><b style="background:${col};color:#fff;font-size:${P ? 34 : 38}px;padding:10px 0;width:${P ? 200 : 220}px;text-align:center;border-radius:18px;flex:none">${a1}</b><div><div style="font-size:${P ? 40 : 46}px;font-weight:900">${b1}</div><div style="font-size:${P ? 27 : 30}px;color:#3a5a78">${c1}</div></div></div>`;
    });
  },
});

// =====================================================================
// 写真から作った魚の3Dモデル（Fish Kit、CC0 1.0。https://cda-social.github.io/fish/gallery.html）2026-11-12 オーナー指示で取り込み
// scripts/cg/vendor/fishkit。動きは決まった時刻 T から計算する（書き出しを分割しても、つなぎ目で動きが飛ばないように）
// =====================================================================
const FK = { ok: false, mod: null, pool: {} };
{
  const hemi = new THREE.HemisphereLight(0xcfeaff, 0x3a4a58, 1.3);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(0.4, 1, 0.6);
  scene.add(hemi, sun); // ふつうの ShaderMaterial には影響しない（魚のモデルの材質だけが光を使う）
  pending.push(
    import("./vendor/fishkit/fish-kit.js")
      .then(async (mod) => { await mod.loadFish("vendor/fishkit/fish/", ["tachiuo", "buri", "madai", "aji", "saba", "katakuchi", "sawara"]); FK.mod = mod; FK.ok = true; })
      .catch((e) => console.warn("fishkit", e))
  );
}
// id ごとに使い回す。i 番目のインスタンス（なければ作る）。cm：体長
function fkGet(id, i = 0, cm) {
  if (!FK.ok) return null;
  const key = `${id}:${i}:${cm ?? ""}`;
  let f = FK.pool[key];
  if (!f) {
    f = FK.mod.createFish(id, cm);
    f.mesh.detail(true);
    f.setDetail("high");
    world.add(f.object);
    extras.push(f.object);
    FK.pool[key] = f;
  }
  return f;
}
// p：体の中心（ワールド）、yaw：口の向き（0＝+x 右向き、π＝左向き）、pitch：頭を上げる角度、T：時刻、o.amp・o.freq：尾の振り
// エンディングの魚：奥をアジの群れ、まん中をブリの群れ、手前をマダイが横切る（どれも Fish Kit）。動きは時刻 t だけで決まる
function endFish(t, c, P = PORTRAIT) {
  const wrap = (x, w) => ((((x + w / 2) % w) + w) % w) - w / 2;
  const sp = P ? 0.5 : 1;
  for (let i = 0; i < 14; i++) { // アジ（奥、左へ）
    const f = fkGet("aji", 20 + i, 24 + (i % 3) * 2), x = wrap(4 - i * 1.1 - t * 0.6, 16) * sp;
    fkPlace(f, V(c.x + x, c.y + 1.1 + Math.sin(i * 2.1) * 0.5, c.z - 3 - (i % 4) * 0.5), Math.PI, 0.03 * Math.sin(t + i), t, { freq: 3, amp: 0.1, seed: i });
  }
  for (let i = 0; i < 6; i++) { // ブリ（まん中、右へ）
    const f = fkGet("buri", 20 + i, 70 + (i % 3) * 6), x = wrap(-5 + i * 2.7 + t * 0.75, 16) * sp;
    fkPlace(f, V(c.x + x, c.y - 0.15 + Math.sin(i * 1.7) * 0.5, c.z - 0.4 - (i % 3) * 0.6), 0, 0.05 * Math.sin(t * 0.7 + i), t, { freq: 1.8, amp: 0.08, seed: i * 3 });
  }
  for (let i = 0; i < 2; i++) { // マダイ（手前、ゆっくり左へ）
    const f = fkGet("madai", 20 + i, 50), x = wrap(3.5 - i * 8 - t * 0.4, 16) * sp;
    fkPlace(f, V(c.x + x, c.y - 0.75 + i * 0.25, c.z + 1.1), Math.PI, 0.04, t, { freq: 1.6, amp: 0.08, seed: 7 + i });
  }
}
function fkPlace(f, p, yaw, pitch, T, o = {}) {
  if (!f) return;
  f.object.visible = true;
  f.object.position.copy(p);
  f.object.rotation.set(0, Math.PI / 2 - yaw, 0, "YXZ");
  f.body.rotation.set(-pitch, 0, o.roll ?? 0);
  const ph = (T + (o.seed ?? 0)) * Math.PI * 2 * (o.freq ?? 1.6);
  f.mesh.swim(ph, o.amp ?? 0.09, o.bend ?? 0, T + (o.seed ?? 0));
}

Object.assign(SHOTS, {
  fk_test(t, d, s) {
    ftBase();
    const T = t + 3;
    const ids = [["tachiuo", 100], ["buri", 80], ["madai", 50], ["aji", 25], ["saba", 35], ["sawara", 70], ["katakuchi", 12]];
    ids.forEach(([id, cm], i) => fkPlace(fkGet(id, 0, cm), FTp(-3 + (i % 4) * 2, FT_BOT + 2.5 - Math.floor(i / 4) * 1.3, FT_LZ), i % 2 ? Math.PI : 0, 0, T, { seed: i }));
    look(FTp(0, FT_BOT + 2, FT_LZ + 6), FTp(0, FT_BOT + 1.9, FT_LZ), 50);
    ftFlush();
    html += `<div style="position:absolute;left:20px;top:20px;color:#fff;font-size:30px">${FK.ok ? "Fish Kit OK" : "Fish Kit NG"}</div>`;
  },
});
// =====================================================================
// タイラバ（cg-fune-tairaba、tr_*）2026-11-12 船釣り 見える化シリーズ 第3回。ft_*（船のタチウオ）の部品と Fish Kit のマダイを使う
// 参考：Honda釣り倶楽部「タイラバ」2019年5月（STEP1：着底後すぐ巻き上げ、巻く速さは終始一定でゆっくり、重さの目安は水深＝グラム数、
//   巻き上げは底から水深の約1/3かリール約30回転、アタリがあっても掛かったと確信できるまで一定速で巻き続ける／STEP3：潮が緩い→軽め、速い→重め）
//   ダイワ「タイラバ特集」（マダイは基本的に底付近、ヘッドで底を取りネクタイの波動で誘う、着底の瞬間はスプールが止まる、
//   着底後は数回転速めに巻いてたるみを取る、タッチ＆ゴー、巻き上げは水深の1/3〜1/2、春の乗っ込みは長い距離を追う・冬は追う距離が短い（錦江湾の例））
// =====================================================================
const TR_BODY = { m: 0.07, ma: 0.014, W: G_W(0.07, 11.34), I: 2e-5, len: 0.03, r: 0.013, eye: [0, 0.013], cp: 0, ka: 0.24, kn: 0.24, kl: 0, km: 0, kw: 2e-5, kw1: 2e-5 };
FT_BODY.tairaba = TR_BODY;
Object.assign(FT_SEQ, {
  // 落とす → 着底 → たるみを数回転速めに取る → 等速でゆっくり30回転
  tr_main: { body: "tairaba", opt: { y0: -61, th0: 0 }, seq: [{ free: 8.6 }, { mark: "land" }, { reel: 3, dur: 0.8 }, { mark: "go" }, { reel: 30, dur: 40, lin: 1 }, { wait: 3 }] },
  // アタリが出ても、同じ速さで巻き続ける → 重さが乗る
  tr_bite: { body: "tairaba", opt: { y0: -66, th0: 0 }, seq: [{ reel: 4, dur: 5.3, lin: 1 }, { mark: "n1" }, { reel: 0.3, dur: 0.4, lin: 1, fish: [0, -1.2] }, { reel: 1.2, dur: 1.6, lin: 1 }, { mark: "n2" }, { reel: 0.3, dur: 0.4, lin: 1, fish: [0, -1.2] }, { reel: 1.2, dur: 1.6, lin: 1 }, { mark: "hook" }, { reel: 5, dur: 7, lin: 1, fish: [0, -3.5] }, { wait: 6, fish: [0, -3] }] },
});
// タイラバの模型（実物大：ヘッドの直径約2.4cm）。原点＝ヘッドの中心。スカートとネクタイは -y へ垂れる
const trRig = new THREE.Group();
world.add(trRig);
extras.push(trRig);
const trTail = new THREE.Group();
{
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.012, 24, 16), ftLit(0xff6a1a, { shine: 0.7 }));
  const eyeW = new THREE.MeshBasicMaterial({ color: 0xffffff }), eyeB = new THREE.MeshBasicMaterial({ color: 0x111111 });
  [-1, 1].forEach((sd) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 10, 8), eyeW); e.position.set(0.004, 0.002, sd * 0.0105); const p = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 8, 6), eyeB); p.position.set(0.0055, 0.002, sd * 0.0135); head.add(e, p); });
  trRig.add(head);
  trRig.add(trTail);
  // スカート（細いゴムの束）
  const skM = ftLit(0xff8a2a, { shine: 0.2 });
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2, L = 0.055 + (i % 3) * 0.006;
    const g = new THREE.CylinderGeometry(0.0006, 0.0008, L, 4).translate(0, -L / 2, 0);
    const m = new THREE.Mesh(g, skM);
    m.position.set(Math.cos(a) * 0.004, -0.008, Math.sin(a) * 0.004);
    m.rotation.set(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22);
    m.userData.a = a;
    trTail.add(m);
  }
  // ネクタイ（くるっと曲がった板。ゆらゆら揺れる）
  const tieM = new THREE.ShaderMaterial({
    uniforms: { time: U.time, col: { value: new THREE.Color(0xff3d2a) } }, side: THREE.DoubleSide,
    vertexShader: `uniform float time; attribute float ph; varying float vY; void main(){ vec3 p = position; float u = clamp(-p.y/0.09, 0., 1.);
      p.x += sin(u*7.0 - time*9.0 + ph)*0.012*u; p.z += cos(u*5.0 - time*7.0 + ph)*0.004*u; vY = u; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: `uniform vec3 col; varying float vY; void main(){ gl_FragColor = vec4(col*(0.85+0.3*(1.0-vY)), 1.); }`,
  });
  [0, 1].forEach((i) => {
    const g = new THREE.PlaneGeometry(0.008, 0.09, 1, 18).translate(0, -0.045 - 0.008, 0);
    g.setAttribute("ph", new THREE.Float32BufferAttribute(new Array(g.attributes.position.count).fill(i * 2.1), 1));
    const m = new THREE.Mesh(g, tieM);
    m.position.set((i - 0.5) * 0.006, 0, (i - 0.5) * 0.004);
    trTail.add(m);
  });
  // ハリ（2本）
  const st = ftLit(0xc3cad0, { shine: 0.9 });
  [-1, 1].forEach((sd) => { const h = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0007, 6, 14, Math.PI * 1.2), st); h.position.set(sd * 0.004, -0.045, 0); h.rotation.z = sd > 0 ? 0.6 : 2.5; trTail.add(h); });
}
const _trDir = V(0, -1, 0), _trDown = V(0, -1, 0);
// タイラバを置く。スカートは進む向きと反対へ（止まっているときは下へ）なびく
function trPlace(sim, ts, vis = 1, ox = 0) {
  const a = sim.at(ts), b = sim.at(Math.max(0, ts - 0.2));
  trRig.visible = true;
  trRig.position.copy(FTp(a[0] + ox, a[1], FT_LZ));
  trRig.scale.setScalar(vis);
  const vx = (a[0] - b[0]) / 0.2, vy = (a[1] - b[1]) / 0.2, sp = Math.hypot(vx, vy);
  _trDir.set(-vx / (sp || 1), -vy / (sp || 1), 0);
  _trDir.lerp(_trDown, clamp01(1 - sp / 0.25)).normalize();
  trTail.quaternion.setFromUnitVectors(_trDown, _trDir);
  trTail.children.forEach((m, i) => { if (m.userData.a != null) m.rotation.x = Math.sin(m.userData.a) * 0.22 + Math.sin(U.time.value * 6 + i) * 0.05; });
  return { x: a[0] + ox, y: a[1], dir: _trDir.clone(), vis };
}
// マダイ（Fish Kit。なければイラストの板）を、タイラバの後ろ（下）につける。dist：スカートの先からの距離
function trMadai(i, tp, dist, T, o = {}) {
  const f = fkGet("madai", i, o.cm ?? 50);
  if (!f) return null;
  const L = f.length, d = tp.dir, sd = o.side ?? -0.22, sk = 0.07 * (tp.vis ?? 1); // d：スカートが伸びる向き。sd：横へずらす量（斜め後ろから追う）。sk：スカートの長さ
  const mx = tp.x + d.x * (sk + dist) - d.y * sd, my = tp.y + d.y * (sk + dist) + d.x * sd;
  // 口がタイラバのスカートの先を向くように
  let ang = Math.atan2(tp.y + d.y * sk * 0.85 - my, tp.x + d.x * sk * 0.85 - mx), cx = mx - Math.cos(ang) * L * 0.47, cy0 = my - Math.sin(ang) * L * 0.47;
  if (o.hooked) {
    // 掛かった：スカートの中ほどのハリが口にかかり、糸に引かれて頭を斜め上（約40°）に向ける。体は右下へ。首を振る（2026-11-12 オーナー：ヒットの絵を自然に）
    const hx = tp.x + d.x * sk * 0.55, hy = tp.y + d.y * sk * 0.55;
    ang = Math.PI - 0.7 + 0.14 * Math.sin(T * 6.5);
    cx = hx - Math.cos(ang) * L * 0.47; cy0 = hy - Math.sin(ang) * L * 0.47;
  }
  let cy = cy0;
  const low = cy - Math.abs(Math.sin(ang)) * L * 0.5 - 0.2 * L * Math.abs(Math.cos(ang));
  if (low < FT_BOT + 0.4) cy += FT_BOT + 0.4 - low;
  ftClear(Math.max(low, FT_BOT + 0.4));
  ftShade(cx, FT_LZ + (o.dz ?? -0.12), Math.max(low, FT_BOT + 0.4) - FT_BOT, L);
  const right = Math.cos(ang) >= 0;
  fkPlace(f, FTp(cx, cy, FT_LZ + (o.dz ?? -0.12)), right ? 0 : Math.PI, right ? ang : Math.PI - ang, T + i, { freq: o.freq ?? 2.4, amp: o.amp ?? 0.09, seed: i });
  return [mx, my];
}
const TR_LEG = [["#ffb45e", "糸とタイラバの動き"], ["#2ecc71", "巻き上げる範囲"]];
function trBand(top, a = 1) {
  ftBand.visible = a > 0.01;
  ftBand.position.set(4, (FT_BOT + top) / 2, FT_LZ - 2.5);
  ftBand.scale.set(1, top - FT_BOT, 1);
  ftBand.material.opacity = 0.2 * a;
}
// 船・竿・糸（仕掛けは trPlace で置く）
function trRig2(T, sim, ts, o = {}) {
  const st = ftRig(T, sim, ts, { obj: new THREE.Group(), rod: o.rod, trail: o.trail, lw: o.lw, ox: o.ox });
  const tp = trPlace(sim, ts, o.vis ?? 1, o.ox ?? 0);
  return { ...st, tp };
}

Object.assign(SHOTS, {
  tr_thumb(t, d, s) {
    ftBase();
    const sim = ftRun("tr_main"), T = 3, ts = sim.marks.go + 6, st = trRig2(T, sim, ts, { lw: 6, vis: 2 });
    trMadai(0, st.tp, 0.06, T, { cm: 55, side: 0.25 });
    look(FTp(st.tp.x - 0.55, st.tp.y - 0.2, FT_LZ + 1.25), FTp(st.tp.x - 0.4, st.tp.y - 0.22, FT_LZ), 50);
    ftFlush();
    if (s.clean) return;
    html += ftThumbText(s, 1000);
  },
  tr_hook(t, d, s) {
    ftBase();
    const P = PORTRAIT, T = t, sim = ftRun("tr_main"), ts = sim.marks.go + 2 + t;
    const st = trRig2(T, sim, ts, { trail: 2.2 });
    ftOthers(T, -64);
    trMadai(0, st.tp, 0.35 + 0.1 * Math.sin(t), T, { cm: 55 });
    trMadai(1, st.tp, 1.4, T, { cm: 45, side: 0.6, dz: -0.6 });
    const k = ease((t - 0.9) / 4.4), [sx, sy] = ftSmooth(sim, ts);
    const cx = lerp(-1, sx, k), cy = lerp(1.3, sy - 0.3, k);
    look(FTp(cx, cy + lerp(1.6, 0.05, k), FT_LZ + lerp(P ? 31 : 24, P ? 2.2 : 1.7, k)), FTp(cx, cy, FT_LZ), 50);
    ftFlush();
    const a = P ? 1 : clamp01(t / 0.25), depth = Math.max(0, -cy);
    html += `<div style="position:absolute;left:0;right:0;top:0;height:${P ? 760 : 400}px;background:linear-gradient(rgba(2,14,28,.72),rgba(2,14,28,0))"></div>`;
    bigText(P ? 0 : 100, "タイラバ、<br>巻くだけでなぜ釣れる？", "海の中の動きを計算で見える化", a);
    html += `<div style="position:absolute;${P ? "right:40px;top:860px" : "right:70px;top:430px"};background:rgba(6,22,42,.85);border:4px solid #ffb45e;border-radius:20px;padding:8px 24px;color:#fff;font-weight:900;font-size:${P ? 40 : 38}px;opacity:${clamp01((t - 0.6) / 0.4)}">水深 <span style="font-size:${P ? 84 : 80}px;color:#ffd166">${depth.toFixed(0)}</span> m</div>`;
    drawBar(s);
  },
  // しくみ：k0 部品 → k1 底のマダイを、ネクタイの波動で誘う
  tr_what(t, d, s, k) {
    ftBase();
    ftBoat.visible = false;
    const P = PORTRAIT;
    trRig.visible = true;
    trRig.position.copy(FTp(0, -30, FT_LZ));
    trRig.scale.setScalar(1);
    trTail.quaternion.identity();
    trRig.rotation.set(0, Math.sin(t * 0.4) * 0.5, 0);
    trRig.updateMatrixWorld(true);
    look(FTp(0, -30.04, FT_LZ + (P ? 0.36 : 0.26)), FTp(0, -30.04, FT_LZ), 50);
    ftFlush();
    ftSeg(FTp(0, -28, FT_LZ), FTp(0, -29.988, FT_LZ), "#ffb45e", 5);
    label(FTp(0.008, -30, FT_LZ), "ヘッド（オモリ）", "底を取る", fadeIn(t, 0.4), "gold", P ? 140 : 320, -120);
    label(FTp(-0.006, -30.03, FT_LZ), "スカート", "", fadeIn(t, 1.2), "", P ? -140 : -330, -60);
    label(FTp(0.006, -30.08, FT_LZ), "ネクタイ", "水の抵抗でゆらゆら", fadeIn(t, 2.0), "gold ans", P ? 120 : 330, 120);
    label(FTp(-0.004, -30.045, FT_LZ), "ハリ", "", fadeIn(t, 2.8), "", P ? -140 : -330, 120);
    if (k >= 1) html += ftCard(P, `<b style="font-size:36px">マダイは、基本的に底の近く</b><div style="font-size:30px;font-weight:900;margin-top:6px">ヘッドで底を取り、<span style="color:#c2410c">ネクタイの波動</span>で誘う</div>`, fadeIn(t - (s._k1 ?? 99), 0.2), [70, 140, 820], [60, 270, 880]);
    ftNote("ネクタイの揺れはイメージ");
  },
  // 重さ：k0 水深＝グラム数 → k1 潮で変える
  tr_weight(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 20, sim = ftRun("tr_main"), st = trRig2(T, sim, sim.marks.go + 4 + (t % 20));
    ftOthers(T, -64);
    ftWide(t);
    ftFlush();
    const q = project(FTp(st.tp.x, st.tp.y, FT_LZ));
    html += `<div style="position:absolute;left:${q.x}px;top:${q.y}px;width:26px;height:26px;transform:translate(-50%,-50%);border-radius:50%;background:#ff6a1a;border:5px solid #fff"></div>`;
    pathLine([FTp(-24, 0, FT_LZ), FTp(-24, FT_BOT, FT_LZ)], "#ffffff", 1, 3);
    [0, 10, 20, 30, 40, 50, 60, 70].forEach((m) => { const p = project(FTp(-24, -m, FT_LZ)); html += `<div style="position:absolute;left:${p.x - 12}px;top:${p.y}px;transform:translate(-100%,-50%);color:#fff;font-weight:900;font-size:26px;text-shadow:0 2px 6px #000">${m}m</div>`; });
    html += ftCard(P, `<b style="font-size:34px">重さの目安は <span style="color:#c2410c">水深＝グラム数</span></b><div style="font-size:34px;font-weight:900;margin-top:8px">水深70mなら 70g</div><div style="font-size:24px;font-weight:800;color:#3a5a78">底が取れないと釣りにならないので、軽くしすぎない</div>`, fadeIn(t, 0.4), [560, 150, 820], [60, 270, 880]);
    if (k >= 1) html += ftCard(P, `<div style="font-size:32px;font-weight:900">潮が速い → <span style="color:#c2410c">重く</span>　潮がゆるい → <span style="color:#1f6fd1">軽く</span></div><div style="font-size:24px;font-weight:800;color:#3a5a78">色や重さは、船宿で最新の情報を聞く</div>`, fadeIn(t - (s._k1 ?? 99), 0.2), [560, 360, 820], [60, 560, 880]);
    if (!P) legend([TR_LEG[0]]);
  },
  // 着底 → タッチ＆ゴー
  tr_fall(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 40, sim = ftRun("tr_main"), ts = t, mk = sim.marks, L = sim.landed > 0 ? sim.landed : mk.land;
    const st = trRig2(T, sim, ts, { trail: 1.6, vis: 2.5 });
    if (ts > L) trMadai(0, st.tp, 0.9, T, { cm: 50 });
    ftCam(sim, ts, 1.6, { dy: -0.15 });
    const c0 = st.c0;
    if (c0.free) ftChip("フォール：底まで落とす", "#1f6fd1");
    else if (ts < mk.go) ftChip("着底！ すぐ数回転、速めに巻く", "#c2410c");
    else ftChip("タッチ＆ゴー：間をあけずに巻き始める", "#e08a2a");
    if (ts > L && ts < L + 3) label(FTp(st.tp.x, FT_BOT + 0.02, FT_LZ), "着底", "スプールが一瞬止まる", fadeIn(ts, L), "gold ans", P ? 0 : 330, P ? -330 : -200);
    ftMini(-st.y, 1, false);
    ftCtl(st);
    if (!P) legend([TR_LEG[0]]);
    ftNote("タイラバは大きく表示。動きは簡単な物理モデルの計算");
  },
  // 等速巻き：k0 一定の速さでゆっくり → k1 水深の1/3〜1/2（約30回転）まで
  tr_reel(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 60, sim = ftRun("tr_main"), mk = sim.marks;
    const ts = mk.go + (k >= 1 ? 6 + (t - (s._k1 ?? 0)) * 3.2 : t * 0.9);
    const st = trRig2(T, sim, Math.min(ts, mk.go + 40), { trail: 2.5, vis: 2.5 });
    trMadai(0, st.tp, 0.55 + 0.2 * Math.sin(t * 0.7), T, { cm: 50 });
    trBand(FT_BOT + 23, 1);
    ftCam(sim, Math.min(ts, mk.go + 40), 1.7, { dy: -0.25 });
    ftChip(k >= 1 ? "早送り：底から約20mまで" : "等速巻き：同じ速さで、ゆっくり", k >= 1 ? "#10345a" : "#e08a2a");
    ftMini(-st.y, 1, false);
    ftCtl(st);
    agGraph([[sim, "#e08a2a", "タイラバ"]], Math.min(ts, mk.go + 40), mk.go + 40, 1);
    if (!P) legend(TR_LEG);
    ftNote("動きは簡単な物理モデルの計算。マダイの動きはイメージ");
    drawBar(s);
  },
  // クイズ：アタリが来たら？ k0 問い → k1 選択肢 → k2 答え（巻き続ける）
  tr_quiz(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 80, sim = ftRun("tr_bite"), mk = sim.marks, t2 = t - (s._k2 ?? 99);
    const ts = k >= 2 ? mk.n1 - 0.5 + Math.max(0, t2) : Math.min(t, mk.n1 - 0.6);
    const st = trRig2(T, sim, ts, { trail: 1.5, vis: 2.5 });
    const hooked = ts >= mk.hook;
    const nib = (ts > mk.n1 - 0.2 && ts < mk.n1 + 0.5) || (ts > mk.n2 - 0.2 && ts < mk.n2 + 0.5);
    trMadai(0, st.tp, nib ? 0.0 : 0.25, T, { cm: 50, freq: hooked ? 4 : 2.4, amp: hooked ? 0.16 : 0.09, side: -0.22, hooked });
    ftCam(sim, ts, 1.6, { dy: -0.25 });
    if (k <= 1) {
      html += `<div style="position:absolute;left:0;right:0;top:0;height:${P ? 900 : 420}px;background:linear-gradient(rgba(2,14,28,.72),rgba(2,14,28,0))"></div>`;
      html += `<div class="big" style="top:${P ? 260 : 130}px;font-size:${P ? 70 : 62}px">クイズ　アタリが来たら<br><span style="color:#ffd166">どうする？</span></div>`;
      if (k === 1) {
        const o = [["A", "すぐ竿を立てて合わせる"], ["B", "同じ速さで巻き続ける"]];
        html += `<div style="position:absolute;left:${P ? 120 : 560}px;top:${P ? 1000 : 400}px;width:${P ? 840 : 800}px">${o.map(([n, x], i) => `<div class="opt" style="opacity:${fadeIn(t - (s._k1 ?? 0), 0.2 + i * 0.35)}"><i>${n}</i>${x}</div>`).join("")}</div>`;
      }
    } else {
      if (nib) ftChip("アタリ！", "#3a6ea5");
      else if (hooked) ftChip("重さが乗った → 掛かった", "#2a9d5c");
      else ftChip("答え B：同じ速さで巻き続ける", "#e08a2a");
      label(FTp(st.tp.x, st.tp.y, FT_LZ), "答え B", "掛かったと確信できるまで、一定の速さで", fadeIn(t2, 0.3), "gold ans", P ? 0 : -380, P ? 330 : 60);
    }
    ftMini(-st.y, 1, false);
    ftCtl(st, 1, hooked ? ["掛かった", "#2a9d5c"] : null);
    ftNote("魚が引く力は仮の値。マダイの動きはイメージ");
    drawBar(s);
  },
  // 季節：春の乗っ込み（長く追う）と冬（追う距離が短い）
  tr_season(t, d, s, k) {
    ftBase();
    ftBoat.visible = false;
    const P = PORTRAIT, T = t + 100, sim = ftRun("tr_main"), mk = sim.marks;
    const ts = mk.go + 3 + (t % 8) * 0.3;
    const st = trRig2(T, sim, ts, { rod: false, vis: 3, lw: 3 });
    trMadai(0, st.tp, 0.25, T, { cm: 55, side: -0.3 });
    // 冬：追う距離が短い（底の近くにとどまる）。マダイの動きはイメージ
    const f = fkGet("madai", 2, 55);
    if (f) { fkPlace(f, FTp(st.tp.x + 1.2, FT_BOT + 0.75, FT_LZ - 0.3), Math.PI, 0.35, T, { freq: 1.6, amp: 0.07 }); ftShade(st.tp.x + 1.2, FT_LZ - 0.3, 0.5, 0.55); ftClear(0.5); }
    const cy = FT_BOT + 2.3;
    look(FTp(st.tp.x + 0.5, cy + 0.3, FT_LZ + (P ? 8 : 6)), FTp(st.tp.x + 0.5, cy, FT_LZ), 50);
    ftFlush();
    label(FTp(st.tp.x - 0.3, st.tp.y - 0.4, FT_LZ), "春（乗っ込み）", "長い距離を追う → 高めまで巻く", 1, "gold", P ? -60 : -320, -40);
    label(FTp(st.tp.x + 1.2, FT_BOT + 0.9, FT_LZ), "冬", "追う距離が短い → 釣れる層が狭い", fadeIn(t, 1.2), "", P ? 60 : 300, -150);
    ftNote("ダイワの解説（鹿児島・錦江湾の例）から。マダイの動きはイメージ。タイラバは大きく表示");
  },
  tr_safe(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 220, sim = ftRun("tr_main");
    trRig2(T, sim, sim.marks.go + 3);
    ftOthers(T, -64);
    if (P) look(FTp(-0.5, 5, 25), FTp(-0.5, 1.6, 0), 45);
    else look(FTp(1.0 + t * 0.06, 4.2, 15.5), FTp(-0.8, 1.7, 0), 45);
    ftFlush();
    const bob = ftSurf(0, T) * 0.5;
    if (k === 0) html += ftCard(P, `<b style="font-size:38px">重さや色は、<span style="color:#c2410c">船長・船宿</span>に聞く</b><div style="font-size:30px;font-weight:900;margin-top:8px">地域や日によって、釣れる色・重さが違う</div>`, fadeIn(t, 0.4), [70, 150, 880], [60, 270, 880]);
    if (k >= 1) {
      const a = fadeIn(t - (s._k1 ?? 99), 0.2);
      label(FTp(0, 1.15 + 1.2 + bob, 1.45), "ライフジャケット", "必ず着ける", a, "gold ans", P ? 0 : 420, P ? -330 : -230);
      html += ftCard(P, `<b style="font-size:38px">船の上では、ライフジャケットを必ず</b>`, a, [70, 150, 760], [60, 270, 880]);
    }
  },
  tr_sum(t, d, s, k) {
    ftBase();
    const P = PORTRAIT, T = t + 240, sim = ftRun("tr_main");
    trRig2(T, sim, sim.marks.go + 4 + (t % 20));
    ftOthers(T, -64);
    ftWide(t);
    ftFlush();
    html += acDim(0.5);
    const rows = [["重さ", "水深＝グラム数が目安", "底が取れる重さに", "#c2410c"], ["巻き方", "着底したらすぐ、同じ速さでゆっくり", "水深の1/3〜1/2まで（約30回転）", "#e08a2a"], ["アタリ", "合わせずに、巻き続ける", "掛かったと確信できるまで", "#2a9d5c"]];
    html += `<div class="big" style="top:${P ? 560 : 110}px;font-size:${P ? 66 : 64}px;opacity:${fadeIn(t, 0.1)}">タイラバ まとめ</div>`;
    rows.forEach(([a1, b1, c1, col], i) => {
      const a = fadeIn(t, 0.4 + i * 0.45);
      html += `<div class="card" style="left:${P ? 70 : 330}px;top:${(P ? 780 : 240) + i * (P ? 240 : 200)}px;width:${P ? 880 : 1200}px;padding:20px 30px;opacity:${a};transform:translateY(${(1 - a) * 30}px);display:flex;align-items:center;gap:26px"><b style="background:${col};color:#fff;font-size:${P ? 34 : 38}px;padding:10px 0;width:${P ? 200 : 220}px;text-align:center;border-radius:18px;flex:none">${a1}</b><div><div style="font-size:${P ? 38 : 44}px;font-weight:900">${b1}</div><div style="font-size:${P ? 27 : 30}px;color:#3a5a78">${c1}</div></div></div>`;
    });
  },
});

let lastShot = null;
window.ready = Promise.all(pending);
window.frame = function (o) {
  // o = { shot, t, d, s, k, T, cap, chapter, progress }
  U.time.value = o.T;
  html = "";
  lines = "";
  const fn = SHOTS[o.shot] || SHOTS.title;
  fn(o.t, o.d, o.s || {}, o.k ?? 0);
  rays.children.forEach((r, i) => (r.position.x = r.userData.x0 + Math.sin(o.T * 0.1 * r.userData.sp + i) * 4));
  rays.visible = U.night.value < 0.5 && U.under.value > 0.5;
  surface.visible = !hideSurface;
  hideSurface = false;
  snow.visible = U.under.value > 0.5;
  plankton.visible = U.night.value > 0.3;
  if (U.night.value < 0.3) plankton.material.uniforms.glow.value = 0;
  // 水中の色（夜は暗く）
  const fc = new THREE.Color(0x0d4a6e).lerp(new THREE.Color(0x020a16), U.night.value);
  scene.background = U.under.value > 0.5 ? fc : null;
  U.fogColor.value.copy(new THREE.Color(0x0d4a6e));
  if (POST) POST.render();
  else renderer.render(scene, camera);
  drawBar(o.s);
  if (o.s && o.s.pr) prBadge();
  if (o.chapter && !(PORTRAIT && o.s && o.s.bar)) html += `<div class="chapter"><b>${o.chapterNo ?? ""}</b><span>${o.chapter}</span></div>`;
  html += `<div class="logo">ツレドキ<i>関西</i></div>`;
  if (o.cap) html += `<div class="cap">${o.cap.replace(/\[\[(.+?)\]\]/g, '<em>$1</em>')}</div>`;
  if (o.dim > 0) html += `<div style="position:absolute;inset:0;background:#000;opacity:${o.dim}"></div>`;
  html += `<div style="position:absolute;left:0;bottom:0;height:8px;width:${(o.progress ?? 0) * 100}%;background:#f2b630"></div>`;
  layer.innerHTML = html;
  svg.innerHTML = lines;
  lastShot = o.shot;
  return true;
};
