import { UserModel } from '../db/models/User.js'

export async function findOrCreateUser(telegramId, username, firstName) {
  let user = await UserModel.findOne({ telegramId })
  if (!user) {
    user = await UserModel.create({ telegramId, username, firstName })
  }
  return user
}

export async function getUserByTelegramId(telegramId) {
  return UserModel.findOne({ telegramId })
}

export async function updateUserActivity(telegramId) {
  await UserModel.updateOne(
    { telegramId },
    { lastActivityAt: new Date(), reminderLevel: 0, reminderLastSentAt: null }
  )
}

export async function setUserName(telegramId, customName) {
  await UserModel.updateOne(
    { telegramId },
    { customName, awaitingName: false }
  )
}

export async function saveContractData(telegramId, contractPhotoFileId, contractText) {
  await UserModel.updateOne(
    { telegramId },
    { contractPhotoFileId, contractText }
  )
}

export async function advanceUserStep(telegramId, nextLesson, nextStep) {
  await UserModel.updateOne(
    { telegramId },
    {
      currentLesson: nextLesson,
      currentStep: nextStep,
      lastActivityAt: new Date(),
      reminderLevel: 0,
      reminderLastSentAt: null,
    }
  )
}

export async function markLessonCompleted(telegramId, lessonNumber) {
  await UserModel.updateOne(
    { telegramId },
    { $addToSet: { completedLessons: lessonNumber } }
  )
}

export async function setLesson5Track(telegramId, track) {
  await UserModel.updateOne({ telegramId }, { lesson5Track: track })
}

export async function setFoodDiaryStarted(telegramId) {
  await UserModel.updateOne(
    { telegramId },
    { foodDiaryStartedAt: new Date() }
  )
}

export async function getUsersWithInactivity(hoursThreshold) {
  const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000)
  return UserModel.find({
    isActive: true,
    lastActivityAt: { $lt: cutoff },
    currentLesson: { $gt: 0 },
    completedLessons: { $not: { $size: 7 } },
  })
}

export async function updateReminderLevel(telegramId, level) {
  await UserModel.updateOne(
    { telegramId },
    { reminderLevel: level, reminderLastSentAt: new Date() }
  )
}
