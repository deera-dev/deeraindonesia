import { describe, it, expect } from "vitest";
import { db } from "./db";

// fake-indexeddb/auto is loaded via test/setup.indexeddb.js
// so Dexie works in jsdom with in-memory IndexedDB.

describe("db schema (Dexie)", () => {
  it("exports a Dexie db instance", () => {
    expect(db).toBeDefined();
    expect(typeof db.open).toBe("function");
  });

  it("has products table", () => {
    expect(db.products).toBeDefined();
  });

  it("has sales table", () => {
    expect(db.sales).toBeDefined();
  });

  it("has stok_warna table", () => {
    expect(db.stok_warna).toBeDefined();
  });

  it("has pelanggan table", () => {
    expect(db.pelanggan).toBeDefined();
  });

  it("can add and retrieve a product", async () => {
    await db.products.clear();
    await db.products.put({ kode: "D-01-OSK", nama: "Test Gamis", created_at: "2026-01-01" });
    const item = await db.products.get("D-01-OSK");
    expect(item).toBeDefined();
    expect(item.nama).toBe("Test Gamis");
  });

  it("can add and retrieve stok_warna by compound key", async () => {
    await db.stok_warna.clear();
    await db.stok_warna.put({ kode: "D-01-OSK", size: "Midi", warna: "HITAM", gudang: 5 });
    const row = await db.stok_warna.get(["D-01-OSK", "Midi", "HITAM"]);
    expect(row).toBeDefined();
    expect(row.gudang).toBe(5);
  });

  it("can add and retrieve a sale", async () => {
    await db.sales.clear();
    const id = await db.sales.add({ status: "pending", date: "2026-07-01", created_at: new Date().toISOString() });
    const sale = await db.sales.get(id);
    expect(sale).toBeDefined();
    expect(sale.status).toBe("pending");
  });

  it("can add and retrieve pelanggan", async () => {
    await db.pelanggan.clear();
    await db.pelanggan.put({ id: "p1", nama: "Budi", no_hp: "08111", updated_at: "2026-01-01" });
    const p = await db.pelanggan.get("p1");
    expect(p).toBeDefined();
    expect(p.nama).toBe("Budi");
  });

  it("sales table supports index on status", async () => {
    await db.sales.clear();
    await db.sales.add({ status: "pending", date: "2026-07-01", created_at: new Date().toISOString() });
    await db.sales.add({ status: "synced", date: "2026-07-01", created_at: new Date().toISOString() });
    const pending = await db.sales.where("status").equals("pending").toArray();
    expect(pending).toHaveLength(1);
  });

  it("sales table supports index on supabase_id", async () => {
    await db.sales.clear();
    await db.sales.add({ status: "synced", supabase_id: "sup-abc", date: "2026-07-01", created_at: new Date().toISOString() });
    const found = await db.sales.where("supabase_id").equals("sup-abc").first();
    expect(found).toBeDefined();
  });
});
