import { useState } from 'react'

function NumberAdder() {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    const numA = parseFloat(a)
    const numB = parseFloat(b)
    if (isNaN(numA) || isNaN(numB)) {
      setError('Please enter valid numbers.')
      setResult(null)
      return
    }
    setError('')
    try {
      const response = await fetch('https://testproject-ud43.onrender.com/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a: numA, b: numB }),
      })
      const data = await response.json()
      setResult(data.result)
    } catch {
      setError('Could not connect to the backend.')
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Number Adder</h1>
      <div style={styles.card}>
        <div style={styles.row}>
          <input
            style={styles.input}
            type="number"
            placeholder="Number A"
            value={a}
            onChange={e => setA(e.target.value)}
          />
          <span style={styles.plus}>+</span>
          <input
            style={styles.input}
            type="number"
            placeholder="Number B"
            value={b}
            onChange={e => setB(e.target.value)}
          />
        </div>
        <button style={styles.button} onClick={handleAdd}>Calculate</button>
        {error && <p style={styles.error}>{error}</p>}
        {result !== null && (
          <div style={styles.resultBox}>
            <span style={styles.resultLabel}>Result</span>
            <span style={styles.resultValue}>{result}</span>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { maxWidth: 480 },
  title: { fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 24, marginTop: 0 },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '32px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  row: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  input: {
    flex: 1,
    padding: '10px 12px',
    fontSize: 16,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box',
  },
  plus: { fontSize: 24, color: '#94a3b8' },
  button: {
    width: '100%',
    padding: '10px',
    fontSize: 15,
    fontWeight: 600,
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  error: { color: '#ef4444', marginTop: 12, fontSize: 14 },
  resultBox: {
    marginTop: 20,
    padding: '20px',
    background: '#f0fdf4',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  resultLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 },
  resultValue: { fontSize: 40, fontWeight: 700, color: '#16a34a' },
}

export default NumberAdder
