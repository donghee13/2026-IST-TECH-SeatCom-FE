/**
 * 백엔드와 통신하는 함수 모음.
 * 지금은 USE_MOCK = true라서 가짜 응답을 돌려줘요.
 * 백엔드가 준비되면 .env에 VITE_USE_MOCK=false, VITE_API_URL=서버주소 를 넣고
 * 아래 TODO 주소들을 백엔드와 맞추면 돼요.
 */
import type { FeedbackBody, MapSeat, Preferences, Recommendation, RecommendResult } from '../types'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
const TOKEN_KEY = 'seatcom_token'

// ---------- 토큰 ----------
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

async function post<T>(path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    let message = '요청에 실패했어요. 잠시 후 다시 시도해 주세요.'
    try {
      const data = await res.json()
      if (data?.message) message = data.message
    } catch {
      // 응답에 JSON이 없으면 기본 메시지를 씀
    }
    throw new Error(message)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ---------- 회원가입 ----------

/** 1. 이메일로 6자리 인증코드 보내기 */
export async function sendEmailCode(email: string): Promise<void> {
  if (USE_MOCK) return wait(500)
  return post<void>('/auth/email/send', { email }) // TODO: 주소 확인
}

/** 2. 인증코드 확인 */
export async function verifyEmailCode(email: string, code: string): Promise<void> {
  if (USE_MOCK) {
    await wait(400)
    if (!/^\d{6}$/.test(code)) throw new Error('인증코드 6자리를 확인해 주세요.')
    return
  }
  return post<void>('/auth/email/verify', { email, code }) // TODO: 주소 확인
}

/** 3. 닉네임 + 비밀번호로 가입 */
export async function signup(body: { email: string; code: string; nickname: string; password: string }): Promise<void> {
  if (USE_MOCK) return wait(500)
  return post<void>('/auth/signup', body) // TODO: 주소 확인
}

// ---------- 로그인 ----------

/** 닉네임 + 비밀번호로 로그인하고 토큰을 저장 */
export async function login(nickname: string, password: string): Promise<void> {
  if (USE_MOCK) {
    await wait(400)
    setToken(`mock-token-${nickname}`)
    return
  }
  const data = await post<{ token: string }>('/auth/login', { nickname, password }) // TODO: 주소, 응답 형태 확인
  setToken(data.token)
}

// ---------- 추천 ----------

/** 좌석 추천 받기. excludeSeatIds는 '둘 다 별로예요'로 거절한 자리 */
export async function recommend(prefs: Preferences, excludeSeatIds: string[] = []): Promise<RecommendResult> {
  if (USE_MOCK) {
    await wait(800)
    return mockRecommend(prefs, excludeSeatIds)
  }
  return post<RecommendResult>('/recommendations', { ...prefs, excludeSeatIds }) // TODO: 주소 확인
}

/** 추천 결과에 대한 반응 보내기 (수락 / 거절 + 이유) */
export async function sendFeedback(body: FeedbackBody): Promise<void> {
  if (USE_MOCK) {
    console.info('[mock] feedback', body)
    return wait(300)
  }
  return post<void>(`/recommendations/${body.requestId}/feedback`, body) // TODO: 주소 확인
}

// ---------- 가짜 데이터 (백엔드 연결 전까지만 사용) ----------

const ROWS = ['A', 'B', 'C', 'D']
const TAKEN = ['.x.xx..x', 'x.x.xx..', '.xx...x.', 'x..xx.xx'] // x = 사용 중

function mockRecommend(prefs: Preferences, exclude: string[]): RecommendResult {
  const rows: MapSeat[][] = ROWS.map((r, ri) =>
    TAKEN[ri].split('').map((ch, ci) => ({ id: `${r}-${String(ci + 1).padStart(2, '0')}`, taken: ch === 'x' })),
  )

  const wantsWindow = prefs.personas.includes('window')
  const wantsQuiet = prefs.personas.includes('focus') || prefs.answers.noise === 0
  const score = (col: number) => (wantsWindow ? (8 - col) * 2 : 0) + (wantsQuiet ? 8 - col : col) // 출입문은 오른쪽 끝

  const candidates = rows
    .flatMap((row) => row.map((seat, col) => ({ seat, col })))
    .filter(({ seat }) => !seat.taken && !exclude.includes(seat.id))
    .sort((a, b) => score(b.col) - score(a.col))

  const pick = (i: number): Recommendation => {
    const c = candidates[i % Math.max(candidates.length, 1)] ?? { seat: rows[0][0], col: 0 }
    return { seatId: c.seat.id, seatName: `제1열람실 ${c.seat.id}`, reasons: mockReasons(c.col, prefs) }
  }

  return {
    requestId: `mock-${Date.now()}`,
    room: { roomName: '제1열람실', rows, aisleAfterRow: 1 },
    first: pick(0),
    second: pick(3),
  }
}

function mockReasons(col: number, prefs: Preferences): string[] {
  const r: string[] = []
  if (col === 0) r.push('창가 자리라 햇빛이 잘 들어와요')
  if (prefs.answers.plug !== 2) r.push('바로 옆에 콘센트가 있어요')
  if (prefs.answers.cold === 0) r.push('에어컨 바람이 직접 닿지 않아요')
  if (col <= 3 && prefs.answers.noise !== 2) r.push('출입문에서 멀어 조용해요')
  if (r.length === 0) r.push('지금 비어 있고 주변이 한산해요')
  return r.slice(0, 3)
}