import { getNickname, type SavedLab } from '../api'
import { describeAnswers } from '../data/options'
import type { PersonaQuestion, PersonaResult } from '../types'
import { BookIcon, SearchIcon } from '../components/icons'
import { BookShelf, Card, PrimaryButton, Screen, SecondaryButton, TextButton } from '../components/ui'

/** 메인: 내 자리 기준 + 실험실 입구 + 자리 추천 */
export default function Home({
  result,
  questions,
  lab,
  onEditAnswers,
  onOpenLab,
  onRecommend,
  onLogout,
}: {
  result: PersonaResult
  questions: PersonaQuestion[]
  lab: SavedLab | null
  onEditAnswers: () => void
  onOpenLab: () => void
  onRecommend: () => void
  onLogout: () => void
}) {
  const nickname = getNickname()
  const answers = describeAnswers(questions, result.seat_preferences ?? {})

  const labDone = lab?.last_status === 'completed' && !!lab.analysis_id
  const labAction = labDone ? '결과 보기' : lab ? '이어서 하기' : '시작하기'
  const labState = labDone ? '분석 완료' : lab ? '진행 중' : null

  return (
    <Screen>
      <div className="flex h-14 items-center justify-between pr-3 pl-5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-teal text-white">
            <BookIcon className="size-4" />
          </div>
          <span className="font-serif text-lg font-bold text-teal-deep">SeatCom</span>
        </div>
        <TextButton tone="muted" onClick={onLogout} className="px-2 text-[13px]">
          로그아웃
        </TextButton>
      </div>

      <div className="flex flex-col gap-1.5 px-5 pt-4">
        <p className="m-0 text-[13px] text-muted">{nickname ? `${nickname}님, 안녕하세요` : '안녕하세요'}</p>
        <h1 className="m-0 font-serif text-[26px] leading-[1.35] font-bold tracking-[-0.01em] text-teal-deep">
          오늘은 어디에
          <br />
          앉아 볼까요?
        </h1>
      </div>

      <div className="mt-6 flex flex-col gap-3 px-5">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[15px] font-bold">내 자리 기준</h2>
            <TextButton onClick={onEditAnswers} className="-my-2 text-[13px]">
              고치기
            </TextButton>
          </div>
          <ul className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0">
            {answers.map((a) => (
              <li key={a.id} title={a.question} className="rounded-full bg-teal-tint/70 px-3 py-1 text-[13px] font-medium text-teal-deep">
                {a.answer}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <h2 className="m-0 text-[15px] font-bold">실험실</h2>
            <span className="rounded-full border border-line-strong px-2 py-0.5 text-[11px] font-medium text-muted">선택</span>
            {labState && <span className="ml-auto text-xs font-medium text-teal">{labState}</span>}
          </div>
          <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-muted">카톡 대화를 보내 주면 AI가 열람 성향을 더 자세히 알아봐요.</p>
          <SecondaryButton size="sm" onClick={onOpenLab} className="mt-3 w-full">
            {labAction}
          </SecondaryButton>
        </Card>
      </div>

      <div className="min-h-8 flex-1" />
      <div className="px-5 pb-5">
        <PrimaryButton onClick={onRecommend} className="w-full">
          <SearchIcon className="size-5" />
          자리 추천받기
        </PrimaryButton>
      </div>
      <BookShelf scale={0.7} />
    </Screen>
  )
}