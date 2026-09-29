# Hearthline

Room temperature monitoring for a connected home. The repository contains the responsive React dashboard, Cloudflare Worker API, Supabase schema, and Arduino sensor example.

## Local development

```powershell
cd frontend
npm install
npm run dev
```

The dashboard currently ships with representative local readings, so it can be previewed before cloud credentials or physical sensors are configured.

### Share on the local network

To open the dashboard from a phone, tablet, or another computer on the same Wi-Fi network:

```powershell
cd frontend
npm run dev:network
```

Vite will print a `Network` URL. Open that URL on the other device, for example `http://192.168.1.148:5174/`. The host computer and the other device must be on the same network, and Windows Firewall may ask permission for Node.js on private networks.

The network address can change when the computer reconnects to Wi-Fi. Run `ipconfig` and use the current IPv4 address if the printed URL becomes unavailable. This is development hosting only; it is not an internet-facing deployment.

### Local configuration points

- Change the frontend port or host in the `dev:network` script in `frontend/package.json`.
- Change the API URL later through a frontend environment variable when replacing the fake readings with the Worker API.
- Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SENSOR_INGEST_TOKEN` as Cloudflare Worker secrets; do not put them in frontend code.
- Update `API_HOST` and `SENSOR_TOKEN` in the Arduino sketch when connecting a physical sensor.

## Project layout

- `frontend/` - React + Vite dashboard for desktop and mobile.
- `api/` - Cloudflare Worker routes for rooms, readings, health, and authenticated sensor ingest.
- `database/schema.sql` - PostgreSQL tables, constraints, indexes, and row-level security setup.
- `arduino/src/sensor.ino` - Arduino UNO WiFi / DHT22 HTTPS ingest example.
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
