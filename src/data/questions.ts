import type { AnswerRow } from '../types/game'

export interface QuestionData {
  question: string
  answers: { text: string; points: number }[]
}

/** Вопросы по умолчанию при ошибке загрузки или отсутствии public/questions.json */
export const DEFAULT_QUESTIONS: QuestionData[] = [
  {
    question: 'Что можно найти в женской сумочке?',
    answers: [
      { text: 'Помада', points: 40 },
      { text: 'Зеркало', points: 25 },
      { text: 'Расчёска', points: 15 },
      { text: 'Телефон', points: 10 },
      { text: 'Ключи', points: 5 },
      { text: 'Деньги', points: 5 }
    ]
  }
]

export function toAnswerRows(answers: { text: string; points: number }[]): AnswerRow[] {
  return answers
    .sort((a, b) => b.points - a.points)
    .map((a, id) => ({ id, text: a.text, points: a.points, revealed: false }))
}
