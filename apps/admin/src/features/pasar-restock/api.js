/**
 * api.js — Lapisan akses data mentah (Supabase) fitur pasar-restock.
 * Pure async, tidak ada React. JANGAN diimpor langsung oleh komponen —
 * gunakan hooks.js (Dependency Inversion, lihat CLAUDE.md §4/§7).
 *
 * Semua aturan bisnis (target 3 pcs/warna, hampir habis, tidak bergerak,
 * hanya produksi berwarna, urutan produksi terbaru) dihitung di database lewat
 * RPC `get_pasar_restock` (supabase/migrations: get_pasar_restock). Frontend
 * hanya menarik hasilnya.
 */
import { supabase } from "@deera/shared/lib/supabase";

/** {restock: [...kartu], tidak_bergerak: [...kartu]} untuk satu pasar tujuan. */
export async function fetchPasarRestock(market) {
  if (!market) return { restock: [], tidak_bergerak: [] };
  const { data, error } = await supabase.rpc("get_pasar_restock", { p_market: market });
  if (error) throw error;
  return data ?? { restock: [], tidak_bergerak: [] };
}
