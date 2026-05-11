const ALBUM_SCOPE = 'scope.writePhotosAlbum'

const getErrMsg = (error) => String(error && error.errMsg || error && error.message || '')

const isSaveCancel = (error) => getErrMsg(error).toLowerCase().includes('cancel')

const getMediaName = (type) => (type === 'video' ? '视频' : '图片')

const isPrivacyBannedError = (error) => {
  const errMsg = getErrMsg(error).toLowerCase()

  return (
    errMsg.includes('privacy api banned') ||
    errMsg.includes('privacy interface is banned') ||
    errMsg.includes('api scope is not declared in the privacy agreement') ||
    errMsg.includes('interface is not declared in the privacy agreement')
  )
}

const isPrivacyUnauthorizedError = (error) => {
  const errMsg = getErrMsg(error).toLowerCase()

  return (
    errMsg.includes('privacy permission is not authorized') ||
    errMsg.includes('require privacy authorize')
  )
}

const getSaveErrorMessage = (type, error) => {
  const errMsg = getErrMsg(error).toLowerCase()
  const mediaName = getMediaName(type)

  if (isPrivacyBannedError(error)) {
    return '小程序隐私指引未声明相册保存权限'
  }

  if (isPrivacyUnauthorizedError(error)) {
    return '请先同意小程序隐私保护指引'
  }

  if (isAlbumPermissionError(error)) {
    return '相册权限未开启'
  }

  if (
    errMsg.includes('file not found') ||
    errMsg.includes('no such file') ||
    errMsg.includes('not found') ||
    errMsg.includes('fail file')
  ) {
    return `${mediaName}文件已失效，请重新生成后保存`
  }

  if (
    errMsg.includes('invalid file') ||
    errMsg.includes(`invalid ${type}`) ||
    errMsg.includes(`not a ${type}`) ||
    errMsg.includes('format') ||
    errMsg.includes('decode') ||
    errMsg.includes('unsupported')
  ) {
    return `${mediaName}格式暂不支持保存`
  }

  if (errMsg.includes('system')) {
    return '系统相册暂时无法写入'
  }

  return '保存失败，请重试'
}

const normalizeSaveError = (type, filePath, error) => {
  if (error && typeof error === 'object') {
    return {
      ...error,
      userMessage: getSaveErrorMessage(type, error),
    }
  }

  return {
    errMsg: getErrMsg(error),
    userMessage: getSaveErrorMessage(type, error),
  }
}

const isAlbumPermissionError = (error) => {
  const errMsg = getErrMsg(error).toLowerCase()

  return (
    errMsg.includes('auth') ||
    errMsg.includes('authorize') ||
    errMsg.includes('permission') ||
    errMsg.includes('deny') ||
    errMsg.includes('denied')
  )
}

const showAlbumPermissionModal = (content) => new Promise((resolve) => {
  wx.showModal({
    title: '需要相册权限',
    content,
    confirmText: '去设置',
    success: (res) => {
      if (res.confirm) {
        wx.openSetting({
          complete: resolve,
        })
        return
      }

      resolve()
    },
    fail: resolve,
  })
})

const ensurePrivacyAuthorize = () => new Promise((resolve, reject) => {
  if (!wx.requirePrivacyAuthorize) {
    resolve()
    return
  }

  wx.requirePrivacyAuthorize({
    success: resolve,
    fail: reject,
  })
})

const ensureAlbumPermission = (content = '打开权限后就能保存图片到相册。') => new Promise((resolve, reject) => {
  wx.getSetting({
    success: (setting) => {
      const authSetting = setting.authSetting || {}

      if (authSetting[ALBUM_SCOPE]) {
        resolve()
        return
      }

      if (authSetting[ALBUM_SCOPE] === false) {
        showAlbumPermissionModal(content).then(() => reject({ handled: true }))
        return
      }

      resolve()
    },
    fail: resolve,
  })
})

const saveImageToAlbum = ({ filePath, permissionText }) => (
  ensurePrivacyAuthorize()
    .then(() => ensureAlbumPermission(permissionText))
    .then(() => new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: resolve,
        fail: reject,
      })
    }))
    .catch((error) => {
      if (error && error.handled) {
        return Promise.reject(error)
      }

      if (isAlbumPermissionError(error)) {
        return showAlbumPermissionModal(permissionText)
          .then(() => Promise.reject({ handled: true }))
      }

      return Promise.reject(normalizeSaveError('image', filePath, error))
    })
)

const saveVideoToAlbum = ({ filePath, permissionText }) => (
  ensurePrivacyAuthorize()
    .then(() => ensureAlbumPermission(permissionText))
    .then(() => new Promise((resolve, reject) => {
      wx.saveVideoToPhotosAlbum({
        filePath,
        success: resolve,
        fail: reject,
      })
    }))
    .catch((error) => {
      if (error && error.handled) {
        return Promise.reject(error)
      }

      if (isAlbumPermissionError(error)) {
        return showAlbumPermissionModal(permissionText)
          .then(() => Promise.reject({ handled: true }))
      }

      return Promise.reject(normalizeSaveError('video', filePath, error))
    })
)

module.exports = {
  ensureAlbumPermission,
  ensurePrivacyAuthorize,
  isSaveCancel,
  saveImageToAlbum,
  saveVideoToAlbum,
}
