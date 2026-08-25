/**
 * PengirimanCard.jsx
 * Kartu satu pengiriman di daftar tab "Pengiriman".
 *
 * Props:
 * - pengiriman   : objek pengiriman
 * - onSuratJalan : (pengiriman) => void
 * - onEdit       : (pengiriman) => void
 * - onDelete     : (pengiriman) => void
 */
import { fmtDate } from "../utils";

export default function PengirimanCard({ pengiriman, onSuratJalan, onEdit, onDelete }) {
  return (
    <div className="bg-skin-card border border-skin-bdr overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between gap-3 border-b border-skin-bdr-lt">
        <div className="min-w-0">
          <span className="font-mono text-sm font-bold text-skin-text">
            {pengiriman.pengiriman_no}
          </span>
          <p className="text-xs text-skin-text3 mt-1">{fmtDate(pengiriman.tanggal)}</p>
        </div>
        <span className="text-xs px-2 py-0.5 border font-semibold tracking-wide text-skin-text3 border-skin-bdr uppercase flex-shrink-0">
          {pengiriman.nama_ekspedisi}
        </span>
      </div>

      {/* Info — semua value di-uppercase juga via CSS (permintaan Denny
          2026-08 "semua bagian uppercase, dari input sampai jadi image") —
          data baru sudah tersimpan uppercase dari PengirimanForm, tapi
          class `uppercase` di sini jadi lapisan kedua utk record LAMA yang
          masih mixed-case di database. */}
      <div className="px-4 py-2.5 space-y-1 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-skin-text4 uppercase text-xs tracking-wide">Penerima</span>
          <span className="text-skin-text font-semibold uppercase">{pengiriman.nama_penerima}</span>
        </div>
        {pengiriman.no_telp_penerima && (
          <div className="flex justify-between items-center">
            <span className="text-skin-text4 uppercase text-xs tracking-wide">No. Telp</span>
            <span className="text-skin-text2 uppercase">{pengiriman.no_telp_penerima}</span>
          </div>
        )}
        {pengiriman.alamat && (
          <div className="flex justify-between items-start gap-3">
            <span className="text-skin-text4 uppercase text-xs tracking-wide flex-shrink-0">
              Alamat
            </span>
            <span className="text-skin-text2 text-right uppercase">{pengiriman.alamat}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-skin-text4 uppercase text-xs tracking-wide">Jumlah Karung</span>
          <span className="text-skin-text uppercase font-bold">{pengiriman.jumlah_karung} KARUNG</span>
        </div>
        {pengiriman.isi_karung && (
          <p className="text-xs text-skin-text3 italic pt-1 uppercase">{pengiriman.isi_karung}</p>
        )}
      </div>

      {/* Aksi */}
      <div className="border-t border-skin-bdr-lt px-4 py-2.5 flex items-center gap-3">
        <button
          onClick={() => onSuratJalan(pengiriman)}
          className="text-xs text-skin-text3 hover:text-[#CAB170] transition font-medium tracking-wide uppercase"
        >
          Surat Jalan
        </button>
        <span className="text-skin-bdr">|</span>
        <button
          onClick={() => onEdit(pengiriman)}
          className="text-xs text-blue-400 hover:text-blue-600 transition font-medium tracking-wide uppercase"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(pengiriman)}
          className="ml-auto text-skin-text4 hover:text-red-500 transition text-base"
          title="Hapus pengiriman"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
