-- Supabase schema for 每日任务闭环日历
-- Run this SQL in Supabase SQL Editor.
-- Current product mode:
-- 1. Users enter with a display name, no email/password UI.
-- 2. Everyone can switch to any user's personal board.
-- 3. Everyone can create/edit/delete tasks and reviews on the currently selected personal board.

create extension if not exists "pgcrypto";

create table if not exists public.public_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.public_profiles add column if not exists display_name text;
alter table public.public_profiles add column if not exists email text;

alter table public.tasks add column if not exists type text not null default 'daily';
do $$
begin
  begin
    alter table public.tasks add constraint tasks_type_check check (type in ('daily', 'checkin'));
  exception when duplicate_object then null;
  end;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.public_profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email, '匿名用户'),
    new.email
  )
  on conflict (id) do update set
    display_name = coalesce(excluded.display_name, public.public_profiles.display_name),
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();

insert into public.public_profiles (id, display_name, email)
select id, coalesce(raw_user_meta_data ->> 'display_name', email, '匿名用户'), email from auth.users
on conflict (id) do update set
  display_name = coalesce(excluded.display_name, public.public_profiles.display_name),
  email = excluded.email,
  updated_at = now();

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  date date not null,
  status text not null check (status in ('todo', 'in_progress', 'completed', 'postponed')),
  priority text not null check (priority in ('high', 'medium', 'low')),
  type text not null default 'daily' check (type in ('daily', 'checkin')),
  tags text[] not null default '{}',
  postponed_from date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.day_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  date date not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, workspace_id, date)
);

create table if not exists public.checkin_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  priority text not null check (priority in ('high', 'medium', 'low')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.checkin_records (
  id uuid primary key default gen_random_uuid(),
  checkin_task_id uuid not null references public.checkin_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (checkin_task_id, date)
);

alter table public.public_profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.day_reviews enable row level security;
alter table public.checkin_tasks enable row level security;
alter table public.checkin_records enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id and user_id = auth.uid()
  );
$$;

