import type { AnswerRow } from '../types/game'

interface AnswerBoardProps {
  answers: AnswerRow[]
  /** Режим выбора ответа (для розыгрыша или один ответ другой команды) — клик по карточке */
  pickMode?: boolean
  onPickAnswer?: (index: number) => void
  /** Основная игра: ведущий открывает карточку по клику */
  onReveal?: (index: number) => void
}

export function AnswerBoard({
  answers,
  pickMode,
  onPickAnswer,
  onReveal
}: AnswerBoardProps) {
  const handleClick = (index: number) => {
    const row = answers[index]
    if (row.revealed) return
    if (pickMode && onPickAnswer) {
      onPickAnswer(index)
      return
    }
    if (onReveal) onReveal(index)
  }

  return (
    <div className="answers-board">
      {answers.map((row, index) => (
        <div
          key={row.id}
          className={`answer-row ${row.revealed ? 'revealed' : 'hidden'} ${row.revealedAtEnd ? 'revealed-at-end' : ''} ${row.assignedToTeam === 'left' ? 'block4-assigned-left' : ''} ${row.assignedToTeam === 'right' ? 'block4-assigned-right' : ''}`}
          role={pickMode || onReveal ? 'button' : undefined}
          tabIndex={pickMode || onReveal ? 0 : undefined}
          onClick={() => handleClick(index)}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && (pickMode || onReveal)) {
              e.preventDefault()
              handleClick(index)
            }
          }}
        >
          <div className="answer-card-inner">
            {/* Лицевая сторона (закрытая) */}
            <div className="face face-front">
            </div>
            {/* Оборотная сторона (открытая) — баллы и ответ */}
            <div className="face face-back">
              <div className="answer-content">
                <span className="answer-text">{row.text}</span>
                <span className="answer-points">{row.points}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
