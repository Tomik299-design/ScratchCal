-- Pouzij tento skript POUZE pokud uz mas tabulku calendar_days vytvorenou
-- z predchoziho nastaveni a chces jen doplnit novou tabulku pro cile/odpocty.
-- (Pokud zakladas Supabase poprve, staci spustit supabase_setup.sql, tenhle nepotrebujes.)

create table if not exists countdown_goals (
  id bigint generated always as identity primary key,
  label text not null,
  target_date date not null,
  created_at timestamp with time zone default now()
);

alter table countdown_goals disable row level security;
