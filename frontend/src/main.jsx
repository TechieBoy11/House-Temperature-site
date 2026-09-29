import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const rooms = [
  { name: 'Living room', temp: 21.8, humidity: 46, status: 'Comfortable', color: '#df755b', icon: 'LR', note: 'North-facing' },
  { name: 'Bedroom', temp: 19.6, humidity: 51, status: 'Cool', color: '#5684a5', icon: 'BR', note: 'Quiet hours' },
  { name: 'Kitchen', temp: 22.4, humidity: 44, status: 'Comfortable', color: '#c89b4a', icon: 'KT', note: 'Sensor online' },
  { name: 'Studio', temp: 23.1, humidity: 39, status: 'Warm', color: '#bc6258', icon: 'ST', note: 'Sunlit' },
];

const chartPoints = [21.1, 21.5, 21.3, 21.8, 22.2, 22.0, 21.7, 21.5, 21.8, 22.4, 22.1, 21.8, 21.6, 21.9, 22.0, 21.8, 22.2, 22.5, 22.1, 21.9, 22.0, 21.8];
const toFahrenheit = (celsius) => celsius * 9 / 5 + 32;
const formatTemperature = (celsius) => `${toFahrenheit(celsius).toFixed(1)}°F`;

function Icon({ children }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

function TemperatureChart({ points }) {
  const width = 800;
  const height = 260;
  const min = 68;
  const max = 75;
  const pointString = points.map((value, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((toFahrenheit(value) - min) / (max - min)) * height;
    return `${x},${y}`;
  }).join(' ');
  const areaString = `0,${height} ${pointString} ${width},${height}`;

  return (
    <div className="chart-wrap">
      <div className="chart-labels" aria-hidden="true">
        <span>75°</span><span>73°</span><span>71°</span><span>69°</span><span>68°</span>
      </div>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Living room temperature trend over the last 24 hours">
        {[0, 1, 2, 3, 4].map((line) => <line key={line} x1="0" x2={width} y1={line * (height / 4)} y2={line * (height / 4)} className="grid-line" />)}
        <polygon points={areaString} className="area-fill" />
        <polyline points={pointString} className="chart-line" />
        <circle cx={width} cy={height - ((toFahrenheit(points.at(-1)) - min) / (max - min)) * height} r="6" className="chart-dot" />
      </svg>
      <div className="chart-times"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>Now</span></div>
    </div>
  );
}

function App() {
  const [selectedRoom, setSelectedRoom] = useState('Living room');
  const [range, setRange] = useState('24 hours');
  const [currentTemp, setCurrentTemp] = useState(21.8);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTemp((value) => +(value + (Math.random() - 0.5) * 0.08).toFixed(1)), 5000);
    return () => clearInterval(timer);
  }, []);

  const activeRoom = useMemo(() => rooms.find((room) => room.name === selectedRoom) ?? rooms[0], [selectedRoom]);
  const roomPoints = useMemo(() => chartPoints.map((point) => +(point + (activeRoom.temp - 21.8)).toFixed(1)), [activeRoom]);

  return (
    <div className="app-shell">
      <aside className={navOpen ? 'sidebar open' : 'sidebar'}>
        <div className="brand"><span className="brand-mark"><Icon>⌁</Icon></span><span>hearthline</span></div>
        <div className="sidebar-label">Your home</div>
        <nav>
          <button className="nav-item active"><Icon>◉</Icon>Overview</button>
          <button className="nav-item"><Icon>⌁</Icon>History</button>
          <button className="nav-item"><Icon>⌂</Icon>Rooms <span className="nav-count">4</span></button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="connection"><span className="status-dot" />All sensors connected<div className="connection-time">Updated just now</div></div>
        <div className="profile"><div className="avatar">AM</div><div><strong>Alex Morgan</strong><span>Home dashboard</span></div><button className="more-button" aria-label="Open profile menu">•••</button></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="menu-button" onClick={() => setNavOpen(!navOpen)} aria-label="Open navigation">☰</button><div className="breadcrumb"><span>Home</span><b>/</b><strong>Overview</strong></div><div className="top-actions"><span className="last-sync"><span className="status-dot" />Live</span><button className="round-button" aria-label="Notifications">♧</button><button className="round-button" aria-label="Settings">⚙</button></div></header>

        <div className="content-wrap">
          <section className="welcome-row"><div><p className="eyebrow">Tuesday, September 29, 2026</p><h1>Good evening, Alex.</h1><p className="subtitle">Here&apos;s how your home is feeling right now.</p></div><button className="add-button"><span>+</span> Add sensor</button></section>

          <section className="hero-grid">
            <article className="current-card">
              <div className="card-heading"><div><span className="eyebrow light">CURRENT TEMPERATURE</span><h2>{formatTemperature(currentTemp)}</h2></div><div className="thermo-icon">♨</div></div>
              <div className="card-footer"><span>Living room</span><span className="divider" /><span>Feels like {formatTemperature(currentTemp)}</span><span className="trend">↗ 0.5° today</span></div>
            </article>
            <article className="stat-card"><div className="stat-top"><span className="eyebrow">TODAY&apos;S HIGH</span><Icon>↗</Icon></div><strong>72.5<span>°F</span></strong><p>Highest reading today</p></article>
            <article className="stat-card"><div className="stat-top"><span className="eyebrow">TODAY&apos;S LOW</span><Icon>↘</Icon></div><strong>69.3<span>°F</span></strong><p>Lowest reading today</p></article>
            <article className="stat-card"><div className="stat-top"><span className="eyebrow">DAILY AVERAGE</span><Icon>—</Icon></div><strong>71.2<span>°F</span></strong><p>Average across today</p></article>
          </section>

          <section className="section-heading"><div><span className="eyebrow">AT A GLANCE</span><h2>Every room, in balance.</h2></div><button className="text-button">Manage rooms <span>→</span></button></section>
          <section className="room-grid">{rooms.map((room) => <button key={room.name} className={`room-card ${selectedRoom === room.name ? 'selected' : ''}`} onClick={() => setSelectedRoom(room.name)}><div className="room-icon" style={{ backgroundColor: `${room.color}18`, color: room.color }}>{room.icon}</div><div className="room-info"><strong>{room.name}</strong><span>{room.note}</span></div><div className="room-reading"><strong>{formatTemperature(room.temp)}</strong><span style={{ color: room.color }}>{room.status}</span></div></button>)}</section>

          <section className="history-section"><div className="section-heading history-heading"><div><span className="eyebrow">TEMPERATURE HISTORY</span><h2>{selectedRoom} over time.</h2></div><div className="range-picker">{['24 hours', '7 days', '30 days'].map((option) => <button key={option} className={range === option ? 'active' : ''} onClick={() => setRange(option)}>{option}</button>)}</div></div><div className="chart-card"><div className="chart-summary"><div><strong>{formatTemperature(activeRoom.temp)}</strong><span className="positive">↗ 2.1%</span><p>Current temperature</p></div><div className="high-low"><span><i className="high-dot" />High <b>{formatTemperature(activeRoom.temp + 0.7)}</b></span><span><i className="low-dot" />Low <b>{formatTemperature(activeRoom.temp - 1.1)}</b></span></div></div><TemperatureChart points={roomPoints} /></div></section>
          <footer>Hearthline home climate <span>•</span> Data refreshes automatically every 5 minutes</footer>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
