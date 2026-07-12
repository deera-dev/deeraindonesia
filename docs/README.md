# Dokumentasi — Deera Indonesia

Index seluruh dokumentasi proyek, dikelompokkan per kategori. Untuk panduan kodebase (konvensi, struktur, aturan kerja) lihat [`../CLAUDE.md`](../CLAUDE.md) di root repo. Dokumen umum lain yang tetap berada di root: [`../README.md`](../README.md), [`../DATABASE.md`](../DATABASE.md), [`../DEPLOYMENT.md`](../DEPLOYMENT.md).

---

## architecture/

Desain arsitektur teknis — sumber kebenaran untuk *mengapa* struktur kodebase dan sistem Analytics dipilih seperti sekarang.

| Dokumen | Ringkasan |
|---|---|
| [architecture.md](architecture/architecture.md) | Arsitektur teknis keseluruhan monorepo (Zustand + TanStack Query + Vertical Slice Architecture). |
| [analytics-architecture-plan.md](architecture/analytics-architecture-plan.md) | Desain arsitektur modul Analytics (BI) `apps/admin` — audit skema, RPC, roadmap bertahap. |

## implementation/analytics/

Log implementasi modul Analytics (BI), berurutan per fase.

| Dokumen | Ringkasan |
|---|---|
| [analytics-phase-01.md](implementation/analytics/analytics-phase-01.md) | Phase 1. |
| [analytics-phase-02.md](implementation/analytics/analytics-phase-02.md) | Phase 2: Products. |
| [analytics-phase-03.md](implementation/analytics/analytics-phase-03.md) | Phase 3: Markets. |
| [analytics-phase-04.md](implementation/analytics/analytics-phase-04.md) | Requirement Change (R1–R6) + Phase 4: Customers. |
| [analytics-phase-05.md](implementation/analytics/analytics-phase-05.md) | Phase 5 (Dashboard Polish). |
| [analytics-phase-06.md](implementation/analytics/analytics-phase-06.md) | Phase 6 (Advanced Analytics). |
| [analytics-phase-06-extension-phase-09.md](implementation/analytics/analytics-phase-06-extension-phase-09.md) | Phase 6 Extension (Advanced Analytics lanjutan) + Phase 9 (Executive Dashboard). |
| [analytics-phase-07.md](implementation/analytics/analytics-phase-07.md) | Phase 7 (Inventory Intelligence). |
| [analytics-phase-08.md](implementation/analytics/analytics-phase-08.md) | Phase 8 (Forecast). |
| [analytics-redesign-2026-07.md](implementation/analytics/analytics-redesign-2026-07.md) | Perbaikan SQL Forecast & Redesign UI/UX Analytics total (9 halaman). |

## implementation/migration/

Log migrasi business logic dari frontend ke Supabase (RPC), per RPC/fase.

| Dokumen | Ringkasan |
|---|---|
| [migration-roadmap.md](implementation/migration/migration-roadmap.md) | Roadmap analisis migrasi business logic Frontend → Supabase. |
| [migration-phase-00.md](implementation/migration/migration-phase-00.md) | Phase 0: Database Constraints & Indexes. |
| [migration-phase-01-read-layer-audit.md](implementation/migration/migration-phase-01-read-layer-audit.md) | Phase 1: audit read layer (`api.js` seluruh fitur). |
| [migration-phase-01-approve-transfer.md](implementation/migration/migration-phase-01-approve-transfer.md) | Phase 1: RPC `approve_transfer`. |
| [migration-phase-01-fetch-produksi-batches-total.md](implementation/migration/migration-phase-01-fetch-produksi-batches-total.md) | Phase 1: RPC `get_produksi_batches_total`. |
| [migration-phase-01-fetch-sales-by-kode.md](implementation/migration/migration-phase-01-fetch-sales-by-kode.md) | Phase 1: RPC `get_sales_summary_by_product`. |
| [migration-phase-01-fetch-stok-map.md](implementation/migration/migration-phase-01-fetch-stok-map.md) | Phase 1: RPC `get_stock_summary`. |
| [migration-phase-01-laporan-produksi.md](implementation/migration/migration-phase-01-laporan-produksi.md) | Phase 1: RPC `get_laporan_produksi` (fetchProduksiBatches). |
| [migration-phase-01-revisi-produksi-batches-total.md](implementation/migration/migration-phase-01-revisi-produksi-batches-total.md) | Revisi arsitektur RPC `get_produksi_batches_total` (Full Aggregate). |

## implementation/ux/

Log implementasi & audit UX/UI di luar log fase Analytics murni.

| Dokumen | Ringkasan |
|---|---|
| [analytics-ux-audit-2026-07.md](implementation/ux/analytics-ux-audit-2026-07.md) | Audit UX lanjutan Analytics (hilangkan duplikasi) + redesign Back to Top app-wide + audit konsistensi UX lintas aplikasi. |
| [ux-redesign-template-hpp-harga-dasar.md](implementation/ux/ux-redesign-template-hpp-harga-dasar.md) | Redesign UX Template HPP & Harga Dasar. |

## product/

Dokumen level produk — requirement, roadmap, dan rencana eksekusi PR.

| Dokumen | Ringkasan |
|---|---|
| [prd.md](product/prd.md) | Product Requirements Document — Sistem Manajemen Bisnis Fashion. |
| [roadmap.md](product/roadmap.md) | Implementation Roadmap — hasil sequencing temuan `audit-report.md` jadi PR. |
| [pr-plan.md](product/pr-plan.md) | Production-Ready Pull Request Plan — 82 PR terurut dari Phase 0–4. |

## reports/

Laporan audit, investigasi, dan verifikasi coverage — sifatnya retrospektif/temuan.

| Dokumen | Ringkasan |
|---|---|
| [audit-report.md](reports/audit-report.md) | Full Codebase Audit Report. |
| [test-coverage-report.md](reports/test-coverage-report.md) | Verifikasi coverage test seluruh workspace. |
| [investigasi-hpp-poin.md](reports/investigasi-hpp-poin.md) | Investigasi komponen Poin yang hilang dari Total HPP. |
| [sinkronisasi-stok-bahan.md](reports/sinkronisasi-stok-bahan.md) | Investigasi sinkronisasi pemakaian bahan dengan produksi batch. |

## decisions/

Dokumen keputusan final yang menggantikan/menuntaskan draft rencana sebelumnya.

| Dokumen | Ringkasan |
|---|---|
| [migration-plan.md](decisions/migration-plan.md) | Migration Plan FINAL — hasil review adversarial atas `migration-roadmap.md`, menggantikan prioritas & desain di dalamnya. |
