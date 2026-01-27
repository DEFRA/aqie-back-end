/**
 * Converts forecastLocations into a format compatible with geolib (latitude and longitude).
 * Uses geolib.findNearest to find the closest point.
 * Maps the result back to the original forecastLocations array.
 * Returns the closest location.
 */
import * as geolib from 'geolib'

/**
 * Find the nearest forecast location by calculating the distance from user coordinates
 * @param {userCoordinates} userCoordinates
 * @param {forecastLocations} forecastLocations
 * @returns
 */
export async function findNearestLocation(userCoordinates, forecastLocations) {
  if (!Array.isArray(forecastLocations) || forecastLocations.length === 0) {
    console.log('No forecast locations available to find the nearest one.')
    return null // Return null if there are no locations to process
  }

  let nearestLocation = null
  /**
   * setting minDistance = Infinity at the beginning because we need a starting point for comparison.
   * Since distances are always positive, the smallest possible value should replace Infinity in our first comparison.
   * If we set minDistance = 0, then no distance would be smaller, and the logic wouldn’t work
   */
  let minDistance = Infinity

  forecastLocations.forEach((forecast) => {
    if (
      !forecast.location ||
      !forecast.location.coordinates ||
      forecast.location.coordinates.length < 2
    ) {
      console.log(`Invalid coordinates in forecast location: ${forecast.name}`)
      return // Skip invalid forecasts
    }

    // Use geolib to calculate the distance
    const distance = geolib.getDistance(
      { latitude: userCoordinates[0], longitude: userCoordinates[1] },
      {
        latitude: forecast.location.coordinates[0],
        longitude: forecast.location.coordinates[1]
      }
    )

    if (distance < minDistance) {
      minDistance = distance
      nearestLocation = forecast // Store the nearest forecast
    }
  })

  if (nearestLocation) {
    console.log(`Found nearest location: ${nearestLocation.name}`)
  } else {
    console.log('No valid nearest location found.')
  }

  return nearestLocation
}

// // Example usage:
// const userCoords = [51.5074, -0.1278] // Example: London coordinates
// const forecastLocations = [
//   { name: 'SOUTHAMPTON AIRPORT', coordinates: [50.9503, -1.3567] },
//   { name: 'LONDON CITY AIRPORT', coordinates: [51.5048, 0.058] },
//   { name: 'MANCHESTER AIRPORT', coordinates: [53.365, -2.272] }
// ]

// const nearest = findNearestLocation(userCoords, forecastLocations)
// console.log('Nearest location:', nearest)
