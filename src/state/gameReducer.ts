import type { GameState, TeamId, AnswerRow } from '../types/game'
import type { QuestionData } from '../data/questions'
import { toAnswerRows } from '../data/questions'

export type GameAction =
  | { type: 'START_ROUND'; drawQuestion: QuestionData; mainQuestion: QuestionData }
  | { type: 'START_MAIN_GAME'; question: QuestionData }
  | { type: 'DRAW_BUTTON_PRESS'; teamId: TeamId }
  | { type: 'DRAW_HIDE_BUTTONS' }
  | { type: 'DRAW_FIRST_ANSWER'; answerIndex: number }
  | { type: 'DRAW_SECOND_ANSWER'; answerIndex: number }
  | { type: 'DRAW_WRONG_FIRST' }
  | { type: 'DRAW_WRONG_SECOND' }
  | { type: 'DRAW_COMPARE_AND_START_MAIN' }
  | { type: 'REVEAL_ANSWER'; answerIndex: number }
  | { type: 'WRONG_ANSWER' }
  | { type: 'OTHER_TEAM_ONE_GUESS'; answerIndex: number }
  | { type: 'OTHER_TEAM_WRONG_GUESS' }
  | { type: 'REVEAL_ALL_REMAINING' }
  | { type: 'REVEAL_REMAINING_ONE'; answerIndex: number }
  | { type: 'NEXT_QUESTION'; drawQuestion?: QuestionData; mainQuestion?: QuestionData }
  | { type: 'GAME_END' }
  | { type: 'RESET_NAMES'; leftName: string; rightName: string }

function getTeam(state: GameState, id: TeamId) {
  return id === 'left' ? state.leftTeam : state.rightTeam
}

function getOtherTeamId(id: TeamId): TeamId {
  return id === 'left' ? 'right' : 'left'
}

/** Множитель блока для подсчёта очков: блок 1 → 1, блок 2 → 2, блок 3 → 3, блок 4 → 1. */
function getBlockMultiplier(roundIndex: number): number {
  if (roundIndex <= 2) return roundIndex + 1
  return 1
}

/** Сравнивает ответы двух команд в розыгрыше и определяет команду для основной игры или повтор розыгрыша при ничьей. */
function applyDrawCompare(state: GameState): GameState {
  if (!state.drawFirstTeam) return state
  const first = getTeam(state, state.drawFirstTeam)
  const second = getTeam(state, getOtherTeamId(state.drawFirstTeam))
  const p1 = first.drawRoundPoints ?? 0
  const p2 = second.drawRoundPoints ?? 0
  if (p1 > p2) {
    // Команда, нажавшая первой, выиграла - она начинает основную игру
    return {
      ...state,
      drawAnswerPhase: 'first_answer',
      // Не переходим к основной игре здесь - нужен отдельный action START_MAIN_GAME
      // который будет вызван после завершения розыгрыша
    }
  }
  if (p2 > p1) {
    // Вторая команда выиграла - она начинает основную игру
    return {
      ...state,
      drawAnswerPhase: 'first_answer',
      // Не переходим к основной игре здесь - нужен отдельный action START_MAIN_GAME
    }
  }
  // ничья — повтор розыгрыша
  return {
    ...state,
    drawAnswerPhase: 'first_answer',
    drawTurn: 'first',
    leftTeam: { ...state.leftTeam, drawAnswerIndex: undefined, drawRoundPoints: undefined },
    rightTeam: { ...state.rightTeam, drawAnswerIndex: undefined, drawRoundPoints: undefined }
  }
}

function createInitialTeam(id: TeamId, name: string): GameState['leftTeam'] {
  return {
    id,
    name,
    score: 0,
    misses: 0
  }
}

