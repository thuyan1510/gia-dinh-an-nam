-- Central event outbox. Additive; preserves Telegram links, local schedules and historical data.
-- Apply after 0006 and deploy the Web Push-aware worker before enabling new devices.
begin;
create table if not exists public.web_push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  label text not null check(length(label) between 1 and 80),
  credential_hash text not null unique,
  credential_expires_at timestamptz not null default now()+interval '90 days',
  endpoint text unique, p256dh text, auth_key text,
  enabled boolean not null default true,
  permission text not null default 'default' check(permission in ('default','granted','denied')),
  standalone boolean not null default false,
  last_seen_at timestamptz, last_accepted_at timestamptz, confirmed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.web_push_pair_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null unique, expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telegram_policy text not null default 'parallel' check(telegram_policy in ('parallel','fallback')),
  updated_at timestamptz not null default now()
);
create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  source_table text not null check(source_table in ('reminders','family_posts','post_comments','care_entries','test')),
  entity_id text not null, kind text not null, revision integer,
  dedupe_key text not null unique,
  state text not null default 'active' check(state in ('active','cancelled')),
  created_at timestamptz not null default now(), expires_at timestamptz not null,
  native_opened_at timestamptz,
  target_device_id uuid references public.web_push_devices(id) on delete cascade
);
create table if not exists public.web_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notification_events(id) on delete cascade,
  device_id uuid not null references public.web_push_devices(id) on delete cascade,
  state text not null default 'pending' check(state in ('pending','processing','accepted','failed','cancelled','expired')),
  attempts integer not null default 0, due_at timestamptz not null default now(),
  lease_id uuid, lease_until timestamptz, last_error text,
  accepted_at timestamptz, displayed_at timestamptz, clicked_at timestamptz,
  pwa_opened_at timestamptz, launch_attempted_at timestamptz,
  unique(notification_id,device_id)
);
alter table public.telegram_jobs add column if not exists notification_id uuid references public.notification_events(id) on delete cascade;
create index if not exists notification_events_recipient on public.notification_events(recipient_id,created_at desc);
create index if not exists notification_events_source on public.notification_events(source_table,entity_id,state);
create index if not exists web_push_due on public.web_push_deliveries(state,due_at);
create index if not exists web_push_device_owner on public.web_push_devices(user_id,enabled);
alter table public.web_push_devices enable row level security;
alter table public.web_push_pair_codes enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_events enable row level security;
alter table public.web_push_deliveries enable row level security;
revoke all on public.web_push_devices,public.web_push_pair_codes,public.notification_preferences,public.notification_events,public.web_push_deliveries from anon,authenticated;
grant all on public.web_push_devices,public.web_push_pair_codes,public.notification_preferences,public.notification_events,public.web_push_deliveries to service_role;

