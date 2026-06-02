/**
 * ProduksiBahan.jsx — Halaman manajemen bahan baku.
 *
 * Tab "Pembelian" : daftar & catat beli bahan + jatuh tempo
 * Tab "Pinjam"    : daftar & catat bahan pinjam + surat jalan
 * Tab "Stok"      : ringkasan stok bahan (masuk - keluar produksi)
 */
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { useAuth } from "@deera/shared/hooks/useAuth";
import BackToTop from "@deera/shared/components/BackToTop";
import ProduksiLayout from "../components/produksi/ProduksiLayout";
import { logHistory } from "../hooks/useHistory";
import { toast } from "@deera/shared/lib/toast";
import { fmtRp } from "../components/produksi/bahan/bahanUtils";
import PembelianBulkForm from "../components/produksi/bahan/PembelianBulkForm";
import PinjamBulkForm from "../components/produksi/bahan/PinjamBulkForm";
import BahanForm from "../components/produksi/bahan/BahanForm";
import BahanCard from "../components/produksi/bahan/BahanCard";
import StokPanel from "../components/produksi/bahan/StokPanel";
import SuratJalanPinjamModal from "../components/produksi/bahan/SuratJalanPinjamModal";
import MergeDupeModal from "../components/produksi/bahan/MergeDupeModal";

// Modal wrapper
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg max-h-[95dvh] overflow-y-auto border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt sticky top-0 bg-skin-card z-10">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text transition text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

const TABS = [
  { key: "pembelian", label: "Pembelian" },
  { key: "pinjam", label: "Pinjam" },
  { key: "stok", label: "Stok Bahan" },
];


// ── Tagihan per Bulan + Share WA ───────────────────────────────────────────

function fmtBulan(dateStr) {
  if (!dateStr) return "—";
  const [y, m] = dateStr.split("-");
  const names = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return `${names[Number(m) - 1]} ${y}`;
}

