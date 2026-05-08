const loanTypes = [
  { label: '商业贷', value: 'commercial' },
  { label: '公积金', value: 'fund' },
  { label: '组合贷', value: 'combined' },
]

const repayTypes = [
  { label: '等额本息', value: 'interest' },
  { label: '等额本金', value: 'principal' },
]

const quickYears = ['10', '20', '30']
const downPaymentOptions = ['20', '30', '40', '50']

Page({
  data: {
    loanTypes,
    repayTypes,
    quickYears,
    downPaymentOptions,
    loanType: 'commercial',
    repayType: 'interest',
    houseTotalPrice: '',
    downPaymentRate: '30',
    helperLoanAmount: '',
    commercialAmount: '',
    fundAmount: '',
    years: '',
    commercialRate: '3.2',
    fundRate: '2.6',
    hasResult: false,
    result: {
      firstMonth: '--',
      totalInterest: '--',
      totalRepayment: '--',
      monthlyDecrease: '',
      months: 0,
    },
    schedule: [],
  },

  onLoanTypeTap(event) {
    const { value } = event.currentTarget.dataset
    const data = { loanType: value }

    if (value === 'commercial') {
      data.fundAmount = ''
    }

    if (value === 'fund') {
      data.commercialAmount = ''
    }

    this.setData(data, () => {
      if (this.data.helperLoanAmount) {
        this.syncHelperLoanAmount()
      }
      this.clearResult()
    })
  },

  onRepayTypeTap(event) {
    this.setData({
      repayType: event.currentTarget.dataset.value,
    }, () => {
      this.clearResult()
    })
  },

  onInput(event) {
    const { field } = event.currentTarget.dataset
    const value = event.detail.value

    if (field === 'commercialAmount' || field === 'fundAmount') {
      this.setData({
        [field]: value,
      }, () => {
        this.updateHouseTotalFromLoan(field)
        this.clearResult()
      })
      return
    }

    this.setData({
      [field]: value,
    }, () => {
      this.clearResult()
    })
  },

  onQuickYearTap(event) {
    this.setData({
      years: event.currentTarget.dataset.year,
    }, () => {
      this.clearResult()
    })
  },

  onDownPaymentTap(event) {
    const rate = event.currentTarget.dataset.rate

    this.setData({
      downPaymentRate: rate,
    }, () => {
      this.updateHelperLoanAmount()
      this.clearResult()
    })
  },

  onDownPaymentInput(event) {
    this.setData({
      downPaymentRate: event.detail.value,
    }, () => {
      this.updateHelperLoanAmount()
      this.clearResult()
    })
  },

  onHouseTotalInput(event) {
    this.setData({
      houseTotalPrice: event.detail.value,
    }, () => {
      this.updateHelperLoanAmount()
      this.clearResult()
    })
  },

  updateHelperLoanAmount() {
    const totalPrice = Number(this.data.houseTotalPrice)
    const downPaymentRate = Number(this.data.downPaymentRate)

    if (!totalPrice || totalPrice <= 0 || downPaymentRate < 0 || downPaymentRate >= 100) {
      this.setData({
        helperLoanAmount: '',
      })
      return
    }

    const loanAmount = totalPrice * (100 - downPaymentRate) / 100
    const helperLoanAmount = this.trimNumber(loanAmount)
    this.setData({
      helperLoanAmount,
    }, () => {
      this.syncHelperLoanAmount()
    })
  },

  syncHelperLoanAmount() {
    const { helperLoanAmount } = this.data

    if (!helperLoanAmount) {
      return
    }

    const patch = {}

    if (this.data.loanType === 'fund') {
      patch.fundAmount = helperLoanAmount
    } else {
      patch.commercialAmount = helperLoanAmount
    }

    this.setData(patch)
  },

  updateHouseTotalFromLoan(field) {
    const downPaymentRate = Number(this.data.downPaymentRate)

    if (downPaymentRate < 0 || downPaymentRate >= 100) {
      return
    }

    const commercialAmount = Number(this.data.commercialAmount || 0)
    const fundAmount = Number(this.data.fundAmount || 0)
    const loanAmount = this.data.loanType === 'combined'
      ? commercialAmount + fundAmount
      : Number(this.data[field] || 0)

    if (!loanAmount || loanAmount <= 0) {
      return
    }

    const totalPrice = loanAmount / ((100 - downPaymentRate) / 100)

    this.setData({
      houseTotalPrice: this.trimNumber(totalPrice),
      helperLoanAmount: this.trimNumber(loanAmount),
    })
  },

  onCalculate() {
    const commercialAmount = Number(this.data.commercialAmount || 0) * 10000
    const fundAmount = Number(this.data.fundAmount || 0) * 10000
    const years = Number(this.data.years)
    const commercialRate = Number(this.data.commercialRate)
    const fundRate = Number(this.data.fundRate)
    const months = years * 12
    const totalPrincipal = commercialAmount + fundAmount

    if (!totalPrincipal) {
      wx.showToast({
        title: '请填写贷款金额',
        icon: 'none',
      })
      return
    }

    if (!years || years < 1 || years > 40) {
      wx.showToast({
        title: '贷款年限需为 1-40 年',
        icon: 'none',
      })
      return
    }

    if (commercialAmount > 0 && (commercialRate < 0 || Number.isNaN(commercialRate))) {
      wx.showToast({
        title: '请填写商业贷利率',
        icon: 'none',
      })
      return
    }

    if (fundAmount > 0 && (fundRate < 0 || Number.isNaN(fundRate))) {
      wx.showToast({
        title: '请填写公积金利率',
        icon: 'none',
      })
      return
    }

    const loans = [
      {
        amount: commercialAmount,
        annualRate: commercialRate,
      },
      {
        amount: fundAmount,
        annualRate: fundRate,
      },
    ].filter((item) => item.amount > 0)

    const parts = loans.map((item) => this.calculateLoan(item.amount, item.annualRate, months, this.data.repayType))
    const summary = this.mergeLoanParts(parts, months)

    this.setData({
      hasResult: true,
      result: {
        firstMonth: this.formatMoney(summary.firstMonth),
        totalInterest: this.formatMoney(summary.totalInterest),
        totalRepayment: this.formatMoney(summary.totalRepayment),
        monthlyDecrease: summary.monthlyDecrease > 0 ? this.formatMoney(summary.monthlyDecrease) : '',
        months,
      },
      schedule: summary.schedule.map((item) => ({
        period: item.period,
        payment: this.formatMoney(item.payment),
        principal: this.formatMoney(item.principal),
        interest: this.formatMoney(item.interest),
      })),
    })
  },

  calculateLoan(principal, annualRate, months, repayType) {
    const monthlyRate = annualRate / 100 / 12

    if (repayType === 'principal') {
      return this.calculateEqualPrincipal(principal, monthlyRate, months)
    }

    return this.calculateEqualInterest(principal, monthlyRate, months)
  },

  calculateEqualInterest(principal, monthlyRate, months) {
    if (monthlyRate === 0) {
      const monthlyPayment = principal / months

      return {
        firstMonth: monthlyPayment,
        totalInterest: 0,
        totalRepayment: principal,
        monthlyDecrease: 0,
        schedule: this.buildFlatSchedule(monthlyPayment, principal, months),
      }
    }

    const pow = Math.pow(1 + monthlyRate, months)
    const monthlyPayment = principal * monthlyRate * pow / (pow - 1)
    const totalRepayment = monthlyPayment * months
    const totalInterest = totalRepayment - principal
    const schedule = []
    let remaining = principal

    for (let index = 1; index <= months; index += 1) {
      const interest = remaining * monthlyRate
      const principalPaid = monthlyPayment - interest
      remaining -= principalPaid
      schedule.push({
        period: index,
        payment: monthlyPayment,
        principal: principalPaid,
        interest,
      })
    }

    return {
      firstMonth: monthlyPayment,
      totalInterest,
      totalRepayment,
      monthlyDecrease: 0,
      schedule,
    }
  },

  calculateEqualPrincipal(principal, monthlyRate, months) {
    const principalPerMonth = principal / months
    const firstMonth = principalPerMonth + principal * monthlyRate
    const monthlyDecrease = principalPerMonth * monthlyRate
    const totalInterest = principal * monthlyRate * (months + 1) / 2
    const schedule = []

    for (let index = 1; index <= months; index += 1) {
      const remaining = principal - principalPerMonth * (index - 1)
      const interest = remaining * monthlyRate

      schedule.push({
        period: index,
        payment: principalPerMonth + interest,
        principal: principalPerMonth,
        interest,
      })
    }

    return {
      firstMonth,
      totalInterest,
      totalRepayment: principal + totalInterest,
      monthlyDecrease,
      schedule,
    }
  },

  buildFlatSchedule(monthlyPayment, principal, months) {
    const principalPerMonth = principal / months

    return Array.from({ length: months }, (_, index) => ({
      period: index + 1,
      payment: monthlyPayment,
      principal: principalPerMonth,
      interest: 0,
    }))
  },

  mergeLoanParts(parts, months) {
    const summary = parts.reduce((acc, item) => ({
      firstMonth: acc.firstMonth + item.firstMonth,
      totalInterest: acc.totalInterest + item.totalInterest,
      totalRepayment: acc.totalRepayment + item.totalRepayment,
      monthlyDecrease: acc.monthlyDecrease + item.monthlyDecrease,
    }), {
      firstMonth: 0,
      totalInterest: 0,
      totalRepayment: 0,
      monthlyDecrease: 0,
    })

    const schedule = Array.from({ length: months }, (_, index) => (
      parts.reduce((acc, item) => ({
        period: index + 1,
        payment: acc.payment + (item.schedule[index] ? item.schedule[index].payment : 0),
        principal: acc.principal + (item.schedule[index] ? item.schedule[index].principal : 0),
        interest: acc.interest + (item.schedule[index] ? item.schedule[index].interest : 0),
      }), {
        period: index + 1,
        payment: 0,
        principal: 0,
        interest: 0,
      })
    ))

    return {
      ...summary,
      schedule,
    }
  },

  formatMoney(value) {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(2)} 万`
    }

    return `${value.toFixed(2)} 元`
  },

  trimNumber(value) {
    return Number(value.toFixed(2)).toString()
  },

  clearResult() {
    this.setData({
      hasResult: false,
      result: {
        firstMonth: '--',
        totalInterest: '--',
        totalRepayment: '--',
        monthlyDecrease: '',
        months: 0,
      },
      schedule: [],
    })
  },

  onReset() {
    this.clearResult()
  },
})
