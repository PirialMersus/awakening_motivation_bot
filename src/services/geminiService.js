import { GoogleGenAI } from '@google/genai'

const geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const GEMINI_TIMEOUT_MS = 60000

function withTimeout(asyncPromise, timeoutMs) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Gemini не ответил за ${timeoutMs / 1000} секунд — timeout`)), timeoutMs)
  )
  return Promise.race([asyncPromise, timeoutPromise])
}

export async function checkEssayWithGemini(prompt, userText) {
  const fullPrompt = prompt.replace('{{USER_TEXT}}', userText)
  try {
    const response = await withTimeout(
      geminiClient.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: fullPrompt,
      }),
      GEMINI_TIMEOUT_MS
    )
    return response.text
  } catch (geminiError) {
    console.error('[GeminiService] ❌ Ошибка при проверке текста:')
    console.error('  message:', geminiError.message)
    console.error('  status:', geminiError.status)
    console.error('  stack:', geminiError.stack)
    return `❌ DEV ERROR — Gemini:\n${geminiError.message}`
  }
}

export async function checkPhotoWithGemini(prompt, photoBase64, mimeType) {
  try {
    const response = await withTimeout(
      geminiClient.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          { text: prompt },
          { inlineData: { data: photoBase64, mimeType } },
        ],
      }),
      GEMINI_TIMEOUT_MS
    )
    return response.text
  } catch (geminiError) {
    console.error('[GeminiService] ❌ Ошибка при проверке фото:')
    console.error('  message:', geminiError.message)
    console.error('  status:', geminiError.status)
    console.error('  stack:', geminiError.stack)
    return `❌ DEV ERROR — Gemini:\n${geminiError.message}`
  }
}

export function isApprovedByGemini(geminiResponse) {
  if (geminiResponse.startsWith('❌ DEV ERROR')) return false
  return geminiResponse.toUpperCase().includes('ПРИНЯТО')
}
