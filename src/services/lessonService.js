import { LESSONS } from '../content/lessons.js'

export function getLessonByNumber(lessonNumber) {
  return LESSONS.find((lesson) => lesson.number === lessonNumber) || null
}

export function getStepsForUser(lesson, user) {
  if (lesson.number !== 5) {
    return lesson.steps
  }
  const track = user.lesson5Track
  return lesson.steps.filter((step) => {
    if (step.trackA === undefined && step.trackB === undefined) return true
    if (track === 'A') return step.trackA === true
    if (track === 'B') return step.trackB === true
    return true
  })
}

export function getCurrentStep(lesson, user) {
  const steps = getStepsForUser(lesson, user)
  return steps[user.currentStep] || null
}

export function getNextPosition(lesson, user) {
  const steps = getStepsForUser(lesson, user)
  const nextStepIndex = user.currentStep + 1

  if (nextStepIndex < steps.length) {
    return { nextLesson: lesson.number, nextStep: nextStepIndex, lessonCompleted: false }
  }

  const nextLessonNumber = lesson.number + 1
  const nextLesson = getLessonByNumber(nextLessonNumber)
  if (nextLesson) {
    return { nextLesson: nextLessonNumber, nextStep: 0, lessonCompleted: true }
  }

  return { nextLesson: lesson.number, nextStep: user.currentStep, lessonCompleted: false, courseCompleted: true }
}

export function buildLessonCompletedMessage(lessonNumber, userName, totalLessons) {
  const progressPercent = Math.round((lessonNumber / totalLessons) * 100)
  const progressBar = buildProgressBar(progressPercent)
  return `🔥 *Урок ${lessonNumber} завершён!*\n\n${progressBar} ${progressPercent}%\n\n${getMotivationalMessageForLesson(lessonNumber)}`
}

function buildProgressBar(percent) {
  const filledCount = Math.round(percent / 10)
  const emptyCount = 10 - filledCount
  return '█'.repeat(filledCount) + '░'.repeat(emptyCount)
}

function getMotivationalMessageForLesson(lessonNumber) {
  const motivationalMessages = {
    1: 'Первый шаг сделан. Именно здесь большинство остановились бы. Ты пошёл дальше.',
    2: 'Правила приняты. Теперь ты знаешь условия, при которых работает трансформация.',
    3: 'Контракт подписан. Ты только что взял на себя ответственность перед самым важным человеком — собой.',
    4: 'Разминка пройдена. Ты уже сделал больше, чем большинство людей делают за год.',
    5: 'Ты видел, как мотивация работает в реальных людях. Теперь ты знаешь — это возможно.',
    6: 'Голова становится чище. Пространство для нового освобождается.',
    7: 'Обратная связь принята. Впереди — настоящая работа.',
  }
  return motivationalMessages[lessonNumber] || 'Отличная работа. Продолжаем.'
}

export function buildStepMessage(step, lessonNumber, stepIndex, totalSteps) {
  return step.text
}

export function isFoodDiarySubmitLesson(lessonNumber) {
  const foodDiaryLesson = parseInt(process.env.FOOD_DIARY_SUBMIT_LESSON || '10')
  return lessonNumber === foodDiaryLesson
}
