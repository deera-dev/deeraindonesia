export default function TabHeader({ title, onAdd }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-editorial text-xs tracking-[0.2em] uppercase text-skin-text3">{title}</h3>
      {onAdd && (
        <button
          onClick={onAdd}
          className="font-editorial text-xs tracking-[0.15em] uppercase text-skin-accent-text hover:text-skin-accent-text transition"
        >
          + Tambah
        </button>
      )}
    </div>
  );
}
