/**
 * transfers — Supabase Edge Function
 *
 * Fronts packages/shared/features/transfers/api.ts. Forwards the CALLER'S
 * OWN JWT (not the anon key) when constructing the Supabase client, same
 * as profiles/ - transfers' RLS requires `auth.role() = 'authenticated'`
 * (verified live), so this runs as the calling user, matching today's
 * behavior (any authenticated admin can create/approve/reject/update).
 *
 * create/approve/reject derive the actor's identity from the verified JWT
 * (supabase.auth.getUser()) instead of trusting a client-supplied user
 * object - closes the "any caller can claim to be anyone" gap for calls
 * that go through this function. Note this does NOT change the
 * `approve_transfer` RPC itself, which still accepts p_approver_email/
 * p_approver_name as plain parameters if called directly (bypassing this
 * function) - that's a separate, pre-existing gap in already-deployed
 * production SQL, flagged separately, not fixed here.
 */
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { createActionHandler } from "../_shared/actions.ts";

function getClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

function displayName(fullName: string | undefined, email: string | undefined): string {
  const name = fullName || email?.split("@")[0] || "-";
  return name.toUpperCase();
}

async function getActor(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  return {
    email: user?.email ?? null,
    name: displayName(user?.user_metadata?.full_name, user?.email),
  };
}

function generateTransferNo(): string {
  const d = new Date().toISOString().split("T")[0]!.replace(/-/g, "");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `SJ-${d}-${rand}`;
}

async function logTransfer(
  supabase: SupabaseClient,
  action: string,
  transfer: Record<string, unknown>,
  actor: { email: string | null; name: string },
  before: Record<string, unknown> | null = null,
) {
  try {
    const items = (transfer.items as { qty?: number }[] | undefined) ?? [];
    const totalQty = items.reduce((s, i) => s + (i.qty ?? 0), 0);
    await supabase.from("product_history").insert({
      action,
      category: "transfer",
      kode: transfer.transfer_no,
      nama: `${transfer.from_location} → ${transfer.to_location} · ${totalQty} pcs`,
      snapshot: transfer,
      before_snapshot: before,
      user_email: actor.email,
      user_name: actor.name,
    });
  } catch (err) {
    console.warn("logTransfer error:", err);
  }
}

interface ListInput {
  statusFilter?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

async function list(supabase: SupabaseClient, input: ListInput) {
  let q = supabase.from("transfers").select("*").order("created_at", { ascending: false });
  const statusFilter = input?.statusFilter ?? "pending";
  if (statusFilter && statusFilter !== "all") q = q.eq("status", statusFilter);
  if (input?.dateFrom) q = q.gte("created_at", `${input.dateFrom}T00:00:00`);
  if (input?.dateTo) q = q.lte("created_at", `${input.dateTo}T23:59:59`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

async function pendingCount(supabase: SupabaseClient) {
  const { count, error } = await supabase
    .from("transfers")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

interface CreateInput {
  fromLocation: string;
  toLocation: string;
  items: { kode: string; size: string; warna?: string | null; qty: number }[];
  notes?: string | null;
}

async function create(supabase: SupabaseClient, input: CreateInput) {
  const { fromLocation, toLocation, items, notes } = input;
  if (!fromLocation || !toLocation || !items || items.length === 0) {
    throw new Error("Lengkapi data transfer terlebih dahulu.");
  }
  if (fromLocation === toLocation) {
    throw new Error("Dari dan tujuan tidak boleh sama.");
  }

  const actor = await getActor(supabase);
  const transfer = {
    transfer_no: generateTransferNo(),
    from_location: fromLocation,
    to_location: toLocation,
    items,
    notes: notes || null,
    status: "pending",
    created_by: actor.email,
    created_by_name: actor.name,
  };

  const { data, error } = await supabase.from("transfers").insert(transfer).select().single();
  if (error) throw error;

  logTransfer(supabase, "transfer-buat", data, actor).catch(() => {});
  supabase.functions
    .invoke("notify-transfer", { body: { transfer: data, createdBy: actor.email ?? "" } })
    .catch(() => {});

  return data;
}

async function approve(supabase: SupabaseClient, input: { transferId: string }) {
  const actor = await getActor(supabase);
  const { error } = await supabase.rpc("approve_transfer", {
    p_transfer_id: input.transferId,
    p_approver_email: actor.email,
    p_approver_name: actor.name,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

interface RejectInput {
  transfer: Record<string, unknown> & { id: string; status: string; created_by: string | null };
  reason?: string;
}

async function reject(supabase: SupabaseClient, input: RejectInput) {
  const { transfer, reason = "" } = input;
  if (transfer.status !== "pending") {
    throw new Error("Transfer sudah tidak bisa di-reject.");
  }
  const actor = await getActor(supabase);
  if (actor.email && transfer.created_by === actor.email) {
    throw new Error(
      "Tidak bisa menolak transfer yang Anda buat sendiri. Minta admin lain untuk reject.",
    );
  }

  const notes = reason ? `[DITOLAK] ${reason}` : (transfer.notes as string | null);
  const { error } = await supabase
    .from("transfers")
    .update({
      status: "rejected",
      rejected_by: actor.email,
      rejected_at: new Date().toISOString(),
      notes,
    })
    .eq("id", transfer.id);
  if (error) throw error;

  logTransfer(
    supabase,
    "transfer-reject",
    { ...transfer, status: "rejected", rejected_by: actor.email, notes },
    actor,
    transfer,
  ).catch(() => {});

  return { ok: true };
}

async function remove(supabase: SupabaseClient, input: { transferId: string }) {
  const { error } = await supabase.from("transfers").delete().eq("id", input.transferId);
  if (error) throw error;
  return { ok: true };
}

interface UpdateInput {
  transferId: string;
  currentStatus: string;
  fromLocation: string;
  toLocation: string;
  items: { kode: string; size: string; warna?: string | null; qty: number }[];
  notes?: string | null;
}

async function update(supabase: SupabaseClient, input: UpdateInput) {
  const { transferId, currentStatus, fromLocation, toLocation, items, notes } = input;
  if (currentStatus !== "pending") {
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
    .update({ from_location: fromLocation, to_location: toLocation, items, notes: notes || null })
    .eq("id", transferId);
  if (error) throw error;
  return { ok: true };
}

const handler = createActionHandler(
  {
    list: (input, { supabase }) => list(supabase, input as ListInput),
    "pending-count": (_input, { supabase }) => pendingCount(supabase),
    create: (input, { supabase }) => create(supabase, input as CreateInput),
    approve: (input, { supabase }) => approve(supabase, input as { transferId: string }),
    reject: (input, { supabase }) => reject(supabase, input as RejectInput),
    delete: (input, { supabase }) => remove(supabase, input as { transferId: string }),
    update: (input, { supabase }) => update(supabase, input as UpdateInput),
  },
  getClient,
);

Deno.serve(handler);