create or replace function public.workspace_role(target_workspace_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select role from public.workspace_members
  where workspace_id = target_workspace_id and user_id = auth.uid()
  limit 1;
$$;

drop policy if exists "profiles visible to authenticated users" on public.public_profiles;
create policy "profiles visible to authenticated users"
  on public.public_profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "profiles insert own" on public.public_profiles;
create policy "profiles insert own"
  on public.public_profiles for insert
  with check (id = auth.uid());

drop policy if exists "profiles update own" on public.public_profiles;
create policy "profiles update own"
  on public.public_profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "tasks select public personal progress or workspace member" on public.tasks;
drop policy if exists "tasks select personal or workspace member" on public.tasks;
create policy "tasks select public personal progress or workspace member"
  on public.tasks for select
  using (
    workspace_id is null
    or (workspace_id is not null and public.is_workspace_member(workspace_id))
  );

drop policy if exists "tasks insert personal or workspace editor" on public.tasks;
create policy "tasks insert personal or workspace editor"
  on public.tasks for insert
  with check (
    auth.role() = 'authenticated'
    and (
      workspace_id is null
      or public.workspace_role(workspace_id) in ('owner', 'editor')
    )
  );

drop policy if exists "tasks update owner personal or workspace editor" on public.tasks;
drop policy if exists "tasks update own personal or workspace editor" on public.tasks;
create policy "tasks update own personal or workspace editor"
  on public.tasks for update
  using (
    (workspace_id is null and auth.role() = 'authenticated')
    or (workspace_id is not null and public.workspace_role(workspace_id) in ('owner', 'editor'))
  )
  with check (
    auth.role() = 'authenticated'
    and (
      workspace_id is null
      or public.workspace_role(workspace_id) in ('owner', 'editor')
    )
  );

drop policy if exists "tasks delete owner personal or workspace editor" on public.tasks;
drop policy if exists "tasks delete own personal or workspace editor" on public.tasks;
create policy "tasks delete own personal or workspace editor"
  on public.tasks for delete
  using (
    (workspace_id is null and auth.role() = 'authenticated')
    or (workspace_id is not null and public.workspace_role(workspace_id) in ('owner', 'editor'))
  );

drop policy if exists "reviews select public personal progress or workspace member" on public.day_reviews;
drop policy if exists "reviews select personal or workspace member" on public.day_reviews;
create policy "reviews select public personal progress or workspace member"
  on public.day_reviews for select
  using (
    workspace_id is null
    or (workspace_id is not null and public.is_workspace_member(workspace_id))
  );

drop policy if exists "reviews insert personal or workspace editor" on public.day_reviews;
create policy "reviews insert personal or workspace editor"
  on public.day_reviews for insert
  with check (
    auth.role() = 'authenticated'
    and (
      workspace_id is null
      or public.workspace_role(workspace_id) in ('owner', 'editor')
    )
  );

drop policy if exists "reviews update personal or workspace editor" on public.day_reviews;
drop policy if exists "reviews update own personal or workspace editor" on public.day_reviews;
create policy "reviews update own personal or workspace editor"
  on public.day_reviews for update
  using (
    (workspace_id is null and auth.role() = 'authenticated')
    or (workspace_id is not null and public.workspace_role(workspace_id) in ('owner', 'editor'))
  )
  with check (
    auth.role() = 'authenticated'
    and (
      workspace_id is null
      or public.workspace_role(workspace_id) in ('owner', 'editor')
    )
  );

drop policy if exists "reviews delete personal or workspace editor" on public.day_reviews;
drop policy if exists "reviews delete own personal or workspace editor" on public.day_reviews;
create policy "reviews delete own personal or workspace editor"
  on public.day_reviews for delete
  using (
    (workspace_id is null and auth.role() = 'authenticated')
    or (workspace_id is not null and public.workspace_role(workspace_id) in ('owner', 'editor'))
  );

drop policy if exists "checkin tasks select authenticated" on public.checkin_tasks;
create policy "checkin tasks select authenticated"
  on public.checkin_tasks for select
  using (auth.role() = 'authenticated');

drop policy if exists "checkin tasks insert authenticated" on public.checkin_tasks;
create policy "checkin tasks insert authenticated"
  on public.checkin_tasks for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "checkin tasks update authenticated" on public.checkin_tasks;
create policy "checkin tasks update authenticated"
  on public.checkin_tasks for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "checkin tasks delete authenticated" on public.checkin_tasks;
create policy "checkin tasks delete authenticated"
  on public.checkin_tasks for delete
  using (auth.role() = 'authenticated');

drop policy if exists "checkin records select authenticated" on public.checkin_records;
create policy "checkin records select authenticated"
  on public.checkin_records for select
  using (auth.role() = 'authenticated');

drop policy if exists "checkin records insert authenticated" on public.checkin_records;
create policy "checkin records insert authenticated"
  on public.checkin_records for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "checkin records update authenticated" on public.checkin_records;
create policy "checkin records update authenticated"
  on public.checkin_records for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "checkin records delete authenticated" on public.checkin_records;
create policy "checkin records delete authenticated"
  on public.checkin_records for delete
  using (auth.role() = 'authenticated');

drop policy if exists "workspaces select members" on public.workspaces;
create policy "workspaces select members"
  on public.workspaces for select
  using (public.is_workspace_member(id));

drop policy if exists "workspaces insert owner" on public.workspaces;
create policy "workspaces insert owner"
  on public.workspaces for insert
  with check (owner_id = auth.uid());

drop policy if exists "workspaces update owner" on public.workspaces;
create policy "workspaces update owner"
  on public.workspaces for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "workspaces delete owner" on public.workspaces;
create policy "workspaces delete owner"
  on public.workspaces for delete
  using (owner_id = auth.uid());

drop policy if exists "members select same workspace members" on public.workspace_members;
create policy "members select same workspace members"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "members insert owner" on public.workspace_members;
create policy "members insert owner"
  on public.workspace_members for insert
  with check (public.workspace_role(workspace_id) = 'owner');

drop policy if exists "members update owner" on public.workspace_members;
create policy "members update owner"
  on public.workspace_members for update
  using (public.workspace_role(workspace_id) = 'owner')
  with check (public.workspace_role(workspace_id) = 'owner');

drop policy if exists "members delete owner" on public.workspace_members;
create policy "members delete owner"
  on public.workspace_members for delete
  using (public.workspace_role(workspace_id) = 'owner');

do $$
begin
  begin
    alter publication supabase_realtime add table public.tasks;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.day_reviews;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.checkin_tasks;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.checkin_records;
  exception when duplicate_object then null;
  end;
end $$;
