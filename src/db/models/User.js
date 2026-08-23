import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  username: String,
  firstName: String,
  customName: String,
  registeredAt: { type: Date, default: Date.now },
  currentLesson: { type: Number, default: 1 },
  currentStep: { type: Number, default: 0 },
  completedLessons: { type: [Number], default: [] },
  lastActivityAt: { type: Date, default: Date.now },
  reminderLevel: { type: Number, default: 0 },
  reminderLastSentAt: Date,
  foodDiaryStartedAt: Date,
  lesson5Track: { type: String, enum: ['A', 'B'], default: null },
  lesson5BonusEnabled: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  awaitingName: { type: Boolean, default: false },
  contractPhotoFileId: { type: String, default: null },
  contractText: { type: String, default: null },
})

export const UserModel = mongoose.model('User', userSchema)
