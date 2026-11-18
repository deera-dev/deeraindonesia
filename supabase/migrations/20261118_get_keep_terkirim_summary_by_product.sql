-- Paralel dgn get_sales_summary_by_product (dipakai ProductDetailModal
-- utk kartu Stok/Terjual/Produksi per kode) -- total keep yang "terkirim"
-- (sudah keluar, belum lunas) utk SATU kode produk, dikelompokkan per
-- lokasi persis sama caranya dgn sales (field keep_orders.location,
-- BUKAN breakdown per warna). Dipakai nambah kartu "Dikirim" & warning
-- stok+dikirim+terjual-vs-produksi di ProductDetailModal.
create or replace function public.get_keep_terkirim_summary_by_product(p_kode text)
 returns jsonb
 language plpgsql
 stable
 set search_path to 'public'
as $function$
DECLARE
  v_keep        record;
  v_item        jsonb;
  v_warna_elem  jsonb;
  v_qty         numeric;
  v_wqty        numeric;
  v_gudang      numeric := 0;
  v_cideng      numeric := 0;
  v_tegalgubug  numeric := 0;
  v_total       numeric := 0;
BEGIN
  FOR v_keep IN
    SELECT location, items
    FROM keep_orders
    WHERE status = 'terkirim'
    LIMIT 10000
  LOOP
    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_keep.items, '[]'::jsonb))
    LOOP
      IF (v_item ->> 'kode') IS DISTINCT FROM p_kode THEN
        CONTINUE;
      END IF;

      IF jsonb_typeof(v_item -> 'warna') = 'array' THEN
        v_qty := 0;
        FOR v_warna_elem IN SELECT * FROM jsonb_array_elements(v_item -> 'warna')
        LOOP
          BEGIN
            v_wqty := COALESCE((v_warna_elem ->> 'qty')::numeric, 0);
          EXCEPTION WHEN OTHERS THEN
            v_wqty := 0;
          END;
          v_qty := v_qty + v_wqty;
        END LOOP;
      ELSE
        BEGIN
          v_qty := COALESCE((v_item ->> 'qty')::numeric, 0);
        EXCEPTION WHEN OTHERS THEN
          v_qty := 0;
        END;
      END IF;

      IF v_qty > 0 AND v_keep.location IN ('gudang', 'cideng', 'tegalgubug') THEN
        IF v_keep.location = 'gudang' THEN
          v_gudang := v_gudang + v_qty;
        ELSIF v_keep.location = 'cideng' THEN
          v_cideng := v_cideng + v_qty;
        ELSIF v_keep.location = 'tegalgubug' THEN
          v_tegalgubug := v_tegalgubug + v_qty;
        END IF;
        v_total := v_total + v_qty;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'gudang', v_gudang::int,
    'cideng', v_cideng::int,
    'tegalgubug', v_tegalgubug::int,
    'total', v_total::int
  );
END;
$function$;
