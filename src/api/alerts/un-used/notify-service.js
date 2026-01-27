/* eslint-disable */
import { proxyFetch } from '~/src/helpers/proxy-fetch'
import { NotificationLog } from '~/src/api/alerts/models/alert-schemas'
import { jwt } from 'jsonwebtoken'

async function generateDynamicToken(iss, secretKey) {
  const iat = Math.floor(Date.now() / 1000) // Get current Unix timestamp
  const payload = {
    iss: iss,
    iat: iat
  }

  const token = jwt.sign(payload, secretKey, { algorithm: 'HS256' })
  return token
}

async function sendNotification(user, forecastValue) {
  const notifyAPI = process.env.NOTIFY_API_URL
  const iss = process.env.NOTIFY_ISS_KEY
  const secretKey = process.env.NOTIFY_SECRET_KEY

  let payload
  if (user.alertType === 'email') {
    payload = {
      email_address: user.email,
      template_id: process.env.EMAIL_TEMPLATE_ID,
      personalisation: { location: user.location, forecastValue }
    }
  } else {
    payload = {
      phone_number: user.phoneNumber,
      template_id: process.env.SMS_TEMPLATE_ID,
      personalisation: { location: user.location, forecastValue }
    }
  }

  try {
    const apiKey = await generateDynamicToken(iss, secretKey)
    const response = await proxyFetch(
      `${notifyAPI}/v2/notifications/${user.alertType}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    )

    const result = await response.json()
    if (!response.ok) {
      throw new Error(
        `Notify API Error: ${result.errors?.[0]?.message || 'Unknown'}`
      )
    }
    await NotificationLog.create({
      userId: user._id,
      location: user.location,
      forecastValue,
      notificationType: user.alertType,
      status: 'created'
    })

    console.log(
      `Notification sent successfully to ${user.alertType === 'email' ? user.email : user.phoneNumber}`
    )
  } catch (error) {
    console.error('Notification failed:', error)

    await NotificationLog.create({
      userId: user._id,
      location: user.location,
      forecastValue,
      notificationType: user.alertType,
      status: 'failed'
    })
  }
}

module.exports = { sendNotification }
