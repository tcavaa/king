export default function ScoreTable({ players, rounds }) {
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
          {rounds.map((r, idx) => (
            <div key={idx} className="tr">
              <div className="td player-name">{idx + 1} — {r.gameTypeCode}</div>
              {players.map((p) => (
                <div key={p.id} className="td center">{r.scores[p.id] ?? ''}</div>
              ))}
            </div>
          ))}
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


