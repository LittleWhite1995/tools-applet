const workerTypes = [
  {
    id: 'male',
    label: '男职工',
    baseAgeMonths: 60 * 12,
    maxDelayMonths: 36,
    stepMonths: 4,
    finalAgeText: '63 岁',
  },
  {
    id: 'female55',
    label: '女性原 55 岁（管理/专技）',
    baseAgeMonths: 55 * 12,
    maxDelayMonths: 36,
    stepMonths: 4,
    finalAgeText: '58 岁',
  },
  {
    id: 'female50',
    label: '女性原 50 岁（普通工人）',
    baseAgeMonths: 50 * 12,
    maxDelayMonths: 60,
    stepMonths: 2,
    finalAgeText: '55 岁',
  },
]

const POLICY_START_YEAR = 2025
const POLICY_START_MONTH_INDEX = 0

const getTodayString = () => formatDate(new Date())

const getDefaultResult = () => ({
  retireDate: '--',
  retireAgeText: '--',
  flexibleDate: '--',
  flexibleAgeText: '--',
  delayText: '--',
  oldRetireDate: '--',
  workerTypeText: '--',
  ruleText: '选择出生日期和人员类型后开始计算',
  summary: '结果会按渐进式延迟退休规则粗略估算。',
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

function addMonths(date, months) {
  const year = date.getFullYear()
  const monthIndex = date.getMonth() + months
  const day = date.getDate()
  const targetYear = year + Math.floor(monthIndex / 12)
  const targetMonth = ((monthIndex % 12) + 12) % 12
  const lastDate = new Date(targetYear, targetMonth + 1, 0).getDate()

  return new Date(targetYear, targetMonth, Math.min(day, lastDate))
}

function getMonthIndex(date) {
  return date.getFullYear() * 12 + date.getMonth()
}

function getPolicyDelayMonths(oldRetireDate, workerType) {
  const oldMonthIndex = getMonthIndex(oldRetireDate)
  const startMonthIndex = POLICY_START_YEAR * 12 + POLICY_START_MONTH_INDEX

  if (oldMonthIndex < startMonthIndex) {
    return 0
  }

  const monthsAfterStart = oldMonthIndex - startMonthIndex
  const delayMonths = Math.floor(monthsAfterStart / workerType.stepMonths) + 1

  return Math.min(delayMonths, workerType.maxDelayMonths)
}

function formatAgeByMonths(totalMonths) {
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12

  if (!months) {
    return `${years} 岁`
  }

  return `${years} 岁 ${months} 个月`
}

function formatYearMonth(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

Page({
  data: {
    workerTypes,
    birthDate: '',
    todayDate: getTodayString(),
    workerType: 'male',
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
    this.updateDraft({
      birthDate: event.detail.value,
    })
  },

  onTypeTap(event) {
    this.updateDraft({
      workerType: event.currentTarget.dataset.type,
    })
  },

  onCalculate() {
    const { birthDate } = this.data
    const type = workerTypes.find((item) => item.id === this.data.workerType)

    if (!birthDate) {
      wx.showToast({
        title: '请选择出生日期',
        icon: 'none',
      })
      return
    }

    if (!type) {
      wx.showToast({
        title: '请选择人员类型',
        icon: 'none',
      })
      return
    }

    const birth = parseDate(birthDate)
    const oldRetireDate = addMonths(birth, type.baseAgeMonths)
    const delayMonths = getPolicyDelayMonths(oldRetireDate, type)
    const retireDate = addMonths(oldRetireDate, delayMonths)
    const retireAgeMonths = type.baseAgeMonths + delayMonths
    const flexibleAgeMonths = retireAgeMonths + 36
    const flexibleRetireDate = addMonths(retireDate, 36)
    const ruleText = delayMonths
      ? `按规则延迟 ${delayMonths} 个月，最终不超过 ${type.finalAgeText}`
      : '原退休时间早于 2025 年，按原年龄估算'

    this.setData({
      hasResult: true,
      result: {
        retireDate: formatYearMonth(retireDate),
        retireAgeText: formatAgeByMonths(retireAgeMonths),
        flexibleDate: formatYearMonth(flexibleRetireDate),
        flexibleAgeText: formatAgeByMonths(flexibleAgeMonths),
        delayText: `${delayMonths} 个月`,
        oldRetireDate: formatYearMonth(oldRetireDate),
        workerTypeText: type.label,
        ruleText,
        summary: '结果按普通职工法定退休年龄估算，特殊工种、病退、灵活就业和地方办理细则可能不同。',
      },
    })
  },

  onReset() {
    this.setData({
      birthDate: '',
      workerType: 'male',
      hasResult: false,
      result: getDefaultResult(),
    })
  },

  onShareAppMessage() {
    return {
      title: '输入出生日期，估算自己的退休时间',
      path: '/pages/retirement-age/retirement-age',
    }
  },

  onShareTimeline() {
    return {
      title: '退休年龄计算器：估算法定退休年月',
      query: '',
    }
  },
})
