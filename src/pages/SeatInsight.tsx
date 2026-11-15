import { useEffect, useState, type ReactNode } from 'react'
import { getSeatExplanation } from '../api'
import type { RoomFloor, SeatExplanation, SeatStateValue } from '../types'
import FloorPlan from '../components/FloorPlan'
import {
  BoltIcon,
  BookIcon,
  CheckIcon,
  DeskIcon,
  DoorIcon,
  EyeIcon,
  LaptopIcon,
  PartitionIcon,
  SunIcon,
  ThermoIcon,
  ToiletIcon,
  UsersIcon,
  VolumeIcon,
  WindIcon,
  WindowIcon,
} from '../components/icons'
import { Card, ErrorText, Notice, PrimaryButton, Screen, SecondaryButton, Spinner, TopBar } from '../components/ui'

const FACT_ICON: Record<string, (p: { className?: string }) => ReactNode> = {
  desk: DeskIcon,
  partition: PartitionIcon,
  outlet: BoltIcon,
  window: WindowIcon,
  light: SunIcon,
  air: WindIcon,
  temp: ThermoIcon,
  noise: VolumeIcon,
  entrance: DoorIcon,
  toilet: ToiletIcon,
  view: EyeIcon,
  laptop: LaptopIcon,
  people: UsersIcon,
}

const SOURCE: Record<string, { label: string; cls: string }> = {
  explicit: { label: '직접 정한 취향', cls: 'bg-teal text-white' },
  persona: { label: '설문', cls: 'bg-teal-tint text-teal-deep' },
  kakao_lab: { label: '카톡 분석', cls: 'bg-[#E3D3E0] text-[#5B4A7A]' },
  history: { label: '앉은 기록', cls: 'bg-wood-tint text-wood' },
  population: { label: '많은 분들의 선택', cls: 'bg-paper text-ink-2' },
  situation: { label: '지금 상황', cls: 'bg-paper text-ink-2' },
}

const VERDICT = {
  good: { label: '잘 맞아요', cls: 'bg-teal text-white' },
  ok: { label: '보통', cls: 'bg-wood-tint text-wood' },
  bad: { label: '아쉬워요', cls: 'bg-[#F2DAD4] text-danger' },
}

