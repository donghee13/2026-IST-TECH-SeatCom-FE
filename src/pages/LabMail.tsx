import { useState } from 'react'
import type { LabSession } from '../types'
import { CheckIcon } from '../components/icons'
import LabHeader from '../components/LabHeader'
import { buttonClass, Card, Notice, PageHeader, PrimaryButton, Screen } from '../components/ui'

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 클립보드 권한이 없을 때 대비
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  }
}

/** 2단계: 받는 주소와 제목(업로드 코드)을 안내 */
export default function LabMail({
  session,
  onBack,
  onLater,
  onSent,
}: {
  session: LabSession
  onBack: () => void
  onLater: () => void
  onSent: () => void
}) {
  const [copied, setCopied] = useState<'to' | 'subject' | null>(null)

  async function copy(key: 'to' | 'subject', text: string) {
    if (await copyText(text)) {
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000)
    }
  }

  const mailto = `mailto:${session.recipient_email}?subject=${encodeURIComponent(session.mail_subject)}`

  const copyRows = [
    { key: 'to' as const, label: '받는 사람', value: session.recipient_email },
    { key: 'subject' as const, label: '제목 (그대로 써 주세요)', value: session.mail_subject },
  ]

  return (
    <Screen className="px-5 pt-3 pb-6">
      <LabHeader step={2} onBack={onBack} onLater={onLater} />

      <PageHeader
        className="mt-5"
        eyebrow="메일 보내기"
        title="내보낸 파일을 메일로 보내 주세요"
        description="공유 화면에서 Gmail을 고르고 아래처럼 보내면 돼요."
      />

      <Card className="mt-6 px-4">
        <dl className="m-0 divide-y divide-line">
          {copyRows.map((r) => (
            <div key={r.key} className="flex flex-col gap-0.5 py-3">
              <dt className="text-xs text-muted">{r.label}</dt>
              <dd className="m-0 flex items-center gap-3">
                <span className="min-w-0 flex-1 text-[15px] font-bold break-all text-teal-deep">{r.value}</span>
                <button
                  type="button"
                  onClick={() => copy(r.key, r.value)}
                  aria-label={`${r.label} 복사`}
                  className={`flex h-10 w-[72px] shrink-0 items-center justify-center gap-1 rounded-[10px] text-[13px] font-bold transition-colors focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:outline-none ${
                    copied === r.key ? 'bg-teal text-white' : 'border border-line-strong bg-white text-ink-2 hover:border-label'
                  }`}
                >
                  {copied === r.key && <CheckIcon className="size-3.5" />}
                  {copied === r.key ? '복사됨' : '복사'}
                </button>
              </dd>
            </div>
          ))}
          <div className="flex flex-col gap-0.5 py-3">
            <dt className="text-xs text-muted">보내는 사람</dt>
            <dd className="m-0 text-[15px]">가입할 때 등록한 이메일 계정</dd>
          </div>
          <div className="flex flex-col gap-0.5 py-3">
            <dt className="text-xs text-muted">첨부</dt>
            <dd className="m-0 text-[15px]">카톡에서 내보낸 .txt 파일</dd>
          </div>
        </dl>
      </Card>

      <Notice tone="caution" className="mt-4">
        개인 대화가 담긴 파일이에요. 위 주소로만 보내고, 파일이 첨부됐는지 꼭 확인해 주세요.
      </Notice>

      <div className="min-h-6 flex-1" />
      <p aria-live="polite" className="m-0 mb-3 text-center text-xs text-muted">
        {copied ? '복사했어요.' : '메일 앱 열기는 작성 화면만 열어요. 파일은 직접 첨부해 주세요.'}
      </p>
      <div className="flex gap-2">
        <a href={mailto} className={`${buttonClass('secondary')} flex-1 text-[15px]`}>
          메일 앱 열기
        </a>
        <PrimaryButton className="flex-[1.4]" onClick={onSent}>
          메일을 보냈어요
        </PrimaryButton>
      </div>
    </Screen>
  )
}