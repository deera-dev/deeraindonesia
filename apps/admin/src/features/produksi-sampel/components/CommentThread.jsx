/**
 * CommentThread.jsx — Diskusi/komentar per Planning (permintaan Denny 2026-09:
 * "saya ingin ini beneran dipakai untuk planing ... bisa diskusi nambahin
 * komen, ada notif kalau ada yang bikin komen, intinya bisa membantu untuk
 * planing"). Dipakai di dalam PlanningDetailModal.jsx (tab "Diskusi").
 *
 * Fitur (hasil diskusi lewat AskUserQuestion, semua dipilih Denny):
 * - Diskusi umum per planning (list komentar + input teks).
 * - Kirim foto balasan di komentar (upload via uploadMedia, pola sama
 *   dengan PlanningForm.jsx/SampelForm.jsx).
 * - Tag/mention orang tertentu — dipilih dari dropdown autocomplete
 *   (bukan hasil parsing regex teks bebas) supaya tidak ambigu kalau nama
 *   mengandung spasi. Ketik "@" untuk memicu dropdown.
 * - Komentar nempel ke foto tertentu — picker horizontal foto sampel
 *   (bahan/model/hasil jadi), tap untuk pilih/batal sebelum kirim.
 *
 * Hapus komentar: hanya pemilik sendiri (canDeleteComment di utils.js).
 */
import { useRef, useState } from "react";
import { useAuth } from "@deera/shared/features/auth/hooks";
import { useProfiles } from "@deera/shared/features/profiles/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { friendlyMediaErrorMessage, uploadMedia } from "@deera/shared/lib/mediaUpload";
import { formatTime } from "../../history/utils";
import { useAddComment, useComments, useDeleteComment, useReadsBySampel } from "../hooks";
import {
  buildMentionProfiles,
  buildReadByNames,
  canDeleteComment,
  formatDisplayName,
  splitMentionSegments,
} from "../utils";
import PhotoLightbox from "../../../shared/components/PhotoLightbox";

function mkId() {
  return Math.random().toString(36).slice(2, 9);
}

