alter table profiles
  add column if not exists username text;

create unique index if not exists profiles_username_key
  on profiles (lower(username))
  where username is not null;

create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

alter table friendships enable row level security;

create policy "own friendships read" on friendships
  for select using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "own friendships create" on friendships
  for insert with check (requester_id = auth.uid());

create policy "own friendships update" on friendships
  for update using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "profile username lookup" on profiles
  for select using (true);

drop policy if exists "owner member rows" on shared_group_members;

create policy "owner member rows update delete" on shared_group_members
  for update using (
    exists (
      select 1 from shared_groups g
      where g.id = group_id and g.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from shared_groups g
      where g.id = group_id and g.owner_id = auth.uid()
    )
  );

create policy "accepted friends can be added to groups" on shared_group_members
  for insert with check (
    exists (
      select 1 from shared_groups g
      where g.id = group_id and g.owner_id = auth.uid()
    )
    and (
      user_id = auth.uid()
      or exists (
        select 1 from friendships f
        where f.status = 'accepted'
          and (
            (f.requester_id = auth.uid() and f.addressee_id = user_id)
            or (f.addressee_id = auth.uid() and f.requester_id = user_id)
          )
      )
    )
  );
