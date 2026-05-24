import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useHistory, deleteHistory } from "../hooks/useHistory";
import { useTheme } from "@deera/shared/hooks/useTheme";
import ThemeToggle from "@deera/shared/components/ThemeToggle";

// ── Action config ─────────────────────────────────────────────────────────────
const ACTION_META = {
  "tambah":           { label: "Tambah Produk",     color: "#22c55e",  badgeCls: "text-green-700  bg-green-50  border-green-200  dark:text-green-400  dark:bg-green-900/20  dark:border-green-800"  },
  "edit":             { label: "Edit Produk",        color: "#f59e0b",  badgeCls: "text-amber-700  bg-amber-50  border-amber-200  dark:text-amber-400  dark:bg-amber-900/20  dark:border-amber-800"  },
  "hapus":            { label: "Hapus Produk",       color: "#ef4444",  badgeCls: "text-red-700    bg-red-50    border-red-200    dark:text-red-400    dark:bg-red-900/20    dark:border-red-800"    },
  "transfer-buat":    { label: "Transfer Baru",      color: "#3b82f6",  badgeCls: "text-blue-700   bg-blue-50   border-blue-200   dark:text-blue-400   dark:bg-blue-900/20   dark:border-blue-800"   },
  "transfer-approve": { label: "Disetujui",          color: "#22c55e",  badgeCls: "text-green-700  bg-green-50  border-green-200  dark:text-green-400  dark:bg-green-900/20  dark:border-green-800"  },
  "transfer-reject":  { label: "Ditolak",            color: "#ef4444",  badgeCls: "text-red-700    bg-red-50    border-red-200    dark:text-red-400    dark:bg-red-900/20    dark:border-red-800"    },
  "stok-opname":      { label: "Stok Opname",        color: "#a855f7",  badgeCls: "text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-800" },
};
function getMeta(action) {
  return ACTION_META[action] ?? { label: action, color: "#CAB170", badgeCls: "text-[#CAB170] bg-skin-gold border-skin-bdr-gold" };
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function presetToDates(preset) {
  const now   = new Date();
  const today = now.toISOString().split("T")[0];
  if (preset === "today") return { dateFrom: today, dateTo: today };
  if (preset === "week")  { const d = new Date(now); d.setDate(d.getDate() - 6);  return { dateFrom: d.toISOString().split("T")[0], dateTo: today }; }
  if (preset === "month") { const d = new Date(now); d.setDate(d.getDate() - 29); return { dateFrom: d.toISOString().split("T")[0], dateTo: today }; }
  return { dateFrom: null, dateTo: null };
}

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatGroupDate(iso) {
  if (!iso) return "";
  const d       = new Date(iso);
  const now     = new Date();
  const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff    = (today - itemDay) / 86400000;
  if (diff === 0) return "Hari Ini";
  if (diff === 1) return "Kemarin";
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function groupByDate(items) {
  const groups = [];
  let lastKey  = null;
  for (const item of items) {
    const key = new Date(item.changed_at).toLocaleDateString("id-ID");
    if (key !== lastKey) {
      groups.push({ key, label: formatGroupDate(item.changed_at), items: [] });
      lastKey = key;
    }
    groups[groups.length - 1].items.push(item);
  }
  return groups;
}

// ── Shared section wrapper ────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-skin-text3 mb-2">{title}</p>
      {children}
    </div>
  );
}

