import { useState, type FormEvent } from 'react'
import { createLabSession } from '../api'
import type { LabSession } from '../types'
import LabHeader from '../components/LabHeader'
import { Card, ErrorText, PageHeader, PrimaryButton, Screen, TextField } from '../components/ui'

const NOTICES = [
  { title: '쓰는 곳', text: '자리 추천에 쓸 성향 분석에만 써요.' },
  { title: '보관', text: '대화 원본은 분석에만 쓰고, 분석 결과만 남아요.' },
  { title: '상대방 대화', text: '대화에는 상대방의 말도 들어 있어요. 민감한 대화방은 피하고, 필요하면 개인정보를 지운 뒤 보내 주세요.' },
  { title: '설문과 별도', text: '카톡 분석 결과는 설문 답변을 바꾸지 않고 따로 보여드려요.' },
]

/** 실험실 시작: 안내 + 카톡 이름 + 동의 → 업로드 세션 만들기 */
export default function LabConsent({
  onBack,
  onCreated,
}: {
  onBack: () => void
  onCreated: (session: LabSession) => void
}) {
  const [name, setName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !agreed) return
    setLoading(true)
    setError('')
    try {
      onCreated(await createLabSession(name.trim()))
    } catch (err) {
      setError(err instanceof Error ? err.message : '시작하지 못했어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen className="px-5 pt-3 pb-6">
      <LabHeader onBack={onBack} onLater={onBack} backLabel="메인으로 돌아가기" />

      <PageHeader className="mt-5" eyebrow="실험실 · 카톡 대화 분석" title="보내기 전에 확인해 주세요" />

      <Card className="mt-6 px-4">
        <dl className="m-0 divide-y divide-line">
          {NOTICES.map((n) => (
            <div key={n.title} className="flex gap-4 py-3.5">
              <dt className="w-[76px] shrink-0 text-[13px] font-bold text-ink-2">{n.title}</dt>
              <dd className="m-0 text-[13px] leading-relaxed text-muted">{n.text}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <form id="lab-form" onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <TextField
          id="lab-name"
          label="카톡 대화방에 보이는 내 이름"
          placeholder="예: 홍길동"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          helper="대화에서 내 말을 찾고 본인 확인을 하는 데 써요. 카톡에 보이는 이름과 똑같이 적어 주세요."
        />
        <label
          htmlFor="lab-consent"
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
            agreed ? 'border-teal bg-teal-tint/40' : 'border-line-strong bg-cream hover:border-label'
          }`}
        >
          <input
            id="lab-consent"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-teal"
          />
          <span className="text-sm leading-normal">위 내용을 확인했고, 카톡 대화 분석에 동의해요.</span>
        </label>
        <ErrorText>{error}</ErrorText>
      </form>

      <div className="min-h-6 flex-1" />
      <PrimaryButton type="submit" form="lab-form" disabled={!name.trim() || !agreed} loading={loading} className="w-full">
        동의하고 시작하기
      </PrimaryButton>
    </Screen>
  )
}