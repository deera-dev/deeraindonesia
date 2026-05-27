/**
 * useTransfers.js
 * Hook untuk fitur transfer stok antar lokasi.
 *
 * Workflow:
 * 1. User A buat transfer → status "pending"
 * 2. Stok BELUM berubah
 * 3. User B approve → stok berubah + status "approved"
 * 4. Atau User B reject → status "rejected"
 *
 * Table Supabase: transfers
 *   id, created_at, transfer_no, from_location, to_location,
 *   items (jsonb), notes, status, created_by, created_by_name,
 *   approved_by, approved_at, rejected_by, rejected_at
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { displayName, getCurrentUser } from "../lib/auth";

// ── Log transfer event ke product_history ────────────────────────────────────
async function logTransfer({ action, transfer, before = null }) {
  try {
    const user = await getCurrentUser();
    const totalQty = (transfer.items ?? []).reduce((s, i) => s + (i.qty ?? 0), 0);
    await supabase.from("product_history").insert({
      action,
      category: "transfer",
      kode: transfer.transfer_no,
      nama: `${transfer.from_location} → ${transfer.to_location} · ${totalQty} pcs`,
      snapshot: transfer,
      before_snapshot: before,
      user_email: user?.email ?? null,
      user_name: displayName(user),
    });
  } catch (err) {
    console.warn("logTransfer error:", err);
  }
}

// ── Generate nomor surat jalan ────────────────────────────────────────────────
export function generateTransferNo() {
  const now = new Date();
  const d = now.toISOString().split("T")[0].replace(/-/g, "");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `SJ-${d}-${rand}`;
}

// ── Hook: daftar transfer ────────────────────────────────────────────────────
// statusFilter : "pending" | "approved" | "rejected"
// dateFrom     : "YYYY-MM-DD" | null  (inklusif)
// dateTo       : "YYYY-MM-DD" | null  (inklusif)
export function useTransfers(statusFilter = "pending", dateFrom = null, dateTo = null) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase.from("transfers").select("*").order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        q = q.eq("status", statusFilter);
      }
      if (dateFrom) q = q.gte("created_at", `${dateFrom}T00:00:00`);
      if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);

      const { data, error: err } = await q;
      if (err) throw err;
      setTransfers(data ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  return { transfers, loading, error, reload: load };
}

// ── Hook: buat transfer baru ─────────────────────────────────────────────────
export function useCreateTransfer() {
  const { user } = useAuth();

  return async function createTransfer({ fromLocation, toLocation, items, notes }) {
    if (!fromLocation || !toLocation || items.length === 0) {
      throw new Error("Lengkapi data transfer terlebih dahulu.");
    }
    if (fromLocation === toLocation) {
      throw new Error("Dari dan tujuan tidak boleh sama.");
    }

    const transfer = {
      transfer_no: generateTransferNo(),
      from_location: fromLocation,
      to_location: toLocation,
      items, // [{ kode, size, warna, qty }]
      notes: notes || null,
      status: "pending",
      created_by: user?.email ?? null,
      created_by_name: displayName(user),
    };

    const { data, error } = await supabase.from("transfers").insert(transfer).select().single();

    if (error) throw error;

    // Catat ke riwayat (best-effort)
    logTransfer({ action: "transfer-buat", transfer: data }).catch(() => {});

    // Kirim Web Push ke admin lain (best-effort, tidak blokir flow)
    supabase.functions
      .invoke("notify-transfer", {
        body: { transfer: data, createdBy: user?.email ?? "" },
      })
      .catch(() => {
        /* silent */
      });

    return data;
  };
}

