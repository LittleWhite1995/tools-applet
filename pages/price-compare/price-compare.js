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

const PRICE_EPSILON = 0.000001

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
    resultTitle: '至少填写 2 个商品的价格和规格',
    resultSummary: '',
    resultRows: [
      { label: '最低单价', value: '--' },
      { label: '相比第二名', value: '--' },
    ],
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
    const itemsWithName = sourceItems
      .map((item) => this.normalizeItem(item, mode))
      .map((item, index) => ({
        ...item,
        itemNumber: index + 1,
        displayName: item.name || `第 ${index + 1} 个商品`,
      }))
    const validItems = itemsWithName.filter((item) => item.hasValid)
    const rankedItems = [...validItems].sort((a, b) => a.unitPrice - b.unitPrice)
    const bestItem = rankedItems[0]
    const secondItem = rankedItems[1]
    const hasResult = validItems.length >= 2
    const bestPrice = bestItem ? bestItem.unitPrice : 0
    const tiedBestCount = hasResult
      ? validItems.filter((item) => Math.abs(item.unitPrice - bestPrice) < PRICE_EPSILON).length
      : 0
    const secondDiff = hasResult && secondItem
      ? secondItem.unitPrice - bestPrice
      : 0
    const secondDiffPercent = hasResult && bestPrice > 0
      ? secondDiff / bestPrice * 100
      : 0
    const advantageText = this.getAdvantageText(secondDiff, secondDiffPercent, mode.unitTargetText)
    const items = itemsWithName.map((item) => {
      const isBest = hasResult && item.hasValid && Math.abs(item.unitPrice - bestPrice) < PRICE_EPSILON
      let savingText = ''

      if (isBest) {
        savingText = tiedBestCount > 1 ? '并列最低' : '最划算'
      } else if (hasResult && item.hasValid) {
        const percent = (item.unitPrice / bestPrice - 1) * 100
        savingText = `贵 ${formatNumber(percent, percent >= 10 ? 0 : 1)}%`
      }

      return {
        ...item,
        isBest,
        savingText,
      }
    })

    return {
      activeMode,
      unitOptions: mode.units,
      unitTargetText: mode.unitTargetText,
      items,
      comparedCount: validItems.length,
      hasResult,
      resultTitle: this.getResultTitle(hasResult, bestItem, tiedBestCount),
      resultSummary: hasResult ? advantageText : '',
      resultRows: [
        {
          label: '最低单价',
          value: hasResult ? `${formatPrice(bestItem.unitPrice)} ${mode.unitTargetText}` : '--',
        },
        {
          label: '相比第二名',
          value: hasResult ? advantageText : '--',
        },
      ],
    }
  },

  getAdvantageText(diffPrice, diffPercent, unitTargetText) {
    if (Math.abs(diffPrice) < PRICE_EPSILON) {
      return '和第二名单价相同'
    }

    const percentText = formatNumber(diffPercent, diffPercent >= 10 ? 0 : 1)

    return `便宜 ${formatPrice(diffPrice)} ${unitTargetText}，约 ${percentText}%`
  },

  getResultTitle(hasResult, bestItem, tiedBestCount) {
    if (!hasResult) return '至少填写 2 个商品的价格和规格'
    if (tiedBestCount > 1) return `${tiedBestCount} 个商品单价持平`

    return `建议选第 ${bestItem.itemNumber} 个商品`
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
