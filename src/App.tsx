import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ApiError,
  clearLabSession,
  clearLocalData,
  createLabSession,
  deleteLabSession,
  getHistory,
  getCurrentLabSession,
  getLabStatus,
  getNickname,
  getPersonaQuestions,
  getPersonaResult,
  getToken,
  loadLabSession,
  loadSelectedRoom,
  saveLabSession,
  saveSelectedRoom,
  type SavedLab,
} from './api'
import type { HistoryItem, LabSession, LabStatus as LabStatusData, PersonaQuestion, PersonaResult as PersonaResultData, SelectedRoom } from './types'
import { ErrorScreen, LoadingScreen } from './components/ui'
import AppShell, { type NavKey } from './components/AppShell'
import Login from './pages/Login'
import SignupProfile from './pages/SignupProfile'
import SignupEmail from './pages/SignupEmail'
import Questions from './pages/Questions'
import PersonaResult from './pages/PersonaResult'
import Home from './pages/Home'
import LabConsent from './pages/LabConsent'
import LabExport from './pages/LabExport'
import LabUpload from './pages/LabUpload'
import LabStatus from './pages/LabStatus'
import LabResult from './pages/LabResult'
import Result from './pages/Result'
import Libraries from './pages/Libraries'
import Preferences from './pages/Preferences'
import History from './pages/History'
import PasswordReset from './pages/PasswordReset'
import Account from './pages/Account'

type ScreenName =
  | 'login'
  | 'passwordReset'
  | 'account'
  | 'signupProfile'
  | 'signupEmail'
  | 'boot' // 로그인 직후: 설문 결과가 있는지 확인
  | 'questions'
  | 'personaResult'
  | 'home'
  | 'libraries'
  | 'preferences'
  | 'history'
  | 'labConsent'
  | 'labExport'
  | 'labUpload'
  | 'labStatus'
  | 'labResult'
  | 'result'

/** 로그인 뒤 화면(주소 #에 남겨 새로고침·뒤로 가기를 지원) */
const ROUTED: ScreenName[] = [
  'home',
  'libraries',
  'result',
  'preferences',
  'history',
  'account',
  'questions',
  'personaResult',
  'labConsent',
  'labExport',
  'labUpload',
  'labStatus',
  'labResult',
]
/** 로그인 전 화면 */
const PUBLIC: ScreenName[] = ['login', 'signupProfile', 'signupEmail', 'passwordReset']
const hashScreen = (): ScreenName | null => {
  const h = window.location.hash.slice(1) as ScreenName
  return ROUTED.includes(h) ? h : null
}
type HistState = { screen?: ScreenName; i?: number; layer?: number }
const histState = () => (window.history.state ?? {}) as HistState

const NAV_OF: Partial<Record<ScreenName, NavKey>> = {
  home: 'home',
  personaResult: 'home',
  questions: 'home',
  libraries: 'libraries',
  result: 'result',
  preferences: 'preferences',
  history: 'history',
  account: 'account',
  labConsent: 'lab',
  labExport: 'lab',
  labUpload: 'lab',
  labStatus: 'lab',
  labResult: 'lab',
}

