const { isSaveCancel, saveImageToAlbum } = require('../../utils/image-save')

const MAX_EXPORT_SIDE = 4096
const DEFAULT_CUSTOM_SIZE = {
  width: '800',
  height: '800',
}

const sizeTemplates = [
  { id: 'one-inch', title: '一寸照', desc: '295 × 413', width: 295, height: 413 },
  { id: 'two-inch', title: '二寸照', desc: '413 × 579', width: 413, height: 579 },
  { id: 'registration', title: '报名照', desc: '480 × 640', width: 480, height: 640 },
  { id: 'avatar300', title: '头像', desc: '300 × 300', width: 300, height: 300 },
  { id: 'square1080', title: '方图', desc: '1080 × 1080', width: 1080, height: 1080 },
  { id: 'custom', title: '自定义', desc: '手动输入', width: 800, height: 800 },
]

const fitModes = [
  { id: 'cover', title: '居中裁切', desc: '填满尺寸' },
  { id: 'contain', title: '留白适配', desc: '不裁内容' },
  { id: 'stretch', title: '拉伸填充', desc: '强制变形' },
]

const exportFormats = [
  { id: 'jpg', title: 'JPG 高清', desc: '体积更稳' },
  { id: 'png', title: 'PNG 无损', desc: '可能更大' },
]

