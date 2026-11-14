/**
 * 백엔드와 통신하는 함수 모음 (명세 B01~B12 기준).
 * 주소 앞부분(/api)은 vite.config.ts의 proxy가 백엔드 서버로 넘겨줘요.
 */
import type {
  Choices,
  PreferenceOptions,
  Recommendation,
  RecommendationEvent,
  RoomAvailability,
  RoomMap,
  SavedPreferences,
} from '../types'

/** 추천받을 열람실. 열람실 선택 화면이 생기기 전까지 .env 값으로 고정 */
export const ROOM_ID: string = import.meta.env.VITE_ROOM_ID ?? 'DEMO-ROOM-A'

/** 로그인·회원가입 API가 명세에 생기기 전까지 가짜로 처리 */
const MOCK_AUTH = import.meta.env.VITE_MOCK_AUTH !== 'false'

const TOKEN_KEY = 'seatcom_token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

/** 백엔드 오류 { error: { code, message } } 를 담는 에러 */
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
  UNAUTHENTICATED: '로그인이 필요해요. 다시 로그인해 주세요.',
  RECOMMENDATION_EXPIRED: '추천 시간이 지났어요. 새로 추천받을게요.',
  AVAILABILITY_CHANGED: '그 사이에 자리 상황이 바뀌었어요. 새로 추천받을게요.',
  PREVIEW_NOT_SELECTABLE: '아직 검수 전인 자리라 선택할 수 없어요.',
  MAP_NOT_AVAILABLE: '이 열람실은 좌석도가 아직 없어요.',
  MODEL_UNAVAILABLE: '추천 서버가 잠시 응답하지 않아요. 잠시 후 다시 시도해 주세요.',
  RATE_LIMITED: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
  INVALID_INPUT: '보낸 값이 올바르지 않아요.',
}

/** 요청마다 새로 만드는 고유 ID (Idempotency-Key, eventId에 사용) */
export function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function request<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  if (method !== 'GET') headers['Idempotency-Key'] = newId() // 명세상 POST·PUT 필수

  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // JSON이 아닌 응답은 아래에서 처리
  }

  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string } } | null)?.error
    const code = err?.code ?? `HTTP_${res.status}`
    throw new ApiError(code, FRIENDLY[code] ?? err?.message ?? '요청에 실패했어요.', res.status)
  }

  // 성공 응답은 { data, meta } 형태
  return ((json as { data?: T } | null)?.data ?? json) as T
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ---------- 회원가입·로그인 (명세 미정, 지금은 가짜) ----------

export async function sendEmailCode(email: string): Promise<void> {
  if (MOCK_AUTH) return wait(500)
  return request<void>('POST', '/api/v1/auth/email/send', { email }) // TODO: 백엔드와 주소 확정
}

export async function verifyEmailCode(email: string, code: string): Promise<void> {
  if (MOCK_AUTH) {
    await wait(400)
    if (!/^\d{6}$/.test(code)) throw new Error('인증코드 6자리를 확인해 주세요.')
    return
  }
  return request<void>('POST', '/api/v1/auth/email/verify', { email, code }) // TODO
}

export async function signup(body: { email: string; code: string; nickname: string; password: string }): Promise<void> {
  if (MOCK_AUTH) return wait(500)
  return request<void>('POST', '/api/v1/auth/signup', body) // TODO
}

export async function login(nickname: string, password: string): Promise<void> {
  if (MOCK_AUTH) {
    await wait(400)
    setToken(`mock-token-${nickname}`)
    return
  }
  const data = await request<{ token: string }>('POST', '/api/v1/auth/login', { nickname, password }) // TODO
  setToken(data.token)
}

// ---------- 취향 ----------

/** B12 페르소나·질문·선택지 목록 */
export const getPreferenceOptions = () => request<PreferenceOptions>('GET', '/api/v1/preference-options')

/** B05 저장된 취향 */
export const getMyPreferences = () => request<SavedPreferences>('GET', '/api/v1/users/me/preferences')

/** B06 취향 저장. 다른 곳에서 먼저 바뀌었으면(REVISION_CONFLICT) 최신 revision으로 한 번 더 시도 */
export async function savePreferences(choices: Choices): Promise<SavedPreferences> {
  const put = (expectedRevision: number) =>
    request<SavedPreferences>('PUT', '/api/v1/users/me/preferences', { expectedRevision, choices })

  const current = await getMyPreferences()
  try {
    return await put(current.revision)
  } catch (e) {
    if (e instanceof ApiError && e.code === 'REVISION_CONFLICT') {
      const latest = await getMyPreferences()
      return put(latest.revision)
    }
    throw e
  }
}

// ---------- 열람실 ----------

/** B03 좌석도 */
export const getRoomMap = (roomId: string) =>
  request<RoomMap>('GET', `/api/v1/rooms/${encodeURIComponent(roomId)}/map`)

/** B04 마지막 관측 현황 */
export const getRoomAvailability = (roomId: string) =>
  request<RoomAvailability>('GET', `/api/v1/rooms/${encodeURIComponent(roomId)}/availability`)

// ---------- 추천 ----------

/** B08 좌석 추천. choices는 저장된 취향 위에 오늘만 덮어씀 */
export const createSeatRecommendation = (roomId: string, choices?: Choices) =>
  request<Recommendation>('POST', '/api/v1/recommendations/seats', {
    roomId,
    ...(choices ? { choices } : {}),
    options: {
      topK: 5,
      // 개별 좌석 현황 연동 전에는 confirmedOnly면 결과가 비어서 allowUnknown 사용 (백엔드와 확정 필요)
      availabilityPolicy: 'allowUnknown',
    },
  })

/** B09 노출·선택·거절 기록 */
export const recordEvent = (recommendationId: string, event: RecommendationEvent) =>
  request<{ eventId: string; effect: string }>(
    'POST',
    `/api/v1/recommendations/${encodeURIComponent(recommendationId)}/events`,
    { eventId: newId(), occurredAt: new Date().toISOString(), ...event },
  )