import { fmtRp } from "../../../shared/lib/format";

/** TotalBar.jsx — Bar ringkasan total (gold), dipakai di akhir tiap tab tim. */
export default function TotalBar({ label, value }) {
  return (
    <div className="bg-skin-gold border border-skin-bdr-gold px-4 py-3 flex items-center justify-between gap-2">
      <span className="font-editorial text-xs tracking-[0.15em] uppercase text-skin-text2">{label}</span>
      <span className="font-headline text-[#CAB170] text-lg">{fmtRp(value)}</span>
    </div>
  );
}
