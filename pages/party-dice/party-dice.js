const STORAGE_KEY = 'party_dice_preferences'
const ROLL_DURATION = 760
const ROLL_FRAME_INTERVAL = 80
const SHAKE_COOLDOWN = 1200
const SENSOR_READY_TIMEOUT = 1800
const MOTION_WINDOW = 360

const PIP_MAP = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

// Each position gives the offset from the center in rpx and the angle in degrees.
const DICE_POSITIONS = {
  1: [[0, 0, -7]],
  2: [[-111, 33, -12], [106, -43, 11]],
  3: [[-196, 42, -14], [0, -81, 11], [196, 58, -10]],
  4: [[-159, -76, -12], [36, -96, 9], [165, 75, -9], [-60, 82, 13]],
  5: [
    [-176, -73, -13], [-11, -105, 10], [167, -49, -12],
    [-117, 81, 12], [39, 91, -9],
  ],
  6: [
    [-196, -54, -15], [-44, -104, 11], [124, -95, -10],
    [-144, 97, 9], [9, 57, -11], [198, 68, 14],
  ],
}

const clampDiceCount = (value, fallback) => {
  const count = Number(value)

  if (!Number.isFinite(count)) return fallback

  return Math.min(6, Math.max(1, Math.round(count)))
}

const randomDie = () => Math.floor(Math.random() * 6) + 1

const createValues = (count) => Array.from({ length: count }, randomDie)

const createPreviewValues = (count) => Array.from({ length: count }, (_, index) => (index % 6) + 1)

const createDiceItems = (values, direction = 1, movement = 0) => {
  const positions = DICE_POSITIONS[values.length]
  const jitter = () => movement ? Math.round((Math.random() * 2 - 1) * movement) : 0

  return values.map((value, index) => {
    const [x, y, angle] = positions[index]

    return {
      id: `die_${direction}_${index}`,
      value,
      pips: PIP_MAP[value],
      x: x * direction + jitter(),
      y: y + jitter(),
      angle: angle * direction + jitter(),
    }
  })
}

const getAngleDelta = (current, previous) => {
  const delta = Math.abs(current - previous)

  return Math.min(delta, 360 - delta)
}

const getViewCopy = (state) => {
  if (state.isRolling) {
    return {
      statusText: '骰子滚动中',
      stageHint: '马上停下',
      actionText: '正在摇骰',
    }
  }

  if (!state.hasResult) {
    return {
      statusText: state.mode === 'cup' ? '骰盅已就位' : '骰子已就位',
      stageHint: '点击下方按钮，或直接晃动手机',
      actionText: '开始摇骰',
    }
  }

  if (state.mode === 'public') {
    return {
      statusText: '结果已公开',
      stageHint: state.isShakeLocked ? '点「再摇一次」开始下一轮' : '晃动手机继续摇，或锁定本轮结果',
      actionText: '再摇一次',
    }
  }

  if (state.isRevealed) {
    return {
      statusText: '已经揭盅',
      stageHint: '点「再摇一次」开始下一轮',
      actionText: '再摇一次',
    }
  }

  if (state.isPeeking) {
    return {
      statusText: '正在偷看',
      stageHint: '松手立即盖回',
      actionText: '再摇一次',
    }
  }

  return {
    statusText: '结果藏在骰盅里',
    stageHint: state.isShakeLocked ? '长按可再看，点「再摇一次」开始下一轮' : '长按骰盅偷看，松手盖回',
    actionText: '再摇一次',
  }
}

