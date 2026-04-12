import { GAME_TYPES } from '../constants/gameTypes'

export const TYPE_ROWS = [
  { code: 'K',  label: 'King ♥',     icon: '♥',  group: 'penalty' },
  { code: 'Q',  label: 'Queens',     icon: '♛',  group: 'penalty' },
  { code: 'J',  label: 'Jacks',      icon: '🃏', group: 'penalty' },
  { code: 'H',  label: 'Hearts',     icon: '❤️', group: 'penalty' },
  { code: 'L2', label: 'Last 2',     icon: '🎴', group: 'penalty' },
  { code: 'T',  label: 'Bad Tricks', icon: '💀', group: 'penalty' },
  { code: 'P1', label: 'Plus (1)',   icon: '✨', group: 'bonus' },
  { code: 'P2', label: 'Plus (2)',   icon: '✨', group: 'bonus' },
  { code: 'P3', label: 'Plus (3)',   icon: '✨', group: 'bonus' },
]

// Returns { [playerId]: { K, Q, J, H, L2, T, P1, P2, P3 } } — units collected per player
export function computeGameStats(players, rounds) {
  const stats = {}
  players.forEach(p => {
    stats[p.id] = { K: 0, Q: 0, J: 0, H: 0, L2: 0, T: 0, P1: 0, P2: 0, P3: 0 }
  })
  rounds.forEach(round => {
    const { gameTypeCode: code, countsByPlayerId, singleTargetPlayerId } = round
    const type = GAME_TYPES.find(t => t.code === code)
    if (!type) return
    if (type.kind === 'count' && countsByPlayerId) {
      players.forEach(p => {
        if (stats[p.id]) stats[p.id][code] += countsByPlayerId[p.id] || 0
      })
    } else if (type.kind === 'single' && singleTargetPlayerId) {
      if (stats[singleTargetPlayerId]) stats[singleTargetPlayerId][code] += 1
    }
  })
  return stats
}

// Returns { [playerId]: { [typeCode]: totalScore } } — score contribution per type
export function computeScoresByType(players, rounds) {
  const result = {}
  players.forEach(p => {
    result[p.id] = { K: 0, Q: 0, J: 0, H: 0, L2: 0, T: 0, P1: 0, P2: 0, P3: 0 }
  })
  rounds.forEach(round => {
    if (!round.scores) return
    const code = round.gameTypeCode
    players.forEach(p => {
      if (result[p.id] && code in result[p.id]) {
        result[p.id][code] += round.scores[p.id] || 0
      }
    })
  })
  return result
}

export function getGameAwards(players, stats, participants) {
  if (!players?.length) return []
  const awards = []
  const topPlayer = fn => players.reduce((b, p) => !b || fn(p) > fn(b) ? p : b, null)

  const add = (icon, title, fn, fmt) => {
    const p = topPlayer(fn)
    const val = p ? fn(p) : 0
    if (p && val >= 1) awards.push({ icon, title, player: p.name, value: fmt(val) })
  }

  add('♛', 'Queen Hoarder',       p => stats[p.id]?.Q || 0,                           v => `${v} queen${v !== 1 ? 's' : ''}`)
  add('❤️', 'Heartbreaker',        p => stats[p.id]?.H || 0,                           v => `${v} heart${v !== 1 ? 's' : ''}`)
  add('🃏', 'Jack Magnet',         p => stats[p.id]?.J || 0,                           v => `${v} jack${v !== 1 ? 's' : ''}`)
  add('♥',  'King Taker',          p => stats[p.id]?.K || 0,                           v => `got king ${v}x`)
  add('🎴', 'Last-Card Hoarder',   p => stats[p.id]?.L2 || 0,                          v => `${v} last-2 card${v !== 1 ? 's' : ''}`)
  add('💀', 'Trick Sponge',        p => stats[p.id]?.T || 0,                           v => `${v} bad trick${v !== 1 ? 's' : ''}`)
  add('✨', 'Plus Master',         p => (stats[p.id]?.P1||0)+(stats[p.id]?.P2||0)+(stats[p.id]?.P3||0), v => `${v} plus trick${v !== 1 ? 's' : ''}`)

  if (participants?.length) {
    const winner = participants.reduce((b, p) => !b || p.score > b.score ? p : b, null)
    const loser  = participants.reduce((b, p) => !b || p.score < b.score ? p : b, null)
    if (winner) awards.push({ icon: '🏆', title: 'Game Winner', player: winner.name, value: `${winner.score} pts` })
    if (loser && loser.name !== winner?.name) awards.push({ icon: '💸', title: 'Biggest Loser', player: loser.name, value: `${loser.score} pts` })
  }

  return awards
}

