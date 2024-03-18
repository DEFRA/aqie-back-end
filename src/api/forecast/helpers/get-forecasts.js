/* eslint-disable prettier/prettier */
async function getForecasts(db) {
  const cursor = db.collection('forecast').find({}, { projection: { _id: 0 } })

  return await cursor.toArray()
}

export { getForecasts }
