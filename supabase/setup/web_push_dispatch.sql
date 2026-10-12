-- Reuse the existing worker secret and minute Cron; do not create a second scheduler.
-- AFTER 0007 and deployment of the updated telegram-worker.
begin;
do $$ begin
  if to_regprocedure('public.wake_an_nam_telegram()') is null then
    raise exception 'Run telegram_dispatch.sql first';
  end if;
end $$;
drop trigger if exists wake_an_nam_web_push on public.notification_events;
create trigger wake_an_nam_web_push after insert on public.notification_events
referencing new table as inserted_telegram_jobs for each statement execute function public.wake_an_nam_telegram();
commit;
