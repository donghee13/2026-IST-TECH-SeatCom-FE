import { useEffect, useState } from 'react'
import { getToken } from './api'
import type { Preferences } from './types'
import Login from './pages/Login'
import SignupEmail from './pages/SignupEmail'
import SignupProfile from './pages/SignupProfile'
import Persona from './pages/Persona'
import Questions from './pages/Questions'
import Start from './pages/Start'
import Result from './pages/Result'

type ScreenName = 'login' | 'signupEmail' | 'signupProfile' | 'persona' | 'questions' | 'start' | 'result'

export default function App() {
  // 저장된 토큰이 있으면 로그인 건너뛰기
  const [screen, setScreen] = useState<ScreenName>(() => (getToken() ? 'persona' : 'login'))
  const [verified, setVerified] = useState<{ email: string; code: string } | null>(null)
  const [prefs, setPrefs] = useState<Preferences>({ personas: [], answers: {} })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  // 인증 정보 없이 2단계로 오면 1단계로
  const current: ScreenName = screen === 'signupProfile' && !verified ? 'signupEmail' : screen

  switch (current) {
    case 'login':
      return <Login onLoggedIn={() => setScreen('persona')} onSignup={() => setScreen('signupEmail')} />

    case 'signupEmail':
      return (
        <SignupEmail
          onBack={() => setScreen('login')}
          onVerified={(email, code) => {
            setVerified({ email, code })
            setScreen('signupProfile')
          }}
        />
      )

    case 'signupProfile':
      return (
        <SignupProfile
          email={verified!.email}
          code={verified!.code}
          onBack={() => setScreen('signupEmail')}
          onDone={() => setScreen('persona')}
        />
      )

    case 'persona':
      return (
        <Persona
          selected={prefs.personas}
          onChange={(personas) => setPrefs((p) => ({ ...p, personas }))}
          onBack={() => setScreen('login')}
          onNext={() => setScreen('questions')}
        />
      )

    case 'questions':
      return (
        <Questions
          answers={prefs.answers}
          onChange={(answers) => setPrefs((p) => ({ ...p, answers }))}
          onBack={() => setScreen('persona')}
          onDone={() => setScreen('start')}
        />
      )

    case 'start':
      return (
        <Start
          prefs={prefs}
          onBack={() => setScreen('questions')}
          onEdit={() => setScreen('persona')}
          onStart={() => setScreen('result')}
        />
      )

    case 'result':
      return <Result prefs={prefs} onBack={() => setScreen('start')} />
  }
}