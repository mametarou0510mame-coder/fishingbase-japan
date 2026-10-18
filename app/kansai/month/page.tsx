import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "月別：関西で釣れる魚",
  description: "関西の海釣りで、月ごとに狙いやすい魚をまとめています。",
};

export default function MonthIndex() {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  return (
    <>
      <h1>月別：関西で釣れる魚</h1>
      <p className="lead">行きたい月を選ぶと、その月に狙いやすい魚と釣り方の目安を確認できます。</p>
      <div className="cards months">
        {months.map((m) => (
          <Link key={m} href={`/kansai/month/${m}/`} className="card card-link">
            <h3>{m}月</h3>
          </Link>
        ))}
      </div>
    </>
  );
}
