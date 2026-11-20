/**
 * produk-crud — Supabase Edge Function
 *
 * Fronts apps/admin's features/produk save/delete flow. Dulu
 * saveProduct()/deleteProductCascade() di api.js adalah 4-6 panggilan
 * supabase.from() berurutan tanpa transaction — kalau salah satu gagal
 * di tengah, sisanya sudah kejadian (lihat migration
 * 20261120_save_product_delete_product_cascade.sql untuk analisis
 * lengkap + kenapa ini pakai forward-JWT, bukan service-role).
 *
 * Upload media (Cloudinary, unsigned preset) TETAP terjadi di browser
 * sebelum memanggil function ini — itu sudah aman (unsigned preset,
 * tidak ada secret yang perlu disembunyikan), function ini cuma terima
 * URL hasil upload yang sudah jadi, lalu urus tulis DB-nya secara atomik
 * lewat RPC save_product/delete_product_cascade.
 */
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { createActionHandler } from "../_shared/actions.ts";

function getClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

interface SaveInput {
  isEdit: boolean;
  originalKode: string | null;
  finalKode: string;
  nama: string;
  image: string | null;
  seriWarna: string | null;
  video: string | null;
  detail: string[];
  bahan: string;
  variants: Array<{ size: string; ld: number; pb: number; harga: number }>;
  hpp: number;
  warna: string[];
  warnaRenames?: Array<{ from: string; to: string }>;
}

async function saveProduct(supabase: SupabaseClient, input: SaveInput) {
  const { data, error } = await supabase.rpc("save_product", {
    p_is_edit: input.isEdit,
    p_original_kode: input.originalKode,
    p_final_kode: input.finalKode,
    p_nama: input.nama,
    p_image: input.image,
    p_seri_warna: input.seriWarna,
    p_video: input.video,
    p_detail: input.detail,
    p_bahan: input.bahan,
    p_variants: input.variants,
    p_hpp: input.hpp,
    p_warna: input.warna,
    p_warna_renames: input.warnaRenames ?? [],
  });
  if (error) throw error;
  return data;
}

async function deleteProduct(supabase: SupabaseClient, input: { kode: string }) {
  if (!input?.kode) throw new Error("kode wajib diisi");
  const { data, error } = await supabase.rpc("delete_product_cascade", { p_kode: input.kode });
  if (error) throw error;
  return data;
}

const handler = createActionHandler(
  {
    save: (input, { supabase }) => saveProduct(supabase, input as SaveInput),
    delete: (input, { supabase }) => deleteProduct(supabase, input as { kode: string }),
  },
  getClient,
);

Deno.serve(handler);
