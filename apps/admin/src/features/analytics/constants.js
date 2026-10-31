export const DEFAULT_RANGE_DAYS = 30;

export const TREND_GRANULARITIES = [
  { value: "day", label: "Harian" },
  { value: "week", label: "Mingguan" },
  { value: "month", label: "Bulanan" },
  { value: "year", label: "Tahunan" },
];

export const ANALYTICS_SECTION_GROUPS = [
  {
    groupLabel: null,
    items: [
      {
        key: "executive",
        label: "Ringkasan Bisnis",
        description: "Kondisi bisnis Anda hari ini — masalah, peluang, dan langkah berikutnya.",
      },
    ],
  },
  {
    groupLabel: "Penjualan",
    items: [
      {
        key: "overview",
        label: "Ringkasan Penjualan",
        description: "Total penjualan, keuntungan, dan pelanggan pada periode yang dipilih.",
      },
      {
        key: "trends",
        label: "Tren Penjualan",
        description: "Grafik naik-turun penjualan dari waktu ke waktu.",
      },
    ],
  },
  {
    groupLabel: "Produk & Stok",
    items: [
      {
        key: "products",
        label: "Produk",
        description: "Produk paling laris, paling untung, dan pergerakan stoknya.",
      },
      {
        key: "inventory",
        label: "Persediaan",
        description: "Kesehatan stok gudang — mana yang aman, menipis, atau tidak bergerak.",
      },
    ],
  },
  {
    groupLabel: "Pasar & Pelanggan",
    items: [
      {
        key: "markets",
        label: "Pasar",
        description: "Perbandingan performa tiap cabang/lokasi penjualan.",
      },
      {
        key: "customers",
        label: "Pelanggan",
        description: "Pelanggan paling berkontribusi dan pola belanja mereka.",
      },
    ],
  },
  {
    groupLabel: "Prediksi & Analisis",
    items: [
      {
        key: "forecast",
        label: "Prediksi Penjualan",
        description: "Perkiraan penjualan ke depan berdasarkan histori transaksi.",
      },
      {
        key: "advanced",
        label: "Analisis Lanjutan",
        description: "Analisis mendalam untuk yang ingin menggali lebih jauh.",
      },
    ],
  },
  {
    groupLabel: "Produksi",
    items: [
      {
        key: "production",
        label: "Ringkasan Produksi",
        description: "Biaya produksi per batch, pemakaian bahan, dan seberapa laku hasil produksi.",
      },
    ],
  },
];

export const ANALYTICS_TABS = ANALYTICS_SECTION_GROUPS.flatMap((g) => g.items);

export const DEFAULT_ANALYTICS_SECTION = "executive";

export const TOP_PRODUCT_TREND_LIMIT = 5;

export const PRODUCTS_LEADERBOARD_LIMIT = 10;

export const LOW_STOCK_COVER_DAYS = 7;

export const MARKET_DETAIL_PRODUCT_LIMIT = 5;

export const DATE_PRESETS = [
  { key: "7d", label: "7 Hari", days: 7 },
  { key: "30d", label: "30 Hari", days: 30 },
  { key: "1y", label: "1 Tahun", days: 365 },
  { key: "custom", label: "Custom", days: null },
];

export const DEFAULT_DATE_PRESET = "30d";

export const CUSTOMERS_LEADERBOARD_LIMIT = 10;

export const CUSTOMERS_RANKING_LIMIT = 50;

export const ADVANCED_GROWTH_LIMIT = 5;
export const ADVANCED_CONTRIBUTION_LIMIT = 10;

export const ADVANCED_PARETO_ITEMS_LIMIT = 50;

export const CRITICAL_COVER_DAYS = 3;
export const OVERSTOCK_COVER_DAYS = 60;
export const DEAD_STOCK_DAYS = 30;
export const RESTOCK_TARGET_DAYS = 30;

export const INVENTORY_DEAD_STOCK_LIMIT = 20;
export const INVENTORY_LIST_LIMIT = 10;
export const INVENTORY_RISK_LIMIT = 15;

export const FORECAST_GRANULARITY_DEFAULT = "week";

export const FORECAST_ALPHA_DEFAULT = 0.3;

export const FORECAST_LOOKBACK_PERIODS_DEFAULT = 8;

export const FORECAST_RESTOCK_HORIZON_PERIODS_DEFAULT = 2;

export const FORECAST_PRODUCT_DEMAND_LIMIT = 5;
export const FORECAST_RESTOCK_LIMIT = 10;

export const EXECUTIVE_MARGIN_HEALTHY_PCT = 0.2;
export const EXECUTIVE_MARGIN_WARNING_PCT = 0.1;
export const EXECUTIVE_RETURN_RATE_WARNING = 0.03;
export const EXECUTIVE_RETURN_RATE_RISK = 0.05;

export const EXECUTIVE_OPPORTUNITY_LIMIT = 5;
export const EXECUTIVE_RISK_LIMIT = 5;

export const EXECUTIVE_INSIGHT_MAX = 10;

export const PRODUCTION_LOW_SELL_THROUGH_PCT = 20;
