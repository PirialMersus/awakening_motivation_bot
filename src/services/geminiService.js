import { GoogleGenerativeAI } from '@google/generative-ai'

const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const textModel = geminiClient.getGenerativeModel({ model: 'gemini-3.7-flash' })
const visionModel = geminiClient.getGenerativeModel({ model: 'gemini-3.7-flash' })

export async function checkEssayWithGemini(prompt, userText) {
  const fullPrompt = prompt.replace('{{USER_TEXT}}', userText)
  const result = await textModel.generateContent(fullPrompt)
  return result.response.text()
}

export async function checkPhotoWithGemini(prompt, photoBase64, mimeType) {
  const result = await visionModel.generateContent([
    prompt,
    {
      inlineData: {
        data: photoBase64,
        mimeType: mimeType,
      },
    },
  ])
  return result.response.text()
}

export function isApprovedByGemini(geminiResponse) {
  return geminiResponse.toUpperCase().includes('ПРИНЯТО')
}
