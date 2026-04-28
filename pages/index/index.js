// index.js
const { hotTools, topicCards } = require('../../utils/tool-catalog')

Page({
  data: {
    pressedKey: '',
    quickTags: ['图片', '计算', '生活健康', '比价', '记账', '房贷', '星座'],
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

  onToolTap(event) {
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

  onShareAppMessage() {
    return {
      title: '日常要用的小工具，这里基本齐了',
      path: '/pages/index/index',
    }
  },

  onShareTimeline() {
    return {
      title: '日常要用的小工具，这里基本齐了',
      query: '',
    }
  },
})
