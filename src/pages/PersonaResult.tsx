import { getNickname } from '../api'
import { describeAnswers } from '../data/options'
import type { PersonaQuestion, PersonaResult as Result } from '../types'
import { Card, Notice, PageHeader, PrimaryButton, Screen, TextButton } from '../components/ui'

/** 페르소나 질문 결과 */
export default function PersonaResult({
  result,
  questions,
  onStart,
  onEdit,
}: {
  result: Result
  questions: PersonaQuestion[]
  onStart: () => void
  onEdit: () => void
}) {
  const nickname = getNickname()
  const rows = describeAnswers(questions, result.seat_preferences ?? {})

  return (
    <Screen className="px-5 pt-10 pb-6">
      <PageHeader eyebrow="결과" title={`${nickname ? `${nickname}님에게` : '나에게'} 맞는 자리 기준을 정리했어요`} />

      {result.seat_recommendation && (
        <Notice className="mt-6 text-[15px]">
          <p className="m-0 mb-1 text-xs font-bold">이런 자리를 먼저 찾아 드릴게요</p>
          {result.seat_recommendation}
        </Notice>
      )}

      <Card className="mt-4 px-4">
        <h2 className="sr-only">내가 고른 답</h2>
        <dl className="m-0 divide-y divide-line">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 py-3.5">
              <dt className="text-[13px] leading-normal text-muted">{r.question}</dt>
              <dd className="m-0 shrink-0 text-[15px] font-bold">{r.answer}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="min-h-6 flex-1" />
      <PrimaryButton onClick={onStart} className="w-full">
        이대로 시작하기
      </PrimaryButton>
      <TextButton onClick={onEdit} className="mt-1 self-center">
        답변 고치기
      </TextButton>
    </Screen>
  )
}