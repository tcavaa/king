import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

const COLORS = ['#0f1e2e', '#059669', '#dc2626', '#d97706']

export default function ScoreChart({ players, rounds }) {
  const data = useMemo(() => {
    const cumulative = {}
    players.forEach((p) => { cumulative[p.id] = 0 })
    return rounds.map((r, idx) => {
      players.forEach((p) => {
        cumulative[p.id] += (r.scores && r.scores[p.id]) || 0
      })
      const point = { round: idx + 1 }
      players.forEach((p) => { point[p.name] = cumulative[p.id] })
      return point
    })
  }, [players, rounds])

  return (
    <div className="card">
      <h2>Score Progression</h2>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2d9c9" />
          <XAxis
            dataKey="round"
            label={{ value: 'Round', position: 'insideBottom', offset: -12, fill: '#6b7280', fontSize: 12 }}
            tick={{ fontSize: 11, fill: '#6b7280' }}
          />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} width={40} />
          <ReferenceLine y={0} stroke="#1e293b" strokeDasharray="4 2" />
          <Tooltip
            contentStyle={{ background: '#fbf5e6', border: '2px solid #1e293b', borderRadius: 8, fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
          {players.map((p, i) => (
            <Line
              key={p.id}
              type="monotone"
              dataKey={p.name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
