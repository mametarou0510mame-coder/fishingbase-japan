"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// 閲覧した日の月（日本時間）のまとめページへリンクする
export default function ThisMonthLink() {
  const [month, setMonth] = useState<number | null>(null);
  useEffect(() => {
    setMonth(new Date(Date.now() + 9 * 3600 * 1000).getUTCMonth() + 1);
  }, []);
  if (month === null) return <Link href="/kansai/month/">月別：関西で釣れる魚 →</Link>;
  return <Link href={`/kansai/month/${month}/`}>{month}月に関西で釣れる魚 →</Link>;
}
