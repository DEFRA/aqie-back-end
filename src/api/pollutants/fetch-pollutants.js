/* eslint-disable camelcase */
/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
import { proxyFetch } from '~/src/helpers/proxy-fetch'
import { createLogger } from '~/src/helpers/logging/logger'
import { pollutantUpdater } from '~/src/api/pollutants/helpers/pollutants-updater'
import { config } from '~/src/config'
import moment from 'moment';

const logger = createLogger()

const fetchPollutants = async () => {
  const url = config.get('pollutantstUrl')

  const res3 = await proxyFetch(url + 3);
  const northEastScotlandJSON = await res3.json();
  const res4 = await proxyFetch(url + 4);
  const northWalesJSON = await res4.json();
  const res5 = await proxyFetch(url + 5);
  const highlandJSON = await res5.json();
  const res6 = await proxyFetch(url + 6);
  const centralScotlandJSON = await res6.json();
  const res7 = await proxyFetch(url + 7);
  const easternJSON = await res7.json();
  const res8 = await proxyFetch(url + 8);
  const southEastJSON = await res8.json();
  const res9 = await proxyFetch(url + 9);
  const southWalesJSON = await res9.json();
  const res10 = await proxyFetch(url + 10);
  const northWestAndMerseysideJSON = await res10.json();
  const res11 = await proxyFetch(url + 11);
  const southWestJSON = await res11.json();
  const res12 = await proxyFetch(url + 12);
  const eastMidlandsJSON = await res12.json();
  const res13 = await proxyFetch(url + 13);
  const scottishBordersJSON = await res13.json();
  const res14 = await proxyFetch(url + 14);
  const northEastJSON = await res14.json();
  const res15 = await proxyFetch(url + 15);
  const greaterLondonJSON = await res15.json();
  const res16 = await proxyFetch(url + 16);
  const westMidlandsJSON = await res16.json();
  const res17 = await proxyFetch(url + 17);
  const yorkshireAndHumbersideJSON = await res17.json();
  const res18 = await proxyFetch(url + 18);
  const isleofManJSON = await res18.json();
  console.log(moment().toISOString())

  const northEastScotlandObj = northEastScotlandJSON.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" }, exception: "" } })
      }
    })
    return {
      name: item.site_name,
      area: "North East Scotland",
      areaType: item.location_type,
      latitude: item.latitude,
      longitude: item.longitude,
      updated: moment().toISOString(),
      pollutants: { ...newObj }
    }
  })

  const northWalesObj = northWalesJSON.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" }, exception: "" } })
      }
    })
    return {
      name: item.site_name,
      area: "North wales",
      areaType: item.location_type,
      latitude: item.latitude,
      longitude: item.longitude,
      updated: moment().toISOString(),
      pollutants: { ...newObj }
    }
  })

  const highlandObj = highlandJSON.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" }, exception: "" } })
      }
    })
    return {
      name: item.site_name,
      area: "Highland",
      areaType: item.location_type,
      latitude: item.latitude,
      longitude: item.longitude,
      updated: moment().toISOString(),
      pollutants: { ...newObj }
    }
  })

  const centralScotlandObj = centralScotlandJSON.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" }, exception: "" } })
      }
    })
    return {
      name: item.site_name,
      area: "Central Scotland",
      areaType: item.location_type,
      latitude: item.latitude,
      longitude: item.longitude,
      updated: moment().toISOString(),
      pollutants: { ...newObj }
    }
  })

  const easternObj = easternJSON.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" }, exception: "" } })
      }
    })
    return {
      name: item.site_name,
      area: "Eastern",
      areaType: item.location_type,
      latitude: item.latitude,
      longitude: item.longitude,
      updated: moment().toISOString(),
      pollutants: { ...newObj }
    }
  })

  const southEastObj = southEastJSON.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" }, exception: "" } })
      }
    })
    return {
      name: item.site_name,
      area: "South East",
      areaType: item.location_type,
      latitude: item.latitude,
      longitude: item.longitude,
      updated: moment().toISOString(),
      pollutants: { ...newObj }
    }
  })

  const southWalesObj = southWalesJSON.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" }, exception: "" } })
      }
    })
    return {
      name: item.site_name,
      area: "South Wales",
      areaType: item.location_type,
      latitude: item.latitude,
      longitude: item.longitude,
      updated: moment().toISOString(),
      pollutants: { ...newObj }
    }
  })

  const northWestAndMerseysideObj = northWestAndMerseysideJSON.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" }, exception: "" } })
      }
    })
    return {
      name: item.site_name,
      area: "NorthWest & Merseyside",
      areaType: item.location_type,
      latitude: item.latitude,
      longitude: item.longitude,
      updated: moment().toISOString(),
      pollutants: { ...newObj }
    }
  })

  const southWestObj = southWestJSON.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" }, exception: "" } })
      }
    })
    return {
      name: item.site_name,
      area: "South West",
      areaType: item.location_type,
      latitude: item.latitude,
      longitude: item.longitude,
      updated: moment().toISOString(),
      pollutants: { ...newObj }
    }
  })

  const eastMidlandsObj = eastMidlandsJSON.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" }, exception: "" } })
      }
    })
    return {
      name: item.site_name,
      area: "East Midlands",
      areaType: item.location_type,
      latitude: item.latitude,
      longitude: item.longitude,
      updated: moment().toISOString(),
      pollutants: { ...newObj }
    }
  })

  const scottishBordersObj = scottishBordersJSON.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" }, exception: "" } })
      }
    })
    return {
      name: item.site_name,
      area: "Scottish Borders",
      areaType: item.location_type,
      latitude: item.latitude,
      longitude: item.longitude,
      updated: moment().toISOString(),
      pollutants: { ...newObj }
    }
  })

  const northEastObj = northEastJSON.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" }, exception: "" } })
      }
    })
    return {
      name: item.site_name,
      area: "North East",
      areaType: item.location_type,
      latitude: item.latitude,
      longitude: item.longitude,
      updated: moment().toISOString(),
      pollutants: { ...newObj }
    }
  })

  const greaterLondonObj = greaterLondonJSON.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" }, exception: "" } })
      }
    })
    return {
      name: item.site_name,
      area: "Greater London",
      areaType: item.location_type,
      latitude: item.latitude,
      longitude: item.longitude,
      updated: moment().toISOString(),
      pollutants: { ...newObj }
    }
  })

  const westMidlandsObj = westMidlandsJSON.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" }, exception: "" } })
      }
    })
    return {
      name: item.site_name,
      area: "West Midlands",
      areaType: item.location_type,
      latitude: item.latitude,
      longitude: item.longitude,
      updated: moment().toISOString(),
      pollutants: { ...newObj }
    }
  })

  const yorkshireAndHumbersideObj = yorkshireAndHumbersideJSON.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" }, exception: "" } })
      }
    })
    return {
      name: item.site_name,
      area: "Yorkshire & Humberside",
      areaType: item.location_type,
      latitude: item.latitude,
      longitude: item.longitude,
      updated: moment().toISOString(),
      pollutants: { ...newObj }
    }
  })

  const isleofManObj = isleofManJSON.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" }, exception: "" } })
      }
    })
    return {
      name: item.site_name,
      area: "Yorkshire & Humberside",
      areaType: item.location_type,
      latitude: item.latitude,
      longitude: item.longitude,
      updated: moment().toISOString(),
      pollutants: { ...newObj }
    }
  })
  // const NorthEastScotlandResults = await pollutantUpdater(NorthEastScotland)
  // const results4 = await pollutantUpdater(result4)
  // const results5 = await pollutantUpdater(result5)
  //                                     const results6 = await pollutantUpdater(CentralScotland)
  const centralScotlandObjSplit = centralScotlandObj.reduce((all, one, i) => {
    const ch = Math.floor(i % 3);
    all[ch] = [].concat((all[ch] || []), one);
    return all
  }, [])
  const centralScotlandResults1 = await pollutantUpdater(centralScotlandObjSplit[0])
  const centralScotlandResults2 = await pollutantUpdater(centralScotlandObjSplit[1])
  const centralScotlandResults3 = await pollutantUpdater(centralScotlandObjSplit[2])
  // const results7 = await pollutantUpdater(result7)
  // const results8 = await pollutantUpdater(result8)
  // const results9 = await pollutantUpdater(result9)
  // const results10 = await pollutantUpdater(result10)
  // const results11 = await pollutantUpdater(result11)
  // const results12 = await pollutantUpdater(result12)
  // const results13 = await pollutantUpdater(result13)
  // const results14 = await pollutantUpdater(result14)
  // const results15 = await pollutantUpdater(result15)
  // const results16 = await pollutantUpdater(result16)
  // const results17 = await pollutantUpdater(result17)
  // const results18 = await pollutantUpdater(result18)

  const measurements = [
    // ...results3,
    // ...results4,
    // ...results5,
    ...centralScotlandResults1,
    ...centralScotlandResults2,
    ...centralScotlandResults3
    // ...results7,
    // ...results8,
    // ...results9,
    // ...results10,
    // ...results11,
    // ...results12,
    // ...results13,
    // ...results14,
    // ...results15,
    // ...results16,
    // ...results17,
    // ...results18
  ]
  return measurements

}

const savePollutants = async (server, pollutants) => {
  logger.info(`updating ${pollutants.length} pollutants`)
  await server.db
    .collection('measurements')
    .bulkWrite(pollutants.map(toBulkReplace))
  logger.info('pollutants update done')
}

/**
 * Wrap the item we want to update in a MongoDB replace command
 */
function toBulkReplace(item) {
  return {
    replaceOne: {
      filter: { name: item.name },
      replacement: item,
      upsert: true
    }
  }
}

export { fetchPollutants, savePollutants }