import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { BackIcon } from './icons'

/*
 * 디자인 기준
 * - 글자: 화면 제목 22 명조 / 큰 제목 26 명조 / 본문 15 / 보조 13 / 캡션 12
 * - 간격: 4px 단위. 화면 좌우 20, 머리말과 제목 사이 20, 제목과 본문 사이 24
 * - 모서리: 버튼·입력칸 12, 카드 16, 칩 둥글게
 * - 버튼 높이: 큰 버튼 52, 작은 버튼 40, 글자 버튼 최소 44(누르기 영역)
 */

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper'

/** 모바일 폭 화면 틀 */
export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-dvh bg-paper">
      <main className={`mx-auto flex min-h-dvh w-full max-w-[420px] flex-col font-sans text-ink ${className}`}>{children}</main>
    </div>
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
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-cream ${className}`}>{children}</div>
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

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { size?: Size; loading?: boolean }

export function PrimaryButton({ className = '', type = 'button', size = 'md', loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} {...props} className={`${buttonClass('primary', size)} ${className}`}>
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function SecondaryButton({ className = '', type = 'button', size = 'md', loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} {...props} className={`${buttonClass('secondary', size)} ${className}`}>
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

type Spine = { w: number; h: number; c: string; band?: string; border?: string; lean?: boolean }

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
      <span className="text-xs text-teal-tint">GIST 도서관 열람 회원증</span>
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