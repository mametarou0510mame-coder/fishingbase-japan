"use client";
import { useState } from "react";

type Item = { name: string; spec: string; href: string };
type Tier = { tier: string; who: string; budget: string; items: Item[] };

// タックルリスト（初級・中級・上級）の切り替え
export default function TackleTabs({ tiers }: { tiers: Tier[] }) {
  const [i, setI] = useState(0);
  const t = tiers[i];
  return (
    <div className="tackle">
      <div className="chips" role="tablist" aria-label="レベル">
        {tiers.map((x, k) => (
          <button key={x.tier} role="tab" aria-selected={k === i} className={`chip${k === i ? " on" : ""}`} onClick={() => setI(k)}>
            {x.tier}
          </button>
        ))}
      </div>
      <p className="small">
        {t.who}（{t.budget}）
      </p>
      <table className="tackle-table">
        <tbody>
          {t.items.map((it) => (
            <tr key={it.name}>
              <th>{it.name}</th>
              <td>{it.spec}</td>
              <td>
                <a href={it.href} rel="sponsored nofollow noopener" target="_blank">
                  楽天で探す
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
