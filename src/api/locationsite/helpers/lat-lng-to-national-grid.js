/**
 * Converts WGS84 latitude/longitude coordinates to British National Grid (OSGB36)
 * easting and northing values using the Ordnance Survey Helmert transformation.
 *
 * Algorithm: "A guide to coordinate systems in Great Britain" (document C)
 * {@link https://www.ordnancesurvey.co.uk/documents/resources/guide-coordinate-systems-great-britain.pdf}
 *
 * Steps performed:
 *  1. WGS84 lat/lng → WGS84 Cartesian (X, Y, Z)
 *  2. Helmert 7-parameter transformation WGS84 → OSGB36 Cartesian
 *  3. OSGB36 Cartesian → OSGB36 lat/lng (iterative)
 *  4. OSGB36 lat/lng → BNG Transverse Mercator easting/northing
 *
 * @param {number} lat - WGS84 latitude in decimal degrees (e.g. 51.5074)
 * @param {number} lng - WGS84 longitude in decimal degrees (e.g. -0.1278)
 * @returns {{ easting: number, northing: number }} BNG easting and northing in metres
 */

const DEGREES_IN_HALF_CIRCLE = 180
const toRadians = (degrees) => (degrees * Math.PI) / DEGREES_IN_HALF_CIRCLE

// ── Algorithm constants ───────────────────────────────────────────────────
const ARCSECONDS_PER_DEGREE = 3600
const MAX_ITERATIONS = 10
const COORD_ROUNDING_FACTOR = 100

// OSGB36 ellipsoid parameters (shared between steps 3 and 4)
const OSGB36_SEMI_MAJOR_AXIS = 6377563.396 // metres
const OSGB36_SEMI_MINOR_AXIS = 6356256.909 // metres
const OSGB36_ECCENTRICITY_SQUARED =
  1 -
  (OSGB36_SEMI_MINOR_AXIS * OSGB36_SEMI_MINOR_AXIS) /
    (OSGB36_SEMI_MAJOR_AXIS * OSGB36_SEMI_MAJOR_AXIS)

// BNG Transverse Mercator projection parameters
const CENTRAL_MERIDIAN_SCALE_FACTOR = 0.9996012717
const TRUE_ORIGIN_LAT_DEGREES = 49 // 49° N
const TRUE_ORIGIN_LNG_DEGREES = -2 // 2° W
const TRUE_ORIGIN_LAT_RADIANS = toRadians(TRUE_ORIGIN_LAT_DEGREES)
const TRUE_ORIGIN_LNG_RADIANS = toRadians(TRUE_ORIGIN_LNG_DEGREES)
const FALSE_EASTING = 400000 // metres
const FALSE_NORTHING = -100000 // metres

// Meridian arc series coefficients (OS Guide to coordinate systems, Appendix C)
const ARC_COEFF_5_4 = 1.25
const ARC_COEFF_3 = 3
const ARC_COEFF_21_8 = 2.625
const ARC_COEFF_15_8 = 1.875
const ARC_COEFF_35_24 = 1.4583333333333333

// Transverse Mercator northing/easting polynomial coefficients
const TM_N3_DIVISOR = 24
const TM_N4_DIVISOR = 720
const TM_COEFF_5 = 5
const TM_COEFF_9 = 9
const TM_COEFF_14 = 14
const TM_COEFF_18 = 18
const TM_COEFF_58 = 58
const TM_COEFF_61 = 61
const TM_E2_DIVISOR = 6
const TM_E3_DIVISOR = 120

// Polynomial power exponents
const POLY_POWER_3 = 3
const POLY_POWER_4 = 4
const POLY_POWER_5 = 5
const POLY_POWER_6 = 6
const MERIDIONAL_RADIUS_POWER = 1.5 // (1 - e²sin²φ)^(3/2) for meridional radius

// Helmert 7-parameter transformation rotation and scale constants (OS document, Table 1)
const HELMERT_ROTATION_X_ARCSEC = -0.1502 // arcseconds
const HELMERT_ROTATION_Y_ARCSEC = -0.247 // arcseconds
const HELMERT_ROTATION_Z_ARCSEC = -0.8421 // arcseconds
const HELMERT_SCALE_PPM = 20.4894e-6

