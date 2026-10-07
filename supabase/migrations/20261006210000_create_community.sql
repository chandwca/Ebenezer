-- Together community: friends, groups, posts, comments, prayers and private prayer links.
-- Design: docs/community-data-model.md. Tables are deny-by-default (RLS on, no table grants);
-- every read and write goes through the SECURITY DEFINER functions below, which derive the
-- actor from auth.uid() and enforce visibility. Functions return JSON in the shared contract
-- shapes so Node validates rather than reshapes.

-- ---------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------
create table ebenezer_api.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references ebenezer_api.profiles (id) on delete cascade,
  recipient_id uuid not null references ebenezer_api.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connections_not_self check (requester_id <> recipient_id)
);
create unique index connections_pair on ebenezer_api.connections
  (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create index connections_recipient on ebenezer_api.connections (recipient_id);

create table ebenezer_api.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references ebenezer_api.profiles (id) on delete restrict,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  meeting_note text check (char_length(meeting_note) between 1 and 200),
  visibility text not null check (visibility in ('open', 'private')),
  member_count integer not null default 0,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index groups_owner on ebenezer_api.groups (owner_id);
create index groups_open on ebenezer_api.groups (member_count desc, id) where visibility = 'open';

create table ebenezer_api.group_members (
  group_id uuid not null references ebenezer_api.groups (id) on delete cascade,
  user_id uuid not null references ebenezer_api.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null check (status in ('invited', 'active')),
  invited_by uuid references ebenezer_api.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  joined_at timestamptz,
  primary key (group_id, user_id)
);
create index group_members_user on ebenezer_api.group_members (user_id, status);

create table ebenezer_api.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references ebenezer_api.profiles (id) on delete cascade,
  kind text not null check (kind in ('experience', 'stone', 'prayer_request')),
  audience text not null check (audience in ('community', 'group', 'people')),
  group_id uuid references ebenezer_api.groups (id) on delete cascade,
  body text not null check (body = btrim(body) and char_length(body) between 1 and 4000),
  scripture_reference text check (char_length(scripture_reference) between 1 and 120),
  scripture_text text check (char_length(scripture_text) between 1 and 2000),
  tone text check (tone in ('bright', 'mixed', 'hard')),
  prayer_count integer not null default 0,
  comment_count integer not null default 0,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint posts_group_audience check ((audience = 'group') = (group_id is not null)),
  constraint posts_stone_scripture check (kind <> 'stone' or scripture_reference is not null)
);
create index posts_community_feed on ebenezer_api.posts (created_at desc, id desc)
  where audience = 'community' and deleted_at is null;
create index posts_group_feed on ebenezer_api.posts (group_id, created_at desc, id desc)
  where deleted_at is null;
create index posts_author on ebenezer_api.posts (author_id, created_at desc, id desc);

create table ebenezer_api.post_recipients (
  post_id uuid not null references ebenezer_api.posts (id) on delete cascade,
  user_id uuid not null references ebenezer_api.profiles (id) on delete cascade,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (post_id, user_id)
);
create index post_recipients_user on ebenezer_api.post_recipients (user_id, post_id)
  where revoked_at is null;