export default function App() {
  const [screen, setScreenRaw] = useState<ScreenName>(() => (getToken() ? 'boot' : 'login'))
  const [account, setAccount] = useState<{
    nickname: string
    password: string
  } | null>(null)
  const [questions, setQuestions] = useState<PersonaQuestion[]>([])
  const [personaResult, setPersonaResult] = useState<PersonaResultData | null>(null)
  const [lab, setLab] = useState<SavedLab | null>(() => loadLabSession())
  const [room, setRoom] = useState<SelectedRoom | null>(() => loadSelectedRoom())
  const [current, setCurrent] = useState<HistoryItem | null>(null)
  const [recent, setRecent] = useState<HistoryItem[]>([])
  const [bootError, setBootError] = useState('')
  const screenRef = useRef(screen)
  useEffect(() => { screenRef.current = screen }, [screen])

  /**
   * 화면 이동. 화면마다 기록(history)을 하나씩 쌓아 휴대폰·브라우저 뒤로 가기가 앞 화면으로 가게 한다.
   * replace: 지금 기록을 바꿔치기(로그인 직후, 다시 돌아오면 안 되는 단계 등)
   */
  const setScreen = useCallback((s: ScreenName, opts?: { replace?: boolean }) => {
    setScreenRaw(s)
    if (s === 'boot') return
    const url = ROUTED.includes(s) ? `#${s}` : window.location.pathname
    const cur = histState()
    if (opts?.replace) window.history.replaceState({ screen: s, i: cur.i ?? 0 }, '', url)
    else if (cur.screen !== s || cur.layer) window.history.pushState({ screen: s, i: (cur.i ?? 0) + 1 }, '', url)
  }, [])

  /** 앞 화면으로. 앱 안에서 온 기록이 있으면 브라우저 뒤로 가기, 없으면(새로고침·바로 들어옴) fallback으로 */
  const goBack = useCallback(
    (fallback: ScreenName) => {
      if ((histState().i ?? 0) > 0) window.history.back()
      else setScreen(fallback, { replace: true })
    },
    [setScreen],
  )

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const st = (e.state ?? {}) as HistState
      const target = st.screen ?? hashScreen()
      if (!target) return
      if (!getToken()) {
        // 로그아웃 뒤에 남은 기록: 로그인 전 화면만 허용
        setScreenRaw(PUBLIC.includes(target) ? target : 'login')
        return
      }
      // 아직 로그인 후 준비(boot) 전이면 준비부터: 준비가 끝나면 주소의 화면으로 간다
      setScreenRaw((prev) => {
        if (PUBLIC.includes(target)) return prev // 로그인한 채로 로그인 화면 기록으로는 가지 않는다
        if (prev === 'boot' || PUBLIC.includes(prev)) return 'boot'
        return target
      })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // 처음 열 때(로그인 화면) 지금 기록에 화면 이름을 남긴다. 로그인 뒤 화면은 boot가 남긴다
  useEffect(() => {
    if (!getToken() && !histState().screen) window.history.replaceState({ screen: 'login', i: 0 }, '', window.location.pathname)
  }, [])

  const logout = useCallback(() => {
    clearLocalData()
    setPersonaResult(null)
    setQuestions([])
    setLab(null)
    setCurrent(null)
    setRecent([])
    setBootError('')
    window.history.replaceState({ screen: 'login', i: 0 }, '', window.location.pathname)
    setScreenRaw('login')
  }, [])

  /** 이용 중 자리·최근 기록 새로고침 (자리를 고르거나 이용을 끝낸 뒤) */
  const refreshHistory = useCallback(() => {
    getHistory()
      .then((h) => {
        setCurrent(h.current)
        setRecent(h.items)
      })
      .catch(() => undefined)
  }, [])

  // 로그인 직후: 질문 목록과 설문 결과를 불러와서 결과가 있으면 메인(또는 주소의 화면), 없으면 질문으로
  const boot = useCallback(async () => {
    setBootError('')
    try {
      const [qs, result, savedLab] = await Promise.all([getPersonaQuestions(), getPersonaResult(), getCurrentLabSession()])
      setLab(savedLab)
      if (savedLab) saveLabSession(savedLab)
      else clearLabSession()
      setQuestions(qs)
      setPersonaResult(result)
      if (result) refreshHistory()
      // 처음 화면: 주소의 화면 → 고른 열람실이 있으면 메인, 없으면 도서관 고르기부터
      const start = result ? (hashScreen() ?? (loadSelectedRoom() ? 'home' : 'libraries')) : 'questions'
      setScreen(start, { replace: true })
    } catch (e) {
      if (e instanceof ApiError && e.code === 'UNAUTHORIZED') {
        logout()
        return
      }
      setBootError(e instanceof Error ? e.message : '불러오지 못했어요.')
    }
  }, [logout, refreshHistory, setScreen])

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

  const handleLabStatus = useCallback((s: LabStatusData) => {
    setLab((prev) => {
      if (!prev || prev.upload_id !== s.upload_id) return prev
      const next = {
        ...prev,
        status: s.status,
        last_status: s.status,
        analysis_id: s.analysis.analysis_id,
      }
      saveLabSession(next)
      return next
    })
  }, [])

  // 결과 화면을 떠나도 서버 작업 상태를 따라간다. 늦게 도착한 다른 세션의
  // 응답은 handleLabStatus에서 무시하며, 탭 복귀 시 즉시 다시 확인한다.
  useEffect(() => {
    if (!personaResult || !lab || !['waiting_upload', 'analyzing'].includes(lab.status)) return
    let disposed = false
    let busy = false
    const uploadId = lab.upload_id
    async function sync() {
      if (disposed || busy || document.hidden) return
      busy = true
      try {
        const status = await getLabStatus(uploadId)
        if (!disposed) handleLabStatus(status)
      } catch {
        // 일시적인 연결 실패는 작업 실패가 아니다. 다음 주기에 다시 확인한다.
      } finally { busy = false }
    }
    void sync()
    const timer = setInterval(() => void sync(), 5000)
    const resume = () => { void sync() }
    window.addEventListener('focus', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      disposed = true
      clearInterval(timer)
      window.removeEventListener('focus', resume)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [lab?.upload_id, lab?.status, personaResult, handleLabStatus])

  const handleLabCompleted = useCallback(() => setScreen('labResult', { replace: true }), [setScreen])

  async function removeLab(goTo: ScreenName) {
    if (lab) await deleteLabSession(lab.upload_id).catch(() => undefined) // 이미 없어도 계속
    updateLab(null)
    setScreen(goTo, { replace: true })
  }

  /** 업로드 시간이 지났거나 실패한 세션: 같은 이름·동의로 새 세션을 만든다(처음부터 다시 입력하지 않게) */
  async function renewLab(): Promise<SavedLab> {
    const name = lab?.target_name
    if (!name) throw new Error('카톡 이름이 없어요. 처음부터 다시 시작해 주세요.')
    const next: SavedLab = { ...(await createLabSession(name)), analysis_id: null, last_status: 'waiting_upload' }
    try {
      if (lab) await deleteLabSession(lab.upload_id).catch((e: unknown) => {
        if (!(e instanceof ApiError && e.status === 404)) throw e
      })
    } catch (e) {
      await deleteLabSession(next.upload_id).catch(() => undefined)
      throw e
    }
    updateLab(next)
    return next
  }

  async function restartLab() {
    await renewLab()
    setScreen('labUpload', { replace: true })
  }

  async function resetLabAnalysis() {
    if (!lab?.target_name) throw new Error('카톡 이름이 없어요. 처음부터 다시 시작해 주세요.')
    const previous = lab
    // 새 업로드 준비가 실패하면 현재 결과를 그대로 유지한다.
    const next: SavedLab = { ...(await createLabSession(previous.target_name)), analysis_id: null, last_status: 'waiting_upload' }
    try {
      await deleteLabSession(previous.upload_id).catch((e: unknown) => {
        if (!(e instanceof ApiError && e.status === 404)) throw e
      })
    } catch (e) {
      await deleteLabSession(next.upload_id).catch(() => undefined)
      throw e
    }
    updateLab(next)
    setScreen('labUpload', { replace: true })
  }

  function openLab() {
    if (!lab) return setScreen('labConsent')
    if (lab.last_status === 'completed' && lab.analysis_id) return setScreen('labResult')
    if (!lab.last_status || lab.last_status === 'waiting_upload') return setScreen('labExport')
    return setScreen('labStatus')
  }

  const pickRoom = (r: SelectedRoom, go: boolean) => {
    setRoom(r)
    saveSelectedRoom(r)
    if (go) setScreen('result')
  }

  const navigate = (key: NavKey) => {
    if (key === 'lab') return openLab()
    if (key === 'result' && !room) return setScreen('libraries')
    setScreen(key)
  }

  // 필요한 정보 없이 온 화면은 알맞은 화면으로 돌림
  let current_: ScreenName = screen
  if (current_ === 'signupEmail' && !account) current_ = 'signupProfile' // 닉네임·비밀번호 없음
  if ((current_ === 'labExport' || current_ === 'labUpload' || current_ === 'labStatus') && !lab) current_ = 'labConsent'
  if (current_ === 'labResult' && !lab?.analysis_id) current_ = 'home'
  if (lab && ['labConsent', 'labExport', 'labUpload', 'labStatus', 'labResult'].includes(current_)) {
    const state = lab.last_status ?? lab.status
    if (state === 'completed' && lab.analysis_id) current_ = 'labResult'
    else if (state !== 'waiting_upload') current_ = 'labStatus'
  }
  if (current_ === 'result' && !room) current_ = 'libraries'
  if (ROUTED.includes(current_) && current_ !== 'questions' && !personaResult) current_ = 'questions'

  // 로그인 직후 확인 중 / 오류
  if (current_ === 'boot') {
    return bootError ? (
      <ErrorScreen message={bootError} onRetry={() => void boot()} secondaryLabel="로그인 화면으로" onSecondary={logout} />
    ) : (
      <LoadingScreen />
    )
  }

  const page = renderPage()
  // 설문을 마친 뒤의 화면은 앱 틀(데스크톱 사이드바) 안에서
  if (personaResult && NAV_OF[current_] !== undefined) {
    return (
      <AppShell active={NAV_OF[current_] ?? null} nickname={getNickname()} room={room} current={current} onNavigate={navigate} onLogout={logout}>
        {page}
      </AppShell>
    )
  }
  return page

  function renderPage() {
    switch (current_) {
      case 'login':
        return <Login onLoggedIn={() => setScreen('boot')} onSignup={() => setScreen('signupProfile')} onForgot={() => setScreen('passwordReset')} />

      case 'passwordReset':
        return <PasswordReset onBack={() => goBack('login')} onDone={() => setScreen('boot')} />

      case 'account':
        return (
          <Account
            onBack={() => goBack('home')}
            onLogout={logout}
            onDeleted={() => {
              setRoom(null)
              logout()
            }}
          />
        )

      case 'signupProfile':
        return (
          <SignupProfile
            initialNickname={account?.nickname}
            onBack={() => goBack('login')}
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
            onBack={() => goBack('signupProfile')}
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
            onExit={personaResult ? () => goBack('home') : logout}
            onDone={(r) => {
              setPersonaResult(r)
              setScreen('personaResult', { replace: true })
            }}
          />
        )

      case 'personaResult':
        return (
          <PersonaResult
            result={personaResult!}
            questions={questions}
            onStart={() => setScreen(room ? 'home' : 'libraries', { replace: true })}
            onEdit={() => setScreen('questions')}
          />
        )

      case 'home':
        return (
          <Home
            result={personaResult!}
            questions={questions}
            lab={lab}
            room={room}
            current={current}
            recent={recent}
            onEditAnswers={() => setScreen('questions')}
            onOpenLab={openLab}
            onRecommend={() => setScreen(room ? 'result' : 'libraries')}
            onPickLibrary={() => setScreen('libraries')}
            onPreferences={() => setScreen('preferences')}
            onHistory={() => setScreen('history')}
            onAccount={() => setScreen('account')}
            onLogout={logout}
          />
        )

      case 'libraries':
        return <Libraries selected={room} onBack={() => goBack('home')} onSelect={pickRoom} />

      case 'preferences':
        return <Preferences onBack={() => goBack('home')} onChanged={refreshHistory} />

      case 'history':
        return <History onBack={() => goBack('home')} onRecommend={() => setScreen(room ? 'result' : 'libraries')} onChanged={refreshHistory} />

      case 'labConsent':
        return (
          <LabConsent
            onBack={() => goBack('home')}
            onCreated={(s: LabSession) => {
              updateLab({ ...s, analysis_id: null })
              setScreen('labExport', { replace: true })
            }}
          />
        )

      case 'labExport':
        return <LabExport onBack={() => goBack('home')} onLater={() => setScreen('home')} onNext={() => setScreen('labUpload')} />

      case 'labUpload':
        return (
          <LabUpload
            session={lab!}
            onBack={() => goBack('labExport')}
            onLater={() => setScreen('home')}
            onRenew={renewLab}
            onAlreadyUsed={() => setScreen('labStatus', { replace: true })}
            onUploaded={(s, uploaded) => {
              // 브라우저에는 진행 상태(ID·상태)만 저장한다. 파일 내용은 저장하지 않는다
              if (loadLabSession()?.upload_id !== uploaded.upload_id) return
              updateLab({ ...uploaded, status: s.status, last_status: s.status, analysis_id: s.analysis.analysis_id ?? null })
              if (screenRef.current === 'labUpload') setScreen('labStatus', { replace: true })
            }}
          />
        )

      case 'labStatus':
        return (
          <LabStatus
            session={lab!}
            onBack={() => goBack('home')}
            onLater={() => setScreen('home')}
            onReupload={() => setScreen('labUpload')}
            onStatus={handleLabStatus}
            onCompleted={handleLabCompleted}
            onRestart={restartLab}
            onCancel={() => void removeLab('home')}
          />
        )

      case 'labResult':
        return <LabResult analysisId={lab!.analysis_id!} onDone={() => setScreen('home')} onReset={resetLabAnalysis} />

      case 'result':
        return (
          <Result
            room={room!}
            onBack={() => goBack('libraries')}
            onPickLibrary={() => setScreen('libraries')}
            onHistory={() => setScreen('history')}
            onChanged={refreshHistory}
          />
        )
    }
  }
}
