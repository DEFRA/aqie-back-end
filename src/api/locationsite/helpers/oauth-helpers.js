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
    const [statusCodeToken, dataToken] = await catchProxyFetchError(
      ricardoApiLoginUrl,
      optionsOAuthRicardo
    )
    logger.info(`Response from Postman API: ${JSON.stringify(dataToken)}`)
    logger.info(`optionsOAuthRicardo: ${JSON.stringify(optionsOAuthRicardo)}`)
    if (statusCodeToken !== 200) {
      throw new Error(
        `Error fetching OAuth token via Postman API: ${statusCodeToken}`
      )
    }
    const accessToken = dataToken.token // Adjust according to the actual token key in the response
    logger.info('OAuth token fetched successfully via Postman API.')
    return accessToken
  } catch (error) {
    logger.error(`Error fetching OAuth token via Postman API: ${error.message}`)
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
  const accessToken = await fetchOAuthToken(catchProxyFetchError, logger)
  request.yar.clear('savedAccessToken')
  request.yar.set('savedAccessToken', accessToken)
  return accessToken
}

export { fetchOAuthToken, refreshOAuthToken }
