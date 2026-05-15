const STORAGE_KEY = 'rulerCalibrationV1'

const standardOptions = [
  {
    id: 'card-short',
    name: '银行卡 / 身份证短边 53.98mm',
    length: 53.98,
    desc: '适合快速校准，放在左侧校准线旁比较',
  },
  {
    id: 'card-long',
    name: '银行卡 / 身份证长边 85.60mm',
    length: 85.6,
    desc: '竖向校准更推荐，手机竖屏通常也能放下',
  },
  {
    id: 'known-10',
    name: '已知长度 1cm / 10mm',
    length: 10,
    desc: '适合用身边明确为 1cm 的小物件校准',
  },
  {
    id: 'known-20',
    name: '已知长度 2cm / 20mm',
    length: 20,
    desc: '适合用身边明确为 2cm 的物件校准',
  },
  {
    id: 'known-30',
    name: '已知长度 3cm / 30mm',
    length: 30,
    desc: '适合用身边明确为 3cm 的物件校准',
  },
  {
    id: 'known-40',
    name: '已知长度 4cm / 40mm',
    length: 40,
    desc: '适合用身边明确为 4cm 的物件校准',
  },
  {
    id: 'known-50',
    name: '已知长度 5cm / 50mm',
    length: 50,
    desc: '适合用身边明确为 5cm 的物件校准',
  },
  {
    id: 'custom',
    name: '自定义长度',
    length: 50,
    custom: true,
    desc: '输入你手边已知物品的真实长度',
  },
]

const DEFAULT_STANDARD_INDEX = 1

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const formatNumber = (value, digits = 2) => {
  if (!Number.isFinite(value)) return '--'
  return String(Number(value.toFixed(digits)))
}

