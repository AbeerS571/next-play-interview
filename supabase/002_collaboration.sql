-- =====================================================================
-- 002: team members, labels, assignees, comments, activity history
-- Run this in the Supabase SQL Editor AFTER schema.sql.
-- Safe to run on an existing database: it keeps your tasks, and it can be
-- re-run without errors.
-- =====================================================================

-- ---------- Tables ----------

-- Team members are names to assign, not separate logins
create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  color       text not null default 'lavender',  -- a color name from theme.css
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.labels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  color       text not null default 'blue',
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.task_assignees (
  task_id     uuid not null references public.tasks (id) on delete cascade,
  member_id   uuid not null references public.team_members (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (task_id, member_id)
);

create table if not exists public.task_labels (
  task_id     uuid not null references public.tasks (id) on delete cascade,
  label_id    uuid not null references public.labels (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (task_id, label_id)
);

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body        text not null check (length(trim(body)) > 0),
  created_at  timestamptz not null default now()
);
create index if not exists comments_task_created_idx on public.comments (task_id, created_at);

-- Filled in by the triggers below
create table if not exists public.task_activity (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  action      text not null,  -- created | status | edit | assign | label
  message     text not null,
  -- clock_timestamp (not now) so several changes saved at once keep their order
  created_at  timestamptz not null default clock_timestamp()
);
create index if not exists task_activity_task_created_idx on public.task_activity (task_id, created_at);

-- ---------- Row Level Security: each user only sees their own rows ----------
-- Works the same for guest (anonymous) users: they use the 'authenticated'
-- role and have their own auth.uid().

alter table public.team_members   enable row level security;
alter table public.labels         enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_labels    enable row level security;
alter table public.comments       enable row level security;
alter table public.task_activity  enable row level security;

drop policy if exists "Own team members" on public.team_members;
create policy "Own team members" on public.team_members
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Own labels" on public.labels;
create policy "Own labels" on public.labels
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Own task assignees" on public.task_assignees;
-- Rows linking tables must point at YOUR task and YOUR team member / label,
-- not just be owned by you.
create policy "Own task assignees" on public.task_assignees
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.tasks t where t.id = task_assignees.task_id and t.user_id = auth.uid())
    and exists (select 1 from public.team_members m where m.id = task_assignees.member_id and m.user_id = auth.uid())
  );

drop policy if exists "Own task labels" on public.task_labels;
create policy "Own task labels" on public.task_labels
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.tasks t where t.id = task_labels.task_id and t.user_id = auth.uid())
    and exists (select 1 from public.labels l where l.id = task_labels.label_id and l.user_id = auth.uid())
  );

drop policy if exists "Own comments" on public.comments;
create policy "Own comments" on public.comments
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (select 1 from public.tasks t where t.id = comments.task_id and t.user_id = auth.uid()));

-- Activity is written by triggers and only read by the app
drop policy if exists "Read own activity" on public.task_activity;
create policy "Read own activity" on public.task_activity
  for select using (auth.uid() = user_id);
drop policy if exists "Insert own activity" on public.task_activity;
create policy "Insert own activity" on public.task_activity
  for insert with check (auth.uid() = user_id and exists (select 1 from public.tasks t where t.id = task_activity.task_id and t.user_id = auth.uid()));

-- ---------- Activity tracking (triggers) ----------

create or replace function public.status_label(s text)
returns text language sql immutable as $$
  select case s
    when 'todo' then 'To Do'
    when 'in_progress' then 'In Progress'
    when 'in_review' then 'In Review'
    when 'done' then 'Done'
    else s
  end;
$$;

-- Log task creation and edits (status, title, description, priority, due date).
-- Position-only changes are ignored.
create or replace function public.log_task_changes()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into task_activity (task_id, user_id, action, message)
    values (new.id, new.user_id, 'created', 'Created this task');
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into task_activity (task_id, user_id, action, message)
    values (new.id, new.user_id, 'status',
      format('Moved from %s → %s', status_label(old.status), status_label(new.status)));
  end if;

  if new.title is distinct from old.title then
    insert into task_activity (task_id, user_id, action, message)
    values (new.id, new.user_id, 'edit', format('Renamed to "%s"', new.title));
  end if;

  if new.description is distinct from old.description then
    insert into task_activity (task_id, user_id, action, message)
    values (new.id, new.user_id, 'edit', 'Updated the description');
  end if;

  if new.priority is distinct from old.priority then
    insert into task_activity (task_id, user_id, action, message)
    values (new.id, new.user_id, 'edit',
      format('Changed priority from %s → %s', initcap(old.priority), initcap(new.priority)));
  end if;

  if new.due_date is distinct from old.due_date then
    insert into task_activity (task_id, user_id, action, message)
    values (new.id, new.user_id, 'edit',
      case
        when new.due_date is null then 'Removed the due date'
        when old.due_date is null then format('Set due date to %s', to_char(new.due_date, 'Mon FMDD, YYYY'))
        else format('Changed due date from %s → %s',
          to_char(old.due_date, 'Mon FMDD'), to_char(new.due_date, 'Mon FMDD, YYYY'))
      end);
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_log_changes on public.tasks;
create trigger tasks_log_changes
  after insert or update on public.tasks
  for each row execute function public.log_task_changes();

-- Log assigning / unassigning team members
create or replace function public.log_assignee_changes()
returns trigger language plpgsql set search_path = public as $$
declare
  rec record;
  member_name text;
begin
  if tg_op = 'INSERT' then
    rec := new;
  else
    rec := old;
  end if;

  -- When a whole task is deleted its assignee rows are removed too; skip those.
  if not exists (select 1 from tasks where id = rec.task_id) then
    return rec;
  end if;

  select name into member_name from team_members where id = rec.member_id;

  insert into task_activity (task_id, user_id, action, message)
  values (rec.task_id, rec.user_id, 'assign',
    case when tg_op = 'INSERT'
      then format('Assigned %s', coalesce(member_name, 'a team member'))
      else format('Unassigned %s', coalesce(member_name, 'a removed team member'))
    end);

  return rec;
end;
$$;

drop trigger if exists task_assignees_log on public.task_assignees;
create trigger task_assignees_log
  after insert or delete on public.task_assignees
  for each row execute function public.log_assignee_changes();

-- Log adding / removing labels
create or replace function public.log_label_changes()
returns trigger language plpgsql set search_path = public as $$
declare
  rec record;
  label_name text;
begin
  if tg_op = 'INSERT' then
    rec := new;
  else
    rec := old;
  end if;

  if not exists (select 1 from tasks where id = rec.task_id) then
    return rec;
  end if;

  select name into label_name from labels where id = rec.label_id;

  insert into task_activity (task_id, user_id, action, message)
  values (rec.task_id, rec.user_id, 'label',
    case when tg_op = 'INSERT'
      then format('Added label "%s"', coalesce(label_name, 'label'))
      else format('Removed label "%s"', coalesce(label_name, 'deleted label'))
    end);

  return rec;
end;
$$;

drop trigger if exists task_labels_log on public.task_labels;
create trigger task_labels_log
  after insert or delete on public.task_labels
  for each row execute function public.log_label_changes();
