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
  const NorthEastScotland = await res3.json();
  const res4 = await proxyFetch(url + 4);
  const NorthWales = await res4.json();
  const res5 = await proxyFetch(url + 5);
  const Highland = await res5.json();
  const res6 = await proxyFetch(url + 6);
  const CentralScotland = await res6.json();
  const res7 = await proxyFetch(url + 7);
  const Eastern = await res7.json();
  const res8 = await proxyFetch(url + 8);
  const SouthEast = await res8.json();
  const res9 = await proxyFetch(url + 9);
  const SouthWales = await res9.json();
  const res10 = await proxyFetch(url + 10);
  const NorthWestAndMerseyside = await res10.json();
  const res11 = await proxyFetch(url + 11);
  const SouthWest = await res11.json();
  const res12 = await proxyFetch(url + 12);
  const EastMidlands = await res12.json();
  const res13 = await proxyFetch(url + 13);
  const ScottishBorders = await res13.json();
  const res14 = await proxyFetch(url + 14);
  const NorthEast = await res14.json();
  const res15 = await proxyFetch(url + 15);
  const GreaterLondon = await res15.json();
  const res16 = await proxyFetch(url + 16);
  const WestMidlands = await res16.json();
  const res17 = await proxyFetch(url + 17);
  const YorkshireAndHumberside = await res17.json();
  const res18 = await proxyFetch(url + 18);
  const IsleofMan = await res18.json();
  console.log(moment().toISOString())

  const result3 = NorthEastScotland.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" } } })
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

  const result4 = NorthWales.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" } } })
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

  const result5 = Highland.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time:{date:""}}})
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

  const result6 = CentralScotland.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" } } })
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

  const result7 = Eastern.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" } } })
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

  const result8 = SouthEast.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" } } })
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

  const result9 = SouthWales.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" } } })
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

  const result10 = NorthWestAndMerseyside.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" } } })
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

  const result11 = SouthWest.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" } } })
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

  const result12 = EastMidlands.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" } } })
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

  const result13 = ScottishBorders.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" } } })
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

  const result14 = NorthEast.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" } } })
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

  const result15 = GreaterLondon.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" } } })
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

  const result16 = WestMidlands.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" } } })
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

  const result17 = YorkshireAndHumberside.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" } } })
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

  const result18 = IsleofMan.map(item => {
    let newObj = {}
    item.parameter_ids.forEach(el => {
      if (['O3', 'NO2', 'GE10', 'PM25', 'SO2'].includes(el.parameter_id)) {
        newObj = Object.assign({}, newObj, { [el.parameter_id]: { featureOfInterest: el.feature_of_interest[0].featureOfInterset, time: { date: "" } } })
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
  const results3 = await pollutantUpdater(result3)
  const results4 = await pollutantUpdater(result4)
  const results5 = await pollutantUpdater(result5)
  // const results6 = await pollutantUpdater(result6)
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
    ...results3,
    ...results4,
    ...results5
    // ...results6,
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
