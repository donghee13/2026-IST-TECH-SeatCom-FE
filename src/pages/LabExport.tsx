import { useState } from 'react'
import { EXPORT_STEPS } from '../data/options'
import LabHeader from '../components/LabHeader'
import { buttonClass, Card, PageHeader, PrimaryButton, Screen } from '../components/ui'

const guessOs = (): 'android' | 'ios' => (/iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'android')

/** 1단계: 카톡 대화를 텍스트로 내보내는 방법 */
export default function LabExport({
  onBack,
  onLater,
  onNext,
}: {
  onBack: () => void
  onLater: () => void
  onNext: () => void
}) {
  const [os, setOs] = useState<'android' | 'ios'>(guessOs)
  const steps = EXPORT_STEPS[os]

  return (
    <Screen className="px-5 pt-3 pb-6">
      <LabHeader step={1} onBack={onBack} onLater={onLater} />

      <PageHeader className="mt-5" eyebrow="대화 내보내기" title="분석할 대화방을 텍스트로 내보내요" />

      <div role="tablist" aria-label="휴대폰 종류" className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-line/60 p-1">
        {(['android', 'ios'] as const).map((key) => {
          const on = os === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setOs(key)}
              className={`h-10 rounded-[10px] text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:outline-none ${
                on ? 'bg-white text-teal-deep shadow-sm' : 'text-muted hover:text-ink-2'
              }`}
            >
              {key === 'android' ? 'Android' : 'iPhone'}
            </button>
          )
        })}
      </div>

      <Card className="mt-4 p-4">
        <ol className="m-0 flex list-none flex-col gap-4 p-0">
          {steps.map((text, i) => (
            <li key={text} className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-teal text-xs font-bold text-white tabular-nums">
                {i + 1}
              </span>
              <span className="pt-0.5 text-[15px] leading-normal">{text}</span>
            </li>
          ))}
        </ol>
      </Card>

      <p className="m-0 mt-3 text-[13px] leading-relaxed text-muted">메뉴 이름은 카톡 버전마다 조금 다를 수 있어요.</p>

      <div className="min-h-6 flex-1" />
      <div className="flex gap-2">
        <a href="kakaotalk://" className={`${buttonClass('secondary')} flex-1 text-[15px]`}>
          카카오톡 열기
        </a>
        <PrimaryButton className="flex-[1.4]" onClick={onNext}>
          내보냈어요
        </PrimaryButton>
      </div>
    </Screen>
  )
}