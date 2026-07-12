# Deera Indonesia — Production-Ready Pull Request Plan

**Source:** `ROADMAP.md` (Phase 0–4 implementation roadmap, derived from `AUDIT_REPORT.md`)
**Status:** Planning only — nothing in this document has been implemented.
**Total PRs:** 82, sequenced across Phase 0 (Foundational) → Phase 4 (Low).

## Rules applied to every PR in this plan

Four hard constraints from the brief shaped how tasks were split, not just how they're described:

1. **Independently reviewable** — no PR exceeds roughly one feature file + its test, or one migration + its one caller, so a reviewer can hold the whole diff in their head. Tasks the roadmap sized L/XL are split further here (e.g. POS edit-sale reconciliation becomes 2 PRs; the six oversized-file splits each become their own PR rather than one giant refactor PR).
2. **Compiles successfully** — every migration-only PR is additive (new function/view/column, never a destructive change) and ships before anything calls it, so an unfinished feature never leaves the tree in a broken state. Every "wire it up" PR lands only after its dependency PR is merged.
3. **Deployable independently** — each PR is safe to deploy the moment it's merged, even mid-sequence. Additive migrations sit unused in production with zero behavior change until their wiring PR ships. Where a change is inherently two-sided (e.g. revoking public access to `products`), it's split into an explicit two-step rollout (cut the consumer over first, revoke access second) so each half is independently safe to deploy.
4. **Revertable independently** — pure code PRs are a clean `git revert`. Migration PRs note whether they need a compensating forward migration to fully undo (Postgres/Supabase migrations are forward-only in production; "revert" for a DB change means shipping the inverse migration, not deleting a file) — this is called out explicitly per PR rather than assumed.

**Merge-order note:** many PRs have a hard dependency on an earlier PR (e.g. you cannot wire `approveTransfer` to a new RPC before the RPC exists). Each card states its dependency. PRs with no listed dependency can be picked up by any engineer in any order, in parallel with the sequenced work.

---

## Quick-reference index

| PR | Title | Depends on | Migration | Breaking | Risk |
|----|-------|------------|-----------|----------|------|
| PR-001 | RLS policy drift audit | None | Possibly (output) | No | None |
| PR-002 | Add shared `ConfirmModal` component | None | No | No | Low |
| PR-003 | Add `adjust_stok_warna` atomic RPC | None | Yes | No | Low |
| PR-004 | Add `adjust_kasbon_sisa` atomic RPC | None | Yes | No | Low |
| PR-005 | Add shared Supabase RPC-call helper | None | No | No | Low |
| PR-006 | ESLint rule: ban `toISOString().slice/split` | None | No | No | Low |
| PR-007 | Add `products_public` view + anon policy | PR-001 | Yes | No | Low |
| PR-008 | Catalog: consume `products_public` view | PR-007 | No | No | Medium |
| PR-009 | Revoke anon `SELECT` on base `products` | PR-008 | Yes | Potentially | Medium-High |
| PR-010 | Tighten `stok_warna` anon RLS | PR-008 | Yes | Potentially | Medium |
| PR-011 | Add `approve_transfer` atomic RPC | None | Yes | No | Medium |
| PR-012 | Wire `approveTransfer()` to new RPC | PR-011 | No | No | Medium |
| PR-013 | POS: atomic stock decrement via RPC | PR-003 | No | No | Medium-High |
| PR-014 | POS: stock-delta reconciliation on sale edit | PR-013 | No | No | High |
| PR-015 | POS: stock-cap guard on edit-add-product | PR-014 | No | No | Low |
| PR-016 | POS: fix `syncProducts()` race | None | No | No | Low |
| PR-017 | POS: fix `syncPelanggan()` race | None | No | No | Low |
| PR-018 | Finance: block delete of finalized periods | None | No | No (removes broken behavior) | Low |
| PR-019 | Finance: enforce final-status in all Tab* forms | None | No | No | Medium |
| PR-020 | Finance: server-side finalize immutability | PR-018, PR-019 | Yes | No | Low |
| PR-021 | Add `finalize_gajian_with_kasbon` atomic RPC | PR-004 | Yes | No | Medium |
| PR-022 | Wire `useFinalizeGajian` to new RPC | PR-021 | No | No | Medium |
| PR-023 | admin: fix `AdminPage.jsx` DI violation | None | No | No | Low |
| PR-024 | admin: sweep `toISOString()` → `localDateStr()` | PR-006 | No | No | Low |
| PR-025 | finance: sweep `toISOString()` → `localDateStr()` | PR-006 | No | No | Low |
| PR-026 | admin: add filtered sales-by-kode query | None | Yes | No | Low |
| PR-027 | admin: wire `ProductDetailModal` to new query | PR-026 | No | No | Low |
| PR-028 | finance: replace `window.confirm` (11 sites) | PR-002 | No | No | Low |
| PR-029 | finance: add `catatan_manual` columns | None | Yes | No | Low |
| PR-030 | finance: wire `catatan_manual` into 6 forms | PR-029 | No | No | Low |
| PR-031 | finance: migrate kasbon writes to RPC | PR-004 | No | No | Medium |
| PR-032 | finance: surface `fetchFinanceConfig` errors | None | No | No | Low |
| PR-033 | pos: add `local_uuid` idempotency column | None | Yes | No | Low |
| PR-034 | pos: idempotent sale insert via upsert | PR-033 | No | No | High |
| PR-035 | pos: fix `syncSalesForRange` dedup | PR-034 | No | No | Medium |
| PR-036 | catalog: wire up hero-image LCP priority | None | No | No | Low |
| PR-037 | catalog: per-product OG/meta tags | PR-008 | No | No | Medium (scope risk) |
| PR-038 | shared: fix `formatHarga` sign bug | None | No | No | Low |
| PR-039 | admin: transactional cascade RPC — `produk` | None | Yes | No | Medium |
| PR-040 | admin: transactional cascade RPC — `produksi-record` | None | Yes | No | Medium |
| PR-041 | admin: transactional cascade RPC — `produksi-hpp`/`bahan` | None | Yes | No | Medium |
| PR-042 | admin: fix stok-opname stale-snapshot overwrite | None | No | No | Low |
| PR-043…048 | admin: split 6 oversized files (family) | None | No | No | Low |
| PR-049 | admin: remove `dangerouslySetInnerHTML` | None | No | No | Low |
| PR-050 | admin: paginate audit history | None | No | No | Low |
| PR-051 | finance: extract duplicated deduction calc | None | No | No | Low |
| PR-052…057 | finance: split 6 oversized `gajian` files (family) | None | No | No | Low |
| PR-058 | finance: atomic tariff save | None | No | No | Low |
| PR-059 | finance: optimize pettycash/dashboard queries | None | No | No | Low |
| PR-060 | finance: warn on dropped manual tambahan | None | No | No | Low |
| PR-061 | pos: `Struk.jsx` → Zustand store | None | No | No | Low |
| PR-062 | pos: prune unbounded `_deletedIds` | None | No | No | Low |
| PR-063 | pos: split `LaporanKeuangan.jsx` | None | No | No | Low |
| PR-064 | pos: memoize `ProductList` derivations | None | No | No | Low |
| PR-065 | shared: validate `location` input | None | No | No | Low |
| PR-066 | shared: guard `createTransfer` null items | None | No | No | Low |
| PR-067 | shared: guard `buildKode` partial input | None | No | Potentially | Low |
| PR-068 | catalog: `fetchProductByKode` server query | PR-008 | No | No | Low |
| PR-069 | catalog: generic error fallback | None | No | No | Low |
| PR-070 | catalog: video through Cloudinary transform | None | No | No | Low |
| PR-071 | catalog: memoize filter/sort | None | No | No | Low |
| PR-072…082 | Phase 4 — Low (see table at end) | Varies | Mostly No | No | Low |

---

## Phase 0 — Foundational

### PR-001 — RLS policy drift audit
- **Objective:** Determine whether the live Supabase project's RLS policies on `products` and `stok_warna` match what's checked into `supabase/migrations/`, since the audit found the checked-in migrations only grant `products` SELECT to `authenticated`, yet the public catalog app reads it successfully.
- **Depends on:** None.
- **Files expected to change:** None in application code; output is a report plus, if drift is found, a new `supabase/migrations/*.sql` file that codifies the actual live policy (making git truthful again).
- **Database migration required:** Possibly, as an output artifact — not to change behavior, only to document current reality.
- **Breaking change:** No.
- **Estimated review time:** 15 min (review the findings + any codifying migration).
- **Estimated implementation time:** 2–4 hours.
- **Risk:** None — read-only against production.
- **Testing checklist:**
  - [ ] `SELECT policyname, roles, cmd, qual FROM pg_policies WHERE tablename IN ('products','stok_warna')` run against production and captured verbatim.
  - [ ] Diffed line-by-line against every migration file touching those two tables.
  - [ ] Findings written up and shared before PR-007/PR-008 start.
- **Rollback strategy:** N/A (no behavior change). If a codifying migration is included, it's descriptive-only and safe to leave in place.

