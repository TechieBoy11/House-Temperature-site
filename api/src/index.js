const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,x-sensor-token' },
});

const supabase = (env, path, options = {}) => fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
  ...options,
  headers: {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'content-type': 'application/json',
    ...(options.headers || {}),
  },
});

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (request.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,x-sensor-token' } });
      if (url.pathname === '/health') return json({ status: 'ok', service: 'room-temperature-api' });

    if (url.pathname === '/readings' && request.method === 'GET') {
      const limit = Math.min(Number(url.searchParams.get('limit') || 100), 500);
      const response = await supabase(env, `temperature_readings?select=*,sensors(room_id)&order=recorded_at.desc&limit=${limit}`);
      if (!response.ok) return new Response(response.body, { status: response.status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
      const readings = await response.json();
      return json(readings.map((reading) => ({ ...reading, room_id: reading.sensors?.room_id })), response.status);
    }

    if (url.pathname === '/readings' && request.method === 'POST') {
      if (!env.SENSOR_INGEST_TOKEN || request.headers.get('x-sensor-token') !== env.SENSOR_INGEST_TOKEN) return json({ error: 'Unauthorized' }, 401);
      const payload = await request.json();
      if (!payload.sensor_id || typeof payload.temperature_c !== 'number' || (payload.humidity_percent !== undefined && typeof payload.humidity_percent !== 'number')) return json({ error: 'sensor_id and temperature_c are required; humidity_percent is optional' }, 400);
      const reading = { sensor_id: payload.sensor_id, temperature_c: payload.temperature_c, recorded_at: new Date().toISOString() };
      if (payload.humidity_percent !== undefined) reading.humidity_percent = payload.humidity_percent;
      const response = await supabase(env, 'temperature_readings', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(reading) });
      return new Response(response.body, { status: response.status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
    }

    if (url.pathname === '/rooms' && request.method === 'GET') {
      const response = await supabase(env, 'room_dashboard?select=*&order=name.asc');
      return new Response(response.body, { status: response.status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
    }
      return json({ error: 'Not found' }, 404);
    } catch (error) {
      return json({ error: 'Database request failed', detail: error instanceof Error ? error.message : String(error) }, 503);
    }
  },
};
