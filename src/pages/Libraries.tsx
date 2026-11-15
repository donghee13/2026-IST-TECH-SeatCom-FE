import { useEffect, useMemo, useState } from 'react'
import { getLibraries, getLibraryRooms } from '../api'
import type { LibrarySummary, RoomSummary, SelectedRoom } from '../types'
import { BuildingIcon, ChevronIcon, LaptopIcon } from '../components/icons'
import { Card, ErrorText, PageHeader, PrimaryButton, Screen, SecondaryButton, Spinner, TopBar } from '../components/ui'

/** 남은 자리 막대 */
function SeatBar({ remaining, total }: { remaining: number; total: number }) {
  const ratio = total ? remaining / total : 0
  const tone = ratio >= 0.35 ? 'bg-teal' : ratio >= 0.15 ? 'bg-brass' : 'bg-danger'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
      <span className="shrink-0 text-xs text-muted tabular-nums">
        남은 자리 <b className="text-ink">{remaining}</b>/{total}
      </span>
    </div>
  )
}

function HoursBadge({ room }: { room: RoomSummary }) {
  const h = room.hours
  if (h.closedToday) return <span className="rounded-full bg-wood-tint px-2 py-0.5 text-[11px] font-medium text-wood">오늘 휴관</span>
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${h.openNow ? 'bg-teal-tint text-teal-deep' : 'bg-line/60 text-muted'}`}>
      {h.openNow ? '운영 중' : '운영 시간 아님'} · {h.today}
    </span>
  )
}

function RoomRow({ room, selected, onPick }: { room: RoomSummary; selected: boolean; onPick: () => void }) {
  return (
    <li className={`flex flex-col gap-2.5 rounded-2xl border bg-cream p-4 ${selected ? 'border-teal' : 'border-line'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[15px] font-bold">
            {room.name}
            {room.floor && <span className="ml-1.5 text-xs font-medium text-muted">{room.floor}</span>}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <HoursBadge room={room} />
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                room.laptopAllowed ? 'bg-teal-tint text-teal-deep' : 'bg-line/60 text-muted'
              }`}
            >
              <LaptopIcon className="size-3" />
              {room.laptopAllowed ? '노트북 가능' : '노트북 불가'}
            </span>
          </div>
        </div>
        {selected && <span className="shrink-0 rounded-full bg-teal px-2.5 py-1 text-xs font-bold text-white">선택됨</span>}
      </div>
      <SeatBar remaining={room.remainingSeats} total={room.totalSeats} />
      <PrimaryButton size="sm" onClick={onPick} className="w-full">
        열람실 보기
      </PrimaryButton>
    </li>
  )
}

/** 도서관·열람실 선택: 위치와 관계없이 11개 도서관에서 고른다 */
export default function Libraries({
  selected,
  onBack,
  onSelect,
}: {
  selected: SelectedRoom | null
  onBack: () => void
  onSelect: (room: SelectedRoom, go: boolean) => void
}) {
  const [libs, setLibs] = useState<LibrarySummary[] | null>(null)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(selected?.libraryId ?? null)
  const [rooms, setRooms] = useState<Record<string, RoomSummary[]>>({})
  const [roomsError, setRoomsError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    setError('')
    getLibraries()
      .then((l) => {
        if (cancelled) return
        setLibs(l)
        setOpenId((cur) => cur ?? l[0]?.libraryId ?? null)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : '도서관 목록을 불러오지 못했어요.'))
    return () => {
      cancelled = true
    }
  }, [reload])

  useEffect(() => {
    if (!openId || rooms[openId]) return
    let cancelled = false
    setRoomsError('')
    getLibraryRooms(openId)
      .then((d) => !cancelled && setRooms((prev) => ({ ...prev, [openId]: d.items })))
      .catch((e) => !cancelled && setRoomsError(e instanceof Error ? e.message : '열람실을 불러오지 못했어요.'))
    return () => {
      cancelled = true
    }
  }, [openId, rooms])

  const grouped = useMemo(() => {
    const g: Record<string, LibrarySummary[]> = {}
    for (const l of libs ?? []) (g[l.region] ??= []).push(l)
    return Object.entries(g)
  }, [libs])

  const openLib = libs?.find((l) => l.libraryId === openId) ?? null
  const pick = (lib: { libraryId: string; name: string }, room: { roomId: string; name: string }, go = true) =>
    onSelect(
      {
        roomId: room.roomId,
        libraryId: lib.libraryId,
        libraryName: lib.name,
        roomName: room.name,
      },
      go,
    )

  const roomList = (lib: LibrarySummary) => {
    const list = rooms[lib.libraryId]
    if (!list) {
      return roomsError ? (
        <ErrorText>{roomsError}</ErrorText>
      ) : (
        <div className="flex items-center gap-2 py-3 text-sm text-muted">
          <Spinner className="size-4 text-teal" />
          열람실을 불러오는 중…
        </div>
      )
    }
    return (
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {list.map((r) => (
          <RoomRow key={r.roomId} room={r} selected={selected?.roomId === r.roomId} onPick={() => pick(lib, r)} />
        ))}
      </ul>
    )
  }

  return (
    <Screen wide className="gap-5 px-5 pt-3 pb-8 lg:gap-6">
      <div className="lg:hidden">
        <TopBar onBack={onBack} backLabel="메인으로 돌아가기" />
      </div>
      <PageHeader
        eyebrow="도서관 선택"
        title="오늘은 어느 열람실에 갈까요?"
        description="도서관과 열람실을 골라 주세요."
      />

      {error && (
        <div className="flex flex-col items-start gap-3">
          <ErrorText>{error}</ErrorText>
          <SecondaryButton size="sm" onClick={() => setReload((k) => k + 1)}>
            다시 시도
          </SecondaryButton>
        </div>
      )}
      {!libs && !error && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Spinner className="size-4 text-teal" />
          도서관 목록을 불러오는 중…
        </div>
      )}

      {libs && (
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-6">
          {/* 도서관 목록 */}
          <section aria-label="도서관 목록" className="flex flex-col gap-5">
            {grouped.map(([region, list]) => (
              <div key={region} className="flex flex-col gap-2">
                <h2 className="m-0 text-[13px] font-bold text-muted">{region}</h2>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {list.map((l) => {
                    const open = openId === l.libraryId
                    return (
                      <li key={l.libraryId} className="flex flex-col gap-2">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => setOpenId(open ? null : l.libraryId)}
                          className={`flex items-center gap-3 rounded-2xl border bg-cream p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:outline-none ${
                            open ? 'border-teal lg:bg-teal-tint/40' : 'border-line hover:border-label'
                          }`}
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-wood-tint text-wood">
                            <BuildingIcon className="size-5" />
                          </span>
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="truncate text-[15px] font-bold">{l.name}</span>
                            <span className="truncate text-xs text-muted">
                              열람실 {l.roomCount}곳 · 남은 자리 {l.remainingSeats}/{l.totalSeats}
                              {l.todayHours ? ` · ${l.todayHours}` : ''}
                            </span>
                          </div>
                          <ChevronIcon className={`size-5 shrink-0 text-muted transition-transform ${open ? 'rotate-90 lg:rotate-0' : ''}`} />
                        </button>
                        {/* 모바일: 펼친 도서관 바로 아래 열람실 */}
                        {open && <div className="pl-2 lg:hidden">{roomList(l)}</div>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </section>

          {/* 데스크톱: 오른쪽 열람실 패널 */}
          <section aria-label="열람실" className="sticky top-6 hidden flex-col gap-3 lg:flex">
            {openLib ? (
              <Card className="flex flex-col gap-4 p-6">
                <div className="flex flex-col gap-1">
                  <h2 className="m-0 font-serif text-[22px] font-bold text-teal-deep">{openLib.name}</h2>
                  {openLib.address && <p className="m-0 text-[13px] text-muted">{openLib.address}</p>}
                </div>
                {roomList(openLib)}
              </Card>
            ) : (
              <Card className="p-6 text-sm text-muted">왼쪽에서 도서관을 골라 주세요.</Card>
            )}
          </section>
        </div>
      )}
    </Screen>
  )
}