### PR-002 — Add shared `ConfirmModal` component
- **Objective:** Add one reusable, tested confirm-dialog component to `packages/shared/components/`, to replace `window.confirm()` usage across the codebase (11 sites in finance alone) and give every future feature a ready-made non-native confirm dialog.
- **Depends on:** None.
- **Files expected to change:** New `packages/shared/components/ConfirmModal.jsx` + `ConfirmModal.test.jsx`.
- **Database migration required:** No.
- **Breaking change:** No.
- **Estimated review time:** 20–30 min.
- **Estimated implementation time:** 3–4 hours.
- **Risk:** Low — net-new component, nothing depends on it yet, zero blast radius.
- **Testing checklist:**
  - [ ] Unit tests: renders, confirm/cancel callbacks fire correctly, closes on backdrop click and Escape.
  - [ ] Visual check against the existing full-screen-mobile modal pattern documented in `CLAUDE.md`.
  - [ ] No existing component imports it yet — confirm it doesn't affect any current bundle/behavior.
- **Rollback strategy:** `git revert` — nothing references the component yet, zero risk.

### PR-003 — Add `adjust_stok_warna` atomic RPC
- **Objective:** Add a Postgres function that atomically increments/decrements one `stok_warna` location column (`UPDATE ... SET col = col + delta WHERE ... AND col + delta >= 0 RETURNING *`, raising on a 0-row result), to replace every client-side read-then-write stock mutation in the codebase.
- **Depends on:** None.
- **Files expected to change:** New `supabase/migrations/*.sql`.
- **Database migration required:** Yes — new `SECURITY DEFINER` function, no schema change.
- **Breaking change:** No.
- **Estimated review time:** 20–30 min (SQL correctness, especially the negative-stock guard and error behavior).
- **Estimated implementation time:** 3–5 hours including a small SQL test harness (call it manually via `SELECT adjust_stok_warna(...)` in a scratch script and verify guard behavior).
- **Risk:** Low — additive, unused until PR-012/PR-013 wire it in.
- **Testing checklist:**
  - [ ] Manually invoke against a scratch row: positive delta increments correctly.
  - [ ] Negative delta that would go below zero raises an exception, doesn't silently clamp.
  - [ ] Concurrent-call simulation (two `SELECT adjust_stok_warna` in overlapping transactions) confirms serialized, correct final value.
- **Rollback strategy:** Ship a `DROP FUNCTION adjust_stok_warna` migration. Safe at any point before PR-012/PR-013 merge since nothing calls it yet.

### PR-004 — Add `adjust_kasbon_sisa` atomic RPC
- **Objective:** Same pattern as PR-003, scoped to `kasbon.sisa`/`jumlah`/`cicilan` adjustments, to fix the debt-ledger race condition.
- **Depends on:** None (can be built in parallel with PR-003 by a second engineer).
- **Files expected to change:** New `supabase/migrations/*.sql`.
- **Database migration required:** Yes.
- **Breaking change:** No.
- **Estimated review time:** 20–30 min.
- **Estimated implementation time:** 3–5 hours.
- **Risk:** Low — additive, unused until PR-021/PR-031 wire it in.
- **Testing checklist:**
  - [ ] Manually invoke: `sisa` decrements correctly and cannot go negative.
  - [ ] Concurrent-call simulation confirms no lost update.
  - [ ] Confirm the function signature covers all 4 current call sites' needs (create/accumulate, update jumlah, pay cicilan, apply gajian deduction).
- **Rollback strategy:** `DROP FUNCTION` migration; safe pre-wiring.

