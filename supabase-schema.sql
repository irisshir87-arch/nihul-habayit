-- ניהול הבית – משפחת זילכה
-- מריצים פעם אחת ב-Supabase: SQL Editor > New query > Run

create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.household_state (
  household_id uuid primary key references public.households(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.households (id, name)
values ('6f0b65b4-4039-4e4b-9620-354ae31dc778', 'משפחת זילכה')
on conflict (id) do update set name = excluded.name;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_state enable row level security;

-- המשתמש רואה רק את רשומת החברות שלו.
drop policy if exists "members_read_own_membership" on public.household_members;
create policy "members_read_own_membership"
on public.household_members
for select
to authenticated
using (user_id = auth.uid());

-- ניתן לראות את הבית רק אם המשתמש חבר בו.
drop policy if exists "members_read_household" on public.households;
create policy "members_read_household"
on public.households
for select
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = households.id
      and hm.user_id = auth.uid()
  )
);

-- קריאה, יצירה ועדכון של המידע המשותף מותרים רק לחברי הבית.
drop policy if exists "members_read_household_state" on public.household_state;
create policy "members_read_household_state"
on public.household_state
for select
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = household_state.household_id
      and hm.user_id = auth.uid()
  )
);

drop policy if exists "members_insert_household_state" on public.household_state;
create policy "members_insert_household_state"
on public.household_state
for insert
to authenticated
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.household_members hm
    where hm.household_id = household_state.household_id
      and hm.user_id = auth.uid()
  )
);

drop policy if exists "members_update_household_state" on public.household_state;
create policy "members_update_household_state"
on public.household_state
for update
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = household_state.household_id
      and hm.user_id = auth.uid()
  )
)
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.household_members hm
    where hm.household_id = household_state.household_id
      and hm.user_id = auth.uid()
  )
);

grant usage on schema public to authenticated;
grant select on public.households, public.household_members, public.household_state to authenticated;
grant insert, update on public.household_state to authenticated;

-- הפעלת עדכונים בזמן אמת לטבלה המשותפת.
do $$
begin
  alter publication supabase_realtime add table public.household_state;
exception
  when duplicate_object then null;
end $$;
