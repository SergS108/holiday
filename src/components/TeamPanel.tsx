import type { TeamState, TeamId } from '../types/game'

interface TeamPanelProps {
  team: TeamState
  isPlaying: boolean
  isDrawWinner: boolean
  /** Другая команда даёт один ответ (ход перешёл после 3 промахов) */
  isOtherTeamTurn?: boolean
  /** В розыгрыше: эта команда сейчас даёт ответ (первая или вторая) */
  isAnsweringInDraw?: boolean
  /** В конце раунда: эта команда забрала фонд (подсветка при открытии оставшихся карточек) */
  isRoundWinner?: boolean
  /** В фазе розыгрыша: показывать большую кнопку (если ещё waiting) или ничего/крестики */
  showDrawButton: boolean
  onDrawButtonPress?: () => void
  drawButtonDisabled?: boolean
}

export function TeamPanel({
  team,
  isPlaying,
  isDrawWinner,
  isOtherTeamTurn,
  isAnsweringInDraw,
  isRoundWinner,
  showDrawButton,
  onDrawButtonPress,
  drawButtonDisabled
}: TeamPanelProps) {
  const pressed = team.drawPressedFirst === true

  return (
    <div
      className={`team-panel ${isPlaying || isRoundWinner ? 'playing' : ''} ${isDrawWinner ? 'draw-winner' : ''} ${isOtherTeamTurn ? 'other-turn' : ''} ${isAnsweringInDraw ? 'draw-answering' : ''}`}
      data-team={team.id}
    >
      <div className="team-name">{team.name}</div>
      <div className="team-badge-container">
        {isPlaying && <div className="team-badge team-badge-playing">Играет</div>}
        {isOtherTeamTurn && <div className="team-badge team-badge-other">один ответ</div>}
        {isAnsweringInDraw && <div className="team-badge team-badge-draw">отвечает</div>}
      </div>
      <div className="team-score">{team.score}</div>
      <div className="team-content">
        {showDrawButton ? (
          <button
            type="button"
            className={`draw-btn small ${pressed ? 'pressed' : ''}`}
            onClick={onDrawButtonPress}
            disabled={drawButtonDisabled}
          >
            {pressed ? '✓ Первая!' : `Команда «${team.name}»`}
          </button>
        ) : (
          <div className="misses">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`miss-dot ${i < team.misses ? 'active' : ''}`}
                aria-hidden
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
