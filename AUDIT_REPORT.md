# Deera Indonesia — Full Codebase Audit Report

**Date:** 2026-07-11
**Scope:** All 4 apps (catalog, admin, POS, finance) + `packages/shared`, ~563 source files
**Method:** Parallel deep-dive audits per workspace (verified by direct source reading, not inferred) + cross-cutting checks (dependency vulnerabilities, RLS policy governance, secrets exposure, git hooks)

## How to read this report

Findings are graded **Critical** (data loss / financial error / security exposure, reachable through normal use) → **High** (real bug or violation with a clear trigger path) → **Medium** (real but lower-probability or lower-impact) → **Low** (hardening / convention drift). Every finding cites `file:line`. "What's solid" sections are included per app — this codebase is not a mess; the point of listing them is to show the audit was thorough in both directions, not just fault-finding.

---

## Executive Summary

The codebase is architecturally disciplined — the Vertical Slice + Dependency Inversion pattern mandated in `CLAUDE.md` is genuinely followed almost everywhere, across all 5 workspaces, which is unusual to see this consistent at this scale (563 files). `npm audit` is clean (0 vulnerabilities), no service-role key or hardcoded secret was found anywhere in source or git history search, and there is exactly one Supabase client instance in the whole monorepo as intended.

The real risk is concentrated in three places, all independent of the architecture pattern:

1. **Non-atomic stock/money mutations.** Three separate, unrelated write paths — POS stock decrement (`sync.js`), admin transfer approval (`shared/features/transfers/api.js`), and finance payroll finalization (`gajian/hooks.js`) — all do client-side read-then-write instead of atomic DB-side arithmetic or transactions. Each is an independent, concrete lost-update race, not a shared root cause, meaning each needs its own fix.
2. **A hole in POS's inventory model:** editing a sale never adjusts stock. This isn't a rare race — it's a guaranteed drift on ordinary use of the "Edit Transaksi" feature.
3. **Public data exposure risk on the one unauthenticated surface.** The checked-in RLS migrations for `products` only grant `SELECT` to `authenticated`, yet `apps/catalog` reads `products` with the anon key and no column restriction. Either the public catalog is broken, or production has an undocumented policy patched outside of the migration files — and if the latter, internal cost price (`hpp`) is being shipped to every visitor.

None of the findings below require a sophisticated attacker or an edge case to trigger — ordinary operator behavior (editing a sale, two admins approving transfers close together, a network blip during payroll finalize) reaches most of them.

### Cross-cutting checks (verified independently, not part of the per-app audits)

