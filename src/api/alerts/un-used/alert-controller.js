/* eslint-disable */
import { User } from '~/src/api/alerts/models/alert-schemas.js'
import { config } from '~/src/config'

const alertsController = {
  handler: async (request, h) => {
    const { email, phoneNumber, location, alertType } = request.payload
    const allowOriginUrl = config.get('allowOriginUrl')

    if (!email && !phoneNumber) {
      return h
        .response({ error: 'Email or phone number is required' })
        .code(400)
    }

    const newUser = new User({ email, phoneNumber, location, alertType })
    await newUser.save()
    return h
      .response({ message: 'User registered for alerts successfully', newUser })
      .code(201)
      .header('Access-Control-Allow-Origin', allowOriginUrl)
  }
}

export { alertsController }
