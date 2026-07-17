const { isSaveCancel, saveImageToAlbum } = require('../../utils/image-save')
const { chooseImages } = require('../../utils/image-picker')

const MAX_IMAGE_COUNT = 9
const MAX_CHOOSE_COUNT = 9
const MAX_EXPORT_WIDTH = 1440
const MAX_EXPORT_HEIGHT = 16000
const MIN_EXPORT_WIDTH = 480

const formatFileSize = (size) => {
  if (!size) return '--'

  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(2)} MB`
  }

  return `${(size / 1024).toFixed(1)} KB`
}

Page({
  data: {
    images: [],
    outputPath: '',
    outputSize: '--',
    outputDimensions: '--',
    resultNote: '等待生成',
    hasImages: false,
    hasResult: false,
    isGenerating: false,
    isSaving: false,
  },

  onChooseImages() {
    if (this.data.isGenerating || this.data.isSaving) return

    const remainCount = MAX_IMAGE_COUNT - this.data.images.length
    const chooseCount = Math.min(remainCount, MAX_CHOOSE_COUNT)

    if (remainCount <= 0) {
      wx.showToast({
        title: `最多选择 ${MAX_IMAGE_COUNT} 张`,
        icon: 'none',
      })
      return
    }

    chooseImages({
      count: chooseCount,
    }).then((files) => {
      if (!files.length) return

      Promise.all(files.map((file) => this.loadImage(file.tempFilePath, file.size)))
        .then((items) => {
          const images = this.data.images.concat(items)

          this.setData({
            images,
            hasImages: images.length > 0,
            hasResult: false,
            outputPath: '',
            outputSize: '--',
            outputDimensions: '--',
            resultNote: images.length >= 2 ? '可生成长图' : '至少需要 2 张图片',
          })
        })
        .catch(() => {
          wx.showToast({
            title: '读取图片失败',
            icon: 'none',
          })
        })
    })
  },

  loadImage(filePath, knownSize) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: filePath,
        success: (info) => {
          this.getFileSize(filePath, knownSize)
            .then((size) => {
              resolve({
                id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                path: filePath,
                width: info.width,
                height: info.height,
                size,
                sizeText: formatFileSize(size),
                dimensionText: `${info.width} x ${info.height}`,
              })
            })
            .catch(reject)
        },
        fail: reject,
      })
    })
  },

  onMoveImageUp(event) {
    this.moveImage(event.currentTarget.dataset.index, -1)
  },

  onMoveImageDown(event) {
    this.moveImage(event.currentTarget.dataset.index, 1)
  },

  moveImage(index, offset) {
    if (this.data.isGenerating) return

    const from = Number(index)
    const to = from + offset
    const images = this.data.images.slice()

    if (from < 0 || to < 0 || from >= images.length || to >= images.length) return

    const current = images[from]
    images[from] = images[to]
    images[to] = current

    this.setData({
      images,
      hasResult: false,
      outputPath: '',
    })
  },

  onRemoveImage(event) {
    if (this.data.isGenerating) return

    const index = Number(event.currentTarget.dataset.index)
    const images = this.data.images.filter((_, itemIndex) => itemIndex !== index)

    this.setData({
      images,
      hasImages: images.length > 0,
      hasResult: false,
      outputPath: '',
      outputSize: '--',
      outputDimensions: '--',
      resultNote: images.length >= 2 ? '可生成长图' : '至少需要 2 张图片',
    })
  },

  onClearImages() {
    if (this.data.isGenerating || this.data.isSaving) return

    this.setData({
      images: [],
      hasImages: false,
      hasResult: false,
      outputPath: '',
      outputSize: '--',
      outputDimensions: '--',
      resultNote: '等待生成',
    })
  },

  onGenerate() {
    if (this.data.images.length < 2) {
      wx.showToast({
        title: '请至少选择 2 张图片',
        icon: 'none',
      })
      return
    }

    if (this.data.isGenerating) return

    this.setData({
      isGenerating: true,
      resultNote: '正在拼接',
    })

    this.getCanvas()
      .then(({ canvas, ctx }) => this.renderLongImage(canvas, ctx))
      .then((result) => {
        this.setData({
          outputPath: result.path,
          outputSize: formatFileSize(result.size),
          outputDimensions: `${result.width} x ${result.height}`,
          resultNote: result.scaled ? '已自动压缩到可导出尺寸' : '已生成长图',
          hasResult: true,
          isGenerating: false,
        })
      })
      .catch((error) => {
        this.setData({
          isGenerating: false,
          resultNote: '生成失败',
        })

        wx.showToast({
          title: error && error.userMessage || '拼接失败',
          icon: 'none',
        })
      })
  },

  getCanvas() {
    return new Promise((resolve, reject) => {
      this.createSelectorQuery()
        .select('#stitchCanvas')
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

  renderLongImage(canvas, ctx) {
    const plan = this.createRenderPlan()

    if (!plan) {
      return Promise.reject({
        userMessage: '图片太长，请减少图片或裁掉重叠区域',
      })
    }

    canvas.width = plan.width
    canvas.height = plan.height

    ctx.clearRect(0, 0, plan.width, plan.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, plan.width, plan.height)

    return this.drawItems(canvas, ctx, plan.items, 0)
      .then(() => this.exportCanvas(canvas, plan.width, plan.height))
      .then((path) => this.getFileSize(path).then((size) => ({
        path,
        size,
        width: plan.width,
        height: plan.height,
        scaled: plan.scaled,
      })))
  },

  createRenderPlan() {
    const first = this.data.images[0]
    const baseWidth = Math.min(Math.max(first.width, MIN_EXPORT_WIDTH), MAX_EXPORT_WIDTH)
    const sourceItems = this.data.images.map((item) => {
      return {
        image: item,
        sourceY: 0,
        sourceHeight: item.height,
        drawHeight: Math.max(1, Math.round(item.height * baseWidth / item.width)),
      }
    })
    const baseHeight = sourceItems.reduce((sum, item) => sum + item.drawHeight, 0)
    const scale = baseHeight > MAX_EXPORT_HEIGHT ? MAX_EXPORT_HEIGHT / baseHeight : 1
    const width = Math.floor(baseWidth * scale)

    if (width < MIN_EXPORT_WIDTH) return null

    const items = []
    let offsetY = 0

    sourceItems.forEach((item, index) => {
      const isLast = index === sourceItems.length - 1
      const drawHeight = isLast
        ? Math.max(1, Math.round(baseHeight * scale) - offsetY)
        : Math.max(1, Math.round(item.drawHeight * scale))

      items.push({
        ...item,
        drawY: offsetY,
        drawHeight,
      })

      offsetY += drawHeight
    })

    if (offsetY > MAX_EXPORT_HEIGHT) return null

    return {
      width,
      height: offsetY,
      items,
      scaled: scale < 1,
    }
  },

  drawItems(canvas, ctx, items, index) {
    if (index >= items.length) {
      return Promise.resolve()
    }

    const item = items[index]

    return this.loadCanvasImage(canvas, item.image.path)
      .then((image) => {
        ctx.drawImage(
          image,
          0,
          item.sourceY,
          item.image.width,
          item.sourceHeight,
          0,
          item.drawY,
          canvas.width,
          item.drawHeight,
        )

        return this.drawItems(canvas, ctx, items, index + 1)
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

  exportCanvas(canvas, width, height) {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas,
        destWidth: width,
        destHeight: height,
        fileType: 'jpg',
        quality: 0.92,
        success: (res) => resolve(res.tempFilePath),
        fail: reject,
      }, this)
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
        title: '请先生成长图',
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
      permissionText: '打开权限后，就能把拼接后的长图保存到相册。',
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

        if (error && error.handled) return
        if (isSaveCancel(error)) return

        wx.showToast({
          title: error && error.userMessage || '保存失败',
          icon: 'none',
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

  onShareAppMessage() {
    return {
      title: '把多张截图拼成一张长图，聊天记录和订单截图更好保存',
      path: '/pages/long-image/long-image',
    }
  },

  onShareTimeline() {
    return {
      title: '长图拼接工具：多张截图合成一张长图',
      query: '',
    }
  },
})
