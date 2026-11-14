import { useCallback, useEffect, useState } from 'react'
import { clearToken, getMyPreferences, getPreferenceOptions, getToken } from './api'
import type { Choices, PreferenceOptions } from './types'
import { BookShelf, ErrorText, Screen, SecondaryButton } from './components/ui'
import Login from './pages/Login'
import SignupEmail from './pages/SignupEmail'
import SignupProfile from './pages/SignupProfile'
import Persona from './pages/Persona'
import Questions from './pages/Questions'
import Start from './pages/Start'
import Result from './pages/Result'

type ScreenName = 'login' | 'signupProfile' | 'signupEmail' | 'persona' | 'questions' | 'start' | 'result'

const NEEDS_OPTIONS: ScreenName[] = ['persona', 'questions', 'start', 'result']

export default function App() {
  // 저장된 토큰이 있으면 로그인 건너뛰기
  const [screen, setScreen] = useState<ScreenName>(() => (getToken() ? 'persona' : 'login'))
  // 회원가입 1단계에서 받은 닉네임·비밀번호 (2단계 이메일 인증 후 가입에 사용)
  const [account, setAccount] = useState<{ nickname: string; password: string } | null>(null)
  const [choices, setChoices] = useState<Choices>({ personaIds: [], answers: {} })

  // B12 선택지 목록
  const [options, setOptions] = useState<PreferenceOptions | null>(null)
  const [optionsError, setOptionsError] = useState('')

  const loadOptions = useCallback(async () => {
    setOptionsError('')
    try {
      const [opts, saved] = await Promise.all([
        getPreferenceOptions(),
        getMyPreferences().catch(() => null), // 저장된 취향이 있으면 미리 채움
      ])
      setOptions(opts)
      if (saved) setChoices({ personaIds: saved.choices.personaIds ?? [], answers: saved.choices.answers ?? {} })
    } catch (e) {
      setOptionsError(e instanceof Error ? e.message : '선택지를 불러오지 못했어요.')
    }
  }, [])

  useEffect(() => {
    if (NEEDS_OPTIONS.includes(screen) && !options && !optionsError) void loadOptions()
  }, [screen, options, optionsError, loadOptions])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  const logout = () => {
    clearToken()
    setOptions(null)
    setOptionsError('')
    setScreen('login')
  }

  const goAfterLogin = () => {
    setAccount(null) // 비밀번호를 메모리에 남겨두지 않음
    setOptionsError('')
    setScreen('persona')
  }

  // 닉네임·비밀번호 없이 회원가입 2단계로 오면 1단계로
  const current: ScreenName = screen === 'signupEmail' && !account ? 'signupProfile' : screen

  // 선택지가 필요한 화면인데 아직 없으면 로딩/오류 화면
  if (NEEDS_OPTIONS.includes(current) && !options) {
    return (
      <Screen className="items-center justify-center gap-4 px-5">
        {optionsError ? (
          <>
            <ErrorText>{optionsError}</ErrorText>
            <SecondaryButton className="px-6" onClick={() => void loadOptions()}>
              다시 시도
            </SecondaryButton>
            <button type="button" onClick={logout} className="min-h-11 text-sm text-muted underline">
              로그인 화면으로
            </button>
          </>
        ) : (
          <>
            <BookShelf scale={0.6} count={8} withShelf={false} />
            <p role="status" className="m-0 text-sm text-muted">
              불러오는 중…
            </p>
          </>
        )}
      </Screen>
    )
  }

  const personaText = (options?.personas ?? [])
    .filter((p) => choices.personaIds.includes(p.personaId))
    .map((p) => p.label)
    .join(' · ')

  switch (current) {
    case 'login':
      return <Login onLoggedIn={goAfterLogin} onSignup={() => setScreen('signupProfile')} />

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
          onDone={goAfterLogin}
        />
      )

    case 'persona':
      return (
        <Persona
          personas={options!.personas}
          selected={choices.personaIds}
          onChange={(personaIds) => setChoices((c) => ({ ...c, personaIds }))}
          onBack={logout}
          onNext={() => setScreen('questions')}
        />
      )

    case 'questions':
      return (
        <Questions
          questions={options!.questions}
          answers={choices.answers}
          onChange={(answers) => setChoices((c) => ({ ...c, answers }))}
          onBack={() => setScreen('persona')}
          onDone={() => setScreen('start')}
        />
      )

    case 'start':
      return (
        <Start
          options={options!}
          choices={choices}
          onBack={() => setScreen('questions')}
          onEdit={() => setScreen('persona')}
          onStart={() => setScreen('result')}
        />
      )

    case 'result':
      return <Result choices={choices} personaText={personaText} onBack={() => setScreen('start')} />
  }
}