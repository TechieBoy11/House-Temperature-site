# Architecture

The system has three public boundaries:

- `frontend/` is a React/Vite static application deployed to Cloudflare Pages. It talks to the API only over HTTPS.
- `api/` is a Cloudflare Worker. It validates sensor payloads, keeps the Supabase service-role credential server-side, and exposes read-only dashboard data.
- `database/` contains the Supabase PostgreSQL schema. Sensors belong to rooms and readings belong to sensors, so multiple sources can report into the same room.

## Data flow

1. A sensor sends `POST /readings` with `x-sensor-token` and `{ sensor_id, temperature_c }`. A future sensor may also include `humidity_percent`.
2. The Worker validates the shape and writes through the Supabase REST endpoint.
3. The frontend reads `/rooms` and `/readings` over HTTPS.
4. Cloudflare Pages and Workers deploy from GitHub Actions after a successful build.

Secrets belong in Cloudflare Worker secrets, never in frontend code or firmware committed to the repository. For production, issue one ingest token per sensor and rotate them independently.
