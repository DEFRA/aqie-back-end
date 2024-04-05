/* eslint-disable prettier/prettier */
async function getForecastsHistorical(db) {
  const cursor = db
    .collection('historicalForecasts')
    .find({}, { projection: { _id: 0 } })

  return await cursor.toArray()
}

export { getForecastsHistorical }
