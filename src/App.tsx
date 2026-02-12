import { useReducer, useCallback, useState, useEffect } from 'react'
import { createInitialState, gameReducer } from './state/gameReducer'
import { DEFAULT_QUESTIONS, type QuestionData } from './data/questions'
import { TeamPanel } from './components/TeamPanel'
import { DrawOverlay } from './components/DrawOverlay'
import { AnswerBoard } from './components/AnswerBoard'
import { GameControls } from './components/GameControls'
import type { TeamId } from './types/game'

const ROUND_NAMES = ['Простая игра', 'Двойная игра', 'Тройная игра', 'Игра наоборот', 'Большая игра']

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
      dispatch({ type: 'START_ROUND', question: getQuestion(questionIndex) })
    },
    [getQuestion]
  )

  const handleDrawPress = useCallback((teamId: TeamId) => {
    dispatch({ type: 'DRAW_BUTTON_PRESS', teamId })
  }, [])

  const handleDrawHide = useCallback(() => {
    dispatch({ type: 'DRAW_HIDE_BUTTONS' })
  }, [])

  const handleDrawFirstAnswer = useCallback((index: number) => {
    dispatch({ type: 'DRAW_FIRST_ANSWER', answerIndex: index })
  }, [])

  const handleDrawSecondAnswer = useCallback((index: number) => {
    dispatch({ type: 'DRAW_SECOND_ANSWER', answerIndex: index })
  }, [])

  const handleDrawWrongFirst = useCallback(() => {
    dispatch({ type: 'DRAW_WRONG_FIRST' })
  }, [])

  const handleDrawWrongSecond = useCallback(() => {
    dispatch({ type: 'DRAW_WRONG_SECOND' })
  }, [])

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
    dispatch({ type: 'NEXT_QUESTION', nextQuestion: getQuestion(nextIndex) })
  }, [state.questionIndex, getQuestion])

  const hasQuestion = !!state.question
  const showDrawOverlay = hasQuestion && state.screenPhase === 'draw_buttons' && state.drawPhase !== 'done'
  const drawAnswersMode = state.screenPhase === 'draw_answers'
  const mainPlayMode = state.screenPhase === 'main_play'
  const otherGuessMode = state.screenPhase === 'other_guess'
  const roundEndMode = state.screenPhase === 'round_end'
  const allRevealed = state.answers.length > 0 && state.answers.every((a) => a.revealed)

  const pickAnswerDrawFirst =
    !!(drawAnswersMode && state.drawAnswerPhase === 'first_answer' && state.drawFirstTeam)
  const pickAnswerDrawSecond =
    !!(drawAnswersMode && state.drawAnswerPhase === 'second_answer')

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

  if (!hasQuestion) {
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
            <div className="question-block">{state.question || '—'}</div>
          </div>

          <div className="game-content">
            <TeamPanel
              team={state.leftTeam}
              isPlaying={state.playingTeam === 'left' && !otherGuessMode && state.screenPhase !== 'round_end'}
              isDrawWinner={false}
              isOtherTeamTurn={otherGuessMode && state.playingTeam === 'right'}
              isAnsweringInDraw={
                drawAnswersMode &&
                ((state.drawAnswerPhase === 'first_answer' && state.drawFirstTeam === 'left') ||
                  (state.drawAnswerPhase === 'second_answer' && state.drawFirstTeam === 'right'))
              }
              isRoundWinner={state.screenPhase === 'round_end' && state.roundWinner === 'left'}
              showDrawButton={false}
            />

            <div className="center-area">
              <div className="round-title">
                {ROUND_NAMES[state.roundIndex % ROUND_NAMES.length]} · Вопрос {state.questionIndex + 1}
              </div>
              <div className="game-fund">{state.gameFund}</div>

              <AnswerBoard
                answers={state.answers}
                pickMode={!!(pickAnswerDrawFirst || pickAnswerDrawSecond)}
                onPickAnswer={
                  pickAnswerDrawFirst
                    ? handleDrawFirstAnswer
                    : pickAnswerDrawSecond
                      ? handleDrawSecondAnswer
                      : undefined
                }
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
                  if (state.screenPhase === 'draw_answers') {
                    if (state.drawAnswerPhase === 'first_answer') handleDrawWrongFirst()
                    else handleDrawWrongSecond()
                  } else if (state.screenPhase === 'other_guess') {
                    handleOtherTeamWrong()
                  } else {
                    handleWrongAnswer()
                  }
                }}
                onRevealAllRemaining={handleRevealAll}
                onNextQuestion={handleNextQuestion}
                canWrong={mainPlayMode || drawAnswersMode || otherGuessMode}
                allRevealed={allRevealed}
              />
            </div>

            <TeamPanel
              team={state.rightTeam}
              isPlaying={state.playingTeam === 'right' && !otherGuessMode && state.screenPhase !== 'round_end'}
              isDrawWinner={false}
              isOtherTeamTurn={otherGuessMode && state.playingTeam === 'left'}
              isAnsweringInDraw={
                drawAnswersMode &&
                ((state.drawAnswerPhase === 'first_answer' && state.drawFirstTeam === 'right') ||
                  (state.drawAnswerPhase === 'second_answer' && state.drawFirstTeam === 'left'))
              }
              isRoundWinner={state.screenPhase === 'round_end' && state.roundWinner === 'right'}
              showDrawButton={false}
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
