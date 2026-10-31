// ツレドキCG：堤防の海の中を3Dで見せる。フレームごとに window.frame(...) を呼ぶと、その瞬間の絵を描く（時間で決まる＝何度描いても同じ絵）。
import * as THREE from "three";

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
{
  const r = rng(3);
  const bar = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.08, 7).rotateX(Math.PI / 2), shadedMat(0xd8d2c4, { rough: 0.3 }), 9000);
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
    const ang = t * 0.05;
    look(V(Math.sin(ang) * 26, -2.5, 36), V(0, -4.5, 6), 55);
    surfaceLife(t);
    midLife(t);
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
    const c = V(NC.x, -3.6, NC.z);
    updateBall(t, c, 2.4, 1, [], 1);
    updateRaiders(raiders, t * 0.35, c, 6, 2, 0);
    const ang = t * 0.1;
    look(V(c.x + Math.sin(ang) * 15, -3.8, c.z + Math.cos(ang) * 15), c, 55);
    const a = clamp01(t / 0.5);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,${0.45 * a})"></div>`;
    html += `<div class="big" style="top:520px;opacity:${a}"><div style="font-size:70px">くわしくは</div><div style="font-size:104px;color:#ffd166">フル版で公開中</div><div style="font-size:46px;margin-top:24px">${s.full || ""}</div><div style="margin-top:60px;font-size:92px">ツレドキ<span style="font-size:44px;border:4px solid #fff;border-radius:12px;padding:0 10px;margin-left:10px;vertical-align:16px">関西</span></div></div>`;
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
uniform float season; uniform float sun; uniform float time;
float Tsum(vec2 p){ return 20.0 + 8.0*smoothstep(-8.5,-3.0,p.y); }
float Twin(vec2 p){ return 8.0 + 4.5*smoothstep(-16.0,4.0,p.x) + 0.5*smoothstep(-4.0,-12.0,p.y); }
float temp(vec2 p){ p.x += sin(p.y*1.1+time*0.45)*0.5; p.y += sin(p.x*0.6-time*0.35)*0.25;
  float T = season < 1.0 ? mix(Tsum(p), 23.0, season) : mix(23.0, Twin(p), season-1.0);
  T += sun*6.5*(1.0-smoothstep(-15.0,-1.0,p.x))*smoothstep(-5.0,-0.5,p.y);
  return T; }
vec3 pal(float k){ k = clamp(k,0.,1.);
  vec3 c0=vec3(0.07,0.18,0.78), c1=vec3(0.08,0.62,0.95), c2=vec3(0.3,0.86,0.55), c3=vec3(1.0,0.78,0.2), c4=vec3(0.95,0.26,0.14);
  if(k<0.25) return mix(c0,c1,k/0.25); if(k<0.5) return mix(c1,c2,(k-0.25)/0.25); if(k<0.75) return mix(c2,c3,(k-0.5)/0.25); return mix(c3,c4,(k-0.75)/0.25); }
