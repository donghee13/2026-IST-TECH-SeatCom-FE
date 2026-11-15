/**
 * 백엔드(FastAPI, 명세 v2.1)와 통신하는 함수 모음.
 * /api 로 시작하는 주소는 vite.config.ts의 proxy가 백엔드 서버로 넘겨줘요.
 */
import type {
  History,
  Insights,
  LibrarySummary,
  PreferenceItem,
  Preferences,
  RoomFloor,
  RoomRecommendation,
  RoomSummary,
  SeatExplanation,
  SelectedRoom,
  LabAnalysis,
  LabSession,
  LabStatus,
  PersonaQuestion,
  PersonaQuestionsResponse,
  PersonaResult,
  Recommendation,
  RecommendationEvent,
  RoomAvailability,
  RoomMap,
  SaveAnswerResponse,
  SavedAnswersResponse,
} from '../types'

/** 로그인·회원가입 API가 명세에 생기기 전까지 가짜로 처리 */
const MOCK_AUTH = import.meta.env.VITE_MOCK_AUTH !== 'false'
/** 백엔드가 개발용 토큰을 주면 .env의 VITE_DEV_TOKEN에 넣어요. 가짜 로그인 때 이 토큰을 씀 */
const DEV_TOKEN = import.meta.env.VITE_DEV_TOKEN
/** 처음 들어온 사용자에게 보여줄 기본 열람실 */
export const ROOM_ID: string = import.meta.env.VITE_ROOM_ID ?? 'yongin-giheung:room:1'

// ---------- 브라우저에 저장하는 값 (대화 원문은 절대 저장하지 않음) ----------
const TOKEN_KEY = 'seatcom_token'
const NICKNAME_KEY = 'seatcom_nickname'
const LAB_KEY = 'seatcom_lab_session'
const ROOM_KEY = 'seatcom_room'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const getNickname = () => localStorage.getItem(NICKNAME_KEY) ?? ''

export function clearLocalData() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(NICKNAME_KEY)
  localStorage.removeItem(LAB_KEY)
}

/** 고른 열람실 (도서관 선택 화면에서 저장) */
export const loadSelectedRoom = (): SelectedRoom | null => {
  try {
    const raw = localStorage.getItem(ROOM_KEY)
    return raw ? (JSON.parse(raw) as SelectedRoom) : null
  } catch {
    return null
  }
}
export const saveSelectedRoom = (r: SelectedRoom) => localStorage.setItem(ROOM_KEY, JSON.stringify(r))

/** 실험실 세션 정보 (새로고침해도 이어서 진행하려고 저장) */
export interface SavedLab extends LabSession {
  analysis_id?: string | null
  last_status?: string
}
export const loadLabSession = (): SavedLab | null => {
  try {
    const raw = localStorage.getItem(LAB_KEY)
    return raw ? (JSON.parse(raw) as SavedLab) : null
  } catch {
    return null
  }
}
export const saveLabSession = (s: SavedLab) => localStorage.setItem(LAB_KEY, JSON.stringify(s))
export const clearLabSession = () => localStorage.removeItem(LAB_KEY)

// ---------- 공통 요청 ----------

export class ApiError extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

