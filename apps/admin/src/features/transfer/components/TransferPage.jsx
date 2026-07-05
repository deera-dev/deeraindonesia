/**
 * TransferPage.jsx
 * Halaman manajemen transfer stok antar lokasi.
 *
 * Workflow:
 * 1. Klik "+ Transfer" → isi form (pilih barang dari stok nyata)
 * 2. Konfirmasi → simpan (status: pending) → surat jalan dibuka
 * 3. Stok BELUM berubah saat pending
 * 4. Klik Approve → konfirmasi → stok berpindah
 * 5. Klik Tolak  → konfirmasi + alasan → transfer ditolak
 * 6. Edit/Hapus hanya untuk pending
 */
import { useState } from "react";
import { useAuth } from "@deera/shared/features/auth/hooks";
import BackToTop from "@deera/shared/components/BackToTop";
import { toast } from "@deera/shared/features/toast/hooks";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import {
  useTransfers,
  usePendingTransferCount,
  useApproveTransfer,
  useRejectTransfer,
  useDeleteTransfer,
  useUpdateTransfer,
} from "@deera/shared/features/transfers/hooks";
import TransferForm from "./TransferForm";
import TransferCard from "./TransferCard";
import SuratJalan from "./SuratJalan";
import ConfirmModal from "./ConfirmModal";

const STATUS_TABS = [
  { key: "pending", label: "Menunggu" },
  { key: "approved", label: "Disetujui" },
  { key: "rejected", label: "Ditolak" },
];

// ── Hitung from/to dari preset filter tanggal ────────────────────────────────
function resolveDateRange(preset, customFrom, customTo) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  if (preset === "today") return { from: todayStr, to: todayStr };
  if (preset === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: d.toISOString().split("T")[0], to: todayStr };
  }
  if (preset === "month") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: d.toISOString().split("T")[0], to: todayStr };
  }
  if (preset === "custom") return { from: customFrom || todayStr, to: customTo || todayStr };
  return { from: null, to: null }; // "all" — tidak filter tanggal
}

