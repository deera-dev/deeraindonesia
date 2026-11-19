/**
 * studio-publish — Supabase Edge Function
 *
 * Fronts apps/studio's "publish ke katalog" flow (dulu
 * deerastudio/app/api/generation-sets/[id]/publish/route.ts): upload foto
 * AI terpilih ke Cloudinary, lalu tulis products.image/detail/warna_images.
 *
 * Desain otorisasi (risiko #2 di docs/decisions/stack-rewrite-2026.md):
 * route lama pakai service-role key buat nulis `products` (bypass RLS
 * total) TANPA cek otorisasi eksplisit — cuma "kebetulan" lolos kalau baca
 * `ai_generation_sets` duluan berhasil. Dicek ulang (2026-11-19, pg_policies
 * live): `products` SUDAH punya policy "authenticated users: full access"
 * (SELECT/INSERT/UPDATE/DELETE, qual true) yang sama longgarnya dengan
 * `ai_generation_sets`/`ai_generations` (authenticated_full_access) dan
 * `product_history` (insert authenticated: true) — jadi TIDAK PERLU
 * service-role sama sekali. Function ini forward JWT caller apa adanya
 * (pola sama seperti studio-{models,poses,presets}-crud) + cek
 * `auth.getUser()` eksplisit di awal (bukan lagi cuma "kebetulan lolos"),
 * jadi satu-satunya gerbang otorisasi adalah: (1) `verify_jwt: true` di
 * level platform (semua Edge Function di repo ini pakai ini), (2) RLS
 * Postgres di tiap tabel yang disentuh. Tidak ada privilege escalation.
 *
 * Perbaikan data-integrity yang ikut dibawa (bukan cuma port 1:1): query
 * `ai_generations` sekarang WAJIB `generation_set_id = input.generationSetId`
 * (route lama cuma `.in("id", allIds)` tanpa ikat ke set-nya — generation id
 * dari set/produk LAIN bisa ikut lolos kalau caller tahu/nebak UUID-nya).
 * Audit trail ke `product_history` juga baru ditambahkan di sini — route
 * lama sama sekali tidak mencatat publish AI ke audit log yang sama dengan
 * semua perubahan `products` lainnya.
 */
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { createActionHandler } from "../_shared/actions.ts";

function getClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

