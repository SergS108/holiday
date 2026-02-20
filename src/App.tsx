import { useReducer, useCallback, useState, useEffect } from 'react'
import { createInitialState, gameReducer } from './state/gameReducer'
import { DEFAULT_QUESTIONS, DRAW_QUESTION, type QuestionData } from './data/questions'
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

function getInitialState() {
  return createInitialState(
    getStoredTeamName(TEAM_NAMES_KEY_LEFT, 'Команда А'),
    getStoredTeamName(TEAM_NAMES_KEY_RIGHT, 'Команда Б')
  )
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
      // При первом запуске (questionIndex = 0) показываем розыгрыш с DRAW_QUESTION
      // Основной вопрос будет установлен после завершения розыгрыша через START_MAIN_GAME
      // При последующих запусках сразу используем основной вопрос
      dispatch({ type: 'START_ROUND', drawQuestion: DRAW_QUESTION, mainQuestion: getQuestion(questionIndex) })
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
    // После скрытия кнопок сразу переходим к основной игре с первым вопросом
    if (state.drawFirstTeam && !state.drawShown) {
      const mainQuestion = getQuestion(0)
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
  
  // После завершения розыгрыша (скрытия кнопок) переходим к основной игре
  useEffect(() => {
    if (state.drawPhase === 'done' && state.drawFirstTeam && !hasMainQuestion && !state.drawShown) {
      // Используем вопрос с индексом 0 (первый вопрос из списка)
      const mainQuestion = getQuestion(0)
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
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TEAM_NAMES_KEY_LEFT, state.leftTeam.name)
      localStorage.setItem(TEAM_NAMES_KEY_RIGHT, state.rightTeam.name)
    }
    handleStartRound(0)
  }, [state.leftTeam.name, state.rightTeam.name, handleStartRound])

  // Финальный экран с результатами игры
  if (gameEndMode) {
    const winner = state.leftTeam.score > state.rightTeam.score 
      ? state.leftTeam 
      : state.rightTeam.score > state.leftTeam.score 
        ? state.rightTeam 
        : null
    return (
      <div className="app">
        <div className="game-end-screen">
          <h1 className="game-end-title">Игра окончена!</h1>
          <div className="game-end-scores">
            <div className={`game-end-team ${winner?.id === 'left' ? 'winner' : ''}`}>
              <div className="game-end-team-name">{state.leftTeam.name}</div>
              <div className="game-end-team-score">{state.leftTeam.score}</div>
            </div>
            <div className="game-end-vs">VS</div>
            <div className={`game-end-team ${winner?.id === 'right' ? 'winner' : ''}`}>
              <div className="game-end-team-name">{state.rightTeam.name}</div>
              <div className="game-end-team-score">{state.rightTeam.score}</div>
            </div>
          </div>
          {winner && (
            <div className="game-end-winner">
              Победитель: <strong>{winner.name}</strong>
            </div>
          )}
          {!winner && (
            <div className="game-end-winner">Ничья!</div>
          )}
        </div>
      </div>
    )
  }

  if (!hasDrawQuestion && !hasMainQuestion) {
    return (
      <div className="app">
        <div className="start-teams-row">
          <div className="start-team-block">
            <label className="start-team-label">Команда слева</label>
            <input
              type="text"
              className="start-team-input"
              value={state.leftTeam.name}
              onChange={(e) => handleTeamNameLeft(e.target.value)}
              placeholder="Название команды"
              maxLength={30}
            />
          </div>
          <div className="center-zone start-center">
            <p className="start-title">100 к 1</p>
            <p className="start-subtitle">С 8 марта!</p>
            <button type="button" className="btn-next btn-start" onClick={handleStartGame}>
              Начать игру
            </button>
            <p className="start-company">1M Солюшенс</p>
          </div>
          <div className="start-team-block">
            <label className="start-team-label">Команда справа</label>
            <input
              type="text"
              className="start-team-input"
              value={state.rightTeam.name}
              onChange={(e) => handleTeamNameRight(e.target.value)}
              placeholder="Название команды"
              maxLength={30}
            />
          </div>
        </div>
      </div>
    )
  }

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
              team={state.leftTeam}
              isPlaying={state.playingTeam === 'left' && !otherGuessMode && state.screenPhase !== 'round_end'}
              isDrawWinner={false}
              isOtherTeamTurn={otherGuessMode && state.playingTeam === 'right'}
              isRoundWinner={state.screenPhase === 'round_end' && state.roundWinner === 'left'}
              isBlock4Leader={state.roundIndex === 3 && state.screenPhase === 'round_end' && state.roundWinner === 'left'}
              showDrawButton={false}
              blockLabel={['x1', 'x2', 'x3', '¿'][state.roundIndex % 4]}
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
                canWrong={mainPlayMode || otherGuessMode}
                allRevealed={allRevealed}
                isLastQuestion={state.questionIndex + 1 >= questions.length && state.roundIndex !== 3}
                nextButtonLabel={state.roundIndex === 3 && state.screenPhase === 'round_end' ? 'Игра окончена' : undefined}
              />
            </div>

            <TeamPanel
              team={state.rightTeam}
              isPlaying={state.playingTeam === 'right' && !otherGuessMode && state.screenPhase !== 'round_end'}
              isDrawWinner={false}
              isOtherTeamTurn={otherGuessMode && state.playingTeam === 'left'}
              isRoundWinner={state.screenPhase === 'round_end' && state.roundWinner === 'right'}
              isBlock4Leader={state.roundIndex === 3 && state.screenPhase === 'round_end' && state.roundWinner === 'right'}
              showDrawButton={false}
              blockLabel={['x1', 'x2', 'x3', '¿'][state.roundIndex % 4]}
            />
          </div>
        </>
      )}

      {showDrawOverlay && (
        <DrawOverlay
          state={state}
          onPress={handleDrawPress}
          onTransitionEnd={handleDrawHide}
        />
      )}
    </div>
  )
}
