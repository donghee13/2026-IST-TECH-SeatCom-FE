import { useEffect, useState } from 'react'
import {
  ApiError,
  ROOM_ID,
  createSeatRecommendation,
  getRoomAvailability,
  getRoomMap,
  recordEvent,
} from '../api'
import type { Box, Choices, Recommendation, RecommendationResult, RoomMap, SeatStateValue } from '../types'
import { CheckIcon } from '../components/icons'
import RejectSheet from '../components/RejectSheet'
import { BookShelf, DateStamp, ErrorText, PrimaryButton, Ribbon, Screen, SecondaryButton, TopBar } from '../components/ui'

/** 좌석 추천 중 상위 2개 */
const topSeats = (rec: Recommendation | null) =>
  (rec?.result.results ?? [])
    .filter((r) => r.targetType === 'seat')
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 2)

/** 만료·현황 변경 오류면 true (새로 추천받아야 함) */
const needsReload = (e: unknown) =>
  e instanceof ApiError && (e.code === 'RECOMMENDATION_EXPIRED' || e.code === 'AVAILABILITY_CHANGED')

export default function Result({ choices, personaText, onBack }: { choices: Choices; personaText: string; onBack: () => void }) {
  const [map, setMap] = useState<RoomMap | null>(null)
  const [seatStates, setSeatStates] = useState<Record<string, SeatStateValue>>({})
  const [rec, setRec] = useState<Recommendation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [chosen, setChosen] = useState<string | null>(null)

  // B03 좌석도 (처음 한 번). 없어도 추천 카드는 보여줌
  useEffect(() => {
    let cancelled = false
    getRoomMap(ROOM_ID)
      .then((m) => !cancelled && setMap(m))
      .catch((e) => console.warn('좌석도 없음', e))
    return () => {
      cancelled = true
    }
  }, [])

  // B04 현황 + B08 추천 (새로 추천받을 때마다)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    getRoomAvailability(ROOM_ID)
      .then((a) => !cancelled && setSeatStates(Object.fromEntries(a.seatStates.map((s) => [s.seatId, s.state]))))
      .catch((e) => console.warn('현황 없음', e))

    createSeatRecommendation(ROOM_ID, choices)
      .then((r) => {
        if (cancelled) return
        setRec(r)
        const visible = topSeats(r).map((x) => x.targetId)
        if (visible.length > 0) {
          // B09 노출 기록 (실패해도 화면에는 영향 없음)
          recordEvent(r.recommendationId, { type: 'recommendationExposed', visibleTargetIds: visible }).catch((e) =>
            console.warn('노출 기록 실패', e),
          )
        }
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : '추천을 불러오지 못했어요.'))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [choices, reloadKey])

  const top = topSeats(rec)
  const roomName = (rec && top[0] && rec.displayNames[top[0].roomId]) || '열람실'

  const seatName = (r: RecommendationResult) => {
    const fromServer = rec?.displayNames[r.targetId]
    if (fromServer) return fromServer
    const label = map?.seats.find((s) => s.seatId === r.targetId)?.label
    return `${roomName} ${label ?? r.targetId}`
  }

  const seatBox = (r: RecommendationResult | undefined): Box | null => {
    if (!r) return null
    return r.mapAnchor ?? map?.seats.find((s) => s.seatId === r.targetId) ?? null
  }

  async function accept(r: RecommendationResult) {
    if (!rec) return
    setBusy(true)
    setNotice('')
    try {
      await recordEvent(rec.recommendationId, { type: 'candidateSelected', targetId: r.targetId, origin: 'recommendation' })
      setChosen(seatName(r))
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '전송에 실패했어요.')
      if (needsReload(e)) setReloadKey((k) => k + 1)
    } finally {
      setBusy(false)
    }
  }

  async function reject(reasons: string[], comment: string) {
    if (!rec) return
    setBusy(true)
    const reason = [...reasons, comment].filter(Boolean).join(', ') || '이유 없음'
    // 두 자리 각각 거절 기록. 만료돼서 실패해도 새로 추천은 받음
    await Promise.allSettled(
      top.map((r) =>
        recordEvent(rec.recommendationId, { type: 'candidateRejected', targetId: r.targetId, reason, excludeFromFuture: true }),
      ),
    )
    setBusy(false)
    setSheetOpen(false)
    setNotice('')
    setReloadKey((k) => k + 1)
  }

  // 자리를 고른 뒤 화면
  if (chosen) {
    return (
      <Screen className="px-5 pt-4 pb-7">
        <TopBar onBack={() => setChosen(null)} backLabel="추천 결과로 돌아가기" />
        <div className="relative mt-10 flex flex-col items-center gap-3 rounded-[14px] border-[1.5px] border-teal bg-cream px-6 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-teal text-white">
            <CheckIcon className="size-6" />
          </span>
          <h1 className="m-0 font-serif text-[22px] font-bold text-teal-deep">{chosen}</h1>
          <p className="m-0 text-sm text-muted">이 자리로 골랐어요. 자리가 비어 있는지 꼭 확인해 주세요.</p>
          <DateStamp />
        </div>
        <div className="min-h-6 flex-1" />
        <BookShelf scale={0.6} withShelf={false} />
        <SecondaryButton onClick={() => setChosen(null)} className="mt-4">
          다른 자리 보기
        </SecondaryButton>
      </Screen>
    )
  }

  const isPreview = rec?.result.executionMode === 'preview'

  return (
    <Screen className="gap-3 px-5 pt-4 pb-5">
      <div className="flex items-center gap-1.5">
        <TopBar onBack={onBack} backLabel="추천 시작으로 돌아가기" />
        <div className="flex flex-col">
          <h1 className="m-0 font-serif text-[22px] font-bold text-teal-deep">추천 좌석</h1>
          <span className="text-[12.5px] text-muted">{personaText ? `${personaText} 기준` : '저장된 취향 기준'}</span>
        </div>
      </div>

      {notice && (
        <p role="status" className="m-0 rounded-lg bg-teal-tint px-3.5 py-2.5 text-[13px] text-teal-deep">
          {notice}
        </p>
      )}
      {isPreview && !loading && (
        <p className="m-0 rounded-lg bg-wood-tint px-3.5 py-2.5 text-[13px] text-ink-2">
          검수 전 미리보기 자료예요. 아직 자리를 선택할 수는 없어요.
        </p>
      )}

      {map && (
        <SeatMap
          map={map}
          roomName={roomName}
          states={seatStates}
          first={seatBox(top[0])}
          second={seatBox(top[1])}
          firstId={top[0]?.targetId}
          secondId={top[1]?.targetId}
        />
      )}

      {loading && (
        <div role="status" className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-muted">
          <BookShelf scale={0.6} count={8} withShelf={false} />
          <span className="text-sm">맞는 자리를 찾고 있어요…</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <ErrorText>{error}</ErrorText>
          <SecondaryButton className="px-6" onClick={() => setReloadKey((k) => k + 1)}>
            다시 시도
          </SecondaryButton>
        </div>
      )}

      {!loading && !error && rec && top.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="m-0 font-serif text-lg font-bold text-teal-deep">지금 추천할 수 있는 자리가 없어요</p>
          <p className="m-0 text-[13px] text-muted">
            {rec.result.outcome === 'noCandidates'
              ? '이 열람실에 추천할 좌석 정보가 아직 없어요.'
              : '조건에 맞는 자리가 없어요. 기준을 바꿔 보세요.'}
          </p>
          <div className="mt-2 flex w-full gap-2.5">
            <SecondaryButton className="flex-1" onClick={onBack}>
              기준 바꾸기
            </SecondaryButton>
            <PrimaryButton className="flex-1" onClick={() => setReloadKey((k) => k + 1)}>
              다시 추천
            </PrimaryButton>
          </div>
        </div>
      )}

      {!loading && !error && top.length > 0 && (
        <>
          {top.map((r, i) => (
            <SeatCard
              key={r.targetId}
              rank={i === 0 ? 1 : 2}
              name={seatName(r)}
              result={r}
              disabled={busy || r.previewOnly}
              onPick={() => accept(r)}
            />
          ))}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="min-h-11 self-center text-sm font-medium text-muted underline underline-offset-2"
          >
            {top.length > 1 ? '둘 다 별로예요' : '별로예요'}
          </button>
        </>
      )}

      {sheetOpen && <RejectSheet onClose={() => setSheetOpen(false)} onSubmit={reject} submitting={busy} />}
    </Screen>
  )
}

