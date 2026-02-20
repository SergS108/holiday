import { useEffect } from 'react'
import type { GameState, TeamId } from '../types/game'

interface DrawOverlayProps {
  state: GameState
  onPress: (teamId: TeamId) => void
  onTransitionEnd: () => void
}

export function DrawOverlay({ state, onPress, onTransitionEnd }: DrawOverlayProps) {
  const phase = state.drawPhase
  const firstPressed = phase === 'first_pressed' || phase === 'done'

  useEffect(() => {
    if (phase !== 'first_pressed') return
    const t = setTimeout(onTransitionEnd, 1200)
    return () => clearTimeout(t)
  }, [phase, onTransitionEnd])

  return (
    <div className="draw-overlay">
      {state.drawQuestion && (
        <div className="draw-question">
          {state.drawQuestion}
        </div>
      )}
      <div className="raffle-buttons-container">
        <button
          type="button"
          className={`draw-btn ${state.leftTeam.drawPressedFirst ? 'pressed' : ''}`}
          onClick={() => onPress('left')}
          disabled={firstPressed}
        >
          {state.leftTeam.drawPressedFirst ? '✓ Первая!' : state.leftTeam.name}
        </button>
        <button
          type="button"
          className={`draw-btn ${state.rightTeam.drawPressedFirst ? 'pressed' : ''}`}
          onClick={() => onPress('right')}
          disabled={firstPressed}
        >
          {state.rightTeam.drawPressedFirst ? '✓ Первая!' : state.rightTeam.name}
        </button>
      </div>
      {firstPressed && (
        <div className="raffle-result">
          Команда «{(state.leftTeam.drawPressedFirst ? state.leftTeam.name : state.rightTeam.name)}» первой начинает игру
        </div>
      )}
    </div>
  )
}
