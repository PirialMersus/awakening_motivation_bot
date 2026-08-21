import cron from 'node-cron'

export function startPingCron() {
  cron.schedule('* * * * *', async () => {
    try {
      await fetch('https://hc-ping.com/69554277-5ded-408e-ab39-74fe7483a85f')
    } catch (error) {
      console.error('Ошибка пинга Healthchecks:', error.message)
    }
  })
  console.log('Крон для пинга Healthchecks запущен (каждую минуту)')
}
