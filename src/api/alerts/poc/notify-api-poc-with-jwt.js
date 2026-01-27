const axios = require('axios')
const jwt = require('jsonwebtoken')

//const dummyEmails = Array.from({ length: 50 }, (_, i) => `test${i}@example.com`);

const emailToUse = 'saranya.vinayagam@cognizant.com'
const numberOfEmails = 10
const dummyEmails = Array.from({ length: numberOfEmails }, () => emailToUse)

const notifyAPI = 'https://api.notifications.service.gov.uk'
const iss = '7536f7da-f08e-46ed-8693-dada56a5eb7b'
const secretKey = '0aad529b-f8ac-4395-886f-c283cb2b3ab2'
const alertType = 'email'
const templateId = 'e0428e5f-7b16-468f-bebb-63ad058a1c13'

async function generateDynamicToken(iss, secretKey) {
  const iat = Math.floor(Date.now() / 1000)
  const payload = { iss: iss, iat: iat }
  const token = jwt.sign(payload, secretKey, { algorithm: 'HS256' })
  return token
}

async function sendNotifyRequest(email, token) {
  try {
    const payload = {
      email_address: email,
      templateId
    }
    const response = await axios.post(
      `${notifyAPI}/v2/notifications/${alertType}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (response.status !== 200 && response.status !== 201) {
      console.error(
        `Error sending email to ${email}:`,
        response.status,
        response.data
      )
    } else {
      console.log(`Email to ${email} sent successfully.`)
    }

    return response
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.log(`Rate Limit Error for ${email}`)
    } else {
      console.error(`Error sending email to ${email}:`, error.message)
    }
    return null
  }
}

async function runPOC() {
  const startTime = Date.now()
  let successCount = 0
  let rateLimitCount = 0

  for (const email of dummyEmails) {
    const token = await generateDynamicToken(iss, secretKey) // Generate token for each request
    const response = await sendNotifyRequest(email, token)
    if (response && (response.status === 200 || response.status === 201)) {
      successCount++
    }
    if (!response) {
      rateLimitCount++
    }
  }

  const endTime = Date.now()
  const elapsedTime = (endTime - startTime) / 1000

  console.log(`POC Results:`)
  console.log(`  Emails sent successfully: ${successCount}`)
  console.log(`  Rate Limit Errors: ${rateLimitCount}`)
  console.log(`  Total time taken: ${elapsedTime} seconds`)
}

runPOC()
