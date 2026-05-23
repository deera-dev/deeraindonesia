import { useState, useEffect, useRef } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { uploadImage } from "@deera/shared/lib/cloudinary";
import { SIZE_PRESETS, buildKode } from "@deera/shared/lib/constants";
import { logHistory } from "../../hooks/useHistory";
import SizeSection from "./SizeSection";
import StockSection from "./StockSection";
import ImageSection from "./ImageSection";

const inputCls =
  "w-full bg-skin-card border-2 border-skin-bdr px-4 py-3 text-skin-text text-base tracking-wide focus:outline-none focus:border-[#CAB170] disabled:opacity-40 disabled:bg-skin-page placeholder:text-skin-text4 transition";
const labelCls =
  "block text-sm tracking-[0.2em] text-skin-text2 mb-2 uppercase";

export default function ProductForm({ product, onClose, onSaved, onDelete }) {
  const isEdit = !!product;
  const [originalKode] = useState(product?.kode ?? "");

  // ── Kode ────────────────────────────────────────────────────────────────
  const parsedParts = product?.kode?.match(/^D-(\d+)-(.+)$/) ?? [];
  const [kodeAngka, setKodeAngka] = useState(parsedParts[1] ?? "");
  const [kodeBahan, setKodeBahan] = useState(parsedParts[2] ?? "");
  const generatedKode = buildKode(kodeAngka, kodeBahan);

  // ── Fields dasar ────────────────────────────────────────────────────────
  const [nama, setNama] = useState(product?.nama ?? "");
  const [bahan, setBahan] = useState(product?.bahan ?? "");
  const [hpp, setHpp] = useState(String(product?.hpp ?? ""));

  // ── Sizes & harga ───────────────────────────────────────────────────────
  const initHarga = () => {
    const map = {};
    (product?.variants ?? []).forEach((v) => {
      map[v.size] = String(v.harga ?? "");
    });
    return map;
  };
  const [hargaMap, setHargaMap] = useState(initHarga);
  const [activeSet, setActiveSet] = useState(
    () => new Set((product?.variants ?? []).map((v) => v.size)),
  );

  // ── Warna ───────────────────────────────────────────────────────────────
  const [warna, setWarna] = useState(product?.warna ?? []);
  const [warnaInput, setWarnaInput] = useState("");

  // ── Stok per warna ──────────────────────────────────────────────────────
  // { [size]: { [warna]: { gudang, cideng, tegalgubug } } }
  const [stokWarnaMap, setStokWarnaMap] = useState({});
  const [stokLoading, setStokLoading] = useState(isEdit);
  // Simpan nilai asli saat di-load untuk deteksi perubahan cideng/tegalgubug
  const originalStokRef = useRef({});

  useEffect(() => {
    if (!isEdit) {
      setStokLoading(false);
      return;
    }
    async function loadStok() {
      const { data } = await supabase
        .from("stok_warna")
        .select("*")
        .eq("kode", originalKode);
      if (data) {
        const map = {};
        data.forEach((row) => {
          if (!map[row.size]) map[row.size] = {};
          map[row.size][row.warna] = {
            gudang: row.gudang,
            cideng: row.cideng,
            tegalgubug: row.tegalgubug,
          };
        });
        setStokWarnaMap(map);
        // Simpan snapshot asli
        originalStokRef.current = JSON.parse(JSON.stringify(map));
      }
      setStokLoading(false);
    }
    loadStok();
  }, [isEdit, originalKode]);

  // ── Konfirmasi perubahan stok non-gudang (edit mode) ─────────────────────
  const [showStokWarning, setShowStokWarning] = useState(false);

  // ── Images ──────────────────────────────────────────────────────────────
  const [mainImage, setMainImage] = useState(
    product?.image ? { type: "url", url: product.image } : null,
  );
  const [detailImages, setDetailImages] = useState(
    (product?.detail ?? []).map((url) => ({ type: "url", url })),
  );

  // ── UI state ────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  function toggleSize(size) {
    setActiveSet((prev) => {
      const n = new Set(prev);
      n.has(size) ? n.delete(size) : n.add(size);
      return n;
    });
  }
  function setHarga(size, val) {
    setHargaMap((prev) => ({ ...prev, [size]: val.replace(/\D/g, "") }));
  }

  // ── Kembalikan cideng/tegalgubug ke nilai semula (sebelum diedit) ────────
  function revertNonGudangChanges() {
    const orig = originalStokRef.current;
    setStokWarnaMap(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const [size, warnaMap] of Object.entries(next)) {
        for (const w of Object.keys(warnaMap)) {
          const origVal = orig?.[size]?.[w];
          if (origVal !== undefined) {
            next[size][w].cideng     = origVal.cideng     ?? 0;
            next[size][w].tegalgubug = origVal.tegalgubug ?? 0;
          }
        }
      }
      return next;
    });
    setShowStokWarning(false);
  }

  // ── Cek apakah ada perubahan di cideng / tegalgubug ─────────────────────
  function hasNonGudangChanges() {
    if (!isEdit) return false;
    const orig = originalStokRef.current;
    for (const [size, warnaMap] of Object.entries(stokWarnaMap)) {
      for (const [w, stok] of Object.entries(warnaMap)) {
        const old = orig?.[size]?.[w];
        if (!old) continue;
        if ((stok.cideng ?? 0) !== (old.cideng ?? 0)) return true;
        if ((stok.tegalgubug ?? 0) !== (old.tegalgubug ?? 0)) return true;
      }
    }
    return false;
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e?.preventDefault();
    setErrMsg("");

    // Dalam edit mode, kalau ada perubahan stok cideng/tegalgubug → minta konfirmasi dulu
    if (isEdit && hasNonGudangChanges() && !showStokWarning) {
      setShowStokWarning(true);
      return;
    }
    setShowStokWarning(false);
    const finalKode = generatedKode || originalKode;
    if (!finalKode)
      return setErrMsg("Kode wajib diisi (isi nomor dan kode bahan)");
    if (!nama.trim()) return setErrMsg("Nama wajib diisi");
    if (!mainImage) return setErrMsg("Foto utama wajib diisi");
    if (activeSet.size === 0) return setErrMsg("Pilih minimal 1 ukuran");
    setSaving(true);
    try {
      // Upload images
      const mainUrl =
        mainImage.type === "url"
          ? mainImage.url
          : (await uploadImage(mainImage.file)).url;
      const detailUrls = await Promise.all(
        detailImages.map((img) =>
          img.type === "url"
            ? img.url
            : uploadImage(img.file).then((r) => r.url),
        ),
      );

      // Build variants (stok tidak disimpan di sini, ada di stok_warna)
      const variants = SIZE_PRESETS.filter((p) => activeSet.has(p.size)).map(
        (p) => ({
          size: p.size,
          ld: p.ld,
          pb: p.pb,
          harga: parseInt(hargaMap[p.size] ?? "0") || 0,
        }),
      );

      const payload = {
        kode: finalKode,
        nama: nama.trim(),
        image: mainUrl,
        detail: detailUrls,
        bahan: bahan.trim(),
        variants,
        hpp: parseInt(hpp.replace(/\D/g, "")) || 0,
        warna,
      };

      // Upsert produk
      if (isEdit) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("kode", originalKode);
        if (error) throw error;
        await logHistory({
          action: "edit",
          kode: finalKode,
          nama: payload.nama,
          snapshot: payload,
        });
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        await logHistory({
          action: "tambah",
          kode: finalKode,
          nama: payload.nama,
          snapshot: payload,
        });
      }

      // Upsert stok_warna — semua lokasi disimpan (termasuk cideng/tegalgubug)
      const warnaList = warna.length > 0 ? warna : ["_"];
      const stokRows = [];

      // Dari input yang sudah diisi
      for (const [size, warnaMap] of Object.entries(stokWarnaMap)) {
        if (!activeSet.has(size)) continue;
        for (const [w, stok] of Object.entries(warnaMap)) {
          stokRows.push({
            kode: finalKode,
            size,
            warna: w,
            gudang:      stok.gudang      ?? 0,
            cideng:      stok.cideng      ?? 0,
            tegalgubug:  stok.tegalgubug  ?? 0,
            updated_at:  new Date().toISOString(),
          });
        }
      }

      // Tambahkan baris 0 untuk kombinasi yang belum ada
      for (const p of SIZE_PRESETS.filter((pp) => activeSet.has(pp.size))) {
        for (const w of warnaList) {
          if (!stokRows.find((r) => r.size === p.size && r.warna === w)) {
            stokRows.push({
              kode: finalKode, size: p.size, warna: w,
              gudang: 0, cideng: 0, tegalgubug: 0,
              updated_at: new Date().toISOString(),
            });
          }
        }
      }

      if (stokRows.length > 0) {
        const { error: stokErr } = await supabase
          .from("stok_warna")
          .upsert(stokRows, { onConflict: "kode,size,warna" });
        if (stokErr) throw stokErr;
      }

      onSaved();
    } catch (err) {
      setErrMsg("Gagal simpan: " + (err.message ?? String(err)));
      setSaving(false);
    }
  }

  return (
    <>
    {/* Form overlay — disembunyikan (bukan unmount) saat modal konfirmasi aktif, agar state terjaga */}
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 overflow-y-auto bg-black/60 backdrop-blur-sm md:p-8"
      style={{ display: showStokWarning ? "none" : undefined }}
    >
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-2xl p-5 my-auto bg-skin-card border-2 border-skin-bdr shadow-xl md:p-10"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="absolute text-2xl leading-none top-4 right-4 text-skin-text3 hover:text-red-500 transition w-10 h-10 flex items-center justify-center"
        >
          ×
        </button>

        <h2 className="text-[#CAB170] text-3xl leading-none font-headline">
          {isEdit ? "Edit Produk" : "Tambah Produk"}
        </h2>
        <div className="w-12 h-0.5 mt-4 mb-8 bg-[#CAB170]/40" />

        {/* KODE */}
        <div className="mb-6">
          <label className={labelCls}>Kode Produk</label>
          <div className="flex items-center gap-3">
            <span className="text-skin-text3 text-base">D -</span>
            <input
              type="text"
              inputMode="numeric"
              value={kodeAngka}
              onChange={(e) => setKodeAngka(e.target.value.replace(/\D/g, ""))}
              disabled={saving}
              placeholder="72"
              maxLength={4}
              className="w-24 bg-skin-card border-2 border-skin-bdr px-3 py-3 text-skin-text text-base text-center focus:outline-none focus:border-[#CAB170] disabled:opacity-40 transition"
            />
            <span className="text-skin-text3 text-base">-</span>
            <input
              type="text"
              value={kodeBahan}
              onChange={(e) =>
                setKodeBahan(
                  e.target.value.toUpperCase().replace(/[^A-Z]/g, ""),
                )
              }
              disabled={saving}
              placeholder="JTB"
              maxLength={5}
              className="w-28 bg-skin-card border-2 border-skin-bdr px-3 py-3 text-skin-text text-base text-center focus:outline-none focus:border-[#CAB170] disabled:opacity-40 transition"
            />
          </div>
          {generatedKode && (
            <p className="mt-2 text-sm text-skin-text2">
              Kode:{" "}
              <span className="text-[#CAB170] font-medium">
                {generatedKode}
              </span>
            </p>
          )}
          {isEdit && generatedKode && generatedKode !== originalKode && (
            <p className="mt-1 text-sm text-amber-600">
              Berubah dari {originalKode} — link lama tidak berlaku
            </p>
          )}
        </div>

        {/* NAMA */}
        <div className="mb-5">
          <label className={labelCls}>Nama</label>
          <input
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            disabled={saving}
            placeholder="Bahan x Style"
            className={inputCls}
            required
          />
        </div>

        {/* BAHAN */}
        <div className="mb-6">
          <label className={labelCls}>Bahan</label>
          <input
            type="text"
            value={bahan}
            onChange={(e) => setBahan(e.target.value)}
            disabled={saving}
            placeholder="Aurora burkat mix jasmin"
            className={inputCls}
          />
        </div>

        {/* WARNA */}
        <div className="mb-8">
          <label className={labelCls}>
            Warna dalam Seri
            <span className="normal-case text-skin-text3 ml-2">
              ({warna.length} warna)
            </span>
          </label>

          {warna.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {warna.map((w, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-skin-gold border-2 border-skin-bdr-gold text-sm text-skin-text"
                >
                  {w}
                  <button
                    type="button"
                    onClick={() =>
                      setWarna((prev) => prev.filter((_, j) => j !== i))
                    }
                    disabled={saving}
                    className="text-skin-text3 hover:text-red-500 transition leading-none text-base"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={warnaInput}
              onChange={(e) => setWarnaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const v = warnaInput.trim().toUpperCase();
                  if (v && !warna.includes(v)) setWarna((prev) => [...prev, v]);
                  setWarnaInput("");
                }
              }}
              disabled={saving}
              placeholder="Hitam, Putih, Navy... (Enter untuk tambah)"
              className="flex-1 bg-skin-card border-2 border-skin-bdr px-4 py-3 text-skin-text text-base focus:outline-none focus:border-[#CAB170] disabled:opacity-40 transition placeholder:text-skin-text4"
            />
            <button
              type="button"
              disabled={
                saving ||
                !warnaInput.trim() ||
                warna.includes(warnaInput.trim())
              }
              onClick={() => {
                const v = warnaInput.trim().toUpperCase();
                if (v && !warna.includes(v)) setWarna((prev) => [...prev, v]);
                setWarnaInput("");
              }}
              className="px-5 py-3 bg-[#CAB170] text-white text-sm tracking-[0.15em] uppercase hover:bg-[#A8925A] transition disabled:opacity-40"
            >
              Tambah
            </button>
          </div>
          {warna.length > 0 && (
            <p className="mt-2 text-xs text-skin-text3">
              Seri penuh = {warna.length} warna · stok dihitung per warna
            </p>
          )}
        </div>

        <SizeSection
          activeSet={activeSet}
          hargaMap={hargaMap}
          onToggle={toggleSize}
          onHarga={setHarga}
          saving={saving}
        />

        {stokLoading ? (
          <div className="mb-8 text-sm text-skin-text3 italic">
            Memuat data stok...
          </div>
        ) : (
          <StockSection
            stokWarnaMap={stokWarnaMap}
            setStokWarnaMap={setStokWarnaMap}
            warna={warna}
            hpp={hpp}
            setHpp={setHpp}
            activeSet={activeSet}
            hargaMap={hargaMap}
            saving={saving}
          />
        )}

        <ImageSection
          mainImage={mainImage}
          setMainImage={setMainImage}
          detailImages={detailImages}
          setDetailImages={setDetailImages}
          saving={saving}
        />

        {errMsg && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3">
            {errMsg}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-4 bg-[#CAB170] text-white text-base tracking-[0.2em] uppercase hover:bg-[#A8925A] transition disabled:opacity-40"
            >
              {saving ? "Menyimpan..." : isEdit ? "Simpan" : "Tambah Produk"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-8 py-4 border-2 border-skin-bdr text-base tracking-[0.2em] uppercase text-skin-text3 hover:text-skin-text hover:border-[#1A1918] transition disabled:opacity-40"
            >
              Batal
            </button>
          </div>

          {/* Hapus produk — hanya saat mode edit */}
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="w-full py-3.5 border-2 border-red-200 text-red-600 text-sm tracking-[0.15em] uppercase hover:bg-red-50 hover:border-red-400 transition disabled:opacity-40 font-medium"
            >
              🗑 Hapus Produk Ini
            </button>
          )}
        </div>
      </form>
    </div>

    {/* ── Modal konfirmasi perubahan stok non-gudang ── */}
    {/* Ditampilkan sebagai overlay terpisah saat form disembunyikan */}
    {showStokWarning && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div className="bg-skin-card border-2 border-skin-bdr shadow-2xl w-full max-w-sm">
          <div className="bg-amber-600 px-4 py-3 flex items-center justify-between">
            <span className="text-sm tracking-[0.1em] uppercase text-white font-medium">
              Konfirmasi Perubahan Stok
            </span>
            <button
              onClick={() => setShowStokWarning(false)}
              className="text-white/70 hover:text-white text-xl"
            >✕</button>
          </div>
          <div className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl flex-shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-skin-text mb-2">
                  Ada perubahan stok di Cideng atau Tegalgubug.
                </p>
                <p className="text-sm text-skin-text2 leading-relaxed">
                  Perubahan ini akan <strong>langsung tersimpan dan dicatat di riwayat</strong>, tapi <strong>tidak ada surat jalan</strong> yang dibuat.
                </p>
                <p className="text-xs text-skin-text3 mt-2">
                  Untuk pemindahan stok formal antar lokasi, gunakan fitur Transfer Stok.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setShowStokWarning(false)}
                className="py-3 text-sm tracking-[0.08em] uppercase font-semibold text-skin-text3 border border-skin-bdr hover:text-skin-text hover:border-skin-text transition"
              >
                Batal
              </button>
              <button
                onClick={revertNonGudangChanges}
                className="py-3 text-sm tracking-[0.08em] uppercase font-semibold text-red-600 border border-red-300 hover:bg-red-50 hover:border-red-500 transition"
              >
                Hapus Perubahan
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="py-3 text-sm tracking-[0.08em] uppercase font-semibold text-white bg-amber-600 hover:bg-amber-700 transition disabled:opacity-40"
              >
                {saving ? "Menyimpan..." : "Ya, Simpan"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
