create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid references auth.users(id),
  api_key_hash text not null unique,
  api_key_last4 text not null,
  created_at timestamptz not null default now()
);

alter table public.projects add column if not exists owner_user_id uuid references auth.users(id);

create table if not exists public.events (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  channel text not null,
  title text not null,
  description text,
  emoji text,
  tags text[] not null default '{}',
  event_time timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_owner on public.projects(owner_user_id);
create index if not exists idx_events_project_time on public.events(project_id, event_time desc);
create index if not exists idx_events_channel on public.events(channel);
create index if not exists idx_events_tags on public.events using gin(tags);

-- Ensure events are included in realtime publication.
do $$
begin
  alter publication supabase_realtime add table public.events;
exception
  when duplicate_object then null;
end $$;

alter table public.projects enable row level security;
alter table public.events enable row level security;

-- Remove old anon policies.
drop policy if exists anon_read_events on public.events;
drop policy if exists deny_anon_projects on public.projects;

-- Authenticated users can read only projects they own.
drop policy if exists authenticated_read_own_projects on public.projects;
create policy authenticated_read_own_projects
on public.projects
for select
to authenticated
using (owner_user_id = auth.uid());

-- Authenticated users can read only events for projects they own.
drop policy if exists authenticated_read_own_events on public.events;
create policy authenticated_read_own_events
on public.events
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = events.project_id
      and p.owner_user_id = auth.uid()
  )
);
