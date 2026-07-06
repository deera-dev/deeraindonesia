export default function StatCard({ label, value, sub, accent, warn }) {
  // Panjang value ≤ 8 karakter → text-2xl; lebih → text-lg agar tidak overflow
  const str = String(value ?? "");
  const valueCls = str.length > 8 ? "text-lg" : "text-2xl";
  return (
    <div className="bg-skin-card border border-skin-bdr p-4 min-w-0">
      <p className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 truncate">{label}</p>
      <p
        className={`${valueCls} font-bold mt-1 leading-tight break-words ${
          accent ? "text-[#CAB170]" : warn ? "text-amber-500" : "text-skin-text"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-skin-text3 mt-0.5">{sub}</p>}
   </div>
  );
}
