-- Spust tento skript v Supabase SQL editoru (Dashboard -> SQL Editor -> New query)

create table if not exists calendar_days (
  id bigint generated always as identity primary key,
  date date not null unique,
  crossed boolean not null default false,
  note text,
  updated_at timestamp with time zone default now()
);

-- Index pro rychle vyhledavani podle mesice
create index if not exists idx_calendar_days_date on calendar_days (date);

-- Povolit pristup (RLS vypnuto, protoze aplikace nema login a pristupuje pres service key)
alter table calendar_days disable row level security;

-- Tabulka pro odpocty/cile (napr. "do Vanoc", "dovolena")
create table if not exists countdown_goals (
  id bigint generated always as identity primary key,
  label text not null,
  target_date date not null,
  created_at timestamp with time zone default now()
);

alter table countdown_goals disable row level security;
