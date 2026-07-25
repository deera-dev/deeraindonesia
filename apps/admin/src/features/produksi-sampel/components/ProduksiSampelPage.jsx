/**
 * ProduksiSampelPage.jsx — /produksi/sampel
 */
import { useState } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { useAuth } from "@deera/shared/features/auth/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import ProduksiLayout from "../../../shared/components/ProduksiLayout";
import {
  useSampels,
  useUpdateSampel,
  useCreateSampels,
  useSaveBatchDecisions,
  useDeleteSampel,
} from "../hooks";
import { fmtDate } from "../utils";
import SampelCard from "./SampelCard";
import SampelForm from "./SampelForm";

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
        </div>
      </div>

      {/* Belum diputuskan: 2 tombol */}
      {!decision.choice && (
        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
          <button
            onClick={() => onDecision({ ...decision, choice: "approve" })}
            className="py-2.5 flex items-center justify-center gap-1.5 border border-emerald-500/40 text-emerald-600 text-xs font-editorial tracking-[0.08em] uppercase hover:bg-emerald-500/10 transition"
          >
            ✓ Terima
          </button>
          <button
            onClick={() => onDecision({ ...decision, choice: "reject" })}
            className="py-2.5 flex items-center justify-center gap-1.5 border border-red-400/40 text-red-500 text-xs font-editorial tracking-[0.08em] uppercase hover:bg-red-500/10 transition"
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
            className={inputCls + " focus:border-[#CAB170]"}
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
            className="w-full py-3.5 bg-[#CAB170] text-white font-editorial text-sm tracking-[0.12em] uppercase hover:bg-[#A8925A] disabled:opacity-50 transition"
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

// ── Filter tabs ───────────────────────────────────────────────────────────────
const TABS = [
  { key: "all",      label: "Semua"    },
  { key: "draft",    label: "Menunggu" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Ditolak"  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProduksiSampelPage() {
  const { user } = useAuth();
  const { sampels, loading } = useSampels();
  const updateSampel = useUpdateSampel();
  const createSampels = useCreateSampels();
  const saveBatchDecisions = useSaveBatchDecisions();
  const deleteSampelFn = useDeleteSampel();

  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [reviewBatch, setReviewBatch] = useState(null);    // array sampel untuk review
  const [decisions, setDecisions] = useState({});          // { [id]: { choice, catatan, alasan } }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── Save (buat/edit) ──────────────────────────────────────────────────────
  // Foto sudah diupload di form → onSave menerima URL langsung
  async function handleSave(data, urls) {
    setSaving(true);
    try {
      if (editTarget) {
        // Edit: data = { nama, tanggal }, urls = string[]
        await updateSampel({
          id: editTarget.id,
          nomor: editTarget.nomor,
          nama: data.nama,
          tanggal: data.tanggal,
          foto: urls,
        });
        toast.success("Sampel diperbarui ✓");
      } else {
        // Create: data = [{ nama, tanggal }], urls = [[url,...], ...]
        const inserted = await createSampels(
          data,
          urls,
          user?.email,
          user?.user_metadata?.full_name ?? user?.email,
        );
        toast.success(`${inserted.length} sampel dibuat ✓`);
      }
      setShowForm(false);
      setEditTarget(null);
    } catch (err) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Buka review modal: cari semua anggota batch ───────────────────────────
  function handleReviewClick(sampel) {
    const batch =
      sampel.batch_id
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
      toast.error("Pilih terima atau tolak dulu");
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
      const rejected = toProcess.filter(([, d]) => d.choice === "reject").length;
      const parts = [];
      if (approved) parts.push(`${approved} disetujui`);
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

  const filtered =
    filter === "all" ? sampels : sampels.filter((s) => s.status === filter);

  const addBtn = (
    <button
      onClick={() => { setEditTarget(null); setShowForm(true); }}
      className="px-4 py-2 bg-[#CAB170] text-white text-xs font-editorial tracking-[0.15em] uppercase hover:bg-[#A8925A] transition"
    >
      + Sampel
    </button>
  );

  return (
    <ProduksiLayout title="Sampel" headerAction={addBtn}>
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {TABS.map((t) => {
          const count =
            t.key === "all"
              ? sampels.length
              : sampels.filter((s) => s.status === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 text-xs font-editorial tracking-[0.1em] uppercase border transition ${
                filter === t.key
                  ? "border-[#CAB170] text-[#CAB170]"
                  : "border-skin-bdr text-skin-text3 hover:text-skin-text"
              }`}
            >
              {t.label}
              {count > 0 && <span className="ml-1 opacity-50">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-16">Memuat...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-sm text-skin-text3">
            {filter === "all" ? "Belum ada sampel." : `Tidak ada sampel "${filter}".`}
          </p>
          {filter === "all" && (
            <button
              onClick={() => { setEditTarget(null); setShowForm(true); }}
              className="text-xs text-[#CAB170] hover:underline font-editorial tracking-[0.1em] uppercase"
            >
              Buat sampel pertama
            </button>
          )}
        </div>
      ) : (
        /* CSS multi-column masonry di lg+ (bukan grid) — SampelCard adalah
           accordion (expand/collapse foto per sampel), tinggi variatif
           per item, lihat catatan yang sama di StokOpnamePage.jsx. */
        <div className="space-y-3 lg:space-y-0 lg:columns-2 lg:gap-3">
          {filtered.map((s) => (
            <div key={s.id} className="lg:break-inside-avoid lg:mb-3">
              <SampelCard
                sampel={s}
                onEdit={(sp) => { setEditTarget(sp); setShowForm(true); }}
                onReview={handleReviewClick}
                onDelete={setDeleteTarget}
              />
            </div>
          ))}
        </div>
      )}


      {/* Form modal */}
      {showForm && (
        <FormModal
          title={editTarget ? "Edit Sampel" : "Sampel Baru"}
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
    </ProduksiLayout>
  );
}
