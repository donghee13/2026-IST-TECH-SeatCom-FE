/**
 * 선택지 자체(ID, 이름)는 백엔드 B12에서 받아요.
 * 여기에는 화면을 꾸미는 데만 쓰는 아이콘·설명·질문 문장을 ID별로 둬요.
 * 백엔드가 모르는 ID를 보내도 화면은 기본값으로 그려져요.
 */
import type { ComponentType, SVGProps } from 'react'
import { BookIcon, ClockIcon, CornerIcon, HourglassIcon, LaptopIcon, TargetIcon, WindowIcon } from '../components/icons'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

export const PERSONA_UI: Record<string, { icon: Icon; desc: string }> = {
  laptop: { icon: LaptopIcon, desc: '넓은 책상과 콘센트가 있는 자리' },
  focus: { icon: TargetIcon, desc: '조용하고 시선이 덜 닿는 자리' },
  window: { icon: WindowIcon, desc: '햇빛이 들어오는 창가 쪽 자리' },
  quick: { icon: ClockIcon, desc: '짧게 머물고 드나들기 편한 자리' },
  corner: { icon: CornerIcon, desc: '벽을 등지는 안쪽 자리' },
  longStay: { icon: HourglassIcon, desc: '오래 앉아 있어도 편한 자리' },
}
export const DEFAULT_PERSONA_ICON: Icon = BookIcon

export const QUESTION_UI: Record<string, { text: string; hint: string }> = {
  temperature: { text: '추위나 더위를 많이 타나요?', hint: '에어컨이나 창문과의 거리를 정할 때 반영해요.' },
  outlet: { text: '콘센트가 꼭 필요한가요?', hint: '콘센트가 있는 책상을 얼마나 앞에 둘지 정해요.' },
  noise: { text: '오가는 소리가 신경 쓰이나요?', hint: '출입문, 통로와의 거리에 반영해요.' },
  stay: { text: '얼마나 머물 예정인가요?', hint: '드나들기 편한 자리인지에 반영해요.' },
}

export const REJECT_REASONS = [
  '너무 추울 것 같아요',
  '콘센트가 없어요',
  '시끄러울 것 같아요',
  '창가가 아니에요',
  '입구에서 너무 멀어요',
  '그냥 마음에 안 들어요',
]