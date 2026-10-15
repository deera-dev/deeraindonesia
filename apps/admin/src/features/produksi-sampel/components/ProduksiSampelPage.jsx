/**
 * ProduksiSampelPage.jsx — /produksi/sampel
 */
import { useState } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { useAuth } from "@deera/shared/features/auth/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import { useProducts } from "@deera/shared/features/products/hooks";
import ProduksiLayout from "../../../shared/components/ProduksiLayout";
import {
  useSampels,
  useUpdateSampel,
  useCreatePlanning,
  useReorderPlanning,
  useSaveBatchDecisions,
  useDeleteSampel,
  useUnreadCounts,
  useApproveRepeat,
  useLanjutWorkOrder,
  useSetWoSelesai,
  useUpdatePlanning,
} from "../hooks";
import {
  buildReorderUpdates,
  fmtDate,
  nextPlanningUrutan,
  sortPlanningQueue,
  sortWithPinnedFirst,
  repeatCandidates,
  filterByTab,
  distinctBahan,
  filterByBahan,
  repeatFotoFor,
} from "../utils";
import SampelCard from "./SampelCard";
import SampelForm from "./SampelForm";
import PlanningForm from "./PlanningForm";
import PlanningQueueList from "./PlanningQueueList";
import RepeatApproveModal from "./RepeatApproveModal";
import PlanningDetailModal from "./PlanningDetailModal";
import WorkOrderModal from "./WorkOrderModal";

// ── Form modal wrapper ────────────────────────────────────────────────────────
function FormModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[92dvh] flex flex-col border-2 border-skin-bdr shadow-xl">
        <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">
            {title}
          </h2>
          <button onClick={onClose} className="text-skin-text3 hover:text-skin-text text-xl leading-none transition">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

