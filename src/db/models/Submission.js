import mongoose from 'mongoose'

const submissionSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true },
  lessonNumber: { type: Number, required: true },
  stepIndex: { type: Number, required: true },
  stepType: String,
  textContent: String,
  fileId: String,
  geminiResponse: String,
  isApproved: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now },
})

export const SubmissionModel = mongoose.model('Submission', submissionSchema)
