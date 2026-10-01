import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const apiBaseUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8787`;
const toFahrenheit = (celsius) => celsius * 9 / 5 + 32;
const formatTemperature = (celsius) => celsius == null ? '--' : `${toFahrenheit(celsius).toFixed(1)}°F`;
const rangeHours = (range, customDays) => range === '1 hour' ? 1 : range === '24 hours' ? 24 : range === '7 days' ? 24 * 7 : range === '30 days' ? 24 * 30 : customDays * 24;

function Icon({ children }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

function MetricChart({ actual, timestamps, high, low, average, formatValue, color, ariaLabel, range, unit, domainStart, domainEnd }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  if (!actual.length) return <div className="empty-chart">Waiting for the first sensor reading.</div>;
  const width = 800;
  const height = 260;
  const values = [...actual, ...high, ...low, average].filter((value) => value != null).map(formatValue);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max((maximum - minimum) * 0.18, 1);
  const min = minimum - padding;
  const max = maximum + padding;
  const numericTimes = timestamps.map((timestamp) => new Date(timestamp).getTime());
  const startTime = domainStart;
  const endTime = domainEnd;
  const timeSpan = Math.max(endTime - startTime, 1);
  const pointsFor = (series) => series.map((value, index) => {
    const x = ((numericTimes[index] - startTime) / timeSpan) * width;
    const y = height - ((formatValue(value) - min) / (max - min)) * height;
    return `${x},${y}`;
  }).join(' ');
  const actualPoints = pointsFor(actual);
  const pointFor = (value, index) => {
    const x = ((numericTimes[index] - startTime) / timeSpan) * width;
    const y = height - ((formatValue(value) - min) / (max - min)) * height;
    return { x, y };
  };
  const tickCount = range === '1 hour' ? 5 : range === '24 hours' ? 7 : 8;
  const axisTimes = Array.from({ length: tickCount }, (_, index) => new Date(startTime + timeSpan * (index / (tickCount - 1))));
  const axisLabel = (date) => ['1 hour', '24 hours'].includes(range) ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const lastActual = pointFor(actual.at(-1), actual.length - 1);
  const hoverPoint = hoverIndex == null ? null : pointFor(actual[hoverIndex], hoverIndex);
  const hoverDate = hoverIndex == null ? null : new Date(timestamps[hoverIndex]);
  const hoverLabel = hoverDate?.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const hoverValue = hoverIndex == null ? '' : formatValue(actual[hoverIndex]).toFixed(1);

  return (
    <div className="chart-wrap">
      <div className="chart-labels" aria-hidden="true">
        <span>{max.toFixed(0)}</span><span>{(max - (max - min) / 4).toFixed(0)}</span><span>{(max - (max - min) / 2).toFixed(0)}</span><span>{(max - (max - min) * 0.75).toFixed(0)}</span><span>{min.toFixed(0)}</span>
      </div>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={ariaLabel} onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width) * width;
        const nearest = numericTimes.reduce((best, time, index) => Math.abs(pointFor(actual[index], index).x - x) < Math.abs(pointFor(actual[best], best).x - x) ? index : best, 0);
        setHoverIndex(nearest);
      }} onPointerLeave={() => setHoverIndex(null)}>
        {[0, 1, 2, 3, 4].map((line) => <line key={line} x1="0" x2={width} y1={line * (height / 4)} y2={line * (height / 4)} className="grid-line" />)}
        <polyline points={`${actualPoints} ${width},${height} 0,${height}`} className="area-fill" />
        <polyline points={pointsFor(high)} className="chart-high" />
        <polyline points={pointsFor(low)} className="chart-low" />
        <line x1="0" x2={width} y1={height - ((formatValue(average) - min) / (max - min)) * height} y2={height - ((formatValue(average) - min) / (max - min)) * height} className="chart-average" />
        <polyline points={actualPoints} className="chart-line" style={{ stroke: color }} />
        {actual.map((value, index) => {
          const point = pointFor(value, index);
          return index % Math.max(1, Math.floor(actual.length / 100)) === 0 ? <circle key={index} cx={point.x} cy={point.y} r="2.5" className={formatValue(value) >= formatValue(average) ? 'chart-dot-above' : 'chart-dot-below'} /> : null;
        })}
        <circle cx={lastActual.x} cy={lastActual.y} r="6" className="chart-dot" style={{ fill: color }} />
        {hoverPoint && <g className="chart-tooltip" pointerEvents="none"><line x1={hoverPoint.x} x2={hoverPoint.x} y1="0" y2={height} className="chart-crosshair" /><circle cx={hoverPoint.x} cy={hoverPoint.y} r="5" className="chart-hover-dot" style={{ fill: color }} /><text x={Math.min(Math.max(hoverPoint.x - 70, 14), width - 154)} y="27">{hoverLabel}</text><text x={Math.min(Math.max(hoverPoint.x - 70, 14), width - 154)} y="44">{hoverValue}{unit}</text></g>}
      </svg>
      <div className="chart-times">{axisTimes.map((time) => <span key={time.toISOString()}>{axisLabel(time)}</span>)}</div>
      <div className="chart-legend"><span><i className="legend-actual" />Actual</span><span><i className="legend-high" />High</span><span><i className="legend-low" />Low</span><span><i className="legend-average" />Average</span></div>
    </div>
  );
}

function App() {
  const [rooms, setRooms] = useState([]);
  const [readings, setReadings] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [range, setRange] = useState('24 hours');
  const [customDays, setCustomDays] = useState(14);
  const [navOpen, setNavOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState('connecting');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [healthResponse, roomsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/health`),
          fetch(`${apiBaseUrl}/rooms`),
        ]);
        if (!healthResponse.ok || !roomsResponse.ok) throw new Error('API request failed');
        const nextRooms = await roomsResponse.json();
        setRooms(nextRooms);
        const firstRoom = nextRooms.find((room) => room.name === "Logan's bedroom") ?? nextRooms[0];
        setSelectedRoom((current) => current || firstRoom?.name || '');
        setApiStatus('connected');
      } catch {
        setApiStatus('offline');
      }
    };
    loadDashboard();
    const timer = setInterval(loadDashboard, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const rangeQuery = range === '1 hour' ? '1h' : range === '24 hours' ? '24h' : range === '7 days' ? '7d' : range === '30 days' ? '30d' : 'custom';
    const daysQuery = range === 'custom' ? `&days=${customDays}` : '';
    fetch(`${apiBaseUrl}/readings?range=${rangeQuery}${daysQuery}&limit=50000`).then((response) => {
      if (!response.ok) throw new Error('Readings request failed');
      return response.json();
    }).then(setReadings).catch(() => {
      setReadings([]);
      setApiStatus('offline');
    });
  }, [range, customDays]);

  const activeRoom = useMemo(() => rooms.find((room) => room.name === selectedRoom) ?? rooms[0], [selectedRoom]);
  const visibleRooms = activeRoom ? [activeRoom] : rooms.slice(0, 1);
  const currentTemp = activeRoom?.current_temperature_c;
  const roomReadings = useMemo(() => readings.filter((reading) => reading.room_id === activeRoom?.id).sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)), [activeRoom, readings]);
  const buildSeries = (field) => {
    const rawPoints = roomReadings.filter((reading) => Number.isFinite(reading[field]));
    const rawValues = rawPoints.map((reading) => reading[field]);
    if (!rawValues.length) return { actual: [], timestamps: [], high: [], low: [], average: null };
    const average = rawValues.reduce((sum, value) => sum + value, 0) / rawValues.length;
    const aggregation = range === '24 hours' ? 'hour' : ['7 days', '30 days', 'custom'].includes(range) ? 'day' : 'range';
    const bucketKey = (timestamp) => {
      const time = new Date(timestamp).getTime();
      return aggregation === 'hour' ? new Date(Math.floor(time / 3600000) * 3600000).toISOString() : new Date(time).toISOString().slice(0, 10);
    };
    const buckets = new Map();
    rawPoints.forEach((reading) => {
      const bucket = bucketKey(reading.recorded_at);
      const value = reading[field];
      const values = buckets.get(bucket) || [];
      values.push(value);
      buckets.set(bucket, values);
    });
    const useHourlyPoints = !['1 hour', '24 hours'].includes(range);
    const points = useHourlyPoints ? [...rawPoints.reduce((buckets, reading) => {
      const hour = Math.floor(new Date(reading.recorded_at).getTime() / 3600000) * 3600000;
      const bucket = buckets.get(hour) || [];
      bucket.push(reading[field]);
      buckets.set(hour, bucket);
      return buckets;
    }, new Map())].map(([hour, values]) => ({ timestamp: new Date(hour).toISOString(), value: values.reduce((sum, value) => sum + value, 0) / values.length })) : rawPoints.map((reading) => ({ timestamp: reading.recorded_at, value: reading[field] }));
    const actual = points.map((point) => point.value);
    const timestamps = points.map((point) => point.timestamp);
    const useBucketLines = aggregation !== 'range';
    return { actual, timestamps, high: points.map((point) => useBucketLines ? Math.max(...buckets.get(bucketKey(point.timestamp))) : Math.max(...rawValues)), low: points.map((point) => useBucketLines ? Math.min(...buckets.get(bucketKey(point.timestamp))) : Math.min(...rawValues)), average };
  };
  const temperatureSeries = buildSeries('temperature_c');
  const humiditySeries = buildSeries('humidity_percent');
  const domainEnd = Date.now();
  const domainStart = domainEnd - rangeHours(range, customDays) * 60 * 60 * 1000;

  if (!activeRoom) return <div className="loading-screen">{apiStatus === 'offline' ? `API unavailable at ${apiBaseUrl}` : 'Connecting to room temperature API...'}</div>;

  return (
    <div className="app-shell">
      <aside className={navOpen ? 'sidebar open' : 'sidebar'}>
        <div className="brand"><span className="brand-mark"><Icon>⌁</Icon></span><span>hearthline</span></div>
        <div className="sidebar-label">Your home</div>
        <nav>
          <button className="nav-item active"><Icon>◉</Icon>Overview</button>
          <button className="nav-item"><Icon>⌁</Icon>History</button>
          <button className="nav-item"><Icon>⌂</Icon>Rooms <span className="nav-count">1</span></button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="connection"><span className={`status-dot ${apiStatus === 'connected' ? '' : 'warning'}`} />{apiStatus === 'connected' ? 'API connected' : 'Connecting to API'}<div className="connection-time">{apiBaseUrl}</div></div>
        <div className="profile"><div className="avatar">LJ</div><div><strong>Logan Johnson</strong><span>Home dashboard</span></div><button className="more-button" aria-label="Open profile menu">•••</button></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="menu-button" onClick={() => setNavOpen(!navOpen)} aria-label="Open navigation">☰</button><div className="breadcrumb"><span>Home</span><b>/</b><strong>Overview</strong></div><div className="top-actions"><span className="last-sync"><span className="status-dot" />Live</span><button className="round-button" aria-label="Notifications">♧</button><button className="round-button" aria-label="Settings">⚙</button></div></header>

        <div className="content-wrap">
          <section className="welcome-row"><div><p className="eyebrow">Tuesday, September 29, 2026</p><h1>Good evening, Logan Johnson.</h1><p className="subtitle">Here&apos;s how your home is feeling right now.</p></div></section>

          <section className="hero-grid">
            <article className="current-card">
              <div className="card-heading"><div><span className="eyebrow light">CURRENT TEMPERATURE</span><h2>{formatTemperature(currentTemp)}</h2></div><div className="thermo-icon">♨</div></div>
              <div className="card-footer"><span>{activeRoom.name}</span><span className="divider" /><span>Feels like {formatTemperature(currentTemp)}</span><span className="trend">↗ 0.5° today</span></div>
            </article>
            <article className="stat-card"><div className="stat-top"><span className="eyebrow">TODAY&apos;S HIGH</span><Icon>↗</Icon></div><strong>{formatTemperature(activeRoom.daily_high_c)}</strong><p>Highest reading today</p></article>
            <article className="stat-card"><div className="stat-top"><span className="eyebrow">TODAY&apos;S LOW</span><Icon>↘</Icon></div><strong>{formatTemperature(activeRoom.daily_low_c)}</strong><p>Lowest reading today</p></article>
            <article className="stat-card"><div className="stat-top"><span className="eyebrow">DAILY AVERAGE</span><Icon>—</Icon></div><strong>{formatTemperature(activeRoom.daily_average_c)}</strong><p>Average across today</p></article>
            <article className="stat-card"><div className="stat-top"><span className="eyebrow">HUMIDITY</span><Icon>◌</Icon></div><strong>{activeRoom.current_humidity_percent == null ? '--' : activeRoom.current_humidity_percent}<span>{activeRoom.current_humidity_percent == null ? '' : '%'}</span></strong><div className="meter"><span style={{ width: `${activeRoom.current_humidity_percent ?? 0}%` }} /></div><p>Relative humidity</p></article>
          </section>

          <section className="history-section"><div className="section-heading history-heading"><div><span className="eyebrow">TEMPERATURE HISTORY</span><h2>{selectedRoom} over time.</h2></div><div className="range-picker">{['1 hour', '24 hours', '7 days', '30 days', 'custom'].map((option) => <button key={option} className={range === option ? 'active' : ''} onClick={() => setRange(option)}>{option === '1 hour' ? 'Past hour' : option}</button>)}{range === 'custom' && <label className="custom-range"><input type="number" min="1" max="365" value={customDays} onChange={(event) => setCustomDays(Math.min(Math.max(Number(event.target.value) || 1, 1), 365))} /> days</label>}</div></div><div className="chart-card"><div className="chart-summary"><div><strong>{formatTemperature(currentTemp)}</strong><span className="positive">↗ 2.1%</span><p>Current temperature</p></div><div className="high-low"><span><i className="high-dot" />High <b>{formatTemperature(activeRoom.daily_high_c)}</b></span><span><i className="low-dot" />Low <b>{formatTemperature(activeRoom.daily_low_c)}</b></span></div></div><MetricChart actual={temperatureSeries.actual} timestamps={temperatureSeries.timestamps} high={temperatureSeries.high} low={temperatureSeries.low} average={temperatureSeries.average} formatValue={toFahrenheit} color="#c96752" unit="°F" range={range} domainStart={domainStart} domainEnd={domainEnd} ariaLabel={`${selectedRoom} temperature history`} /></div><div className="room-selector"><label htmlFor="room-select">ROOM</label><select id="room-select" value={selectedRoom} onChange={(event) => setSelectedRoom(event.target.value)}>{visibleRooms.map((room) => <option key={room.name} value={room.name}>{room.name}</option>)}</select><span>More rooms can be added here later.</span></div></section>
          <section className="history-section humidity-history"><div className="section-heading history-heading"><div><span className="eyebrow">HUMIDITY HISTORY</span><h2>{selectedRoom} humidity.</h2></div></div><div className="chart-card"><div className="chart-summary"><div><strong>{activeRoom.current_humidity_percent == null ? '--' : `${activeRoom.current_humidity_percent}%`}</strong><p>Current relative humidity</p></div><div className="high-low"><span><i className="high-dot" />High <b>{humiditySeries.actual.length ? `${Math.max(...humiditySeries.actual).toFixed(0)}%` : '--'}</b></span><span><i className="low-dot" />Low <b>{humiditySeries.actual.length ? `${Math.min(...humiditySeries.actual).toFixed(0)}%` : '--'}</b></span></div></div><MetricChart actual={humiditySeries.actual} timestamps={humiditySeries.timestamps} high={humiditySeries.high} low={humiditySeries.low} average={humiditySeries.average} formatValue={(value) => value} color="#5684a5" unit="%" range={range} domainStart={domainStart} domainEnd={domainEnd} ariaLabel={`${selectedRoom} humidity history`} /></div></section>
          <footer>Hearthline home climate <span>•</span> Data refreshes automatically every 5 minutes</footer>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