// ── Satu bubble komentar ──────────────────────────────────────────────────────
// `reads` diteruskan dari CommentThread. Riwayat perubahan indikator ini
// (permintaan Denny 2026-09, berturut-turut):
// 1. "saya bisa cek chat Haikalfwz sudah dibaca oleh Denny, begitupun semua
//    chat yang lain" — indikator per-pesan, generik semua user.
// 2. "saya mau ada info aja yang baca dan yang sudah terkirim, bukan ceklis
//    aja" — nama HARUS terlihat sbg teks, bukan cuma di `title`/hover (HP
//    tidak punya hover).
// 3. "kan jelas pesan haikalfwz saya sudah baca, tapi ga ada infonya saya
//    telah membaca" — viewer SAAT INI TIDAK di-exclude lagi dari daftar
//    nama (yang tetap di-exclude cuma penulis pesan itu sendiri).
// 4. "kalau sudah baca semua, bakal numpuk dong, lebih panjang info yang
//    membacanya dari pada pesannya itu sendiri, ... saya ingin tetap bisa
//    mengetahui siapa saja yang sudah membaca" — makin banyak yang baca,
//    nama makin numpuk & lebih panjang dari pesannya. Solusi: tampilan
//    DEFAULT ringkas (✓/✓✓ + jumlah pembaca), nama lengkap baru muncul
//    kalau di-KLIK (bukan hover — tetap jalan di HP/tablet, dan tidak makan
//    tempat selama belum diminta).
function CommentBubble({ comment, profiles, currentUserEmail, reads, onDelete, onZoom }) {
  const [showReaders, setShowReaders] = useState(false);
  const segments = splitMentionSegments(comment.text, profiles);
  const readByNames = buildReadByNames(reads, comment.created_at, comment.user_email);
  const isRead = readByNames.length > 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-skin-text truncate">
          {formatDisplayName(comment.user_name || comment.user_email)}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-skin-text4">{formatTime(comment.created_at)}</span>
          {canDeleteComment(comment, currentUserEmail) && (
            <button
              type="button"
              onClick={() => onDelete(comment)}
              className="text-[10px] text-red-400 hover:text-red-600 font-editorial uppercase tracking-[0.08em] transition"
            >
              Hapus
            </button>
          )}
        </div>
      </div>

      {comment.target_foto_url && (
        <button
          type="button"
          onClick={() => onZoom(comment.target_foto_url)}
          className="flex items-center gap-1.5 text-[10px] text-skin-text3 hover:text-skin-text transition"
        >
          <img
            src={cldUrl(comment.target_foto_url, { width: 60, height: 60, crop: "fill" })}
            className="w-6 h-6 object-cover border border-skin-bdr"
            alt=""
          />
          membalas foto ini
        </button>
      )}

      {comment.text && (
        <p className="text-sm text-skin-text whitespace-pre-wrap break-words">
          {segments.map((seg, i) =>
            seg.isMention ? (
              <span key={i} className="text-[#CAB170] font-semibold">
                {seg.text}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </p>
      )}

      {comment.image_url && (
        <button type="button" onClick={() => onZoom(comment.image_url)}>
          <img
            src={cldUrl(comment.image_url, { width: 240 })}
            className="max-h-40 border border-skin-bdr object-cover"
            alt=""
          />
        </button>
      )}

      {/* Info terkirim/dibaca — RINGKAS by default (centang + jumlah
          pembaca), supaya tidak numpuk makin panjang dari pesannya sendiri
          begitu makin banyak yang baca. Nama lengkap baru muncul kalau
          di-KLIK (bukan hover — tetap jalan di HP/tablet). */}
      <div className="flex justify-end">
        <button
          type="button"
          data-testid={`msg-read-${comment.id}`}
          onClick={() => isRead && setShowReaders((v) => !v)}
          className={`text-[10px] italic ${isRead ? "text-sky-400 cursor-pointer hover:underline" : "text-skin-text4 cursor-default"}`}
        >
          {isRead ? `✓✓${readByNames.length > 1 ? ` ${readByNames.length}` : ""}` : "✓ Terkirim"}
        </button>
      </div>
      {isRead && showReaders && (
        <p className="text-[10px] text-sky-400 text-right italic">
          Dibaca oleh {readByNames.join(", ")}
        </p>
      )}
    </div>
  );
}

export default function CommentThread({ sampel }) {
  const { user } = useAuth();
  const { profiles: rawProfiles } = useProfiles();
  // "All" pseudo-profile di paling atas + profil asli dgn nama sudah
  // di-format (Title Case, no domain) — satu sumber dipakai konsisten utk
  // dropdown, insert ke teks, DAN highlight regex (lihat utils.js).
  const profiles = buildMentionProfiles(rawProfiles);
  const { comments, loading } = useComments(sampel.id);
  const { addComment, adding } = useAddComment();
  const deleteComment = useDeleteComment();
  const { reads } = useReadsBySampel(sampel.id);
  const textareaRef = useRef(null);

  // "Dibaca oleh" (permintaan Denny 2026-09: "info untuk mengetahui siapa
  // saja yang sudah membaca chat tersebut") — siapa saja (termasuk viewer
  // saat ini, lihat catatan di CommentBubble di atas soal "kan jelas ...
  // saya sudah baca, tapi ga ada infonya") yang last_read_at-nya sudah >=
  // komentar TERAKHIR di thread ini, artinya sudah baca sampai pesan paling
  // baru. Yang di-exclude cuma penulis komentar TERAKHIR itu sendiri (kalau
  // dia sendiri yang nulis, percuma bilang dia "sudah membaca" pesannya
  // sendiri). Kosong kalau belum ada komentar sama sekali.
  const lastComment = comments[comments.length - 1];
  const readByNames = buildReadByNames(reads, lastComment?.created_at, lastComment?.user_email);

  const [text, setText] = useState("");
  const [photo, setPhoto] = useState(null); // {id, type, preview, url, pct, errMsg}
  const [targetFoto, setTargetFoto] = useState(null);
  const [mentionQuery, setMentionQuery] = useState(null); // string|null
  const [mentions, setMentions] = useState([]); // [{email, full_name}]
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Foto per-bahan (bisa lebih dari 1, permintaan Denny 2026-09) + fallback
  // `bahan_foto` legacy kalau bahan_items kosong/tanpa foto per-item — sama
  // seperti SampelCard.jsx.
  const bahanItemsForPhotos = sampel.bahan_items ?? [];
  const bahanFotos =
    bahanItemsForPhotos.length > 0
      ? bahanItemsForPhotos.map((b, i) => b.foto ?? (i === 0 ? sampel.bahan_foto : null)).filter(Boolean)
      : [sampel.bahan_foto].filter(Boolean);
  const allPhotos = [...bahanFotos, ...(sampel.model_foto ?? []), ...(sampel.foto ?? [])].filter(
    Boolean,
  );

  function handleTextChange(e) {
    const val = e.target.value;
    setText(val);
    const cursor = e.target.selectionStart ?? val.length;
    const uptoCursor = val.slice(0, cursor);
    const match = uptoCursor.match(/@([^\s@]*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function pickMention(profile) {
    const cursor = textareaRef.current?.selectionStart ?? text.length;
    const uptoCursor = text.slice(0, cursor);
    const replaced = uptoCursor.replace(/@([^\s@]*)$/, `@${profile.full_name} `);
    setText(replaced + text.slice(cursor));
    setMentionQuery(null);
    setMentions((prev) =>
      prev.some((m) => m.email === profile.email) ? prev : [...prev, profile],
    );
  }

  function handlePhotoInput(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const item = { id: mkId(), type: "ready", preview: URL.createObjectURL(file), pct: 0 };
    setPhoto(item);
    uploadMedia(file, {
      kind: "image",
      onProgress: (pct) =>
        setPhoto((p) => (p?.id === item.id ? { ...p, type: "uploading", pct } : p)),
      onStatus: (status) =>
        setPhoto((p) =>
          p?.id === item.id && (status === "compressing" || status === "uploading")
            ? { ...p, type: status }
            : p,
        ),
    })
      .then((result) => setPhoto((p) => (p?.id === item.id ? { ...p, type: "done", url: result.url } : p)))
      .catch((err) =>
        setPhoto((p) =>
          p?.id === item.id ? { ...p, type: "error", errMsg: friendlyMediaErrorMessage(err) } : p,
        ),
      );
  }

  const photoBusy = photo?.type === "uploading" || photo?.type === "compressing";
  const canSend = (!!text.trim() || photo?.type === "done") && !photoBusy && !adding;

  // Mention final: hanya yang namanya masih ada persis di teks (kalau user
  // manual hapus/edit "@Nama" setelah dipilih dari dropdown, jangan tetap
  // dikirim notif mention untuk nama yang sudah tidak ada).
  const activeMentions = mentions.filter((m) => text.includes(`@${m.full_name}`));

  async function handleSend() {
    if (!canSend) return;
    try {
      await addComment({
        sampelId: sampel.id,
        sampelNomor: sampel.nomor,
        sampelNama: sampel.nama,
        text: text.trim() || null,
        imageUrl: photo?.type === "done" ? photo.url : null,
        targetFotoUrl: targetFoto,
        mentions: activeMentions.map((m) => m.email),
        userEmail: user?.email,
        userName: formatDisplayName(user?.user_metadata?.full_name || user?.email),
      });
      setText("");
      setPhoto(null);
      setTargetFoto(null);
      setMentions([]);
    } catch (err) {
      toast.error("Gagal mengirim komentar: " + err.message);
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await deleteComment(deleteTarget.id, sampel.id);
      setDeleteTarget(null);
    } catch (err) {
      toast.error("Gagal menghapus: " + err.message);
    } finally {
      setDeleting(false);
    }
  }

  const filteredProfiles =
    mentionQuery !== null
      ? profiles
          .filter((p) => p.full_name?.toLowerCase().includes(mentionQuery.toLowerCase()))
          .slice(0, 5)
      : [];

  return (
    <div className="flex flex-col h-full">
      {/* List komentar */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {loading ? (
          <p className="text-xs text-skin-text3 text-center py-8">Memuat komentar...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-skin-text3 text-center py-8">
            Belum ada diskusi. Mulai komentar pertama.
          </p>
        ) : (
          comments.map((c) => (
            <CommentBubble
              key={c.id}
              comment={c}
              profiles={profiles}
              currentUserEmail={user?.email}
              reads={reads}
              onDelete={setDeleteTarget}
              onZoom={setLightboxUrl}
            />
          ))
        )}
        {/* "Dibaca oleh" (permintaan Denny 2026-09) — org lain yang sudah
            baca sampai komentar paling baru di thread ini. */}
        {readByNames.length > 0 && (
          <p
            data-testid="thread-read-summary"
            className="text-[10px] text-skin-text4 text-right italic"
          >
            ✓✓ Dibaca oleh {readByNames.join(", ")}
          </p>
        )}
      </div>

      {/* Picker "balas ke foto" */}
      {allPhotos.length > 0 && (
        <div className="shrink-0 border-t border-skin-bdr-lt px-4 py-2 space-y-1.5">
          <p className="text-[9px] font-editorial tracking-[0.12em] uppercase text-skin-text4">
            Balas ke foto (opsional)
          </p>
          <div className="flex gap-1.5 overflow-x-auto">
            {allPhotos.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => setTargetFoto((t) => (t === url ? null : url))}
                className={`shrink-0 w-10 h-12 border-2 overflow-hidden transition ${
                  targetFoto === url ? "border-[#CAB170]" : "border-skin-bdr opacity-60"
                }`}
              >
                <img
                  src={cldUrl(url, { width: 80, height: 96, crop: "fill" })}
                  className="w-full h-full object-cover"
                  alt=""
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-skin-bdr px-4 py-3 space-y-2 relative">
        {filteredProfiles.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-1 bg-skin-card border border-skin-bdr shadow-lg max-h-32 overflow-y-auto z-10">
            {filteredProfiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickMention(p)}
                className="w-full text-left px-3 py-2 text-xs text-skin-text hover:bg-skin-raised transition"
              >
                {p.full_name}
              </button>
            ))}
          </div>
        )}

        {photo && (
          <div className="relative inline-block w-14 h-14">
            <img
              src={photo.preview}
              className={`w-full h-full object-cover border border-skin-bdr ${
                photoBusy ? "opacity-60" : ""
              }`}
              alt=""
            />
            {photoBusy && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="text-[8px] text-white">{photo.pct}%</span>
              </div>
            )}
            {photo.type === "error" && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-500/30 p-0.5">
                <p className="text-[7px] text-white text-center leading-tight">{photo.errMsg}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <label className="shrink-0 w-9 h-9 flex items-center justify-center border border-skin-bdr text-skin-text3 hover:text-[#CAB170] hover:border-[#CAB170]/50 cursor-pointer transition">
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="2.5" y="5" width="15" height="11" rx="1.5" />
              <circle cx="10" cy="10.5" r="3" />
              <path d="M7 5l1-2h4l1 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input type="file" accept="image/*" onChange={handlePhotoInput} className="hidden" />
          </label>
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            placeholder="Tulis komentar... gunakan @ untuk mention"
            className="flex-1 resize-none px-3 py-2 bg-skin-raised border border-skin-bdr text-sm text-skin-text placeholder:text-skin-text4 focus:outline-none focus:border-[#CAB170] transition"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="shrink-0 px-4 py-2 bg-[#CAB170] text-white text-xs font-editorial tracking-[0.1em] uppercase hover:bg-[#A8925A] disabled:opacity-40 transition"
          >
            Kirim
          </button>
        </div>
      </div>

      {lightboxUrl && (
        <PhotoLightbox
          images={[cldUrl(lightboxUrl, { width: 1400 })]}
          index={0}
          onClose={() => setLightboxUrl(null)}
          onNavigate={() => {}}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="absolute inset-0" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-skin-card w-full max-w-sm border-2 border-skin-bdr shadow-xl p-5 space-y-4">
            <h3 className="font-editorial text-sm tracking-[0.18em] uppercase text-skin-text2">
              Hapus Komentar
            </h3>
            <p className="text-sm text-skin-text">Hapus komentar ini? Tidak bisa dibatalkan.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2.5 border border-skin-bdr text-xs font-editorial uppercase text-skin-text3 disabled:opacity-40 transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-[2] py-2.5 bg-red-500 text-white text-xs font-editorial uppercase hover:bg-red-600 disabled:opacity-50 transition"
              >
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
