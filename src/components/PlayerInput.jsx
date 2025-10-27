import { useEffect, useMemo, useState } from 'react'

export default function PlayerInput({ onStart }) {
  const [numPlayers, setNumPlayers] = useState(3)
  const [names, setNames] = useState(['', '', '', ''])

  useEffect(() => {
    if (numPlayers === 3) setNames((prev) => prev.slice(0, 3))
    if (numPlayers === 4 && names.length === 3) setNames((prev) => [...prev, ''])
  }, [numPlayers])

  function updateName(index, value) {
    setNames((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const canStart = useMemo(() => {
    const slice = names.slice(0, numPlayers)
    return slice.every((n) => n.trim().length > 0)
  }, [names, numPlayers])

  function startGame() {
    if (!canStart) return
    const players = names.slice(0, numPlayers).map((name, idx) => ({ id: `p${idx + 1}`, name: name.trim() }))
    onStart(players)
  }

  return (
    <div className="card player-input">
      <h2>Set up players</h2>
      <div className="row">
        <label className="inline">
          <span>Number of players</span>
          <select value={numPlayers} onChange={(e) => setNumPlayers(Number(e.target.value))}>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </label>
      </div>

      <div className="inputs-grid">
        {Array.from({ length: numPlayers }).map((_, i) => (
          <label key={i} className="input-row">
            <span>Player {i + 1}</span>
            <input type="text" style={{ fontSize: 16, minHeight: 44 }} value={names[i] || ''} placeholder={`Enter name`} onChange={(e) => updateName(i, e.target.value)} />
          </label>
        ))}
      </div>

      <div className="actions">
        <button type="button" className="primary" style={{ minHeight: 44 }} disabled={!canStart} onClick={startGame}>Start Game</button>
      </div>
    </div>
  )
}


