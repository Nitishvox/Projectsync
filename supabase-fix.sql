-- =========================================================

begin;
-- ProjectSync — Complete Database Fix & Missing Tables Setup
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- =========================================================

-- 1. Ensure required extensions exist
create extension if not exists "uuid-ossp";

-- 2. Grant permissions on schema public
grant usage on schema public to anon, authenticated, service_role;

-- 3. Create PROFILES table (mirrors auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  created_at timestamptz default now()
);

-- 4. Create AUDIT_LOGS table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity_type text not null check (entity_type in ('PROJECT', 'TASK', 'AUTH')),
  entity_id text,
  details text,
  created_at timestamptz default now()
);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id, created_at desc);

-- 5. Create CHAT_MESSAGES table (for AI Copilot history)
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null,
  tool_call_data jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_chat_messages_user_id on public.chat_messages(user_id, created_at);

-- 6. Ensure PROJECTS table exists and has proper indexes
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  description text,
  status text not null default 'NOT_STARTED'
    check (status in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
  start_date timestamptz,
  end_date timestamptz,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_date_range check (end_date is null or start_date is null or end_date >= start_date),
  constraint projects_id_user_id_key unique (id, user_id)
);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_user_id on public.projects(user_id);

-- 7. Ensure TASKS table exists and has proper indexes
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  priority text not null default 'MEDIUM' check (priority in ('LOW', 'MEDIUM', 'HIGH')),
  status text not null default 'PENDING' check (status in ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
  due_date timestamptz,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint tasks_project_owner_fkey
    foreign key (project_id, user_id)
    references public.projects(id, user_id)
    on delete cascade
);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_id_user_id_key' and conrelid = 'public.projects'::regclass) then
    alter table public.projects add constraint projects_id_user_id_key unique (id, user_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_project_owner_fkey' and conrelid = 'public.tasks'::regclass) then
    alter table public.tasks add constraint tasks_project_owner_fkey foreign key (project_id, user_id) references public.projects(id, user_id) on delete cascade;
  end if;
end;
$$;
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_priority on public.tasks(priority);
create index if not exists idx_tasks_user_project on public.tasks(user_id, project_id);

-- 8. Auto-update updated_at triggers
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();

-- 9. Auto-sync new auth users to public.profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 10. BACKFILL all existing users into public.profiles
insert into public.profiles (id, full_name, email)
select
  id,
  coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  email
from auth.users
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email;

-- 11. Row Level Security (RLS) configuration
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.chat_messages enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles RLS
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Projects RLS (allows user or server client with service_role to manage)
drop policy if exists "Users can view own projects" on public.projects;
create policy "Users can view own projects" on public.projects
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can insert own projects" on public.projects;
create policy "Users can insert own projects" on public.projects
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects" on public.projects
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects" on public.projects
  for delete to authenticated using (auth.uid() = user_id);

-- Tasks RLS
drop policy if exists "Users can view own tasks" on public.tasks;
create policy "Users can view own tasks" on public.tasks
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can insert own tasks" on public.tasks;
create policy "Users can insert own tasks" on public.tasks
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update own tasks" on public.tasks;
create policy "Users can update own tasks" on public.tasks
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own tasks" on public.tasks;
create policy "Users can delete own tasks" on public.tasks
  for delete to authenticated using (auth.uid() = user_id);

-- Audit Logs RLS
drop policy if exists "Users can view own audit logs" on public.audit_logs;
create policy "Users can view own audit logs" on public.audit_logs
  for select to authenticated using (auth.uid() = user_id);

-- Chat Messages RLS
drop policy if exists "Users can view own chat messages" on public.chat_messages;
create policy "Users can view own chat messages" on public.chat_messages
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can insert own chat messages" on public.chat_messages;
create policy "Users can insert own chat messages" on public.chat_messages
  for insert to authenticated with check (auth.uid() = user_id);

-- 12. Create DASHBOARD_STATS view
create or replace view public.dashboard_stats as
select
  p.user_id,
  count(distinct p.id) as total_projects,
  count(distinct p.id) filter (where p.status = 'IN_PROGRESS') as projects_in_progress,
  count(t.id) as total_tasks,
  count(t.id) filter (where t.status = 'COMPLETED') as completed_tasks,
  count(t.id) filter (where t.status != 'COMPLETED') as pending_tasks
from public.projects p
left join public.tasks t on t.project_id = p.id
group by p.user_id;

alter view public.dashboard_stats set (security_invoker = true);

-- 13. Grant only the permissions required by the application.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all routines in schema public from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select on public.audit_logs, public.chat_messages, public.dashboard_stats to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;

-- 14. Reload PostgREST schema cache
notify pgrst, 'reload schema';

commit;
