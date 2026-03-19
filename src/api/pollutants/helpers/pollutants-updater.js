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
import {
  DAYS_BACK,
  MAX_LISTENERS,
  NEAR_ONE_THRESHOLD,
  OWS_EXCEPTION_REPORT,
  POLLUTANT_FETCH_OPTIONS
} from './common/constants.js'

process.setMaxListeners(MAX_LISTENERS)
const logger = createLogger()
const urlExtra = config.get('pollutantstUrlExtra')

const parser = new XMLParser()

function buildTimestamp() {
  const startTimeStamp = moment
    .utc()
    .add(DAYS_BACK, 'days')
    .set({ hour: 23, minute: 0, second: 0 })
    .format('YYYY-MM-DDTHH:mm:ss[Z]')
  const endTimeStamp = moment
    .utc()
    .add(2, 'days')
    .add(1, 'years')
    .set({ hour: 0, minute: 0, second: 0 })
    .format('YYYY-MM-DDTHH:mm:ss[Z]')
  return `${startTimeStamp}/${endTimeStamp}`
}

function buildPromises(data, timestamp) {
  let promises = []
  data.forEach((site) => {
    try {
      const { pollutants } = site
      Object.entries(pollutants).forEach(([k, v]) => {
        logger.info(
          `pollutants url with timestamps... ${urlExtra}${timestamp}&featureOfInterest=${v.featureOfInterest}`
        )
        if (v.featureOfInterest === 'missingFOI') {
          promises = [
            ...promises,
            {
              [k]: Promise.resolve('missingFOI')
            }
          ]
        } else {
          promises = [
            ...promises,
            {
              [k]: proxyFetch(
                `${urlExtra}${timestamp}&featureOfInterest=${v.featureOfInterest}`,
                POLLUTANT_FETCH_OPTIONS
              ).catch((error) => {
                logger.error(error)
                return null
              })
            }
          ]
        }
      })
    } catch (error) {
      logger.error(error)
    }
  })
  return promises
}

function computePollutantValue(measured) {
  if (!measured || Number.isNaN(Math.round(measured))) {
    return null
  }
  if (measured < 1 && measured > 0) {
    return measured > NEAR_ONE_THRESHOLD
      ? Math.round(measured)
      : Number.parseFloat(measured.toFixed(2))
  }
  return Math.round(measured)
}

function insertPollutantsValues(data, res) {
  data.forEach((site) => {
    try {
      const { pollutants } = site
      let measuredIndex = 0
      Object.entries(pollutants).forEach(([k]) => {
        const measured = res[measuredIndex]?.value
        pollutants[k].value = computePollutantValue(measured)
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

async function processResponses(promisesOnly, data) {
  await reduce(
    promisesOnly,
    async (accumulator, response) => {
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
            !body?.[OWS_EXCEPTION_REPORT] &&
            !['gml:FeatureCollection']?.['gml:featureMember']?.[
              'aqd:AQD_ReportingHeader'
            ]?.['aqd:reportingPeriod']
          ) {
            valueMeasured = getValueMeasured(body)
            tempDate = getTempDate(body)
            dateMeasured = getDateMeasured(body, tempDate)
          }
          if (
            body?.['gml:FeatureCollection']?.['gml:featureMember']?.[
              'aqd:AQD_ReportingHeader'
            ]?.['aqd:reportingPeriod'] ||
            body?.[OWS_EXCEPTION_REPORT]?.['ows:Exception']?.[
              'ows:ExceptionText'
            ] ||
            body?.[OWS_EXCEPTION_REPORT]
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
      insertPollutantsValues(data, result)
      return result
    },
    []
  )
}

export async function pollutantUpdater(data) {
  logger.info(
    `pollutants updater running... ${data[0].name} max ${data.length}`
  )
  const timestamp = buildTimestamp()
  const promises = buildPromises(data, timestamp)
  const promisesOnly = promises.map((item) => {
    return Object.entries(item)[0][1]
  })
  await processResponses(promisesOnly, data)
  logger.info(`pollutants updater done! ${JSON.stringify(data)}`)
  return data
}