// ── Diff: produk ─────────────────────────────────────────────────────────────
function ProdukDiff({ before, after }) {
  if (!before && !after) return null;

  // Build changed fields
  const fields = [
    { key: "nama",  label: "Nama" },
    { key: "bahan", label: "Bahan" },
    { key: "hpp",   label: "HPP", fmt: (v) => v != null ? `Rp ${Number(v).toLocaleString("id-ID")}` : null },
  ];
  const changedFields = fields.map(({ key, label, fmt }) => {
    const bRaw = before?.[key], aRaw = after?.[key];
    const bStr = fmt ? (fmt(bRaw) ?? "-") : (bRaw ?? "-");
    const aStr = fmt ? (fmt(aRaw) ?? "-") : (aRaw ?? "-");
    if (String(bStr) === String(aStr)) return null;
    return { label, bStr, aStr };
  }).filter(Boolean);

  // Variants
  const bV = before?.variants ?? [], aV = after?.variants ?? [];
  const sizes = [...new Set([...bV.map((v) => v.size), ...aV.map((v) => v.size)])];
  const changedVariants = sizes.map((size) => {
    const b = bV.find((v) => v.size === size), a = aV.find((v) => v.size === size);
    const bH = b ? `Rp ${Number(b.harga).toLocaleString("id-ID")}` : null;
    const aH = a ? `Rp ${Number(a.harga).toLocaleString("id-ID")}` : null;
    if (bH === aH && !!b === !!a) return null;
    return { size, bH, aH, added: !b, removed: !a };
  }).filter(Boolean);

  // Warna
  const bW = (before?.warna ?? []).join(", ") || null;
  const aW = (after?.warna  ?? []).join(", ") || null;
  const warnaChanged = bW !== aW;

  // Tambah baru (no before) — summary view
  if (!before) {
    const s = after ?? {};
    return (
      <div className="space-y-3">
        {(s.bahan || s.hpp != null) && (
          <Section title="Info Produk">
            <div className="flex flex-wrap gap-2">
              {s.bahan && <Pill>{s.bahan}</Pill>}
              {s.hpp != null && <Pill>HPP Rp {Number(s.hpp).toLocaleString("id-ID")}</Pill>}
            </div>
          </Section>
        )}
        {(s.variants ?? []).length > 0 && (
          <Section title="Ukuran">
            <div className="flex flex-wrap gap-2">
              {s.variants.map((v) => (
                <Pill key={v.size}>{v.size} · Rp {Number(v.harga).toLocaleString("id-ID")}</Pill>
              ))}
            </div>
          </Section>
        )}
        {(s.warna ?? []).length > 0 && (
          <Section title="Warna">
            <div className="flex flex-wrap gap-2">
              {s.warna.map((w) => <Pill key={w}>{w}</Pill>)}
            </div>
          </Section>
        )}
      </div>
    );
  }

  if (changedFields.length === 0 && changedVariants.length === 0 && !warnaChanged) {
    return <p className="text-xs text-skin-text4 italic">Tidak ada perubahan field yang terdeteksi.</p>;
  }

  return (
    <div className="space-y-3">
      {changedFields.length > 0 && (
        <Section title="Perubahan">
          <div className="space-y-2">
            {changedFields.map(({ label, bStr, aStr }) => (
              <ChangeRow key={label} label={label} before={bStr} after={aStr} />
            ))}
          </div>
        </Section>
      )}
      {changedVariants.length > 0 && (
        <Section title="Perubahan Ukuran / Harga">
          <div className="space-y-2">
            {changedVariants.map(({ size, bH, aH, added, removed }) => (
              added   ? <ChangeRow key={size} label={size} before="—" after={aH} /> :
              removed ? <ChangeRow key={size} label={size} before={bH} after="dihapus" afterRed /> :
                        <ChangeRow key={size} label={size} before={bH} after={aH} />
            ))}
          </div>
        </Section>
      )}
      {warnaChanged && (
        <Section title="Perubahan Warna">
          <ChangeRow label="Warna" before={bW || "—"} after={aW || "—"} />
        </Section>
      )}
    </div>
  );
}

