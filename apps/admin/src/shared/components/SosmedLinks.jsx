const LABEL = { instagram: "IG", tiktok: "TikTok", facebook: "FB" };
const CLS = { instagram: "text-pink-500", tiktok: "text-skin-text2", facebook: "text-sky-500" };

export function sosmedLabel(s) {
  if (s.handle) return `${LABEL[s.platform]} @${s.handle}`;
  if (s.query) return `${LABEL[s.platform]}: cari "${s.query}"`;
  return LABEL[s.platform];
}

export default function SosmedLinks({ items, linked = true, className = "", children }) {
  if (!items?.length && !children) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] ${className}`}>
      {children}
      {(items ?? []).map((s) =>
        linked ? (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className={`${CLS[s.platform]} hover:underline`}
          >
            {sosmedLabel(s)}
          </a>
        ) : (
          <span key={s.url} className={CLS[s.platform]}>
            {sosmedLabel(s)}
          </span>
        ),
      )}
    </div>
  );
}