const FRIENDLY: Record<string, string> = {
  UNAUTHORIZED: '로그인이 필요해요. 다시 로그인해 주세요.',
  FORBIDDEN: '접근할 수 없는 정보예요.',
  NOT_FOUND: '정보를 찾을 수 없어요.',
  CONSENT_REQUIRED: '동의가 필요해요.',
  INVALID_ANSWER: '선택한 답을 저장하지 못했어요.',
  INCOMPLETE_ANSWERS: '모든 질문에 답해 주세요.',
  UPLOAD_ALREADY_USED: '이미 파일을 올린 분석이에요. 처음부터 다시 시작해 주세요.',
  UPLOAD_EXPIRED: '업로드 시간이 지났어요. 처음부터 다시 시작해 주세요.',
  FILE_TOO_LARGE: '파일이 너무 커요. 최근 대화만 내보내거나 대화방을 나눠서 올려 주세요.',
  INVALID_TXT: '읽을 수 없는 파일이에요. 카톡에서 내보낸 .txt 파일인지 확인해 주세요.',
  INVALID_KAKAO_TXT: '카카오톡에서 내보낸 대화 파일이 아닌 것 같아요.',
  TARGET_NOT_FOUND: '입력한 이름의 메시지를 찾지 못했어요. 카톡 대화방에 보이는 내 이름을 확인해 주세요.',
  TOO_MANY_UPLOADS: '업로드를 너무 자주 했어요. 잠시 뒤에 다시 해 주세요.',
  LAB_BUSY: '지금 분석 요청이 많아요. 잠시 뒤에 다시 해 주세요.',
  ACCOUNT_REQUIRED: '카톡 분석은 회원가입한 계정만 쓸 수 있어요.',
  AI_SERVICE_UNAVAILABLE: '분석 서버가 잠시 응답하지 않아요.',
  NETWORK: '서버에 연결할 수 없어요. 인터넷이나 서버가 켜져 있는지 확인해 주세요.',
  RECOMMENDATION_EXPIRED: '추천이 만료됐어요. 새로 추천받을게요.',
  AVAILABILITY_CHANGED: '그 사이 다른 분이 고른 자리예요. 새로 추천받을게요.',
  REVISION_CONFLICT: '다른 곳에서 취향이 바뀌었어요. 새로고침한 뒤 다시 저장해 주세요.',
}

/** FastAPI 기본 오류({ detail })와 약속한 오류({ error: { code, message } })를 모두 읽음 */
function readError(json: unknown, status: number): { code: string; message?: string } {
  const j = json as {
    error?: { code?: string; message?: string }
    detail?: string | { code?: string; message?: string } | { msg?: string }[]
  } | null
  if (j?.error) return { code: j.error.code ?? `HTTP_${status}`, message: j.error.message }
  const d = j?.detail
  if (typeof d === 'string')
    return {
      code: status === 401 ? 'UNAUTHORIZED' : `HTTP_${status}`,
      message: d,
    }
  if (Array.isArray(d))
    return {
      code: 'VALIDATION_ERROR',
      message: d
        .map((x) => x.msg)
        .filter(Boolean)
        .join(', '),
    }
  if (d && typeof d === 'object') return { code: d.code ?? `HTTP_${status}`, message: d.message }
  if (status === 401) return { code: 'UNAUTHORIZED' }
  if (status === 404) return { code: 'NOT_FOUND' }
  return { code: `HTTP_${status}` }
}

async function request<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('NETWORK', FRIENDLY.NETWORK, 0)
  }

  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // JSON이 아닌 응답
  }

  if (!res.ok) {
    const { code, message } = readError(json, res.status)
    throw new ApiError(code, FRIENDLY[code] ?? message ?? '요청에 실패했어요.', res.status)
  }
  return json as T
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// ---------- 회원가입·로그인 (v2.1 명세에 없음. 지금은 가짜) ----------

export async function sendEmailCode(email: string, purpose: 'signup' | 'reset' = 'signup'): Promise<void> {
  if (MOCK_AUTH) return wait(500)
  return request<void>('POST', '/api/v1/auth/email-codes', { email, purpose })
}

/** 비밀번호 찾기: 메일 코드 확인 후 새 비밀번호. 바로 로그인되고 닉네임을 돌려준다 */
export async function resetPassword(body: { email: string; code: string; password: string }): Promise<string> {
  if (MOCK_AUTH) {
    await wait(500)
    return getNickname() || '회원'
  }
  const data = await request<{ accessToken: string; nickname: string }>('POST', '/api/v1/auth/password-reset', body)
  setToken(data.accessToken)
  localStorage.setItem(NICKNAME_KEY, data.nickname)
  return data.nickname
}

