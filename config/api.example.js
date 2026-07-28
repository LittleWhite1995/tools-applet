const API_BASE_URLS = {
  develop: 'http://YOUR_TEST_HOST:PORT',
  trial: 'http://YOUR_TEST_HOST:PORT',
  release: 'https://YOUR_PRODUCTION_DOMAIN',
}

const getEnvVersion = () => {
  try {
    const accountInfo = wx.getAccountInfoSync()
    return accountInfo
      && accountInfo.miniProgram
      && accountInfo.miniProgram.envVersion
  } catch (error) {
    console.error('[api-config] get account info failed', error)
    return ''
  }
}

const getApiBaseUrl = () => API_BASE_URLS[getEnvVersion()] || API_BASE_URLS.release

module.exports = {
  getApiBaseUrl,
}
