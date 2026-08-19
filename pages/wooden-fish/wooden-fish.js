const STORAGE_KEY = 'wooden_fish_state_v1'
const AUDIO_SRC = '/assets/audio/wooden-fish.m4a'

const SPEED_OPTIONS = [
  { id: 'slow', label: '慢', desc: '1 次/秒', interval: 1000 },
  { id: 'medium', label: '中', desc: '2 次/秒', interval: 500 },
  { id: 'fast', label: '快', desc: '4 次/秒', interval: 250 },
]

const getTodayKey = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getSafeInteger = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed < 0) return fallback

  return Math.min(parsed, max)
}

const getSpeed = (speedId) => SPEED_OPTIONS.find((item) => item.id === speedId) || SPEED_OPTIONS[0]

Page({
  data: {
    todayCount: 0,
    totalCount: 0,
    todayKey: getTodayKey(),
    soundEnabled: true,
    autoEnabled: false,
    speedId: SPEED_OPTIONS[0].id,
    speedOptions: SPEED_OPTIONS,
    isStriking: false,
    floatVisible: false,
  },

  onLoad() {
    this.loadSavedState()
    this.createAudioPool()
  },

  onShow() {
    this.refreshTodayCount()
  },

  onHide() {
    this.stopAutoStrike()
    this.flushSavedState()
  },

  onUnload() {
    this.stopAutoStrike()
    this.clearStrikeTimer()
    this.flushSavedState()
    this.destroyAudioPool()
  },

  loadSavedState() {
    let saved = {}

    try {
      saved = wx.getStorageSync(STORAGE_KEY) || {}
    } catch (error) {
      console.error('[wooden-fish] load state failed', error)
    }

    const todayKey = getTodayKey()
    const speed = getSpeed(saved.speedId)

    this.setData({
      todayKey,
      todayCount: saved.todayKey === todayKey ? getSafeInteger(saved.todayCount, 0) : 0,
      totalCount: getSafeInteger(saved.totalCount, 0),
      soundEnabled: saved.soundEnabled !== false,
      speedId: speed.id,
      autoEnabled: false,
    })
  },

  refreshTodayCount() {
    const todayKey = getTodayKey()

    if (todayKey === this.data.todayKey) return

    this.setData({
      todayKey,
      todayCount: 0,
    })
    this.scheduleSave()
  },

  createAudioPool() {
    if (typeof wx.createInnerAudioContext !== 'function') return

    this.audioIndex = 0
    this.audioPool = Array.from({ length: 4 }, () => {
      const audio = wx.createInnerAudioContext()

      audio.autoplay = false
      audio.src = AUDIO_SRC
      audio.volume = 0.9
      audio.onError((error) => {
        console.error('[wooden-fish] play audio failed', error)
      })
      return audio
    })
  },

  destroyAudioPool() {
    if (!this.audioPool) return

    this.audioPool.forEach((audio) => audio.destroy())
    this.audioPool = null
  },

  playSound() {
    if (!this.data.soundEnabled || !this.audioPool || !this.audioPool.length) return

    const audio = this.audioPool[this.audioIndex % this.audioPool.length]
    this.audioIndex = (this.audioIndex + 1) % this.audioPool.length

    try {
      audio.stop()
      audio.play()
    } catch (error) {
      console.error('[wooden-fish] play sound failed', error)
    }
  },

  clearStrikeTimer() {
    if (this.strikeTimer) {
      clearTimeout(this.strikeTimer)
      this.strikeTimer = null
    }
  },

  showStrikeEffect() {
    this.clearStrikeTimer()
    this.setData({
      isStriking: false,
      floatVisible: false,
    }, () => {
      this.setData({
        isStriking: true,
        floatVisible: true,
      })

      this.strikeTimer = setTimeout(() => {
        this.setData({
          isStriking: false,
          floatVisible: false,
        })
        this.strikeTimer = null
      }, 360)
    })
  },

  performStrike(isAuto = false) {
    this.setData({
      todayCount: this.data.todayCount + 1,
      totalCount: this.data.totalCount + 1,
    })

    this.showStrikeEffect()
    this.playSound()
    this.scheduleSave()

    if (!isAuto && typeof wx.vibrateShort === 'function') {
      wx.vibrateShort({ type: 'light' })
    }
  },

  onStrike() {
    this.performStrike(false)
  },

  clearAutoTimer() {
    if (this.autoTimer) {
      clearInterval(this.autoTimer)
      this.autoTimer = null
    }
  },

  startAutoStrike(immediate = true) {
    this.clearAutoTimer()

    if (immediate) {
      this.performStrike(true)
    }

    const speed = getSpeed(this.data.speedId)
    this.autoTimer = setInterval(() => this.performStrike(true), speed.interval)
  },

  stopAutoStrike() {
    this.clearAutoTimer()

    if (this.data.autoEnabled) {
      this.setData({ autoEnabled: false })
    }
  },

  onAutoChange(event) {
    const autoEnabled = Boolean(event.detail.value)

    this.setData({ autoEnabled }, () => {
      if (autoEnabled) {
        this.startAutoStrike()
      } else {
        this.clearAutoTimer()
      }
      this.scheduleSave()
    })
  },

  onSoundChange(event) {
    this.setData({
      soundEnabled: Boolean(event.detail.value),
    })
    this.scheduleSave()
  },

  onSpeedTap(event) {
    const { id } = event.currentTarget.dataset
    const speed = getSpeed(id)

    if (speed.id === this.data.speedId) return

    this.setData({ speedId: speed.id }, () => {
      if (this.data.autoEnabled) {
        this.startAutoStrike(false)
      }
      this.scheduleSave()
    })
  },

  onResetTap() {
    wx.showModal({
      title: '重置功德',
      content: '确定将今日功德和累计功德全部清零吗？',
      confirmText: '确定重置',
      confirmColor: '#c59b52',
      success: (result) => {
        if (!result.confirm) return

        this.stopAutoStrike()
        this.setData({
          todayKey: getTodayKey(),
          todayCount: 0,
          totalCount: 0,
        })
        this.flushSavedState()
        wx.showToast({ title: '已重置', icon: 'success' })
      },
    })
  },

  scheduleSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }

    this.saveTimer = setTimeout(() => {
      this.flushSavedState()
    }, 300)
  },

  flushSavedState() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }

    try {
      wx.setStorageSync(STORAGE_KEY, {
        todayKey: this.data.todayKey,
        todayCount: this.data.todayCount,
        totalCount: this.data.totalCount,
        soundEnabled: this.data.soundEnabled,
        speedId: this.data.speedId,
      })
    } catch (error) {
      console.error('[wooden-fish] save state failed', error)
    }
  },

  onShareAppMessage() {
    return {
      title: '敲一下电子木鱼，赚一份今日功德',
      path: '/pages/wooden-fish/wooden-fish',
    }
  },

  onShareTimeline() {
    return {
      title: '电子木鱼：手动自动都能敲',
      query: '',
    }
  },
})
