/**
 * ConfigGroupHeader.jsx — header kategori kecil untuk daftar Harga Dasar.
 * Reuse pola `labelCls` yang sudah ada (uppercase, tracking lebar).
 */
export default function ConfigGroupHeader({ label }) {
  return (
    <p className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mt-5 mb-2 first:mt-0">
      {label}
    </p>
  );
}
