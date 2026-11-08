-- Kanban board schema for Supabase
-- Run this in the Supabase SQL Editor.
-- WARNING: the two drop lines delete the existing table and all its rows.
-- (also clears the tables from 002_collaboration.sql; run that file again afterwards)
drop table if exists public.task_activity, public.comments, public.task_labels,
  public.task_assignees, public.labels, public.team_members cascade;
drop table if exists public.tasks cascade;
drop function if exists public.set_updated_at() cascade;

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'todo'
              check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority    text not null default 'medium'
              check (priority in ('low', 'medium', 'high')),
  due_date    date,
  position    double precision not null default 0,  -- order within a column
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists tasks_user_status_position_idx
  on public.tasks (user_id, status, position);

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

-- Row Level Security: each user can only see and change their own tasks.
-- Guest (anonymous) users count as users too, each with their own auth.uid().
alter table public.tasks enable row level security;

create policy "Users read own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users insert own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);


-- Realtime: lets open tabs receive task changes
alter publication supabase_realtime add table public.tasks;
