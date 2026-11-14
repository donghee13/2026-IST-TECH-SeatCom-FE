import type { ComponentType, SVGProps } from 'react'
import type { PersonaId, QuestionId } from '../types'
import { ClockIcon, CornerIcon, HourglassIcon, LaptopIcon, TargetIcon, WindowIcon } from '../components/icons'

export interface Persona {
  id: PersonaId
  name: string
  desc: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const PERSONAS: Persona[] = [
  { id: 'laptop', name: '노트북파', desc: '넓은 책상과 콘센트가 있는 자리', icon: LaptopIcon },
  { id: 'focus', name: '집중파', desc: '조용하고 시선이 덜 닿는 자리', icon: TargetIcon },
  { id: 'window', name: '창가파', desc: '햇빛이 들어오는 창가 쪽 자리', icon: WindowIcon },
  { id: 'short', name: '잠깐파', desc: '짧게 머물고 드나들기 편한 자리', icon: ClockIcon },
  { id: 'corner', name: '구석파', desc: '벽을 등지는 안쪽 자리', icon: CornerIcon },
  { id: 'long', name: '장시간파', desc: '오래 앉아 있어도 편한 자리', icon: HourglassIcon },
]

export interface Question {
  id: QuestionId
  no: string
  short: string // 요약 화면에 쓰는 짧은 이름
  text: string
  hint: string
  options: string[]
}

export const QUESTIONS: Question[] = [
  {
    id: 'cold',
    no: 'Q1',
    short: '추위',
    text: '추위를 많이 타나요?',
    hint: '에어컨이나 창문과의 거리를 정할 때 반영해요.',
    options: ['많이 타요', '보통이에요', '더위를 더 타요'],
  },
  {
    id: 'plug',
    no: 'Q2',
    short: '콘센트',
    text: '콘센트가 꼭 필요한가요?',
    hint: '콘센트가 있는 책상을 얼마나 앞에 둘지 정해요.',
    options: ['꼭 필요해요', '있으면 좋아요', '없어도 돼요'],
  },
  {
    id: 'noise',
    no: 'Q3',
    short: '오가는 소리',
    text: '오가는 소리가 신경 쓰이나요?',
    hint: '출입문, 통로와의 거리에 반영해요.',
    options: ['많이 쓰여요', '조금 쓰여요', '괜찮아요'],
  },
  {
    id: 'stay',
    no: 'Q4',
    short: '머무는 시간',
    text: '얼마나 머물 예정인가요?',
    hint: '드나들기 편한 자리인지에 반영해요.',
    options: ['1시간 이내', '2~3시간', '반나절 이상'],
  },
]

export const REJECT_REASONS = [
  '너무 추울 것 같아요',
  '콘센트가 없어요',
  '시끄러울 것 같아요',
  '창가가 아니에요',
  '입구에서 너무 멀어요',
  '그냥 마음에 안 들어요',
]