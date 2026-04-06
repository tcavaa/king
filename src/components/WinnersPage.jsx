import { useGameResults } from '../hooks/useGameResults'

export default function WinnersPage({ onBack }) {
  const { results, loading } = useGameResults()

  return (
    <div className="card">
      <h2>Game History</h2>
      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading...</p>
      ) : results.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No games recorded yet.</p>
      ) : (
        <div className="table">
          <div className="thead">
            <div className="tr winners-tr">
              <div className="th">Date</div>
              <div className="th">Winner</div>
              <div className="th">Players &amp; Scores</div>
            </div>
          </div>
          <div className="tbody">
            {results.map((r) => (
              <div key={r.id} className="tr winners-tr">
                <div className="td">{new Date(r.played_at).toLocaleDateString()}</div>
                <div className="td bold">{r.winner_name}</div>
                <div className="td">
                  {r.participants.map((p) => `${p.name} (${p.score})`).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="actions">
        <button className="primary" onClick={onBack}>Back to Game</button>
      </div>
    </div>
  )
}
