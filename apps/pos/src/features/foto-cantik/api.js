import { supabase } from "@deera/shared/lib/supabase";

export async function fetchProductPhotos(kodes) {
  if (!kodes?.length) return [];
  const { data, error } = await supabase
    .from("products")
    .select("kode, nama, image, seri_warna")
    .in("kode", kodes);
  if (error) throw error;
  return data ?? [];
}

// Saran POS (November 2026): foto yang dibagikan ke pembeli lewat "Share
// Foto Cantik" seharusnya kolase hasil generate deerastudio (bukan
// products.seri_warna) kalau sudah pernah dibuat — tabel ai_generations/
// ai_generation_sets ada di project Supabase yang SAMA dengan Deera (lihat
// types/database.ts di repo deerastudio: "FK asli ke products.kode, project
// sama dgn Deera"), jadi bisa langsung di-query dari sini tanpa integrasi
// API terpisah. role "kolase_pilihan" = fitur "Kolase 2 Foto" (admin bebas
// pilih 2 foto apapun, biasanya tampak depan+belakang, dgn branding DEERA).
// Satu kode bisa punya lebih dari satu kolase_pilihan (admin boleh bikin
// ulang) — dipilih yang created_at PALING BARU per kode.
export async function fetchKolasePilihanByKode(kodes) {
  if (!kodes?.length) return {};
  const { data: sets, error: setsError } = await supabase
    .from("ai_generation_sets")
    .select("id, product_kode")
    .in("product_kode", kodes);
  if (setsError) throw setsError;
  if (!sets?.length) return {};

  const setIdToKode = new Map(sets.map((s) => [s.id, s.product_kode]));
  const { data: gens, error: gensError } = await supabase
    .from("ai_generations")
    .select("generation_set_id, output_image_url, created_at")
    .in("generation_set_id", [...setIdToKode.keys()])
    .eq("image_role", "kolase_pilihan")
    .eq("status", "completed")
    .order("created_at", { ascending: false });
  if (gensError) throw gensError;

  const byKode = {};
  for (const g of gens ?? []) {
    const kode = setIdToKode.get(g.generation_set_id);
    if (kode && !byKode[kode]) byKode[kode] = g.output_image_url;
  }
  return byKode;
}

export async function fetchImageBlob(url, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
