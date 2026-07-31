const { searchTools } = require('../../utils/tool-catalog')

const SEARCH_GROUP_MAP = {
  restaurant: '经营测算',
  mortgage: '财务社保',
  salary: '财务社保',
  'retirement-pension': '财务社保',
  'retirement-age': '财务社保',
  compound: '理财计算',
  'price-compare': '日常计算',
  converter: '日常计算',
  'date-diff': '日常计算',
  'shelf-life': '日常计算',
  relationship: '生活辅助',
  'choice-helper': '生活辅助',
  'poker-ledger': '棋牌记账',
}

const SEARCH_GROUP_ORDER = [
  '财务社保',
  '日常计算',
  '图片处理',
  '视频处理',
  '运动健康',
  '生活辅助',
  '理财计算',
  '经营测算',
  '棋牌记账',
  '生活娱乐',
  '游戏工具',
  '民生服务',
  '使用指南',
]

const SEARCH_ITEM_ORDER = {
  'national-service-platform': 0,
  'social-security-card': 1,
  'service-12333': 2,
}

function getDisplayGroup(item) {
  return SEARCH_GROUP_MAP[item.id] || item.category || '其他工具'
}

function getGroupOrder(category) {
  const index = SEARCH_GROUP_ORDER.indexOf(category)

  return index === -1 ? SEARCH_GROUP_ORDER.length : index
}

function groupResults(results) {
  const groupMap = {}
  const groups = []

  results.forEach((item) => {
    const category = getDisplayGroup(item)

    if (!groupMap[category]) {
      groupMap[category] = {
        category,
        count: 0,
        items: [],
      }
      groups.push(groupMap[category])
    }

    groupMap[category].items.push(item)
    groupMap[category].count += 1
  })

  groups.forEach((group) => {
    group.items.sort((left, right) => {
      const leftOrder = SEARCH_ITEM_ORDER[left.id] ?? 100
      const rightOrder = SEARCH_ITEM_ORDER[right.id] ?? 100

      return leftOrder - rightOrder
    })
  })

  return groups.sort((left, right) => getGroupOrder(left.category) - getGroupOrder(right.category))
}

Page({
  data: {
    inputValue: '',
    queryText: '',
    pressedKey: '',
    results: [],
    groupedResults: [],
    suggestions: ['社保', '图片处理', '运动健康', '餐饮开店'],
  },

  onLoad(options) {
    const keyword = decodeURIComponent(options.keyword || '')

    this.setSearchKeyword(keyword)
  },

  setSearchKeyword(keyword) {
    const queryText = (keyword || '').trim()
    const results = searchTools(queryText)

    this.setData({
      inputValue: queryText,
      queryText,
      results,
      groupedResults: groupResults(results),
    })
  },

  onSearchChange(event) {
    const queryText = event.detail.value || ''
    const results = searchTools(queryText)

    this.setData({
      queryText,
      results,
      groupedResults: groupResults(results),
    })
  },

  onSearchSubmit(event) {
    this.setSearchKeyword(event.detail.value)
  },

  onSuggestionTap(event) {
    const { keyword } = event.currentTarget.dataset

    this.setSearchKeyword(keyword)
  },

  onPressStart(event) {
    const { pressKey } = event.currentTarget.dataset

    if (!pressKey) return

    this.setData({
      pressedKey: pressKey,
    })
  },

  onPressEnd() {
    if (!this.data.pressedKey) return

    this.setData({
      pressedKey: '',
    })
  },

  openMiniProgram({ name, shortLink }) {
    if (!shortLink) {
      wx.showToast({
        title: `${name} 还没配置好`,
        icon: 'none',
      })
      return
    }

    wx.navigateToMiniProgram({
      shortLink,
      fail: (error) => {
        if (String(error.errMsg || '').includes('cancel')) return

        wx.showToast({
          title: '跳转失败，请稍后再试',
          icon: 'none',
        })
      },
    })
  },

  onResultTap(event) {
    const { name, path, shortLink } = event.currentTarget.dataset

    this.setData({
      pressedKey: '',
    }, () => {
      if (shortLink) {
        this.openMiniProgram({ name, shortLink })
        return
      }

      if (path) {
        wx.navigateTo({
          url: path,
        })
        return
      }

      wx.showToast({
        title: `${name} 即将上线`,
        icon: 'none',
      })
    })
  },
})
