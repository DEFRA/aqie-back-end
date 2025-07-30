import { proxyFetch } from '../../../helpers/proxy-fetch.js'
import { pollutantUpdater } from './pollutants-updater.js'
import { config } from '../../../config/index.js'

const url = config.get('pollutantstUrl')

async function getAPIPollutants(region, currentTime) {
  const res = await proxyFetch(url + region.id)
  const respose = await res.json()
  const obj = respose.map((item) => {
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
            startDate: el.feature_of_interest[0].start_date,
            endDate: el.feature_of_interest[0].ended_date,
            time: { date: '' },
            exception: ''
          }
        })
      }
    })
    return {
      name: item.site_name,
      area: region.name,
      localSiteID: item.local_site_id,
      areaType: item.location_type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(item.latitude), parseFloat(item.longitude)]
      },
      updated: currentTime,
      pollutants: { ...newObj }
    }
  })

  const split = obj.reduce((all, one, i) => {
    const ch = Math.floor(i % region.split) // again from data
    all[ch] = [].concat(all[ch] || [], one)
    return all
  }, [])
  const resulSplit = []
  for (let i = 0; i < split.length; i++) {
    resulSplit.push(await pollutantUpdater(split[i]))
  }
  return resulSplit
}

export { getAPIPollutants }
