/** Вариант ответа на табло (строка) */
export interface AnswerRow {
  id: number
  text: string
  points: number
  revealed: boolean
  /** Открыто ведущим в конце раунда (оставшиеся ответы) */
  revealedAtEnd?: boolean
}

/** Раунд игры */
export type RoundKind = 'simple' | 'double' | 'triple' | 'reverse' | 'big'

/** Команда */
export type TeamId = 'left' | 'right'

/** Фаза розыгрыша: ожидание нажатий двух кнопок */
export type DrawPhase = 'waiting' | 'first_pressed' | 'done'

/** Фаза розыгрыша ответов: первая команда ответила, ждём вторую */
export type DrawAnswerPhase = 'first_answer' | 'second_answer' | 'compare' | 'winner'

/** Фаза основной игры */
export type MainPhase = 'playing' | 'three_misses' | 'other_team_one_guess' | 'round_end'

/** Общая фаза экрана */
export type ScreenPhase =
  | 'draw_buttons'      // две большие кнопки, вопрос не показывается
  | 'draw_answers'     // сбор двух ответов для розыгрыша
  | 'main_play'        // основная игра — команда называет ответы
  | 'other_guess'      // другая команда даёт один ответ
  | 'round_end'        // открыть оставшиеся, кнопка «Следующий раунд»
  | 'game_end'         // финальный экран с результатами игры

export interface TeamState {
  id: TeamId
  name: string
  score: number
  /** 0..3 промахов в текущем вопросе */
  misses: number
  /** в розыгрыше: нажала ли кнопку первой */
  drawPressedFirst?: boolean
  /** ответ в розыгрыше (индекс строки 0..5 или -1 если не на табло) */
  drawAnswerIndex?: number
  /** очки в текущем розыгрыше (0 если неверный) */
  drawRoundPoints?: number
}

export interface GameState {
  /** Текущий раунд 0..4 */
  roundIndex: number
  /** Текущий вопрос внутри раунда 0..4 обычно */
  questionIndex: number
  /** Номер раунда в текущем блоке (0 или 1) */
  roundInBlock: number
  /** Розыгрыш уже был показан (только один раз в начале игры) */
  drawShown: boolean
  /** Вопрос для розыгрыша (определение первой команды) */
  drawQuestion: string
  /** Ответы для розыгрыша (6 ответов по убыванию баллов) */
  drawAnswers: AnswerRow[]
  /** Текущий вопрос основной игры */
  question: string
  /** Строки табло основной игры (6 ответов по убыванию баллов) */
  answers: AnswerRow[]
  /** Фонд игры (сумма очков открытых в этом вопросе строк) */
  gameFund: number
  /** Левая и правая команды */
  leftTeam: TeamState
  rightTeam: TeamState
  /** Какая команда нажала первой в розыгрыше */
  drawFirstTeam: TeamId | null
  /** Фаза розыгрыша кнопок */
  drawPhase: DrawPhase
  /** Фаза сбора ответов в розыгрыше */
  drawAnswerPhase: DrawAnswerPhase
  /** Чья очередь в розыгрыше: first = та что нажала первой */
  drawTurn: 'first' | 'second'
  /** Текущий экран */
  screenPhase: ScreenPhase
  /** Играющая команда в основной части (та что отгадывает) */
  playingTeam: TeamId | null
  /** Фаза основной игры */
  mainPhase: MainPhase
  /** Команда, забравшая фонд в конце раунда (подсветка в round_end). В блоке 4 — команда с большим счётом (золотая подсветка). */
  roundWinner: TeamId | null
  /** Блок 4 (игра наоборот): счётчик ходов в раунде (0 = первый ход, 1 = второй ход, после чего раунд заканчивается). */
  block4ActionCount?: number
}
