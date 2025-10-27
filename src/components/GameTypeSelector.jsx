import { useMemo, useState } from 'react'

export const GAME_TYPES = [
  { code: 'K', label: 'K — No King of hearts', kind: 'single', points: -40, totalUnits: 1 },
  { code: 'Q', label: 'Q — No Queens', kind: 'count', pointsPerUnit: -10, totalUnits: 4, unitLabel: 'Queens' },
  { code: 'J', label: 'J — No Jacks', kind: 'count', pointsPerUnit: -10, totalUnits: 4, unitLabel: 'Jacks' },
  { code: 'H', label: '<3 — No Hearts', kind: 'count', pointsPerUnit: -5, totalUnits: 8, unitLabel: 'Hearts' },
  { code: 'L2', label: 'L2 — No Last 2', kind: 'count', pointsPerUnit: -20, totalUnits: 2, unitLabel: 'Last 2' },
  { code: 'T', label: '- — No Tricks', kind: 'count', pointsPerUnit: -4, totalUnits: 10, unitLabel: 'Tricks' },
  { code: 'P1', label: '+ — Pluses (1)', kind: 'count', pointsPerUnit: 8, totalUnits: 10, unitLabel: 'Tricks' },
  { code: 'P2', label: '+ — Pluses (2)', kind: 'count', pointsPerUnit: 8, totalUnits: 10, unitLabel: 'Tricks' },
  { code: 'P3', label: '+ — Pluses (3)', kind: 'count', pointsPerUnit: 8, totalUnits: 10, unitLabel: 'Tricks' },
]

export default function GameTypeSelector({
  players,
  activePlayerIndex,
  usedTypesByPlayer,
  onRoundComplete,
}) {
  const [selectedTypeCode, setSelectedTypeCode] = useState(null)
  const [countsByPlayerId, setCountsByPlayerId] = useState({})
  const [singleTargetPlayerId, setSingleTargetPlayerId] = useState(null)

  const activePlayer = players[activePlayerIndex]

  const availableTypesForActive = useMemo(() => {
    const usedSet = usedTypesByPlayer[activePlayer.id] || new Set()
    return GAME_TYPES.filter((t) => !usedSet.has(t.code))
  }, [activePlayer.id, usedTypesByPlayer])

  const selectedType = useMemo(
    () => GAME_TYPES.find((t) => t.code === selectedTypeCode) || null,
    [selectedTypeCode]
  )

  const sumCounts = useMemo(
    () => Object.values(countsByPlayerId).reduce((a, b) => a + (Number(b) || 0), 0),
    [countsByPlayerId]
  )

  const validationMessage = useMemo(() => {
    if (!selectedType) return 'Choose a game type'
    if (selectedType.kind === 'count') {
      if (sumCounts !== selectedType.totalUnits) {
        return `Distribute exactly ${selectedType.totalUnits} ${selectedType.unitLabel || 'units'} across players`
      }
      return ''
    }
    if (selectedType.kind === 'single') {
      if (!singleTargetPlayerId) return 'Select the player who took it'
      return ''
    }
    return ''
  }, [selectedType, sumCounts, singleTargetPlayerId])

  function handleCountChange(playerId, value) {
    setCountsByPlayerId((prev) => ({ ...prev, [playerId]: Math.max(0, Number(value || 0)) }))
  }

  function computeScores() {
    const scores = {}
    if (!selectedType) return scores
    if (selectedType.kind === 'count') {
      players.forEach((p) => {
        const units = Number(countsByPlayerId[p.id] || 0)
        scores[p.id] = units * (selectedType.pointsPerUnit || 0)
      })
    } else if (selectedType.kind === 'single') {
      players.forEach((p) => {
        scores[p.id] = p.id === singleTargetPlayerId ? selectedType.points : 0
      })
    }
    return scores
  }

  function endRound() {
    if (validationMessage) return
    const scores = computeScores()
    const roundRecord = {
      leaderPlayerId: activePlayer.id,
      gameTypeCode: selectedType.code,
      countsByPlayerId: selectedType.kind === 'count' ? { ...countsByPlayerId } : null,
      singleTargetPlayerId: selectedType.kind === 'single' ? singleTargetPlayerId : null,
      scores,
    }
    onRoundComplete(roundRecord)
    setSelectedTypeCode(null)
    setCountsByPlayerId({})
    setSingleTargetPlayerId(null)
  }

  return (
    <div className="card game-type-selector">
      <h2>Choose a game type — {activePlayer.name}</h2>

      <div className="type-grid">
        {availableTypesForActive.map((t) => (
          <button
            key={t.code}
            className={selectedTypeCode === t.code ? 'type-btn selected' : 'type-btn'}
            onClick={() => setSelectedTypeCode(t.code)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {selectedType && selectedType.kind === 'count' && (
        <div className="inputs">
          <h3>Distribute {selectedType.totalUnits} {selectedType.unitLabel || 'units'}</h3>
          <div className="inputs-grid">
            {players.map((p) => (
              <label key={p.id} className="input-row">
                <span>{p.name}</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  style={{ fontSize: 16 }}
                  value={countsByPlayerId[p.id] ?? ''}
                  onChange={(e) => handleCountChange(p.id, e.target.value)}
                />
              </label>
            ))}
          </div>
          <div className="sum-note">Sum: {sumCounts} / {selectedType.totalUnits}</div>
        </div>
      )}

      {selectedType && selectedType.kind === 'single' && (
        <div className="inputs">
          <h3>Select the player who took it</h3>
          <div className="radio-grid">
            {players.map((p) => (
              <label key={p.id} className="radio-row">
                <input
                  type="radio"
                  name="singleTarget"
                  checked={singleTargetPlayerId === p.id}
                  onChange={() => setSingleTargetPlayerId(p.id)}
                />
                <span>{p.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {validationMessage && (
        <div className="validation">{validationMessage}</div>
      )}

      <div className="actions sticky-footer">
        <button type="button" className="primary" disabled={Boolean(validationMessage)} onClick={endRound}>
          End Round
        </button>
      </div>
    </div>
  )
}


