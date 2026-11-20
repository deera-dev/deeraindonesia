-- M4 (produksi-bahan) — port mergeDupeGroups() dari
-- apps/admin/src/features/produksi-bahan/api.js jadi RPC atomik per
-- grup. Sebelumnya: 1 update (gabung jumlah/total_harga ke baris master)
-- diikuti N delete berurutan (baris duplikat) tanpa transaction — kalau
-- koneksi putus di tengah N delete itu, master sudah kebawa total
-- gabungan tapi sebagian duplikat belum terhapus -> dobel hitung.
-- Perilaku ANTAR grup TIDAK diubah (JS tetap loop per grup, lanjut ke
-- grup berikutnya kalau 1 grup gagal) — yang diperbaiki cuma atomicity
-- DALAM 1 grup.
--
-- p_table dibatasi whitelist (bukan diterima mentah ke format %I) karena
-- ini dipanggil dengan nama tabel dinamis dari client.
create or replace function public.merge_bahan_dupe_group(
  p_table text,
  p_master_id uuid,
  p_dupe_ids uuid[],
  p_jumlah numeric,
  p_total_harga integer
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_updated_rows integer;
begin
  if p_table not in ('bahan_pembelian', 'bahan_pinjam') then
    raise exception 'Tabel tidak valid: %', p_table;
  end if;

  execute format('update %I set jumlah = $1, total_harga = $2 where id = $3', p_table)
    using p_jumlah, p_total_harga, p_master_id;
  get diagnostics v_updated_rows = row_count;

  if v_updated_rows = 0 then
    raise exception 'Baris master tidak ditemukan.';
  end if;

  if coalesce(array_length(p_dupe_ids, 1), 0) > 0 then
    execute format('delete from %I where id = any($1)', p_table) using p_dupe_ids;
  end if;

  return jsonb_build_object('success', true, 'master_id', p_master_id);
end;
$$;
