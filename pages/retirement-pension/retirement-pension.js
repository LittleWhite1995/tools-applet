const retireAgeOptions = [
  { age: '50', months: 195 },
  { age: '55', months: 170 },
  { age: '60', months: 139 },
  { age: '65', months: 101 },
]

const contributionLevelOptions = [
  { id: 'low', label: '偏低', index: 0.6, desc: '约最低档' },
  { id: 'average', label: '平均', index: 1.0, desc: '接近社平' },
  { id: 'high', label: '较高', index: 1.5, desc: '高于平均' },
]

const baseQuickOptions = ['6000', '8000', '10000', '12000']
const PERSONAL_PENSION_RATE = 0.08

function getAccountMonthsByAge(age) {
  const ageNumber = Number(age)

  if (ageNumber >= 65) {
    return 101
  }

  if (ageNumber >= 60) {
    return 139
  }

  if (ageNumber >= 55) {
    return 170
  }

  return 195
}

const getDefaultResult = () => ({
  monthlyTotal: '--',
  basePension: '--',
  accountPension: '--',
  yearlyTotal: '--',
  totalYears: '--',
  futureYears: '--',
  futureAccount: '--',
  accountMonths: '--',
  summary: '填好参数后，这里会显示预计每月养老金。',
})

function toAmount(value) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return 0
  }

  return number
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function formatMoney(value) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return '--'
  }

  return `${number.toFixed(0)} 元`
}

function formatYear(value) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return '--'
  }

  return `${number.toFixed(1).replace(/\.0$/, '')} 年`
}

function formatRate(value) {
  return `${Number(value).toFixed(2)}`
}

Page({
  data: {
    retireAgeOptions,
    contributionLevelOptions,
    baseQuickOptions,
    currentAge: '',
    payYears: '',
    accountBalance: '',
    monthlyPayBase: '',
    contributionLevel: 'average',
    retireAge: '60',
    accountMonths: '139',
    estimateBase: '8000',
    extraMonthly: '',
    showAdvanced: false,
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

  onInput(event) {
    const { field } = event.currentTarget.dataset
    const value = event.detail.value

    if (field === 'retireAge') {
      this.updateDraft({
        retireAge: value,
        accountMonths: String(getAccountMonthsByAge(value)),
      })
      return
    }

    this.updateDraft({
      [field]: value,
    })
  },

  onAgeTap(event) {
    const option = retireAgeOptions.find((item) => item.age === String(event.currentTarget.dataset.age))

    if (!option) {
      return
    }

    this.updateDraft({
      retireAge: option.age,
      accountMonths: String(option.months),
    })
  },

  onLevelTap(event) {
    this.updateDraft({
      contributionLevel: event.currentTarget.dataset.level,
    })
  },

  onQuickBaseTap(event) {
    this.updateDraft({
      estimateBase: String(event.currentTarget.dataset.value),
    })
  },

  onToggleAdvanced() {
    this.setData({
      showAdvanced: !this.data.showAdvanced,
    })
  },

  getContributionLevel() {
    return contributionLevelOptions.find((item) => item.id === this.data.contributionLevel) || contributionLevelOptions[1]
  },

  onCalculate() {
    const currentAge = toAmount(this.data.currentAge)
    const retireAge = toAmount(this.data.retireAge)
    const payYears = toAmount(this.data.payYears)
    const accountBalance = toAmount(this.data.accountBalance)
    const monthlyPayBase = toAmount(this.data.monthlyPayBase)
    const estimateBase = toAmount(this.data.estimateBase)
    const accountMonths = toAmount(this.data.accountMonths)
    const extraMonthly = toAmount(this.data.extraMonthly)
    const level = this.getContributionLevel()

    if (currentAge <= 0 || currentAge > 90) {
      wx.showToast({
        title: '请填写当前年龄',
        icon: 'none',
      })
      return
    }

    if (retireAge <= 0 || retireAge > 90) {
      wx.showToast({
        title: '请选择退休年龄',
        icon: 'none',
      })
      return
    }

    if (payYears < 0 || payYears > 80) {
      wx.showToast({
        title: '请填写已缴年限',
        icon: 'none',
      })
      return
    }

    if (accountBalance < 0) {
      wx.showToast({
        title: '账户余额不能为负',
        icon: 'none',
      })
      return
    }

    if (monthlyPayBase < 0) {
      wx.showToast({
        title: '缴费基数不能为负',
        icon: 'none',
      })
      return
    }

    if (estimateBase <= 0) {
      wx.showToast({
        title: '请填写估算基准',
        icon: 'none',
      })
      return
    }

    if (accountMonths <= 0 || accountMonths > 300) {
      wx.showToast({
        title: '计发月数需大于 0',
        icon: 'none',
      })
      return
    }

    const futureYears = Math.max(retireAge - currentAge, 0)
    const totalYears = payYears + futureYears

    if (totalYears <= 0) {
      wx.showToast({
        title: '缴费年限不能为 0',
        icon: 'none',
      })
      return
    }

    const estimatedIndex = monthlyPayBase > 0
      ? clamp(monthlyPayBase / estimateBase, 0.6, 3)
      : level.index
    const futureMonthlyAccount = monthlyPayBase > 0
      ? monthlyPayBase * PERSONAL_PENSION_RATE
      : estimateBase * level.index * PERSONAL_PENSION_RATE
    const futureAccountBalance = accountBalance + futureMonthlyAccount * 12 * futureYears
    const basePension = estimateBase * (1 + estimatedIndex) / 2 * totalYears * 0.01
    const accountPension = futureAccountBalance / accountMonths
    const monthlyTotal = basePension + accountPension + extraMonthly

    this.setData({
      hasResult: true,
      result: {
        monthlyTotal: formatMoney(monthlyTotal),
        basePension: formatMoney(basePension),
        accountPension: formatMoney(accountPension),
        yearlyTotal: formatMoney(monthlyTotal * 12),
        totalYears: formatYear(totalYears),
        futureYears: formatYear(futureYears),
        futureAccount: formatMoney(futureAccountBalance),
        accountMonths: `${accountMonths.toFixed(0)} 个月`,
        summary: `按估算基准 ${formatMoney(estimateBase)}、缴费指数 ${formatRate(estimatedIndex)}、退休前继续缴 ${formatYear(futureYears)} 粗略估算。`,
      },
    })
  },

  onReset() {
    this.setData({
      currentAge: '',
      payYears: '',
      accountBalance: '',
      monthlyPayBase: '',
      contributionLevel: 'average',
      retireAge: '60',
      accountMonths: '139',
      estimateBase: '8000',
      extraMonthly: '',
      showAdvanced: false,
      hasResult: false,
      result: getDefaultResult(),
    })
  },

  onShareAppMessage() {
    return {
      title: '退休后每月养老金大概多少？先做个粗略估算',
      path: '/pages/retirement-pension/retirement-pension',
    }
  },

  onShareTimeline() {
    return {
      title: '养老金估算器：粗略估算退休后每月金额',
      query: '',
    }
  },
})
