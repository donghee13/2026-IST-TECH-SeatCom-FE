import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { BackIcon } from './icons'

/** 모바일 폭(390px) 화면 틀 */
export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-dvh bg-paper">
      <main className={`mx-auto flex min-h-dvh w-full max-w-[390px] flex-col font-sans text-ink ${className}`}>
        {children}
      </main>
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
    <div className="-ml-2.5 flex items-center gap-2.5">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className="flex size-11 items-center justify-center rounded-[10px] text-ink hover:bg-wood-tint/60"
      >
        <BackIcon className="size-[22px]" />
      </button>
      {step != null && total != null && (
        <>
          <div aria-hidden="true" className="flex flex-1 gap-1.5">
            {Array.from({ length: total }, (_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-sm ${i < step ? done : 'bg-line'}`} />
            ))}
          </div>
          <span className="text-[13px] font-medium text-muted">
            {step} / {total}
          </span>
        </>
      )}
    </div>
  )
}

/** 청구기호 느낌의 작은 분류 라벨 */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="self-start rounded border border-label bg-cream px-2 py-[3px] text-[11px] tracking-[0.1em] text-wood">
      {children}
    </span>
  )
}

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="m-0 font-serif text-2xl font-bold text-teal-deep">{children}</h1>
}

export function Sub({ children }: { children: ReactNode }) {
  return <p className="m-0 text-sm leading-normal text-muted">{children}</p>
}

export function PrimaryButton({ className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...props}
      className={`flex h-[54px] items-center justify-center gap-2 rounded-xl bg-teal text-base font-bold text-white transition-colors hover:bg-teal-deep disabled:cursor-not-allowed disabled:bg-label ${className}`}
    />
  )
}

export function SecondaryButton({ className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...props}
      className={`flex h-[54px] items-center justify-center rounded-xl border-[1.5px] border-label text-[15px] font-bold text-ink-2 transition-colors hover:bg-wood-tint/50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
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
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          {...props}
          className={`h-[50px] min-w-0 flex-1 rounded-[10px] border-[1.5px] border-line-strong bg-cream px-3.5 text-[15px] text-ink outline-none placeholder:text-muted/70 focus:border-teal ${className}`}
        />
        {trailing}
      </div>
      {helper && <div className="text-[12.5px] text-muted">{helper}</div>}
    </div>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="m-0 text-[13px] text-danger">
      {children}
    </p>
  )
}

/** 1순위/2순위 책갈피 리본 */
export function Ribbon({ label, tone }: { label: string; tone: 'teal' | 'wood' }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute -top-px right-[18px] box-border flex h-[42px] w-[30px] justify-center pt-1.5 text-[13px] font-bold text-white ${tone === 'teal' ? 'bg-teal' : 'bg-wood'}`}
      style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)' }}
    >
      {label}
    </div>
  )
}

/** 도서관 목록 카드의 구멍 */
export function CardHole() {
  return (
    <div
      aria-hidden="true"
      className="absolute bottom-2.5 left-1/2 size-3 -translate-x-1/2 rounded-full border border-label bg-paper"
    />
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

/** 책장 장식. scale로 크기 조절 */
export function BookShelf({ scale = 1, count = SPINES.length, withShelf = true }: { scale?: number; count?: number; withShelf?: boolean }) {
  return (
    <div aria-hidden="true">
      <div className="flex items-end gap-[3px] px-[22px]" style={{ height: 116 * scale }}>
        {SPINES.slice(0, count).map((s, i) => (
          <div
            key={i}
            className="box-border rounded-t-[2px]"
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
      {withShelf && (
        <>
          <div className="h-2.5 bg-shelf" />
          <div className="h-9 bg-[#E6D8C2]" />
        </>
      )}
    </div>
  )
}

/** 회원증 카드 */
export function LibraryCard({ name, sub }: { name: string; sub: string }) {
  const bars = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 1, 2, 2, 1, 3, 1]
  return (
    <div className="flex h-[150px] flex-col justify-between rounded-[14px] bg-teal px-5 py-[18px] text-white">
      <div className="flex items-center justify-between">
        <span className="text-[11px] tracking-[0.18em] text-teal-tint">GIST LIBRARY</span>
        <span className="rounded border border-[#8DB5AF] px-2 py-[3px] text-xs text-teal-tint">열람 회원증</span>
      </div>
      <div className="truncate font-serif text-[22px] font-bold">{name}</div>
      <div className="flex items-end justify-between gap-3">
        <div aria-hidden="true" className="flex h-[26px] items-stretch gap-0.5 rounded-[3px] bg-cream px-1.5 py-1">
          {bars.map((w, i) => (
            <div key={i} className="bg-ink" style={{ width: w }} />
          ))}
        </div>
        <span className="truncate text-xs text-teal-tint">{sub}</span>
      </div>
    </div>
  )
}

/** 날짜 도장 */
export function DateStamp({ date = new Date() }: { date?: Date }) {
  const text = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  return (
    <div className="-rotate-[8deg] rounded-md border-2 border-wood px-2 py-1 text-xs font-bold tracking-[0.06em] text-wood">
      {text}
    </div>
  )
}