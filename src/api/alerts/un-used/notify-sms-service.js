/**
 * Send an sms using GOV.UK Notify
 * @module NotifySmsService
 */

const NotifyClient = require('notifications-node-client').NotifyClient

/**
 * Send an sms using GOV.UK Notify
 *
 * @param {string} templateId
 * @param {string} phoneNumber
 * @param {object} options
 *
 * @returns {Promise<object>}
 */
async function notifySms(templateId, phoneNumber, options) {
  const notifyClient = new NotifyClient('notifyAPIKey')

  return _sendSms(notifyClient, templateId, phoneNumber, options)
}

async function _sendSms(notifyClient, templateId, phoneNumber, options) {
  try {
    const response = await notifyClient.sendSms(
      templateId,
      phoneNumber,
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

export { notifySms }
