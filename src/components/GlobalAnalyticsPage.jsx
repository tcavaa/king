import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { computeGlobalStats, getGlobalAwards, TYPE_ROWS } from '../utils/analytics'

const COLORS = ['#0f1e2e', '#059669', '#dc2626', '#d97706']

export default function GlobalAnalyticsPage({ details, results, onBack }) {
  const playerMap = useMemo(() => computeGlobalStats(details, results), [details, results])
  const awards = useMemo(() => getGlobalAwards(playerMap), [playerMap])
  const players = useMemo(
    () => Object.entries(playerMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed),
    [playerMap]
  )

  // Bar chart: total units collected per card type per player
  const unitBarData = useMemo(() => {
    return TYPE_ROWS.map(tr => {
      const point = { type: tr.icon + ' ' + tr.label }
      players.forEach(p => { point[p.name] = p[tr.code] || 0 })
      return point
    })
  }, [players])

  // Bar chart: avg score per player
  const avgScoreData = useMemo(() => {
    return players.map(p => ({
      name: p.name,
      avg: p.gamesPlayed > 0 ? +(p.totalScore / p.gamesPlayed).toFixed(1) : 0,
    }))
  }, [players])

  if (players.length === 0) {
    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Global Analytics</h2>
          <button className="link" onClick={onBack}>← Back</button>
        </div>
        <p style={{ color: 'var(--muted)', marginTop: 12 }}>
          No detailed game data yet. Play a game to start seeing analytics.
        </p>
        <div className="actions">
          <button className="primary" onClick={onBack}>Back to History</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Global Analytics</h2>
          <button className="link" onClick={onBack}>← Back</button>
        </div>
        <p style={{ color: 'var(--muted)', margin: '8px 0 0', fontSize: 13 }}>
          {details.length} recorded game{details.length !== 1 ? 's' : ''} · {players.length} player{players.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Player Summary Table */}
      <div className="card">
        <h2>Player Summary</h2>
        <div className="table">
          <div className="thead">
            <div className="tr summary-tr">
              <div className="th">Player</div>
              <div className="th center">Games</div>
              <div className="th center">Wins</div>
              <div className="th center">Win%</div>
              <div className="th center">Avg Score</div>
              <div className="th center">♛ Q</div>
              <div className="th center">🃏 J</div>
              <div className="th center">❤️ H</div>
              <div className="th center">♥ K</div>
              <div className="th center">🎴 L2</div>
              <div className="th center">💀 T</div>
              <div className="th center">✨ P</div>
            </div>
          </div>
          <div className="tbody">
            {players.map(p => {
              const winPct = p.gamesPlayed > 0 ? ((p.wins / p.gamesPlayed) * 100).toFixed(0) : 0
              const avgScore = p.gamesPlayed > 0 ? (p.totalScore / p.gamesPlayed).toFixed(1) : '0'
              const plusTotal = p.P1 + p.P2 + p.P3
              return (
                <div key={p.id} className="tr summary-tr">
                  <div className="td bold">{p.name}</div>
                  <div className="td center">{p.gamesPlayed}</div>
                  <div className="td center">{p.wins}</div>
                  <div className="td center">{winPct}%</div>
                  <div className={`td center ${+avgScore > 0 ? 'pos' : +avgScore < 0 ? 'neg' : ''}`}>{avgScore}</div>
                  <div className="td center">{p.Q}</div>
                  <div className="td center">{p.J}</div>
                  <div className="td center">{p.H}</div>
                  <div className="td center">{p.K}</div>
                  <div className="td center">{p.L2}</div>
                  <div className="td center">{p.T}</div>
                  <div className="td center">{plusTotal}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Hall of Fame */}
      <div className="card">
        <h2>Hall of Fame</h2>
        <div className="awards-grid">
          {awards.map((a, i) => (
            <div key={i} className="award-card">
              <div className="award-icon">{a.icon}</div>
              <div className="award-title">{a.title}</div>
              <div className="award-player">{a.player}</div>
              <div className="award-value">{a.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Total Cards Collected chart */}
      <div className="card">
        <h2>Total Cards Collected (All Games)</h2>
        <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 13 }}>
          Units collected per card type across every game.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={unitBarData} margin={{ top: 8, right: 16, left: 0, bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2d9c9" />
            <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#6b7280' }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} width={40} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#fbf5e6', border: '2px solid #1e293b', borderRadius: 8, fontSize: 13 }} />
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 16 }} />
            {players.map((p, i) => (
              <Bar key={p.id} dataKey={p.name} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Average Score per Game chart */}
      <div className="card">
        <h2>Average Score per Game</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={avgScoreData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2d9c9" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} width={44} />
            <ReferenceLine y={0} stroke="#1e293b" strokeDasharray="4 2" />
            <Tooltip
              contentStyle={{ background: '#fbf5e6', border: '2px solid #1e293b', borderRadius: 8, fontSize: 13 }}
              formatter={v => [v, 'Avg Score']}
            />
            <Bar dataKey="avg" name="Avg Score" radius={[3, 3, 0, 0]}>
              {avgScoreData.map((entry, i) => (
                <Cell key={i} fill={entry.avg >= 0 ? '#059669' : '#dc2626'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category Leaderboards */}
      <div className="card">
        <h2>Category Leaderboards</h2>
        <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 13 }}>
          All-time totals per card type, ranked.
        </p>
        <div className="leaderboard-grid">
          {TYPE_ROWS.map(tr => {
            const sorted = [...players].sort((a, b) => (b[tr.code] || 0) - (a[tr.code] || 0))
            return (
              <div key={tr.code} className="leaderboard-card">
                <div className="leaderboard-title">{tr.icon} {tr.label}</div>
                {sorted.map((p, i) => (
                  <div key={p.id} className={`leaderboard-row ${i === 0 ? 'leader' : ''}`}>
                    <span className="lb-rank">{i + 1}.</span>
                    <span className="lb-name">{p.name}</span>
                    <span className="lb-val">{p[tr.code] || 0}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-player breakdown cards */}
      <div className="card">
        <h2>Per-Player Breakdown</h2>
        <div className="player-breakdown-grid">
          {players.map((p, pi) => {
            const plusTotal = p.P1 + p.P2 + p.P3
            const winPct = p.gamesPlayed > 0 ? ((p.wins / p.gamesPlayed) * 100).toFixed(0) : 0
            const avgScore = p.gamesPlayed > 0 ? (p.totalScore / p.gamesPlayed).toFixed(1) : '0'
            return (
              <div key={p.id} className="player-breakdown-card" style={{ borderColor: COLORS[pi % COLORS.length] }}>
                <div className="pb-header" style={{ background: COLORS[pi % COLORS.length] }}>
                  <span className="pb-name">{p.name}</span>
                  <span className="pb-record">{p.wins}W / {p.gamesPlayed - p.wins}L</span>
                </div>
                <div className="pb-body">
                  <div className="pb-stat"><span>Win Rate</span><strong>{winPct}%</strong></div>
                  <div className="pb-stat"><span>Avg Score</span><strong className={+avgScore >= 0 ? 'pos' : 'neg'}>{avgScore}</strong></div>
                  <div className="pb-stat"><span>♛ Queens</span><strong>{p.Q}</strong></div>
                  <div className="pb-stat"><span>🃏 Jacks</span><strong>{p.J}</strong></div>
                  <div className="pb-stat"><span>❤️ Hearts</span><strong>{p.H}</strong></div>
                  <div className="pb-stat"><span>♥ Kings</span><strong>{p.K}</strong></div>
                  <div className="pb-stat"><span>🎴 Last 2</span><strong>{p.L2}</strong></div>
                  <div className="pb-stat"><span>💀 Bad Tricks</span><strong>{p.T}</strong></div>
                  <div className="pb-stat"><span>✨ Plus Tricks</span><strong className="pos">{plusTotal}</strong></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="actions">
        <button className="primary" onClick={onBack}>Back to History</button>
      </div>
    </div>
  )
}
