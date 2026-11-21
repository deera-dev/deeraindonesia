-- The plain GRANT SELECT in the previous migration also triggered this
-- project's schema-level default privileges on public (see pg_default_acl:
-- role postgres grants arwdDxtm -- ALL -- on every new table/view in this
-- schema to anon/authenticated/service_role). products_public is a plain,
-- single-table view with no WHERE/GROUP BY/DISTINCT, so Postgres treats it
-- as auto-updatable -- and since the view (security_invoker=false, the
-- default) runs as its owner for RLS purposes, a write through it would
-- have bypassed products' authenticated-only write policies entirely.
-- Verified live as anon (BEGIN; SET LOCAL ROLE anon; ... ROLLBACK;): before
-- this migration, anon had INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/
-- TRIGGER on products_public in addition to SELECT. Locked to read-only
-- before anything consumes the view.
revoke insert, update, delete, truncate, references, trigger
  on public.products_public
  from anon, authenticated;
