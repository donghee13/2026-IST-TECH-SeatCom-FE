import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { BackIcon, BookIcon, EyeIcon, EyeOffIcon } from './icons'
import { ShellContext } from './shellContext'

/*
 * 디자인 기준
 * - 글자: 화면 제목 22 명조 / 큰 제목 26 명조 / 본문 15 / 보조 13 / 캡션 12
 * - 간격: 4px 단위. 화면 좌우 20, 머리말과 제목 사이 20, 제목과 본문 사이 24
 * - 모서리: 버튼·입력칸 12, 카드 16, 칩 둥글게
 * - 버튼 높이: 큰 버튼 52, 작은 버튼 40, 글자 버튼 최소 44(누르기 영역)
 */

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper'

/**
 * 화면 틀. 모바일은 420px 한 줄(기존 그대로).
 * 데스크톱(lg, 1024px 이상)
 * - 앱 화면(사이드바 안): 본문 폭을 넓힌다. wide면 1200px, 아니면 640px 가운데 정렬
 * - 로그인·가입·첫 설문: 왼쪽 소개 패널 + 오른쪽 입력 화면
 */
export function Screen({ children, className = '', wide = false }: { children: ReactNode; className?: string; wide?: boolean }) {
  const inShell = useContext(ShellContext)
  if (inShell) {
    return (
      <div className="min-h-dvh bg-paper lg:min-h-0 lg:bg-transparent">
        <main
          className={`mx-auto flex min-h-dvh w-full max-w-[420px] flex-col font-sans text-ink lg:min-h-dvh lg:py-6 ${
            wide ? 'lg:max-w-[1200px] lg:px-6' : 'lg:max-w-[640px]'
          } ${className}`}
        >
          {children}
        </main>
        <Footer className="mx-auto max-w-[420px] lg:max-w-none" />
      </div>
    )
  }
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(460px,540px)]">
      <BrandPanel />
      <div className="flex min-w-0 flex-col">
        <main className={`mx-auto flex min-h-dvh w-full max-w-[420px] flex-col font-sans text-ink lg:max-w-[460px] lg:py-6 ${className}`}>
          {children}
        </main>
        <Footer className="mx-auto w-full max-w-[420px] lg:max-w-none" />
      </div>
    </div>
  )
}

