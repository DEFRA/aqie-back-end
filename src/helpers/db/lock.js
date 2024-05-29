import { createLogger } from '~/src/helpers/logging/logger'
const logger = createLogger()

async function lock(db, lockName) {
  const locks = db.collection('locks')
  try {
    logger.info(`attempting to claim lock on ${lockName}`)
    await locks.insertOne({
      _id: lockName,
      timestamp: new Date()
    })
    logger.info(`lock on ${lockName} claim successfully`)
    return true
  } catch (error) {
    logger.info(`lock ${lockName} is already claimed`)
    return false
  }
}

async function unlock(db, lockName) {
  const locks = db.collection('locks')
  try {
    logger.info(`attempting to release lock ${lockName}`)
    return (await locks.deleteOne({ _id: lockName }).deletedCount) === 1
  } catch (error) {
    logger.warn(`failed to release lock ${lockName}`)
    return false
  }
}

export { lock, unlock }