export type Me = {
  userId: string
  email: string
  nickname: string
  createdAt: string
}
export async function getMe(): Promise<Me> {
  if (MOCK_AUTH)
    return {
      userId: 'mock',
      email: 'mock@example.com',
      nickname: getNickname() || '회원',
      createdAt: new Date().toISOString(),
    }
  return request<Me>('GET', '/api/v1/auth/me')
}

/** 회원 탈퇴: 비밀번호 확인 후 계정과 모든 기록을 지운다 */
export async function deleteAccount(password: string): Promise<void> {
  if (!MOCK_AUTH)
    await request<{ deleted: boolean }>('DELETE', '/api/v1/auth/me', {
      password,
    })
  clearLocalData()
  localStorage.removeItem(ROOM_KEY)
}

export async function verifyEmailCode(email: string, code: string): Promise<void> {
  if (MOCK_AUTH) {
    await wait(400)
    if (!/^\d{6}$/.test(code)) throw new Error('인증코드 6자리를 확인해 주세요.')
    return
  }
  // 새 제안에서는 인증코드를 가입 요청에 같이 보내서 따로 확인하지 않음
  void email
}

export async function signup(body: { email: string; code: string; nickname: string; password: string }): Promise<void> {
  if (MOCK_AUTH) return wait(500)
  const data = await request<{ accessToken?: string }>('POST', '/api/v1/auth/signup', body) // TODO
  if (data?.accessToken) setToken(data.accessToken)
}

export async function login(nickname: string, password: string): Promise<void> {
  if (MOCK_AUTH) {
    await wait(400)
    setToken(DEV_TOKEN || `mock-token-${newId()}`) // 헤더에는 한글을 못 넣어서 영문 ID 사용
  } else {
    const data = await request<{ accessToken: string }>('POST', '/api/v1/auth/login', { nickname, password }) // TODO
    setToken(data.accessToken)
  }
  localStorage.setItem(NICKNAME_KEY, nickname)
}

// ---------- 페르소나 4문항 ----------

