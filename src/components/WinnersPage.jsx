import { useMemo, useState } from 'react'
import { useGameResults } from '../hooks/useGameResults'
import { useAllGameDetails } from '../hooks/useAllGameDetails'
import { usePlayers } from '../hooks/usePlayers'
import { useOnlineGames } from '../hooks/useOnlineData'
import GameDetailPage from './GameDetailPage'
import GlobalAnalyticsPage from './GlobalAnalyticsPage'
import OnlineHistoryTab from './OnlineHistoryTab'
import SeasonChampionsTab from './SeasonChampionsTab'
import PinModal from './PinModal'
import { computePerGameAchievements, ACHIEVEMENT_DEFS } from '../utils/achievements'

// Determine season champion from combined local + online wins since seasonStart.
// Online names are mapped to local names via supabasePlayers.online_name.
function determineChampion(localResults, onlineGames, seasonStart, supabasePlayers) {
  const wins = {}

  localResults
    .filter(r => new Date(r.played_at) > seasonStart)
    .forEach(r => { wins[r.winner_name] = (wins[r.winner_name] || 0) + 1 })

  onlineGames
    .filter(g => new Date(g.playedAt) > seasonStart)
    .forEach(g => {
      const onlineName = g.winner?.name
      if (!onlineName) return
      const local = supabasePlayers.find(p => p.online_name === onlineName)
      const name = local?.name || onlineName
      wins[name] = (wins[name] || 0) + 1
    })

  if (!Object.keys(wins).length) return null
  return Object.entries(wins).reduce(
    (best, [name, count]) => count > best.count ? { name, count } : best,
    { name: null, count: -1 }
  ).name
}

