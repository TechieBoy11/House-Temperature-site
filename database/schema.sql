create extension if not exists pgcrypto;

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists sensors (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  device_key_hash text not null unique,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists temperature_readings (
  id bigint generated always as identity primary key,
  sensor_id uuid not null references sensors(id) on delete cascade,
  temperature_c numeric(5, 2) not null check (temperature_c between -50 and 100),
  humidity_percent numeric(5, 2) check (humidity_percent between 0 and 100),
  recorded_at timestamptz not null default now()
);

create index if not exists temperature_readings_sensor_time_idx on temperature_readings(sensor_id, recorded_at desc);
create index if not exists temperature_readings_recorded_at_idx on temperature_readings(recorded_at desc);

alter table rooms enable row level security;
alter table sensors enable row level security;
alter table temperature_readings enable row level security;

-- The API uses the Supabase service role; no client-facing table policies are needed.