Page({
  data: {
    mode: 'cup',
    cupDiceCount: 5,
    publicDiceCount: 2,
    diceCount: 5,
    diceItems: createDiceItems(createPreviewValues(5)),
    total: 0,
    hasResult: false,
    isRolling: false,
    isPeeking: false,
    isRevealed: false,
    isShakeLocked: false,
    soundEnabled: true,
    vibrationEnabled: true,
    sensorReady: false,
    sensorStatus: '正在开启晃动',
    statusText: '骰盅已就位',
    stageHint: '点击下方按钮，或直接晃动手机',
    actionText: '开始摇骰',
  },

  onLoad() {
    const saved = wx.getStorageSync(STORAGE_KEY) || {}
    const mode = saved.mode === 'public' ? 'public' : 'cup'
    const cupDiceCount = clampDiceCount(saved.cupDiceCount, 5)
    const publicDiceCount = clampDiceCount(saved.publicDiceCount, 2)
    const diceCount = mode === 'cup' ? cupDiceCount : publicDiceCount

    this.handleAccelerometerSample = (res) => this.onAccelerometerSample(res)
    this.handleDeviceMotionSample = (res) => this.onDeviceMotionSample(res)
    this.updateState({
      mode,
      cupDiceCount,
      publicDiceCount,
      diceCount,
      diceItems: createDiceItems(createPreviewValues(diceCount)),
      soundEnabled: saved.soundEnabled !== false,
      vibrationEnabled: saved.vibrationEnabled !== false,
    })
  },

  onShow() {
    this.startMotionSensors()
  },

  onHide() {
    this.stopMotionSensors()
    this.cancelRoll()
    this.closePeek()
  },

  onUnload() {
    this.stopMotionSensors()
    this.cancelRoll()
    this.closePeek()

    if (this.audioContext && typeof this.audioContext.close === 'function') {
      try {
        this.audioContext.close()
      } catch (error) {}
    }
  },

  updateState(nextState, callback) {
    const state = { ...this.data, ...nextState }

    this.setData({
      ...nextState,
      ...getViewCopy(state),
    }, callback)
  },

  savePreferences(nextState = {}) {
    const state = { ...this.data, ...nextState }

    wx.setStorageSync(STORAGE_KEY, {
      mode: state.mode,
      cupDiceCount: state.cupDiceCount,
      publicDiceCount: state.publicDiceCount,
      soundEnabled: state.soundEnabled,
      vibrationEnabled: state.vibrationEnabled,
    })
  },

  onModeChange(event) {
    if (this.data.isRolling) return

    const { mode } = event.currentTarget.dataset

    if (!mode || mode === this.data.mode) return

    const diceCount = mode === 'cup' ? this.data.cupDiceCount : this.data.publicDiceCount
    const nextState = {
      mode,
      diceCount,
      diceItems: createDiceItems(createPreviewValues(diceCount)),
      total: 0,
      hasResult: false,
      isPeeking: false,
      isRevealed: false,
      isShakeLocked: false,
    }

    this.updateState(nextState)
    this.savePreferences(nextState)
  },

  onDiceCountChange(event) {
    if (this.data.isRolling) return

    const step = Number(event.currentTarget.dataset.step)
    const diceCount = clampDiceCount(this.data.diceCount + step, this.data.diceCount)

    if (!step || diceCount === this.data.diceCount) return

    const countKey = this.data.mode === 'cup' ? 'cupDiceCount' : 'publicDiceCount'
    const nextState = {
      [countKey]: diceCount,
      diceCount,
      diceItems: createDiceItems(createPreviewValues(diceCount)),
      total: 0,
      hasResult: false,
      isPeeking: false,
      isRevealed: false,
      isShakeLocked: false,
    }

    this.updateState(nextState)
    this.savePreferences(nextState)
  },

  onSoundChange(event) {
    const soundEnabled = Boolean(event.detail.value)

    this.setData({ soundEnabled })
    this.savePreferences({ soundEnabled })

    if (!soundEnabled) {
      this.stopDiceSound()
    }
  },

  onVibrationChange(event) {
    const vibrationEnabled = Boolean(event.detail.value)

    this.setData({ vibrationEnabled })
    this.savePreferences({ vibrationEnabled })
  },

  onRollTap() {
    this.startRoll('button')
  },

  onLockResult() {
    const { mode, hasResult, isRolling, isShakeLocked } = this.data

    if (mode !== 'public' || !hasResult || isRolling || isShakeLocked) return

    this.updateState({ isShakeLocked: true })
  },

  onReveal() {
    if (this.data.mode !== 'cup' || !this.data.hasResult || this.data.isRolling) return

    this.updateState({
      isPeeking: false,
      isRevealed: true,
      isShakeLocked: true,
    })
  },

  onPeekStart() {
    if (this.data.mode !== 'cup' || !this.data.hasResult || this.data.isRolling || this.data.isRevealed) return

    this.updateState({
      isPeeking: true,
      isShakeLocked: true,
    })
  },

  onStageTouchEnd() {
    this.closePeek()
  },

  onStageTouchCancel() {
    this.closePeek()
  },

  closePeek() {
    if (!this.data.isPeeking) return

    this.updateState({ isPeeking: false })
  },

  clearRollTimers() {
    if (this.rollFrameTimer) {
      clearInterval(this.rollFrameTimer)
      this.rollFrameTimer = null
    }

    if (this.rollFinishTimer) {
      clearTimeout(this.rollFinishTimer)
      this.rollFinishTimer = null
    }
  },

  cancelRoll() {
    this.stopDiceSound()

    if (!this.data.isRolling) return

    this.clearRollTimers()
    this.updateState({
      isRolling: false,
      hasResult: false,
      isPeeking: false,
      isRevealed: false,
    })
  },

  startRoll(source) {
    if (this.data.isRolling || this.data.isPeeking) return

    const now = Date.now()

    if (now - (this.lastRollAt || 0) < 360) return

    const { diceCount } = this.data
    const direction = Math.random() < 0.5 ? -1 : 1
    const createRollingItems = () => createDiceItems(createValues(diceCount), direction, 9)

    if (this.data.isShakeLocked) {
      this.resetMotionDetection()
    }

    this.lastRollAt = now
    this.clearRollTimers()
    this.playDiceSound()
    this.updateState({
      isRolling: true,
      hasResult: false,
      isPeeking: false,
      isRevealed: false,
      isShakeLocked: false,
      total: 0,
      diceItems: createRollingItems(),
    })

    this.rollFrameTimer = setInterval(() => {
      this.setData({
        diceItems: createRollingItems(),
      })
    }, ROLL_FRAME_INTERVAL)

    this.rollFinishTimer = setTimeout(() => {
      const values = createValues(diceCount)

      this.clearRollTimers()
      this.stopDiceSound()
      this.updateState({
        diceItems: createDiceItems(values, direction, 5),
        total: values.reduce((sum, value) => sum + value, 0),
        hasResult: true,
        isRolling: false,
        isPeeking: false,
        isRevealed: false,
      })
      this.vibrateResult()
    }, ROLL_DURATION)
  },

  resetMotionDetection() {
    this.lastAcceleration = null
    this.lastDeviceMotion = null
    this.accelerationEnergy = 0
    this.accelerationWindowStartedAt = 0
    this.deviceMotionEnergy = 0
    this.deviceMotionWindowStartedAt = 0
  },

  startMotionSensors() {
    if (this.sensorListening) return

    this.sensorListening = true
    this.sensorHasSample = false
    this.resetMotionDetection()
    this.setData({
      sensorReady: false,
      sensorStatus: '正在开启晃动',
    })

    let attempted = false

    if (typeof wx.onAccelerometerChange === 'function' && typeof wx.startAccelerometer === 'function') {
      attempted = true
      wx.onAccelerometerChange(this.handleAccelerometerSample)
      this.accelerometerBound = true
      wx.startAccelerometer({
        interval: 'ui',
        success: () => {
          this.accelerometerStarted = true
        },
        fail: () => {
          this.accelerometerStarted = false
        },
      })
    }

    if (typeof wx.onDeviceMotionChange === 'function' && typeof wx.startDeviceMotionListening === 'function') {
      attempted = true
      wx.onDeviceMotionChange(this.handleDeviceMotionSample)
      this.deviceMotionBound = true
      wx.startDeviceMotionListening({
        interval: 'ui',
        success: () => {
          this.deviceMotionStarted = true
        },
        fail: () => {
          this.deviceMotionStarted = false
        },
      })
    }

    if (!attempted) {
      this.setData({
        sensorReady: false,
        sensorStatus: '当前设备仅支持按钮',
      })
      return
    }

    this.clearSensorReadyTimer()
    this.sensorReadyTimer = setTimeout(() => {
      if (!this.sensorHasSample && this.sensorListening) {
        this.setData({
          sensorReady: false,
          sensorStatus: '晃动不可用，请使用按钮',
        })
      }
    }, SENSOR_READY_TIMEOUT)
  },

  stopMotionSensors() {
    this.sensorListening = false
    this.clearSensorReadyTimer()

    if (this.accelerometerBound && typeof wx.offAccelerometerChange === 'function') {
      wx.offAccelerometerChange(this.handleAccelerometerSample)
    }

    if (this.deviceMotionBound && typeof wx.offDeviceMotionChange === 'function') {
      wx.offDeviceMotionChange(this.handleDeviceMotionSample)
    }

    if (this.accelerometerStarted && typeof wx.stopAccelerometer === 'function') {
      wx.stopAccelerometer()
    }

    if (this.deviceMotionStarted && typeof wx.stopDeviceMotionListening === 'function') {
      wx.stopDeviceMotionListening()
    }

    this.accelerometerBound = false
    this.accelerometerStarted = false
    this.deviceMotionBound = false
    this.deviceMotionStarted = false
    this.resetMotionDetection()
  },

  clearSensorReadyTimer() {
    if (!this.sensorReadyTimer) return

    clearTimeout(this.sensorReadyTimer)
    this.sensorReadyTimer = null
  },

  markSensorReady() {
    if (this.sensorHasSample) return

    this.sensorHasSample = true
    this.clearSensorReadyTimer()
    this.setData({
      sensorReady: true,
      sensorStatus: '晃动已开启',
    })
  },

  onAccelerometerSample(res) {
    this.markSensorReady()

    const current = {
      x: Number(res.x) || 0,
      y: Number(res.y) || 0,
      z: Number(res.z) || 0,
    }
    const previous = this.lastAcceleration
    const now = Date.now()

    this.lastAcceleration = current

    if (!previous || this.data.isRolling) return

    const delta = Math.abs(current.x - previous.x)
      + Math.abs(current.y - previous.y)
      + Math.abs(current.z - previous.z)
    const magnitude = Math.sqrt(current.x ** 2 + current.y ** 2 + current.z ** 2)
    const impact = Math.abs(magnitude - 1)

    if (now - (this.accelerationWindowStartedAt || 0) > MOTION_WINDOW) {
      this.accelerationWindowStartedAt = now
      this.accelerationEnergy = 0
    }

    if (delta > 0.1) {
      this.accelerationEnergy += delta
    }

    if (delta >= 0.52 || impact >= 0.3 || this.accelerationEnergy >= 0.82) {
      this.accelerationEnergy = 0
      this.accelerationWindowStartedAt = now
      this.triggerShakeRoll(now)
    }
  },

  onDeviceMotionSample(res) {
    this.markSensorReady()

    const current = {
      alpha: Number(res.alpha) || 0,
      beta: Number(res.beta) || 0,
      gamma: Number(res.gamma) || 0,
    }
    const previous = this.lastDeviceMotion
    const now = Date.now()

    this.lastDeviceMotion = current

    if (!previous || this.data.isRolling) return

    const delta = getAngleDelta(current.alpha, previous.alpha)
      + getAngleDelta(current.beta, previous.beta)
      + getAngleDelta(current.gamma, previous.gamma)

    if (now - (this.deviceMotionWindowStartedAt || 0) > MOTION_WINDOW) {
      this.deviceMotionWindowStartedAt = now
      this.deviceMotionEnergy = 0
    }

    if (delta > 3) {
      this.deviceMotionEnergy += delta
    }

    if (delta >= 18 || this.deviceMotionEnergy >= 28) {
      this.deviceMotionEnergy = 0
      this.deviceMotionWindowStartedAt = now
      this.triggerShakeRoll(now)
    }
  },

  triggerShakeRoll(now = Date.now()) {
    if (!this.sensorListening || this.data.isRolling || this.data.isPeeking || this.data.isShakeLocked) return
    if (now - (this.lastShakeAt || 0) < SHAKE_COOLDOWN) return

    this.lastShakeAt = now
    this.startRoll('shake')
  },

  vibrateResult() {
    if (!this.data.vibrationEnabled || typeof wx.vibrateShort !== 'function') return

    wx.vibrateShort({ type: 'light' })
  },

  playDiceSound() {
    if (!this.data.soundEnabled || typeof wx.createWebAudioContext !== 'function') return

    try {
      this.stopDiceSound()

      const context = this.audioContext || wx.createWebAudioContext()
      const startTime = context.currentTime
      const soundNodes = []

      this.audioContext = context
      this.diceSoundNodes = soundNodes

      if (typeof context.resume === 'function') {
        const resumeResult = context.resume()

        if (resumeResult && typeof resumeResult.catch === 'function') {
          resumeResult.catch(() => {})
        }
      }

      const hitCount = Math.floor((ROLL_DURATION - 60) / 65)

      for (let index = 0; index < hitCount; index += 1) {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        const hitTime = startTime + index * 0.065

        oscillator.type = index % 2 ? 'triangle' : 'square'
        oscillator.frequency.setValueAtTime(150 + Math.random() * 240, hitTime)
        gain.gain.setValueAtTime(0.0001, hitTime)
        gain.gain.exponentialRampToValueAtTime(0.055, hitTime + 0.008)
        gain.gain.exponentialRampToValueAtTime(0.0001, hitTime + 0.052)
        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start(hitTime)
        oscillator.stop(hitTime + 0.055)
        soundNodes.push({ oscillator, gain })
      }
    } catch (error) {}
  },

  stopDiceSound() {
    if (!this.diceSoundNodes) return

    this.diceSoundNodes.forEach(({ oscillator, gain }) => {
      try {
        oscillator.stop()
      } catch (error) {}

      try {
        oscillator.disconnect()
        gain.disconnect()
      } catch (error) {}
    })
    this.diceSoundNodes = null
  },

  onShareAppMessage() {
    return {
      title: '手边没骰子？打开就能摇',
      path: '/pages/party-dice/party-dice',
    }
  },

  onShareTimeline() {
    return {
      title: '聚会骰子：骰盅和公开摇骰都能用',
      query: '',
    }
  },
})
