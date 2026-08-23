import cron from 'node-cron'
import { getUsersWithInactivity, updateReminderLevel } from './userService.js'

const REMINDER_LEVEL_1_HOURS = 24
const REMINDER_LEVEL_2_HOURS = 48
const REMINDER_LEVEL_3_HOURS = 72

function buildContractQuote(contractText) {
  if (!contractText) return null
  const firstThreeLines = contractText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 3)
    .join('\n')
  return firstThreeLines
}

const textReminderMessages = {
  1: (name, contractQuote) => {
    const contractPart = contractQuote
      ? `\n\nТы давал слово:\n_«${contractQuote}»_\n\nОно всё ещё в силе.`
      : ''
    return `👋 Эй, ${name}!\n\nТвоё задание ждёт тебя. Всего несколько минут — и ты снова в потоке.${contractPart}\n\nНапиши /lesson чтобы продолжить →`
  },
  2: (name) =>
    `${name}, я замечаю, что ты пропал.\n\nЭто нормально — жизнь случается. Но ты пришёл сюда не случайно.\n\nЗадание сложное? Это нормально. Именно здесь и растут.\n\nНапиши /lesson чтобы вернуться →`,
  3: (name) =>
    `${name}.\n\n79% людей бросают именно на этом этапе.\n\nИменно здесь решается — кто ты.\n\nОдин шаг. Прямо сейчас.\n\n/lesson →`,
}

const contractPhotoCaption = (name) =>
  `${name}, ты подписал этот контракт сам с собой.\n\nСлово, которое ты дал себе — важнее любого другого.\n\nНапиши /lesson чтобы продолжить →`

export function startReminderCron(bot) {
  cron.schedule('0 * * * *', async () => {
    try {
      await sendRemindersAtLevel(bot, REMINDER_LEVEL_1_HOURS, 1)
      await sendRemindersAtLevel(bot, REMINDER_LEVEL_2_HOURS, 2)
      await sendRemindersAtLevel(bot, REMINDER_LEVEL_3_HOURS, 3)
    } catch (error) {
      console.error('Ошибка в cron напоминаний:', error)
    }
  })
}

async function sendRemindersAtLevel(bot, hoursThreshold, level) {
  const inactiveUsers = await getUsersWithInactivity(hoursThreshold)
  for (const user of inactiveUsers) {
    if (user.reminderLevel >= level) continue
    const userName = user.firstName || 'друг'
    try {
      await sendReminderToUser(bot, user, userName, level)
      await updateReminderLevel(user.telegramId, level)
    } catch (error) {
      console.error(`Не удалось отправить напоминание пользователю ${user.telegramId}:`, error)
    }
  }
}

async function sendReminderToUser(bot, user, userName, level) {
  const hasContract = !!user.contractPhotoFileId

  if (level === 2 && hasContract) {
    await bot.telegram.sendPhoto(user.telegramId, user.contractPhotoFileId, {
      caption: contractPhotoCaption(userName),
    })
    return
  }

  const contractQuote = level === 1 ? buildContractQuote(user.contractText) : null
  const message = textReminderMessages[level](userName, contractQuote)
  await bot.telegram.sendMessage(user.telegramId, message, { parse_mode: 'Markdown' })
}
