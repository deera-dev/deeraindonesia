# Deera Indonesia — Implementation Roadmap

**Source:** `AUDIT_REPORT.md` (2026-07-11 full codebase audit)
**Author role for this document:** Principal Engineer / Engineering Manager planning pass
**Status:** Planning only — nothing in this document has been implemented.
**Goal:** Sequence every audit finding into independently mergeable, reviewable PRs that minimize risk while maximizing long-term code quality.

## How this document is organized

- **Phase 0 — Foundational.** Not in the original audit's severity ranking, but called out here because these tasks unblock 3+ downstream tasks each. Do these first regardless of what else is in flight.
- **Phase 1 — Critical**, **Phase 2 — High**, **Phase 3 — Medium**, **Phase 4 — Low**, mapped from the audit's severity grading.
- Within each phase, tasks are ordered so that later tasks either depend on earlier ones or are safe to parallelize with them — read top-to-bottom as the recommended sequence within that phase.
- Every task is sized to land as **one PR**. Where the audit listed several near-identical instances of the same mechanical bug (e.g. 9 `toISOString()` call sites), they're grouped into a single task, because splitting a one-line-per-file mechanical sweep into 9 separate PRs adds review overhead without reducing risk. Where instances are structurally different (e.g. three separate non-atomic-write bugs in three different subsystems), they remain separate tasks even though they share a root cause, because they touch different tables, different teams' code paths, and different test suites.
- Complexity: **S** = under a day, **M** = 1–3 days, **L** = 3–7 days, **XL** = more than a week / needs a design spike first.

---

## 🔑 Foundational tasks — do these before everything else

These four tasks are called out separately because each one unblocks multiple Phase 1–3 tasks. Doing them out of order means redoing work later.

| ID | Task | Unblocks |
|----|------|----------|
| F0 | Verify live Supabase RLS policies against checked-in migrations | C1 (products exposure fix), and every other security conclusion in the audit — right now we can't be fully sure the migrations describe production |
| F1 | Build one atomic stock/balance-adjustment Postgres RPC pattern | C2 (transfer approval), C3 (POS stock decrement), H6 (kasbon race) — three unrelated bugs, same fix shape |
| F2 | Build one reusable `ConfirmModal` component (promote to `packages/shared/components`) | H4 (11-site `window.confirm` sweep in finance), and any future confirm-dialog need across all 4 apps |
| F3 | Add an ESLint rule banning `.toISOString().slice/split` on locally-constructed dates | H2 (the 15-site sweep) — fix the sweep once, then this rule stops it from ever coming back, in any of the 4 apps |

### F0 — Verify live Supabase RLS policies against checked-in migrations
- **Why it matters:** The audit found `products` SELECT is only granted `TO authenticated` in every checked-in migration, yet the public, unauthenticated catalog app reads `products` successfully in production. That's only possible if either (a) the catalog is actually broken right now, or (b) a policy was added directly via the Supabase dashboard and never captured in a migration file. We need to know which before touching anything RLS-related.
- **Business impact:** Determines whether internal cost price (`hpp`) is currently being leaked to the public, and whether the migration files can be trusted as ground truth for any future RLS work.
- **Technical impact:** No code change. This is a `SELECT policyname, roles, cmd, qual FROM pg_policies WHERE tablename IN ('products','stok_warna')` run against the live project, diffed against the repo's migration history, with the result written back as a migration file if drift is found (so git becomes truthful again).
- **Risk level:** None (read-only investigation).
- **Complexity:** S.
- **Files involved:** None (investigation); output may produce a new file under `supabase/migrations/`.
- **Dependencies:** None. Do this first.
- **Requires Supabase migration:** Possibly, as an output — to codify whatever the live policy actually is.
- **Requires DB changes:** No (investigation step); the follow-up (C1) may.
- **Breaking:** No.

### F1 — Atomic stock/balance-adjustment RPC pattern
- **Why it matters:** Three independent, high-traffic write paths (`applyStokToSupabase` in POS, `approveTransfer` in shared, kasbon ledger updates in finance) all do client-side read-current-value → compute-in-JS → write-back, which loses updates under concurrent writers. Building one well-tested RPC pattern once, then reusing it, is cheaper and safer than three bespoke fixes.
- **Business impact:** This is the single highest-leverage fix in the whole audit — it's the root cause behind the two most severe stock-integrity findings (C2, C3) and one High finance finding (H6).
- **Technical impact:** New Postgres function, e.g. `adjust_column(table, id_cols, column, delta)` is too generic/unsafe (SQL injection surface via dynamic column names); recommend instead one dedicated RPC per table needing it — `adjust_stok_warna(kode, size, warna, location, delta)` and `adjust_kasbon_sisa(kasbon_id, delta)` — sharing a common design (single `UPDATE ... SET col = col + delta WHERE ... AND col + delta >= 0 RETURNING *`, raising an exception on a 0-row result so the caller gets a real error instead of a silent no-op).
- **Risk level:** Low in isolation (additive, no existing code depends on it yet) — the risk shows up later when call sites are migrated to use it (tracked in C2/C3/H6).
- **Complexity:** M.
- **Files involved:** New `supabase/migrations/*.sql`; a new `packages/shared/lib/` helper (e.g. `rpc.js`) wrapping `supabase.rpc(...)` calls consistently.
- **Dependencies:** None.
- **Requires Supabase migration:** Yes — new RPC function(s).
- **Requires DB changes:** Yes — new stored procedures (no schema/table changes).
- **Breaking:** No (purely additive; nothing calls it yet).

