begin;

create schema if not exists private;
revoke all on schema private from public;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'profile_sex'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.profile_sex as enum ('male', 'female');
  end if;
end
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  body_weight_kg numeric(6, 2),
  sex public.profile_sex,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint profiles_display_name_check check (
    display_name is null
    or (
      display_name = btrim(display_name)
      and char_length(display_name) between 2 and 50
    )
  ),
  constraint profiles_body_weight_check check (
    body_weight_kg is null
    or body_weight_kg > 0 and body_weight_kg <= 500
  ),
  constraint profiles_completion_check check (
    completed_at is null
    or (
      display_name is not null
      and body_weight_kg is not null
      and sex is not null
    )
  )
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ends_at timestamptz,
  constraint sessions_name_check check (
    name = btrim(name)
    and char_length(name) between 1 and 80
  ),
  constraint sessions_lifecycle_check check (
    (started_at is null and ends_at is null)
    or (
      started_at is not null
      and ends_at = started_at + interval '18 hours'
    )
  )
);

create table if not exists public.session_participants (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete restrict,
  display_name text not null,
  distribution_mass_kg numeric(8, 3) not null,
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id),
  constraint session_participants_display_name_check check (
    display_name = btrim(display_name)
    and char_length(display_name) between 2 and 50
  ),
  constraint session_participants_distribution_mass_check check (
    distribution_mass_kg > 0
  )
);

create table if not exists public.drinks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null,
  volume_ml numeric(8, 2) not null,
  abv numeric(5, 2) not null,
  consumed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint drinks_participant_fkey
    foreign key (session_id, user_id)
    references public.session_participants (session_id, user_id)
    on delete restrict,
  constraint drinks_volume_check check (volume_ml > 0 and volume_ml <= 10000),
  constraint drinks_abv_check check (abv > 0 and abv <= 100)
);

create index if not exists sessions_created_by_idx
  on public.sessions (created_by, created_at desc);

create index if not exists sessions_ends_at_idx
  on public.sessions (ends_at)
  where ends_at is not null;

create index if not exists session_participants_user_id_idx
  on public.session_participants (user_id, session_id);

create index if not exists drinks_session_consumed_at_idx
  on public.drinks (session_id, consumed_at);

create index if not exists drinks_user_consumed_at_idx
  on public.drinks (user_id, consumed_at);

create or replace function private.current_user_is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin',
    false
  );
$$;

create or replace function private.can_read_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sessions as s
    where s.id = p_session_id
      and (
        (
          s.created_by = (select auth.uid())
          and private.current_user_is_admin()
        )
        or (
          s.started_at is not null
          and now() < s.ends_at
          and exists (
            select 1
            from public.session_participants as sp
            where sp.session_id = s.id
              and sp.user_id = (select auth.uid())
          )
        )
      )
  );
$$;

create or replace function private.user_has_active_session(
  p_user_id uuid,
  p_excluded_session_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sessions as s
    where s.started_at is not null
      and now() < s.ends_at
      and (p_excluded_session_id is null or s.id <> p_excluded_session_id)
      and (
        s.created_by = p_user_id
        or exists (
          select 1
          from public.session_participants as sp
          where sp.session_id = s.id
            and sp.user_id = p_user_id
        )
      )
  );
$$;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
  v_weight_text text;
  v_body_weight numeric;
  v_sex public.profile_sex;
begin
  v_display_name := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');

  if v_display_name is not null
    and char_length(v_display_name) not between 2 and 50 then
    v_display_name := null;
  end if;

  v_weight_text := new.raw_user_meta_data ->> 'body_weight_kg';

  if v_weight_text ~ '^[0-9]+([.][0-9]+)?$'
    and v_weight_text::numeric > 0
    and v_weight_text::numeric <= 500 then
    v_body_weight := v_weight_text::numeric;
  end if;

  if new.raw_user_meta_data ->> 'sex' in ('male', 'female') then
    v_sex := (new.raw_user_meta_data ->> 'sex')::public.profile_sex;
  end if;

  insert into public.profiles (
    user_id,
    display_name,
    body_weight_kg,
    sex,
    completed_at
  )
  values (
    new.id,
    v_display_name,
    v_body_weight,
    v_sex,
    case
      when v_display_name is not null
        and v_body_weight is not null
        and v_sex is not null
      then now()
      else null
    end
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

with parsed as (
  select
    u.id as user_id,
    case
      when char_length(btrim(u.raw_user_meta_data ->> 'display_name')) between 2 and 50
      then btrim(u.raw_user_meta_data ->> 'display_name')
      else null
    end as display_name,
    case
      when (u.raw_user_meta_data ->> 'body_weight_kg') ~ '^[0-9]+([.][0-9]+)?$'
        and (u.raw_user_meta_data ->> 'body_weight_kg')::numeric > 0
        and (u.raw_user_meta_data ->> 'body_weight_kg')::numeric <= 500
      then (u.raw_user_meta_data ->> 'body_weight_kg')::numeric
      else null
    end as body_weight_kg,
    case
      when u.raw_user_meta_data ->> 'sex' in ('male', 'female')
      then (u.raw_user_meta_data ->> 'sex')::public.profile_sex
      else null
    end as sex
  from auth.users as u
)
insert into public.profiles (
  user_id,
  display_name,
  body_weight_kg,
  sex,
  completed_at
)
select
  parsed.user_id,
  parsed.display_name,
  parsed.body_weight_kg,
  parsed.sex,
  case
    when parsed.display_name is not null
      and parsed.body_weight_kg is not null
      and parsed.sex is not null
    then now()
    else null
  end
from parsed
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.drinks enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.sessions from anon, authenticated;
revoke all on table public.session_participants from anon, authenticated;
revoke all on table public.drinks from anon, authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.sessions to authenticated;
grant select on table public.session_participants to authenticated;
grant select on table public.drinks to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.sessions to service_role;
grant all on table public.session_participants to service_role;
grant all on table public.drinks to service_role;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own
  on public.profiles
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
  );

