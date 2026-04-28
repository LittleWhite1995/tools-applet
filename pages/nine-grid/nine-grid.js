const { ensureAlbumPermission, isSaveCancel, saveImageToAlbum } = require('../../utils/image-save')

const MAX_EXPORT_SIZE = 3072

const createCropOptions = (imageInfo) => {
  if (!imageInfo) return []

  const { width, height } = imageInfo

  if (width === height) {
    return [
      { label: '原图', value: 'center', desc: '已是正方形' },
    ]
  }

  if (height > width) {
    return [
      { label: '顶部', value: 'top', desc: '保留上半部分' },
      { label: '居中', value: 'center', desc: '推荐' },
      { label: '底部', value: 'bottom', desc: '保留下半部分' },
    ]
  }

  return [
    { label: '左侧', value: 'left', desc: '保留左半部分' },
    { label: '居中', value: 'center', desc: '推荐' },
    { label: '右侧', value: 'right', desc: '保留右半部分' },
  ]
}

const getCropRect = (imageInfo, cropMode) => {
  if (!imageInfo) {
    return { x: 0, y: 0, size: 0 }
  }

  const { width, height } = imageInfo
  const size = Math.min(width, height)

  if (width === height) {
    return { x: 0, y: 0, size }
  }

  if (height > width) {
    if (cropMode === 'top') {
      return { x: 0, y: 0, size }
    }

    if (cropMode === 'bottom') {
      return { x: 0, y: height - size, size }
    }

    return { x: 0, y: Math.round((height - size) / 2), size }
  }

  if (cropMode === 'left') {
    return { x: 0, y: 0, size }
  }

  if (cropMode === 'right') {
    return { x: width - size, y: 0, size }
  }

  return { x: Math.round((width - size) / 2), y: 0, size }
}

const getPreviewStyle = (imageInfo, cropMode) => {
  if (!imageInfo) return ''

  const { width, height } = imageInfo
  const cropRect = getCropRect(imageInfo, cropMode)
  const imageWidthPercent = (width / cropRect.size) * 100
  const imageHeightPercent = (height / cropRect.size) * 100
  const leftPercent = (-cropRect.x / cropRect.size) * 100
  const topPercent = (-cropRect.y / cropRect.size) * 100

  return [
    `width:${imageWidthPercent.toFixed(3)}%`,
    `height:${imageHeightPercent.toFixed(3)}%`,
    `left:${leftPercent.toFixed(3)}%`,
    `top:${topPercent.toFixed(3)}%`,
  ].join(';')
}

const getCropMetaText = (imageInfo, cropOptions, cropMode) => {
  if (!imageInfo) return ''

  const cropRect = getCropRect(imageInfo, cropMode)
  const option = cropOptions.find((item) => item.value === cropMode)
  const label = option ? option.label : '居中'

  if (imageInfo.width === imageInfo.height) {
    return `原图 ${imageInfo.width} × ${imageInfo.height}，将直接切成 9 张方图`
  }

  return `${label}裁切 ${cropRect.size} × ${cropRect.size}，按 1-9 顺序输出`
}

