import mongoose from 'mongoose'

export async function connectToDatabase() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('MongoDB подключена')
}