const formatFileSize = (size) => {
  if (!size) return '--'

  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(2)} MB`
  }

  return `${(size / 1024).toFixed(1)} KB`
}

const getTemplate = (id) => sizeTemplates.find((item) => item.id === id) || sizeTemplates[0]

Page({
  data: {
    sizeTemplates,
    fitModes,
    exportFormats,
    activeTemplateId: 'one-inch',
    fitMode: 'cover',
    exportFormat: 'jpg',
    customWidth: DEFAULT_CUSTOM_SIZE.width,
    customHeight: DEFAULT_CUSTOM_SIZE.height,
    targetWidth: 295,
    targetHeight: 413,
    targetText: '295 × 413 px',
    originalPath: '',
    outputPath: '',
    originalSize: '--',
    outputSize: '--',
    originalDimensions: '--',
    outputDimensions: '--',
    qualityText: '--',
    hasImage: false,
    hasResult: false,
    isProcessing: false,
    isSaving: false,
    imageInfo: null,
  },

  onChooseImage() {
    if (this.data.isProcessing || this.data.isSaving) return

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
        this.getFileSize(filePath, knownSize)
          .then((size) => {
            this.setData({
              originalPath: filePath,
              outputPath: '',
              originalSize: formatFileSize(size),
              outputSize: '--',
              originalDimensions: `${info.width} × ${info.height}`,
              outputDimensions: '--',
              qualityText: '--',
              hasImage: true,
              hasResult: false,
              imageInfo: {
                width: info.width,
                height: info.height,
                size,
              },
            })
          })
          .catch(() => {
            wx.showToast({
              title: '读取图片失败',
              icon: 'none',
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

  onTemplateTap(event) {
    if (this.data.isProcessing) return

    const { id } = event.currentTarget.dataset
    const template = getTemplate(id)
    const nextSize = id === 'custom'
      ? this.getCustomSize()
      : { width: template.width, height: template.height }

    this.setData({
      activeTemplateId: id,
      targetWidth: nextSize.width,
      targetHeight: nextSize.height,
      targetText: `${nextSize.width} × ${nextSize.height} px`,
      hasResult: false,
      outputPath: '',
      outputSize: '--',
      outputDimensions: '--',
      qualityText: '--',
    })
  },

  onCustomWidthInput(event) {
    this.setCustomSize({
      customWidth: event.detail.value,
    })
  },

  onCustomHeightInput(event) {
    this.setCustomSize({
      customHeight: event.detail.value,
    })
  },

  setCustomSize(patch) {
    const next = {
      customWidth: this.data.customWidth,
      customHeight: this.data.customHeight,
      ...patch,
    }
    const size = this.getCustomSize(next.customWidth, next.customHeight)

    this.setData({
      ...next,
      activeTemplateId: 'custom',
      targetWidth: size.width,
      targetHeight: size.height,
      targetText: `${size.width} × ${size.height} px`,
      hasResult: false,
      outputPath: '',
      outputSize: '--',
      outputDimensions: '--',
      qualityText: '--',
    })
  },

  onFitModeTap(event) {
    if (this.data.isProcessing) return

    const { id } = event.currentTarget.dataset

    this.setData({
      fitMode: id,
      hasResult: false,
      outputPath: '',
      outputSize: '--',
      outputDimensions: '--',
      qualityText: '--',
    })
  },

  onFormatTap(event) {
    if (this.data.isProcessing) return

    this.setData({
      exportFormat: event.currentTarget.dataset.id,
      hasResult: false,
      outputPath: '',
      outputSize: '--',
      outputDimensions: '--',
      qualityText: '--',
    })
  },

  onProcess() {
    if (!this.data.originalPath || !this.data.imageInfo) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none',
      })
      return
    }

    const target = this.getTargetSize()

    if (!target) {
      wx.showToast({
        title: '尺寸范围不太对',
        icon: 'none',
      })
      return
    }

    if (this.data.isProcessing) return

    this.setData({
      isProcessing: true,
    })

    this.getCanvas()
      .then(({ canvas, ctx }) => this.renderImage(canvas, ctx, target))
      .then((result) => {
        this.setData({
          outputPath: result.path,
          outputSize: formatFileSize(result.size),
          outputDimensions: `${result.width} × ${result.height}`,
          qualityText: result.qualityText,
          hasResult: true,
          isProcessing: false,
        })
      })
      .catch(() => {
        this.setData({
          isProcessing: false,
        })
        wx.showToast({
          title: '处理失败',
          icon: 'none',
        })
      })
  },

  getCanvas() {
    return new Promise((resolve, reject) => {
      this.createSelectorQuery()
        .select('#resizeCanvas')
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

  renderImage(canvas, ctx, target) {
    return this.loadCanvasImage(canvas, this.data.originalPath)
      .then((image) => {
        canvas.width = target.width
        canvas.height = target.height
        this.drawImageToTarget(ctx, image, target)

        return this.exportImage(canvas, target)
      })
  },

  loadCanvasImage(canvas, src) {
    return new Promise((resolve, reject) => {
      const image = canvas.createImage()

      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = src
    })
  },

  drawImageToTarget(ctx, image, target) {
    const source = this.data.imageInfo

    ctx.clearRect(0, 0, target.width, target.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, target.width, target.height)

    if (this.data.fitMode === 'stretch') {
      ctx.drawImage(image, 0, 0, source.width, source.height, 0, 0, target.width, target.height)
      return
    }

    if (this.data.fitMode === 'contain') {
      const scale = Math.min(target.width / source.width, target.height / source.height)
      const drawWidth = Math.round(source.width * scale)
      const drawHeight = Math.round(source.height * scale)
      const drawX = Math.round((target.width - drawWidth) / 2)
      const drawY = Math.round((target.height - drawHeight) / 2)

      ctx.drawImage(image, 0, 0, source.width, source.height, drawX, drawY, drawWidth, drawHeight)
      return
    }

    const sourceRatio = source.width / source.height
    const targetRatio = target.width / target.height
    let cropX = 0
    let cropY = 0
    let cropWidth = source.width
    let cropHeight = source.height

    if (sourceRatio > targetRatio) {
      cropWidth = Math.round(source.height * targetRatio)
      cropX = Math.round((source.width - cropWidth) / 2)
    } else {
      cropHeight = Math.round(source.width / targetRatio)
      cropY = Math.round((source.height - cropHeight) / 2)
    }

    ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, target.width, target.height)
  },

  exportImage(canvas, target) {
    return new Promise((resolve, reject) => {
      const fileType = this.data.exportFormat === 'png' ? 'png' : 'jpg'
      const exportOptions = {
        canvas,
        destWidth: target.width,
        destHeight: target.height,
        fileType,
        success: (res) => {
          this.getFileSize(res.tempFilePath)
            .then((size) => {
              resolve({
                path: res.tempFilePath,
                size,
                width: target.width,
                height: target.height,
                qualityText: fileType === 'png' ? 'PNG 无损' : 'JPG 高清',
              })
            })
            .catch(reject)
        },
        fail: reject,
      }

      if (fileType === 'jpg') {
        exportOptions.quality = 1
      }

      wx.canvasToTempFilePath(exportOptions, this)
    })
  },

  getTargetSize() {
    const width = Number(this.data.targetWidth)
    const height = Number(this.data.targetHeight)

    if (!Number.isFinite(width) || !Number.isFinite(height)) return null
    if (width < 50 || height < 50 || width > MAX_EXPORT_SIDE || height > MAX_EXPORT_SIDE) return null

    return {
      width: Math.round(width),
      height: Math.round(height),
    }
  },

  getCustomSize(width = this.data.customWidth, height = this.data.customHeight) {
    const nextWidth = Math.min(Math.max(Number(width) || Number(DEFAULT_CUSTOM_SIZE.width), 50), MAX_EXPORT_SIDE)
    const nextHeight = Math.min(Math.max(Number(height) || Number(DEFAULT_CUSTOM_SIZE.height), 50), MAX_EXPORT_SIDE)

    return {
      width: Math.round(nextWidth),
      height: Math.round(nextHeight),
    }
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

  onPreviewResult() {
    if (!this.data.outputPath) return

    wx.previewImage({
      current: this.data.outputPath,
      urls: [this.data.outputPath],
    })
  },

  onSave() {
    if (!this.data.outputPath) {
      wx.showToast({
        title: '请先生成图片',
        icon: 'none',
      })
      return
    }

    if (this.data.isSaving) return

    this.setData({
      isSaving: true,
    })

    saveImageToAlbum({
      filePath: this.data.outputPath,
      permissionText: '打开权限后就能保存调整后的图片。',
    })
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

  onShareAppMessage() {
    return {
      title: '报名照、头像、材料图，快速调整成指定尺寸',
      path: '/pages/image-resize/image-resize',
    }
  },

  onShareTimeline() {
    return {
      title: '图片尺寸调整工具：裁成指定像素和格式',
      query: '',
    }
  },
})
