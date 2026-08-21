import cron from 'node-cron'
import { getUsersWithInactivity, updateReminderLevel } from './userService.js'

const REMINDER_LEVEL_1_HOURS = 24
const REMINDER_LEVEL_2_HOURS = 48
const REMINDER_LEVEL_3_HOURS = 72

const reminderMessages = {
  1: (name) =>
    `👋 Эй, ${name}!\n\nТвоё задание ждёт тебя. Всего несколько минут — и ты снова в потоке.\n\nНапиши /lesson чтобы продолжить →`,
  2: (name) =>
    `${name}, я замечаю, что ты пропал.\n\nЭто нормально — жизнь случается. Но ты пришёл сюда не случайно.\n\nЗадание сложное? Это нормально. Именно здесь и растут.\n\nНапиши /lesson чтобы вернуться →`,
  3: (name) =>
    `${name}.\n\n79% людей бросают именно на этом этапе.\n\nИменно здесь решается — кто ты.\n\nОдин шаг. Прямо сейчас.\n\n/lesson →`,
}

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
    const userName = user.customName || user.firstName || 'друг'
    const message = reminderMessages[level](userName)
    try {
      await bot.telegram.sendMessage(user.telegramId, message)
      await updateReminderLevel(user.telegramId, level)
    } catch (error) {
      console.error(`Не удалось отправить напоминание пользователю ${user.telegramId}:`, error)
    }
  }
}
