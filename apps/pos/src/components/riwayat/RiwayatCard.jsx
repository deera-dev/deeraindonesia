/**
 * RiwayatCard.jsx — Satu baris item di halaman Riwayat POS.
 *
 * Props:
 *   item — objek ternormalisasi dari useRiwayat
 */
import { useState } from "react";
import { getMeta, formatTime, formatRp } from "./riwayatUtils";

export default function RiwayatCard({ item }) {
  const [open, setOpen] = useState(false);
  const meta = getMeta(item.action);

  return (
    <div className="border border-skin-bdr bg-skin-card">
      {/* ── Baris utama ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-skin-gold/10 transition"
      >
        {/* Badge aksi */}
        <span
          className={`flex-shrink-0 mt-0.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${meta.badgeCls}`}
        >
          {meta.label}
        </span>

        {/* Nama / keterangan */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-skin-text leading-snug truncate">
            {item._type === "sale" ? (
              <>
                {item.buyer_name || "Tanpa nama"}
                {item.buyer_hp && <span className="text-skin-text3 ml-1">· {item.buyer_hp}</span>}
              </>
            ) : (
              item.nama || item.kode || "–"
            )}
          </p>
          <p className="text-xs text-skin-text3 mt-0.5">
            {item.user_name && <span className="mr-2">{item.user_name}</span>}
            {formatTime(item.changed_at)}
            {item._type === "sale" && item.location && (
              <span className="ml-2 capitalize">{item.location}</span>
            )}
          </p>
        </div>

        {/* Total (hanya transaksi) */}
        {item._type === "sale" && (
          <span
            className={`flex-shrink-0 text-sm font-medium ${item.action === "retur" ? "text-red-500" : "text-[#CAB170]"}`}
          >
            {item.action === "retur" ? "–" : "+"}
            {formatRp(item.total)}
          </span>
        )}

        {/* Chevron */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`flex-shrink-0 w-4 h-4 text-skin-text4 transition-transform mt-0.5 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ── Detail (collapsible) ── */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-skin-bdr text-sm text-skin-text2 space-y-2">
          {item._type === "sale" ? <SaleDetail item={item} /> : <HistoryDetail item={item} />}
        </div>
      )}
    </div>
  );
}

// ── Detail transaksi penjualan/retur ──────────────────────────────────────────
function SaleDetail({ item }) {
  return (
    <>
      {(item.items ?? []).length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-skin-text3 uppercase tracking-wider">
              <th className="text-left pb-1 font-medium">Produk</th>
              <th className="text-center pb-1 font-medium">Uk</th>
              <th className="text-center pb-1 font-medium">Qty</th>
              <th className="text-right pb-1 font-medium">Harga</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-skin-bdr">
            {item.items.map((it, i) => (
              <tr key={i}>
                <td className="py-1 pr-2 leading-snug">
                  <span className="text-skin-text3">{it.kode}</span>
                  {it.warna && it.warna !== "_" && (
                    <span className="ml-1 text-skin-text3">
                      · {Array.isArray(it.warna)
                          ? it.warna.map(w => w.nama).join("/")
                          : it.warna}
                    </span>
                  )}
                </td>
                <td className="py-1 text-center text-skin-text3">{it.size}</td>
                <td className="py-1 text-center">{it.qty}</td>
                <td className="py-1 text-right">{formatRp(it.harga)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex justify-between pt-1 border-t border-skin-bdr text-sm">
        {item.discount > 0 && (
          <span className="text-skin-text3">Diskon: {formatRp(item.discount)}</span>
        )}
        <span className="ml-auto font-medium text-skin-text">Total: {formatRp(item.total)}</span>
      </div>
    </>
  );
}

// ── Detail audit produk/stok/pelanggan/produksi ───────────────────────────────
function HistoryDetail({ item }) {
  const hasChanges = item.before_snapshot && item.snapshot;
  if (!hasChanges && !item.snapshot && !item.before_snapshot) {
    return <p className="text-skin-text3 text-xs italic">Tidak ada detail tersimpan.</p>;
  }

  // Khusus pelanggan — tampilkan ringkasan perubahan
  if (item.category === "pelanggan") {
    const after = item.snapshot;
    const before = item.before_snapshot;
    if (before && after) {
      return (
        <div className="space-y-1 text-xs">
          {["nama", "no_hp", "alamat"].map((field) => {
            if (before[field] === after[field]) return null;
            return (
              <div key={field} className="flex gap-2">
                <span className="text-skin-text3 capitalize w-14 flex-shrink-0">{field}:</span>
                <span className="line-through text-red-500/70">{before[field] || "–"}</span>
                <span className="text-green-600">→ {after[field] || "–"}</span>
              </div>
            );
          })}
        </div>
      );
    }
    const info = after || before;
    return (
      <div className="text-xs space-y-0.5">
        {info?.nama && (
          <p>
            <span className="text-skin-text3">Nama: </span>
            {info.nama}
          </p>
        )}
        {info?.no_hp && (
          <p>
            <span className="text-skin-text3">No HP: </span>
            {info.no_hp}
          </p>
        )}
        {info?.alamat && (
          <p>
            <span className="text-skin-text3">Alamat: </span>
            {info.alamat}
          </p>
        )}
      </div>
    );
  }

  // Produk — before/after diff untuk edit, ringkasan untuk tambah/hapus
  if (item.category === "produk") {
    const before = item.before_snapshot;
    const after  = item.snapshot;
    const isEditAction = item.action === "edit" && before && after;

    if (isEditAction) {
      // Bandingkan field yang berubah
      const FIELDS = [
        { key: "kode",     label: "Kode" },
        { key: "nama",     label: "Nama" },
        { key: "bahan",    label: "Bahan" },
        { key: "hpp",      label: "HPP",      fmt: formatRp },
      ];

      // Bandingkan variants (harga per ukuran)
      const variantsBefore = (before.variants ?? []).map((v) => `${v.size}: ${formatRp(v.harga)}`).join(" · ") || "–";
      const variantsAfter  = (after.variants  ?? []).map((v) => `${v.size}: ${formatRp(v.harga)}`).join(" · ") || "–";
      const variantChanged = variantsBefore !== variantsAfter;

      // Warna
      const warnaBefore = (before.warna ?? []).join(", ") || "–";
      const warnaAfter  = (after.warna  ?? []).join(", ") || "–";
      const warnaChanged = warnaBefore !== warnaAfter;

      const changedFields = FIELDS.filter((f) => String(before[f.key] ?? "") !== String(after[f.key] ?? ""));
      const hasAnyChange = changedFields.length > 0 || variantChanged || warnaChanged;

      return (
        <div className="text-xs space-y-2">
          <p className="text-skin-text3 uppercase tracking-wide font-semibold">Perubahan</p>
          {!hasAnyChange && <p className="text-skin-text4 italic">Tidak ada perubahan terdeteksi.</p>}
          {changedFields.map(({ key, label, fmt }) => (
            <div key={key}>
              <p className="text-skin-text3 mb-0.5">{label}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="line-through text-red-400">{fmt ? fmt(before[key]) : (before[key] || "–")}</span>
                <span className="text-skin-text4">→</span>
                <span className="text-green-500 font-medium">{fmt ? fmt(after[key]) : (after[key] || "–")}</span>
              </div>
            </div>
          ))}
          {variantChanged && (
            <div>
              <p className="text-skin-text3 mb-0.5">Harga per Ukuran</p>
              <p className="line-through text-red-400">{variantsBefore}</p>
              <p className="text-green-500 font-medium">{variantsAfter}</p>
            </div>
          )}
          {warnaChanged && (
            <div>
              <p className="text-skin-text3 mb-0.5">Warna</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="line-through text-red-400">{warnaBefore}</span>
                <span className="text-skin-text4">→</span>
                <span className="text-green-500 font-medium">{warnaAfter}</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Tambah / Hapus — tampilkan ringkasan
    const snap = after || before;
    return (
      <div className="text-xs space-y-0.5">
        {item.kode && <p><span className="text-skin-text3">Kode: </span>{item.kode}</p>}
        {snap?.nama && <p><span className="text-skin-text3">Nama: </span>{snap.nama}</p>}
        {snap?.bahan && <p><span className="text-skin-text3">Bahan: </span>{snap.bahan}</p>}
        {snap?.hpp != null && <p><span className="text-skin-text3">HPP: </span>{formatRp(snap.hpp)}</p>}
        {snap?.variants?.length > 0 && (
          <p><span className="text-skin-text3">Ukuran: </span>
            {snap.variants.map((v) => `${v.size} ${formatRp(v.harga)}`).join(" · ")}
          </p>
        )}
      </div>
    );
  }

  // Stok opname — tampilkan kode
  if (item.category === "stok" || item.category === "transfer") {
    const snap = item.snapshot;
    return (
      <div className="text-xs space-y-0.5">
        {item.kode && (
          <p>
            <span className="text-skin-text3">Kode/No: </span>
            {item.kode}
          </p>
        )}
        {snap?.from_location && (
          <p>
            <span className="text-skin-text3">Dari: </span>
            {snap.from_location} → {snap.to_location}
          </p>
        )}
      </div>
    );
  }

  // Default fallback
  return (
    <p className="text-xs text-skin-text3">
      {item.kode} {item.nama}
    </p>
  );
}
