const { NotifyClient } = require('notifications-node-client')

const apiKey =
  'team-7536f7da-f08e-46ed-8693-dada56a5eb7b-0aad529b-f8ac-4395-886f-c283cb2b3ab2'
const notifyClient = new NotifyClient(apiKey)

const emailToUse = 'Saranya.Vinayagam@cognizant.com'
//Tasha.Symons@defra.gov.uk
//Jodie.Coverdale@defra.gov.uk
//Phil.Isaac@defra.gov.uk
const numberOfEmails = 10
const dummyEmails = Array.from({ length: numberOfEmails }, () => emailToUse)

//const templateId = 'e0428e5f-7b16-468f-bebb-63ad058a1c13'
const templateId = 'e0f99bcc-0e23-48b8-927c-ff7f5c2180e6'

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

async function sendNotifyRequest(email) {
  try {
    console.log(personalisation)
    const response = await notifyClient.sendEmail(templateId, email, {
      personalisation
    })
    console.log(`Email to ${email} sent successfully:`, response.data)
    return response
  } catch (err) {
    if (err.response && err.response.data) {
      if (err.response.data.status_code === 429) {
        console.log(`Rate Limit Error for ${email}`)
      } else {
        console.error(`Error sending email to ${email}:`, {
          statusCode: err.response.data.status_code,
          errors: err.response.data.errors
        })
      }
    } else {
      console.error(`Unexpected Error for ${email}:`, err) // Logging unexpected errors
    }
    return null
  }
}

async function runPOC() {
  const startTime = Date.now()
  let successCount = 0
  let rateLimitCount = 0

  // await Promise.all(dummyEmails.map(sendNotifyRequest))

  for (const email of dummyEmails) {
    try {
      const response = await sendNotifyRequest(email)
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
    await new Promise((resolve) => setTimeout(resolve, 1000)) // 1 second delay
  }

  const endTime = Date.now()
  const elapsedTime = (endTime - startTime) / 1000

  console.log(`POC Results:`)
  console.log(`  Emails sent successfully: ${successCount}`)
  console.log(`  Rate Limit Errors: ${rateLimitCount}`)
  console.log(`  Total time taken: ${elapsedTime} seconds`)
}

runPOC()
