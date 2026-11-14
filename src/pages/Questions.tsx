import { useState } from 'react'
import { QUESTION_UI } from '../data/options'
import type { PreferenceQuestion } from '../types'
import { CardHole, PrimaryButton, Screen, SecondaryButton, Tag, TopBar } from '../components/ui'

export default function Questions({
  questions,
  answers,
  onChange,
  onBack,
  onDone,
}: {
  questions: PreferenceQuestion[] // B12에서 받은 목록
  answers: Record<string, string> // questionId → optionId
  onChange: (next: Record<string, string>) => void
  onBack: () => void
  onDone: () => void
}) {
  const [idx, setIdx] = useState(0)

  // 질문이 하나도 없으면 바로 다음 단계로
  if (questions.length === 0) {
    return (
      <Screen className="items-center justify-center gap-4 px-5">
        <p className="m-0 text-sm text-muted">추가 질문이 없어요.</p>
        <PrimaryButton className="w-full" onClick={onDone}>
          다음
        </PrimaryButton>
      </Screen>
    )
  }

  const q = questions[Math.min(idx, questions.length - 1)]
  const picked = answers[q.questionId]
  const isLast = idx >= questions.length - 1
  const ui = QUESTION_UI[q.questionId]

  return (
    <Screen className="px-5 pt-4 pb-7">
      <TopBar onBack={onBack} step={2} total={3} backLabel="페르소나 선택으로 돌아가기" />

      <div className="mt-[18px] flex items-center justify-between">
        <Tag>STEP 2 · 세부 취향</Tag>
        <div className="flex items-center gap-2.5">
          <div aria-hidden="true" className="flex gap-[5px]">
            {questions.map((item, i) => (
              <div key={item.questionId} className={`size-2 rounded-full ${i <= idx ? 'bg-teal' : 'bg-line'}`} />
            ))}
          </div>
          <span className="text-[13px] font-medium text-muted">
            질문 {idx + 1} / {questions.length}
          </span>
        </div>
      </div>

      <div className="relative mt-5 flex flex-col gap-2.5 rounded-lg border border-label bg-cream px-[22px] pt-[22px] pb-[34px]">
        <span className="self-start rounded border border-label px-2 py-0.5 text-xs tracking-[0.08em] text-wood">
          Q{idx + 1}
        </span>
        <h1 id="question-title" className="m-0 font-serif text-[26px] leading-[1.35] font-bold text-teal-deep">
          {ui?.text ?? q.label}
        </h1>
        {ui?.hint && <p className="m-0 text-[13.5px] leading-normal text-muted">{ui.hint}</p>}
        <CardHole />
      </div>

      <div role="radiogroup" aria-labelledby="question-title" className="mt-4 flex flex-col gap-2.5">
        {q.options.map((o) => {
          const on = picked === o.optionId
          return (
            <button
              key={o.optionId}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange({ ...answers, [q.questionId]: o.optionId })}
              className={`flex min-h-[60px] items-center justify-between rounded-[14px] border-[1.5px] px-[18px] text-left text-base font-medium transition-colors ${
                on ? 'border-teal bg-teal-tint' : 'border-line bg-cream hover:border-label'
              }`}
            >
              <span>{o.label}</span>
              <span
                className={`size-[22px] shrink-0 rounded-full bg-white ${on ? 'border-[7px] border-teal' : 'border-[1.5px] border-label'}`}
              />
            </button>
          )
        })}
      </div>

      <div className="min-h-6 flex-1" />
      <div className="flex gap-2.5">
        {idx > 0 && (
          <SecondaryButton className="flex-1" onClick={() => setIdx(idx - 1)}>
            이전
          </SecondaryButton>
        )}
        <PrimaryButton
          className="flex-[2]"
          disabled={picked === undefined}
          onClick={() => (isLast ? onDone() : setIdx(idx + 1))}
        >
          {isLast ? '답변 완료' : '다음 질문'}
        </PrimaryButton>
      </div>
    </Screen>
  )
}