/**
 * 화면에 쓰는 고정 문구 모음.
 * 질문과 선택지는 백엔드(GET /persona/questions)에서 받아요.
 */
import type { PersonaQuestion } from '../types'

/** 고른 답(value)을 화면 문구(label)로 바꿔서 [{질문, 답}] 목록으로 */
export function describeAnswers(questions: PersonaQuestion[], prefs: Record<string, string | null>) {
  return questions.map((q) => {
    const value = prefs[q.id]
    const label = q.options.find((o) => o.value === value)?.label ?? value ?? '-'
    return { id: q.id, question: q.question, answer: label }
  })
}

/** 카톡 대화 내보내기 순서 (메뉴 이름은 카톡 버전마다 다를 수 있음) */
export const EXPORT_STEPS: Record<'android' | 'ios', string[]> = {
  android: [
    '카카오톡에서 분석할 대화방에 들어가요',
    '오른쪽 위 메뉴(≡) → 설정(톱니바퀴)을 눌러요',
    '대화 내용 내보내기를 눌러요',
    '텍스트만 보내기를 고르고, 공유 앱에서 Gmail을 골라요',
  ],
  ios: [
    '카카오톡에서 분석할 대화방에 들어가요',
    '오른쪽 위 메뉴(≡) → 설정(톱니바퀴)을 눌러요',
    '대화 내용 내보내기를 눌러요',
    '텍스트 메시지만 보내기를 고르고, 공유 앱에서 Gmail을 골라요',
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

export const REJECT_REASONS = [
  '너무 추울 것 같아요',
  '콘센트가 없어요',
  '시끄러울 것 같아요',
  '창가가 아니에요',
  '입구에서 너무 멀어요',
  '그냥 마음에 안 들어요',
]