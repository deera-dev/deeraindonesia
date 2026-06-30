/**
 * KasirPage.jsx — Halaman utama transaksi POS
 *
 * Tanggung jawab halaman ini:
 * - Orkestrasi komponen: ProductList, CartPanel, WarnaPanel, Struk
 * - State UI lokal: search, showPhotos, buyer, struk
 * - Memanggil useCart (logika keranjang) dan useCheckout (proses bayar)
 *
 * Logika cart & bayar → ../hooks.js (Dependency Inversion ala React —
 * halaman tidak berisi logika bisnis, lihat CLAUDE.md §13)
 * UI tiap bagian → ../components/
 */
import { useRef, useState, useMemo } from "react";
import { formatHarga } from "@deera/shared/lib/constants";
import {
  LOCATIONS,
  LOCATION_LABELS,
  getMarketLocation,
  getMarketLabel,
} from "@deera/shared/lib/marketDay";
import { useProducts } from "../../../hooks/useProducts";
import { useCart, useCheckout } from "../hooks";
import ProductList from "../components/ProductList";
import CartPanel from "../components/CartPanel";
import WarnaPanel from "../components/WarnaPanel";
import Struk from "../../../shared/components/Struk";
import BackToTop from "@deera/shared/components/BackToTop";

export default function Kasir({ location, onLocationChange, onSaleCreated }) {
  const { products, loading, syncError } = useProducts();
  const productListRef = useRef(null);
  const cart = useCart(location);
  const autoLocation = getMarketLocation();
  const isCustomLoc = location !== autoLocation;
  const locLabel = getMarketLabel(location);

  // State UI yang tidak masuk useCart (terlalu spesifik ke halaman)
  const [search, setSearch] = useState("");
  const [showPhotos, setShowPhotos] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerHp, setBuyerHp] = useState("");
  const [pelangganId, setPelangganId] = useState(null);
  const [struk, setStruk] = useState(null);

  const { bayar, saving } = useCheckout({
    cart,
    location,
    buyerName,
    buyerHp,
    pelangganId,
    setPelangganId,
  });

  // Filter + sort terbaru → terlama (created_at)
  const filtered = useMemo(() => {
    const sorted = [...products].sort(
      (a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    );
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
    const result = await bayar();
    if (result) {
      setStruk(result);
      setBuyerName("");
      setBuyerHp("");
      setPelangganId(null);
      onSaleCreated?.();
    }
  }

  // ── Handler buyer untuk CartPanel ──────────────────────────────────────────
  function handleBuyerSelect(p) {
    setBuyerName(p.nama);
    setBuyerHp(p.no_hp ?? "");
    setPelangganId(p.id);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      {/* ── Banner: offline / sync error / sukses ── */}
      {!navigator.onLine && (
        <div className="bg-amber-50 border-b-2 border-amber-300 px-4 py-3 text-center flex-shrink-0">
          <p className="text-base text-amber-800 font-medium">
            Mode Offline — transaksi tersimpan lokal
          </p>
        </div>
      )}
      {syncError && navigator.onLine && (
        <div className="bg-red-50 border-b-2 border-red-200 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          <p className="text-sm text-red-700">Gagal sync — stok mungkin tidak akurat</p>
          <span className="text-sm text-red-500 flex-shrink-0 font-medium">Tap ↻ di header</span>
        </div>
      )}

      {/* ── Toolbar: lokasi + toggle foto/teks ── */}
      <div className="bg-skin-card border-b border-skin-bdr px-3 py-2 flex items-center justify-between gap-2 flex-shrink-0">
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
                  ? "border-[#DEC98A] text-[#A8925A] bg-skin-gold"
                  : "border-skin-bdr text-skin-text bg-skin-card"
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
        <div className="flex border border-skin-bdr overflow-hidden rounded-sm flex-shrink-0">
          <button
            onClick={() => setShowPhotos(false)}
            className={`px-3 py-1.5 text-xs tracking-[0.08em] uppercase font-semibold transition ${
              !showPhotos ? "bg-[#CAB170] text-white" : "text-skin-text3 hover:text-skin-text2"
            }`}
          >
            Teks
          </button>
          <button
            onClick={() => setShowPhotos(true)}
            className={`px-3 py-1.5 text-xs tracking-[0.08em] uppercase font-semibold transition border-l border-skin-bdr ${
              showPhotos ? "bg-[#CAB170] text-white" : "text-skin-text3 hover:text-skin-text2"
            }`}
          >
            Foto
          </button>
        </div>
      </div>

      {/* Banner lokasi diubah manual */}
      {isCustomLoc && (
        <div className="bg-skin-gold border-b border-skin-bdr-gold px-4 py-1.5 flex-shrink-0">
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
          <div className="px-3 py-2.5 border-b border-skin-bdr bg-skin-card flex-shrink-0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode, bahan, warna..."
              className="w-full bg-skin-page border border-skin-bdr px-4 py-3 text-base text-skin-text focus:outline-none focus:border-[#CAB170] transition placeholder:text-skin-text4 rounded-sm"
            />
          </div>
          {/* Grid / list produk */}
          <div ref={productListRef} className="flex-1 overflow-y-auto">
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
          className={`flex flex-col w-full md:w-80 lg:w-96 border-l-2 border-skin-bdr flex-shrink-0 ${
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
          className="md:hidden fixed bottom-20 right-4 z-40 bg-[#CAB170] text-white px-5 py-4 shadow-xl flex items-center gap-3 text-base"
        >
          <span className="font-medium tracking-wide">Pesanan</span>
          <span className="bg-skin-card text-[#CAB170] font-bold px-2.5 py-0.5 rounded-full text-base font-headline">
            {cart.totalItems}
          </span>
          <span className="text-xl leading-none">Rp {formatHarga(cart.total)}</span>
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
        onSetWarna={(w, qty) => cart.setSelectedWarna((prev) => ({ ...prev, [w]: qty }))}
      />

      {/* ── Struk ── */}
      {struk && <Struk sale={struk} onClose={() => setStruk(null)} />}

      {/* ── Back to top — scroll dalam product list, kiri agar tidak tumpuk cart button ── */}
      <BackToTop
        scrollEl={productListRef}
        className="left-4"
        bottomClass="bottom-20"
        threshold={150}
      />
    </div>
  );
}
