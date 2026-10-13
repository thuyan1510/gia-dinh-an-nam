-- Reversible channel pause and an immutable, family-scoped conversation.
begin;
create table public.notification_channels (
  singleton boolean primary key default true check(singleton),
  telegram_enabled boolean not null default false
);
insert into public.notification_channels(singleton,telegram_enabled) values(true,false);
alter table public.notification_channels enable row level security;
revoke all on public.notification_channels from public,anon,authenticated;
grant select,update on public.notification_channels to service_role;

-- Preserve bot credentials, links and history. No new Telegram jobs while paused.
create function public.guard_telegram_channel() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.source_table='family_messages' or not exists(
    select 1 from public.notification_channels where singleton and telegram_enabled
  ) then return null; end if;
  return new;
end $$;
revoke all on function public.guard_telegram_channel() from public,anon,authenticated;
create trigger guard_telegram_channel before insert on public.telegram_jobs
for each row execute function public.guard_telegram_channel();

create or replace function public.claim_telegram_jobs(target_family uuid default null) returns setof public.telegram_jobs
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.notification_channels where singleton and telegram_enabled) then return; end if;
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

alter table public.family_messages
  add column message_kind text not null default 'message'
    check(message_kind in ('message','reminder','attention','acknowledged','rescheduled','completed')),
  add column reminder_id text references public.reminders(id) on delete cascade,
  add column reminder_revision integer;
create unique index family_message_reminder_event on public.family_messages(reminder_id,reminder_revision,message_kind)
  where reminder_id is not null;
-- Clients may read history but cannot forge acknowledgements or edit sent messages.
revoke insert,update,delete on public.family_messages from authenticated;
grant select on public.family_messages to authenticated;

create function public.send_family_chat_message(request_id text, message_body text, media jsonb default '[]'::jsonb, expected_family uuid default null)
returns text language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); m public.family_members; previous public.family_messages; clean text:=btrim(message_body);
begin
  if actor is null or request_id !~ '^chat_[a-zA-Z0-9_-]{8,100}$' then raise exception 'invalid message'; end if;
  select * into m from public.family_members where user_id=actor;
  if not found then raise exception 'membership required'; end if;
  if expected_family is not null and m.family_id<>expected_family then raise exception 'family changed'; end if;
  if clean is null or length(clean)>2000 or media is null or not public.valid_message_media(media,m.family_id,actor)
    or (length(clean)=0 and jsonb_array_length(media)=0) then raise exception 'invalid message'; end if;
  if clean='' then clean:=case when media->0->>'type'='video' then '🎬 Video' else '📷 Ảnh' end; end if;
  perform pg_advisory_xact_lock(hashtext('chat:'||request_id));
  select * into previous from public.family_messages where id=request_id;
  if found then
    if previous.family_id<>m.family_id or previous.created_by<>actor or previous.message_kind<>'message'
      or previous.body<>clean or previous.attachments<>media then raise exception 'message retry mismatch'; end if;
    return previous.id;
  end if;
  insert into public.family_messages(id,family_id,body,created_by,created_by_name,attachments)
    values(request_id,m.family_id,clean,actor,m.display_name,media);
  return request_id;
end $$;
revoke all on function public.send_family_chat_message(text,text,jsonb,uuid) from public,anon;
grant execute on function public.send_family_chat_message(text,text,jsonb,uuid) to authenticated;

alter table public.notification_events drop constraint notification_events_source_table_check;
alter table public.notification_events add constraint notification_events_source_table_check
  check(source_table in ('reminders','family_posts','post_comments','care_entries','family_messages','test'));

create function public.notify_family_chat_message() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  -- Reminder events already have a notification: never notify twice for the chat card.
  if new.message_kind='message' then
    perform public.emit_family_notification(new.family_id,new.created_by,'family_messages',new.id,'family_messages',null,
      'message:'||new.id,now()+interval '12 hours');
  end if;
  return new;
end $$;
revoke all on function public.notify_family_chat_message() from public,anon,authenticated;
create trigger notify_family_chat_message after insert on public.family_messages
for each row execute function public.notify_family_chat_message();

