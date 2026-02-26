import { useReducer, useCallback, useState, useEffect, useRef } from 'react'
import { createInitialState, gameReducer } from './state/gameReducer'
import { DEFAULT_QUESTIONS, type QuestionData } from './data/questions'
import { TeamPanel } from './components/TeamPanel'
import { DrawOverlay } from './components/DrawOverlay'
import { AnswerBoard } from './components/AnswerBoard'
import { GameControls } from './components/GameControls'
import type { TeamId } from './types/game'

const ROUND_NAMES = ['Простая игра', 'Двойная игра', 'Тройная игра', 'Игра наоборот']

const TEAM_NAMES_KEY_LEFT = 'game100_teamLeft'
const TEAM_NAMES_KEY_RIGHT = 'game100_teamRight'

function getStoredTeamName(key: string, fallback: string): string {
  if (typeof localStorage === 'undefined') return fallback
  return localStorage.getItem(key) || fallback
}

const DEFAULT_LEFT_NAME = 'Милашки'
const DEFAULT_RIGHT_NAME = 'Обаяшки'

function getInitialState() {
  return createInitialState(
    getStoredTeamName(TEAM_NAMES_KEY_LEFT, ''),
    getStoredTeamName(TEAM_NAMES_KEY_RIGHT, '')
  )
}

function getDisplayName(name: string | undefined, teamId: 'left' | 'right'): string {
  const trimmed = (name ?? '').trim()
  return trimmed || (teamId === 'left' ? DEFAULT_LEFT_NAME : DEFAULT_RIGHT_NAME)
}

