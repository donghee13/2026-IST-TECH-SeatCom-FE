/**
 * 화면에 쓰는 고정 문구 모음.
 * 질문과 선택지는 백엔드(GET /persona/questions)에서 받아요.
 */
import type { PersonaQuestion } from '../types'

/** 설문 답을 한눈에 읽히는 칩 문구로 (예: '네' → '콘센트 필요') */
const ANSWER_CHIP: Record<string, Record<string, string>> = {
  outlet: { required: '콘센트·노트북 필요', not_required: '콘센트 없어도 괜찮아요' },
  hvac_proximity: { near: '에어컨 가까이', not_near: '에어컨에서 멀리', no_preference: '에어컨 상관없음' },
  noise_sensitivity: { high: '소음에 많이 민감', low: '소음에 조금 민감', none: '소음 괜찮아요' },
  partition: { yes: '칸막이 있는 자리', no: '트인 자리', no_preference: '칸막이 상관없음' },
}

/** 고른 답(value)을 화면 문구(label)로 바꿔서 [{질문, 답, 칩 문구}] 목록으로 */
export function describeAnswers(questions: PersonaQuestion[], prefs: Record<string, string | null>) {
  return questions.map((q) => {
    const value = prefs[q.id]
    const label = q.options.find((o) => o.value === value)?.label ?? value ?? '-'
    const chip = (value && ANSWER_CHIP[q.id]?.[value]) || `${q.question.replace(/\?.*$/, '')}: ${label}`
    return { id: q.id, question: q.question, answer: label, chip }
  })
}

/** 카톡 대화 내보내기 순서 (메뉴 이름은 카톡 버전마다 다를 수 있음) */
export const EXPORT_STEPS: Record<'android' | 'ios', string[]> = {
  android: [
    '카카오톡에서 분석할 대화방에 들어가요',
    '오른쪽 위 메뉴(≡) → 설정(톱니바퀴)을 눌러요',
    '대화 내용 내보내기를 눌러요',
    '텍스트만 보내기를 고르고, 공유 화면에서 \'내 파일\'(기기에 저장)을 골라요',
  ],
  ios: [
    '카카오톡에서 분석할 대화방에 들어가요',
    '오른쪽 위 메뉴(≡) → 설정(톱니바퀴)을 눌러요',
    '대화 내용 내보내기를 눌러요',
    '텍스트 메시지만 보내기를 고르고, 공유 화면에서 \'파일에 저장\'을 골라요',
  ],
}

/** 카톡 분석 결과의 항목 이름 (GET /lab/analyses 의 preferences 키) */
export const LAB_FEATURE_LABEL: Record<string, string> = {
  laptop_usage: '노트북',
  outlet: '콘센트',
  air_conditioning: '냉난방',
  lighting: '밝기',
  desk: '책상 크기',
  view: '창가',
  restroom: '화장실',
}

/** 카톡 분석 결과 값의 화면 문구 */
export const LAB_VALUE_LABEL: Record<string, string> = {
  yes: '사용해요',
  no: '안 써요',
  required: '꼭 필요해요',
  not_required: '없어도 돼요',
  near: '가까운 곳',
  bright: '밝은 곳',
  dim: '은은한 곳',
  soft: '은은한 곳',
  large: '넓은 책상',
  compact: '아담한 책상',
  window: '창가',
  cool: '시원한 곳',
  warm: '따뜻한 곳',
  high: '바람이 닿는 곳',
  low: '바람이 덜 닿는 곳',
  no_preference: '상관없음',
}

/** '별로예요' 이유. 고르면 다음 추천부터 그 방향으로 취향을 바로 보정해요(그냥 마음에 안 들어요는 제외만) */
export const REJECT_REASONS = [
  '너무 추울 것 같아요',
  '너무 더울 것 같아요',
  '콘센트가 없어요',
  '시끄러울 것 같아요',
  '창가가 아니에요',
  '칸막이가 없어요',
  '너무 어두워요',
  '너무 밝아요',
  '책상이 좁아요',
  '입구에서 너무 멀어요',
  '그냥 마음에 안 들어요',
]

/** 취향 정보 출처 이름 */
export const SOURCE_LABEL: Record<string, string> = {
  persona: '4문항 설문',
  kakao_lab: '카톡 분석',
  explicit: '직접 설정',
}