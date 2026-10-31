-- Removes undocumented public (anon) write access to products, found via
-- pg_policies during the stack-rewrite audit — not present in any tracked
-- migration file, so this was added outside the normal migration flow.
-- Anyone with the public anon key could INSERT/UPDATE/DELETE rows in the
-- product catalog. The matching "Public read" (SELECT) policy is NOT
-- touched here: catalog.deera.id currently reads products.* directly with
-- the anon key (packages/shared/features/products/api.ts), so revoking
-- SELECT would break the live public storefront immediately. That needs a
-- products_public view (excluding hpp) + catalog cutover first - already
-- scoped as PR-007/008/009 in docs/product/pr-plan.md - before SELECT can
-- be safely revoked.
--
-- Applied directly to the live project via Supabase MCP on 2026-10-31
-- (remote migration version 20261031155852); this file exists so git
-- stays truthful about what's actually live, per the governance gap
-- docs/reports/audit-report.md already flagged.
drop policy if exists "Public insert" on public.products;
drop policy if exists "Public update" on public.products;
drop policy if exists "Public delete" on public.products;
