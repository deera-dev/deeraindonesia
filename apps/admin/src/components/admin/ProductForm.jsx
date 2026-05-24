import { useState, useEffect } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { uploadImage } from "@deera/shared/lib/cloudinary";
import { SIZE_PRESETS, buildKode, formatHarga } from "@deera/shared/lib/constants";
import { logHistory } from "../../hooks/useHistory";
import SizeSection from "./SizeSection";
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

  // ── Stok per warna — hanya untuk cek warnaHasStok + deteksi orphan ────────
  // Edit stok dilakukan via halaman Stok Opname, bukan di sini
  const [stokWarnaMap, setStokWarnaMap] = useState({});
  const [stokLoading,  setStokLoading]  = useState(isEdit);

  useEffect(() => {
    if (!isEdit) { setStokLoading(false); return; }
    supabase
      .from("stok_warna")
      .select("size, warna, gudang, cideng, tegalgubug")
      .eq("kode", originalKode)
      .then(({ data }) => {
        if (data) {
          const map = {};
          data.forEach(row => {
            if (!map[row.size]) map[row.size] = {};
            map[row.size][row.warna] = {
              gudang: row.gudang, cideng: row.cideng, tegalgubug: row.tegalgubug,
            };
          });
          setStokWarnaMap(map);
        }
        setStokLoading(false);
      });
  }, [isEdit, originalKode]);

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

  // ── Cek apakah warna masih punya stok di lokasi manapun ─────────────────
  function warnaHasStok(w) {
    for (const warnaMap of Object.values(stokWarnaMap)) {
      const stok = warnaMap[w];
      if (stok && (stok.gudang > 0 || stok.cideng > 0 || stok.tegalgubug > 0)) {
        return true;
      }
    }
    return false;
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e?.preventDefault();
    setErrMsg("");
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
        // Simpan state sebelum edit sebagai before_snapshot
        const beforeSnap = {
          kode: product.kode,
          nama: product.nama,
          bahan: product.bahan,
          hpp: product.hpp,
          variants: product.variants,
          warna: product.warna,
          image: product.image,
          detail: product.detail,
        };
        await logHistory({
          action: "edit",
          category: "produk",
          kode: finalKode,
          nama: payload.nama,
          snapshot: payload,
          before: beforeSnap,
        });
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        await logHistory({
          action: "tambah",
          category: "produk",
          kode: finalKode,
          nama: payload.nama,
          snapshot: payload,
        });
      }

      // Buat baris stok_warna untuk kombinasi baru (size/warna yang belum ada)
      // Nilai stok TIDAK diubah di sini — gunakan halaman Stok Opname untuk koreksi stok
      const warnaList      = warna.length > 0 ? warna : ["_"];
      const currentWarnaSet = new Set(warnaList);

      // Kumpulkan kombinasi yang sudah ada di DB
      const existingKeys = new Set();
      for (const [size, warnaMap] of Object.entries(stokWarnaMap)) {
        for (const w of Object.keys(warnaMap)) {
          existingKeys.add(`${size}__${w}`);
        }
      }

      // Insert hanya kombinasi baru (stok default 0)
      const newRows = SIZE_PRESETS
        .filter(p => activeSet.has(p.size))
        .flatMap(p => warnaList.map(w => ({ size: p.size, warna: w })))
        .filter(c => !existingKeys.has(`${c.size}__${c.warna}`))
        .map(c => ({
          kode:       finalKode,
          size:       c.size,
          warna:      c.warna,
          gudang:     0,
          cideng:     0,
          tegalgubug: 0,
          updated_at: new Date().toISOString(),
        }));

      if (newRows.length > 0) {
        const { error: stokErr } = await supabase.from("stok_warna").insert(newRows);
        if (stokErr) throw stokErr;
      }

      // Hapus baris orphan (warna dihapus dari produk)
      if (isEdit) {
        const orphanedWarnas = new Set();
        for (const warnaMap of Object.values(stokWarnaMap)) {
          for (const w of Object.keys(warnaMap)) {
            if (!currentWarnaSet.has(w)) orphanedWarnas.add(w);
          }
        }
        for (const orphanW of orphanedWarnas) {
          await supabase
            .from("stok_warna")
            .delete()
            .eq("kode", finalKode)
            .eq("warna", orphanW);
        }
      }

      onSaved();
    } catch (err) {
      setErrMsg("Gagal simpan: " + (err.message ?? String(err)));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={saving ? undefined : onClose} />

      {/* Modal container — sticky header + scrollable body + sticky footer */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-skin-card w-full max-w-2xl mx-auto border-t-2 md:border-2 border-skin-bdr shadow-xl flex flex-col max-h-[95dvh] md:max-h-[90dvh]"
      >
        {/* ── Sticky header ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b-2 border-skin-bdr">
          <h2 className="text-[#CAB170] text-2xl leading-none font-headline">
            {isEdit ? "Edit Produk" : "Tambah Produk"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-10 h-10 flex items-center justify-center text-skin-text3 hover:text-red-500 transition text-2xl disabled:opacity-40"
          >
            ×
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-6 md:px-10">

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
                  setKodeBahan(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))
                }
                disabled={saving}
                placeholder="JTB"
                maxLength={5}
                className="w-28 bg-skin-card border-2 border-skin-bdr px-3 py-3 text-skin-text text-base text-center focus:outline-none focus:border-[#CAB170] disabled:opacity-40 transition"
              />
            </div>
            {generatedKode && (
              <p className="mt-2 text-sm text-skin-text2">
                Kode: <span className="text-[#CAB170] font-medium">{generatedKode}</span>
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
              <span className="normal-case text-skin-text3 ml-2">({warna.length} warna)</span>
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
                      onClick={() => setWarna((prev) => prev.filter((_, j) => j !== i))}
                      disabled={saving || warnaHasStok(w)}
                      title={warnaHasStok(w) ? "Tidak bisa dihapus — masih ada stok" : "Hapus warna"}
                      className={`transition leading-none text-base ${
                        warnaHasStok(w)
                          ? "text-skin-text4 opacity-30 cursor-not-allowed"
                          : "text-skin-text3 hover:text-red-500"
                      }`}
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
                disabled={saving || !warnaInput.trim() || warna.includes(warnaInput.trim())}
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

          {/* Notice: stok dari warna yang sudah dihapus */}
          {isEdit && !stokLoading && (() => {
            const currentSet = new Set(warna.length > 0 ? warna : ["_"]);
            const orphans = new Set();
            for (const warnaMap of Object.values(stokWarnaMap)) {
              for (const w of Object.keys(warnaMap)) {
                if (!currentSet.has(w)) orphans.add(w);
              }
            }
            return orphans.size > 0 ? (
              <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-300 text-sm text-amber-800 leading-relaxed">
                ⚠ Data stok untuk <strong>{orphans.size} warna yang sudah dihapus</strong>{" "}
                (<span className="font-medium">{[...orphans].join(", ")}</span>)
                akan otomatis dihapus saat produk disimpan.
              </div>
            ) : null;
          })()}

          {/* HPP */}
          <div className="mb-8">
            <label className="block text-sm tracking-[0.15em] text-skin-text2 mb-2 uppercase">
              HPP — Harga Pokok per Produk
            </label>
            <div className="flex items-center gap-3">
              <span className="text-base text-skin-text3">Rp</span>
              <input
                type="text" inputMode="numeric" value={hpp}
                onChange={e => setHpp(e.target.value.replace(/\D/g, ""))}
                disabled={saving} placeholder="150000"
                className="flex-1 bg-skin-card border-2 border-skin-bdr px-4 py-3 text-skin-text text-base text-right focus:outline-none focus:border-[#CAB170] disabled:opacity-40 transition"
              />
            </div>
            {hpp && activeSet.size > 0 && (
              <div className="mt-3 space-y-1">
                {SIZE_PRESETS.filter(p => activeSet.has(p.size)).map(p => {
                  const jual   = parseInt(hargaMap[p.size] ?? "0") || 0;
                  const hppVal = parseInt(hpp) || 0;
                  if (!jual || !hppVal) return null;
                  const margin = Math.round(((jual - hppVal) / jual) * 100);
                  return (
                    <p key={p.size} className="text-sm text-skin-text3">
                      {p.size}: margin{" "}
                      <span className="text-skin-text2 font-medium">{margin}%</span>
                      {" "}(untung Rp {formatHarga(jual - hppVal)})
                    </p>
                  );
                })}
              </div>
            )}
          </div>

          <ImageSection
            mainImage={mainImage}
            setMainImage={setMainImage}
            detailImages={detailImages}
            setDetailImages={setDetailImages}
            saving={saving}
          />

          {errMsg && (
            <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3">
              {errMsg}
            </p>
          )}
        </div>

        {/* ── Sticky footer ── */}
        <div className="flex-shrink-0 border-t-2 border-skin-bdr p-4 space-y-3">
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
  );
}
