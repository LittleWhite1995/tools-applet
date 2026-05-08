const MS_PER_DAY = 24 * 60 * 60 * 1000

const getTodayString = () => formatDate(new Date())

const getDefaultIntervalResult = () => ({
  daysText: '--',
  inclusiveText: '--',
  weekText: '--',
  weekdayText: '--',
  directionText: '选择日期后开始计算',
})

const getDefaultOffsetResult = () => ({
  targetDate: '--',
  baseDate: '--',
  offsetText: '--',
  directionText: '--',
})

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function parseDate(dateString) {
  const [year, month, day] = String(dateString || '').split('-').map(Number)

  return new Date(year, month - 1, day)
}

function cloneDateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date, days) {
  const result = cloneDateOnly(date)
  result.setDate(result.getDate() + days)

  return result
}

function getDayDiff(startDate, endDate) {
  const start = cloneDateOnly(startDate)
  const end = cloneDateOnly(endDate)

  return Math.round((end - start) / MS_PER_DAY)
}

function countWeekdays(startDate, endDate) {
  const signedDiff = getDayDiff(startDate, endDate)
  const step = signedDiff >= 0 ? 1 : -1
  const total = Math.abs(signedDiff) + 1
  let count = 0
  let cursor = cloneDateOnly(startDate)

  for (let index = 0; index < total; index += 1) {
    const day = cursor.getDay()

    if (day >= 1 && day <= 5) {
      count += 1
    }

    cursor = addDays(cursor, step)
  }

  return count
}

function getWeekText(days) {
  const weeks = Math.floor(days / 7)
  const restDays = days % 7

  if (!weeks) {
    return `${restDays} 天`
  }

  if (!restDays) {
    return `${weeks} 周`
  }

  return `${weeks} 周 ${restDays} 天`
}

Page({
  data: {
    startDate: getTodayString(),
    endDate: getTodayString(),
    baseDate: getTodayString(),
    offsetDays: '30',
    offsetDirection: 'after',
    hasIntervalResult: false,
    hasOffsetResult: false,
    intervalResult: getDefaultIntervalResult(),
    offsetResult: getDefaultOffsetResult(),
  },

  updateIntervalDraft(patch) {
    this.setData({
      ...patch,
      hasIntervalResult: false,
      intervalResult: getDefaultIntervalResult(),
    })
  },

  updateOffsetDraft(patch) {
    this.setData({
      ...patch,
      hasOffsetResult: false,
      offsetResult: getDefaultOffsetResult(),
    })
  },

  onDateChange(event) {
    const { field, scope } = event.currentTarget.dataset
    const patch = {
      [field]: event.detail.value,
    }

    if (scope === 'offset') {
      this.updateOffsetDraft(patch)
      return
    }

    this.updateIntervalDraft(patch)
  },

  onInput(event) {
    const { field } = event.currentTarget.dataset

    this.updateOffsetDraft({
      [field]: event.detail.value,
    })
  },

  onDirectionTap(event) {
    this.updateOffsetDraft({
      offsetDirection: event.currentTarget.dataset.direction,
    })
  },

  onCalculateInterval() {
    const { startDate, endDate } = this.data

    if (!startDate || !endDate) {
      wx.showToast({
        title: '请选择两个日期',
        icon: 'none',
      })
      return
    }

    const start = parseDate(startDate)
    const end = parseDate(endDate)
    const signedDiff = getDayDiff(start, end)
    const days = Math.abs(signedDiff)

    if (days > 36500) {
      wx.showToast({
        title: '日期跨度有点大',
        icon: 'none',
      })
      return
    }

    let directionText = '两个日期是同一天'

    if (signedDiff > 0) {
      directionText = '结束日期晚于开始日期'
    } else if (signedDiff < 0) {
      directionText = '结束日期早于开始日期'
    }

    this.setData({
      hasIntervalResult: true,
      intervalResult: {
        daysText: `${days} 天`,
        inclusiveText: `${days + 1} 天`,
        weekText: getWeekText(days),
        weekdayText: `${countWeekdays(start, end)} 天`,
        directionText,
      },
    })
  },

  onCalculateOffset() {
    const { baseDate, offsetDirection } = this.data
    const offsetInput = String(this.data.offsetDays || '').trim()
    const offsetDays = Number(this.data.offsetDays)

    if (!baseDate) {
      wx.showToast({
        title: '请选择基准日期',
        icon: 'none',
      })
      return
    }

    if (!offsetInput || !Number.isInteger(offsetDays) || offsetDays < 0) {
      wx.showToast({
        title: '天数请填写非负整数',
        icon: 'none',
      })
      return
    }

    if (offsetDays > 36500) {
      wx.showToast({
        title: '天数有点大',
        icon: 'none',
      })
      return
    }

    const base = parseDate(baseDate)
    const sign = offsetDirection === 'before' ? -1 : 1
    const target = addDays(base, sign * offsetDays)
    const directionText = offsetDirection === 'before' ? '之前' : '之后'

    this.setData({
      hasOffsetResult: true,
      offsetResult: {
        targetDate: formatDate(target),
        baseDate,
        offsetText: `${offsetDays} 天`,
        directionText,
      },
    })
  },

  onResetInterval() {
    this.setData({
      startDate: getTodayString(),
      endDate: getTodayString(),
      hasIntervalResult: false,
      intervalResult: getDefaultIntervalResult(),
    })
  },

  onResetOffset() {
    this.setData({
      baseDate: getTodayString(),
      offsetDays: '30',
      offsetDirection: 'after',
      hasOffsetResult: false,
      offsetResult: getDefaultOffsetResult(),
    })
  },
})
