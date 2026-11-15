import { useEffect, useState } from 'react'
import { getHistory, recordEvent } from '../api'
import type { History as HistoryData, HistoryItem } from '../types'
import Rating from '../components/Rating'
import { Card, ErrorText, Notice, PageHeader, PrimaryButton, RoomTitle, Screen, SecondaryButton, Spinner, TopBar } from '../components/ui'

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

const STATUS: Record<HistoryItem['status'], string> = {
  active: '이용 중',
  ended: '이용 종료',
  expired: '자동 종료',
}

/** 이용 기록: 지금 이용 중인 자리 관리 + 지난 기록·평가 */
export default function History({ onBack, onRecommend, onChanged }: { onBack: () => void; onRecommend: () => void; onChanged: () => void }) {
  const [data, setData] = useState<HistoryData | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    getHistory()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : '불러오지 못했어요.'))
    return () => {
      cancelled = true
    }
  }, [reload])

  async function send(h: HistoryItem, ev: { type: 'useConfirmed' } | { type: 'useEnded' } | { type: 'ratingSubmitted'; rating: number }) {
    setBusy(true)
    try {
      await recordEvent(h.recommendationId, { ...ev, targetId: h.seatId })
      setReload((k) => k + 1)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : '전송에 실패했어요.')
    } finally {
      setBusy(false)
    }
  }

  const cur = data?.current
  const past = data?.items.filter((i) => i.status !== 'active') ?? []

  return (
    <Screen wide className="gap-5 px-5 pt-3 pb-8">
      <div className="lg:hidden">
        <TopBar onBack={onBack} backLabel="메인으로 돌아가기" />
      </div>
      <PageHeader eyebrow="이용 기록" title="내가 앉았던 자리" description="고른 자리는 내 취향 학습에 바로 쓰여요. 평가는 기록으로만 남겨요." />
      {error && <ErrorText>{error}</ErrorText>}
      {!data && !error && <Spinner className="size-6 text-teal" />}

      {data && (
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start lg:gap-6">
          <section aria-labelledby="now" className="flex flex-col gap-3 lg:sticky lg:top-6">
            <h2 id="now" className="m-0 text-[15px] font-bold">
              지금 이용 중
            </h2>
            {cur ? (
              <Card className="flex flex-col gap-3 border-teal p-5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-teal">{cur.confirmedAt ? '앉아 있어요' : '골랐어요 · 아직 이용 시작 전'}</span>
                  <RoomTitle roomName={cur.seatName} libraryName={cur.libraryName} roomClassName="font-serif text-[22px] font-bold text-teal-deep" />
                </div>
                <dl className="m-0 grid grid-cols-2 gap-2 text-[13px]">
                  <div>
                    <dt className="text-muted">고른 시각</dt>
                    <dd className="m-0 font-medium">{fmt(cur.selectedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">자동 종료</dt>
                    <dd className="m-0 font-medium">{fmt(cur.holdUntil)}</dd>
                  </div>
                </dl>
                <div className="flex gap-2">
                  {!cur.confirmedAt && (
                    <SecondaryButton size="sm" className="flex-1" disabled={busy} onClick={() => void send(cur, { type: 'useConfirmed' })}>
                      앉았어요
                    </SecondaryButton>
                  )}
                  <PrimaryButton size="sm" className="flex-1" loading={busy} onClick={() => void send(cur, { type: 'useEnded' })}>
                    이용 종료
                  </PrimaryButton>
                </div>
              </Card>
            ) : (
              <Card className="flex flex-col gap-3 p-5">
                <p className="m-0 text-sm text-muted">이용 중인 자리가 없어요.</p>
                <PrimaryButton size="sm" onClick={onRecommend}>
                  자리 추천받기
                </PrimaryButton>
              </Card>
            )}
            <Notice>자리를 고르고 3시간이 지나면 자동으로 이용이 끝나요. 다른 자리를 고르면 이전 자리는 바로 끝나요.</Notice>
          </section>

          <section aria-labelledby="past" className="flex flex-col gap-3">
            <h2 id="past" className="m-0 text-[15px] font-bold">
              지난 기록 <span className="text-sm font-normal text-muted">{past.length}번</span>
            </h2>
            {past.length === 0 ? (
              <Card className="p-5 text-sm text-muted">아직 지난 기록이 없어요.</Card>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {past.map((h) => (
                  <li key={h.selectionId}>
                    <Card className="flex flex-col gap-2 p-4 lg:flex-row lg:items-center lg:gap-4">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[15px] font-bold">{h.seatName}</span>
                          <span className="shrink-0 text-sm font-semibold text-ink-2">{h.libraryName}</span>
                          {h.origin === 'outsideRecommendations' && (
                            <span className="shrink-0 rounded-full bg-wood-tint px-2 py-0.5 text-[11px] font-medium text-wood">직접 고름</span>
                          )}
                        </div>
                        <span className="truncate text-xs text-muted">
                          {fmt(h.selectedAt)} · {STATUS[h.status]}
                        </span>
                      </div>
                      <Rating
                        value={h.rating}
                        size="sm"
                        onRate={
                          busy
                            ? undefined
                            : (n) =>
                                void send(h, {
                                  type: 'ratingSubmitted',
                                  rating: n,
                                })
                        }
                      />
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Screen>
  )
}