// ── DecisionCard: satu sampel dalam batch review ──────────────────────────────
function DecisionCard({ sampel, decision, onDecision }) {
  const fotos = sampel.foto ?? [];
  const inputCls =
    "w-full px-3 py-2 bg-skin-card border border-skin-bdr text-sm font-editorial text-skin-text placeholder:text-skin-text4 focus:outline-none transition resize-none";

  return (
    <div
      className={`border-2 transition ${
        decision.choice === "approve"
          ? "border-emerald-500/40"
          : decision.choice === "reject"
          ? "border-red-400/40"
          : decision.choice === "ditahan"
          ? "border-amber-500/40"
          : "border-skin-bdr"
      }`}
    >
      {/* Sampel info */}
      <div className="flex items-start gap-3 p-3">
        {fotos[0] && (
          <div className="shrink-0 w-10 h-14 border border-skin-bdr overflow-hidden">
            <img
              src={cldUrl(fotos[0], { width: 80, height: 112, crop: "fill" })}
              className="w-full h-full object-cover"
              alt=""
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm text-skin-text leading-snug">{sampel.nama}</p>
            {decision.choice && (
              <button
                onClick={() => onDecision({ choice: null, catatan: "", alasan: "" })}
                className="shrink-0 text-[10px] text-skin-text3 hover:text-skin-text font-editorial underline transition"
              >
                Ubah
              </button>
            )}
          </div>
          <p className="text-[10px] text-skin-text3 mt-0.5">
            {sampel.nomor} · {fmtDate(sampel.tanggal)}
          </p>
          {decision.choice === "approve" && (
            <p className="text-[10px] text-emerald-600 mt-0.5">✓ Diterima</p>
          )}
          {decision.choice === "reject" && (
            <p className="text-[10px] text-red-400 mt-0.5">✗ Ditolak</p>
          )}
          {decision.choice === "ditahan" && (
            <p className="text-[10px] text-amber-500 mt-0.5">⏸ Ditahan</p>
          )}
        </div>
      </div>

      {/* Belum diputuskan: 3 tombol */}
      {!decision.choice && (
        <div className="grid grid-cols-3 gap-2 px-3 pb-3">
          <button
            onClick={() => onDecision({ ...decision, choice: "approve" })}
            className="py-2.5 flex items-center justify-center gap-1 border border-emerald-500/40 text-emerald-600 text-xs font-editorial tracking-[0.06em] uppercase hover:bg-emerald-500/10 transition"
          >
            ✓ Terima
          </button>
          <button
            onClick={() => onDecision({ ...decision, choice: "ditahan" })}
            className="py-2.5 flex items-center justify-center gap-1 border border-amber-500/40 text-amber-600 text-xs font-editorial tracking-[0.06em] uppercase hover:bg-amber-500/10 transition"
          >
            ⏸ Tahan
          </button>
          <button
            onClick={() => onDecision({ ...decision, choice: "reject" })}
            className="py-2.5 flex items-center justify-center gap-1 border border-red-400/40 text-red-500 text-xs font-editorial tracking-[0.06em] uppercase hover:bg-red-500/10 transition"
          >
            ✗ Tolak
          </button>
        </div>
      )}

      {/* Terima: catatan perubahan */}
      {decision.choice === "approve" && (
        <div className="px-3 pb-3 space-y-1.5">
          <label className="font-editorial text-[10px] tracking-[0.12em] uppercase text-skin-text3">
            Catatan Perubahan
          </label>
          <textarea
            rows={2}
            value={decision.catatan}
            onChange={(e) => onDecision({ ...decision, catatan: e.target.value })}
            placeholder="Kosongkan jika sesuai referensi..."
            className={inputCls + " focus:border-skin-accent"}
          />
        </div>
      )}

      {/* Tolak: alasan */}
      {decision.choice === "reject" && (
        <div className="px-3 pb-3 space-y-1.5">
          <label className="font-editorial text-[10px] tracking-[0.12em] uppercase text-skin-text3">
            Alasan Penolakan *
          </label>
          <textarea
            rows={2}
            value={decision.alasan}
            onChange={(e) => onDecision({ ...decision, alasan: e.target.value })}
            placeholder="Tuliskan alasan..."
            className={inputCls + " focus:border-red-400"}
          />
        </div>
      )}

      {/* Tahan: catatan opsional */}
      {decision.choice === "ditahan" && (
        <div className="px-3 pb-3 space-y-1.5">
          <label className="font-editorial text-[10px] tracking-[0.12em] uppercase text-skin-text3">
            Catatan (opsional)
          </label>
          <textarea
            rows={2}
            value={decision.catatan}
            onChange={(e) => onDecision({ ...decision, catatan: e.target.value })}
            placeholder="cth. tunggu konfirmasi bahan tambahan..."
            className={inputCls + " focus:border-amber-500"}
          />
        </div>
      )}
    </div>
  );
}

// ── BatchApprovalModal ────────────────────────────────────────────────────────
function BatchApprovalModal({ batch, decisions, onDecision, onSave, onClose, loading }) {
  const [sharing, setSharing] = useState(false);

  const decidedCount = Object.values(decisions).filter((d) => d.choice !== null).length;
  const rejectWithoutAlasan = Object.values(decisions).some(
    (d) => d.choice === "reject" && !d.alasan.trim(),
  );
  const canSave = decidedCount > 0 && !rejectWithoutAlasan;

  async function handleShare() {
    setSharing(true);
    const text =
      `📋 Permintaan Approval Sampel\n\n` +
      batch
        .map((s, i) => `${i + 1}. *${s.nama}*\n   ${s.nomor} · ${fmtDate(s.tanggal)}`)
        .join("\n") +
      `\n\nMohon konfirmasi setiap sampel:\n` +
      `✅ Approve → lanjut proses pemotongan\n` +
      `❌ Tolak → dikembalikan dengan catatan`;

    try {
      const files = [];
      for (const s of batch) {
        if (s.foto?.[0]) {
          try {
            const resp = await fetch(cldUrl(s.foto[0], { width: 800 }));
            const blob = await resp.blob();
            const ext = blob.type.includes("png") ? "png" : "jpg";
            files.push(new File([blob], `sampel-${s.nomor}.${ext}`, { type: blob.type }));
          } catch {
            /* skip jika fetch foto gagal */
          }
        }
      }

      if (files.length > 0 && navigator.canShare?.({ files })) {
        await navigator.share({ title: "Approval Sampel", text, files });
      } else if (navigator.share) {
        await navigator.share({ title: "Approval Sampel", text });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
      }
    } catch (err) {
      if (err.name !== "AbortError") toast.error("Gagal berbagi: " + err.message);
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[92dvh] flex flex-col border-2 border-skin-bdr shadow-xl">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-skin-bdr-lt">
          <div>
            <h2 className="font-editorial text-sm tracking-[0.18em] uppercase text-skin-text2">
              Review Sampel{" "}
              <span className="text-skin-text3">({batch.length})</span>
            </h2>
            {decidedCount > 0 && (
              <p className="text-[10px] text-skin-text3 mt-0.5">
                {decidedCount}/{batch.length} diputuskan
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text text-xl leading-none transition"
          >
            ×
          </button>
        </div>

        {/* Body: decision cards + share */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {batch.map((sampel) => (
            <DecisionCard
              key={sampel.id}
              sampel={sampel}
              decision={decisions[sampel.id] ?? { choice: null, catatan: "", alasan: "" }}
              onDecision={(dec) => onDecision(sampel.id, dec)}
            />
          ))}

          {/* Share button */}
          <button
            onClick={handleShare}
            disabled={sharing}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-emerald-500/40 text-emerald-600 text-sm font-editorial tracking-[0.1em] uppercase hover:bg-emerald-500/10 disabled:opacity-50 transition"
          >
            {sharing ? (
              <span className="text-xs">Menyiapkan foto...</span>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Bagikan untuk Approval
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 py-4 border-t border-skin-bdr-lt space-y-2">
          {decidedCount < batch.length && decidedCount > 0 && (
            <p className="text-[10px] text-skin-text3 text-center font-editorial">
              {batch.length - decidedCount} sampel belum diputuskan · akan tetap menunggu
            </p>
          )}
          {rejectWithoutAlasan && (
            <p className="text-[10px] text-red-400 text-center font-editorial">
              ⚠ Isi alasan penolakan yang masih kosong
            </p>
          )}
          <button
            onClick={() => onSave(decisions)}
            disabled={loading}
            className="w-full py-3.5 bg-skin-accent text-skin-on-accent font-editorial text-sm tracking-[0.12em] uppercase hover:bg-skin-accent-hover disabled:opacity-50 transition"
          >
            {loading
              ? "Menyimpan..."
              : decidedCount > 0
              ? `Simpan ${decidedCount} Keputusan`
              : "Pilih terima atau tolak dulu"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────────
function DeleteModal({ sampel, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-sm border-2 border-skin-bdr shadow-xl p-5 space-y-4">
        <h3 className="font-editorial text-sm tracking-[0.18em] uppercase text-skin-text2">
          Hapus Sampel
        </h3>
        <p className="text-sm text-skin-text">
          Hapus <span className="font-semibold">{sampel.nama}</span>? Tidak bisa dibatalkan.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 border border-skin-bdr text-xs font-editorial uppercase text-skin-text3 disabled:opacity-40 transition"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-[2] py-2.5 bg-red-500 text-white text-xs font-editorial uppercase hover:bg-red-600 disabled:opacity-50 transition"
          >
            {loading ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tahapan (stepper) ─────────────────────────────────────────────────────────
// Alur utama = 3 langkah (permintaan Denny 2026-10-15: pakai step, 1 kalimat
// per step). Status lama/di luar alur (Semua, Menunggu Approval, Ditahan,
// Ditolak) jadi tautan kecil di bawah stepper. Key = key filterByTab.
const STEPS = [
  { key: "planning", label: "Rencana" },
  { key: "approved", label: "Work Order" },
  { key: "selesai", label: "Selesai" },
];
const OTHER_TABS = [
  { key: "all", label: "Semua" },
  { key: "draft", label: "Menunggu Approval" },
  { key: "ditahan", label: "Ditahan" },
  { key: "rejected", label: "Ditolak" },
];

const TAB_HINT = {
  all: "Semua yang masih berjalan.",
  planning: "Siapkan rencana sampel.",
  approved: "Buat Work Order potong.",
  selesai: "Arsip Work Order.",
  draft: "Menunggu keputusan.",
  ditahan: "Sedang ditahan.",
  rejected: "Sampel yang ditolak.",
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProduksiSampelPage() {
  const { user } = useAuth();
  const { sampels, loading } = useSampels();
  const updateSampel = useUpdateSampel();
  const createPlanning = useCreatePlanning();
  const reorderPlanning = useReorderPlanning();
  const lanjutWorkOrder = useLanjutWorkOrder();
  const approveRepeat = useApproveRepeat();
  const setWoSelesai = useSetWoSelesai();
  const updatePlanning = useUpdatePlanning();
  const [editPlanTarget, setEditPlanTarget] = useState(null); // sampel yang judul/bahan/foto acuannya diedit
  const { products } = useProducts();
  const saveBatchDecisions = useSaveBatchDecisions();
  const deleteSampelFn = useDeleteSampel();
  // Badge unread di tombol Catatan/Diskusi tiap kartu (permintaan Denny
  // 2026-09) — dihitung sekali di sini (bukan per-kartu) lihat hooks.js.
  const { unreadCounts } = useUnreadCounts(user?.email);

  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showPlanningForm, setShowPlanningForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [bahanFilter, setBahanFilter] = useState(""); // filter berdasarkan bahan di planning
  const [repeatTarget, setRepeatTarget] = useState(null); // planning repeat yang akan di-approve
  const [reviewBatch, setReviewBatch] = useState(null);    // array sampel untuk review
  const [decisions, setDecisions] = useState({});          // { [id]: { choice, catatan, alasan } }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [discussionTarget, setDiscussionTarget] = useState(null); // sampel utk modal Diskusi/Riwayat
  const [workOrderTarget, setWorkOrderTarget] = useState(null);   // sampel approved utk modal Work Order

  // ── Save (edit sampel — Menunggu Review) ──────────────────────────────────
  // Foto sudah diupload di form → onSave menerima URL langsung
  async function handleSave(data, urls) {
    setSaving(true);
    try {
      // Edit: data = { nama, tanggal }, urls = string[]
      await updateSampel({
        id: editTarget.id,
        nomor: editTarget.nomor,
        nama: data.nama,
        tanggal: data.tanggal,
        foto: urls,
      });
      toast.success("Sampel diperbarui ✓");
      setShowForm(false);
      setEditTarget(null);
    } catch (err) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Save Planning baru ────────────────────────────────────────────────────
  // Planning baru selalu ditaruh di PALING BAWAH antrean (prioritas
  // terendah) secara default — admin bisa geser ke atas via drag & drop
  // kalau memang mau dikerjakan lebih dulu (lihat nextPlanningUrutan).
  async function handleSavePlanning(entry, bahanFotoUrl, modelFotoUrls, bahanItems) {
    setSaving(true);
    try {
      await createPlanning(
        entry,
        bahanFotoUrl,
        modelFotoUrls,
        bahanItems,
        nextPlanningUrutan(sampels),
        user?.email,
        user?.user_metadata?.full_name ?? user?.email,
      );
      toast.success("Planning dibuat ✓");
      setShowPlanningForm(false);
    } catch (err) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Edit Planning: judul, tanggal, bahan, foto acuan ──────────────────────
  async function handleUpdatePlanning(entry, _bahanFoto, modelFotoUrls, bahanItems) {
    setSaving(true);
    try {
      await updatePlanning({
        id: editPlanTarget.id,
        nomor: editPlanTarget.nomor,
        nama: entry.nama,
        tanggal: entry.tanggal,
        modelFotoUrls,
        bahanItems,
      });
      toast.success("Planning diperbarui ✓");
      setEditPlanTarget(null);
    } catch (err) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Ubah urutan antrean Planning (drag & drop) ────────────────────────────
  // Tidak pakai `saving`/toast sukses di sini — reorder adalah interaksi
  // ringan & sering (tiap drag), toast sukses tiap kali cuma bikin berisik.
  // Kalau gagal (mis. offline), tetap kasih tahu supaya admin tahu urutan
  // yang kelihatan di layar belum tentu tersimpan.
  async function handleReorderPlanning(orderedIds) {
    try {
      let finalIds = orderedIds;
      if (bahanFilter) {
        // Daftar sedang difilter: susun ulang HANYA posisi item yang tampil,
        // item lain tetap di tempatnya — supaya urutan global tidak kacau.
        const shown = new Set(orderedIds);
        let k = 0;
        finalIds = sortPlanningQueue(sampels).map((sp) => (shown.has(sp.id) ? orderedIds[k++] : sp.id));
      }
      await reorderPlanning(buildReorderUpdates(finalIds));
    } catch (err) {
      toast.error("Gagal menyimpan urutan: " + err.message);
    }
  }

  // ── Lanjut ke Work Order: planning langsung disetujui TANPA foto sampel ──
  // (permintaan Denny 2026-10-15), lalu langsung membuka Work Order potong.
  async function handleLanjutWo(sampel) {
    setSaving(true);
    try {
      const res = await lanjutWorkOrder({ sampel, userEmail: user?.email });
      toast.success("Disetujui ✓ — silakan buat Work Order");
      setWorkOrderTarget({ ...sampel, status: "approved", ...res });
    } catch (err) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Approve Repeat: planning repeat disetujui tanpa sampel baru ───────────
  async function handleApproveRepeat(catatan) {
    if (!repeatTarget) return;
    setSaving(true);
    try {
      await approveRepeat({
        sampel: repeatTarget,
        foto: repeatFotoFor(repeatTarget, products),
        catatan: catatan || null,
        userEmail: user?.email,
      });
      toast.success("Repeat disetujui ✓ — siap dibuatkan Work Order");
      setRepeatTarget(null);
    } catch (err) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Buka review modal: cari semua anggota batch ───────────────────────────
  // Draft dengan batch_id → review bareng anggota batch lain yang masih draft.
  // Ditahan (tinjau ulang) atau draft tanpa batch_id → review sebagai item tunggal.
  function handleReviewClick(sampel) {
    const batch =
      sampel.status === "draft" && sampel.batch_id
        ? sampels.filter(
            (s) => s.batch_id === sampel.batch_id && s.status === "draft",
          )
        : [sampel];
    setReviewBatch(batch);
    const dec = {};
    batch.forEach((s) => {
      dec[s.id] = { choice: null, catatan: "", alasan: "" };
    });
    setDecisions(dec);
  }

  function handleDecision(sampelId, dec) {
    setDecisions((prev) => ({ ...prev, [sampelId]: dec }));
  }

  // ── Simpan keputusan batch ────────────────────────────────────────────────
  async function handleBatchSave(decs) {
    const toProcess = Object.entries(decs).filter(([, d]) => d.choice !== null);

    // Validasi sebelum simpan
    if (toProcess.length === 0) {
      toast.error("Pilih salah satu keputusan dulu");
      return;
    }
    const emptyAlasan = toProcess.some(([, d]) => d.choice === "reject" && !d.alasan.trim());
    if (emptyAlasan) {
      toast.error("Isi alasan penolakan yang masih kosong");
      return;
    }

    setSaving(true);
    try {
      // sampelMap: lookup nomor/nama untuk logHistory — dipassing explicit,
      // bukan lookup internal via queryClient.
      const sampelMap = {};
      reviewBatch.forEach((s) => { sampelMap[s.id] = s; });

      await saveBatchDecisions(decs, sampelMap, user?.email);

      const approved = toProcess.filter(([, d]) => d.choice === "approve").length;
      const ditahan = toProcess.filter(([, d]) => d.choice === "ditahan").length;
      const rejected = toProcess.filter(([, d]) => d.choice === "reject").length;
      const parts = [];
      if (approved) parts.push(`${approved} disetujui`);
      if (ditahan) parts.push(`${ditahan} ditahan`);
      if (rejected) parts.push(`${rejected} ditolak`);
      toast.success(parts.join(" · ") + " ✓");

      setReviewBatch(null);
      setDecisions({});
    } catch (err) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Work Order selesai / kembalikan ───────────────────────────────────────
  async function handleWoSelesai(sampel, selesai) {
    try {
      await setWoSelesai(sampel, selesai);
      toast.success(selesai ? "Work Order selesai ✓ — dipindah ke tab Selesai" : "Dikembalikan ke Disetujui");
    } catch (err) {
      toast.error("Gagal menyimpan: " + err.message);
    }
  }

  // ── Hapus ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    setSaving(true);
    try {
      await deleteSampelFn(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Sampel dihapus");
    } catch (err) {
      toast.error("Gagal menghapus: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const tabItems = filterByTab(sampels, filter);
  const bahanOptions = distinctBahan(tabItems);
  const filteredRaw = filterByBahan(tabItems, bahanFilter);
  const isPlanningTab = filter === "planning";
  // Tab Planning TIDAK pakai urutan `filtered` (created_at desc dari
  // fetchSampels) — pakai antrean urutan sendiri (urutan asc, lihat
  // sortPlanningQueue di utils.js) supaya konsisten dengan PlanningQueueList.
  const planningQueue = isPlanningTab ? filterByBahan(sortPlanningQueue(sampels), bahanFilter) : [];
  // Pin/prioritaskan planning penting (permintaan Denny 2026-09) — hanya
  // berlaku di grid masonry (bukan tab Planning, yang urutannya sudah
  // bermakna lewat drag & drop antrean sendiri).
  const filtered = isPlanningTab ? filteredRaw : sortWithPinnedFirst(filteredRaw);

  // Sinkronkan snapshot modal Diskusi dgn data terbaru (mis. setelah toggle
  // pin) — pola sama seperti markDibuatTarget dkk secara umum stale-snapshot,
  // tapi di sini pin toggle terjadi DI DALAM modal itu sendiri jadi worth it
  // supaya badge pin ikut update tanpa perlu tutup-buka modal lagi.
  const discussionSampel = discussionTarget
    ? sampels.find((s) => s.id === discussionTarget.id) ?? discussionTarget
    : null;

  const addBtn = (
    <button
      onClick={() => setShowPlanningForm(true)}
      className="px-4 py-2 bg-skin-accent text-skin-on-accent text-xs font-editorial tracking-[0.15em] uppercase hover:bg-skin-accent-hover transition"
    >
      + Planning
    </button>
  );

  return (
    <ProduksiLayout title="Planning" headerAction={addBtn}>
      {/* Stepper tahapan: 3 langkah, garis progres terisi sampai langkah aktif */}
      {(() => {
        const activeIdx = STEPS.findIndex((s) => s.key === filter);
        return (
          <ol
            className="flex items-stretch mb-3 lg:max-w-2xl bg-skin-card border border-skin-bdr rounded-2xl p-2 gap-1"
            aria-label="Tahapan sampel"
          >
            {STEPS.map((t, i) => {
              const count = filterByTab(sampels, t.key).length;
              const active = filter === t.key;
              const done = activeIdx > i;
              return (
                <li key={t.key} className="flex-1 min-w-0 relative">
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className={`absolute top-[26px] right-1/2 w-full h-0.5 -z-0 ${activeIdx >= i ? "bg-skin-accent" : "bg-skin-bdr"}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setFilter(t.key)}
                    aria-current={active ? "step" : undefined}
                    className={`relative z-10 w-full flex flex-col items-center gap-1 px-1 py-2.5 rounded-xl transition active:scale-[0.97] ${
                      active ? "bg-skin-gold ring-1 ring-skin-accent" : "hover:bg-skin-raised"
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition ${
                        active
                          ? "bg-skin-accent border-skin-accent text-skin-on-accent shadow-md"
                          : done
                            ? "bg-skin-gold border-skin-accent text-skin-accent-text"
                            : "bg-skin-card border-skin-bdr text-skin-text3"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span className={`text-sm font-semibold leading-tight ${active ? "text-skin-accent-text" : "text-skin-text2"}`}>
                      {t.label}
                    </span>
                    <span className={`text-[11px] leading-none ${active ? "text-skin-accent-text" : "text-skin-text3"}`}>
                      {count} sampel
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        );
      })()}

      {/* Tampilan lain (di luar alur utama) — chip */}
      <div className="flex flex-wrap items-center gap-2 mb-3" role="group" aria-label="Tampilan lain">
        {OTHER_TABS.filter((t) => t.key === "all" || t.key === filter || filterByTab(sampels, t.key).length > 0).map((t) => {
          const on = filter === t.key;
          const n = filterByTab(sampels, t.key).length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition active:scale-95 ${
                on
                  ? "bg-skin-accent border-skin-accent text-skin-on-accent shadow-sm"
                  : "bg-skin-card border-skin-bdr text-skin-text2 hover:border-skin-accent hover:text-skin-accent-text"
              }`}
            >
              <span>{t.label}</span>
              {n > 0 && (
                <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${on ? "bg-black/20" : "bg-skin-raised text-skin-text3"}`}>
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter bahan yang dipakai di planning (permintaan Denny 2026-10-15) */}
      {(bahanOptions.length > 0 || bahanFilter) && (
        <div className="flex items-center gap-2 mb-3">
          <label htmlFor="filter-bahan" className="text-[10px] font-editorial tracking-[0.12em] uppercase text-skin-text3">
            Bahan
          </label>
          <select
            id="filter-bahan"
            value={bahanFilter}
            onChange={(e) => setBahanFilter(e.target.value)}
            className="bg-skin-card border border-skin-bdr px-2.5 py-1.5 text-xs text-skin-text focus:outline-none focus:border-skin-accent"
          >
            <option value="">Semua bahan</option>
            {bahanOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
            {bahanFilter && !bahanOptions.includes(bahanFilter) && <option value={bahanFilter}>{bahanFilter}</option>}
          </select>
          {bahanFilter && (
            <button
              type="button"
              onClick={() => setBahanFilter("")}
              className="text-[10px] font-editorial uppercase tracking-[0.1em] text-skin-text3 hover:text-red-500 underline"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* Penjelasan tab aktif — supaya siapa pun langsung paham tahap ini */}
      <p className="text-sm text-skin-text2 mb-4">{TAB_HINT[filter]}</p>

      {/* List */}
      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-16">Memuat...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-sm text-skin-text3">
            {filter === "all" ? "Belum ada sampel." : "Belum ada di tahap ini."}
          </p>
          {filter === "all" && (
            <button
              onClick={() => setShowPlanningForm(true)}
              className="text-xs text-skin-accent-text hover:underline font-editorial tracking-[0.1em] uppercase"
            >
              Buat planning pertama
            </button>
          )}
        </div>
      ) : isPlanningTab ? (
        /* Tab Planning: antrean berurutan + drag & drop (permintaan Denny
           2026-08) — bukan masonry grid, karena urutannya bermakna (yang
           paling atas = dikerjakan duluan), lihat PlanningQueueList.jsx. */
        <PlanningQueueList
          items={planningQueue}
          onReorder={handleReorderPlanning}
          onEdit={(sp) => { setEditTarget(sp); setShowForm(true); }}
          onEditPlan={setEditPlanTarget}
          onReview={handleReviewClick}
          onDelete={setDeleteTarget}
          onWoSampel={setWorkOrderTarget}
          onLanjutWo={handleLanjutWo}
          onApproveRepeat={setRepeatTarget}
          onOpenDiscussion={setDiscussionTarget}
          unreadCounts={unreadCounts}
        />
      ) : (
        /* CSS multi-column masonry di lg+ (bukan grid) — SampelCard adalah
           accordion (expand/collapse foto per sampel), tinggi variatif
           per item, lihat catatan yang sama di StokOpnamePage.jsx. */
        <div className="space-y-3 lg:space-y-0 lg:columns-2 xl:columns-3 lg:gap-3">
          {filtered.map((s) => (
            <div key={s.id} className="lg:break-inside-avoid lg:mb-3">
              <SampelCard
                sampel={s}
                onEdit={(sp) => { setEditTarget(sp); setShowForm(true); }}
          onEditPlan={setEditPlanTarget}
                onReview={handleReviewClick}
                onDelete={setDeleteTarget}
                onWoSampel={setWorkOrderTarget}
                onLanjutWo={handleLanjutWo}
                onApproveRepeat={setRepeatTarget}
                onOpenDiscussion={setDiscussionTarget}
                onWorkOrder={setWorkOrderTarget}
                onWoSelesai={handleWoSelesai}
                unreadCount={unreadCounts[s.id] ?? 0}
              />
            </div>
          ))}
        </div>
      )}


      {/* Form modal (edit sampel Menunggu Review) */}
      {showForm && (
        <FormModal
          title="Edit Sampel"
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        >
          <SampelForm
            initial={editTarget}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditTarget(null); }}
            saving={saving}
          />
        </FormModal>
      )}

      {/* Planning form modal (buat baru) */}
      {showPlanningForm && (
        <FormModal title="Planning Baru" onClose={() => setShowPlanningForm(false)}>
          <PlanningForm
            onSave={handleSavePlanning}
            repeatOptions={repeatCandidates(products)}
            onCancel={() => setShowPlanningForm(false)}
            saving={saving}
          />
        </FormModal>
      )}

      {/* Edit Planning modal */}
      {editPlanTarget && (
        <FormModal title="Edit Planning" onClose={() => setEditPlanTarget(null)}>
          <PlanningForm
            initial={editPlanTarget}
            onSave={handleUpdatePlanning}
            onCancel={() => setEditPlanTarget(null)}
            saving={saving}
          />
        </FormModal>
      )}

      {/* Approve Repeat modal */}
      {repeatTarget && (
        <RepeatApproveModal
          sampel={repeatTarget}
          fotos={repeatFotoFor(repeatTarget, products)}
          onConfirm={handleApproveRepeat}
          onClose={() => setRepeatTarget(null)}
          saving={saving}
        />
      )}

      {/* Batch review modal */}
      {reviewBatch && (
        <BatchApprovalModal
          batch={reviewBatch}
          decisions={decisions}
          onDecision={handleDecision}
          onSave={handleBatchSave}
          onClose={() => { setReviewBatch(null); setDecisions({}); }}
          loading={saving}
        />
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <DeleteModal
          sampel={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={saving}
        />
      )}

      {/* Diskusi/Riwayat modal (permintaan Denny 2026-09) */}
      {discussionSampel && (
        <PlanningDetailModal sampel={discussionSampel} onClose={() => setDiscussionTarget(null)} />
      )}

      {/* Work Order untuk tukang potong (permintaan Denny 2026-09) */}
      {workOrderTarget && (
        <WorkOrderModal sampel={workOrderTarget} onClose={() => setWorkOrderTarget(null)} />
      )}
    </ProduksiLayout>
  );
}