// ── Diff: transfer ───────────────────────────────────────────────────────────
function TransferDiff({ before, after, action }) {
  const snap  = after ?? before ?? {};
  const LOC   = { gudang: "Gudang", cideng: "Cideng", tegalgubug: "Tegalgubug" };
  const total = (snap.items ?? []).reduce((s, i) => s + (i.qty ?? 0), 0);

  return (
    <div className="space-y-3">
      <Section title="Rincian Transfer">
        <div className="flex flex-wrap gap-2">
          <Pill>{LOC[snap.from_location] ?? snap.from_location} → {LOC[snap.to_location] ?? snap.to_location}</Pill>
          <Pill>{total} pcs</Pill>
          {snap.status && <Pill className="capitalize">{snap.status}</Pill>}
        </div>
        {snap.notes && <p className="mt-2 text-xs text-skin-text3 italic">{snap.notes}</p>}
        {action === "transfer-approve" && snap.approved_by && (
          <p className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">✓ Disetujui oleh {snap.approved_by}</p>
        )}
        {action === "transfer-reject" && snap.rejected_by && (
          <p className="mt-2 text-xs text-red-500 dark:text-red-400 font-medium">✗ Ditolak oleh {snap.rejected_by}</p>
        )}
      </Section>

      {(snap.items ?? []).length > 0 && (
        <Section title={`Item (${snap.items.length})`}>
          <div className="space-y-1.5">
            {snap.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-skin-page px-3 py-2 rounded-sm">
                <div>
                  <span className="font-mono text-xs font-semibold text-skin-text">{item.kode}</span>
                  <span className="ml-2 text-xs text-skin-text3">{item.size}</span>
                  {item.warna && item.warna !== "_" && (
                    <span className="ml-1.5 text-xs text-skin-text4">{item.warna}</span>
                  )}
                </div>
                <span className="text-xs font-bold text-skin-text">{item.qty} pcs</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Diff: stok opname ────────────────────────────────────────────────────────
function StokDiff({ before, after }) {
  const bRows = before?.rows ?? [];
  const aRows = after?.rows  ?? [];
  if (aRows.length === 0) return null;
  const LOC = { gudang: "Gudang", cideng: "Cideng", tegalgubug: "Tegalgubug" };

  return (
    <Section title={`Perubahan Stok (${aRows.length} varian)`}>
      <div className="space-y-2">
        {aRows.map((aRow, i) => {
          const bRow = bRows.find((r) => r.size === aRow.size && r.warna === aRow.warna);
          const bTot = bRow ? (bRow.gudang ?? 0) + (bRow.cideng ?? 0) + (bRow.tegalgubug ?? 0) : 0;
          const aTot = (aRow.gudang ?? 0) + (aRow.cideng ?? 0) + (aRow.tegalgubug ?? 0);
          const diff = aTot - bTot;

          return (
            <div key={i} className="bg-skin-page px-3 py-2.5 rounded-sm">
              {/* Varian header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-skin-text uppercase">{aRow.size}</span>
                  {aRow.warna && aRow.warna !== "_" && (
                    <span className="text-xs text-skin-text3">{aRow.warna}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-skin-text3">{bTot}</span>
                  <span className="text-skin-text4">→</span>
                  <span className="font-semibold text-skin-text">{aTot} pcs</span>
                  {diff !== 0 && (
                    <span className={`font-bold text-[11px] ${diff > 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                      ({diff > 0 ? "+" : ""}{diff})
                    </span>
                  )}
                </div>
              </div>
              {/* Per-lokasi */}
              <div className="flex flex-wrap gap-2">
                {["gudang", "cideng", "tegalgubug"].map((loc) => {
                  const bV = bRow?.[loc] ?? 0;
                  const aV = aRow[loc]   ?? 0;
                  const d  = aV - bV;
                  return (
                    <div key={loc} className="flex items-center gap-1 text-[11px]">
                      <span className="text-skin-text4">{LOC[loc]}:</span>
                      {d !== 0 ? (
                        <>
                          <span className="text-skin-text3 line-through">{bV}</span>
                          <span className="text-skin-text4">→</span>
                          <span className={`font-semibold ${d > 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>{aV}</span>
                        </>
                      ) : (
                        <span className="text-skin-text3">{aV}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ── Shared small components ───────────────────────────────────────────────────
function Pill({ children, className = "" }) {
  return (
    <span className={`inline-block px-2.5 py-1 text-xs bg-skin-page border border-skin-bdr text-skin-text2 rounded-sm ${className}`}>
      {children}
    </span>
  );
}

function ChangeRow({ label, before, after, afterRed = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold tracking-wide uppercase text-skin-text4">{label}</span>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-red-500 dark:text-red-400 line-through opacity-70">{before}</span>
        <span className="text-skin-text4 text-xs">→</span>
        <span className={`text-xs font-semibold ${afterRed ? "text-red-500 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>{after}</span>
      </div>
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ item, onClose }) {
  if (!item) return null;
  const meta = getMeta(item.action);
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg mx-auto border-t-2 md:border-2 border-skin-bdr shadow-xl flex flex-col max-h-[85dvh] md:max-h-[80dvh]">
        {/* Top color stripe */}
        <div className="flex-shrink-0 h-1" style={{ backgroundColor: meta.color }} />

        {/* Header */}
        <div className="flex-shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-skin-bdr">
          <div>
            <span className={`inline-block px-2 py-0.5 text-[10px] tracking-[0.12em] uppercase border font-editorial ${meta.badgeCls}`}>
              {meta.label}
            </span>
            <p className="mt-2 font-headline text-[#CAB170] text-xl leading-none">{item.kode}</p>
            <p className="mt-0.5 font-editorial text-sm text-skin-text2">{item.nama || item.snapshot?.nama || "—"}</p>
            <p className="mt-1.5 font-editorial text-xs text-skin-text3">
              {new Date(item.changed_at).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              {item.user_name && <span className="ml-2 text-skin-text2">· {item.user_name}</span>}
            </p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-skin-text3 hover:text-red-500 transition text-2xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-5">
          {(item.category === "produk" || !item.category) && <ProdukDiff before={item.before_snapshot} after={item.snapshot} />}
          {item.category === "transfer" && <TransferDiff before={item.before_snapshot} after={item.snapshot} action={item.action} />}
          {item.category === "stok"     && <StokDiff     before={item.before_snapshot} after={item.snapshot} />}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-skin-bdr">
          <button onClick={onClose} className="w-full py-4 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text2 hover:text-[#CAB170] hover:bg-skin-gold transition">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function History() {
  const [datePreset, setDatePreset] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [category,   setCategory]   = useState("all");
  const [modalItem,  setModalItem]  = useState(null);
  const [deleting,   setDeleting]   = useState({});

  const { dateFrom, dateTo } = datePreset === "custom"
    ? { dateFrom: customFrom || null, dateTo: customTo || null }
    : presetToDates(datePreset);

  const { history, loading, error, reload } = useHistory({ dateFrom, dateTo, category });
  const { isDark, toggleTheme } = useTheme();

  const groups = useMemo(() => groupByDate(history), [history]);

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!window.confirm("Hapus entri riwayat ini?")) return;
    setDeleting((prev) => ({ ...prev, [id]: true }));
    try {
      await deleteHistory(id);
      if (modalItem?.id === id) setModalItem(null);
      reload();
    } catch (err) {
      alert("Gagal hapus: " + err.message);
    } finally {
      setDeleting((prev) => ({ ...prev, [id]: false }));
    }
  }

  return (
    <main className="min-h-screen bg-skin-page text-skin-text">
      <DetailModal item={modalItem} onClose={() => setModalItem(null)} />

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div>
            <h1 className="font-headline text-[#CAB170] text-2xl leading-none">DEERA</h1>
            <p className="mt-1 font-editorial text-xs tracking-[0.2em] text-skin-text3 uppercase">Riwayat & Audit</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
            <Link to="/admin" className="px-5 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2 border-2 border-skin-bdr hover:border-[#CAB170] hover:text-[#CAB170] transition">
              Kembali
            </Link>
          </div>
        </div>

        {/* Filter bar */}
        <div className="border-t border-skin-bdr-lt px-4 py-2.5 flex items-center gap-2 flex-wrap">
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold tracking-wide border border-skin-bdr bg-skin-card text-skin-text focus:outline-none focus:border-[#CAB170] transition cursor-pointer"
          >
            <option value="today">Hari Ini</option>
            <option value="week">7 Hari Terakhir</option>
            <option value="month">30 Hari Terakhir</option>
            <option value="custom">Rentang Custom</option>
            <option value="all">Semua Waktu</option>
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold tracking-wide border border-skin-bdr bg-skin-card text-skin-text focus:outline-none focus:border-[#CAB170] transition cursor-pointer"
          >
            <option value="all">Semua Kategori</option>
            <option value="produk">Produk</option>
            <option value="transfer">Transfer</option>
            <option value="stok">Stok</option>
          </select>

          {!loading && (
            <span className="ml-auto text-xs text-skin-text4">{history.length} entri</span>
          )}
        </div>

        {/* Custom date inputs */}
        {datePreset === "custom" && (
          <div className="border-t border-skin-bdr-lt px-4 py-2 flex items-center gap-2 flex-wrap">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-skin-page border border-skin-bdr px-2 py-1.5 text-xs text-skin-text focus:outline-none focus:border-[#CAB170]" />
            <span className="text-skin-text4 text-xs">—</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="bg-skin-page border border-skin-bdr px-2 py-1.5 text-xs text-skin-text focus:outline-none focus:border-[#CAB170]" />
          </div>
        )}
      </header>

      {/* ── List ── */}
      <div className="px-4 py-6 md:px-8 max-w-3xl">
        {loading && (
          <p className="font-editorial text-sm text-skin-text3 text-center py-20">Memuat riwayat...</p>
        )}
        {error && (
          <p className="font-editorial text-sm text-red-500 py-8 text-center">{error.message}</p>
        )}
        {!loading && !error && history.length === 0 && (
          <p className="font-editorial text-sm text-skin-text3 text-center py-20">Belum ada riwayat untuk periode ini</p>
        )}

        {!loading && !error && groups.map((group) => (
          <div key={group.key} className="mb-8">
            {/* Date separator */}
            <div className="flex items-center gap-3 mb-3">
              <span className="font-editorial text-[11px] tracking-[0.15em] uppercase text-skin-text3 flex-shrink-0">{group.label}</span>
              <div className="flex-1 h-px bg-skin-bdr-lt" />
            </div>

            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const meta       = getMeta(item.action);
                const hasDiff    = !!(item.before_snapshot || item.snapshot);
                const isDeleting = !!deleting[item.id];

                return (
                  <div
                    key={item.id}
                    onClick={hasDiff ? () => setModalItem(item) : undefined}
                    className={`flex items-stretch bg-skin-card border border-skin-bdr overflow-hidden transition ${hasDiff ? "cursor-pointer active:bg-skin-page" : ""}`}
                  >
                    {/* Left color stripe */}
                    <div className="w-1 flex-shrink-0" style={{ backgroundColor: meta.color }} />

                    {/* Main content */}
                    <div className="flex-1 min-w-0 flex items-center gap-3 px-3 py-3">
                      {/* Badge */}
                      <span className={`flex-shrink-0 self-start mt-0.5 px-2 py-0.5 text-[10px] tracking-[0.1em] uppercase border font-editorial leading-relaxed ${meta.badgeCls}`}>
                        {meta.label}
                      </span>

                      {/* Kode + nama */}
                      <div className="flex-1 min-w-0">
                        <p className="font-headline text-[#CAB170] text-base leading-tight truncate">{item.kode}</p>
                        <p className="font-editorial text-xs text-skin-text3 truncate mt-0.5">{item.nama || item.snapshot?.nama || "—"}</p>
                      </div>

                      {/* Time + user — hidden on very small screens */}
                      <div className="flex-shrink-0 text-right hidden sm:block">
                        <p className="font-editorial text-xs text-skin-text2 tabular-nums">{formatTime(item.changed_at)}</p>
                        {item.user_name && (
                          <p className="font-editorial text-[10px] text-skin-text3 mt-0.5 truncate max-w-[90px]">{item.user_name}</p>
                        )}
                      </div>

                      {/* Delete button — always visible */}
                      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleDelete(item.id, e)}
                          disabled={isDeleting}
                          className="w-8 h-8 flex items-center justify-center text-skin-text4 hover:text-red-500 active:text-red-500 transition disabled:opacity-40 text-base"
                          title="Hapus"
                        >
                          {isDeleting ? "·" : "×"}
                        </button>
                      </div>
                    </div>

                    {/* Right arrow — only if has detail */}
                    {hasDiff && (
                      <div className="flex-shrink-0 flex items-center px-2.5 border-l border-skin-bdr-lt text-skin-text4 text-xs">→</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
