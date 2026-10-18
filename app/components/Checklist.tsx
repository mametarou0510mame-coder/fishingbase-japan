"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  slug: string;
  noChum: boolean;
  sakura: boolean;
  lifeRequired: boolean;
  ferry: boolean;
  hasFee: boolean;
  closeByMonth?: (number | null)[];
  cautions: string[]; // 竿の本数など、持ち物に関わるルール
};

type Item = { id: string; label: string; note?: string };

// 釣り場のルール・季節・営業時間から作る持ち物リスト。チェックはこの端末のブラウザだけに保存する。
export default function Checklist(p: Props) {
  const key = `tsuredoki:check:${p.slug}`;
  const [month, setMonth] = useState<number | null>(null);
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    setMonth(new Date(Date.now() + 9 * 3600e3).getUTCMonth() + 1);
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (Array.isArray(v)) setChecked(v);
    } catch {
      /* 読めない環境では空のまま */
    }
  }, [key]);

  const items = useMemo(() => {
    const list: Item[] = [
      {
        id: "life",
        label: p.sakura ? "ライフジャケット（桜マーク・CSマーク付き）" : "ライフジャケット",
        note: p.sakura ? "マークのないものは使えません" : p.lifeRequired ? "着用していないと入場できません" : "必ず着用しましょう",
      },
      { id: "rod", label: "竿・リール" },
      { id: "rig", label: "仕掛け（予備も多めに）" },
      { id: "bait", label: "エサ", note: "釣具店で前日までに買うと安心です" },
    ];
    if (!p.noChum) list.push({ id: "chum", label: "アミエビ（撒き餌）とカゴ", note: "サビキ釣りをする場合" });
    list.push(
      { id: "cooler", label: "クーラーボックスと氷" },
      { id: "tool", label: "ハサミ・プライヤー・フィッシュグリップ" },
      { id: "towel", label: "タオル・ウェットティッシュ" },
      { id: "trash", label: "ゴミ袋", note: "ゴミは必ず持ち帰りましょう" },
      { id: "drink", label: "飲み物" },
    );
    if (p.hasFee) list.push({ id: "fee", label: p.ferry ? "渡船代" : "利用料", note: "料金は基本情報をご確認ください" });
    if (month !== null) {
      const close = p.closeByMonth?.[month - 1];
      if (close == null || close >= 19) list.push({ id: "light", label: "ヘッドライト", note: "夕方以降まで釣る場合" });
      if (month >= 6 && month <= 9)
        list.push({ id: "summer", label: "帽子・日焼け止め・多めの飲み物", note: "熱中症に注意" });
      if (month >= 11 || month <= 3) list.push({ id: "winter", label: "防寒着・手袋・カイロ", note: "海辺は風で冷えます" });
    }
    return list;
  }, [p, month]);

  const toggle = (id: string) => {
    const next = checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id];
    setChecked(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* 保存できない環境では画面上だけで動く */
    }
  };
  const reset = () => {
    setChecked([]);
    try {
      localStorage.removeItem(key);
    } catch {
      /* 何もしない */
    }
  };
  const done = items.filter((i) => checked.includes(i.id)).length;

  return (
    <div className="checklist">
      <p className="small">
        {done}/{items.length} 準備済み。チェックはこの端末に保存されます。
      </p>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <label>
              <input type="checkbox" checked={checked.includes(i.id)} onChange={() => toggle(i.id)} />
              <span className="cl-label">{i.label}</span>
              {i.note && <span className="small">（{i.note}）</span>}
            </label>
          </li>
        ))}
      </ul>
      {(p.noChum || p.cautions.length > 0) && (
        <ul className="cl-caution">
          {p.noChum && <li>この釣り場は撒き餌（コマセ）が禁止です。アミエビやカゴは持って行かないでください。</li>}
          {p.cautions.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
      <button type="button" className="fav" onClick={reset}>チェックをすべて外す</button>
    </div>
  );
}
