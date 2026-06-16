create extension if not exists "pgcrypto";

create type entry_type as enum ('income', 'expense');
create type visibility_type as enum ('private', 'shared');
create type base_behavior as enum ('include', 'deduct', 'ignore');
create type split_mode as enum ('equal', 'proportional', 'fixed_percent', 'individual');
create type recurrence_type as enum ('once', 'monthly');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  type entry_type not null,
  visibility visibility_type not null default 'private',
  base_behavior base_behavior not null default 'ignore',
  base_percent numeric(5,2) not null default 0 check (base_percent >= 0 and base_percent <= 100),
  default_split_mode split_mode,
  created_at timestamptz not null default now()
);

create table financial_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  type entry_type not null,
  entry_date date not null default current_date,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create table monthly_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  title text not null,
  amount numeric(14,2) not null check (amount > 0),
  due_day int not null check (due_day >= 1 and due_day <= 31),
  scope visibility_type not null default 'private',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table recurring_debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  creditor text not null default '',
  total_amount numeric(14,2) not null check (total_amount >= 0),
  installment_amount numeric(14,2) not null check (installment_amount >= 0),
  paid_installments int not null default 0,
  total_installments int not null default 1,
  next_due_date date,
  protected_deduction boolean not null default true,
  created_at timestamptz not null default now()
);

create table shared_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  invite_code text not null unique default encode(gen_random_bytes(8), 'hex'),
  default_split_mode split_mode not null default 'equal',
  created_at timestamptz not null default now()
);

create table shared_group_members (
  group_id uuid not null references shared_groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  display_name text not null,
  percent numeric(5,2),
  fixed_amount numeric(14,2),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table shared_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references shared_groups(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  title text not null,
  period text not null,
  amount numeric(14,2) not null check (amount > 0),
  split_mode split_mode not null,
  recurrence recurrence_type not null default 'once',
  created_at timestamptz not null default now()
);

create table shared_item_participants (
  item_id uuid not null references shared_items(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  display_name text not null,
  percent numeric(5,2),
  fixed_amount numeric(14,2),
  primary key (item_id, user_id)
);

create table shared_item_payments (
  item_id uuid not null references shared_items(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 0),
  primary key (item_id, user_id)
);

alter table profiles enable row level security;
alter table categories enable row level security;
alter table financial_entries enable row level security;
alter table monthly_commitments enable row level security;
alter table recurring_debts enable row level security;
alter table shared_groups enable row level security;
alter table shared_group_members enable row level security;
alter table shared_items enable row level security;
alter table shared_item_participants enable row level security;
alter table shared_item_payments enable row level security;

create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own categories" on categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own entries" on financial_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own monthly commitments" on monthly_commitments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own recurring debts" on recurring_debts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "member groups" on shared_groups
  for select using (
    exists (
      select 1 from shared_group_members m
      where m.group_id = id and m.user_id = auth.uid()
    )
  );

create policy "owner groups" on shared_groups
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "member rows" on shared_group_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from shared_groups g
      where g.id = group_id and g.owner_id = auth.uid()
    )
  );

create policy "owner member rows" on shared_group_members
  for all using (
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

create policy "member shared items" on shared_items
  for select using (
    exists (
      select 1 from shared_group_members m
      where m.group_id = group_id and m.user_id = auth.uid()
    )
  );

create policy "owner shared items" on shared_items
  for all using (
    exists (
      select 1 from shared_groups g
      where g.id = group_id and g.owner_id = auth.uid()
    )
  );

create policy "member item participants" on shared_item_participants
  for select using (
    exists (
      select 1 from shared_items i
      join shared_group_members m on m.group_id = i.group_id
      where i.id = item_id and m.user_id = auth.uid()
    )
  );

create policy "owner item participants" on shared_item_participants
  for all using (
    exists (
      select 1 from shared_items i
      join shared_groups g on g.id = i.group_id
      where i.id = item_id and g.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from shared_items i
      join shared_groups g on g.id = i.group_id
      where i.id = item_id and g.owner_id = auth.uid()
    )
  );

create policy "member item payments" on shared_item_payments
  for select using (
    exists (
      select 1 from shared_items i
      join shared_group_members m on m.group_id = i.group_id
      where i.id = item_id and m.user_id = auth.uid()
    )
  );

create policy "owner item payments" on shared_item_payments
  for all using (
    exists (
      select 1 from shared_items i
      join shared_groups g on g.id = i.group_id
      where i.id = item_id and g.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from shared_items i
      join shared_groups g on g.id = i.group_id
      where i.id = item_id and g.owner_id = auth.uid()
    )
  );
