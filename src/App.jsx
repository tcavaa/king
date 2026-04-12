import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { computeScoresForRound } from './utils/scoring'
import PlayerInput from './components/PlayerInput.jsx'
import GameTypeSelector from './components/GameTypeSelector.jsx'
import { GAME_TYPES } from './constants/gameTypes'
import ScoreTable from './components/ScoreTable.jsx'
import GameTypeMatrix from './components/GameTypeMatrix.jsx'
import PlayersPage from './components/PlayersPage.jsx'
import WinnersPage from './components/WinnersPage.jsx'
import ScoreChart from './components/ScoreChart.jsx'
import GameAnalytics from './components/GameAnalytics.jsx'
import WinProbability from './components/WinProbability.jsx'
import { supabase } from './lib/supabase.js'
import confetti from 'canvas-confetti'
import { playRoundEnd, playBigPenalty, playGameWin, playRematch } from './utils/sounds.js'
import './styles/main.css'

export const PLAYER_COLORS = ['#2563eb', '#059669', '#dc2626', '#d97706']

function App() {
  const [state, dispatch] = useReducer(
    (s, action) => {
      switch (action.type) {
        case 'HYDRATE':
          return { ...s, ...action.payload }
        case 'START':
          return { players: action.players, activePlayerIndex: 0, rounds: [] }
        case 'END_ROUND': {
          const rounds = [...s.rounds, action.round]
          const nextLeader = s.players ? (s.activePlayerIndex + 1) % s.players.length : 0
          return { ...s, rounds, activePlayerIndex: nextLeader }
        }
        case 'EDIT_LAST': {
          if (!s.rounds.length) return s
          const next = [...s.rounds]
          next[next.length - 1] = action.round
          return { ...s, rounds: next }
        }
        case 'RESET':
          return { players: null, activePlayerIndex: 0, rounds: [] }
        default:
          return s
      }
    },
    { players: null, activePlayerIndex: 0, rounds: [] }
  )
  const { players, activePlayerIndex, rounds } = state
  const [hydrated, setHydrated] = useState(false)
  const [preselectedTypeCode, setPreselectedTypeCode] = useState(null)
  const [view, setView] = useState('home')
  const [saving, setSaving] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('king-sound') !== 'off')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('king-theme') === 'dark')
  const lastPlayersRef = useRef(null)

  // Apply dark mode class to body
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode)
    localStorage.setItem('king-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Persist sound preference
  useEffect(() => {
    localStorage.setItem('king-sound', soundEnabled ? 'on' : 'off')
  }, [soundEnabled])

  // Load from localStorage on first mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('king-score-state')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && Array.isArray(parsed.rounds) && (parsed.players === null || Array.isArray(parsed.players))) {
          const hasLegacyIds = Array.isArray(parsed.players) && parsed.players.some((p) => /^p\d+$/.test(p.id))
          if (!hasLegacyIds) {
            dispatch({ type: 'HYDRATE', payload: { players: parsed.players, activePlayerIndex: parsed.activePlayerIndex || 0, rounds: parsed.rounds } })
          } else {
            localStorage.removeItem('king-score-state')
          }
        }
      }
    } catch (e) {}
    setHydrated(true)
  }, [])

  // Persist to localStorage on change
  useEffect(() => {
    if (!hydrated) return
    const snapshot = { players, activePlayerIndex, rounds }
    try {
      localStorage.setItem('king-score-state', JSON.stringify(snapshot))
    } catch (e) {}
  }, [players, activePlayerIndex, rounds, hydrated])

  const usedTypesByPlayer = useMemo(() => {
    const map = {}
    if (!players) return map
    players.forEach((p) => (map[p.id] = new Set()))
    rounds.forEach((r) => {
      const leaderId = r.leaderPlayerId
      if (!map[leaderId]) map[leaderId] = new Set()
      map[leaderId].add(r.gameTypeCode)
    })
    return map
  }, [players, rounds])

  const targetRoundsCount = useMemo(() => {
    if (!players) return 0
    return players.length * GAME_TYPES.length
  }, [players])

  const gameFinished = !!(players && rounds.length >= targetRoundsCount && targetRoundsCount > 0)

  const finishedParticipants = useMemo(() => {
    if (!gameFinished || !players) return []
    const totals = {}
    players.forEach(p => { totals[p.id] = 0 })
    rounds.forEach(r => {
      if (r.scores) players.forEach(p => { totals[p.id] += r.scores[p.id] || 0 })
    })
    return players.map(p => ({ name: p.name, score: totals[p.id] }))
  }, [gameFinished, players, rounds])

  useEffect(() => {
    if (!gameFinished) return
    confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 } })
    if (soundEnabled) playGameWin()
  }, [gameFinished])

  const saveGameToDB = useCallback(async (playersList, roundsList) => {
    const totals = {}
    playersList.forEach((p) => (totals[p.id] = 0))
    roundsList.forEach((r) => {
      if (r.scores) playersList.forEach((p) => {
        totals[p.id] = (totals[p.id] || 0) + (r.scores[p.id] || 0)
      })
    })
    const winner = playersList.reduce(
      (best, p) => (!best || totals[p.id] > totals[best.id] ? p : best),
      null
    )
    const participants = playersList.map((p) => ({ name: p.name, score: totals[p.id] }))

    const { data: resultData } = await supabase
      .from('game_results')
      .insert({ winner_name: winner.name, participants })
      .select('id')
      .single()

    if (resultData?.id) {
      await supabase.from('game_details').insert({
        game_result_id: resultData.id,
        players: playersList,
        rounds: roundsList,
      })
    }
  }, [])

  const handleComplete = useCallback(async () => {
    if (!players) return
    setSaving(true)
    lastPlayersRef.current = players
    await saveGameToDB(players, rounds)
    setSaving(false)
    localStorage.removeItem('king-score-state')
    dispatch({ type: 'RESET' })
  }, [players, rounds, saveGameToDB])

  const handleRematch = useCallback(async () => {
    if (!players) return
    setSaving(true)
    const rematchers = [...players]
    await saveGameToDB(players, rounds)
    setSaving(false)
    localStorage.removeItem('king-score-state')
    if (soundEnabled) playRematch()
    dispatch({ type: 'START', players: rematchers })
  }, [players, rounds, saveGameToDB, soundEnabled])

  const handleStart = useCallback((playersList) => {
    dispatch({ type: 'START', players: playersList })
  }, [])

  const onRoundComplete = useCallback((roundRecord) => {
    dispatch({ type: 'END_ROUND', round: roundRecord })
    setPreselectedTypeCode(null)
    if (soundEnabled) {
      const minScore = Math.min(...Object.values(roundRecord.scores || {}))
      if (minScore <= -40) {
        playBigPenalty()
      } else {
        playRoundEnd()
      }
    }
  }, [soundEnabled])

  const onEditLastRound = useCallback((patch) => {
    if (!players || rounds.length === 0) return
    const lastIdx = rounds.length - 1
    const current = rounds[lastIdx]
    let nextRound = { ...current }
    if (patch.countsByPlayerId) nextRound.countsByPlayerId = { ...patch.countsByPlayerId }
    if (patch.singleTargetPlayerId != null) nextRound.singleTargetPlayerId = patch.singleTargetPlayerId
    const type = GAME_TYPES.find((t) => t.code === nextRound.gameTypeCode)
    nextRound.scores = computeScoresForRound(type, players, nextRound.countsByPlayerId, nextRound.singleTargetPlayerId)
    dispatch({ type: 'EDIT_LAST', round: nextRound })
  }, [players, rounds])

  return (
    <div className="app">
      <header className="header">
        <div className="brand" onClick={() => setView('home')} style={{ cursor: 'pointer' }}>
          <img className="logo" src="/12427687.png" alt="King Score logo" />
          <h1>King</h1>
        </div>
        <div className="nav-actions">
          <button className="link" onClick={() => setView('players')}>Players</button>
          <button className="link" onClick={() => setView('winners')}>History</button>
          <button
            className="link"
            onClick={() => setSoundEnabled(v => !v)}
            title={soundEnabled ? 'Sound on' : 'Sound off'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <button
            className="link"
            onClick={() => setDarkMode(v => !v)}
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button
            className="primary"
            onClick={() => {
              const ok = window.confirm('Are you sure you want to reset the current game? This will clear all progress.')
              if (!ok) return
              localStorage.removeItem('king-score-state')
              dispatch({ type: 'RESET' })
              setView('home')
            }}
          >
            Reset
          </button>
        </div>
      </header>

      {view === 'players' && (
        <PlayersPage onBack={() => setView('home')} />
      )}

      {view === 'winners' && (
        <WinnersPage onBack={() => setView('home')} />
      )}

      {view === 'home' && !players && (
        <PlayerInput onStart={handleStart} />
      )}

      {view === 'home' && players && !gameFinished && (
        <>
          <GameTypeMatrix
            players={players}
            usedTypesByPlayer={usedTypesByPlayer}
            activePlayerIndex={activePlayerIndex}
            onPreselect={(code) => setPreselectedTypeCode(code)}
            playerColors={PLAYER_COLORS}
          />
          <GameTypeSelector
            players={players}
            activePlayerIndex={activePlayerIndex}
            usedTypesByPlayer={usedTypesByPlayer}
            preselectedCode={preselectedTypeCode}
            onRoundComplete={onRoundComplete}
          />
          <ScoreTable
            players={players}
            rounds={rounds}
            onEditLastRound={onEditLastRound}
            playerColors={PLAYER_COLORS}
          />
          <WinProbability players={players} rounds={rounds} playerColors={PLAYER_COLORS} />
          <div className="meta">
            <div>Round {rounds.length + 1} / {targetRoundsCount}</div>
            <div>Leader: {players[activePlayerIndex].name}</div>
          </div>
        </>
      )}

      {view === 'home' && players && gameFinished && (
        <>
          <ScoreTable players={players} rounds={rounds} gameFinished playerColors={PLAYER_COLORS} />
          <div className="actions center">
            <button className="primary" disabled={saving} onClick={handleComplete}>
              {saving ? 'Saving...' : 'Complete'}
            </button>
            <button className="primary" disabled={saving} onClick={handleRematch} style={{ background: '#059669', borderColor: '#059669' }}>
              {saving ? '...' : '🔁 Rematch'}
            </button>
            <button className="link" disabled={saving} onClick={handleComplete}>
              New Game
            </button>
          </div>
          <ScoreChart players={players} rounds={rounds} />
          <GameAnalytics players={players} rounds={rounds} participants={finishedParticipants} />
        </>
      )}
    </div>
  )
}

export default App
