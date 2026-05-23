/**
 * Transfer.jsx
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
import { Link } from "react-router-dom";
import { useAuth } from "@deera/shared/hooks/useAuth";
import {
  useTransfers,
  useApproveTransfer,
  useRejectTransfer,
  useDeleteTransfer,
  useUpdateTransfer,
} from "@deera/shared/hooks/useTransfers";
import TransferForm  from "../components/transfer/TransferForm";
import TransferCard  from "../components/transfer/TransferCard";
import SuratJalan    from "../components/transfer/SuratJalan";
import ConfirmModal  from "../components/transfer/ConfirmModal";

const STATUS_TABS = [
  { key: "all",      label: "Semua"     },
  { key: "pending",  label: "Menunggu"  },
  { key: "approved", label: "Disetujui" },
  { key: "rejected", label: "Ditolak"   },
];

export default function Transfer() {
  const { user }  = useAuth();
  const [statusTab,  setStatusTab]  = useState("all");
  const [showForm,   setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);   // transfer yang diedit
  const [suratJalan, setSuratJalan] = useState(null);   // surat jalan yang dibuka
  const [msg,        setMsg]        = useState("");

  // Confirm modal state
  const [confirm, setConfirm] = useState(null);
  // { type: "approve"|"reject"|"delete"|"surat_jalan", transfer, pendingData }
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { transfers, loading, reload } = useTransfers(statusTab);

  const approveHook = useApproveTransfer();
  const rejectHook  = useRejectTransfer();
  const deleteHook  = useDeleteTransfer();
  const updateHook  = useUpdateTransfer();

  function showMsg(text) { setMsg(text); setTimeout(() => setMsg(""), 5000); }

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
      }

      else if (type === "reject") {
        await rejectHook(transfer, data?.reason ?? "");
        setConfirm(null);
        showMsg(`Transfer ${transfer.transfer_no} ditolak.`);
        reload();
      }

      else if (type === "delete") {
        await deleteHook(transfer);
        setConfirm(null);
        showMsg("Transfer dihapus.");
        reload();
      }

      else if (type === "surat_jalan") {
        // pendingData = { fromLocation, toLocation, items, notes, savedTransfer }
        // Transfer sudah disimpan saat form submit, tinggal buka surat jalan
        setConfirm(null);
        setSuratJalan(pendingData.savedTransfer);
        showMsg(`Surat jalan ${pendingData.savedTransfer.transfer_no} berhasil dibuat.`);
        reload();
      }
    } catch (err) {
      alert(err.message);
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
    } catch (err) { alert(err.message); }
  }

  const pendingCount = transfers.filter(t => t.status === "pending").length;

  return (
    <main className="min-h-screen bg-skin-page text-skin-text">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link to="/admin" className="text-skin-text3 hover:text-[#CAB170] transition text-sm">← Admin</Link>
              <span className="text-skin-bdr">/</span>
              <h1 className="font-headline text-[#CAB170] text-xl leading-none">Transfer Stok</h1>
            </div>
            {pendingCount > 0 && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                ⏳ {pendingCount} transfer menunggu approval
              </p>
            )}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2.5 font-editorial text-sm tracking-[0.15em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition"
          >
            + Transfer
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex border-t border-skin-bdr-lt">
          {STATUS_TABS.map(tab => (
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
      {msg && (
        <div className="bg-green-50 border-b-2 border-green-300 px-4 py-3 text-center">
          <p className="text-sm text-green-800 font-semibold">{msg}</p>
        </div>
      )}

      {/* ── Info box ── */}
      <div className="mx-4 mt-4 mb-2 bg-skin-gold border border-skin-bdr-gold px-4 py-3 text-xs text-skin-text2 leading-relaxed">
        <p className="font-semibold mb-1">Cara kerja:</p>
        <p>1. Buat transfer → pilih barang dari stok nyata → surat jalan digenerate</p>
        <p>2. Share surat jalan via WA ke penerima barang</p>
        <p>3. Setelah barang diterima → <strong>Approve</strong> → stok langsung berubah</p>
      </div>

      {/* ── Daftar ── */}
      <div className="px-4 py-4 md:px-8 space-y-3">
        {loading && (
          <p className="text-center text-sm text-skin-text3 py-12">Memuat data...</p>
        )}

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

        {transfers.map(transfer => (
          <TransferCard
            key={transfer.id}
            transfer={transfer}
            currentUser={user}
            onApprove={t => openConfirm("approve", t)}
            onReject={t  => openConfirm("reject",  t)}
            onDelete={t  => openConfirm("delete",  t)}
            onEdit={t    => setEditTarget(t)}
            onSuratJalan={setSuratJalan}
          />
        ))}
      </div>

      {/* ── Modals ── */}

      {/* Form buat transfer baru */}
      {showForm && (
        <TransferForm
          onClose={() => setShowForm(false)}
          onSaved={handleFormSaved}
        />
      )}

      {/* Form edit transfer */}
      {editTarget && (
        <TransferForm
          initialData={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={transfer => {
            setEditTarget(null);
            showMsg(`Transfer ${transfer.transfer_no} diperbarui.`);
            reload();
          }}
        />
      )}

      {/* Surat jalan viewer */}
      {suratJalan && (
        <SuratJalan
          transfer={suratJalan}
          onClose={() => setSuratJalan(null)}
        />
      )}

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
    </main>
  );
}