/** 데스크톱 로그인·가입 화면 왼쪽 소개 패널 */
function BrandPanel() {
  const points = [
    ['11개 도서관 · 24개 열람실', '용인·성남·서울 공공도서관 열람실 좌석 배치도를 그대로 담았어요.'],
    ['내 취향을 배우는 추천', '설문과 앉았던 자리를 바탕으로, 고를수록 더 잘 맞는 자리를 골라요.'],
    ['지금 빈자리 중에서', '열람실 현황을 보고 비어 있는 자리만 추천해요.'],
  ]
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col justify-between overflow-hidden bg-teal-deep text-white lg:flex">
      <div className="flex flex-col gap-10 px-14 pt-14 xl:px-20">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/10">
            <BookIcon className="size-6" />
          </div>
          <span className="font-serif text-[28px] font-bold tracking-[-0.02em]">SeatCom</span>
        </div>
        <div className="flex max-w-[520px] flex-col gap-4">
          <h2 className="m-0 font-serif text-[40px] leading-[1.3] font-bold tracking-[-0.02em] text-balance">
            오늘 공부할 자리,
            <br />
            고민하지 말고 골라 보세요
          </h2>
          <p className="m-0 text-base leading-relaxed text-teal-tint">STadium 도서관 열람실에서 나에게 맞는 자리를 찾아 드려요.</p>
        </div>
        <ul className="m-0 flex max-w-[520px] list-none flex-col gap-5 p-0">
          {points.map(([t, d]) => (
            <li key={t} className="flex gap-4">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brass" />
              <div className="flex flex-col gap-1">
                <span className="text-[15px] font-bold">{t}</span>
                <span className="text-sm leading-relaxed text-teal-tint/90">{d}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="opacity-90">
        <BookShelf scale={1.1} />
      </div>
    </aside>
  )
}

/** 뒤로 버튼 + 단계 진행 막대 */
export function TopBar({
  onBack,
  step,
  total,
  tone = 'teal',
  backLabel = '뒤로',
}: {
  onBack: () => void
  step?: number
  total?: number
  tone?: 'teal' | 'wood'
  backLabel?: string
}) {
  const done = tone === 'wood' ? 'bg-wood' : 'bg-teal'
  return (
    <div className="-ml-2 flex h-11 items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-ink transition-colors hover:bg-line/50 ${focusRing}`}
      >
        <BackIcon className="size-[22px]" />
      </button>
      {step != null && total != null && (
        <>
          <div aria-hidden="true" className="flex flex-1 gap-1">
            {Array.from({ length: total }, (_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < step ? done : 'bg-line'}`} />
            ))}
          </div>
          <span className="w-9 text-right text-xs font-medium text-muted tabular-nums">
            {step}/{total}
          </span>
        </>
      )}
    </div>
  )
}

/** 화면 머리말: 작은 안내 + 제목 + 설명 */
export function PageHeader({
  eyebrow,
  title,
  description,
  className = '',
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  className?: string
}) {
  return (
    <header className={`flex flex-col gap-2 ${className}`}>
      {eyebrow && <p className="m-0 text-[13px] font-medium text-teal">{eyebrow}</p>}
      <h1 className="m-0 font-serif text-[22px] leading-[1.4] font-bold tracking-[-0.01em] text-balance text-teal-deep">{title}</h1>
      {description && <p className="m-0 text-[15px] leading-relaxed text-muted">{description}</p>}
    </header>
  )
}

/** 카드 */
export function Card({
  children,
  className = '',
  ...rest
}: { children: ReactNode; className?: string } & Record<`data-${string}`, string | boolean>) {
  return (
    <div className={`rounded-2xl border border-line bg-cream ${className}`} {...rest}>
      {children}
    </div>
  )
}

/** 안내 박스. info는 일반 안내, caution은 주의 */
export function Notice({ children, tone = 'info', className = '' }: { children: ReactNode; tone?: 'info' | 'caution'; className?: string }) {
  const color = tone === 'info' ? 'bg-teal-tint/60 text-teal-deep' : 'bg-wood-tint/70 text-ink-2'
  return <div className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed ${color} ${className}`}>{children}</div>
}

export function Spinner({ className = 'size-4' }: { className?: string }) {
  return <span aria-hidden="true" className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} />
}

type Variant = 'primary' | 'secondary'
type Size = 'md' | 'sm'

/** <a>에도 같은 모양을 쓰려고 클래스만 따로 */
export function buttonClass(variant: Variant = 'primary', size: Size = 'md') {
  const base = `inline-flex items-center justify-center gap-2 font-bold no-underline transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.99] disabled:pointer-events-none ${focusRing}`
  const sizes = size === 'md' ? 'h-13 rounded-xl px-5 text-base' : 'h-10 rounded-[10px] px-3.5 text-sm'
  const variants =
    variant === 'primary'
      ? 'bg-teal text-white hover:bg-teal-deep disabled:bg-line disabled:text-muted'
      : 'border border-line-strong bg-cream text-ink hover:border-label hover:bg-white disabled:opacity-50'
  return `${base} ${sizes} ${variants}`
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: Size
  loading?: boolean
}

export function PrimaryButton({ className = '', type = 'button', size = 'md', loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
      className={`${buttonClass('primary', size)} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function SecondaryButton({ className = '', type = 'button', size = 'md', loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
      className={`${buttonClass('secondary', size)} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

/** 글자만 있는 버튼 (보조 동작) */
export function TextButton({
  className = '',
  tone = 'teal',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'teal' | 'muted' }) {
  const color = tone === 'teal' ? 'text-teal-deep' : 'text-muted'
  return (
    <button
      type={type}
      {...props}
      className={`inline-flex min-h-11 items-center rounded-md text-sm font-medium underline-offset-4 hover:underline disabled:opacity-50 ${color} ${focusRing} ${className}`}
    />
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  helper?: ReactNode
  trailing?: ReactNode // 입력칸 오른쪽 버튼
}

export function TextField({ id, label, helper, trailing, className = '', ...props }: FieldProps) {
  const helperId = helper ? `${id}-help` : undefined
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          aria-describedby={helperId}
          {...props}
          className={`h-13 min-w-0 flex-1 rounded-xl border border-line-strong bg-cream px-4 text-[15px] text-ink transition-[border-color,box-shadow] outline-none placeholder:text-muted/60 hover:border-label focus:border-teal focus:ring-3 focus:ring-teal/15 ${className}`}
        />
        {trailing}
      </div>
      {helper && (
        <div id={helperId} className="text-[13px] leading-normal text-muted">
          {helper}
        </div>
      )}
    </div>
  )
}

const MASK = '•'

/**
 * 비밀번호 입력칸.
 * - 칸 안에서 방금 친 한 글자만 잠깐 그대로 보이고(영문·한글·대문자를 바로 확인), 나머지는 점으로 가린다.
 * - 오른쪽 눈 버튼으로 전체 보기/가리기. Caps Lock이 켜져 있으면 아래에 알려 준다.
 * 화면에 보이는 값(점+마지막 글자)과 실제 값을 따로 두고, 입력이 바뀔 때마다 차이만 실제 값에 반영한다.
 */
export function PasswordField({
  id,
  label,
  helper,
  value,
  onValue,
  className = '',
  ...props
}: Omit<FieldProps, 'type' | 'trailing' | 'value' | 'onChange'> & { value: string; onValue: (v: string) => void }) {
  const [shown, setShown] = useState(false)
  const [reveal, setReveal] = useState<[number, number] | null>(null) // 보여 줄 글자 범위
  const sel = useRef<[number, number] | null>(null)
  const [caps, setCaps] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const input = useRef<HTMLInputElement>(null)
  const composing = useRef(false)

  useEffect(() => () => window.clearTimeout(timer.current), [])
  // 값을 바꾼 뒤 커서 위치를 그대로 둔다(가운데를 고쳐도 끝으로 튀지 않게)
  useLayoutEffect(() => {
    const el = input.current
    if (el && sel.current && document.activeElement === el && !composing.current) el.setSelectionRange(sel.current[0], sel.current[1])
    sel.current = null
  })

  const chars = Array.from(value)
  const display = shown ? value : chars.map((c, i) => (reveal && i >= reveal[0] && i <= reveal[1] ? c : MASK)).join('')

  function hideLater() {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      if (composing.current) return hideLater() // 한글 조합 중에는 기다렸다가 가린다
      const el = input.current
      if (el) sel.current = [el.selectionStart ?? 0, el.selectionEnd ?? 0]
      setReveal(null)
    }, 1000)
  }

  function handleChange(next: string, el: HTMLInputElement) {
    sel.current = [el.selectionStart ?? next.length, el.selectionEnd ?? next.length]
    if (shown) return onValue(next)
    const old = Array.from(display)
    const nv = Array.from(next)
    let p = 0
    while (p < old.length && p < nv.length && old[p] === nv[p]) p++
    let s = 0
    while (s < old.length - p && s < nv.length - p && old[old.length - 1 - s] === nv[nv.length - 1 - s]) s++
    const inserted = nv.slice(p, nv.length - s)
    const real = [...chars.slice(0, p), ...inserted, ...chars.slice(chars.length - s)]
    onValue(real.join(''))
    // 한 글자(또는 한글 조합 중인 글자)를 쳤을 때만 그 글자를 보여 준다. 붙여넣기는 가린 채로
    if (inserted.length === 1) {
      // 한글 조합 중에는 앞 글자를 가리면 입력기가 끊기므로 조합이 끝날 때까지 보이는 범위를 넓힌다
      setReveal(composing.current && reveal ? [Math.min(reveal[0], p), p] : [p, p])
      hideLater()
    } else if (inserted.length === 0 && reveal && reveal[0] < real.length) {
      setReveal([reveal[0], Math.min(reveal[1], real.length - 1)])
    } else setReveal(null)
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') setCaps(e.getModifierState('CapsLock'))
  }
  const helperId = `${id}-help`

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
        {label}
      </label>
      <div className="relative">
        <input
          ref={input}
          id={id}
          type="text"
          aria-describedby={helperId}
          value={display}
          onChange={(e) => handleChange(e.target.value, e.target)}
          onCompositionStart={() => (composing.current = true)}
          onCompositionEnd={() => {
            composing.current = false
          }}
          onKeyDown={onKey}
          onKeyUp={onKey}
          onBlur={() => setReveal(null)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          data-lpignore="true"
          {...props}
          className={`h-13 w-full rounded-xl border border-line-strong bg-cream pr-13 pl-4 text-[15px] tracking-[0.06em] text-ink transition-[border-color,box-shadow] outline-none placeholder:tracking-normal placeholder:text-muted/60 hover:border-label focus:border-teal focus:ring-3 focus:ring-teal/15 ${className}`}
        />
        <button
          type="button"
          onClick={() => {
            setShown((v) => !v)
            setReveal(null)
          }}
          aria-label={shown ? '비밀번호 가리기' : '비밀번호 보기'}
          aria-pressed={shown}
          className={`absolute inset-y-0 right-1.5 my-auto flex size-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-line/50 hover:text-ink ${focusRing}`}
        >
          {shown ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </button>
      </div>
      <div id={helperId} className="flex flex-col gap-1 text-[13px] leading-normal">
        {caps && (
          <span role="status" className="font-medium text-wood">
            Caps Lock이 켜져 있어요.
          </span>
        )}
        {helper && <span className="text-muted">{helper}</span>}
      </div>
    </div>
  )
}

/** 화면 맨 아래: 만든 사람들 */
const MAKERS = ['yojun313', 'donghee13', 'minecode0606', 'simjimin06', 'Gunhee-b', 'minhokwak35']
export function Footer({ className = '' }: { className?: string }) {
  return (
    <footer className={`border-t border-line px-5 py-5 font-sans text-xs text-muted ${className}`}>
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <span>SeatCom · STadium 도서관 자리 추천</span>
        <nav aria-label="만든 사람들" className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium text-ink-2">만든 사람들</span>
          {MAKERS.map((m) => (
            <a
              key={m}
              href={`https://github.com/${m}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded underline-offset-2 hover:text-teal-deep hover:underline focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:outline-none"
            >
              @{m}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}

/** 열람실 이름 + 도서관 이름. 도서관 이름도 잘 보이게 키워서 오른쪽에 둔다 */
export function RoomTitle({
  roomName,
  libraryName,
  roomClassName = 'text-[15px] font-bold',
  className = '',
}: {
  roomName: ReactNode
  libraryName: string
  roomClassName?: string
  className?: string
}) {
  return (
    <div className={`flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 ${className}`}>
      <span className={`min-w-0 ${roomClassName}`}>{roomName}</span>
      <span className="min-w-0 text-[15px] font-semibold text-ink-2">{libraryName}</span>
    </div>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="m-0 text-[13px] leading-normal text-danger">
      {children}
    </p>
  )
}

/** 불러오는 중 화면 */
export function LoadingScreen({ label = '불러오는 중…' }: { label?: string }) {
  return (
    <Screen className="items-center justify-center gap-3 px-5">
      <Spinner className="size-6 text-teal" />
      <p role="status" className="m-0 text-sm text-muted">
        {label}
      </p>
    </Screen>
  )
}

/** 오류 화면: 메시지 + 다시 시도 + 보조 동작 */
export function ErrorScreen({
  message,
  onRetry,
  retryLabel = '다시 시도',
  secondaryLabel,
  onSecondary,
}: {
  message: string
  onRetry: () => void
  retryLabel?: string
  secondaryLabel?: string
  onSecondary?: () => void
}) {
  return (
    <Screen className="items-center justify-center gap-4 px-8 text-center">
      <ErrorText>{message}</ErrorText>
      <SecondaryButton size="sm" onClick={onRetry}>
        {retryLabel}
      </SecondaryButton>
      {secondaryLabel && onSecondary && (
        <TextButton tone="muted" onClick={onSecondary}>
          {secondaryLabel}
        </TextButton>
      )}
    </Screen>
  )
}

/** 1순위/2순위 책갈피 리본 */
export function Ribbon({ label, tone }: { label: string; tone: 'teal' | 'wood' }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute -top-px right-4 flex h-10 w-7 justify-center pt-1.5 text-xs font-bold text-white ${tone === 'teal' ? 'bg-teal' : 'bg-wood'}`}
      style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}
    >
      {label}
    </div>
  )
}

type Spine = {
  w: number
  h: number
  c: string
  band?: string
  border?: string
  lean?: boolean
}

const SPINES: Spine[] = [
  { w: 18, h: 96, c: '#2E6A68', band: '#B98B4E' },
  { w: 14, h: 80, c: '#B98B4E' },
  { w: 22, h: 104, c: '#7A5236', band: '#EADBC6' },
  { w: 16, h: 72, c: '#DCE9E5', border: '#9FBFB8' },
  { w: 20, h: 110, c: '#1F4B4A', band: '#FBF8F2' },
  { w: 12, h: 88, c: '#C9B28E' },
  { w: 24, h: 98, c: '#4E8C86', band: '#B98B4E' },
  { w: 15, h: 76, c: '#7A5236' },
  { w: 18, h: 92, c: '#B98B4E', lean: true },
  { w: 16, h: 84, c: '#2E6A68' },
  { w: 20, h: 100, c: '#EADBC6', border: '#CDBFA8', band: '#7A5236' },
  { w: 14, h: 92, c: '#5E3E28' },
  { w: 18, h: 70, c: '#4E8C86' },
  { w: 22, h: 108, c: '#1F4B4A', band: '#B98B4E' },
  { w: 16, h: 86, c: '#C9B28E' },
]

/** 책장 장식 (로그인·메인에서만 사용) */
export function BookShelf({ scale = 1, count = SPINES.length }: { scale?: number; count?: number }) {
  return (
    <div aria-hidden="true">
      <div className="flex items-end gap-[3px] px-5" style={{ height: 112 * scale }}>
        {SPINES.slice(0, count).map((s, i) => (
          <div
            key={i}
            className="rounded-t-[2px]"
            style={{
              width: s.w * scale,
              height: s.h * scale,
              background: s.c,
              border: s.border ? `1px solid ${s.border}` : undefined,
              borderBottom: 'none',
              paddingTop: s.band ? 14 * scale : undefined,
              transform: s.lean ? 'rotate(-10deg)' : undefined,
              transformOrigin: 'bottom left',
              marginLeft: s.lean ? 10 * scale : undefined,
            }}
          >
            {s.band && <div style={{ height: Math.max(3, 5 * scale), background: s.band }} />}
          </div>
        ))}
      </div>
      <div className="h-2 bg-shelf" />
      <div className="h-6 bg-[#E6D8C2]" />
    </div>
  )
}

/** 회원증 카드 (회원가입 1단계) */
export function LibraryCard({ name, sub }: { name: string; sub: string }) {
  const bars = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 1, 2, 2, 1, 3, 1]
  return (
    <div className="flex h-36 flex-col justify-between rounded-2xl bg-teal px-5 py-4 text-white">
      <span className="text-xs text-teal-tint">STadium 도서관 열람 회원증</span>
      <div className="truncate font-serif text-[22px] font-bold">{name}</div>
      <div className="flex items-end justify-between gap-3">
        <div aria-hidden="true" className="flex h-6 items-stretch gap-0.5 rounded-[3px] bg-cream px-1.5 py-1">
          {bars.map((w, i) => (
            <div key={i} className="bg-ink" style={{ width: w }} />
          ))}
        </div>
        <span className="truncate text-xs text-teal-tint">{sub}</span>
      </div>
    </div>
  )
}
