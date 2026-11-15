import { useEffect, useMemo, useState } from 'react'
import { ApiError, createSeatRecommendation, getRoomAvailability, getRoomFloor, getRoomMap, recordEvent } from '../api'
import type { Box, MapSeat, Recommendation, RecommendationResult, RoomFloor, RoomMap, SeatStateValue, SelectedRoom } from '../types'
import FloorPlan from '../components/FloorPlan'
import SeatInsight from './SeatInsight'
import { useBackLayer } from '../hooks/useBackLayer'
import { CheckIcon } from '../components/icons'
import RejectSheet from '../components/RejectSheet'
import Rating from '../components/Rating'
import { Card, ErrorText, Notice, PrimaryButton, Ribbon, Screen, SecondaryButton, Spinner, TextButton, TopBar } from '../components/ui'

const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

/** 화면에 보여줄 후보 수: 모바일 2개, 데스크톱 5개 */
const visibleSeats = (rec: Recommendation | null, n: number) =>
  (rec?.result.results ?? [])
    .filter((r) => r.targetType === 'seat')
    .sort((a, b) => a.rank - b.rank)
    .slice(0, n)

/** 만료·현황 변경 오류면 true (새로 추천받아야 함) */
const needsReload = (e: unknown) => e instanceof ApiError && (e.code === 'RECOMMENDATION_EXPIRED' || e.code === 'AVAILABILITY_CHANGED')

type Chosen = {
  recommendationId: string
  seatId: string
  name: string
  phase: 'chosen' | 'using' | 'ended'
  rating: number | null
}

