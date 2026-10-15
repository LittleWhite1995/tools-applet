const {
  STORAGE_KEY,
  FREE_MODE_MAX_POINTS,
  addPoint,
  subtractPoint,
  swapSides,
  renamePlayer,
  finishFreeGame,
  undo,
} = require('../../utils/scoreboard-engine')

const emptyPlayer = {
  id: '',
  name: '',
  points: 0,
  games: 0,
  tone: '',
}

Page({
  data: {
    modeName: '',
    isFreeMode: false,
    leftPlayer: emptyPlayer,
    rightPlayer: emptyPlayer,
    canUndo: false,
    lastGameText: '',
  },

  onLoad() {
    this.loadMatch()
  },

  onShow() {
    wx.setKeepScreenOn({
      keepScreenOn: true,
    })
  },

  onHide() {
    this.releaseScreenLock()
  },

  onUnload() {
    this.releaseScreenLock()
  },

  releaseScreenLock() {
    wx.setKeepScreenOn({
      keepScreenOn: false,
    })
  },

  loadMatch() {
    let match = null

    try {
      match = wx.getStorageSync(STORAGE_KEY) || null
    } catch (error) {
      match = null
    }

    if (!match || !match.players || !match.sideOrder) {
      wx.showToast({
        title: '请先创建一场比赛',
        icon: 'none',
      })
      setTimeout(() => this.goToSetup(), 600)
      return
    }

    this.match = match
    this.refreshView()
  },

  refreshView() {
    const match = this.match
    const leftPlayer = match.players[match.sideOrder[0]]
    const rightPlayer = match.players[match.sideOrder[1]]

    this.setData({
      modeName: match.modeName,
      isFreeMode: match.mode === 'free',
      leftPlayer,
      rightPlayer,
      canUndo: Boolean(match.history && match.history.length),
      lastGameText: match.lastGame
        ? `第 ${match.lastGame.gameNumber} 局 · ${match.lastGame.winnerName} ${match.lastGame.score}`
        : '',
    })
  },

  commitMatch(nextMatch) {
    if (!nextMatch || nextMatch === this.match) return false

    this.match = nextMatch
    try {
      wx.setStorageSync(STORAGE_KEY, nextMatch)
    } catch (error) {
      wx.showToast({
        title: '比分保存失败',
        icon: 'none',
      })
    }
    this.refreshView()
    return true
  },

  onAddPoint(event) {
    const playerId = event.currentTarget.dataset.playerId

    if (
      this.match.mode === 'free'
      && this.match.players[playerId]
      && this.match.players[playerId].points >= FREE_MODE_MAX_POINTS
    ) {
      wx.showToast({
        title: `已达 ${FREE_MODE_MAX_POINTS} 分上限`,
        icon: 'none',
      })
      return
    }

    this.commitMatch(addPoint(this.match, playerId))
  },

  onSubtractPoint(event) {
    const playerId = event.currentTarget.dataset.playerId
    const changed = this.commitMatch(subtractPoint(this.match, playerId))
    if (!changed) {
      wx.showToast({
        title: '比分已经是 0',
        icon: 'none',
      })
    }
  },

  onUndo() {
    const changed = this.commitMatch(undo(this.match))
    if (!changed) {
      wx.showToast({
        title: '还没有可撤销的操作',
        icon: 'none',
      })
    }
  },

  onSwapSides() {
    this.commitMatch(swapSides(this.match))
  },

  onEditName(event) {
    const playerId = event.currentTarget.dataset.playerId
    const player = this.match.players[playerId]

    wx.showModal({
      title: '修改选手名字',
      content: player.name,
      editable: true,
      placeholderText: '请输入名字',
      confirmText: '保存',
      success: (result) => {
        if (!result.confirm) return
        this.commitMatch(renamePlayer(this.match, playerId, result.content))
      },
    })
  },

  onFinishFreeGame() {
    const firstPlayer = this.match.players[this.match.sideOrder[0]]
    const secondPlayer = this.match.players[this.match.sideOrder[1]]

    wx.showActionSheet({
      alertText: '选择本局胜方',
      itemList: [`${firstPlayer.name} 胜`, `${secondPlayer.name} 胜`],
      success: (result) => {
        const winnerId = this.match.sideOrder[result.tapIndex]
        this.commitMatch(finishFreeGame(this.match, winnerId))
      },
    })
  },

  onBack() {
    this.goToSetup()
  },

  goToSetup() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack()
      return
    }

    wx.redirectTo({
      url: '/pages/scoreboard/scoreboard',
    })
  },
})
