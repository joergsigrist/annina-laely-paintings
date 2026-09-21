-- Apply to a dedicated Supabase project. No application secrets are stored here.
create table public.administrators (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.administrators enable row level security;
create policy "Administrators can see their own membership" on public.administrators
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.administrators from anon, authenticated;
grant select on public.administrators to authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.administrators where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.content (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('painting','show','article')),
  slug text not null unique check (char_length(slug) between 1 and 200),
  published boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_object check (jsonb_typeof(data) = 'object'),
  constraint translated_titles check (
    coalesce(char_length(data->'title'->>'de'),0) between 1 and 200 and
    coalesce(char_length(data->'title'->>'en'),0) between 1 and 200 and
    coalesce(char_length(data->'title'->>'fr'),0) between 1 and 200),
  constraint painting_image check (kind <> 'painting' or coalesce(char_length(data->>'image'),0) > 0)
);
create index content_public_order on public.content(kind,sort_order) where published;
alter table public.content enable row level security;
create policy "Public reads published content" on public.content for select to anon, authenticated using (published or (select public.is_admin()));
create policy "Only administrators insert content" on public.content for insert to authenticated with check ((select public.is_admin()));
create policy "Only administrators update content" on public.content for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Only administrators delete content" on public.content for delete to authenticated using ((select public.is_admin()));
grant select on public.content to anon;
grant select,insert,update,delete on public.content to authenticated;
create function public.touch_content() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger content_updated before update on public.content for each row execute function public.touch_content();

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  subject text not null check (char_length(subject) between 1 and 200),
  message text not null check (char_length(message) between 10 and 5000),
  language text not null check (language in ('de','en','fr')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index contact_messages_created on public.contact_messages(created_at);
create index contact_messages_email_created on public.contact_messages(email,created_at);
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;
grant select on public.contact_messages to authenticated;
grant update(is_read) on public.contact_messages to authenticated;
create policy "Only administrators read enquiries" on public.contact_messages for select to authenticated using ((select public.is_admin()));
create policy "Only administrators mark enquiries read" on public.contact_messages for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- No direct public table access. Serialize quota checks to prevent races.
create function public.submit_contact(p_name text,p_email text,p_subject text,p_message text,p_language text,p_website text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare clean_email text := lower(trim(p_email));
begin
  if coalesce(p_website,'') <> '' then return; end if;
  if p_name is null or p_email is null or p_subject is null or p_message is null or p_language is null
    or char_length(trim(p_name)) not between 1 and 120
    or char_length(clean_email) not between 3 and 254
    or clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or char_length(trim(p_subject)) not between 1 and 200
    or char_length(trim(p_message)) not between 10 and 5000
    or p_language not in ('de','en','fr') then
    raise exception 'Invalid enquiry' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(728193104);
  if (select count(*) from public.contact_messages where email=clean_email and created_at>now()-interval '1 hour') >= 3
     or (select count(*) from public.contact_messages where created_at>now()-interval '1 hour') >= 100 then
    raise exception 'Please try again later' using errcode='P0001';
  end if;
  insert into public.contact_messages(name,email,subject,message,language)
  values(trim(p_name),clean_email,trim(p_subject),trim(p_message),p_language);
end;
$$;
revoke all on function public.submit_contact(text,text,text,text,text,text) from public;
grant execute on function public.submit_contact(text,text,text,text,text,text) to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('artworks','artworks',true,10485760,array['image/jpeg','image/png','image/webp']);
-- Public artwork URLs are intentional; drafts hide records, not uploaded assets.
create policy "Administrators read artwork storage" on storage.objects for select to authenticated using (bucket_id='artworks' and (select public.is_admin()));
create policy "Administrators upload artwork" on storage.objects for insert to authenticated with check (bucket_id='artworks' and (select public.is_admin()));
create policy "Administrators update artwork storage" on storage.objects for update to authenticated using (bucket_id='artworks' and (select public.is_admin())) with check (bucket_id='artworks' and (select public.is_admin()));
create policy "Administrators remove artwork storage" on storage.objects for delete to authenticated using (bucket_id='artworks' and (select public.is_admin()));
