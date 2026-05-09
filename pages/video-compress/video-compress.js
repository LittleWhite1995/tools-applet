const { isSaveCancel, saveVideoToAlbum } = require('../../utils/image-save')
const { isDesktopPlatform } = require('../../utils/device')

const qualityOptions = [
  { label: '清晰', value: 'high', desc: '画质优先' },
  { label: '均衡', value: 'medium', desc: '推荐' },
  { label: '更小', value: 'low', desc: '体积优先' },
]

const qualityOrder = ['high', 'medium', 'low']

const formatFileSize = (size) => {
  if (!size) return '--'

  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(2)} MB`
  }

  return `${(size / 1024).toFixed(1)} KB`
}

const kbToBytes = (size) => {
  const value = Number(size)

  return Number.isFinite(value) && value > 0 ? Math.round(value * 1024) : 0
}

const formatDuration = (duration) => {
  const totalSeconds = Math.round(Number(duration) || 0)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes <= 0) return `${seconds} 秒`

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const formatDimensions = (width, height) => {
  if (!width || !height) return '--'

  return `${Math.round(width)} × ${Math.round(height)}`
}

Page({
  data: {
    qualityOptions,
    qualityMode: 'medium',
    originalPath: '',
    compressedPath: '',
    originalSize: '--',
    compressedSize: '--',
    originalDimensions: '--',
    compressedDimensions: '--',
    durationText: '--',
    compressionRatio: '--',
    compressionNote: '',
    hasVideo: false,
    hasResult: false,
    isCompressing: false,
    isSaving: false,
    videoInfo: null,
  },

  onChooseVideo() {
    if (this.data.isCompressing || this.data.isSaving) return

    if (isDesktopPlatform()) {
      this.showDesktopUnsupportedToast()
      return
    }

    if (wx.chooseVideo) {
      this.chooseOriginalVideo()
      return
    }

    this.chooseVideoByMedia()
  },

  chooseOriginalVideo() {
    wx.chooseVideo({
      sourceType: ['album'],
      compressed: false,
      success: (res) => {
        if (!res.tempFilePath) return

        this.loadVideo(res.tempFilePath, {
          size: res.size,
          width: res.width,
          height: res.height,
          duration: res.duration,
        })
      },
      fail: (error) => {
        if (String(error.errMsg || '').includes('cancel')) return

        this.chooseVideoByMedia()
      },
    })
  },

  chooseVideoByMedia() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]

        if (!file || !file.tempFilePath) return

        this.loadVideo(file.tempFilePath, file)
      },
      fail: (error) => {
        if (String(error.errMsg || '').includes('cancel')) return

        wx.showToast({
          title: '选择视频失败',
          icon: 'none',
        })
      },
    })
  },

  loadVideo(filePath, file = {}) {
    this.getVideoInfo(filePath)
      .catch(() => ({}))
      .then((info) => this.getFileSize(filePath, file.size || kbToBytes(info.size)).then((size) => ({
        ...info,
        size,
      })))
      .then((info) => {
        this.setData({
          originalPath: filePath,
          compressedPath: '',
          originalSize: formatFileSize(info.size),
          compressedSize: '--',
          originalDimensions: formatDimensions(info.width || file.width, info.height || file.height),
          compressedDimensions: '--',
          durationText: formatDuration(info.duration || file.duration),
          compressionRatio: '--',
          compressionNote: '',
          hasVideo: true,
          hasResult: false,
          videoInfo: {
            width: info.width || file.width || 0,
            height: info.height || file.height || 0,
            duration: info.duration || file.duration || 0,
            size: info.size,
          },
        })
      })
      .catch(() => {
        wx.showToast({
          title: '读取视频失败',
          icon: 'none',
        })
      })
  },

  onQualityTap(event) {
    if (this.data.isCompressing) return

    if (isDesktopPlatform()) {
      this.showDesktopUnsupportedToast()
      return
    }

    this.setData({
      qualityMode: event.currentTarget.dataset.value,
      hasResult: false,
      compressedPath: '',
      compressedSize: '--',
      compressedDimensions: '--',
      compressionRatio: '--',
      compressionNote: '',
    })
  },

  onCompress() {
    if (!this.data.originalPath) {
      wx.showToast({
        title: '请先选择视频',
        icon: 'none',
      })
      return
    }

    if (this.data.isCompressing) return

    this.setData({
      isCompressing: true,
    })

    this.compressBestResult()
      .then((result) => {
        this.setData({
          compressedPath: result.path,
          compressedSize: formatFileSize(result.size),
          compressedDimensions: formatDimensions(result.width, result.height),
          compressionRatio: this.getCompressionRatio(result.size),
          compressionNote: result.note || '',
          hasResult: true,
          isCompressing: false,
        })
      })
      .catch(() => {
        this.setData({
          isCompressing: false,
        })
        wx.showToast({
          title: '压缩失败',
          icon: 'none',
        })
      })
  },

  compressBestResult() {
    const originalSize = this.data.videoInfo && this.data.videoInfo.size
    const qualities = this.getQualityAttempts(this.data.qualityMode)
    let smallestResult = null

    return qualities.reduce((promise, quality, index) => (
      promise.then((found) => {
        if (found) return found

        return this.compressVideoByQuality(quality).then((result) => {
          if (!smallestResult || result.size < smallestResult.size) {
            smallestResult = result
          }

          if (!originalSize || result.size < originalSize) {
            return {
              ...result,
              note: index > 0 ? '所选质量会让体积变大，已自动改用更低质量。' : '',
            }
          }

          return null
        })
      })
    ), Promise.resolve(null)).then((result) => {
      if (result) return result

      if (smallestResult) {
        return {
          ...smallestResult,
          note: '原视频已经足够小，已保留最小的压缩结果，体积可能略有增加。',
        }
      }

      return Promise.reject(new Error('compress failed'))
    })
  },

  getQualityAttempts(selectedQuality) {
    const startIndex = Math.max(qualityOrder.indexOf(selectedQuality), 0)

    return qualityOrder.slice(startIndex)
  },

  compressVideoByQuality(quality) {
    return new Promise((resolve, reject) => {
      wx.compressVideo({
        src: this.data.originalPath,
        quality,
        success: (res) => {
          const videoPath = res.tempFilePath

          this.getCompressedVideoResult(videoPath, kbToBytes(res.size))
            .then((result) => resolve({
              ...result,
              path: videoPath,
            }))
            .catch(reject)
        },
        fail: reject,
      })
    })
  },

  getCompressedVideoResult(filePath, knownSize) {
    return this.getVideoInfo(filePath)
      .catch(() => ({}))
      .then((info) => this.getFileSize(filePath, knownSize || kbToBytes(info.size)).then((size) => ({
        ...info,
        width: info.width || this.data.videoInfo.width,
        height: info.height || this.data.videoInfo.height,
        size,
      })))
  },

  getVideoInfo(filePath) {
    if (!wx.getVideoInfo) {
      return Promise.resolve({})
    }

    return new Promise((resolve, reject) => {
      wx.getVideoInfo({
        src: filePath,
        success: resolve,
        fail: reject,
      })
    })
  },

  getFileSize(filePath, fallbackSize) {
    if (fallbackSize) return Promise.resolve(fallbackSize)

    return new Promise((resolve, reject) => {
      wx.getFileInfo({
        filePath,
        success: (res) => resolve(res.size || 0),
        fail: reject,
      })
    })
  },

  getSavableVideoPath(filePath) {
    if (!wx.getFileSystemManager || !wx.env || !wx.env.USER_DATA_PATH) {
      return Promise.resolve(filePath)
    }

    const fs = wx.getFileSystemManager()
    const targetPath = `${wx.env.USER_DATA_PATH}/video-compress-output.mp4`

    return new Promise((resolve, reject) => {
      fs.unlink({
        filePath: targetPath,
        complete: () => {
          fs.copyFile({
            srcPath: filePath,
            destPath: targetPath,
            success: () => resolve(targetPath),
            fail: reject,
          })
        },
      })
    })
  },

  getCompressionRatio(compressedSize) {
    const originalSize = this.data.videoInfo && this.data.videoInfo.size

    if (!originalSize || !compressedSize) return '--'

    const percent = Math.max(0, Math.round((1 - compressedSize / originalSize) * 100))

    return percent > 0 ? `节省 ${percent}%` : '体积接近'
  },

  showDesktopUnsupportedToast() {
    wx.showToast({
      title: '请在手机端使用视频压缩',
      icon: 'none',
    })
  },

  onSave() {
    if (!this.data.compressedPath) {
      wx.showToast({
        title: '请先压缩视频',
        icon: 'none',
      })
      return
    }

    if (this.data.isSaving) return

    this.setData({
      isSaving: true,
    })

    this.getSavableVideoPath(this.data.compressedPath)
      .then((filePath) => saveVideoToAlbum({
        filePath,
        permissionText: '打开权限后就能保存压缩后的视频。',
      }))
      .then(() => {
        this.setData({
          isSaving: false,
        })
        wx.showToast({
          title: '已保存到相册',
          icon: 'success',
        })
      })
      .catch((error) => {
        this.setData({
          isSaving: false,
        })

        if ((error && error.handled) || isSaveCancel(error)) return

        wx.showToast({
          title: error && error.userMessage || '保存失败',
          icon: 'none',
        })
      })
  },
})
