export const DEFAULT_SUB_TAB = "transaksi";

export const SUB_TABS = [
  {
    key: "transaksi",
    label: "Transaksi",
    paths: "M4 2v20l3-2 3 2 3-2 3 2 3-2V2l-3 2-3-2-3 2-3-2-3 2z|M8 8h8|M8 12h8|M8 16h5",
  },
  {
    key: "ringkasan",
    label: "Ringkasan",
    paths: "M3 3h7v9H3z|M14 3h7v5h-7z|M14 12h7v9h-7z|M3 16h7v5H3z",
  },
  {
    key: "keuangan",
    label: "Keuangan",
    paths: "M21 12V7H5a2 2 0 0 1 0-4h14v4|M3 5v14a2 2 0 0 0 2 2h16v-5|M18 12a2 2 0 0 0 0 4h4v-4z",
  },
  { key: "stok", label: "Stok", paths: "M21 8l-9-5-9 5v8l9 5 9-5z|M3.3 7L12 12l8.7-5|M12 22V12" },
  {
    key: "pembeli",
    label: "Pembeli",
    paths: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z|M3 6h18|M16 10a4 4 0 0 1-8 0",
  },
  {
    key: "pasar",
    label: "Pasar",
    paths:
      "M3 9l1-5h16l1 5|M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0|M5 12v9h14v-9|M10 21v-5h4v5",
  },
  {
    key: "bep",
    label: "BEP",
    paths:
      "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z|M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  },
];

export const getSubTabMeta = (key) => SUB_TABS.find((t) => t.key === key) ?? SUB_TABS[0];