create table ebenezer_api.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references ebenezer_api.posts (id) on delete cascade,
  author_id uuid not null references ebenezer_api.profiles (id) on delete cascade,
  body text not null check (body = btrim(body) and char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index comments_post on ebenezer_api.comments (post_id, created_at, id);

create table ebenezer_api.prayer_links (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references ebenezer_api.posts (id) on delete cascade,
  token_hash bytea not null unique,
  label text not null check (label = btrim(label) and char_length(label) between 1 and 120),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index prayer_links_post on ebenezer_api.prayer_links (post_id);

create table ebenezer_api.prayers (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references ebenezer_api.posts (id) on delete cascade,
  user_id uuid references ebenezer_api.profiles (id) on delete cascade,
  prayer_link_id uuid references ebenezer_api.prayer_links (id) on delete cascade,
  note text check (char_length(note) between 1 and 500),
  created_at timestamptz not null default now(),
  constraint prayers_one_source check (num_nonnulls(user_id, prayer_link_id) = 1),
  constraint prayers_member_once unique (post_id, user_id),
  constraint prayers_link_once unique (prayer_link_id)
);

create table ebenezer_private.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references ebenezer_api.profiles (id) on delete cascade,
  post_id uuid references ebenezer_api.posts (id) on delete set null,
  reason text not null check (reason in ('spam', 'harmful', 'inappropriate', 'other')),
  detail text check (char_length(detail) <= 2000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved')),
  created_at timestamptz not null default now(),
  constraint reports_once unique (reporter_id, post_id)
);

do $$
declare t text;
begin
  foreach t in array array['connections', 'groups', 'group_members', 'posts', 'post_recipients',
                           'comments', 'prayer_links', 'prayers'] loop
    execute format('alter table ebenezer_api.%I enable row level security', t);
    execute format('revoke all on ebenezer_api.%I from public, anon, authenticated', t);
  end loop;
end $$;
alter table ebenezer_private.reports enable row level security;
revoke all on ebenezer_private.reports from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- Counters (same transaction as the change, so board cards never COUNT(*))
-- ---------------------------------------------------------------------------------------
create function ebenezer_private.count_prayers() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update ebenezer_api.posts set prayer_count = prayer_count + case when tg_op = 'INSERT' then 1 else -1 end
  where id = coalesce(new.post_id, old.post_id);
  return null;
end $$;
create trigger prayers_count after insert or delete on ebenezer_api.prayers
  for each row execute function ebenezer_private.count_prayers();

create function ebenezer_private.count_comments() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update ebenezer_api.posts set comment_count = comment_count + case when tg_op = 'INSERT' then 1 else -1 end
  where id = coalesce(new.post_id, old.post_id);
  return null;
end $$;
create trigger comments_count after insert or delete on ebenezer_api.comments
  for each row execute function ebenezer_private.count_comments();

create function ebenezer_private.count_members() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update ebenezer_api.groups g set member_count = (
    select count(*) from ebenezer_api.group_members m where m.group_id = g.id and m.status = 'active')
  where g.id = coalesce(new.group_id, old.group_id);
  return null;
end $$;
create trigger group_members_count after insert or update of status or delete on ebenezer_api.group_members
  for each row execute function ebenezer_private.count_members();

revoke all on function ebenezer_private.count_prayers(), ebenezer_private.count_comments(),
  ebenezer_private.count_members() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- Private helpers
-- ---------------------------------------------------------------------------------------
-- Error codes Node maps to HTTP: P0002 not found, 42501 forbidden, 22023 invalid,
-- 55000 conflicting state, EB428 community profile required.
create function ebenezer_private.current_member() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Sign in to use the community.' using errcode = '42501';
  end if;
  if not exists (select 1 from ebenezer_api.profiles where id = actor) then
    raise exception 'Create your community profile first.' using errcode = 'EB428';
  end if;
  return actor;
end $$;

create function ebenezer_private.is_active_member(target uuid, actor uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from ebenezer_api.group_members
                 where group_id = target and user_id = actor and status = 'active')
$$;

create function ebenezer_private.group_manager(target uuid, actor uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from ebenezer_api.groups where id = target and owner_id = actor)
      or exists (select 1 from ebenezer_api.group_members
                 where group_id = target and user_id = actor and status = 'active' and role = 'admin')
$$;

create function ebenezer_private.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from ebenezer_api.connections
                 where least(requester_id, recipient_id) = least(a, b)
                   and greatest(requester_id, recipient_id) = greatest(a, b)
                   and status = 'accepted')
$$;

create function ebenezer_private.can_see_post(p ebenezer_api.posts, actor uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p.deleted_at is null and (
       p.author_id = actor
    or p.audience = 'community'
    or (p.audience = 'group' and ebenezer_private.is_active_member(p.group_id, actor))
    or (p.audience = 'people' and exists (
          select 1 from ebenezer_api.post_recipients r
          where r.post_id = p.id and r.user_id = actor and r.revoked_at is null)))
$$;

create function ebenezer_private.visible_post(target uuid, actor uuid) returns ebenezer_api.posts
language plpgsql stable security definer set search_path = '' as $$
declare p ebenezer_api.posts;
begin
  select * into p from ebenezer_api.posts where id = target;
  if not found or not ebenezer_private.can_see_post(p, actor) then
    raise exception 'Post not found.' using errcode = 'P0002';
  end if;
  return p;
end $$;

create function ebenezer_private.person_json(person uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', id, 'displayName', display_name, 'handle', handle)
  from ebenezer_api.profiles where id = person
$$;

create function ebenezer_private.post_json(p ebenezer_api.posts, viewer uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', p.id,
    'author', ebenezer_private.person_json(p.author_id),
    'kind', p.kind,
    'audience', p.audience,
    'group', (select jsonb_build_object('id', g.id, 'name', g.name)
              from ebenezer_api.groups g where g.id = p.group_id),
    'body', p.body,
    'scriptureReference', p.scripture_reference,
    'scriptureText', p.scripture_text,
    'tone', p.tone,
    'prayerCount', p.prayer_count,
    'commentCount', p.comment_count,
    'viewerPrayed', exists (select 1 from ebenezer_api.prayers x
                            where x.post_id = p.id and x.user_id = viewer),
    'isOwn', p.author_id = viewer,
    -- Guest labels (“Mom”) are the author's private names, so only the author sees them.
    'prayingNames', coalesce((
      select jsonb_agg(n.name) from (
        select coalesce(pr.display_name, l.label) as name
        from ebenezer_api.prayers x
        left join ebenezer_api.profiles pr on pr.id = x.user_id
        left join ebenezer_api.prayer_links l on l.id = x.prayer_link_id
        where x.post_id = p.id
          and (x.user_id is null or x.user_id <> viewer)
          and (x.prayer_link_id is null or p.author_id = viewer)
        order by x.created_at desc
        limit 5) n), '[]'::jsonb),
    'guestNotes', case when p.author_id = viewer then coalesce((
      select jsonb_agg(jsonb_build_object('label', l.label, 'note', x.note, 'createdAt', x.created_at)
                       order by x.created_at desc)
      from ebenezer_api.prayers x
      join ebenezer_api.prayer_links l on l.id = x.prayer_link_id
      where x.post_id = p.id and x.note is not null), '[]'::jsonb) end,
    'createdAt', p.created_at,
    'updatedAt', p.updated_at))
$$;

create function ebenezer_private.group_json(g ebenezer_api.groups, viewer uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'description', g.description,
    'visibility', g.visibility,
    'meetingNote', g.meeting_note,
    'memberCount', g.member_count,
    'viewerRole', case when g.owner_id = viewer then 'owner' else (
      select case when m.status = 'invited' then 'invited' else m.role end
      from ebenezer_api.group_members m where m.group_id = g.id and m.user_id = viewer) end))
$$;

create function ebenezer_private.connection_json(c ebenezer_api.connections, viewer uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id,
    'status', c.status,
    'direction', case when c.requester_id = viewer then 'outgoing' else 'incoming' end,
    'person', ebenezer_private.person_json(
      case when c.requester_id = viewer then c.recipient_id else c.requester_id end))
$$;

create function ebenezer_private.comment_json(c ebenezer_api.comments, viewer uuid, post_author uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id,
    'postId', c.post_id,
    'author', ebenezer_private.person_json(c.author_id),
    'body', c.body,
    'createdAt', c.created_at,
    'isOwn', c.author_id = viewer,
    'canDelete', c.author_id = viewer or post_author = viewer)
$$;

create function ebenezer_private.clean(value text) returns text
language sql immutable set search_path = '' as $$ select nullif(btrim(value), '') $$;

-- ---------------------------------------------------------------------------------------
-- People: search and connections
-- ---------------------------------------------------------------------------------------
create function ebenezer_api.search_people(p_query text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
        q text := lower(btrim(coalesce(p_query, '')));
begin
  if char_length(q) < 2 or char_length(q) > 30 then return '[]'::jsonb; end if;
  q := ltrim(q, '@');
  return coalesce((
    select jsonb_agg(jsonb_strip_nulls(ebenezer_private.person_json(p.id) || jsonb_build_object(
             'connection', (select ebenezer_private.connection_json(c, actor)
                            from ebenezer_api.connections c
                            where least(c.requester_id, c.recipient_id) = least(actor, p.id)
                              and greatest(c.requester_id, c.recipient_id) = greatest(actor, p.id))))
           order by p.handle)
    from (select id, handle from ebenezer_api.profiles
          where id <> actor and (handle = q or handle like replace(replace(q, '\', ''), '%', '') || '%')
          order by handle limit 10) p), '[]'::jsonb);
end $$;

create function ebenezer_api.list_connections() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
begin
  return coalesce((
    select jsonb_agg(ebenezer_private.connection_json(c, actor) order by c.status, c.updated_at desc)
    from ebenezer_api.connections c where actor in (c.requester_id, c.recipient_id)), '[]'::jsonb);
end $$;

create function ebenezer_api.request_connection(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
        c ebenezer_api.connections;
begin
  if p_user = actor then raise exception 'You cannot befriend yourself.' using errcode = '22023'; end if;
  if not exists (select 1 from ebenezer_api.profiles where id = p_user) then
    raise exception 'Person not found.' using errcode = 'P0002';
  end if;
  select * into c from ebenezer_api.connections
  where least(requester_id, recipient_id) = least(actor, p_user)
    and greatest(requester_id, recipient_id) = greatest(actor, p_user)
  for update;
  if found then
    -- Asking someone who already asked you accepts their request.
    if c.status = 'pending' and c.recipient_id = actor then
      update ebenezer_api.connections set status = 'accepted', updated_at = now()
      where id = c.id returning * into c;
    end if;
  else
    insert into ebenezer_api.connections (requester_id, recipient_id)
    values (actor, p_user) returning * into c;
  end if;
  return ebenezer_private.connection_json(c, actor);
end $$;

create function ebenezer_api.respond_connection(p_id uuid, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
        c ebenezer_api.connections;
begin
  select * into c from ebenezer_api.connections
  where id = p_id and recipient_id = actor and status = 'pending' for update;
  if not found then raise exception 'Request not found.' using errcode = 'P0002'; end if;
  if not p_accept then
    delete from ebenezer_api.connections where id = c.id;
    return null;
  end if;
  update ebenezer_api.connections set status = 'accepted', updated_at = now()
  where id = c.id returning * into c;
  return ebenezer_private.connection_json(c, actor);
end $$;

create function ebenezer_api.remove_connection(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
        c ebenezer_api.connections;
begin
  delete from ebenezer_api.connections
  where id = p_id and actor in (requester_id, recipient_id) returning * into c;
  if not found then raise exception 'Connection not found.' using errcode = 'P0002'; end if;
  -- Unfriending permanently revokes direct shares in both directions.
  update ebenezer_api.post_recipients r set revoked_at = now()
  from ebenezer_api.posts p
  where p.id = r.post_id and r.revoked_at is null
    and ((p.author_id = c.requester_id and r.user_id = c.recipient_id)
      or (p.author_id = c.recipient_id and r.user_id = c.requester_id));
end $$;

-- ---------------------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------------------
create function ebenezer_api.list_groups() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
begin
  return coalesce((
    select jsonb_agg(ebenezer_private.group_json(g, actor) order by g.name)
    from ebenezer_api.groups g
    where g.id in (select group_id from ebenezer_api.group_members where user_id = actor)
       or g.id in (select id from ebenezer_api.groups where visibility = 'open'
                   order by member_count desc, id limit 50)), '[]'::jsonb);
end $$;

create function ebenezer_api.create_group(
  p_name text, p_description text default '', p_meeting_note text default null,
  p_visibility text default 'private') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
        g ebenezer_api.groups;
begin
  insert into ebenezer_api.groups (owner_id, name, description, meeting_note, visibility)
  values (actor, btrim(p_name), coalesce(btrim(p_description), ''),
          ebenezer_private.clean(p_meeting_note), p_visibility)
  returning * into g;
  insert into ebenezer_api.group_members (group_id, user_id, role, status, joined_at)
  values (g.id, actor, 'admin', 'active', now());
  select * into g from ebenezer_api.groups where id = g.id;
  return ebenezer_private.group_json(g, actor);
end $$;

create function ebenezer_api.update_group(
  p_id uuid, p_name text, p_description text, p_meeting_note text, p_visibility text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
        g ebenezer_api.groups;
begin
  if not ebenezer_private.group_manager(p_id, actor) then
    raise exception 'Only group leaders can edit this group.' using errcode = '42501';
  end if;
  update ebenezer_api.groups set
    name = btrim(p_name), description = coalesce(btrim(p_description), ''),
    meeting_note = ebenezer_private.clean(p_meeting_note), visibility = p_visibility,
    version = version + 1, updated_at = now()
  where id = p_id returning * into g;
  return ebenezer_private.group_json(g, actor);
end $$;

create function ebenezer_api.delete_group(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
begin
  delete from ebenezer_api.groups where id = p_id and owner_id = actor;
  if not found then
    raise exception 'Only the group owner can delete it.' using errcode = '42501';
  end if;
end $$;

create function ebenezer_api.join_group(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
        g ebenezer_api.groups;
begin
  select * into g from ebenezer_api.groups where id = p_id;
  if not found then raise exception 'Group not found.' using errcode = 'P0002'; end if;
  if g.visibility = 'open' then
    insert into ebenezer_api.group_members (group_id, user_id, status, joined_at)
    values (g.id, actor, 'active', now())
    on conflict (group_id, user_id) do update set status = 'active', joined_at = coalesce(
      ebenezer_api.group_members.joined_at, now());
  else
    update ebenezer_api.group_members set status = 'active', joined_at = now()
    where group_id = g.id and user_id = actor;
    if not found then
      -- Private groups are invisible without an invitation.
      raise exception 'Group not found.' using errcode = 'P0002';
    end if;
  end if;
  select * into g from ebenezer_api.groups where id = p_id;
  return ebenezer_private.group_json(g, actor);
end $$;

-- Leaving, or declining an invitation.
create function ebenezer_api.leave_group(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
begin
  if exists (select 1 from ebenezer_api.groups where id = p_id and owner_id = actor) then
    raise exception 'Owners delete the group instead of leaving it.' using errcode = '55000';
  end if;
  delete from ebenezer_api.group_members where group_id = p_id and user_id = actor;
  if not found then raise exception 'Membership not found.' using errcode = 'P0002'; end if;
end $$;

create function ebenezer_api.list_group_members(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
        manager boolean := ebenezer_private.group_manager(p_id, actor);
begin
  if not ebenezer_private.is_active_member(p_id, actor) then
    raise exception 'Group not found.' using errcode = 'P0002';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'person', ebenezer_private.person_json(m.user_id),
             'role', case when g.owner_id = m.user_id then 'owner' else m.role end,
             'status', m.status)
           order by (g.owner_id = m.user_id) desc, m.role, m.status, m.joined_at)
    from ebenezer_api.group_members m join ebenezer_api.groups g on g.id = m.group_id
    where m.group_id = p_id and (m.status = 'active' or manager)), '[]'::jsonb);
end $$;

create function ebenezer_api.invite_to_group(p_id uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
begin
  if not ebenezer_private.group_manager(p_id, actor) then
    raise exception 'Only group leaders can invite people.' using errcode = '42501';
  end if;
  if not exists (select 1 from ebenezer_api.profiles where id = p_user) then
    raise exception 'Person not found.' using errcode = 'P0002';
  end if;
  insert into ebenezer_api.group_members (group_id, user_id, status, invited_by)
  values (p_id, p_user, 'invited', actor)
  on conflict (group_id, user_id) do nothing;
end $$;

create function ebenezer_api.remove_group_member(p_id uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
        g ebenezer_api.groups;
        target_role text;
begin
  select * into g from ebenezer_api.groups where id = p_id;
  if not found or not ebenezer_private.group_manager(p_id, actor) then
    raise exception 'Only group leaders can remove members.' using errcode = '42501';
  end if;
  if p_user = g.owner_id then
    raise exception 'The owner cannot be removed.' using errcode = '55000';
  end if;
  select role into target_role from ebenezer_api.group_members where group_id = p_id and user_id = p_user;
  if target_role = 'admin' and g.owner_id <> actor then
    raise exception 'Only the owner can remove a leader.' using errcode = '42501';
  end if;
  delete from ebenezer_api.group_members where group_id = p_id and user_id = p_user;
  if not found then raise exception 'Member not found.' using errcode = 'P0002'; end if;
end $$;

create function ebenezer_api.set_group_role(p_id uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
begin
  if not exists (select 1 from ebenezer_api.groups where id = p_id and owner_id = actor) then
    raise exception 'Only the owner can change leaders.' using errcode = '42501';
  end if;
  update ebenezer_api.group_members set role = p_role
  where group_id = p_id and user_id = p_user and status = 'active' and user_id <> actor;
  if not found then raise exception 'Member not found.' using errcode = 'P0002'; end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- Posts and feed
-- ---------------------------------------------------------------------------------------
create function ebenezer_api.feed(
  p_before timestamptz default null, p_before_id uuid default null, p_limit integer default 20,
  p_kind text default null, p_group uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
        lim integer := least(greatest(coalesce(p_limit, 20), 1), 30);
        cursor_at timestamptz := coalesce(p_before, 'infinity');
        cursor_id uuid := coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff');
begin
  -- Each branch is a bounded keyset scan on its own index; the merge costs O(page size).
  return coalesce((
    select jsonb_agg(ebenezer_private.post_json(f, actor) order by f.created_at desc, f.id desc)
    from (
      select * from (
        (select p.* from ebenezer_api.posts p
         where p_group is null and p.audience = 'community' and p.deleted_at is null
           and (p.created_at, p.id) < (cursor_at, cursor_id)
           and (p_kind is null or p.kind = p_kind)
         order by p.created_at desc, p.id desc limit lim)
        union all
        (select p.* from ebenezer_api.group_members m
         join ebenezer_api.posts p on p.group_id = m.group_id and p.deleted_at is null
         where m.user_id = actor and m.status = 'active'
           and (p_group is null or m.group_id = p_group)
           and (p.created_at, p.id) < (cursor_at, cursor_id)
           and (p_kind is null or p.kind = p_kind)
         order by p.created_at desc, p.id desc limit lim)
        union all
        (select p.* from ebenezer_api.post_recipients r
         join ebenezer_api.posts p on p.id = r.post_id and p.deleted_at is null
         where p_group is null and r.user_id = actor and r.revoked_at is null
           and (p.created_at, p.id) < (cursor_at, cursor_id)
           and (p_kind is null or p.kind = p_kind)
         order by p.created_at desc, p.id desc limit lim)
        union all
        (select p.* from ebenezer_api.posts p
         where p_group is null and p.author_id = actor and p.audience = 'people'
           and p.deleted_at is null and (p.created_at, p.id) < (cursor_at, cursor_id)
           and (p_kind is null or p.kind = p_kind)
         order by p.created_at desc, p.id desc limit lim)
      ) merged
      order by created_at desc, id desc
      limit lim) f), '[]'::jsonb);
end $$;

create function ebenezer_api.create_post(
  p_kind text, p_audience text, p_body text, p_group_id uuid default null,
  p_scripture_reference text default null, p_scripture_text text default null,
  p_tone text default null, p_recipient_ids uuid[] default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
        p ebenezer_api.posts;
        recipients uuid[] := array(select distinct unnest(coalesce(p_recipient_ids, '{}')));
begin
  if p_audience = 'group' and not ebenezer_private.is_active_member(p_group_id, actor) then
    raise exception 'Join the group before sharing with it.' using errcode = '42501';
  end if;
  if p_audience <> 'people' and cardinality(recipients) > 0 then
    raise exception 'Only posts for chosen friends have recipients.' using errcode = '22023';
  end if;
  if cardinality(recipients) > 50 then
    raise exception 'Choose at most 50 friends.' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(recipients) r(id) where not ebenezer_private.are_friends(actor, r.id)) then
    raise exception 'You can share directly only with friends.' using errcode = '42501';
  end if;
  insert into ebenezer_api.posts (author_id, kind, audience, group_id, body,
                                  scripture_reference, scripture_text, tone)
  values (actor, p_kind, p_audience, case when p_audience = 'group' then p_group_id end,
          btrim(p_body), ebenezer_private.clean(p_scripture_reference),
          ebenezer_private.clean(p_scripture_text), p_tone)
  returning * into p;
  insert into ebenezer_api.post_recipients (post_id, user_id)
  select p.id, r.id from unnest(recipients) r(id);
  return ebenezer_private.post_json(p, actor);
end $$;

create function ebenezer_api.update_post(p_id uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
        p ebenezer_api.posts;
begin
  update ebenezer_api.posts set body = btrim(p_body), version = version + 1, updated_at = now()
  where id = p_id and author_id = actor and deleted_at is null returning * into p;
  if not found then raise exception 'Post not found.' using errcode = 'P0002'; end if;
  return ebenezer_private.post_json(p, actor);
end $$;

create function ebenezer_api.delete_post(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
begin
  -- Withdrawal hides the post everywhere; the author's private stone is untouched.
  update ebenezer_api.posts set deleted_at = now(), updated_at = now()
  where id = p_id and author_id = actor and deleted_at is null;
  if not found then raise exception 'Post not found.' using errcode = 'P0002'; end if;
  update ebenezer_api.prayer_links set revoked_at = now() where post_id = p_id and revoked_at is null;
end $$;

create function ebenezer_api.set_prayer(p_post uuid, p_praying boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
        p ebenezer_api.posts := ebenezer_private.visible_post(p_post, actor);
begin
  if p_praying then
    insert into ebenezer_api.prayers (post_id, user_id) values (p.id, actor)
    on conflict on constraint prayers_member_once do nothing;
  else
    delete from ebenezer_api.prayers where post_id = p.id and user_id = actor;
  end if;
  select * into p from ebenezer_api.posts where id = p.id;
  return ebenezer_private.post_json(p, actor);
end $$;

create function ebenezer_api.report_post(p_post uuid, p_reason text, p_detail text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
        p ebenezer_api.posts := ebenezer_private.visible_post(p_post, actor);
begin
  insert into ebenezer_private.reports (reporter_id, post_id, reason, detail)
  values (actor, p.id, p_reason, ebenezer_private.clean(p_detail))
  on conflict on constraint reports_once do nothing;
end $$;

-- ---------------------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------------------
create function ebenezer_api.list_comments(p_post uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
        p ebenezer_api.posts := ebenezer_private.visible_post(p_post, actor);
begin
  return coalesce((
    select jsonb_agg(ebenezer_private.comment_json(c, actor, p.author_id) order by c.created_at, c.id)
    from (select * from ebenezer_api.comments where post_id = p.id
          order by created_at, id limit 200) c), '[]'::jsonb);
end $$;

create function ebenezer_api.add_comment(p_post uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
        p ebenezer_api.posts := ebenezer_private.visible_post(p_post, actor);
        c ebenezer_api.comments;
begin
  insert into ebenezer_api.comments (post_id, author_id, body)
  values (p.id, actor, btrim(p_body)) returning * into c;
  return ebenezer_private.comment_json(c, actor, p.author_id);
end $$;

create function ebenezer_api.delete_comment(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
begin
  delete from ebenezer_api.comments c using ebenezer_api.posts p
  where c.id = p_id and p.id = c.post_id and actor in (c.author_id, p.author_id);
  if not found then raise exception 'Comment not found.' using errcode = 'P0002'; end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- Private prayer links (for people without an account)
-- ---------------------------------------------------------------------------------------
create function ebenezer_api.create_prayer_link(p_post uuid, p_label text, p_days integer default 14)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
        token text := encode(extensions.gen_random_bytes(32), 'hex');
        l ebenezer_api.prayer_links;
begin
  if not exists (select 1 from ebenezer_api.posts
                 where id = p_post and author_id = actor and deleted_at is null) then
    raise exception 'Post not found.' using errcode = 'P0002';
  end if;
  if p_days not between 1 and 30 then
    raise exception 'Links last 1 to 30 days.' using errcode = '22023';
  end if;
  -- Only the hash is stored; the raw token is returned once.
  insert into ebenezer_api.prayer_links (post_id, token_hash, label, expires_at)
  values (p_post, sha256(convert_to(token, 'UTF8')), btrim(p_label), now() + make_interval(days => p_days))
  returning * into l;
  return jsonb_build_object('id', l.id, 'token', token, 'label', l.label, 'expiresAt', l.expires_at);
end $$;

create function ebenezer_private.link_for(p_token text) returns ebenezer_api.prayer_links
language plpgsql stable security definer set search_path = '' as $$
declare l ebenezer_api.prayer_links;
begin
  if p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Prayer link not found.' using errcode = 'P0002';
  end if;
  select l2.* into l from ebenezer_api.prayer_links l2
  join ebenezer_api.posts p on p.id = l2.post_id and p.deleted_at is null
  where l2.token_hash = sha256(convert_to(p_token, 'UTF8'))
    and l2.revoked_at is null and l2.expires_at > now();
  if not found then raise exception 'Prayer link not found.' using errcode = 'P0002'; end if;
  return l;
end $$;

-- The only functions callable without an account. They reveal one request and nothing else.
create function ebenezer_api.open_prayer_link(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare l ebenezer_api.prayer_links := ebenezer_private.link_for(p_token);
begin
  return (
    select jsonb_strip_nulls(jsonb_build_object(
      'authorName', a.display_name,
      'kind', p.kind,
      'body', p.body,
      'scriptureReference', p.scripture_reference,
      'scriptureText', p.scripture_text,
      'expiresAt', l.expires_at,
      'answered', exists (select 1 from ebenezer_api.prayers x where x.prayer_link_id = l.id)))
    from ebenezer_api.posts p join ebenezer_api.profiles a on a.id = p.author_id
    where p.id = l.post_id);
end $$;

create function ebenezer_api.answer_prayer_link(p_token text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare l ebenezer_api.prayer_links := ebenezer_private.link_for(p_token);
begin
  insert into ebenezer_api.prayers (post_id, prayer_link_id, note)
  values (l.post_id, l.id, ebenezer_private.clean(p_note))
  on conflict on constraint prayers_link_once
  do update set note = coalesce(excluded.note, ebenezer_api.prayers.note), created_at = now();
  return jsonb_build_object('answered', true);
end $$;

create function ebenezer_api.revoke_prayer_link(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := ebenezer_private.current_member();
begin
  update ebenezer_api.prayer_links l set revoked_at = now()
  from ebenezer_api.posts p
  where l.id = p_id and p.id = l.post_id and p.author_id = actor and l.revoked_at is null;
  if not found then raise exception 'Prayer link not found.' using errcode = 'P0002'; end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- Execution grants: private helpers stay internal; API functions need a signed-in member,
-- except the two prayer-link functions, which also accept the anon role.
-- ---------------------------------------------------------------------------------------
do $$
declare f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p
           where p.pronamespace in ('ebenezer_private'::regnamespace, 'ebenezer_api'::regnamespace)
             and p.proname <> 'set_profile_updated_at' loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
  for f in select p.oid::regprocedure from pg_proc p
           where p.pronamespace = 'ebenezer_api'::regnamespace loop
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
-- anon needs schema usage to reach these two functions; it still has no table privileges
-- and no other function grants.
grant usage on schema ebenezer_api to anon;
grant execute on function ebenezer_api.open_prayer_link(text), ebenezer_api.answer_prayer_link(text, text)
  to anon;

comment on table ebenezer_api.posts is
  'Community posts. Read and write only through ebenezer_api functions; see docs/community-data-model.md.';

notify pgrst, 'reload schema';
