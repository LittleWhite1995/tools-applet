const getPlatform = () => {
  try {
    const deviceInfo = wx.getDeviceInfo ? wx.getDeviceInfo() : null

    if (deviceInfo && deviceInfo.platform) {
      return String(deviceInfo.platform).toLowerCase()
    }

    const systemInfo = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {}
    return String(systemInfo.platform || '').toLowerCase()
  } catch (error) {
    return ''
  }
}

const isDesktopPlatform = () => {
  const platform = getPlatform()

  return ['windows', 'mac', 'devtools'].includes(platform)
}

module.exports = {
  getPlatform,
  isDesktopPlatform,
}
