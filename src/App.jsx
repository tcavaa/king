import { useEffect, useMemo, useState } from 'react'
import PlayerInput from './components/PlayerInput.jsx'
import GameTypeSelector, { GAME_TYPES } from './components/GameTypeSelector.jsx'
import ScoreTable from './components/ScoreTable.jsx'
import GameTypeMatrix from './components/GameTypeMatrix.jsx'
import './styles/main.css'

function App() {
  const [players, setPlayers] = useState(null)
  const [activePlayerIndex, setActivePlayerIndex] = useState(0)
  const [rounds, setRounds] = useState([])
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage on first mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('king-score-state')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && Array.isArray(parsed.rounds) && (parsed.players === null || Array.isArray(parsed.players))) {
          setPlayers(parsed.players)
          setActivePlayerIndex(parsed.activePlayerIndex || 0)
          setRounds(parsed.rounds)
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

  function handleStart(playersList) {
    setPlayers(playersList)
    setActivePlayerIndex(0)
    setRounds([])
  }

  function onRoundComplete(roundRecord) {
    setRounds((prev) => [...prev, roundRecord])
    // advance leader to next player
    setActivePlayerIndex((prev) => {
      if (!players) return 0
      return (prev + 1) % players.length
    })
  }

  function onEditLastRound(patch) {
    setRounds((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const lastIdx = next.length - 1
      const last = { ...next[lastIdx] }
      if (patch.countsByPlayerId) {
        last.countsByPlayerId = { ...patch.countsByPlayerId }
        // recompute scores from counts using game type metadata
        const type = GAME_TYPES.find((t) => t.code === last.gameTypeCode)
        if (type && type.kind === 'count') {
          const scores = {}
          players.forEach((p) => {
            const units = Number(last.countsByPlayerId[p.id] || 0)
            scores[p.id] = units * (type.pointsPerUnit || 0)
          })
          last.scores = scores
        }
      }
      if (patch.singleTargetPlayerId != null) {
        last.singleTargetPlayerId = patch.singleTargetPlayerId
        const type = GAME_TYPES.find((t) => t.code === last.gameTypeCode)
        if (type && type.kind === 'single') {
          const scores = {}
          players.forEach((p) => {
            scores[p.id] = p.id === last.singleTargetPlayerId ? type.points : 0
          })
          last.scores = scores
        }
      }
      next[lastIdx] = last
      return next
    })
  }

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
              setPlayers(null)
              setActivePlayerIndex(0)
              setRounds([])
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
        <GameTypeMatrix players={players} usedTypesByPlayer={usedTypesByPlayer} activePlayerIndex={activePlayerIndex} />
          <GameTypeSelector
            players={players}
            activePlayerIndex={activePlayerIndex}
            usedTypesByPlayer={usedTypesByPlayer}
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
            <button className="primary" onClick={() => { setPlayers(null); setActivePlayerIndex(0); setRounds([]); }}>New Game</button>
          </div>
        </>
      )}
    </div>
  )
}

export default App
