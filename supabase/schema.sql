-- Kanban board schema for Supabase
-- Run this in the Supabase SQL Editor.
drop table if exists public.tasks cascade;
drop function if exists public.set_updated_at() cascade;

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  title       text not null,
  description text,
  status      text not null default 'todo'
              check (status in ('todo', 'in_progress','in_review' ,'done')),
  position    double precision not null default 0,  -- order within a column
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists tasks_status_position_idx
  on public.tasks (status, position);

-- Keep updated_at current
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.tasks enable row level security;

-- DEMO ONLY: lets anyone with the anon key read/write.
-- Swap for per-user policies (add a user_id column referencing auth.users)
-- if you add authentication.
create policy "Public read"   on public.tasks for select using (true);
create policy "Public insert" on public.tasks for insert with check (true);
create policy "Public update" on public.tasks for update using (true);
create policy "Public delete" on public.tasks for delete using (true);

-- Optional seed data
insert into public.tasks (title, status, position) values
  ('Set up project',      'done',        1),
  ('Build board UI',      'in_progress', 1),
  ('Add drag and drop',   'todo',        1),
  ('Write README',        'todo',        2);
