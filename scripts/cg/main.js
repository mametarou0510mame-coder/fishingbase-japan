// ツレドキCG：堤防の海の中を3Dで見せる。フレームごとに window.frame(...) を呼ぶと、その瞬間の絵を描く（時間で決まる＝何度描いても同じ絵）。
import * as THREE from "three";

const W = 1920, H = 1080;
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 600);
const U = { time: { value: 0 }, night: { value: 0 }, under: { value: 1 }, fogDensity: { value: 0.035 }, fogColor: { value: new THREE.Color(0x0d4a6e) } };

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
        vec3 col = sand * (0.35 + 0.65*diff);
        col += vec3(0.9,1.0,1.0) * caust(vW.xz*0.9, time) * 0.22 * (1.0 - night);
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
    vertexShader: `uniform float time; varying vec3 vW; varying float vH;
      void main(){ vec3 p = position; float h = sin(p.x*0.18+time*1.1)*0.18 + sin(p.z*0.23-time*0.9)*0.16 + sin((p.x+p.z)*0.5+time*1.7)*0.05;
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
  const lx = p.x + dx, ly = p.y + dy;
  lines += `<line x1="${p.x}" y1="${p.y}" x2="${lx}" y2="${ly}" stroke="rgba(255,255,255,${0.85 * a})" stroke-width="3"/><circle cx="${p.x}" cy="${p.y}" r="${8 * a}" fill="rgba(255,255,255,${a})"/>`;
  html += `<div class="lab ${cls}" style="left:${lx}px;top:${ly}px;opacity:${a};transform:translate(-50%,-100%) scale(${0.85 + 0.15 * a})">${text}${sub ? `<small>${sub}</small>` : ""}</div>`;
}

// ---------- カメラ ----------
function look(pos, target, fov = 50) {
  camera.position.copy(pos);
  camera.fov = fov;
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
    html += `<div style="position:absolute;right:60px;top:120px;font-size:34px;font-weight:900;color:#fff;background:#e3412b;padding:6px 20px;border-radius:12px;opacity:${0.6 + 0.4 * Math.sin(t * 4)}">スロー再生</div>`;
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
  renderer.render(scene, camera);
  if (o.chapter) html += `<div class="chapter"><b>${o.chapterNo ?? ""}</b><span>${o.chapter}</span></div>`;
  html += `<div class="logo">ツレドキ<i>関西</i></div>`;
  if (o.cap) html += `<div class="cap">${o.cap}</div>`;
  if (o.dim > 0) html += `<div style="position:absolute;inset:0;background:#000;opacity:${o.dim}"></div>`;
  html += `<div style="position:absolute;left:0;bottom:0;height:8px;width:${(o.progress ?? 0) * 100}%;background:#f2b630"></div>`;
  layer.innerHTML = html;
  svg.innerHTML = lines;
  lastShot = o.shot;
  return true;
};
