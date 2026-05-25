/**
 * Laporan.jsx — Halaman laporan POS
 *
 * Sub-tab:
 * - Transaksi : daftar transaksi + ringkasan singkat
 * - Keuangan  : omset, HPP, keuntungan, breakdown per hari
 * - Stok      : stok keluar/masuk per produk
 * - Pembeli   : top pembeli & lokasi
 *
 * Logika data  → hooks/useSales.js
 * Helper       → lib/salesUtils.js
 */
import { useState, useRef, useEffect } from "react";
import {
  useSalesReport,
  useCreateRetur,
  useDeleteSale,
  useUpdateSale,
} from "../hooks/useSales";
import { effectiveQty, itemProfit } from "../lib/salesUtils";
import FilterBar from "../components/laporan/FilterBar";
import SaleCard from "../components/laporan/SaleCard";
import DetailModal from "../components/laporan/DetailModal";
import ReturModal from "../components/laporan/ReturModal";
import DeleteConfirm from "../components/laporan/DeleteConfirm";
import EditSaleModal from "../components/laporan/EditSaleModal";
import Struk from "../components/Struk";
import LaporanKeuangan from "../components/laporan/LaporanKeuangan";
import LaporanStok from "../components/laporan/LaporanStok";
import LaporanPembeli from "../components/laporan/LaporanPembeli";
import LaporanRiwayat from "../components/laporan/LaporanRiwayat";
import { toast } from "@deera/shared/lib/toast";

const SUB_TABS = [
  { key: "transaksi", label: "Transaksi" },
  { key: "keuangan", label: "Keuangan" },
  { key: "stok", label: "Stok" },
  { key: "pembeli", label: "Pembeli" },
  { key: "riwayat", label: "Riwayat" },
];

