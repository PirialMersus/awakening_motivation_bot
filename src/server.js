import 'dotenv/config'
import express from 'express'
import { connectToDatabase } from './db/connection.js'
import { createBot } from './bot/index.js'
import { startReminderCron } from './services/reminderService.js'
import { startPingCron } from './services/pingService.js'

const PORT = process.env.PORT || 3000
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL

async function startServer() {
  await connectToDatabase()

  const bot = createBot()

  bot.catch((botError, ctx) => {
    console.error('[BOT ERROR] Необработанная ошибка:', botError)
    if (ctx) {
      ctx.reply('Произошла ошибка. Попробуй ещё раз или напиши /lesson').catch(() => {})
    }
  })

  startReminderCron(bot)
  startPingCron()

  const app = express()
  app.use(express.json())

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  const webhookPath = `/webhook/${process.env.TELEGRAM_BOT_TOKEN}`
  app.use(bot.webhookCallback(webhookPath))

  await bot.telegram.setWebhook(`${WEBHOOK_URL}${webhookPath}`)
  console.log(`Webhook установлен: ${WEBHOOK_URL}${webhookPath}`)

  app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`)
  })
}

startServer().catch((error) => {
  console.error('Ошибка запуска сервера:', error)
  process.exit(1)
})
