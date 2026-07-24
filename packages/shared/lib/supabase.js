import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("[Supabase] VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum di-set di .env");
}

// Fallback ke placeholder valid-URL kalau env kosong (mis. .env belum diisi,
// atau saat test suite jalan tanpa .env) — supaya createClient() TIDAK throw
// "supabaseUrl is required" dan menghentikan seluruh module graph yang
// mengimpor file ini (lihat product-catalog/index.test.js). Warning di atas
// tetap muncul berdasarkan env asli, jadi developer tetap tahu .env belum
// diisi; client placeholder ini cuma menghindari crash saat import, bukan
// pengganti konfigurasi asli — request Supabase sungguhan tetap akan gagal
// kalau URL/key ini yang terpakai.
export const supabase = createClient(
  SUPABASE_URL || "http://localhost:54321",
  SUPABASE_ANON_KEY || "public-anon-key",
);
