async function getPollutants(db) {
  const cursor = db
    .collection('measurements')
    .find({}, { projection: { _id: 0 } })

  return await cursor.toArray()
}

export { getPollutants }
