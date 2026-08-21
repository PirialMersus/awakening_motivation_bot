import { Markup } from 'telegraf'

const safeReply = (ctx, text, extra = {}) =>
  ctx.reply(text, { protect_content: true, ...extra })
import { SubmissionModel } from '../../db/models/Submission.js'
import { checkEssayWithGemini, checkPhotoWithGemini, isApprovedByGemini } from '../../services/geminiService.js'
import {
  getLessonByNumber,
  getCurrentStep,
  getNextPosition,
  getStepsForUser,
  buildLessonCompletedMessage,
  isFoodDiarySubmitLesson,
} from '../../services/lessonService.js'
import {
  advanceUserStep,
  markLessonCompleted,
  updateUserActivity,
  setLesson5Track,
  setFoodDiaryStarted,
} from '../../services/userService.js'
import { LESSONS } from '../../content/lessons.js'

export async function sendCurrentStep(ctx, user) {
  const lesson = getLessonByNumber(user.currentLesson)
  if (!lesson) {
    await safeReply(ctx, '🎉 Ты прошёл все доступные уроки! Новые уроки скоро появятся.')
    return
  }

  const step = getCurrentStep(lesson, user)
  if (!step) {
    await safeReply(ctx, 'Произошла ошибка. Напиши /start для перезапуска.')
    return
  }

  await deliverStep(ctx, step, lesson, user)
}

async function deliverStep(ctx, step, lesson, user) {
  const stepTypes = {
    video: deliverVideoStep,
    essay: deliverEssayStep,
    photo: deliverPhotoStep,
    photo_or_confirm: deliverPhotoOrConfirmStep,
    confirm: deliverConfirmStep,
    info: deliverInfoStep,
    choice: deliverChoiceStep,
    social: deliverSocialStep,
  }

  const deliverFunction = stepTypes[step.type]
  if (deliverFunction) {
    await deliverFunction(ctx, step, lesson, user)
  }
}

async function deliverVideoStep(ctx, step) {
  await ctx.replyWithVideo(step.videoUrl, {
    caption: step.text,
    parse_mode: 'Markdown',
    protect_content: true,
    ...Markup.inlineKeyboard([[Markup.button.callback(step.confirmButtonText, 'confirm_step')]]),
  })
}

async function deliverEssayStep(ctx, step) {
  await safeReply(ctx, step.text, { parse_mode: 'Markdown' })
}

async function deliverPhotoStep(ctx, step) {
  await safeReply(ctx, step.text, { parse_mode: 'Markdown' })
}

async function deliverPhotoOrConfirmStep(ctx, step) {
  await safeReply(ctx, step.text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([[Markup.button.callback(step.confirmButtonText, 'confirm_step')]]),
  })
}

async function deliverConfirmStep(ctx, step) {
  await safeReply(ctx, step.text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([[Markup.button.callback(step.confirmButtonText, 'confirm_step')]]),
  })
}

async function deliverInfoStep(ctx, step) {
  await safeReply(ctx, step.text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([[Markup.button.callback(step.confirmButtonText, 'confirm_step')]]),
  })
}

async function deliverChoiceStep(ctx, step) {
  const buttons = step.choices.map((choice) =>
    Markup.button.callback(choice.label, `choice_${step.savesTo}_${choice.value}`)
  )
  await safeReply(ctx, step.text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([buttons]),
  })
}

async function deliverSocialStep(ctx, step) {
  await safeReply(ctx, step.text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([[Markup.button.callback(step.confirmButtonText, 'confirm_step')]]),
  })
}

export async function handleConfirmStep(ctx, user) {
  await updateUserActivity(user.telegramId)
  const lesson = getLessonByNumber(user.currentLesson)
  const step = getCurrentStep(lesson, user)

  if (step.startsFoodDiary) {
    await setFoodDiaryStarted(user.telegramId)
  }

  await moveToNextStep(ctx, user, lesson)
}

export async function handleChoiceStep(ctx, user, savesTo, choiceValue) {
  await updateUserActivity(user.telegramId)

  if (savesTo === 'lesson5Track') {
    await setLesson5Track(user.telegramId, choiceValue)
  }

  const lesson = getLessonByNumber(user.currentLesson)
  user.lesson5Track = choiceValue
  await moveToNextStep(ctx, user, lesson)
}

