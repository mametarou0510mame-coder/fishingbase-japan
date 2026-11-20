// Shrimp Kit (CC0 1.0). There is NO glb / FBX model, skeleton or animation clip for the shrimp: the shape is built in code from measurements, and every leg is moved by code (IK).
// With three.js, use this file as-is (see README.md). For any other engine, port this code: README.md "Other engines (porting guide)".
// エビは形を寸法からコードで作り、脚の 1 本ずつまでコードで動かすため、glb や FBX のモデルはありません。three.js ではこのファイルでそのまま動きます。ほかのエンジンではこのコードを移植してください（README.md）。
import * as THREE from "three";
var smooth = (a, b, x) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};
var lerp = (a, b, t) => a + (b - a) * t;
function table(rows) {
	return (t) => {
		if (t <= rows[0][0]) return rows[0][1];
		const n = rows.length;
		if (t >= rows[n - 1][0]) return rows[n - 1][1];
		let i = 0;
		while (i < n - 2 && t > rows[i + 1][0]) i++;
		const p0 = rows[Math.max(0, i - 1)][1];
		const p1 = rows[i][1];
		const p2 = rows[i + 1][1];
		const p3 = rows[Math.min(n - 1, i + 2)][1];
		const u = (t - rows[i][0]) / (rows[i + 1][0] - rows[i][0]);
		const u2 = u * u;
		const u3 = u2 * u;
		return .5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
	};
}
function loft(rings, seg = 28) {
	const nR = rings.length;
	const pos = [];
	const uv = [];
	for (let i = 0; i < nR; i++) {
		const r = rings[i];
		const e = 2 / (r.n ?? 2.3);
		for (let j = 0; j <= seg; j++) {
			const a = Math.PI + j / seg * Math.PI * 2;
			const c = Math.cos(a);
			const s = Math.sin(a);
			const yy = (c >= 0 ? r.ht : r.hb) * Math.sign(c) * Math.abs(c) ** e;
			const bottom = Math.max(0, -c);
			const zz = r.w * Math.sign(s) * Math.abs(s) ** e * (1 - (r.narrow ?? 0) * bottom * bottom);
			pos.push(r.x, (r.y ?? 0) + yy, (r.z ?? 0) + zz);
			uv.push(i / (nR - 1), j / seg);
		}
	}
	const idx = [];
	const row = seg + 1;
	for (let i = 0; i < nR - 1; i++) for (let j = 0; j < seg; j++) {
		const a = i * row + j;
		const b = a + row;
		idx.push(a, a + 1, b, b, a + 1, b + 1);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeVertexNormals();
	fixSeam(g, nR, seg);
	orientOutward(g, rings);
	return g;
}
function fixSeam(g, nR, seg) {
	const nrm = g.getAttribute("normal");
	const row = seg + 1;
	for (let i = 0; i < nR; i++) {
		const a = i * row;
		const b = a + seg;
		const x = nrm.getX(a) + nrm.getX(b);
		const y = nrm.getY(a) + nrm.getY(b);
		const z = nrm.getZ(a) + nrm.getZ(b);
		const l = Math.hypot(x, y, z) || 1;
		nrm.setXYZ(a, x / l, y / l, z / l);
		nrm.setXYZ(b, x / l, y / l, z / l);
	}
}
function orientOutward(g, rings) {
	const nR = rings.length;
	const mid = Math.floor(nR / 2);
	const nrm = g.getAttribute("normal");
	const seg = g.getAttribute("position").count / nR - 1;
	const top = mid * (seg + 1) + Math.round(seg / 2);
	if (nrm.getY(top) >= 0) return;
	const idx = g.getIndex();
	for (let k = 0; k < idx.count; k += 3) {
		const t = idx.getX(k + 1);
		idx.setX(k + 1, idx.getX(k + 2));
		idx.setX(k + 2, t);
	}
	for (let k = 0; k < nrm.count; k++) nrm.setXYZ(k, -nrm.getX(k), -nrm.getY(k), -nrm.getZ(k));
}
function article(len, r0, r1, opts = {}) {
	const nR = opts.rings ?? 6;
	const rings = [];
	const flat = opts.flat ?? 1;
	const knob = opts.knob ?? .12;
	for (let i = 0; i < nR; i++) {
		const t = i / (nR - 1);
		let r = lerp(r0, r1, t);
		r *= 1 + knob * Math.exp(-(((t - .04) / .07) ** 2)) - .08 * Math.exp(-(((t - .98) / .05) ** 2));
		if (i === 0 || i === nR - 1) r *= .55;
		rings.push({
			x: -t * len,
			ht: r,
			hb: r,
			w: r * flat,
			n: 2
		});
	}
	const g = loft(rings, opts.seg ?? 7);
	g.rotateY(Math.PI / 2);
	return g;
}
function ribbon(st, m = 10, bend) {
	const n = st.length;
	const ring = 2 * (m + 1);
	const pos = [];
	const uv = [];
	const v = new THREE.Vector3();
	for (let i = 0; i < n; i++) {
		const s = st[i];
		for (let side = 0; side < 2; side++) for (let k = 0; k <= m; k++) {
			const h01 = (side === 0 ? k : m - k) / m;
			const h = lerp(-s.bot, s.top, h01);
			const round = Math.max(.2, Math.sqrt(Math.max(0, 1 - (2 * h01 - 1) ** 2)) ** .4);
			const t = (side === 0 ? .5 : -.5) * s.th * round + (bend ? bend(h01, i) : 0);
			v.copy(s.p).addScaledVector(s.up, h).addScaledVector(s.side, t);
			pos.push(v.x, v.y, v.z);
			uv.push(i / (n - 1), h01);
		}
	}
	const idx = [];
	for (let i = 0; i < n - 1; i++) for (let k = 0; k < ring; k++) {
		const a = i * ring + k;
		const b = i * ring + (k + 1) % ring;
		const c = a + ring;
		const d = b + ring;
		idx.push(a, c, b, b, c, d);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeVertexNormals();
	const nrm = g.getAttribute("normal");
	const mid = Math.floor(n / 2) * ring + Math.floor(m / 2);
	if (new THREE.Vector3(nrm.getX(mid), nrm.getY(mid), nrm.getZ(mid)).dot(st[Math.floor(n / 2)].side) < 0) {
		const ix = g.getIndex();
		for (let k = 0; k < ix.count; k += 3) {
			const t = ix.getX(k + 1);
			ix.setX(k + 1, ix.getX(k + 2));
			ix.setX(k + 2, t);
		}
		for (let k = 0; k < nrm.count; k++) nrm.setXYZ(k, -nrm.getX(k), -nrm.getY(k), -nrm.getZ(k));
	}
	return g;
}
function leaf(len, width, th, opts = {}) {
	const n = opts.n ?? 18;
	const st = [];
	for (let i = 0; i < n; i++) {
		const t = i / (n - 1);
		const w = Math.max(.004, width(t));
		const sk = opts.skew ? opts.skew(t) : 0;
		st.push({
			p: new THREE.Vector3(sk, 0, t * len),
			up: new THREE.Vector3(1, 0, 0),
			side: new THREE.Vector3(0, 1, 0),
			top: w / 2,
			bot: w / 2,
			th: th * (1 - .6 * t)
		});
	}
	const cup = opts.cup ?? 0;
	return ribbon(st, opts.m ?? 8, (h01) => cup * (1 - (2 * h01 - 1) ** 2));
}
function fringe(edge, out, len, droop = new THREE.Vector3()) {
	const pos = [];
	const a = new THREE.Vector3();
	for (let i = 0; i < edge.length; i++) {
		const L = len(i);
		if (L <= 0) continue;
		a.copy(out[i]).normalize().multiplyScalar(L).addScaledVector(droop, L);
		pos.push(edge[i].x, edge[i].y, edge[i].z, edge[i].x + a.x, edge[i].y + a.y, edge[i].z + a.z);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	return g;
}
var FlexTube = class {
	n;
	radius;
	seg;
	geometry = new THREE.BufferGeometry();
	pos;
	nrm;
	constructor(n, radius, seg = 5) {
		this.n = n;
		this.radius = radius;
		this.seg = seg;
		const row = seg + 1;
		this.pos = new Float32Array(n * row * 3);
		this.nrm = new Float32Array(n * row * 3);
		const uv = new Float32Array(n * row * 2);
		for (let i = 0; i < n; i++) for (let j = 0; j <= seg; j++) uv.set([i / (n - 1), j / seg], (i * row + j) * 2);
		const idx = [];
		for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
			const a = i * row + j;
			const b = a + row;
			idx.push(a, a + 1, b, a + 1, b + 1, b);
		}
		this.geometry.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
		this.geometry.setAttribute("normal", new THREE.BufferAttribute(this.nrm, 3).setUsage(THREE.DynamicDrawUsage));
		this.geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
		this.geometry.setIndex(idx);
	}
	T = new THREE.Vector3();
	N = new THREE.Vector3(0, 1, 0);
	B = new THREE.Vector3();
	d = new THREE.Vector3();
	set(pts, hint = new THREE.Vector3(0, 1, 0)) {
		const { n, seg } = this;
		const row = seg + 1;
		const T = this.T;
		const N = this.N.copy(hint);
		const B = this.B;
		for (let i = 0; i < n; i++) {
			const p = pts[i];
			if (i < n - 1) T.subVectors(pts[i + 1], p);
			else T.subVectors(p, pts[i - 1]);
			T.normalize();
			N.addScaledVector(T, -N.dot(T)).normalize();
			B.crossVectors(T, N);
			const r = this.radius(i / (n - 1));
			for (let j = 0; j <= seg; j++) {
				const a = j / seg * Math.PI * 2;
				const c = Math.cos(a);
				const s = Math.sin(a);
				this.d.set(N.x * c + B.x * s, N.y * c + B.y * s, N.z * c + B.z * s);
				const k = (i * row + j) * 3;
				this.pos[k] = p.x + this.d.x * r;
				this.pos[k + 1] = p.y + this.d.y * r;
				this.pos[k + 2] = p.z + this.d.z * r;
				this.nrm[k] = this.d.x;
				this.nrm[k + 1] = this.d.y;
				this.nrm[k + 2] = this.d.z;
			}
		}
		this.geometry.attributes.position.needsUpdate = true;
		this.geometry.attributes.normal.needsUpdate = true;
		this.geometry.computeBoundingSphere();
	}
};
function rng(seed) {
	let s = seed >>> 0 || 1;
	return () => {
		s ^= s << 13;
		s ^= s >>> 17;
		s ^= s << 5;
		return (s >>> 0) % 1e9 / 1e9;
	};
}
var tex = null;
function featherTexture() {
	if (tex) return tex;
	const W = 256;
	const H = 512;
	const cv = document.createElement("canvas");
	cv.width = W;
	cv.height = H;
	const c = cv.getContext("2d");
	const r = rng(5);
	c.clearRect(0, 0, W, H);
	c.lineCap = "round";
	for (let pass = 0; pass < 2; pass++) for (let y = 18; y < 506; y += pass ? 2.2 : 3.1) {
		const t = y / H;
		const env = Math.sin(Math.PI * Math.min(1, .08 + t * .95)) ** .7 * (1 - .35 * t);
		for (const s of [1, -1]) {
			const L = (W / 2 - 10) * env * (.55 + .45 * r());
			if (L < 6) continue;
			const x0 = W / 2 + s * (3 + r() * 2);
			const ang = .55 + .35 * r() + t * .3;
			const x1 = W / 2 + s * L;
			const y1 = y + L * Math.tan(ang) * .75;
			const cx = W / 2 + s * L * .45;
			const cy = y + L * .15;
			c.strokeStyle = `rgba(255,255,255,${(pass ? .18 : .32) + r() * .2})`;
			c.lineWidth = pass ? .8 : 1.1;
			c.beginPath();
			c.moveTo(x0, y);
			c.quadraticCurveTo(cx, cy, x1, Math.min(510, y1));
			c.stroke();
		}
	}
	const g = c.createLinearGradient(0, 0, W, 0);
	g.addColorStop(.3, "rgba(255,255,255,0)");
	g.addColorStop(.5, "rgba(255,255,255,0.18)");
	g.addColorStop(.7, "rgba(255,255,255,0)");
	c.fillStyle = g;
	c.fillRect(0, 10, W, 492);
	tex = new THREE.CanvasTexture(cv);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = 8;
	return tex;
}
function featherCard(len, width) {
	const g = new THREE.PlaneGeometry(width, len, 1, 6);
	g.translate(0, -len / 2, 0);
	return g;
}
function featherMaterial(color, opacity) {
	return new THREE.MeshStandardMaterial({
		map: featherTexture(),
		color,
		transparent: true,
		opacity,
		depthWrite: false,
		side: THREE.DoubleSide,
		roughness: .6
	});
}
var dX$1 = (d) => 4.4 - d;
var SIDE$1 = [
	[
		1.45,
		7.45,
		7.3
	],
	[
		1.55,
		7.85,
		6.95
	],
	[
		1.8,
		8.11,
		6.71
	],
	[
		2,
		8.27,
		6.38
	],
	[
		2.2,
		8.42,
		6.13
	],
	[
		2.5,
		8.53,
		5.91
	],
	[
		2.8,
		8.62,
		5.73
	],
	[
		3,
		8.69,
		5.56
	],
	[
		3.2,
		8.78,
		5.4
	],
	[
		3.5,
		8.84,
		5.25
	],
	[
		3.8,
		8.91,
		5.13
	],
	[
		4,
		8.96,
		5
	],
	[
		4.2,
		9,
		4.89
	],
	[
		4.5,
		9.02,
		4.78
	],
	[
		4.8,
		9.05,
		4.69
	],
	[
		5,
		9.07,
		4.62
	],
	[
		5.5,
		9.07,
		4.5
	],
	[
		6,
		9.05,
		4.42
	],
	[
		6.5,
		9.02,
		4.38
	],
	[
		7,
		8.98,
		4.38
	],
	[
		7.5,
		8.84,
		4.38
	],
	[
		8,
		8.69,
		4.42
	],
	[
		8.5,
		8.56,
		4.49
	],
	[
		8.8,
		8.6,
		4.5
	],
	[
		9.2,
		8.71,
		4.3
	],
	[
		9.8,
		8.75,
		4.2
	],
	[
		10.2,
		8.78,
		4.27
	],
	[
		10.8,
		8.95,
		4.33
	],
	[
		11.5,
		9.13,
		4.35
	],
	[
		12.2,
		9.2,
		4.47
	],
	[
		12.8,
		9.33,
		4.6
	],
	[
		13.2,
		9.36,
		4.82
	],
	[
		13.8,
		9.31,
		4.89
	],
	[
		14.5,
		9.2,
		5
	],
	[
		15,
		9.13,
		5.25
	],
	[
		15.5,
		9.02,
		5.42
	],
	[
		16.2,
		8.98,
		5.55
	],
	[
		16.8,
		8.96,
		5.8
	],
	[
		17.2,
		8.87,
		5.95
	],
	[
		17.8,
		8.8,
		6.15
	],
	[
		18.2,
		8.84,
		6.45
	],
	[
		18.8,
		8.78,
		6.55
	],
	[
		19.5,
		8.67,
		6.62
	],
	[
		20,
		8.6,
		6.67
	],
	[
		20.5,
		8.45,
		6.58
	],
	[
		21,
		8.2,
		6.51
	],
	[
		21.5,
		7.95,
		6.44
	],
	[
		22,
		7.75,
		6.42
	],
	[
		22.3,
		7.66,
		6.42
	],
	[
		22.45,
		7.3,
		6.75
	]
];
var TOP$1 = [
	[1.45, .4],
	[1.55, .7],
	[1.8, .85],
	[2.2, .93],
	[2.5, 1],
	[2.8, 1.23],
	[3, 1.42],
	[3.5, 1.63],
	[4, 1.77],
	[4.5, 1.88],
	[5, 1.97],
	[5.5, 2.06],
	[6, 2.11],
	[6.5, 2.14],
	[7, 2.15],
	[7.5, 2.12],
	[8, 2.08],
	[8.5, 2],
	[9, 1.95],
	[9.5, 1.98],
	[10, 1.96],
	[10.5, 1.91],
	[11, 1.94],
	[11.5, 1.95],
	[12, 1.92],
	[12.5, 1.86],
	[13, 1.83],
	[13.5, 1.84],
	[14, 1.82],
	[14.5, 1.75],
	[15, 1.62],
	[15.5, 1.59],
	[16, 1.53],
	[16.5, 1.42],
	[17, 1.33],
	[17.5, 1.3],
	[18, 1.23],
	[18.5, 1.08],
	[19, 1.06],
	[19.5, .98],
	[20, .91],
	[20.5, .86],
	[21, .81],
	[21.5, .75],
	[22, .7],
	[22.3, .66],
	[22.45, .35]
];
var topAt$1 = table(SIDE$1.map((r) => [r[0], r[1]]));
var botAt$1 = table(SIDE$1.map((r) => [r[0], r[2]]));
var halfW$1 = table(TOP$1);
var bodyTop$1 = topAt$1;
var bodyBot$1 = botAt$1;
var SEG_D$1 = [
	8.75,
	10.9,
	13.6,
	16.15,
	18,
	19.8,
	22.3
];
var SHELL_D0$1 = 1.45;
var SHELL_D1$1 = 22.45;
var axisY$1 = (d) => botAt$1(d) + .4 * (topAt$1(d) - botAt$1(d));
var hingeObj$1 = (d) => new THREE.Vector3(dX$1(d), topAt$1(d) - .15 * (topAt$1(d) - botAt$1(d)), 0);
var sm$1 = (t) => {
	const x = Math.min(1, Math.max(0, t));
	return x * x * (3 - 2 * x);
};
var TUCK$1 = .8;
var PLEURA2$1 = {
	fwd: .85,
	back: .6
};
function pieceRange$1(k) {
	return [k === 0 ? SHELL_D0$1 : SEG_D$1[k - 1], k === 6 ? SHELL_D1$1 : SEG_D$1[k]];
}
function sectionPoint$1(d0, a, scale, out, remap) {
	let d = d0;
	if (remap) {
		const t0 = topAt$1(d0);
		const b0 = botAt$1(d0);
		const ax0 = axisY$1(d0);
		const c0 = Math.cos(a);
		d = remap((ax0 + (c0 >= 0 ? t0 - ax0 : ax0 - b0) * Math.sign(c0) * Math.abs(c0) ** (2 / 2.7) - b0) / Math.max(.01, t0 - b0));
	}
	const t = topAt$1(d);
	const b = botAt$1(d);
	const ax = axisY$1(d);
	const ht = t - ax;
	const hb = ax - b;
	const w = halfW$1(d);
	const narrow = lerp(.12, .28, sm$1((d - 8.2) / 1.2));
	const e = 2 / 2.7;
	const c = Math.cos(a);
	const s = Math.sin(a);
	const yy = (c >= 0 ? ht : hb) * Math.sign(c) * Math.abs(c) ** e;
	const bottom = Math.max(0, -c);
	const zz = w * Math.sign(s) * Math.abs(s) ** e * (1 - narrow * bottom * bottom);
	const f = scale((ax + yy - b) / Math.max(.01, t - b), d);
	out.push(dX$1(d), ax + yy * f, zz * f);
}
function shellGeometry$1(fine = .07, coarse = .25, seg = 28) {
	const pos = [];
	const uv = [];
	const si = [];
	const sw = [];
	const idx = [];
	const row = seg + 1;
	const tmp = [];
	for (let k = 0; k <= 6; k++) {
		const [A, Bd] = pieceRange$1(k);
		const front = k === 0 ? A : A - (k === 2 ? Math.max(TUCK$1, PLEURA2$1.fwd) : TUCK$1);
		const back = k === 2 ? Bd + PLEURA2$1.back : Bd;
		const ds = [];
		for (let d = front; d < back;) {
			ds.push(d);
			const near = d > A - .08 && d < A + .15 || d > Bd - .2;
			const nextEdge = d < A - .08 ? A - .08 : d < Bd - .2 ? Bd - .2 : back;
			d += near ? fine : Math.min(coarse, Math.max(fine, nextEdge - d));
		}
		ds.push(back);
		const nR = ds.length;
		const base = pos.length / 3;
		for (let i = 0; i < nR; i++) {
			const d = ds[i];
			const first = i === 0;
			const last = i === nR - 1;
			const skirt = (h01) => sm$1((.4 - h01) / .1);
			const arc = (h01, R) => R * Math.sqrt(Math.max(0, 1 - (h01 / .5) ** 2));
			const rearRound = (h01) => .45 * (1 - Math.min(1, h01 / .42)) ** 1.6;
			const sk = (h01) => h01 < .5 ? 1 : 0;
			const remap = (h01) => {
				if (k === 2 && d < A) return Math.max(d, A - arc(h01, PLEURA2$1.fwd) * sk(h01));
				if (k === 2 && d > Bd) return Math.min(d, Bd + arc(h01, PLEURA2$1.back) * sk(h01));
				if (k >= 1 && k <= 5 && k !== 2 && d > Bd - .5 && h01 < .42) return Math.min(d, Bd - rearRound(h01));
				return d;
			};
			const scale = (h01) => {
				let f = 1;
				if (d < A) {
					f = k === 2 ? lerp(.9, 1.03, skirt(h01)) : .93;
					if (first) f *= k === 2 ? lerp(.92, 1, skirt(h01)) : .92;
				} else if (d > Bd) {
					f = lerp(.88, 1.03, skirt(h01));
					if (last) f *= lerp(.92, 1, skirt(h01));
				} else {
					f = 1 + .015 * sm$1((d - (Bd - .14)) / .1);
					if (k === 2 && d > Bd - .14) f = lerp(f, 1.03, skirt(h01));
					if (last && k !== 2) f *= k === 6 ? .2 : .9;
				}
				if (k === 0 && first) f = .05;
				return f;
			};
			for (let j = 0; j <= seg; j++) {
				const a = Math.PI + j / seg * Math.PI * 2;
				tmp.length = 0;
				sectionPoint$1(d, a, scale, tmp, remap);
				pos.push(tmp[0], tmp[1], tmp[2]);
				uv.push(i / (nR - 1), j / seg);
				si.push(k, 0, 0, 0);
				sw.push(1, 0, 0, 0);
			}
		}
		for (let i = 0; i < nR - 1; i++) for (let j = 0; j < seg; j++) {
			const q = base + i * row + j;
			const r = q + row;
			idx.push(q, r, q + 1, q + 1, r, r + 1);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
	g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
	g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
	g.setIndex(idx);
	g.computeVertexNormals();
	const nrm = g.getAttribute("normal");
	for (let q = 0; q < nrm.count; q += row) {
		const b = q + seg;
		const v = new THREE.Vector3(nrm.getX(q) + nrm.getX(b), nrm.getY(q) + nrm.getY(b), nrm.getZ(q) + nrm.getZ(b)).normalize();
		nrm.setXYZ(q, v.x, v.y, v.z);
		nrm.setXYZ(b, v.x, v.y, v.z);
	}
	const mid = 30 * row + Math.round(seg / 2);
	if (nrm.getY(mid) < 0) {
		const ix = g.getIndex();
		for (let q = 0; q < ix.count; q += 3) {
			const tq = ix.getX(q + 1);
			ix.setX(q + 1, ix.getX(q + 2));
			ix.setX(q + 2, tq);
		}
		for (let q = 0; q < nrm.count; q++) nrm.setXYZ(q, -nrm.getX(q), -nrm.getY(q), -nrm.getZ(q));
	}
	return g;
}
var V3$1 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
var clamp$1 = THREE.MathUtils.clamp;
var Z$1 = new THREE.Vector3(0, 0, 1);
var aim$1 = (m, dir) => m.quaternion.setFromUnitVectors(Z$1, dir.clone().normalize());
var H0$1 = 6.8;
var TILT$1 = 0;
var KNEE_X$1 = [
	-.2,
	.1,
	.3
];
var STRIDE$1 = 2;
var DUTY$1 = .6;
var LEGS$1 = [
	{
		d: 3.6,
		len: [
			.3,
			.3,
			.9,
			1.9,
			1,
			.9,
			.6
		],
		r: .14,
		chela: true,
		home: [1.8, .8]
	},
	{
		d: 4.4,
		len: [
			.35,
			.3,
			1.1,
			2.6,
			2.3,
			.9,
			.6
		],
		r: .12,
		chela: true,
		home: [2.6, 1.6]
	},
	{
		d: 5.5,
		len: [
			.4,
			.35,
			1.1,
			3,
			1.5,
			2.4,
			.8
		],
		r: .165,
		chela: false,
		home: [2.6, 5.4]
	},
	{
		d: 7.3,
		len: [
			.4,
			.35,
			1.1,
			3,
			1.5,
			2.5,
			.85
		],
		r: .165,
		chela: false,
		home: [-3.5, 6.3]
	},
	{
		d: 9,
		len: [
			.4,
			.35,
			1,
			2.8,
			1.4,
			2.4,
			.8
		],
		r: .155,
		chela: false,
		home: [-7.8, 4.8]
	}
];
function clayMaterials$1() {
	const m = new THREE.MeshStandardMaterial({
		color: 10263708,
		roughness: .55
	});
	return {
		shell: new THREE.MeshStandardMaterial({
			color: 10263708,
			roughness: .55,
			side: THREE.DoubleSide
		}),
		app: m,
		plate: new THREE.MeshStandardMaterial({
			color: 10263708,
			roughness: .55,
			side: THREE.DoubleSide
		}),
		eye: new THREE.MeshStandardMaterial({
			color: 3158064,
			roughness: .3
		}),
		setae: new THREE.LineBasicMaterial({
			color: 12303291,
			transparent: true,
			opacity: .6
		}),
		inner: m,
		feather: featherMaterial(10263708, .9)
	};
}
var Leg$1 = class {
	def;
	side;
	index;
	arts = [];
	target = V3$1();
	planted = new THREE.Vector3();
	state = "stance";
	swingT = 0;
	swingDur = .2;
	swingFromW = V3$1();
	swingToW = V3$1();
	phaseOff = 0;
	lastPhase = 0;
	airFrom = V3$1();
	airK = 0;
	open = .3;
	fingers = [];
	attach;
	L1;
	link2;
	chord = 0;
	chordAng = 0;
	reach = 0;
	constructor(def, side, index) {
		this.def = def;
		this.side = side;
		this.index = index;
		this.attach = V3$1(dX$1(def.d), -2.15, side * (.45 + index * .07));
		if (!def.chela) {
			const groupA = index === 3 === side < 0;
			this.phaseOff = (groupA ? 0 : .5) + (4 - index) * .07;
		}
		const l = def.len;
		this.L1 = l[2] + l[3];
		const bends = def.chela ? [
			.18,
			-.22,
			-.3
		] : [
			.22,
			-.08,
			-.38
		];
		this.link2 = [
			{
				dir: bends[0],
				len: l[4]
			},
			{
				dir: bends[1],
				len: l[5]
			},
			{
				dir: bends[2],
				len: l[6]
			}
		];
		let cx = 0;
		let cy = 0;
		for (const a of this.link2) {
			cx += Math.cos(a.dir) * a.len;
			cy += Math.sin(a.dir) * a.len;
		}
		this.chord = Math.hypot(cx, cy);
		this.chordAng = Math.atan2(cy, cx);
		this.reach = l[0] + l[1] + this.L1 + this.chord;
	}
};
var Shrimp = class {
	object = new THREE.Group();
	B = new THREE.Bone();
	somites = [];
	telson = new THREE.Bone();
	shell;
	shellFar;
	merged = null;
	uropods = [];
	legs = [];
	pleopods = [];
	whips = [];
	eyes = [];
	maxillipeds = [];
	scales = [];
	bodyMeshes = [];
	appMeshes = [];
	plateMeshes = [];
	setaeLines = [];
	eyeMeshes = [];
	featherMeshes = [];
	mats;
	ground = 0;
	mode = "auto";
	act = "graze";
	actTime = 0;
	actLen = 8;
	time = 0;
	heading = 0;
	lift = 0;
	turn = 0;
	range = .035;
	fan = .5;
	curl = 0;
	rnd = rng(7);
	flipV = 0;
	constructor(mats = clayMaterials$1()) {
		this.mats = mats;
		this.object.scale.setScalar(.001);
		this.object.add(this.B);
		this.B.position.set(0, H0$1, 0);
		this.B.rotation.z = TILT$1;
		this.buildCarapace();
		this.buildAbdomen();
		this.buildHead();
		this.buildLegs();
		this.restPose();
		this.object.updateMatrixWorld(true);
		const skel = new THREE.Skeleton([
			this.B,
			...this.somites,
			this.telson
		]);
		this.shell.bind(skel, this.shell.matrixWorld);
		this.shellFar.bind(skel, this.shellFar.matrixWorld);
	}
	addBody(parent, g, part = "body") {
		const m = new THREE.Mesh(g, this.mats.shell);
		m.castShadow = true;
		m.receiveShadow = true;
		m.userData.part = part;
		parent.add(m);
		this.bodyMeshes.push(m);
		return m;
	}
	addPlate(parent, g) {
		const m = new THREE.Mesh(g, this.mats.shell);
		m.castShadow = true;
		m.receiveShadow = true;
		parent.add(m);
		this.bodyMeshes.push(m);
		return m;
	}
	addApp(parent, g, part = "leg", kind = "", art = 0, leg = 0) {
		const m = new THREE.Mesh(g, this.mats.app);
		m.castShadow = true;
		m.userData = {
			part,
			kind,
			art,
			leg
		};
		parent.add(m);
		this.appMeshes.push(m);
		return m;
	}
	addFeather(parent, g) {
		const m = new THREE.Mesh(g, this.mats.feather);
		m.renderOrder = 2;
		parent.add(m);
		this.featherMeshes.push(m);
		return m;
	}
	addSetae(parent, g) {
		const l = new THREE.LineSegments(g, this.mats.setae);
		parent.add(l);
		this.setaeLines.push(l);
		return l;
	}
	buildCarapace() {
		const shell = new THREE.SkinnedMesh(shellGeometry$1(), this.mats.shell);
		shell.castShadow = true;
		shell.receiveShadow = true;
		shell.frustumCulled = false;
		shell.userData.part = "shell";
		this.object.add(shell);
		this.bodyMeshes.push(shell);
		this.shell = shell;
		const far = new THREE.SkinnedMesh(shellGeometry$1(.2, .8, 12), this.mats.shell);
		far.castShadow = true;
		far.receiveShadow = true;
		far.frustumCulled = false;
		far.visible = false;
		far.userData.part = "shell";
		this.object.add(far);
		this.bodyMeshes.push(far);
		this.shellFar = far;
		const st = [];
		const N = 70;
		const D0 = 4.2;
		const D1 = -.4;
		for (let i = 0; i < N; i++) {
			const d = lerp(D0, D1, i / 69);
			const x = dX$1(d);
			const free = smooth(2.9, 2.2, d);
			const back = bodyTop$1(Math.max(d, 1.5)) - H0$1;
			const topY = lerp(Math.max(back, 2.15), 2.2 - .12 * smooth(1, D1, d), free);
			let tooth = 0;
			if (d > -.25 && d < 3.2) {
				const k = (3.2 - d) / 3.6 * 17;
				const f = k - Math.floor(k);
				tooth = lerp(.07, .045, (3.2 - d) / 3.6) * (f < .75 ? f / .75 : (1 - f) / .25) ** 1.3;
			}
			const depth = lerp(Math.max(.5, topY - (back - .3)), lerp(.38, .06, smooth(1.5, D1, d)), free);
			st.push({
				p: V3$1(x, topY - .2, 0),
				up: V3$1(0, 1, 0),
				side: V3$1(0, 0, 1),
				top: .2 + tooth + .02,
				bot: depth - .2,
				th: lerp(.45, lerp(.16, .05, smooth(2, D1, d)), free)
			});
		}
		st[69].top = .02;
		st[69].bot = .02;
		this.addApp(this.B, ribbon(st, 4), "plate", "rostrum");
	}
	buildAbdomen() {
		let parent = this.B;
		let prev = V3$1(0, H0$1, 0);
		for (let k = 0; k < 6; k++) {
			const h = hingeObj$1(SEG_D$1[k]);
			const b = new THREE.Bone();
			b.position.copy(h).sub(prev);
			parent.add(b);
			this.somites.push(b);
			parent = b;
			prev = h;
			if (k < 5) for (const side of [1, -1]) this.buildPleopod(b, k, side);
		}
		const ht = hingeObj$1(SEG_D$1[6]);
		this.telson.position.copy(ht).sub(prev);
		this.somites[5].add(this.telson);
		const T = [
			[
				22.1,
				7.7,
				6.8,
				.6
			],
			[
				23,
				7.65,
				7.05,
				.5
			],
			[
				24,
				7.55,
				7.12,
				.4
			],
			[
				25,
				7.42,
				7.15,
				.27
			],
			[
				25.7,
				7.33,
				7.18,
				.15
			],
			[
				25.95,
				7.27,
				7.22,
				.03
			]
		];
		const tr = [];
		const tf = (k) => table(T.map((r) => [r[0], r[k]]));
		for (let i = 0; i <= 16; i++) {
			const d = lerp(22.1, 25.95, i / 16);
			const top = tf(1)(d);
			const bot = tf(2)(d);
			const ax = (top + bot) / 2;
			tr.push({
				x: dX$1(d),
				y: ax,
				ht: Math.max(.02, top - ax),
				hb: Math.max(.02, ax - bot),
				w: Math.max(.02, tf(3)(d)),
				n: 2.6,
				narrow: .1
			});
		}
		const tg = loft(tr, 16);
		tg.translate(-ht.x, -ht.y, 0);
		this.addBody(this.telson, tg, "telson");
		const tipE = [];
		const tipO = [];
		for (let i = 0; i < 9; i++) {
			const a = lerp(-.9, .9, i / 8);
			tipE.push(V3$1(dX$1(25.9) - ht.x, 7.25 - ht.y, Math.sin(a) * .1));
			tipO.push(V3$1(-1, .05, Math.sin(a) * 1.2));
		}
		this.addSetae(this.telson, fringe(tipE, tipO, (i) => i % 2 ? .4 : .28));
		for (const side of [1, -1]) {
			const u = new THREE.Group();
			u.position.set(dX$1(22.45) - ht.x, 6.95 - ht.y, side * .45);
			this.telson.add(u);
			const prot = this.addBody(u, article(.6, .3, .26, { flat: .7 }), "uropod");
			prot.rotation.y = -Math.PI / 2 + side * .4;
			for (const p of [{
				len: 3.4,
				w: 1.05,
				yaw: .1,
				y: .06,
				outer: false
			}, {
				len: 3.6,
				w: 1.3,
				yaw: .3,
				y: -.06,
				outer: true
			}]) {
				const r = new THREE.Group();
				r.position.set(-.25, 0, side * .12);
				r.userData = {
					yaw: p.yaw,
					side
				};
				u.add(r);
				const width = (t) => p.w * Math.sin(Math.PI * Math.min(1, .03 + t * .99)) ** .42 * (.55 + .45 * Math.min(1, t * 2.5)) * (1 - .12 * t * t);
				const skew = (t) => -side * (p.outer ? .2 : .1) * Math.sin(Math.PI * t);
				const g = leaf(p.len, width, .1, {
					skew,
					n: 14,
					m: 6,
					cup: .05
				});
				const lm = this.addPlate(r, g);
				lm.position.y = p.y;
				const e = [];
				const o = [];
				for (let i = 0; i <= 30; i++) {
					const t = .35 + i / 30 * .65;
					const w = width(t) / 2;
					const x = skew(t);
					for (const sd of [1, -1]) {
						if (p.outer && sd === side * -1 && t < .85) continue;
						e.push(V3$1(x + sd * w, p.y, t * p.len));
						o.push(V3$1(sd * 1, 0, .6 + t));
					}
				}
				this.addSetae(r, fringe(e, o, (i) => .24 + .1 * Math.sin(i * 1.7)));
				this.uropods.push(r);
			}
		}
	}
	buildPleopod(seg, k, side) {
		const sc = k === 0 ? .8 : k === 4 ? .85 : 1;
		const g = new THREE.Group();
		const dm = (SEG_D$1[k] + SEG_D$1[k + 1]) / 2;
		g.position.copy(V3$1(dX$1(dm), bodyBot$1(dm) + 1.3, side * .45).sub(hingeObj$1(SEG_D$1[k])));
		seg.add(g);
		const pl = .7 * sc;
		const prot = this.addApp(g, article(pl, .17 * sc, .12 * sc, { flat: .7 }), "leg", "pleoProt");
		prot.rotation.x = Math.PI / 2;
		const rami = [];
		const rr = rng(k * 13 + (side > 0 ? 1 : 2));
		for (const [i, len] of [[0, 1.55 * sc], [1, 1.35 * sc]]) {
			const r = new THREE.Group();
			r.position.set(0, -pl + .05, side * (i === 0 ? .07 : -.06));
			r.userData.splay = side * (i === 0 ? .22 : -.1);
			g.add(r);
			const shaft = this.addApp(r, article(len, .07 * sc, .025, {
				flat: .55,
				knob: 0,
				rings: 4,
				seg: 5
			}), "leg", "pleoRamus");
			shaft.rotation.x = Math.PI / 2;
			shaft.castShadow = false;
			const w = 1.35 * sc;
			for (const [rot, off] of [[0, 0], [1.15 + rr() * .3, .02]]) {
				const card = this.addFeather(r, featherCard(len * 1.08, w));
				card.position.set(0, -.08 - off, 0);
				card.rotation.y = rot * side;
			}
			rami.push(r);
		}
		g.userData.side = side;
		this.pleopods.push({
			group: g,
			rami,
			phase: k * .85
		});
	}
	buildHead() {
		const B = this.B;
		for (const side of [1, -1]) {
			const eg = new THREE.Group();
			eg.position.set(dX$1(3), 1.2, side * .55);
			B.add(eg);
			const to = V3$1(dX$1(2.05), 1.4, side * 1.28).clone().sub(eg.position);
			const sl = to.length() - .3;
			aim$1(this.addApp(eg, article(sl, .32, .3, { knob: 0 }), "stalk", "stalk"), to);
			const eye = new THREE.Mesh(new THREE.SphereGeometry(.45, 18, 12), this.mats.eye);
			eye.position.copy(to);
			eye.castShadow = true;
			eg.add(eye);
			this.eyeMeshes.push(eye);
			this.eyes.push(eg);
			const ag = new THREE.Group();
			ag.position.set(dX$1(2.6), 1.05, side * .33);
			B.add(ag);
			const dir = V3$1(1, -.04, side * .03).normalize();
			let p = V3$1();
			for (const [len, r0, r1, fl] of [
				[
					1.7,
					.36,
					.24,
					.55
				],
				[
					1.15,
					.17,
					.15,
					.9
				],
				[
					1.05,
					.14,
					.12,
					1
				]
			]) {
				const m = this.addApp(ag, article(len, r0, r1, { flat: fl }), "antenna", "a1ped");
				m.position.copy(p);
				aim$1(m, dir);
				p = p.clone().addScaledVector(dir, len * .97);
				dir.applyAxisAngle(V3$1(0, 0, 1), .01).normalize();
			}
			const sty = this.addApp(ag, article(.9, .12, .02, { knob: 0 }), "antenna", "sty");
			sty.position.set(.1, -.1, side * .25);
			aim$1(sty, V3$1(1, 0, side * .3));
			const pB = p.clone().add(ag.position);
			for (const kind of ["outer", "inner"]) {
				const len = kind === "outer" ? 7 : 6;
				const n = 26;
				const r0 = kind === "outer" ? .085 : .065;
				const tube = new FlexTube(n, (t) => lerp(r0, .018, t ** .7), 5);
				const mesh = this.addApp(this.object, tube.geometry, "antenna", "a1flag");
				mesh.frustumCulled = false;
				this.whips.push({
					tube,
					mesh,
					pts: Array.from({ length: n }, () => V3$1()),
					len,
					side,
					kind,
					base: pB.clone(),
					dir: dir.clone(),
					flick: 0,
					nextFlick: 1 + this.rnd() * 2
				});
			}
			const asp = this.addApp(B, article(.4, .07, .01, {
				knob: 0,
				rings: 5
			}), "antenna", "sty");
			asp.position.set(dX$1(2.3), .1, side * .85);
			aim$1(asp, V3$1(1, .05, side * .15));
			const base2 = this.addApp(B, article(1.4, .21, .16, { flat: .75 }), "antenna", "a2ped");
			base2.position.set(dX$1(2.8), .15, side * .6);
			aim$1(base2, V3$1(1, .02, side * .12));
			const sg = new THREE.Group();
			sg.position.set(dX$1(2.3), .4, side * .75);
			B.add(sg);
			const scW = (t) => .9 * Math.sin(Math.PI * Math.min(1, .06 + t * .97)) ** .55 * (1 - .3 * t);
			const SCL = 3.2;
			const scale = leaf(SCL, scW, .06, {
				n: 12,
				m: 5,
				skew: (t) => side * .1 * Math.sin(Math.PI * t),
				cup: .04
			});
			const sm = this.addApp(sg, scale, "plate", "scale");
			sm.rotation.set(0, Math.PI / 2 - side * .12, 0);
			sm.rotateZ(side * .35);
			sm.rotateX(-.04);
			this.scales.push(sg);
			{
				const e = [];
				const o = [];
				for (let j = 0; j <= 24; j++) {
					const t = .35 + j / 24 * .63;
					const w = scW(t) / 2;
					const sk = side * .1 * Math.sin(Math.PI * t);
					e.push(V3$1(sk - w, 0, t * SCL));
					o.push(V3$1(-1, 0, .5));
				}
				this.addSetae(sm, fringe(e, o, (j) => .22 + .08 * Math.sin(j * 2.1)));
			}
			const peds = this.addApp(sg, article(1.9, .15, .11), "antenna", "a2ped");
			peds.position.set(-.1, -.12, -side * .12);
			aim$1(peds, V3$1(1, 0, side * .05));
			const wb = V3$1(dX$1(.4), .5, side * .72);
			const n = 56;
			const tube = new FlexTube(n, (t) => lerp(.075, .012, t ** .5), 5);
			const mesh = this.addApp(this.object, tube.geometry, "antenna", "a2flag");
			mesh.frustumCulled = false;
			this.whips.push({
				tube,
				mesh,
				pts: Array.from({ length: n }, () => V3$1()),
				len: 24,
				side,
				kind: "antenna",
				base: wb,
				dir: V3$1(1, -.1, side * .25).normalize(),
				flick: 0,
				nextFlick: 0
			});
			const mx = [];
			let par = B;
			const mpos = [
				V3$1(dX$1(3.3), -.8, side * .35),
				V3$1(),
				V3$1()
			];
			const mlen = [
				1.6,
				1.4,
				1.3
			];
			const mrot = [
				[
					0,
					-side * .15,
					-.25
				],
				[
					0,
					0,
					.15
				],
				[
					0,
					0,
					.1
				]
			];
			for (let i = 0; i < 3; i++) {
				const j = new THREE.Group();
				j.position.copy(i === 0 ? mpos[0] : V3$1(mlen[i - 1], 0, 0));
				j.rotation.set(mrot[i][0], mrot[i][1], mrot[i][2]);
				par.add(j);
				const m = this.addApp(j, article(mlen[i], .13 - i * .025, .1 - i * .025), "leg", "mxp", i);
				m.rotation.y = Math.PI / 2;
				mx.push(j);
				par = j;
			}
			const e = [];
			const o = [];
			for (let i = 0; i < 36; i++) {
				e.push(V3$1(mlen[2] * (.1 + i / 36 * .9), .03, 0));
				o.push(V3$1(.7, i % 2 ? .9 : -.9, side * (.2 + i % 3 * .2)));
			}
			this.addSetae(par, fringe(e, o, (i) => .25 + .15 * (i * 7 % 5) / 5));
			this.maxillipeds.push(mx);
		}
	}
	buildLegs() {
		LEGS$1.forEach((def, i) => {
			for (const side of [1, -1]) {
				const leg = new Leg$1(def, side, i);
				const l = def.len;
				const r = def.r;
				const radii = def.chela ? [
					r * 1.1,
					r,
					r * .95,
					r,
					r * .85,
					r * 1.05,
					r * .55
				] : [
					r * 1.1,
					r * 1,
					r * .95,
					r * 1,
					r * .82,
					r * .7,
					r * .45
				];
				for (let k = 0; k < 7; k++) {
					if (def.chela && k === 6) break;
					const r0 = radii[k];
					const r1 = k === 6 ? .02 : (radii[k + 1] ?? r0 * .6) * (def.chela && k === 5 ? .85 : 1);
					const g = article(l[k], r0, k === 5 && !def.chela ? r1 * .9 : r1, {
						flat: k === 3 ? .8 : 1,
						rings: k >= 3 ? 6 : 4,
						knob: .05,
						seg: 6
					});
					const m = this.addApp(this.object, g, "leg", def.chela ? "chela" : "walk", k, i);
					m.matrixAutoUpdate = false;
					leg.arts.push({
						mesh: m,
						len: l[k]
					});
					if (k >= 3 && !(def.chela && k >= 5)) {
						const e = [];
						const o = [];
						const spine = !def.chela && k >= 5;
						const n = spine ? k === 5 ? 7 : 4 : Math.round(l[k] * 3.5);
						const rr = rng(i * 31 + k * 7 + (side > 0 ? 3 : 4));
						for (let j = 0; j < n; j++) {
							const t = (j + .3 + rr() * .4) / n;
							const a = spine ? Math.PI : rr() * Math.PI * 2;
							const rad = lerp(r0, r1, t) * .85;
							e.push(V3$1(Math.sin(a) * rad, Math.cos(a) * rad, t * l[k]));
							o.push(spine ? V3$1(0, -.7, 1) : V3$1(Math.sin(a) * .8, Math.cos(a) * .8, 1));
						}
						this.addSetae(m, fringe(e, o, () => spine ? k === 5 ? .18 : .12 : .12 + rr() * .1));
					}
				}
				if (def.chela) for (let f = 0; f < 2; f++) {
					const g = article(l[6], r * .5, .04, {
						rings: 5,
						knob: 0,
						seg: 5
					});
					const m = this.addApp(this.object, g, "leg", "finger", f, i);
					m.matrixAutoUpdate = false;
					leg.fingers.push(m);
					const e = [];
					const o = [];
					const n = 30;
					for (let j = 0; j < n; j++) {
						const a = lerp(-.8, .8, j / 29);
						const t = .55 + .45 * (j * 7 % n) / n;
						e.push(V3$1(0, (f ? -1 : 1) * .04, t * l[6]));
						o.push(V3$1(Math.sin(a) * .9, (f ? -1 : 1) * .5 * Math.cos(a), 1));
					}
					this.addSetae(m, fringe(e, o, (j) => .28 + .1 * Math.sin(j * 1.9)));
				}
				this.legs.push(leg);
			}
		});
	}
	restPose() {
		this.B.position.set(0, H0$1, 0);
		this.B.rotation.set(0, 0, TILT$1);
		this.somites.forEach((b) => b.rotation.set(0, 0, 0));
		this.telson.rotation.set(0, 0, 0);
		this.fan = .5;
		this.poseFan();
		this.object.updateMatrixWorld(true);
		for (const leg of this.legs) {
			leg.target.copy(this.homeOf(leg));
			if (leg.def.chela) leg.target.copy(this.chelaRest(leg));
			leg.planted.copy(leg.target.clone().applyMatrix4(this.object.matrix));
			leg.state = "stance";
		}
		this.lag = {
			x: 0,
			y: 0,
			z: 0,
			vx: 0,
			vy: 0,
			vz: 0,
			pitch: 0,
			roll: 0,
			yaw: 0,
			vp: 0,
			vr: 0,
			vyaw: 0
		};
		this.lift = 0;
		this.speed = 0;
		this.turn = 0;
		this.poseLegs();
		this.posePleopods(0, 0);
		this.poseWhips(0);
		this.merged?.sync();
		this.object.updateMatrixWorld(true);
	}
	homeOf(leg) {
		const off = leg.side > 0 ? [
			.7,
			-.6,
			.5
		][leg.index - 2] ?? 0 : 0;
		return V3$1(leg.def.home[0] + off, 0, leg.side * (leg.def.home[1] + (leg.side > 0 ? .3 : 0)));
	}
	chelaRest(leg) {
		const p = leg.index === 0 ? V3$1(dX$1(-.5), -3.6, leg.side * 2.4) : V3$1(dX$1(-1.6), -3.35, leg.side * 3);
		this.B.updateMatrix();
		return p.applyMatrix4(this.B.matrix);
	}
	poseFan() {
		for (const u of this.uropods) {
			const { yaw, side } = u.userData;
			const a = yaw * lerp(.35, 1.9, this.fan);
			u.rotation.set(0, -Math.PI / 2 + side * a, 0);
			u.rotateX(.15);
			u.rotateZ(-side * .3);
		}
	}
	bInv = new THREE.Matrix4();
	poseLegs() {
		this.B.updateMatrix();
		const Bm = this.B.matrix;
		const q = new THREE.Quaternion().setFromRotationMatrix(Bm);
		const A = V3$1();
		const H = V3$1();
		const K = V3$1();
		const F = V3$1();
		const u = V3$1();
		const v = V3$1();
		const n = V3$1();
		const d = V3$1();
		const p = V3$1();
		const tmp = V3$1();
		for (const leg of this.legs) {
			const l = leg.def.len;
			A.copy(leg.attach).applyMatrix4(Bm);
			const out = V3$1(leg.def.chela ? .35 : .05 * (2 - leg.index), -.75, leg.side * .8).normalize().applyQuaternion(q);
			this.place(leg.arts[0].mesh, A, out, V3$1(0, 1, 0).applyQuaternion(q));
			tmp.copy(A).addScaledVector(out, l[0]);
			const out2 = V3$1(leg.def.chela ? .5 : .1, -.5, leg.side * 1).normalize().applyQuaternion(q);
			this.place(leg.arts[1].mesh, tmp, out2, V3$1(0, 1, 0).applyQuaternion(q));
			H.copy(tmp).addScaledVector(out2, l[1]);
			F.copy(leg.target);
			const pole = (leg.def.chela ? V3$1(.6, .9, leg.side * .75) : V3$1(KNEE_X$1[leg.index - 2], 0, leg.side)).applyQuaternion(q);
			u.subVectors(F, H);
			let D = u.length();
			u.normalize();
			const L1 = leg.L1;
			const L2 = leg.chord;
			D = Math.min(D, (L1 + L2) * .999);
			D = Math.max(D, Math.abs(L1 - L2) * 1.001 + .01);
			F.copy(H).addScaledVector(u, D);
			v.copy(pole).addScaledVector(u, -pole.dot(u)).normalize();
			n.crossVectors(u, v).normalize();
			const a = (L1 * L1 - L2 * L2 + D * D) / (2 * D);
			const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
			K.copy(H).addScaledVector(u, a).addScaledVector(v, h);
			d.subVectors(K, H).normalize();
			p.crossVectors(n, d);
			this.place(leg.arts[2].mesh, H, d, p);
			tmp.copy(H).addScaledVector(d, l[2]);
			this.place(leg.arts[3].mesh, tmp, d, p);
			d.subVectors(F, K).normalize();
			p.crossVectors(n, d);
			const cur = K.clone();
			leg.link2.forEach((s, j) => {
				const ang = s.dir - leg.chordAng;
				const dir = d.clone().multiplyScalar(Math.cos(ang)).addScaledVector(p, Math.sin(ang));
				const pp = V3$1().crossVectors(n, dir);
				if (leg.def.chela && j === 2) {
					const half = leg.open * .5;
					leg.fingers.forEach((fm, f) => {
						const fa = ang + (f === 0 ? half : -half * .4);
						const fd = d.clone().multiplyScalar(Math.cos(fa)).addScaledVector(p, Math.sin(fa));
						this.place(fm, cur, fd, V3$1().crossVectors(n, fd));
					});
				} else this.place(leg.arts[4 + j].mesh, cur, dir, pp);
				cur.addScaledVector(dir, s.len);
			});
		}
	}
	place(m, start, dir, up) {
		const z = dir.clone().normalize();
		const x = V3$1().crossVectors(up, z).normalize();
		const y = V3$1().crossVectors(z, x);
		m.matrix.makeBasis(x, y, z).setPosition(start);
		m.matrixWorldNeedsUpdate = true;
	}
	posePleopods(t, amp, freq = 3) {
		for (const p of this.pleopods) {
			const ph = t * freq * Math.PI * 2 + p.phase;
			const s = Math.sin(ph);
			p.group.rotation.set(-p.group.userData.side * .3, 0, -.85 + amp * (.5 + .5 * s) * 1.6, "ZXY");
			const spread = .5 + .5 * Math.cos(ph);
			p.rami.forEach((r) => {
				r.rotation.set(r.userData.splay * (.5 + spread), 0, -.25 - .35 * amp * Math.sin(ph - .6));
			});
		}
	}
	poseWhips(t) {
		this.B.updateMatrix();
		const Bm = this.B.matrix;
		const q = new THREE.Quaternion().setFromRotationMatrix(Bm);
		for (const w of this.whips) {
			const n = w.pts.length;
			const step = w.len / (n - 1);
			const dir = w.dir.clone();
			const p = w.base.clone();
			const side = w.side;
			let yawRate;
			let pitchRate;
			if (w.kind === "antenna") {
				const sweep = .55 * Math.sin(t * .7 + (side > 0 ? 0 : 2.1)) + .25 * Math.sin(t * 1.9 + side);
				dir.applyAxisAngle(V3$1(0, 1, 0), -side * (.15 + .25 * sweep));
				dir.applyAxisAngle(V3$1(0, 0, 1), .02 + .1 * Math.sin(t * .9 + side * 1.3));
				yawRate = -side * (.9 + .5 * sweep) / w.len;
				pitchRate = -.12 / w.len;
			} else {
				const outer = w.kind === "outer";
				const fl = w.flick;
				dir.applyAxisAngle(V3$1(0, 1, 0), -side * (outer ? .25 : .05));
				dir.applyAxisAngle(V3$1(0, 0, 1), (outer ? 1.2 : 1) - fl * .9 + .08 * Math.sin(t * 2.3 + side));
				yawRate = -side * (outer ? .12 : .05);
				pitchRate = (outer ? -.18 : -.1) - fl * .2;
			}
			for (let i = 0; i < n; i++) {
				w.pts[i].copy(p).applyMatrix4(Bm);
				const s = i / (n - 1);
				const wave = w.kind === "antenna" ? .06 * Math.sin(t * 2.4 - s * 7 + side) * s : .03 * Math.sin(t * 5 - s * 6);
				dir.applyAxisAngle(V3$1(0, 1, 0), yawRate * step + wave * step * .5).applyAxisAngle(V3$1(0, 0, 1), pitchRate * step + wave * step * .4).normalize();
				p.addScaledVector(dir, step);
			}
			for (const pt of w.pts) pt.y = Math.max(pt.y, .08 + this.ground);
			w.tube.set(w.pts, V3$1(0, 1, 0).applyQuaternion(q));
		}
	}
	setMode(m) {
		this.mode = m;
		if (m !== "auto") this.startAct(m);
	}
	startAct(a) {
		this.act = a;
		this.actTime = 0;
		const r = this.rnd();
		this.actLen = a === "graze" ? 6 + r * 8 : a === "walk" ? 4 + r * 5 : a === "swim" ? 3 + r * 3 : 1.8;
		this.segT = 0;
		this.segLen = 0;
		if (a === "flip") this.flipV = 70;
	}
	nextAct() {
		if (this.mode !== "auto") {
			this.startAct(this.mode === "flip" ? "graze" : this.mode);
			if (this.mode === "flip") this.mode = "graze";
			return;
		}
		const r = this.rnd();
		const prev = this.act;
		if (prev === "flip" || prev === "swim") return this.startAct("graze");
		if (this.stay) return this.startAct(r < .55 ? prev === "graze" ? "walk" : "graze" : "graze");
		this.startAct(r < .5 ? prev === "graze" ? "walk" : "graze" : r < .85 ? "graze" : r < .96 ? "swim" : "flip");
	}
	speed = 0;
	sCmd = 0;
	rCmd = 0;
	gait = 0;
	gaitT = .6;
	gaitOn = 0;
	segT = 0;
	segLen = 0;
	lag = {
		x: 0,
		y: 0,
		z: 0,
		vx: 0,
		vy: 0,
		vz: 0,
		pitch: 0,
		roll: 0,
		yaw: 0,
		vp: 0,
		vr: 0,
		vyaw: 0
	};
	prevSpeed = 0;
	swimV = 0;
	lean = V3$1();
	baseY = null;
	groundAt = null;
	blocked = null;
	home = new THREE.Vector2(0, 0);
	stay = false;
	slope = 0;
	slopeRoll = 0;
	avoidT = 0;
	gAt(x, z) {
		return this.groundAt ? this.groundAt(x, z) : this.baseY ?? this.object.position.y;
	}
	plan(dt) {
		const o = this.object;
		const act = this.act;
		const dist = Math.hypot(o.position.x - this.home.x, o.position.z - this.home.y);
		const toC = Math.atan2(o.position.z - this.home.y, this.home.x - o.position.x);
		const dh = Math.atan2(Math.sin(toC - this.heading), Math.cos(toC - this.heading));
		const edge = smooth(this.range * .55, this.range, dist);
		this.segT += dt;
		if (this.segT > this.segLen) {
			this.segT = 0;
			const r = this.rnd();
			if (act === "walk") {
				const moving = this.sCmd < .5 ? true : r < .72;
				this.segLen = moving ? .7 + this.rnd() * 1.8 : .25 + this.rnd() * .7;
				this.sCmd = moving ? 3.5 + this.rnd() * 4.5 : 0;
				this.rCmd = (this.rnd() - .5) * (moving ? .9 : 1.4);
			} else if (act === "graze") {
				if (this.sCmd !== 0 || this.rCmd !== 0) {
					this.sCmd = 0;
					this.rCmd = 0;
					this.segLen = 2 + this.rnd() * 4;
				} else if (r < .45) {
					this.rCmd = (this.rnd() < .5 ? -1 : 1) * (.5 + this.rnd() * .5);
					this.segLen = .35 + this.rnd() * .4;
				} else if (r < .8) {
					this.sCmd = 2.5 + this.rnd() * 1.5;
					this.rCmd = (this.rnd() - .5) * .4;
					this.segLen = .4 + this.rnd() * .5;
				} else this.segLen = 1 + this.rnd() * 2;
			} else {
				this.sCmd = 0;
				this.rCmd = 0;
				this.segLen = 1;
			}
		}
		let rc = this.rCmd + edge * Math.sign(dh) * Math.min(1.2, Math.abs(dh) * 2);
		let sc = this.sCmd * (1 - .6 * edge * smooth(.6, 1.6, Math.abs(dh)));
		if (act === "swim" || act === "flip") {
			sc = 0;
			rc = act === "swim" ? .25 * Math.sin(this.time * .6) + edge * dh : 0;
		}
		if (this.blocked && (act === "walk" || act === "graze")) {
			const ahead = (a, r) => {
				const h = this.heading + a;
				const x = o.position.x + Math.cos(h) * r;
				const z = o.position.z - Math.sin(h) * r;
				return Math.hypot(x - this.home.x, z - this.home.y) > this.range && Math.hypot(x - this.home.x, z - this.home.y) > dist || this.blocked(x, z) || this.gAt(x, z) - this.gAt(o.position.x, o.position.z) > .004;
			};
			if (this.avoidT > 0) this.avoidT -= dt;
			else if (this.blocked(o.position.x, o.position.z) || dist > this.range * 1.15) {
				const toHome = Math.atan2(-(this.home.y - o.position.z), this.home.x - o.position.x);
				const dd = Math.atan2(Math.sin(toHome - this.heading), Math.cos(toHome - this.heading));
				this.rCmd = Math.max(-1.2, Math.min(1.2, dd * 2));
				this.sCmd = Math.abs(dd) < .6 ? 3 : .8;
				this.segT = 0;
				this.segLen = .4;
			} else if (ahead(0, .012) || ahead(.4, .01) || ahead(-.4, .01)) {
				const left = ahead(.7, .012) ? 1 : 0;
				const right = ahead(-.7, .012) ? 1 : 0;
				this.rCmd = (left <= right ? 1 : -1) * 1.1;
				this.sCmd = Math.min(this.sCmd, 1.5);
				this.segT = 0;
				this.segLen = .6 + this.rnd() * .5;
				this.avoidT = .6;
			}
		}
		const acc = sc > this.speed ? 14 : 22;
		this.speed += Math.max(-acc * dt, Math.min(acc * dt, sc - this.speed));
		this.turn += Math.max(-4 * dt, Math.min(4 * dt, rc - this.turn));
	}
	update(dt) {
		dt = Math.min(dt, .05);
		this.time += dt;
		this.actTime += dt;
		const t = this.time;
		if (this.actTime > this.actLen) this.nextAct();
		const act = this.act;
		const o = this.object;
		if (this.baseY === null) this.baseY = o.position.y;
		this.plan(dt);
		const footSpeed = Math.abs(this.speed) + Math.abs(this.turn) * 6;
		const wantGait = !(this.lift > .8) && footSpeed > .5 ? 1 : 0;
		this.gaitOn += (wantGait - this.gaitOn) * Math.min(1, dt * 8);
		const stance = Math.min(.7, STRIDE$1 / Math.max(.5, footSpeed));
		this.gaitT = Math.min(1.4, Math.max(.36, stance / DUTY$1));
		if (wantGait) this.gait += dt / this.gaitT;
		const ph = this.gait % 1;
		const surge = wantGait ? 1 + .55 * Math.cos(4 * Math.PI * (ph - .22)) : 1;
		let fwd = this.speed * surge;
		if (act === "swim") {
			const beat = Math.max(0, Math.sin(this.pPhase * Math.PI * 2 + .5));
			this.swimV += (beat * 55 - this.swimV * 2.2) * dt;
			fwd = this.swimV;
		} else this.swimV *= Math.exp(-dt * 3);
		if (act === "flip") {
			this.flipV *= Math.exp(-dt * 4.2);
			fwd = -this.flipV;
		} else if (act !== "swim") fwd += this.swimV;
		this.heading += this.turn * (wantGait ? .55 + .9 * Math.max(0, Math.cos(4 * Math.PI * (ph - .22))) : 1) * dt;
		o.position.x += Math.cos(this.heading) * fwd * .001 * dt;
		o.position.z -= Math.sin(this.heading) * fwd * .001 * dt;
		if (this.groundAt) {
			const gx = o.position.x;
			const gz = o.position.z;
			const ch = Math.cos(this.heading);
			const sh = Math.sin(this.heading);
			const gy = this.groundAt(gx, gz);
			this.baseY += (gy - this.baseY) * Math.min(1, dt * 6);
			const gf = this.groundAt(gx + ch * .008, gz - sh * .008);
			const gb = this.groundAt(gx - ch * .008, gz + sh * .008);
			const gl = this.groundAt(gx + sh * .004, gz + ch * .004);
			const gr = this.groundAt(gx - sh * .004, gz - ch * .004);
			this.slope += (Math.atan2(gf - gb, .016) - this.slope) * Math.min(1, dt * 5);
			this.slopeRoll += (Math.atan2(gr - gl, .008) - this.slopeRoll) * Math.min(1, dt * 5);
		}
		o.position.y = this.baseY;
		o.rotation.y = this.heading;
		o.updateMatrixWorld(true);
		this.curFwd = fwd;
		if (act === "flip") {
			const k = this.actTime;
			this.curl = k < .08 ? smooth(0, .08, k) : k < .28 ? 1 - .75 * smooth(.08, .28, k) : .25 * (1 - smooth(.28, 1.1, k));
			this.lift += ((k < .55 ? 6 : 0) - this.lift) * Math.min(1, dt * (k < .55 ? 6 : 2.2));
			this.fan += ((k < .4 ? 1 : .6) - this.fan) * Math.min(1, dt * 12);
		} else {
			this.curl *= 1 - Math.min(1, dt * 5);
			const beatLift = act === "swim" ? .35 * Math.sin(this.pPhase * Math.PI * 2) : 0;
			const want = act === "swim" ? 8 + 2 * Math.sin(t * .7) + beatLift : 0;
			if (want > this.lift) this.lift += (want - this.lift) * Math.min(1, dt * 1.6);
			else this.lift = Math.max(want, this.lift - Math.max(2.5, (this.lift - want) * .9) * dt);
			if (this.lift < .02) this.lift = 0;
			this.fan += ((act === "swim" ? .3 : .75 + .08 * Math.sin(t * .4)) - this.fan) * Math.min(1, dt * 3);
		}
		const swimK = smooth(0, 5, this.lift);
		const L = this.lag;
		const accel = (fwd - this.prevSpeed) / Math.max(.001, dt);
		this.prevSpeed = fwd;
		const g = this.gaitOn;
		const sway = g * Math.sin(2 * Math.PI * (ph - .22));
		const tgt = {
			x: -accel * .0022 + this.lean.x,
			y: g * .06 * Math.cos(4 * Math.PI * (ph - .22)) + this.lean.y,
			z: sway * .07 + this.lean.z,
			pitch: accel * 6e-4 - .035 * this.low + this.lean.x * .08 + swimK * .1 + this.slope * .8 * (1 - swimK),
			roll: sway * .03 + this.lean.z * .08 + this.slopeRoll * .6 * (1 - swimK),
			yaw: sway * .035 + this.turn * .04
		};
		tgt.x = clamp$1(tgt.x, -.6, .6);
		tgt.pitch = clamp$1(tgt.pitch, -.5, .5);
		const subs = Math.max(1, Math.ceil(dt * 240));
		const h = dt / subs;
		const spring = (k, v, w, z) => {
			for (let i = 0; i < subs; i++) {
				L[v] += (w * w * (tgt[k] - L[k]) - 2 * z * w * L[v]) * h;
				L[k] += L[v] * h;
			}
		};
		spring("x", "vx", 22, .75);
		spring("y", "vy", 26, .75);
		spring("z", "vz", 22, .75);
		spring("pitch", "vp", 16, .7);
		spring("roll", "vr", 16, .7);
		spring("yaw", "vyaw", 16, .7);
		const breathe = .015 * Math.sin(t * 1.3);
		this.low += ((act === "graze" ? 1 : 0) - this.low) * Math.min(1, dt * 1.5);
		this.B.position.set(L.x, H0$1 + this.lift + breathe - .35 * this.low + L.y, L.z);
		this.B.rotation.set(L.roll, L.yaw, TILT$1 + L.pitch, "YXZ");
		this.somites.forEach((b, k) => {
			const c = this.curl * (k < 2 ? .35 : .75);
			b.rotation.z = -.03 * swimK * (k >= 2 ? 1 : 0) + c + .008 * Math.sin(t * 1.1 - k * .5) + g * .012 * Math.cos(4 * Math.PI * (ph - .3) - k * .4);
			b.rotation.y = -sway * .012 * (k + 1) * .3;
		});
		this.telson.rotation.z = this.curl * .6 - .05 * swimK;
		this.poseFan();
		this.B.updateMatrix();
		o.updateMatrixWorld(true);
		this.stepLegs(dt, swimK);
		this.poseLegs();
		const pAmp = act === "swim" ? .9 : act === "flip" ? .15 : act === "walk" ? .3 : .16 + .12 * Math.max(0, Math.sin(t * .31));
		const pFreq = act === "swim" ? 6 : 3.2;
		this.pPhase += dt * pFreq;
		this.pAmp += (pAmp - this.pAmp) * Math.min(1, dt * 4);
		this.posePleopods(this.pPhase / pFreq, this.pAmp, pFreq);
		for (const w of this.whips) {
			if (w.kind !== "outer") continue;
			w.nextFlick -= dt;
			if (w.nextFlick < 0) {
				w.nextFlick = .5 + this.rnd() * 1.6;
				w.flick = 1;
			}
			w.flick *= Math.exp(-dt * 9);
		}
		this.poseWhips(t);
		this.maxillipeds.forEach((mx, i) => {
			const s = i ? 1 : -1;
			mx[0].rotation.z = -.25 + .06 * Math.sin(t * 7 + s) + this.feed * .12;
			mx[1].rotation.z = .15 + .08 * Math.sin(t * 7 + s + 1);
		});
		this.feed *= 1 - Math.min(1, dt * 4);
		this.eyes.forEach((e, i) => e.rotation.y = .05 * Math.sin(t * .6 + i * 2));
		this.merged?.sync();
	}
	curFwd = 0;
	pPhase = 0;
	low = 0;
	pAmp = .2;
	feed = 0;
	pick = [];
	predictWorld(local, ahead) {
		const h = this.heading + this.turn * ahead;
		const fwd = this.curFwd * ahead * .001;
		const o = this.object;
		const x = o.position.x + Math.cos(this.heading) * fwd;
		const z = o.position.z - Math.sin(this.heading) * fwd;
		const c = Math.cos(h);
		const s = Math.sin(h);
		const wx = x + (c * local.x + s * local.z) * .001;
		const wz = z + (-s * local.x + c * local.z) * .001;
		return V3$1(wx, this.gAt(wx, wz), wz);
	}
	stepLegs(dt, swimK) {
		const o = this.object;
		o.updateMatrix();
		this.B.updateMatrix();
		const inv = this.bInv.copy(o.matrix).invert();
		const toLocal = (w) => w.clone().applyMatrix4(inv);
		const walking = this.legs.filter((l) => !l.def.chela);
		const stanceDur = this.gaitT * DUTY$1;
		const swingDur = this.gaitT * .4;
		const fwdV = V3$1(this.curFwd, 0, 0);
		const busyNear = (leg) => walking.some((l) => l !== leg && l.state === "swing" && (l.side === leg.side && Math.abs(l.index - leg.index) === 1 || l.index === leg.index && l.side !== leg.side));
		const startSwing = (leg, dur, home) => {
			const rel = V3$1(fwdV.x + this.turn * home.z, 0, -this.turn * home.x).multiplyScalar(this.gaitOn > .5 ? stanceDur * .5 : 0);
			const land = home.clone().add(rel);
			leg.state = "swing";
			leg.swingT = 0;
			leg.swingDur = dur;
			leg.swingFromW.copy(leg.target.clone().applyMatrix4(o.matrix));
			leg.swingFromW.y = this.gAt(leg.swingFromW.x, leg.swingFromW.z);
			leg.swingToW.copy(this.predictWorld(land, dur));
		};
		const air = this.lift > .8 || this.act === "flip";
		for (const leg of walking) {
			const home = this.homeOf(leg);
			if (air || leg.state === "air") {
				const tuck = this.act === "flip" ? 1 : 0;
				const hangB = V3$1(dX$1(leg.def.d) - 2.4 - (leg.index - 2) * 1 + tuck * 2, -3.9 + tuck * .4, leg.side * (2 + (leg.index - 2) * .3 - tuck * .3));
				hangB.y += .35 * Math.sin(this.time * 5 + leg.index * 1.1 + (leg.side > 0 ? 0 : 1.6));
				hangB.x += .3 * Math.sin(this.time * 5 + leg.index * 1.1 + (leg.side > 0 ? 0 : 1.6) + 1.2);
				const hang = hangB.applyMatrix4(this.B.matrix);
				if (air) {
					if (leg.state !== "air") {
						leg.state = "air";
						leg.airFrom.copy(leg.target);
						leg.airK = 0;
					}
					leg.airK = Math.min(1, leg.airK + dt * 5);
					leg.target.lerpVectors(leg.airFrom, hang, smooth(0, 1, leg.airK));
					continue;
				}
				const reach = smooth(2.5, 0, this.lift);
				const down = home.clone().lerp(hang, 1 - reach);
				const hw = home.clone().applyMatrix4(o.matrix);
				const homeY = (this.gAt(hw.x, hw.z) - o.position.y) * 1e3;
				down.y = Math.max(homeY, down.y);
				leg.target.lerp(down, Math.min(1, dt * 10));
				if (this.lift < .05) {
					leg.state = "stance";
					leg.planted.copy(leg.target.clone().applyMatrix4(o.matrix));
					leg.planted.y = this.gAt(leg.planted.x, leg.planted.z);
				}
				continue;
			}
			if (leg.state === "swing") {
				leg.swingT += dt / leg.swingDur;
				const s = Math.min(1, leg.swingT);
				const prog = smooth(.12, .92, s);
				const w = leg.swingFromW.clone().lerp(leg.swingToW, prog);
				const lift = 1.25 * Math.max(0, Math.sin(Math.PI * Math.min(1, s * 1.05))) ** .75 * (.6 + .4 * Math.min(1, this.gaitOn + .4));
				const loc = toLocal(w);
				loc.y += lift;
				loc.z += leg.side * .45 * Math.sin(Math.PI * s);
				leg.target.copy(loc);
				if (s >= 1) {
					leg.state = "stance";
					leg.planted.copy(leg.swingToW);
				}
				continue;
			}
			const cur = toLocal(leg.planted);
			leg.target.copy(cur);
			const far = Math.hypot(cur.x - home.x, cur.z - home.z);
			if (leg.attach.clone().applyMatrix4(this.B.matrix).distanceTo(cur) > .93 * leg.reach && !busyNear(leg)) {
				startSwing(leg, Math.max(.16, swingDur * .8), home);
				continue;
			}
			if (this.gaitOn > .5) {
				const lp = (this.gait - leg.phaseOff + 10) % 1;
				const prev = leg.lastPhase;
				leg.lastPhase = lp;
				if (lp < prev && far > .15 || far > STRIDE$1 * 1.4 && !busyNear(leg)) startSwing(leg, swingDur, home);
			} else {
				leg.lastPhase = (this.gait - leg.phaseOff + 10) % 1;
				if (far > 1 && !busyNear(leg) && !walking.some((l) => l.state === "swing")) startSwing(leg, .22, home);
			}
		}
		const chel = this.legs.filter((l) => l.def.chela);
		const lean = V3$1();
		chel.forEach((leg, i) => {
			const rest = this.chelaRest(leg);
			if (!this.pick[i]) this.pick[i] = {
				t: this.rnd(),
				len: .9,
				from: rest.clone(),
				spot: rest.clone()
			};
			const pk = this.pick[i];
			if (!((this.act === "graze" || this.act === "walk") && swimK < .2)) {
				const fold = V3$1(dX$1(leg.index === 0 ? 2.2 : 3.2), -2.9, leg.side * (leg.index === 0 ? .7 : 1.1)).applyMatrix4(this.B.matrix);
				leg.target.lerp(swimK > .2 || this.act === "flip" ? fold : rest, Math.min(1, dt * 6));
				leg.open += (.15 - leg.open) * Math.min(1, dt * 6);
				return;
			}
			const rate = this.act === "walk" ? .6 : 1;
			pk.t += dt / pk.len * rate;
			if (pk.t >= 1) {
				pk.t -= 1;
				pk.len = (leg.index === 0 ? .32 : .42) + this.rnd() * .3;
				pk.spot.set(leg.index === 0 ? lerp(2.6, 4.6, this.rnd()) : lerp(3, 5.5, this.rnd()), .05, leg.side * (leg.index ? lerp(1.4, 2.8, this.rnd()) : lerp(.7, 1.8, this.rnd())));
				if (this.groundAt) {
					const sw = pk.spot.clone().applyMatrix4(o.matrix);
					pk.spot.y = (this.groundAt(sw.x, sw.z) - o.position.y) * 1e3 + .05;
				}
				if (this.rnd() < .15) pk.spot.y += 1.45;
			}
			const s = pk.t;
			const mouthL = V3$1(dX$1(2.8), -1.2, leg.side * .3).clone().applyMatrix4(this.B.matrix);
			let p;
			if (s < .35) p = mouthL.clone().lerp(pk.spot, smooth(0, .35, s));
			else if (s < .5) p = pk.spot.clone().add(V3$1(.15 * Math.sin(s * 60), 0, 0));
			else if (s < .85) p = pk.spot.clone().lerp(mouthL, smooth(.5, .85, s));
			else p = mouthL.clone().add(V3$1(.1 * Math.sin(s * 40), .05, 0));
			p.y = Math.max(p.y, pk.spot.y < 1 ? pk.spot.y : .05);
			leg.target.lerp(p, Math.min(1, dt * 18));
			leg.open += ((s < .33 ? .9 : s < .45 ? .1 : s < .85 ? .1 : .6) - leg.open) * Math.min(1, dt * 14);
			if (s > .85) this.feed = 1;
			const down = s < .5 ? smooth(.1, .35, s) : 1 - smooth(.5, .7, s);
			lean.x += down * .12;
			lean.y -= down * .08;
			lean.z += down * leg.side * .06;
		});
		this.lean.lerp(lean, Math.min(1, dt * 6));
	}
};
var NOISE_GLSL = `
float shHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float shNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(shHash(i + vec3(0, 0, 0)), shHash(i + vec3(1, 0, 0)), f.x), mix(shHash(i + vec3(0, 1, 0)), shHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(shHash(i + vec3(0, 0, 1)), shHash(i + vec3(1, 0, 1)), f.x), mix(shHash(i + vec3(0, 1, 1)), shHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
vec3 shBump(vec3 nrm, float h, float scale) {
  vec3 dpdx = dFdx(-vViewPosition);
  vec3 dpdy = dFdy(-vViewPosition);
  float dhx = dFdx(h) * scale;
  float dhy = dFdy(h) * scale;
  vec3 r1 = cross(dpdy, nrm);
  vec3 r2 = cross(nrm, dpdx);
  float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  return normalize(abs(det) * nrm - grad);
}
`;
var BASE$1 = "/";
var PHOTO$1 = {
	side: {
		ax: 712,
		by: 785,
		k: 55,
		W: 1942,
		H: 809
	},
	top: {
		ax: 765.2,
		by: 393,
		k: 53.46,
		W: 1983,
		H: 793
	}
};
function bakeRest$1(s) {
	s.object.updateMatrixWorld(true);
	const inv = new THREE.Matrix4().copy(s.object.matrixWorld).invert();
	const M = new THREE.Matrix4();
	const N = new THREE.Matrix3();
	const v = new THREE.Vector3();
	for (const m of s.bodyMeshes) {
		M.multiplyMatrices(inv, m.matrixWorld);
		N.getNormalMatrix(M);
		const g = m.geometry;
		const p = g.getAttribute("position");
		const n = g.getAttribute("normal");
		const ap = new Float32Array(p.count * 3);
		const an = new Float32Array(p.count * 3);
		for (let i = 0; i < p.count; i++) {
			v.fromBufferAttribute(p, i).applyMatrix4(M);
			ap.set([
				v.x,
				v.y,
				v.z
			], i * 3);
			v.fromBufferAttribute(n, i).applyMatrix3(N).normalize();
			an.set([
				v.x,
				v.y,
				v.z
			], i * 3);
		}
		g.setAttribute("aRest", new THREE.BufferAttribute(ap, 3));
		g.setAttribute("aRestN", new THREE.BufferAttribute(an, 3));
	}
}
function loadTex$1(url) {
	return new Promise((res) => {
		new THREE.TextureLoader().load(url, (t) => {
			t.colorSpace = THREE.SRGBColorSpace;
			t.anisotropy = 8;
			res(t);
		}, void 0, () => res(null));
	});
}
function shellMaterial$1(side, top) {
	const mat = new THREE.MeshPhysicalMaterial({
		color: 16777215,
		roughness: .55,
		metalness: 0,
		clearcoat: .6,
		clearcoatRoughness: .06,
		specularIntensity: .6,
		sheen: .12,
		sheenRoughness: .75,
		sheenColor: new THREE.Color(1, .92, .9),
		side: THREE.DoubleSide
	});
	const S = PHOTO$1.side;
	const T = PHOTO$1.top;
	const uni = {
		tSide: { value: side },
		tTop: { value: top },
		uSide: { value: new THREE.Vector4(S.ax, S.by, S.k, 0) },
		uTop: { value: new THREE.Vector4(T.ax, T.by, T.k, 0) },
		uWHs: { value: new THREE.Vector2(S.W, S.H) },
		uWHt: { value: new THREE.Vector2(T.W, T.H) }
	};
	mat.onBeforeCompile = (sh) => {
		Object.assign(sh.uniforms, uni);
		sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 aRest;\nattribute vec3 aRestN;\nvarying vec3 vRest;\nvarying vec3 vRestN;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvRest = aRest;\nvRestN = aRestN;");
		sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
uniform sampler2D tSide;
uniform sampler2D tTop;
uniform vec4 uSide;
uniform vec4 uTop;
uniform vec2 uWHs;
uniform vec2 uWHt;
varying vec3 vRest;
varying vec3 vRestN;
${NOISE_GLSL}`).replace("#include <map_fragment>", `{
  vec3 rn = normalize(vRestN);
  vec2 uvS = vec2((uSide.x - uSide.z * vRest.x) / uWHs.x, 1.0 - (uSide.y - uSide.z * vRest.y) / uWHs.y);
  vec2 uvT = vec2((uTop.x - uTop.z * vRest.x) / uWHt.x, 1.0 - (uTop.y - uTop.z * vRest.z) / uWHt.y);
  vec4 cS = texture2D(tSide, uvS);
  vec4 cT = texture2D(tTop, uvT);
  float wT = smoothstep(0.2, 0.45, rn.y) * cT.a;
  float wS = (1.0 - wT) * (0.15 + 0.85 * cS.a) + 0.001;
  vec3 c = (cS.rgb * wS + cT.rgb * wT) / (wS + wT);
  float fr = 1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition)));
  float wt = 1.0 - clamp((c.r - c.g) * 2.0, 0.0, 1.0);
  c = mix(c, c * vec3(0.55, 0.62, 0.72), pow(fr, 2.2) * (0.25 + 0.25 * wt));
  diffuseColor.rgb *= c;
}`).replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
normal = shBump(normal, shNoise(vRest * 12.0) * 0.6 + shNoise(vRest * 35.0) * 0.4, 0.000005);`);
	};
	mat.customProgramCacheKey = () => "shrimp-shell";
	return mat;
}
var lin$1 = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
var RED = lin$1(.7, .06, .07);
var WHITE = lin$1(.93, .92, .9);
var GLASS = lin$1(.84, .83, .85);
var LEGRED = lin$1(.78, .27, .27);
var CREAM = lin$1(.95, .92, .82);
var smooth01$1 = (x) => {
	const q = Math.min(1, Math.max(0, x));
	return q * q * (3 - 2 * q);
};
function bandMix$1(t, a, b, soft = .04) {
	const s = (x, y, z) => {
		const q = Math.min(1, Math.max(0, (z - x) / (y - x)));
		return q * q * (3 - 2 * q);
	};
	return s(a - soft, a + soft, t) * (1 - s(b - soft, b + soft, t));
}
function appPaint$1(kind, art, leg, t, u) {
	const glass = [GLASS, .27];
	const mix = (base, col, a, w) => [base[0].clone().lerp(col, w), base[1] + (a - base[1]) * w];
	let p = glass;
	const red = (a, b, alpha = .92) => p = mix(p, RED, alpha, bandMix$1(t, a, b));
	const white = (a, b, alpha = .5) => p = mix(p, WHITE, alpha, bandMix$1(t, a, b));
	switch (kind) {
		case "walk": {
			const mot = .82 + .18 * Math.sin(t * 37 + art * 3 + u * 9);
			const lr = (a, b, al = .88) => p = mix(p, LEGRED.clone().multiplyScalar(mot), al, bandMix$1(t, a, b, .06));
			p = [GLASS.clone().lerp(LEGRED, .25), .5];
			if (art <= 1) p = [CREAM.clone().lerp(LEGRED, .35), .75];
			else if (art === 2) lr(.1, .95), white(-.1, .06, .6);
			else if (art === 3) lr(.04, .88), white(.9, 1.1, .75);
			else if (art === 4) lr(.08, .72), white(.82, 1.1, .7);
			else if (art === 5) p = [GLASS.clone().lerp(LEGRED, .3), .45], lr(.35, .6, .6), white(.9, 1.1, .6);
			else p = [lin$1(.92, .88, .8).lerp(lin$1(.8, .55, .25), smooth01$1((t - .6) / .4)), .4 + .45 * t];
			break;
		}
		case "chela": {
			const lr = (a, b) => p = mix(p, LEGRED, .85, bandMix$1(t, a, b, .06));
			p = [CREAM, .8];
			if (art === 3) lr(.2, .85);
			else if (art === 4) lr(0, .55);
			else if (art === 5) p = [CREAM.clone().lerp(LEGRED, .15), .85];
			break;
		}
		case "finger":
			p = [lin$1(.97, .95, .9).lerp(lin$1(.8, .55, .25), smooth01$1((t - .75) / .25)), .75];
			break;
		case "mxp":
			p = [CREAM, .7];
			p = mix(p, LEGRED, .75, bandMix$1(t, .15, .55, .08) * .6);
			break;
		case "a1ped":
			p = [CREAM, .85];
			if (art === 0) p = mix(p, LEGRED, .9, bandMix$1(t, .35, .9, .1) * (u > .15 && u < .4 ? .9 : .15));
			break;
		case "sty":
			p = [WHITE, .7];
			break;
		case "a2ped":
			p = [CREAM, .8];
			red(.1, .55), white(.8, 1.1, .4);
			break;
		case "scale": {
			const edge = Math.abs(u - .5) * 2;
			p = [GLASS.clone().lerp(WHITE, .35 + .5 * edge ** 3), .28 + .35 * edge ** 4];
			if (t < .25) p = mix(p, RED, .9, 1 - t / .25);
			break;
		}
		case "rostrum": {
			const d = 4.2 - t * 5.3;
			p = [CREAM, d > 2 ? .95 : .6 + .3 * (d + .4) / 2.4];
			break;
		}
		case "stalk":
			p = [CREAM, .95];
			break;
		case "a1flag":
		case "a2flag": {
			const ring = Math.floor(t * (kind === "a2flag" ? 24 : 6) / (kind === "a2flag" ? .32 : .3));
			const fade = kind === "a2flag" ? 1 - Math.min(1, t / .5) : 1 - Math.min(1, t / .85);
			const col = ring % 2 ? RED : WHITE;
			p = [lin$1(.92, .8, .78).lerp(col === RED ? LEGRED : WHITE, .5 * fade), .55 + .25 * fade];
			break;
		}
		case "pleoProt":
			p = [WHITE.clone().lerp(RED, bandMix$1(t, 0, .35) * .7), .7];
			break;
		case "pleoRamus": p = [lin$1(.94, .92, .9), .5 - .25 * t];
	}
	return p;
}
function paintApps$1(s) {
	for (const m of s.appMeshes) {
		const { kind, art, leg } = m.userData;
		const g = m.geometry;
		if (g.getAttribute("color")) continue;
		const uv = g.getAttribute("uv");
		const n = uv.count;
		const col = new Float32Array(n * 4);
		for (let i = 0; i < n; i++) {
			const [c, a] = appPaint$1(kind, art, leg, uv.getX(i), uv.getY(i));
			col.set([
				c.r,
				c.g,
				c.b,
				Math.min(1, a)
			], i * 4);
		}
		g.setAttribute("color", new THREE.BufferAttribute(col, 4));
	}
}
async function photoMaterials$1(s, url = (f) => BASE$1 + f) {
	const [side, top] = await Promise.all([loadTex$1(url("shrimp/body_side.webp")), loadTex$1(url("shrimp/body_top.webp"))]);
	const white = new THREE.DataTexture(new Uint8Array([
		235,
		232,
		228,
		255
	]), 1, 1);
	white.colorSpace = THREE.SRGBColorSpace;
	white.needsUpdate = true;
	paintApps$1(s);
	const app = new THREE.MeshPhysicalMaterial({
		vertexColors: true,
		transparent: true,
		roughness: .25,
		clearcoat: .7,
		clearcoatRoughness: .08,
		sheen: .08,
		sheenRoughness: .6,
		sheenColor: new THREE.Color(1, .95, .95)
	});
	const plate = app.clone();
	plate.side = THREE.DoubleSide;
	plate.depthWrite = false;
	return {
		shell: shellMaterial$1(side ?? white, top ?? white),
		app,
		plate,
		eye: new THREE.MeshPhysicalMaterial({
			color: new THREE.Color().setRGB(.035, .022, .016),
			roughness: .35,
			clearcoat: .8,
			clearcoatRoughness: .12
		}),
		setae: new THREE.LineBasicMaterial({
			color: 15789288,
			transparent: true,
			opacity: .2,
			depthWrite: false
		}),
		inner: app,
		feather: featherMaterial(16052202, .55)
	};
}
function applyPhoto$1(s, m) {
	s.mats = m;
	for (const b of s.bodyMeshes) b.material = m.shell;
	for (const a of s.appMeshes) a.material = a.userData.part === "plate" ? m.plate : m.app;
	for (const e of s.eyeMeshes) e.material = m.eye;
	for (const f of s.featherMeshes) f.material = m.feather;
	const fine = m.setae.clone();
	fine.opacity = m.setae.opacity * .7;
	for (const l of s.setaeLines) l.material = l.userData.fine ? fine : m.setae;
}
function lowArticle(m) {
	const g = m.geometry;
	g.computeBoundingBox();
	const bb = g.boundingBox;
	const len = Math.max(.01, bb.max.z);
	const r = Math.max(.02, (bb.max.x - bb.min.x + bb.max.y - bb.min.y) / 4);
	const low = article(len, r, r * .75, {
		rings: 3,
		seg: 4,
		knob: 0
	});
	const src = g.getAttribute("color");
	if (src) {
		const sp = g.getAttribute("position");
		const lp = low.getAttribute("position");
		const col = new Float32Array(lp.count * 4);
		for (let i = 0; i < lp.count; i++) {
			const z = lp.getZ(i);
			let best = 0;
			let bd = Infinity;
			for (let k = 0; k < sp.count; k++) {
				const dz = Math.abs(sp.getZ(k) - z);
				if (dz < bd) {
					bd = dz;
					best = k;
				}
			}
			for (let c = 0; c < 4; c++) col[i * 4 + c] = src.array[best * 4 + c];
		}
		low.setAttribute("color", new THREE.BufferAttribute(col, 4));
	}
	return low;
}
var ATTRS = [
	["position", 3],
	["normal", 3],
	["uv", 2],
	["color", 4],
	["aRest", 3],
	["aRestN", 3]
];
function skinMerge(owner, list, objInv, geoOf = (m) => m.geometry) {
	const geos = list.map(geoOf);
	const names = ATTRS.filter(([n]) => geos.some((g) => g.getAttribute(n)));
	let vCount = 0;
	let iCount = 0;
	for (const g of geos) {
		vCount += g.attributes.position.count;
		iCount += g.index ? g.index.count : g.attributes.position.count;
	}
	const arrs = new Map(names.map(([n, s]) => [n, new Float32Array(vCount * s)]));
	const idx = new Uint32Array(iCount);
	const si = new Uint16Array(vCount * 4);
	const sw = new Float32Array(vCount * 4);
	const M = new THREE.Matrix4();
	const N = new THREE.Matrix3();
	const v = new THREE.Vector3();
	let vo = 0;
	let io = 0;
	list.forEach((m, b) => {
		const g = geos[b];
		M.multiplyMatrices(objInv, m.matrixWorld);
		N.getNormalMatrix(M);
		const n = g.attributes.position.count;
		for (const [name, size] of names) {
			const dst = arrs.get(name);
			const src = g.getAttribute(name);
			for (let i = 0; i < n; i++) {
				const o = (vo + i) * size;
				if (!src) {
					for (let k = 0; k < size; k++) dst[o + k] = name === "color" ? 1 : 0;
					continue;
				}
				if (name === "position") {
					v.fromBufferAttribute(src, i).applyMatrix4(M);
					dst.set([
						v.x,
						v.y,
						v.z
					], o);
				} else if (name === "normal") {
					v.fromBufferAttribute(src, i).applyMatrix3(N).normalize();
					dst.set([
						v.x,
						v.y,
						v.z
					], o);
				} else for (let k = 0; k < size; k++) dst[o + k] = src.array[i * src.itemSize + k] ?? (k === 3 ? 1 : 0);
			}
		}
		if (g.index) for (let k = 0; k < g.index.count; k++) idx[io + k] = g.index.getX(k) + vo;
		else for (let k = 0; k < n; k++) idx[io + k] = vo + k;
		io += g.index ? g.index.count : n;
		for (let i = 0; i < n; i++) {
			si[(vo + i) * 4] = b;
			sw[(vo + i) * 4] = 1;
		}
		vo += n;
	});
	const geo = new THREE.BufferGeometry();
	for (const [name, size] of names) geo.setAttribute(name, new THREE.BufferAttribute(arrs.get(name), size));
	geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
	geo.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4));
	geo.setIndex(new THREE.BufferAttribute(idx, 1));
	const mesh = new THREE.SkinnedMesh(geo, list[0].material);
	mesh.castShadow = list.some((m) => m.castShadow);
	mesh.receiveShadow = list.some((m) => m.receiveShadow);
	mesh.frustumCulled = false;
	mesh.renderOrder = list[0].renderOrder;
	mesh.userData = { ...list[0].userData };
	owner.add(mesh);
	owner.updateMatrixWorld(true);
	mesh.bind(new THREE.Skeleton(list), mesh.matrixWorld);
	for (const m of list) m.visible = false;
	return mesh;
}
function lineMerge(owner, list) {
	const srcs = list.map((l) => l.geometry.getAttribute("position"));
	const total = srcs.reduce((a, s) => a + s.count, 0);
	const pos = new Float32Array(total * 3);
	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
	const merged = new THREE.LineSegments(geo, list[0]?.material ?? new THREE.LineBasicMaterial());
	merged.frustumCulled = false;
	merged.userData = { ...list[0]?.userData };
	owner.add(merged);
	for (const l of list) l.visible = false;
	const M = new THREE.Matrix4();
	const e = M.elements;
	return {
		mesh: merged,
		sync(objInv) {
			if (!merged.visible) return;
			let o = 0;
			list.forEach((l, k) => {
				M.multiplyMatrices(objInv, l.matrixWorld);
				const a = srcs[k].array;
				for (let i = 0; i < a.length; i += 3) {
					const x = a[i];
					const y = a[i + 1];
					const z = a[i + 2];
					pos[o++] = e[0] * x + e[4] * y + e[8] * z + e[12];
					pos[o++] = e[1] * x + e[5] * y + e[9] * z + e[13];
					pos[o++] = e[2] * x + e[6] * y + e[10] * z + e[14];
				}
			});
			geo.attributes.position.needsUpdate = true;
		}
	};
}
function mergeShrimp(s) {
	const o = s.object;
	o.updateMatrixWorld(true);
	const objInv = new THREE.Matrix4().copy(o.matrixWorld).invert();
	const whipMeshes = new Set(s.whips.map((w) => w.mesh));
	const apps = s.appMeshes.filter((m) => !whipMeshes.has(m));
	const plates = apps.filter((m) => m.userData.part === "plate");
	const solids = apps.filter((m) => m.userData.part !== "plate");
	const bodyParts = s.bodyMeshes.filter((m) => !m.isSkinnedMesh);
	const shells = s.bodyMeshes.filter((m) => m.isSkinnedMesh);
	const solidLow = skinMerge(o, solids, objInv, lowArticle);
	solidLow.visible = false;
	const solidM = skinMerge(o, solids, objInv);
	const plateM = skinMerge(o, plates, objInv);
	const bodyM = skinMerge(o, bodyParts, objInv);
	const eyeM = skinMerge(o, s.eyeMeshes, objInv);
	const featherM = skinMerge(o, s.featherMeshes, objInv);
	const tubes = s.whips.map((w) => w.mesh.geometry);
	const wn = tubes.reduce((a, g) => a + g.attributes.position.count, 0);
	const wi = tubes.reduce((a, g) => a + g.index.count, 0);
	const wpos = new Float32Array(wn * 3);
	const wnrm = new Float32Array(wn * 3);
	const wuv = new Float32Array(wn * 2);
	const wcol = new Float32Array(wn * 4).fill(1);
	const widx = new Uint32Array(wi);
	{
		let vo = 0;
		let io = 0;
		for (const g of tubes) {
			const n = g.attributes.position.count;
			wuv.set(g.attributes.uv.array, vo * 2);
			const c = g.getAttribute("color");
			if (c) wcol.set(c.array, vo * 4);
			const ix = g.index;
			for (let k = 0; k < ix.count; k++) widx[io + k] = ix.getX(k) + vo;
			vo += n;
			io += ix.count;
		}
	}
	const wgeo = new THREE.BufferGeometry();
	wgeo.setAttribute("position", new THREE.BufferAttribute(wpos, 3).setUsage(THREE.DynamicDrawUsage));
	wgeo.setAttribute("normal", new THREE.BufferAttribute(wnrm, 3).setUsage(THREE.DynamicDrawUsage));
	wgeo.setAttribute("uv", new THREE.BufferAttribute(wuv, 2));
	wgeo.setAttribute("color", new THREE.BufferAttribute(wcol, 4));
	wgeo.setIndex(new THREE.BufferAttribute(widx, 1));
	const whipM = new THREE.Mesh(wgeo, s.whips[0].mesh.material);
	whipM.castShadow = true;
	whipM.frustumCulled = false;
	whipM.userData = { ...s.whips[0].mesh.userData };
	o.add(whipM);
	for (const w of s.whips) w.mesh.visible = false;
	const coarse = lineMerge(o, s.setaeLines.filter((l) => !l.userData.fine));
	const fine = lineMerge(o, s.setaeLines.filter((l) => l.userData.fine));
	const replace = (arr, items) => {
		arr.length = 0;
		arr.push(...items);
	};
	replace(s.bodyMeshes, [...shells, bodyM]);
	replace(s.appMeshes, [
		solidM,
		solidLow,
		plateM,
		whipM
	]);
	replace(s.eyeMeshes, [eyeM]);
	replace(s.featherMeshes, [featherM]);
	replace(s.setaeLines, [coarse.mesh, fine.mesh]);
	const inv = new THREE.Matrix4();
	const merged = {
		far: false,
		sync() {
			let vo = 0;
			for (const g of tubes) {
				wpos.set(g.attributes.position.array, vo * 3);
				wnrm.set(g.attributes.normal.array, vo * 3);
				vo += g.attributes.position.count;
			}
			wgeo.attributes.position.needsUpdate = true;
			wgeo.attributes.normal.needsUpdate = true;
			if (merged.far) return;
			o.updateMatrixWorld(true);
			inv.copy(o.matrixWorld).invert();
			coarse.sync(inv);
			fine.sync(inv);
		},
		setFar(far) {
			if (far === merged.far) return;
			merged.far = far;
			coarse.mesh.visible = fine.mesh.visible = featherM.visible = solidM.visible = !far;
			solidLow.visible = far;
			if (shells.length > 1) {
				shells[0].visible = !far;
				shells[1].visible = far;
			}
			if (!far) merged.sync();
		}
	};
	return merged;
}
var dX = (d) => 22.7 - d;
var SC$1 = 2.7;
var SIDE = [
	[
		10.5,
		16.71,
		15.6
	],
	[
		11.5,
		17.04,
		14.95
	],
	[
		12.5,
		17.25,
		14.34
	],
	[
		13.5,
		17.5,
		13.69
	],
	[
		14.5,
		17.71,
		12.97
	],
	[
		15.5,
		17.91,
		12.31
	],
	[
		16.5,
		18.15,
		11.68
	],
	[
		17.5,
		18.37,
		11.11
	],
	[
		18.5,
		18.52,
		10.7
	],
	[
		19.5,
		18.61,
		10.32
	],
	[
		20.5,
		18.67,
		10.03
	],
	[
		21.5,
		18.72,
		9.76
	],
	[
		22.5,
		18.8,
		9.52
	],
	[
		23.5,
		18.88,
		9.33
	],
	[
		24.5,
		18.98,
		9.2
	],
	[
		25.5,
		19,
		9.07
	],
	[
		26.5,
		18.98,
		8.95
	],
	[
		27.5,
		18.91,
		8.93
	],
	[
		28.5,
		18.87,
		8.93
	],
	[
		29.5,
		18.82,
		9
	],
	[
		30.5,
		18.75,
		9.09
	],
	[
		31.5,
		18.67,
		9.21
	],
	[
		32.5,
		18.48,
		9.39
	],
	[
		33.5,
		18.22,
		9.54
	],
	[
		34.5,
		18.1,
		9.83
	],
	[
		35.5,
		18.18,
		10.11
	],
	[
		36.5,
		18.35,
		10.07
	],
	[
		37.5,
		18.48,
		10.09
	],
	[
		38.5,
		18.72,
		10.2
	],
	[
		39.5,
		18.98,
		10.26
	],
	[
		40.5,
		19.2,
		10.27
	],
	[
		41.5,
		19.38,
		10.46
	],
	[
		42.5,
		19.5,
		10.7
	],
	[
		43.5,
		19.7,
		10.85
	],
	[
		44.5,
		19.83,
		10.96
	],
	[
		45.5,
		19.89,
		11.11
	],
	[
		46.5,
		19.82,
		11.4
	],
	[
		47.5,
		19.59,
		11.58
	],
	[
		48.5,
		19.33,
		11.77
	],
	[
		49.5,
		19.07,
		11.92
	],
	[
		50.5,
		18.79,
		12.04
	],
	[
		51.5,
		18.41,
		12.16
	],
	[
		52.5,
		18.1,
		12.35
	],
	[
		53.5,
		17.92,
		12.54
	],
	[
		54.5,
		17.82,
		12.87
	],
	[
		55.5,
		17.82,
		13.2
	],
	[
		56.5,
		17.95,
		13.68
	],
	[
		57.5,
		18.04,
		14.02
	],
	[
		58.5,
		18.06,
		14.34
	],
	[
		59.5,
		17.95,
		14.62
	],
	[
		60.5,
		17.8,
		14.62
	],
	[
		61.5,
		17.63,
		14.65
	]
];
var TOP = [
	[10.5, .42],
	[11.5, 1.84],
	[12.5, 2.77],
	[13.5, 3.6],
	[14.5, 4.24],
	[15.5, 4.74],
	[16.5, 5.1],
	[17.5, 5.41],
	[18.5, 5.71],
	[19.5, 5.94],
	[20.5, 6.09],
	[21.5, 6.23],
	[22.5, 6.32],
	[23.5, 6.39],
	[24.5, 6.44],
	[25.5, 6.47],
	[26.5, 6.49],
	[27.5, 6.44],
	[28.5, 6.42],
	[29.5, 6.35],
	[30.5, 6.23],
	[31.5, 6.07],
	[32.5, 5.81],
	[33.5, 5.5],
	[34.5, 5.2],
	[35.5, 5.08],
	[36.5, 5.07],
	[37.5, 4.95],
	[38.5, 4.8],
	[39.5, 4.87],
	[40.5, 4.94],
	[41.5, 4.92],
	[42.5, 4.81],
	[43.5, 4.57],
	[44.5, 4.54],
	[45.5, 4.67],
	[46.5, 4.68],
	[47.5, 4.59],
	[48.5, 4.33],
	[49.5, 4.02],
	[50.5, 3.96],
	[51.5, 3.96],
	[52.5, 3.86],
	[53.5, 3.54],
	[54.5, 3.13],
	[55.5, 2.98],
	[56.5, 2.98],
	[57.5, 2.81],
	[58.5, 2.52],
	[59.5, 2.65],
	[60.5, 2.48],
	[61.5, 2.3]
];
var topAt = table(SIDE.map((r) => [r[0], r[1]]));
var botAt = table(SIDE.map((r) => [r[0], r[2]]));
var halfW = table(TOP);
var bodyTop = topAt;
var bodyBot = botAt;
var SEG_D = [
	34.9,
	38.8,
	43.9,
	49.7,
	54.8,
	58,
	61.5
];
var SHELL_D0 = 10.5;
var SHELL_D1 = 61.6;
var axisY = (d) => botAt(d) + .35 * (topAt(d) - botAt(d));
var hingeObj = (d) => new THREE.Vector3(dX(d), topAt(d) - .15 * (topAt(d) - botAt(d)), 0);
var sm = (t) => {
	const x = Math.min(1, Math.max(0, t));
	return x * x * (3 - 2 * x);
};
var TUCK = .8 * SC$1;
var PLEURA2 = {
	fwd: .85 * SC$1,
	back: .6 * SC$1
};
function pieceRange(k) {
	return [k === 0 ? SHELL_D0 : SEG_D[k - 1], k === 6 ? SHELL_D1 : SEG_D[k]];
}
function sectionPoint(d0, a, scale, out, remap) {
	let d = d0;
	if (remap) {
		const t0 = topAt(d0);
		const b0 = botAt(d0);
		const ax0 = axisY(d0);
		const c0 = Math.cos(a);
		d = remap((ax0 + (c0 >= 0 ? t0 - ax0 : ax0 - b0) * Math.sign(c0) * Math.abs(c0) ** (2 / 2.7) - b0) / Math.max(.01, t0 - b0));
	}
	const t = topAt(d);
	const b = botAt(d);
	const ax = axisY(d);
	const ht = t - ax;
	const hb = ax - b;
	const w = halfW(d);
	const narrow = lerp(.12, .28, sm((d - 34.4) / 1.2));
	const e = 2 / 2.7;
	const c = Math.cos(a);
	const s = Math.sin(a);
	const yy = (c >= 0 ? ht : hb) * Math.sign(c) * Math.abs(c) ** e;
	const bottom = Math.max(0, -c);
	const zz = w * Math.sign(s) * Math.abs(s) ** e * (1 - narrow * bottom * bottom);
	const f = scale((ax + yy - b) / Math.max(.01, t - b), d);
	out.push(dX(d), ax + yy * f, zz * f);
}
function shellGeometry(fine = .07 * SC$1, coarse = .25 * SC$1, seg = 28) {
	const pos = [];
	const uv = [];
	const si = [];
	const sw = [];
	const idx = [];
	const row = seg + 1;
	const tmp = [];
	for (let k = 0; k <= 6; k++) {
		const [A, Bd] = pieceRange(k);
		const front = k === 0 ? A : A - (k === 2 ? Math.max(TUCK, PLEURA2.fwd) : TUCK);
		const back = k === 2 ? Bd + PLEURA2.back : Bd;
		const ds = [];
		for (let d = front; d < back;) {
			ds.push(d);
			const near = d > A - .08 * SC$1 && d < A + .15 * SC$1 || d > Bd - .2 * SC$1;
			const nextEdge = d < A - .08 * SC$1 ? A - .08 * SC$1 : d < Bd - .2 * SC$1 ? Bd - .2 * SC$1 : back;
			d += near ? fine : Math.min(coarse, Math.max(fine, nextEdge - d));
		}
		ds.push(back);
		const nR = ds.length;
		const base = pos.length / 3;
		for (let i = 0; i < nR; i++) {
			const d = ds[i];
			const first = i === 0;
			const last = i === nR - 1;
			const skirt = (h01) => sm((.4 - h01) / .1);
			const arc = (h01, R) => R * Math.sqrt(Math.max(0, 1 - (h01 / .5) ** 2));
			const rearRound = (h01) => .45 * SC$1 * (1 - Math.min(1, h01 / .42)) ** 1.6;
			const sk = (h01) => h01 < .5 ? 1 : 0;
			const remap = (h01) => {
				if (k === 2 && d < A) return Math.max(d, A - arc(h01, PLEURA2.fwd) * sk(h01));
				if (k === 2 && d > Bd) return Math.min(d, Bd + arc(h01, PLEURA2.back) * sk(h01));
				if (k >= 1 && k <= 5 && k !== 2 && d > Bd - .5 * SC$1 && h01 < .42) return Math.min(d, Bd - rearRound(h01));
				return d;
			};
			const scale = (h01) => {
				let f = 1;
				if (d < A) {
					f = k === 2 ? lerp(.9, 1.03, skirt(h01)) : .93;
					if (first) f *= k === 2 ? lerp(.92, 1, skirt(h01)) : .92;
				} else if (d > Bd) {
					f = lerp(.88, 1.03, skirt(h01));
					if (last) f *= lerp(.92, 1, skirt(h01));
				} else {
					f = 1 + .015 * sm((d - (Bd - .14 * SC$1)) / (.1 * SC$1));
					if (k === 2 && d > Bd - .14 * SC$1) f = lerp(f, 1.03, skirt(h01));
					if (last && k !== 2) f *= k === 6 ? .2 : .9;
				}
				if (k === 0 && first) f = .05;
				return f;
			};
			for (let j = 0; j <= seg; j++) {
				const a = Math.PI + j / seg * Math.PI * 2;
				tmp.length = 0;
				sectionPoint(d, a, scale, tmp, remap);
				pos.push(tmp[0], tmp[1], tmp[2]);
				uv.push(i / (nR - 1), j / seg);
				si.push(k, 0, 0, 0);
				sw.push(1, 0, 0, 0);
			}
		}
		for (let i = 0; i < nR - 1; i++) for (let j = 0; j < seg; j++) {
			const q = base + i * row + j;
			const r = q + row;
			idx.push(q, r, q + 1, q + 1, r, r + 1);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
	g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
	g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
	g.setIndex(idx);
	g.computeVertexNormals();
	const nrm = g.getAttribute("normal");
	for (let q = 0; q < nrm.count; q += row) {
		const b = q + seg;
		const v = new THREE.Vector3(nrm.getX(q) + nrm.getX(b), nrm.getY(q) + nrm.getY(b), nrm.getZ(q) + nrm.getZ(b)).normalize();
		nrm.setXYZ(q, v.x, v.y, v.z);
		nrm.setXYZ(b, v.x, v.y, v.z);
	}
	const mid = 30 * row + Math.round(seg / 2);
	if (nrm.getY(mid) < 0) {
		const ix = g.getIndex();
		for (let q = 0; q < ix.count; q += 3) {
			const tq = ix.getX(q + 1);
			ix.setX(q + 1, ix.getX(q + 2));
			ix.setX(q + 2, tq);
		}
		for (let q = 0; q < nrm.count; q++) nrm.setXYZ(q, -nrm.getX(q), -nrm.getY(q), -nrm.getZ(q));
	}
	return g;
}
var V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
var clamp = THREE.MathUtils.clamp;
var Z = new THREE.Vector3(0, 0, 1);
var aim = (m, dir) => m.quaternion.setFromUnitVectors(Z, dir.clone().normalize());
var SC = 2.7;
var TILT = 0;
var KNEE_X = [
	-.2,
	.1,
	.3
];
var STRIDE = 2 * SC;
var DUTY = .6;
var Y_AX = new THREE.Vector3(0, 1, 0);
var WHIP_DODGE = [
	["up", .3],
	["side", .3],
	["side", -.3],
	["up", .6],
	["side", .6],
	["side", -.6],
	["up", 1],
	["side", 1],
	["side", -1],
	["up", -.4],
	["up", 1.5],
	["up", -.8],
	["side", 1.6],
	["side", -1.6],
	["up", -1.3]
];
var ARM_DODGE = [
	[
		4,
		0,
		1
	],
	[
		8,
		0,
		1
	],
	[
		4,
		4,
		1
	],
	[
		0,
		5,
		1
	],
	[
		8,
		5,
		1
	],
	[
		12,
		3,
		1
	],
	[
		6,
		8,
		.9
	],
	[
		0,
		0,
		.8
	],
	[
		6,
		4,
		.8
	],
	[
		10,
		6,
		.7
	],
	[
		4,
		10,
		.7
	],
	[
		0,
		0,
		.6
	]
];
var LEGS = [
	{
		d: 20,
		len: [
			.8,
			.7,
			3.5,
			8,
			7,
			2.4,
			1.8
		],
		r: .34,
		chela: true,
		home: [14, 16]
	},
	{
		d: 22,
		len: [
			1.2,
			1,
			11,
			19.5,
			16.5,
			3.5,
			12.5
		],
		r: .85,
		chela: true,
		home: [50, 16],
		bends: [
			.05,
			-.03,
			-.03
		]
	},
	{
		d: 25,
		len: [
			.9,
			.8,
			3.5,
			9.5,
			4,
			8,
			2.3
		],
		r: .45,
		chela: false,
		home: [1, 20]
	},
	{
		d: 28.5,
		len: [
			.9,
			.8,
			3.5,
			9.5,
			4.2,
			8.5,
			2.3
		],
		r: .45,
		chela: false,
		home: [-13.5, 20]
	},
	{
		d: 32,
		len: [
			.9,
			.8,
			3.5,
			9,
			4.3,
			9,
			2.4
		],
		r: .42,
		chela: false,
		home: [-25.5, 15]
	}
];
function clayMaterials() {
	const m = new THREE.MeshStandardMaterial({
		color: 10263708,
		roughness: .55
	});
	return {
		shell: new THREE.MeshStandardMaterial({
			color: 10263708,
			roughness: .55,
			side: THREE.DoubleSide
		}),
		app: m,
		plate: new THREE.MeshStandardMaterial({
			color: 10263708,
			roughness: .55,
			side: THREE.DoubleSide
		}),
		eye: new THREE.MeshStandardMaterial({
			color: 3158064,
			roughness: .3
		}),
		setae: new THREE.LineBasicMaterial({
			color: 12303291,
			transparent: true,
			opacity: .6
		}),
		inner: m,
		feather: featherMaterial(10263708, .9)
	};
}
var Leg = class {
	def;
	side;
	index;
	arts = [];
	target = V3();
	planted = new THREE.Vector3();
	state = "stance";
	swingT = 0;
	swingDur = .2;
	swingFromW = V3();
	swingToW = V3();
	phaseOff = 0;
	lastPhase = 0;
	airFrom = V3();
	airK = 0;
	open = .3;
	twist = 0;
	fingers = [];
	attach;
	L1;
	link2;
	chord = 0;
	chordAng = 0;
	reach = 0;
	constructor(def, side, index) {
		this.def = def;
		this.side = side;
		this.index = index;
		this.attach = V3(dX(def.d), -4.6, side * (1.3 + index * .25));
		if (!def.chela) {
			const groupA = index === 3 === side < 0;
			this.phaseOff = (groupA ? 0 : .5) + (4 - index) * .07;
		}
		const l = def.len;
		this.L1 = l[2] + l[3];
		const bends = def.bends ?? (def.chela ? [
			.18,
			-.22,
			-.3
		] : [
			.22,
			-.08,
			-.38
		]);
		this.link2 = [
			{
				dir: bends[0],
				len: l[4]
			},
			{
				dir: bends[1],
				len: l[5]
			},
			{
				dir: bends[2],
				len: l[6]
			}
		];
		let cx = 0;
		let cy = 0;
		for (const a of this.link2) {
			cx += Math.cos(a.dir) * a.len;
			cy += Math.sin(a.dir) * a.len;
		}
		this.chord = Math.hypot(cx, cy);
		this.chordAng = Math.atan2(cy, cx);
		this.reach = l[0] + l[1] + this.L1 + this.chord;
	}
};
var Prawn = class {
	object = new THREE.Group();
	B = new THREE.Bone();
	somites = [];
	telson = new THREE.Bone();
	shell;
	shellFar;
	merged = null;
	uropods = [];
	legs = [];
	pleopods = [];
	whips = [];
	eyes = [];
	maxillipeds = [];
	scales = [];
	bodyMeshes = [];
	appMeshes = [];
	plateMeshes = [];
	setaeLines = [];
	eyeMeshes = [];
	featherMeshes = [];
	mats;
	ground = 0;
	mode = "auto";
	act = "graze";
	actTime = 0;
	actLen = 8;
	time = 0;
	heading = 0;
	lift = 0;
	turn = 0;
	range = .08;
	fan = .5;
	curl = 0;
	rnd = rng(7);
	flipV = 0;
	constructor(mats = clayMaterials()) {
		this.mats = mats;
		this.object.scale.setScalar(.001);
		this.object.add(this.B);
		this.B.position.set(0, 14, 0);
		this.B.rotation.z = TILT;
		this.buildCarapace();
		this.buildAbdomen();
		this.buildHead();
		this.buildLegs();
		this.restPose();
		this.object.updateMatrixWorld(true);
		const skel = new THREE.Skeleton([
			this.B,
			...this.somites,
			this.telson
		]);
		this.shell.bind(skel, this.shell.matrixWorld);
		this.shellFar.bind(skel, this.shellFar.matrixWorld);
	}
	addBody(parent, g, part = "body") {
		const m = new THREE.Mesh(g, this.mats.shell);
		m.castShadow = true;
		m.receiveShadow = true;
		m.userData.part = part;
		parent.add(m);
		this.bodyMeshes.push(m);
		return m;
	}
	addApp(parent, g, part = "leg", kind = "", art = 0, leg = 0) {
		const m = new THREE.Mesh(g, this.mats.app);
		m.castShadow = true;
		m.userData = {
			part,
			kind,
			art,
			leg
		};
		parent.add(m);
		this.appMeshes.push(m);
		return m;
	}
	addFeather(parent, g) {
		const m = new THREE.Mesh(g, this.mats.feather);
		m.renderOrder = 2;
		parent.add(m);
		this.featherMeshes.push(m);
		return m;
	}
	addSetae(parent, g) {
		const l = new THREE.LineSegments(g, this.mats.setae);
		parent.add(l);
		this.setaeLines.push(l);
		return l;
	}
	buildCarapace() {
		const shell = new THREE.SkinnedMesh(shellGeometry(), this.mats.shell);
		shell.castShadow = true;
		shell.receiveShadow = true;
		shell.frustumCulled = false;
		shell.userData.part = "shell";
		this.object.add(shell);
		this.bodyMeshes.push(shell);
		this.shell = shell;
		const far = new THREE.SkinnedMesh(shellGeometry(.2, .8, 12), this.mats.shell);
		far.castShadow = true;
		far.receiveShadow = true;
		far.frustumCulled = false;
		far.visible = false;
		far.userData.part = "shell";
		this.object.add(far);
		this.bodyMeshes.push(far);
		this.shellFar = far;
		const st = [];
		const N = 90;
		const D0 = 20;
		const D1 = -.5;
		for (let i = 0; i < N; i++) {
			const d = lerp(D0, D1, i / 89);
			const x = dX(d);
			const free = smooth(14.5, 12, d);
			const back = bodyTop(Math.max(d, 10.5)) - 14;
			const topY = lerp(Math.max(back, 3.6), 5.2 + .8 * smooth(12.5, D1, d), free);
			let tooth = 0;
			if (d > 1.5 && d < 19.5) {
				const k = (19.5 - d) / 18 * 12;
				const f = k - Math.floor(k);
				tooth = lerp(.42, .25, (19.5 - d) / 18) * (f < .7 ? f / .7 : (1 - f) / .3) ** 1.3;
			}
			let vt = 0;
			if (d > .3 && d < 7) {
				const k = (7 - d) / 6.7 * 3;
				const f = k - Math.floor(k);
				vt = .3 * (f < .7 ? f / .7 : (1 - f) / .3) ** 1.3;
			}
			const depth = lerp(Math.max(1.4, topY - (back - .8)), lerp(1.4, .15, smooth(9, D1, d)), free) + vt;
			st.push({
				p: V3(x, topY - .5, 0),
				up: V3(0, 1, 0),
				side: V3(0, 0, 1),
				top: .5 + tooth + .05,
				bot: depth - .5,
				th: lerp(1.2, lerp(.45, .12, smooth(12, D1, d)), free)
			});
		}
		st[89].top = .05;
		st[89].bot = .05;
		this.addApp(this.B, ribbon(st, 4), "plate", "rostrum");
	}
	buildAbdomen() {
		let parent = this.B;
		let prev = V3(0, 14, 0);
		for (let k = 0; k < 6; k++) {
			const h = hingeObj(SEG_D[k]);
			const b = new THREE.Bone();
			b.position.copy(h).sub(prev);
			parent.add(b);
			this.somites.push(b);
			parent = b;
			prev = h;
			if (k < 5) for (const side of [1, -1]) this.buildPleopod(b, k, side);
		}
		const ht = hingeObj(SEG_D[6]);
		this.telson.position.copy(ht).sub(prev);
		this.somites[5].add(this.telson);
		const T = [
			[
				61.4,
				17.3,
				15.4,
				1.6
			],
			[
				63,
				17.1,
				15.8,
				1.35
			],
			[
				65,
				16.9,
				16,
				1
			],
			[
				67,
				16.7,
				16.1,
				.6
			],
			[
				68.6,
				16.55,
				16.2,
				.25
			],
			[
				69.2,
				16.45,
				16.3,
				.05
			]
		];
		const tr = [];
		const tf = (k) => table(T.map((r) => [r[0], r[k]]));
		for (let i = 0; i <= 16; i++) {
			const d = lerp(61.4, 69.2, i / 16);
			const top = tf(1)(d);
			const bot = tf(2)(d);
			const ax = (top + bot) / 2;
			tr.push({
				x: dX(d),
				y: ax,
				ht: Math.max(.05, top - ax),
				hb: Math.max(.05, ax - bot),
				w: Math.max(.05, tf(3)(d)),
				n: 2.6,
				narrow: .1
			});
		}
		const tg = loft(tr, 16);
		tg.translate(-ht.x, -ht.y, 0);
		this.addBody(this.telson, tg, "telson");
		const tipE = [];
		const tipO = [];
		for (let i = 0; i < 9; i++) {
			const a = lerp(-.9, .9, i / 8);
			tipE.push(V3(dX(69) - ht.x, 16.4 - ht.y, Math.sin(a) * .2));
			tipO.push(V3(-1, .05, Math.sin(a) * 1.2));
		}
		this.addSetae(this.telson, fringe(tipE, tipO, (i) => i % 2 ? 1 : .7));
		for (const side of [1, -1]) {
			const u = new THREE.Group();
			u.position.set(dX(61.6) - ht.x, 15.9 - ht.y, side * 1.2);
			this.telson.add(u);
			const prot = this.addBody(u, article(1.6, .8, .7, { flat: .7 }), "uropod");
			prot.rotation.y = -Math.PI / 2 + side * .4;
			for (const p of [{
				len: 7.8,
				w: 3.4,
				yaw: .16,
				y: .15,
				outer: false
			}, {
				len: 8.6,
				w: 4.2,
				yaw: .42,
				y: -.15,
				outer: true
			}]) {
				const r = new THREE.Group();
				r.position.set(-.7, 0, side * .3);
				r.userData = {
					yaw: p.yaw,
					side,
					outer: p.outer
				};
				u.add(r);
				const width = (t) => p.w * Math.sin(Math.PI * Math.min(1, .03 + t * .99)) ** .42 * (.55 + .45 * Math.min(1, t * 2.5)) * (1 - .12 * t * t);
				const skew = (t) => -side * (p.outer ? .5 : .25) * Math.sin(Math.PI * t);
				const g = leaf(p.len, width, .22, {
					skew,
					n: 14,
					m: 6,
					cup: .12
				});
				const lm = this.addApp(r, g, "plate", p.outer ? "uroOut" : "uroIn");
				lm.position.y = p.y;
				const e = [];
				const o = [];
				for (let i = 0; i <= 30; i++) {
					const t = .45 + i / 30 * .55;
					const w = width(t) / 2;
					const x = skew(t);
					for (const sd of [1, -1]) {
						if (p.outer && sd === side * -1 && t < .85) continue;
						e.push(V3(x + sd * w, p.y, t * p.len));
						o.push(V3(sd * 1, 0, .6 + t));
					}
				}
				this.addSetae(r, fringe(e, o, (i) => .4 + .15 * Math.sin(i * 1.7)));
				this.uropods.push(r);
			}
		}
	}
	buildPleopod(seg, k, side) {
		const sc = (k === 0 ? .8 : k === 4 ? .85 : 1) * SC;
		const g = new THREE.Group();
		const dm = (SEG_D[k] + SEG_D[k + 1]) / 2;
		g.position.copy(V3(dX(dm), bodyBot(dm) + 1.3 * SC, side * .45 * SC).sub(hingeObj(SEG_D[k])));
		seg.add(g);
		const pl = .7 * sc;
		const prot = this.addApp(g, article(pl, .17 * sc, .12 * sc, { flat: .7 }), "leg", "pleoProt");
		prot.rotation.x = Math.PI / 2;
		const rami = [];
		const rr = rng(k * 13 + (side > 0 ? 1 : 2));
		for (const [i, len] of [[0, 1.55 * sc], [1, 1.35 * sc]]) {
			const r = new THREE.Group();
			r.position.set(0, -pl + .05 * SC, side * (i === 0 ? .07 : -.06) * SC);
			r.userData.splay = side * (i === 0 ? .22 : -.1);
			g.add(r);
			const shaft = this.addApp(r, article(len, .07 * sc, .025 * SC, {
				flat: .55,
				knob: 0,
				rings: 4,
				seg: 5
			}), "leg", "pleoRamus");
			shaft.rotation.x = Math.PI / 2;
			shaft.castShadow = false;
			const w = 1.35 * sc;
			for (const [rot, off] of [[0, 0], [1.15 + rr() * .3, .02]]) {
				const card = this.addFeather(r, featherCard(len * 1.08, w));
				card.position.set(0, (-.08 - off) * SC, 0);
				card.rotation.y = rot * side;
			}
			rami.push(r);
		}
		g.userData.side = side;
		this.pleopods.push({
			group: g,
			rami,
			phase: k * .85
		});
	}
	buildHead() {
		const B = this.B;
		for (const side of [1, -1]) {
			const eg = new THREE.Group();
			eg.position.set(dX(15), 3.9, side * 1.4);
			B.add(eg);
			const to = V3(dX(12.5), 4.9, side * 3.4).clone().sub(eg.position);
			const sl = to.length() - .8;
			aim(this.addApp(eg, article(sl, .95, .85, { knob: 0 }), "stalk", "stalk"), to);
			const eye = new THREE.Mesh(new THREE.SphereGeometry(1.1, 22, 14), this.mats.eye);
			eye.position.copy(to);
			eye.castShadow = true;
			eg.add(eye);
			this.eyeMeshes.push(eye);
			this.eyes.push(eg);
			const ag = new THREE.Group();
			ag.position.set(dX(13), 1, side * 1);
			B.add(ag);
			const dir = V3(1, .05, side * .04).normalize();
			let p = V3();
			for (const [len, r0, r1, fl] of [
				[
					4.4,
					.75,
					.55,
					.6
				],
				[
					2.6,
					.45,
					.4,
					.9
				],
				[
					2.3,
					.38,
					.33,
					1
				]
			]) {
				const m = this.addApp(ag, article(len, r0, r1, { flat: fl }), "antenna", "a1ped");
				m.position.copy(p);
				aim(m, dir);
				p = p.clone().addScaledVector(dir, len * .97);
				dir.applyAxisAngle(V3(0, 0, 1), .02).normalize();
			}
			const sty = this.addApp(ag, article(2.4, .3, .05, { knob: 0 }), "antenna", "sty");
			sty.position.set(.3, -.25, side * .6);
			aim(sty, V3(1, 0, side * .3));
			const pB = p.clone().add(ag.position);
			for (const kind of ["outer", "inner"]) {
				const len = kind === "outer" ? 45 : 36;
				const n = 44;
				const r0 = kind === "outer" ? .24 : .19;
				const tube = new FlexTube(n, (t) => lerp(r0, .035, t ** .7), 5);
				const mesh = this.addApp(this.object, tube.geometry, "antenna", "a1flag");
				mesh.frustumCulled = false;
				this.whips.push({
					tube,
					mesh,
					pts: Array.from({ length: n }, () => V3()),
					len,
					side,
					kind,
					base: pB.clone(),
					dir: dir.clone(),
					flick: 0,
					nextFlick: 1 + this.rnd() * 2
				});
			}
			const asp = this.addApp(B, article(1.2, .2, .03, {
				knob: 0,
				rings: 5
			}), "antenna", "sty");
			asp.position.set(dX(11.5), .4, side * 2.6);
			aim(asp, V3(1, .05, side * .15));
			const base2 = this.addApp(B, article(3.6, .6, .45, { flat: .75 }), "antenna", "a2ped");
			base2.position.set(dX(14.5), -.6, side * 1.9);
			aim(base2, V3(1, .02, side * .12));
			const sg = new THREE.Group();
			sg.position.set(dX(12.8), 0, side * 2.3);
			B.add(sg);
			const scW = (t) => 2.3 * Math.sin(Math.PI * Math.min(1, .06 + t * .97)) ** .55 * (1 - .3 * t);
			const SCL = 8.8;
			const scale = leaf(SCL, scW, .15, {
				n: 12,
				m: 5,
				skew: (t) => side * .25 * Math.sin(Math.PI * t),
				cup: .1
			});
			const sm = this.addApp(sg, scale, "plate", "scale");
			sm.rotation.set(0, Math.PI / 2 - side * .1, 0);
			sm.rotateZ(side * .3);
			sm.rotateX(-.03);
			this.scales.push(sg);
			{
				const e = [];
				const o = [];
				for (let j = 0; j <= 24; j++) {
					const t = .35 + j / 24 * .63;
					const w = scW(t) / 2;
					const sk = side * .25 * Math.sin(Math.PI * t);
					e.push(V3(sk - w, 0, t * SCL));
					o.push(V3(-1, 0, .5));
				}
				this.addSetae(sm, fringe(e, o, (j) => .5 + .15 * Math.sin(j * 2.1)));
			}
			const peds = this.addApp(sg, article(4.5, .4, .3), "antenna", "a2ped");
			peds.position.set(-.3, -.35, -side * .3);
			aim(peds, V3(1, 0, side * .05));
			const wb = V3(dX(7.5), -.3, side * 2);
			const n = 90;
			const tube = new FlexTube(n, (t) => lerp(.24, .03, t ** .5), 5);
			const mesh = this.addApp(this.object, tube.geometry, "antenna", "a2flag");
			mesh.frustumCulled = false;
			this.whips.push({
				tube,
				mesh,
				pts: Array.from({ length: n }, () => V3()),
				len: 105,
				side,
				kind: "antenna",
				base: wb,
				dir: V3(1, .12, side * .18).normalize(),
				flick: 0,
				nextFlick: 0
			});
			const mx = [];
			let par = B;
			const mpos = [
				V3(dX(15.5), -3, side * .9),
				V3(),
				V3()
			];
			const mlen = [
				4.2,
				3.6,
				3.2
			];
			const mrot = [
				[
					0,
					-side * .12,
					-.2
				],
				[
					0,
					0,
					.12
				],
				[
					0,
					0,
					.08
				]
			];
			for (let i = 0; i < 3; i++) {
				const j = new THREE.Group();
				j.position.copy(i === 0 ? mpos[0] : V3(mlen[i - 1], 0, 0));
				j.rotation.set(mrot[i][0], mrot[i][1], mrot[i][2]);
				par.add(j);
				const m = this.addApp(j, article(mlen[i], .34 - i * .06, .27 - i * .06), "leg", "mxp", i);
				m.rotation.y = Math.PI / 2;
				mx.push(j);
				par = j;
			}
			const e = [];
			const o = [];
			for (let i = 0; i < 36; i++) {
				e.push(V3(mlen[2] * (.1 + i / 36 * .9), .08, 0));
				o.push(V3(.7, i % 2 ? .9 : -.9, side * (.2 + i % 3 * .2)));
			}
			this.addSetae(par, fringe(e, o, (i) => .6 + .4 * (i * 7 % 5) / 5));
			this.maxillipeds.push(mx);
		}
	}
	buildLegs() {
		LEGS.forEach((def, i) => {
			for (const side of [1, -1]) {
				const leg = new Leg(def, side, i);
				const l = def.len;
				const r = def.r;
				const radii = def.chela ? [
					r * 1.1,
					r,
					r * .95,
					r,
					r * .85,
					r * 1.05,
					r * .55
				] : [
					r * 1.1,
					r * 1,
					r * .95,
					r * 1,
					r * .82,
					r * .7,
					r * .45
				];
				for (let k = 0; k < 7; k++) {
					if (def.chela && k === 6) break;
					const r0 = radii[k];
					const r1 = k === 6 ? .02 : (radii[k + 1] ?? r0 * .6) * (def.chela && k === 5 ? .85 : 1);
					const g = article(l[k], r0, k === 5 && !def.chela ? r1 * .9 : r1, {
						flat: k === 3 ? .8 : 1,
						rings: k >= 3 ? 6 : 4,
						knob: .05,
						seg: 6
					});
					const m = this.addApp(this.object, g, "leg", def.chela ? "chela" : "walk", k, i);
					m.matrixAutoUpdate = false;
					leg.arts.push({
						mesh: m,
						len: l[k]
					});
					if (k >= 3 && !(def.chela && k >= 5 && i === 0)) {
						const e = [];
						const o = [];
						const spine = !def.chela && k >= 5;
						const n = spine ? k === 5 ? 9 : 4 : Math.round(l[k] * (def.chela && i === 1 ? 7 : 1.2));
						const rr = rng(i * 31 + k * 7 + (side > 0 ? 3 : 4));
						for (let j = 0; j < n; j++) {
							const t = (j + .3 + rr() * .4) / n;
							const a = spine ? Math.PI : rr() * Math.PI * 2;
							const rad = lerp(r0, r1, t) * .85;
							e.push(V3(Math.sin(a) * rad, Math.cos(a) * rad, t * l[k]));
							o.push(spine ? V3(0, -.7, 1) : V3(Math.sin(a) * .8, Math.cos(a) * .8, 1));
						}
						this.addSetae(m, fringe(e, o, () => spine ? k === 5 ? .35 : .25 : def.chela && i === 1 ? .18 + rr() * .12 : .25 + rr() * .2));
					}
				}
				if (def.chela) for (let f = 0; f < 2; f++) {
					const g = article(l[6], r * (i === 1 ? .75 : .5), i === 1 ? .12 : .04, {
						rings: i === 1 ? 8 : 5,
						knob: 0,
						seg: 6,
						flat: i === 1 ? .7 : 1
					});
					const m = this.addApp(this.object, g, "leg", "finger", f, i);
					m.matrixAutoUpdate = false;
					leg.fingers.push(m);
					const e = [];
					const o = [];
					const n = 30;
					for (let j = 0; j < n; j++) {
						const a = lerp(-.8, .8, j / 29);
						const t = .55 + .45 * (j * 7 % n) / n;
						e.push(V3(0, (f ? -1 : 1) * .04, t * l[6]));
						o.push(V3(Math.sin(a) * .9, (f ? -1 : 1) * .5 * Math.cos(a), 1));
					}
					this.addSetae(m, fringe(e, o, (j) => i === 1 ? .15 : .35 + .12 * Math.sin(j * 1.9)));
				}
				this.legs.push(leg);
			}
		});
	}
	restPose() {
		this.B.position.set(0, 14, 0);
		this.B.rotation.set(0, 0, TILT);
		this.somites.forEach((b) => b.rotation.set(0, 0, 0));
		this.telson.rotation.set(0, 0, 0);
		this.fan = .5;
		this.poseFan();
		this.object.updateMatrixWorld(true);
		for (const leg of this.legs) {
			leg.target.copy(this.homeOf(leg));
			if (leg.def.chela) leg.target.copy(this.chelaRest(leg));
			leg.planted.copy(this.object.localToWorld(leg.target.clone()));
			leg.state = "stance";
		}
		this.lag = {
			x: 0,
			y: 0,
			z: 0,
			vx: 0,
			vy: 0,
			vz: 0,
			pitch: 0,
			roll: 0,
			yaw: 0,
			vp: 0,
			vr: 0,
			vyaw: 0
		};
		this.lift = 0;
		this.speed = 0;
		this.turn = 0;
		this.poseLegs();
		this.posePleopods(0, 0);
		this.poseWhips(0);
		this.merged?.sync();
		this.object.updateMatrixWorld(true);
	}
	legSpread = 1;
	homeOf(leg) {
		const off = leg.side > 0 ? ([
			.7,
			-.6,
			.5
		][leg.index - 2] ?? 0) * SC : 0;
		return V3(leg.def.home[0] + off, 0, leg.side * (leg.def.home[1] + (leg.side > 0 ? .3 * SC : 0)) * this.legSpread);
	}
	chelaRest(leg) {
		if (leg.index === 1) return V3(dX(-38), 2.5, leg.side * 14 * this.legSpread);
		const p = V3(dX(9.5), -13.2, leg.side * 14);
		return this.B.localToWorld(p).applyMatrix4(new THREE.Matrix4().copy(this.object.matrixWorld).invert());
	}
	poseFan() {
		for (const u of this.uropods) {
			const { yaw, side } = u.userData;
			const a = yaw * lerp(.35, 1.9, this.fan);
			u.rotation.set(0, -Math.PI / 2 + side * a, 0);
			u.rotateX(.15);
			u.rotateZ(-side * .3);
		}
	}
	bInv = new THREE.Matrix4();
	poseLegs() {
		this.B.updateMatrix();
		const Bm = this.B.matrix;
		const q = new THREE.Quaternion().setFromRotationMatrix(Bm);
		const A = V3();
		const H = V3();
		const K = V3();
		const F = V3();
		const u = V3();
		const v = V3();
		const n = V3();
		const d = V3();
		const p = V3();
		const tmp = V3();
		for (const leg of this.legs) {
			const l = leg.def.len;
			A.copy(leg.attach).applyMatrix4(Bm);
			const out = V3(leg.def.chela ? .35 : .05 * (2 - leg.index), -.75, leg.side * .8).normalize().applyQuaternion(q);
			this.place(leg.arts[0].mesh, A, out, V3(0, 1, 0).applyQuaternion(q));
			tmp.copy(A).addScaledVector(out, l[0]);
			const out2 = V3(leg.def.chela ? .5 : .1, -.5, leg.side * 1).normalize().applyQuaternion(q);
			this.place(leg.arts[1].mesh, tmp, out2, V3(0, 1, 0).applyQuaternion(q));
			H.copy(tmp).addScaledVector(out2, l[1]);
			F.copy(leg.target);
			const pole = (leg.def.chela ? V3(.4, .9, leg.side * (.9 - .5 * this.threat)) : V3(KNEE_X[leg.index - 2] * .3, 1, leg.side * .25)).applyQuaternion(q);
			u.subVectors(F, H);
			let D = u.length();
			u.normalize();
			const L1 = leg.L1;
			const L2 = leg.chord;
			D = Math.min(D, (L1 + L2) * .999);
			D = Math.max(D, Math.abs(L1 - L2) * 1.001 + .01);
			F.copy(H).addScaledVector(u, D);
			const a = (L1 * L1 - L2 * L2 + D * D) / (2 * D);
			const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
			const kneeAt = (twist) => {
				v.copy(pole).applyAxisAngle(u, twist);
				v.addScaledVector(u, -v.dot(u)).normalize();
				return K.copy(H).addScaledVector(u, a).addScaledVector(v, h);
			};
			const chainSink = (tw) => {
				kneeAt(tw);
				n.crossVectors(u, v).normalize();
				const r = leg.def.r + .3;
				let m = -1;
				for (const k of [
					.4,
					.75,
					1
				]) m = Math.max(m, this.sink(tmp.copy(H).lerp(K, k), r));
				d.subVectors(F, K).normalize();
				p.crossVectors(n, d);
				tmp.copy(K);
				const last = leg.link2.length - 1;
				leg.link2.forEach((s, j) => {
					const ang = s.dir - leg.chordAng;
					const c = Math.cos(ang);
					const sn = Math.sin(ang);
					tmp.x += (d.x * c + p.x * sn) * s.len;
					tmp.y += (d.y * c + p.y * sn) * s.len;
					tmp.z += (d.z * c + p.z * sn) * s.len;
					if (j < last || leg.def.chela) m = Math.max(m, this.sink(tmp, r));
				});
				return m;
			};
			if (this.floorAt && this.collide) {
				let want = 0;
				let best = Infinity;
				for (const tw of [
					0,
					leg.twist,
					.3,
					-.3,
					.6,
					-.6,
					1,
					-1,
					1.5,
					-1.5,
					2.2,
					-2.2,
					Math.PI
				]) {
					const b = chainSink(tw);
					if (b <= 0) {
						want = tw;
						best = b;
						break;
					}
					if (b < best) {
						best = b;
						want = tw;
					}
				}
				leg.twist += (want - leg.twist) * .25;
			} else leg.twist = 0;
			kneeAt(leg.twist);
			n.crossVectors(u, v).normalize();
			d.subVectors(K, H).normalize();
			p.crossVectors(n, d);
			this.place(leg.arts[2].mesh, H, d, p);
			tmp.copy(H).addScaledVector(d, l[2]);
			this.place(leg.arts[3].mesh, tmp, d, p);
			d.subVectors(F, K).normalize();
			p.crossVectors(n, d);
			const cur = K.clone();
			leg.link2.forEach((s, j) => {
				const ang = s.dir - leg.chordAng;
				const dir = d.clone().multiplyScalar(Math.cos(ang)).addScaledVector(p, Math.sin(ang));
				const pp = V3().crossVectors(n, dir);
				if (leg.def.chela && j === 2) {
					const half = leg.open * .5;
					leg.fingers.forEach((fm, f) => {
						const fa = ang + (f === 0 ? half : -half * .4);
						const fd = d.clone().multiplyScalar(Math.cos(fa)).addScaledVector(p, Math.sin(fa));
						this.place(fm, cur, fd, V3().crossVectors(n, fd));
					});
				} else this.place(leg.arts[4 + j].mesh, cur, dir, pp);
				cur.addScaledVector(dir, s.len);
			});
		}
	}
	place(m, start, dir, up) {
		const z = dir.clone().normalize();
		const x = V3().crossVectors(up, z).normalize();
		const y = V3().crossVectors(z, x);
		m.matrix.makeBasis(x, y, z).setPosition(start);
		m.matrixWorldNeedsUpdate = true;
	}
	posePleopods(t, amp, freq = 3) {
		for (const p of this.pleopods) {
			const ph = t * freq * Math.PI * 2 + p.phase;
			const s = Math.sin(ph);
			p.group.rotation.set(-p.group.userData.side * .3, 0, -.85 + amp * (.5 + .5 * s) * 1.6, "ZXY");
			const spread = .5 + .5 * Math.cos(ph);
			p.rami.forEach((r) => {
				r.rotation.set(r.userData.splay * (.5 + spread), 0, -.25 - .35 * amp * Math.sin(ph - .6));
			});
		}
	}
	poseWhips(t) {
		this.B.updateMatrix();
		const Bm = this.B.matrix;
		const q = new THREE.Quaternion().setFromRotationMatrix(Bm);
		for (const w of this.whips) {
			const n = w.pts.length;
			const step = w.len / (n - 1);
			const dir = w.dir.clone();
			const p = w.base.clone();
			const side = w.side;
			let yawRate;
			let pitchRate;
			if (w.kind === "antenna") {
				const sweep = .55 * Math.sin(t * .7 + (side > 0 ? 0 : 2.1)) + .25 * Math.sin(t * 1.9 + side);
				dir.applyAxisAngle(V3(0, 1, 0), -side * (.05 + .15 * sweep));
				dir.applyAxisAngle(V3(0, 0, 1), .12 + .08 * Math.sin(t * .9 + side * 1.3));
				yawRate = -side * (.9 + .35 * sweep) / w.len;
				pitchRate = -.3 / w.len;
			} else {
				const outer = w.kind === "outer";
				const fl = w.flick;
				dir.applyAxisAngle(V3(0, 1, 0), -side * (outer ? .25 : .08));
				dir.applyAxisAngle(V3(0, 0, 1), (outer ? .75 : .55) - fl * .5 + .08 * Math.sin(t * 2.3 + side));
				yawRate = -side * (outer ? .6 : .3) / w.len;
				pitchRate = ((outer ? -1 : -.8) - fl * .8) / w.len;
			}
			for (let i = 0; i < n; i++) {
				w.pts[i].copy(p).applyMatrix4(Bm);
				const s = i / (n - 1);
				const wave = (w.kind === "antenna" ? .06 * Math.sin(t * 1.6 - s * 7 + side) * s : .03 * Math.sin(t * 4 - s * 6)) * (7 / w.len);
				dir.applyAxisAngle(V3(0, 1, 0), yawRate * step + wave * step * .5).applyAxisAngle(V3(0, 0, 1), pitchRate * step + wave * step * .4).normalize();
				if (this.floorAt && this.collide && this.sink(this.tmpL.copy(p).addScaledVector(dir, step).applyMatrix4(Bm), .3) > 0) {
					const upAx = V3().crossVectors(dir, V3(0, 1, 0));
					if (upAx.lengthSq() < 1e-6) upAx.set(0, 0, 1);
					upAx.normalize();
					let free = false;
					for (const [ax, ang] of WHIP_DODGE) {
						const d2 = dir.clone().applyAxisAngle(ax === "up" ? upAx : Y_AX, ax === "side" ? ang * side : ang);
						if (this.sink(this.tmpL.copy(p).addScaledVector(d2, step).applyMatrix4(Bm), .3) <= 0) {
							dir.copy(d2);
							free = true;
							break;
						}
					}
					if (!free) continue;
				}
				p.addScaledVector(dir, step);
			}
			for (const pt of w.pts) pt.y = Math.max(pt.y, .2 + this.ground);
			w.tube.set(w.pts, V3(0, 1, 0).applyQuaternion(q));
		}
	}
	setMode(m) {
		this.mode = m;
		if (m !== "auto") this.startAct(m);
	}
	startAct(a) {
		this.act = a;
		this.actTime = 0;
		const r = this.rnd();
		this.actLen = a === "graze" ? 6 + r * 8 : a === "walk" ? 4 + r * 5 : a === "swim" ? 3 + r * 3 : 1.8;
		this.segT = 0;
		this.segLen = 0;
		if (a === "flip") this.flipV = 70 * SC;
	}
	nextAct() {
		if (this.mode !== "auto") {
			this.startAct(this.mode === "flip" ? "graze" : this.mode);
			if (this.mode === "flip") this.mode = "graze";
			return;
		}
		const r = this.rnd();
		const prev = this.act;
		if (prev === "flip" || prev === "swim") return this.startAct("graze");
		if (this.stay) return this.startAct(r < .55 ? prev === "graze" ? "walk" : "graze" : "graze");
		this.startAct(r < .5 ? prev === "graze" ? "walk" : "graze" : r < .85 ? "graze" : r < .96 ? "swim" : "flip");
	}
	speed = 0;
	sCmd = 0;
	rCmd = 0;
	gait = 0;
	gaitT = .6;
	gaitOn = 0;
	segT = 0;
	segLen = 0;
	lag = {
		x: 0,
		y: 0,
		z: 0,
		vx: 0,
		vy: 0,
		vz: 0,
		pitch: 0,
		roll: 0,
		yaw: 0,
		vp: 0,
		vr: 0,
		vyaw: 0
	};
	prevSpeed = 0;
	swimV = 0;
	lean = V3();
	baseY = null;
	groundAt = null;
	floorAt = null;
	collide = true;
	tmpW = new THREE.Vector3();
	sink(local, margin = 0) {
		if (!this.floorAt || !this.collide) return -1;
		const w = this.tmpW.copy(local).applyMatrix4(this.object.matrixWorld);
		return (this.floorAt(w.x, w.y, w.z) - w.y) * 1e3 + margin;
	}
	clearOf(p, leg, margin) {
		if (!this.floorAt) return p;
		const s = this.sink(p, margin);
		if (s <= 0) return p;
		if (s < 6) return p.clone().setY(p.y + s);
		const hip = leg.attach.clone().applyMatrix4(this.B.matrix);
		for (let k = .9; k > .3; k -= .1) {
			const q = hip.clone().lerp(p, k);
			const sq = this.sink(q, margin);
			if (sq <= 0) return q;
			if (sq < 6) return q.setY(q.y + sq);
		}
		return p.clone().setY(p.y + s);
	}
	lineSink(a, b, margin) {
		let m = -1;
		for (const k of [
			.2,
			.4,
			.6,
			.8,
			1
		]) m = Math.max(m, this.sink(this.tmpL.copy(a).lerp(b, k), margin));
		return m;
	}
	clearArm(p, leg, margin) {
		p = this.clearOf(p, leg, margin);
		if (!this.floorAt) return p;
		const hip = leg.attach.clone().applyMatrix4(this.B.matrix);
		if (this.lineSink(hip, p, margin) <= 0) return p;
		for (const [dz, dy, k] of ARM_DODGE) {
			const q = hip.clone().lerp(p, k);
			q.z -= leg.side * dz;
			q.y += dy;
			if (this.sink(q, margin) <= 0 && this.lineSink(hip, q, margin) <= 0) return q;
		}
		return p;
	}
	tmpL = new THREE.Vector3();
	blocked = null;
	home = new THREE.Vector2(0, 0);
	stay = false;
	lurk = null;
	lurkPhase = "hide";
	lurkT = 3;
	threat = 0;
	scare() {
		if (!this.lurk || this.lurkPhase === "retreat" || this.lurkPhase === "hide" || this.lurkPhase === "threat") return;
		this.lurkPeekLeft = Math.max(this.lurkPhase === "peek" ? this.lurkT : 0, 6 + this.rnd() * 8);
		this.lurkPhase = "threat";
		this.lurkT = .9 + this.rnd() * .6;
		this.lurkRetreat = this.rnd() < .5;
	}
	lurkRetreat = false;
	lurkNext = 5;
	lurkPeekLeft = 0;
	slope = 0;
	slopeRoll = 0;
	avoidT = 0;
	gAt(x, z) {
		return this.groundAt ? this.groundAt(x, z) : this.baseY ?? this.object.position.y;
	}
	planLurk(dt) {
		const L = this.lurk;
		const o = this.object;
		this.act = "graze";
		this.actTime = 0;
		this.lurkT -= dt;
		const fx = Math.cos(L.heading);
		const fz = -Math.sin(L.heading);
		const span = Math.hypot(L.outside.x - L.inside.x, L.outside.y - L.inside.y);
		const along = ((o.position.x - L.inside.x) * fx + (o.position.z - L.inside.y) * fz) / Math.max(1e-4, span);
		let goal = along;
		let speed = 0;
		switch (this.lurkPhase) {
			case "hide":
				goal = 0;
				speed = 2 * SC;
				if (this.lurkT < 0) {
					this.lurkPhase = "creep";
					this.lurkT = 14;
				}
				break;
			case "creep":
				goal = 1;
				speed = (3.5 + 2 * Math.max(0, Math.sin(this.time * 1.7))) * SC;
				if (along > .97 || this.lurkT < 0) {
					this.lurkPhase = "peek";
					this.lurkT = 30 + this.rnd() * 20;
					this.lurkNext = 4 + this.rnd() * 6;
				}
				break;
			case "peek":
				goal = .96 + .04 * Math.sin(this.time * .17);
				speed = 1.5 * SC;
				this.lurkNext -= dt;
				if (this.lurkT < 0) {
					this.lurkPhase = "retreat";
					this.lurkT = 6;
				} else if (this.lurkNext < 0) {
					this.lurkNext = 6 + this.rnd() * 8;
					if (this.rnd() < .45) {
						this.lurkPeekLeft = this.lurkT;
						this.lurkPhase = "threat";
						this.lurkT = 1.6 + this.rnd() * 1.6;
						this.lurkRetreat = false;
					}
				}
				break;
			case "threat":
				goal = Math.max(.8, along);
				speed = 1.5 * SC;
				if (this.lurkT < 0) {
					this.lurkPhase = this.lurkRetreat ? "retreat" : "peek";
					this.lurkT = this.lurkPhase === "peek" ? Math.max(3, this.lurkPeekLeft) : 6;
				}
				break;
			case "retreat":
				goal = 0;
				speed = 7 * SC;
				if (along < .04 || this.lurkT < 0) {
					this.lurkPhase = "hide";
					this.lurkT = 1.5 + this.rnd() * 2.5;
				}
		}
		const err = (goal - along) * span * 1e3;
		const sc = Math.abs(err) < 1.5 ? 0 : Math.sign(err) * Math.min(speed, Math.abs(err) * 3);
		const look = this.lurkPhase === "peek" ? .15 * Math.sin(this.time * .6) : 0;
		const rc = clamp(Math.atan2(Math.sin(L.heading + look - this.heading), Math.cos(L.heading + look - this.heading)) * 3, -.8, .8);
		const back = ((o.position.x - L.inside.x) * -fz + (o.position.z - L.inside.y) * fx) * Math.min(1, dt * 3);
		o.position.x -= -fz * back;
		o.position.z -= fx * back;
		const acc = (sc > this.speed ? 14 : 22) * SC;
		this.speed += Math.max(-acc * dt, Math.min(acc * dt, sc - this.speed));
		this.turn += Math.max(-4 * dt, Math.min(4 * dt, rc - this.turn));
		this.threat += ((this.lurkPhase === "threat" ? 1 : 0) - this.threat) * Math.min(1, dt * (this.lurkPhase === "threat" ? 5 : 2.5));
	}
	plan(dt) {
		const o = this.object;
		const act = this.act;
		const dist = Math.hypot(o.position.x - this.home.x, o.position.z - this.home.y);
		const toC = Math.atan2(o.position.z - this.home.y, this.home.x - o.position.x);
		const dh = Math.atan2(Math.sin(toC - this.heading), Math.cos(toC - this.heading));
		const edge = smooth(this.range * .55, this.range, dist);
		if (this.lurk) return this.planLurk(dt);
		this.segT += dt;
		if (this.segT > this.segLen) {
			this.segT = 0;
			const r = this.rnd();
			if (act === "walk") {
				const moving = this.sCmd < .5 ? true : r < .72;
				this.segLen = moving ? .7 + this.rnd() * 1.8 : .25 + this.rnd() * .7;
				this.sCmd = moving ? (3.5 + this.rnd() * 4.5) * SC : 0;
				this.rCmd = (this.rnd() - .5) * (moving ? .9 : 1.4);
			} else if (act === "graze") {
				if (this.sCmd !== 0 || this.rCmd !== 0) {
					this.sCmd = 0;
					this.rCmd = 0;
					this.segLen = 2 + this.rnd() * 4;
				} else if (r < .45) {
					this.rCmd = (this.rnd() < .5 ? -1 : 1) * (.5 + this.rnd() * .5);
					this.segLen = .35 + this.rnd() * .4;
				} else if (r < .8) {
					this.sCmd = (2.5 + this.rnd() * 1.5) * SC;
					this.rCmd = (this.rnd() - .5) * .4;
					this.segLen = .4 + this.rnd() * .5;
				} else this.segLen = 1 + this.rnd() * 2;
			} else {
				this.sCmd = 0;
				this.rCmd = 0;
				this.segLen = 1;
			}
		}
		let rc = this.rCmd + edge * Math.sign(dh) * Math.min(1.2, Math.abs(dh) * 2);
		let sc = this.sCmd * (1 - .6 * edge * smooth(.6, 1.6, Math.abs(dh)));
		if (act === "swim" || act === "flip") {
			sc = 0;
			rc = act === "swim" ? .25 * Math.sin(this.time * .6) + edge * dh : 0;
		}
		if (this.blocked && (act === "walk" || act === "graze")) {
			const ahead = (a, r) => {
				const h = this.heading + a;
				const x = o.position.x + Math.cos(h) * r;
				const z = o.position.z - Math.sin(h) * r;
				return Math.hypot(x - this.home.x, z - this.home.y) > this.range && Math.hypot(x - this.home.x, z - this.home.y) > dist || this.blocked(x, z) || this.gAt(x, z) - this.gAt(o.position.x, o.position.z) > .004 * SC;
			};
			if (this.avoidT > 0) this.avoidT -= dt;
			else if (this.blocked(o.position.x, o.position.z) || dist > this.range * 1.15) {
				const toHome = Math.atan2(-(this.home.y - o.position.z), this.home.x - o.position.x);
				const dd = Math.atan2(Math.sin(toHome - this.heading), Math.cos(toHome - this.heading));
				this.rCmd = Math.max(-1.2, Math.min(1.2, dd * 2));
				this.sCmd = (Math.abs(dd) < .6 ? 3 : .8) * SC;
				this.segT = 0;
				this.segLen = .4;
			} else if (ahead(0, .012 * SC) || ahead(.4, .01 * SC) || ahead(-.4, .01 * SC)) {
				const left = ahead(.7, .012 * SC) ? 1 : 0;
				const right = ahead(-.7, .012 * SC) ? 1 : 0;
				this.rCmd = (left <= right ? 1 : -1) * 1.1;
				this.sCmd = Math.min(this.sCmd, 1.5 * SC);
				this.segT = 0;
				this.segLen = .6 + this.rnd() * .5;
				this.avoidT = .6;
			}
		}
		const acc = (sc > this.speed ? 14 : 22) * SC;
		this.speed += Math.max(-acc * dt, Math.min(acc * dt, sc - this.speed));
		this.turn += Math.max(-4 * dt, Math.min(4 * dt, rc - this.turn));
	}
	update(dt) {
		dt = Math.min(dt, .05);
		this.time += dt;
		this.actTime += dt;
		const t = this.time;
		if (this.actTime > this.actLen) this.nextAct();
		const act = this.act;
		const o = this.object;
		if (this.baseY === null) this.baseY = o.position.y;
		this.plan(dt);
		const footSpeed = Math.abs(this.speed) + Math.abs(this.turn) * 6 * SC;
		const wantGait = !(this.lift > .8 * SC) && footSpeed > .5 * SC ? 1 : 0;
		this.gaitOn += (wantGait - this.gaitOn) * Math.min(1, dt * 8);
		const stance = Math.min(.7, STRIDE / Math.max(.5 * SC, footSpeed));
		this.gaitT = Math.min(1.4, Math.max(.36, stance / DUTY));
		if (wantGait) this.gait += dt / this.gaitT;
		const ph = this.gait % 1;
		const surge = wantGait ? 1 + .55 * Math.cos(4 * Math.PI * (ph - .22)) : 1;
		let fwd = this.speed * surge;
		if (act === "swim") {
			const beat = Math.max(0, Math.sin(this.pPhase * Math.PI * 2 + .5));
			this.swimV += (beat * 55 * SC - this.swimV * 2.2) * dt;
			fwd = this.swimV;
		} else this.swimV *= Math.exp(-dt * 3);
		if (act === "flip") {
			this.flipV *= Math.exp(-dt * 4.2);
			fwd = -this.flipV;
		} else if (act !== "swim") fwd += this.swimV;
		this.heading += this.turn * (wantGait ? .55 + .9 * Math.max(0, Math.cos(4 * Math.PI * (ph - .22))) : 1) * dt;
		o.position.x += Math.cos(this.heading) * fwd * .001 * dt;
		o.position.z -= Math.sin(this.heading) * fwd * .001 * dt;
		if (this.groundAt) {
			const gx = o.position.x;
			const gz = o.position.z;
			const ch = Math.cos(this.heading);
			const sh = Math.sin(this.heading);
			const gy = this.groundAt(gx, gz);
			this.baseY += (gy - this.baseY) * Math.min(1, dt * 6);
			const gf = this.groundAt(gx + ch * .02, gz - sh * .02);
			const gb = this.groundAt(gx - ch * .02, gz + sh * .02);
			const gl = this.groundAt(gx + sh * .01, gz + ch * .01);
			const gr = this.groundAt(gx - sh * .01, gz - ch * .01);
			this.slope += (Math.atan2(gf - gb, .04) - this.slope) * Math.min(1, dt * 5);
			this.slopeRoll += (Math.atan2(gr - gl, .02) - this.slopeRoll) * Math.min(1, dt * 5);
		}
		o.position.y = this.baseY;
		o.rotation.y = this.heading;
		o.updateMatrixWorld(true);
		this.curFwd = fwd;
		if (act === "flip") {
			const k = this.actTime;
			this.curl = k < .08 ? smooth(0, .08, k) : k < .28 ? 1 - .75 * smooth(.08, .28, k) : .25 * (1 - smooth(.28, 1.1, k));
			this.lift += ((k < .55 ? 6 * SC : 0) - this.lift) * Math.min(1, dt * (k < .55 ? 6 : 2.2));
			this.fan += ((k < .4 ? 1 : .6) - this.fan) * Math.min(1, dt * 12);
		} else {
			this.curl *= 1 - Math.min(1, dt * 5);
			const beatLift = act === "swim" ? .35 * SC * Math.sin(this.pPhase * Math.PI * 2) : 0;
			const want = act === "swim" ? (8 + 2 * Math.sin(t * .7)) * SC + beatLift : 0;
			if (want > this.lift) this.lift += (want - this.lift) * Math.min(1, dt * 1.6);
			else this.lift = Math.max(want, this.lift - Math.max(2.5 * SC, (this.lift - want) * .9) * dt);
			if (this.lift < .05) this.lift = 0;
			this.fan += ((act === "swim" ? .3 : .75 + .08 * Math.sin(t * .4)) - this.fan) * Math.min(1, dt * 3);
		}
		const swimK = smooth(0, 5 * SC, this.lift);
		const L = this.lag;
		const accel = (fwd - this.prevSpeed) / Math.max(.001, dt);
		this.prevSpeed = fwd;
		const g = this.gaitOn;
		const sway = g * Math.sin(2 * Math.PI * (ph - .22));
		const tgt = {
			x: -accel * .0022 + this.lean.x,
			y: g * .06 * SC * Math.cos(4 * Math.PI * (ph - .22)) + this.lean.y,
			z: sway * .07 * SC + this.lean.z,
			pitch: accel * 6e-4 / SC - .035 * this.low + this.lean.x * .08 / SC + swimK * .1 + this.slope * .8 * (1 - swimK),
			roll: sway * .03 + this.lean.z * .08 / SC + this.slopeRoll * .6 * (1 - swimK),
			yaw: sway * .035 + this.turn * .04
		};
		tgt.x = clamp(tgt.x, -.6 * SC, .6 * SC);
		tgt.pitch = clamp(tgt.pitch, -.5, .5);
		const subs = Math.max(1, Math.ceil(dt * 240));
		const h = dt / subs;
		const spring = (k, v, w, z) => {
			for (let i = 0; i < subs; i++) {
				L[v] += (w * w * (tgt[k] - L[k]) - 2 * z * w * L[v]) * h;
				L[k] += L[v] * h;
			}
		};
		spring("x", "vx", 22, .75);
		spring("y", "vy", 26, .75);
		spring("z", "vz", 22, .75);
		spring("pitch", "vp", 16, .7);
		spring("roll", "vr", 16, .7);
		spring("yaw", "vyaw", 16, .7);
		const breathe = .015 * SC * Math.sin(t * 1.3);
		this.low += ((act === "graze" ? 1 : 0) - this.low) * Math.min(1, dt * 1.5);
		this.B.position.set(L.x, 14 + this.lift + breathe - .35 * SC * this.low * (1 - this.threat) + L.y + 5 * this.threat, L.z);
		this.B.rotation.set(L.roll, L.yaw, TILT + L.pitch + .17 * this.threat, "YXZ");
		this.somites.forEach((b, k) => {
			const c = this.curl * (k < 2 ? .35 : .75);
			b.rotation.z = -.03 * swimK * (k >= 2 ? 1 : 0) + c + .008 * Math.sin(t * 1.1 - k * .5) + g * .012 * Math.cos(4 * Math.PI * (ph - .3) - k * .4);
			b.rotation.y = -sway * .012 * (k + 1) * .3;
		});
		this.telson.rotation.z = this.curl * .6 - .05 * swimK;
		this.poseFan();
		this.B.updateMatrix();
		o.updateMatrixWorld(true);
		this.stepLegs(dt, swimK);
		this.poseLegs();
		const pAmp = act === "swim" ? .9 : act === "flip" ? .15 : act === "walk" ? .3 : .16 + .12 * Math.max(0, Math.sin(t * .31));
		const pFreq = act === "swim" ? 6 : 3.2;
		this.pPhase += dt * pFreq;
		this.pAmp += (pAmp - this.pAmp) * Math.min(1, dt * 4);
		this.posePleopods(this.pPhase / pFreq, this.pAmp, pFreq);
		for (const w of this.whips) {
			if (w.kind !== "outer") continue;
			w.nextFlick -= dt;
			if (w.nextFlick < 0) {
				w.nextFlick = .5 + this.rnd() * 1.6;
				w.flick = 1;
			}
			w.flick *= Math.exp(-dt * 9);
		}
		this.poseWhips(t);
		this.maxillipeds.forEach((mx, i) => {
			const s = i ? 1 : -1;
			mx[0].rotation.z = -.25 + .06 * Math.sin(t * 7 + s) + this.feed * .12;
			mx[1].rotation.z = .15 + .08 * Math.sin(t * 7 + s + 1);
		});
		this.feed *= 1 - Math.min(1, dt * 4);
		this.eyes.forEach((e, i) => e.rotation.y = .05 * Math.sin(t * .6 + i * 2));
		this.merged?.sync();
	}
	curFwd = 0;
	pPhase = 0;
	low = 0;
	pAmp = .2;
	feed = 0;
	pick = [];
	predictWorld(local, ahead) {
		const h = this.heading + this.turn * ahead;
		const fwd = this.curFwd * ahead * .001;
		const o = this.object;
		const x = o.position.x + Math.cos(this.heading) * fwd;
		const z = o.position.z - Math.sin(this.heading) * fwd;
		const c = Math.cos(h);
		const s = Math.sin(h);
		const wx = x + (c * local.x + s * local.z) * .001;
		const wz = z + (-s * local.x + c * local.z) * .001;
		return V3(wx, this.gAt(wx, wz), wz);
	}
	stepLegs(dt, swimK) {
		const o = this.object;
		const inv = this.bInv.copy(o.matrixWorld).invert();
		const toLocal = (w) => w.clone().applyMatrix4(inv);
		const walking = this.legs.filter((l) => !l.def.chela);
		const stanceDur = this.gaitT * DUTY;
		const swingDur = this.gaitT * .4;
		const fwdV = V3(this.curFwd, 0, 0);
		const busyNear = (leg) => walking.some((l) => l !== leg && l.state === "swing" && (l.side === leg.side && Math.abs(l.index - leg.index) === 1 || l.index === leg.index && l.side !== leg.side));
		const startSwing = (leg, dur, home) => {
			const rel = V3(fwdV.x + this.turn * home.z, 0, -this.turn * home.x).multiplyScalar(this.gaitOn > .5 ? stanceDur * .5 : 0);
			const land = home.clone().add(rel);
			leg.state = "swing";
			leg.swingT = 0;
			leg.swingDur = dur;
			leg.swingFromW.copy(o.localToWorld(leg.target.clone()));
			leg.swingFromW.y = this.gAt(leg.swingFromW.x, leg.swingFromW.z);
			leg.swingToW.copy(this.predictWorld(land, dur));
		};
		const air = this.lift > .8 * SC || this.act === "flip";
		for (const leg of walking) {
			const home = this.homeOf(leg);
			if (air || leg.state === "air") {
				const tuck = this.act === "flip" ? 1 : 0;
				const hangB = V3(dX(leg.def.d) + (-2.4 - (leg.index - 2) * 1 + tuck * 2) * SC, (-3.9 + tuck * .4) * SC + 2, leg.side * (2 + (leg.index - 2) * .3 - tuck * .3) * SC);
				hangB.y += .35 * SC * Math.sin(this.time * 5 + leg.index * 1.1 + (leg.side > 0 ? 0 : 1.6));
				hangB.x += .3 * SC * Math.sin(this.time * 5 + leg.index * 1.1 + (leg.side > 0 ? 0 : 1.6) + 1.2);
				const hang = this.B.localToWorld(hangB).applyMatrix4(inv);
				if (air) {
					if (leg.state !== "air") {
						leg.state = "air";
						leg.airFrom.copy(leg.target);
						leg.airK = 0;
					}
					leg.airK = Math.min(1, leg.airK + dt * 5);
					leg.target.lerpVectors(leg.airFrom, hang, smooth(0, 1, leg.airK));
					continue;
				}
				const reach = smooth(2.5 * SC, 0, this.lift);
				const down = home.clone().lerp(hang, 1 - reach);
				const hw = o.localToWorld(home.clone());
				const homeY = (this.gAt(hw.x, hw.z) - o.position.y) * 1e3;
				down.y = Math.max(homeY, down.y);
				leg.target.lerp(down, Math.min(1, dt * (this.lift < 1.5 * SC ? 20 : 10)));
				if (this.lift < .1 && Math.abs(leg.target.y - down.y) < .15) {
					leg.state = "stance";
					leg.planted.copy(o.localToWorld(leg.target.clone()));
					leg.planted.y = this.gAt(leg.planted.x, leg.planted.z);
				}
				continue;
			}
			if (leg.state === "swing") {
				leg.swingT += dt / leg.swingDur;
				const s = Math.min(1, leg.swingT);
				const prog = smooth(.12, .92, s);
				const w = leg.swingFromW.clone().lerp(leg.swingToW, prog);
				const lift = 1.25 * SC * Math.max(0, Math.sin(Math.PI * Math.min(1, s * 1.05))) ** .75 * (.6 + .4 * Math.min(1, this.gaitOn + .4));
				const loc = toLocal(w);
				loc.y += lift;
				loc.z += leg.side * .45 * SC * Math.sin(Math.PI * s);
				leg.target.copy(loc);
				if (s >= 1) {
					leg.state = "stance";
					leg.planted.copy(leg.swingToW);
				}
				continue;
			}
			const cur = toLocal(leg.planted);
			leg.target.copy(cur);
			const far = Math.hypot(cur.x - home.x, cur.z - home.z);
			if (leg.attach.clone().applyMatrix4(this.B.matrix).distanceTo(cur) > .93 * leg.reach && !busyNear(leg)) {
				startSwing(leg, Math.max(.2, swingDur * .8), home);
				continue;
			}
			if (this.gaitOn > .5) {
				const lp = (this.gait - leg.phaseOff + 10) % 1;
				const prev = leg.lastPhase;
				leg.lastPhase = lp;
				if (lp < prev && far > .15 * SC || far > STRIDE * 1.4 && !busyNear(leg)) startSwing(leg, swingDur, home);
			} else {
				leg.lastPhase = (this.gait - leg.phaseOff + 10) % 1;
				if (far > 1 * SC && !busyNear(leg) && !walking.some((l) => l.state === "swing")) startSwing(leg, .3, home);
			}
		}
		const chel = this.legs.filter((l) => l.def.chela);
		const lean = V3();
		chel.forEach((leg, i) => {
			if (leg.index === 1) {
				this.poseArm(leg, dt, swimK, inv);
				return;
			}
			const rest = this.chelaRest(leg);
			if (!this.pick[i]) this.pick[i] = {
				t: this.rnd(),
				len: .9,
				from: rest.clone(),
				spot: rest.clone()
			};
			const pk = this.pick[i];
			if (!((this.act === "graze" || this.act === "walk") && swimK < .2)) {
				const fold = this.B.localToWorld(V3(dX(13), -7.5, leg.side * 2.2)).applyMatrix4(inv);
				leg.target.lerp(fold, Math.min(1, dt * 6));
				leg.open += (.15 - leg.open) * Math.min(1, dt * 6);
				return;
			}
			const rate = this.act === "walk" ? .6 : 1;
			pk.t += dt / pk.len * rate;
			if (pk.t >= 1) {
				pk.t -= 1;
				pk.len = .5 + this.rnd() * .45;
				pk.spot.set(dX(lerp(3, 11, this.rnd())), .15, leg.side * lerp(2, 7, this.rnd()));
				if (this.groundAt) {
					const sw = o.localToWorld(pk.spot.clone());
					pk.spot.y = (this.groundAt(sw.x, sw.z) - o.position.y) * 1e3 + .15;
				}
				if (this.rnd() < .12) pk.spot.y += 4;
			}
			const s = pk.t;
			const mouth = V3(dX(14.5), -3.6, leg.side * .8);
			const mouthL = this.B.localToWorld(mouth.clone()).applyMatrix4(inv);
			let p;
			if (s < .35) p = mouthL.clone().lerp(pk.spot, smooth(0, .35, s));
			else if (s < .5) p = pk.spot.clone().add(V3(.4 * Math.sin(s * 60), 0, 0));
			else if (s < .85) p = pk.spot.clone().lerp(mouthL, smooth(.5, .85, s));
			else p = mouthL.clone().add(V3(.27 * Math.sin(s * 40), .1, 0));
			p.y = Math.max(p.y, pk.spot.y < 3 ? pk.spot.y : .15);
			p = this.clearOf(p, leg, .4);
			leg.target.lerp(p, Math.min(1, dt * 14));
			leg.open += ((s < .33 ? .9 : s < .45 ? .1 : s < .85 ? .1 : .6) - leg.open) * Math.min(1, dt * 14);
			if (s > .85) this.feed = 1;
			const down = s < .5 ? smooth(.1, .35, s) : 1 - smooth(.5, .7, s);
			lean.x += down * .12 * SC * .5;
			lean.y -= down * .08 * SC * .5;
			lean.z += down * leg.side * .06 * SC * .5;
		});
		this.lean.lerp(lean, Math.min(1, dt * 6));
	}
	arm = [{
		probe: -1,
		next: 3,
		sway: 0
	}, {
		probe: -1,
		next: 6,
		sway: 1.7
	}];
	poseArm(leg, dt, swimK, inv) {
		const o = this.object;
		const a = this.arm[leg.side > 0 ? 0 : 1];
		const t = this.time;
		const base = this.chelaRest(leg);
		let p = base.clone();
		let open = .15 + .1 * Math.max(0, Math.sin(t * .7 + a.sway));
		if (this.act === "flip") {
			p = this.B.localToWorld(V3(dX(4), -2, leg.side * 9)).applyMatrix4(inv);
			leg.target.lerp(p, Math.min(1, dt * 10));
			leg.open += (.05 - leg.open) * Math.min(1, dt * 8);
			return;
		}
		p.x += 3 * Math.sin(t * .37 + a.sway) + (this.act === "walk" ? 3 : 0);
		p.z += leg.side * (2.5 * Math.sin(t * .29 + a.sway * 1.3));
		p.y += 1.5 + 1.5 * Math.sin(t * .45 + a.sway) + (this.act === "walk" ? 2.5 : 0) + swimK * 8;
		a.next -= dt;
		if (a.probe < 0 && a.next < 0 && this.act !== "swim" && swimK < .1 && this.threat < .1) {
			a.probe = 0;
			a.next = 4 + this.rnd() * 6;
		}
		if (a.probe >= 0) {
			a.probe += dt / 1.6;
			const s = a.probe;
			const down = s < .3 ? smooth(0, .3, s) : s < .7 ? 1 : 1 - smooth(.7, 1, s);
			const spot = base.clone().add(V3(-4, 0, -leg.side * 3));
			if (this.groundAt) {
				const sw = o.localToWorld(spot.clone());
				spot.y = (this.groundAt(sw.x, sw.z) - o.position.y) * 1e3 + .4;
			} else spot.y = .4;
			p.lerp(spot, down);
			if (s > .3 && s < .7) open = .3 + .3 * Math.sin((s - .3) * 40);
			if (s >= 1) a.probe = -1;
		}
		if (this.threat > .01) {
			const up = this.B.localToWorld(V3(dX(-37), 9, leg.side * 21)).applyMatrix4(inv);
			p.lerp(up, smooth(0, 1, this.threat));
			open = open + (.85 - open) * this.threat;
		}
		p = this.clearArm(p, leg, 1.4);
		leg.target.lerp(p, Math.min(1, dt * (this.threat > .3 ? 9 : 4)));
		if (this.collide) leg.target.copy(this.clearArm(leg.target, leg, 1.4));
		leg.open += (open - leg.open) * Math.min(1, dt * 6);
	}
};
var BASE = "/";
var PHOTO = {
	side: {
		d: [
			10.5,
			34.9,
			69.2
		],
		px: [
			700,
			985,
			1510
		],
		by: 609,
		k: 15.3,
		W: 1536,
		H: 1024
	},
	top: {
		ax: 690,
		by: 425,
		k: 14.36,
		W: 1774,
		H: 887
	}
};
function bakeRest(s) {
	s.object.updateMatrixWorld(true);
	const inv = new THREE.Matrix4().copy(s.object.matrixWorld).invert();
	const M = new THREE.Matrix4();
	const N = new THREE.Matrix3();
	const v = new THREE.Vector3();
	for (const m of s.bodyMeshes) {
		M.multiplyMatrices(inv, m.matrixWorld);
		N.getNormalMatrix(M);
		const g = m.geometry;
		const p = g.getAttribute("position");
		const n = g.getAttribute("normal");
		const ap = new Float32Array(p.count * 3);
		const an = new Float32Array(p.count * 3);
		for (let i = 0; i < p.count; i++) {
			v.fromBufferAttribute(p, i).applyMatrix4(M);
			ap.set([
				v.x,
				v.y,
				v.z
			], i * 3);
			v.fromBufferAttribute(n, i).applyMatrix3(N).normalize();
			an.set([
				v.x,
				v.y,
				v.z
			], i * 3);
		}
		g.setAttribute("aRest", new THREE.BufferAttribute(ap, 3));
		g.setAttribute("aRestN", new THREE.BufferAttribute(an, 3));
	}
}
function loadTex(url) {
	return new Promise((res) => {
		new THREE.TextureLoader().load(url, (t) => {
			t.colorSpace = THREE.SRGBColorSpace;
			t.anisotropy = 8;
			res(t);
		}, void 0, () => res(null));
	});
}
function shellMaterial(side, top) {
	const mat = new THREE.MeshPhysicalMaterial({
		color: 16777215,
		roughness: .55,
		metalness: 0,
		clearcoat: .6,
		clearcoatRoughness: .06,
		specularIntensity: .6,
		sheen: .05,
		sheenRoughness: .75,
		sheenColor: new THREE.Color(1, .95, .85),
		side: THREE.DoubleSide
	});
	const S = PHOTO.side;
	const T = PHOTO.top;
	const uni = {
		tSide: { value: side },
		tTop: { value: top },
		uSide: { value: new THREE.Vector4(S.d[1], S.px[1], S.by, S.k) },
		uSideA: { value: new THREE.Vector4(S.d[0], S.px[0], (S.px[1] - S.px[0]) / (S.d[1] - S.d[0]), (S.px[2] - S.px[1]) / (S.d[2] - S.d[1])) },
		uTop: { value: new THREE.Vector4(T.ax, T.by, T.k, 0) },
		uWHs: { value: new THREE.Vector2(S.W, S.H) },
		uWHt: { value: new THREE.Vector2(T.W, T.H) }
	};
	mat.onBeforeCompile = (sh) => {
		Object.assign(sh.uniforms, uni);
		sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 aRest;\nattribute vec3 aRestN;\nvarying vec3 vRest;\nvarying vec3 vRestN;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvRest = aRest;\nvRestN = aRestN;");
		sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
uniform sampler2D tSide;
uniform sampler2D tTop;
uniform vec4 uSide;
uniform vec4 uSideA;
uniform vec4 uTop;
uniform vec2 uWHs;
uniform vec2 uWHt;
varying vec3 vRest;
varying vec3 vRestN;
${NOISE_GLSL}`).replace("#include <map_fragment>", `{
  vec3 rn = normalize(vRestN);
  float dd = 22.7 - vRest.x;
  float pxS = dd < uSide.x ? uSide.y + (dd - uSide.x) * uSideA.z : uSide.y + (dd - uSide.x) * uSideA.w;
  vec2 uvS = vec2(pxS / uWHs.x, 1.0 - (uSide.z - uSide.w * vRest.y) / uWHs.y);
  vec2 uvT = vec2((uTop.x + uTop.z * dd) / uWHt.x, 1.0 - (uTop.y - uTop.z * vRest.z) / uWHt.y);
  vec4 cS = texture2D(tSide, uvS);
  vec4 cT = texture2D(tTop, uvT);
  float wT = smoothstep(0.2, 0.45, rn.y) * cT.a;
  float wS = (1.0 - wT) * (0.15 + 0.85 * cS.a) + 0.001;
  vec3 c = (cS.rgb * wS + cT.rgb * wT) / (wS + wT);
  float fr = 1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition)));
  c = mix(c, c * vec3(0.62, 0.7, 0.7), pow(fr, 2.2) * 0.35);
  diffuseColor.rgb *= c;
}`).replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
normal = shBump(normal, shNoise(vRest * 4.5) * 0.6 + shNoise(vRest * 13.0) * 0.4, 0.000012);`);
	};
	mat.customProgramCacheKey = () => "tenaga-shell";
	return mat;
}
var lin = (r, g, b) => new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
var ARM = lin(100, 96, 30);
var ARM_DARK = lin(66, 70, 22);
var PALM = lin(124, 92, 34);
var FINGER = lin(112, 74, 22);
var FINGER_TIP = lin(150, 70, 24);
var LEG = lin(170, 152, 112);
var JOINT = lin(178, 140, 60);
var DOTS = lin(70, 50, 30);
var PALE = lin(196, 186, 156);
var BROWN = lin(100, 68, 26);
var ANT = lin(140, 112, 54);
var smooth01 = (x) => {
	const q = Math.min(1, Math.max(0, x));
	return q * q * (3 - 2 * q);
};
function bandMix(t, a, b, soft = .04) {
	const s = (x, y, z) => {
		const q = Math.min(1, Math.max(0, (z - x) / (y - x)));
		return q * q * (3 - 2 * q);
	};
	return s(a - soft, a + soft, t) * (1 - s(b - soft, b + soft, t));
}
function appPaint(kind, art, leg, t, u) {
	const mix = (base, col, a, w) => [base[0].clone().lerp(col, w), base[1] + (a - base[1]) * w];
	const speck = (k) => Math.sin(t * 211 + u * 47 + art * 13 + k) * Math.sin(t * 97 - u * 31 + leg * 7) > .82 ? 1 : 0;
	let p = [LEG, .55];
	switch (kind) {
		case "chela":
			if (leg === 1) {
				const under = .5 + .5 * Math.cos(u * Math.PI * 2);
				if (art <= 1) p = [PALE.clone().lerp(ARM, .4), .85];
				else if (art === 2) p = [PALE.clone().lerp(ARM, .7), .92];
				else if (art === 5) p = [PALM.clone().lerp(ARM, .3 * (1 - t)), .97];
				else p = [ARM.clone().lerp(ARM_DARK, under * .55), .97];
				p = mix(p, lin(170, 160, 70), .97, (Math.sin(t * 523 + u * 91) * Math.sin(t * 311 - u * 57) > .8 ? 1 : 0) * .45);
				p = mix(p, JOINT, .97, bandMix(t, .95, 1.1, .03));
				p = mix(p, DOTS, .97, speck(1) * .5);
			} else {
				p = [LEG, .85];
				if (art >= 4) p = mix(p, BROWN, .9, .3);
				p = mix(p, JOINT, .95, bandMix(t, .93, 1.1, .03));
				p = mix(p, DOTS, .95, speck(4) * .7);
			}
			break;
		case "finger":
			p = leg === 1 ? [FINGER.clone().lerp(FINGER_TIP, smooth01((t - .6) / .4)), .97] : [BROWN.clone().lerp(PALE, .4), .75];
			break;
		case "walk":
			p = [LEG, .88];
			if (art <= 1) p = [PALE.clone().lerp(LEG, .5), .9];
			p = mix(p, JOINT, .95, bandMix(t, .92, 1.1, .03));
			if (art === 6) p = [LEG.clone().lerp(BROWN, smooth01((t - .4) / .6)), .85 + .15 * t];
			p = mix(p, DOTS, .95, speck(2) * .7);
			break;
		case "mxp":
			p = [PALE.clone().lerp(BROWN, .25), .7];
			break;
		case "a1ped":
			p = [ANT.clone().lerp(PALE, .3), .9];
			p = mix(p, DOTS, .95, speck(3) * .5);
			break;
		case "sty":
			p = [PALE, .7];
			break;
		case "a2ped":
			p = [ANT, .9];
			break;
		case "scale":
			p = [PALE, .4 + .3 * (Math.abs(u - .5) * 2) ** 4];
			if (u > .85) p = mix(p, JOINT, .9, .6);
			break;
		case "rostrum":
			p = [BROWN.clone().lerp(ANT, .35 + .3 * u), .95];
			break;
		case "stalk":
			p = [ANT.clone().lerp(PALE, .3), .97];
			break;
		case "a1flag":
		case "a2flag":
			p = [ANT.clone().lerp(PALE, t * .4), .95 - .3 * t];
			break;
		case "pleoProt":
			p = [PALE.clone().lerp(LEG, .3), .7];
			break;
		case "pleoRamus":
			p = [PALE, .5 - .25 * t];
			break;
		case "uroIn":
		case "uroOut": {
			p = [lin(150, 128, 56).lerp(BROWN, kind === "uroOut" ? smooth01((t - .5) / .5) * .85 : smooth01((t - .7) / .3) * .5), .75];
			p = mix(p, DOTS, .85, speck(5) * .5);
			const edge = Math.abs(u - .5) * 2;
			p = mix(p, BROWN, .95, smooth01((edge - .85) / .15) * .6);
			break;
		}
	}
	return p;
}
function paintApps(s) {
	for (const m of s.appMeshes) {
		const { kind, art, leg } = m.userData;
		const g = m.geometry;
		if (g.getAttribute("color")) continue;
		const uv = g.getAttribute("uv");
		const n = uv.count;
		const col = new Float32Array(n * 4);
		for (let i = 0; i < n; i++) {
			const [c, a] = appPaint(kind, art, leg, uv.getX(i), uv.getY(i));
			col.set([
				c.r,
				c.g,
				c.b,
				Math.min(1, a)
			], i * 4);
		}
		g.setAttribute("color", new THREE.BufferAttribute(col, 4));
	}
}
async function photoMaterials(s, url = (f) => BASE + f) {
	const [side, top] = await Promise.all([loadTex(url("tenaga/body_oblique.webp")), loadTex(url("tenaga/body_top.webp"))]);
	const white = new THREE.DataTexture(new Uint8Array([
		235,
		232,
		228,
		255
	]), 1, 1);
	white.colorSpace = THREE.SRGBColorSpace;
	white.needsUpdate = true;
	paintApps(s);
	const app = new THREE.MeshPhysicalMaterial({
		vertexColors: true,
		transparent: true,
		roughness: .25,
		clearcoat: .7,
		clearcoatRoughness: .08,
		sheen: .08,
		sheenRoughness: .6,
		sheenColor: new THREE.Color(1, .95, .95)
	});
	const plate = app.clone();
	plate.side = THREE.DoubleSide;
	plate.depthWrite = false;
	return {
		shell: shellMaterial(side ?? white, top ?? white),
		app,
		plate,
		eye: new THREE.MeshPhysicalMaterial({
			color: new THREE.Color().setRGB(.022, .009, .004),
			roughness: .3,
			clearcoat: 1,
			clearcoatRoughness: .08
		}),
		setae: new THREE.LineBasicMaterial({
			color: 12101752,
			transparent: true,
			opacity: .35,
			depthWrite: false
		}),
		inner: app,
		feather: featherMaterial(14208170, .5)
	};
}
function applyPhoto(s, m) {
	s.mats = m;
	for (const b of s.bodyMeshes) b.material = m.shell;
	for (const a of s.appMeshes) a.material = a.userData.part === "plate" ? m.plate : m.app;
	for (const e of s.eyeMeshes) e.material = m.eye;
	for (const f of s.featherMeshes) f.material = m.feather;
	const fine = m.setae.clone();
	fine.opacity = m.setae.opacity * .7;
	for (const l of s.setaeLines) l.material = l.userData.fine ? fine : m.setae;
}
var SHRIMP_LIST = [{
	id: "redbee",
	ja: "レッドビーシュリンプ",
	en: "Red bee shrimp",
	lengthMm: 26
}, {
	id: "tenaga",
	ja: "テナガエビ",
	en: "Long-armed prawn",
	lengthMm: 70
}];
var SHRIMP_MOTIONS = [
	{
		id: "auto",
		ja: "おまかせ",
		en: "Auto",
		noteJa: "食べる・歩く・泳ぐを、ときどき跳ねながら、自分で切り替える。",
		noteEn: "Switches by itself between grazing, walking and swimming, with an occasional flip."
	},
	{
		id: "graze",
		ja: "食べる",
		en: "Graze",
		noteJa: "止まって、小さなはさみで底の餌をつまんで口へ運ぶ。触角はゆれ、腹肢はゆっくりあおぐ。",
		noteEn: "Stands still and picks at the floor with its small claws, bringing food to the mouth."
	},
	{
		id: "walk",
		ja: "歩く",
		en: "Walk",
		noteJa: "歩脚を順に運んで、底をゆっくり歩き回る。",
		noteEn: "Walks around on the floor, stepping its walking legs in turn."
	},
	{
		id: "swim",
		ja: "泳ぐ",
		en: "Swim",
		noteJa: "腹肢をこいで浮き上がり、脚をたたんで前へ泳ぐ。",
		noteEn: "Paddles its swimmerets to rise, folds its legs and swims forward."
	},
	{
		id: "flip",
		ja: "跳ねる",
		en: "Flip",
		noteJa: "腹を勢いよく曲げて、尾扇で後ろへ跳ねる（驚いたときの逃げ方）。",
		noteEn: "Snaps its abdomen and tail fan to dart backwards (the escape reflex)."
	}
];
var ShrimpActor = class {
	id;
	body;
	h0;
	object;
	motion = "auto";
	far = false;
	constructor(id, body, h0) {
		this.id = id;
		this.body = body;
		this.h0 = h0;
		this.object = body.object;
		this.object.name = `shrimp-${id}`;
	}
	get length() {
		return SHRIMP_LIST.find((s) => s.id === this.id).lengthMm / 1e3;
	}
	get triangles() {
		let n = 0;
		this.object.traverseVisible((o) => {
			const m = o;
			if (!m.isMesh) return;
			const g = m.geometry;
			const c = g.index ? g.index.count : g.attributes.position.count;
			n += Math.min(c, g.drawRange.count) / 3;
		});
		return Math.round(n);
	}
	get lift() {
		return this.body.lift * .001;
	}
	setMotion(m) {
		this.motion = m;
		this.body.setMode(m);
	}
	setDetail(d) {
		this.far = d === "low";
		this.body.merged?.setFar(this.far);
	}
	getCenter(out = new THREE.Vector3()) {
		const o = this.object;
		o.updateMatrixWorld();
		return out.set(-.15 * this.length * 1e3, this.h0 + this.body.lift, 0).applyMatrix4(o.matrixWorld);
	}
	update(dt) {
		this.body.update(dt);
	}
	dispose() {
		this.object.removeFromParent();
		const mats = new Set();
		this.object.traverse((o) => {
			const m = o;
			if (!m.geometry) return;
			m.geometry.dispose();
			for (const x of Array.isArray(m.material) ? m.material : [m.material]) if (x) mats.add(x);
		});
		mats.forEach((m) => m.dispose());
	}
};
async function createShrimp(id, opt = {}) {
	const folder = opt.folder ?? "./";
	const url = typeof folder === "string" ? (f) => folder.replace(/\/?$/, "/") + f : folder;
	let body;
	if (id === "tenaga") {
		const p = new Prawn();
		bakeRest(p);
		paintApps(p);
		p.merged = mergeShrimp(p);
		applyPhoto(p, await photoMaterials(p, url));
		body = p;
	} else if (id === "redbee") {
		const s = new Shrimp();
		bakeRest$1(s);
		paintApps$1(s);
		s.merged = mergeShrimp(s);
		applyPhoto$1(s, await photoMaterials$1(s, url));
		body = s;
	} else throw new Error(`shrimp-kit: unknown shrimp "${id}"`);
	if (opt.home) body.home.copy(opt.home);
	if (opt.range) body.range = opt.range;
	const floorY = opt.floorY ?? 0;
	body.groundAt = opt.groundAt ?? (() => floorY);
	const o = body.object;
	o.position.set(body.home.x, body.groundAt(body.home.x, body.home.y), body.home.y);
	o.traverse((x) => {
		if (x.isMesh) x.castShadow = x.receiveShadow = true;
	});
	return new ShrimpActor(id, body, id === "tenaga" ? 14 : H0$1);
}
export { SHRIMP_LIST, SHRIMP_MOTIONS, ShrimpActor, createShrimp };
