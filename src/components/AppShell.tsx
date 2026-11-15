import type { ReactNode } from 'react'
import type { HistoryItem, SelectedRoom } from '../types'
import { BookIcon, BuildingIcon, ClockIcon, FlaskIcon, HomeIcon, LogoutIcon, SeatIcon, SlidersIcon } from './icons'
import { ShellContext } from './shellContext'

export type NavKey = 'home' | 'libraries' | 'result' | 'preferences' | 'history' | 'lab' | 'account'

const NAV: {
  key: NavKey
  label: string
  Icon: (p: { className?: string }) => ReactNode
}[] = [
  { key: 'home', label: '홈', Icon: HomeIcon },
  { key: 'libraries', label: '도서관·열람실', Icon: BuildingIcon },
  { key: 'result', label: '자리 추천', Icon: SeatIcon },
  { key: 'preferences', label: '내 취향', Icon: SlidersIcon },
  { key: 'history', label: '이용 기록', Icon: ClockIcon },
  { key: 'lab', label: '카톡 분석 실험실', Icon: FlaskIcon },
]

/**
 * 로그인 뒤 화면 틀.
 * - 데스크톱(lg 이상): 왼쪽 고정 사이드바 + 넓은 본문
 * - 모바일: 사이드바 없이 기존 화면 그대로
 */
export default function AppShell({
  active,
  nickname,
  room,
  current,
  onNavigate,
  onLogout,
  children,
}: {
  active: NavKey | null
  nickname: string
  room: SelectedRoom | null
  current: HistoryItem | null
  onNavigate: (key: NavKey) => void
  onLogout: () => void
  children: ReactNode
}) {
  return (
    <ShellContext.Provider value={true}>
      <div className="min-h-dvh bg-paper lg:flex">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-cream font-sans text-ink lg:flex xl:w-72">
          <div className="flex h-20 items-center gap-2.5 px-6">
            <div className="flex size-9 items-center justify-center rounded-xl bg-teal text-white">
              <BookIcon className="size-5" />
            </div>
            <span className="font-serif text-xl font-bold text-teal-deep">SeatCom</span>
          </div>

          <nav aria-label="주 메뉴" className="flex flex-col gap-1 px-3">
            {NAV.map(({ key, label, Icon }) => {
              const on = active === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onNavigate(key)}
                  aria-current={on ? 'page' : undefined}
                  className={`flex h-11 items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:outline-none ${
                    on ? 'bg-teal text-white' : 'text-ink-2 hover:bg-teal-tint/60'
                  }`}
                >
                  <Icon className="size-5 shrink-0" />
                  {label}
                </button>
              )
            })}
          </nav>

          <div className="mx-3 mt-6 flex flex-col gap-3">
            {current && (
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="flex flex-col gap-1 rounded-2xl bg-teal-tint/70 p-4 text-left focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:outline-none"
              >
                <span className="text-xs font-bold text-teal">이용 중</span>
                <span className="font-serif text-[15px] font-bold text-teal-deep">{current.seatName}</span>
                <span className="text-sm font-semibold text-ink-2">{current.libraryName}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('libraries')}
              className="flex flex-col gap-1 rounded-2xl border border-line p-4 text-left transition-colors hover:border-label focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:outline-none"
            >
              <span className="text-xs font-medium text-muted">선택한 열람실</span>
              {room ? (
                <>
                  <span className="text-[15px] font-bold text-ink">{room.roomName}</span>
                  <span className="text-sm font-semibold text-ink-2">{room.libraryName}</span>
                </>
              ) : (
                <span className="text-sm font-bold text-teal-deep">도서관 고르기</span>
              )}
            </button>
          </div>

          <div className="flex-1" />
          <div className="flex items-center justify-between border-t border-line px-6 py-4">
            <button
              type="button"
              onClick={() => onNavigate('account')}
              aria-current={active === 'account' ? 'page' : undefined}
              className={`-mx-2 flex min-w-0 flex-col rounded-xl px-2 py-1 text-left transition-colors hover:bg-teal-tint/60 focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:outline-none ${active === 'account' ? 'bg-teal-tint/60' : ''}`}
            >
              <span className="text-xs text-muted">내 계정</span>
              <span className="truncate text-sm font-bold">{nickname || '회원'}</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              aria-label="로그아웃"
              className="flex size-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-line/50 hover:text-ink focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:outline-none"
            >
              <LogoutIcon className="size-5" />
            </button>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </ShellContext.Provider>
  )
}
