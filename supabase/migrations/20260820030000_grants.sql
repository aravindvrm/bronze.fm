-- Explicit table privileges.
--
-- RLS decides WHICH ROWS a role may see; it does not grant access to the table
-- itself. Supabase cloud pre-configures default privileges for `anon`, so the
-- schema appeared to work there while quietly depending on platform setup. On
-- a fresh Postgres every read failed with:
--
--   42501 permission denied for table creators
--
-- Granting explicitly makes the schema self-contained and identical wherever
-- it is applied.
--
-- SELECT only, deliberately. Writes are already denied by the absence of any
-- anon RLS policy; withholding the privilege as well means a policy added by
-- mistake still cannot open up writes on its own.

grant usage on schema public to anon, authenticated;

grant select on
  creators,
  assets,
  content,
  content_items,
  content_creators,
  content_item_creators,
  merch_items,
  events
to anon, authenticated;

-- Same treatment for tables added later, so this cannot silently regress.
alter default privileges in schema public
  grant select on tables to anon, authenticated;
