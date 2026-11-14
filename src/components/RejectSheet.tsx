import { useEffect, useState } from 'react'
import { REJECT_REASONS } from '../data/options'
import { PrimaryButton, SecondaryButton, Tag } from './ui'

/** '둘 다 별로예요'를 누르면 아래에서 올라오는 시트 */
export default function RejectSheet({
  onClose,
  onSubmit,
  submitting,
}: {
  onClose: () => void
  onSubmit: (reasons: string[], comment: string) => void
  submitting: boolean
}) {
  const [reasons, setReasons] = useState<string[]>([])
  const [comment, setComment] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggle = (r: string) => setReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]))

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-ink/50" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-title"
        className="absolute bottom-0 flex w-full max-w-[390px] flex-col gap-4 rounded-t-[20px] bg-cream px-5 pt-2.5 pb-7 font-sans text-ink"
      >
        <div aria-hidden="true" className="h-1 w-10 self-center rounded-sm bg-line-strong" />
        <div className="flex flex-col gap-1.5">
          <Tag>FEEDBACK</Tag>
          <h2 id="reject-title" className="m-0 font-serif text-[21px] font-bold text-teal-deep">
            어떤 점이 아쉬웠나요?
          </h2>
          <p className="m-0 text-[13.5px] leading-normal text-muted">
            알려주시면 다음 추천이 더 정확해져요. 여러 개 골라도 돼요.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {REJECT_REASONS.map((r) => {
            const on = reasons.includes(r)
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(r)}
                className={`h-11 rounded-full border-[1.5px] px-4 text-sm font-medium transition-colors ${
                  on ? 'border-teal bg-teal-tint text-teal-deep' : 'border-line-strong bg-white text-ink-2'
                }`}
              >
                {r}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="reject-comment" className="text-[13px] font-medium text-ink-2">
            직접 적기 (선택)
          </label>
          <input
            id="reject-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="예: 친구랑 가까이 앉고 싶어요"
            className="h-12 rounded-[10px] border-[1.5px] border-line-strong bg-white px-3.5 text-[15px] outline-none focus:border-teal"
          />
        </div>

        <div className="mt-1 flex gap-2.5">
          <SecondaryButton className="flex-1" disabled={submitting} onClick={() => onSubmit([], '')}>
            건너뛰기
          </SecondaryButton>
          <PrimaryButton className="flex-[2]" disabled={submitting} onClick={() => onSubmit(reasons, comment.trim())}>
            {submitting ? '보내는 중…' : '다시 추천받기'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}