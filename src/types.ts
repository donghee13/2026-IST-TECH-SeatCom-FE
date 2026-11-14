export type PersonaId = 'laptop' | 'focus' | 'window' | 'short' | 'corner' | 'long'

export type QuestionId = 'cold' | 'plug' | 'noise' | 'stay'

/** 질문 id → 고른 보기의 번호(0부터) */
export type Answers = Partial<Record<QuestionId, number>>

export interface Preferences {
  personas: PersonaId[]
  answers: Answers
}

export interface MapSeat {
  id: string // 예: "A-01"
  taken: boolean
}

export interface RoomMap {
  roomName: string
  rows: MapSeat[][] // 위에서부터 한 줄씩
  aisleAfterRow: number // 이 줄 다음에 통로가 있음
}

export interface Recommendation {
  seatId: string
  seatName: string // 예: "제1열람실 A-01"
  reasons: string[]
}

export interface RecommendResult {
  requestId: string // 피드백 보낼 때 다시 씀
  room: RoomMap
  first: Recommendation
  second: Recommendation
}

export interface FeedbackBody {
  requestId: string
  action: 'accept' | 'reject'
  seatId?: string
  reasons?: string[]
  comment?: string
}