function SeatCard({
  rank,
  name,
  result,
  onPick,
  disabled,
}: {
  rank: 1 | 2
  name: string
  result: RecommendationResult
  onPick: () => void
  disabled: boolean
}) {
  const first = rank === 1
  return (
    <article
      className={`relative flex flex-col gap-2.5 rounded-[14px] bg-cream px-4 pt-3.5 pb-4 ${first ? 'border-[1.5px] border-teal' : 'border border-line'}`}
    >
      <Ribbon label={String(rank)} tone={first ? 'teal' : 'wood'} />
      <div className="flex flex-col gap-0.5 pr-10">
        <span className={`text-xs font-bold tracking-[0.04em] ${first ? 'text-teal' : 'text-wood'}`}>{rank}순위</span>
        <h2 className="m-0 font-serif text-xl font-bold text-teal-deep">{name}</h2>
        {result.availability.effectiveState === 'unknown' && (
          <span className="text-xs text-muted">지금 비어 있는지는 확인되지 않았어요</span>
        )}
      </div>
      {result.reasons.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {result.reasons.slice(0, 3).map((r) => (
            <li key={r.code + r.text} className="flex items-start gap-2 text-[13.5px]">
              <CheckIcon className={`mt-0.5 size-4 shrink-0 ${first ? 'text-teal' : 'text-wood'}`} />
              {r.text}
            </li>
          ))}
        </ul>
      )}
      {first ? (
        <PrimaryButton onClick={onPick} disabled={disabled} className="h-11 rounded-[10px] text-[15px]">
          이 자리로 할게요
        </PrimaryButton>
      ) : (
        <button
          type="button"
          onClick={onPick}
          disabled={disabled}
          className="h-11 rounded-[10px] border-[1.5px] border-teal text-[15px] font-bold text-teal transition-colors hover:bg-teal-tint disabled:opacity-50"
        >
          이 자리로 할게요
        </button>
      )}
    </article>
  )
}

