-- Run after 0005. Only weight/symptoms from the pregnancy diary go to Telegram.
-- No backfill: existing rows are left at revision 0 until a relevant change.
begin;
alter table public.care_entries add column if not exists telegram_revision integer not null default 0;

create or replace function public.pregnancy_telegram_fields(payload jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare selections jsonb := '{}'::jsonb; symptoms jsonb := '[]'::jsonb; weight numeric;
begin
  begin selections := (payload->>'selections')::jsonb; exception when others then selections := '{}'::jsonb; end;
  if jsonb_typeof(selections->'symptoms') = 'array' then
    select coalesce(jsonb_agg(v order by v), '[]'::jsonb) into symptoms from (
      select distinct value #>> '{}' as v from jsonb_array_elements(selections->'symptoms')
      where jsonb_typeof(value) = 'string' and length(value #>> '{}') between 1 and 120 limit 20
    ) allowed;
  end if;
  if btrim(payload->>'weight') ~ '^\d{1,3}([.,]\d{1,2})?$' then
    weight := replace(btrim(payload->>'weight'), ',', '.')::numeric;
    if weight <= 0 or weight > 400 then weight := null; end if;
  end if;
  return jsonb_build_object('weight',weight,'symptoms',symptoms);
end $$;
revoke all on function public.pregnancy_telegram_fields(jsonb) from public,anon,authenticated;

create or replace function public.guard_pregnancy_telegram_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.telegram_revision := case when new.details->>'tool' = 'pregnancy-today'
      and public.pregnancy_telegram_fields(new.details) <> '{"weight":null,"symptoms":[]}'::jsonb then 1 else 0 end;
  else
    new.telegram_revision := old.telegram_revision;
    if new.details->>'tool' = 'pregnancy-today' and new.deleted_at is null
      and (public.pregnancy_telegram_fields(new.details),new.details->>'day')
        is distinct from (public.pregnancy_telegram_fields(old.details),old.details->>'day') then
      new.telegram_revision := old.telegram_revision + 1;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_pregnancy_telegram_revision() from public,anon,authenticated;
drop trigger if exists pregnancy_telegram_revision on public.care_entries;
create trigger pregnancy_telegram_revision before insert or update on public.care_entries
for each row execute function public.guard_pregnancy_telegram_revision();

create or replace function public.enqueue_pregnancy_telegram() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor uuid := coalesce(auth.uid(),new.created_by);
begin
  if new.deleted_at is not null or new.details->>'tool' is distinct from 'pregnancy-today' then
    update public.telegram_jobs set state='cancelled',lease_id=null
      where source_table='care_entries' and entity_id=new.id and kind='pregnancy_status' and state in ('pending','processing');
    return new;
  end if;
  if new.telegram_revision = 0 then return new; end if;
  if tg_op = 'UPDATE' and new.telegram_revision = old.telegram_revision then return new; end if;
  -- Collapse intermediate unsent edits; the worker also checks the exact revision.
  update public.telegram_jobs set state='cancelled',lease_id=null
    where source_table='care_entries' and entity_id=new.id and kind='pregnancy_status' and state in ('pending','processing');
  insert into public.telegram_jobs(family_id,actor_id,recipient_id,source_table,entity_id,kind,revision,dedupe_key,expires_at)
    select new.family_id,actor,m.user_id,'care_entries',new.id,'pregnancy_status',new.telegram_revision,
      'pregnancy:' || new.id || ':' || new.telegram_revision || ':' || m.user_id,now()+interval '12 hours'
    from public.family_members m join public.telegram_links l on l.user_id=m.user_id and l.enabled and l.confirmed_at is not null
    where m.family_id=new.family_id and m.user_id<>actor
      and exists(select 1 from public.family_members a where a.family_id=new.family_id and a.user_id=actor)
    on conflict(dedupe_key) do nothing;
  return new;
end $$;
revoke all on function public.enqueue_pregnancy_telegram() from public,anon,authenticated;
drop trigger if exists telegram_pregnancy on public.care_entries;
create trigger telegram_pregnancy after insert or update on public.care_entries
for each row execute function public.enqueue_pregnancy_telegram();

-- Pregnancy gets one dedicated event, not a second generic care notification.
drop trigger if exists telegram_care on public.care_entries;
create trigger telegram_care after insert on public.care_entries for each row
when (new.details->>'tool' is distinct from 'pregnancy-today') execute function public.enqueue_telegram_event();
commit;
