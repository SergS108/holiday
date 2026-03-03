interface GameControlsProps {
  screenPhase: string
  onRevealAllRemaining: () => void
  onNextQuestion: () => void
  allRevealed?: boolean
  isLastQuestion?: boolean
  /** Текст кнопки перехода (в блоке 4 — «Игра окончена») */
  nextButtonLabel?: string
  /** Блок 4: все карточки открыты — показать кнопку завершения игры */
  showFinishGameButton?: boolean
}

export function GameControls({
  screenPhase,
  onRevealAllRemaining,
  onNextQuestion,
  allRevealed = false,
  isLastQuestion = false,
  nextButtonLabel = 'Следующий раунд',
  showFinishGameButton = false
}: GameControlsProps) {
  const showRevealAll = screenPhase === 'round_end' && !allRevealed
  const showNext = (screenPhase === 'round_end' && !isLastQuestion) || showFinishGameButton

  return (
    <div className="controls">
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
