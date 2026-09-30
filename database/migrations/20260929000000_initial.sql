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

create or replace view room_dashboard as
with latest_readings as (
  select distinct on (sensor_id)
    sensor_id,
    temperature_c as current_temperature_c,
    humidity_percent as current_humidity_percent,
    recorded_at as last_reading_at
  from temperature_readings
  order by sensor_id, recorded_at desc
), daily_stats as (
  select
    sensor_id,
    max(temperature_c) filter (where recorded_at >= now() - interval '24 hours') as daily_high_c,
    min(temperature_c) filter (where recorded_at >= now() - interval '24 hours') as daily_low_c,
    avg(temperature_c) filter (where recorded_at >= now() - interval '24 hours') as daily_average_c
  from temperature_readings
  group by sensor_id
)
select rooms.id, rooms.name, sensors.id as sensor_id, sensors.name as sensor_name,
  sensors.is_active, latest_readings.current_temperature_c,
  latest_readings.current_humidity_percent, latest_readings.last_reading_at,
  daily_stats.daily_high_c, daily_stats.daily_low_c, daily_stats.daily_average_c
from rooms
left join sensors on sensors.room_id = rooms.id
left join latest_readings on latest_readings.sensor_id = sensors.id
left join daily_stats on daily_stats.sensor_id = sensors.id;

grant select on room_dashboard to service_role;
