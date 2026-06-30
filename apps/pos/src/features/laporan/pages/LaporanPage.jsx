/**
 * LaporanPage.jsx — Halaman laporan POS
 *
 * Sub-tab (dropdown, "Laporan" = default/pertama):
 * - Laporan   : kesimpulan singkat semua tab di bawah + link ke detailnya
 * - Transaksi : daftar transaksi + ringkasan singkat
 * - Keuangan  : omset, HPP, keuntungan, breakdown per hari
 * - Stok      : stok keluar/masuk per produk
 * - Pembeli   : top pembeli & lokasi
 * - Pasar     : laporan harian hari pasar (hari ini + history)
 * - BEP       : break-even point pasar (lihat bepUtils.js)
 *
 * Logika data  → ../../penjualan (fitur penjualan, barrel)
 * Helper       → ../../../shared/lib/salesUtils
 * Sub-komponen → ../components/
 */
import { useState, useRef } from "react";
import { useSalesReport, useCreateRetur, useDeleteSale, useUpdateSale } from "../../penjualan";
import FilterBar from "../components/FilterBar";
import SubTabDropdown from "../components/SubTabDropdown";
import TabTransaksi from "../components/TabTransaksi";
import DetailModal from "../components/DetailModal";
import ReturModal from "../components/ReturModal";
import DeleteConfirm from "../components/DeleteConfirm";
import EditSaleModal from "../components/EditSaleModal";
import Struk from "../../../shared/components/Struk";
import LaporanRingkasan from "../components/LaporanRingkasan";
import LaporanKeuangan from "../components/LaporanKeuangan";
import LaporanStok from "../components/LaporanStok";
import LaporanPembeli from "../components/LaporanPembeli";
import LaporanPasar from "../components/LaporanPasar";
import LaporanBep from "../components/LaporanBep";
import { toast } from "@deera/shared/features/toast/hooks";
import BackToTop from "@deera/shared/components/BackToTop";

export default function Laporan({ location }) {
  const today = new Date().toISOString().split("T")[0];

  // ── Filter state ────────────────────────────────────────────────────────────
  const [filter, setFilter] = useState("today");
  const [customDate, setCustomDate] = useState(today);
  const [rangeFrom, setRangeFrom] = useState(today);
  const [rangeTo, setRangeTo] = useState(today);
  const [subTab, setSubTab] = useState("ringkasan");

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

  function showMsg(text) {
    toast.success(text);
  }

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
      // deleteSale() memastikan penghapusan di server berhasil dulu (kalau
      // transaksi ini sudah pernah ke-insert ke Supabase) sebelum salinan
      // lokal ikut terhapus — kalau gagal, ia throw (lihat features/penjualan)
      // dan modal konfirmasi di bawah tetap terbuka supaya user bisa coba lagi.
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

  const scrollRef = useRef(null);

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
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-center text-base text-skin-text3 py-16 tracking-[0.1em]">
            Memuat laporan...
          </p>
        ) : (
          <>
            {subTab === "ringkasan" && <LaporanRingkasan sales={sales} onNavigate={setSubTab} />}
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
            {subTab === "pasar" && <LaporanPasar sales={sales} />}
            {subTab === "bep" && <LaporanBep />}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {strukSale && <Struk sale={strukSale} onClose={() => setStrukSale(null)} />}
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
        <EditSaleModal sale={editSale} onClose={() => setEditSale(null)} onSave={handleEditSave} />
      )}
      <BackToTop scrollEl={scrollRef} bottomClass="bottom-20" threshold={150} />
    </div>
  );
}
