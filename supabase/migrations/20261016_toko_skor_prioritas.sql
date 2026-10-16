alter table toko add column if not exists skor integer, add column if not exists prioritas text;
update toko set skor = (regexp_match(catatan, 'skor (\d+)'))[1]::int, prioritas = (regexp_match(catatan, 'Prioritas ([ABC])'))[1]
where catatan ~ '^Prioritas [ABC] · skor \d+';