vec3 tcol(float T){ vec3 c = pal((T-8.0)/20.0); float f = T/2.0; float w = fwidth(f); float line = 1.0 - smoothstep(0.0, w*1.6, abs(fract(f+0.5)-0.5)); return mix(c, vec3(1.0), line*0.45); }`;
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
const WU = { season: { value: 0 }, sun: { value: 0 }, time: U.time };
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
      void main(){ vec3 c = tcol(temp(vL.xy)); float a = alpha;
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
function miniMap(kind, hi, a = 1) {
  const P = PORTRAIT;
  const L = P ? 40 : 70, T = P ? 230 : 140, S = P ? 250 : 270;
  const shapes = {
    pier: `<rect x="0" y="0" width="100" height="22" fill="#9aa59a"/><rect x="46" y="22" width="8" height="40" fill="#c9ced2"/><circle cx="50" cy="60" r="3" fill="#d23a2a"/>`,
    river: `<rect x="0" y="0" width="100" height="22" fill="#9aa59a"/><rect x="18" y="0" width="10" height="22" fill="#3f6f86"/>`,
    tetra: `<rect x="0" y="0" width="100" height="22" fill="#9aa59a"/>${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${40 + i * 8}" cy="${27 + (i % 2) * 3}" r="4" fill="#b8bcbe"/>`).join("")}`,
  };
  html += `<div style="position:absolute;left:${L}px;top:${T}px;width:${S}px;height:${S}px;opacity:${a};background:rgba(255,255,255,.92);border-radius:22px;padding:10px;box-shadow:0 6px 18px rgba(0,0,0,.3)">
    <div style="font-size:${P ? 24 : 22}px;font-weight:900;color:#10345a;margin:0 0 4px 6px">全体図</div>
    <svg viewBox="0 0 100 80" width="100%" height="${S - 60}px"><rect x="0" y="0" width="100" height="80" fill="#2b6f9e"/>${shapes[kind]}
    <path d="M6 70 L26 70" stroke="#fff" stroke-width="2.5" marker-end="url(#ah)"/><defs><marker id="ah" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#fff"/></marker></defs>
    <text x="30" y="73" font-size="7" fill="#fff" font-weight="700">潮の流れ</text>
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
    html += `<div class="big" style="top:${PORTRAIT ? 560 : 280}px;opacity:${a}"><span class="tag">ツレドキ3D</span><div style="font-size:${PORTRAIT ? 96 : 110}px;margin-top:26px">瀬戸内海のサワラは<br>なぜ戻ってきた？</div><div style="font-size:${PORTRAIT ? 46 : 52}px;color:#ffd166;margin-top:10px">水産庁・鳥取県の資料から</div></div>`;
  },
  sw_graph(t, d, s, k) {
    base(0);
    swBg(t + 10);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,0.55)"></div>`;
    const P = PORTRAIT;
    const W0 = P ? 940 : 1100, L0 = P ? 70 : 410, T0 = P ? 330 : 120;
    html += `<div style="position:absolute;left:${L0}px;top:${T0}px;width:${W0}px;background:rgba(255,255,255,.95);border-radius:28px;padding:26px 30px">${swChart(k + clamp01((t - (s["_k" + k] ?? 0)) / 1.2), false)}</div>`;
  },
  sw_plan(t, d, s, k) {
    base(0);
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
    swBg(t + 40);
    html += `<div style="position:absolute;inset:0;background:rgba(2,14,28,0.55)"></div>`;
    const P = PORTRAIT;
    html += `<div class="big" style="top:${P ? 280 : 110}px;font-size:${P ? 72 : 60}px">まとめ</div>`;
    [["資源量", "2000年 約1,500トン → 2010年 約4,600トン（約3倍）"], ["取り組み", "休漁・網の目・放流（2002〜2011年度）"], ["サゴシ", "とれたサワラの約8割は0〜1歳（鳥取県）"]].forEach(([a1, b1], i) => {
      const a = clamp01((t - 0.4 - i * 0.4) / 0.3);
      html += card(P ? 60 : 300, (P ? 470 : 250) + i * (P ? 220 : 170), P ? 880 : 1320, `<div style="display:flex;align-items:center;gap:22px"><b style="background:#1f6fb2;color:#fff;font-size:34px;padding:8px 16px;border-radius:14px;white-space:nowrap">${a1}</b><div style="font-size:${P ? 34 : 38}px;font-weight:900">${b1}</div></div>`, a, "padding:18px 24px");
    });
  },
});
// 資源量のグラフ（水産庁の資料）。step：0=2000年だけ、1=2010年まで、2=途中の年も
function swChart(step, small) {
  const data = [[2000, 1482], [2003, 3653], [2005, 2355], [2010, 4607]];
  const show = (y) => (y === 2000 ? step >= 0 : y === 2010 ? step >= 1 : step >= 2);
  const grow = (y) => (y === 2000 ? clamp01(step + 1) : y === 2010 ? clamp01(step) : clamp01(step - 1));
  const H = small ? 300 : PORTRAIT ? 560 : 400;
  const bars = data.map(([y, v]) => {
    const g = grow(y), on = show(y);
    const h = (v / 5000) * H * g;
    const col = y === 2000 ? "#e3412b" : y === 2010 ? "#2ecc71" : "#7fa3c2";
    return `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;opacity:${on ? 1 : 0.12}">
      <b style="font-size:${small ? 28 : 40}px;color:#10345a">${on ? Math.round(v * g).toLocaleString() : ""}</b>
      <div style="width:70%;height:${h}px;background:${col};border-radius:12px 12px 0 0"></div>
      <div style="font-size:${small ? 26 : 34}px;font-weight:900;color:#10345a;margin-top:6px">${y}年</div></div>`;
  }).join("");
  return `<div style="font-size:${small ? 30 : 38}px;font-weight:900;color:#10345a">瀬戸内海のサワラの資源量（トン）</div>
    <div style="display:flex;gap:12px;height:${H + 90}px;align-items:flex-end;margin-top:14px;border-bottom:4px solid #10345a">${bars}</div>
    ${step >= 1 && !small ? `<div style="font-size:${PORTRAIT ? 46 : 44}px;font-weight:900;color:#1e7a36;margin-top:14px;text-align:center">10年で約3倍に</div>` : ""}
    <div style="font-size:22px;color:#3a5a78;margin-top:8px">出典：水産庁「サワラ瀬戸内海系群資源回復計画の評価・総括」</div>`;
}

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

// ---------- 1フレーム描く ----------
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
  surface.visible = true;
  snow.visible = U.under.value > 0.5;
  plankton.visible = U.night.value > 0.3;
  if (U.night.value < 0.3) plankton.material.uniforms.glow.value = 0;
  // 水中の色（夜は暗く）
  const fc = new THREE.Color(0x0d4a6e).lerp(new THREE.Color(0x020a16), U.night.value);
  scene.background = U.under.value > 0.5 ? fc : null;
  U.fogColor.value.copy(new THREE.Color(0x0d4a6e));
  if (POST) POST.render();
  else renderer.render(scene, camera);
  if (o.chapter) html += `<div class="chapter"><b>${o.chapterNo ?? ""}</b><span>${o.chapter}</span></div>`;
  html += `<div class="logo">ツレドキ<i>関西</i></div>`;
  if (o.cap) html += `<div class="cap">${o.cap.replace(/\[\[(.+?)\]\]/g, '<em>$1</em>')}</div>`;
  if (o.dim > 0) html += `<div style="position:absolute;inset:0;background:#000;opacity:${o.dim}"></div>`;
  html += `<div style="position:absolute;left:0;bottom:0;height:8px;width:${(o.progress ?? 0) * 100}%;background:#f2b630"></div>`;
  layer.innerHTML = html;
  svg.innerHTML = lines;
  lastShot = o.shot;
  return true;
};