async function sha1Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Folder: deera/products/{product_kode}/ai-{role}.jpg (konsisten sama PRD
// studio §13 — jangan ganti skema folder/public_id, katalog lama + yang
// baru dipublish harus tetap di path yang sama).
async function uploadPublishedImage(
  imageUrl: string,
  productKode: string,
  role: string,
): Promise<string> {
  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME")!;
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY")!;
  const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET")!;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = `deera/products/${productKode}`;
  const publicId = `ai-${role}`;
  // Urutan param HARUS alfabetis - itu yang ditandatangani Cloudinary.
  const signature = await sha1Hex(
    `folder=${folder}&overwrite=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`,
  );

  const form = new FormData();
  form.set("file", imageUrl);
  form.set("api_key", apiKey);
  form.set("timestamp", timestamp);
  form.set("signature", signature);
  form.set("folder", folder);
  form.set("public_id", publicId);
  form.set("overwrite", "true");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Upload Cloudinary gagal (${role}): ${await res.text()}`);
  }
  const json = await res.json();
  return json.secure_url as string;
}

// mis. "MERAH MARUN" -> "merah-marun", dipakai di public_id "seri-<warna>".
function slugifyWarna(warna: string): string {
  return warna
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function displayName(
  user: { email?: string | null; user_metadata?: Record<string, unknown> } | null,
): string {
  if (!user) return "-";
  const fullName = user.user_metadata?.full_name as string | undefined;
  const email = user.email ?? undefined;
  const username = email?.endsWith("@deera.id") ? email.slice(0, -"@deera.id".length) : email;
  const name = fullName || username;
  return name ? name.toUpperCase() : "-";
}

interface PublishInput {
  generationSetId: string;
  imageIds: {
    utama: string;
    detail: string[];
    seri: string[];
  };
}

interface GenerationRow {
  id: string;
  image_role: string;
  output_image_url: string | null;
  status: string;
  variant_warna: string | null;
}

async function publish(supabase: SupabaseClient, input: PublishInput) {
  if (!input?.generationSetId || !input?.imageIds?.utama) {
    throw new Error("generationSetId dan imageIds.utama wajib diisi");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: set } = await supabase
    .from("ai_generation_sets")
    .select("id, product_kode")
    .eq("id", input.generationSetId)
    .single();
  if (!set) throw new Error("Generation set tidak ditemukan");

  const detail = input.imageIds.detail ?? [];
  const seri = input.imageIds.seri ?? [];
  const allIds = [input.imageIds.utama, ...detail, ...seri];

  const { data: generations } = await supabase
    .from("ai_generations")
    .select("id, image_role, output_image_url, status, variant_warna")
    .eq("generation_set_id", input.generationSetId)
    .in("id", allIds);

  if (!generations || generations.length !== allIds.length) {
    throw new Error("Sebagian gambar tidak ditemukan di generation set ini");
  }
  const notReady = generations.find((g) => g.status !== "completed");
  if (notReady) {
    throw new Error("Hanya gambar berstatus completed yang bisa dipublish");
  }

  const byId = new Map<string, GenerationRow>(generations.map((g) => [g.id, g]));

  const { data: product } = await supabase
    .from("products")
    .select("nama, warna_images")
    .eq("kode", set.product_kode)
    .single();
  if (!product) throw new Error("Produk tidak ditemukan");

  const utama = byId.get(input.imageIds.utama)!;
  const [utamaUpload, detailUploads, seriUploads] = await Promise.all([
    uploadPublishedImage(utama.output_image_url!, set.product_kode, "utama"),
    Promise.all(
      detail.map((genId, i) =>
        uploadPublishedImage(
          byId.get(genId)!.output_image_url!,
          set.product_kode,
          `detail-${i + 1}`,
        ),
      ),
    ),
    Promise.all(
      seri
        .map((genId) => byId.get(genId)!)
        .filter((g) => g.variant_warna) // baris seri lama tanpa variant_warna diabaikan
        .map(async (g) => ({
          warna: g.variant_warna!,
          url: await uploadPublishedImage(
            g.output_image_url!,
            set.product_kode,
            `seri-${slugifyWarna(g.variant_warna!)}`,
          ),
        })),
    ),
  ]);

  // Merge ke warna_images yang sudah ada (bukan overwrite total) supaya
  // publish satu-dua warna baru tidak menghapus warna lain yang sudah
  // pernah dipublish sebelumnya.
  let mergedWarnaImages: Record<string, { image: string }> | undefined;
  if (seriUploads.length > 0) {
    mergedWarnaImages = {
      ...((product.warna_images as Record<string, { image: string }> | null) ?? {}),
    };
    for (const u of seriUploads) {
      mergedWarnaImages[u.warna] = { image: u.url };
    }
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({
      image: utamaUpload,
      detail: detailUploads,
      ...(mergedWarnaImages ? { warna_images: mergedWarnaImages } : {}),
    })
    .eq("kode", set.product_kode);
  if (updateError) throw updateError;

  const publishedImageUrls = {
    image: utamaUpload,
    detail: detailUploads,
    ...(seriUploads.length > 0
      ? { warna_images: Object.fromEntries(seriUploads.map((u) => [u.warna, u.url])) }
      : {}),
  };

  const publishedAt = new Date().toISOString();

  // Best-effort — jangan gagalkan publish yang sudah berhasil cuma karena
  // audit log-nya gagal ditulis (sama seperti logHistory() di apps/admin).
  try {
    await supabase.from("product_history").insert({
      action: "studio-publish",
      category: "produk",
      kode: set.product_kode,
      nama: product.nama,
      snapshot: publishedImageUrls,
      user_email: user.email ?? null,
      user_name: displayName(user),
    });
  } catch {
    // swallow, lihat komentar di atas
  }

  await supabase
    .from("ai_generation_sets")
    .update({ published_at: publishedAt, published_image_urls: publishedImageUrls })
    .eq("id", input.generationSetId);

  return { publishedAt, cloudinaryUrls: publishedImageUrls };
}

const handler = createActionHandler(
  {
    publish: (input, { supabase }) => publish(supabase, input as PublishInput),
  },
  getClient,
);

Deno.serve(handler);
