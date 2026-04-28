const { isSaveCancel, saveImageToAlbum } = require('../../utils/image-save')

Page({
  data: {
    inputValue: '',
    qrValue: '',
    logoPath: '',
    canGenerate: false,
    hasGenerated: false,
    isSaving: false,
    qrSize: 240,
    iconSize: 52,
  },

  onInput(event) {
    const inputValue = event.detail.value || ''

    this.setData({
      inputValue,
      canGenerate: inputValue.trim().length > 0,
    })
  },

  onGenerate() {
    const qrValue = this.data.inputValue.trim()

    if (!qrValue) {
      wx.showToast({
        title: '请先填写内容',
        icon: 'none',
      })
      return
    }

    this.setData({
      qrValue,
      hasGenerated: true,
    })
  },

  onChooseLogo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]

        if (!file || !file.tempFilePath) return

        this.setData({
          logoPath: file.tempFilePath,
        })
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

  onRemoveLogo() {
    this.setData({
      logoPath: '',
    })
  },

  onSave() {
    if (!this.data.hasGenerated) {
      wx.showToast({
        title: '请先生成二维码',
        icon: 'none',
      })
      return
    }

    if (this.data.isSaving) return

    const qrcode = this.selectComponent('#qrcodePreview')
    const canvas = qrcode && qrcode.data && qrcode.data.canvasNode

    if (!canvas) {
      wx.showToast({
        title: '二维码准备中',
        icon: 'none',
      })
      return
    }

    this.setData({
      isSaving: true,
    })

    wx.canvasToTempFilePath({
      canvas,
      success: (res) => {
        this.composePoster(res.tempFilePath)
      },
      fail: () => {
        this.setData({
          isSaving: false,
        })
        wx.showToast({
          title: '生成图片失败',
          icon: 'none',
        })
      },
    }, qrcode)
  },

  composePoster(qrPath) {
    this.getPosterCanvas()
      .then(({ canvas, ctx }) => this.drawPoster(canvas, ctx, qrPath))
      .then((posterPath) => {
        this.saveImage(posterPath)
      })
      .catch(() => {
        this.setData({
          isSaving: false,
        })
        wx.showToast({
          title: '生成图片失败',
          icon: 'none',
        })
      })
  },

  getPosterCanvas() {
    return new Promise((resolve, reject) => {
      this.createSelectorQuery()
        .select('#posterCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          const canvas = res && res[0] && res[0].node

          if (!canvas) {
            reject(new Error('canvas not found'))
            return
          }

          const ctx = canvas.getContext('2d')

          resolve({ canvas, ctx })
        })
    })
  },

  drawPoster(canvas, ctx, qrPath) {
    return new Promise((resolve, reject) => {
      const width = 900
      const height = 900
      const qrImage = canvas.createImage()

      canvas.width = width
      canvas.height = height

      qrImage.onload = () => {
        this.paintPoster(ctx, qrImage, width, height)

        wx.canvasToTempFilePath({
          canvas,
          destWidth: width,
          destHeight: height,
          fileType: 'png',
          success: (res) => resolve(res.tempFilePath),
          fail: reject,
        }, this)
      }

      qrImage.onerror = reject
      qrImage.src = qrPath
    })
  },

  paintPoster(ctx, qrImage, width, height) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    this.drawRoundRect(ctx, 90, 90, 720, 720, 42)
    ctx.strokeStyle = '#dcebe5'
    ctx.lineWidth = 4
    ctx.stroke()

    ctx.drawImage(qrImage, 150, 150, 600, 600)
  },

  drawRoundRect(ctx, x, y, width, height, radius) {
    const right = x + width
    const bottom = y + height

    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(right - radius, y)
    ctx.quadraticCurveTo(right, y, right, y + radius)
    ctx.lineTo(right, bottom - radius)
    ctx.quadraticCurveTo(right, bottom, right - radius, bottom)
    ctx.lineTo(x + radius, bottom)
    ctx.quadraticCurveTo(x, bottom, x, bottom - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  },

  saveImage(filePath) {
    saveImageToAlbum({
      filePath,
      permissionText: '打开权限后就能保存二维码图片。',
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

        if ((error && error.handled) || isSaveCancel(error)) {
          return
        }

        wx.showToast({
          title: '保存失败',
          icon: 'none',
        })
      })
  },
})
