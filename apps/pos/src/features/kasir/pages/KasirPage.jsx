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
import TukarTambahModal from "../components/TukarTambahModal";
import ClearCartConfirm from "../components/ClearCartConfirm";
import Struk from "../../../shared/components/Struk";
import { KeepListModal, useKeepCheckout, useKeepOrdersQuery, keepToCartItems, keepUsesOtherLocations } from "../../keep";
import BackToTop from "@deera/shared/components/BackToTop";

export default function Kasir({ location, onLocationChange, onSaleCreated }) {
  const { products, loading, syncError } = useProducts();
  const productListRef = useRef(null);
  const cart = useCart(location);
  const autoLocation = getMarketLocation();
  const isCustomLoc = location !== autoLocation;
  const locLabel = getMarketLabel(location);

  const [search, setSearch] = useState("");
  const [showPhotos, setShowPhotos] = useState(false);
  const [buyerName, setBuyerName] = useState(() => cart.editingKeep?.buyer_name ?? "");
  const [buyerHp, setBuyerHp] = useState(() => cart.editingKeep?.buyer_hp ?? "");
  const [pelangganId, setPelangganId] = useState(() => cart.editingKeep?.pelanggan_id ?? null);
  const [struk, setStruk] = useState(null);

  const [exchange, setExchange] = useState(null);
  const [showTukarTambah, setShowTukarTambah] = useState(false);

  const [confirmClear, setConfirmClear] = useState(false);

  const [showKeepList, setShowKeepList] = useState(false);
  const { data: keepList } = useKeepOrdersQuery();

  const { bayar, saving } = useCheckout({
    cart,
    location,
    buyerName,
    buyerHp,
    pelangganId,
    setPelangganId,
    exchange,
    onExchangeApplied: () => setExchange(null),
  });

  const { simpanKeep, tandaiKeepLunas, saving: savingKeep } = useKeepCheckout({
    cart,
    location,
    buyerName,
    buyerHp,
    pelangganId,
    setPelangganId,
    editingKeep: cart.editingKeep,
  });

  const netTotal = exchange ? cart.total - exchange.total : cart.total;

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

  function clearBuyer() {
    setBuyerName("");
    setBuyerHp("");
    setPelangganId(null);
  }

  async function handleBayar() {
    const keepId = cart.editingKeep?.id;
    const result = await bayar();
    if (result) {
      if (keepId) await tandaiKeepLunas(keepId);
      setStruk(result);
      setBuyerName("");
      setBuyerHp("");
      setPelangganId(null);
      onSaleCreated?.();
    }
  }

  async function handleKeep() {
    const result = await simpanKeep();
    if (result) {
      setStruk(result);
      setBuyerName("");
      setBuyerHp("");
      setPelangganId(null);
    }
  }

  function handleEditKeep(k) {
    cart.loadKeep({ keep: k, items: keepToCartItems(k.items, products), gabungan: keepUsesOtherLocations(k) });
    setBuyerName(k.buyer_name ?? "");
    setBuyerHp(k.buyer_hp ?? "");
    setPelangganId(k.pelanggan_id ?? null);
    setExchange(null);
    if (k.location && k.location !== location) onLocationChange?.(k.location);
    setShowKeepList(false);
  }

  function handleCancelEditKeep() {
    cart.resetCart();
    clearBuyer();
  }

  function handleBuyerSelect(p) {
    setBuyerName(p.nama);
    setBuyerHp(p.no_hp ?? "");
    setPelangganId(p.id);
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
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

      <div className="bg-skin-card border-b border-skin-bdr px-4 py-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 flex-shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs text-skin-text3 uppercase tracking-[0.12em] font-semibold flex-shrink-0">
            Pasar
          </span>
          <div className="relative">
            <select
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              className={`appearance-none pl-2 pr-6 py-1.5 text-sm border focus:outline-none focus:border-skin-accent transition cursor-pointer font-semibold ${
                isCustomLoc
                  ? "border-skin-bdr-gold text-skin-accent-text bg-skin-gold"
                  : "border-skin-bdr text-skin-text bg-skin-card"
              }`}
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {LOCATION_LABELS[loc]}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-skin-text3 text-xs">
              ▾
            </span>
          </div>
          {isCustomLoc && (
            <button
              onClick={() => onLocationChange(autoLocation)}
              className="text-xs text-skin-accent-text px-2 py-1 hover:underline transition flex-shrink-0"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={cart.toggleGabungan}
            title="Gabungan: ambil kekurangan stok dari lokasi lain dalam satu transaksi"
            className={`px-3 py-1.5 text-xs tracking-[0.08em] uppercase font-semibold transition border rounded-full ${
              cart.gabungan
                ? "bg-skin-accent text-skin-on-accent border-skin-accent"
                : "text-skin-text3 border-skin-bdr hover:text-skin-text2"
            }`}
          >
            Gabungan
          </button>
          <div className="flex gap-0.5 border border-skin-bdr p-0.5 rounded-full">
            <button
              onClick={() => setShowPhotos(false)}
              className={`px-3 py-1.5 text-xs tracking-[0.08em] uppercase font-semibold rounded-full transition ${
                !showPhotos ? "bg-skin-accent text-skin-on-accent" : "text-skin-text3 hover:text-skin-text2"
              }`}
            >
              Teks
            </button>
            <button
              onClick={() => setShowPhotos(true)}
              className={`px-3 py-1.5 text-xs tracking-[0.08em] uppercase font-semibold rounded-full transition ${
                showPhotos ? "bg-skin-accent text-skin-on-accent" : "text-skin-text3 hover:text-skin-text2"
              }`}
            >
              Foto
            </button>
          </div>
        </div>
      </div>

      {isCustomLoc && (
        <div className="bg-skin-gold border-b border-skin-bdr-gold px-4 py-1.5 flex-shrink-0">
          <p className="text-xs text-skin-accent-text">
            ⚠ Lokasi manual · otomatis: {getMarketLabel(autoLocation)}
          </p>
        </div>
      )}

      {cart.gabungan && (
        <div className="bg-sky-50 dark:bg-sky-950/30 border-b border-sky-200 dark:border-sky-800 px-4 py-1.5 flex-shrink-0">
          <p className="text-xs text-sky-700 dark:text-sky-400">
            Mode Gabungan aktif — stok bisa diambil dari beberapa lokasi sekaligus
          </p>
        </div>
      )}

      {cart.editingKeep ? (
        <div className="bg-sky-50 dark:bg-sky-950/30 border-b border-sky-200 dark:border-sky-800 px-3 py-2 flex-shrink-0 flex items-center justify-between gap-2">
          <span className="text-xs text-sky-700 dark:text-sky-400 min-w-0 truncate">
            Edit keep {cart.editingKeep.buyer_name || "(tanpa nama)"} — tekan Simpan Keep atau Bayar
          </span>
          <button
            type="button"
            data-testid="cancel-edit-keep-btn"
            onClick={handleCancelEditKeep}
            className="flex-shrink-0 text-xs text-sky-700 dark:text-sky-400 underline hover:text-sky-900 dark:hover:text-sky-300"
          >
            Batal Edit
          </button>
        </div>
      ) : !exchange ? (
        <div className="bg-skin-card border-b border-skin-bdr px-4 py-2.5 flex-shrink-0 flex items-center justify-between gap-3">
          <button
            type="button"
            data-testid="start-tukar-tambah-btn"
            onClick={() => setShowTukarTambah(true)}
            className="text-xs text-skin-text3 hover:text-skin-accent-text transition tracking-wide uppercase underline"
          >
            ⇄ Tukar Tambah
          </button>
          <button
            type="button"
            data-testid="open-keep-btn"
            onClick={() => setShowKeepList(true)}
            className="text-xs text-skin-text3 hover:text-skin-accent-text transition tracking-wide uppercase underline"
          >
            Keep{keepList?.length ? ` (${keepList.length})` : ""}
          </button>
        </div>
      ) : (
        <div className="bg-orange-50 dark:bg-orange-950/30 border-b border-orange-200 dark:border-orange-800 px-3 py-2 flex-shrink-0 flex items-center justify-between gap-2">
          <span className="text-xs text-orange-700 dark:text-orange-400 min-w-0 truncate">
            Tukar Tambah aktif — retur {exchange.originalSale?.buyer_name || "(tanpa nama)"} · Rp{" "}
            {formatHarga(exchange.total)}
          </span>
          <button
            type="button"
            data-testid="cancel-exchange-btn"
            onClick={() => setExchange(null)}
            className="flex-shrink-0 text-xs text-orange-700 dark:text-orange-400 underline hover:text-orange-900 dark:hover:text-orange-300"
          >
            Batal
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`flex flex-col flex-1 min-w-0 ${cart.showCart ? "hidden md:flex" : "flex"}`}
        >
          <div className="px-3 py-2.5 border-b border-skin-bdr bg-skin-card flex-shrink-0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode, bahan, warna..."
              className="w-full bg-skin-page border border-skin-bdr px-4 py-3 text-base text-skin-text focus:outline-none focus:border-skin-accent transition placeholder:text-skin-text4"
            />
          </div>
          <div ref={productListRef} className="flex-1 overflow-y-auto">
            <ProductList
              products={filtered}
              showPhotos={showPhotos}
              location={location}
              loading={loading}
              gabungan={cart.gabungan}
              onAddItem={cart.openWarnaPanel}
            />
          </div>
        </div>

        <div
          className={`flex flex-col w-full md:w-80 lg:w-96 border-l-2 border-skin-bdr flex-shrink-0 ${
            cart.showCart ? "flex" : "hidden md:flex"
          }`}
        >
          <CartPanel
            cart={cart.cart}
            subtotal={cart.subtotal}
            diskon={cart.diskon}
            total={netTotal}
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
            onUpdateQty={(key, delta) => cart.updateQty(key, delta, products)}
            onRemoveItem={cart.removeItem}
            onEditWarnaItem={(item) => cart.editWarnaItem(item, products)}
            onReset={() => setConfirmClear(true)}
            onClose={() => cart.setShowCart(false)}
            saving={saving}
            onBayar={handleBayar}
            onKeep={handleKeep}
            savingKeep={savingKeep}
            keepLabel={cart.editingKeep ? "Simpan Keep" : "Keep"}
            exchange={exchange}
          />
        </div>
      </div>

      {!cart.showCart && cart.totalItems > 0 && (
        <div className="md:hidden fixed bottom-20 right-4 z-40 flex items-center gap-2">
          <button
            onClick={() => setConfirmClear(true)}
            title="Kosongkan pesanan"
            aria-label="Kosongkan pesanan"
            className="bg-skin-card text-red-500 border-2 border-red-400 w-12 h-12 rounded-full shadow-xl flex items-center justify-center flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
          <button
            onClick={() => cart.setShowCart(true)}
            className="bg-skin-accent text-skin-on-accent px-5 py-4 shadow-xl flex items-center gap-3 text-base"
          >
            <span className="font-medium tracking-wide">Pesanan</span>
            <span className="bg-skin-card text-skin-accent-text font-bold px-2.5 py-0.5 rounded-full text-base font-headline">
              {cart.totalItems}
            </span>
            <span className="text-xl leading-none">Rp {formatHarga(netTotal)}</span>
          </button>
        </div>
      )}

      <WarnaPanel
        warnaPanel={cart.warnaPanel}
        selectedWarna={cart.selectedWarna}
        location={location}
        gabungan={cart.gabungan}
        selectedBreakdown={cart.selectedBreakdown}
        onClose={cart.closeWarnaPanel}
        onConfirm={cart.confirmWarna}
        onSelectAll={cart.selectFullSeri}
        onReset={() => cart.setSelectedWarna({})}
        onSetWarna={(w, qty) => cart.setSelectedWarna((prev) => ({ ...prev, [w]: qty }))}
        onSetWarnaLoc={cart.setWarnaLoc}
      />

      {showTukarTambah && (
        <TukarTambahModal
          onClose={() => setShowTukarTambah(false)}
          onConfirm={(ex) => {
            setExchange(ex);
            setBuyerName(ex.originalSale?.buyer_name ?? "");
            setBuyerHp(ex.originalSale?.buyer_hp ?? "");
            setPelangganId(ex.originalSale?.pelanggan_id ?? null);
            setShowTukarTambah(false);
          }}
        />
      )}

      {confirmClear && (
        <ClearCartConfirm
          itemCount={cart.cart.length}
          onClose={() => setConfirmClear(false)}
          onConfirm={() => {
            if (cart.editingKeep) clearBuyer();
            cart.resetCart();
            setConfirmClear(false);
          }}
        />
      )}

      {showKeepList && (
        <KeepListModal
          onClose={() => setShowKeepList(false)}
          onPaid={() => onSaleCreated?.()}
          onEdit={handleEditKeep}
          cartHasItems={cart.cart.length > 0}
          editingKeepId={cart.editingKeep?.id}
        />
      )}

      {struk && <Struk sale={struk} onClose={() => setStruk(null)} />}

      <BackToTop
        scrollEl={productListRef}
        className="left-4"
        threshold={150}
      />
    </div>
  );
}
