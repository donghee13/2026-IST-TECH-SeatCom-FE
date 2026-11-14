import { useEffect, useState } from 'react'
import { analyzePersona, getPersonaAnswers, savePersonaAnswer } from '../api'
import type { PersonaQuestion, PersonaResult } from '../types'
import { CheckIcon } from '../components/icons'
import { ErrorScreen, ErrorText, LoadingScreen, PrimaryButton, Screen, Spinner, TopBar } from '../components/ui'

/** 페르소나 질문을 하나씩 보여주고, 고를 때마다 바로 저장(PUT) */
export default function Questions({
  questions,
  onExit,
  onDone,
}: {
  questions: PersonaQuestion[]
  onExit: () => void // 첫 질문에서 뒤로 가기
  onDone: (result: PersonaResult) => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  // 저장된 답 불러와서 첫 번째 안 푼 질문부터 시작
  useEffect(() => {
    let cancelled = false
    getPersonaAnswers()
      .then((r) => {
        if (cancelled) return
        const saved: Record<string, string> = {}
        for (const [k, v] of Object.entries(r.answers ?? {})) if (v) saved[k] = v
        setAnswers(saved)
        const firstEmpty = questions.findIndex((q) => !saved[q.id])
        setIdx(firstEmpty === -1 ? questions.length - 1 : firstEmpty)
      })
      .catch(() => {
        // 불러오기 실패해도 처음부터 답하면 됨
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [questions])

  if (questions.length === 0) {
    return <ErrorScreen message="질문 목록이 비어 있어요. 백엔드 응답을 확인해 주세요." onRetry={onExit} retryLabel="돌아가기" />
  }
  if (loading) return <LoadingScreen />

  const q = questions[idx]
  const picked = answers[q.id]
  const isLast = idx === questions.length - 1

  async function pick(value: string) {
    if (value === answers[q.id]) return
    const before = answers[q.id]
    setAnswers((a) => ({ ...a, [q.id]: value })) // 화면에는 먼저 반영
    setSaving(true)
    setError('')
    try {
      await savePersonaAnswer(q.id, value)
    } catch (e) {
      setAnswers((a) => {
        const next = { ...a }
        if (before) next[q.id] = before
        else delete next[q.id]
        return next
      })
      setError(e instanceof Error ? e.message : '답을 저장하지 못했어요.')
    } finally {
      setSaving(false)
    }
  }

  async function finish() {
    setAnalyzing(true)
    setError('')
    try {
      onDone(await analyzePersona())
    } catch (e) {
      setError(e instanceof Error ? e.message : '결과를 만들지 못했어요.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <Screen className="px-5 pt-3 pb-6">
      <TopBar
        onBack={() => (idx > 0 ? setIdx(idx - 1) : onExit())}
        step={idx + 1}
        total={questions.length}
        backLabel={idx > 0 ? '이전 질문' : '나가기'}
      />

      <header className="mt-6 flex flex-col gap-2">
        <p className="m-0 text-[13px] font-medium text-teal">열람 성향 질문</p>
        <h1 id="question-title" className="m-0 font-serif text-[24px] leading-[1.4] font-bold tracking-[-0.01em] text-balance text-teal-deep">
          {q.question}
        </h1>
      </header>

      <div role="radiogroup" aria-labelledby="question-title" className="mt-8 flex flex-col gap-3">
        {q.options.map((o) => {
          const on = picked === o.value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={analyzing}
              onClick={() => pick(o.value)}
              className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-base transition-[border-color,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:outline-none ${
                on ? 'border-teal bg-teal-tint/50 font-bold text-teal-deep' : 'border-line bg-cream font-medium hover:border-label hover:bg-white'
              }`}
            >
              <span>{o.label}</span>
              <span
                aria-hidden="true"
                className={`flex size-5 shrink-0 items-center justify-center rounded-full transition-colors ${on ? 'bg-teal text-white' : 'border border-label bg-white'}`}
              >
                {on && <CheckIcon className="size-3" strokeWidth={3} />}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 min-h-5">
        {error ? (
          <ErrorText>{error}</ErrorText>
        ) : (
          <p aria-live="polite" className="m-0 flex items-center gap-1.5 text-xs text-muted">
            {saving ? (
              <>
                <Spinner className="size-3" /> 저장하는 중
              </>
            ) : picked ? (
              '선택이 저장됐어요'
            ) : (
              ''
            )}
          </p>
        )}
      </div>

      <div className="min-h-6 flex-1" />
      <PrimaryButton
        disabled={!picked || saving}
        loading={analyzing}
        onClick={() => (isLast ? finish() : setIdx(idx + 1))}
        className="w-full"
      >
        {isLast ? '답변 완료' : '다음'}
      </PrimaryButton>
    </Screen>
  )
}