export async function handleTextSubmission(ctx, user, text) {
  await updateUserActivity(user.telegramId)
  const lesson = getLessonByNumber(user.currentLesson)
  const step = getCurrentStep(lesson, user)

  if (!step) return

  const acceptableTextTypes = ['essay', 'social']
  if (!acceptableTextTypes.includes(step.type)) {
    if (step.type === 'photo' || step.type === 'photo_or_confirm') {
      await safeReply(ctx, '📸 Для этого задания нужно прислать фотографию.')
      return
    }
    if (step.type === 'confirm' || step.type === 'info' || step.type === 'video') {
      await safeReply(ctx, 'Нажми кнопку для подтверждения.')
      return
    }
    return
  }

  if (step.type === 'social') {
    await saveSubmission(user.telegramId, lesson.number, user.currentStep, 'social', text, null, 'принято', true)
    await moveToNextStep(ctx, user, lesson)
    return
  }

  if (step.geminiCheck) {
    if (text.length < (step.minLength || 50)) {
      await safeReply(ctx, `✏️ Слишком коротко. Напиши подробнее (минимум ${step.minLength || 50} символов).`)
      return
    }

    await safeReply(ctx, '⏳ Проверяю задание...')

    const geminiResponse = await checkEssayWithGemini(step.geminiPrompt, text)
    const approved = isApprovedByGemini(geminiResponse)

    await saveSubmission(user.telegramId, lesson.number, user.currentStep, 'essay', text, null, geminiResponse, approved)

    await safeReply(ctx, `💬 *Разбор задания:*\n\n${geminiResponse}`, { parse_mode: 'Markdown' })

    if (approved) {
      await moveToNextStep(ctx, user, lesson)
    }
  } else {
    await saveSubmission(user.telegramId, lesson.number, user.currentStep, 'essay', text, null, null, true)
    await moveToNextStep(ctx, user, lesson)
  }
}

export async function handlePhotoSubmission(ctx, user, photoFileId, photoBase64, mimeType) {
  await updateUserActivity(user.telegramId)
  const lesson = getLessonByNumber(user.currentLesson)
  const step = getCurrentStep(lesson, user)

  if (!step) return

  const acceptablePhotoTypes = ['photo', 'photo_or_confirm', 'social']
  if (!acceptablePhotoTypes.includes(step.type)) {
    await safeReply(ctx, 'Для этого шага нужен текст, а не фото.')
    return
  }

  if (step.geminiCheck && photoBase64) {
    await safeReply(ctx, '⏳ Проверяю фото...')
    const geminiResponse = await checkPhotoWithGemini(step.geminiPrompt, photoBase64, mimeType)
    const approved = isApprovedByGemini(geminiResponse)

    await saveSubmission(user.telegramId, lesson.number, user.currentStep, 'photo', null, photoFileId, geminiResponse, approved)

    await safeReply(ctx, `💬 *Разбор:*\n\n${geminiResponse}`, { parse_mode: 'Markdown' })

    if (approved) {
      await moveToNextStep(ctx, user, lesson)
    }
  } else {
    await saveSubmission(user.telegramId, lesson.number, user.currentStep, 'photo', null, photoFileId, null, true)
    await moveToNextStep(ctx, user, lesson)
  }
}

async function moveToNextStep(ctx, user, lesson) {
  const { nextLesson, nextStep, lessonCompleted, courseCompleted } = getNextPosition(lesson, user)

  if (courseCompleted) {
    await safeReply(ctx, '🎉 *Поздравляем! Ты прошёл все уроки тренинга ПРОБУЖДЕНИЕ!*\n\nЭто было непросто. Ты дошёл.', {
      parse_mode: 'Markdown',
    })
    return
  }

  if (lessonCompleted) {
    await markLessonCompleted(user.telegramId, lesson.number)
    const completionMessage = buildLessonCompletedMessage(lesson.number, user.customName || user.firstName, LESSONS.length)
    await safeReply(ctx, completionMessage, { parse_mode: 'Markdown' })
  }

  await advanceUserStep(user.telegramId, nextLesson, nextStep)

  user.currentLesson = nextLesson
  user.currentStep = nextStep

  if (lessonCompleted) {
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  const nextLessonObj = getLessonByNumber(nextLesson)
  if (nextLessonObj) {
    await sendCurrentStep(ctx, user)
  }
}

async function saveSubmission(telegramId, lessonNumber, stepIndex, stepType, textContent, fileId, geminiResponse, isApproved) {
  await SubmissionModel.create({
    telegramId,
    lessonNumber,
    stepIndex,
    stepType,
    textContent,
    fileId,
    geminiResponse,
    isApproved,
  })
}
