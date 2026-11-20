// Objects Kit (CC0 1.0): the stones, plants and sand of the aquarium tanks, built here exactly as in the tanks. There is NO glb / FBX model: they could not be made without losing quality.
// With three.js, use this file as-is (see README.md). For any other engine, port this code: README.md "Other engines (porting guide)".
// 石・水草・砂は品質を保ったまま glb や FBX のモデルにはできませんでした。three.js ではこのファイルでそのまま動きます。ほかのエンジンではこのコードを移植してください（README.md）。
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
var Q = {
	maxPixels: 37e5,
	maxRatio: 1.5,
	msaa: 4,
	bloom: true,
	motionBlur: true,
	dofTaps: 64,
	shaftSteps: 20,
	shaftDiv: 2,
	shadowMap: 2048,
	particles: 1,
	meshRes: 1,
	mirrorEvery: 2,
	fishDetail: true,
	shafts: true,
	leanPost: false,
	liveShade: true
};
var ROCKS = [
	{
		id: "r0",
		kind: "crag",
		x: -.38,
		z: -.13,
		yaw: .35,
		rx: .48,
		ry: .32,
		rz: .256,
		seed: 11,
		bury: .12
	},
	{
		id: "r1",
		kind: "slab",
		x: .42,
		z: .06,
		yaw: .25,
		rx: .19,
		ry: .055,
		rz: .12,
		seed: 1,
		bury: .35
	},
	{
		id: "r2",
		kind: "boulder",
		x: .22,
		z: -.13,
		yaw: 1.1,
		rx: .12,
		ry: .09,
		rz: .1,
		seed: 2,
		bury: .3
	},
	{
		id: "r3",
		kind: "block",
		x: .68,
		z: -.15,
		yaw: -.5,
		rx: .08,
		ry: .07,
		rz: .07,
		seed: 3,
		bury: .25
	}
];
var hash3$1 = (x, y, z) => {
	const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
	return s - Math.floor(s);
};
function noise3$1(x, y, z) {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const iz = Math.floor(z);
	const fx = x - ix;
	const fy = y - iy;
	const fz = z - iz;
	const u = fx * fx * (3 - 2 * fx);
	const v = fy * fy * (3 - 2 * fy);
	const w = fz * fz * (3 - 2 * fz);
	const l = (a, b, t) => a + (b - a) * t;
	const c = (dx, dy, dz) => hash3$1(ix + dx, iy + dy, iz + dz);
	return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
var rnd = (seed) => {
	let s = seed * 9301 + 49297;
	return () => {
		s = s * 16807 % 2147483647;
		return s / 2147483647;
	};
};
function relax(g, passes, k) {
	const p = g.attributes.position;
	const idx = g.index;
	const nb = Array.from({ length: p.count }, () => new Set());
	for (let i = 0; i < idx.count; i += 3) {
		const a = idx.getX(i);
		const b = idx.getX(i + 1);
		const c = idx.getX(i + 2);
		nb[a].add(b).add(c);
		nb[b].add(a).add(c);
		nb[c].add(a).add(b);
	}
	const tmp = new Float32Array(p.count * 3);
	for (let pass = 0; pass < passes; pass++) {
		for (let i = 0; i < p.count; i++) {
			let x = 0;
			let y = 0;
			let z = 0;
			for (const j of nb[i]) {
				x += p.getX(j);
				y += p.getY(j);
				z += p.getZ(j);
			}
			const n = nb[i].size || 1;
			tmp[i * 3] = p.getX(i) + (x / n - p.getX(i)) * k;
			tmp[i * 3 + 1] = p.getY(i) + (y / n - p.getY(i)) * k;
			tmp[i * 3 + 2] = p.getZ(i) + (z / n - p.getZ(i)) * k;
		}
		for (let i = 0; i < p.count; i++) p.setXYZ(i, tmp[i * 3], tmp[i * 3 + 1], tmp[i * 3 + 2]);
	}
}
function rockGeometry(r) {
	let g = new THREE.IcosahedronGeometry(1, Math.max(16, Math.round(200 * Q.meshRes * Math.max(r.rx, r.ry, r.rz))));
	g.deleteAttribute("normal");
	g.deleteAttribute("uv");
	g = mergeVertices(g);
	const p = g.attributes.position;
	const R = rnd(r.seed);
	const nCut = {
		crag: 6,
		block: 7,
		boulder: 4,
		slab: 3,
		pebble: 1
	}[r.kind];
	const cuts = [];
	for (let k = 0; k < nCut; k++) {
		const n = new THREE.Vector3(R() * 2 - 1, R() * 1.4 - .35, R() * 2 - 1).normalize();
		cuts.push({
			n,
			d: (r.kind === "block" ? .62 : r.kind === "crag" ? .7 : .78) + R() * .2
		});
	}
	const amp = {
		crag: [
			.42,
			.22,
			.1
		],
		slab: [
			.5,
			.12,
			.08
		],
		boulder: [
			.38,
			.12,
			.07
		],
		block: [
			.2,
			.08,
			.05
		],
		pebble: [
			.18,
			0,
			.04
		]
	}[r.kind];
	const o = R() * 50;
	const v = new THREE.Vector3();
	for (let i = 0; i < p.count; i++) {
		v.fromBufferAttribute(p, i);
		const big = noise3$1(v.x * 1.2 + o, v.y * 1.2, v.z * 1.2) - .5;
		const rn = noise3$1(v.x * 2.6 - o, v.y * 2.6 + 4, v.z * 2.6);
		const ridge = .5 - Math.abs(rn - .5) * 2;
		const mid = noise3$1(v.x * 5.2 + 9, v.y * 5.2 - o, v.z * 5.2) - .5;
		v.multiplyScalar(1 + amp[0] * big + amp[1] * ridge + amp[2] * mid);
		for (const c of cuts) {
			const t = v.dot(c.n);
			if (t > c.d) v.addScaledVector(c.n, c.d - t);
		}
		if (r.kind === "slab" && v.y > 0) v.y = Math.pow(v.y, 1.3) * .95 + v.x * .12 - v.z * .06;
		if (r.kind === "crag" && v.y > 0) {
			const k = 1 - .25 * v.y;
			v.x *= k;
			v.z *= k;
		}
		if (v.y < -.55) v.y = -.55 - (v.y + .55) * .4;
		p.setXYZ(i, v.x * r.rx, v.y * r.ry, v.z * r.rz);
	}
	relax(g, 1, .35);
	g.computeVertexNormals();
	g.computeBoundingBox();
	return g;
}
var ROCK_VIEWS = [
	{
		name: "top",
		dir: new THREE.Vector3(0, 1, 0),
		up: new THREE.Vector3(0, 0, -1)
	},
	{
		name: "front",
		dir: new THREE.Vector3(0, 0, 1),
		up: new THREE.Vector3(0, 1, 0)
	},
	{
		name: "back",
		dir: new THREE.Vector3(0, 0, -1),
		up: new THREE.Vector3(0, 1, 0)
	},
	{
		name: "right",
		dir: new THREE.Vector3(1, 0, 0),
		up: new THREE.Vector3(0, 1, 0)
	},
	{
		name: "left",
		dir: new THREE.Vector3(-1, 0, 0),
		up: new THREE.Vector3(0, 1, 0)
	}
];
function viewWidth(r) {
	const big = Math.max(r.rx, r.rz) * 1.45;
	const tall = r.ry * 1.45;
	return Math.max(2 * big, 2 * tall * 16 / 9) * 1.08;
}
function rockViewCamera(r, v) {
	const W = viewWidth(r);
	const H = W * 9 / 16;
	const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, .01, 4);
	cam.position.copy(v.dir);
	cam.up.copy(v.up);
	cam.lookAt(0, 0, 0);
	cam.updateMatrixWorld(true);
	return cam;
}
function displaceRock(g, r, imgs) {
	const p = g.attributes.position;
	const n = g.attributes.normal;
	const p0 = new Float32Array(p.array);
	const n0 = new Float32Array(n.array);
	g.setAttribute("aP0", new THREE.BufferAttribute(p0, 3));
	g.setAttribute("aN0", new THREE.BufferAttribute(n0, 3));
	const maps = imgs.map((im) => {
		if (!im) return null;
		const cv = document.createElement("canvas");
		cv.width = im.width;
		cv.height = im.height;
		const cx = cv.getContext("2d", { willReadFrequently: true });
		cx.drawImage(im, 0, 0);
		return {
			w: im.width,
			h: im.height,
			d: cx.getImageData(0, 0, im.width, im.height).data
		};
	});
	const mats = ROCK_VIEWS.map((v) => {
		const cam = rockViewCamera(r, v);
		return new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
	});
	const amp = .01 * Math.max(r.rx, r.ry, r.rz);
	const v = new THREE.Vector3();
	const sample = (k, x, y) => {
		const m = maps[k];
		const fx = Math.min(m.w - 1.001, Math.max(0, x * m.w - .5));
		const fy = Math.min(m.h - 1.001, Math.max(0, (1 - y) * m.h - .5));
		const ix = Math.floor(fx);
		const iy = Math.floor(fy);
		const tx = fx - ix;
		const ty = fy - iy;
		let hh = 0;
		let mm = 0;
		for (const [dx, dy, ww] of [
			[
				0,
				0,
				(1 - tx) * (1 - ty)
			],
			[
				1,
				0,
				tx * (1 - ty)
			],
			[
				0,
				1,
				(1 - tx) * ty
			],
			[
				1,
				1,
				tx * ty
			]
		]) {
			const o = ((iy + dy) * m.w + ix + dx) * 4;
			hh += m.d[o] / 255 * ww;
			mm += m.d[o + 1] / 255 * ww;
		}
		return [(hh - .5) * 2 * mm, mm];
	};
	for (let i = 0; i < p.count; i++) {
		const nx = n0[i * 3];
		const ny = n0[i * 3 + 1];
		const nz = n0[i * 3 + 2];
		const w = [
			Math.max(0, ny) ** 3 * 1.4,
			Math.max(0, nz) ** 3 + Math.max(0, -ny) ** 3 * .3,
			Math.max(0, -nz) ** 3 + Math.max(0, -ny) ** 3 * .3,
			Math.max(0, nx) ** 3,
			Math.max(0, -nx) ** 3
		];
		let hs = 0;
		let ws = 0;
		for (let k = 0; k < 5; k++) {
			if (!maps[k] || w[k] < 1e-4) continue;
			v.set(p0[i * 3], p0[i * 3 + 1], p0[i * 3 + 2]).applyMatrix4(mats[k]);
			const [hh, mm] = sample(k, v.x * .5 + .5, v.y * .5 + .5);
			hs += hh * w[k];
			ws += w[k] * mm;
		}
		const h = ws > 1e-4 ? hs / Math.max(ws, 1e-4) : 0;
		p.setXYZ(i, p0[i * 3] + nx * h * amp, p0[i * 3 + 1] + ny * h * amp, p0[i * 3 + 2] + nz * h * amp);
	}
	g.computeVertexNormals();
	g.computeBoundingBox();
	g.computeBoundingSphere();
}
function rockMaterial(r, views, normals, gain, time, caustics = true) {
	const mats = ROCK_VIEWS.map((v) => {
		const cam = rockViewCamera(r, v);
		return new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
	});
	const rights = ROCK_VIEWS.map((v) => new THREE.Vector3().crossVectors(v.up, v.dir).normalize());
	const m = new THREE.MeshStandardMaterial({
		color: 16777215,
		roughness: .92,
		metalness: 0
	});
	m.onBeforeCompile = (sh) => {
		[
			"Top",
			"Front",
			"Back",
			"Right",
			"Left"
		].forEach((n, k) => {
			sh.uniforms["tC" + n] = { value: views[k] };
			sh.uniforms["tN" + n] = { value: normals[k] };
		});
		sh.uniforms.uM = { value: mats };
		sh.uniforms.uR = { value: rights };
		sh.uniforms.uU = { value: ROCK_VIEWS.map((v) => v.up.clone()) };
		sh.uniforms.uGain = { value: gain };
		sh.uniforms.uTime = time;
		sh.uniforms.uCaustic = { value: caustics ? 1 : 0 };
		sh.vertexShader = "attribute vec3 aP0; attribute vec3 aN0;\nvarying vec3 vWr; varying vec3 vP; varying vec3 vNl; varying vec3 vNd; varying vec3 vMX; varying vec3 vMY; varying vec3 vMZ;\n" + sh.vertexShader.replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nvNl = aN0; vNd = objectNormal;\nvMX = normalize(normalMatrix * vec3(1.0, 0.0, 0.0)); vMY = normalize(normalMatrix * vec3(0.0, 1.0, 0.0)); vMZ = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));").replace("#include <begin_vertex>", "#include <begin_vertex>\nvP = aP0;").replace("#include <project_vertex>", "#include <project_vertex>\nvWr = (modelMatrix * vec4(transformed, 1.0)).xyz;");
		sh.fragmentShader = `
      uniform sampler2D tCTop; uniform sampler2D tCFront; uniform sampler2D tCBack; uniform sampler2D tCRight; uniform sampler2D tCLeft;
      uniform sampler2D tNTop; uniform sampler2D tNFront; uniform sampler2D tNBack; uniform sampler2D tNRight; uniform sampler2D tNLeft;
      uniform mat4 uM[5]; uniform vec3 uR[5]; uniform vec3 uU[5]; uniform float uGain; uniform float uTime; uniform float uCaustic; varying vec3 vWr;
      float aqCaustic(vec2 p, float t) {
        float c = 0.0;
        vec2 q = p;
        for (int i = 0; i < 3; i++) {
          q += vec2(sin(q.y * 1.7 + t * 0.6 + float(i)), cos(q.x * 1.9 - t * 0.5 + float(i) * 1.7)) * 0.45;
          c += abs(sin(q.x * 2.2) * cos(q.y * 2.3));
        }
        c /= 3.0;
        return pow(1.0 - c, 5.0);
      }
      
      varying vec3 vP; varying vec3 vNl; varying vec3 vNd; varying vec3 vMX; varying vec3 vMY; varying vec3 vMZ;
      vec3 rockCol; vec3 rockBump;
      void takeView(sampler2D tc, sampler2D tn, int k, float w, inout vec4 acc, inout vec3 bump) {
        vec4 c = uM[k] * vec4(vP, 1.0);
        vec2 uv = c.xy / c.w * 0.5 + 0.5;
        vec3 col = texture2D(tc, uv).rgb;
        float ok = smoothstep(0.0003, 0.002, dot(col, vec3(0.333)));
        float ww = w * ok;
        acc += vec4(col * ww, ww);
        vec3 nm = texture2D(tn, uv).rgb * 2.0 - 1.0;
        bump += (nm.x * uR[k] + nm.y * uU[k]) * ww;
      }
      ` + sh.fragmentShader.replace("#include <map_fragment>", `
          {
            vec3 n = normalize(vNl);
            vec3 a = pow(max(vec3(0.0), n), vec3(3.0));
            vec3 b = pow(max(vec3(0.0), -n), vec3(3.0));
            vec4 acc = vec4(0.0);
            vec3 bump = vec3(0.0);
            takeView(tCTop, tNTop, 0, a.y * 1.4 + 0.0001, acc, bump);
            takeView(tCFront, tNFront, 1, a.z + b.y * 0.3, acc, bump);
            takeView(tCBack, tNBack, 2, b.z + b.y * 0.3, acc, bump);
            takeView(tCRight, tNRight, 3, a.x, acc, bump);
            takeView(tCLeft, tNLeft, 4, b.x, acc, bump);
            rockCol = acc.a > 0.0005 ? acc.rgb / acc.a : vec3(0.02);
            rockBump = acc.a > 0.0005 ? bump / acc.a : vec3(0.0);
            diffuseColor.rgb *= rockCol * uGain * vec3(1.06, 1.0, 0.86);
          }`).replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
          {
            vec3 nl = normalize(normalize(vNd) + rockBump * 0.55);
            normal = normalize(nl.x * vMX + nl.y * vMY + nl.z * vMZ);
          }`).replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          if (uCaustic > 0.5) {
            float up = max(0.0, dot(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz)));
            float k = aqCaustic(vWr.xz * 7.0 + vec2(0.3, 1.7), uTime * 0.55) * 0.6 + aqCaustic(vWr.xz * 13.0 + 3.0, uTime * 0.9) * 0.4;
            totalEmissiveRadiance += diffuseColor.rgb * k * 0.35 * up * up;
          }`);
	};
	m.customProgramCacheKey = () => "aq-rock-lit2";
	return m;
}
var EL = 20 * Math.PI / 180;
var side = (name, azDeg, say) => {
	const a = azDeg * Math.PI / 180;
	const dir = new THREE.Vector3(Math.sin(a) * Math.cos(EL), Math.sin(EL), Math.cos(a) * Math.cos(EL));
	return {
		name,
		dir,
		up: new THREE.Vector3(0, 1, 0).addScaledVector(dir, -dir.y).normalize(),
		say: `seen ${say}, from slightly above (about 20 degrees down)`
	};
};
var STONE_VIEWS = [
	{
		name: "top",
		dir: new THREE.Vector3(0, 1, 0),
		up: new THREE.Vector3(0, 0, -1),
		say: "seen straight down from directly above (its upper side)"
	},
	side("f", 0, "from the front"),
	side("fr", 45, "from the front-right"),
	side("r", 90, "from the right side"),
	side("br", 135, "from the back-right"),
	side("b", 180, "from the back"),
	side("bl", 225, "from the back-left"),
	side("l", 270, "from the left side"),
	side("fl", 315, "from the front-left")
];
var SHOT_W = 1672;
function viewCamera(pos, v) {
	const right = new THREE.Vector3().crossVectors(v.up, v.dir).normalize();
	let x0 = Infinity;
	let x1 = -Infinity;
	let y0 = Infinity;
	let y1 = -Infinity;
	for (let i = 0; i < pos.length; i += 3) {
		const x = pos[i] * right.x + pos[i + 1] * right.y + pos[i + 2] * right.z;
		const y = pos[i] * v.up.x + pos[i + 1] * v.up.y + pos[i + 2] * v.up.z;
		x0 = Math.min(x0, x);
		x1 = Math.max(x1, x);
		y0 = Math.min(y0, y);
		y1 = Math.max(y1, y);
	}
	const W = Math.max(x1 - x0, (y1 - y0) * SHOT_W / 941) * 1.06;
	const H = W * 941 / SHOT_W;
	const cx = (x0 + x1) / 2;
	const cy = (y0 + y1) / 2;
	const cam = new THREE.OrthographicCamera(cx - W / 2, cx + W / 2, cy + H / 2, cy - H / 2, .01, 4);
	cam.position.copy(v.dir).multiplyScalar(2);
	cam.up.copy(v.up);
	cam.lookAt(0, 0, 0);
	cam.updateMatrixWorld(true);
	cam.updateProjectionMatrix();
	return cam;
}
function viewWeights(renderer, g, cams) {
	const p = g.attributes.position;
	const n = g.attributes.normal;
	const N = p.count;
	const DW = 1024;
	const DH = Math.round(DW * 941 / SHOT_W);
	const rt = new THREE.WebGLRenderTarget(DW, DH, {
		type: THREE.FloatType,
		minFilter: THREE.NearestFilter,
		magFilter: THREE.NearestFilter
	});
	const mat = new THREE.ShaderMaterial({
		vertexShader: "varying float vD; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }",
		fragmentShader: "varying float vD; void main(){ gl_FragColor = vec4(vD, 0.0, 0.0, 1.0); }",
		side: THREE.DoubleSide
	});
	const mesh = new THREE.Mesh(g, mat);
	const sc = new THREE.Scene();
	sc.add(mesh);
	const buf = new Float32Array(DW * DH * 4);
	const vis = new Float32Array(N * 9);
	const v = new THREE.Vector3();
	const prevTarget = renderer.getRenderTarget();
	const prevClear = renderer.getClearColor(new THREE.Color());
	const prevAlpha = renderer.getClearAlpha();
	renderer.setClearColor(0, 1);
	cams.forEach((cam, k) => {
		renderer.setRenderTarget(rt);
		renderer.setClearColor(new THREE.Color(100, 0, 0), 1);
		renderer.clear();
		renderer.render(sc, cam);
		renderer.readRenderTargetPixels(rt, 0, 0, DW, DH, buf);
		const dir = STONE_VIEWS[k].dir;
		for (let i = 0; i < N; i++) {
			v.fromBufferAttribute(p, i);
			const depth = v.clone().applyMatrix4(cam.matrixWorldInverse).z * -1;
			v.project(cam);
			const fx = (v.x * .5 + .5) * DW;
			const fy = (v.y * .5 + .5) * DH;
			let far = -Infinity;
			for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
				const ix = Math.min(1023, Math.max(0, Math.floor(fx) + dx));
				const iy = Math.min(575, Math.max(0, Math.floor(fy) + dy));
				far = Math.max(far, buf[(iy * DW + ix) * 4]);
			}
			const hid = Math.min(1, Math.max(0, (depth - far - .004) / .015));
			const facing = Math.max(0, n.getX(i) * dir.x + n.getY(i) * dir.y + n.getZ(i) * dir.z);
			vis[i * 9 + k] = (1 - hid) * facing ** 4 * (k === 0 ? 1.3 : 1);
		}
	});
	renderer.setRenderTarget(prevTarget);
	renderer.setClearColor(prevClear, prevAlpha);
	rt.dispose();
	mat.dispose();
	const w0 = new Float32Array(N * 4);
	const w1 = new Float32Array(N * 4);
	const w2 = new Float32Array(N);
	for (let i = 0; i < N; i++) {
		let s = 0;
		for (let k = 0; k < 9; k++) s += vis[i * 9 + k];
		if (s < 1e-5) {
			for (let k = 0; k < 9; k++) {
				const d = STONE_VIEWS[k].dir;
				vis[i * 9 + k] = Math.max(0, n.getX(i) * d.x + n.getY(i) * d.y + n.getZ(i) * d.z) ** 4 + 1e-4;
			}
			s = 0;
			for (let k = 0; k < 9; k++) s += vis[i * 9 + k];
		}
		for (let k = 0; k < 4; k++) w0[i * 4 + k] = vis[i * 9 + k] / s;
		for (let k = 0; k < 4; k++) w1[i * 4 + k] = vis[i * 9 + 4 + k] / s;
		w2[i] = vis[i * 9 + 8] / s;
	}
	g.setAttribute("aW0", new THREE.BufferAttribute(w0, 4));
	g.setAttribute("aW1", new THREE.BufferAttribute(w1, 4));
	g.setAttribute("aW2", new THREE.BufferAttribute(w2, 1));
	return vis;
}
function displaceStone(g, cams, heights, amp) {
	const p = g.attributes.position;
	const n = g.attributes.normal;
	const N = p.count;
	const p0 = new Float32Array(p.array);
	const n0 = new Float32Array(n.array);
	g.setAttribute("aP0", new THREE.BufferAttribute(p0, 3));
	g.setAttribute("aN0", new THREE.BufferAttribute(n0, 3));
	const w0 = g.attributes.aW0.array;
	const w1 = g.attributes.aW1.array;
	const w2 = g.attributes.aW2.array;
	const v = new THREE.Vector3();
	const sample = (m, x, y) => {
		const fx = Math.min(m.width - 1.001, Math.max(0, x * m.width - .5));
		const fy = Math.min(m.height - 1.001, Math.max(0, (1 - y) * m.height - .5));
		const ix = Math.floor(fx);
		const iy = Math.floor(fy);
		const tx = fx - ix;
		const ty = fy - iy;
		let hh = 0;
		let mm = 0;
		const c = [
			[
				0,
				0,
				(1 - tx) * (1 - ty)
			],
			[
				1,
				0,
				tx * (1 - ty)
			],
			[
				0,
				1,
				(1 - tx) * ty
			],
			[
				1,
				1,
				tx * ty
			]
		];
		for (const [dx, dy, ww] of c) {
			const o = ((iy + dy) * m.width + ix + dx) * 4;
			hh += m.data[o] / 255 * ww;
			mm += m.data[o + 1] / 255 * ww;
		}
		return [(hh - .5) * 2, mm];
	};
	for (let i = 0; i < N; i++) {
		let hs = 0;
		let ws = 0;
		for (let k = 0; k < 9; k++) {
			const w = k < 4 ? w0[i * 4 + k] : k < 8 ? w1[i * 4 + k - 4] : w2[i];
			const m = heights[k];
			if (!m || w < .001) continue;
			v.set(p0[i * 3], p0[i * 3 + 1], p0[i * 3 + 2]).project(cams[k]);
			const [hh, mm] = sample(m, v.x * .5 + .5, v.y * .5 + .5);
			hs += hh * mm * w;
			ws += w * mm;
		}
		const h = ws > .001 ? hs / ws * Math.min(1, ws * 2) : 0;
		p.setXYZ(i, p0[i * 3] + n0[i * 3] * h * amp, p0[i * 3 + 1] + n0[i * 3 + 1] * h * amp, p0[i * 3 + 2] + n0[i * 3 + 2] * h * amp);
	}
	g.computeVertexNormals();
	g.computeBoundingBox();
	g.computeBoundingSphere();
}
function stoneMaterial(cams, color, normal, opts) {
	const mats = cams.map((c) => new THREE.Matrix4().multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse));
	const rights = STONE_VIEWS.map((v) => new THREE.Vector3().crossVectors(v.up, v.dir).normalize());
	const ups = STONE_VIEWS.map((v) => v.up.clone());
	const m = new THREE.MeshStandardMaterial({
		color: 16777215,
		roughness: .9,
		metalness: 0,
		side: THREE.DoubleSide
	});
	m.onBeforeCompile = (sh) => {
		sh.uniforms.tCol = { value: color };
		sh.uniforms.tNrm = { value: normal };
		sh.uniforms.uM = { value: mats };
		sh.uniforms.uR = { value: rights };
		sh.uniforms.uU = { value: ups };
		sh.uniforms.uGain = opts.gain;
		sh.uniforms.uTime = opts.time;
		sh.uniforms.uCaustic = { value: opts.caustics ? 1 : 0 };
		sh.vertexShader = "attribute vec3 aP0; attribute vec3 aN0; attribute vec4 aW0; attribute vec4 aW1; attribute float aW2; attribute float aAO;\nvarying vec3 vP; varying vec3 vWr; varying vec3 vNd; varying vec4 vW0; varying vec4 vW1; varying float vW2; varying float vAO; varying vec3 vMX; varying vec3 vMY; varying vec3 vMZ;\n" + sh.vertexShader.replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nvNd = objectNormal; vW0 = aW0; vW1 = aW1; vW2 = aW2; vAO = aAO;\nvMX = normalize(normalMatrix * vec3(1.0, 0.0, 0.0)); vMY = normalize(normalMatrix * vec3(0.0, 1.0, 0.0)); vMZ = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));").replace("#include <begin_vertex>", "#include <begin_vertex>\nvP = aP0;").replace("#include <project_vertex>", "#include <project_vertex>\nvWr = (modelMatrix * vec4(transformed, 1.0)).xyz;");
		sh.fragmentShader = `
      precision highp sampler2DArray;
      uniform sampler2DArray tCol; uniform sampler2DArray tNrm;
      uniform mat4 uM[9]; uniform vec3 uR[9]; uniform vec3 uU[9]; uniform float uGain; uniform float uTime; uniform float uCaustic;
      varying vec3 vP; varying vec3 vWr; varying vec3 vNd; varying vec4 vW0; varying vec4 vW1; varying float vW2; varying float vAO; varying vec3 vMX; varying vec3 vMY; varying vec3 vMZ;
      vec3 stoneBump;
      float aqCaustic(vec2 p, float t) {
        float c = 0.0;
        vec2 q = p;
        for (int i = 0; i < 3; i++) {
          q += vec2(sin(q.y * 1.7 + t * 0.6 + float(i)), cos(q.x * 1.9 - t * 0.5 + float(i) * 1.7)) * 0.45;
          c += abs(sin(q.x * 2.2) * cos(q.y * 2.3));
        }
        c /= 3.0;
        return pow(1.0 - c, 5.0);
      }
      void takeView(int k, float w, inout vec4 acc, inout vec3 bump) {
        if (w < 0.002) return;
        vec4 c = uM[k] * vec4(vP, 1.0);
        vec2 uv = c.xy / c.w * 0.5 + 0.5;
        vec3 col = texture(tCol, vec3(uv, float(k))).rgb;
        float ok = smoothstep(0.0003, 0.002, dot(col, vec3(0.333)));
        float ww = w * ok;
        acc += vec4(col * ww, ww);
        vec3 nm = texture(tNrm, vec3(uv, float(k))).rgb * 2.0 - 1.0;
        bump += (nm.x * uR[k] + nm.y * uU[k]) * ww;
      }
      ` + sh.fragmentShader.replace("#include <map_fragment>", `
          {
            vec4 acc = vec4(0.0);
            vec3 bump = vec3(0.0);
            takeView(0, vW0.x, acc, bump); takeView(1, vW0.y, acc, bump); takeView(2, vW0.z, acc, bump); takeView(3, vW0.w, acc, bump);
            takeView(4, vW1.x, acc, bump); takeView(5, vW1.y, acc, bump); takeView(6, vW1.z, acc, bump); takeView(7, vW1.w, acc, bump);
            takeView(8, vW2, acc, bump);
            vec3 col = acc.a > 0.0005 ? acc.rgb / acc.a : vec3(0.03);
            stoneBump = acc.a > 0.0005 ? bump / acc.a : vec3(0.0);
            diffuseColor.rgb *= col * uGain;
          }`).replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
          {
            vec3 nl = normalize(normalize(vNd) + stoneBump * 0.55);
            normal = normalize(nl.x * vMX + nl.y * vMY + nl.z * vMZ);
          }`).replace("#include <aomap_fragment>", `#include <aomap_fragment>
          {
            float occ = mix(0.25, 1.0, vAO);
            reflectedLight.indirectDiffuse *= occ;
            reflectedLight.directDiffuse *= mix(1.0, occ, 0.4);
          }`).replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          if (uCaustic > 0.5) {
            float up = max(0.0, dot(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz)));
            float k = aqCaustic(vWr.xz * 7.0 + vec2(0.3, 1.7), uTime * 0.55) * 0.6 + aqCaustic(vWr.xz * 13.0 + 3.0, uTime * 0.9) * 0.4;
            totalEmissiveRadiance += diffuseColor.rgb * k * 0.35 * up * up * vAO;
          }`);
	};
	m.customProgramCacheKey = () => "stone-9view";
	return m;
}
async function unpackStoneQ(gz) {
	const buf = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
	const u8 = new Uint8Array(buf);
	if (String.fromCharCode(...u8.subarray(0, 4)) !== "STQ1") throw new Error("石の軽い版の形ではない");
	const dv = new DataView(buf);
	const n = dv.getUint32(4, true);
	const ni = dv.getUint32(8, true);
	const lo = [
		0,
		1,
		2
	].map((k) => dv.getFloat32(12 + k * 4, true));
	const hi = [
		0,
		1,
		2
	].map((k) => dv.getFloat32(24 + k * 4, true));
	let o = 36;
	const pos = new Float32Array(n * 3);
	for (let k = 0; k < 3; k++) {
		let q = 0;
		const s = (hi[k] - lo[k]) / 65535;
		for (let i = 0; i < n; i++) {
			const j = k * n + i;
			q = q + (u8[o + j] | u8[o + 3 * n + j] << 8) & 65535;
			pos[i * 3 + k] = lo[k] + q * s;
		}
	}
	o += 6 * n;
	const ao = new Float32Array(n);
	for (let i = 0; i < n; i++) ao[i] = u8[o + i] / 255;
	o += n;
	const index = new Uint32Array(ni);
	let q = 0;
	for (let i = 0; i < ni; i++) {
		q = q + (u8[o + i] | u8[o + ni + i] << 8) & 65535;
		index[i] = q;
	}
	return {
		pos,
		index,
		ao
	};
}
function stoneGeometry(m) {
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.BufferAttribute(m.pos.slice(), 3));
	g.setAttribute("aAO", new THREE.BufferAttribute(m.ao, 1));
	g.setIndex(new THREE.BufferAttribute(m.index, 1));
	g.computeVertexNormals();
	g.computeBoundingBox();
	g.computeBoundingSphere();
	return g;
}
var sword_leaf_default = {
	wr: .22,
	s: [
		0,
		.04,
		.1,
		.18,
		.28,
		.4,
		.52,
		.64,
		.75,
		.84,
		.91,
		.96,
		1
	],
	hw: [
		.07,
		.2,
		.45,
		.72,
		.92,
		1,
		.96,
		.84,
		.66,
		.47,
		.28,
		.12,
		0
	],
	stub: .04,
	texture: {
		"w": 1024,
		"h": 1536,
		"y0": -.07,
		"y1": 1.03
	}
};
function rng(seed) {
	let a = seed >>> 0 || 1;
	const f = () => {
		a = a + 1831565813 >>> 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
	return Object.assign(f, {
		range: (lo, hi) => lo + (hi - lo) * f(),
		tri: () => f() + f() - 1
	});
}
function hash3(x, y, z) {
	let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647);
	h = Math.imul(h ^ h >>> 13, 1274126177);
	return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
function noise3(x, y, z) {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const iz = Math.floor(z);
	const fx = x - ix;
	const fy = y - iy;
	const fz = z - iz;
	const sx = fx * fx * (3 - 2 * fx);
	const sy = fy * fy * (3 - 2 * fy);
	const sz = fz * fz * (3 - 2 * fz);
	const l = (a, b, t) => a + (b - a) * t;
	const c = (dx, dy, dz) => hash3(ix + dx, iy + dy, iz + dz);
	return l(l(l(c(0, 0, 0), c(1, 0, 0), sx), l(c(0, 1, 0), c(1, 1, 0), sx), sy), l(l(c(0, 0, 1), c(1, 0, 1), sx), l(c(0, 1, 1), c(1, 1, 1), sx), sy), sz);
}
function fbm3(x, y, z, oct = 3) {
	let s = 0;
	let a = .5;
	let n = 0;
	for (let i = 0; i < oct; i++) {
		s += noise3(x, y, z) * a;
		n += a;
		a *= .5;
		x *= 2.03;
		y *= 2.03;
		z *= 2.03;
	}
	return s / n;
}
function perp(d) {
	const a = Math.abs(d.y) < .9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
	return new THREE.Vector3().crossVectors(d, a).normalize();
}
var TubeBuilder = class {
	pos = [];
	nrm = [];
	col = [];
	sway = [];
	uv = [];
	ao = [];
	idx = [];
	add(pts, rad, col, sway, sides = 6, capEnd = true, colAt) {
		const n = pts.length;
		if (n < 2) return;
		const base = this.pos.length / 3;
		const T = [];
		for (let i = 0; i < n; i++) {
			const a = pts[Math.max(0, i - 1)];
			const b = pts[Math.min(n - 1, i + 1)];
			T.push(b.clone().sub(a).normalize());
		}
		let N = perp(T[0]);
		const tmp = new THREE.Vector3();
		let len = 0;
		for (let i = 0; i < n; i++) {
			if (i > 0) {
				N = N.clone().addScaledVector(T[i], -N.dot(T[i])).normalize();
				len += pts[i].distanceTo(pts[i - 1]);
			}
			const B = tmp.crossVectors(T[i], N).clone();
			for (let k = 0; k <= sides; k++) {
				const a = k / sides * Math.PI * 2;
				const dx = Math.cos(a);
				const dy = Math.sin(a);
				const nx = N.x * dx + B.x * dy;
				const ny = N.y * dx + B.y * dy;
				const nz = N.z * dx + B.z * dy;
				this.pos.push(pts[i].x + nx * rad[i], pts[i].y + ny * rad[i], pts[i].z + nz * rad[i]);
				this.nrm.push(nx, ny, nz);
				const cc = colAt ? colAt(i, new THREE.Vector3(pts[i].x + nx * rad[i], pts[i].y + ny * rad[i], pts[i].z + nz * rad[i]), col[i]) : col[i];
				this.col.push(cc.r, cc.g, cc.b);
				this.sway.push(sway[i]);
				this.uv.push(k / sides, len);
				this.ao.push(1);
			}
		}
		const ring = sides + 1;
		for (let i = 0; i < n - 1; i++) for (let k = 0; k < sides; k++) {
			const a = base + i * ring + k;
			const b = a + ring;
			this.idx.push(a, b, a + 1, b, b + 1, a + 1);
		}
		if (capEnd) {
			const tip = this.pos.length / 3;
			const p = pts[n - 1].clone().addScaledVector(T[n - 1], rad[n - 1] * .8);
			this.pos.push(p.x, p.y, p.z);
			this.nrm.push(T[n - 1].x, T[n - 1].y, T[n - 1].z);
			this.col.push(col[n - 1].r, col[n - 1].g, col[n - 1].b);
			this.sway.push(sway[n - 1]);
			this.uv.push(.5, len);
			this.ao.push(1);
			const last = base + (n - 1) * ring;
			for (let k = 0; k < sides; k++) this.idx.push(last + k, tip, last + k + 1);
		}
	}
	geometry() {
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
		g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nrm, 3));
		g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
		g.setAttribute("aSway", new THREE.Float32BufferAttribute(this.sway, 1));
		g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
		g.setAttribute("aAO", new THREE.Float32BufferAttribute(this.ao, 1));
		g.setIndex(this.idx);
		g.computeBoundingSphere();
		return g;
	}
};
var PUSH_GLSL = `
{
  vec3 acc = texture2D(uLeafBend, vec2((aLeafId + 0.5) / uLeafCount, 0.5)).xyz * pow(aBase.w, 1.5);
  float give = 0.10 * clamp(aSway / 0.6, 0.0, 1.0);
  float al = length(acc);
  if (al > give) acc *= give / max(al, 1e-6);
  transformed += inverse(mat3(modelMatrix)) * acc;
}
`;
var LEAF_VAR = `
float lvhash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float lvnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 w = f * f * (3.0 - 2.0 * f);
  return mix(mix(lvhash(i), lvhash(i + vec2(1.0, 0.0)), w.x), mix(lvhash(i + vec2(0.0, 1.0)), lvhash(i + vec2(1.0, 1.0)), w.x), w.y);
}
float lvfbm(vec2 p) { return lvnoise(p) * 0.5 + lvnoise(p * 2.07 + 3.1) * 0.3 + lvnoise(p * 4.3 + 7.7) * 0.2; }
void leafVariation(vec2 lu, inout vec3 c, out float speck, out float dust) {
  speck = 0.0; dust = 0.0;
  float sd = vLeaf.x * 31.7;
  float age = vLeaf.y;
  float top = vBack < 0.25 ? 1.0 : 0.0;
  c *= 0.86 + 0.28 * lvfbm(lu * vec2(2.2, 3.4) + sd);
  c *= 0.92 + 0.16 * lvfbm(lu * vec2(10.0, 15.0) + sd * 1.3);
  float yel = smoothstep(0.55, 0.85, lvfbm(lu * vec2(3.0, 4.5) + sd + 9.0)) * (0.2 + 0.7 * age);
  c = mix(c, c * vec3(1.4, 1.18, 0.5), yel * 0.5);
  float rim = smoothstep(0.8, 1.0, vLeaf.z);
  c = mix(c, c * vec3(1.15, 1.1, 0.8), rim * 0.3);
  float brown = smoothstep(0.85, 1.0, vLeaf.z) * smoothstep(0.62, 0.85, lvfbm(lu * vec2(4.0, 6.0) + sd + 3.0)) * smoothstep(0.6, 1.0, age);
  c = mix(c, c * vec3(0.75, 0.6, 0.35), brown * 0.6);
  dust = smoothstep(0.58, 0.9, lvfbm(lu * vec2(4.0, 6.5) + sd + 21.0)) * (0.25 + 0.75 * age) * top;
  c = mix(c, vec3(0.05, 0.04, 0.022), dust * 0.4);
  vec2 cell = lu * vec2(120.0, 190.0);
  vec2 ci = floor(cell);
  float sp = lvhash(ci + sd);
  vec2 cc = vec2(lvhash(ci + sd + 1.7), lvhash(ci + sd + 4.1)) * 0.6 + 0.2;
  float rad = 0.12 + 0.18 * lvhash(ci + sd + 8.3);
  speck = step(1.0 - 0.006 - 0.025 * age, sp) * (1.0 - smoothstep(rad * 0.6, rad, length(fract(cell) - cc))) * top;
#ifdef LV_NO_SPECK
  speck = 0.0;
#endif
  c = mix(c, vec3(0.025, 0.03, 0.015), speck * 0.8);
  if (vBack > 0.25 && vBack < 0.75) c *= vec3(1.1, 1.14, 0.95);
}
`;
function plantMaterial(u, o) {
	const params = {
		color: 16777215,
		map: o.map ?? null,
		normalMap: o.normal ?? null,
		roughness: o.roughness ?? .55,
		metalness: 0,
		vertexColors: true,
		side: o.thickLeaf ? THREE.FrontSide : THREE.DoubleSide,
		alphaTest: o.alpha ? .5 : 0,
		alphaToCoverage: !!o.alpha
	};
	const m = new THREE.MeshPhysicalMaterial({
		...params,
		specularIntensity: o.specular ?? .5,
		clearcoat: o.clearcoat ?? 0,
		clearcoatRoughness: o.clearcoatRoughness ?? .3
	});
	if (o.normal) m.normalScale.setScalar(o.normalScale ?? .8);
	if (o.thickLeaf) m.shadowSide = THREE.BackSide;
	const trans = o.trans ?? .6;
	const swayAmp = o.swayAmp ?? 1;
	const back = o.back ?? 0;
	const thick = !!o.thickLeaf;
	const push = !!(o.push && u.push);
	const lit = o.lit && o.map ? o.lit : null;
	const litU = lit ? {
		uTransMap: { value: lit.trans },
		uThrough: { value: lit.through },
		uWrap: { value: lit.wrap },
		uGlow: { value: lit.glow },
		uVar: { value: lit.variation },
		uVeins: { value: lit.veins }
	} : null;
	if (litU) m.userData.lit = litU;
	m.onBeforeCompile = (sh) => {
		if (litU) Object.assign(sh.uniforms, litU);
		if (push) {
			sh.uniforms.uLeafBend = u.push.tex;
			sh.uniforms.uLeafCount = u.push.count;
		}
		sh.uniforms.uTime = u.time;
		sh.uniforms.uGain = u.gain;
		sh.uniforms.uSway = u.sway;
		sh.uniforms.uTrans = { value: trans };
		sh.uniforms.uBack = { value: back };
		sh.vertexShader = "attribute float aSway; attribute float aAO; uniform float uTime; uniform float uSway; varying vec3 vWp; varying float vAO;\n" + (thick ? "attribute float aBack; attribute vec3 aLeaf; varying float vBack; varying vec3 vLeaf;\n" : "") + (push ? "attribute vec4 aBase; attribute float aLeafId; uniform sampler2D uLeafBend; uniform float uLeafCount;\n" : "") + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
          vAO = aAO;
          ${thick ? "vBack = aBack; vLeaf = aLeaf;" : ""}
          ${push ? PUSH_GLSL : ""}
          vec3 swayOff = vec3(0.0);
          {
            vec3 wp0 = (modelMatrix * vec4(position, 1.0)).xyz;
            float ph = wp0.x * 4.0 + wp0.z * 3.0;
            float w = aSway * uSway * ${swayAmp.toFixed(3)};
            vec3 sw = vec3(sin(uTime * 0.9 + ph) * 0.6 + sin(uTime * 2.1 + ph * 2.3 + wp0.y * 9.0) * 0.25,
                           sin(uTime * 1.3 + ph * 1.7) * 0.15,
                           cos(uTime * 0.7 + ph * 1.3) * 0.45 + sin(uTime * 1.9 + wp0.y * 7.0) * 0.2);
            swayOff = (inverse(mat3(modelMatrix)) * sw) * w * 0.012;
            transformed += swayOff;
          }`).replace("#include <project_vertex>", "#include <project_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;\ntransformed -= swayOff;");
		sh.fragmentShader = "uniform float uGain; uniform float uTrans; uniform float uBack; varying vec3 vWp; varying float vAO;\n" + (lit ? `#define LEAF_LIT\nuniform sampler2D uTransMap; uniform float uThrough; uniform float uWrap; uniform float uGlow; uniform float uVar; uniform float uVeins; vec3 gTransCol = vec3(0.0);\n` : "") + (thick ? (o.noSpecks ? "#define LV_NO_SPECK\n" : "") + "varying float vBack; varying vec3 vLeaf;\n" + LEAF_VAR : "") + sh.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
          diffuseColor.rgb *= uGain;
          float leafSpeck = 0.0;
          float leafDust = 0.0;
          ${thick && o.map ? lit ? `{
            vec3 tr = texture2D(uTransMap, vMapUv).rgb;
            float lc = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
            float lt = dot(tr, vec3(0.2126, 0.7152, 0.0722));
            vec3 c0 = mix(diffuseColor.rgb, tr * diffuse * uGain * (lc / max(lt * dot(diffuse * uGain, vec3(0.2126, 0.7152, 0.0722)), 1e-3)), uVeins);
            diffuseColor.rgb = c0;
            leafVariation(vMapUv, diffuseColor.rgb, leafSpeck, leafDust);
            vec3 ratio = mix(vec3(1.0), diffuseColor.rgb / max(c0, vec3(1e-4)), uVar);
            ratio *= 1.0 - 0.22 * smoothstep(0.65, 1.0, vLeaf.z);
            diffuseColor.rgb = c0 * ratio;
            gTransCol = tr * ratio * uGain * diffuse;
          }` : "leafVariation(vMapUv, diffuseColor.rgb, leafSpeck, leafDust);" : ""}
          if (${thick ? "vBack > 0.75" : "!gl_FrontFacing"} && uBack > 0.0) {
            float lb = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
            vec3 pale = mix(vec3(lb), diffuseColor.rgb, 0.6) * 1.7 + vec3(0.006, 0.01, 0.004);
            diffuseColor.rgb = mix(diffuseColor.rgb, pale, uBack);
          }`).replace("#include <roughnessmap_fragment>", thick && o.map ? `#include <roughnessmap_fragment>
          roughnessFactor = clamp(roughnessFactor * (0.7 + 0.7 * lvfbm(vMapUv * vec2(4.0, 6.0) + vLeaf.x * 5.0)) + leafSpeck * 0.4 + leafDust * 0.35, 0.08, 1.0);` : "#include <roughnessmap_fragment>").replace("#include <aomap_fragment>", `#include <aomap_fragment>
          reflectedLight.indirectDiffuse *= vAO;
          reflectedLight.indirectSpecular *= vAO * vAO;
          reflectedLight.directDiffuse *= mix(1.0, vAO, 0.2);
          reflectedLight.directSpecular *= mix(1.0, vAO, 0.5);
          #ifdef LEAF_LIT
          totalEmissiveRadiance += gTransCol * uGlow * mix(0.35, 1.0, vAO);
          #endif`).replace("#include <lights_physical_pars_fragment>", `#include <lights_physical_pars_fragment>
          void RE_Direct_Leaf( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
            RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
            #ifdef LEAF_LIT
            {
              float nl = dot( geometryNormal, directLight.direction );
              float wrapped = saturate( ( nl + uWrap ) / ( 1.0 + uWrap ) );
              reflectedLight.directDiffuse += directLight.color * ( wrapped - saturate( nl ) ) * BRDF_Lambert( material.diffuseColor );
              float bk = saturate( -nl );
              float vw = 0.6 + 0.4 * pow( saturate( dot( geometryViewDir, -directLight.direction ) ), 2.0 );
              reflectedLight.directDiffuse += directLight.color * bk * vw * uThrough * gTransCol * RECIPROCAL_PI;
              return;
            }
            #endif
            float back = saturate( -dot( geometryNormal, directLight.direction ) );
            float view = 0.4 + 0.6 * pow( saturate( dot( geometryViewDir, -directLight.direction ) ), 2.0 );
            vec3 tc = material.diffuseColor * material.diffuseColor * 2.2 + material.diffuseColor * 0.15;
            reflectedLight.directDiffuse += directLight.color * back * view * uTrans * tc;
          }
          #undef RE_Direct
          #define RE_Direct RE_Direct_Leaf`);
	};
	m.customProgramCacheKey = () => `plants-${o.key ?? "x"}-${o.map ? 1 : 0}${o.normal ? 1 : 0}${o.alpha ? 1 : 0}${o.clearcoat ? 1 : 0}${thick ? 1 : 0}${o.noSpecks ? 1 : 0}-${trans}-${swayAmp}-${back}-${o.specular ?? .5}-${push ? 1 : 0}-${lit ? "lit" : ""}`;
	return m;
}
var anubias_leaf_default = {
	wr: .66,
	insertion: [0, .03],
	samples: 120,
	right: [
		[0, 1],
		[.012, .976],
		[.032, .94],
		[.068, .89],
		[.14, .8],
		[.225, .685],
		[.288, .555],
		[.326, .415],
		[.33, .28],
		[.302, .15],
		[.25, .045],
		[.18, -.032],
		[.108, -.068],
		[.05, -.064],
		[.016, -.036],
		[0, -.012]
	],
	texture: {
		"w": 1024,
		"h": 1536,
		"y0": -.1,
		"y1": 1.02
	}
};
THREE.MathUtils.degToRad;
THREE.MathUtils.smoothstep;
function catmull(a, b, c, d, t) {
	const t2 = t * t;
	const t3 = t2 * t;
	const f = (p0, p1, p2, p3) => .5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
	return [f(a[0], b[0], c[0], d[0]), f(a[1], b[1], c[1], d[1])];
}
function leafOutline(wr = anubias_leaf_default.wr, asym = 0, n = anubias_leaf_default.samples) {
	const sx = wr / anubias_leaf_default.wr;
	const R = anubias_leaf_default.right.map(([x, y]) => [x * sx * (1 + asym), y]);
	const Lf = anubias_leaf_default.right.slice(1, -1).reverse().map(([x, y]) => [-x * sx * (1 - asym), y]);
	const loop = [...R, ...Lf];
	const m = loop.length;
	const dense = [];
	for (let i = 0; i < m; i++) for (let k = 0; k < 24; k++) dense.push(catmull(loop[(i - 1 + m) % m], loop[i], loop[(i + 1) % m], loop[(i + 2) % m], k / 24));
	const cum = [0];
	for (let i = 1; i <= dense.length; i++) {
		const a = dense[i - 1];
		const b = dense[i % dense.length];
		cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
	}
	const total = cum[dense.length];
	const out = [];
	let s = 0;
	for (let k = 0; k < n; k++) {
		const target = k / n * total;
		while (cum[s + 1] < target) s++;
		const a = dense[s];
		const b = dense[(s + 1) % dense.length];
		const t = (target - cum[s]) / Math.max(1e-9, cum[s + 1] - cum[s]);
		out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
	}
	return out;
}
function templateUV$1([x, y]) {
	const T = anubias_leaf_default.texture;
	const sc = T.h / (T.y1 - T.y0);
	return [(T.w / 2 + x * sc) / T.w, (y - T.y0) * sc / T.h];
}
leafOutline(anubias_leaf_default.wr, 0).map(templateUV$1);
templateUV$1(anubias_leaf_default.insertion);
var S_ = (o) => ({
	face: [.7, .7],
	roll: 0,
	wr: anubias_leaf_default.wr,
	asym: 0,
	fold: 18,
	droop: 22,
	twist: 0,
	curl: .012,
	wave: .006,
	lobe: .02,
	kind: 1,
	...o
});
S_({
	f: .42,
	side: -1,
	az: -58,
	p0: 32,
	p1: 14,
	len: .03,
	bAz: -72,
	bEl: 28,
	face: [.75, .65],
	L: .062,
	wr: .7,
	asym: .04,
	fold: 16,
	droop: 24,
	twist: 6,
	kind: 2
}), S_({
	f: .56,
	side: -1,
	az: 12,
	p0: 14,
	p1: 4,
	len: .036,
	bAz: 14,
	bEl: 60,
	face: [1, .25],
	roll: -6,
	L: .064,
	wr: .62,
	asym: -.05,
	fold: 20,
	droop: 30,
	twist: -8,
	kind: 1
}), S_({
	f: .34,
	side: 1,
	az: -48,
	p0: 62,
	p1: 52,
	len: .022,
	bAz: -62,
	bEl: -24,
	face: [.85, .55],
	L: .056,
	wr: .72,
	asym: .03,
	fold: 14,
	droop: 18,
	twist: 10,
	kind: 3
}), S_({
	f: .28,
	side: -1,
	az: -30,
	p0: 68,
	p1: 58,
	len: .016,
	bAz: -42,
	bEl: 4,
	face: [.35, 1],
	L: .036,
	wr: .68,
	fold: 14,
	droop: 14,
	kind: 3
}), S_({
	f: .62,
	side: 1,
	az: 26,
	p0: 46,
	p1: 38,
	len: .02,
	bAz: 30,
	bEl: 4,
	face: [1, .35],
	L: .044,
	wr: .7,
	asym: .05,
	fold: 22,
	droop: 20,
	twist: -6,
	kind: 2
}), S_({
	f: .8,
	side: -1,
	az: 22,
	p0: 22,
	p1: 10,
	len: .03,
	bAz: 34,
	bEl: 44,
	face: [.85, .5],
	L: .046,
	wr: .6,
	fold: 30,
	droop: 14,
	twist: 4,
	kind: 0
}), S_({
	f: .86,
	side: 1,
	az: 70,
	p0: 40,
	p1: 22,
	len: .034,
	bAz: 80,
	bEl: 20,
	face: [.8, .6],
	L: .058,
	wr: .64,
	asym: -.04,
	fold: 16,
	droop: 22,
	twist: -5,
	kind: 1
}), S_({
	f: .72,
	side: -1,
	az: 40,
	p0: 20,
	p1: 10,
	len: .034,
	bAz: 52,
	bEl: 34,
	face: [.6, .8],
	L: .046,
	wr: .7,
	fold: 22,
	droop: 22,
	kind: 2
}), S_({
	f: .97,
	side: 1,
	az: 55,
	p0: 14,
	p1: 8,
	len: .011,
	bAz: 58,
	bEl: 70,
	face: [.9, .4],
	L: .022,
	wr: .56,
	fold: 58,
	droop: 8,
	curl: 0,
	wave: 0,
	lobe: 0,
	kind: 0
});
new THREE.Vector3(1, 0, 0);
new THREE.Vector3(0, 1, 0);
new THREE.Vector3(0, 0, 1);
function clumpAO(lg, disks, others) {
	const p = lg.attributes.position;
	const n = lg.attributes.normal;
	const D = disks.map((d) => {
		const c = new THREE.Vector3();
		const nn = new THREE.Vector3();
		for (let i = d.start; i < d.end; i++) {
			c.x += p.getX(i);
			c.y += p.getY(i);
			c.z += p.getZ(i);
			nn.x += n.getX(i);
			nn.y += n.getY(i);
			nn.z += n.getZ(i);
		}
		return {
			...d,
			c: c.multiplyScalar(1 / (d.end - d.start)),
			n: nn.normalize()
		};
	});
	const shade = (g, owner, floor) => {
		const P = g.attributes.position;
		const Nn = g.attributes.normal;
		const ao = g.attributes.aAO;
		const v = new THREE.Vector3();
		const nr = new THREE.Vector3();
		const d = new THREE.Vector3();
		for (let i = 0; i < P.count; i++) {
			v.fromBufferAttribute(P, i);
			nr.fromBufferAttribute(Nn, i);
			const me = owner(i);
			let occ = 0;
			D.forEach((dk, k) => {
				if (k === me) return;
				d.subVectors(dk.c, v);
				const L2 = d.lengthSq() + 1e-6;
				d.multiplyScalar(1 / Math.sqrt(L2));
				const cr = Math.max(0, d.dot(nr)) * .6 + Math.max(0, d.y) * .4;
				occ += dk.area * cr * (.3 + .7 * Math.abs(dk.n.dot(d))) / (Math.PI * L2 + dk.area);
			});
			ao.setX(i, Math.max(floor, 1 - occ));
		}
		ao.needsUpdate = true;
	};
	const own = new Int32Array(p.count).fill(-1);
	D.forEach((dk, k) => {
		for (let i = dk.start; i < dk.end; i++) own[i] = k;
	});
	shade(lg, (i) => own[i], .35);
	for (const g of others) shade(g, () => -1, .6);
}
var srgb = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
var deg = THREE.MathUtils.degToRad;
var sstep = THREE.MathUtils.smoothstep;
var GOLDEN = Math.PI * (3 - Math.sqrt(5));
function swordHalfWidth(s) {
	const S = sword_leaf_default.s;
	const H = sword_leaf_default.hw;
	if (s <= 0) return H[0];
	if (s >= 1) return 0;
	let i = 0;
	while (i < S.length - 2 && S[i + 1] < s) i++;
	const t = (s - S[i]) / (S[i + 1] - S[i]);
	const p0 = H[Math.max(0, i - 1)];
	const p1 = H[i];
	const p2 = H[i + 1];
	const p3 = H[Math.min(H.length - 1, i + 2)];
	const t2 = t * t;
	const t3 = t2 * t;
	return Math.max(0, .5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3));
}
function templateUV(s, a) {
	const T = sword_leaf_default.texture;
	const sc = T.h / (T.y1 - T.y0);
	const x = a * swordHalfWidth(Math.max(0, s)) * (sword_leaf_default.wr / 2);
	return [(T.w / 2 + x * sc) / T.w, (s - T.y0) * sc / T.h];
}
var SwordLeaves = class {
	pos = [];
	uv = [];
	col = [];
	sway = [];
	ao = [];
	back = [];
	leaf = [];
	base = [];
	leafId = [];
	leaves = [];
	idx = [];
	disks = [];
	add(o) {
		const R = Math.round(96 * Q.meshRes);
		const C = 2 * Math.round(9 * Q.meshRes);
		const L = o.L;
		const maxHW = o.wr / 2 * L;
		const s0 = -sword_leaf_default.stub;
		const X = new THREE.Vector3().crossVectors(o.Y, o.Z).normalize();
		const Y = o.Y.clone().normalize();
		const Z = new THREE.Vector3().crossVectors(X, Y).normalize();
		const p = o.base.clone().addScaledVector(Y, s0 * L);
		const frames = [];
		const ang = (s) => ({
			a: deg(o.droop) * Math.pow(Math.max(0, s), o.droopPow) + deg(o.open) * sstep(s, s0, .12),
			b: deg(o.side) * Math.sin(Math.PI * Math.max(0, s)),
			t: deg(o.twist) * Math.max(0, s)
		});
		for (let i = 0; i <= R; i++) {
			const s = s0 + (1 - s0) * i / R;
			if (i > 0) {
				const sp = s0 + (1 - s0) * (i - 1) / R;
				const A = ang(s);
				const B = ang(sp);
				const q1 = new THREE.Quaternion().setFromAxisAngle(X, -(A.a - B.a));
				const q2 = new THREE.Quaternion().setFromAxisAngle(Z, A.b - B.b);
				const q3 = new THREE.Quaternion().setFromAxisAngle(Y, A.t - B.t);
				for (const q of [
					q1,
					q2,
					q3
				]) {
					X.applyQuaternion(q);
					Y.applyQuaternion(q);
					Z.applyQuaternion(q);
				}
				p.addScaledVector(Y, (1 - s0) * L / R);
			}
			frames.push({
				p: p.clone(),
				X: X.clone(),
				Y: Y.clone(),
				Z: Z.clone(),
				s
			});
		}
		const sp = [
			.3,
			.55,
			.8,
			1
		].flatMap((t) => {
			const f = frames[Math.round((t - s0) / (1 - s0) * R)].p;
			return [
				f.x,
				f.y,
				f.z
			];
		});
		const top = [];
		const meta = [];
		for (let i = 0; i <= R; i++) {
			const f = frames[i];
			const s = f.s;
			const sn = Math.max(0, s);
			const hw = swordHalfWidth(s) * maxHW;
			const inBlade = sstep(s, 0, .08);
			for (let j = 0; j <= C; j++) {
				const a = -1 + 2 * j / C;
				const aa = Math.abs(a);
				const x = a * hw;
				const sideSgn = a < 0 ? 0 : 1;
				let z = 0;
				z += Math.abs(x) * Math.tan(deg(o.fold) * (1 - .5 * sn));
				z += o.waveA * hw * Math.sin(2 * Math.PI * sn / o.waveL + o.waveP + sideSgn * o.waveLR) * Math.pow(aa, 1.2) * inBlade;
				z += o.edgeA * hw * Math.sin(2 * Math.PI * sn / o.edgeL + o.seed * 9 + sideSgn * 2.3) * Math.pow(aa, 3) * inBlade;
				const vein = Math.cos(2 * Math.PI * aa * 2.5);
				const bumps = (fbm3(sn * L * 70 + o.seed * 31, a * 6, o.seed * 7) - .5) * 2;
				z += o.pucker * (.35 * vein + .9 * bumps) * Math.sin(Math.PI * aa) * inBlade * sstep(sn, .05, .2) * (1 - sstep(sn, .85, 1));
				z -= 35e-5 * Math.exp(-((aa / .06) ** 2)) * inBlade * (1 - .7 * sn);
				top.push(f.p.clone().addScaledVector(f.X, x).addScaledVector(f.Z, z));
				meta.push({
					s,
					a
				});
			}
		}
		const id = (i, j) => i * (C + 1) + j;
		const tris = [];
		for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) {
			tris.push([
				id(i, j),
				id(i, j + 1),
				id(i + 1, j)
			]);
			tris.push([
				id(i, j + 1),
				id(i + 1, j + 1),
				id(i + 1, j)
			]);
		}
		const nrm = top.map(() => new THREE.Vector3());
		for (const t of tris) {
			const fn = new THREE.Vector3().crossVectors(top[t[1]].clone().sub(top[t[0]]), top[t[2]].clone().sub(top[t[0]]));
			for (const k of t) nrm[k].add(fn);
		}
		const flip = nrm[id(R >> 1, C >> 1)].dot(frames[R >> 1].Z) < 0;
		if (flip) {
			for (const t of tris) [t[1], t[2]] = [t[2], t[1]];
			nrm.forEach((v) => v.negate());
		}
		nrm.forEach((v) => v.normalize());
		const bot = top.map((pt, k) => {
			const { s, a } = meta[k];
			const sn = Math.max(0, s);
			const thk = 4e-4 * (1 - .5 * a * a) * (1 - .6 * sstep(sn, .85, 1));
			const ridge = .0013 * (1 - .85 * sn) * Math.exp(-((Math.abs(a) / (.07 + .5 * (1 - sstep(s, 0, .08)))) ** 2));
			const fz = frames[Math.floor(k / (C + 1))].Z.clone().multiplyScalar(flip ? -1 : 1);
			const dir = nrm[k].clone().multiplyScalar(.35).addScaledVector(fz, .65).normalize();
			return pt.clone().addScaledVector(dir, -(thk + ridge));
		});
		const start = this.pos.length / 3;
		const row = o.kind;
		const vtx = (pt, k, backF, which) => {
			this.pos.push(pt.x, pt.y, pt.z);
			const { s, a } = meta[k];
			const [u, v] = templateUV(s, a * .96);
			this.uv.push(which === "top" ? u * .5 : .5 + (1 - u) * .5, (2 - row + v) / 3);
			this.col.push(o.tint.r, o.tint.g, o.tint.b);
			this.sway.push(o.sway(s, pt));
			this.ao.push(1);
			this.back.push(backF);
			this.leaf.push(o.seed, o.age, Math.abs(a));
			this.base.push(o.base.x, o.base.y, o.base.z, Math.max(0, s));
			this.leafId.push(this.leaves.length);
			return this.pos.length / 3 - 1;
		};
		const tI = top.map((pt, k) => vtx(pt, k, 0, "top"));
		const bI = bot.map((pt, k) => vtx(pt, k, 1, "bot"));
		for (const [a, b, c] of tris) {
			this.idx.push(tI[a], tI[b], tI[c]);
			this.idx.push(bI[a], bI[c], bI[b]);
		}
		const P = (q) => new THREE.Vector3(this.pos[q * 3], this.pos[q * 3 + 1], this.pos[q * 3 + 2]);
		const quad = (a, b, c, d, out) => {
			if (new THREE.Vector3().crossVectors(P(b).sub(P(a)), P(c).sub(P(a))).dot(out) >= 0) this.idx.push(a, b, c, b, d, c);
			else this.idx.push(a, c, b, b, c, d);
		};
		for (const [j, sg] of [[0, -1], [C, 1]]) {
			const rt = [];
			const rb = [];
			for (let i = 0; i <= R; i++) {
				rt.push(vtx(top[id(i, j)], id(i, j), .5, "top"));
				rb.push(vtx(bot[id(i, j)], id(i, j), .5, "top"));
			}
			for (let i = 0; i < R; i++) quad(rt[i], rt[i + 1], rb[i], rb[i + 1], frames[i].X.clone().multiplyScalar(sg));
		}
		{
			const rt = [];
			const rb = [];
			for (let j = 0; j <= C; j++) {
				rt.push(vtx(top[id(0, j)], id(0, j), .5, "top"));
				rb.push(vtx(bot[id(0, j)], id(0, j), .5, "top"));
			}
			for (let j = 0; j < C; j++) quad(rt[j], rt[j + 1], rb[j], rb[j + 1], frames[0].Y.clone().negate());
		}
		this.leaves.push({
			base: [
				o.base.x,
				o.base.y,
				o.base.z
			],
			spine: sp
		});
		this.disks.push({
			start,
			end: start + top.length,
			area: .62 * L * L * o.wr
		});
		return frames;
	}
	geometry() {
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
		g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
		g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
		g.setAttribute("aSway", new THREE.Float32BufferAttribute(this.sway, 1));
		g.setAttribute("aAO", new THREE.Float32BufferAttribute(this.ao, 1));
		g.setAttribute("aBack", new THREE.Float32BufferAttribute(this.back, 1));
		g.setAttribute("aLeaf", new THREE.Float32BufferAttribute(this.leaf, 3));
		g.setAttribute("aBase", new THREE.Float32BufferAttribute(this.base, 4));
		g.setAttribute("aLeafId", new THREE.Float32BufferAttribute(this.leafId, 1));
		g.userData.leaves = this.leaves;
		g.setIndex(this.idx);
		g.computeVertexNormals();
		g.computeBoundingSphere();
		return g;
	}
};
var SWORD_PHOTO_TINT = new THREE.Color(.5, 1, .7);
function buildSword(u, tex, seed = 1, scale = 1, style = "rosette", look = "cg") {
	const rand = rng(seed);
	const leaves = new SwordLeaves();
	const tubes = new TubeBuilder();
	const upright = style === "upright";
	const N = upright ? 7 + Math.floor(rand() * 3) : 18;
	const up = new THREE.Vector3(0, 1, 0);
	const swayH = .4 * scale;
	const swayOf = (y) => Math.min(1, Math.max(0, y / swayH)) ** 1.5;
	const petTex = !!tex?.petiole;
	const petCol = petTex ? new THREE.Color(.72, .72, .62) : srgb(.5, .62, .28);
	const crownCol = petTex ? new THREE.Color(1.1, 1.05, .8) : srgb(.72, .72, .5);
	const textured = !!tex?.map;
	const photoLook = look === "photo" && !!tex?.flat && !!tex?.map;
	for (let i = 0; i < N; i++) {
		const age = 1 - i / (N - 1);
		const az = upright ? (i % 2 ? 0 : Math.PI) + i * GOLDEN * .5 + rand.tri() * .45 : i * GOLDEN + rand.tri() * .2;
		const out = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
		const el = upright ? deg(88 - 10 * age + rand.tri() * 2) : deg(86 - 24 * age + rand.tri() * 5);
		const petL = (upright ? .03 + .03 * age + rand.range(-.005, .005) : .06 + .09 * age + rand.range(-.01, .01)) * scale;
		const pts = [];
		const d = out.clone().multiplyScalar(Math.cos(el)).addScaledVector(up, Math.sin(el)).normalize();
		const p = out.clone().multiplyScalar((upright ? .0025 : .004) * scale).setY(.002);
		const M = 10;
		for (let k = 0; k <= M; k++) {
			pts.push(p.clone());
			d.addScaledVector(out, upright ? .002 + .004 * age : .012 + .02 * age).normalize();
			if (k < M) p.addScaledVector(d, petL / M);
		}
		const pr = (.0017 + 6e-4 * age) * scale;
		const Y = d.clone();
		const Xl = new THREE.Vector3().crossVectors(up, out).normalize();
		const Zt = new THREE.Vector3().crossVectors(Xl, Y).negate().normalize();
		const kind = age < .25 ? 0 : age > .72 ? 2 : 1;
		const L = (upright ? .2 + .1 * Math.sin(Math.PI * Math.min(1, .25 + age)) + rand.tri() * .025 : .14 + .16 * Math.sqrt(age) + rand.tri() * .018) * scale;
		const tintB = rand.range(.9, 1.06);
		const frames = leaves.add({
			L,
			wr: upright ? .15 + .03 * age + rand.tri() * .012 : .18 + .05 * age + rand.tri() * .015,
			base: pts[M].clone().addScaledVector(Y, sword_leaf_default.stub * L),
			Y,
			Z: Zt,
			open: upright ? 3 + 36 * Math.pow(age, 1.1) + rand.tri() * 5 : -10 + 16 * age + rand.tri() * 5,
			droop: upright ? 4 + 20 * age + rand.tri() * 6 : 25 + 95 * age + rand.tri() * 15,
			droopPow: 1.7 + rand() * .6,
			side: rand.tri() * (upright ? 10 : 14),
			twist: rand.tri() * (upright ? 10 + 20 * age : 25 + 45 * age),
			fold: 12 + rand() * 12,
			waveA: (.1 + .18 * age) * rand.range(.7, 1.2) * (upright ? .85 : 1),
			waveL: rand.range(.3, .42),
			waveP: rand() * Math.PI * 2,
			waveLR: rand.range(.8, 2.4),
			edgeA: rand.range(.05, .11) * (.6 + .6 * age) * (upright ? .8 : 1),
			edgeL: rand.range(.11, .16),
			pucker: rand.range(25e-5, 5e-4) * (L / .25),
			kind,
			seed: rand(),
			age,
			tint: photoLook ? (() => {
				const r2 = rng(seed * 7919 + i * 31 + 5);
				const b = tintB * (.62 + .46 * r2() + .12 * (1 - age));
				const y = r2.range(-1, .8) - .4 * age;
				return new THREE.Color(b * (1 + .35 * y), b * (1 + .04 * y), b * (1 - .2 * y));
			})() : textured ? new THREE.Color(tintB, tintB, tintB) : kind === 0 ? srgb(.4, .6, .16) : kind === 1 ? srgb(.2, .42, .1) : srgb(.15, .32, .08),
			sway: (s, q) => swayOf(q.y) * (.6 + .6 * Math.max(0, s))
		});
		const tp = [...pts];
		const tr = pts.map((_, k) => pr * (1 + .6 * (1 - sstep(k / M, 0, .25))) * (1 - .25 * (k / M)));
		for (const f of frames) {
			if (f.s <= -sword_leaf_default.stub + 1e-6 || f.s > .1) continue;
			const k = sstep(f.s, -sword_leaf_default.stub, .1);
			const r = pr * .75 * (1 - sstep(k, 0, .5)) + 5e-4 * sstep(k, 0, .5);
			tp.push(f.p.clone().addScaledVector(f.Z, -r * .35));
			tr.push(r);
		}
		tubes.add(tp, tr, tp.map((_, k) => crownCol.clone().lerp(petCol, sstep(k / M, 0, .35))), tp.map((q) => swayOf(q.y)), 10, true);
	}
	const lg = leaves.geometry();
	const tg = tubes.geometry();
	clumpAO(lg, leaves.disks, [tg]);
	const group = new THREE.Group();
	const photo = photoLook;
	const lm = new THREE.Mesh(lg, photo ? plantMaterial(u, {
		map: tex.flat,
		normal: tex.normal ?? tex.flatN ?? null,
		thickLeaf: true,
		noSpecks: true,
		roughness: .38,
		specular: .6,
		normalScale: 1,
		key: "sword-leaf-photo",
		push: true,
		lit: {
			trans: tex.map,
			through: .9,
			wrap: .2,
			glow: .02,
			variation: 1,
			veins: 1
		}
	}) : plantMaterial(u, {
		map: tex?.map ?? null,
		normal: tex?.normal ?? null,
		thickLeaf: true,
		noSpecks: true,
		roughness: .38,
		specular: .6,
		trans: .75,
		back: textured ? 0 : .5,
		normalScale: .8,
		key: "sword-leaf",
		push: true
	}));
	for (const t of [tex?.petiole, tex?.petioleN]) {
		if (!t) continue;
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.repeat.set(1, 40);
	}
	const tm = new THREE.Mesh(tg, plantMaterial(u, {
		map: tex?.petiole ?? null,
		normal: tex?.petioleN ?? null,
		normalScale: .5,
		roughness: .4,
		specular: .5,
		trans: .4,
		key: "sword-stem"
	}));
	if (photo) for (const m of [lm.material, tm.material]) m.color.copy(SWORD_PHOTO_TINT);
	for (const m of [lm, tm]) {
		m.castShadow = m.receiveShadow = true;
		group.add(m);
	}
	return group;
}
var TANKS = {
	squidTetra: {
		ja: "イカ・カージナルテトラの水槽",
		en: "Squid and cardinal tetra tanks"
	},
	tetra: {
		ja: "カージナルテトラの水槽",
		en: "Cardinal tetra tank"
	},
	river: {
		ja: "日本淡水魚の水槽",
		en: "Japanese freshwater fish tank"
	}
};
var OBJECT_LIST = [
	{
		id: "r0",
		group: "rock",
		ja: "大きな岩",
		en: "Large crag",
		tank: TANKS.squidTetra
	},
	{
		id: "r1",
		group: "rock",
		ja: "平たい岩",
		en: "Flat slab",
		tank: TANKS.squidTetra
	},
	{
		id: "r2",
		group: "rock",
		ja: "丸い岩",
		en: "Boulder",
		tank: TANKS.squidTetra
	},
	{
		id: "r3",
		group: "rock",
		ja: "角ばった岩",
		en: "Block",
		tank: TANKS.squidTetra
	},
	...[
		1,
		2,
		3,
		4
	].map((n) => ({
		id: `k${n}`,
		group: "rock",
		ja: `風山石 ${n}`,
		en: `Fuzan stone ${n}`,
		tank: TANKS.river
	})),
	{
		id: "sword",
		group: "plant",
		ja: "アマゾンソード（広がる株）",
		en: "Amazon sword (rosette)",
		tank: TANKS.tetra
	},
	{
		id: "sword_upright",
		group: "plant",
		ja: "アマゾンソード（立つ株）",
		en: "Amazon sword (upright)",
		tank: TANKS.tetra
	},
	{
		id: "sword_photo",
		group: "plant",
		ja: "アマゾンソード（広がる株・写真らしい）",
		en: "Amazon sword (rosette, photoreal)",
		tank: TANKS.tetra
	},
	{
		id: "sword_upright_photo",
		group: "plant",
		ja: "アマゾンソード（立つ株・写真らしい）",
		en: "Amazon sword (upright, photoreal)",
		tank: TANKS.tetra
	},
	{
		id: "coral_sand",
		group: "sand",
		ja: "サンゴ砂",
		en: "Coral sand",
		tank: TANKS.squidTetra
	},
	{
		id: "river_sand",
		group: "sand",
		ja: "川砂",
		en: "River sand",
		tank: TANKS.river
	}
];
var publicPath = (f) => f.replace(/^rocks\//, "aquarium/").replace(/^stones\//, "stones/lite/").replace(/^sand\//, "aquarium/");
var rockFiles = (id) => ROCK_VIEWS.flatMap((v) => [
	"",
	"_n",
	"_h"
].map((s) => `rocks/rock_${id}_${v.name}${s}.webp`));
var stoneFiles = (id) => [`stones/${id}.stq`, ...STONE_VIEWS.flatMap((v) => [
	"",
	"_n",
	"_h"
].map((s) => `stones/${id}_${v.name}${s}.avif`))];
var SWORD_FILES = [
	"plants/sword_leaf.webp",
	"plants/sword_leaf_n.webp",
	"plants/skin_sword_petiole.webp",
	"plants/skin_sword_petiole_n.webp"
];
var SWORD_PHOTO_FILES = [...SWORD_FILES, "plants/sword_leaf_flat.webp"];
var SWORD_KIND = {
	sword: {
		style: "rosette",
		look: "cg",
		seed: 206
	},
	sword_upright: {
		style: "upright",
		look: "cg",
		seed: 208
	},
	sword_photo: {
		style: "rosette",
		look: "photo",
		seed: 206
	},
	sword_upright_photo: {
		style: "upright",
		look: "photo",
		seed: 208
	}
};
var sandFiles = (pre) => [
	`sand/${pre}sand_top.webp`,
	`sand/${pre}sand_top_nrm.avif`,
	`sand/${pre}sand_side.webp`
];
var OBJECTS = OBJECT_LIST.map((o) => ({
	...o,
	files: o.group === "rock" ? o.id.startsWith("k") ? stoneFiles(o.id) : rockFiles(o.id) : o.group === "plant" ? SWORD_KIND[o.id]?.look === "photo" ? SWORD_PHOTO_FILES : SWORD_FILES : sandFiles(o.id === "river_sand" ? "river_" : "")
}));
function createObjectKit(source, renderer) {
	const url = typeof source === "function" ? source : (f) => source + f;
	const time = { value: 0 };
	const cache = new Map();
	const once = (key, make) => {
		if (!cache.has(key)) cache.set(key, make());
		return cache.get(key);
	};
	const image = (f) => once(`img:${f}`, async () => {
		const r = await fetch(url(f));
		if (!r.ok) throw new Error(`${f}: ${r.status}`);
		const blob = await r.blob();
		const im = new Image();
		await new Promise((ok, ng) => {
			im.onload = ok;
			im.onerror = () => ng(new Error(`${f}: cannot decode`));
			im.src = URL.createObjectURL(blob);
		});
		return im;
	});
	const texture = (f, srgb, wrap) => once(`tex:${f}`, async () => {
		const t = new THREE.Texture(await image(f));
		t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
		t.wrapS = t.wrapT = wrap;
		t.anisotropy = 16;
		t.needsUpdate = true;
		return t;
	});
	const rock = (id) => once(`rock:${id}`, async () => {
		const def = ROCKS.find((r) => r.id === id);
		const tex = (s, srgb) => Promise.all(ROCK_VIEWS.map((v) => texture(`rocks/rock_${id}_${v.name}${s}.webp`, srgb, THREE.ClampToEdgeWrapping)));
		const [col, nrm, hgt] = await Promise.all([
			tex("", true),
			tex("_n", false),
			Promise.all(ROCK_VIEWS.map((v) => image(`rocks/rock_${id}_${v.name}_h.webp`)))
		]);
		const g = rockGeometry(def);
		displaceRock(g, def, hgt);
		return {
			def,
			g,
			col,
			nrm
		};
	});
	const viewArray = async (id, suffix, srgb, keep) => {
		const imgs = await Promise.all(STONE_VIEWS.map((v) => image(`stones/${id}_${v.name}${suffix}.avif`)));
		const W = imgs[0].naturalWidth;
		const H = imgs[0].naturalHeight;
		const arr = new Uint8Array(W * H * 4 * imgs.length);
		const cv = document.createElement("canvas");
		cv.width = W;
		cv.height = H;
		const cx = cv.getContext("2d", { willReadFrequently: true });
		const data = [];
		imgs.forEach((im, k) => {
			cx.clearRect(0, 0, W, H);
			cx.save();
			cx.translate(0, H);
			cx.scale(1, -1);
			cx.drawImage(im, 0, 0, W, H);
			cx.restore();
			arr.set(cx.getImageData(0, 0, W, H).data, k * W * H * 4);
			if (keep) {
				cx.clearRect(0, 0, W, H);
				cx.drawImage(im, 0, 0, W, H);
				data.push(cx.getImageData(0, 0, W, H));
			}
		});
		const tex = new THREE.DataArrayTexture(arr, W, H, imgs.length);
		tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
		tex.minFilter = THREE.LinearMipmapLinearFilter;
		tex.magFilter = THREE.LinearFilter;
		tex.generateMipmaps = true;
		tex.anisotropy = 8;
		tex.needsUpdate = true;
		return {
			tex,
			data
		};
	};
	const stone = (id) => once(`stone:${id}`, async () => {
		const r = await fetch(url(`stones/${id}.stq`));
		if (!r.ok) throw new Error(`stones/${id}.stq: ${r.status}`);
		const m = await unpackStoneQ(await r.arrayBuffer());
		const g = stoneGeometry(m);
		const cams = STONE_VIEWS.map((v) => viewCamera(m.pos, v));
		const [col, nrm, hgt] = await Promise.all([
			viewArray(id, "", true, false),
			viewArray(id, "_n", false, false),
			viewArray(id, "_h", false, true)
		]);
		viewWeights(renderer, g, cams);
		displaceStone(g, cams, hgt.data, .005);
		return {
			g,
			cams,
			col: col.tex,
			nrm: nrm.tex
		};
	});
	const swordTex = () => once("sword", async () => {
		const [map, normal, petiole, petioleN] = await Promise.all([
			texture("plants/sword_leaf.webp", true, THREE.ClampToEdgeWrapping),
			texture("plants/sword_leaf_n.webp", false, THREE.ClampToEdgeWrapping),
			texture("plants/skin_sword_petiole.webp", true, THREE.RepeatWrapping),
			texture("plants/skin_sword_petiole_n.webp", false, THREE.RepeatWrapping)
		]);
		for (const t of [map, normal]) t.anisotropy = 8;
		return {
			map,
			normal,
			petiole,
			petioleN
		};
	});
	const swordFlat = () => once("sword-flat", async () => {
		const t = await texture("plants/sword_leaf_flat.webp", true, THREE.ClampToEdgeWrapping);
		t.anisotropy = 8;
		return t;
	});
	const sandMats = (kind) => once(`sand:${kind}`, async () => {
		const pre = kind === "river_sand" ? "river_" : "";
		const [top, nrm, side] = await Promise.all([
			texture(`sand/${pre}sand_top.webp`, true, THREE.RepeatWrapping),
			texture(`sand/${pre}sand_top_nrm.avif`, false, THREE.RepeatWrapping),
			texture(`sand/${pre}sand_side.webp`, true, THREE.RepeatWrapping)
		]);
		side.wrapT = THREE.MirroredRepeatWrapping;
		const topMat = new THREE.MeshStandardMaterial({
			map: top,
			normalMap: nrm,
			normalScale: new THREE.Vector2(.8, .8),
			roughness: .95,
			metalness: 0
		});
		topMat.color.setRGB(...kind === "coral_sand" ? [
			.92,
			.92,
			.82
		] : [
			.95,
			.95,
			.95
		]);
		topMat.onBeforeCompile = (sh) => {
			sh.vertexShader = "varying vec3 vWp;\n" + sh.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;");
			sh.fragmentShader = `varying vec3 vWp;
          float sdH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float sdN(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(sdH(i), sdH(i + vec2(1, 0)), u.x), mix(sdH(i + vec2(0, 1)), sdH(i + vec2(1, 1)), u.x), u.y); }\n` + sh.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
            diffuseColor.rgb *= 0.95 + 0.1 * sdN(vWp.xz * 1.7 + 3.0) + 0.06 * (sdN(vWp.xz * 6.5 - 2.0) - 0.5);
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.04, 1.0, 0.9), sdN(vWp.xz * 2.6 + 9.0) * 0.6);`);
		};
		topMat.customProgramCacheKey = () => "kit-sand-top";
		return {
			topMat,
			sideMat: new THREE.MeshStandardMaterial({
				map: side,
				roughness: .95,
				metalness: 0
			})
		};
	});
	const sandBlock = async (kind, w, d, th) => {
		const { topMat, sideMat } = await sandMats(kind);
		const hash = (x, y) => {
			const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
			return s - Math.floor(s);
		};
		const vn = (x, y) => {
			const ix = Math.floor(x);
			const iy = Math.floor(y);
			const fx = x - ix;
			const fy = y - iy;
			const u = fx * fx * (3 - 2 * fx);
			const v = fy * fy * (3 - 2 * fy);
			const a = hash(ix, iy);
			const b = hash(ix + 1, iy);
			const c = hash(ix, iy + 1);
			const e = hash(ix + 1, iy + 1);
			return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v;
		};
		const hy = (x, z) => .006 * (vn(x * 9 + 3, z * 9) - .5) + .002 * (vn(x * 30, z * 30 + 7) - .5);
		const group = new THREE.Group();
		const NX = Math.max(8, Math.round(w / .006));
		const NZ = Math.max(8, Math.round(d / .006));
		const tg = new THREE.PlaneGeometry(w, d, NX, NZ);
		tg.rotateX(-Math.PI / 2);
		const p = tg.attributes.position;
		const uv = tg.attributes.uv;
		for (let i = 0; i < p.count; i++) {
			p.setY(i, hy(p.getX(i), p.getZ(i)));
			uv.setXY(i, p.getX(i) / .1, -p.getZ(i) / .1);
		}
		tg.computeVertexNormals();
		const top = new THREE.Mesh(tg, topMat);
		top.receiveShadow = true;
		group.add(top);
		const section = (n, at, len) => {
			const pos = [];
			const uvs = [];
			const idx = [];
			for (let i = 0; i <= n; i++) {
				const u = i / n;
				const [x, z] = at(u);
				const y = hy(x, z);
				pos.push(x, -th, z, x, y, z);
				uvs.push(u * len / .08, 0, u * len / .08, (y + th) / .08);
				if (i < n) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
			}
			const g = new THREE.BufferGeometry();
			g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
			g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
			g.setIndex(idx);
			g.computeVertexNormals();
			group.add(new THREE.Mesh(g, sideMat));
		};
		section(NX, (u) => [-w / 2 + u * w, d / 2], w);
		section(NZ, (u) => [w / 2, d / 2 - u * d], d);
		section(NX, (u) => [w / 2 - u * w, -d / 2], w);
		section(NZ, (u) => [-w / 2, -d / 2 + u * d], d);
		return group;
	};
	const seat = (mesh, bury) => {
		const b = mesh.geometry.boundingBox;
		mesh.position.set(-(b.min.x + b.max.x) / 2, -b.min.y - (b.max.y - b.min.y) * bury, -(b.min.z + b.max.z) / 2);
		const g = new THREE.Group();
		g.add(mesh);
		return g;
	};
	async function load(id, o = {}) {
		if (!OBJECTS.find((x) => x.id === id)) throw new Error(`no object "${id}"`);
		let obj;
		if (id === "coral_sand" || id === "river_sand") obj = await sandBlock(id, o.width ?? .4, o.depth ?? .4, o.thickness ?? .06);
		else if (SWORD_KIND[id]) {
			const { style, look, seed } = SWORD_KIND[id];
			obj = buildSword({
				time,
				gain: { value: o.gain ?? 1.2 },
				sway: { value: 1 }
			}, look === "photo" ? {
				...await swordTex(),
				flat: await swordFlat()
			} : await swordTex(), o.seed ?? seed, o.scale ?? 1, style, look);
		} else if (id.startsWith("r")) {
			const r = await rock(id);
			const m = new THREE.Mesh(r.g, rockMaterial(r.def, r.col, r.nrm, o.gain ?? 1.5, time, o.caustics ?? false));
			m.castShadow = m.receiveShadow = true;
			obj = seat(m, (o.bury ?? r.def.bury) * (2 * r.def.ry / (r.g.boundingBox.max.y - r.g.boundingBox.min.y)));
		} else {
			const s = await stone(id);
			const m = new THREE.Mesh(s.g, stoneMaterial(s.cams, s.col, s.nrm, {
				gain: { value: o.gain ?? .8 },
				time,
				caustics: o.caustics ?? false
			}));
			m.castShadow = m.receiveShadow = true;
			obj = seat(m, o.bury ?? .15);
		}
		obj.name = id;
		return obj;
	}
	return {
		load,
		time,
		update(dt) {
			time.value += dt;
		}
	};
}
export { OBJECTS, createObjectKit, publicPath };
