/**
 * ConfirmModal.jsx
 * Modal konfirmasi reusable untuk aksi: Approve, Reject, Delete, dan Buat Surat Jalan.
 *
 * Props:
 * - type     : "approve" | "reject" | "delete" | "surat_jalan"
 * - transfer : objek transfer
 * - onConfirm: (data?) => void  — untuk reject, data = { reason: string }
 * - onCancel : () => void
 * - loading  : boolean
 */
import { useState } from "react";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const CONFIG = {
  approve: {
    title: "Konfirmasi",
    icon: "✓",
    iconBg: "bg-green-100 text-green-700",
    headerBg: "bg-green-700",
    confirmText: "Setuju",
    confirmCls: "bg-green-700 hover:bg-green-800 text-white",
    cancelText: "Batal",
    desc: (t) => {
      const totalQty = (t.items ?? []).reduce((s, i) => s + i.qty, 0);
      return `Stok akan <strong>dipindah sekarang</strong> dari <strong>${LOCATION_LABELS[t.from_location]}</strong> ke <strong>${LOCATION_LABELS[t.to_location]}</strong>. Total <strong>${totalQty} pcs</strong>. Aksi ini tidak bisa dibatalkan.`;
    },
  },
  reject: {
    title: "Konfirmasi",
    icon: "✗",
    iconBg: "bg-red-100 text-red-700",
    headerBg: "bg-red-700",
    confirmText: "Tolak",
    confirmCls: "bg-red-600 hover:bg-red-700 text-white",
    cancelText: "Batal",
    desc: (t) =>
      `Transfer <strong>${t.transfer_no}</strong> akan ditolak. Stok tidak berubah. Masukkan alasan penolakan (opsional):`,
    hasReason: true,
  },
  delete: {
    title: "Hapus Transfer",
    icon: "🗑",
    iconBg: "bg-red-100 text-red-700",
    headerBg: "bg-[#1A1918]",
    confirmText: "Hapus",
    confirmCls: "bg-red-600 hover:bg-red-700 text-white",
    cancelText: "Batal",
    desc: (t) =>
      `Hapus surat jalan <strong>${t.transfer_no}</strong>? Transfer ini akan dihapus permanen.`,
  },
  surat_jalan: {
    title: "Buat Surat Jalan",
    icon: "📄",
    iconBg: "bg-blue-100 text-blue-700",
    headerBg: "bg-[#1A1918]",
    confirmText: "Simpan",
    confirmCls: "bg-[#CAB170] hover:bg-[#A8925A] text-white",
    cancelText: "Ubah",
    desc: (t) => {
      const totalQty = (t.items ?? []).reduce((s, i) => s + i.qty, 0);
      const rows = (t.items ?? [])
        .slice(0, 5)
        .map(
          (i) =>
            `${i.kode} ${i.size}${i.warna ? ` (${i.warna})` : ""}: ${i.qty} pcs`,
        )
        .join("<br/>");
      const more =
        (t.items ?? []).length > 5
          ? `<br/>+ ${t.items.length - 5} item lainnya`
          : "";
      return `Dari <strong>${LOCATION_LABELS[t.from_location]}</strong> ke <strong>${LOCATION_LABELS[t.to_location]}</strong>.<br/>Total <strong>${totalQty} pcs</strong>.<br/><br/>${rows}${more}`;
    },
  },
};

export default function ConfirmModal({
  type,
  transfer,
  onConfirm,
  onCancel,
  loading,
}) {
  const [reason, setReason] = useState("");

  if (!transfer || !type) return null;
  const cfg = CONFIG[type];
  if (!cfg) return null;

  const totalQty = (transfer.items ?? []).reduce((s, i) => s + i.qty, 0);

  function handleConfirm() {
    if (cfg.hasReason) {
      onConfirm({ reason });
    } else {
      onConfirm();
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <div className="absolute inset-0" onClick={onCancel} />

      <div className="relative bg-skin-card w-full max-w-sm mx-auto border-2 border-skin-bdr shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className={`${cfg.headerBg} px-4 py-3 flex items-center justify-between`}
        >
          <span className="text-sm tracking-[0.1em] uppercase text-white font-medium">
            {cfg.title}
          </span>
          <button
            onClick={onCancel}
            className="text-white/60 hover:text-white transition text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          {/* Icon + No surat */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 ${cfg.iconBg}`}
            >
              {cfg.icon}
            </div>
            <div>
              <p className="font-mono font-bold text-[#CAB170] text-base">
                {transfer.transfer_no}
              </p>
              <p className="text-xs text-skin-text3">
                {formatDate(transfer.created_at)}
              </p>
            </div>
          </div>

          {/* Deskripsi */}
          <p
            className="text-sm text-skin-text2 leading-relaxed mb-4"
            dangerouslySetInnerHTML={{ __html: cfg.desc(transfer) }}
          />

          {/* Summary arah + qty */}
          {(type === "approve" || type === "surat_jalan") && (
            <div className="bg-skin-raised border border-skin-bdr px-4 py-3 flex items-center justify-between mb-4 text-sm">
              <span className="font-semibold text-skin-text">
                {LOCATION_LABELS[transfer.from_location]}
              </span>
              <span className="text-[#CAB170] font-bold text-lg">→</span>
              <span className="font-semibold text-skin-text">
                {LOCATION_LABELS[transfer.to_location]}
              </span>
              <span className="text-skin-text3 text-xs ml-2">
                {totalQty} pcs
              </span>
            </div>
          )}

          {/* Alasan reject */}
          {cfg.hasReason && (
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Alasan penolakan (opsional)..."
              rows={3}
              className="w-full bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition resize-none mb-4"
            />
          )}

          {/* Tombol */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="py-3 text-sm tracking-[0.08em] uppercase font-semibold text-skin-text3 border border-skin-bdr hover:text-skin-text hover:border-skin-text transition disabled:opacity-40"
            >
              {cfg.cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`py-3 text-sm tracking-[0.08em] uppercase font-semibold transition disabled:opacity-40 ${cfg.confirmCls}`}
            >
              {loading ? "Memproses..." : cfg.confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
