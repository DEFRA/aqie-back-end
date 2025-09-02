import { config } from '../../../config/index.js'

// Helper to fetch OAuth token
async function fetchOAuthToken(catchProxyFetchError, logger) {
  const ricardoApiLoginUrl = config.get('ricardoApiLoginUrl')
  const ricardoApiEmail = config.get('ricardoApiEmail')
  const ricardoApiPassword = config.get('ricardoApiPassword')

  const optionsOAuthRicardo = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: ricardoApiEmail,
      password: ricardoApiPassword
    })
  }

  try {
    logger.info(`Attempting OAuth login to: ${ricardoApiLoginUrl}`)
    logger.info(`Using email: ${ricardoApiEmail}`)
    logger.info(
      `Request body: ${JSON.stringify({ email: ricardoApiEmail, password: '***' })}`
    )

    const [statusCodeToken, dataToken] = await catchProxyFetchError(
      ricardoApiLoginUrl,
      optionsOAuthRicardo
    )

    logger.info(`OAuth response status: ${statusCodeToken}`)
    logger.info(`OAuth response data: ${JSON.stringify(dataToken)}`)

    if (statusCodeToken !== 200) {
      throw new Error(
        `Error fetching OAuth token: HTTP ${statusCodeToken} - ${JSON.stringify(dataToken)}`
      )
    }

    if (!dataToken || !dataToken.token) {
      throw new Error(
        `Invalid OAuth response: missing token field in ${JSON.stringify(dataToken)}`
      )
    }

    const accessToken = dataToken.token
    logger.info('OAuth token fetched successfully')
    return accessToken
  } catch (error) {
    logger.error(`Error fetching OAuth token: ${error.message}`)
    logger.error(`Error stack: ${error.stack}`)
    return null
  } finally {
    logger.info('Completed fetchOAuthTokenNewRicardoAPI execution')
  }
}

// Helper to refresh OAuth token and store in session
async function refreshOAuthToken(
  request,
  fetchOAuthToken,
  catchProxyFetchError,
  logger
) {
  try {
    logger.info('Attempting to refresh OAuth token')
    const accessToken = await fetchOAuthToken(catchProxyFetchError, logger)

    if (!accessToken) {
      logger.error('Failed to get access token from fetchOAuthToken')
      return null
    }

    // Clear any existing token and set the new one
    request.yar.clear('savedAccessToken')
    request.yar.set('savedAccessToken', accessToken)
    logger.info('Access token stored in session successfully')
    return accessToken
  } catch (error) {
    logger.error(`Error in refreshOAuthToken: ${error.message}`)
    return null
  }
}

export { fetchOAuthToken, refreshOAuthToken }