// Aggregates stats across all game_details records.
// Returns { [playerId]: { name, gamesPlayed, wins, totalScore, K, Q, J, H, L2, T, P1, P2, P3 } }
export function computeGlobalStats(allDetails, allResults) {
  const map = {}

  allDetails.forEach(detail => {
    const { players, rounds, game_result_id } = detail
    if (!players || !rounds) return
    const result = allResults?.find(r => r.id === game_result_id)
    const gameStats = computeGameStats(players, rounds)

    const totals = {}
    players.forEach(p => { totals[p.id] = 0 })
    rounds.forEach(r => {
      if (r.scores) players.forEach(p => { totals[p.id] += r.scores[p.id] || 0 })
    })

    players.forEach(p => {
      if (!map[p.id]) {
        map[p.id] = { name: p.name, gamesPlayed: 0, wins: 0, totalScore: 0, K: 0, Q: 0, J: 0, H: 0, L2: 0, T: 0, P1: 0, P2: 0, P3: 0 }
      }
      const m = map[p.id]
      m.gamesPlayed++
      m.totalScore += totals[p.id] || 0
      if (result?.winner_name === p.name) m.wins++
      const gs = gameStats[p.id] || {}
      ;['K','Q','J','H','L2','T','P1','P2','P3'].forEach(k => { m[k] += gs[k] || 0 })
    })
  })

  return map
}

export function getGlobalAwards(playerMap) {
  const players = Object.values(playerMap)
  if (!players.length) return []
  const awards = []
  const top = fn => players.reduce((b, p) => fn(p) > fn(b) ? p : b, players[0])

  const add = (icon, title, fn, fmt) => {
    const p = top(fn)
    if (p) awards.push({ icon, title, player: p.name, value: fmt(p) })
  }

  add('🏆', 'All-time Champion',   p => p.wins,                           p => `${p.wins} win${p.wins !== 1 ? 's' : ''} in ${p.gamesPlayed} game${p.gamesPlayed !== 1 ? 's' : ''}`)
  add('♛',  'Queen Magnet',        p => p.Q,                              p => `${p.Q} queens total`)
  add('❤️', 'Most Heartless',      p => p.H,                              p => `${p.H} hearts total`)
  add('🃏', 'Jack Collector',      p => p.J,                              p => `${p.J} jacks total`)
  add('♥',  'King Slayer',         p => p.K,                              p => `grabbed king ${p.K}x`)
  add('🎴', 'Last-Card Hoarder',   p => p.L2,                             p => `${p.L2} last-2 cards`)
  add('💀', 'Trick Goblin',        p => p.T,                              p => `${p.T} bad tricks taken`)
  add('✨', 'Plus Wizard',         p => p.P1 + p.P2 + p.P3,              p => `${p.P1 + p.P2 + p.P3} plus tricks`)
  add('📈', 'Highest Avg Score',   p => p.gamesPlayed > 0 ? p.totalScore / p.gamesPlayed : -Infinity, p => `avg ${(p.totalScore / p.gamesPlayed).toFixed(1)} pts/game`)
  add('🎮', 'Most Dedicated',      p => p.gamesPlayed,                    p => `${p.gamesPlayed} game${p.gamesPlayed !== 1 ? 's' : ''} played`)

  return awards
}
