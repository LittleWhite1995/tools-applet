// index.js
const { hotTools, topicCards } = require('../../utils/tool-catalog')

Page({
  data: {
    pressedKey: '',
    quickTags: ['生活健康', '亲戚关系', '计算', '定投', '图片压缩'],
    hotTools,
    topicCards,
  },

  onSearchSubmit(event) {
    const keyword = (event.detail.value || '').trim()

    if (!keyword) {
      wx.showToast({
        title: '请输入关键词',
        icon: 'none',
      })
      return
    }

    this.openSearchPage(keyword)
  },

  onQuickTagTap(event) {
    const { keyword } = event.currentTarget.dataset

    this.openSearchPage(keyword)
  },

  onViewAllTools() {
    this.openSearchPage('')
  },

  openSearchPage(keyword) {
    wx.navigateTo({
      url: `/pages/search/search?keyword=${encodeURIComponent(keyword)}`,
    })
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

  onToolTap(event) {
    const { name, path } = event.currentTarget.dataset

    this.setData({
      pressedKey: '',
    }, () => {
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
