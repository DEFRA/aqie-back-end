/* eslint-disable camelcase */
/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
import { proxyFetch } from '~/src/helpers/proxy-fetch'
import { createLogger } from '~/src/helpers/logging/logger'
import { pollutantUpdater } from '~/src/api/pollutants/helpers/pollutants-updater'
import { config } from '~/src/config'
import moment from 'moment-timezone'

process.setMaxListeners(500)

const logger = createLogger()

const fetchPollutants = async () => {
  const url = config.get('pollutantstUrl')

  const res3 = await proxyFetch(url + 3)
  if (!res3.ok) {
    const message = `An error has occured: ${res3.status}`
    throw new Error(message)
  }
  logger.info(
    `data response for each 16 region entries northEastScotlandJSON:${res3}`
  )
  const northEastScotlandJSON = await res3.json()
  const res4 = await proxyFetch(url + 4)
  if (!res4.ok) {
    const message = `An error has occured res4: ${res4.status}`
    throw new Error(message)
  }
  const northWalesJSON = await res4.json()
  logger.info(`data response for each 16 region entries northWalesJSON:${res4}`)
  const res5 = await proxyFetch(url + 5)
  if (!res5.ok) {
    const message = `An error has occured res5: ${res5.status}`
    throw new Error(message)
  }
  const highlandJSON = await res5.json()
  logger.info(`data response for each 16 region entries highlandJSON:${res5}`)
  const res6 = await proxyFetch(url + 6)
  if (!res6.ok) {
    const message = `An error has occured res6: ${res6.status}`
    throw new Error(message)
  }
  const centralScotlandJSON = await res6.json()
  logger.info(
    `data response for each 16 region entries centralScotlandJSON:${res6}`
  )
  const res7 = await proxyFetch(url + 7)
  if (!res7.ok) {
    const message = `An error has occured res7: ${res7.status}`
    throw new Error(message)
  }
  const easternJSON = await res7.json()
  logger.info(`data response for each 16 region entries easternJSON:${res7}`)
  const res8 = await proxyFetch(url + 8)
  if (!res8.ok) {
    const message = `An error has occured res8: ${res8.status}`
    throw new Error(message)
  }
  const southEastJSON = await res8.json()
  logger.info(`data response for each 16 region entries southEastJSON:${res8}`)
  const res9 = await proxyFetch(url + 9)
  if (!res9.ok) {
    const message = `An error has occured res9: ${res9.status}`
    throw new Error(message)
  }
  const southWalesJSON = await res9.json()
  logger.info(`data response for each 16 region entries southWalesJSON:${res9}`)
  const res10 = await proxyFetch(url + 10)
  if (!res10.ok) {
    const message = `An error has occured res10: ${res10.status}`
    throw new Error(message)
  }
  const northWestAndMerseysideJSON = await res10.json()
  logger.info(
    `data response for each 16 region entries northWestAndMerseysideJSON:${res10}`
  )
  const res11 = await proxyFetch(url + 11)
  if (!res11.ok) {
    const message = `An error has occured res11: ${res11.status}`
    throw new Error(message)
  }
  const southWestJSON = await res11.json()
  logger.info(`data response for each 16 region entries southWestJSON:${res11}`)
  const res12 = await proxyFetch(url + 12)
  if (!res12.ok) {
    const message = `An error has occured res12: ${res12.status}`
    throw new Error(message)
  }
  const eastMidlandsJSON = await res12.json()
  logger.info(
    `data response for each 16 region entries eastMidlandsJSON:${res12}`
  )
  const res13 = await proxyFetch(url + 13)
  if (!res13.ok) {
    const message = `An error has occured res13: ${res13.status}`
    throw new Error(message)
  }
  const scottishBordersJSON = await res13.json()
  logger.info(
    `data response for each 16 region entries scottishBordersJSON:${res13}`
  )
  const res14 = await proxyFetch(url + 14)
  if (!res14.ok) {
    const message = `An error has occured res14: ${res14.status}`
    throw new Error(message)
  }
  const northEastJSON = await res14.json()
  logger.info(`data response for each 16 region entries northEastJSON:${res14}`)
  const res15 = await proxyFetch(url + 15)
  if (!res15.ok) {
    const message = `An error has occured res15: ${res15.status}`
    throw new Error(message)
  }
  const greaterLondonJSON = await res15.json()
  logger.info(
    `data response for each 16 region entries greaterLondonJSON:${res15}`
  )
  const res16 = await proxyFetch(url + 16)
  if (!res16.ok) {
    const message = `An error has occured res16: ${res16.status}`
    throw new Error(message)
  }
  const westMidlandsJSON = await res16.json()
  logger.info(
    `data response for each 16 region entries westMidlandsJSON:${res16}`
  )
  const res17 = await proxyFetch(url + 17)
  if (!res17.ok) {
    const message = `An error has occured res17: ${res17.status}`
    throw new Error(message)
  }
  const yorkshireAndHumbersideJSON = await res17.json()
  logger.info(
    `data response for each 16 region entries yorkshireAndHumbersideJSON:${res17}`
  )
  const res18 = await proxyFetch(url + 18)
  if (!res18.ok) {
    const message = `An error has occured res18: ${res18.status}`
    throw new Error(message)
  }
  const isleofManJSON = await res18.json()
  logger.info(`data response for each 16 region entries isleofManJSON:${res18}`)
  const momentDate = moment().tz('Europe/London')
  const currentTime = new Date(momentDate)

  const northEastScotlandObj = northEastScotlandJSON.map((item) => {
    let newObj = {}
    item.parameter_ids.forEach((el) => {
      if (
        ['O3', 'NO2', 'GE10', 'GR10', 'PM10', 'PM25', 'GR25', 'SO2'].includes(
          el.parameter_id
        )
      ) {
        newObj = Object.assign({}, newObj, {
          [el.parameter_id]: {
            featureOfInterest: el.feature_of_interest[0].featureOfInterset,
            time: { date: '' },
            exception: ''
          }
        })
      }
    })
    return {
      name: item.site_name,
      area: 'North East Scotland',
      areaType: item.location_type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(item.latitude), parseFloat(item.longitude)]
      },
      updated: currentTime,
      pollutants: { ...newObj }
    }
  })

  const northWalesObj = northWalesJSON.map((item) => {
    let newObj = {}
    item.parameter_ids.forEach((el) => {
      if (
        ['O3', 'NO2', 'GE10', 'GR10', 'PM10', 'PM25', 'GR25', 'SO2'].includes(
          el.parameter_id
        )
      ) {
        newObj = Object.assign({}, newObj, {
          [el.parameter_id]: {
            featureOfInterest: el.feature_of_interest[0].featureOfInterset,
            time: { date: '' },
            exception: ''
          }
        })
      }
    })
    return {
      name: item.site_name,
      area: 'North wales',
      areaType: item.location_type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(item.latitude), parseFloat(item.longitude)]
      },
      updated: currentTime,
      pollutants: { ...newObj }
    }
  })

  const highlandObj = highlandJSON.map((item) => {
    let newObj = {}
    item.parameter_ids.forEach((el) => {
      if (
        ['O3', 'NO2', 'GE10', 'GR10', 'PM10', 'PM25', 'GR25', 'SO2'].includes(
          el.parameter_id
        )
      ) {
        newObj = Object.assign({}, newObj, {
          [el.parameter_id]: {
            featureOfInterest: el.feature_of_interest[0].featureOfInterset,
            time: { date: '' },
            exception: ''
          }
        })
      }
    })
    return {
      name: item.site_name,
      area: 'Highland',
      areaType: item.location_type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(item.latitude), parseFloat(item.longitude)]
      },
      updated: currentTime,
      pollutants: { ...newObj }
    }
  })

  const centralScotlandObj = centralScotlandJSON.map((item) => {
    let newObj = {}
    item.parameter_ids.forEach((el) => {
      if (
        ['O3', 'NO2', 'GE10', 'GR10', 'PM10', 'PM25', 'GR25', 'SO2'].includes(
          el.parameter_id
        )
      ) {
        newObj = Object.assign({}, newObj, {
          [el.parameter_id]: {
            featureOfInterest: el.feature_of_interest[0].featureOfInterset,
            time: { date: '' },
            exception: ''
          }
        })
      }
    })
    return {
      name: item.site_name,
      area: 'Central Scotland',
      areaType: item.location_type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(item.latitude), parseFloat(item.longitude)]
      },
      updated: currentTime,
      pollutants: { ...newObj }
    }
  })

  const easternObj = easternJSON.map((item) => {
    let newObj = {}
    item.parameter_ids.forEach((el) => {
      if (
        ['O3', 'NO2', 'GE10', 'GR10', 'PM10', 'PM25', 'GR25', 'SO2'].includes(
          el.parameter_id
        )
      ) {
        newObj = Object.assign({}, newObj, {
          [el.parameter_id]: {
            featureOfInterest: el.feature_of_interest[0].featureOfInterset,
            time: { date: '' },
            exception: ''
          }
        })
      }
    })
    return {
      name: item.site_name,
      area: 'Eastern',
      areaType: item.location_type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(item.latitude), parseFloat(item.longitude)]
      },
      updated: currentTime,
      pollutants: { ...newObj }
    }
  })

  const southEastObj = southEastJSON.map((item) => {
    let newObj = {}
    item.parameter_ids.forEach((el) => {
      if (
        ['O3', 'NO2', 'GE10', 'GR10', 'PM10', 'PM25', 'GR25', 'SO2'].includes(
          el.parameter_id
        )
      ) {
        newObj = Object.assign({}, newObj, {
          [el.parameter_id]: {
            featureOfInterest: el.feature_of_interest[0].featureOfInterset,
            time: { date: '' },
            exception: ''
          }
        })
      }
    })
    return {
      name: item.site_name,
      area: 'South East',
      areaType: item.location_type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(item.latitude), parseFloat(item.longitude)]
      },
      updated: currentTime,
      pollutants: { ...newObj }
    }
  })

  const southWalesObj = southWalesJSON.map((item) => {
    let newObj = {}
    item.parameter_ids.forEach((el) => {
      if (
        ['O3', 'NO2', 'GE10', 'GR10', 'PM10', 'PM25', 'GR25', 'SO2'].includes(
          el.parameter_id
        )
      ) {
        newObj = Object.assign({}, newObj, {
          [el.parameter_id]: {
            featureOfInterest: el.feature_of_interest[0].featureOfInterset,
            time: { date: '' },
            exception: ''
          }
        })
      }
    })
    return {
      name: item.site_name,
      area: 'South Wales',
      areaType: item.location_type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(item.latitude), parseFloat(item.longitude)]
      },
      updated: currentTime,
      pollutants: { ...newObj }
    }
  })

  const northWestAndMerseysideObj = northWestAndMerseysideJSON.map((item) => {
    let newObj = {}
    item.parameter_ids.forEach((el) => {
      if (
        ['O3', 'NO2', 'GE10', 'GR10', 'PM10', 'PM25', 'GR25', 'SO2'].includes(
          el.parameter_id
        )
      ) {
        newObj = Object.assign({}, newObj, {
          [el.parameter_id]: {
            featureOfInterest: el.feature_of_interest[0].featureOfInterset,
            time: { date: '' },
            exception: ''
          }
        })
      }
    })
    return {
      name: item.site_name,
      area: 'NorthWest & Merseyside',
      areaType: item.location_type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(item.latitude), parseFloat(item.longitude)]
      },
      updated: currentTime,
      pollutants: { ...newObj }
    }
  })

  const southWestObj = southWestJSON.map((item) => {
    let newObj = {}
    item.parameter_ids.forEach((el) => {
      if (
        ['O3', 'NO2', 'GE10', 'GR10', 'PM10', 'PM25', 'GR25', 'SO2'].includes(
          el.parameter_id
        )
      ) {
        newObj = Object.assign({}, newObj, {
          [el.parameter_id]: {
            featureOfInterest: el.feature_of_interest[0].featureOfInterset,
            time: { date: '' },
            exception: ''
          }
        })
      }
    })
    return {
      name: item.site_name,
      area: 'South West',
      areaType: item.location_type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(item.latitude), parseFloat(item.longitude)]
      },
      updated: currentTime,
      pollutants: { ...newObj }
    }
  })

  const eastMidlandsObj = eastMidlandsJSON.map((item) => {
    let newObj = {}
    item.parameter_ids.forEach((el) => {
      if (
        ['O3', 'NO2', 'GE10', 'GR10', 'PM10', 'PM25', 'GR25', 'SO2'].includes(
          el.parameter_id
        )
      ) {
        newObj = Object.assign({}, newObj, {
          [el.parameter_id]: {
            featureOfInterest: el.feature_of_interest[0].featureOfInterset,
            time: { date: '' },
            exception: ''
          }
        })
      }
    })
    return {
      name: item.site_name,
      area: 'East Midlands',
      areaType: item.location_type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(item.latitude), parseFloat(item.longitude)]
      },
      updated: currentTime,
      pollutants: { ...newObj }
    }
  })

  const scottishBordersObj = scottishBordersJSON.map((item) => {
    let newObj = {}
    item.parameter_ids.forEach((el) => {
      if (
        ['O3', 'NO2', 'GE10', 'GR10', 'PM10', 'PM25', 'GR25', 'SO2'].includes(
          el.parameter_id
        )
      ) {
        newObj = Object.assign({}, newObj, {
          [el.parameter_id]: {
            featureOfInterest: el.feature_of_interest[0].featureOfInterset,
            time: { date: '' },
            exception: ''
          }
        })
      }
    })
    return {
      name: item.site_name,
      area: 'Scottish Borders',
      areaType: item.location_type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(item.latitude), parseFloat(item.longitude)]
      },
      updated: currentTime,
      pollutants: { ...newObj }
    }
  })

  const northEastObj = northEastJSON.map((item) => {
    let newObj = {}
    item.parameter_ids.forEach((el) => {
      if (
        ['O3', 'NO2', 'GE10', 'GR10', 'PM10', 'PM25', 'GR25', 'SO2'].includes(
          el.parameter_id
        )
      ) {
        newObj = Object.assign({}, newObj, {
          [el.parameter_id]: {
            featureOfInterest: el.feature_of_interest[0].featureOfInterset,
            time: { date: '' },
            exception: ''
          }
        })
      }
    })
    return {
      name: item.site_name,
      area: 'North East',
      areaType: item.location_type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(item.latitude), parseFloat(item.longitude)]
      },
      updated: currentTime,
      pollutants: { ...newObj }
    }
  })

  const greaterLondonObj = greaterLondonJSON.map((item) => {
    let newObj = {}
    item.parameter_ids.forEach((el) => {
      if (
        ['O3', 'NO2', 'GE10', 'GR10', 'PM10', 'PM25', 'GR25', 'SO2'].includes(
          el.parameter_id
        )
      ) {
        newObj = Object.assign({}, newObj, {
          [el.parameter_id]: {
            featureOfInterest: el.feature_of_interest[0].featureOfInterset,
            time: { date: '' },
            exception: ''
          }
        })
      }
    })
    return {
      name: item.site_name,
      area: 'Greater London',
      areaType: item.location_type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(item.latitude), parseFloat(item.longitude)]
      },
      updated: currentTime,
      pollutants: { ...newObj }
    }
  })

  const westMidlandsObj = westMidlandsJSON.map((item) => {
    let newObj = {}
    item.parameter_ids.forEach((el) => {
      if (
        ['O3', 'NO2', 'GE10', 'GR10', 'PM10', 'PM25', 'GR25', 'SO2'].includes(
          el.parameter_id
        )
      ) {
        newObj = Object.assign({}, newObj, {
          [el.parameter_id]: {
            featureOfInterest: el.feature_of_interest[0].featureOfInterset,
            time: { date: '' },
            exception: ''
          }
        })
      }
    })
    return {
      name: item.site_name,
      area: 'West Midlands',
      areaType: item.location_type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(item.latitude), parseFloat(item.longitude)]
      },
      updated: currentTime,
      pollutants: { ...newObj }
    }
  })

  const yorkshireAndHumbersideObj = yorkshireAndHumbersideJSON.map((item) => {
    let newObj = {}
    item.parameter_ids.forEach((el) => {
      if (
        ['O3', 'NO2', 'GE10', 'GR10', 'PM10', 'PM25', 'GR25', 'SO2'].includes(
          el.parameter_id
        )
      ) {
        newObj = Object.assign({}, newObj, {
          [el.parameter_id]: {
            featureOfInterest: el.feature_of_interest[0].featureOfInterset,
            time: { date: '' },
            exception: ''
          }
        })
      }
    })
    return {
      name: item.site_name,
      area: 'Yorkshire & Humberside',
      areaType: item.location_type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(item.latitude), parseFloat(item.longitude)]
      },
      updated: currentTime,
      pollutants: { ...newObj }
    }
  })

  const isleofManObj = isleofManJSON.map((item) => {
    let newObj = {}
    item.parameter_ids.forEach((el) => {
      if (
        ['O3', 'NO2', 'GE10', 'GR10', 'PM10', 'PM25', 'GR25', 'SO2'].includes(
          el.parameter_id
        )
      ) {
        newObj = Object.assign({}, newObj, {
          [el.parameter_id]: {
            featureOfInterest: el.feature_of_interest[0].featureOfInterset,
            time: { date: '' },
            exception: ''
          }
        })
      }
    })
    return {
      name: item.site_name,
      area: 'Yorkshire & Humberside',
      areaType: item.location_type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(item.latitude), parseFloat(item.longitude)]
      },
      updated: currentTime,
      pollutants: { ...newObj }
    }
  })
  logger.info(`Current DATE: ${currentTime}`)
  const centralScotlandObjSplit = centralScotlandObj.reduce((all, one, i) => {
    const ch = Math.floor(i % 12)
    all[ch] = [].concat(all[ch] || [], one)
    return all
  }, [])

  const easternObjSplit = easternObj.reduce((all, one, i) => {
    const ch = Math.floor(i % 12)
    all[ch] = [].concat(all[ch] || [], one)
    return all
  }, [])

  const southEastObjSplit = southEastObj.reduce((all, one, i) => {
    const ch = Math.floor(i % 19)
    all[ch] = [].concat(all[ch] || [], one)
    return all
  }, [])

  const southWalesObjSplit = southWalesObj.reduce((all, one, i) => {
    const ch = Math.floor(i % 9)
    all[ch] = [].concat(all[ch] || [], one)
    return all
  }, [])

  const northWestAndMerseysideObjSplit = northWestAndMerseysideObj.reduce(
    (all, one, i) => {
      const ch = Math.floor(i % 19)
      all[ch] = [].concat(all[ch] || [], one)
      return all
    },
    []
  )

  const southWestObjSplit = southWestObj.reduce((all, one, i) => {
    const ch = Math.floor(i % 14)
    all[ch] = [].concat(all[ch] || [], one)
    return all
  }, [])

  const eastMidlandsObjSplit = eastMidlandsObj.reduce((all, one, i) => {
    const ch = Math.floor(i % 14)
    all[ch] = [].concat(all[ch] || [], one)
    return all
  }, [])

  const scottishBordersObjSplit = scottishBordersObj.reduce((all, one, i) => {
    const ch = Math.floor(i % 3)
    all[ch] = [].concat(all[ch] || [], one)
    return all
  }, [])

  const northEastObjSplit = northEastObj.reduce((all, one, i) => {
    const ch = Math.floor(i % 9)
    all[ch] = [].concat(all[ch] || [], one)
    return all
  }, [])

  const greaterLondonObjSplit = greaterLondonObj.reduce((all, one, i) => {
    const ch = Math.floor(i % 16)
    all[ch] = [].concat(all[ch] || [], one)
    return all
  }, [])

  const westMidlandsObjSplit = westMidlandsObj.reduce((all, one, i) => {
    const ch = Math.floor(i % 15)
    all[ch] = [].concat(all[ch] || [], one)
    return all
  }, [])

  const yorkshireAndHumbersideObjSplit = yorkshireAndHumbersideObj.reduce(
    (all, one, i) => {
      const ch = Math.floor(i % 16)
      all[ch] = [].concat(all[ch] || [], one)
      return all
    },
    []
  )

  const isleofManObjSplit = isleofManObj.reduce((all, one, i) => {
    const ch = Math.floor(i % 7)
    all[ch] = [].concat(all[ch] || [], one)
    return all
  }, [])

  const highlandObjSplit = highlandObj.reduce((all, one, i) => {
    const ch = Math.floor(i % 4)
    all[ch] = [].concat(all[ch] || [], one)
    return all
  }, [])

  const northEastScotlandObjSplit = northEastScotlandObj.reduce(
    (all, one, i) => {
      const ch = Math.floor(i % 4)
      all[ch] = [].concat(all[ch] || [], one)
      return all
    },
    []
  )

  const northWalesObjSplit = northWalesObj.reduce((all, one, i) => {
    const ch = Math.floor(i % 2)
    all[ch] = [].concat(all[ch] || [], one)
    return all
  }, [])
  const northWalesResults1 = await pollutantUpdater(northWalesObjSplit[0])
  const northWalesResults2 = await pollutantUpdater(northWalesObjSplit[1])

  const NorthEastScotlandResults1 = await pollutantUpdater(
    northEastScotlandObjSplit[0]
  )
  const NorthEastScotlandResults2 = await pollutantUpdater(
    northEastScotlandObjSplit[1]
  )
  const NorthEastScotlandResults3 = await pollutantUpdater(
    northEastScotlandObjSplit[[2]]
  )
  const NorthEastScotlandResults4 = await pollutantUpdater(
    northEastScotlandObjSplit[3]
  )

  const highlandResults1 = await pollutantUpdater(highlandObjSplit[0])
  const highlandResults2 = await pollutantUpdater(highlandObjSplit[1])
  const highlandResults3 = await pollutantUpdater(highlandObjSplit[2])
  const highlandResults4 = await pollutantUpdater(highlandObjSplit[3])
  //
  const centralScotlandResults1 = await pollutantUpdater(
    centralScotlandObjSplit[0]
  )
  const centralScotlandResults2 = await pollutantUpdater(
    centralScotlandObjSplit[1]
  )
  const centralScotlandResults3 = await pollutantUpdater(
    centralScotlandObjSplit[2]
  )

  const centralScotlandResults4 = await pollutantUpdater(
    centralScotlandObjSplit[3]
  )
  const centralScotlandResults5 = await pollutantUpdater(
    centralScotlandObjSplit[4]
  )
  const centralScotlandResults6 = await pollutantUpdater(
    centralScotlandObjSplit[5]
  )
  const centralScotlandResults7 = await pollutantUpdater(
    centralScotlandObjSplit[6]
  )
  const centralScotlandResults8 = await pollutantUpdater(
    centralScotlandObjSplit[7]
  )
  const centralScotlandResults9 = await pollutantUpdater(
    centralScotlandObjSplit[8]
  )
  const centralScotlandResults10 = await pollutantUpdater(
    centralScotlandObjSplit[9]
  )
  const centralScotlandResults11 = await pollutantUpdater(
    centralScotlandObjSplit[10]
  )
  const centralScotlandResults12 = await pollutantUpdater(
    centralScotlandObjSplit[11]
  )
  //
  const easternResults1 = await pollutantUpdater(easternObjSplit[0])
  const easternResults2 = await pollutantUpdater(easternObjSplit[1])
  const easternResults3 = await pollutantUpdater(easternObjSplit[2])
  const easternResults4 = await pollutantUpdater(easternObjSplit[3])
  const easternResults5 = await pollutantUpdater(easternObjSplit[4])
  const easternResults6 = await pollutantUpdater(easternObjSplit[5])
  const easternResults7 = await pollutantUpdater(easternObjSplit[6])
  const easternResults8 = await pollutantUpdater(easternObjSplit[7])
  const easternResults9 = await pollutantUpdater(easternObjSplit[8])
  const easternResults10 = await pollutantUpdater(easternObjSplit[9])
  const easternResults11 = await pollutantUpdater(easternObjSplit[10])
  const easternResults12 = await pollutantUpdater(easternObjSplit[11])
  //
  const southEastResults1 = await pollutantUpdater(southEastObjSplit[0])
  const southEastResults2 = await pollutantUpdater(southEastObjSplit[1])
  const southEastResults3 = await pollutantUpdater(southEastObjSplit[2])
  const southEastResults4 = await pollutantUpdater(southEastObjSplit[3])
  const southEastResults5 = await pollutantUpdater(southEastObjSplit[4])
  const southEastResults6 = await pollutantUpdater(southEastObjSplit[5])
  const southEastResults7 = await pollutantUpdater(southEastObjSplit[6])
  const southEastResults8 = await pollutantUpdater(southEastObjSplit[7])
  const southEastResults9 = await pollutantUpdater(southEastObjSplit[8])
  const southEastResults10 = await pollutantUpdater(southEastObjSplit[9])
  const southEastResults11 = await pollutantUpdater(southEastObjSplit[10])
  const southEastResults12 = await pollutantUpdater(southEastObjSplit[11])
  const southEastResults13 = await pollutantUpdater(southEastObjSplit[12])
  const southEastResults14 = await pollutantUpdater(southEastObjSplit[13])
  const southEastResults15 = await pollutantUpdater(southEastObjSplit[14])
  const southEastResults16 = await pollutantUpdater(southEastObjSplit[15])
  const southEastResults17 = await pollutantUpdater(southEastObjSplit[16])
  const southEastResults18 = await pollutantUpdater(southEastObjSplit[17])
  const southEastResults19 = await pollutantUpdater(southEastObjSplit[18])

  const southWalesObjResults1 = await pollutantUpdater(southWalesObjSplit[0])
  const southWalesObjResults2 = await pollutantUpdater(southWalesObjSplit[1])
  const southWalesObjResults3 = await pollutantUpdater(southWalesObjSplit[2])
  const southWalesObjResults4 = await pollutantUpdater(southWalesObjSplit[3])
  const southWalesObjResults5 = await pollutantUpdater(southWalesObjSplit[4])
  const southWalesObjResults6 = await pollutantUpdater(southWalesObjSplit[5])
  const southWalesObjResults7 = await pollutantUpdater(southWalesObjSplit[6])
  const southWalesObjResults8 = await pollutantUpdater(southWalesObjSplit[7])
  const southWalesObjResults9 = await pollutantUpdater(southWalesObjSplit[8])
  //
  const northWestAndMerseysideResults1 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[0]
  )
  const northWestAndMerseysideResults2 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[1]
  )
  const northWestAndMerseysideResults3 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[2]
  )
  const northWestAndMerseysideResults4 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[3]
  )
  const northWestAndMerseysideResults5 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[4]
  )
  const northWestAndMerseysideResults6 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[5]
  )
  const northWestAndMerseysideResults7 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[6]
  )
  const northWestAndMerseysideResults8 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[7]
  )
  const northWestAndMerseysideResults9 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[8]
  )
  const northWestAndMerseysideResults10 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[9]
  )
  const northWestAndMerseysideResults11 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[10]
  )
  const northWestAndMerseysideResults12 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[11]
  )
  const northWestAndMerseysideResults13 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[12]
  )
  const northWestAndMerseysideResults14 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[13]
  )
  const northWestAndMerseysideResults15 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[14]
  )
  const northWestAndMerseysideResults16 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[15]
  )
  const northWestAndMerseysideResults17 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[16]
  )
  const northWestAndMerseysideResults18 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[17]
  )
  const northWestAndMerseysideResults19 = await pollutantUpdater(
    northWestAndMerseysideObjSplit[18]
  )
  //
  const southWestObjSplitResults1 = await pollutantUpdater(southWestObjSplit[0])
  const southWestObjSplitResults2 = await pollutantUpdater(southWestObjSplit[1])
  const southWestObjSplitResults3 = await pollutantUpdater(southWestObjSplit[2])
  const southWestObjSplitResults4 = await pollutantUpdater(southWestObjSplit[3])
  const southWestObjSplitResults5 = await pollutantUpdater(southWestObjSplit[4])
  const southWestObjSplitResults6 = await pollutantUpdater(southWestObjSplit[5])
  const southWestObjSplitResults7 = await pollutantUpdater(southWestObjSplit[6])
  const southWestObjSplitResults8 = await pollutantUpdater(southWestObjSplit[7])
  const southWestObjSplitResults9 = await pollutantUpdater(southWestObjSplit[8])
  const southWestObjSplitResults10 = await pollutantUpdater(
    southWestObjSplit[9]
  )
  const southWestObjSplitResults11 = await pollutantUpdater(
    southWestObjSplit[10]
  )
  const southWestObjSplitResults12 = await pollutantUpdater(
    southWestObjSplit[11]
  )
  const southWestObjSplitResults13 = await pollutantUpdater(
    southWestObjSplit[12]
  )
  const southWestObjSplitResults14 = await pollutantUpdater(
    southWestObjSplit[13]
  )
  //
  const eastMidlandsObjSplitResults1 = await pollutantUpdater(
    eastMidlandsObjSplit[0]
  )
  const eastMidlandsObjSplitResults2 = await pollutantUpdater(
    eastMidlandsObjSplit[1]
  )
  const eastMidlandsObjSplitResults3 = await pollutantUpdater(
    eastMidlandsObjSplit[2]
  )
  const eastMidlandsObjSplitResults4 = await pollutantUpdater(
    eastMidlandsObjSplit[3]
  )
  const eastMidlandsObjSplitResults5 = await pollutantUpdater(
    eastMidlandsObjSplit[4]
  )
  const eastMidlandsObjSplitResults6 = await pollutantUpdater(
    eastMidlandsObjSplit[5]
  )
  const eastMidlandsObjSplitResults7 = await pollutantUpdater(
    eastMidlandsObjSplit[6]
  )
  const eastMidlandsObjSplitResults8 = await pollutantUpdater(
    eastMidlandsObjSplit[7]
  )
  const eastMidlandsObjSplitResults9 = await pollutantUpdater(
    eastMidlandsObjSplit[8]
  )
  const eastMidlandsObjSplitResults10 = await pollutantUpdater(
    eastMidlandsObjSplit[9]
  )
  const eastMidlandsObjSplitResults11 = await pollutantUpdater(
    eastMidlandsObjSplit[10]
  )
  const eastMidlandsObjSplitResults12 = await pollutantUpdater(
    eastMidlandsObjSplit[11]
  )
  const eastMidlandsObjSplitResults13 = await pollutantUpdater(
    eastMidlandsObjSplit[12]
  )
  //
  const scottishBordersObjSplitResults1 = await pollutantUpdater(
    scottishBordersObjSplit[0]
  )
  const scottishBordersObjSplitResults2 = await pollutantUpdater(
    scottishBordersObjSplit[1]
  )
  const scottishBordersObjSplitResults3 = await pollutantUpdater(
    scottishBordersObjSplit[2]
  )
  //
  const northEastObjSplitResults1 = await pollutantUpdater(northEastObjSplit[0])
  const northEastObjSplitResults2 = await pollutantUpdater(northEastObjSplit[1])
  const northEastObjSplitResults3 = await pollutantUpdater(northEastObjSplit[2])
  const northEastObjSplitResults4 = await pollutantUpdater(northEastObjSplit[3])
  const northEastObjSplitResults5 = await pollutantUpdater(northEastObjSplit[4])
  const northEastObjSplitResults6 = await pollutantUpdater(northEastObjSplit[5])
  const northEastObjSplitResults7 = await pollutantUpdater(northEastObjSplit[6])
  const northEastObjSplitResults8 = await pollutantUpdater(northEastObjSplit[7])
  const northEastObjSplitResults9 = await pollutantUpdater(northEastObjSplit[8])
  //
  const greaterLondonObjSplitResults1 = await pollutantUpdater(
    greaterLondonObjSplit[0]
  )
  const greaterLondonObjSplitResults2 = await pollutantUpdater(
    greaterLondonObjSplit[1]
  )
  const greaterLondonObjSplitResults3 = await pollutantUpdater(
    greaterLondonObjSplit[2]
  )
  const greaterLondonObjSplitResults4 = await pollutantUpdater(
    greaterLondonObjSplit[3]
  )
  const greaterLondonObjSplitResults5 = await pollutantUpdater(
    greaterLondonObjSplit[4]
  )
  const greaterLondonObjSplitResults6 = await pollutantUpdater(
    greaterLondonObjSplit[5]
  )
  const greaterLondonObjSplitResults7 = await pollutantUpdater(
    greaterLondonObjSplit[6]
  )
  const greaterLondonObjSplitResults8 = await pollutantUpdater(
    greaterLondonObjSplit[7]
  )
  const greaterLondonObjSplitResults9 = await pollutantUpdater(
    greaterLondonObjSplit[8]
  )
  const greaterLondonObjSplitResults10 = await pollutantUpdater(
    greaterLondonObjSplit[9]
  )
  const greaterLondonObjSplitResults11 = await pollutantUpdater(
    greaterLondonObjSplit[10]
  )
  const greaterLondonObjSplitResults12 = await pollutantUpdater(
    greaterLondonObjSplit[11]
  )
  const greaterLondonObjSplitResults13 = await pollutantUpdater(
    greaterLondonObjSplit[12]
  )
  const greaterLondonObjSplitResults14 = await pollutantUpdater(
    greaterLondonObjSplit[13]
  )
  const greaterLondonObjSplitResults15 = await pollutantUpdater(
    greaterLondonObjSplit[14]
  )
  const greaterLondonObjSplitResults16 = await pollutantUpdater(
    greaterLondonObjSplit[15]
  )
  //
  const westMidlandsObjSplitResults1 = await pollutantUpdater(
    westMidlandsObjSplit[0]
  )
  const westMidlandsObjSplitResults2 = await pollutantUpdater(
    westMidlandsObjSplit[1]
  )
  const westMidlandsObjSplitResults3 = await pollutantUpdater(
    westMidlandsObjSplit[2]
  )
  const westMidlandsObjSplitResults4 = await pollutantUpdater(
    westMidlandsObjSplit[3]
  )
  const westMidlandsObjSplitResults5 = await pollutantUpdater(
    westMidlandsObjSplit[4]
  )
  const westMidlandsObjSplitResults6 = await pollutantUpdater(
    westMidlandsObjSplit[5]
  )
  const westMidlandsObjSplitResults7 = await pollutantUpdater(
    westMidlandsObjSplit[6]
  )
  const westMidlandsObjSplitResults8 = await pollutantUpdater(
    westMidlandsObjSplit[7]
  )
  const westMidlandsObjSplitResults9 = await pollutantUpdater(
    westMidlandsObjSplit[8]
  )
  const westMidlandsObjSplitResults10 = await pollutantUpdater(
    westMidlandsObjSplit[9]
  )
  const westMidlandsObjSplitResults11 = await pollutantUpdater(
    westMidlandsObjSplit[10]
  )
  const westMidlandsObjSplitResults12 = await pollutantUpdater(
    westMidlandsObjSplit[11]
  )
  const westMidlandsObjSplitResults13 = await pollutantUpdater(
    westMidlandsObjSplit[12]
  )
  const westMidlandsObjSplitResults14 = await pollutantUpdater(
    westMidlandsObjSplit[13]
  )
  const westMidlandsObjSplitResults15 = await pollutantUpdater(
    westMidlandsObjSplit[14]
  )
  //
  const yorkshireAndHumbersideObjSplitResults1 = await pollutantUpdater(
    yorkshireAndHumbersideObjSplit[0]
  )
  const yorkshireAndHumbersideObjSplitResults2 = await pollutantUpdater(
    yorkshireAndHumbersideObjSplit[1]
  )
  const yorkshireAndHumbersideObjSplitResults3 = await pollutantUpdater(
    yorkshireAndHumbersideObjSplit[2]
  )
  const yorkshireAndHumbersideObjSplitResults4 = await pollutantUpdater(
    yorkshireAndHumbersideObjSplit[3]
  )
  const yorkshireAndHumbersideObjSplitResults5 = await pollutantUpdater(
    yorkshireAndHumbersideObjSplit[4]
  )
  const yorkshireAndHumbersideObjSplitResults6 = await pollutantUpdater(
    yorkshireAndHumbersideObjSplit[5]
  )
  const yorkshireAndHumbersideObjSplitResults7 = await pollutantUpdater(
    yorkshireAndHumbersideObjSplit[6]
  )
  const yorkshireAndHumbersideObjSplitResults8 = await pollutantUpdater(
    yorkshireAndHumbersideObjSplit[7]
  )
  const yorkshireAndHumbersideObjSplitResults9 = await pollutantUpdater(
    yorkshireAndHumbersideObjSplit[8]
  )
  const yorkshireAndHumbersideObjSplitResults10 = await pollutantUpdater(
    yorkshireAndHumbersideObjSplit[9]
  )
  const yorkshireAndHumbersideObjSplitResults11 = await pollutantUpdater(
    yorkshireAndHumbersideObjSplit[10]
  )
  const yorkshireAndHumbersideObjSplitResults12 = await pollutantUpdater(
    yorkshireAndHumbersideObjSplit[11]
  )
  const yorkshireAndHumbersideObjSplitResults13 = await pollutantUpdater(
    yorkshireAndHumbersideObjSplit[12]
  )
  const yorkshireAndHumbersideObjSplitResults14 = await pollutantUpdater(
    yorkshireAndHumbersideObjSplit[13]
  )
  const yorkshireAndHumbersideObjSplitResults15 = await pollutantUpdater(
    yorkshireAndHumbersideObjSplit[14]
  )
  const yorkshireAndHumbersideObjSplitResults16 = await pollutantUpdater(
    yorkshireAndHumbersideObjSplit[15]
  )
  //
  const isleofManObjSplitResults1 = await pollutantUpdater(isleofManObjSplit[0])
  const isleofManObjSplitResults2 = await pollutantUpdater(isleofManObjSplit[1])
  const isleofManObjSplitResults3 = await pollutantUpdater(isleofManObjSplit[2])
  const isleofManObjSplitResults4 = await pollutantUpdater(isleofManObjSplit[3])
  const isleofManObjSplitResults5 = await pollutantUpdater(isleofManObjSplit[4])
  const isleofManObjSplitResults6 = await pollutantUpdater(isleofManObjSplit[5])
  const isleofManObjSplitResults7 = await pollutantUpdater(isleofManObjSplit[6])
  //
  const highlandObjSplitResults1 = await pollutantUpdater(highlandObjSplit[0])
  const highlandObjSplitResults2 = await pollutantUpdater(highlandObjSplit[1])
  const highlandObjSplitResults3 = await pollutantUpdater(highlandObjSplit[2])
  const highlandObjSplitResults4 = await pollutantUpdater(highlandObjSplit[3])

  const measurements = [
    ...NorthEastScotlandResults1,
    ...NorthEastScotlandResults2,
    ...NorthEastScotlandResults3,
    ...NorthEastScotlandResults4,
    ...northWalesResults1,
    ...northWalesResults2,
    ...highlandResults1,
    ...highlandResults2,
    ...highlandResults3,
    ...highlandResults4,
    ...centralScotlandResults1,
    ...centralScotlandResults2,
    ...centralScotlandResults3,
    ...centralScotlandResults4,
    ...centralScotlandResults5,
    ...centralScotlandResults6,
    ...centralScotlandResults7,
    ...centralScotlandResults8,
    ...centralScotlandResults9,
    ...centralScotlandResults10,
    ...centralScotlandResults11,
    ...centralScotlandResults12,
    ...easternResults1,
    ...easternResults2,
    ...easternResults3,
    ...easternResults4,
    ...easternResults5,
    ...easternResults6,
    ...easternResults7,
    ...easternResults8,
    ...easternResults9,
    ...easternResults10,
    ...easternResults11,
    ...easternResults12,
    ...southEastResults1,
    ...southEastResults2,
    ...southEastResults3,
    ...southEastResults4,
    ...southEastResults5,
    ...southEastResults6,
    ...southEastResults7,
    ...southEastResults8,
    ...southEastResults9,
    ...southEastResults10,
    ...southEastResults11,
    ...southEastResults12,
    ...southEastResults13,
    ...southEastResults14,
    ...southEastResults15,
    ...southEastResults16,
    ...southEastResults17,
    ...southEastResults18,
    ...southEastResults19,
    ...southWalesObjResults1,
    ...southWalesObjResults2,
    ...southWalesObjResults3,
    ...southWalesObjResults4,
    ...southWalesObjResults5,
    ...southWalesObjResults6,
    ...southWalesObjResults7,
    ...southWalesObjResults8,
    ...southWalesObjResults9,
    ...northWestAndMerseysideResults1,
    ...northWestAndMerseysideResults2,
    ...northWestAndMerseysideResults3,
    ...northWestAndMerseysideResults4,
    ...northWestAndMerseysideResults5,
    ...northWestAndMerseysideResults6,
    ...northWestAndMerseysideResults7,
    ...northWestAndMerseysideResults8,
    ...northWestAndMerseysideResults9,
    ...northWestAndMerseysideResults10,
    ...northWestAndMerseysideResults11,
    ...northWestAndMerseysideResults12,
    ...northWestAndMerseysideResults13,
    ...northWestAndMerseysideResults14,
    ...northWestAndMerseysideResults15,
    ...northWestAndMerseysideResults16,
    ...northWestAndMerseysideResults17,
    ...northWestAndMerseysideResults18,
    ...northWestAndMerseysideResults19,
    ...southWestObjSplitResults1,
    ...southWestObjSplitResults2,
    ...southWestObjSplitResults3,
    ...southWestObjSplitResults4,
    ...southWestObjSplitResults5,
    ...southWestObjSplitResults6,
    ...southWestObjSplitResults7,
    ...southWestObjSplitResults8,
    ...southWestObjSplitResults9,
    ...southWestObjSplitResults10,
    ...southWestObjSplitResults11,
    ...southWestObjSplitResults12,
    ...southWestObjSplitResults13,
    ...southWestObjSplitResults14,
    ...eastMidlandsObjSplitResults1,
    ...eastMidlandsObjSplitResults2,
    ...eastMidlandsObjSplitResults3,
    ...eastMidlandsObjSplitResults4,
    ...eastMidlandsObjSplitResults5,
    ...eastMidlandsObjSplitResults6,
    ...eastMidlandsObjSplitResults7,
    ...eastMidlandsObjSplitResults8,
    ...eastMidlandsObjSplitResults9,
    ...eastMidlandsObjSplitResults10,
    ...eastMidlandsObjSplitResults11,
    ...eastMidlandsObjSplitResults12,
    ...eastMidlandsObjSplitResults13,
    ...scottishBordersObjSplitResults1,
    ...scottishBordersObjSplitResults2,
    ...scottishBordersObjSplitResults3,
    ...northEastObjSplitResults1,
    ...northEastObjSplitResults2,
    ...northEastObjSplitResults3,
    ...northEastObjSplitResults4,
    ...northEastObjSplitResults5,
    ...northEastObjSplitResults6,
    ...northEastObjSplitResults7,
    ...northEastObjSplitResults8,
    ...northEastObjSplitResults9,
    ...greaterLondonObjSplitResults1,
    ...greaterLondonObjSplitResults2,
    ...greaterLondonObjSplitResults3,
    ...greaterLondonObjSplitResults4,
    ...greaterLondonObjSplitResults5,
    ...greaterLondonObjSplitResults6,
    ...greaterLondonObjSplitResults7,
    ...greaterLondonObjSplitResults8,
    ...greaterLondonObjSplitResults9,
    ...greaterLondonObjSplitResults10,
    ...greaterLondonObjSplitResults11,
    ...greaterLondonObjSplitResults12,
    ...greaterLondonObjSplitResults13,
    ...greaterLondonObjSplitResults14,
    ...greaterLondonObjSplitResults15,
    ...greaterLondonObjSplitResults16,
    ...westMidlandsObjSplitResults1,
    ...westMidlandsObjSplitResults2,
    ...westMidlandsObjSplitResults3,
    ...westMidlandsObjSplitResults4,
    ...westMidlandsObjSplitResults5,
    ...westMidlandsObjSplitResults6,
    ...westMidlandsObjSplitResults7,
    ...westMidlandsObjSplitResults8,
    ...westMidlandsObjSplitResults9,
    ...westMidlandsObjSplitResults10,
    ...westMidlandsObjSplitResults11,
    ...westMidlandsObjSplitResults12,
    ...westMidlandsObjSplitResults13,
    ...westMidlandsObjSplitResults14,
    ...westMidlandsObjSplitResults15,
    ...yorkshireAndHumbersideObjSplitResults1,
    ...yorkshireAndHumbersideObjSplitResults2,
    ...yorkshireAndHumbersideObjSplitResults3,
    ...yorkshireAndHumbersideObjSplitResults4,
    ...yorkshireAndHumbersideObjSplitResults5,
    ...yorkshireAndHumbersideObjSplitResults6,
    ...yorkshireAndHumbersideObjSplitResults7,
    ...yorkshireAndHumbersideObjSplitResults8,
    ...yorkshireAndHumbersideObjSplitResults9,
    ...yorkshireAndHumbersideObjSplitResults10,
    ...yorkshireAndHumbersideObjSplitResults11,
    ...yorkshireAndHumbersideObjSplitResults12,
    ...yorkshireAndHumbersideObjSplitResults13,
    ...yorkshireAndHumbersideObjSplitResults14,
    ...yorkshireAndHumbersideObjSplitResults15,
    ...yorkshireAndHumbersideObjSplitResults16,
    ...isleofManObjSplitResults1,
    ...isleofManObjSplitResults2,
    ...isleofManObjSplitResults3,
    ...isleofManObjSplitResults4,
    ...isleofManObjSplitResults5,
    ...isleofManObjSplitResults6,
    ...isleofManObjSplitResults7,
    ...highlandObjSplitResults1,
    ...highlandObjSplitResults2,
    ...highlandObjSplitResults3,
    ...highlandObjSplitResults4
  ]
  return measurements
}

const savePollutants = async (server, pollutants) => {
  // await server.db.collection('measurements').deleteMany({})
  // await server.db.collection('historicalMeasurements').deleteMany({})
  logger.info(`updating ${pollutants.length} pollutants`)
  try {
    await server.db
      .collection('measurements')
      .bulkWrite(pollutants.map(toBulkReplace))
  } catch (error) {
    logger.info('pollutants measurements error: ', error)
  }
  await server.db.collection('historicalMeasurements').insertMany(pollutants)
  logger.info('pollutants historical measurements update done')
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