// ── Hook: approve transfer ───────────────────────────────────────────────────
export function useApproveTransfer() {
  const { user } = useAuth();

  return async function approveTransfer(transfer) {
    if (transfer.status !== "pending") {
      throw new Error("Transfer sudah tidak bisa di-approve.");
    }
    if (user?.email && transfer.created_by === user.email) {
      throw new Error(
        "Tidak bisa menyetujui transfer yang Anda buat sendiri. Minta admin lain untuk approve.",
      );
    }

    // Update status dulu
    const { error: statusErr } = await supabase
      .from("transfers")
      .update({
        status: "approved",
        approved_by: user?.email ?? null,
        approved_at: new Date().toISOString(),
      })
      .eq("id", transfer.id);

    if (statusErr) throw statusErr;

    // Pindah stok di tabel stok_warna
    // Kurangi dari from_location, tambah ke to_location
    const from = transfer.from_location;
    const to = transfer.to_location;

    for (const item of transfer.items) {
      const warna = item.warna || null;
      const qty = item.qty ?? 0;
      if (qty <= 0) continue;

      // Fetch baris stok_warna yang cocok
      let q = supabase
        .from("stok_warna")
        .select("id, gudang, cideng, tegalgubug")
        .eq("kode", item.kode)
        .eq("size", item.size);

      if (warna) {
        q = q.eq("warna", warna);
      } else {
        q = q.is("warna", null);
      }

      const { data: rows, error: fetchErr } = await q;
      if (fetchErr) throw fetchErr;

      if (!rows || rows.length === 0) {
        // Jika baris tidak ada (jarang terjadi), skip
        console.warn(`[Transfer] Stok tidak ditemukan: ${item.kode} ${item.size} ${warna}`);
        continue;
      }

      const row = rows[0];
      const patch = {};
      patch[from] = Math.max(0, (row[from] ?? 0) - qty);
      patch[to] = (row[to] ?? 0) + qty;

      const { error: updateErr } = await supabase.from("stok_warna").update(patch).eq("id", row.id);

      if (updateErr) throw updateErr;
    }

    // Catat ke riwayat (best-effort)
    logTransfer({
      action: "transfer-approve",
      transfer: { ...transfer, status: "approved", approved_by: user?.email },
      before: transfer,
    }).catch(() => {});
  };
}

// ── Hook: reject transfer ────────────────────────────────────────────────────
export function useRejectTransfer() {
  const { user } = useAuth();

  return async function rejectTransfer(transfer, reason = "") {
    if (transfer.status !== "pending") {
      throw new Error("Transfer sudah tidak bisa di-reject.");
    }
    if (user?.email && transfer.created_by === user.email) {
      throw new Error(
        "Tidak bisa menolak transfer yang Anda buat sendiri. Minta admin lain untuk reject.",
      );
    }

    const { error } = await supabase
      .from("transfers")
      .update({
        status: "rejected",
        rejected_by: user?.email ?? null,
        rejected_at: new Date().toISOString(),
        notes: reason ? `[DITOLAK] ${reason}` : transfer.notes,
      })
      .eq("id", transfer.id);

    if (error) throw error;

    // Catat ke riwayat (best-effort)
    logTransfer({
      action: "transfer-reject",
      transfer: {
        ...transfer,
        status: "rejected",
        rejected_by: user?.email,
        notes: reason ? `[DITOLAK] ${reason}` : transfer.notes,
      },
      before: transfer,
    }).catch(() => {});
  };
}

// ── Hook: hapus transfer (semua status bisa dihapus) ────────────────────────
export function useDeleteTransfer() {
  return async function deleteTransfer(transfer) {
    const { error } = await supabase.from("transfers").delete().eq("id", transfer.id);
    if (error) throw error;
  };
}

// ── Hook: edit/update transfer (hanya status pending) ────────────────────────
export function useUpdateTransfer() {
  return async function updateTransfer(transfer, { fromLocation, toLocation, items, notes }) {
    if (transfer.status !== "pending") {
      throw new Error("Hanya transfer pending yang bisa diedit.");
    }
    if (fromLocation === toLocation) {
      throw new Error("Dari dan tujuan tidak boleh sama.");
    }
    if (!items || items.length === 0) {
      throw new Error("Pilih minimal satu item.");
    }

    const { error } = await supabase
      .from("transfers")
      .update({
        from_location: fromLocation,
        to_location: toLocation,
        items,
        notes: notes || null,
      })
      .eq("id", transfer.id);

    if (error) throw error;
  };
}
