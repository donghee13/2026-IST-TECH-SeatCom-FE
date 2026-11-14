import { PERSONAS } from '../data/options'
import type { PersonaId } from '../types'
import { CheckIcon } from '../components/icons'
import { PrimaryButton, Screen, Sub, Tag, Title, TopBar } from '../components/ui'

export default function Persona({
  selected,
  onChange,
  onBack,
  onNext,
}: {
  selected: PersonaId[]
  onChange: (next: PersonaId[]) => void
  onBack: () => void
  onNext: () => void
}) {
  const toggle = (id: PersonaId) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  return (
    <Screen className="px-5 pt-4 pb-7">
      <TopBar onBack={onBack} step={1} total={3} />

      <div className="mt-[18px] flex flex-col gap-2">
        <Tag>STEP 1 · 열람 타입</Tag>
        <Title>어떤 열람실 타입인가요?</Title>
        <Sub>여러 개 골라도 괜찮아요. 처음 추천의 기준이 돼요.</Sub>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {PERSONAS.map((p) => {
          const on = selected.includes(p.id)
          const Icon = p.icon
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(p.id)}
              className={`relative flex min-h-[148px] flex-col items-start gap-2 rounded-[14px] border-[1.5px] p-4 text-left transition-colors ${
                on ? 'border-teal bg-teal-tint' : 'border-line bg-cream hover:border-label'
              }`}
            >
              <span
                className={`flex size-10 items-center justify-center rounded-[10px] ${on ? 'bg-teal text-white' : 'bg-wood-tint text-wood'}`}
              >
                <Icon className="size-[22px]" />
              </span>
              <span className="text-base font-bold">{p.name}</span>
              <span className="text-[12.5px] leading-[1.45] text-muted">{p.desc}</span>
              {on && (
                <span className="absolute top-3 right-3 flex size-[22px] items-center justify-center rounded-full bg-teal text-white">
                  <CheckIcon className="size-3.5" strokeWidth={2.6} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="min-h-6 flex-1" />
      <p className="m-0 mb-2.5 text-center text-[13px] text-muted">
        {selected.length > 0 ? `${selected.length}개 선택됨` : '하나 이상 골라주세요'}
      </p>
      <PrimaryButton onClick={onNext} disabled={selected.length === 0}>
        다음
      </PrimaryButton>
    </Screen>
  )
}