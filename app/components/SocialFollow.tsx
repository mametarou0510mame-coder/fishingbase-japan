import { SITE } from "@/lib/site";

// Instagram・YouTube へのフォロー導線
export default function SocialFollow({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`follow${compact ? " follow-compact" : ""}`}>
      {!compact && (
        <p className="follow-lead">
          毎日 <b>6:00</b> 今日の釣れる時間／<b>12:00</b> 釣り方ガイド／<b>18:00</b> お得情報／<b>0:00</b> 釣りの豆知識 を動画で配信中
        </p>
      )}
      <div className="follow-buttons">
        <a className="follow-btn ig" href={SITE.instagram} target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
            <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" />
          </svg>
          Instagram
        </a>
        <a className="follow-btn yt" href={SITE.youtube} target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
            <rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" />
            <path d="M10 9 L15.5 12 L10 15 Z" fill="#fff" />
          </svg>
          YouTube
        </a>
      </div>
    </div>
  );
}
