import { useState } from 'react'
import { useGameResults } from '../hooks/useGameResults'
import { useAllGameDetails } from '../hooks/useAllGameDetails'
import GameDetailPage from './GameDetailPage'
import GlobalAnalyticsPage from './GlobalAnalyticsPage'

export default function WinnersPage({ onBack }) {
  const { results, loading: resultsLoading } = useGameResults()
  const { details, loading: detailsLoading } = useAllGameDetails()
  const [subView, setSubView] = useState('list') // 'list' | 'detail' | 'global'
  const [selectedResultId, setSelectedResultId] = useState(null)

  const loading = resultsLoading || detailsLoading

  if (subView === 'detail') {
    const result = results.find(r => r.id === selectedResultId)
    const detail = details.find(d => d.game_result_id === selectedResultId)
    if (!detail) {
      return (
        <div className="card">
          <h2>Game Details</h2>
          <p style={{ color: 'var(--muted)' }}>
            No detailed data for this game (played before analytics were added).
          </p>
          <div className="actions">
            <button className="primary" onClick={() => setSubView('list')}>Back</button>
          </div>
        </div>
      )
    }
    return <GameDetailPage detail={detail} result={result} onBack={() => setSubView('list')} />
  }

  if (subView === 'global') {
    return <GlobalAnalyticsPage details={details} results={results} onBack={() => setSubView('list')} />
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Game History</h2>
        <button
          className="primary"
          onClick={() => setSubView('global')}
          disabled={loading || details.length === 0}
        >
          Global Analytics
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading...</p>
      ) : results.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No games recorded yet.</p>
      ) : (
        <div className="table">
          <div className="thead">
            <div className="tr history-tr">
              <div className="th">Date</div>
              <div className="th">Winner</div>
              <div className="th">Players &amp; Scores</div>
              <div className="th"></div>
            </div>
          </div>
          <div className="tbody">
            {results.map(r => {
              const hasDetail = details.some(d => d.game_result_id === r.id)
              return (
                <div key={r.id} className="tr history-tr">
                  <div className="td">{new Date(r.played_at).toLocaleDateString()}</div>
                  <div className="td bold">{r.winner_name}</div>
                  <div className="td">
                    {r.participants.map(p => `${p.name} (${p.score})`).join(', ')}
                  </div>
                  <div className="td center">
                    {hasDetail ? (
                      <button
                        onClick={() => { setSelectedResultId(r.id); setSubView('detail') }}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: 0, textDecoration: 'none' }}
                      >
                        Details
                      </button>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="actions">
        <button className="primary" onClick={onBack}>Back to Game</button>
      </div>
    </div>
  )
}