/** 좌석 추천 결과 + 좌석도에서 직접 고르기 + 이용 시작·종료·평가 */
export default function Result({
  room,
  onBack,
  onPickLibrary,
  onHistory,
  onChanged,
}: {
  room: SelectedRoom
  onBack: () => void
  onPickLibrary: () => void
  onHistory: () => void
  onChanged: () => void
}) {
  const [map, setMap] = useState<RoomMap | null>(null)
  const [floor, setFloor] = useState<RoomFloor | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [seatStates, setSeatStates] = useState<Record<string, SeatStateValue>>({})
  const [rec, setRec] = useState<Recommendation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [chosen, setChosen] = useState<Chosen | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  // 휴대폰 뒤로 가기: 열린 창부터 닫는다(좌석 정보 → 자세히 보기 → 별로예요 → 고른 뒤 화면)
  useBackLayer(!!focusId, () => setFocusId(null))
  useBackLayer(!!detailId, () => setDetailId(null))
  useBackLayer(sheetOpen, () => setSheetOpen(false))
  useBackLayer(!!chosen, () => setChosen(null))
  const [showMore, setShowMore] = useState(false)
  const [desktop, setDesktop] = useState(isDesktop)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const on = () => setDesktop(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // 좌석도 (열람실이 바뀔 때). 없어도 추천 카드는 보여줌
  useEffect(() => {
    let cancelled = false
    setMap(null)
    setFloor(null)
    getRoomMap(room.roomId)
      .then((m) => !cancelled && setMap(m))
      .catch((e) => console.warn('좌석도 없음', e))
    getRoomFloor(room.roomId)
      .then((f) => !cancelled && setFloor(f))
      .catch((e) => console.warn('평면도 없음', e))
    return () => {
      cancelled = true
    }
  }, [room.roomId])

  // 현황 + 추천 (새로 추천받을 때마다)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setFocusId(null)
    setDetailId(null)

    getRoomAvailability(room.roomId)
      .then((a) => !cancelled && setSeatStates(Object.fromEntries(a.seatStates.map((s) => [s.seatId, s.state]))))
      .catch((e) => console.warn('현황 없음', e))

    createSeatRecommendation(room.roomId, 5)
      .then((r) => {
        if (cancelled) return
        setRec(r)
        const visible = visibleSeats(r, isDesktop() ? 5 : 2).map((x) => x.targetId)
        if (visible.length > 0) {
          recordEvent(r.recommendationId, {
            type: 'recommendationExposed',
            visibleTargetIds: visible,
          }).catch((e) => console.warn('노출 기록 실패', e))
        }
      })
      .catch((e) => {
        if (cancelled) return
        if (e instanceof ApiError && (e.status === 404 || e.status === 405)) setError('이 열람실은 좌석 추천을 지원하지 않아요.')
        else setError(e instanceof Error ? e.message : '추천을 불러오지 못했어요.')
      })
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [reloadKey, room.roomId])

  const top = visibleSeats(rec, desktop ? 5 : showMore ? 5 : 2)
  const top2 = visibleSeats(rec, 2)
  const roomName = rec?.displayNames[room.roomId] ?? `${room.libraryName} ${room.roomName}`
  const seatById = useMemo(() => Object.fromEntries((map?.seats ?? []).map((s) => [s.seatId, s])), [map])

  const seatName = (id: string) => {
    const fromServer = rec?.displayNames[id]
    if (fromServer) return fromServer
    const label = seatById[id]?.label
    return `${room.roomName} ${label ?? id}번`
  }

  const seatBox = (r: RecommendationResult | undefined): Box | null => {
    if (!r) return null
    return r.mapAnchor ?? seatById[r.targetId] ?? null
  }

  async function choose(seatId: string) {
    if (!rec) return
    setBusy(true)
    setNotice('')
    const inReco = rec.result.results.some((x) => x.targetId === seatId)
    try {
      await recordEvent(rec.recommendationId, {
        type: 'candidateSelected',
        targetId: seatId,
        origin: inReco ? 'recommendation' : 'outsideRecommendations',
      })
      setChosen({
        recommendationId: rec.recommendationId,
        seatId,
        name: seatName(seatId),
        phase: 'chosen',
        rating: null,
      })
      setDetailId(null)
      onChanged()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '전송에 실패했어요.')
      if (needsReload(e)) setReloadKey((k) => k + 1)
    } finally {
      setBusy(false)
    }
  }

  async function sendUseEvent(type: 'useConfirmed' | 'useEnded') {
    if (!chosen) return
    setBusy(true)
    try {
      await recordEvent(chosen.recommendationId, {
        type,
        targetId: chosen.seatId,
      })
      setChosen({
        ...chosen,
        phase: type === 'useConfirmed' ? 'using' : 'ended',
      })
      onChanged()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '전송에 실패했어요.')
    } finally {
      setBusy(false)
    }
  }

  async function rate(n: number) {
    if (!chosen) return
    setChosen({ ...chosen, rating: n })
    await recordEvent(chosen.recommendationId, {
      type: 'ratingSubmitted',
      targetId: chosen.seatId,
      rating: n,
    }).catch(() => undefined)
    onChanged()
  }

  async function reject(reasons: string[], comment: string) {
    if (!rec) return
    setBusy(true)
    const reason = [...reasons, comment].filter(Boolean).join(', ') || '이유 없음'
    await Promise.allSettled(
      top2.map((r) =>
        recordEvent(rec.recommendationId, {
          type: 'candidateRejected',
          targetId: r.targetId,
          reason,
          excludeFromFuture: true,
        }),
      ),
    )
    setBusy(false)
    setSheetOpen(false)
    const told = reasons.filter((r) => !r.startsWith('그냥'))
    setNotice(
      told.length ? `'${told.join("', '")}'를 반영해서 다시 골랐어요. 다음 추천에도 계속 반영돼요.` : '고른 두 자리는 다음부터 추천하지 않을게요.',
    )
    setReloadKey((k) => k + 1)
  }

  const ranks = Object.fromEntries(visibleSeats(rec, 5).map((r) => [r.targetId, r.rank]))

  // 자세히 보기: 평면도 + 왜 추천했는지 + 자리 정보
  if (detailId && rec && !chosen) {
    return (
      <SeatInsight
        recommendationId={rec.recommendationId}
        seatId={detailId}
        floor={floor}
        states={seatStates}
        ranks={ranks}
        busy={busy}
        onBack={() => setDetailId(null)}
        onPick={(id) => void choose(id)}
        onOtherSeat={setDetailId}
      />
    )
  }

  // 자리를 고른 뒤: 이용 시작 → 이용 종료 → 평가
  if (chosen) {
    return (
      <Screen className="px-5 pt-3 pb-6">
        <TopBar onBack={() => setChosen(null)} backLabel="추천 결과로 돌아가기" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center lg:flex-none lg:py-16">
          <span className="flex size-16 items-center justify-center rounded-full bg-teal text-white">
            <CheckIcon className="size-8" />
          </span>
          <h1 className="m-0 mt-2 font-serif text-[22px] font-bold text-teal-deep">{chosen.name}</h1>
          <p className="m-0 text-[15px] leading-relaxed text-muted">
            {chosen.phase === 'chosen' && '이 자리로 골랐어요. 앉기 전에 비어 있는지 확인해 주세요.'}
            {chosen.phase === 'using' && '이용 중이에요. 자리를 떠날 때 이용 종료를 눌러 주세요.'}
            {chosen.phase === 'ended' && '이용을 마쳤어요. 이 자리는 어땠나요?'}
          </p>
          <p className="m-0 text-xs text-muted">고른 자리는 바로 내 취향 학습에 반영돼요.</p>
          {chosen.phase === 'ended' && (
            <div className="mt-3 flex flex-col items-center gap-2">
              <Rating value={chosen.rating} onRate={(n) => void rate(n)} />
              {chosen.rating && <span className="text-xs text-muted">평가를 저장했어요. 평가는 기록용으로만 써요.</span>}
            </div>
          )}
        </div>
        {notice && <Notice className="mb-3">{notice}</Notice>}
        <div className="flex flex-col gap-2">
          {chosen.phase === 'chosen' && (
            <PrimaryButton loading={busy} onClick={() => void sendUseEvent('useConfirmed')} className="w-full">
              앉았어요 (이용 시작)
            </PrimaryButton>
          )}
          {chosen.phase === 'using' && (
            <PrimaryButton loading={busy} onClick={() => void sendUseEvent('useEnded')} className="w-full">
              이용 종료
            </PrimaryButton>
          )}
          {chosen.phase === 'ended' ? (
            <PrimaryButton onClick={onHistory} className="w-full">
              이용 기록 보기
            </PrimaryButton>
          ) : (
            <SecondaryButton
              onClick={() => {
                setChosen(null)
                setReloadKey((k) => k + 1)
              }}
              className="w-full"
            >
              다른 자리 보기
            </SecondaryButton>
          )}
        </div>
      </Screen>
    )
  }

  const isPreview = rec?.result.executionMode === 'preview'
  const focus = focusId ? seatById[focusId] : null
  const focusRank = focusId ? rec?.result.results.find((x) => x.targetId === focusId) : undefined
  const remaining = rec?.room?.remainingSeats

  return (
    <Screen wide className={`gap-3 px-5 pt-3 lg:gap-5 ${focus ? 'pb-60 lg:pb-5' : 'pb-5'}`}>
      <div className="flex items-center gap-1">
        <div className="lg:hidden">
          <TopBar onBack={onBack} backLabel="메인으로 돌아가기" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="m-0 font-serif text-[22px] font-bold text-teal-deep lg:text-[28px]">추천 좌석</h1>
          <span className="truncate text-[13px] text-muted lg:text-sm">
            <b className="text-[15px] font-semibold text-ink-2 lg:text-base">{room.libraryName}</b> · {room.roomName}
            {remaining != null && ` · 남은 자리 ${remaining}석`}
          </span>
        </div>
        <div className="hidden gap-2 lg:flex">
          <SecondaryButton size="sm" onClick={() => setReloadKey((k) => k + 1)} disabled={loading}>
            새로고침
          </SecondaryButton>
          <SecondaryButton size="sm" onClick={onPickLibrary}>
            열람실 바꾸기
          </SecondaryButton>
        </div>
      </div>

      {notice && <Notice>{notice}</Notice>}
      {isPreview && !loading && <Notice tone="caution">검수 전 미리보기 자료예요. 아직 자리를 선택할 수는 없어요.</Notice>}
      {!loading &&
        rec?.result.warnings.map((w) => (
          <Notice key={w} tone="caution">
            {w}
          </Notice>
        ))}

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)] lg:items-start lg:gap-6">
        {/* 왼쪽: 좌석도 + 고른 좌석 정보 */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-6">
          {floor ? (
            <Card className="p-3 lg:p-4">
              <h2 className="m-0 mb-2 px-1 text-sm font-bold">{roomName}</h2>
              <FloorPlan
                floor={floor}
                states={seatStates}
                ranks={ranks}
                focusId={focusId}
                onSeat={setFocusId}
                maxHeightClass="max-h-[55vh] lg:max-h-[70vh]"
              />
            </Card>
          ) : (
            map && <SeatMap map={map} roomName={roomName} states={seatStates} ranked={top} boxOf={seatBox} focusId={focusId} onFocus={setFocusId} />
          )}
          {focus && (
            <SeatDetail
              seat={focus}
              name={seatName(focus.seatId)}
              rank={focusRank?.rank}
              available={seatStates[focus.seatId] !== 'occupied' && rec?.result.results != null}
              busy={busy || !rec}
              onPick={() => void choose(focus.seatId)}
              onDetail={rec ? () => setDetailId(focus.seatId) : undefined}
              onClose={() => setFocusId(null)}
            />
          )}
          {map && !focus && (
            <p className="m-0 hidden text-xs text-muted lg:block">좌석도에서 빈자리를 누르면 그 자리 정보를 보고 직접 고를 수 있어요.</p>
          )}
        </div>

        {/* 오른쪽: 추천 카드 */}
        <div className="flex flex-col gap-3">
          {loading && (
            <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-sm text-muted">
              <Spinner className="size-6 text-teal" />
              맞는 자리를 찾고 있어요…
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
              <ErrorText>{error}</ErrorText>
              <SecondaryButton size="sm" onClick={() => setReloadKey((k) => k + 1)}>
                다시 시도
              </SecondaryButton>
            </div>
          )}

          {!loading && !error && rec && top.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
              <p className="m-0 font-serif text-lg font-bold text-teal-deep">지금 추천할 수 있는 자리가 없어요</p>
              <p className="m-0 text-sm text-muted">
                {rec.result.outcome === 'noCandidates'
                  ? '이 열람실에 빈자리가 없어요. 다른 열람실을 골라 보세요.'
                  : '조건에 맞는 자리가 없어요. 기준을 바꿔 보세요.'}
              </p>
              <div className="mt-4 flex w-full gap-2">
                <SecondaryButton className="flex-1" onClick={onPickLibrary}>
                  열람실 바꾸기
                </SecondaryButton>
                <PrimaryButton className="flex-1" onClick={() => setReloadKey((k) => k + 1)}>
                  다시 추천
                </PrimaryButton>
              </div>
            </div>
          )}

          {!loading && !error && rec && top.length > 0 && (
            <>
              {top.map((r, i) =>
                i < 2 ? (
                  <SeatCard
                    key={r.targetId}
                    rank={i === 0 ? 1 : 2}
                    name={seatName(r.targetId)}
                    result={r}
                    tags={seatById[r.targetId]?.tags ?? []}
                    disabled={busy || r.previewOnly}
                    onPick={() => void choose(r.targetId)}
                    onFocus={() => setFocusId(r.targetId)}
                    onDetail={() => setDetailId(r.targetId)}
                  />
                ) : (
                  <MiniCard
                    key={r.targetId}
                    result={r}
                    name={seatName(r.targetId)}
                    disabled={busy}
                    onPick={() => void choose(r.targetId)}
                    onFocus={() => setDetailId(r.targetId)}
                  />
                ),
              )}
              {!desktop && rec.result.results.length > 2 && (
                <TextButton onClick={() => setShowMore((v) => !v)} className="self-center">
                  {showMore ? '후보 접기' : `다른 후보 ${rec.result.results.length - 2}곳 더 보기`}
                </TextButton>
              )}
              <div className="flex items-center justify-center gap-4">
                <TextButton tone="muted" onClick={() => setSheetOpen(true)}>
                  {top2.length > 1 ? '1·2순위 둘 다 별로예요' : '별로예요'}
                </TextButton>
                <TextButton tone="muted" onClick={onPickLibrary} className="lg:hidden">
                  열람실 바꾸기
                </TextButton>
              </div>
              {rec.model && (
                <p className="m-0 text-center text-xs leading-relaxed text-muted">
                  {rec.model.historySessions > 0
                    ? `내가 고른 자리 ${rec.model.historySessions}번을 학습해 골랐어요.`
                    : '자리를 고를수록 내 취향을 배워요.'}{' '}
                  남은 자리는 모의 현황이에요.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {sheetOpen && <RejectSheet onClose={() => setSheetOpen(false)} onSubmit={reject} submitting={busy} />}
    </Screen>
  )
}

function SeatTags({ tags }: { tags: string[] }) {
  if (!tags.length) return null
  return (
    <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
      {tags.map((t) => (
        <li key={t} className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium text-ink-2">
          {t}
        </li>
      ))}
    </ul>
  )
}

function SeatCard({
  rank,
  name,
  result,
  tags,
  onPick,
  onFocus,
  onDetail,
  disabled,
}: {
  rank: 1 | 2
  name: string
  result: RecommendationResult
  tags: string[]
  onPick: () => void
  onFocus: () => void
  onDetail: () => void
  disabled: boolean
}) {
  const first = rank === 1
  return (
    <article className={`relative flex flex-col gap-3 rounded-2xl bg-cream p-4 ${first ? 'border-[1.5px] border-teal' : 'border border-line'}`}>
      <Ribbon label={String(rank)} tone={first ? 'teal' : 'wood'} />
      <div className="flex flex-col gap-0.5 pr-10">
        <span className={`text-xs font-bold ${first ? 'text-teal' : 'text-wood'}`}>{rank}순위</span>
        <button type="button" onClick={onFocus} className="text-left">
          <h2 className="m-0 font-serif text-xl font-bold text-teal-deep hover:underline">{name}</h2>
        </button>
        {result.availability.effectiveState === 'unknown' && <span className="text-xs text-muted">지금 비어 있는지는 확인되지 않았어요</span>}
      </div>
      {result.reasons.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {result.reasons.slice(0, 3).map((r) => (
            <li key={r.code + r.text} className="flex items-start gap-2 text-sm leading-normal">
              <CheckIcon className={`mt-0.5 size-4 shrink-0 ${first ? 'text-teal' : 'text-wood'}`} />
              {r.text}
            </li>
          ))}
        </ul>
      )}
      <SeatTags tags={tags} />
      <div className="flex gap-2">
        <SecondaryButton size="sm" onClick={onDetail} className="h-11 flex-1">
          자세히 보기
        </SecondaryButton>
        {first ? (
          <PrimaryButton size="sm" onClick={onPick} disabled={disabled} className="h-11 flex-[1.4]">
            이 자리로 할게요
          </PrimaryButton>
        ) : (
          <SecondaryButton size="sm" onClick={onPick} disabled={disabled} className="h-11 flex-[1.4]">
            이 자리로 할게요
          </SecondaryButton>
        )}
      </div>
    </article>
  )
}

/** 3~5순위 후보(한 줄) */
function MiniCard({
  result,
  name,
  onPick,
  onFocus,
  disabled,
}: {
  result: RecommendationResult
  name: string
  onPick: () => void
  onFocus: () => void
  disabled: boolean
}) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-line bg-cream px-4 py-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-line text-xs font-bold text-ink-2">{result.rank}</span>
      <button type="button" onClick={onFocus} className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate text-sm font-bold hover:underline">{name}</span>
        <span className="truncate text-xs text-muted">{result.reasons.map((r) => r.text).join(' · ') || '조건에 맞는 자리'}</span>
      </button>
      <SecondaryButton size="sm" onClick={onPick} disabled={disabled}>
        선택
      </SecondaryButton>
    </article>
  )
}

