import { useState } from 'react'
import NumberAdder from './components/NumberAdder'
import BlackScholes from './components/BlackScholes'
import MonteCarlo from './components/MonteCarlo'

const tabs = [
  { id: 'adder', label: 'Number Adder', icon: '＋' },
  { id: 'blackscholes', label: 'Black-Scholes', icon: '◈' },
  { id: 'montecarlo', label: 'Monte Carlo', icon: '◎' },
]

function App() {
  const [activeTab, setActiveTab] = useState('adder')

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <p style={styles.sidebarSubtitle}>Finance Tools</p>
        </div>
        <nav style={styles.nav}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.id ? styles.tabButtonActive : {}),
              }}
            >
              <span style={styles.tabIcon}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main style={styles.content}>
        {activeTab === 'adder' && <NumberAdder />}
        {activeTab === 'blackscholes' && <BlackScholes />}
        {activeTab === 'montecarlo' && <MonteCarlo />}
      </main>
    </div>
  )
}

const styles = {
  app: {
    display: 'flex',
    height: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    background: '#f1f5f9',
  },
  sidebar: {
    width: 220,
    background: '#1e293b',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  sidebarHeader: {
    padding: '28px 20px 20px',
    borderBottom: '1px solid #334155',
  },
  sidebarSubtitle: {
    color: '#94a3b8',
    margin: 0,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
  },
  nav: {
    padding: '12px 0',
  },
  tabButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 20px',
    background: 'none',
    border: 'none',
    borderLeft: '3px solid transparent',
    color: '#94a3b8',
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'left',
  },
  tabButtonActive: {
    background: 'rgba(99,102,241,0.1)',
    color: '#e2e8f0',
    borderLeft: '3px solid #6366f1',
  },
  tabIcon: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '40px',
  },
}

export default App