create function public.reminder_conversation_event() returns trigger
language plpgsql security definer set search_path='' as $$
declare category text; actor uuid:=new.created_by; label text;
begin
  if tg_op='INSERT' then
    category:=case when new.reminder_kind='attention' then 'attention' else 'reminder' end;
  elsif new.acknowledged_at is distinct from old.acknowledged_at and new.acknowledged_at is not null then
    category:='acknowledged'; actor:=new.acknowledged_by;
  elsif new.schedule_version<>old.schedule_version then
    category:='rescheduled'; actor:=coalesce(auth.uid(),new.created_by);
  elsif new.completed_at is distinct from old.completed_at and new.completed_at is not null then
    category:='completed'; actor:=coalesce(auth.uid(),new.created_by);
  else return new; end if;
  select display_name into label from public.family_members where family_id=new.family_id and user_id=actor;
  if label is null then return new; end if;
  insert into public.family_messages(id,family_id,body,created_by,created_by_name,message_kind,reminder_id,reminder_revision)
    values('event_'||gen_random_uuid()::text,new.family_id,
      case category when 'acknowledged' then 'Đã xác nhận lời nhắc: ' when 'completed' then 'Đã hoàn thành: '
        when 'rescheduled' then 'Đã đổi lời nhắc: ' else '' end ||new.title,
      actor,label,category,new.id,new.schedule_version)
    on conflict do nothing;
  return new;
end $$;
revoke all on function public.reminder_conversation_event() from public,anon,authenticated;
create trigger reminder_conversation_event after insert or update on public.reminders
for each row execute function public.reminder_conversation_event();

-- Existing reminders appear in chat too, without generating notifications/backfill spam.
insert into public.family_messages(id,family_id,body,created_by,created_by_name,created_at,message_kind,reminder_id,reminder_revision)
select 'event_'||gen_random_uuid()::text,r.family_id,r.title,r.created_by,r.created_by_name,r.created_at,
  case when r.reminder_kind='attention' then 'attention' else 'reminder' end,r.id,r.schedule_version
from public.reminders r on conflict do nothing;

create or replace function public.acknowledge_family_reminder(target_id text, actor uuid, expected_revision integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.reminders;
begin
  select * into r from public.reminders where id=target_id for update;
  if not found or actor is null or expected_revision is null or r.reminder_kind='attention'
    or r.created_by=actor or r.completed_at is not null or r.schedule_version<>expected_revision
    or not exists(select 1 from public.family_members where family_id=r.family_id and user_id=actor)
    or not exists(select 1 from public.family_members where family_id=r.family_id and user_id=r.created_by) then
    raise exception 'reminder unavailable or changed';
  end if;
  if r.acknowledged_at is not null then return true; end if;
  update public.reminders set acknowledged_by=actor,acknowledged_at=now() where id=r.id;
  return true;
end $$;
revoke all on function public.acknowledge_family_reminder(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.acknowledge_family_reminder(text,uuid,integer) to service_role;

create or replace function public.create_attention_reminder(actor uuid, request_id text) returns text
language plpgsql security definer set search_path='' as $$
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
    and ((exists(select 1 from public.notification_channels where singleton and telegram_enabled)
      and exists(select 1 from public.telegram_links l where l.user_id=other.user_id and l.enabled and l.confirmed_at is not null))
      or exists(select 1 from public.web_push_devices d where d.user_id=other.user_id and d.family_id=m.family_id
        and d.enabled and d.permission='granted' and d.endpoint is not null and d.credential_expires_at>now())))
    then raise exception 'partner notification channel not linked'; end if;
  if exists(select 1 from public.reminders where created_by=actor and reminder_kind='attention' and created_at>now()-interval '30 seconds') then raise exception 'wait 30 seconds'; end if;
  insert into public.reminders(id,family_id,title,details,due_at,created_by,created_by_name,reminder_kind)
    values(request_id,m.family_id,'Cần bạn hỗ trợ ngay',null,now(),actor,m.display_name,'attention');
  return request_id;
end $$;
revoke all on function public.create_attention_reminder(uuid,text) from public,anon,authenticated;
grant execute on function public.create_attention_reminder(uuid,text) to service_role;
commit;