const QUESTIONS_URL = '/questions.json'

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, getInitialState)
  const [questions, setQuestions] = useState<QuestionData[]>(DEFAULT_QUESTIONS)

  useEffect(() => {
    fetch(QUESTIONS_URL)
      .then((res) => res.json())
      .then((data: unknown) => {
        if (Array.isArray(data) && data.length > 0) {
          setQuestions(data as QuestionData[])
        }
      })
      .catch(() => {})
  }, [])

  const getQuestion = useCallback(
    (index: number) => questions[index % questions.length],
    [questions]
  )

  const handleStartRound = useCallback(
    (questionIndex: number) => {
      // Розыгрыш — первый вопрос (индекс 0). Основной вопрос будет установлен после розыгрыша через START_MAIN_GAME
      dispatch({ type: 'START_ROUND', drawQuestion: getQuestion(0), mainQuestion: getQuestion(questionIndex) })
    },
    [getQuestion]
  )

  const handleStartMainGame = useCallback(
    (question: QuestionData) => {
      dispatch({ type: 'START_MAIN_GAME', question })
    },
    []
  )

  const handleDrawPress = useCallback((teamId: TeamId) => {
    dispatch({ type: 'DRAW_BUTTON_PRESS', teamId })
  }, [])

  const handleDrawHide = useCallback(() => {
    dispatch({ type: 'DRAW_HIDE_BUTTONS' })
    if (state.drawFirstTeam && !state.drawShown) {
      const mainQuestion = getQuestion(1)
      handleStartMainGame(mainQuestion)
    }
  }, [state.drawFirstTeam, state.drawShown, getQuestion, handleStartMainGame])


  const handleRevealAnswer = useCallback((index: number) => {
    dispatch({ type: 'REVEAL_ANSWER', answerIndex: index })
  }, [])

  const handleWrongAnswer = useCallback(() => {
    dispatch({ type: 'WRONG_ANSWER' })
  }, [])

  const handleOtherTeamGuess = useCallback((index: number) => {
    dispatch({ type: 'OTHER_TEAM_ONE_GUESS', answerIndex: index })
  }, [])

  const handleOtherTeamWrong = useCallback(() => {
    dispatch({ type: 'OTHER_TEAM_WRONG_GUESS' })
  }, [])

  const handleRevealAll = useCallback(() => {
    dispatch({ type: 'REVEAL_ALL_REMAINING' })
  }, [])

  const handleRevealRemainingOne = useCallback((index: number) => {
    dispatch({ type: 'REVEAL_REMAINING_ONE', answerIndex: index })
  }, [])

  const handleNextQuestion = useCallback(() => {
    const nextIndex = state.questionIndex + 1
    // После блока 4 (Игра наоборот) игра заканчивается; также при достижении последнего вопроса
    if (nextIndex >= questions.length || state.roundIndex === 3) {
      dispatch({ type: 'GAME_END' })
    } else {
      dispatch({ type: 'NEXT_QUESTION', mainQuestion: getQuestion(nextIndex) })
    }
  }, [state.questionIndex, state.roundIndex, getQuestion, questions.length])

  const hasDrawQuestion = !!state.drawQuestion
  const hasMainQuestion = !!state.question
  const showDrawOverlay = !state.drawShown && hasDrawQuestion && state.screenPhase === 'draw_buttons' && state.drawPhase !== 'done'
  const mainPlayMode = state.screenPhase === 'main_play'
  const otherGuessMode = state.screenPhase === 'other_guess'
  const roundEndMode = state.screenPhase === 'round_end'
  const gameEndMode = state.screenPhase === 'game_end'
  const allRevealed = state.answers.length > 0 && state.answers.every((a) => a.revealed)

  const startLeftInputRef = useRef<HTMLInputElement>(null)
  const startRightInputRef = useRef<HTMLInputElement>(null)
  const startButtonRef = useRef<HTMLButtonElement>(null)
  const handleStartTabKey = useCallback(
    (e: React.KeyboardEvent, from: 'left' | 'right' | 'button') => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (from === 'left') {
          e.preventDefault()
          startButtonRef.current?.focus()
        } else if (from === 'right') {
          e.preventDefault()
          startLeftInputRef.current?.focus()
        } else {
          e.preventDefault()
          startRightInputRef.current?.focus()
        }
      } else {
        if (from === 'button') {
          e.preventDefault()
          startLeftInputRef.current?.focus()
        }
      }
    },
    []
  )
  
  // После завершения розыгрыша переходим к основной игре с вопросом 1 (Блок Простая игра Раунд 1)
  useEffect(() => {
    if (state.drawPhase === 'done' && state.drawFirstTeam && !hasMainQuestion && !state.drawShown) {
      const mainQuestion = getQuestion(1)
      handleStartMainGame(mainQuestion)
    }
  }, [state.drawPhase, state.drawFirstTeam, hasMainQuestion, state.drawShown, getQuestion, handleStartMainGame])


  const handleTeamNameLeft = useCallback((name: string) => {
    dispatch({ type: 'RESET_NAMES', leftName: name, rightName: state.rightTeam.name })
  }, [state.rightTeam.name])

  const handleTeamNameRight = useCallback((name: string) => {
    dispatch({ type: 'RESET_NAMES', leftName: state.leftTeam.name, rightName: name })
  }, [state.leftTeam.name])

  const handleStartGame = useCallback(() => {
    const leftDisplayName = getDisplayName(state.leftTeam.name, 'left')
    const rightDisplayName = getDisplayName(state.rightTeam.name, 'right')

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TEAM_NAMES_KEY_LEFT, leftDisplayName)
      localStorage.setItem(TEAM_NAMES_KEY_RIGHT, rightDisplayName)
    }

    // Обновляем имена в состоянии, чтобы дальше в игре использовать уже подставленные значения
    dispatch({ type: 'RESET_NAMES', leftName: leftDisplayName, rightName: rightDisplayName })

    handleStartRound(0)
  }, [state.leftTeam.name, state.rightTeam.name, handleStartRound])

  // Финальный экран с результатами игры
  if (gameEndMode) {
    const winner = state.leftTeam.score > state.rightTeam.score 
      ? state.leftTeam 
      : state.rightTeam.score > state.leftTeam.score 
        ? state.rightTeam 
        : null
    const leftDisplayName = getDisplayName(state.leftTeam.name, 'left')
    const rightDisplayName = getDisplayName(state.rightTeam.name, 'right')
    return (
      <div className="app">
        <div className="game-end-screen">
          <h1 className="game-end-title">Игра окончена!</h1>
          <div className="game-end-scores">
            <div className={`game-end-team ${winner?.id === 'left' ? 'winner' : ''}`}>
              <div className="game-end-team-name">{leftDisplayName}</div>
              <div className="game-end-team-score">{state.leftTeam.score}</div>
            </div>
            <div className="game-end-vs">VS</div>
            <div className={`game-end-team ${winner?.id === 'right' ? 'winner' : ''}`}>
              <div className="game-end-team-name">{rightDisplayName}</div>
              <div className="game-end-team-score">{state.rightTeam.score}</div>
            </div>
          </div>
          {winner && (
            <div className="game-end-winner">
              Победитель: <strong>{winner.id === 'left' ? leftDisplayName : rightDisplayName}</strong>
            </div>
          )}
          {!winner && (
            <div className="game-end-winner">Ничья!</div>
          )}
        </div>
        <footer className="app-copyright">© 2025 1M Солюшенс</footer>
      </div>
    )
  }

  if (!hasDrawQuestion && !hasMainQuestion) {
    return (
      <div className="app app--start-screen">
        <div className="start-screen-bg" aria-hidden />
        <div className="start-teams-row">
          <div className="start-team-block">
            <label className="start-team-label" htmlFor="start-team-left">
              Команда слева
            </label>
            <input
              id="start-team-left"
              ref={startLeftInputRef}
              type="text"
              className="start-team-input"
              value={state.leftTeam.name}
              onChange={(e) => handleTeamNameLeft(e.target.value)}
              placeholder="Название команды"
              maxLength={30}
              autoFocus
              tabIndex={1}
              onKeyDown={(e) => handleStartTabKey(e, 'left')}
            />
          </div>
          <div className="center-zone start-center">
            <p className="start-title" tabIndex={-1}>
              100 к 1
            </p>
            <button
              ref={startButtonRef}
              type="button"
              className="btn-next btn-start"
              onClick={handleStartGame}
              tabIndex={3}
              onKeyDown={(e) => handleStartTabKey(e, 'button')}
            >
              Начать игру
            </button>
          </div>
          <div className="start-team-block">
            <label className="start-team-label" htmlFor="start-team-right">
              Команда справа
            </label>
            <input
              id="start-team-right"
              ref={startRightInputRef}
              type="text"
              className="start-team-input"
              value={state.rightTeam.name}
              onChange={(e) => handleTeamNameRight(e.target.value)}
              placeholder="Название команды"
              maxLength={30}
              tabIndex={2}
            />
          </div>
        </div>
        <footer className="app-copyright" tabIndex={-1}>
          © 2026 1M Солюшенс
        </footer>
      </div>
    )
  }

  const leftDisplayName = getDisplayName(state.leftTeam.name, 'left')
  const rightDisplayName = getDisplayName(state.rightTeam.name, 'right')

  return (
    <div className="app">
      {!showDrawOverlay && (
        <>
          <div className="question-header">
            <div className="question-block">
              {state.question || '—'}
            </div>
          </div>

          <div className="game-content">
            <TeamPanel
              team={{ ...state.leftTeam, name: leftDisplayName }}
              isPlaying={state.roundIndex !== 3 && state.playingTeam === 'left' && !otherGuessMode && state.screenPhase !== 'round_end'}
              isDrawWinner={false}
              isOtherTeamTurn={otherGuessMode && state.playingTeam === 'right'}
              isRoundWinner={state.screenPhase === 'round_end' && state.roundWinner === 'left'}
              isBlock4Leader={state.roundIndex === 3 && state.screenPhase === 'round_end' && state.roundWinner === 'left'}
              showDrawButton={false}
              blockLabel={['x1', 'x2', 'x3', '¿'][state.roundIndex % 4]}
              showBlock4AssignButton={state.roundIndex === 3 && state.screenPhase === 'main_play'}
              onBlock4Assign={() => dispatch({ type: 'BLOCK4_ASSIGN_POINTS', teamId: 'left' })}
              block4AssignDisabled={!(state.block4PendingPoints != null && state.block4PendingPoints > 0)}
            />

            <div className="center-area">
              <div className="round-title">
                {ROUND_NAMES[state.roundIndex % ROUND_NAMES.length]} · Раунд {state.roundInBlock + 1} · Вопрос {state.questionIndex + 1}
              </div>
              <div className="game-fund">{state.gameFund}</div>

              <AnswerBoard
                answers={state.answers}
                onReveal={
                  mainPlayMode
                    ? handleRevealAnswer
                    : otherGuessMode
                      ? handleOtherTeamGuess
                      : roundEndMode
                        ? handleRevealRemainingOne
                        : undefined
                }
              />

              <GameControls
                screenPhase={state.screenPhase}
                onWrongAnswer={() => {
                  if (state.screenPhase === 'other_guess') {
                    handleOtherTeamWrong()
                  } else {
                    handleWrongAnswer()
                  }
                }}
                onRevealAllRemaining={handleRevealAll}
                onNextQuestion={handleNextQuestion}
                canWrong={(mainPlayMode && state.roundIndex !== 3) || otherGuessMode}
                allRevealed={allRevealed}
                isLastQuestion={state.questionIndex + 1 >= questions.length && state.roundIndex !== 3}
                nextButtonLabel={state.roundIndex === 3 && (state.screenPhase === 'round_end' || (state.screenPhase === 'main_play' && (allRevealed || (state.block4LeftButtonPressed && state.block4RightButtonPressed)))) ? 'Игра окончена' : undefined}
                showFinishGameButton={state.roundIndex === 3 && state.screenPhase === 'main_play' && (allRevealed || (state.block4LeftButtonPressed && state.block4RightButtonPressed))}
              />
            </div>

            <TeamPanel
              team={{ ...state.rightTeam, name: rightDisplayName }}
              isPlaying={state.roundIndex !== 3 && state.playingTeam === 'right' && !otherGuessMode && state.screenPhase !== 'round_end'}
              isDrawWinner={false}
              isOtherTeamTurn={otherGuessMode && state.playingTeam === 'left'}
              isRoundWinner={state.screenPhase === 'round_end' && state.roundWinner === 'right'}
              isBlock4Leader={state.roundIndex === 3 && state.screenPhase === 'round_end' && state.roundWinner === 'right'}
              showDrawButton={false}
              blockLabel={['x1', 'x2', 'x3', '¿'][state.roundIndex % 4]}
              showBlock4AssignButton={state.roundIndex === 3 && state.screenPhase === 'main_play'}
              onBlock4Assign={() => dispatch({ type: 'BLOCK4_ASSIGN_POINTS', teamId: 'right' })}
              block4AssignDisabled={!(state.block4PendingPoints != null && state.block4PendingPoints > 0)}
            />
          </div>
        </>
      )}

      {showDrawOverlay && (
        <DrawOverlay
          state={{
            ...state,
            leftTeam: { ...state.leftTeam, name: leftDisplayName },
            rightTeam: { ...state.rightTeam, name: rightDisplayName }
          }}
          onPress={handleDrawPress}
          onTransitionEnd={handleDrawHide}
        />
      )}
      <footer className="app-copyright">© 2025 1M Солюшенс</footer>
    </div>
  )
}
