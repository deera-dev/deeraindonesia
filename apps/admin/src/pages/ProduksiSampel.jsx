/**
 * ProduksiSampel.jsx — /produksi/sampel
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { uploadImage } from "@deera/shared/lib/cloudinary";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { useAuth } from "@deera/shared/hooks/useAuth";
import { toast } from "@deera/shared/lib/toast";
import BackToTop from "@deera/shared/components/BackToTop";
import ProduksiLayout from "../components/produksi/ProduksiLayout";
import SampelCard from "../components/sampel/SampelCard";
import SampelForm from "../components/sampel/SampelForm";
import { buildNomor, buildWAApprovalRequest, fmtDate } from "../components/sampel/sampelUtils";

// ── Form modal ────────────────────────────────────────────────────────────────
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

// ── Approval modal — pilih dulu Terima/Tolak, baru muncul form + 1 tombol ──────
function ApprovalModal({ sampel, onApprove, onReject, onClose, loading }) {
  const [fotoIdx, setFotoIdx] = useState(0);
  const [choice, setChoice] = useState(null); // null | "approve" | "reject"
  const [perubahan, setPerubahan] = useState("");
  const [alasan, setAlasan] = useState("");
  const fotos = sampel.foto ?? [];

  const inputCls =
    "w-full px-3 py-2 bg-skin-raised border border-skin-bdr text-sm font-editorial text-skin-text placeholder:text-skin-text4 focus:outline-none focus:border-[#CAB170] transition resize-none";

  function shareWA() {
    const text = buildWAApprovalRequest(sampel);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  // ── Foto gallery (compact jika sudah pilih, full jika belum) ──
  const FotoGallery = ({ compact = false }) =>
    fotos.length > 0 ? (
      <div className={`bg-skin-raised ${compact ? "border-b border-skin-bdr-lt" : "border-b border-skin-bdr"}`}>
        <img
          src={cldUrl(fotos[fotoIdx], { width: 700 })}
          className={`w-full object-contain ${compact ? "max-h-40" : "max-h-64"}`}
          alt={`foto ${fotoIdx + 1}`}
        />
        {fotos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none px-3 py-2">
            {fotos.map((url, i) => (
              <button
                key={i}
                onClick={() => setFotoIdx(i)}
                className={`shrink-0 w-10 h-14 border-2 overflow-hidden transition ${
                  i === fotoIdx ? "border-[#CAB170]" : "border-transparent opacity-40 hover:opacity-70"
                }`}
              >
                <img src={cldUrl(url, { width: 80, height: 112, crop: "fill" })} className="w-full h-full object-cover" alt="" />
              </button>
            ))}
          </div>
        )}
      </div>
    ) : (
      <div className="bg-skin-raised border-b border-skin-bdr py-6 flex items-center justify-center">
        <p className="text-xs text-skin-text4 font-editorial">Tidak ada foto</p>
      </div>
    );

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[92dvh] flex flex-col border-2 border-skin-bdr shadow-xl">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-skin-bdr-lt">
          {choice ? (
            <button
              onClick={() => setChoice(null)}
              className="flex items-center gap-1.5 text-skin-text3 hover:text-skin-text transition"
            >
              <span className="text-base leading-none">←</span>
              <span className="font-editorial text-xs tracking-[0.15em] uppercase">
                {choice === "approve" ? "Terima" : "Tolak"}
              </span>
            </button>
          ) : (
            <div className="min-w-0">
              <h2 className="font-editorial text-sm tracking-[0.18em] uppercase text-skin-text2 truncate">
                {sampel.nama}
              </h2>
              <p className="text-[10px] text-skin-text3 mt-0.5">
                {sampel.nomor} · {fmtDate(sampel.tanggal)}
              </p>
            </div>
          )}
          <button onClick={onClose} className="shrink-0 ml-3 text-skin-text3 hover:text-skin-text text-xl leading-none transition">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STATE: pilih Terima / Tolak ── */}
          {!choice && (
            <>
              <FotoGallery />
              <div className="px-4 py-4 space-y-4">
                {/* Share WA */}
                <button
                  onClick={shareWA}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-emerald-500/40 text-emerald-600 text-sm font-editorial tracking-[0.1em] uppercase hover:bg-emerald-500/10 transition"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.121 1.535 5.856L.057 24l6.305-1.654A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.366l-.36-.214-3.733.979 1.001-3.635-.235-.373A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
                  </svg>
                  Kirim ke WA untuk Approval
                </button>

                <div className="border-t border-skin-bdr-lt pt-4 space-y-2">
                  <p className="font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3 text-center">
                    Keputusan Approval
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setChoice("approve")}
                      className="py-4 flex flex-col items-center gap-2 border-2 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 transition"
                    >
                      <span className="text-2xl">✓</span>
                      <span className="font-editorial text-xs tracking-[0.1em] uppercase">Terima</span>
                    </button>
                    <button
                      onClick={() => setChoice("reject")}
                      className="py-4 flex flex-col items-center gap-2 border-2 border-red-400/40 text-red-500 hover:bg-red-500/10 transition"
                    >
                      <span className="text-2xl">✗</span>
                      <span className="font-editorial text-xs tracking-[0.1em] uppercase">Tolak</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── STATE: Terima → catatan perubahan ── */}
          {choice === "approve" && (
            <>
              <FotoGallery compact />
              <div className="px-4 py-4 space-y-3 pb-6">
                <label className="block font-editorial text-xs tracking-[0.15em] uppercase text-skin-text2">
                  Catatan Perubahan
                </label>
                <p className="text-xs text-skin-text3">
                  Kosongkan jika sampel sesuai referensi. Isi jika ada perbedaan yang perlu dicatat.
                </p>
                <textarea
                  rows={4}
                  value={perubahan}
                  onChange={(e) => setPerubahan(e.target.value)}
                  placeholder="cth. Warna diubah ke navy, kerung leher diperbesar 1cm..."
                  className={inputCls}
                  autoFocus
                />
                {perubahan.trim() ? (
                  <p className="text-[10px] text-amber-500">⚠ Ada perubahan dari referensi</p>
                ) : (
                  <p className="text-[10px] text-emerald-600">✓ Sesuai referensi sampel</p>
                )}
              </div>
            </>
          )}

          {/* ── STATE: Tolak → alasan ── */}
          {choice === "reject" && (
            <>
              <FotoGallery compact />
              <div className="px-4 py-4 space-y-3 pb-6">
                <label className="block font-editorial text-xs tracking-[0.15em] uppercase text-skin-text2">
                  Alasan Penolakan *
                </label>
                <textarea
                  rows={4}
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  placeholder="Tuliskan alasan penolakan sampel..."
                  className={inputCls.replace("focus:border-[#CAB170]", "focus:border-red-400")}
                  autoFocus
                />
              </div>
            </>
          )}
        </div>

        {/* Footer — 1 tombol, muncul setelah pilih */}
        {choice && (
          <div className="shrink-0 px-4 py-4 border-t border-skin-bdr-lt">
            {choice === "approve" ? (
              <button
                onClick={() => onApprove(perubahan.trim())}
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 text-white font-editorial text-sm tracking-[0.12em] uppercase hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {loading ? "Menyimpan..." : "✓ Approve Sampel"}
              </button>
            ) : (
              <button
                onClick={() => onReject(alasan.trim())}
                disabled={loading || !alasan.trim()}
                className="w-full py-3.5 bg-red-500 text-white font-editorial text-sm tracking-[0.12em] uppercase hover:bg-red-600 disabled:opacity-40 disabled:pointer-events-none transition"
              >
                {loading ? "Menyimpan..." : "Tolak Sampel"}
              </button>
            )}
          </div>
        )}
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
        <h3 className="font-editorial text-sm tracking-[0.18em] uppercase text-skin-text2">Hapus Sampel</h3>
        <p className="text-sm text-skin-text">
          Hapus <span className="font-semibold">{sampel.nama}</span>? Tidak bisa dibatalkan.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 border border-skin-bdr text-xs font-editorial uppercase text-skin-text3 disabled:opacity-40 transition">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-[2] py-2.5 bg-red-500 text-white text-xs font-editorial uppercase hover:bg-red-600 disabled:opacity-50 transition">
            {loading ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Filter tabs ───────────────────────────────────────────────────────────────
const TABS = [
  { key: "all", label: "Semua" },
  { key: "draft", label: "Menunggu" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Ditolak" },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProduksiSampel() {
  const { user } = useAuth();
  const [sampels, setSampels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sampel")
      .select("*")
      .order("created_at", { ascending: false });
    setSampels(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave(data, fotos) {
    setSaving(true);
    try {
      const existingUrls = fotos.filter((f) => f.type === "url").map((f) => f.url);
      const newFiles = fotos.filter((f) => f.type === "file");
      const payload = { nama: data.nama, tanggal: data.tanggal, foto: existingUrls };

      let savedId = editTarget?.id ?? null;
      if (editTarget) {
        const { error } = await supabase
          .from("sampel")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editTarget.id);
        if (error) throw error;
      } else {
        const { data: ins, error } = await supabase
          .from("sampel")
          .insert({
            ...payload,
            nomor: buildNomor(),
            status: "draft",
            created_by: user?.email,
            created_by_name: user?.user_metadata?.full_name ?? user?.email,
          })
          .select("id")
          .single();
        if (error) throw error;
        savedId = ins.id;
      }

      setShowForm(false);
      setEditTarget(null);
      setSaving(false);
      await load();

      if (newFiles.length > 0 && savedId) {
        toast(`Sampel ${editTarget ? "diperbarui" : "dibuat"} · mengupload ${newFiles.length} foto...`);
        try {
          const newUrls = await Promise.all(newFiles.map((f) => uploadImage(f.file).then((r) => r.url)));
          await supabase
            .from("sampel")
            .update({ foto: [...existingUrls, ...newUrls], updated_at: new Date().toISOString() })
            .eq("id", savedId);
          await load();
          toast("Foto berhasil diupload ✓");
        } catch (uploadErr) {
          toast("Sampel tersimpan, upload foto gagal: " + uploadErr.message, "error");
        }
      } else {
        toast(editTarget ? "Sampel diperbarui" : "Sampel dibuat");
      }
    } catch (err) {
      toast("Gagal menyimpan: " + err.message, "error");
      setSaving(false);
    }
  }

  // ── Approve ───────────────────────────────────────────────────────────────
  async function handleApprove(perubahan) {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("sampel").update({
        status: "approved",
        sesuai_sampel: !perubahan,
        perubahan: perubahan || null,
        approved_by: user?.email,
        approved_at: now,
        updated_at: now,
      }).eq("id", reviewTarget.id);
      if (error) throw error;
      toast("Sampel disetujui ✓");
      setReviewTarget(null);
      await load();
    } catch (err) {
      toast("Gagal approve: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Reject ────────────────────────────────────────────────────────────────
  async function handleReject(reason) {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("sampel").update({
        status: "rejected",
        rejected_by: user?.email,
        rejected_at: now,
        rejection_note: reason,
        updated_at: now,
      }).eq("id", reviewTarget.id);
      if (error) throw error;
      toast("Sampel ditolak");
      setReviewTarget(null);
      await load();
    } catch (err) {
      toast("Gagal menolak: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    setSaving(true);
    try {
      const { error } = await supabase.from("sampel").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast("Sampel dihapus");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast("Gagal menghapus: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  const filtered = filter === "all" ? sampels : sampels.filter((s) => s.status === filter);

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
      {/* Filter tabs — flex-wrap agar tidak x-scroll */}
      <div className="flex flex-wrap gap-1 mb-4">
        {TABS.map((t) => {
          const count = t.key === "all" ? sampels.length : sampels.filter((s) => s.status === t.key).length;
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
        <div className="space-y-3">
          {filtered.map((s) => (
            <SampelCard
              key={s.id}
              sampel={s}
              onEdit={(sp) => { setEditTarget(sp); setShowForm(true); }}
              onReview={setReviewTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <BackToTop />

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

      {reviewTarget && (
        <ApprovalModal
          sampel={reviewTarget}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setReviewTarget(null)}
          loading={saving}
        />
      )}

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
