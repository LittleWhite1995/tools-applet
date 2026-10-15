const {
  STORAGE_KEY,
  MATCH_TYPES,
  createMatch,
} = require('../../utils/scoreboard-engine')

const modeOptions = Object.values(MATCH_TYPES)

Page({
  data: {
    modeOptions,
    selectedMode: 'badminton',
    playerAName: '选手 A',
    playerBName: '选手 B',
    activeMatch: null,
    activeSummary: '',
  },

  onShow() {
    this.loadActiveMatch()
  },

  loadActiveMatch() {
    let activeMatch = null

    try {
      activeMatch = wx.getStorageSync(STORAGE_KEY) || null
    } catch (error) {
      activeMatch = null
    }

    if (!activeMatch || !activeMatch.players || !activeMatch.sideOrder) {
      this.setData({
        activeMatch: null,
        activeSummary: '',
      })
      return
    }

    const firstPlayer = activeMatch.players[activeMatch.sideOrder[0]]
    const secondPlayer = activeMatch.players[activeMatch.sideOrder[1]]
    this.setData({
      activeMatch,
      activeSummary: `${activeMatch.modeName} · ${firstPlayer.name} ${firstPlayer.games}:${secondPlayer.games} ${secondPlayer.name}`,
    })
  },

  onModeSelect(event) {
    this.setData({
      selectedMode: event.currentTarget.dataset.mode,
    })
  },

  onNameInput(event) {
    const field = event.currentTarget.dataset.field
    this.setData({
      [field]: event.detail.value,
    })
  },

  onContinueMatch() {
    wx.navigateTo({
      url: '/pages/scoreboard-match/scoreboard-match',
    })
  },

  onStartMatch() {
    const startMatch = () => {
      const match = createMatch({
        mode: this.data.selectedMode,
        playerNames: [this.data.playerAName, this.data.playerBName],
      })

      try {
        wx.setStorageSync(STORAGE_KEY, match)
      } catch (error) {
        wx.showToast({
          title: '比赛保存失败，请重试',
          icon: 'none',
        })
        return
      }

      wx.navigateTo({
        url: '/pages/scoreboard-match/scoreboard-match',
      })
    }

    if (!this.data.activeMatch) {
      startMatch()
      return
    }

    wx.showModal({
      title: '开始新比赛？',
      content: '当前比赛会被清空，已有比分无法恢复。',
      confirmText: '开始新的',
      confirmColor: '#315f8f',
      success: (result) => {
        if (result.confirm) startMatch()
      },
    })
  },

  onShareAppMessage() {
    return {
      title: '双人记分牌｜羽毛球、乒乓球都能记',
      path: '/pages/scoreboard/scoreboard',
    }
  },
})
