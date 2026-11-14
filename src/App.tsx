import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  clearLabSession,
  clearLocalData,
  deleteLabSession,
  getPersonaQuestions,
  getPersonaResult,
  getToken,
  loadLabSession,
  saveLabSession,
  type SavedLab,
} from './api'
import type { LabSession, LabStatus as LabStatusData, PersonaQuestion, PersonaResult as PersonaResultData } from './types'
import { ErrorScreen, LoadingScreen } from './components/ui'
import Login from './pages/Login'
import SignupProfile from './pages/SignupProfile'
import SignupEmail from './pages/SignupEmail'
import Questions from './pages/Questions'
import PersonaResult from './pages/PersonaResult'
import Home from './pages/Home'
import LabConsent from './pages/LabConsent'
import LabExport from './pages/LabExport'
import LabMail from './pages/LabMail'
import LabStatus from './pages/LabStatus'
import LabResult from './pages/LabResult'
import Result from './pages/Result'

type ScreenName =
  | 'login'
  | 'signupProfile'
  | 'signupEmail'
  | 'boot' // 로그인 직후: 설문 결과가 있는지 확인
  | 'questions'
  | 'personaResult'
  | 'home'
  | 'labConsent'
  | 'labExport'
  | 'labMail'
  | 'labStatus'
  | 'labResult'
  | 'result'

export default function App() {
  const [screen, setScreen] = useState<ScreenName>(() => (getToken() ? 'boot' : 'login'))
  const [account, setAccount] = useState<{ nickname: string; password: string } | null>(null)
  const [questions, setQuestions] = useState<PersonaQuestion[]>([])
  const [personaResult, setPersonaResult] = useState<PersonaResultData | null>(null)
  const [lab, setLab] = useState<SavedLab | null>(() => loadLabSession())
  const [bootError, setBootError] = useState('')

  const logout = useCallback(() => {
    clearLocalData()
    setPersonaResult(null)
    setQuestions([])
    setLab(null)
    setBootError('')
    setScreen('login')
  }, [])

  // 로그인 직후: 질문 목록과 설문 결과를 불러와서 결과가 있으면 메인, 없으면 질문으로
  const boot = useCallback(async () => {
    setBootError('')
    try {
      const [qs, result] = await Promise.all([getPersonaQuestions(), getPersonaResult()])
      setQuestions(qs)
      setPersonaResult(result)
      setScreen(result ? 'home' : 'questions')
    } catch (e) {
      if (e instanceof ApiError && e.code === 'UNAUTHORIZED') {
        logout()
        return
      }
      setBootError(e instanceof Error ? e.message : '불러오지 못했어요.')
    }
  }, [logout])

  useEffect(() => {
    if (screen === 'boot') void boot()
  }, [screen, boot])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  // 실험실 진행 상태 저장 (새로고침해도 이어서)
  const updateLab = useCallback((next: SavedLab | null) => {
    setLab(next)
    if (next) saveLabSession(next)
    else clearLabSession()
  }, [])

  const handleLabStatus = useCallback(
    (s: LabStatusData) => {
      setLab((prev) => {
        if (!prev) return prev
        const next = { ...prev, last_status: s.status, analysis_id: s.analysis.analysis_id ?? prev.analysis_id }
        saveLabSession(next)
        return next
      })
    },
    [],
  )

  const handleLabCompleted = useCallback(() => setScreen('labResult'), [])

  async function removeLab(goTo: ScreenName) {
    if (lab) await deleteLabSession(lab.upload_id).catch(() => undefined) // 이미 없어도 계속
    updateLab(null)
    setScreen(goTo)
  }

  function openLab() {
    if (!lab) return setScreen('labConsent')
    if (lab.last_status === 'completed' && lab.analysis_id) return setScreen('labResult')
    if (lab.last_status === 'rejected' || lab.last_status === 'expired') return setScreen('labStatus')
    return setScreen(lab.last_status ? 'labStatus' : 'labExport')
  }

  // 필요한 정보 없이 온 화면은 알맞은 화면으로 돌림
  let current: ScreenName = screen
  if (current === 'signupEmail' && !account) current = 'signupProfile' // 닉네임·비밀번호 없음
  if ((current === 'labExport' || current === 'labMail' || current === 'labStatus') && !lab) current = 'labConsent'
  if (current === 'labResult' && !lab?.analysis_id) current = 'home'
  if ((current === 'home' || current === 'personaResult') && !personaResult) current = 'questions'

  // 로그인 직후 확인 중 / 오류
  if (current === 'boot') {
    return bootError ? (
      <ErrorScreen message={bootError} onRetry={() => void boot()} secondaryLabel="로그인 화면으로" onSecondary={logout} />
    ) : (
      <LoadingScreen />
    )
  }

  switch (current) {
    case 'login':
      return <Login onLoggedIn={() => setScreen('boot')} onSignup={() => setScreen('signupProfile')} />

    case 'signupProfile':
      return (
        <SignupProfile
          initialNickname={account?.nickname}
          onBack={() => setScreen('login')}
          onNext={(nickname, password) => {
            setAccount({ nickname, password })
            setScreen('signupEmail')
          }}
        />
      )

    case 'signupEmail':
      return (
        <SignupEmail
          nickname={account!.nickname}
          password={account!.password}
          onBack={() => setScreen('signupProfile')}
          onDone={() => {
            setAccount(null) // 비밀번호를 메모리에 남겨두지 않음
            setScreen('boot')
          }}
        />
      )

    case 'questions':
      return (
        <Questions
          questions={questions}
          onExit={personaResult ? () => setScreen('home') : logout}
          onDone={(r) => {
            setPersonaResult(r)
            setScreen('personaResult')
          }}
        />
      )

    case 'personaResult':
      return (
        <PersonaResult
          result={personaResult!}
          questions={questions}
          onStart={() => setScreen('home')}
          onEdit={() => setScreen('questions')}
        />
      )

    case 'home':
      return (
        <Home
          result={personaResult!}
          questions={questions}
          lab={lab}
          onEditAnswers={() => setScreen('questions')}
          onOpenLab={openLab}
          onRecommend={() => setScreen('result')}
          onLogout={logout}
        />
      )

    case 'labConsent':
      return (
        <LabConsent
          onBack={() => setScreen('home')}
          onCreated={(s: LabSession) => {
            updateLab({ ...s, analysis_id: null })
            setScreen('labExport')
          }}
        />
      )

    case 'labExport':
      return <LabExport onBack={() => setScreen('home')} onLater={() => setScreen('home')} onNext={() => setScreen('labMail')} />

    case 'labMail':
      return (
        <LabMail
          session={lab!}
          onBack={() => setScreen('labExport')}
          onLater={() => setScreen('home')}
          onSent={() => {
            updateLab({ ...lab!, last_status: lab!.last_status ?? 'waiting_email' })
            setScreen('labStatus')
          }}
        />
      )

    case 'labStatus':
      return (
        <LabStatus
          session={lab!}
          onBack={() => setScreen('labMail')}
          onLater={() => setScreen('home')}
          onStatus={handleLabStatus}
          onCompleted={handleLabCompleted}
          onRestart={() => void removeLab('labConsent')}
          onCancel={() => void removeLab('home')}
        />
      )

    case 'labResult':
      return <LabResult analysisId={lab!.analysis_id!} onDone={() => setScreen('home')} />

    case 'result':
      return <Result onBack={() => setScreen('home')} />
  }
}