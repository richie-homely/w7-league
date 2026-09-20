-- ── Standby subs: players who want to be called on (20 Sep 2026, Richie) ────────────────────
-- Richie: "players who aren't in the box league but they want to put their name down to be an
-- active sub ... based on their Playtomic rating they can be on our list of standby, so if
-- someone needs to book a fixture but doesn't have a player, if one player's away they can take
-- a sub in from the roster ... and a link to register your name as a sub that we can post to the
-- community."
--
-- Anyone can put their name down from the public page; nothing is auto-approved and nothing is
-- shown publicly. Teams looking for a sub see a name, a rating and when that person can play —
-- never an email or a phone number. Contact happens through the league's own email, so a sub's
-- details are never handed to a member and a member's are never handed to a sub.
--
--   sub_roster_join(name, email, phone, rating, plays, note)  -> ok | bad_input | already_on
--   sub_roster_for(p_rating, p_within)                        -> eligible subs, no contact details
--   sub_roster_admin(p_key)                                   -> the full list with contacts
create table if not exists public.sub_roster (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text not null default '',
  rating      numeric(4,2),                    -- Playtomic level as given; W7 checks it
  plays       text not null default '',        -- when they can play, in their own words
  note        text not null default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index if not exists sub_roster_email_idx on public.sub_roster (lower(email));
alter table public.sub_roster enable row level security;   -- no policies: RPC only

-- Put your name down. Deliberately forgiving about the rating: plenty of people do not know
-- theirs, and a missing rating is better than a made-up one — W7 fills it in from Playtomic.
create or replace function public.sub_roster_join(
  p_name text, p_email text, p_phone text, p_rating numeric, p_plays text, p_note text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_name is null or length(trim(p_name)) < 3 then return 'bad_input'; end if;
  if p_email is null or position('@' in p_email) = 0 then return 'bad_input'; end if;
  if p_rating is not null and (p_rating < 0 or p_rating > 7) then return 'bad_input'; end if;
  if exists (select 1 from public.sub_roster where lower(email) = lower(trim(p_email))) then
    update public.sub_roster
       set name = trim(p_name), phone = coalesce(trim(p_phone), ''), rating = p_rating,
           plays = coalesce(trim(p_plays), ''), note = coalesce(trim(p_note), ''), active = true
     where lower(email) = lower(trim(p_email));
    return 'already_on';
  end if;
  insert into public.sub_roster (name, email, phone, rating, plays, note)
  values (trim(p_name), lower(trim(p_email)), coalesce(trim(p_phone), ''), p_rating,
          coalesce(trim(p_plays), ''), coalesce(trim(p_note), ''));
  return 'ok';
end;
$$;
grant execute on function public.sub_roster_join(text, text, text, numeric, text, text) to anon, authenticated;

-- Who could stand in for a player of this rating. The league rule is 0.75 either way
-- (box/rules), so the default matches it. No contact details ever leave this function.
create or replace function public.sub_roster_for(p_rating numeric, p_within numeric default 0.75)
returns table (name text, rating numeric, plays text)
language sql
security definer
set search_path = public
as $$
  select s.name, s.rating, s.plays
    from public.sub_roster s
   where s.active
     and (p_rating is null or s.rating is null or abs(s.rating - p_rating) <= p_within)
   order by case when s.rating is null then 1 else 0 end, abs(coalesce(s.rating, 0) - coalesce(p_rating, 0)), s.name;
$$;
grant execute on function public.sub_roster_for(numeric, numeric) to anon, authenticated;

-- The full list, contacts included, for W7 only.
create or replace function public.sub_roster_admin(p_key text)
returns table (id uuid, name text, email text, phone text, rating numeric, plays text, note text,
               active boolean, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.site_admin_keys where key = p_key) then
    return;
  end if;
  return query
    select s.id, s.name, s.email, s.phone, s.rating, s.plays, s.note, s.active, s.created_at
      from public.sub_roster s order by s.created_at desc;
end;
$$;
grant execute on function public.sub_roster_admin(text) to anon, authenticated;
notify pgrst, 'reload schema';
