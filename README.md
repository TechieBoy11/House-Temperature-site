# Hearthline

Room temperature monitoring for a connected home. The repository contains the responsive React dashboard, Cloudflare Worker API, Supabase schema, and Arduino sensor example.

## Local development

Run the local API in one terminal:

```powershell
cd api
npm run dev:local
```

Then run the frontend in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend checks `http://localhost:8787/health`, then loads rooms from `/rooms` and temperature history from `/readings`. The local API starts with no readings; data appears only after the Arduino posts a real reading.

For a complete local test, configure `arduino/src/secrets.h` with `API_USE_TLS 0`, the computer's LAN IPv4 address, port `8787`, `SENSOR_TOKEN=local-sensor-token`, and `SENSOR_ID=f6af7002-7100-4b13-b04b-1ca1245d746b`. Then upload `arduino/src/sensor.ino` separately from the computer running the API. The Arduino and computer must be on the same Wi-Fi network.

### Run PostgreSQL locally

Docker Compose can start a disposable PostgreSQL instance using the project schema and seed data:

```powershell
docker compose -f database/docker-compose.yml up -d
docker compose -f database/docker-compose.yml ps
```

The local container is available at `localhost:5432` with database `temperature`, user `temperature_app`, and password `temperature_local`. For hosted use, apply `database/schema.sql` or the migration in `database/migrations/` in the Supabase SQL Editor. See [database/README.md](database/README.md) for RLS, service-role secrets, seeding, and reset instructions. The local API remains an in-memory hardware test server; the deployed Worker uses Supabase.

To wipe the PostgreSQL readings before a real-sensor test, run this only after Docker Desktop is running:

```powershell
docker exec -i hearthline-postgres psql -U temperature_app -d temperature < database/reset.sql
```

To remove the container and its stored data:

```powershell
docker compose -f database/docker-compose.yml down -v
```

The `-v` flag is destructive and should only be used when resetting local test data.

The dashboard currently ships with representative local readings, so it can be previewed before cloud credentials or physical sensors are configured.

### Share on the local network

To open the dashboard and API from a phone, tablet, or another computer on the same Wi-Fi network, start both services with their network commands.

API terminal:

```powershell
cd api
npm run dev:network
```

Frontend terminal:

```powershell
cd frontend
npm run dev:network
```

Vite will print a `Network` URL. Open that URL on the other device, for example `http://192.168.1.148:5174/`. The frontend automatically derives the API host from that same network address and uses port `8787`. The host computer and the other device must be on the same network, and Windows Firewall may ask permission for Node.js on private networks.

The network address can change when the computer reconnects to Wi-Fi. Run `ipconfig` and use the current IPv4 address if the printed URL becomes unavailable. This is development hosting only; it is not an internet-facing deployment.

### Local configuration points

- Change the frontend port or host in the `dev:network` script in `frontend/package.json`.
- Change the API port or host in `api/src/dev-server.js` and its `dev:network` command when needed.
- Override the frontend API URL with `VITE_API_URL`, for example `VITE_API_URL=http://192.168.1.148:8787` when the API runs on another machine.
- Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SENSOR_INGEST_TOKEN` as Cloudflare Worker secrets; do not put them in frontend code.
- Update `API_HOST` and `SENSOR_TOKEN` in the Arduino sketch when connecting a physical sensor.

## Project layout

- `frontend/` - React + Vite dashboard for desktop and mobile.
- `api/` - Cloudflare Worker routes for rooms, readings, health, and authenticated sensor ingest.
- `database/schema.sql` - PostgreSQL tables, constraints, indexes, and row-level security setup.
- `arduino/src/sensor.ino` - Arduino UNO R4 WiFi / DHT11 HTTPS ingest example.
- `docs/architecture.md` - deployment boundaries and data flow.

## Deploying the API

Create a Supabase project, run `database/schema.sql`, then configure Worker secrets:

```powershell
cd api
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put SENSOR_INGEST_TOKEN
npx wrangler deploy
```

The service-role key stays in the Worker and is never exposed to the frontend or committed firmware. See `docs/architecture.md` for the request contract and deployment model.