const formatFileSize = (size) => {
  if (!size) return '--'

  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(2)} MB`
  }

  return `${(size / 1024).toFixed(1)} KB`
}

Page({
  data: {
    cropOptions: [],
    cropMode: 'center',
    originalPath: '',
    originalSize: '--',
    originalDimensions: '--',
    cropMetaText: '',
    cropPreviewStyle: '',
    generatedTileSize: '--',
    hasImage: false,
    hasResult: false,
    isGenerating: false,
    isSaving: false,
    saveProgressText: '',
    tiles: [],
    imageInfo: null,
  },

  onChooseImage() {
    if (this.data.isGenerating || this.data.isSaving) return

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
            const imageInfo = {
              width: info.width,
              height: info.height,
              size,
            }
            const cropOptions = createCropOptions(imageInfo)
            const cropMode = cropOptions[1] ? cropOptions[1].value : cropOptions[0].value

            this.setData({
              originalPath: filePath,
              originalSize: formatFileSize(size),
              originalDimensions: `${info.width} × ${info.height}`,
              cropOptions,
              cropMode,
              cropMetaText: getCropMetaText(imageInfo, cropOptions, cropMode),
              cropPreviewStyle: getPreviewStyle(imageInfo, cropMode),
              generatedTileSize: '--',
              hasImage: true,
              hasResult: false,
              tiles: [],
              imageInfo,
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

  onCropModeTap(event) {
    if (this.data.isGenerating || !this.data.imageInfo) return

    const cropMode = event.currentTarget.dataset.value

    if (!cropMode || cropMode === this.data.cropMode) return

    this.setData({
      cropMode,
      cropMetaText: getCropMetaText(this.data.imageInfo, this.data.cropOptions, cropMode),
      cropPreviewStyle: getPreviewStyle(this.data.imageInfo, cropMode),
      generatedTileSize: '--',
      hasResult: false,
      tiles: [],
    })
  },

  onGenerate() {
    if (!this.data.originalPath || !this.data.imageInfo) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none',
      })
      return
    }

    if (this.data.isGenerating) return

    this.setData({
      isGenerating: true,
    })

    this.getCanvas()
      .then(({ canvas, ctx }) => this.generateTiles(canvas, ctx))
      .then((result) => {
        this.setData({
          isGenerating: false,
          hasResult: true,
          tiles: result.tiles,
          generatedTileSize: `${result.tileSize} × ${result.tileSize}`,
        })
      })
      .catch(() => {
        this.setData({
          isGenerating: false,
        })

        wx.showToast({
          title: '切图失败',
          icon: 'none',
        })
      })
  },

  getCanvas() {
    return new Promise((resolve, reject) => {
      this.createSelectorQuery()
        .select('#splitCanvas')
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

  generateTiles(canvas, ctx) {
    const cropRect = getCropRect(this.data.imageInfo, this.data.cropMode)
    const tileSize = Math.max(300, Math.floor(Math.min(cropRect.size, MAX_EXPORT_SIZE) / 3))

    return this.loadCanvasImage(canvas, this.data.originalPath)
      .then((image) => this.renderTile(canvas, ctx, image, cropRect, tileSize, 0, []))
      .then((tiles) => ({
        tileSize,
        tiles,
      }))
  },

  loadCanvasImage(canvas, src) {
    return new Promise((resolve, reject) => {
      const image = canvas.createImage()

      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = src
    })
  },

  renderTile(canvas, ctx, image, cropRect, tileSize, index, tiles) {
    if (index >= 9) {
      return Promise.resolve(tiles)
    }

    const row = Math.floor(index / 3)
    const column = index % 3
    const sourceTileSize = cropRect.size / 3
    const sourceX = cropRect.x + column * sourceTileSize
    const sourceY = cropRect.y + row * sourceTileSize

    canvas.width = tileSize
    canvas.height = tileSize

    ctx.clearRect(0, 0, tileSize, tileSize)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, tileSize, tileSize)
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceTileSize,
      sourceTileSize,
      0,
      0,
      tileSize,
      tileSize,
    )

    return this.exportCanvas(canvas, tileSize)
      .then((path) => {
        tiles.push({
          id: `tile_${index + 1}`,
          index: index + 1,
          path,
          label: `${index + 1}`,
        })

        return this.renderTile(canvas, ctx, image, cropRect, tileSize, index + 1, tiles)
      })
  },

  exportCanvas(canvas, tileSize) {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas,
        destWidth: tileSize,
        destHeight: tileSize,
        fileType: 'jpg',
        quality: 0.92,
        success: (res) => resolve(res.tempFilePath),
        fail: reject,
      }, this)
    })
  },

  onPreviewTile(event) {
    const { path } = event.currentTarget.dataset
    const urls = this.data.tiles.map((item) => item.path)

    if (!path || !urls.length) return

    wx.previewImage({
      current: path,
      urls,
    })
  },

  onSaveAll() {
    if (!this.data.tiles.length) {
      wx.showToast({
        title: '请先生成切图',
        icon: 'none',
      })
      return
    }

    if (this.data.isSaving) return

    this.setData({
      isSaving: true,
      saveProgressText: `1/${this.data.tiles.length}`,
    })

    ensureAlbumPermission('打开权限后，就能把 9 张切图一次保存到相册。')
      .then(() => this.saveTilesSequentially(0))
      .then(() => {
        this.setData({
          isSaving: false,
          saveProgressText: '',
        })

        wx.showToast({
          title: '9 张已保存到相册',
          icon: 'success',
        })
      })
      .catch((payload) => {
        this.setData({
          isSaving: false,
          saveProgressText: '',
        })

        if (payload && payload.handled) return

        const error = payload && payload.error ? payload.error : payload
        const failedIndex = payload && typeof payload.index === 'number' ? payload.index + 1 : 0

        if (isSaveCancel(error)) return

        wx.showToast({
          title: failedIndex ? `第 ${failedIndex} 张保存失败` : '保存失败',
          icon: 'none',
        })
      })
  },

  saveTilesSequentially(index) {
    if (index >= this.data.tiles.length) {
      return Promise.resolve()
    }

    this.setData({
      saveProgressText: `${index + 1}/${this.data.tiles.length}`,
    })

    return saveImageToAlbum({
      filePath: this.data.tiles[index].path,
      permissionText: '打开权限后，就能把 9 张切图一次保存到相册。',
    })
      .catch((error) => Promise.reject({ error, index, handled: error && error.handled }))
      .then(() => this.saveTilesSequentially(index + 1))
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
})
