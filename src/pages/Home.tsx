import { getNickname, type SavedLab } from '../api'
import { describeAnswers } from '../data/options'
import type { HistoryItem, PersonaQuestion, PersonaResult, SelectedRoom } from '../types'
import { BookIcon, BuildingIcon, ChevronIcon, ClockIcon, SearchIcon, SlidersIcon } from '../components/icons'
import { BookShelf, Card, PrimaryButton, RoomTitle, Screen, SecondaryButton, TextButton } from '../components/ui'

const timeText = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

/** 메인: 오늘 갈 열람실 + 이용 중 자리 + 내 자리 기준 + 실험실 입구 + 자리 추천 */
export default function Home({
  result,
  questions,
  lab,
  room,
  current,
  recent,
  onEditAnswers,
  onOpenLab,
  onRecommend,
  onPickLibrary,
  onPreferences,
  onHistory,
  onAccount,
  onLogout,
}: {
  result: PersonaResult
  questions: PersonaQuestion[]
  lab: SavedLab | null
  room: SelectedRoom | null
  current: HistoryItem | null
  recent: HistoryItem[]
  onEditAnswers: () => void
  onOpenLab: () => void
  onRecommend: () => void
  onPickLibrary: () => void
  onPreferences: () => void
  onHistory: () => void
  onAccount: () => void
  onLogout: () => void
}) {
  const nickname = getNickname()
  const answers = describeAnswers(questions, result.seat_preferences ?? {})

  const labDone = lab?.last_status === 'completed' && !!lab.analysis_id
  const labAction = labDone ? '결과 보기' : lab ? '이어서 하기' : '시작하기'
  const labState = labDone ? '분석 완료' : lab ? '진행 중' : null

  return (
    <Screen wide>
      <div className="flex h-14 items-center justify-between pr-3 pl-5 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-teal text-white">
            <BookIcon className="size-4" />
          </div>
          <span className="font-serif text-lg font-bold text-teal-deep">SeatCom</span>
        </div>
        <div className="flex items-center">
          <TextButton tone="muted" onClick={onAccount} className="px-2 text-[13px]">
            내 계정
          </TextButton>
          <TextButton tone="muted" onClick={onLogout} className="px-2 text-[13px]">
            로그아웃
          </TextButton>
        </div>
      </div>

      {/* 인사 + (데스크톱) 바로 추천 */}
      <div className="lg:mx-0 lg:flex lg:items-end lg:justify-between lg:gap-8 lg:rounded-3xl lg:bg-teal-deep lg:px-10 lg:py-9 lg:text-white">
        <div className="flex flex-col gap-1.5 px-5 pt-4 lg:p-0">
          <p className="m-0 text-[13px] text-muted lg:text-sm lg:text-teal-tint">{nickname ? `${nickname}님, 안녕하세요` : '안녕하세요'}</p>
          <h1 className="m-0 font-serif text-[26px] leading-[1.35] font-bold tracking-[-0.01em] text-teal-deep lg:text-[34px] lg:text-white">
            오늘은 어디에
            <br className="lg:hidden" /> 앉아 볼까요?
          </h1>
          {room && (
            <p className="m-0 hidden text-[15px] text-teal-tint lg:block">
              {room.libraryName} · {room.roomName}에서 지금 빈자리 중에 골라 드릴게요.
            </p>
          )}
        </div>
        <div className="hidden shrink-0 gap-2 lg:flex">
          <button
            type="button"
            onClick={onPickLibrary}
            className="h-13 rounded-xl border border-white/30 px-5 text-base font-bold text-white transition-colors hover:bg-white/10"
          >
            열람실 바꾸기
          </button>
          <button
            type="button"
            onClick={onRecommend}
            className="flex h-13 items-center gap-2 rounded-xl bg-cream px-6 text-base font-bold text-teal-deep transition-colors hover:bg-white"
          >
            <SearchIcon className="size-5" />
            자리 추천받기
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 px-5 lg:grid lg:grid-cols-3 lg:gap-4 lg:px-0">
        {/* 이용 중 */}
        {current && (
          <button type="button" onClick={onHistory} className="text-left lg:col-span-3">
            <Card className="flex items-center gap-3 border-teal bg-teal-tint/50 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal text-white">
                <ClockIcon className="size-5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-xs font-bold text-teal">지금 이용 중</span>
                <RoomTitle
                  roomName={current.seatName}
                  libraryName={current.libraryName}
                  roomClassName="font-serif text-[17px] font-bold text-teal-deep"
                />
                <span className="truncate text-xs text-muted">{timeText(current.selectedAt)}부터</span>
              </div>
              <ChevronIcon className="size-5 text-muted" />
            </Card>
          </button>
        )}

        {/* 오늘 갈 열람실 */}
        <Card className="p-4 lg:p-5">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[15px] font-bold">오늘 갈 열람실</h2>
            <TextButton onClick={onPickLibrary} className="-my-2 text-[13px]">
              {room ? '바꾸기' : '고르기'}
            </TextButton>
          </div>
          {room ? (
            <div className="mt-2 flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-wood-tint text-wood">
                <BuildingIcon className="size-5" />
              </span>
              <RoomTitle roomName={room.roomName} libraryName={room.libraryName} className="flex-1" />
            </div>
          ) : (
            <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-muted">
              11개 도서관 중 오늘 갈 곳을 먼저 골라 주세요. 그 열람실의 빈자리 중에서 골라 드려요.
            </p>
          )}
        </Card>

        {/* 내 자리 기준 */}
        <Card className="p-4 lg:p-5">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[15px] font-bold">내 자리 기준</h2>
            <TextButton onClick={onEditAnswers} className="-my-2 text-[13px]">
              고치기
            </TextButton>
          </div>
          <ul className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0">
            {answers.map((a) => (
              <li
                key={a.id}
                title={`${a.question} → ${a.answer}`}
                className="rounded-full bg-teal-tint/70 px-3 py-1 text-[13px] font-medium text-teal-deep"
              >
                {a.chip}
              </li>
            ))}
          </ul>
          <TextButton onClick={onPreferences} className="mt-1 -mb-2 text-[13px]">
            <SlidersIcon className="mr-1 size-4" />
            취향 더 자세히 정하기
          </TextButton>
        </Card>

        {/* 실험실 */}
        <Card className="p-4 lg:p-5">
          <div className="flex items-center gap-2">
            <h2 className="m-0 text-[15px] font-bold">실험실</h2>
            <span className="rounded-full border border-line-strong px-2 py-0.5 text-[11px] font-medium text-muted">선택</span>
            {labState && <span className="ml-auto text-xs font-medium text-teal">{labState}</span>}
          </div>
          <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-muted">카톡 대화 파일을 올리면 AI가 열람 성향을 더 자세히 알아봐요.</p>
          <SecondaryButton size="sm" onClick={onOpenLab} className="mt-3 w-full">
            {labAction}
          </SecondaryButton>
        </Card>

        {/* 최근 이용(데스크톱) / 이용 기록 링크(모바일) */}
        <Card className="hidden p-5 lg:col-span-3 lg:block">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[15px] font-bold">최근 이용</h2>
            <TextButton onClick={onHistory} className="-my-2 text-[13px]">
              전체 보기
            </TextButton>
          </div>
          {recent.length === 0 ? (
            <p className="m-0 mt-2 text-sm text-muted">아직 고른 자리가 없어요. 자리를 고를수록 추천이 내 취향에 맞춰져요.</p>
          ) : (
            <ul className="m-0 mt-3 grid list-none grid-cols-2 gap-3 p-0 xl:grid-cols-4">
              {recent.slice(0, 4).map((h) => (
                <li key={h.selectionId} className="flex flex-col gap-0.5 rounded-xl bg-paper px-4 py-3">
                  <span className="truncate text-sm font-semibold text-ink-2">{h.libraryName}</span>
                  <span className="truncate text-sm font-bold">{h.seatName}</span>
                  <span className="text-xs text-muted">{timeText(h.selectedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <button type="button" onClick={onHistory} className="text-left lg:hidden">
          <Card className="flex items-center justify-between p-4">
            <div className="flex flex-col">
              <h2 className="m-0 text-[15px] font-bold">이용 기록</h2>
              <span className="text-[13px] text-muted">{recent.length > 0 ? `최근 ${recent[0].seatName}` : '고른 자리와 내 취향 분석'}</span>
            </div>
            <ChevronIcon className="size-5 text-muted" />
          </Card>
        </button>
      </div>

      <div className="min-h-8 flex-1 lg:hidden" />
      <div className="px-5 pb-5 lg:hidden">
        <PrimaryButton onClick={room ? onRecommend : onPickLibrary} className="w-full">
          <SearchIcon className="size-5" />
          {room ? '자리 추천받기' : '도서관 고르기'}
        </PrimaryButton>
      </div>
      <div className="lg:hidden">
        <BookShelf scale={0.7} />
      </div>
    </Screen>
  )
}
