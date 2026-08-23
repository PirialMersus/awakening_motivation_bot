import 'dotenv/config'
import mongoose from 'mongoose'

await mongoose.connect(process.env.MONGODB_URI)
console.log('MongoDB подключена')

const result = await mongoose.connection.collection('users').updateMany(
  {},
  { $unset: { customName: '' } }
)

console.log(`Очищено записей: ${result.modifiedCount}`)
await mongoose.disconnect()
