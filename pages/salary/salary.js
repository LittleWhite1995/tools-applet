const TAX_THRESHOLD = 5000

const taxBrackets = [
  { limit: 3000, rate: 0.03, deduction: 0 },
  { limit: 12000, rate: 0.1, deduction: 210 },
  { limit: 25000, rate: 0.2, deduction: 1410 },
  { limit: 35000, rate: 0.25, deduction: 2660 },
  { limit: 55000, rate: 0.3, deduction: 4410 },
  { limit: 80000, rate: 0.35, deduction: 7160 },
  { limit: Infinity, rate: 0.45, deduction: 15160 },
]

const defaultSocialItems = [
  { name: '养老保险', rate: '8', amount: '--' },
  { name: '医疗保险', rate: '2', amount: '--' },
  { name: '失业保险', rate: '0.5', amount: '--' },
  { name: '工伤保险', rate: '0', amount: '--', payer: '单位缴纳' },
  { name: '生育保险', rate: '0', amount: '--', payer: '单位缴纳' },
]

Page({
  data: {
    grossSalary: '',
    socialItems: defaultSocialItems,
    socialTotalRate: '10.5',
    fundRate: '7',
    specialDeduction: '',
    quickFundRates: ['5', '7', '12'],
    hasResult: false,
    result: {
      takeHome: '--',
      tax: '--',
      contribution: '--',
      social: '--',
      fund: '--',
      taxable: '--',
      netRate: '待计算',
    },
  },

  onInput(event) {
    const { field } = event.currentTarget.dataset

    this.setData({
      [field]: event.detail.value,
    }, () => {
      if (field === 'grossSalary') {
        this.updateSocialPreview()
      }
    })
  },

  onQuickFundTap(event) {
    this.setData({
      fundRate: event.currentTarget.dataset.rate,
    })
  },

  onSocialRateInput(event) {
    const { index } = event.currentTarget.dataset
    const activeIndex = Number(index)
    const socialItems = this.data.socialItems.map((item, itemIndex) => (
      itemIndex === activeIndex
        ? { ...item, rate: event.detail.value }
        : item
    ))

    this.setData({
      socialItems,
    }, () => {
      this.updateSocialPreview()
    })
  },

  onCalculate() {
    const grossSalary = Number(this.data.grossSalary)
    const socialRate = this.getSocialRateTotal()
    const fundRate = Number(this.data.fundRate || 0)
    const specialDeduction = Number(this.data.specialDeduction || 0)

    if (!grossSalary || grossSalary <= 0) {
      wx.showToast({
        title: '请填写税前月薪',
        icon: 'none',
      })
      return
    }

    if (socialRate < 0 || fundRate < 0 || specialDeduction < 0) {
      wx.showToast({
        title: '扣除项不能为负数',
        icon: 'none',
      })
      return
    }

    this.updateSocialPreview()

    const socialAmount = grossSalary * socialRate / 100
    const fundAmount = grossSalary * fundRate / 100
    const contribution = socialAmount + fundAmount
    const taxableIncome = Math.max(grossSalary - contribution - specialDeduction - TAX_THRESHOLD, 0)
    const tax = this.calculateTax(taxableIncome)
    const takeHome = Math.max(grossSalary - contribution - tax, 0)
    const netRate = `${Math.round(takeHome / grossSalary * 100)}% 到手`

    this.setData({
      hasResult: true,
      result: {
        takeHome: this.formatMoney(takeHome),
        tax: this.formatMoney(tax),
        contribution: this.formatMoney(contribution),
        social: this.formatMoney(socialAmount),
        fund: this.formatMoney(fundAmount),
        taxable: this.formatMoney(taxableIncome),
        netRate,
      },
    })
  },

  calculateTax(taxableIncome) {
    if (taxableIncome <= 0) return 0

    const bracket = taxBrackets.find((item) => taxableIncome <= item.limit)
    return Math.max(taxableIncome * bracket.rate - bracket.deduction, 0)
  },

  getSocialRateTotal() {
    return this.data.socialItems.reduce((total, item) => (
      total + Number(item.rate || 0)
    ), 0)
  },

  updateSocialPreview() {
    const grossSalary = Number(this.data.grossSalary || 0)
    const socialItems = this.data.socialItems.map((item) => {
      const rate = Number(item.rate || 0)
      const amount = grossSalary > 0 ? this.formatMoney(grossSalary * rate / 100) : '--'

      return {
        ...item,
        amount,
      }
    })
    const socialTotalRate = this.getSocialRateTotal().toFixed(1).replace(/\.0$/, '')

    this.setData({
      socialItems,
      socialTotalRate,
    })
  },

  formatMoney(value) {
    return `${value.toFixed(2)} 元`
  },

  onReset() {
    this.setData({
      hasResult: false,
      result: {
        takeHome: '--',
        tax: '--',
        contribution: '--',
        social: '--',
        fund: '--',
        taxable: '--',
        netRate: '待计算',
      },
    })
  },
})
