/* eslint-disable prettier/prettier */
/* eslint-disable camelcase */
/* eslint-disable no-console */
import { proxyFetch } from '~/src/helpers/proxy-fetch'
import reduce from 'await-reduce'
import xmlToJs from 'xml-js'
import { config } from '~/src/config'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'

const urlExtra = config.get('pollutantstUrlExtra')
const startTimeStamp = '2023-12-13T23:00:00.000Z'
const endTimeStamp = '2023-12-15T01:00:00.00'
const timestamp = `${startTimeStamp}/${endTimeStamp}`
//
const parser = new XMLParser()
const builder = new XMLBuilder();
export async function pollutantUpdater (data) {
    let promises = []
    data.forEach(async (site, index) => {
      try {
          const { pollutants } = site
          // eslint-disable-next-line prefer-const
          Object.entries(pollutants).map(async ([k, v], i) => {
              
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
                          [k]: Promise.resolve("missingFOI")
                      }
                  ]
              }
              })
        } catch (error) {
        console.log(error)
        }
  })
    const promisesOnly = promises.map((item) => { //
    return Object.entries(item)[0][1]
  })
    let valueMeasured = ''
    let dateMeasured = ''
    let tempDate = []
  const results = await reduce(
    promisesOnly,
      async (accumulator, response, index, array) => {
          if (!response.ok && response !== "missingFOI") {
              return accumulator
          }
          try {
              if (response === "missingFOI") {
                  valueMeasured = 0
                  dateMeasured = ""
              } else {
                  const body = parser.parse(await response.text())
                  const xmlContent = builder.build(body)
                  let jsonResult = xmlToJs.xml2json(xmlContent, {
                      compact: true,
                      spaces: 4
                  })
                  jsonResult = JSON.parse(jsonResult)
                  if (jsonResult) {
                      valueMeasured = jsonResult?.['gml:FeatureCollection']?.['gml:featureMember'][1]?.[
                          'om:OM_Observation'
                      ]?.['om:result']?.['swe:DataArray']?.['swe:values']._text
                          .split(',')
                          .pop()
                      tempDate = jsonResult?.['gml:FeatureCollection']?.['gml:featureMember'][1]?.[
                          'om:OM_Observation'
                      ]?.['om:result']?.['swe:DataArray']?.['swe:values']._text
                          .split(',')
                      dateMeasured = tempDate[tempDate.length - 4]
                  }
              }

          } catch (error) {
              console.log(error)
          }

          return [...accumulator, { value: valueMeasured, time: { date: dateMeasured } }]
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
            pollutants[k].value = results[measuredIndex]?.value ? Math.round(results[measuredIndex]?.value) : 0
            pollutants[k].time.date = results[measuredIndex]?.value ? results[measuredIndex]?.time.date : 0
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