const pos = (b: Box) => ({
  left: `${b.x * 100}%`,
  top: `${b.y * 100}%`,
  width: `${b.width * 100}%`,
  height: `${b.height * 100}%`,
})

const TAKEN: SeatStateValue[] = ['occupied', 'reserved', 'blocked']

const FACILITY_STYLE: Record<string, string> = {
  window: 'bg-[#D6E7E9]',
  entrance: 'bg-wood-tint',
  toilet: 'bg-paper',
  outlet: 'bg-brass/30',
}

/** B03 좌표(0~1)대로 좌석을 그리는 배치도 */
function SeatMap({
  map,
  roomName,
  states,
  first,
  second,
  firstId,
  secondId,
}: {
  map: RoomMap
  roomName: string
  states: Record<string, SeatStateValue>
  first: Box | null
  second: Box | null
  firstId?: string
  secondId?: string
}) {
  const hasStates = Object.keys(states).length > 0
  const marker = (b: Box, label: string, color: string) => (
    <div
      className={`absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white ${color}`}
      style={{ left: `${(b.x + b.width / 2) * 100}%`, top: `${(b.y + b.height / 2) * 100}%` }}
    >
      {label}
    </div>
  )

  return (
    <section className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-cream px-3.5 pt-3 pb-3.5">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[13px] font-bold">{roomName}</h2>
        <div className="flex gap-2.5 text-[11px] text-muted">
          <Legend className="bg-teal" label="1순위" />
          <Legend className="bg-wood" label="2순위" />
          {hasStates && <Legend className="bg-taken" label="사용 중" />}
        </div>
      </div>
      <div
        role="img"
        aria-label={`${roomName} 좌석 배치도. 1순위 ${firstId ?? '없음'}, 2순위 ${secondId ?? '없음'}`}
        className="relative w-full overflow-hidden rounded-lg border border-line bg-white"
        style={{ aspectRatio: `${map.width} / ${map.height}` }}
      >
        {map.backgroundUrl && (
          <img src={map.backgroundUrl} alt="" className="absolute inset-0 size-full object-fill opacity-60" />
        )}
        {map.facilities.map((f) => (
          <div
            key={f.facilityId}
            className={`absolute rounded-sm ${FACILITY_STYLE[f.type] ?? 'bg-paper'}`}
            style={pos(f.geometry)}
          />
        ))}
        {map.seats.map((s) => (
          <div
            key={s.seatId}
            className={`absolute rounded-[2px] ${TAKEN.includes(states[s.seatId]) ? 'bg-taken' : 'border border-line-strong bg-cream'}`}
            style={pos(s)}
          />
        ))}
        {second && marker(second, '2', 'bg-wood')}
        {first && marker(first, '1', 'bg-teal')}
      </div>
    </section>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`size-2.5 rounded-[3px] ${className}`} />
      {label}
    </span>
  )
}