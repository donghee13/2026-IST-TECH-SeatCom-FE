import { useEffect, useState } from 'react'
import { recommend, sendFeedback } from '../api'
import { PERSONAS } from '../data/options'
import type { Preferences, Recommendation, RecommendResult, RoomMap } from '../types'
import { CheckIcon } from '../components/icons'
import RejectSheet from '../components/RejectSheet'
import { BookShelf, DateStamp, ErrorText, PrimaryButton, Ribbon, Screen, SecondaryButton, TopBar } from '../components/ui'

export default function Result({ prefs, onBack }: { prefs: Preferences; onBack: () => void }) {
  const [data, setData] = useState<RecommendResult | null>(null)
  const [error, setError] = useState('')
  const [exclude, setExclude] = useState<string[]>([])
  const [retry, setRetry] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [chosen, setChosen] = useState<Recommendation | null>(null)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError('')
    recommend(prefs, exclude)
      .then((r) => !cancelled && setData(r))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : '추천을 불러오지 못했어요.'))
    return () => {
      cancelled = true
    }
  }, [prefs, exclude, retry])

  const personaText = PERSONAS.filter((p) => prefs.personas.includes(p.id))
    .map((p) => p.name)
    .join(' · ')

  async function accept(rec: Recommendation) {
    if (!data) return
    setBusy(true)
    try {
      await sendFeedback({ requestId: data.requestId, action: 'accept', seatId: rec.seatId })
      setChosen(rec)
    } catch (e) {
      setError(e instanceof Error ? e.message : '전송에 실패했어요.')
    } finally {
      setBusy(false)
    }
  }

  async function reject(reasons: string[], comment: string) {
    if (!data) return
    setBusy(true)
    try {
      await sendFeedback({ requestId: data.requestId, action: 'reject', reasons, comment: comment || undefined })
      setSheetOpen(false)
      setExclude((prev) => [...prev, data.first.seatId, data.second.seatId])
    } catch (e) {
      setError(e instanceof Error ? e.message : '전송에 실패했어요.')
    } finally {
      setBusy(false)
    }
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
          <h1 className="m-0 font-serif text-[22px] font-bold text-teal-deep">{chosen.seatName}</h1>
          <p className="m-0 text-sm text-muted">이 자리로 정했어요. 좋은 시간 보내세요!</p>
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

  return (
    <Screen className="gap-3 px-5 pt-4 pb-5">
      <div className="flex items-center gap-1.5">
        <TopBar onBack={onBack} backLabel="추천 시작으로 돌아가기" />
        <div className="flex flex-col">
          <h1 className="m-0 font-serif text-[22px] font-bold text-teal-deep">추천 좌석</h1>
          <span className="text-[12.5px] text-muted">{personaText} 기준</span>
        </div>
      </div>

      {!data && !error && (
        <div role="status" className="flex flex-1 flex-col items-center justify-center gap-4 text-muted">
          <BookShelf scale={0.6} count={8} withShelf={false} />
          <span className="text-sm">맞는 자리를 찾고 있어요…</span>
        </div>
      )}

      {error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <ErrorText>{error}</ErrorText>
          <SecondaryButton className="px-6" onClick={() => setRetry((n) => n + 1)}>
            다시 시도
          </SecondaryButton>
        </div>
      )}

      {data && (
        <>
          <SeatMap room={data.room} firstId={data.first.seatId} secondId={data.second.seatId} />
          <SeatCard rank={1} rec={data.first} disabled={busy} onPick={() => accept(data.first)} />
          <SeatCard rank={2} rec={data.second} disabled={busy} onPick={() => accept(data.second)} />
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="min-h-11 self-center text-sm font-medium text-muted underline underline-offset-2"
          >
            둘 다 별로예요
          </button>
        </>
      )}

      {sheetOpen && <RejectSheet onClose={() => setSheetOpen(false)} onSubmit={reject} submitting={busy} />}
    </Screen>
  )
}

function SeatCard({
  rank,
  rec,
  onPick,
  disabled,
}: {
  rank: 1 | 2
  rec: Recommendation
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
        <h2 className="m-0 font-serif text-xl font-bold text-teal-deep">{rec.seatName}</h2>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {rec.reasons.map((r) => (
          <li key={r} className="flex items-center gap-2 text-[13.5px]">
            <CheckIcon className={`size-4 shrink-0 ${first ? 'text-teal' : 'text-wood'}`} />
            {r}
          </li>
        ))}
      </ul>
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

function SeatMap({ room, firstId, secondId }: { room: RoomMap; firstId: string; secondId: string }) {
  const groups = [room.rows.slice(0, room.aisleAfterRow + 1), room.rows.slice(room.aisleAfterRow + 1)].filter((g) => g.length)
  const cols = room.rows[0]?.length ?? 8

  return (
    <section className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-cream px-3.5 pt-3 pb-3.5">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[13px] font-bold">{room.roomName}</h2>
        <div className="flex gap-2.5 text-[11px] text-muted">
          <Legend className="bg-teal" label="1순위" />
          <Legend className="bg-wood" label="2순위" />
          <Legend className="bg-taken" label="사용 중" />
        </div>
      </div>
      <div
        role="img"
        aria-label={`${room.roomName} 좌석 배치도. 1순위 ${firstId}, 2순위 ${secondId}`}
        className="flex gap-2"
      >
        <div className="flex w-[18px] items-center justify-center rounded border border-[#A9CBCF] bg-[#D6E7E9]">
          <span className="text-[10px] tracking-[0.2em] text-teal-deep [writing-mode:vertical-rl]">창가</span>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          {groups.map((rows, gi) => (
            <div key={gi} className="grid gap-[5px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {rows.flat().map((seat) => {
                if (seat.id === firstId)
                  return (
                    <div key={seat.id} className="flex h-5 items-center justify-center rounded bg-teal text-[11px] font-bold text-white">
                      1
                    </div>
                  )
                if (seat.id === secondId)
                  return (
                    <div key={seat.id} className="flex h-5 items-center justify-center rounded bg-wood text-[11px] font-bold text-white">
                      2
                    </div>
                  )
                return (
                  <div
                    key={seat.id}
                    className={`h-5 rounded ${seat.taken ? 'bg-taken' : 'border border-line-strong bg-white'}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
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