// ── Step 1: WGS84 lat/lng → WGS84 Cartesian (X, Y, Z) ──────────────────
function wgs84ToCartesian(lat, lng) {
  const wgs84SemiMajorAxis = 6378137 // metres
  const wgs84SemiMinorAxis = 6356752.3141 // metres
  const wgs84EccentricitySquared =
    1 -
    (wgs84SemiMinorAxis * wgs84SemiMinorAxis) /
      (wgs84SemiMajorAxis * wgs84SemiMajorAxis)

  const latRadians = toRadians(lat)
  const lngRadians = toRadians(lng)
  const sinLatitude = Math.sin(latRadians)
  const cosLatitude = Math.cos(latRadians)
  const primeVerticalRadius =
    wgs84SemiMajorAxis /
    Math.sqrt(1 - wgs84EccentricitySquared * sinLatitude * sinLatitude)

  const cartesianX = primeVerticalRadius * cosLatitude * Math.cos(lngRadians)
  const cartesianY = primeVerticalRadius * cosLatitude * Math.sin(lngRadians)
  const cartesianZ =
    primeVerticalRadius * (1 - wgs84EccentricitySquared) * sinLatitude

  return { cartesianX, cartesianY, cartesianZ }
}

// ── Step 2: Helmert 7-parameter transformation WGS84 → OSGB36 ───────────
function applyHelmertTransform(cartesianX, cartesianY, cartesianZ) {
  // Parameters from OS document, Table 1
  const translationX = -446.448 // metres
  const translationY = 125.157
  const translationZ = -542.06
  const rotationX = toRadians(HELMERT_ROTATION_X_ARCSEC / ARCSECONDS_PER_DEGREE) // arcseconds → radians
  const rotationY = toRadians(HELMERT_ROTATION_Y_ARCSEC / ARCSECONDS_PER_DEGREE)
  const rotationZ = toRadians(HELMERT_ROTATION_Z_ARCSEC / ARCSECONDS_PER_DEGREE)
  const scaleFactor = 1 + HELMERT_SCALE_PPM

  const osgb36CartesianX =
    translationX +
    scaleFactor * (cartesianX - rotationZ * cartesianY + rotationY * cartesianZ)
  const osgb36CartesianY =
    translationY +
    scaleFactor * (rotationZ * cartesianX + cartesianY - rotationX * cartesianZ)
  const osgb36CartesianZ =
    translationZ +
    scaleFactor *
      (-rotationY * cartesianX + rotationX * cartesianY + cartesianZ)

  return { osgb36CartesianX, osgb36CartesianY, osgb36CartesianZ }
}

// ── Step 3: OSGB36 Cartesian → OSGB36 lat/lng (iterative) ───────────────
function osgb36CartesianToLatLng(x, y, z) {
  const horizontalDistance = Math.hypot(x, y)
  let latRadians = Math.atan2(
    z,
    horizontalDistance * (1 - OSGB36_ECCENTRICITY_SQUARED)
  )

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const iterativePrimeVerticalRadius =
      OSGB36_SEMI_MAJOR_AXIS /
      Math.sqrt(
        1 -
          OSGB36_ECCENTRICITY_SQUARED *
            Math.sin(latRadians) *
            Math.sin(latRadians)
      )
    latRadians = Math.atan2(
      z +
        OSGB36_ECCENTRICITY_SQUARED *
          iterativePrimeVerticalRadius *
          Math.sin(latRadians),
      horizontalDistance
    )
  }

  const lngRadians = Math.atan2(y, x)
  return { osgb36LatRadians: latRadians, osgb36LngRadians: lngRadians }
}

// ── Step 4 helper: meridian arc length along the OSGB36 ellipsoid ────────
function computeMeridianArcLength(
  thirdFlattening,
  latRadians,
  originLatRadians
) {
  const thirdFlatteningSquared = thirdFlattening * thirdFlattening
  const thirdFlatteningCubed =
    thirdFlattening * thirdFlattening * thirdFlattening

  const arcTermA =
    (1 +
      thirdFlattening +
      ARC_COEFF_5_4 * thirdFlatteningSquared +
      ARC_COEFF_5_4 * thirdFlatteningCubed) *
    (latRadians - originLatRadians)
  const arcTermB =
    (ARC_COEFF_3 * thirdFlattening +
      ARC_COEFF_3 * thirdFlatteningSquared +
      ARC_COEFF_21_8 * thirdFlatteningCubed) *
    Math.sin(latRadians - originLatRadians) *
    Math.cos(latRadians + originLatRadians)
  const arcTermC =
    (ARC_COEFF_15_8 * thirdFlatteningSquared +
      ARC_COEFF_15_8 * thirdFlatteningCubed) *
    Math.sin(2 * (latRadians - originLatRadians)) *
    Math.cos(2 * (latRadians + originLatRadians))
  const arcTermD =
    ARC_COEFF_35_24 *
    thirdFlatteningCubed *
    Math.sin(ARC_COEFF_3 * (latRadians - originLatRadians)) *
    Math.cos(ARC_COEFF_3 * (latRadians + originLatRadians))

  return (
    OSGB36_SEMI_MINOR_AXIS *
    CENTRAL_MERIDIAN_SCALE_FACTOR *
    (arcTermA - arcTermB + arcTermC - arcTermD)
  )
}

