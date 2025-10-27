import { useMemo, useState } from 'react'
import { GAME_TYPES } from './GameTypeSelector.jsx'

export default function ScoreTable({ players, rounds, onEditLastRound }) {
  const totals = players.reduce((acc, p) => {
    acc[p.id] = 0
    return acc
  }, {})

  rounds.forEach((r) => {
    Object.entries(r.scores).forEach(([pid, score]) => {
      totals[pid] += score
    })
  })

  const winner = players
    .map((p) => ({ player: p, total: totals[p.id] }))
    .sort((a, b) => b.total - a.total)[0]

  const [isEditing, setIsEditing] = useState(false)
  const lastIndex = rounds.length - 1
  const lastRound = rounds[lastIndex]

  const [draftCounts, setDraftCounts] = useState(() => {
    if (!lastRound || !lastRound.countsByPlayerId) return {}
    return { ...lastRound.countsByPlayerId }
  })

  const [draftSingle, setDraftSingle] = useState(() => lastRound?.singleTargetPlayerId || null)

  const selectedTypeCode = lastRound?.gameTypeCode
  const selectedType = GAME_TYPES.find((t) => t.code === selectedTypeCode)

  function startEdit() {
    if (!lastRound) return
    setDraftCounts({ ...(lastRound.countsByPlayerId || {}) })
    setDraftSingle(lastRound.singleTargetPlayerId || null)
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
  }

  function changeCount(pid, val) {
    setDraftCounts((p) => ({ ...p, [pid]: Math.max(0, Number(val || 0)) }))
  }

  function saveEdit() {
    if (!onEditLastRound || !lastRound) return
    onEditLastRound({
      countsByPlayerId: lastRound.countsByPlayerId ? { ...draftCounts } : null,
      singleTargetPlayerId: lastRound.singleTargetPlayerId != null ? draftSingle : null,
    })
    setIsEditing(false)
  }

  const draftSum = useMemo(() => {
    if (!isEditing || !lastRound || !lastRound.countsByPlayerId) return 0
    return Object.values(draftCounts).reduce((a, b) => a + (Number(b) || 0), 0)
  }, [isEditing, lastRound, draftCounts])

  const validationMessage = useMemo(() => {
    if (!isEditing || !selectedType) return ''
    if (selectedType.kind === 'count') {
      const total = selectedType.totalUnits
      if (draftSum !== total) {
        return `Distribute exactly ${total} ${selectedType.unitLabel || 'units'}`
      }
    }
    if (selectedType.kind === 'single') {
      if (!draftSingle) return 'Select the player who took it'
    }
    return ''
  }, [isEditing, selectedType, draftSum, draftSingle])

  return (
    <div className="card score-table" style={{ '--player-count': players.length }}>
      <h2>Scores</h2>
      <div className="table">
        <div className="thead">
          <div className="tr">
            <div className="th">Round / Type</div>
            {players.map((p) => (
              <div key={p.id} className="th center">{p.name}</div>
            ))}
          </div>
        </div>
        <div className="tbody">
          {rounds.map((r, idx) => {
            const isLast = idx === lastIndex
            return (
              <div key={idx} className="tr">
                <div className="td player-name">
                  {idx + 1} — {r.gameTypeCode}
                  {isLast && (
                    <span className="edit-actions">
                      {!isEditing && (
                        <button className="link" onClick={startEdit} title="Edit last round">✎ Edit</button>
                      )}
                      {isEditing && (
                        <>
                          <button className="link" onClick={saveEdit}>Save</button>
                          <button className="link" onClick={cancelEdit}>Cancel</button>
                        </>
                      )}
                    </span>
                  )}
                </div>
                {players.map((p) => (
                  <div key={p.id} className="td center">
                    {isEditing && isLast && r.countsByPlayerId ? (
                      <input type="number" min="0" value={draftCounts[p.id] ?? ''} onChange={(e) => changeCount(p.id, e.target.value)} />
                    ) : isEditing && isLast && r.singleTargetPlayerId != null ? (
                      <input type="radio" name="editSingle" checked={draftSingle === p.id} onChange={() => setDraftSingle(p.id)} />
                    ) : (
                      r.scores[p.id] ?? ''
                    )}
                  </div>
                ))}
                {isEditing && isLast && selectedType && selectedType.kind === 'count' && (
                  <div className="td center" style={{ gridColumn: `1 / span ${players.length + 1}` }}>
                    <div className="sum-note">Sum: {draftSum} / {selectedType.totalUnits}</div>
                    {validationMessage && <div className="validation">{validationMessage}</div>}
                  </div>
                )}
              </div>
            )
          })}
          <div className="tr">
            <div className="td bold">Totals</div>
            {players.map((p) => (
              <div key={p.id} className="td center bold">{totals[p.id]}</div>
            ))}
          </div>
        </div>
      </div>

      {winner && (
        <div className="winner">Winner: <strong>{winner.player.name}</strong> with {winner.total} points</div>
      )}
    </div>
  )
}


