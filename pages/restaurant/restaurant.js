const modules = [
  { label: '建店成本', value: 'cost' },
  { label: '盈亏平衡', value: 'breakEven' },
  { label: '经营分析', value: 'analysis' },
]

Page({
  data: {
    modules,
    activeModule: 'cost',
    monthlyRent: '',
    rentPayMonths: '',
    rentDeposit: '',
    transferFee: '',
    franchiseFee: '',
    decorationAdCost: '',
    equipmentCost: '',
    openingStock: '',
    offlineGrossMarginRate: '',
    deliveryGrossMarginRate: '',
    offlineSalesRate: '60',
    deliverySalesRate: '40',
    fixedRent: '',
    fixedLabor: '',
    fixedUtilities: '',
    fixedOther: '',
    monthlyRevenue: '',
    foodCost: '',
    laborCost: '',
    rentCost: '',
    platformCost: '',
    utilityCost: '',
    otherCost: '',
    hasResult: false,
    result: {
      primaryLabel: '预计投入',
      primaryValue: '--',
      badge: '待计算',
      notice: '',
      rows: [],
      tip: '填好数据后，这里会显示关键指标。',
    },
  },

  onModuleTap(event) {
    this.setData({
      activeModule: event.currentTarget.dataset.value,
      hasResult: false,
      result: this.getEmptyResult(event.currentTarget.dataset.value),
    })
  },

  onInput(event) {
    const { field } = event.currentTarget.dataset
    const value = event.detail.value

    if (field === 'offlineSalesRate') {
      this.setData({
        offlineSalesRate: value,
        deliverySalesRate: this.getComplementRate(value),
      })
      return
    }

    if (field === 'deliverySalesRate') {
      this.setData({
        deliverySalesRate: value,
        offlineSalesRate: this.getComplementRate(value),
      })
      return
    }

    this.setData({
      [field]: value,
    })
  },

  onCalculate() {
    if (this.data.activeModule === 'cost') {
      this.calculateCost()
      return
    }

    if (this.data.activeModule === 'breakEven') {
      this.calculateBreakEven()
      return
    }

    this.calculateAnalysis()
  },

  calculateCost() {
    const rentStartupCost = this.getNumber('monthlyRent') * this.getNumber('rentPayMonths') + this.getNumber('rentDeposit')
    const items = [
      ['房租启动', rentStartupCost],
      ['转让费用', this.getNumber('transferFee')],
      ['加盟学习', this.getNumber('franchiseFee')],
      ['装修广告', this.getNumber('decorationAdCost')],
      ['设备费用', this.getNumber('equipmentCost')],
      ['首批物料', this.getNumber('openingStock')],
    ]
    const total = items.reduce((sum, item) => sum + item[1], 0)

    if (!total) {
      this.showToast('请填写至少一项建店成本')
      return
    }

    const rentRate = total ? this.formatPercent(rentStartupCost / total * 100) : '--'
    const entryCost = this.getNumber('transferFee') + this.getNumber('franchiseFee')
    const buildCost = this.getNumber('decorationAdCost') + this.getNumber('equipmentCost')

    this.setData({
      hasResult: true,
      result: {
        primaryLabel: '建店总成本',
        primaryValue: this.formatWan(total),
        badge: rentRate === '--' ? '已估算' : `房租 ${rentRate}`,
        rows: [
          { label: '房租启动成本', value: this.formatWan(rentStartupCost) },
          { label: '转让/加盟小计', value: this.formatWan(entryCost) },
          { label: '装修设备小计', value: this.formatWan(buildCost) },
          { label: '首批物料', value: this.formatWan(this.getNumber('openingStock')) },
          { label: '建议安全预算', value: this.formatWan(total * 1.1) },
        ],
        tip: '建店成本已按“月租 × 几个月一付 + 押金 + 各项杂费”估算，建议额外预留 10%-15% 应对施工延期和试营业波动。',
      },
    })
  },

  calculateBreakEven() {
    const offlineGrossMargin = this.getNumber('offlineGrossMarginRate') / 100
    const deliveryGrossMargin = this.getNumber('deliveryGrossMarginRate') / 100
    const offlineSalesRate = this.getNumber('offlineSalesRate')
    const deliverySalesRate = this.getNumber('deliverySalesRate')
    const salesRateTotal = offlineSalesRate + deliverySalesRate
    const fixedCost = this.getNumber('fixedRent') + this.getNumber('fixedLabor') + this.getNumber('fixedUtilities') + this.getNumber('fixedOther')
    const blendedGrossMargin = offlineGrossMargin * offlineSalesRate / 100 + deliveryGrossMargin * deliverySalesRate / 100

    if (!fixedCost || blendedGrossMargin <= 0) {
      this.showToast('请填写毛利率、销售占比和固定成本')
      return
    }

    if (Math.abs(salesRateTotal - 100) > 0.001) {
      this.showToast('线下和外卖销售占比合计需为 100%')
      return
    }

    const breakEvenRevenue = fixedCost / blendedGrossMargin
    const safetyRevenue = breakEvenRevenue * 1.1
    const extraProfitPerWan = 10000 * blendedGrossMargin
    const offlineRevenue = breakEvenRevenue * offlineSalesRate / 100
    const deliveryRevenue = breakEvenRevenue * deliverySalesRate / 100
    const blendedGrossMarginPercent = blendedGrossMargin * 100
    const marginText = this.formatPercent(blendedGrossMarginPercent)
    const notice = blendedGrossMarginPercent < 20
      ? `综合毛利率只有 ${marginText}，保本营业额会被放大；如果你想表达 50%，这里要填 50。`
      : ''

    this.setData({
      hasResult: true,
      result: {
        primaryLabel: '保本营业额',
        primaryValue: this.formatMoney(breakEvenRevenue),
        badge: '保本线',
        notice,
        rows: [
          { label: '月固定成本', value: this.formatMoney(fixedCost) },
          { label: '综合毛利率', value: marginText },
          { label: '保本公式', value: `${this.formatMoney(fixedCost)} ÷ ${marginText}` },
          { label: '低于保本营业额', value: '通常亏损' },
          { label: '建议安全营业额', value: this.formatMoney(safetyRevenue) },
          { label: '线下需贡献', value: this.formatMoney(offlineRevenue) },
          { label: '外卖需贡献', value: this.formatMoney(deliveryRevenue) },
          { label: '月营业额超过保本线后，每多卖 1 万', value: `约多赚 ${this.formatMoney(extraProfitPerWan)}` },
        ],
        tip: `保本营业额 = 月固定成本 ÷ 综合毛利率。按当前数据，月营业额做到 ${this.formatMoney(breakEvenRevenue)} 左右才是不赚不亏，超过保本线的部分会按 ${marginText} 贡献利润。`,
      },
    })
  },

  calculateAnalysis() {
    const revenue = this.getNumber('monthlyRevenue')
    const food = this.getNumber('foodCost')
    const labor = this.getNumber('laborCost')
    const rent = this.getNumber('rentCost')
    const platform = this.getNumber('platformCost')
    const utilities = this.getNumber('utilityCost')
    const other = this.getNumber('otherCost')
    const totalCost = food + labor + rent + platform + utilities + other
    const profit = revenue - totalCost

    if (!revenue) {
      this.showToast('请填写月营业额')
      return
    }

    const profitRate = profit / revenue * 100
    const foodRate = food / revenue * 100
    const laborRate = labor / revenue * 100
    const rentRate = rent / revenue * 100
    const health = this.getHealthLabel(profitRate)

    this.setData({
      hasResult: true,
      result: {
        primaryLabel: '月净利润',
        primaryValue: this.formatMoney(profit),
        badge: health,
        rows: [
          { label: '净利率', value: this.formatPercent(profitRate) },
          { label: '食材成本率', value: this.formatPercent(foodRate) },
          { label: '人工成本率', value: this.formatPercent(laborRate) },
          { label: '房租占比', value: this.formatPercent(rentRate) },
        ],
        tip: this.getAnalysisTip(profitRate, foodRate, laborRate, rentRate),
      },
    })
  },

  getNumber(field) {
    return Number(this.data[field] || 0)
  },

  getComplementRate(value) {
    if (value === '') return ''

    const rate = Number(value)

    if (Number.isNaN(rate)) return ''

    return String(Math.max(0, 100 - rate))
  },

  getHealthLabel(profitRate) {
    if (profitRate >= 15) return '经营健康'
    if (profitRate >= 5) return '有利润'
    if (profitRate >= 0) return '微利'
    return '亏损'
  },

  getAnalysisTip(profitRate, foodRate, laborRate, rentRate) {
    if (profitRate < 0) return '当前为亏损状态，优先检查食材、人工、房租和平台费用是否过高。'
    if (foodRate > 38) return '食材成本率偏高，可以检查菜单定价、损耗和采购价格。'
    if (laborRate > 25) return '人工占比偏高，可以检查排班效率和高峰时段配置。'
    if (rentRate > 15) return '房租占比偏高，需要更谨慎评估客流和翻台效率。'
    return '成本结构相对稳，建议继续观察客流、复购和单品毛利。'
  },

  getEmptyResult(module) {
    if (module === 'breakEven') {
      return {
        primaryLabel: '保本营业额',
        primaryValue: '--',
        badge: '待计算',
        notice: '',
        rows: [],
        tip: '填好数据后，这里会显示保本营业额、亏损线和综合毛利率。',
      }
    }

    if (module === 'analysis') {
      return {
        primaryLabel: '月净利润',
        primaryValue: '--',
        badge: '待计算',
        notice: '',
        rows: [],
        tip: '填好数据后，这里会显示经营健康度。',
      }
    }

    return {
      primaryLabel: '预计投入',
      primaryValue: '--',
      badge: '待计算',
      notice: '',
      rows: [],
      tip: '填好数据后，这里会显示关键指标。',
    }
  },

  formatMoney(value) {
    if (Math.abs(value) >= 10000) {
      return `${(value / 10000).toFixed(2)} 万`
    }

    return `${value.toFixed(0)} 元`
  },

  formatWan(value) {
    return `${value.toFixed(2)} 万`
  },

  formatPercent(value) {
    if (!Number.isFinite(value)) return '--'
    return `${value.toFixed(1).replace(/\.0$/, '')}%`
  },

  showToast(title) {
    wx.showToast({
      title,
      icon: 'none',
    })
  },
})
