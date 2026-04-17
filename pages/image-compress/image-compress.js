const qualityOptions = [
  { label: '清晰', value: 'clear', quality: 0.9, desc: '细节更多' },
  { label: '均衡', value: 'balanced', quality: 0.75, desc: '推荐' },
  { label: '极小', value: 'small', quality: 0.55, desc: '体积更小' },
]

const widthOptions = [
  { label: '原尺寸', value: 'original' },
  { label: '1920', value: '1920' },
  { label: '1280', value: '1280' },
  { label: '800', value: '800' },
]

Page({
  data: {
    qualityOptions,
    widthOptions,
    qualityMode: 'balanced',
    maxWidth: '1280',
    originalPath: '',
    compressedPath: '',
    originalSize: '--',
    compressedSize: '--',
    originalDimensions: '--',
    compressedDimensions: '--',
    compressionRatio: '--',
    hasImage: false,
    hasResult: false,
    isCompressing: false,
    isSaving: false,
    imageInfo: null,
  },

  onChooseImage() {
    if (this.data.isCompressing) return

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['original'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]

        if (!file || !file.tempFilePath) return

        this.loadImage(file.tempFilePath, file.size)
      },
      fail: (error) => {
        if (String(error.errMsg || '').includes('cancel')) return

        wx.showToast({
          title: '选择图片失败',
          icon: 'none',
        })
      },
    })
  },

  loadImage(filePath, knownSize) {
    wx.getImageInfo({
      src: filePath,
      success: (info) => {
        this.getFileSize(filePath, knownSize).then((size) => {
          this.setData({
            originalPath: filePath,
            compressedPath: '',
            originalSize: this.formatFileSize(size),
            compressedSize: '--',
            originalDimensions: `${info.width} × ${info.height}`,
            compressedDimensions: '--',
            compressionRatio: '--',
            hasImage: true,
            hasResult: false,
            imageInfo: {
              width: info.width,
              height: info.height,
              size,
            },
          })
        })
      },
      fail: () => {
        wx.showToast({
          title: '读取图片失败',
          icon: 'none',
        })
      },
    })
  },

  onQualityTap(event) {
    if (this.data.isCompressing) return

    this.setData({
      qualityMode: event.currentTarget.dataset.value,
      hasResult: false,
      compressedPath: '',
      compressedSize: '--',
      compressedDimensions: '--',
      compressionRatio: '--',
    })
  },

  onWidthTap(event) {
    if (this.data.isCompressing) return

    this.setData({
      maxWidth: event.currentTarget.dataset.value,
      hasResult: false,
      compressedPath: '',
      compressedSize: '--',
      compressedDimensions: '--',
      compressionRatio: '--',
    })
  },

  onCompress() {
    if (!this.data.originalPath || !this.data.imageInfo) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none',
      })
      return
    }

    if (this.data.isCompressing) return

    this.setData({
      isCompressing: true,
    })

    this.getCanvas()
      .then(({ canvas, ctx }) => this.drawCompressedImage(canvas, ctx))
      .then((result) => {
        this.setData({
          compressedPath: result.path,
          compressedSize: this.formatFileSize(result.size),
          compressedDimensions: `${result.width} × ${result.height}`,
          compressionRatio: result.ratio,
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

  getCanvas() {
    return new Promise((resolve, reject) => {
      this.createSelectorQuery()
        .select('#compressCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          const canvas = res && res[0] && res[0].node

          if (!canvas) {
            reject(new Error('canvas not found'))
            return
          }

          resolve({
            canvas,
            ctx: canvas.getContext('2d'),
          })
        })
    })
  },

  drawCompressedImage(canvas, ctx) {
    return new Promise((resolve, reject) => {
      const image = canvas.createImage()
      const target = this.getTargetSize()
      const quality = this.getSelectedQuality()

      canvas.width = target.width
      canvas.height = target.height

      image.onload = () => {
        ctx.clearRect(0, 0, target.width, target.height)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, target.width, target.height)
        ctx.drawImage(image, 0, 0, target.width, target.height)

        wx.canvasToTempFilePath({
          canvas,
          destWidth: target.width,
          destHeight: target.height,
          fileType: 'jpg',
          quality,
          success: (res) => {
            this.getFileSize(res.tempFilePath).then((size) => {
              resolve({
                path: res.tempFilePath,
                size,
                width: target.width,
                height: target.height,
                ratio: this.getCompressionRatio(size),
              })
            }).catch(reject)
          },
          fail: reject,
        }, this)
      }

      image.onerror = reject
      image.src = this.data.originalPath
    })
  },

  getTargetSize() {
    const { width, height } = this.data.imageInfo
    const limit = this.data.maxWidth === 'original' ? Math.max(width, height) : Number(this.data.maxWidth)
    const maxSide = Math.min(limit, 4096)

    if (Math.max(width, height) <= maxSide) {
      return { width, height }
    }

    if (width >= height) {
      return {
        width: maxSide,
        height: Math.round(height * maxSide / width),
      }
    }

    return {
      width: Math.round(width * maxSide / height),
      height: maxSide,
    }
  },

  getSelectedQuality() {
    const option = this.data.qualityOptions.find((item) => item.value === this.data.qualityMode)
    return option ? option.quality : 0.75
  },

  getCompressionRatio(compressedSize) {
    const originalSize = this.data.imageInfo && this.data.imageInfo.size

    if (!originalSize || !compressedSize) return '--'

    const percent = Math.max(0, Math.round((1 - compressedSize / originalSize) * 100))
    return `节省 ${percent}%`
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

  formatFileSize(size) {
    if (!size) return '--'

    if (size >= 1024 * 1024) {
      return `${(size / 1024 / 1024).toFixed(2)} MB`
    }

    return `${(size / 1024).toFixed(1)} KB`
  },

  onSave() {
    if (!this.data.compressedPath) {
      wx.showToast({
        title: '请先压缩图片',
        icon: 'none',
      })
      return
    }

    if (this.data.isSaving) return

    this.setData({
      isSaving: true,
    })

    wx.saveImageToPhotosAlbum({
      filePath: this.data.compressedPath,
      success: () => {
        this.setData({
          isSaving: false,
        })
        wx.showToast({
          title: '已保存到相册',
          icon: 'success',
        })
      },
      fail: (error) => {
        this.setData({
          isSaving: false,
        })

        if (String(error.errMsg || '').includes('auth deny')) {
          wx.showModal({
            title: '需要相册权限',
            content: '打开权限后就能保存压缩后的图片。',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting()
              }
            },
          })
          return
        }

        wx.showToast({
          title: '保存失败',
          icon: 'none',
        })
      },
    })
  },
})
