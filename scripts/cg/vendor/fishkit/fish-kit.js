import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import "three/addons/utils/BufferGeometryUtils.js";
var SNOUT$3 = .47;
var D_END$3 = .8;
function curve(keys) {
	const n = keys.length;
	const xs = keys.map((k) => k[0]);
	const ys = keys.map((k) => k[1]);
	const del = [];
	for (let i = 0; i < n - 1; i++) del.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
	const m = [del[0]];
	for (let i = 1; i < n - 1; i++) m.push(del[i - 1] * del[i] <= 0 ? 0 : (del[i - 1] + del[i]) / 2);
	m.push(del[n - 2]);
	for (let i = 0; i < n - 1; i++) {
		if (del[i] === 0) {
			m[i] = m[i + 1] = 0;
			continue;
		}
		const a = m[i] / del[i];
		const b = m[i + 1] / del[i];
		const h = a * a + b * b;
		if (h > 9) {
			const t = 3 / Math.sqrt(h);
			m[i] = t * a * del[i];
			m[i + 1] = t * b * del[i];
		}
	}
	return (x) => {
		if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0]);
		if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
		let i = 0;
		while (x > xs[i + 1]) i++;
		const h = xs[i + 1] - xs[i];
		const t = (x - xs[i]) / h;
		const t2 = t * t;
		const t3 = t2 * t;
		return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
	};
}
var Y_TIP$3 = -.004;
var TOP$3 = curve([
	[0, Y_TIP$3],
	[.003, .0065],
	[.008, .0145],
	[.016, .0235],
	[.03, .0335],
	[.05, .0425],
	[.075, .0505],
	[.1, .0575],
	[.14, .0675],
	[.2, .0795],
	[.28, .0925],
	[.36, .1015],
	[.42, .1035],
	[.48, .0995],
	[.56, .0875],
	[.64, .068],
	[.7, .0525],
	[.75, .043],
	[.785, .0385],
	[.8, .037]
]);
var BOT$3 = curve([
	[0, Y_TIP$3],
	[.003, -.0115],
	[.008, -.0175],
	[.016, -.0245],
	[.03, -.0335],
	[.05, -.0435],
	[.075, -.0525],
	[.1, -.0605],
	[.14, -.0715],
	[.2, -.0855],
	[.28, -.0995],
	[.36, -.1085],
	[.42, -.1105],
	[.5, -.106],
	[.58, -.091],
	[.65, -.071],
	[.7, -.056],
	[.75, -.0445],
	[.785, -.038],
	[.8, -.0365]
]);
var HW$3 = curve([
	[0, 0],
	[.003, .0062],
	[.008, .0105],
	[.016, .0148],
	[.03, .0198],
	[.05, .0245],
	[.08, .0292],
	[.11, .0328],
	[.16, .038],
	[.23, .0425],
	[.31, .0455],
	[.39, .0455],
	[.47, .0425],
	[.55, .0365],
	[.63, .028],
	[.7, .0195],
	[.74, .0138],
	[.765, .0095],
	[.78, .0064],
	[.79, .0039],
	[.796, .0018],
	[.8, 0]
]);
var T0$3 = curve([
	[0, .5],
	[.1, .5],
	[.25, .44],
	[.5, .42],
	[.8, .46]
]);
var P_TOP$3 = curve([
	[0, .8],
	[.15, .85],
	[.4, .95],
	[.8, .95]
]);
var P_BOT$3 = curve([
	[0, .75],
	[.15, .62],
	[.4, .6],
	[.8, .75]
]);
var MOUTH$4 = {
	corner: .03,
	joint: [.064, -.029],
	throat: .062
};
var LIP$3 = curve([
	[0, Y_TIP$3],
	[.008, -.0062],
	[.018, -.0088],
	[.03, -.0112]
]);
var EYE$3 = {
	d: .084,
	y: .0095,
	r: .0335
};
var GILL_HINGE$2 = [
	[.126, .044],
	[.128, .026],
	[.124, .006],
	[.115, -.016],
	[.102, -.034],
	[.088, -.045],
	[.075, -.05]
];
var GILL_EDGE$2 = [
	[.139, .047],
	[.163, .032],
	[.177, .01],
	[.181, -.015],
	[.175, -.04],
	[.158, -.058],
	[.12, -.063]
];
function sec$3(d) {
	return {
		top: TOP$3(d),
		bot: BOT$3(d),
		hw: Math.max(0, HW$3(d)),
		t0: T0$3(d),
		pt: P_TOP$3(d),
		pb: P_BOT$3(d)
	};
}
function surfZ$3(d, t) {
	const s = sec$3(d);
	const tt = t < s.t0 ? .5 * t / s.t0 : .5 + .5 * (t - s.t0) / (1 - s.t0);
	const p = t < s.t0 ? s.pb : s.pt;
	return s.hw * Math.pow(Math.max(0, Math.sin(Math.PI * THREE.MathUtils.clamp(tt, 0, 1))), p);
}
function surfZAt$3(d, y) {
	if (d <= 0 || d >= D_END$3) return 0;
	const s = sec$3(d);
	const t = (y - s.bot) / Math.max(1e-6, s.top - s.bot);
	if (t <= 0 || t >= 1) return 0;
	return surfZ$3(d, t);
}
var mx$3 = (d) => SNOUT$3 - d;
function smooth$1(x, a, b) {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
}
function seamT$3(d) {
	const s = sec$3(d);
	const h = Math.max(1e-6, s.top - s.bot);
	const c = MOUTH$4.corner;
	const [jd, jy] = MOUTH$4.joint;
	let y;
	if (d <= c) y = LIP$3(d);
	else if (d <= jd) y = THREE.MathUtils.lerp(LIP$3(c), jy, (d - c) / (jd - c));
	else {
		const tj = (jy - BOT$3(jd)) / (TOP$3(jd) - BOT$3(jd));
		const k = smooth$1(d, jd, jd + .1);
		return THREE.MathUtils.lerp(tj, .42, k);
	}
	return THREE.MathUtils.clamp((y - s.bot) / h, .05, .95);
}
function jawWeight$3(d, b, lowerCopy) {
	const c = MOUTH$4.corner;
	const jd = MOUTH$4.joint[0];
	if (d < c) {
		const near = lowerCopy || b > 0 ? smooth$1(d, c, c - .012) : 0;
		return b > .25 ? 1 : THREE.MathUtils.lerp(near, 1, b / .25);
	}
	return smooth$1(b, 0, .3) * (1 - smooth$1(d, jd - .004, jd + .03)) * (d < jd ? 1 : .6 + .4 * (1 - b));
}
function inPoly(poly, d, y) {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const [xi, yi] = poly[i];
		const [xj, yj] = poly[j];
		if (yi > y !== yj > y && d < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}
var GILL_POLY = [...GILL_HINGE$2, ...[...GILL_EDGE$2].reverse()];
var GILL_INNER = (() => {
	const shrink = (p, q) => [p[0] + (q[0] - p[0]) * .12, p[1] + (q[1] - p[1]) * .12];
	const c = [.15, -.01];
	return GILL_POLY.map((p) => shrink(p, c));
})();
var TEX$3 = {
	d0: -.012,
	d1: .812,
	y0: -.126,
	y1: .126
};
var uvOf$3 = (d, y) => [(d - TEX$3.d0) / (TEX$3.d1 - TEX$3.d0), (y - TEX$3.y0) / (TEX$3.y1 - TEX$3.y0)];
var TAIL_UV_D = .788;
var FTEX = {
	d0: -.02,
	d1: 1,
	y0: -.21,
	y1: .23
};
var finUvOf = (d, y) => [(d - FTEX.d0) / (FTEX.d1 - FTEX.d0), (y - FTEX.y0) / (FTEX.y1 - FTEX.y0)];
function buildBody$3(cu, cl, nTip, step) {
	const ds = [];
	for (let k = 1; k <= nTip; k++) ds.push(.1 * Math.pow(k / nTip, 2));
	for (let d = .1 + step; d < .799999; d += step) ds.push(d);
	ds.push(D_END$3);
	for (const extra of [MOUTH$4.corner, MOUTH$4.joint[0]]) if (!ds.some((d) => Math.abs(d - extra) < 1e-4)) ds.push(extra);
	ds.sort((a, b) => a - b);
	const pos = [];
	const uv = [];
	const jaw = [];
	const gillMask = [];
	const idx = [];
	const add = (x, y, z, d, w) => {
		pos.push(x, y, z);
		uv.push(...uvOf$3(Math.min(d, TAIL_UV_D), y));
		jaw.push(w);
		gillMask.push(inPoly(GILL_INNER, d, y) ? 1 : 0);
		return pos.length / 3 - 1;
	};
	const C = cu + cl;
	const rings = [];
	const tipUp = add(SNOUT$3, Y_TIP$3, 0, 0, 0);
	const tipLo = add(SNOUT$3, Y_TIP$3, 0, 0, 1);
	const seamInfo = [];
	for (const d of ds) {
		const s = sec$3(d);
		const ts = seamT$3(d);
		const split = d < MOUTH$4.corner - 1e-6;
		const up = [[], []];
		const lo = [[], []];
		for (let side = 0; side < 2; side++) {
			const sg = side === 0 ? 1 : -1;
			for (let j = 0; j <= C; j++) {
				if (side === 1 && (j === 0 || j === C)) {
					if (j === 0) up[1][0] = up[0][0];
					else lo[1][j - cu] = lo[0][j - cu];
					continue;
				}
				let t;
				if (j <= cu) t = ts + (1 - ts) * Math.sin(Math.PI / 2 * (1 - j / cu));
				else t = ts * (1 - Math.sin(Math.PI / 2 * ((j - cu) / cl)));
				const y = s.bot + t * (s.top - s.bot);
				let z = sg * surfZ$3(d, t);
				const near = Math.abs(j - cu);
				const mouthK = 1 - smooth$1(d, MOUTH$4.corner, MOUTH$4.corner + .02);
				if (near <= 1) z *= 1 - mouthK * (near === 0 ? .08 : .025);
				const x = mx$3(d);
				if (j < cu) up[side][j] = add(x, y, z, d, 0);
				else if (j > cu) lo[side][j - cu] = add(x, y, z, d, jawWeight$3(d, (j - cu) / cl, true));
				else {
					up[side][j] = add(x, y, z, d, 0);
					lo[side][0] = split ? add(x, y, z, d, jawWeight$3(d, 0, true)) : up[side][j];
					if (side === 0 && d <= MOUTH$4.throat + 1e-6) seamInfo.push({
						d,
						y,
						z: Math.abs(z)
					});
				}
			}
		}
		rings.push({
			up,
			lo
		});
	}
	const quad = (a, b, c, e) => idx.push(a, b, c, a, c, e);
	const r0 = rings[0];
	for (let side = 0; side < 2; side++) {
		const flip = side === 0;
		for (let j = 0; j < cu; j++) {
			const a = r0.up[side][j];
			const b = r0.up[side][j + 1];
			if (flip) idx.push(tipUp, a, b);
			else idx.push(tipUp, b, a);
		}
		for (let j = 0; j < cl; j++) {
			const a = r0.lo[side][j];
			const b = r0.lo[side][j + 1];
			if (flip) idx.push(tipLo, a, b);
			else idx.push(tipLo, b, a);
		}
	}
	for (let i = 0; i < rings.length - 1; i++) {
		const A = rings[i];
		const B = rings[i + 1];
		for (let side = 0; side < 2; side++) {
			const flip = side === 0;
			const strip = (ca, cb) => {
				for (let j = 0; j < ca.length - 1; j++) if (flip) quad(ca[j], cb[j], cb[j + 1], ca[j + 1]);
				else quad(ca[j], ca[j + 1], cb[j + 1], cb[j]);
			};
			strip(A.up[side], B.up[side]);
			strip(A.lo[side], B.lo[side]);
		}
	}
	const last = rings[rings.length - 1];
	const ringPts = [
		...last.up[0],
		...last.lo[0].slice(1),
		...[...last.lo[1]].reverse().slice(1),
		...[...last.up[1]].reverse().slice(1, -1)
	];
	const cEnd = add(mx$3(D_END$3), (TOP$3(D_END$3) + BOT$3(D_END$3)) / 2, 0, D_END$3, 0);
	for (let j = 0; j < ringPts.length; j++) idx.push(cEnd, ringPts[(j + 1) % ringPts.length], ringPts[j]);
	const body = new THREE.BufferGeometry();
	body.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	body.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
	body.setAttribute("aJaw", new THREE.Float32BufferAttribute(jaw, 1));
	body.setAttribute("aGill", new THREE.Float32BufferAttribute(gillMask, 1));
	body.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0), 1));
	body.setIndex(idx);
	body.computeVertexNormals();
	{
		const nr = body.getAttribute("normal");
		const p = body.getAttribute("position");
		for (let i = 0; i < nr.count; i++) {
			const k = smooth$1(SNOUT$3 - p.getX(i), .72, D_END$3);
			if (k <= 0) continue;
			const nx = nr.getX(i) * (1 - k);
			const ny = nr.getY(i) * (1 - .6 * k);
			const nz = nr.getZ(i);
			const l = Math.hypot(nx, ny, nz) || 1;
			nr.setXYZ(i, nx / l, ny / l, nz / l);
		}
	}
	return {
		body,
		mouth: buildMouth$3(seamInfo),
		gill: buildGill$3()
	};
}
function buildMouth$3(seam) {
	const K = 10;
	const pos = [];
	const jaw = [];
	const idx = [];
	const rows = [];
	const cornerSeam = seam.filter((s) => s.d <= MOUTH$4.corner + 1e-6).slice(-1)[0];
	const stations = [{
		d: 0,
		y: Y_TIP$3,
		z: 0
	}, ...seam.filter((s) => s.d <= MOUTH$4.corner + 1e-6)];
	for (let k = 1; k <= 5; k++) {
		const u = k / 5;
		const d = MOUTH$4.corner + (MOUTH$4.throat - MOUTH$4.corner) * u;
		stations.push({
			d,
			y: cornerSeam.y + .003 * u,
			z: cornerSeam.z * Math.sqrt(1 - u) * .85
		});
	}
	for (const st of stations) {
		const s = sec$3(Math.max(st.d, 1e-4));
		const u = st.d > MOUTH$4.corner + 1e-6 ? (st.d - MOUTH$4.corner) / (MOUTH$4.throat - MOUTH$4.corner) : 0;
		const fade = smooth$1(st.d, 0, .012);
		const hp = Math.min(.55 * (s.top - st.y), .011) * fade * (1 - u * .6);
		const hf = Math.min(.55 * (st.y - s.bot), .011) * fade * (1 - u * .6);
		const row = [];
		for (let part = 0; part < 2; part++) {
			const roof = part === 0;
			for (let k = 0; k <= K; k++) {
				const a = Math.PI * k / K;
				const side = roof ? Math.cos(a) : -Math.cos(a);
				const z = st.z * side * (k === 0 || k === K ? 1 : .94);
				const y = roof ? st.y + hp * Math.sin(a) : st.y - hf * Math.sin(a);
				pos.push(mx$3(st.d), y, z);
				jaw.push(roof ? 0 : jawWeight$3(Math.max(st.d, 1e-4), .6 * Math.sin(a), true));
				row.push(pos.length / 3 - 1);
			}
		}
		rows.push(row);
	}
	for (let i = 0; i < rows.length - 1; i++) {
		const A = rows[i];
		const B = rows[i + 1];
		for (let k = 0; k < 21; k++) {
			if (k === K) continue;
			idx.push(A[k], B[k], B[k + 1], A[k], B[k + 1], A[k + 1]);
		}
	}
	const L = rows[rows.length - 1];
	const st = stations[stations.length - 1];
	pos.push(mx$3(st.d) - .003, st.y, 0);
	jaw.push(0);
	const c = pos.length / 3 - 1;
	for (let k = 0; k < 21; k++) if (k !== K) idx.push(L[k], c, L[k + 1]);
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute("aJaw", new THREE.Float32BufferAttribute(jaw, 1));
	g.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(3), 1));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}
function buildGill$3() {
	const NA = 9;
	const NB = 16;
	const pick = (keys, b) => {
		const f = b * (keys.length - 1);
		const i = Math.min(keys.length - 2, Math.floor(f));
		const u = f - i;
		const p0 = keys[Math.max(0, i - 1)];
		const p1 = keys[i];
		const p2 = keys[i + 1];
		const p3 = keys[Math.min(keys.length - 1, i + 2)];
		const cr = (a, b2, c, e) => .5 * (2 * b2 + (-a + c) * u + (2 * a - 5 * b2 + 4 * c - e) * u * u + (-a + 3 * b2 - 3 * c + e) * u * u * u);
		return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
	};
	const pos = [];
	const uv = [];
	const fw = [];
	const idx = [];
	for (let side = 0; side < 2; side++) {
		const sg = side === 0 ? 1 : -1;
		const base = pos.length / 3;
		const cols = 11;
		for (let ib = 0; ib <= NB; ib++) {
			const b = ib / NB;
			const h = pick(GILL_HINGE$2, b);
			const e = pick(GILL_EDGE$2, b);
			const span = Math.hypot(e[0] - h[0], e[1] - h[1]);
			for (let ia = 0; ia <= 10; ia++) {
				const rim = ia === 10;
				const a = rim ? 1 : ia / NA;
				const d = h[0] + (e[0] - h[0]) * a;
				let y = h[1] + (e[1] - h[1]) * a;
				const s = sec$3(d);
				y = THREE.MathUtils.clamp(y, s.bot + .006, s.top - .004);
				const z0 = surfZAt$3(d, y);
				const lift = rim ? 2e-4 : 5e-4 + .0014 * Math.pow(a, .7);
				pos.push(mx$3(d), y, sg * (z0 + lift));
				uv.push(...uvOf$3(d, y));
				fw.push(span * a);
			}
		}
		for (let ib = 0; ib < NB; ib++) for (let ia = 0; ia < 10; ia++) {
			const a = base + ib * cols + ia;
			const b = a + 1;
			const c = a + cols + 1;
			const e = a + cols;
			if (sg > 0) idx.push(a, b, c, a, c, e);
			else idx.push(a, c, b, a, e, c);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
	g.setAttribute("aFw", new THREE.Float32BufferAttribute(fw, 1));
	g.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(7), 1));
	g.setAttribute("aGill", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0), 1));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}
var v3$3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
var PLEAT = .22;
var Fin = class {
	o;
	geo = new THREE.BufferGeometry();
	n;
	seg;
	P;
	normal;
	bulge = null;
	rest = null;
	pos;
	info;
	constructor(o) {
		this.o = o;
		this.n = o.rays.length;
		this.seg = o.seg;
		this.P = o.rays.map(() => Array.from({ length: o.seg + 1 }, () => v3$3()));
		this.normal = Array.from({ length: this.n }, () => v3$3(0, 0, 1));
		const cols = 2 * this.n - 1;
		const rows = o.seg + 1;
		this.pos = new Float32Array(cols * rows * 3);
		this.info = new Float32Array(cols * rows * 4);
		const fin = new Float32Array(cols * rows * 4);
		const idx = [];
		for (let c = 0; c < cols; c++) for (let r = 0; r <= o.seg; r++) {
			const i = c * rows + r;
			fin[i * 4] = c / 2;
			fin[i * 4 + 1] = r / o.seg;
			fin[i * 4 + 2] = o.noRays ? -1 : o.branched[0];
			fin[i * 4 + 3] = o.branched[1];
		}
		for (let c = 0; c < cols - 1; c++) for (let r = 0; r < o.seg; r++) {
			const a = c * rows + r;
			const b = (c + 1) * rows + r;
			idx.push(a, b, b + 1, a, b + 1, a + 1);
		}
		this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
		this.geo.setAttribute("aFin", new THREE.BufferAttribute(fin, 4));
		this.geo.setAttribute("aFinGap", new THREE.BufferAttribute(this.info, 4).setUsage(THREE.DynamicDrawUsage));
		this.geo.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(cols * rows).fill(1), 1));
		this.geo.setIndex(idx);
		this.geo.computeVertexNormals();
		this.geo.boundingSphere = new THREE.Sphere(v3$3(0, 0, 0), 1);
	}
	commit(open = false) {
		const { n, seg } = this;
		const rows = seg + 1;
		if (open || !this.rest) {
			this.rest = [];
			for (let i = 0; i < n - 1; i++) this.rest.push(this.P[i].map((p, r) => p.distanceTo(this.P[i + 1][r])));
		}
		const tmp = v3$3();
		const nn = v3$3();
		const put = (c, r, p, gap, slack) => {
			const k = c * rows + r;
			this.pos[k * 3] = p.x;
			this.pos[k * 3 + 1] = p.y;
			this.pos[k * 3 + 2] = p.z;
			this.info[k * 4] = gap;
			this.info[k * 4 + 1] = slack;
		};
		for (let i = 0; i < n; i++) {
			for (let r = 0; r <= seg; r++) {
				const gl = i > 0 ? this.P[i][r].distanceTo(this.P[i - 1][r]) : Infinity;
				const gr = i < n - 1 ? this.P[i][r].distanceTo(this.P[i + 1][r]) : Infinity;
				put(2 * i, r, this.P[i][r], Math.min(gl, gr), 0);
			}
			if (i === n - 1) break;
			for (let r = 0; r <= seg; r++) {
				const s = r / seg;
				const a = this.P[i][r];
				const b = this.P[i + 1][r];
				const gap = a.distanceTo(b);
				tmp.copy(a).add(b).multiplyScalar(.5);
				if (r === seg) {
					const ra = this.P[i][seg - 1];
					const rb = this.P[i + 1][seg - 1];
					const inner = v3$3().copy(ra).add(rb).multiplyScalar(.5);
					tmp.lerp(inner, Math.min(1, this.o.notch * seg));
				}
				const rest = this.rest[i][r];
				const extra = Math.sqrt(Math.max(0, rest * rest - gap * gap)) * .5;
				const sign = i % 2 === 0 ? 1 : -1;
				nn.copy(this.normal[i]).add(this.normal[i + 1]).normalize();
				tmp.addScaledVector(nn, sign * extra * PLEAT * Math.min(1, s * 4));
				if (this.bulge) {
					const bm = .35 * gap;
					tmp.addScaledVector(nn, Math.max(-bm, Math.min(bm, this.bulge[i][r])));
				}
				put(2 * i + 1, r, tmp, gap, rest > 1e-6 ? extra / (rest * .5) : 0);
			}
		}
		this.geo.getAttribute("position").needsUpdate = true;
		this.geo.getAttribute("aFinGap").needsUpdate = true;
		this.gridNormals();
	}
	gridNormals() {
		const nr = this.geo.getAttribute("normal");
		const na = nr.array;
		const P = this.pos;
		const cols = 2 * this.n - 1;
		const rows = this.seg + 1;
		for (let c = 0; c < cols; c++) {
			const c0 = Math.max(0, c - 1) * rows;
			const c1 = Math.min(cols - 1, c + 1) * rows;
			for (let r = 0; r < rows; r++) {
				const r0 = Math.max(0, r - 1);
				const r1 = Math.min(rows - 1, r + 1);
				const k = (c * rows + r) * 3;
				const ia = (c1 + r) * 3;
				const ib = (c0 + r) * 3;
				const ja = (c * rows + r1) * 3;
				const jb = (c * rows + r0) * 3;
				const ax = P[ia] - P[ib];
				const ay = P[ia + 1] - P[ib + 1];
				const az = P[ia + 2] - P[ib + 2];
				const bx = P[ja] - P[jb];
				const by = P[ja + 1] - P[jb + 1];
				const bz = P[ja + 2] - P[jb + 2];
				let nx = ay * bz - az * by;
				let ny = az * bx - ax * bz;
				let nz = ax * by - ay * bx;
				const l = Math.hypot(nx, ny, nz) || 1;
				nx /= l;
				ny /= l;
				nz /= l;
				na[k] = nx;
				na[k + 1] = ny;
				na[k + 2] = nz;
			}
		}
		nr.needsUpdate = true;
	}
};
var deg$3 = THREE.MathUtils.degToRad;
var lerp$3 = THREE.MathUtils.lerp;
var clamp$4 = THREE.MathUtils.clamp;
function medianFin(name, dir, d0, d1, lens, open, branched, seg) {
	const n = lens.length;
	const d = lens.map((_, i) => d0 + (d1 - d0) * i / (n - 1));
	return {
		fin: new Fin({
			name,
			rays: lens.map((len, i) => {
				const edge = dir > 0 ? TOP$3(d[i]) : BOT$3(d[i]);
				return {
					base: v3$3(mx$3(d[i]), edge - dir * .0025, 0),
					len
				};
			}),
			seg,
			branched,
			notch: .06
		}),
		dir,
		open: open.map(deg$3),
		d
	};
}
function poseMedian(m, fold, tilt, t, flut) {
	const { fin, dir } = m;
	const n = fin.n;
	const seg = fin.seg;
	const edge = dir > 0 ? TOP$3 : BOT$3;
	const lie = smooth$1(fold, .45, 1);
	for (let i = 0; i < n; i++) {
		const ray = fin.o.rays[i];
		const b = ray.base;
		const lay = (s, out) => {
			const dd = m.d[i] + ray.len * s * .985;
			const clear = .0012 + .0026 * (1 - i / (n - 1)) * Math.min(1, s * 3);
			const ye = dd < D_END$3 ? edge(dd) : edge(D_END$3) + (dd - D_END$3) * (dir > 0 ? -.05 : .05);
			out.set(mx$3(dd), ye + dir * clear, 0);
		};
		const tip = v3$3();
		lay(1, tip);
		const foldAng = Math.atan2(dir * (tip.y - b.y), b.x - tip.x);
		const fi = clamp$4(fold * 1.15 - .15 * (i / (n - 1)), 0, 1);
		const ang = lerp$3(m.open[i], foldAng, fi);
		const ca = Math.cos(ang);
		const sa = Math.sin(ang);
		const p = v3$3();
		for (let r = 0; r <= seg; r++) {
			const s = r / seg;
			const bend = .12 * s * s;
			const c2 = Math.cos(ang - bend);
			const s2 = Math.sin(ang - bend);
			const l = ray.len * s;
			p.set(b.x - l * (r === 0 ? ca : c2), b.y + dir * l * (r === 0 ? sa : s2), 0);
			if (lie > 0) {
				const q = v3$3();
				lay(s, q);
				p.lerp(q, lie * smooth$1(fi, .5, 1));
			}
			const h = (p.y - b.y) * dir;
			const wv = flut * Math.pow(s, 1.5) * (.4 + .6 * (i / (n - 1))) * Math.sin(t * 7 - i * .45 - s * 2.2);
			const zt = h * Math.sin(tilt) + wv * (1 - .8 * lie);
			p.y = b.y + dir * h * Math.cos(tilt);
			p.z = zt;
			fin.P[i][r].copy(p);
		}
		fin.normal[i].set(0, -Math.sin(tilt) * dir, Math.cos(tilt));
	}
}
function caudalFin$3(seg = 14) {
	const xb = .786;
	const rays = [];
	const ang = [];
	const baseY = [];
	const proc = [];
	const yc = (TOP$3(D_END$3) + BOT$3(D_END$3)) / 2;
	[
		.758,
		.768,
		.777
	].forEach((d, i) => {
		rays.push({
			base: v3$3(mx$3(d), TOP$3(d) - .0015, 0),
			len: .03 + i * .012
		});
		ang.push(deg$3(9 + i * 4));
		baseY.push(TOP$3(d) - .0015);
		proc.push(true);
	});
	const N = 19;
	for (let i = 0; i < N; i++) {
		const k = 1 - 2 * i / 18;
		const len = .082 + .123 * Math.pow(Math.abs(k), 1.55);
		const y = yc + k * .029;
		rays.push({
			base: v3$3(mx$3(xb), y, 0),
			len
		});
		ang.push(deg$3(31) * k + deg$3(2));
		baseY.push(y);
		proc.push(false);
	}
	[
		.777,
		.768,
		.758
	].forEach((d, i) => {
		rays.push({
			base: v3$3(mx$3(d), BOT$3(d) + .0015, 0),
			len: .054 - i * .012
		});
		ang.push(-deg$3(17 - i * 4));
		baseY.push(BOT$3(d) + .0015);
		proc.push(true);
	});
	return {
		fin: new Fin({
			name: "caudal",
			rays,
			seg,
			branched: [4, 20],
			notch: .04
		}),
		ang,
		baseY,
		procurrent: proc
	};
}
function poseCaudal$3(c, close, t, flut) {
	const { fin } = c;
	const n = fin.n;
	const seg = fin.seg;
	const yc = (TOP$3(D_END$3) + BOT$3(D_END$3)) / 2;
	for (let i = 0; i < n; i++) {
		const ray = fin.o.rays[i];
		const proc = c.procurrent[i];
		const ci = clamp$4(close * 1.1 - .1 * Math.abs(i - (n - 1) / 2) / ((n - 1) / 2), 0, 1);
		const a = proc ? c.ang[i] * (1 - .45 * ci) : c.ang[i] * (1 - .88 * ci);
		const by = proc ? c.baseY[i] : yc + (c.baseY[i] - yc) * (1 - .35 * ci);
		const bx = ray.base.x;
		for (let r = 0; r <= seg; r++) {
			const s = r / seg;
			const l = ray.len * s;
			const sweep = .06 * ((c.baseY[i] - yc) / .03) * s * s * (1 - .7 * ci);
			const x = bx - l * Math.cos(a + sweep);
			const y = by + l * Math.sin(a + sweep);
			const wv = flut * s * s * Math.sin(t * 6 - s * 2.4 - i * .12);
			fin.P[i][r].set(x, y, wv);
		}
		fin.normal[i].set(0, 0, 1);
	}
}
function surfPoint$3(d, t, side) {
	const s = sec$3(d);
	const y = s.bot + t * (s.top - s.bot);
	const z = side * surfZ$3(d, t);
	const e = .001;
	const p = v3$3(mx$3(d), y, z);
	const pd = v3$3(mx$3(d + e), sec$3(d + e).bot + t * (sec$3(d + e).top - sec$3(d + e).bot), side * surfZ$3(d + e, t));
	const t2 = Math.min(1, t + e * 4);
	const pt = v3$3(mx$3(d), s.bot + t2 * (s.top - s.bot), side * surfZ$3(d, t2));
	const du = pd.sub(p);
	const dt = pt.sub(p);
	const n = v3$3().crossVectors(du, dt).normalize();
	if (n.z * side < 0) n.negate();
	return {
		p,
		n
	};
}
function pairedFin$1(name, side, a, b, lens, psiC, psiO, betaC, betaO, lag, seg) {
	const n = lens.length;
	const A = surfPoint$3(a[0], a[1], side);
	const B = surfPoint$3(b[0], b[1], side);
	const rays = lens.map((len, i) => {
		const u = i / (n - 1);
		const sp = surfPoint$3(lerp$3(a[0], b[0], u), lerp$3(a[1], b[1], u), side);
		return {
			base: sp.p.addScaledVector(sp.n, -.0012),
			len
		};
	});
	const nrm = A.n.clone().add(B.n).normalize();
	const axis = B.p.clone().sub(A.p).normalize();
	const back = v3$3(-1, 0, 0);
	const u = back.addScaledVector(nrm, -back.dot(nrm)).normalize();
	const v = axis.clone().addScaledVector(u, -axis.dot(u)).normalize();
	const fin = new Fin({
		name,
		rays,
		seg,
		branched: [1, n - 1],
		notch: .05
	});
	const sgn = v3$3().crossVectors(axis, u).dot(nrm) >= 0 ? 1 : -1;
	return {
		fin,
		side,
		axis,
		u,
		v,
		nrm,
		psiC: psiC.map(deg$3),
		psiO: psiO.map(deg$3),
		betaC: deg$3(betaC),
		betaO: deg$3(betaO),
		lag,
		sgn
	};
}
function keepOutside$3(p, side, clear) {
	const z = surfZAt$3(SNOUT$3 - p.x, p.y);
	if (z <= 0) return;
	if (p.z * side < z + clear) p.z = side * (z + clear);
}
function posePaired$1(f, open, stroke, t, flut, phase) {
	const { fin } = f;
	const n = fin.n;
	const seg = fin.seg;
	const q = new THREE.Quaternion();
	const dir = v3$3();
	const p = v3$3();
	const nn = v3$3();
	for (let i = 0; i < n; i++) {
		const ray = fin.o.rays[i];
		const oi = clamp$4((open - f.lag * (i / (n - 1))) / (1 - f.lag), 0, 1);
		const e = oi * oi * (3 - 2 * oi);
		const psi = lerp$3(f.psiC[i], f.psiO[i], e);
		const beta = Math.max(0, lerp$3(f.betaC, f.betaO, open) + stroke * (.6 + .4 * e) * (1 - .3 * i / (n - 1)));
		q.setFromAxisAngle(f.axis, f.sgn * beta);
		dir.copy(f.u).multiplyScalar(Math.cos(psi)).addScaledVector(f.v, Math.sin(psi)).applyQuaternion(q);
		nn.crossVectors(dir, f.axis).normalize();
		if (nn.dot(f.nrm) < 0) nn.negate();
		fin.normal[i].copy(nn);
		for (let r = 0; r <= seg; r++) {
			const s = r / seg;
			const l = ray.len * s;
			p.copy(ray.base).addScaledVector(dir, l).addScaledVector(nn, -.05 * ray.len * s * s * (.3 + .7 * e));
			const wv = flut * s * s * Math.sin(t * 8 + phase - s * 2 - i * .35);
			p.addScaledVector(nn, wv);
			keepOutside$3(p, f.side, .0012 + 8e-4 * (1 - i / (n - 1)));
			fin.P[i][r].copy(p);
		}
	}
}
function adiposeFin() {
	const d0 = .655;
	const d1 = .703;
	const n = 7;
	const rays = [];
	for (let i = 0; i < n; i++) {
		const u = i / 6;
		const d = lerp$3(d0, d1, u);
		const h = .0195 * Math.pow(Math.sin(Math.PI * Math.pow(u, .75)), .7) + .001;
		rays.push({
			base: v3$3(mx$3(d), TOP$3(d) - .0015, 0),
			len: h
		});
	}
	return new Fin({
		name: "adipose",
		rays,
		seg: 5,
		branched: [99, -1],
		noRays: true,
		notch: 0
	});
}
function poseAdipose(f, t, flut) {
	for (let i = 0; i < f.n; i++) {
		const r0 = f.o.rays[i];
		for (let r = 0; r <= f.seg; r++) {
			const s = r / f.seg;
			const lean = .35 * s;
			const l = r0.len * s;
			f.P[i][r].set(r0.base.x - l * Math.sin(lean) - .01 * s * s * (i / (f.n - 1)), r0.base.y + l * Math.cos(lean), flut * .6 * s * s * Math.sin(t * 6 - i * .5));
		}
		f.normal[i].set(0, 0, 1);
	}
}
function buildEye$3(side, ws = 40, hs = 28) {
	const g = new THREE.SphereGeometry(1, ws, hs);
	const pos = g.getAttribute("position");
	const zs = surfZAt$3(EYE$3.d, EYE$3.y);
	const center = v3$3(mx$3(EYE$3.d), EYE$3.y, side * (zs - .26 * EYE$3.r));
	const P = new Float32Array(pos.count * 3);
	const local = new Float32Array(pos.count * 3);
	const polar = new Float32Array(pos.count * 4);
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const y = pos.getY(i);
		const z = pos.getZ(i);
		const lx = x * EYE$3.r;
		const ly = z * EYE$3.r;
		const lz = y * EYE$3.r * .46;
		local[i * 3] = lx;
		local[i * 3 + 1] = ly;
		local[i * 3 + 2] = lz * side;
		polar[i * 4] = Math.acos(THREE.MathUtils.clamp(y, -1, 1)) / Math.PI;
		polar[i * 4 + 1] = Math.atan2(z, x);
		polar[i * 4 + 2] = .5 - x * .5;
		polar[i * 4 + 3] = .5 + z * .5;
		P[i * 3] = center.x + lx;
		P[i * 3 + 1] = center.y + ly;
		P[i * 3 + 2] = center.z + lz * side;
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage));
	geo.setAttribute("aEye", new THREE.BufferAttribute(polar, 4));
	geo.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(pos.count).fill(6), 1));
	const index = g.getIndex();
	const ia = Array.from(index.array);
	if (side > 0) for (let i = 0; i < ia.length; i += 3) [ia[i + 1], ia[i + 2]] = [ia[i + 2], ia[i + 1]];
	geo.setIndex(ia);
	geo.computeVertexNormals();
	geo.boundingSphere = new THREE.Sphere(v3$3(0, 0, 0), 1);
	g.dispose();
	return {
		geo,
		local,
		localN: Float32Array.from(geo.getAttribute("normal").array),
		center,
		side
	};
}
var STRIPE_Y = curve([
	[.006, .004],
	[.02, .017],
	[.045, .033],
	[.068, .0435],
	[.084, .0475],
	[.1, .0465],
	[.12, .0415],
	[.145, .035],
	[.2, .0275],
	[.3, .0225],
	[.45, .0195],
	[.6, .0175],
	[.7, .0155],
	[.77, .013]
]);
var STRIPE_W = curve([
	[.006, .0015],
	[.03, .0045],
	[.07, .005],
	[.1, .0055],
	[.15, .0085],
	[.25, .0115],
	[.45, .0125],
	[.6, .0115],
	[.7, .0085],
	[.76, .0045],
	[.785, .0012]
]);
function paintBody$3(W, H) {
	const col = document.createElement("canvas");
	col.width = W;
	col.height = H;
	const msk = document.createElement("canvas");
	msk.width = W;
	msk.height = H;
	const bmp = document.createElement("canvas");
	bmp.width = W;
	bmp.height = H;
	const g = col.getContext("2d");
	const m = msk.getContext("2d");
	const b = bmp.getContext("2d");
	const img = g.createImageData(W, H);
	const mimg = m.createImageData(W, H);
	const bimg = b.createImageData(W, H);
	let seed = 12345;
	const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
	const hash = (x, y) => {
		const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
		return s - Math.floor(s);
	};
	const dots = [];
	for (let i = 0; i < 2600; i++) dots.push([
		rnd(),
		rnd(),
		rnd()
	]);
	const sc = .0205;
	const sv = .0145;
	for (let py = 0; py < H; py++) {
		const y = TEX$3.y1 - (py + .5) / H * (TEX$3.y1 - TEX$3.y0);
		for (let px = 0; px < W; px++) {
			const d = TEX$3.d0 + (px + .5) / W * (TEX$3.d1 - TEX$3.d0);
			const dc = clamp$4(d, 0, D_END$3);
			const top = TOP$3(dc);
			const bot = BOT$3(dc);
			const h = top - bot;
			const t = clamp$4((y - bot) / Math.max(h, 1e-4), 0, 1);
			const sy = STRIPE_Y(dc);
			const sw = STRIPE_W(dc);
			const dist = (y - sy) / Math.max(sw, 1e-4);
			const row = Math.floor((y - sy) / sv + 100);
			const cx = (d + row % 2 * sc * .5) / sc;
			const fx = cx - Math.floor(cx);
			const fy = (y - sy) / sv + 100 - row;
			const r = Math.hypot((1 - fx) * 1.1, (fy - .5) * 1.25);
			const edge = smooth$1(Math.abs(r - .62), .12, 0) * (d > .13 ? 1 : .25);
			const scaleShade = .9 + .1 * smooth$1(r, .75, .2);
			let R;
			let G;
			let B;
			const backK = smooth$1(t, .6, 1);
			R = lerp$3(.6, .38, backK);
			G = lerp$3(.55, .35, backK);
			B = lerp$3(.36, .22, backK);
			R *= 1 - .28 * edge;
			G *= 1 - .26 * edge;
			B *= 1 - .22 * edge;
			const below = smooth$1(dist, -1, -1.6);
			const redD = smooth$1(d, .095, .17);
			const red = below * redD;
			const rr = .86 * scaleShade + .08 * hash(px * .37, py * .53);
			R = lerp$3(R, rr, red);
			G = lerp$3(G, .06 + .04 * edge, red);
			B = lerp$3(B, .07 + .03 * edge, red);
			const silverD = smooth$1(d, .14, .2) * (1 - smooth$1(d, .42, .5));
			const silver = smooth$1(t, .17, .05) * silverD;
			R = lerp$3(R, .86, silver);
			G = lerp$3(G, .82, silver);
			B = lerp$3(B, .8, silver);
			const cheek = below * (1 - redD);
			const pink = smooth$1(d, .06, .14) * smooth$1(t, .55, .2);
			R = lerp$3(R, lerp$3(.74, .86, pink), cheek);
			G = lerp$3(G, lerp$3(.72, .45, pink), cheek);
			B = lerp$3(B, lerp$3(.68, .45, pink), cheek);
			const snout = 1 - smooth$1(d, 0, .035);
			R = lerp$3(R, .66, snout * .7);
			G = lerp$3(G, .64, snout * .7);
			B = lerp$3(B, .6, snout * .7);
			const stripe = smooth$1(Math.abs(dist), 1.15, .75) * smooth$1(d, 0, .006);
			R = lerp$3(R, .04, stripe);
			G = lerp$3(G, .32, stripe);
			B = lerp$3(B, .55, stripe);
			const dark = smooth$1(Math.abs(dist - 1.25), .35, 0) * smooth$1(d, .15, .25) * .35;
			R *= 1 - dark;
			G *= 1 - dark;
			B *= 1 - dark;
			const k = (py * W + px) * 4;
			img.data[k] = clamp$4(R, 0, 1) * 255;
			img.data[k + 1] = clamp$4(G, 0, 1) * 255;
			img.data[k + 2] = clamp$4(B, 0, 1) * 255;
			img.data[k + 3] = 255;
			mimg.data[k] = stripe * 255;
			mimg.data[k + 1] = Math.max(silver, cheek * .6) * 255;
			mimg.data[k + 2] = red * 255;
			mimg.data[k + 3] = 255;
			const bump = .5 + .5 * (scaleShade - .9) * 8 - .25 * edge;
			bimg.data[k] = bimg.data[k + 1] = bimg.data[k + 2] = clamp$4(bump, 0, 1) * 255;
			bimg.data[k + 3] = 255;
		}
	}
	for (const [u, v, s] of dots) {
		const px = Math.floor(u * W);
		const py = Math.floor(v * H);
		const y = TEX$3.y1 - py / H * (TEX$3.y1 - TEX$3.y0);
		const dc = clamp$4(TEX$3.d0 + px / W * (TEX$3.d1 - TEX$3.d0), 0, D_END$3);
		const t = (y - BOT$3(dc)) / (TOP$3(dc) - BOT$3(dc));
		if (t < .45 || t > 1) continue;
		const k = (py * W + px) * 4;
		const a = .35 + .4 * s;
		for (const o of [
			0,
			4,
			W * 4
		]) {
			if (k + o + 2 >= img.data.length) continue;
			img.data[k + o] *= 1 - a;
			img.data[k + o + 1] *= 1 - a;
			img.data[k + o + 2] *= 1 - a * .8;
		}
	}
	g.putImageData(img, 0, 0);
	m.putImageData(mimg, 0, 0);
	b.putImageData(bimg, 0, 0);
	return {
		col,
		msk,
		bmp
	};
}
var VERT_HEAD = `
varying vec3 vObjN;
#ifdef T_INST
uniform float uTime, uLam;
attribute vec4 iSwim, iNeck, iA;
#define uSwim iSwim
#define uNeck iNeck
#define uPower iSwim.w
#define uMouth iA.x
#define uGill iA.y
#define uFloor iA.z
#define uHead iA.w
#else
uniform float uTime, uMouth, uGill, uFloor, uHead, uPower, uLam;
uniform vec4 uSwim, uNeck;
#endif
#ifdef T_FINRED
attribute float aRed;
varying float vRed;
#endif
#ifdef T_FINLIB
uniform sampler2D tFinLib;
uniform vec4 uFinLibK[5];
attribute vec4 iF0, iF1, iF2;
void finLibAt(int vid, int pose, out vec4 a, out vec4 b) {
  a = texelFetch(tFinLib, ivec2(pose * 2, vid), 0);
  b = texelFetch(tFinLib, ivec2(pose * 2 + 1, vid), 0);
}
void finLib(out vec3 P, out vec3 N, out vec2 G) {
  int vid = int(position.x + 0.5);
  int kind = int(position.y + 0.5);
  float by = position.z;
  float pa = 0.0, pb = 0.0, tilt = 0.0, dir = 1.0;
  if (kind == 0) { pa = iF0.x; tilt = iF0.y; }
  else if (kind == 1) { pa = iF0.z; tilt = iF0.w; dir = -1.0; }
  else if (kind == 2) { pa = iF1.x; pb = iF1.y; }
  else if (kind == 3) { pa = iF1.z; pb = iF1.w; }
  else { pa = iF2.x; }
  vec4 K = uFinLibK[kind];
  int ka = int(K.x);
  int kb = int(K.y);
  float fa = clamp(pa, 0.0, 1.0) * (K.x - 1.0);
  float fb = clamp(pb, 0.0, 1.0) * max(K.y - 1.0, 0.0);
  int a0 = min(int(floor(fa)), ka - 1);
  int a1 = min(a0 + 1, ka - 1);
  int b0 = min(int(floor(fb)), kb - 1);
  int b1 = min(b0 + 1, kb - 1);
  float wa = fa - float(a0);
  float wb = fb - float(b0);
  vec4 x00, y00, x10, y10, x01, y01, x11, y11;
  finLibAt(vid, b0 * ka + a0, x00, y00);
  finLibAt(vid, b0 * ka + a1, x10, y10);
  finLibAt(vid, b1 * ka + a0, x01, y01);
  finLibAt(vid, b1 * ka + a1, x11, y11);
  vec4 X = mix(mix(x00, x10, wa), mix(x01, x11, wa), wb);
  vec4 Y = mix(mix(y00, y10, wa), mix(y01, y11, wa), wb);
  P = X.xyz;
  N = normalize(Y.xyz);
  G = vec2(X.w, Y.w);
  if (kind <= 1) {
    float c = cos(tilt), s = sin(tilt);
    float h = (P.y - by) * dir;
    float z = P.z;
    P.y = by + dir * (h * c - z * s);
    P.z = h * s + z * c;
    float nh = N.y * dir;
    float nz = N.z;
    N.y = dir * (nh * c - nz * s);
    N.z = nh * s + nz * c;
  }
}
#endif
uniform vec3 uEnv;
uniform vec2 uJaw;
attribute float aPart;
#ifdef T_JAW
attribute float aJaw;
#endif
#ifdef T_GILL
attribute float aFw;
#endif
#ifdef T_BODY
attribute float aGill;
varying float vGill;
#endif
#ifdef T_FIN
attribute vec4 aFin;
#ifndef T_FINLIB
attribute vec4 aFinGap;
#endif
varying vec4 vFin;
varying vec4 vFinGap;
#endif
#ifdef T_EYE
attribute vec4 aEye;
varying vec4 vEye;
#endif
varying vec3 vModel;
float fishH(float s, float cyc, float amp) {
  float tip = uEnv.x + uEnv.y + uEnv.z;
  float A0 = uEnv.x * uHead + uEnv.y * s + uEnv.z * s * s;
  float A1 = tip * (0.25 + 0.75 * pow(max(s, 0.0), 1.6));
  float A = mix(A0, A1, clamp(uPower, 0.0, 1.0));
  return amp * A / tip * sin(6.2831853 * (s / uLam - cyc));
}
float lieH(float s, float cyc, float amp) {
  float h = fishH(s, cyc, amp);
  if (uFloor == 0.0) return h;
  float k = sign(uFloor), e = 0.004;
  float up = 0.5 * (h * k + sqrt(h * h + e * e)) - 0.5 * e;
  return mix(h, k * up, abs(uFloor));
}
float neckInt(float s, float a, float b) {
  if (s <= a) return 0.0;
  float w = b - a;
  if (s >= b) return 0.5 * w + (s - b);
  float u = (s - a) / w;
  return w * (u * u * u - 0.5 * u * u * u * u);
}
`;
var VERT_BODY = `
#ifdef T_FINLIB
vec3 fishP;
vec3 objectNormal;
vec2 finLibGap;
finLib(fishP, objectNormal, finLibGap);
#else
vec3 fishP = position;
vec3 objectNormal = normal;
#endif
vModel = fishP;
vObjN = objectNormal;
#ifdef T_BODY
vGill = aGill;
#endif
#ifdef T_FIN
vFin = aFin;
#ifdef T_FINLIB
vFinGap = vec4(finLibGap, 0.0, 0.0);
#else
vFinGap = aFinGap;
#endif
#endif
#ifdef T_FINRED
vRed = aRed;
#endif
#ifdef T_EYE
vEye = aEye;
#endif
#ifdef T_JAW
if (aJaw > 0.0) {
  float ja = -uMouth * aJaw;
  vec2 hp = fishP.xy - uJaw;
  float jc = cos(ja), js = sin(ja);
  fishP.xy = uJaw + vec2(hp.x * jc - hp.y * js, hp.x * js + hp.y * jc);
  objectNormal.xy = vec2(objectNormal.x * jc - objectNormal.y * js, objectNormal.x * js + objectNormal.y * jc);
}
#endif
#ifdef T_GILL
{
  float sd = sign(fishP.z);
  float fw = aFw;
  fishP.z += sd * fw * sin(uGill);
  fishP.x += fw * (1.0 - cos(uGill)) * 0.5;
  float ga = sd * uGill * clamp(fw / 0.02, 0.0, 1.0);
  float gc = cos(ga), gs = sin(ga);
  objectNormal = vec3(objectNormal.x * gc + objectNormal.z * gs, objectNormal.y, -objectNormal.x * gs + objectNormal.z * gc);
}
#endif
float cyc = uSwim.x, amp = uSwim.y, bend = uSwim.z;
float fs = ${SNOUT$3.toFixed(3)} - fishP.x;
if (uNeck.x != 0.0) {
  float psi = -uNeck.x * smoothstep(uNeck.y, uNeck.z, fs);
  float S = neckInt(fs, uNeck.y, uNeck.z);
  float nc = cos(psi), ns = sin(psi);
  fishP.x += 0.5 * uNeck.x * uNeck.x * S + fishP.z * ns;
  fishP.z = -uNeck.x * S + fishP.z * nc;
  objectNormal = vec3(objectNormal.x * nc + objectNormal.z * ns, objectNormal.y, -objectNormal.x * ns + objectNormal.z * nc);
}
float fd = (lieH(fs + 0.002, cyc, amp) - lieH(fs - 0.002, cyc, amp)) / 0.004 * (-1.0);
float bx = fs - 0.35;
fishP.z += lieH(fs, cyc, amp) + 0.5 * bend * bx * bx;
fd += bend * bx * (-1.0);
float sx = 0.35;
fishP.z += 0.5 * uNeck.w * (bx * bx - sx * sx);
fd -= uNeck.w * bx;
objectNormal = normalize(vec3(objectNormal.x - fd * objectNormal.z, objectNormal.y, objectNormal.z));
`;
function sharedUniforms$3() {
	return {
		uTime: { value: 0 },
		uMouth: { value: 0 },
		uGill: { value: 0 },
		uFloor: { value: 0 },
		uHead: { value: 1 },
		uPower: { value: 0 },
		uLam: { value: .95 },
		uSwim: { value: new THREE.Vector4() },
		uNeck: { value: new THREE.Vector4() },
		uEnv: { value: new THREE.Vector3(.02, -.08, .16) },
		uJaw: { value: new THREE.Vector2(mx$3(MOUTH$4.joint[0]), MOUTH$4.joint[1]) }
	};
}
function inject$3(mat, u, defs, extra, frag) {
	mat.onBeforeCompile = (sh) => {
		Object.assign(sh.uniforms, u, extra);
		const d = defs.map((x) => `#define ${x}\n`).join("");
		sh.vertexShader = d + VERT_HEAD + sh.vertexShader.replace("#include <beginnormal_vertex>", VERT_BODY).replace("#include <begin_vertex>", "vec3 transformed = fishP;");
		sh.fragmentShader = d + frag(sh.fragmentShader);
	};
	mat.customProgramCacheKey = () => "tetra-" + defs.join("-");
}
var STRIPE_GAIN = { value: 2.5 };
function bodyMaterial$3(u, tex, kind, more = []) {
	const mat = new THREE.MeshPhysicalMaterial({
		map: tex.col,
		bumpMap: tex.bmp,
		bumpScale: .35,
		roughness: .42,
		metalness: 0,
		clearcoat: .55,
		clearcoatRoughness: .22,
		sheen: .15,
		sheenColor: new THREE.Color(.7, .75, .8),
		sheenRoughness: .5
	});
	const tailFade = kind === "body" && !!photoTex$3?.fins;
	const extra = {
		uMask: { value: tex.msk },
		uStripe: STRIPE_GAIN,
		uFinTex: { value: tailFade ? photoTex$3.fins : null }
	};
	inject$3(mat, u, [
		...kind === "body" ? ["T_BODY", "T_JAW"] : ["T_GILL"],
		...tailFade ? ["T_TAILFADE"] : [],
		...more
	], extra, (fs) => `uniform sampler2D uMask;\nuniform float uStripe;\nuniform sampler2D uFinTex;\nvarying vec3 vModel;\nvarying vec3 vObjN;\n#ifdef T_BODY\nvarying float vGill;\n#endif\n` + fs.replace("#include <map_fragment>", `
float topK = smoothstep(0.55, 0.95, abs(normalize(vObjN).y));
vec4 sampledDiffuseColor = texture2D(map, vMapUv, topK * 3.5);
diffuseColor *= sampledDiffuseColor;
vec4 tMask = texture2D(uMask, vMapUv, topK * 3.5);
#ifdef T_TAILFADE
{
  float dd = ${SNOUT$3.toFixed(4)} - vModel.x;
  float tk = smoothstep(${.77.toFixed(4)}, ${.798.toFixed(4)}, dd);
  if (tk > 0.0) {
    vec2 fuv = vec2((max(dd, ${.803.toFixed(4)}) - ${FTEX.d0.toFixed(4)}) / ${(FTEX.d1 - FTEX.d0).toFixed(4)}, (vModel.y - ${FTEX.y0.toFixed(4)}) / ${(FTEX.y1 - FTEX.y0).toFixed(4)});
    diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(uFinTex, fuv, 1.5).rgb, tk);
    tMask *= 1.0 - tk;
  }
}
#endif
diffuseColor.rgb *= 1.0 - 0.35 * tMask.r;
diffuseColor.rgb += tMask.b * vec3(0.0, 0.025, 0.05);
#ifdef T_BODY
if (vGill > 0.02) {
  float fil = 0.5 + 0.5 * sin(vModel.y * 900.0 + sin(vModel.x * 300.0) * 2.0);
  vec3 gill = mix(vec3(0.32, 0.02, 0.03), vec3(0.75, 0.08, 0.08), fil);
  diffuseColor.rgb = mix(diffuseColor.rgb, gill, smoothstep(0.02, 0.6, vGill));
}
#endif
`).replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
{
  vec3 V = normalize(vViewPosition);
  float nv = clamp(dot(normal, V), 0.0, 1.0);
  float g = 1.0 - nv;
  totalEmissiveRadiance += tMask.r * vec3(0.03, 0.12, 0.16);
  totalEmissiveRadiance += tMask.g * vec3(0.55, 0.6, 0.66) * (0.06 + 0.3 * g * g);
  totalEmissiveRadiance += tMask.b * vec3(0.14, 0.008, 0.006) * (0.6 + 0.4 * g);
}
`).replace("#include <aomap_fragment>", `#include <aomap_fragment>
{
  vec3 E = (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) / max(diffuseColor.rgb, vec3(0.04));
  float e = dot(E, vec3(0.2126, 0.7152, 0.0722));
  vec3 V = normalize(vViewPosition);
  float nv = clamp(dot(normal, V), 0.0, 1.0);
  vec3 iriA = vec3(0.3, 0.85, 1.0);
  vec3 iriB = vec3(0.1, 0.5, 1.0);
  vec3 iriC = vec3(0.3, 0.14, 0.8);
  vec3 iri = nv > 0.55 ? mix(iriB, iriA, (nv - 0.55) / 0.45) : mix(iriC, iriB, nv / 0.55);
  iri = mix(iri * vec3(0.35, 0.55, 1.15), iri, smoothstep(0.35, 0.85, tMask.r));
  iri = mix(iri, vec3(dot(iri, vec3(0.33))), 0.15);
  vec2 sc = floor(vModel.xy / 0.015);
  float o = fract(sin(dot(sc, vec2(12.9898, 78.233))) * 43758.5453);
  float glint = pow(max(0.0, cos(18.0 * (nv - 0.45 - 0.5 * o))), 6.0);
  float sparkle = 0.7 + 0.35 * clamp(dot(sampledDiffuseColor.rgb, vec3(0.3, 0.5, 0.2)), 0.0, 1.0) + 0.45 * glint;
  totalEmissiveRadiance += tMask.r * iri * (0.35 + 0.65 * pow(nv, 0.5)) * sparkle * e * uStripe;
}`));
	return mat;
}
function mouthMaterial$3(u) {
	const mat = new THREE.MeshStandardMaterial({
		color: new THREE.Color(.3, .13, .14),
		roughness: .9,
		side: THREE.DoubleSide
	});
	inject$3(mat, u, ["T_JAW"], {}, (fs) => "varying vec3 vModel;\n" + fs.replace("#include <color_fragment>", `#include <color_fragment>
diffuseColor.rgb *= mix(1.0, 0.25, smoothstep(0.004, ${(MOUTH$4.throat * .8).toFixed(3)}, ${SNOUT$3.toFixed(3)} - vModel.x));`));
	return mat;
}
function eyeMaterial$3(u, photo, more = []) {
	const mat = new THREE.MeshPhysicalMaterial({
		color: 16777215,
		roughness: .3,
		clearcoat: 1,
		clearcoatRoughness: .03,
		metalness: 0
	});
	inject$3(mat, u, [...photo ? ["T_EYE", "T_EYEPHOTO"] : ["T_EYE"], ...more], { uEyeTex: { value: photo } }, (fs) => "varying vec3 vModel;\nvarying vec4 vEye;\nuniform sampler2D uEyeTex;\n" + fs.replace("#include <color_fragment>", `#include <color_fragment>
{
  float r = vEye.x;
  float a = vEye.y;
  float pupil = 0.205;
  float iris = 0.39;
  vec3 c;
  if (r < pupil) c = vec3(0.004);
  else if (r < iris) {
    float k = (r - pupil) / (iris - pupil);
    float rad = 0.5 + 0.5 * sin(a * 37.0 + sin(a * 11.0) * 2.0);
    vec3 silver = mix(vec3(0.62, 0.62, 0.58), vec3(0.85, 0.8, 0.62), rad);
    vec3 gold = vec3(0.7, 0.55, 0.28);
    c = mix(silver, gold, 0.35 * k + 0.2 * rad * k);
    float up = smoothstep(0.2, 0.9, sin(a));
    c = mix(c, vec3(0.15, 0.6, 0.7), up * smoothstep(0.35, 1.0, k) * 0.8);
    c *= mix(0.45, 1.0, smoothstep(0.0, 0.18, k));
    c *= mix(1.0, 0.55, smoothstep(0.8, 1.0, k));
  } else c = vec3(0.18, 0.17, 0.14);
#ifdef T_EYEPHOTO
  if (r < 0.5) c = texture2D(uEyeTex, vEye.zw).rgb;
#endif
  diffuseColor.rgb = c;
}
`));
	return mat;
}
function finMaterial$3(u, tint, redBase = 0, more = [], moreU = {}) {
	const mat = new THREE.MeshPhysicalMaterial({
		color: tint,
		roughness: .28,
		metalness: 0,
		transparent: true,
		side: THREE.DoubleSide,
		depthWrite: false,
		clearcoat: .3,
		clearcoatRoughness: .2
	});
	const photo = photoTex$3?.fins ?? null;
	if (photo) {
		mat.map = photo;
		mat.color.setRGB(1, 1, 1);
		mat.roughness = .42;
		mat.clearcoat = .55;
		mat.clearcoatRoughness = .22;
	}
	const tailYc = (TOP$3(D_END$3) + BOT$3(D_END$3)) / 2;
	const tailHh = (TOP$3(D_END$3) - BOT$3(D_END$3)) / 2;
	inject$3(mat, u, [
		"T_FIN",
		...photo ? ["FIN_PHOTO"] : [],
		...more
	], {
		uRedBase: { value: redBase },
		...moreU
	}, (fs) => "#ifdef T_FINRED\nvarying float vRed;\n#define uRedBase vRed\n#else\nuniform float uRedBase;\n#endif\nvarying vec3 vModel;\nvarying vec4 vFin;\nvarying vec4 vFinGap;\n" + fs.replace("#include <color_fragment>", `#include <color_fragment>
#ifdef FIN_PHOTO
{
  float s = vFin.y;
  vec4 tp = texture2D(map, vMapUv);
  vec3 V = normalize(vViewPosition);
  float fres = pow(1.0 - abs(dot(normalize(vNormal), V)), 2.0);
  float alpha = 1.0 - pow(1.0 - tp.a, 1.4);
  alpha = clamp(alpha * (1.0 + 0.35 * fres + 0.4 * vFinGap.y), 0.0, 1.0);
  diffuseColor.rgb = tp.rgb;
  diffuseColor.a = alpha;
  {
    float dd = ${SNOUT$3.toFixed(4)} - vModel.x;
    float tailRoot = uRedBase * (1.0 - smoothstep(${.804.toFixed(4)}, ${.8240000000000001.toFixed(4)}, dd));
    tailRoot *= 1.0 - smoothstep(${(tailHh * .95).toFixed(4)}, ${(tailHh * 1.03).toFixed(4)}, abs(vModel.y - ${tailYc.toFixed(4)}));
    diffuseColor.a = mix(diffuseColor.a, 1.0, tailRoot);
  }
}
#else
{
  float rc = vFin.x, s = vFin.y;
  float gap = max(vFinGap.x, 1e-5);
  bool rays = vFin.z >= 0.0;
  float ri = floor(rc + 0.5);
  float w = mix(0.0013, 0.0006, s);
  float line = 0.0;
  if (rays) {
    bool br = ri >= vFin.z && ri <= vFin.w;
    float sb = 0.42;
    float off = br && s > sb ? 0.16 * (s - sb) / (1.0 - sb) : 0.0;
    for (int k = -1; k <= 1; k += 2) {
      float dr = abs(rc - (ri + float(k) * off)) * gap;
      float aa = fwidth(rc) * gap + 1e-5;
      line = max(line, 1.0 - smoothstep(w * (off > 0.0 ? 0.75 : 1.0) - aa * 0.5, w + aa, dr));
    }
    float seg = abs(fract(s * 15.0 + ri * 0.37) - 0.5);
    line *= 0.8 + 0.35 * smoothstep(0.42, 0.5, seg);
    line *= clamp(w * 2.0 / (fwidth(rc) * gap + 1e-6), 0.25, 1.0);
  }
  vec3 V = normalize(vViewPosition);
  float nv = abs(dot(normalize(vNormal), V));
  float fres = pow(1.0 - nv, 2.0);
  float memb = 0.15 + 0.12 * fres + 0.14 * vFinGap.y;
  memb += 0.08 * (1.0 - smoothstep(0.0, 0.15, s));
  float alpha = rays ? max(memb, 0.8 * line) : 0.3 + 0.25 * fres;
  diffuseColor.rgb = mix(diffuseColor.rgb * 0.8, vec3(1.0, 0.98, 0.92), line);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.85, 0.12, 0.1), uRedBase * (1.0 - smoothstep(0.0, 0.16, s)) * 0.8);
  alpha = max(alpha, uRedBase * 0.55 * (1.0 - smoothstep(0.02, 0.18, s)));
  diffuseColor.a *= alpha;
}
#endif
`));
	return mat;
}
var fh = (n) => {
	const s = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
	return s - Math.floor(s);
};
function whimValue(id, seg) {
	if (fh(seg * 3.7 + id * 11) < .45) return 0;
	return lerp$3(-.6, 1, fh(seg * 1.3 + id * 23 + 5));
}
function finWhim(id, t) {
	const k = t / (1.4 + 2.6 * fh(id * 17 + .3)) + fh(id * 5 + 1.7) * 9;
	const seg = Math.floor(k);
	const move = lerp$3(.12, .3, fh(id + seg * .37));
	return lerp$3(whimValue(id, seg - 1), whimValue(id, seg), smooth$1(k - seg, 0, move));
}
function eyeJump(id, T, time) {
	const k = time / T + fh(id + 1) * 7;
	const seg = Math.floor(k);
	const g0 = [fh(seg * 1.7 + id), fh(seg * 2.3 + id + 11)];
	const g1 = [fh(seg * 1.7 - 1.7 + id), fh(seg * 2.3 - 2.3 + id + 11)];
	const m = smooth$1(k - seg, 0, .08 / T);
	return [lerp$3(g1[0], g0[0], m) - .5, lerp$3(g1[1], g0[1], m) - .5];
}
var texCache = null;
var photoTex$3 = null;
async function loadTetra(url) {
	if (photoTex$3) return;
	const tl = new THREE.TextureLoader();
	const load = async (f, srgb) => {
		const t = await tl.loadAsync(url(f));
		t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
		t.anisotropy = 8;
		t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
		return t;
	};
	try {
		const [col, msk, bmp, eye, fins] = await Promise.all([
			load("cardinal_body.webp", true),
			load("cardinal_mask.webp", false),
			load("cardinal_bump.webp", false),
			load("cardinal_eye.webp", true),
			load("cardinal_fins.webp", true).catch(() => void 0)
		]);
		photoTex$3 = {
			col,
			msk,
			bmp,
			eye,
			fins
		};
	} catch {}
}
function textures$3() {
	if (photoTex$3) return photoTex$3;
	if (texCache) return texCache;
	const { col, msk, bmp } = paintBody$3(2048, 640);
	const mk = (c, srgb) => {
		const t = new THREE.CanvasTexture(c);
		t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
		t.anisotropy = 8;
		t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
		t.flipY = true;
		return t;
	};
	texCache = {
		col: mk(col, true),
		msk: mk(msk, false),
		bmp: mk(bmp, false)
	};
	return texCache;
}
var geoCache$3 = null;
function bodies$3() {
	if (!geoCache$3) geoCache$3 = {
		hi: buildBody$3(18, 16, 34, .0055),
		lo: buildBody$3(9, 8, 14, .014)
	};
	return geoCache$3;
}
function makeFins$3(seg) {
	const dorsal = medianFin("dorsal", 1, .392, .468, [
		.034,
		.122,
		.138,
		.136,
		.127,
		.116,
		.103,
		.09,
		.078,
		.068
	], [
		70,
		62,
		57,
		52,
		47,
		43,
		39,
		35,
		31,
		27
	], [2, 9], seg ?? 14);
	const anLen = [
		.02,
		.048,
		.094
	];
	const anAng = [
		72,
		66,
		60
	];
	for (let i = 3; i < 20; i++) {
		const k = (i - 3) / 16;
		anLen.push(.112 - .075 * Math.pow(k, .85));
		anAng.push(57 - 25 * k);
	}
	const anal = medianFin("anal", -1, .505, .735, anLen, anAng, [3, 19], seg ?? 10);
	const caudal = caudalFin$3(seg ?? 14);
	const adipose = adiposeFin();
	const pect = [1, -1].map((side) => pairedFin$1("pectoral", side, [.187, .36], [.192, .23], [
		.09,
		.096,
		.095,
		.091,
		.085,
		.079,
		.072,
		.065,
		.057,
		.049,
		.041
	], [
		-2,
		-1,
		0,
		1,
		2,
		3,
		4,
		5,
		6,
		7,
		8
	], [
		-14,
		-8,
		-2,
		4,
		9,
		14,
		19,
		24,
		29,
		34,
		39
	], 2, 58, .35, seg ?? 10));
	const pelv = [1, -1].map((side) => pairedFin$1("pelvic", side, [.352, .075], [.36, .012], [
		.078,
		.083,
		.08,
		.075,
		.068,
		.061,
		.054,
		.047
	], [
		0,
		1,
		2,
		3,
		4,
		5,
		6,
		7
	], [
		-22,
		-14,
		-7,
		0,
		7,
		13,
		19,
		25
	], 0, 52, .4, seg ?? 9));
	poseMedian(dorsal, 0, 0, 0, 0);
	dorsal.fin.commit(true);
	poseMedian(anal, 0, 0, 0, 0);
	anal.fin.commit(true);
	poseCaudal$3(caudal, 0, 0, 0);
	caudal.fin.commit(true);
	poseAdipose(adipose, 0, 0);
	adipose.commit(true);
	for (const p of [...pect, ...pelv]) {
		posePaired$1(p, 1, 0, 0, 0, 0);
		p.fin.commit(true);
	}
	for (const f of [
		dorsal.fin,
		anal.fin,
		caudal.fin,
		adipose
	]) finUV$3(f);
	for (const p of pect) borrowUV(p.fin, dorsal.fin, 2, 18);
	for (const p of pelv) borrowUV(p.fin, anal.fin, 2, 20);
	return {
		dorsal,
		anal,
		caudal,
		adipose,
		pect,
		pelv
	};
}
function finUV$3(fin) {
	const pos = fin.geo.getAttribute("position");
	const uv = new Float32Array(pos.count * 2);
	for (let i = 0; i < pos.count; i++) {
		const [a, b] = finUvOf(SNOUT$3 - pos.getX(i), pos.getY(i));
		uv[i * 2] = a;
		uv[i * 2 + 1] = b;
	}
	fin.geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}
function borrowUV(fin, src, c0, c1) {
	const sp = src.geo.getAttribute("uv");
	const rowsS = src.seg + 1;
	const rows = fin.seg + 1;
	const cols = 2 * fin.n - 1;
	const uv = new Float32Array(cols * rows * 2);
	for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
		const sc = c0 + Math.round(c / (cols - 1) * (c1 - c0));
		const sr = Math.round(r / (rows - 1) * (rowsS - 1));
		const k = sc * rowsS + sr;
		uv[(c * rows + r) * 2] = sp.getX(k);
		uv[(c * rows + r) * 2 + 1] = sp.getY(k);
	}
	fin.geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}
var FINLIB_STROKE = .3;
function buildTetra(length, batch) {
	const u = sharedUniforms$3();
	const tex = textures$3();
	const matBody = bodyMaterial$3(u, tex, "body");
	const matGill = bodyMaterial$3(u, tex, "gill");
	const matMouth = mouthMaterial$3(u);
	const matEye = eyeMaterial$3(u, photoTex$3?.eye ?? null);
	const matFin = finMaterial$3(u, new THREE.Color(.93, .95, .97));
	const matTail = finMaterial$3(u, new THREE.Color(.93, .95, .97), 1);
	const matAdi = finMaterial$3(u, new THREE.Color(.7, .68, .55));
	const { dorsal, anal, caudal, adipose, pect, pelv } = makeFins$3();
	let eyes = null;
	const eyeHiMeshes = [];
	const hiEyes = () => {
		if (eyes) return;
		eyes = [1, -1].map((s) => buildEye$3(s));
		eyeHiMeshes.forEach((m, i) => m.geometry = eyes[i].geo);
	};
	const root = new THREE.Group();
	const lod = new THREE.LOD();
	lod.scale.setScalar(length);
	lod.rotation.y = -Math.PI / 2;
	const eyesLo = [1, -1].map((s) => buildEye$3(s, 12, 8));
	const level = (b, light) => {
		const g = new THREE.Group();
		if (light && batch) return g;
		const body = new THREE.Mesh(b.body, matBody);
		g.add(body);
		g.add(new THREE.Mesh(b.gill, matGill));
		if (!light) g.add(new THREE.Mesh(b.mouth, matMouth));
		for (const e of eyesLo) {
			const m = new THREE.Mesh(e.geo, matEye);
			if (!light) eyeHiMeshes.push(m);
			g.add(m);
		}
		for (const f of [
			dorsal.fin,
			anal.fin,
			...pect.map((p) => p.fin),
			...light ? [] : pelv.map((p) => p.fin)
		]) {
			const m = new THREE.Mesh(f.geo, matFin);
			m.renderOrder = 1;
			g.add(m);
		}
		const tail = new THREE.Mesh(caudal.fin.geo, matTail);
		tail.renderOrder = 1;
		g.add(tail);
		if (!light) {
			const adi = new THREE.Mesh(adipose.geo, matAdi);
			adi.renderOrder = 1;
			g.add(adi);
		}
		g.traverse((o) => o.frustumCulled = false);
		body.onBeforeRender = (_r, _s, cam) => {
			if (!light) hiEyes();
			camWorld.setFromMatrixPosition(cam.matrixWorld);
			body.updateWorldMatrix(true, false);
			camLocal.copy(camWorld).applyMatrix4(inv.copy(body.matrixWorld).invert());
		};
		return g;
	};
	const camWorld = v3$3();
	const camLocal = v3$3(0, 0, 3);
	const inv = new THREE.Matrix4();
	const { hi, lo } = bodies$3();
	lod.addLevel(level(hi, false), 0);
	const loDist = 2.5 + length * 8;
	lod.addLevel(level(lo, true), loDist, .1);
	if (batch) {
		lod.addLevel(new THREE.Group(), loDist * 2);
		batch.add(u, lod, length, (out) => finParams(out));
	}
	root.add(lod);
	const st = {
		finClock: 0,
		tilt: 0,
		fold: .4,
		steer: 0,
		wobble: 0,
		pect: .15,
		whim: 0,
		flut: 0,
		flag: 0,
		seed: Math.random(),
		look: 0,
		slow: 0,
		flap: 0,
		lastCyc: 0,
		every: 1,
		tick: Math.floor(Math.random() * 30),
		pectTurn: 0,
		extFlap: false
	};
	const eyeR = new THREE.Matrix4();
	const eyeRx = new THREE.Matrix4();
	const foldOf = (id) => {
		const c = st.finClock;
		const seed = st.seed;
		const fhz = lerp$3(.2, .6, fh(id * 9 + seed * 13));
		const fph = Math.PI * 2 * (fhz * c + fh(id * 4 + seed * 3));
		let f = st.fold + st.wobble * (.7 * Math.sin(fph) + .3 * Math.sin(2.6 * fph + .8));
		f += st.whim * finWhim(id + seed * 3.1, c);
		return clamp$4(f, 0, 1);
	};
	const tiltOf = (id, side) => {
		const c = st.finClock;
		const seed = st.seed;
		const mhz = lerp$3(.35, .8, fh(id * 5 + seed * 11));
		const mph = Math.PI * 2 * (mhz * c + fh(id * 3 + seed * 5));
		return side * (st.tilt * (Math.sin(mph) + .5 * Math.sin(2.3 * mph + 1.1)) + st.steer);
	};
	const fv = new Float32Array(12);
	const finValues = (out = fv) => {
		const c = st.finClock;
		const seed = st.seed;
		out[0] = foldOf(.11);
		out[1] = tiltOf(.11, 1);
		out[2] = foldOf(.37);
		out[3] = tiltOf(.37, -1);
		for (let k = 0; k < 2; k++) {
			const side = k === 0 ? 1 : -1;
			const id = k === 0 ? .31 : .77;
			const phz = lerp$3(.2, .5, fh(side * 3.1 + seed * 7));
			let ang = st.pect + st.wobble * .36 * Math.sin(Math.PI * 2 * (phz * c + (k === 0 ? .2 : .7)));
			ang -= st.whim * .45 * finWhim(id + seed * 3.1, c);
			ang += st.pectTurn * side;
			out[4 + k * 2] = clamp$4((ang + .12) / .42, 0, 1);
			out[5 + k * 2] = st.slow * (.5 - .5 * Math.cos(Math.PI * 2 * st.flap + (k === 0 ? 0 : .4)));
		}
		out[8] = smooth$1(clamp$4(foldOf(.63) * .6 + st.fold * .4, 0, 1), .7, 1);
		out[9] = out[10] = out[11] = 0;
		return out;
	};
	const finParams = (out) => {
		finValues(out);
	};
	const posePose = (time) => {
		const full = lod.levels[0].object.visible;
		const c = st.finClock;
		const seed = st.seed;
		const v = finValues();
		const fl = st.flut * .6 + st.flag * .18;
		poseMedian(dorsal, v[0], v[1], c + seed * 10, fl);
		dorsal.fin.commit();
		poseMedian(anal, v[2], v[3], c * .9 + seed * 7, fl * .8);
		anal.fin.commit();
		poseCaudal$3(caudal, v[8], c * 1.1 + seed * 5, fl * .5);
		caudal.fin.commit();
		poseAdipose(adipose, c + seed, fl * .5);
		adipose.commit();
		pect.forEach((p, k) => {
			posePaired$1(p, v[4 + k * 2], v[5 + k * 2] * FINLIB_STROKE, c + seed * 3 + k, fl * .5, k * 1.7);
			p.fin.commit();
		});
		if (full) pelv.forEach((p, k) => {
			let open = 1 - foldOf(k === 0 ? .52 : .88) * .9 + st.slow * .25;
			open += .08 * Math.sin(time * 2.2 + k * 2.1 + seed * 9);
			posePaired$1(p, clamp$4(open, 0, 1), .05 * Math.sin(time * 3.1 + k), c + k * .8, fl * .35, k * 2.3);
			p.fin.commit();
		});
		if (full && eyes) for (const e of eyes) {
			const id = seed * 7.13 + (e.side > 0 ? 0 : 3.7);
			const g0 = eyeJump(id, .35 + .85 * fh(id), time);
			const g1 = eyeJump(id + 5.3, .2 + .3 * fh(id + 2), time);
			let fwd = (g0[0] + .3 * g1[0]) * .55;
			let up = (g0[1] + .3 * g1[1]) * .3;
			if (st.look > 0) {
				const dl = camLocal.clone().sub(e.center);
				const sideD = dl.z * e.side;
				const hz = Math.hypot(dl.x, sideD);
				const lw = st.look * smooth$1(sideD / Math.max(dl.length(), 1e-4), 0, .35);
				fwd = lerp$3(fwd, clamp$4(Math.atan2(dl.x, sideD), -.5, .5), lw);
				up = lerp$3(up, clamp$4(Math.atan2(dl.y, hz), -.35, .35), lw);
			}
			const R = eyeR.makeRotationY(e.side * -fwd).multiply(eyeRx.makeRotationX(-e.side * up)).elements;
			const p = e.geo.getAttribute("position");
			const nr = e.geo.getAttribute("normal");
			const pa = p.array;
			const na = nr.array;
			const { local: L, localN: N, center: C } = e;
			for (let i = 0; i < p.count * 3; i += 3) {
				const x = L[i];
				const y = L[i + 1];
				const z = L[i + 2];
				pa[i] = R[0] * x + R[4] * y + R[8] * z + C.x;
				pa[i + 1] = R[1] * x + R[5] * y + R[9] * z + C.y;
				pa[i + 2] = R[2] * x + R[6] * y + R[10] * z + C.z;
				const a = N[i];
				const b = N[i + 1];
				const c2 = N[i + 2];
				na[i] = R[0] * a + R[4] * b + R[8] * c2;
				na[i + 1] = R[1] * a + R[5] * b + R[9] * c2;
				na[i + 2] = R[2] * a + R[6] * b + R[10] * c2;
			}
			p.needsUpdate = true;
			nr.needsUpdate = true;
		}
	};
	posePose(0);
	const mouthMax = .5;
	return {
		root,
		shadows: [],
		detail(on) {
			const l = lod.levels[1];
			if (l) l.distance = on ? loDist : 0;
		},
		uniforms: u,
		shade(_opacity) {},
		swim(phase, amp, bend = 0, time = performance.now() / 1e3) {
			const cyc = phase / (Math.PI * 2);
			const slow = clamp$4(1 - (amp - .04) / .06, 0, 1);
			if (!st.extFlap) {
				st.flap += Math.max(0, cyc - st.lastCyc) * .8 + .004;
				st.slow = slow;
			}
			st.lastCyc = cyc;
			u.uTime.value = time;
			u.uSwim.value.set(cyc, amp, clamp$4(bend * length, -2.5, 2.5), 0);
			if (++st.tick >= st.every) {
				st.tick = 0;
				posePose(time);
			}
		},
		pectoral(cycles, amount = 0, turn = 0) {
			st.extFlap = cycles !== null;
			if (cycles !== null) {
				st.flap = cycles;
				st.slow = amount;
			}
			st.pectTurn = turn;
		},
		finEvery(n) {
			st.every = Math.max(1, Math.round(n));
		},
		lieOnFloor(up) {
			u.uFloor.value = up;
		},
		lookAtViewer(amount) {
			st.look = amount;
		},
		air(_amount) {},
		finMove(clock, tilt, fold, steer, wobble = 0, pect = 0, whim = 0) {
			st.finClock = clock;
			st.tilt = tilt;
			st.fold = fold;
			st.steer = steer;
			st.wobble = wobble;
			st.pect = pect;
			st.whim = whim;
		},
		mouth(open) {
			const k = clamp$4(open / mouthMax, 0, 1);
			u.uMouth.value = mouthMax * Math.pow(k, 2.2);
		},
		mouthMax,
		gill(open) {
			const k = clamp$4(open / .35, 0, 1);
			u.uGill.value = .32 * Math.pow(k, 1.8);
		},
		flutter(clock, amp, flag = 0, seed = 0) {
			st.finClock = clock;
			st.flut = amp;
			st.flag = flag;
		},
		flex(neck, from, to, cBend, head, power = 0) {
			u.uNeck.value.set(neck, from, to, clamp$4(cBend, -6, 6) * length);
			u.uHead.value = head;
			u.uPower.value = power;
		}
	};
}
function tetraStats() {
	const { hi, lo } = bodies$3();
	const tri = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
	const parts = (b) => tri(b.body) + tri(b.gill) + tri(b.mouth);
	return {
		hi: parts(hi),
		lo: parts(lo),
		texture: "2048×640"
	};
}
var SNOUT$2 = .47;
var D_END$2 = .807;
var YC = .06;
var sh = (k) => k.map(([d, y]) => [d, y - YC]);
var deg$2 = THREE.MathUtils.degToRad;
var lerp$2 = THREE.MathUtils.lerp;
var clamp$3 = THREE.MathUtils.clamp;
var v3$2 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
var mx$2 = (d) => SNOUT$2 - d;
var Y_TIP$2 = -.06;
var TOP$2 = curve(sh([
	[0, 0],
	[.003, .0095],
	[.008, .0155],
	[.013, .019],
	[.018, .026],
	[.027, .052],
	[.041, .088],
	[.055, .13],
	[.075, .19],
	[.1, .235],
	[.13, .272],
	[.17, .31],
	[.2, .327],
	[.25, .355],
	[.3, .376],
	[.35, .39],
	[.4, .397],
	[.45, .397],
	[.5, .392],
	[.55, .382],
	[.6, .366],
	[.65, .34],
	[.7, .302],
	[.74, .255],
	[.77, .205],
	[.79, .165],
	[.8, .147],
	[.807, .134]
]));
var BOT$2 = curve(sh([
	[0, 0],
	[.003, -.0095],
	[.008, -.0155],
	[.013, -.019],
	[.019, -.026],
	[.03, -.045],
	[.05, -.073],
	[.075, -.1],
	[.1, -.125],
	[.13, -.148],
	[.16, -.165],
	[.2, -.181],
	[.25, -.205],
	[.3, -.229],
	[.35, -.247],
	[.4, -.259],
	[.45, -.265],
	[.5, -.265],
	[.55, -.258],
	[.6, -.244],
	[.65, -.22],
	[.7, -.18],
	[.74, -.135],
	[.77, -.093],
	[.79, -.062],
	[.8, -.047],
	[.807, -.036]
]));
var HW$2 = curve([
	[0, 0],
	[.004, .014],
	[.01, .02],
	[.016, .0215],
	[.022, .023],
	[.03, .028],
	[.06, .045],
	[.1, .06],
	[.15, .072],
	[.2, .078],
	[.3, .076],
	[.4, .069],
	[.5, .06],
	[.6, .047],
	[.66, .037],
	[.7, .029],
	[.74, .02],
	[.77, .013],
	[.785, .0085],
	[.795, .005],
	[.802, .0021],
	[.805, 7e-4],
	[.807, 0]
]);
var T0$2 = curve([
	[0, .5],
	[.1, .53],
	[.25, .5],
	[.5, .5],
	[.807, .5]
]);
var P_TOP$2 = curve([
	[0, .6],
	[.08, .6],
	[.15, .75],
	[.25, .95],
	[.35, 1.1],
	[.6, 1.15],
	[.807, 1]
]);
var P_BOT$2 = curve([
	[0, .6],
	[.1, .62],
	[.2, .85],
	[.35, 1.05],
	[.6, 1.1],
	[.807, 1]
]);
var MOUTH$3 = {
	corner: .037,
	joint: [.078, -.11499999999999999],
	throat: .075
};
var LIP$2 = curve(sh([
	[0, 0],
	[.01, -.0012],
	[.02, -.0025],
	[.03, -.0042],
	[.037, -.0055]
]));
var EYE$2 = {
	d: .111,
	y: .008000000000000007,
	r: .03
};
sh([
	[.168, .095],
	[.162, .06],
	[.157, .03],
	[.15, 0],
	[.143, -.025],
	[.132, -.05],
	[.11, -.065],
	[.09, -.07]
]);
sh([
	[.188, .1],
	[.212, .075],
	[.224, .045],
	[.222, .01],
	[.212, -.025],
	[.198, -.055],
	[.178, -.088],
	[.14, -.103],
	[.095, -.104]
]);
var GILL_LINES$2 = {
	blue: {
		hinge: [
			[.1604, .0326],
			[.1622, .0159],
			[.1613, -.001],
			[.1589, -.0177],
			[.1556, -.0343],
			[.152, -.0508],
			[.1481, -.0672],
			[.1439, -.0836],
			[.1391, -.0998],
			[.1363, -.1164],
			[.1315, -.1325],
			[.1207, -.1454],
			[.1065, -.1543],
			[.0899, -.1571]
		],
		edge: [
			[.1994, .0441],
			[.2109, .0254],
			[.2203, .0055],
			[.2214, -.016],
			[.2144, -.0369],
			[.2092, -.0584],
			[.2035, -.0797],
			[.1957, -.1003],
			[.1848, -.1194],
			[.1707, -.1363],
			[.1538, -.1505],
			[.1346, -.1611],
			[.1134, -.1672],
			[.0915, -.1674]
		]
	},
	red: {
		hinge: [
			[.1721, .0331],
			[.1688, .017],
			[.1655, 8e-4],
			[.162, -.0153],
			[.1588, -.0315],
			[.1551, -.0475],
			[.1511, -.0635],
			[.1468, -.0794],
			[.1425, -.0953],
			[.1378, -.1111],
			[.1319, -.1265],
			[.1224, -.1399],
			[.1085, -.1484],
			[.0922, -.1507]
		],
		edge: [
			[.1812, .0443],
			[.2006, .0333],
			[.2122, .0132],
			[.223, -.0073],
			[.2238, -.0301],
			[.2173, -.0523],
			[.2092, -.0741],
			[.2001, -.0955],
			[.1897, -.1162],
			[.1759, -.1348],
			[.1577, -.1492],
			[.1364, -.1582],
			[.1134, -.1603],
			[.0907, -.1557]
		]
	},
	turq: {
		hinge: [
			[.1723, .0359],
			[.1688, .0199],
			[.1655, .0039],
			[.1617, -.012],
			[.1576, -.0279],
			[.153, -.0435],
			[.1479, -.0591],
			[.1427, -.0746],
			[.1375, -.0901],
			[.132, -.1055],
			[.1261, -.1208],
			[.1187, -.1354],
			[.1064, -.1459],
			[.0905, -.1493]
		],
		edge: [
			[.2177, .0434],
			[.2255, .0242],
			[.2335, .005],
			[.2334, -.0155],
			[.2251, -.0345],
			[.2157, -.0531],
			[.2057, -.0713],
			[.1946, -.0889],
			[.1826, -.1059],
			[.1695, -.122],
			[.1539, -.1357],
			[.1358, -.1459],
			[.1158, -.1512],
			[.0951, -.1524]
		]
	}
};
var DORSAL_EDGE = curve(sh([
	[.15, .318],
	[.17, .335],
	[.2, .362],
	[.25, .402],
	[.3, .44],
	[.35, .468],
	[.4, .484],
	[.45, .489],
	[.5, .49],
	[.55, .487],
	[.6, .476],
	[.65, .455],
	[.7, .427],
	[.75, .386],
	[.8, .336],
	[.83, .302],
	[.85, .27],
	[.862, .22],
	[.87, .14]
]));
var ANAL_EDGE = curve(sh([
	[.25, -.2],
	[.265, -.225],
	[.3, -.29],
	[.35, -.322],
	[.4, -.343],
	[.45, -.362],
	[.5, -.377],
	[.55, -.379],
	[.6, -.37],
	[.65, -.35],
	[.7, -.319],
	[.75, -.274],
	[.8, -.218],
	[.83, -.18],
	[.85, -.148],
	[.862, -.1],
	[.87, -.04]
]));
var DORSAL_ANG = curve([
	[.17, 50],
	[.3, 56],
	[.45, 57],
	[.6, 52],
	[.72, 50],
	[.795, 56]
]);
var ANAL_ANG = curve([
	[.265, 48],
	[.4, 52],
	[.55, 52],
	[.7, 48],
	[.795, 54]
]);
function sec$2(d) {
	return {
		top: TOP$2(d),
		bot: BOT$2(d),
		hw: Math.max(0, HW$2(d)),
		t0: T0$2(d),
		pt: P_TOP$2(d),
		pb: P_BOT$2(d)
	};
}
function surfZ$2(d, t) {
	const s = sec$2(d);
	const tt = t < s.t0 ? .5 * t / s.t0 : .5 + .5 * (t - s.t0) / (1 - s.t0);
	const p = t < s.t0 ? s.pb : s.pt;
	return s.hw * Math.pow(Math.max(0, Math.sin(Math.PI * clamp$3(tt, 0, 1))), p);
}
function surfZAt$2(d, y) {
	if (d <= 0 || d >= D_END$2) return 0;
	const s = sec$2(d);
	const t = (y - s.bot) / Math.max(1e-6, s.top - s.bot);
	if (t <= 0 || t >= 1) return 0;
	return surfZ$2(d, t);
}
var tAt$2 = (d, y) => (y - BOT$2(d)) / (TOP$2(d) - BOT$2(d));
function seamT$2(d) {
	const s = sec$2(d);
	const h = Math.max(1e-6, s.top - s.bot);
	const c = MOUTH$3.corner;
	const [jd, jy] = MOUTH$3.joint;
	let y;
	if (d <= c) y = LIP$2(d);
	else if (d <= jd) y = lerp$2(LIP$2(c), jy, (d - c) / (jd - c));
	else return lerp$2((jy - BOT$2(jd)) / (TOP$2(jd) - BOT$2(jd)), .45, smooth$1(d, jd, jd + .1));
	return clamp$3((y - s.bot) / h, .05, .95);
}
function jawWeight$2(d, b, lowerCopy) {
	const c = MOUTH$3.corner;
	const jd = MOUTH$3.joint[0];
	if (d < c) {
		const near = lowerCopy || b > 0 ? smooth$1(d, c, c - .014) : 0;
		return b > .25 ? 1 : lerp$2(near, 1, b / .25);
	}
	return smooth$1(b, 0, .3) * (1 - smooth$1(d, jd - .005, jd + .035)) * (d < jd ? 1 : .6 + .4 * (1 - b));
}
function gillInner$2(g) {
	const at = (k, u) => {
		const f = u * (k.length - 1);
		const i = Math.min(k.length - 2, Math.floor(f));
		const w = f - i;
		return [lerp$2(k[i][0], k[i + 1][0], w), lerp$2(k[i][1], k[i + 1][1], w)];
	};
	const N = 14;
	const front = [];
	const back = [];
	for (let i = 0; i <= N; i++) {
		const u = .06 + .8 * (i / N);
		const h = at(g.hinge, u);
		const e = at(g.edge, u);
		front.push([lerp$2(h[0], e[0], .4), lerp$2(h[1], e[1], .4)]);
		back.push([lerp$2(h[0], e[0], .84), lerp$2(h[1], e[1], .84)]);
	}
	return [...front, ...back.reverse()];
}
var TEX$2 = {
	d0: -.03,
	d1: 1.02,
	y0: -.47,
	y1: .45
};
var TEX_W$2 = 2048;
var TEX_H$2 = 1792;
var uvOf$2 = (d, y) => [(d - TEX$2.d0) / (TEX$2.d1 - TEX$2.d0), (y - TEX$2.y0) / (TEX$2.y1 - TEX$2.y0)];
function buildBody$2(cu, cl, nTip, step, gl) {
	const GILL_INNER = gillInner$2(gl);
	const ds = [];
	for (let k = 1; k <= nTip; k++) ds.push(.1 * Math.pow(k / nTip, 2));
	for (let d = .1 + step; d < .806999; d += step) ds.push(d);
	ds.push(D_END$2);
	for (const extra of [MOUTH$3.corner, MOUTH$3.joint[0]]) if (!ds.some((d) => Math.abs(d - extra) < 1e-4)) ds.push(extra);
	ds.sort((a, b) => a - b);
	const pos = [];
	const uv = [];
	const jaw = [];
	const gillMask = [];
	const idx = [];
	const add = (x, y, z, d, w) => {
		pos.push(x, y, z);
		uv.push(...uvOf$2(d, y));
		jaw.push(w);
		gillMask.push(inPoly(GILL_INNER, d, y) ? 1 : 0);
		return pos.length / 3 - 1;
	};
	const C = cu + cl;
	const rings = [];
	const tipUp = add(SNOUT$2, Y_TIP$2, 0, 0, 0);
	const tipLo = add(SNOUT$2, Y_TIP$2, 0, 0, 1);
	const seamInfo = [];
	for (const d of ds) {
		const s = sec$2(d);
		const ts = seamT$2(d);
		const split = d < MOUTH$3.corner - 1e-6;
		const up = [[], []];
		const lo = [[], []];
		for (let side = 0; side < 2; side++) {
			const sg = side === 0 ? 1 : -1;
			for (let j = 0; j <= C; j++) {
				if (side === 1 && (j === 0 || j === C)) {
					if (j === 0) up[1][0] = up[0][0];
					else lo[1][j - cu] = lo[0][j - cu];
					continue;
				}
				let t;
				if (j <= cu) t = ts + (1 - ts) * Math.sin(Math.PI / 2 * (1 - j / cu));
				else t = ts * (1 - Math.sin(Math.PI / 2 * ((j - cu) / cl)));
				const y = s.bot + t * (s.top - s.bot);
				let z = sg * surfZ$2(d, t);
				const near = Math.abs(j - cu);
				const mouthK = 1 - smooth$1(d, MOUTH$3.corner, MOUTH$3.corner + .02);
				if (near <= 1) z *= 1 - mouthK * (near === 0 ? .1 : .03);
				const x = mx$2(d);
				if (j < cu) up[side][j] = add(x, y, z, d, 0);
				else if (j > cu) lo[side][j - cu] = add(x, y, z, d, jawWeight$2(d, (j - cu) / cl, true));
				else {
					up[side][j] = add(x, y, z, d, 0);
					lo[side][0] = split ? add(x, y, z, d, jawWeight$2(d, 0, true)) : up[side][j];
					if (side === 0 && d <= MOUTH$3.throat + 1e-6) seamInfo.push({
						d,
						y,
						z: Math.abs(z)
					});
				}
			}
		}
		rings.push({
			up,
			lo
		});
	}
	const quad = (a, b, c, e) => idx.push(a, b, c, a, c, e);
	const r0 = rings[0];
	for (let side = 0; side < 2; side++) {
		const flip = side === 0;
		for (let j = 0; j < cu; j++) {
			const a = r0.up[side][j];
			const b = r0.up[side][j + 1];
			if (flip) idx.push(tipUp, a, b);
			else idx.push(tipUp, b, a);
		}
		for (let j = 0; j < cl; j++) {
			const a = r0.lo[side][j];
			const b = r0.lo[side][j + 1];
			if (flip) idx.push(tipLo, a, b);
			else idx.push(tipLo, b, a);
		}
	}
	for (let i = 0; i < rings.length - 1; i++) {
		const A = rings[i];
		const B = rings[i + 1];
		for (let side = 0; side < 2; side++) {
			const flip = side === 0;
			const strip = (ca, cb) => {
				for (let j = 0; j < ca.length - 1; j++) if (flip) quad(ca[j], cb[j], cb[j + 1], ca[j + 1]);
				else quad(ca[j], ca[j + 1], cb[j + 1], cb[j]);
			};
			strip(A.up[side], B.up[side]);
			strip(A.lo[side], B.lo[side]);
		}
	}
	const last = rings[rings.length - 1];
	const ringPts = [
		...last.up[0],
		...last.lo[0].slice(1),
		...[...last.lo[1]].reverse().slice(1),
		...[...last.up[1]].reverse().slice(1, -1)
	];
	const cEnd = add(mx$2(D_END$2), (TOP$2(D_END$2) + BOT$2(D_END$2)) / 2, 0, D_END$2, 0);
	for (let j = 0; j < ringPts.length; j++) idx.push(cEnd, ringPts[(j + 1) % ringPts.length], ringPts[j]);
	const body = new THREE.BufferGeometry();
	body.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	body.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
	body.setAttribute("aJaw", new THREE.Float32BufferAttribute(jaw, 1));
	body.setAttribute("aGill", new THREE.Float32BufferAttribute(gillMask, 1));
	body.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0), 1));
	body.setIndex(idx);
	body.computeVertexNormals();
	{
		const nr = body.getAttribute("normal");
		const p = body.getAttribute("position");
		for (let i = 0; i < nr.count; i++) {
			const k = smooth$1(SNOUT$2 - p.getX(i), .72, D_END$2);
			if (k <= 0) continue;
			const nx = nr.getX(i) * (1 - k);
			const ny = nr.getY(i) * (1 - .6 * k);
			const nz = nr.getZ(i);
			const l = Math.hypot(nx, ny, nz) || 1;
			nr.setXYZ(i, nx / l, ny / l, nz / l);
		}
	}
	return {
		body,
		mouth: buildMouth$2(seamInfo),
		gill: buildGill$2(gl)
	};
}
function buildMouth$2(seam) {
	const K = 10;
	const pos = [];
	const jaw = [];
	const idx = [];
	const rows = [];
	const cornerSeam = seam.filter((s) => s.d <= MOUTH$3.corner + 1e-6).slice(-1)[0];
	const stations = [{
		d: 0,
		y: Y_TIP$2,
		z: 0
	}, ...seam.filter((s) => s.d <= MOUTH$3.corner + 1e-6)];
	for (let k = 1; k <= 5; k++) {
		const u = k / 5;
		const d = MOUTH$3.corner + (MOUTH$3.throat - MOUTH$3.corner) * u;
		stations.push({
			d,
			y: cornerSeam.y + .004 * u,
			z: cornerSeam.z * Math.sqrt(1 - u) * .7
		});
	}
	for (const st of stations) {
		const s = sec$2(Math.max(st.d, 1e-4));
		const u = st.d > MOUTH$3.corner + 1e-6 ? (st.d - MOUTH$3.corner) / (MOUTH$3.throat - MOUTH$3.corner) : 0;
		const fade = smooth$1(st.d, 0, .012);
		const hp = Math.min(.5 * (s.top - st.y), .012) * fade * (1 - u * .6);
		const hf = Math.min(.5 * (st.y - s.bot), .012) * fade * (1 - u * .6);
		const row = [];
		for (let part = 0; part < 2; part++) {
			const roof = part === 0;
			for (let k = 0; k <= K; k++) {
				const a = Math.PI * k / K;
				const side = roof ? Math.cos(a) : -Math.cos(a);
				const z = st.z * side * (k === 0 || k === K ? 1 : .94);
				const y = roof ? st.y + hp * Math.sin(a) : st.y - hf * Math.sin(a);
				pos.push(mx$2(st.d), y, z);
				jaw.push(roof ? 0 : jawWeight$2(Math.max(st.d, 1e-4), .6 * Math.sin(a), true));
				row.push(pos.length / 3 - 1);
			}
		}
		rows.push(row);
	}
	for (let i = 0; i < rows.length - 1; i++) {
		const A = rows[i];
		const B = rows[i + 1];
		for (let k = 0; k < 21; k++) {
			if (k === K) continue;
			idx.push(A[k], B[k], B[k + 1], A[k], B[k + 1], A[k + 1]);
		}
	}
	const L = rows[rows.length - 1];
	const st = stations[stations.length - 1];
	pos.push(mx$2(st.d) - .003, st.y, 0);
	jaw.push(0);
	const c = pos.length / 3 - 1;
	for (let k = 0; k < 21; k++) if (k !== K) idx.push(L[k], c, L[k + 1]);
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute("aJaw", new THREE.Float32BufferAttribute(jaw, 1));
	g.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(3), 1));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}
function buildGill$2(gl) {
	const NA = 9;
	const NB = 18;
	const pick = (keys, b) => {
		const f = b * (keys.length - 1);
		const i = Math.min(keys.length - 2, Math.floor(f));
		const u = f - i;
		const p0 = keys[Math.max(0, i - 1)];
		const p1 = keys[i];
		const p2 = keys[i + 1];
		const p3 = keys[Math.min(keys.length - 1, i + 2)];
		const cr = (a, b2, c, e) => .5 * (2 * b2 + (-a + c) * u + (2 * a - 5 * b2 + 4 * c - e) * u * u + (-a + 3 * b2 - 3 * c + e) * u * u * u);
		return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
	};
	const pos = [];
	const uv = [];
	const fw = [];
	const idx = [];
	for (let side = 0; side < 2; side++) {
		const sg = side === 0 ? 1 : -1;
		const base = pos.length / 3;
		const cols = 11;
		for (let ib = 0; ib <= NB; ib++) {
			const b = ib / NB;
			const h = pick(gl.hinge, b);
			const e = pick(gl.edge, b);
			const span = Math.hypot(e[0] - h[0], e[1] - h[1]);
			for (let ia = 0; ia <= 10; ia++) {
				const rim = ia === 10;
				const a = rim ? 1 : ia / NA;
				const d = h[0] + (e[0] - h[0]) * a;
				let y = h[1] + (e[1] - h[1]) * a;
				const s = sec$2(d);
				y = clamp$3(y, s.bot + .008, s.top - .006);
				const z0 = surfZAt$2(d, y);
				const lift = rim ? 3e-4 : 6e-4 + .0018 * Math.pow(a, .7);
				pos.push(mx$2(d), y, sg * (z0 + lift));
				uv.push(...uvOf$2(d, y));
				fw.push(span * a);
			}
		}
		for (let ib = 0; ib < NB; ib++) for (let ia = 0; ia < 10; ia++) {
			const a = base + ib * cols + ia;
			const b = a + 1;
			const c = a + cols + 1;
			const e = a + cols;
			if (sg > 0) idx.push(a, b, c, a, c, e);
			else idx.push(a, c, b, a, e, c);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
	g.setAttribute("aFw", new THREE.Float32BufferAttribute(fw, 1));
	g.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(7), 1));
	g.setAttribute("aGill", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0), 1));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}
function rimFin(name, dir, d0, d1, n, angK, edge, spines, seg) {
	const rays = [];
	const ds = [];
	const ang = [];
	for (let i = 0; i < n; i++) {
		const u = i / (n - 1);
		const d = d0 + (d1 - d0) * (u * (1.12 - .12 * u));
		const yb = (dir > 0 ? TOP$2(d) : BOT$2(d)) - dir * .003;
		const a = deg$2(angK(d));
		let l = .01;
		while (l < .3) {
			const pd = d + l * Math.cos(a);
			if (dir * (yb + dir * l * Math.sin(a) - edge(pd)) >= 0) break;
			l += .001;
		}
		rays.push({
			base: v3$2(mx$2(d), yb, 0),
			len: Math.max(.016, l)
		});
		ds.push(d);
		ang.push(a);
	}
	return {
		fin: new Fin({
			name,
			rays,
			seg,
			branched: [spines, n - 1],
			notch: .035
		}),
		dir,
		d: ds,
		ang
	};
}
function poseRim$2(m, fold, tilt, t, flut, ribAmp, ribPhase, ribWaves) {
	const { fin, dir } = m;
	const n = fin.n;
	const seg = fin.seg;
	const edge = dir > 0 ? TOP$2 : BOT$2;
	const lie = smooth$1(fold, .45, 1);
	const tip = v3$2();
	const p = v3$2();
	const q = v3$2();
	for (let i = 0; i < n; i++) {
		const ray = fin.o.rays[i];
		const b = ray.base;
		const lay = (s, out) => {
			const dd = m.d[i] + ray.len * s * .97;
			const clear = .0015 + .003 * (1 - i / (n - 1)) * Math.min(1, s * 3);
			const ye = dd < D_END$2 ? edge(dd) : edge(D_END$2) + (dd - D_END$2) * (dir > 0 ? -.35 : .35);
			out.set(mx$2(dd), ye + dir * clear, 0);
		};
		lay(1, tip);
		const foldAng = Math.atan2(dir * (tip.y - b.y), b.x - tip.x);
		const fi = clamp$3(fold * 1.15 - .15 * (i / (n - 1)), 0, 1);
		const ang = lerp$2(m.ang[i], foldAng, fi);
		const ribW = ribAmp * (.55 + .45 * (i / (n - 1))) * (1 - .7 * lie);
		const ribS = Math.sin(ribPhase - Math.PI * 2 * ribWaves * (i / (n - 1)));
		for (let r = 0; r <= seg; r++) {
			const s = r / seg;
			const bend = .1 * s * s;
			const l = ray.len * s;
			p.set(b.x - l * Math.cos(ang - bend), b.y + dir * l * Math.sin(ang - bend), 0);
			if (lie > 0) {
				lay(s, q);
				p.lerp(q, lie * smooth$1(fi, .5, 1));
			}
			const h = (p.y - b.y) * dir;
			const wv = flut * Math.pow(s, 1.5) * (.4 + .6 * (i / (n - 1))) * Math.sin(t * 6 - i * .3 - s * 2.2);
			const zt = h * Math.sin(tilt) + (wv * (1 - .8 * lie) + ribW * Math.pow(s, 1.3) * ribS);
			p.y = b.y + dir * h * Math.cos(tilt);
			p.z = zt;
			fin.P[i][r].copy(p);
		}
		fin.normal[i].set(0, -Math.sin(tilt) * dir, Math.cos(tilt));
	}
}
var TAIL_YC$2 = -.009999999999999995;
function caudalFin$2() {
	const xb = .795;
	const rays = [];
	const ang = [];
	const baseY = [];
	const proc = [];
	[.785, .795].forEach((d, i) => {
		rays.push({
			base: v3$2(mx$2(d), TOP$2(d) - .002, 0),
			len: .05 + i * .03
		});
		ang.push(deg$2(30 - i * 4));
		baseY.push(TOP$2(d) - .002);
		proc.push(true);
	});
	const N = 16;
	for (let i = 0; i < N; i++) {
		const k = 1 - 2 * i / 15;
		const len = .192 - .01 * k * k + .004 * k;
		const y = TAIL_YC$2 + k * .068;
		rays.push({
			base: v3$2(mx$2(xb), y, 0),
			len
		});
		ang.push(deg$2(31) * k + deg$2(1.5));
		baseY.push(y);
		proc.push(false);
	}
	[.795, .785].forEach((d, i) => {
		rays.push({
			base: v3$2(mx$2(d), BOT$2(d) + .002, 0),
			len: .075 - i * .03
		});
		ang.push(-deg$2(26 + i * 4));
		baseY.push(BOT$2(d) + .002);
		proc.push(true);
	});
	return {
		fin: new Fin({
			name: "caudal",
			rays,
			seg: 14,
			branched: [3, 16],
			notch: .03
		}),
		ang,
		baseY,
		procurrent: proc
	};
}
function poseCaudal$2(c, close, t, flut, cup) {
	const { fin } = c;
	const n = fin.n;
	const seg = fin.seg;
	for (let i = 0; i < n; i++) {
		const ray = fin.o.rays[i];
		const proc = c.procurrent[i];
		const ci = clamp$3(close * 1.1 - .1 * Math.abs(i - (n - 1) / 2) / ((n - 1) / 2), 0, 1);
		const a = proc ? c.ang[i] * (1 - .5 * ci) : c.ang[i] * (1 - .8 * ci);
		const by = proc ? c.baseY[i] : TAIL_YC$2 + (c.baseY[i] - TAIL_YC$2) * (1 - .3 * ci);
		const bx = ray.base.x;
		const k = (c.baseY[i] - TAIL_YC$2) / .07;
		for (let r = 0; r <= seg; r++) {
			const s = r / seg;
			const l = ray.len * s;
			const sweep = .05 * k * s * s * (1 - .7 * ci);
			const x = bx - l * Math.cos(a + sweep);
			const y = by + l * Math.sin(a + sweep);
			const wv = flut * s * s * Math.sin(t * 5 - s * 2.4 - i * .12) + cup * s * s * (Math.abs(k) - .4);
			fin.P[i][r].set(x, y, wv);
		}
		fin.normal[i].set(0, 0, 1);
	}
}
function surfPoint$2(d, t, side) {
	const s = sec$2(d);
	const y = s.bot + t * (s.top - s.bot);
	const z = side * surfZ$2(d, t);
	const e = .001;
	const p = v3$2(mx$2(d), y, z);
	const s2 = sec$2(d + e);
	const pd = v3$2(mx$2(d + e), s2.bot + t * (s2.top - s2.bot), side * surfZ$2(d + e, t));
	const t2 = Math.min(1, t + e * 4);
	const pt = v3$2(mx$2(d), s.bot + t2 * (s.top - s.bot), side * surfZ$2(d, t2));
	const du = pd.sub(p);
	const dt = pt.sub(p);
	const n = v3$2().crossVectors(du, dt).normalize();
	if (n.z * side < 0) n.negate();
	return {
		p,
		n
	};
}
function pairedFin(name, side, a, b, lens, psiC, psiO, betaC, betaO, lag, seg, notch = .04) {
	const n = lens.length;
	const A = surfPoint$2(a[0], a[1], side);
	const B = surfPoint$2(b[0], b[1], side);
	const rays = lens.map((len, i) => {
		const u = i / (n - 1);
		const sp = surfPoint$2(lerp$2(a[0], b[0], u), lerp$2(a[1], b[1], u), side);
		return {
			base: sp.p.addScaledVector(sp.n, -.0015),
			len
		};
	});
	const nrm = A.n.clone().add(B.n).normalize();
	const axis = B.p.clone().sub(A.p).normalize();
	const back = v3$2(-1, 0, 0);
	const u = back.addScaledVector(nrm, -back.dot(nrm)).normalize();
	const v = axis.clone().addScaledVector(u, -axis.dot(u)).normalize();
	const fin = new Fin({
		name,
		rays,
		seg,
		branched: [1, n - 1],
		notch
	});
	const sgn = v3$2().crossVectors(axis, u).dot(nrm) >= 0 ? 1 : -1;
	return {
		fin,
		side,
		axis,
		u,
		v,
		nrm,
		psiC: psiC.map(deg$2),
		psiO: psiO.map(deg$2),
		betaC: deg$2(betaC),
		betaO: deg$2(betaO),
		lag,
		sgn
	};
}
function keepOutside$2(p, side, clear) {
	const z = surfZAt$2(SNOUT$2 - p.x, p.y);
	if (z <= 0) return;
	if (p.z * side < z + clear) p.z = side * (z + clear);
}
function posePaired(f, open, stroke, t, flut, phase, droop = .05) {
	const { fin } = f;
	const n = fin.n;
	const seg = fin.seg;
	const q = new THREE.Quaternion();
	const dir = v3$2();
	const p = v3$2();
	const nn = v3$2();
	for (let i = 0; i < n; i++) {
		const ray = fin.o.rays[i];
		const oi = clamp$3((open - f.lag * (i / (n - 1))) / (1 - f.lag), 0, 1);
		const e = oi * oi * (3 - 2 * oi);
		const psi = lerp$2(f.psiC[i], f.psiO[i], e);
		const beta = Math.max(0, lerp$2(f.betaC, f.betaO, open) + stroke(i, e));
		q.setFromAxisAngle(f.axis, f.sgn * beta);
		dir.copy(f.u).multiplyScalar(Math.cos(psi)).addScaledVector(f.v, Math.sin(psi)).applyQuaternion(q);
		nn.crossVectors(dir, f.axis).normalize();
		if (nn.dot(f.nrm) < 0) nn.negate();
		fin.normal[i].copy(nn);
		for (let r = 0; r <= seg; r++) {
			const s = r / seg;
			const l = ray.len * s;
			p.copy(ray.base).addScaledVector(dir, l).addScaledVector(nn, -droop * ray.len * s * s * (.3 + .7 * e));
			p.addScaledVector(nn, flut * s * s * Math.sin(t * 7 + phase - s * 2 - i * .35));
			keepOutside$2(p, f.side, .0016 + .001 * (1 - i / (n - 1)));
			fin.P[i][r].copy(p);
		}
	}
}
function pelvicFin$2(side, a, b, lens, psiO, psiC, betaO, betaC) {
	const n = lens.length;
	return {
		fin: new Fin({
			name: "pelvic",
			rays: lens.map((len, i) => {
				const u = i / (n - 1);
				const sp = surfPoint$2(lerp$2(a[0], b[0], u), lerp$2(a[1], b[1], u), side);
				return {
					base: sp.p.addScaledVector(sp.n, -.001),
					len
				};
			}),
			seg: 12,
			branched: [1, n - 1],
			notch: .04
		}),
		side,
		psiO: psiO.map(deg$2),
		psiC: psiC.map(deg$2),
		betaO: deg$2(betaO),
		betaC: deg$2(betaC)
	};
}
function posePelvic$2(f, open, trail, t, flut, phase) {
	const { fin, side } = f;
	const n = fin.n;
	const seg = fin.seg;
	const e = open * open * (3 - 2 * open);
	const beta = lerp$2(f.betaC, f.betaO, e);
	const cb = Math.cos(beta);
	const sb = Math.sin(beta);
	const p = v3$2();
	for (let i = 0; i < n; i++) {
		const ray = fin.o.rays[i];
		const psi0 = lerp$2(f.psiC[i], f.psiO[i], clamp$3(e * 1.1 - .1 * (i / (n - 1)), 0, 1));
		p.copy(ray.base);
		const step = ray.len / seg;
		fin.P[i][0].copy(p);
		for (let r = 1; r <= seg; r++) {
			const s = r / seg;
			const psi = psi0 - trail * s * s * (1 + .6 * (1 - i / (n - 1))) + flut * s * s * Math.sin(t * 5 + phase - s * 2.5 - i * .4) * 8;
			p.x -= step * Math.cos(psi);
			p.y -= step * Math.sin(psi) * cb;
			p.z += side * step * Math.sin(psi) * sb;
			keepOutside$2(p, side, .0015);
			fin.P[i][r].copy(p);
		}
		fin.normal[i].set(0, sb, side * cb);
	}
}
function buildEye$2(side, ws = 40, hs = 28) {
	const g = new THREE.SphereGeometry(1, ws, hs);
	const pos = g.getAttribute("position");
	const zs = surfZAt$2(EYE$2.d, EYE$2.y);
	const center = v3$2(mx$2(EYE$2.d), EYE$2.y, side * (zs - .18 * EYE$2.r));
	const P = new Float32Array(pos.count * 3);
	const local = new Float32Array(pos.count * 3);
	const polar = new Float32Array(pos.count * 4);
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const y = pos.getY(i);
		const z = pos.getZ(i);
		const lx = x * EYE$2.r;
		const ly = z * EYE$2.r;
		const lz = y * EYE$2.r * .5;
		local[i * 3] = lx;
		local[i * 3 + 1] = ly;
		local[i * 3 + 2] = lz * side;
		polar[i * 4] = Math.acos(clamp$3(y, -1, 1)) / Math.PI;
		polar[i * 4 + 1] = Math.atan2(z, x);
		polar[i * 4 + 2] = .5 - x * .5;
		polar[i * 4 + 3] = .5 + z * .5;
		P[i * 3] = center.x + lx;
		P[i * 3 + 1] = center.y + ly;
		P[i * 3 + 2] = center.z + lz * side;
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage));
	geo.setAttribute("aEye", new THREE.BufferAttribute(polar, 4));
	geo.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(pos.count).fill(6), 1));
	const index = g.getIndex();
	const ia = Array.from(index.array);
	if (side > 0) for (let i = 0; i < ia.length; i += 3) [ia[i + 1], ia[i + 2]] = [ia[i + 2], ia[i + 1]];
	geo.setIndex(ia);
	geo.computeVertexNormals();
	geo.boundingSphere = new THREE.Sphere(v3$2(0, 0, 0), 1);
	g.dispose();
	return {
		geo,
		local,
		localN: Float32Array.from(geo.getAttribute("normal").array),
		center,
		side
	};
}
function paintBody$2(strain, W, H) {
	const col = document.createElement("canvas");
	col.width = W;
	col.height = H;
	const msk = document.createElement("canvas");
	msk.width = W;
	msk.height = H;
	const g = col.getContext("2d");
	const m = msk.getContext("2d");
	const img = g.createImageData(W, H);
	const mimg = m.createImageData(W, H);
	const base = strain === "blue" ? [
		.12,
		.55,
		.85
	] : strain === "turq" ? [
		.6,
		.12,
		.1
	] : [
		.85,
		.16,
		.06
	];
	const fin = strain === "blue" ? [
		.08,
		.3,
		.85
	] : [
		.8,
		.12,
		.05
	];
	for (let py = 0; py < H; py++) {
		const y = TEX$2.y1 - (py + .5) / H * (TEX$2.y1 - TEX$2.y0);
		for (let px = 0; px < W; px++) {
			const d = TEX$2.d0 + (px + .5) / W * (TEX$2.d1 - TEX$2.d0);
			const dc = clamp$3(d, 0, D_END$2);
			const inBody = d >= 0 && d <= D_END$2 && y <= TOP$2(dc) && y >= BOT$2(dc);
			const k = (py * W + px) * 4;
			const sc = .012;
			const row = Math.floor(y / sc + 200);
			const cx = (d + row % 2 * sc * .5) / sc;
			const fx = cx - Math.floor(cx);
			const fy = y / sc + 200 - row;
			const r = Math.hypot((1 - fx) * 1.1, (fy - .5) * 1.25);
			const edge = smooth$1(Math.abs(r - .62), .14, 0);
			const c = inBody ? base : fin;
			const sh2 = inBody ? 1 - .18 * edge : 1;
			img.data[k] = c[0] * sh2 * 255;
			img.data[k + 1] = c[1] * sh2 * 255;
			img.data[k + 2] = c[2] * sh2 * 255;
			let a = 1;
			if (!inBody) {
				const top = y > 0;
				const e = top ? DORSAL_EDGE(d) : ANAL_EDGE(d);
				const b = top ? TOP$2(dc) : BOT$2(dc);
				const u = clamp$3((y - b) / (e - b + 1e-6), 0, 1);
				a = d > D_END$2 ? .45 : lerp$2(.92, .55, u);
			}
			img.data[k + 3] = a * 255;
			mimg.data[k] = (strain === "blue" ? .85 : strain === "turq" ? .4 : .05) * 255;
			mimg.data[k + 1] = 0;
			mimg.data[k + 2] = 0;
			mimg.data[k + 3] = 255;
		}
	}
	g.putImageData(img, 0, 0);
	m.putImageData(mimg, 0, 0);
	return {
		col,
		msk
	};
}
function sharedUniforms$2() {
	return {
		uTime: { value: 0 },
		uMouth: { value: 0 },
		uGill: { value: 0 },
		uFloor: { value: 0 },
		uHead: { value: 1 },
		uPower: { value: 0 },
		uLam: { value: 1.15 },
		uSwim: { value: new THREE.Vector4() },
		uNeck: { value: new THREE.Vector4() },
		uEnv: { value: new THREE.Vector3(.012, -.13, .27) },
		uJaw: { value: new THREE.Vector2(mx$2(MOUTH$3.joint[0]), MOUTH$3.joint[1]) },
		uBars: { value: 0 }
	};
}
function inject$2(mat, u, defs, extra, frag, key) {
	mat.onBeforeCompile = (sh2) => {
		Object.assign(sh2.uniforms, u, extra);
		const d = defs.map((x) => `#define ${x}\n`).join("");
		sh2.vertexShader = d + VERT_HEAD + sh2.vertexShader.replace("#include <beginnormal_vertex>", VERT_BODY).replace("#include <begin_vertex>", "vec3 transformed = fishP;");
		sh2.fragmentShader = d + frag(sh2.fragmentShader);
	};
	mat.customProgramCacheKey = () => "discus-" + key + "-" + defs.join("-");
}
var BARS_GLSL = `
float discusBars(float d, float y) {
  float b = 0.0;
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float c = 0.111 + fi * 0.0832 + 0.007 * sin(y * 31.0 + fi * 1.7) + 0.003 * sin(y * 83.0 + fi * 4.1);
    float w = (i == 0 ? 0.03 : (i == 8 ? 0.024 : 0.025)) * (0.8 + 0.2 * sin(y * 17.0 + fi * 2.3));
    float k = (i == 0 ? 1.0 : (i == 8 ? 0.9 : 0.75)) * (0.72 + 0.28 * sin(y * 9.0 + fi * 1.3));
    b = max(b, k * (1.0 - smoothstep(w * 0.3, w, abs(d - c))));
  }
  return b;
}
`;
var TEXD = `vec2(${TEX$2.d0.toFixed(4)} + vMapUv.x * ${(TEX$2.d1 - TEX$2.d0).toFixed(4)}, ${TEX$2.y0.toFixed(4)} + vMapUv.y * ${(TEX$2.y1 - TEX$2.y0).toFixed(4)})`;
var IRIDESCENCE$2 = { value: .3 };
var IRI_GLSL$2 = `
{
  vec3 E = (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) / max(diffuseColor.rgb, vec3(0.04));
  float e = dot(E, vec3(0.2126, 0.7152, 0.0722));
  vec3 V = normalize(vViewPosition);
  float nv = clamp(dot(normal, V), 0.0, 1.0);
  vec3 iriA = vec3(0.2, 0.85, 1.0);
  vec3 iriB = vec3(0.05, 0.35, 1.0);
  vec3 iriC = vec3(0.22, 0.08, 0.7);
  vec3 iri = nv > 0.5 ? mix(iriB, iriA, (nv - 0.5) / 0.5) : mix(iriC, iriB, nv / 0.5);
  iri = mix(diffuseColor.rgb, iri, 0.45);
  float sparkle = clamp(dot(diffuseColor.rgb, vec3(0.3, 0.5, 0.2)) * 1.6 - 0.15, 0.35, 1.3);
  totalEmissiveRadiance += tMask.r * iri * (0.3 + 0.7 * pow(nv, 0.6)) * sparkle * e * uIri * (1.0 - 0.6 * barK);
}
`;
var SKIN$2 = {
	roughness: .68,
	metalness: 0,
	clearcoat: 0,
	clearcoatRoughness: .4,
	specularIntensity: .3
};
function bodyMaterial$2(u, tex, kind, strain) {
	const mat = new THREE.MeshPhysicalMaterial({
		map: tex.col,
		bumpMap: tex.bmp ?? null,
		bumpScale: .9,
		...SKIN$2
	});
	const barCol = { value: strain === "blue" ? new THREE.Vector3(.26, .3, .42) : new THREE.Vector3(.3, .13, .1) };
	inject$2(mat, u, kind === "body" ? ["T_BODY", "T_JAW"] : ["T_GILL"], {
		uMask: { value: tex.msk },
		uIri: IRIDESCENCE$2,
		uLift: { value: strain === "blue" ? .035 : .06 },
		uBarCol: barCol
	}, (fs) => `uniform sampler2D uMask;\nuniform float uIri;\nuniform float uBars;\nuniform float uLift;\nuniform vec3 uBarCol;\nvarying vec3 vModel;\nvarying vec3 vObjN;\n#ifdef T_BODY\nvarying float vGill;\n#endif\n` + BARS_GLSL + fs.replace("#include <map_fragment>", `
float topK = smoothstep(0.6, 0.95, abs(normalize(vObjN).y));
vec4 sampledDiffuseColor = texture2D(map, vMapUv, topK * 3.0);
diffuseColor.rgb *= sampledDiffuseColor.rgb;
vec4 tMask = texture2D(uMask, vMapUv, topK * 3.0);
vec2 dyT = ${TEXD};
float barK = uBars * discusBars(dyT.x, dyT.y);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uBarCol, barK);
#ifdef T_BODY
if (vGill > 0.02) {
  float fil = 0.5 + 0.5 * sin(vModel.y * 700.0 + sin(vModel.x * 260.0) * 2.0);
  vec3 gill = mix(vec3(0.3, 0.02, 0.03), vec3(0.72, 0.08, 0.08), fil);
  diffuseColor.rgb = mix(diffuseColor.rgb, gill, smoothstep(0.02, 0.6, vGill));
}
#endif
`).replace("#include <aomap_fragment>", "#include <aomap_fragment>\n" + IRI_GLSL$2 + "totalEmissiveRadiance += diffuseColor.rgb * uLift * (1.0 - 0.7 * barK);\n"), "body");
	return mat;
}
function mouthMaterial$2(u) {
	const mat = new THREE.MeshStandardMaterial({
		color: new THREE.Color(.32, .14, .15),
		roughness: .9,
		side: THREE.DoubleSide
	});
	inject$2(mat, u, ["T_JAW"], {}, (fs) => "varying vec3 vModel;\n" + fs.replace("#include <color_fragment>", `#include <color_fragment>
diffuseColor.rgb *= mix(1.0, 0.25, smoothstep(0.006, ${(MOUTH$3.throat * .8).toFixed(3)}, ${SNOUT$2.toFixed(3)} - vModel.x));`), "mouth");
	return mat;
}
function eyeMaterial$2(u, photo) {
	const mat = new THREE.MeshPhysicalMaterial({
		color: 16777215,
		roughness: .3,
		clearcoat: 1,
		clearcoatRoughness: .03,
		metalness: 0
	});
	inject$2(mat, u, photo ? ["T_EYE", "T_EYEPHOTO"] : ["T_EYE"], { uEyeTex: { value: photo } }, (fs) => "varying vec3 vModel;\nvarying vec4 vEye;\nuniform sampler2D uEyeTex;\n" + fs.replace("#include <color_fragment>", `#include <color_fragment>
{
  float r = vEye.x;
  float a = vEye.y;
  float pupil = 0.17;
  float iris = 0.36;
  vec3 c;
  if (r < pupil) c = vec3(0.004);
  else if (r < iris) {
    float k = (r - pupil) / (iris - pupil);
    float rad = 0.5 + 0.5 * sin(a * 41.0 + sin(a * 13.0) * 2.0);
    c = mix(vec3(0.62, 0.05, 0.03), vec3(0.85, 0.12, 0.06), rad * 0.6 + 0.2 * k);
    c = mix(vec3(0.75, 0.55, 0.25), c, smoothstep(0.0, 0.12, k));
    c *= mix(1.0, 0.55, smoothstep(0.82, 1.0, k));
  } else c = vec3(0.32, 0.36, 0.4);
#ifdef T_EYEPHOTO
  if (r < 0.5) c = texture2D(uEyeTex, vEye.zw).rgb;
#endif
  diffuseColor.rgb = c;
}
`), "eye");
	return mat;
}
function finMaterial$2(u, tex, strain, tint, pect = null) {
	const mat = new THREE.MeshPhysicalMaterial({
		color: pect ? new THREE.Color(1, 1, 1) : tint,
		map: pect ?? tex?.col ?? null,
		bumpMap: tex?.bmp ?? null,
		bumpScale: .9,
		...tex ? SKIN$2 : {
			roughness: .35,
			metalness: 0,
			clearcoat: .2,
			clearcoatRoughness: .25,
			specularIntensity: .7
		},
		transparent: true,
		side: THREE.DoubleSide,
		depthWrite: false
	});
	const barCol = { value: strain === "blue" ? new THREE.Vector3(.26, .3, .42) : new THREE.Vector3(.3, .13, .1) };
	inject$2(mat, u, pect ? ["T_FIN", "FIN_PECT"] : ["T_FIN"], {
		uMask: { value: tex?.msk ?? null },
		uIri: IRIDESCENCE$2,
		uLift: { value: strain === "blue" ? .035 : .06 },
		uBarCol: barCol,
		uPectTint: { value: tint }
	}, (fs) => "uniform sampler2D uMask;\nuniform float uIri;\nuniform float uBars;\nuniform float uLift;\nuniform vec3 uBarCol;\nuniform vec3 uPectTint;\nvarying vec3 vModel;\nvarying vec4 vFin;\nvarying vec4 vFinGap;\n" + BARS_GLSL + fs.replace("#include <color_fragment>", `#include <color_fragment>
vec4 tMask = vec4(0.0);
float barK = 0.0;
{
  float rc = vFin.x, s = vFin.y;
  float gap = max(vFinGap.x, 1e-5);
  float ri = floor(rc + 0.5);
  float w = mix(0.0016, 0.0007, s);
  float line = 0.0;
  bool br = ri >= vFin.z && ri <= vFin.w;
  float sb = 0.45;
  float off = br && s > sb ? 0.16 * (s - sb) / (1.0 - sb) : 0.0;
  for (int k = -1; k <= 1; k += 2) {
    float dr = abs(rc - (ri + float(k) * off)) * gap;
    float aa = fwidth(rc) * gap + 1e-5;
    line = max(line, 1.0 - smoothstep(w * (off > 0.0 ? 0.75 : 1.0) - aa * 0.5, w + aa, dr));
  }
  float segm = abs(fract(s * 18.0 + ri * 0.37) - 0.5);
  line *= 0.8 + 0.35 * smoothstep(0.42, 0.5, segm);
  line *= clamp(w * 2.0 / (fwidth(rc) * gap + 1e-6), 0.25, 1.0);
  vec3 V = normalize(vViewPosition);
  float nv = abs(dot(normalize(vNormal), V));
  float fres = pow(1.0 - nv, 2.0);
#if defined(FIN_PECT)
  vec4 tp = texture2D(map, vMapUv);
  float a0 = 1.0 - pow(1.0 - tp.a, 1.7);
  float inFin = smoothstep(0.01, 0.07, texture2D(map, vMapUv, 2.0).a);
  float a = clamp(max(a0, inFin * (0.34 + 0.14 * fres + 0.12 * vFinGap.y + 0.14 * (1.0 - smoothstep(0.0, 0.3, s)))), 0.0, 1.0);
  diffuseColor.rgb = (tp.rgb * a0 + uPectTint * 0.55 * (a - a0)) / max(a, 1e-3);
  diffuseColor.a = a * 0.5;
  float rib = line * inFin;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.9, 0.86), 0.4 * rib);
  diffuseColor.a = max(diffuseColor.a, 0.45 * rib);
#elif defined(USE_MAP)
  float a0 = 1.0 - pow(1.0 - diffuseColor.a, 1.7);
  tMask = texture2D(uMask, vMapUv);
  vec2 dyT = ${TEXD};
  barK = uBars * discusBars(dyT.x, dyT.y) * (1.0 - 0.6 * s);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uBarCol, barK);
  float root = 1.0 - smoothstep(0.0, 0.15, s);
  {
    float dd = ${SNOUT$2.toFixed(3)} - vModel.x;
    float tailRoot = (1.0 - smoothstep(${.8170000000000001.toFixed(3)}, ${.8520000000000001.toFixed(3)}, dd)) * step(${.787.toFixed(3)}, dd);
    tailRoot *= 1.0 - smoothstep(0.075, 0.11, abs(vModel.y - ${TAIL_YC$2.toFixed(3)}));
    root = max(root, tailRoot);  }
  line *= 1.0 - root;
  float memb = a0 * (0.82 + 0.18 * line) + 0.08 * fres + 0.1 * vFinGap.y;
  diffuseColor.rgb *= mix(0.9 + 0.25 * line, 1.0, root);
  diffuseColor.a = mix(clamp(max(memb, 0.6 * line * a0), 0.0, 1.0), 1.0, root);
#else
  float memb = 0.38 + 0.14 * fres + 0.12 * vFinGap.y + 0.16 * (1.0 - smoothstep(0.0, 0.3, s));
  diffuseColor.rgb = mix(diffuseColor.rgb * 0.55, vec3(0.92, 0.9, 0.86), 0.4 * line);
  diffuseColor.a *= max(memb, 0.6 * line);
#endif
}
`).replace("#include <aomap_fragment>", "#include <aomap_fragment>\n#if defined(USE_MAP) && !defined(FIN_PECT)\n" + IRI_GLSL$2 + "totalEmissiveRadiance += diffuseColor.rgb * uLift * (1.0 - 0.7 * barK);\n#endif\n"), "fin" + (pect ? "-pect" : tex ? "-map" : ""));
	return mat;
}
var photoTex$2 = {};
var paintTex$2 = {};
async function loadDiscus(strain, url) {
	if (photoTex$2[strain]) return;
	const tl = new THREE.TextureLoader();
	const load = async (f, srgb) => {
		const t = await tl.loadAsync(url(f));
		t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
		t.anisotropy = 8;
		t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
		return t;
	};
	try {
		const p = `discus_${strain}_`;
		const [col, msk, bmp, eye, pect] = await Promise.all([
			load(p + "body.webp", true),
			load(p + "mask.webp", false),
			load(p + "bump.webp", false),
			load(p + "eye.webp", true),
			load(p + "pect.webp", true).catch(() => void 0)
		]);
		photoTex$2[strain] = {
			col,
			msk,
			bmp,
			eye,
			pect
		};
	} catch {}
}
var CLAY$2 = typeof location !== "undefined" && new URLSearchParams(location.search).has("clay");
function textures$2(strain) {
	if (CLAY$2) return clayTex$2();
	const p = photoTex$2[strain];
	if (p) return p;
	const c = paintTex$2[strain];
	if (c) return c;
	const { col, msk } = paintBody$2(strain, 1024, 896);
	const mk = (cv, srgb) => {
		const t = new THREE.CanvasTexture(cv);
		t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
		t.anisotropy = 8;
		t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
		return t;
	};
	return paintTex$2[strain] = {
		col: mk(col, true),
		msk: mk(msk, false)
	};
}
var clayCache$2 = null;
function clayTex$2() {
	if (clayCache$2) return clayCache$2;
	const cv = document.createElement("canvas");
	cv.width = cv.height = 4;
	const g = cv.getContext("2d");
	g.fillStyle = "rgb(150,150,150)";
	g.fillRect(0, 0, 4, 4);
	const mk = new THREE.CanvasTexture(cv);
	mk.colorSpace = THREE.SRGBColorSpace;
	const cm = document.createElement("canvas");
	cm.width = cm.height = 4;
	return clayCache$2 = {
		col: mk,
		msk: new THREE.CanvasTexture(cm)
	};
}
var geoCache$2 = {};
function bodies$2(strain) {
	const gl = GILL_LINES$2[strain];
	return geoCache$2[strain] ??= {
		hi: buildBody$2(28, 24, 34, .005, gl),
		lo: buildBody$2(12, 10, 14, .013, gl)
	};
}
var PECT_A = [.221, -.004];
var PECT_B = [.238, -.062];
var PECT_EDGE = [
	[.335, .103],
	[.352, .111],
	[.368, .113],
	[.384, .108],
	[.397, .095],
	[.405, .074],
	[.408, .049],
	[.406, .023],
	[.399, -.003],
	[.388, -.027],
	[.374, -.048],
	[.357, -.064],
	[.338, -.074],
	[.318, -.078],
	[.298, -.077],
	[.279, -.073],
	[.262, -.068]
];
var PECT_N = 18;
var PECT_EXT = 1.04;
function pectFin$1(side) {
	const n = PECT_N;
	const a = [PECT_A[0], tAt$2(PECT_A[0], PECT_A[1] - YC)];
	const b = [PECT_B[0], tAt$2(PECT_B[0], PECT_B[1] - YC)];
	const L = [0];
	for (let k = 1; k < PECT_EDGE.length; k++) L.push(L[k - 1] + Math.hypot(PECT_EDGE[k][0] - PECT_EDGE[k - 1][0], PECT_EDGE[k][1] - PECT_EDGE[k - 1][1]));
	const tips = [];
	for (let i = 0; i < n; i++) {
		const t = L[L.length - 1] * i / 17;
		let k = 1;
		while (k < L.length - 1 && L[k] < t) k++;
		const f = (t - L[k - 1]) / (L[k] - L[k - 1] || 1);
		tips.push([lerp$2(PECT_EDGE[k - 1][0], PECT_EDGE[k][0], f), lerp$2(PECT_EDGE[k - 1][1], PECT_EDGE[k][1], f)]);
	}
	const zeros = new Array(n).fill(0);
	const tmp = pairedFin("pectoral", side, a, b, new Array(n).fill(.1), zeros, zeros, 3, 30, .3, 10);
	const lens = [];
	const psiO = [];
	const psiC = [];
	tips.forEach(([d, h], i) => {
		const base = tmp.fin.o.rays[i].base;
		const vec = v3$2(mx$2(d) - base.x, h - YC - base.y, 0);
		const cu = vec.dot(tmp.u);
		const cv = vec.dot(tmp.v);
		lens.push(Math.hypot(cu, cv) * PECT_EXT);
		psiO.push(Math.atan2(cv, cu) * 180 / Math.PI);
		psiC.push(lerp$2(-8, 10, i / 17));
	});
	return pairedFin("pectoral", side, a, b, lens, psiC, psiO, 3, 30, .3, 10, 0);
}
function makeFins$2() {
	return {
		dorsal: rimFin("dorsal", 1, .168, .797, 40, DORSAL_ANG, DORSAL_EDGE, 9, 12),
		anal: rimFin("anal", -1, .262, .797, 36, ANAL_ANG, ANAL_EDGE, 8, 12),
		caudal: caudalFin$2(),
		pect: [1, -1].map((side) => pectFin$1(side)),
		pelv: [1, -1].map((side) => pelvicFin$2(side, [.176, .045], [.19, .012], [
			.29,
			.215,
			.165,
			.128,
			.1,
			.078
		], [
			66,
			60,
			54,
			49,
			45,
			41
		], [
			14,
			12,
			11,
			10,
			9,
			8
		], 20, 5))
	};
}
function finUV$2(fin) {
	const pos = fin.geo.getAttribute("position");
	const uv = new Float32Array(pos.count * 2);
	for (let i = 0; i < pos.count; i++) {
		const [a, b] = uvOf$2(SNOUT$2 - pos.getX(i), pos.getY(i));
		uv[i * 2] = a;
		uv[i * 2 + 1] = b;
	}
	fin.geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}
function pelvicUV(pelv, anal) {
	const ap = anal.geo.getAttribute("uv");
	const rowsA = anal.seg + 1;
	const rowsP = pelv.seg + 1;
	const cols = 2 * pelv.n - 1;
	const uv = new Float32Array(cols * rowsP * 2);
	for (let c = 0; c < cols; c++) for (let r = 0; r < rowsP; r++) {
		const ac = 4 + Math.round(c / (cols - 1) * 14);
		const ar = Math.round(r / (rowsP - 1) * (rowsA - 1));
		const k = ac * rowsA + ar;
		uv[(c * rowsP + r) * 2] = ap.getX(k);
		uv[(c * rowsP + r) * 2 + 1] = ap.getY(k);
	}
	pelv.geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}
function pectFlat(f) {
	const { fin } = f;
	const n = fin.n;
	const rows = fin.seg + 1;
	const b0 = fin.o.rays[0].base;
	const ray = (i, s) => {
		const r = fin.o.rays[i];
		const d = r.base.clone().sub(b0);
		const l = r.len / PECT_EXT * s;
		return [d.dot(f.u) + l * Math.cos(f.psiO[i]), d.dot(f.v) + l * Math.sin(f.psiO[i])];
	};
	const pts = [];
	for (let c = 0; c < 2 * n - 1; c++) for (let r = 0; r < rows; r++) {
		const s = r / (rows - 1) * PECT_EXT;
		if (c % 2 === 0) pts.push(ray(c / 2, s));
		else {
			const a = ray((c - 1) / 2, s);
			const b = ray((c + 1) / 2, s);
			pts.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
		}
	}
	const edge = [];
	for (let i = 0; i < n; i++) edge.push(ray(i, 0), ray(i, 1));
	const xs = edge.map((p) => p[0]);
	const ys = edge.map((p) => p[1]);
	const x0 = Math.min(...xs);
	const x1 = Math.max(...xs);
	const y0 = Math.min(...ys);
	const y1 = Math.max(...ys);
	const S = Math.max(x1 - x0, y1 - y0) * 1.2;
	return {
		pts,
		frame: {
			x0: (x0 + x1) / 2 - S / 2,
			y0: (y0 + y1) / 2 - S / 2,
			S
		},
		ray
	};
}
function pectUV$1(f) {
	const { pts, frame } = pectFlat(f);
	const uv = new Float32Array(pts.length * 2);
	pts.forEach(([x, y], k) => {
		uv[k * 2] = (x - frame.x0) / frame.S;
		uv[k * 2 + 1] = 1 - (y - frame.y0) / frame.S;
	});
	f.fin.geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}
function buildDiscus(length, strain) {
	const u = sharedUniforms$2();
	const tex = textures$2(strain);
	const matBody = bodyMaterial$2(u, tex, "body", strain);
	const matGill = bodyMaterial$2(u, tex, "gill", strain);
	const matMouth = mouthMaterial$2(u);
	const matEye = eyeMaterial$2(u, photoTex$2[strain]?.eye ?? null);
	const matFin = finMaterial$2(u, tex, strain, new THREE.Color(1, 1, 1));
	const matPect = finMaterial$2(u, null, strain, strain === "blue" ? new THREE.Color(.35, .62, 1) : strain === "turq" ? new THREE.Color(.85, .4, .35) : new THREE.Color(1, .45, .3), CLAY$2 ? null : photoTex$2[strain]?.pect ?? null);
	const { dorsal, anal, caudal, pect, pelv } = makeFins$2();
	poseRim$2(dorsal, 0, 0, 0, 0, 0, 0, 1);
	dorsal.fin.commit(true);
	poseRim$2(anal, 0, 0, 0, 0, 0, 0, 1);
	anal.fin.commit(true);
	poseCaudal$2(caudal, 0, 0, 0, 0);
	caudal.fin.commit(true);
	for (const f of [
		dorsal.fin,
		anal.fin,
		caudal.fin
	]) finUV$2(f);
	for (const p of pect) {
		posePaired(p, 1, () => 0, 0, 0, 0);
		p.fin.commit(true);
	}
	for (const p of pect) pectUV$1(p);
	for (const p of pelv) {
		posePelvic$2(p, 1, 0, 0, 0, 0);
		p.fin.commit(true);
	}
	for (const p of pelv) pelvicUV(p.fin, anal.fin);
	const eyes = [1, -1].map((s) => buildEye$2(s));
	const eyesLo = [1, -1].map((s) => buildEye$2(s, 12, 8));
	const root = new THREE.Group();
	const lod = new THREE.LOD();
	lod.scale.setScalar(length);
	lod.rotation.y = -Math.PI / 2;
	const camWorld = v3$2();
	const camLocal = v3$2(0, 0, 3);
	const inv = new THREE.Matrix4();
	const level = (b, light) => {
		const g = new THREE.Group();
		const body = new THREE.Mesh(b.body, matBody);
		g.add(body);
		g.add(new THREE.Mesh(b.gill, matGill));
		if (!light) g.add(new THREE.Mesh(b.mouth, matMouth));
		for (const e of light ? eyesLo : eyes) g.add(new THREE.Mesh(e.geo, matEye));
		for (const f of [
			dorsal.fin,
			anal.fin,
			caudal.fin,
			...pelv.map((p) => p.fin)
		]) {
			const m = new THREE.Mesh(f.geo, matFin);
			m.renderOrder = 1;
			g.add(m);
		}
		for (const p of pect) {
			const m = new THREE.Mesh(p.fin.geo, matPect);
			m.renderOrder = 2;
			g.add(m);
		}
		g.traverse((o) => o.frustumCulled = false);
		body.onBeforeRender = (_r, _s, cam) => {
			camWorld.setFromMatrixPosition(cam.matrixWorld);
			body.updateWorldMatrix(true, false);
			camLocal.copy(camWorld).applyMatrix4(inv.copy(body.matrixWorld).invert());
		};
		return g;
	};
	const { hi, lo } = bodies$2(strain);
	lod.addLevel(level(hi, false), 0);
	const loDist = 2.5 + length * 8;
	lod.addLevel(level(lo, true), loDist, .1);
	root.add(lod);
	const st = {
		finClock: 0,
		tilt: 0,
		fold: .2,
		steer: 0,
		wobble: 0,
		pect: .15,
		whim: 0,
		flut: 0,
		flag: 0,
		seed: Math.random(),
		look: 0,
		every: 1,
		tick: Math.floor(Math.random() * 30),
		time: 0,
		lastTime: -1,
		ribAmp: .006,
		ribPhase: Math.random() * 10,
		ribWaves: 1.6,
		ribExt: false,
		pectPh: [Math.random() * 10, Math.random() * 10],
		pectAmp: .35,
		pectOpen: .75,
		pectExt: false,
		pectTurn: 0,
		pelvOpen: .85,
		cup: 0,
		trail: .15
	};
	const eyeR = new THREE.Matrix4();
	const eyeRx = new THREE.Matrix4();
	const posePose = (time) => {
		const full = lod.levels[0].object.visible;
		const c = st.finClock;
		const seed = st.seed;
		const foldOf = (id) => {
			const fhz = lerp$2(.2, .5, fh(id * 9 + seed * 13));
			const fph = Math.PI * 2 * (fhz * c + fh(id * 4 + seed * 3));
			let f = st.fold + st.wobble * (.7 * Math.sin(fph) + .3 * Math.sin(2.6 * fph + .8));
			f += st.whim * finWhim(id + seed * 3.1, c);
			return clamp$3(f, 0, 1);
		};
		const tiltOf = (id, side) => {
			const mhz = lerp$2(.3, .6, fh(id * 5 + seed * 11));
			const mph = Math.PI * 2 * (mhz * c + fh(id * 3 + seed * 5));
			return side * (st.tilt * (Math.sin(mph) + .5 * Math.sin(2.3 * mph + 1.1)) + st.steer);
		};
		const fl = st.flut * .6 + st.flag * .18;
		poseRim$2(dorsal, foldOf(.11), tiltOf(.11, 1), c + seed * 10, fl, st.ribAmp, st.ribPhase, st.ribWaves);
		dorsal.fin.commit();
		poseRim$2(anal, foldOf(.37), tiltOf(.37, -1), c * .9 + seed * 7, fl * .8, st.ribAmp, st.ribPhase + Math.PI, st.ribWaves);
		anal.fin.commit();
		const tailFold = clamp$3(foldOf(.63) * .6 + st.fold * .4, 0, 1);
		poseCaudal$2(caudal, smooth$1(tailFold, .65, 1), c * 1.1 + seed * 5, fl * .6, st.cup);
		caudal.fin.commit();
		pect.forEach((p, k) => {
			const ph = st.pectPh[k];
			const amp = st.pectAmp;
			posePaired(p, clamp$3(st.pectOpen + st.pectTurn * p.side, .05, 1), (i) => amp * (.5 + .5 * Math.sin(ph - i / (p.fin.n - 1) * 4.62)) - amp * .35, c + seed * 3 + k, fl * .35, k * 1.7, .07);
			p.fin.commit();
		});
		if (full) pelv.forEach((p, k) => {
			posePelvic$2(p, clamp$3(st.pelvOpen + .06 * Math.sin(time * 1.3 + k * 2.1 + seed * 9), 0, 1), st.trail, c + k * .8, fl * .5, k * 2.3);
			p.fin.commit();
		});
		if (full) for (const e of eyes) {
			const id = seed * 7.13 + (e.side > 0 ? 0 : 3.7);
			const g0 = eyeJump(id, .5 + 1.2 * fh(id), time);
			const g1 = eyeJump(id + 5.3, .25 + .4 * fh(id + 2), time);
			let fwd = (g0[0] + .3 * g1[0]) * .5;
			let up = (g0[1] + .3 * g1[1]) * .28;
			if (st.look > 0) {
				const dl = camLocal.clone().sub(e.center);
				const sideD = dl.z * e.side;
				const hz = Math.hypot(dl.x, sideD);
				const lw = st.look * smooth$1(sideD / Math.max(dl.length(), 1e-4), 0, .35);
				fwd = lerp$2(fwd, clamp$3(Math.atan2(dl.x, sideD), -.5, .5), lw);
				up = lerp$2(up, clamp$3(Math.atan2(dl.y, hz), -.35, .35), lw);
			}
			const R = eyeR.makeRotationY(e.side * -fwd).multiply(eyeRx.makeRotationX(-e.side * up)).elements;
			const pa2 = e.geo.getAttribute("position");
			const nr = e.geo.getAttribute("normal");
			const P = pa2.array;
			const N2 = nr.array;
			const { local: L, localN: N, center: C } = e;
			for (let i = 0; i < pa2.count * 3; i += 3) {
				const x = L[i];
				const y = L[i + 1];
				const z = L[i + 2];
				P[i] = R[0] * x + R[4] * y + R[8] * z + C.x;
				P[i + 1] = R[1] * x + R[5] * y + R[9] * z + C.y;
				P[i + 2] = R[2] * x + R[6] * y + R[10] * z + C.z;
				const a = N[i];
				const b = N[i + 1];
				const c2 = N[i + 2];
				N2[i] = R[0] * a + R[4] * b + R[8] * c2;
				N2[i + 1] = R[1] * a + R[5] * b + R[9] * c2;
				N2[i + 2] = R[2] * a + R[6] * b + R[10] * c2;
			}
			pa2.needsUpdate = true;
			nr.needsUpdate = true;
		}
	};
	posePose(0);
	const mouthMax = .45;
	return {
		root,
		shadows: [],
		detail(on) {
			const l = lod.levels[1];
			if (l) l.distance = on ? loDist : 0;
		},
		uniforms: u,
		shade(_opacity) {},
		swim(phase, amp, bend = 0, time = performance.now() / 1e3) {
			const cyc = phase / (Math.PI * 2);
			const dt = st.lastTime < 0 ? 0 : clamp$3(time - st.lastTime, 0, .1);
			st.lastTime = time;
			if (!st.pectExt) {
				st.pectPh[0] += dt * Math.PI * 2 * 2.5;
				st.pectPh[1] += dt * Math.PI * 2 * 2.5;
			}
			if (!st.ribExt) st.ribPhase += dt * Math.PI * 2 * 1.2;
			u.uTime.value = time;
			u.uSwim.value.set(cyc, amp, clamp$3(bend * length, -1.6, 1.6), 0);
			if (++st.tick >= st.every) {
				st.tick = 0;
				posePose(time);
			}
		},
		pectoral(phL, phR = 0, amp = .35, open = .75, turn = 0) {
			st.pectTurn = turn;
			st.pectExt = phL !== null;
			if (phL !== null) {
				st.pectPh[0] = phL;
				st.pectPh[1] = phR;
			}
			st.pectAmp = amp;
			st.pectOpen = open;
		},
		ribbon(amp, phase, waves = 1.6) {
			st.ribAmp = amp;
			st.ribExt = phase !== null;
			if (phase !== null) st.ribPhase = phase;
			st.ribWaves = waves;
		},
		pelvic(open, trail = .15, cup = 0) {
			st.pelvOpen = open;
			st.trail = trail;
			st.cup = cup;
		},
		bars(v) {
			u.uBars.value = clamp$3(v, 0, 1);
		},
		finEvery(n) {
			st.every = Math.max(1, Math.round(n));
		},
		lieOnFloor(up) {
			u.uFloor.value = up;
		},
		lookAtViewer(amount) {
			st.look = amount;
		},
		air(_amount) {},
		finMove(clock, tilt, fold, steer, wobble = 0, pect = 0, whim = 0) {
			st.finClock = clock;
			st.tilt = tilt;
			st.fold = fold;
			st.steer = steer;
			st.wobble = wobble;
			st.whim = whim;
			if (!st.pectExt) st.pectOpen = clamp$3(.55 + pect * 1.2, .15, 1);
		},
		mouth(open) {
			u.uMouth.value = clamp$3(open, 0, mouthMax);
		},
		mouthMax,
		gill(open) {
			u.uGill.value = clamp$3(open, 0, .32);
		},
		flutter(clock, amp, flag = 0, seed = 0) {
			st.finClock = clock;
			st.flut = amp;
			st.flag = flag;
		},
		flex(neck, from, to, cBend, head, power = 0) {
			u.uNeck.value.set(neck, from, to, clamp$3(cBend, -4, 4) * length);
			u.uHead.value = head;
			u.uPower.value = power;
		}
	};
}
function discusStats() {
	const { hi, lo } = bodies$2("blue");
	const tri = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
	const parts = (b) => tri(b.body) + tri(b.gill) + tri(b.mouth);
	return {
		hi: parts(hi),
		lo: parts(lo),
		texture: `${TEX_W$2}×${TEX_H$2}`
	};
}
var SNOUT$1 = .47;
var D_END$1 = .82;
var deg$1 = THREE.MathUtils.degToRad;
var lerp$1 = THREE.MathUtils.lerp;
var clamp$2 = THREE.MathUtils.clamp;
var v3$1 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
var mx$1 = (d) => SNOUT$1 - d;
var Y_TIP$1 = 0;
var TOP_M = curve([
	[0, 0],
	[.005, .008],
	[.01, .0134],
	[.02, .0199],
	[.03, .0251],
	[.04, .0315],
	[.05, .0361],
	[.07, .0438],
	[.1, .0529],
	[.13, .0626],
	[.15, .0697],
	[.17, .0762],
	[.2, .0839],
	[.23, .0898],
	[.26, .093],
	[.3, .0956],
	[.34, .0975],
	[.37, .0995],
	[.395, .103],
	[.43, .1015],
	[.47, .097],
	[.51, .09],
	[.55, .081],
	[.58, .072],
	[.6, .0665],
	[.65, .0585],
	[.7, .0535],
	[.75, .0484],
	[.78, .0471],
	[.8, .048],
	[.82, .05]
]);
var BOT_M = curve([
	[0, 0],
	[.005, -.016],
	[.01, -.026],
	[.02, -.0299],
	[.03, -.039],
	[.04, -.0474],
	[.05, -.0525],
	[.07, -.0603],
	[.1, -.0739],
	[.13, -.0817],
	[.15, -.0855],
	[.17, -.0895],
	[.2, -.092],
	[.25, -.0945],
	[.3, -.0965],
	[.35, -.0975],
	[.4, -.0975],
	[.45, -.097],
	[.5, -.0965],
	[.535, -.0955],
	[.56, -.092],
	[.6, -.084],
	[.65, -.071],
	[.7, -.054],
	[.72, -.044],
	[.74, -.034],
	[.76, -.0298],
	[.78, -.032],
	[.8, -.0355],
	[.82, -.039]
]);
var HW$1 = curve([
	[0, 0],
	[.005, .0075],
	[.01, .0115],
	[.02, .016],
	[.04, .022],
	[.06, .027],
	[.09, .032],
	[.12, .0355],
	[.16, .0385],
	[.22, .041],
	[.3, .042],
	[.38, .041],
	[.46, .038],
	[.54, .0335],
	[.62, .027],
	[.68, .0215],
	[.72, .0165],
	[.76, .011],
	[.79, .0065],
	[.805, .0033],
	[.815, .0011],
	[.82, 0]
]);
var T0$1 = curve([
	[0, .5],
	[.1, .48],
	[.3, .45],
	[.6, .47],
	[.82, .5]
]);
var P_TOP$1 = curve([
	[0, .6],
	[.08, .62],
	[.2, .78],
	[.4, .9],
	[.6, 1],
	[.82, 1]
]);
var P_BOT$1 = curve([
	[0, .6],
	[.1, .6],
	[.2, .66],
	[.4, .72],
	[.6, .92],
	[.82, 1]
]);
var MOUTH_M = {
	corner: .045,
	joint: [.056, -.042],
	throat: .075
};
var LIP_M = curve([
	[0, 0],
	[.01, -.008],
	[.02, -.012],
	[.03, -.0155],
	[.04, -.0205],
	[.045, -.024]
]);
var EYE_M = {
	d: .0735,
	y: .0085,
	r: .0215
};
var TOP_F = curve([
	[0, 0],
	[.005, .0098],
	[.01, .0166],
	[.02, .0234],
	[.03, .0277],
	[.04, .0338],
	[.05, .0363],
	[.07, .0443],
	[.1, .0559],
	[.13, .0652],
	[.15, .0713],
	[.17, .0774],
	[.2, .0848],
	[.23, .0897],
	[.26, .0922],
	[.3, .094],
	[.34, .094],
	[.37, .0928],
	[.4, .0918],
	[.42, .0922],
	[.45, .0863],
	[.5, .077],
	[.55, .0668],
	[.6, .058],
	[.65, .0502],
	[.7, .0436],
	[.75, .0378],
	[.78, .0365],
	[.8, .0395],
	[.82, .043]
]);
var BOT_F = curve([
	[0, 0],
	[.005, -.0098],
	[.01, -.0166],
	[.02, -.0264],
	[.03, -.0338],
	[.04, -.0412],
	[.05, -.0467],
	[.07, -.0565],
	[.1, -.0682],
	[.13, -.0756],
	[.15, -.0805],
	[.17, -.0854],
	[.2, -.0934],
	[.25, -.1015],
	[.3, -.1064],
	[.35, -.1083],
	[.4, -.109],
	[.45, -.1045],
	[.5, -.1],
	[.547, -.099],
	[.6, -.082],
	[.65, -.064],
	[.68, -.055],
	[.7, -.0505],
	[.73, -.0465],
	[.75, -.0432],
	[.78, -.0433],
	[.8, -.0446],
	[.82, -.046]
]);
var MOUTH_F = {
	corner: .045,
	joint: [.058, -.036],
	throat: .075
};
var LIP_F = curve([
	[0, 0],
	[.01, -.0045],
	[.02, -.0076],
	[.03, -.0103],
	[.04, -.0152],
	[.045, -.0183]
]);
var FORMS = {
	male: {
		top: TOP_M,
		bot: BOT_M,
		mouth: MOUTH_M,
		lip: LIP_M,
		eye: EYE_M,
		caudal: {
			mid: .107,
			up: .103,
			lo: .109,
			aUp: 31.5,
			aLo: 27.3
		}
	},
	female: {
		top: TOP_F,
		bot: BOT_F,
		mouth: MOUTH_F,
		lip: LIP_F,
		eye: {
			d: .0833,
			y: .0081,
			r: .0242
		},
		caudal: {
			mid: .109,
			up: .096,
			lo: .101,
			aUp: 23.6,
			aLo: 25.1
		}
	}
};
var FORM_SEX = "male";
var TOP$1 = TOP_M;
var BOT$1 = BOT_M;
var MOUTH$2 = MOUTH_M;
var LIP$1 = LIP_M;
var EYE$1 = EYE_M;
var CAUDAL$1 = FORMS.male.caudal;
var TAIL_YC$1 = (TOP$1(D_END$1) + BOT$1(D_END$1)) / 2;
function useForm(sex) {
	if (sex === FORM_SEX) return;
	const f = FORMS[sex];
	FORM_SEX = sex;
	TOP$1 = f.top;
	BOT$1 = f.bot;
	MOUTH$2 = f.mouth;
	LIP$1 = f.lip;
	EYE$1 = f.eye;
	CAUDAL$1 = f.caudal;
	TAIL_YC$1 = (TOP$1(D_END$1) + BOT$1(D_END$1)) / 2;
}
var GILL_LINES$1 = {
	male: {
		hinge: [
			[.107, .0419],
			[.1103, .0334],
			[.1137, .0249],
			[.117, .0164],
			[.1203, .0078],
			[.1226, -.001],
			[.1228, -.0101],
			[.1215, -.0192],
			[.1194, -.0281],
			[.1167, -.0368],
			[.1134, -.0453],
			[.1096, -.0536],
			[.103, -.0597],
			[.0943, -.0625]
		],
		edge: [
			[.1357, .0502],
			[.1502, .0422],
			[.1624, .031],
			[.1718, .0175],
			[.179, .0025],
			[.1839, -.0133],
			[.1852, -.0297],
			[.1804, -.0454],
			[.1694, -.0576],
			[.1548, -.0654],
			[.1391, -.0706],
			[.1227, -.0726],
			[.1064, -.0699],
			[.0909, -.0643]
		]
	},
	female: {
		hinge: [
			[.1348, .0291],
			[.1343, .0207],
			[.133, .0124],
			[.1312, .0042],
			[.1306, -.0042],
			[.1299, -.0125],
			[.1275, -.0206],
			[.1242, -.0283],
			[.1199, -.0355],
			[.1141, -.0416],
			[.1071, -.0463],
			[.0993, -.0494],
			[.0911, -.0509],
			[.0827, -.0509]
		],
		edge: [
			[.1606, .0429],
			[.1696, .0329],
			[.1772, .0219],
			[.1834, .01],
			[.1877, -.0027],
			[.1891, -.016],
			[.1873, -.0292],
			[.1826, -.0418],
			[.1752, -.0529],
			[.1653, -.0619],
			[.1536, -.0683],
			[.1406, -.0714],
			[.1272, -.071],
			[.1141, -.0683]
		]
	}
};
var FINS$1 = {
	female: {
		dorsal: {
			d0: .415,
			d1: .51,
			tips: [
				[.517, .191],
				[.53, .182],
				[.539, .169],
				[.549, .155],
				[.557, .141],
				[.565, .127],
				[.572, .112],
				[.578, .097],
				[.582, .081],
				[.58, .065]
			]
		},
		anal: {
			d0: .547,
			d1: .675,
			tips: [
				[.749, -.17],
				[.749, -.159],
				[.746, -.148],
				[.742, -.138],
				[.738, -.127],
				[.734, -.117],
				[.731, -.106],
				[.729, -.095],
				[.732, -.084],
				[.732, -.073],
				[.73, -.062],
				[.724, -.052]
			]
		},
		pect: [],
		pelv: [],
		pectTips: [
			[.303, -.137],
			[.302, -.134],
			[.301, -.131],
			[.3, -.128],
			[.302, -.125],
			[.304, -.122],
			[.305, -.119],
			[.304, -.116],
			[.303, -.113],
			[.302, -.11],
			[.301, -.106],
			[.301, -.103],
			[.3, -.1]
		],
		pelvTips: [
			[.5, -.181],
			[.503, -.171],
			[.507, -.162],
			[.509, -.152],
			[.508, -.141],
			[.507, -.131],
			[.504, -.121],
			[.5, -.112],
			[.495, -.103]
		],
		pectBeta: 25,
		pelvBeta: 25,
		pectShape: {
			twist: 30,
			flare: 10,
			cup: 6
		}
	},
	male: {
		dorsal: {
			d0: .395,
			d1: .565,
			tips: [
				[.565, .19],
				[.581, .184],
				[.582, .171],
				[.578, .152],
				[.575, .13],
				[.58, .115],
				[.596, .104],
				[.606, .088],
				[.6, .08],
				[.585, .075]
			]
		},
		anal: {
			d0: .54,
			d1: .73,
			tips: [
				[.62, -.14],
				[.678, -.162],
				[.8, -.178],
				[.838, -.185],
				[.826, -.155],
				[.795, -.128],
				[.755, -.09],
				[.78, -.076],
				[.798, -.058],
				[.786, -.05],
				[.766, -.043],
				[.75, -.039]
			]
		},
		pect: [],
		pelv: [],
		pectTips: [
			[.298, -.205],
			[.292, -.204],
			[.286, -.203],
			[.28, -.203],
			[.274, -.201],
			[.268, -.2],
			[.262, -.198],
			[.256, -.197],
			[.25, -.196],
			[.244, -.195],
			[.238, -.193],
			[.232, -.191],
			[.226, -.189]
		],
		pelvTips: [
			[.484, -.174],
			[.488, -.166],
			[.492, -.159],
			[.493, -.151],
			[.494, -.142],
			[.496, -.134],
			[.496, -.125],
			[.495, -.117],
			[.493, -.109]
		],
		pectBeta: 25,
		pelvBeta: 25,
		pectShape: {
			twist: 38,
			flare: -28,
			cup: 18
		},
		pectImg: true
	}
};
function sec$1(d) {
	return {
		top: TOP$1(d),
		bot: BOT$1(d),
		hw: Math.max(0, HW$1(d)),
		t0: T0$1(d),
		pt: P_TOP$1(d),
		pb: P_BOT$1(d)
	};
}
function surfZ$1(d, t) {
	const s = sec$1(d);
	const tt = t < s.t0 ? .5 * t / s.t0 : .5 + .5 * (t - s.t0) / (1 - s.t0);
	const p = t < s.t0 ? s.pb : s.pt;
	return s.hw * Math.pow(Math.max(0, Math.sin(Math.PI * clamp$2(tt, 0, 1))), p);
}
function surfZAt$1(d, y) {
	if (d <= 0 || d >= D_END$1) return 0;
	const s = sec$1(d);
	const t = (y - s.bot) / Math.max(1e-6, s.top - s.bot);
	if (t <= 0 || t >= 1) return 0;
	return surfZ$1(d, t);
}
var tAt$1 = (d, y) => (y - BOT$1(d)) / (TOP$1(d) - BOT$1(d));
function seamT$1(d) {
	const s = sec$1(d);
	const h = Math.max(1e-6, s.top - s.bot);
	const c = MOUTH$2.corner;
	const [jd, jy] = MOUTH$2.joint;
	let y;
	if (d <= c) y = LIP$1(d);
	else if (d <= jd) y = lerp$1(LIP$1(c), jy, (d - c) / (jd - c));
	else return lerp$1((jy - BOT$1(jd)) / (TOP$1(jd) - BOT$1(jd)), .45, smooth$1(d, jd, jd + .1));
	return clamp$2((y - s.bot) / h, .05, .95);
}
function jawWeight$1(d, b, lowerCopy) {
	const c = MOUTH$2.corner;
	const jd = MOUTH$2.joint[0];
	if (d < c) {
		const near = lowerCopy || b > 0 ? smooth$1(d, c, c - .014) : 0;
		return b > .25 ? 1 : lerp$1(near, 1, b / .25);
	}
	return smooth$1(b, 0, .3) * (1 - smooth$1(d, jd - .005, jd + .035)) * (d < jd ? 1 : .6 + .4 * (1 - b));
}
function gillInner$1(g) {
	const at = (k, u) => {
		const f = u * (k.length - 1);
		const i = Math.min(k.length - 2, Math.floor(f));
		const w = f - i;
		return [lerp$1(k[i][0], k[i + 1][0], w), lerp$1(k[i][1], k[i + 1][1], w)];
	};
	const N = 14;
	const front = [];
	const back = [];
	for (let i = 0; i <= N; i++) {
		const u = .06 + .56 * (i / N);
		const h = at(g.hinge, u);
		const e = at(g.edge, u);
		front.push([lerp$1(h[0], e[0], .4), lerp$1(h[1], e[1], .4)]);
		back.push([lerp$1(h[0], e[0], .84), lerp$1(h[1], e[1], .84)]);
	}
	return [...front, ...back.reverse()];
}
var TEX$1 = {
	d0: -.02,
	d1: 1.02,
	y0: -.29,
	y1: .27
};
var TEX_W$1 = 2048;
var TEX_H$1 = 1104;
var uvOf$1 = (d, y) => [(d - TEX$1.d0) / (TEX$1.d1 - TEX$1.d0), (y - TEX$1.y0) / (TEX$1.y1 - TEX$1.y0)];
function buildBody$1(cu, cl, nTip, step, gl) {
	const GILL_INNER = gillInner$1(gl);
	const ds = [];
	for (let k = 1; k <= nTip; k++) ds.push(.1 * Math.pow(k / nTip, 2));
	for (let d = .1 + step; d < .8199989999999999; d += step) ds.push(d);
	ds.push(D_END$1);
	for (const extra of [MOUTH$2.corner, MOUTH$2.joint[0]]) if (!ds.some((d) => Math.abs(d - extra) < 1e-4)) ds.push(extra);
	ds.sort((a, b) => a - b);
	const pos = [];
	const uv = [];
	const jaw = [];
	const gillMask = [];
	const idx = [];
	const add = (x, y, z, d, w) => {
		pos.push(x, y, z);
		uv.push(...uvOf$1(d, y));
		jaw.push(w);
		gillMask.push(inPoly(GILL_INNER, d, y) ? 1 : 0);
		return pos.length / 3 - 1;
	};
	const C = cu + cl;
	const rings = [];
	const tipUp = add(SNOUT$1, Y_TIP$1, 0, 0, 0);
	const tipLo = add(SNOUT$1, Y_TIP$1, 0, 0, 1);
	const seamInfo = [];
	for (const d of ds) {
		const s = sec$1(d);
		const ts = seamT$1(d);
		const split = d < MOUTH$2.corner - 1e-6;
		const up = [[], []];
		const lo = [[], []];
		for (let side = 0; side < 2; side++) {
			const sg = side === 0 ? 1 : -1;
			for (let j = 0; j <= C; j++) {
				if (side === 1 && (j === 0 || j === C)) {
					if (j === 0) up[1][0] = up[0][0];
					else lo[1][j - cu] = lo[0][j - cu];
					continue;
				}
				let t;
				if (j <= cu) t = ts + (1 - ts) * Math.sin(Math.PI / 2 * (1 - j / cu));
				else t = ts * (1 - Math.sin(Math.PI / 2 * ((j - cu) / cl)));
				const y = s.bot + t * (s.top - s.bot);
				let z = sg * surfZ$1(d, t);
				const near = Math.abs(j - cu);
				const mouthK = 1 - smooth$1(d, MOUTH$2.corner, MOUTH$2.corner + .02);
				if (near <= 1) z *= 1 - mouthK * (near === 0 ? .1 : .03);
				const x = mx$1(d);
				if (j < cu) up[side][j] = add(x, y, z, d, 0);
				else if (j > cu) lo[side][j - cu] = add(x, y, z, d, jawWeight$1(d, (j - cu) / cl, true));
				else {
					up[side][j] = add(x, y, z, d, 0);
					lo[side][0] = split ? add(x, y, z, d, jawWeight$1(d, 0, true)) : up[side][j];
					if (side === 0 && d <= MOUTH$2.throat + 1e-6) seamInfo.push({
						d,
						y,
						z: Math.abs(z)
					});
				}
			}
		}
		rings.push({
			up,
			lo
		});
	}
	const quad = (a, b, c, e) => idx.push(a, b, c, a, c, e);
	const r0 = rings[0];
	for (let side = 0; side < 2; side++) {
		const flip = side === 0;
		for (let j = 0; j < cu; j++) {
			const a = r0.up[side][j];
			const b = r0.up[side][j + 1];
			if (flip) idx.push(tipUp, a, b);
			else idx.push(tipUp, b, a);
		}
		for (let j = 0; j < cl; j++) {
			const a = r0.lo[side][j];
			const b = r0.lo[side][j + 1];
			if (flip) idx.push(tipLo, a, b);
			else idx.push(tipLo, b, a);
		}
	}
	for (let i = 0; i < rings.length - 1; i++) {
		const A = rings[i];
		const B = rings[i + 1];
		for (let side = 0; side < 2; side++) {
			const flip = side === 0;
			const strip = (ca, cb) => {
				for (let j = 0; j < ca.length - 1; j++) if (flip) quad(ca[j], cb[j], cb[j + 1], ca[j + 1]);
				else quad(ca[j], ca[j + 1], cb[j + 1], cb[j]);
			};
			strip(A.up[side], B.up[side]);
			strip(A.lo[side], B.lo[side]);
		}
	}
	const last = rings[rings.length - 1];
	const ringPts = [
		...last.up[0],
		...last.lo[0].slice(1),
		...[...last.lo[1]].reverse().slice(1),
		...[...last.up[1]].reverse().slice(1, -1)
	];
	const cEnd = add(mx$1(D_END$1), (TOP$1(D_END$1) + BOT$1(D_END$1)) / 2, 0, D_END$1, 0);
	for (let j = 0; j < ringPts.length; j++) idx.push(cEnd, ringPts[(j + 1) % ringPts.length], ringPts[j]);
	const body = new THREE.BufferGeometry();
	body.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	body.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
	body.setAttribute("aJaw", new THREE.Float32BufferAttribute(jaw, 1));
	body.setAttribute("aGill", new THREE.Float32BufferAttribute(gillMask, 1));
	body.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0), 1));
	body.setIndex(idx);
	body.computeVertexNormals();
	{
		const nr = body.getAttribute("normal");
		const p = body.getAttribute("position");
		for (let i = 0; i < nr.count; i++) {
			const k = smooth$1(SNOUT$1 - p.getX(i), .72, D_END$1);
			if (k <= 0) continue;
			const nx = nr.getX(i) * (1 - k);
			const ny = nr.getY(i) * (1 - .6 * k);
			const nz = nr.getZ(i);
			const l = Math.hypot(nx, ny, nz) || 1;
			nr.setXYZ(i, nx / l, ny / l, nz / l);
		}
	}
	return {
		body,
		mouth: buildMouth$1(seamInfo),
		gill: buildGill$1(gl)
	};
}
function buildMouth$1(seam) {
	const K = 10;
	const pos = [];
	const jaw = [];
	const idx = [];
	const rows = [];
	const cornerSeam = seam.filter((s) => s.d <= MOUTH$2.corner + 1e-6).slice(-1)[0];
	const stations = [{
		d: 0,
		y: Y_TIP$1,
		z: 0
	}, ...seam.filter((s) => s.d <= MOUTH$2.corner + 1e-6)];
	for (let k = 1; k <= 5; k++) {
		const u = k / 5;
		const d = MOUTH$2.corner + (MOUTH$2.throat - MOUTH$2.corner) * u;
		stations.push({
			d,
			y: cornerSeam.y + .004 * u,
			z: cornerSeam.z * Math.sqrt(1 - u) * .7
		});
	}
	for (const st of stations) {
		const s = sec$1(Math.max(st.d, 1e-4));
		const u = st.d > MOUTH$2.corner + 1e-6 ? (st.d - MOUTH$2.corner) / (MOUTH$2.throat - MOUTH$2.corner) : 0;
		const fade = smooth$1(st.d, 0, .012);
		const hp = Math.min(.5 * (s.top - st.y), .012) * fade * (1 - u * .6);
		const hf = Math.min(.5 * (st.y - s.bot), .012) * fade * (1 - u * .6);
		const row = [];
		for (let part = 0; part < 2; part++) {
			const roof = part === 0;
			for (let k = 0; k <= K; k++) {
				const a = Math.PI * k / K;
				const side = roof ? Math.cos(a) : -Math.cos(a);
				const z = st.z * side * (k === 0 || k === K ? 1 : .94);
				const y = roof ? st.y + hp * Math.sin(a) : st.y - hf * Math.sin(a);
				pos.push(mx$1(st.d), y, z);
				jaw.push(roof ? 0 : jawWeight$1(Math.max(st.d, 1e-4), .6 * Math.sin(a), true));
				row.push(pos.length / 3 - 1);
			}
		}
		rows.push(row);
	}
	for (let i = 0; i < rows.length - 1; i++) {
		const A = rows[i];
		const B = rows[i + 1];
		for (let k = 0; k < 21; k++) {
			if (k === K) continue;
			idx.push(A[k], B[k], B[k + 1], A[k], B[k + 1], A[k + 1]);
		}
	}
	const L = rows[rows.length - 1];
	const st = stations[stations.length - 1];
	pos.push(mx$1(st.d) - .003, st.y, 0);
	jaw.push(0);
	const c = pos.length / 3 - 1;
	for (let k = 0; k < 21; k++) if (k !== K) idx.push(L[k], c, L[k + 1]);
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute("aJaw", new THREE.Float32BufferAttribute(jaw, 1));
	g.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(3), 1));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}
function buildGill$1(gl) {
	const NA = 9;
	const NB = 18;
	const pick = (keys, b) => {
		const f = b * (keys.length - 1);
		const i = Math.min(keys.length - 2, Math.floor(f));
		const u = f - i;
		const p0 = keys[Math.max(0, i - 1)];
		const p1 = keys[i];
		const p2 = keys[i + 1];
		const p3 = keys[Math.min(keys.length - 1, i + 2)];
		const cr = (a, b2, c, e) => .5 * (2 * b2 + (-a + c) * u + (2 * a - 5 * b2 + 4 * c - e) * u * u + (-a + 3 * b2 - 3 * c + e) * u * u * u);
		return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
	};
	const pos = [];
	const uv = [];
	const fw = [];
	const idx = [];
	for (let side = 0; side < 2; side++) {
		const sg = side === 0 ? 1 : -1;
		const base = pos.length / 3;
		const cols = 11;
		for (let ib = 0; ib <= NB; ib++) {
			const b = ib / NB;
			const h = pick(gl.hinge, b);
			const e = pick(gl.edge, b);
			const span = Math.hypot(e[0] - h[0], e[1] - h[1]);
			for (let ia = 0; ia <= 10; ia++) {
				const rim = ia === 10;
				const a = rim ? 1 : ia / NA;
				const d = h[0] + (e[0] - h[0]) * a;
				let y = h[1] + (e[1] - h[1]) * a;
				const s = sec$1(d);
				y = clamp$2(y, s.bot + .008, s.top - .006);
				const z0 = surfZAt$1(d, y);
				const lift = rim ? 3e-4 : 6e-4 + .0018 * Math.pow(a, .7);
				pos.push(mx$1(d), y, sg * (z0 + lift));
				uv.push(...uvOf$1(d, y));
				fw.push(span * a);
			}
		}
		for (let ib = 0; ib < NB; ib++) for (let ia = 0; ia < 10; ia++) {
			const a = base + ib * cols + ia;
			const b = a + 1;
			const c = a + cols + 1;
			const e = a + cols;
			if (sg > 0) idx.push(a, b, c, a, c, e);
			else idx.push(a, c, b, a, e, c);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
	g.setAttribute("aFw", new THREE.Float32BufferAttribute(fw, 1));
	g.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(7), 1));
	g.setAttribute("aGill", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0), 1));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}
function rayFin$1(name, dir, t, spines, seg) {
	const n = t.tips ? t.tips.length : t.lens.length;
	const rays = [];
	const ds = [];
	const ang = [];
	for (let i = 0; i < n; i++) {
		const u = i / (n - 1);
		const d = t.d0 + (t.d1 - t.d0) * (t.tips ? u : u * (1.1 - .1 * u));
		const yb = (dir > 0 ? TOP$1(d) : BOT$1(d)) - dir * .0025;
		let len;
		let a;
		if (t.tips) {
			const [td, ty] = t.tips[i];
			len = Math.hypot(td - d, ty - yb);
			a = Math.atan2(dir * (ty - yb), td - d) + .1;
		} else {
			len = t.lens[i];
			a = deg$1(t.angs[i]);
		}
		rays.push({
			base: v3$1(mx$1(d), yb, 0),
			len
		});
		ds.push(d);
		ang.push(a);
	}
	const fin = new Fin({
		name,
		rays,
		seg,
		branched: [spines, n - 1],
		notch: .05
	});
	fin.bulge = Array.from({ length: n - 1 }, () => new Array(seg + 1).fill(0));
	return {
		fin,
		dir,
		d: ds,
		ang,
		comp: rays.map((_, i) => rayComp$1(i, n, spines)),
		dz: rays.map(() => new Array(seg + 1).fill(0))
	};
}
function rayComp$1(i, n, spines) {
	if (i < spines) return .22 + .18 * i / Math.max(1, spines - 1);
	return .6 + .4 * (i - spines) / Math.max(1, n - 1 - spines);
}
var rayShape$1 = (s, comp) => Math.pow(s, 1.8 + .9 * comp);
var rayLag$1 = (s, comp) => (.5 + 1.1 * comp) * Math.pow(s, 1.2);
function bodyAmp$1(w, d) {
	const e = w.env;
	const tip = e.x + e.y + e.z;
	const a0 = e.x * w.head + e.y * d + e.z * d * d;
	const a1 = tip * (.25 + .75 * Math.pow(Math.max(d, 0), 1.6));
	return w.amp * lerp$1(a0, a1, clamp$2(w.power, 0, 1)) / tip;
}
var bodyPhase$1 = (w, d) => Math.PI * 2 * (d / w.lam - w.cyc);
var bodyLagZ$1 = (H, th, lag) => H * (Math.sin(th + lag) - Math.sin(th));
var BODY_BEND$1 = 5;
var STILL$2 = {
	body: null,
	idle: 0,
	idlePh: 0,
	idleWaves: 1,
	flut: 0,
	t: 0
};
function poseRim$1(m, fold, tilt, sw) {
	const { fin, dir } = m;
	const n = fin.n;
	const seg = fin.seg;
	const edge = dir > 0 ? TOP$1 : BOT$1;
	const lie = smooth$1(fold, .45, 1);
	const live = 1 - .8 * lie;
	const hinge = .4 * tilt;
	const ch = Math.cos(hinge);
	const sh = Math.sin(hinge);
	const tip = v3$1();
	const p = v3$1();
	const q = v3$1();
	for (let i = 0; i < n; i++) {
		const ray = fin.o.rays[i];
		const b = ray.base;
		const u = i / (n - 1);
		const comp = m.comp[i];
		const lay = (s, out) => {
			const dd = m.d[i] + ray.len * s * .97;
			const clear = .0015 + .003 * (1 - u) * Math.min(1, s * 3);
			const ye = dd < D_END$1 ? edge(dd) : edge(D_END$1) + (dd - D_END$1) * (dir > 0 ? -.35 : .35);
			out.set(mx$1(dd), ye + dir * clear, 0);
		};
		lay(1, tip);
		const foldAng = Math.atan2(dir * (tip.y - b.y), b.x - tip.x);
		const fi = clamp$2(fold * 1.15 - .15 * u, 0, 1);
		const ang = lerp$1(m.ang[i], foldAng, fi);
		const H = sw.body ? bodyAmp$1(sw.body, m.d[i]) * BODY_BEND$1 : 0;
		const th = sw.body ? bodyPhase$1(sw.body, m.d[i]) : 0;
		const idlePh = sw.idlePh - Math.PI * 2 * sw.idleWaves * u;
		for (let r = 0; r <= seg; r++) {
			const s = r / seg;
			const bend = .1 * s * s;
			const l = ray.len * s;
			p.set(b.x - l * Math.cos(ang - bend), b.y + dir * l * Math.sin(ang - bend), 0);
			if (lie > 0) {
				lay(s, q);
				p.lerp(q, lie * smooth$1(fi, .5, 1));
			}
			const h = (p.y - b.y) * dir;
			const shp = rayShape$1(s, comp);
			const lag = rayLag$1(s, comp);
			let a = H !== 0 ? bodyLagZ$1(H, th, lag) * comp : 0;
			a += sw.idle * comp * (Math.sin(idlePh - lag) + .35 * Math.sin(.57 * sw.idlePh + 1.7 - 3.8 * u - lag));
			a += .6 * tilt * (.6 + .4 * comp);
			let dz = a * ray.len * shp;
			dz += sw.flut * comp * s * s * Math.min(1, ray.len / .1) * Math.sin(sw.t * 7 - i * .9 - s * 3);
			dz *= live;
			m.dz[i][r] = dz;
			p.y = b.y + dir * h * ch;
			p.z = h * sh + dz;
			fin.P[i][r].copy(p);
		}
		fin.normal[i].set(0, -sh * dir, ch);
	}
	const bl = fin.bulge;
	for (let i = 0; i < n - 1; i++) for (let r = 0; r <= seg; r++) {
		const s = r / seg;
		const rip = sw.flut * .7 * smooth$1(s, .5, 1) * Math.sin(sw.t * 15 + i * 2.3 - s * 4);
		bl[i][r] = (.225 * (m.dz[i][r] + m.dz[i + 1][r]) + rip * live) * ch;
	}
}
function caudalFin$1() {
	const xb = .8079999999999999;
	const rays = [];
	const ang = [];
	const baseY = [];
	const proc = [];
	[
		.78,
		.792,
		.804
	].forEach((d, i) => {
		rays.push({
			base: v3$1(mx$1(d), TOP$1(d) - .0015, 0),
			len: .03 + i * .013
		});
		ang.push(deg$1(12 + i * 4));
		baseY.push(TOP$1(d) - .0015);
		proc.push(true);
	});
	const N = 19;
	for (let i = 0; i < N; i++) {
		const k = 1 - 2 * i / 18;
		const len = CAUDAL$1.mid + (k > 0 ? CAUDAL$1.up : CAUDAL$1.lo) * Math.pow(Math.abs(k), 1.1);
		const y = TAIL_YC$1 + k * .034;
		rays.push({
			base: v3$1(mx$1(xb), y, 0),
			len
		});
		ang.push(deg$1(k > 0 ? CAUDAL$1.aUp : CAUDAL$1.aLo) * k - .05 * k + deg$1(.5));
		baseY.push(y);
		proc.push(false);
	}
	[
		.804,
		.792,
		.78
	].forEach((d, i) => {
		rays.push({
			base: v3$1(mx$1(d), BOT$1(d) + .0015, 0),
			len: .056 - i * .013
		});
		ang.push(-deg$1(20 - i * 4));
		baseY.push(BOT$1(d) + .0015);
		proc.push(true);
	});
	const fin = new Fin({
		name: "caudal",
		rays,
		seg: 14,
		branched: [4, 20],
		notch: .035
	});
	fin.bulge = Array.from({ length: rays.length - 1 }, () => new Array(15).fill(0));
	return {
		fin,
		ang,
		baseY,
		procurrent: proc,
		dz: rays.map(() => new Array(15).fill(0))
	};
}
function poseCaudal$1(c, close, cup, sw) {
	const { fin } = c;
	const n = fin.n;
	const seg = fin.seg;
	const { t, flut } = sw;
	const H = sw.body ? bodyAmp$1(sw.body, D_END$1) * BODY_BEND$1 * .25 : 0;
	const th = sw.body ? bodyPhase$1(sw.body, D_END$1) : 0;
	for (let i = 0; i < n; i++) {
		const ray = fin.o.rays[i];
		const proc = c.procurrent[i];
		const ci = clamp$2(close * 1.1 - .1 * Math.abs(i - (n - 1) / 2) / ((n - 1) / 2), 0, 1);
		const a = proc ? c.ang[i] * (1 - .45 * ci) : c.ang[i] * (1 - .86 * ci);
		const by = proc ? c.baseY[i] : TAIL_YC$1 + (c.baseY[i] - TAIL_YC$1) * (1 - .35 * ci);
		const bx = ray.base.x;
		const k = (c.baseY[i] - TAIL_YC$1) / .034;
		for (let r = 0; r <= seg; r++) {
			const s = r / seg;
			const l = ray.len * s;
			const sweep = .05 * k * s * s * (1 - .7 * ci);
			const x = bx - l * Math.cos(a + sweep);
			const y = by + l * Math.sin(a + sweep);
			let wv = flut * s * s * Math.sin(t * 6 - s * 2.4 - i * .12) + cup * s * s * (Math.abs(k) - .4);
			const comp = proc ? .3 : .35 + .65 * Math.min(1, Math.abs(k));
			const shp = rayShape$1(s, comp);
			const lag = rayLag$1(s, comp);
			if (H !== 0) wv += bodyLagZ$1(H, th, lag) * comp * shp * ray.len;
			wv += sw.idle * .3 * comp * shp * ray.len * Math.sin(sw.idlePh * .8 + 1.3 * k - lag);
			wv *= 1 - .6 * ci;
			c.dz[i][r] = wv;
			fin.P[i][r].set(x, y, wv);
		}
		fin.normal[i].set(0, 0, 1);
	}
	const bl = fin.bulge;
	for (let i = 0; i < n - 1; i++) for (let r = 0; r <= seg; r++) {
		const s = r / seg;
		const rip = flut * .35 * smooth$1(s, .55, 1) * Math.sin(t * 15 + i * 2.1 - s * 4);
		bl[i][r] = .15 * (c.dz[i][r] + c.dz[i + 1][r]) + rip;
	}
}
function surfPoint$1(d, t, side) {
	const s = sec$1(d);
	const y = s.bot + t * (s.top - s.bot);
	const z = side * surfZ$1(d, t);
	const e = .001;
	const p = v3$1(mx$1(d), y, z);
	const s2 = sec$1(d + e);
	const pd = v3$1(mx$1(d + e), s2.bot + t * (s2.top - s2.bot), side * surfZ$1(d + e, t));
	const t2 = Math.min(1, t + e * 4);
	const pt = v3$1(mx$1(d), s.bot + t2 * (s.top - s.bot), side * surfZ$1(d, t2));
	const du = pd.sub(p);
	const dt = pt.sub(p);
	const n = v3$1().crossVectors(du, dt).normalize();
	if (n.z * side < 0) n.negate();
	return {
		p,
		n
	};
}
function keepOutside$1(p, side, clear) {
	const z = surfZAt$1(SNOUT$1 - p.x, p.y);
	if (z <= 0) return;
	if (p.z * side < z + clear) p.z = side * (z + clear);
}
var PECT_IMG = {
	"bt": [107, 144],
	"bb": [107, 317],
	"len": 1700.2,
	"ex": [.95283, .30349],
	"size": [1774, 887],
	"base": [.0309, .097],
	"tips": [
		[1, -0],
		[.924, .0211],
		[.8477, .0516],
		[.7742, .0855],
		[.6974, .1181],
		[.6243, .1598],
		[.5467, .1901],
		[.4731, .2283],
		[.3899, .2429],
		[.3061, .2494],
		[.2204, .2335],
		[.1375, .1998],
		[.0735, .1382]
	],
	"bend": 64,
	"bendP": 1.3
};
function bentRay(k, seg) {
	let zx = 0;
	let zy = 0;
	for (let r = 0; r < seg; r++) {
		const s = (r + .5) / seg;
		zx += Math.cos(k * (s * s - 1 / 3)) / seg;
		zy += Math.sin(k * (s * s - 1 / 3)) / seg;
	}
	return {
		off: Math.atan2(zy, zx),
		scale: 1 / Math.hypot(zx, zy)
	};
}
var FLAT$1 = {
	twist: 0,
	flare: 0,
	cup: 0
};
function betaAdd$1(f, u, s) {
	return f.twist * (1 - u - .35) + f.flare * s * s + f.cup * Math.sin(Math.PI * u) * s;
}
function pelvicFin$1(side, a, b, lens, psiO, psiC, betaO, betaC, name = "pelvic", shape = FLAT$1, bend = []) {
	const n = lens.length;
	return {
		fin: new Fin({
			name,
			rays: lens.map((len, i) => {
				const u = i / (n - 1);
				const sp = surfPoint$1(lerp$1(a[0], b[0], u), lerp$1(a[1], b[1], u), side);
				return {
					base: sp.p.addScaledVector(sp.n, -.001),
					len
				};
			}),
			seg: 12,
			branched: [1, n - 1],
			notch: .04
		}),
		side,
		psiO: psiO.map(deg$1),
		psiC: psiC.map(deg$1),
		betaO: deg$1(betaO),
		betaC: deg$1(betaC),
		shape,
		bend: lens.map((_, i) => bend[i] ?? 0)
	};
}
var strokeWave$1 = (x) => Math.sin(x + .45 * Math.sin(x));
function posePelvic$1(f, open, trail, t, flut, phase, beat = 0, stroke = null, sway = null) {
	const { fin, side } = f;
	const n = fin.n;
	const seg = fin.seg;
	const e0 = open * open * (3 - 2 * open);
	const p = v3$1();
	if (sway && !f.dz) {
		f.dz = Array.from({ length: n }, () => new Array(seg + 1).fill(0));
		fin.bulge = Array.from({ length: n - 1 }, () => new Array(seg + 1).fill(0));
	}
	const d0 = SNOUT$1 - fin.o.rays[0].base.x;
	const H = sway?.body ? bodyAmp$1(sway.body, d0) * BODY_BEND$1 : 0;
	const th = sway?.body ? bodyPhase$1(sway.body, d0) : 0;
	for (let i = 0; i < n; i++) {
		const ray = fin.o.rays[i];
		const u = i / (n - 1);
		const comp = sway ? rayComp$1(i, n, 1) : 0;
		const lag = stroke ? stroke.ph - 1.4 * u : 0;
		const oi = stroke ? clamp$2(open + stroke.amp * strokeWave$1(lag), .02, 1) : open;
		const e = stroke ? oi * oi * (3 - 2 * oi) : e0;
		const beta = Math.max(.02, lerp$1(f.betaC, f.betaO, e) + beat);
		const hugW = f.hug ? clamp$2(1 - e * 1.8, 0, 1) : 0;
		const psi0 = lerp$1(f.psiC[i], f.psiO[i], clamp$2(e * 1.1 - .1 * u, 0, 1));
		p.copy(ray.base);
		const step = ray.len / seg;
		fin.P[i][0].copy(p);
		let bi = beta;
		for (let r = 1; r <= seg; r++) {
			const s = r / seg;
			const sm = (r - .5) / seg;
			let psi = psi0 - trail * s * s * (1 + .6 * (1 - u)) + flut * s * s * Math.sin(t * 5 + phase - s * 2.5 - i * .4) * 8;
			psi += f.bend[i] * (.3 + .7 * e) * (sm * sm - 1 / 3);
			bi = Math.max(.02, beta + e * betaAdd$1(f.shape, u, s - .5 / seg));
			if (stroke) {
				const late = strokeWave$1(lag - 1.5 * sm) - strokeWave$1(lag);
				bi = Math.max(.02, bi + (f.betaO - f.betaC) * stroke.amp * 1.1 * late * sm);
				psi += stroke.sweep * strokeWave$1(lag - .9 - 1.2 * sm) * sm;
			}
			let off = 0;
			if (sway) {
				const lg = rayLag$1(s, comp);
				let w = H !== 0 ? side * bodyLagZ$1(H, th, lg) : 0;
				w += sway.idle * (Math.sin(sway.idlePh + phase - Math.PI * 2 * sway.idleWaves * u - lg) + .35 * Math.sin(.57 * sway.idlePh + 1.7 + phase - 2.5 * u - lg));
				off = comp * w * ray.len * rayShape$1(s, comp) * (.35 + .65 * e);
				f.dz[i][r] = off;
			}
			const cb = Math.cos(bi);
			const sb = Math.sin(bi);
			p.x -= step * Math.cos(psi);
			p.y -= step * Math.sin(psi) * cb;
			p.z += side * step * Math.sin(psi) * sb;
			keepOutside$1(p, side, .0015);
			if (hugW > 0) {
				const zs = surfZAt$1(SNOUT$1 - p.x, p.y);
				if (zs > 0) p.z += (side * (zs + .0012 + .0015 * s) - p.z) * hugW;
			}
			fin.P[i][r].copy(p);
			if (off !== 0) {
				fin.P[i][r].y += off * Math.sin(bi);
				fin.P[i][r].z += off * side * Math.cos(bi);
				keepOutside$1(fin.P[i][r], side, .0015);
			}
		}
		fin.normal[i].set(0, Math.sin(bi), side * Math.cos(bi));
	}
	if (sway) {
		const bl = fin.bulge;
		const dz = f.dz;
		for (let i = 0; i < n - 1; i++) for (let r = 0; r <= seg; r++) {
			const s = r / seg;
			const rip = sway.flut * .35 * smooth$1(s, .5, 1) * Math.sin(sway.t * 15 + i * 2.3 - s * 4);
			bl[i][r] = .225 * (dz[i][r] + dz[i + 1][r]) + rip;
		}
	}
}
function buildEye$1(side, ws = 40, hs = 28) {
	const g = new THREE.SphereGeometry(1, ws, hs);
	const pos = g.getAttribute("position");
	const zs = surfZAt$1(EYE$1.d, EYE$1.y);
	const center = v3$1(mx$1(EYE$1.d), EYE$1.y, side * (zs - .3 * EYE$1.r));
	const P = new Float32Array(pos.count * 3);
	const local = new Float32Array(pos.count * 3);
	const polar = new Float32Array(pos.count * 4);
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const y = pos.getY(i);
		const z = pos.getZ(i);
		const lx = x * EYE$1.r;
		const ly = z * EYE$1.r;
		const lz = y * EYE$1.r * .5;
		local[i * 3] = lx;
		local[i * 3 + 1] = ly;
		local[i * 3 + 2] = lz * side;
		polar[i * 4] = Math.acos(clamp$2(y, -1, 1)) / Math.PI;
		polar[i * 4 + 1] = Math.atan2(z, x);
		polar[i * 4 + 2] = .5 - x * .5;
		polar[i * 4 + 3] = .5 + z * .5;
		P[i * 3] = center.x + lx;
		P[i * 3 + 1] = center.y + ly;
		P[i * 3 + 2] = center.z + lz * side;
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage));
	geo.setAttribute("aEye", new THREE.BufferAttribute(polar, 4));
	geo.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(pos.count).fill(6), 1));
	const index = g.getIndex();
	const ia = Array.from(index.array);
	if (side > 0) for (let i = 0; i < ia.length; i += 3) [ia[i + 1], ia[i + 2]] = [ia[i + 2], ia[i + 1]];
	geo.setIndex(ia);
	geo.computeVertexNormals();
	geo.boundingSphere = new THREE.Sphere(v3$1(0, 0, 0), 1);
	g.dispose();
	return {
		geo,
		local,
		localN: Float32Array.from(geo.getAttribute("normal").array),
		center,
		side
	};
}
function paintBody$1(sex, W, H) {
	const col = document.createElement("canvas");
	col.width = W;
	col.height = H;
	const msk = document.createElement("canvas");
	msk.width = W;
	msk.height = H;
	const g = col.getContext("2d");
	const m = msk.getContext("2d");
	const img = g.createImageData(W, H);
	const mimg = m.createImageData(W, H);
	for (let py = 0; py < H; py++) {
		const y = TEX$1.y1 - (py + .5) / H * (TEX$1.y1 - TEX$1.y0);
		for (let px = 0; px < W; px++) {
			const d = TEX$1.d0 + (px + .5) / W * (TEX$1.d1 - TEX$1.d0);
			const dc = clamp$2(d, 0, D_END$1);
			const inBody = d >= 0 && d <= D_END$1 && y <= TOP$1(dc) && y >= BOT$1(dc);
			const k = (py * W + px) * 4;
			const t = inBody ? (y - BOT$1(dc)) / (TOP$1(dc) - BOT$1(dc)) : .5;
			let c = t > .7 ? [
				.42,
				.45,
				.28
			] : [
				.78,
				.8,
				.8
			];
			if (sex === "male" && inBody && t > .3 && t < .75 && d > .2 && d < .72) c = Math.sin(d * 70) > .6 ? [
				.85,
				.45,
				.25
			] : [
				.35,
				.7,
				.72
			];
			if (!inBody) c = [
				.6,
				.6,
				.6
			];
			img.data[k] = c[0] * 255;
			img.data[k + 1] = c[1] * 255;
			img.data[k + 2] = c[2] * 255;
			img.data[k + 3] = (inBody ? 1 : .5) * 255;
			mimg.data[k] = (inBody ? .5 : 0) * 255;
			mimg.data[k + 3] = 255;
		}
	}
	g.putImageData(img, 0, 0);
	m.putImageData(mimg, 0, 0);
	return {
		col,
		msk
	};
}
function sharedUniforms$1() {
	return {
		uTime: { value: 0 },
		uMouth: { value: 0 },
		uGill: { value: 0 },
		uFloor: { value: 0 },
		uHead: { value: 1 },
		uPower: { value: 0 },
		uLam: { value: .95 },
		uSwim: { value: new THREE.Vector4() },
		uNeck: { value: new THREE.Vector4() },
		uEnv: { value: new THREE.Vector3(.02, -.08, .16) },
		uJaw: { value: new THREE.Vector2(mx$1(MOUTH$2.joint[0]), MOUTH$2.joint[1]) }
	};
}
function inject$1(mat, u, defs, extra, frag, key) {
	mat.onBeforeCompile = (sh2) => {
		Object.assign(sh2.uniforms, u, extra);
		const d = defs.map((x) => `#define ${x}\n`).join("");
		sh2.vertexShader = d + VERT_HEAD + sh2.vertexShader.replace("#include <beginnormal_vertex>", VERT_BODY).replace("#include <begin_vertex>", "vec3 transformed = fishP;");
		sh2.fragmentShader = d + frag(sh2.fragmentShader);
	};
	const sx = FORM_SEX;
	mat.customProgramCacheKey = () => "oikawa-" + sx + "-" + key + "-" + defs.join("-");
}
var OIKAWA_LOOK = {
	iri: { value: .14 },
	iriMix: { value: .45 },
	iriEdge: { value: .3 },
	iriA: { value: new THREE.Color().setRGB(.85, .95, 1) },
	iriB: { value: new THREE.Color().setRGB(.25, .85, .85) },
	iriC: { value: new THREE.Color().setRGB(.15, .4, .9) },
	glint: { value: 0 },
	glintSize: { value: .012 },
	glow: { value: 0 },
	spec: { value: 2.5 },
	env: { value: 3.5 },
	silverMetal: { value: .1 },
	silverRough: { value: .42 },
	lift: { value: .16 },
	finGlow: { value: 1 },
	fishKey: { value: new THREE.Color(0, 0, 0) },
	fishKeyDir: { value: new THREE.Vector3(0, 1, .3).normalize() }
};
var LOOK_U$1 = {
	uIri: OIKAWA_LOOK.iri,
	uIriMix: OIKAWA_LOOK.iriMix,
	uIriEdge: OIKAWA_LOOK.iriEdge,
	uIriA: OIKAWA_LOOK.iriA,
	uIriB: OIKAWA_LOOK.iriB,
	uIriC: OIKAWA_LOOK.iriC,
	uGlint: OIKAWA_LOOK.glint,
	uGlintSize: OIKAWA_LOOK.glintSize,
	uIriGlow: OIKAWA_LOOK.glow,
	uSpecK: OIKAWA_LOOK.spec,
	uEnvK: OIKAWA_LOOK.env,
	uSilverMetal: OIKAWA_LOOK.silverMetal,
	uSilverRough: OIKAWA_LOOK.silverRough,
	uLift: OIKAWA_LOOK.lift,
	uFinGlowK: OIKAWA_LOOK.finGlow,
	uFkCol: OIKAWA_LOOK.fishKey,
	uFkDir: OIKAWA_LOOK.fishKeyDir
};
var LOOK_HEAD$1 = `
uniform float uIri;
uniform float uIriMix;
uniform float uIriEdge;
uniform vec3 uIriA;
uniform vec3 uIriB;
uniform vec3 uIriC;
uniform float uGlint;
uniform float uGlintSize;
uniform float uIriGlow;
uniform float uSpecK;
uniform float uEnvK;
uniform float uSilverMetal;
uniform float uSilverRough;
uniform float uLift;
uniform float uFinGlowK;
uniform vec3 uFkCol;
uniform vec3 uFkDir;
`;
var LIGHT_GLSL$1 = `
reflectedLight.directSpecular *= uSpecK;
reflectedLight.indirectSpecular *= uEnvK;
#ifdef USE_CLEARCOAT
clearcoatSpecularDirect *= uSpecK;
clearcoatSpecularIndirect *= uEnvK;
#endif
{
  vec3 fkL = normalize((viewMatrix * vec4(uFkDir, 0.0)).xyz);
  reflectedLight.directDiffuse += uFkCol * max(dot(normal, fkL), 0.0) * diffuseColor.rgb * RECIPROCAL_PI;
}
`;
var IRI_GLSL$1 = `
{
  vec3 E = (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) / max(diffuseColor.rgb, vec3(0.04));
  float e = dot(E, vec3(0.2126, 0.7152, 0.0722));
  vec3 V = normalize(vViewPosition);
  float nv = clamp(dot(normal, V), 0.0, 1.0);
  vec3 iri = nv > 0.5 ? mix(uIriB, uIriA, (nv - 0.5) / 0.5) : mix(uIriC, uIriB, nv / 0.5);
  iri = mix(diffuseColor.rgb, iri, uIriMix);
  float sparkle = clamp(dot(diffuseColor.rgb, vec3(0.3, 0.5, 0.2)) * 1.6 - 0.15, 0.35, 1.3);
  if (uGlint > 0.0) {
    vec2 sc = floor(vModel.xy / uGlintSize);
    float o = fract(sin(dot(sc, vec2(12.9898, 78.233))) * 43758.5453);
    sparkle += uGlint * pow(max(0.0, cos(18.0 * (nv - 0.45 - 0.5 * o))), 6.0);
  }
  totalEmissiveRadiance += tMask.r * iri * (uIriEdge + (1.0 - uIriEdge) * pow(nv, 0.6)) * sparkle * e * uIri;
  totalEmissiveRadiance += tMask.r * iri * uIriGlow;
}
`;
var SKIN$1 = {
	roughness: .52,
	metalness: 0,
	clearcoat: .12,
	clearcoatRoughness: .35,
	specularIntensity: .45
};
function bodyMaterial$1(u, tex, kind) {
	const mat = new THREE.MeshPhysicalMaterial({
		map: tex.col,
		bumpMap: tex.bmp ?? null,
		bumpScale: .3,
		...SKIN$1
	});
	inject$1(mat, u, kind === "body" ? ["T_BODY", "T_JAW"] : ["T_GILL"], {
		uMask: { value: tex.msk },
		...LOOK_U$1
	}, (fs) => `uniform sampler2D uMask;\n${LOOK_HEAD$1}varying vec3 vModel;\nvarying vec3 vObjN;\n#ifdef T_BODY\nvarying float vGill;\n#endif\n` + fs.replace("#include <map_fragment>", `
float topK = smoothstep(0.6, 0.95, abs(normalize(vObjN).y));
vec4 sampledDiffuseColor = texture2D(map, vMapUv, topK * 3.0);
diffuseColor.rgb *= sampledDiffuseColor.rgb;
vec4 tMask = texture2D(uMask, vMapUv, topK * 3.0);
#ifdef T_BODY
if (vGill > 0.02) {
  float fil = 0.5 + 0.5 * sin(vModel.y * 700.0 + sin(vModel.x * 260.0) * 2.0);
  vec3 gill = mix(vec3(0.3, 0.02, 0.03), vec3(0.72, 0.08, 0.08), fil);
  diffuseColor.rgb = mix(diffuseColor.rgb, gill, smoothstep(0.02, 0.6, vGill));
}
#endif
`).replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = uSilverMetal * tMask.r;\nroughnessFactor = mix(roughnessFactor, uSilverRough, tMask.r);\n").replace("#include <aomap_fragment>", "#include <aomap_fragment>\n" + LIGHT_GLSL$1 + IRI_GLSL$1 + "totalEmissiveRadiance += diffuseColor.rgb * uLift;\n"), "body");
	mat.userData.oikawa = "body";
	return mat;
}
function mouthMaterial$1(u) {
	const mat = new THREE.MeshStandardMaterial({
		color: new THREE.Color(.32, .14, .15),
		roughness: .9,
		side: THREE.DoubleSide
	});
	inject$1(mat, u, ["T_JAW"], {}, (fs) => "varying vec3 vModel;\n" + fs.replace("#include <color_fragment>", `#include <color_fragment>
diffuseColor.rgb *= mix(1.0, 0.25, smoothstep(0.006, ${(MOUTH$2.throat * .8).toFixed(3)}, ${SNOUT$1.toFixed(3)} - vModel.x));`), "mouth");
	return mat;
}
function eyeMaterial$1(u, photo) {
	const mat = new THREE.MeshPhysicalMaterial({
		color: 16777215,
		roughness: .3,
		clearcoat: 1,
		clearcoatRoughness: .03,
		metalness: 0
	});
	inject$1(mat, u, photo ? ["T_EYE", "T_EYEPHOTO"] : ["T_EYE"], { uEyeTex: { value: photo } }, (fs) => "varying vec3 vModel;\nvarying vec4 vEye;\nuniform sampler2D uEyeTex;\n" + fs.replace("#include <color_fragment>", `#include <color_fragment>
{
  float r = vEye.x;
  float a = vEye.y;
  float pupil = 0.17;
  float iris = 0.36;
  vec3 c;
  if (r < pupil) c = vec3(0.004);
  else if (r < iris) {
    float k = (r - pupil) / (iris - pupil);
    float rad = 0.5 + 0.5 * sin(a * 41.0 + sin(a * 13.0) * 2.0);
    c = mix(vec3(0.62, 0.6, 0.5), vec3(0.85, 0.78, 0.55), rad * 0.6 + 0.2 * k);
    c = mix(c, vec3(0.8, 0.08, 0.05), smoothstep(0.55, 0.85, cos(a - 1.5708)) * smoothstep(0.4, 0.75, k));
    c = mix(vec3(0.75, 0.55, 0.25), c, smoothstep(0.0, 0.12, k));
    c *= mix(1.0, 0.55, smoothstep(0.82, 1.0, k));
  } else c = vec3(0.32, 0.36, 0.4);
#ifdef T_EYEPHOTO
  if (r < 0.5) c = texture2D(uEyeTex, vEye.zw).rgb;
#endif
  diffuseColor.rgb = c;
}
`), "eye");
	return mat;
}
var LOOKS$1 = {
	male: {
		dorsal: {
			base: [
				.36,
				.39,
				.42
			],
			alpha: .42,
			lead: [
				.95,
				.36,
				.12
			],
			leadW: .2,
			root: [
				.55,
				.5,
				.35
			],
			rootW: .25,
			rootK: .3
		},
		anal: {
			base: [
				.82,
				.8,
				.82
			],
			alpha: .34,
			lead: [
				1,
				.45,
				.16
			],
			leadW: .13,
			root: [
				1,
				.62,
				.42
			],
			rootW: .22,
			rootK: .35
		},
		caudal: {
			base: [
				.6,
				.62,
				.5
			],
			alpha: .38,
			lead: [
				.6,
				.62,
				.5
			],
			leadW: 0,
			root: [
				.85,
				.8,
				.35
			],
			rootW: .45,
			rootK: .6
		},
		pelvic: {
			base: [
				.86,
				.84,
				.82
			],
			alpha: .36,
			lead: [
				1,
				.45,
				.16
			],
			leadW: .25,
			root: [
				.86,
				.84,
				.82
			],
			rootW: .2,
			rootK: 0
		},
		pectoral: {
			base: [
				1,
				.66,
				.42
			],
			alpha: .34,
			lead: [
				1,
				.5,
				.2
			],
			leadW: .15,
			root: [
				1,
				.66,
				.42
			],
			rootW: .2,
			rootK: 0
		}
	},
	female: {
		dorsal: {
			base: [
				.82,
				.82,
				.68
			],
			alpha: .26,
			lead: [
				.82,
				.82,
				.68
			],
			leadW: 0,
			root: [
				.7,
				.7,
				.5
			],
			rootW: .2,
			rootK: .2
		},
		anal: {
			base: [
				.88,
				.88,
				.78
			],
			alpha: .26,
			lead: [
				.88,
				.88,
				.78
			],
			leadW: 0,
			root: [
				.88,
				.88,
				.78
			],
			rootW: .2,
			rootK: 0
		},
		caudal: {
			base: [
				.8,
				.78,
				.5
			],
			alpha: .34,
			lead: [
				.8,
				.78,
				.5
			],
			leadW: 0,
			root: [
				.8,
				.78,
				.5
			],
			rootW: .2,
			rootK: 0
		},
		pelvic: {
			base: [
				.9,
				.88,
				.76
			],
			alpha: .26,
			lead: [
				.9,
				.88,
				.76
			],
			leadW: 0,
			root: [
				.9,
				.88,
				.76
			],
			rootW: .2,
			rootK: 0
		},
		pectoral: {
			base: [
				.88,
				.86,
				.72
			],
			alpha: .26,
			lead: [
				.88,
				.86,
				.72
			],
			leadW: 0,
			root: [
				.88,
				.86,
				.72
			],
			rootW: .2,
			rootK: 0
		}
	}
};
function finMaterial$1(u, tex, look, nRays, edges = false, photo = null, glow = 0) {
	const mat = new THREE.MeshPhysicalMaterial({
		color: 16777215,
		map: photo ? tex?.fins ?? null : tex?.col ?? null,
		roughness: .35,
		metalness: 0,
		clearcoat: .1,
		clearcoatRoughness: .3,
		specularIntensity: .4,
		transparent: true,
		side: THREE.DoubleSide,
		depthWrite: false
	});
	const c3 = (v) => ({ value: new THREE.Color().setRGB(v[0], v[1], v[2]) });
	inject$1(mat, u, photo ? [
		"T_FIN",
		"FIN_PHOTO",
		...photo === "solid" ? ["FIN_SOLID"] : [],
		...edges && photo === "alpha" ? ["FIN_TAIL"] : []
	] : ["T_FIN"], {
		uMask: { value: tex?.msk ?? null },
		...LOOK_U$1,
		uGlow: { value: glow },
		uFinBase: c3(look.base),
		uFinLead: c3(look.lead),
		uFinRoot: c3(look.root),
		uFinA: { value: look.alpha },
		uLeadW: { value: look.leadW },
		uRootW: { value: look.rootW },
		uRootK: { value: look.rootK },
		uNR: { value: nRays - 1 },
		uEdges: { value: edges ? 1 : 0 }
	}, (fs) => "uniform sampler2D uMask;\n" + LOOK_HEAD$1 + "uniform float uGlow;\nuniform vec3 uFinBase;\nuniform vec3 uFinLead;\nuniform vec3 uFinRoot;\nuniform float uFinA;\nuniform float uLeadW;\nuniform float uRootW;\nuniform float uRootK;\nuniform float uNR;\nuniform float uEdges;\nvarying vec3 vModel;\nvarying vec4 vFin;\nvarying vec4 vFinGap;\n" + fs.replace("#include <color_fragment>", `#include <color_fragment>
vec4 tMask = vec4(0.0);
float bodyK = 0.0;
float skinR = 0.0;
{
  float rc = vFin.x, s = vFin.y;
  float gap = max(vFinGap.x, 1e-5);
  float ri = floor(rc + 0.5);
  float w = mix(0.0014, 0.0006, s);
  float line = 0.0;
  bool br = ri >= vFin.z && ri <= vFin.w;
  float sb = 0.45;
  float off = br && s > sb ? 0.16 * (s - sb) / (1.0 - sb) : 0.0;
  for (int k = -1; k <= 1; k += 2) {
    float dr = abs(rc - (ri + float(k) * off)) * gap;
    float aa = fwidth(rc) * gap + 1e-5;
    line = max(line, 1.0 - smoothstep(w * (off > 0.0 ? 0.75 : 1.0) - aa * 0.5, w + aa, dr));
  }
  float segm = abs(fract(s * 18.0 + ri * 0.37) - 0.5);
  line *= 0.8 + 0.35 * smoothstep(0.42, 0.5, segm);
  line *= clamp(w * 2.0 / (fwidth(rc) * gap + 1e-6), 0.25, 1.0);
  vec3 V = normalize(vViewPosition);
  float nv = abs(dot(normalize(vNormal), V));
  float fres = pow(1.0 - nv, 2.0);
  float idx = clamp(rc / max(uNR, 1.0), 0.0, 1.0);
  float e = uEdges > 0.5 ? min(idx, 1.0 - idx) * 2.0 : idx;
  float lead = uLeadW > 0.0 ? (1.0 - smoothstep(uLeadW * 0.45, uLeadW, e)) * smoothstep(0.04, 0.3, s) : 0.0;
  vec3 col = uFinBase;
  col = mix(col, uFinRoot, uRootK * (1.0 - smoothstep(uRootW * 0.4, uRootW, s)));
  col = mix(col, uFinLead, lead * 0.9);
  col *= 0.9 + 0.15 * line;
  float memb = uFinA + 0.12 * fres + 0.1 * vFinGap.y + 0.12 * (1.0 - smoothstep(0.0, 0.3, s)) + 0.3 * lead;
  float a = clamp(max(memb, uFinA + 0.5 * line), 0.0, 1.0);
  a *= 1.0 - 0.3 * smoothstep(0.85, 1.0, s);
#ifdef FIN_PHOTO
  vec4 tp = texture2D(map, vMapUv);
  col = tp.rgb * (0.96 + 0.08 * line);
#ifdef FIN_SOLID
  a = clamp(uFinA + 0.12 * fres + 0.12 * (1.0 - smoothstep(0.0, 0.3, s)) + 0.2 * line, 0.0, 1.0) * (1.0 - 0.25 * smoothstep(0.88, 1.0, s));
#else
  a = 1.0 - pow(1.0 - tp.a, 1.4);
#endif
#ifdef FIN_TAIL
  {
    float dd = ${SNOUT$1.toFixed(3)} - vModel.x;
    bodyK = 1.0 - smoothstep(${.816.toFixed(3)}, ${.865.toFixed(3)}, dd);
    vec4 m = texture2D(uMask, vMapUv);
    skinR = m.r;
    tMask = m * bodyK;
    a = mix(a, 1.0, bodyK);
  }
#endif
#elif defined(USE_MAP)
  float root = 1.0 - smoothstep(0.02, 0.12, s);
  {
    float dd = ${SNOUT$1.toFixed(3)} - vModel.x;
    float tailRoot = (1.0 - smoothstep(${.828.toFixed(3)}, ${.855.toFixed(3)}, dd)) * step(${.7999999999999999.toFixed(3)}, dd);
    tailRoot *= 1.0 - smoothstep(0.03, 0.05, abs(vModel.y - ${TAIL_YC$1.toFixed(3)}));
    root = max(root, tailRoot);
  }
  vec3 skin = texture2D(map, vMapUv).rgb;
  col = mix(col, skin, root);
  a = mix(a, 1.0, root);
  tMask = texture2D(uMask, vMapUv) * root;
#endif
  diffuseColor.rgb = col;
  diffuseColor.a = a * opacity;
}
`).replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>
metalnessFactor = mix(metalnessFactor, uSilverMetal * skinR, bodyK);
roughnessFactor = mix(roughnessFactor, mix(${SKIN$1.roughness.toFixed(2)}, uSilverRough, skinR), bodyK);
`).replace("#include <aomap_fragment>", "#include <aomap_fragment>\n" + LIGHT_GLSL$1 + "#ifdef USE_MAP\n" + IRI_GLSL$1 + "totalEmissiveRadiance += diffuseColor.rgb * uLift * tMask.a;\n#endif\ntotalEmissiveRadiance += diffuseColor.rgb * uGlow * uFinGlowK;\n"), "fin" + (photo ? "-photo-" + photo : tex ? "-map" : ""));
	mat.userData.oikawa = "fin";
	return mat;
}
var photoTex$1 = {};
var paintTex$1 = {};
async function loadOikawa(sex, url) {
	if (photoTex$1[sex]) return;
	const tl = new THREE.TextureLoader();
	const load = async (f, srgb) => {
		const t = await tl.loadAsync(url(f));
		t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
		t.anisotropy = 8;
		t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
		return t;
	};
	try {
		const p = `oikawa_${sex}_`;
		const [col, msk, bmp, eye, fins, pect] = await Promise.all([
			load(p + "body.webp", true),
			load(p + "mask.webp", false),
			load(p + "bump.webp", false),
			load(p + "eye.webp", true),
			load(p + "fins.webp", true).catch(() => void 0),
			FINS$1[sex].pectImg ? load(p + "pect.webp", true).catch(() => void 0) : void 0
		]);
		photoTex$1[sex] = {
			col,
			msk,
			bmp,
			eye,
			fins,
			pect
		};
	} catch {}
}
var CLAY$1 = typeof location !== "undefined" && new URLSearchParams(location.search).has("clay");
function textures$1(sex) {
	if (CLAY$1) return clayTex$1();
	const p = photoTex$1[sex];
	if (p) return p;
	const c = paintTex$1[sex];
	if (c) return c;
	const { col, msk } = paintBody$1(sex, 1024, 896);
	const mk = (cv, srgb) => {
		const t = new THREE.CanvasTexture(cv);
		t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
		t.anisotropy = 8;
		t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
		return t;
	};
	return paintTex$1[sex] = {
		col: mk(col, true),
		msk: mk(msk, false)
	};
}
var clayCache$1 = null;
function clayTex$1() {
	if (clayCache$1) return clayCache$1;
	const cv = document.createElement("canvas");
	cv.width = cv.height = 4;
	const g = cv.getContext("2d");
	g.fillStyle = "rgb(150,150,150)";
	g.fillRect(0, 0, 4, 4);
	const mk = new THREE.CanvasTexture(cv);
	mk.colorSpace = THREE.SRGBColorSpace;
	const cm = document.createElement("canvas");
	cm.width = cm.height = 4;
	return clayCache$1 = {
		col: mk,
		msk: new THREE.CanvasTexture(cm)
	};
}
var geoCache$1 = {};
function bodies$1(sex) {
	useForm(sex);
	const gl = GILL_LINES$1[sex];
	return geoCache$1[sex] ??= {
		hi: buildBody$1(26, 22, 30, .005, gl),
		lo: buildBody$1(12, 10, 14, .013, gl)
	};
}
function makeFins$1(sex) {
	useForm(sex);
	const F = FINS$1[sex];
	const dorsal = rayFin$1("dorsal", 1, F.dorsal, 3, 12);
	const anal = rayFin$1("anal", -1, F.anal, 3, 12);
	const caudal = caudalFin$1();
	const fromTips = (a, b, tips, beta, shape = FLAT$1) => {
		const n = tips.length;
		const lens = [];
		const psi = [];
		tips.forEach(([td, ty], i) => {
			const u = i / (n - 1);
			let cb = 0;
			for (let r = 0; r < 12; r++) cb += Math.cos(deg$1(beta) + betaAdd$1(shape, u, (r + .5) / 12)) / 12;
			const sp = surfPoint$1(lerp$1(a[0], b[0], u), lerp$1(a[1], b[1], u), 1);
			const back = td - (SNOUT$1 - sp.p.x);
			const down = (sp.p.y - ty) / cb;
			lens.push(Math.hypot(back, down));
			psi.push(THREE.MathUtils.radToDeg(Math.atan2(down, back)));
		});
		return {
			lens,
			psi
		};
	};
	const pa = [.178, tAt$1(.178, -.055)];
	const pb = [.19, tAt$1(.19, -.072)];
	const ps = F.pectShape ? {
		twist: deg$1(F.pectShape.twist),
		flare: deg$1(F.pectShape.flare),
		cup: deg$1(F.pectShape.cup)
	} : FLAT$1;
	const pt = F.pectTips ? fromTips(pa, pb, F.pectTips, F.pectBeta ?? 25, ps) : null;
	const pi = F.pectImg && pt ? pectFromImage(pt.lens[0], pt.psi[0]) : null;
	const pect = [1, -1].map((side) => pi ? {
		...pelvicFin$1(side, pa, pb, pi.lens, pi.psi, pi.psi.map((v) => .38 * v - 9), F.pectBeta ?? 25, 0, "pectoral", ps, pi.bend),
		hug: true
	} : pt ? pelvicFin$1(side, pa, pb, pt.lens, pt.psi, pt.psi.map((v) => 4 + .3 * v), F.pectBeta ?? 25, 5, "pectoral", ps) : pelvicFin$1(side, pa, pb, F.pect, [
		3,
		6,
		9,
		12,
		15,
		18,
		21,
		24,
		27,
		30,
		33,
		36,
		39
	], [
		6,
		7,
		8,
		9,
		10,
		11,
		12,
		13,
		14,
		15,
		16,
		17,
		18
	], 48, 6, "pectoral"));
	const qa = [.4, .07];
	const qb = [.415, .025];
	const qt = F.pelvTips ? fromTips(qa, qb, F.pelvTips, F.pelvBeta ?? 25) : null;
	return {
		dorsal,
		anal,
		caudal,
		pect,
		pelv: [1, -1].map((side) => qt ? pelvicFin$1(side, qa, qb, qt.lens, qt.psi, qt.psi.map((v) => 4 + .25 * v), F.pelvBeta ?? 25, 5) : pelvicFin$1(side, qa, qb, F.pelv, [
			16,
			20,
			24,
			28,
			31,
			34,
			37,
			40,
			43
		], [
			6,
			7,
			8,
			9,
			10,
			11,
			12,
			13,
			14
		], 32, 6))
	};
}
function pectFromImage(L0, psi0) {
	const P = PECT_IMG;
	const n = P.tips.length;
	const rot = deg$1(psi0);
	const lens = [];
	const psi = [];
	const bend = [];
	for (let i = 0; i < n; i++) {
		const u = i / (n - 1);
		const cx = P.tips[i][0] - P.base[0] * u;
		const cy = P.tips[i][1] - P.base[1] * u;
		const k = deg$1(P.bend) * Math.pow(1 - u, P.bendP);
		const b = bentRay(k, 12);
		lens.push(Math.hypot(cx, cy) * L0 * b.scale);
		psi.push(THREE.MathUtils.radToDeg(Math.atan2(cy, cx) + rot - b.off));
		bend.push(k);
	}
	return {
		lens,
		psi,
		bend
	};
}
function pectUV(fin) {
	const P = PECT_IMG;
	const n = fin.n;
	const seg = fin.seg;
	const ey = [-P.ex[1], P.ex[0]];
	const ray = [];
	for (let i = 0; i < n; i++) {
		const u = i / (n - 1);
		const bx = P.base[0] * u;
		const by = P.base[1] * u;
		const cx = P.tips[i][0] - bx;
		const cy = P.tips[i][1] - by;
		const k = deg$1(P.bend) * Math.pow(1 - u, P.bendP);
		const b = bentRay(k, seg);
		const a0 = Math.atan2(cy, cx) - b.off;
		const step = Math.hypot(cx, cy) * b.scale / seg;
		let x = bx;
		let y = by;
		const pts = [[x, y]];
		for (let r = 1; r <= seg; r++) {
			const sm = (r - .5) / seg;
			const a = a0 + k * (sm * sm - 1 / 3);
			x += step * Math.cos(a);
			y += step * Math.sin(a);
			pts.push([x, y]);
		}
		ray.push(pts);
	}
	const rows = seg + 1;
	const cols = 2 * n - 1;
	const uv = new Float32Array(cols * rows * 2);
	for (let c = 0; c < cols; c++) for (let r = 0; r <= seg; r++) {
		const i0 = Math.floor(c / 2);
		const i1 = Math.min(n - 1, Math.ceil(c / 2));
		const x = (ray[i0][r][0] + ray[i1][r][0]) / 2;
		const y = (ray[i0][r][1] + ray[i1][r][1]) / 2;
		const px = P.bt[0] + P.len * (x * P.ex[0] + y * ey[0]);
		const py = P.bt[1] + P.len * (x * P.ex[1] + y * ey[1]);
		const k = c * rows + r;
		uv[k * 2] = px / P.size[0];
		uv[k * 2 + 1] = 1 - py / P.size[1];
	}
	fin.geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}
function finUV$1(fin) {
	const pos = fin.geo.getAttribute("position");
	const uv = new Float32Array(pos.count * 2);
	for (let i = 0; i < pos.count; i++) {
		const [a, b] = uvOf$1(SNOUT$1 - pos.getX(i), pos.getY(i));
		uv[i * 2] = a;
		uv[i * 2 + 1] = b;
	}
	fin.geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}
function buildOikawa(length, sex) {
	useForm(sex);
	const u = sharedUniforms$1();
	const tex = textures$1(sex);
	const matBody = bodyMaterial$1(u, tex, "body");
	const matGill = bodyMaterial$1(u, tex, "gill");
	const matMouth = mouthMaterial$1(u);
	const matEye = eyeMaterial$1(u, photoTex$1[sex]?.eye ?? null);
	const { dorsal, anal, caudal, pect, pelv } = makeFins$1(sex);
	const look = LOOKS$1[sex];
	const ph = !!tex.fins;
	const matDorsal = finMaterial$1(u, tex, look.dorsal, dorsal.fin.n, false, ph ? "alpha" : null);
	const matAnal = finMaterial$1(u, tex, look.anal, anal.fin.n, false, ph ? "alpha" : null);
	const matCaudal = finMaterial$1(u, tex, look.caudal, caudal.fin.n, true, ph ? "alpha" : null);
	const matPelv = finMaterial$1(u, ph ? tex : null, {
		...look.pelvic,
		alpha: ph ? .62 : look.pelvic.alpha
	}, pelv[0].fin.n, false, ph ? "solid" : null, .12);
	const pimg = !!tex.pect && !!FINS$1[sex].pectImg;
	const matPect = pimg ? finMaterial$1(u, {
		...tex,
		fins: tex.pect
	}, look.pectoral, pect[0].fin.n, false, "alpha", .18) : finMaterial$1(u, ph ? tex : null, {
		...look.pectoral,
		alpha: ph ? .72 : look.pectoral.alpha
	}, pect[0].fin.n, false, ph ? "solid" : null, .18);
	poseRim$1(dorsal, 0, 0, STILL$2);
	dorsal.fin.commit(true);
	poseRim$1(anal, 0, 0, STILL$2);
	anal.fin.commit(true);
	poseCaudal$1(caudal, 0, 0, STILL$2);
	caudal.fin.commit(true);
	for (const f of [
		dorsal.fin,
		anal.fin,
		caudal.fin
	]) finUV$1(f);
	for (const p of pect) {
		posePelvic$1(p, 1, 0, 0, 0, 0);
		p.fin.commit(true);
	}
	for (const p of pelv) {
		posePelvic$1(p, 1, 0, 0, 0, 0);
		p.fin.commit(true);
	}
	for (const p of [...pect, ...pelv]) finUV$1(p.fin);
	if (pimg) for (const p of pect) pectUV(p.fin);
	const eyes = [1, -1].map((s) => buildEye$1(s));
	const eyesLo = [1, -1].map((s) => buildEye$1(s, 12, 8));
	const root = new THREE.Group();
	const lod = new THREE.LOD();
	lod.scale.setScalar(length);
	lod.rotation.y = -Math.PI / 2;
	const camWorld = v3$1();
	const camLocal = v3$1(0, 0, 3);
	const inv = new THREE.Matrix4();
	const level = (b, light) => {
		const g = new THREE.Group();
		const body = new THREE.Mesh(b.body, matBody);
		g.add(body);
		g.add(new THREE.Mesh(b.gill, matGill));
		if (!light) g.add(new THREE.Mesh(b.mouth, matMouth));
		for (const e of light ? eyesLo : eyes) g.add(new THREE.Mesh(e.geo, matEye));
		const finMats = [
			[dorsal.fin, matDorsal],
			[anal.fin, matAnal],
			[caudal.fin, matCaudal],
			...pelv.map((p) => [p.fin, matPelv])
		];
		for (const [f, mat] of finMats) {
			const m = new THREE.Mesh(f.geo, mat);
			m.renderOrder = 1;
			g.add(m);
		}
		for (const p of pect) {
			const m = new THREE.Mesh(p.fin.geo, matPect);
			m.renderOrder = 2;
			g.add(m);
		}
		g.traverse((o) => o.frustumCulled = false);
		body.onBeforeRender = (_r, _s, cam) => {
			camWorld.setFromMatrixPosition(cam.matrixWorld);
			body.updateWorldMatrix(true, false);
			camLocal.copy(camWorld).applyMatrix4(inv.copy(body.matrixWorld).invert());
		};
		return g;
	};
	const { hi, lo } = bodies$1(sex);
	lod.addLevel(level(hi, false), 0);
	const loDist = 2.5 + length * 8;
	lod.addLevel(level(lo, true), loDist, .1);
	root.add(lod);
	const pectStroke = {
		ph: 0,
		amp: 0,
		sweep: 0
	};
	const st = {
		finClock: 0,
		tilt: 0,
		fold: .2,
		steer: 0,
		wobble: 0,
		pect: .15,
		whim: 0,
		flut: 0,
		flag: 0,
		seed: Math.random(),
		look: 0,
		every: 1,
		tick: Math.floor(Math.random() * 30),
		time: 0,
		lastTime: -1,
		ribAmp: .08,
		ribPhase: Math.random() * 10,
		ribWaves: .9,
		ribExt: false,
		wave: {
			cyc: 0,
			amp: 0,
			head: 1,
			power: 0,
			env: u.uEnv.value,
			lam: u.uLam.value
		},
		sway: {
			body: null,
			idle: 0,
			idlePh: 0,
			idleWaves: 1,
			flut: 0,
			t: 0
		},
		pectPh: [Math.random() * 10, Math.random() * 10],
		pectAmp: .15,
		pectOpen: .75,
		pectExt: false,
		pectTurn: 0,
		pelvOpen: .85,
		cup: 0,
		trail: .15
	};
	const eyeR = new THREE.Matrix4();
	const eyeRx = new THREE.Matrix4();
	const posePose = (time) => {
		useForm(sex);
		const full = lod.levels[0].object.visible;
		const c = st.finClock;
		const seed = st.seed;
		const foldOf = (id) => {
			const fhz = lerp$1(.2, .5, fh(id * 9 + seed * 13));
			const fph = Math.PI * 2 * (fhz * c + fh(id * 4 + seed * 3));
			let f = st.fold + st.wobble * (.7 * Math.sin(fph) + .3 * Math.sin(2.6 * fph + .8));
			f += st.whim * finWhim(id + seed * 3.1, c);
			return clamp$2(f, 0, 1);
		};
		const tiltOf = (id, side) => {
			const mhz = lerp$1(.3, .6, fh(id * 5 + seed * 11));
			const mph = Math.PI * 2 * (mhz * c + fh(id * 3 + seed * 5));
			return side * (st.tilt * (Math.sin(mph) + .5 * Math.sin(2.3 * mph + 1.1)) + st.steer);
		};
		const fl = st.flut * .6 + st.flag * .18;
		const bw = st.wave;
		bw.cyc = u.uSwim.value.x;
		bw.amp = u.uSwim.value.y;
		bw.head = u.uHead.value;
		bw.power = u.uPower.value;
		const idle = st.ribAmp * (.6 + .4 * Math.sin(time * .31 + seed * 11));
		const sw = st.sway;
		sw.body = bw;
		sw.idle = idle;
		sw.idlePh = st.ribPhase;
		sw.idleWaves = st.ribWaves;
		sw.flut = fl;
		sw.t = c + seed * 10;
		poseRim$1(dorsal, foldOf(.11), tiltOf(.11, 1), sw);
		dorsal.fin.commit();
		sw.idlePh = st.ribPhase + Math.PI;
		sw.flut = fl * .8;
		sw.t = c * .9 + seed * 7;
		poseRim$1(anal, foldOf(.37), tiltOf(.37, -1), sw);
		anal.fin.commit();
		const tailFold = clamp$2(foldOf(.63) * .6 + st.fold * .4, 0, 1);
		sw.idlePh = st.ribPhase + 1.1;
		sw.flut = fl * .6;
		sw.t = c * 1.1 + seed * 5;
		poseCaudal$1(caudal, smooth$1(tailFold, .65, 1), st.cup, sw);
		caudal.fin.commit();
		pect.forEach((p, k) => {
			const open = clamp$2(st.pectOpen + st.pectTurn * p.side, .05, 1);
			pectStroke.ph = st.pectPh[k];
			pectStroke.amp = st.pectAmp;
			pectStroke.sweep = .9 * st.pectAmp;
			posePelvic$1(p, open, .05, c + seed * 3 + k, fl * .35, k * 1.7, 0, pectStroke);
			p.fin.commit();
		});
		if (full) pelv.forEach((p, k) => {
			const open = clamp$2(st.pelvOpen + .06 * Math.sin(time * 1.3 + k * 2.1 + seed * 9), 0, 1);
			sw.idle = idle * 2;
			sw.idlePh = st.ribPhase * .9;
			sw.flut = fl * .5;
			sw.t = c + k * .8 + seed * 4;
			posePelvic$1(p, open, st.trail, c + k * .8, fl * .5, k * 2.3, 0, null, sw);
			p.fin.commit();
		});
		if (full) for (const e of eyes) {
			const id = seed * 7.13 + (e.side > 0 ? 0 : 3.7);
			const g0 = eyeJump(id, .5 + 1.2 * fh(id), time);
			const g1 = eyeJump(id + 5.3, .25 + .4 * fh(id + 2), time);
			let fwd = (g0[0] + .3 * g1[0]) * .5;
			let up = (g0[1] + .3 * g1[1]) * .28;
			if (st.look > 0) {
				const dl = camLocal.clone().sub(e.center);
				const sideD = dl.z * e.side;
				const hz = Math.hypot(dl.x, sideD);
				const lw = st.look * smooth$1(sideD / Math.max(dl.length(), 1e-4), 0, .35);
				fwd = lerp$1(fwd, clamp$2(Math.atan2(dl.x, sideD), -.5, .5), lw);
				up = lerp$1(up, clamp$2(Math.atan2(dl.y, hz), -.35, .35), lw);
			}
			const R = eyeR.makeRotationY(e.side * -fwd).multiply(eyeRx.makeRotationX(-e.side * up)).elements;
			const pa2 = e.geo.getAttribute("position");
			const nr = e.geo.getAttribute("normal");
			const P = pa2.array;
			const N2 = nr.array;
			const { local: L, localN: N, center: C } = e;
			for (let i = 0; i < pa2.count * 3; i += 3) {
				const x = L[i];
				const y = L[i + 1];
				const z = L[i + 2];
				P[i] = R[0] * x + R[4] * y + R[8] * z + C.x;
				P[i + 1] = R[1] * x + R[5] * y + R[9] * z + C.y;
				P[i + 2] = R[2] * x + R[6] * y + R[10] * z + C.z;
				const a = N[i];
				const b = N[i + 1];
				const c2 = N[i + 2];
				N2[i] = R[0] * a + R[4] * b + R[8] * c2;
				N2[i + 1] = R[1] * a + R[5] * b + R[9] * c2;
				N2[i + 2] = R[2] * a + R[6] * b + R[10] * c2;
			}
			pa2.needsUpdate = true;
			nr.needsUpdate = true;
		}
	};
	posePose(0);
	const mouthMax = .5;
	return {
		root,
		shadows: [],
		detail(on) {
			const l = lod.levels[1];
			if (l) l.distance = on ? loDist : 0;
		},
		uniforms: u,
		shade(_opacity) {},
		swim(phase, amp, bend = 0, time = performance.now() / 1e3) {
			const cyc = phase / (Math.PI * 2);
			const dt = st.lastTime < 0 ? 0 : clamp$2(time - st.lastTime, 0, .1);
			st.lastTime = time;
			if (!st.pectExt) {
				st.pectPh[0] += dt * Math.PI * 2 * 2.5;
				st.pectPh[1] += dt * Math.PI * 2 * 2.5;
			}
			if (!st.ribExt) st.ribPhase += dt * Math.PI * 2 * .7 * (1 + .3 * Math.sin(time * .23 + st.seed * 7));
			u.uTime.value = time;
			u.uSwim.value.set(cyc, amp, clamp$2(bend * length, -1.6, 1.6), 0);
			if (++st.tick >= st.every) {
				st.tick = 0;
				posePose(time);
			}
		},
		pectoral(phL, phR = 0, amp = .35, open = .75, turn = 0) {
			st.pectTurn = turn;
			st.pectExt = phL !== null;
			if (phL !== null) {
				st.pectPh[0] = phL;
				st.pectPh[1] = phR;
			}
			st.pectAmp = amp;
			st.pectOpen = open;
		},
		ribbon(amp, phase, waves = 1.6) {
			st.ribAmp = amp;
			st.ribExt = phase !== null;
			if (phase !== null) st.ribPhase = phase;
			st.ribWaves = waves;
		},
		pelvic(open, trail = .15, cup = 0) {
			st.pelvOpen = open;
			st.trail = trail;
			st.cup = cup;
		},
		finEvery(n) {
			st.every = Math.max(1, Math.round(n));
		},
		lieOnFloor(up) {
			u.uFloor.value = up;
		},
		lookAtViewer(amount) {
			st.look = amount;
		},
		air(_amount) {},
		finMove(clock, tilt, fold, steer, wobble = 0, pect = 0, whim = 0) {
			st.finClock = clock;
			st.tilt = tilt;
			st.fold = fold;
			st.steer = steer;
			st.wobble = wobble;
			st.whim = whim;
			if (!st.pectExt) {
				st.pectOpen = clamp$2(.02 + pect * 1.2, .02, 1);
				st.pectAmp = .03 + .3 * st.pectOpen;
			}
		},
		mouth(open) {
			u.uMouth.value = clamp$2(open, 0, mouthMax);
		},
		mouthMax,
		gill(open) {
			u.uGill.value = clamp$2(open, 0, .32);
		},
		flutter(clock, amp, flag = 0, seed = 0) {
			st.finClock = clock;
			st.flut = amp;
			st.flag = flag;
		},
		flex(neck, from, to, cBend, head, power = 0) {
			u.uNeck.value.set(neck, from, to, clamp$2(cBend, -4, 4) * length);
			u.uHead.value = head;
			u.uPower.value = power;
		}
	};
}
function oikawaStats() {
	const { hi, lo } = bodies$1("female");
	const tri = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
	const parts = (b) => tri(b.body) + tri(b.gill) + tri(b.mouth);
	return {
		hi: parts(hi),
		lo: parts(lo),
		texture: `${TEX_W$1}×${TEX_H$1}`
	};
}
var SNOUT = .47;
var D_END = .85;
var deg = THREE.MathUtils.degToRad;
var lerp = THREE.MathUtils.lerp;
var clamp$1 = THREE.MathUtils.clamp;
var v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
var mx = (d) => SNOUT - d;
var Y_TIP = 0;
var TOP = curve([
	[0, 0],
	[.002, .005],
	[.005, .009],
	[.01, .0127],
	[.015, .0164],
	[.02, .0201],
	[.03, .0257],
	[.04, .03],
	[.05, .0337],
	[.06, .0366],
	[.07, .0393],
	[.08, .0418],
	[.1, .0465],
	[.12, .0505],
	[.14, .0542],
	[.16, .0573],
	[.18, .0602],
	[.2, .0628],
	[.23, .0664],
	[.26, .0684],
	[.3, .0709],
	[.34, .0726],
	[.38, .0734],
	[.42, .0735],
	[.46, .0715],
	[.5, .0684],
	[.54, .0641],
	[.58, .0598],
	[.62, .0552],
	[.66, .0498],
	[.7, .0449],
	[.73, .041],
	[.76, .0368],
	[.78, .0335],
	[.8, .031],
	[.82, .0295],
	[.84, .029],
	[.85, .0295]
]);
var BOT = curve([
	[0, 0],
	[.002, -.0152],
	[.005, -.0189],
	[.01, -.0226],
	[.015, -.0251],
	[.02, -.0282],
	[.03, -.0328],
	[.04, -.0365],
	[.05, -.0396],
	[.06, -.0424],
	[.07, -.0449],
	[.08, -.0474],
	[.1, -.0523],
	[.12, -.0557],
	[.14, -.0585],
	[.16, -.061],
	[.18, -.0628],
	[.2, -.0644],
	[.23, -.0663],
	[.26, -.0678],
	[.3, -.069],
	[.34, -.069],
	[.38, -.0684],
	[.42, -.068],
	[.46, -.0666],
	[.5, -.0641],
	[.54, -.0616],
	[.58, -.0594],
	[.62, -.0554],
	[.66, -.0505],
	[.7, -.0445],
	[.73, -.04],
	[.76, -.0362],
	[.78, -.0344],
	[.8, -.0322],
	[.82, -.031],
	[.84, -.0312],
	[.85, -.0325]
]);
var HW = curve([
	[0, 0],
	[.004, .007],
	[.01, .011],
	[.02, .016],
	[.04, .023],
	[.06, .028],
	[.09, .034],
	[.13, .039],
	[.18, .043],
	[.25, .046],
	[.32, .047],
	[.4, .046],
	[.48, .043],
	[.56, .038],
	[.64, .031],
	[.7, .025],
	[.75, .019],
	[.79, .0135],
	[.815, .0085],
	[.83, .005],
	[.84, .0025],
	[.845, .001],
	[.85, 0]
]);
var T0 = curve([
	[0, .5],
	[.1, .47],
	[.3, .46],
	[.6, .48],
	[.85, .5]
]);
var P_TOP = curve([
	[0, .55],
	[.08, .55],
	[.2, .58],
	[.4, .62],
	[.6, .75],
	[.85, 1]
]);
var P_BOT = curve([
	[0, .55],
	[.1, .55],
	[.2, .58],
	[.4, .62],
	[.6, .75],
	[.85, 1]
]);
var MOUTH$1 = {
	corner: .045,
	joint: [.064, -.033],
	throat: .08
};
var LIP = curve([
	[0, 0],
	[.004, -.005],
	[.008, -.0068],
	[.015, -.0072],
	[.025, -.0072],
	[.035, -.007],
	[.045, -.0075]
]);
var EYE = {
	d: .0755,
	y: .003,
	r: .026
};
var CAUDAL = {
	mid: .067,
	up: .106,
	lo: .111,
	aUp: 21.5,
	aLo: 25.5,
	spread: .028
};
var TAIL_YC = (TOP(D_END) + BOT(D_END)) / 2;
var GILL_LINES = {
	hinge: [
		[.128, .035],
		[.132, .02],
		[.134, .005],
		[.133, -.01],
		[.13, -.025],
		[.124, -.037],
		[.114, -.045],
		[.102, -.049],
		[.09, -.05]
	],
	edge: [
		[.15, .036],
		[.167, .033],
		[.179, .0277],
		[.1915, .0165],
		[.2, .004],
		[.2063, -.0083],
		[.2094, -.0194],
		[.21, -.0293],
		[.2085, -.04],
		[.203, -.05],
		[.192, -.057],
		[.176, -.0605],
		[.158, -.061],
		[.14, -.059],
		[.12, -.055],
		[.104, -.051]
	]
};
var FINS = {
	dorsal: {
		d0: .432,
		d1: .51,
		tips: [
			[.502, .154],
			[.507, .153],
			[.511, .1515],
			[.517, .14],
			[.52, .125],
			[.5235, .1105],
			[.529, .0973],
			[.533, .088],
			[.54, .079],
			[.549, .0695]
		]
	},
	anal: {
		d0: .608,
		d1: .735,
		tips: [
			[.6489, -.1098],
			[.657, -.103],
			[.6644, -.0959],
			[.6737, -.0866],
			[.683, -.0773],
			[.6954, -.0695],
			[.7077, -.0633],
			[.72, -.0555],
			[.7325, -.0494],
			[.743, -.0455],
			[.75, -.0432],
			[.755, -.041]
		]
	},
	pect: [],
	pelv: [],
	pectTips: [
		[.2851, -.1162],
		[.2935, -.1155],
		[.2979, -.1129],
		[.3006, -.1098],
		[.3032, -.1062],
		[.3054, -.1027],
		[.3081, -.0961],
		[.3103, -.0908],
		[.3121, -.0855],
		[.3134, -.0801],
		[.3138, -.0744],
		[.3134, -.0687]
	],
	pelvTips: [
		[.4539, -.1407],
		[.4632, -.1299],
		[.4709, -.1222],
		[.477, -.1129],
		[.4833, -.1036],
		[.4879, -.0959],
		[.491, -.0866],
		[.4926, -.08]
	],
	pelvBeta: 25
};
function sec(d) {
	return {
		top: TOP(d),
		bot: BOT(d),
		hw: Math.max(0, HW(d)),
		t0: T0(d),
		pt: P_TOP(d),
		pb: P_BOT(d)
	};
}
function surfZ(d, t) {
	const s = sec(d);
	const tt = t < s.t0 ? .5 * t / s.t0 : .5 + .5 * (t - s.t0) / (1 - s.t0);
	const p = t < s.t0 ? s.pb : s.pt;
	return s.hw * Math.pow(Math.max(0, Math.sin(Math.PI * clamp$1(tt, 0, 1))), p);
}
function surfZAt(d, y) {
	if (d <= 0 || d >= D_END) return 0;
	const s = sec(d);
	const t = (y - s.bot) / Math.max(1e-6, s.top - s.bot);
	if (t <= 0 || t >= 1) return 0;
	return surfZ(d, t);
}
var tAt = (d, y) => (y - BOT(d)) / (TOP(d) - BOT(d));
function seamT(d) {
	const s = sec(d);
	const h = Math.max(1e-6, s.top - s.bot);
	const c = MOUTH$1.corner;
	const [jd, jy] = MOUTH$1.joint;
	let y;
	if (d <= c) y = LIP(d);
	else if (d <= jd) y = lerp(LIP(c), jy, (d - c) / (jd - c));
	else return lerp((jy - BOT(jd)) / (TOP(jd) - BOT(jd)), .45, smooth$1(d, jd, jd + .1));
	return clamp$1((y - s.bot) / h, .05, .95);
}
function jawWeight(d, b, lowerCopy) {
	const c = MOUTH$1.corner;
	const jd = MOUTH$1.joint[0];
	if (d < c) {
		const near = lowerCopy || b > 0 ? smooth$1(d, c, c - .014) : 0;
		return b > .25 ? 1 : lerp(near, 1, b / .25);
	}
	return smooth$1(b, 0, .3) * (1 - smooth$1(d, jd - .005, jd + .035)) * (d < jd ? 1 : .6 + .4 * (1 - b));
}
function gillInner(g) {
	const at = (k, u) => {
		const f = u * (k.length - 1);
		const i = Math.min(k.length - 2, Math.floor(f));
		const w = f - i;
		return [lerp(k[i][0], k[i + 1][0], w), lerp(k[i][1], k[i + 1][1], w)];
	};
	const N = 14;
	const front = [];
	const back = [];
	for (let i = 0; i <= N; i++) {
		const u = .06 + .56 * (i / N);
		const h = at(g.hinge, u);
		const e = at(g.edge, u);
		front.push([lerp(h[0], e[0], .4), lerp(h[1], e[1], .4)]);
		back.push([lerp(h[0], e[0], .84), lerp(h[1], e[1], .84)]);
	}
	return [...front, ...back.reverse()];
}
var TEX = {
	d0: -.02,
	d1: 1.02,
	y0: -.29,
	y1: .27
};
var TEX_W = 2048;
var TEX_H = 1104;
var uvOf = (d, y) => [(d - TEX.d0) / (TEX.d1 - TEX.d0), (y - TEX.y0) / (TEX.y1 - TEX.y0)];
function buildBody(cu, cl, nTip, step, gl) {
	const GILL_INNER = gillInner(gl);
	const ds = [];
	for (let k = 1; k <= nTip; k++) ds.push(.1 * Math.pow(k / nTip, 2));
	for (let d = .1 + step; d < .849999; d += step) ds.push(d);
	ds.push(D_END);
	for (const extra of [MOUTH$1.corner, MOUTH$1.joint[0]]) if (!ds.some((d) => Math.abs(d - extra) < 1e-4)) ds.push(extra);
	ds.sort((a, b) => a - b);
	const pos = [];
	const uv = [];
	const jaw = [];
	const gillMask = [];
	const idx = [];
	const add = (x, y, z, d, w) => {
		pos.push(x, y, z);
		uv.push(...uvOf(d, y));
		jaw.push(w);
		gillMask.push(inPoly(GILL_INNER, d, y) ? 1 : 0);
		return pos.length / 3 - 1;
	};
	const C = cu + cl;
	const rings = [];
	const tipUp = add(SNOUT, Y_TIP, 0, 0, 0);
	const tipLo = add(SNOUT, Y_TIP, 0, 0, 1);
	const seamInfo = [];
	for (const d of ds) {
		const s = sec(d);
		const ts = seamT(d);
		const split = d < MOUTH$1.corner - 1e-6;
		const up = [[], []];
		const lo = [[], []];
		for (let side = 0; side < 2; side++) {
			const sg = side === 0 ? 1 : -1;
			for (let j = 0; j <= C; j++) {
				if (side === 1 && (j === 0 || j === C)) {
					if (j === 0) up[1][0] = up[0][0];
					else lo[1][j - cu] = lo[0][j - cu];
					continue;
				}
				let t;
				if (j <= cu) t = ts + (1 - ts) * Math.sin(Math.PI / 2 * (1 - j / cu));
				else t = ts * (1 - Math.sin(Math.PI / 2 * ((j - cu) / cl)));
				const y = s.bot + t * (s.top - s.bot);
				let z = sg * surfZ(d, t);
				const near = Math.abs(j - cu);
				const mouthK = 1 - smooth$1(d, MOUTH$1.corner, MOUTH$1.corner + .02);
				if (near <= 1) z *= 1 - mouthK * (near === 0 ? .1 : .03);
				const x = mx(d);
				if (j < cu) up[side][j] = add(x, y, z, d, 0);
				else if (j > cu) lo[side][j - cu] = add(x, y, z, d, jawWeight(d, (j - cu) / cl, true));
				else {
					up[side][j] = add(x, y, z, d, 0);
					lo[side][0] = split ? add(x, y, z, d, jawWeight(d, 0, true)) : up[side][j];
					if (side === 0 && d <= MOUTH$1.throat + 1e-6) seamInfo.push({
						d,
						y,
						z: Math.abs(z)
					});
				}
			}
		}
		rings.push({
			up,
			lo
		});
	}
	const quad = (a, b, c, e) => idx.push(a, b, c, a, c, e);
	const r0 = rings[0];
	for (let side = 0; side < 2; side++) {
		const flip = side === 0;
		for (let j = 0; j < cu; j++) {
			const a = r0.up[side][j];
			const b = r0.up[side][j + 1];
			if (flip) idx.push(tipUp, a, b);
			else idx.push(tipUp, b, a);
		}
		for (let j = 0; j < cl; j++) {
			const a = r0.lo[side][j];
			const b = r0.lo[side][j + 1];
			if (flip) idx.push(tipLo, a, b);
			else idx.push(tipLo, b, a);
		}
	}
	for (let i = 0; i < rings.length - 1; i++) {
		const A = rings[i];
		const B = rings[i + 1];
		for (let side = 0; side < 2; side++) {
			const flip = side === 0;
			const strip = (ca, cb) => {
				for (let j = 0; j < ca.length - 1; j++) if (flip) quad(ca[j], cb[j], cb[j + 1], ca[j + 1]);
				else quad(ca[j], ca[j + 1], cb[j + 1], cb[j]);
			};
			strip(A.up[side], B.up[side]);
			strip(A.lo[side], B.lo[side]);
		}
	}
	const last = rings[rings.length - 1];
	const ringPts = [
		...last.up[0],
		...last.lo[0].slice(1),
		...[...last.lo[1]].reverse().slice(1),
		...[...last.up[1]].reverse().slice(1, -1)
	];
	const cEnd = add(mx(D_END), (TOP(D_END) + BOT(D_END)) / 2, 0, D_END, 0);
	for (let j = 0; j < ringPts.length; j++) idx.push(cEnd, ringPts[(j + 1) % ringPts.length], ringPts[j]);
	const body = new THREE.BufferGeometry();
	body.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	body.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
	body.setAttribute("aJaw", new THREE.Float32BufferAttribute(jaw, 1));
	body.setAttribute("aGill", new THREE.Float32BufferAttribute(gillMask, 1));
	body.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0), 1));
	body.setIndex(idx);
	body.computeVertexNormals();
	{
		const nr = body.getAttribute("normal");
		const p = body.getAttribute("position");
		for (let i = 0; i < nr.count; i++) {
			const k = smooth$1(SNOUT - p.getX(i), .72, D_END);
			if (k <= 0) continue;
			const nx = nr.getX(i) * (1 - k);
			const ny = nr.getY(i) * (1 - .6 * k);
			const nz = nr.getZ(i);
			const l = Math.hypot(nx, ny, nz) || 1;
			nr.setXYZ(i, nx / l, ny / l, nz / l);
		}
	}
	return {
		body,
		mouth: buildMouth(seamInfo),
		gill: buildGill(gl)
	};
}
function buildMouth(seam) {
	const K = 10;
	const pos = [];
	const jaw = [];
	const idx = [];
	const rows = [];
	const cornerSeam = seam.filter((s) => s.d <= MOUTH$1.corner + 1e-6).slice(-1)[0];
	const stations = [{
		d: 0,
		y: Y_TIP,
		z: 0
	}, ...seam.filter((s) => s.d <= MOUTH$1.corner + 1e-6)];
	for (let k = 1; k <= 5; k++) {
		const u = k / 5;
		const d = MOUTH$1.corner + (MOUTH$1.throat - MOUTH$1.corner) * u;
		stations.push({
			d,
			y: cornerSeam.y + .004 * u,
			z: cornerSeam.z * Math.sqrt(1 - u) * .7
		});
	}
	for (const st of stations) {
		const s = sec(Math.max(st.d, 1e-4));
		const u = st.d > MOUTH$1.corner + 1e-6 ? (st.d - MOUTH$1.corner) / (MOUTH$1.throat - MOUTH$1.corner) : 0;
		const fade = smooth$1(st.d, 0, .012);
		const hp = Math.min(.5 * (s.top - st.y), .012) * fade * (1 - u * .6);
		const hf = Math.min(.5 * (st.y - s.bot), .012) * fade * (1 - u * .6);
		const row = [];
		for (let part = 0; part < 2; part++) {
			const roof = part === 0;
			for (let k = 0; k <= K; k++) {
				const a = Math.PI * k / K;
				const side = roof ? Math.cos(a) : -Math.cos(a);
				const z = st.z * side * (k === 0 || k === K ? 1 : .94);
				const y = roof ? st.y + hp * Math.sin(a) : st.y - hf * Math.sin(a);
				pos.push(mx(st.d), y, z);
				jaw.push(roof ? 0 : jawWeight(Math.max(st.d, 1e-4), .6 * Math.sin(a), true));
				row.push(pos.length / 3 - 1);
			}
		}
		rows.push(row);
	}
	for (let i = 0; i < rows.length - 1; i++) {
		const A = rows[i];
		const B = rows[i + 1];
		for (let k = 0; k < 21; k++) {
			if (k === K) continue;
			idx.push(A[k], B[k], B[k + 1], A[k], B[k + 1], A[k + 1]);
		}
	}
	const L = rows[rows.length - 1];
	const st = stations[stations.length - 1];
	pos.push(mx(st.d) - .003, st.y, 0);
	jaw.push(0);
	const c = pos.length / 3 - 1;
	for (let k = 0; k < 21; k++) if (k !== K) idx.push(L[k], c, L[k + 1]);
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute("aJaw", new THREE.Float32BufferAttribute(jaw, 1));
	g.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(3), 1));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}
function buildGill(gl) {
	const NA = 9;
	const NB = 18;
	const pick = (keys, b) => {
		const f = b * (keys.length - 1);
		const i = Math.min(keys.length - 2, Math.floor(f));
		const u = f - i;
		const p0 = keys[Math.max(0, i - 1)];
		const p1 = keys[i];
		const p2 = keys[i + 1];
		const p3 = keys[Math.min(keys.length - 1, i + 2)];
		const cr = (a, b2, c, e) => .5 * (2 * b2 + (-a + c) * u + (2 * a - 5 * b2 + 4 * c - e) * u * u + (-a + 3 * b2 - 3 * c + e) * u * u * u);
		return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
	};
	const pos = [];
	const uv = [];
	const fw = [];
	const idx = [];
	for (let side = 0; side < 2; side++) {
		const sg = side === 0 ? 1 : -1;
		const base = pos.length / 3;
		const cols = 11;
		for (let ib = 0; ib <= NB; ib++) {
			const b = ib / NB;
			const h = pick(gl.hinge, b);
			const e = pick(gl.edge, b);
			const span = Math.hypot(e[0] - h[0], e[1] - h[1]);
			for (let ia = 0; ia <= 10; ia++) {
				const rim = ia === 10;
				const a = rim ? 1 : ia / NA;
				const d = h[0] + (e[0] - h[0]) * a;
				let y = h[1] + (e[1] - h[1]) * a;
				const s = sec(d);
				y = clamp$1(y, s.bot + .008, s.top - .006);
				const z0 = surfZAt(d, y);
				const lift = rim ? 3e-4 : 6e-4 + .0018 * Math.pow(a, .7);
				pos.push(mx(d), y, sg * (z0 + lift));
				uv.push(...uvOf(d, y));
				fw.push(span * a);
			}
		}
		for (let ib = 0; ib < NB; ib++) for (let ia = 0; ia < 10; ia++) {
			const a = base + ib * cols + ia;
			const b = a + 1;
			const c = a + cols + 1;
			const e = a + cols;
			if (sg > 0) idx.push(a, b, c, a, c, e);
			else idx.push(a, c, b, a, e, c);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
	g.setAttribute("aFw", new THREE.Float32BufferAttribute(fw, 1));
	g.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(7), 1));
	g.setAttribute("aGill", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0), 1));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}
function rayFin(name, dir, t, spines, seg) {
	const n = t.tips ? t.tips.length : t.lens.length;
	const rays = [];
	const ds = [];
	const ang = [];
	for (let i = 0; i < n; i++) {
		const u = i / (n - 1);
		const d = t.d0 + (t.d1 - t.d0) * (t.tips ? u : u * (1.1 - .1 * u));
		const yb = (dir > 0 ? TOP(d) : BOT(d)) - dir * .0025;
		let len;
		let a;
		if (t.tips) {
			const [td, ty] = t.tips[i];
			len = Math.hypot(td - d, ty - yb);
			a = Math.atan2(dir * (ty - yb), td - d) + .1;
		} else {
			len = t.lens[i];
			a = deg(t.angs[i]);
		}
		rays.push({
			base: v3(mx(d), yb, 0),
			len
		});
		ds.push(d);
		ang.push(a);
	}
	const fin = new Fin({
		name,
		rays,
		seg,
		branched: [spines, n - 1],
		notch: .05
	});
	fin.bulge = Array.from({ length: n - 1 }, () => new Array(seg + 1).fill(0));
	return {
		fin,
		dir,
		d: ds,
		ang,
		comp: rays.map((_, i) => rayComp(i, n, spines)),
		dz: rays.map(() => new Array(seg + 1).fill(0))
	};
}
function rayComp(i, n, spines) {
	if (i < spines) return .22 + .18 * i / Math.max(1, spines - 1);
	return .6 + .4 * (i - spines) / Math.max(1, n - 1 - spines);
}
var rayShape = (s, comp) => Math.pow(s, 1.8 + .9 * comp);
var rayLag = (s, comp) => (.5 + 1.1 * comp) * Math.pow(s, 1.2);
function bodyAmp(w, d) {
	const e = w.env;
	const tip = e.x + e.y + e.z;
	const a0 = e.x * w.head + e.y * d + e.z * d * d;
	const a1 = tip * (.25 + .75 * Math.pow(Math.max(d, 0), 1.6));
	return w.amp * lerp(a0, a1, clamp$1(w.power, 0, 1)) / tip;
}
var bodyPhase = (w, d) => Math.PI * 2 * (d / w.lam - w.cyc);
var bodyLagZ = (H, th, lag) => H * (Math.sin(th + lag) - Math.sin(th));
var BODY_BEND = 5;
var STILL$1 = {
	body: null,
	idle: 0,
	idlePh: 0,
	idleWaves: 1,
	flut: 0,
	t: 0
};
function poseRim(m, fold, tilt, sw) {
	const { fin, dir } = m;
	const n = fin.n;
	const seg = fin.seg;
	const edge = dir > 0 ? TOP : BOT;
	const lie = smooth$1(fold, .45, 1);
	const live = 1 - .8 * lie;
	const hinge = .4 * tilt;
	const ch = Math.cos(hinge);
	const sh = Math.sin(hinge);
	const tip = v3();
	const p = v3();
	const q = v3();
	for (let i = 0; i < n; i++) {
		const ray = fin.o.rays[i];
		const b = ray.base;
		const u = i / (n - 1);
		const comp = m.comp[i];
		const lay = (s, out) => {
			const dd = m.d[i] + ray.len * s * .97;
			const clear = .0015 + .003 * (1 - u) * Math.min(1, s * 3);
			const ye = dd < D_END ? edge(dd) : edge(D_END) + (dd - D_END) * (dir > 0 ? -.35 : .35);
			out.set(mx(dd), ye + dir * clear, 0);
		};
		lay(1, tip);
		const foldAng = Math.atan2(dir * (tip.y - b.y), b.x - tip.x);
		const fi = clamp$1(fold * 1.15 - .15 * u, 0, 1);
		const ang = lerp(m.ang[i], foldAng, fi);
		const H = sw.body ? bodyAmp(sw.body, m.d[i]) * BODY_BEND : 0;
		const th = sw.body ? bodyPhase(sw.body, m.d[i]) : 0;
		const idlePh = sw.idlePh - Math.PI * 2 * sw.idleWaves * u;
		for (let r = 0; r <= seg; r++) {
			const s = r / seg;
			const bend = .1 * s * s;
			const l = ray.len * s;
			p.set(b.x - l * Math.cos(ang - bend), b.y + dir * l * Math.sin(ang - bend), 0);
			if (lie > 0) {
				lay(s, q);
				p.lerp(q, lie * smooth$1(fi, .5, 1));
			}
			const h = (p.y - b.y) * dir;
			const shp = rayShape(s, comp);
			const lag = rayLag(s, comp);
			let a = H !== 0 ? bodyLagZ(H, th, lag) * comp : 0;
			a += sw.idle * comp * (Math.sin(idlePh - lag) + .35 * Math.sin(.57 * sw.idlePh + 1.7 - 3.8 * u - lag));
			a += .6 * tilt * (.6 + .4 * comp);
			let dz = a * ray.len * shp;
			dz += sw.flut * comp * s * s * Math.min(1, ray.len / .1) * Math.sin(sw.t * 7 - i * .9 - s * 3);
			dz *= live;
			m.dz[i][r] = dz;
			p.y = b.y + dir * h * ch;
			p.z = h * sh + dz;
			fin.P[i][r].copy(p);
		}
		fin.normal[i].set(0, -sh * dir, ch);
	}
	const bl = fin.bulge;
	for (let i = 0; i < n - 1; i++) for (let r = 0; r <= seg; r++) {
		const s = r / seg;
		const rip = sw.flut * .7 * smooth$1(s, .5, 1) * Math.sin(sw.t * 15 + i * 2.3 - s * 4);
		bl[i][r] = (.225 * (m.dz[i][r] + m.dz[i + 1][r]) + rip * live) * ch;
	}
}
function caudalFin() {
	const xb = .838;
	const rays = [];
	const ang = [];
	const baseY = [];
	const proc = [];
	[
		.815,
		.825,
		.835
	].forEach((d, i) => {
		rays.push({
			base: v3(mx(d), TOP(d) - .0015, 0),
			len: .03 + i * .013
		});
		ang.push(deg(12 + i * 4));
		baseY.push(TOP(d) - .0015);
		proc.push(true);
	});
	const N = 19;
	for (let i = 0; i < N; i++) {
		const k = 1 - 2 * i / 18;
		const len = CAUDAL.mid + (k > 0 ? CAUDAL.up : CAUDAL.lo) * Math.pow(Math.abs(k), 1.1);
		const y = TAIL_YC + k * CAUDAL.spread;
		rays.push({
			base: v3(mx(xb), y, 0),
			len
		});
		ang.push(deg(k > 0 ? CAUDAL.aUp : CAUDAL.aLo) * k - .05 * k + deg(.5));
		baseY.push(y);
		proc.push(false);
	}
	[
		.835,
		.825,
		.815
	].forEach((d, i) => {
		rays.push({
			base: v3(mx(d), BOT(d) + .0015, 0),
			len: .056 - i * .013
		});
		ang.push(-deg(20 - i * 4));
		baseY.push(BOT(d) + .0015);
		proc.push(true);
	});
	const fin = new Fin({
		name: "caudal",
		rays,
		seg: 14,
		branched: [4, 20],
		notch: .035
	});
	fin.bulge = Array.from({ length: rays.length - 1 }, () => new Array(15).fill(0));
	return {
		fin,
		ang,
		baseY,
		procurrent: proc,
		dz: rays.map(() => new Array(15).fill(0))
	};
}
function poseCaudal(c, close, cup, sw) {
	const { fin } = c;
	const n = fin.n;
	const seg = fin.seg;
	const { t, flut } = sw;
	const H = sw.body ? bodyAmp(sw.body, D_END) * BODY_BEND * .25 : 0;
	const th = sw.body ? bodyPhase(sw.body, D_END) : 0;
	for (let i = 0; i < n; i++) {
		const ray = fin.o.rays[i];
		const proc = c.procurrent[i];
		const ci = clamp$1(close * 1.1 - .1 * Math.abs(i - (n - 1) / 2) / ((n - 1) / 2), 0, 1);
		const a = proc ? c.ang[i] * (1 - .45 * ci) : c.ang[i] * (1 - .86 * ci);
		const by = proc ? c.baseY[i] : TAIL_YC + (c.baseY[i] - TAIL_YC) * (1 - .35 * ci);
		const bx = ray.base.x;
		const k = (c.baseY[i] - TAIL_YC) / CAUDAL.spread;
		for (let r = 0; r <= seg; r++) {
			const s = r / seg;
			const l = ray.len * s;
			const sweep = .05 * k * s * s * (1 - .7 * ci);
			const x = bx - l * Math.cos(a + sweep);
			const y = by + l * Math.sin(a + sweep);
			let wv = flut * s * s * Math.sin(t * 6 - s * 2.4 - i * .12) + cup * s * s * (Math.abs(k) - .4);
			const comp = proc ? .3 : .35 + .65 * Math.min(1, Math.abs(k));
			const shp = rayShape(s, comp);
			const lag = rayLag(s, comp);
			if (H !== 0) wv += bodyLagZ(H, th, lag) * comp * shp * ray.len;
			wv += sw.idle * .3 * comp * shp * ray.len * Math.sin(sw.idlePh * .8 + 1.3 * k - lag);
			wv *= 1 - .6 * ci;
			c.dz[i][r] = wv;
			fin.P[i][r].set(x, y, wv);
		}
		fin.normal[i].set(0, 0, 1);
	}
	const bl = fin.bulge;
	for (let i = 0; i < n - 1; i++) for (let r = 0; r <= seg; r++) {
		const s = r / seg;
		const rip = flut * .35 * smooth$1(s, .55, 1) * Math.sin(t * 15 + i * 2.1 - s * 4);
		bl[i][r] = .15 * (c.dz[i][r] + c.dz[i + 1][r]) + rip;
	}
}
function surfPoint(d, t, side) {
	const s = sec(d);
	const y = s.bot + t * (s.top - s.bot);
	const z = side * surfZ(d, t);
	const e = .001;
	const p = v3(mx(d), y, z);
	const s2 = sec(d + e);
	const pd = v3(mx(d + e), s2.bot + t * (s2.top - s2.bot), side * surfZ(d + e, t));
	const t2 = Math.min(1, t + e * 4);
	const pt = v3(mx(d), s.bot + t2 * (s.top - s.bot), side * surfZ(d, t2));
	const du = pd.sub(p);
	const dt = pt.sub(p);
	const n = v3().crossVectors(du, dt).normalize();
	if (n.z * side < 0) n.negate();
	return {
		p,
		n
	};
}
function keepOutside(p, side, clear) {
	const z = surfZAt(SNOUT - p.x, p.y);
	if (z <= 0) return;
	if (p.z * side < z + clear) p.z = side * (z + clear);
}
var FLAT = {
	twist: 0,
	flare: 0,
	cup: 0
};
function betaAdd(f, u, s) {
	return f.twist * (1 - u - .35) + f.flare * s * s + f.cup * Math.sin(Math.PI * u) * s;
}
function pelvicFin(side, a, b, lens, psiO, psiC, betaO, betaC, name = "pelvic", shape = FLAT, bend = []) {
	const n = lens.length;
	return {
		fin: new Fin({
			name,
			rays: lens.map((len, i) => {
				const u = i / (n - 1);
				const sp = surfPoint(lerp(a[0], b[0], u), lerp(a[1], b[1], u), side);
				return {
					base: sp.p.addScaledVector(sp.n, -.001),
					len
				};
			}),
			seg: 12,
			branched: [1, n - 1],
			notch: .01
		}),
		side,
		psiO: psiO.map(deg),
		psiC: psiC.map(deg),
		betaO: deg(betaO),
		betaC: deg(betaC),
		shape,
		bend: lens.map((_, i) => bend[i] ?? 0)
	};
}
var strokeWave = (x) => Math.sin(x + .45 * Math.sin(x));
function posePelvic(f, open, trail, t, flut, phase, beat = 0, stroke = null, sway = null) {
	const { fin, side } = f;
	const n = fin.n;
	const seg = fin.seg;
	const e0 = open * open * (3 - 2 * open);
	const p = v3();
	if (sway && !f.dz) {
		f.dz = Array.from({ length: n }, () => new Array(seg + 1).fill(0));
		fin.bulge = Array.from({ length: n - 1 }, () => new Array(seg + 1).fill(0));
	}
	const d0 = SNOUT - fin.o.rays[0].base.x;
	const H = sway?.body ? bodyAmp(sway.body, d0) * BODY_BEND : 0;
	const th = sway?.body ? bodyPhase(sway.body, d0) : 0;
	for (let i = 0; i < n; i++) {
		const ray = fin.o.rays[i];
		const u = i / (n - 1);
		const comp = sway ? rayComp(i, n, 1) : 0;
		const lag = stroke ? stroke.ph - 1.4 * u : 0;
		const oi = stroke ? clamp$1(open + stroke.amp * strokeWave(lag), .02, 1) : open;
		const e = stroke ? oi * oi * (3 - 2 * oi) : e0;
		const beta = Math.max(.02, lerp(f.betaC, f.betaO, e) + beat);
		const hugW = f.hug ? clamp$1(1 - e * 1.8, 0, 1) : 0;
		const psi0 = lerp(f.psiC[i], f.psiO[i], clamp$1(e * 1.1 - .1 * u, 0, 1));
		p.copy(ray.base);
		const step = ray.len / seg;
		fin.P[i][0].copy(p);
		let bi = beta;
		for (let r = 1; r <= seg; r++) {
			const s = r / seg;
			const sm = (r - .5) / seg;
			let psi = psi0 - trail * s * s * (1 + .6 * (1 - u)) + flut * s * s * Math.sin(t * 5 + phase - s * 2.5 - i * .4) * 8;
			psi += f.bend[i] * (.3 + .7 * e) * (sm * sm - 1 / 3);
			bi = Math.max(.02, beta + e * betaAdd(f.shape, u, s - .5 / seg));
			if (stroke) {
				const late = strokeWave(lag - 1.5 * sm) - strokeWave(lag);
				bi = Math.max(.02, bi + (f.betaO - f.betaC) * stroke.amp * 1.1 * late * sm);
				psi += stroke.sweep * strokeWave(lag - .9 - 1.2 * sm) * sm;
			}
			let off = 0;
			if (sway) {
				const lg = rayLag(s, comp);
				let w = H !== 0 ? side * bodyLagZ(H, th, lg) : 0;
				w += sway.idle * (Math.sin(sway.idlePh + phase - Math.PI * 2 * sway.idleWaves * u - lg) + .35 * Math.sin(.57 * sway.idlePh + 1.7 + phase - 2.5 * u - lg));
				off = comp * w * ray.len * rayShape(s, comp) * (.35 + .65 * e);
				f.dz[i][r] = off;
			}
			const cb = Math.cos(bi);
			const sb = Math.sin(bi);
			p.x -= step * Math.cos(psi);
			p.y -= step * Math.sin(psi) * cb;
			p.z += side * step * Math.sin(psi) * sb;
			keepOutside(p, side, .0015);
			if (hugW > 0) {
				const zs = surfZAt(SNOUT - p.x, p.y);
				if (zs > 0) p.z += (side * (zs + .0012 + .0015 * s) - p.z) * hugW;
			}
			fin.P[i][r].copy(p);
			if (off !== 0) {
				fin.P[i][r].y += off * Math.sin(bi);
				fin.P[i][r].z += off * side * Math.cos(bi);
				keepOutside(fin.P[i][r], side, .0015);
			}
		}
		fin.normal[i].set(0, Math.sin(bi), side * Math.cos(bi));
	}
	if (sway) {
		const bl = fin.bulge;
		const dz = f.dz;
		for (let i = 0; i < n - 1; i++) for (let r = 0; r <= seg; r++) {
			const s = r / seg;
			const rip = sway.flut * .35 * smooth$1(s, .5, 1) * Math.sin(sway.t * 15 + i * 2.3 - s * 4);
			bl[i][r] = .225 * (dz[i][r] + dz[i + 1][r]) + rip;
		}
	}
}
var PECT_REST = .32;
function resampleTips(k, n) {
	const L = [0];
	for (let i = 1; i < k.length; i++) L.push(L[i - 1] + Math.hypot(k[i][0] - k[i - 1][0], k[i][1] - k[i - 1][1]));
	const out = [];
	for (let j = 0; j < n; j++) {
		const t = L[L.length - 1] * j / (n - 1);
		let i = 0;
		while (i < k.length - 2 && L[i + 1] < t) i++;
		const w = (t - L[i]) / Math.max(1e-9, L[i + 1] - L[i]);
		out.push([lerp(k[i][0], k[i + 1][0], w), lerp(k[i][1], k[i + 1][1], w)]);
	}
	return out;
}
var PECT_BETA_REST = 14;
function pectFin(side, a, b, lens, psiDeg) {
	const n = lens.length;
	const rays = lens.map((len, i) => {
		const u = i / (n - 1);
		const sp = surfPoint(lerp(a[0], b[0], u), lerp(a[1], b[1], u), side);
		return {
			base: sp.p.addScaledVector(sp.n, -.001),
			len
		};
	});
	const psi = psiDeg.map(deg);
	const pT = psi[n - 1] - deg(4);
	const psiF = psi.map((v) => pT + (v - pT) * .12);
	const bend = psi.map((_, i) => -deg(16) * Math.pow(1 - i / (n - 1), 2));
	return {
		fin: new Fin({
			name: "pectoral",
			rays,
			seg: 12,
			branched: [1, n - 1],
			notch: .008
		}),
		side,
		psi,
		psiF,
		bend
	};
}
function posePect(f, open, t, flut, phase, stroke) {
	const { fin, side } = f;
	const n = fin.n;
	const seg = fin.seg;
	const p = v3();
	const bk = v3();
	const dn = v3();
	for (let i = 0; i < n; i++) {
		const ray = fin.o.rays[i];
		const u = i / (n - 1);
		const lag = stroke ? stroke.ph - 1.4 * u : 0;
		const oi = stroke ? clamp$1(open + stroke.amp * strokeWave(lag), 0, 1) : open;
		const spread = smooth$1(oi, .03, .24);
		const abd = smooth$1(oi, PECT_REST, 1);
		const psi0 = lerp(f.psiF[i], f.psi[i], spread);
		const beta0 = deg(4) + deg(10) * spread + deg(36) * abd;
		const yaw0 = deg(18) * abd;
		p.copy(ray.base);
		fin.P[i][0].copy(p);
		const step = ray.len / seg;
		let beta = beta0;
		let yaw = yaw0;
		for (let r = 1; r <= seg; r++) {
			const s = r / seg;
			const sm = (r - .5) / seg;
			let psi = psi0 + f.bend[i] * (.4 + .6 * spread) * (sm * sm - 1 / 3) + flut * s * s * Math.sin(t * 5 + phase - s * 2.5 - i * .4) * 6;
			beta = beta0;
			if (stroke) {
				const late = strokeWave(lag - 1.5 * sm) - strokeWave(lag);
				beta = Math.max(deg(2), beta + deg(30) * stroke.amp * late * sm);
				psi += stroke.sweep * strokeWave(lag - .9 - 1.2 * sm) * sm;
			}
			const cb = Math.cos(psi);
			const sd = Math.sin(psi);
			bk.set(-Math.cos(yaw) * cb, 0, side * Math.sin(yaw) * cb);
			dn.set(0, -Math.cos(beta) * sd, side * Math.sin(beta) * sd);
			p.addScaledVector(bk, step).addScaledVector(dn, step);
			keepOutside(p, side, .0012);
			fin.P[i][r].copy(p);
		}
		bk.set(-Math.cos(yaw), 0, side * Math.sin(yaw));
		dn.set(0, -Math.cos(beta), side * Math.sin(beta));
		fin.normal[i].crossVectors(bk, dn).normalize();
		if (fin.normal[i].z * side < 0) fin.normal[i].negate();
	}
}
function buildEye(side, ws = 40, hs = 28) {
	const g = new THREE.SphereGeometry(1, ws, hs);
	const pos = g.getAttribute("position");
	const zs = surfZAt(EYE.d, EYE.y);
	const center = v3(mx(EYE.d), EYE.y, side * (zs - .3 * EYE.r));
	const P = new Float32Array(pos.count * 3);
	const local = new Float32Array(pos.count * 3);
	const polar = new Float32Array(pos.count * 4);
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const y = pos.getY(i);
		const z = pos.getZ(i);
		const lx = x * EYE.r;
		const ly = z * EYE.r;
		const lz = surfZAt(EYE.d - lx, EYE.y + ly) - .0012 + (y >= 0 ? .0035 : .012) * y - Math.abs(center.z);
		local[i * 3] = lx;
		local[i * 3 + 1] = ly;
		local[i * 3 + 2] = lz * side;
		polar[i * 4] = Math.acos(clamp$1(y, -1, 1)) / Math.PI;
		polar[i * 4 + 1] = Math.atan2(z, x);
		polar[i * 4 + 2] = .5 - x * .5;
		polar[i * 4 + 3] = .5 + z * .5;
		P[i * 3] = center.x + lx;
		P[i * 3 + 1] = center.y + ly;
		P[i * 3 + 2] = center.z + lz * side;
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage));
	geo.setAttribute("aEye", new THREE.BufferAttribute(polar, 4));
	geo.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(pos.count).fill(6), 1));
	const index = g.getIndex();
	const ia = Array.from(index.array);
	if (side > 0) for (let i = 0; i < ia.length; i += 3) [ia[i + 1], ia[i + 2]] = [ia[i + 2], ia[i + 1]];
	geo.setIndex(ia);
	geo.computeVertexNormals();
	geo.boundingSphere = new THREE.Sphere(v3(0, 0, 0), 1);
	g.dispose();
	return {
		geo,
		local,
		localN: Float32Array.from(geo.getAttribute("normal").array),
		center,
		side
	};
}
function paintBody(W, H) {
	const col = document.createElement("canvas");
	col.width = W;
	col.height = H;
	const msk = document.createElement("canvas");
	msk.width = W;
	msk.height = H;
	const g = col.getContext("2d");
	const m = msk.getContext("2d");
	const img = g.createImageData(W, H);
	const mimg = m.createImageData(W, H);
	for (let py = 0; py < H; py++) {
		const y = TEX.y1 - (py + .5) / H * (TEX.y1 - TEX.y0);
		for (let px = 0; px < W; px++) {
			const d = TEX.d0 + (px + .5) / W * (TEX.d1 - TEX.d0);
			const dc = clamp$1(d, 0, D_END);
			const inBody = d >= 0 && d <= D_END && y <= TOP(dc) && y >= BOT(dc);
			const k = (py * W + px) * 4;
			let c = (inBody ? (y - BOT(dc)) / (TOP(dc) - BOT(dc)) : .5) > .7 ? [
				.42,
				.45,
				.28
			] : [
				.78,
				.8,
				.8
			];
			if (!inBody) c = [
				.6,
				.6,
				.6
			];
			img.data[k] = c[0] * 255;
			img.data[k + 1] = c[1] * 255;
			img.data[k + 2] = c[2] * 255;
			img.data[k + 3] = (inBody ? 1 : .5) * 255;
			mimg.data[k] = (inBody ? .5 : 0) * 255;
			mimg.data[k + 3] = 255;
		}
	}
	g.putImageData(img, 0, 0);
	m.putImageData(mimg, 0, 0);
	return {
		col,
		msk
	};
}
function sharedUniforms() {
	return {
		uTime: { value: 0 },
		uMouth: { value: 0 },
		uGill: { value: 0 },
		uFloor: { value: 0 },
		uHead: { value: 1 },
		uPower: { value: 0 },
		uLam: { value: .95 },
		uSwim: { value: new THREE.Vector4() },
		uNeck: { value: new THREE.Vector4() },
		uEnv: { value: new THREE.Vector3(.02, -.08, .16) },
		uJaw: { value: new THREE.Vector2(mx(MOUTH$1.joint[0]), MOUTH$1.joint[1]) }
	};
}
function inject(mat, u, defs, extra, frag, key) {
	mat.onBeforeCompile = (sh2) => {
		Object.assign(sh2.uniforms, u, extra);
		const d = defs.map((x) => `#define ${x}\n`).join("");
		sh2.vertexShader = d + VERT_HEAD + sh2.vertexShader.replace("#include <beginnormal_vertex>", VERT_BODY).replace("#include <begin_vertex>", "vec3 transformed = fishP;");
		sh2.fragmentShader = d + frag(sh2.fragmentShader);
	};
	mat.customProgramCacheKey = () => "katakuchi-" + key + "-" + defs.join("-");
}
var KATAKUCHI_LOOK = {
	iri: { value: .14 },
	iriMix: { value: .45 },
	iriEdge: { value: .3 },
	iriA: { value: new THREE.Color().setRGB(.85, .95, 1) },
	iriB: { value: new THREE.Color().setRGB(.25, .85, .85) },
	iriC: { value: new THREE.Color().setRGB(.15, .4, .9) },
	glint: { value: 0 },
	glintSize: { value: .012 },
	glow: { value: 0 },
	spec: { value: 2.5 },
	env: { value: 3.5 },
	silverMetal: { value: .1 },
	silverRough: { value: .42 },
	lift: { value: .16 },
	finGlow: { value: 1 },
	fishKey: { value: new THREE.Color(0, 0, 0) },
	fishKeyDir: { value: new THREE.Vector3(0, 1, .3).normalize() }
};
var LOOK_U = {
	uIri: KATAKUCHI_LOOK.iri,
	uIriMix: KATAKUCHI_LOOK.iriMix,
	uIriEdge: KATAKUCHI_LOOK.iriEdge,
	uIriA: KATAKUCHI_LOOK.iriA,
	uIriB: KATAKUCHI_LOOK.iriB,
	uIriC: KATAKUCHI_LOOK.iriC,
	uGlint: KATAKUCHI_LOOK.glint,
	uGlintSize: KATAKUCHI_LOOK.glintSize,
	uIriGlow: KATAKUCHI_LOOK.glow,
	uSpecK: KATAKUCHI_LOOK.spec,
	uEnvK: KATAKUCHI_LOOK.env,
	uSilverMetal: KATAKUCHI_LOOK.silverMetal,
	uSilverRough: KATAKUCHI_LOOK.silverRough,
	uLift: KATAKUCHI_LOOK.lift,
	uFinGlowK: KATAKUCHI_LOOK.finGlow,
	uFkCol: KATAKUCHI_LOOK.fishKey,
	uFkDir: KATAKUCHI_LOOK.fishKeyDir
};
var LOOK_HEAD = `
uniform float uIri;
uniform float uIriMix;
uniform float uIriEdge;
uniform vec3 uIriA;
uniform vec3 uIriB;
uniform vec3 uIriC;
uniform float uGlint;
uniform float uGlintSize;
uniform float uIriGlow;
uniform float uSpecK;
uniform float uEnvK;
uniform float uSilverMetal;
uniform float uSilverRough;
uniform float uLift;
uniform float uFinGlowK;
uniform vec3 uFkCol;
uniform vec3 uFkDir;
`;
var LIGHT_GLSL = `
reflectedLight.directSpecular *= uSpecK;
reflectedLight.indirectSpecular *= uEnvK;
#ifdef USE_CLEARCOAT
clearcoatSpecularDirect *= uSpecK;
clearcoatSpecularIndirect *= uEnvK;
#endif
{
  vec3 fkL = normalize((viewMatrix * vec4(uFkDir, 0.0)).xyz);
  reflectedLight.directDiffuse += uFkCol * max(dot(normal, fkL), 0.0) * diffuseColor.rgb * RECIPROCAL_PI;
}
`;
var IRI_GLSL = `
{
  vec3 E = (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) / max(diffuseColor.rgb, vec3(0.04));
  float e = dot(E, vec3(0.2126, 0.7152, 0.0722));
  vec3 V = normalize(vViewPosition);
  float nv = clamp(dot(normal, V), 0.0, 1.0);
  vec3 iri = nv > 0.5 ? mix(uIriB, uIriA, (nv - 0.5) / 0.5) : mix(uIriC, uIriB, nv / 0.5);
  iri = mix(diffuseColor.rgb, iri, uIriMix);
  float sparkle = clamp(dot(diffuseColor.rgb, vec3(0.3, 0.5, 0.2)) * 1.6 - 0.15, 0.35, 1.3);
  if (uGlint > 0.0) {
    vec2 sc = floor(vModel.xy / uGlintSize);
    float o = fract(sin(dot(sc, vec2(12.9898, 78.233))) * 43758.5453);
    sparkle += uGlint * pow(max(0.0, cos(18.0 * (nv - 0.45 - 0.5 * o))), 6.0);
  }
  totalEmissiveRadiance += tMask.r * iri * (uIriEdge + (1.0 - uIriEdge) * pow(nv, 0.6)) * sparkle * e * uIri;
  totalEmissiveRadiance += tMask.r * iri * uIriGlow;
}
`;
var SKIN = {
	roughness: .52,
	metalness: 0,
	clearcoat: .12,
	clearcoatRoughness: .35,
	specularIntensity: .45
};
function bodyMaterial(u, tex, kind) {
	const mat = new THREE.MeshPhysicalMaterial({
		map: tex.col,
		bumpMap: tex.bmp ?? null,
		bumpScale: .3,
		...SKIN
	});
	inject(mat, u, kind === "body" ? ["T_BODY", "T_JAW"] : ["T_GILL"], {
		uMask: { value: tex.msk },
		...LOOK_U
	}, (fs) => `uniform sampler2D uMask;\n${LOOK_HEAD}varying vec3 vModel;\nvarying vec3 vObjN;\n#ifdef T_BODY\nvarying float vGill;\n#endif\n` + fs.replace("#include <map_fragment>", `
float topK = smoothstep(0.6, 0.95, abs(normalize(vObjN).y));
vec4 sampledDiffuseColor = texture2D(map, vMapUv, topK * 3.0);
diffuseColor.rgb *= sampledDiffuseColor.rgb;
vec4 tMask = texture2D(uMask, vMapUv, topK * 3.0);
#ifdef T_BODY
if (vGill > 0.02) {
  float fil = 0.5 + 0.5 * sin(vModel.y * 700.0 + sin(vModel.x * 260.0) * 2.0);
  vec3 gill = mix(vec3(0.3, 0.02, 0.03), vec3(0.72, 0.08, 0.08), fil);
  diffuseColor.rgb = mix(diffuseColor.rgb, gill, smoothstep(0.02, 0.6, vGill));
}
#endif
`).replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = uSilverMetal * tMask.r;\nroughnessFactor = mix(roughnessFactor, uSilverRough, tMask.r);\n").replace("#include <aomap_fragment>", "#include <aomap_fragment>\n" + LIGHT_GLSL + IRI_GLSL + "totalEmissiveRadiance += diffuseColor.rgb * uLift;\n"), "body");
	mat.userData.katakuchi = "body";
	return mat;
}
function mouthMaterial(u) {
	const mat = new THREE.MeshStandardMaterial({
		color: new THREE.Color(.32, .14, .15),
		roughness: .9,
		side: THREE.DoubleSide
	});
	inject(mat, u, ["T_JAW"], {}, (fs) => "varying vec3 vModel;\n" + fs.replace("#include <color_fragment>", `#include <color_fragment>
diffuseColor.rgb *= mix(1.0, 0.25, smoothstep(0.006, ${(MOUTH$1.throat * .8).toFixed(3)}, ${SNOUT.toFixed(3)} - vModel.x));`), "mouth");
	return mat;
}
function eyeMaterial(u, photo) {
	const mat = new THREE.MeshPhysicalMaterial({
		color: 16777215,
		roughness: .3,
		clearcoat: 1,
		clearcoatRoughness: .03,
		metalness: 0
	});
	inject(mat, u, photo ? ["T_EYE", "T_EYEPHOTO"] : ["T_EYE"], { uEyeTex: { value: photo } }, (fs) => "varying vec3 vModel;\nvarying vec4 vEye;\nuniform sampler2D uEyeTex;\n" + fs.replace("#include <color_fragment>", `#include <color_fragment>
{
  float r = vEye.x;
  float a = vEye.y;
  float pupil = 0.17;
  float iris = 0.36;
  vec3 c;
  if (r < pupil) c = vec3(0.004);
  else if (r < iris) {
    float k = (r - pupil) / (iris - pupil);
    float rad = 0.5 + 0.5 * sin(a * 41.0 + sin(a * 13.0) * 2.0);
    c = mix(vec3(0.62, 0.6, 0.5), vec3(0.85, 0.78, 0.55), rad * 0.6 + 0.2 * k);
    c = mix(c, vec3(0.8, 0.08, 0.05), smoothstep(0.55, 0.85, cos(a - 1.5708)) * smoothstep(0.4, 0.75, k));
    c = mix(vec3(0.75, 0.55, 0.25), c, smoothstep(0.0, 0.12, k));
    c *= mix(1.0, 0.55, smoothstep(0.82, 1.0, k));
  } else c = vec3(0.32, 0.36, 0.4);
#ifdef T_EYEPHOTO
  if (r < 0.5) c = texture2D(uEyeTex, vEye.zw).rgb;
#endif
  diffuseColor.rgb = c;
}
`), "eye");
	return mat;
}
var FIN_GREY = {
	base: [
		.78,
		.8,
		.82
	],
	alpha: .26,
	lead: [
		.78,
		.8,
		.82
	],
	leadW: 0,
	root: [
		.78,
		.8,
		.82
	],
	rootW: .2,
	rootK: 0
};
var LOOKS = {
	dorsal: FIN_GREY,
	anal: FIN_GREY,
	caudal: {
		...FIN_GREY,
		alpha: .3
	},
	pelvic: FIN_GREY,
	pectoral: FIN_GREY
};
function finMaterial(u, tex, look, nRays, edges = false, photo = null, glow = 0) {
	const mat = new THREE.MeshPhysicalMaterial({
		color: 16777215,
		map: photo ? tex?.fins ?? null : tex?.col ?? null,
		roughness: .35,
		metalness: 0,
		clearcoat: .1,
		clearcoatRoughness: .3,
		specularIntensity: .4,
		transparent: true,
		side: THREE.DoubleSide,
		depthWrite: false
	});
	const c3 = (v) => ({ value: new THREE.Color().setRGB(v[0], v[1], v[2]) });
	inject(mat, u, photo ? [
		"T_FIN",
		"FIN_PHOTO",
		...photo === "solid" ? ["FIN_SOLID"] : [],
		...edges && photo === "alpha" ? ["FIN_TAIL"] : []
	] : ["T_FIN"], {
		uMask: { value: tex?.msk ?? null },
		...LOOK_U,
		uGlow: { value: glow },
		uFinBase: c3(look.base),
		uFinLead: c3(look.lead),
		uFinRoot: c3(look.root),
		uFinA: { value: look.alpha },
		uLeadW: { value: look.leadW },
		uRootW: { value: look.rootW },
		uRootK: { value: look.rootK },
		uNR: { value: nRays - 1 },
		uEdges: { value: edges ? 1 : 0 }
	}, (fs) => "uniform sampler2D uMask;\n" + LOOK_HEAD + "uniform float uGlow;\nuniform vec3 uFinBase;\nuniform vec3 uFinLead;\nuniform vec3 uFinRoot;\nuniform float uFinA;\nuniform float uLeadW;\nuniform float uRootW;\nuniform float uRootK;\nuniform float uNR;\nuniform float uEdges;\nvarying vec3 vModel;\nvarying vec4 vFin;\nvarying vec4 vFinGap;\n" + fs.replace("#include <color_fragment>", `#include <color_fragment>
vec4 tMask = vec4(0.0);
float bodyK = 0.0;
float skinR = 0.0;
{
  float rc = vFin.x, s = vFin.y;
  float gap = max(vFinGap.x, 1e-5);
  float ri = floor(rc + 0.5);
  float w = mix(0.0014, 0.0006, s);
  float line = 0.0;
  bool br = ri >= vFin.z && ri <= vFin.w;
  float sb = 0.45;
  float off = br && s > sb ? 0.16 * (s - sb) / (1.0 - sb) : 0.0;
  for (int k = -1; k <= 1; k += 2) {
    float dr = abs(rc - (ri + float(k) * off)) * gap;
    float aa = fwidth(rc) * gap + 1e-5;
    line = max(line, 1.0 - smoothstep(w * (off > 0.0 ? 0.75 : 1.0) - aa * 0.5, w + aa, dr));
  }
  float segm = abs(fract(s * 18.0 + ri * 0.37) - 0.5);
  line *= 0.8 + 0.35 * smoothstep(0.42, 0.5, segm);
  line *= clamp(w * 2.0 / (fwidth(rc) * gap + 1e-6), 0.25, 1.0);
  vec3 V = normalize(vViewPosition);
  float nv = abs(dot(normalize(vNormal), V));
  float fres = pow(1.0 - nv, 2.0);
  float idx = clamp(rc / max(uNR, 1.0), 0.0, 1.0);
  float e = uEdges > 0.5 ? min(idx, 1.0 - idx) * 2.0 : idx;
  float lead = uLeadW > 0.0 ? (1.0 - smoothstep(uLeadW * 0.45, uLeadW, e)) * smoothstep(0.04, 0.3, s) : 0.0;
  vec3 col = uFinBase;
  col = mix(col, uFinRoot, uRootK * (1.0 - smoothstep(uRootW * 0.4, uRootW, s)));
  col = mix(col, uFinLead, lead * 0.9);
  col *= 0.9 + 0.15 * line;
  float memb = uFinA + 0.12 * fres + 0.1 * vFinGap.y + 0.12 * (1.0 - smoothstep(0.0, 0.3, s)) + 0.3 * lead;
  float a = clamp(max(memb, uFinA + 0.5 * line), 0.0, 1.0);
  a *= 1.0 - 0.3 * smoothstep(0.85, 1.0, s);
#ifdef FIN_PHOTO
  vec4 tp = texture2D(map, vMapUv);
  col = tp.rgb * (0.96 + 0.08 * line);
#ifdef FIN_SOLID
  a = clamp(uFinA + 0.12 * fres + 0.12 * (1.0 - smoothstep(0.0, 0.3, s)) + 0.2 * line, 0.0, 1.0) * (1.0 - 0.25 * smoothstep(0.88, 1.0, s));
#else
  a = 1.0 - pow(1.0 - tp.a, 1.4);
#endif
#ifdef FIN_TAIL
  {
    float dd = ${SNOUT.toFixed(3)} - vModel.x;
    bodyK = 1.0 - smoothstep(${.846.toFixed(3)}, ${.895.toFixed(3)}, dd);
    vec4 m = texture2D(uMask, vMapUv);
    skinR = m.r;
    tMask = m * bodyK;
    a = mix(a, 1.0, bodyK);
  }
#endif
#elif defined(USE_MAP)
  float root = 1.0 - smoothstep(0.02, 0.12, s);
  {
    float dd = ${SNOUT.toFixed(3)} - vModel.x;
    float tailRoot = (1.0 - smoothstep(${.858.toFixed(3)}, ${.885.toFixed(3)}, dd)) * step(${.83.toFixed(3)}, dd);
    tailRoot *= 1.0 - smoothstep(0.03, 0.05, abs(vModel.y - ${TAIL_YC.toFixed(3)}));
    root = max(root, tailRoot);
  }
  vec3 skin = texture2D(map, vMapUv).rgb;
  col = mix(col, skin, root);
  a = mix(a, 1.0, root);
  tMask = texture2D(uMask, vMapUv) * root;
#endif
  diffuseColor.rgb = col;
  diffuseColor.a = a * opacity;
}
`).replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>
metalnessFactor = mix(metalnessFactor, uSilverMetal * skinR, bodyK);
roughnessFactor = mix(roughnessFactor, mix(${SKIN.roughness.toFixed(2)}, uSilverRough, skinR), bodyK);
`).replace("#include <aomap_fragment>", "#include <aomap_fragment>\n" + LIGHT_GLSL + "#ifdef USE_MAP\n" + IRI_GLSL + "totalEmissiveRadiance += diffuseColor.rgb * uLift * tMask.a;\n#endif\ntotalEmissiveRadiance += diffuseColor.rgb * uGlow * uFinGlowK;\n"), "fin" + (photo ? "-photo-" + photo : tex ? "-map" : ""));
	mat.userData.katakuchi = "fin";
	return mat;
}
var photoTex = null;
var paintTex = null;
async function loadKatakuchi(url) {
	if (photoTex) return;
	const tl = new THREE.TextureLoader();
	const load = async (f, srgb) => {
		const t = await tl.loadAsync(url(f));
		t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
		t.anisotropy = 8;
		t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
		return t;
	};
	try {
		const p = "katakuchi_";
		const [col, msk, bmp, eye, fins] = await Promise.all([
			load(p + "body.webp", true),
			load(p + "mask.webp", false),
			load(p + "bump.webp", false),
			load(p + "eye.webp", true),
			load(p + "fins.webp", true).catch(() => void 0)
		]);
		photoTex = {
			col,
			msk,
			bmp,
			eye,
			fins
		};
	} catch {}
}
var CLAY = typeof location !== "undefined" && new URLSearchParams(location.search).has("clay");
function textures() {
	if (CLAY) return clayTex();
	const p = photoTex;
	if (p) return p;
	const c = paintTex;
	if (c) return c;
	const { col, msk } = paintBody(1024, 896);
	const mk = (cv, srgb) => {
		const t = new THREE.CanvasTexture(cv);
		t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
		t.anisotropy = 8;
		t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
		return t;
	};
	return paintTex = {
		col: mk(col, true),
		msk: mk(msk, false)
	};
}
var clayCache = null;
function clayTex() {
	if (clayCache) return clayCache;
	const cv = document.createElement("canvas");
	cv.width = cv.height = 4;
	const g = cv.getContext("2d");
	g.fillStyle = "rgb(150,150,150)";
	g.fillRect(0, 0, 4, 4);
	const mk = new THREE.CanvasTexture(cv);
	mk.colorSpace = THREE.SRGBColorSpace;
	const cm = document.createElement("canvas");
	cm.width = cm.height = 4;
	return clayCache = {
		col: mk,
		msk: new THREE.CanvasTexture(cm)
	};
}
var geoCache = null;
function bodies() {
	const gl = GILL_LINES;
	return geoCache ??= {
		hi: buildBody(26, 22, 30, .005, gl),
		lo: buildBody(12, 10, 14, .013, gl)
	};
}
function makeFins() {
	const F = FINS;
	const dorsal = rayFin("dorsal", 1, F.dorsal, 3, 12);
	const anal = rayFin("anal", -1, F.anal, 3, 12);
	const caudal = caudalFin();
	const fromTips = (a, b, tips, beta, shape = FLAT) => {
		const n = tips.length;
		const lens = [];
		const psi = [];
		tips.forEach(([td, ty], i) => {
			const u = i / (n - 1);
			let cb = 0;
			for (let r = 0; r < 12; r++) cb += Math.cos(deg(beta) + betaAdd(shape, u, (r + .5) / 12)) / 12;
			const sp = surfPoint(lerp(a[0], b[0], u), lerp(a[1], b[1], u), 1);
			const back = td - (SNOUT - sp.p.x);
			const down = (sp.p.y - ty) / cb;
			lens.push(Math.hypot(back, down));
			psi.push(THREE.MathUtils.radToDeg(Math.atan2(down, back)));
		});
		return {
			lens,
			psi
		};
	};
	const pa = [.2255, tAt(.2255, -.037)];
	const pb = [.238, tAt(.238, -.046)];
	const pt = fromTips(pa, pb, resampleTips(F.pectTips, 18), PECT_BETA_REST);
	const pect = [1, -1].map((side) => pectFin(side, pa, pb, pt.lens, pt.psi));
	const qa = [.424, tAt(.424, -.064)];
	const qb = [.436, tAt(.436, -.066)];
	const qt = F.pelvTips ? fromTips(qa, qb, resampleTips(F.pelvTips, 12), F.pelvBeta ?? 25) : null;
	return {
		dorsal,
		anal,
		caudal,
		pect,
		pelv: [1, -1].map((side) => qt ? pelvicFin(side, qa, qb, qt.lens, qt.psi, qt.psi.map((v) => 4 + .25 * v), F.pelvBeta ?? 25, 5) : pelvicFin(side, qa, qb, F.pelv, [
			16,
			20,
			24,
			28,
			31,
			34,
			37,
			40,
			43
		], [
			6,
			7,
			8,
			9,
			10,
			11,
			12,
			13,
			14
		], 32, 6))
	};
}
function finUV(fin) {
	const pos = fin.geo.getAttribute("position");
	const uv = new Float32Array(pos.count * 2);
	for (let i = 0; i < pos.count; i++) {
		const [a, b] = uvOf(SNOUT - pos.getX(i), pos.getY(i));
		uv[i * 2] = a;
		uv[i * 2 + 1] = b;
	}
	fin.geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}
function mergeFins(fins) {
	const geo = new THREE.BufferGeometry();
	const total = fins.reduce((s, f) => s + f.geo.getAttribute("position").count, 0);
	const pos = new Float32Array(total * 3);
	const nrm = new Float32Array(total * 3);
	const gap = new Float32Array(total * 4);
	const fin = new Float32Array(total * 4);
	const uv = new Float32Array(total * 2);
	const idx = [];
	let off = 0;
	for (const f of fins) {
		const n = f.geo.getAttribute("position").count;
		fin.set(f.geo.getAttribute("aFin").array, off * 4);
		const fu = f.geo.getAttribute("uv");
		if (fu) uv.set(fu.array, off * 2);
		const fi = f.geo.getIndex().array;
		for (let k = 0; k < fi.length; k++) idx.push(fi[k] + off);
		off += n;
	}
	geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
	geo.setAttribute("normal", new THREE.BufferAttribute(nrm, 3).setUsage(THREE.DynamicDrawUsage));
	geo.setAttribute("aFinGap", new THREE.BufferAttribute(gap, 4).setUsage(THREE.DynamicDrawUsage));
	geo.setAttribute("aFin", new THREE.BufferAttribute(fin, 4));
	geo.setAttribute("aPart", new THREE.BufferAttribute(new Float32Array(total).fill(1), 1));
	geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
	geo.setIndex(idx);
	geo.boundingSphere = new THREE.Sphere(v3(0, 0, 0), 1);
	const sync = () => {
		let o = 0;
		for (const f of fins) {
			const n = f.geo.getAttribute("position").count;
			pos.set(f.geo.getAttribute("position").array, o * 3);
			nrm.set(f.geo.getAttribute("normal").array, o * 3);
			gap.set(f.geo.getAttribute("aFinGap").array, o * 4);
			o += n;
		}
		for (const k of [
			"position",
			"normal",
			"aFinGap"
		]) geo.getAttribute(k).needsUpdate = true;
	};
	sync();
	return {
		geo,
		sync
	};
}
function buildKatakuchi(length) {
	const u = sharedUniforms();
	const tex = textures();
	const matBody = bodyMaterial(u, tex, "body");
	const matGill = bodyMaterial(u, tex, "gill");
	const matMouth = mouthMaterial(u);
	const matEye = eyeMaterial(u, photoTex?.eye ?? null);
	const { dorsal, anal, caudal, pect, pelv } = makeFins();
	const look = LOOKS;
	const ph = !!tex.fins;
	const matDorsal = finMaterial(u, tex, look.dorsal, dorsal.fin.n, false, ph ? "alpha" : null);
	const matAnal = finMaterial(u, tex, look.anal, anal.fin.n, false, ph ? "alpha" : null);
	const matCaudal = finMaterial(u, tex, look.caudal, caudal.fin.n, true, ph ? "alpha" : null);
	const matPelv = finMaterial(u, ph ? tex : null, look.pelvic, pelv[0].fin.n, false, ph ? "alpha" : null, .12);
	const matPect = finMaterial(u, ph ? tex : null, look.pectoral, pect[0].fin.n, false, ph ? "alpha" : null, .18);
	poseRim(dorsal, 0, 0, STILL$1);
	dorsal.fin.commit(true);
	poseRim(anal, 0, 0, STILL$1);
	anal.fin.commit(true);
	poseCaudal(caudal, 0, 0, STILL$1);
	caudal.fin.commit(true);
	for (const f of [
		dorsal.fin,
		anal.fin,
		caudal.fin
	]) finUV(f);
	for (const p of pect) {
		posePect(p, PECT_REST, 0, 0, 0, null);
		p.fin.commit(true);
	}
	for (const p of pelv) {
		posePelvic(p, 1, 0, 0, 0, 0);
		p.fin.commit(true);
	}
	for (const p of [...pect, ...pelv]) finUV(p.fin);
	const eyes = [1, -1].map((s) => buildEye(s));
	const eyesLo = [1, -1].map((s) => buildEye(s, 12, 8));
	const root = new THREE.Group();
	const lod = new THREE.LOD();
	lod.scale.setScalar(length);
	lod.rotation.y = -Math.PI / 2;
	const camWorld = v3();
	const camLocal = v3(0, 0, 3);
	const inv = new THREE.Matrix4();
	const farFins = mergeFins([
		dorsal.fin,
		anal.fin,
		caudal.fin,
		...pelv.map((p) => p.fin),
		...pect.map((p) => p.fin)
	]);
	const matFar = finMaterial(u, ph ? tex : null, look.dorsal, dorsal.fin.n, false, ph ? "alpha" : null, .1);
	const level = (b, light) => {
		const g = new THREE.Group();
		const body = new THREE.Mesh(b.body, matBody);
		g.add(body);
		g.add(new THREE.Mesh(b.gill, matGill));
		if (!light) g.add(new THREE.Mesh(b.mouth, matMouth));
		for (const e of light ? eyesLo : eyes) g.add(new THREE.Mesh(e.geo, matEye));
		for (const geo of [
			b.body,
			b.gill,
			b.mouth
		]) geo.boundingSphere ??= new THREE.Sphere(v3(0, 0, 0), .8);
		if (light) {
			const m = new THREE.Mesh(farFins.geo, matFar);
			m.renderOrder = 1;
			g.add(m);
			body.onBeforeRender = (_r, _s, cam) => {
				camWorld.setFromMatrixPosition(cam.matrixWorld);
				body.updateWorldMatrix(true, false);
				camLocal.copy(camWorld).applyMatrix4(inv.copy(body.matrixWorld).invert());
			};
			return g;
		}
		const finMats = [
			[dorsal.fin, matDorsal],
			[anal.fin, matAnal],
			[caudal.fin, matCaudal],
			...pelv.map((p) => [p.fin, matPelv])
		];
		for (const [f, mat] of finMats) {
			const m = new THREE.Mesh(f.geo, mat);
			m.renderOrder = 1;
			g.add(m);
		}
		for (const p of pect) {
			const m = new THREE.Mesh(p.fin.geo, matPect);
			m.renderOrder = 2;
			g.add(m);
		}
		body.onBeforeRender = (_r, _s, cam) => {
			camWorld.setFromMatrixPosition(cam.matrixWorld);
			body.updateWorldMatrix(true, false);
			camLocal.copy(camWorld).applyMatrix4(inv.copy(body.matrixWorld).invert());
		};
		return g;
	};
	const { hi, lo } = bodies();
	lod.addLevel(level(hi, false), 0);
	const loDist = .25 + length * 6;
	lod.addLevel(level(lo, true), loDist, .1);
	root.add(lod);
	const pectStroke = {
		ph: 0,
		amp: 0,
		sweep: 0
	};
	const st = {
		finClock: 0,
		tilt: 0,
		fold: .2,
		steer: 0,
		wobble: 0,
		pect: .15,
		whim: 0,
		flut: 0,
		flag: 0,
		seed: Math.random(),
		look: 0,
		every: 1,
		tick: Math.floor(Math.random() * 30),
		time: 0,
		lastTime: -1,
		ribAmp: .08,
		ribPhase: Math.random() * 10,
		ribWaves: .9,
		ribExt: false,
		wave: {
			cyc: 0,
			amp: 0,
			head: 1,
			power: 0,
			env: u.uEnv.value,
			lam: u.uLam.value
		},
		sway: {
			body: null,
			idle: 0,
			idlePh: 0,
			idleWaves: 1,
			flut: 0,
			t: 0
		},
		pectPh: [Math.random() * 10, Math.random() * 10],
		pectAmp: .02,
		pectOpen: PECT_REST,
		pectExt: false,
		pectTurn: 0,
		pelvOpen: .85,
		cup: 0,
		trail: .15
	};
	const eyeR = new THREE.Matrix4();
	const eyeRx = new THREE.Matrix4();
	const posePose = (time) => {
		const full = lod.levels[0].object.visible;
		const c = st.finClock;
		const seed = st.seed;
		const foldOf = (id) => {
			const fhz = lerp(.2, .5, fh(id * 9 + seed * 13));
			const fph = Math.PI * 2 * (fhz * c + fh(id * 4 + seed * 3));
			let f = st.fold + st.wobble * (.7 * Math.sin(fph) + .3 * Math.sin(2.6 * fph + .8));
			f += st.whim * finWhim(id + seed * 3.1, c);
			return clamp$1(f, 0, 1);
		};
		const tiltOf = (id, side) => {
			const mhz = lerp(.3, .6, fh(id * 5 + seed * 11));
			const mph = Math.PI * 2 * (mhz * c + fh(id * 3 + seed * 5));
			return side * (st.tilt * (Math.sin(mph) + .5 * Math.sin(2.3 * mph + 1.1)) + st.steer);
		};
		const fl = st.flut * .6 + st.flag * .18;
		const bw = st.wave;
		bw.cyc = u.uSwim.value.x;
		bw.amp = u.uSwim.value.y;
		bw.head = u.uHead.value;
		bw.power = u.uPower.value;
		const idle = st.ribAmp * (.6 + .4 * Math.sin(time * .31 + seed * 11));
		const sw = st.sway;
		sw.body = bw;
		sw.idle = idle;
		sw.idlePh = st.ribPhase;
		sw.idleWaves = st.ribWaves;
		sw.flut = fl;
		sw.t = c + seed * 10;
		poseRim(dorsal, foldOf(.11), tiltOf(.11, 1), sw);
		dorsal.fin.commit();
		sw.idlePh = st.ribPhase + Math.PI;
		sw.flut = fl * .8;
		sw.t = c * .9 + seed * 7;
		poseRim(anal, foldOf(.37), tiltOf(.37, -1), sw);
		anal.fin.commit();
		const tailFold = clamp$1(foldOf(.63) * .6 + st.fold * .4, 0, 1);
		sw.idlePh = st.ribPhase + 1.1;
		sw.flut = fl * .6;
		sw.t = c * 1.1 + seed * 5;
		poseCaudal(caudal, smooth$1(tailFold, .65, 1), st.cup, sw);
		caudal.fin.commit();
		pect.forEach((p, k) => {
			const open = clamp$1(st.pectOpen + st.pectTurn * p.side, 0, 1);
			pectStroke.ph = st.pectPh[k];
			pectStroke.amp = st.pectAmp;
			pectStroke.sweep = .6 * st.pectAmp;
			posePect(p, open, c + seed * 3 + k, fl * .35, k * 1.7, pectStroke);
			p.fin.commit();
		});
		if (full) pelv.forEach((p, k) => {
			const open = clamp$1(st.pelvOpen + .06 * Math.sin(time * 1.3 + k * 2.1 + seed * 9), 0, 1);
			sw.idle = idle * 2;
			sw.idlePh = st.ribPhase * .9;
			sw.flut = fl * .5;
			sw.t = c + k * .8 + seed * 4;
			posePelvic(p, open, st.trail, c + k * .8, fl * .5, k * 2.3, 0, null, sw);
			p.fin.commit();
		});
		if (full) for (const e of eyes) {
			const id = seed * 7.13 + (e.side > 0 ? 0 : 3.7);
			const g0 = eyeJump(id, .5 + 1.2 * fh(id), time);
			const g1 = eyeJump(id + 5.3, .25 + .4 * fh(id + 2), time);
			let fwd = (g0[0] + .3 * g1[0]) * .2;
			let up = (g0[1] + .3 * g1[1]) * .11;
			if (st.look > 0) {
				const dl = camLocal.clone().sub(e.center);
				const sideD = dl.z * e.side;
				const hz = Math.hypot(dl.x, sideD);
				const lw = st.look * smooth$1(sideD / Math.max(dl.length(), 1e-4), 0, .35);
				fwd = lerp(fwd, clamp$1(Math.atan2(dl.x, sideD), -.2, .2), lw);
				up = lerp(up, clamp$1(Math.atan2(dl.y, hz), -.14, .14), lw);
			}
			const R = eyeR.makeRotationY(e.side * -fwd).multiply(eyeRx.makeRotationX(-e.side * up)).elements;
			const pa2 = e.geo.getAttribute("position");
			const nr = e.geo.getAttribute("normal");
			const P = pa2.array;
			const N2 = nr.array;
			const { local: L, localN: N, center: C } = e;
			for (let i = 0; i < pa2.count * 3; i += 3) {
				const x = L[i];
				const y = L[i + 1];
				const z = L[i + 2];
				P[i] = R[0] * x + R[4] * y + R[8] * z + C.x;
				P[i + 1] = R[1] * x + R[5] * y + R[9] * z + C.y;
				P[i + 2] = R[2] * x + R[6] * y + R[10] * z + C.z;
				const a = N[i];
				const b = N[i + 1];
				const c2 = N[i + 2];
				N2[i] = R[0] * a + R[4] * b + R[8] * c2;
				N2[i + 1] = R[1] * a + R[5] * b + R[9] * c2;
				N2[i + 2] = R[2] * a + R[6] * b + R[10] * c2;
			}
			pa2.needsUpdate = true;
			nr.needsUpdate = true;
		}
		if (!full) farFins.sync();
	};
	posePose(0);
	const mouthMax = .5;
	return {
		root,
		shadows: [],
		detail(on) {
			const l = lod.levels[1];
			if (l) l.distance = on ? loDist : 0;
		},
		uniforms: u,
		shade(_opacity) {},
		swim(phase, amp, bend = 0, time = performance.now() / 1e3) {
			const cyc = phase / (Math.PI * 2);
			const dt = st.lastTime < 0 ? 0 : clamp$1(time - st.lastTime, 0, .1);
			st.lastTime = time;
			if (!st.pectExt) {
				st.pectPh[0] += dt * Math.PI * 2 * 2.5;
				st.pectPh[1] += dt * Math.PI * 2 * 2.5;
			}
			if (!st.ribExt) st.ribPhase += dt * Math.PI * 2 * .7 * (1 + .3 * Math.sin(time * .23 + st.seed * 7));
			u.uTime.value = time;
			u.uSwim.value.set(cyc, amp, clamp$1(bend * length, -1.6, 1.6), 0);
			if (++st.tick >= (lod.levels[0].object.visible ? st.every : Math.max(st.every, 3))) {
				st.tick = 0;
				posePose(time);
			}
		},
		pectoral(phL, phR = 0, amp = .35, open = .75, turn = 0) {
			st.pectTurn = turn;
			st.pectExt = phL !== null;
			if (phL !== null) {
				st.pectPh[0] = phL;
				st.pectPh[1] = phR;
			}
			st.pectAmp = amp;
			st.pectOpen = open;
		},
		ribbon(amp, phase, waves = 1.6) {
			st.ribAmp = amp;
			st.ribExt = phase !== null;
			if (phase !== null) st.ribPhase = phase;
			st.ribWaves = waves;
		},
		pelvic(open, trail = .15, cup = 0) {
			st.pelvOpen = open;
			st.trail = trail;
			st.cup = cup;
		},
		finEvery(n) {
			st.every = Math.max(1, Math.round(n));
		},
		lieOnFloor(up) {
			u.uFloor.value = up;
		},
		lookAtViewer(amount) {
			st.look = amount;
		},
		air(_amount) {},
		finMove(clock, tilt, fold, steer, wobble = 0, pect = 0, whim = 0) {
			st.finClock = clock;
			st.tilt = tilt;
			st.fold = fold;
			st.steer = steer;
			st.wobble = wobble;
			st.whim = whim;
			if (!st.pectExt) {
				st.pectOpen = clamp$1(PECT_REST + pect * .9, 0, 1);
				st.pectAmp = .015 + .1 * smooth$1(st.pectOpen, PECT_REST, 1);
			}
		},
		mouth(open) {
			u.uMouth.value = clamp$1(open, 0, mouthMax);
		},
		mouthMax,
		gill(open) {
			u.uGill.value = clamp$1(open, 0, .32);
		},
		flutter(clock, amp, flag = 0, seed = 0) {
			st.finClock = clock;
			st.flut = amp;
			st.flag = flag;
		},
		flex(neck, from, to, cBend, head, power = 0) {
			u.uNeck.value.set(neck, from, to, clamp$1(cBend, -4, 4) * length);
			u.uHead.value = head;
			u.uPower.value = power;
		}
	};
}
function katakuchiStats() {
	const { hi, lo } = bodies();
	const tri = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
	const parts = (b) => tri(b.body) + tri(b.gill) + tri(b.mouth);
	return {
		hi: parts(hi),
		lo: parts(lo),
		texture: `${TEX_W}×${TEX_H}`
	};
}
var FILES = {
	aji: "aji",
	seabass: "suzuki",
	mebaru: "mebaru",
	kasago: "kasago",
	saba: "saba",
	tachiuo: "tachiuo",
	sawara: "sawara",
	kamasu: "kamasu",
	buri: "buri",
	hiramasa: "hiramasa",
	kihada: "kihada",
	magochi: "magochi",
	kurodai: "kurodai",
	madai: "madai",
	katakuchi: "katakuchi",
	isaki: "isaki",
	isaki_young: "isaki_young",
	onagagure: "onagagure",
	kuchibuto: "kuchibuto",
	shibudai: "shibudai",
	cardinal: "cardinal",
	discus_blue: "discus_blue",
	discus_red: "discus_red",
	discus_turq: "discus_turq",
	oikawa_male: "oikawa_male",
	oikawa_female: "oikawa_female"
};
var CRAFTED = {
	cardinal: {
		build: buildTetra,
		stats: tetraStats,
		load: loadTetra
	},
	discus_blue: {
		build: (L) => buildDiscus(L, "blue"),
		stats: discusStats,
		load: (url) => loadDiscus("blue", url)
	},
	discus_red: {
		build: (L) => buildDiscus(L, "red"),
		stats: discusStats,
		load: (url) => loadDiscus("red", url)
	},
	discus_turq: {
		build: (L) => buildDiscus(L, "turq"),
		stats: discusStats,
		load: (url) => loadDiscus("turq", url)
	},
	oikawa_male: {
		build: (L) => buildOikawa(L, "male"),
		stats: oikawaStats,
		load: (url) => loadOikawa("male", url)
	},
	oikawa_female: {
		build: (L) => buildOikawa(L, "female"),
		stats: oikawaStats,
		load: (url) => loadOikawa("female", url)
	},
	katakuchi3d: {
		build: (L) => buildKatakuchi(L),
		stats: katakuchiStats,
		load: loadKatakuchi,
		onlyAsked: true
	}
};
var craftedReady = new Set();
var TAIL_TAPER = { aji: 1 };
var STILL = new Set([]);
var FOLD_MAX = { tachiuo: 1.52 };
var GILL_EDGE_N = 40;
var GILL_HINGE_N = 40;
var MOUTH_N = 8;
var UPPER_N = 20;
var SWIM_HEAD = `
uniform float uTime, uSnout, uLen, uLam, uBreath, uSwimAmp, uPectRest, uLookAt, uGill, uMouth, uFloor;
uniform vec2 uEyeBulge;
uniform float uEyeTurn;
uniform vec4 uMouthShape, uMouthUpper;
uniform vec4 uMouthUpper2;
uniform float uMouthClose;
attribute vec2 jaw;
varying vec3 vModel;
varying float vNz;
varying float vPart;
varying float vRim;
uniform vec3 uEnv;
uniform vec4 uFin, uFinMove, uFinMove2;
#ifdef FISH_INSTANCED
attribute vec4 iSwim, iNeck, iFlut;
attribute vec3 iMisc;
vec4 uSwim, uNeck, uFlut;
float uHead, uPower;
#else
uniform vec4 uSwim, uNeck, uFlut;
uniform float uHead, uPower;
#endif
attribute vec3 _fin;
attribute vec3 _piv;
attribute vec3 flutter;
attribute float finH;
float fishH(float s, float cyc, float amp) {
  float A0 = uEnv.x * uHead + uEnv.y * s + uEnv.z * s * s;
  float A1 = (uEnv.x + uEnv.y + uEnv.z) * (0.25 + 0.75 * pow(max(s, 0.0), 1.6));
  float A = mix(A0, A1, clamp(uPower, 0.0, 1.0));
  return uLen * amp * A * sin(6.2831853 * (s / uLam - cyc));
}
float lieH(float s, float cyc, float amp) {
  float h = fishH(s, cyc, amp);
  if (uFloor == 0.0) return h;
  float k = sign(uFloor), e = 0.004 * uLen;
  float up = 0.5 * (h * k + sqrt(h * h + e * e)) - 0.5 * e;
  return mix(h, k * up, abs(uFloor));
}
mat3 rotAxis(vec3 a, float t) {
  float c = cos(t), s = sin(t), k = 1.0 - c;
  return mat3(c + a.x * a.x * k, a.y * a.x * k + a.z * s, a.z * a.x * k - a.y * s,
              a.x * a.y * k - a.z * s, c + a.y * a.y * k, a.z * a.y * k + a.x * s,
              a.x * a.z * k + a.y * s, a.y * a.z * k - a.x * s, c + a.z * a.z * k);
}
float neckInt(float s, float a, float b) {
  if (s <= a) return 0.0;
  float w = b - a;
  if (s >= b) return 0.5 * w + (s - b);
  float u = (s - a) / w;
  return w * (u * u * u - 0.5 * u * u * u * u);
}
float fishHash(float n) { return fract(sin(n * 12.9898 + 4.1414) * 43758.5453); }
float whimValue(float id, float seg) {
  if (fishHash(seg * 3.7 + id * 11.0) < 0.45) return 0.0;
  return mix(-0.6, 1.0, fishHash(seg * 1.3 + id * 23.0 + 5.0));
}
float finWhim(float id, float t) {
  float T = 1.4 + 2.6 * fishHash(id * 17.0 + 0.3);
  float k = t / T + fishHash(id * 5.0 + 1.7) * 9.0;
  float seg = floor(k);
  float move = mix(0.12, 0.3, fishHash(id + seg * 0.37));
  return mix(whimValue(id, seg - 1.0), whimValue(id, seg), smoothstep(0.0, move, fract(k)));
}
vec2 eyeJump(float id, float T) {
  float k = uTime / T + fishHash(id + 1.0) * 7.0, seg = floor(k);
  vec2 g0 = vec2(fishHash(seg * 1.7 + id), fishHash(seg * 2.3 + id + 11.0));
  vec2 g1 = vec2(fishHash(seg * 1.7 - 1.7 + id), fishHash(seg * 2.3 - 2.3 + id + 11.0));
  return mix(g1, g0, smoothstep(0.0, 0.08 / T, fract(k))) - 0.5;
}
vec2 eyeGaze(float id) {
  vec2 g = eyeJump(id, 0.35 + 0.85 * fishHash(id));
  g += 0.3 * eyeJump(id + 5.3, 0.2 + 0.3 * fishHash(id + 2.0));
  g += 0.06 * vec2(sin(uTime * 1.7 + id * 5.0), sin(uTime * 2.3 + id * 3.0));
  return g;
}
`;
var SWIM_BODY = `
#ifdef FISH_INSTANCED
uSwim = iSwim; uNeck = iNeck; uFlut = iFlut; uHead = iMisc.x; uPower = iMisc.y;
#endif
vec4 sw = uSwim, fs4 = uFin;
float seed = uSnout * 17.0;
float cyc = sw.x, amp = sw.y * uSwimAmp, bend = sw.z;
vec3 fishP = position;
vec3 objectNormal = normal;
float part = floor(_fin.x + 0.5);
float fw = _fin.y;
vModel = position;
vNz = normal.z;
vPart = part;
vRim = part > 6.5 ? _fin.z : 0.0;
vec3 piv = vec3(_piv.x, _piv.z, -_piv.y);
bool hasPiv = dot(_piv, _piv) > 1e-10;
mat3 R = mat3(1.0);
if (part == 4.0) {
  float sd = sign(piv.z);
  float ang = uPectRest + sw.w + fs4.y * (0.5 - 0.5 * cos(6.2831853 * fs4.x - fw * 0.9));
  float phz = mix(0.2, 0.5, fishHash(sd * 3.1 + uFlut.w * 7.0));
  ang += uFinMove2.y + uFinMove2.x * 0.36 * sin(6.2831853 * (phz * uFinMove.x + (sd > 0.0 ? 0.2 : 0.7)));
  ang -= uFinMove2.z * 0.45 * finWhim((sd > 0.0 ? 0.13 : 0.57) + uFlut.w * 3.1, uFinMove.x);
  ang = max(ang, 0.0);
  R = rotAxis(normalize(vec3(0.2, 1.0, 0.0)), sd * fw * ang);
} else if (part == 5.0) {
  float sd = sign(piv.z);
  float ang = mix(-0.12, 0.55, fs4.w) + 0.04 * sin(4.4 * uTime + seed);
  R = rotAxis(vec3(1.0, 0.0, 0.0), -sd * fw * ang);
} else if ((part == 1.0 || part == 2.0) && hasPiv) {
  R = rotAxis(vec3(0.0, 0.0, 1.0), _fin.z * (1.0 - fs4.z));
} else if (part == 3.0 && hasPiv) {
  R = rotAxis(vec3(0.0, 0.0, 1.0), _fin.z * 0.22 * (1.0 - clamp(amp * 1.5, 0.0, 1.0)));
} else if (part == 6.0 && hasPiv) {
  float sd = sign(piv.z);
  vec2 g = eyeGaze(seed * 7.13 + (sd > 0.0 ? 0.0 : 3.7));
  float fwd = g.x * 0.9, up = g.y * 0.5, lw = 0.0;
  if (uLookAt > 0.0) {
    vec3 d = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz - piv;
    float side = d.z * sd, hz = length(vec2(d.x, side));
    lw = uLookAt * smoothstep(0.0, 0.35, side / max(length(d), 1e-4));
    fwd = mix(fwd, clamp(atan(d.x, side), -0.65, 0.65) + g.x * 0.2, lw);
    up = mix(up, clamp(atan(d.y, hz), -0.45, 0.45) + g.y * 0.1, lw);
  }
  float yaw = (sd * fwd + clamp(bend * uLen, -1.0, 1.0) * 0.3 * (1.0 - lw)) * uEyeTurn;
  R = rotAxis(vec3(0.0, 1.0, 0.0), yaw) * rotAxis(vec3(1.0, 0.0, 0.0), -sd * up * uEyeTurn);
} else if (part == 7.0) {
  float sd = sign(fishP.z);
  fishP.z += sd * fw * sin(uGill);
  fishP.x += fw * (1.0 - cos(uGill));
  float ga = sd * uGill * clamp(fw / (0.05 * uLen), 0.0, 1.0);
  float gc = cos(ga), gs = sin(ga);
  objectNormal = vec3(objectNormal.x * gc + objectNormal.z * gs, objectNormal.y, -objectNormal.x * gs + objectNormal.z * gc);
}
if (part == 6.0 && hasPiv) fishP = piv + (fishP - piv) * uEyeBulge.x + vec3(0.0, 0.0, sign(piv.z) * uEyeBulge.y);
if (part >= 1.0 && part <= 6.0) { fishP = piv + R * (fishP - piv); objectNormal = R * objectNormal; }
if (finH != 0.0 && part != 4.0 && flutter.z >= 0.0) {
  float mid = flutter.z;
  float mhz = mix(0.35, 0.8, fishHash(mid * 5.0 + uFlut.w * 11.0));
  float mph = 6.2831853 * (mhz * uFinMove.x + fishHash(mid * 3.0 + uFlut.w * 5.0));
  float side = finH > 0.0 ? 1.0 : -1.0;
  float tilt = side * (uFinMove.y * (sin(mph) + 0.5 * sin(2.3 * mph + 1.1)) + uFinMove.w);
  float fhz = mix(0.2, 0.6, fishHash(mid * 9.0 + uFlut.w * 13.0));
  float fph = 6.2831853 * (fhz * uFinMove.x + fishHash(mid * 4.0 + uFlut.w * 3.0));
  float fold = uFinMove.z + uFinMove2.x * (0.7 * sin(fph) + 0.3 * sin(2.6 * fph + 0.8));
  fold += uFinMove2.z * finWhim(mid + uFlut.w * 3.1, uFinMove.x);
  fold = clamp(fold, 0.0, 1.0) * uFinMove2.w;
  float h = abs(finH);
  vec3 base = vec3(fishP.x, fishP.y - finH, fishP.z);
  vec2 ray = vec2(-h * sin(fold), finH * cos(fold));
  fishP = base + vec3(ray.x, ray.y * cos(tilt), ray.y * sin(tilt));
  float tc = cos(tilt), ts = sin(tilt);
  objectNormal = vec3(objectNormal.x, objectNormal.y * tc - objectNormal.z * ts, objectNormal.y * ts + objectNormal.z * tc);
}
if (flutter.x > 0.0 && (uFlut.y > 0.0 || uFlut.z > 0.0)) {
  float fsF = (uSnout - fishP.x) / uLen;
  float arg = 6.2831853 * (2.5 * uFlut.x - fsF * 2.5 - fishP.y / uLen * 1.5);
  float fa = uLen * uFlut.y * pow(flutter.x, 1.5) * (part == 4.0 ? 0.1 : 1.0);
  float fz = fa * (sin(arg) + 0.35 * sin(1.7 * arg + 1.3));
  float dz = fa * (cos(arg) + 0.6 * cos(1.7 * arg + 1.3)) * 6.2831853 * 2.5 / uLen;
  float fid = part == 4.0 ? (piv.z > 0.0 ? 0.31 : 0.77) : flutter.z;
  if (fid >= 0.0 && uFlut.z > 0.0) {
    float hz = mix(1.1, 2.3, fishHash(fid * 13.0 + uFlut.w * 31.0));
    float ph = 6.2831853 * (hz * uFlut.x + fishHash(fid * 7.0 + uFlut.w * 17.0 + 3.0) - flutter.y * 0.8 - flutter.x * 0.3);
    float W = flutter.x * (0.35 + 0.65 * flutter.y);
    float fl = uLen * uFlut.z * W * W * (part == 4.0 ? 0.6 : 1.0);
    fz += fl * (sin(ph) + 0.45 * sin(1.73 * ph + 2.1 + 6.2831853 * 0.37 * uFlut.x));
  }
  if (part == 4.0) fishP += objectNormal * fz;
  else {
    fishP.z += fz;
    objectNormal = normalize(vec3(objectNormal.x - dz * objectNormal.z, objectNormal.y, objectNormal.z));
  }
}
float jw = part == 8.0 ? 1.0 : part == 0.0 ? jaw.x : 0.0;
if (jw > 0.0) {
  float ja = (uMouthClose - min(uMouth, uMouthClose + 0.35)) * jw;
  if (ja != 0.0) {
    vec2 hp = fishP.xy - uMouthShape.xy;
    float jc = cos(ja), js = sin(ja);
    fishP.xy = uMouthShape.xy + vec2(hp.x * jc - hp.y * js, hp.x * js + hp.y * jc);
    objectNormal.xy = vec2(objectNormal.x * jc - objectNormal.y * js, objectNormal.x * js + objectNormal.y * jc);
  }
}
if (part == 9.0) {
  float uo = clamp(uMouth / uMouthUpper2.y, 0.0, 1.0);
  float ua = uMouthUpper2.x * uo * uo - uMouthUpper.z;
  fishP.xy += vec2(0.94, -0.34) * uMouthUpper2.w * uo * uo;
  vec2 hp = fishP.xy - uMouthUpper.xy;
  float uc = cos(ua), us = sin(ua);
  fishP.xy = uMouthUpper.xy + vec2(hp.x * uc - hp.y * us, hp.x * us + hp.y * uc);
  objectNormal.xy = vec2(objectNormal.x * uc - objectNormal.y * us, objectNormal.x * us + objectNormal.y * uc);
}
float fs = (uSnout - fishP.x) / uLen;
if (uNeck.x != 0.0) {
  float psi = -uNeck.x * smoothstep(uNeck.y, uNeck.z, fs);
  float S = neckInt(fs, uNeck.y, uNeck.z);
  float nc = cos(psi), ns = sin(psi);
  fishP.x += uLen * 0.5 * uNeck.x * uNeck.x * S + fishP.z * ns;
  fishP.z = -uLen * uNeck.x * S + fishP.z * nc;
  objectNormal = vec3(objectNormal.x * nc + objectNormal.z * ns, objectNormal.y, -objectNormal.x * ns + objectNormal.z * nc);
}
float fd = (lieH(fs + 0.002, cyc, amp) - lieH(fs - 0.002, cyc, amp)) / 0.004 * (-1.0 / uLen);
float bx = (fs - 0.35) * uLen;
fishP.z += lieH(fs, cyc, amp) + 0.5 * bend * bx * bx;
fd += bend * bx * (-1.0);
float sx = 0.35 * uLen;
fishP.z += 0.5 * uNeck.w * (bx * bx - sx * sx);
fd -= uNeck.w * bx;
objectNormal = normalize(vec3(objectNormal.x - fd * objectNormal.z, objectNormal.y, objectNormal.z));
`;
var FISH_LOOK = {
	day: {
		rough: .6,
		spec: 1,
		env: 0
	},
	night: {
		rough: .6,
		spec: 1,
		env: 0
	}
};
var lookU = {
	uRough: { value: FISH_LOOK.day.rough },
	uSpecK: { value: FISH_LOOK.day.spec },
	uEnvK: { value: FISH_LOOK.day.env },
	uMouthIn: { value: .4 },
	uAirLook: { value: new THREE.Vector3() }
};
var AIR_LOOK = {
	day: {
		max: .8,
		min: 0,
		k: .9
	},
	night: {
		max: .8,
		min: 0,
		k: .9
	}
};
var lookNight = false;
function setFishLook(night = lookNight) {
	lookNight = night;
	const l = night ? FISH_LOOK.night : FISH_LOOK.day;
	lookU.uRough.value = l.rough;
	lookU.uSpecK.value = l.spec;
	lookU.uEnvK.value = l.env;
	const a = night ? AIR_LOOK.night : AIR_LOOK.day;
	lookU.uAirLook.value.set(a.max, a.min, a.k);
}
setFishLook(false);
function swimMaterial(a, instanced = false) {
	const { map, swim, gill, mouth, eye, photos, headMap } = a;
	const env = swim.env ?? [
		.02,
		-.08,
		.16
	];
	const u = {
		uTime: { value: 0 },
		uSnout: { value: swim.snout },
		uLen: { value: swim.length },
		uLam: { value: swim.lambda },
		uSwimAmp: { value: swim.amp },
		uEnv: { value: new THREE.Vector3(...env) },
		uBreath: { value: .004 * swim.length },
		uPectRest: { value: swim.pect_rest ?? 0 },
		uLookAt: { value: 0 },
		uAir: { value: 0 },
		uFloor: { value: 0 },
		uHead: { value: 1 },
		uPower: { value: 0 },
		uNeck: { value: new THREE.Vector4(0, .23, .43, 0) },
		uFlut: { value: new THREE.Vector4(0, 0, 0, 0) },
		uFinMove: { value: new THREE.Vector4(0, 0, 0, 0) },
		uFinMove2: { value: new THREE.Vector4(0, 0, 0, a.foldMax) },
		uSwim: { value: new THREE.Vector4(0, 1, 0, .1) },
		uFin: { value: new THREE.Vector4(0, 0, .3, .2) },
		uGill: { value: 0 },
		uGillEdge: { value: padLine(gill?.edge, GILL_EDGE_N) },
		uGillHinge: { value: padLine(gill?.hinge, GILL_HINGE_N) },
		uGillShape2: { value: gill ? new THREE.Vector4(gill.top, gill.bottom, swim.crafted ? 0 : 1, .01 * swim.length) : new THREE.Vector4() },
		uGillBox: { value: gill ? new THREE.Vector2(Math.min(...gill.edge.map((p) => p[1])) - .006, Math.max(...gill.hinge.map((p) => p[1]))) : new THREE.Vector2() },
		uMouth: { value: 0 },
		uMouthShape: { value: mouth ? new THREE.Vector4(mouth.joint[0], mouth.joint[1], ...swim.crafted ? [1, 0] : mouthCutX(mouth)) : new THREE.Vector4() },
		uMouthEdge: { value: padXY(mouth && mouth.close === 0 ? mouth.lowerLip : mouth?.jawEdge, MOUTH_N) },
		uMouthUpper: { value: mouth ? new THREE.Vector4(mouth.upperPivot[0], mouth.upperPivot[1], mouth.upperClose, mouth.photoClose) : new THREE.Vector4() },
		uMouthUpper2: { value: mouth ? mouth.close > 0 ? new THREE.Vector4(0, mouth.close, 1, 0) : new THREE.Vector4(0, .4, 0, 0) : new THREE.Vector4(0, 1, 0, 0) },
		uMouthUpperPoly: { value: padXY(mouth?.upper, UPPER_N) },
		uMouthLip: { value: padXY(mouth?.lowerLip, MOUTH_N) },
		uMouthOn: { value: mouth ? 1 : 0 },
		uMouthClose: { value: mouth?.close ?? 0 },
		uEye: { value: eye ? new THREE.Vector4(eye.x, eye.y, eye.z, 1) : new THREE.Vector4() },
		uEyeBulge: { value: eye && !swim.crafted ? new THREE.Vector2(1.1, .0012) : new THREE.Vector2(1, 0) },
		uEyeTurn: { value: swim.crafted ? .4 : 1 },
		uHeadOn: { value: photos ? 1 : 0 },
		uHeadTex: { value: photos?.head ?? blankTexture() },
		uCoverTex: { value: photos?.cover ?? blankTexture() },
		uHeadMap: { value: new THREE.Vector4(headMap.x0, headMap.z0, headMap.k, swim.photo ? 1 : 0) },
		uHeadBox: { value: new THREE.Vector4(...headMap.box) }
	};
	if (instanced) return {
		material: lightSwimMaterial(map, u),
		uniforms: u
	};
	const m = new THREE.MeshStandardMaterial({
		map,
		roughness: .4,
		metalness: 0,
		side: THREE.DoubleSide,
		alphaTest: .5
	});
	m.onBeforeCompile = (sh) => {
		Object.assign(sh.uniforms, u, lookU);
		sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + SWIM_HEAD).replace("#include <beginnormal_vertex>", SWIM_BODY).replace("#include <begin_vertex>", "vec3 transformed = fishP;");
		sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + GILL_FRAG_HEAD + "\nuniform float uRough, uSpecK, uEnvK, uMouthIn, uAir;\nuniform vec3 uAirLook;").replace("#include <map_fragment>", "#include <map_fragment>\n" + PHOTO_FRAG + GILL_FRAG + FACE_FRAG).replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = uRough;\nif (vPart > 5.5 && vPart < 6.5) roughnessFactor = 0.07;\nif (vRim > 0.5 || (!gl_FrontFacing && (vPart < 0.5 || vPart > 7.5))) roughnessFactor = 0.9;").replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\nif (vPart < 0.5) roughnessFactor = mix(1.0, roughnessFactor, smoothstep(0.1, 0.6, abs(dot(normal, normalize(vViewPosition)))));").replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\nif (vPart < 0.5) { float graze = smoothstep(0.05, 0.45, abs(dot(normal, normalize(vViewPosition)))); reflectedLight.indirectSpecular *= graze; reflectedLight.directSpecular *= graze; }\nreflectedLight.directSpecular *= uSpecK; reflectedLight.indirectSpecular *= uEnvK;\nif (uAir > 0.0) {\n  float airEx = 1.0;\n  #ifdef TONE_MAPPING\n  airEx = toneMappingExposure;\n  #endif\n  vec3 airW = vec3(0.2126, 0.7152, 0.0722);\n  float airE = max(dot(reflectedLight.directDiffuse + reflectedLight.indirectDiffuse, airW) / max(dot(material.diffuseColor, airW), 0.02), 1e-4) * airEx;\n  float airS = airE > uAirLook.x ? pow(uAirLook.x / airE, uAirLook.z) : airE < uAirLook.y ? min(pow(uAirLook.y / airE, uAirLook.z), 4.0) : 1.0;\n  airS = mix(1.0, airS, uAir);\n  reflectedLight.directDiffuse *= airS; reflectedLight.indirectDiffuse *= airS;\n}").replace("#include <opaque_fragment>", "if (uMouthOn > 0.5 && !gl_FrontFacing && vRim < 0.5 && (vPart < 0.5 || vPart > 7.5)) outgoingLight = (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) / max(diffuseColor.rgb, vec3(0.03)) * vec3(0.36, 0.25, 0.23) * uMouthIn;\n#include <opaque_fragment>");
	};
	if (instanced) m.defines = { FISH_INSTANCED: "" };
	m.customProgramCacheKey = () => instanced ? "photo-fish-instanced" : "photo-fish";
	return {
		material: m,
		uniforms: u
	};
}
var LIGHT_LOOK = { ambient: .97 };
function lightSwimMaterial(map, u) {
	const lu = {
		...u,
		uAmbL: { value: LIGHT_LOOK.ambient }
	};
	const m = new THREE.MeshLambertMaterial({
		map,
		side: THREE.DoubleSide,
		alphaTest: .5
	});
	m.onBeforeCompile = (sh) => {
		Object.assign(sh.uniforms, lu);
		sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + SWIM_HEAD).replace("#include <beginnormal_vertex>", SWIM_BODY).replace("#include <begin_vertex>", "vec3 transformed = fishP;");
		sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + GILL_FRAG_HEAD + "\nuniform float uAmbL;").replace("#include <map_fragment>", "#include <map_fragment>\n" + PHOTO_FRAG + GILL_FRAG + FACE_FRAG).replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\nreflectedLight.indirectDiffuse *= uAmbL;");
	};
	m.defines = { FISH_INSTANCED: "" };
	m.customProgramCacheKey = () => "photo-fish-instanced-light";
	return m;
}
function shadowMaterial(map, u, instanced = false) {
	const m = new THREE.MeshBasicMaterial({
		map,
		side: THREE.DoubleSide,
		alphaTest: .5,
		transparent: true,
		depthWrite: false,
		polygonOffset: true,
		polygonOffsetFactor: -2,
		polygonOffsetUnits: -4
	});
	m.onBeforeCompile = (sh) => {
		Object.assign(sh.uniforms, u);
		sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + SWIM_HEAD + "\nvarying float vShadeI;").replace("#include <begin_vertex>", SWIM_BODY + "\nvec3 transformed = fishP;\n#ifdef FISH_INSTANCED\nvShadeI = iMisc.z;\n#else\nvShadeI = 1.0;\n#endif");
		sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uShade;\nuniform vec3 uShadeColor;\nvarying float vShadeI;").replace("#include <opaque_fragment>", "if (vShadeI < 0.005) discard;\ngl_FragColor = vec4(uShadeColor, uShade * vShadeI);");
	};
	if (instanced) m.defines = { FISH_INSTANCED: "" };
	m.customProgramCacheKey = () => instanced ? "photo-fish-shadow-instanced" : "photo-fish-shadow";
	return m;
}
var GILL_FRAG_HEAD = `
uniform vec4 uGillShape2, uEye;
uniform vec2 uGillBox;
uniform vec2 uGillEdge[${GILL_EDGE_N}];
uniform vec2 uGillHinge[${GILL_HINGE_N}];
float gillEdgeX(float y) {
  float x = uGillEdge[0].y;
  for (int i = 0; i < 39; i++) {
    vec2 a = uGillEdge[i], b = uGillEdge[i + 1];
    if (y >= a.x && y <= b.x && b.x > a.x) x = mix(a.y, b.y, (y - a.x) / (b.x - a.x));
  }
  return y > uGillEdge[39].x ? uGillEdge[39].y : x;
}
float gillHingeX(float y) {
  float x = uGillHinge[0].y;
  for (int i = 0; i < 39; i++) {
    vec2 a = uGillHinge[i], b = uGillHinge[i + 1];
    if (y >= a.x && y <= b.x && b.x > a.x) x = mix(a.y, b.y, (y - a.x) / (b.x - a.x));
  }
  return y > uGillHinge[39].x ? uGillHinge[39].y : x;
}
uniform float uGill, uMouth, uMouthOn, uMouthClose, uHeadOn;
uniform vec4 uMouthShape, uMouthUpper, uHeadMap, uHeadBox;
uniform vec4 uMouthUpper2;
uniform sampler2D uHeadTex, uCoverTex;
vec2 headUv(vec2 p) { return (vec2(uHeadMap.x - p.x * uHeadMap.z, uHeadMap.y - p.y * uHeadMap.z) - uHeadBox.xy) / uHeadBox.zw; }
float headIn(vec2 uv) { return step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0); }
uniform vec2 uMouthEdge[${MOUTH_N}];
uniform vec2 uMouthLip[${MOUTH_N}];
uniform vec2 uMouthUpperPoly[${UPPER_N}];
bool inUpperJaw(vec2 p) {
  bool inside = false;
  for (int i = 0; i < ${UPPER_N}; i++) {
    vec2 a = uMouthUpperPoly[i], b = uMouthUpperPoly[i == 0 ? 19 : i - 1];
    if ((a.y > p.y) != (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
float mouthLineY(vec2 l[${MOUTH_N}], float x) {
  float y = l[0].y;
  for (int i = 0; i < 7; i++) if (x >= l[i].x && x <= l[i + 1].x && l[i + 1].x > l[i].x) y = mix(l[i].y, l[i + 1].y, (x - l[i].x) / (l[i + 1].x - l[i].x));
  return x > l[7].x ? l[7].y : y;
}
varying vec3 vModel;
varying float vNz;
varying float vPart;
varying float vRim;
`;
var PHOTO_FRAG = `
if (uHeadOn > 0.5) {
  if (vPart < 0.5 && gl_FrontFacing) {
    vec2 hp = headUv(vModel.xy);
    vec4 hd = texture2D(uHeadTex, hp);
    float under = step(0.5, texture2D(uCoverTex, hp).a) * step(vModel.x, uGillBox.y);
    if (uGillShape2.z > 0.5 && under > 0.0) {
      float gy = vModel.y;
      under *= step(0.0, min(min(vModel.x - gillEdgeX(gy), gillHingeX(gy) - vModel.x), min(uGillShape2.x - gy, gy - uGillShape2.y))) * step(0.3, abs(vNz));
      under *= step(uGillShape2.w, gillHingeX(gy) - vModel.x) * step(0.6 * uGillShape2.w, uGillShape2.x - gy);
    }
    diffuseColor.rgb = mix(diffuseColor.rgb, hd.rgb, under * hd.a * headIn(hp));
  }
  if (uHeadMap.w > 0.5 && vPart > 5.5 && vPart < 6.5) {
    vec2 hp = headUv(vModel.xy);
    vec4 hd = texture2D(uHeadTex, hp);
    diffuseColor.rgb = mix(diffuseColor.rgb, hd.rgb, hd.a * headIn(hp));
  }
  if (vPart > 6.5 && vPart < 7.5 && gl_FrontFacing && vRim < 0.5) {
    vec2 hp = headUv(vModel.xy);
    vec4 cv = texture2D(uCoverTex, hp);
    diffuseColor.rgb = mix(diffuseColor.rgb, cv.rgb, cv.a * headIn(hp));
  }
  if (vPart > 7.5 && vPart < 8.5 && gl_FrontFacing && vRim < 0.5) {
    vec2 d = vModel.xy - uMouthShape.xy;
    float c = cos(uMouthUpper.w), s = sin(uMouthUpper.w);
    vec2 hp = headUv(uMouthShape.xy + vec2(d.x * c - d.y * s, d.x * s + d.y * c));
    vec4 hd = texture2D(uHeadTex, hp);
    diffuseColor.rgb = mix(diffuseColor.rgb, hd.rgb, hd.a * headIn(hp) * smoothstep(uMouthShape.x, uMouthShape.x + 0.008, vModel.x));
  }
  if (vPart > 7.5 && vPart < 8.5 && vRim > 0.5) {
    vec2 d = vModel.xy + vec2(-0.001, -0.002) - uMouthShape.xy;
    float c = cos(uMouthUpper.w), s = sin(uMouthUpper.w);
    vec2 hp = headUv(uMouthShape.xy + vec2(d.x * c - d.y * s, d.x * s + d.y * c));
    vec4 hd = texture2D(uHeadTex, hp);
    diffuseColor.rgb = mix(diffuseColor.rgb, hd.rgb, hd.a * headIn(hp));
  }
}
`;
var FACE_FRAG = `
if (uMouthOn > 0.5) {
  float mx = vModel.x;
  if (vPart < 0.5 && mx > uMouthShape.z && mx < uMouthShape.w) {
    if (vModel.y > mouthLineY(uMouthLip, mx) - 0.003 && ((uMouthUpper2.z > 0.5 && inUpperJaw(vModel.xy)) ||
        (mx > uMouthEdge[0].x && mx < uMouthLip[7].x + 0.002 && vModel.y < mouthLineY(uMouthEdge, mx)))) {
      discard;
    }
    if (uMouthUpper2.z < 0.5 && vModel.y > mouthLineY(uMouthLip, mx) && !inUpperJaw(vModel.xy)) {
      float uFront = uMouthUpperPoly[0].x;
      for (int i = 1; i < ${UPPER_N}; i++) uFront = max(uFront, uMouthUpperPoly[i].x);
      vec2 peak = uMouthLip[0];
      for (int i = 1; i < ${MOUTH_N}; i++) if (uMouthLip[i].y > peak.y) peak = uMouthLip[i];
      bool under = false;
      for (int i = 0; i < ${UPPER_N}; i++) {
        vec2 a = uMouthUpperPoly[i], b = uMouthUpperPoly[i == 0 ? 19 : i - 1];
        if ((a.x > mx) != (b.x > mx)) {
          float yc = a.y + (b.y - a.y) * (mx - a.x) / (b.x - a.x);
          if (yc > vModel.y && yc < vModel.y + uGillShape2.w * 1.5) under = true;
        }
      }
      if (mx > uFront || (mx > peak.x && under)) discard;
    }
  }
  if (!gl_FrontFacing && (vPart > 7.5 || (vPart < 0.5 && mx > uMouthEdge[0].x - 0.01))) diffuseColor.rgb = vec3(0.75, 0.77, 0.81);
  if (vPart > 8.5 && gl_FrontFacing && vRim > 0.5) diffuseColor.rgb *= 0.8;
  if (vPart > 7.5 && vPart < 8.5 && gl_FrontFacing) {
    if (vRim > 0.5) diffuseColor.rgb = uMouthUpper2.z > 0.5 ? vec3(0.62, 0.57, 0.57) : diffuseColor.rgb * 0.75;
    else diffuseColor.rgb *= 1.0 - 0.2 * (1.0 - smoothstep(0.0002, 0.0005, abs(mouthLineY(uMouthLip, mx) - vModel.y)));
  }
}
#ifndef FISH_INSTANCED
if (uEye.w > 0.5 && vPart < 0.5) {
  float ed = length(vModel.xy - uEye.xy) / uEye.z;
  diffuseColor.rgb *= 1.0 - 0.28 * exp(-pow((ed - 1.08) / 0.14, 2.0));
}
#endif
`;
var GILL_FRAG = `
if (uGillShape2.z > 0.5) {
  float gy = vModel.y, gx = vModel.x;
  if (vPart < 0.5 && abs(vModel.z) > 0.004 && gx > uGillBox.x && gx < uGillBox.y && gy < uGillShape2.x && gy > uGillShape2.y) {
    float ex = gillEdgeX(gy);
    float hx = gillHingeX(gy);
    float inX = gx - ex;
    float inside = min(min(inX, hx - gx), min(uGillShape2.x - gy, gy - uGillShape2.y));
    if (inside <= 0.0 && inX > -0.006 && gx < hx) {
      diffuseColor.rgb *= 1.0 - min(0.6, 0.3 * (1.0 + uGill * 2.0)) * (1.0 + inX / 0.006);
    }
  }
  if (vPart > 6.5 && vPart < 7.5) {
    if (vRim > 0.5) diffuseColor.rgb = vec3(0.07, 0.065, 0.07);
    else if (!gl_FrontFacing) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.24, 0.12, 0.13), 0.75);
  }
}
`;
var assets = new Map();
var cmY = (pts) => pts.map(([x, y]) => [y / 100, x / 100]);
var GILLS = {
	seabass: {
		edge: cmY([
			[19.12, -4.58],
			[18.09, -4.36],
			[17.65, -4.14],
			[17.28, -3.92],
			[17.06, -3.69],
			[16.84, -3.47],
			[16.65, -3.25],
			[16.51, -3.03],
			[16.36, -2.81],
			[16.25, -2.59],
			[16.14, -2.37],
			[16.03, -2.15],
			[15.92, -1.93],
			[15.81, -1.71],
			[15.66, -1.49],
			[15.51, -1.27],
			[15.33, -1.05],
			[15.15, -.83],
			[14.96, -.61],
			[14.74, -.39],
			[14.56, -.17],
			[14.34, .06],
			[14.23, .28],
			[14.08, .5],
			[14.08, .72],
			[14.3, .94],
			[14.52, 1.16],
			[14.74, 1.38],
			[14.96, 1.6],
			[15.22, 1.82],
			[15.44, 2.04],
			[15.7, 2.26],
			[15.96, 2.48],
			[16.21, 2.7],
			[16.47, 2.92],
			[16.88, 3.14],
			[17.32, 3.36],
			[17.9, 3.58],
			[18.68, 3.73]
		]),
		hinge: cmY([
			[19.52, -4.58],
			[21.07, -4.36],
			[21.5, -4.14],
			[21.5, -3.92],
			[21.5, -3.69],
			[21.5, -3.47],
			[21.5, -3.25],
			[21.5, -3.03],
			[20.04, -2.81],
			[19.89, -2.59],
			[19.78, -2.37],
			[19.71, -2.15],
			[19.63, -1.93],
			[19.6, -1.71],
			[19.56, -1.49],
			[19.52, -1.27],
			[19.52, -1.05],
			[19.49, -.83],
			[19.49, -.61],
			[19.45, -.39],
			[19.45, -.17],
			[19.45, .06],
			[19.45, .28],
			[19.45, .5],
			[19.49, .72],
			[19.49, .94],
			[19.52, 1.16],
			[19.52, 1.38],
			[19.56, 1.6],
			[19.6, 1.82],
			[19.63, 2.04],
			[19.67, 2.26],
			[19.71, 2.48],
			[19.78, 2.7],
			[19.85, 2.92],
			[19.93, 3.14],
			[20, 3.36],
			[20.04, 3.58],
			[19.6, 3.73]
		]),
		top: .0373,
		bottom: -.0458,
		pivotMax: .2
	},
	aji: {
		edge: cmY([
			[8.34, -2.18],
			[8.08, -2.09],
			[7.94, -1.99],
			[7.8, -1.9],
			[7.71, -1.81],
			[7.61, -1.71],
			[7.52, -1.62],
			[7.45, -1.52],
			[7.39, -1.43],
			[7.32, -1.34],
			[7.26, -1.24],
			[7.2, -1.15],
			[7.14, -1.06],
			[7.07, -.96],
			[7.01, -.87],
			[6.95, -.77],
			[6.89, -.68],
			[6.82, -.59],
			[6.76, -.49],
			[6.7, -.4],
			[6.61, -.31],
			[6.51, -.21],
			[6.58, -.12],
			[6.67, -.03],
			[6.77, .07],
			[6.82, .16],
			[6.85, .26],
			[6.88, .35],
			[6.91, .44],
			[6.95, .54],
			[6.98, .63],
			[7.02, .72],
			[7.08, .82],
			[7.14, .91],
			[7.21, 1.01],
			[7.3, 1.1],
			[7.39, 1.19],
			[7.53, 1.29],
			[7.67, 1.38]
		]),
		hinge: cmY([
			[8.48, -2.18],
			[8.85, -2.09],
			[9.23, -1.99],
			[9.6, -1.9],
			[9.63, -1.81],
			[9.63, -1.71],
			[9.63, -1.62],
			[9.63, -1.52],
			[9.63, -1.43],
			[9.63, -1.34],
			[9.63, -1.24],
			[9.6, -1.15],
			[9.33, -1.06],
			[9.19, -.96],
			[9.07, -.87],
			[8.97, -.77],
			[8.89, -.68],
			[8.82, -.59],
			[8.76, -.49],
			[8.7, -.4],
			[8.67, -.31],
			[8.64, -.21],
			[8.61, -.12],
			[8.6, -.03],
			[8.6, .07],
			[8.6, .16],
			[8.6, .26],
			[8.61, .35],
			[8.64, .44],
			[8.66, .54],
			[8.68, .63],
			[8.71, .72],
			[8.76, .82],
			[8.81, .91],
			[8.85, 1.01],
			[8.9, 1.1],
			[8.62, 1.19],
			[8.34, 1.29],
			[8.06, 1.38]
		]),
		top: .014,
		bottom: -.022,
		pivotMax: .0901
	},
	tachiuo: {
		edge: cmY([
			[41.36, -2.78],
			[40.65, -2.62],
			[40.33, -2.47],
			[40.06, -2.31],
			[39.83, -2.15],
			[39.59, -2],
			[39.41, -1.84],
			[39.22, -1.68],
			[39.03, -1.53],
			[38.87, -1.37],
			[38.71, -1.21],
			[38.55, -1.05],
			[38.4, -.9],
			[38.24, -.74],
			[38.08, -.58],
			[37.94, -.43],
			[37.82, -.27],
			[37.69, -.11],
			[37.59, .04],
			[37.56, .2],
			[37.53, .36],
			[37.51, .51],
			[37.57, .67],
			[37.63, .83],
			[37.69, .98],
			[37.81, 1.14],
			[37.94, 1.3],
			[38.06, 1.45],
			[38.24, 1.61],
			[38.44, 1.77],
			[38.64, 1.93],
			[38.87, 2.08],
			[39.11, 2.24],
			[39.42, 2.4],
			[39.79, 2.55],
			[40.28, 2.71],
			[40.83, 2.87],
			[41.38, 3.02],
			[41.93, 3.18]
		]),
		hinge: cmY([
			[41.66, -2.78],
			[42.61, -2.62],
			[43.23, -2.47],
			[43.86, -2.31],
			[44.49, -2.15],
			[45.06, -2],
			[45.52, -1.84],
			[45.61, -1.68],
			[42.75, -1.53],
			[42.44, -1.37],
			[42.25, -1.21],
			[42.15, -1.05],
			[42.06, -.9],
			[41.99, -.74],
			[41.96, -.58],
			[41.94, -.43],
			[41.91, -.27],
			[41.91, -.11],
			[41.93, .04],
			[41.96, .2],
			[41.98, .36],
			[42, .51],
			[42.05, .67],
			[42.09, .83],
			[42.14, .98],
			[42.18, 1.14],
			[42.24, 1.3],
			[42.31, 1.45],
			[42.38, 1.61],
			[42.44, 1.77],
			[42.51, 1.93],
			[42.56, 2.08],
			[42.61, 2.24],
			[42.67, 2.4],
			[42.69, 2.55],
			[42.67, 2.71],
			[42.64, 2.87],
			[42.61, 3.02],
			[42.12, 3.18]
		]),
		top: .032,
		bottom: -.028,
		pivotMax: .4311
	},
	sawara: {
		edge: cmY([
			[27.45, -4.78],
			[26.98, -4.58],
			[26.68, -4.38],
			[26.48, -4.18],
			[26.29, -3.97],
			[26.21, -3.77],
			[26.14, -3.57],
			[26.06, -3.37],
			[26, -3.17],
			[25.97, -2.97],
			[25.95, -2.76],
			[25.93, -2.56],
			[25.91, -2.36],
			[25.9, -2.16],
			[25.9, -1.96],
			[25.9, -1.76],
			[25.9, -1.55],
			[25.89, -1.35],
			[25.87, -1.15],
			[25.84, -.95],
			[25.82, -.75],
			[25.81, -.55],
			[25.84, -.35],
			[25.87, -.14],
			[25.89, .06],
			[26.01, .26],
			[26.14, .46],
			[26.28, .66],
			[26.46, .86],
			[26.67, 1.07],
			[26.87, 1.27],
			[27.1, 1.47],
			[27.33, 1.67],
			[27.57, 1.87],
			[27.95, 2.07],
			[28.35, 2.28],
			[28.87, 2.48],
			[29.51, 2.68],
			[30.64, 2.88]
		]),
		hinge: cmY([
			[28.39, -4.78],
			[29.27, -4.58],
			[29.94, -4.38],
			[30.66, -4.18],
			[31.44, -3.97],
			[32.5, -3.77],
			[33.24, -3.57],
			[33.89, -3.37],
			[34.41, -3.17],
			[34.41, -2.97],
			[31.73, -2.76],
			[31.63, -2.56],
			[31.53, -2.36],
			[31.5, -2.16],
			[31.5, -1.96],
			[31.5, -1.76],
			[31.5, -1.55],
			[31.53, -1.35],
			[31.57, -1.15],
			[31.61, -.95],
			[31.65, -.75],
			[31.69, -.55],
			[31.73, -.35],
			[31.77, -.14],
			[31.81, .06],
			[31.85, .26],
			[31.89, .46],
			[31.93, .66],
			[31.97, .86],
			[32.01, 1.07],
			[32.05, 1.27],
			[32.09, 1.47],
			[32.12, 1.67],
			[32.14, 1.87],
			[32.16, 2.07],
			[32.18, 2.28],
			[32.2, 2.48],
			[31.84, 2.68],
			[30.96, 2.88]
		]),
		top: .029,
		bottom: -.048,
		pivotMax: .3241
	},
	kamasu: {
		edge: cmY([
			[9.77, -1.78],
			[9.66, -1.7],
			[9.54, -1.63],
			[9.45, -1.55],
			[9.38, -1.48],
			[9.3, -1.4],
			[9.23, -1.33],
			[9.17, -1.25],
			[9.12, -1.18],
			[9.07, -1.1],
			[9.02, -1.03],
			[8.97, -.95],
			[8.92, -.88],
			[8.87, -.8],
			[8.82, -.73],
			[8.75, -.65],
			[8.68, -.58],
			[8.6, -.5],
			[8.56, -.43],
			[8.53, -.35],
			[8.54, -.27],
			[8.65, -.2],
			[8.76, -.12],
			[8.83, -.05],
			[8.88, .03],
			[8.93, .1],
			[8.98, .18],
			[9.03, .25],
			[9.08, .33],
			[9.14, .4],
			[9.19, .48],
			[9.25, .55],
			[9.33, .63],
			[9.4, .7],
			[9.48, .78],
			[9.58, .85],
			[9.69, .93],
			[10.22, 1],
			[10.52, 1.08]
		]),
		hinge: cmY([
			[10.3, -1.78],
			[10.68, -1.7],
			[11.55, -1.63],
			[11.93, -1.55],
			[12.04, -1.48],
			[12.04, -1.4],
			[12.04, -1.33],
			[11.31, -1.25],
			[11.18, -1.18],
			[11.1, -1.1],
			[11.03, -1.03],
			[10.95, -.95],
			[10.88, -.88],
			[10.83, -.8],
			[10.78, -.73],
			[10.73, -.65],
			[10.69, -.58],
			[10.68, -.5],
			[10.66, -.43],
			[10.64, -.35],
			[10.62, -.27],
			[10.6, -.2],
			[10.62, -.12],
			[10.64, -.05],
			[10.66, .03],
			[10.68, .1],
			[10.69, .18],
			[10.74, .25],
			[10.8, .33],
			[10.85, .4],
			[10.91, .48],
			[10.96, .55],
			[11.06, .63],
			[11.21, .7],
			[11.36, .78],
			[11.51, .85],
			[11.66, .93],
			[11.78, 1],
			[11.48, 1.08]
		]),
		top: .011,
		bottom: -.018,
		pivotMax: .1116
	},
	buri: {
		edge: cmY([
			[26.2, -6.58],
			[24.31, -6.29],
			[23.54, -6],
			[23.08, -5.71],
			[22.62, -5.42],
			[22.35, -5.12],
			[22.09, -4.83],
			[21.83, -4.54],
			[21.63, -4.25],
			[21.48, -3.96],
			[21.33, -3.67],
			[21.19, -3.38],
			[21.07, -3.09],
			[20.98, -2.8],
			[20.89, -2.51],
			[20.8, -2.21],
			[20.71, -1.92],
			[20.68, -1.63],
			[20.65, -1.34],
			[20.62, -1.05],
			[20.6, -.76],
			[20.57, -.47],
			[20.54, -.18],
			[20.51, .11],
			[20.4, .41],
			[20.25, .7],
			[20.11, .99],
			[20.43, 1.28],
			[20.73, 1.57],
			[20.84, 1.86],
			[20.98, 2.15],
			[21.12, 2.44],
			[21.27, 2.73],
			[21.52, 3.02],
			[21.82, 3.32],
			[22.19, 3.61],
			[22.72, 3.9],
			[23.42, 4.19],
			[24.96, 4.48]
		]),
		hinge: cmY([
			[26.65, -6.58],
			[28.36, -6.29],
			[29.26, -6],
			[29.26, -5.71],
			[29.26, -5.42],
			[29.26, -5.12],
			[29.26, -4.83],
			[29.26, -4.54],
			[29.26, -4.25],
			[29.26, -3.96],
			[26.26, -3.67],
			[26.1, -3.38],
			[25.98, -3.09],
			[25.93, -2.8],
			[25.87, -2.51],
			[25.82, -2.21],
			[25.81, -1.92],
			[25.84, -1.63],
			[25.86, -1.34],
			[25.89, -1.05],
			[25.93, -.76],
			[26, -.47],
			[26.07, -.18],
			[26.13, .11],
			[26.2, .41],
			[26.31, .7],
			[26.41, .99],
			[26.51, 1.28],
			[26.62, 1.57],
			[26.73, 1.86],
			[26.86, 2.15],
			[27, 2.44],
			[27.13, 2.73],
			[27.27, 3.02],
			[27.35, 3.32],
			[27.43, 3.61],
			[27.5, 3.9],
			[27.57, 4.19],
			[26.61, 4.48]
		]),
		top: .045,
		bottom: -.066,
		pivotMax: .2726
	},
	hiramasa: {
		edge: cmY([
			[30.15, -7.18],
			[28.36, -6.87],
			[27.42, -6.55],
			[26.93, -6.24],
			[26.43, -5.92],
			[26.14, -5.61],
			[25.86, -5.29],
			[25.59, -4.98],
			[25.42, -4.66],
			[25.24, -4.35],
			[25.07, -4.03],
			[24.94, -3.72],
			[24.83, -3.4],
			[24.73, -3.09],
			[24.62, -2.77],
			[24.54, -2.46],
			[24.46, -2.14],
			[24.38, -1.83],
			[24.3, -1.51],
			[24.12, -1.2],
			[23.93, -.89],
			[23.74, -.57],
			[23.74, -.26],
			[23.8, .06],
			[23.86, .37],
			[23.91, .69],
			[23.94, 1],
			[23.97, 1.32],
			[23.99, 1.63],
			[24.1, 1.95],
			[24.22, 2.26],
			[24.35, 2.58],
			[24.53, 2.89],
			[24.74, 3.21],
			[24.95, 3.52],
			[25.27, 3.84],
			[25.63, 4.15],
			[26.13, 4.47],
			[26.76, 4.78]
		]),
		hinge: cmY([
			[30.47, -7.18],
			[32.61, -6.87],
			[32.71, -6.55],
			[32.71, -6.24],
			[32.71, -5.92],
			[32.71, -5.61],
			[32.71, -5.29],
			[32.71, -4.98],
			[32.71, -4.66],
			[32.71, -4.35],
			[32.71, -4.03],
			[29.16, -3.72],
			[29.1, -3.4],
			[29.1, -3.09],
			[29.1, -2.77],
			[29.1, -2.46],
			[29.1, -2.14],
			[29.12, -1.83],
			[29.16, -1.51],
			[29.21, -1.2],
			[29.25, -.89],
			[29.29, -.57],
			[29.35, -.26],
			[29.4, .06],
			[29.46, .37],
			[29.52, .69],
			[29.58, 1],
			[29.66, 1.32],
			[29.74, 1.63],
			[29.83, 1.95],
			[29.91, 2.26],
			[29.99, 2.58],
			[30.15, 2.89],
			[30.3, 3.21],
			[30.46, 3.52],
			[30.83, 3.84],
			[31.01, 4.15],
			[29.68, 4.47],
			[27.81, 4.78]
		]),
		top: .048,
		bottom: -.072,
		pivotMax: .3046
	},
	magochi: {
		edge: cmY([
			[14.55, -2.88],
			[14.2, -2.73],
			[13.86, -2.58],
			[13.59, -2.43],
			[13.33, -2.27],
			[13.11, -2.12],
			[12.92, -1.97],
			[12.74, -1.82],
			[12.57, -1.67],
			[12.42, -1.52],
			[12.26, -1.36],
			[12.11, -1.21],
			[11.97, -1.06],
			[11.84, -.91],
			[11.71, -.76],
			[11.59, -.61],
			[11.47, -.45],
			[11.37, -.3],
			[11.27, -.15],
			[11.17, 0],
			[11.06, .15],
			[10.94, .3],
			[10.82, .45],
			[10.69, .61],
			[10.54, .76],
			[10.39, .91],
			[10.27, 1.06],
			[10.19, 1.21],
			[10.12, 1.36],
			[10.33, 1.52],
			[10.63, 1.67],
			[10.98, 1.82],
			[11.33, 1.97],
			[11.68, 2.12],
			[12.04, 2.27],
			[12.39, 2.43],
			[12.75, 2.58],
			[13.14, 2.73],
			[13.55, 2.88]
		]),
		hinge: cmY([
			[15.38, -2.88],
			[15.99, -2.73],
			[16.59, -2.58],
			[17.09, -2.43],
			[17.09, -2.27],
			[17.09, -2.12],
			[15.92, -1.97],
			[15.41, -1.82],
			[15.06, -1.67],
			[14.8, -1.52],
			[14.62, -1.36],
			[14.44, -1.21],
			[14.29, -1.06],
			[14.26, -.91],
			[14.23, -.76],
			[14.2, -.61],
			[14.32, -.45],
			[14.44, -.3],
			[14.56, -.15],
			[14.78, 0],
			[15.04, .15],
			[15.31, .3],
			[15.92, .45],
			[16.28, .61],
			[16.53, .76],
			[16.58, .91],
			[16.56, 1.06],
			[16.53, 1.21],
			[16.51, 1.36],
			[16.5, 1.52],
			[16.5, 1.67],
			[16.5, 1.82],
			[16.5, 1.97],
			[16.43, 2.12],
			[15.98, 2.27],
			[15.61, 2.43],
			[15.25, 2.58],
			[14.69, 2.73],
			[13.76, 2.88]
		]),
		top: .029,
		bottom: -.029,
		pivotMax: .1597
	},
	kurodai: {
		edge: cmY([
			[14.34, -4.78],
			[13.28, -4.58],
			[12.76, -4.38],
			[12.38, -4.18],
			[12.13, -3.98],
			[11.89, -3.79],
			[11.76, -3.59],
			[11.62, -3.39],
			[11.49, -3.19],
			[11.39, -2.99],
			[11.3, -2.79],
			[11.2, -2.59],
			[11.13, -2.39],
			[11.06, -2.19],
			[11, -1.99],
			[10.93, -1.8],
			[10.87, -1.6],
			[10.8, -1.4],
			[10.68, -1.2],
			[10.56, -1],
			[10.43, -.8],
			[10.28, -.6],
			[10.27, -.4],
			[10.42, -.2],
			[10.56, -.01],
			[10.7, .19],
			[10.83, .39],
			[10.95, .59],
			[11.05, .79],
			[11.14, .99],
			[11.24, 1.19],
			[11.34, 1.39],
			[11.44, 1.59],
			[11.55, 1.79],
			[11.67, 1.98],
			[11.79, 2.18],
			[12.1, 2.38],
			[12.54, 2.58],
			[13.38, 2.78]
		]),
		hinge: cmY([
			[14.58, -4.78],
			[15.38, -4.58],
			[16.15, -4.38],
			[16.22, -4.18],
			[16.22, -3.98],
			[16.22, -3.79],
			[16.22, -3.59],
			[16.22, -3.39],
			[16.22, -3.19],
			[15.3, -2.99],
			[15.21, -2.79],
			[15.12, -2.59],
			[15.04, -2.39],
			[14.99, -2.19],
			[14.97, -1.99],
			[14.94, -1.8],
			[14.92, -1.6],
			[14.9, -1.4],
			[14.9, -1.2],
			[14.9, -1],
			[14.9, -.8],
			[14.9, -.6],
			[14.9, -.4],
			[14.9, -.2],
			[14.9, -.01],
			[14.9, .19],
			[14.9, .39],
			[14.9, .59],
			[14.89, .79],
			[14.87, .99],
			[14.85, 1.19],
			[14.83, 1.39],
			[14.81, 1.59],
			[14.79, 1.79],
			[14.77, 1.98],
			[14.75, 2.18],
			[14.73, 2.38],
			[14.71, 2.58],
			[14.22, 2.78]
		]),
		top: .028,
		bottom: -.048,
		pivotMax: .1522
	},
	saba: {
		edge: cmY([
			[10.34, -2.88],
			[10.07, -2.75],
			[9.98, -2.62],
			[9.9, -2.5],
			[9.87, -2.37],
			[9.84, -2.24],
			[9.8, -2.11],
			[9.78, -1.98],
			[9.75, -1.86],
			[9.73, -1.73],
			[9.7, -1.6],
			[9.7, -1.47],
			[9.7, -1.35],
			[9.7, -1.22],
			[9.7, -1.09],
			[9.67, -.96],
			[9.65, -.83],
			[9.62, -.71],
			[9.6, -.58],
			[9.6, -.45],
			[9.6, -.32],
			[9.6, -.19],
			[9.67, -.07],
			[9.73, .06],
			[9.79, .19],
			[9.86, .32],
			[9.92, .45],
			[9.99, .57],
			[10.05, .7],
			[10.11, .83],
			[10.18, .96],
			[10.28, 1.08],
			[10.41, 1.21],
			[10.55, 1.34],
			[10.72, 1.47],
			[10.9, 1.6],
			[11.21, 1.72],
			[11.66, 1.85],
			[12.3, 1.98]
		]),
		hinge: cmY([
			[11.02, -2.88],
			[11.79, -2.75],
			[12.33, -2.62],
			[12.72, -2.5],
			[13.15, -2.37],
			[13.15, -2.24],
			[13.15, -2.11],
			[11, -1.98],
			[11, -1.86],
			[11.03, -1.73],
			[11.08, -1.6],
			[11.13, -1.47],
			[11.18, -1.35],
			[11.24, -1.22],
			[11.31, -1.09],
			[11.37, -.96],
			[11.43, -.83],
			[11.5, -.71],
			[11.57, -.58],
			[11.64, -.45],
			[11.72, -.32],
			[11.79, -.19],
			[11.86, -.07],
			[11.93, .06],
			[11.99, .19],
			[12.06, .32],
			[12.12, .45],
			[12.19, .57],
			[12.25, .7],
			[12.31, .83],
			[12.38, .96],
			[12.44, 1.08],
			[12.51, 1.21],
			[12.57, 1.34],
			[12.63, 1.47],
			[12.7, 1.6],
			[12.76, 1.72],
			[12.83, 1.85],
			[12.89, 1.98]
		]),
		top: .02,
		bottom: -.029,
		pivotMax: .1227
	},
	madai: {
		edge: cmY([
			[15.32, -5.98],
			[14.25, -5.72],
			[13.75, -5.47],
			[13.39, -5.21],
			[13.05, -4.95],
			[12.8, -4.7],
			[12.54, -4.44],
			[12.34, -4.18],
			[12.16, -3.93],
			[11.98, -3.67],
			[11.84, -3.41],
			[11.69, -3.15],
			[11.54, -2.9],
			[11.39, -2.64],
			[11.25, -2.38],
			[11.05, -2.13],
			[10.82, -1.87],
			[10.6, -1.61],
			[10.54, -1.36],
			[10.61, -1.1],
			[10.69, -.84],
			[10.79, -.59],
			[10.91, -.33],
			[11.02, -.07],
			[11.14, .18],
			[11.27, .44],
			[11.4, .7],
			[11.53, .95],
			[11.67, 1.21],
			[11.82, 1.47],
			[11.98, 1.73],
			[12.13, 1.98],
			[12.32, 2.24],
			[12.55, 2.5],
			[12.78, 2.75],
			[13.01, 3.01],
			[13.4, 3.27],
			[13.78, 3.52],
			[14.8, 3.78]
		]),
		hinge: cmY([
			[15.7, -5.98],
			[16.48, -5.72],
			[16.48, -5.47],
			[16.48, -5.21],
			[16.48, -4.95],
			[16.48, -4.7],
			[16.48, -4.44],
			[16.48, -4.18],
			[15.14, -3.93],
			[15.03, -3.67],
			[14.98, -3.41],
			[14.95, -3.15],
			[14.92, -2.9],
			[14.9, -2.64],
			[14.9, -2.38],
			[14.9, -2.13],
			[14.9, -1.87],
			[14.9, -1.61],
			[14.9, -1.36],
			[14.9, -1.1],
			[14.9, -.84],
			[14.9, -.59],
			[14.9, -.33],
			[14.9, -.07],
			[14.9, .18],
			[14.91, .44],
			[14.94, .7],
			[14.97, .95],
			[14.99, 1.21],
			[15.02, 1.47],
			[15.05, 1.73],
			[15.08, 1.98],
			[15.11, 2.24],
			[15.21, 2.5],
			[15.31, 2.75],
			[15.41, 3.01],
			[15.58, 3.27],
			[15.75, 3.52],
			[14.99, 3.78]
		]),
		top: .038,
		bottom: -.06,
		pivotMax: .1535
	},
	kasago: {
		edge: cmY([
			[7.62, -2.28],
			[7.18, -2.15],
			[6.86, -2.02],
			[6.63, -1.9],
			[6.41, -1.77],
			[6.24, -1.64],
			[6.11, -1.51],
			[5.98, -1.38],
			[5.86, -1.26],
			[5.73, -1.13],
			[5.6, -1],
			[5.48, -.87],
			[5.38, -.75],
			[5.27, -.62],
			[5.17, -.49],
			[5.08, -.36],
			[5, -.23],
			[4.92, -.11],
			[4.85, .02],
			[4.77, .15],
			[4.69, .28],
			[4.62, .41],
			[4.54, .53],
			[4.48, .66],
			[4.42, .79],
			[4.37, .92],
			[4.32, 1.05],
			[4.3, 1.17],
			[4.3, 1.3],
			[4.3, 1.43],
			[4.29, 1.56],
			[4.25, 1.68],
			[4.22, 1.81],
			[4.3, 1.94],
			[4.62, 2.07],
			[4.89, 2.2],
			[5.2, 2.32],
			[5.71, 2.45],
			[6.22, 2.58]
		]),
		hinge: cmY([
			[7.8, -2.28],
			[8.32, -2.15],
			[8.33, -2.02],
			[8.33, -1.9],
			[8.33, -1.77],
			[8.33, -1.64],
			[8.33, -1.51],
			[7.99, -1.38],
			[7.93, -1.26],
			[7.86, -1.13],
			[7.8, -1],
			[7.77, -.87],
			[7.75, -.75],
			[7.72, -.62],
			[7.7, -.49],
			[7.67, -.36],
			[7.65, -.23],
			[7.62, -.11],
			[7.6, .02],
			[7.6, .15],
			[7.6, .28],
			[7.6, .41],
			[7.59, .53],
			[7.57, .66],
			[7.54, .79],
			[7.52, .92],
			[7.5, 1.05],
			[7.5, 1.17],
			[7.5, 1.3],
			[7.5, 1.43],
			[7.5, 1.56],
			[7.5, 1.68],
			[7.5, 1.81],
			[7.5, 1.94],
			[7.5, 2.07],
			[7.5, 2.2],
			[7.5, 2.32],
			[7.29, 2.45],
			[6.78, 2.58]
		]),
		top: .026,
		bottom: -.023,
		pivotMax: .0778
	},
	mebaru: {
		edge: cmY([
			[7.22, -2.48],
			[6.84, -2.37],
			[6.62, -2.26],
			[6.44, -2.15],
			[6.29, -2.04],
			[6.14, -1.93],
			[6.02, -1.82],
			[5.91, -1.71],
			[5.8, -1.6],
			[5.72, -1.49],
			[5.64, -1.39],
			[5.56, -1.28],
			[5.49, -1.17],
			[5.46, -1.06],
			[5.44, -.95],
			[5.41, -.84],
			[5.36, -.73],
			[5.31, -.62],
			[5.25, -.51],
			[5.2, -.4],
			[5.17, -.29],
			[5.15, -.18],
			[5.12, -.07],
			[5.09, .04],
			[5.05, .15],
			[5.01, .26],
			[4.96, .37],
			[4.88, .48],
			[4.81, .59],
			[4.99, .69],
			[5.21, .8],
			[5.41, .91],
			[5.52, 1.02],
			[5.63, 1.13],
			[5.74, 1.24],
			[5.85, 1.35],
			[6.02, 1.46],
			[6.24, 1.57],
			[6.62, 1.68]
		]),
		hinge: cmY([
			[7.74, -2.48],
			[7.96, -2.37],
			[8.18, -2.26],
			[8.19, -2.15],
			[8.19, -2.04],
			[8.19, -1.93],
			[8.19, -1.82],
			[8.19, -1.71],
			[8.19, -1.6],
			[7.8, -1.49],
			[7.72, -1.39],
			[7.65, -1.28],
			[7.59, -1.17],
			[7.56, -1.06],
			[7.54, -.95],
			[7.51, -.84],
			[7.49, -.73],
			[7.46, -.62],
			[7.44, -.51],
			[7.42, -.4],
			[7.4, -.29],
			[7.4, -.18],
			[7.4, -.07],
			[7.4, .04],
			[7.4, .15],
			[7.4, .26],
			[7.4, .37],
			[7.4, .48],
			[7.4, .59],
			[7.4, .69],
			[7.4, .8],
			[7.4, .91],
			[7.4, 1.02],
			[7.4, 1.13],
			[7.41, 1.24],
			[7.44, 1.35],
			[7.47, 1.46],
			[7.49, 1.57],
			[7.18, 1.68]
		]),
		top: .017,
		bottom: -.025,
		pivotMax: .0764
	},
	kihada: {
		edge: cmY([
			[32.23, -9.03],
			[29.94, -8.62],
			[29.35, -8.21],
			[28.89, -7.8],
			[28.62, -7.39],
			[28.43, -6.98],
			[28.24, -6.57],
			[28.11, -6.16],
			[28.03, -5.75],
			[27.96, -5.34],
			[27.88, -4.93],
			[27.84, -4.52],
			[27.81, -4.11],
			[27.79, -3.7],
			[27.76, -3.29],
			[27.78, -2.88],
			[27.83, -2.47],
			[27.88, -2.06],
			[27.93, -1.65],
			[28.01, -1.24],
			[28.12, -.82],
			[28.22, -.41],
			[28.32, -0],
			[28.48, .41],
			[28.65, .82],
			[28.82, 1.23],
			[29.01, 1.64],
			[29.24, 2.05],
			[29.46, 2.46],
			[29.66, 2.87],
			[29.79, 3.28],
			[29.92, 3.69],
			[30.04, 4.1],
			[30.18, 4.51],
			[30.32, 4.92],
			[30.49, 5.33],
			[30.89, 5.74],
			[31.42, 6.15],
			[33.36, 6.56]
		]),
		hinge: cmY([
			[32.65, -9.03],
			[34.72, -8.62],
			[36.15, -8.21],
			[37.25, -7.8],
			[38.32, -7.39],
			[38.32, -6.98],
			[38.32, -6.57],
			[38.32, -6.16],
			[38.32, -5.75],
			[38.32, -5.34],
			[33.51, -4.93],
			[33.32, -4.52],
			[33.32, -4.11],
			[33.32, -3.7],
			[33.32, -3.29],
			[33.35, -2.88],
			[33.46, -2.47],
			[33.58, -2.06],
			[33.69, -1.65],
			[33.81, -1.24],
			[33.97, -.82],
			[34.13, -.41],
			[34.3, -0],
			[34.46, .41],
			[34.63, .82],
			[34.84, 1.23],
			[35.06, 1.64],
			[35.27, 2.05],
			[35.49, 2.46],
			[35.62, 2.87],
			[35.74, 3.28],
			[35.87, 3.69],
			[35.99, 4.1],
			[36.1, 4.51],
			[35.85, 4.92],
			[35.6, 5.33],
			[35.32, 5.74],
			[35.02, 6.15],
			[33.71, 6.56]
		]),
		top: .0658,
		bottom: -.0905,
		pivotMax: .3582
	},
	isaki: {
		edge: cmY([
			[12.17, -3.38],
			[11.92, -3.23],
			[11.68, -3.09],
			[11.44, -2.94],
			[11.19, -2.79],
			[11.05, -2.65],
			[10.9, -2.5],
			[10.77, -2.36],
			[10.69, -2.21],
			[10.6, -2.06],
			[10.51, -1.92],
			[10.45, -1.77],
			[10.39, -1.62],
			[10.33, -1.48],
			[10.27, -1.33],
			[10.21, -1.19],
			[10.16, -1.04],
			[10.1, -.89],
			[10.02, -.75],
			[9.95, -.6],
			[9.87, -.45],
			[9.77, -.31],
			[9.78, -.16],
			[10.07, -.01],
			[10.2, .13],
			[10.31, .28],
			[10.42, .42],
			[10.53, .57],
			[10.64, .72],
			[10.76, .86],
			[10.91, 1.01],
			[11.06, 1.16],
			[11.2, 1.3],
			[11.35, 1.45],
			[11.49, 1.59],
			[11.69, 1.74],
			[11.88, 1.89],
			[12.17, 2.03],
			[12.62, 2.18]
		]),
		hinge: cmY([
			[12.76, -3.38],
			[13.2, -3.23],
			[13.64, -3.09],
			[14, -2.94],
			[14, -2.79],
			[14, -2.65],
			[14, -2.5],
			[14, -2.36],
			[14, -2.21],
			[13.05, -2.06],
			[12.97, -1.92],
			[12.91, -1.77],
			[12.85, -1.62],
			[12.8, -1.48],
			[12.77, -1.33],
			[12.75, -1.19],
			[12.72, -1.04],
			[12.7, -.89],
			[12.7, -.75],
			[12.7, -.6],
			[12.7, -.45],
			[12.7, -.31],
			[12.7, -.16],
			[12.72, -.01],
			[12.74, .13],
			[12.76, .28],
			[12.78, .42],
			[12.8, .57],
			[12.81, .72],
			[12.83, .86],
			[12.85, 1.01],
			[12.87, 1.16],
			[12.89, 1.3],
			[12.91, 1.45],
			[12.96, 1.59],
			[13, 1.74],
			[13.04, 1.89],
			[13.08, 2.03],
			[12.78, 2.18]
		]),
		top: .022,
		bottom: -.034,
		pivotMax: .1313
	},
	kuchibuto: {
		edge: cmY([
			[14.76, -4.08],
			[13.97, -3.89],
			[13.59, -3.69],
			[13.36, -3.5],
			[13.13, -3.31],
			[12.91, -3.11],
			[12.72, -2.92],
			[12.52, -2.72],
			[12.39, -2.53],
			[12.26, -2.34],
			[12.13, -2.14],
			[12.02, -1.95],
			[11.93, -1.76],
			[11.83, -1.56],
			[11.76, -1.37],
			[11.71, -1.17],
			[11.65, -.98],
			[11.6, -.79],
			[11.6, -.59],
			[11.6, -.4],
			[11.6, -.21],
			[11.65, -.01],
			[11.71, .18],
			[11.76, .37],
			[11.83, .57],
			[11.91, .76],
			[12, .96],
			[12.08, 1.15],
			[12.18, 1.34],
			[12.29, 1.54],
			[12.4, 1.73],
			[12.52, 1.92],
			[12.68, 2.12],
			[12.84, 2.31],
			[13.01, 2.51],
			[13.35, 2.7],
			[13.69, 2.89],
			[14.13, 3.09],
			[14.96, 3.28]
		]),
		hinge: cmY([
			[15.04, -4.08],
			[15.82, -3.89],
			[15.82, -3.69],
			[15.82, -3.5],
			[15.82, -3.31],
			[15.82, -3.11],
			[15.82, -2.92],
			[14.57, -2.72],
			[14.54, -2.53],
			[14.51, -2.34],
			[14.5, -2.14],
			[14.5, -1.95],
			[14.5, -1.76],
			[14.49, -1.56],
			[14.47, -1.37],
			[14.44, -1.17],
			[14.41, -.98],
			[14.38, -.79],
			[14.36, -.59],
			[14.33, -.4],
			[14.3, -.21],
			[14.27, -.01],
			[14.25, .18],
			[14.22, .37],
			[14.21, .57],
			[14.24, .76],
			[14.27, .96],
			[14.29, 1.15],
			[14.34, 1.34],
			[14.4, 1.54],
			[14.45, 1.73],
			[14.51, 1.92],
			[14.59, 2.12],
			[14.68, 2.31],
			[14.76, 2.51],
			[14.84, 2.7],
			[14.93, 2.89],
			[15.01, 3.09],
			[15.09, 3.28]
		]),
		top: .033,
		bottom: -.041,
		pivotMax: .1482
	},
	shibudai: {
		edge: cmY([
			[13.08, -4.18],
			[12.37, -3.99],
			[11.99, -3.79],
			[11.7, -3.6],
			[11.41, -3.41],
			[11.21, -3.21],
			[11.02, -3.02],
			[10.84, -2.82],
			[10.68, -2.63],
			[10.51, -2.44],
			[10.36, -2.24],
			[10.23, -2.05],
			[10.1, -1.86],
			[9.97, -1.66],
			[9.85, -1.47],
			[9.72, -1.27],
			[9.58, -1.08],
			[9.43, -.89],
			[9.27, -.69],
			[9.14, -.5],
			[9.02, -.31],
			[8.91, -.11],
			[9.08, .08],
			[9.26, .27],
			[9.4, .47],
			[9.53, .66],
			[9.63, .86],
			[9.72, 1.05],
			[9.81, 1.24],
			[9.88, 1.44],
			[9.94, 1.63],
			[10.03, 1.82],
			[10.27, 2.02],
			[10.52, 2.21],
			[10.91, 2.41],
			[11.4, 2.6],
			[11.98, 2.79],
			[12.56, 2.99],
			[13.38, 3.18]
		]),
		hinge: cmY([
			[13.86, -4.18],
			[14.44, -3.99],
			[14.92, -3.79],
			[14.92, -3.6],
			[14.92, -3.41],
			[14.92, -3.21],
			[13.84, -3.02],
			[13.69, -2.82],
			[13.59, -2.63],
			[13.56, -2.44],
			[13.52, -2.24],
			[13.5, -2.05],
			[13.5, -1.86],
			[13.5, -1.66],
			[13.5, -1.47],
			[13.5, -1.27],
			[13.5, -1.08],
			[13.5, -.89],
			[13.5, -.69],
			[13.5, -.5],
			[13.52, -.31],
			[13.55, -.11],
			[13.57, .08],
			[13.6, .27],
			[13.6, .47],
			[13.6, .66],
			[13.6, .86],
			[13.6, 1.05],
			[13.62, 1.24],
			[13.64, 1.44],
			[13.67, 1.63],
			[13.69, 1.82],
			[13.68, 2.02],
			[13.66, 2.21],
			[13.63, 2.41],
			[13.6, 2.6],
			[13.57, 2.79],
			[13.54, 2.99],
			[13.5, 3.18]
		]),
		top: .032,
		bottom: -.042,
		pivotMax: .1392
	},
	onagagure: {
		edge: cmY([
			[17.14, -4.38],
			[16.59, -4.19],
			[16.22, -4.01],
			[15.88, -3.82],
			[15.61, -3.64],
			[15.35, -3.45],
			[15.17, -3.27],
			[14.98, -3.08],
			[14.81, -2.89],
			[14.67, -2.71],
			[14.52, -2.52],
			[14.39, -2.34],
			[14.27, -2.15],
			[14.14, -1.96],
			[14.04, -1.78],
			[13.95, -1.59],
			[13.85, -1.41],
			[13.77, -1.22],
			[13.69, -1.04],
			[13.62, -.85],
			[13.67, -.66],
			[13.76, -.48],
			[13.86, -.29],
			[13.98, -.11],
			[14.09, .08],
			[14.18, .26],
			[14.28, .45],
			[14.37, .64],
			[14.46, .82],
			[14.55, 1.01],
			[14.65, 1.19],
			[14.75, 1.38],
			[14.86, 1.57],
			[14.97, 1.75],
			[15.1, 1.94],
			[15.24, 2.12],
			[15.52, 2.31],
			[15.89, 2.49],
			[16.5, 2.68]
		]),
		hinge: cmY([
			[17.87, -4.38],
			[18.52, -4.19],
			[18.64, -4.01],
			[18.64, -3.82],
			[18.64, -3.64],
			[18.64, -3.45],
			[18.64, -3.27],
			[17.21, -3.08],
			[17.07, -2.89],
			[16.97, -2.71],
			[16.91, -2.52],
			[16.85, -2.34],
			[16.79, -2.15],
			[16.77, -1.96],
			[16.74, -1.78],
			[16.71, -1.59],
			[16.71, -1.41],
			[16.73, -1.22],
			[16.76, -1.04],
			[16.78, -.85],
			[16.81, -.66],
			[16.86, -.48],
			[16.9, -.29],
			[16.95, -.11],
			[16.99, .08],
			[17.06, .26],
			[17.13, .45],
			[17.2, .64],
			[17.27, .82],
			[17.33, 1.01],
			[17.37, 1.19],
			[17.42, 1.38],
			[17.47, 1.57],
			[17.51, 1.75],
			[17.53, 1.94],
			[17.55, 2.12],
			[17.58, 2.31],
			[17.6, 2.49],
			[17.15, 2.68]
		]),
		top: .027,
		bottom: -.044,
		pivotMax: .1751
	},
	isaki_young: {
		edge: cmY([
			[8.62, -2.48],
			[8.26, -2.38],
			[8.05, -2.28],
			[7.88, -2.18],
			[7.77, -2.07],
			[7.67, -1.97],
			[7.58, -1.87],
			[7.51, -1.77],
			[7.44, -1.67],
			[7.39, -1.57],
			[7.37, -1.46],
			[7.34, -1.36],
			[7.32, -1.26],
			[7.29, -1.16],
			[7.26, -1.06],
			[7.24, -.96],
			[7.21, -.85],
			[7.2, -.75],
			[7.2, -.65],
			[7.2, -.55],
			[7.17, -.45],
			[7.1, -.35],
			[7.03, -.25],
			[7.04, -.14],
			[7.12, -.04],
			[7.19, .06],
			[7.27, .16],
			[7.33, .26],
			[7.38, .36],
			[7.43, .47],
			[7.48, .57],
			[7.55, .67],
			[7.61, .77],
			[7.68, .87],
			[7.77, .97],
			[7.88, 1.08],
			[7.98, 1.18],
			[8.24, 1.28],
			[8.62, 1.38]
		]),
		hinge: cmY([
			[9.18, -2.48],
			[9.55, -2.38],
			[9.69, -2.28],
			[9.69, -2.18],
			[9.69, -2.07],
			[9.69, -1.97],
			[9.69, -1.87],
			[9.69, -1.77],
			[9.69, -1.67],
			[9.08, -1.57],
			[9.01, -1.46],
			[8.94, -1.36],
			[8.89, -1.26],
			[8.86, -1.16],
			[8.84, -1.06],
			[8.81, -.96],
			[8.8, -.85],
			[8.8, -.75],
			[8.8, -.65],
			[8.8, -.55],
			[8.8, -.45],
			[8.8, -.35],
			[8.8, -.25],
			[8.8, -.14],
			[8.8, -.04],
			[8.8, .06],
			[8.8, .16],
			[8.8, .26],
			[8.8, .36],
			[8.8, .47],
			[8.82, .57],
			[8.84, .67],
			[8.87, .77],
			[8.89, .87],
			[8.92, .97],
			[8.94, 1.08],
			[8.97, 1.18],
			[8.99, 1.28],
			[8.76, 1.38]
		]),
		top: .014,
		bottom: -.025,
		pivotMax: .0906
	}
};
function lineX(line, y) {
	if (y <= line[0][0]) return line[0][1];
	for (let i = 0; i + 1 < line.length; i++) {
		const [y0, x0] = line[i];
		const [y1, x1] = line[i + 1];
		if (y <= y1) return x0 + (x1 - x0) * (y - y0) / Math.max(y1 - y0, 1e-9);
	}
	return line[line.length - 1][1];
}
var HEAD_PHOTO = {
	x0: 832,
	z0: 451.5,
	k: 2720
};
var HEAD_FILES = {
	seabass: {
		file: "suzuki",
		box: [
			0,
			296,
			512,
			320
		]
	},
	aji: {
		file: "aji",
		box: [
			0,
			309,
			478,
			353
		]
	},
	tachiuo: {
		file: "tachiuo",
		box: [
			4,
			373,
			312,
			212
		]
	},
	sawara: {
		file: "sawara",
		box: [
			0,
			340,
			373,
			275
		]
	},
	kamasu: {
		file: "kamasu",
		box: [
			0,
			357,
			505,
			253
		]
	},
	buri: {
		file: "buri",
		box: [
			0,
			322,
			498,
			341
		]
	},
	hiramasa: {
		file: "hiramasa",
		box: [
			0,
			312,
			471,
			335
		]
	},
	magochi: {
		file: "magochi",
		box: [
			0,
			289,
			526,
			332
		]
	},
	kurodai: {
		file: "kurodai",
		box: [
			0,
			308,
			497,
			421
		]
	},
	saba: {
		file: "saba",
		box: [
			0,
			311,
			456,
			347
		]
	},
	madai: {
		file: "madai",
		box: [
			0,
			281,
			538,
			466
		]
	},
	kasago: {
		file: "kasago",
		box: [
			0,
			219,
			593,
			477
		]
	},
	mebaru: {
		file: "mebaru",
		box: [
			0,
			282,
			543,
			428
		]
	},
	kihada: {
		file: "kihada",
		box: [
			0,
			298,
			450,
			373
		]
	},
	isaki: {
		file: "isaki",
		box: [
			0,
			299,
			450,
			377
		]
	},
	kuchibuto: {
		file: "kuchibuto",
		box: [
			0,
			258,
			429,
			419
		]
	},
	shibudai: {
		file: "shibudai",
		box: [
			0,
			259,
			542,
			415
		]
	},
	onagagure: {
		file: "onagagure",
		box: [
			0,
			299,
			407,
			376
		]
	},
	isaki_young: {
		file: "isaki_young",
		box: [
			0,
			309,
			445,
			371
		]
	}
};
var blank = null;
function blankTexture() {
	if (!blank) {
		blank = new THREE.DataTexture(new Uint8Array([
			0,
			0,
			0,
			0
		]), 1, 1);
		blank.needsUpdate = true;
	}
	return blank;
}
function padXY(line, n) {
	const pts = (line ?? [[0, 0]]).map(([x, y]) => new THREE.Vector2(x, y));
	while (pts.length < n) pts.push(pts[pts.length - 1].clone());
	return pts.slice(0, n);
}
function padLine(line, n) {
	const pts = (line ?? [[0, 0]]).map(([y, x]) => new THREE.Vector2(y, x));
	while (pts.length < n) pts.push(pts[pts.length - 1].clone());
	return pts.slice(0, n);
}
var cm = (pts) => pts.map(([x, y]) => [x / 100, y / 100]);
var MOUTHS = {
	seabass: {
		joint: [.238, -.018],
		close: .36,
		lowerLip: cm([
			[24.2, -1.3],
			[25.8, -1.2],
			[27.4, -1.2],
			[28.8, -1.2],
			[29.7, -1.3]
		]),
		under: cm([
			[23.8, -1.8],
			[24.4, -2.6],
			[25.4, -2.9],
			[26.8, -2.8],
			[28.1, -2.4],
			[29.3, -1.9],
			[29.9, -1.6]
		]),
		jawEdge: cm([
			[24.2, -1.3],
			[25.4, -.7],
			[26.5, 0],
			[27.5, .7],
			[28.85, 1.05]
		]),
		upper: cm([
			[28.5, 1.3],
			[28, .8],
			[27.5, .2],
			[27, -.4],
			[26.6, -1],
			[26.2, -1.7],
			[26, -2.2],
			[25.6, -2.6],
			[25.1, -2.7],
			[25.3, -2.8],
			[25.6, -2.7],
			[26, -2.3],
			[26.5, -1.7],
			[27.1, -.9],
			[27.8, -.2],
			[28.5, .4],
			[29, .6],
			[29.1, .8],
			[29, 1.2],
			[28.7, 1.4]
		]),
		upperPivot: [.29, .013],
		upperClose: .4,
		photoClose: .2
	},
	aji: {
		joint: [.104, -.012],
		close: 0,
		lowerLip: cm([
			[10.6, -1.1],
			[10.96, -.86],
			[11.34, -.63],
			[11.72, -.42],
			[12.09, -.18],
			[12.5, -.1]
		]),
		under: cm([
			[10.1, -1.7],
			[10.53, -1.48],
			[10.97, -1.27],
			[11.39, -1.03],
			[11.78, -.74],
			[12.16, -.44],
			[12.5, -.1]
		]),
		jawEdge: cm([
			[10.6, -1.04],
			[10.96, -.79],
			[11.34, -.57],
			[11.72, -.36],
			[12.09, -.11],
			[12.5, -.04]
		]),
		upper: cm([
			[12.3, .2],
			[12.05, .2],
			[11.84, .09],
			[11.64, -.04],
			[11.43, -.18],
			[11.23, -.32],
			[11.02, -.45],
			[10.82, -.59],
			[10.61, -.72],
			[10.5, -.91],
			[10.54, -1.14],
			[10.73, -1.11],
			[10.93, -.97],
			[11.11, -.79],
			[11.29, -.63],
			[11.49, -.49],
			[11.69, -.34],
			[11.89, -.21],
			[12.09, -.07],
			[12.31, .05]
		]),
		upperPivot: [.123, .003],
		upperClose: 0,
		upperOpen: .175,
		photoClose: 0
	},
	tachiuo: {
		joint: [.437, -.02],
		close: 0,
		lowerLip: cm([
			[44, -1.8],
			[45.14, -1.26],
			[46.32, -.81],
			[47.54, -.48],
			[48.8, -.4],
			[50, -.6]
		]),
		under: cm([
			[43.5, -2.5],
			[44.64, -2.39],
			[45.76, -2.11],
			[46.9, -1.92],
			[48.01, -1.65],
			[49.09, -1.24],
			[50, -.6]
		]),
		jawEdge: cm([
			[44, -1.55],
			[45.14, -1.01],
			[46.32, -.56],
			[47.54, -.23],
			[48.8, -.15],
			[50, -.35]
		]),
		upper: cm([
			[50, -.1],
			[49.43, .26],
			[48.77, .44],
			[48.1, .44],
			[47.56, .06],
			[47.01, -.33],
			[46.38, -.57],
			[45.73, -.79],
			[45.09, -1.01],
			[44.49, -1.35],
			[44.01, -1.8],
			[44.62, -1.49],
			[45.24, -1.22],
			[45.87, -.97],
			[46.52, -.74],
			[47.17, -.55],
			[47.84, -.43],
			[48.52, -.4],
			[49.2, -.4],
			[49.85, -.5]
		]),
		upperPivot: [.498, .002],
		upperClose: 0,
		upperOpen: .044,
		photoClose: 0
	},
	sawara: {
		joint: [.327, -.024],
		close: 0,
		lowerLip: cm([
			[33, -2],
			[34.41, -1.57],
			[35.82, -1.14],
			[37.23, -.71],
			[38.66, -.36],
			[40, -.5]
		]),
		under: cm([
			[32.7, -3.8],
			[34.03, -3.49],
			[35.34, -3.12],
			[36.63, -2.66],
			[37.87, -2.1],
			[39.08, -1.47],
			[40, -.5]
		]),
		jawEdge: cm([
			[33, -1.8],
			[34.41, -1.37],
			[35.82, -.94],
			[37.23, -.51],
			[38.66, -.16],
			[40, -.3]
		]),
		upper: cm([
			[39.5, .3],
			[38.83, .64],
			[38.05, .59],
			[37.34, .23],
			[36.79, -.34],
			[36.1, -.73],
			[35.36, -1.04],
			[34.59, -1.27],
			[33.83, -1.52],
			[33.11, -1.84],
			[32.73, -2.49],
			[33.27, -2.77],
			[33.87, -2.23],
			[34.51, -1.77],
			[35.22, -1.39],
			[35.98, -1.14],
			[36.74, -.89],
			[37.49, -.62],
			[38.25, -.36],
			[39.02, -.14]
		]),
		upperPivot: [.392, .007],
		upperClose: 0,
		upperOpen: .157,
		photoClose: 0
	},
	kamasu: {
		joint: [.131, -.011],
		close: 0,
		lowerLip: cm([
			[13.3, -.9],
			[14.1, -.59],
			[14.95, -.46],
			[15.79, -.28],
			[16.64, -.17],
			[17.5, -.1]
		]),
		under: cm([
			[12.5, -1.5],
			[13.35, -1.29],
			[14.21, -1.1],
			[15.07, -.91],
			[15.93, -.72],
			[16.78, -.51],
			[17.5, -.1]
		]),
		jawEdge: cm([
			[13.3, -.81],
			[14.1, -.5],
			[14.95, -.38],
			[15.79, -.19],
			[16.64, -.08],
			[17.5, -.01]
		]),
		upper: cm([
			[17.1, .2],
			[16.67, .27],
			[16.22, .16],
			[15.78, .06],
			[15.35, -.08],
			[14.92, -.23],
			[14.48, -.36],
			[14.05, -.49],
			[13.62, -.65],
			[13.24, -.89],
			[12.9, -1.2],
			[13.31, -1.02],
			[13.68, -.77],
			[14.12, -.63],
			[14.55, -.5],
			[14.99, -.39],
			[15.44, -.32],
			[15.88, -.22],
			[16.32, -.1],
			[16.77, -.02]
		]),
		upperPivot: [.169, .003],
		upperClose: 0,
		upperOpen: .044,
		photoClose: 0
	},
	buri: {
		joint: [.327, -.016],
		close: 0,
		lowerLip: cm([
			[33.1, -1],
			[34.45, -.86],
			[35.79, -.66],
			[37.13, -.45],
			[38.46, -.22],
			[39.8, 0]
		]),
		under: cm([
			[32.6, -5.1],
			[34.13, -4.44],
			[35.64, -3.73],
			[37.11, -2.93],
			[38.52, -2.04],
			[39.53, -.82],
			[39.9, -.8]
		]),
		jawEdge: cm([
			[33.1, -.8],
			[34.45, -.66],
			[35.79, -.46],
			[37.13, -.25],
			[38.46, -.02],
			[39.8, .2]
		]),
		upper: cm([
			[39.8, .2],
			[39.53, 1],
			[38.99, 1.13],
			[38.32, .6],
			[37.54, .23],
			[36.72, -.04],
			[35.87, -.24],
			[35.02, -.38],
			[34.16, -.51],
			[33.31, -.66],
			[33.06, -1.33],
			[33.27, -2.17],
			[33.78, -2.84],
			[34.59, -2.84],
			[35.28, -2.33],
			[35.98, -1.83],
			[36.72, -1.37],
			[37.49, -.99],
			[38.29, -.65],
			[39.05, -.23]
		]),
		upperPivot: [.392, .014],
		upperClose: 0,
		upperOpen: .175,
		photoClose: 0
	},
	hiramasa: {
		joint: [.375, -.037],
		close: 0,
		lowerLip: cm([
			[38.4, -3.5],
			[39.65, -2.79],
			[40.84, -2],
			[42.16, -1.45],
			[43.54, -1.08],
			[44.9, -1.3]
		]),
		under: cm([
			[37, -5.4],
			[38.42, -4.9],
			[39.81, -4.34],
			[41.18, -3.71],
			[42.51, -3.01],
			[43.8, -2.24],
			[44.9, -1.3]
		]),
		jawEdge: cm([
			[38.4, -3.27],
			[39.65, -2.57],
			[40.84, -1.77],
			[42.16, -1.23],
			[43.54, -.85],
			[44.9, -1.07]
		]),
		upper: cm([
			[44.8, -.5],
			[44.13, -.01],
			[43.25, -.07],
			[42.37, -.35],
			[41.47, -.49],
			[40.55, -.59],
			[39.66, -.83],
			[38.78, -1.08],
			[37.88, -1.29],
			[37.15, -1.74],
			[37.25, -2.63],
			[37.62, -3.46],
			[38.41, -3.49],
			[39.06, -2.84],
			[39.71, -2.19],
			[40.46, -1.67],
			[41.28, -1.26],
			[42.18, -1.1],
			[43.1, -.98],
			[44.01, -.86]
		]),
		upperPivot: [.439, .006],
		upperClose: 0,
		upperOpen: .175,
		photoClose: 0
	},
	magochi: {
		joint: [.182, -.017],
		close: 0,
		lowerLip: cm([
			[18.4, -1.5],
			[19.14, -1.11],
			[19.94, -.84],
			[20.75, -.64],
			[21.58, -.46],
			[22.4, -.3]
		]),
		under: cm([
			[17.7, -2.3],
			[18.64, -2.13],
			[19.57, -1.97],
			[20.5, -1.75],
			[21.4, -1.45],
			[22.21, -.97],
			[22.5, -.5]
		]),
		jawEdge: cm([
			[18.4, -1.39],
			[19.14, -1],
			[19.94, -.73],
			[20.75, -.52],
			[21.58, -.35],
			[22.4, -.19]
		]),
		upper: cm([
			[22.4, 0],
			[22.07, .3],
			[21.6, .23],
			[21.14, .07],
			[20.69, -.12],
			[20.24, -.31],
			[19.8, -.5],
			[19.35, -.69],
			[18.91, -.9],
			[18.48, -1.12],
			[18.2, -1.49],
			[18.54, -1.66],
			[18.91, -1.34],
			[19.33, -1.09],
			[19.77, -.9],
			[20.23, -.74],
			[20.71, -.62],
			[21.18, -.51],
			[21.65, -.39],
			[22.12, -.27]
		]),
		upperPivot: [.221, .004],
		upperClose: 0,
		upperOpen: .044,
		photoClose: 0
	},
	kurodai: {
		joint: [.168, -.028],
		close: 0,
		lowerLip: cm([
			[17.2, -2.6],
			[17.7, -2.38],
			[18.25, -2.3],
			[18.8, -2.28],
			[19.35, -2.2],
			[19.9, -2.2]
		]),
		under: cm([
			[16.6, -4.1],
			[17.24, -3.92],
			[17.87, -3.74],
			[18.49, -3.49],
			[19.07, -3.18],
			[19.61, -2.79],
			[19.9, -2.2]
		]),
		jawEdge: cm([
			[17.2, -2.5],
			[17.7, -2.28],
			[18.25, -2.2],
			[18.8, -2.18],
			[19.35, -2.1],
			[19.9, -2.1]
		]),
		upper: cm([
			[19.7, -1.3],
			[19.36, -1.44],
			[19.01, -1.56],
			[18.66, -1.68],
			[18.31, -1.8],
			[17.96, -1.91],
			[17.59, -1.98],
			[17.25, -2.12],
			[17.04, -2.39],
			[17.08, -2.74],
			[17.4, -2.8],
			[17.66, -2.54],
			[18, -2.38],
			[18.35, -2.28],
			[18.71, -2.21],
			[19.08, -2.2],
			[19.45, -2.2],
			[19.82, -2.2],
			[20, -1.93],
			[19.94, -1.58]
		]),
		upperPivot: [.197, -.013],
		upperClose: 0,
		upperOpen: .262,
		photoClose: 0
	},
	saba: {
		joint: [.143, -.016],
		close: 0,
		lowerLip: cm([
			[14.5, -1.5],
			[15.11, -1.23],
			[15.68, -.89],
			[16.25, -.55],
			[16.85, -.26],
			[17.5, -.1]
		]),
		under: cm([
			[14, -2],
			[14.65, -1.78],
			[15.29, -1.56],
			[15.89, -1.24],
			[16.46, -.87],
			[17.07, -.56],
			[17.5, -.1]
		]),
		jawEdge: cm([
			[14.5, -1.41],
			[15.11, -1.15],
			[15.68, -.8],
			[16.25, -.46],
			[16.85, -.17],
			[17.5, -.01]
		]),
		upper: cm([
			[17.4, 0],
			[17.34, .36],
			[17.02, .56],
			[16.98, .35],
			[16.76, .06],
			[16.44, -.15],
			[16.11, -.35],
			[15.78, -.55],
			[15.47, -.79],
			[15.16, -1.02],
			[14.83, -1.22],
			[14.47, -1.38],
			[14.66, -1.44],
			[15.02, -1.29],
			[15.35, -1.09],
			[15.68, -.89],
			[16.01, -.69],
			[16.35, -.49],
			[16.69, -.32],
			[17.05, -.17]
		]),
		upperPivot: [.171, .005],
		upperClose: 0,
		upperOpen: .175,
		photoClose: 0
	},
	madai: {
		joint: [.19, -.034],
		close: 0,
		lowerLip: cm([
			[19.3, -3.1],
			[19.9, -3.05],
			[20.49, -2.76],
			[21.1, -2.53],
			[21.75, -2.41],
			[22.4, -2.4]
		]),
		under: cm([
			[18, -5.1],
			[18.84, -4.82],
			[19.67, -4.49],
			[20.45, -4.09],
			[21.23, -3.66],
			[21.95, -3.14],
			[22.4, -2.4]
		]),
		jawEdge: cm([
			[19.3, -2.99],
			[19.9, -2.94],
			[20.49, -2.64],
			[21.1, -2.42],
			[21.75, -2.3],
			[22.4, -2.29]
		]),
		upper: cm([
			[22.4, -2.4],
			[22.47, -1.97],
			[22.34, -1.53],
			[22, -1.5],
			[21.68, -1.81],
			[21.27, -2.01],
			[20.84, -2.15],
			[20.4, -2.25],
			[19.96, -2.35],
			[19.53, -2.49],
			[19.08, -2.5],
			[18.97, -2.77],
			[19.14, -3.18],
			[19.51, -3.38],
			[19.86, -3.14],
			[20.22, -2.89],
			[20.63, -2.69],
			[21.06, -2.55],
			[21.5, -2.45],
			[21.95, -2.4]
		]),
		upperPivot: [.223, -.014],
		upperClose: 0,
		upperOpen: .262,
		photoClose: 0
	},
	kasago: {
		joint: [.083, -.016],
		close: 0,
		lowerLip: cm([
			[8.4, -1.5],
			[8.87, -1.16],
			[9.36, -.86],
			[9.86, -.57],
			[10.36, -.29],
			[10.9, -.1]
		]),
		under: cm([
			[7.9, -2.2],
			[8.54, -1.98],
			[9.17, -1.71],
			[9.73, -1.34],
			[10.3, -.97],
			[10.81, -.55],
			[11, -.3]
		]),
		jawEdge: cm([
			[8.4, -1.45],
			[8.87, -1.11],
			[9.36, -.81],
			[9.86, -.51],
			[10.36, -.23],
			[10.9, -.05]
		]),
		upper: cm([
			[10.9, 0],
			[10.79, .31],
			[10.54, .27],
			[10.26, .06],
			[9.95, -.12],
			[9.6, -.23],
			[9.26, -.35],
			[8.92, -.46],
			[8.57, -.57],
			[8.22, -.67],
			[8.12, -.93],
			[8.28, -1.26],
			[8.48, -1.45],
			[8.79, -1.27],
			[9.09, -1.07],
			[9.38, -.86],
			[9.68, -.65],
			[9.99, -.48],
			[10.31, -.3],
			[10.65, -.18]
		]),
		upperPivot: [.107, .004],
		upperClose: 0,
		upperOpen: .175,
		photoClose: 0
	},
	mebaru: {
		joint: [.087, -.016],
		close: 0,
		lowerLip: cm([
			[8.9, -1.4],
			[9.34, -1.06],
			[9.74, -.67],
			[10.18, -.32],
			[10.6, .05],
			[11, -.2]
		]),
		under: cm([
			[8.5, -2],
			[9, -1.84],
			[9.43, -1.54],
			[9.85, -1.22],
			[10.24, -.86],
			[10.63, -.51],
			[11, -.2]
		]),
		jawEdge: cm([
			[8.9, -1.34],
			[9.34, -1],
			[9.74, -.61],
			[10.18, -.26],
			[10.6, .1],
			[11, -.15]
		]),
		upper: cm([
			[10.5, .4],
			[10.35, .17],
			[10.17, -.03],
			[9.97, -.23],
			[9.75, -.39],
			[9.52, -.55],
			[9.29, -.71],
			[9.1, -.9],
			[8.93, -1.11],
			[8.8, -1.35],
			[8.9, -1.43],
			[9.13, -1.27],
			[9.32, -1.08],
			[9.52, -.88],
			[9.71, -.69],
			[9.92, -.51],
			[10.14, -.34],
			[10.34, -.16],
			[10.55, .02],
			[10.69, .21]
		]),
		upperPivot: [.105, .003],
		upperClose: 0,
		upperOpen: .175,
		photoClose: 0
	},
	kihada: {
		joint: [.4239, -.0418],
		close: 0,
		lowerLip: cm([
			[42.68, -3.88],
			[43.95, -2.96],
			[45.27, -2.1],
			[46.72, -1.49],
			[48.21, -.99],
			[49.75, -.69]
		]),
		under: cm([
			[41.69, -5.97],
			[43.16, -5.28],
			[44.6, -4.51],
			[45.97, -3.64],
			[47.31, -2.72],
			[48.62, -1.75],
			[49.75, -.69]
		]),
		jawEdge: cm([
			[42.68, -3.63],
			[43.95, -2.71],
			[45.27, -1.85],
			[46.72, -1.24],
			[48.21, -.74],
			[49.75, -.44]
		]),
		upper: cm([
			[49.55, .11],
			[48.77, .56],
			[47.86, .7],
			[47.1, .49],
			[46.79, -.37],
			[46.14, -1.01],
			[45.31, -1.42],
			[44.45, -1.74],
			[43.57, -1.99],
			[42.67, -2.21],
			[42.31, -2.91],
			[42.62, -3.75],
			[43.38, -3.53],
			[44.11, -2.97],
			[44.84, -2.41],
			[45.62, -1.92],
			[46.42, -1.46],
			[47.24, -1.05],
			[48.1, -.72],
			[48.97, -.41]
		]),
		upperPivot: [.4906, .005],
		upperClose: 0,
		upperOpen: .131,
		photoClose: 0
	},
	isaki: {
		joint: [.152, -.019],
		close: 0,
		lowerLip: cm([
			[15.5, -1.7],
			[15.82, -1.39],
			[16.19, -1.15],
			[16.59, -.96],
			[16.99, -.77],
			[17.4, -.6]
		]),
		under: cm([
			[14.7, -2.6],
			[15.36, -2.44],
			[15.94, -2.11],
			[16.5, -1.73],
			[17.04, -1.33],
			[17.35, -.75],
			[17.5, -.7]
		]),
		jawEdge: cm([
			[15.5, -1.61],
			[15.82, -1.3],
			[16.19, -1.07],
			[16.59, -.87],
			[16.99, -.68],
			[17.4, -.51]
		]),
		upper: cm([
			[17.1, 0],
			[16.89, -.21],
			[16.67, -.43],
			[16.44, -.62],
			[16.19, -.8],
			[15.92, -.94],
			[15.64, -1.06],
			[15.36, -1.18],
			[15.22, -1.39],
			[15.3, -1.69],
			[15.51, -1.89],
			[15.67, -1.64],
			[15.88, -1.42],
			[16.11, -1.22],
			[16.35, -1.04],
			[16.62, -.89],
			[16.89, -.75],
			[17.16, -.62],
			[17.4, -.46],
			[17.34, -.17]
		]),
		upperPivot: [.171, 0],
		upperClose: 0,
		upperOpen: .131,
		photoClose: 0
	},
	kuchibuto: {
		joint: [.181, -.021],
		close: 0,
		lowerLip: cm([
			[18.3, -1.9],
			[18.5, -1.6],
			[18.76, -1.34],
			[19.06, -1.13],
			[19.36, -.93],
			[19.7, -.8]
		]),
		under: cm([
			[17.7, -3.1],
			[18.27, -2.81],
			[18.78, -2.42],
			[19.23, -1.97],
			[19.69, -1.51],
			[19.7, -.88],
			[19.9, -.9]
		]),
		jawEdge: cm([
			[18.3, -1.8],
			[18.5, -1.5],
			[18.76, -1.24],
			[19.06, -1.03],
			[19.36, -.83],
			[19.7, -.7]
		]),
		upper: cm([
			[19.5, .2],
			[19.66, -.03],
			[19.81, -.27],
			[19.9, -.52],
			[19.72, -.69],
			[19.48, -.82],
			[19.24, -.97],
			[19.01, -1.13],
			[18.8, -1.3],
			[18.6, -1.5],
			[18.43, -1.72],
			[18.27, -1.85],
			[18.23, -1.59],
			[18.3, -1.32],
			[18.42, -1.07],
			[18.57, -.83],
			[18.76, -.64],
			[18.96, -.44],
			[19.15, -.23],
			[19.3, 0]
		]),
		upperPivot: [.195, .002],
		upperClose: 0,
		upperOpen: .157,
		photoClose: 0
	},
	shibudai: {
		joint: [.158, -.027],
		close: 0,
		lowerLip: cm([
			[16.2, -2.2],
			[16.87, -1.77],
			[17.58, -1.41],
			[18.29, -1.06],
			[19.02, -.76],
			[19.8, -.6]
		]),
		under: cm([
			[15.4, -3.9],
			[16.36, -3.47],
			[17.28, -2.97],
			[18.22, -2.52],
			[19.09, -1.93],
			[19.73, -1.2],
			[20, -1]
		]),
		jawEdge: cm([
			[16.2, -2.1],
			[16.87, -1.67],
			[17.58, -1.31],
			[18.29, -.96],
			[19.02, -.66],
			[19.8, -.5]
		]),
		upper: cm([
			[19.8, -.5],
			[19.79, .01],
			[19.35, .05],
			[18.96, -.34],
			[18.5, -.65],
			[18.02, -.92],
			[17.55, -1.22],
			[17.05, -1.47],
			[16.56, -1.72],
			[16.04, -1.92],
			[15.69, -2.28],
			[15.77, -2.78],
			[16.18, -2.91],
			[16.47, -2.44],
			[16.89, -2.08],
			[17.33, -1.75],
			[17.79, -1.44],
			[18.27, -1.15],
			[18.76, -.88],
			[19.27, -.68]
		]),
		upperPivot: [.195, .002],
		upperClose: 0,
		upperOpen: .175,
		photoClose: 0
	},
	onagagure: {
		joint: [.207, -.022],
		close: 0,
		lowerLip: cm([
			[21, -2],
			[21.3, -1.8],
			[21.6, -1.6],
			[21.9, -1.4],
			[22.2, -1.2],
			[22.5, -1]
		]),
		under: cm([
			[20.4, -3.5],
			[20.79, -3.11],
			[21.23, -2.77],
			[21.63, -2.37],
			[22.02, -1.97],
			[22.34, -1.52],
			[22.5, -1]
		]),
		jawEdge: cm([
			[21, -1.89],
			[21.3, -1.69],
			[21.6, -1.49],
			[21.9, -1.29],
			[22.2, -1.09],
			[22.5, -.89]
		]),
		upper: cm([
			[22.5, -.6],
			[22.35, -.37],
			[22.16, -.16],
			[21.97, .03],
			[21.84, -.07],
			[21.77, -.34],
			[21.7, -.6],
			[21.53, -.83],
			[21.36, -1.05],
			[21.2, -1.27],
			[21.04, -1.49],
			[20.91, -1.73],
			[21, -1.99],
			[21.22, -1.85],
			[21.45, -1.7],
			[21.68, -1.55],
			[21.91, -1.39],
			[22.14, -1.24],
			[22.37, -1.09],
			[22.5, -.88]
		]),
		upperPivot: [.219, .001],
		upperClose: 0,
		upperOpen: .105,
		photoClose: 0
	},
	isaki_young: {
		joint: [.108, -.015],
		close: 0,
		lowerLip: cm([
			[11.1, -1.3],
			[11.38, -1.12],
			[11.62, -.89],
			[11.89, -.7],
			[12.17, -.52],
			[12.5, -.5]
		]),
		under: cm([
			[10.3, -2],
			[10.73, -1.83],
			[11.15, -1.66],
			[11.54, -1.42],
			[11.91, -1.14],
			[12.29, -.88],
			[12.5, -.5]
		]),
		jawEdge: cm([
			[11.1, -1.24],
			[11.38, -1.06],
			[11.62, -.83],
			[11.89, -.64],
			[12.17, -.46],
			[12.5, -.44]
		]),
		upper: cm([
			[12.2, 0],
			[12.08, -.18],
			[11.93, -.34],
			[11.75, -.47],
			[11.57, -.59],
			[11.39, -.71],
			[11.2, -.83],
			[11.02, -.94],
			[10.9, -1.09],
			[10.98, -1.28],
			[11.13, -1.37],
			[11.29, -1.21],
			[11.44, -1.06],
			[11.6, -.9],
			[11.78, -.78],
			[11.96, -.66],
			[12.15, -.54],
			[12.34, -.43],
			[12.5, -.29],
			[12.4, -.1]
		]),
		upperPivot: [.122, 0],
		upperClose: 0,
		upperOpen: .175,
		photoClose: 0
	}
};
function lineXofX(line, x) {
	if (x <= line[0][0]) return line[0][1];
	for (let i = 0; i + 1 < line.length; i++) {
		const [x0, y0] = line[i];
		const [x1, y1] = line[i + 1];
		if (x <= x1) return y0 + (y1 - y0) * (x - x0) / Math.max(x1 - x0, 1e-9);
	}
	return line[line.length - 1][1];
}
function mouthCutX(m) {
	const ux = m.upper.map((p) => p[0]);
	return [Math.min(m.jawEdge[0][0], ...ux), Math.max(m.lowerLip[m.lowerLip.length - 1][0] + .002, ...ux)];
}
function polyInside(poly, x, y) {
	let inside = false;
	let d = Infinity;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const [xi, yi] = poly[i];
		const [xj, yj] = poly[j];
		if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
		const ex = xj - xi;
		const ey = yj - yi;
		const t = THREE.MathUtils.clamp(((x - xi) * ex + (y - yi) * ey) / Math.max(ex * ex + ey * ey, 1e-12), 0, 1);
		d = Math.min(d, Math.hypot(x - xi - ex * t, y - yi - ey * t));
	}
	return inside ? d : -d;
}
function flattenAhead(geo, m, length) {
	const pos = geo.getAttribute("position");
	const fin = geo.getAttribute("_fin");
	if (m.close > 0 || !pos || !fin) return;
	const front = upperFront(m);
	const peak = m.lowerLip.reduce((a, b) => b[1] > a[1] ? b : a)[0];
	const reach = .015 * length;
	const underUpper = (x, y) => m.upper.some((a, i) => {
		const b = m.upper[(i + m.upper.length - 1) % m.upper.length];
		if (a[0] > x === b[0] > x) return false;
		const yc = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
		return yc > y && yc < y + reach;
	});
	for (let i = 0; i < pos.count; i++) {
		if (partOf(fin, i) !== 0) continue;
		const x = pos.getX(i);
		const y = pos.getY(i);
		const yl = lineXofX(m.lowerLip, x);
		if (y <= yl || polyInside(m.upper, x, y) > 0) continue;
		if (x <= front && (x <= peak || !underUpper(x, y))) continue;
		pos.setY(i, yl - 6e-4 + .03 * (y - yl));
	}
	pos.needsUpdate = true;
}
function lipCut(m, x) {
	const end = m.lowerLip[m.lowerLip.length - 1][0];
	return lineXofX(m.lowerLip, x) + (m.close > 0 && x > end ? .004 : 0);
}
function upperFront(m) {
	return Math.max(...m.upper.map((p) => p[0]));
}
function splitAtLip(geo, m) {
	const index = geo.getIndex();
	const pos = geo.getAttribute("position");
	const fin = geo.getAttribute("_fin");
	if (!index || !pos || !fin) return;
	const names = Object.keys(geo.attributes);
	const attrs = names.map((n) => geo.getAttribute(n));
	const offsets = [];
	let stride = 0;
	for (const a of attrs) {
		offsets.push(stride);
		stride += a.itemSize;
	}
	const iPos = offsets[names.indexOf("position")];
	const vert = (i) => {
		const v = [];
		attrs.forEach((a) => {
			for (let k = 0; k < a.itemSize; k++) v.push(comp(a, i, k));
		});
		return v;
	};
	const corner = Math.min(m.lowerLip[0][0], m.joint[0] - .008);
	const front = Math.max(...m.under.map((p) => p[0])) + .015;
	const f = (v) => v[iPos + 1] - lipCut(m, v[iPos]);
	const added = [];
	const sides = [];
	const keys = new Map();
	const addVert = (v, side) => {
		const key = `${side},${v[iPos].toFixed(6)},${v[iPos + 1].toFixed(6)},${v[iPos + 2].toFixed(6)}`;
		const found = keys.get(key);
		if (found !== void 0) return found;
		const id = pos.count + added.length;
		added.push(v.slice());
		sides.push(side);
		keys.set(key, id);
		return id;
	};
	const keep = [];
	const tris = [];
	for (let t = 0; t < index.count; t += 3) {
		const ids = [
			index.getX(t),
			index.getX(t + 1),
			index.getX(t + 2)
		];
		const tri = ids.map(vert);
		const xs = tri.map((v) => v[iPos]);
		const fs = tri.map(f);
		if (ids.some((i) => partOf(fin, i) !== 0) || Math.max(...xs) < corner || Math.min(...xs) > front || fs.every((x) => x >= 0) || fs.every((x) => x < 0)) {
			keep.push(...ids);
			continue;
		}
		for (const side of [1, -1]) {
			const poly = [];
			const own = [];
			for (let k = 0; k < 3; k++) {
				const a = tri[k];
				const b = tri[(k + 1) % 3];
				const fa = fs[k];
				const fb = fs[(k + 1) % 3];
				if (fa >= 0 === side > 0) {
					poly.push(a);
					own.push(true);
				}
				if (fa >= 0 !== fb >= 0) {
					const s = fa / (fa - fb);
					poly.push(a.map((x, j) => x + (b[j] - x) * s));
					own.push(false);
				}
			}
			if (poly.length < 3) continue;
			const vs = poly.map((v, k) => own[k] ? ids[tri.indexOf(v)] : addVert(v, side));
			for (let k = 1; k + 1 < vs.length; k++) tris.push(vs[0], vs[k], vs[k + 1]);
		}
	}
	if (!tris.length) return;
	const total = pos.count + added.length;
	attrs.forEach((a, n) => {
		const arr = new Float32Array(total * a.itemSize);
		for (let i = 0; i < pos.count; i++) for (let k = 0; k < a.itemSize; k++) arr[i * a.itemSize + k] = comp(a, i, k);
		added.forEach((v, j) => {
			for (let k = 0; k < a.itemSize; k++) arr[(pos.count + j) * a.itemSize + k] = v[offsets[n] + k];
		});
		geo.setAttribute(names[n], new THREE.BufferAttribute(arr, a.itemSize));
	});
	const idx = new Uint32Array(keep.length + tris.length);
	idx.set(keep);
	idx.set(tris, keep.length);
	geo.setIndex(new THREE.BufferAttribute(idx, 1));
	geo.computeBoundingSphere();
	const lipSide = new Int8Array(total);
	lipSide.set(sides, pos.count);
	geo.userData.lipSide = lipSide;
}
function addJawWeights(geo, mouth) {
	const fin = geo.getAttribute("_fin");
	const pos = geo.getAttribute("position");
	if (!fin || !pos) return;
	const w = new Float32Array(pos.count * 2);
	if (mouth) {
		const front = Math.max(...mouth.under.map((p) => p[0]));
		for (let i = 0; i < pos.count; i++) {
			if (partOf(fin, i) !== 0) continue;
			const x = pos.getX(i);
			const y = pos.getY(i);
			if (x > front + .015) continue;
			const yLip = lipCut(mouth, x);
			const side = geo.userData.lipSide?.[i] ?? 0;
			if (side > 0) continue;
			let k;
			if (side < 0 || y <= yLip) {
				k = 1 - THREE.MathUtils.smoothstep(lineXofX(mouth.under, x) - y, 0, .008);
				if (mouth.close === 0) {
					const span = front - mouth.joint[0];
					k = Math.max(k, THREE.MathUtils.smoothstep(x, front - .6 * span, front - .3 * span));
				}
			} else continue;
			w[i * 2] = k * THREE.MathUtils.smoothstep(x, mouth.joint[0] - .008, mouth.joint[0]);
		}
	}
	geo.setAttribute("jaw", new THREE.BufferAttribute(w, 2));
}
function addEyePivots(geo) {
	const fin = geo.getAttribute("_fin");
	const piv = geo.getAttribute("_piv");
	const pos = geo.getAttribute("position");
	if (!fin || !piv || !pos) return null;
	const eye = [];
	for (let i = 0; i < pos.count; i++) if (partOf(fin, i) === 6) eye.push(i);
	if (!eye.length || eye.some((i) => piv.getX(i) !== 0 || piv.getY(i) !== 0 || piv.getZ(i) !== 0)) return null;
	let out = null;
	for (const side of [1, -1]) {
		const vs = eye.filter((i) => Math.sign(pos.getZ(i)) === side);
		if (!vs.length) continue;
		const c = new THREE.Vector3();
		for (const i of vs) c.add(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
		c.divideScalar(vs.length);
		for (const i of vs) piv.setXYZ(i, c.x, -c.z, c.y);
		if (!out) {
			let r = 0;
			for (const i of vs) r = Math.max(r, Math.hypot(pos.getX(i) - c.x, pos.getY(i) - c.y));
			out = new THREE.Vector3(c.x, c.y, r);
		}
	}
	piv.needsUpdate = true;
	return out;
}
var comp = (a, i, k) => k === 0 ? a.getX(i) : k === 1 ? a.getY(i) : k === 2 ? a.getZ(i) : a.getW(i);
function cutPlate(geo, o) {
	const index = geo.getIndex();
	const pos = geo.getAttribute("position");
	const fin = geo.getAttribute("_fin");
	if (!index || !pos || !geo.getAttribute("normal") || !fin) return;
	const names = Object.keys(geo.attributes);
	const attrs = names.map((n) => geo.getAttribute(n));
	const offsets = [];
	let stride = 0;
	for (const a of attrs) {
		offsets.push(stride);
		stride += a.itemSize;
	}
	const at = (n) => offsets[names.indexOf(n)];
	const iPos = at("position");
	const iNor = at("normal");
	const iFin = at("_fin");
	const vert = (i) => {
		const v = [];
		attrs.forEach((a) => {
			for (let k = 0; k < a.itemSize; k++) v.push(comp(a, i, k));
		});
		return v;
	};
	const limits = o.limits.map((f) => (v) => f(v[iPos], v[iPos + 1]));
	const clip = (poly, f) => {
		const out = [];
		for (let k = 0; k < poly.length; k++) {
			const a = poly[k];
			const b = poly[(k + 1) % poly.length];
			const fa = f(a);
			const fb = f(b);
			if (fa >= 0) out.push(a);
			if (fa >= 0 !== fb >= 0) {
				const t = fa / (fa - fb);
				out.push(a.map((x, j) => x + (b[j] - x) * t));
			}
		}
		return out;
	};
	const mid = (a, b) => a.map((x, j) => (x + b[j]) / 2);
	const subdivide = (tri) => {
		const s = o.subdiv;
		if (!s) return [tri];
		const [x0, x1, y0, y1] = s.box;
		const xs = tri.map((v) => v[iPos]);
		const ys = tri.map((v) => v[iPos + 1]);
		if (Math.max(...xs) < x0 || Math.min(...xs) > x1 || Math.max(...ys) < y0 || Math.min(...ys) > y1) return [tri];
		let out = [tri];
		for (let k = 0; k < s.n; k++) out = out.flatMap(([a, b, c]) => {
			const ab = mid(a, b);
			const bc = mid(b, c);
			const ca = mid(c, a);
			return [
				[
					a,
					ab,
					ca
				],
				[
					ab,
					b,
					bc
				],
				[
					ca,
					bc,
					c
				],
				[
					ab,
					bc,
					ca
				]
			];
		});
		return out;
	};
	const lift = o.lift;
	const thick = o.thick;
	const added = [];
	const keys = new Map();
	const tris = [];
	const addVert = (v) => {
		const key = `${v[iPos].toFixed(6)},${v[iPos + 1].toFixed(6)},${v[iPos + 2].toFixed(6)}`;
		const found = keys.get(key);
		if (found !== void 0) return found;
		const id = pos.count + added.length;
		added.push(v);
		keys.set(key, id);
		return id;
	};
	for (let t = 0; t < index.count; t += 3) {
		const ids = [
			index.getX(t),
			index.getX(t + 1),
			index.getX(t + 2)
		];
		if (ids.some((i) => partOf(fin, i) !== 0)) continue;
		const tri = ids.map(vert);
		const nz = tri.reduce((s, v) => s + v[iNor + 2], 0) / 3;
		if (o.sidesOnly && Math.abs(nz) < .3) continue;
		for (let poly of subdivide(tri)) {
			for (const f of limits) poly = clip(poly, f);
			if (poly.length < 3) continue;
			const vs = poly.map((v) => {
				const w = v.slice();
				const n = new THREE.Vector3(w[iNor], w[iNor + 1], w[iNor + 2]).normalize();
				w[iPos] += n.x * lift;
				w[iPos + 1] += n.y * lift;
				w[iPos + 2] += n.z * lift;
				w[iNor] = n.x;
				w[iNor + 1] = n.y;
				w[iNor + 2] = n.z;
				w[iFin] = o.part;
				w[iFin + 1] = o.weight(w[iPos], w[iPos + 1]);
				w[iFin + 2] = 0;
				return addVert(w);
			});
			for (let k = 1; k + 1 < vs.length; k++) tris.push(vs[0], vs[k], vs[k + 1]);
		}
	}
	if (!tris.length) return;
	const edgeUse = new Map();
	const ek = (a, b) => a < b ? `${a}_${b}` : `${b}_${a}`;
	for (let t = 0; t < tris.length; t += 3) for (let k = 0; k < 3; k++) {
		const e = ek(tris[t + k], tris[t + (k + 1) % 3]);
		edgeUse.set(e, (edgeUse.get(e) ?? 0) + 1);
	}
	const vOf = (i) => added[i - pos.count];
	const center = [
		0,
		0,
		0
	];
	for (const v of added) for (let k = 0; k < 3; k++) center[k] += v[iPos + k] / added.length;
	const flapTris = tris.length;
	for (let t = 0; t < flapTris; t += 3) for (let k = 0; k < 3; k++) {
		const a = tris[t + k];
		const b = tris[t + (k + 1) % 3];
		if (edgeUse.get(ek(a, b)) !== 1) continue;
		if (!o.rim(vOf(a)[iPos], vOf(a)[iPos + 1]) || !o.rim(vOf(b)[iPos], vOf(b)[iPos + 1])) continue;
		const rim = (i, depth) => {
			const w = vOf(i).slice();
			const n = new THREE.Vector3(w[iNor], w[iNor + 1], w[iNor + 2]);
			w[iPos] -= n.x * depth;
			w[iPos + 1] -= n.y * depth;
			w[iPos + 2] -= n.z * depth;
			const o = new THREE.Vector3(w[iPos] - center[0], w[iPos + 1] - center[1], 0).normalize();
			w[iNor] = o.x;
			w[iNor + 1] = o.y;
			w[iNor + 2] = 0;
			w[iFin + 2] = 1;
			return pos.count + added.push(w) - 1;
		};
		const [oa, ob, ia, ib] = [
			rim(a, 0),
			rim(b, 0),
			rim(a, thick),
			rim(b, thick)
		];
		tris.push(oa, ob, ib, oa, ib, ia);
	}
	const total = pos.count + added.length;
	attrs.forEach((a, n) => {
		const arr = new Float32Array(total * a.itemSize);
		for (let i = 0; i < pos.count; i++) for (let k = 0; k < a.itemSize; k++) arr[i * a.itemSize + k] = comp(a, i, k);
		added.forEach((v, j) => {
			for (let k = 0; k < a.itemSize; k++) arr[(pos.count + j) * a.itemSize + k] = v[offsets[n] + k];
		});
		geo.setAttribute(names[n], new THREE.BufferAttribute(arr, a.itemSize));
	});
	const idx = new Uint32Array(index.count + tris.length);
	for (let i = 0; i < index.count; i++) idx[i] = index.getX(i);
	idx.set(tris, index.count);
	geo.setIndex(new THREE.BufferAttribute(idx, 1));
	geo.computeBoundingSphere();
}
function addGillCover(geo, g, length) {
	const edgeX = (y) => lineX(g.edge, y);
	const hingeX = (y) => lineX(g.hinge, y);
	cutPlate(geo, {
		limits: [
			(x, y) => x - edgeX(y),
			(x, y) => hingeX(y) - x,
			(_x, y) => g.top - y,
			(_x, y) => y - g.bottom
		],
		part: 7,
		lift: .002 * length,
		thick: .004 * length,
		sidesOnly: true,
		weight: (x, y) => Math.max(0, Math.min(hingeX(y), g.pivotMax) - x) * THREE.MathUtils.smoothstep(g.top - y, 0, .02 * length),
		rim: (x, y) => Math.min(hingeX(y), g.pivotMax) - x > .006 * length && g.top - y > .004 * length,
		subdiv: {
			box: [
				Math.min(...g.edge.map((p) => p[1])),
				Math.max(...g.hinge.map((p) => p[1])),
				g.bottom,
				g.top
			],
			n: 2
		}
	});
}
function addJawPlate(geo, m, length) {
	const lip = m.lowerLip;
	const front = Math.max(...m.under.map((p) => p[0]));
	const x0 = m.lowerLip[0][0];
	const raise = (x) => .003 * (1 - THREE.MathUtils.smoothstep(x, x0, x0 + .025));
	cutPlate(geo, {
		limits: [
			(x, y) => lineXofX(lip, x) + raise(x) - y,
			(x, y) => y - lineXofX(m.under, x),
			(x) => x - m.joint[0],
			(x) => front - x
		],
		part: 8,
		lift: .0015 * length,
		thick: .003 * length,
		sidesOnly: false,
		weight: () => 1,
		rim: (x, y) => lineXofX(lip, x) + raise(x) - y < .0015 && x > m.joint[0] + .004
	});
}
function addUpperJawPlate(geo, m, length) {
	cutPlate(geo, {
		limits: m.close > 0 ? [(x, y) => polyInside(m.upper, x, y)] : [(x, y) => polyInside(m.upper, x, y), (x, y) => y - lipCut(m, x)],
		part: 9,
		lift: (m.close > 0 ? .0025 : .001) * length,
		thick: (m.close > 0 ? .003 : .0012) * length,
		sidesOnly: false,
		weight: () => 1,
		rim: (x, y) => Math.hypot(x - m.upperPivot[0], y - m.upperPivot[1]) > .004,
		subdiv: {
			box: [
				Math.min(...m.upper.map((p) => p[0])),
				Math.max(...m.upper.map((p) => p[0])),
				Math.min(...m.upper.map((p) => p[1])),
				Math.max(...m.upper.map((p) => p[1]))
			],
			n: m.close > 0 ? 3 : 2
		}
	});
}
var partOf = (fin, i) => Math.round(fin.getX(i));
function fixFinEdges(geo, texHeight) {
	const fin = geo.getAttribute("_fin");
	const uv = geo.getAttribute("uv");
	if (!fin || !uv) return;
	let bodyV = 0;
	for (let i = 0; i < uv.count; i++) if (partOf(fin, i) === 0) bodyV = Math.max(bodyV, uv.getY(i));
	const minV = bodyV + 4 / texHeight;
	const maxV = bodyV - 1 / texHeight;
	for (let i = 0; i < uv.count; i++) {
		const p = partOf(fin, i);
		if (p !== 0 && p !== 6 && p !== 7 && uv.getY(i) < minV) uv.setY(i, minV);
		if (p === 0 && uv.getY(i) > maxV) uv.setY(i, maxV);
	}
	uv.needsUpdate = true;
}
function finLayout(geo) {
	const fin = geo.getAttribute("_fin");
	const pos = geo.getAttribute("position");
	const index = geo.getIndex();
	if (!fin || !pos || !index) return null;
	let x0 = Infinity;
	let x1 = -Infinity;
	for (let i = 0; i < pos.count; i++) {
		if (partOf(fin, i) !== 0) continue;
		x0 = Math.min(x0, pos.getX(i));
		x1 = Math.max(x1, pos.getX(i));
	}
	const N = 100;
	const top = new Float32Array(N).fill(-Infinity);
	const bottom = new Float32Array(N).fill(Infinity);
	const bin = (x) => THREE.MathUtils.clamp(Math.floor((x - x0) / (x1 - x0) * N), 0, 99);
	for (let i = 0; i < pos.count; i++) {
		if (partOf(fin, i) !== 0) continue;
		const b = bin(pos.getX(i));
		top[b] = Math.max(top[b], pos.getY(i));
		bottom[b] = Math.min(bottom[b], pos.getY(i));
	}
	for (const arr of [top, bottom]) {
		const filled = [...arr.keys()].filter((k) => Number.isFinite(arr[k]));
		if (!filled.length) continue;
		for (let k = 0; k < N; k++) {
			if (Number.isFinite(arr[k])) continue;
			const a = filled.filter((j) => j < k).pop();
			const b = filled.find((j) => j > k);
			arr[k] = a === void 0 ? arr[b] : b === void 0 ? arr[a] : arr[a] + (arr[b] - arr[a]) * (k - a) / (b - a);
		}
	}
	const bodyAt = (x, upper) => {
		const b = bin(x);
		let y = upper ? Infinity : -Infinity;
		for (let k = Math.max(0, b - 1); k <= Math.min(99, b + 1); k++) {
			if (upper && Number.isFinite(top[k])) y = Math.min(y, top[k]);
			if (!upper && Number.isFinite(bottom[k])) y = Math.max(y, bottom[k]);
		}
		return y;
	};
	let bodyTop = -Infinity;
	let bodyBottom = Infinity;
	for (let k = 0; k < N; k++) {
		if (Number.isFinite(top[k])) bodyTop = Math.max(bodyTop, top[k]);
		if (Number.isFinite(bottom[k])) bodyBottom = Math.min(bodyBottom, bottom[k]);
	}
	const bodyMid = (bodyTop + bodyBottom) / 2;
	const parent = new Int32Array(pos.count).map((_, i) => i);
	const root = (i) => parent[i] === i ? i : parent[i] = root(parent[i]);
	for (let t = 0; t < index.count; t += 3) {
		const a = index.getX(t);
		if (partOf(fin, a) === 0) continue;
		parent[root(index.getX(t + 1))] = root(a);
		parent[root(index.getX(t + 2))] = root(a);
	}
	const plates = new Map();
	for (let i = 0; i < pos.count; i++) {
		const p = partOf(fin, i);
		if (p !== 1 && p !== 2) continue;
		const r = root(i);
		if (!plates.has(r)) plates.set(r, []);
		plates.get(r).push(i);
	}
	return {
		x0,
		x1,
		bodyAt,
		bodyMid,
		plates: [...plates.values()]
	};
}
function tailOnlyFlutter(geo) {
	const fin = geo.getAttribute("_fin");
	const fl = geo.getAttribute("flutter");
	if (!fin || !fl) return;
	for (let i = 0; i < fl.count; i++) if (partOf(fin, i) !== 3) fl.setX(i, 0);
	fl.needsUpdate = true;
}
function addFlutterWeights(geo) {
	const fin = geo.getAttribute("_fin");
	const pos = geo.getAttribute("position");
	if (!fin || !pos) return;
	const w = new Float32Array(pos.count * 3);
	const h = new Float32Array(pos.count);
	for (let i = 0; i < pos.count; i++) if (partOf(fin, i) === 4) w[i * 3] = fin.getY(i);
	const layout = finLayout(geo);
	if (layout) {
		const { x0, bodyAt, bodyMid, plates } = layout;
		const cx = plates.map((vs) => vs.reduce((s, i) => s + pos.getX(i), 0) / vs.length);
		const rank = cx.map((x) => cx.filter((o) => o > x).length);
		plates.forEach((vs, n) => {
			let ymin = Infinity;
			let ymax = -Infinity;
			let xmin = Infinity;
			let xmax = -Infinity;
			for (const i of vs) {
				ymin = Math.min(ymin, pos.getY(i));
				ymax = Math.max(ymax, pos.getY(i));
				xmin = Math.min(xmin, pos.getX(i));
				xmax = Math.max(xmax, pos.getX(i));
			}
			let upper = ymin > bodyMid;
			let lower = ymax < bodyMid;
			if (!upper && !lower && (xmin + xmax) / 2 > x0 + .15 * (layout.x1 - x0)) {
				upper = vs.reduce((s, i) => s + pos.getY(i), 0) / vs.length > bodyMid;
				lower = !upper;
			}
			const d = vs.map((i) => {
				const x = pos.getX(i);
				const y = pos.getY(i);
				const v = upper ? y - bodyAt(x, true) : lower ? bodyAt(x, false) - y : x0 - x;
				return Number.isFinite(v) ? Math.max(0, v) : 0;
			});
			const far = Math.max(...d);
			if (far <= 0) return;
			const id = upper || lower ? (rank[n] + 1) * .618034 % 1 : -1;
			vs.forEach((i, k) => {
				w[i * 3] = d[k] / far;
				w[i * 3 + 1] = xmax > xmin ? (xmax - pos.getX(i)) / (xmax - xmin) : 0;
				w[i * 3 + 2] = id;
				if (upper || lower) h[i] = upper ? d[k] : -d[k];
			});
		});
	}
	geo.setAttribute("flutter", new THREE.BufferAttribute(w, 3));
	geo.setAttribute("finH", new THREE.BufferAttribute(h, 1));
}
function reshapeEnd(geo, dir, R, grow, want) {
	const pos = geo.getAttribute("position");
	const nor = geo.getAttribute("normal");
	const fin = geo.getAttribute("_fin");
	if (!pos || !nor || !fin) return;
	let tip = -Infinity;
	for (let i = 0; i < pos.count; i++) if (partOf(fin, i) === 0) tip = Math.max(tip, dir * pos.getX(i));
	const dxOf = (i) => tip - dir * pos.getX(i);
	const key = (dx) => Math.round(dx / R * 2e3);
	const rings = new Map();
	for (let i = 0; i < pos.count; i++) {
		if (partOf(fin, i) !== 0) continue;
		const dx = dxOf(i);
		if (dx > 2 * R) continue;
		const k = key(dx);
		rings.set(k, Math.max(rings.get(k) ?? 0, Math.abs(pos.getZ(i))));
	}
	const ks = [...rings.keys()].sort((a, b) => a - b);
	const kR = key(R);
	const a = ks.filter((k) => k <= kR).pop();
	const b = ks.find((k) => k >= kR);
	if (a === void 0 || b === void 0) return;
	const wR = a === b ? rings.get(a) : rings.get(a) + (rings.get(b) - rings.get(a)) * (kR - a) / (b - a);
	if (wR <= 0) return;
	for (let i = 0; i < pos.count; i++) {
		if (partOf(fin, i) !== 0) continue;
		const dx = dxOf(i);
		if (dx >= R) continue;
		const h = rings.get(key(dx)) ?? 0;
		if (h <= 0) continue;
		const s = grow ? Math.max(1, want(dx, wR) / h) : Math.min(1, want(dx, wR) / h);
		if (s === 1) continue;
		pos.setZ(i, pos.getZ(i) * s);
		const n = new THREE.Vector3(nor.getX(i), nor.getY(i), nor.getZ(i) / s).normalize();
		nor.setXYZ(i, n.x, n.y, n.z);
	}
	pos.needsUpdate = true;
	nor.needsUpdate = true;
}
function roundSnout(geo, length) {
	const R = .04 * length;
	reshapeEnd(geo, 1, R, true, (dx, wR) => wR * Math.sqrt(dx / R));
}
function thinTailEnd(geo, length) {
	const R = .09 * length;
	reshapeEnd(geo, -1, R, false, (dx, wR) => wR * (.1 + .9 * THREE.MathUtils.smoothstep(dx, 0, R)));
}
function reachTailIntoBody(geo, length) {
	const layout = finLayout(geo);
	const pos = geo.getAttribute("position");
	if (!layout || !pos) return;
	const want = layout.x0 + .01 * length;
	for (const vs of layout.plates) {
		let xmin = Infinity;
		let xmax = -Infinity;
		for (const i of vs) {
			xmin = Math.min(xmin, pos.getX(i));
			xmax = Math.max(xmax, pos.getX(i));
		}
		if (xmin >= layout.x0 - .01 * length || xmax >= want) continue;
		for (const i of vs) if (pos.getX(i) > xmax - .002 * length) pos.setX(i, pos.getX(i) + want - xmax);
		pos.needsUpdate = true;
	}
}
function morph(src, w, h, r, grow) {
	const tmp = new Uint8Array(w * h);
	const out = new Uint8Array(w * h);
	const want = grow ? 1 : 0;
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
		let v = !grow && (x < r || x >= w - r) ? 0 : 1 - want;
		for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r) && v !== want; k++) if (src[y * w + k] === want) v = want;
		tmp[y * w + x] = v;
	}
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
		let v = !grow && (y < r || y >= h - r) ? 0 : 1 - want;
		for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r) && v !== want; k++) if (tmp[k * w + x] === want) v = want;
		out[y * w + x] = v;
	}
	return out;
}
function fillTailPlate(px, W, box, inv, cu, layout, length, taper = 0) {
	const { u0, u1, v0, v1 } = box;
	const w = u1 - u0 + 1;
	const h = v1 - v0 + 1;
	if (w < 4 || h < 4) return;
	const at = (x, y) => ((v0 + y) * W + u0 + x) * 4;
	const solid = new Uint8Array(w * h);
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) solid[y * w + x] = px[at(x, y) + 3] >= 128 ? 1 : 0;
	const perM = Math.hypot(cu.x, cu.y);
	const r = THREE.MathUtils.clamp(Math.round(.004 * length * perM), 2, 6);
	const closed = morph(morph(solid, w, h, r, true), w, h, r, false);
	const outside = new Uint8Array(w * h);
	const stack = [];
	const push = (i) => {
		if (!outside[i] && !closed[i] && !solid[i]) {
			outside[i] = 1;
			stack.push(i);
		}
	};
	for (let x = 0; x < w; x++) {
		push(x);
		push((h - 1) * w + x);
	}
	for (let y = 0; y < h; y++) {
		push(y * w);
		push(y * w + w - 1);
	}
	while (stack.length) {
		const i = stack.pop();
		const x = i % w;
		const y = (i - x) / w;
		if (x > 0) push(i - 1);
		if (x < w - 1) push(i + 1);
		if (y > 0) push(i - w);
		if (y < h - 1) push(i + w);
	}
	const S = new Float64Array((w + 1) * (h + 1) * 4);
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
		const o = ((y + 1) * (w + 1) + x + 1) * 4;
		const a = ((y + 1) * (w + 1) + x) * 4;
		const b = (y * (w + 1) + x + 1) * 4;
		const c = (y * (w + 1) + x) * 4;
		const k = at(x, y);
		const s = solid[y * w + x];
		for (let ch = 0; ch < 4; ch++) S[o + ch] = (ch < 3 ? px[k + ch] * s : s) + S[a + ch] + S[b + ch] - S[c + ch];
	}
	const boxSum = (x, y, R, ch) => {
		const xa = Math.max(0, x - R), xb = Math.min(w, x + R + 1), ya = Math.max(0, y - R), yb = Math.min(h, y + R + 1);
		const I = (xx, yy) => S[(yy * (w + 1) + xx) * 4 + ch];
		return I(xb, yb) - I(xa, yb) - I(xb, ya) + I(xa, ya);
	};
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
		const i = y * w + x;
		if (solid[i] || !closed[i] && outside[i]) continue;
		let R = r + 2;
		let n = boxSum(x, y, R, 3);
		while (n < 1 && R < 64) n = boxSum(x, y, R *= 2, 3);
		if (n < 1) continue;
		const k = at(x, y);
		for (let ch = 0; ch < 3; ch++) px[k + ch] = boxSum(x, y, R, ch) / n * .88;
		px[k + 3] = 255;
		solid[i] = 1;
	}
	const { x0, bodyAt } = layout;
	const xIn = x0 + .01 * length;
	const yTop = bodyAt(xIn, true);
	const yBot = bodyAt(xIn, false);
	if (!Number.isFinite(yTop) || !Number.isFinite(yBot)) return;
	const margin = .015 * length;
	const p = new THREE.Vector3();
	const dir = cu.x > 0 ? 1 : -1;
	for (let y = 0; y < h; y++) {
		p.set(u0 + w / 2, v0 + y, 1).applyMatrix3(inv);
		const yr = p.y;
		if (yr > yTop + margin || yr < yBot - margin) continue;
		const offBody = yr > yTop || yr < yBot;
		const xEnd = offBody ? x0 : xIn;
		const maxGap = (offBody ? .012 : .03) * length;
		let last = -1;
		let lastX = -Infinity;
		for (let n = 0; n < w; n++) {
			const x = dir > 0 ? n : w - 1 - n;
			p.set(u0 + x, v0 + y, 1).applyMatrix3(inv);
			if (p.x > xEnd) break;
			if (solid[y * w + x]) {
				const xb = x - 3 * dir;
				last = xb >= 0 && xb < w && solid[y * w + xb] ? xb : x;
				lastX = p.x;
				continue;
			}
			if (last < 0 || p.x < x0 - .03 * length || xEnd - lastX > maxGap) continue;
			const k = at(x, y);
			const kf = at(last, y);
			px[k] = px[kf];
			px[k + 1] = px[kf + 1];
			px[k + 2] = px[kf + 2];
			px[k + 3] = 255;
			solid[y * w + x] = 1;
		}
	}
	const inset = .004 * length;
	const ys = new Float64Array(h);
	for (let x = 0; x < w; x++) {
		p.set(u0 + x, v0 + h / 2, 1).applyMatrix3(inv);
		const xc = p.x;
		if (xc < x0) continue;
		for (let y = 0; y < h; y++) ys[y] = p.set(u0 + x, v0 + y, 1).applyMatrix3(inv).y;
		for (const up of [true, false]) {
			const surf = bodyAt(xc, up);
			if (!Number.isFinite(surf)) continue;
			let best = -1;
			for (let y = 0; y < h; y++) {
				if (!solid[y * w + x] || (up ? ys[y] <= surf : ys[y] >= surf)) continue;
				if (best < 0 || (up ? ys[y] < ys[best] : ys[y] > ys[best])) best = y;
			}
			if (best < 0 || Math.abs(ys[best] - surf) > .015 * length) continue;
			const away = up === ys[Math.min(h - 1, best + 1)] > ys[best] ? 1 : -1;
			const yf = THREE.MathUtils.clamp(best + 3 * away, 0, h - 1);
			const kf = at(x, solid[yf * w + x] ? yf : best);
			const lim = up ? surf - inset : surf + inset;
			for (let y = 0; y < h; y++) {
				if (solid[y * w + x]) continue;
				const yy = ys[y];
				if (up ? yy >= ys[best] || yy < lim : yy <= ys[best] || yy > lim) continue;
				const k = at(x, y);
				px[k] = px[kf];
				px[k + 1] = px[kf + 1];
				px[k + 2] = px[kf + 2];
				px[k + 3] = 255;
			}
		}
	}
	if (taper > 0) {
		const yT = bodyAt(x0 + .005 * length, true);
		const yB = bodyAt(x0 + .005 * length, false);
		for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
			const k = at(x, y);
			if (px[k + 3] === 0) continue;
			p.set(u0 + x, v0 + y, 1).applyMatrix3(inv);
			const room = taper * Math.max(0, x0 - p.x);
			if (p.y - yT > room || yB - p.y > room) px[k + 3] = 0;
		}
	}
}
function fillFinBases(geo, map, length, minV, tailTaper = 0) {
	const fin = geo.getAttribute("_fin");
	const uv = geo.getAttribute("uv");
	const pos = geo.getAttribute("position");
	const index = geo.getIndex();
	const img = map.image;
	if (!fin || !uv || !pos || !index || !img?.width) return map;
	const W = img.width;
	const H = img.height;
	const canvas = document.createElement("canvas");
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return map;
	ctx.drawImage(img, 0, 0);
	const data = ctx.getImageData(0, 0, W, H);
	const px = data.data;
	const layout = finLayout(geo);
	if (!layout) return map;
	const { x0, x1, bodyAt, bodyMid, plates } = layout;
	const inset = .006 * length;
	const maxGap = .01 * length;
	for (const vs of plates) {
		let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0, su = 0, sxu = 0, syu = 0, sv = 0, sxv = 0, syv = 0;
		let xmin = Infinity, ymin = Infinity, ymax = -Infinity, umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
		for (const i of vs) {
			const x = pos.getX(i), y = pos.getY(i), u = uv.getX(i) * W, v = uv.getY(i) * H;
			sx += x;
			sy += y;
			sxx += x * x;
			sxy += x * y;
			syy += y * y;
			su += u;
			sxu += x * u;
			syu += y * u;
			sv += v;
			sxv += x * v;
			syv += y * v;
			xmin = Math.min(xmin, x);
			ymin = Math.min(ymin, y);
			ymax = Math.max(ymax, y);
			umin = Math.min(umin, u);
			umax = Math.max(umax, u);
			vmin = Math.min(vmin, v);
			vmax = Math.max(vmax, v);
		}
		const m = new THREE.Matrix3().set(sxx, sxy, sx, sxy, syy, sy, sx, sy, vs.length);
		if (Math.abs(m.determinant()) < 1e-12) continue;
		m.invert();
		const cu = new THREE.Vector3(sxu, syu, su).applyMatrix3(m);
		const cv = new THREE.Vector3(sxv, syv, sv).applyMatrix3(m);
		const inv = new THREE.Matrix3().set(cu.x, cu.y, cu.z, cv.x, cv.y, cv.z, 0, 0, 1);
		if (Math.abs(inv.determinant()) < 1e-12) continue;
		inv.invert();
		const p = new THREE.Vector3();
		const v0 = Math.max(Math.ceil(vmin), Math.ceil(minV * H));
		const v1 = Math.min(Math.floor(vmax), H - 1);
		if (xmin < x0 - .01 * length) {
			fillTailPlate(px, W, {
				u0: Math.max(0, Math.ceil(umin)),
				u1: Math.min(W - 1, Math.floor(umax)),
				v0,
				v1
			}, inv, cu, layout, length, tailTaper);
			continue;
		}
		const upper = ymin > bodyMid;
		if (!upper && ymax > bodyMid) continue;
		for (let u = Math.max(0, Math.ceil(umin)); u <= Math.min(W - 1, Math.floor(umax)); u++) {
			let vo = -1;
			if (upper) {
				for (let v = v1; v >= v0 && vo < 0; v--) if (px[(v * W + u) * 4 + 3] >= 128) vo = v;
			} else for (let v = v0; v <= v1 && vo < 0; v++) if (px[(v * W + u) * 4 + 3] >= 128) vo = v;
			if (vo < 0) continue;
			p.set(u, vo, 1).applyMatrix3(inv);
			if (p.x < x0 || p.x > x1) continue;
			const yIn = upper ? bodyAt(p.x, true) - inset : bodyAt(p.x, false) + inset;
			if (!Number.isFinite(yIn)) continue;
			if ((upper ? p.y - yIn : yIn - p.y) > inset + maxGap) continue;
			const vIn = Math.round(cv.x * p.x + cv.y * yIn + cv.z);
			const c = (THREE.MathUtils.clamp(upper ? vo - 3 : vo + 3, v0, v1) * W + u) * 4;
			const r = px[c];
			const g = px[c + 1];
			const b = px[c + 2];
			const a0 = upper ? vo + 1 : Math.max(vIn, v0);
			const a1 = upper ? Math.min(vIn, v1) : vo - 1;
			for (let v = a0; v <= a1; v++) {
				const k = (v * W + u) * 4;
				px[k] = r;
				px[k + 1] = g;
				px[k + 2] = b;
				px[k + 3] = 255;
			}
		}
	}
	ctx.putImageData(data, 0, 0);
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = map.colorSpace;
	tex.flipY = map.flipY;
	tex.wrapS = map.wrapS;
	tex.wrapT = map.wrapT;
	tex.anisotropy = map.anisotropy;
	map.dispose();
	return tex;
}
async function loadPhotoFish(base = `/fish/`, pick = {}) {
	if (new URLSearchParams(location.search).has("nophotofish")) return;
	const loader = new GLTFLoader();
	const want = Object.entries(FILES).filter(([id]) => (!pick.only || pick.only.includes(id)) && !pick.skip?.includes(id) && !CRAFTED[id]);
	const crafted = Object.keys(CRAFTED).filter((id) => (pick.only ? pick.only.includes(id) : !CRAFTED[id].onlyAsked) && !pick.skip?.includes(id));
	await Promise.all(crafted.map((id) => CRAFTED[id].load((name) => urlOf(base, name)).then(() => craftedReady.add(id))));
	const lo = pick.lo === false ? null : "_lo";
	await Promise.all(want.map(async ([id, file]) => {
		await loadOne(loader, base, id, file, lo);
		if (pick.fixed !== false) await loadOne(loader, base, id, file, FIXED_SUFFIX, id + FIXED_SUFFIX + "_fixed", true, true);
	}));
}
var urlOf = (base, name) => typeof base === "string" ? base + name : base(name);
function photoFishFiles() {
	return { ...FILES };
}
var FIXED_SUFFIX = "_lo3";
var OWN_FIXED_TEXTURE = new Set(["seabass"]);
async function loadOne(loader, base, id, file, loSuffix = "_lo", key = id, needLo = false, fixed = false) {
	try {
		const hi0 = fixed ? null : first(await loader.loadAsync(urlOf(base, `${file}.glb`)));
		if (!fixed && !hi0) return;
		const lo0 = loSuffix === null ? null : await loader.loadAsync(urlOf(base, `${file}${loSuffix}.glb`)).then(first, () => null);
		if ((needLo || fixed) && !lo0) return;
		const hi = fixed ? lo0 : hi0;
		const lo = fixed ? null : lo0;
		const fileTris = {
			hi: triCount(hi.geometry),
			lo: lo ? triCount(lo.geometry) : 0
		};
		const swim = hi.userData.swim;
		const shared = fixed && !OWN_FIXED_TEXTURE.has(id) ? assets.get(id)?.map ?? null : null;
		const photo = shared ?? hi.material.map;
		if (!photo) return;
		const texHeight = photo.image?.height ?? 640;
		let bodyV = 0;
		const fin = hi.geometry.getAttribute("_fin");
		const uvs = hi.geometry.getAttribute("uv");
		if (fin && uvs) {
			for (let i = 0; i < uvs.count; i++) if (partOf(fin, i) === 0) bodyV = Math.max(bodyV, uvs.getY(i));
		}
		const crafted = !!swim.crafted;
		const map = shared ?? (crafted ? photo : fillFinBases(hi.geometry, photo, swim.length, bodyV + 4 / texHeight, TAIL_TAPER[id] ?? 0));
		const mouth = fixed ? null : swim.mouth ?? MOUTHS[id] ?? null;
		for (const g of lo ? [hi.geometry, lo.geometry] : [hi.geometry]) {
			if (!crafted) {
				fixFinEdges(g, texHeight);
				if (!fixed || g !== hi.geometry) roundSnout(g, swim.length);
				thinTailEnd(g, swim.length);
				reachTailIntoBody(g, swim.length);
			}
			addFlutterWeights(g);
		}
		if (fixed) tailOnlyFlutter(hi.geometry);
		const gill = fixed ? null : swim.gill ?? GILLS[id] ?? null;
		if (gill && !crafted) {
			addGillCover(hi.geometry, gill, swim.length);
			if (lo) addGillCover(lo.geometry, gill, swim.length);
		}
		if (crafted) for (const g of lo ? [hi.geometry, lo.geometry] : [hi.geometry]) {
			const j = g.getAttribute("_jaw");
			if (j) g.setAttribute("jaw", j);
			else addJawWeights(g, null);
		}
		if (mouth && !crafted) {
			if (mouth.close === 0) {
				flattenAhead(hi.geometry, mouth, swim.length);
				if (lo) flattenAhead(lo.geometry, mouth, swim.length);
				splitAtLip(hi.geometry, mouth);
				if (lo) splitAtLip(lo.geometry, mouth);
			}
			addJawPlate(hi.geometry, mouth, swim.length);
			if (mouth.close > 0) addUpperJawPlate(hi.geometry, mouth, swim.length);
			if (lo) {
				addJawPlate(lo.geometry, mouth, swim.length);
				if (mouth.close > 0) addUpperJawPlate(lo.geometry, mouth, swim.length);
			}
		}
		if (!crafted) {
			addJawWeights(hi.geometry, mouth);
			if (lo) addJawWeights(lo.geometry, mouth);
		}
		const still = fixed || STILL.has(id);
		const eye = still ? null : addEyePivots(hi.geometry);
		if (eye && lo) addEyePivots(lo.geometry);
		map.anisotropy = 4;
		map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
		let photos = null;
		const hf = HEAD_FILES[id];
		if (hf && gill) {
			const tl = new THREE.TextureLoader();
			const load = async (f) => {
				const t = await tl.loadAsync(urlOf(base, f));
				t.colorSpace = THREE.SRGBColorSpace;
				t.flipY = false;
				t.anisotropy = 4;
				t.needsUpdate = true;
				return t;
			};
			photos = await Promise.all([load(`${hf.file}_head.webp`), load(`${hf.file}_cover.webp`)]).then(([head, cover]) => ({
				head,
				cover
			}), () => null);
		}
		const [x0, z0, k] = swim.photo ?? [
			HEAD_PHOTO.x0,
			HEAD_PHOTO.z0,
			HEAD_PHOTO.k
		];
		const headMap = {
			x0,
			z0,
			k,
			box: hf?.box ?? [
				0,
				0,
				1,
				1
			]
		};
		const foldMax = FOLD_MAX[id] ?? 1.1;
		assets.set(key, {
			hi: hi.geometry,
			lo: lo?.geometry ?? null,
			map,
			swim,
			gill,
			mouth,
			eye,
			photos,
			headMap,
			still,
			foldMax,
			fileTris,
			tailFlutter: fixed
		});
	} catch {}
}
function first(gltf) {
	let mesh = null;
	gltf.scene.traverse((o) => {
		if (!mesh && o.isMesh) mesh = o;
	});
	return mesh;
}
var triCount = (g) => g ? (g.index ? g.index.count : g.attributes.position.count) / 3 : 0;
function isCraftedFish(id) {
	return !!CRAFTED[id];
}
function photoFishInfo(id) {
	if (CRAFTED[id]) {
		if (!craftedReady.has(id)) return null;
		const st = CRAFTED[id].stats();
		return {
			hi: st.hi,
			lo: st.lo,
			file: {
				hi: st.hi,
				lo: st.lo
			},
			texture: st.texture,
			swim: null
		};
	}
	const a = assets.get(id);
	if (!a) return null;
	const img = a.map.image;
	return {
		hi: triCount(a.hi),
		lo: triCount(a.lo),
		file: a.fileTris,
		texture: `${img?.width ?? "?"}×${img?.height ?? "?"}`,
		swim: a.swim
	};
}
new THREE.Matrix4();
new THREE.Matrix4();
function buildBatchedFish(key, a, length, batches) {
	const root = new THREE.Group();
	const anchor = new THREE.Object3D();
	const s = length / a.swim.length;
	anchor.scale.setScalar(s);
	anchor.rotation.y = -Math.PI / 2;
	anchor.position.z = s * (.47 * a.swim.length - a.swim.snout);
	root.add(anchor);
	const m = {
		anchor,
		swim: new THREE.Vector4(0, 1, 0, 0),
		neck: new THREE.Vector4(0, .23, .43, 0),
		flut: new THREE.Vector4(0, 0, 0, 0),
		head: 1,
		power: 0,
		shade: 0
	};
	const batch = batches.get(key, a);
	batch.add(m);
	const env = a.swim.env ?? [
		.02,
		-.08,
		.16
	];
	const tipEnv = env[0] + env[1] + env[2];
	return {
		root,
		shadows: [batch.shadow],
		dispose() {
			batch.remove(m);
		},
		detail(_on) {},
		shade(opacity) {
			m.shade = opacity;
		},
		swim(phase, amp, bend = 0) {
			m.swim.set(phase / (Math.PI * 2), amp / (a.swim.amp * tipEnv), THREE.MathUtils.clamp(bend, -4, 4) * s, 0);
		},
		lieOnFloor(_up) {},
		lookAtViewer(_amount) {},
		finMove(_clock, _tilt, _fold, _steer, _wobble = 0, _pect = 0, _whim = 0) {},
		mouth(_open) {},
		mouthMax: 0,
		gill(_open) {},
		flutter(clock, amp, flag = 0, seed = 0) {
			m.flut.set(clock, amp, flag, seed);
		},
		flex(neck, from, to, cBend, head, power = 0) {
			m.neck.set(neck, from, to, THREE.MathUtils.clamp(cBend, -6, 6) * s);
			m.head = head;
			m.power = power;
		}
	};
}
function buildPhotoFish(id, length, batches) {
	const c = CRAFTED[id];
	if (c) return craftedReady.has(id) ? c.build(length) : null;
	return buildPhotoFishFromPhoto(id, length, batches);
}
function buildPhotoFishFromPhoto(id, length, batches) {
	const a = assets.get(id);
	if (!a) return null;
	if (batches) return buildBatchedFish(id, a, length, batches);
	const { material, uniforms } = swimMaterial(a);
	const root = new THREE.Group();
	const lod = new THREE.LOD();
	const s = length / a.swim.length;
	lod.scale.setScalar(s);
	lod.rotation.y = -Math.PI / 2;
	lod.position.z = s * (.47 * a.swim.length - a.swim.snout);
	const shadeU = {
		...uniforms,
		uShade: { value: 0 },
		uShadeColor: { value: new THREE.Color(397332) }
	};
	const shadowMat = shadowMaterial(a.map, shadeU);
	const shadows = [];
	const level = (geo) => {
		const mesh = new THREE.Mesh(geo, material);
		const sh = new THREE.Mesh(geo, shadowMat);
		sh.renderOrder = 3;
		sh.visible = false;
		mesh.add(sh);
		shadows.push(sh);
		return mesh;
	};
	lod.addLevel(level(a.hi), 0);
	const loDist = 2.5 + length * 8;
	if (a.lo) lod.addLevel(level(a.lo), loDist, .1);
	root.add(lod);
	const env = a.swim.env ?? [
		.02,
		-.08,
		.16
	];
	const tipEnv = env[0] + env[1] + env[2];
	let lastPhase = 0;
	let flap = Math.random();
	return {
		root,
		shadows,
		detail(on) {
			const l = lod.levels[1];
			if (l) l.distance = on ? loDist : 0;
		},
		uniforms,
		shade(opacity) {
			shadeU.uShade.value = opacity;
			for (const s of shadows) s.visible = opacity > .005;
		},
		swim(phase, amp, bend = 0, time = performance.now() / 1e3) {
			const cyc = phase / (Math.PI * 2);
			const slow = THREE.MathUtils.clamp(1 - (amp - .04) / .06, 0, 1);
			flap += Math.max(0, cyc - lastPhase) * .8;
			lastPhase = cyc;
			uniforms.uTime.value = time;
			uniforms.uSwim.value.set(cyc, amp / (a.swim.amp * tipEnv), THREE.MathUtils.clamp(bend, -4, 4) * s, a.still ? 0 : .03 + slow * .08);
			if (a.still) uniforms.uFin.value.set(0, 0, 1, 0);
			else uniforms.uFin.value.set(flap, slow * .3, .15 + slow * .6, slow * .5);
		},
		lieOnFloor(up) {
			uniforms.uFloor.value = up;
		},
		lookAtViewer(amount) {
			uniforms.uLookAt.value = amount;
		},
		air(amount) {
			uniforms.uAir.value = amount;
		},
		finMove(clock, tilt, fold, steer, wobble = 0, pect = 0, whim = 0) {
			if (a.still) return;
			uniforms.uFinMove.value.set(clock, tilt, fold, steer);
			uniforms.uFinMove2.value.set(wobble, pect, whim, a.foldMax);
		},
		mouth(open) {
			uniforms.uMouth.value = a.mouth ? open : 0;
		},
		mouthMax: a.mouth ? a.mouth.close + .35 : 0,
		gill(open) {
			uniforms.uGill.value = a.gill ? open : 0;
		},
		flutter(clock, amp, flag = 0, seed = 0) {
			if (a.still && !a.tailFlutter) return;
			uniforms.uFlut.value.set(clock, amp, flag, seed);
		},
		flex(neck, from, to, cBend, head, power = 0) {
			uniforms.uNeck.value.set(neck, from, to, THREE.MathUtils.clamp(cBend, -6, 6) * s);
			uniforms.uHead.value = head;
			uniforms.uPower.value = power;
		}
	};
}
var ALL_SPECIES = [
	{
		"name": "アジ",
		"id": "aji",
		"en": "Horse Mackerel",
		"lengthCm": [16, 48],
		"bodyHeight": .25,
		"cruise": .4,
		"burst": 2,
		"glide": .35,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .035,
		"finMove": 1
	},
	{
		"name": "メバル",
		"id": "mebaru",
		"en": "Rockfish",
		"lengthCm": [17, 33],
		"bodyHeight": .32,
		"cruise": .25,
		"burst": 1.5,
		"glide": .5,
		"hoverPitch": .35,
		"finFlutter": .008,
		"finFlag": .035,
		"finMove": 1
	},
	{
		"name": "カサゴ",
		"id": "kasago",
		"en": "Scorpionfish",
		"lengthCm": [15, 33],
		"bodyHeight": .3,
		"cruise": .15,
		"burst": 1.2,
		"glide": .9,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .035,
		"finMove": 1
	},
	{
		"name": "シーバス",
		"id": "seabass",
		"en": "Seabass",
		"lengthCm": [50, 95],
		"bodyHeight": .24,
		"cruise": .6,
		"burst": 3.5,
		"glide": .3,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .035,
		"finMove": 1
	},
	{
		"name": "サバ",
		"id": "saba",
		"en": "Mackerel",
		"lengthCm": [20, 40],
		"bodyHeight": .2,
		"cruise": .6,
		"burst": 4,
		"glide": .25,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .035,
		"finMove": 1
	},
	{
		"name": "タチウオ",
		"id": "tachiuo",
		"en": "Cutlassfish",
		"lengthCm": [65, 145],
		"bodyHeight": .07,
		"cruise": .3,
		"burst": 2.5,
		"glide": .6,
		"hoverPitch": 0,
		"upright": 1.31,
		"maxBend": .08,
		"finFlutter": .008,
		"finFlag": .035,
		"finMove": 1
	},
	{
		"name": "サワラ",
		"id": "sawara",
		"en": "Spanish Mackerel",
		"lengthCm": [50, 100],
		"bodyHeight": .16,
		"cruise": .8,
		"burst": 4.5,
		"glide": .25,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .035,
		"finMove": 1
	},
	{
		"name": "カマス",
		"id": "kamasu",
		"en": "Barracuda",
		"lengthCm": [22, 46],
		"bodyHeight": .13,
		"cruise": .5,
		"burst": 3,
		"glide": .3,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .035,
		"finMove": 1
	},
	{
		"name": "ブリ",
		"id": "buri",
		"en": "Yellowtail",
		"lengthCm": [40, 100],
		"bodyHeight": .22,
		"cruise": .9,
		"burst": 5,
		"glide": .25,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .035,
		"finMove": 1
	},
	{
		"name": "ヒラマサ",
		"id": "hiramasa",
		"en": "Kingfish",
		"lengthCm": [50, 110],
		"bodyHeight": .21,
		"cruise": 1,
		"burst": 5.5,
		"glide": .25,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .035,
		"finMove": 1
	},
	{
		"name": "マゴチ",
		"id": "magochi",
		"en": "Flathead",
		"lengthCm": [35, 65],
		"bodyHeight": .12,
		"cruise": .15,
		"burst": 2.5,
		"glide": .85,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .035,
		"finMove": 1
	},
	{
		"name": "クロダイ",
		"id": "kurodai",
		"en": "Black Sea Bream",
		"lengthCm": [28, 65],
		"bodyHeight": .38,
		"cruise": .35,
		"burst": 2.5,
		"glide": .5,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .035,
		"finMove": 1
	},
	{
		"name": "マダイ",
		"id": "madai",
		"en": "Red Sea Bream",
		"lengthCm": [28, 90],
		"bodyHeight": .38,
		"cruise": .4,
		"burst": 3,
		"glide": .5,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .035,
		"finMove": 1
	},
	{
		"name": "キハダ",
		"id": "kihada",
		"en": "Yellowfin Tuna",
		"lengthCm": [126, 150],
		"bodyHeight": .25,
		"cruise": 1.3,
		"burst": 7,
		"glide": .15,
		"hoverPitch": 0,
		"finFlutter": .006,
		"finFlag": .025,
		"finMove": 1
	},
	{
		"name": "イサキ",
		"id": "isaki",
		"en": "Chicken Grunt",
		"lengthCm": [22, 45],
		"bodyHeight": .27,
		"cruise": .4,
		"burst": 2.2,
		"glide": .4,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .035,
		"finMove": 1
	},
	{
		"name": "尾長グレ",
		"id": "onagagure",
		"en": "Largescale Blackfish",
		"lengthCm": [30, 62],
		"bodyHeight": .36,
		"cruise": .4,
		"burst": 3.2,
		"glide": .4,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .035,
		"finMove": 1
	},
	{
		"name": "口太グレ",
		"id": "kuchibuto",
		"en": "Opaleye",
		"lengthCm": [25, 52],
		"bodyHeight": .38,
		"cruise": .35,
		"burst": 2.6,
		"glide": .45,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .035,
		"finMove": 1
	},
	{
		"name": "シブダイ",
		"id": "shibudai",
		"en": "Star Snapper",
		"lengthCm": [40, 60],
		"bodyHeight": .33,
		"cruise": .35,
		"burst": 2.8,
		"glide": .5,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .035,
		"finMove": 1
	},
	{
		"name": "カージナルテトラ",
		"id": "cardinal",
		"en": "Cardinal Tetra",
		"lengthCm": [3, 5],
		"bodyHeight": .22,
		"cruise": .06,
		"burst": .5,
		"glide": .2,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .03,
		"finMove": 1
	},
	{
		"name": "ディスカス（ブルーダイヤモンド）",
		"id": "discus_blue",
		"en": "Blue Diamond Discus",
		"lengthCm": [13, 17],
		"bodyHeight": .66,
		"cruise": .045,
		"burst": .6,
		"glide": .6,
		"hoverPitch": 0,
		"finFlutter": .004,
		"finFlag": .012,
		"finMove": 1
	},
	{
		"name": "ディスカス（レッドメロン）",
		"id": "discus_red",
		"en": "Red Melon Discus",
		"lengthCm": [13, 17],
		"bodyHeight": .66,
		"cruise": .045,
		"burst": .6,
		"glide": .6,
		"hoverPitch": 0,
		"finFlutter": .004,
		"finFlag": .012,
		"finMove": 1
	},
	{
		"name": "ディスカス（レッドターコイズ）",
		"id": "discus_turq",
		"en": "Red Turquoise Discus",
		"lengthCm": [13, 17],
		"bodyHeight": .66,
		"cruise": .045,
		"burst": .6,
		"glide": .6,
		"hoverPitch": 0,
		"finFlutter": .004,
		"finFlag": .012,
		"finMove": 1
	},
	{
		"name": "オイカワ（オス・婚姻色）",
		"id": "oikawa_male",
		"en": "Pale Chub (male)",
		"lengthCm": [12, 15],
		"bodyHeight": .19,
		"cruise": .35,
		"burst": 3,
		"glide": .3,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .03,
		"finMove": 1
	},
	{
		"name": "オイカワ（メス）",
		"id": "oikawa_female",
		"en": "Pale Chub (female)",
		"lengthCm": [9, 12],
		"bodyHeight": .19,
		"cruise": .35,
		"burst": 3,
		"glide": .3,
		"hoverPitch": 0,
		"finFlutter": .008,
		"finFlag": .03,
		"finMove": 1
	},
	{
		"name": "カタクチイワシ",
		"id": "katakuchi",
		"en": "Anchovy",
		"lengthCm": [8, 15],
		"bodyHeight": .17,
		"cruise": .4,
		"burst": 1.8,
		"glide": .2,
		"hoverPitch": 0
	}
];
var RESERVE_SPECIES = [];
var recordKey = (sp, _young) => sp.name;
var GILL_MAX = .35;
var BREATH_HZ = .8;
var GAME_STYLE = {
	neckFlex: .65,
	neckAt: .4,
	bodyBend: 1.5,
	tailLock: 0,
	tailOffset: 0,
	recoil: .2,
	flutter: 1,
	flag: 1,
	finMove: 1,
	finWhim: .55,
	gill: 1,
	mouth: 1,
	burst: 1,
	airAmp: .35,
	airFreq: .5,
	airGill: 1.5,
	airMouth: 1.5
};
var MOTIONS = [
	{
		id: "swim",
		ja: "ゆったり泳ぐ",
		en: "Cruise",
		noteJa: "ふだんの速さ。ゆっくりの魚は尾を数回振っては体をまっすぐにして滑るのをくり返す",
		noteEn: "Everyday cruising speed. Slow species beat the tail a few times, then glide with a straight body.",
		onLine: false
	},
	{
		id: "power",
		ja: "全速で泳ぐ",
		en: "Full speed",
		noteJa: "その魚のいちばん速い泳ぎ。頭から尾まで体全体を大きくうねらせ、ひれを畳む",
		noteEn: "Top speed. The whole body undulates from head to tail and the fins fold back.",
		onLine: false
	},
	{
		id: "turn",
		ja: "曲がる",
		en: "Turning",
		noteJa: "左右へゆっくり向きを変えながら泳ぐ。体が曲がる側へ弧になり、ひれを舵のように傾ける",
		noteEn: "Swims while slowly turning left and right. The body arcs into the turn and the fins steer.",
		onLine: false
	},
	{
		id: "hover",
		ja: "止まる",
		en: "Hover",
		noteJa: "その場に止まって呼吸する。胸びれで漕ぎ、目がきょろきょろ動く（メバルは頭を上げ、タチウオは立ち泳ぎ）",
		noteEn: "Holds still and breathes, sculling with the pectoral fins while the eyes dart around (some species tilt up or stand vertical).",
		onLine: false
	},
	{
		id: "range",
		ja: "口・えら・ひれを開く",
		en: "Full range",
		noteJa: "4 秒に 1 回、口とえらぶたをいっぱいに開け、ひれを大きく広げてから体にぴったり畳む（動かせる範囲の見本）",
		noteEn: "Every 4 s the mouth and gill covers open fully and the fins spread wide, then everything closes and folds flat (range-of-motion demo).",
		onLine: false
	},
	{
		id: "bite",
		ja: "くわえて首を振る",
		en: "Bite & shake",
		noteJa: "ルアーをくわえて小さく首を振る。首で曲げ、体も C 字にしなる",
		noteEn: "Holds a lure and shakes its head gently, bending at the neck with a C-shaped body.",
		onLine: true
	},
	{
		id: "hooked",
		ja: "掛かって暴れる",
		en: "Hooked fight",
		noteJa: "針に掛かり、大きく首を振って粘る。ひれをいっぱいに広げる",
		noteEn: "Hooked and fighting with big head shakes, fins spread wide.",
		onLine: true
	},
	{
		id: "tired",
		ja: "弱って横倒し",
		en: "Exhausted",
		noteJa: "力が抜けて横に倒れ、尾をゆっくり小さく振る",
		noteEn: "Worn out, rolls onto its side and beats the tail slowly.",
		onLine: true
	},
	{
		id: "air",
		ja: "空中で暴れる",
		en: "Out of water",
		noteJa: "抜き上げられて糸にぶら下がり、尾を振ってねじれる。えらと口を大きくあえがせ、目がこちらを見る",
		noteEn: "Lifted out on the line: hangs head-up, twists and kicks, gasps with mouth and gills, and looks at you.",
		onLine: true
	},
	{
		id: "landed",
		ja: "床で跳ねる",
		en: "Flopping",
		noteJa: "床に横たわってピチピチ跳ねる。はじめは強く、だんだん弱く（2.4 秒ごとにくり返す）",
		noteEn: "Lies on its side on the deck and flops, strong at first then weaker (repeats every 2.4 s).",
		onLine: false
	}
];
var ON_LINE = new Set([
	"bite",
	"hooked",
	"tired",
	"air"
]);
var YOUNG = { isaki_young: {
	of: "isaki",
	ja: "イサキ（幼魚）",
	en: "Grunt (juvenile)",
	lengthCm: [15, 28]
} };
var speciesById = (id) => [...ALL_SPECIES, ...RESERVE_SPECIES].find((s) => s.id === id);
function paramsOf(id) {
	const sp = speciesById(YOUNG[id]?.of ?? id);
	return {
		cruise: sp.cruise,
		burst: sp.burst,
		glide: sp.glide,
		hoverPitch: sp.hoverPitch,
		upright: sp.upright ?? 0,
		maxBend: sp.maxBend ?? .15,
		finFlutter: sp.finFlutter ?? 0,
		finFlag: sp.finFlag ?? 0,
		finMove: sp.finMove ?? 0,
		bodyHeight: sp.bodyHeight
	};
}
var FISH = Object.entries(photoFishFiles()).flatMap(([id, file]) => {
	const y = YOUNG[id];
	if (y) return [{
		id,
		file,
		ja: y.ja,
		en: y.en,
		lengthCm: y.lengthCm,
		typicalCm: (y.lengthCm[0] + y.lengthCm[1]) / 2
	}];
	const sp = speciesById(id);
	if (!sp) return [];
	const lengthCm = [sp.lengthCm[0], sp.lengthCm[1]];
	return [{
		id,
		file,
		ja: recordKey(sp, false),
		en: sp.en,
		lengthCm,
		typicalCm: Math.round((lengthCm[0] + lengthCm[1]) / 2 * 10) / 10
	}];
});
async function loadFish(baseUrl, ids) {
	await loadPhotoFish(baseUrl, {
		only: ids,
		fixed: false
	});
}
function fishStats(id) {
	const i = photoFishInfo(id);
	return i ? {
		hiTris: i.file.hi,
		loTris: i.file.lo,
		texture: i.texture
	} : null;
}
var rand = (a, b) => a + (b - a) * Math.random();
var clamp = THREE.MathUtils.clamp;
var smooth = THREE.MathUtils.smoothstep;
var AXIS_X = new THREE.Vector3(1, 0, 0);
var AXIS_Y = new THREE.Vector3(0, 1, 0);
var AXIS_Z = new THREE.Vector3(0, 0, 1);
var MOUTH = .47;
var Gaze = class {
	on = true;
	left = 1 + Math.random() * 2;
	amount = 0;
	update(dt) {
		this.left -= dt;
		if (this.left <= 0) {
			this.on = !this.on;
			this.left = this.on ? 2 + Math.random() * 2 : .8 + Math.random() * 1.2;
		}
		this.amount += ((this.on ? 1 : 0) - this.amount) * Math.min(1, dt * 6);
		return this.amount;
	}
};
var SHAKE = {
	bite: THREE.MathUtils.degToRad(9),
	hooked: THREE.MathUtils.degToRad(25),
	tired: .04
};
var FishActor = class {
	object = new THREE.Group();
	info;
	length;
	floorY;
	motion = "swim";
	style = { ...GAME_STYLE };
	drive = null;
	body = new THREE.Group();
	mesh;
	p;
	crafted;
	gaze = new Gaze();
	seed = Math.random() * 100;
	base = new THREE.Quaternion();
	time = Math.random() * 100;
	phase = Math.random() * 10;
	finClock = Math.random() * 100;
	finFold = 0;
	finPect = .12;
	gillPhase = Math.random() * 10;
	mouthOpen = 0;
	shakePhase = Math.random() * 10;
	shakeAmp = 0;
	shakeAngle = 0;
	shakeShown = 0;
	roll = 0;
	pitch = 0;
	yaw = 0;
	exert = 0;
	speed = 0;
	prevSpeed = 0;
	decel = 0;
	intent = 0;
	turn = 0;
	thrust = 1;
	bursting = true;
	gaitT = Math.random();
	flop = 2.4;
	constructor(id, lengthCm) {
		const info = FISH.find((f) => f.id === id);
		if (!info) throw new Error(`unknown fish: ${id}`);
		this.info = info;
		this.length = (lengthCm ?? info.typicalCm) / 100;
		const mesh = buildPhotoFish(id, this.length);
		if (!mesh) throw new Error(`fish not loaded: ${id} (call loadFish first)`);
		this.mesh = mesh;
		this.p = paramsOf(id);
		this.crafted = isCraftedFish(id);
		this.floorY = -this.length * this.p.bodyHeight * .2;
		this.body.add(mesh.root);
		this.object.add(this.body);
	}
	setMotion(m) {
		if (m === this.motion) return;
		this.motion = m;
		this.flop = 2.4;
	}
	setDetail(d) {
		const lod = this.mesh.root.children[0];
		lod.autoUpdate = d === "auto";
		if (d !== "auto") lod.levels.forEach((l, i) => l.object.visible = d === "low" ? i === lod.levels.length - 1 : i === 0);
		else this.mesh.detail(true);
	}
	get currentSpeed() {
		return this.speed;
	}
	getMouth(out = new THREE.Vector3()) {
		return out.set(0, 0, this.length * MOUTH).applyQuaternion(this.body.quaternion);
	}
	update(dt) {
		const L = this.length;
		const m = this.motion;
		const p = this.p;
		const st = this.style;
		const lure = ON_LINE.has(m) || m === "landed";
		this.time += dt;
		const drive = this.drive;
		if (!lure) {
			const want = drive ? Math.max(0, drive.speed) : m === "swim" || m === "turn" ? p.cruise : m === "power" ? p.burst : 0;
			const bl = want / Math.max(L, .05);
			const inter = p.glide * (1 - smooth(bl, 1, 2.5));
			let target = want;
			let accel = 1.5;
			if (inter < .05) {
				this.thrust += (1 - this.thrust) * Math.min(1, dt * 4);
				this.intent = want;
			} else {
				this.gaitT -= dt;
				if (this.gaitT <= 0) {
					this.bursting = !this.bursting;
					this.gaitT = this.bursting ? rand(.3, .7) : rand(.3, 1.4) * inter * 2.5;
				}
				if (this.bursting) {
					this.thrust += (1 - this.thrust) * Math.min(1, dt * 8);
					target = want * (1 + inter * 1.5);
					accel = 3;
					this.intent = target;
				} else {
					this.thrust += (.12 - this.thrust) * Math.min(1, dt * 5);
					target = 0;
					accel = .8;
					this.intent = want;
				}
			}
			this.speed += (target - this.speed) * Math.min(1, dt * accel);
			let yawRate = 0;
			if (drive) yawRate = drive.turnRate;
			else if (m === "turn") {
				const k = this.bursting || inter < .05 ? 1 : .15;
				yawRate = .9 * Math.cos(this.time * .45) * k - .3 * this.yaw;
			}
			this.yaw = m === "turn" && !drive ? this.yaw + yawRate * dt : this.yaw * (1 - Math.min(1, dt * 2));
			this.turn += (yawRate - this.turn) * Math.min(1, dt * 5);
		} else {
			this.speed += (0 - this.speed) * Math.min(1, dt * 3);
			this.intent = 0;
			this.yaw *= 1 - Math.min(1, dt * 2);
			this.turn -= this.turn * Math.min(1, dt * 5);
		}
		this.shakeShown = this.shakeAngle;
		this.shakeAmp += ((SHAKE[m] ?? 0) - this.shakeAmp) * Math.min(1, dt * 4);
		const shakeHz = 1.3 / Math.sqrt(Math.max(L, .1));
		this.shakePhase += dt * Math.PI * 2 * shakeHz;
		this.shakeAngle = this.shakeAmp * Math.sin(this.shakePhase);
		let freq;
		let amp;
		let roll = clamp(-this.turn * .35, -.6, .6);
		let exert = 0;
		if (m === "landed") {
			this.flop -= dt;
			if (this.flop <= 0) this.flop = 2.4;
			const vigor = Math.max(.25, this.flop / 2.4);
			freq = 4 + 4 * vigor;
			amp = .12 + .25 * vigor;
			roll = -Math.PI / 2;
		} else if (m === "air") {
			freq = 7 * st.airFreq;
			amp = .3 * st.airAmp;
			roll = Math.sin(this.time * 9) * .7;
		} else if (m === "tired") {
			freq = 1.8;
			amp = .05;
			roll = -1.3;
		} else if (m === "hooked") {
			freq = 4.5;
			amp = .18;
		} else if (m === "bite") {
			freq = 4;
			amp = .11;
		} else {
			const bl = this.speed / Math.max(L, .05);
			freq = (4 * bl + 4) / 3 * (.35 + .65 * this.thrust);
			amp = (.035 + Math.min(bl / 6, 1) * .09) * (.2 + .8 * this.thrust);
			exert = smooth(bl, 3, 6);
		}
		exert *= st.burst;
		this.exert += (exert - this.exert) * Math.min(1, dt * 3);
		freq /= 1 + .8 * this.exert;
		amp *= 1 + .5 * this.exert;
		const lock = m === "bite" || m === "hooked" ? st.tailLock : 0;
		if (lock > 0) {
			freq = THREE.MathUtils.lerp(freq, shakeHz, lock);
			amp *= 1 + .6 * lock;
		}
		this.phase += dt * Math.PI * 2 * freq;
		if (lock > 0) {
			const d = this.shakePhase + st.tailOffset - this.phase;
			this.phase += Math.atan2(Math.sin(d), Math.cos(d)) * lock * Math.min(1, dt * 6);
		}
		const shaking = ON_LINE.has(m);
		const neck = shaking ? this.shakeShown * st.neckFlex : 0;
		const cBend = shaking ? -st.bodyBend * this.shakeShown / Math.max(L, .05) : 0;
		this.mesh.flex(neck, st.neckAt - .1, st.neckAt + .1, cBend, st.recoil, this.exert);
		const flow = lure ? 1 : Math.min(1, this.speed / Math.max(L, .05) / 3);
		this.finClock += dt * (1 + .6 * flow);
		const flag = p.finFlag * st.flag * (.6 + .7 * flow);
		this.mesh.flutter(this.finClock, p.finFlutter * st.flutter * (1 + .4 * flow), flag, this.seed % 1);
		const muscle = p.finMove * st.finMove;
		if (dt > 0) {
			const d = lure ? 0 : Math.max(0, (this.prevSpeed - this.speed) / dt) / Math.max(L, .05);
			this.decel += (d - this.decel) * Math.min(1, dt * 6);
			this.prevSpeed = this.speed;
		}
		const plan = this.crafted ? this.craftedPlan(m) : this.finPlan(m);
		this.finFold += (plan.fold - this.finFold) * Math.min(1, dt * 3);
		let steer = lure ? 0 : clamp(this.turn * .3, -.35, .35);
		let pect = .6 * (.25 - .15 * this.finFold + Math.min(.3, this.decel * .1));
		let whim = st.finWhim;
		if (this.crafted) {
			steer = lure ? 0 : clamp(-this.turn * .12, -.2, .2);
			this.finPect += (plan.pect - this.finPect) * Math.min(1, dt * 4);
			pect = this.finPect;
			whim = plan.whim;
		}
		const m1 = Math.min(1, muscle);
		if (m === "range") {
			const s = .5 - .5 * Math.cos(this.time * Math.PI * .5);
			this.mesh.finMove(this.finClock, .4 * s, 1 - s, 0, 0, -.6 + 1.02 * s, 0);
			this.mesh.gill(GILL_MAX * s);
			this.mesh.mouth(this.mesh.mouthMax * s);
		} else {
			this.mesh.finMove(this.finClock, plan.sway * muscle, this.finFold * m1, steer * muscle, plan.wobble * m1, pect * muscle, whim * m1);
			this.gillPhase += dt * Math.PI * 2 * BREATH_HZ;
			const gill = GILL_MAX * (.5 - .5 * Math.cos(this.gillPhase));
			const mouth = .6 * (this.mesh.mouthMax || .35) * (.5 - .5 * Math.cos(this.gillPhase + 1.4));
			this.mouthOpen += (mouth - this.mouthOpen) * Math.min(1, dt * 12);
			const aloft = m === "air";
			this.mesh.gill(gill * st.gill * (aloft ? st.airGill : 1));
			this.mesh.mouth(this.mouthOpen * st.mouth * (aloft ? st.airMouth : 1));
		}
		this.mesh.lookAtViewer(m === "air" || m === "landed" ? this.gaze.update(dt) : 0);
		let bend = -this.turn / Math.max(this.speed, .15, .5 * L);
		const most = p.maxBend / (.325 * .65 * L);
		bend = clamp(bend, -most, most);
		this.mesh.swim(this.phase, amp, bend, this.time);
		this.roll += (roll - this.roll) * Math.min(1, dt * 4);
		this.mesh.lieOnFloor(m === "landed" ? -Math.sin(this.roll) : 0);
		const bl = Math.max(this.speed, this.intent) / Math.max(L, .05);
		let pitch = lure ? 0 : p.hoverPitch * (1 - smooth(bl, .5, 2));
		if (!lure && p.upright) pitch = Math.max(pitch, p.upright * (1 - smooth(bl, .1, .35)));
		this.pitch += (pitch - this.pitch) * Math.min(1, dt * 1.5);
		const up = m === "air" ? -Math.PI / 2 : 0;
		this.base.slerp(new THREE.Quaternion().setFromAxisAngle(AXIS_X, up), Math.min(1, dt * 6));
		const q = this.body.quaternion;
		q.setFromAxisAngle(AXIS_Y, this.yaw + (shaking ? this.shakeShown : 0)).multiply(this.base);
		q.multiply(new THREE.Quaternion().setFromAxisAngle(AXIS_X, -this.pitch));
		q.multiply(new THREE.Quaternion().setFromAxisAngle(AXIS_Z, this.roll));
	}
	finPlan(m) {
		let r;
		if (m === "landed" || m === "air") r = [
			.3,
			.4,
			.6
		];
		else if (m === "tired") r = [
			.55,
			.08,
			.5
		];
		else if (m === "hooked") r = [
			.3,
			.35,
			.6
		];
		else if (m === "bite") r = [
			.35,
			.25,
			.6
		];
		else {
			const fast = smooth(this.speed / Math.max(this.length, .05), 1.5, 4);
			r = [
				.4 + .35 * fast,
				.2 - .14 * fast,
				.6 - .2 * fast
			];
			r[0] -= Math.min(.4, this.decel * .12) + Math.min(.2, Math.abs(this.turn) * .1);
		}
		return {
			fold: clamp(r[0], 0, 1),
			sway: r[1],
			wobble: r[2]
		};
	}
	craftedPlan(m) {
		let r;
		if (m === "landed" || m === "air") r = [
			.15,
			.2,
			.3,
			.25,
			.15
		];
		else if (m === "tired") r = [
			.35,
			.04,
			.1,
			.1,
			.02
		];
		else if (m === "hooked") r = [
			0,
			.15,
			.2,
			.15,
			.28
		];
		else if (m === "bite") r = [
			.08,
			.1,
			.2,
			.2,
			.15
		];
		else {
			const bl = this.speed / Math.max(this.length, .05);
			const fast = smooth(bl, 2, 5);
			const slow = 1 - smooth(bl, .3, 1.5);
			r = [
				.14 + .46 * fast - .08 * slow,
				.09 - .05 * fast,
				.25 - .1 * fast,
				.2 - .1 * fast,
				.12 + .05 * slow - .24 * fast
			];
			const brake = Math.min(1, this.decel * .3);
			r[0] -= .2 * brake + Math.min(.1, Math.abs(this.turn) * .08);
			r[4] += .2 * brake;
		}
		return {
			fold: clamp(r[0], 0, 1),
			sway: r[1],
			wobble: r[2],
			whim: r[3],
			pect: r[4]
		};
	}
	dispose() {
		this.object.removeFromParent();
		this.object.traverse((o) => {
			const mesh = o;
			if (mesh.isMesh) mesh.material.dispose();
		});
	}
};
function createFish(id, lengthCm) {
	return new FishActor(id, lengthCm);
}
export { FISH, FishActor, MOTIONS, createFish, fishStats, loadFish };
