const { isSaveCancel, saveImageToAlbum } = require('../../utils/image-save')
const { chooseImages } = require('../../utils/image-picker')
const { MARD_PALETTE } = require('../../utils/pindou-palette')
const {
  generatePattern,
  getPatternStats,
  replacePatternColor,
} = require('../../utils/pindou-engine')

const DEFAULT_GRID_WIDTH = 32
const MAX_GRID_HEIGHT = 120
const MAX_HISTORY = 20
const MAX_EXPORT_SIDE = 4096
const MAX_EDITOR_BACKING_SIDE = 3072
const BASE_EDITOR_CELL = 18
const EDITOR_FIT_PADDING = 12
const MIN_EDITOR_ZOOM = 0.6
const MAX_EDITOR_ZOOM = 6
const EDITOR_ZOOM_STEP = 0.5

const gridPresets = [16, 24, 32, 40, 52, 72].map((value) => ({
  label: `${value} 格`,
  value,
}))

const colorOptions = [8, 12, 16, 20, 24, 0].map((value) => ({
  label: value ? `${value} 色` : '不限',
  value,
}))

const formatFileSize = (size) => {
  if (!size) return '--'
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`
  return `${(size / 1024).toFixed(1)} KB`
}

const getContrastColor = (color) => {
  const luminance = (color.r * 0.299) + (color.g * 0.587) + (color.b * 0.114)
  return luminance > 165 ? '#20302b' : '#ffffff'
}

const displayPalette = MARD_PALETTE.map((color) => ({
  ...color,
  textColor: getContrastColor(color),
}))

Page({
  data: {
    gridPresets,
    colorOptions,
    fullPalette: displayPalette,
    selectedGridWidth: DEFAULT_GRID_WIDTH,
    customGridWidth: String(DEFAULT_GRID_WIDTH),
    isCustomGrid: false,
    colorLimit: 16,
    removeWhite: false,
    originalPath: '',
    originalSize: '--',
    originalDimensions: '--',
    hasImage: false,
    isLoadingImage: false,
    isGenerating: false,
    hasPattern: false,
    patternDimensions: '--',
    totalBeads: 0,
    colorStats: [],
    activeTool: 'pan',
    selectedPaletteIndex: -1,
    selectedColorCode: '选择颜色',
    selectedColorHex: '#dfe9e5',
    canUndo: false,
    canRedo: false,
    editorZoom: 1,
    editorWidth: 1,
    editorHeight: 1,
    editorCanvasLeft: 0,
    editorCanvasTop: 0,
    showPalette: false,
    paletteTitle: '选择 MARD 颜色',
    replaceFromPaletteIndex: -1,
    hasManualChanges: false,
    isExporting: false,
    hasExport: false,
    outputPath: '',
    outputSize: '--',
    isSaving: false,
  },

  onLoad() {
    this._pattern = null
    this._history = []
    this._future = []
    this._canvasCache = {}
    this._strokeSnapshot = null
    this._strokeChanged = false
    this._lastStrokeCell = null
    this._patternRevision = 0
    this._imageRequestId = 0
  },

  onUnload() {
    if (this._drawTimer) clearTimeout(this._drawTimer)
    this._drawTimer = null
    this._canvasCache = {}
  },

  onChooseImage() {
    if (this.isPatternLocked()) return

    const requestId = this._imageRequestId + 1
    this._imageRequestId = requestId
    this.setData({ isLoadingImage: true })

    chooseImages().then((files) => {
      const file = files[0]

      if (!file || !file.tempFilePath) {
        if (requestId === this._imageRequestId) this.setData({ isLoadingImage: false })
        return
      }

      this.loadImage(file.tempFilePath, file.size, requestId)
    })
  },

  loadImage(filePath, knownSize, requestId) {
    wx.getImageInfo({
      src: filePath,
      success: (info) => {
        this.getFileSize(filePath, knownSize)
          .then((size) => {
            if (requestId !== this._imageRequestId) return
            this._imageInfo = {
              width: info.width,
              height: info.height,
            }
            this.clearPattern()
            this.setData({
              originalPath: filePath,
              originalSize: formatFileSize(size),
              originalDimensions: `${info.width} × ${info.height}`,
              hasImage: true,
              isLoadingImage: false,
            })
          })
          .catch(() => {
            if (requestId !== this._imageRequestId) return
            this.setData({ isLoadingImage: false })
            wx.showToast({ title: '读取图片失败', icon: 'none' })
          })
      },
      fail: () => {
        if (requestId !== this._imageRequestId) return
        this.setData({ isLoadingImage: false })
        wx.showToast({ title: '读取图片失败', icon: 'none' })
      },
    })
  },

  onGridPresetTap(event) {
    if (this.isPatternLocked()) return
    const value = Number(event.currentTarget.dataset.value)
    this.setData({
      selectedGridWidth: value,
      customGridWidth: String(value),
      isCustomGrid: false,
    })
  },

  onCustomGridInput(event) {
    if (this.isPatternLocked()) return
    const value = event.detail.value
    this.setData({
      customGridWidth: value,
      selectedGridWidth: Number(value) || 0,
      isCustomGrid: true,
    })
  },

  onColorLimitTap(event) {
    if (this.isPatternLocked()) return
    this.setData({
      colorLimit: Number(event.currentTarget.dataset.value),
    })
  },

  onToggleRemoveWhite() {
    if (this.isPatternLocked()) return
    this.setData({
      removeWhite: !this.data.removeWhite,
    })
  },

  onGenerate() {
    if (!this.data.originalPath || !this._imageInfo) {
      wx.showToast({ title: '请先选择图片', icon: 'none' })
      return
    }

    if (this.isPatternLocked()) return

    if (this.data.hasPattern && this.data.hasManualChanges) {
      wx.showModal({
        title: '重新生成图纸？',
        content: '重新生成会清除当前手工修改和撤销记录。',
        confirmText: '重新生成',
        success: (res) => {
          if (res.confirm) this.generateNow()
        },
      })
      return
    }

    this.generateNow()
  },

  generateNow() {
    if (this.isPatternLocked()) return
    const gridWidth = Math.round(Number(this.data.selectedGridWidth))
    if (gridWidth < 10 || gridWidth > 100) {
      wx.showToast({ title: '宽度请输入 10–100', icon: 'none' })
      return
    }

    const sourcePath = this.data.originalPath
    const imageInfo = { ...this._imageInfo }
    const gridHeight = Math.max(1, Math.round(
      gridWidth * imageInfo.height / imageInfo.width,
    ))

    if (gridHeight > MAX_GRID_HEIGHT) {
      wx.showToast({ title: '图片比例过长，请先裁剪原图', icon: 'none' })
      return
    }

    const generationOptions = {
      colorLimit: this.data.colorLimit,
      removeWhite: this.data.removeWhite,
    }

    this.setData({ isGenerating: true })

    this.getCanvas('#sourceCanvas')
      .then(({ canvas, ctx }) => this.loadCanvasImage(canvas, sourcePath)
        .then((image) => {
          canvas.width = gridWidth
          canvas.height = gridHeight
          ctx.clearRect(0, 0, gridWidth, gridHeight)
          ctx.drawImage(image, 0, 0, gridWidth, gridHeight)
          return ctx.getImageData(0, 0, gridWidth, gridHeight)
        }))
      .then((imageData) => generatePattern(imageData, gridWidth, gridHeight, {
        colorLimit: generationOptions.colorLimit,
        removeWhite: generationOptions.removeWhite,
      }))
      .then((pattern) => {
        if (!pattern.cells.length) {
          throw { userMessage: '去除白底后没有可用内容' }
        }

        this._pattern = pattern
        this._patternRevision = (this._patternRevision || 0) + 1
        this._history = []
        this._future = []
        const firstColor = pattern.stats[0]

        this.setData({
          isGenerating: false,
          hasPattern: true,
          hasManualChanges: false,
          hasExport: false,
          outputPath: '',
          outputSize: '--',
          activeTool: 'pan',
          selectedPaletteIndex: firstColor ? firstColor.paletteIndex : -1,
          selectedColorCode: firstColor ? firstColor.code : '选择颜色',
          selectedColorHex: firstColor ? firstColor.hex : '#dfe9e5',
          canUndo: false,
          canRedo: false,
          editorZoom: 1,
          editorCanvasLeft: 0,
          editorCanvasTop: 0,
        }, () => {
          this._editorFitCell = 0
          this._editorViewport = null
          this._editorCanvasLeft = null
          this._editorCanvasTop = null
          this.fitEditorView()
        })
      })
      .catch((error) => {
        this.setData({ isGenerating: false })
        wx.showToast({
          title: error && error.userMessage || '生成失败，请重试',
          icon: 'none',
        })
      })
  },

  clearPattern() {
    this._pattern = null
    this._patternRevision = (this._patternRevision || 0) + 1
    this._history = []
    this._future = []
    if (this._canvasCache) delete this._canvasCache['#editorCanvas']
    this.setData({
      hasPattern: false,
      patternDimensions: '--',
      totalBeads: 0,
      colorStats: [],
      hasManualChanges: false,
      hasExport: false,
      outputPath: '',
      outputSize: '--',
      canUndo: false,
      canRedo: false,
    })
  },

  refreshPatternView(options = {}) {
    if (!this._pattern) return
    const usage = getPatternStats(this._pattern.cells)
    this._pattern.stats = usage.stats
    this._pattern.totalBeads = usage.totalBeads

    const colorStats = usage.stats.map((item) => ({
      ...item,
      percent: usage.totalBeads
        ? `${(item.count * 100 / usage.totalBeads).toFixed(1)}%`
        : '0%',
      textColor: getContrastColor(item),
    }))
    const cellSize = (this._editorFitCell || BASE_EDITOR_CELL) * this.data.editorZoom
    const editorWidth = Math.max(1, Math.round(this._pattern.width * cellSize))
    const editorHeight = Math.max(1, Math.round(this._pattern.height * cellSize))
    const viewport = this._editorViewport || {
      width: editorWidth,
      height: editorHeight,
    }
    const bounds = this.getEditorPanBounds(editorWidth, editorHeight)
    let editorCanvasLeft = Number.isFinite(this._editorCanvasLeft)
      ? this._editorCanvasLeft
      : (viewport.width - editorWidth) / 2
    let editorCanvasTop = Number.isFinite(this._editorCanvasTop)
      ? this._editorCanvasTop
      : (viewport.height - editorHeight) / 2

    if (options.anchor) {
      editorCanvasLeft = (viewport.width / 2) - (options.anchor.x * editorWidth)
      editorCanvasTop = (viewport.height / 2) - (options.anchor.y * editorHeight)
    } else if (options.resetPosition) {
      editorCanvasLeft = (viewport.width - editorWidth) / 2
      editorCanvasTop = (viewport.height - editorHeight) / 2
    }

    editorCanvasLeft = Math.min(Math.max(bounds.minLeft, editorCanvasLeft), bounds.maxLeft)
    editorCanvasTop = Math.min(Math.max(bounds.minTop, editorCanvasTop), bounds.maxTop)
    this._editorCanvasLeft = editorCanvasLeft
    this._editorCanvasTop = editorCanvasTop

    this.setData({
      patternDimensions: `${this._pattern.width} × ${this._pattern.height} 格`,
      totalBeads: usage.totalBeads,
      colorStats,
      editorWidth,
      editorHeight,
      editorCanvasLeft,
      editorCanvasTop,
      canUndo: this._history.length > 0,
      canRedo: this._future.length > 0,
    }, () => this.drawEditor())
  },

  fitEditorView() {
    const pattern = this._pattern
    if (!pattern) return

    this.measureEditorViewport()
      .then((viewport) => {
        if (this._pattern !== pattern) return
        const availableWidth = Math.max(1, viewport.width - (EDITOR_FIT_PADDING * 2))
        const availableHeight = Math.max(1, viewport.height - (EDITOR_FIT_PADDING * 2))
        this._editorViewport = viewport
        this._editorFitCell = Math.max(0.1, Math.min(
          availableWidth / pattern.width,
          availableHeight / pattern.height,
        ))
        this._editorCanvasLeft = null
        this._editorCanvasTop = null
        this.setData({
          editorZoom: 1,
          editorCanvasLeft: 0,
          editorCanvasTop: 0,
        }, () => this.refreshPatternView({ resetPosition: true }))
      })
      .catch(() => {
        if (this._pattern !== pattern) return
        this._editorFitCell = BASE_EDITOR_CELL
        this.refreshPatternView()
      })
  },

  measureEditorViewport() {
    return new Promise((resolve, reject) => {
      this.createSelectorQuery()
        .select('.editor-scroll')
        .fields({ size: true })
        .exec((res) => {
          const rect = res && res[0]
          if (!rect || !rect.width || !rect.height) {
            reject(new Error('editor viewport not found'))
            return
          }
          resolve({ width: rect.width, height: rect.height })
        })
    })
  },

  getEditorPanBounds(editorWidth, editorHeight) {
    const viewport = this._editorViewport || {
      width: editorWidth,
      height: editorHeight,
    }
    const horizontalSpace = viewport.width - editorWidth
    const verticalSpace = viewport.height - editorHeight
    return {
      minLeft: Math.min(0, horizontalSpace),
      maxLeft: Math.max(0, horizontalSpace),
      minTop: Math.min(0, verticalSpace),
      maxTop: Math.max(0, verticalSpace),
    }
  },

  onToolTap(event) {
    const tool = event.currentTarget.dataset.tool
    if (tool === 'pen' && this.data.selectedPaletteIndex < 0) {
      this.openPalette()
      return
    }
    this.setData({ activeTool: tool })
  },

  onOpenPalette() {
    this.openPalette()
  },

  openPalette(replaceFromPaletteIndex = -1) {
    const replaceColor = replaceFromPaletteIndex >= 0
      ? MARD_PALETTE[replaceFromPaletteIndex]
      : null
    this.setData({
      showPalette: true,
      replaceFromPaletteIndex,
      paletteTitle: replaceColor
        ? `将 ${replaceColor.code} 整版替换为`
        : '选择 MARD 颜色',
    })
  },

  onClosePalette() {
    this.setData({
      showPalette: false,
      replaceFromPaletteIndex: -1,
    })
  },

  onPaletteBackdropTap() {
    this.onClosePalette()
  },

  onPaletteSheetTap() {},

  onPaletteColorTap(event) {
    const paletteIndex = Number(event.currentTarget.dataset.index)
    const color = MARD_PALETTE[paletteIndex]
    if (!color) return

    if (this.data.replaceFromPaletteIndex >= 0 && this._pattern) {
      if (this.isPatternLocked()) return
      const fromIndex = this.data.replaceFromPaletteIndex
      if (fromIndex !== paletteIndex) {
        this.pushHistory(this._pattern.cells.slice())
        this._pattern.cells = replacePatternColor(
          this._pattern.cells,
          fromIndex,
          paletteIndex,
        )
        this._future = []
        this.markManualChange()
      }
    }

    this.setData({
      selectedPaletteIndex: paletteIndex,
      selectedColorCode: color.code,
      selectedColorHex: color.hex,
      activeTool: 'pen',
      showPalette: false,
      replaceFromPaletteIndex: -1,
    }, () => {
      if (this._pattern) this.refreshPatternView()
    })
  },

  onStatTap(event) {
    if (this.isPatternLocked()) return
    this.openPalette(Number(event.currentTarget.dataset.index))
  },

  onZoomOut() {
    this.changeZoom(-EDITOR_ZOOM_STEP)
  },

  onZoomIn() {
    this.changeZoom(EDITOR_ZOOM_STEP)
  },

  changeZoom(offset) {
    const next = Math.min(Math.max(
      this.data.editorZoom + offset,
      MIN_EDITOR_ZOOM,
    ), MAX_EDITOR_ZOOM)
    if (next === this.data.editorZoom) return

    const viewport = this._editorViewport
    const anchor = viewport && this.data.editorWidth && this.data.editorHeight
      ? {
        x: Math.min(Math.max(
          ((viewport.width / 2) - this._editorCanvasLeft) / this.data.editorWidth,
          0,
        ), 1),
        y: Math.min(Math.max(
          ((viewport.height / 2) - this._editorCanvasTop) / this.data.editorHeight,
          0,
        ), 1),
      }
      : null

    this.setData({ editorZoom: Number(next.toFixed(1)) }, () => {
      this.refreshPatternView({ anchor })
    })
  },

  getEditorTouchPoint(touch) {
    if (!touch) return null
    const x = [touch.clientX, touch.pageX, touch.x].find(Number.isFinite)
    const y = [touch.clientY, touch.pageY, touch.y].find(Number.isFinite)
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
  },

  onEditorTouchStart(event) {
    if (!this._pattern || this.isPatternLocked()) return
    if (this.data.activeTool === 'pan') {
      const touch = event.touches && event.touches[0]
      const point = this.getEditorTouchPoint(touch)
      if (!point) return
      this._panTouch = {
        x: point.x,
        y: point.y,
        left: this._editorCanvasLeft || 0,
        top: this._editorCanvasTop || 0,
      }
      return
    }
    this._strokeSnapshot = this._pattern.cells.slice()
    this._strokeChanged = false
    this._lastStrokeCell = null
    this.applyTouch(event)
  },

  onEditorTouchMove(event) {
    if (this.data.activeTool === 'pan') {
      const touch = event.touches && event.touches[0]
      const point = this.getEditorTouchPoint(touch)
      if (!point || !this._panTouch) return
      const bounds = this.getEditorPanBounds(
        this.data.editorWidth,
        this.data.editorHeight,
      )
      const left = Math.min(Math.max(
        bounds.minLeft,
        this._panTouch.left + (point.x - this._panTouch.x),
      ), bounds.maxLeft)
      const top = Math.min(Math.max(
        bounds.minTop,
        this._panTouch.top + (point.y - this._panTouch.y),
      ), bounds.maxTop)
      this._editorCanvasLeft = left
      this._editorCanvasTop = top
      this.setData({
        editorCanvasLeft: left,
        editorCanvasTop: top,
      })
      return
    }
    this.applyTouch(event)
  },

  onEditorTouchEnd() {
    if (this.data.activeTool === 'pan') {
      this._panTouch = null
      return
    }
    if (this._strokeChanged && this._strokeSnapshot) {
      this.pushHistory(this._strokeSnapshot)
      this._future = []
      this.markManualChange()
      this.refreshPatternView()
    }
    this._strokeSnapshot = null
    this._strokeChanged = false
    this._lastStrokeCell = null
  },

  applyTouch(event) {
    const touch = event.touches && event.touches[0]
    if (!touch || !this._pattern) return
    const x = Number.isFinite(touch.x) ? touch.x : touch.clientX
    const y = Number.isFinite(touch.y) ? touch.y : touch.clientY
    const column = Math.floor(x * this._pattern.width / this.data.editorWidth)
    const row = Math.floor(y * this._pattern.height / this.data.editorHeight)

    if (column < 0 || row < 0 || column >= this._pattern.width || row >= this._pattern.height) return

    const cell = { column, row }
    if (this._lastStrokeCell) {
      this.applyStrokeLine(this._lastStrokeCell, cell)
    } else {
      this.applyPatternCell(column, row)
    }
    this._lastStrokeCell = cell
    this.scheduleEditorDraw()
  },

  applyStrokeLine(start, end) {
    let x = start.column
    let y = start.row
    const dx = Math.abs(end.column - start.column)
    const dy = Math.abs(end.row - start.row)
    const sx = start.column < end.column ? 1 : -1
    const sy = start.row < end.row ? 1 : -1
    let error = dx - dy

    while (true) {
      this.applyPatternCell(x, y)
      if (x === end.column && y === end.row) break
      const doubled = error * 2
      if (doubled > -dy) {
        error -= dy
        x += sx
      }
      if (doubled < dx) {
        error += dx
        y += sy
      }
    }
  },

  applyPatternCell(column, row) {
    const index = (row * this._pattern.width) + column
    const nextValue = this.data.activeTool === 'eraser'
      ? -1
      : this.data.selectedPaletteIndex
    if (nextValue < -1 || this._pattern.cells[index] === nextValue) return
    this._pattern.cells[index] = nextValue
    this._strokeChanged = true
  },

  scheduleEditorDraw() {
    if (this._drawTimer) return
    this._drawTimer = setTimeout(() => {
      this._drawTimer = null
      this.drawEditor()
    }, 16)
  },

  pushHistory(cells) {
    this._history.push(cells)
    if (this._history.length > MAX_HISTORY) this._history.shift()
  },

  onUndo() {
    if (!this._pattern || !this._history.length || this.isPatternLocked()) return
    this._future.push(this._pattern.cells.slice())
    this._pattern.cells = this._history.pop()
    this.markManualChange()
    this.refreshPatternView()
  },

  onRedo() {
    if (!this._pattern || !this._future.length || this.isPatternLocked()) return
    this.pushHistory(this._pattern.cells.slice())
    this._pattern.cells = this._future.pop()
    this.markManualChange()
    this.refreshPatternView()
  },

  markManualChange() {
    this._patternRevision = (this._patternRevision || 0) + 1
    this.setData({
      hasManualChanges: true,
      hasExport: false,
      outputPath: '',
      outputSize: '--',
      canUndo: this._history.length > 0,
      canRedo: this._future.length > 0,
    })
  },

  drawEditor() {
    if (!this._pattern || !this.data.hasPattern) return
    this.getCanvas('#editorCanvas')
      .then(({ canvas, ctx }) => {
        const width = this.data.editorWidth
        const height = this.data.editorHeight
        const renderScale = Math.min(
          this.getPixelRatio(),
          MAX_EDITOR_BACKING_SIDE / width,
          MAX_EDITOR_BACKING_SIDE / height,
        )
        canvas.width = Math.max(1, Math.round(width * renderScale))
        canvas.height = Math.max(1, Math.round(height * renderScale))
        ctx.scale(renderScale, renderScale)
        this.drawPatternGrid(ctx, {
          originX: 0,
          originY: 0,
          cellSize: width / this._pattern.width,
          showCodes: width / this._pattern.width >= 27,
          beadStyle: true,
        })
      })
      .catch(() => {})
  },

  drawPatternGrid(ctx, options) {
    const { originX, originY, cellSize, showCodes, beadStyle } = options
    const pattern = this._pattern
    const fontSize = Math.max(7, Math.floor(cellSize * 0.28))
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `600 ${fontSize}px sans-serif`

    pattern.cells.forEach((paletteIndex, index) => {
      const column = index % pattern.width
      const row = Math.floor(index / pattern.width)
      const x = originX + (column * cellSize)
      const y = originY + (row * cellSize)

      if (paletteIndex < 0) {
        ctx.fillStyle = (column + row) % 2 ? '#f7eee8' : '#ffffff'
        ctx.fillRect(x, y, cellSize, cellSize)
      } else {
        const color = MARD_PALETTE[paletteIndex]
        ctx.fillStyle = color.hex
        ctx.fillRect(x, y, cellSize, cellSize)

        if (beadStyle && cellSize >= 12) {
          ctx.beginPath()
          ctx.fillStyle = 'rgba(255, 255, 255, 0.42)'
          ctx.arc(x + (cellSize / 2), y + (cellSize / 2), Math.max(1.2, cellSize * 0.12), 0, Math.PI * 2)
          ctx.fill()
        }

        if (showCodes) {
          ctx.fillStyle = getContrastColor(color)
          ctx.fillText(color.code, x + (cellSize / 2), y + (cellSize / 2))
        }
      }

      ctx.strokeStyle = (column % 5 === 0 || row % 5 === 0)
        ? 'rgba(112, 56, 40, 0.32)'
        : 'rgba(112, 56, 40, 0.14)'
      ctx.lineWidth = (column % 5 === 0 || row % 5 === 0) ? 1 : 0.5
      ctx.strokeRect(x, y, cellSize, cellSize)
    })
  },

  onExport() {
    if (!this._pattern || this.isPatternLocked()) {
      if (!this._pattern) wx.showToast({ title: '请先生成图纸', icon: 'none' })
      return
    }

    const exportRevision = this._patternRevision || 0
    this.setData({ isExporting: true })
    this.getCanvas('#exportCanvas')
      .then(({ canvas, ctx }) => this.renderExport(canvas, ctx))
      .then((path) => this.getFileSize(path).then((size) => ({ path, size })))
      .then(({ path, size }) => {
        if (exportRevision !== (this._patternRevision || 0)) {
          throw { userMessage: '图纸已变化，请重新导出' }
        }
        this.setData({
          isExporting: false,
          hasExport: true,
          outputPath: path,
          outputSize: formatFileSize(size),
        })
      })
      .catch((error) => {
        this.setData({ isExporting: false })
        wx.showToast({
          title: error && error.userMessage || '导出失败，请重试',
          icon: 'none',
        })
      })
  },

  renderExport(canvas, ctx) {
    const pattern = this._pattern
    const stats = getPatternStats(pattern.cells).stats
    const margin = 40
    const headerHeight = 94
    const coordinateSize = 34
    const legendColumns = stats.length > 80
      ? 5
      : (stats.length > 36 ? 4 : (pattern.width < 20 ? 2 : 3))
    const legendRowHeight = 42
    const legendRows = Math.ceil(stats.length / legendColumns)
    const legendHeight = stats.length ? 54 + (legendRows * legendRowHeight) : 0
    const verticalRoom = MAX_EXPORT_SIDE - (margin * 2) - headerHeight - coordinateSize - legendHeight
    const horizontalRoom = MAX_EXPORT_SIDE - (margin * 2) - coordinateSize
    const cellSize = Math.floor(Math.min(
      36,
      horizontalRoom / pattern.width,
      verticalRoom / pattern.height,
    ))

    if (cellSize < 12) {
      return Promise.reject({ userMessage: '图纸过大，请减少网格尺寸' })
    }

    const gridWidth = pattern.width * cellSize
    const gridHeight = pattern.height * cellSize
    const legendMinimumWidth = legendColumns * 230
    const width = Math.ceil(Math.min(
      MAX_EXPORT_SIDE,
      Math.max(
        (margin * 2) + coordinateSize + gridWidth,
        (margin * 2) + legendMinimumWidth,
      ),
    ))
    const height = Math.ceil((margin * 2) + headerHeight + coordinateSize + gridHeight + legendHeight)
    const gridX = Math.max(
      margin + coordinateSize,
      Math.round((width - gridWidth + coordinateSize) / 2),
    )
    const gridY = margin + headerHeight + coordinateSize

    canvas.width = width
    canvas.height = height
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = '#8f3f2e'
    ctx.font = '700 34px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('拼豆图纸 · MARD 221 色板', margin, margin)
    ctx.fillStyle = '#806b63'
    ctx.font = '500 18px sans-serif'
    ctx.fillText(
      `${pattern.width} × ${pattern.height} 格  ·  ${pattern.totalBeads} 颗  ·  ${stats.length} 种颜色`,
      margin,
      margin + 48,
    )

    ctx.fillStyle = '#7c6860'
    ctx.font = '600 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let column = 0; column < pattern.width; column += 1) {
      if (pattern.width > 52 && column % 5 !== 0) continue
      ctx.fillText(String(column + 1), gridX + (column * cellSize) + (cellSize / 2), gridY - 17)
    }
    ctx.textAlign = 'right'
    for (let row = 0; row < pattern.height; row += 1) {
      if (pattern.height > 52 && row % 5 !== 0) continue
      ctx.fillText(String(row + 1), gridX - 9, gridY + (row * cellSize) + (cellSize / 2))
    }

    this.drawPatternGrid(ctx, {
      originX: gridX,
      originY: gridY,
      cellSize,
      showCodes: cellSize >= 22,
      beadStyle: false,
    })

    if (stats.length) {
      const legendY = gridY + gridHeight + 34
      const legendX = margin
      const columnWidth = (width - (margin * 2)) / legendColumns
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#8f3f2e'
      ctx.font = '700 22px sans-serif'
      ctx.fillText('MARD 色号用量', legendX, legendY)

      stats.forEach((item, index) => {
        const column = index % legendColumns
        const row = Math.floor(index / legendColumns)
        const x = legendX + (column * columnWidth)
        const y = legendY + 34 + (row * legendRowHeight)
        ctx.fillStyle = item.hex
        ctx.fillRect(x, y, 28, 28)
        ctx.strokeStyle = '#ead8ce'
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, 28, 28)
        ctx.fillStyle = '#3d2a25'
        ctx.font = '600 16px sans-serif'
        ctx.fillText(`${item.code}  ${item.count} 颗`, x + 38, y + 14)
      })
    }

    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas,
        destWidth: width,
        destHeight: height,
        fileType: 'png',
        success: (res) => resolve(res.tempFilePath),
        fail: reject,
      }, this)
    })
  },

  onPreviewExport() {
    if (!this.data.outputPath) return
    wx.previewImage({
      current: this.data.outputPath,
      urls: [this.data.outputPath],
    })
  },

  onSave() {
    if (!this.data.outputPath) {
      wx.showToast({ title: '请先导出图纸', icon: 'none' })
      return
    }
    if (this.data.isSaving || this.data.isExporting || this.data.isGenerating) return

    this.setData({ isSaving: true })
    saveImageToAlbum({
      filePath: this.data.outputPath,
      permissionText: '打开权限后，就能把拼豆图纸保存到相册。',
    })
      .then(() => {
        this.setData({ isSaving: false })
        wx.showToast({ title: '已保存到相册', icon: 'success' })
      })
      .catch((error) => {
        this.setData({ isSaving: false })
        if ((error && error.handled) || isSaveCancel(error)) return
        wx.showToast({
          title: error && error.userMessage || '保存失败',
          icon: 'none',
        })
      })
  },

  getCanvas(selector) {
    if (this._canvasCache[selector]) return Promise.resolve(this._canvasCache[selector])

    return new Promise((resolve, reject) => {
      this.createSelectorQuery()
        .select(selector)
        .fields({ node: true, size: true })
        .exec((res) => {
          const canvas = res && res[0] && res[0].node
          if (!canvas) {
            reject(new Error(`${selector} not found`))
            return
          }
          const value = { canvas, ctx: canvas.getContext('2d') }
          this._canvasCache[selector] = value
          resolve(value)
        })
    })
  },

  isPatternLocked() {
    return (
      this.data.isLoadingImage ||
      this.data.isGenerating ||
      this.data.isExporting ||
      this.data.isSaving
    )
  },

  loadCanvasImage(canvas, src) {
    return new Promise((resolve, reject) => {
      const image = canvas.createImage()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = src
    })
  },

  getPixelRatio() {
    try {
      if (wx.getWindowInfo) return wx.getWindowInfo().pixelRatio || 1
      return wx.getSystemInfoSync().pixelRatio || 1
    } catch (error) {
      return 1
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

  onShareAppMessage() {
    return {
      title: '把图片转换成可编辑的 MARD 拼豆图纸',
      path: '/pages/pindou/pindou',
    }
  },

  onShareTimeline() {
    return {
      title: '拼豆工具：图片本地生成 MARD 色号图纸',
      query: '',
    }
  },
})