/** 질문 목록 (order 순서로 정렬) */
export async function getPersonaQuestions(): Promise<PersonaQuestion[]> {
  const data = await request<PersonaQuestionsResponse>('GET', '/api/v1/persona/questions')
  return [...(data.questions ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/** 질문 하나의 답 저장. 다시 고르면 같은 API로 덮어씀 */
export const savePersonaAnswer = (questionId: string, answer: string) =>
  request<SaveAnswerResponse>('PUT', `/api/v1/persona/answers/${encodeURIComponent(questionId)}`, { answer })

/** 저장된 답 불러오기 */
export const getPersonaAnswers = () => request<SavedAnswersResponse>('GET', '/api/v1/persona/answers')

/** 답을 모두 저장한 뒤 결과 만들기 */
export const analyzePersona = () =>
  request<PersonaResult>('POST', '/api/v1/persona/analyze', {
    analysis_type: 'library_preference',
  })

/** 완료된 결과. 아직 없으면 null */
export async function getPersonaResult(): Promise<PersonaResult | null> {
  try {
    const r = await request<PersonaResult>('GET', '/api/v1/persona/result')
    return r && r.status === 'completed' ? r : null
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}

// ---------- 실험실 (카톡 분석) ----------

/** 업로드 세션 만들기. targetName은 카톡 대화방에 보이는 내 이름 */
export const createLabSession = (targetName: string) =>
  request<LabSession>('POST', '/api/v1/lab/sessions', {
    target_name: targetName,
    consent: true,
  })

/** 카톡 TXT 업로드. 파일 바이트를 본문 그대로 보낸다(multipart 아님). 브라우저·서버 어디에도 파일을 저장하지 않는다. */
export async function uploadLabFile(uploadId: string, file: File): Promise<LabStatus> {
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'text/plain' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let res: Response
  try {
    res = await fetch(`/api/v1/lab/sessions/${encodeURIComponent(uploadId)}/file`, {
      method: 'POST',
      headers,
      body: file,
      cache: 'no-store',
      credentials: 'omit',
    })
  } catch {
    throw new ApiError('NETWORK', FRIENDLY.NETWORK, 0)
  }
  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // JSON이 아닌 응답
  }
  if (!res.ok) {
    const { code, message } = readError(json, res.status)
    throw new ApiError(code, FRIENDLY[code] ?? message ?? '파일을 올리지 못했어요.', res.status)
  }
  return json as LabStatus
}

/** 업로드·분석 상태 */
export const getLabStatus = (uploadId: string) => request<LabStatus>('GET', `/api/v1/lab/sessions/${encodeURIComponent(uploadId)}/status`)

export const getCurrentLabSession = () => request<SavedLab | null>('GET', '/api/v1/lab/sessions/current').catch((e: unknown) => {
  // 순차 배포 중 이전 백엔드를 만난 경우에만 브라우저 기록으로 이어간다.
  if (e instanceof ApiError && e.status === 404) return loadLabSession()
  throw e
})

/** 카톡 분석 결과 */
export const getLabAnalysis = (analysisId: string) => request<LabAnalysis>('GET', `/api/v1/lab/analyses/${encodeURIComponent(analysisId)}`)

/** 세션 취소·삭제 */
export const deleteLabSession = (uploadId: string) => request<unknown>('DELETE', `/api/v1/lab/sessions/${encodeURIComponent(uploadId)}`)

// ---------- 도서관·열람실 ----------

export const getLibraries = () => request<{ items: LibrarySummary[] }>('GET', '/api/v1/libraries').then((d) => d.items)

export const getLibraryRooms = (libraryId: string) =>
  request<{
    libraryId: string
    name: string
    address: string | null
    items: RoomSummary[]
  }>('GET', `/api/v1/libraries/${encodeURIComponent(libraryId)}/rooms`)

export const recommendRooms = (libraryIds?: string[], topK = 3) =>
  request<RoomRecommendation>('POST', '/api/v1/recommendations/rooms', {
    libraryIds: libraryIds ?? null,
    options: { topK },
  })

// ---------- 좌석 추천 ----------

export const getRoomMap = (roomId: string) => request<RoomMap>('GET', `/api/v1/rooms/${encodeURIComponent(roomId)}/map`)

/** 열람실 평면도: 책상·창문·에어컨·조명·콘센트·출입구 (지도 픽셀 좌표) */
export const getRoomFloor = (roomId: string) => request<RoomFloor>('GET', `/api/v1/rooms/${encodeURIComponent(roomId)}/floor`)

/** 추천 결과 안의 한 좌석 자세히 보기 */
export const getSeatExplanation = (recommendationId: string, seatId: string) =>
  request<SeatExplanation>('GET', `/api/v1/recommendations/${encodeURIComponent(recommendationId)}/seats/${encodeURIComponent(seatId)}`)

export const getRoomAvailability = (roomId: string) => request<RoomAvailability>('GET', `/api/v1/rooms/${encodeURIComponent(roomId)}/availability`)

export const createSeatRecommendation = (roomId: string, topK = 5) =>
  request<Recommendation>('POST', '/api/v1/recommendations/seats', {
    roomId,
    options: { topK, availabilityPolicy: 'allowUnknown' },
  })

export const recordEvent = (recommendationId: string, event: RecommendationEvent) =>
  request<{ eventId: string; effect: string }>('POST', `/api/v1/recommendations/${encodeURIComponent(recommendationId)}/events`, {
    eventId: newId(),
    occurredAt: new Date().toISOString(),
    ...event,
  })

// ---------- 내 취향·이용 기록 ----------

export const getPreferences = () => request<Preferences>('GET', '/api/v1/users/me/preferences')

export const savePreferences = (expectedRevision: number, items: PreferenceItem[], laptopRequired: boolean | null) =>
  request<Preferences>('PUT', '/api/v1/users/me/preferences', {
    expectedRevision,
    items,
    laptopRequired,
  })

export const getInsights = () => request<Insights>('GET', '/api/v1/users/me/preferences/insights')

export const getHistory = () => request<History>('GET', '/api/v1/users/me/history')