export default function TransferPage() {
  const { user } = useAuth();
  const [statusTab, setStatusTab] = useState("pending");
  const [datePreset, setDatePreset] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [suratJalan, setSuratJalan] = useState(null);

  // Confirm modal state
  const [confirm, setConfirm] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { from: dateFrom, to: dateTo } = resolveDateRange(datePreset, customFrom, customTo);
  const { transfers, loading, reload } = useTransfers(statusTab, dateFrom, dateTo);

  const approveHook = useApproveTransfer();
  const rejectHook = useRejectTransfer();
  const deleteHook = useDeleteTransfer();
  const updateHook = useUpdateTransfer();

  function showMsg(text) {
    toast.success(text);
  }

  // ── Confirm flow ─────────────────────────────────────────────────────────────
  function openConfirm(type, transfer, pendingData = null) {
    setConfirm({ type, transfer, pendingData });
  }

  async function handleConfirm(data) {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      const { type, transfer, pendingData } = confirm;

      if (type === "approve") {
        await approveHook(transfer);
        setConfirm(null);
        showMsg(`✓ Transfer ${transfer.transfer_no} disetujui. Stok sudah berpindah.`);
        reload();
      } else if (type === "reject") {
        await rejectHook(transfer, data?.reason ?? "");
        setConfirm(null);
        showMsg(`Transfer ${transfer.transfer_no} ditolak.`);
        reload();
      } else if (type === "delete") {
        await deleteHook(transfer);
        setConfirm(null);
        showMsg("Transfer dihapus.");
        reload();
      } else if (type === "surat_jalan") {
        // pendingData = { fromLocation, toLocation, items, notes, savedTransfer }
        // Transfer sudah disimpan saat form submit, tinggal buka surat jalan
        setConfirm(null);
        setSuratJalan(pendingData.savedTransfer);
        showMsg(`Surat jalan ${pendingData.savedTransfer.transfer_no} berhasil dibuat.`);
        reload();
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setConfirmLoading(false);
    }
  }

  // ── Form saved → konfirmasi surat jalan dulu ─────────────────────────────────
  function handleFormSaved(transfer) {
    setShowForm(false);
    setEditTarget(null);
    openConfirm("surat_jalan", transfer, { savedTransfer: transfer });
  }

  // ── Update (edit) langsung tanpa confirm ──────────────────────────────────────
  async function handleEditSaved(transfer, payload) {
    try {
      await updateHook(transfer, payload);
      setEditTarget(null);
      showMsg("Transfer berhasil diperbarui.");
      reload();
    } catch (err) {
      alert(err.message);
    }
  }

  // Badge pending (tidak dipengaruhi filter tanggal/status tab aktif)
  const pendingCount = usePendingTransferCount();

  return (
    <main className="min-h-screen bg-skin-page text-skin-text pb-20">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="font-headline text-[#CAB170] text-xl leading-none">Transfer Stok</h1>
            {pendingCount > 0 && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                {pendingCount} transfer menunggu approval
              </p>
            )}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2.5 font-editorial text-sm tracking-[0.15em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition"
          >
            Transfer
          </button>
        </div>

        {/* Filter tanggal */}
        <div className="border-t border-skin-bdr-lt px-4 py-2 flex items-center gap-2 flex-wrap">
          {[
            { key: "today", label: "Hari Ini" },
            { key: "week", label: "7 Hari" },
            { key: "month", label: "Bulan Ini" },
            { key: "custom", label: "Custom" },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setDatePreset(p.key)}
              className={`px-3 py-1 text-xs font-semibold tracking-[0.06em] uppercase transition border ${
                datePreset === p.key
                  ? "bg-[#CAB170] text-white border-[#CAB170]"
                  : "border-skin-bdr text-skin-text3 hover:text-skin-text2 hover:border-[#CAB170]"
              }`}
            >
              {p.label}
            </button>
          ))}
          {datePreset === "custom" && (
            <div className="flex items-center gap-1.5 ml-1">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="border border-skin-bdr bg-skin-card text-skin-text text-xs px-2 py-1 focus:outline-none focus:border-[#CAB170]"
              />
              <span className="text-xs text-skin-text3">—</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="border border-skin-bdr bg-skin-card text-skin-text text-xs px-2 py-1 focus:outline-none focus:border-[#CAB170]"
              />
            </div>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex border-t border-skin-bdr-lt">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`flex-1 py-2.5 text-xs tracking-[0.08em] uppercase font-semibold transition border-b-2 ${
                statusTab === tab.key
                  ? "border-[#CAB170] text-[#CAB170]"
                  : "border-transparent text-skin-text3 hover:text-skin-text2"
              }`}
            >
              {tab.label}
              {tab.key === "pending" && pendingCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold bg-amber-400 text-white rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── Notif ── */}

      {/* ── Info box ── */}
      <div className="mx-4 mt-4 mb-2 bg-skin-gold border border-skin-bdr-gold px-4 py-3 text-xs text-skin-text2 leading-relaxed">
        <p className="font-semibold mb-1">Cara kerja:</p>
        <p>1. Buat transfer → pilih barang dari stok nyata → surat jalan digenerate</p>
        <p>2. Share surat jalan via WA ke penerima barang</p>
        <p>
          3. Setelah barang diterima → <strong>Approve</strong> → stok langsung berubah
        </p>
      </div>

      {/* ── Daftar ── */}
      <div className="px-4 py-4 md:px-8 space-y-3">
        {loading && <p className="text-center text-sm text-skin-text3 py-12">Memuat data...</p>}

        {!loading && transfers.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-skin-text4">Belum ada transfer</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-6 py-3 bg-[#CAB170] text-white text-sm tracking-[0.1em] uppercase font-semibold hover:bg-[#A8925A] transition"
            >
              + Buat Transfer Pertama
            </button>
          </div>
        )}

        {transfers.map((transfer) => (
          <TransferCard
            key={transfer.id}
            transfer={transfer}
            currentUser={user}
            onApprove={(t) => openConfirm("approve", t)}
            onReject={(t) => openConfirm("reject", t)}
            onDelete={(t) => openConfirm("delete", t)}
            onEdit={(t) => setEditTarget(t)}
            onSuratJalan={setSuratJalan}
          />
        ))}
      </div>

      {/* ── Modals ── */}

      {/* Form buat transfer baru */}
      {showForm && <TransferForm onClose={() => setShowForm(false)} onSaved={handleFormSaved} />}

      {/* Form edit transfer */}
      {editTarget && (
        <TransferForm
          initialData={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(transfer) => {
            setEditTarget(null);
            showMsg(`Transfer ${transfer.transfer_no} diperbarui.`);
            reload();
          }}
        />
      )}

      {/* Surat jalan viewer */}
      {suratJalan && <SuratJalan transfer={suratJalan} onClose={() => setSuratJalan(null)} />}

      {/* Konfirmasi modal */}
      {confirm && (
        <ConfirmModal
          type={confirm.type}
          transfer={confirm.transfer}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
          loading={confirmLoading}
        />
      )}
      <AdminBottomNav />
      <BackToTop bottomClass="bottom-24" />
    </main>
  );
}
