-- JV FX · Vitorino LAB — Batch 4: end-of-day reviews

create table if not exists public.daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_date date not null,
  notes text not null default '',
  lessons text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, review_date)
);

create index if not exists daily_reviews_user_date_idx on public.daily_reviews(user_id, review_date desc);

alter table public.daily_reviews enable row level security;

create policy "daily_reviews_own_select" on public.daily_reviews
for select to authenticated
using (user_id = auth.uid());

create policy "daily_reviews_own_insert" on public.daily_reviews
for insert to authenticated
with check (user_id = auth.uid());

create policy "daily_reviews_own_update" on public.daily_reviews
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "daily_reviews_own_delete" on public.daily_reviews
for delete to authenticated
using (user_id = auth.uid());