- `npm audit --omit=dev` at repo root: **0 vulnerabilities**.
- Repo-wide grep for `service_role` / `SERVICE_ROLE` / `VITE_SUPABASE_SERVICE`: **0 matches** — only the anon key is used client-side, consistent across all 4 apps.
- Repo-wide grep for `createClient(`: exactly one real instantiation (`packages/shared/lib/supabase.js`) — the single-client invariant holds.
- `.env.local`/`.env.build-test` are correctly gitignored; nothing sensitive is tracked in git (`.env.example` only contains the public anon key + Cloudinary preset, both meant to be public-facing).
- Pre-commit hook (`.githooks/pre-commit` → `scripts/check-truncation.sh`, `git config core.hooksPath` correctly set to `.githooks`) is active and correctly scans staged JS/JSX via esbuild for the silent-truncation failure mode this project has clearly been burned by before.
- **RLS governance gap (verified independently, elevates the catalog agent's finding from suspected to confirmed at the source level):** `supabase/migrations/supabase-migration-add-user-to-history.sql:36-37` defines `products` SELECT as `TO authenticated` only — no migration file anywhere in the repo grants `anon` SELECT on `products`. `stok_warna`, by contrast, explicitly does (`supabase-migration-rls-fix.sql:26-29`, `TO anon, authenticated`). This asymmetry is either a genuine bug or evidence the live database has drifted from what's checked into git. Either way, it's a governance issue: the migrations no longer reliably describe production, which undermines every other conclusion an audit (including this one) can draw about what's actually enforced server-side. **This should be checked directly against the live Supabase project's `pg_policies` before anything else in this report.**

---

## Critical findings, ranked by blast radius

### 1. `approveTransfer` — non-atomic stock mutation, largest blast radius in the system
`packages/shared/features/transfers/api.js:113-186`

Reads current `gudang/cideng/tegalgubug` per item, computes new values in JS, then writes — classic read-modify-write race. Two admins approving different transfers touching the same `kode+size+warna` concurrently will silently lose one delta. Worse, `transfers.status` is flipped to `"approved"` *before* the per-item stock loop runs (lines 124-133), so a mid-loop failure leaves the transfer permanently marked approved with only some items' stock actually moved, and no rollback. Line 169 also silently clamps insufficient stock to 0 instead of erroring.

*Every app's stock figures* (POS offline cache, admin, catalog sold-out badges) trace back through `stok_warna`, and this is the one high-traffic write path to it that never received the atomicity guarantee the POS side explicitly engineered for itself.

**Fix:** Move the per-item mutation into a single Postgres `SECURITY DEFINER` RPC using atomic column arithmetic (`UPDATE stok_warna SET gudang = gudang - qty WHERE ... RETURNING gudang`) inside one transaction; only flip `status` after it succeeds; make insufficient-stock a hard error.

### 2. POS: editing a sale never reconciles stock
`apps/pos/src/features/penjualan/hooks.js:273-344` (`useUpdateSale`), UI at `apps/pos/src/features/laporan/components/EditSaleModal.jsx`

`updateSale()` recomputes totals and writes the new `items` array but never calls `applyStokLocal`/`applyStokToSupabase` — confirmed those two functions are only ever invoked from create/retur/delete, never update. `EditSaleModal` fully supports changing quantities and adding new products with no stock check on the add-product path. This is not a race-condition edge case — it is a guaranteed inventory drift on any normal use of "Edit Transaksi": increasing qty oversells without decrementing stock, decreasing/removing never credits stock back. It also compounds: `useDeleteSale` reverses stock using the *original* `stok_adjustments` snapshot, so deleting a previously-edited sale reverses the wrong quantities, drifting stock further with every edit+delete cycle.

**Fix:** In `updateSale`, diff old vs. new `items` per (kode,size,warna), apply the delta via the existing `applyStokToSupabase`/`applyStokLocal` (server-first, matching this file's own documented write-ordering contract), and persist the new cumulative `stok_adjustments` so future deletes reverse correctly.

### 3. POS: non-atomic server-side stock decrement — cross-device oversell
`apps/pos/src/lib/sync.js:63-88` (`applyStokToSupabase`)

Same read-then-write pattern as #1, but here it's the sale-creation path itself: two POS terminals selling the last units of the same SKU/size/warna concurrently can both read the same `current` value and one decrement is lost — server-reported stock ends up higher than physical stock. This is precisely the failure mode a multi-cashier live-market POS most needs to prevent.

**Fix:** Postgres RPC doing atomic `UPDATE ... SET gudang = gudang + $delta ... RETURNING gudang`, called from the client instead of select-then-update.

### 4. POS: `syncProducts()`/`syncPelanggan()` reintroduce the exact race `syncStok()` was built to fix
`apps/pos/src/lib/sync.js:6-21, 275-289` vs. `syncStok()`'s transaction+lock at lines 31-46

The file's own header comment documents `clear()`+`bulkPut()` as two separate Dexie ops as a known root-cause race, fixed for `stok_warna` via `db.transaction("rw", ...)` + a promise lock. `syncProducts()` and `syncPelanggan()` do the identical two-step clear+bulkPut with **neither** protection — a direct, unaddressed instance of the exact bug class `CLAUDE.md §13` explicitly calls out as forbidden. Concrete reachable impact: `searchPelanggan()` is called synchronously mid-checkout, so a race during a customer sync can return `[]` for an existing customer and create a duplicate record; `useProducts.js`'s `loadEnriched` has no protective retry for products (unlike the one it has for stok), so a race can make the entire catalog vanish from the cashier's screen mid-session; with no lock, `App.jsx`'s `doSync()` and `useProducts.js`'s own mount effect call `syncProducts()` concurrently on nearly every login, widening the window further.

**Fix:** Wrap both in `db.transaction("rw", ...)` and add a promise-lock identical to `_syncStokPromise`, for both tables.

### 5. Finance: finalized payroll periods are neither immutable nor safely deletable
`apps/finance/src/features/gajian/pages/GajianListPage.jsx:25-39`, `api.js:48-54`, and per-tim forms (`TabPotong.jsx`, `TabJahit.jsx`, `TabFinishing.jsx`, `TabQC.jsx`, `TabKreatif.jsx`, `TabCmt.jsx`)

Two compounding issues: (a) deleting a "final" period is allowed by the UI and cascades across `gaji_*` tables but never reverses the kasbon deductions that were applied at finalize time — the employee's debt ledger permanently understates their balance with no record left to explain it; (b) only `TabRingkasan.jsx`/`GajianShareCard.jsx` check `status === "final"` — every per-team entry form can still add/edit/delete line items after a period is finalized, silently diverging from the frozen totals shown in the summary, with no reconciliation path once diverged, and no server-side (RLS/trigger) enforcement either.

**Fix:** Block deletion of `status === "final"` periods (or require an explicit "reverse cicilan" step first); pass `gajian.status` into every `Tab*` component and reject writes when final, both client-side and via RLS/trigger.

### 6. Finance: `useFinalizeGajian` is non-atomic with no rollback
`apps/finance/src/features/gajian/hooks.js:90-106`

Finalize (lock `status: "final"` + write totals) commits and immediately re-renders the UI as final — *then* a sequential loop applies kasbon deductions per row. A failure partway through leaves the period permanently locked as final with only partial deductions applied, and no UI path to retry or reconcile the remainder.

**Fix:** Single Supabase RPC/transaction covering finalize + all kasbon deductions together, or make the deduction step idempotent/retriable and surface partial failure distinctly.

### 7. Catalog: `products` RLS/exposure — see cross-cutting section above
`packages/shared/features/products/api.js:8-11` does `select("*")` with no column allow-list, consumed verbatim by the public, unauthenticated catalog app. Combined with the RLS asymmetry described above, this is either a broken catalog or a live exposure of `hpp` (internal cost price) and, via `stok_warna`'s `TO anon, authenticated` policy, exact per-location stock counts, to any visitor inspecting network requests.

**Fix:** Create a `products_public` view (or explicit column allow-list) excluding `hpp` and any other internal-only fields, and point the catalog's fetch at that instead of the shared `select("*")` used by admin. Tighten `stok_warna` anon access to rely solely on the existing `get_sold_out_kodes()` RPC, which was built for exactly this purpose but is currently bypassable via direct table access.

---

## High-severity findings by app

### apps/admin
- **AdminPage.jsx imports `supabase` directly** (`features/produk/components/AdminPage.jsx:4,39-57`) — the one dependency-inversion violation found in this app; owns a Realtime subscription that belongs in `hooks.js`.
- **`toISOString()` used for local "today" in 9+ places**, contradicting `CLAUDE.md §13` explicitly (e.g. `produksi-bahan/components/BahanForm.jsx:13`, `produksi-record/utils.js:20`, `history/utils.js:136-146`, `transfer/components/TransferPage.jsx:40-49`). Between 00:00–06:59 WIB this dates new records/filters to the wrong day. Fix is mechanical: swap in the already-existing `localDateStr()` helper everywhere.
- **N+1 pattern:** `fetchSalesByKode` (`produk/api.js:51-80`) pulls up to 10,000 rows of the entire `sales` table and filters client-side, re-run every time a product detail modal opens.

### apps/finance
- **`window.confirm` used in 11 locations**, including the two highest-stakes actions in the app (delete-final-period, finalize-payroll) — a systemic pattern, not an isolated slip, directly violating `CLAUDE.md §13`.
- **"Tambahan Manual" catatan field is captured in 6 wage forms but never persisted** (`PotongForm.jsx`, `JahitForm.jsx`, `FinishingForm.jsx`, `QCForm.jsx`, `KreatifForm.jsx`, `CmtForm.jsx`) — users type a justification for a manual wage override that is silently discarded, a real audit-trail gap for a payroll system.
- **Kasbon ledger read-modify-write with no concurrency guard** (`kasbon/api.js`, 4 functions) — same lost-update class as the transfer/stock issues, applied to debt balances.
- **`fetchFinanceConfig` swallows fetch errors silently**, falling back to hardcoded default wage tariffs with no warning anywhere in the UI — a transient failure means real wages get computed from stale/default rates unnoticed.

### apps/pos
- **No idempotency key on sale insert** — a crash/tab-close between Supabase insert success and the local `status: "synced"` update causes the sale to be re-inserted (and stock re-decremented) on next sync.
- **`syncSalesForRange` dedup can miss an in-flight insert**, creating a duplicate local sale record (same root cause as above).

### apps/catalog
- **Hero image priority logic is dead code**: `isFirst = model.index === 0` (`CatalogSlide.jsx:26-27`) — `model.index` is never actually set anywhere in the app (only in a unit test), so every page load serves the above-the-fold hero image lazily instead of eagerly, hurting LCP on the most performance-critical route in the system.
- **`useHeroPreload` hook exists, is tested, and is never called** from `CatalogPage.jsx` — the LCP preload mechanism is fully built but unwired.
- **No per-product OG/meta tags** for `/code/:kode` — every WhatsApp-shared product link (the business's primary distribution channel) shows the generic homepage preview card, never the actual product photo/name.

### packages/shared
- **`formatHarga` strips the negative sign** (`lib/constants.js:8-12`, `\D` regex matches `-`) — confirmed live impact: `HppSection.jsx:41` uses it under a "(untung...)" / "profit" label, so a variant priced below cost displays as a positive "profit" with no minus sign. Not covered by any existing test.

---

## Medium and Low findings

Full detail (file:line, reasoning, fix) for each item below is preserved from the underlying per-app audits and available on request — summarized here to keep this report scannable:

**Medium:** cascade deletes/writes across multiple tables in `admin` (produk, produksi-record, produksi-hpp) are not transactional and mostly don't check `error` on intermediate steps; `stok-opname` save can silently overwrite concurrent POS-driven stock changes due to a stale 30s-cached client snapshot; several `admin`/`finance` files exceed the project's own ~200-line target by 2-4x (`HPPForm.jsx` 838 lines, `gajian/api.js` 319 lines, etc.); `dangerouslySetInnerHTML` in `transfer/components/ConfirmModal.jsx` interpolates free-typed `warna` values with no escaping; duplicated deduction-calculation logic across 4 files in `gajian`; `Struk.jsx` in POS uses raw `localStorage` instead of Zustand persist (the one architecture-rule violation found in POS); `fetchStokByLocation` in shared uses an unvalidated caller string as a column identifier; catalog's `useProduct(kode)` downloads the entire product catalog (including `hpp`, compounding the exposure finding) just to render one shared product link; catalog's video element bypasses Cloudinary's `f_auto,q_auto` transform that every image URL correctly uses.

**Low:** a global capture-phase listener force-uppercases every text input app-wide with no per-field opt-out (intentional branding choice, but fragile and hits free-text note fields); `_deletedIds` allow-list in POS grows unbounded in localStorage forever; an overly permissive RLS policy on `push_subscriptions` (`USING (true)` for all authenticated users) lets any admin read/delete any other admin's push keys; missing pagination on admin's audit-history view (hard-capped at 500 rows, no indication list is incomplete); no CSP/security headers on the public catalog's Vercel config; unmemoized list/filter recomputation in a handful of components (POS product list, catalog slide sort) — fine at current scale, will degrade as data grows.

---

## What's genuinely solid (verified, not assumed)

- Dependency Inversion (components only importing `hooks.js`/`index.js`, never `api.js`/`store.js`/`queries.js` directly) holds almost everywhere — one violation each in `admin` and none in `finance`, `pos`, `catalog`, or `shared`, out of 563 files.
- `window.confirm` is properly avoided in `admin`, `pos`, and `catalog` — only `finance` has the systemic violation noted above.
- Manual `localStorage` access in components is avoided everywhere except one file in POS (`Struk.jsx`) — everywhere else correctly routes through Zustand `persist`.
- Mutation → `invalidateQueries` discipline is consistently correct across every `queries.js` file checked.
- `marketDay.js` day-of-week routing logic, `bepUtils.js` division guards, and TanStack Query key factories are all correct.
- POS's `syncStok()` — the one function explicitly hardened against the clear+bulkPut race — is implemented exactly as documented, with both the promise lock and the atomic transaction in place; it's the template the rest of the sync code should have followed.
- `npm audit` clean, single Supabase client instance repo-wide, no secrets in source or git-tracked env files.

---

## Recommended remediation order

1. **Verify the live Supabase RLS state against `pg_policies`** for `products` and `stok_warna` — this determines whether finding #7 is an active data leak or a broken catalog, and resolves whether the checked-in migrations can be trusted as a source of truth for the rest of this report's security conclusions.
2. **Fix POS edit-sale stock reconciliation (#2)** and **atomic stock decrement (#3, #4)** — these are the most certain, highest-frequency sources of real-world stock drift, not theoretical races.
3. **Fix `approveTransfer` atomicity (#1)** — same bug class, second-highest traffic write path to the same shared table.
4. **Lock down payroll finalization (#5, #6)** before the next payroll cycle — ordinary operator behavior (a network blip, cleaning up an old period) reaches these, and the ledger corruption is not easily recoverable after the fact.
5. **Fix `formatHarga`'s sign bug** — one-line fix, currently displaying losses as profits in a live admin screen.
6. Sweep the `toISOString()` → `localDateStr()` violations (mechanical, ~15 call sites across admin/finance) and the `window.confirm` → custom-modal violations in finance (11 sites, one reusable component needed).
7. Wire up the two already-built-but-unused catalog LCP mechanisms (`isFirst` prop, `useHeroPreload`) — near-zero effort, direct conversion/performance impact on the highest-traffic app.
8. Everything else in Medium/Low is worth batching into normal sprint work; none of it is load-bearing.
