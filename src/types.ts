// 백엔드 명세 v2.1 (FastAPI)에 맞춘 데이터 모양
// 명세에 응답 모양이 없어서 v2.0 문서의 응답 예시를 기준으로 했어요.

// ---------- 페르소나 4문항 ----------
export interface PersonaOption {
  label: string // 화면 문구, 예: "꼭 필요해요"
  value: string // 서버로 보내는 값, 예: "required"
}

export interface PersonaQuestion {
  id: string // question_id
  order: number
  question: string
  options: PersonaOption[]
}

export interface PersonaQuestionsResponse {
  version?: string
  required_count?: number
  questions: PersonaQuestion[]
}

/** PUT /persona/answers/{question_id} 응답 */
export interface SaveAnswerResponse {
  question_id: string
  answer: string
  saved: boolean
  answered_count: number
  required_count: number
  can_analyze: boolean
}

/** GET /persona/answers 응답. 답하지 않은 질문은 null */
export interface SavedAnswersResponse {
  answers: Record<string, string | null>
  answered_count: number
  required_count: number
  can_analyze: boolean
}

/** POST /persona/analyze, GET /persona/result 응답 */
export interface PersonaResult {
  analysis_id: string
  analysis_method: string
  status: string // completed
  seat_preferences: Record<string, string | null>
  seat_recommendation?: string | null
  source?: string
  completed_at?: string
}

// ---------- 실험실 (카톡 분석) ----------
export type LabStatusValue =
  | 'waiting_email'
  | 'verifying_identity'
  | 'verified'
  | 'analyzing'
  | 'completed'
  | 'rejected'
  | 'failed'
  | 'expired'

/** POST /lab/sessions 응답 */
export interface LabSession {
  upload_id: string
  upload_code: string
  recipient_email: string
  mail_subject: string
  target_name: string
  status: LabStatusValue
  expires_at?: string
  poll_interval_seconds?: number
}

/** GET /lab/sessions/{upload_id}/status 응답 */
export interface LabStatus {
  upload_id: string
  status: LabStatusValue
  email_received: boolean
  filename?: string | null
  identity: { matched: boolean | null; verification: string; result?: string }
  analysis: { analysis_id: string | null; status: string; model?: string }
  message?: string
  error?: { code: string; message: string }
}

export interface LabPreference {
  preference: string // unknown이면 판단 불가
  confidence: number // 0~1
  inference_type: string // explicit, contextual, hypothesis, unknown
  reason: string
}

/** GET /lab/analyses/{analysis_id} 응답 */
export interface LabAnalysis {
  analysis_id: string
  analysis_method: string
  status: string
  source?: string
  analysis: {
    participant_id?: string
    behavioral_summary?: string
    preferences: Record<string, LabPreference>
    evidence?: { feature: string; message_id?: string; reason: string }[]
    seat_recommendation?: string
    follow_up_question?: string | null
  }
  completed_at?: string
}

// ---------- 좌석 추천 (v2.1 명세에는 없음. 백엔드가 다시 만들면 연결) ----------
export interface Box {
  x: number
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
  type: string
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

export type SeatStateValue = 'available' | 'occupied' | 'reserved' | 'blocked' | 'unknown'

export interface RoomAvailability {
  roomId: string
  roomAggregate: { totalSeats: number; remainingSeats: number; observedAt: string } | null
  seatStates: { seatId: string; state: SeatStateValue }[]
}

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
  displayNames: Record<string, string>
}

export type RecommendationEvent =
  | { type: 'recommendationExposed'; visibleTargetIds: string[] }
  | { type: 'candidateSelected'; targetId: string; origin: 'recommendation' | 'outsideRecommendations' }
  | { type: 'candidateRejected'; targetId: string; reason: string; excludeFromFuture: boolean }