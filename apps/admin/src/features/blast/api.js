import { supabase } from "@deera/shared/lib/supabase";
import { updateToko } from "../ngorder/api";

export async function fetchCampaigns() {
  const { data, error } = await supabase
    .from("blast_campaign")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchTargetCountsByCampaign() {
  const { data, error } = await supabase.from("blast_target").select("campaign_id, status");
  if (error) throw error;
  const map = {};
  for (const row of data ?? []) {
    const c = (map[row.campaign_id] ??= { total: 0, terkirim: 0, dilewati: 0, pending: 0 });
    c.total++;
    c[row.status] = (c[row.status] ?? 0) + 1;
  }
  return map;
}

export async function fetchCampaignDetail(campaignId) {
  const [{ data: campaign, error: campaignErr }, { data: targets, error: targetsErr }] =
    await Promise.all([
      supabase.from("blast_campaign").select("*").eq("id", campaignId).single(),
      supabase.from("blast_target").select("*").eq("campaign_id", campaignId).order("nama"),
    ]);
  if (campaignErr) throw campaignErr;
  if (targetsErr) throw targetsErr;
  return { campaign, targets: targets ?? [] };
}

export async function createCampaign({ nama, productKodes, message, targets, user }) {
  if (!nama?.trim()) throw new Error("Nama blast wajib diisi.");
  if (!targets?.length) throw new Error("Pilih minimal satu target.");

  const { data: campaign, error: campaignErr } = await supabase
    .from("blast_campaign")
    .insert({
      nama: nama.trim(),
      product_kodes: productKodes ?? [],
      message: message ?? "",
      status: "berjalan",
      created_by_email: user?.email ?? null,
      created_by_name: user?.name ?? null,
    })
    .select()
    .single();
  if (campaignErr) throw campaignErr;

  const rows = targets.map((t) => ({
    campaign_id: campaign.id,
    source: t.source,
    contact_id: t.contactId ?? null,
    nama: t.nama,
    no_hp: t.noHp ?? null,
    status: "pending",
  }));
  const { error: targetsErr } = await supabase.from("blast_target").insert(rows);
  if (targetsErr) throw targetsErr;

  return campaign;
}

export async function markTargetStatus(targetId, status) {
  const payload = { status };
  if (status === "terkirim") payload.sent_at = new Date().toISOString();
  const { data, error } = await supabase
    .from("blast_target")
    .update(payload)
    .eq("id", targetId)
    .select()
    .single();
  if (error) throw error;
  if (status === "terkirim" && data?.source === "toko" && data?.contact_id) {
    try {
      await updateToko(data.contact_id, { status_approach: "sudah" });
    } catch (err) {
      console.error("[blast] gagal menandai toko sudah di-approach:", err);
    }
  }
  return data;
}

export async function markCampaignSelesai(campaignId) {
  const { error } = await supabase
    .from("blast_campaign")
    .update({ status: "selesai" })
    .eq("id", campaignId);
  if (error) throw error;
}

export async function deleteCampaign(campaignId) {
  const { error } = await supabase.from("blast_campaign").delete().eq("id", campaignId);
  if (error) throw error;
}

export async function fetchMessageTemplates() {
  const { data, error } = await supabase
    .from("blast_message_template")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createMessageTemplate({ nama, pesan }) {
  const namaTrim = (nama ?? "").trim();
  if (!namaTrim) throw new Error("Nama template wajib diisi.");
  if (!(pesan ?? "").trim()) throw new Error("Isi pesan template wajib diisi.");
  const { data, error } = await supabase
    .from("blast_message_template")
    .insert({ nama: namaTrim, pesan, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMessageTemplate(id, { nama, pesan }) {
  if (!id) throw new Error("id template wajib diisi.");
  const payload = { updated_at: new Date().toISOString() };
  if (nama !== undefined) payload.nama = (nama ?? "").trim();
  if (pesan !== undefined) payload.pesan = pesan;
  const { data, error } = await supabase
    .from("blast_message_template")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMessageTemplate(id) {
  if (!id) throw new Error("id template wajib diisi.");
  const { error } = await supabase.from("blast_message_template").delete().eq("id", id);
  if (error) throw error;
}
