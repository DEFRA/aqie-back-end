async function getMonitoringStations(db) {
  const cursor = db
    .collection('monitoringStations')
    .find({}, { projection: { _id: 0 } })

  return cursor.toArray()
}

export { getMonitoringStations }
