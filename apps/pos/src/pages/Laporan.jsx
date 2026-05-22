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
import { useState } from "react";
import { useSalesReport, useCreateRetur, useDeleteSale, useUpdateSale } from "../hooks/useSales";
import { effectiveQty, itemProfit } from "../lib/salesUtils";
import FilterBar      from "../components/laporan/FilterBar";
import SaleCard       from "../components/laporan/SaleCard";
import DetailModal    from "../components/laporan/DetailModal";
import ReturModal     from "../components/laporan/ReturModal";
import DeleteConfirm  from "../components/laporan/DeleteConfirm";
import EditSaleModal  from "../components/laporan/EditSaleModal";
import Struk          from "../components/Struk";
import LaporanKeuangan from "../components/laporan/LaporanKeuangan";
import LaporanStok     from "../components/laporan/LaporanStok";
import LaporanPembeli  from "../components/laporan/LaporanPembeli";
import LaporanRiwayat  from "../components/laporan/LaporanRiwayat";

const SUB_TABS = [
  { key: "transaksi", label: "Transaksi" },
  { key: "keuangan",  label: "Keuangan"  },
  { key: "stok",      label: "Stok"      },
  { key: "pembeli",   label: "Pembeli"   },
  { key: "riwayat",   label: "Riwayat"   },
];

export default function Laporan({ location }) {
  const today = new Date().toISOString().split("T")[0];

  // ── Filter state ────────────────────────────────────────────────────────────
  const [filter,     setFilter]    = useState("today");
  const [customDate, setCustomDate] = useState(today);
  const [rangeFrom,  setRangeFrom]  = useState(today);
  const [rangeTo,    setRangeTo]    = useState(today);
  const [subTab,     setSubTab]     = useState("transaksi");

  const activeFilter = (() => {
    if (filter === "custom") return customDate;
    if (filter === "range")  return `${rangeFrom}:${rangeTo}`;
    return filter;
  })();

  const { sales, loading, reload } = useSalesReport(activeFilter);

  // ── Hooks aksi ──────────────────────────────────────────────────────────────
  const createRetur = useCreateRetur();
  const deleteSale  = useDeleteSale();
  const updateSale  = useUpdateSale();

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [strukSale,     setStrukSale]     = useState(null);
  const [detailSale,    setDetailSale]    = useState(null);
  const [returSale,     setReturSale]     = useState(null);
  const [deleteSaleObj, setDeleteSaleObj] = useState(null);
  const [editSale,      setEditSale]      = useState(null);
  const [returSaving,   setReturSaving]   = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [msg,           setMsg]           = useState("");

  function showMsg(text) { setMsg(text); setTimeout(() => setMsg(""), 4000); }

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function handleReturConfirm(items, total) {
    setReturSaving(true);
    try {
      await createRetur({ originalSale: returSale, items, total });
      setReturSale(null);
      showMsg("Retur berhasil — stok dikembalikan.");
      reload();
    } catch (err) { alert("Gagal retur: " + err.message); }
    setReturSaving(false);
  }

  async function handleDeleteConfirm() {
    setDeleting(true);
    try {
      await deleteSale(deleteSaleObj);
      setDeleteSaleObj(null);
      showMsg("Transaksi dihapus.");
      reload();
    } catch (err) { alert("Gagal hapus: " + err.message); }
    setDeleting(false);
  }

  async function handleEditSave(updatedSale) {
    try {
      await updateSale(updatedSale);
      setEditSale(null);
      showMsg("Transaksi berhasil diperbarui.");
      reload();
    } catch (err) { alert("Gagal update: " + err.message); }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100dvh-108px)] bg-[#F9F7F4]">

      {/* Notifikasi sukses */}
      {msg && (
        <div className="bg-green-50 border-b-2 border-green-300 px-4 py-3 text-center flex-shrink-0">
          <p className="text-base text-green-800 font-semibold">✓ {msg}</p>
        </div>
      )}

      {/* Filter tanggal */}
      <FilterBar
        filter={filter}
        customDate={customDate}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        onFilter={setFilter}
        onDateChange={(date) => { setCustomDate(date); setFilter("custom"); }}
        onRangeChange={(from, to) => { setRangeFrom(from); setRangeTo(to); setFilter("range"); }}
      />

      {/* Sub-tab navigasi */}
      <div className="flex border-b-2 border-[#E8E3DC] bg-white flex-shrink-0">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex-1 py-3 text-sm tracking-[0.06em] uppercase font-semibold transition ${
              subTab === t.key
                ? "border-b-2 border-[#CAB170] text-[#CAB170]"
                : "text-[#9C9690] hover:text-[#6B6560]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Konten sub-tab — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-center text-base text-[#9C9690] py-16 tracking-[0.1em]">Memuat laporan...</p>
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
            {subTab === "keuangan"  && <LaporanKeuangan sales={sales} />}
            {subTab === "stok"      && <LaporanStok     sales={sales} />}
            {subTab === "pembeli"   && <LaporanPembeli  sales={sales} />}
            {subTab === "riwayat"   && <LaporanRiwayat  sales={sales} onDetail={setDetailSale} />}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {strukSale    && <Struk sale={strukSale} onClose={() => setStrukSale(null)} />}
      {detailSale   && (
        <DetailModal
          sale={detailSale}
          onClose={() => setDetailSale(null)}
          onStruk={(s) => setStrukSale(s)}
          onRetur={(s) => setReturSale(s)}
          onDelete={(s) => setDeleteSaleObj(s)}
          onEdit={(s) => setEditSale(s)}
        />
      )}
      {returSale    && (
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
  const realSales  = sales.filter((s) => s.type !== "retur");
  const returSales = sales.filter((s) => s.type === "retur");
  const pending    = sales.filter((s) => s.status === "pending").length;

  const omset  = realSales.reduce((s, t) => s + (t.total ?? 0), 0);
  const untung = realSales.reduce((s, t) =>
    s + (t.items ?? []).reduce((ss, item) => ss + itemProfit(item), 0), 0);

  return (
    <div className="p-4 space-y-3">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white border-2 border-[#E8E3DC] px-3 py-3 text-center">
          <p className="text-xs text-[#9C9690] uppercase tracking-wide">Transaksi</p>
          <p className="text-xl font-bold text-[#1A1918] mt-1">{realSales.length}</p>
        </div>
        <div className="bg-white border-2 border-[#E8E3DC] px-3 py-3 text-center">
          <p className="text-xs text-[#9C9690] uppercase tracking-wide">Omset</p>
          <p className="text-base font-bold text-[#CAB170] mt-1 leading-tight" style={{ fontFamily: "'Braise', serif" }}>
            {omset.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="bg-white border-2 border-[#E8E3DC] px-3 py-3 text-center">
          <p className="text-xs text-[#9C9690] uppercase tracking-wide">Untung</p>
          <p className="text-base font-bold text-green-600 mt-1 leading-tight" style={{ fontFamily: "'Braise', serif" }}>
            {untung > 0 ? untung.toLocaleString("id-ID") : "—"}
          </p>
        </div>
      </div>

      {pending > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 px-4 py-3 flex items-center justify-between">
          <p className="text-base text-amber-800 font-medium">⏳ {pending} transaksi belum sync</p>
          <p className="text-sm text-amber-600">otomatis saat online</p>
        </div>
      )}

      {sales.length === 0 && (
        <p className="text-center text-base text-[#C8C4C0] py-16">Belum ada transaksi</p>
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
  );
}
