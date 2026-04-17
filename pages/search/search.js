const { searchTools } = require('../../utils/tool-catalog')

Page({
  data: {
    inputValue: '',
    queryText: '',
    pressedKey: '',
    results: [],
    suggestions: ['图片处理', '二维码', '生活计算', '餐饮开店'],
  },

  onLoad(options) {
    const keyword = decodeURIComponent(options.keyword || '')

    this.setSearchKeyword(keyword)
  },

  setSearchKeyword(keyword) {
    const queryText = (keyword || '').trim()

    this.setData({
      inputValue: queryText,
      queryText,
      results: searchTools(queryText),
    })
  },

  onSearchChange(event) {
    const queryText = event.detail.value || ''

    this.setData({
      queryText,
      results: searchTools(queryText),
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

  onResultTap(event) {
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
