/**
 * PengirimanForm.jsx
 * Form buat/edit data pengiriman (surat jalan ke ekspedisi).
 *
 * Props:
 * - initialData      : objek pengiriman (mode edit) | undefined (mode buat baru)
 * - prefillPelanggan : objek pelanggan dari "Daftar Penerima" (permintaan
 *                      Denny 2026-08) — HANYA dipakai saat `initialData`
 *                      kosong (mode buat baru), pre-fill Nama Penerima/
 *                      No. Telp/Alamat/Ekspedisi + link `pelangganId`
 *                      langsung, persis seperti kalau user pilih dari
 *                      dropdown autocomplete (lihat handlePickPelanggan).
 * - onClose          : () => void
 * - onSaved          : (pengiriman) => void
 *
 * Semua field teks (Nama Penerima, No. Telp, Alamat, Nama Ekspedisi, Isi
 * Karung, Nama Pengirim manual) di-uppercase LANGSUNG saat diketik/dipilih
 * dari autocomplete (permintaan Denny 2026-08 "saya mau semua bagian
 * uppercase ya, dari input sampai jadi image") — sama seperti pola
 * `onChange={(e) => onChange(e.target.value.toUpperCase())}` di
 * apps/pos/src/features/kasir/components/BuyerInput.jsx. Data yang
 * tersimpan jadi selalu uppercase; PengirimanCard.jsx & SuratJalanPengiriman.jsx
 * TETAP pakai CSS `uppercase`/`textTransform: "uppercase"` juga sebagai
 * lapisan kedua, supaya record LAMA (dibuat sebelum perubahan ini, masih
 * mixed-case di database) tetap tampil uppercase di layar & di gambar
 * surat jalan yang di-export.
 */
import { useEffect, useRef, useState } from "react";
import { useCreatePengiriman, useUpdatePengiriman } from "../hooks";
import { searchPelanggan } from "../../pelanggan";

function todayStr() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

// Pengirim (permintaan Denny 2026-08 "pengirimnya dibuat pasti aja") — dibuat
// PASTI 3 pilihan: DEERA / MARYAM (2 brand, masing-masing pakai logo sendiri
// di surat jalan — lihat SuratJalanPengiriman.jsx) atau Manual (nama bebas,
// TANPA logo). Nilai `nama_pengirim` tersimpan tetap 1 kolom text seperti
// sebelumnya. Label tombol "MARYAM" TAPI teks pengirim yang tersimpan &
// tampil di tanda tangan surat jalan adalah "MARYAM CIDENG" (permintaan
// Denny 2026-08 lanjutan) — PENGIRIM_MODE_VALUES persis dipakai
// SuratJalanPengiriman utk pilih logo, selain itu (Manual) dianggap manual.
const PENGIRIM_MODES = ["DEERA", "MARYAM", "MANUAL"];
const PENGIRIM_MODE_VALUES = { DEERA: "DEERA", MARYAM: "MARYAM CIDENG" };

function resolvePengirimMode(namaPengirim) {
  if (namaPengirim === PENGIRIM_MODE_VALUES.DEERA) return "DEERA";
  if (namaPengirim === PENGIRIM_MODE_VALUES.MARYAM) return "MARYAM";
  return "MANUAL";
}

const inputCls =
  "w-full border border-skin-bdr bg-skin-card text-skin-text px-3 py-2.5 text-sm focus:outline-none focus:border-[#CAB170]";
const labelCls = "block text-xs font-semibold text-skin-text3 uppercase tracking-wide mb-1.5";

