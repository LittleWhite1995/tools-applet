const templates = [
  {
    id: 'custom',
    title: '我命由我不由天',
    desc: '从空白开始自己填',
    options: [],
  },
  {
    id: 'meal',
    title: '今天吃什么',
    desc: '午饭晚饭都能用',
    options: ['麻辣烫', '盖饭', '粉面', '水饺', '炒饭', '黄焖鸡', '轻食', '汉堡'],
  },
  {
    id: 'drink',
    title: '喝什么',
    desc: '咖啡奶茶都可以',
    options: ['美式', '拿铁', '奶茶', '果茶', '气泡水', '豆浆', '酸奶', '柠檬水'],
  },
  {
    id: 'dessert',
    title: '下午茶吃什么',
    desc: '小点心快速决定',
    options: ['蛋挞', '面包', '蛋糕', '薯条', '鸡块', '水果杯', '饼干', '冰淇淋'],
  },
  {
    id: 'weekend',
    title: '周末做什么',
    desc: '宅家还是出门',
    options: ['睡觉', '看电影', '散步', '打游戏', '收拾房间', '去商场', '短途出门', '约朋友'],
  },
  {
    id: 'who',
    title: '谁来做',
    desc: '轮流也算答案',
    options: ['我来', '你来', '一起做', '轮流来', '今天先你', '今天先我'],
  },
  {
    id: 'movie',
    title: '看什么类型',
    desc: '先定类型再去选片',
    options: ['喜剧', '悬疑', '动作', '动画', '纪录片', '爱情', '科幻', '治愈'],
  },
]

const REEL_ITEM_HEIGHT = 96
const REEL_REPEAT_COUNT = 14
const REEL_TRANSITION_MS = 4200

const cloneTemplateOptions = (templateId) => {
  const target = templates.find((item) => item.id === templateId) || templates[0]

  return target.options.map((label, index) => ({
    id: `${target.id}_${index}`,
    label,
    builtIn: true,
  }))
}

const getTemplateMeta = (templateId) => templates.find((item) => item.id === templateId) || templates[0]

const createOption = (label) => ({
  id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  label,
  builtIn: false,
})

Page({
  data: {
    templates,
    activeTemplateId: templates[0].id,
    activeTemplateTitle: templates[0].title,
    activeTemplateDesc: templates[0].desc,
    optionInput: '',
    options: cloneTemplateOptions(templates[0].id),
    hasResult: false,
    isPicking: false,
    resultText: '',
    reelItems: [],
    reelOffset: 0,
    reelDuration: 0,
    selectedOptionId: '',
  },

  clearPickTimer() {
    if (this.pickTimer) {
      clearTimeout(this.pickTimer)
      this.pickTimer = null
    }
  },

  onUnload() {
    this.clearPickTimer()
  },

  resetPickState(extra = {}) {
    this.setData({
      hasResult: false,
      resultText: '',
      reelItems: [],
      reelOffset: 0,
      reelDuration: 0,
      selectedOptionId: '',
      ...extra,
    })
  },

  onTemplateTap(event) {
    const { id } = event.currentTarget.dataset

    if (!id || id === this.data.activeTemplateId || this.data.isPicking) return

    const target = getTemplateMeta(id)

    this.resetPickState({
      activeTemplateId: target.id,
      activeTemplateTitle: target.title,
      activeTemplateDesc: target.desc,
      optionInput: '',
      options: cloneTemplateOptions(target.id),
    })
  },

  onOptionInput(event) {
    this.setData({
      optionInput: event.detail.value || '',
    })
  },

  onAddOption() {
    const value = String(this.data.optionInput || '').trim()

    if (!value) {
      wx.showToast({
        title: '先输入一个选项',
        icon: 'none',
      })
      return
    }

    if (this.data.options.some((item) => item.label === value)) {
      wx.showToast({
        title: '这个选项已经有了',
        icon: 'none',
      })
      return
    }

    this.resetPickState({
      optionInput: '',
      options: [...this.data.options, createOption(value)],
    })
  },

  onRemoveOption(event) {
    if (this.data.isPicking) return

    const { id } = event.currentTarget.dataset
    const nextOptions = this.data.options.filter((item) => item.id !== id)

    this.resetPickState({
      options: nextOptions,
    })
  },

  onRestoreTemplate() {
    if (this.data.isPicking) return

    const target = getTemplateMeta(this.data.activeTemplateId)

    this.resetPickState({
      activeTemplateTitle: target.title,
      activeTemplateDesc: target.desc,
      optionInput: '',
      options: cloneTemplateOptions(target.id),
    })
  },

  buildReelData(options, finalIndex) {
    const reelItems = []

    for (let repeat = 0; repeat < REEL_REPEAT_COUNT; repeat += 1) {
      options.forEach((item) => {
        reelItems.push({
          id: `${item.id}_${repeat}`,
          label: item.label,
        })
      })
    }

    const finalSlotIndex = options.length * 4 + finalIndex
    const startSlotIndex = finalSlotIndex + options.length * 3

    return {
      reelItems,
      startOffset: -startSlotIndex * REEL_ITEM_HEIGHT,
      targetOffset: -finalSlotIndex * REEL_ITEM_HEIGHT,
    }
  },

  finishPick(selected, targetOffset) {
    this.clearPickTimer()

    this.setData({
      isPicking: false,
      hasResult: true,
      resultText: selected.label,
      reelOffset: targetOffset,
      reelDuration: 0,
      selectedOptionId: selected.id,
    })
  },

  onPick() {
    if (this.data.isPicking) return

    if (this.data.options.length < 2) {
      wx.showToast({
        title: '至少保留 2 个选项',
        icon: 'none',
      })
      return
    }

    const finalIndex = Math.floor(Math.random() * this.data.options.length)
    const finalOption = this.data.options[finalIndex]
    const { reelItems, startOffset, targetOffset } = this.buildReelData(this.data.options, finalIndex)

    this.clearPickTimer()

    this.setData({
      isPicking: true,
      hasResult: false,
      resultText: '',
      reelItems,
      reelOffset: startOffset,
      reelDuration: 0,
      selectedOptionId: '',
    })

    this.pickTimer = setTimeout(() => {
      this.setData({
        reelOffset: targetOffset,
        reelDuration: REEL_TRANSITION_MS,
      })

      this.pickTimer = setTimeout(() => {
        this.finishPick(finalOption, targetOffset)
      }, REEL_TRANSITION_MS)
    }, 60)
  },
})
