import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { computeScoresForRound } from './utils/scoring'
import PlayerInput from './components/PlayerInput.jsx'
import GameTypeSelector from './components/GameTypeSelector.jsx'
import { GAME_TYPES } from './constants/gameTypes'
import ScoreTable from './components/ScoreTable.jsx'
import GameTypeMatrix from './components/GameTypeMatrix.jsx'
import './styles/main.css'

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

  // Load from localStorage on first mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('king-score-state')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && Array.isArray(parsed.rounds) && (parsed.players === null || Array.isArray(parsed.players))) {
          dispatch({ type: 'HYDRATE', payload: { players: parsed.players, activePlayerIndex: parsed.activePlayerIndex || 0, rounds: parsed.rounds } })
        }
      }
    } catch (e) {
      // ignore corrupted storage
    }
    setHydrated(true)
  }, [])

  // Persist to localStorage on change
  useEffect(() => {
    if (!hydrated) return
    const snapshot = { players, activePlayerIndex, rounds }
    try {
      localStorage.setItem('king-score-state', JSON.stringify(snapshot))
    } catch (e) {
      // storage may be full or blocked; fail silently
    }
  }, [players, activePlayerIndex, rounds, hydrated])

  // track used game types per player
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

  const gameFinished = players && rounds.length >= targetRoundsCount

  const handleStart = useCallback((playersList) => {
    dispatch({ type: 'START', players: playersList })
  }, [])

  const onRoundComplete = useCallback((roundRecord) => {
    dispatch({ type: 'END_ROUND', round: roundRecord })
    setPreselectedTypeCode(null)
  }, [])

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
        <div className="brand">
          <img className="logo" src="/12427687.png" alt="King Score logo" />
          <h1>King</h1>
        </div>
        <div className="actions">
          <button
            className="primary"
            onClick={() => {
              const ok = window.confirm('Are you sure you want to reset the current game? This will clear all progress.')
              if (!ok) return
              localStorage.removeItem('king-score-state')
              dispatch({ type: 'RESET' })
            }}
          >
            Reset
          </button>
        </div>
      </header>

      {!players && (
        <PlayerInput onStart={handleStart} />
      )}

      {players && !gameFinished && (
        <>
          <GameTypeMatrix
            players={players}
            usedTypesByPlayer={usedTypesByPlayer}
            activePlayerIndex={activePlayerIndex}
            onPreselect={(code) => setPreselectedTypeCode(code)}
          />
          <GameTypeSelector
            players={players}
            activePlayerIndex={activePlayerIndex}
            usedTypesByPlayer={usedTypesByPlayer}
            preselectedCode={preselectedTypeCode}
            onRoundComplete={onRoundComplete}
          />
          <ScoreTable players={players} rounds={rounds} onEditLastRound={onEditLastRound} />
          
          <div className="meta">
            <div>Round {rounds.length + 1} / {targetRoundsCount}</div>
            <div>Leader: {players[activePlayerIndex].name}</div>
          </div>
        </>
      )}

      {players && gameFinished && (
        <>
          <ScoreTable players={players} rounds={rounds} />
          <div className="actions center">
            <button className="primary" onClick={() => { dispatch({ type: 'RESET' }) }}>New Game</button>
          </div>
        </>
      )}
    </div>
  )
}

export default App
