# Supabase database

The Supabase project uses PostgreSQL for rooms, sensors, and temperature/humidity readings. The API is the only component that should use the Supabase service-role key.

## Apply the schema

In the Supabase dashboard:

1. Open **SQL Editor**.
2. Run `schema.sql` for a new project, or run the timestamped file in `migrations/` when using migration-based deployment.
3. Run `seed.sql` to create only Logan's bedroom and its first sensor. It intentionally inserts no recording data.

The schema enables RLS on the base tables. No public table policies are created because the frontend never connects directly to Supabase; the Cloudflare Worker uses the service role server-side.

## API access

Set these as Cloudflare Worker secrets, never in frontend or Arduino files:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SENSOR_INGEST_TOKEN
```

The `room_dashboard` view provides the latest reading and rolling 24-hour high, low, and average for each sensor room.

## Reset real data

For a complete wipe in Supabase SQL Editor, run:

```sql
truncate table temperature_readings, sensors, rooms restart identity cascade;
```

This is destructive. It removes rooms, sensors, and all readings. Recreate the room and sensor records before sending Arduino readings again.