function fmtTanggalLengkap(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function groupTagihanPerBulan(items) {
  // Hanya yang belum lunas, group by bulan jatuh_tempo
  const belum = items.filter((r) => r.status_bayar === "belum" && r.jatuh_tempo);
  const map = {};
  for (const r of belum) {
    const bulanKey = r.jatuh_tempo.slice(0, 7); // "YYYY-MM"
    if (!map[bulanKey]) map[bulanKey] = { bulan: bulanKey, total: 0, items: [] };
    map[bulanKey].total += r.total_harga ?? 0;
    map[bulanKey].items.push(r);
  }
  return Object.values(map).sort((a, b) => a.bulan.localeCompare(b.bulan));
}

function generateTagihanWA(groups) {
  if (!groups.length) return "Tidak ada tagihan yang belum lunas.";
  const sep = "━━━━━━━━━━━━━━━━━━━";
  const fmtRpWA = (n) => "Rp " + Number(n).toLocaleString("id-ID");
  const pad = (s, n) => s + " ".repeat(Math.max(0, n - s.length));

  let lines = [];
  lines.push("*🧾 TAGIHAN BAHAN BAKU — DEERA*");
  lines.push(sep);
  lines.push("");

  for (const g of groups) {
    lines.push(`*📅 Jatuh Tempo: ${fmtBulan(g.bulan + "-01")}*`);
    for (const r of g.items) {
      lines.push(`  • ${r.nama_bahan}${r.motif ? " / " + r.motif : ""}`);
      lines.push(`    Beli: ${fmtTanggalLengkap(r.tanggal)} · ${r.jumlah} ${r.satuan}`);
      lines.push(`    Tempo: ${fmtTanggalLengkap(r.jatuh_tempo)}`);
      lines.push(`    *${fmtRpWA(r.total_harga)}*`);
    }
    lines.push(`  ${sep}`);
    lines.push(`  *Total ${fmtBulan(g.bulan + "-01")}: ${fmtRpWA(g.total)}*`);
    lines.push("");
  }

  const grandTotal = groups.reduce((s, g) => s + g.total, 0);
  lines.push(sep);
  lines.push(`*TOTAL SEMUA TAGIHAN: ${fmtRpWA(grandTotal)}*`);
  lines.push("");
  lines.push("_Deera Indonesia_");
  return lines.join("\n");
}

function ShareTagihanModal({ groups, onClose }) {
  const [copied, setCopied] = useState(false);
  const waText = generateTagihanWA(groups).replace(/\\n/g, "\n");

  const copy = () => {
    navigator.clipboard.writeText(waText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const openWA = () => window.open("https://wa.me/?text=" + encodeURIComponent(waText), "_blank");

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">Bagikan Tagihan</h2>
          <button onClick={onClose} className="text-skin-text3 hover:text-red-500 text-2xl leading-none transition">×</button>
        </div>
        <div className="p-4 space-y-3">
          <p className="font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3">Preview teks WhatsApp</p>
          <pre className="bg-skin-raised border border-skin-bdr px-3 py-3 text-xs text-skin-text font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
            {waText}
          </pre>
          <div className="flex gap-2">
            <button onClick={copy}
              className={`flex-1 py-3 font-editorial text-xs tracking-[0.15em] uppercase border-2 transition ${copied ? "border-emerald-500 text-emerald-500" : "border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170]"}`}>
              {copied ? "✓ Disalin!" : "Salin Teks"}
            </button>
            <button onClick={openWA}
              className="flex-1 py-3 font-editorial text-xs tracking-[0.15em] uppercase bg-[#25D366] hover:bg-[#1eb558] text-white transition">
              Buka di WA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TagihanBulanPanel({ items }) {
  const [open, setOpen] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const groups = groupTagihanPerBulan(items);

  if (!groups.length) return null;
  const grandTotal = groups.reduce((s, g) => s + g.total, 0);

  return (
    <div className="mb-4 border border-amber-500/30 bg-amber-500/5">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="font-editorial text-[10px] tracking-[0.2em] uppercase text-amber-500">
            Tagihan per Bulan (Belum Lunas)
          </p>
          <p className="font-bold text-amber-600 dark:text-amber-400 text-sm mt-0.5">{fmtRp(grandTotal)}</p>
        </div>
        <span className="text-amber-500 text-xs">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="border-t border-amber-500/20 px-4 pb-4 space-y-4 pt-3">
          {groups.map((g) => (
            <div key={g.bulan}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-editorial text-xs font-semibold text-skin-text2">
                  📅 Jatuh Tempo {fmtBulan(g.bulan + "-01")}
                </p>
                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">{fmtRp(g.total)}</span>
              </div>
              <div className="space-y-1.5">
                {g.items.map((r) => (
                  <div key={r.id} className="bg-skin-raised border border-skin-bdr-lt px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-skin-text truncate">
                          {r.nama_bahan}{r.motif ? <span className="font-normal text-skin-text3"> / {r.motif}</span> : ""}
                        </p>
                        <p className="text-[11px] text-skin-text3">
                          Beli {fmtTanggalLengkap(r.tanggal)} · {r.jumlah} {r.satuan}
                        </p>
                        <p className="text-[11px] text-amber-500">
                          Tempo: {fmtTanggalLengkap(r.jatuh_tempo)}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-skin-text shrink-0">{fmtRp(r.total_harga)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={() => setShowShare(true)}
            className="w-full py-2.5 font-editorial text-xs tracking-[0.18em] uppercase border-2 border-[#CAB170]/40 text-[#CAB170] hover:bg-[#CAB170]/10 transition"
          >
            📤 Bagikan ke WhatsApp
          </button>
        </div>
      )}

      {showShare && <ShareTagihanModal groups={groups} onClose={() => setShowShare(false)} />}
    </div>
  );
}

export default function ProduksiBahan() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pembelian");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [suratJalan, setSuratJalan] = useState(null);
  const [filterStatus, setFilterStatus] = useState("semua");
  const [search, setSearch] = useState("");
  const [showMerge, setShowMerge] = useState(false);

  const table = activeTab === "pinjam" ? "bahan_pinjam" : "bahan_pembelian";

  const loadItems = useCallback(async () => {
    if (activeTab === "stok") return;
    setLoading(true);
    const { data } = await supabase.from(table).select("*").order("tanggal", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, [activeTab, table]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleSave(payload) {
    const meta = {
      created_by: user?.email,
      created_by_name: user?.user_metadata?.full_name ?? user?.email,
    };
    if (Array.isArray(payload)) {
      await supabase
        .from(table)
        .insert(payload.map((p) => ({ ...p, ...meta })))
        .throwOnError();
    } else if (editing) {
      await supabase
        .from(table)
        .update({ ...payload, ...meta })
        .eq("id", editing.id)
        .throwOnError();
    } else {
      await supabase
        .from(table)
        .insert({ ...payload, ...meta })
        .throwOnError();
    }
    logHistory({
      action: activeTab === "pinjam" ? "bahan-pinjam" : "bahan-beli",
      category: "produksi",
      kode: Array.isArray(payload)
        ? (payload[0]?.kode_bahan ?? "")
        : (payload.kode_bahan ?? editing?.kode_bahan ?? ""),
      nama: Array.isArray(payload)
        ? (payload[0]?.nama_bahan ?? "")
        : (payload.nama_bahan ?? editing?.nama_bahan ?? ""),
      snapshot: Array.isArray(payload) ? { bulk: payload.length } : payload,
      before: editing ? { ...editing } : undefined,
    }).catch(() => {});
    toast.success(editing ? "Data berhasil diperbarui." : "Data berhasil disimpan.");
    setShowForm(false);
    setEditing(null);
    loadItems();
  }

  async function handleToggleLunas(item) {
    const next = item.status_bayar === "lunas" ? "belum" : "lunas";
    await supabase.from(table).update({ status_bayar: next }).eq("id", item.id);
    setItems((prev) => prev.map((r) => (r.id === item.id ? { ...r, status_bayar: next } : r)));
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from(table).delete().eq("id", deleteTarget.id);
    logHistory({
      action: "bahan-hapus",
      category: "produksi",
      kode: deleteTarget.kode_bahan ?? "",
      nama: deleteTarget.nama_bahan ?? "",
      snapshot: { ...deleteTarget, sumber: activeTab },
    }).catch(() => {});
    toast.success("Data berhasil dihapus.");
    setDeleteTarget(null);
    loadItems();
  }

  const displayed = items.filter((item) => {
    const matchStatus = filterStatus === "semua" || item.status_bayar === filterStatus;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (item.nama_bahan ?? "").toLowerCase().includes(q) ||
      (item.kode_bahan ?? "").toLowerCase().includes(q) ||
      (item.nama_pemberi ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalBelum = items
    .filter((r) => r.status_bayar === "belum")
    .reduce((s, r) => s + (r.total_harga ?? 0), 0);

  function openEdit(i) {
    setEditing(i);
    setShowForm(true);
  }

  function openSuratJalan(clicked) {
    const related = items.filter(
      (r) => r.nama_pemberi === clicked.nama_pemberi && r.tanggal === clicked.tanggal,
    );
    setSuratJalan(related.length > 0 ? related : [clicked]);
  }

  const formTitle =
    !editing && activeTab === "pembelian"
      ? "Tambah Pembelian Bahan"
      : !editing && activeTab === "pinjam"
        ? "Tambah Bahan Pinjam"
        : `Edit ${activeTab === "pinjam" ? "Bahan Pinjam" : "Pembelian Bahan"}`;

  return (
    <ProduksiLayout title="Bahan Baku">
      {/* Tab switcher */}
      <div className="flex border border-skin-bdr mb-5">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key);
              setSearch("");
              setFilterStatus("semua");
            }}
            className={`flex-1 py-2.5 font-editorial text-xs tracking-[0.18em] uppercase transition border-r last:border-r-0 border-skin-bdr ${
              activeTab === key
                ? "bg-[#CAB170] text-white"
                : "text-skin-text3 hover:text-skin-text bg-skin-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "stok" ? (
        <StokPanel />
      ) : (
        <>
          {/* Ringkasan tagihan belum lunas */}
          {totalBelum > 0 && (
            <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
              <span className="text-xs font-editorial tracking-[0.15em] uppercase text-amber-700 dark:text-amber-400">
                Belum Lunas
              </span>
              <span className="font-bold text-amber-700 dark:text-amber-400">
                {fmtRp(totalBelum)}
              </span>
            </div>
          )}

          {/* Tagihan per bulan (pembelian saja) */}
          {activeTab === "pembelian" && <TagihanBulanPanel items={items} />}

          {/* Toolbar: search + filter + gabung + tambah */}
          <div className="space-y-2 mb-4">
            <input
              type="text"
              placeholder="Cari nama bahan, kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition"
            />
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-3 py-2 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition"
              >
                <option value="semua">Semua Status</option>
                <option value="belum">Belum Lunas</option>
                <option value="lunas">Lunas</option>
              </select>
              <button
                onClick={() => setShowMerge(true)}
                title="Deteksi dan gabung entri duplikat"
                className="px-3 py-2 font-editorial text-sm tracking-[0.1em] uppercase border border-skin-bdr text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] transition shrink-0"
              >
                Gabung
              </button>
              <button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="px-5 py-2 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition shrink-0"
              >
                + Tambah
              </button>
            </div>
          </div>

          {/* Daftar */}
          {loading ? (
            <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
          ) : displayed.length === 0 ? (
            <p className="text-sm text-skin-text3 text-center py-8">
              {items.length === 0
                ? `Belum ada data ${activeTab === "pinjam" ? "bahan pinjam" : "pembelian bahan"}.`
                : "Tidak ada data yang cocok."}
            </p>
          ) : (
            <div className="space-y-3">
              {displayed.map((item) => (
                <BahanCard
                  key={item.id}
                  item={item}
                  isPinjam={activeTab === "pinjam"}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onToggleLunas={handleToggleLunas}
                  onSuratJalan={openSuratJalan}
                />
              ))}
            </div>
          )}
        </>
      )}

      <BackToTop bottomClass="bottom-24" />

      {/* Modal form tambah/edit */}
      {showForm && (
        <Modal
          title={formTitle}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        >
          {activeTab === "pembelian" && !editing ? (
            <PembelianBulkForm onSave={handleSave} onCancel={() => setShowForm(false)} />
          ) : activeTab === "pinjam" && !editing ? (
            <PinjamBulkForm onSave={handleSave} onCancel={() => setShowForm(false)} />
          ) : (
            <BahanForm
              mode={activeTab}
              initial={editing}
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false);
                setEditing(null);
              }}
            />
          )}
        </Modal>
      )}

      {/* Modal konfirmasi hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="absolute inset-0" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-skin-card border-2 border-skin-bdr p-6 w-full max-w-sm space-y-4">
            <p className="font-editorial text-sm uppercase text-skin-text2">Hapus Data</p>
            <p className="text-sm text-skin-text">
              Hapus <strong>{deleteTarget.nama_bahan}</strong>? Data tidak bisa dikembalikan.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-red-500 hover:bg-red-600 transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Surat Jalan */}
      {suratJalan && (
        <SuratJalanPinjamModal items={suratJalan} onClose={() => setSuratJalan(null)} />
      )}

      {/* Gabung Duplikat */}
      {showMerge && (
        <MergeDupeModal
          table={table}
          onClose={() => setShowMerge(false)}
          onDone={loadItems}
        />
      )}
    </ProduksiLayout>
  );
}
