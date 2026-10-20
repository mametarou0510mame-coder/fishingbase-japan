"use client";

// マイ水族館の水槽。魚ごとに「目的地を決めて、加速・減速しながら泳ぐ」動きを毎フレーム計算する。
// ・群れで泳ぐ魚（アジ・イワシなど）は速く、同じ種類どうしで向きをそろえる
// ・底の魚（カレイ・ガシラなど）は砂の上で休み、ときどき短く移動する
// ・タチウオは頭を上にして立ち泳ぎ、イカはその場でホバリングして後ろ向きにも進む
// ・向きを変える時はゆっくり体をひるがえし、泳ぐ速さに合わせて尾びれの振りが速くなる
import { useEffect, useRef } from "react";
import FishSprite from "@/app/components/FishSprite";

export type TankFish = { id: string; species: string; sizeCm: number | null; photo?: { url: string; aspect: number } };
type Kind = "school" | "cruise" | "bottom" | "hover" | "vertical" | "crawl" | "eel" | "squid";

const kindOf = (sp: string): Kind =>
  /アジ|イワシ|サバ|コノシロ|サッパ|ハマチ|サゴシ|シオ|ボラ|サヨリ/.test(sp) ? "school"
  : /カレイ|ヒラメ|ハゼ|ガシラ|アイナメ|ハオコゼ|エソ/.test(sp) ? "bottom"
  : /タチウオ/.test(sp) ? "vertical"
  : /タコ/.test(sp) ? "crawl"
  : /ハモ/.test(sp) ? "eel"
  : /イカ/.test(sp) ? "squid"
  : /メバル|カワハギ|ウマヅラ|フグ/.test(sp) ? "hover"
  : "cruise";