export function createInitialState(leftName: string, rightName: string): GameState {
  return {
    roundIndex: 0,
    questionIndex: 0,
    roundInBlock: 0,
    drawShown: false,
    drawQuestion: '',
    drawAnswers: [],
    question: '',
    answers: [],
    gameFund: 0,
    leftTeam: createInitialTeam('left', leftName),
    rightTeam: createInitialTeam('right', rightName),
    drawFirstTeam: null,
    drawPhase: 'waiting',
    drawAnswerPhase: 'first_answer',
    drawTurn: 'first',
    screenPhase: 'draw_buttons',
    playingTeam: null,
    mainPhase: 'playing',
    roundWinner: null
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_ROUND': {
      // Если розыгрыш уже был показан, сразу переходим к основному вопросу
      if (state.drawShown) {
        const answers: AnswerRow[] = toAnswerRows(action.mainQuestion.answers)
        // Определяем играющую команду в зависимости от раунда в блоке:
        // Первый раунд блока (roundInBlock = 0): команда, которая первая нажала кнопку
        // Второй раунд блока (roundInBlock = 1): другая команда
        let playingTeam: TeamId | null = null
        if (state.drawFirstTeam) {
          if (state.roundInBlock === 0) {
            playingTeam = state.drawFirstTeam
          } else {
            playingTeam = getOtherTeamId(state.drawFirstTeam)
          }
        }
        
        return {
          ...state,
          question: action.mainQuestion.question,
          answers,
          gameFund: 0,
          leftTeam: { ...state.leftTeam, misses: 0, drawPressedFirst: undefined, drawAnswerIndex: undefined, drawRoundPoints: undefined },
          rightTeam: { ...state.rightTeam, misses: 0, drawPressedFirst: undefined, drawAnswerIndex: undefined, drawRoundPoints: undefined },
          drawFirstTeam: state.drawFirstTeam, // Сохраняем drawFirstTeam для следующих блоков
          drawPhase: 'done',
          drawAnswerPhase: 'first_answer',
          drawTurn: 'first',
          screenPhase: 'main_play',
          playingTeam,
          mainPhase: 'playing',
          roundWinner: null
        }
      }
      // Первый раз - показываем розыгрыш
      const drawAnswers: AnswerRow[] = toAnswerRows(action.drawQuestion.answers)
      return {
        ...state,
        roundInBlock: 0, // Начинаем с первого раунда в блоке
        drawQuestion: action.drawQuestion.question,
        drawAnswers,
        question: '', // Основной вопрос будет установлен позже через START_MAIN_GAME
        answers: [],
        gameFund: 0,
        leftTeam: { ...state.leftTeam, misses: 0, drawPressedFirst: undefined, drawAnswerIndex: undefined, drawRoundPoints: undefined },
        rightTeam: { ...state.rightTeam, misses: 0, drawPressedFirst: undefined, drawAnswerIndex: undefined, drawRoundPoints: undefined },
        drawFirstTeam: null,
        drawPhase: 'waiting',
        drawAnswerPhase: 'first_answer',
        drawTurn: 'first',
        screenPhase: 'draw_buttons',
        playingTeam: null,
        mainPhase: 'playing',
        roundWinner: null
      }
    }

    case 'START_MAIN_GAME': {
      const answers: AnswerRow[] = toAnswerRows(action.question.answers)
      // Определяем играющую команду в зависимости от раунда в блоке:
      // Первый раунд блока (roundInBlock = 0): команда, которая первая нажала кнопку
      // Второй раунд блока (roundInBlock = 1): другая команда
      let playingTeam: TeamId | null = null
      if (state.drawFirstTeam) {
        if (state.roundInBlock === 0) {
          playingTeam = state.drawFirstTeam
        } else {
          playingTeam = getOtherTeamId(state.drawFirstTeam)
        }
      }
      
      return {
        ...state,
        drawShown: true, // Помечаем, что розыгрыш уже был показан
        question: action.question.question,
        answers,
        gameFund: 0,
        leftTeam: { ...state.leftTeam, misses: 0, drawAnswerIndex: undefined, drawRoundPoints: undefined },
        rightTeam: { ...state.rightTeam, misses: 0, drawAnswerIndex: undefined, drawRoundPoints: undefined },
        screenPhase: 'main_play',
        playingTeam,
        mainPhase: 'playing',
        roundWinner: null
      }
    }

    case 'DRAW_BUTTON_PRESS': {
      if (state.drawPhase !== 'waiting') return state
      const leftTeam = { ...state.leftTeam, drawPressedFirst: action.teamId === 'left' }
      const rightTeam = { ...state.rightTeam, drawPressedFirst: action.teamId === 'right' }
      return {
        ...state,
        drawPhase: 'first_pressed',
        drawFirstTeam: action.teamId,
        leftTeam,
        rightTeam
      }
    }

    case 'DRAW_HIDE_BUTTONS': {
      // После нажатия кнопки сразу переходим к основной игре с командой, которая нажала первой
      // Основной вопрос будет установлен через START_MAIN_GAME в App.tsx
      return {
        ...state,
        drawPhase: 'done',
        screenPhase: 'draw_buttons' // Остаёмся на draw_buttons, пока не установится основной вопрос
      }
    }

    case 'DRAW_FIRST_ANSWER': {
      if (state.drawAnswerPhase !== 'first_answer' || !state.drawFirstTeam) return state
      const idx = action.answerIndex
      if (idx < 0 || idx >= state.drawAnswers.length || state.drawAnswers[idx].revealed) return state
      const points = state.drawAnswers[idx].points
      const drawAnswers = state.drawAnswers.map((a, i) => i === idx ? { ...a, revealed: true } : a)
      const team = getTeam(state, state.drawFirstTeam)
      const updated = state.drawFirstTeam === 'left'
        ? { ...state, drawAnswers, leftTeam: { ...team, drawAnswerIndex: idx, drawRoundPoints: points } }
        : { ...state, drawAnswers, rightTeam: { ...team, drawAnswerIndex: idx, drawRoundPoints: points } }
      if (idx === 0) {
        // Если первая команда дала самый популярный ответ - она сразу выигрывает розыгрыш
        // Но основная игра начнётся только после вызова START_MAIN_GAME
        return {
          ...updated,
          drawAnswerPhase: 'winner'
        }
      }
      return { ...updated, drawAnswerPhase: 'second_answer', drawTurn: 'second' }
    }

    case 'DRAW_WRONG_FIRST': {
      if (state.drawAnswerPhase !== 'first_answer' || !state.drawFirstTeam) return state
      const team = getTeam(state, state.drawFirstTeam)
      const updated = state.drawFirstTeam === 'left'
        ? { ...state, leftTeam: { ...team, drawAnswerIndex: -1, drawRoundPoints: 0 } }
        : { ...state, rightTeam: { ...team, drawAnswerIndex: -1, drawRoundPoints: 0 } }
      return { ...updated, drawAnswerPhase: 'second_answer', drawTurn: 'second' }
    }

    case 'DRAW_SECOND_ANSWER': {
      if (state.drawAnswerPhase !== 'second_answer' || !state.drawFirstTeam) return state
      const secondId = getOtherTeamId(state.drawFirstTeam)
      const idx = action.answerIndex
      if (idx < 0 || idx >= state.drawAnswers.length || state.drawAnswers[idx].revealed) return state
      const points = state.drawAnswers[idx].points
      const drawAnswers = state.drawAnswers.map((a, i) => i === idx ? { ...a, revealed: true } : a)
      const team = getTeam(state, secondId)
      const afterSecond = secondId === 'left'
        ? { ...state, drawAnswers, leftTeam: { ...team, drawAnswerIndex: idx, drawRoundPoints: points } }
        : { ...state, drawAnswers, rightTeam: { ...team, drawAnswerIndex: idx, drawRoundPoints: points } }
      const compared = applyDrawCompare(afterSecond)
      // После сравнения определяем победителя розыгрыша
      const first = getTeam(compared, compared.drawFirstTeam!)
      const second = getTeam(compared, getOtherTeamId(compared.drawFirstTeam!))
      const p1 = first.drawRoundPoints ?? 0
      const p2 = second.drawRoundPoints ?? 0
      const winnerTeam = p1 > p2 ? compared.drawFirstTeam : (p2 > p1 ? getOtherTeamId(compared.drawFirstTeam!) : null)
      return {
        ...compared,
        drawAnswerPhase: winnerTeam ? 'winner' : 'first_answer',
        drawFirstTeam: winnerTeam || compared.drawFirstTeam
      }
    }

    case 'DRAW_WRONG_SECOND': {
      if (state.drawAnswerPhase !== 'second_answer' || !state.drawFirstTeam) return state
      const secondId = getOtherTeamId(state.drawFirstTeam)
      const team = getTeam(state, secondId)
      const afterSecond = secondId === 'left'
        ? { ...state, leftTeam: { ...team, drawAnswerIndex: -1, drawRoundPoints: 0 } }
        : { ...state, rightTeam: { ...team, drawAnswerIndex: -1, drawRoundPoints: 0 } }
      const compared = applyDrawCompare(afterSecond)
      // После сравнения определяем победителя розыгрыша
      const first = getTeam(compared, compared.drawFirstTeam!)
      const p1 = first.drawRoundPoints ?? 0
      const p2 = 0 // вторая команда дала неверный ответ
      const winnerTeam = p1 > p2 ? compared.drawFirstTeam : null
      return {
        ...compared,
        drawAnswerPhase: winnerTeam ? 'winner' : 'first_answer',
        drawFirstTeam: winnerTeam || compared.drawFirstTeam
      }
    }

    case 'DRAW_COMPARE_AND_START_MAIN': {
      if (state.drawAnswerPhase !== 'compare' || !state.drawFirstTeam) return state
      return applyDrawCompare(state)
    }

    case 'REVEAL_ANSWER': {
      const idx = action.answerIndex
      if (idx < 0 || idx >= state.answers.length || state.answers[idx].revealed) return state
      const answers = state.answers.map((a, i) => i === idx ? { ...a, revealed: true } : a)
      const points = state.answers[idx].points
      const isBlock4 = state.roundIndex === 3
      const block4ActionCount = state.block4ActionCount ?? 0

      if (isBlock4 && state.playingTeam) {
        // Блок 4: очки сразу на счёт команды, без фонда
        const addedPoints = 1 * points
        const team = getTeam(state, state.playingTeam)
        const updatedTeam = { ...team, score: team.score + addedPoints }
        const afterReveal = state.playingTeam === 'left'
          ? { ...state, leftTeam: updatedTeam, rightTeam: state.rightTeam }
          : { ...state, rightTeam: updatedTeam, leftTeam: state.leftTeam }
        const withAnswers = { ...afterReveal, answers }

        if (block4ActionCount === 1) {
          // Второй ход — раунд заканчивается, выделяем команду с большим счётом
          const leftScore = withAnswers.leftTeam.score
          const rightScore = withAnswers.rightTeam.score
          const roundWinner: TeamId | null = leftScore > rightScore ? 'left' : rightScore > leftScore ? 'right' : null
          return {
            ...withAnswers,
            gameFund: 0,
            screenPhase: 'round_end',
            mainPhase: 'round_end',
            roundWinner,
            block4ActionCount: undefined
          }
        }
        // Первый ход — передаём ход другой команде
        return {
          ...withAnswers,
          playingTeam: getOtherTeamId(state.playingTeam),
          block4ActionCount: 1
        }
      }

      const addedPoints = getBlockMultiplier(state.roundIndex) * points
      const allRevealed = answers.every(a => a.revealed)
      if (allRevealed && state.playingTeam) {
        const team = getTeam(state, state.playingTeam)
        const updatedTeam = { ...team, score: team.score + state.gameFund + addedPoints }
        const next = state.playingTeam === 'left'
          ? { ...state, leftTeam: updatedTeam }
          : { ...state, rightTeam: updatedTeam }
        return {
          ...next,
          answers,
          gameFund: 0,
          screenPhase: 'round_end',
          mainPhase: 'round_end',
          roundWinner: state.playingTeam
        }
      }
      return {
        ...state,
        answers,
        gameFund: state.gameFund + addedPoints
      }
    }

    case 'WRONG_ANSWER': {
      if (!state.playingTeam) return state
      const team = getTeam(state, state.playingTeam)
      const newMisses = team.misses + 1
      const updatedTeam = { ...team, misses: newMisses }
      const next = state.playingTeam === 'left'
        ? { ...state, leftTeam: updatedTeam }
        : { ...state, rightTeam: updatedTeam }

      const isBlock4 = state.roundIndex === 3
      const block4ActionCount = state.block4ActionCount ?? 0
      if (isBlock4) {
        if (block4ActionCount === 1) {
          const leftScore = next.leftTeam.score
          const rightScore = next.rightTeam.score
          const roundWinner: TeamId | null = leftScore > rightScore ? 'left' : rightScore > leftScore ? 'right' : null
          return {
            ...next,
            screenPhase: 'round_end',
            mainPhase: 'round_end',
            roundWinner,
            block4ActionCount: undefined
          }
        }
        return {
          ...next,
          playingTeam: getOtherTeamId(state.playingTeam),
          block4ActionCount: 1
        }
      }

      if (newMisses >= 3) {
        return {
          ...next,
          screenPhase: 'other_guess',
          mainPhase: 'other_team_one_guess'
        }
      }
      return next
    }

    case 'OTHER_TEAM_ONE_GUESS': {
      if (state.mainPhase !== 'other_team_one_guess' || !state.playingTeam) return state
      const otherId = getOtherTeamId(state.playingTeam)
      const idx = action.answerIndex
      if (idx < 0 || idx >= state.answers.length || state.answers[idx].revealed) return state
      const points = state.answers[idx].points
      const addedPoints = getBlockMultiplier(state.roundIndex) * points
      const answers = state.answers.map((a, i) => i === idx ? { ...a, revealed: true } : a)
      const otherTeam = getTeam(state, otherId)
      const newFund = state.gameFund + addedPoints
      const withRevealed = { ...state, answers }
      const withOtherScore = otherId === 'left'
        ? { ...withRevealed, leftTeam: { ...otherTeam, score: otherTeam.score + newFund } }
        : { ...withRevealed, rightTeam: { ...otherTeam, score: otherTeam.score + newFund } }
      return {
        ...withOtherScore,
        gameFund: 0,
        screenPhase: 'round_end',
        mainPhase: 'round_end',
        roundWinner: otherId
      }
    }

    case 'OTHER_TEAM_WRONG_GUESS': {
      if (state.mainPhase !== 'other_team_one_guess' || !state.playingTeam) return state
      const playingTeam = getTeam(state, state.playingTeam)
      const otherId = getOtherTeamId(state.playingTeam)
      const otherTeam = getTeam(state, otherId)
      const updatedPlaying = { ...playingTeam, score: playingTeam.score + state.gameFund }
      const updatedOther = { ...otherTeam, misses: otherTeam.misses + 1 }
      const next = state.playingTeam === 'left'
        ? { ...state, leftTeam: updatedPlaying, rightTeam: updatedOther }
        : { ...state, rightTeam: updatedPlaying, leftTeam: updatedOther }
      return {
        ...next,
        gameFund: 0,
        screenPhase: 'round_end',
        mainPhase: 'round_end',
        roundWinner: state.playingTeam
      }
    }

    case 'REVEAL_ALL_REMAINING': {
      const answers = state.answers.map(a =>
        a.revealed ? { ...a } : { ...a, revealed: true, revealedAtEnd: true }
      )
      return { ...state, answers }
    }

    case 'REVEAL_REMAINING_ONE': {
      if (state.screenPhase !== 'round_end') return state
      const idx = action.answerIndex
      if (idx < 0 || idx >= state.answers.length || state.answers[idx].revealed) return state
      const answers = state.answers.map((a, i) => (i === idx ? { ...a, revealed: true, revealedAtEnd: true } : a))
      return { ...state, answers }
    }

    case 'NEXT_QUESTION': {
      const nextIndex = state.questionIndex + 1
      // После первого розыгрыша сразу переходим к основному вопросу без розыгрыша
      if (action.mainQuestion) {
        const answers: AnswerRow[] = toAnswerRows(action.mainQuestion.answers)
        // Блок 4 (roundIndex 3): только один раунд — при выходе сразу следующий блок
        const isLeavingBlock4 = state.roundIndex === 3
        const nextRoundInBlock = isLeavingBlock4 ? 0 : (state.roundInBlock + 1) % 2
        const nextRoundIndex = isLeavingBlock4 ? state.roundIndex + 1 : (nextRoundInBlock === 0 ? state.roundIndex + 1 : state.roundIndex)
        
        // Определяем играющую команду
        let playingTeam: TeamId | null = null
        let block4ActionCount: number | undefined
        if (nextRoundIndex === 3) {
          // Блок 4: начинает команда с меньшим счётом
          playingTeam = state.leftTeam.score <= state.rightTeam.score ? 'left' : 'right'
          block4ActionCount = 0
        } else {
          const firstTeam = state.drawFirstTeam || (state.roundInBlock === 0 ? state.playingTeam : null)
          if (firstTeam) {
            playingTeam = nextRoundInBlock === 0 ? firstTeam : getOtherTeamId(firstTeam)
          }
        }
        
        return {
          ...state,
          roundIndex: nextRoundIndex,
          questionIndex: nextIndex,
          roundInBlock: nextRoundInBlock,
          question: action.mainQuestion.question,
          answers,
          gameFund: 0,
          leftTeam: { ...state.leftTeam, misses: 0, drawPressedFirst: undefined, drawAnswerIndex: undefined, drawRoundPoints: undefined },
          rightTeam: { ...state.rightTeam, misses: 0, drawPressedFirst: undefined, drawAnswerIndex: undefined, drawRoundPoints: undefined },
          drawFirstTeam: state.drawFirstTeam,
          drawPhase: 'done',
          drawAnswerPhase: 'first_answer',
          drawTurn: 'first',
          screenPhase: 'main_play',
          playingTeam,
          mainPhase: 'playing',
          roundWinner: null,
          block4ActionCount
        }
      }
      return state
    }

    case 'GAME_END': {
      return {
        ...state,
        screenPhase: 'game_end',
        mainPhase: 'round_end'
      }
    }

    case 'RESET_NAMES': {
      return {
        ...state,
        leftTeam: { ...state.leftTeam, name: action.leftName },
        rightTeam: { ...state.rightTeam, name: action.rightName }
      }
    }

    default:
      return state
  }
}
