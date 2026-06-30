/** TabHeader.jsx — Judul tab + tombol "+ Tambah" opsional. */
export default function TabHeader({ title, onAdd }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-editorial text-xs tracking-[0.2em] uppercase text-skin-text3">{title}</h3>
      {onAdd && (
        <button onClick={onAdd} className="font-editorial text-xs tracking-[0.15em] uppercase text-[#CAB170] hover:text-[#A8925A] transition">
          + Tambah
        </button>
      )}
    </div>
  );
}