// ── Step 4: OSGB36 lat/lng → BNG Transverse Mercator easting/northing ───
function osgb36ToEastingNorthing(osgb36LatRadians, osgb36LngRadians) {
  const thirdFlattening =
    (OSGB36_SEMI_MAJOR_AXIS - OSGB36_SEMI_MINOR_AXIS) /
    (OSGB36_SEMI_MAJOR_AXIS + OSGB36_SEMI_MINOR_AXIS)

  const sinLat = Math.sin(osgb36LatRadians)
  const cosLat = Math.cos(osgb36LatRadians)
  const tanLat = Math.tan(osgb36LatRadians)

  const meridionalRadius =
    (OSGB36_SEMI_MAJOR_AXIS *
      CENTRAL_MERIDIAN_SCALE_FACTOR *
      (1 - OSGB36_ECCENTRICITY_SQUARED)) /
    Math.pow(
      1 - OSGB36_ECCENTRICITY_SQUARED * sinLat * sinLat,
      MERIDIONAL_RADIUS_POWER
    )
  const transverseRadius =
    (OSGB36_SEMI_MAJOR_AXIS * CENTRAL_MERIDIAN_SCALE_FACTOR) /
    Math.sqrt(1 - OSGB36_ECCENTRICITY_SQUARED * sinLat * sinLat)
  const secondEccentricitySquared = transverseRadius / meridionalRadius - 1

  const meridianArcLength = computeMeridianArcLength(
    thirdFlattening,
    osgb36LatRadians,
    TRUE_ORIGIN_LAT_RADIANS
  )

  const longitudeDelta = osgb36LngRadians - TRUE_ORIGIN_LNG_RADIANS
  const northingCoeff1 = meridianArcLength + FALSE_NORTHING
  const northingCoeff2 = (transverseRadius / 2) * sinLat * cosLat
  const northingCoeff3 =
    (transverseRadius / TM_N3_DIVISOR) *
    sinLat *
    Math.pow(cosLat, POLY_POWER_3) *
    (TM_COEFF_5 - tanLat * tanLat + TM_COEFF_9 * secondEccentricitySquared)
  const northingCoeff4 =
    (transverseRadius / TM_N4_DIVISOR) *
    sinLat *
    Math.pow(cosLat, POLY_POWER_5) *
    (TM_COEFF_61 -
      TM_COEFF_58 * tanLat * tanLat +
      Math.pow(tanLat, POLY_POWER_4))
  const eastingCoeff1 = transverseRadius * cosLat
  const eastingCoeff2 =
    (transverseRadius / TM_E2_DIVISOR) *
    Math.pow(cosLat, POLY_POWER_3) *
    (transverseRadius / meridionalRadius - tanLat * tanLat)
  const eastingCoeff3 =
    (transverseRadius / TM_E3_DIVISOR) *
    Math.pow(cosLat, POLY_POWER_5) *
    (TM_COEFF_5 -
      TM_COEFF_18 * tanLat * tanLat +
      Math.pow(tanLat, POLY_POWER_4) +
      TM_COEFF_14 * secondEccentricitySquared -
      TM_COEFF_58 * tanLat * tanLat * secondEccentricitySquared)

  const easting =
    Math.round(
      (FALSE_EASTING +
        eastingCoeff1 * longitudeDelta +
        eastingCoeff2 * Math.pow(longitudeDelta, POLY_POWER_3) +
        eastingCoeff3 * Math.pow(longitudeDelta, POLY_POWER_5)) *
        COORD_ROUNDING_FACTOR
    ) / COORD_ROUNDING_FACTOR
  const northing =
    Math.round(
      (northingCoeff1 +
        northingCoeff2 * longitudeDelta * longitudeDelta +
        northingCoeff3 * Math.pow(longitudeDelta, POLY_POWER_4) +
        northingCoeff4 * Math.pow(longitudeDelta, POLY_POWER_6)) *
        COORD_ROUNDING_FACTOR
    ) / COORD_ROUNDING_FACTOR

  return { easting, northing }
}

// ── Public entry point ────────────────────────────────────────────────────
function latLngToNationalGrid(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new RangeError(
      `latLngToNationalGrid requires finite numeric coordinates (lat=${lat}, lng=${lng})`
    )
  }
  const { cartesianX, cartesianY, cartesianZ } = wgs84ToCartesian(lat, lng)
  const { osgb36CartesianX, osgb36CartesianY, osgb36CartesianZ } =
    applyHelmertTransform(cartesianX, cartesianY, cartesianZ)
  const { osgb36LatRadians, osgb36LngRadians } = osgb36CartesianToLatLng(
    osgb36CartesianX,
    osgb36CartesianY,
    osgb36CartesianZ
  )
  return osgb36ToEastingNorthing(osgb36LatRadians, osgb36LngRadians)
}

export { latLngToNationalGrid }
