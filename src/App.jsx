import { useMemo, useState } from 'react'
import PlayerInput from './components/PlayerInput.jsx'
import GameTypeSelector, { GAME_TYPES } from './components/GameTypeSelector.jsx'
import ScoreTable from './components/ScoreTable.jsx'
import GameTypeMatrix from './components/GameTypeMatrix.jsx'
import './styles/main.css'

function App() {
  const [players, setPlayers] = useState(null)
  const [activePlayerIndex, setActivePlayerIndex] = useState(0)
  const [rounds, setRounds] = useState([])

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
            <button className="primary" onClick={() => setPlayers(null)}>New Game</button>
          </div>
        </>
      )}
    </div>
  )
}

export default App
