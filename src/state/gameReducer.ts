import type { GameState, TeamId, AnswerRow } from '../types/game'
import type { QuestionData } from '../data/questions'
import { toAnswerRows } from '../data/questions'

export type GameAction =
  | { type: 'START_ROUND'; question: QuestionData }
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
  | { type: 'NEXT_QUESTION'; nextQuestion?: QuestionData }
  | { type: 'RESET_NAMES'; leftName: string; rightName: string }

function getTeam(state: GameState, id: TeamId) {
  return id === 'left' ? state.leftTeam : state.rightTeam
}

function getOtherTeamId(id: TeamId): TeamId {
  return id === 'left' ? 'right' : 'left'
}

/** Сравнивает ответы двух команд в розыгрыше и переводит в основную игру или повтор розыгрыша при ничьей. */
function applyDrawCompare(state: GameState): GameState {
  if (!state.drawFirstTeam) return state
  const first = getTeam(state, state.drawFirstTeam)
  const second = getTeam(state, getOtherTeamId(state.drawFirstTeam))
  const p1 = first.drawRoundPoints ?? 0
  const p2 = second.drawRoundPoints ?? 0
  if (p1 > p2) {
    return {
      ...state,
      screenPhase: 'main_play',
      playingTeam: state.drawFirstTeam,
      drawAnswerPhase: 'first_answer',
      mainPhase: 'playing'
    }
  }
  if (p2 > p1) {
    return {
      ...state,
      screenPhase: 'main_play',
      playingTeam: getOtherTeamId(state.drawFirstTeam),
      drawAnswerPhase: 'first_answer',
      mainPhase: 'playing'
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

const ROUND_NAMES: GameState['roundIndex'][] = [0, 1, 2, 3, 4]

export function createInitialState(leftName: string, rightName: string): GameState {
  return {
    roundIndex: 0,
    questionIndex: 0,
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
      const answers: AnswerRow[] = toAnswerRows(action.question.answers)
      return {
        ...state,
        question: action.question.question,
        answers,
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
      return {
        ...state,
        drawPhase: 'done',
        screenPhase: 'draw_answers'
      }
    }

    case 'DRAW_FIRST_ANSWER': {
      if (state.drawAnswerPhase !== 'first_answer' || !state.drawFirstTeam) return state
      const idx = action.answerIndex
      if (idx < 0 || idx >= state.answers.length || state.answers[idx].revealed) return state
      const points = state.answers[idx].points
      const answers = state.answers.map((a, i) => i === idx ? { ...a, revealed: true } : a)
      const team = getTeam(state, state.drawFirstTeam)
      const updated = state.drawFirstTeam === 'left'
        ? { ...state, answers, gameFund: state.gameFund + points, leftTeam: { ...team, drawAnswerIndex: idx, drawRoundPoints: points } }
        : { ...state, answers, gameFund: state.gameFund + points, rightTeam: { ...team, drawAnswerIndex: idx, drawRoundPoints: points } }
      if (idx === 0) {
        return {
          ...updated,
          screenPhase: 'main_play',
          playingTeam: state.drawFirstTeam,
          drawAnswerPhase: 'first_answer',
          mainPhase: 'playing'
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
      if (idx < 0 || idx >= state.answers.length || state.answers[idx].revealed) return state
      const points = state.answers[idx].points
      const answers = state.answers.map((a, i) => i === idx ? { ...a, revealed: true } : a)
      const team = getTeam(state, secondId)
      const afterSecond = secondId === 'left'
        ? { ...state, answers, gameFund: state.gameFund + points, leftTeam: { ...team, drawAnswerIndex: idx, drawRoundPoints: points } }
        : { ...state, answers, gameFund: state.gameFund + points, rightTeam: { ...team, drawAnswerIndex: idx, drawRoundPoints: points } }
      return applyDrawCompare(afterSecond)
    }

    case 'DRAW_WRONG_SECOND': {
      if (state.drawAnswerPhase !== 'second_answer' || !state.drawFirstTeam) return state
      const secondId = getOtherTeamId(state.drawFirstTeam)
      const team = getTeam(state, secondId)
      const afterSecond = secondId === 'left'
        ? { ...state, leftTeam: { ...team, drawAnswerIndex: -1, drawRoundPoints: 0 } }
        : { ...state, rightTeam: { ...team, drawAnswerIndex: -1, drawRoundPoints: 0 } }
      return applyDrawCompare(afterSecond)
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
      const allRevealed = answers.every(a => a.revealed)
      if (allRevealed && state.playingTeam) {
        const team = getTeam(state, state.playingTeam)
        const updatedTeam = { ...team, score: team.score + state.gameFund + points }
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
        gameFund: state.gameFund + points
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
      const answers = state.answers.map((a, i) => i === idx ? { ...a, revealed: true } : a)
      const otherTeam = getTeam(state, otherId)
      const newFund = state.gameFund + points
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
      const updatedPlaying = { ...playingTeam, score: playingTeam.score + state.gameFund }
      const next = state.playingTeam === 'left'
        ? { ...state, leftTeam: updatedPlaying }
        : { ...state, rightTeam: updatedPlaying }
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
      const base = {
        ...state,
        questionIndex: nextIndex,
        screenPhase: 'draw_buttons' as const,
        drawPhase: 'waiting' as const,
        drawAnswerPhase: 'first_answer' as const,
        drawTurn: 'first' as const,
        drawFirstTeam: null,
        leftTeam: { ...state.leftTeam, drawPressedFirst: undefined, drawAnswerIndex: undefined, drawRoundPoints: undefined },
        rightTeam: { ...state.rightTeam, drawPressedFirst: undefined, drawAnswerIndex: undefined, drawRoundPoints: undefined }
      }
      if (action.nextQuestion) {
        const answers = toAnswerRows(action.nextQuestion.answers)
        return {
          ...base,
          question: action.nextQuestion.question,
          answers,
          gameFund: 0,
          leftTeam: { ...base.leftTeam, misses: 0 },
          rightTeam: { ...base.rightTeam, misses: 0 },
          playingTeam: null,
          mainPhase: 'playing',
          roundWinner: null
        }
      }
      return base
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
