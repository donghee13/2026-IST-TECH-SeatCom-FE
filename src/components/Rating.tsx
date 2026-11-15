import { useState } from 'react'
import { StarIcon } from './icons'

/** 별점 1~5. value가 있으면 보여주기만(읽기 전용) */
export default function Rating({
  value,
  onRate,
  disabled,
  size = 'md',
}: {
  value: number | null
  onRate?: (n: number) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}) {
  const [hover, setHover] = useState(0)
  const shown = hover || value || 0
  const cls = size === 'sm' ? 'size-4' : 'size-8'
  if (!onRate) {
    return (
      <span className="flex items-center gap-0.5 text-brass" aria-label={`${value ?? 0}점`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <StarIcon key={n} filled={n <= (value ?? 0)} className={cls} />
        ))}
      </span>
    )
  }
  return (
    <div role="radiogroup" aria-label="이 자리 평가" className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n}점`}
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onClick={() => onRate(n)}
          className="rounded-md text-brass transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:outline-none disabled:opacity-50"
        >
          <StarIcon filled={n <= shown} className={cls} />
        </button>
      ))}
    </div>
  )
}
