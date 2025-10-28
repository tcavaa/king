import { GAME_TYPES } from '../constants/gameTypes'

export default function GameTypeMatrix({ players, usedTypesByPlayer, activePlayerIndex, onPreselect }) {
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
            {players.map((p, idx) => {
              const used = (usedTypesByPlayer[p.id] || new Set()).has(t.code)
              return (
                <button
                  key={p.id}
                  className={`cell player-col ${used ? 'used' : 'available'}`}
                  type="button"
                  disabled={used || idx !== activePlayerIndex}
                  onClick={() => onPreselect && onPreselect(t.code)}
                >
                  {used ? '✕' : '•'}
                </button>
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


