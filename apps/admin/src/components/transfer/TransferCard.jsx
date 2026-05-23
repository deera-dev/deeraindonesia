/**
 * TransferCard.jsx
 * Kartu satu transfer di daftar halaman Transfer.
 *
 * Props:
 * - transfer    : objek transfer
 * - currentUser : user dari useAuth()
 * - onApprove   : (transfer) => void
 * - onReject    : (transfer) => void
 * - onDelete    : (transfer) => void
 * - onSuratJalan: (transfer) => void
 */
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";

function formatDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_CONFIG = {
  pending: {
    label: "Menunggu",
    dot: "bg-amber-400",
    badge: "text-amber-700 bg-amber-50 border-amber-200",
  },
  approved: {
    label: "Disetujui",
    dot: "bg-green-500",
    badge: "text-green-700 bg-green-50 border-green-200",
  },
  rejected: {
    label: "Ditolak",
    dot: "bg-red-500",
    badge: "text-red-700 bg-red-50 border-red-200",
  },
};

export default function TransferCard({
  transfer,
  currentUser,
  onApprove,
  onReject,
  onDelete,
  onEdit,
  onSuratJalan,
}) {
  const cfg = STATUS_CONFIG[transfer.status] ?? STATUS_CONFIG.pending;
  const fromLabel =
    LOCATION_LABELS[transfer.from_location] ?? transfer.from_location;
  const toLabel = LOCATION_LABELS[transfer.to_location] ?? transfer.to_location;
  const totalQty = (transfer.items ?? []).reduce((s, i) => s + (i.qty ?? 0), 0);
  const isPending = transfer.status === "pending";

  // Approver tidak boleh sama dengan pembuat (best practice, tapi bisa diubah)
  const isCreator = currentUser?.email === transfer.created_by;

  return (
    <div className="bg-skin-card border border-skin-bdr overflow-hidden">
      {/* ── Header ── */}
      <div className="px-4 py-3 flex items-start justify-between gap-3 border-b border-skin-bdr-lt">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
            <span className="font-mono text-sm font-bold text-skin-text">
              {transfer.transfer_no}
            </span>
            <span
              className={`text-xs px-2 py-0.5 border font-semibold tracking-wide ${cfg.badge}`}
            >
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-skin-text3 mt-1">
            {formatDateTime(transfer.created_at)}
          </p>
        </div>

        {/* Arah transfer */}
        <div className="flex items-center gap-1.5 flex-shrink-0 text-sm">
          <span className="font-semibold text-skin-text">{fromLabel}</span>
          <span className="text-[#CAB170] font-bold">→</span>
          <span className="font-semibold text-skin-text">{toLabel}</span>
        </div>
      </div>

      {/* ── Items ── */}
      <div className="px-4 py-2.5 space-y-1">
        {(transfer.items ?? []).slice(0, 4).map((item, idx) => (
          <div
            key={idx}
            className="flex justify-between uppercase items-center text-sm"
          >
            <span className="text-skin-text2">
              <span className="font-semibold uppercase">{item.kode}</span>{" "}
              {item.size}
              {item.warna && (
                <span className="text-skin-text3"> · {item.warna}</span>
              )}
            </span>
            <span className="text-skin-text font-bold">{item.qty} pcs</span>
          </div>
        ))}
        {(transfer.items ?? []).length > 4 && (
          <p className="text-xs text-skin-text4">
            + {transfer.items.length - 4} item lainnya
          </p>
        )}
        <div className="flex justify-between items-center pt-1 border-t border-skin-bdr-lt mt-1">
          <span className="text-xs text-skin-text4 uppercase tracking-wide">
            Total
          </span>
          <span className="font-bold text-skin-text">{totalQty} pcs</span>
        </div>
      </div>

      {/* Keterangan */}
      {transfer.notes && (
        <div className="px-4 pb-2.5">
          <p className="text-xs text-skin-text3 italic">{transfer.notes}</p>
        </div>
      )}

      {/* Info approval */}
      {transfer.status === "approved" && transfer.approved_by && (
        <div className="px-4 pb-2.5">
          <p className="text-xs text-green-600">
            ✓ Disetujui oleh{" "}
            <span className="uppercase">
              {transfer.approved_by.replace("@deera.id", "")}
            </span>{" "}
            · {formatDateTime(transfer.approved_at)}
          </p>
        </div>
      )}

      {/* ── Tombol aksi ── */}
      <div className="border-t border-skin-bdr-lt px-4 py-2.5 flex items-center gap-3">
        {/* Surat jalan */}
        <button
          onClick={() => onSuratJalan(transfer)}
          className="text-xs text-skin-text3 hover:text-[#CAB170] transition font-medium tracking-wide uppercase flex items-center gap-1"
        >
          Surat Jalan
        </button>

        {isPending && isCreator && (
          <>
            <span className="text-skin-bdr">|</span>
            <span className="text-xs text-amber-600 font-medium italic">
              Menunggu approval
            </span>
            <span className="text-skin-bdr">|</span>
            <button
              onClick={() => onEdit?.(transfer)}
              className="text-xs text-blue-400 hover:text-blue-600 transition font-medium tracking-wide uppercase"
            >
              Edit
            </button>
          </>
        )}

        {isPending && !isCreator && (
          <>
            <span className="text-skin-bdr">|</span>

            <button
              onClick={() => onApprove(transfer)}
              className="text-xs text-green-600 hover:text-green-700 transition font-medium tracking-wide uppercase"
            >
              ✓ Approve
            </button>

            <span className="text-skin-bdr">|</span>

            <button
              onClick={() => onReject(transfer)}
              className="text-xs text-red-400 hover:text-red-600 transition font-medium tracking-wide uppercase"
            >
              ✗ Tolak
            </button>

            <span className="text-skin-bdr">|</span>

            <button
              onClick={() => onEdit?.(transfer)}
              className="text-xs text-blue-400 hover:text-blue-600 transition font-medium tracking-wide uppercase"
            >
              Edit
            </button>
          </>
        )}

        {/* Hapus — tersedia untuk semua status */}
        <button
          onClick={() => onDelete(transfer)}
          className="ml-auto text-skin-text4 hover:text-red-500 transition text-base"
          title="Hapus transfer"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
