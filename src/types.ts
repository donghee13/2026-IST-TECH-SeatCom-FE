// 백엔드 명세(B01~B12)에 맞춘 데이터 모양

/** 사용자가 고른 선택지 ID (B05·B06·B08에서 그대로 주고받음) */
export interface Choices {
  personaIds: string[]
  answers: Record<string, string> // questionId → optionId
}

// ---------- B12 선택지 목록 ----------
export interface PreferencePersona {
  personaId: string
  label: string
  description?: string | null
}

export interface PreferenceQuestion {
  questionId: string
  label: string
  options: { optionId: string; label: string }[]
}

export interface PreferenceOptions {
  optionsVersion: string
  personas: PreferencePersona[]
  questions: PreferenceQuestion[]
}

// ---------- B05·B06 저장된 취향 ----------
export interface SavedPreferences {
  revision: number
  choices: Choices
}

// ---------- B03 좌석도 ----------
export interface Box {
  x: number // 0~1, 왼쪽 위 기준
  y: number
  width: number
  height: number
}

export interface MapSeat extends Box {
  seatId: string
  label: string | null
  verification: 'verified' | 'unverified'
}

export interface Facility {
  facilityId: string
  type: string // toilet, entrance, window, outlet 등
  geometry: Box
  verification: 'verified' | 'unverified'
}

export interface RoomMap {
  roomId: string
  mapId: string
  mapVersion: string
  width: number
  height: number
  backgroundUrl: string | null
  verification: 'verified' | 'unverified'
  seats: MapSeat[]
  facilities: Facility[]
}

// ---------- B04 현황 ----------
export type SeatStateValue = 'available' | 'occupied' | 'reserved' | 'blocked' | 'unknown'

export interface RoomAvailability {
  roomId: string
  roomAggregate: { totalSeats: number; remainingSeats: number; observedAt: string } | null
  seatStates: { seatId: string; state: SeatStateValue }[]
}

// ---------- B08 추천 결과 ----------
export interface Reason {
  code: string
  featureId: string | null
  text: string
}

export interface RecommendationResult {
  rank: number
  targetType: 'library' | 'room' | 'seat'
  targetId: string
  libraryId: string
  roomId: string
  seatId: string | null
  mapAnchor: (Box & { mapId: string }) | null
  availability: { effectiveState: 'available' | 'unknown' }
  reasons: Reason[]
  warnings: string[]
  previewOnly: boolean
}

export interface Recommendation {
  recommendationId: string
  createdAt: string
  expiresAt: string
  profileRevision: number
  result: {
    executionMode: 'live' | 'preview'
    outcome: 'ranked' | 'noCandidates' | 'noEligibleCandidates'
    results: RecommendationResult[]
    warnings: string[]
  }
  displayNames: Record<string, string> // id → 화면 표시 이름
}

// ---------- B09 이벤트 (eventId, occurredAt은 api가 붙임) ----------
export type RecommendationEvent =
  | { type: 'recommendationExposed'; visibleTargetIds: string[] }
  | { type: 'candidateSelected'; targetId: string; origin: 'recommendation' | 'outsideRecommendations' }
  | { type: 'candidateRejected'; targetId: string; reason: string; excludeFromFuture: boolean }