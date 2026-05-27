/**
 * historyUtils.js — Konstanta & helper untuk halaman riwayat/audit.
 */

export const ACTION_META = {
  tambah: {
    label: "Tambah Produk",
    color: "#22c55e",
    badgeCls:
      "text-green-700  bg-green-50  border-green-200  dark:text-green-400  dark:bg-green-900/20  dark:border-green-800",
  },
  edit: {
    label: "Edit Produk",
    color: "#f59e0b",
    badgeCls:
      "text-amber-700  bg-amber-50  border-amber-200  dark:text-amber-400  dark:bg-amber-900/20  dark:border-amber-800",
  },
  hapus: {
    label: "Hapus Produk",
    color: "#ef4444",
    badgeCls:
      "text-red-700    bg-red-50    border-red-200    dark:text-red-400    dark:bg-red-900/20    dark:border-red-800",
  },
  "transfer-buat": {
    label: "Transfer Baru",
    color: "#3b82f6",
    badgeCls:
      "text-blue-700   bg-blue-50   border-blue-200   dark:text-blue-400   dark:bg-blue-900/20   dark:border-blue-800",
  },
  "transfer-approve": {
    label: "Disetujui",
    color: "#22c55e",
    badgeCls:
      "text-green-700  bg-green-50  border-green-200  dark:text-green-400  dark:bg-green-900/20  dark:border-green-800",
  },
  "transfer-reject": {
    label: "Ditolak",
    color: "#ef4444",
    badgeCls:
      "text-red-700    bg-red-50    border-red-200    dark:text-red-400    dark:bg-red-900/20    dark:border-red-800",
  },
  "stok-opname": {
    label: "Stok Opname",
    color: "#a855f7",
    badgeCls:
      "text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-800",
  },
  "batch-produksi": {
    label: "Batch Produksi",
    color: "#0ea5e9",
    badgeCls:
      "text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-400 dark:bg-sky-900/20 dark:border-sky-800",
  },
  "hpp-simpan": {
    label: "Simpan HPP",
    color: "#f59e0b",
    badgeCls:
      "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800",
  },
  "hpp-hapus": {
    label: "Hapus HPP",
    color: "#ef4444",
    badgeCls:
      "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800",
  },
  "bahan-beli": {
    label: "Pembelian Bahan",
    color: "#10b981",
    badgeCls:
      "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800",
  },
  "bahan-pinjam": {
    label: "Pinjam Bahan",
    color: "#8b5cf6",
    badgeCls:
      "text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-900/20 dark:border-violet-800",
  },
  "bahan-hapus": {
    label: "Hapus Bahan",
    color: "#ef4444",
    badgeCls:
      "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800",
  },
};

export function getMeta(action) {
  return (
    ACTION_META[action] ?? {
      label: action,
      color: "#CAB170",
      badgeCls: "text-[#CAB170] bg-skin-gold border-skin-bdr-gold",
    }
  );
}

export function presetToDates(preset) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  if (preset === "today") return { dateFrom: today, dateTo: today };
  if (preset === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { dateFrom: d.toISOString().split("T")[0], dateTo: today };
  }
  if (preset === "month") {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return { dateFrom: d.toISOString().split("T")[0], dateTo: today };
  }
  return { dateFrom: null, dateTo: null };
}

export function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function formatGroupDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today - itemDay) / 86400000;
  if (diff === 0) return "Hari Ini";
  if (diff === 1) return "Kemarin";
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function groupByDate(items) {
  const groups = [];
  let lastKey = null;
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
