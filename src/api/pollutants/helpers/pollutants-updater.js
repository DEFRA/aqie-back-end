/* eslint-disable prettier/prettier */
/* eslint-disable camelcase */
/* eslint-disable no-console */
import { proxyFetch } from '~/src/helpers/proxy-fetch'
import reduce from 'await-reduce'
import xmlToJs from 'xml-js'
import { config } from '~/src/config'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import moment from 'moment'
process.setMaxListeners(300)

const urlExtra = config.get('pollutantstUrlExtra')
const startTimeStamp = moment()
  .add(-1, 'days')
  .set({ hour: 23, minute: 0, second: 0, millisecond: 0 })
  .toISOString()
const endTimeStamp = moment()
  .add(1, 'days')
  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
  .toISOString()
const timestamp = `${startTimeStamp}/${endTimeStamp}`
//
const parser = new XMLParser()
const builder = new XMLBuilder()
export async function pollutantUpdater(data) {
  let promises = []
  data.forEach((site, index) => {
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
                  `${urlExtra}${timestamp}&featureOfInterest=${v.featureOfInterest}`
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
  let valueMeasured = ''
  let dateMeasured = ''
  let tempDate = []
  let exceptionReport = ''
  const results = await reduce(
    promisesOnly,
    async (accumulator, response, index, array) => {
      if (!response.ok && response !== 'missingFOI') {
        return accumulator
      }
      try {
        if (response === 'missingFOI') {
          valueMeasured = 0
          dateMeasured = ''
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
          if (jsonResult?.['ows:ExceptionReport']) {
            valueMeasured = 'Error while querying observation data!'
            exceptionReport = 'Error while querying observation data!'
            dateMeasured = 0
          }
          if (
            jsonResult?.['ows:ExceptionReport']?.['ows:Exception']?.[
              'ows:ExceptionText'
            ]
          ) {
            valueMeasured =
              jsonResult?.['ows:ExceptionReport']?.['ows:Exception']?.[
                'ows:ExceptionText'
              ]
            exceptionReport =
              jsonResult?.['ows:ExceptionReport']?.['ows:Exception']?.[
                'ows:ExceptionText'
              ]
            dateMeasured = 0
          }
          if (
            ['gml:FeatureCollection']?.['gml:featureMember']?.[
              'aqd:AQD_ReportingHeader'
            ]?.['aqd:reportingPeriod']
          ) {
            valueMeasured = 'Data is missing for this pollutant station!'
            exceptionReport = 'Data is missing for this pollutant station!'
            dateMeasured = 0
          }
        }
      } catch (error) {
        console.log(error)
      }

      return [
        ...accumulator,
        {
          exception: exceptionReport,
          value: valueMeasured,
          time: { date: dateMeasured }
        }
      ]
    },
    []
  )
  let measuredIndex = 0
  const insertPollutantsValues = (results) => {
    data.forEach((site, index) => {
      try {
        const { pollutants } = site
        // eslint-disable-next-line prefer-const
        Object.entries(pollutants).forEach(([k, v], i) => {
          pollutants[k].value = results[measuredIndex]?.value
            ? Math.round(results[measuredIndex]?.value)
            : 0
          pollutants[k].time.date = results[measuredIndex]?.value
            ? results[measuredIndex]?.time.date
            : 0
          pollutants[k].exception = results[measuredIndex]?.exception
          measuredIndex++
        })
      } catch (error) {
        console.log(error)
      }
    })
  }
  insertPollutantsValues(results)
  return data
}
