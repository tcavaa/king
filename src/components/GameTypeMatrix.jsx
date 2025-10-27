import { GAME_TYPES } from './GameTypeSelector.jsx'

export default function GameTypeMatrix({ players, usedTypesByPlayer, activePlayerIndex }) {
  return (
    <div className="card matrix">
      <h2>Game Types Availability</h2>
      <div className="matrix-grid">
        <div className="matrix-header sticky">
          <div className="cell type-col">Type</div>
          {players.map((p, idx) => (
            <div key={p.id} className={`cell player-col ${idx === activePlayerIndex ? 'active' : ''}`}>{p.name}</div>
          ))}
        </div>
        {GAME_TYPES.map((t) => (
          <div key={t.code} className="matrix-row">
            <div className="cell type-col code">{t.code}</div>
            {players.map((p) => {
              const used = (usedTypesByPlayer[p.id] || new Set()).has(t.code)
              return (
                <div key={p.id} className={`cell player-col ${used ? 'used' : 'available'}`}>
                  {used ? '✕' : '•'}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div className="legend">
        <span className="dot available">•</span> Available
        <span className="dot used">✕</span> Used
      </div>
    </div>
  )
}


