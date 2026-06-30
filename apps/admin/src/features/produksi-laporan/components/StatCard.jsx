export default function StatCard({ label, value, sub, accent, warn }) {
  return (
    <div className="bg-skin-card border border-skin-bdr p-4">
      <p className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 ${
          accent ? "text-[#CAB170]" : warn ? "text-amber-500" : "text-skin-text"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-skin-text3 mt-0.5">{sub}</p>}
    </div>
  );
}
