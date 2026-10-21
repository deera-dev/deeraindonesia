const LABEL = { instagram: "IG", tiktok: "TikTok" };
const CLS = { instagram: "text-pink-500", tiktok: "text-skin-text2" };

export default function SosmedLinks({ items, linked = true, className = "" }) {
  if (!items?.length) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] ${className}`}>
      {items.map((s) =>
        linked ? (
          <a
            key={`${s.platform}-${s.handle}`}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className={`${CLS[s.platform]} hover:underline`}
          >
            {LABEL[s.platform]} @{s.handle}
          </a>
        ) : (
          <span key={`${s.platform}-${s.handle}`} className={CLS[s.platform]}>
            {LABEL[s.platform]} @{s.handle}
          </span>
        ),
      )}
    </div>
  );
}
