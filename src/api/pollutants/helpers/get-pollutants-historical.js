/* eslint-disable prettier/prettier */
async function getPollutantsHistorical(db) {
  const cursor = db
    .collection('historicalMeasurements')
    .find({}, { projection: { _id: 0 } })

  return await cursor.toArray()
}

export { getPollutantsHistorical }
