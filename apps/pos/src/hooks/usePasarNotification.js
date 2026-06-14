/**
 * usePasarNotification.js
 *
 * Pada hari pasar (Senin/Kamis = Cideng, Jumat = Tegalgubug),
 * jadwalkan notifikasi browser jam 13:00 WIB berisi ringkasan transaksi hari ini.
 *
 * Cara kerja:
 * 1. Saat hook di-mount (atau tab kembali aktif), cek apakah hari ini hari pasar.
 * 2. Hitung sisa waktu hingga pukul 13:00 WIB (UTC+7).
 * 3. Jadwalkan setTimeout — jika sudah lewat jam 13, tidak dijadwalkan ulang hari ini.
 * 4. Key localStorage "deera_pasar_notif_YYYY-MM-DD" mencegah duplikasi.
 *
 * Catatan: notifikasi hanya berfungsi saat tab browser aktif (batasan web).
 */
import { useEffect, useRef } from "react";
import { getMarketLocation, getMarketLabel } from "@deera/shared/lib/marketDay";
import { db } from "../lib/db";
import { formatHarga } from "@deera/shared/lib/constants";

// WIB = UTC+7  → offset 7 jam
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function getNowWIB() {
  return new Date(Date.now() + WIB_OFFSET_MS);
}

function getTodayStrWIB() {
  return getNowWIB().toISOString().split("T")[0];
}

// Milidetik hingga jam 13:00:00 WIB hari ini. Negatif jika sudah lewat.
function msUntil1pmWIB() {
  const nowUtcMs = Date.now();
  const todayWIB = getTodayStrWIB();
  // 13:00 WIB = 06:00 UTC (WIB adalah UTC+7)
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

  // Top 3 produk berdasarkan qty
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
      if (localStorage.getItem(key)) return; // sudah dikirim hari ini
    } catch {
      /* ignore */
    }

    const msLeft = msUntil1pmWIB();
    if (msLeft <= 0) return; // jam 1 sudah lewat, tidak jadwalkan

    // Minta izin notifikasi (tidak pop-up jika sudah granted/denied)
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
        /* ignore */
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
