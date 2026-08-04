const { getApiBaseUrl } = require('../config/api')

const MODERATION_PATH = '/file/image/moderation'
const UPLOAD_FIELD_NAME = 'multipartFile'
const MAX_CONCURRENCY = 9
const MODERATION_TIMEOUT = 15000
const RISK_LEVELS = ['low', 'medium', 'high']

const createModerationError = (code, message) => {
  const error = new Error(message)
  error.name = 'ImageModerationError'
  error.code = code
  return error
}

const createServiceError = (message) => createModerationError(
  'image_moderation_failed',
  message || '图片安全检测失败',
)

const parseResponse = (response) => {
  if (!response || response.statusCode < 200 || response.statusCode >= 300) {
    throw createServiceError('图片安全检测服务响应异常')
  }

  let body

  try {
    body = typeof response.data === 'string'
      ? JSON.parse(response.data)
      : response.data
  } catch (error) {
    throw createServiceError('图片安全检测结果解析失败')
  }

  if (!body || body.code !== 200 || !body.data) {
    throw createServiceError(body && body.message)
  }

  const riskLevel = body.data.riskLevel

  if (riskLevel === 'none') return

  if (RISK_LEVELS.includes(riskLevel)) {
    throw createModerationError('unsafe_image', '图片未通过安全检测')
  }

  throw createServiceError('图片安全检测结果不完整')
}

const moderateImage = (file, timeout) => new Promise((resolve, reject) => {
  if (!file || !file.tempFilePath) {
    reject(createServiceError('未获取到待检测图片'))
    return
  }

  let completed = false
  let uploadTask = null

  const complete = (callback, value) => {
    if (completed) return

    completed = true
    clearTimeout(timeoutTimer)
    callback(value)
  }

  const timeoutTimer = setTimeout(() => {
    if (completed) return

    completed = true

    if (uploadTask && typeof uploadTask.abort === 'function') {
      try {
        uploadTask.abort()
      } catch (error) {
        console.warn('[image-moderation] abort upload failed', error)
      }
    }

    reject(createServiceError('图片安全检测请求超时'))
  }, timeout)

  try {
    uploadTask = wx.uploadFile({
      url: `${getApiBaseUrl()}${MODERATION_PATH}`,
      filePath: file.tempFilePath,
      name: UPLOAD_FIELD_NAME,
      success: (response) => {
        try {
          parseResponse(response)
          complete(resolve)
        } catch (error) {
          complete(reject, error)
        }
      },
      fail: (error) => {
        complete(reject, createServiceError(error && error.errMsg))
      },
    })
  } catch (error) {
    complete(reject, createServiceError(error && error.message))
  }
})

const moderateImages = (files, options = {}) => {
  if (!Array.isArray(files) || !files.length) {
    return Promise.reject(createServiceError('未获取到待检测图片'))
  }

  const timeout = Number.isInteger(options.timeout) && options.timeout > 0
    ? options.timeout
    : MODERATION_TIMEOUT
  const onProgress = typeof options.onProgress === 'function'
    ? options.onProgress
    : null
  let nextIndex = 0
  let completedCount = 0
  let riskError = null
  let serviceError = null
  const workerCount = Math.min(MAX_CONCURRENCY, files.length)

  const worker = () => {
    if (riskError || serviceError || nextIndex >= files.length) {
      return Promise.resolve()
    }

    const currentIndex = nextIndex
    nextIndex += 1

    return moderateImage(files[currentIndex], timeout)
      .catch((error) => {
        if (error && error.code === 'unsafe_image') {
          riskError = error
          return
        }

        serviceError = serviceError || error
      })
      .then(() => {
        completedCount += 1

        if (onProgress) {
          onProgress(completedCount, files.length)
        }
      })
      .then(worker)
  }

  const workers = []

  for (let index = 0; index < workerCount; index += 1) {
    workers.push(worker())
  }

  return Promise.all(workers).then(() => {
    if (riskError) throw riskError

    if (serviceError) throw serviceError

    return files
  })
}

module.exports = {
  moderateImages,
}
