/**
 * BahanCard.jsx — Kartu tampilan satu entri bahan (pembelian/pinjam).
 */
import { useState } from "react";
import JTBadge from "./JTBadge";
import { fmtRp, fmtDateShort } from "./bahanUtils";
import { cldUrl } from "@deera/shared/lib/cloudinary";

export default function BahanCard({
  item,
  isPinjam,
  onEdit,
  onDelete,
  onToggleLunas,
  onSuratJalan,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-skin-card border border-skin-bdr p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-skin-text leading-snug">{item.nama_bahan}</p>
          <p className="text-xs text-skin-text3">
            {Number(item.jumlah)} {item.satuan}
            {item.total_harga > 0 && item.jumlah > 0 && (
              <span> · Rp {Math.round(item.total_harga / item.jumlah).toLocaleString("id-ID")}/{item.satuan}</span>
            )}
            {isPinjam && item.jumlah_warna > 1 ? ` · ${item.jumlah_warna} warna` : ""}
            {item.kode_bahan ? ` · ${item.kode_bahan}` : ""}
          </p>
          {isPinjam && (
            <p className="text-xs text-skin-text3">
              {item.arah_pinjam === "keluar" ? (
                <span className="text-amber-600 font-semibold">↑ Keluar · </span>
              ) : (
                <span className="text-emerald-600 font-semibold">↓ Masuk · </span>
              )}
              dari: <span className="text-skin-text2">{item.nama_pemberi || "—"}</span>
              {item.nama_peminjam ? (
                <>
                  {" "}
                  → <span className="text-skin-text2">{item.nama_peminjam}</span>
                </>
              ) : null}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <JTBadge jatuh_tempo={item.jatuh_tempo} status_bayar={item.status_bayar} />
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 flex items-center justify-center text-skin-text3 hover:text-skin-text border border-skin-bdr transition text-lg leading-none"
            >
              ⋮
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-9 z-50 bg-skin-card border border-skin-bdr shadow-lg w-40 py-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(item);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-skin-text2 hover:text-[#CAB170] transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onToggleLunas(item);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-skin-text2 hover:text-[#CAB170] transition"
                  >
                    {item.status_bayar === "lunas" ? "Tandai Belum Lunas" : "Tandai Lunas"}
                  </button>
                  {isPinjam && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onSuratJalan(item);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-skin-text2 hover:text-[#CAB170] transition"
                    >
                      Surat Jalan
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(item);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:text-red-600 transition"
                  >
                    Hapus
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-skin-text3">
          JT: <span className="text-skin-text2">{fmtDateShort(item.jatuh_tempo)}</span>
        </span>
        <span className="font-semibold text-sm text-[#CAB170]">{fmtRp(item.total_harga)}</span>
      </div>

      {item.catatan && (
        <p className="text-xs text-skin-text3 italic border-t border-skin-bdr-lt pt-1.5">
          {item.catatan}
        </p>
      )}

      {item.foto_url && (
        <div className="border-t border-skin-bdr-lt pt-2">
          <img
            src={cldUrl(item.foto_url, { width: 200, height: 140, crop: "fill" })}
            alt={item.nama_bahan}
            className="w-full max-w-[200px] h-28 object-cover border border-skin-bdr cursor-pointer"
            onClick={() => window.open(item.foto_url, "_blank")}
          />
        </div>
      )}
    </div>
  );
}