drop policy if exists sessions_read_allowed on public.sessions;
create policy sessions_read_allowed
  on public.sessions
  for select
  to authenticated
  using (private.can_read_session(id));

drop policy if exists session_participants_read_allowed
  on public.session_participants;
create policy session_participants_read_allowed
  on public.session_participants
  for select
  to authenticated
  using (private.can_read_session(session_id));

drop policy if exists drinks_read_allowed on public.drinks;
create policy drinks_read_allowed
  on public.drinks
  for select
  to authenticated
  using (private.can_read_session(session_id));

create or replace function public.complete_profile(
  p_display_name text,
  p_body_weight_kg numeric,
  p_sex text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_display_name text := btrim(p_display_name);
  v_sex public.profile_sex;
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if v_display_name is null
    or char_length(v_display_name) not between 2 and 50 then
    raise exception 'Display name must contain between 2 and 50 characters.'
      using errcode = '22023';
  end if;

  if p_body_weight_kg is null
    or p_body_weight_kg <= 0
    or p_body_weight_kg > 500 then
    raise exception 'Body weight must be greater than 0 and no more than 500 kg.'
      using errcode = '22023';
  end if;

  if p_sex is null or p_sex not in ('male', 'female') then
    raise exception 'Sex must be male or female.' using errcode = '22023';
  end if;

  v_sex := p_sex::public.profile_sex;

  insert into public.profiles (
    user_id,
    display_name,
    body_weight_kg,
    sex,
    completed_at
  )
  values (
    v_user_id,
    v_display_name,
    p_body_weight_kg,
    v_sex,
    now()
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        body_weight_kg = excluded.body_weight_kg,
        sex = excluded.sex,
        completed_at = excluded.completed_at
    where public.profiles.completed_at is null
  returning * into v_profile;

  if v_profile.user_id is null then
    raise exception 'The profile has already been completed.' using errcode = '23505';
  end if;

  return v_profile;
end;
$$;

create or replace function public.list_selectable_users()
returns table (
  user_id uuid,
  display_name text,
  email text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.current_user_is_admin() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  return query
    select p.user_id, p.display_name, u.email::text
    from public.profiles as p
    join auth.users as u on u.id = p.user_id
    where p.completed_at is not null
      and u.email is not null
    order by lower(p.display_name), lower(u.email);
end;
$$;

create or replace function public.create_session(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(p_name);
  v_session_id uuid;
begin
  if v_user_id is null or not private.current_user_is_admin() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  if v_name is null or char_length(v_name) not between 1 and 80 then
    raise exception 'Session name must contain between 1 and 80 characters.'
      using errcode = '22023';
  end if;

  insert into public.sessions (name, created_by)
  values (v_name, v_user_id)
  returning id into v_session_id;

  return v_session_id;
end;
$$;

create or replace function public.delete_draft_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.current_user_is_admin() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  delete from public.sessions
  where id = p_session_id
    and created_by = auth.uid()
    and started_at is null;

  if not found then
    raise exception 'Draft session was not found or cannot be deleted.'
      using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.add_session_participant(
  p_session_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_started_at timestamptz;
  v_ends_at timestamptz;
  v_display_name text;
  v_body_weight_kg numeric;
  v_sex public.profile_sex;
begin
  if auth.uid() is null or not private.current_user_is_admin() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(20260928, 1);

  select s.started_at, s.ends_at
    into v_started_at, v_ends_at
  from public.sessions as s
  where s.id = p_session_id
    and s.created_by = auth.uid()
  for update;

  if not found then
    raise exception 'Session was not found.' using errcode = 'P0002';
  end if;

  if v_started_at is not null and now() >= v_ends_at then
    raise exception 'Closed sessions cannot accept participants.'
      using errcode = '55000';
  end if;

  if v_started_at is not null
    and private.user_has_active_session(p_user_id, p_session_id) then
    raise exception 'The selected user already has another active session.'
      using errcode = '23505';
  end if;

  select p.display_name, p.body_weight_kg, p.sex
    into v_display_name, v_body_weight_kg, v_sex
  from public.profiles as p
  where p.user_id = p_user_id
    and p.completed_at is not null;

  if not found then
    raise exception 'The selected user must complete their profile first.'
      using errcode = '23514';
  end if;

  insert into public.session_participants (
    session_id,
    user_id,
    display_name,
    distribution_mass_kg
  )
  values (
    p_session_id,
    p_user_id,
    v_display_name,
    v_body_weight_kg * case when v_sex = 'male' then 0.68 else 0.55 end
  )
  on conflict (session_id, user_id) do nothing;
end;
$$;

create or replace function public.remove_draft_participant(
  p_session_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.current_user_is_admin() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.sessions as s
    where s.id = p_session_id
      and s.created_by = auth.uid()
      and s.started_at is null
  ) then
    raise exception 'Participants can only be removed from an owned draft.'
      using errcode = '55000';
  end if;

  delete from public.session_participants
  where session_id = p_session_id
    and user_id = p_user_id;
end;
$$;

create or replace function public.start_session(p_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_conflicting_user_id uuid;
  v_session public.sessions;
begin
  if auth.uid() is null or not private.current_user_is_admin() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(20260928, 1);

  select s.*
    into v_session
  from public.sessions as s
  where s.id = p_session_id
    and s.created_by = auth.uid()
  for update;

  if not found then
    raise exception 'Session was not found.' using errcode = 'P0002';
  end if;

  if v_session.started_at is not null then
    raise exception 'The session has already started.' using errcode = '55000';
  end if;

  if not exists (
    select 1
    from public.session_participants as sp
    where sp.session_id = p_session_id
  ) then
    raise exception 'Select at least one participant before starting.'
      using errcode = '23514';
  end if;

  if private.user_has_active_session(auth.uid(), p_session_id) then
    raise exception 'You already own or participate in another active session.'
      using errcode = '23505';
  end if;

  select sp.user_id
    into v_conflicting_user_id
  from public.session_participants as sp
  where sp.session_id = p_session_id
    and private.user_has_active_session(sp.user_id, p_session_id)
  limit 1;

  if v_conflicting_user_id is not null then
    raise exception 'A selected participant already has another active session.'
      using errcode = '23505';
  end if;

  update public.sessions
  set started_at = v_now,
      ends_at = v_now + interval '18 hours'
  where id = p_session_id
  returning * into v_session;

  return v_session;
end;
$$;

create or replace function public.log_drink(
  p_session_id uuid,
  p_volume_ml numeric,
  p_abv numeric
)
returns public.drinks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_drink public.drinks;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if p_volume_ml is null or p_volume_ml <= 0 or p_volume_ml > 10000 then
    raise exception 'Drink volume must be greater than 0 and no more than 10000 ml.'
      using errcode = '22023';
  end if;

  if p_abv is null or p_abv <= 0 or p_abv > 100 then
    raise exception 'ABV must be greater than 0 and no more than 100 percent.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.sessions as s
    join public.session_participants as sp
      on sp.session_id = s.id
     and sp.user_id = v_user_id
    where s.id = p_session_id
      and s.started_at is not null
      and v_now >= s.started_at
      and v_now < s.ends_at
  ) then
    raise exception 'You are not a participant in an active session.'
      using errcode = '42501';
  end if;

  insert into public.drinks (
    session_id,
    user_id,
    volume_ml,
    abv,
    consumed_at
  )
  values (
    p_session_id,
    v_user_id,
    p_volume_ml,
    p_abv,
    v_now
  )
  returning * into v_drink;

  return v_drink;
end;
$$;

revoke all on function public.complete_profile(text, numeric, text) from public, anon;
revoke all on function public.list_selectable_users() from public, anon;
revoke all on function public.create_session(text) from public, anon;
revoke all on function public.delete_draft_session(uuid) from public, anon;
revoke all on function public.add_session_participant(uuid, uuid) from public, anon;
revoke all on function public.remove_draft_participant(uuid, uuid) from public, anon;
revoke all on function public.start_session(uuid) from public, anon;
revoke all on function public.log_drink(uuid, numeric, numeric) from public, anon;

grant execute on function public.complete_profile(text, numeric, text) to authenticated;
grant execute on function public.list_selectable_users() to authenticated;
grant execute on function public.create_session(text) to authenticated;
grant execute on function public.delete_draft_session(uuid) to authenticated;
grant execute on function public.add_session_participant(uuid, uuid) to authenticated;
grant execute on function public.remove_draft_participant(uuid, uuid) to authenticated;
grant execute on function public.start_session(uuid) to authenticated;
grant execute on function public.log_drink(uuid, numeric, numeric) to authenticated;

revoke all on function private.current_user_is_admin() from public, anon;
revoke all on function private.can_read_session(uuid) from public, anon;
revoke all on function private.user_has_active_session(uuid, uuid) from public, anon;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

grant usage on schema private to authenticated;
grant execute on function private.current_user_is_admin() to authenticated;
grant execute on function private.can_read_session(uuid) to authenticated;

do $$
declare
  v_table_name text;
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    execute 'create publication supabase_realtime';
  end if;

  foreach v_table_name in array array['sessions', 'session_participants', 'drinks']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        v_table_name
      );
    end if;
  end loop;
end
$$;

commit;
