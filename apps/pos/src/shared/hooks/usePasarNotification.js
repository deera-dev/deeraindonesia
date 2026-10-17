import { useEffect, useRef } from "react";
import { getMarketLocation, getMarketLabel } from "@deera/shared/lib/marketDay";
import { db } from "../../lib/db";
import { formatHarga } from "@deera/shared/lib/constants";

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function getNowWIB() {
  return new Date(Date.now() + WIB_OFFSET_MS);
}

function getTodayStrWIB() {
  return getNowWIB().toISOString().split("T")[0];
}

function msUntil1pmWIB() {
  const nowUtcMs = Date.now();
  const todayWIB = getTodayStrWIB();
  const target1pmUtcMs = new Date(todayWIB + "T06:00:00.000Z").getTime();
  return target1pmUtcMs - nowUtcMs;
}

function notifSentKey(dateStr) {
  return `deera_pasar_notif_${dateStr}`;
}

async function buildSummary(todayStr, loc) {
  const sales = await db.sales
    .where("date")
    .equals(todayStr)
    .filter((s) => s.type !== "retur" && s.location === loc)
    .toArray();

  const omset = sales.reduce((s, t) => s + (t.total ?? 0), 0);
  const count = sales.length;

  const prodQty = {};
  for (const sale of sales) {
    for (const item of sale.items ?? []) {
      const qty = item.warna ? item.warna.reduce((s, w) => s + w.qty, 0) : (item.qty ?? 0);
      prodQty[item.kode] = (prodQty[item.kode] ?? 0) + qty;
    }
  }
  const top3 = Object.entries(prodQty)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([kode, qty]) => `${kode} (${qty})`)
    .join(", ");

  return { omset, count, top3 };
}

export function usePasarNotification() {
  const timerRef = useRef(null);

  async function scheduleIfNeeded() {
    const today = getTodayStrWIB();
    const loc = getMarketLocation(new Date());
    const isMarketDay = loc !== "gudang";
    if (!isMarketDay) return;

    const key = notifSentKey(today);
    try {
      if (localStorage.getItem(key)) return;
    } catch {
    }

    const msLeft = msUntil1pmWIB();
    if (msLeft <= 0) return;

    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission().catch(() => {});
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if ("Notification" in window && Notification.permission === "granted") {
        const locLabel = getMarketLabel(loc);
        const { omset, count, top3 } = await buildSummary(today, loc);

        const body =
          count > 0
            ? `Omset: Rp ${formatHarga(omset)} | ${count} transaksi${top3 ? `\nTop: ${top3}` : ""}`
            : "Belum ada transaksi hari ini";

        new Notification(`📊 Laporan Pasar ${locLabel}`, {
          body,
          icon: "/android-chrome-512x512.png",
          tag: `deera-pasar-${today}`,
        });
      }
      try {
        localStorage.setItem(notifSentKey(today), "1");
      } catch {
      }
    }, msLeft);
  }

  useEffect(() => {
    scheduleIfNeeded();

    function onVisible() {
      if (document.visibilityState === "visible") scheduleIfNeeded();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
