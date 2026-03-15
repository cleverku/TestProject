import { useState, useRef, useEffect } from 'react'

const defaultInputs = {
  S0: '100',
  mu: '8',
  sigma: '20',
  T: '1',
  steps: '252',
  n_paths: '1000',
}

function MonteCarlo() {
  const [inputs, setInputs] = useState(defaultInputs)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const canvasRef = useRef(null)

  const handleChange = e => setInputs(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSimulate = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('http://localhost:5000/montecarlo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      })
      const data = await response.json()
      setResult(data)
    } catch {
      setError('Could not connect to the backend.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!result || !canvasRef.current) return
    drawChart(canvasRef.current, result)
  }, [result])

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Monte Carlo Stock Simulation</h1>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Simulation Parameters</h2>
        <div style={styles.grid}>
          <Field label="Initial Stock Price" name="S0" value={inputs.S0} onChange={handleChange} prefix="$" />
          <Field label="Annual Drift (μ)" name="mu" value={inputs.mu} onChange={handleChange} suffix="%" hint="Expected annual return" />
          <Field label="Annual Volatility (σ)" name="sigma" value={inputs.sigma} onChange={handleChange} suffix="%" hint="Historical or implied vol" />
          <Field label="Time Horizon" name="T" value={inputs.T} onChange={handleChange} suffix="yrs" hint="Simulation length in years" />
          <Field label="Time Steps" name="steps" value={inputs.steps} onChange={handleChange} hint="252 = trading days/year" />
          <Field label="Number of Paths" name="n_paths" value={inputs.n_paths} onChange={handleChange} hint="Simulated price paths (max 5000)" />
        </div>
        <button style={styles.button} onClick={handleSimulate} disabled={loading}>
          {loading ? 'Simulating...' : 'Run Simulation'}
        </button>
        {error && <p style={styles.error}>{error}</p>}
      </div>

      {result && (
        <>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Price Paths</h2>
            <canvas
              ref={canvasRef}
              width={820}
              height={400}
              style={{ width: '100%', borderRadius: 8, display: 'block' }}
            />
            <div style={styles.legend}>
              <LegendItem color="rgba(99,102,241,0.35)" label={`${Math.min(50, parseInt(inputs.n_paths))} displayed paths`} />
              <LegendItem color="#6366f1" label="Mean path" bold />
              <LegendItem color="rgba(99,102,241,0.15)" label="5th–95th percentile band" band />
            </div>
          </div>

          <div style={styles.statsGrid}>
            {[
              { label: 'Mean Final Price', value: `$${result.stats.mean_final}`, color: '#6366f1' },
              { label: 'Std Deviation', value: `$${result.stats.std_final}`, color: '#64748b' },
              { label: '5th Percentile', value: `$${result.stats.perc_5}`, color: '#ef4444' },
              { label: '95th Percentile', value: `$${result.stats.perc_95}`, color: '#10b981' },
              { label: 'Probability of Gain', value: `${result.stats.prob_gain}%`, color: '#f59e0b' },
            ].map(({ label, value, color }) => (
              <div key={label} style={styles.statCard}>
                <span style={styles.statLabel}>{label}</span>
                <span style={{ ...styles.statValue, color }}>{value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function drawChart(canvas, data) {
  const ctx = canvas.getContext('2d')
  const W = canvas.width
  const H = canvas.height
  const pad = { top: 20, right: 24, bottom: 44, left: 64 }
  const chartW = W - pad.left - pad.right
  const chartH = H - pad.top - pad.bottom
  const n = data.time_points.length

  const allVals = [...data.perc_5, ...data.perc_95]
  const minVal = Math.min(...allVals) * 0.97
  const maxVal = Math.max(...allVals) * 1.03

  const xScale = i => pad.left + (i / (n - 1)) * chartW
  const yScale = v => pad.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH

  ctx.clearRect(0, 0, W, H)

  // Background
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, W, H)

  // Grid lines + Y labels
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  const gridCount = 6
  for (let i = 0; i <= gridCount; i++) {
    const v = minVal + (i / gridCount) * (maxVal - minVal)
    const y = yScale(v)
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(W - pad.right, y)
    ctx.stroke()
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px system-ui'
    ctx.textAlign = 'right'
    ctx.fillText(`$${v.toFixed(0)}`, pad.left - 8, y + 4)
  }

  // X axis labels
  ctx.fillStyle = '#94a3b8'
  ctx.textAlign = 'center'
  for (let i = 0; i <= 4; i++) {
    const idx = Math.round((i / 4) * (n - 1))
    const x = xScale(idx)
    const label = data.time_points[idx]
    ctx.fillText(
      label < 1 ? `${(label * 12).toFixed(0)}m` : `${parseFloat(label).toFixed(1)}y`,
      x,
      H - pad.bottom + 18
    )
  }

  // Axis line
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad.left, pad.top)
  ctx.lineTo(pad.left, pad.top + chartH)
  ctx.lineTo(pad.left + chartW, pad.top + chartH)
  ctx.stroke()

  // Percentile band
  ctx.beginPath()
  data.perc_95.forEach((v, i) => {
    i === 0 ? ctx.moveTo(xScale(i), yScale(v)) : ctx.lineTo(xScale(i), yScale(v))
  })
  for (let i = data.perc_5.length - 1; i >= 0; i--) {
    ctx.lineTo(xScale(i), yScale(data.perc_5[i]))
  }
  ctx.closePath()
  ctx.fillStyle = 'rgba(99,102,241,0.08)'
  ctx.fill()

  // Individual paths
  ctx.lineWidth = 0.8
  data.paths.forEach(path => {
    ctx.beginPath()
    path.forEach((v, i) => {
      i === 0 ? ctx.moveTo(xScale(i), yScale(v)) : ctx.lineTo(xScale(i), yScale(v))
    })
    ctx.strokeStyle = 'rgba(99,102,241,0.22)'
    ctx.stroke()
  })

  // Mean path
  ctx.beginPath()
  data.mean_path.forEach((v, i) => {
    i === 0 ? ctx.moveTo(xScale(i), yScale(v)) : ctx.lineTo(xScale(i), yScale(v))
  })
  ctx.strokeStyle = '#6366f1'
  ctx.lineWidth = 2.5
  ctx.stroke()

  // Starting price dot
  ctx.beginPath()
  ctx.arc(xScale(0), yScale(data.mean_path[0]), 4, 0, Math.PI * 2)
  ctx.fillStyle = '#6366f1'
  ctx.fill()
}

function Field({ label, name, value, onChange, prefix, suffix, hint }) {
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
      {hint && <span style={styles.hint}>{hint}</span>}
    </div>
  )
}

function LegendItem({ color, label, bold, band }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {band ? (
        <div style={{ width: 24, height: 12, background: color, borderRadius: 2 }} />
      ) : (
        <div style={{ width: 24, height: bold ? 3 : 1.5, background: color, borderRadius: 2 }} />
      )}
      <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
    </div>
  )
}

const styles = {
  container: { maxWidth: 900 },
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
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
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
  hint: { fontSize: 11, color: '#94a3b8' },
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
  legend: { display: 'flex', gap: 28, marginTop: 16, justifyContent: 'center' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    background: '#fff',
    borderRadius: 12,
    padding: '18px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: 500 },
  statValue: { fontSize: 20, fontWeight: 700 },
}

export default MonteCarlo
