import { Telegraf } from 'telegraf'
import { findOrCreateUser, getUserByTelegramId, updateUserActivity } from '../services/userService.js'
import { sendCurrentStep, handleConfirmStep, handleChoiceStep, handleTextSubmission, handlePhotoSubmission } from './handlers/stepHandler.js'
import { LESSONS } from '../content/lessons.js'

const safeReply = (ctx, text, extra = {}) =>
  ctx.reply(text, { protect_content: true, ...extra })

export function createBot() {
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

  bot.command('start', async (ctx) => {
    const { id, username, first_name } = ctx.from
    const user = await findOrCreateUser(id, username, first_name)

    const welcomeMessage = `🔥 *ПРОБУЖДЕНИЕ*

Привет, ${first_name}! Ты здесь не случайно.

Большинство людей живут по инерции — просыпаются, идут по привычному маршруту, засыпают. И завтра всё повторяется.

Но есть те, кто в какой-то момент задаёт себе честный вопрос: _«Это всё, на что я способен?»_

Если ты открыл этот бот — ты уже дал ответ.

Этот тренинг — не про мотивацию из видео. Это про действия, которые меняют жизнь. Это про тебя через несколько месяцев — другого.

📌 *Что тебя ждёт:*
• Уроки — видео + задания
• Прокачка всех сфер жизни
• Реальные задания — не читать, а делать
• AI-разбор твоих заданий с обратной связью

Это будет непросто. Именно так работает рост.

Запомни этот момент. Это точка отсчёта. Поехали 🔥`

    await safeReply(ctx, welcomeMessage, { parse_mode: 'Markdown' })
    await initUserAndStartLesson(ctx, id, username, first_name)
  })

  bot.command('progress', async (ctx) => {
    const user = await getUserByTelegramId(ctx.from.id)
    if (!user) {
      await safeReply(ctx, 'Напиши /start чтобы начать.')
      return
    }
    const completedCount = user.completedLessons.length
    const totalCount = LESSONS.length
    const percent = Math.round((completedCount / totalCount) * 100)
    const bar = '█'.repeat(Math.round(percent / 10)) + '░'.repeat(10 - Math.round(percent / 10))
    await safeReply(ctx, 
      `📊 *Твой прогресс*\n\n${bar} ${percent}%\n\nПройдено уроков: ${completedCount} из ${totalCount}\nТекущий урок: ${user.currentLesson}`,
      { parse_mode: 'Markdown' }
    )
  })

  bot.command('lesson', async (ctx) => {
    const user = await getUserByTelegramId(ctx.from.id)
    if (!user) {
      await safeReply(ctx, 'Напиши /start чтобы начать.')
      return
    }
    await updateUserActivity(user.telegramId)
    await sendCurrentStep(ctx, user)
  })

  bot.on('callback_query', async (ctx) => {
    const callbackData = ctx.callbackQuery.data
    const user = await getUserByTelegramId(ctx.from.id)
    if (!user) {
      await ctx.answerCbQuery()
      return
    }

    await ctx.answerCbQuery()

    if (callbackData === 'confirm_step') {
      await handleConfirmStep(ctx, user)
      return
    }

    if (callbackData.startsWith('choice_')) {
      const parts = callbackData.split('_')
      const savesTo = parts[1]
      const choiceValue = parts[2]
      await handleChoiceStep(ctx, user, savesTo, choiceValue)
      return
    }
  })

  bot.on('text', async (ctx) => {
    const user = await getUserByTelegramId(ctx.from.id)
    if (!user) {
      await safeReply(ctx, 'Напиши /start чтобы начать.')
      return
    }

    await handleTextSubmission(ctx, user, ctx.message.text)
  })

  bot.on('video', async (ctx) => {
    const video = ctx.message.video
    await safeReply(
      ctx,
      `📹 *file_id видео:*\n\`${video.file_id}\`\n\nСкопируй и передай мне для вставки в урок.`,
      { parse_mode: 'Markdown' }
    )
  })

  bot.on('photo', async (ctx) => {
    const user = await getUserByTelegramId(ctx.from.id)
    if (!user) {
      await safeReply(ctx, 'Напиши /start чтобы начать.')
      return
    }

    const photos = ctx.message.photo
    const largestPhoto = photos[photos.length - 1]
    const fileId = largestPhoto.file_id

    let photoBase64 = null
    let mimeType = 'image/jpeg'

    try {
      const fileLink = await ctx.telegram.getFileLink(fileId)
      const response = await fetch(fileLink.href)
      const arrayBuffer = await response.arrayBuffer()
      photoBase64 = Buffer.from(arrayBuffer).toString('base64')
    } catch (error) {
      console.error('Ошибка загрузки фото:', error)
    }

    await handlePhotoSubmission(ctx, user, fileId, photoBase64, mimeType)
  })

  return bot
}

async function initUserAndStartLesson(ctx, telegramId, username, firstName) {
  const { UserModel } = await import('../db/models/User.js')
  await UserModel.updateOne(
    { telegramId },
    { awaitingName: false, currentLesson: 1, currentStep: 0 },
    { upsert: true }
  )
  const user = await getUserByTelegramId(telegramId)
  await sendCurrentStep(ctx, user)
}
