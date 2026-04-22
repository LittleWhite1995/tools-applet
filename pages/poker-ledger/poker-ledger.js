const DRAFT_STORAGE_KEY = 'poker_ledger_draft_v1'
const SESSION_STORAGE_KEY = 'poker_ledger_sessions_v1'
const MAX_PLAYERS = 8

const createId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const formatAmount = (value) => Number(value || 0)
  .toFixed(2)
  .replace(/\.00$/, '')
  .replace(/(\.\d*[1-9])0+$/, '$1')

const formatDateTime = (timestamp) => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hour}:${minute}`
}

const getDayKey = (timestamp) => formatDateTime(timestamp).slice(0, 10)

const formatDateShort = (timestamp) => {
  const dayKey = getDayKey(timestamp)
  return dayKey.slice(5)
}

const getPlayerTitlePart = (players = []) => {
  const names = players
    .map((item) => String(item.name || '').trim())
    .filter(Boolean)

  if (!names.length) return '牌局'
  if (names.length <= 2) return names.join('、')

  return `${names.slice(0, 2).join('、')}等${names.length}人`
}

const getTitleRoundNumber = (title = '') => {
  const match = String(title).match(/第(\d+)局/)
  return match ? Number(match[1]) : 0
}

const getSessionRoundNumber = (sessions, sessionId, createdAt) => {
  const dayKey = getDayKey(createdAt)
  const sameDaySessions = sessions.filter((item) => getDayKey(item.createdAt || item.updatedAt || Date.now()) === dayKey)
  const existingSession = sameDaySessions.find((item) => item.id === sessionId)
  const existingRound = getTitleRoundNumber(existingSession && existingSession.title)

  if (existingRound) return existingRound

  if (existingSession) {
    return sameDaySessions
      .slice()
      .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0))
      .findIndex((item) => item.id === sessionId) + 1
  }

  const maxRound = sameDaySessions.reduce((max, item) => Math.max(max, getTitleRoundNumber(item.title)), 0)
  return maxRound ? maxRound + 1 : sameDaySessions.length + 1
}

const buildSessionTitle = ({ sessions, sessionId, createdAt, players }) => (
  `${formatDateShort(createdAt)} ${getPlayerTitlePart(players)} 第${getSessionRoundNumber(sessions, sessionId, createdAt)}局`
)

const getDefaultDraft = () => ({
  activeSessionId: '',
  draftStartedAt: Date.now(),
  sessionTitle: '',
  playerNameInput: '',
  players: [],
  selectedLoserId: '',
  selectedWinnerId: '',
  amountInput: '',
  noteInput: '',
  records: [],
})

const getEmptySummary = () => ({
  totalRounds: '0',
  totalAmount: '0',
  transferCount: '0',
  netPlayers: [],
  transfers: [],
})

const clonePlayers = (players = []) => players.map((item) => ({
  id: item.id,
  name: item.name,
}))

const cloneRecords = (records = []) => records.map((item) => ({
  id: item.id,
  loserId: item.loserId,
  winnerId: item.winnerId,
  amount: Number(item.amount || 0),
  note: item.note || '',
  createdAt: item.createdAt || Date.now(),
}))

const buildRecordViews = (players, records) => {
  const playerMap = players.reduce((map, item) => {
    map[item.id] = item.name
    return map
  }, {})

  return records.map((item) => ({
    ...item,
    loserName: playerMap[item.loserId] || '未知玩家',
    winnerName: playerMap[item.winnerId] || '未知玩家',
    amountText: formatAmount(item.amount),
    noteText: item.note || '',
  }))
}

const buildSelectedPlayerState = (players, loserId, winnerId) => {
  const loserIndex = players.findIndex((item) => item.id === loserId)
  const winnerIndex = players.findIndex((item) => item.id === winnerId)

  return {
    selectedLoserName: loserIndex >= 0 ? players[loserIndex].name : '',
    selectedWinnerName: winnerIndex >= 0 ? players[winnerIndex].name : '',
    selectedLoserIndex: loserIndex >= 0 ? loserIndex : 0,
    selectedWinnerIndex: winnerIndex >= 0 ? winnerIndex : 0,
    selectedPreviewText: loserIndex >= 0 && winnerIndex >= 0
      ? `${players[loserIndex].name} 输给 ${players[winnerIndex].name}`
      : '先选好这笔是谁输给谁',
  }
}

const buildSummary = (players, records) => {
  if (!players.length) {
    return getEmptySummary()
  }

  const balances = players.reduce((map, item) => {
    map[item.id] = 0
    return map
  }, {})

  let totalAmount = 0

  records.forEach((item) => {
    const amount = Number(item.amount || 0)

    if (!balances.hasOwnProperty(item.loserId) || !balances.hasOwnProperty(item.winnerId) || amount <= 0) {
      return
    }

    balances[item.loserId] -= amount
    balances[item.winnerId] += amount
    totalAmount += amount
  })

  const netPlayers = players.map((item) => {
    const net = Number((balances[item.id] || 0).toFixed(2))

    return {
      id: item.id,
      name: item.name,
      net,
      netText: net > 0 ? `+${formatAmount(net)}` : formatAmount(net),
      statusText: net > 0 ? '赢' : net < 0 ? '输' : '平',
      toneClass: net > 0 ? 'is-positive' : net < 0 ? 'is-negative' : 'is-flat',
    }
  })

  const creditors = netPlayers
    .filter((item) => item.net > 0)
    .map((item) => ({ id: item.id, name: item.name, amount: item.net }))
    .sort((a, b) => b.amount - a.amount)

  const debtors = netPlayers
    .filter((item) => item.net < 0)
    .map((item) => ({ id: item.id, name: item.name, amount: Math.abs(item.net) }))
    .sort((a, b) => b.amount - a.amount)

  const transfers = []
  let creditorIndex = 0
  let debtorIndex = 0

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]
    const debtor = debtors[debtorIndex]
    const amount = Number(Math.min(creditor.amount, debtor.amount).toFixed(2))

    transfers.push({
      id: `${debtor.id}_${creditor.id}_${transfers.length}`,
      fromName: debtor.name,
      toName: creditor.name,
      amount,
      amountText: formatAmount(amount),
    })

    creditor.amount = Number((creditor.amount - amount).toFixed(2))
    debtor.amount = Number((debtor.amount - amount).toFixed(2))

    if (creditor.amount <= 0.009) creditorIndex += 1
    if (debtor.amount <= 0.009) debtorIndex += 1
  }

  return {
    totalRounds: String(records.length),
    totalAmount: formatAmount(totalAmount),
    transferCount: String(transfers.length),
    netPlayers,
    transfers,
  }
}

const normalizeDraft = (draft = {}) => ({
  activeSessionId: draft.activeSessionId || '',
  draftStartedAt: draft.draftStartedAt || Date.now(),
  sessionTitle: draft.sessionTitle || '',
  playerNameInput: draft.playerNameInput || '',
  players: clonePlayers(draft.players),
  selectedLoserId: draft.selectedLoserId || '',
  selectedWinnerId: draft.selectedWinnerId || '',
  amountInput: draft.amountInput || '',
  noteInput: draft.noteInput || '',
  records: cloneRecords(draft.records),
})

const isDraftEmpty = (draft) => (
  !String(draft.sessionTitle || '').trim()
  && !String(draft.playerNameInput || '').trim()
  && !String(draft.amountInput || '').trim()
  && !String(draft.noteInput || '').trim()
  && !draft.players.length
  && !draft.records.length
  && !draft.selectedLoserId
  && !draft.selectedWinnerId
)

const readSessions = () => {
  const stored = wx.getStorageSync(SESSION_STORAGE_KEY)
  return Array.isArray(stored) ? stored : []
}

const writeSessions = (sessions) => {
  wx.setStorageSync(SESSION_STORAGE_KEY, sessions)
}

Page({
  data: {
    ...getDefaultDraft(),
    summary: getEmptySummary(),
    recordsView: [],
    selectedLoserName: '',
    selectedWinnerName: '',
    selectedLoserIndex: 0,
    selectedWinnerIndex: 0,
    selectedPreviewText: '先选好这笔是谁输给谁',
    savedSessions: [],
  },

  onLoad() {
    this.loadLocalData()
  },

  loadLocalData() {
    const storedDraft = wx.getStorageSync(DRAFT_STORAGE_KEY)
    const draft = normalizeDraft(storedDraft || getDefaultDraft())
    const savedSessions = this.mapSavedSessions(readSessions())

    this.setData({
      ...draft,
      recordsView: buildRecordViews(draft.players, draft.records),
      summary: buildSummary(draft.players, draft.records),
      ...buildSelectedPlayerState(draft.players, draft.selectedLoserId, draft.selectedWinnerId),
      savedSessions,
    })
  },

  getDraftData() {
    const {
      activeSessionId,
      draftStartedAt,
      sessionTitle,
      playerNameInput,
      players,
      selectedLoserId,
      selectedWinnerId,
      amountInput,
      noteInput,
      records,
    } = this.data

    return {
      activeSessionId,
      draftStartedAt,
      sessionTitle,
      playerNameInput,
      players: clonePlayers(players),
      selectedLoserId,
      selectedWinnerId,
      amountInput,
      noteInput,
      records: cloneRecords(records),
    }
  },

  persistDraft(draft) {
    if (isDraftEmpty(draft)) {
      wx.removeStorageSync(DRAFT_STORAGE_KEY)
      return
    }

    wx.setStorageSync(DRAFT_STORAGE_KEY, draft)
  },

  setDraftState(patch) {
    const nextDraft = {
      ...this.getDraftData(),
      ...patch,
    }

    const summary = buildSummary(nextDraft.players, nextDraft.records)
    const recordsView = buildRecordViews(nextDraft.players, nextDraft.records)

    this.setData({
      ...patch,
      summary,
      recordsView,
      ...buildSelectedPlayerState(nextDraft.players, nextDraft.selectedLoserId, nextDraft.selectedWinnerId),
    }, () => {
      this.persistDraft(nextDraft)
    })
  },

  mapSavedSessions(sessions) {
    return sessions
      .slice()
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
      .map((item) => {
        const players = clonePlayers(item.players)
        const records = cloneRecords(item.records)
        const summary = buildSummary(players, records)

        return {
          ...item,
          players,
          records,
          summary,
          savedAtText: formatDateTime(item.updatedAt || item.createdAt || Date.now()),
          metaText: `${players.length} 人 · ${records.length} 笔`,
          totalAmountText: summary.totalAmount,
        }
      })
  },

  refreshSavedSessions() {
    this.setData({
      savedSessions: this.mapSavedSessions(readSessions()),
    })
  },

  onInput(event) {
    const { field } = event.currentTarget.dataset

    this.setDraftState({
      [field]: event.detail.value,
    })
  },

  onAddPlayer() {
    const name = String(this.data.playerNameInput || '').trim()

    if (!name) {
      wx.showToast({
        title: '先输入玩家名字',
        icon: 'none',
      })
      return
    }

    if (this.data.players.length >= MAX_PLAYERS) {
      wx.showToast({
        title: `最多支持 ${MAX_PLAYERS} 人`,
        icon: 'none',
      })
      return
    }

    if (this.data.players.some((item) => item.name === name)) {
      wx.showToast({
        title: '玩家名字不要重复',
        icon: 'none',
      })
      return
    }

    const players = [
      ...this.data.players,
      { id: createId('player'), name },
    ]

    this.setDraftState({
      players,
      playerNameInput: '',
    })
  },

  onRemovePlayer(event) {
    const { id } = event.currentTarget.dataset
    const player = this.data.players.find((item) => item.id === id)

    if (!player) return

    const relatedRecordCount = this.data.records.filter((item) => (
      item.loserId === id || item.winnerId === id
    )).length

    const removePlayer = () => {
      const players = this.data.players.filter((item) => item.id !== id)
      const records = this.data.records.filter((item) => (
        item.loserId !== id && item.winnerId !== id
      ))

      this.setDraftState({
        players,
        records,
        selectedLoserId: this.data.selectedLoserId === id ? '' : this.data.selectedLoserId,
        selectedWinnerId: this.data.selectedWinnerId === id ? '' : this.data.selectedWinnerId,
      })

      wx.showToast({
        title: relatedRecordCount ? `已移除 ${player.name} 和相关记录` : `已移除 ${player.name}`,
        icon: 'none',
      })
    }

    if (relatedRecordCount) {
      wx.showModal({
        title: '移除玩家',
        content: `${player.name} 关联了 ${relatedRecordCount} 笔记录，移除后这些记录也会删除。`,
        confirmText: '移除',
        confirmColor: '#c56b6b',
        success: ({ confirm }) => {
          if (confirm) removePlayer()
        },
      })
      return
    }

    removePlayer()
  },

  onPickerChange(event) {
    const { role } = event.currentTarget.dataset
    const index = Number(event.detail.value)
    const player = this.data.players[index]

    if (!role || !player) return

    if (role === 'loser' && player.id === this.data.selectedWinnerId) {
      wx.showToast({
        title: '输家和赢家不能选同一个人',
        icon: 'none',
      })
      return
    }

    if (role === 'winner' && player.id === this.data.selectedLoserId) {
      wx.showToast({
        title: '输家和赢家不能选同一个人',
        icon: 'none',
      })
      return
    }

    if (role === 'loser') {
      this.setDraftState({
        selectedLoserId: player.id,
      })
      return
    }

    this.setDraftState({
      selectedWinnerId: player.id,
    })
  },

  onAddRecord() {
    const amount = Number(this.data.amountInput)
    const loserId = this.data.selectedLoserId
    const winnerId = this.data.selectedWinnerId
    const note = String(this.data.noteInput || '').trim()

    if (this.data.players.length < 2) {
      wx.showToast({
        title: '至少先添加 2 个玩家',
        icon: 'none',
      })
      return
    }

    if (!loserId || !winnerId) {
      wx.showToast({
        title: '先选输家和赢家',
        icon: 'none',
      })
      return
    }

    if (loserId === winnerId) {
      wx.showToast({
        title: '输家和赢家不能是同一人',
        icon: 'none',
      })
      return
    }

    if (!amount || amount <= 0) {
      wx.showToast({
        title: '请输入正确金额',
        icon: 'none',
      })
      return
    }

    const records = [
      ...this.data.records,
      {
        id: createId('record'),
        loserId,
        winnerId,
        amount: Number(amount.toFixed(2)),
        note,
        createdAt: Date.now(),
      },
    ]

    this.setDraftState({
      records,
      amountInput: '',
      noteInput: '',
    })
  },

  onDeleteRecord(event) {
    const { id } = event.currentTarget.dataset

    this.setDraftState({
      records: this.data.records.filter((item) => item.id !== id),
    })
  },

  getResolvedTitle({ sessions, sessionId, createdAt }) {
    return buildSessionTitle({
      sessions,
      sessionId,
      createdAt,
      players: this.data.players,
    })
  },

  onSaveSession() {
    if (!this.data.players.length || !this.data.records.length) {
      wx.showToast({
        title: '先记几笔再保存',
        icon: 'none',
      })
      return
    }

    const sessions = readSessions()
    const now = Date.now()
    const sessionId = this.data.activeSessionId || createId('session')
    const existingIndex = sessions.findIndex((item) => item.id === sessionId)
    const createdAt = existingIndex >= 0 ? sessions[existingIndex].createdAt : this.data.draftStartedAt
    const sessionPayload = {
      id: sessionId,
      title: this.getResolvedTitle({ sessions, sessionId, createdAt }),
      createdAt,
      updatedAt: now,
      players: clonePlayers(this.data.players),
      records: cloneRecords(this.data.records),
    }

    if (existingIndex >= 0) {
      sessions.splice(existingIndex, 1, sessionPayload)
    } else {
      sessions.unshift(sessionPayload)
    }

    writeSessions(sessions)
    this.setDraftState({
      activeSessionId: sessionId,
      sessionTitle: '',
    })
    this.refreshSavedSessions()

    wx.showToast({
      title: existingIndex >= 0 ? '已更新到本机' : '已保存到本机',
      icon: 'none',
    })
  },

  onLoadSession(event) {
    const { id } = event.currentTarget.dataset
    const session = readSessions().find((item) => item.id === id)

    if (!session) {
      wx.showToast({
        title: '这局记录没找到',
        icon: 'none',
      })
      this.refreshSavedSessions()
      return
    }

    const draft = {
      activeSessionId: session.id,
      draftStartedAt: session.createdAt || Date.now(),
      sessionTitle: session.title || '',
      playerNameInput: '',
      players: clonePlayers(session.players),
      selectedLoserId: '',
      selectedWinnerId: '',
      amountInput: '',
      noteInput: '',
      records: cloneRecords(session.records),
    }

    this.setData({
      ...draft,
      summary: buildSummary(draft.players, draft.records),
      recordsView: buildRecordViews(draft.players, draft.records),
      ...buildSelectedPlayerState(draft.players, draft.selectedLoserId, draft.selectedWinnerId),
    }, () => {
      this.persistDraft(draft)
    })

    wx.showToast({
      title: '已载入这局牌',
      icon: 'none',
    })
  },

  onDeleteSession(event) {
    const { id } = event.currentTarget.dataset
    const target = this.data.savedSessions.find((item) => item.id === id)

    if (!target) return

    wx.showModal({
      title: '删除牌局',
      content: `确认删除“${target.title}”吗？`,
      success: ({ confirm }) => {
        if (!confirm) return

        const sessions = readSessions().filter((item) => item.id !== id)
        writeSessions(sessions)
        this.refreshSavedSessions()

        if (this.data.activeSessionId === id) {
          const nextDraft = getDefaultDraft()
          this.setData({
            ...nextDraft,
            summary: getEmptySummary(),
            recordsView: [],
            ...buildSelectedPlayerState(nextDraft.players, nextDraft.selectedLoserId, nextDraft.selectedWinnerId),
          }, () => {
            this.persistDraft(nextDraft)
          })
        }

        wx.showToast({
          title: '已删除',
          icon: 'none',
        })
      },
    })
  },

  onNewSession() {
    const hasContent = this.data.players.length || this.data.records.length

    if (!hasContent) {
      const nextDraft = getDefaultDraft()
      this.setData({
        ...nextDraft,
        summary: getEmptySummary(),
        recordsView: [],
        ...buildSelectedPlayerState(nextDraft.players, nextDraft.selectedLoserId, nextDraft.selectedWinnerId),
      }, () => {
        this.persistDraft(nextDraft)
      })
      return
    }

    wx.showModal({
      title: '开始新牌局',
      content: '当前编辑中的内容会清空，已保存到本机的历史牌局不会受影响。',
      success: ({ confirm }) => {
        if (!confirm) return

        const nextDraft = getDefaultDraft()
        this.setData({
          ...nextDraft,
          summary: getEmptySummary(),
          recordsView: [],
          ...buildSelectedPlayerState(nextDraft.players, nextDraft.selectedLoserId, nextDraft.selectedWinnerId),
        }, () => {
          this.persistDraft(nextDraft)
        })
      },
    })
  },
})
