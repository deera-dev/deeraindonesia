
export const TARGET_SERI_QTY = 3;
export const TIDAK_BERGERAK_DAYS = 14;

export const MARKETS = ["cideng", "tegalgubug"];

export function getDefaultTargetMarket(today = new Date()) {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = tomorrow.getDay();
  if (day === 1 || day === 4) return "cideng";
  if (day === 5) return "tegalgubug";
  return null;
}

export function marketLabel(market) {
  if (market === "cideng") return "Cideng";
  if (market === "tegalgubug") return "Tegalgubug";
  return "-";
}
