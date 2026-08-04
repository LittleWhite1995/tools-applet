const { moderateImages } = require('./image-moderation')

const DEFAULT_SIZE_TYPE = ['original']
const DEFAULT_SOURCE_TYPE = ['album', 'camera']

const getErrorMessage = (error) => String(
  error && (error.errMsg || error.message) || '',
).toLowerCase()

const getChooseImageErrorMessage = (error) => {
  const errMsg = getErrorMessage(error)

  if (errMsg.includes('cancel')) return ''

  if (
    errMsg.includes('privacy api banned') ||
    errMsg.includes('privacy interface is banned') ||
    errMsg.includes('api scope is not declared in the privacy agreement') ||
    errMsg.includes('interface is not declared in the privacy agreement')
  ) {
    return '小程序隐私指引未声明图片选择权限'
  }

  if (
    errMsg.includes('privacy permission is not authorized') ||
    errMsg.includes('require privacy authorize')
  ) {
    return '请先同意小程序隐私保护指引'
  }

  if (
    errMsg.includes('permission') ||
    errMsg.includes('auth') ||
    errMsg.includes('deny') ||
    errMsg.includes('denied')
  ) {
    return '相册或相机权限未开启'
  }

  if (
    errMsg.includes('system') ||
    errMsg.includes('camera') ||
    errMsg.includes('album')
  ) {
    return '系统暂时无法打开相册或相机，请重试'
  }

  return '选择图片失败，请重试'
}

const showError = (title) => {
  wx.showToast({
    title,
    icon: 'none',
  })
}

const handleChooseFailure = (error, resolve) => {
  const userMessage = getChooseImageErrorMessage(error)

  if (userMessage) {
    console.error('[image-picker] chooseMedia failed', error)
    showError(userMessage)
  }

  resolve([])
}

const moderateSelectedFiles = (files, resolve, options = {}) => {
  const showProgress = Boolean(options.showProgress && files.length > 1)

  wx.showLoading({
    title: showProgress ? `图片内容安全检测 0/${files.length}` : '图片内容安全检测',
    mask: true,
  })

  moderateImages(files, {
    timeout: options.timeout,
    onProgress: showProgress
      ? (completed, total) => {
        wx.showLoading({
          title: `图片内容安全检测 ${completed}/${total}`,
          mask: true,
        })
      }
      : null,
  })
    .then(() => {
      wx.hideLoading()
      resolve(files)
    })
    .catch((error) => {
      wx.hideLoading()

      if (!error || error.code !== 'unsafe_image') {
        console.error('[image-picker] image moderation failed', error)
        showError('图片安全检测失败，请检查网络后重试')
        resolve([])
        return
      }

      showError('图片未通过安全检测，请更换图片')
      resolve([])
    })
}

const chooseImages = (options = {}) => new Promise((resolve) => {
  const count = Number.isInteger(options.count) && options.count > 0 ? options.count : 1
  const sizeType = Array.isArray(options.sizeType) && options.sizeType.length
    ? options.sizeType
    : DEFAULT_SIZE_TYPE
  const sourceType = Array.isArray(options.sourceType) && options.sourceType.length
    ? options.sourceType
    : DEFAULT_SOURCE_TYPE

  try {
    wx.chooseMedia({
      count,
      mediaType: ['image'],
      sizeType,
      sourceType,
      success: (res) => {
        const files = res && Array.isArray(res.tempFiles) ? res.tempFiles : []

        if (!files.length) {
          showError('未获取到图片，请重试')
          resolve([])
          return
        }

        moderateSelectedFiles(files, resolve, options.moderation)
      },
      fail: (error) => handleChooseFailure(error, resolve),
    })
  } catch (error) {
    handleChooseFailure(error, resolve)
  }
})

module.exports = {
  chooseImages,
}
