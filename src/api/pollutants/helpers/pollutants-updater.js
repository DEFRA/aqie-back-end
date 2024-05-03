/* eslint-disable prettier/prettier */
/* eslint-disable camelcase */
/* eslint-disable no-console */
import { proxyFetch } from '~/src/helpers/proxy-fetch'
import reduce from 'await-reduce'
import xmlToJs from 'xml-js'
import { config } from '~/src/config'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import moment from 'moment'
import 'moment-timezone'
import { createLogger } from '~/src/helpers/logging/logger'

process.setMaxListeners(500)
const logger = createLogger()
const urlExtra = config.get('pollutantstUrlExtra')
const startTimeStamp = moment()
  .tz('Europe/London')
  .add(-1, 'days')
  .set({ hour: 25, minute: 0, second: 0, millisecond: 0 })
  .toISOString()
const endTimeStamp = moment()
  .tz('Europe/London')
  .add(1, 'days')
  .set({ hour: 2, minute: 0, second: 0, millisecond: 0 })
  .toISOString()
const timestamp = `${startTimeStamp}/${endTimeStamp}`
//
const parser = new XMLParser()
const builder = new XMLBuilder()
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
  data.forEach((site, index) => {
    logger.info(`timestamp for API call: ${timestamp}`)
    try {
      const { pollutants } = site
      // eslint-disable-next-line prefer-const
      Object.entries(pollutants).forEach(([k, v], i) => {
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
            console.log(error)
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
      console.log(error)
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
        // eslint-disable-next-line prefer-const
        Object.entries(pollutants).forEach(([k, v], i) => {
          pollutants[k].value =
            res[measuredIndex]?.value &&
            !isNaN(Math.round(res[measuredIndex]?.value))
              ? res[measuredIndex]?.value < 1 && res[measuredIndex]?.value > 0
                ? parseFloat(res[measuredIndex]?.value).toFixed(2)
                : Math.round(res[measuredIndex]?.value)
              : null
          pollutants[k].time.date =
            res[measuredIndex]?.value && res[measuredIndex]?.time.date
              ? new Date(moment(res[measuredIndex]?.time.date))
              : null
          pollutants[k].exception = res[measuredIndex]?.exception
          logger.info(
            `name log: ${site.name} pollutant: ${k} date: ${pollutants[k].time.date} value: ${pollutants[k].value}`
          )
          measuredIndex++
        })
      } catch (error) {
        console.log(error)
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
          const xmlContent = builder.build(body)
          let jsonResult = xmlToJs.xml2json(xmlContent, {
            compact: true,
            spaces: 4
          })
          jsonResult = JSON.parse(jsonResult)
          if (
            jsonResult &&
            !jsonResult?.['ows:ExceptionReport'] &&
            !['gml:FeatureCollection']?.['gml:featureMember']?.[
              'aqd:AQD_ReportingHeader'
            ]?.['aqd:reportingPeriod']
          ) {
            valueMeasured = jsonResult?.['gml:FeatureCollection']?.[
              'gml:featureMember'
            ][1]?.['om:OM_Observation']?.['om:result']?.['swe:DataArray']?.[
              'swe:values'
            ]._text
              .split(',')
              .pop()
            tempDate =
              jsonResult?.['gml:FeatureCollection']?.['gml:featureMember'][1]?.[
                'om:OM_Observation'
              ]?.['om:result']?.['swe:DataArray']?.['swe:values']._text.split(
                ','
              )
            dateMeasured = tempDate
              ? tempDate[tempDate?.length - 4]
              : jsonResult?.['gml:FeatureCollection']?.['gml:featureMember']?.[
                  'aqd:AQD_ReportingHeader'
                ]?.['aqd:changeDescription']._text

            exceptionReport = ''
          }
          if (
            ['gml:FeatureCollection']?.['gml:featureMember']?.[
              'aqd:AQD_ReportingHeader'
            ]?.['aqd:reportingPeriod'] ||
            jsonResult?.['ows:ExceptionReport']?.['ows:Exception']?.[
              'ows:ExceptionText'
            ] ||
            jsonResult?.['ows:ExceptionReport']
          ) {
            valueMeasured = 'N/M'
            exceptionReport = 'N/M'
            dateMeasured = null
          }
        }
      } catch (error) {
        console.log(error)
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

  return data
}