### PR-005 — Add shared Supabase RPC-call helper
- **Objective:** Add a small `packages/shared/lib/rpc.js` wrapper standardizing how `supabase.rpc(...)` is called and its errors surfaced, so every RPC consumer (PR-012, PR-013, PR-022, PR-031, etc.) uses one consistent pattern instead of ad hoc `.rpc()` calls scattered per feature.
- **Depends on:** None (can land before or after PR-003/PR-004 — doesn't reference them directly, just wraps the generic call shape).
- **Files expected to change:** New `packages/shared/lib/rpc.js` + test.
- **Database migration required:** No.
- **Breaking change:** No.
- **Estimated review time:** 15 min.
- **Estimated implementation time:** 1–2 hours.
- **Risk:** Low — unused until later PRs adopt it.
- **Testing checklist:**
  - [ ] Unit test: successful call resolves with `data`.
  - [ ] Unit test: RPC error is thrown (not swallowed) with a readable message.
- **Rollback strategy:** `git revert` — zero callers until later PRs land.

### PR-006 — ESLint rule: ban `toISOString().slice/split`
- **Objective:** Add a lint rule flagging `.toISOString()` immediately followed by `.slice(...)`/`.split(...)` on a locally-constructed `Date`, to prevent the UTC-vs-WIB local-date bug from being reintroduced after PR-024/PR-025 fix the existing 15+ instances.
- **Depends on:** None (can land before the sweep; the rule will simply flag existing violations, which PR-024/PR-025 then clean up).
- **Files expected to change:** `eslint.config.js`.
- **Database migration required:** No.
- **Breaking change:** No.
- **Estimated review time:** 15 min.
- **Estimated implementation time:** 1–2 hours (rule authoring + confirming it doesn't false-positive on legitimate full-timestamp `toISOString()` usage like `updated_at`).
- **Risk:** Low — lint-only, doesn't touch runtime code. CI will start failing on existing violations until PR-024/PR-025 land; land this rule as a non-blocking warning first, then flip to error once the sweeps merge, or land it in the same window as the sweeps to avoid a red-CI gap.
- **Testing checklist:**
  - [ ] Rule fires on `new Date().toISOString().slice(0,10)`.
  - [ ] Rule does NOT fire on `someTimestamp.toISOString()` used as a full timestamp with no `.slice/.split`.
  - [ ] Run against the full repo once and confirm the hit list matches the audit's known 15+ call sites (no more, no fewer, unexpectedly).
- **Rollback strategy:** `git revert` the ESLint config change.

---

## Phase 1 — Critical

### PR-007 — Add `products_public` view + anon SELECT policy
- **Objective:** Create a `products_public` Postgres view excluding `hpp` and any other internal-only column, with an explicit `anon` SELECT policy, as the safe replacement data source for the public catalog.
- **Depends on:** PR-001 (must know the current live state before adding a new policy on top of unknown drift).
- **Files expected to change:** New `supabase/migrations/*.sql`.
- **Database migration required:** Yes — new view + RLS policy.
- **Breaking change:** No — purely additive, nothing consumes it yet.
- **Estimated review time:** 20–30 min (verify the column exclusion list is complete and matches the schema in `CLAUDE.md §6`).
- **Estimated implementation time:** 3–5 hours.
- **Risk:** Low in isolation — the risk is entirely in PR-008/PR-009's consumption and cutover, not in adding an unused view.
- **Testing checklist:**
  - [ ] `SELECT * FROM products_public` as the `anon` role returns rows and excludes `hpp`.
  - [ ] Confirm every column the catalog UI actually renders (`kode`, `nama`, `bahan`, `image`, `video`, `detail`, `variants`, `warna`, `position`) is present in the view.
  - [ ] Confirm `id` is excluded or scoped appropriately if it's considered internal.
- **Rollback strategy:** `DROP VIEW products_public` migration; safe since nothing references it until PR-008 merges.

### PR-008 — Catalog: consume `products_public` view
- **Objective:** Point `apps/catalog`'s product fetch at the new `products_public` view instead of the shared, admin-oriented `select("*")` on `products`.
- **Depends on:** PR-007.
- **Files expected to change:** New `apps/catalog/src/features/product-catalog/api.js` (local fetcher, keeping `packages/shared/features/products/api.js` untouched so admin/pos are unaffected); `apps/catalog/src/features/product-catalog/queries.js`, `hooks.js`; `apps/catalog/src/features/product-detail/` equivalents.
- **Database migration required:** No (consumes PR-007's view).
- **Breaking change:** No — the base `products` table's anon policy is untouched in this PR, so even if this cutover has a bug, the old path still technically works as a fallback during the deploy window.
- **Estimated review time:** 45–60 min (verify no `hpp`/internal field leaks through anywhere in the new fetch path, including error payloads).
- **Estimated implementation time:** 0.5–1 day.
- **Risk:** Medium — public-facing app, needs a full smoke test against the live catalog before and after deploy.
- **Testing checklist:**
  - [ ] Full catalog page loads with correct product data (image, price, variants) via the new view.
  - [ ] Product detail page (`/code/:kode`) loads correctly.
  - [ ] Network tab inspection confirms `hpp` is absent from every catalog-app API response.
  - [ ] Sold-out badge logic (via `get_sold_out_kodes()` RPC, unaffected by this change) still works.
  - [ ] Existing catalog test suite passes unchanged in behavior (update mocks to match the new fetcher, not the underlying UI expectations).
- **Rollback strategy:** `git revert` — the base `products` anon policy is still intact at this point (PR-009 hasn't run), so reverting simply switches the catalog back to its previous (already-working) fetch path with no data-loss risk.

### PR-009 — Revoke anon `SELECT` on base `products` table
- **Objective:** Once PR-008 is deployed and verified stable in production, remove the (confirmed-via-PR-001) anon access to the base `products` table, so `hpp` and other internal fields are no longer reachable by any public client regardless of which app's code runs.
- **Depends on:** PR-008 (must be live and verified first — this is the second half of a deliberate two-step rollout, not to be merged same-day as PR-008).
- **Files expected to change:** New `supabase/migrations/*.sql`.
- **Database migration required:** Yes.
- **Breaking change:** Potentially — if any other undiscovered consumer relies on anon access to the base table, this breaks it. This is exactly why PR-001's audit and a monitored soak period after PR-008 matter.
- **Estimated review time:** 15–20 min (the SQL itself is trivial; the review is really "has PR-008 been stable in production long enough").
- **Estimated implementation time:** 1 hour, plus a mandatory soak period (recommend minimum 48–72 hours of PR-008 running clean in production before this merges).
- **Risk:** Medium-High — this is the one PR in the whole plan where the risk isn't in the code, it's in timing. Do not merge same day as PR-008.
- **Testing checklist:**
  - [ ] Confirm PR-008 has been live in production for the agreed soak period with no catalog errors reported.
  - [ ] Confirm (via PR-001's findings, re-verified) no other anon consumer of `products` exists.
  - [ ] Post-deploy: catalog still loads correctly (proving it's fully on `products_public`); direct `curl` against the anon REST endpoint for `products` returns a permission-denied error.
- **Rollback strategy:** Ship a compensating migration re-adding the `TO anon` grant. Keep this rollback migration pre-written and ready before merging this PR, so re-enabling access is a one-command action if the catalog breaks unexpectedly.

### PR-010 — Tighten `stok_warna` anon RLS
- **Objective:** Remove direct anon `SELECT` access to `stok_warna` (currently `TO anon, authenticated`), relying exclusively on the existing `get_sold_out_kodes()` `SECURITY DEFINER` RPC — which was originally built specifically so the catalog wouldn't need full-table access.
- **Depends on:** PR-008 (confirm the catalog only ever calls the RPC, never reads `stok_warna` directly, before revoking).
- **Files expected to change:** New `supabase/migrations/*.sql`.
- **Database migration required:** Yes.
- **Breaking change:** Potentially, same caveat as PR-009 — verify no direct anon reader exists first.
- **Estimated review time:** 15–20 min.
- **Estimated implementation time:** 2–3 hours, plus a grep-verification pass across all 4 apps for any direct `stok_warna` anon read.
- **Risk:** Medium.
- **Testing checklist:**
  - [ ] Grep confirms zero direct `stok_warna` reads from `apps/catalog`.
  - [ ] Catalog sold-out badges still render correctly post-deploy (via the RPC).
  - [ ] Direct `curl` against the anon REST endpoint for `stok_warna` returns permission-denied.
- **Rollback strategy:** Compensating migration re-adding `TO anon` grant, pre-written before merge.

### PR-011 — Add `approve_transfer` atomic RPC
- **Objective:** Add a Postgres function that performs the entire transfer-approval stock movement (all items) plus the `status → 'approved'` flip inside one transaction, replacing the current per-item read-modify-write loop plus premature status flip.
- **Depends on:** None (can be developed independently of PR-003, though it's the same pattern — reuse `adjust_stok_warna` internally if PR-003 is already merged, otherwise inline the equivalent logic).
- **Files expected to change:** New `supabase/migrations/*.sql`.
- **Database migration required:** Yes.
- **Breaking change:** No — additive, unused until PR-012.
- **Estimated review time:** 45–60 min — this is the most complex single piece of SQL in the plan; review the insufficient-stock error path carefully (must hard-error, not clamp to zero, unlike current behavior).
- **Estimated implementation time:** 1–1.5 days including a thorough SQL test pass.
- **Risk:** Medium — correctness-critical, but isolated (unused) until wired in.
- **Testing checklist:**
  - [ ] Happy path: multi-item transfer approves and moves stock atomically.
  - [ ] Insufficient-stock item raises an exception and the entire transaction rolls back (status stays `pending`, no partial stock movement).
  - [ ] Concurrent-approval simulation on overlapping `kode+size+warna` rows confirms no lost update.
- **Rollback strategy:** `DROP FUNCTION` migration; safe pre-wiring.

### PR-012 — Wire `approveTransfer()` to new RPC
- **Objective:** Replace the per-item read-modify-write loop and early status-flip in `packages/shared/features/transfers/api.js` with a single call to `approve_transfer(transfer_id)`.
- **Depends on:** PR-011.
- **Files expected to change:** `packages/shared/features/transfers/api.js:113-186`, `transfers/api.test.js`.
- **Database migration required:** No.
- **Breaking change:** No — same external function signature; internal implementation only.
- **Estimated review time:** 30–45 min.
- **Estimated implementation time:** 0.5–1 day.
- **Risk:** Medium — shared package, consumed by `apps/admin`'s transfer feature; needs regression testing against existing transfer-approval test coverage.
- **Testing checklist:**
  - [ ] Existing `transfers/api.test.js` suite updated and passing.
  - [ ] Manual approval flow in `apps/admin` end-to-end (approve a real pending transfer in a staging environment).
  - [ ] Insufficient-stock case now surfaces a clear error in the UI instead of silently clamping.
- **Rollback strategy:** `git revert` — the RPC (PR-011) stays deployed unused; no data risk since the previous client-side implementation resumes exactly as before.

### PR-013 — POS: atomic stock decrement via RPC
- **Objective:** Replace `applyStokToSupabase`'s select-then-update with a call to `adjust_stok_warna`, fixing the cross-device oversell race on the most frequent stock-mutating operation in the system.
- **Depends on:** PR-003.
- **Files expected to change:** `apps/pos/src/lib/sync.js:63-88`, `sync.test.js`.
- **Database migration required:** No.
- **Breaking change:** No — same function signature/contract for callers.
- **Estimated review time:** 45–60 min — core critical path, review the error-handling behavior when the RPC raises (insufficient stock) to confirm the caller's existing "server succeeds before local write" contract still holds.
- **Estimated implementation time:** 1 day.
- **Risk:** Medium-High — most business-critical single write path in the codebase; extend, don't replace, the existing 44-test `sync.js` suite.
- **Testing checklist:**
  - [ ] All existing `sync.js` tests pass with the new implementation.
  - [ ] New test: concurrent decrement simulation confirms no lost update (mirrors PR-003's DB-level test, verified again at the client-call layer).
  - [ ] New test: insufficient-stock RPC error propagates correctly and the sale creation flow surfaces it (doesn't silently proceed as if stock succeeded).
  - [ ] Manual test: create a sale in a staging POS session, confirm stock decrements correctly in `stok_warna`.
- **Rollback strategy:** `git revert` — reverts to the previous (buggy but functional) select-then-update; the RPC stays deployed unused.

### PR-014 — POS: stock-delta reconciliation on sale edit
- **Objective:** Fix `useUpdateSale` to diff old vs. new `items` per (kode,size,warna) and apply the resulting delta via the now-atomic stock-adjustment path (PR-013), persisting the new cumulative `stok_adjustments` onto the sale row so a later delete reverses correctly.
- **Depends on:** PR-013 (build this on top of the already-fixed atomic decrement, not the old racy one).
- **Files expected to change:** `apps/pos/src/features/penjualan/hooks.js:273-344`, `penjualan/hooks.test.js`.
- **Database migration required:** No.
- **Breaking change:** No — fixes existing broken behavior; no API shape change to callers.
- **Estimated review time:** 90–120 min — the highest-stakes single logic change in this entire plan; walk through the diff algorithm line by line with a reviewer, including the interaction with `useDeleteSale`'s reversal logic.
- **Estimated implementation time:** 2–3 days.
- **Risk:** High — core inventory-correctness logic; do not compress this PR's timeline or review to hit a deadline.
- **Testing checklist:**
  - [ ] Edit increasing one item's qty: stock decrements by the delta only.
  - [ ] Edit decreasing one item's qty: stock credits back by the delta only.
  - [ ] Edit removing an item entirely: stock fully credited back.
  - [ ] Edit adding a brand-new product/size/warna: stock decrements correctly, respects available stock.
  - [ ] Edit mixing all of the above in one save: net deltas per (kode,size,warna) are correct, no double-application.
  - [ ] Delete a previously-edited sale: stock reverses using the updated cumulative `stok_adjustments`, not the original creation-time snapshot.
  - [ ] Offline edit (server write fails): local state does not silently diverge — matches the file's documented server-first write-ordering contract.
- **Rollback strategy:** `git revert`. Note: any sales edited while this PR was live will have correct `stok_adjustments` recorded; reverting doesn't corrupt those records, it only stops future edits from reconciling correctly. No data migration needed to roll back.

### PR-015 — POS: stock-cap guard on edit-add-product
- **Objective:** Add a `Math.min(availableStock, ...)` cap to the "+Tambah Produk" quantity stepper in `EditSaleModal`, matching the guard `WarnaPanel` already has, so an edit can't add more of a product than is actually in stock.
- **Depends on:** PR-014 (this is a UI hardening layer on top of the now-correct reconciliation logic; low value without it).
- **Files expected to change:** `apps/pos/src/features/laporan/components/EditSaleModal.jsx`.
- **Database migration required:** No.
- **Breaking change:** No.
- **Estimated review time:** 15–20 min.
- **Estimated implementation time:** 2–4 hours.
- **Risk:** Low.
- **Testing checklist:**
  - [ ] Adding a product respects available stock, stepper caps at max.
  - [ ] Attempting to exceed stock via direct input (not just the stepper buttons) is also clamped.
- **Rollback strategy:** `git revert`.

### PR-016 — POS: fix `syncProducts()` race
- **Objective:** Wrap `syncProducts()`'s `clear()`+`bulkPut()` in `db.transaction("rw", db.products, ...)` and add a promise-lock identical to `_syncStokPromise`, closing the race that can make the entire product catalog vanish from the cashier's screen mid-session.
- **Depends on:** None.
- **Files expected to change:** `apps/pos/src/lib/sync.js:6-21`, `sync.test.js`.
- **Database migration required:** No.
- **Breaking change:** No.
- **Estimated review time:** 20–30 min — mechanical, mirrors the already-proven `syncStok()` pattern in the same file.
- **Estimated implementation time:** 3–4 hours.
- **Risk:** Low.
- **Testing checklist:**
  - [ ] Concurrent `syncProducts()` calls (simulate `App.jsx`'s and `useProducts.js`'s both firing) resolve without a window where `db.products` is empty.
  - [ ] Existing product-loading tests pass.
- **Rollback strategy:** `git revert`.

### PR-017 — POS: fix `syncPelanggan()` race
- **Objective:** Same fix as PR-016, applied to `syncPelanggan()`, closing the race that can create duplicate customer records at checkout.
- **Depends on:** None (independent table from PR-016; can be done by a different engineer in parallel, or combined into one PR if reviewed together — kept separate here so each is independently revertable without touching the other table's fix).
- **Files expected to change:** `apps/pos/src/lib/sync.js:275-289`, `sync.test.js`.
- **Database migration required:** No.
- **Breaking change:** No.
- **Estimated review time:** 20–30 min.
- **Estimated implementation time:** 3–4 hours.
- **Risk:** Low.
- **Testing checklist:**
  - [ ] Concurrent `syncPelanggan()` + `searchPelanggan()` mid-checkout simulation confirms no window where an existing customer isn't found.
  - [ ] Existing pelanggan tests pass.
- **Rollback strategy:** `git revert`.

### PR-018 — Finance: block delete of finalized periods
- **Objective:** Disallow deleting a `gajian` period once `status === "final"`, both in the confirm-dialog gating and in `api.js`'s `deleteGajianPeriode`, preventing the currently-possible orphaning of kasbon deductions.
- **Depends on:** None.
- **Files expected to change:** `apps/finance/src/features/gajian/pages/GajianListPage.jsx:25-39`, `api.js:48-54`.
- **Database migration required:** No (client-side guard; server-side enforcement is PR-020).
- **Breaking change:** No — removes a currently-broken capability; no legitimate workflow depends on deleting a final period.
- **Estimated review time:** 20 min.
- **Estimated implementation time:** 3–4 hours.
- **Risk:** Low.
- **Testing checklist:**
  - [ ] Attempting to delete a `status: "final"` period is blocked in the UI with a clear message.
  - [ ] Deleting a `status: "draft"`/non-final period still works exactly as before.
  - [ ] Direct API call to `deleteGajianPeriode` with a final period's id rejects with an error.
- **Rollback strategy:** `git revert` — restores the (broken) prior ability to delete final periods; no data migration needed.

### PR-019 — Finance: enforce final-status in all Tab* forms
- **Objective:** Thread `gajian.status` into all six `Tab*` components (`TabPotong`, `TabJahit`, `TabFinishing`, `TabQC`, `TabKreatif`, `TabCmt`) and disable add/edit/delete when the period is final, matching the two tabs (`TabRingkasan`, and the share card) that already do this correctly.
- **Depends on:** None (independent of PR-018, same feature area — can land in either order or the same week).
- **Files expected to change:** `GajianDetailPage.jsx` (prop threading), all 6 `Tab*.jsx` files, corresponding `api.js` mutation functions (add a status check server-side-visible guard, not just UI disable).
- **Database migration required:** No.
- **Breaking change:** No.
- **Estimated review time:** 45–60 min (6 files, same pattern repeated — review the pattern once carefully, then confirm consistent application across the rest).
- **Estimated implementation time:** 1 day.
- **Risk:** Medium — touches 6 files in the highest-risk feature in the app; needs a full regression pass on each team's entry form.
- **Testing checklist:**
  - [ ] Each of the 6 tabs: add/edit/delete disabled when `gajian.status === "final"`.
  - [ ] Each of the 6 tabs: add/edit/delete still works normally when not final.
  - [ ] `api.js` mutation functions reject a write attempt against a final period even if called directly (defense in depth ahead of PR-020's server-side enforcement).
- **Rollback strategy:** `git revert`.

### PR-020 — Finance: server-side finalize immutability
- **Objective:** Add an RLS policy or trigger enforcing that `gaji_*` table writes are rejected when the parent `gajian` period's status is `"final"`, so the guarantee from PR-018/PR-019 doesn't rely solely on client-side checks.
- **Depends on:** PR-018, PR-019 (land the client-side guards first and verify them in staging before adding the stricter server-side enforcement, so a bug in the trigger doesn't block legitimate writes with no client-side explanation).
- **Files expected to change:** New `supabase/migrations/*.sql`.
- **Database migration required:** Yes.
- **Breaking change:** No, assuming PR-018/PR-019 are already preventing the same writes client-side — this should be a no-op in practice, purely a safety net.
- **Estimated review time:** 30–45 min.
- **Estimated implementation time:** 0.5–1 day.
- **Risk:** Low — defense-in-depth layer on top of already-shipped client guards.
- **Testing checklist:**
  - [ ] Direct SQL/API write attempt (bypassing the client) against a final period's `gaji_*` tables is rejected.
  - [ ] Normal (non-final) writes are unaffected.
  - [ ] Confirm the trigger/policy doesn't degrade write performance materially (it's on a low-volume table, but verify).
- **Rollback strategy:** Compensating migration dropping the trigger/policy; client-side guards (PR-018/PR-019) remain as the safety net.

### PR-021 — Add `finalize_gajian_with_kasbon` atomic RPC
- **Objective:** Add a Postgres function combining the finalize (`status → 'final'` + total writes) and all kasbon deductions for that period into one transaction, so a mid-operation failure can no longer leave a period locked-final with only partial deductions applied.
- **Depends on:** PR-004 (reuses the `adjust_kasbon_sisa` logic internally, or an equivalent inline transaction).
- **Files expected to change:** New `supabase/migrations/*.sql`.
- **Database migration required:** Yes.
- **Breaking change:** No — additive, unused until PR-022.
- **Estimated review time:** 60–90 min — second most complex SQL in the plan after PR-011; review the multi-kasbon-row loop-inside-transaction carefully.
- **Estimated implementation time:** 1.5–2 days.
- **Risk:** Medium — isolated until wired in.
- **Testing checklist:**
  - [ ] Happy path: period with 3+ employees each with kasbon deductions finalizes correctly, all `sisa` values update atomically.
  - [ ] Simulated mid-transaction failure (e.g. one kasbon row locked by another session): entire finalize rolls back, period stays non-final, no partial deduction applied.
  - [ ] Idempotency check: calling the RPC twice on an already-final period is rejected cleanly, not double-applied.
- **Rollback strategy:** `DROP FUNCTION` migration; safe pre-wiring.

### PR-022 — Wire `useFinalizeGajian` to new RPC
- **Objective:** Replace the current finalize-then-sequential-loop in `useFinalizeGajian` with a single call to `finalize_gajian_with_kasbon`.
- **Depends on:** PR-021.
- **Files expected to change:** `apps/finance/src/features/gajian/hooks.js:90-106`, `hooks.test.js`.
- **Database migration required:** No.
- **Breaking change:** No — same trigger point (the "Finalisasi" button), different internal implementation.
- **Estimated review time:** 45 min.
- **Estimated implementation time:** 0.5–1 day.
- **Risk:** Medium — payroll-critical path; test against multi-employee, multi-kasbon-row periods in staging before merging.
- **Testing checklist:**
  - [ ] Finalize a real multi-employee staging period end-to-end; totals and kasbon deductions all correct.
  - [ ] Simulated network failure during finalize no longer leaves a partially-final, partially-deducted state (verify against PR-021's rollback test, now exercised through the actual UI flow).
  - [ ] Existing `hooks.test.js` suite updated and passing.
- **Rollback strategy:** `git revert` — reverts to the previous sequential-loop implementation; RPC stays deployed unused.

---

## Phase 2 — High

### PR-023 — admin: fix `AdminPage.jsx` DI violation
- **Objective:** Move the direct `supabase` import and Realtime `transfers` subscription out of `AdminPage.jsx` into `features/produk/hooks.js` (`useTransferNotifications()`), backed by a small `api.js`/`queries.js` addition — the one dependency-inversion violation found in the admin app.
- **Depends on:** None.
- **Files expected to change:** `apps/admin/src/features/produk/components/AdminPage.jsx:4,39-57`, new additions to `features/produk/api.js`, `queries.js`, `hooks.js`.
- **Database migration required:** No.
- **Breaking change:** No.
- **Estimated review time:** 20 min.
- **Estimated implementation time:** 3–4 hours.
- **Risk:** Low.
- **Testing checklist:**
  - [ ] Realtime transfer notification still fires correctly on a new pending transfer.
  - [ ] `AdminPage.jsx` no longer imports `supabase` directly (verify via grep).
- **Rollback strategy:** `git revert`.

### PR-024 — admin: sweep `toISOString()` → `localDateStr()`
- **Objective:** Replace every local-date-derivation use of `.toISOString().slice/split` with the existing `localDateStr()` helper across `apps/admin`, fixing the UTC-vs-WIB off-by-one bug at all 9 identified call sites.
- **Depends on:** PR-006 (land the lint rule alongside or just before this sweep so CI immediately confirms completeness).
- **Files expected to change:** `apps/admin/src/features/produksi-bahan/components/BahanForm.jsx:13`, `PembelianBulkForm.jsx:9`, `PinjamBulkForm.jsx:15`; `apps/admin/src/features/produksi-record/components/BatchForm.jsx:34`, `utils.js:20`; `apps/admin/src/features/produksi-sampel/components/SampelForm.jsx:209,221`, `utils.js:29`; `apps/admin/src/features/history/utils.js:136,141,146`; `apps/admin/src/features/transfer/components/TransferPage.jsx:40,45,49`.
- **Database migration required:** No.
- **Breaking change:** No.
- **Estimated review time:** 30–45 min (many files, but each change is a one-line mechanical swap — review for completeness via the PR-006 lint output rather than manually re-deriving each site).
- **Estimated implementation time:** 0.5 day.
- **Risk:** Low.
- **Testing checklist:**
  - [ ] PR-006's lint rule reports zero remaining violations in `apps/admin` after this PR.
  - [ ] Manual test around local midnight (or mocked system clock) confirms batch/sample numbers and date filters now use the correct local day.
  - [ ] Existing date-dependent tests in the affected files updated and passing.
- **Rollback strategy:** `git revert` — reintroduces the known bug, but no data corruption risk (this is a display/generation-time bug, not a persisted-data bug).

### PR-025 — finance: sweep `toISOString()` → `localDateStr()`
- **Objective:** Same fix as PR-024, applied to `apps/finance`'s 6 identified call sites.
- **Depends on:** PR-006 (same reasoning as PR-024; kept as a separate PR from PR-024 since it's a different app/reviewer and independently revertable).
- **Files expected to change:** `apps/finance/src/shared/lib/format.js:37-52` (`getSabtu`/`getSenin`), `apps/finance/src/features/gajian/hooks.js:101`, `dashboard/hooks.js:22`, `pettycash/components/PettycashForm.jsx:11`, `gajian/components/CicilanModal.jsx:9`, `kasbon/components/KasbonForm.jsx:14`.
- **Database migration required:** No.
- **Breaking change:** No.
- **Estimated review time:** 30 min.
- **Estimated implementation time:** 0.5 day.
- **Risk:** Low.
- **Testing checklist:**
  - [ ] PR-006's lint rule reports zero remaining violations in `apps/finance` after this PR.
  - [ ] `getSabtu()`/`getSenin()` unit-tested against a mocked early-morning WIB clock to confirm correct day selection.
  - [ ] Dashboard's "this month" petty-cash stat verified correct during the first week of a month (mocked clock).
- **Rollback strategy:** `git revert`.

### PR-026 — admin: add filtered sales-by-kode query
- **Objective:** Add a server-side filtered query or view/RPC (following the existing `v_stok_bahan` pattern) so fetching a product's sold quantity doesn't require pulling up to 10,000 rows of the entire `sales` table client-side.
- **Depends on:** None.
- **Files expected to change:** New `supabase/migrations/*.sql` (view/RPC + optional index on `sales.items` for `jsonb` containment).
- **Database migration required:** Yes.
- **Breaking change:** No — additive, unused until PR-027.
- **Estimated review time:** 30–45 min.
- **Estimated implementation time:** 0.5–1 day.
- **Risk:** Low.
- **Testing checklist:**
  - [ ] New query/RPC returns correct aggregated sold-quantity for a known test `kode`, verified against the old client-side-filtered result for parity.
  - [ ] Query performance verified with `EXPLAIN ANALYZE` against current `sales` table size.
- **Rollback strategy:** `DROP` migration; safe pre-wiring.

### PR-027 — admin: wire `ProductDetailModal` to new query
- **Objective:** Replace `fetchSalesByKode`'s `.limit(10000)` client-side-filter implementation with a call to PR-026's new server-side query.
- **Depends on:** PR-026.
- **Files expected to change:** `apps/admin/src/features/produk/api.js:51-80`, `components/ProductDetailModal.jsx:13,25`.
- **Database migration required:** No.
- **Breaking change:** No.
- **Estimated review time:** 15–20 min.
- **Estimated implementation time:** 2–4 hours.
- **Risk:** Low.
- **Testing checklist:**
  - [ ] Product detail modal shows the same sold-quantity figure as before the change, for several test products.
  - [ ] Modal open latency measurably improved (spot-check in staging with realistic sales volume).
- **Rollback strategy:** `git revert`.

### PR-028 — finance: replace `window.confirm` (11 sites)
- **Objective:** Swap all 11 `window.confirm()` calls in `apps/finance` for the `ConfirmModal` component from PR-002.
- **Depends on:** PR-002.
- **Files expected to change:** `apps/finance/src/features/pettycash/components/PettycashPage.jsx:26`, `kasbon/components/KasbonPage.jsx:26`, `pengaturan/components/PengaturanPage.jsx:51`, `gajian/pages/GajianListPage.jsx:29`, `gajian/components/TabCmt.jsx:17`, `TabFinishing.jsx:16`, `TabJahit.jsx:22`, `TabKreatif.jsx:26`, `TabPotong.jsx:18`, `TabQC.jsx:16`, `TabRingkasan.jsx:62`.
- **Database migration required:** No.
- **Breaking change:** No.
- **Estimated review time:** 45 min (11 sites, same swap pattern each time).
- **Estimated implementation time:** 1 day.
- **Risk:** Low.
- **Testing checklist:**
  - [ ] Each of the 11 confirm flows still gates the correct action and correctly cancels.
  - [ ] No native browser `confirm()` dialog appears anywhere in `apps/finance` (grep confirms zero remaining `window.confirm` usage).
- **Rollback strategy:** `git revert`.

### PR-029 — finance: add `catatan_manual` columns
- **Objective:** Add a nullable `catatan_manual` text column to each of the 6 `gaji_*` tables, so the manual-wage-override justification field (currently captured in the UI but discarded) has somewhere to persist.
- **Depends on:** None.
- **Files expected to change:** New `supabase/migrations/*.sql`.
- **Database migration required:** Yes — 6 `ALTER TABLE ... ADD COLUMN` statements.
- **Breaking change:** No — additive, nullable column.
- **Estimated review time:** 15 min.
- **Estimated implementation time:** 2–3 hours.
- **Risk:** Low.
- **Testing checklist:**
  - [ ] Migration applies cleanly against a staging copy of the DB.
  - [ ] Column is nullable and doesn't break any existing insert/update that doesn't supply it.
- **Rollback strategy:** Compensating `ALTER TABLE ... DROP COLUMN` migration; safe since no code writes to it until PR-030.

### PR-030 — finance: wire `catatan_manual` into 6 forms
- **Objective:** Include the already-captured `manualCatatan` field in each of the 6 wage forms' submit payloads, so the justification a user types is actually saved.
- **Depends on:** PR-029.
- **Files expected to change:** `apps/finance/src/features/gajian/components/PotongForm.jsx`, `JahitForm.jsx`, `FinishingForm.jsx`, `QCForm.jsx`, `KreatifForm.jsx`, `CmtForm.jsx`, corresponding `api.js` payload builders.
- **Database migration required:** No.
- **Breaking change:** No.
- **Estimated review time:** 45 min (6 files, identical pattern).
- **Estimated implementation time:** 1 day.
- **Risk:** Low.
- **Testing checklist:**
  - [ ] Each of the 6 forms: entering a manual catatan and saving actually persists it (verify in DB, not just UI).
  - [ ] Editing an existing entry correctly loads and displays a previously-saved catatan.
- **Rollback strategy:** `git revert` — column stays in place unused, no data loss for already-saved catatan values (they just stop being writable/readable via the UI again).

### PR-031 — finance: migrate kasbon writes to RPC
- **Objective:** Replace `createOrAccumulateKasbon`, `updateKasbonJumlah`, `payCicilan`, and `applyKasbonDeductionFromGajian`'s read-modify-write pattern with calls to `adjust_kasbon_sisa`.
- **Depends on:** PR-004.
- **Files expected to change:** `apps/finance/src/features/kasbon/api.js:20-51,59-72,79-93,121-130`, `api.test.js`.
- **Database migration required:** No.
- **Breaking change:** No.
- **Estimated review time:** 30–45 min.
- **Estimated implementation time:** 0.5–1 day.
- **Risk:** Medium — debt-ledger correctness; test concurrent-write scenarios explicitly.
- **Testing checklist:**
  - [ ] Each of the 4 functions produces identical results to the old implementation for normal, non-concurrent cases.
  - [ ] Concurrent-write test (two near-simultaneous updates to the same kasbon row) confirms no lost update, matching PR-004's RPC-level guarantee.
- **Rollback strategy:** `git revert`.

### PR-032 — finance: surface `fetchFinanceConfig` errors
- **Objective:** Stop silently swallowing fetch errors in `fetchFinanceConfig` and falling back to hardcoded default wage tariffs with no signal; throw and surface `isError`/`error` through `useFinanceConfig()` so wage-entry forms can warn or block.
- **Depends on:** None.
- **Files expected to change:** `apps/finance/src/features/pengaturan/api.js:8-15`, `hooks.js:10-13`, `components/PengaturanPage.jsx`, and any wage-entry form consuming `useFinanceConfig()`.
- **Database migration required:** No.
- **Breaking change:** No.
- **Estimated review time:** 15–20 min.
- **Estimated implementation time:** 2–4 hours.
- **Risk:** Low.
- **Testing checklist:**
  - [ ] Simulated fetch failure: UI now shows an explicit error/warning instead of silently proceeding with defaults.
  - [ ] Normal (successful) fetch path unaffected.
- **Rollback strategy:** `git revert`.

### PR-033 — pos: add `local_uuid` idempotency column
- **Objective:** Add a client-generated UUID column with a unique constraint to `sales`, laying the groundwork for idempotent sale inserts.
- **Depends on:** None.
- **Files expected to change:** New `supabase/migrations/*.sql`.
- **Database migration required:** Yes.
- **Breaking change:** No — additive nullable-then-backfilled column; existing rows get no `local_uuid` initially, which is fine since matching logic (PR-035) only applies to rows created after PR-034 ships.
- **Estimated review time:** 20 min.
- **Estimated implementation time:** 3–4 hours.
- **Risk:** Low.
- **Testing checklist:**
  - [ ] Migration applies cleanly; unique constraint verified (attempt to insert a duplicate `local_uuid` fails as expected).
  - [ ] Existing rows unaffected (column nullable, no backfill required).
- **Rollback strategy:** Compensating `DROP COLUMN` migration; safe pre-wiring.

### PR-034 — pos: idempotent sale insert via upsert
- **Objective:** Generate a `local_uuid` at sale-creation time and use `upsert(payload, {onConflict: "local_uuid"})` in both `createSale`/`createRetur` and `flushPendingSales`, so a retried insert (from a crash/tab-close between insert-success and local-status-update) becomes a no-op instead of a duplicate sale + double stock deduction.
- **Depends on:** PR-033.
- **Files expected to change:** `apps/pos/src/features/penjualan/hooks.js:191-211,245-251`, `apps/pos/src/lib/sync.js:145` (`flushPendingSales`), corresponding test files.
- **Database migration required:** No.
- **Breaking change:** No, but flag for a coordinated release — this touches the offline-queue write format; ensure no sale created just before deploy is mid-flight in a way that predates the `local_uuid` field.
- **Estimated review time:** 60–90 min — core critical path, same care level as PR-013/PR-014.
- **Estimated implementation time:** 1.5–2 days.
- **Risk:** High — sale-creation is the single most frequent write in the whole system; needs thorough crash-simulation testing.
- **Testing checklist:**
  - [ ] Normal sale creation (online, no interruption) works identically to before.
  - [ ] Simulated crash between server-insert-success and local-status-update: next sync correctly no-ops instead of duplicating.
  - [ ] Offline sale creation → later flush → duplicate flush attempt (simulate a retry): confirmed idempotent, single row, single stock decrement.
  - [ ] Existing `penjualan/hooks.test.js` and `sync.test.js` suites updated and passing.
- **Rollback strategy:** `git revert` — reverts to the previous (racy but functional) insert path; the `local_uuid` column stays in place unused for already-created rows, no data loss.

### PR-035 — pos: fix `syncSalesForRange` dedup
- **Objective:** Change the dedup check in `syncSalesForRange` from matching on `supabase_id` (which can be null during the write-ordering gap) to matching on `local_uuid`, closing the duplicate-local-record race.
- **Depends on:** PR-034 (needs `local_uuid` to actually be populated on inserts first).
- **Files expected to change:** `apps/pos/src/lib/sync.js:188-236`.
- **Database migration required:** No.
- **Breaking change:** No.
- **Estimated review time:** 30–45 min.
- **Estimated implementation time:** 0.5 day.
- **Risk:** Medium.
- **Testing checklist:**
  - [ ] Simulated race (remote insert committed, local `supabase_id` not yet updated) no longer creates a duplicate local row.
  - [ ] Existing `syncSalesForRange` tests pass with the updated dedup key.
- **Rollback strategy:** `git revert`.

### PR-036 — catalog: wire up hero-image LCP priority
- **Objective:** Pass `isFirst={index === 0}` from `CatalogPage.jsx`'s product `.map()` into `CatalogSlide` (currently derived from a `model.index` that's never set), and call the already-built, already-tested `useHeroPreload(sorted)` hook, which is currently never invoked anywhere.
- **Depends on:** None.
- **Files expected to change:** `apps/catalog/src/features/product-catalog/components/CatalogPage.jsx:57-71`, `CatalogSlide.jsx:26-27`.
- **Database migration required:** No.
- **Breaking change:** No.
- **Estimated review time:** 15 min.
- **Estimated implementation time:** 1–2 hours.
- **Risk:** Low — both mechanisms already exist and are tested; this is purely a wiring fix.
- **Testing checklist:**
  - [ ] First slide's image loads with `loading="eager"` / `fetchpriority="high"` (inspect rendered DOM).
  - [ ] `<link rel="preload">` for the hero image appears in the document head on load.
  - [ ] Lighthouse/LCP metric improvement spot-checked in staging.
- **Rollback strategy:** `git revert`.

### PR-037 — catalog: per-product OG/meta tags
- **Objective:** Give every `/code/:kode` link a correct WhatsApp/social link-preview (product photo, name) instead of the current generic homepage card, via either a Vite SSG/prerender plugin or a Vercel Edge Function injecting per-product `<meta>` tags server-side.
- **Depends on:** PR-008 (must generate meta tags from the safe, public `products_public` data source, not the exposed `select("*")` path).
- **Files expected to change:** `apps/catalog/src/features/product-detail/components/ProductDetailPage.jsx`, `apps/catalog/index.html`, new build/deploy config (Vercel Edge Function or Vite plugin — decision needed before implementation starts).
- **Database migration required:** No.
- **Breaking change:** No — additive; existing SPA behavior for regular (non-crawler) visitors unaffected.
- **Estimated review time:** 2+ hours, likely across two reviews (one for the design/approach decision, one for the implementation).
- **Estimated implementation time:** 5+ days — **recommend a half-day design spike first** to choose SSG vs. edge-function before estimating implementation more precisely; this PR may need to be split further once the approach is chosen (e.g. "add edge function" + "wire product data into it" as two PRs).
- **Risk:** Medium — not because the change itself is risky, but because the scope is underspecified until the design spike happens; treat the estimate above as provisional.
- **Testing checklist:**
  - [ ] Sharing a `/code/:kode` link in WhatsApp shows the correct product photo, name, and description in the link preview.
  - [ ] Crawler/bot request path verified separately from normal browser SPA path (whichever approach is chosen).
  - [ ] Homepage and non-product routes still show the existing generic meta tags, unaffected.
- **Rollback strategy:** `git revert` the code change; if a Vercel Edge Function was added, disable/remove it via a follow-up deploy config change.

### PR-038 — shared: fix `formatHarga` sign bug
- **Objective:** Fix the `\D`-strips-minus-sign bug in `formatHarga` so a variant priced below cost (a loss) displays with a correct minus sign instead of appearing as a positive "profit."
- **Depends on:** None.
- **Files expected to change:** `packages/shared/lib/constants.js:8-12`, `constants.test.js` (add negative-input regression test).
- **Database migration required:** No.
- **Breaking change:** No in practice — grep confirmed no caller relies on the current sign-stripping behavior, but this is a shared function consumed by all 4 apps, so a full grep re-verification is part of the review.
- **Estimated review time:** 15 min.
- **Estimated implementation time:** 1–2 hours.
- **Risk:** Low.
- **Testing checklist:**
  - [ ] `formatHarga(-50000)` now returns a correctly-signed negative value.
  - [ ] `HppSection.jsx`'s "(untung...)" display correctly shows a loss as negative for a below-cost variant, verified manually in staging.
  - [ ] All 4 apps' existing `formatHarga`/`HppSection`-adjacent tests still pass.
- **Rollback strategy:** `git revert`.

---

## Phase 3 — Medium

Same rigor as Phase 1/2, condensed for length. Every entry below still meets all four independence constraints; testing checklists are trimmed to the highest-value checks rather than exhaustive.

### PR-039 — admin: transactional cascade RPC — `produk`
- **Objective:** Wrap the `produk` feature's multi-table delete cascade (`products` + `stok_warna` + `expected_stok` + `hpp_template`) in a single Postgres RPC/transaction.
- **Depends on:** None. **Files:** `apps/admin/src/features/produk/api.js:185-212`, new migration. **Migration:** Yes. **Breaking:** No. **Review:** 45 min. **Impl:** 1 day. **Risk:** Medium.
- **Testing checklist:** Full cascade succeeds atomically; simulated mid-cascade failure rolls back completely, no orphaned rows.
- **Rollback:** `git revert` code + `DROP FUNCTION` migration.

### PR-040 — admin: transactional cascade RPC — `produksi-record`
- **Objective:** Same fix as PR-039, for `deleteBatchAndProduct`/`saveEntry`/`createBatches`/`updateBatch`.
- **Depends on:** None (independent table set from PR-039). **Files:** `apps/admin/src/features/produksi-record/api.js:26-168`, new migration. **Migration:** Yes. **Breaking:** No. **Review:** 45 min. **Impl:** 1 day. **Risk:** Medium.
- **Testing checklist:** Batch creation/update/delete cascades atomically; partial-failure rollback verified.
- **Rollback:** `git revert` code + `DROP FUNCTION` migration.

### PR-041 — admin: transactional cascade RPC — `produksi-hpp` / `produksi-bahan`
- **Objective:** Same fix as PR-039/040, for `hpp_template` updates and `bahan_pembelian`/`bahan_pinjam` mutations.
- **Depends on:** None. **Files:** `apps/admin/src/features/produksi-hpp/api.js:70-91`, `produksi-bahan/api.js:47,52`, new migration. **Migration:** Yes. **Breaking:** No. **Review:** 45 min. **Impl:** 1 day. **Risk:** Medium.
- **Testing checklist:** HPP template save + product `hpp` sync succeeds atomically; bahan toggle-lunas/delete cascades correctly.
- **Rollback:** `git revert` code + `DROP FUNCTION` migration.

### PR-042 — admin: fix stok-opname stale-snapshot overwrite
- **Objective:** Stop `saveStokOpname` from writing back stale unedited-column values from a 30s-cached client snapshot, which can silently overwrite concurrent POS/transfer stock changes.
- **Depends on:** None (benefits from, but doesn't require, F1's RPC pattern — a targeted per-column `UPDATE` also solves it). **Files:** `apps/admin/src/features/stok-opname/api.js:24-59`, `components/StokOpnamePage.jsx:59-72`, `hooks.js:13-16`. **Migration:** Optional (if using an RPC). **Breaking:** No. **Review:** 30 min. **Impl:** 0.5–1 day. **Risk:** Low.
- **Testing checklist:** Only edited columns are written; a concurrent stock change on an unedited column survives a stok-opname save.
- **Rollback:** `git revert`.

### PR-043 through PR-048 — admin: split 6 oversized files (one PR per file)
- **Objective (shared across all 6):** Extract inline sub-components and reduce each file toward the project's ~200-line target, following the `produksi-bahan` feature's existing decomposition pattern as the reference. Pure extraction — no logic change.
- **Depends on:** None. **Migration:** No. **Breaking:** No, for all 6.
- **Testing checklist (shared):** Existing test suite for the file passes unchanged; manually exercise the feature in staging to confirm no visual/behavioral regression from the extraction.
- **Rollback (shared):** `git revert` — pure refactor, zero data/behavior risk.

| PR | File split | Extract | Review | Impl | Risk |
|----|-----------|---------|--------|------|------|
| PR-043 | `produksi-hpp/components/HPPForm.jsx` (838 lines) | `ProdukPicker` sub-component | 45 min | 1 day | Low |
| PR-044 | `transfer/components/SuratJalan.jsx` (569 lines) | Print/layout sub-sections | 30 min | 0.5 day | Low |
| PR-045 | `produksi-sampel/components/ProduksiSampelPage.jsx` (566 lines) | Form/list sub-sections | 30 min | 0.5 day | Low |
| PR-046 | `produksi-record/components/BatchForm.jsx` (544 lines) | Size/warna sub-sections | 30 min | 0.5 day | Low |
| PR-047 | `produksi-hpp/components/ProduksiHPPPage.jsx` (535 lines) | `KalkulatorHPP`, `RangeSlider` | 30 min | 0.5 day | Low |
| PR-048 | `transfer/components/TransferForm.jsx` (530 lines) | Item-list/summary sub-sections | 30 min | 0.5 day | Low |

### PR-049 — admin: remove `dangerouslySetInnerHTML`
- **Objective:** Replace raw HTML string interpolation (including unescaped, free-typed `warna` values) in `transfer/components/ConfirmModal.jsx` with JSX elements, closing a stored-XSS surface.
- **Depends on:** None (natural to pair with F2/PR-002 if generalizing `ConfirmModal`, but independently shippable). **Files:** `apps/admin/src/features/transfer/components/ConfirmModal.jsx:69-77,128-131`. **Migration:** No. **Breaking:** No. **Review:** 15 min. **Impl:** 2 hours. **Risk:** Low.
- **Testing checklist:** Confirm-dialog content renders identically for normal input; a crafted `warna` value (e.g. containing `<img onerror=...>`) renders as inert text, not executed HTML.
- **Rollback:** `git revert`.

### PR-050 — admin: paginate audit history
- **Objective:** Replace `fetchHistory`'s hard 500-row cap with cursor-based (keyset) pagination and a "load more" affordance, so filtered ranges with more events aren't silently truncated.
- **Depends on:** None. **Files:** `apps/admin/src/features/history/api.js:53-69`, `components/HistoryPage.jsx`. **Migration:** Optional (index on `changed_at`). **Breaking:** No. **Review:** 30 min. **Impl:** 0.5–1 day. **Risk:** Low.
- **Testing checklist:** A range with >500 events now loads all of them via pagination, with no silent gap; existing <500-event ranges behave identically to before.
- **Rollback:** `git revert`.

### PR-051 — finance: extract duplicated deduction calc
- **Objective:** Extract the `transfer = Math.max(total - potongan, 0)` + deduction-aggregation logic (currently duplicated in 4 places) into one `buildDedByNama()`/`calcTransfer()` pair in `gajian/utils.js`.
- **Depends on:** None. **Files:** `gajian/components/TabRingkasan.jsx`, `PerKaryawan.jsx:14-25`, `GajianShareCard.jsx:19-23,105-107`, `utils.js:176-180,223-225`. **Migration:** No. **Breaking:** No. **Review:** 20 min. **Impl:** 3–4 hours. **Risk:** Low.
- **Testing checklist:** All 4 call sites produce identical output before/after the extraction, verified against existing snapshot tests.
- **Rollback:** `git revert`.

### PR-052 through PR-057 — finance: split 6 oversized `gajian` files
- **Objective (shared):** Split each file by concern, following the same decomposition pattern as PR-043–048.
- **Depends on:** None, but sequence after C6/C7/H5/H6 (PR-018 through PR-022, PR-029/030, PR-031) so these files aren't mid-refactor while correctness fixes are landing in the same area.
- **Migration:** No. **Breaking:** No, for all 6.
- **Testing checklist (shared):** Existing test suite passes unchanged; manual smoke test of the affected tab/screen in staging.
- **Rollback (shared):** `git revert`.

| PR | File split | Split by | Review | Impl | Risk |
|----|-----------|----------|--------|------|------|
| PR-052 | `gajian/api.js` (319 lines) | Periode/totals CRUD vs. per-team CRUD | 45 min | 1 day | Low |
| PR-053 | `gajian/components/TabRingkasan.jsx` (245 lines) | Summary sub-sections | 30 min | 0.5 day | Low |
| PR-054 | `gajian/utils.js` (240 lines) | By calculation domain | 30 min | 0.5 day | Low |
| PR-055 | `gajian/components/JahitForm.jsx` (236 lines) | Form sub-sections | 30 min | 0.5 day | Low |
| PR-056 | `gajian/hooks.js` (228 lines) | By query/mutation grouping | 30 min | 0.5 day | Low |
| PR-057 | `gajian/queries.js` (218 lines) | By query key domain | 30 min | 0.5 day | Low |

### PR-058 — finance: atomic tariff save
- **Objective:** Fix `PengaturanPage`'s N-independent-upserts-via-`Promise.all` pattern so a partial failure doesn't leave tariffs in a mixed old/new state with only a generic error toast.
- **Depends on:** None. **Files:** `apps/finance/src/features/pengaturan/components/PengaturanPage.jsx:38-40,54-58`. **Migration:** Optional (if converting to RPC). **Breaking:** No. **Review:** 20 min. **Impl:** 3–4 hours. **Risk:** Low.
- **Testing checklist:** Simulated partial-upsert failure now surfaces which specific tariff failed and doesn't leave a silently-mixed state.
- **Rollback:** `git revert`.

### PR-059 — finance: optimize pettycash/dashboard queries
- **Objective:** Memoize `usePettycashAll()`'s saldo reduce and switch the dashboard's "this month" stat to a server-side date-range filter instead of client-side filtering the whole table.
- **Depends on:** None. **Files:** `pettycash/api.js:8-16`, `hooks.js:16-27`, `dashboard/hooks.js`. **Migration:** No. **Breaking:** No. **Review:** 30 min. **Impl:** 0.5 day. **Risk:** Low.
- **Testing checklist:** Dashboard "this month" figure matches the old (correct, if slower) computation for several test months; render-count profiling confirms reduced recomputation.
- **Rollback:** `git revert`.

### PR-060 — finance: warn on dropped manual tambahan
- **Objective:** Add a visible warning in the 6 wage-entry forms when editing an entry whose prior total implies a nonzero manual component that will be dropped if not re-entered (the `useState("")` reset is intentional per project convention — this just makes the consequence visible).
- **Depends on:** Natural to pair with PR-030 (same forms, same field family). **Files:** The 6 team forms in `gajian/components/`. **Migration:** No. **Breaking:** No. **Review:** 15 min. **Impl:** 2–3 hours. **Risk:** Low.
- **Testing checklist:** Opening an entry with a prior manual component shows the warning; opening one without does not.
- **Rollback:** `git revert`.

### PR-061 — pos: `Struk.jsx` → Zustand store
- **Objective:** Replace raw `localStorage.getItem/setItem` in `Struk.jsx` with a new `useLabelTypeStore` (Zustand + `persist`), the one architecture-rule violation found in POS.
- **Depends on:** None. **Files:** `apps/pos/src/shared/components/Struk.jsx:18-33`, new store file. **Migration:** No. **Breaking:** No. **Review:** 15 min. **Impl:** 2–3 hours. **Risk:** Low.
- **Testing checklist:** Label-type preference persists across reload exactly as before; no manual `localStorage` calls remain in the component (grep-verified).
- **Rollback:** `git revert`.

### PR-062 — pos: prune unbounded `_deletedIds`
- **Objective:** Prune `_deletedIds` entries older than the sync window `syncSalesForRange` actually consults, preventing indefinite `localStorage` growth.
- **Depends on:** Natural to pair with PR-034/PR-035 (same deleted/synced-sale bookkeeping area). **Files:** `apps/pos/src/lib/sync.js:158-182`. **Migration:** No (unless moving to a server-side soft-delete flag). **Breaking:** No. **Review:** 15 min. **Impl:** 2–3 hours. **Risk:** Low.
- **Testing checklist:** Entries outside the active sync window are pruned; entries within it are retained and still correctly suppress resurrection.
- **Rollback:** `git revert`.

### PR-063 — pos: split `LaporanKeuangan.jsx`
- **Objective:** Split the 331-line file into sub-components, pure extraction.
- **Depends on:** None. **Files:** `apps/pos/src/features/laporan/components/LaporanKeuangan.jsx`. **Migration:** No. **Breaking:** No. **Review:** 30 min. **Impl:** 0.5 day. **Risk:** Low.
- **Testing checklist:** Existing tests pass unchanged; manual smoke test of the Laporan Keuangan screen.
- **Rollback:** `git revert`.

### PR-064 — pos: memoize `ProductList` derivations
- **Objective:** Wrap `variantMap`/`allSizes`/`totalStok` computation in `useMemo` in `ProductList.jsx`, currently recomputed on every render for every product.
- **Depends on:** None. **Files:** `apps/pos/src/features/kasir/components/ProductList.jsx:43-126,129-199`. **Migration:** No. **Breaking:** No. **Review:** 15 min. **Impl:** 2–3 hours. **Risk:** Low.
- **Testing checklist:** Product list renders identically; render-count profiling confirms reduced recomputation on unrelated state changes.
- **Rollback:** `git revert`.

### PR-065 — shared: validate `location` input
- **Objective:** Whitelist-check `location` against `LOCATIONS` in `fetchStokByLocation` before using it as a column identifier.
- **Depends on:** None. **Files:** `packages/shared/features/stok/api.js:8-19`. **Migration:** No. **Breaking:** No. **Review:** 10 min. **Impl:** 1 hour. **Risk:** Low.
- **Testing checklist:** Valid locations behave identically; an invalid location string now returns a clear error instead of an ambiguous PostgREST failure.
- **Rollback:** `git revert`.

### PR-066 — shared: guard `createTransfer` null items
- **Objective:** Add a null-check for `items` alongside the existing empty-array check, so a caller passing `undefined`/`null` gets the intended friendly validation message instead of a raw `TypeError`.
- **Depends on:** None (natural to bundle with PR-012 since it's the same file, but independently shippable/revertable, kept separate here). **Files:** `packages/shared/features/transfers/api.js:77`. **Migration:** No. **Breaking:** No. **Review:** 10 min. **Impl:** 1 hour. **Risk:** Low.
- **Testing checklist:** Calling `createTransfer` with `items: null` now returns the friendly validation error, not a `TypeError`.
- **Rollback:** `git revert`.

### PR-067 — shared: guard `buildKode` partial input
- **Objective:** Require both `angka` and `bahan` segments non-empty before building a kode, preventing malformed codes like `"D--OSK"`.
- **Depends on:** None, but requires a quick data audit of existing `products.kode` values before merging, to confirm no live product relies on the current lenient behavior. **Files:** `packages/shared/lib/constants.js:14-18`. **Migration:** No. **Breaking:** Potentially, pending the data audit. **Review:** 15 min. **Impl:** 1–2 hours. **Risk:** Low.
- **Testing checklist:** Data audit confirms zero existing malformed codes depend on lenient behavior; new validation correctly rejects partial input in the product form.
- **Rollback:** `git revert`.

### PR-068 — catalog: `fetchProductByKode` server query
- **Objective:** Add a `.eq("kode", kode).single()` query so visiting a shared product link doesn't require downloading the entire catalog.
- **Depends on:** PR-008 (query against the safe `products_public` source, not the exposed path). **Files:** `packages/shared/features/products/api.js`, `hooks.js:20-24` (or a catalog-local equivalent, consistent with PR-008's approach). **Migration:** No. **Breaking:** No. **Review:** 20 min. **Impl:** 3–4 hours. **Risk:** Low.
- **Testing checklist:** Product detail page loads correctly via the new single-row query; load time measurably improved on a cold cache, verified in staging.
- **Rollback:** `git revert`.

### PR-069 — catalog: generic error fallback
- **Objective:** Stop rendering raw `{error.message}` to catalog visitors; log the real error, show a generic Indonesian fallback message.
- **Depends on:** None. **Files:** `CatalogPage.jsx:48`, `ProductDetailPage.jsx:21`. **Migration:** No. **Breaking:** No. **Review:** 10 min. **Impl:** 1–2 hours. **Risk:** Low.
- **Testing checklist:** Simulated fetch error shows the generic message, not backend details; error still logged to console/monitoring for debugging.
- **Rollback:** `git revert`.

### PR-070 — catalog: video through Cloudinary transform
- **Objective:** Wrap `product.video`'s `src` with `cldUrl()` for `f_auto,q_auto`, and set `preload="metadata"` explicitly, matching the auto-format policy already applied to images.
- **Depends on:** None. **Files:** `ProductDetailPage.jsx:124-131`. **Migration:** No. **Breaking:** No. **Review:** 15 min. **Impl:** 2 hours. **Risk:** Low.
- **Testing checklist:** Video still plays correctly; network tab confirms reduced initial payload vs. before (no eager full-video preload).
- **Rollback:** `git revert`.

### PR-071 — catalog: memoize filter/sort
- **Objective:** Wrap the product filter+sort IIFE in `useMemo` in `CatalogPage.jsx`, currently re-running on every render including unrelated state changes.
- **Depends on:** None. **Files:** `CatalogPage.jsx:57-71`. **Migration:** No. **Breaking:** No. **Review:** 10 min. **Impl:** 1 hour. **Risk:** Low.
- **Testing checklist:** Catalog renders identically; render-count profiling confirms the filter/sort no longer re-runs on unrelated state changes (e.g. scroll-top toggle).
- **Rollback:** `git revert`.

---

## Phase 4 — Low

All 11 items below are hardening/convention-drift fixes with no urgent business driver. Each is still its own independently reviewable, deployable, revertable PR — just batched into one table since the fields are uniform and low-stakes. Standard testing approach for all: run the existing test suite for the touched file(s) plus one manual smoke test of the affected screen; standard rollback for all: `git revert` (none require a compensating migration except where noted).

| PR | Title | Files | Migration | Breaking | Review | Impl | Risk |
|----|-------|-------|-----------|----------|--------|------|------|
| PR-072 | admin/finance: per-field opt-out for global uppercase-input hack | `main.jsx` (both apps) | No | No | 30 min | 0.5 day | Low |
| PR-073 | admin: clean up `setTimeout` without cleanup | `AdminPage.jsx:48-49,96` | No | No | 10 min | 1–2h | Low |
| PR-074 | admin: scope `push_subscriptions` RLS to `user_email` | New migration | Yes (policy only) | No | 15 min | 2–3h | Low |
| PR-075 | finance: scope `invalidateQueries` to affected period | `gajian/queries.js` | No | No | 15 min | 2–3h | Low |
| PR-076 | finance: role/permission model design + implementation | TBD (design spike first) | Possibly | Possibly | TBD | XL — schedule separately, blocked on PR-001 findings review | Medium |
| PR-077 | pos: replace `alert()` with existing toast/modal pattern | `Struk.jsx:60,84`, `EditSaleModal.jsx:88,144` | No | No | 15 min | 2–3h | Low |
| PR-078 | shared: document theme store's intentional `localStorage` exception in `CLAUDE.md` | `CLAUDE.md`, `theme/store.js` (comment only) | No | No | 10 min | 1h | Low |
| PR-079 | shared: widen `generateTransferNo` collision space / uniqueness constraint | `transfers/api.js:41-46`, optional migration | Optional | No | 15 min | 2–3h | Low |
| PR-080 | shared: input validation on `cldUrl()` transform options | `lib/cloudinary.js:99-112` | No | No | 15 min | 2h | Low |
| PR-081 | catalog: add CSP/security headers | `vercel.json` | No | No | 10 min | 1h | Low |
| PR-082 | catalog: `React.memo` `CatalogSlide` + memoize `useSoldOutSet` | `CatalogSlide.jsx`, `product-catalog/hooks.js:6-9` | No | No | 15 min | 2h | Low |

Note on PR-076: this is the one Phase 4 item that isn't a small, independent PR by nature — it requires a product decision about what roles/permissions should exist, informed by PR-001's RLS findings. Treat it as a placeholder in this plan; break it into its own properly-scoped set of PRs once that decision is made, rather than attempting to size it now.

---

## Summary

82 PRs total: 6 foundational, 16 in Phase 1 (Critical), 16 in Phase 2 (High), 33 in Phase 3 (Medium, including two 6-PR file-split families), 11 in Phase 4 (Low). Every PR in this plan is sized so a reviewer can approve it in under two hours (most under 45 minutes), deploys safely on its own the moment it's merged, and reverts with a plain `git revert` except where a compensating migration is explicitly called out. The two-step rollouts (PR-008/PR-009 for the products exposure fix, and the additive-RPC-then-wire-it-up pattern used throughout Phase 1) exist specifically so that a mistake in one PR never requires reverting more than that one PR to recover.
