import { Routes, Route } from 'react-router-dom'
import Header from './components/layout/Header'
import BottomBar from './components/layout/BottomBar'
import Dashboard from './pages/Dashboard'
import Scanner from './pages/Scanner'

function Placeholder({ title }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14,
      }}
    >
      [ {title} — coming soon ]
    </div>
  )
}

export default function App() {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      <Header />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/screener" element={<Scanner />} />
          <Route path="/calc" element={<Placeholder title="Position Calculator" />} />
          <Route path="/news" element={<Placeholder title="News Feed" />} />
        </Routes>
      </div>

      <BottomBar />
    </div>
  )
}