/** 좌석도에서 누른 좌석 정보 */
function SeatDetail({
  seat,
  name,
  rank,
  available,
  busy,
  onPick,
  onDetail,
  onClose,
}: {
  seat: MapSeat
  name: string
  rank?: number
  available: boolean
  busy: boolean
  onPick: () => void
  onDetail?: () => void
  onClose: () => void
}) {
  return (
    <Card
      data-seat-sheet
      className="fixed inset-x-3 bottom-3 z-30 flex flex-col gap-3 border-teal p-4 shadow-[0_8px_30px_rgba(0,0,0,.18)] lg:static lg:border-line lg:shadow-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-teal">{rank ? `추천 ${rank}순위` : available ? '빈자리' : '사용 중'}</span>
          <h2 className="m-0 font-serif text-lg font-bold text-teal-deep">{name}</h2>
          {seat.deskType && <span className="text-xs text-muted">{seat.deskType}</span>}
        </div>
        <TextButton tone="muted" onClick={onClose} className="-my-2 text-[13px]">
          닫기
        </TextButton>
      </div>
      <SeatTags tags={seat.tags ?? []} />
      {available ? (
        <div className="flex gap-2">
          {onDetail && (
            <SecondaryButton size="sm" onClick={onDetail} className="h-11 flex-1">
              자세히 보기
            </SecondaryButton>
          )}
          <PrimaryButton size="sm" onClick={onPick} disabled={busy} className="h-11 flex-[1.4]">
            {rank ? '이 자리로 할게요' : '이 자리로 직접 고를게요'}
          </PrimaryButton>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-[13px] text-muted">지금 다른 분이 쓰고 있는 자리예요.</p>
          {onDetail && (
            <SecondaryButton size="sm" onClick={onDetail} className="h-10 w-full">
              자리 정보 보기
            </SecondaryButton>
          )}
        </div>
      )}
    </Card>
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
  window: 'bg-[#BFD8DB]',
  entrance: 'bg-wood/60',
  toilet: 'bg-[#E3D3E0]',
  outlet: 'bg-brass/50',
  air_conditioner: 'bg-[#CFE3F0]',
}
const FACILITY_LABEL: Record<string, string> = {
  window: '창문',
  entrance: '출입구',
  toilet: '화장실',
  air_conditioner: '냉방기',
}

/** 좌표(0~1)대로 좌석을 그리는 배치도. 빈자리를 누르면 그 자리 정보를 연다 */
function SeatMap({
  map,
  roomName,
  states,
  ranked,
  boxOf,
  focusId,
  onFocus,
}: {
  map: RoomMap
  roomName: string
  states: Record<string, SeatStateValue>
  ranked: RecommendationResult[]
  boxOf: (r: RecommendationResult | undefined) => Box | null
  focusId: string | null
  onFocus: (id: string) => void
}) {
  const hasStates = Object.keys(states).length > 0
  const rankOf = Object.fromEntries(ranked.map((r) => [r.targetId, r.rank]))
  const marker = (b: Box, label: string, color: string) => (
    <div
      key={label}
      className={`pointer-events-none absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white lg:size-6 lg:text-xs ${color}`}
      style={{
        left: `${(b.x + b.width / 2) * 100}%`,
        top: `${(b.y + b.height / 2) * 100}%`,
      }}
    >
      {label}
    </div>
  )
  const legendTypes = [...new Set(map.facilities.map((f) => f.type))].filter((t) => FACILITY_LABEL[t])

  return (
    <Card className="flex flex-col gap-3 p-4 lg:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-sm font-bold">{roomName}</h2>
        <div className="flex flex-wrap gap-3 text-[11px] text-muted">
          <Legend className="bg-teal" label="1순위" />
          <Legend className="bg-wood" label="2순위" />
          {hasStates && <Legend className="bg-taken" label="사용 중" />}
          {legendTypes.map((t) => (
            <Legend key={t} className={FACILITY_STYLE[t]} label={FACILITY_LABEL[t]} />
          ))}
        </div>
      </div>
      <div
        role="group"
        aria-label={`${roomName} 좌석 배치도`}
        className="relative w-full overflow-hidden rounded-lg border border-line bg-white"
        style={{ aspectRatio: `${map.width} / ${map.height}` }}
      >
        {map.backgroundUrl && <img src={map.backgroundUrl} alt="" className="absolute inset-0 size-full object-fill opacity-60" />}
        {map.facilities.map((f) => (
          <div
            key={f.facilityId}
            title={FACILITY_LABEL[f.type]}
            className={`absolute rounded-sm ${FACILITY_STYLE[f.type] ?? 'bg-paper'}`}
            style={pos(f.geometry)}
          />
        ))}
        {map.seats.map((s) => {
          const taken = TAKEN.includes(states[s.seatId])
          const r = rankOf[s.seatId]
          const focused = focusId === s.seatId
          return (
            <button
              key={s.seatId}
              type="button"
              onClick={() => onFocus(s.seatId)}
              aria-label={`${s.label ?? s.seatId}번 ${taken ? '사용 중' : '빈자리'}${r ? `, 추천 ${r}순위` : ''}`}
              className={`absolute rounded-[2px] transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-teal focus-visible:outline-none ${
                focused ? 'z-10 bg-teal-tint ring-2 ring-teal' : taken ? 'bg-taken' : 'border border-line-strong bg-cream hover:bg-teal-tint'
              }`}
              style={pos(s)}
            />
          )
        })}
        {ranked
          .slice(0, 5)
          .reverse()
          .map((r) => {
            const b = boxOf(r)
            return b ? marker(b, String(r.rank), r.rank === 1 ? 'bg-teal' : r.rank === 2 ? 'bg-wood' : 'bg-muted') : null
          })}
      </div>
    </Card>
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