export default function WinnersPage({ onBack, seasons, currentSeasonStart, addSeason }) {
  const { results, loading: resultsLoading } = useGameResults()
  const { details, loading: detailsLoading } = useAllGameDetails()
  const { players: supabasePlayers } = usePlayers()
  const { games: onlineGames } = useOnlineGames(500)

  const [subView, setSubView]           = useState('list')      // 'list' | 'detail' | 'global'
  const [historyTab, setHistoryTab]     = useState('local')     // 'local' | 'online' | 'seasons'
  const [selectedResultId, setSelectedResultId] = useState(null)
  const [showPin, setShowPin]           = useState(false)
  const [ending, setEnding]             = useState(false)
  const [endMsg, setEndMsg]             = useState(null)        // { ok, text }

  const loading = resultsLoading || detailsLoading

  // { [game_result_id]: { [playerName]: uniqueAchievementCodes[] } }
  const gameAchievementsMap = useMemo(() => {
    const map = {}
    details.forEach(detail => {
      if (!detail.players || !detail.rounds) return
      const achs = computePerGameAchievements(detail.players, detail.rounds)
      const byName = {}
      detail.players.forEach(p => {
        const codes = [...new Set(achs[p.id] || [])]
        if (codes.length) byName[p.name] = codes
      })
      if (Object.keys(byName).length) map[detail.game_result_id] = byName
    })
    return map
  }, [details])

  // Season-filtered data for Global Analytics
  const seasonStart = currentSeasonStart || new Date(0)
  const seasonDetails     = details.filter(d => new Date(d.played_at) > seasonStart)
  const seasonResults     = results.filter(r => new Date(r.played_at) > seasonStart)
  const seasonOnlineGames = onlineGames.filter(g => new Date(g.playedAt) > seasonStart)

  async function handleEndSeason() {
    setEnding(true)
    setEndMsg(null)

    const champion = determineChampion(results, onlineGames, seasonStart, supabasePlayers)
    if (!champion) {
      setEnding(false)
      setEndMsg({ ok: false, text: 'No games in the current season yet.' })
      return
    }

    // started_at = first actual game in the season (local or online), fallback to seasonStart
    const localTimes  = results.filter(r => new Date(r.played_at) > seasonStart).map(r => new Date(r.played_at))
    const onlineTimes = onlineGames.filter(g => new Date(g.playedAt) > seasonStart).map(g => new Date(g.playedAt))
    const allTimes    = [...localTimes, ...onlineTimes]
    const startedAt   = allTimes.length ? new Date(Math.min(...allTimes)).toISOString() : seasonStart.toISOString()
    const endedAt     = new Date().toISOString()

    const error = await addSeason({ championName: champion, startedAt, endedAt })
    setEnding(false)
    if (error) {
      setEndMsg({ ok: false, text: `Failed to save: ${error.message}` })
    } else {
      setEndMsg({ ok: true, text: `Season ended! Champion: ${champion} 🏆` })
      setHistoryTab('seasons')
    }
  }

  if (subView === 'detail') {
    const result = results.find(r => r.id === selectedResultId)
    const detail = details.find(d => d.game_result_id === selectedResultId)
    if (!detail) {
      return (
        <div className="card">
          <h2>Game Details</h2>
          <p style={{ color: 'var(--muted)' }}>No detailed data for this game.</p>
          <div className="actions">
            <button className="primary" onClick={() => setSubView('list')}>Back</button>
          </div>
        </div>
      )
    }
    return <GameDetailPage detail={detail} result={result} onBack={() => setSubView('list')} />
  }

  if (subView === 'global') {
    return (
      <GlobalAnalyticsPage
        details={seasonDetails}
        results={seasonResults}
        onlineGames={seasonOnlineGames}
        supabasePlayers={supabasePlayers}
        onBack={() => setSubView('list')}
      />
    )
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Game History</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {endMsg && (
            <span style={{ fontSize: 12, color: endMsg.ok ? '#059669' : '#dc2626' }}>{endMsg.text}</span>
          )}
          <button
            className="link"
            style={{ fontSize: 12, padding: '5px 10px', borderColor: '#dc2626', color: '#dc2626' }}
            onClick={() => { setEndMsg(null); setShowPin(true) }}
            disabled={ending}
          >
            End Season
          </button>
          <button
            className="primary"
            onClick={() => setSubView('global')}
            disabled={loading || seasonDetails.length === 0}
          >
            Global Analytics
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'local',   label: 'Local Games' },
          { key: 'online',  label: '🌐 Online' },
          { key: 'seasons', label: '🏆 Seasons' },
        ].map(t => (
          <button
            key={t.key}
            className={historyTab === t.key ? 'primary' : 'link'}
            style={{ fontSize: 13, padding: '6px 14px' }}
            onClick={() => setHistoryTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {historyTab === 'local' && (
        loading ? (
          <p style={{ color: 'var(--muted)' }}>Loading...</p>
        ) : results.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No games recorded yet.</p>
        ) : (
          <div className="history-list">
            {results.map(r => {
              const hasDetail = details.some(d => d.game_result_id === r.id)
              const playerAchs = gameAchievementsMap[r.id] || {}
              const sorted = [...(r.participants || [])].sort((a, b) => b.score - a.score)
              return (
                <div key={r.id} className="history-card">
                  <div className="history-card-top">
                    <span className="history-date">
                      {new Date(r.played_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {hasDetail ? (
                      <button className="link history-details-btn" onClick={() => { setSelectedResultId(r.id); setSubView('detail') }}>
                        Details →
                      </button>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>No details</span>
                    )}
                  </div>
                  <div className="history-winner">👑 {r.winner_name}</div>
                  <div className="history-participants">
                    {sorted.map((p, i) => {
                      const codes = playerAchs[p.name] || []
                      return (
                        <div key={i} className={`history-participant ${p.name === r.winner_name ? 'is-winner' : ''}`}>
                          <span className="history-participant-name">{p.name}</span>
                          {codes.length > 0 && (
                            <span className="history-participant-awards">
                              {codes.map((code, j) => {
                                const def = ACHIEVEMENT_DEFS[code]
                                return def ? (
                                  <span key={j} className="history-award-badge" title={`${def.label}: ${def.desc}`}>
                                    {def.icon}
                                  </span>
                                ) : null
                              })}
                            </span>
                          )}
                          <span className={`history-participant-score ${p.score >= 0 ? 'pos' : 'neg'}`}>
                            {p.score > 0 ? `+${p.score}` : p.score}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {historyTab === 'online' && <OnlineHistoryTab />}

      {historyTab === 'seasons' && (
        <SeasonChampionsTab
          seasons={seasons}
          allDetails={details}
          allResults={results}
          allOnlineGames={onlineGames}
          supabasePlayers={supabasePlayers}
        />
      )}

      <div className="actions">
        <button className="primary" onClick={onBack}>Back to Game</button>
      </div>

      {showPin && (
        <PinModal
          title="End Season"
          onCancel={() => setShowPin(false)}
          onSuccess={() => { setShowPin(false); handleEndSeason() }}
        />
      )}
    </div>
  )
}
