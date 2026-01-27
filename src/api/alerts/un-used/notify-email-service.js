/**
 * Send an email using GOV.UK Notify
 * @module NotifyEmailService
 */

const NotifyClient = require('notifications-node-client').NotifyClient

/**
 * Send an email using GOV.UK Notify
 *
 * @param {string} templateId
 * @param {string} emailAddress
 * @param {object} options
 *
 * @returns {Promise<object>}
 */
async function notifyEmail(templateId, emailAddress, options) {
  const notifyClient = new NotifyClient('notifyAPIKey')

  return _sendEmail(notifyClient, templateId, emailAddress, options)
}

async function _sendEmail(notifyClient, templateId, emailAddress, options) {
  try {
    const response = await notifyClient.sendEmail(
      templateId,
      emailAddress,
      options
    )

    return {
      status: response.status,
      id: response.data.id
    }
  } catch (error) {
    return {
      status: error.status,
      message: error.message,
      errors: error.response.data.errors
    }
  }
}

export { notifyEmail }
