interface GameControlsProps {
  screenPhase: string
  onWrongAnswer: () => void
  onRevealAllRemaining: () => void
  onNextQuestion: () => void
  canWrong?: boolean
  allRevealed?: boolean
  isLastQuestion?: boolean
  /** Текст кнопки перехода (в блоке 4 — «Игра окончена») */
  nextButtonLabel?: string
  /** Блок 4: все карточки открыты — показать кнопку завершения игры */
  showFinishGameButton?: boolean
}

export function GameControls({
  screenPhase,
  onWrongAnswer,
  onRevealAllRemaining,
  onNextQuestion,
  canWrong = true,
  allRevealed = false,
  isLastQuestion = false,
  nextButtonLabel = 'Следующий раунд / вопрос',
  showFinishGameButton = false
}: GameControlsProps) {
  const showWrong = (screenPhase === 'main_play' || screenPhase === 'draw_answers' || screenPhase === 'other_guess') && canWrong
  const showRevealAll = screenPhase === 'round_end' && !allRevealed
  const showNext = (screenPhase === 'round_end' && !isLastQuestion) || showFinishGameButton

  return (
    <div className="controls">
      {showWrong && (
        <button type="button" className="btn-wrong" onClick={onWrongAnswer}>
          Неверный ответ
        </button>
      )}
      {showRevealAll && (
        <button type="button" className="btn-reveal-all" onClick={onRevealAllRemaining}>
          Открыть оставшиеся
        </button>
      )}
      {showNext && (
        <button type="button" className="btn-next" onClick={onNextQuestion}>
          {nextButtonLabel}
        </button>
      )}
    </div>
  )
}
