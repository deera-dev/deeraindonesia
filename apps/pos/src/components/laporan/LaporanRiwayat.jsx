/**
 * LaporanRiwayat.jsx
 * Audit trail — semua transaksi yang pernah diedit, diurutkan berdasarkan
 * waktu edit terbaru. Setiap entri riwayat menampilkan: editor, waktu, alasan.
 *
 * Props:
 * - sales     : array transaksi dari IndexedDB (semua status)
 * - onDetail  : (sale) => void — buka DetailModal
 */
import { formatHarga } from "@deera/shared/lib/constants";

function formatDT(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function LaporanRiwayat({ sales, onDetail }) {
  // Hanya transaksi yang punya riwayat edit
  const edited = sales
    .filter((s) => (s.edit_history ?? []).length > 0)
    .sort((a, b) => {
      const lastA = a.edit_history.at(-1)?.at ?? "";
      const lastB = b.edit_history.at(-1)?.at ?? "";
      return lastB.localeCompare(lastA); // terbaru di atas
    });

  if (edited.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-white border-2 border-[#E8E3DC] px-6 py-12 text-center">
          <p className="text-4xl mb-4">📋</p>
          <p className="text-lg text-[#1A1918] font-semibold mb-2">Belum ada riwayat edit</p>
          <p className="text-sm text-[#9C9690] leading-relaxed">
            Setiap kali transaksi diedit, riwayatnya akan muncul di sini.<br />
            Tap sebuah transaksi → tombol ✎ Edit → isi alasan → simpan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-sm text-[#9C9690] font-medium">
        {edited.length} transaksi diedit dalam periode ini
      </p>

      {edited.map((sale) => (
        <div key={sale.id} className="bg-white border-2 border-blue-100 overflow-hidden">

          {/* Header transaksi */}
          <button
            onClick={() => onDetail?.(sale)}
            className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-blue-50 transition"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#6B6560]">
                  {new Date(sale.created_at).toLocaleDateString("id-ID", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </span>
                <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 font-medium">
                  {(sale.edit_history ?? []).length}× diedit
                </span>
              </div>
              {sale.buyer_name && (
                <p className="text-base font-semibold text-[#1A1918] mt-0.5">{sale.buyer_name}</p>
              )}
            </div>
            <p className="text-lg font-bold text-[#CAB170] flex-shrink-0" style={{ fontFamily: "'Braise', serif" }}>
              Rp {formatHarga(sale.total)}
            </p>
          </button>

          {/* Entri riwayat */}
          <div className="border-t border-blue-100 divide-y divide-blue-50">
            {(sale.edit_history ?? []).map((h, i) => (
              <div key={i} className="px-4 py-3 bg-[#F8FAFE]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1A1918]">{h.note}</p>
                    <p className="text-xs text-[#9C9690] mt-0.5">{h.by}</p>
                  </div>
                  <p className="text-xs text-[#9C9690] flex-shrink-0 text-right">{formatDT(h.at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