const formatDateTime = (timestamp) => {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  const pad = (value) => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const getWindowSize = () => {
  try {
    if (wx.getWindowInfo) {
      const windowInfo = wx.getWindowInfo()

      return {
        width: windowInfo.windowWidth,
        height: windowInfo.windowHeight,
      }
    }

    const systemInfo = wx.getSystemInfoSync()

    return {
      width: systemInfo.windowWidth,
      height: systemInfo.windowHeight,
    }
  } catch (error) {
    return {
      width: 375,
      height: 667,
    }
  }
}

const getPanelHeight = (windowHeight) => clamp(Math.floor(windowHeight * 0.78), 660, 920)

const getCalibrationMax = (panelHeight) => Math.max(360, panelHeight - 80)

const getEstimatedPxPerMm = (windowWidth) => {
  // 小程序无法读取真实 PPI，这里只用于未校准时的粗略展示。
  return clamp(windowWidth / 68, 4.2, 6.4)
}

const buildTicks = (maxMm) => Array.from({ length: maxMm + 1 }, (_, mm) => {
  let type = 'minor'

  if (mm % 10 === 0) {
    type = 'major'
  } else if (mm % 5 === 0) {
    type = 'middle'
  }

  return {
    mm,
    type,
    label: mm % 10 === 0 ? String(mm / 10) : '',
  }
})

Page({
  data: {
    standardOptions,
    standardIndex: DEFAULT_STANDARD_INDEX,
    standardName: standardOptions[DEFAULT_STANDARD_INDEX].name,
    standardDesc: standardOptions[DEFAULT_STANDARD_INDEX].desc,
    standardLength: standardOptions[DEFAULT_STANDARD_INDEX].length,
    standardLengthText: formatNumber(standardOptions[DEFAULT_STANDARD_INDEX].length),
    isCustomStandard: Boolean(standardOptions[DEFAULT_STANDARD_INDEX].custom),
    customLengthInput: '',
    windowWidth: 375,
    windowHeight: 667,
    calibrationMax: 580,
    panelHeight: 660,
    panelHeightStyle: 'height: 660px;',
    calibrationPx: 469,
    calibrationLineStyle: 'height: 469px;',
    calibrationHandleStyle: 'top: 469px;',
    pxPerMm: 5.48,
    pxPerMmText: '5.48',
    tickSize: 5.48,
    rulerHeightStyle: 'height: 1096px;',
    rulerTicks: buildTicks(200),
    rulerLengthCm: 20,
    hasCalibration: false,
    statusText: '未校准',
    statusDesc: '当前尺子按常见手机宽度估算，只适合临时参考。',
    calibrationTimeText: '',
    dimensionWarning: '',
    dragStartY: 0,
    dragStartPx: 0,
  },

  onLoad() {
    this.initRuler()
  },

  onResize() {
    const windowSize = getWindowSize()
    const panelHeight = getPanelHeight(windowSize.height)
    const calibrationMax = getCalibrationMax(panelHeight)

    this.setData({
      windowWidth: windowSize.width,
      windowHeight: windowSize.height,
      calibrationMax,
      panelHeight,
      panelHeightStyle: `height: ${panelHeight}px;`,
      dimensionWarning: this.data.hasCalibration ? '屏幕方向或窗口尺寸变化后，建议重新校准一次。' : '',
    }, () => {
      this.syncCalibrationLine()
      this.rebuildRuler()
    })
  },

  initRuler() {
    const windowSize = getWindowSize()
    const panelHeight = getPanelHeight(windowSize.height)
    const calibrationMax = getCalibrationMax(panelHeight)
    const stored = this.readCalibration()
    const storedStandardIndex = stored
      ? standardOptions.findIndex((item) => item.id === stored.standardId)
      : -1
    const standardIndex = storedStandardIndex >= 0 ? storedStandardIndex : DEFAULT_STANDARD_INDEX
    const standard = standardOptions[standardIndex]
    const customLengthInput = stored && stored.standardId === 'custom'
      ? String(stored.customLengthInput || stored.standardLength || '')
      : ''
    const standardLength = standard.custom
      ? this.getLengthFromInput(customLengthInput)
      : standard.length
    const pxPerMm = stored ? stored.pxPerMm : getEstimatedPxPerMm(windowSize.width)
    const calibrationPx = clamp(Math.round(pxPerMm * standardLength), 160, calibrationMax)

    this.setData({
      standardIndex,
      standardName: standard.name,
      standardDesc: standard.desc,
      standardLength,
      standardLengthText: formatNumber(standardLength),
      isCustomStandard: Boolean(standard.custom),
      customLengthInput,
      windowWidth: windowSize.width,
      windowHeight: windowSize.height,
      calibrationMax,
      panelHeight,
      panelHeightStyle: `height: ${panelHeight}px;`,
      pxPerMm,
      calibrationPx,
      hasCalibration: Boolean(stored),
      statusText: stored ? '已校准' : '未校准',
      statusDesc: stored
        ? '当前尺子使用本机保存的校准值，适合同一台设备继续测量。'
        : '当前尺子按常见手机宽度估算，只适合临时参考。',
      calibrationTimeText: stored ? `上次校准：${formatDateTime(stored.updatedAt)}` : '',
    }, () => {
      this.syncCalibrationLine()
      this.rebuildRuler()
    })
  },

  readCalibration() {
    try {
      const stored = wx.getStorageSync(STORAGE_KEY)

      if (stored && Number(stored.pxPerMm) > 0) {
        return stored
      }
    } catch (error) {
      return null
    }

    return null
  },

  syncCalibrationLine() {
    const calibrationPx = clamp(Number(this.data.calibrationPx), 160, this.data.calibrationMax)

    this.setData({
      calibrationPx,
      calibrationLineStyle: `height: ${calibrationPx}px;`,
      calibrationHandleStyle: `top: ${calibrationPx}px;`,
    })
  },

  rebuildRuler() {
    const pxPerMm = Number(this.data.pxPerMm) || getEstimatedPxPerMm(this.data.windowWidth)
    const rulerLengthCm = 20
    const rulerLengthMm = rulerLengthCm * 10

    this.setData({
      pxPerMm,
      pxPerMmText: formatNumber(pxPerMm),
      tickSize: pxPerMm,
      rulerLengthCm,
      rulerTicks: buildTicks(rulerLengthMm),
      rulerHeightStyle: `height: ${Math.round(rulerLengthMm * pxPerMm)}px;`,
    })
  },

  onStandardChange(event) {
    const standardIndex = Number(event.detail.value)
    const standard = standardOptions[standardIndex]
    const standardLength = standard.custom
      ? this.getCustomLength()
      : standard.length
    const calibrationPx = clamp(Math.round(this.data.pxPerMm * standardLength), 160, this.data.calibrationMax)

    this.setData({
      standardIndex,
      standardName: standard.name,
      standardDesc: standard.desc,
      standardLength,
      standardLengthText: formatNumber(standardLength),
      isCustomStandard: Boolean(standard.custom),
      calibrationPx,
    }, () => {
      this.syncCalibrationLine()
    })
  },

  getCustomLength() {
    const customLength = Number(this.data.customLengthInput)

    if (Number.isFinite(customLength) && customLength > 0) {
      return clamp(customLength, 5, 200)
    }

    return 50
  },

  onCustomLengthInput(event) {
    const value = event.detail.value
    const standardLength = this.getLengthFromInput(value)
    const calibrationPx = clamp(Math.round(this.data.pxPerMm * standardLength), 160, this.data.calibrationMax)

    this.setData({
      customLengthInput: value,
      standardLength,
      standardLengthText: formatNumber(standardLength),
      calibrationPx,
    }, () => {
      this.syncCalibrationLine()
    })
  },

  getLengthFromInput(value) {
    const length = Number(value)

    if (Number.isFinite(length) && length > 0) {
      return clamp(length, 5, 200)
    }

    return 50
  },

  onCalibrationTouchStart(event) {
    const touch = event.touches && event.touches[0]

    if (!touch) return

    this.setData({
      dragStartY: touch.clientY || touch.pageY,
      dragStartPx: this.data.calibrationPx,
    })
  },

  onCalibrationTouchMove(event) {
    const touch = event.touches && event.touches[0]

    if (!touch) return

    const currentY = touch.clientY || touch.pageY
    const delta = currentY - this.data.dragStartY
    this.updateCalibrationPx(this.data.dragStartPx + delta)
  },

  onNudgeTap(event) {
    const delta = Number(event.currentTarget.dataset.delta || 0)
    this.updateCalibrationPx(Number(this.data.calibrationPx) + delta)
  },

  updateCalibrationPx(value) {
    const calibrationPx = clamp(Math.round(Number(value)), 160, this.data.calibrationMax)

    this.setData({
      calibrationPx,
      calibrationLineStyle: `height: ${calibrationPx}px;`,
      calibrationHandleStyle: `top: ${calibrationPx}px;`,
    })
  },

  onSaveCalibration() {
    if (!Number.isFinite(Number(this.data.standardLength)) || Number(this.data.standardLength) <= 0) {
      wx.showToast({
        title: '请输入有效长度',
        icon: 'none',
      })
      return
    }

    const pxPerMm = Number(this.data.calibrationPx) / Number(this.data.standardLength)
    const payload = {
      pxPerMm,
      standardId: standardOptions[this.data.standardIndex].id,
      standardLength: this.data.standardLength,
      customLengthInput: this.data.customLengthInput,
      calibrationPx: this.data.calibrationPx,
      windowWidth: this.data.windowWidth,
      updatedAt: Date.now(),
    }

    try {
      wx.setStorageSync(STORAGE_KEY, payload)
    } catch (error) {
      wx.showToast({
        title: '保存失败',
        icon: 'none',
      })
      return
    }

    this.setData({
      pxPerMm,
      hasCalibration: true,
      statusText: '已校准',
      statusDesc: '当前尺子使用本机保存的校准值，适合同一台设备继续测量。',
      calibrationTimeText: `上次校准：${formatDateTime(payload.updatedAt)}`,
      dimensionWarning: '',
    }, () => {
      this.rebuildRuler()
      wx.showToast({
        title: '已保存校准',
        icon: 'success',
      })
    })
  },

  onResetCalibration() {
    try {
      wx.removeStorageSync(STORAGE_KEY)
    } catch (error) {
      // 删除失败时继续回到估算值，避免用户卡在旧状态。
    }

    const pxPerMm = getEstimatedPxPerMm(this.data.windowWidth)
    const calibrationPx = clamp(Math.round(pxPerMm * this.data.standardLength), 160, this.data.calibrationMax)

    this.setData({
      pxPerMm,
      calibrationPx,
      hasCalibration: false,
      statusText: '未校准',
      statusDesc: '当前尺子按常见手机宽度估算，只适合临时参考。',
      calibrationTimeText: '',
      dimensionWarning: '',
    }, () => {
      this.syncCalibrationLine()
      this.rebuildRuler()
      wx.showToast({
        title: '已恢复估算',
        icon: 'none',
      })
    })
  },

  onShareAppMessage() {
    return {
      title: '手机临时当尺子用，先校准再测量更靠谱',
      path: '/pages/ruler/ruler',
    }
  },

  onShareTimeline() {
    return {
      title: '校准尺子：用手机屏幕临时测量长度',
      query: '',
    }
  },
})
