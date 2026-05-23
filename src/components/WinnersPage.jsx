import { useState } from 'react'
import { useGameResults } from '../hooks/useGameResults'
import { useAllGameDetails } from '../hooks/useAllGameDetails'
import { usePlayers } from '../hooks/usePlayers'
import GameDetailPage from './GameDetailPage'
import GlobalAnalyticsPage from './GlobalAnalyticsPage'
import OnlineHistoryTab from './OnlineHistoryTab'

export default function WinnersPage({ onBack }) {
  const { results, loading: resultsLoading } = useGameResults()
  const { details, loading: detailsLoading } = useAllGameDetails()
  const { players: supabasePlayers } = usePlayers()
  const [subView, setSubView] = useState('list') // 'list' | 'detail' | 'global'
  const [selectedResultId, setSelectedResultId] = useState(null)
  const [historyTab, setHistoryTab] = useState('local') // 'local' | 'online'

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
    return <GlobalAnalyticsPage details={details} results={results} supabasePlayers={supabasePlayers} onBack={() => setSubView('list')} />
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

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={historyTab === 'local' ? 'primary' : 'link'}
          style={{ fontSize: 13, padding: '6px 14px' }}
          onClick={() => setHistoryTab('local')}
        >
          Local Games
        </button>
        <button
          className={historyTab === 'online' ? 'primary' : 'link'}
          style={{ fontSize: 13, padding: '6px 14px' }}
          onClick={() => setHistoryTab('online')}
        >
          🌐 Online Games
        </button>
      </div>

      {historyTab === 'local' ? (
        loading ? (
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
                          style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: 0 }}
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
        )
      ) : (
        <OnlineHistoryTab />
      )}

      <div className="actions">
        <button className="primary" onClick={onBack}>Back to Game</button>
      </div>
    </div>
  )
}