// ── Dropdown sub-tab ────────────────────────────────────────────────────────
function SubTabDropdown({ subTab, setSubTab }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function h(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const active = SUB_TABS.find((t) => t.key === subTab) ?? SUB_TABS[0];

  return (
    <div
      className="flex-shrink-0 bg-skin-card border-b border-skin-bdr px-3 py-2"
      ref={ref}
    >
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`w-full flex items-center justify-between gap-2 px-4 py-2 rounded-sm border transition text-sm font-semibold ${
            open
              ? "bg-[#CAB170] text-white border-[#CAB170]"
              : "bg-skin-raised text-skin-text border-skin-bdr hover:border-[#CAB170] hover:text-[#CAB170]"
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="uppercase tracking-[0.08em] text-xs">
              {active.label}
            </span>
          </span>
          <span
            className={`flex-shrink-0 text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-skin-card border border-skin-bdr shadow-xl overflow-hidden">
            {SUB_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setSubTab(t.key);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition border-b border-skin-bdr-lt last:border-0 ${
                  subTab === t.key
                    ? "bg-skin-gold text-[#CAB170] font-semibold"
                    : "text-skin-text2 hover:bg-skin-raised hover:text-skin-text"
                }`}
              >
                <span className="uppercase tracking-[0.06em] text-xs">
                  {t.label}
                </span>
                {subTab === t.key && (
                  <span className="ml-auto text-[#CAB170] font-bold">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Laporan({ location }) {
  const today = new Date().toISOString().split("T")[0];

  // ── Filter state ────────────────────────────────────────────────────────────
  const [filter, setFilter] = useState("today");
  const [customDate, setCustomDate] = useState(today);
  const [rangeFrom, setRangeFrom] = useState(today);
  const [rangeTo, setRangeTo] = useState(today);
  const [subTab, setSubTab] = useState("transaksi");

  const activeFilter = (() => {
    if (filter === "custom") return customDate;
    if (filter === "range") return `${rangeFrom}:${rangeTo}`;
    return filter;
  })();

  const { sales, loading, reload } = useSalesReport(activeFilter);

  // ── Hooks aksi ──────────────────────────────────────────────────────────────
  const createRetur = useCreateRetur();
  const deleteSale = useDeleteSale();
  const updateSale = useUpdateSale();

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [strukSale, setStrukSale] = useState(null);
  const [detailSale, setDetailSale] = useState(null);
  const [returSale, setReturSale] = useState(null);
  const [deleteSaleObj, setDeleteSaleObj] = useState(null);
  const [editSale, setEditSale] = useState(null);
  const [returSaving, setReturSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function showMsg(text) { toast.success(text); }

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function handleReturConfirm(items, total) {
    setReturSaving(true);
    try {
      await createRetur({ originalSale: returSale, items, total });
      setReturSale(null);
      showMsg("Retur berhasil — stok dikembalikan.");
      reload();
    } catch (err) {
      toast.error("Gagal retur: " + err.message);
    }
    setReturSaving(false);
  }

  async function handleDeleteConfirm() {
    setDeleting(true);
    try {
      await deleteSale(deleteSaleObj);
      setDeleteSaleObj(null);
      showMsg("Transaksi dihapus.");
      reload();
    } catch (err) {
      toast.error("Gagal hapus: " + err.message);
    }
    setDeleting(false);
  }

  async function handleEditSave(updatedSale) {
    try {
      await updateSale(updatedSale);
      setEditSale(null);
      showMsg("Transaksi berhasil diperbarui.");
      reload();
    } catch (err) {
      toast.error("Gagal update: " + err.message);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-skin-page">

      {/* Filter tanggal */}
      <FilterBar
        filter={filter}
        customDate={customDate}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        onFilter={setFilter}
        onDateChange={(date) => {
          setCustomDate(date);
          setFilter("custom");
        }}
        onRangeChange={(from, to) => {
          setRangeFrom(from);
          setRangeTo(to);
          setFilter("range");
        }}
      />

      {/* Sub-tab navigasi — dropdown */}
      <SubTabDropdown subTab={subTab} setSubTab={setSubTab} />

      {/* Konten sub-tab — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-center text-base text-skin-text3 py-16 tracking-[0.1em]">
            Memuat laporan...
          </p>
        ) : (
          <>
            {subTab === "transaksi" && (
              <TabTransaksi
                sales={sales}
                onDetail={setDetailSale}
                onStruk={setStrukSale}
                onRetur={setReturSale}
                onDelete={setDeleteSaleObj}
                onEdit={setEditSale}
              />
            )}
            {subTab === "keuangan" && <LaporanKeuangan sales={sales} />}
            {subTab === "stok" && <LaporanStok sales={sales} />}
            {subTab === "pembeli" && <LaporanPembeli sales={sales} />}
            {subTab === "riwayat" && (
              <LaporanRiwayat sales={sales} onDetail={setDetailSale} />
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {strukSale && (
        <Struk sale={strukSale} onClose={() => setStrukSale(null)} />
      )}
      {detailSale && (
        <DetailModal
          sale={detailSale}
          onClose={() => setDetailSale(null)}
          onStruk={(s) => setStrukSale(s)}
          onRetur={(s) => setReturSale(s)}
          onDelete={(s) => setDeleteSaleObj(s)}
          onEdit={(s) => setEditSale(s)}
        />
      )}
      {returSale && (
        <ReturModal
          sale={returSale}
          onClose={() => setReturSale(null)}
          onConfirm={handleReturConfirm}
          saving={returSaving}
        />
      )}
      {deleteSaleObj && (
        <DeleteConfirm
          sale={deleteSaleObj}
          onClose={() => setDeleteSaleObj(null)}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
        />
      )}
      {editSale && (
        <EditSaleModal
          sale={editSale}
          onClose={() => setEditSale(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}

// ── Sub-tab Transaksi ─────────────────────────────────────────────────────────
function TabTransaksi({ sales, onDetail, onStruk, onRetur, onDelete, onEdit }) {
  const realSales = sales.filter((s) => s.type !== "retur");
  const returSales = sales.filter((s) => s.type === "retur");
  const pending = sales.filter((s) => s.status === "pending").length;

  const omset = realSales.reduce((s, t) => s + (t.total ?? 0), 0);
  const untung = realSales.reduce(
    (s, t) =>
      s + (t.items ?? []).reduce((ss, item) => ss + itemProfit(item), 0),
    0,
  );

  return (
    <div className="flex flex-col">
      {/* ── Summary strip ── */}
      <div className="bg-skin-card border-b border-skin-bdr grid grid-cols-3 divide-x divide-skin-bdr">
        <div className="px-4 py-4 text-center">
          <p className="text-xs text-skin-text4 uppercase tracking-wider">
            Transaksi
          </p>
          <p className="font-headline text-2xl text-skin-text mt-1">
            {realSales.length}
          </p>
        </div>
        <div className="px-4 py-4 text-center">
          <p className="text-xs text-skin-text4 uppercase tracking-wider">
            Omset
          </p>
          <p className="font-headline text-lg text-[#CAB170] mt-1 leading-tight">
            {omset > 0 ? omset.toLocaleString("id-ID") : "—"}
          </p>
        </div>
        <div className="px-4 py-4 text-center">
          <p className="text-xs text-skin-text4 uppercase tracking-wider">
            Untung
          </p>
          <p className="font-headline text-lg text-green-600 mt-1 leading-tight">
            {untung > 0 ? untung.toLocaleString("id-ID") : "—"}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {pending > 0 && (
          <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-center justify-between rounded-sm">
            <p className="text-sm text-amber-800">⏳ {pending} belum sync</p>
            <p className="text-xs text-amber-500">otomatis saat online</p>
          </div>
        )}

        {sales.length === 0 && (
          <p className="text-center text-base text-skin-text4 py-16">
            Belum ada transaksi
          </p>
        )}

        {sales.map((sale) => (
          <SaleCard
            key={sale.id}
            sale={sale}
            onDetail={onDetail}
            onStruk={onStruk}
            onRetur={onRetur}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}
