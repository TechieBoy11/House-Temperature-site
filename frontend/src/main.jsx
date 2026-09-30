import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const apiBaseUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8787`;
const toFahrenheit = (celsius) => celsius * 9 / 5 + 32;
const formatTemperature = (celsius) => celsius == null ? '--' : `${toFahrenheit(celsius).toFixed(1)}°F`;

function Icon({ children }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

function MetricChart({ actual, high, low, formatValue, color, ariaLabel }) {
  if (!actual.length) return <div className="empty-chart">Waiting for the first sensor reading.</div>;
  const width = 800;
  const height = 260;
  const values = [...actual, ...high, ...low].map(formatValue);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max((maximum - minimum) * 0.18, 1);
  const min = minimum - padding;
  const max = maximum + padding;
  const denominator = Math.max(actual.length - 1, 1);
  const pointsFor = (series) => series.map((value, index) => {
    const x = (index / denominator) * width;
    const y = height - ((formatValue(value) - min) / (max - min)) * height;
    return `${x},${y}`;
  }).join(' ');
  const actualPoints = pointsFor(actual);
  const lastActual = actual.at(-1);

  return (
    <div className="chart-wrap">
      <div className="chart-labels" aria-hidden="true">
        <span>{max.toFixed(0)}</span><span>{(max - (max - min) / 4).toFixed(0)}</span><span>{(max - (max - min) / 2).toFixed(0)}</span><span>{(max - (max - min) * 0.75).toFixed(0)}</span><span>{min.toFixed(0)}</span>
      </div>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        {[0, 1, 2, 3, 4].map((line) => <line key={line} x1="0" x2={width} y1={line * (height / 4)} y2={line * (height / 4)} className="grid-line" />)}
        <polyline points={`${actualPoints} ${width},${height} 0,${height}`} className="area-fill" />
        {high.length > 0 && <polyline points={pointsFor(high)} className="chart-high" />}
        {low.length > 0 && <polyline points={pointsFor(low)} className="chart-low" />}
        <polyline points={actualPoints} className="chart-line" style={{ stroke: color }} />
        <circle cx={width} cy={height - ((formatValue(lastActual) - min) / (max - min)) * height} r="6" className="chart-dot" style={{ fill: color }} />
      </svg>
      <div className="chart-times"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>Now</span></div>
    </div>
  );
}

function App() {
  const [rooms, setRooms] = useState([]);
  const [readings, setReadings] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [range, setRange] = useState('24 hours');
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
    const rangeQuery = range === '24 hours' ? '24h' : range === '7 days' ? '7d' : '30d';
    fetch(`${apiBaseUrl}/readings?range=${rangeQuery}&limit=2000`).then((response) => {
      if (!response.ok) throw new Error('Readings request failed');
      return response.json();
    }).then(setReadings).catch(() => {
      setReadings([]);
      setApiStatus('offline');
    });
  }, [range]);

  const activeRoom = useMemo(() => rooms.find((room) => room.name === selectedRoom) ?? rooms[0], [selectedRoom]);
  const visibleRooms = activeRoom ? [activeRoom] : rooms.slice(0, 1);
  const currentTemp = activeRoom?.current_temperature_c;
  const roomReadings = useMemo(() => readings.filter((reading) => reading.room_id === activeRoom?.id).sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)), [activeRoom, readings]);
  const buildSeries = (field) => {
    const actual = roomReadings.map((reading) => reading[field]);
    if (range === '24 hours') return { actual, high: [], low: [] };
    const daily = new Map();
    roomReadings.forEach((reading) => {
      const day = reading.recorded_at.slice(0, 10);
      const value = reading[field];
      const values = daily.get(day) || [];
      values.push(value);
      daily.set(day, values);
    });
    return { actual, high: roomReadings.map((reading) => Math.max(...daily.get(reading.recorded_at.slice(0, 10)))), low: roomReadings.map((reading) => Math.min(...daily.get(reading.recorded_at.slice(0, 10)))) };
  };
  const temperatureSeries = buildSeries('temperature_c');
  const humiditySeries = buildSeries('humidity_percent');

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

          <section className="history-section"><div className="section-heading history-heading"><div><span className="eyebrow">TEMPERATURE HISTORY</span><h2>{selectedRoom} over time.</h2></div><div className="range-picker">{['24 hours', '7 days', '30 days'].map((option) => <button key={option} className={range === option ? 'active' : ''} onClick={() => setRange(option)}>{option}</button>)}</div></div><div className="chart-card"><div className="chart-summary"><div><strong>{formatTemperature(currentTemp)}</strong><span className="positive">↗ 2.1%</span><p>Current temperature</p></div><div className="high-low"><span><i className="high-dot" />High <b>{formatTemperature(activeRoom.daily_high_c)}</b></span><span><i className="low-dot" />Low <b>{formatTemperature(activeRoom.daily_low_c)}</b></span></div></div><MetricChart actual={temperatureSeries.actual.length ? temperatureSeries.actual : [currentTemp]} high={temperatureSeries.high} low={temperatureSeries.low} formatValue={toFahrenheit} color="#c96752" ariaLabel={`${selectedRoom} temperature history`} /></div><div className="room-selector"><label htmlFor="room-select">ROOM</label><select id="room-select" value={selectedRoom} onChange={(event) => setSelectedRoom(event.target.value)}>{visibleRooms.map((room) => <option key={room.name} value={room.name}>{room.name}</option>)}</select><span>More rooms can be added here later.</span></div></section>
          <section className="history-section humidity-history"><div className="section-heading history-heading"><div><span className="eyebrow">HUMIDITY HISTORY</span><h2>{selectedRoom} humidity.</h2></div></div><div className="chart-card"><div className="chart-summary"><div><strong>{activeRoom.current_humidity_percent == null ? '--' : `${activeRoom.current_humidity_percent}%`}</strong><p>Current relative humidity</p></div><div className="high-low"><span><i className="high-dot" />High <b>{humiditySeries.actual.length ? `${Math.max(...humiditySeries.actual).toFixed(0)}%` : '--'}</b></span><span><i className="low-dot" />Low <b>{humiditySeries.actual.length ? `${Math.min(...humiditySeries.actual).toFixed(0)}%` : '--'}</b></span></div></div><MetricChart actual={humiditySeries.actual} high={humiditySeries.high} low={humiditySeries.low} formatValue={(value) => value} color="#5684a5" ariaLabel={`${selectedRoom} humidity history`} /></div></section>
          <footer>Hearthline home climate <span>•</span> Data refreshes automatically every 5 minutes</footer>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
