import { supabase } from "../../lib/supabase";
import { displayName, getCurrentUser } from "../auth/api";

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

export function generateTransferNo() {
  const now = new Date();
  const d = now.toISOString().split("T")[0].replace(/-/g, "");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `SJ-${d}-${rand}`;
}

export async function fetchPendingTransferCount() {
  const { count, error } = await supabase
    .from("transfers")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

export async function fetchTransfers(statusFilter = "pending", dateFrom = null, dateTo = null) {
  let q = supabase.from("transfers").select("*").order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    q = q.eq("status", statusFilter);
  }
  if (dateFrom) q = q.gte("created_at", `${dateFrom}T00:00:00`);
  if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createTransfer({ fromLocation, toLocation, items, notes, user }) {
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
    items,
    notes: notes || null,
    status: "pending",
    created_by: user?.email ?? null,
    created_by_name: displayName(user),
  };

  const { data, error } = await supabase.from("transfers").insert(transfer).select().single();
  if (error) throw error;

  logTransfer({ action: "transfer-buat", transfer: data }).catch(() => {});

  supabase.functions
    .invoke("notify-transfer", {
      body: { transfer: data, createdBy: user?.email ?? "" },
    })
    .catch(() => {
    });

  return data;
}

export async function approveTransfer(transfer, user) {
  const { error } = await supabase.rpc("approve_transfer", {
    p_transfer_id: transfer.id,
    p_approver_email: user?.email ?? null,
    p_approver_name: displayName(user),
  });

  if (error) throw new Error(error.message);
}

export async function rejectTransfer(transfer, reason = "", user) {
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
}

export async function deleteTransfer(transfer) {
  const { error } = await supabase.from("transfers").delete().eq("id", transfer.id);
  if (error) throw error;
}

export async function updateTransfer(transfer, { fromLocation, toLocation, items, notes }) {
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
}
