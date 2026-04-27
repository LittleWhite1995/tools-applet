const compareModes = {
  weight: {
    label: '重量',
    unitTargetText: '元 / 100g',
    displayAmount: 100,
    displayUnit: 'g',
    baseUnit: 'g',
    units: [
      { label: '克', symbol: 'g', factor: 1 },
      { label: '千克', symbol: 'kg', factor: 1000 },
      { label: '斤', symbol: '斤', factor: 500 },
    ],
  },
  volume: {
    label: '容量',
    unitTargetText: '元 / 100ml',
    displayAmount: 100,
    displayUnit: 'ml',
    baseUnit: 'ml',
    units: [
      { label: '毫升', symbol: 'ml', factor: 1 },
      { label: '升', symbol: 'L', factor: 1000 },
    ],
  },
  count: {
    label: '数量',
    unitTargetText: '元 / 件',
    displayAmount: 1,
    displayUnit: '件',
    baseUnit: '件',
    units: [
      { label: '件', symbol: '件', factor: 1 },
      { label: '个', symbol: '个', factor: 1 },
      { label: '包', symbol: '包', factor: 1 },
      { label: '片', symbol: '片', factor: 1 },
    ],
  },
}

const modeTabs = Object.keys(compareModes).map((value) => ({
  value,
  label: compareModes[value].label,
}))

const formatNumber = (value, digits = 2) => {
  if (!Number.isFinite(value)) return '--'

  return String(Number(value.toFixed(digits)))
}

const formatPrice = (value) => {
  if (!Number.isFinite(value)) return '--'

  if (value >= 100) return formatNumber(value, 2)
  if (value >= 10) return formatNumber(value, 3)

  return formatNumber(value, 4)
}

const getUnitOptions = (mode) => compareModes[mode].units

const createItem = (mode = 'weight') => {
  const unit = getUnitOptions(mode)[0]

  return {
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    price: '',
    amount: '',
    unitIndex: 0,
    unitName: unit.label,
    unitSymbol: unit.symbol,
    unitPrice: 0,
    unitPriceText: '--',
    amountText: '填写后自动换算',
    savingText: '',
    hasValid: false,
    isBest: false,
  }
}

const getInitialItems = () => [
  createItem(),
  createItem(),
]

Page({
  data: {
    modeTabs,
    activeMode: 'weight',
    unitOptions: getUnitOptions('weight'),
    unitTargetText: compareModes.weight.unitTargetText,
    items: getInitialItems(),
    comparedCount: 0,
    hasResult: false,
    bestName: '--',
    bestPriceText: '--',
    resultDesc: '至少填写 2 个商品的价格和规格，就能看出哪个更划算。',
  },

  onModeTap(event) {
    const { value } = event.currentTarget.dataset

    if (!value || value === this.data.activeMode) return

    const mode = compareModes[value]
    const firstUnit = mode.units[0]
    const items = this.data.items.map((item) => ({
      ...item,
      unitIndex: 0,
      unitName: firstUnit.label,
      unitSymbol: firstUnit.symbol,
    }))

    this.setData(this.getCompareState(value, items))
  },

  onNameInput(event) {
    this.updateItem(event.currentTarget.dataset.id, {
      name: event.detail.value,
    })
  },

  onPriceInput(event) {
    this.updateItem(event.currentTarget.dataset.id, {
      price: event.detail.value,
    })
  },

  onAmountInput(event) {
    this.updateItem(event.currentTarget.dataset.id, {
      amount: event.detail.value,
    })
  },

  onUnitChange(event) {
    const unitIndex = Number(event.detail.value)
    const unit = this.data.unitOptions[unitIndex]

    this.updateItem(event.currentTarget.dataset.id, {
      unitIndex,
      unitName: unit.label,
      unitSymbol: unit.symbol,
    })
  },

  updateItem(id, patch) {
    const items = this.data.items.map((item) => (
      item.id === id ? { ...item, ...patch } : item
    ))

    this.setData(this.getCompareState(this.data.activeMode, items))
  },

  onAddItem() {
    if (this.data.items.length >= 6) {
      wx.showToast({
        title: '最多比较 6 个商品',
        icon: 'none',
      })
      return
    }

    const items = [
      ...this.data.items,
      createItem(this.data.activeMode),
    ]

    this.setData(this.getCompareState(this.data.activeMode, items))
  },

  onRemoveItem(event) {
    if (this.data.items.length <= 2) {
      wx.showToast({
        title: '至少保留 2 个商品',
        icon: 'none',
      })
      return
    }

    const { id } = event.currentTarget.dataset
    const items = this.data.items.filter((item) => item.id !== id)

    this.setData(this.getCompareState(this.data.activeMode, items))
  },

  onReset() {
    this.setData(this.getCompareState(this.data.activeMode, getInitialItems()))
  },

  getCompareState(activeMode, sourceItems) {
    const mode = compareModes[activeMode]
    const itemsWithPrice = sourceItems.map((item) => this.normalizeItem(item, mode))
    const validItems = itemsWithPrice.filter((item) => item.hasValid)
    const bestPrice = validItems.reduce((min, item) => (
      !min || item.unitPrice < min ? item.unitPrice : min
    ), 0)
    const bestItem = validItems.find((item) => item.unitPrice === bestPrice)
    const hasResult = validItems.length >= 2
    const items = itemsWithPrice.map((item, index) => {
      const displayName = item.name || `第 ${index + 1} 个商品`
      const isBest = hasResult && item.hasValid && item.id === bestItem.id
      let savingText = ''

      if (isBest) {
        savingText = '最划算'
      } else if (hasResult && item.hasValid) {
        const percent = (item.unitPrice / bestPrice - 1) * 100
        savingText = `贵 ${formatNumber(percent, percent >= 10 ? 0 : 1)}%`
      }

      return {
        ...item,
        displayName,
        isBest,
        savingText,
      }
    })
    const bestDisplayName = hasResult
      ? items.find((item) => item.id === bestItem.id).displayName
      : '--'

    return {
      activeMode,
      unitOptions: mode.units,
      unitTargetText: mode.unitTargetText,
      items,
      comparedCount: validItems.length,
      hasResult,
      bestName: bestDisplayName,
      bestPriceText: hasResult ? `${formatPrice(bestItem.unitPrice)} ${mode.unitTargetText}` : '--',
      resultDesc: hasResult
        ? `已比较 ${validItems.length} 个商品，单价最低的是 ${bestDisplayName}。`
        : '至少填写 2 个商品的价格和规格，就能看出哪个更划算。',
    }
  },

  normalizeItem(item, mode) {
    const unit = mode.units[item.unitIndex] || mode.units[0]
    const price = Number(item.price)
    const amount = Number(item.amount)
    const baseAmount = amount * unit.factor
    const hasValid = price > 0 && amount > 0 && Number.isFinite(price) && Number.isFinite(amount)
    const unitPrice = hasValid ? price / baseAmount * mode.displayAmount : 0

    return {
      ...item,
      unitName: unit.label,
      unitSymbol: unit.symbol,
      unitPrice,
      unitPriceText: hasValid ? formatPrice(unitPrice) : '--',
      amountText: hasValid
        ? `折合 ${formatNumber(baseAmount, 2)} ${mode.baseUnit}`
        : '填写后自动换算',
      hasValid,
      isBest: false,
      savingText: '',
    }
  },
})
