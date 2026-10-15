const STORAGE_KEY = 'scoreboard-active-match-v1'
const FREE_MODE_MAX_POINTS = 999

const MATCH_TYPES = {
  badminton: {
    id: 'badminton',
    name: '羽毛球',
    description: '21 分制，领先 2 分获胜，30 分封顶',
  },
  tableTennis: {
    id: 'tableTennis',
    name: '乒乓球',
    description: '11 分制，10:10 后需领先 2 分',
  },
  free: {
    id: 'free',
    name: '自由计分',
    description: `最高 ${FREE_MODE_MAX_POINTS} 分，手动结束每一局`,
  },
}

const clone = (value) => JSON.parse(JSON.stringify(value))

const normalizeName = (name, fallback) => String(name || '').trim().slice(0, 10) || fallback

const createMatch = ({ mode = 'badminton', playerNames = [] } = {}) => {
  const matchType = MATCH_TYPES[mode] || MATCH_TYPES.badminton
  const now = Date.now()

  return {
    version: 1,
    id: `match-${now}`,
    mode: matchType.id,
    modeName: matchType.name,
    createdAt: now,
    updatedAt: now,
    players: {
      playerA: {
        id: 'playerA',
        name: normalizeName(playerNames[0], '选手 A'),
        points: 0,
        games: 0,
        tone: 'coral',
      },
      playerB: {
        id: 'playerB',
        name: normalizeName(playerNames[1], '选手 B'),
        points: 0,
        games: 0,
        tone: 'teal',
      },
    },
    sideOrder: ['playerA', 'playerB'],
    lastGame: null,
    history: [],
  }
}

const createSnapshot = (match) => ({
  players: clone(match.players),
  sideOrder: [...match.sideOrder],
  lastGame: match.lastGame ? clone(match.lastGame) : null,
})

const recordStep = (match) => {
  const nextMatch = clone(match)
  nextMatch.history = [
    ...(match.history || []).slice(-49),
    createSnapshot(match),
  ]
  nextMatch.updatedAt = Date.now()
  return nextMatch
}

const getOpponentId = (match, playerId) => Object.keys(match.players)
  .find((id) => id !== playerId)

const hasWonGame = (mode, points, opponentPoints) => {
  if (mode === 'badminton') {
    if (points === 30) return true
    return points >= 21 && points - opponentPoints >= 2
  }

  if (mode === 'tableTennis') {
    return points >= 11 && points - opponentPoints >= 2
  }

  return false
}

const finishGame = (match, winnerId) => {
  const loserId = getOpponentId(match, winnerId)
  const winner = match.players[winnerId]
  const loser = match.players[loserId]

  match.lastGame = {
    winnerId,
    winnerName: winner.name,
    score: `${winner.points}:${loser.points}`,
    gameNumber: winner.games + loser.games + 1,
  }
  winner.games += 1
  winner.points = 0
  loser.points = 0
}

const addPoint = (match, playerId) => {
  if (!match.players[playerId]) return match
  if (match.mode === 'free' && match.players[playerId].points >= FREE_MODE_MAX_POINTS) return match

  const nextMatch = recordStep(match)
  const opponentId = getOpponentId(nextMatch, playerId)
  const player = nextMatch.players[playerId]
  const opponent = nextMatch.players[opponentId]
  player.points += 1

  if (hasWonGame(nextMatch.mode, player.points, opponent.points)) {
    finishGame(nextMatch, playerId)
  }

  return nextMatch
}

const subtractPoint = (match, playerId) => {
  if (!match.players[playerId] || match.players[playerId].points <= 0) return match

  const nextMatch = recordStep(match)
  nextMatch.players[playerId].points -= 1
  return nextMatch
}

const swapSides = (match) => {
  const nextMatch = recordStep(match)
  nextMatch.sideOrder = [...nextMatch.sideOrder].reverse()
  return nextMatch
}

const renamePlayer = (match, playerId, name) => {
  if (!match.players[playerId]) return match

  const normalizedName = normalizeName(name, match.players[playerId].name)
  if (normalizedName === match.players[playerId].name) return match

  const nextMatch = recordStep(match)
  nextMatch.players[playerId].name = normalizedName
  if (nextMatch.lastGame && nextMatch.lastGame.winnerId === playerId) {
    nextMatch.lastGame.winnerName = normalizedName
  }
  return nextMatch
}

const finishFreeGame = (match, winnerId) => {
  if (match.mode !== 'free' || !match.players[winnerId]) return match

  const nextMatch = recordStep(match)
  finishGame(nextMatch, winnerId)
  return nextMatch
}

const undo = (match) => {
  if (!match.history || !match.history.length) return match

  const history = [...match.history]
  const snapshot = history.pop()

  return {
    ...clone(match),
    ...clone(snapshot),
    history,
    updatedAt: Date.now(),
  }
}

module.exports = {
  STORAGE_KEY,
  FREE_MODE_MAX_POINTS,
  MATCH_TYPES,
  createMatch,
  addPoint,
  subtractPoint,
  swapSides,
  renamePlayer,
  finishFreeGame,
  undo,
}
