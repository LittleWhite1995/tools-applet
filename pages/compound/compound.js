const quickRateOptions = ['1', '3', '5', '8', '10']
const quickYearOptions = ['1', '3', '5', '10', '20']

const getDefaultResult = () => ({
  totalAssetsCompact: '--',
  totalAssets: '--',
  totalInvested: '--',
  totalProfit: '--',
  profitRate: '--',
  monthlyRate: '--',
  principalFuture: '--',
  sipFuture: '--',
  planLabel: '',
  summary: '',
})

Page({
  data: {
    principalValue: '',
    monthlyValue: '',
    annualRateValue: '',
    yearsValue: '',
    quickRateOptions,
    quickYearOptions,
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

    this.updateDraft({
      [field]: event.detail.value,
    })
  },

  onQuickRateTap(event) {
    this.updateDraft({
      annualRateValue: event.currentTarget.dataset.rate,
    })
  },

  onQuickYearTap(event) {
    this.updateDraft({
      yearsValue: event.currentTarget.dataset.years,
    })
  },

  onCalculate() {
    const principal = Number(this.data.principalValue || 0)
    const monthly = Number(this.data.monthlyValue || 0)
    const annualRate = Number(this.data.annualRateValue)
    const years = Number(this.data.yearsValue)

    if (principal === 0 && monthly === 0) {
      wx.showToast({
        title: '请至少填写本金或每月定投',
        icon: 'none',
      })
      return
    }

    if (principal < 0 || monthly < 0) {
      wx.showToast({
        title: '金额不能是负数',
        icon: 'none',
      })
      return
    }

    if (principal > 1000000000 || monthly > 100000000) {
      wx.showToast({
        title: '金额看起来有点大，检查一下',
        icon: 'none',
      })
      return
    }

    if (Number.isNaN(annualRate) || annualRate < 0 || annualRate > 100) {
      wx.showToast({
        title: '年化收益率建议填 0 到 100',
        icon: 'none',
      })
      return
    }

    if (Number.isNaN(years) || years < 0.5 || years > 80) {
      wx.showToast({
        title: '投资年限建议填 0.5 到 80 年',
        icon: 'none',
      })
      return
    }

    const months = Math.max(Math.round(years * 12), 1)
    const annualRateDecimal = annualRate / 100
    const monthlyRate = annualRateDecimal > 0
      ? Math.pow(1 + annualRateDecimal, 1 / 12) - 1
      : 0
    const growthFactor = Math.pow(1 + monthlyRate, months)
    const principalFuture = principal * growthFactor
    const sipFuture = monthlyRate === 0
      ? monthly * months
      : monthly * ((growthFactor - 1) / monthlyRate)
    const totalAssets = principalFuture + sipFuture
    const totalInvested = principal + monthly * months
    const totalProfit = totalAssets - totalInvested
    const profitRate = totalInvested > 0 ? totalProfit / totalInvested * 100 : 0

    this.setData({
      hasResult: true,
      result: {
        totalAssetsCompact: this.formatCompactMoney(totalAssets),
        totalAssets: this.formatMoney(totalAssets),
        totalInvested: this.formatMoney(totalInvested),
        totalProfit: this.formatMoney(totalProfit),
        profitRate: this.formatPercent(profitRate, 1),
        monthlyRate: this.formatPercent(monthlyRate * 100, 2),
        principalFuture: this.formatMoney(principalFuture),
        sipFuture: this.formatMoney(sipFuture),
        planLabel: `${months} 个月`,
        summary: `按月复利估算，并默认每月月末投入一次定投；这里先把年化收益率换算成等效月收益率，再计算整段持有结果。`,
      },
    })
  },

  formatMoney(value) {
    const fixed = Number(value || 0).toFixed(2)
    return `${fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 元`
  },

  formatCompactMoney(value) {
    const amount = Number(value || 0)

    if (amount >= 100000000) {
      return `${this.trimZero(amount / 100000000)} 亿`
    }

    if (amount >= 10000) {
      return `${this.trimZero(amount / 10000)} 万`
    }

    return this.trimZero(amount)
  },

  formatPercent(value, digits = 1) {
    return `${Number(value || 0).toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')}%`
  },

  trimZero(value) {
    return Number(value || 0).toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
  },

  onReset() {
    this.setData({
      principalValue: '',
      monthlyValue: '',
      annualRateValue: '',
      yearsValue: '',
      hasResult: false,
      result: getDefaultResult(),
    })
  },
})