### F2 — Reusable `ConfirmModal` component
- **Why it matters:** `finance` has 11 `window.confirm()` call sites that need replacing, and `window.confirm` is explicitly banned by this project's own conventions. Building the modal once as a shared component avoids 11 slightly-different bespoke modals and gives every future feature (in any of the 4 apps) a ready-made replacement.
- **Business impact:** Removes a real risk in a PWA context where `confirm()` can behave inconsistently, specifically gating the two highest-stakes actions in the payroll app (delete-final-period, finalize-payroll).
- **Technical impact:** One new component, ideally in `packages/shared/components/ConfirmModal.jsx` (admin's `transfer/components/ConfirmModal.jsx` is a reasonable starting reference for the visual pattern, minus its `dangerouslySetInnerHTML` usage — see M4).
- **Risk level:** None (net-new component, nothing depends on it yet).
- **Complexity:** S.
- **Files involved:** New `packages/shared/components/ConfirmModal.jsx` (+ test).
- **Dependencies:** None.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### F3 — ESLint rule: ban `toISOString()` for local date derivation
- **Why it matters:** The audit found this exact bug (UTC-vs-WIB off-by-one) independently reintroduced at 15+ call sites across `admin` and `finance`, despite the project's own `CLAUDE.md` explicitly forbidding it. A one-time sweep without a guardrail will just regress again in the next feature.
- **Business impact:** Prevents a recurring class of "wrong day between midnight and 7am" bugs from coming back after H2 fixes them.
- **Technical impact:** Custom ESLint rule (or a `no-restricted-syntax` config entry) flagging `.toISOString()` calls not immediately followed by nothing (i.e., flag `.toISOString().slice(...)`/`.split(...)` patterns specifically, since `toISOString()` alone is fine for full timestamps like `updated_at`).
- **Risk level:** Low — a lint rule can have false positives; scope it narrowly to the `.slice`/`.split` pattern to avoid flagging legitimate timestamp usage.
- **Complexity:** S.
- **Files involved:** `eslint.config.js`.
- **Dependencies:** None, but land alongside or right after H2 so the sweep and the guardrail ship together.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No (lint-only; may require a `--fix` pass or manual cleanup if it catches anything H2 missed).

---

## Phase 1 — Critical

Ordered for minimum-risk rollout: RLS truth established first, then the two independent stock-mutation atomicity fixes (POS and shared/transfers) which both consume F1, then the fixes that build on top of those, then finance's payroll-integrity fixes (independent domain, can run in parallel on a second track).

### C1 — Fix `products` public data exposure (RLS + column allow-list)
- **Why it matters:** Depends on F0's finding. If F0 confirms `anon` can read `products`, then `hpp` (internal cost price) and every other admin-only field are currently being shipped to any visitor of the public catalog via `select("*")`.
- **Business impact:** Direct exposure of margin/cost data to competitors and the public; also a governance issue if the live policy isn't in git.
- **Technical impact:** Create a `products_public` view (excluding `hpp` and any other internal-only columns) with an explicit `anon` SELECT policy; repoint `apps/catalog`'s product fetch at the view instead of the shared `select("*")` used by `admin`. `packages/shared/features/products/api.js` should either take a `{ public: true }` flag to switch tables, or `apps/catalog` should get its own thin `fetchPublicProducts()` in a local `api.js` (cleaner separation, avoids adding conditional logic to a function three other apps depend on).
- **Risk level:** High if done wrong (could break the live catalog); low if the new view is added additively and catalog is cut over deliberately with a smoke test.
- **Complexity:** M.
- **Files involved:** New `supabase/migrations/*.sql` (view + policy); `packages/shared/features/products/api.js`; `apps/catalog/src/features/product-catalog/` (new local `api.js` recommended); `apps/catalog/src/features/product-detail/`.
- **Dependencies:** F0 (must confirm current live state first).
- **Requires Supabase migration:** Yes.
- **Requires DB changes:** Yes — new view + RLS policy (no table schema change).
- **Breaking:** Non-breaking if rolled out as add-view-then-switch-consumer; breaking if the `anon` policy on the base `products` table is revoked before the catalog is cut over to the new view (sequence matters — cut over first, revoke second, in two separate deploys).

### C2 — `approveTransfer` atomicity
- **Why it matters:** Read-then-write race on `stok_warna` during transfer approval; also flips `status` to `"approved"` before the stock loop runs, so a partial failure leaves a permanently-approved transfer with inconsistent stock.
- **Business impact:** Silent stock-count drift affecting every app that reads `stok_warna` (POS, admin, catalog sold-out badges).
- **Technical impact:** Replace the per-item read-modify-write loop with calls to the `adjust_stok_warna` RPC from F1; only flip `status` to `"approved"` after all RPC calls succeed (ideally wrap the whole approval in a second RPC that does both, for true atomicity — recommended over doing it from the client in a loop).
- **Risk level:** Medium — touches the highest-traffic shared-stock write path after POS sales.
- **Complexity:** M–L.
- **Files involved:** `packages/shared/features/transfers/api.js:113-186`.
- **Dependencies:** F1.
- **Requires Supabase migration:** Possibly an additional RPC (`approve_transfer(transfer_id)`) if going the "one transaction" route.
- **Requires DB changes:** Yes (new RPC).
- **Breaking:** Non-breaking (same external function signature from `queries.js`/`hooks.js` callers).

### C3 — POS: atomic stock decrement on sale
- **Why it matters:** Same read-then-write race as C2, but on the create-sale path — the most frequent stock-mutating operation in the whole system, run on multiple concurrent POS terminals at live markets.
- **Business impact:** Directly enables overselling (server stock ends up higher than physical stock) under normal multi-cashier usage, not just an edge case.
- **Technical impact:** Replace `applyStokToSupabase`'s select-then-update with the `adjust_stok_warna` RPC from F1.
- **Risk level:** Medium-High — this is the most business-critical write path in the codebase; needs solid test coverage (existing 44 tests on `sync.js` should be extended, not replaced) and a careful rollout given POS's offline-first nature (the RPC call needs the same "server succeeds before local write" ordering the file already documents elsewhere).
- **Complexity:** M.
- **Files involved:** `apps/pos/src/lib/sync.js:63-88`.
- **Dependencies:** F1.
- **Requires Supabase migration:** No (reuses F1's RPC).
- **Requires DB changes:** No new changes beyond F1.
- **Breaking:** Non-breaking (internal implementation change; external call signature unchanged).

### C4 — POS: reconcile stock on sale edit
- **Why it matters:** `useUpdateSale` never adjusts stock at all — this is the single most certain, highest-frequency source of real inventory drift found in the audit, since it happens on ordinary use of "Edit Transaksi," not just under a race.
- **Business impact:** Every edited sale silently corrupts stock counts (oversell on qty-increase, phantom "habis" on qty-decrease); compounds further because delete-after-edit reverses the wrong quantities.
- **Technical impact:** Diff old vs. new `items` per (kode,size,warna) in `updateSale`, apply the delta via `applyStokToSupabase`/`applyStokLocal` (server-first, per the file's existing write-ordering contract), and persist the new cumulative `stok_adjustments` on the sale row so a later delete reverses correctly.
- **Risk level:** Medium-High — core POS money/inventory path; needs thorough test coverage of add/remove/qty-change/mixed-edit scenarios plus the delete-after-edit interaction.
- **Complexity:** L.
- **Files involved:** `apps/pos/src/features/penjualan/hooks.js:273-344`; `apps/pos/src/features/laporan/components/EditSaleModal.jsx` (add stock cap on the "+Tambah Produk" qty stepper, matching `WarnaPanel`'s existing `Math.min(stok, ...)` guard).
- **Dependencies:** Should land after C3, so the stock-mutation primitive it calls is already atomic — avoids compounding two stock-mutation rewrites in the same window.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** Non-breaking (fixes existing broken behavior; no API shape change).

### C5 — POS: fix `syncProducts()`/`syncPelanggan()` clear+bulkPut race
- **Why it matters:** Reintroduces, unfixed, the exact Dexie race the codebase's own comments say was fixed for `stok_warna`. Concretely causes duplicate customer records at checkout and can make the product catalog vanish mid-session on the cashier's screen.
- **Business impact:** Duplicate customer data; a broken cashier screen mid-sale is a direct sales-blocking bug at a live market.
- **Technical impact:** Wrap both functions' `clear()`+`bulkPut()` in `db.transaction("rw", ...)`, and add a promise-lock identical to `_syncStokPromise` for each.
- **Risk level:** Low — this is a mechanical fix following an already-proven pattern in the same file.
- **Complexity:** S–M.
- **Files involved:** `apps/pos/src/lib/sync.js:6-21, 275-289`.
- **Dependencies:** None (independent of the stock RPC work; can run in parallel with C2/C3).
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### C6 — Finance: lock down finalized payroll periods
- **Why it matters:** Finalized periods can currently be deleted (orphaning kasbon deductions with no trace) and can still be edited from every per-team tab except the two that explicitly check `status`.
- **Business impact:** Permanent, hard-to-detect payroll ledger corruption and debt-balance drift reachable through completely ordinary admin behavior (routine cleanup, forgetting a period is closed).
- **Technical impact:** Block delete when `status === "final"` in the UI and in `api.js`; thread `gajian.status` into all six `Tab*` components and disable/reject add-edit-delete when final; add a matching RLS check or trigger so the guarantee doesn't rely solely on the client.
- **Risk level:** Medium — payroll data, needs careful QA against existing finalized-period test fixtures, but the change itself is a guard, not a rewrite.
- **Complexity:** M.
- **Files involved:** `apps/finance/src/features/gajian/pages/GajianListPage.jsx:25-39`, `api.js:48-54`, `components/TabPotong.jsx`, `TabJahit.jsx`, `TabFinishing.jsx`, `TabQC.jsx`, `TabKreatif.jsx`, `TabCmt.jsx`.
- **Dependencies:** None (independent domain from C1–C5; can run on a parallel track/second engineer).
- **Requires Supabase migration:** Recommended (RLS policy or trigger to enforce server-side, not strictly required for the client-side fix to ship).
- **Requires DB changes:** Yes if the RLS/trigger enforcement is included (recommended); No for a client-only first pass.
- **Breaking:** Non-breaking for normal use; intentionally "breaking" in the sense that it removes previously-possible (but wrong) actions — worth a release note for the finance team.

### C7 — Finance: atomic payroll finalize + kasbon deduction
- **Why it matters:** `useFinalizeGajian` commits the "final" status and re-renders the UI as final, then applies kasbon deductions in a sequential loop with no rollback — a mid-loop failure leaves a permanently-locked period with partial deductions and no recovery path.
- **Business impact:** Same class of ledger corruption as C6, triggered by an ordinary network blip during finalize rather than deliberate user action.
- **Technical impact:** Combine finalize + all kasbon deductions into a single Postgres RPC/transaction (can reuse the `adjust_kasbon_sisa` RPC from F1 internally, called N times inside one server-side transaction rather than N client round-trips).
- **Risk level:** Medium — same care as C6; test against multi-kasbon-row finalize scenarios and simulated mid-operation failure.
- **Complexity:** L.
- **Files involved:** `apps/finance/src/features/gajian/hooks.js:90-106`; new `supabase/migrations/*.sql`.
- **Dependencies:** F1 (reuses the kasbon-adjustment RPC); should land alongside or right after C6 since both touch the same finalize workflow.
- **Requires Supabase migration:** Yes.
- **Requires DB changes:** Yes (new RPC).
- **Breaking:** Non-breaking (same external trigger point — the "Finalisasi" button — different internal implementation).

---

## Phase 2 — High

### H1 — Fix `AdminPage.jsx` dependency-inversion violation
- **Why it matters:** The one place in `admin` that imports `supabase` directly and owns Realtime lifecycle logic inside a Page component, contradicting the project's own strict architecture rule everywhere else.
- **Business impact:** Low direct business impact; this is a maintainability/consistency fix that keeps the one clean architectural invariant in the codebase from eroding.
- **Technical impact:** Move the `transfers` Realtime subscription into `features/produk/hooks.js` (`useTransferNotifications()`), backed by a small `api.js`/`queries.js` wrapper, matching every other feature's pattern.
- **Risk level:** Low.
- **Complexity:** S.
- **Files involved:** `apps/admin/src/features/produk/components/AdminPage.jsx:4,39-57`; new additions to `features/produk/api.js`, `queries.js`, `hooks.js`.
- **Dependencies:** None.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### H2 — Sweep `toISOString()` local-date bug (admin + finance)
- **Why it matters:** 15+ call sites compute "today" via `toISOString().slice/split`, which reads UTC and is wrong for 7 hours a day in WIB (UTC+7) — explicitly forbidden by the project's own conventions.
- **Business impact:** Wrong dates on generated batch/sample numbers, date-range filters excluding/including the wrong records, and (in finance) a payroll-period default date defaulting to the wrong Saturday, all during the early-morning window.
- **Technical impact:** Replace every flagged call site with the existing `localDateStr()` helper from `packages/shared/lib/bepUtils.js`.
- **Risk level:** Low — mechanical, well-understood fix; the only risk is missing a call site, which F3's lint rule catches going forward.
- **Complexity:** S–M (many files, each a one-line change).
- **Files involved:** `apps/admin/src/features/produksi-bahan/components/BahanForm.jsx:13`, `PembelianBulkForm.jsx:9`, `PinjamBulkForm.jsx:15`; `apps/admin/src/features/produksi-record/components/BatchForm.jsx:34`, `utils.js:20`; `apps/admin/src/features/produksi-sampel/components/SampelForm.jsx:209,221`, `utils.js:29`; `apps/admin/src/features/history/utils.js:136,141,146`; `apps/admin/src/features/transfer/components/TransferPage.jsx:40,45,49`; `apps/finance/src/shared/lib/format.js:37-52` (`getSabtu`/`getSenin`); `apps/finance/src/features/gajian/hooks.js:101`; `apps/finance/src/features/dashboard/hooks.js:22`; `apps/finance/src/features/pettycash/components/PettycashForm.jsx:11`, `apps/finance/src/features/gajian/components/CicilanModal.jsx:9`, `apps/finance/src/features/kasbon/components/KasbonForm.jsx:14`.
- **Dependencies:** None; land together with F3.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### H3 — Fix N+1 full-table scan in `fetchSalesByKode`
- **Why it matters:** Pulls up to 10,000 rows of the entire `sales` table client-side to compute one product's sold quantity, re-run every time a product detail modal opens.
- **Business impact:** Scales linearly with total historical sales volume; will get materially slower as the business accumulates sales history, on a frequently-used admin screen.
- **Technical impact:** Add a server-side filtered query (Postgres `jsonb` containment on `items`, or a dedicated aggregating view/RPC keyed by `kode`, following the existing `v_stok_bahan` view pattern).
- **Risk level:** Low — additive query, no change to existing behavior beyond performance.
- **Complexity:** M.
- **Files involved:** `apps/admin/src/features/produk/api.js:51-80`; `apps/admin/src/features/produk/components/ProductDetailModal.jsx:13,25`; new `supabase/migrations/*.sql` for the view/RPC.
- **Dependencies:** None.
- **Requires Supabase migration:** Yes (new view or RPC).
- **Requires DB changes:** Yes (view/RPC; consider an index on `sales.items` if using `jsonb` containment).
- **Breaking:** No.

### H4 — Replace `window.confirm` in finance (11 sites)
- **Why it matters:** Systemic violation of the project's ban on `window.confirm`, gating the two highest-stakes actions in the payroll module.
- **Business impact:** Reliability of confirmation dialogs in a PWA context; directly relevant to C6's delete-final-period guard (this task should ideally land as part of the same PR as C6 for the delete-confirmation site, or immediately before it).
- **Technical impact:** Swap all 11 `window.confirm()` calls for the `ConfirmModal` component built in F2.
- **Risk level:** Low.
- **Complexity:** M (11 call sites, mechanical once F2 exists).
- **Files involved:** `apps/finance/src/features/pettycash/components/PettycashPage.jsx:26`, `kasbon/components/KasbonPage.jsx:26`, `pengaturan/components/PengaturanPage.jsx:51`, `gajian/pages/GajianListPage.jsx:29`, `gajian/components/TabCmt.jsx:17`, `TabFinishing.jsx:16`, `TabJahit.jsx:22`, `TabKreatif.jsx:26`, `TabPotong.jsx:18`, `TabQC.jsx:16`, `TabRingkasan.jsx:62`.
- **Dependencies:** F2.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### H5 — Persist the "Tambahan Manual" catatan field (6 wage forms)
- **Why it matters:** Users type a justification for a manual wage override; it's silently discarded on every submit in all 6 team forms — a real audit-trail gap in a payroll system.
- **Business impact:** Loss of documented reasoning for ad-hoc wage adjustments; matters for dispute resolution and compliance.
- **Technical impact:** Add a `catatan_manual` column to each `gaji_*` table; include it in each form's submit payload.
- **Risk level:** Low — additive column, additive field.
- **Complexity:** M.
- **Files involved:** `apps/finance/src/features/gajian/components/PotongForm.jsx`, `JahitForm.jsx`, `FinishingForm.jsx`, `QCForm.jsx`, `KreatifForm.jsx`, `CmtForm.jsx`; corresponding `api.js` payload builders; new `supabase/migrations/*.sql`.
- **Dependencies:** None.
- **Requires Supabase migration:** Yes (new column × 6 tables).
- **Requires DB changes:** Yes.
- **Breaking:** No (additive, nullable column).

### H6 — Fix kasbon ledger race condition
- **Why it matters:** Same read-modify-write race as C2/C3, applied to debt balances (`sisa`, `jumlah`, `cicilan`) — two near-simultaneous writes to the same kasbon row silently lose one.
- **Business impact:** Money-tracking bug on a debt ledger; low frequency given team size, but real.
- **Technical impact:** Move `createOrAccumulateKasbon`, `updateKasbonJumlah`, `payCicilan`, `applyKasbonDeductionFromGajian` onto the `adjust_kasbon_sisa` RPC from F1.
- **Risk level:** Low-Medium.
- **Complexity:** M.
- **Files involved:** `apps/finance/src/features/kasbon/api.js:20-51,59-72,79-93,121-130`.
- **Dependencies:** F1; land alongside or after C7 since both touch kasbon deduction logic.
- **Requires Supabase migration:** No (reuses F1's RPC).
- **Requires DB changes:** No new changes beyond F1.
- **Breaking:** No.

### H7 — Surface `fetchFinanceConfig` errors instead of silently swallowing them
- **Why it matters:** A fetch failure currently falls back to hardcoded default wage tariffs with zero warning anywhere in the UI — every wage-calculating form downstream silently uses the wrong rates.
- **Business impact:** Real wages could be computed from stale/default tariffs during a transient failure, with no signal to catch it before payroll runs.
- **Technical impact:** `if (error) throw error;` in `fetchFinanceConfig`; surface `isError`/`error` through `useFinanceConfig()`; block or warn in wage-entry forms when config failed to load.
- **Risk level:** Low.
- **Complexity:** S.
- **Files involved:** `apps/finance/src/features/pengaturan/api.js:8-15`, `hooks.js:10-13`, `components/PengaturanPage.jsx`.
- **Dependencies:** None.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### H8 — POS: idempotency key on sale insert (covers both the duplicate-insert and dedup-gap findings)
- **Why it matters:** A crash/tab-close in the window between a successful Supabase insert and the local `status:"synced"` update causes the sale to be re-inserted (and stock double-decremented) on the next sync; the same write-ordering gap also lets `syncSalesForRange` create a duplicate local record when a remote insert has committed but the local `supabase_id` hasn't landed yet.
- **Business impact:** Duplicate sales / double-counted revenue and double stock deduction, both reachable via ordinary flaky-connectivity conditions this app is explicitly built to handle.
- **Technical impact:** Add a client-generated UUID column with a unique constraint on `sales`; include it in the insert payload; `upsert(payload, {onConflict: "local_uuid"})` in both `createSale`/`createRetur` and `flushPendingSales`, making a retried insert a no-op instead of a duplicate; use the same key for dedup in `syncSalesForRange` instead of `supabase_id`.
- **Risk level:** Medium — touches the core sale-creation path; needs careful backward-compatibility handling for any already-pending offline sales during rollout.
- **Complexity:** L.
- **Files involved:** `apps/pos/src/features/penjualan/hooks.js:191-211,245-251`; `apps/pos/src/lib/sync.js:145,188-236`; new `supabase/migrations/*.sql`.
- **Dependencies:** Should land after C3/C4 (same file family, avoid three concurrent rewrites of the sale-write path at once).
- **Requires Supabase migration:** Yes (new column + unique constraint on `sales`).
- **Requires DB changes:** Yes.
- **Breaking:** Non-breaking if the column is added nullable with a backfill-on-write approach; flag for a coordinated release since it touches the offline queue format.

### H9 — Catalog: fix hero-image LCP wiring
- **Why it matters:** Two mechanisms meant to prioritize the above-the-fold hero image's load (`isFirst` prop, `useHeroPreload` hook) are both fully built, tested, and never actually wired up — `model.index` is never set, and the preload hook is called nowhere outside its own test.
- **Business impact:** Every visitor gets a slower, flashing hero image on the most performance-critical route in the system (LCP directly affects bounce rate on a sales-driving public catalog).
- **Technical impact:** Pass `isFirst={index === 0}` from `CatalogPage.jsx`'s `.map()` into `CatalogSlide`; call `useHeroPreload(sorted)` once `sorted` is computed in `CatalogPage.jsx`.
- **Risk level:** Low — both mechanisms already exist and are tested; this is purely a wiring fix.
- **Complexity:** S.
- **Files involved:** `apps/catalog/src/features/product-catalog/components/CatalogPage.jsx:57-71`, `CatalogSlide.jsx:26-27`; `apps/catalog/src/shared/hooks/useHeroPreload.js`.
- **Dependencies:** None.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### H10 — Catalog: per-product OG/meta tags for WhatsApp link previews
- **Why it matters:** `apps/catalog` is a pure CSR SPA with one static set of meta tags for the whole site — every `/code/:kode` link shared via WhatsApp (the business's primary distribution channel) shows the generic homepage preview, never the actual product.
- **Business impact:** Directly undermines conversion on the core product-sharing workflow.
- **Technical impact:** Requires infrastructure, not just a component change — either a Vite SSG/prerender plugin for the detail route, or a Vercel Edge Function that injects per-product `<meta>` tags server-side before serving `index.html` for `/code/:kode` requests, using `product.image`/`nama`/`kode`.
- **Risk level:** Medium — this is the one High-severity item that's an infrastructure change, not a code fix; needs a design decision (SSG vs. edge function) before implementation starts.
- **Complexity:** L–XL.
- **Files involved:** `apps/catalog/src/features/product-detail/components/ProductDetailPage.jsx`; `apps/catalog/index.html`; new build/deploy config (Vercel Edge Function or Vite plugin).
- **Dependencies:** Should land after C1 (products RLS/exposure fix) since the meta-tag generation needs a safe, public data source for product info — avoid building this against the exposed `select("*")` path.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No (additive; existing SPA behavior unaffected for non-crawler visitors).

### H11 — Fix `formatHarga` negative-sign bug
- **Why it matters:** The digit-stripping regex (`\D`) also strips the minus sign, so a variant priced below cost (a real loss) displays as a positive number under a "profit" label in a live admin screen.
- **Business impact:** Direct financial-display error visible to whoever manages pricing.
- **Technical impact:** Change the regex to preserve a leading minus sign (`replace(/[^\d-]/g, "")`), or compute `Math.abs` and re-prepend the sign explicitly. Add a negative-input test case (currently missing).
- **Risk level:** Low — but this function is used by all 4 apps, so verify no caller relies on the current (buggy) sign-stripping behavior before shipping.
- **Complexity:** S.
- **Files involved:** `packages/shared/lib/constants.js:8-12`; `apps/admin/src/features/produk/components/HppSection.jsx:41` (verify fix here specifically); `constants.test.js` (add regression test).
- **Dependencies:** None.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** Technically breaking in the narrow sense that any code accidentally relying on the sign being stripped will change behavior — grep confirmed no such reliance exists, so treat as non-breaking in practice.

---

## Phase 3 — Medium

Grouped by app; each row is independently mergeable. Order within each app follows dependency, then risk-ascending.

### M1 — Make admin's multi-table cascades transactional
- **Why it matters:** Cascade deletes/writes across `products`/`stok_warna`/`expected_stok`/`hpp_template` (and similar) in `produk`, `produksi-record`, and `produksi-hpp` are sequential, mostly don't check `error` on intermediate steps, and can leave orphaned rows on partial failure.
- **Business impact:** Data-integrity corruption under real-world failure conditions (network blips, RLS denials) — not visible in a demo, shows up over time in production.
- **Technical impact:** Convert each cascade to a Postgres RPC (one transaction per cascade) — `delete_product_cascade`, `delete_batch_and_product`, `save_produksi_entry`, etc.
- **Risk level:** Medium — several distinct cascades, each needs its own RPC and its own test coverage; recommend splitting into 3 separate PRs (one per feature: produk, produksi-record, produksi-hpp) rather than one large PR.
- **Complexity:** L (per feature) / XL (all three together) — **split into 3 PRs**.
- **Files involved:** `apps/admin/src/features/produk/api.js:185-212`; `apps/admin/src/features/produksi-record/api.js:26-168`; `apps/admin/src/features/produksi-hpp/api.js:70-91`; `apps/admin/src/features/produksi-bahan/api.js:47,52`; new `supabase/migrations/*.sql` per feature.
- **Dependencies:** None; can run in parallel with Phase 1/2 work on a separate track.
- **Requires Supabase migration:** Yes (new RPCs).
- **Requires DB changes:** Yes.
- **Breaking:** No (internal implementation change).

### M2 — Fix stok-opname stale-snapshot overwrite
- **Why it matters:** A stok-opname session can run for several minutes on a 30-second-cached client snapshot; unedited location columns get written back from that stale snapshot, silently overwriting any concurrent POS sale or transfer-approval change to the same row.
- **Business impact:** Stock-count corruption during routine physical-count reconciliation — ironic since stok-opname exists specifically to correct stock counts.
- **Technical impact:** Either refetch `stokRows` immediately before building `upsertRows`, or switch to a targeted per-column `UPDATE` that only touches columns present in `changed[id]`, never the unedited ones.
- **Risk level:** Low-Medium.
- **Complexity:** M.
- **Files involved:** `apps/admin/src/features/stok-opname/api.js:24-59`; `components/StokOpnamePage.jsx:59-72`; `hooks.js:13-16`.
- **Dependencies:** None; benefits from F1's RPC pattern if going the targeted-update route.
- **Requires Supabase migration:** Only if adopting the targeted-update RPC approach (recommended, for consistency with C2/C3).
- **Requires DB changes:** Optional (see above).
- **Breaking:** No.

### M3 — Split oversized admin files (6 files, ~200-840 lines over target)
- **Why it matters:** `HPPForm.jsx` (838 lines, bundles an unrelated `ProdukPicker` inline), `SuratJalan.jsx` (569), `ProduksiSampelPage.jsx` (566), `BatchForm.jsx` (544), `ProduksiHPPPage.jsx` (535, bundles two inline sub-components), `TransferForm.jsx` (530) all exceed the project's own ~200-line target by 2.5-4x.
- **Business impact:** None directly; this is a maintainability investment that reduces the chance of future bugs in these already-complex files.
- **Technical impact:** Extract inline sub-components (`ProdukPicker`, `KalkulatorHPP`, `RangeSlider`) into their own files, following the `produksi-bahan` feature's existing decomposition as the reference pattern (explicitly cited in the project's own docs).
- **Risk level:** Low if done as pure extraction with no logic change, verified by existing test suite passing unchanged.
- **Complexity:** M per file — **split into up to 6 PRs**, one per file, so each is independently reviewable and revertable.
- **Files involved:** As listed above.
- **Dependencies:** None.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### M4 — Fix `dangerouslySetInnerHTML` XSS surface in `ConfirmModal`
- **Why it matters:** Interpolates free-typed `warna` (color name) values into a raw HTML string with no escaping; `warna` is free-text on product creation, so a crafted value would execute as HTML for any admin viewing/approving a transfer containing it.
- **Business impact:** Stored-XSS risk in an internal admin tool — lower severity than a public-facing XSS, but still real, since any authenticated admin account could be the entry point.
- **Technical impact:** Render with JSX elements instead of an HTML string; remove `dangerouslySetInnerHTML` entirely from this component.
- **Risk level:** Low to fix, but flag as security-relevant for prioritization above its Medium label would otherwise suggest.
- **Complexity:** S.
- **Files involved:** `apps/admin/src/features/transfer/components/ConfirmModal.jsx:69-77,128-131`.
- **Dependencies:** Natural to pair with F2 if `ConfirmModal` is being generalized into the shared package anyway.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### M5 — Paginate admin's audit history view
- **Why it matters:** `fetchHistory` hard-caps at 500 rows with no cursor and no indication to the user the list is incomplete.
- **Business impact:** Audit trail silently truncates for any filtered range with more than 500 events — undermines the audit log's actual purpose.
- **Technical impact:** Add cursor-based pagination (`created_at`/`id` keyset) with a "load more" affordance.
- **Risk level:** Low.
- **Complexity:** M.
- **Files involved:** `apps/admin/src/features/history/api.js:53-69`; `components/HistoryPage.jsx`.
- **Dependencies:** None.
- **Requires Supabase migration:** No (query change only; consider an index on `changed_at` if not present).
- **Requires DB changes:** Optional (index).
- **Breaking:** No.

### M6 — Extract duplicated kasbon-deduction/transfer-amount calculation
- **Why it matters:** The same `transfer = Math.max(total - potongan, 0)` + deduction-aggregation logic is independently implemented in 4 places; currently consistent but any future formula change requires editing all 4 by hand.
- **Business impact:** None today; prevents future formula drift.
- **Technical impact:** Extract `buildDedByNama()`/`calcTransfer()` into `gajian/utils.js`, use from all 4 call sites.
- **Risk level:** Low — pure refactor, verify against existing snapshot/output tests.
- **Complexity:** S–M.
- **Files involved:** `apps/finance/src/features/gajian/components/TabRingkasan.jsx`, `PerKaryawan.jsx:14-25`, `GajianShareCard.jsx:19-23,105-107`, `utils.js:176-180,223-225`.
- **Dependencies:** None.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### M7 — Split oversized finance/gajian files
- **Why it matters:** `gajian/api.js` (319 lines, mixing periode CRUD + totals + 6 teams' CRUD in one file), `TabRingkasan.jsx` (245), `utils.js` (240), `JahitForm.jsx` (236), `hooks.js` (228), `queries.js` (218) all exceed the ~200-line target.
- **Business impact:** None directly; maintainability investment in the highest-risk feature in the app.
- **Technical impact:** Split `api.js` by concern (periode/totals vs. per-team CRUD), following the same decomposition pattern as M3.
- **Risk level:** Low if pure extraction.
- **Complexity:** M — **split into per-file PRs** as with M3.
- **Files involved:** As listed above.
- **Dependencies:** None; natural to sequence after C6/C7/H5/H6 land (avoid splitting files that are concurrently being modified for correctness fixes).
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### M8 — Make `PengaturanPage` tariff save atomic
- **Why it matters:** Fires N independent upserts via `Promise.all` with no atomicity; a partial failure leaves tariffs in a mixed old/new state with only a generic error toast.
- **Business impact:** Same class of issue as C7/H7 but lower frequency (tariff changes are infrequent, admin-only).
- **Technical impact:** Wrap the N upserts in a single RPC/transaction, or at minimum sequence them with explicit rollback-on-failure logic and a specific error message identifying which tariff failed.
- **Risk level:** Low.
- **Complexity:** S–M.
- **Files involved:** `apps/finance/src/features/pengaturan/components/PengaturanPage.jsx:38-40,54-58`.
- **Dependencies:** None.
- **Requires Supabase migration:** Optional (if converting to RPC).
- **Requires DB changes:** Optional.
- **Breaking:** No.

### M9 — Optimize pettycash/dashboard queries
- **Why it matters:** `usePettycashAll()` fetches the entire table unbounded and recomputes saldo via two unmemoized `.reduce()` passes on every call; the dashboard's "this month" stat also filters the full table client-side instead of querying a date range.
- **Business impact:** None today at current data volume; will degrade as the table grows across years of daily entries.
- **Technical impact:** Wrap the saldo reduce in `useMemo`; add server-side `.gte("tanggal", ...)` filtering for the dashboard's monthly stat.
- **Risk level:** Low.
- **Complexity:** M.
- **Files involved:** `apps/finance/src/features/pettycash/api.js:8-16`, `hooks.js:16-27`; `apps/finance/src/features/dashboard/hooks.js`.
- **Dependencies:** None.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### M10 — Warn when editing an entry silently drops a prior manual tambahan
- **Why it matters:** All 5 team forms correctly initialize `manualJumlah` to `""` on edit (per the project's own explicit rule), but this means reopening an entry and saving without re-entering the manual amount silently drops it — the rule is intentional, but nothing warns the operator.
- **Business impact:** Silent wage-calculation change on edit, easy to miss.
- **Technical impact:** Add a visible warning in the edit form when the entry's prior total implies a nonzero manual component that will be dropped if not re-entered.
- **Risk level:** Low.
- **Complexity:** S.
- **Files involved:** The 6 team forms in `apps/finance/src/features/gajian/components/`.
- **Dependencies:** Natural to pair with H5 (same forms, same "manual" field family).
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### M11 — Move POS `Struk.jsx` off raw `localStorage`
- **Why it matters:** The one architecture-rule violation found in POS — direct `localStorage.getItem/setItem` in a component instead of Zustand `persist`.
- **Business impact:** None directly; consistency fix.
- **Technical impact:** New `useLabelTypeStore` (Zustand + `persist`, key `deera-label-type`), matching the pattern used by catalog's `useVisitUsModalStore`.
- **Risk level:** Low.
- **Complexity:** S.
- **Files involved:** `apps/pos/src/shared/components/Struk.jsx:18-33`.
- **Dependencies:** None.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### M12 — Prune POS's unbounded `_deletedIds` allow-list
- **Why it matters:** Grows forever in `localStorage` with no expiry, across months/years of live market operation.
- **Business impact:** None today; slow-growing storage bloat.
- **Technical impact:** Prune entries older than the sync window actually consulted by `syncSalesForRange`, or move the check server-side as a soft-delete flag.
- **Risk level:** Low.
- **Complexity:** S.
- **Files involved:** `apps/pos/src/lib/sync.js:158-182`.
- **Dependencies:** Natural to pair with H8 (both touch the deleted/synced-sale bookkeeping).
- **Requires Supabase migration:** No (unless moving to a server-side soft-delete flag, which would need one).
- **Requires DB changes:** Optional.
- **Breaking:** No.

### M13 — Split oversized POS files
- **Why it matters:** `penjualan/hooks.js` (396 lines) and `laporan/components/LaporanKeuangan.jsx` (331 lines) are roughly 2x the project's target.
- **Business impact:** None directly.
- **Technical impact:** Split `LaporanKeuangan.jsx` into sub-components; `penjualan/hooks.js`'s length is defensible given its documented safety-critical logic — consider only after C4/H8 land, and only if it's still oversized once those fixes are in (don't split a file mid-rewrite).
- **Risk level:** Low.
- **Complexity:** M.
- **Files involved:** As listed above.
- **Dependencies:** After C4 and H8.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### M14 — Memoize/virtualize POS product list
- **Why it matters:** `variantMap`/`allSizes`/`totalStok` recomputed on every render for every product; full catalog renders unvirtualized.
- **Business impact:** None today at current boutique-catalog scale; will degrade if the catalog grows into the hundreds.
- **Technical impact:** `useMemo` the per-product derivations; consider virtualization only if/when catalog size grows materially.
- **Risk level:** Low.
- **Complexity:** M.
- **Files involved:** `apps/pos/src/features/kasir/components/ProductList.jsx:43-126,129-199`.
- **Dependencies:** None.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### M15 — Validate `location` input in `fetchStokByLocation`
- **Why it matters:** Caller-supplied string used directly as a column identifier (`.gt(location, 0)`) with no check against the known `LOCATIONS` enum; not exploitable today (only caller is a `<select>`) but unsafe as public shared-package API.
- **Business impact:** None today; defensive hardening for a function 4 apps can call.
- **Technical impact:** Whitelist-check `location` against `LOCATIONS` at the top of the function.
- **Risk level:** Low.
- **Complexity:** S.
- **Files involved:** `packages/shared/features/stok/api.js:8-19`.
- **Dependencies:** None.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### M16 — Guard `createTransfer` against missing `items`
- **Why it matters:** Throws a raw `TypeError` instead of the intended friendly validation message if a caller passes `undefined`/`null` for `items`.
- **Business impact:** None today; hardening for a shared function.
- **Technical impact:** Add a null-check alongside the existing empty-array check.
- **Risk level:** Low.
- **Complexity:** S.
- **Files involved:** `packages/shared/features/transfers/api.js:77`.
- **Dependencies:** Natural to bundle with C2 since it's the same file.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### M17 — Guard `buildKode` against malformed partial input
- **Why it matters:** Only returns empty when *both* `angka` and `bahan` are missing; a single missing segment still produces a malformed code like `"D--OSK"`.
- **Business impact:** Could allow creating products with codes that don't match the documented `D-{nomor}-{kode_bahan}` format, confusing downstream matching logic.
- **Technical impact:** Require both segments non-empty before building.
- **Risk level:** Low, but audit existing product codes in the DB first to make sure no existing malformed code depends on the current lenient behavior before tightening validation.
- **Complexity:** S.
- **Files involved:** `packages/shared/lib/constants.js:14-18`.
- **Dependencies:** None (but do the existing-data check before merging).
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** Technically breaking for any caller currently relying on the lenient behavior — verified no such reliance in-app, but flag for a quick data audit.

### M18 — Catalog: server-side fetch for `useProduct(kode)`
- **Why it matters:** Currently downloads every product row just to render one shared product-detail page — the highest-friction entry point (a cold-cache mobile visitor from a WA link) pays the full catalog's data cost for one item.
- **Business impact:** Slower load on the exact page most likely to convert a shared link into a sale.
- **Technical impact:** Add `fetchProductByKode(kode)` doing `.eq("kode", kode).single()`.
- **Risk level:** Low.
- **Complexity:** M.
- **Files involved:** `packages/shared/features/products/api.js`, `hooks.js:20-24`.
- **Dependencies:** Land after C1 so it queries the correct (public-safe) data source from the start rather than being built against the exposed path and needing rework.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### M19 — Stop rendering raw Supabase error messages to catalog visitors
- **Why it matters:** `{error.message}` rendered directly can leak backend/RLS/infra details to the public (e.g. would have directly confirmed the RLS exposure finding to any curious visitor).
- **Business impact:** Minor information-disclosure hardening.
- **Technical impact:** Log the real error, show a generic Indonesian fallback message.
- **Risk level:** Low.
- **Complexity:** S.
- **Files involved:** `apps/catalog/src/features/product-catalog/components/CatalogPage.jsx:48`; `apps/catalog/src/features/product-detail/components/ProductDetailPage.jsx:21`.
- **Dependencies:** None.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### M20 — Route catalog product video through Cloudinary transforms
- **Why it matters:** Images correctly use `cldUrl()` for `f_auto,q_auto` auto-format; video uses the raw URL with no explicit `preload` strategy, risking large eager downloads on mobile market-day connections.
- **Business impact:** Bandwidth/load-time cost on mobile visitors.
- **Technical impact:** Wrap video `src` with `cldUrl()` (Cloudinary supports `f_auto,q_auto` for video); set `preload="metadata"` explicitly.
- **Risk level:** Low.
- **Complexity:** S.
- **Files involved:** `apps/catalog/src/features/product-detail/components/ProductDetailPage.jsx:124-131`.
- **Dependencies:** None.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

### M21 — Memoize catalog filter/sort; consider slide virtualization
- **Why it matters:** The product filter+sort IIFE re-runs on every render (including unrelated state changes like scroll-top toggling); every product gets a full-height DOM subtree + its own `IntersectionObserver` with no windowing.
- **Business impact:** None today at current catalog size; will matter as inventory grows.
- **Technical impact:** Wrap the filter/sort in `useMemo`; defer virtualization until catalog size actually warrants it.
- **Risk level:** Low.
- **Complexity:** M.
- **Files involved:** `apps/catalog/src/features/product-catalog/components/CatalogPage.jsx:57-71`, `CatalogSlide.jsx:30-41`.
- **Dependencies:** None.
- **Requires Supabase migration:** No.
- **Requires DB changes:** No.
- **Breaking:** No.

---

## Phase 4 — Low

All items in this phase are hardening/convention-drift fixes with no urgent business driver — batch into normal sprint work whenever convenient. Grouped, not exhaustively detailed, since none are load-bearing; expand any of these into a full task card on request before scheduling.

| ID | Task | App | Complexity | Migration? | DB change? | Breaking? | Notes |
|----|------|-----|------------|------------|-------------|-----------|-------|
| L1 | Add per-field opt-out to the global force-uppercase input hack | admin, finance | M | No | No | No | Behavioral change, needs care despite low complexity rating |
| L2 | Clean up `setTimeout` without cleanup on unmount | admin | S | No | No | No | `AdminPage.jsx:48-49,96` |
| L3 | Scope `push_subscriptions` RLS policy to `user_email = auth.email()` | admin | S | Yes | Yes (policy only) | No | Currently `USING (true)` for all authenticated users — IDOR-shaped |
| L4 | Scope `invalidateQueries` calls in gajian to the affected period instead of the whole `["gajian"]` tree | finance | S | No | No | No | Perf only |
| L5 | Design a finance-specific role/permission model | finance | XL | Depends on F0 outcome | Possibly | Possibly | Needs a product decision first — currently "authenticated or not" only, relies entirely on RLS which F0 will clarify |
| L6 | Replace `alert()` with the app's existing toast/modal pattern; split remaining oversized files | pos | S | No | No | No | `Struk.jsx:60,84`, `EditSaleModal.jsx:88,144` |
| L7 | Document the theme store's manual-`localStorage` pattern as an intentional FOUC-avoidance exception in `CLAUDE.md` | shared | S | No | No | No | Docs-only; prevents the pattern being miscopied into a new feature |
| L8 | Widen `generateTransferNo`'s collision space / add a uniqueness constraint | shared | S | Optional | Optional | No | Low risk at current transfer volume |
| L9 | Add input validation to `cldUrl()` transform options | shared | S | No | No | No | No live exploit path today; defensive hardening |
| L10 | Add CSP/security headers to the public catalog's Vercel config | catalog | S | No | No | No | `vercel.json` |
| L11 | `React.memo` `CatalogSlide`; memoize `useSoldOutSet`'s `Set` allocation | catalog | S | No | No | No | Perf only |

---

## Recommended optimal implementation order — next 30 days

Assumes roughly one senior full-stack engineer as the primary track, with room to parallelize Phase 1's finance work (C6/C7) onto a second engineer if available, since it's a fully independent domain from the stock-mutation work. Days are working days; treat this as a sequencing guide, not a committed schedule — actual pace depends on team size and how much test-writing each PR needs (this codebase's own convention mandates updated tests per change, which is included in each estimate below).

**Week 1 — Foundational + start of Critical**
- Day 1: F0 (RLS verification) — do this first, full stop; it gates C1 and de-risks every later security-adjacent decision.
- Day 1–2: F2 (ConfirmModal) — trivial, parallelizable with F0.
- Day 2–4: F1 (atomic RPC pattern) — the highest-leverage task in the roadmap; unblocks C2, C3, H6.
- Day 4–5: C5 (POS syncProducts/syncPelanggan race fix) — independent of F1, low risk, ship it while F1 is being finished/reviewed.

**Week 2 — Critical stock-mutation fixes**
- Day 1–2: C3 (POS atomic stock decrement) — now that F1 is done.
- Day 2–3: C1 (products RLS/exposure fix) — now that F0's findings are known; sequence the two-deploy rollout (cut catalog over, then revoke old policy) carefully.
- Day 3–5: C2 (approveTransfer atomicity).
- *(Parallel track, if staffed):* C6 (finance: lock down finalized payroll) — independent domain, can start Day 1.

**Week 3 — Finish Critical, start High quick wins**
- Day 1–4: C4 (POS edit-sale stock reconciliation) — the largest, highest-care task in Phase 1; give it the most room.
- Day 4–5: C7 (finance: atomic finalize) — *(parallel track continues)* or sequenced here if single-engineer.
- Day 5: Quick-win batch — H1 (AdminPage DI fix), H11 (formatHarga sign bug), H9 (catalog hero-image wiring) — all S-complexity, ship same day.

**Week 4 — High-severity cleanup**
- Day 1–2: H2 + F3 together (toISOString sweep + lint guardrail) — do these as one coordinated PR pair.
- Day 2: H7 (finance config error surfacing).
- Day 3: H4 (window.confirm sweep, now that F2 exists).
- Day 3–4: H5 (persist manual catatan field, 6 forms + migration).
- Day 4–5: H6 (kasbon race fix, now that F1 exists).
- Day 5 onward / spills past day 30: H3 (N+1 sales query fix) and H8 (POS idempotency key) — both are M/L complexity and touch sensitive paths; don't rush them into the last day of the window. Start them in week 4 and let them close out in the first days of month 2 rather than compressing the review cycle.

**Deliberately deferred past the 30-day window** (flagged, not forgotten):
- H10 (catalog OG/meta tags) — needs an infra design decision (SSG vs. edge function) before implementation; schedule a short design spike in week 4 so it's ready to start month 2.
- M1 (transactional cascades in admin) — XL scope, split into 3 PRs as noted; good month-2 first task once the team's atomic-RPC pattern (from F1) is battle-tested from Phase 1 usage.
- L5 (finance role/permission model) — blocked on product decisions informed by F0; don't start until F0's findings are reviewed with whoever owns the finance app's access requirements.
- All other Medium/Low items — batch opportunistically alongside feature work once Phase 1/2 lands; none are time-sensitive.

**The single most important sequencing rule in this plan:** don't let C1 (products exposure fix) or C4 (POS edit-sale stock reconciliation) get compressed to fit a deadline. C1 has a public-facing data-exposure dimension that deserves a deliberate two-step rollout rather than a rushed cutover, and C4 is the most complex, most business-critical logic change in the entire roadmap — the audit's whole finding was that shortcuts in exactly this kind of stock-mutation logic are what caused the current problems.
