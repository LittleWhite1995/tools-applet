const unitOptions = [
  { id: 'day', label: '天' },
  { id: 'month', label: '月' },
  { id: 'year', label: '年' },
]

const STATUS_THEME_MAP = {
  pending: {
    badge: '待计算',
    note: '填好生产日期和保质期后，这里会显示到期参考日和当前状态。',
  },
  fresh: {
    badge: '未过期',
  },
  warning: {
    badge: '快到期',
  },
  today: {
    badge: '今天到期',
  },
  expired: {
    badge: '已过期',
  },
}

const getTodayString = () => formatDate(new Date())

const getDefaultResult = () => ({
  expiryDate: '--',
  badge: STATUS_THEME_MAP.pending.badge,
  statusText: '--',
  distanceText: '--',
  shelfLifeText: '--',
  statusTheme: 'pending',
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

function getMonthLastDate(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function addMonths(date, months) {
  const year = date.getFullYear()
  const monthIndex = date.getMonth() + months
  const day = date.getDate()
  const targetYear = year + Math.floor(monthIndex / 12)
  const targetMonth = ((monthIndex % 12) + 12) % 12
  const lastDate = getMonthLastDate(targetYear, targetMonth)

  return new Date(targetYear, targetMonth, Math.min(day, lastDate))
}

function addYears(date, years) {
  const targetYear = date.getFullYear() + years
  const targetMonth = date.getMonth()
  const day = date.getDate()
  const lastDate = getMonthLastDate(targetYear, targetMonth)

  return new Date(targetYear, targetMonth, Math.min(day, lastDate))
}

function getDayDiff(startDate, endDate) {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  const msPerDay = 24 * 60 * 60 * 1000

  return Math.round((end - start) / msPerDay)
}

function getUnitText(value, unitKey) {
  const unitMap = {
    day: '天',
    month: '个月',
    year: '年',
  }

  return `${value} ${unitMap[unitKey]}`
}

function calculateExpiryDate(manufactureDate, shelfLifeValue, unitKey) {
  if (unitKey === 'day') {
    return addDays(manufactureDate, shelfLifeValue - 1)
  }

  if (unitKey === 'month') {
    return addDays(addMonths(manufactureDate, shelfLifeValue), -1)
  }

  return addDays(addYears(manufactureDate, shelfLifeValue), -1)
}

Page({
  data: {
    manufactureDate: '',
    todayDate: getTodayString(),
    shelfLifeValue: '',
    unitKey: 'month',
    unitOptions,
    hasResult: false,
    result: getDefaultResult(),
  },

  updateDraft(patch) {
    this.setData({
      ...patch,
      hasResult: false,
      result: getDefaultResult(),
    })
  },

  onDateChange(event) {
    const { field } = event.currentTarget.dataset

    this.updateDraft({
      [field]: event.detail.value,
    })
  },

  onInput(event) {
    const { field } = event.currentTarget.dataset

    this.updateDraft({
      [field]: event.detail.value,
    })
  },

  onUnitSelect(event) {
    this.updateDraft({
      unitKey: event.currentTarget.dataset.unit,
    })
  },

  onCalculate() {
    const { manufactureDate, todayDate, unitKey } = this.data
    const shelfLifeValue = Number(this.data.shelfLifeValue)

    if (!manufactureDate) {
      wx.showToast({
        title: '请选择生产日期',
        icon: 'none',
      })
      return
    }

    if (!Number.isInteger(shelfLifeValue) || shelfLifeValue <= 0) {
      wx.showToast({
        title: '保质期请填写正整数',
        icon: 'none',
      })
      return
    }

    if (shelfLifeValue > 9999) {
      wx.showToast({
        title: '保质期数值看起来有点大',
        icon: 'none',
      })
      return
    }

    const manufacture = parseDate(manufactureDate)
    const reference = parseDate(todayDate)
    const expiry = calculateExpiryDate(manufacture, shelfLifeValue, unitKey)
    const expiryDate = formatDate(expiry)
    const diffFromReference = getDayDiff(reference, expiry)
    const shelfLifeText = getUnitText(shelfLifeValue, unitKey)

    let statusTheme = 'fresh'
    let statusText = ''
    let distanceText = ''

    if (diffFromReference > 7) {
      statusTheme = 'fresh'
      statusText = '当前还在保质期内'
      distanceText = `距离到期还有 ${diffFromReference} 天`
    } else if (diffFromReference > 0) {
      statusTheme = 'warning'
      statusText = '已经临近到期'
      distanceText = `距离到期还有 ${diffFromReference} 天`
    } else if (diffFromReference === 0) {
      statusTheme = 'today'
      statusText = '今天就是到期参考日'
      distanceText = '建议尽快食用或使用'
    } else {
      statusTheme = 'expired'
      statusText = '已经超过保质期'
      distanceText = `已过期 ${Math.abs(diffFromReference)} 天`
    }

    this.setData({
      hasResult: true,
      result: {
        expiryDate,
        badge: STATUS_THEME_MAP[statusTheme].badge,
        statusText,
        distanceText,
        shelfLifeText,
        statusTheme,
      },
    })
  },

  onReset() {
    this.setData({
      manufactureDate: '',
      todayDate: getTodayString(),
      shelfLifeValue: '',
      unitKey: 'month',
      hasResult: false,
      result: getDefaultResult(),
    })
  },
})
