// The code of example.html: the gallery page, using ./objects-kit.js. three.js is loaded by the importmap in example.html. See README.md.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { OBJECTS, createObjectKit, publicPath } from "./objects-kit.js";
var FISH = [];
var MOTIONS = [];
var fishStats = () => null;
async function loadFish() {}
function createFish() {
	throw new Error("no fish in this kit");
}
var SQUID_LIST = [];
var SQUID_MOTIONS = [];
var SquidStage = class {};
var SHRIMP_LIST = [];
var SHRIMP_MOTIONS = [];
var ShrimpStage = class {};
var shrimpLength = () => 1;
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
[
	TANKS.squidTetra,
	TANKS.squidTetra,
	TANKS.squidTetra,
	TANKS.squidTetra,
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
	TANKS.tetra,
	TANKS.tetra,
	TANKS.tetra,
	TANKS.tetra,
	TANKS.squidTetra,
	TANKS.river
];
var SAND_OF = {
	r0: "coral_sand",
	r1: "coral_sand",
	r2: "coral_sand",
	r3: "coral_sand",
	k1: "river_sand",
	k2: "river_sand",
	k3: "river_sand",
	k4: "river_sand",
	sword: "coral_sand",
	sword_upright: "coral_sand",
	sword_photo: "coral_sand",
	sword_upright_photo: "coral_sand",
	coral_sand: "coral_sand",
	river_sand: "river_sand"
};
function countTriangles(obj) {
	let n = 0;
	obj.traverse((o) => {
		const g = o.geometry;
		if (!g) return;
		n += (g.index ? g.index.count : g.attributes.position.count) / 3;
	});
	return Math.round(n);
}
var ObjectStage = class {
	scene = new THREE.Scene();
	kit;
	current = null;
	token = 0;
	constructor(renderer, url) {
		this.kit = createObjectKit(url, renderer);
		const s = this.scene;
		const pmrem = new THREE.PMREMGenerator(renderer);
		s.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
		s.environmentIntensity = .45;
		pmrem.dispose();
		s.add(new THREE.HemisphereLight(15003391, 4867132, .7));
		const sun = new THREE.DirectionalLight(16774376, 2);
		sun.position.set(-1.2, 3, 2);
		s.add(sun);
		const rim = new THREE.DirectionalLight(12573951, .5);
		rim.position.set(1.5, 1.2, -2.5);
		s.add(rim);
	}
	async show(id) {
		const token = ++this.token;
		const info = OBJECTS.find((o) => o.id === id);
		const group = new THREE.Group();
		let triangles = 0;
		if (info.group === "sand") {
			const sand = await this.kit.load(id, {
				width: .4,
				depth: .4,
				thickness: .06
			});
			group.add(sand);
			triangles = countTriangles(sand);
		} else {
			const obj = await this.kit.load(id);
			triangles = countTriangles(obj);
			const b = new THREE.Box3().setFromObject(obj);
			const w = Math.max(.3, (b.max.x - b.min.x) * 1.5 + .06);
			const d = Math.max(.3, (b.max.z - b.min.z) * 1.5 + .06);
			const sand = await this.kit.load(SAND_OF[id], {
				width: w,
				depth: d,
				thickness: .05
			});
			group.add(obj, sand);
		}
		if (token !== this.token) return false;
		if (this.current) this.scene.remove(this.current.group);
		this.scene.add(group);
		const box = new THREE.Box3().setFromObject(group.children[0]);
		box.min.y = Math.max(box.min.y, info.group === "sand" ? -.06 : 0);
		this.current = {
			id,
			group,
			triangles,
			size: box.getSize(new THREE.Vector3()),
			center: box.getCenter(new THREE.Vector3())
		};
		return true;
	}
	update(dt) {
		this.kit.update(dt);
	}
};
var SITE_NAME = {
	ja: "なちゃっと水族館",
	en: "Nachat's Aquarium"
};
var LANG_KEY = "nachat.lang";
var OLD_LANG_KEY = "gachi-fishing.lang";
function read(k) {
	try {
		return localStorage.getItem(k);
	} catch {
		return null;
	}
}
var lang$1 = (() => {
	const s = read(LANG_KEY) ?? read(OLD_LANG_KEY);
	if (s === "ja" || s === "en") return s;
	return (navigator.language || "ja").toLowerCase().startsWith("ja") ? "ja" : "en";
})();
document.documentElement.lang = lang$1;
var listeners = [];
var getLang = () => lang$1;
function setLang(l) {
	lang$1 = l;
	document.documentElement.lang = l;
	try {
		localStorage.setItem(LANG_KEY, l);
	} catch {}
	for (const f of listeners) f(l);
}
function onLang(f) {
	listeners.push(f);
	f(lang$1);
}
var CSS = `
.site-home, .site-lang {
  position: fixed; top: 14px; z-index: 50;
  font: 500 13px/1 system-ui, 'Hiragino Sans', 'Yu Gothic UI', sans-serif;
  transition: opacity 0.8s;
}
.site-home {
  left: 14px; display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 12px 8px 10px; border-radius: 999px;
  color: #dfe6ff; text-decoration: none; letter-spacing: 0.04em;
  background: rgba(6, 10, 26, 0.55); border: 1px solid rgba(170, 190, 255, 0.22);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.site-home:hover { background: rgba(20, 28, 60, 0.75); border-color: rgba(190, 205, 255, 0.5); }
.site-home svg { width: 14px; height: 14px; flex: none; }
.site-lang {
  right: 14px; display: inline-flex; padding: 3px; border-radius: 999px;
  background: rgba(6, 10, 26, 0.55); border: 1px solid rgba(170, 190, 255, 0.22);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.site-lang button {
  font: inherit; font-size: 12.5px; padding: 6px 12px; border: 0; border-radius: 999px;
  background: none; color: #9fadd8; cursor: pointer; letter-spacing: 0.03em;
}
.site-lang button:hover { color: #fff; }
.site-lang button[aria-pressed='true'] { background: rgba(140, 160, 255, 0.28); color: #fff; }
/* 消えている間は押せない（水槽の下のボタンと同じ。スマホで見えないボタンを押してしまわないように。タップ・マウスを動かせば出てくる） */
.site-chrome-hide { opacity: 0; pointer-events: none; }
.site-chrome-gone { display: none !important; }
`;
var styled = false;
function style() {
	if (styled) return;
	styled = true;
	const s = document.createElement("style");
	s.textContent = CSS;
	document.head.appendChild(s);
}
function mountHome(opts = {}) {
	style();
	const a = document.createElement("a");
	a.className = "site-home";
	a.id = "home";
	a.href = opts.href ?? "./";
	const label = document.createElement("span");
	a.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg>`;
	a.append(label);
	document.body.append(a);
	onLang((l) => {
		label.textContent = SITE_NAME[l];
		a.title = l === "ja" ? "トップページへ" : "Back to the top page";
	});
	return a;
}
function mountLangSwitch() {
	style();
	const box = document.createElement("div");
	box.className = "site-lang";
	box.id = "langSwitch";
	box.setAttribute("role", "group");
	box.setAttribute("aria-label", "Language / 言語");
	const btns = [["ja", "日本語"], ["en", "English"]].map(([l, text]) => {
		const b = document.createElement("button");
		b.type = "button";
		b.textContent = text;
		b.lang = l;
		b.onclick = () => setLang(l);
		box.append(b);
		return [l, b];
	});
	document.body.append(box);
	onLang((l) => btns.forEach(([k, b]) => b.setAttribute("aria-pressed", String(k === l))));
	return box;
}
var isFishTab = (t) => t === "sea" || t === "fresh";
var modeOf = (t) => isFishTab(t) ? "fish" : t;
var FRESHWATER = new Set([
	"cardinal",
	"discus_blue",
	"discus_red",
	"discus_turq",
	"oikawa_male",
	"oikawa_female"
]);
var tabOfFish = (id) => FRESHWATER.has(id) ? "fresh" : "sea";
var VIEW_KEY = "fish-gallery.view";
var SQUID_VIEW_KEY = "fish-gallery.squid-view";
var SHRIMP_VIEW_KEY = "fish-gallery.shrimp-view";
var OBJ_VIEW_KEY = "fish-gallery.object-view";
var PICK_KEY = "fish-gallery.pick";
var store = {
	get(k) {
		try {
			return localStorage.getItem(k);
		} catch {
			return null;
		}
	},
	set(k, v) {
		try {
			localStorage.setItem(k, v);
		} catch {}
	}
};
var lang = getLang();
var EN = {
	from: "From the game <a href=\"https://cda-social.github.io/fish/\">Real Fishing Simulator VR</a>",
	tabSea: "Saltwater",
	tabFresh: "Freshwater",
	tabOther: "Others",
	tabObjects: "Objects",
	slow: "Slow-mo",
	resetView: "Reset view",
	loading: "Loading…",
	hMotion: "Motion",
	hDetail: "Mesh",
	detailHigh: "Detailed",
	detailLow: "Light (for distance)",
	hDownload: "Download",
	license: "<b>CC0 1.0 (public domain)</b><br />Models, textures and motion code are all free to modify, redistribute and use commercially. No permission or credit needed.<br /><span class=\"caution\">* Biological accuracy is not guaranteed. These are 3D models in the style of each species, not exact replicas.</span><br /><small>three.js is a separate library and is not covered by CC0 (MIT License, © three.js authors; it is not included in the kits, which use your own copy).</small>"
};
var KITS = {
	sea: {
		zip: "saltwater-fish-kit.zip",
		folder: "saltwater-fish-kit",
		name: {
			ja: "海水魚",
			en: "saltwater fish"
		},
		ask: {
			ja: "このプロジェクトのシーンにマダイを泳がせて",
			en: "make a red sea bream swim in this project’s scene"
		}
	},
	fresh: {
		zip: "freshwater-fish-kit.zip",
		folder: "freshwater-fish-kit",
		name: {
			ja: "淡水魚",
			en: "freshwater fish"
		},
		ask: {
			ja: "このプロジェクトのシーンにカージナルテトラを泳がせて",
			en: "make a cardinal tetra swim in this project’s scene"
		},
		noModel: true
	},
	other: {
		zip: "other-kit.zip",
		folder: "other-kit",
		name: {
			ja: "イカ・エビ",
			en: "squid and shrimp"
		},
		ask: {
			ja: "このプロジェクトの水槽の底にレッドビーシュリンプを歩かせて",
			en: "make a red bee shrimp walk on the floor of this project’s tank"
		},
		noModel: true
	},
	objects: {
		zip: "objects-kit.zip",
		folder: "objects-kit",
		name: {
			ja: "オブジェクト",
			en: "objects"
		},
		ask: {
			ja: "このプロジェクトの水槽の底に川砂を敷いて、風山石とアマゾンソードを置いて",
			en: "lay river sand on the floor of this project’s tank and place Fuzan stones and an Amazon sword on it"
		},
		noModel: true
	}
};
var OBJ_GROUPS = {
	rock: {
		ja: "石",
		en: "Stones"
	},
	plant: {
		ja: "水草",
		en: "Plants"
	},
	sand: {
		ja: "砂",
		en: "Sand"
	}
};
var kitSize = new Map();
var JA = {};
document.querySelectorAll("[data-i18n]").forEach((el) => JA[el.dataset.i18n] = el.innerHTML);
var TAB_TEXT = {
	sea: {
		ja: {
			title: "海水魚のモデル",
			list: "海水魚"
		},
		en: {
			title: "Saltwater Fish Models",
			list: "Saltwater fish"
		}
	},
	fresh: {
		ja: {
			title: "淡水魚のモデル",
			list: "淡水魚"
		},
		en: {
			title: "Freshwater Fish Models",
			list: "Freshwater fish"
		}
	},
	other: {
		ja: {
			title: "イカ・エビのモデル",
			list: "イカ・エビ"
		},
		en: {
			title: "Squid & Shrimp Models",
			list: "Squid & shrimp"
		}
	},
	objects: {
		ja: {
			title: "石・水草・砂のモデル",
			list: ""
		},
		en: {
			title: "Stone, Plant & Sand Models",
			list: ""
		}
	}
};
var $ = (id) => document.getElementById(id);
var base = "/";
var kitTab = {
	saltwater: "sea",
	freshwater: "fresh",
	other: "other",
	objects: "objects"
}[document.documentElement.dataset.kit ?? ""];
var local = !!kitTab;
var SITE = "https://cda-social.github.io/fish/";
var inKit = (f) => !kitTab || tabOfFish(f.id) === kitTab;
var TABS = kitTab ? [kitTab] : [
	"sea",
	"fresh",
	"other",
	"objects"
];
if (local) document.body.classList.add("local");
else {
	mountHome();
	mountLangSwitch();
}
document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("hidden", !TABS.includes(b.dataset.tab)));
if (TABS.length < 2) $("tabs").classList.add("hidden");
var stage = $("stage");
var renderer = new THREE.WebGLRenderer({
	antialias: true,
	alpha: true
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.prepend(renderer.domElement);
var scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(14085375, 5660778, 1.1));
var sun = new THREE.DirectionalLight(16773596, 1.9);
sun.position.set(-1.5, 3, 4);
scene.add(sun);
var rim = new THREE.DirectionalLight(12573951, .7);
rim.position.set(1, 1.5, -3);
scene.add(rim);
var camera = new THREE.PerspectiveCamera(35, 1, .01, 50);
var controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.addEventListener("end", saveView);
var holder = new THREE.Group();
holder.rotation.y = -Math.PI / 2;
scene.add(holder);
var floorTex = (() => {
	const c = document.createElement("canvas");
	c.width = c.height = 128;
	const g = c.getContext("2d");
	const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
	grad.addColorStop(0, "rgba(150,140,125,0.85)");
	grad.addColorStop(.6, "rgba(120,112,100,0.5)");
	grad.addColorStop(1, "rgba(120,112,100,0)");
	g.fillStyle = grad;
	g.fillRect(0, 0, 128, 128);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
})();
var floor = new THREE.Mesh(new THREE.CircleGeometry(1.1, 48), new THREE.MeshBasicMaterial({
	map: floorTex,
	transparent: true,
	depthWrite: false
}));
floor.rotation.x = -Math.PI / 2;
floor.visible = false;
scene.add(floor);
var lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
var fishLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
	color: 15265524,
	transparent: true,
	opacity: .55
}));
fishLine.frustumCulled = false;
fishLine.visible = false;
scene.add(fishLine);
var squidStage = new SquidStage(renderer, local ? (f) => f : (f) => `${base}${f}`);
var shrimpStage = new ShrimpStage(renderer, local ? (f) => f : (f) => `${base}${f}`);
var objectStage = new ObjectStage(renderer, local ? (f) => f : (f) => `${base}${publicPath(f)}`);
var picked = (() => {
	try {
		return JSON.parse(store.get(PICK_KEY) ?? "{}");
	} catch {
		return {};
	}
})();
var tabName = (t) => t === "fish" ? "sea" : t === "squid" ? "other" : t;
var hashTab = tabName(location.hash.slice(1));
var tab = TABS.includes(hashTab) ? hashTab : TABS.includes(tabName(picked.tab)) ? tabName(picked.tab) : TABS[0];
var fishPick = {
	sea: FISH.some((f) => f.id === picked.fish && tabOfFish(f.id) === "sea") ? picked.fish : "seabass",
	fresh: FISH.some((f) => f.id === picked.freshFish && tabOfFish(f.id) === "fresh") ? picked.freshFish : "cardinal"
};
var fishId = fishPick[isFishTab(tab) ? tab : "sea"];
var motion = MOTIONS.some((m) => m.id === picked.motion) ? picked.motion : "swim";
var isShrimp = (id) => SHRIMP_LIST.some((s) => s.id === id);
var isSquid = (id) => SQUID_LIST.some((s) => s.id === id);
var otherId = isShrimp(picked.other ?? "") || isSquid(picked.other) ? picked.other : isSquid(picked.squid) ? picked.squid : "aori";
var squidId = isSquid(otherId) ? otherId : isSquid(picked.squid) ? picked.squid : "aori";
var shrimpNow = () => isShrimp(otherId);
var squidMotion = SQUID_MOTIONS.some((m) => m.id === picked.squidMotion) ? picked.squidMotion : "hover";
var shrimpMotion = SHRIMP_MOTIONS.some((m) => m.id === picked.shrimpMotion) ? picked.shrimpMotion : "auto";
var objId = OBJECTS.some((o) => o.id === picked.obj) ? picked.obj : "k1";
var detail = "high";
var slow = false;
var actor = null;
var keepPick = () => {
	if (isFishTab(tab)) fishPick[tab] = fishId;
	store.set(PICK_KEY, JSON.stringify({
		fish: fishPick.sea,
		freshFish: fishPick.fresh,
		motion,
		tab,
		squid: squidId,
		other: otherId,
		squidMotion,
		shrimpMotion,
		obj: objId
	}));
};
var squidMotionOk = (m, id) => {
	const info = SQUID_MOTIONS.find((x) => x.id === m);
	return !!info && (!info.only || info.only === id);
};
if (!squidMotionOk(squidMotion, squidId)) squidMotion = "hover";
var squidMl = () => SQUID_LIST.find((s) => s.id === squidId).mantleCm / 100;
var otherSize = () => isShrimp(otherId) ? shrimpLength(otherId) : squidMl() * 2;
var otherStage = () => shrimpNow() ? shrimpStage : squidStage;
var SQUID_VIEW_DIR = new THREE.Vector3(1.922, 2.661, 2.453).normalize();
var SHRIMP_VIEW_DIR = new THREE.Vector3(.05, .029, .07).normalize();
var OBJ_VIEW_DIR = new THREE.Vector3(.35, .5, 1).normalize();
var objSize = () => {
	const c = objectStage.current;
	return c ? Math.max(c.size.x, c.size.y, c.size.z) : .4;
};
function fitDistance(len) {
	const half = THREE.MathUtils.degToRad(camera.fov / 2);
	return len * Math.max(.8 / (Math.tan(half) * camera.aspect), .62 / Math.tan(half));
}
function defaultView() {
	if (tab === "objects") {
		controls.target.copy(objectStage.current?.center ?? new THREE.Vector3());
		camera.position.copy(controls.target).addScaledVector(OBJ_VIEW_DIR, fitDistance(objSize()) * .9);
	} else if (modeOf(tab) === "fish") {
		const d = fitDistance(1);
		controls.target.set(0, 0, 0);
		camera.position.set(0, d * .22, d);
	} else if (shrimpNow()) {
		shrimpStage.snap(camera, controls.target);
		camera.position.copy(controls.target).addScaledVector(SHRIMP_VIEW_DIR, fitDistance(otherSize() * 1.1));
	} else {
		const d = fitDistance(squidMl() * 2) * .79;
		squidStage.snap(camera, controls.target);
		camera.position.copy(controls.target).addScaledVector(SQUID_VIEW_DIR, d);
	}
	controls.update();
}
function saveView() {
	if (tab === "objects") {
		if (objectStage.current) store.set(OBJ_VIEW_KEY, JSON.stringify({ o: camera.position.clone().sub(controls.target).divideScalar(objSize()).toArray() }));
		return;
	}
	if (modeOf(tab) === "fish") store.set(VIEW_KEY, JSON.stringify({
		p: camera.position.toArray(),
		t: controls.target.toArray()
	}));
	else if (shrimpNow()) store.set(SHRIMP_VIEW_KEY, JSON.stringify({ o: camera.position.clone().sub(controls.target).divideScalar(otherSize()).toArray() }));
	else store.set(SQUID_VIEW_KEY, JSON.stringify({ o: camera.position.clone().sub(controls.target).divideScalar(squidMl()).toArray() }));
}
function restoreView() {
	try {
		if (tab === "objects") {
			const v = JSON.parse(store.get(OBJ_VIEW_KEY) ?? "null");
			if (!v) return false;
			controls.target.copy(objectStage.current?.center ?? new THREE.Vector3());
			camera.position.copy(controls.target).add(new THREE.Vector3().fromArray(v.o).multiplyScalar(objSize()));
		} else if (modeOf(tab) === "fish") {
			const v = JSON.parse(store.get(VIEW_KEY) ?? "null");
			if (!v) return false;
			camera.position.fromArray(v.p);
			controls.target.fromArray(v.t);
		} else {
			const shrimp = shrimpNow();
			const v = JSON.parse(store.get(shrimp ? SHRIMP_VIEW_KEY : SQUID_VIEW_KEY) ?? "null");
			if (!v) return false;
			otherStage().snap(camera, controls.target);
			camera.position.copy(controls.target).add(new THREE.Vector3().fromArray(v.o).multiplyScalar(shrimp ? otherSize() : squidMl()));
		}
		controls.update();
		return true;
	} catch {
		return false;
	}
}
function applyView() {
	const s = tab === "objects" ? objSize() : modeOf(tab) === "fish" ? 1 : otherSize();
	controls.minDistance = .4 * s;
	controls.maxDistance = 8 * s;
	if (!restoreView()) defaultView();
}
function resize() {
	const w = stage.clientWidth;
	const h = stage.clientHeight;
	renderer.setSize(w, h, false);
	camera.aspect = w / Math.max(h, 1);
	camera.updateProjectionMatrix();
}
resize();
new ResizeObserver(resize).observe(stage);
var nameOf = (f) => lang === "ja" ? f.ja : f.en;
var otherName = (f) => lang === "ja" ? f.en : f.ja;
function buildLists() {
	const fl = $("fishList");
	fl.innerHTML = "";
	const ml = $("motionList");
	ml.innerHTML = "";
	const item = (parent, key, html, onclick) => {
		const b = document.createElement("button");
		b.dataset.key = key;
		b.innerHTML = html;
		b.onclick = onclick;
		parent.append(b);
	};
	if (modeOf(tab) === "fish") {
		for (const f of FISH) if (tabOfFish(f.id) === tab && inKit(f)) item(fl, f.id, `${nameOf(f)}<small>${otherName(f)}</small>`, () => pickFish(f.id));
		for (const m of MOTIONS) item(ml, m.id, nameOf(m), () => pickMotion(m.id));
	} else if (tab === "other") {
		for (const s of [...SQUID_LIST, ...SHRIMP_LIST]) item(fl, s.id, `${nameOf(s)}<small>${otherName(s)}</small>`, () => pickOther(s.id));
		if (shrimpNow()) for (const m of SHRIMP_MOTIONS) item(ml, m.id, nameOf(m), () => pickShrimpMotion(m.id));
		else for (const m of SQUID_MOTIONS) if (squidMotionOk(m.id, squidId)) item(ml, m.id, nameOf(m), () => pickSquidMotion(m.id));
	}
	const ol = $("objList");
	ol.innerHTML = "";
	if (tab === "objects") for (const g of Object.keys(OBJ_GROUPS)) {
		const h = document.createElement("h2");
		h.textContent = OBJ_GROUPS[g][lang];
		const grid = document.createElement("div");
		grid.className = "grid";
		ol.append(h, grid);
		for (const o of OBJECTS) if (o.group === g) item(grid, o.id, `${nameOf(o)}<small>${otherName(o)}</small>`, () => pickObject(o.id));
	}
	markOn();
}
function markOn() {
	const one = modeOf(tab) === "fish" ? fishId : otherId;
	const mo = modeOf(tab) === "fish" ? motion : shrimpNow() ? shrimpMotion : squidMotion;
	document.querySelectorAll("#fishList button").forEach((b) => b.classList.toggle("on", b.dataset.key === one));
	document.querySelectorAll("#motionList button").forEach((b) => b.classList.toggle("on", b.dataset.key === mo));
	document.querySelectorAll("#objList button").forEach((b) => b.classList.toggle("on", b.dataset.key === objId));
	document.querySelectorAll("#detailList button").forEach((b) => b.classList.toggle("on", b.dataset.detail === detail));
	document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
	$("slow").classList.toggle("on", slow);
}
function showKit() {
	if (local) return;
	const k = KITS[tab];
	const a = $("dlKit");
	a.href = `${base}kit/${k.zip}`;
	$("dlKitLabel").textContent = lang === "ja" ? `${k.name.ja}をまとめてダウンロード` : `Download all ${k.name.en}`;
	const size = kitSize.get(k.zip);
	$("dlKitName").textContent = size ? `${k.zip} · ${size}` : k.zip;
	$("howto").innerHTML = lang === "ja" ? `<b>使い方は、あなたの AI エージェントに読ませてください。</b><br />解凍したフォルダを Claude Code や Codex などに渡して、たとえば「<code>${k.folder}/README.md</code> を読んで、${k.ask.ja}」と頼めば組み込んでくれます。three.js ならそのまま動き、ほかのエンジン（Unity・Godot など）へ移すための手がかりも README に書いてあります。` : `<b>Let your AI agent read the docs.</b><br />Hand the unzipped folder to Claude Code, Codex or similar and ask, for example, “Read <code>${k.folder}/README.md</code> and ${k.ask.en}.” It runs as-is with three.js, and the README also has pointers for porting to other engines (Unity, Godot, …).`;
}
function showModelNote() {
	const k = KITS[tab];
	$("modelNote").innerHTML = !k.noModel ? "" : lang === "ja" ? `<b>${k.name.ja}には、glb・FBX のモデルがありません。</b><br />three.js ならキットのコードでそのまま動きます。ほかのエンジンやプロジェクトでは、AI エージェントにコードを移植してもらってください。` : `<b>There are no glb / FBX models for ${k.name.en}.</b><br />With three.js, the kit’s code runs as-is. For other engines and projects, have an AI agent port the code.`;
}
function showInfo() {
	const tt = TAB_TEXT[tab][lang];
	$("pageTitle").textContent = tt.title;
	$("hList").textContent = tt.list;
	document.title = local ? tt.title : `${tt.title}｜${SITE_NAME[lang]}`;
	document.body.dataset.tab = tab;
	document.body.dataset.mode = modeOf(tab);
	$("from").classList.toggle("hidden", tab === "fresh" || tab === "objects" || tab === "other" && shrimpNow());
	showModelNote();
	showKit();
	if (tab === "objects") {
		const o = OBJECTS.find((x) => x.id === objId);
		const n = o.files.filter((f) => !f.endsWith(".stq")).length;
		$("nowName").innerHTML = `${nameOf(o)}<small>${o.tank[lang]}</small>`;
		const c = objectStage.current?.id === objId ? objectStage.current : null;
		const cm = (v) => (v * 100).toFixed(0);
		$("objStats").textContent = c ? lang === "ja" ? `${c.triangles.toLocaleString()} 三角形・写真 ${n} 枚${o.group === "sand" ? "（くり返して敷く）" : ""}・砂の上の大きさ ${cm(c.size.x)} × ${cm(c.size.y)} × ${cm(c.size.z)} cm` : `${c.triangles.toLocaleString()} tris · ${n} photos${o.group === "sand" ? " (tiled)" : ""} · ${cm(c.size.x)} × ${cm(c.size.y)} × ${cm(c.size.z)} cm above the sand` : "";
		return;
	}
	if (tab === "other" && isShrimp(otherId)) {
		const s = SHRIMP_LIST.find((x) => x.id === otherId);
		$("nowName").textContent = nameOf(s);
		const a = shrimpStage.actor?.id === otherId ? shrimpStage.actor : null;
		$("stats").textContent = a ? lang === "ja" ? `${detail === "high" ? "細かい形" : "軽い形"} ${a.triangles.toLocaleString()} 三角形・全長 ${s.lengthMm} mm・写真 2 枚を寸法から作った形に貼る` : `${detail === "high" ? "Detailed" : "Light"} ${a.triangles.toLocaleString()} tris · ${s.lengthMm} mm long · 2 photos on a shape built from measurements` : "";
		return;
	}
	if (tab === "other") {
		const s = SQUID_LIST.find((x) => x.id === squidId);
		$("nowName").textContent = nameOf(s);
		const a = squidStage.actor;
		$("stats").textContent = a ? lang === "ja" ? `${detail === "high" ? "細かい形" : "軽い形"} ${a.triangles.toLocaleString()} 三角形・写真 3 枚（背中・お腹・横）から毎フレーム形を作る` : `${detail === "high" ? "Detailed" : "Light"} ${a.triangles.toLocaleString()} tris · built every frame from 3 photos (back, belly, side)` : "";
		return;
	}
	const f = FISH.find((x) => x.id === fishId);
	$("nowName").textContent = nameOf(f);
	const s = fishStats(fishId);
	$("stats").textContent = s ? lang === "ja" ? `細かい形 ${s.hiTris.toLocaleString()} 三角形・軽い形 ${s.loTris.toLocaleString()} 三角形・テクスチャ ${s.texture}` : `Detailed ${s.hiTris.toLocaleString()} tris · light ${s.loTris.toLocaleString()} tris · texture ${s.texture}` : "";
}
function showLoading(on) {
	$("loading").classList.toggle("hidden", !on);
}
function loadFailed() {
	showLoading(true);
	$("loading").textContent = lang === "ja" ? "読み込めませんでした。ページを読み直してください" : "Could not load. Please reload the page.";
}
var loads = new Map();
var ensure = (id) => {
	let p = loads.get(id);
	if (!p) loads.set(id, p = loadFish(local ? "fish/" : `${base}fish/`, [id]));
	return p;
};
var spawnToken = 0;
async function spawn() {
	const token = ++spawnToken;
	const id = fishId;
	if (!fishStats(id)) showLoading(true);
	await ensure(id);
	if (token !== spawnToken || modeOf(tab) !== "fish") return;
	showLoading(false);
	actor?.dispose();
	actor = null;
	try {
		actor = createFish(id);
	} catch {
		loadFailed();
		return;
	}
	actor.setMotion(motion);
	actor.setDetail(detail);
	holder.scale.setScalar(1 / actor.length);
	holder.add(actor.object);
	for (let i = 0; i < 30; i++) actor.update(1 / 60);
	showInfo();
}
async function spawnOther(first = false) {
	const token = ++spawnToken;
	const id = otherId;
	if (isShrimp(id)) {
		showLoading(true);
		let a;
		try {
			a = await shrimpStage.spawn(id, shrimpMotion, detail);
		} catch {
			if (token === spawnToken) loadFailed();
			return;
		}
		if (!a || token !== spawnToken || tab !== "other") return;
		showLoading(false);
	} else {
		if (!squidStage.loaded) showLoading(true);
		try {
			await squidStage.load();
		} catch {
			if (token === spawnToken) loadFailed();
			return;
		}
		if (token !== spawnToken || tab !== "other") return;
		showLoading(false);
		await squidStage.spawn(id, squidMotion, detail);
	}
	if (first) applyView();
	else otherStage().snap(camera, controls.target);
	showInfo();
}
var otherShown = () => (shrimpNow() ? shrimpStage.actor : squidStage.actor)?.id === otherId;
async function spawnObject() {
	const token = ++spawnToken;
	if (objectStage.current?.id !== objId) showLoading(true);
	try {
		if (!await objectStage.show(objId)) return;
	} catch {
		if (token === spawnToken) loadFailed();
		return;
	}
	if (token !== spawnToken || tab !== "objects") return;
	showLoading(false);
	applyView();
	showInfo();
}
function pickObject(id) {
	if (id === objId && objectStage.current?.id === id) return;
	saveView();
	objId = id;
	keepPick();
	markOn();
	showInfo();
	spawnObject();
}
function pickFish(id) {
	if (id === fishId && actor) return;
	fishId = id;
	keepPick();
	spawn();
	markOn();
	showInfo();
}
function pickMotion(id) {
	motion = id;
	keepPick();
	actor?.setMotion(id);
	markOn();
	showInfo();
}
function pickOther(id) {
	if (id === otherId && otherShown()) return;
	saveView();
	otherId = id;
	if (isSquid(id)) {
		squidId = id;
		if (!squidMotionOk(squidMotion, id)) squidMotion = "hover";
	}
	keepPick();
	buildLists();
	spawnOther(true);
	showInfo();
}
function pickShrimpMotion(id) {
	shrimpMotion = id;
	keepPick();
	shrimpStage.setMotion(id);
	markOn();
	showInfo();
}
function pickSquidMotion(id) {
	squidMotion = id;
	keepPick();
	squidStage.setMotion(id);
	markOn();
	showInfo();
}
function setTab(t) {
	if (!TABS.includes(t)) return;
	if (t !== tab) saveView();
	const from = tab;
	tab = t;
	const fishChanged = isFishTab(t) && fishId !== fishPick[t];
	if (isFishTab(t)) fishId = fishPick[t];
	keepPick();
	history.replaceState(null, "", t === "sea" ? location.pathname + location.search : `#${t}`);
	buildLists();
	showInfo();
	fishLine.visible = false;
	stage.classList.remove("air");
	if (t === "objects") {
		if (objectStage.current?.id === objId) applyView();
		else spawnObject();
		return;
	}
	if (isFishTab(t)) {
		if (!isFishTab(from)) applyView();
		if (!actor || fishChanged) spawn();
	} else if (!otherShown()) spawnOther(true);
	else applyView();
}
document.querySelectorAll("#tabs button").forEach((b) => b.onclick = () => setTab(b.dataset.tab));
document.querySelectorAll("#detailList button").forEach((b) => {
	b.onclick = () => {
		detail = b.dataset.detail;
		if (modeOf(tab) === "fish") actor?.setDetail(detail);
		else if (shrimpNow()) shrimpStage.setDetail(detail);
		else spawnOther();
		markOn();
		showInfo();
	};
});
$("slow").onclick = () => {
	slow = !slow;
	markOn();
};
$("resetView").onclick = () => {
	defaultView();
	saveView();
};
function applyLang(l) {
	lang = l;
	document.querySelectorAll("[data-i18n]").forEach((el) => {
		const k = el.dataset.i18n;
		el.innerHTML = (lang === "en" ? EN[k] : JA[k]) ?? el.innerHTML;
	});
	if (local) $("title").querySelectorAll("a").forEach((a) => a.href = SITE);
	buildLists();
	showInfo();
}
if (!local) for (const k of Object.values(KITS)) fetch(`${base}kit/${k.zip}`, { method: "HEAD" }).then((r) => {
	const n = Number(r.headers.get("content-length"));
	if (r.ok && n > 0) kitSize.set(k.zip, `${(n / 1024 / 1024).toFixed(1)} MB`);
	showKit();
}).catch(() => {});
var mouth = new THREE.Vector3();
var lineDir = new THREE.Vector3();
var clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
	const real = Math.min(clock.getDelta(), .05);
	const dt = real * (slow ? .25 : 1);
	renderer.toneMapping = tab === "other" && shrimpNow() ? THREE.NeutralToneMapping : THREE.NoToneMapping;
	if (tab === "objects") {
		objectStage.update(dt);
		controls.update();
		renderer.render(objectStage.scene, camera);
		return;
	}
	if (tab === "other" && shrimpNow()) {
		shrimpStage.update(dt, real, camera, controls.target);
		stage.classList.remove("air");
		controls.update();
		renderer.render(shrimpStage.scene, camera);
		return;
	}
	if (tab === "other") {
		squidStage.update(dt, real, camera, controls.target);
		stage.classList.toggle("air", squidStage.inAir);
		controls.update();
		renderer.render(squidStage.scene, camera);
		return;
	}
	if (actor) {
		actor.update(dt);
		const m = MOTIONS.find((x) => x.id === motion);
		fishLine.visible = m.onLine;
		if (m.onLine) {
			holder.updateMatrixWorld();
			holder.localToWorld(actor.getMouth(mouth));
			lineDir.set(motion === "air" ? 0 : -.55, 1, motion === "air" ? 0 : .25).normalize();
			const pos = lineGeo.attributes.position;
			pos.setXYZ(0, mouth.x, mouth.y, mouth.z);
			pos.setXYZ(1, mouth.x + lineDir.x * 4, mouth.y + lineDir.y * 4, mouth.z + lineDir.z * 4);
			pos.needsUpdate = true;
		}
		floor.visible = motion === "landed";
		floor.position.y = actor.floorY / actor.length - .002;
	}
	controls.update();
	renderer.render(scene, camera);
});
onLang(applyLang);
if (modeOf(tab) === "fish") {
	applyView();
	spawn().then(async () => {
		for (const f of FISH) if (inKit(f)) await ensure(f.id);
	});
} else if (tab === "other") spawnOther(true);
else spawnObject();
