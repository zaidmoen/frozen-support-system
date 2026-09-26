create table if not exists public.support_signals (
  ticket_id uuid primary key references public.tickets(id) on delete cascade,
  guild_id text not null references public.guild_settings(guild_id) on delete cascade,
  terms text[] not null,
  created_at timestamptz not null default now()
);

create index if not exists support_signals_guild_created_idx
  on public.support_signals (guild_id, created_at desc);

create table if not exists public.support_incidents (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null references public.guild_settings(guild_id) on delete cascade,
  title varchar(120) not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  ticket_count integer not null default 0 check (ticket_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists support_incidents_guild_status_idx
  on public.support_incidents (guild_id, status, updated_at desc);

create table if not exists public.support_incident_tickets (
  incident_id uuid not null references public.support_incidents(id) on delete cascade,
  ticket_id uuid not null unique references public.tickets(id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (incident_id, ticket_id)
);

alter table public.support_signals enable row level security;
alter table public.support_incidents enable row level security;
alter table public.support_incident_tickets enable row level security;