/** 추천 좌석 자세히 보기: 평면도 + 왜 추천했는지 + 자리 정보 전부 */
export default function SeatInsight({
  recommendationId,
  seatId,
  floor,
  states,
  ranks,
  busy,
  onBack,
  onPick,
  onOtherSeat,
}: {
  recommendationId: string
  seatId: string
  floor: RoomFloor | null
  states: Record<string, SeatStateValue>
  ranks: Record<string, number>
  busy: boolean
  onBack: () => void
  onPick: (seatId: string) => void
  onOtherSeat: (seatId: string) => void
}) {
  const [ex, setEx] = useState<SeatExplanation | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setEx(null)
    setError('')
    getSeatExplanation(recommendationId, seatId)
      .then((d) => !cancelled && setEx(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : '자리 정보를 불러오지 못했어요.'))
    window.scrollTo(0, 0)
    return () => {
      cancelled = true
    }
  }, [recommendationId, seatId])

  const badge = ex?.rank ? `추천 ${ex.rank}순위` : ex?.available ? '빈자리' : '사용 중'

  return (
    <Screen wide className="gap-4 px-5 pt-3 pb-28 lg:gap-6 lg:pb-10">
      <div className="flex items-center gap-1">
        <TopBar onBack={onBack} backLabel="추천 목록으로" />
        <span className="text-sm font-medium text-muted">추천 목록으로</span>
      </div>

      {error && <ErrorText>{error}</ErrorText>}
      {!ex && !error && (
        <div role="status" className="flex items-center gap-2 py-10 text-sm text-muted">
          <Spinner className="size-5 text-teal" />이 자리를 살펴보는 중…
        </div>
      )}

      {ex && (
        <>
          <header className="flex flex-col gap-1.5">
            <span
              className={`self-start rounded-full px-2.5 py-0.5 text-xs font-bold ${
                ex.rank === 1 ? 'bg-teal text-white' : ex.rank ? 'bg-wood text-white' : ex.available ? 'bg-teal-tint text-teal-deep' : 'bg-taken text-ink-2'
              }`}
            >
              {badge}
            </span>
            <h1 className="m-0 font-serif text-[26px] leading-tight font-bold text-teal-deep lg:text-[32px]">{ex.name}</h1>
            <p className="m-0 text-[13px] text-muted lg:text-sm">
              {ex.libraryName} · {ex.room.deskType}
            </p>
          </header>

          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,1fr)] lg:items-start lg:gap-6">
            {/* 왼쪽: 요약 + 평면도 */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-6">
              <Card className="border-teal bg-teal-tint/50 p-4 lg:p-5">
                <p className="m-0 text-xs font-bold text-teal">{ex.recommended ? '이 자리를 추천한 이유' : '이 자리는요'}</p>
                <p className="m-0 mt-1 font-serif text-[17px] leading-relaxed font-bold text-teal-deep lg:text-[19px]">{ex.summary}</p>
              </Card>
              {floor && (
                <Card className="p-3 lg:p-4">
                  <h2 className="m-0 mb-2 px-1 text-sm font-bold">열람실에서 이 자리 위치</h2>
                  <FloorPlan
                    floor={floor}
                    states={states}
                    ranks={ranks}
                    focusId={seatId}
                    onSeat={(id) => id !== seatId && onOtherSeat(id)}
                    initialZoom={typeof window !== 'undefined' && window.innerWidth < 1024 ? 2 : 1}
                    maxHeightClass="max-h-[60vh] lg:max-h-[70vh]"
                    compactLegend
                  />
                  <p className="m-0 mt-2 px-1 text-[11px] text-muted">다른 자리를 누르면 그 자리 정보를 볼 수 있어요.</p>
                </Card>
              )}
            </div>

            {/* 오른쪽: 이유·비교·정보 */}
            <div className="flex flex-col gap-4">
              {ex.reasons.length > 0 && (
                <Section title="왜 이 자리를 골랐나요">
                  <ul className="m-0 flex list-none flex-col gap-3 p-0">
                    {ex.reasons.map((r) => (
                      <li key={r.text} className="flex gap-3">
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-teal text-white">
                          <CheckIcon className="size-3.5" />
                        </span>
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="text-[15px] leading-snug font-bold">{r.text}</span>
                          <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${SOURCE[r.source]?.cls ?? 'bg-paper'}`}>{SOURCE[r.source]?.label ?? r.source}</span>
                            {r.because}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {ex.cautions.length > 0 && (
                <Notice tone="caution">
                  <p className="m-0 mb-1 text-xs font-bold">아쉬운 점</p>
                  <ul className="m-0 flex list-disc flex-col gap-1 pl-4">
                    {ex.cautions.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </Notice>
              )}

              {ex.matches.length > 0 && (
                <Section title="내 취향과 비교">
                  <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
                    {ex.matches.map((m) => (
                      <li key={m.featureId} className="flex items-center gap-3 py-2.5">
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="text-sm font-bold">{m.want}</span>
                          <span className="text-xs text-muted">이 자리: {m.seat}</span>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${VERDICT[m.verdict].cls}`}>{VERDICT[m.verdict].label}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <Section title="이 자리는 이런 곳이에요">
                <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                  {ex.facts.map((f) => {
                    const Icon = FACT_ICON[f.icon] ?? BookIcon
                    return (
                      <li key={f.key} className="flex flex-col gap-1 rounded-xl bg-paper p-3">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                          <Icon className="size-4 text-teal" />
                          {f.title}
                        </span>
                        <span className="text-sm font-bold text-ink">{f.value}</span>
                        <span className="text-[11px] leading-snug text-muted">{f.detail}</span>
                      </li>
                    )
                  })}
                </ul>
              </Section>

              {ex.nearby.length > 0 && (
                <Section title="가까운 시설">
                  <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                    {ex.nearby.map((n) => (
                      <li key={n.type} className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink-2">
                        {n.text}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <Section title="열람실 정보">
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
                  <li>
                    {ex.libraryName} {ex.roomName}
                  </li>
                  <li>{ex.room.laptopAllowed ? '노트북을 쓸 수 있는 열람실이에요' : '노트북을 쓸 수 없는 열람실이에요'}</li>
                  {ex.room.hours && <li>{ex.room.hours.closedToday ? '오늘은 쉬는 날이에요' : `오늘 ${ex.room.hours.today} 운영${ex.room.hours.openNow ? ' · 지금 운영 중' : ' · 지금은 운영 시간이 아니에요'}`}</li>}
                  <li className="text-muted">{ex.learning.text}</li>
                </ul>
              </Section>
              <p className="m-0 text-[11px] leading-relaxed text-muted">{ex.virtual}</p>

              <div className="hidden lg:block">
                <PickButtons ex={ex} busy={busy} onPick={onPick} onBack={onBack} />
              </div>
            </div>
          </div>

          {/* 모바일: 아래 고정 버튼 */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
            <div className="mx-auto max-w-[420px]">
              <PickButtons ex={ex} busy={busy} onPick={onPick} onBack={onBack} />
            </div>
          </div>
        </>
      )}
    </Screen>
  )
}

function PickButtons({ ex, busy, onPick, onBack }: { ex: SeatExplanation; busy: boolean; onPick: (id: string) => void; onBack: () => void }) {
  if (!ex.available) {
    return (
      <SecondaryButton onClick={onBack} className="w-full">
        다른 자리 보기
      </SecondaryButton>
    )
  }
  return (
    <div className="flex gap-2">
      <SecondaryButton onClick={onBack} className="flex-1">
        목록으로
      </SecondaryButton>
      <PrimaryButton loading={busy} onClick={() => onPick(ex.seatId)} className="flex-[2]">
        이 자리로 할게요
      </PrimaryButton>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 p-4 lg:p-5">
      <h2 className="m-0 text-[15px] font-bold">{title}</h2>
      {children}
    </Card>
  )
}
