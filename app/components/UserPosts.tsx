"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Post = { id: number; date: string; species: string; sizeCm: number | null; count: number | null; method: string | null; timeBand: string | null };

// 釣り場ページの「みんなの釣果」（投稿をその場で読み込んで表示する）
export default function UserPosts({ spot, enabled }: { spot: string; enabled: boolean }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    fetch(`/api/posts?spot=${encodeURIComponent(spot)}&days=14`)
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((d) => setPosts(d.posts ?? []))
      .catch(() => setPosts([]));
  }, [spot, enabled]);
  if (!enabled) return null;
  return (
    <div className="user-posts">
      {posts === null && <p className="small">読み込み中…</p>}
      {posts && posts.length === 0 && <p className="small">直近2週間の投稿はまだありません。最初の釣果を投稿してみませんか。</p>}
      {posts && posts.length > 0 && (
        <ul className="small">
          {posts.slice(0, 15).map((p) => (
            <li key={p.id}>
              {p.date.slice(5).replace("-", "/")}　{p.species}
              {p.sizeCm != null && ` ${p.sizeCm}cm`}
              {p.count != null && ` ${p.count}匹`}
              {(p.method || p.timeBand) && `（${[p.method, p.timeBand].filter(Boolean).join("・")}）`}
            </li>
          ))}
        </ul>
      )}
      <p>
        <Link href={`/post/?spot=${spot}`} className="post-link">この釣り場の釣果を投稿する</Link>
      </p>
      <p className="small">利用者からの投稿で、当サイトでは内容を確認していません。</p>
    </div>
  );
}
