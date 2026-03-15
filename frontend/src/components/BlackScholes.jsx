import { useState } from 'react'

const defaultInputs = {
  S: '100',
  K: '100',
  T: '1',
  r: '5',
  sigma: '20',
  option_type: 'call',
}

const greeks = [
  { key: 'price', label: 'Option Price', format: v => `$${v}`, color: '#6366f1', desc: 'Fair value of the option' },
  { key: 'delta', label: 'Delta (Δ)', format: v => v, color: '#0ea5e9', desc: 'Price sensitivity to underlying' },
  { key: 'gamma', label: 'Gamma (Γ)', format: v => v, color: '#10b981', desc: 'Rate of change of delta' },
  { key: 'theta', label: 'Theta (Θ)', format: v => `$${v}`, color: '#f59e0b', desc: 'Daily time decay' },
  { key: 'vega', label: 'Vega (ν)', format: v => `$${v}`, color: '#8b5cf6', desc: 'Sensitivity per 1% vol change' },
  { key: 'rho', label: 'Rho (ρ)', format: v => `$${v}`, color: '#ec4899', desc: 'Sensitivity per 1% rate change' },
]

function BlackScholes() {
  const [inputs, setInputs] = useState(defaultInputs)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setInputs(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleCalculate = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('https://testproject-ud43.onrender.com/blackscholes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      })
      const data = await response.json()
      if (data.error) {
        setError(data.error)
        setResults(null)
      } else {
        setResults(data)
      }
    } catch {
      setError('Could not connect to the backend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Black-Scholes Option Pricer</h1>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Inputs</h2>
        <div style={styles.grid}>
          <Field label="Stock Price (S)" name="S" value={inputs.S} onChange={handleChange} prefix="$" />
          <Field label="Strike Price (K)" name="K" value={inputs.K} onChange={handleChange} prefix="$" />
          <Field label="Time to Expiry" name="T" value={inputs.T} onChange={handleChange} suffix="yrs" />
          <Field label="Risk-Free Rate" name="r" value={inputs.r} onChange={handleChange} suffix="%" />
          <Field label="Volatility (σ)" name="sigma" value={inputs.sigma} onChange={handleChange} suffix="%" />
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Option Type</label>
            <div style={styles.toggle}>
              {['call', 'put'].map(t => (
                <button
                  key={t}
                  onClick={() => setInputs(prev => ({ ...prev, option_type: t }))}
                  style={{
                    ...styles.toggleBtn,
                    ...(inputs.option_type === t ? styles.toggleBtnActive : {}),
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button style={styles.button} onClick={handleCalculate} disabled={loading}>
          {loading ? 'Calculating...' : 'Price Option'}
        </button>
        {error && <p style={styles.error}>{error}</p>}
      </div>

      {results && (
        <div style={styles.resultsGrid}>
          {greeks.map(({ key, label, format, color, desc }) => (
            <div key={key} style={{ ...styles.resultCard, borderTop: `3px solid ${color}` }}>
              <span style={styles.resultLabel}>{label}</span>
              <span style={{ ...styles.resultValue, color }}>{format(results[key])}</span>
              <span style={styles.resultDesc}>{desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, name, value, onChange, prefix, suffix }) {
  return (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      <div style={styles.inputWrapper}>
        {prefix && <span style={styles.inputPrefix}>{prefix}</span>}
        <input
          style={{ ...styles.input, paddingLeft: prefix ? 28 : 12, paddingRight: suffix ? 40 : 12 }}
          type="number"
          name={name}
          value={value}
          onChange={onChange}
        />
        {suffix && <span style={styles.inputSuffix}>{suffix}</span>}
      </div>
    </div>
  )
}

const styles = {
  container: { maxWidth: 860 },
  title: { fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 24, marginTop: 0 },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 28,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    marginBottom: 24,
  },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 20, marginTop: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: '#64748b' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputPrefix: { position: 'absolute', left: 10, color: '#94a3b8', fontSize: 14, pointerEvents: 'none' },
  inputSuffix: { position: 'absolute', right: 10, color: '#94a3b8', fontSize: 13, pointerEvents: 'none' },
  input: {
    width: '100%',
    padding: '9px 12px',
    fontSize: 15,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    boxSizing: 'border-box',
    outline: 'none',
  },
  toggle: {
    display: 'flex',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    padding: '9px',
    border: 'none',
    background: '#f8fafc',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  toggleBtnActive: { background: '#6366f1', color: '#fff', fontWeight: 600 },
  button: {
    padding: '10px 28px',
    fontSize: 15,
    fontWeight: 600,
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  error: { color: '#ef4444', marginTop: 10, fontSize: 14 },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
  },
  resultCard: {
    background: '#fff',
    borderRadius: 12,
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  resultLabel: { fontSize: 13, color: '#64748b', fontWeight: 600 },
  resultValue: { fontSize: 30, fontWeight: 700, marginTop: 4 },
  resultDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
}

export default BlackScholes