// 種類ごとの泳ぎ方（速さは px/秒）
const PROFILE: Record<Kind, { speed: [number, number]; rest: number; accel: number; zone: [number, number] }> = {
  school: { speed: [45, 95], rest: 0.05, accel: 1.6, zone: [0.08, 0.6] },
  cruise: { speed: [22, 55], rest: 0.25, accel: 1.1, zone: [0.12, 0.72] },
  bottom: { speed: [25, 60], rest: 0.8, accel: 2.2, zone: [0.84, 0.88] },
  hover: { speed: [10, 28], rest: 0.45, accel: 0.9, zone: [0.2, 0.75] },
  vertical: { speed: [6, 18], rest: 0.6, accel: 0.6, zone: [0.15, 0.55] },
  crawl: { speed: [6, 14], rest: 0.6, accel: 0.8, zone: [0.82, 0.84] },
  eel: { speed: [14, 30], rest: 0.4, accel: 0.8, zone: [0.7, 0.86] },
  squid: { speed: [10, 40], rest: 0.4, accel: 1.4, zone: [0.15, 0.6] },
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const seed = (id: string, k: number) => {
  let h = 2166136261 ^ k;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};

// 写真の魚は少し大きめに見せる
const wOf = (f: TankFish, z: number) => Math.max(44, Math.min(f.photo ? 200 : 170, (f.photo ? 40 : 30) + (f.sizeCm ?? 15) * (f.photo ? 2.8 : 2.4))) * (0.82 + 0.18 * z);

type State = {
  x: number; y: number; vx: number; vy: number; tx: number; ty: number;
  want: number; timer: number; face: number; dir: number; beat: number; resting: boolean; back: boolean;
};

export default function Tank({ fish, onPick, children }: { fish: TankFish[]; onPick: (id: string) => void; children?: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, { outer: HTMLElement; orient: HTMLElement; sprite: HTMLElement }>());
  const states = useRef(new Map<string, State>());

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let W = el.clientWidth, H = el.clientHeight;
    const ro = new ResizeObserver(() => { W = el.clientWidth; H = el.clientHeight; });
    ro.observe(el);

    const size = (f: TankFish) => {
      const w = wOf(f, seed(f.id, 5));
      return { w, h: w * (f.photo ? f.photo.aspect : 0.6) };
    };
    const pickTarget = (f: TankFish, s: State, k: Kind) => {
      const P = PROFILE[k];
      const { w } = size(f);
      s.resting = Math.random() < P.rest;
      s.want = s.resting ? (k === "bottom" || k === "crawl" ? 0 : P.speed[0] * 0.3) : rnd(P.speed[0], P.speed[1]);
      const reach = k === "bottom" ? rnd(0.15, 0.4) : k === "hover" || k === "vertical" || k === "squid" ? rnd(0.1, 0.3) : rnd(0.3, 0.9);
      const dx = (Math.random() < 0.5 ? -1 : 1) * reach * W;
      s.tx = clamp(s.x + dx, w / 2 + 4, W - w / 2 - 4);
      s.ty = clamp(rnd(P.zone[0], P.zone[1]) * H, 20, H - 30);
      s.timer = s.resting ? rnd(1.5, k === "bottom" ? 7 : 4) : rnd(3, 9);
      s.back = k === "squid" && !s.resting && Math.random() < 0.35; // イカはときどき後ろ向きに進む
    };

    for (const f of fish) {
      if (states.current.has(f.id)) continue;
      const k = kindOf(f.species);
      const P = PROFILE[k];
      const s: State = {
        x: rnd(0.1, 0.9) * W, y: rnd(P.zone[0], P.zone[1]) * H, vx: 0, vy: 0, tx: 0, ty: 0,
        want: 0, timer: 0, face: Math.random() < 0.5 ? -1 : 1, dir: 1, beat: 0.8, resting: false, back: false,
      };
      s.dir = s.face;
      pickTarget(f, s, k);
      states.current.set(f.id, s);
    }
    for (const id of [...states.current.keys()]) if (!fish.some((f) => f.id === id)) states.current.delete(id);

    const draw = (f: TankFish, s: State, k: Kind) => {
      const e = els.current.get(f.id);
      if (!e) return;
      const { w, h } = size(f);
      const sp = Math.hypot(s.vx, s.vy);
      const sc = Math.sign(s.face) * Math.max(0.06, Math.abs(s.face));
      // 頭が進む向きを向くように傾ける（向きを変えている途中は小さく）
      let ang = s.face > 0 ? Math.atan2(s.vy, Math.abs(s.vx) + 6) : Math.atan2(-s.vy, -(Math.abs(s.vx) + 6));
      ang = clamp((ang * 180) / Math.PI, -28, 28) * Math.min(1, sp / 25) * Math.abs(s.face);
      if (k === "vertical") ang += (s.face > 0 ? -1 : 1) * (s.resting || sp < 12 ? 62 : 30);
      if (k === "bottom" || k === "crawl") ang *= 0.3;
      e.outer.style.transform = `translate(${s.x - w / 2}px, ${s.y - h / 2}px)`;
      e.orient.style.transform = `rotate(${ang.toFixed(1)}deg) scaleX(${sc.toFixed(3)})`;
      const beat = clamp(1.3 - sp / 70, k === "school" ? 0.18 : 0.28, 1.4);
      if (Math.abs(beat - s.beat) > 0.06) {
        s.beat = beat;
        e.sprite.style.setProperty("--beat", `${beat.toFixed(2)}s`);
      }
    };

    if (reduce) {
      for (const f of fish) draw(f, states.current.get(f.id)!, kindOf(f.species));
      return () => ro.disconnect();
    }

    let raf = 0, last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (const f of fish) {
        const s = states.current.get(f.id);
        if (!s) continue;
        const k = kindOf(f.species);
        const P = PROFILE[k];
        const { w } = size(f);
        s.timer -= dt;
        const dx = s.tx - s.x, dy = s.ty - s.y;
        const dist = Math.hypot(dx, dy);
        if (s.timer <= 0 || (!s.resting && dist < 12)) pickTarget(f, s, k);
        // 目的地に近づくと減速
        const speed = s.want * clamp(dist / 60, 0.15, 1);
        let ux = dist > 0.1 ? dx / dist : 0, uy = dist > 0.1 ? dy / dist : 0;
        if (k === "school") {
          // 同じ種類の仲間と向きをそろえ、少しまとまる
          let ax = 0, ay = 0, cx = 0, cy = 0, n = 0;
          for (const g of fish) {
            if (g.id === f.id || g.species !== f.species) continue;
            const o = states.current.get(g.id);
            if (!o || Math.hypot(o.x - s.x, o.y - s.y) > 160) continue;
            ax += o.vx; ay += o.vy; cx += o.x; cy += o.y; n++;
          }
          if (n) {
            const m = Math.hypot(ax, ay) || 1;
            ux = ux * 0.6 + (ax / m) * 0.3 + ((cx / n - s.x) / 160) * 0.1;
            uy = uy * 0.6 + (ay / m) * 0.3 + ((cy / n - s.y) / 160) * 0.1;
          }
        }
        if (k === "bottom" || k === "crawl") uy *= 0.2; // 底の魚はあまり浮かない
        const a = Math.min(1, dt * P.accel);
        s.vx += (ux * speed - s.vx) * a;
        s.vy += (uy * speed * 0.6 - s.vy) * a;
        // ゆらぎ（ホバリング中の小さな動き）
        s.vy += Math.sin(now / 700 + seed(f.id, 7) * 6) * (k === "bottom" || k === "crawl" ? 0 : 0.6) * dt * 10;
        s.x = clamp(s.x + s.vx * dt, w / 2 + 2, W - w / 2 - 2);
        s.y = clamp(s.y + s.vy * dt, 18, H - 28);
        // 向き：一定以上の速さで横に進んだ時だけ変える（イカの後ろ向き移動は向きを変えない）
        if (Math.abs(s.vx) > 6 && !s.back) s.dir = Math.sign(s.vx);
        if (s.back && Math.abs(s.vx) > 6) s.dir = -Math.sign(s.vx);
        s.face += (s.dir - s.face) * Math.min(1, dt * (k === "school" ? 5 : 3));
        draw(f, s, k);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [fish]);

  return (
    <div className="tank" ref={box} aria-label="水槽">
      {children}
      {fish.map((f) => {
        const z = seed(f.id, 5);
        return (
          <button
            key={f.id}
            className="swimmer2"
            style={{ zIndex: 2 + Math.round(z * 10), filter: z < 0.35 ? "saturate(0.8) brightness(0.92)" : undefined }}
            onClick={() => onPick(f.id)}
            aria-label={`${f.species} ${f.sizeCm ?? ""}cm`}
            ref={(b) => {
              if (!b) return void els.current.delete(f.id);
              els.current.set(f.id, { outer: b, orient: b.firstElementChild as HTMLElement, sprite: b.firstElementChild!.firstElementChild as HTMLElement });
            }}
          >
            <span className="orient">
              {f.photo ? (
                // 写真の魚：後ろ3分の1（尾の側）を別に振って泳いでいるように見せる
                <span className={`fs-swim photo k-${kindOf(f.species)}`} style={{ width: wOf(f, z), height: wOf(f, z) * f.photo.aspect }}>
                  <img src={f.photo.url} alt="" className="ph-front" draggable={false} />
                  <img src={f.photo.url} alt="" className="ph-tail" draggable={false} />
                </span>
              ) : (
                <span className={`fs-swim k-${kindOf(f.species)}`}>
                  <FishSprite species={f.species} width={wOf(f, z)} />
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
