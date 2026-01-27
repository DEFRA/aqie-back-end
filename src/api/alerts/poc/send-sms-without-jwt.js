const { NotifyClient } = require('notifications-node-client')

const apiKey =
  'team-7536f7da-f08e-46ed-8693-dada56a5eb7b-0aad529b-f8ac-4395-886f-c283cb2b3ab2'
const notifyClient = new NotifyClient(apiKey)

const phoneNumber = '+447469296586'

//const templateId = 'e0428e5f-7b16-468f-bebb-63ad058a1c13'
const templateId = 'f6588ea4-b354-4562-ade4-4cd757d2b04f'
// const personalisation = {
//   items: [
//     {
//       locationName: 'London',
//       url: 'https://aqie-front-end.dev.cdp-int.defra.cloud/search-location?lang=en'
//     },
//     {
//       locationName: 'Slough',
//       url: 'https://aqie-front-end.dev.cdp-int.defra.cloud/search-location?lang=en'
//     },
//     {
//       locationName: 'Staines',
//       url: 'https://aqie-front-end.dev.cdp-int.defra.cloud/search-location?lang=en'
//     },
//     {
//       locationName: 'Egham',
//       url: 'https://aqie-front-end.dev.cdp-int.defra.cloud/search-location?lang=en'
//     }
//   ]
// }

const items = [
  {
    location: 'London',
    url: 'https://check-air-quality.service.gov.uk/location/london-city-airport_newham?lang=en'
  },
  {
    location: 'Staines',
    url: 'https://check-air-quality.service.gov.uk/location/staines_spelthorne'
  }
]

const formattedItems = items
  .map((item) => `- [${item.location}](${item.url})`)
  .join('\n')

const personalisation = {
  required_details: formattedItems
}

async function sendNotifyRequest(phoneNumber) {
  try {
    console.log(personalisation)
    const response = await notifyClient.sendSms(templateId, phoneNumber, {
      personalisation
    })
    console.log(
      `Text message to ${phoneNumber} sent successfully:`,
      response.data
    )
    return response
  } catch (err) {
    if (err.response && err.response.data) {
      if (err.response.data.status_code === 429) {
        console.log(`Rate Limit Error for ${phoneNumber}`)
      } else {
        console.error(`Error sending text message to ${phoneNumber}:`, {
          statusCode: err.response.data.status_code,
          errors: err.response.data.errors
        })
      }
    } else {
      console.error(`Unexpected Error for ${phoneNumber}:`, err) // Logging unexpected errors
    }
    return null
  }
}

async function runPOC() {
  const startTime = Date.now()
  let successCount = 0
  let rateLimitCount = 0
  try {
    const response = await sendNotifyRequest(phoneNumber)
    if (response && response.data) {
      successCount++
    }
  } catch (err) {
    if (err.response.data.status_code === 429) {
      rateLimitCount++
    } else {
      console.error('General Error', err)
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
