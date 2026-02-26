import type { TeamState } from '../types/game'

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
  /** Блок 4: эта команда набрала больше очков (золотая подсветка панели) */
  isBlock4Leader?: boolean
  /** В фазе розыгрыша: показывать большую кнопку (если ещё waiting) или ничего/крестики */
  showDrawButton: boolean
  onDrawButtonPress?: () => void
  drawButtonDisabled?: boolean
  /** Подпись блока внизу панели: "x1", "x2", "x3", "¿" */
  blockLabel?: string
  /** Блок 4: показать круглую кнопку «начислить очки этой команде» */
  showBlock4AssignButton?: boolean
  /** Блок 4: нажатие — начислить очки последней открытой карточки этой команде */
  onBlock4Assign?: () => void
  /** Блок 4: кнопка неактивна, пока нет открытой карточки (нет ожидающих очков) */
  block4AssignDisabled?: boolean
}

export function TeamPanel({
  team,
  isPlaying,
  isDrawWinner,
  isOtherTeamTurn,
  isAnsweringInDraw,
  isRoundWinner,
  isBlock4Leader,
  showDrawButton,
  onDrawButtonPress,
  drawButtonDisabled,
  blockLabel,
  showBlock4AssignButton,
  onBlock4Assign,
  block4AssignDisabled
}: TeamPanelProps) {
  const pressed = team.drawPressedFirst === true

  return (
    <div
      className={`team-panel ${isPlaying || isRoundWinner ? 'playing' : ''} ${isDrawWinner ? 'draw-winner' : ''} ${isOtherTeamTurn ? 'other-turn' : ''} ${isAnsweringInDraw ? 'draw-answering' : ''} ${isBlock4Leader ? 'block4-leader' : ''}`}
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
      {showBlock4AssignButton && (
        <div className="block4-assign-slot">
          <button
            type="button"
            className={`draw-btn block4-assign ${team.id === 'left' ? 'block4-assign-left' : 'block4-assign-right'}`}
            onClick={onBlock4Assign}
            disabled={block4AssignDisabled}
            title="Начислить очки этой команде"
            aria-label={`Начислить очки команде ${team.name}`}
          />
        </div>
      )}
      {blockLabel != null && blockLabel !== '' && (
        <div className="team-block-label" aria-hidden>
          {blockLabel}
        </div>
      )}
    </div>
  )
}
