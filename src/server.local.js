import 'dotenv/config'
import { connectToDatabase } from './db/connection.js'
import { createBot } from './bot/index.js'
import { startReminderCron } from './services/reminderService.js'

async function startLocalBot() {
  await connectToDatabase()

  const bot = createBot()
  startReminderCron(bot)

  bot.catch((botError, ctx) => {
    console.error('[BOT ERROR] Необработанная ошибка:', botError)
    if (ctx) {
      ctx.reply(`❌ DEV ERROR:\n${botError.message}`).catch(() => {})
    }
  })

  await bot.launch()

  console.log('✅ Бот запущен локально через polling (long-polling)')
  console.log('🔧 Режим разработки — ошибки выводятся в чат и консоль')

  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))
}

startLocalBot().catch((startupError) => {
  console.error('❌ Ошибка запуска бота:', startupError)
  process.exit(1)
})
