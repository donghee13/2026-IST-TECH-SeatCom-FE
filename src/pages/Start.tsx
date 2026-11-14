import { PERSONAS, QUESTIONS } from '../data/options'
import type { Preferences } from '../types'
import { SearchIcon } from '../components/icons'
import { BookShelf, DateStamp, PrimaryButton, Screen, Sub, Tag, Title, TopBar } from '../components/ui'

export default function Start({
  prefs,
  onBack,
  onEdit,
  onStart,
}: {
  prefs: Preferences
  onBack: () => void
  onEdit: () => void
  onStart: () => void
}) {
  const personaText = PERSONAS.filter((p) => prefs.personas.includes(p.id))
    .map((p) => p.name)
    .join(' · ')

  const rows: { label: string; value: string }[] = [
    { label: '열람 타입', value: personaText || '선택 안 함' },
    ...QUESTIONS.map((q) => {
      const a = prefs.answers[q.id]
      return { label: q.short, value: a === undefined ? '-' : q.options[a] }
    }),
  ]

  return (
    <Screen className="px-5 pt-4 pb-7">
      <TopBar onBack={onBack} step={3} total={3} backLabel="질문으로 돌아가기" />

      <div className="mt-[18px] flex flex-col gap-2">
        <Tag>STEP 3 · 확인</Tag>
        <Title>추천 준비가 끝났어요</Title>
        <Sub>아래 기준으로 지금 비어 있는 자리를 찾아볼게요.</Sub>
      </div>

      <div className="mt-7 -mx-1.5">
        <BookShelf scale={0.52} count={8} withShelf={false} />
      </div>

      <section aria-labelledby="slip-title" className="rounded-md border border-label bg-cream px-5 pt-5 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] tracking-[0.14em] text-wood">SEAT REQUEST</span>
            <h2 id="slip-title" className="m-0 font-serif text-lg font-bold text-teal-deep">
              열람 신청서
            </h2>
          </div>
          <DateStamp />
        </div>
        <dl className="m-0 mt-3.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between border-t border-dashed border-line-strong py-3">
              <dt className="text-[13px] text-muted">{r.label}</dt>
              <dd className="m-0 text-sm font-bold">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <button
        type="button"
        onClick={onEdit}
        className="mt-1.5 min-h-11 self-center text-sm font-medium text-wood underline underline-offset-2"
      >
        기준 수정하기
      </button>

      <div className="min-h-6 flex-1" />
      <PrimaryButton onClick={onStart} className="h-14 text-[17px]">
        <SearchIcon className="size-5" />
        추천 시작
      </PrimaryButton>
    </Screen>
  )
}