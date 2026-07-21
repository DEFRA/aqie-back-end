/**
 * DAQI breakpoint thresholds per pollutant.
 * Each array contains the upper µg/m³ limit for bands 1–9; band 10 is anything above band 9.
 * Source: https://uk-air.defra.gov.uk/air-pollution/daqi
 *
 * Averaging periods used by the Ricardo API (via data-type param):
 *   NO2  — hourly mean
 *   PM10 — 24-hour running mean (data-type=24)
 *   PM25 — 24-hour running mean (data-type=24)
 *   O3   — 8-hour running mean  (data-type=23)
 *   SO2  — 15-minute mean
 */
const DAQI_BREAKPOINTS = {
  NO2: [67, 134, 200, 267, 334, 400, 467, 534, 600],
  PM10: [16, 33, 50, 58, 66, 75, 83, 91, 100],
  PM25: [11, 23, 35, 41, 47, 53, 58, 64, 70],
  O3: [33, 66, 100, 120, 140, 160, 187, 213, 240],
  SO2: [88, 177, 266, 354, 443, 532, 710, 887, 1064]
}

/**
 * Returns the DAQI index (1–10) for a single pollutant concentration.
 *
 * @param {string} pollutantCode - One of 'NO2', 'PM10', 'PM25', 'O3', 'SO2'.
 * @param {number} value - Concentration in µg/m³.
 * @returns {number|null} DAQI index 1–10, or null if the pollutant is unknown or value is invalid.
 */
function daqiIndexForPollutant(pollutantCode, value) {
  const thresholds = DAQI_BREAKPOINTS[pollutantCode]
  if (!thresholds || value == null || !Number.isFinite(value) || value < 0) {
    return null
  }
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) {
      return i + 1
    }
  }
  return 10
}

/**
 * Calculates the overall DAQI index for a station as the maximum index
 * across all available pollutants.
 *
 * @param {{ [pollutantCode: string]: number }} pollutantValues - Map of pollutant code to concentration.
 * @returns {number|null} Overall DAQI index 1–10, or null if no valid values are provided.
 */
function calculateDaqiIndex(pollutantValues) {
  let maxDaqi = null
  for (const [code, value] of Object.entries(pollutantValues)) {
    const idx = daqiIndexForPollutant(code, value)
    if (idx !== null && (maxDaqi === null || idx > maxDaqi)) {
      maxDaqi = idx
    }
  }
  return maxDaqi
}

export { daqiIndexForPollutant, calculateDaqiIndex, DAQI_BREAKPOINTS }
