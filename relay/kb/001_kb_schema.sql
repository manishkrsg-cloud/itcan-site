-- ITCAN_CorpSite knowledge base (Supabase project zlzriotsjyvabzvwvqpu).
-- Same shape as the Talent Suite KB so both can be read by the same tooling.
create table if not exists public.kb_entries (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  topic       text not null,
  title       text not null,
  body        text not null,
  tags        text[] not null default '{}',
  source      text,
  status      text not null default 'current' check (status in ('current', 'open', 'superseded')),
  updated_at  timestamptz not null default now()
);
comment on table public.kb_entries is 'ITCAN corporate website (relay-site) knowledge base. Knowledge only: no personal data, no credentials.';

create index if not exists kb_entries_topic_idx on public.kb_entries (topic);
create index if not exists kb_entries_tags_idx  on public.kb_entries using gin (tags);
create index if not exists kb_entries_fts_idx   on public.kb_entries using gin (to_tsvector('english', title || ' ' || body));

create or replace function public.kb_touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists kb_entries_touch on public.kb_entries;
create trigger kb_entries_touch before update on public.kb_entries for each row execute function public.kb_touch_updated_at();

-- Locked down like the Talent Suite KB: RLS on and no policies, so the publishable key reads nothing.
-- Read and write with the secret key or the Supabase connector.
alter table public.kb_entries enable row level security;
