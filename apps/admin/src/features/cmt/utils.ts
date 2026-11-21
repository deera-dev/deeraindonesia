import type {
  BahanKirimItem,
  CardGroup,
  CmtJahitKirimRow,
  JahitCardAvailable,
  KirimGroup,
  KodeGroup,
  SetoranFullItem,
} from "./schema";

export function newSetoranFullItem(): SetoranFullItem {
  return { size: "", warna: "", qty: "" };
}

export function newBahanItem(): BahanKirimItem {
  return { nama_bahan: "", kode_bahan: "", satuan: "yard", jumlah: "" };
}

export function groupCardsByKodeSizeWarna(
  cards: JahitCardAvailable[] | null | undefined,
): CardGroup[] {
  const order: string[] = [];
  const byKey: Record<string, CardGroup> = {};
  for (const c of cards ?? []) {
    const key = `${c.kode_produk}__${c.size}__${c.warna}`;
    if (!byKey[key]) {
      byKey[key] = {
        kode_produk: c.kode_produk,
        nama_produk: c.nama_produk,
        size: c.size,
        warna: c.warna,
        qty: 0,
        cardIds: [],
      };
      order.push(key);
    }
    byKey[key]!.qty += Number(c.qty) || 0;
    byKey[key]!.cardIds.push(c.id);
  }
  return order.map((k) => byKey[k]!);
}

export function kirimGroupStatus(
  rows: CmtJahitKirimRow[] | null | undefined,
): "dikirim" | "setor" | "selesai" | "batal" {
  if (!rows?.length) return "dikirim";
  if (rows.every((r) => r.status === "batal")) return "batal";
  if (rows.some((r) => r.status === "dikirim")) return "dikirim";
  if (rows.some((r) => r.status === "setor")) return "setor";
  return "selesai";
}

export function statusLabel(status: string | null | undefined): string {
  if (status === "setor") return "Sudah Setor — Menunggu Finishing";
  if (status === "selesai") return "Selesai";
  if (status === "batal") return "Dibatalkan";
  return "Dikirim ke Vendor";
}

export function groupKirimByNo(rows: CmtJahitKirimRow[] | null | undefined): KirimGroup[] {
  const order: string[] = [];
  const byNo: Record<string, Omit<KirimGroup, "status" | "totalQtyKirim" | "totalQtySetor">> = {};
  for (const r of rows ?? []) {
    if (!byNo[r.kirim_no]) {
      byNo[r.kirim_no] = {
        kirimNo: r.kirim_no,
        namaVendor: r.nama_vendor,
        tanggalKirim: r.tanggal_kirim,
        estimasiSelesai: r.estimasi_selesai,
        tanggalSetor: r.tanggal_setor,
        hargaUpah: r.harga_upah,
        rows: [],
      };
      order.push(r.kirim_no);
    }
    byNo[r.kirim_no]!.rows.push(r);
  }
  return order.map((no) => {
    const g = byNo[no]!;
    return {
      ...g,
      status: kirimGroupStatus(g.rows),
      totalQtyKirim: g.rows.reduce((s, r) => s + (Number(r.qty) || 0), 0),
      totalQtySetor: g.rows.reduce((s, r) => s + (Number(r.qty_setor) || 0), 0),
    };
  });
}

export function calcTotalUpahSetoranFull(
  items: SetoranFullItem[] | null | undefined,
  hargaUpah: number | string | null | undefined,
): number {
  const totalQty = (items ?? []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
  return totalQty * (Number(hargaUpah) || 0);
}

export function calcTotalUpahKirim(group: KirimGroup | null | undefined): number {
  const totalQty = (group?.rows ?? []).reduce((s, r) => s + (Number(r.qty_setor ?? r.qty) || 0), 0);
  return totalQty * (Number(group?.hargaUpah) || 0);
}

export function groupRowsByKode(rows: CmtJahitKirimRow[] | null | undefined): KodeGroup[] {
  const order: string[] = [];
  const byKode: Record<string, KodeGroup> = {};
  for (const r of rows ?? []) {
    if (!byKode[r.kode_produk]) {
      byKode[r.kode_produk] = {
        kode: r.kode_produk,
        namaProduk: r.nama_produk,
        rows: [],
        totalQty: 0,
      };
      order.push(r.kode_produk);
    }
    byKode[r.kode_produk]!.rows.push(r);
    byKode[r.kode_produk]!.totalQty += Number(r.qty) || 0;
  }
  return order.map((k) => byKode[k]!);
}
