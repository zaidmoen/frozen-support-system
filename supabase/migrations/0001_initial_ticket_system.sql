create table if not exists public.guild_settings (
  guild_id text primary key,
  panel_channel_id text,
  ticket_category_id text not null,
  support_role_id text not null,
  log_channel_id text not null,
  ticket_counter integer not null default 0 check (ticket_counter >= 0),
  inactivity_hours integer not null default 24 check (inactivity_hours between 1 and 720),
  allow_multiple_open boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ticket_panels (
  id uuid primary key default gen_random_uuid(), guild_id text not null references public.guild_settings(guild_id) on delete cascade,
  channel_id text not null, message_id text not null, title text not null, description text not null,
  is_active boolean not null default true, created_at timestamptz not null default now(), unique (guild_id, message_id)
);
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(), guild_id text not null references public.guild_settings(guild_id) on delete cascade,
  ticket_number integer not null check (ticket_number > 0), channel_id text not null unique, opener_id text not null,
  service_title varchar(100) not null, details varchar(2000) not null,
  status text not null default 'open' check (status in ('open','claimed','waiting_user','waiting_staff','closed')),
  priority text not null default 'normal' check (priority in ('normal','important','urgent')),
  claimed_by text, claimed_at timestamptz, first_staff_response_at timestamptz,
  last_activity_at timestamptz not null default now(), closed_at timestamptz, closed_by text, close_reason varchar(500),
  reopened_count integer not null default 0 check (reopened_count >= 0), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique (guild_id, ticket_number)
);
create table if not exists public.ticket_members (
  ticket_id uuid not null references public.tickets(id) on delete cascade, user_id text not null, added_by text not null,
  created_at timestamptz not null default now(), primary key (ticket_id, user_id)
);
create table if not exists public.ticket_events (
  id bigint generated always as identity primary key, ticket_id uuid not null references public.tickets(id) on delete cascade,
  event_type text not null, actor_id text, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.ticket_ratings (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null unique references public.tickets(id) on delete cascade,
  user_id text not null, rating smallint not null check (rating between 1 and 5), feedback varchar(1000), created_at timestamptz not null default now()
);
create table if not exists public.ticket_transcripts (
  ticket_id uuid primary key references public.tickets(id) on delete cascade, html text not null,
  message_count integer not null default 0 check (message_count >= 0), created_at timestamptz not null default now()
);
create index if not exists tickets_guild_status_idx on public.tickets(guild_id, status);
create index if not exists tickets_opener_status_idx on public.tickets(guild_id, opener_id, status);
create index if not exists tickets_claimed_by_idx on public.tickets(guild_id, claimed_by) where claimed_by is not null;
create index if not exists tickets_activity_idx on public.tickets(status, last_activity_at) where status <> 'closed';
create index if not exists ticket_events_ticket_created_idx on public.ticket_events(ticket_id, created_at);
alter table public.guild_settings enable row level security;
alter table public.ticket_panels enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_members enable row level security;
alter table public.ticket_events enable row level security;
alter table public.ticket_ratings enable row level security;
alter table public.ticket_transcripts enable row level security;
