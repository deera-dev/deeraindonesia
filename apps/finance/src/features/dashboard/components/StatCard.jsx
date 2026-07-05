/** StatCard.jsx — Kartu statistik kecil di Dashboard (klik untuk navigasi). */
export default function StatCard({ label, value, sub, color = "text-skin-text", onClick }) {
  return (
    <div
      className={`bg-skin-card border border-skin-bdr p-4 space-y-1 ${onClick ? "cursor-pointer hover:border-[#CAB170] transition" : ""}`}
      onClick={onClick}
    >
      <p className="font-editorial text-[10px] tracking-[0.18em] uppercase text-skin-text3">{label}</p>
      <p className={`font-headline text-xl leading-none ${color}`}>{value}</p>
      {sub && <p className="font-editorial text-xs text-skin-text3">{sub}</p>}
    </div>
  );
}
