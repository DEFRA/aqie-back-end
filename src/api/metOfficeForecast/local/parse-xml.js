import xml2js from 'xml2js'
import dayjs from 'dayjs'
import fs from 'fs'
import SFTPClient from 'ssh2-sftp-client'
import hapi from '@hapi/hapi'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)
const init = async () => {
  const server = hapi.server({
    port: 3002,
    host: 'localhost'
  })

  server.route({
    method: 'GET',
    path: '/sftp/file/{filename}',
    handler: async (request, h) => {
      const sftp = new SFTPClient()

      const config = {
        host: 'sftp22.sftp-defra-gov-uk.quatrix.it',
        port: 22,
        username: 'q2031671',
        privateKey: fs.readFileSync('C:/Users/486272/.ssh/met_office_rsa_v1') // Replace with correct path
      }

      const { filename } = request.params
      const remoteDir = '/Incoming Shares/AQIE/MetOffice/'

      try {
        await sftp.connect(config)

        const fileBuffer = await sftp.get(`${remoteDir}${filename}`)
        await sftp.end()

        const xml = fileBuffer.toString()

        // Parse the XML
        const parsed = await xml2js.parseStringPromise(xml, {
          explicitArray: false,
          mergeAttrs: false // disables attribute merging for safety
        })

        const sites = parsed.DEFRAAirQuality.site
        const siteList = Array.isArray(sites) ? sites : [sites] // Handle single or multiple <site>

        const forecasts = siteList.map((site) => {
          // Construct UTC date from XML attributes
          const baseDate = dayjs.utc(
            `${site.$.yr}-${site.$.mon}-${site.$.dayn}T${site.$.hr.slice(0, 2)}:00:00`
          )
          const updatedDate = baseDate.toISOString()

          // Ensure forecast days array exists
          /**
           * site.$           // for site attributes like dayn, hr, etc.
           * site.day         // for actual forecast <day> elements
           */
          const dayForecasts = Array.isArray(site.day) ? site.day : [site.day]

          // Build forecast entries starting from the base date
          const forecast = dayForecasts.slice(0, 5).map((d, index) => {
            return {
              day: baseDate.add(index, 'day').format('ddd'),
              value: parseInt(d.$.aq)
            }
          })

          return {
            name: site.$.lc,
            updated: updatedDate,
            location: {
              type: 'Point',
              coordinates: [parseFloat(site.$.lt), parseFloat(site.$.ln)]
            },
            forecast
          }
        })

        return h.response({
          message: 'success',
          forecasts
        })
      } catch (err) {
        console.error('🔥 SFTP or Parsing Error:', err)
        return h.response({ success: false, error: err.message }).code(500)
      }
    }
  })

  await server.start()
  console.log('Server running on %s', server.info.uri)
}

process.on('unhandledRejection', (err) => {
  console.error(err)
  process.exit(1)
})

init()
