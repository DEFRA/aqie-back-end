import { proxyFetch } from '../../../helpers/proxy-fetch.js'
import reduce from 'await-reduce'
import { config } from '../../../config/index.js'
import { XMLParser } from 'fast-xml-parser'
import moment from 'moment-timezone'
import { createLogger } from '../../../helpers/logging/logger.js'
import {
  getDateMeasured,
  getTempDate,
  getValueMeasured
} from './body-parser.js'

process.setMaxListeners(500)
const logger = createLogger()
const urlExtra = config.get('pollutantstUrlExtra')

///
const parser = new XMLParser()
const options = {
  headers: {
    'Cache-Control': 'no-cache'
  }
}

export async function pollutantUpdater(data) {
  logger.info(
    `pollutants updater running... ${data[0].name} max ${data.length}`
  )
  let promises = []
  const startTimeStamp = moment
    .utc()
    .add(-2, 'days')
    .set({ hour: 23, minute: 0, second: 0 })
    .format('YYYY-MM-DDTHH:mm:ss[Z]')
  const endTimeStamp = moment
    .utc()
    .add(2, 'days')
    .add(1, 'years')
    .set({ hour: 0, minute: 0, second: 0 })
    .format('YYYY-MM-DDTHH:mm:ss[Z]')
  const timestamp = `${startTimeStamp}/${endTimeStamp}`

  data.forEach((site, index) => {
    try {
      const { pollutants } = site
      Object.entries(pollutants).forEach(([k, v], i) => {
        logger.info(
          `pollutants url with timestamps... ${urlExtra}${timestamp}&featureOfInterest=${v.featureOfInterest}`
        )
        if (v.featureOfInterest !== 'missingFOI') {
          try {
            promises = [
              ...promises,
              {
                [k]: proxyFetch(
                  `${urlExtra}${timestamp}&featureOfInterest=${v.featureOfInterest}`,
                  options
                )
              }
            ]
          } catch (error) {
            logger.error(error)
          }
        } else {
          promises = [
            ...promises,
            {
              [k]: Promise.resolve('missingFOI')
            }
          ]
        }
      })
    } catch (error) {
      logger.error(error)
    }
  })

  const promisesOnly = promises.map((item) => {
    return Object.entries(item)[0][1]
  })

  const insertPollutantsValues = (res) => {
    data.forEach((site, index) => {
      try {
        const { pollutants } = site
        let measuredIndex = 0
        Object.entries(pollutants).forEach(([k, v], i) => {
          pollutants[k].value =
            res[measuredIndex]?.value &&
            !isNaN(Math.round(res[measuredIndex]?.value))
              ? res[measuredIndex]?.value < 1 && res[measuredIndex]?.value > 0
                ? res[measuredIndex]?.value > parseFloat(0.98999)
                  ? parseFloat(res[measuredIndex]?.value).toFixed(0)
                  : parseFloat(res[measuredIndex]?.value).toFixed(2)
                : Math.round(res[measuredIndex]?.value)
              : null
          pollutants[k].time.date =
            res[measuredIndex]?.value && res[measuredIndex]?.time.date
              ? new Date(
                  moment(res[measuredIndex]?.time.date).tz('Europe/London')
                )
              : null
          pollutants[k].exception = res[measuredIndex]?.exception
          measuredIndex++
        })
      } catch (error) {
        logger.info(error)
      }
    })
  }

  await reduce(
    promisesOnly,
    async (accumulator, response, index, array) => {
      let valueMeasured = ''
      let dateMeasured = ''
      let tempDate = []
      let exceptionReport = ''
      if (!response.ok && response !== 'missingFOI') {
        return accumulator
      }
      try {
        if (response === 'missingFOI') {
          valueMeasured = 'N/A'
          exceptionReport = 'N/A'
          dateMeasured = null
        } else {
          const body = parser.parse(await response.text())
          if (
            body &&
            !body?.['ows:ExceptionReport'] &&
            !['gml:FeatureCollection']?.['gml:featureMember']?.[
              'aqd:AQD_ReportingHeader'
            ]?.['aqd:reportingPeriod']
          ) {
            valueMeasured = getValueMeasured(body)
            tempDate = getTempDate(body)
            dateMeasured = getDateMeasured(body, tempDate)
            exceptionReport = ''
          }
          if (
            body?.['gml:FeatureCollection']?.['gml:featureMember']?.[
              'aqd:AQD_ReportingHeader'
            ]?.['aqd:reportingPeriod'] ||
            body?.['ows:ExceptionReport']?.['ows:Exception']?.[
              'ows:ExceptionText'
            ] ||
            body?.['ows:ExceptionReport']
          ) {
            valueMeasured = 'N/M'
            exceptionReport = 'N/M'
            dateMeasured = null
          }
        }
      } catch (error) {
        logger.info(error)
      }
      const result = [
        ...accumulator,
        {
          exception: exceptionReport,
          value: valueMeasured,
          time: { date: dateMeasured }
        }
      ]
      await insertPollutantsValues(result)
      return result
    },
    []
  )
  logger.info(`pollutants updater done! ${JSON.stringify(data)}`)
  return data
}