export default function PengirimanForm({ initialData, prefillPelanggan, onClose, onSaved }) {
  const isEdit = !!initialData;
  const createPengiriman = useCreatePengiriman();
  const updatePengiriman = useUpdatePengiriman();

  const [tanggal, setTanggal] = useState(initialData?.tanggal ?? todayStr());
  const [namaPenerima, setNamaPenerima] = useState(
    initialData?.nama_penerima ?? (prefillPelanggan?.nama ?? "").toUpperCase(),
  );
  const [noTelpPenerima, setNoTelpPenerima] = useState(
    initialData?.no_telp_penerima ?? (prefillPelanggan?.no_hp ?? "").toUpperCase(),
  );
  const [alamat, setAlamat] = useState(
    initialData?.alamat ?? (prefillPelanggan?.alamat ?? "").toUpperCase(),
  );
  // pelangganId: link ke daftar penerima (tabel `pelanggan`, reuse dari POS —
  // permintaan Denny 2026-08 "ada daftar pelanggan ... bisa langsung
  // dipilih"). null = belum ter-link / diketik manual → api.js akan coba
  // auto-link by nama atau auto-create (lihat resolvePelangganLink di ../api.js).
  const [pelangganId, setPelangganId] = useState(
    initialData?.pelanggan_id ?? prefillPelanggan?.id ?? null,
  );
  const [jumlahKarung, setJumlahKarung] = useState(
    initialData?.jumlah_karung ? String(initialData.jumlah_karung) : "",
  );
  const [isiKarung, setIsiKarung] = useState(initialData?.isi_karung ?? "");
  const [namaEkspedisi, setNamaEkspedisi] = useState(
    initialData?.nama_ekspedisi ?? (prefillPelanggan?.ekspedisi_biasa ?? "").toUpperCase(),
  );
  const [pengirimMode, setPengirimMode] = useState(() =>
    initialData ? resolvePengirimMode(initialData.nama_pengirim ?? "") : "DEERA",
  );
  const [namaPengirimManual, setNamaPengirimManual] = useState(() => {
    const np = initialData?.nama_pengirim ?? "";
    return resolvePengirimMode(np) === "MANUAL" ? np : "";
  });
  const namaPengirim =
    pengirimMode === "MANUAL" ? namaPengirimManual : PENGIRIM_MODE_VALUES[pengirimMode];
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Autocomplete penerima dari daftar pelanggan ─────────────────────────────
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suppressNextSearchRef = useRef(false);
  const penerimaWrapperRef = useRef(null);

  useEffect(() => {
    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false;
      return;
    }
    const q = namaPenerima.trim();
    if (!q) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      searchPelanggan(q)
        .then((res) => {
          if (cancelled) return;
          setSuggestions(res);
          setShowSuggestions(res.length > 0);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [namaPenerima]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!penerimaWrapperRef.current?.contains(e.target)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleNamaPenerimaChange(value) {
    setNamaPenerima(value.toUpperCase());
    setPelangganId(null);
  }

  function handlePickPelanggan(p) {
    suppressNextSearchRef.current = true;
    setNamaPenerima((p.nama ?? "").toUpperCase());
    setNoTelpPenerima((p.no_hp ?? "").toUpperCase());
    setAlamat((p.alamat ?? "").toUpperCase());
    // Ekspedisi biasa cuma prefill kalau field-nya masih kosong — supaya
    // tidak menimpa ekspedisi yang sudah sengaja diketik/diganti user.
    if (p.ekspedisi_biasa && !namaEkspedisi.trim()) {
      setNamaEkspedisi(p.ekspedisi_biasa.toUpperCase());
    }
    setPelangganId(p.id);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        tanggal,
        namaPenerima,
        noTelpPenerima,
        alamat,
        pelangganId,
        jumlahKarung: Number(jumlahKarung),
        isiKarung,
        namaEkspedisi,
        namaPengirim,
      };
      let saved;
      if (isEdit) {
        await updatePengiriman(initialData, payload);
        saved = {
          ...initialData,
          tanggal: payload.tanggal,
          nama_penerima: payload.namaPenerima,
          no_telp_penerima: payload.noTelpPenerima,
          alamat: payload.alamat,
          pelanggan_id: payload.pelangganId,
          jumlah_karung: payload.jumlahKarung,
          isi_karung: payload.isiKarung,
          nama_ekspedisi: payload.namaEkspedisi,
          nama_pengirim: payload.namaPengirim,
        };
      } else {
        saved = await createPengiriman(payload);
      }
      onSaved(saved);
    } catch (err) {
      setError(err.message ?? "Gagal menyimpan pengiriman.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <h2 className="font-headline text-[#CAB170] text-lg">
            {isEdit ? "Edit Pengiriman" : "Pengiriman Baru"}
          </h2>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text transition text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form
          id="pengiriman-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className={labelCls}>Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div ref={penerimaWrapperRef} className="relative">
              <label className={labelCls}>Nama Penerima</label>
              <input
                type="text"
                value={namaPenerima}
                onChange={(e) => handleNamaPenerimaChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className={inputCls}
                placeholder="Nama penerima barang"
                autoComplete="off"
                required
              />
              {pelangganId && (
                <p className="text-[11px] text-[#A8925A] mt-1">✓ Terhubung ke daftar penerima</p>
              )}

              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-skin-card border border-skin-bdr shadow-lg z-20 max-h-56 overflow-y-auto">
                  {suggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePickPelanggan(p)}
                      className="w-full text-left px-3 py-2.5 hover:bg-skin-gold border-b border-skin-bdr-lt last:border-0 transition"
                    >
                      <p className="text-sm font-medium text-skin-text uppercase">{p.nama}</p>
                      {(p.no_hp || p.ekspedisi_biasa) && (
                        <p className="text-xs text-skin-text3 mt-0.5 uppercase">
                          {[p.no_hp, p.ekspedisi_biasa ? `biasa: ${p.ekspedisi_biasa}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {p.alamat && (
                        <p className="text-xs text-skin-text4 mt-0.5 truncate uppercase">{p.alamat}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>No. Telp Penerima</label>
              <input
                type="tel"
                value={noTelpPenerima}
                onChange={(e) => setNoTelpPenerima(e.target.value.toUpperCase())}
                className={inputCls}
                placeholder="08xx-xxxx-xxxx"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Alamat</label>
            <textarea
              value={alamat}
              onChange={(e) => setAlamat(e.target.value.toUpperCase())}
              className={inputCls}
              rows={2}
              placeholder="Alamat lengkap penerima (opsional)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Jumlah Karung</label>
              <input
                type="number"
                min="1"
                value={jumlahKarung}
                onChange={(e) => setJumlahKarung(e.target.value)}
                className={inputCls}
                placeholder="mis. 5"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Nama Ekspedisi</label>
              <input
                type="text"
                value={namaEkspedisi}
                onChange={(e) => setNamaEkspedisi(e.target.value.toUpperCase())}
                className={inputCls}
                placeholder="mis. JNE, J&T"
                required
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Isi Karung</label>
            <textarea
              value={isiKarung}
              onChange={(e) => setIsiKarung(e.target.value.toUpperCase())}
              className={inputCls}
              rows={2}
              placeholder="mis. Gamis dan mukena campur"
            />
          </div>

          <div>
            <label className={labelCls}>Pengirim</label>
            <div className="flex gap-2 flex-wrap">
              {PENGIRIM_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPengirimMode(mode)}
                  className={`px-3 py-1.5 text-xs font-semibold tracking-[0.06em] uppercase transition border ${
                    pengirimMode === mode
                      ? "bg-[#CAB170] text-white border-[#CAB170]"
                      : "border-skin-bdr text-skin-text3 hover:text-skin-text2 hover:border-[#CAB170]"
                  }`}
                >
                  {mode === "MANUAL" ? "Manual" : mode}
                </button>
              ))}
            </div>
            {pengirimMode === "MANUAL" && (
              <input
                type="text"
                value={namaPengirimManual}
                onChange={(e) => setNamaPengirimManual(e.target.value.toUpperCase())}
                className={`${inputCls} mt-2`}
                placeholder="Nama yang mengirim barang"
                required
              />
            )}
            {pengirimMode !== "MANUAL" && (
              <p className="text-[11px] text-skin-text4 mt-1.5">
                Logo {pengirimMode === "DEERA" ? "DEERA" : "MARYAM"} akan dipakai di surat jalan.
              </p>
            )}
          </div>
        </form>

        {/* Footer actions */}
        <div className="flex-shrink-0 border-t border-skin-bdr p-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text3 border border-skin-bdr hover:text-skin-text transition"
          >
            Batal
          </button>
          <button
            type="submit"
            form="pengiriman-form"
            disabled={saving}
            className="flex-1 py-3 text-sm tracking-[0.1em] uppercase font-semibold text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-40"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