create or replace function public.consume_web_push_pair(code_digest text, credential_digest text, device_label text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid; f uuid; device uuid;
begin
  if credential_digest !~ '^[0-9a-f]{64}$' or length(device_label) not between 1 and 80 then raise exception 'invalid device'; end if;
  delete from public.web_push_pair_codes where code_hash=code_digest and expires_at>now() returning user_id into u;
  select family_id into f from public.family_members where user_id=u;
  if u is null or f is null then raise exception 'pair code expired or invalid'; end if;
  if (select count(*) from public.web_push_devices where user_id=u and enabled and credential_expires_at>now()) >= 10 then raise exception 'device limit'; end if;
  insert into public.web_push_devices(user_id,family_id,label,credential_hash) values(u,f,device_label,credential_digest) returning id into device;
  return device;
end $$;
revoke all on function public.consume_web_push_pair(text,text,text) from public,anon,authenticated;
grant execute on function public.consume_web_push_pair(text,text,text) to service_role;

-- A single committed event fans out to channels. Telegram remains parallel by default.
create or replace function public.route_family_notification() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='UPDATE' then
    if new.state='cancelled' then
      update public.web_push_deliveries set state='cancelled',lease_id=null where notification_id=new.id and state in ('pending','processing');
      update public.telegram_jobs set state='cancelled',lease_id=null where notification_id=new.id and state in ('pending','processing');
    end if;
    return new;
  end if;
  insert into public.web_push_deliveries(notification_id,device_id)
    select new.id,d.id from public.web_push_devices d where d.user_id=new.recipient_id and d.family_id=new.family_id
      and d.enabled and d.permission='granted' and d.endpoint is not null and d.credential_expires_at>now()
      and (new.target_device_id is null or d.id=new.target_device_id)
    on conflict do nothing;
  insert into public.telegram_jobs(family_id,actor_id,recipient_id,source_table,entity_id,kind,revision,dedupe_key,expires_at,notification_id,due_at)
    select new.family_id,new.actor_id,new.recipient_id,new.source_table,new.entity_id,new.kind,new.revision,new.dedupe_key,new.expires_at,new.id,
      now()+case when exists(select 1 from public.notification_preferences where user_id=new.recipient_id and telegram_policy='fallback')
        and exists(select 1 from public.web_push_deliveries where notification_id=new.id) then interval '2 minutes' else interval '0 seconds' end
    from public.telegram_links l where l.user_id=new.recipient_id and l.enabled and l.confirmed_at is not null and new.kind<>'test'
    on conflict(dedupe_key) do nothing;
  return new;
end $$;
revoke all on function public.route_family_notification() from public,anon,authenticated;
drop trigger if exists route_family_notification on public.notification_events;
create trigger route_family_notification after insert or update of state on public.notification_events for each row execute function public.route_family_notification();

create or replace function public.emit_family_notification(f uuid, actor uuid, source text, entity text, category text, rev integer, event_key text, expiry timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if actor is not null and not exists(select 1 from public.family_members where family_id=f and user_id=actor) then return; end if;
  insert into public.notification_events(family_id,actor_id,recipient_id,source_table,entity_id,kind,revision,dedupe_key,expires_at)
    select f,actor,m.user_id,source,entity,category,rev,event_key||':'||m.user_id,expiry
    from public.family_members m where m.family_id=f and (actor is null or m.user_id<>actor)
      and (exists(select 1 from public.telegram_links l where l.user_id=m.user_id and l.enabled and l.confirmed_at is not null)
        or exists(select 1 from public.web_push_devices d where d.user_id=m.user_id and d.family_id=f and d.enabled and d.permission='granted' and d.endpoint is not null and d.credential_expires_at>now()))
    on conflict(dedupe_key) do nothing;
end $$;
revoke all on function public.emit_family_notification(uuid,uuid,text,text,text,integer,text,timestamptz) from public,anon,authenticated;
grant execute on function public.emit_family_notification(uuid,uuid,text,text,text,integer,text,timestamptz) to service_role;

-- Keep existing trigger entrypoints: no second set of source triggers / duplicate events.
create or replace function public.enqueue_telegram_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare rowdata jsonb:=to_jsonb(new); actor uuid; category text; rev integer; event_key text;
begin
  actor:=coalesce(auth.uid(),(rowdata->>'author_id')::uuid,(rowdata->>'created_by')::uuid);
  category:=tg_table_name;
  if tg_table_name='reminders' then
    rev:=new.schedule_version;
    if tg_op='UPDATE' then
      if new.acknowledged_at is distinct from old.acknowledged_at and new.acknowledged_at is not null then category:='acknowledged';actor:=new.acknowledged_by;
      elsif new.completed_at is distinct from old.completed_at then category:='completed';
      elsif new.schedule_version<>old.schedule_version then category:='rescheduled';
      else return new; end if;
    else category:=case when new.reminder_kind='attention' then 'attention' else 'reminder_created' end; end if;
    if category in ('completed','rescheduled','acknowledged') then
      update public.notification_events set state='cancelled' where source_table='reminders' and entity_id=new.id and state='active'
        and (category<>'acknowledged' or kind in ('attention','reminder_created','rescheduled'));
      update public.telegram_jobs set state='cancelled',lease_id=null where source_table='reminders' and entity_id=new.id and state in ('pending','processing')
        and (category<>'acknowledged' or kind in ('attention','reminder_created','rescheduled'));
    end if;
  elsif tg_table_name='care_entries' then
    if new.deleted_at is not null or new.occurred_at<now()-interval '2 hours' or tg_op='UPDATE' then return new; end if;
  end if;
  event_key:=tg_table_name||':'||(rowdata->>'id')||':'||category||':'||coalesce(rev::text,'1');
  perform public.emit_family_notification((rowdata->>'family_id')::uuid,actor,tg_table_name,rowdata->>'id',category,rev,event_key,
    now()+case when category='attention' then interval '15 minutes' when category='care_entries' then interval '2 hours' else interval '12 hours' end);
  return new;
end $$;
revoke all on function public.enqueue_telegram_event() from public,anon,authenticated;

create or replace function public.enqueue_pregnancy_telegram() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor uuid:=coalesce(auth.uid(),new.created_by);
begin
  if new.deleted_at is not null or new.details->>'tool' is distinct from 'pregnancy-today' then
    update public.notification_events set state='cancelled' where source_table='care_entries' and entity_id=new.id and kind='pregnancy_status' and state='active';
    update public.telegram_jobs set state='cancelled',lease_id=null where source_table='care_entries' and entity_id=new.id and kind='pregnancy_status' and state in ('pending','processing');
    return new;
  end if;
  if new.telegram_revision=0 then return new; end if;
  if tg_op='UPDATE' and new.telegram_revision=old.telegram_revision then return new; end if;
  update public.notification_events set state='cancelled' where source_table='care_entries' and entity_id=new.id and kind='pregnancy_status' and state='active';
  update public.telegram_jobs set state='cancelled',lease_id=null where source_table='care_entries' and entity_id=new.id and kind='pregnancy_status' and state in ('pending','processing');
  perform public.emit_family_notification(new.family_id,actor,'care_entries',new.id,'pregnancy_status',new.telegram_revision,
    'pregnancy:'||new.id||':'||new.telegram_revision,now()+interval '12 hours');
  return new;
end $$;
revoke all on function public.enqueue_pregnancy_telegram() from public,anon,authenticated;

create or replace function public.enqueue_telegram_calendar(clock_at timestamptz default now()) returns void
language plpgsql security definer set search_path = '' as $$
declare day_local date:=(clock_at at time zone 'Asia/Ho_Chi_Minh')::date; r public.reminders;
begin
  if (clock_at at time zone 'Asia/Ho_Chi_Minh')::time<time '21:00' then return; end if;
  for r in select * from public.reminders where completed_at is null and reminder_kind='calendar' and due_at>clock_at
    and (due_at at time zone 'Asia/Ho_Chi_Minh')::date-day_local between 1 and 7 loop
    perform public.emit_family_notification(r.family_id,null,'reminders',r.id,'calendar',r.schedule_version,
      'calendar:'||r.id||':'||r.schedule_version||':'||day_local,(day_local+1)::timestamp at time zone 'Asia/Ho_Chi_Minh');
  end loop;
  delete from public.web_push_pair_codes where expires_at<clock_at;
  delete from public.telegram_link_codes where expires_at<clock_at;
  delete from public.notification_events where created_at<clock_at-interval '30 days';
  delete from public.telegram_jobs where created_at<clock_at-interval '30 days';
end $$;
revoke all on function public.enqueue_telegram_calendar(timestamptz) from public,anon,authenticated;
grant execute on function public.enqueue_telegram_calendar(timestamptz) to service_role;

create or replace function public.claim_web_push_jobs() returns setof public.web_push_deliveries
language plpgsql security definer set search_path = '' as $$
begin
  update public.web_push_deliveries d set state='expired',lease_id=null from public.notification_events e
    where d.notification_id=e.id and e.expires_at<=now() and d.state in ('pending','processing');
  update public.web_push_deliveries set state='failed',lease_id=null,last_error='AttemptsExhausted' where attempts>=6 and (state='pending' or (state='processing' and lease_until<now()));
  return query with picked as (
    select d.id from public.web_push_deliveries d join public.notification_events e on e.id=d.notification_id
    where e.state='active' and e.expires_at>now() and d.due_at<=now() and d.attempts<6
      and (d.state='pending' or (d.state='processing' and d.lease_until<now()))
    order by case when e.kind='attention' then 0 else 1 end,d.due_at for update of d skip locked limit 5
  ) update public.web_push_deliveries d set state='processing',lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=d.attempts+1
    from picked where d.id=picked.id returning d.*;
end $$;
revoke all on function public.claim_web_push_jobs() from public,anon,authenticated;
grant execute on function public.claim_web_push_jobs() to service_role;

create or replace function public.claim_telegram_jobs(target_family uuid default null) returns setof public.telegram_jobs
language plpgsql security definer set search_path = '' as $$
begin
  -- Suppress fallback only after an explicit SW display acknowledgement or real native open.
  -- Provider HTTP acceptance alone NEVER disables Telegram.
  update public.telegram_jobs j set state='cancelled',lease_id=null where j.state in ('pending','processing')
    and exists(select 1 from public.notification_preferences p where p.user_id=j.recipient_id and p.telegram_policy='fallback')
    and (exists(select 1 from public.web_push_deliveries d where d.notification_id=j.notification_id and d.displayed_at is not null)
      or exists(select 1 from public.notification_events e where e.id=j.notification_id and e.native_opened_at is not null));
  update public.telegram_jobs set state='expired',lease_id=null where expires_at<=now() and state in ('pending','processing');
  update public.telegram_jobs set state='failed',lease_id=null,last_error='AttemptsExhausted'
    where attempts>=12 and (state='pending' or (state='processing' and lease_until<now()));
  return query with picked as (
    select id from public.telegram_jobs where (target_family is null or family_id=target_family)
      and due_at<=now() and expires_at>now() and attempts<12
      and (state='pending' or (state='processing' and lease_until<now()))
    order by case when kind='attention' then 0 else 1 end,due_at for update skip locked limit 5
  ) update public.telegram_jobs j set state='processing',lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=j.attempts+1
    from picked where j.id=picked.id returning j.*;
end $$;
revoke all on function public.claim_telegram_jobs(uuid) from public,anon,authenticated;
grant execute on function public.claim_telegram_jobs(uuid) to service_role;

create or replace function public.create_attention_reminder(actor uuid, request_id text) returns text
language plpgsql security definer set search_path = '' as $$
declare m public.family_members; existing public.reminders;
begin
  if request_id !~ '^attention_[a-zA-Z0-9_-]{8,80}$' then raise exception 'invalid request id'; end if;
  select * into m from public.family_members where user_id=actor;
  if not found then raise exception 'membership required'; end if;
  perform pg_advisory_xact_lock(hashtext(actor::text));
  select * into existing from public.reminders where id=request_id;
  if found then
    if existing.created_by<>actor or existing.family_id<>m.family_id or existing.reminder_kind<>'attention' then raise exception 'invalid request'; end if;
    return existing.id;
  end if;
  if not exists(select 1 from public.family_members other where other.family_id=m.family_id and other.user_id<>actor
    and (exists(select 1 from public.telegram_links l where l.user_id=other.user_id and l.enabled and l.confirmed_at is not null)
      or exists(select 1 from public.web_push_devices d where d.user_id=other.user_id and d.family_id=m.family_id and d.enabled and d.permission='granted' and d.endpoint is not null and d.credential_expires_at>now()))) then raise exception 'partner notification channel not linked'; end if;
  if exists(select 1 from public.reminders where created_by=actor and reminder_kind='attention' and created_at>now()-interval '30 seconds') then raise exception 'wait 30 seconds'; end if;
  insert into public.reminders(id,family_id,title,details,due_at,created_by,created_by_name,reminder_kind)
    values(request_id,m.family_id,'Cần bạn hỗ trợ ngay',null,now(),actor,m.display_name,'attention');
  return request_id;
end $$;
revoke all on function public.create_attention_reminder(uuid,text) from public,anon,authenticated;
grant execute on function public.create_attention_reminder(uuid,text) to service_role;

create or replace function public.create_web_push_pair(actor uuid, code_digest text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if code_digest !~ '^[0-9a-f]{64}$' or not exists(select 1 from public.family_members where user_id=actor) then raise exception 'invalid member'; end if;
  perform pg_advisory_xact_lock(hashtext('pair:'||actor::text));
  if exists(select 1 from public.web_push_pair_codes where user_id=actor and created_at>now()-interval '30 seconds') then raise exception 'wait 30 seconds'; end if;
  insert into public.web_push_pair_codes(user_id,code_hash,expires_at) values(actor,code_digest,now()+interval '5 minutes')
    on conflict(user_id) do update set code_hash=excluded.code_hash,expires_at=excluded.expires_at,created_at=now();
end $$;
revoke all on function public.create_web_push_pair(uuid,text) from public,anon,authenticated;
grant execute on function public.create_web_push_pair(uuid,text) to service_role;

create or replace function public.create_web_push_test(actor uuid, target_devices uuid[]) returns setof uuid
language plpgsql security definer set search_path = '' as $$
declare f uuid;
begin
  select family_id into f from public.family_members where user_id=actor;
  if f is null or cardinality(target_devices) not between 1 and 10 then raise exception 'invalid targets'; end if;
  if exists(select 1 from unnest(target_devices) t(id) where not exists(select 1 from public.web_push_devices d
    join public.family_members m on m.user_id=d.user_id and m.family_id=d.family_id
    where d.id=t.id and d.family_id=f and d.enabled and d.endpoint is not null and d.credential_expires_at>now())) then raise exception 'device unavailable'; end if;
  return query insert into public.notification_events(family_id,actor_id,recipient_id,source_table,entity_id,kind,dedupe_key,expires_at,target_device_id)
    select f,actor,d.user_id,'test',d.id::text,'test','webtest:'||d.id||':'||floor(extract(epoch from now())/30),now()+interval '10 minutes',d.id
    from public.web_push_devices d where d.id=any(target_devices)
    on conflict(dedupe_key) do nothing returning id;
end $$;
revoke all on function public.create_web_push_test(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.create_web_push_test(uuid,uuid[]) to service_role;
commit;
