import { createServer } from 'node:http';

const port = Number(process.env.PORT || 8787);
const rooms = [
  { id: 'living-room-sensor', name: 'Living room', note: 'North-facing', status: 'Waiting for sensor', color: '#df755b', icon: 'LR', current_temperature_c: null, current_humidity_percent: null, daily_high_c: null, daily_low_c: null, daily_average_c: null },
  { id: 'f6af7002-7100-4b13-b04b-1ca1245d746b', name: "Logan's bedroom", note: 'Quiet hours', status: 'Waiting for sensor', color: '#5684a5', icon: 'LB', current_temperature_c: null, current_humidity_percent: null, daily_high_c: null, daily_low_c: null, daily_average_c: null },
  { id: 'fac96f01-5ae9-4c81-b867-193ca4c6372d', name: 'master_room', note: 'Radio node', status: 'Waiting for sensor', color: '#c89b4a', icon: 'MR', current_temperature_c: null, current_humidity_percent: null, daily_high_c: null, daily_low_c: null, daily_average_c: null },
  { id: 'kitchen-sensor', name: 'Kitchen', note: 'Sensor online', status: 'Waiting for sensor', color: '#c89b4a', icon: 'KT', current_temperature_c: null, current_humidity_percent: null, daily_high_c: null, daily_low_c: null, daily_average_c: null },
  { id: 'studio-sensor', name: 'Studio', note: 'Sunlit', status: 'Waiting for sensor', color: '#bc6258', icon: 'ST', current_temperature_c: null, current_humidity_percent: null, daily_high_c: null, daily_low_c: null, daily_average_c: null },
];
const readings = [];
const ingestToken = process.env.SENSOR_INGEST_TOKEN || 'local-sensor-token';

const refreshRoomStats = (room) => {
  const roomReadings = readings.filter((reading) => reading.room_id === room.id);
  const latest = roomReadings.at(-1);
  if (!latest) return;
  room.current_temperature_c = latest.temperature_c;
  room.current_humidity_percent = latest.humidity_percent ?? null;
  room.daily_high_c = Math.max(...roomReadings.map((reading) => reading.temperature_c));
  room.daily_low_c = Math.min(...roomReadings.map((reading) => reading.temperature_c));
  room.daily_average_c = +(roomReadings.reduce((sum, reading) => sum + reading.temperature_c, 0) / roomReadings.length).toFixed(2);
  room.status = 'Sensor online';
};

const send = (response, status, body) => {
  response.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,x-sensor-token' });
  response.end(JSON.stringify(body));
};

const server = createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === 'OPTIONS') return send(response, 204, null);
  if (url.pathname === '/health') return send(response, 200, { status: 'ok', service: 'room-temperature-api', mode: 'local', timestamp: new Date().toISOString() });
  if (url.pathname === '/rooms' && request.method === 'GET') return send(response, 200, rooms);
  if (url.pathname === '/readings' && request.method === 'POST') {
    if (request.headers['x-sensor-token'] !== ingestToken) return send(response, 401, { error: 'Unauthorized' });
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (!payload.sensor_id || typeof payload.temperature_c !== 'number' || (payload.humidity_percent !== undefined && typeof payload.humidity_percent !== 'number')) return send(response, 400, { error: 'sensor_id and temperature_c are required; humidity_percent is optional' });
        const room = rooms.find((candidate) => candidate.id === payload.sensor_id);
        if (!room) return send(response, 404, { error: 'Unknown sensor_id' });
        const reading = { id: `${payload.sensor_id}-${Date.now()}`, room_id: room.id, sensor_id: payload.sensor_id, temperature_c: payload.temperature_c, humidity_percent: payload.humidity_percent, recorded_at: new Date().toISOString() };
        readings.push(reading);
        refreshRoomStats(room);
        return send(response, 201, reading);
      } catch { return send(response, 400, { error: 'Invalid JSON' }); }
    });
    return;
  }
  if (url.pathname === '/readings' && request.method === 'GET') {
    const range = url.searchParams.get('range') || '24h';
    const customDays = Math.min(Math.max(Number(url.searchParams.get('days') || 1), 1), 365);
    const hours = range === '1h' ? 1 : range === '24h' ? 24 : range === '7d' ? 24 * 7 : range === '30d' ? 24 * 30 : customDays * 24;
    const limit = Math.min(Number(url.searchParams.get('limit') || 5000), 5000);
    const windowStart = Date.now() - hours * 60 * 60 * 1000;
    const matching = readings.filter((reading) => new Date(reading.recorded_at).getTime() >= windowStart);
    return send(response, 200, matching.slice(-limit).reverse());
  }
  return send(response, 404, { error: 'Not found' });
});

server.listen(port, '0.0.0.0', () => console.log(`Room temperature API listening on http://0.0.0.0:${port}`));
