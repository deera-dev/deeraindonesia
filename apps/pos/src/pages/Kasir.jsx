/**
 * Kasir.jsx — Halaman utama transaksi POS
 *
 * Tanggung jawab halaman ini:
 * - Orkestrasi komponen: ProductList, CartPanel, WarnaPanel, Struk
 * - State UI lokal: search, showPhotos, buyer, saving, successMsg, struk
 * - Memanggil useCart (logika keranjang) dan useCreateSale (simpan transaksi)
 *
 * Logika cart → useCart.js
 * Logika sinkronisasi → useSales.js + sync.js
 * UI tiap bagian → components/kasir/
 */
import { useState, useMemo } from "react";
import { formatHarga } from "@deera/shared/lib/constants";
import {
  LOCATIONS,
  LOCATION_LABELS,
  getMarketLocation,
  getMarketLabel,
} from "@deera/shared/lib/marketDay";
import { useProducts } from "../hooks/useProducts";
import { useCreateSale } from "../hooks/useSales";
import { useCart } from "../hooks/useCart";
import ProductList from "../components/kasir/ProductList";
import CartPanel from "../components/kasir/CartPanel";
import WarnaPanel from "../components/kasir/WarnaPanel";
import Struk from "../components/Struk";

export default function Kasir({ location, onLocationChange, onSaleCreated }) {
  const { products, loading, syncError } = useProducts();
  const createSale = useCreateSale();
  const cart = useCart();
  const autoLocation = getMarketLocation();
  const isCustomLoc = location !== autoLocation;
  const locLabel = getMarketLabel(location);

  // State UI yang tidak masuk useCart (terlalu spesifik ke halaman)
  const [search, setSearch] = useState("");
  const [showPhotos, setShowPhotos] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerHp, setBuyerHp] = useState("");
  const [pelangganId, setPelangganId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [struk, setStruk] = useState(null);

  // Filter + sort Z→A
  const filtered = useMemo(() => {
    const sorted = [...products].sort((a, b) => b.kode.localeCompare(a.kode));
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (p) =>
        p.kode.toLowerCase().includes(q) ||
        (p.bahan ?? "").toLowerCase().includes(q) ||
        (p.warna ?? []).some((w) => w.toLowerCase().includes(q)),
    );
  }, [products, search]);

  // ── Proses pembayaran ───────────────────────────────────────────────────────
  async function handleBayar() {
    if (!cart.cart.length) return;
    setSaving(true);

    // Ambil data sebelum cart direset
    const payloadItems = cart.getPayloadItems();
    const { total, diskon } = cart;

    try {
      await createSale({
        items: payloadItems,
        total,
        discount: diskon,
        buyerName,
        buyerHp,
        pelangganId,
        location,
      });

      // Tampilkan struk setelah berhasil
      setStruk({
        date: new Date().toISOString().split("T")[0],
        created_at: new Date().toISOString(),
        type: "sale",
        location,
        buyer_name: buyerName || null,
        buyer_hp: buyerHp || null,
        items: payloadItems,
        discount: diskon,
        total,
      });

      cart.resetCart();
      setBuyerName("");
      setBuyerHp("");
      setPelangganId(null);
      setSuccessMsg("Transaksi berhasil dicatat!");
      setTimeout(() => setSuccessMsg(""), 4000);
      onSaleCreated?.();
    } catch (err) {
      alert("Gagal mencatat transaksi: " + err.message);
    }
    setSaving(false);
  }

  // ── Handler buyer untuk CartPanel ──────────────────────────────────────────
  function handleBuyerSelect(p) {
    setBuyerName(p.nama);
    setBuyerHp(p.no_hp ?? "");
    setPelangganId(p.id);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100dvh-108px)] relative">
      {/* ── Banner: offline / sync error / sukses ── */}
      {!navigator.onLine && (
        <div className="bg-amber-50 border-b-2 border-amber-300 px-4 py-3 text-center flex-shrink-0">
          <p className="text-base text-amber-800 font-medium">
            ⚡ Mode Offline — transaksi tersimpan lokal
          </p>
        </div>
      )}
      {syncError && navigator.onLine && (
        <div className="bg-red-50 border-b-2 border-red-200 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          <p className="text-sm text-red-700">
            ⚠ Gagal sync — stok mungkin tidak akurat
          </p>
          <span className="text-sm text-red-500 flex-shrink-0 font-medium">
            Tap ↻ di header
          </span>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border-b-2 border-green-300 px-4 py-3 text-center flex-shrink-0">
          <p className="text-base text-green-800 font-semibold">
            ✓ {successMsg}
          </p>
        </div>
      )}

      {/* ── Toolbar: lokasi + toggle foto/teks ── */}
      <div className="bg-white border-b border-[#EDE8E0] px-3 py-2 flex items-center justify-between gap-2 flex-shrink-0">
        {/* Pemilih lokasi */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs text-[#B0AAA4] uppercase tracking-[0.12em] font-semibold flex-shrink-0">
            Pasar
          </span>
          <div className="relative">
            <select
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              className={`appearance-none pl-2 pr-6 py-1.5 text-sm border focus:outline-none focus:border-[#CAB170] transition cursor-pointer font-semibold rounded-sm ${
                isCustomLoc
                  ? "border-[#DEC98A] text-[#A8925A] bg-[#FDF5E6]"
                  : "border-[#E8E3DC] text-[#1A1918] bg-white"
              }`}
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {LOCATION_LABELS[loc]}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[#B0AAA4] text-xs">
              ▾
            </span>
          </div>
          {isCustomLoc && (
            <button
              onClick={() => onLocationChange(autoLocation)}
              className="text-xs text-[#CAB170] px-2 py-1 hover:underline transition flex-shrink-0"
            >
              Reset
            </button>
          )}
        </div>

        {/* Toggle foto/teks */}
        <div className="flex border border-[#E8E3DC] overflow-hidden rounded-sm flex-shrink-0">
          <button
            onClick={() => setShowPhotos(false)}
            className={`px-3 py-1.5 text-xs tracking-[0.08em] uppercase font-semibold transition ${
              !showPhotos ? "bg-[#CAB170] text-white" : "text-[#9C9690] hover:text-[#6B6560]"
            }`}
          >
            Teks
          </button>
          <button
            onClick={() => setShowPhotos(true)}
            className={`px-3 py-1.5 text-xs tracking-[0.08em] uppercase font-semibold transition border-l border-[#E8E3DC] ${
              showPhotos ? "bg-[#CAB170] text-white" : "text-[#9C9690] hover:text-[#6B6560]"
            }`}
          >
            Foto
          </button>
        </div>
      </div>

      {/* Banner lokasi diubah manual */}
      {isCustomLoc && (
        <div className="bg-[#FDF5E6] border-b border-[#EDD9A3] px-4 py-1.5 flex-shrink-0">
          <p className="text-xs text-[#A8925A]">
            ⚠ Lokasi manual · otomatis: {getMarketLabel(autoLocation)}
          </p>
        </div>
      )}

      {/* ── Layout utama: produk kiri, cart kanan ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Daftar produk — tersembunyi di mobile saat cart terbuka */}
        <div
          className={`flex flex-col flex-1 min-w-0 ${cart.showCart ? "hidden md:flex" : "flex"}`}
        >
          {/* Search bar */}
          <div className="px-3 py-2.5 border-b border-[#EDE8E0] bg-white flex-shrink-0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode, bahan, warna..."
              className="w-full bg-[#F9F7F4] border border-[#E8E3DC] px-4 py-3 text-base text-[#1A1918] focus:outline-none focus:border-[#CAB170] transition placeholder:text-[#C8C4C0] rounded-sm"
            />
          </div>
          {/* Grid / list produk */}
          <div className="flex-1 overflow-y-auto">
            <ProductList
              products={filtered}
              showPhotos={showPhotos}
              location={location}
              loading={loading}
              onAddItem={cart.openWarnaPanel}
            />
          </div>
        </div>

        {/* Panel cart — selalu tampil di desktop, toggle di mobile */}
        <div
          className={`flex flex-col w-full md:w-80 lg:w-96 border-l-2 border-[#E8E3DC] flex-shrink-0 ${
            cart.showCart ? "flex" : "hidden md:flex"
          }`}
        >
          <CartPanel
            cart={cart.cart}
            subtotal={cart.subtotal}
            diskon={cart.diskon}
            total={cart.total}
            totalItems={cart.totalItems}
            editingPrice={cart.editingPrice}
            buyerName={buyerName}
            buyerHp={buyerHp}
            pelangganId={pelangganId}
            onBuyerNameChange={(v) => {
              setBuyerName(v);
              setPelangganId(null);
            }}
            onBuyerSelect={handleBuyerSelect}
            showDiskon={cart.showDiskon}
            diskonInput={cart.diskonInput}
            diskonMode={cart.diskonMode}
            onToggleDiskon={() => cart.setShowDiskon(true)}
            onRemoveDiskon={cart.removeDiskon}
            onDiskonInputChange={cart.setDiskonInput}
            onDiskonModeChange={cart.setDiskonMode}
            onSetEditingPrice={cart.setEditingPrice}
            onSavePrice={cart.setItemHarga}
            onUpdateQty={cart.updateQty}
            onRemoveItem={cart.removeItem}
            onEditWarnaItem={(item) => cart.editWarnaItem(item, products)}
            onReset={cart.resetCart}
            onClose={() => cart.setShowCart(false)}
            saving={saving}
            onBayar={handleBayar}
          />
        </div>
      </div>

      {/* ── Floating cart button (mobile only) ── */}
      {!cart.showCart && cart.totalItems > 0 && (
        <button
          onClick={() => cart.setShowCart(true)}
          className="md:hidden fixed bottom-5 right-4 z-30 bg-[#CAB170] text-white px-5 py-4 shadow-xl flex items-center gap-3 text-base"
        >
          <span className="font-medium tracking-wide">Pesanan</span>
          <span className="bg-white text-[#CAB170] font-bold px-2.5 py-0.5 rounded-full text-base">
            {cart.totalItems}
          </span>
          <span
            className="text-xl leading-none"
            style={{ fontFamily: "'Braise', serif" }}
          >
            Rp {formatHarga(cart.total)}
          </span>
        </button>
      )}

      {/* ── Warna panel (bottom sheet) ── */}
      <WarnaPanel
        warnaPanel={cart.warnaPanel}
        selectedWarna={cart.selectedWarna}
        location={location}
        onClose={cart.closeWarnaPanel}
        onConfirm={cart.confirmWarna}
        onSelectAll={cart.selectFullSeri}
        onReset={() => cart.setSelectedWarna({})}
        onSetWarna={(w, qty) =>
          cart.setSelectedWarna((prev) => ({ ...prev, [w]: qty }))
        }
      />

      {/* ── Struk ── */}
      {struk && <Struk sale={struk} onClose={() => setStruk(null)} />}
    </div>
  );
}
