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
export type LabStatusValue = 'waiting_upload' | 'analyzing' | 'completed' | 'failed' | 'expired' | 'cancelled'

/** POST /lab/sessions 응답 */
export interface LabSession {
  upload_id: string
  target_name: string
  status: LabStatusValue
  upload_url?: string
  max_bytes?: number
  expires_at?: string
  poll_interval_seconds?: number
}

/** GET /lab/sessions/{upload_id}/status 응답 (POST .../file 응답도 같은 모양) */
export interface LabStatus {
  upload_id: string
  status: LabStatusValue
  file_received: boolean
  analysis: { analysis_id: string | null; status: string; model?: string; started_at?: string | null }
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
  deskType?: string
  tags?: string[]
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
  displayName?: string
  libraryName?: string
  roomName?: string
  laptopAllowed?: boolean
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
  room?: RoomSummary
  model?: { version: string; historySessions: number; profileSources: string[]; availabilitySource: string }
}

export type RecommendationEvent =
  | { type: 'recommendationExposed'; visibleTargetIds: string[] }
  | { type: 'candidateSelected'; targetId: string; origin: 'recommendation' | 'outsideRecommendations' }
  | { type: 'candidateRejected'; targetId: string; reason: string; excludeFromFuture: boolean }
  | { type: 'useConfirmed'; targetId: string }
  | { type: 'useEnded'; targetId: string }
  | { type: 'ratingSubmitted'; targetId: string; rating: number; comment?: string }
// ---------- 도서관·열람실 ----------
export interface OpeningToday {
  today: string | null
  openNow: boolean
  closedToday: boolean
  virtual: boolean
}

export interface LibrarySummary {
  libraryId: string
  name: string
  address: string | null
  region: string
  roomCount: number
  totalSeats: number
  remainingSeats: number
  openNow: boolean
  todayHours: string | null
  laptopRooms: number
}

export interface RoomSummary {
  roomId: string
  libraryId: string
  name: string
  floor: string | null
  totalSeats: number
  remainingSeats: number
  laptopAllowed: boolean
  laptopRuleSource: 'official' | 'virtual'
  hours: OpeningToday
  seatRecommendation: boolean
}

/** 사용자가 고른 열람실(브라우저에 저장) */
export interface SelectedRoom {
  roomId: string
  libraryId: string
  libraryName: string
  roomName: string
}

export interface RoomRecommendationResult {
  rank: number
  targetType: 'room'
  roomId: string
  libraryId: string
  libraryName: string
  roomName: string
  score: number
  reasons: Reason[]
  room: RoomSummary
  bestSeats: { seatId: string; name: string }[]
}

export interface RoomRecommendation {
  outcome: 'ranked' | 'noCandidates'
  results: RoomRecommendationResult[]
  profileSources: string[]
  warnings: string[]
}

// ---------- 내 취향 ----------
export interface PreferenceChoice {
  value: string
  label: string
}

export interface PreferenceCatalogItem {
  featureId: string
  label: string
  choices: PreferenceChoice[]
}

export interface PreferenceItem {
  featureId: string
  choice: string
  importance: 1 | 2 | 3
}

export interface Preferences {
  revision: number
  updatedAt: string | null
  items: PreferenceItem[]
  laptopRequired: boolean | null
  catalog: PreferenceCatalogItem[]
  effective: {
    sources: string[]
    laptopRequired: boolean
    preferences: { featureId: string; label: string; target: number; importance: number; source: string }[]
  }
}

export interface InsightItem {
  featureId: string
  label: string
  direction: 'high' | 'low'
  z: number
  confidence: number
  status: 'learned' | 'neutral' | 'insufficientData'
  summary: string
  evidence: { observations: number; chosenRate: number; availableRate: number; higherCount: number }
  text: string
}

export interface Insights {
  historySessions: number
  modelVersion: string | null
  items: InsightItem[]
  profileSources: string[]
  note: string
}

// ---------- 이용 기록 ----------
export interface HistoryItem {
  selectionId: number
  recommendationId: string
  seatId: string
  seatName: string
  roomId: string
  roomName: string
  libraryId: string
  libraryName: string
  origin: 'recommendation' | 'outsideRecommendations'
  selectedAt: string
  confirmedAt: string | null
  endedAt: string | null
  rating: number | null
  status: 'active' | 'ended' | 'expired'
  holdUntil: string | null
}

export interface History {
  current: HistoryItem | null
  items: HistoryItem[]
  total: number
}

// ---------- 평면도·좌석 설명 ----------
export interface PxBox {
  x: number
  y: number
  width: number
  height: number
}
export type Pt = [number, number]

export interface EdgeMarker {
  point: Pt
  outside: boolean
  direction: [number, number]
  wall?: string
  real: boolean
}

export interface RoomFloor {
  roomId: string
  mapId: string
  width: number
  height: number
  roomBounds: PxBox
  pxPerMeter: number
  seats: { seatId: string; label: string; box: PxBox; deskGroup: number; partition: boolean; deskOutlet: boolean }[]
  deskGroups: { id: number; deskType: string; deskTypeLabel: string; box: PxBox; seatIds: string[]; partition: boolean; deskOutlet: boolean; size: string }[]
  windows: { line: [Pt, Pt]; wall: string; blindClosed: boolean; view: string }[]
  airConditioners: { point: Pt; kind: string; direction: [number, number] | null; reachPx: number; strength: number; strengthWord: string }[]
  lights: { point: Pt; dim: boolean }[]
  outlets: { point: Pt; kind: string }[]
  entrances: EdgeMarker[]
  toilets: EdgeMarker[]
  libraryName: string
  roomName: string
  laptopAllowed: boolean
  hours: OpeningToday
  virtual: boolean
}

export interface SeatFact {
  key: string
  icon: string
  title: string
  value: string
  detail: string
  level: number | null
  featureId: string | null
}

export interface SeatExplanation {
  seatId: string
  name: string
  roomId: string
  roomName: string
  libraryName: string
  rank: number | null
  recommended: boolean
  available: boolean
  summary: string
  reasons: { text: string; source: string; because: string; featureId?: string }[]
  cautions: string[]
  matches: { featureId: string; name: string; want: string; seat: string; verdict: 'good' | 'ok' | 'bad'; because: string }[]
  facts: SeatFact[]
  nearby: { type: string; text: string }[]
  room: { laptopAllowed: boolean; hours: OpeningToday | null; deskType: string }
  learning: { historySessions: number; text: string }
  virtual: string
}
