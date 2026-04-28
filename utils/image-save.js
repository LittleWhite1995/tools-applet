const ALBUM_SCOPE = 'scope.writePhotosAlbum'

const getErrMsg = (error) => String(error && error.errMsg || error && error.message || '')

const isSaveCancel = (error) => getErrMsg(error).toLowerCase().includes('cancel')

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

      wx.authorize({
        scope: ALBUM_SCOPE,
        success: resolve,
        fail: () => {
          showAlbumPermissionModal(content).then(() => reject({ handled: true }))
        },
      })
    },
    fail: resolve,
  })
})

const saveImageToAlbum = ({ filePath, permissionText }) => (
  ensureAlbumPermission(permissionText)
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

      return Promise.reject(error)
    })
)

const saveVideoToAlbum = ({ filePath, permissionText }) => (
  ensureAlbumPermission(permissionText)
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

      return Promise.reject(error)
    })
)

module.exports = {
  ensureAlbumPermission,
  isSaveCancel,
  saveImageToAlbum,
  saveVideoToAlbum,
}
